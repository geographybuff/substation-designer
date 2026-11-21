/**
 * Automatic circuit recloser data from RUS Bulletin 1724E-300 §5.9 "Automatic Circuit Reclosers" (pp. 357-376):
 * purpose, classifying features (phases, control, tripping, closing, interrupting medium), service conditions and
 * altitude correction (Table 5-59), ratings (Tables 5-60..5-65, from ANSI/IEEE C37.60-1981), operating sequences,
 * lockout vs hold-closed operation, load pickup, maintenance and mounting.
 *
 * The bulletin gives no statistic for the share of faults that are temporary; it only says most faults on open-wire
 * overhead distribution lines are transient (§12.4.5.1, p. 631).
 */
import type { Citation, Guidance } from './types';

const C37_60 = 'ANSI/IEEE Std C37.60-1981';

export const RECLOSER_CITES = {
  general: { page: [357, 360], section: '5.9.1', figure: '5-46, 5-47, 5-48' },
  serviceConditions: { page: [360, 361], section: '5.9.1.3', table: '5-59', originalSource: `${C37_60}, Table 1` },
  standards: { page: 361, section: '5.9.1.4', originalSource: `${C37_60}; ANSI C37.61` },
  classifying: { page: [361, 363], section: '5.9.2' },
  ratings: { page: [363, 371], section: '5.9.3', table: '5-60 to 5-65', originalSource: `${C37_60}, Tables 2-7` },
  construction: { page: [371, 372], section: '5.9.4', figure: '5-49' },
  operation: { page: [373, 375], section: '5.9.5', figure: '5-50, 5-51' },
  maintenance: { page: 375, section: '5.9.6' },
  mounting: { page: 376, section: '5.9.7', figure: '5-52' },
} as const satisfies Record<string, Citation>;

export const RECLOSER_GUIDANCE: readonly Guidance[] = [
  { id: 'rec-definition', text: 'A recloser is a self-controlled device that interrupts and automatically recloses an ac circuit through a preset sequence of openings and reclosings, ending in reset, lockout or hold-closed.', cite: { page: 357, section: '5.9.1' }, tags: ['recloser'] },
  { id: 'rec-purpose', text: 'Reclosers keep distribution service continuous by clearing and reclosing on temporary faults (lightning, trees, wildlife) and removing permanently faulted circuits; unlike fuses they distinguish temporary from permanent faults.', cite: { page: 357, section: '5.9.1.1' }, tags: ['recloser', 'reliability'] },
  { id: 'rec-temporary-chance', text: 'Temporary faults get repeated chances to clear or to be cleared by a downstream device; a fault that persists is treated as permanent and the recloser locks out (or holds closed).', cite: { page: 357, section: '5.9.1.1' }, tags: ['recloser'] },
  { id: 'rec-application', text: 'Reclosers protect and switch distribution circuits in substations and on branch feeders; applying them needs a study of load and short-circuit characteristics of all protecting and protected devices (supply fuses, feeder breaker, line reclosers, sectionalizers, fuses, conductor burn-down, ground resistance).', cite: { page: 360, section: '5.9.1.2', originalSource: 'ANSI C37.61, paragraph 4.3 (selection procedure)' }, tags: ['recloser', 'coordination'] },
  { id: 'rec-ip202', text: 'RUS IP 202-1 lists accepted recloser manufacturers and types (some conditionally).', cite: { page: [361, 363], section: '5.9.1.4; 5.9.2.5' }, tags: ['recloser'] },
  { id: 'rec-limits', text: 'Never exceed any recloser rating; doing so leads to excessive maintenance or unsatisfactory operation.', cite: { page: 363, section: '5.9.3' }, tags: ['recloser', 'design-check'] },
  { id: 'rec-lower-voltage', text: 'Some reclosers can run below rated voltage: series-coil hydraulic units need no change (and may gain interrupting capability); shunt-closing units need a closing coil for the system voltage unless closing is from a low-voltage auxiliary source.', cite: { page: 364, section: '5.9.3.1.2' }, tags: ['recloser'] },
];

// ---------------------------------------------------------------------------
// Service conditions and altitude correction
// ---------------------------------------------------------------------------

export const RECLOSER_SERVICE_CONDITIONS = {
  ambientC: [-30, 40] as const,
  ambientF: [-22, 104] as const,
  maxAltitudeM: 1000,
  maxAltitudeFt: 3300,
  ratedFrequencyHz: 60,
  notes: [
    'Outside the temperature range performance may be affected (hydraulic controls slow at 32 °F); consult the manufacturer.',
    'Above 1000 m, reduce impulse insulation level, rated maximum voltage and rated continuous current by Table 5-59 factors; units may carry normal current if ambient stays below 40 °C × the column 5 factor.',
    'Rated interrupting current, current-related capabilities and interrupting time are not affected by altitude.',
  ] as const,
  cite: { page: [360, 361], section: '5.9.1.3; 5.9.3.2' } satisfies Citation,
} as const;

export interface AltitudeCorrectionRow {
  altitudeFt: number;
  altitudeM: number;
  voltageFactor: number;
  currentFactor: number;
  ambientTempFactor: number;
}

/** Table 5-59 (p. 361): altitude correction factors (multipliers). */
export const TABLE_5_59_ALTITUDE_CORRECTION: readonly AltitudeCorrectionRow[] = [
  { altitudeFt: 3300, altitudeM: 1000, voltageFactor: 1.0, currentFactor: 1.0, ambientTempFactor: 1.0 },
  { altitudeFt: 4000, altitudeM: 1200, voltageFactor: 0.98, currentFactor: 0.99, ambientTempFactor: 0.99 },
  { altitudeFt: 5000, altitudeM: 1500, voltageFactor: 0.95, currentFactor: 0.99, ambientTempFactor: 0.98 },
  { altitudeFt: 10000, altitudeM: 3000, voltageFactor: 0.8, currentFactor: 0.96, ambientTempFactor: 0.92 },
  { altitudeFt: 16000, altitudeM: 4900, voltageFactor: 0.63, currentFactor: 0.93, ambientTempFactor: 0.85 },
];

