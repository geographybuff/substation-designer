/**
 * Power circuit breaker data from RUS Bulletin 1724E-300 §5.3 (pp. 219-245), with a few
 * metal-clad switchgear facts from §5.4 (pp. 245-252).
 *
 * Covers: breaker types (Table 5-19), preferred ratings (Tables 5-20..5-24, from ANSI/IEEE
 * C37.06-1997), related required capabilities and the voltage-range-factor K example,
 * altitude correction (Table 5-25), operating mechanisms, control voltages (Table 5-26),
 * tests, purchase and installation notes, and metal-clad switchgear ratings (Table 5-27).
 * Guidance text is paraphrased; tables keep only their numeric content.
 */
import type { Citation, Guidance, Sourced } from './types';

// ---------------------------------------------------------------------------
// Types of breakers
// ---------------------------------------------------------------------------

export type InterruptingMedium = 'oil' | 'air' | 'gas' | 'vacuum';

export interface BreakerTypeAvailability {
  location: 'outdoor' | 'indoor';
  construction: string;
  media: readonly InterruptingMedium[];
}

/** Table 5-19: known availability of breaker types by interrupting medium. */
export const TABLE_5_19_BREAKER_TYPES: Sourced<readonly BreakerTypeAvailability[]> = {
  value: [
    { location: 'outdoor', construction: 'Dead tank, single tank', media: ['oil', 'gas', 'vacuum'] },
    { location: 'outdoor', construction: 'Dead tank, three tank', media: ['oil', 'gas', 'vacuum'] },
    { location: 'outdoor', construction: 'Live tank', media: [] },
    { location: 'indoor', construction: '(heading row)', media: ['gas'] },
    { location: 'indoor', construction: 'Dead tank', media: ['oil', 'gas', 'vacuum'] },
  ],
  cite: {
    page: 221,
    section: '5.3.2',
    table: '5-19',
    note:
      'Footnote: oil breakers are only available remanufactured or used. UNCERTAIN: as printed, the outdoor "Live Tank" row is empty and a single "Gas" mark sits on the "Indoor" heading line; ' +
      'it very likely belongs to the live-tank row (the text says most breakers above 242 kV are live tank and SF6 is common from 34.5 to 765 kV).',
  },
};

export const BREAKER_CONSTRUCTION_FACTS: readonly Guidance[] = [
  {
    id: 'cb-dead-tank',
    text: 'In a dead-tank breaker the tank and accessories are at ground potential and the line connections enter through bushings.',
    cite: { page: 221, section: '5.3.2', figure: '5-2' },
    tags: ['breaker', 'construction'],
  },
  {
    id: 'cb-live-tank',
    text: 'In a live-tank breaker the interrupter housing sits on an insulating porcelain column at line potential; most breakers above 242 kV are live tank, though some dead-tank units are used.',
    cite: { page: 221, section: '5.3.2', figure: '5-3' },
    tags: ['breaker', 'construction'],
  },
  {
    id: 'cb-pole-operation',
    text: 'Three-pole breakers gang all poles to one mechanism; independent-pole breakers have a mechanism per pole. Most U.S. breakers use three-pole operation.',
    cite: { page: [221, 238], section: '5.3.2, 5.3.4', figure: '5-4, 5-5' },
    tags: ['breaker', 'mechanism'],
  },
  {
    id: 'cb-vacuum-range',
    text: 'Most outdoor distribution breakers from 2.4 kV to 24.9 kV are vacuum; outdoor vacuum breakers are available up to 38 kV.',
    cite: { page: 221, section: '5.3.2', figure: '5-6' },
    tags: ['breaker', 'vacuum', 'selection'],
  },
  {
    id: 'cb-sf6-range',
    text: 'SF6 is more common from 34.5 kV to 765 kV. SF6 breakers come in single-tank designs from 15 to 242 kV and three-tank designs from 15 to 800 kV, with the trend toward three-tank.',
    cite: { page: [221, 226], section: '5.3.2' },
    tags: ['breaker', 'SF6', 'selection'],
  },
  {
    id: 'cb-sf6-mechanisms',
    text: 'SF6 breakers are offered with pneumatic, hydraulic or spring mechanisms; most require bushing removal to inspect the interrupter.',
    cite: { page: 226, section: '5.3.2' },
    tags: ['breaker', 'SF6', 'maintenance'],
  },
  {
    id: 'cb-oil-phaseout',
    text: 'Oil breakers are being phased out in favor of SF6 and vacuum and are sold only as used or reconditioned units.',
    cite: { page: [221, 226], section: '5.3.2', table: '5-19' },
    tags: ['breaker', 'oil'],
  },
  {
    id: 'cb-no-general-rule',
    text: 'There is no general rule for choosing a breaker type: set the required ratings, then pick a type by performance, fit with the substation arrangement, ability to install and maintain it, and cost.',
    cite: { page: 221, section: '5.3.2' },
    tags: ['breaker', 'selection'],
  },
];

// ---------------------------------------------------------------------------
// Preferred ratings (Tables 5-20 .. 5-24)
// ---------------------------------------------------------------------------

export interface OutdoorBreakerRatingLow {
  line: number;
  /** Rated maximum voltage, kV rms. */
  ratedMaxKV: number;
  /** Rated voltage range factor K. */
  k: number;
  /** Available rated continuous currents, A rms. */
  continuousA: readonly number[];
  /** Rated short-circuit and short-time current, kA rms. */
  shortCircuitKA: number;
  /** Rated TRV peak voltage E2, kV peak. */
  trvE2KVPeak: number;
  /** Rated TRV time to peak T2, µs. */
  trvT2Us: number;
  /** Rated interrupting time, ms. */
  interruptingTimeMs: number;
  /** Rated permissible tripping delay Y, s. */
  trippingDelayS: number;
  /** Rated closing and latching current, kA peak. */
  closingLatchingKAPeak: number;
}

const NOTES_5_20_5_23_5_24 =
  'Notes (p. 234): 60 Hz ratings; currents rounded to the nearest kA (two significant figures below 10 kA); closing and latching current (kA peak) = 2.6 × rated short-circuit current ' +
  '(1.55 × as kA rms total); interrupting time is the maximum from trip-coil energization to interruption and may be exceeded under conditions in C37.04; ' +
  'TRV may be more severe when fed from a single transformer bank without substantial capacitance or loaded feeders on the source side.';

