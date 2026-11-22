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

/**
 * Review findings that still block a step, so the tutorial can say what is missing
 * instead of only "Waiting for you". Prefixes mirror the objectives each condition checks.
 */
const PENDING_CHECKS: Record<string, { prefixes: string[]; critical?: boolean }> = {
  feeders_protected: { prefixes: ['conn.feedermissing', 'conn.dead', 'conn.feederunassigned', 'prot.feeder'] },
  fence_ok: { prefixes: ['fence'], critical: true },
};

export function stepPending(id: string | undefined, review: DesignReview | null): string[] {
  const spec = id ? PENDING_CHECKS[id] : undefined;
  if (!spec || !review) return [];
  const titles = review.findings
    .filter((f) => spec.prefixes.some((p) => f.checkId.startsWith(p)) && (!spec.critical || f.severity === 'critical'))
    .map((f) => f.title);
  return [...new Set(titles)];
}

export function stepDone(id: string | undefined, design: Design, level: LevelDef, review: DesignReview | null): boolean {
  if (!id) return false;
  const c = TUTORIAL_CONDITIONS[id];
  return c ? c(design, level, review) : false;
}