export const TABLE_5_59_CITE: Citation = {
  page: 361,
  section: '5.9.1.3',
  table: '5-59',
  originalSource: `${C37_60}, Table 1`,
  note: 'The 4000 ft current factor is printed "099" (0.99). The voltage factor applies to impulse insulation level and rated maximum voltage.',
};

/** Linear interpolation of Table 5-59 factors (1.0 at or below 1000 m; clamped at 4900 m). Interpolation is a game convenience. */
export function recloserAltitudeFactors(altitudeM: number): { voltage: number; current: number; ambient: number } {
  const t = TABLE_5_59_ALTITUDE_CORRECTION;
  if (altitudeM <= t[0].altitudeM) return { voltage: 1, current: 1, ambient: 1 };
  for (let i = 0; i < t.length - 1; i++) {
    const a = t[i], b = t[i + 1];
    if (altitudeM <= b.altitudeM) {
      const f = (altitudeM - a.altitudeM) / (b.altitudeM - a.altitudeM);
      return {
        voltage: a.voltageFactor + f * (b.voltageFactor - a.voltageFactor),
        current: a.currentFactor + f * (b.currentFactor - a.currentFactor),
        ambient: a.ambientTempFactor + f * (b.ambientTempFactor - a.ambientTempFactor),
      };
    }
  }
  const z = t[t.length - 1];
  return { voltage: z.voltageFactor, current: z.currentFactor, ambient: z.ambientTempFactor };
}

// ---------------------------------------------------------------------------
// Classifying features
// ---------------------------------------------------------------------------

export interface RecloserFeature {
  id: string;
  name: string;
  text: string;
  cite: Citation;
}

export const RECLOSER_FEATURES: Readonly<Record<'phases' | 'control' | 'tripping' | 'closing' | 'interrupter', readonly RecloserFeature[]>> = {
  phases: [
    { id: 'single-phase', name: 'Single-phase recloser', text: 'Protects single-phase lines (branches, taps) or three-phase circuits with mostly single-phase load, so a permanent phase-to-ground fault locks out one phase while two-thirds of the system stays in service.', cite: { page: 361, section: '5.9.2.1.1' } },
    { id: 'three-phase-1ph-trip', name: 'Three-phase: single-phase trip, three-phase lockout', text: 'Three single-phase units in one tank, interlinked only for lockout: each phase trips and recloses independently, but lockout of any phase trips and locks open the other two. Used on smaller types.', cite: { page: [361, 362], section: '5.9.2.1.2.1', figure: '5-47' } },
    { id: 'three-phase-3ph-trip', name: 'Three-phase: three-phase trip, three-phase lockout', text: 'All three contacts operate together for every trip on any fault type through a common mechanism. Used on larger reclosers; prevents single-phasing of three-phase loads such as large motors.', cite: { page: 362, section: '5.9.2.1.2.2' } },
  ],
  control: [
    { id: 'hydraulic', name: 'Hydraulic control (integral)', text: 'Used in single-phase and smaller three-phase reclosers: a series trip coil senses overcurrent and draws in a plunger; timing and sequencing come from pumping oil through hydraulic chambers.', cite: { page: 362, section: '5.9.2.2.1' } },
    { id: 'electronic', name: 'Electronic control (separate cabinet)', text: 'Used on some single-phase and larger three-phase reclosers; more flexible, adjustable and accurate. Sensing CTs feed the control through a multiconductor cable; timing, trip levels and sequences change without de-energizing or untanking. A dc battery supplies or backs up the control, usually charged from an external ac source.', cite: { page: 362, section: '5.9.2.2.2' } },
    { id: 'microprocessor', name: 'Microprocessor control', text: 'Adds flexibility, more time-current curves and a communications port for remote data, similar to microprocessor relays.', cite: { page: 625, section: '12.4.3.2' } },
  ],
  tripping: [
    { id: 'series-coil', name: 'Series-coil tripping', text: 'A series solenoid carrying line current trips the mechanism on overcurrent and simultaneously charges the closing springs. Used on hydraulically controlled single- and three-phase reclosers.', cite: { page: 362, section: '5.9.2.3.1' } },
    { id: 'non-series', name: 'Non-series-coil tripping', text: 'An externally powered solenoid trips pre-charged springs (or trips directly). Used on some single-phase vacuum and some three-phase reclosers.', cite: { page: [362, 363], section: '5.9.2.3.2' } },
  ],
  closing: [
    { id: 'spring', name: 'Spring closing', text: 'Closing spring charged by the previous trip; most single-phase and some three-phase reclosers.', cite: { page: 363, section: '5.9.2.4.1' } },
    { id: 'solenoid', name: 'Solenoid closing', text: 'High-voltage ac coil (line to grounded neutral) or low-voltage dc coil from a battery (a rectifier accessory allows local ac); some single- and three-phase reclosers.', cite: { page: 363, section: '5.9.2.4.2' } },
    { id: 'motor', name: 'Motor closing', text: 'External-supply motor charges and releases closing springs, which also charge the trip springs; some three-phase reclosers.', cite: { page: 363, section: '5.9.2.4.3' } },
  ],
  interrupter: [
    { id: 'oil', name: 'Oil interruption', text: 'Most single-phase and some three-phase reclosers; the same oil insulates and, in hydraulic units, times and counts operations.', cite: { page: 363, section: '5.9.2.5.1' } },
    { id: 'vacuum', name: 'Vacuum interruption', text: 'A few single-phase and some three-phase reclosers; less frequent maintenance and minimal external force during interruption. Some still use oil for insulation.', cite: { page: 363, section: '5.9.2.5.2' } },
    { id: 'sf6', name: 'SF6 interruption', text: 'Some three-phase reclosers; same advantages as vacuum, and SF6 insulates better than oil or air.', cite: { page: 363, section: '5.9.2.5.3' } },
  ],
};

