/**
 * A hand-built reference design used by unit tests, the 3D view's dev harness
 * and as a known-good layout: a basic 69–12.47 kV distribution substation in
 * the arrangement of Bulletin Figure 4-2, with recloser bypass facilities per
 * Figure 4-4 and bus regulation per Figure 4-3.
 */
import { defaultProps } from './catalog';
import type { Conductor, Design, ItemKind, LevelDef, PlacedItem, Props, Rotation } from './types';

function item(id: string, kind: ItemKind, x: number, y: number, kv: number, props: Props = {}, rot: Rotation = 0, label?: string): PlacedItem {
  return { id, kind, x, y, rot, kv, props: { ...defaultProps(kind), ...props }, label };
}

function wire(id: string, kv: number, ...pts: Array<[number, number]>): Conductor {
  return { id, kv, elevation: 'low', size: 'pipe2', points: pts.map(([x, y]) => ({ x, y })) };
}

export const SAMPLE_LEVEL: LevelDef = {
  id: 'sample',
  order: 0,
  title: 'Sample Substation',
  subtitle: 'Reference layout',
  client: 'Sample Electric Cooperative',
  briefing: ['Reference design for tests.'],
  topics: [],
  site: { width: 60, depth: 46, altitudeM: 200, soilResistivity: 100, isokeraunicDays: 45, roadSide: 'S' },
  system: {
    hvKV: 69,
    lvKV: 12.47,
    hvFaultKA: 8,
    hvGroundFaultKA: 6,
    xOverR: 10,
    splitFactor: 0.6,
    faultDurationS: 0.5,
    loadMVA: 7,
    growthPct: 2.5,
    horizonYears: 10,
    powerFactor: 0.95,
    hvEffectivelyGrounded: true,
    feeders: [
      { name: 'Feeder 1 — North', share: 0.55, customers: 1400 },
      { name: 'Feeder 2 — South', share: 0.45, customers: 1100 },
    ],
  },
  fixtures: [],
  tools: ['switch', 'hookstick_switch', 'fuse', 'recloser', 'transformer', 'regulator', 'arrester', 'mast', 'feeder_exit', 'control_house'],
  features: { fence: true, groundGrid: true, shieldWires: true, surfacing: true },
  budget: 2_500_000,
  objectives: [],
  simYears: 10,
  reliabilityTarget: 30,
};

export function sampleDesign(): Design {
  const HV = 69;
  const LV = 12.47;
  const items: PlacedItem[] = [
    item('L1', 'line_terminal', 2, 20, HV, { flow: 'in' }, 0, 'Line 1'),
    item('S1', 'switch', 6, 20.5, HV, {}, 0, 'Primary disconnect'),
    item('F1', 'fuse', 10, 20.5, HV, { ampRating: 125, interruptingKA: 20 }, 0, 'T1 fuses'),
    item('T1', 'transformer', 14, 20.5, HV, { kva: 10000, cooling: 'OA/FA', ltc: false, lvKV: LV, arresters: 'hv_lv' }, 0, 'T1'),
    item('RG1', 'regulator', 22, 21, LV, { ratedA: 668, rangePct: 10, bypass: true }, 0, 'Bus regulators'),
    // Feeder 1 bay
    item('S2', 'switch', 29, 14.5, LV, {}, 0),
    item('R1', 'recloser', 33, 14.5, LV, { continuousA: 560, interruptingKA: 10 }, 0, 'R1'),
    item('S3', 'switch', 37, 14.5, LV, {}, 0),
    item('FE1', 'feeder_exit', 41, 14.5, LV, { feeder: 'Feeder 1 — North' }, 0, 'Feeder 1'),
    item('HS1', 'hookstick_switch', 33.5, 11, LV, { normallyOpen: true }, 0, 'R1 bypass'),
    // Feeder 2 bay
    item('S4', 'switch', 29, 26.5, LV, {}, 0),
    item('R2', 'recloser', 33, 26.5, LV, { continuousA: 560, interruptingKA: 10 }, 0, 'R2'),
    item('S5', 'switch', 37, 26.5, LV, {}, 0),
    item('FE2', 'feeder_exit', 41, 26.5, LV, { feeder: 'Feeder 2 — South' }, 0, 'Feeder 2'),
    item('HS2', 'hookstick_switch', 33.5, 31, LV, { normallyOpen: true }, 0, 'R2 bypass'),
    // Lightning masts and control house
    item('M1', 'mast', 10, 19, 0, { heightM: 20 }),
    item('M2', 'mast', 32, 13, 0, { heightM: 20 }),
    item('M3', 'mast', 33, 23, 0, { heightM: 20 }),
    item('M4', 'mast', 31, 29, 0, { heightM: 20 }),
    item('CH1', 'control_house', 6, 30, 0, { size: 'small' }),
  ];
  const conductors: Conductor[] = [
    wire('C1', HV, [3.5, 23], [6, 23]),
    wire('C2', HV, [8.5, 23], [10, 23]),
    wire('C3', HV, [12.5, 23], [14, 23]),
    wire('C4', LV, [20, 23], [22, 23]),
    wire('C5', LV, [24.5, 23], [27, 23]),
    wire('BUS', LV, [27, 12], [27, 32]),
    // Feeder 1
    wire('C6', LV, [27, 16], [29, 16]),
    wire('C7', LV, [31, 16], [33, 16]),
    wire('C8', LV, [35, 16], [37, 16]),
    wire('C9', LV, [39, 16], [41, 16]),
    wire('C10', LV, [27, 12], [33.5, 12]),
    wire('C11', LV, [35, 12], [40, 12], [40, 16]),
    // Feeder 2
    wire('C12', LV, [27, 28], [29, 28]),
    wire('C13', LV, [31, 28], [33, 28]),
    wire('C14', LV, [35, 28], [37, 28]),
    wire('C15', LV, [39, 28], [41, 28]),
    wire('C16', LV, [27, 32], [33.5, 32]),
    wire('C17', LV, [35, 32], [40, 32], [40, 28]),
  ];
  return {
    version: 1,
    levelId: 'sample',
    items,
    conductors,
    fence: { rect: { x: 1, y: 8, w: 46, h: 30 }, gate: { side: 'S', offset: 20, width: 6 } },
    shieldWires: [],
    groundGrid: {
      enabled: true,
      spacingM: 6,
      conductor: '4/0',
      depthM: 0.5,
      rodCount: 12,
      rodLengthM: 3,
      extendBeyondFenceM: 1,
      fenceBonded: true,
    },
    surfacing: { material: 'crushed_rock', thicknessM: 0.1 },
    shieldingMethod: 'fixed_angle',
  };
}
