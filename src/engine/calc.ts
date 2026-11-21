/**
 * Load and fault calculations used by ratings checks and the simulation.
 * Standard per-unit arithmetic on a 100 MVA base.
 */
import { CATALOG } from './catalog';
import { transformerTopRatingKVA, typicalImpedancePct } from './equipment';
import { isProtective, type TDevice, type TEndpoint, type Topology } from './topology';
import type { Design, LevelDef, PlacedItem } from './types';

const SQRT3 = Math.sqrt(3);
const BASE_MVA = 100;

export interface StationCalc {
  /** Peak load at year 0 and at the planning horizon (MVA). */
  loadNowMVA: number;
  loadHorizonMVA: number;
  /** Three-phase fault level per node (kA). */
  faultKA: Map<string, number>;
  /** Load current through each device at the horizon (A). */
  deviceCurrentA: Map<string, number>;
  /** Load current per node at the horizon (A): max of attached device currents. */
  nodeCurrentA: Map<string, number>;
  /** MVA served by each transformer at year 0 / horizon (share of its LV island). */
  transformerLoadMVA: Map<string, { now: number; horizon: number }>;
  /** Full load current of a load endpoint at horizon (A). */
  loadCurrentA: (l: TEndpoint, kv: number) => number;
}

export function loadAt(level: LevelDef, year: number): number {
  return level.system.loadMVA * Math.pow(1 + level.system.growthPct / 100, year);
}

export function computeStation(design: Design, level: LevelDef, topo: Topology): StationCalc {
  const items = new Map(design.items.map((i) => [i.id, i]));
  const loadNow = loadAt(level, 0);
  const loadH = loadAt(level, level.system.horizonYears);
  const sys = level.system;

  // --- Fault levels ---------------------------------------------------------
  const zSource = BASE_MVA / (SQRT3 * sys.hvKV * sys.hvFaultKA); // pu on 100 MVA
  const faultKA = new Map<string, number>();
  const xfmrs = topo.devices.filter((d) => d.kind === 'transformer' && d.a && d.b);
  const energized = topo.energized;
  // HV nodes: source fault level.
  for (const n of topo.nodes) {
    if (Math.abs(n.kv - sys.hvKV) < 0.01) faultKA.set(n.id, sys.hvFaultKA);
  }
  // LV nodes: source impedance + parallel transformers feeding the island.
  const islands = lvIslands(topo);
  for (const island of islands) {
    const feeding = xfmrs.filter((t) => island.nodes.has(t.b!) && t.a && energized.has(t.a));
    if (!feeding.length) continue;
    let y = 0;
    for (const t of feeding) {
      const it = items.get(t.itemId)!;
      const s = Number(it.props.kva) / 1000;
      const z = (typicalImpedancePct(it) / 100) * (BASE_MVA / s);
      y += 1 / z;
    }
    const zTot = zSource + 1 / y;
    const lvKV = island.kv;
    const iBase = BASE_MVA / (SQRT3 * lvKV); // kA
    for (const nid of island.nodes) faultKA.set(nid, iBase / zTot);
  }

  // --- Load currents ----------------------------------------------------------
  const loadCurrentA = (l: TEndpoint, kv: number) => (l.share * loadH * 1000) / (SQRT3 * kv);
  const deviceCurrentA = new Map<string, number>();
  const base = topo.reach();
  for (const d of topo.devices) {
    const it = items.get(d.itemId)!;
    const kv = deviceKV(it, d, topo);
    if (!(kv > 0)) continue;
    if (!d.closed) {
      // Normally-open devices may carry their circuit when closed for bypass/ties.
      deviceCurrentA.set(d.itemId, maxLoadNear(topo, d, kv, loadH));
      continue;
    }
    const after = topo.reach({ open: new Set([d.itemId]) });
    const cut = topo.loads.filter((l) => l.node && base.has(l.node) && !after.has(l.node));
    let share = cut.reduce((s, l) => s + l.share, 0);
    if (!cut.length) {
      // Meshed (ring/parallel) position: assume it may carry its whole voltage level under contingency.
      share = topo.loads.filter((l) => l.node && base.has(l.node)).reduce((s, l) => s + l.share, 0);
    }
    deviceCurrentA.set(d.itemId, (share * loadH * 1000) / (SQRT3 * kv));
  }
  const nodeCurrentA = new Map<string, number>();
  for (const d of topo.devices) {
    const i = deviceCurrentA.get(d.itemId) ?? 0;
    for (const n of [d.a, d.b]) if (n) nodeCurrentA.set(n, Math.max(nodeCurrentA.get(n) ?? 0, i));
  }

  // --- Transformer loading ------------------------------------------------------
  const transformerLoadMVA = new Map<string, { now: number; horizon: number }>();
  for (const island of islands) {
    const feeding = xfmrs.filter((t) => island.nodes.has(t.b!) && t.a && energized.has(t.a));
    const islandShare = topo.loads.filter((l) => l.node && island.nodes.has(l.node)).reduce((s, l) => s + l.share, 0);
    const totalKVA = feeding.reduce((s, t) => s + Number(items.get(t.itemId)!.props.kva), 0);
    for (const t of feeding) {
      const frac = totalKVA > 0 ? Number(items.get(t.itemId)!.props.kva) / totalKVA : 0;
      transformerLoadMVA.set(t.itemId, { now: islandShare * loadNow * frac, horizon: islandShare * loadH * frac });
    }
  }

  return { loadNowMVA: loadNow, loadHorizonMVA: loadH, faultKA, deviceCurrentA, nodeCurrentA, transformerLoadMVA, loadCurrentA };
}

