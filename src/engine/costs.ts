/**
 * Construction cost estimates.
 *
 * GAME ASSUMPTIONS: RUS Bulletin 1724E-300 gives no equipment prices (it only
 * compares switching schemes in relative terms, Table 4-1). These are rough,
 * illustrative installed costs in US dollars, chosen so that the bulletin's
 * trade-offs (e.g. breakers cost more than reclosers, higher voltage costs more,
 * redundancy costs money) show up in the budget.
 */
import { CONDUCTOR_SIZES } from './catalog';
import { transformerTopRatingKVA } from './equipment';
import { polylineLength } from './geometry';
import type { Conductor, Design, LevelDef, PlacedItem } from './types';

/** Price scale by voltage class (1.0 at 15 kV class). */
export function voltageFactor(kv: number): number {
  if (kv <= 15.5) return 1;
  if (kv <= 26) return 1.15;
  if (kv <= 38) return 1.3;
  if (kv <= 48.3) return 1.6;
  if (kv <= 72.5) return 2.2;
  if (kv <= 121) return 3.2;
  if (kv <= 145) return 3.7;
  if (kv <= 169) return 4.3;
  return 5.5;
}

export function itemCost(it: PlacedItem): number {
  const vf = voltageFactor(it.kv);
  const p = it.props;
  switch (it.kind) {
    case 'line_terminal':
      return Math.round(25_000 * vf);
    case 'feeder_exit':
      return p.underground ? 30_000 : 12_000;
    case 'switch':
      return Math.round((6_000 + (Number(p.continuousA) >= 2000 ? 3_000 : 0)) * vf + (p.motor ? 12_000 : 0) + (p.groundingBlade ? 2_500 * vf : 0));
    case 'hookstick_switch':
      return Math.round(2_500 * vf);
    case 'fuse':
      return Math.round(6_500 * vf);
    case 'circuit_switcher':
      return Math.round(38_000 * vf + Number(p.interruptingKA) * 300);
    case 'breaker': {
      const base = p.medium === 'vacuum' ? 40_000 : p.medium === 'oil' ? 42_000 : 48_000;
      const relays = Array.isArray(p.relays) ? p.relays.length : 0;
      return Math.round(base * vf + Number(p.interruptingKA) * 400 * vf + (Number(p.continuousA) - 1200) * 6 + relays * 4_000);
    }
    case 'recloser':
      return Math.round((p.control === 'electronic' ? 32_000 : 24_000) * vf + Number(p.interruptingKA) * 500 + (Number(p.continuousA) - 560) * 12);
    case 'transformer': {
      const kva = Number(p.kva);
      const top = transformerTopRatingKVA(it);
      const hvf = it.kv <= 72.5 ? 1 : it.kv <= 145 ? 1.25 : it.kv <= 169 ? 1.35 : 1.6;
      let c = (120_000 + kva * 32 + (top - kva) * 10) * hvf;
      if (p.ltc) c += 110_000;
      if (p.arresters === 'hv') c += 4_000 * voltageFactor(it.kv);
      if (p.arresters === 'hv_lv') c += 4_000 * voltageFactor(it.kv) + 3_000;
      if (p.containment === 'basic') c += 18_000;
      if (p.containment === 'separator') c += 42_000;
      const relays = Array.isArray(p.relays) ? p.relays.length : 0;
      return Math.round(c + relays * 4_000);
    }
    case 'regulator':
      return Math.round(3 * (9_000 + Number(p.ratedA) * 38) * vf + (p.bypass ? 9_000 : 0) + (p.arresters ? 2_500 : 0));
    case 'arrester':
      return Math.round((p.class === 'station' ? 3_500 : p.class === 'intermediate' ? 2_400 : 1_200) * vf);
    case 'capacitor_bank':
      return Math.round(30_000 * vf + Number(p.kvar) * 9 + (p.switched ? 25_000 : 0));
    case 'vt':
      return Math.round(7_000 * vf);
    case 'ccvt':
      return Math.round(12_000 * vf);
    case 'wave_trap':
      return Math.round(9_000 * vf);
    case 'metering':
      return Math.round(18_000 * vf);
    case 'station_service':
      return 9_000 + Number(p.kva) * 40;
    case 'mobile_pad':
      return Math.round(35_000 * vf);
    case 'control_house': {
      const size = String(p.size);
      let c = size === 'large' ? 260_000 : size === 'small' ? 110_000 : 170_000;
      if (p.battery) c += 30_000;
      if (p.scada) c += 65_000;
      const comms: Record<string, number> = { none: 0, leased: 8_000, radio: 35_000, fiber: 60_000, plc: 45_000 };
      c += comms[String(p.comms)] ?? 0;
      return c;
    }
    case 'mast':
      return Math.round(6_000 + 650 * (Number(p.heightM) || 18));
  }
}

export function conductorCost(c: Conductor): number {
  const L = polylineLength(c.points);
  const size = CONDUCTOR_SIZES.findIndex((s) => s.key === c.size);
  const perM = (180 + 30 * Math.max(0, size)) * voltageFactor(c.kv) * (c.elevation === 'high' ? 1.8 : 1);
  return Math.round(L * perM);
}

export interface CostBreakdown {
  equipment: number;
  bus: number;
  fence: number;
  groundGrid: number;
  surfacing: number;
  siteWork: number;
  shieldWires: number;
  total: number;
  byItem: Map<string, number>;
}

export function designCost(design: Design, level: LevelDef): CostBreakdown {
  const byItem = new Map<string, number>();
  let equipment = 0;
  for (const it of design.items) {
    if (it.locked) continue; // level fixtures are already paid for
    const c = itemCost(it);
    byItem.set(it.id, c);
    equipment += c;
  }
  let bus = 0;
  for (const c of design.conductors) bus += conductorCost(c);
  let fence = 0;
  let groundGrid = 0;
  let surfacing = 0;
  let siteWork = 0;
  const f = design.fence?.rect;
  if (f) {
    fence = Math.round(2 * (f.w + f.h) * 95 + 4_500);
    const area = f.w * f.h;
    siteWork = Math.round(area * 22 + 15_000);
    if (design.groundGrid.enabled) {
      const e = design.groundGrid.extendBeyondFenceM;
      const gw = f.w + 2 * e;
      const gh = f.h + 2 * e;
      const D = Math.max(1, design.groundGrid.spacingM);
      const nx = Math.floor(gh / D) + 1;
      const ny = Math.floor(gw / D) + 1;
      const length = nx * gw + ny * gh;
      const perM: Record<string, number> = { '2/0': 16, '4/0': 22, '250': 25, '350': 31, '500': 40 };
      groundGrid = Math.round(length * (perM[design.groundGrid.conductor] ?? 22) + design.groundGrid.rodCount * (120 + 35 * design.groundGrid.rodLengthM) + 3_000);
    }
    if (design.surfacing.material !== 'none') {
      const perM2PerM: Record<string, number> = { crushed_rock: 240, washed_granite: 300, asphalt: 450 };
      surfacing = Math.round((f.w + 2) * (f.h + 2) * design.surfacing.thicknessM * (perM2PerM[design.surfacing.material] ?? 240));
    }
  }
  const shieldWires = design.shieldWires.length * 2_500;
  const total = equipment + bus + fence + groundGrid + surfacing + siteWork + shieldWires;
  void level;
  return { equipment, bus, fence, groundGrid, surfacing, siteWork, shieldWires, total, byItem };
}
