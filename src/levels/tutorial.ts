/** Completion conditions for tutorial steps. */
import type { DesignReview } from '../engine/review';
import type { Design, LevelDef } from '../engine/types';

type Cond = (design: Design, level: LevelDef, review: DesignReview | null) => boolean;

const objectiveMet = (review: DesignReview | null, kind: string) => !!review?.objectives.find((o) => o.objective.kind === kind)?.met;

export const TUTORIAL_CONDITIONS: Record<string, Cond> = {
  has_hv_switch: (d, l) => d.items.some((i) => i.kind === 'switch' && Math.abs(i.kv - l.system.hvKV) < 0.01),
  has_fuse: (d) => d.items.some((i) => i.kind === 'fuse'),
  has_transformer: (d) => d.items.some((i) => i.kind === 'transformer'),
  hv_connected: (d, _l, r) => {
    if (!r) return false;
    const t = d.items.find((i) => i.kind === 'transformer');
    if (!t) return false;
    const node = r.topo.nodeOfPort.get(`${t.id}:hv`);
    return !!node && r.topo.energized.has(node);
  },
  feeders_protected: (_d, _l, r) => objectiveMet(r, 'feeders_served') && objectiveMet(r, 'feeder_protection'),
  fence_ok: (_d, _l, r) => objectiveMet(r, 'fence'),
};

export function stepDone(id: string | undefined, design: Design, level: LevelDef, review: DesignReview | null): boolean {
  if (!id) return false;
  const c = TUTORIAL_CONDITIONS[id];
  return c ? c(design, level, review) : false;
}
