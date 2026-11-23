/**
 * Synthesized equipment and fault sounds, rendered from physics-shaped
 * parameters rather than recordings:
 *
 * - Transformer and regulator hum is magnetostriction: the core lengthens twice
 *   per cycle, so a 60 Hz system hums at 120 Hz with harmonics at 240, 360, 480 Hz.
 *   Loudness grows with rating (roughly as in NEMA TR-1 sound levels); forced-air
 *   cooling adds fan noise.
 * - An AC power arc is loudest at each current peak and nearly goes out at each
 *   current zero, so its roar pulses at 120 Hz. Arc power is arc voltage (set by
 *   the gap, which grows with system voltage) times fault current; bigger arcs are
 *   louder and lower. The first instant is a pressure wave (the bang). The arc lasts
 *   until a protective device clears it: about 2 cycles for an expulsion fuse (with
 *   its own report), 3 for a recloser (which then recloses onto the fault), 6-7 for
 *   a relayed breaker, and the remote backup time when nothing in the station does.
 * - Switchgear makes mechanical sounds only: spring-charging motors, latches,
 *   blades seating into contacts.
 *
 * Every renderer returns a mono Float32Array at the given sample rate and is
 * deterministic for its seed. Levels are set by loudness, not peak: each sound is normalized to its
 * category's maximum momentary loudness (BS.1770), the same scale as the recorded clips
 * (assets/audio/recordings.yml), with small bounded offsets (a bigger transformer or arc is a few
 * LU louder), so no sound makes the player reach for the volume.
 */
import { voltageClassFor } from '../data/bulletin/voltageClasses';
import type { ItemKind, PropValue } from '../engine/types';
import { biquad, decay, envelope, mixInto, noise, rng, softClip, yardEcho } from './dsp';
import { normalizeLoudness } from './loudness.mjs';
import { LOUDNESS, type LoudnessCategory } from './samples';

/** North American system frequency (all campaign sites are US cooperatives). */
export const SYSTEM_HZ = 60;
/** Magnetostriction and arc pulsing are at twice the system frequency. */
export const HUM_HZ = 2 * SYSTEM_HZ;

const secs = (sr: number, s: number) => Math.max(1, Math.round(sr * s));

/** Sum of harmonics of `f0`, with a slow random wobble like a real hum. */
function hum(n: number, sr: number, f0: number, amps: readonly number[], rnd: () => number, wobble = 0.08): Float32Array {
  const x = new Float32Array(n);
  const phases = amps.map(() => rnd() * Math.PI * 2);
  const lfo = amps.map(() => 0.2 + rnd() * 0.5);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let v = 0;
    for (let h = 0; h < amps.length; h++) {
      const a = amps[h]! * (1 + wobble * Math.sin(2 * Math.PI * lfo[h]! * t + phases[h]!));
      v += a * Math.sin(2 * Math.PI * f0 * (h + 1) * t + phases[h]!);
    }
    x[i] = v;
  }
  return x;
}

/**
 * A struck metal part: a few inharmonic partials ringing down, plus a noise
 * transient. `pitch` scales the partials (bigger parts are lower).
 */
function strike(sr: number, rnd: () => number, o: { pitch: number; ring: number; dur?: number; partials?: readonly number[]; thud?: number; bright?: number }): Float32Array {
  const n = secs(sr, o.dur ?? Math.min(1.6, o.ring * 5 + 0.1));
  const x = new Float32Array(n);
  const partials = o.partials ?? [1, 2.32, 4.25, 6.63];
  partials.forEach((r, k) => {
    const f = o.pitch * r;
    if (f > sr * 0.45) return;
    const tau = o.ring / (1 + k * 0.7);
    const ph = rnd() * Math.PI * 2;
    const a = 1 / (1 + k * 0.8);
    for (let i = 0; i < n; i++) x[i]! += a * Math.exp(-i / (tau * sr)) * Math.sin(2 * Math.PI * f * (i / sr) + ph);
  });
  const tr = noise(secs(sr, 0.03), rnd);
  biquad(tr, sr, 'bandpass', o.pitch * 3, 0.8);
  decay(tr, sr, 0.006);
  mixInto(x, tr, 0, o.bright ?? 0.6);
  if (o.thud) {
    const th = new Float32Array(secs(sr, 0.25));
    for (let i = 0; i < th.length; i++) th[i] = Math.sin(2 * Math.PI * 55 * (i / sr)) * Math.exp(-i / (0.05 * sr));
    mixInto(x, th, 0, o.thud);
  }
  return x;
}

