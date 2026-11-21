/**
 * Equipment catalogue: what each placeable item is, how big it is, where its
 * terminals are, how tall its energized parts are, and which properties the
 * player can choose.
 *
 * Footprints are game approximations derived from the bulletin's phase
 * spacings (Table 4-7 rigid bus spacing, Table 4-8 air switch spacing) so that
 * higher-voltage equipment occupies proportionally more room. Heights are set
 * so energized parts sit above the Table 4-7 personal-safety ground clearance.
 */
import type { Citation } from '../data/bulletin/types';
import { VOLTAGE_CLASS_CITES, type VoltageClassRow } from '../data/bulletin/voltageClasses';
import { clearanceClassFor } from './site';
import { TABLE_5_57_MOV_RATINGS } from '../data/bulletin/arresters';
import { ceilTo } from './geometry';
import type { ConductorElevation, ItemKind, PropValue, Props, Vec2 } from './types';

export type ToolCategory =
  | 'Lines & Feeders'
  | 'Switching'
  | 'Protection'
  | 'Transformation'
  | 'Surge & Lightning'
  | 'Instrumentation'
  | 'Auxiliary';

export const TOOL_CATEGORIES: ToolCategory[] = [
  'Lines & Feeders',
  'Switching',
  'Protection',
  'Transformation',
  'Surge & Lightning',
  'Instrumentation',
  'Auxiliary',
];

/** How the item participates in the electrical network. */
export type ElectricalRole =
  | 'source' // line terminal (in)
  | 'load' // feeder exit or outgoing line
  | 'series' // two terminals, same voltage both sides
  | 'shunt' // one terminal to ground
  | 'transformer' // HV and LV terminals
  | 'pad' // mobile transformer pad: HV and LV terminals, open unless a mobile unit is connected
  | 'none';

export interface PortDef {
  id: 'a' | 'b' | 'hv' | 'lv';
  /** Position on the unrotated footprint (top-left origin). */
  local: Vec2;
  /** Outward unit direction (unrotated). */
  dir: Vec2;
}

export interface Footprint {
  w: number;
  d: number;
  ports: PortDef[];
  /** Height of the highest energized part (m) — used for shielding. */
  liveHeight: number;
  /** Overall height (m) of the tallest part, for 3D and removal clearance. */
  height: number;
}

export interface PropOption {
  value: PropValue;
  label: string;
}

export interface PropDef {
  key: string;
  label: string;
  type: 'select' | 'bool' | 'number' | 'multi';
  options?: PropOption[];
  default: PropValue;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  cite?: Citation;
  /** Only show when another prop has a given value. */
  showIf?: { key: string; equals: PropValue };
  /** Edited through a custom control instead of the generic field. */
  hidden?: boolean;
}

export interface ItemDef {
  kind: ItemKind;
  name: string;
  /** Plan-view tag (2-4 characters). */
  tag: string;
  category: ToolCategory;
  role: ElectricalRole;
  description: string;
  /** Allowed nominal system voltages (kV); undefined = not voltage rated. */
  voltages?: { min: number; max: number };
  /** True if the structure is grounded metal that energized parts must clear (mast, control house). */
  grounded: boolean;
  /** True if the footprint contains energized parts (fence clearance applies). */
  live: boolean;
  footprint(kv: number, props: Props): Footprint;
  props: PropDef[];
  cites: Citation[];
}

// ---------------------------------------------------------------------------
// Height and size helpers
// ---------------------------------------------------------------------------

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Low-profile rigid bus height for a voltage class: ground clearance + 1.2 m. */
export function busHeight(kv: number, elevation: ConductorElevation): number {
  const vc = clearanceClassFor(kv);
  const low = r1(vc.groundClearanceM + 1.2);
  if (elevation === 'low') return low;
  return r1(Math.max(vc.roadwayClearanceM + 0.5, low + 3));
}

/** Width across the three phases for equipment using rigid-bus phase spacing plus a margin. Multiple of 1 m. */
function phaseWidth(_vc: VoltageClassRow, spacing: number, margin: number): number {
  return Math.max(2, ceilTo(2 * spacing + margin, 1));
}