/** Table 5-23: preferred ratings for outdoor circuit breakers 72.5 kV and below (incl. GIS). */
export const TABLE_5_23_OUTDOOR_72_5_KV_AND_BELOW: Sourced<readonly OutdoorBreakerRatingLow[]> = {
  value: [
    { line: 1, ratedMaxKV: 15.5, k: 1.0, continuousA: [600, 1200], shortCircuitKA: 12.5, trvE2KVPeak: 29, trvT2Us: 36, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 33 },
    { line: 2, ratedMaxKV: 15.5, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 20.0, trvE2KVPeak: 29, trvT2Us: 36, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 52 },
    { line: 3, ratedMaxKV: 15.5, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 25.0, trvE2KVPeak: 29, trvT2Us: 36, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 65 },
    { line: 4, ratedMaxKV: 15.5, k: 1.0, continuousA: [1200, 2000, 3000], shortCircuitKA: 40.0, trvE2KVPeak: 29, trvT2Us: 36, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 104 },
    { line: 5, ratedMaxKV: 25.8, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 12.5, trvE2KVPeak: 48.5, trvT2Us: 52, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 33 },
    { line: 6, ratedMaxKV: 25.8, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 25.0, trvE2KVPeak: 48.5, trvT2Us: 52, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 65 },
    { line: 7, ratedMaxKV: 38.0, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 16.0, trvE2KVPeak: 71, trvT2Us: 63, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 42 },
    { line: 8, ratedMaxKV: 38.0, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 20.0, trvE2KVPeak: 71, trvT2Us: 63, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 52 },
    { line: 9, ratedMaxKV: 38.0, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 25.0, trvE2KVPeak: 71, trvT2Us: 63, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 65 },
    { line: 10, ratedMaxKV: 38.0, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 31.5, trvE2KVPeak: 71, trvT2Us: 63, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 82 },
    { line: 11, ratedMaxKV: 38.0, k: 1.0, continuousA: [1200, 2000, 3000], shortCircuitKA: 40.0, trvE2KVPeak: 71, trvT2Us: 63, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 104 },
    { line: 12, ratedMaxKV: 48.3, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 20.0, trvE2KVPeak: 91, trvT2Us: 80, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 52 },
    { line: 13, ratedMaxKV: 48.3, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 31.5, trvE2KVPeak: 91, trvT2Us: 80, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 82 },
    { line: 14, ratedMaxKV: 48.3, k: 1.0, continuousA: [1200, 2000, 3000], shortCircuitKA: 40.0, trvE2KVPeak: 91, trvT2Us: 80, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 104 },
    { line: 15, ratedMaxKV: 72.5, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 20.0, trvE2KVPeak: 136, trvT2Us: 106, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 52 },
    { line: 16, ratedMaxKV: 72.5, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 31.5, trvE2KVPeak: 136, trvT2Us: 106, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 82 },
    { line: 17, ratedMaxKV: 72.5, k: 1.0, continuousA: [1200, 2000, 3000], shortCircuitKA: 40.0, trvE2KVPeak: 136, trvT2Us: 106, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 104 },
  ],
  cite: {
    page: [232, 234],
    section: '5.3.3',
    table: '5-23',
    originalSource: 'ANSI/IEEE Std. C37.06-1997, Table 2',
    note: 'TRV envelope is "one-minus-cosine". ' + NOTES_5_20_5_23_5_24,
  },
};

export interface OutdoorBreakerRatingHigh {
  line: number;
  ratedMaxKV: number;
  k: number;
  continuousA: readonly number[];
  shortCircuitKA: number;
  /** Rated TRV time to peak T2, µs. */
  trvT2Us: number;
  /** Rated TRV rate R, kV/µs. */
  trvRateKVPerUs: number;
  /** Rated TRV delay time T1, µs. */
  trvDelayT1Us: number;
  interruptingTimeMs: number;
  trippingDelayS: number;
  closingLatchingKAPeak: number;
}

/** Table 5-24: preferred ratings for outdoor circuit breakers 121 kV and above (incl. GIS). */
export const TABLE_5_24_OUTDOOR_121_KV_AND_ABOVE: Sourced<readonly OutdoorBreakerRatingHigh[]> = {
  value: [
    { line: 1, ratedMaxKV: 123, k: 1.0, continuousA: [1200], shortCircuitKA: 20, trvT2Us: 275, trvRateKVPerUs: 1.7, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 52 },
    { line: 2, ratedMaxKV: 123, k: 1.0, continuousA: [1600, 2000, 3000], shortCircuitKA: 40, trvT2Us: 260, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 104 },
    { line: 3, ratedMaxKV: 123, k: 1.0, continuousA: [2000, 3000], shortCircuitKA: 63, trvT2Us: 260, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 164 },
    { line: 4, ratedMaxKV: 145, k: 1.0, continuousA: [1200], shortCircuitKA: 20, trvT2Us: 330, trvRateKVPerUs: 1.7, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 52 },
    { line: 5, ratedMaxKV: 145, k: 1.0, continuousA: [1600, 2000, 3000], shortCircuitKA: 40, trvT2Us: 310, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 104 },
    { line: 6, ratedMaxKV: 145, k: 1.0, continuousA: [2000, 3000], shortCircuitKA: 63, trvT2Us: 310, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 164 },
    { line: 7, ratedMaxKV: 145, k: 1.0, continuousA: [2000, 3000], shortCircuitKA: 80, trvT2Us: 310, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 208 },
    { line: 8, ratedMaxKV: 170, k: 1.0, continuousA: [1200], shortCircuitKA: 16, trvT2Us: 395, trvRateKVPerUs: 1.7, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 42 },
    { line: 9, ratedMaxKV: 170, k: 1.0, continuousA: [1600], shortCircuitKA: 31.5, trvT2Us: 360, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 82 },
    { line: 10, ratedMaxKV: 170, k: 1.0, continuousA: [2000], shortCircuitKA: 40, trvT2Us: 360, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 104 },
    { line: 11, ratedMaxKV: 170, k: 1.0, continuousA: [2000], shortCircuitKA: 50, trvT2Us: 360, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 130 },
    { line: 12, ratedMaxKV: 170, k: 1.0, continuousA: [2000], shortCircuitKA: 63, trvT2Us: 360, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 164 },
    { line: 13, ratedMaxKV: 245, k: 1.0, continuousA: [1600, 2000, 3000], shortCircuitKA: 31.5, trvT2Us: 520, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 82 },
    { line: 14, ratedMaxKV: 245, k: 1.0, continuousA: [2000, 3000], shortCircuitKA: 40, trvT2Us: 520, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 104 },
    { line: 15, ratedMaxKV: 245, k: 1.0, continuousA: [2000], shortCircuitKA: 50, trvT2Us: 520, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 130 },
    { line: 16, ratedMaxKV: 245, k: 1.0, continuousA: [2000, 3000], shortCircuitKA: 63, trvT2Us: 520, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 50, trippingDelayS: 1, closingLatchingKAPeak: 164 },
    { line: 17, ratedMaxKV: 362, k: 1.0, continuousA: [2000, 3000], shortCircuitKA: 40, trvT2Us: 775, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 33, trippingDelayS: 1, closingLatchingKAPeak: 104 },
    { line: 18, ratedMaxKV: 362, k: 1.0, continuousA: [2000], shortCircuitKA: 63, trvT2Us: 775, trvRateKVPerUs: 1.8, trvDelayT1Us: 2, interruptingTimeMs: 33, trippingDelayS: 1, closingLatchingKAPeak: 164 },
    { line: 19, ratedMaxKV: 550, k: 1.0, continuousA: [2000, 3000], shortCircuitKA: 40, trvT2Us: 1325, trvRateKVPerUs: 1.6, trvDelayT1Us: 2, interruptingTimeMs: 33, trippingDelayS: 1, closingLatchingKAPeak: 104 },
    { line: 20, ratedMaxKV: 550, k: 1.0, continuousA: [3000], shortCircuitKA: 63, trvT2Us: 1325, trvRateKVPerUs: 1.6, trvDelayT1Us: 2, interruptingTimeMs: 33, trippingDelayS: 1, closingLatchingKAPeak: 164 },
    { line: 21, ratedMaxKV: 800, k: 1.0, continuousA: [2000, 3000], shortCircuitKA: 40, trvT2Us: 1530, trvRateKVPerUs: 1.9, trvDelayT1Us: 2, interruptingTimeMs: 33, trippingDelayS: 1, closingLatchingKAPeak: 104 },
    { line: 22, ratedMaxKV: 800, k: 1.0, continuousA: [3000], shortCircuitKA: 63, trvT2Us: 1530, trvRateKVPerUs: 1.9, trvDelayT1Us: 2, interruptingTimeMs: 33, trippingDelayS: 1, closingLatchingKAPeak: 164 },
  ],
  cite: {
    page: [233, 234],
    section: '5.3.3',
    table: '5-24',
    originalSource: 'ANSI/IEEE Std. C37.06-1997, Table 3',
    note:
      'The title says "121 kV and above" but the 1997 rows use 123/145/170/245 kV rated maxima, i.e. the classes for 115/138/161/230 kV systems (which Table 4-7 lists as 121/145/169/242 kV max). ' +
      'TRV envelope is "exponential-cosine", E2 = 1.76 × rated max voltage. ' +
      NOTES_5_20_5_23_5_24,
  },
};

