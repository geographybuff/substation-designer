/**
 * Electrical topology: turns placed items and drawn conductors into a graph
 * of electrical nodes and devices, and answers reachability questions used by
 * the protection, maintenance and reliability checks.
 */
import { CATALOG } from './catalog';
import { pointOnSegment, samePoint, segments } from './geometry';
import { footprintOf, itemPorts, type WorldPort } from './items';
import type { Design, FeederSpec, ItemKind, LevelDef, PlacedItem } from './types';

export interface TNode {
  id: string;
  /** Nominal voltage imposed by connected equipment (kV); NaN if unknown. */
  kv: number;
  conductorIds: string[];
  /** "itemId:portId" keys of terminals in this node. */
  ports: string[];
}

export interface TDevice {
  itemId: string;
  kind: ItemKind;
  /** Node of terminal a/hv and b/lv; null if the terminal is unconnected. */
  a: string | null;
  b: string | null;
  /** Normally closed? */
  closed: boolean;
  /** Has integral bypass switches (regulators): the circuit can be kept energized with the device out. */
  bypass?: boolean;
}

export interface TShunt {
  itemId: string;
  kind: ItemKind;
  node: string | null;
}

export interface TEndpoint {
  itemId: string;
  node: string | null;
  /** For feeder exits: the feeder spec they serve (by name). */
  feeder?: FeederSpec;
  /** Share of station load and customer count represented by this endpoint. */
  share: number;
  customers: number;
}

export interface ReachOptions {
  /** Devices treated as removed/open (failed, out for maintenance, or opened). */
  open?: ReadonlySet<string>;
  /** Close every normally-open switching device (emergency/maintenance switching). */
  closeNormallyOpen?: boolean;
  /** Treat mobile pads as occupied by a mobile unit. */
  mobileConnected?: boolean;
  /** Sources to start from (default all sources). */
  sources?: readonly TEndpoint[];
}

export interface Topology {
  nodes: TNode[];
  nodeById: Map<string, TNode>;
  nodeOfPort: Map<string, string>;
  nodeOfConductor: Map<string, string>;
  devices: TDevice[];
  deviceById: Map<string, TDevice>;
  shunts: TShunt[];
  sources: TEndpoint[];
  loads: TEndpoint[];
  unconnectedPorts: WorldPort[];
  voltageConflicts: Array<{ nodeId: string; kvs: number[]; itemIds: string[]; conductorIds: string[] }>;
  /** Devices whose two terminals sit on the same node (permanently bypassed). */
  shortedDevices: string[];
  /** Nodes energized in the normal switching configuration. */
  energized: Set<string>;
  reach(opts?: ReachOptions): Set<string>;
  isLoadServed(load: TEndpoint, reached: Set<string>): boolean;
}

class DSU {
  private parent = new Map<string, string>();
  find(x: string): string {
    let p = this.parent.get(x);
    if (p === undefined) {
      this.parent.set(x, x);
      return x;
    }
    while (p !== x) {
      const gp = this.parent.get(p)!;
      this.parent.set(x, gp);
      x = p;
      p = this.parent.get(x)!;
    }
    return x;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
  }
}

const PROTECTIVE: ReadonlySet<ItemKind> = new Set(['breaker', 'recloser', 'fuse', 'circuit_switcher']);
const SWITCHES: ReadonlySet<ItemKind> = new Set(['switch', 'hookstick_switch']);

export const isProtective = (k: ItemKind): boolean => PROTECTIVE.has(k);
export const isSwitch = (k: ItemKind): boolean => SWITCHES.has(k);

function deviceNormallyClosed(it: PlacedItem): boolean {
  if (it.kind === 'mobile_pad') return false;
  if (it.kind === 'switch' || it.kind === 'hookstick_switch' || it.kind === 'breaker') return !it.props.normallyOpen;
  return true;
}

/** Port voltage imposed by an item terminal. */
function portKV(it: PlacedItem, portId: string): number {
  if ((it.kind === 'transformer' || it.kind === 'mobile_pad') && portId === 'lv') return Number(it.props.lvKV);
  return it.kv;
}