function twoPort(w: number, d: number, liveHeight: number, height: number, ids: ['a', 'b'] | ['hv', 'lv'] = ['a', 'b']): Footprint {
  return {
    w,
    d,
    liveHeight,
    height,
    ports: [
      { id: ids[0], local: { x: 0, y: d / 2 }, dir: { x: -1, y: 0 } },
      { id: ids[1], local: { x: w, y: d / 2 }, dir: { x: 1, y: 0 } },
    ],
  };
}

function onePort(w: number, d: number, liveHeight: number, height: number, side: 'left' | 'right' = 'left'): Footprint {
  return {
    w,
    d,
    liveHeight,
    height,
    ports: [
      side === 'left'
        ? { id: 'a', local: { x: 0, y: d / 2 }, dir: { x: -1, y: 0 } }
        : { id: 'a', local: { x: w, y: d / 2 }, dir: { x: 1, y: 0 } },
    ],
  };
}

const sel = (key: string, label: string, options: Array<[PropValue, string]>, def: PropValue, extra: Partial<PropDef> = {}): PropDef => ({
  key,
  label,
  type: 'select',
  options: options.map(([value, l]) => ({ value, label: l })),
  default: def,
  ...extra,
});

const bool = (key: string, label: string, def: boolean, extra: Partial<PropDef> = {}): PropDef => ({
  key,
  label,
  type: 'bool',
  default: def,
  ...extra,
});

