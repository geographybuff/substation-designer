/**
 * Power transformer data from RUS Bulletin 1724E-300 §5.2 (pp. 191-219), plus the
 * transformer items on the Appendix B design-summary form (p. 104).
 *
 * Covers: cooling classes and forced-cooling uprates, ambient/altitude bases
 * (Tables 5-1, 5-2), standard voltage/kVA ranges (Tables 5-3..5-6), insulation levels
 * (Tables 5-7..5-10), standard impedances (Table 5-11), taps, parallel operation (with the
 * §5.2.7 worked example), short-circuit guidance, cooling alarms (Table 5-14) and audible
 * sound (Tables 5-15, 5-16).
 *
 * Many of these tables are reproduced in the bulletin from ANSI/IEEE/NEMA standards; only
 * numeric content is transcribed, with the upstream source named in each citation.
 * Guidance text is paraphrased.
 */
import type { Citation, Guidance, Sourced } from './types';

// ---------------------------------------------------------------------------
// Cooling classes and forced-cooling uprates
// ---------------------------------------------------------------------------

export type CoolingClass = 'OA' | 'OA/FA' | 'OA/FA/FA' | 'OA/FOA' | 'OA/FA/FOA' | 'OA/FOA/FOA';

export interface CoolingClassInfo {
  id: CoolingClass;
  /** Number of forced-cooling stages above the self-cooled (OA) base rating. */
  forcedStages: 0 | 1 | 2;
  description: string;
  cite: Citation;
}

export const COOLING_CLASSES: readonly CoolingClassInfo[] = [
  {
    id: 'OA',
    forcedStages: 0,
    description:
      'Oil-immersed, self-cooled. Oil carries heat from core and coils to the tank wall or cooling tubes by natural convection; most small rural substation transformers are this type.',
    cite: { page: [191, 209], section: '5.2.1, 5.2.10' },
  },
  {
    id: 'OA/FA',
    forcedStages: 1,
    description: 'Self-cooled base rating plus one stage of forced air (fans blowing over the cooling tubes).',
    cite: { page: 191, section: '5.2.1' },
  },
  {
    id: 'OA/FA/FA',
    forcedStages: 2,
    description: 'Self-cooled base rating plus two stages of forced air.',
    cite: { page: 191, section: '5.2.1' },
  },
  {
    id: 'OA/FOA',
    forcedStages: 1,
    description: 'Self-cooled base rating plus one stage of forced oil and forced air.',
    cite: {
      page: 104,
      note: 'Listed only as a choice on the Appendix B design-summary form (item 5.1.5); §5.2.1 lists OA, OA/FA, OA/FA/FA, OA/FA/FOA and OA/FOA/FOA.',
    },
  },
  {
    id: 'OA/FA/FOA',
    forcedStages: 2,
    description: 'Self-cooled base rating, a forced-air stage, then a forced-oil/forced-air stage.',
    cite: { page: 191, section: '5.2.1' },
  },
  {
    id: 'OA/FOA/FOA',
    forcedStages: 2,
    description: 'Self-cooled base rating plus two forced-oil/forced-air stages.',
    cite: { page: 191, section: '5.2.1' },
  },
];

export interface CoolingUprateRule {
  /** Lowest three-phase self-cooled (OA) rating the rule covers, kVA. */
  minOaKVA: number;
  /** True when the lower bound is exclusive ("above 10,000 kVA"). */
  minExclusive: boolean;
  /** Highest OA rating the rule covers, kVA (null = no upper limit stated). */
  maxOaKVA: number | null;
  /** Maximum number of forced-cooling stages the standards allow at this size. */
  maxForcedStages: 1 | 2;
  /** Added continuous capacity per forced-cooling stage, percent of the OA rating. */
  percentPerStage: number;
}

/**
 * §5.2.2: each forced-cooling stage adds a fixed percentage of the OA rating.
 * Transformers of 10,000 kVA and below can have only one stage; larger units up to two.
 */
export const COOLING_UPRATE_RULES: Sourced<readonly CoolingUprateRule[]> = {
  value: [
    { minOaKVA: 750, minExclusive: false, maxOaKVA: 2000, maxForcedStages: 1, percentPerStage: 15 },
    { minOaKVA: 2500, minExclusive: false, maxOaKVA: 10000, maxForcedStages: 1, percentPerStage: 25 },
    { minOaKVA: 10000, minExclusive: true, maxOaKVA: null, maxForcedStages: 2, percentPerStage: 33 },
  ],
  cite: {
    page: 192,
    section: '5.2.2',
    originalSource: 'IEEE Std. C57.12.00, Table 1; ANSI Std. C57.12.10, Tables 2 and 12',
    note:
      'Rules are stated for three-phase transformers. The bulletin gives no rule between 2000 and 2500 kVA. ' +
      'The C57.12.10 title quoted on p. 217 ("750/862 through 60 000/80 000/100 000 kVA") confirms the 15 % step at 750 kVA ' +
      'and shows the "33 percent" step is exactly one third of the OA rating (60 000 -> 80 000 -> 100 000).',
  },
};

/** Larger units are normally triple rated or have provision for two future cooling stages (§5.2.2). */
export const LARGE_UNITS_NORMALLY_TRIPLE_RATED: Sourced<boolean> = {
  value: true,
  cite: { page: 192, section: '5.2.2' },
};

/**
 * Continuous ratings [OA, stage 1, stage 2] for a three-phase OA rating under the §5.2.2 rules.
 * Returns null when the bulletin gives no rule for that size or the requested stage count is not allowed.
 * For units above 10,000 kVA each stage adds exactly one third of OA (see COOLING_UPRATE_RULES note).
 */
export function forcedCooledRatingsKVA(oaKVA: number, stages: 0 | 1 | 2): number[] | null {
  const rule = COOLING_UPRATE_RULES.value.find(
    (r) =>
      (r.minExclusive ? oaKVA > r.minOaKVA : oaKVA >= r.minOaKVA) &&
      (r.maxOaKVA === null || oaKVA <= r.maxOaKVA),
  );
  if (!rule || stages > rule.maxForcedStages) return null;
  const step = rule.maxOaKVA === null ? oaKVA / 3 : (oaKVA * rule.percentPerStage) / 100;
  const out = [oaKVA];
  for (let s = 1; s <= stages; s++) out.push(oaKVA + s * step);
  return out;
}

// ---------------------------------------------------------------------------
// Temperature and altitude basis
// ---------------------------------------------------------------------------

/** Normal design ambient (§5.2.3.2). Abnormal ambients must be given to the manufacturer at purchase. */
export const TRANSFORMER_DESIGN_AMBIENT: Sourced<{ maxC: number; avg24hC: number; minC: number }> = {
  value: { maxC: 40, avg24hC: 30, minC: -20 },
  cite: { page: [193, 194], section: '5.2.3.2' },
};

/** Average winding temperature-rise ratings offered on the design summary form and in the C57.92 loading guide title. */
export const AVERAGE_WINDING_RISE_OPTIONS_C: Sourced<readonly number[]> = {
  value: [55, 65],
  cite: {
    page: [104, 193],
    section: '5.2.3.1',
    note:
      'Named in the title of ANSI/IEEE C57.92 (p. 193) and as item 5.1.6 of the Appendix B form (p. 104). ' +
      'The bulletin does not state how much extra capacity a 65 °C rise unit has over a 55 °C unit; see Table 5-14 for the alarm limits that differ between the two.',
  },
};

export interface CoolingAirLimitRow {
  method: 'self-cooled' | 'forced-air' | 'forced-oil-with-oil-to-air-cooler';
  /** Max allowable average cooling-air temperature (°C) at 1000/2000/3000/4000 m (3300/6600/9900/13 200 ft). */
  maxAvgAirC: readonly [number, number, number, number];
}

/** Table 5-1: maximum allowable average temperature of cooling air for carrying rated kVA. */
export const TABLE_5_1_COOLING_AIR_LIMITS: Sourced<{
  altitudesM: readonly [number, number, number, number];
  altitudesFt: readonly [number, number, number, number];
  rows: readonly CoolingAirLimitRow[];
}> = {
  value: {
    altitudesM: [1000, 2000, 3000, 4000],
    altitudesFt: [3300, 6600, 9900, 13200],
    rows: [
      { method: 'self-cooled', maxAvgAirC: [30, 28, 25, 23] },
      { method: 'forced-air', maxAvgAirC: [30, 26, 23, 20] },
      { method: 'forced-oil-with-oil-to-air-cooler', maxAvgAirC: [30, 26, 23, 20] },
    ],
  },
  cite: {
    page: 193,
    section: '5.2.3.1',
    table: '5-1',
    originalSource: 'ANSI/IEEE Std. C57.92-1981, Table A1',
    note:
      'Average air temperature should be the mean of 24 consecutive hourly readings; for outdoor air the mean of the daily maximum and minimum may be used (usually no more than 0.3 °C high).',
  },
};