/** An electric motor winding up (spring charging, tap changer, motor operator). */
function motor(sr: number, rnd: () => number, dur: number, f0: number, f1: number): Float32Array {
  const n = secs(sr, dur);
  const x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = f0 + (f1 - f0) * Math.sqrt(t);
    ph += (2 * Math.PI * f) / sr;
    // Brushed motor: buzzy harmonics plus commutator noise.
    x[i] = 0.6 * Math.sin(ph) + 0.3 * Math.sin(2 * ph) + 0.2 * Math.sin(3 * ph) + 0.15 * (rnd() * 2 - 1);
  }
  biquad(x, sr, 'lowpass', 2200);
  return envelope(x, sr, 0.04, 0.08);
}

/** Corona: crackle and hiss from air ionizing at a high-voltage conductor, pulsing at 120 Hz. */
function corona(n: number, sr: number, rnd: () => number, kv: number): Float32Array {
  const x = new Float32Array(n);
  const rate = Math.max(0, kv - 60) * 4; // crackles per second; little below about 100 kV
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.abs(Math.sin(2 * Math.PI * SYSTEM_HZ * t));
    if (rnd() < (rate / sr) * env * 2) {
      const a = 0.4 + rnd() * 0.6;
      for (let k = 0; k < 40 && i + k < n; k++) x[i + k]! += a * Math.exp(-k / 6) * (rnd() * 2 - 1);
    }
  }
  const hiss = noise(n, rnd);
  biquad(hiss, sr, 'highpass', 3000);
  for (let i = 0; i < n; i++) x[i]! += hiss[i]! * 0.05 * Math.abs(Math.sin(2 * Math.PI * SYSTEM_HZ * (i / sr)));
  biquad(x, sr, 'highpass', 900);
  return x;
}

/** Relative level (linear) of a sound in dB below full scale. */
const dB = (d: number) => 10 ** (d / 20);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Normalize to a loudness category (offset by `offsetDb` LU) with the shared peak ceiling. */
function level(x: Float32Array, sr: number, category: LoudnessCategory, offsetDb = 0): Float32Array {
  normalizeLoudness(x, sr, LOUDNESS.categories[category] + offsetDb, LOUDNESS.peakCeilingDb);
  return x;
}

export interface EquipmentVoice {
  kind: ItemKind;
  kv: number;
  props?: Record<string, PropValue>;
}

/**
 * Transformer hum level relative to the equipment category: bigger transformers are louder (NEMA TR-1
 * levels rise about 6 dB per decade of kVA), compressed to 2 LU per decade and at most ±2 LU so a
 * small station service unit and a 30 MVA unit stay comfortable at one volume setting.
 */
export function transformerOffsetDb(kva: number): number {
  return clamp(2 * Math.log10(Math.max(50, kva) / 10_000), -2, 2);
}

/** Loudness offset (LU) of a component's placement sound within the equipment category. */
export function equipmentOffsetDb(v: EquipmentVoice): number {
  const kv = v.kv > 0 ? v.kv : 12.47;
  switch (v.kind) {
    case 'transformer':
      return transformerOffsetDb(Number(v.props?.kva ?? 10_000));
    case 'arrester':
    case 'wave_trap':
    case 'metering':
      return -5;
    case 'station_service':
    case 'vt':
    case 'ccvt':
      return -4;
    case 'capacitor_bank':
    case 'control_house':
      return -3;
    case 'mobile_pad':
    case 'mast':
      return -2;
    case 'regulator':
      return -1;
    case 'line_terminal':
    case 'feeder_exit':
      return kv >= 100 ? -1 : -5;
    default:
      return 0;
  }
}

/**
 * When the main mechanical event of a placement sound happens (s): the breaker closing, the
 * recloser's clack, the switch blades seating. Recorded clips are aligned on it.
 */