export interface IndoorBreakerRatingK1 {
  line: number;
  ratedMaxKV: number;
  k: number;
  continuousA: readonly number[];
  shortCircuitKA: number;
  trvE2KVPeak: number;
  trvT2Us: number;
  interruptingTimeMs: number;
  trippingDelayS: number;
  closingLatchingKAPeak: number;
}

/** Table 5-20: preferred ratings for indoor circuit breakers with K = 1.0 (metal-clad switchgear class). */
export const TABLE_5_20_INDOOR_K1: Sourced<readonly IndoorBreakerRatingK1[]> = {
  value: [
    { line: 1, ratedMaxKV: 4.76, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 31.5, trvE2KVPeak: 8.9, trvT2Us: 50, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 82 },
    { line: 2, ratedMaxKV: 4.76, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 40, trvE2KVPeak: 8.9, trvT2Us: 50, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 104 },
    { line: 3, ratedMaxKV: 4.76, k: 1.0, continuousA: [1200, 2000, 3000], shortCircuitKA: 50, trvE2KVPeak: 8.9, trvT2Us: 50, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 130 },
    { line: 4, ratedMaxKV: 8.25, k: 1.0, continuousA: [1200, 2000, 3000], shortCircuitKA: 40, trvE2KVPeak: 15.5, trvT2Us: 60, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 104 },
    { line: 5, ratedMaxKV: 15, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 20, trvE2KVPeak: 28, trvT2Us: 75, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 52 },
    { line: 6, ratedMaxKV: 15, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 25, trvE2KVPeak: 28, trvT2Us: 75, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 65 },
    { line: 7, ratedMaxKV: 15, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 31.5, trvE2KVPeak: 28, trvT2Us: 75, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 82 },
    { line: 8, ratedMaxKV: 15, k: 1.0, continuousA: [1200, 2000, 3000], shortCircuitKA: 40, trvE2KVPeak: 28, trvT2Us: 75, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 104 },
    { line: 9, ratedMaxKV: 15, k: 1.0, continuousA: [1200, 2000, 3000], shortCircuitKA: 50, trvE2KVPeak: 28, trvT2Us: 75, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 130 },
    { line: 10, ratedMaxKV: 27, k: 1.0, continuousA: [1200], shortCircuitKA: 16, trvE2KVPeak: 51, trvT2Us: 105, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 42 },
    { line: 11, ratedMaxKV: 27, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 25, trvE2KVPeak: 51, trvT2Us: 105, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 65 },
    { line: 12, ratedMaxKV: 38, k: 1.0, continuousA: [1200], shortCircuitKA: 16, trvE2KVPeak: 71, trvT2Us: 125, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 42 },
    { line: 13, ratedMaxKV: 38, k: 1.0, continuousA: [1200, 2000], shortCircuitKA: 25, trvE2KVPeak: 71, trvT2Us: 125, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 65 },
    { line: 14, ratedMaxKV: 38, k: 1.0, continuousA: [1200, 2000, 3000], shortCircuitKA: 31.5, trvE2KVPeak: 71, trvT2Us: 125, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 82 },
    { line: 15, ratedMaxKV: 38, k: 1.0, continuousA: [1200, 2000, 3000], shortCircuitKA: 40, trvE2KVPeak: 71, trvT2Us: 125, interruptingTimeMs: 83, trippingDelayS: 2, closingLatchingKAPeak: 104 },
  ],
  cite: {
    page: [227, 234],
    section: '5.3.3',
    table: '5-20',
    originalSource: 'ANSI/IEEE Std. C37.06-1997, Table 1',
    note: 'Dielectric ratings: see Table 5-22. ' + NOTES_5_20_5_23_5_24,
  },
};

export interface IndoorBreakerRatingKgt1 {
  ratedMaxKV: number;
  k: number;
  continuousA: readonly number[];
  /** Rated short-circuit current at rated maximum kV, kA rms. */
  shortCircuitKA: number;
  /** Rated interrupting time, cycles (60 Hz). */
  interruptingTimeCycles: number;
  /** Rated maximum voltage divided by K, kV rms. */
  minVoltageForMaxCapabilityKV: number;
  /** Maximum symmetrical interrupting capability and 3-s short-time current (= K × rated), kA rms. */
  maxSymInterruptingKA: number;
  /** Closing and latching capability (2.7K × rated), kA crest. */
  closingLatchingKACrest: number;
}