export interface KvaAltitudeDeratingRow {
  cooling: string;
  /** Derating factor, percent (see cite note for the altitude increment). */
  deratingPct: number;
}

/** Table 5-2: rated kVA correction (derating) factors for altitudes above 3300 ft (1000 m). */
export const TABLE_5_2_KVA_ALTITUDE_DERATING: Sourced<readonly KvaAltitudeDeratingRow[]> = {
  value: [
    { cooling: 'Liquid-immersed air-cooled', deratingPct: 0.4 },
    { cooling: 'Liquid-immersed water-cooled', deratingPct: 0.0 },
    { cooling: 'Liquid-immersed forced-air-cooled', deratingPct: 0.5 },
    { cooling: 'Liquid-immersed forced-liquid-cooled with liquid-to-air cooler', deratingPct: 0.5 },
    { cooling: 'Liquid-immersed forced-liquid-cooled with liquid-to-water cooler', deratingPct: 0.0 },
  ],
  cite: {
    page: 193,
    section: '5.2.3.1',
    table: '5-2',
    originalSource: 'ANSI/IEEE Std. C57.92-1981, Appendix',
    note:
      'UNCERTAIN: Table 5-2 prints only "Derating Factor (%)" without the altitude increment. The regulator table built the same way ' +
      '(Table 5-34, p. 261, from C57.95) gives the same 0.4 % / 0.5 % values "for each 100 m above 1000 m", so per 100 m (330 ft) above 1000 m is the likely basis.',
  },
};

/**
 * Multiplier on rated kVA at altitude, assuming the Table 5-2 percentage applies per 100 m above 1000 m
 * (UNCERTAIN, see TABLE_5_2_KVA_ALTITUDE_DERATING note). `forced` selects the forced-air / forced-oil-to-air value.
 */
export function transformerAltitudeKvaFactor(altitudeM: number, forced: boolean): number {
  if (altitudeM <= 1000) return 1;
  const pctPer100m = forced ? 0.5 : 0.4;
  return 1 - ((altitudeM - 1000) / 100) * (pctPer100m / 100);
}

// ---------------------------------------------------------------------------
// Voltage and kVA ratings (Tables 5-3 .. 5-6)
// ---------------------------------------------------------------------------

/** Operating-voltage limits quoted from ANSI/IEEE C57.12.10 in §5.2.3.3. */
export const OPERATING_VOLTAGE_LIMITS: Sourced<{
  /** Max operating voltage or volts/hertz, percent of rated secondary tap, at nameplate load with PF >= 80 % and frequency >= 95 %. */
  loadedMaxPctOfTap: number;
  minLoadPowerFactorPct: number;
  minFrequencyPct: number;
  /** Max continuous voltage at no load, percent of rated secondary tap. */
  noLoadMaxPctOfTap: number;
}> = {
  value: { loadedMaxPctOfTap: 105, minLoadPowerFactorPct: 80, minFrequencyPct: 95, noLoadMaxPctOfTap: 110 },
  cite: {
    page: 194,
    section: '5.2.3.3',
    originalSource: 'ANSI/IEEE Std. C57.12.10',
    note: 'Multiwinding transformers and autotransformers may be restricted further by their purchase specification.',
  },
};

/** A range of self-cooled (OA) kVA ratings as printed in Tables 5-3..5-6. */
export interface KvaRange {
  /** Lowest OA rating in the range, kVA. */
  minKVA: number;
  /** Highest OA rating in the range, kVA. */
  maxKVA: number;
  /**
   * When present, only these ratings are included (the table separates them with commas).
   * Otherwise "all intervening ratings listed in Table 1" of the standard are included; that list is NOT reproduced in the bulletin.
   */
  only?: readonly number[];
}

export interface KvaRangeRow {
  /** High-voltage rating(s) as printed, volts (delta unless marked Y). */
  hv: string;
  /** One entry per low-voltage column (same order as the table's `lvColumns`); null where the table prints a dash. */
  kva: readonly (KvaRange | null)[];
}

export interface KvaRangeTable {
  table: string;
  phases: 1 | 3;
  loadTapChanging: 'without' | 'with' | 'with-or-without';
  /** Low-voltage column headings as printed (volts). "[sic]" marks apparent misprints. */
  lvColumns: readonly string[];
  rows: readonly KvaRangeRow[];
  cite: Citation;
}

const r = (minKVA: number, maxKVA: number): KvaRange => ({ minKVA, maxKVA });
const only = (...v: number[]): KvaRange => ({ minKVA: Math.min(...v), maxKVA: Math.max(...v), only: v });

const KVA_TABLE_NOTE =
  'All voltages are delta unless marked. Dash-separated ranges include all intervening ratings of the standard\'s Table 1, which the bulletin does not reproduce. ' +
  'Bold/italic marking of C84.1 voltages in the original is not transcribed.';

/** Table 5-3: single-phase transformers, 833-8333 kVA. */
export const TABLE_5_3_SINGLE_PHASE_KVA: KvaRangeTable = {
  table: '5-3',
  phases: 1,
  loadTapChanging: 'without',
  lvColumns: [
    '480',
    '2400/4160Y, 2520/4360Y, 4800/8320Y, 5040/8720Y',
    '6900/11 950Y, 8355/23 085PW [sic], 7560/13 090Y, 7620/13 200Y, 7970/13 800Y',
    '23 555W [sic], 12 600, 13 200, 13 800, 14 400',
    '14 400/24 940Y, 34 500, 19 920/34 500Y, 20 920/36 230',
  ],
  rows: [
    { hv: '2400/4160Y', kva: [only(833), null, null, null, null] },
    { hv: '4800/8320Y', kva: [only(833), null, null, null, null] },
    { hv: '6900/11 950Y', kva: [only(833, 1250), r(833, 2500), null, null, null] },
    { hv: '6930/12 000Y', kva: [null, null, null, null, null] },
    { hv: '7200/12 470Y', kva: [null, null, null, null, null] },
    { hv: '7620/13 200Y', kva: [null, null, null, null, null] },
    { hv: '7970/13 800Y', kva: [null, null, null, null, null] },
    { hv: '12 000, 13 200, 13 800', kva: [null, null, null, null, null] },
    { hv: '23 000', kva: [only(833, 1250), r(833, 2500), r(833, 2500), null, null] },
    { hv: '34 500', kva: [only(833, 1250), r(833, 2500), r(833, 3333), r(833, 3333), null] },
    { hv: '46 000', kva: [only(833, 1250), r(833, 2500), r(833, 8333), r(833, 3333), null] },
    { hv: '69 000', kva: [null, r(833, 2500), r(833, 8333), r(833, 3333), null] },
    { hv: '115 000', kva: [null, only(2500), r(2500, 8333), r(2500, 8333), r(2500, 8333)] },
    { hv: '138 000', kva: [null, only(2500), r(2500, 8333), r(2500, 8333), r(2500, 8333)] },
  ],
  cite: {
    page: 194,
    section: '5.2.3.3',
    table: '5-3',
    originalSource: 'ANSI/IEEE Std. C57.12.10-1988, Table 3',
    note: KVA_TABLE_NOTE,
  },
};

