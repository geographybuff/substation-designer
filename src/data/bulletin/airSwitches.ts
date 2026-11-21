/**
 * High-voltage air switch data from RUS Bulletin 1724E-300 §5.7 (pp. 298-323), plus the
 * switch-selection remarks in the layout sections §4.3-4.5 (pp. 121-128).
 *
 * Covers: switch types and construction classifications, preferred voltage ratings (Table 5-38),
 * continuous and withstand currents (Table 5-40), altitude (Table 5-41), allowable continuous
 * current (Eq. 5-5, Table 5-43), electromagnetic force (Eq. 5-6, Table 5-44), terminal loads
 * (Table 5-45), pole-unit dimensions (Table 5-46), base mounting-hole spacing (Table 5-47),
 * phase spacing and ground clearance for switches and bus supports (Table 5-48), grounding-switch
 * gaps (Table 5-51) and mounting guidance. Tables come from ANSI C37.32-1996 / IEEE C37.30 as
 * reproduced in the bulletin. All tabulated values apply at ≤1000 m (3300 ft).
 */
import type { Citation, Guidance, Sourced } from './types';

// ---------------------------------------------------------------------------
// Types (by application) and construction classifications
// ---------------------------------------------------------------------------

export type SwitchApplicationType = 'disconnecting' | 'grounding' | 'horn-gap' | 'interrupter' | 'selector';

export interface SwitchTypeInfo {
  id: SwitchApplicationType;
  name: string;
  /** Paraphrase of the function (ANSI/IEEE C37.100 definitions are quoted in the bulletin). */
  description: string;
  typicalApplications: readonly string[];
  cite: Citation;
}

export const SWITCH_TYPES: readonly SwitchTypeInfo[] = [
  {
    id: 'disconnecting',
    name: 'Disconnecting (isolating) switch',
    description:
      'Changes circuit connections or isolates equipment from its source. Carries load current continuously and fault current for short specified times, but opens or closes only when the current is negligible or the voltage across its poles barely changes.',
    typicalApplications: ['Circuit breaker isolation', 'Power transformer isolation', 'Voltage transformer disconnecting', 'Equipment bypassing', 'Bus sectionalizing'],
    cite: { page: 299, section: '5.7.2.1', originalSource: 'ANSI/IEEE Std. C37.100' },
  },
  {
    id: 'grounding',
    name: 'Grounding switch',
    description: 'Connects a circuit or apparatus to ground; often mounted on the jaw or hinge end of a disconnecting or horn-gap switch.',
    typicalApplications: [
      'Grounding buses or circuits for safe maintenance after they are isolated',
      'Deliberately grounding a circuit with a high-speed device to trip a remote protective scheme',
    ],
    cite: { page: 299, section: '5.7.2.2', figure: '5-22', originalSource: 'ANSI/IEEE Std. C37.100' },
  },
  {
    id: 'horn-gap',
    name: 'Horn-gap switch',
    description:
      'A switch with arcing horns that can make or break small magnetizing or capacitive currents (transformer exciting current, line charging current); the horns protect the main contacts.',
    typicalApplications: ['De-energizing or energizing circuits with limited magnetic or capacitive energy'],
    cite: { page: [299, 301], section: '5.7.2.3', figure: '5-23', originalSource: 'ANSI/IEEE Std. C37.100' },
  },
  {
    id: 'interrupter',
    name: 'Interrupter switch',
    description:
      'An air switch fitted with an interrupter to make and/or break specified currents; named by duty (load interrupter, fault interrupter, capacitor current interrupter).',
    typicalApplications: ['Load interrupting', 'Fault interrupting', 'Capacitor current switching'],
    cite: { page: 301, section: '5.7.2.4', figure: '5-24', originalSource: 'ANSI/IEEE Std. C37.100' },
  },
  {
    id: 'selector',
    name: 'Selector switch',
    description: 'Connects one conductor to any one of several others; in substations rarely more than two choices.',
    typicalApplications: ['Connecting a potential device to either of two buses', 'Combined disconnecting and grounding function'],
    cite: { page: 301, section: '5.7.2.5', originalSource: 'ANSI/IEEE Std. C37.100' },
  },
];

export type ConstructionClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'J' | 'V';

export interface ConstructionClassInfo {
  id: ConstructionClass;
  name: string;
  description: string;
  cite: Citation;
}

/** Construction classifications (pictorial key reproduced under Table 5-39 from ANSI C37.32-1996 Annex B Fig. B-1). */
export const CONSTRUCTION_CLASSES: readonly ConstructionClassInfo[] = [
  {
    id: 'A',
    name: 'Vertical break',
    description:
      'Blade swings in a plane perpendicular to the mounting base and lies parallel to it when closed; the hinge end has two insulators, one rotated by the operating mechanism (three insulators per pole).',
    cite: { page: 304, section: '5.7.3.1', figure: '5-25' },
  },
  {
    id: 'B',
    name: 'Double break',
    description: 'Opens the conductor at two points; the center insulator stack rotates to open and close (three insulators per pole).',
    cite: { page: 305, section: '5.7.3.2', figure: '5-23' },
  },
  {
    id: 'C',
    name: 'Tilting insulator',
    description: 'Blade travel comes from tilting one or more support insulators. Seldom used today but still found on existing installations.',
    cite: { page: 305, section: '5.7.3.3', figure: '5-26' },
  },
  {
    id: 'D',
    name: 'Side break',
    description: 'Blade swings in a plane parallel to the base; the hinge-end insulator rotates (two insulators per pole).',
    cite: { page: 305, section: '5.7.3.4', figure: '5-27' },
  },
  {
    id: 'E',
    name: 'Center break',
    description: 'Blade travels parallel to the base and opens at a single point in the center; both insulators rotate.',
    cite: { page: 305, section: '5.7.3.5', figure: '5-28' },
  },
  {
    id: 'F',
    name: 'Tilting insulator (variant)',
    description: 'Second tilting-insulator arrangement in the classification key (classifications C and F share §5.7.3.3).',
    cite: { page: [303, 305], section: '5.7.3.3' },
  },
  {
    id: 'G',
    name: 'Grounding switch',
    description:
      'Connects a circuit or apparatus to ground; the key shows an insulated blade on the bus swinging to ground, though some designs move a grounded blade onto the bus.',
    cite: { page: 305, section: '5.7.3.6', figure: '5-22' },
  },
  {
    id: 'H',
    name: 'Hook stick',
    description: 'Single-pole switch opened manually with a switch stick; both insulators stay fixed while the hinged blade is unlatched and swung.',
    cite: { page: 306, section: '5.7.3.7', figure: '5-29' },
  },
  {
    id: 'J',
    name: 'Vertical reach',
    description: 'Stationary contact is carried on a separate structure from the hinge base; the closed blade stands perpendicular to the hinge base.',
    cite: { page: 306, section: '5.7.3.8', figure: '5-30' },
  },
  {
    id: 'V',
    name: 'Vee',
    description: 'Two insulators in a V supporting a center-break blade (shown only in the classification key; Fig. 5-28 is an underhung center-break V-switch).',
    cite: { page: [303, 306], figure: '5-28', note: 'No separate text section; described from the pictorial key.' },
  },
];

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------

