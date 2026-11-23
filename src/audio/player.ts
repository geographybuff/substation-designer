/**
 * Plays the game's sounds through Web Audio. Sounds are synthesized once per
 * (sound, sample rate) and cached as AudioBuffers. Recorded clips (assets/audio,
 * see samples.ts) are layered over the synthesized sound for the same event,
 * aligned on its main transient. Synthesized sounds and clips are normalized to the
 * same loudness scale, and a layered pair is mixed with weights whose powers sum to
 * one, so adding a recording does not make an event louder. Nothing touches the
 * browser until the first sound plays, so the module is safe to import under Node.
 */
import type { DesignReview } from '../engine/review';
import type { Design, LevelDef, PlacedItem } from '../engine/types';
import { energizeSpec, faultScenario, type FaultScenario } from './faults';
import { SAMPLES, sampleUrl, type SampleSlot } from './samples';
import { arcOffsetDb, arcTimeline, energizeTimeline, equipmentHitS, equipmentOffsetDb, renderArc, renderEnergize, renderEquipment, renderUi, type UiSound } from './sounds';

interface Settings {
  enabled: boolean;
  /** 0..1 */
  volume: number;
}

/** Gains for a layered event: synthesized and recorded parts, powers summing to one. */
export const LAYER = { synth: 0.6, sample: 0.8 } as const;

let settings: Settings = { enabled: true, volume: 0.7 };
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const decoded = new Map<SampleSlot, Promise<AudioBuffer | null>>();
const playing = new Set<AudioBufferSourceNode>();

export function configureAudio(s: Partial<Settings>): void {
  settings = { ...settings, ...s };
  if (master && ctx) master.gain.setTargetAtTime(settings.enabled ? settings.volume : 0, ctx.currentTime, 0.02);
  if (!settings.enabled) stopAll();
}

