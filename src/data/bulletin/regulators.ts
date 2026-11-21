/**
 * Substation voltage regulator data from RUS Bulletin 1724E-300 §5.5 (pp. 252-262), plus the
 * regulator bypass and arrester notes in §4.3.3/§4.3.5 (pp. 122-124).
 *
 * Covers: regulator types, the kVA-rating formula (with its worked example), range of regulation
 * vs current (Tables 5-28/5-29), preferred ratings (Tables 5-30/5-31), temperature (Table 5-32),
 * altitude (Tables 5-33/5-34), short-circuit strength, controls and lightning protection.
 * Tables are from ANSI/IEEE C57.15 / C57.95 as reproduced in the bulletin; guidance is paraphrased.
 */
import type { Citation, Guidance, Sourced } from './types';

// ---------------------------------------------------------------------------
// Types and selection
// ---------------------------------------------------------------------------

export const REGULATOR_TYPE_GUIDANCE: readonly Guidance[] = [
  {
    id: 'reg-purpose',
    text: 'Substation regulators correct supply-voltage swings and, with proper settings and line-drop compensation, load-driven swings too, keeping customer voltage within limits.',
    cite: { page: 252, section: '5.5.1' },
    tags: ['regulator'],
  },
  {
    id: 'reg-bus-vs-feeder',
    text: 'Normally the low-voltage bus is regulated; individual feeder regulators are justified only when feeder peaks differ greatly. Very long or heavily loaded feeders may also need line regulators.',
    cite: { page: [122, 252], section: '4.3.3, 5.5.1', figure: '4-3' },
    tags: ['regulator', 'layout', 'bus-scheme'],
  },
  {
    id: 'reg-step-type',
    text: 'The step-voltage regulator (an autotransformer with a built-in load tap changer and reversing switch) has virtually replaced the induction regulator because it is cheaper and equally reliable.',
    cite: { page: 253, section: '5.5.2, 5.5.2.1' },
    tags: ['regulator'],
  },
  {
    id: 'reg-terminals',
    text: 'Step-regulator terminals are S (source), L (load) and SL (common); three-phase units are marked S1-S3, L1-L3 and S0L0.',
    cite: { page: 253, section: '5.5.2.1', originalSource: 'ANSI C57.15; RUS Bulletin 1724D-114, Fig. 3' },
    tags: ['regulator', 'connections'],
  },
  {
    id: 'reg-single-phase-preferred',
    text: 'For typical rural substation sizes, three single-phase regulators are usually cheaper, hold phase voltages balanced under unbalanced load, and can be removed one at a time for maintenance.',
    cite: { page: [253, 254], section: '5.5.2.2', figure: '5-11' },
    tags: ['regulator', 'selection'],
  },
  {
    id: 'reg-bypass-switches',
    text: 'Always provide special bypass switches so a regulator can be removed without interrupting the circuit; combined bypass switches perform the steps in the right order and fit in the space of one single-pole disconnect.',
    cite: { page: [123, 254], section: '4.3.3, 5.5.2.2', figure: '4-3' },
    tags: ['regulator', 'bypass', 'switch', 'design-check'],
  },
  {
    id: 'reg-three-phase',
    text: 'Three-phase regulators may be chosen in large substations on cost or availability; they need somewhat less space, but that is rarely decisive.',
    cite: { page: 254, section: '5.5.2.2', figure: '5-12' },
    tags: ['regulator', 'selection'],
  },
  {
    id: 'reg-ltc-alternative',
    text: 'An LTC transformer is essentially a three-phase regulator built into the transformer and saves space, buswork and structures; like three-phase regulators it senses one phase, so its correction is less precise.',
    cite: { page: 254, section: '5.5.2.2' },
    tags: ['regulator', 'LTC', 'transformer', 'selection'],
  },
  {
    id: 'reg-no-spare',
    text: 'A spare regulator at each substation is normally not justified.',
    cite: { page: 254, section: '5.5.2.2' },
    tags: ['regulator', 'cost'],
  },
  {
    id: 'reg-specs',
    text: 'Regulators on RUS-financed systems must meet RUS Bulletin 50-90 (S-2) and should comply with ANSI C57.15 and C57.95.',
    cite: { page: 253, section: '5.5.1' },
    tags: ['regulator', 'specification'],
  },
];

