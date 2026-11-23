/**
 * What a design sounds like when it is energized. A design that passes review
 * closes in and hums. When the player energizes a design with critical
 * findings (the what-if run), the worst physical failure among them becomes an
 * arc fault: where it is decides the voltage and the available fault current,
 * and the protective device that would actually clear a fault there decides how
 * long the arc burns. Pure: exported for tests.
 */
import type { DesignReview } from '../engine/review';
import { isProtective } from '../engine/topology';
import type { Design, Finding, LevelDef } from '../engine/types';
import type { ArcSpec, Clearing, EnergizeSpec } from './sounds';

export interface FaultScenario {
  arc: ArcSpec;
  /** The finding that fails, for the caption. */
  finding: Finding;
  /** Plain-language description of what the player hears. */
  caption: string;
  /** The device that clears it, if one in the station does. */
  clearedBy?: string;
}

/** Findings that become a physical failure when energized, most violent first. */
const FAILURES: Array<{ prefix: string; kind: ArcSpec['kind'] }> = [
  { prefix: 'conn.voltage', kind: 'insulation' },
  { prefix: 'prot.primary', kind: 'xfmr' },
  { prefix: 'rating.interrupt', kind: 'phase' },
  { prefix: 'clear.phase', kind: 'phase' },
  { prefix: 'clear.selfphase', kind: 'phase' },
  { prefix: 'clear.ground', kind: 'ground' },
  { prefix: 'clear.equipment', kind: 'ground' },
  { prefix: 'prot.feeder', kind: 'phase' },
];

const CLEARING_NAME: Record<Clearing, string> = {
  fuse: 'the power fuses blow and clear it in about two cycles',
  recloser: 'the recloser trips in three cycles, recloses onto the fault and trips again',
  breaker: 'the breaker trips in about seven cycles',
  circuit_switcher: 'the circuit switcher trips in about eight cycles',
  remote: 'nothing in the station can clear it, so it burns until the breaker at the far end of the line trips',
};

/** Where a finding is: the energized node shared by most of its items' terminals and its buses. */
function findingNode(review: DesignReview, f: Finding): string | undefined {
  const count = new Map<string, number>();
  const add = (n: string | undefined) => {
    if (n && review.topo.energized.has(n)) count.set(n, (count.get(n) ?? 0) + 1);
  };
  for (const id of f.conductorIds ?? []) add(review.topo.nodeOfConductor.get(id));
  for (const id of f.itemIds ?? []) for (const [k, n] of review.topo.nodeOfPort) if (k.startsWith(`${id}:`)) add(n);
  let best: string | undefined;
  for (const [n, c] of count) if (!best || c > count.get(best)!) best = n;
  return best;
}

/**
 * The protective device that clears a fault on `node`: of the closed protective devices whose opening
 * de-energizes the node, the most selective one (it drops the fewest other nodes). Undefined when no
 * device in the station can (the fault is cleared remotely).
 */
export function clearingDevice(review: DesignReview, node: string, exclude: ReadonlySet<string> = new Set()): string | undefined {
  const base = review.topo.reach();
  let best: { id: string; lost: number } | undefined;
  for (const d of review.topo.devices) {
    if (!d.closed || !isProtective(d.kind) || exclude.has(d.itemId)) continue;
    const r = review.topo.reach({ open: new Set([d.itemId]) });
    if (r.has(node)) continue;
    const lost = base.size - r.size;
    if (!best || lost < best.lost) best = { id: d.itemId, lost };
  }
  return best?.id;
}

/** Voltage actually present on a node: the line voltage if it is reached without passing through a transformer. */
export function nodeVoltage(review: DesignReview, level: LevelDef, node: string): number {
  const xf = review.topo.devices.filter((d) => d.kind === 'transformer' || d.kind === 'mobile_pad').map((d) => d.itemId);
  return review.topo.reach({ open: new Set(xf) }).has(node) ? level.system.hvKV : (level.system.lvKV ?? level.system.hvKV);
}

export function faultScenario(design: Design, level: LevelDef, review: DesignReview): FaultScenario | null {
  const items = new Map(design.items.map((i) => [i.id, i]));
  const conductors = new Map(design.conductors.map((c) => [c.id, c]));
  const crit = review.findings.filter((f) => f.severity === 'critical' || f.checkId.startsWith('prot.'));
  for (const fail of FAILURES) {
    for (const f of crit) {
      if (!f.checkId.startsWith(fail.prefix)) continue;
      const node = findingNode(review, f);
      if (!node) continue;
      const kv = nodeVoltage(review, level, node);
      // Insulation fails only where equipment or bus rated below the voltage it sits on is energized.
      const rated = [...(f.itemIds ?? []).map((id) => items.get(id)?.kv ?? kv), ...(f.conductorIds ?? []).map((id) => conductors.get(id)?.kv ?? kv)];
      if (fail.kind === 'insulation' && !rated.some((r) => r < kv - 0.01)) continue;
      let faultKA = review.calc.faultKA.get(node) ?? (kv === level.system.hvKV ? level.system.hvFaultKA : level.system.hvFaultKA / 2);
      if (fail.kind === 'ground' && Math.abs(kv - level.system.hvKV) < 0.01) faultKA = level.system.hvGroundFaultKA;
      // A device that cannot interrupt the fault fails, and the next one upstream has to clear it.
      const failed = fail.prefix === 'rating.interrupt' ? new Set(f.itemIds ?? []) : new Set<string>();
      // A transformer with no primary protection: nothing in the station clears a fault inside it.
      const dev = fail.kind === 'xfmr' ? undefined : clearingDevice(review, node, failed);
      const devKind = dev ? items.get(dev)?.kind : undefined;
      const clearing: Clearing = devKind === 'fuse' || devKind === 'recloser' || devKind === 'breaker' || devKind === 'circuit_switcher' ? devKind : 'remote';
      const what =
        fail.kind === 'insulation'
          ? `Equipment rated below ${kv} kV flashes over`
          : fail.kind === 'xfmr'
            ? 'A fault inside the unprotected transformer'
            : fail.kind === 'ground'
              ? `A ${kv} kV phase flashes over to grounded metal`
              : `A ${kv} kV flashover between phases`;
      return {
        arc: { kv, faultKA, clearing, remoteS: level.system.faultDurationS, kind: fail.kind },
        finding: f,
        clearedBy: dev,
        caption: `${what} (${f.title}). About ${faultKA.toFixed(1)} kA flows; ${CLEARING_NAME[clearing]}${fail.kind === 'xfmr' ? ', and the tank ruptures' : ''}.`,
      };
    }
  }
  return null;
}

/** What closes in and what hums when the design is energized. */
export function energizeSpec(design: Design, level: LevelDef, review: DesignReview): EnergizeSpec | null {
  const live = (id: string) => [...review.topo.nodeOfPort].some(([k, n]) => k.startsWith(`${id}:`) && review.topo.energized.has(n));
  const closings = design.items
    .filter((i) => (i.kind === 'breaker' || i.kind === 'recloser' || i.kind === 'circuit_switcher' || i.kind === 'switch') && !i.props.normallyOpen && live(i.id))
    .sort((a, b) => b.kv - a.kv || a.x - b.x)
    .map((i) => i.kind as EnergizeSpec['closings'][number]);
  const xf = design.items.filter((i) => i.kind === 'transformer' && live(i.id));
  if (!closings.length && !xf.length) return null;
  return {
    kv: level.system.hvKV,
    kva: xf.reduce((s, t) => s + Number(t.props.kva ?? 0), 0),
    closings,
    fans: xf.some((t) => String(t.props.cooling ?? '').includes('FA')),
  };
}