export interface SwitchVoltageRatingRow {
  line: number;
  ratedMaxKV: number;
  /** Rated lightning impulse withstand, kV peak. */
  bilKV: number;
  /** True where the BIL is printed bold = "traditional" value (lower values rely on modern arresters, note 4). */
  traditionalBil: boolean;
  powerFreqDry1MinKV: number;
  powerFreqWet10sKV: number;
  /** RIV test voltage, kV rms (null = none). */
  rivTestKV: number | null;
  /** RIV limit, µV at 1 MHz (null = none). Printed "mV" in the bulletin heading. */
  rivLimitUV: number | null;
}

/** Table 5-38: preferred voltage ratings for station-class outdoor air switches. */
export const TABLE_5_38_SWITCH_VOLTAGE_RATINGS: Sourced<readonly SwitchVoltageRatingRow[]> = {
  value: [
    { line: 1, ratedMaxKV: 8.25, bilKV: 95, traditionalBil: false, powerFreqDry1MinKV: 35, powerFreqWet10sKV: 30, rivTestKV: null, rivLimitUV: null },
    { line: 2, ratedMaxKV: 15.5, bilKV: 110, traditionalBil: false, powerFreqDry1MinKV: 50, powerFreqWet10sKV: 45, rivTestKV: null, rivLimitUV: null },
    { line: 3, ratedMaxKV: 25.8, bilKV: 150, traditionalBil: false, powerFreqDry1MinKV: 70, powerFreqWet10sKV: 60, rivTestKV: null, rivLimitUV: null },
    { line: 4, ratedMaxKV: 38.0, bilKV: 200, traditionalBil: false, powerFreqDry1MinKV: 95, powerFreqWet10sKV: 80, rivTestKV: null, rivLimitUV: null },
    { line: 5, ratedMaxKV: 48.3, bilKV: 250, traditionalBil: false, powerFreqDry1MinKV: 120, powerFreqWet10sKV: 100, rivTestKV: null, rivLimitUV: null },
    { line: 6, ratedMaxKV: 72.5, bilKV: 250, traditionalBil: false, powerFreqDry1MinKV: 120, powerFreqWet10sKV: 100, rivTestKV: null, rivLimitUV: null },
    { line: 7, ratedMaxKV: 72.5, bilKV: 350, traditionalBil: true, powerFreqDry1MinKV: 175, powerFreqWet10sKV: 145, rivTestKV: null, rivLimitUV: null },
    { line: 8, ratedMaxKV: 121, bilKV: 350, traditionalBil: false, powerFreqDry1MinKV: 175, powerFreqWet10sKV: 145, rivTestKV: 77, rivLimitUV: 500 },
    { line: 9, ratedMaxKV: 121, bilKV: 450, traditionalBil: false, powerFreqDry1MinKV: 235, powerFreqWet10sKV: 190, rivTestKV: 77, rivLimitUV: 500 },
    { line: 10, ratedMaxKV: 121, bilKV: 550, traditionalBil: true, powerFreqDry1MinKV: 280, powerFreqWet10sKV: 230, rivTestKV: 77, rivLimitUV: 500 },
    { line: 11, ratedMaxKV: 145, bilKV: 350, traditionalBil: false, powerFreqDry1MinKV: 175, powerFreqWet10sKV: 145, rivTestKV: 92, rivLimitUV: 500 },
    { line: 12, ratedMaxKV: 145, bilKV: 450, traditionalBil: false, powerFreqDry1MinKV: 235, powerFreqWet10sKV: 190, rivTestKV: 92, rivLimitUV: 500 },
    { line: 13, ratedMaxKV: 145, bilKV: 550, traditionalBil: false, powerFreqDry1MinKV: 280, powerFreqWet10sKV: 230, rivTestKV: 92, rivLimitUV: 500 },
    { line: 14, ratedMaxKV: 145, bilKV: 650, traditionalBil: true, powerFreqDry1MinKV: 335, powerFreqWet10sKV: 275, rivTestKV: 92, rivLimitUV: 500 },
    { line: 15, ratedMaxKV: 169, bilKV: 450, traditionalBil: false, powerFreqDry1MinKV: 235, powerFreqWet10sKV: 190, rivTestKV: 107, rivLimitUV: 500 },
    { line: 16, ratedMaxKV: 169, bilKV: 550, traditionalBil: false, powerFreqDry1MinKV: 280, powerFreqWet10sKV: 230, rivTestKV: 107, rivLimitUV: 500 },
    { line: 17, ratedMaxKV: 169, bilKV: 650, traditionalBil: false, powerFreqDry1MinKV: 335, powerFreqWet10sKV: 275, rivTestKV: 107, rivLimitUV: 500 },
    { line: 18, ratedMaxKV: 169, bilKV: 750, traditionalBil: true, powerFreqDry1MinKV: 385, powerFreqWet10sKV: 315, rivTestKV: 107, rivLimitUV: 500 },
    { line: 19, ratedMaxKV: 242, bilKV: 550, traditionalBil: false, powerFreqDry1MinKV: 280, powerFreqWet10sKV: 230, rivTestKV: 154, rivLimitUV: 500 },
    { line: 20, ratedMaxKV: 242, bilKV: 650, traditionalBil: false, powerFreqDry1MinKV: 335, powerFreqWet10sKV: 275, rivTestKV: 154, rivLimitUV: 500 },
    { line: 21, ratedMaxKV: 242, bilKV: 750, traditionalBil: false, powerFreqDry1MinKV: 385, powerFreqWet10sKV: 315, rivTestKV: 154, rivLimitUV: 500 },
    { line: 22, ratedMaxKV: 242, bilKV: 900, traditionalBil: true, powerFreqDry1MinKV: 465, powerFreqWet10sKV: 385, rivTestKV: 154, rivLimitUV: 500 },
    { line: 23, ratedMaxKV: 242, bilKV: 1050, traditionalBil: false, powerFreqDry1MinKV: 545, powerFreqWet10sKV: 455, rivTestKV: 154, rivLimitUV: 500 },
    { line: 24, ratedMaxKV: 362, bilKV: 1050, traditionalBil: false, powerFreqDry1MinKV: 545, powerFreqWet10sKV: 455, rivTestKV: 230, rivLimitUV: 500 },
    { line: 25, ratedMaxKV: 362, bilKV: 1300, traditionalBil: true, powerFreqDry1MinKV: 610, powerFreqWet10sKV: 525, rivTestKV: 230, rivLimitUV: 500 },
    { line: 26, ratedMaxKV: 550, bilKV: 1550, traditionalBil: false, powerFreqDry1MinKV: 710, powerFreqWet10sKV: 620, rivTestKV: 349, rivLimitUV: 500 },
    { line: 27, ratedMaxKV: 550, bilKV: 1800, traditionalBil: true, powerFreqDry1MinKV: 810, powerFreqWet10sKV: 710, rivTestKV: 349, rivLimitUV: 500 },
    { line: 28, ratedMaxKV: 800, bilKV: 2050, traditionalBil: false, powerFreqDry1MinKV: 940, powerFreqWet10sKV: 830, rivTestKV: 508, rivLimitUV: 750 },
  ],
  cite: {
    page: 302,
    section: '5.7.3, 5.7.5.2.6',
    table: '5-38',
    originalSource: 'ANSI Std. C37.32-1996, Table 1',
    note:
      'RIV test voltage = 110 % of rated max line-to-neutral voltage. Lines 19-28 are for effectively grounded systems. Switches ≥362 kV also have switching-impulse ratings (Table 5-39). ' +
      'The RIV limit column is headed "mV @ 1 MHz" in the bulletin; the C37.32 unit is microvolts (stored as µV) - UNCERTAIN only as to the bulletin\'s label.',
  },
};