export const RECLOSER_RATING_DEFINITIONS: readonly Guidance[] = [
  { id: 'r-nominal', text: 'Nominal voltage: the system voltage the recloser is intended for; rated maximum voltage: the highest voltage it is designed to operate at.', cite: { page: 364, section: '5.9.3.1' }, tags: ['recloser'] },
  { id: 'r-impulse', text: 'Rated impulse withstand voltage is a C37.60 test with a standard 1.2 × 50 µs wave of either polarity.', cite: { page: 364, section: '5.9.3.1.3' }, tags: ['recloser'] },
  { id: 'r-continuous', text: 'Rated continuous current is often set by the installed series trip coil, so load growth can be met by fitting a larger coil.', cite: { page: 364, section: '5.9.3.3' }, tags: ['recloser'] },
  { id: 'r-min-trip', text: 'Minimum tripping current for series-coil (and shunt-trip hydraulic) reclosers is normally 200% of the coil continuous rating; for electronic controls it is set independently of continuous rating. The margin normally covers load inrush after an extended outage.', cite: { page: 370, section: '5.9.3.4' }, tags: ['recloser', 'design-check'] },
  { id: 'r-interrupting', text: 'Rated interrupting current is the maximum rms symmetrical current interrupted under the standard operating duty, based on the asymmetrical current for the tabulated minimum X/R with recovery voltage equal to rated maximum voltage; it is on the nameplate.', cite: { page: [370, 371], section: '5.9.3.5' }, tags: ['recloser', 'design-check'] },
  { id: 'r-making', text: 'Rated making current equals the rated interrupting current (with asymmetry): the recloser must close, latch and hold against it.', cite: { page: 371, section: '5.9.3.6' }, tags: ['recloser'] },
  { id: 'r-not-kva', text: 'Interrupting ratings at other than rated voltage come from the manufacturer; they are not generally on a constant-kVA basis.', cite: { page: [368, 370], table: '5-63 to 5-65' }, tags: ['recloser'] },
];

/** §5.9.3.4.1 (p. 370): standard minimum tripping pickup = 200% of the series coil continuous rating. */
export function seriesCoilMinimumTripA(coilContinuousA: number): number {
  return 2 * coilContinuousA;
}

// ---------------------------------------------------------------------------
// Tables 5-60, 5-61, 5-62: recloser ratings and standard operating duty
// ---------------------------------------------------------------------------

export interface RecloserRatingRow {
  table: '5-60' | '5-61' | '5-62';
  line: string;
  interrupter: 'oil' | 'vacuum';
  construction: 'overhead' | 'pad-mounted/dry-vault/submersible';
  phases: 1 | 3;
  nominalKV: number;
  ratedMaxKV: number;
  impulseWithstandKVCrest: number;
  lowFreqWithstand1minDryKV: number;
  lowFreqWithstand10sWetKV: number | null;
  continuousA: number;
  interruptingA: number;
  /** Standard operating duty: [minimum X/R, number of unit operations] at 15-20%, 45-55% and 90-100% of interrupting rating. */
  duty: { at15to20: readonly [number, number]; at45to55: readonly [number, number]; at90to100: readonly [number, number] };
  totalOperations: number;
  dcWithstand15minKV?: number;
  note?: string;
}

const R = (
  table: RecloserRatingRow['table'], line: string, interrupter: RecloserRatingRow['interrupter'], phases: 1 | 3, nom: number, max: number, bil: number, dry: number, wet: number | null,
  cont: number, intr: number, d1: [number, number], d2: [number, number], d3: [number, number], total: number, extra?: Partial<RecloserRatingRow>,
): RecloserRatingRow => ({
  table, line, interrupter, construction: table === '5-62' ? 'pad-mounted/dry-vault/submersible' : 'overhead', phases, nominalKV: nom, ratedMaxKV: max, impulseWithstandKVCrest: bil,
  lowFreqWithstand1minDryKV: dry, lowFreqWithstand10sWetKV: wet, continuousA: cont, interruptingA: intr, duty: { at15to20: d1, at45to55: d2, at90to100: d3 }, totalOperations: total, ...extra,
});