/** Table 5-4: three-phase transformers without load tap changing, 750-10 000 kVA. */
export const TABLE_5_4_THREE_PHASE_NO_LTC_KVA: KvaRangeTable = {
  table: '5-4',
  phases: 3,
  loadTapChanging: 'without',
  lvColumns: [
    '480Y/277, 480',
    '2400, 2520, 4160Y/2400, 4360Y/2520',
    '4800, 5040, 8320Y/4800, 8720Y/5040',
    '6900, 7200, 7560, 12 407Y/7200 [sic, = 12 470Y/7200], 13 090Y/7560, 13 200Y/7620, 13 800Y/7970',
    '13 800, 12 000, 12 600, 13 200, 14 400',
    '24 940Grd/14 000 [sic, likely 24 940GrdY/14 400], 34 500, 34 500GrdY/19 920, 36 230GrdY/20 920',
  ],
  rows: [
    { hv: '2400', kva: [r(750, 1500), null, null, null, null, null] },
    { hv: '4160, 4800', kva: [r(750, 1500), null, null, null, null, null] },
    { hv: '6900, 7200', kva: [r(750, 2500), r(1000, 3750), null, null, null, null] },
    { hv: '12 000', kva: [r(750, 2500), r(1000, 7500), null, null, null, null] },
    { hv: '12 470', kva: [null, null, null, null, null, null] },
    { hv: '13 200', kva: [null, null, null, null, null, null] },
    { hv: '13 800', kva: [null, null, null, null, null, null] },
    { hv: '23 000', kva: [null, r(1000, 7500), r(1000, 10000), r(1000, 10000), null, null] },
    { hv: '34 500', kva: [null, r(1000, 7500), r(1000, 10000), r(1000, 10000), r(1000, 10000), null] },
    { hv: '46 000', kva: [null, r(1500, 7500), r(1500, 10000), r(1500, 10000), r(1500, 10000), null] },
    { hv: '69 000', kva: [null, r(1500, 7500), r(1500, 10000), r(1500, 10000), r(1500, 10000), null] },
    { hv: '115 000', kva: [null, r(5000, 7500), r(5000, 10000), r(5000, 10000), r(5000, 10000), r(5000, 10000)] },
    { hv: '138 000', kva: [null, r(5000, 7500), r(5000, 10000), r(5000, 10000), r(5000, 10000), r(5000, 10000)] },
  ],
  cite: {
    page: 195,
    section: '5.2.3.3',
    table: '5-4',
    originalSource: 'ANSI/IEEE Std. C57.12.10-1988, Table 4',
    note: KVA_TABLE_NOTE,
  },
};

/** Table 5-5: three-phase transformers with load tap changing, 3750-10 000 kVA. */
export const TABLE_5_5_THREE_PHASE_LTC_KVA: KvaRangeTable = {
  table: '5-5',
  phases: 3,
  loadTapChanging: 'with',
  lvColumns: [
    '2400, 2520, 4160Y/2400, 4360Y/2520',
    '4800, 5040, 8320Y/4800, 8720Y/5040',
    '6900, 7200, 7560, 12 470Y/7200, 13 090Y/7560, 13 200Y/7620, 13 800Y/7970',
    '13 800, 12 000, 12 600, 13 200, 14 400',
    '24940Grd/14000 [sic, likely 24 940GrdY/14 400]',
    '34 500, 34 500GrdY/19 920, 36 230GrdY/20 920 (heading also repeats 24 940Grd/14 000)',
  ],
  rows: [
    { hv: '6900, 7200', kva: [only(3750), null, null, null, null, null] },
    { hv: '12 000', kva: [r(3750, 7500), null, null, null, null, null] },
    { hv: '12 470', kva: [null, null, null, null, null, null] },
    { hv: '13 200', kva: [null, null, null, null, null, null] },
    { hv: '13 800', kva: [null, null, null, null, null, null] },
    { hv: '23 000', kva: [r(3750, 7500), r(3750, 10000), r(3750, 10000), null, null, null] },
    { hv: '34 500', kva: [r(3750, 7500), r(3750, 10000), r(3750, 10000), r(3750, 10000), null, null] },
    { hv: '46 000', kva: [r(3750, 7500), r(3750, 10000), r(3750, 10000), r(3750, 10000), null, null] },
    { hv: '69 000', kva: [r(3750, 7500), r(3750, 10000), r(3750, 10000), r(3750, 10000), null, null] },
    { hv: '115 000', kva: [r(5000, 7500), r(5000, 10000), r(5000, 10000), r(5000, 10000), r(5000, 10000), r(5000, 10000)] },
    { hv: '138 000', kva: [r(5000, 7500), r(5000, 10000), r(5000, 10000), r(5000, 10000), r(5000, 10000), r(5000, 10000)] },
  ],
  cite: {
    page: 196,
    section: '5.2.3.3',
    table: '5-5',
    originalSource: 'ANSI/IEEE Std. C57.12.10-1988, Table 5',
    note: KVA_TABLE_NOTE,
  },
};

/** Table 5-6: three-phase transformers with or without load tap changing, 12 000-60 000 kVA. */
export const TABLE_5_6_THREE_PHASE_LARGE_KVA: KvaRangeTable = {
  table: '5-6',
  phases: 3,
  loadTapChanging: 'with-or-without',
  lvColumns: [
    '4800, 5040, 8320Y/4800, 8720Y/5040',
    '6900, 7200, 7560, 12 407Y/7200 [sic, = 12 470Y/7200], 13 090Y/7560, 13 200Y/7620, 13 800Y/7970',
    '12 000, 12 600, 13 200, 13 800, 14 400',
    '24 940GrdY/14 400',
    '34 500, 34 500GrdY/19 920, 36 230GrdY/20 920',
  ],
  rows: [
    { hv: '23 000', kva: [r(12000, 15000), r(12000, 30000), null, null, null] },
    { hv: '34 500', kva: [r(12000, 15000), r(12000, 30000), r(12000, 30000), null, null] },
    { hv: '46 000', kva: [r(12000, 15000), r(12000, 30000), r(12000, 30000), null, null] },
    { hv: '69 000', kva: [r(12000, 15000), r(12000, 30000), r(12000, 30000), null, null] },
    { hv: '115 000', kva: [r(12000, 15000), r(12000, 60000), r(12000, 60000), r(12000, 60000), r(12000, 60000)] },
    { hv: '138 000', kva: [r(12000, 15000), r(12000, 60000), r(12000, 60000), r(12000, 60000), r(12000, 60000)] },
    { hv: '161 000', kva: [r(12000, 15000), r(12000, 60000), r(12000, 60000), r(12000, 60000), r(12000, 60000)] },
    { hv: '230 000', kva: [r(12000, 15000), r(12000, 60000), r(12000, 60000), r(12000, 60000), r(12000, 60000)] },
  ],
  cite: {
    page: 197,
    section: '5.2.3.3',
    table: '5-6',
    originalSource: 'ANSI/IEEE Std. C57.12.10-1988, Table 6',
    note: KVA_TABLE_NOTE,
  },
};

/**
 * Three-phase OA kVA values that actually appear in the bulletin (as table range end points or in the text).
 * The complete preferred-rating list (C57.12.00 / C57.12.10 "Table 1") is NOT in the bulletin.
 */
export const THREE_PHASE_KVA_VALUES_IN_BULLETIN: readonly { kva: number; cite: Citation }[] = [
  { kva: 750, cite: { page: [192, 195], section: '5.2.2', table: '5-4' } },
  { kva: 1000, cite: { page: 195, table: '5-4' } },
  { kva: 1500, cite: { page: 195, table: '5-4' } },
  { kva: 2000, cite: { page: 192, section: '5.2.2', note: 'Upper end of the 15 % forced-air rule.' } },
  { kva: 2500, cite: { page: [192, 195], section: '5.2.2', table: '5-4' } },
  { kva: 3750, cite: { page: [195, 196], table: '5-4, 5-5' } },
  { kva: 5000, cite: { page: [195, 196], table: '5-4, 5-5' } },
  { kva: 7500, cite: { page: [195, 196], table: '5-4, 5-5' } },
  { kva: 10000, cite: { page: [195, 196], table: '5-4, 5-5' } },
  { kva: 12000, cite: { page: 197, table: '5-6' } },
  { kva: 15000, cite: { page: 197, table: '5-6' } },
  { kva: 20000, cite: { page: 214, section: '5.2.12.4', note: 'Used in the sound-level comparison example.' } },
  { kva: 30000, cite: { page: [197, 208], table: '5-6', section: '5.2.9.2' } },
  { kva: 60000, cite: { page: 197, table: '5-6' } },
];

// ---------------------------------------------------------------------------
// Insulation levels (Tables 5-7 .. 5-10)
// ---------------------------------------------------------------------------

export interface BilByVoltageRow {
  application: 'distribution' | 'power';
  nominalKV: number;
  /** Maximum system voltage, kV rms (only printed for 46 kV and above). */
  maxSystemKV: number | null;
  /** BILs in common use, kV crest, highest first as printed. */
  bilsKV: readonly number[];
  /** BILs printed in bold = listed as standard in one or more C57.12.xx standards (Table 5-7 note 1). */
  standardBilsKV: readonly number[];
}