/** Table 5-21: preferred ratings for indoor circuit breakers with K > 1.0 (older rating basis). */
export const TABLE_5_21_INDOOR_K_GT_1: Sourced<readonly IndoorBreakerRatingKgt1[]> = {
  value: [
    { ratedMaxKV: 4.76, k: 1.36, continuousA: [1200], shortCircuitKA: 8.8, interruptingTimeCycles: 5, minVoltageForMaxCapabilityKV: 3.5, maxSymInterruptingKA: 12, closingLatchingKACrest: 32 },
    { ratedMaxKV: 4.76, k: 1.24, continuousA: [1200, 2000], shortCircuitKA: 29, interruptingTimeCycles: 5, minVoltageForMaxCapabilityKV: 3.85, maxSymInterruptingKA: 36, closingLatchingKACrest: 97 },
    { ratedMaxKV: 4.76, k: 1.19, continuousA: [1200, 2000, 3000], shortCircuitKA: 41, interruptingTimeCycles: 5, minVoltageForMaxCapabilityKV: 4.0, maxSymInterruptingKA: 49, closingLatchingKACrest: 132 },
    { ratedMaxKV: 8.25, k: 1.25, continuousA: [1200, 2000], shortCircuitKA: 33, interruptingTimeCycles: 5, minVoltageForMaxCapabilityKV: 6.6, maxSymInterruptingKA: 41, closingLatchingKACrest: 111 },
    { ratedMaxKV: 15.0, k: 1.3, continuousA: [1200, 2000], shortCircuitKA: 18, interruptingTimeCycles: 5, minVoltageForMaxCapabilityKV: 11.5, maxSymInterruptingKA: 23, closingLatchingKACrest: 62 },
    { ratedMaxKV: 15.0, k: 1.3, continuousA: [1200, 2000], shortCircuitKA: 28, interruptingTimeCycles: 5, minVoltageForMaxCapabilityKV: 11.5, maxSymInterruptingKA: 36, closingLatchingKACrest: 97 },
    { ratedMaxKV: 15.0, k: 1.3, continuousA: [1200, 2000, 3000], shortCircuitKA: 37, interruptingTimeCycles: 5, minVoltageForMaxCapabilityKV: 11.5, maxSymInterruptingKA: 48, closingLatchingKACrest: 130 },
    { ratedMaxKV: 38.0, k: 1.65, continuousA: [1200, 2000, 3000], shortCircuitKA: 21, interruptingTimeCycles: 5, minVoltageForMaxCapabilityKV: 23.0, maxSymInterruptingKA: 35, closingLatchingKACrest: 95 },
    { ratedMaxKV: 38.0, k: 1.0, continuousA: [1200, 3000], shortCircuitKA: 40, interruptingTimeCycles: 5, minVoltageForMaxCapabilityKV: 38.0, maxSymInterruptingKA: 40, closingLatchingKACrest: 108 },
  ],
  cite: {
    page: [229, 230],
    section: '5.3.3.1.3',
    table: '5-21',
    originalSource: 'ANSI/IEEE Std. C37.06-1997, Table A1',
    note: 'TRV values for these indoor oilless breakers are not standardized (E2 = 1.88 × rated max voltage). 25 Hz continuous ratings: 1200->1400, 2000->2250, 3000->3500 A.',
  },
};

export interface BreakerDielectricRow {
  line: number;
  ratedMaxKV: number;
  /** "Rating table" number in C37.06 (1 = indoor, 2 = outdoor ≤72.5 kV, 3 = outdoor ≥121 kV). */
  ratingTable: 1 | 2 | 3;
  powerFreq1MinDryKV: number;
  powerFreq10sWetKV: number | null;
  /** Full-wave lightning impulse withstand (BIL), kV peak. */
  bilKV: number;
  chopped2usKV: number | null;
  chopped3usKV: number | null;
  switchingImpulseToGroundKV: number | null;
  switchingImpulseAcrossOpenKV: number | null;
  /** Minimum creepage distance of external insulation to ground: inches and metres as printed. */
  creepageIn: number | null;
  creepageM: number | null;
  /** True for the reduced-BIL rows intended for grounded-wye distribution circuits with surge arresters (note 4). */
  reducedBilForArresterProtectedWye?: boolean;
}

/** Table 5-22: preferred dielectric withstand ratings and external insulation. */
export const TABLE_5_22_BREAKER_DIELECTRIC: Sourced<readonly BreakerDielectricRow[]> = {
  value: [
    { line: 1, ratedMaxKV: 4.76, ratingTable: 1, powerFreq1MinDryKV: 19, powerFreq10sWetKV: null, bilKV: 60, chopped2usKV: null, chopped3usKV: null, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: null, creepageM: null },
    { line: 2, ratedMaxKV: 8.25, ratingTable: 1, powerFreq1MinDryKV: 36, powerFreq10sWetKV: null, bilKV: 95, chopped2usKV: null, chopped3usKV: null, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: null, creepageM: null },
    { line: 3, ratedMaxKV: 15.0, ratingTable: 1, powerFreq1MinDryKV: 36, powerFreq10sWetKV: null, bilKV: 95, chopped2usKV: null, chopped3usKV: null, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: null, creepageM: null },
    { line: 4, ratedMaxKV: 15.5, ratingTable: 2, powerFreq1MinDryKV: 50, powerFreq10sWetKV: 45, bilKV: 110, chopped2usKV: 142, chopped3usKV: 126, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: 9, creepageM: 0.23 },
    { line: 5, ratedMaxKV: 25.8, ratingTable: 2, powerFreq1MinDryKV: 60, powerFreq10sWetKV: 50, bilKV: 150, chopped2usKV: 194, chopped3usKV: 172, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: 15, creepageM: 0.38 },
    { line: 6, ratedMaxKV: 25.8, ratingTable: 2, powerFreq1MinDryKV: 60, powerFreq10sWetKV: 50, bilKV: 125, chopped2usKV: null, chopped3usKV: null, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: 15, creepageM: 0.38, reducedBilForArresterProtectedWye: true },
    { line: 7, ratedMaxKV: 27.0, ratingTable: 1, powerFreq1MinDryKV: 60, powerFreq10sWetKV: null, bilKV: 125, chopped2usKV: null, chopped3usKV: null, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: null, creepageM: null },
    { line: 8, ratedMaxKV: 38.0, ratingTable: 1, powerFreq1MinDryKV: 80, powerFreq10sWetKV: null, bilKV: 150, chopped2usKV: null, chopped3usKV: null, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: null, creepageM: null },
    { line: 9, ratedMaxKV: 38.0, ratingTable: 2, powerFreq1MinDryKV: 80, powerFreq10sWetKV: 75, bilKV: 200, chopped2usKV: 258, chopped3usKV: 230, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: 22, creepageM: 0.56 },
    { line: 10, ratedMaxKV: 38.0, ratingTable: 2, powerFreq1MinDryKV: 80, powerFreq10sWetKV: 75, bilKV: 150, chopped2usKV: null, chopped3usKV: null, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: 22, creepageM: 0.56, reducedBilForArresterProtectedWye: true },
    { line: 11, ratedMaxKV: 48.3, ratingTable: 2, powerFreq1MinDryKV: 105, powerFreq10sWetKV: 95, bilKV: 250, chopped2usKV: 322, chopped3usKV: 288, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: 28, creepageM: 0.71 },
    { line: 12, ratedMaxKV: 72.5, ratingTable: 2, powerFreq1MinDryKV: 160, powerFreq10sWetKV: 140, bilKV: 350, chopped2usKV: 452, chopped3usKV: 402, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: 42, creepageM: 1.07 },
    { line: 13, ratedMaxKV: 123, ratingTable: 3, powerFreq1MinDryKV: 260, powerFreq10sWetKV: 230, bilKV: 550, chopped2usKV: 710, chopped3usKV: 632, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: 70, creepageM: 1.78 },
    { line: 14, ratedMaxKV: 145, ratingTable: 3, powerFreq1MinDryKV: 310, powerFreq10sWetKV: 275, bilKV: 650, chopped2usKV: 838, chopped3usKV: 748, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: 84, creepageM: 2.13 },
    { line: 15, ratedMaxKV: 170, ratingTable: 3, powerFreq1MinDryKV: 365, powerFreq10sWetKV: 315, bilKV: 750, chopped2usKV: 968, chopped3usKV: 862, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: 93, creepageM: 2.49 },
    { line: 16, ratedMaxKV: 245, ratingTable: 3, powerFreq1MinDryKV: 425, powerFreq10sWetKV: 350, bilKV: 900, chopped2usKV: 1160, chopped3usKV: 1040, switchingImpulseToGroundKV: null, switchingImpulseAcrossOpenKV: null, creepageIn: 140, creepageM: 3.56 },
    { line: 17, ratedMaxKV: 362, ratingTable: 3, powerFreq1MinDryKV: 555, powerFreq10sWetKV: null, bilKV: 1300, chopped2usKV: 1680, chopped3usKV: 1500, switchingImpulseToGroundKV: 825, switchingImpulseAcrossOpenKV: 900, creepageIn: 209, creepageM: 5.31 },
    { line: 18, ratedMaxKV: 550, ratingTable: 3, powerFreq1MinDryKV: 860, powerFreq10sWetKV: null, bilKV: 1800, chopped2usKV: 2320, chopped3usKV: 2070, switchingImpulseToGroundKV: 1175, switchingImpulseAcrossOpenKV: 1300, creepageIn: 318, creepageM: 8.08 },
    { line: 19, ratedMaxKV: 800, ratingTable: 3, powerFreq1MinDryKV: 960, powerFreq10sWetKV: null, bilKV: 2050, chopped2usKV: 2640, chopped3usKV: 2360, switchingImpulseToGroundKV: 1425, switchingImpulseAcrossOpenKV: 1500, creepageIn: 442, creepageM: 11.23 },
  ],
  cite: {
    page: 231,
    section: '5.3.3.1.5',
    table: '5-22',
    originalSource: 'ANSI/IEEE Std. C37.06-1997, Table 4',
    note:
      'Impulse values apply phase-to-phase, phase-to-ground and across the open contact; null = "not required". ' +
      'UNCERTAIN: line 15 prints 93 in with 2.49 m, which do not agree (93 in = 2.36 m; 2.49 m = 98 in).',
  },
};