export interface SwitchCurrentRatingRow {
  line: number;
  continuousA: number;
  /** Short-time (symmetrical) withstand, kA rms, rated duration 3 s. */
  shortTimeKA: number;
  /** Peak withstand, kA, rated duration 167 ms (= 2.6 × short-time). */
  peakKA: number;
}

/** Table 5-40: preferred continuous and withstand currents, station-class outdoor air switches. */
export const TABLE_5_40_SWITCH_CURRENT_RATINGS: Sourced<readonly SwitchCurrentRatingRow[]> = {
  value: [
    { line: 1, continuousA: 600, shortTimeKA: 25, peakKA: 65 },
    { line: 2, continuousA: 1200, shortTimeKA: 38, peakKA: 99 },
    { line: 3, continuousA: 1600, shortTimeKA: 44, peakKA: 114 },
    { line: 4, continuousA: 2000, shortTimeKA: 44, peakKA: 114 },
    { line: 5, continuousA: 2000, shortTimeKA: 63, peakKA: 164 },
    { line: 6, continuousA: 3000, shortTimeKA: 63, peakKA: 164 },
    { line: 7, continuousA: 3000, shortTimeKA: 75, peakKA: 195 },
    { line: 8, continuousA: 4000, shortTimeKA: 75, peakKA: 195 },
  ],
  cite: {
    page: 304,
    section: '5.7.3, 5.7.5.2.6',
    table: '5-40',
    originalSource: 'ANSI Std. C37.32-1996, Table 3',
    note:
      'Peak/short-time ratio 2.6; short-time duration 3 s (I²t variations per IEEE C37.34); peak test duration 167 ms. Peak withstand ≈ 1.625 × rms asymmetrical momentary current; ' +
      'switches formerly rated 40, 61, 70, 100 and 120 kA rms asymmetrical momentary are close equivalents.',
  },
};

export interface SwitchAltitudeRow {
  altitudeFt: number;
  altitudeM: number;
  /** Factor applied to rated withstand voltage. */
  voltageFactor: number;
  /** Factor applied to rated continuous current (40 °C max ambient basis). */
  currentFactor: number;
}

/** Table 5-41: altitude correction factors for high-voltage air switches. */
export const TABLE_5_41_SWITCH_ALTITUDE: Sourced<readonly SwitchAltitudeRow[]> = {
  value: [
    { altitudeFt: 3300, altitudeM: 1000, voltageFactor: 1.0, currentFactor: 1.0 },
    { altitudeFt: 4000, altitudeM: 1200, voltageFactor: 0.98, currentFactor: 0.995 },
    { altitudeFt: 5000, altitudeM: 1500, voltageFactor: 0.95, currentFactor: 0.99 },
    { altitudeFt: 6000, altitudeM: 1800, voltageFactor: 0.92, currentFactor: 0.985 },
    { altitudeFt: 7000, altitudeM: 2100, voltageFactor: 0.89, currentFactor: 0.98 },
    { altitudeFt: 8000, altitudeM: 2400, voltageFactor: 0.86, currentFactor: 0.97 },
    { altitudeFt: 9000, altitudeM: 2700, voltageFactor: 0.83, currentFactor: 0.965 },
    { altitudeFt: 10000, altitudeM: 3000, voltageFactor: 0.8, currentFactor: 0.96 },
    { altitudeFt: 12000, altitudeM: 3600, voltageFactor: 0.75, currentFactor: 0.95 },
    { altitudeFt: 14000, altitudeM: 4200, voltageFactor: 0.7, currentFactor: 0.935 },
    { altitudeFt: 16000, altitudeM: 4800, voltageFactor: 0.65, currentFactor: 0.925 },
    { altitudeFt: 18000, altitudeM: 5400, voltageFactor: 0.61, currentFactor: 0.91 },
    { altitudeFt: 20000, altitudeM: 6000, voltageFactor: 0.56, currentFactor: 0.9 },
  ],
  cite: {
    page: 308,
    section: '5.7.4.2',
    table: '5-41',
    originalSource: 'ANSI/IEEE Std. C37.30-1992, Table 1',
    note: 'The bulletin notes the table was under review. Current factor assumes 40 °C max ambient (outside the enclosure for enclosed switches).',
  },
};

export const SWITCH_SERVICE_CONDITIONS: Sourced<{
  nonEnclosedAmbientC: readonly [number, number];
  enclosedInsideMaxC: number;
  enclosedOutsideMaxC: number;
  maxAltitudeM: number;
}> = {
  value: { nonEnclosedAmbientC: [-30, 40], enclosedInsideMaxC: 55, enclosedOutsideMaxC: 40, maxAltitudeM: 1000 },
  cite: { page: 308, section: '5.7.4' },
};

// ---------------------------------------------------------------------------
// Allowable continuous current (Eq. 5-5, Table 5-43)
// ---------------------------------------------------------------------------

export interface SwitchPartTemperatureRow {
  part: string;
  /** Allowable maximum temperature θmax, °C. */
  thetaMaxC: number;
  /** Limit of observable temperature rise at rated current θr, °C - non-enclosed switches. */
  thetaRNonEnclosedC: number;
  /** θr for enclosed switches, °C. */
  thetaREnclosedC: number;
}