/** Table 5-7: nominal system voltage vs maximum system voltage and BILs in common use (≤765 kV). */
export const TABLE_5_7_SYSTEM_VOLTAGE_BIL: Sourced<readonly BilByVoltageRow[]> = {
  value: [
    { application: 'distribution', nominalKV: 1.2, maxSystemKV: null, bilsKV: [30], standardBilsKV: [30] },
    { application: 'distribution', nominalKV: 2.5, maxSystemKV: null, bilsKV: [45], standardBilsKV: [45] },
    { application: 'distribution', nominalKV: 5.0, maxSystemKV: null, bilsKV: [60], standardBilsKV: [60] },
    { application: 'distribution', nominalKV: 8.7, maxSystemKV: null, bilsKV: [75], standardBilsKV: [75] },
    { application: 'distribution', nominalKV: 15.0, maxSystemKV: null, bilsKV: [95], standardBilsKV: [95] },
    { application: 'distribution', nominalKV: 25.0, maxSystemKV: null, bilsKV: [150, 125], standardBilsKV: [150, 125] },
    { application: 'distribution', nominalKV: 34.5, maxSystemKV: null, bilsKV: [200, 150, 125], standardBilsKV: [200, 150] },
    { application: 'distribution', nominalKV: 46.0, maxSystemKV: 48.3, bilsKV: [250, 200], standardBilsKV: [250] },
    { application: 'distribution', nominalKV: 69.0, maxSystemKV: 72.5, bilsKV: [350, 250], standardBilsKV: [350] },
    { application: 'power', nominalKV: 1.2, maxSystemKV: null, bilsKV: [45, 30], standardBilsKV: [45, 30] },
    { application: 'power', nominalKV: 2.5, maxSystemKV: null, bilsKV: [60, 45], standardBilsKV: [60, 45] },
    { application: 'power', nominalKV: 5.0, maxSystemKV: null, bilsKV: [75, 60], standardBilsKV: [75, 60] },
    { application: 'power', nominalKV: 8.7, maxSystemKV: null, bilsKV: [95, 75], standardBilsKV: [95, 75] },
    { application: 'power', nominalKV: 15.0, maxSystemKV: null, bilsKV: [110, 95], standardBilsKV: [110, 95] },
    { application: 'power', nominalKV: 25.0, maxSystemKV: null, bilsKV: [150], standardBilsKV: [150] },
    { application: 'power', nominalKV: 34.5, maxSystemKV: null, bilsKV: [200], standardBilsKV: [200] },
    { application: 'power', nominalKV: 46.0, maxSystemKV: 48.3, bilsKV: [250, 200], standardBilsKV: [250] },
    { application: 'power', nominalKV: 69.0, maxSystemKV: 72.5, bilsKV: [350, 250], standardBilsKV: [350] },
    { application: 'power', nominalKV: 115.0, maxSystemKV: 121.0, bilsKV: [550, 450, 350], standardBilsKV: [450] },
    { application: 'power', nominalKV: 138.0, maxSystemKV: 145.0, bilsKV: [650, 550, 450], standardBilsKV: [550] },
    { application: 'power', nominalKV: 161.0, maxSystemKV: 169.0, bilsKV: [750, 650, 550], standardBilsKV: [650] },
    { application: 'power', nominalKV: 230.0, maxSystemKV: 242.0, bilsKV: [900, 825, 750, 650], standardBilsKV: [750] },
    { application: 'power', nominalKV: 345.0, maxSystemKV: 362.0, bilsKV: [1175, 1050, 900], standardBilsKV: [] },
    { application: 'power', nominalKV: 500.0, maxSystemKV: 550.0, bilsKV: [1675, 1550, 1425, 1300], standardBilsKV: [] },
    { application: 'power', nominalKV: 765.0, maxSystemKV: 800.0, bilsKV: [2050, 1925, 1800], standardBilsKV: [] },
  ],
  cite: {
    page: 198,
    section: '5.2.3.4',
    table: '5-7',
    originalSource: 'IEEE Std. C57.12.00-1993, Table 3 (max voltages from ANSI C84.1-1989 and ANSI C92.2-1987)',
    note:
      'Bold marking read from the page image. Note 4: nominal values at 34.5 kV and below also cover nearby lesser voltages (e.g. 15 kV covers 12.47, 13.2, 13.8 kV, etc.).',
  },
};

/** Table 5-8: high-voltage winding BIL of single-phase transformers. */
export const TABLE_5_8_SINGLE_PHASE_HV_BIL: Sourced<readonly { hv: string; bilKV: number }[]> = {
  value: [
    { hv: '2400/4160Y', bilKV: 75 },
    { hv: '4800/8320Y', bilKV: 95 },
    { hv: '6900/11 950Y', bilKV: 110 },
    { hv: '7200/12 470Y', bilKV: 110 },
    { hv: '7620/13 200Y', bilKV: 110 },
    { hv: '12 000', bilKV: 110 },
    { hv: '13 200', bilKV: 110 },
    { hv: '13 800', bilKV: 110 },
    { hv: '23 000', bilKV: 150 },
    { hv: '34 500', bilKV: 200 },
    { hv: '46 000', bilKV: 250 },
    { hv: '69 000', bilKV: 350 },
    { hv: '115 000', bilKV: 450 },
    { hv: '138 000', bilKV: 550 },
  ],
  cite: { page: 199, section: '5.2.3.4', table: '5-8', originalSource: 'ANSI/IEEE Std. C57.12.10-1988, Table 7' },
};

export interface ThreePhaseHvBilRow {
  hvV: number;
  /** Distribution-transformer BIL, kV (null where not listed). Only applicable to non-LTC transformers (note 2). */
  distributionBilKV: number | null;
  powerBilKV: number;
}

/** Table 5-9: high-voltage winding BIL of three-phase transformers. */
export const TABLE_5_9_THREE_PHASE_HV_BIL: Sourced<readonly ThreePhaseHvBilRow[]> = {
  value: [
    { hvV: 2400, distributionBilKV: 45, powerBilKV: 60 },
    { hvV: 4160, distributionBilKV: 60, powerBilKV: 75 },
    { hvV: 4800, distributionBilKV: 60, powerBilKV: 75 },
    { hvV: 6900, distributionBilKV: 75, powerBilKV: 95 },
    { hvV: 7200, distributionBilKV: 75, powerBilKV: 95 },
    { hvV: 12000, distributionBilKV: 95, powerBilKV: 110 },
    { hvV: 13200, distributionBilKV: 95, powerBilKV: 110 },
    { hvV: 13800, distributionBilKV: 95, powerBilKV: 110 },
    { hvV: 23000, distributionBilKV: 125, powerBilKV: 150 },
    { hvV: 34500, distributionBilKV: 150, powerBilKV: 200 },
    { hvV: 46000, distributionBilKV: null, powerBilKV: 250 },
    { hvV: 69000, distributionBilKV: null, powerBilKV: 350 },
    { hvV: 115000, distributionBilKV: null, powerBilKV: 450 },
    { hvV: 138000, distributionBilKV: null, powerBilKV: 550 },
    { hvV: 161000, distributionBilKV: null, powerBilKV: 650 },
    { hvV: 230000, distributionBilKV: null, powerBilKV: 750 },
  ],
  cite: {
    page: 199,
    section: '5.2.3.4',
    table: '5-9',
    originalSource: 'ANSI/IEEE Std. C57.12.10-1988, Table 8',
    note: 'All voltages delta unless indicated. Distribution BILs apply only to non-load-tap-changing transformers.',
  },
};

export interface NeutralInsulationRow {
  nominalKV: number;
  /** Min low-frequency insulation at neutral, kV rms: solidly grounded, or grounded through a CT or regulating transformer. */
  solidlyGroundedKV: number;
  /** Same, when grounded through a ground-fault neutralizer or isolated but impulse protected. */
  neutralizerOrIsolatedKV: number;
}

/** Table 5-10: minimum insulation levels at the neutral. */
export const TABLE_5_10_NEUTRAL_INSULATION: Sourced<readonly NeutralInsulationRow[]> = {
  value: [
    { nominalKV: 1.2, solidlyGroundedKV: 10, neutralizerOrIsolatedKV: 10 },
    { nominalKV: 2.6, solidlyGroundedKV: 15, neutralizerOrIsolatedKV: 15 },
    { nominalKV: 5.0, solidlyGroundedKV: 19, neutralizerOrIsolatedKV: 19 },
    { nominalKV: 8.7, solidlyGroundedKV: 26, neutralizerOrIsolatedKV: 26 },
    { nominalKV: 15.0, solidlyGroundedKV: 26, neutralizerOrIsolatedKV: 26 },
    { nominalKV: 25.0, solidlyGroundedKV: 26, neutralizerOrIsolatedKV: 34 },
    { nominalKV: 34.5, solidlyGroundedKV: 26, neutralizerOrIsolatedKV: 50 },
    { nominalKV: 46.0, solidlyGroundedKV: 34, neutralizerOrIsolatedKV: 70 },
    { nominalKV: 69.0, solidlyGroundedKV: 34, neutralizerOrIsolatedKV: 95 },
  ],
  cite: {
    page: 200,
    section: '5.2.3.4',
    table: '5-10',
    originalSource: 'ANSI/IEEE Std. C57.12.00-1993, Table 7',
    note:
      'Second row printed as 2.6 kV (Table 5-7 uses 2.5 kV). For higher line voltages the neutral level is set by service requirements but never below 34 kV.',
  },
};