// ---------------------------------------------------------------------------
// Related required capabilities and the K example
// ---------------------------------------------------------------------------

export const RELATED_CAPABILITIES: Sourced<{
  /** Max symmetrical interrupting capability = K × rated short-circuit current. */
  maxSymInterruptingTimesKI: number;
  /** 3-second short-time capability = K × rated short-circuit current. */
  shortTime3sTimesKI: number;
  /** Closing and latching capability (rms) = 1.6 K × rated short-circuit current (older K-rated basis). */
  closingLatchingRmsTimesKI: number;
  /** Same expressed in peak amperes = 2.7 K × rated short-circuit current (Tables 5-20/5-21 notes). */
  closingLatchingPeakTimesKI_old: number;
  /** Tables 5-23/5-24 (C37.06-1997, K = 1): closing and latching kA peak = 2.6 × rated short-circuit current. */
  closingLatchingPeakTimesI_1997: number;
  /** ...equivalently 1.55 × rated short-circuit current in kA rms total. */
  closingLatchingRmsTotalTimesI_1997: number;
  /** Single line-to-ground interrupting requirement = 1.15 × polyphase requirement (capped at K × rated). */
  slgFactor: number;
}> = {
  value: {
    maxSymInterruptingTimesKI: 1,
    shortTime3sTimesKI: 1,
    closingLatchingRmsTimesKI: 1.6,
    closingLatchingPeakTimesKI_old: 2.7,
    closingLatchingPeakTimesI_1997: 2.6,
    closingLatchingRmsTotalTimesI_1997: 1.55,
    slgFactor: 1.15,
  },
  cite: {
    page: [230, 237],
    section: '5.3.3.2.4',
    originalSource: 'ANSI/IEEE Std. C37.04; C37.06',
    note:
      'Multipliers of 1 mean "K times rated short-circuit current". The 2.7K/1.6K factors come from the notes to Tables 5-20/5-21 and §5.3.3.2.4.7; ' +
      'the 2.6/1.55 factors from the notes to Tables 5-20, 5-23, 5-24 on p. 234 (current C37.06-1997 basis). The game should use 2.6 for Tables 5-23/5-24.',
  },
};

/**
 * Eq. 5-3: required symmetrical interrupting capability (kA) at an operating voltage between
 * ratedMaxKV/K and ratedMaxKV; never more than K × rated. Below ratedMaxKV/K it equals K × rated.
 */
export function requiredSymmetricalInterruptingKA(ratedKA: number, ratedMaxKV: number, k: number, operatingKV: number): number {
  return Math.min(ratedKA * (ratedMaxKV / operatingKV), k * ratedKA);
}

/** Lower limit of operating voltage at which K × rated interrupting current is available: ratedMaxKV / K (§5.3.3.1.3). */
export function lowerOperatingVoltageKV(ratedMaxKV: number, k: number): number {
  return ratedMaxKV / k;
}

/** §5.3.3.1.4 worked example (Table 5-21 breaker). */
export const K_FACTOR_EXAMPLE = {
  cite: { page: 228, section: '5.3.3.1.4', table: '5-21' } satisfies Citation,
  inputs: { ratedInterruptingKA: 18, ratedMaxKV: 15.0, k: 1.3 },
  results: {
    /** I = 18 × 1.3 = 23.4, printed as 23 kA. */
    maxInterruptingKA: 23,
    /** E = 15 / 1.3 = 11.54, printed as 11.5 kV. */
    lowerVoltageLimitKV: 11.5,
  },
};

export interface AsymmetryPoint {
  /** Primary arcing contact parting time, cycles. */
  partingCycles: number;
  /** Ratio S of asymmetrical to symmetrical interrupting capability. */
  s: number;
}

/** §5.3.3.2.4.4: S factors (linear interpolation between points; 4 or more cycles -> 1.0). */
export const ASYMMETRY_FACTOR_S: Sourced<readonly AsymmetryPoint[]> = {
  value: [
    { partingCycles: 1, s: 1.4 },
    { partingCycles: 1.5, s: 1.3 },
    { partingCycles: 2, s: 1.2 },
    { partingCycles: 3, s: 1.1 },
    { partingCycles: 4, s: 1.0 },
  ],
  cite: {
    page: 237,
    section: '5.3.3.2.4.4',
    figure: '5-8',
    originalSource: 'ANSI/IEEE Std. C37.04-1979',
    note:
      'Parting time = 1/2 cycle (minimum tripping delay) + the lesser of the actual opening time or 1.0, 1.5, 2.5 or 3.5 cycles for breakers rated 2, 3, 5 or 8 cycles interrupting time.',
  },
};

