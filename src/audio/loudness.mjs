/**
 * Loudness measurement and normalization shared by the game (synthesized sounds) and
 * scripts/build-audio.mjs (recorded clips), so both use one scale.
 *
 * Loudness is ITU-R BS.1770 momentary loudness: K-weighted mean square over a 400 ms window,
 * in LUFS. A sound's level is its maximum momentary loudness, which suits short game sounds
 * better than gated integrated loudness. Plain JavaScript so Node scripts can import it.
 */

/** K-weighting filter coefficients (BS.1770 pre-filter and RLB high-pass) for any sample rate. */
export function kWeightingCoefficients(sr) {
  // High shelf (head effects).
  let f0 = 1681.974450955533;
  const G = 3.999843853973347;
  let Q = 0.7071752369554196;
  let K = Math.tan((Math.PI * f0) / sr);
  const Vh = 10 ** (G / 20);
  const Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const shelf = {
    b: [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0],
    a: [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0],
  };
  // High-pass (RLB weighting).
  f0 = 38.13547087602444;
  Q = 0.5003270373238773;
  K = Math.tan((Math.PI * f0) / sr);
  a0 = 1 + K / Q + K * K;
  const hp = { b: [1, -2, 1], a: [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0] };
  return [shelf, hp];
}

function filter(x, { b, a }) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = b[0] * xi + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
    x2 = x1;
    x1 = xi;
    y2 = y1;
    y1 = yi;
    y[i] = yi;
  }
  return y;
}

/** Momentary loudness (LUFS) every `hopS` seconds; a sound shorter than the window counts as padded with silence. */
export function momentaryLoudness(x, sr, hopS = 0.1) {
  const [shelf, hp] = kWeightingCoefficients(sr);
  const y = filter(filter(x, shelf), hp);
  const win = Math.round(0.4 * sr);
  const hop = Math.max(1, Math.round(hopS * sr));
  const cum = new Float64Array(y.length + 1);
  for (let i = 0; i < y.length; i++) cum[i + 1] = cum[i] + y[i] * y[i];
  const out = [];
  const last = Math.max(0, y.length - win);
  for (let s = 0; s <= last; s += hop) {
    const e = Math.min(y.length, s + win);
    out.push(-0.691 + 10 * Math.log10((cum[e] - cum[s]) / win + 1e-20));
  }
  return out;
}

/** A sound's level: its maximum momentary loudness (LUFS). */
export function loudnessMax(x, sr) {
  let m = -Infinity;
  for (const v of momentaryLoudness(x, sr, 0.05)) m = Math.max(m, v);
  return m;
}

/** Sample peak in dBFS. */
export function peakDb(x) {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  return 20 * Math.log10(m + 1e-12);
}

/**
 * Peak limiter, in place: gain drops instantly (with 1.5 ms look-ahead) wherever the signal would
 * exceed `ceiling` (linear) and recovers over `releaseS`.
 */
export function limit(x, sr, ceiling, releaseS = 0.06) {
  const look = Math.max(1, Math.round(0.0015 * sr));
  const need = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    need[i] = a > ceiling ? ceiling / a : 1;
  }
  // Look-ahead: the gain reaches its target before the peak arrives.
  const ahead = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let g = 1;
    for (let k = 0; k <= look && i + k < x.length; k++) g = Math.min(g, need[i + k]);
    ahead[i] = g;
  }
  const rel = 1 - Math.exp(-1 / (releaseS * sr));
  let g = 1;
  for (let i = 0; i < x.length; i++) {
    g = ahead[i] < g ? ahead[i] : g + (1 - g) * rel;
    g = Math.min(g, ahead[i]);
    x[i] *= g;
  }
  return x;
}

/**
 * Scale `x` in place so its maximum momentary loudness is `targetLufs`, then limit peaks to
 * `ceilingDb`. Returns the gain applied and the loudness reached (lower than the target only when
 * limiting had to pull a very peaky sound down).
 */
export function normalizeLoudness(x, sr, targetLufs, ceilingDb = -1.5) {
  const before = loudnessMax(x, sr);
  if (!Number.isFinite(before) || before < -100) return { gainDb: 0, lufs: before };
  const gainDb = targetLufs - before;
  const g = 10 ** (gainDb / 20);
  for (let i = 0; i < x.length; i++) x[i] *= g;
  limit(x, sr, 10 ** (ceilingDb / 20));
  return { gainDb, lufs: loudnessMax(x, sr) };
}