export function analyzeTopology(design: Design, level: LevelDef): Topology {
  const dsu = new DSU();
  const allPorts: WorldPort[] = [];
  for (const it of design.items) {
    const fp = footprintOf(it);
    for (const p of itemPorts(it, fp)) allPorts.push(p);
  }
  const portKey = (p: WorldPort) => `${p.itemId}:${p.portId}`;
  const condKey = (id: string) => `c:${id}`;

  // Conductor <-> conductor joins: a vertex of one lying on a segment of the other.
  const conds = design.conductors.filter((c) => c.points.length >= 2);
  for (const c of conds) dsu.find(condKey(c.id));
  for (let i = 0; i < conds.length; i++) {
    for (let j = i + 1; j < conds.length; j++) {
      const A = conds[i]!;
      const B = conds[j]!;
      let joined = false;
      outer: for (const v of A.points) {
        for (const [p, q] of segments(B.points)) {
          if (pointOnSegment(v, p, q)) {
            joined = true;
            break outer;
          }
        }
      }
      if (!joined) {
        outer2: for (const v of B.points) {
          for (const [p, q] of segments(A.points)) {
            if (pointOnSegment(v, p, q)) {
              joined = true;
              break outer2;
            }
          }
        }
      }
      if (joined) dsu.union(condKey(A.id), condKey(B.id));
    }
  }
  // Port <-> conductor joins.
  const portTouches = new Map<string, number>();
  for (const p of allPorts) {
    const k = portKey(p);
    dsu.find(k);
    for (const c of conds) {
      for (const [a, b] of segments(c.points)) {
        if (pointOnSegment(p.pos, a, b)) {
          dsu.union(k, condKey(c.id));
          portTouches.set(k, (portTouches.get(k) ?? 0) + 1);
          break;
        }
      }
    }
  }
  // Port <-> port joins (devices bolted terminal to terminal).
  for (let i = 0; i < allPorts.length; i++) {
    for (let j = i + 1; j < allPorts.length; j++) {
      const a = allPorts[i]!;
      const b = allPorts[j]!;
      if (a.itemId !== b.itemId && samePoint(a.pos, b.pos)) {
        dsu.union(portKey(a), portKey(b));
        portTouches.set(portKey(a), (portTouches.get(portKey(a)) ?? 0) + 1);
        portTouches.set(portKey(b), (portTouches.get(portKey(b)) ?? 0) + 1);
      }
    }
  }

  // Group into nodes.
  const groups = new Map<string, { conductorIds: string[]; ports: string[] }>();
  const ensure = (root: string) => {
    let g = groups.get(root);
    if (!g) {
      g = { conductorIds: [], ports: [] };
      groups.set(root, g);
    }
    return g;
  };
  for (const c of conds) ensure(dsu.find(condKey(c.id))).conductorIds.push(c.id);
  const unconnectedPorts: WorldPort[] = [];
  for (const p of allPorts) {
    const k = portKey(p);
    if (!portTouches.get(k)) {
      unconnectedPorts.push(p);
      continue;
    }
    ensure(dsu.find(k)).ports.push(k);
  }
  // Stable ordering: by smallest member key.
  const ordered = [...groups.values()]
    .map((g) => ({ ...g, key: [...g.conductorIds.map((c) => `c:${c}`), ...g.ports].sort()[0] ?? '' }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const itemById = new Map(design.items.map((i) => [i.id, i]));
  const condById = new Map(conds.map((c) => [c.id, c]));
  const nodes: TNode[] = [];
  const nodeOfPort = new Map<string, string>();
  const nodeOfConductor = new Map<string, string>();
  const voltageConflicts: Topology['voltageConflicts'] = [];
  ordered.forEach((g, idx) => {
    const id = `N${idx + 1}`;
    const kvSet = new Map<number, { items: Set<string>; conds: Set<string> }>();
    const note = (kv: number, item?: string, cond?: string) => {
      if (!(kv > 0)) return;
      const k = Math.round(kv * 100) / 100;
      let e = kvSet.get(k);
      if (!e) {
        e = { items: new Set(), conds: new Set() };
        kvSet.set(k, e);
      }
      if (item) e.items.add(item);
      if (cond) e.conds.add(cond);
    };
    for (const pk of g.ports) {
      nodeOfPort.set(pk, id);
      const [itemId, portId] = pk.split(':') as [string, string];
      const it = itemById.get(itemId);
      if (it) note(portKV(it, portId), itemId);
    }
    for (const cid of g.conductorIds) {
      nodeOfConductor.set(cid, id);
      const c = condById.get(cid);
      if (c) note(c.kv, undefined, cid);
    }
    const kvs = [...kvSet.keys()].sort((a, b) => b - a);
    if (kvs.length > 1) {
      const items = new Set<string>();
      const cs = new Set<string>();
      for (const e of kvSet.values()) {
        e.items.forEach((i) => items.add(i));
        e.conds.forEach((c) => cs.add(c));
      }
      voltageConflicts.push({ nodeId: id, kvs, itemIds: [...items], conductorIds: [...cs] });
    }
    nodes.push({ id, kv: kvs.length ? kvs[0]! : NaN, conductorIds: g.conductorIds, ports: g.ports });
  });
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Devices, shunts, endpoints.
  const devices: TDevice[] = [];
  const shunts: TShunt[] = [];
  const sources: TEndpoint[] = [];
  const loads: TEndpoint[] = [];
  const shortedDevices: string[] = [];
  const feederByName = new Map(level.system.feeders.map((f) => [f.name, f]));
  const outLines = design.items.filter((i) => i.kind === 'line_terminal' && i.props.flow === 'out');

  for (const it of design.items) {
    const role = CATALOG[it.kind].role;
    const n = (port: string) => nodeOfPort.get(`${it.id}:${port}`) ?? null;
    if (role === 'series') {
      const d: TDevice = { itemId: it.id, kind: it.kind, a: n('a'), b: n('b'), closed: deviceNormallyClosed(it), bypass: it.kind === 'regulator' && !!it.props.bypass };
      if (d.a && d.a === d.b) shortedDevices.push(it.id);
      devices.push(d);
    } else if (role === 'transformer' || role === 'pad') {
      const d: TDevice = { itemId: it.id, kind: it.kind, a: n('hv'), b: n('lv'), closed: deviceNormallyClosed(it) };
      if (d.a && d.a === d.b) shortedDevices.push(it.id);
      devices.push(d);
    } else if (role === 'shunt') {
      shunts.push({ itemId: it.id, kind: it.kind, node: n('a') });
    } else if (role === 'source') {
      if (it.props.flow === 'out') {
        const share = outLines.length ? 1 / outLines.length : 0;
        const totalCustomers = level.system.feeders.reduce((s, f) => s + f.customers, 0);
        loads.push({ itemId: it.id, node: n('a'), share, customers: outLines.length ? totalCustomers / outLines.length : 0 });
      } else {
        sources.push({ itemId: it.id, node: n('a'), share: 0, customers: 0 });
      }
    } else if (role === 'load') {
      const f = feederByName.get(String(it.props.feeder));
      loads.push({ itemId: it.id, node: n('a'), feeder: f, share: f?.share ?? 0, customers: f?.customers ?? 0 });
    }
  }
  const deviceById = new Map(devices.map((d) => [d.itemId, d]));

  // Adjacency for BFS.
  const adj = new Map<string, Array<{ to: string; dev: TDevice }>>();
  for (const d of devices) {
    if (!d.a || !d.b || d.a === d.b) continue;
    (adj.get(d.a) ?? adj.set(d.a, []).get(d.a)!).push({ to: d.b, dev: d });
    (adj.get(d.b) ?? adj.set(d.b, []).get(d.b)!).push({ to: d.a, dev: d });
  }

  const reach = (opts: ReachOptions = {}): Set<string> => {
    const seen = new Set<string>();
    const queue: string[] = [];
    for (const s of opts.sources ?? sources) {
      if (s.node && !seen.has(s.node)) {
        seen.add(s.node);
        queue.push(s.node);
      }
    }
    while (queue.length) {
      const cur = queue.shift()!;
      for (const { to, dev } of adj.get(cur) ?? []) {
        if (seen.has(to)) continue;
        if (opts.open?.has(dev.itemId)) {
          // A device with integral bypass switches can be bypassed during emergency/maintenance switching.
          if (!(opts.closeNormallyOpen && dev.bypass)) continue;
          seen.add(to);
          queue.push(to);
          continue;
        }
        const passable =
          dev.closed ||
          (opts.closeNormallyOpen && dev.kind !== 'mobile_pad') ||
          (dev.kind === 'mobile_pad' && opts.mobileConnected);
        if (!passable) continue;
        seen.add(to);
        queue.push(to);
      }
    }
    return seen;
  };

  const energized = reach();
  return {
    nodes,
    nodeById,
    nodeOfPort,
    nodeOfConductor,
    devices,
    deviceById,
    shunts,
    sources,
    loads,
    unconnectedPorts,
    voltageConflicts,
    shortedDevices,
    energized,
    reach,
    isLoadServed: (load, reached) => !!load.node && reached.has(load.node),
  };
}

/** Loads that lose supply when the given devices are open (normal configuration otherwise). */
export function loadsCutBy(topo: Topology, open: ReadonlySet<string>, opts: Omit<ReachOptions, 'open'> = {}): TEndpoint[] {
  const base = topo.reach(opts);
  const after = topo.reach({ ...opts, open });
  return topo.loads.filter((l) => l.node && base.has(l.node) && !after.has(l.node));
}

/** Is this device a "cut" device for the load (its opening alone de-energizes the load)? */
export function isCutDevice(topo: Topology, deviceId: string, load: TEndpoint): boolean {
  if (!load.node) return false;
  const base = topo.reach();
  if (!base.has(load.node)) return false;
  return !topo.reach({ open: new Set([deviceId]) }).has(load.node);
}

/** Item ids of devices with a terminal on the given node. */
export function devicesOnNode(topo: Topology, nodeId: string): TDevice[] {
  return topo.devices.filter((d) => d.a === nodeId || d.b === nodeId);
}