/** Table 5-60 (p. 365): oil reclosers (C37.60-1981 Table 2). */
export const TABLE_5_60_OIL_RECLOSERS: readonly RecloserRatingRow[] = [
  R('5-60', '1', 'oil', 1, 14.4, 15.0, 95, 35, 30, 50, 1250, [2, 40], [4, 40], [8, 20], 100),
  R('5-60', '2', 'oil', 1, 14.4, 15.5, 110, 50, 45, 100, 2000, [2, 32], [5, 24], [10, 12], 68),
  R('5-60', '3', 'oil', 1, 14.4, 15.5, 110, 50, 45, 280, 4000, [3, 32], [6, 20], [12, 12], 64),
  R('5-60', '4', 'oil', 1, 14.4, 15.5, 110, 50, 45, 560, 10000, [4, 28], [8, 20], [15, 10], 58),
  R('5-60', '5', 'oil', 1, 24.9, 27.0, 150, 60, 50, 100, 2500, [2, 32], [5, 24], [12, 12], 68),
  R('5-60', '6', 'oil', 1, 24.9, 27.0, 150, 60, 50, 280, 4000, [3, 32], [6, 20], [13, 12], 64),
  R('5-60', '7', 'oil', 1, 34.5, 38.0, 150, 70, 60, 560, 8000, [4, 28], [8, 20], [15, 10], 58),
  R('5-60', '8', 'oil', 3, 14.4, 15.0, 95, 35, 30, 50, 1250, [2, 40], [4, 40], [8, 20], 100),
  R('5-60', '9', 'oil', 3, 14.4, 15.5, 110, 50, 45, 100, 2000, [2, 32], [5, 24], [10, 12], 68),
  R('5-60', '10', 'oil', 3, 14.4, 15.5, 110, 50, 45, 280, 4000, [3, 32], [6, 20], [12, 12], 64),
  R('5-60', '11', 'oil', 3, 14.4, 15.5, 110, 50, 45, 400, 4000, [3, 32], [6, 20], [12, 12], 64),
  R('5-60', '12', 'oil', 3, 14.4, 15.5, 110, 50, 45, 560, 8000, [3, 28], [7, 20], [14, 10], 58),
  R('5-60', '13', 'oil', 3, 14.4, 15.5, 110, 50, 45, 560, 16000, [4, 16], [8, 8], [16, 4], 28),
  R('5-60', '14', 'oil', 3, 14.4, 15.5, 110, 50, 45, 560, 16000, [4, 28], [8, 20], [16, 10], 58),
  R('5-60', '15', 'oil', 3, 14.4, 15.5, 110, 50, 45, 1120, 16000, [4, 28], [8, 20], [16, 10], 58),
  R('5-60', '16', 'oil', 3, 24.9, 27.0, 150, 60, 50, 100, 2500, [2, 32], [5, 24], [12, 12], 68),
  R('5-60', '17', 'oil', 3, 24.9, 27.0, 150, 60, 50, 560, 8000, [4, 28], [8, 20], [15, 10], 58),
  R('5-60', '18', 'oil', 3, 24.9, 27.0, 150, 60, 50, 1120, 8000, [4, 28], [8, 20], [15, 10], 58),
  R('5-60', '19', 'oil', 3, 24.9, 27.0, 150, 60, 50, 560, 12000, [4, 28], [8, 20], [15, 10], 58),
  R('5-60', '20', 'oil', 3, 34.5, 38.0, 150, 70, 60, 400, 6000, [4, 28], [8, 24], [15, 10], 62),
  R('5-60', '21', 'oil', 3, 34.5, 38.0, 150, 70, 60, 560, 16000, [4, 28], [8, 20], [15, 10], 58),
  R('5-60', '22', 'oil', 3, 34.5, 38.0, 150, 70, 60, 1120, 12000, [4, 28], [8, 20], [15, 10], 58),
  R('5-60', '23', 'oil', 3, 46.0, 48.3, 250, 105, 95, 560, 10000, [4, 28], [8, 20], [15, 10], 58),
  R('5-60', '24', 'oil', 3, 69.0, 72.5, 350, 160, 140, 560, 8000, [4, 28], [8, 20], [16, 10], 58),
];

/** Table 5-61 (p. 366): reclosers with vacuum interrupters (C37.60-1981 Table 4). Lines 8 and 10 are "Suggested Standard for Future Design". */
export const TABLE_5_61_VACUUM_RECLOSERS: readonly RecloserRatingRow[] = [
  R('5-61', '1', 'vacuum', 1, 14.4, 15.5, 110, 50, 45, 200, 2000, [2, 52], [5, 68], [10, 18], 138),
  R('5-61', '2', 'vacuum', 3, 14.4, 15.5, 110, 50, 45, 200, 2000, [2, 52], [5, 68], [10, 18], 138),
  R('5-61', '3', 'vacuum', 3, 14.4, 15.5, 110, 50, 45, 400, 6000, [3, 48], [7, 60], [14, 16], 124),
  R('5-61', '4', 'vacuum', 3, 14.4, 15.5, 110, 50, 45, 560, 12000, [4, 44], [8, 66], [15, 16], 116, { note: 'UNCERTAIN: 44 + 66 + 16 = 126, but the total is printed as 116 (line 5 has 56 at 45-55%); one of the printed values is likely a misprint.' }),
  R('5-61', '5', 'vacuum', 3, 14.4, 15.5, 110, 50, 45, 800, 12000, [4, 44], [8, 56], [15, 16], 116),
  R('5-61', '6', 'vacuum', 3, 14.4, 15.5, 110, 50, 45, 560, 16000, [4, 44], [8, 52], [16, 16], 112),
  R('5-61', '7', 'vacuum', 3, 14.4, 15.5, 110, 50, 45, 800, 16000, [4, 44], [8, 52], [16, 16], 112),
  R('5-61', '8', 'vacuum', 3, 14.4, 15.5, 110, 50, 45, 1120, 16000, [4, 44], [8, 52], [16, 16], 112, { note: 'Suggested Standard for Future Design.' }),
  R('5-61', '9', 'vacuum', 3, 24.9, 27.0, 125, 60, 50, 560, 10000, [3, 44], [7, 56], [14, 16], 116),
  R('5-61', '10', 'vacuum', 3, 34.5, 38.0, 150, 70, 60, 560, 12000, [4, 44], [8, 56], [15, 16], 116, { note: 'Suggested Standard for Future Design.' }),
];