export function equipmentHitS(kind: ItemKind, kv: number): number | undefined {
  const size = Math.min(1, Math.max(0, Math.log10((kv > 0 ? kv : 12.47) / 12) / Math.log10(20)));
  switch (kind) {
    case 'regulator':
      return 1.02;
    case 'breaker':
    case 'circuit_switcher':
      return 1.15;
    case 'recloser':
      return 0.12;
    case 'switch':
      return 0.75 + 0.3 * size;
    case 'hookstick_switch':
      return 0.1;
    case 'fuse':
      return 0.08;
    default:
      return undefined;
  }
}

function transformerHum(sr: number, rnd: () => number, kva: number, dur: number, fans: boolean): Float32Array {
  const n = secs(sr, dur);
  // Larger cores put relatively more energy in the fundamental.
  const big = Math.min(1, Math.max(0, Math.log10(Math.max(100, kva) / 500) / 2));
  const x = hum(n, sr, HUM_HZ, [1, 0.55 - 0.15 * big, 0.32, 0.2 - 0.06 * big, 0.12, 0.07], rnd);
  if (fans) {
    const f = noise(n, rnd);
    biquad(f, sr, 'lowpass', 900);
    biquad(f, sr, 'highpass', 120);
    // Fan blade pass adds a soft tone.
    const blade = hum(n, sr, 47, [0.4, 0.15], rnd, 0.02);
    mixInto(x, f, 0, 0.35);
    mixInto(x, blade, 0, 0.25);
  }
  return x;
}

/**
 * The sound a piece of equipment makes when it is placed: about two seconds of its
 * normal operating sound (hum for magnetic equipment, the operating mechanism for
 * switchgear). Peak level reflects how loud it is in service.
 */