// ---------------------------------------------------------------------------
// kVA rating and regulation range
// ---------------------------------------------------------------------------

/**
 * §5.5.3.1: regulator kVA = rated load amperes × range of regulation in kV (× 1.732 for three-phase).
 * `ratedKV` is the regulator's rated voltage: line-to-neutral for single-phase units on a wye system
 * (e.g. 7.62 kV), line-to-line for three-phase units (consistent with Table 5-31). If raise and lower
 * ranges differ, use the larger. Prefer the tabulated kVA/amp pairs (Tables 5-30/5-31) where they exist;
 * see their notes for the voltage each class implies.
 */
export function regulatorKva(ratedKV: number, rangePct: number, ratedAmps: number, phases: 1 | 3): number {
  return (phases === 3 ? 1.732 : 1) * ratedKV * (rangePct / 100) * ratedAmps;
}

/** §5.5.3.1 worked example: 10 %, 7620 V, single-phase, 100 A. */
export const REGULATOR_KVA_EXAMPLE = {
  cite: { page: 254, section: '5.5.3.1' } satisfies Citation,
  inputs: { ratedKV: 7.62, rangePct: 10, ratedAmps: 100, phases: 1 as const },
  resultKVA: 76.2,
};

export const REGULATION_RANGE_STANDARD: Sourced<{
  /** Specified range of regulation, ± percent. */
  rangePct: number;
  /** Number of steps over the full raise-to-lower range (most regulators). */
  steps: number;
  /** Size of each step, percent. */
  stepPct: number;
  /** Maximum bandwidth to specify, ± volts on a 120 V base. */
  maxBandwidthVoltsOn120: number;
}> = {
  value: { rangePct: 10, steps: 32, stepPct: 0.625, maxBandwidthVoltsOn120: 1 },
  cite: {
    page: 257,
    section: '5.5.3.2',
    note: '"Thirty-two 5/8 percent steps" = 16 raise + 16 lower steps (derived). On a 120 V base one step is 0.75 V (derived).',
  },
};

export interface RangeCurrentRow {
  /** Range of voltage regulation, ± percent. */
  rangePct: number;
  /** Allowed current as percent of rated current. */
  currentPctOfRated: number;
}

/** Table 5-28: range of regulation vs rated current, single-phase step regulators rated 19.9 kV and below. */
export const TABLE_5_28_SINGLE_PHASE_RANGE_CURRENT: Sourced<{ rows: readonly RangeCurrentRow[]; maxCurrentA: number }> = {
  value: {
    rows: [
      { rangePct: 10, currentPctOfRated: 100 },
      { rangePct: 8.75, currentPctOfRated: 110 },
      { rangePct: 7.5, currentPctOfRated: 120 },
      { rangePct: 6.25, currentPctOfRated: 135 },
      { rangePct: 5.0, currentPctOfRated: 160 },
    ],
    maxCurrentA: 668,
  },
  cite: { page: 257, section: '5.5.3.1', table: '5-28', originalSource: 'ANSI/IEEE Std. C57.15-1986, Section 5.4' },
};

/** Table 5-29: range of regulation vs rated current, three-phase step regulators rated 13.8 kV and below. */
export const TABLE_5_29_THREE_PHASE_RANGE_CURRENT: Sourced<{ rows: readonly RangeCurrentRow[]; maxCurrentA: number }> = {
  value: {
    rows: [
      { rangePct: 10, currentPctOfRated: 100 },
      { rangePct: 8.75, currentPctOfRated: 108 },
      { rangePct: 7.5, currentPctOfRated: 115 },
      { rangePct: 6.25, currentPctOfRated: 120 },
      { rangePct: 6.0, currentPctOfRated: 130 },
    ],
    maxCurrentA: 600,
  },
  cite: {
    page: 257,
    section: '5.5.3.1',
    table: '5-29',
    originalSource: 'ANSI/IEEE Std. C57.15-1986, Section 5.4',
    note:
      'UNCERTAIN: the last row is printed as ±6.00 %. The pattern (and the single-phase table, which ends at ±5.00 %) suggests ±5.00 % was intended; the text only discusses the 5 % case for single-phase units.',
  },
};

