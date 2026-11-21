/**
 * Electrical arrangement checks: connectivity, voltage consistency, feeder and
 * transformer protection, isolation and bypass facilities, voltage regulation,
 * surge arresters, and auxiliary requirements.
 */
import type { Citation } from '../../data/bulletin/types';
import { CATALOG } from '../catalog';
import { dist } from '../geometry';
import { itemLabel, itemPorts } from '../items';
import { isCutDevice, isProtective, isSwitch, type TDevice, type TEndpoint, type Topology } from '../topology';
import type { Design, Finding, LevelDef, PlacedItem } from '../types';

export const CITES = {
  basicDist: { page: [121, 122], section: '4.3.1', figure: '4-2' },
  primaryProt: { page: 122, section: '4.3.2' },
  regulation: { page: [122, 123], section: '4.3.3', figure: '4-3' },
  bypass: { page: [123, 124], section: '4.3.4', figure: '4-4' },
  arresters: { page: 124, section: '4.3.5' },
  surgeProtection: { page: 142, section: '4.7.2' },
  mobile: { page: 122, section: '4.3.1' },
  transBypass: { page: 126, section: '4.4.2', figure: '4-7' },
} satisfies Record<string, Citation>;

let seq = 0;
const fid = (check: string) => `${check}#${++seq}`;

/** Max distance (m) at which a separate arrester stand counts as "close to" the protected terminal (game rule for "as close as practical"). */
export const ARRESTER_NEAR_M = 10;

export interface ElectricalFacts {
  /** For each breaker/recloser: can it be isolated with its own switches? */
  isolable: Map<string, boolean>;
  /** For each breaker/recloser/regulator: can its circuit stay energized while it is out for maintenance? */
  bypassed: Map<string, boolean>;
  /** Per load: the dedicated protective device (or null). */
  feederProtection: Map<string, string | null>;
  /** Per transformer: primary protective device ids (empty if none). */
  primaryProtection: Map<string, string[]>;
  /** Loads lacking voltage regulation in normal configuration. */
  unregulatedLoads: string[];
}

