/**
 * Plays the game's sounds through Web Audio. Sounds are synthesized once per
 * (sound, sample rate) and cached as AudioBuffers; recorded samples from
 * assets/audio/ are layered in when present. Nothing touches the browser until
 * the first sound plays, so the module is safe to import under Node.
 */
import type { DesignReview } from '../engine/review';
import type { Design, LevelDef, PlacedItem } from '../engine/types';
import { energizeSpec, faultScenario, type FaultScenario } from './faults';
import { sampleUrl, type SampleSlot } from './samples';
import { renderArc, renderEnergize, renderEquipment, renderUi, type UiSound } from './sounds';

interface Settings {
  enabled: boolean;
  /** 0..1 */
  volume: number;
}

let settings: Settings = { enabled: true, volume: 0.7 };
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const samples = new Map<SampleSlot, Promise<AudioBuffer | null>>();
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
    // Gentle limiter so overlapping sounds never clip.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.ratio.value = 8;
    master.connect(comp).connect(ctx.destination);
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

function start(b: AudioBuffer, o: { gain?: number; rate?: number; when?: number; duration?: number } = {}): void {
  const c = ctx;
  if (!c || !master) return;
  const src = c.createBufferSource();
  src.buffer = b;
  if (o.rate) src.playbackRate.value = o.rate;
  const g = c.createGain();
  g.gain.value = o.gain ?? 1;
  src.connect(g).connect(master);
  const t = c.currentTime + (o.when ?? 0);
  if (o.duration !== undefined) {
    // Fade a layered sample out with the synthesized sound it accompanies.
    g.gain.setValueAtTime(o.gain ?? 1, t + Math.max(0, o.duration - 0.15));
    g.gain.linearRampToValueAtTime(0, t + o.duration);
    src.start(t, 0, o.duration);
  } else src.start(t);
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

/** Decode a bundled sample once (null when the slot has no file or it cannot be decoded). */
function sample(slot: SampleSlot): Promise<AudioBuffer | null> {
  let p = samples.get(slot);
  if (!p) {
    const url = sampleUrl(slot);
    const c = ctx;
    p = !url || !c ? Promise.resolve(null) : fetch(url).then((r) => r.arrayBuffer()).then((a) => c.decodeAudioData(a)).catch(() => null);
    samples.set(slot, p);
  }
  return p;
}

function layer(slot: SampleSlot, duration: number, gain: number, rate = 1, when = 0): void {
  if (!ctx) return;
  const at = ctx.currentTime + when;
  void sample(slot).then((b) => {
    if (b && ctx) start(b, { gain, rate, when: Math.max(0, at - ctx.currentTime), duration: Math.min(duration, b.duration / rate) });
  });
}

const SLOT_OF: Partial<Record<PlacedItem['kind'], SampleSlot>> = {
  transformer: 'transformer-hum',
  breaker: 'breaker',
  circuit_switcher: 'breaker',
  recloser: 'recloser',
  switch: 'switch',
  fuse: 'fuse',
};

export const sfx = {
  /** About two seconds of a newly placed component's normal operating sound. */
  placed(it: Pick<PlacedItem, 'kind' | 'kv' | 'props'>): void {
    const key = `eq:${it.kind}:${it.kv}:${it.props.kva ?? ''}:${it.props.cooling ?? ''}:${it.props.ltc ? 1 : 0}`;
    const b = cached(key, (sr) => renderEquipment({ kind: it.kind, kv: it.kv, props: it.props }, sr, 7));
    if (!b) return;
    start(b);
    const slot = SLOT_OF[it.kind];
    if (slot) layer(slot, b.duration, 0.6);
  },
  ui(name: UiSound, kv?: number): void {
    const b = cached(`ui:${name}:${kv ?? ''}`, (sr) => renderUi(name, sr, 3, kv));
    if (b) start(b);
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
      if (b) {
        start(b);
        // Higher voltage, bigger arc: play a recorded arc slower (lower) for big ones.
        layer(a.kind === 'phase' || a.kind === 'ground' ? 'flashover' : 'arc', Math.min(b.duration, 2), 0.7, Math.max(0.6, Math.min(1.3, 1.25 - a.kv / 400)));
      }
      return { fault };
    }
    const spec = energizeSpec(design, level, review);
    if (!spec) {
      sfx.ui('click');
      return { fault: null };
    }
    const b = cached(`energize:${spec.kv}:${spec.kva}:${spec.closings.slice(0, 4).join(',')}:${spec.fans}`, (sr) => renderEnergize(spec, sr, 5));
    if (b) {
      start(b);
      const t1 = 0.2 + Math.max(0, Math.min(4, spec.closings.length) - 1) * 0.32;
      if (spec.kva > 0) layer('transformer-hum', b.duration - t1, 0.5, 1, t1);
      if (spec.kv >= 100) layer('corona', b.duration - t1, 0.4, 1, t1);
    }
    return { fault: null };
  },
  stop: stopAll,
};