/**
 * Current capability (A) of a step regulator when its range of regulation is reduced (Tables 5-28/5-29).
 * Uses the smallest tabulated range at or above `rangePct`, i.e. no interpolation; result capped at the table's maximum current.
 */
export function regulatorCurrentCapabilityA(ratedA: number, rangePct: number, phases: 1 | 3): number {
  const t = phases === 1 ? TABLE_5_28_SINGLE_PHASE_RANGE_CURRENT.value : TABLE_5_29_THREE_PHASE_RANGE_CURRENT.value;
  const sorted = [...t.rows].sort((a, b) => a.rangePct - b.rangePct);
  const row = sorted.find((x) => x.rangePct >= rangePct) ?? sorted[sorted.length - 1];
  return Math.min((ratedA * row.currentPctOfRated) / 100, t.maxCurrentA);
}

// ---------------------------------------------------------------------------
// Preferred ratings (Tables 5-30, 5-31)
// ---------------------------------------------------------------------------

export interface SinglePhaseRegulatorRating {
  nominalSystem: string;
  bilKV: number;
  kva: number;
  lineAmps: number;
}

const sp = (nominalSystem: string, bilKV: number, pairs: readonly (readonly [number, number])[]): SinglePhaseRegulatorRating[] =>
  pairs.map(([kva, lineAmps]) => ({ nominalSystem, bilKV, kva, lineAmps }));

/** Table 5-30: preferred ratings, oil-immersed step-voltage regulators, single-phase (±10 %). */
export const TABLE_5_30_SINGLE_PHASE_RATINGS: Sourced<readonly SinglePhaseRegulatorRating[]> = {
  value: [
    ...sp('2400/4160Y', 60, [[50, 200], [75, 300], [100, 400], [125, 500], [167, 668], [250, 1000], [333, 1332]]),
    ...sp('4800/8320Y', 75, [[50, 100], [75, 150], [100, 200], [125, 250], [167, 334], [250, 500], [333, 668]]),
    ...sp('7620-13 200Y', 95, [
      [38.1, 50], [57.2, 75], [76.2, 100], [114.3, 150], [167, 219], [250, 328], [333, 438], [416, 546], [509, 668], [667, 875], [833, 1093],
    ]),
    ...sp('13 800', 95, [[69, 50], [138, 100], [207, 150], [276, 200], [414, 300], [552, 400]]),
    ...sp('14 400/24 940Y', 150, [[72, 50], [144, 100], [216, 150], [288, 200], [333, 231], [432, 300], [576, 400], [667, 463], [833, 578]]),
    ...sp('19 920-34 500Y', 150, [[100, 50], [200, 100], [333, 167], [400, 201], [667, 334], [833, 418]]),
  ],
  cite: {
    page: 258,
    section: '5.5.3.2, 5.5.3.3',
    table: '5-30',
    originalSource: 'ANSI/IEEE Std. C57.15-1986, Table 3',
    note:
      '150 kV BIL rows: low-frequency test voltage 50 kV by induced test with neutral grounded. ' +
      'The kVA/amp pairs satisfy kVA = kV × 10 % × A using 2.5 kV and 5.0 kV for the 2400/4160Y and 4800/8320Y classes (regulator voltages not stated in the bulletin) and the line-to-neutral system voltage for the others.',
  },
};

export interface ThreePhaseRegulatorRating {
  nominalSystem: string;
  bilKV: number;
  selfCooledKVA: number;
  selfCooledAmps: number;
  forcedCooledKVA: number;
  forcedCooledAmps: number;
}