// ---------------------------------------------------------------------------
// Taps
// ---------------------------------------------------------------------------

/** No-load (de-energized) primary taps, §5.2.4. */
export const NO_LOAD_TAPS: Sourced<{
  totalRangePct: number;
  abovePct: number;
  belowPct: number;
  stepPct: number;
  /** Tap positions implied by the range and step (derived, not printed). */
  positionsPct: readonly number[];
  mustDeEnergizeToChange: boolean;
}> = {
  value: {
    totalRangePct: 10,
    abovePct: 5,
    belowPct: 5,
    stepPct: 2.5,
    positionsPct: [-5, -2.5, 0, 2.5, 5],
    mustDeEnergizeToChange: true,
  },
  cite: {
    page: 200,
    section: '5.2.4',
    originalSource: 'ANSI/IEEE Std. C57.12.10, paragraph 4.5 (individual tap voltages)',
    note: 'The bulletin says "usually" for the 10 % range and 2.5 % steps. All taps should be full-capacity.',
  },
};

// ---------------------------------------------------------------------------
// Impedance (§5.2.5, Table 5-11)
// ---------------------------------------------------------------------------

/** Manufacturing tolerance on specified impedance, ± percent of the specified value. */
export const IMPEDANCE_TOLERANCE_PCT: Sourced<{ twoWinding: number; multiwindingOrAuto: number }> = {
  value: { twoWinding: 7.5, multiwindingOrAuto: 10.0 },
  cite: { page: 201, section: '5.2.5' },
};

export interface StandardImpedanceRow {
  /** HV BIL range, kV (single value except the 60-110 kV row). */
  hvBilMinKV: number;
  hvBilMaxKV: number;
  /** %Z at OA rating, no LTC, 480 V low voltage (null = not listed). */
  noLtcLv480: number | null;
  /** %Z at OA rating, no LTC, low voltage 2400 V and above. */
  noLtcLv2400Up: number | null;
  /** %Z at OA rating, with LTC, low voltage 2400 V and above. */
  ltcLv2400Up: number | null;
}

/** Table 5-11: BILs and percentage impedance voltages at the self-cooled (OA) rating. */
export const TABLE_5_11_STANDARD_IMPEDANCE: Sourced<readonly StandardImpedanceRow[]> = {
  value: [
    { hvBilMinKV: 60, hvBilMaxKV: 110, noLtcLv480: 5.75, noLtcLv2400Up: 5.5, ltcLv2400Up: null },
    { hvBilMinKV: 150, hvBilMaxKV: 150, noLtcLv480: 6.75, noLtcLv2400Up: 6.5, ltcLv2400Up: 7.0 },
    { hvBilMinKV: 200, hvBilMaxKV: 200, noLtcLv480: 7.25, noLtcLv2400Up: 7.0, ltcLv2400Up: 7.5 },
    { hvBilMinKV: 250, hvBilMaxKV: 250, noLtcLv480: 7.75, noLtcLv2400Up: 7.5, ltcLv2400Up: 8.0 },
    { hvBilMinKV: 350, hvBilMaxKV: 350, noLtcLv480: null, noLtcLv2400Up: 8.0, ltcLv2400Up: 8.5 },
    { hvBilMinKV: 450, hvBilMaxKV: 450, noLtcLv480: null, noLtcLv2400Up: 8.5, ltcLv2400Up: 9.0 },
    { hvBilMinKV: 550, hvBilMaxKV: 550, noLtcLv480: null, noLtcLv2400Up: 9.0, ltcLv2400Up: 9.5 },
    { hvBilMinKV: 650, hvBilMaxKV: 650, noLtcLv480: null, noLtcLv2400Up: 9.5, ltcLv2400Up: 10.0 },
    { hvBilMinKV: 750, hvBilMaxKV: 750, noLtcLv480: null, noLtcLv2400Up: 10.0, ltcLv2400Up: 10.5 },
  ],
  cite: {
    page: 202,
    section: '5.2.5',
    table: '5-11',
    originalSource: 'ANSI/IEEE Std. C57.12.10-1988, Table 10 and Section 4.6',
    note:
      'Footnote: for transformers larger than 5000 kVA self-cooled, the 60-110 kV row takes the 150 kV BIL values. ' +
      'Tested %Z on any de-energized tap may not depart from the rated-tap value by more than the total tap range (not applicable to LTC taps).',
  },
};

/**
 * Standard %Z (OA base) from Table 5-11, or null where the table has no value.
 * `lvVolts` < 2400 selects the 480 V column. `oaKVA` applies the >5000 kVA footnote.
 */
export function standardImpedancePct(hvBilKV: number, lvVolts: number, withLTC: boolean, oaKVA = 0): number | null {
  const rows = TABLE_5_11_STANDARD_IMPEDANCE.value;
  let row = rows.find((x) => hvBilKV >= x.hvBilMinKV && hvBilKV <= x.hvBilMaxKV);
  if (!row) return null;
  if (row.hvBilMaxKV === 110 && oaKVA > 5000) row = rows[1];
  if (withLTC) return lvVolts >= 2400 ? row.ltcLv2400Up : null;
  return lvVolts < 2400 ? row.noLtcLv480 : row.noLtcLv2400Up;
}

// ---------------------------------------------------------------------------
// Phase relation (§5.2.6)
// ---------------------------------------------------------------------------

export const PHASE_RELATION: Sourced<{
  deltaWyeHvLeadsLvDeg: number;
  autotransformerShiftDeg: number;
  singlePhasePolarity: 'subtractive';
  hvBushingsLeftToRight: readonly string[];
  lvBushingsLeftToRight: readonly string[];
  tertiaryBushingsLeftToRight: readonly string[];
}> = {
  value: {
    deltaWyeHvLeadsLvDeg: 30,
    autotransformerShiftDeg: 0,
    singlePhasePolarity: 'subtractive',
    hvBushingsLeftToRight: ['H0', 'H1', 'H2', 'H3'],
    lvBushingsLeftToRight: ['X0', 'X1', 'X2', 'X3'],
    tertiaryBushingsLeftToRight: ['Y1', 'Y2', 'Y3'],
  },
  cite: {
    page: 201,
    section: '5.2.6',
    note:
      'Standard delta-wye or wye-delta step-down units: HV leads LV by 30°. Bushings are read left to right viewed from the LV side (H0/X0 only when required); ' +
      'tertiary bushings are read viewed from the side nearest them.',
  },
};

// ---------------------------------------------------------------------------
// Parallel operation (§5.2.7)
// ---------------------------------------------------------------------------

/** The bulletin's rule of thumb: nameplate impedances may differ by no more than 7.5 % of each other. */
export const PARALLEL_IMPEDANCE_MATCH_PCT: Sourced<number> = {
  value: 7.5,
  cite: {
    page: [203, 204],
    section: '5.2.7',
    note: 'Example: a 6 % unit can be paired with 5.55 % (0.925 × 6) to 6.45 % (1.075 × 6). §5.12.5.1 (p. 410) repeats the rule: 7 % -> 6.475-7.525 %.',
  },
};

/** True when `zOtherPct` lies within ±7.5 % (relative) of `zRefPct`, per §5.2.7. */
export function impedancesParallelCompatible(zRefPct: number, zOtherPct: number): boolean {
  const tol = (PARALLEL_IMPEDANCE_MATCH_PCT.value / 100) * zRefPct;
  return Math.abs(zOtherPct - zRefPct) <= tol + 1e-9;
}

export interface ParallelUnit {
  mva: number;
  /** Impedance on the unit's own base, percent. */
  impedancePct: number;
}

/**
 * Load division among transformers in parallel (Eqs. 5-1 and 5-2 generalized): each unit's share is
 * inversely proportional to its impedance on a common base. Returns MVA per unit, in input order.
 */
export function parallelLoadShareMVA(totalMVA: number, units: readonly ParallelUnit[], baseMVA = 100): number[] {
  const admittance = units.map((u) => 1 / ((u.impedancePct * baseMVA) / u.mva));
  const sum = admittance.reduce((a, b) => a + b, 0);
  return admittance.map((y) => (totalMVA * y) / sum);
}