/** Table 5-62 (p. 367): pad-mounted, dry-vault and submersible reclosers and non-reclosing fault interrupters, vacuum (C37.60-1981 Table 6). SSFD = Suggested Standard for Future Design. */
export const TABLE_5_62_PADMOUNT_RECLOSERS: readonly RecloserRatingRow[] = [
  R('5-62', 'SSFD 1', 'vacuum', 3, 14.4, 15.5, 95, 35, null, 200, 8000, [1, 44], [2, 56], [4, 16], 116, { dcWithstand15minKV: 53 }),
  R('5-62', 'SSFD 2', 'vacuum', 3, 14.4, 15.5, 95, 35, null, 560, 6000, [3, 48], [7, 60], [14, 16], 124, { dcWithstand15minKV: 53 }),
  R('5-62', '3', 'vacuum', 3, 14.4, 15.5, 95, 35, null, 560, 12000, [4, 44], [8, 56], [15, 16], 116, { dcWithstand15minKV: 53 }),
  R('5-62', 'SSFD 4', 'vacuum', 3, 14.4, 15.5, 95, 35, null, 560, 12000, [1, 44], [2, 52], [4, 16], 112, { dcWithstand15minKV: 53 }),
  R('5-62', 'SSFD 5', 'vacuum', 3, 24.9, 27.0, 125, 40, null, 200, 16000, [1, 44], [2, 52], [4, 16], 112, { dcWithstand15minKV: 78 }),
  R('5-62', '6', 'vacuum', 3, 24.9, 27.0, 125, 40, null, 560, 10000, [3, 28], [7, 20], [14, 10], 58, { dcWithstand15minKV: 78 }),
];

export const RECLOSER_RATING_TABLES_CITE: Citation = {
  page: [365, 367],
  section: '5.9.3',
  table: '5-60, 5-61, 5-62',
  originalSource: `${C37_60}, Tables 2, 4, 6`,
  note: 'Impulse and low-frequency withstand values and the operating duty are performance characteristics specified as test requirements. For vacuum units the standard operating duty represents half-life as measured by contact erosion. Table 5-62 gives no 10 s wet withstand.',
};

/** All overhead and pad-mounted rating rows. */
export const RECLOSER_RATINGS: readonly RecloserRatingRow[] = [...TABLE_5_60_OIL_RECLOSERS, ...TABLE_5_61_VACUUM_RECLOSERS, ...TABLE_5_62_PADMOUNT_RECLOSERS];

/**
 * Candidate rating rows that satisfy a duty: rated maximum voltage ≥ system maximum voltage, continuous ≥ load,
 * interrupting ≥ maximum available fault current at the recloser. (Coil-dependent ratings: see Tables 5-63..5-65.)
 */
export function recloserRowsFor(systemMaxKV: number, loadA: number, faultA: number, phases?: 1 | 3): RecloserRatingRow[] {
  return RECLOSER_RATINGS.filter((r) => r.ratedMaxKV >= systemMaxKV && r.continuousA >= loadA && r.interruptingA >= faultA && (phases === undefined || r.phases === phases));
}

// ---------------------------------------------------------------------------
// Tables 5-63..5-65: interrupting rating vs series coil / minimum trip setting
// ---------------------------------------------------------------------------

export interface CoilRatingColumn {
  /** Recloser line number(s) in the matching Table 5-60/5-61/5-62. */
  lines: string;
  ratedMaxKV: number | string;
  /** Interrupting rating (A) at rated maximum voltage for each coil rating / minimum trip setting in `settingsA` (null = not offered). */
  interruptingA: readonly (number | null)[];
}

export interface CoilRatingTable {
  table: '5-63' | '5-64' | '5-65';
  part: string;
  /** Series coil continuous ratings (A) or minimum trip settings (A) indexing `interruptingA`. */
  settingsA: readonly number[];
  settingKind: 'series-coil continuous rating' | 'minimum trip setting';
  columns: readonly CoilRatingColumn[];
  cite: Citation;
}

const n = null;