/** Contact-parting allowance (cycles) added to the 1/2-cycle tripping delay, keyed by rated interrupting time in cycles. */
export const PARTING_TIME_ALLOWANCE_CYCLES: Sourced<Readonly<Record<2 | 3 | 5 | 8, number>>> = {
  value: { 2: 1.0, 3: 1.5, 5: 2.5, 8: 3.5 },
  cite: { page: 237, section: '5.3.3.2.4.4' },
};

/** S factor for a parting time in cycles (interpolated per §5.3.3.2.4.4). */
export function asymmetryFactorS(partingCycles: number): number {
  const pts = ASYMMETRY_FACTOR_S.value;
  if (partingCycles <= pts[0].partingCycles) return pts[0].s;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (partingCycles <= b.partingCycles) {
      return a.s + ((partingCycles - a.partingCycles) / (b.partingCycles - a.partingCycles)) * (b.s - a.s);
    }
  }
  return 1.0;
}

export const INTERRUPTING_TIME_RULES: readonly Guidance[] = [
  {
    id: 'cb-int-time-definition',
    text: 'Rated interrupting time is the longest allowed interval from energizing the trip circuit at rated control voltage to interruption in all poles; times in cycles are on a 60 Hz basis.',
    cite: { page: [237, 238], section: '5.3.3.3' },
    tags: ['breaker', 'interrupting-time'],
  },
  {
    id: 'cb-int-time-light-duty',
    text: 'Below 25 % of the asymmetrical capability, interruption may take up to 50 % longer than rated for 5- and 8-cycle breakers and one cycle longer for 3-cycle breakers.',
    cite: { page: 238, section: '5.3.3.3' },
    tags: ['breaker', 'interrupting-time'],
  },
  {
    id: 'cb-int-time-close-open',
    text: 'On a close-open operation, interrupting time should not exceed rated by more than one cycle (5- and 8-cycle breakers) or half a cycle (3-cycle breakers).',
    cite: { page: 238, section: '5.3.3.3' },
    tags: ['breaker', 'interrupting-time', 'reclosing'],
  },
  {
    id: 'cb-tripping-delay',
    text: 'Rated permissible tripping delay Y is the longest time the breaker must carry K times rated short-circuit current after closing on it before interrupting (Y = 2 s for Tables 5-20/5-23, 1 s for Table 5-24).',
    cite: { page: [232, 238], section: '5.3.3.4', table: '5-23, 5-24' },
    tags: ['breaker', 'fault'],
  },
  {
    id: 'cb-duty-cycle',
    text: 'Ratings assume the standard duty cycle CO + 15 s + CO; more operations or shorter intervals require derating the interrupting capability per C37.04.',
    cite: { page: 238, section: '5.3.3.5' },
    tags: ['breaker', 'reclosing', 'design-check'],
  },
];

/** Standard operating duty to which interrupting ratings relate (one close-open, 15 s, another close-open). */
export const STANDARD_DUTY_CYCLE: Sourced<string> = {
  value: 'CO + 15 s + CO',
  cite: { page: 238, section: '5.3.3.5' },
};

// ---------------------------------------------------------------------------
// Altitude correction (Table 5-25)
// ---------------------------------------------------------------------------

export interface BreakerAltitudeRow {
  altitudeFt: number;
  altitudeM: number;
  /** Multiplier on rated dielectric strength and rated maximum voltage. */
  voltageFactor: number;
  /** Multiplier on rated continuous current. */
  currentFactor: number;
}

/** Table 5-25: altitude correction factors for breaker voltage and current (interpolate between rows). */
export const TABLE_5_25_BREAKER_ALTITUDE: Sourced<readonly BreakerAltitudeRow[]> = {
  value: [
    { altitudeFt: 3300, altitudeM: 1000, voltageFactor: 1.0, currentFactor: 1.0 },
    { altitudeFt: 5000, altitudeM: 1500, voltageFactor: 0.95, currentFactor: 0.99 },
    { altitudeFt: 10000, altitudeM: 3000, voltageFactor: 0.8, currentFactor: 0.96 },
  ],
  cite: {
    page: 234,
    section: '5.3.3.2.2',
    table: '5-25',
    originalSource: 'ANSI/IEEE Std. C37.04-1979, Table 1',
    note:
      'Interpolated values are to be used for intermediate altitudes. For some breakers (e.g. sealed interrupters) the voltage factor need not be applied to rated maximum voltage; consult the manufacturer.',
  },
};

/** Interpolated Table 5-25 factors; altitudes ≤1000 m return 1.0; above 3000 m the last row is returned (table ends there). */
export function breakerAltitudeFactors(altitudeM: number): { voltageFactor: number; currentFactor: number } {
  const rows = TABLE_5_25_BREAKER_ALTITUDE.value;
  if (altitudeM <= rows[0].altitudeM) return { voltageFactor: 1, currentFactor: 1 };
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    if (altitudeM <= b.altitudeM) {
      const t = (altitudeM - a.altitudeM) / (b.altitudeM - a.altitudeM);
      return {
        voltageFactor: a.voltageFactor + t * (b.voltageFactor - a.voltageFactor),
        currentFactor: a.currentFactor + t * (b.currentFactor - a.currentFactor),
      };
    }
  }
  const last = rows[rows.length - 1];
  return { voltageFactor: last.voltageFactor, currentFactor: last.currentFactor };
}

// ---------------------------------------------------------------------------
// Operating mechanisms and control voltages
// ---------------------------------------------------------------------------

export interface MechanismInfo {
  id: string;
  name: string;
  description: string;
  /** Stored-energy requirement stated by the bulletin, if any. */
  storedEnergy?: string;
  /** Voltage classes where the bulletin says the mechanism is offered. */
  availability?: string;
  cite: Citation;
}