/** Table 5-43 (selected rows): temperature limitations for air switches. */
export const TABLE_5_43_SWITCH_TEMPERATURE_LIMITS: Sourced<readonly SwitchPartTemperatureRow[]> = {
  value: [
    { part: 'Contacts in air: copper or copper alloy', thetaMaxC: 75, thetaRNonEnclosedC: 33, thetaREnclosedC: 20 },
    { part: 'Contacts in air: copper alloy to silver (or equivalent)', thetaMaxC: 90, thetaRNonEnclosedC: 43, thetaREnclosedC: 33 },
    { part: 'Contacts in air: silver, silver alloy or equivalent', thetaMaxC: 105, thetaRNonEnclosedC: 53, thetaREnclosedC: 43 },
    { part: 'Conducting mechanical joints: copper or aluminum', thetaMaxC: 90, thetaRNonEnclosedC: 43, thetaREnclosedC: 33 },
    { part: 'Conducting mechanical joints: silver or equivalent', thetaMaxC: 105, thetaRNonEnclosedC: 67, thetaREnclosedC: 57 },
    { part: 'Switch terminals with bolted connections', thetaMaxC: 90, thetaRNonEnclosedC: 43, thetaREnclosedC: 33 },
    { part: 'Welded or brazed joints', thetaMaxC: 105, thetaRNonEnclosedC: 53, thetaREnclosedC: 43 },
    { part: 'Copper or copper alloy castings', thetaMaxC: 105, thetaRNonEnclosedC: 53, thetaREnclosedC: 43 },
    { part: 'Hard drawn copper parts', thetaMaxC: 80, thetaRNonEnclosedC: 37, thetaREnclosedC: 25 },
    { part: 'Heat treated aluminum alloy parts', thetaMaxC: 105, thetaRNonEnclosedC: 53, thetaREnclosedC: 43 },
    { part: 'Woven wire flexible connectors', thetaMaxC: 75, thetaRNonEnclosedC: 33, thetaREnclosedC: 20 },
    { part: 'Insulator caps and pins, bushing caps', thetaMaxC: 110, thetaRNonEnclosedC: 57, thetaREnclosedC: 47 },
  ],
  cite: {
    page: [311, 312],
    section: '5.7.5.2.3',
    table: '5-43',
    originalSource: 'IEEE Std. C37.30-1997, Table 2',
    note: 'Rows for insulation-class contact temperatures, operator-handled parts and whole-switch limits are omitted.',
  },
};

/**
 * Eq. 5-5: allowable continuous current at ambient θA, I_A = I_R × ((θmax − θA) / θr)^½.
 * Returns 0 if θA ≥ θmax.
 */
export function allowableContinuousCurrentA(ratedA: number, thetaMaxC: number, thetaRC: number, ambientC: number): number {
  if (ambientC >= thetaMaxC) return 0;
  return ratedA * Math.sqrt((thetaMaxC - ambientC) / thetaRC);
}

export const SWITCH_LOADABILITY: Sourced<{ loadability: number; atAmbientC: number }> = {
  value: { loadability: 1.22, atAmbientC: 25 },
  cite: {
    page: [310, 312],
    section: '5.7.5.2.3',
    equation: '5-5',
    note:
      'Loadability = allowable current at 25 °C (77 °F) / rated current for non-enclosed switches (40 °C inside for enclosed). UNCERTAIN: Table 5-43 note 1 says 23 °C; the text says 25 °C. ' +
      'Check: silver contacts (θmax 105, θr 53) at 25 °C give √(80/53) = 1.23.',
  },
};

// ---------------------------------------------------------------------------
// Electromagnetic force and terminal loads
// ---------------------------------------------------------------------------

export interface ForceMultiplierRow {
  circuit: string;
  currentExpressedAs: 'maximum peak' | 'rms asymmetrical' | 'rms symmetrical';
  m: number;
}

/** Table 5-44: multiplying factor M for Eq. 5-6. */
export const TABLE_5_44_FORCE_MULTIPLIER: Sourced<readonly ForceMultiplierRow[]> = {
  value: [
    { circuit: 'dc', currentExpressedAs: 'maximum peak', m: 1.0 },
    { circuit: 'ac, 3-phase', currentExpressedAs: 'maximum peak', m: 0.866 },
    { circuit: 'ac, 3-phase', currentExpressedAs: 'rms asymmetrical', m: 2.3 },
    { circuit: 'ac, 3-phase', currentExpressedAs: 'rms symmetrical', m: 6.9 },
    { circuit: '1 phase of 3-phase, or 1-phase', currentExpressedAs: 'maximum peak', m: 1.0 },
    { circuit: '1 phase of 3-phase, or 1-phase', currentExpressedAs: 'rms asymmetrical', m: 2.66 },
    { circuit: '1 phase of 3-phase, or 1-phase', currentExpressedAs: 'rms symmetrical', m: 8.0 },
  ],
  cite: {
    page: 313,
    section: '5.7.6.1',
    table: '5-44',
    originalSource: 'ANSI Std. C37.32-1996, Annex A.3.2',
    note: 'Derived as 0.866 × 1.63² = 2.3, 0.866 × 2.82² = 6.9, 1.63² = 2.66, 2.82² = 8.0.',
  },
};

/**
 * Eq. 5-6: approximate force between parallel conductors, F = M × 5.4 I² / (S × 10^7),
 * in pounds per foot of conductor; I in amperes (as defined for M), S = centerline spacing in inches.
 */
export function switchConductorForceLbPerFt(m: number, currentA: number, spacingIn: number): number {
  return (m * 5.4 * currentA * currentA) / (spacingIn * 1e7);
}

export const SWITCH_FORCE_EQUATION: Sourced<string> = {
  value: 'F [lb/ft] = M × 5.4 × I² / (S × 10^7), I in A, S in inches',
  cite: {
    page: [312, 313],
    section: '5.7.6.1',
    equation: '5-6',
    originalSource: 'ANSI Std. C37.32',
    note: 'Usually conservative (compensates for neglected resonant effects). Insulators must withstand the forces from the Table 5-40 momentary ratings.',
  },
};

export interface TerminalLoadRow {
  line: number;
  maxVoltageKV: string;
  currentRatingA: string;
  f1f2Lb: number;
  f1f2N: number;
  f3Lb: number;
  f3N: number;
  f4Lb: number;
  f4N: number;
}

/** Table 5-45: terminal loadings for high-voltage switches. */
export const TABLE_5_45_TERMINAL_LOADS: Sourced<readonly TerminalLoadRow[]> = {
  value: [
    { line: 1, maxVoltageKV: '4.8-72.5', currentRatingA: '200-1200', f1f2Lb: 90, f1f2N: 400, f3Lb: 30, f3N: 130, f4Lb: 30, f4N: 130 },
    { line: 2, maxVoltageKV: '4.8-72.5', currentRatingA: '>2000', f1f2Lb: 90, f1f2N: 400, f3Lb: 30, f3N: 130, f4Lb: 30, f4N: 130 },
    { line: 3, maxVoltageKV: '121-169', currentRatingA: '600-1600', f1f2Lb: 120, f1f2N: 530, f3Lb: 40, f3N: 180, f4Lb: 110, f4N: 490 },
    { line: 4, maxVoltageKV: '121-169', currentRatingA: '>2000', f1f2Lb: 120, f1f2N: 530, f3Lb: 40, f3N: 180, f4Lb: 250, f4N: 1110 },
    { line: 5, maxVoltageKV: '242-362', currentRatingA: '1200-1600', f1f2Lb: 180, f1f2N: 800, f3Lb: 60, f3N: 270, f4Lb: 375, f4N: 1670 },
    { line: 6, maxVoltageKV: '242-362', currentRatingA: '>2000', f1f2Lb: 230, f1f2N: 1020, f3Lb: 75, f3N: 330, f4Lb: 685, f4N: 3040 },
    { line: 7, maxVoltageKV: '>500', currentRatingA: 'All', f1f2Lb: 450, f1f2N: 2000, f3Lb: 150, f3N: 670, f4Lb: 750, f4N: 3330 },
  ],
  cite: {
    page: [313, 314],
    section: '5.7.6.2',
    table: '5-45',
    originalSource: 'ANSI Std. C37.32-1996 (cited in the bulletin as Table 2)',
    note:
      'Loads cover typical bus weight with ice and wind, expansion and limited moments; consult the manufacturer for long rigid spans, high fault forces or non-tubular bus. ' +
      'At 242 kV and above F4 may be cut 40 % for hinged/pivoting pads. The force directions F1-F4 are not defined in the bulletin text. Terminal pads take ½ in (12.7 mm) bolts (Fig. 5-31).',
  },
};