const CITE_LAYOUT_DIST: Citation = { page: 121, section: '4.3.1', figure: '4-2' };
const CITE_PRIMARY_PROT: Citation = { page: 122, section: '4.3.2' };
const CITE_REGULATION: Citation = { page: 122, section: '4.3.3', figure: '4-3' };
const CITE_BYPASS: Citation = { page: 123, section: '4.3.4', figure: '4-4' };
const CITE_ARRESTERS: Citation = { page: 124, section: '4.3.5' };
const CITE_SHIELDING: Citation = { page: [142, 145], section: '4.7.3', figure: '4-17' };

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const CATALOG: Record<ItemKind, ItemDef> = {
  line_terminal: {
    kind: 'line_terminal',
    name: 'Line Terminal (Dead-End)',
    tag: 'LINE',
    category: 'Lines & Feeders',
    role: 'source',
    description:
      'Dead-end structure where a transmission or subtransmission line enters the substation. The port faces into the yard.',
    voltages: { min: 34.5, max: 230 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.rigidBusPhaseSpacingM, 2);
      const h = r1(Math.max(vc.roadwayClearanceM + 2, 8));
      return onePort(1.5, d, h, h + 1, 'right');
    },
    props: [sel('flow', 'Power flow', [['in', 'Incoming (source)'], ['out', 'Outgoing (load)']], 'in')],
    cites: [{ page: 121, section: '4.3.1' }],
  },
  feeder_exit: {
    kind: 'feeder_exit',
    name: 'Feeder Getaway',
    tag: 'FDR',
    category: 'Lines & Feeders',
    role: 'load',
    description: 'Structure where a distribution feeder leaves the substation. Choose which feeder it serves.',
    voltages: { min: 4, max: 34.5 },
    grounded: false,
    live: true,
    footprint(kv, props) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.rigidBusPhaseSpacingM, 1);
      const h = props.underground ? 4 : 9;
      return onePort(1.5, d, props.underground ? busHeight(kv, 'low') : 8.5, h, 'left');
    },
    props: [
      { key: 'feeder', label: 'Feeder', type: 'select', options: [], default: '' },
      bool('underground', 'Underground getaway', false, {
        help: 'Installing circuits underground as they leave improves appearance and suits low-profile construction.',
        cite: { page: 120, section: '4.2.5' },
      }),
    ],
    cites: [CITE_LAYOUT_DIST],
  },
  switch: {
    kind: 'switch',
    name: 'Disconnect Switch (Group-Operated)',
    tag: 'SW',
    category: 'Switching',
    role: 'series',
    description:
      'Three-pole, group-operated air switch used to isolate equipment for maintenance. Not for interrupting fault current.',
    voltages: { min: 4, max: 230 },
    grounded: false,
    live: true,
    footprint(kv, props) {
      const vc = clearanceClassFor(kv);
      const style = props.style as string;
      const spacing =
        style === 'side_break'
          ? (vc.switchSpacingSideBreakM ?? vc.switchSpacingVerticalBreakM)
          : style === 'horn_gap'
            ? (vc.switchSpacingHornGapM ?? vc.switchSpacingVerticalBreakM)
            : vc.switchSpacingVerticalBreakM;
      const d = phaseWidth(vc, spacing, 1);
      const w = ceilTo(1.5 + 1.2 * vc.switchMinMetalToMetalM, 0.5);
      const h = busHeight(kv, 'low');
      return twoPort(w, d, h, h + 0.6);
    },
    props: [
      sel('style', 'Switch type', [['vertical_break', 'Vertical break'], ['side_break', 'Side break'], ['horn_gap', 'Horn gap']], 'vertical_break', {
        help: 'Phase spacing depends on switch type (Table 4-8).',
        cite: VOLTAGE_CLASS_CITES.switchSpacing,
      }),
      sel('continuousA', 'Continuous current', [[600, '600 A'], [1200, '1200 A'], [2000, '2000 A'], [3000, '3000 A']], 1200),
      bool('normallyOpen', 'Normally open', false, { help: 'Bypass and tie switches are normally open.' }),
      bool('motor', 'Motor operator', false, { help: 'Allows remote (SCADA) operation.' }),
      bool('groundingBlade', 'Grounding switch', false, { help: 'Grounds the line side when open, for line work.' }),
    ],
    cites: [VOLTAGE_CLASS_CITES.switchSpacing, CITE_LAYOUT_DIST],
  },
  hookstick_switch: {
    kind: 'hookstick_switch',
    name: 'Hook Stick Switches (3 single-pole)',
    tag: 'HS',
    category: 'Switching',
    role: 'series',
    description:
      'Three independently operated single-pole switches, opened with a hot stick. Common for bypass and isolation at distribution voltage.',
    voltages: { min: 4, max: 34.5 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.switchSpacingVerticalBreakM, 0.6);
      const h = busHeight(kv, 'low');
      return twoPort(1.5, d, h, h + 0.4);
    },
    props: [
      sel('continuousA', 'Continuous current', [[600, '600 A'], [1200, '1200 A']], 600),
      bool('normallyOpen', 'Normally open', false, { help: 'Set for bypass switches.' }),
    ],
    cites: [CITE_BYPASS],
  },
  fuse: {
    kind: 'fuse',
    name: 'Power Fuses',
    tag: 'FU',
    category: 'Protection',
    role: 'series',
    description: 'Power fuses protect the transformer from transformer or low-voltage bus faults and can serve as the primary disconnect.',
    voltages: { min: 4, max: 161 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.switchSpacingVerticalBreakM, 1);
      const w = ceilTo(1.5 + 1.2 * vc.switchMinMetalToMetalM, 0.5);
      const h = busHeight(kv, 'low');
      return twoPort(w, d, h, h + 0.8);
    },
    props: [
      sel('ampRating', 'Fuse rating', [[50, '50E'], [65, '65E'], [80, '80E'], [100, '100E'], [125, '125E'], [150, '150E'], [200, '200E'], [250, '250E']], 100),
      sel('interruptingKA', 'Interrupting rating', [[10, '10 kA'], [16, '16 kA'], [20, '20 kA'], [25, '25 kA'], [31.5, '31.5 kA']], 20),
    ],
    cites: [CITE_PRIMARY_PROT],
  },
  circuit_switcher: {
    kind: 'circuit_switcher',
    name: 'Circuit Switcher',
    tag: 'CS',
    category: 'Protection',
    role: 'series',
    description: 'Combined interrupter and disconnect used as a transformer primary protective device; relays trip it.',
    voltages: { min: 34.5, max: 230 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.rigidBusPhaseSpacingM, 1);
      const w = ceilTo(2.5 + vc.minMetalToMetalM, 0.5);
      const h = busHeight(kv, 'low');
      return twoPort(w, d, h, h + 1);
    },
    props: [
      sel('continuousA', 'Continuous current', [[1200, '1200 A'], [2000, '2000 A']], 1200),
      sel('interruptingKA', 'Interrupting rating', [[10, '10 kA'], [20, '20 kA'], [25, '25 kA'], [31.5, '31.5 kA'], [40, '40 kA']], 25),
    ],
    cites: [CITE_PRIMARY_PROT],
  },
  breaker: {
    kind: 'breaker',
    name: 'Power Circuit Breaker',
    tag: 'CB',
    category: 'Protection',
    role: 'series',
    description:
      'Interrupts load and fault current when its protective relays operate. Needs DC control power and relays housed in the control house.',
    voltages: { min: 4, max: 230 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.rigidBusPhaseSpacingM, 1.5);
      const w = ceilTo(2.0 + 1.5 * vc.minMetalToMetalM, 0.5);
      const top = r1(vc.groundClearanceM + 1.8);
      return twoPort(w, d, top, top + 0.2);
    },
    props: [
      sel('medium', 'Interrupting medium', [['vacuum', 'Vacuum'], ['sf6', 'SF6 gas'], ['oil', 'Oil']], 'sf6'),
      sel('continuousA', 'Continuous current', [[1200, '1200 A'], [2000, '2000 A'], [3000, '3000 A']], 1200),
      sel('interruptingKA', 'Short-circuit rating', [[12.5, '12.5 kA'], [20, '20 kA'], [25, '25 kA'], [31.5, '31.5 kA'], [40, '40 kA']], 20),
      { key: 'relays', label: 'Protective relays', type: 'multi', options: [], default: [] },
      bool('normallyOpen', 'Normally open (tie)', false),
    ],
    cites: [{ page: 219, section: '5.3' }],
  },
  recloser: {
    kind: 'recloser',
    name: 'Automatic Circuit Recloser',
    tag: 'RCL',
    category: 'Protection',
    role: 'series',
    description:
      'Self-contained device that trips on overcurrent and recloses automatically, clearing temporary faults without a long outage.',
    voltages: { min: 4, max: 34.5 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.rigidBusPhaseSpacingM, 1.0);
      const top = r1(vc.groundClearanceM + 1.3);
      return twoPort(2, d, top, top + 0.3);
    },
    props: [
      sel('control', 'Control', [['electronic', 'Electronic'], ['hydraulic', 'Hydraulic']], 'electronic'),
      sel('interrupter', 'Interrupter', [['vacuum', 'Vacuum'], ['oil', 'Oil']], 'vacuum'),
      sel('continuousA', 'Continuous current', [[50, '50 A'], [100, '100 A'], [200, '200 A'], [280, '280 A'], [400, '400 A'], [560, '560 A'], [800, '800 A'], [1120, '1120 A']], 560, { hidden: true }),
      sel('interruptingKA', 'Interrupting rating', [[1.25, '1.25 kA'], [2, '2 kA'], [2.5, '2.5 kA'], [4, '4 kA'], [6, '6 kA'], [8, '8 kA'], [10, '10 kA'], [12, '12 kA'], [16, '16 kA']], 12, { hidden: true }),
      bool('reclosing', 'Reclosing enabled', true),
    ],
    cites: [{ page: 357, section: '5.9' }, CITE_LAYOUT_DIST],
  },
  transformer: {
    kind: 'transformer',
    name: 'Power Transformer',
    tag: 'T',
    category: 'Transformation',
    role: 'transformer',
    description:
      'Three-phase, two-winding power transformer. HV terminal on the left, LV on the right (before rotation).',
    voltages: { min: 34.5, max: 230 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const w = kv <= 69 ? 6 : kv <= 161 ? 7 : 8;
      const d = Math.max(5, phaseWidth(vc, vc.rigidBusPhaseSpacingM, 1.5));
      const top = r1(3.6 + 0.012 * kv);
      return twoPort(w, d, top, top + 0.3, ['hv', 'lv']);
    },
    props: [
      sel('kva', 'Self-cooled (OA) rating', [[3750, '3.75 MVA'], [5000, '5 MVA'], [7500, '7.5 MVA'], [10000, '10 MVA'], [12000, '12 MVA'], [15000, '15 MVA'], [20000, '20 MVA'], [25000, '25 MVA'], [30000, '30 MVA'], [37500, '37.5 MVA'], [50000, '50 MVA']], 10000),
      sel('cooling', 'Cooling stages', [['OA', 'OA (self-cooled)'], ['OA/FA', 'OA/FA (one fan stage)'], ['OA/FA/FA', 'OA/FA/FA (two fan stages)']], 'OA/FA'),
      bool('ltc', 'Load tap changer (LTC)', false, {
        help: 'Regulates bus voltage under load (bus regulation).',
        cite: CITE_REGULATION,
      }),
      sel('arresters', 'Tank-mounted surge arresters', [['none', 'None'], ['hv', 'HV side'], ['hv_lv', 'HV and LV sides']], 'hv_lv', {
        cite: CITE_ARRESTERS,
      }),
      sel('containment', 'Oil containment', [['none', 'None'], ['basic', 'Basic retention'], ['separator', 'Retention + oil separator']], 'none'),
      { key: 'relays', label: 'Protective relays', type: 'multi', options: [], default: [] },
    ],
    cites: [{ page: 191, section: '5.2' }, CITE_LAYOUT_DIST],
  },
  regulator: {
    kind: 'regulator',
    name: 'Voltage Regulators (3 × 1-phase)',
    tag: 'REG',
    category: 'Transformation',
    role: 'series',
    description: 'Bank of three single-phase step voltage regulators for bus or feeder regulation.',
    voltages: { min: 4, max: 34.5 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = Math.max(4, phaseWidth(vc, Math.max(1.2, vc.rigidBusPhaseSpacingM), 1.6));
      return twoPort(2.5, d, 4.0, 4.3);
    },
    props: [
      sel('ratedA', 'Rated current (at ±10%)', [[100, '100 A'], [150, '150 A'], [219, '219 A'], [328, '328 A'], [438, '438 A'], [548, '548 A'], [668, '668 A'], [875, '875 A'], [1093, '1093 A']], 328),
      sel('rangePct', 'Regulation range', [[10, '±10%'], [8.75, '±8.75%'], [7.5, '±7.5%'], [6.25, '±6.25%'], [5, '±5%']], 10),
      bool('bypass', 'Bypass switches', true, { cite: CITE_REGULATION }),
      bool('arresters', 'Tank-mounted arresters', true, { cite: CITE_ARRESTERS }),
    ],
    cites: [CITE_REGULATION, { page: 252, section: '5.5' }],
  },
  arrester: {
    kind: 'arrester',
    name: 'Surge Arrester Stand',
    tag: 'LA',
    category: 'Surge & Lightning',
    role: 'shunt',
    description: 'Discharges surge current to the ground grid, limiting overvoltages from lightning and switching.',
    voltages: { min: 4, max: 230 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.rigidBusPhaseSpacingM, 0.6);
      const h = busHeight(kv, 'low');
      return onePort(1, d, h, h + 0.4);
    },
    props: [
      sel('class', 'Arrester class', [['station', 'Station'], ['intermediate', 'Intermediate'], ['distribution', 'Distribution']], 'station'),
      sel(
        'mcovKV',
        'MCOV rating',
        [[0, 'Auto (minimum for the system, Eq. 5-7)'], ...TABLE_5_57_MOV_RATINGS.filter((r) => r.mcovKV <= 245).map((r): [number, string] => [r.mcovKV, `${r.mcovKV} kV MCOV (${r.dutyCycleKV} kV duty cycle)`])],
        0,
        { help: 'Maximum continuous operating voltage. Too low and the arrester fails at normal voltage; too high and it no longer protects the insulation (Table 5-57, §5.8.7).' },
      ),
    ],
    cites: [CITE_ARRESTERS, { page: 323, section: '5.8' }],
  },
  capacitor_bank: {
    kind: 'capacitor_bank',
    name: 'Shunt Capacitor Bank',
    tag: 'CAP',
    category: 'Transformation',
    role: 'shunt',
    description: 'Supplies reactive power to support voltage and improve power factor; may be switched in steps.',
    voltages: { min: 4, max: 69 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = Math.max(3, phaseWidth(vc, vc.rigidBusPhaseSpacingM, 1.5));
      return onePort(4, d, 5, 5.3);
    },
    props: [
      sel('kvar', 'Bank size', [[1200, '1200 kvar'], [1800, '1800 kvar'], [2400, '2400 kvar'], [3600, '3600 kvar'], [5400, '5400 kvar'], [7200, '7200 kvar']], 2400),
      sel('connection', 'Connection', [['grounded_wye', 'Grounded wye'], ['ungrounded_wye', 'Ungrounded wye']], 'ungrounded_wye'),
      bool('switched', 'Switched (automatic control)', true),
    ],
    cites: [{ page: 262, section: '5.6' }],
  },
  vt: {
    kind: 'vt',
    name: 'Voltage Transformers',
    tag: 'VT',
    category: 'Instrumentation',
    role: 'shunt',
    description: 'Steps bus voltage down to instrument levels for relays and meters.',
    voltages: { min: 4, max: 230 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.rigidBusPhaseSpacingM, 0.6);
      const h = busHeight(kv, 'low');
      return onePort(1, d, h, h + 0.3);
    },
    props: [sel('purpose', 'Purpose', [['relaying', 'Relaying'], ['metering', 'Metering'], ['both', 'Relaying + metering']], 'both')],
    cites: [{ page: 389, section: '5.10.7' }],
  },
  ccvt: {
    kind: 'ccvt',
    name: 'Coupling Capacitor VTs',
    tag: 'CCVT',
    category: 'Instrumentation',
    role: 'shunt',
    description: 'Provides relay voltage on transmission lines and couples power line carrier signals to the line.',
    voltages: { min: 69, max: 230 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.rigidBusPhaseSpacingM, 0.6);
      const h = busHeight(kv, 'low');
      return onePort(1, d, h, h + 0.6);
    },
    props: [bool('carrier', 'Carrier coupling', true)],
    cites: [{ page: 400, section: '5.11' }, { page: 127, section: '4.4.4' }],
  },
  wave_trap: {
    kind: 'wave_trap',
    name: 'Line Trap (Wave Trap)',
    tag: 'WT',
    category: 'Instrumentation',
    role: 'series',
    description: 'Blocks power line carrier signals from entering the station bus; installed in series with the line.',
    voltages: { min: 69, max: 230 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.rigidBusPhaseSpacingM, 0.6);
      const h = busHeight(kv, 'low');
      return twoPort(1.5, d, h + 1, h + 1.5);
    },
    props: [],
    cites: [{ page: 127, section: '4.4.4' }],
  },
  metering: {
    kind: 'metering',
    name: 'Metering Unit (CT/VT)',
    tag: 'MTR',
    category: 'Instrumentation',
    role: 'series',
    description: 'Combination current and voltage transformer set feeding revenue metering.',
    voltages: { min: 4, max: 138 },
    grounded: false,
    live: true,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = phaseWidth(vc, vc.rigidBusPhaseSpacingM, 0.6);
      const h = busHeight(kv, 'low');
      return twoPort(2, d, h, h + 0.5);
    },
    props: [],
    cites: [{ page: 398, section: '5.10.8' }],
  },
  station_service: {
    kind: 'station_service',
    name: 'Station Service Transformer',
    tag: 'SST',
    category: 'Auxiliary',
    role: 'shunt',
    description: 'Supplies the AC auxiliary system: battery charger, lighting, heaters, fans, outlets.',
    voltages: { min: 4, max: 34.5 },
    grounded: false,
    live: true,
    footprint(kv) {
      const h = busHeight(kv, 'low');
      return onePort(1.5, 2, h, h + 0.3);
    },
    props: [sel('kva', 'Rating', [[25, '25 kVA'], [50, '50 kVA'], [75, '75 kVA'], [100, '100 kVA'], [167, '167 kVA']], 50)],
    cites: [{ page: 673, section: '15.1' }],
  },
  mobile_pad: {
    kind: 'mobile_pad',
    name: 'Mobile Unit Connection Pad',
    tag: 'MOB',
    category: 'Transformation',
    role: 'pad',
    description:
      'Reserved space, access and connection points so a mobile transformer or mobile substation can be installed quickly if a transformer fails.',
    voltages: { min: 34.5, max: 161 },
    grounded: false,
    live: false,
    footprint(kv) {
      const vc = clearanceClassFor(kv);
      const d = Math.max(4, phaseWidth(vc, vc.rigidBusPhaseSpacingM, 1));
      return twoPort(14, d, 4.5, 4.5, ['hv', 'lv']);
    },
    props: [],
    cites: [{ page: 184, section: '4.13' }, { page: 122, section: '4.3.1' }],
  },
  control_house: {
    kind: 'control_house',
    name: 'Control House',
    tag: 'CH',
    category: 'Auxiliary',
    role: 'none',
    description: 'Houses relay and control panels, the station battery and charger, and communications equipment.',
    grounded: true,
    live: false,
    footprint(_kv, props) {
      const size = props.size as string;
      const [w, d] = size === 'large' ? [12, 8] : size === 'small' ? [6, 4] : [9, 6];
      return { w, d, ports: [], liveHeight: 0, height: 3.6 };
    },
    props: [
      sel('size', 'Size', [['small', 'Small (6 × 4 m)'], ['medium', 'Medium (9 × 6 m)'], ['large', 'Large (12 × 8 m)']], 'medium'),
      bool('battery', 'Station battery & charger (125 V DC)', true),
      bool('scada', 'SCADA / automation', false),
      sel('comms', 'Communications', [['none', 'None'], ['leased', 'Leased telephone line'], ['radio', 'Radio / MAS'], ['fiber', 'Optical fiber'], ['plc', 'Power line carrier']], 'none'),
    ],
    cites: [{ page: 689, section: '16' }],
  },
  mast: {
    kind: 'mast',
    name: 'Lightning Mast',
    tag: 'M',
    category: 'Surge & Lightning',
    role: 'none',
    description: 'Grounded steel mast that intercepts direct lightning strokes; its zone of protection shields nearby equipment.',
    grounded: true,
    live: false,
    footprint(_kv, props) {
      const h = Number(props.heightM) || 18;
      return { w: 1, d: 1, ports: [], liveHeight: 0, height: h };
    },
    props: [
      {
        key: 'heightM',
        label: 'Mast height',
        type: 'number',
        default: 18,
        min: 9,
        max: 30,
        step: 0.5,
        unit: 'm',
        cite: CITE_SHIELDING,
      },
    ],
    cites: [CITE_SHIELDING],
  },
};