export function analyzeElectrical(design: Design, level: LevelDef, topo: Topology): ElectricalFacts {
  const items = new Map(design.items.map((i) => [i.id, i]));
  const base = topo.reach();
  const servedLoads = topo.loads.filter((l) => l.node && base.has(l.node));

  // Feeder protection: a breaker/recloser that is a cut device for this load and no other load.
  const feederProtection = new Map<string, string | null>();
  for (const l of servedLoads) {
    let found: string | null = null;
    for (const d of topo.devices) {
      if (d.kind !== 'breaker' && d.kind !== 'recloser') continue;
      if (!d.closed) continue;
      if (!isCutDevice(topo, d.itemId, l)) continue;
      const others = servedLoads.filter((o) => o !== l && isCutDevice(topo, d.itemId, o));
      if (others.length === 0 || l.feeder === undefined) {
        // Outgoing transmission lines: one breaker per line is the norm; allow dedicated ones only.
        if (others.length === 0) {
          found = d.itemId;
          break;
        }
      }
    }
    feederProtection.set(l.itemId, found);
  }

  // Transformer primary protection: opening all protective devices on the HV side
  // must separate the transformer from every source.
  const primaryProtection = new Map<string, string[]>();
  for (const d of topo.devices) {
    if (d.kind !== 'transformer' || !d.a) continue;
    if (!base.has(d.a)) {
      primaryProtection.set(d.itemId, []);
      continue;
    }
    // Protective devices on the HV side of this transformer (same voltage level).
    const hvKV = items.get(d.itemId)!.kv;
    const cands = topo.devices.filter((x) => isProtective(x.kind) && x.closed && x.a && Math.abs((topo.nodeById.get(x.a)?.kv ?? 0) - hvKV) < 0.01);
    const open = new Set(cands.map((c) => c.itemId));
    const reached = topo.reach({ open });
    if (reached.has(d.a)) {
      primaryProtection.set(d.itemId, []);
    } else {
      // Report the nearest ones: those individually on the path, else the whole set.
      const cuts = cands.filter((c) => !topo.reach({ open: new Set([c.itemId]) }).has(d.a!));
      primaryProtection.set(d.itemId, cuts.length ? cuts.map((c) => c.itemId) : cands.map((c) => c.itemId));
    }
  }

  // Isolation and bypass for breakers and reclosers; bypass for regulators.
  const isolable = new Map<string, boolean>();
  const bypassed = new Map<string, boolean>();
  for (const d of topo.devices) {
    if (d.kind !== 'breaker' && d.kind !== 'recloser' && d.kind !== 'regulator' && d.kind !== 'circuit_switcher') continue;
    const it = items.get(d.itemId)!;
    if (!d.a || !d.b || !d.closed) continue;
    const myLoads = servedLoads.filter((l) => isCutDevice(topo, d.itemId, l));
    // Switches touching my terminal nodes.
    const sw = topo.devices.filter((x) => isSwitch(x.kind) && x.itemId !== d.itemId && (x.a === d.a || x.b === d.a || x.a === d.b || x.b === d.b));
    const open = new Set([d.itemId, ...sw.map((s) => s.itemId)]);
    const reachedIso = topo.reach({ open });
    const terminalsDead = !reachedIso.has(d.a) && !reachedIso.has(d.b);
    const othersOk = servedLoads.filter((l) => !myLoads.includes(l)).every((l) => reachedIso.has(l.node!));
    if (d.kind !== 'regulator') isolable.set(d.itemId, terminalsDead && othersOk);
    if (d.kind === 'regulator' && it.props.bypass) {
      bypassed.set(d.itemId, true);
      continue;
    }
    // Maintenance: device and its isolating switches open, normally-open switches closed.
    const reachedBy = topo.reach({ open: terminalsDead ? open : new Set([d.itemId]), closeNormallyOpen: true });
    bypassed.set(d.itemId, myLoads.length > 0 && myLoads.every((l) => reachedBy.has(l.node!)));
  }

  // Voltage regulation: with every regulator and LTC transformer open, served LV loads should drop out.
  const unregulatedLoads: string[] = [];
  if (level.system.lvKV !== undefined) {
    const regs = topo.devices.filter((d) => d.kind === 'regulator' || (d.kind === 'transformer' && items.get(d.itemId)?.props.ltc));
    const reached = topo.reach({ open: new Set(regs.map((r) => r.itemId)) });
    for (const l of servedLoads) {
      if (l.feeder && reached.has(l.node!)) unregulatedLoads.push(l.itemId);
    }
  }

  return { isolable, bypassed, feederProtection, primaryProtection, unregulatedLoads };
}

function nearbyArrester(design: Design, topo: Topology, nodeId: string | null, at: { x: number; y: number }): PlacedItem | undefined {
  if (!nodeId) return undefined;
  return design.items.find((a) => {
    if (a.kind !== 'arrester') return false;
    if (topo.nodeOfPort.get(`${a.id}:a`) !== nodeId) return false;
    const p = itemPorts(a)[0]!.pos;
    return dist(p, at) <= ARRESTER_NEAR_M;
  });
}