/**
 * §5.2.7.1-5.2.7.3 worked example: 10 MVA (T1) and 25 MVA (T2) transformers sharing 30 MVA.
 * `printedMVA` are the bulletin's figures; `byEquationsMVA` are recomputed from Eqs. 5-1/5-2.
 */
export const PARALLEL_LOAD_SHARING_EXAMPLE = {
  cite: { page: [203, 204], section: '5.2.7', equation: '5-1, 5-2' } satisfies Citation,
  totalMVA: 30,
  baseMVA: 100,
  conditions: [
    {
      id: 'I',
      title: 'Larger transformer has the smaller impedance',
      t1: { mva: 10, impedancePct: 10 },
      t2: { mva: 25, impedancePct: 7 },
      z100Pct: { t1: 100, t2: 28 },
      printedMVA: { t1: 6.6, t2: 23.4 },
      byEquationsMVA: { t1: 6.6, t2: 23.4 },
      verdict: 'Both units within rating.',
    },
    {
      id: 'II',
      title: 'Smaller transformer has the smaller impedance',
      t1: { mva: 10, impedancePct: 7 },
      t2: { mva: 25, impedancePct: 10 },
      z100Pct: { t1: 70, t2: 40 },
      printedMVA: { t1: 10.9, t2: 10.1 },
      byEquationsMVA: { t1: 10.9, t2: 19.1 },
      verdict: 'T1 overloaded while T2 has capacity to spare.',
      note:
        'UNCERTAIN: the bulletin prints 10.1 MVA for T2, but Eqs. 5-1/5-2 (P1 + P2 = 30, P1/P2 = 40/70) give 19.1 MVA; 10.1 appears to be a misprint.',
    },
    {
      id: 'III',
      title: 'Equal impedances (8 % each) - preferred',
      t1: { mva: 10, impedancePct: 8 },
      t2: { mva: 25, impedancePct: 8 },
      z100Pct: { t1: 80, t2: 32 },
      printedMVA: { t1: 8.6, t2: 21.4 },
      byEquationsMVA: { t1: 8.6, t2: 21.4 },
      verdict: 'Each unit carries its share in proportion to its rating.',
    },
  ],
};

/** LTC paralleling control schemes the bulletin says may be evaluated (§5.2.7). */
export const LTC_PARALLELING_SCHEMES: Sourced<readonly string[]> = {
  value: ['Negative reactance method', 'Step-by-step method', 'Out-of-step switch method', 'Cross-current compensation method'],
  cite: { page: 204, section: '5.2.7' },
};

// ---------------------------------------------------------------------------
// Dielectric, short-circuit, cooling, sound
// ---------------------------------------------------------------------------

export const DIELECTRIC_FACTS: Sourced<{
  /** Switching-surge withstand is roughly this percent of BIL. */
  switchingSurgeWithstandPctOfBil: number;
  /** External insulation is derated about this percent per 1000 m above 1000 m. */
  externalInsulationDeratePctPer1000m: number;
  /** BSL design applies to transformers rated at or above this voltage, kV. */
  bslAppliesFromKV: number;
}> = {
  value: { switchingSurgeWithstandPctOfBil: 83, externalInsulationDeratePctPer1000m: 10, bslAppliesFromKV: 115 },
  cite: {
    page: [204, 207],
    section: '5.2.8',
    note: 'Switching surges are generally no problem for transformers rated 230 kV and below. Both percentages are stated as approximate.',
  },
};

/** RUS List of Materials (IP 202-1) coverage for step-down transformers (§5.2.9.2, §5.2.19). */
export const LIST_OF_MATERIALS_TRANSFORMER_LIMITS: Sourced<{
  singlePhaseMaxOaKVA: number;
  threePhaseMaxOaKVA: number;
  maxPrimaryKV: number;
  notListed: readonly string[];
}> = {
  value: {
    singlePhaseMaxOaKVA: 10000,
    threePhaseMaxOaKVA: 30000,
    maxPrimaryKV: 138,
    notListed: [
      'All substation power autotransformers',
      'All transformers with three or more windings',
      'Single-phase transformers above 10,000 kVA (OA) or 138 kV',
    ],
  },
  cite: {
    page: [208, 217],
    section: '5.2.9.2, 5.2.19',
    note: 'Cooperatives need not require short-circuit tests for listed transformers.',
  },
};

export const SHORT_CIRCUIT_TEST_FACTS: Sourced<{
  shortCircuitsApplied: number;
  ofWhichMaxAsymmetry: number;
  /** Minimum identical-design service experience accepted in lieu of a test, transformer-years. */
  minTransformerYearsExperience: number;
}> = {
  value: { shortCircuitsApplied: 6, ofWhichMaxAsymmetry: 2, minTransformerYearsExperience: 20 },
  cite: {
    page: [207, 208],
    section: '5.2.9.1, 5.2.9.2',
    originalSource: 'ANSI/IEEE Std. C57.12.90; C57.12.00 Section 7',
    note: 'Experience counts only for core-and-coil designs identical to the one specified, without major design-attributable failure.',
  },
};

/** Table 5-14: suggested alarm limits for transformer cooling, °C. */
export const TABLE_5_14_COOLING_ALARMS: Sourced<{
  insulation55C: { hottestSpotC: number; topOilC: number };
  insulation65C: { hottestSpotC: number; topOilC: number };
}> = {
  value: { insulation55C: { hottestSpotC: 95, topOilC: 70 }, insulation65C: { hottestSpotC: 105, topOilC: 80 } },
  cite: { page: 209, section: '5.2.10', table: '5-14' },
};

/** Sizes below which cooling tubes are usually not removable (varies by manufacturer). */
export const NONREMOVABLE_RADIATOR_BELOW_KVA: Sourced<{ threePhase: number; singlePhase: number }> = {
  value: { threePhase: 10000, singlePhase: 5000 },
  cite: { page: 210, section: '5.2.10' },
};

export const SOUND_FACTS: Sourced<{
  /** Attenuation per doubling of distance, dBA (approximate). */
  attenuationPerDistanceDoublingDb: number;
  /** Cost increase per dBA below NEMA standard level, percent (approximate). */
  costPctPerDbReduction: number;
  /** Practical limit of special low-sound designs with forced cooling, dBA below standard. */
  practicalReductionLimitDb: number;
  /** Example ordinance levels, dB. */
  ordinanceNightDb: number;
  ordinanceDayDb: number;
  /** Max reduction from barriers near the transformer, dB; total enclosure; partial barrier practical max. */
  barrierMaxDb: number;
  totalEnclosureDb: number;
  partialBarrierPracticalDb: number;
}> = {
  value: {
    attenuationPerDistanceDoublingDb: 6,
    costPctPerDbReduction: 1.5,
    practicalReductionLimitDb: 12,
    ordinanceNightDb: 45,
    ordinanceDayDb: 55,
    barrierMaxDb: 20,
    totalEnclosureDb: 40,
    partialBarrierPracticalDb: 15,
  },
  cite: { page: [212, 214], section: '5.2.12', note: 'The bulletin says all such values should be treated as approximations.' },
};

/** Columns of Table 5-15: 1 = OA/OW/FOW ratings; 2 = FA and FOA first-stage auxiliary cooling; 3 = straight FOA, FA/FOA second stage. */
export type SoundColumn = 1 | 2 | 3;

export interface SoundLevelRow {
  db: number;
  /** Equivalent two-winding kVA for columns 1-3, per BIL group (null = dash). */
  bil350AndBelow: readonly [number | null, number | null, number | null];
  bil450To650: readonly [number | null, number | null, number | null];
  bil750To825: readonly [number | null, number | null, number | null];
  bil900To1050: readonly [number | null, number | null, number | null];
}