export function renderEquipment(v: EquipmentVoice, sr: number, seed = 1): Float32Array {
  const rnd = rng(seed);
  const kv = v.kv > 0 ? v.kv : 12.47;
  const p = v.props ?? {};
  // Bigger voltage classes have bigger mechanisms: lower and longer.
  const size = Math.min(1, Math.max(0, Math.log10(kv / 12) / Math.log10(20)));
  const out = new Float32Array(secs(sr, 2));
  const at = (s: number) => s * sr;
  const hit = equipmentHitS(v.kind, kv);
  switch (v.kind) {
    case 'transformer':
    case 'mobile_pad': {
      const kva = Number(p.kva ?? (v.kind === 'mobile_pad' ? 0 : 10_000));
      if (v.kind === 'mobile_pad') {
        mixInto(out, strike(sr, rnd, { pitch: 70, ring: 0.12, thud: 0.8, bright: 0.3 }), 0, 0.5);
        return level(out, sr, 'equipment', equipmentOffsetDb(v));
      }
      const fans = String(p.cooling ?? '').includes('FA');
      const h = envelope(transformerHum(sr, rnd, kva, 2, fans), sr, 0.35, 0.45);
      mixInto(out, h);
      if (p.ltc) mixInto(out, motor(sr, rnd, 0.5, 80, 110), at(0.8), 0.25);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    }
    case 'station_service':
    case 'vt':
    case 'ccvt':
    case 'capacitor_bank': {
      const h = envelope(hum(out.length, sr, HUM_HZ, v.kind === 'capacitor_bank' ? [0.6, 0.5, 0.45, 0.3] : [1, 0.7, 0.45, 0.3, 0.2], rnd), sr, 0.25, 0.4);
      mixInto(out, h);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    }
    case 'regulator': {
      mixInto(out, envelope(hum(out.length, sr, HUM_HZ, [1, 0.6, 0.35, 0.2], rnd), sr, 0.3, 0.4), 0, 0.5);
      // A tap change: motor, then the selector switch clacks over.
      mixInto(out, motor(sr, rnd, 0.45, 70, 95), at(0.55), 0.35);
      mixInto(out, strike(sr, rnd, { pitch: 420, ring: 0.05, thud: 0.4 }), at(hit!), 0.6);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    }
    case 'breaker':
    case 'circuit_switcher': {
      // Spring-charging (or motor operator) motor, then the mechanism closes with a heavy thunk.
      mixInto(out, motor(sr, rnd, 0.9, 95 - 25 * size, 150 - 30 * size), at(0.05), 0.35);
      mixInto(out, strike(sr, rnd, { pitch: 150 - 60 * size, ring: 0.1 + 0.08 * size, thud: 1, partials: [1, 1.9, 3.7, 5.3] }), at(hit!), 1);
      mixInto(out, strike(sr, rnd, { pitch: 900, ring: 0.03, bright: 0.8 }), at(hit! + 0.03), 0.25);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    }
    case 'recloser': {
      // Magnetic actuator: a sharp clack, then the latch.
      mixInto(out, strike(sr, rnd, { pitch: 320, ring: 0.06, thud: 0.6, partials: [1, 2.6, 5.1] }), at(hit!), 1);
      mixInto(out, strike(sr, rnd, { pitch: 1400, ring: 0.02, bright: 1 }), at(hit! + 0.08), 0.3);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    }
    case 'switch': {
      // Gang-operated disconnect: blades swing through the air and seat into the jaws.
      const swing = noise(secs(sr, 0.6 + 0.3 * size), rnd);
      biquad(swing, sr, 'bandpass', 700 - 300 * size, 1.2);
      mixInto(out, envelope(swing, sr, 0.3, 0.2), at(0.05), 0.12);
      mixInto(out, strike(sr, rnd, { pitch: 520 - 260 * size, ring: 0.35 + 0.3 * size, partials: [1, 2.58, 4.75, 7.1], thud: 0.4 }), at(hit!), 1);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    }
    case 'hookstick_switch':
      mixInto(out, strike(sr, rnd, { pitch: 760, ring: 0.22, partials: [1, 2.58, 4.75], bright: 0.8 }), at(hit!), 1);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    case 'fuse':
      // Fuse holder snapped into its clips.
      mixInto(out, strike(sr, rnd, { pitch: 980, ring: 0.08, bright: 1 }), at(hit!), 1);
      mixInto(out, strike(sr, rnd, { pitch: 1250, ring: 0.05, bright: 1 }), at(hit! + 0.08), 0.6);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    case 'arrester':
    case 'wave_trap':
    case 'metering':
      // Silent in service: only the mounting bolts going home.
      mixInto(out, strike(sr, rnd, { pitch: 610, ring: 0.05, bright: 0.7 }), at(0.05), 1);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    case 'control_house': {
      const f = noise(out.length, rnd);
      biquad(f, sr, 'lowpass', 700);
      mixInto(out, envelope(f, sr, 0.3, 0.4), 0, 0.4);
      mixInto(out, envelope(hum(out.length, sr, HUM_HZ, [0.4, 0.3, 0.25, 0.2, 0.15], rnd), sr, 0.3, 0.4), 0, 0.3);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    }
    case 'mast':
      mixInto(out, strike(sr, rnd, { pitch: 190, ring: 0.6, partials: [1, 2.76, 5.4, 8.9], thud: 0.5 }), at(0.05), 1);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    case 'line_terminal':
    case 'feeder_exit': {
      // An energized line: faint conductor hum, and corona at high voltage.
      mixInto(out, envelope(hum(out.length, sr, HUM_HZ, [0.3, 0.2, 0.1], rnd), sr, 0.3, 0.4), 0, 0.3);
      if (kv >= 100) mixInto(out, envelope(corona(out.length, sr, rnd, kv), sr, 0.3, 0.4), 0, 0.8);
      return level(out, sr, 'equipment', equipmentOffsetDb(v));
    }
  }
  return out;
}

export type UiSound = 'bus' | 'fence' | 'erase' | 'blocked' | 'click';

/** Short editor sounds that are not equipment. */
export function renderUi(name: UiSound, sr: number, seed = 1, kv = 12.47): Float32Array {
  const rnd = rng(seed);
  const out = new Float32Array(secs(sr, name === 'fence' ? 0.8 : 0.5));
  switch (name) {
    case 'bus': {
      // Aluminum tube ringing as it is set on its supports; bigger tube for higher voltage.
      const big = Math.min(1, Math.max(0, Math.log10(kv / 12) / Math.log10(20)));
      mixInto(out, strike(sr, rnd, { pitch: 1250 - 500 * big, ring: 0.12, partials: [1, 2.76, 5.4], bright: 0.5 }), 0, 1);
      return level(out, sr, 'ui');
    }
    case 'fence': {
      for (let k = 0; k < 7; k++) mixInto(out, strike(sr, rnd, { pitch: 1700 + rnd() * 900, ring: 0.03, bright: 1 }), (0.03 + k * 0.06 + rnd() * 0.03) * sr, 0.4 + rnd() * 0.4);
      return level(out, sr, 'ui');
    }
    case 'erase': {
      const w = noise(out.length, rnd);
      biquad(w, sr, 'bandpass', 1500, 0.7);
      mixInto(out, envelope(w, sr, 0.05, 0.3), 0, 1);
      return level(out, sr, 'ui', -2);
    }
    case 'blocked': {
      const b = hum(secs(sr, 0.22), sr, 110, [1, 0.5, 0.33], rnd, 0);
      mixInto(out, envelope(b, sr, 0.01, 0.06), 0, 1);
      return level(out, sr, 'ui');
    }
    case 'click':
      mixInto(out, strike(sr, rnd, { pitch: 2200, ring: 0.01, bright: 1 }), 0, 1);
      return level(out, sr, 'ui', -2);
  }
}