export function checkElectrical(design: Design, level: LevelDef, topo: Topology, facts: ElectricalFacts): Finding[] {
  seq = 0;
  const out: Finding[] = [];
  const items = new Map(design.items.map((i) => [i.id, i]));
  const label = (id: string) => itemLabel(items.get(id)!);

  // --- Connectivity ---------------------------------------------------------------
  const unconnectedByItem = new Map<string, string[]>();
  for (const p of topo.unconnectedPorts) {
    const it = items.get(p.itemId)!;
    if (it.kind === 'mobile_pad') continue;
    unconnectedByItem.set(p.itemId, [...(unconnectedByItem.get(p.itemId) ?? []), p.portId]);
  }
  for (const [id, ports] of unconnectedByItem) {
    const it = items.get(id)!;
    const isEndpoint = it.kind === 'line_terminal' || it.kind === 'feeder_exit';
    out.push({
      id: fid('conn.port'),
      checkId: 'conn.port',
      severity: isEndpoint ? 'critical' : 'major',
      category: 'connectivity',
      title: `${label(id)} is not connected`,
      detail: `Terminal${ports.length > 1 ? 's' : ''} ${ports.map((p) => p.toUpperCase()).join(', ')} ${ports.length > 1 ? 'have' : 'has'} no bus connection. Draw bus from the terminal (the dot on the equipment) to the circuit.`,
      itemIds: [id],
    });
  }
  for (const vc of topo.voltageConflicts) {
    out.push({
      id: fid('conn.voltage'),
      checkId: 'conn.voltage',
      severity: 'critical',
      category: 'connectivity',
      title: `Equipment of different voltages connected together (${vc.kvs.join(' kV / ')} kV)`,
      detail: 'A node joins equipment or bus rated for different system voltages. Only a transformer can connect two voltage levels.',
      itemIds: vc.itemIds,
      conductorIds: vc.conductorIds,
    });
  }
  for (const id of topo.shortedDevices) {
    out.push({ id: fid('conn.shorted'), checkId: 'conn.shorted', severity: 'major', category: 'connectivity', title: `${label(id)} is shorted out`, detail: 'Both terminals connect to the same bus, so the device does nothing. Connect its terminals to different circuits.', itemIds: [id] });
  }
  for (const it of design.items) {
    const v = CATALOG[it.kind].voltages;
    if (!v || !(it.kv > 0)) continue;
    if (it.kv < v.min - 0.01 || it.kv > v.max + 0.01) {
      out.push({ id: fid('conn.rating'), checkId: 'conn.rating', severity: 'critical', category: 'ratings', title: `${CATALOG[it.kind].name} is not available at ${it.kv} kV`, detail: `This equipment type is used from ${v.min} to ${v.max} kV in the game.`, itemIds: [it.id] });
    }
  }
  if (!topo.sources.some((s) => s.node)) {
    out.push({ id: fid('conn.nosource'), checkId: 'conn.nosource', severity: 'critical', category: 'connectivity', title: 'No incoming line is connected', detail: 'Connect the incoming line terminal to the substation.' });
  }
  for (const l of topo.loads) {
    const it = items.get(l.itemId)!;
    if (it.kind === 'feeder_exit' && !l.feeder) {
      out.push({ id: fid('conn.feederunassigned'), checkId: 'conn.feederunassigned', severity: 'major', category: 'connectivity', title: `${label(l.itemId)} serves no feeder`, detail: 'Select which feeder this getaway serves in the inspector.', itemIds: [l.itemId] });
    }
    if (l.node && !topo.energized.has(l.node)) {
      out.push({ id: fid('conn.dead'), checkId: 'conn.dead', severity: 'critical', category: 'connectivity', title: `${label(l.itemId)} is not energized`, detail: 'No closed path connects it to an incoming line. Check open switches and missing bus.', itemIds: [l.itemId] });
    }
  }
  // Each feeder named in the project should be served by exactly one getaway.
  for (const f of level.system.feeders) {
    const exits = design.items.filter((i) => i.kind === 'feeder_exit' && i.props.feeder === f.name);
    if (exits.length === 0) {
      out.push({ id: fid('conn.feedermissing'), checkId: 'conn.feedermissing', severity: 'critical', category: 'objective', title: `${f.name} has no getaway`, detail: `Place a feeder getaway and assign it to ${f.name} (${f.customers.toLocaleString()} members).` });
    } else if (exits.length > 1) {
      out.push({ id: fid('conn.feederdup'), checkId: 'conn.feederdup', severity: 'major', category: 'connectivity', title: `${f.name} is assigned to ${exits.length} getaways`, detail: 'Each feeder leaves the substation once.', itemIds: exits.map((e) => e.id) });
    }
  }

  // --- Protection -------------------------------------------------------------------
  for (const l of topo.loads) {
    if (!l.node || !topo.energized.has(l.node)) continue;
    const prot = facts.feederProtection.get(l.itemId);
    if (!prot) {
      const it = items.get(l.itemId)!;
      out.push({
        id: fid('prot.feeder'),
        checkId: 'prot.feeder',
        severity: 'critical',
        category: 'protection',
        title: `${label(l.itemId)} has no dedicated protective device`,
        detail:
          it.kind === 'feeder_exit'
            ? 'Each distribution feeder needs its own power circuit breaker or automatic circuit recloser so a feeder fault does not take out the whole substation.'
            : 'Each line position needs its own circuit breaker.',
        itemIds: [l.itemId],
        cite: [CITES.basicDist],
      });
    }
  }
  for (const [tid, prot] of facts.primaryProtection) {
    if (!prot.length && topo.energized.has(topo.deviceById.get(tid)!.a!)) {
      out.push({
        id: fid('prot.primary'),
        checkId: 'prot.primary',
        severity: 'critical',
        category: 'protection',
        title: `${label(tid)} has no primary protective device`,
        detail: 'Provide power fuses, a circuit switcher or a circuit breaker on the transformer primary to clear transformer and low-voltage bus faults. Selection depends on voltage, short-circuit level and transformer size.',
        itemIds: [tid],
        cite: [CITES.primaryProt],
      });
    }
  }

  // Breakers need relays and DC control power.
  const breakers = design.items.filter((i) => i.kind === 'breaker' || i.kind === 'circuit_switcher');
  const controlHouses = design.items.filter((i) => i.kind === 'control_house');
  const hasBattery = controlHouses.some((c) => c.props.battery);
  if (breakers.length && !hasBattery) {
    out.push({
      id: fid('aux.dc'),
      checkId: 'aux.dc',
      severity: 'major',
      category: 'protection',
      title: 'Breakers have no DC control power',
      detail: 'Power circuit breakers and circuit switchers trip from relays powered by the station battery. Add a control house with a station battery and charger.',
      itemIds: breakers.map((b) => b.id),
      cite: [{ page: [680, 681], section: '15.2' }, { page: 244, section: '5.3.6' }],
    });
  }
  if (controlHouses.length && !design.items.some((i) => i.kind === 'station_service') && level.system.lvKV !== undefined && level.tools.includes('station_service')) {
    out.push({
      id: fid('aux.ac'),
      checkId: 'aux.ac',
      severity: 'minor',
      category: 'protection',
      title: 'No station service transformer',
      detail: 'The AC auxiliary system (battery charger, heaters, lighting) needs a reliable source such as a station service transformer.',
      cite: [{ page: 673, section: '15.1' }],
    });
  }
  for (const b of design.items.filter((i) => i.kind === 'breaker')) {
    const relays = (b.props.relays as string[] | undefined) ?? [];
    if (!relays.length) {
      out.push({ id: fid('prot.relays'), checkId: 'prot.relays', severity: 'major', category: 'protection', title: `${itemLabel(b)} has no protective relays`, detail: 'A breaker only opens when a relay tells it to. Assign relays in the inspector.', itemIds: [b.id], cite: [{ page: 601, section: '12.1' }] });
    }
  }

  // Isolation switches for breakers/reclosers.
  for (const [id, ok] of facts.isolable) {
    if (!ok) {
      out.push({
        id: fid('maint.isolation'),
        checkId: 'maint.isolation',
        severity: 'major',
        category: 'reliability',
        title: `${label(id)} cannot be isolated for maintenance`,
        detail: 'Put disconnect switches on both the source and load sides so the device can be de-energized without shutting down the rest of the substation.',
        itemIds: [id],
        cite: [CITES.basicDist],
      });
    }
  }

  // Voltage regulation.
  if (facts.unregulatedLoads.length) {
    out.push({
      id: fid('volt.regulation'),
      checkId: 'volt.regulation',
      severity: 'major',
      category: 'ratings',
      title: 'Feeders without voltage regulation',
      detail: 'Rural distribution substations usually need voltage regulation: an LTC transformer, bus regulators, or regulators on each feeder.',
      itemIds: facts.unregulatedLoads,
      cite: [CITES.regulation],
    });
  }

  // --- Surge arresters ------------------------------------------------------------------
  for (const it of design.items) {
    if (it.kind === 'transformer') {
      const d = topo.deviceById.get(it.id)!;
      const ports = itemPorts(it);
      const hvPort = ports.find((p) => p.portId === 'hv')!.pos;
      const lvPort = ports.find((p) => p.portId === 'lv')!.pos;
      const tank = String(it.props.arresters ?? 'none');
      const hvStand = nearbyArrester(design, topo, d.a, hvPort);
      const prot = facts.primaryProtection.get(it.id) ?? [];
      const fused = prot.some((p) => items.get(p)?.kind === 'fuse');
      let hvLineSide: PlacedItem | undefined;
      if (fused) {
        for (const fId of prot) {
          const f = topo.deviceById.get(fId);
          if (!f) continue;
          const srcNode = topo.reach({ open: new Set([fId]) }).has(f.a ?? '') ? f.a : f.b;
          hvLineSide = hvLineSide ?? nearbyArrester(design, topo, srcNode, hvPort);
        }
      }
      if (tank === 'none' && !hvStand && !hvLineSide) {
        out.push({ id: fid('surge.xfmr.hv'), checkId: 'surge.xfmr.hv', severity: 'major', category: 'lightning', title: `${itemLabel(it)} has no high-side surge arresters`, detail: 'Install surge arresters as close as practical to the transformer — on tank brackets, a separate stand or an adjacent structure.', itemIds: [it.id], cite: [CITES.arresters, CITES.surgeProtection] });
      } else if (fused && !hvLineSide && (tank !== 'none' || hvStand)) {
        out.push({ id: fid('surge.fuse'), checkId: 'surge.fuse', severity: 'minor', category: 'lightning', title: `${itemLabel(it)}: put arresters on the line side of the fuses`, detail: 'When transformers are fuse-protected, connect the transformer arresters on the line side of the fuses, close to the transformer, to avoid stressing or partially melting the fuse links.', itemIds: [it.id], cite: [CITES.arresters] });
      }
      const lvStand = nearbyArrester(design, topo, d.b, lvPort);
      if (tank !== 'hv_lv' && !lvStand) {
        out.push({ id: fid('surge.xfmr.lv'), checkId: 'surge.xfmr.lv', severity: 'minor', category: 'lightning', title: `${itemLabel(it)} has no low-side surge arresters`, detail: 'Transformers are sensitive to transient overvoltages from the distribution side as well.', itemIds: [it.id], cite: [CITES.arresters] });
      }
    }
    if (it.kind === 'regulator' && !it.props.arresters) {
      const d = topo.deviceById.get(it.id)!;
      const p = itemPorts(it)[0]!.pos;
      if (!nearbyArrester(design, topo, d.a, p) && !nearbyArrester(design, topo, d.b, p)) {
        out.push({ id: fid('surge.reg'), checkId: 'surge.reg', severity: 'minor', category: 'lightning', title: `${itemLabel(it)} has no surge arresters`, detail: 'For voltage regulators, arresters are normally installed directly on the regulator tanks.', itemIds: [it.id], cite: [CITES.arresters] });
      }
    }
  }
  for (const s of topo.sources) {
    const it = items.get(s.itemId)!;
    const port = itemPorts(it)[0]!.pos;
    if (s.node && !nearbyArrester(design, topo, s.node, port) && level.tools.includes('arrester') && it.kv >= 69) {
      out.push({ id: fid('surge.line'), checkId: 'surge.line', severity: 'minor', category: 'lightning', title: `No arresters at the ${itemLabel(it)} entrance`, detail: 'Arresters at line entrances protect the station from incoming surges.', itemIds: [it.id], cite: [{ page: 356, section: '5.8.9' }] });
    }
  }

  return out;
}

export type { TDevice, TEndpoint };
