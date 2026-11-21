/**
 * Reliability model: expected customer outage minutes per year caused by the
 * substation, by contingency enumeration over the topology.
 *
 * The bulletin does not publish failure rates or repair times; the RATES table
 * below is a GAME ASSUMPTION chosen to make design trade-offs visible. What the
 * model rewards is grounded in the bulletin: dedicated feeder protection
 * (§4.3.1), isolation switches (§4.3.1), bypass facilities (§4.3.3-4.3.4),
 * provisions for a mobile transformer (§4.3.1, §4.13), redundant switching
 * schemes (§4.6), shielding (§4.7.3) and surge arresters (§4.3.5).
 */
import type { StationCalc } from './calc';
import { transformerSiteRatingKVA } from './equipment';
import { polylineLength } from './geometry';
import type { ElectricalFacts } from './checks/electrical';
import { isProtective, type TEndpoint, type Topology } from './topology';
import type { Design, ItemKind, LevelDef } from './types';

export interface ComponentRates {
  /** Failures per year. */
  failuresPerYear: number;
  /** Hours to repair or replace after a failure. */
  repairHours: number;
  /** Planned maintenance interval in years (0 = none modelled). */
  maintenanceYears: number;
  /** Hours out of service for planned maintenance. */
  maintenanceHours: number;
}

/** GAME ASSUMPTIONS — illustrative values, not from RUS Bulletin 1724E-300. */
export const RATES: Partial<Record<ItemKind, ComponentRates>> = {
  transformer: { failuresPerYear: 0.015, repairHours: 1000, maintenanceYears: 6, maintenanceHours: 10 },
  breaker: { failuresPerYear: 0.01, repairHours: 72, maintenanceYears: 6, maintenanceHours: 8 },
  recloser: { failuresPerYear: 0.015, repairHours: 24, maintenanceYears: 3, maintenanceHours: 6 },
  regulator: { failuresPerYear: 0.02, repairHours: 48, maintenanceYears: 5, maintenanceHours: 8 },
  circuit_switcher: { failuresPerYear: 0.01, repairHours: 48, maintenanceYears: 6, maintenanceHours: 8 },
  fuse: { failuresPerYear: 0.01, repairHours: 4, maintenanceYears: 0, maintenanceHours: 0 },
  switch: { failuresPerYear: 0.004, repairHours: 12, maintenanceYears: 0, maintenanceHours: 0 },
  hookstick_switch: { failuresPerYear: 0.003, repairHours: 6, maintenanceYears: 0, maintenanceHours: 0 },
  metering: { failuresPerYear: 0.004, repairHours: 12, maintenanceYears: 0, maintenanceHours: 0 },
  wave_trap: { failuresPerYear: 0.002, repairHours: 12, maintenanceYears: 0, maintenanceHours: 0 },
};

/** GAME ASSUMPTIONS for events outside individual components. */
export const EVENT_ASSUMPTIONS = {
  /** Faults per year on each distribution feeder beyond the substation. */
  feederFaultsPerYear: 10,
  /** Fraction of feeder faults that are temporary (cleared by reclosing). */
  temporaryFraction: 0.8,
  /** Incoming line outages per year per line. */
  lineOutagesPerYear: 0.6,
  lineOutageHours: 3,
  /** Hours to isolate a fault and restore by manual switching (0.5 h with SCADA). */
  switchingHours: 1.5,
  scadaSwitchingHours: 0.5,
  /** Hours to install a mobile transformer on a prepared pad. */
  mobileInstallHours: 24,
  /** Hours to bring in and connect a mobile unit where no provisions were made. */
  mobileUnpreparedHours: 120,
  /** Hours to manually restore after a temporary fault locked out a non-reclosing device. */
  manualRestoreHours: 1,
  /** Ground flash density per thunderstorm day (flashes/km²/yr per day). */
  flashDensityPerTD: 0.12,
  /** Expected repair hours after a direct stroke to unshielded equipment. */
  strokeDamageHours: 72,
  /** Damaging surges per year reaching an unprotected transformer. */
  surgeDamagePerYear: 0.02,
  /** Bus faults per year per 100 m of station bus. */
  busFaultsPer100m: 0.02,
  busRepairHours: 12,
} as const;