const tp = (nominalSystem: string, bilKV: number, rows: readonly (readonly [number, number, number, number])[]): ThreePhaseRegulatorRating[] =>
  rows.map(([selfCooledKVA, selfCooledAmps, forcedCooledKVA, forcedCooledAmps]) => ({
    nominalSystem,
    bilKV,
    selfCooledKVA,
    selfCooledAmps,
    forcedCooledKVA,
    forcedCooledAmps,
  }));

/** Table 5-31: preferred ratings, oil-immersed step-voltage regulators, three-phase (±10 %). */
export const TABLE_5_31_THREE_PHASE_RATINGS: Sourced<readonly ThreePhaseRegulatorRating[]> = {
  value: [
    ...tp('2400', 45, [[500, 1155, 625, 1443], [750, 1732, 937, 2165], [1000, 2309, 1250, 2887]]),
    ...tp('2400/4160Y', 60, [[500, 667, 625, 833], [750, 1000, 967, 1250], [1000, 1334, 1250, 1667]]),
    ...tp('4800', 60, [[500, 577, 625, 721], [750, 866, 937, 1082], [1000, 1155, 1250, 1443]]),
    ...tp('7620/13 200', 95, [[500, 219, 625, 274], [750, 328, 938, 410], [1000, 437, 1250, 546], [1500, 656, 2000, 874], [2000, 874, 2667, 1166]]),
    ...tp('7970/13 800Y', 95, [
      [500, 209, 625, 261], [750, 313, 937, 391], [1000, 418, 1250, 523], [1500, 628, 2000, 837], [2000, 837, 2667, 1116], [2500, 1046, 3333, 1394],
    ]),
    ...tp('14 400/24 940Y', 150, [
      [500, 125.5, 625, 156.8], [750, 188.3, 937, 235.4], [1000, 251, 1250, 314], [1500, 377, 2000, 502], [2000, 502, 2667, 669], [2500, 628, 3333, 837],
    ]),
    ...tp('19 920/34 500Y', 150, [
      [500, 83.7, 625, 104.6], [750, 125.5, 937, 156.8], [1000, 167, 1250, 209], [1500, 251, 2000, 335], [2000, 335, 2667, 447], [2500, 418, 3333, 557],
    ]),
    ...tp('26 560/46 000Y', 250, [
      [500, 62.8, 625, 78.5], [750, 94.1, 937, 117.6], [1000, 126, 1250, 157], [1500, 188, 2000, 251], [2000, 251, 2667, 335], [2500, 314, 3333, 419],
    ]),
    ...tp('39 840-69 000Y', 350, [
      [500, 41.8, 625, 52.5], [750, 62.8, 937, 78.5], [1000, 83.7, 1250, 105], [1500, 126, 2000, 167], [2000, 167, 2667, 223], [2500, 209, 3333, 278],
    ]),
  ],
  cite: {
    page: 259,
    section: '5.5.3.2, 5.5.3.3',
    table: '5-31',
    originalSource: 'ANSI/IEEE Std. C57.15-1986, Table 4',
    note:
      'UNCERTAIN: the 2400/4160Y, 750 kVA forced-cooled value is printed 967 kVA (every other 750 kVA row shows 937 or 938 kVA, i.e. 1.25 × 750); likely a misprint for 937. ' +
      'UNCERTAIN: the 14 400/24 940Y line currents (125.5 A at 500 kVA, etc.) fit kVA = 1.732 × 23 kV × 10 % × A rather than 24.94 kV (which would give 115.7 A); kept as printed. ' +
      'Other rows fit 1.732 × kV(line-to-line) × 10 % × A, with 4.33 kV (2.5 × 1.732) for the 2400/4160Y class and 2.5 / 5.0 kV for the 2400 / 4800 V delta classes.',
  },
};

// ---------------------------------------------------------------------------
// Temperature, altitude, short-circuit
// ---------------------------------------------------------------------------

export const REGULATOR_AMBIENT_BASIS: Sourced<{ maxAmbientC: number; max24hAverageC: number }> = {
  value: { maxAmbientC: 40, max24hAverageC: 30 },
  cite: { page: 257, section: '5.5.3.4', note: 'Loading under other conditions: ANSI C57.95.' },
};