export const OPERATING_MECHANISMS: readonly MechanismInfo[] = [
  {
    id: 'solenoid-voltage',
    name: 'Voltage-operated (ac/dc) solenoid',
    description: 'Formerly used on nearly all breakers; effective but slow and needs a large-capacity supply. Still used on some small breakers; capacitor trip devices can drive the solenoid.',
    cite: { page: 239, section: '5.3.4.1.1' },
  },
  {
    id: 'solenoid-current',
    name: 'Current-operated solenoid',
    description: 'Tripped by current from bushing or separate CTs; available on smaller breakers and useful where a separate operating supply cannot be justified.',
    cite: { page: 239, section: '5.3.4.1.2' },
  },
  {
    id: 'motor',
    name: 'Motor mechanism',
    description: 'A high-torque ac or dc motor drives a spring-loaded toggle over center; mostly older, small breakers.',
    cite: { page: 239, section: '5.3.4.2' },
  },
  {
    id: 'pneumohydraulic',
    name: 'Pneumohydraulic',
    description: 'Compressed air drives hydraulic fluid to close and trip; very high speed.',
    storedEnergy: 'At least five complete close-open operations at rated short-circuit current from normal pressure without recharging.',
    availability: 'Normally offered (by certain suppliers) on breakers rated 121 kV and higher.',
    cite: { page: [239, 241], section: '5.3.4.3' },
  },
  {
    id: 'pneumatic',
    name: 'Pneumatic',
    description: 'Compressed air (or gas) applies closing and tripping force directly, sometimes charging a trip spring during closing; pressures range from a few hundred to several thousand psi.',
    storedEnergy: 'Integral storage: at least two complete close-open operations at rated short-circuit current without recharging. Separate storage can be sized freely and serve several breakers.',
    availability: 'Most breakers rated 23 kV and higher of the bulk air-blast and closed-cycle gas-blast types.',
    cite: { page: 241, section: '5.3.4.4' },
  },
  {
    id: 'motor-charged-spring',
    name: 'Motor-charged spring',
    description: 'A motor compresses a closing spring; closing also charges a smaller trip spring. High-speed closing and tripping. A dc motor can be specified where reclosing depends on it.',
    storedEnergy: 'Enough for an open-close-open operation at rated short-circuit current; motor should recharge the closing spring in no more than 10 s.',
    availability: '2.4 kV through 72.5 kV breakers.',
    cite: { page: 241, section: '5.3.4.5' },
  },
  {
    id: 'manual-charged-spring',
    name: 'Manual-charged spring',
    description: 'Spring charged by a hand jack; very limited use, suitable only where reclosing is not required.',
    storedEnergy: 'One closing and one tripping operation.',
    cite: { page: 242, section: '5.3.4.6' },
  },
  {
    id: 'manual',
    name: 'Manual',
    description: 'Lever-operated toggle on small breakers only; may lack tripping ability, in which case a backup protective device is needed.',
    cite: { page: 242, section: '5.3.4.7' },
  },
];

export const MECHANISM_GUIDANCE: readonly Guidance[] = [
  {
    id: 'cb-mech-positive-open',
    text: 'The mechanism must open the breaker positively from fully or partly closed positions and must be able to close and latch against the rated short-circuit current.',
    cite: { page: 238, section: '5.3.4' },
    tags: ['breaker', 'mechanism'],
  },
  {
    id: 'cb-mech-close-voltage',
    text: 'A breaker should not close at a control voltage lower than the minimum at which it can still trip successfully.',
    cite: { page: 239, section: '5.3.4' },
    tags: ['breaker', 'mechanism', 'control'],
  },
  {
    id: 'cb-mech-maintenance-safeguards',
    text: 'Mechanisms need safeguards against unintended operation during maintenance (fuse pullouts, permissive switches or locking pins) and a means of slow-closing to align contacts.',
    cite: { page: 239, section: '5.3.4' },
    tags: ['breaker', 'mechanism', 'safety', 'maintenance'],
  },
  {
    id: 'cb-mech-counters',
    text: 'Fit operation counters on mechanisms and elapsed-running-time meters on compressors; both support effective maintenance.',
    cite: { page: 239, section: '5.3.4' },
    tags: ['breaker', 'maintenance'],
  },
];

export interface DcControlVoltageRow {
  ratedV: number;
  /** Closing and auxiliary functions, indoor breakers, V dc [min, max] (null = not listed). */
  closingIndoor: readonly [number, number] | null;
  /** Closing and auxiliary functions, outdoor breakers, V dc. */
  closingOutdoor: readonly [number, number] | null;
  /** Opening (trip) functions, all types, V dc. */
  opening: readonly [number, number];
}

export interface AcControlVoltageRow {
  rated: string;
  phases: 'single' | 'poly';
  /** Closing, tripping and auxiliary functions range, as printed. */
  range: string;
}

/** Table 5-26: rated control voltages and their ranges for circuit breakers. */
export const TABLE_5_26_CONTROL_VOLTAGES: Sourced<{ dc: readonly DcControlVoltageRow[]; ac: readonly AcControlVoltageRow[] }> = {
  value: {
    dc: [
      { ratedV: 24, closingIndoor: null, closingOutdoor: null, opening: [14, 28] },
      { ratedV: 48, closingIndoor: [38, 56], closingOutdoor: [36, 56], opening: [28, 56] },
      { ratedV: 125, closingIndoor: [100, 140], closingOutdoor: [90, 140], opening: [70, 140] },
      { ratedV: 250, closingIndoor: [200, 280], closingOutdoor: [180, 280], opening: [140, 280] },
    ],
    ac: [
      { rated: '120', phases: 'single', range: '104-127' },
      { rated: '240', phases: 'single', range: '208-254' },
      { rated: '208Y/120', phases: 'poly', range: '180Y/104-220Y/127' },
      { rated: '240', phases: 'poly', range: '208-254' },
    ],
  },
  cite: {
    page: [240, 241],
    section: '5.3.4, 5.3.6',
    table: '5-26',
    originalSource: 'ANSI/IEEE Std. C37.06-1997, Table 8',
    note:
      '24 V and 48 V control only near the battery or with well-sized wiring; 24 V closing is not recommended. Coils permanently connected to one dc potential should go to the negative bus. ' +
      'Single-phase ac ranges include heater circuits. Max voltage measured with no operating current, min with maximum operating current.',
  },
};

// ---------------------------------------------------------------------------
// Application, tests, purchase and installation
// ---------------------------------------------------------------------------

export const BREAKER_APPLICATION_GUIDANCE: readonly Guidance[] = [
  {
    id: 'cb-alternatives',
    text: 'Fuses, circuit switchers or reclosers may be preferable to costlier circuit breakers: fuses for transformer protection where adequate, circuit switchers for moderate fault levels and capacitor banks, reclosers for distribution feeders.',
    cite: { page: 220, section: '5.3.1.1' },
    tags: ['breaker', 'fuse', 'recloser', 'circuit-switcher', 'selection'],
  },
  {
    id: 'cb-circuit-switcher-no-ct',
    text: 'Circuit switchers come without CTs (breakers usually include them) and can mount like air-break switches, needing little extra space.',
    cite: { page: 220, section: '5.3.1.1' },
    tags: ['circuit-switcher', 'layout'],
  },
  {
    id: 'cb-studies-first',
    text: 'Before specifying breakers, run load-flow, short-circuit, transient-voltage, coordination and protection studies to set the application parameters.',
    cite: { page: 220, section: '5.3.1.1' },
    tags: ['breaker', 'studies', 'design-check'],
  },
  {
    id: 'cb-not-on-list',
    text: 'Power circuit breakers are not on the RUS List of Materials, so each purchase needs its own (preferably functional) specification; ANSI C37.12 can serve as the model.',
    cite: { page: 220, section: '5.3.1.2' },
    tags: ['breaker', 'specification'],
  },
  {
    id: 'cb-rated-max-voltage',
    text: 'Rated maximum voltage is the upper limit for operating the breaker and the reference for its interrupting rating.',
    cite: { page: 226, section: '5.3.3.1.2' },
    tags: ['breaker', 'rating', 'design-check'],
  },
  {
    id: 'cb-rated-continuous',
    text: 'Rated continuous current is the rms current the breaker can carry continuously without exceeding C37.06 temperature limits.',
    cite: { page: 228, section: '5.3.3.2.1' },
    tags: ['breaker', 'rating', 'design-check'],
  },
  {
    id: 'cb-rated-short-circuit',
    text: 'Rated short-circuit current is the highest symmetrical rms fault current the breaker must interrupt at rated maximum voltage on the standard duty cycle; fixed ratios set its closing, carrying and interrupting capabilities.',
    cite: { page: 235, section: '5.3.3.2.3', figure: '5-7' },
    tags: ['breaker', 'rating', 'fault', 'design-check'],
  },
  {
    id: 'cb-tests-after-delivery',
    text: 'Acceptance checks after delivery can include no-load timing of close, open and close-open, a low-frequency withstand test at 75 % of rated, and CT polarity and ratio tests.',
    cite: { page: 243, section: '5.3.5.3' },
    tags: ['breaker', 'testing'],
  },
  {
    id: 'cb-aux-power',
    text: 'Besides control power, breakers need auxiliary ac at the breaker for heaters, compressor motors and lights.',
    cite: { page: 244, section: '5.3.6' },
    tags: ['breaker', 'auxiliary-power'],
  },
  {
    id: 'cb-purchase-evaluation',
    text: 'When comparing breaker types, include the cost of maintenance jacks, gas- and oil-handling equipment and tank lifters, plus esthetics, noise, oil-spill risk, size, weight and lead time.',
    cite: { page: 244, section: '5.3.7' },
    tags: ['breaker', 'cost', 'selection'],
  },
  {
    id: 'cb-shipment',
    text: 'Inspect breakers for shipping damage on arrival and notify carrier and manufacturer promptly; small to medium (138-230 kV) oil breakers usually ship fully assembled by rail or truck.',
    cite: { page: 244, section: '5.3.8.1' },
    tags: ['breaker', 'shipping'],
  },
];