// ---------------------------------------------------------------------------
// Dimensions: pole units, base holes, phase spacing, grounding gaps
// ---------------------------------------------------------------------------

export interface PoleUnitDimensionRow {
  line: number;
  ratedMaxKV: number;
  bilKV: number;
  /** Minimum metal-to-metal length of break, single break, inches / mm (null = not established or not applicable). */
  singleBreakIn: number | null;
  singleBreakMm: number | null;
  doubleBreakIn: number | null;
  doubleBreakMm: number | null;
  /** Minimum insulator centerline spacing within a pole, single-break, standard / high-strength insulators, inches (mm). */
  singleStdIn: number | null;
  singleStdMm: number | null;
  singleHighIn: number | null;
  singleHighMm: number | null;
  doubleStdIn: number | null;
  doubleStdMm: number | null;
  doubleHighIn: number | null;
  doubleHighMm: number | null;
}

const pu = (
  line: number,
  ratedMaxKV: number,
  bilKV: number,
  sb: [number, number] | null,
  db: [number, number] | null,
  ss: [number, number] | null,
  sh: [number, number] | null,
  ds: [number, number] | null,
  dh: [number, number] | null,
): PoleUnitDimensionRow => ({
  line,
  ratedMaxKV,
  bilKV,
  singleBreakIn: sb?.[0] ?? null,
  singleBreakMm: sb?.[1] ?? null,
  doubleBreakIn: db?.[0] ?? null,
  doubleBreakMm: db?.[1] ?? null,
  singleStdIn: ss?.[0] ?? null,
  singleStdMm: ss?.[1] ?? null,
  singleHighIn: sh?.[0] ?? null,
  singleHighMm: sh?.[1] ?? null,
  doubleStdIn: ds?.[0] ?? null,
  doubleStdMm: ds?.[1] ?? null,
  doubleHighIn: dh?.[0] ?? null,
  doubleHighMm: dh?.[1] ?? null,
});

/** Table 5-46: station-class outdoor air switch pole-unit dimensions (lines 1-25; 26-28 not established). */
export const TABLE_5_46_POLE_UNIT_DIMENSIONS: Sourced<readonly PoleUnitDimensionRow[]> = {
  value: [
    pu(1, 8.3, 95, [7, 178], null, [12, 305], [15, 381], null, null),
    pu(2, 15.5, 110, [10, 254], null, [15, 381], [18, 457], null, null),
    pu(3, 25.8, 150, [12, 305], null, [18, 457], [21, 533], null, null),
    pu(4, 38.0, 200, [18, 457], [12, 305], [24, 610], [27, 686], [18, 457], [21, 533]),
    pu(5, 48.3, 250, [22, 559], [15, 381], [30, 762], [33, 838], [23, 585], [24, 610]),
    pu(6, 72.5, 250, [22, 559], [15, 381], [30, 762], [33, 838], [23, 585], [24, 616]),
    pu(7, 72.5, 350, [32, 813], [22, 559], [42, 1067], [45, 1140], [30, 762], [34, 864]),
    pu(8, 121, 350, [32, 813], [22, 559], [42, 1067], [45, 1140], [30, 762], [34, 864]),
    pu(9, 121, 450, null, null, [51, 1295], [54, 1370], [35, 889], null),
    pu(10, 121, 550, [50, 1270], [32, 813], [60, 1520], null, [42, 1067], null),
    pu(11, 145, 350, [32, 813], [22, 559], [42, 1067], [45, 1140], [30, 762], [34, 864]),
    pu(12, 145, 450, null, null, [51, 1295], [54, 1370], [35, 889], null),
    pu(13, 145, 550, [50, 1270], [32, 813], [60, 1520], null, [42, 1067], null),
    pu(14, 145, 650, [60, 1520], [38, 965], [72, 1830], null, [48, 1220], null),
    pu(15, 169, 450, null, null, [51, 1295], [54, 1370], [35, 889], null),
    pu(16, 169, 550, [50, 1270], [32, 813], [60, 1520], null, [42, 1067], null),
    pu(17, 169, 650, [60, 1520], [38, 965], [72, 1830], null, [48, 1220], null),
    pu(18, 169, 750, [68, 1730], [44, 1120], [84, 2130], null, [54, 1370], null),
    pu(19, 242, 550, [50, 1270], [32, 813], [60, 1520], null, [42, 1067], null),
    pu(20, 242, 650, [60, 1520], [38, 965], [72, 1830], null, [48, 1220], null),
    pu(21, 242, 750, [68, 1730], [44, 1120], [84, 2130], null, [54, 1370], null),
    pu(22, 242, 900, [84, 2130], [50, 1270], [96, 2440], null, [68, 1730], null),
    pu(23, 242, 1050, [104, 2640], [57, 1450], [116, 2950], null, [75, 1900], null),
    pu(24, 362, 1050, [104, 2640], [57, 1450], [116, 2950], null, [75, 1900], null),
    pu(25, 362, 1300, [120, 3050], [66, 1680], [132, 3350], null, [84, 2130], null),
  ],
  cite: {
    page: [316, 317],
    section: '5.7.6.4',
    table: '5-46',
    originalSource: 'ANSI Std. C37.32-1996, Table 6',
    note:
      'Where minimum metal-to-metal distance and insulator spacing conflict, the metal-to-metal distance governs. 450 kV BIL break lengths "not yet established". ' +
      'Line 6 double-break high-strength spacing printed 24 in (616 mm) vs 610 mm on line 5.',
  },
};

/** §5.7.6.3: the open gap must withstand 10 % more than the Table 5-38 impulse and dry withstand voltages. */
export const OPEN_GAP_WITHSTAND_MARGIN_PCT: Sourced<number> = {
  value: 10,
  cite: { page: 316, section: '5.7.6.3', table: '5-38' },
};

export interface MountingHoleRow {
  line: number;
  ratedMaxKV: number;
  /** "A" = hole spacing along the base length, inches / mm; "B" = across the base width (alternatives), inches. */
  hookStickAIn: number;
  hookStickAMm: number;
  hookStickBIn: readonly number[];
  sideBreakAIn: number;
  sideBreakAMm: number;
  sideBreakBIn: readonly number[];
  verticalBreakAIn: number;
  verticalBreakAMm: number;
  verticalBreakBIn: readonly number[];
}