export const ALL_KINDS = Object.keys(CATALOG) as ItemKind[];

export function defaultProps(kind: ItemKind): Props {
  const p: Props = {};
  for (const def of CATALOG[kind].props) p[def.key] = Array.isArray(def.default) ? [...def.default] : def.default;
  return p;
}

/**
 * Conductor sizes for rigid bus. The bulletin gives no ampacity tables; its only
 * figure is 1890 A for 3 in Schedule 40 6063-T6 aluminum pipe (§4.11.3). The
 * other ampacities are GAME ESTIMATES scaled from that value.
 */
export interface ConductorSize {
  key: string;
  label: string;
  ampacityA: number;
  cite?: Citation;
}

const PIPE_3IN_AMPS: Citation = { page: 171, section: '4.11.3.1', note: '1890 A for 3 in Sch 40 6063-T6 pipe — the only ampacity value in the bulletin.' };

export const CONDUCTOR_SIZES: ConductorSize[] = [
  { key: 'pipe1.5', label: '1-1/2 in. Sch 40 aluminum pipe', ampacityA: 900 },
  { key: 'pipe2', label: '2 in. Sch 40 aluminum pipe', ampacityA: 1150 },
  { key: 'pipe2.5', label: '2-1/2 in. Sch 40 aluminum pipe', ampacityA: 1550 },
  { key: 'pipe3', label: '3 in. Sch 40 aluminum pipe', ampacityA: 1890, cite: PIPE_3IN_AMPS },
  { key: 'pipe4', label: '4 in. Sch 40 aluminum pipe', ampacityA: 2500 },
];

export const DEFAULT_CONDUCTOR = 'pipe2';