// ---------------------------------------------------------------------------
// Metal-clad switchgear (§5.4)
// ---------------------------------------------------------------------------

export interface MetalCladRatingRow {
  nominalKV: number;
  maxKV: number;
  powerFreq1MinKV: number;
  bilKV: number;
}

/** §5.4.3.1/5.4.3.2 voltage classes and Table 5-27 insulation levels. */
export const TABLE_5_27_METAL_CLAD_RATINGS: Sourced<readonly MetalCladRatingRow[]> = {
  value: [
    { nominalKV: 4.16, maxKV: 4.76, powerFreq1MinKV: 19, bilKV: 60 },
    { nominalKV: 7.2, maxKV: 8.25, powerFreq1MinKV: 36, bilKV: 95 },
    { nominalKV: 13.8, maxKV: 15.0, powerFreq1MinKV: 36, bilKV: 95 },
    { nominalKV: 25.0, maxKV: 27.0, powerFreq1MinKV: 60, bilKV: 125 },
    { nominalKV: 34.5, maxKV: 38.0, powerFreq1MinKV: 80, bilKV: 150 },
  ],
  cite: {
    page: 249,
    section: '5.4.3',
    table: '5-27',
    originalSource: 'IEEE Std. C37.20.2, Table 1',
    note: '25 kV circuits are served either by the costlier 34.5 kV class or by a 25 kV class some manufacturers offer (now ANSI-recognized).',
  },
};

export const METAL_CLAD_FACTS: Sourced<{
  busContinuousA: readonly number[];
  /** Max momentary rating mentioned for a 13.8 kV bus, kA (matched to breaker rating). */
  maxMomentaryKA13_8: number;
  dcControlRangeV: readonly [number, number];
  ambientRangeC: readonly [number, number];
  maxAltitudeM: number;
  /** Battery temperature range to maintain if batteries are housed in the switchgear, °C. */
  batteryRangeC: readonly [number, number];
}> = {
  value: {
    busContinuousA: [1200, 2000, 3000],
    maxMomentaryKA13_8: 48,
    dcControlRangeV: [48, 125],
    ambientRangeC: [-30, 40],
    maxAltitudeM: 1000,
    batteryRangeC: [10, 26],
  },
  cite: { page: [249, 251], section: '5.4.3.5, 5.4.3.6, 5.4.4.2.6, 5.4.4.2.7' },
};

export const METAL_CLAD_GUIDANCE: readonly Guidance[] = [
  {
    id: 'mc-definition',
    text: 'Metal-clad switchgear has removable breakers, grounded metal barriers between major parts, automatic shutters, insulated main bus, mechanical interlocks and secondary devices isolated from primary parts.',
    cite: { page: 245, section: '5.4.1', originalSource: 'IEEE Std. C37.20.2, Section 2.1.9.3' },
    tags: ['switchgear'],
  },
  {
    id: 'mc-when',
    text: 'Metal-clad switchgear suits sites where appearance, land use, compactness, easy installation, underground exits, foul-weather maintenance or safety matter; outdoor walk-in enclosures often cost less than indoor gear plus a building.',
    cite: { page: 246, section: '5.4.1.1, 5.4.2.1' },
    tags: ['switchgear', 'selection', 'layout'],
  },
  {
    id: 'mc-common-scheme',
    text: 'The most common lineup is a single bus with a main incoming breaker, a tie breaker and at least four feeder breakers; the tie lets another transformer or feeder ties carry load while breakers are maintained.',
    cite: { page: 250, section: '5.4.4.2.1', note: 'The bulletin adds that feeders are "sized to carry 50 percent of normal load"; the exact meaning of that phrase is unclear.' },
    tags: ['switchgear', 'bus-scheme'],
  },
  {
    id: 'mc-copper-bus',
    text: 'Switchgear main bus is predominantly copper, rated to match available breakers (1200, 2000 or 3000 A), with track-resistant, void-free insulation and a separate copper ground bus.',
    cite: { page: [249, 250], section: '5.4.3.5, 5.4.4.2.3' },
    tags: ['switchgear', 'bus'],
  },
  {
    id: 'mc-instrument-transformers',
    text: 'Switchgear VTs are usually wye-wye with 120/208 V secondaries; CTs are usually single-ratio with accuracy class C200 to C400. Ground CT and VT circuits at one point per circuit.',
    cite: { page: 251, section: '5.4.4.2.4' },
    tags: ['switchgear', 'instrument-transformer'],
  },
  {
    id: 'mc-aux',
    text: 'Switchgear usually uses 48-125 V dc control; auxiliary ac is typically 240/120 V single-phase or 120/208 V three-phase from an internal fused transformer or an unaffected external feeder.',
    cite: { page: 251, section: '5.4.4.2.6' },
    tags: ['switchgear', 'auxiliary-power'],
  },
  {
    id: 'mc-heaters',
    text: 'Provide space heaters to prevent condensation on bus insulation and breakers; a battery inside the enclosure needs air conditioning and heating to stay between +10 and +26 °C.',
    cite: { page: 251, section: '5.4.4.2.7' },
    tags: ['switchgear', 'environment'],
  },
  {
    id: 'mc-enclosure-categories',
    text: 'Enclosure category A resists deliberate unauthorized acts, B protects untrained or unauthorized people from contact, and C protects authorized people inside secure areas.',
    cite: { page: 249, section: '5.4.2.2' },
    tags: ['switchgear', 'safety'],
  },
];