function context(): AudioContext | null {
  if (!settings.enabled || settings.volume <= 0) return null;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = settings.volume;
    // Safety net only: every sound is already loudness-normalized below the peak ceiling.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -3;
    comp.ratio.value = 12;
    master.connect(comp).connect(ctx.destination);
    // Decode the clips up front so the first layered sound lines up.
    for (const slot of Object.keys(SAMPLES) as SampleSlot[]) sample(slot);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function toBuffer(c: AudioContext, pcm: Float32Array): AudioBuffer {
  const b = c.createBuffer(1, pcm.length, c.sampleRate);
  b.getChannelData(0).set(pcm);
  return b;
}

function cached(key: string, make: (sr: number) => Float32Array): AudioBuffer | null {
  const c = context();
  if (!c) return null;
  const k = `${key}@${c.sampleRate}`;
  let b = buffers.get(k);
  if (!b) {
    b = toBuffer(c, make(c.sampleRate));
    buffers.set(k, b);
  }
  return b;
}

/** Start a buffer at context time `at`, `offset` seconds into it, optionally fading out after `duration`. */
function startAt(b: AudioBuffer, at: number, o: { gain?: number; rate?: number; offset?: number; duration?: number } = {}): void {
  const c = ctx;
  if (!c || !master) return;
  const src = c.createBufferSource();
  src.buffer = b;
  if (o.rate) src.playbackRate.value = o.rate;
  const g = c.createGain();
  const gain = o.gain ?? 1;
  g.gain.value = gain;
  src.connect(g).connect(master);
  const t = Math.max(c.currentTime, at);
  const offset = (o.offset ?? 0) + Math.max(0, c.currentTime - at) * (o.rate ?? 1);
  if (offset >= b.duration) return;
  if (o.duration !== undefined) {
    const end = t + Math.max(0.02, o.duration - (t - at));
    g.gain.setValueAtTime(gain, Math.max(t, end - 0.12));
    g.gain.linearRampToValueAtTime(0, end);
    src.start(t, offset);
    src.stop(end + 0.01);
  } else src.start(t, offset);
  playing.add(src);
  src.onended = () => playing.delete(src);
}

function stopAll(): void {
  for (const s of playing) {
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
  }
  playing.clear();
}

/** Decode a bundled clip once (null when the slot has no file or it cannot be decoded). */
function sample(slot: SampleSlot): Promise<AudioBuffer | null> {
  let p = decoded.get(slot);
  if (!p) {
    const url = sampleUrl(slot);
    const c = ctx;
    p = !url || !c ? Promise.resolve(null) : fetch(url).then((r) => r.arrayBuffer()).then((a) => c.decodeAudioData(a)).catch(() => null);
    decoded.set(slot, p);
  }
  return p;
}

const has = (slot: SampleSlot) => !!SAMPLES[slot] && !!sampleUrl(slot);

/**
 * Layer a clip so its main transient lands `hitAt` seconds from `t0` (context time), at `gainDb`
 * relative to its normalized level, for at most `duration` seconds.
 */
function layer(slot: SampleSlot, t0: number, o: { hitAt?: number; gainDb?: number; duration?: number; rate?: number; fromStart?: boolean } = {}): void {
  const info = SAMPLES[slot];
  if (!ctx || !info) return;
  const rate = o.rate ?? 1;
  // Align the clip's transient (or its start, for steady sounds) on the event.
  const lead = o.fromStart ? 0 : info.hitS / rate;
  const at = t0 + (o.hitAt ?? 0) - lead;
  const offset = at < t0 ? (t0 - at) * rate : 0;
  const gain = LAYER.sample * 10 ** ((o.gainDb ?? 0) / 20);
  void sample(slot).then((b) => {
    if (b && ctx) startAt(b, Math.max(at, t0), { gain, rate, offset, duration: o.duration });
  });
}

const SLOT_OF: Partial<Record<PlacedItem['kind'], SampleSlot>> = {
  transformer: 'transformer-hum',
  regulator: 'transformer-hum',
  station_service: 'transformer-hum',
  breaker: 'breaker',
  circuit_switcher: 'breaker',
  recloser: 'recloser',
  switch: 'switch',
  hookstick_switch: 'switch',
  fuse: 'fuse',
};

const CLOSE_SLOT: Record<'breaker' | 'recloser' | 'switch' | 'circuit_switcher', SampleSlot> = { breaker: 'breaker', circuit_switcher: 'breaker', recloser: 'recloser', switch: 'switch' };

export const sfx = {
  /** About two seconds of a newly placed component's normal operating sound. */
  placed(it: Pick<PlacedItem, 'kind' | 'kv' | 'props'>): void {
    const key = `eq:${it.kind}:${it.kv}:${it.props.kva ?? ''}:${it.props.cooling ?? ''}:${it.props.ltc ? 1 : 0}`;
    const b = cached(key, (sr) => renderEquipment({ kind: it.kind, kv: it.kv, props: it.props }, sr, 7));
    if (!b || !ctx) return;
    const t0 = ctx.currentTime;
    let slot = SLOT_OF[it.kind];
    if ((it.kind === 'line_terminal' || it.kind === 'feeder_exit') && it.kv >= 100) slot = 'corona';
    const layered = !!slot && has(slot);
    startAt(b, t0, { gain: layered ? LAYER.synth : 1 });
    if (!slot || !layered) return;
    const offset = equipmentOffsetDb({ kind: it.kind, kv: it.kv, props: it.props });
    const hit = equipmentHitS(it.kind, it.kv);
    if (slot === 'transformer-hum' || slot === 'corona') layer(slot, t0, { fromStart: true, gainDb: offset, duration: b.duration });
    // A hook stick switch is smaller and lighter than a gang-operated disconnect: play the clank higher.
    else layer(slot, t0, { hitAt: hit ?? 0, gainDb: offset, rate: it.kind === 'hookstick_switch' ? 1.3 : 1 });
  },
  ui(name: UiSound, kv?: number): void {
    const b = cached(`ui:${name}:${kv ?? ''}`, (sr) => renderUi(name, sr, 3, kv));
    if (!b || !ctx) return;
    const slot: SampleSlot | undefined = name === 'fence' ? 'gate' : name === 'click' ? 'relay' : undefined;
    const layered = !!slot && has(slot);
    startAt(b, ctx.currentTime, { gain: layered ? LAYER.synth : 1 });
    if (slot && layered) layer(slot, ctx.currentTime, { hitAt: 0.03 });
  },
  /**
   * Energize: a design without critical findings closes in and hums; otherwise the worst failure
   * arcs at its own voltage, current and clearing time. Returns what happened, for a caption.
   */
  energize(design: Design, level: LevelDef, review: DesignReview): { fault: FaultScenario | null } {
    const fault = review.counts.critical > 0 ? faultScenario(design, level, review) : null;
    if (fault) {
      const a = fault.arc;
      const key = `arc:${a.kind}:${a.kv}:${a.faultKA.toFixed(2)}:${a.clearing}:${a.remoteS}`;
      const b = cached(key, (sr) => renderArc(a, sr, 11).pcm);
      if (!b || !ctx) return { fault };
      const t0 = ctx.currentTime;
      const roar: SampleSlot = a.kind === 'phase' || a.kind === 'ground' ? 'flashover' : 'arc';
      startAt(b, t0, { gain: has(roar) ? LAYER.synth : 1 });
      const tl = arcTimeline(a);
      const off = arcOffsetDb(a);
      // Each shot: the pressure wave, then the arc burning until the device interrupts it.
      tl.shots.forEach((s, i) => {
        layer('blast', t0, { hitAt: s.t, gainDb: off - (i ? 3 : 0) });
        layer(roar, t0 + s.t, { fromStart: true, gainDb: off, duration: s.dur + 0.03 });
      });
      for (const t of tl.trips) {
        if (a.clearing === 'fuse') layer('blast', t0, { hitAt: t, gainDb: off - 2 });
        else if (a.clearing === 'recloser') layer('recloser', t0, { hitAt: t });
        else if (a.clearing === 'breaker' || a.clearing === 'circuit_switcher') layer('breaker', t0, { hitAt: t });
      }
      for (const t of tl.recloses) layer('recloser', t0, { hitAt: t, gainDb: -2 });
      if (tl.rupture !== undefined) layer('blast', t0, { hitAt: tl.rupture, gainDb: off, rate: 0.55 });
      return { fault };
    }
    const spec = energizeSpec(design, level, review);
    if (!spec) {
      sfx.ui('click');
      return { fault: null };
    }
    const b = cached(`energize:${spec.kv}:${spec.kva}:${spec.closings.slice(0, 4).join(',')}:${spec.fans}`, (sr) => renderEnergize(spec, sr, 5));
    if (!b || !ctx) return { fault: null };
    const t0 = ctx.currentTime;
    const tl = energizeTimeline(spec);
    const layered = has('transformer-hum') || tl.closes.some((c) => has(CLOSE_SLOT[c.kind]));
    startAt(b, t0, { gain: layered ? LAYER.synth : 1 });
    for (const c of tl.closes) layer(CLOSE_SLOT[c.kind], t0, { hitAt: c.t });
    if (spec.kva > 0) layer('transformer-hum', t0 + tl.humAt, { fromStart: true, duration: tl.total - tl.humAt });
    if (spec.kv >= 100) layer('corona', t0 + tl.humAt, { fromStart: true, gainDb: -4, duration: tl.total - tl.humAt });
    return { fault: null };
  },
  stop: stopAll,
};