/** How a fault in the design is cleared, which decides how long the arc lasts. */
export type Clearing = 'fuse' | 'recloser' | 'breaker' | 'circuit_switcher' | 'remote';

/** Typical total clearing time (s): relay plus interrupting time, or remote backup clearing. */
export function clearingSeconds(c: Clearing, remoteS: number): number {
  switch (c) {
    case 'fuse':
      return 2 / SYSTEM_HZ;
    case 'recloser':
      return 3 / SYSTEM_HZ;
    case 'breaker':
      return 7 / SYSTEM_HZ;
    case 'circuit_switcher':
      return 8 / SYSTEM_HZ;
    case 'remote':
      return Math.max(0.3, remoteS);
  }
}

export interface ArcSpec {
  /** System voltage at the fault (kV, phase to phase). */
  kv: number;
  /** Available fault current (kA). */
  faultKA: number;
  /** What clears it. */
  clearing: Clearing;
  /** Remote backup clearing time (s), used when nothing in the station clears the fault. */
  remoteS: number;
  /** Phase to phase, phase to ground, an insulation failure, or a transformer internal fault (tank rupture). */
  kind: 'phase' | 'ground' | 'insulation' | 'xfmr';
}

/** Arc gap (m): the Table 4-7 metal-to-metal clearance for the voltage class. */
export function arcGapM(kv: number): number {
  try {
    return voltageClassFor(kv).minMetalToMetalM;
  } catch {
    return kv > 100 ? 2 : 0.3;
  }
}

/**
 * Arc power (MW): arc voltage, about 1.2 kV per metre of arc column plus electrode drops,
 * times the fault current. A game-scale estimate, used for loudness and pitch.
 */
export function arcPowerMW(spec: Pick<ArcSpec, 'kv' | 'faultKA' | 'kind'>): number {
  const gap = arcGapM(spec.kv) * (spec.kind === 'ground' ? 1.3 : 1);
  const varc = 0.04 + 1.2 * gap; // kV
  return Math.max(0.05, varc * Math.max(0.5, spec.faultKA));
}

/** Longest arc rendered (s); remote clearing beyond this is cut short to keep the sound bearable. */
const MAX_ARC_S = 1.4;

/**
 * An arc fault in the design. The bang and roar scale with arc power, the roar
 * pulses at 120 Hz, and its length and ending follow the clearing device:
 * an expulsion fuse fires with a report, a recloser trips, recloses onto the fault
 * and trips again, a breaker trips with a heavy thunk, and with nothing in the
 * station the arc burns (and lengthens, dropping in pitch) until the remote end
 * clears it; a transformer internal fault ends with the tank rupturing.
 */
