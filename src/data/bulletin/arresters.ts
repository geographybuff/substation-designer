/**
 * Surge arrester data from RUS Bulletin 1724E-300 §5.8 "Surge Arresters" (pp. 323-357): classes and where
 * each applies, silicon-carbide vs metal-oxide, standard ratings (Tables 5-52, 5-53, 5-57, 5-58), grounding
 * coefficient, MOV selection (Eq 5-7..5-9), protective margins, location and separation distance
 * (Figs 5-43..5-45, digitized), and line-entrance protection.
 *
 * The bulletin prefers and recommends metal-oxide (MOV) arresters (§5.8.1). Voltages are kV rms unless noted.
 */
import type { Citation, Guidance } from './types';

export const ARRESTER_CITES = {
  general: { page: 323, section: '5.8.1' },
  classes: { page: [324, 332], section: '5.8.2' },
  definitions: { page: [332, 333], section: '5.8.3' },
  systemVoltage: { page: 333, section: '5.8.4' },
  grounding: { page: [333, 334], section: '5.8.5', originalSource: 'ANSI/IEEE C62.92' },
  sicGuide: { page: [334, 342], section: '5.8.6', originalSource: 'IEEE C62.1; ANSI/IEEE C62.2' },
  movGuide: { page: [342, 352], section: '5.8.7', originalSource: 'IEEE C62.11; IEEE C62.22' },
  location: { page: [352, 356], section: '5.8.8', originalSource: 'AIEE Transactions Paper 63-229 (application curves)' },
  lineEntrance: { page: [356, 357], section: '5.8.9' },
} as const satisfies Record<string, Citation>;

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export type ArresterClass = 'station' | 'intermediate' | 'distribution';

export interface ArresterClassInfo {
  id: ArresterClass;
  summary: string;
  useWhere: readonly string[];
  numbers: Readonly<Record<string, number | readonly [number, number]>>;
  cite: Citation;
}

/** §5.8.2.1-5.8.2.3 (p. 332). Relative protection and initial cost, in descending order: station, intermediate, distribution. */
export const ARRESTER_CLASSES: readonly ArresterClassInfo[] = [
  {
    id: 'station',
    summary: 'Most rugged class: greater surge discharge ability, lower IR (discharge) voltage, and best ability to vent safely on high short-circuit current.',
    useWhere: [
      'All substations of 10,000 kVA and above, and smaller substations of prime importance.',
      'Transmission circuits longer than approximately 100 miles, or where shunt capacitor banks are installed.',
      'Substations with reduced insulation (BIL) or in high lightning exposure areas.',
      'Where system short-circuit current exceeds the venting capability of intermediate-class arresters.',
      'Systems above 150 kV (the only class available there).',
    ],
    numbers: { substationKVAAtOrAbove: 10000, longLineMiles: 100, onlyClassAboveKV: 150 },
    cite: { page: 332, section: '5.8.2.1' },
  },
  {
    id: 'intermediate',
    summary: 'Cheaper than station class with higher sparkover and IR levels that are usually adequate for small substations.',
    useWhere: ['Substations rated below 10,000 kVA, at a cost saving compared with station class.'],
    numbers: { substationKVABelow: 10000, safeVentingMaxA: 16000, ratingRangeKV: [3, 120] },
    cite: { page: 332, section: '5.8.2.2' },
  },
  {
    id: 'distribution',
    summary: 'Least protective class; may be used on the low-voltage side of distribution substations.',
    useWhere: [
      'Low-voltage side of distribution substations, on the load side of feeder overcurrent devices (reclosers or breakers).',
      'Frequently connected to the low-voltage bushings of small distribution substation transformers.',
      'In substations use only the direct-connected type with a ground lead disconnector (isolator).',
    ],
    numbers: {},
    cite: { page: 332, section: '5.8.2.3' },
  },
];

export const ARRESTER_GENERAL_GUIDANCE: readonly Guidance[] = [
  { id: 'arr-mov-preferred', text: 'Metal-oxide arresters are preferred and recommended over silicon-carbide valve arresters because of their better protective characteristics.', cite: { page: 323, section: '5.8.1' }, tags: ['arrester', 'design-check'] },
  { id: 'arr-function', text: 'An arrester sets a ceiling on transient overvoltage: it conducts surge energy to ground and then reseals against power-follow current, so it must be matched to the system operating voltage.', cite: { page: 323, section: '5.8.1' }, tags: ['arrester'] },
  { id: 'arr-choice', text: 'Choose the class from the protection needed, the importance of the equipment, the reliability wanted and overall cost; all three classes may be used in substations.', cite: { page: [324, 332], section: '5.8.2' }, tags: ['arrester'] },
  { id: 'arr-ip202', text: 'RUS IP 202-1 lists the surge arresters acceptable for cooperative substations.', cite: { page: 332, section: '5.8.2' }, tags: ['arrester'] },
];

/** §5.8.7.1 (pp. 342-343): metal-oxide construction categories (Figs 5-36..5-38). */
export const MOV_TYPES = [
  { id: 'gapless', text: 'Stack(s) of metal-oxide disks connected line to ground with no gap; strongly non-linear above MCOV, so only its own impedance limits leakage current.', cite: { page: 342, section: '5.8.7.1.1', figure: '5-36' } },
  { id: 'shunt-gapped', text: 'Part of the disk stack is bridged by shunt gaps that spark over at several hundred amperes, lowering the discharge voltage; the gaps clear as current falls.', cite: { page: [342, 343], section: '5.8.7.1.2', figure: '5-37' } },
  { id: 'series-gapped', text: 'Fewer disks in series with a gap impedance network; once the gap sparks over, the arrester voltage drops to that of the disks alone.', cite: { page: 343, section: '5.8.7.1.3', figure: '5-38' } },
] as const;

export const SIC_VS_MOV: readonly Guidance[] = [
  { id: 'zno-valve', text: 'Metal-oxide arresters use zinc-oxide valves with a far more non-linear voltage-current curve (like a zener diode), so they can be built without gaps and have no sparkover; discharge voltages are typically lower.', cite: { page: 342, section: '5.8.7' }, tags: ['arrester'] },
  { id: 'mov-rating-basis', text: 'Silicon-carbide arresters are rated by duty-cycle voltage; metal-oxide arresters carry both a duty-cycle rating and an MCOV rating and are applied primarily on MCOV.', cite: { page: [332, 344], section: '5.8.3.1; 5.8.7.3.1', table: '5-57' }, tags: ['arrester'] },
  { id: 'mov-fow', text: 'Because a metal-oxide arrester has no sparkover, its 0.5 µs front-of-wave discharge voltage is used where a sparkover value would be used for silicon carbide.', cite: { page: 346, section: '5.8.7.6' }, tags: ['arrester'] },
];

