/** Completion conditions for tutorial steps. */
import type { DesignReview } from '../engine/review';
import { itemLabel } from '../engine/items';
import { isCutDevice } from '../engine/topology';
import type { Design, LevelDef, PlacedItem } from '../engine/types';

type Cond = (design: Design, level: LevelDef, review: DesignReview | null) => boolean;

const objectiveMet = (review: DesignReview | null, kind: string) => !!review?.objectives.find((o) => o.objective.kind === kind)?.met;

/** Regulators whose terminal sits on a transformer's low-voltage terminal node (bus regulation). */
function busRegulators(design: Design, review: DesignReview): PlacedItem[] {
  const lvNodes = new Set(design.items.filter((i) => i.kind === 'transformer').map((t) => review.topo.nodeOfPort.get(`${t.id}:lv`)).filter((n): n is string => !!n));
  return design.items.filter((i) => {
    if (i.kind !== 'regulator') return false;
    const d = review.topo.deviceById.get(i.id);
    return !!d && ((!!d.a && lvNodes.has(d.a)) || (!!d.b && lvNodes.has(d.b)));
  });
}

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
  /**
   * Voltage regulation is in place for the station as built so far: an LTC transformer, a regulator
   * connected right at a transformer's low-voltage terminal (bus regulation), or the objective itself
   * (feeder regulation, which needs the feeder bays). Bus regulation counts before the feeders exist.
   */
  regulation_placed: (d, _l, r) => {
    if (objectiveMet(r, 'voltage_regulation')) return true;
    if (d.items.some((i) => i.kind === 'transformer' && i.props.ltc)) return true;
    return !!r && busRegulators(d, r).length > 0;
  },
};

/**
 * What still blocks a step, so the tutorial can say what is missing instead of only
 * "Waiting for you". Steps with their own explanations come first; other steps list the review
 * findings (by checkId prefix) that keep their objective from being met.
 */
const PENDING_CHECKS: Record<string, { prefixes: string[]; critical?: boolean }> = {
  feeders_protected: { prefixes: ['conn.feedermissing', 'conn.dead', 'conn.feederunassigned', 'prot.feeder'] },
  fence_ok: { prefixes: ['fence'], critical: true },
};

type Pending = (design: Design, level: LevelDef, review: DesignReview) => string[];

const names = (items: PlacedItem[]) => items.map(itemLabel).join(', ');