export function renderArc(spec: ArcSpec, sr: number, seed = 1): { pcm: Float32Array; arcSeconds: number[]; timeline: ArcTimeline } {
  const rnd = rng(seed);
  const P = arcPowerMW(spec);
  const loud = Math.min(1, 0.45 + 0.17 * Math.log10(P));
  const centre = 3000 / (1 + 0.45 * Math.log2(1 + P));
  const timeline = arcTimeline(spec);
  const shots = timeline.shots.map((s) => s.dur);
  const out = new Float32Array(secs(sr, timeline.total));
  const arcSeconds: number[] = [];
  const phase0 = rnd();
  shots.forEach((dur, shot) => {
    let t0 = timeline.shots[shot]!.t;
    arcSeconds.push(dur);
    const n = secs(sr, dur);
    // Pressure wave at ignition: an N-wave plus a low thump, bigger for bigger arcs.
    const nw = secs(sr, 0.002 + 0.004 * Math.min(1, P / 20));
    const blast = new Float32Array(secs(sr, 0.4));
    for (let i = 0; i < nw; i++) blast[i] = Math.cos((Math.PI * i) / nw);
    for (let i = 0; i < blast.length; i++) blast[i]! += 0.8 * Math.sin(2 * Math.PI * 48 * (i / sr)) * Math.exp(-i / (0.09 * sr));
    const crack = noise(secs(sr, 0.08), rnd);
    biquad(crack, sr, 'highpass', 1200);
    decay(crack, sr, 0.012);
    mixInto(blast, crack, 0, 0.9);
    mixInto(out, blast, t0 * sr, (shot ? 0.7 : 1) * loud);
    // The arc: broadband roar shaped by 120 Hz current pulsing, plus a 120 Hz tone and crackle.
    const roar = noise(n, rnd);
    const low = new Float32Array(roar);
    biquad(roar, sr, 'bandpass', centre, 0.6);
    biquad(low, sr, 'lowpass', 320);
    const arc = new Float32Array(n);
    const crackleRate = 60 + 1.5 * spec.kv;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      // Long arcs are blown outward by their own magnetic field: louder and lower as they grow.
      const grow = 1 + Math.min(1, t / 0.6) * (dur > 0.3 ? 0.6 : 0);
      const pulse = 0.2 + 0.8 * Math.abs(Math.sin(2 * Math.PI * SYSTEM_HZ * t + phase0 * Math.PI)) ** 1.5;
      let v = pulse * (roar[i]! * 1.6 + low[i]! * 1.2 * grow) + 0.35 * Math.sin(2 * Math.PI * HUM_HZ * t) * grow;
      if (rnd() < crackleRate / sr) v += (rnd() * 2 - 1) * 2;
      arc[i] = v;
    }
    envelope(arc, sr, 0.002, Math.min(0.004, dur / 4));
    mixInto(out, arc, t0 * sr, loud * 0.8);
    t0 += dur;
    // The arc goes out at the current zero when the device interrupts.
    const last = shot === shots.length - 1;
    if (spec.clearing === 'fuse') {
      const pop = noise(secs(sr, 0.15), rnd);
      biquad(pop, sr, 'lowpass', 2500);
      decay(pop, sr, 0.03);
      mixInto(out, pop, t0 * sr, loud * 0.9);
    } else if (spec.clearing === 'recloser') {
      mixInto(out, strike(sr, rnd, { pitch: 320, ring: 0.06, thud: 0.6, partials: [1, 2.6, 5.1] }), t0 * sr, 0.6);
      if (!last) mixInto(out, strike(sr, rnd, { pitch: 320, ring: 0.06, thud: 0.6, partials: [1, 2.6, 5.1] }), timeline.recloses[shot]! * sr, 0.5);
    } else if (spec.clearing === 'breaker' || spec.clearing === 'circuit_switcher') {
      mixInto(out, strike(sr, rnd, { pitch: 120, ring: 0.14, thud: 1, partials: [1, 1.9, 3.7, 5.3] }), t0 * sr, 0.7);
    }
    if (last && spec.kind === 'xfmr') {
      // Oil decomposes into gas faster than the tank can vent it: the tank ruptures.
      const boom = new Float32Array(secs(sr, 0.9));
      for (let i = 0; i < boom.length; i++) boom[i] = Math.sin(2 * Math.PI * (38 - 10 * (i / boom.length)) * (i / sr)) * Math.exp(-i / (0.25 * sr));
      const debris = noise(boom.length, rnd);
      biquad(debris, sr, 'lowpass', 900);
      decay(debris, sr, 0.2);
      mixInto(boom, debris, 0, 0.8);
      mixInto(out, boom, timeline.rupture! * sr, 1);
    }
  });
  return { pcm: level(softClip(yardEcho(out, sr, 0.3), 1.4), sr, 'fault', arcOffsetDb(spec)), arcSeconds, timeline };
}

/** When things happen in an arc fault (s): each arc shot, each trip, each reclose, a tank rupture. */
export interface ArcTimeline {
  shots: Array<{ t: number; dur: number }>;
  /** When the clearing device interrupts (the end of each shot). */
  trips: number[];
  /** When a recloser closes back in (before the next shot). */
  recloses: number[];
  rupture?: number;
  total: number;
}