// ---------------------------------------------------------------------------
// Ratings tables
// ---------------------------------------------------------------------------

/** Table 5-52 (p. 325): arrester voltage ratings, kV rms, by class (IEEE C62.1-1989 Table 1). */
export const TABLE_5_52_VOLTAGE_RATINGS = {
  secondary: [0.175, 0.65] as const,
  distribution: [1, 3, 9, 10, 12, 15, 18, 21, 25, 27, 30] as const,
  intermediate: [3, 9, 12, 15, 21, 24, 30, 36, 39, 48, 60, 72, 90, 96, 108, 120] as const,
  station: [3, 9, 12, 15, 21, 24, 30, 36, 39, 48, 60, 72, 90, 96, 108, 120, 144, 168, 180, 192, 240, 258, 276, 294, 312, 372, 420, 444, 468, 492, 540, 576, 612, 648, 684] as const,
  rotatingMachineRatings: [4.5, 7.5, 16.5, 18, 19.5, 22.5, 24, 25.5, 27] as const,
  cite: {
    page: 325,
    section: '5.8.2',
    table: '5-52',
    originalSource: 'IEEE C62.1-1989, Table 1',
    note: 'Silicon-carbide (gapped) ratings. Ratings of 4.5-27 kV listed in `rotatingMachineRatings` are recognized (all classes) for rotating-machine protection.',
  } satisfies Citation,
} as const;

/** Table 5-53 (p. 326): pressure-relief test currents, symmetrical rms amperes. */
export const TABLE_5_53_PRESSURE_RELIEF = {
  rows: [
    { class: 'station' as const, ratingsKV: [3, 15] as const, highCurrentA: [65000, 25000] as const, lowCurrentA: '600±200' },
    { class: 'station' as const, ratingsKV: [21, 684] as const, highCurrentA: [40000, 25000] as const, lowCurrentA: '600±200' },
    { class: 'intermediate' as const, ratingsKV: [3, 120] as const, highCurrentA: [16100] as const, lowCurrentA: '600±200' },
  ],
  cite: {
    page: 326,
    section: '5.8.2',
    table: '5-53',
    originalSource: 'IEEE C62.1-1989, Table 5',
    note: 'High-current test values are alternatives ("65000 or 25000"). Above 40 kA, ratings of 45, 55 or 60 kA are used. Porcelain-top values not standardized for the 3-15 kV station and intermediate rows.',
  } satisfies Citation,
} as const;

export interface MovRating {
  dutyCycleKV: number;
  mcovKV: number;
}

/** Table 5-57 (p. 330): metal-oxide arrester duty-cycle ratings and MCOV, kV rms (IEEE C62.11-1993 Table 1). */
export const TABLE_5_57_MOV_RATINGS: readonly MovRating[] = [
  { dutyCycleKV: 3, mcovKV: 2.55 }, { dutyCycleKV: 6, mcovKV: 5.1 }, { dutyCycleKV: 9, mcovKV: 7.65 }, { dutyCycleKV: 10, mcovKV: 8.4 },
  { dutyCycleKV: 12, mcovKV: 10.2 }, { dutyCycleKV: 15, mcovKV: 12.7 }, { dutyCycleKV: 18, mcovKV: 15.3 }, { dutyCycleKV: 21, mcovKV: 17.0 },
  { dutyCycleKV: 24, mcovKV: 19.5 }, { dutyCycleKV: 27, mcovKV: 22.0 }, { dutyCycleKV: 30, mcovKV: 24.4 }, { dutyCycleKV: 36, mcovKV: 29.0 },
  { dutyCycleKV: 39, mcovKV: 31.5 }, { dutyCycleKV: 45, mcovKV: 36.5 }, { dutyCycleKV: 48, mcovKV: 39.0 }, { dutyCycleKV: 54, mcovKV: 42.0 },
  { dutyCycleKV: 60, mcovKV: 48.0 }, { dutyCycleKV: 72, mcovKV: 57.0 }, { dutyCycleKV: 90, mcovKV: 70.0 }, { dutyCycleKV: 96, mcovKV: 76.0 },
  { dutyCycleKV: 108, mcovKV: 84.0 }, { dutyCycleKV: 120, mcovKV: 98.0 }, { dutyCycleKV: 132, mcovKV: 106 }, { dutyCycleKV: 144, mcovKV: 115 },
  { dutyCycleKV: 168, mcovKV: 131 }, { dutyCycleKV: 172, mcovKV: 140 }, { dutyCycleKV: 180, mcovKV: 144 }, { dutyCycleKV: 192, mcovKV: 152 },
  { dutyCycleKV: 228, mcovKV: 180 }, { dutyCycleKV: 240, mcovKV: 190 }, { dutyCycleKV: 258, mcovKV: 209 }, { dutyCycleKV: 264, mcovKV: 212 },
  { dutyCycleKV: 276, mcovKV: 220 }, { dutyCycleKV: 288, mcovKV: 230 }, { dutyCycleKV: 294, mcovKV: 235 }, { dutyCycleKV: 312, mcovKV: 245 },
  { dutyCycleKV: 396, mcovKV: 318 }, { dutyCycleKV: 420, mcovKV: 335 }, { dutyCycleKV: 444, mcovKV: 353 }, { dutyCycleKV: 468, mcovKV: 372 },
  { dutyCycleKV: 492, mcovKV: 392 }, { dutyCycleKV: 540, mcovKV: 428 }, { dutyCycleKV: 564, mcovKV: 448 }, { dutyCycleKV: 576, mcovKV: 462 },
  { dutyCycleKV: 588, mcovKV: 470 }, { dutyCycleKV: 612, mcovKV: 485 },
];

export const TABLE_5_57_CITE: Citation = { page: 330, section: '5.8.2', table: '5-57', originalSource: 'IEEE C62.11-1993, Table 1', note: 'For ratings not shown, consult the manufacturer.' };