/** Group LV nodes into islands connected without passing through transformers (normal state). */
export function lvIslands(topo: Topology): Array<{ kv: number; nodes: Set<string> }> {
  const seen = new Set<string>();
  const islands: Array<{ kv: number; nodes: Set<string> }> = [];
  const lvRoots = topo.devices.filter((d) => d.kind === 'transformer' && d.b).map((d) => d.b!);
  for (const root of lvRoots) {
    if (seen.has(root)) continue;
    const nodes = new Set<string>([root]);
    const q = [root];
    seen.add(root);
    while (q.length) {
      const cur = q.shift()!;
      for (const d of topo.devices) {
        if (d.kind === 'transformer' || d.kind === 'mobile_pad' || !d.closed) continue;
        const other = d.a === cur ? d.b : d.b === cur ? d.a : null;
        if (other && !seen.has(other)) {
          seen.add(other);
          nodes.add(other);
          q.push(other);
        }
      }
    }
    islands.push({ kv: topo.nodeById.get(root)?.kv ?? NaN, nodes });
  }
  return islands;
}

export function deviceKV(it: PlacedItem, d: TDevice, topo: Topology): number {
  if (it.kind === 'transformer' || it.kind === 'mobile_pad') return it.kv;
  const n = d.a ? topo.nodeById.get(d.a) : d.b ? topo.nodeById.get(d.b) : undefined;
  return n && n.kv > 0 ? n.kv : it.kv;
}

function maxLoadNear(topo: Topology, d: TDevice, kv: number, loadH: number): number {
  // A bypass/tie switch carries at most the loads that would otherwise be cut by the devices it bypasses.
  const shares = topo.loads.filter((l) => l.node && (l.node === d.a || l.node === d.b)).map((l) => l.share);
  const maxShare = shares.length ? Math.max(...shares) : Math.max(0, ...topo.loads.map((l) => l.share));
  return (maxShare * loadH * 1000) / (SQRT3 * kv);
}

/** Transformer full-load current on the HV side at its top (fan-cooled) rating, A. */
export function transformerHVCurrentA(it: PlacedItem): number {
  return transformerTopRatingKVA(it) / (SQRT3 * it.kv);
}

export const isInterrupting = (it: PlacedItem): boolean => isProtective(it.kind) && CATALOG[it.kind].role === 'series';