export const RECLOSER_COIL_TABLES: readonly CoilRatingTable[] = [
  {
    table: '5-63', part: 'Oil, single-phase series coil', settingKind: 'series-coil continuous rating',
    settingsA: [5, 10, 15, 25, 35, 50, 70, 100, 140, 200, 280, 400, 560],
    columns: [
      { lines: '1', ratedMaxKV: 15.0, interruptingA: [125, 250, 375, 625, 875, 1250, n, n, n, n, n, n, n] },
      { lines: '2', ratedMaxKV: 15.5, interruptingA: [200, 400, 600, 1000, 1400, 2000, 2000, 2000, n, n, n, n, n] },
      { lines: '3', ratedMaxKV: 15.5, interruptingA: [n, n, n, 1500, 2100, 3000, 4000, 4000, 4000, 4000, 4000, n, n] },
      { lines: '4', ratedMaxKV: 15.5, interruptingA: [n, n, n, n, n, n, n, 6000, 8400, 10000, 10000, 10000, 10000] },
      { lines: '5', ratedMaxKV: 27.0, interruptingA: [200, 400, 600, 1000, 1400, 2000, 2500, 2500, n, n, n, n, n] },
      { lines: '6', ratedMaxKV: 27.0, interruptingA: [n, n, n, n, n, 3000, 4000, 4000, 4000, 4000, 4000, n, n] },
      { lines: '7', ratedMaxKV: 38.0, interruptingA: [n, n, n, n, n, n, n, 6000, 8000, 8000, 8000, 8000, 8000] },
    ],
    cite: { page: 368, section: '5.9.3.3', table: '5-63', originalSource: `${C37_60}, Table 3` },
  },
  {
    table: '5-63', part: 'Oil, three-phase series coil', settingKind: 'series-coil continuous rating',
    settingsA: [5, 10, 15, 25, 35, 50, 70, 100, 140, 200, 280, 400, 560],
    columns: [
      { lines: '8', ratedMaxKV: 15.0, interruptingA: [125, 250, 375, 625, 875, 1250, n, n, n, n, n, n, n] },
      { lines: '9', ratedMaxKV: 15.5, interruptingA: [200, 400, 600, 1000, 1400, 2000, 2000, 2000, n, n, n, n, n] },
      { lines: '10', ratedMaxKV: 15.5, interruptingA: [n, n, n, 1500, 2100, 3000, 4000, 4000, 4000, 4000, 4000, n, n] },
      { lines: '11', ratedMaxKV: 15.5, interruptingA: [n, n, n, 1500, 2100, 3000, 4000, 4000, 4000, 4000, 4000, 4000, n] },
      { lines: '12-17', ratedMaxKV: '15-27', interruptingA: [n, n, n, n, n, n, n, 6000, 8000, 8000, 8000, 8000, 8000] },
      { lines: '16', ratedMaxKV: 27.0, interruptingA: [200, 400, 600, 1000, 1400, 2000, 2500, 2500, n, n, n, n, n] },
      { lines: '20', ratedMaxKV: 34.0, interruptingA: [n, n, n, 1500, 2100, 3000, 4200, 6000, 6000, 6000, 6000, 6000, n] },
    ],
    cite: { page: 368, section: '5.9.3.3', table: '5-63', originalSource: `${C37_60}, Table 3`, note: 'UNCERTAIN: the line 20 column is headed 34.0 kV, but Table 5-60 line 20 is rated 38.0 kV maximum.' },
  },
  {
    table: '5-63', part: 'Oil, three-phase non-series coil', settingKind: 'minimum trip setting',
    settingsA: [100, 140, 200, 280, 400, 560, 800, 1120, 1600, 2240],
    columns: [
      { lines: '11', ratedMaxKV: 15.5, interruptingA: [3000, 4000, 4000, 4000, 4000, 4000, 4000, n, n, n] },
      { lines: '12', ratedMaxKV: 15.5, interruptingA: [n, n, 6000, 8000, 8000, 8000, 8000, 8000, n, n] },
      { lines: '13', ratedMaxKV: 15.5, interruptingA: [n, n, 6000, 8400, 12000, 16000, 16000, 16000, n, n] },
      { lines: '14', ratedMaxKV: 15.5, interruptingA: [n, n, 6000, 8400, 12000, 16000, 16000, 16000, n, n] },
      { lines: '15', ratedMaxKV: 15.5, interruptingA: [n, n, n, n, 12000, 16000, 16000, 16000, 16000, 16000] },
      { lines: '17', ratedMaxKV: 27.0, interruptingA: [n, n, 6000, 8000, 8000, 8000, 8000, 8000, n, n] },
      { lines: '18', ratedMaxKV: 27.0, interruptingA: [n, n, 6000, 8000, 8000, 8000, 8000, 8000, 8000, 8000] },
      { lines: '19', ratedMaxKV: 27.0, interruptingA: [n, n, 6000, 8400, 12000, 12000, 12000, 12000, n, n] },
      { lines: '20', ratedMaxKV: 38.0, interruptingA: [3000, 4200, 6000, 6000, 6000, 6000, 6000, n, n, n] },
      { lines: '21', ratedMaxKV: 38.0, interruptingA: [3000, 4200, 6000, 8400, 12000, 16000, 16000, 16000, n, n] },
      { lines: '22', ratedMaxKV: 38.0, interruptingA: [n, n, 6000, 8400, 12000, 12000, 12000, 12000, 12000, 12000] },
      { lines: '23', ratedMaxKV: 48.3, interruptingA: [3000, 4200, 6000, 8400, 10000, 10000, 10000, 10000, n, n] },
      { lines: '24', ratedMaxKV: 72.5, interruptingA: [3000, 4200, 6000, 8000, 8000, 8000, 8000, 8000, n, n] },
    ],
    cite: { page: 368, section: '5.9.3.3', table: '5-63', originalSource: `${C37_60}, Table 3` },
  },
  {
    table: '5-64', part: 'Vacuum, series coil (single-phase line 1; three-phase lines 2, 4, 9)', settingKind: 'series-coil continuous rating',
    settingsA: [5, 10, 15, 25, 35, 50, 70, 100, 140, 200, 280, 400, 560],
    columns: [
      { lines: '1', ratedMaxKV: 15.5, interruptingA: [200, 400, 600, 1000, 1400, 2000, 2000, 2000, 2000, 2000, n, n, n] },
      { lines: '2', ratedMaxKV: 15.5, interruptingA: [200, 400, 600, 1000, 1400, 2000, 2000, 2000, 2000, 2000, n, n, n] },
      { lines: '4', ratedMaxKV: 15.5, interruptingA: [n, n, n, n, n, 3000, 4200, 6000, 8400, 12000, 12000, 12000, 12000] },
      { lines: '9', ratedMaxKV: 27.0, interruptingA: [n, n, n, n, n, 3000, 4200, 6000, 8400, 10000, 10000, 10000, 10000] },
    ],
    cite: { page: 369, section: '5.9.3.3', table: '5-64', originalSource: `${C37_60}, Table 5` },
  },
  {
    table: '5-64', part: 'Vacuum, three-phase non-series', settingKind: 'minimum trip setting',
    settingsA: [100, 140, 200, 280, 400, 500, 800, 1120, 1600, 2240],
    columns: [
      { lines: '3', ratedMaxKV: 15.5, interruptingA: [3000, 4200, 6000, 6000, 6000, 6000, 6000, n, n, n] },
      { lines: '4', ratedMaxKV: 15.5, interruptingA: [3000, 4200, 6000, 8400, 12000, 12000, 12000, 12000, n, n] },
      { lines: '5', ratedMaxKV: 15.5, interruptingA: [3000, 4200, 6000, 8400, 12000, 12000, 12000, 12000, 12000, n] },
      { lines: '6', ratedMaxKV: 15.5, interruptingA: [3000, 4200, 6000, 8400, 12000, 16000, 16000, 16000, n, n] },
      { lines: '7', ratedMaxKV: 15.5, interruptingA: [n, n, n, n, 12000, 16000, 16000, 16000, 16000, 16000] },
      { lines: '8', ratedMaxKV: 15.5, interruptingA: [n, n, n, n, 12000, 16000, 16000, 16000, 16000, n] },
      { lines: '9', ratedMaxKV: 27.0, interruptingA: [3000, 4200, 6000, 8400, 10000, 10000, 10000, 10000, n, n] },
      { lines: '10', ratedMaxKV: 38.0, interruptingA: [3000, 4200, 6000, 8400, 12000, 12000, 12000, 12000, n, n] },
    ],
    cite: { page: 369, section: '5.9.3.3', table: '5-64', originalSource: `${C37_60}, Table 5`, note: 'UNCERTAIN: this table prints a 500 A minimum-trip row where Tables 5-63 and 5-65 use 560 A; kept as printed.' },
  },
  {
    table: '5-65', part: 'Pad-mounted/dry-vault/submersible, three-phase series coil', settingKind: 'series-coil continuous rating',
    settingsA: [50, 70, 100, 140, 200, 280, 400, 560],
    columns: [
      { lines: '1-4', ratedMaxKV: 15.5, interruptingA: [3000, 4200, 6000, 8400, 12000, 12000, 12000, 12000] },
      { lines: '5-6', ratedMaxKV: 27.0, interruptingA: [3000, 4200, 6000, 8400, 10000, 10000, 10000, 10000] },
    ],
    cite: { page: 370, section: '5.9.3.3', table: '5-65', originalSource: `${C37_60}, Table 7`, note: 'The table prints one value per voltage group (15.5 kV lines 1-4 and 27.0 kV lines 5-6).' },
  },
  {
    table: '5-65', part: 'Pad-mounted/dry-vault/submersible, three-phase non-series coil', settingKind: 'minimum trip setting',
    settingsA: [100, 140, 200, 280, 400, 560, 800, 1120],
    columns: [
      { lines: '1', ratedMaxKV: 15.5, interruptingA: [6000, 8000, 8000, 8000, 8000, n, n, n] },
      { lines: '2', ratedMaxKV: 15.5, interruptingA: [6000, 3000, 4200, 6000, 6000, 6000, 6000, 6000] },
      { lines: '3', ratedMaxKV: 15.5, interruptingA: [3000, 4200, 6000, 8400, 12000, 12000, 12000, 12000] },
      { lines: '4', ratedMaxKV: 15.5, interruptingA: [3000, 4200, 6000, 8400, 12000, 16000, 16000, 16000] },
      { lines: '5', ratedMaxKV: 27.0, interruptingA: [3000, 4200, 6000, 8400, 12000, 16000, 16000, 16000] },
      { lines: '6', ratedMaxKV: 27.0, interruptingA: [3000, 4200, 6000, 8400, 10000, 10000, 10000, 10000] },
    ],
    cite: { page: 370, section: '5.9.3.3', table: '5-65', originalSource: `${C37_60}, Table 7`, note: 'UNCERTAIN: line 2 is printed 6000, 3000, 4200, 6000… (first value out of sequence); kept as printed.' },
  },
];