export interface MovStationClassRow {
  maxSystemLLkV: number;
  maxSystemLGkV: number;
  minMcovKV: number;
  dutyCycleRangeKV: readonly [number, number] | readonly [number];
  /** Protective levels, per unit of MCOV crest (range of industry maxima). */
  fowDischargePu: readonly [number, number];
  lightningDischarge8x20Pu: readonly [number, number];
  switchingSurgePu: readonly [number, number];
  highCurrentWithstandCrestA: number;
  transmissionLineDischargeMiles: number;
  pressureReliefA: readonly [number, number] | readonly [number];
  note?: string;
}

/** Table 5-58 (p. 331): metal-oxide station- and intermediate-class arrester characteristics (IEEE C62.22-1991 Table 1). */
export const TABLE_5_58_MOV_CHARACTERISTICS = {
  station: [
    { maxSystemLLkV: 4.37, maxSystemLGkV: 2.52, minMcovKV: 2.55, dutyCycleRangeKV: [3], fowDischargePu: [2.32, 2.48], lightningDischarge8x20Pu: [2.10, 2.20], switchingSurgePu: [1.70, 1.85], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 150, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 8.73, maxSystemLGkV: 5.04, minMcovKV: 5.1, dutyCycleRangeKV: [6, 9], fowDischargePu: [2.33, 2.48], lightningDischarge8x20Pu: [1.97, 2.23], switchingSurgePu: [1.70, 1.85], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 150, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 13.1, maxSystemLGkV: 4.56, minMcovKV: 7.65, dutyCycleRangeKV: [9, 12], fowDischargePu: [2.33, 2.48], lightningDischarge8x20Pu: [1.79, 2.23], switchingSurgePu: [1.70, 1.85], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 150, pressureReliefA: [40000, 65000], note: 'UNCERTAIN: L-G printed as 4.56 kV; 13.1/√3 = 7.56 kV, so 4.56 is probably a misprint.' },
    { maxSystemLLkV: 13.9, maxSystemLGkV: 8.0, minMcovKV: 7.65, dutyCycleRangeKV: [9, 15], fowDischargePu: [2.33, 2.48], lightningDischarge8x20Pu: [1.97, 2.23], switchingSurgePu: [1.70, 1.85], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 150, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 14.5, maxSystemLGkV: 8.37, minMcovKV: 8.4, dutyCycleRangeKV: [10, 15], fowDischargePu: [2.33, 2.48], lightningDischarge8x20Pu: [1.97, 2.23], switchingSurgePu: [1.70, 1.85], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 150, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 26.2, maxSystemLGkV: 15.12, minMcovKV: 15.3, dutyCycleRangeKV: [18, 27], fowDischargePu: [2.33, 2.48], lightningDischarge8x20Pu: [1.97, 2.23], switchingSurgePu: [1.70, 1.85], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 150, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 36.2, maxSystemLGkV: 20.92, minMcovKV: 22, dutyCycleRangeKV: [27, 36], fowDischargePu: [2.43, 2.48], lightningDischarge8x20Pu: [1.97, 2.23], switchingSurgePu: [1.70, 1.85], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 150, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 48.3, maxSystemLGkV: 27.89, minMcovKV: 29, dutyCycleRangeKV: [36, 48], fowDischargePu: [2.43, 2.48], lightningDischarge8x20Pu: [1.97, 2.23], switchingSurgePu: [1.70, 1.85], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 150, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 72.5, maxSystemLGkV: 41.86, minMcovKV: 42, dutyCycleRangeKV: [54, 72], fowDischargePu: [2.19, 2.40], lightningDischarge8x20Pu: [1.97, 2.18], switchingSurgePu: [1.64, 1.84], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 150, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 121, maxSystemLGkV: 69.86, minMcovKV: 70, dutyCycleRangeKV: [90, 120], fowDischargePu: [2.19, 2.40], lightningDischarge8x20Pu: [1.97, 2.18], switchingSurgePu: [1.64, 1.84], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 150, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 145, maxSystemLGkV: 83.72, minMcovKV: 84, dutyCycleRangeKV: [104, 144], fowDischargePu: [2.19, 2.39], lightningDischarge8x20Pu: [1.97, 2.17], switchingSurgePu: [1.64, 1.84], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 150, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 169, maxSystemLGkV: 97.57, minMcovKV: 98, dutyCycleRangeKV: [120, 172], fowDischargePu: [2.19, 2.39], lightningDischarge8x20Pu: [1.97, 2.17], switchingSurgePu: [1.64, 1.84], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 175, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 242, maxSystemLGkV: 139.72, minMcovKV: 140, dutyCycleRangeKV: [172, 240], fowDischargePu: [2.19, 2.36], lightningDischarge8x20Pu: [1.97, 2.15], switchingSurgePu: [1.64, 1.84], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 175, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 362, maxSystemLGkV: 209.0, minMcovKV: 209, dutyCycleRangeKV: [258, 312], fowDischargePu: [2.19, 2.36], lightningDischarge8x20Pu: [1.97, 2.15], switchingSurgePu: [1.71, 1.85], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 200, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 550, maxSystemLGkV: 317.54, minMcovKV: 318, dutyCycleRangeKV: [396, 564], fowDischargePu: [2.01, 2.25], lightningDischarge8x20Pu: [2.01, 2.25], switchingSurgePu: [1.71, 1.85], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 200, pressureReliefA: [40000, 65000] },
    { maxSystemLLkV: 800, maxSystemLGkV: 461.88, minMcovKV: 462, dutyCycleRangeKV: [576, 612], fowDischargePu: [2.01, 2.25], lightningDischarge8x20Pu: [2.01, 2.25], switchingSurgePu: [1.71, 1.85], highCurrentWithstandCrestA: 65000, transmissionLineDischargeMiles: 200, pressureReliefA: [40000, 65000] },
  ] as readonly MovStationClassRow[],
  intermediate: {
    maxSystemLLkV: [4.37, 169] as const,
    maxSystemLGkV: [2.52, 97.67] as const,
    minMcovKV: [2.8, 98] as const,
    dutyCycleRangeKV: [3, 144] as const,
    fowDischargePu: [2.38, 2.85] as const,
    lightningDischarge8x20Pu: [2.28, 2.55] as const,
    switchingSurgePu: [1.80, 2.10] as const,
    highCurrentWithstandCrestA: 65000,
    transmissionLineDischargeMiles: 100,
    pressureReliefA: 16100,
  },
  cite: {
    page: 331,
    section: '5.8.2',
    table: '5-58',
    originalSource: 'IEEE C62.22-1991, Table 1 (durability per IEEE C62.11-1987)',
    note:
      'Per-unit values are of MCOV crest (√2 × MCOV). Lightning protective level is max discharge voltage at 10 kA for duty-cycle ratings through 312 kV ' +
      '(15 kA for 396-564 kV, 20 kA for 576-612 kV); switching surge levels at 500 A (3-108 kV), 1000 A (120-240 kV), 2000 A (above 240 kV). L-G voltages are for ANSI C84.1 range A.',
  } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// Definitions, system voltage, grounding coefficient
// ---------------------------------------------------------------------------

export const ARRESTER_DEFINITIONS: readonly Guidance[] = [
  { id: 'def-duty-cycle', text: 'Duty-cycle voltage rating: the nameplate maximum voltage at which the arrester performs its duty cycle; the basis for silicon-carbide arresters and also listed with MCOV for metal oxide.', cite: { page: 332, section: '5.8.3.1' }, tags: ['arrester'] },
  { id: 'def-sparkover', text: 'Power-frequency and impulse sparkover voltages apply only to gapped silicon-carbide arresters; the standard impulse is 1.2 × 50 µs.', cite: { page: [332, 333], section: '5.8.3.2-5.8.3.3' }, tags: ['arrester'] },
  { id: 'def-mcov', text: 'MCOV: the highest rms power-frequency voltage that may be applied continuously; for metal oxide its minimum is usually the maximum system line-to-ground voltage.', cite: { page: 333, section: '5.8.3.4' }, tags: ['arrester'] },
  { id: 'def-discharge', text: 'Discharge voltage: voltage across the arrester while surge current flows, usually given for 1.5, 3, 5, 10, 20 and 40 kA of 8 × 20 µs current; between 5 and 20 kA this approximates the 1.2 × 50 µs voltage wave.', cite: { page: 333, section: '5.8.3.5-5.8.3.7' }, tags: ['arrester'] },
  { id: 'sys-nominal', text: 'Nominal voltage is the approximate phase-to-phase voltage naming the system, usually about 5-10% below maximum system voltage.', cite: { page: 333, section: '5.8.4.1' }, tags: ['arrester', 'voltage'] },
  { id: 'sys-maximum', text: 'Maximum system voltage (ANSI C84.1) is the highest continuous phase-to-phase voltage equipment must withstand without derating and is the starting point for arrester application; at 345 kV and below it may be 5-10% above nominal.', cite: { page: 333, section: '5.8.4.2', originalSource: 'ANSI C84.1' }, tags: ['arrester', 'voltage'] },
];

/** §5.8.5 (pp. 333-334): coefficient of grounding (COG). */
export const COEFFICIENT_OF_GROUNDING = {
  definition: 'COG = E_LG / E_LL: highest rms line-to-ground voltage on a sound phase during a ground fault, divided by the line-to-line voltage at that location with the fault removed (expressed in percent).',
  effectivelyGroundedMaxPct: 80,
  /** COG ≤ 80% is obtained approximately when, for all system conditions, X0/X1 is positive and < 3 and R0/X1 is positive and < 1. */
  effectiveGroundingCriteria: { x0OverX1Max: 3, r0OverX1Max: 1 },
  lowestTypicalPct: { multigroundedFourWireDistribution: 67, highVoltageTransmission: 70 },
  cite: {
    page: [333, 334],
    section: '5.8.5',
    originalSource: 'ANSI/IEEE C62.92',
    note: 'On multigrounded four-wire distribution systems positive-sequence resistance can be significant; use R0/Z1 and X0/Z1, otherwise arresters may be over-rated. COG can rise with switching or system changes. Fig 5-33 (IEEE C62.2 Fig 2) gives COG curves.',
  } satisfies Citation,
} as const;

/** Effectively grounded per §5.8.5: COG not exceeding 80%. */
export function isEffectivelyGrounded(cogPct: number): boolean {
  return cogPct <= COEFFICIENT_OF_GROUNDING.effectivelyGroundedMaxPct;
}

// ---------------------------------------------------------------------------
// Application rules (silicon carbide §5.8.6; metal oxide §5.8.7)
// ---------------------------------------------------------------------------

export const SIC_APPLICATION_RULES = {
  /** Rating should be at least this multiple of L-G voltage at maximum system voltage. */
  minRatingTimesLGAtMaxVoltage: 1.25,
  /** Isolated-neutral (delta or ungrounded-wye) systems: about 105% of, and never less than, maximum system voltage ("full-rated" / 100% arrester). */
  ungroundedRatingTimesMaxSystemVoltage: 1.05,
  /** Effectively grounded systems: rating can generally be 80% or less of maximum system voltage (75% or even 70% in special cases, depending on COG). */
  effectivelyGroundedRatingPctOfMaxSystem: { general: 80, special: [75, 70] as const },
  cite: { page: 334, section: '5.8.6.1' } satisfies Citation,
} as const;

/** §5.8.6.3 and §5.8.7.6 (pp. 335, 346-347): insulation coordination margins. */
export const PROTECTIVE_MARGINS = {
  /** Ratio F = TFOW / AFOW ≥ 1.20 (transformer front-of-wave withstand / arrester front-of-wave level). */
  frontOfWaveMinRatio: 1.2,
  /** Ratio L = BIL / LPL ≥ 1.20 (BIL / arrester lightning protective level). */
  lightningMinRatio: 1.2,
  /** Ratio S = BSL / SPL ≥ 1.15 (transformer switching surge withstand / arrester switching protective level). */
  switchingMinRatio: 1.15,
  /** Transformer switching surge withstand is usually specified at 83% of impulse BIL. */
  bslFractionOfBil: 0.83,
  cite: {
    page: [335, 347],
    section: '5.8.6.3; 5.8.7.6',
    note: 'Silicon carbide: minimum 20% between transformer BIL and arrester maximum IR, 15% for switching surges. Greater margins may be needed where insulation may be degraded; when margins are ample, equipment BIL may be reduced for savings.',
  } satisfies Citation,
} as const;

/** Ratio checks of §5.8.7.6 (p. 347); all voltages in kV crest. Returns each ratio and whether it meets the minimum. */
export function checkProtectiveRatios(p: { tfow: number; afow: number; bil: number; lpl: number; bsl?: number; spl?: number }): {
  ratioF: number; ratioL: number; ratioS: number | null; ok: boolean;
} {
  const ratioF = p.tfow / p.afow;
  const ratioL = p.bil / p.lpl;
  const bsl = p.bsl ?? PROTECTIVE_MARGINS.bslFractionOfBil * p.bil;
  const ratioS = p.spl ? bsl / p.spl : null;
  const ok = ratioF >= PROTECTIVE_MARGINS.frontOfWaveMinRatio && ratioL >= PROTECTIVE_MARGINS.lightningMinRatio && (ratioS === null || ratioS >= PROTECTIVE_MARGINS.switchingMinRatio);
  return { ratioF, ratioL, ratioS, ok };
}

/** Eq 5-7 (p. 344): minimum MCOV for a solidly grounded system, MCOV_min = E_LL · k / √3 (k = 1.05 for a 5% operating allowance). */
export function minMcovSolidlyGroundedKV(nominalLLkV: number, k = 1.05): number {
  return (nominalLLkV * k) / Math.sqrt(3);
}

/** §5.8.7.3.1 (p. 344): minimum duty-cycle rating for ungrounded or impedance-grounded systems, Rating = E_LL · k. */
export function minDutyCycleUngroundedKV(nominalLLkV: number, k = 1.05): number {
  return nominalLLkV * k;
}

/** Smallest Table 5-57 rating whose MCOV is at least `mcovKV` (null if above the table). */
export function selectMovByMcov(mcovKV: number): MovRating | null {
  return TABLE_5_57_MOV_RATINGS.find((r) => r.mcovKV >= mcovKV - 1e-9) ?? null;
}

/** Smallest Table 5-57 rating whose duty-cycle voltage is at least `dutyKV` (null if above the table). */
export function selectMovByDutyCycle(dutyKV: number): MovRating | null {
  return TABLE_5_57_MOV_RATINGS.find((r) => r.dutyCycleKV >= dutyKV - 1e-9) ?? null;
}

/**
 * §5.8.7.3.1 (p. 344): pick the minimum metal-oxide arrester for a system, following the bulletin's two rules:
 * solidly grounded → MCOV ≥ E_LL·k/√3; ungrounded or impedance grounded → duty-cycle rating ≥ E_LL·k.
 * The bulletin rounds 34.5·1.05/√3 = 20.9 to 21 kV before selecting; this function compares unrounded values.
 * Temporary overvoltage (magnitude and duration) must still be checked against manufacturer curves (§5.8.7.3.2).
 */
export function selectMinimumMov(nominalLLkV: number, grounding: 'solid' | 'ungrounded-or-impedance', k = 1.05): MovRating | null {
  return grounding === 'solid' ? selectMovByMcov(minMcovSolidlyGroundedKV(nominalLLkV, k)) : selectMovByDutyCycle(minDutyCycleUngroundedKV(nominalLLkV, k));
}

/** Eq 5-8 (p. 346): approximate switching surge current I_A = (E_S − E_A)/Z (surge and discharge voltage in volts, Z in ohms → amperes). */
export function switchingSurgeCurrentA(surgeVoltageV: number, dischargeVoltageV: number, surgeImpedanceOhm: number): number {
  return (surgeVoltageV - dischargeVoltageV) / surgeImpedanceOhm;
}

/**
 * Eq 5-9 (p. 346): arrester discharge energy J = 2·L·E_A·I_A / c, with c = 300 km/ms (190 mi/ms as printed).
 * With E_A in kV, I_A in kA and L in km, L/c is in ms and J comes out in kJ (the unit the bulletin states).
 */
export function arresterDischargeEnergyKJ(lineLengthKm: number, dischargeVoltageKV: number, surgeCurrentKA: number): number {
  return (2 * lineLengthKm * dischargeVoltageKV * surgeCurrentKA) / 300;
}

export const ARRESTER_EQUATIONS = [
  { id: '5-7', printed: 'MCOV(MIN) = ELL * k / √3', variables: 'ELL: nominal line-to-line voltage (kV); k: operating voltage allowance over nominal (1.05 for 5%)', cite: { page: 344, section: '5.8.7.3.1', equation: '5-7', note: 'The √ is lost in the PDF text layer; verified on the page image.' } satisfies Citation },
  { id: 'ungrounded', printed: 'Rating = ELL * k', variables: 'Minimum duty-cycle rating on ungrounded or impedance-grounded systems', cite: { page: 344, section: '5.8.7.3.1' } satisfies Citation },
  { id: '5-8', printed: 'IA = (ES − EA) / Z', variables: 'IA surge current (A); ES surge voltage (V); EA discharge voltage (V); Z line surge impedance (Ω)', cite: { page: 346, section: '5.8.7.4.2', equation: '5-8' } satisfies Citation },
  { id: '5-9', printed: 'J = 2 L EA IA / c   (kilojoules)', variables: 'L line length; c speed of light, 190 miles/ms or 300 km/ms', cite: { page: 346, section: '5.8.7.5', equation: '5-9', note: 'UNCERTAIN: units are not fully specified; kJ results with EA in kV, IA in kA and L/c in ms. 190 mi/ms is as printed (light travels about 186 mi/ms).' } satisfies Citation },
  { id: 'ratios', printed: 'Ratio F = TFOW/AFOW ≥ 1.20; Ratio L = BIL/LPL ≥ 1.20; Ratio S = BSL/SPL ≥ 1.15', variables: 'Transformer front-of-wave, BIL and switching withstand vs arrester front-of-wave, lightning and switching protective levels', cite: { page: 347, section: '5.8.7.6' } satisfies Citation },
] as const;

export const APPLICATION_GUIDANCE: readonly Guidance[] = [
  { id: 'app-max-lg', text: 'Start by finding the maximum power-frequency line-to-ground overvoltage at the arrester (faults, load rejection, resonance); for most systems at 230 kV and below only fault overvoltage matters, found as maximum L-L voltage × COG.', cite: { page: [334, 335], section: '5.8.6.2' }, tags: ['arrester', 'procedure'] },
  { id: 'app-345', text: 'At 345 kV switching surges may govern; transient studies (TNA/EMTP) may be needed, and reactors, pre-insertion resistors or operating rules may be used to limit them.', cite: { page: [334, 335], section: '5.8.6.2' }, tags: ['arrester'] },
  { id: 'app-switching-threshold', text: 'Switching surge protective levels need only be considered above 69 kV and rarely change coordination below 345 kV.', cite: { page: [339, 346], section: '5.8.6.7.2; 5.8.7.4.2' }, tags: ['arrester'] },
  { id: 'app-thermal', text: 'Check thermal (energy) capacity where long lines or high-energy capacitor banks exist: switching surge energy grows with the square of voltage and with line length, so a 138 kV line needs at least four times the discharge capacity of an equal-length 69 kV line.', cite: { page: 335, section: '5.8.6.4' }, tags: ['arrester', 'capacitor', 'design-check'] },
  { id: 'app-shielding', text: 'Arresters handle surges arriving on lines; direct strokes to the bus could destroy them, so shield the station with overhead ground wires or masts, which also allows greater arrester separation.', cite: { page: [335, 337], section: '5.8.6.5' }, tags: ['arrester', 'shielding', 'design-check'] },
  { id: 'app-multiple-lines', text: 'Several connected lines reduce incoming surge severity, but this cannot be relied on because lines may be out of service when needed.', cite: { page: 337, section: '5.8.6.6' }, tags: ['arrester'] },
  { id: 'app-service', text: 'Standard arresters are designed for ambient up to 40 °C (104 °F) and altitude up to 1800 m (6000 ft); MOV usual conditions are -40 to +40 °C continuous with +60 °C maximum.', cite: { page: [337, 343], section: '5.8.6.7.1; 5.8.7.2' }, tags: ['arrester', 'altitude'] },
  { id: 'app-discharge-current', text: 'With effective shielding, 10 kA (8 × 20 µs) is a conservative maximum discharge current; unshielded stations may see 20 kA or more. 5-20 kA is commonly used for discharge voltage.', cite: { page: [339, 346], section: '5.8.6.8.2; 5.8.7.4.1' }, tags: ['arrester'] },
  { id: 'app-iterate', text: 'If coordination fails, choose a different arrester, move it closer, raise equipment insulation, improve shielding, or add arresters.', cite: { page: 340, section: '5.8.6.8.6' }, tags: ['arrester', 'fix'] },
  { id: 'app-lv-rating', text: 'The low-voltage arrester on a transformer should have a per-unit rating slightly higher than the high-voltage arrester, so surge energy discharges through the high-side arresters first.', cite: { page: [340, 342], section: '5.8.6.8.7' }, tags: ['arrester', 'transformer', 'design-check'] },
  { id: 'app-tov', text: 'For metal oxide, check every temporary overvoltage (faults, lost neutral, load rejection, resonance, switching) for magnitude and duration against the manufacturer\'s TOV curve (Fig 5-39).', cite: { page: 345, section: '5.8.7.3.2', figure: '5-39' }, tags: ['arrester'] },
  { id: 'app-ungrounded-mov', text: 'On ungrounded or impedance-grounded systems a 100%-rated MOV will conduct during a ground fault on another phase; the engineer must judge how long and follow the manufacturer\'s TOV limits.', cite: { page: 344, section: '5.8.7.3.1' }, tags: ['arrester', 'grounding'] },
];

/** Fig 5-39 (p. 345): typical MOV 60 Hz temporary overvoltage capability, described (not digitized). */
export const MOV_TOV_CAPABILITY_FIG_5_39 = {
  description: 'Per-unit-of-MCOV voltage versus permissible duration for "no prior duty" and "prior duty" curves; capability falls from about 1.6 pu (no prior duty) / 1.55 pu (prior duty) at 0.01 s to about 1.29 pu near 10^4 s.',
  exampleReading: 'In the 230 kV example, 1.29 pu (181/140 kV) may be applied for more than 100 s.',
  cite: {
    page: 345,
    section: '5.8.7.3.2',
    figure: '5-39',
    note: 'UNCERTAIN: values read approximately from the chart. The printed x-axis is mislabelled (1x10^-2, 1x10^-1, 1x10^-0, 1x10^-1, 1x10^-2, 1x10^-3, 1x10^-4); it evidently runs 10^-2 to 10^4 s. Manufacturer curves govern.',
  } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// Worked examples (unit-test fixtures)
// ---------------------------------------------------------------------------

/** §5.8.6.8 (pp. 339-340): silicon-carbide arrester selection, 230 kV substation fed by one effectively shielded line. */
export const ARRESTER_SIC_230KV_EXAMPLE = {
  inputs: { nominalKV: 230, maxVoltageFactor: 1.05, r1OverX1: 0.1, r0OverX1: 0.8, x0OverX1: 2.5, shielded: true, lines: 1 },
  steps: {
    cogPct: 75, // read from curve (B) of Fig 5-33
    maxSystemKV: 242, // 230 × 1.05 (241.5, printed 242)
    maxLGOvervoltageKV: 181, // 242 × 0.75 (181.5, printed 181)
    dischargeCurrentKA: 10, // conservative with effective shielding; 20 kA or more if not shielded
    ruleOfThumbKV: 174, // 1.25 × 1.05 × 230 / √3
    arresterClass: 'station' as ArresterClass,
    selectedRatingKV: 192, // next standard rating above 174 and 181 kV
    marginsUsed: { frontOfWavePct: 20, maxDischargePct: 20, switchingSurgePct: 15 },
    candidateBilsKV: [900, 825, 750, 650] as const,
    chosenBilKV: 750,
  },
  cite: { page: [339, 340], section: '5.8.6.8', figure: '5-33, 5-35', originalSource: 'IEEE C62.2 guide steps' } satisfies Citation,
} as const;

/** §5.8.7.3.1 (p. 344): MOV selection for 34.5 kV systems with a 5% operating allowance. */
export const ARRESTER_MOV_34KV_EXAMPLE = {
  solidlyGrounded: { nominalKV: 34.5, k: 1.05, minMcovKV: 21, selectedMcovKV: 22, selectedDutyCycleKV: 27 },
  ungroundedOrImpedanceGrounded: { nominalKV: 34.5, k: 1.05, minDutyCycleKV: 36.2, selectedDutyCycleKV: 39, selectedMcovKV: 31.5 },
  cite: { page: 344, section: '5.8.7.3.1', equation: '5-7', table: '5-57', note: 'Printed 34.5 × 1.05/√3 = 21 kV (20.92); the 27 kV duty-cycle rating paired with 22 kV MCOV is from Table 5-57.' } satisfies Citation,
} as const;

/** §5.8.7.10 (pp. 349-352): MOV selection for the same 230 kV substation. */
export const ARRESTER_MOV_230KV_EXAMPLE = {
  inputs: { eLLMaxKV: 242, eLGMaxKV: 140, cogPct: 75, tovKV: 181, tovDurationS: '< 1', candidateBilsKV: [900, 825, 750, 650] as const, impulseCurrentsKA: [5, 10, 20] as const },
  steps: {
    minMcovKV: 140, // = E_LG(MAX), a standard Table 5-57 rating (duty cycle 172 kV)
    dutyCycleKV: 172,
    tovPerUnit: 1.29, // 181 / 140
    tovAllowedDurationS: '> 100', // from Fig 5-39
    alternative: { mcovKV: 152, dutyCycleKV: 192 },
    mcovPeakKV: { mcov140: 198, mcov152: 215 }, // √2 × MCOV, from figure notes
    result: 'Protective ratios substantially exceed 20% (front of wave, lightning) and 15% (switching) for all candidate BILs.',
  },
  cite: {
    page: [349, 352],
    section: '5.8.7.10',
    figure: '5-39, 5-41, 5-42',
    note: 'UNCERTAIN: the text describes Fig 5-41 as the 140 kV MCOV case and Fig 5-42 as 152 kV, but the printed captions are the other way round.',
  } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// Location and separation distance (§5.8.8, Figs 5-43..5-45)
// ---------------------------------------------------------------------------

export const LOCATION_GUIDANCE: readonly Guidance[] = [
  { id: 'loc-transformers', text: 'Locate arresters at or near the main transformers on both high- and low-voltage sides, often mounted on the transformer itself; arresters at line entrances or on a multi-line bus may also be desirable.', cite: { page: 352, section: '5.8.8.1' }, tags: ['arrester', 'location', 'design-check'] },
  { id: 'loc-close', text: 'Steep lightning fronts create large voltage differences even between close points, so mount arresters as close as practical to the protected apparatus with the shortest practical leads, ideally tapped directly to the equipment jumper.', cite: { page: 352, section: '5.8.8.1' }, tags: ['arrester', 'location', 'design-check'] },
  { id: 'loc-separation', text: 'Separation S is measured from the arrester lead junction on the line to the transformer bushing; as S grows, reflections can push the transformer voltage toward twice the arrester discharge voltage.', cite: { page: 352, section: '5.8.8.2.2' }, tags: ['arrester', 'location'] },
  { id: 'loc-lead', text: 'Lead length L is the conductor length from the junction with the circuit to ground, excluding the arrester; its L·di/dt drop adds to the discharge voltage.', cite: { page: 352, section: '5.8.8.2.3' }, tags: ['arrester', 'location'] },
  { id: 'loc-curves', text: 'Figs 5-43 to 5-45 give maximum lead length and separation for high-side arresters, valid for "modern" arresters (any US-made in or after 1960).', cite: { page: 352, section: '5.8.8.2.4', originalSource: 'AIEE Transactions Paper 63-229' }, tags: ['arrester', 'location'] },
  { id: 'loc-fuses', text: 'At smaller substations with high-side fuses, put the arrester on the line side of the fuse so lightning discharge does not pass through the fuse.', cite: { page: 356, section: '5.8.8.3.1' }, tags: ['arrester', 'fuse', 'design-check'] },
  { id: 'loc-switches', text: 'Arresters are not needed on the line side of high-voltage air-break switches, but must be close enough to protect the closed switch; line entrance gaps can protect it when open.', cite: { page: 356, section: '5.8.8.3.2' }, tags: ['arrester', 'switch'] },
  { id: 'loc-lv-bus', text: 'Valve-type arresters on the low-voltage distribution bus go on the load side of the feeder overcurrent device (recloser, fuse or breaker) and its disconnect switch.', cite: { page: 356, section: '5.8.8.3.3' }, tags: ['arrester', 'feeder', 'design-check'] },
  { id: 'loc-cables', text: 'Protect cable-to-overhead junctions with arresters and ground the sheath at the terminal structure and at the substation; add arresters at the equipment end if twice the junction arrester protective level exceeds 80% of the substation BIL.', cite: { page: 356, section: '5.8.8.3.4' }, tags: ['arrester', 'cable', 'design-check'] },
  { id: 'loc-neutral', text: 'On high-voltage wye transformers with ungrounded neutrals, add a neutral-to-ground arrester rated about 1.2 × normal line-to-neutral voltage, since neutral reflections can approach twice the line-terminal voltage.', cite: { page: 356, section: '5.8.8.3.5' }, tags: ['arrester', 'transformer', 'design-check'] },
];

export interface SeparationCurve {
  figure: '5-43' | '5-44' | '5-45';
  no: number;
  nominalKV: number;
  criticalLineFlashoverKV: number;
  transformerBilKV: number;
  arresterRatingKV: number;
  arresterType: 'STA' | 'INT';
  /** L at S = 0: maximum lead length with the arrester at the bushing, ft (null = not extracted). */
  maxLeadFt: number | null;
  /** Maximum separation S (ft) for lead lengths L = 0, 5, 10, 20 ft (null = not extracted). */
  maxSeparationFt: { lead0: number | null; lead5: number | null; lead10: number | null; lead20: number | null };
  note?: string;
}

const SEP = (
  figure: SeparationCurve['figure'], no: number, kv: number, cfo: number, bil: number, rating: number, type: 'STA' | 'INT',
  maxLeadFt: number | null, s0: number | null, s5: number | null, s10: number | null, s20: number | null, note?: string,
): SeparationCurve => {
  const c: SeparationCurve = { figure, no, nominalKV: kv, criticalLineFlashoverKV: cfo, transformerBilKV: bil, arresterRatingKV: rating, arresterType: type, maxLeadFt, maxSeparationFt: { lead0: s0, lead5: s5, lead10: s10, lead20: s20 } };
  if (note) c.note = note;
  return c;
};

/**
 * Figs 5-43, 5-44, 5-45 (pp. 353-355): maximum safe separation S of arresters from the protected transformer vs lead
 * length L. Legend columns (system, CFO, BIL, arrester) are exactly as printed; the distances are digitized.
 */
export const SEPARATION_CURVES: readonly SeparationCurve[] = [
  SEP('5-43', 1, 23, 500, 150, 25, 'INT', 32, 71, 49, 36, 17),
  SEP('5-43', 2, 34.5, 600, 200, 30, 'INT', 49, 128, 101, 75, 46, 'S at L = 0 extrapolated slightly above the 125 ft chart top.'),
  SEP('5-43', 3, 34.5, 600, 200, 37, 'STA', 44, 101, 77, 61, 39),
  SEP('5-43', 4, 34.5, 600, 200, 37, 'INT', 28, 50, 40, 31, 13),
  SEP('5-43', 5, 46, 750, 250, 40, 'INT', 59, 114, 94, 80, 59),
  SEP('5-43', 6, 46, 750, 250, 50, 'STA', 57, 105, 85, 71, 52),
  SEP('5-43', 7, 46, 750, 250, 50, 'INT', 39, 60, 51, 42, 25),
  SEP('5-44', 8, 69, 1020, 350, 60, 'STA', 96, 187, 173, 160, 135, 'Crosses curve 13 near S = 15 ft and runs together with curve 14 from about S = 64 to 140 ft; identity assigned from the printed labels plus slope continuity.'),
  SEP('5-44', 9, 69, 1020, 350, 60, 'INT', 72, 131, 114, 101, 78),
  SEP('5-44', 10, 69, 1020, 350, 73, 'STA', 63, 113, 99, 87, 66),
  SEP('5-44', 11, 69, 1020, 350, 73, 'INT', 38, 52, 45, 38, 23),
  SEP('5-44', 12, 69, 600, 350, 73, 'INT', 41, 55, 48, 41, 27),
  SEP('5-44', 13, 115, 1220, 450, 97, 'STA', 101, 154, 140, 128, 105, 'Crosses curve 8 near S = 15 ft (see curve 8).'),
  SEP('5-44', 14, 115, 760, 550, 121, 'STA', 124, 205, 184, 166, 135, 'Coincides with curve 8 between about S = 64 and 140 ft.'),
  SEP('5-44', 15, 138, 1380, 550, 109, 'STA', 136, 218, 201, 189, 163, 'Runs about 1-2 ft from curve 16 above S ≈ 98 ft.'),
  SEP('5-44', 16, 138, 930, 650, 145, 'STA', 150, 223, 208, 194, 169),
  SEP('5-45', 17, 161, 1020, 650, 145, 'STA', null, null, null, null, null),
  SEP('5-45', 18, 161, 1020, 750, 169, 'STA', null, null, null, null, null),
  SEP('5-45', 19, 230, 1440, 900, 195, 'STA', null, null, null, null, null),
  SEP('5-45', 20, 230, 1750, 1050, 242, 'STA', null, null, null, null, null),
  SEP('5-45', 21, 230, 1440, 1050, 242, 'STA', null, null, null, null, null),
  SEP('5-45', 22, 345, 1600, 1050, 258, 'STA', null, null, null, null, null),
  SEP('5-45', 23, 345, 1600, 1050, 264, 'STA', null, null, null, null, null),
  SEP('5-45', 24, 345, 1600, 1175, 258, 'STA', null, null, null, null, null),
  SEP('5-45', 25, 345, 1600, 1175, 264, 'STA', null, null, null, null, null),
];

export const SEPARATION_CURVES_CITE: Citation = {
  page: [352, 355],
  section: '5.8.8.2',
  figure: '5-43, 5-44, 5-45',
  originalSource: 'IEEE Std C62.22-1991 (curves from AIEE Transactions Paper 63-229)',
  note:
    'UNCERTAIN: distances digitized from 1-bit scans calibrated on the gridlines (estimated ±2 ft); crossing curves were resolved by slope continuity and the printed labels. ' +
    'Fig 5-45 (161-345 kV) was not digitized per curve: its curves cluster and cross amid arrow labels. Overall its L-axis intercepts run from about 138 to 299 ft and its S values at L = 0 from about 210 ft to beyond the 440 ft chart top. ' +
    'The curves are convex, so linear interpolation between the tabulated points slightly over-estimates S (non-conservative by a few feet).',
};

/**
 * Maximum arrester separation (ft) for a given lead length (ft) from a digitized curve, by linear interpolation through
 * (0,S0), (5,S5), (10,S10), (20,S20) and (Lmax,0). Returns null if the curve was not digitized; 0 if L ≥ Lmax.
 */
export function maxArresterSeparationFt(curve: SeparationCurve, leadFt: number): number | null {
  const s = curve.maxSeparationFt;
  if (curve.maxLeadFt === null || s.lead0 === null || s.lead5 === null || s.lead10 === null || s.lead20 === null) return null;
  const pts: Array<[number, number]> = [[0, s.lead0], [5, s.lead5], [10, s.lead10], [20, s.lead20], [curve.maxLeadFt, 0]];
  if (leadFt >= curve.maxLeadFt) return 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [l0, v0] = pts[i];
    const [l1, v1] = pts[i + 1];
    if (leadFt >= l0 && leadFt <= l1) return v0 + ((v1 - v0) * (leadFt - l0)) / (l1 - l0);
  }
  return s.lead0;
}

// ---------------------------------------------------------------------------
// Line entrances (§5.8.9)
// ---------------------------------------------------------------------------

export const LINE_ENTRANCE_PROTECTION = {
  maxWaveFrontKVPerUs: 1000,
  gradientAtMaxKVPerM: 3.3,
  goodPracticeBasisKVPerUs: 500,
  gapsConsideredFromKV: 23,
  gapConditions: [
    'Steep incoming surges could break down insulation near the line entrance or on the bus, with the station arresters too far away to help.',
    'Part of the station insulation can be isolated from the station arresters by switching.',
    'The station arrester is damaged or out of service.',
  ] as const,
  guidance: [
    { id: 'le-reflection', text: 'At open points (open breakers or switches) surges reflect at nearly twice the original rate of rise, so large substations should consider line-entrance protection.', cite: { page: 356, section: '5.8.9' }, tags: ['arrester', 'line-entrance'] },
    { id: 'le-arresters-best', text: 'Arresters are the most effective line-entrance protection; protective gaps are an economical alternative at entrances of overhead lines of 23 kV and above.', cite: { page: 356, section: '5.8.9' }, tags: ['arrester', 'line-entrance', 'design-check'] },
    { id: 'le-gap-fault', text: 'A gap operation places a fault that a remote breaker, recloser or fuse must clear, so engineering and operations should agree it is acceptable.', cite: { page: 357, section: '5.8.9' }, tags: ['arrester', 'line-entrance'] },
  ] as readonly Guidance[],
  cite: { page: [356, 357], section: '5.8.9' } satisfies Citation,
} as const;
