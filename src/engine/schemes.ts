/**
 * Switching scheme recognition (Bulletin §4.6). Works per voltage level on a
 * reduced graph whose vertices are "bus sections" (nodes merged across closed
 * switches and other non-interrupting series devices) and whose edges are
 * circuit breakers / reclosers.
 */
import type { Citation } from '../data/bulletin/types';
import type { Topology } from './topology';
import type { Design, ItemKind, LevelDef } from './types';

export type SchemeId =
  | 'none'
  | 'single_bus'
  | 'sectionalized_bus'
  | 'main_transfer'
  | 'ring_bus'
  | 'breaker_and_half'
  | 'double_breaker'
  | 'other';

export interface SchemeInfo {
  id: SchemeId;
  name: string;
  /** Table 4-1 approximate relative cost (four-circuit low-profile, breakers in all circuits). */
  relativeCostPct?: number;
  cite: Citation;
}

export const SCHEMES: Record<SchemeId, SchemeInfo> = {
  none: { id: 'none', name: 'No switching (tap)', cite: { page: 121, section: '4.3.1' } },
  single_bus: { id: 'single_bus', name: 'Single bus', relativeCostPct: 100, cite: { page: 129, section: '4.6.1', table: '4-1' } },
  sectionalized_bus: { id: 'sectionalized_bus', name: 'Sectionalized bus', relativeCostPct: 122, cite: { page: 132, section: '4.6.2', table: '4-1' } },
  main_transfer: { id: 'main_transfer', name: 'Main and transfer bus', relativeCostPct: 143, cite: { page: 133, section: '4.6.3', table: '4-1' } },
  ring_bus: { id: 'ring_bus', name: 'Ring bus', relativeCostPct: 114, cite: { page: 136, section: '4.6.4', table: '4-1' } },
  breaker_and_half: { id: 'breaker_and_half', name: 'Breaker-and-a-half', relativeCostPct: 158, cite: { page: 139, section: '4.6.5', table: '4-1' } },
  double_breaker: { id: 'double_breaker', name: 'Double breaker–double bus', relativeCostPct: 214, cite: { page: 139, section: '4.6.6', table: '4-1' } },
  other: { id: 'other', name: 'Custom arrangement', cite: { page: 128, section: '4.6' } },
};

const INTERRUPTERS: ReadonlySet<ItemKind> = new Set(['breaker', 'recloser']);

export function recognizeScheme(design: Design, level: LevelDef, topo: Topology): { hv: SchemeId; lv: SchemeId } {
  const hv = recognizeAt(design, topo, level.system.hvKV);
  const lv = level.system.lvKV !== undefined ? recognizeAt(design, topo, level.system.lvKV) : 'none';
  return { hv, lv };
}

function recognizeAt(design: Design, topo: Topology, kv: number): SchemeId {
  const items = new Map(design.items.map((i) => [i.id, i]));
  const atKV = (n: string | null) => !!n && Math.abs((topo.nodeById.get(n)?.kv ?? NaN) - kv) < 0.01;
  const nodes = topo.nodes.filter((n) => atKV(n.id)).map((n) => n.id);
  if (!nodes.length) return 'none';

  // Union nodes across closed non-interrupting series devices (switches, fuses, regulators, metering, traps).
  const parent = new Map(nodes.map((n) => [n, n]));
  const find = (x: string): string => {
    while (parent.get(x) !== x) x = parent.get(x)!;
    return x;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const breakers = topo.devices.filter((d) => INTERRUPTERS.has(d.kind) && atKV(d.a) && atKV(d.b));
  const noSwitches: Array<{ a: string; b: string }> = [];
  for (const d of topo.devices) {
    if (INTERRUPTERS.has(d.kind) || d.kind === 'transformer' || d.kind === 'mobile_pad') continue;
    if (!atKV(d.a) || !atKV(d.b)) continue;
    if (d.closed) union(d.a!, d.b!);
    else noSwitches.push({ a: d.a!, b: d.b! });
  }
  if (!breakers.length) return 'none';

  // Circuits attached to each section: line terminals, feeder exits, transformer terminals at this kV.
  const circuits = new Map<string, number>();
  const addCircuit = (n: string | null) => {
    if (!n || !atKV(n)) return;
    const r = find(n);
    circuits.set(r, (circuits.get(r) ?? 0) + 1);
  };
  for (const s of topo.sources) addCircuit(s.node);
  for (const l of topo.loads) addCircuit(l.node);
  for (const d of topo.devices) {
    if (d.kind !== 'transformer') continue;
    const it = items.get(d.itemId)!;
    if (Math.abs(it.kv - kv) < 0.01) addCircuit(d.a);
    else addCircuit(d.b);
  }

  // Reduced multigraph.
  const deg = new Map<string, number>();
  const edges: Array<[string, string]> = [];
  for (const b of breakers) {
    const ra = find(b.a!);
    const rb = find(b.b!);
    if (ra === rb) continue;
    edges.push([ra, rb]);
    deg.set(ra, (deg.get(ra) ?? 0) + 1);
    deg.set(rb, (deg.get(rb) ?? 0) + 1);
  }
  const sections = [...new Set(edges.flat())];
  const V = sections.length;
  const E = edges.length;
  const circ = (s: string) => circuits.get(s) ?? 0;

  // Ring bus: every section has degree 2, the graph is one cycle, and each section carries a circuit.
  if (V >= 3 && E === V && sections.every((s) => deg.get(s) === 2 && circ(s) >= 1)) return 'ring_bus';

  const hubs = sections.filter((s) => (deg.get(s) ?? 0) >= 2);
  const adjacent = (x: string, y: string) => edges.some(([a, b]) => (a === x && b === y) || (a === y && b === x));

  // Radial (tree) arrangements: single bus, sectionalized bus, main-and-transfer.
  if (E === V - 1) {
    if (hubs.length <= 1) {
      // A lone bus-tie breaker feeding a circuit-less section reached by normally-open switches = transfer bus.
      const main = hubs[0];
      if (main) {
        const transfer = sections.find((s) => s !== main && circ(s) === 0 && noSwitches.filter((n) => find(n.a) === s || find(n.b) === s).length >= 2);
        if (transfer) return 'main_transfer';
      }
      return 'single_bus';
    }
    if (hubs.length === 2 && adjacent(hubs[0]!, hubs[1]!)) {
      const transfer = hubs.find((h) => circ(h) === 0 && noSwitches.filter((n) => find(n.a) === h || find(n.b) === h).length >= 2);
      return transfer ? 'main_transfer' : 'sectionalized_bus';
    }
    return 'other';
  }

  const bigBuses = sections.filter((s) => (deg.get(s) ?? 0) >= 3 || ((deg.get(s) ?? 0) >= 2 && circ(s) === 0));
  // Double breaker–double bus / breaker-and-a-half: two main buses with paths between them.
  if (bigBuses.length === 2) {
    const [b1, b2] = bigBuses as [string, string];
    const mids = sections.filter((s) => s !== b1 && s !== b2);
    if (mids.length >= 2 && mids.every((m) => deg.get(m) === 2 && circ(m) >= 1 && adjacent(m, b1) && adjacent(m, b2))) return 'double_breaker';
    const ok = mids.length >= 2 && mids.every((m) => deg.get(m) === 2 && circ(m) >= 1);
    if (ok) {
      const inner = edges.filter(([x, y]) => x !== b1 && x !== b2 && y !== b1 && y !== b2).length;
      if (inner >= 1) return 'breaker_and_half';
    }
    if (adjacent(b1, b2)) return 'sectionalized_bus';
  }
  return 'other';
}