export interface TemperatureRiseRow {
  apparatus: string;
  /** Average winding rise by resistance, °C. */
  windingRiseC: number;
  /** Hottest-spot winding rise, °C. */
  hottestSpotRiseC: number;
}

/** Table 5-32: limits of temperature rise. */
export const TABLE_5_32_TEMPERATURE_RISE: Sourced<{
  rows: readonly TemperatureRiseRow[];
  /** Max oil rise near the surface with sealed, conservator, gas-oil-seal or inert-gas systems, °C. */
  oilRiseWithPreservationC: number;
  /** Max oil rise near the exposed surface without those systems, °C. */
  oilRiseWithoutPreservationC: number;
}> = {
  value: {
    rows: [
      { apparatus: '55 °C rise liquid-immersed', windingRiseC: 55, hottestSpotRiseC: 65 },
      { apparatus: '55 °C rise dry-type (induction regulators)', windingRiseC: 55, hottestSpotRiseC: 65 },
      { apparatus: '80 °C rise dry-type (induction regulators)', windingRiseC: 80, hottestSpotRiseC: 110 },
      { apparatus: '150 °C rise dry-type (induction regulators)', windingRiseC: 150, hottestSpotRiseC: 180 },
    ],
    oilRiseWithPreservationC: 55,
    oilRiseWithoutPreservationC: 50,
  },
  cite: { page: 260, section: '5.5.3.4', table: '5-32', originalSource: 'ANSI/IEEE Std. C57.15-1986, Table 2' },
};

export interface DielectricAltitudeRow {
  altitudeFt: number;
  altitudeM: number;
  factor: number;
}

/** Table 5-33: dielectric strength correction factors above 3300 ft (1000 m). 15,000 ft is the maximum for standard regulators. */
export const TABLE_5_33_REGULATOR_DIELECTRIC_ALTITUDE: Sourced<readonly DielectricAltitudeRow[]> = {
  value: [
    { altitudeFt: 3300, altitudeM: 1000, factor: 1.0 },
    { altitudeFt: 4000, altitudeM: 1200, factor: 0.98 },
    { altitudeFt: 5000, altitudeM: 1500, factor: 0.95 },
    { altitudeFt: 6000, altitudeM: 1800, factor: 0.92 },
    { altitudeFt: 7000, altitudeM: 2100, factor: 0.89 },
    { altitudeFt: 8000, altitudeM: 2400, factor: 0.86 },
    { altitudeFt: 9000, altitudeM: 2700, factor: 0.83 },
    { altitudeFt: 10000, altitudeM: 3000, factor: 0.8 },
    { altitudeFt: 12000, altitudeM: 3600, factor: 0.75 },
    { altitudeFt: 14000, altitudeM: 4200, factor: 0.7 },
    { altitudeFt: 15000, altitudeM: 4500, factor: 0.67 },
  ],
  cite: {
    page: 260,
    section: '5.5.3.5',
    table: '5-33',
    originalSource: 'ANSI/IEEE Std. C57.15-1986, Table 1',
    note: 'Ratings assume ≤1000 m (3300 ft); higher altitude worsens both temperature rise and dielectric strength. 15,000 ft (4500 m) is the maximum for standard regulators.',
  },
};

/** Table 5-34: loading reduction for altitudes above 1000 m (3300 ft), percent per 100 m. */
export const TABLE_5_34_REGULATOR_LOADING_ALTITUDE: Sourced<{ selfCooledPctPer100m: number; forcedAirPctPer100m: number }> = {
  value: { selfCooledPctPer100m: 0.4, forcedAirPctPer100m: 0.5 },
  cite: {
    page: 261,
    section: '5.5.3.5',
    table: '5-34',
    originalSource: 'ANSI/IEEE Std. C57.95-1984, Table 2',
    note: 'A stray fragment under the table reads "1000 m (3300 ft), with an ambient temperature of 30 °C", apparently the basis of the rating. Insulation capability at altitude: C57.15 §4.3.2.',
  },
};