const n = null;
/** Table 5-15 (oil-immersed power transformers), BIL groups up to 1050 kV. */
export const TABLE_5_15_POWER_TRANSFORMER_SOUND: Sourced<readonly SoundLevelRow[]> = {
  value: [
    { db: 57, bil350AndBelow: [700, n, n], bil450To650: [n, n, n], bil750To825: [n, n, n], bil900To1050: [n, n, n] },
    { db: 58, bil350AndBelow: [1000, n, n], bil450To650: [n, n, n], bil750To825: [n, n, n], bil900To1050: [n, n, n] },
    { db: 59, bil350AndBelow: [n, n, n], bil450To650: [700, n, n], bil750To825: [n, n, n], bil900To1050: [n, n, n] },
    { db: 60, bil350AndBelow: [1500, n, n], bil450To650: [1000, n, n], bil750To825: [n, n, n], bil900To1050: [n, n, n] },
    { db: 61, bil350AndBelow: [2000, n, n], bil450To650: [n, n, n], bil750To825: [n, n, n], bil900To1050: [n, n, n] },
    { db: 62, bil350AndBelow: [2500, n, n], bil450To650: [1500, n, n], bil750To825: [n, n, n], bil900To1050: [n, n, n] },
    { db: 63, bil350AndBelow: [3000, n, n], bil450To650: [2000, n, n], bil750To825: [n, n, n], bil900To1050: [n, n, n] },
    { db: 64, bil350AndBelow: [4000, n, n], bil450To650: [2500, n, n], bil750To825: [n, n, n], bil900To1050: [n, n, n] },
    { db: 65, bil350AndBelow: [5000, n, n], bil450To650: [3000, n, n], bil750To825: [n, n, n], bil900To1050: [n, n, n] },
    { db: 66, bil350AndBelow: [6000, n, n], bil450To650: [4000, n, n], bil750To825: [3000, n, n], bil900To1050: [n, n, n] },
    { db: 67, bil350AndBelow: [7500, 6250, n], bil450To650: [5000, 3750, n], bil750To825: [4000, 3125, n], bil900To1050: [n, n, n] },
    { db: 68, bil350AndBelow: [10000, 7500, n], bil450To650: [6000, 5000, n], bil750To825: [5000, 3750, n], bil900To1050: [n, n, n] },
    { db: 69, bil350AndBelow: [12500, 9375, n], bil450To650: [7500, 6250, n], bil750To825: [6000, 5000, n], bil900To1050: [n, n, n] },
    { db: 70, bil350AndBelow: [15000, 12500, n], bil450To650: [10000, 7500, n], bil750To825: [7500, 6250, n], bil900To1050: [n, n, n] },
    { db: 71, bil350AndBelow: [20000, 16667, n], bil450To650: [12500, 9375, n], bil750To825: [10000, 7500, n], bil900To1050: [n, n, n] },
    { db: 72, bil350AndBelow: [25000, 20000, 20800], bil450To650: [15000, 12500, n], bil750To825: [12500, 9375, n], bil900To1050: [n, n, n] },
    { db: 73, bil350AndBelow: [30000, 26667, 25000], bil450To650: [20000, 16667, n], bil750To825: [15000, 12500, n], bil900To1050: [12500, n, n] },
    { db: 74, bil350AndBelow: [40000, 33333, 33333], bil450To650: [25000, 20000, 20800], bil750To825: [20000, 16667, n], bil900To1050: [15000, n, n] },
    { db: 75, bil350AndBelow: [50000, 41667, 41667], bil450To650: [30000, 26667, 25000], bil750To825: [25000, 20000, 20800], bil900To1050: [20000, 16667, n] },
    { db: 76, bil350AndBelow: [60000, 50000, 50000], bil450To650: [40000, 33333, 33333], bil750To825: [30000, 26667, 25000], bil900To1050: [25000, 20000, 20800] },
    { db: 77, bil350AndBelow: [80000, 66667, 66667], bil450To650: [50000, 40000, 41667], bil750To825: [40000, 33333, 33333], bil900To1050: [30000, 26667, 25000] },
    { db: 78, bil350AndBelow: [100000, 83333, 83333], bil450To650: [60000, 53333, 50000], bil750To825: [50000, 40000, 41667], bil900To1050: [40000, 33333, 33333] },
    { db: 79, bil350AndBelow: [n, 100000, 100000], bil450To650: [80000, 66667, 66667], bil750To825: [60000, 53333, 50000], bil900To1050: [50000, 40000, 41667] },
    { db: 80, bil350AndBelow: [n, 133333, 133333], bil450To650: [100000, 80000, 83333], bil750To825: [80000, 66667, 66667], bil900To1050: [60000, 53333, 50000] },
    { db: 81, bil350AndBelow: [n, n, 166667], bil450To650: [n, 106667, 100000], bil750To825: [100000, 80000, 83333], bil900To1050: [80000, 66667, 66667] },
    { db: 82, bil350AndBelow: [n, n, 200000], bil450To650: [n, 133333, 133333], bil750To825: [n, 106667, 100000], bil900To1050: [100000, 80000, 83333] },
    { db: 83, bil350AndBelow: [n, n, 250000], bil450To650: [n, n, 166667], bil750To825: [n, 133333, 133333], bil900To1050: [n, 106667, 100000] },
    { db: 84, bil350AndBelow: [n, n, 300000], bil450To650: [n, n, 200000], bil750To825: [n, n, 166667], bil900To1050: [n, 133333, 133333] },
    { db: 85, bil350AndBelow: [n, n, 400000], bil450To650: [n, n, 250000], bil750To825: [n, n, 200000], bil900To1050: [n, n, 166667] },
    { db: 86, bil350AndBelow: [n, n, n], bil450To650: [n, n, 300000], bil750To825: [n, n, 250000], bil900To1050: [n, n, 200000] },
    { db: 87, bil350AndBelow: [n, n, n], bil450To650: [n, n, 400000], bil750To825: [n, n, 300000], bil900To1050: [n, n, 250000] },
    { db: 88, bil350AndBelow: [n, n, n], bil450To650: [n, n, n], bil750To825: [n, n, 400000], bil900To1050: [n, n, 300000] },
    { db: 89, bil350AndBelow: [n, n, n], bil450To650: [n, n, n], bil750To825: [n, n, n], bil900To1050: [n, n, 400000] },
  ],
  cite: {
    page: 213,
    section: '5.2.12.4',
    table: '5-15',
    originalSource: 'NEMA TR1-1993, Table 0-2',
    note:
      'Values are equivalent two-winding kVA (one half the sum of the kVA of all windings) at the given average sound level. For intermediate kVA use the level of the next larger kVA. ' +
      'Columns 2 and 3 are with auxiliary cooling running. Two misprints corrected from the column pattern (col 2 = 5/6 of col 1 one row earlier): ' +
      '350 kV group col 2 at 75 dB printed 41687 (stored 41667); 450-650 kV group col 2 at 76 dB printed 333333 (stored 33333). ' +
      'Groups for 1175 kV and 1300+ kV BIL are omitted. UNCERTAIN: the table footnote "Sixty-seven decibels for all kVA ratings equal to this or smaller" has no visible marker; ' +
      'it probably applies to the first column-2 entry (67 dB) of each group.',
  },
};

/**
 * NEMA standard average sound level (dB) from Table 5-15 for a two-winding kVA, HV BIL and cooling column.
 * Uses the "next larger kVA" rule; returns null when outside the transcribed table.
 * Check: 20,000 kVA, 350 kV BIL, first-stage FA (column 2) -> 72 dB, as stated on p. 214.
 */
export function transformerSoundLevelDb(kva: number, hvBilKV: number, column: SoundColumn): number | null {
  const key: keyof Omit<SoundLevelRow, 'db'> | null =
    hvBilKV <= 350 ? 'bil350AndBelow' : hvBilKV <= 650 ? 'bil450To650' : hvBilKV <= 825 ? 'bil750To825' : hvBilKV <= 1050 ? 'bil900To1050' : null;
  if (!key) return null;
  for (const row of TABLE_5_15_POWER_TRANSFORMER_SOUND.value) {
    const v = row[key][column - 1];
    if (v !== null && v >= kva) return row.db;
  }
  return null;
}

/** Table 5-16: liquid-immersed distribution and network transformers. */
export const TABLE_5_16_DISTRIBUTION_TRANSFORMER_SOUND: Sourced<readonly { kva: string; db: number }[]> = {
  value: [
    { kva: '0-50', db: 48 },
    { kva: '51-100', db: 51 },
    { kva: '101-300', db: 55 },
    { kva: '301-500', db: 56 },
    { kva: '750', db: 57 },
    { kva: '1000', db: 58 },
    { kva: '1500', db: 60 },
    { kva: '2000', db: 61 },
    { kva: '2500', db: 62 },
  ],
  cite: { page: 212, section: '5.2.12.4', table: '5-16', originalSource: 'NEMA TR1-1993, Table 0-3' },
};

// ---------------------------------------------------------------------------
// Field Guide guidance (paraphrased)
// ---------------------------------------------------------------------------