/** Table 5-47: preferred base mounting-hole spacing for 600, 1200 and 1600 A station-class outdoor switches. */
export const TABLE_5_47_MOUNTING_HOLES: Sourced<readonly MountingHoleRow[]> = {
  value: [
    { line: 1, ratedMaxKV: 8.25, hookStickAIn: 18, hookStickAMm: 457, hookStickBIn: [2, 7], sideBreakAIn: 24, sideBreakAMm: 610, sideBreakBIn: [3, 7], verticalBreakAIn: 36, verticalBreakAMm: 914, verticalBreakBIn: [3, 7] },
    { line: 2, ratedMaxKV: 15.5, hookStickAIn: 21, hookStickAMm: 533, hookStickBIn: [2, 7], sideBreakAIn: 24, sideBreakAMm: 610, sideBreakBIn: [3, 7], verticalBreakAIn: 36, verticalBreakAMm: 914, verticalBreakBIn: [3, 7] },
    { line: 3, ratedMaxKV: 25.8, hookStickAIn: 24, hookStickAMm: 610, hookStickBIn: [2, 7], sideBreakAIn: 27, sideBreakAMm: 686, sideBreakBIn: [3, 7], verticalBreakAIn: 39, verticalBreakAMm: 991, verticalBreakBIn: [3, 7] },
    { line: 4, ratedMaxKV: 38.0, hookStickAIn: 30, hookStickAMm: 762, hookStickBIn: [2, 7], sideBreakAIn: 33, sideBreakAMm: 838, sideBreakBIn: [3, 8.25], verticalBreakAIn: 48, verticalBreakAMm: 1220, verticalBreakBIn: [3, 8.25] },
    { line: 5, ratedMaxKV: 48.3, hookStickAIn: 39, hookStickAMm: 991, hookStickBIn: [3, 8.25], sideBreakAIn: 39, sideBreakAMm: 991, sideBreakBIn: [3, 8.25], verticalBreakAIn: 54, verticalBreakAMm: 1370, verticalBreakBIn: [3, 8.25] },
    { line: 6, ratedMaxKV: 72.5, hookStickAIn: 51, hookStickAMm: 1290, hookStickBIn: [3, 8.25], sideBreakAIn: 51, sideBreakAMm: 1290, sideBreakBIn: [3, 8.25], verticalBreakAIn: 69, verticalBreakAMm: 1750, verticalBreakBIn: [3, 8.25] },
    { line: 7, ratedMaxKV: 121, hookStickAIn: 66, hookStickAMm: 1680, hookStickBIn: [3, 8.25], sideBreakAIn: 72, sideBreakAMm: 1830, sideBreakBIn: [8.25], verticalBreakAIn: 87, verticalBreakAMm: 2210, verticalBreakBIn: [8.25] },
    { line: 8, ratedMaxKV: 145, hookStickAIn: 78, hookStickAMm: 1980, hookStickBIn: [3, 8.25], sideBreakAIn: 84, sideBreakAMm: 2130, sideBreakBIn: [8.25], verticalBreakAIn: 99, verticalBreakAMm: 2510, verticalBreakBIn: [8.25] },
    { line: 9, ratedMaxKV: 169, hookStickAIn: 90, hookStickAMm: 2290, hookStickBIn: [8.25], sideBreakAIn: 96, sideBreakAMm: 2440, sideBreakBIn: [8.25], verticalBreakAIn: 111, verticalBreakAMm: 2820, verticalBreakBIn: [8.25] },
  ],
  cite: {
    page: 316,
    section: '5.7.6.5',
    table: '5-47',
    originalSource: 'ANSI Std. C37.32-1996, Table 7',
    note: 'B values: 2 in = 50.8 mm, 3 in = 76.2 mm, 7 in = 178 mm, 8-1/4 in = 210 mm. Dimensions above 169 kV not established. Useful as a proxy for switch base length.',
  },
};

export interface SwitchPhaseSpacingRow {
  line: number;
  ratedMaxKV: number;
  bilKV: number;
  /** Bold "traditional" BIL in the original (lower BILs rely on close arrester coordination). */
  traditionalBil: boolean;
  /** Minimum metal-to-metal distance for disconnecting switches, bus supports and rigid conductors (null = not established). */
  minMetalIn: number | null;
  minMetalMm: number | null;
  groundClearanceRecommendedIn: number | null;
  groundClearanceRecommendedMm: number | null;
  groundClearanceMinimumIn: number;
  groundClearanceMinimumMm: number;
  /** Recommended centerline-to-centerline phase spacing: vertical-break switches and bus supports. */
  verticalBreakSpacingIn: number | null;
  verticalBreakSpacingMm: number | null;
  /** Side (horizontal) break disconnecting switches. */
  sideBreakSpacingIn: number | null;
  sideBreakSpacingMm: number | null;
  /** All horn-gap switches (vertical and side break). */
  hornGapSpacingIn: number;
  hornGapSpacingMm: number;
}

type PairOrNull = [number, number] | null;
const ps = (
  line: number,
  ratedMaxKV: number,
  bilKV: number,
  traditionalBil: boolean,
  mm: PairOrNull,
  rec: PairOrNull,
  min: [number, number],
  vb: PairOrNull,
  sb: PairOrNull,
  hg: [number, number],
): SwitchPhaseSpacingRow => ({
  line,
  ratedMaxKV,
  bilKV,
  traditionalBil,
  minMetalIn: mm?.[0] ?? null,
  minMetalMm: mm?.[1] ?? null,
  groundClearanceRecommendedIn: rec?.[0] ?? null,
  groundClearanceRecommendedMm: rec?.[1] ?? null,
  groundClearanceMinimumIn: min[0],
  groundClearanceMinimumMm: min[1],
  verticalBreakSpacingIn: vb?.[0] ?? null,
  verticalBreakSpacingMm: vb?.[1] ?? null,
  sideBreakSpacingIn: sb?.[0] ?? null,
  sideBreakSpacingMm: sb?.[1] ?? null,
  hornGapSpacingIn: hg[0],
  hornGapSpacingMm: hg[1],
});