const CUSTOM_PENDING: Record<string, Pending> = {
  regulation_placed: (design, level, review) => {
    const lv = `${level.system.lvKV ?? level.system.hvKV} kV`;
    const regs = design.items.filter((i) => i.kind === 'regulator');
    const xf = design.items.filter((i) => i.kind === 'transformer');
    if (!xf.length) return ['Place the power transformer first: bus regulators connect to its low-voltage terminal.'];
    if (!regs.length) return [`Place Voltage Regulators (${lv}) next to the transformer's low-voltage terminal, or tick "Load tap changer (LTC)" on the transformer.`];
    const loose = regs.filter((r) => {
      const d = review.topo.deviceById.get(r.id);
      return !d?.a && !d?.b;
    });
    if (loose.length === regs.length) return [`Draw a ${lv} bus from the transformer's low-voltage terminal to ${names(regs)}.`];
    return [
      `For bus regulation, connect ${names(regs)} straight to the transformer's low-voltage terminal; the station bus then starts on its far side.`,
      'For feeder regulation, every feeder bay needs its own regulator bank; this step finishes once all feeders are connected.',
    ];
  },
  'objective:bypass_reclosers': (design, _level, review) => {
    const { topo, facts } = review;
    const items = new Map(design.items.map((i) => [i.id, i]));
    const label = (id: string) => (items.has(id) ? itemLabel(items.get(id)!) : id);
    const feeders = topo.loads.filter((l) => l.feeder);
    if (!feeders.length) return ['Build the feeder bays first. Each bay is disconnect switch → recloser → disconnect switch → Feeder Getaway; the bypass goes around it.'];
    const out: string[] = [];
    const base = topo.reach();
    const dead = feeders.filter((l) => !l.node || !base.has(l.node));
    if (dead.length) out.push(`${dead.map((l) => label(l.itemId)).join(', ')}: not connected to the energized station bus yet.`);
    const unprotected = feeders.filter((l) => l.node && base.has(l.node) && !facts.feederProtection.get(l.itemId));
    if (unprotected.length) out.push(`${unprotected.map((l) => label(l.itemId)).join(', ')}: no recloser in the bay yet, so there is nothing to bypass.`);
    // Closed hook stick switches in series with a feeder carry its load: they are part of the bay, not a bypass.
    const live = feeders.filter((l) => l.node && base.has(l.node));
    for (const h of design.items) {
      if (h.kind !== 'hookstick_switch' || h.props.normallyOpen) continue;
      const fed = live.filter((l) => isCutDevice(topo, h.id, l));
      if (fed.length)
        out.push(`${itemLabel(h)} is in series with ${fed.map((l) => label(l.itemId)).join(', ')}. A bypass runs alongside the bay instead: from the station bus to the getaway side of the last disconnect switch, with "Normally open" ticked.`);
      else out.push(`${itemLabel(h)}: tick "Normally open" in the Inspector. A bypass switch stays open until a crew needs it.`);
    }
    const devs = design.items.filter((i) => i.kind === 'recloser' || (i.kind === 'breaker' && feeders.some((l) => facts.feederProtection.get(l.itemId) === i.id)));
    const missing = devs.filter((d) => !facts.bypassed.get(d.id));
    if (missing.length) out.push(`${names(missing)}: no bypass around ${missing.length > 1 ? 'them' : 'it'} yet.`);
    return out;
  },
};

export function stepPending(id: string | undefined, design: Design, level: LevelDef, review: DesignReview | null): string[] {
  if (!id || !review) return [];
  const custom = CUSTOM_PENDING[id];
  if (custom) return [...new Set(custom(design, level, review))];
  if (id.startsWith('objective:')) {
    const prefixes = OBJECTIVE_CHECKS[id.slice(10)] ?? [];
    if (!prefixes.length) return [];
    return [...new Set(review.findings.filter((f) => f.severity !== 'info' && prefixes.some((p) => f.checkId.startsWith(p))).map((f) => f.title))];
  }
  const spec = PENDING_CHECKS[id];
  if (!spec) return [];
  const titles = review.findings
    .filter((f) => spec.prefixes.some((p) => f.checkId.startsWith(p)) && (!spec.critical || f.severity === 'critical'))
    .map((f) => f.title);
  return [...new Set(titles)];
}

/** Findings that keep each objective from being met (mirrors the objective evaluation in review.ts). */
const OBJECTIVE_CHECKS: Partial<Record<string, string[]>> = {
  feeders_served: ['conn.feedermissing', 'conn.dead', 'conn.feederunassigned'],
  feeder_protection: ['prot.feeder'],
  transformer_protection: ['prot.primary'],
  voltage_regulation: ['volt.regulation'],
  transformer_capacity: ['rating.xfmr.now', 'rating.xfmr.horizon'],
  line_protection: ['prot.feeder', 'prot.source', 'relay.line'],
  arresters: ['surge.'],
  clearances: ['clear.', 'fence.clearance'],
  removal_path: ['layout.removal'],
  expansion_area: ['site.expansion'],
  grounding_safe: ['ground.'],
  shielding: ['shield.'],
};

export function stepDone(id: string | undefined, design: Design, level: LevelDef, review: DesignReview | null): boolean {
  if (!id) return false;
  if (id.startsWith('objective:')) return objectiveMet(review, id.slice(10));
  const c = TUTORIAL_CONDITIONS[id];
  return c ? c(design, level, review) : false;
}