export const TRANSFORMER_GUIDANCE: readonly Guidance[] = [
  {
    id: 'xfmr-largest-item',
    text: 'The power transformer is usually the largest, heaviest and most expensive piece of equipment in a substation, so it deserves the most care in application and purchase.',
    cite: { page: 191, section: '5.2.1' },
    tags: ['transformer', 'cost'],
  },
  {
    id: 'xfmr-three-phase-vs-single',
    text: 'A three-phase unit costs roughly one-third less than four single-phase units (three plus a spare) and is cheaper to build and maintain; a mobile transformer can cover its outage risk.',
    cite: { page: 192, section: '5.2.2' },
    tags: ['transformer', 'cost', 'mobile'],
  },
  {
    id: 'xfmr-auto-ratio',
    text: 'Autotransformers are mainly attractive for voltage ratios up to about 3:1; they are smaller, lighter and more efficient but have lower impedance, no phase shift and complicate ground relaying.',
    cite: { page: 192, section: '5.2.2' },
    tags: ['transformer', 'autotransformer'],
  },
  {
    id: 'xfmr-capacity-study',
    text: 'Pick transformer kVA from an up-to-date engineering study that accounts for load cycle, load factor and ambient temperature (per ANSI/IEEE C57.92).',
    cite: { page: 193, section: '5.2.3.1' },
    tags: ['transformer', 'rating', 'load'],
  },
  {
    id: 'xfmr-altitude-tell-mfr',
    text: 'Cooling is less effective at altitude, so tell the manufacturer when the unit will run above 1000 m (3300 ft); multiwinding units with loads at different power factors may also need extra cooling.',
    cite: { page: 193, section: '5.2.3.1', table: '5-1, 5-2' },
    tags: ['transformer', 'altitude', 'cooling'],
  },
  {
    id: 'xfmr-standardize',
    text: 'Standardizing transformer sizes across the system simplifies spare parts, testing, maintenance and sparing.',
    cite: { page: 193, section: '5.2.3.1' },
    tags: ['transformer', 'maintenance'],
  },
  {
    id: 'xfmr-reduced-bil',
    text: 'On effectively grounded systems a BIL one step below full may suit transformers of 115 kV and above, but that is the user\'s responsibility and may need an insulation coordination study.',
    cite: { page: 200, section: '5.2.3.4' },
    tags: ['transformer', 'BIL', 'arrester'],
  },
  {
    id: 'xfmr-overload',
    text: 'A transformer can carry load above nameplate for limited periods; whether this shortens life depends on its temperatures (see ANSI/IEEE C57.92).',
    cite: { page: 200, section: '5.2.3.5' },
    tags: ['transformer', 'load'],
  },
  {
    id: 'xfmr-ltc-decision',
    text: 'Choose a load-tap-changing transformer only after analysing the loads\' voltage needs and comparing costs with alternatives such as separate regulators.',
    cite: { page: [200, 201], section: '5.2.4' },
    tags: ['transformer', 'LTC', 'regulator'],
  },
  {
    id: 'xfmr-impedance-tradeoff',
    text: 'Lower impedance improves regulation and efficiency but raises through-fault current, which can damage the transformer and forces higher fault ratings downstream; specify impedance as a compromise.',
    cite: { page: 201, section: '5.2.5' },
    tags: ['transformer', 'impedance', 'fault'],
  },
  {
    id: 'xfmr-small-standard-z',
    text: 'Distribution substation transformers of 500 kVA or smaller should use standard impedance, which makes them self-protecting against secondary faults.',
    cite: { page: 201, section: '5.2.5' },
    tags: ['transformer', 'impedance'],
  },
  {
    id: 'xfmr-orientation',
    text: 'Orient transformers and their connections so that every bus ends up with the correct phasing.',
    cite: { page: 201, section: '5.2.6' },
    tags: ['transformer', 'layout', 'phasing'],
  },
  {
    id: 'xfmr-parallel-not-recommended',
    text: 'Buying two smaller transformers to run in parallel instead of one full-size unit is generally not recommended: they cost more, lose more energy and need more structure.',
    cite: { page: 202, section: '5.2.7' },
    tags: ['transformer', 'parallel', 'cost'],
  },
  {
    id: 'xfmr-parallel-conditions',
    text: 'Transformers can run in parallel if impedances are of the same order on their own bases, taps and ratios essentially match, and polarity and phase displacement are or can be made alike.',
    cite: { page: 202, section: '5.2.7' },
    tags: ['transformer', 'parallel', 'design-check'],
  },
  {
    id: 'xfmr-parallel-protection',
    text: 'Protect paralleled transformers individually; protecting them as one unit reduces sensitivity and causes nuisance trips on energization.',
    cite: { page: [202, 203], section: '5.2.7' },
    tags: ['transformer', 'parallel', 'protection'],
  },
  {
    id: 'xfmr-parallel-taps',
    text: 'Unequal tap voltages on paralleled units drive a circulating current limited only by their series impedance; it is worst at no load and must be analysed.',
    cite: { page: 204, section: '5.2.7' },
    tags: ['transformer', 'parallel', 'taps'],
  },
  {
    id: 'xfmr-contamination',
    text: 'Heavy atmospheric contamination may call for higher bushing BIL, longer creepage, special porcelain treatment or washing; local experience is the best guide.',
    cite: { page: 207, section: '5.2.8' },
    tags: ['transformer', 'contamination', 'insulation'],
  },
  {
    id: 'xfmr-short-circuit-spec',
    text: 'For transformers not on the RUS List of Materials, require proof of short-circuit strength by a test on an identical design or by at least 20 transformer-years of identical-design service.',
    cite: { page: [208, 209], section: '5.2.9.2, 5.2.9.3' },
    tags: ['transformer', 'fault', 'specification'],
  },
  {
    id: 'xfmr-unusual-taps',
    text: 'Avoid specifying unusual taps or impedance unless essential; design changes can weaken short-circuit strength.',
    cite: { page: 208, section: '5.2.9.2' },
    tags: ['transformer', 'fault', 'specification'],
  },
  {
    id: 'xfmr-forced-cooling-reliability',
    text: 'Where forced cooling is relied on, make the fan and pump supply reliable (redundant source, overload protection, disconnects) and alarm on hot-spot and top-oil temperature.',
    cite: { page: 209, section: '5.2.10', table: '5-14' },
    tags: ['transformer', 'cooling', 'auxiliary-power'],
  },
  {
    id: 'xfmr-oil-preservation',
    text: 'Oil is protected by a sealed gas space, nitrogen blanket, conservator, or conservator with diaphragm or bladder; all work, but oil must be tested periodically.',
    cite: { page: 210, section: '5.2.11', figure: '5-1' },
    tags: ['transformer', 'oil', 'maintenance'],
  },
  {
    id: 'xfmr-noise-site',
    text: 'Avoid sites with a direct line of sight to likely complainants, especially low sites overlooked by homes on higher ground; mounds and shrubs mainly help how the station is perceived.',
    cite: { page: 210, section: '5.2.12.1, 5.2.12.2' },
    tags: ['transformer', 'noise', 'site'],
  },
  {
    id: 'xfmr-noise-barriers',
    text: 'Sound barriers close to the transformer can cut noise by up to about 20 dB (partial barriers about 15 dB, full enclosure about 40 dB) but must not hinder cooling or removal.',
    cite: { page: 214, section: '5.2.12.5' },
    tags: ['transformer', 'noise', 'layout'],
  },
  {
    id: 'xfmr-dielectric-tests',
    text: 'Dielectric tests on units up to 10,000 kVA (OA) are usually manufacturer quality checks without a report; above that, specify ANSI tests with an official report, including partial discharge.',
    cite: { page: 215, section: '5.2.15.1', table: '5-18' },
    tags: ['transformer', 'testing'],
  },
  {
    id: 'xfmr-shipping',
    text: 'Fit impact recorders for shipment and inspect the interior on arrival; large units ship without oil under nitrogen or dry air, so tanks must be purged before anyone enters.',
    cite: { page: 216, section: '5.2.16' },
    tags: ['transformer', 'shipping', 'safety'],
  },
  {
    id: 'xfmr-warranty',
    text: 'Transformer warranties typically run one to five years or more; standard warranties exclude field removal and transport, which extended warranties can cover.',
    cite: { page: 216, section: '5.2.17' },
    tags: ['transformer', 'cost'],
  },
  {
    id: 'xfmr-loss-evaluation',
    text: 'Include a loss-evaluation method (RUS Bulletin 1724E-301) in the bid request so offers can be compared on total cost.',
    cite: { page: 217, section: '5.2.19' },
    tags: ['transformer', 'cost', 'specification'],
  },
];