// ---------------------------------------------------------------------------
// Construction, operation, sequences
// ---------------------------------------------------------------------------

export const RECLOSER_CONSTRUCTION = {
  components: ['tank', 'bushings', 'operating mechanism', 'interrupter', 'controls'] as const,
  notes: [
    'Tank: usually steel, rectangular for three-phase and cylindrical for single-phase, with an aluminum-casting top; some newer designs have no tank (interrupter in an epoxy bushing, mechanism in a steel housing).',
    'Operating mechanism: opening force usually from springs charged by the closing mechanism (solenoid, springs or motor and gears); includes lockout and, on some units, hold-closed mechanisms.',
    'Control: a sequence device and operation integrator switch the recloser from instantaneous to time-delay operations and lock it out after the set count; types are hydraulic, mechanical or electronic.',
  ] as const,
  cite: { page: [371, 372], section: '5.9.4', figure: '5-49' } satisfies Citation,
} as const;

export interface OperatingSequence {
  id: string;
  instantaneous: number;
  timeDelay: number;
  /** Total trips to lockout. */
  totalTrips: number;
}

/** §5.9.4.5 (p. 372): the sequences reclosers are normally set for (all lock out after four trips). */
export const RECLOSER_SEQUENCES = {
  values: [
    { id: '4TD', instantaneous: 0, timeDelay: 4, totalTrips: 4 },
    { id: '1I-3TD', instantaneous: 1, timeDelay: 3, totalTrips: 4 },
    { id: '2I-2TD', instantaneous: 2, timeDelay: 2, totalTrips: 4 },
  ] as readonly OperatingSequence[],
  /** Fig 5-51 illustrates two fast and two time-delay operations with three reclosing intervals before lockout. */
  fig5_51: { fastOperations: 2, timeDelayOperations: 2, reclosingIntervals: 3 },
  /** §12.4.3.2.3 (p. 626): in the Fig 12-12 coordination example the recloser has one fast and three delayed trips. */
  coordinationExample: { fast: 1, delayed: 3 },
  cite: { page: [372, 374], section: '5.9.4.5; 5.9.5', figure: '5-51' } satisfies Citation,
} as const;