export interface OutageContribution {
  cause: string;
  itemId?: string;
  /** Expected customer-minutes per year. */
  customerMinutes: number;
  planned: boolean;
  /** Outside the player's control (e.g. the only supply line); shown but not scored. */
  external?: boolean;
  /** Events per year. */
  ratePerYear: number;
  /** Customer-minutes per event. */
  perEvent: number;
  /** Customers interrupted per event. */
  customers: number;
  kind: 'failure' | 'maintenance' | 'feeder' | 'line' | 'lightning' | 'surge' | 'bus';
}

export interface ReliabilityResult {
  totalCustomers: number;
  /** Expected unplanned outage minutes per customer per year (SAIDI-like). */
  saidiUnplanned: number;
  /** Expected planned (maintenance) outage minutes per customer per year. */
  saidiPlanned: number;
  /** Expected minutes from causes outside the design (not scored). */
  saidiExternal: number;
  contributions: OutageContribution[];
}

const minutesFor = (loads: readonly TEndpoint[], hours: number) => loads.reduce((s, l) => s + l.customers, 0) * hours * 60;

export function evaluateReliability(
  design: Design,
  level: LevelDef,
  topo: Topology,
  facts: ElectricalFacts,
  calc: StationCalc,
  shieldingCoverage: number,
): ReliabilityResult {
  const items = new Map(design.items.map((i) => [i.id, i]));
  const contributions: OutageContribution[] = [];
  const base = topo.reach();
  const served = topo.loads.filter((l) => l.node && base.has(l.node));
  const totalCustomers = Math.max(1, topo.loads.reduce((s, l) => s + l.customers, 0) || level.system.feeders.reduce((s, f) => s + f.customers, 0));
  const hasScada = design.items.some((i) => i.kind === 'control_house' && i.props.scada);
  const swHours = hasScada ? EVENT_ASSUMPTIONS.scadaSwitchingHours : EVENT_ASSUMPTIONS.switchingHours;
  const hasMobilePad = design.items.some((i) => i.kind === 'mobile_pad');

  /** Upstream protective device that clears a fault in `id` (the one cutting the fewest loads). */
  const clearingDevice = (id: string): string | null => {
    const d = topo.deviceById.get(id);
    let best: { id: string; n: number } | null = null;
    for (const p of topo.devices) {
      if (!isProtective(p.kind) || !p.closed || p.itemId === id) continue;
      const reached = topo.reach({ open: new Set([p.itemId]) });
      const dTerminals = d ? [d.a, d.b].filter(Boolean) as string[] : [];
      if (dTerminals.length && dTerminals.some((t) => reached.has(t))) continue;
      const n = served.filter((l) => !reached.has(l.node!)).length;
      if (!best || n < best.n) best = { id: p.itemId, n };
    }
    return best?.id ?? null;
  };

  // --- Component failures ----------------------------------------------------------
  for (const d of topo.devices) {
    const it = items.get(d.itemId)!;
    const r = RATES[it.kind];
    if (!r || !d.closed) continue;
    let lambda = r.failuresPerYear;
    // Overloaded transformers age faster (game rule).
    if (it.kind === 'transformer') {
      const load = calc.transformerLoadMVA.get(it.id);
      const top = transformerSiteRatingKVA(it) / 1000;
      if (load && load.horizon > top) lambda *= 1 + 2 * (load.horizon / top - 1);
    }
    const clearer = isProtective(it.kind) ? clearingDevice(it.id) : (clearingDevice(it.id) ?? null);
    const initialOpen = new Set([d.itemId, ...(clearer ? [clearer] : [])]);
    const afterFault = topo.reach({ open: initialOpen });
    const interrupted = served.filter((l) => !afterFault.has(l.node!));
    if (!interrupted.length) continue;
    const isoOpen = new Set([d.itemId]);
    const reSwitch = topo.reach({ open: isoOpen });
    const reTie = topo.reach({ open: isoOpen, closeNormallyOpen: true });
    const reMobile = it.kind === 'transformer' && hasMobilePad ? topo.reach({ open: isoOpen, closeNormallyOpen: true, mobileConnected: true }) : null;
    let cm = 0;
    for (const l of interrupted) {
      let hours: number;
      if (reSwitch.has(l.node!)) hours = swHours;
      else if (reTie.has(l.node!)) hours = swHours + 0.5;
      else if (reMobile?.has(l.node!)) hours = EVENT_ASSUMPTIONS.mobileInstallHours;
      else if (it.kind === 'transformer') hours = Math.min(r.repairHours, EVENT_ASSUMPTIONS.mobileUnpreparedHours);
      else hours = r.repairHours;
      cm += l.customers * hours * 60;
    }
    contributions.push({ cause: `${it.label ?? it.id} failure`, itemId: it.id, customerMinutes: lambda * cm, planned: false, ratePerYear: lambda, perEvent: cm, customers: interrupted.reduce((s2, l) => s2 + l.customers, 0), kind: 'failure' });
  }

  // --- Planned maintenance ----------------------------------------------------------
  for (const d of topo.devices) {
    const it = items.get(d.itemId)!;
    const r = RATES[it.kind];
    if (!r || !r.maintenanceYears || !d.closed) continue;
    let cut: TEndpoint[];
    if (facts.bypassed.get(it.id)) {
      cut = [];
    } else {
      const reach = topo.reach({ open: new Set([d.itemId]), closeNormallyOpen: true, mobileConnected: it.kind === 'transformer' && hasMobilePad });
      cut = served.filter((l) => !reach.has(l.node!));
    }
    if (cut.length) {
      const per = minutesFor(cut, r.maintenanceHours);
      contributions.push({ cause: `${it.label ?? it.id} maintenance`, itemId: it.id, customerMinutes: per / r.maintenanceYears, planned: true, ratePerYear: 1 / r.maintenanceYears, perEvent: per, customers: cut.reduce((s2, l) => s2 + l.customers, 0), kind: 'maintenance' });
    }
  }

  // --- Feeder faults beyond the substation ----------------------------------------------
  for (const l of served) {
    const prot = facts.feederProtection.get(l.itemId);
    const faults = EVENT_ASSUMPTIONS.feederFaultsPerYear;
    const temp = faults * EVENT_ASSUMPTIONS.temporaryFraction;
    const perm = faults - temp;
    if (!prot) {
      // Cleared by an upstream device that also drops other feeders.
      const reached = topo.reach({ open: new Set(topo.devices.filter((x) => isProtective(x.kind) && x.closed).map((x) => x.itemId)) });
      const victims = served.filter((o) => o !== l && !reached.has(o.node!));
      const cmTotal = (temp + perm) * minutesFor(victims, EVENT_ASSUMPTIONS.manualRestoreHours) + temp * minutesFor([l], EVENT_ASSUMPTIONS.manualRestoreHours);
      contributions.push({ cause: `${items.get(l.itemId)?.label ?? l.itemId}: feeder faults trip shared protection`, itemId: l.itemId, customerMinutes: cmTotal, planned: false, ratePerYear: faults, perEvent: cmTotal / faults, customers: victims.reduce((s2, o) => s2 + o.customers, 0) + l.customers, kind: 'feeder' });
      continue;
    }
    const dev = items.get(prot)!;
    const recloses = dev.kind === 'recloser' ? dev.props.reclosing !== false : ((dev.props.relays as string[] | undefined) ?? []).includes('79');
    if (!recloses) {
      contributions.push({ cause: `${dev.label ?? dev.id}: no reclosing — temporary faults become outages`, itemId: dev.id, customerMinutes: temp * minutesFor([l], EVENT_ASSUMPTIONS.manualRestoreHours), planned: false, ratePerYear: temp, perEvent: minutesFor([l], EVENT_ASSUMPTIONS.manualRestoreHours), customers: l.customers, kind: 'feeder' });
    }
  }

  // --- Incoming line outages ---------------------------------------------------------------
  for (const s of topo.sources) {
    if (!s.node) continue;
    const others = topo.sources.filter((o) => o !== s);
    const reach = topo.reach({ sources: others, closeNormallyOpen: true });
    const cut = served.filter((l) => !reach.has(l.node!));
    if (cut.length) {
      const sourceFixtures = level.fixtures.filter((f) => f.kind === 'line_terminal' && f.props.flow !== 'out').length;
      const per = minutesFor(cut, EVENT_ASSUMPTIONS.lineOutageHours);
      contributions.push({ cause: `${items.get(s.itemId)?.label ?? s.itemId} outage (single source)`, itemId: s.itemId, customerMinutes: EVENT_ASSUMPTIONS.lineOutagesPerYear * per, planned: false, external: sourceFixtures < 2, ratePerYear: EVENT_ASSUMPTIONS.lineOutagesPerYear, perEvent: per, customers: cut.reduce((s2, l) => s2 + l.customers, 0), kind: 'line' });
    }
  }

  // --- Lightning and surges ------------------------------------------------------------------
  const fence = design.fence?.rect;
  if (fence) {
    const ng = EVENT_ASSUMPTIONS.flashDensityPerTD * level.site.isokeraunicDays;
    const areaKm2 = ((fence.w + 50) * (fence.h + 50)) / 1e6;
    const strokes = ng * areaKm2;
    const unprotected = Math.max(0, 1 - shieldingCoverage);
    if (unprotected > 0.0005) {
      const per = minutesFor(served, EVENT_ASSUMPTIONS.strokeDamageHours);
      contributions.push({ cause: 'Direct lightning strokes to unshielded equipment', customerMinutes: strokes * unprotected * per, planned: false, ratePerYear: strokes * unprotected, perEvent: per, customers: served.reduce((s2, l) => s2 + l.customers, 0), kind: 'lightning', external: (level.checksOff ?? []).includes('shield.') });
    }
  }
  for (const it of design.items) {
    if (it.kind !== 'transformer') continue;
    const hasArr = String(it.props.arresters ?? 'none') !== 'none' || design.items.some((a) => a.kind === 'arrester' && topo.nodeOfPort.get(`${a.id}:a`) === topo.deviceById.get(it.id)?.a);
    if (!hasArr) {
      const reach = topo.reach({ open: new Set([it.id]), closeNormallyOpen: true, mobileConnected: hasMobilePad });
      const cut = served.filter((l) => !reach.has(l.node!));
      const hours = hasMobilePad ? EVENT_ASSUMPTIONS.mobileInstallHours : EVENT_ASSUMPTIONS.mobileUnpreparedHours;
      const per = minutesFor(cut, hours);
      contributions.push({ cause: `${it.label ?? it.id}: surge damage without arresters`, itemId: it.id, customerMinutes: EVENT_ASSUMPTIONS.surgeDamagePerYear * per, planned: false, ratePerYear: EVENT_ASSUMPTIONS.surgeDamagePerYear, perEvent: per, customers: cut.reduce((s2, l) => s2 + l.customers, 0), kind: 'surge', external: (level.checksOff ?? []).includes('surge.') });
    }
  }

  // --- Bus faults (rate proportional to bus length, grouped by voltage) ----------------------
  const busByKV = new Map<number, { rate: number; cm: number; customers: number }>();
  const condLen = new Map(design.conductors.map((c) => [c.id, polylineLength(c.points)]));
  for (const n of topo.nodes) {
    if (!n.conductorIds.length || !base.has(n.id)) continue;
    const lengthM = n.conductorIds.reduce((s, id) => s + (condLen.get(id) ?? 0), 0);
    const devs = topo.devices.filter((d) => d.closed && (d.a === n.id || d.b === n.id)).map((d) => d.itemId);
    const reach = topo.reach({ open: new Set(devs) });
    const cut = served.filter((l) => !reach.has(l.node!));
    const reTie = topo.reach({ open: new Set(devs), closeNormallyOpen: true });
    const cm = cut.reduce((s, l) => s + l.customers * (reTie.has(l.node!) ? swHours : EVENT_ASSUMPTIONS.busRepairHours) * 60, 0);
    const lambda = (EVENT_ASSUMPTIONS.busFaultsPer100m * lengthM) / 100;
    if (cm > 0) {
      const prev = busByKV.get(n.kv) ?? { rate: 0, cm: 0, customers: 0 };
      busByKV.set(n.kv, { rate: prev.rate + lambda, cm: prev.cm + lambda * cm, customers: Math.max(prev.customers, cut.reduce((s2, l) => s2 + l.customers, 0)) });
    }
  }
  for (const [kv, b] of busByKV) contributions.push({ cause: `Bus faults (${kv} kV)`, customerMinutes: b.cm, planned: false, ratePerYear: b.rate, perEvent: b.rate > 0 ? b.cm / b.rate : 0, customers: b.customers, kind: 'bus' });

  const sum = (f: (c: OutageContribution) => boolean) => contributions.filter(f).reduce((s, c) => s + c.customerMinutes, 0);
  const unplanned = sum((c) => !c.planned && !c.external);
  const planned = sum((c) => c.planned && !c.external);
  const external = sum((c) => !!c.external);
  contributions.sort((a, b) => b.customerMinutes - a.customerMinutes);
  return {
    totalCustomers,
    saidiUnplanned: unplanned / totalCustomers,
    saidiPlanned: planned / totalCustomers,
    saidiExternal: external / totalCustomers,
    contributions,
  };
}