/** Open interval of a recloser between tripping and reclosing (s), shortened for the game. */
const OPEN_INTERVAL_S = 0.55;

export function arcTimeline(spec: ArcSpec): ArcTimeline {
  const tArc = Math.min(MAX_ARC_S, clearingSeconds(spec.clearing, spec.remoteS));
  const durs = spec.clearing === 'recloser' ? [tArc, tArc * 1.6] : [tArc];
  const tl: ArcTimeline = { shots: [], trips: [], recloses: [], total: 0 };
  let t = 0.05;
  durs.forEach((dur, i) => {
    tl.shots.push({ t, dur });
    t += dur;
    tl.trips.push(t);
    if (i < durs.length - 1) {
      tl.recloses.push(t + OPEN_INTERVAL_S - 0.02);
      t += OPEN_INTERVAL_S;
    }
  });
  if (spec.kind === 'xfmr') tl.rupture = t - 0.05;
  tl.total = t + 1.1;
  return tl;
}

/** Loudness offset (LU) of an arc within the fault category: bigger arcs are louder, within -3..+2 LU. */
export function arcOffsetDb(spec: Pick<ArcSpec, 'kv' | 'faultKA' | 'kind'>): number {
  return clamp(3 * Math.log10(arcPowerMW(spec) / 5), -3, 2);
}

export interface EnergizeSpec {
  /** Highest system voltage (kV). */
  kv: number;
  /** Transformer kVA energized (0 for a switching station). */
  kva: number;
  /** Switching devices that close, in order (at most four are heard). */
  closings: Array<'breaker' | 'recloser' | 'switch' | 'circuit_switcher'>;
  fans: boolean;
}

/** Commissioning: the switches and breakers close one by one and the transformer hums up to full voice. */
export function renderEnergize(spec: EnergizeSpec, sr: number, seed = 1): Float32Array {
  const rnd = rng(seed);
  const tl = energizeTimeline(spec);
  const out = new Float32Array(secs(sr, tl.total));
  tl.closes.forEach(({ t, kind: k }) => {
    if (k === 'recloser') mixInto(out, strike(sr, rnd, { pitch: 320, ring: 0.06, thud: 0.6, partials: [1, 2.6, 5.1] }), t * sr, 0.55);
    else if (k === 'switch') mixInto(out, strike(sr, rnd, { pitch: 420, ring: 0.3, partials: [1, 2.58, 4.75, 7.1], thud: 0.3 }), t * sr, 0.45);
    else mixInto(out, strike(sr, rnd, { pitch: 130, ring: 0.12, thud: 1, partials: [1, 1.9, 3.7, 5.3] }), t * sr, 0.75);
  });
  const t1 = tl.humAt;
  const rest = out.length - Math.round(t1 * sr);
  if (spec.kva > 0 && rest > 0) {
    // Inrush: the hum swells in with a growl of extra harmonics that settles.
    const h = transformerHum(sr, rnd, spec.kva, rest / sr, spec.fans);
    const growl = hum(h.length, sr, HUM_HZ, [0, 0.4, 0, 0.3, 0, 0.2], rnd);
    for (let i = 0; i < growl.length; i++) growl[i]! *= Math.exp(-i / (0.5 * sr));
    mixInto(h, growl, 0, 0.8);
    envelope(h, sr, 0.25, 0.5);
    mixInto(out, h, t1 * sr, 0.6 * dB(transformerOffsetDb(spec.kva)));
  }
  if (spec.kv >= 100 && rest > 0) mixInto(out, envelope(corona(rest, sr, rnd, spec.kv), sr, 0.3, 0.5), t1 * sr, 0.3);
  return level(out, sr, 'energize');
}

/** When each switching device closes and when the hum starts (s). */
export function energizeTimeline(spec: EnergizeSpec): { closes: Array<{ t: number; kind: EnergizeSpec['closings'][number] }>; humAt: number; total: number } {
  const closes = spec.closings.slice(0, 4).map((kind, i) => ({ t: 0.1 + i * 0.32, kind }));
  return { closes, humAt: 0.1 + Math.max(0, closes.length - 1) * 0.32 + 0.1, total: 3.6 };
}