/** Table 5-48: phase spacing and ground clearance for station-class outdoor air switches and bus supports. */
export const TABLE_5_48_SWITCH_PHASE_SPACING: Sourced<readonly SwitchPhaseSpacingRow[]> = {
  value: [
    ps(1, 8.25, 95, false, [7, 178], [7.5, 191], [6, 152], [18, 457], [30, 762], [36, 914]),
    ps(2, 15.5, 110, false, [12, 305], [10, 254], [7, 178], [24, 610], [30, 762], [36, 914]),
    ps(3, 25.8, 150, false, [15, 381], [12, 305], [10, 254], [30, 762], [36, 914], [48, 1220]),
    ps(4, 38.0, 200, false, [18, 457], [15, 381], [13, 330], [36, 914], [48, 1220], [60, 1520]),
    ps(5, 48.3, 250, false, [21, 533], [18, 457], [17, 432], [48, 1220], [60, 1520], [72, 1830]),
    ps(6, 72.5, 250, false, [21, 533], [18, 457], [17, 432], [48, 1220], [60, 1520], [72, 1830]),
    ps(7, 72.5, 350, true, [31, 787], [29, 737], [25, 635], [60, 1520], [72, 1830], [84, 2130]),
    ps(8, 121, 350, false, [31, 787], [29, 737], [25, 635], [60, 1520], [72, 1830], [84, 2130]),
    ps(9, 121, 450, false, [44, 1118], [39, 991], [34, 846], [72, 1830], [91, 2310], [103, 2620]),
    ps(10, 121, 550, true, [53, 1350], [47, 1193], [42, 1067], [84, 2130], [108, 2740], [120, 3050]),
    ps(11, 145, 350, false, [31, 787], [29, 737], [25, 635], [60, 1520], [72, 1830], [84, 2130]),
    ps(12, 145, 450, false, [44, 1118], [39, 991], [34, 846], [72, 1830], [91, 2310], [103, 2620]),
    ps(13, 145, 550, false, [53, 1350], [47, 1193], [42, 1067], [84, 2130], [108, 2740], [120, 3050]),
    ps(14, 145, 650, true, [63, 1600], [52.5, 1333], [50, 1270], [96, 2440], [132, 3350], [144, 3660]),
    ps(15, 169, 450, false, [44, 1118], [39, 991], [34, 846], [72, 1830], [91, 2310], [103, 2620]),
    ps(16, 169, 550, false, [53, 1350], [47, 1193], [42, 1067], [84, 2130], [108, 2740], [120, 3050]),
    ps(17, 169, 650, false, [63, 1600], [52.5, 1333], [50, 1270], [96, 2440], [132, 3350], [144, 3660]),
    ps(18, 169, 750, true, [72, 1830], [61.5, 1562], [58, 1473], [108, 2740], [156, 3960], [168, 4270]),
    ps(19, 242, 550, false, [53, 1350], [47, 1193], [42, 1067], [84, 2130], [108, 2740], [120, 3050]),
    ps(20, 242, 650, false, [63, 1600], [52.5, 1333], [50, 1270], [96, 2440], [132, 3350], [144, 3660]),
    ps(21, 242, 750, false, [72, 1830], [61.5, 1562], [58, 1473], [108, 2740], [156, 3960], [168, 4270]),
    ps(22, 242, 900, true, [89, 2260], [76, 1930], [71, 1803], [132, 3350], [192, 4870], [192, 4870]),
    ps(23, 242, 1050, false, [105, 2670], [90.5, 2299], [83, 2108], [156, 3960], [216, 5500], [216, 5500]),
    ps(24, 362, 1050, false, [105, 2670], [90.5, 2299], [84, 2134], [156, 3960], [216, 5500], [216, 5500]),
    ps(25, 362, 1300, true, [119, 3020], [106, 2692], [104, 2642], [174, 4430], null, [240, 6100]),
    ps(26, 550, 1550, false, null, null, [124, 3150], null, null, [300, 7620]),
    ps(27, 550, 1800, true, null, null, [144, 3658], null, null, [324, 8230]),
    ps(28, 800, 2050, false, null, null, [166, 4216], null, null, [600, 15240]),
  ],
  cite: {
    page: 318,
    section: '5.7.6.6',
    table: '5-48',
    originalSource: 'ANSI Std. C37.32-1996, Table 5',
    note:
      'Phase spacings are recommended values; switch width, side-break opening angle etc. may allow less, but phase-to-phase metal-to-metal distance must not drop below the minimum-metal column. ' +
      'Ground clearances at ≥362 kV are based on switching surge. UNCERTAIN: lines 9, 12 and 15 print 34 in with 846 mm (34 in = 864 mm). Values apply at ≤1000 m; see Table 5-41 / Table 4-3 above that.',
  },
};

/** Look up the Table 5-48 row for a rated maximum voltage and BIL (exact match), or undefined. */
export function switchSpacingFor(ratedMaxKV: number, bilKV: number): SwitchPhaseSpacingRow | undefined {
  return TABLE_5_48_SWITCH_PHASE_SPACING.value.find((r) => r.ratedMaxKV === ratedMaxKV && r.bilKV === bilKV);
}

export interface GroundingSwitchGapRow {
  line: number;
  class: 'indoor' | 'distribution-outdoor' | 'station-outdoor';
  ratedMaxKV: number;
  bilKV: number;
  /** Minimum gap from grounding switch blade to live parts, inches / mm. */
  gapIn: number;
  gapMm: number;
}

/** Table 5-51: grounding switch electrical clearance (minimum gap to live parts). */
export const TABLE_5_51_GROUNDING_SWITCH_GAP: Sourced<readonly GroundingSwitchGapRow[]> = {
  value: [
    { line: 1, class: 'indoor', ratedMaxKV: 4.8, bilKV: 60, gapIn: 2.0, gapMm: 50.8 },
    { line: 2, class: 'indoor', ratedMaxKV: 8.25, bilKV: 75, gapIn: 2.0, gapMm: 50.8 },
    { line: 3, class: 'indoor', ratedMaxKV: 15.0, bilKV: 95, gapIn: 2.0, gapMm: 50.8 },
    { line: 4, class: 'indoor', ratedMaxKV: 15.5, bilKV: 110, gapIn: 2.0, gapMm: 50.8 },
    { line: 5, class: 'indoor', ratedMaxKV: 25.8, bilKV: 125, gapIn: 3.0, gapMm: 76.2 },
    { line: 6, class: 'indoor', ratedMaxKV: 38.0, bilKV: 150, gapIn: 4.0, gapMm: 102 },
    { line: 7, class: 'distribution-outdoor', ratedMaxKV: 8.25, bilKV: 75, gapIn: 2.0, gapMm: 50.8 },
    { line: 8, class: 'distribution-outdoor', ratedMaxKV: 15.0, bilKV: 95, gapIn: 2.0, gapMm: 50.8 },
    { line: 9, class: 'distribution-outdoor', ratedMaxKV: 27.0, bilKV: 125, gapIn: 3.0, gapMm: 76.2 },
    { line: 10, class: 'distribution-outdoor', ratedMaxKV: 38.0, bilKV: 150, gapIn: 4.0, gapMm: 102 },
    { line: 11, class: 'station-outdoor', ratedMaxKV: 8.25, bilKV: 95, gapIn: 2.0, gapMm: 50.8 },
    { line: 12, class: 'station-outdoor', ratedMaxKV: 15.5, bilKV: 110, gapIn: 2.0, gapMm: 50.8 },
    { line: 13, class: 'station-outdoor', ratedMaxKV: 25.8, bilKV: 150, gapIn: 4.0, gapMm: 102 },
    { line: 14, class: 'station-outdoor', ratedMaxKV: 38.0, bilKV: 200, gapIn: 6.0, gapMm: 152 },
    { line: 15, class: 'station-outdoor', ratedMaxKV: 48.3, bilKV: 250, gapIn: 9.5, gapMm: 241 },
    { line: 16, class: 'station-outdoor', ratedMaxKV: 72.5, bilKV: 250, gapIn: 9.5, gapMm: 241 },
    { line: 17, class: 'station-outdoor', ratedMaxKV: 72.5, bilKV: 350, gapIn: 14, gapMm: 367 },
    { line: 18, class: 'station-outdoor', ratedMaxKV: 121, bilKV: 350, gapIn: 14, gapMm: 367 },
    { line: 19, class: 'station-outdoor', ratedMaxKV: 121, bilKV: 450, gapIn: 18, gapMm: 457 },
    { line: 20, class: 'station-outdoor', ratedMaxKV: 121, bilKV: 550, gapIn: 22, gapMm: 559 },
    { line: 21, class: 'station-outdoor', ratedMaxKV: 145, bilKV: 350, gapIn: 14, gapMm: 367 },
    { line: 22, class: 'station-outdoor', ratedMaxKV: 145, bilKV: 450, gapIn: 18, gapMm: 457 },
    { line: 23, class: 'station-outdoor', ratedMaxKV: 145, bilKV: 550, gapIn: 22, gapMm: 559 },
    { line: 24, class: 'station-outdoor', ratedMaxKV: 145, bilKV: 650, gapIn: 27, gapMm: 686 },
    { line: 25, class: 'station-outdoor', ratedMaxKV: 169, bilKV: 450, gapIn: 18, gapMm: 457 },
    { line: 26, class: 'station-outdoor', ratedMaxKV: 169, bilKV: 550, gapIn: 22, gapMm: 559 },
    { line: 27, class: 'station-outdoor', ratedMaxKV: 169, bilKV: 650, gapIn: 27, gapMm: 686 },
    { line: 28, class: 'station-outdoor', ratedMaxKV: 169, bilKV: 750, gapIn: 31, gapMm: 787 },
    { line: 29, class: 'station-outdoor', ratedMaxKV: 242, bilKV: 550, gapIn: 22, gapMm: 559 },
    { line: 30, class: 'station-outdoor', ratedMaxKV: 242, bilKV: 650, gapIn: 27, gapMm: 686 },
    { line: 31, class: 'station-outdoor', ratedMaxKV: 242, bilKV: 750, gapIn: 31, gapMm: 787 },
    { line: 32, class: 'station-outdoor', ratedMaxKV: 242, bilKV: 900, gapIn: 38, gapMm: 965 },
    { line: 33, class: 'station-outdoor', ratedMaxKV: 242, bilKV: 1050, gapIn: 44, gapMm: 1118 },
    { line: 34, class: 'station-outdoor', ratedMaxKV: 362, bilKV: 1050, gapIn: 47, gapMm: 1194 },
    { line: 35, class: 'station-outdoor', ratedMaxKV: 362, bilKV: 1300, gapIn: 50, gapMm: 1270 },
    { line: 36, class: 'station-outdoor', ratedMaxKV: 550, bilKV: 1550, gapIn: 75, gapMm: 1905 },
    { line: 37, class: 'station-outdoor', ratedMaxKV: 550, bilKV: 1800, gapIn: 85, gapMm: 2159 },
    { line: 38, class: 'station-outdoor', ratedMaxKV: 800, bilKV: 2050, gapIn: 112, gapMm: 2845 },
  ],
  cite: {
    page: [319, 321],
    section: '5.7.6.7',
    table: '5-51',
    originalSource: 'ANSI Std. C37.32-1996, Table 14',
    note:
      'Not required for grounding blades that operate in a plane perpendicular to the main switch base. UNCERTAIN: 14 in is printed with 367 mm (14 in = 356 mm).',
  },
};