/** Fig 5-50 (p. 373): unit operation time terms (C37.60-1981 Fig 1). */
export const RECLOSER_TIMING_TERMS = {
  terms: [
    { term: 'release delay', from: 'initiation of short circuit', to: 'actuation of trip circuit' },
    { term: 'opening time', from: 'actuation of trip circuit', to: 'primary arcing contacts part' },
    { term: 'arcing time', from: 'primary arcing contacts part', to: 'final arc extinction' },
    { term: 'contact parting time', from: 'initiation of short circuit', to: 'primary arcing contacts part' },
    { term: 'interrupting time', from: 'actuation of trip circuit', to: 'final arc extinction' },
    { term: 'clearing time', from: 'initiation of short circuit', to: 'final arc extinction' },
    { term: 'reclosing interval', from: 'final arc extinction', to: 'primary arcing contacts make' },
  ] as const,
  cite: { page: 373, section: '5.9.5', figure: '5-50', originalSource: `${C37_60}, Figure 1` } satisfies Citation,
} as const;

export const RECLOSER_OPERATION_GUIDANCE: readonly Guidance[] = [
  { id: 'op-cycle', text: 'On overcurrent the recloser opens, recloses after a preset interval and counts the operation; if the fault persists it repeats up to the set count and then locks out or holds closed; if the fault clears it stays closed and the counter resets.', cite: { page: 373, section: '5.9.5', figure: '5-51' }, tags: ['recloser'] },
  { id: 'op-lockout-theory', text: 'Lockout schemes clear temporary faults on the instantaneous operations; for permanent faults the time-delay operations let downstream fuses isolate the fault, and the recloser locks out only for faults between itself and the next device.', cite: { page: 374, section: '5.9.5.3' }, tags: ['recloser', 'coordination'] },
  { id: 'op-after-lockout', text: 'After a lockout, inspect for distress (thrown oil, damaged bushings), then close with a hookstick held in the ring; if it locks out again after its full sequence, do not reclose until the load side to every sectionalizing device has been patrolled.', cite: { page: 374, section: '5.9.5.3.1-5.9.5.3.2' }, tags: ['recloser', 'operations'] },
  { id: 'op-hold-closed', text: 'Hold-closed reclosers trip instantaneously twice, then latch closed so the nearest sectionalizing device clears a permanent fault; a supply-side series fuse clears faults between the recloser and the next device and also protects against recloser failure.', cite: { page: 375, section: '5.9.5.4' }, tags: ['recloser', 'fuse'] },
  { id: 'op-manual', text: 'Before manual tripping or closing, pull the non-reclosing lever fully down to cut out automatic reclosing; restore automatic reclosing after a successful close.', cite: { page: [373, 374], section: '5.9.5.1-5.9.5.2' }, tags: ['recloser', 'operations'] },
  { id: 'op-inrush', text: 'Motor-starting and transformer magnetizing inrush (typically 3-30 cycles) can trip a recloser on its fast curve after a lockout; cold-load pickup accessories on electronic three-phase controls temporarily raise minimum pickup, usually to double.', cite: { page: 375, section: '5.9.5.5' }, tags: ['recloser', 'load'] },
  { id: 'op-fault-vs-overload', text: 'Instant, violent tripping on reclose suggests a fault; a short delay suggests overload from inrush, which calls for sectionalizing load rather than a patrol.', cite: { page: 375, section: '5.9.5.5' }, tags: ['recloser', 'operations'] },
];

export const RECLOSER_MAINTENANCE: readonly Guidance[] = [
  { id: 'mt-install', text: 'Before installation check for mechanical damage, oil level (oil units), the specified operating sequence, and record the operation counter reading.', cite: { page: 375, section: '5.9.6.1' }, tags: ['recloser', 'maintenance'] },
  { id: 'mt-schedule', text: 'Put every installed recloser on a periodic test and inspection schedule based on the manufacturer\'s recommendations, time in service and number of operations; vacuum designs need less frequent maintenance than oil.', cite: { page: 375, section: '5.9.6.1' }, tags: ['recloser', 'maintenance', 'simulation'] },
  { id: 'mt-scope', text: 'Routine checks cover timing tests, bushings for cracks, tank oil leaks and the counter reading; internal inspection covers contacts, gears, linkages, timing devices and oil tests.', cite: { page: 375, section: '5.9.6.1' }, tags: ['recloser', 'maintenance'] },
  { id: 'mt-ch18', text: 'When a station is de-energized, inspect oil circuit reclosers per 7 CFR 1730 and RUS Bulletin 1730-1; reclosers do not appear in the Chapter 19/20 test and maintenance interval tables (Tables 19-2, 20-1).', cite: { page: 730, section: '18.4.7', originalSource: '7 CFR 1730; RUS Bulletin 1730-1' }, tags: ['recloser', 'maintenance'] },
];

export const RECLOSER_MOUNTING = {
  text: 'Most single- and three-phase reclosers mount on poles or substation structures; single-phase units singly or in clusters; three-phase units have frames for base mounting, pad-mount enclosures, or adaptation to pole or structure mounting.',
  cite: { page: 376, section: '5.9.7', figure: '5-52' } satisfies Citation,
} as const;

/** No numeric worked example is given in §5.9. */
export const RECLOSER_EXAMPLE = null;