/** Loading multiplier at altitude from Table 5-34 (1.0 at or below 1000 m). */
export function regulatorAltitudeLoadFactor(altitudeM: number, forcedAir: boolean): number {
  if (altitudeM <= 1000) return 1;
  const t = TABLE_5_34_REGULATOR_LOADING_ALTITUDE.value;
  const pct = forcedAir ? t.forcedAirPctPer100m : t.selfCooledPctPer100m;
  return 1 - ((altitudeM - 1000) / 100) * (pct / 100);
}

/** §5.5.3.6: required short-circuit withstand, multiples of regulator full-load current (rms symmetrical). */
export const REGULATOR_SHORT_CIRCUIT_STRENGTH: Sourced<readonly { timesFullLoad: number; seconds: number }[]> = {
  value: [
    { timesFullLoad: 25, seconds: 2 },
    { timesFullLoad: 40, seconds: 0.8 },
  ],
  cite: {
    page: 261,
    section: '5.5.3.6',
    note: 'Where fault duty exceeds this, current-limiting reactors may be installed to reduce the available fault current.',
  },
};

/** True if the regulator withstands `faultA` for `seconds` per §5.5.3.6 (only the two stated points are checked). */
export function regulatorWithstandsFault(fullLoadA: number, faultA: number, seconds: number): boolean {
  const pts = REGULATOR_SHORT_CIRCUIT_STRENGTH.value;
  return pts.some((p) => faultA <= p.timesFullLoad * fullLoadA && seconds <= p.seconds);
}

// ---------------------------------------------------------------------------
// Controls and lightning protection
// ---------------------------------------------------------------------------

/** Adjustable control functions named in §5.5.4.1 (settings themselves are in RUS Bulletin 1724D-114, not this bulletin). */
export const REGULATOR_CONTROL_SETTINGS: Sourced<readonly string[]> = {
  value: ['Voltage level', 'Bandwidth', 'Time delay', 'Range of regulation', 'Line drop compensation'],
  cite: {
    page: 261,
    section: '5.5.4.1',
    note: 'Range of regulation is set at the position indicator on the regulator; the others at the control panel. The only numeric control value in this bulletin is bandwidth ≤ ±1 V on a 120 V base (§5.5.3.2).',
  },
};

export const REGULATOR_CONTROL_GUIDANCE: readonly Guidance[] = [
  {
    id: 'reg-control-interaction',
    text: 'Voltage level, bandwidth, time delay, range and line-drop compensation interact, so they are treated as one control system; changing one affects the others.',
    cite: { page: 261, section: '5.5.4.1' },
    tags: ['regulator', 'control'],
  },
  {
    id: 'reg-control-static',
    text: 'Regulators built since about 1963 use solid-state or microprocessor controls, which may add metering, harmonic analysis, event logs and communications.',
    cite: { page: 261, section: '5.5.4.1' },
    tags: ['regulator', 'control'],
  },
  {
    id: 'reg-control-accuracy',
    text: 'Regulator controls meet Class I accuracy (control-circuit errors total no more than ±1 %), so the voltmeters used with them should be just as accurate.',
    cite: { page: [261, 262], section: '5.5.4.2' },
    tags: ['regulator', 'control', 'metering'],
  },
  {
    id: 'reg-bypass-arrester',
    text: 'Regulators come with bypass arresters across the series winding, but these protect only that winding; the regulator still needs its own surge arresters.',
    cite: { page: 262, section: '5.5.5' },
    tags: ['regulator', 'arrester', 'design-check'],
  },
  {
    id: 'reg-arresters-on-tank',
    text: 'For regulators, surge arresters are normally mounted directly on the regulator tank.',
    cite: { page: 124, section: '4.3.5' },
    tags: ['regulator', 'arrester', 'layout'],
  },
  {
    id: 'reg-overload-by-range',
    text: 'If a circuit needs only about 5 % regulation, a single-phase regulator can carry up to 160 % of rated current (Table 5-28).',
    cite: { page: 257, section: '5.5.3.1', table: '5-28, 5-29' },
    tags: ['regulator', 'rating'],
  },
];