// ---------------------------------------------------------------------------
// Application and mounting guidance
// ---------------------------------------------------------------------------

export const SWITCH_GUIDANCE: readonly Guidance[] = [
  {
    id: 'sw-list-of-materials',
    text: 'RUS IP 202-1 lists fully and conditionally accepted air switches; consult it whenever air switches are needed.',
    cite: { page: 298, section: '5.7.1' },
    tags: ['switch', 'specification'],
  },
  {
    id: 'sw-disconnect-negligible-current',
    text: 'A plain disconnect may only make or break negligible current; where the current is not negligible use a horn-gap switch, and where it may exceed a horn-gap switch\'s ability use an interrupter switch.',
    cite: { page: [299, 301], section: '5.7.2.1, 5.7.2.3' },
    tags: ['switch', 'design-check'],
  },
  {
    id: 'sw-hook-stick-69kv',
    text: 'Hook stick (single-pole, stick-operated) switches are usually not considered above 69 kV; above that use three-pole group-operated switches.',
    cite: { page: [126, 128], section: '4.4.1, 4.5.1' },
    tags: ['switch', 'hook-stick', 'design-check'],
  },
  {
    id: 'sw-primary-disconnect',
    text: 'The incoming line of a distribution substation enters through a primary disconnect, usually three-pole, single-throw and group-operated, used to isolate the station for maintenance or equipment replacement.',
    cite: { page: 121, section: '4.3.1', figure: '4-2' },
    tags: ['switch', 'layout'],
  },
  {
    id: 'sw-breaker-isolation',
    text: 'Breakers and reclosers get disconnect switches on both source and load sides so they can be isolated for maintenance.',
    cite: { page: [122, 128], section: '4.3.1, 4.4.1, 4.5.1', figure: '4-2, 4-6, 4-8' },
    tags: ['switch', 'breaker', 'recloser', 'layout', 'design-check'],
  },
  {
    id: 'sw-grounding-interlock',
    text: 'Manual grounding switches for incoming circuits are usually part of the line disconnect and interlocked so the disconnect and ground switch cannot both be closed.',
    cite: { page: 127, section: '4.4.7' },
    tags: ['switch', 'grounding-switch', 'safety'],
  },
  {
    id: 'sw-high-speed-ground',
    text: 'High-speed grounding switches (one phase) can trip remote breakers for transformer faults, but they are generally not preferred because they shock the system and affect more customers.',
    cite: { page: 127, section: '4.4.7' },
    tags: ['switch', 'grounding-switch', 'protection'],
  },
  {
    id: 'sw-insulator-strength',
    text: 'Switch insulators must be strong enough to withstand the electromagnetic forces produced by the switch\'s rated momentary current.',
    cite: { page: 312, section: '5.7.6.1', table: '5-40' },
    tags: ['switch', 'insulator', 'fault'],
  },
  {
    id: 'sw-cold-climate',
    text: 'Where peak loads occur in cool weather, the allowable current at the actual ambient (Eq. 5-5) may permit a lower continuous rating than the circuit\'s maximum current.',
    cite: { page: 310, section: '5.7.5.2.3', equation: '5-5' },
    tags: ['switch', 'rating'],
  },
  {
    id: 'sw-supports',
    text: 'Mount air switches on supports stiff enough that the contacts still mate properly despite the large reaction forces during operation.',
    cite: { page: 322, section: '5.7.7.1' },
    tags: ['switch', 'structure', 'layout'],
  },
  {
    id: 'sw-dead-blade',
    text: 'Whenever possible, orient a switch so the blade is de-energized when the switch is open.',
    cite: { page: 322, section: '5.7.7.2' },
    tags: ['switch', 'safety', 'layout', 'design-check'],
  },
  {
    id: 'sw-mounting-arrangement',
    text: 'Tell the manufacturer the intended mounting arrangement so the insulators are assembled correctly.',
    cite: { page: 322, section: '5.7.7.3' },
    tags: ['switch', 'specification'],
  },
  {
    id: 'sw-polymer-posts',
    text: 'Polymer post insulators are less rigid than porcelain and are not recommended as switch supports.',
    cite: { page: 146, section: '4.8.1.4' },
    tags: ['switch', 'insulator'],
  },
];
