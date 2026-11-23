/**
 * Small DSP toolkit for the game's synthesized sounds. Everything renders to a
 * mono Float32Array in plain TypeScript (no Web Audio), so sounds are
 * deterministic for a seed and can be unit-tested in Node.
 */

/** Seeded PRNG (mulberry32), uniform in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type FilterType = 'lowpass' | 'highpass' | 'bandpass';

/** RBJ cookbook biquad, applied in place. */
export function biquad(x: Float32Array, sr: number, type: FilterType, freq: number, q = Math.SQRT1_2): Float32Array {
  const f = Math.min(freq, sr * 0.45);
  const w = (2 * Math.PI * f) / sr;
  const cs = Math.cos(w);
  const al = Math.sin(w) / (2 * q);
  let b0: number, b1: number, b2: number;
  if (type === 'lowpass') {
    b0 = (1 - cs) / 2;
    b1 = 1 - cs;
    b2 = (1 - cs) / 2;
  } else if (type === 'highpass') {
    b0 = (1 + cs) / 2;
    b1 = -(1 + cs);
    b2 = (1 + cs) / 2;
  } else {
    b0 = al;
    b1 = 0;
    b2 = -al;
  }
  const a0 = 1 + al;
  const a1 = -2 * cs;
  const a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i]!;
    const y = (b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}

/** White noise in [-1, 1). */
export function noise(n: number, rnd: () => number): Float32Array {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = rnd() * 2 - 1;
  return x;
}

/** Add `src` into `dst` starting at sample `at`, scaled by `gain`. */
export function mixInto(dst: Float32Array, src: Float32Array, at = 0, gain = 1): void {
  const start = Math.max(0, Math.round(at));
  const n = Math.min(src.length, dst.length - start);
  for (let i = 0; i < n; i++) dst[start + i]! += src[i]! * gain;
}

/** Multiply by an attack / sustain / release envelope (seconds). */
export function envelope(x: Float32Array, sr: number, attack: number, release: number): Float32Array {
  const a = Math.max(1, Math.round(attack * sr));
  const r = Math.max(1, Math.round(release * sr));
  for (let i = 0; i < x.length; i++) {
    let g = 1;
    if (i < a) g = i / a;
    const left = x.length - 1 - i;
    if (left < r) g *= left / r;
    x[i]! *= g;
  }
  return x;
}

/** Exponentially decaying burst: e^(-t/tau). */
export function decay(x: Float32Array, sr: number, tau: number): Float32Array {
  const k = Math.exp(-1 / (tau * sr));
  let g = 1;
  for (let i = 0; i < x.length; i++) {
    x[i]! *= g;
    g *= k;
  }
  return x;
}

/** Scale so the peak is `peak` (no-op on silence). */
export function normalize(x: Float32Array, peak = 0.9): Float32Array {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]!));
  if (m > 1e-9) for (let i = 0; i < x.length; i++) x[i]! *= peak / m;
  return x;
}

/** Soft clipper: keeps loud transients from hard-clipping the output. */
export function softClip(x: Float32Array, drive = 1): Float32Array {
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i]! * drive);
  return x;
}

/** A cheap yard echo: a few feedback delays (equipment and structures reflect a bang). */
export function yardEcho(x: Float32Array, sr: number, mix = 0.25): Float32Array {
  const out = new Float32Array(x.length);
  out.set(x);
  for (const [ms, g] of [
    [37, 0.5],
    [61, 0.4],
    [97, 0.3],
    [149, 0.22],
  ] as const) {
    const d = Math.round((ms / 1000) * sr);
    for (let i = d; i < out.length; i++) out[i]! += out[i - d]! * g * mix;
  }
  return out;
}

/** Root-mean-square level. */
export function rms(x: Float32Array, from = 0, to = x.length): number {
  let s = 0;
  const a = Math.max(0, from);
  const b = Math.min(x.length, to);
  for (let i = a; i < b; i++) s += x[i]! * x[i]!;
  return b > a ? Math.sqrt(s / (b - a)) : 0;
}

/** Magnitude of one frequency component (Goertzel), normalised by length. Used by tests. */
export function toneLevel(x: Float32Array, sr: number, freq: number, from = 0, to = x.length): number {
  const w = (2 * Math.PI * freq) / sr;
  const c = 2 * Math.cos(w);
  let s1 = 0, s2 = 0;
  const a = Math.max(0, from);
  const b = Math.min(x.length, to);
  for (let i = a; i < b; i++) {
    const s0 = x[i]! + c * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  const re = s1 - s2 * Math.cos(w);
  const im = s2 * Math.sin(w);
  return (2 * Math.hypot(re, im)) / Math.max(1, b - a);
}
