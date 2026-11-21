/**
 * Instrument transformer data from RUS Bulletin 1724E-300 §5.10 "Instrument Transformers" (pp. 377-399) and
 * §5.11 "Coupling Capacitors and Coupling Capacitor Voltage Transformers" (pp. 400-408).
 * Tables 5-66..5-78 are reprinted in the bulletin from IEEE Std C57.13-1993; Tables 5-79/5-80 from ANSI C93.1-1990.
 */
import type { Citation, Guidance } from './types';

const C57_13 = 'IEEE Std C57.13-1993';
const C93_1 = 'ANSI Std C93.1-1990';

export const IT_CITES = {
  general: { page: 377, section: '5.10.1', originalSource: 'ANSI/IEEE C57.13' },
  service: { page: [377, 379], section: '5.10.2', table: '5-66, 5-67', originalSource: `${C57_13}, Tables 2 and 4` },
  accuracy: { page: [379, 381], section: '5.10.3', table: '5-68', originalSource: `${C57_13}, Table 6` },
  burdens: { page: 381, section: '5.10.4', equation: '5-10' },
  construction: { page: [381, 382], section: '5.10.5' },
  ct: { page: [382, 389], section: '5.10.6', table: '5-69 to 5-72', originalSource: `${C57_13}, Tables 3, 7, 8, 9` },
  vt: { page: [389, 398], section: '5.10.7', table: '5-73 to 5-78', originalSource: `${C57_13}, Tables 10-15` },
  combination: { page: 398, section: '5.10.8' },
  tests: { page: 399, section: '5.10.9' },
  cc: { page: [400, 408], section: '5.11', table: '5-79, 5-80', originalSource: `${C93_1}, Tables 3 and 5` },
} as const satisfies Record<string, Citation>;

export const IT_GENERAL_GUIDANCE: readonly Guidance[] = [
  { id: 'it-purpose', text: 'An instrument transformer reproduces the primary current or voltage in its secondary in a known proportion with phase preserved, and insulates meters and relays (and people) from the primary circuit.', cite: { page: 377, section: '5.10.1', originalSource: 'ANSI/IEEE C57.13' }, tags: ['instrument-transformer'] },
  { id: 'it-bus-support', text: 'At higher voltages instrument transformers sometimes double as bus supports; confirm allowable external forces with the manufacturer.', cite: { page: 377, section: '5.10.1' }, tags: ['instrument-transformer', 'bus'] },
  { id: 'it-vt-power', text: 'A VT may supply power up to its thermal burden rating, but its accuracy is not maintained in that use.', cite: { page: 377, section: '5.10.1' }, tags: ['instrument-transformer'] },
  { id: 'it-altitude', text: 'Standard ratings apply up to 1000 m (3300 ft); above that apply the Table 5-33 dielectric altitude factors (possibly needing a higher BIL), derate CT current 0.3% per 100 m above 1000 m, and consult the manufacturer for VTs.', cite: { page: [377, 378], section: '5.10.2.1' }, tags: ['instrument-transformer', 'altitude'] },
  { id: 'it-ambient', text: 'Standard ratings assume 30 °C average ambient (40 °C maximum, 24-hour average not over 30 °C); units can be rated for 55 °C ambient inside enclosed switchgear.', cite: { page: 378, section: '5.10.2.2' }, tags: ['instrument-transformer'] },
  { id: 'it-polarity', text: 'Primary terminals are marked H and secondaries X, Y, Z, W, V, U; terminals with the same number are of the same polarity, and on tapped secondaries the lowest and highest numbers span the full winding.', cite: { page: [381, 382], section: '5.10.5' }, tags: ['instrument-transformer'] },
];

/** §5.10.2.1 (pp. 377-378): CT continuous current derating above 1000 m, 0.3% per 100 m. */
export function ctAltitudeCurrentFactor(altitudeM: number): number {
  return altitudeM <= 1000 ? 1 : 1 - 0.003 * ((altitudeM - 1000) / 100);
}

// ---------------------------------------------------------------------------
// Table 5-66 (BIL and dielectric tests), Table 5-67 (temperature rise)
// ---------------------------------------------------------------------------

export interface ItInsulationRow {
  maxSystemKV: number;
  nominalSystemKV: number;
  bilKV: number;
  choppedWaveKV: number;
  choppedWaveMinTimeUs: number | null;
  appliedVoltageKV: number;
  wet10sKV: number | null;
  minCreepageIn: number | null;
  minCreepageMm: number | null;
}

/** Table 5-66 (p. 378): basic impulse insulation levels and dielectric tests for instrument transformers. */
export const TABLE_5_66_IT_INSULATION: readonly ItInsulationRow[] = [
  { maxSystemKV: 0.66, nominalSystemKV: 0.6, bilKV: 10, choppedWaveKV: 12, choppedWaveMinTimeUs: null, appliedVoltageKV: 4, wet10sKV: null, minCreepageIn: null, minCreepageMm: null },
  { maxSystemKV: 1.2, nominalSystemKV: 1.2, bilKV: 30, choppedWaveKV: 36, choppedWaveMinTimeUs: 1.5, appliedVoltageKV: 10, wet10sKV: 6, minCreepageIn: null, minCreepageMm: null },
  { maxSystemKV: 2.75, nominalSystemKV: 2.4, bilKV: 45, choppedWaveKV: 54, choppedWaveMinTimeUs: 1.5, appliedVoltageKV: 15, wet10sKV: 13, minCreepageIn: null, minCreepageMm: null },
  { maxSystemKV: 5.6, nominalSystemKV: 5, bilKV: 60, choppedWaveKV: 69, choppedWaveMinTimeUs: 1.5, appliedVoltageKV: 19, wet10sKV: 20, minCreepageIn: null, minCreepageMm: null },
  { maxSystemKV: 9.52, nominalSystemKV: 8.7, bilKV: 75, choppedWaveKV: 88, choppedWaveMinTimeUs: 1.6, appliedVoltageKV: 26, wet10sKV: 24, minCreepageIn: null, minCreepageMm: null },
  { maxSystemKV: 15.5, nominalSystemKV: 15, bilKV: 95, choppedWaveKV: 110, choppedWaveMinTimeUs: 1.8, appliedVoltageKV: 34, wet10sKV: 30, minCreepageIn: null, minCreepageMm: null },
  { maxSystemKV: 15.5, nominalSystemKV: 15, bilKV: 110, choppedWaveKV: 130, choppedWaveMinTimeUs: 2, appliedVoltageKV: 34, wet10sKV: 34, minCreepageIn: 11, minCreepageMm: 279 },
  { maxSystemKV: 25.5, nominalSystemKV: 25, bilKV: 125, choppedWaveKV: 145, choppedWaveMinTimeUs: 2.25, appliedVoltageKV: 40, wet10sKV: 36, minCreepageIn: 15, minCreepageMm: 381 },
  { maxSystemKV: 25.5, nominalSystemKV: 25, bilKV: 150, choppedWaveKV: 175, choppedWaveMinTimeUs: 3, appliedVoltageKV: 50, wet10sKV: 50, minCreepageIn: 17, minCreepageMm: 432 },
  { maxSystemKV: 36.5, nominalSystemKV: 34.5, bilKV: 200, choppedWaveKV: 230, choppedWaveMinTimeUs: 3, appliedVoltageKV: 70, wet10sKV: 70, minCreepageIn: 26, minCreepageMm: 660 },
  { maxSystemKV: 48.3, nominalSystemKV: 46, bilKV: 250, choppedWaveKV: 290, choppedWaveMinTimeUs: 3, appliedVoltageKV: 95, wet10sKV: 95, minCreepageIn: 35, minCreepageMm: 890 },
  { maxSystemKV: 72.5, nominalSystemKV: 69, bilKV: 350, choppedWaveKV: 400, choppedWaveMinTimeUs: 3, appliedVoltageKV: 140, wet10sKV: 140, minCreepageIn: 48, minCreepageMm: 1220 },
  { maxSystemKV: 121, nominalSystemKV: 115, bilKV: 450, choppedWaveKV: 520, choppedWaveMinTimeUs: 3, appliedVoltageKV: 185, wet10sKV: 185, minCreepageIn: 66, minCreepageMm: 1680 },
  { maxSystemKV: 121, nominalSystemKV: 115, bilKV: 550, choppedWaveKV: 630, choppedWaveMinTimeUs: 3, appliedVoltageKV: 230, wet10sKV: 230, minCreepageIn: 79, minCreepageMm: 2010 },
  { maxSystemKV: 145, nominalSystemKV: 138, bilKV: 650, choppedWaveKV: 750, choppedWaveMinTimeUs: 3, appliedVoltageKV: 275, wet10sKV: 275, minCreepageIn: 92, minCreepageMm: 2340 },
  { maxSystemKV: 169, nominalSystemKV: 161, bilKV: 750, choppedWaveKV: 865, choppedWaveMinTimeUs: 3, appliedVoltageKV: 325, wet10sKV: 315, minCreepageIn: 114, minCreepageMm: 2900 },
  { maxSystemKV: 242, nominalSystemKV: 230, bilKV: 900, choppedWaveKV: 1035, choppedWaveMinTimeUs: 3, appliedVoltageKV: 395, wet10sKV: 350, minCreepageIn: 140, minCreepageMm: 3500 },
  { maxSystemKV: 242, nominalSystemKV: 230, bilKV: 1050, choppedWaveKV: 1210, choppedWaveMinTimeUs: 3, appliedVoltageKV: 460, wet10sKV: 445, minCreepageIn: 170, minCreepageMm: 4320 },
  { maxSystemKV: 362, nominalSystemKV: 345, bilKV: 1300, choppedWaveKV: 1500, choppedWaveMinTimeUs: 3, appliedVoltageKV: 575, wet10sKV: null, minCreepageIn: 205, minCreepageMm: 5210 },
  { maxSystemKV: 550, nominalSystemKV: 500, bilKV: 1675, choppedWaveKV: 1925, choppedWaveMinTimeUs: 3, appliedVoltageKV: 750, wet10sKV: null, minCreepageIn: 318, minCreepageMm: 8080 },
  { maxSystemKV: 550, nominalSystemKV: 500, bilKV: 1800, choppedWaveKV: 2070, choppedWaveMinTimeUs: 3, appliedVoltageKV: 800, wet10sKV: null, minCreepageIn: 318, minCreepageMm: 8080 },
  { maxSystemKV: 800, nominalSystemKV: 765, bilKV: 2050, choppedWaveKV: 2360, choppedWaveMinTimeUs: 3, appliedVoltageKV: 920, wet10sKV: null, minCreepageIn: 442, minCreepageMm: 11200 },
];

export const TABLE_5_66_CITE: Citation = {
  page: 378,
  section: '5.10.2.1',
  table: '5-66',
  originalSource: `${C57_13}, Table 2`,
  note: 'Some wet-withstand values for 1.2-25 kV are distribution transformer bushing requirements (IEEE C57.12.00-1993). Choosing the lower BIL for a voltage class also reduces the other requirements. See Table 5-69 for CTs with breaker dielectric requirements.',
};

/** Table 5-67 (p. 379): limits of temperature rise, °C. */
export const TABLE_5_67_TEMPERATURE_RISE = {
  rows: [
    { type: '55 °C rise', ambient30: { averageWinding: 55, hottestSpot: 65 }, ambient55: { averageWinding: 30, hottestSpot: 40 } },
    { type: '65 °C rise', ambient30: { averageWinding: 65, hottestSpot: 80 }, ambient55: { averageWinding: 40, hottestSpot: 55 } },
    { type: '80 °C rise dry-type', ambient30: { averageWinding: 80, hottestSpot: 110 }, ambient55: { averageWinding: 55, hottestSpot: 85 } },
  ] as const,
  cite: { page: 379, section: '5.10.2.2', table: '5-67', originalSource: `${C57_13}, Table 4`, note: 'Average winding rise by resistance method. CTs inside breakers or power transformers follow ANSI C37.04 or IEEE C57.12.00.' } satisfies Citation,
} as const;

/** §5.10.6.2.7 (p. 388): standard continuous thermal current rating factors (RF), at 30 °C ambient. */
export const CT_RATING_FACTORS = [1.0, 1.33, 1.5, 2.0, 3.0, 4.0] as const;

export const CT_RATING_FACTOR_EXAMPLE = {
  rf: 1.5,
  pctOfRatedAt30C: 150,
  pctOfRatedAt60C: 100,
  cite: { page: 379, section: '5.10.2.2', figure: '5-53', note: 'Fig 5-53 gives permissible loading vs average cooling air temperature for each RF (55 °C rise CTs in air).' } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// Accuracy (Table 5-68) and burdens
// ---------------------------------------------------------------------------

export interface MeteringAccuracyClass {
  cls: 0.3 | 0.6 | 1.2;
  vtTcf: readonly [number, number];
  ctTcfAt100Pct: readonly [number, number];
  ctTcfAt10Pct: readonly [number, number];
}

/** Table 5-68 (p. 380): metering accuracy classes and TCF limits (0.6-1.0 lagging power factor of metered load). */
export const TABLE_5_68_METERING_ACCURACY: readonly MeteringAccuracyClass[] = [
  { cls: 0.3, vtTcf: [0.997, 1.003], ctTcfAt100Pct: [0.997, 1.003], ctTcfAt10Pct: [0.994, 1.006] },
  { cls: 0.6, vtTcf: [0.994, 1.006], ctTcfAt100Pct: [0.994, 1.006], ctTcfAt10Pct: [0.988, 1.012] },
  { cls: 1.2, vtTcf: [0.988, 1.012], ctTcfAt100Pct: [0.988, 1.012], ctTcfAt10Pct: [0.976, 1.024] },
];

export const TABLE_5_68_CITE: Citation = {
  page: 380,
  section: '5.10.3.1',
  table: '5-68',
  originalSource: `${C57_13}, Table 6`,
  note: 'VT limits apply at 90-100% rated voltage (and, per §5.10.7.2.2, 90-110%); the CT 100% limit also applies at the current corresponding to the rating factor. Higher classes such as 0.15 are available from some manufacturers.',
};

export const ACCURACY_DEFINITIONS: readonly Guidance[] = [
  { id: 'acc-tcf', text: 'Transformer correction factor (TCF) = ratio correction factor × phase angle correction factor, for a stated primary power factor.', cite: { page: 381, section: '5.10.3.2' }, tags: ['instrument-transformer', 'metering'] },
  { id: 'acc-rcf', text: 'Ratio correction factor (RCF) = true ratio ÷ marked ratio.', cite: { page: 381, section: '5.10.3.3' }, tags: ['instrument-transformer', 'metering'] },
  { id: 'acc-pacf', text: 'Phase angle correction factor = true power factor ÷ measured power factor; the phase angle is the primary-to-secondary displacement in minutes.', cite: { page: 381, section: '5.10.3.4' }, tags: ['instrument-transformer', 'metering'] },
  { id: 'acc-burden', text: 'Burden (the secondary load) affects accuracy; add device VA arithmetically when well within rating or accuracy is not critical, but vectorially (with power factors) near the limit.', cite: { page: 381, section: '5.10.4', equation: '5-10' }, tags: ['instrument-transformer'] },
];

/** Eq 5-10 (p. 381): VA = E² / Zb (E voltage across the burden, Zb burden impedance). */
export function burdenVA(voltageV: number, burdenImpedanceOhm: number): number {
  return (voltageV * voltageV) / burdenImpedanceOhm;
}

// ---------------------------------------------------------------------------
// Current transformers
// ---------------------------------------------------------------------------

export const CT_GUIDANCE: readonly Guidance[] = [
  { id: 'ct-secondary', text: 'CT secondaries are normally 5 A (1 A per IEC) at rated primary current on the full tap.', cite: { page: 382, section: '5.10.6' }, tags: ['instrument-transformer', 'ct'] },
  { id: 'ct-metering-vs-relay', text: 'Do not use metering CTs for protection or relaying CTs for high-accuracy metering: relaying CTs have large cores that reproduce fault current but are less accurate at low current; metering CTs are accurate at load but saturate just above rated current.', cite: { page: 382, section: '5.10.6' }, tags: ['instrument-transformer', 'ct', 'design-check'] },
  { id: 'ct-taps', text: 'On multi-ratio CTs the accuracy class applies only to the full winding unless stated; lower taps can perform much worse and should be avoided where possible.', cite: { page: 388, section: '5.10.6.2.6' }, tags: ['instrument-transformer', 'ct', 'design-check'] },
  { id: 'ct-short-time', text: 'Short-time (mechanical and thermal) ratings give the primary current, typically for 1 second, the CT withstands with its secondary shorted.', cite: { page: [388, 389], section: '5.10.6.2.8' }, tags: ['instrument-transformer', 'ct'] },
  { id: 'ct-open-circuit', text: 'An open CT secondary can develop dangerous voltage (over 3500 V is cited); always short-circuit unused CT secondaries.', cite: { page: 389, section: '5.10.6.3' }, tags: ['instrument-transformer', 'ct', 'safety', 'design-check'] },
  { id: 'ct-data-metering', text: 'Metering application needs typical RCF and phase angle curves for the rated standard burdens and the short-time ratings.', cite: { page: 389, section: '5.10.6.4' }, tags: ['instrument-transformer', 'ct'] },
  { id: 'ct-data-relaying', text: 'Relaying application needs the relay accuracy class, short-time ratings, secondary winding resistance for each ratio, and excitation curves (C and K) or overcurrent ratio curves (T).', cite: { page: 389, section: '5.10.6.5' }, tags: ['instrument-transformer', 'ct', 'relaying'] },
];

export const CT_TYPES = [
  { id: 'bar', text: 'Bar: a fixed insulated straight conductor (bar, rod or tube) forms a single primary turn through the core.' },
  { id: 'bushing', text: 'Bushing: a round core and secondary with no primary of its own, used around a fully insulated conductor such as an equipment bushing.' },
  { id: 'double-secondary', text: 'Double-secondary: two secondaries on separate cores excited by one primary (three or more also made).' },
  { id: 'window', text: 'Window/donut: secondary on a core with insulation for one or more line-conductor turns threaded through the window.' },
  { id: 'wound', text: 'Wound: a fixed primary of one or more turns encircling the core, fully insulated and integral with the secondary.' },
] as const;

export const CT_TYPES_CITE: Citation = { page: [382, 385], section: '5.10.6.1', figure: '5-54, 5-55' };

/** Table 5-69 (p. 386): BIL and dielectric tests for CTs with the same requirements as outdoor power circuit breakers. */
export const TABLE_5_69_CT_BREAKER_DIELECTRIC = {
  rows: [
    { ratedMaxKV: 121, lowFreq1minDryKV: 260, lowFreq10sWetKV: 230, fullWaveKV: 550, interrupterFullWaveKV: 412, chopped2usKV: 710, chopped3usKV: 632, switchingImpulseKV: null, creepMm: 1780, creepIn: 70 },
    { ratedMaxKV: 145, lowFreq1minDryKV: 310, lowFreq10sWetKV: 275, fullWaveKV: 650, interrupterFullWaveKV: 488, chopped2usKV: 838, chopped3usKV: 748, switchingImpulseKV: null, creepMm: 2130, creepIn: 84 },
    { ratedMaxKV: 169, lowFreq1minDryKV: 365, lowFreq10sWetKV: 315, fullWaveKV: 750, interrupterFullWaveKV: 552, chopped2usKV: 968, chopped3usKV: 862, switchingImpulseKV: null, creepMm: 2490, creepIn: 93 },
    { ratedMaxKV: 242, lowFreq1minDryKV: 425, lowFreq10sWetKV: 350, fullWaveKV: 900, interrupterFullWaveKV: 675, chopped2usKV: 1160, chopped3usKV: 1040, switchingImpulseKV: null, creepMm: 3560, creepIn: 140 },
    { ratedMaxKV: 362, lowFreq1minDryKV: 555, lowFreq10sWetKV: null, fullWaveKV: 1300, interrupterFullWaveKV: 975, chopped2usKV: 1680, chopped3usKV: 1500, switchingImpulseKV: 825, creepMm: 5310, creepIn: 209 },
    { ratedMaxKV: 550, lowFreq1minDryKV: 860, lowFreq10sWetKV: null, fullWaveKV: 1800, interrupterFullWaveKV: 1350, chopped2usKV: 2320, chopped3usKV: 2070, switchingImpulseKV: 1175, creepMm: 8080, creepIn: 318 },
    { ratedMaxKV: 800, lowFreq1minDryKV: 960, lowFreq10sWetKV: null, fullWaveKV: 2050, interrupterFullWaveKV: 1540, chopped2usKV: 2640, chopped3usKV: 2360, switchingImpulseKV: 1425, creepMm: 11200, creepIn: 442 },
  ] as const,
  cite: { page: 386, section: '5.10.6.2.1', table: '5-69', originalSource: `${C57_13}, Table 3 ("B" values from ANSI C37.06-1987)`, note: 'No flashovers are permitted on CTs.' } satisfies Citation,
} as const;

/** Table 5-70 (p. 386): current ratings for CTs with one or two ratios (A primary : A secondary). */
export const TABLE_5_70_CT_RATIOS = {
  singleRatioPrimaryA: [10, 15, 25, 40, 50, 75, 100, 200, 300, 400, 600, 800, 1200, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 12000] as const,
  doubleRatioSeriesParallel: ['25 x 50:5', '50 x 100:5', '100 x 200:5', '200 x 400:5', '400 x 800:5', '600 x 1200:5', '1000 x 2000:5', '2000 x 4000:5'] as const,
  doubleRatioTappedSecondary: ['25/50:5', '50/100:5', '100/200:5', '200/400:5', '300/600:5', '400/800:5', '600/1200:5', '1000/2000:5', '1500/3000:5', '2000/4000:5'] as const,
  secondaryA: 5,
  cite: { page: 386, section: '5.10.6.2.2', table: '5-70', originalSource: `${C57_13}, Table 7` } satisfies Citation,
} as const;

export interface MultiRatioTap {
  ratio: string;
  taps: string;
}

/** Table 5-71 (p. 387): multi-ratio (bushing) CT ratings and secondary taps. */
export const TABLE_5_71_MULTI_RATIO: Readonly<Record<'600:5' | '1200:5' | '2000:5' | '3000:5' | '4000:5' | '5000:5', readonly MultiRatioTap[]>> = {
  '600:5': [
    { ratio: '50:5', taps: 'X2-X3' }, { ratio: '100:5', taps: 'X1-X2' }, { ratio: '150:5', taps: 'X1-X3' }, { ratio: '200:5', taps: 'X4-X5' }, { ratio: '250:5', taps: 'X3-X4' },
    { ratio: '300:5', taps: 'X2-X4' }, { ratio: '400:5', taps: 'X1-X4' }, { ratio: '450:5', taps: 'X3-X5' }, { ratio: '500:5', taps: 'X2-X5' }, { ratio: '600:5', taps: 'X1-X5' },
  ],
  '1200:5': [
    { ratio: '100:5', taps: 'X2-X3' }, { ratio: '200:5', taps: 'X1-X2' }, { ratio: '300:5', taps: 'X1-X3' }, { ratio: '400:5', taps: 'X4-X5' }, { ratio: '500:5', taps: 'X3-X4' },
    { ratio: '600:5', taps: 'X2-X4' }, { ratio: '800:5', taps: 'X1-X4' }, { ratio: '900:5', taps: 'X3-X5' }, { ratio: '1000:5', taps: 'X2-X5' }, { ratio: '1200:5', taps: 'X1-X5' },
  ],
  '2000:5': [
    { ratio: '300:5', taps: 'X3-X4' }, { ratio: '400:5', taps: 'X1-X2' }, { ratio: '500:5', taps: 'X4-X5' }, { ratio: '800:5', taps: 'X2-X3' }, { ratio: '1100:5', taps: 'X2-X4' },
    { ratio: '1200:5', taps: 'X1-X3' }, { ratio: '1500:5', taps: 'X1-X4' }, { ratio: '1600:5', taps: 'X2-X5' }, { ratio: '2000:5', taps: 'X1-X5' },
  ],
  '3000:5': [
    { ratio: '300:5', taps: 'X3-X4' }, { ratio: '500:5', taps: 'X4-X5' }, { ratio: '800:5', taps: 'X3-X5' }, { ratio: '1000:5', taps: 'X1-X2' }, { ratio: '1200:5', taps: 'X2-X3' },
    { ratio: '1500:5', taps: 'X2-X4' }, { ratio: '2000:5', taps: 'X2-X5' }, { ratio: '2200:5', taps: 'X1-X3' }, { ratio: '2500:5', taps: 'X1-X4' }, { ratio: '3000:5', taps: 'X1-X5' },
  ],
  '4000:5': [
    { ratio: '500:5', taps: 'X1-X2' }, { ratio: '1000:5', taps: 'X3-X4' }, { ratio: '1500:5', taps: 'X2-X3' }, { ratio: '2000:5', taps: 'X1-X3' }, { ratio: '2500:5', taps: 'X2-X4' },
    { ratio: '3000:5', taps: 'X1-X4' }, { ratio: '3500:5', taps: 'X2-X5' }, { ratio: '4000:5', taps: 'X1-X5' },
  ],
  '5000:5': [
    { ratio: '500:5', taps: 'X2-X3' }, { ratio: '1000:5', taps: 'X4-X5' }, { ratio: '1500:5', taps: 'X1-X2' }, { ratio: '2000:5', taps: 'X3-X4' }, { ratio: '2500:5', taps: 'X2-X4' },
    { ratio: '3000:5', taps: 'X3-X5' }, { ratio: '3500:5', taps: 'X2-X5' }, { ratio: '4000:5', taps: 'X1-X4' }, { ratio: '5000:5', taps: 'X1-X5' },
  ],
};

export const TABLE_5_71_CITE: Citation = { page: 387, section: '5.10.6.2.2', table: '5-71', originalSource: `${C57_13}, Table 8` };

export interface CtBurden {
  designation: string;
  kind: 'metering' | 'relaying';
  resistanceOhm: number;
  inductanceMH: number;
  impedanceOhm: number;
  vaAt5A: number;
  powerFactor: number;
}

/** Table 5-72 (p. 388): standard burdens for CTs with 5 A secondaries (60 Hz). */
export const TABLE_5_72_CT_BURDENS: readonly CtBurden[] = [
  { designation: 'B-0.1', kind: 'metering', resistanceOhm: 0.09, inductanceMH: 0.116, impedanceOhm: 0.1, vaAt5A: 2.5, powerFactor: 0.9 },
  { designation: 'B-0.2', kind: 'metering', resistanceOhm: 0.18, inductanceMH: 0.232, impedanceOhm: 0.2, vaAt5A: 5.0, powerFactor: 0.9 },
  { designation: 'B-0.5', kind: 'metering', resistanceOhm: 0.45, inductanceMH: 0.58, impedanceOhm: 0.5, vaAt5A: 12.5, powerFactor: 0.9 },
  { designation: 'B-0.9', kind: 'metering', resistanceOhm: 0.81, inductanceMH: 1.04, impedanceOhm: 0.9, vaAt5A: 22.5, powerFactor: 0.9 },
  { designation: 'B-1.8', kind: 'metering', resistanceOhm: 1.62, inductanceMH: 2.08, impedanceOhm: 1.8, vaAt5A: 45.0, powerFactor: 0.9 },
  { designation: 'B-1', kind: 'relaying', resistanceOhm: 0.5, inductanceMH: 2.3, impedanceOhm: 1.0, vaAt5A: 25, powerFactor: 0.5 },
  { designation: 'B-2', kind: 'relaying', resistanceOhm: 1.0, inductanceMH: 4.6, impedanceOhm: 2.0, vaAt5A: 50, powerFactor: 0.5 },
  { designation: 'B-4', kind: 'relaying', resistanceOhm: 2.0, inductanceMH: 9.2, impedanceOhm: 4.0, vaAt5A: 100, powerFactor: 0.5 },
  { designation: 'B-8', kind: 'relaying', resistanceOhm: 4.0, inductanceMH: 18.4, impedanceOhm: 8.0, vaAt5A: 200, powerFactor: 0.5 },
];

export const TABLE_5_72_CITE: Citation = {
  page: 388,
  section: '5.10.6.2.3',
  table: '5-72',
  originalSource: `${C57_13}, Table 9`,
  note: 'For other than 5 A rated secondaries, multiply resistance and inductance by (5/rated A)²; VA and power factor stay the same. Designations have no meaning except at 60 Hz. Example metering rating: 0.3B-0.1 and B-0.2, 0.6B-0.5.',
};

/** Table 5-72 note: ohmic burden scaled to a CT with a rated secondary other than 5 A. */
export function scaleCtBurdenOhms(burden: CtBurden, ratedSecondaryA: number): { resistanceOhm: number; inductanceMH: number } {
  const f = (5 / ratedSecondaryA) ** 2;
  return { resistanceOhm: burden.resistanceOhm * f, inductanceMH: burden.inductanceMH * f };
}

/** §5.10.6.2.5 (p. 388): relay accuracy classes. */
export const CT_RELAY_ACCURACY = {
  classes: [
    { letter: 'C', text: 'Ratio can be calculated from the marked ratio and typical excitation curves (C57.13 para 8.1.10).' },
    { letter: 'K', text: 'Same as C: ratio can be calculated.' },
    { letter: 'T', text: 'Ratio must be determined by test; the manufacturer supplies test data.' },
  ] as const,
  secondaryVoltageRatingsV: [10, 20, 50, 100, 200, 400, 800] as const,
  definition: 'Secondary terminal voltage the CT delivers to a standard burden at 20 × rated secondary current (and at 1-20 × at any lesser burden) without exceeding 10% ratio error.',
  multipleOfRated: 20,
  maxRatioErrorPct: 10,
  example: { cls: 'C400', burdenOhm: 4.0, secondaryA: 5, multiple: 20, volts: 400 },
  cite: { page: 388, section: '5.10.6.2.5' } satisfies Citation,
} as const;

/** Maximum standard burden (Ω) for a C/K/T voltage rating: V / (20 × 5 A); e.g. C400 → 4.0 Ω. */
export function relayClassMaxBurdenOhm(voltageRatingV: number, ratedSecondaryA = 5): number {
  return voltageRatingV / (CT_RELAY_ACCURACY.multipleOfRated * ratedSecondaryA);
}

/** Smallest single-ratio CT primary (Table 5-70) at or above a load current, a game convenience. */
export function nextStandardCtPrimaryA(loadA: number): number | null {
  return TABLE_5_70_CT_RATIOS.singleRatioPrimaryA.find((a) => a >= loadA) ?? null;
}

// ---------------------------------------------------------------------------
// Voltage transformers
// ---------------------------------------------------------------------------

export interface VtGroup {
  group: 1 | 2 | 3 | 4 | 5;
  service: string;
  capability: string;
  cite: Citation;
}

/** §5.10.7.2.1 and Tables 5-73..5-77 (pp. 391-396): VT groups. */
export const VT_GROUPS: readonly VtGroup[] = [
  { group: 1, service: '100% of rated primary voltage across the winding, connected line-to-line, line-to-ground or line-to-neutral.', capability: '125% of rated voltage on an emergency basis if burden ≤ 64% of thermal burden rating (reduced life; ferroresonance still possible).', cite: { page: [391, 392], section: '5.10.7.2.1', table: '5-73', originalSource: `${C57_13}, Table 10` } },
  { group: 2, service: 'Line-to-line service; may be used line-to-ground or line-to-neutral at rated L-L voltage ÷ √3 (insulation limit to ground).', capability: '—', cite: { page: [391, 393], section: '5.10.7.2.1', table: '5-74', originalSource: `${C57_13}, Table 11` } },
  { group: 3, service: 'Line-to-ground only, two secondaries, outdoor; insulated- or grounded-neutral terminal.', capability: 'Ratings through 161 kV GrdY: 3 × rated voltage for 1 min; 230 kV GrdY and above: 140% for 1 min (175 °C rise Cu / 125 °C EC Al); 110% continuous within thermal burden.', cite: { page: [391, 394], section: '5.10.7.2.1', table: '5-75', originalSource: `${C57_13}, Table 12` } },
  { group: 4, service: 'Line-to-ground only, indoor; 4A for operation at about 100% of rated voltage, 4B at about 58%.', capability: '110% continuous within thermal burden; 4A also 125% emergency at ≤ 64% thermal burden.', cite: { page: [391, 395], section: '5.10.7.2.1', table: '5-76', originalSource: `${C57_13}, Table 13` } },
  { group: 5, service: 'Line-to-ground only, outdoor, grounded systems; like Group 3 but single ratio and lower voltage classes.', capability: '140% for 1 min (175 °C rise Cu / 125 °C EC Al); 110% continuous within thermal burden.', cite: { page: [391, 396], section: '5.10.7.2.1', table: '5-77', originalSource: `${C57_13}, Table 14` } },
];

export interface VtRatingRow {
  group: 1 | 2 | 3 | '4A' | '4B' | 5;
  ratedVoltage: string;
  markedRatio: string;
  bilKV: string;
}

/** Tables 5-73..5-77 (pp. 392-396): VT ratings, as printed (BIL "110 or 95" means either may be chosen). */
export const VT_RATINGS: readonly VtRatingRow[] = [
  { group: 1, ratedVoltage: '120 for 208Y', markedRatio: '1:1', bilKV: '10' }, { group: 1, ratedVoltage: '240 for 416Y', markedRatio: '2:1', bilKV: '10' },
  { group: 1, ratedVoltage: '300 for 520Y', markedRatio: '2.5:1', bilKV: '10' }, { group: 1, ratedVoltage: '120 for 208Y', markedRatio: '1:1', bilKV: '30' },
  { group: 1, ratedVoltage: '240 for 416Y', markedRatio: '2:1', bilKV: '30' }, { group: 1, ratedVoltage: '300 for 520Y', markedRatio: '2.5:1', bilKV: '30' },
  { group: 1, ratedVoltage: '480 for 832Y', markedRatio: '4:1', bilKV: '30' }, { group: 1, ratedVoltage: '600 for 1040Y', markedRatio: '5:1', bilKV: '30' },
  { group: 1, ratedVoltage: '2400 for 4160Y', markedRatio: '20:1', bilKV: '60' }, { group: 1, ratedVoltage: '4200 for 7280Y', markedRatio: '35:1', bilKV: '75' },
  { group: 1, ratedVoltage: '4800 for 8320Y', markedRatio: '40:1', bilKV: '75' }, { group: 1, ratedVoltage: '7200 for 12 470Y', markedRatio: '60:1', bilKV: '110 or 95' },
  { group: 1, ratedVoltage: '8400 for 14 560Y', markedRatio: '70:1', bilKV: '110 or 95' },
  { group: 2, ratedVoltage: '120 for 120Y', markedRatio: '1:1', bilKV: '10' }, { group: 2, ratedVoltage: '240 for 240Y', markedRatio: '2:1', bilKV: '10' },
  { group: 2, ratedVoltage: '300 for 300Y', markedRatio: '2.5:1', bilKV: '10' }, { group: 2, ratedVoltage: '480 for 480Y', markedRatio: '4:1', bilKV: '10' },
  { group: 2, ratedVoltage: '600 for 600Y', markedRatio: '5:1', bilKV: '10' }, { group: 2, ratedVoltage: '2400 for 2400Y', markedRatio: '20:1', bilKV: '45' },
  { group: 2, ratedVoltage: '4800 for 4800Y', markedRatio: '40:1', bilKV: '60' }, { group: 2, ratedVoltage: '7200 for 7200Y', markedRatio: '60:1', bilKV: '75' },
  { group: 2, ratedVoltage: '12 000 for 12 000Y', markedRatio: '100:1', bilKV: '110 or 95' }, { group: 2, ratedVoltage: '14 400 for 14 400Y', markedRatio: '120:1', bilKV: '110 or 95' },
  { group: 2, ratedVoltage: '24 000 for 24 000Y', markedRatio: '200:1', bilKV: '150 or 125' }, { group: 2, ratedVoltage: '34 500 for 34 500Y', markedRatio: '300:1', bilKV: '200 or 150' },
  { group: 2, ratedVoltage: '46 000 for 46 000Y', markedRatio: '400:1', bilKV: '250' }, { group: 2, ratedVoltage: '69 000 for 69 000Y', markedRatio: '600:1', bilKV: '350' },
  { group: 3, ratedVoltage: '24 940 Grd Y/14 400', markedRatio: '120/200 and 120/200:1', bilKV: '150 or 125' },
  { group: 3, ratedVoltage: '34 500 Grd Y/20 125', markedRatio: '175/300 and 175/300:1', bilKV: '200' },
  { group: 3, ratedVoltage: '46 000 Grd Y/27 600', markedRatio: '240/400 and 240/400:1', bilKV: '250' },
  { group: 3, ratedVoltage: '69 000 Grd Y/40 250', markedRatio: '350/600 and 350/600:1', bilKV: '350' },
  { group: 3, ratedVoltage: '115 000 Grd Y/69 000', markedRatio: '600/1000 and 600/1000:1', bilKV: '550 or 450' },
  { group: 3, ratedVoltage: '138 000 Grd Y/80 500', markedRatio: '700/1200 and 700/1200:1', bilKV: '650 or 550' },
  { group: 3, ratedVoltage: '161 000 Grd Y/92 000', markedRatio: '800/1400 and 800/1400:1', bilKV: '750 or 650' },
  { group: 3, ratedVoltage: '230 000 Grd Y/138 000', markedRatio: '1200/2000 and 1200/2000:1', bilKV: '1050 or 900' },
  { group: 3, ratedVoltage: '345 000 Grd Y/207 000', markedRatio: '1800/3000 and 1800/3000:1', bilKV: '1300 or 1175' },
  { group: 3, ratedVoltage: '500 000 Grd Y/287 500', markedRatio: '2500/4500 and 2500/4500:1', bilKV: '1800 or 1675' },
  { group: 3, ratedVoltage: '750 000 Grd Y/431 250', markedRatio: '3750/6250 and 3750/6250:1', bilKV: '2050' },
  { group: '4A', ratedVoltage: '4160 Grd Y/2400', markedRatio: '20:1', bilKV: '60' }, { group: '4A', ratedVoltage: '7200 Grd Y/4200', markedRatio: '35:1', bilKV: '75' },
  { group: '4A', ratedVoltage: '8320 Grd Y/4800', markedRatio: '40:1', bilKV: '75' }, { group: '4A', ratedVoltage: '12 470 Grd Y/7200', markedRatio: '60:1', bilKV: '110 or 95' },
  { group: '4A', ratedVoltage: '14 560 Grd Y/8400', markedRatio: '70:1', bilKV: '110 or 95' },
  { group: '4B', ratedVoltage: '4160 Grd Y/4200', markedRatio: '35:1', bilKV: '60' }, { group: '4B', ratedVoltage: '4800 Grd Y/4800', markedRatio: '40:1', bilKV: '60' },
  { group: '4B', ratedVoltage: '7200 Grd Y/7200', markedRatio: '60:1', bilKV: '75' }, { group: '4B', ratedVoltage: '12 000 Grd Y/12 000', markedRatio: '100:1', bilKV: '110 or 95' },
  { group: '4B', ratedVoltage: '14 400 Grd Y/14 400', markedRatio: '120:1', bilKV: '110 or 95' },
  { group: 5, ratedVoltage: '7200 for 12 470 Gnd Y', markedRatio: '60:1', bilKV: '110' }, { group: 5, ratedVoltage: '8400 for 14 560 Gnd Y', markedRatio: '70:1', bilKV: '110' },
  { group: 5, ratedVoltage: '12 000 for 20 800 Gnd Y', markedRatio: '100:1', bilKV: '150 or 125' }, { group: 5, ratedVoltage: '14 400 for 25 000 Gnd Y', markedRatio: '120:1', bilKV: '150 or 125' },
  { group: 5, ratedVoltage: '20 125 for 34 500 Gnd Y', markedRatio: '175:1', bilKV: '200 or 150' },
];

export const VT_RATINGS_CITE: Citation = {
  page: [392, 396],
  section: '5.10.7.2.1',
  table: '5-73 to 5-77',
  originalSource: `${C57_13}, Tables 10-14`,
  note: 'Printed oddities kept: Group 1 "300 for 520 T" (read as 520Y) and "14 560”Y"; Group 4B row "4160 Grd Y/4200" as printed. Group 3 345-750 kV maximum rated voltages are 362, 550 and 800 kV (ANSI C92). Line-to-ground VTs on ungrounded systems are not grounding transformers and must not have secondaries in closed delta.',
};

export interface VtBurden {
  designation: 'W' | 'X' | 'M' | 'Y' | 'Z' | 'ZZ';
  va: number;
  powerFactor: number;
  at120V: { resistanceOhm: number; inductanceH: number; impedanceOhm: number };
  at69_3V: { resistanceOhm: number; inductanceH: number; impedanceOhm: number };
}

/** Table 5-78 (p. 396): standard burdens for VTs (identical values appear for CCVTs in Table 5-80, p. 407). */
export const TABLE_5_78_VT_BURDENS: readonly VtBurden[] = [
  { designation: 'W', va: 12.5, powerFactor: 0.1, at120V: { resistanceOhm: 115.2, inductanceH: 3.04, impedanceOhm: 1152 }, at69_3V: { resistanceOhm: 38.4, inductanceH: 1.01, impedanceOhm: 384 } },
  { designation: 'X', va: 25, powerFactor: 0.7, at120V: { resistanceOhm: 403.2, inductanceH: 1.09, impedanceOhm: 576 }, at69_3V: { resistanceOhm: 134.4, inductanceH: 0.364, impedanceOhm: 192 } },
  { designation: 'M', va: 35, powerFactor: 0.2, at120V: { resistanceOhm: 82.3, inductanceH: 1.07, impedanceOhm: 411 }, at69_3V: { resistanceOhm: 27.4, inductanceH: 0.356, impedanceOhm: 137 } },
  { designation: 'Y', va: 75, powerFactor: 0.85, at120V: { resistanceOhm: 163.2, inductanceH: 0.268, impedanceOhm: 192 }, at69_3V: { resistanceOhm: 54.4, inductanceH: 0.0894, impedanceOhm: 64 } },
  { designation: 'Z', va: 200, powerFactor: 0.85, at120V: { resistanceOhm: 61.2, inductanceH: 0.101, impedanceOhm: 72 }, at69_3V: { resistanceOhm: 20.4, inductanceH: 0.0335, impedanceOhm: 24 } },
  { designation: 'ZZ', va: 400, powerFactor: 0.85, at120V: { resistanceOhm: 30.6, inductanceH: 0.0503, impedanceOhm: 36 }, at69_3V: { resistanceOhm: 10.2, inductanceH: 0.0168, impedanceOhm: 12 } },
];

export const TABLE_5_78_CITE: Citation = { page: 396, section: '5.10.7.2.2', table: '5-78', originalSource: `${C57_13}, Table 15`, note: 'Designations meaningful only at 60 Hz. Example VT accuracy rating: 0.3W and X, 0.6Y, 1.2Z.' };

export const VT_GUIDANCE: readonly Guidance[] = [
  { id: 'vt-def', text: 'A voltage (potential) transformer has its primary connected in shunt with the circuit whose voltage is measured or controlled.', cite: { page: 389, section: '5.10.7' }, tags: ['instrument-transformer', 'vt'] },
  { id: 'vt-types', text: 'VT types include cascade, double-secondary, grounded-neutral terminal, insulated-neutral terminal, single high-voltage line terminal and two high-voltage line terminal designs.', cite: { page: [389, 391], section: '5.10.7.1', figure: '5-56' }, tags: ['instrument-transformer', 'vt'] },
  { id: 'vt-accuracy', text: 'VT accuracy classes hold the TCF within Table 5-68 limits for metered-load power factors of 0.6 lag to 1.0, from zero to the specified standard burden, and 90-110% rated voltage.', cite: { page: 398, section: '5.10.7.2.2', table: '5-68' }, tags: ['instrument-transformer', 'vt', 'metering'] },
  { id: 'vt-thermal', text: 'The thermal burden rating is the largest burden the VT carries at rated secondary voltage without exceeding Table 5-67 rise above 30 °C (86 °F).', cite: { page: 398, section: '5.10.7.2.3' }, tags: ['instrument-transformer', 'vt'] },
  { id: 'vt-no-closed-delta', text: 'Line-to-ground VTs on an ungrounded system are not grounding transformers; never operate their secondaries in closed delta, as excessive current may flow.', cite: { page: [392, 396], table: '5-73 to 5-77' }, tags: ['instrument-transformer', 'vt', 'design-check'] },
  { id: 'vt-data', text: 'Obtain typical ratio and phase angle curves, accuracy ratings for all standard burdens, and the thermal burden rating from the manufacturer.', cite: { page: 398, section: '5.10.7.3' }, tags: ['instrument-transformer', 'vt'] },
];

export const COMBINATION_UNITS: readonly Guidance[] = [
  { id: 'combo-metering', text: 'Combined metering units put a VT and CT in one free-standing unit for revenue metering, saving a structure and foundation, but a failure of either part takes the whole unit out.', cite: { page: 398, section: '5.10.8.1' }, tags: ['instrument-transformer', 'metering'] },
  { id: 'combo-pvt', text: 'Power voltage transformers combine a station-service power winding (typically 10-100 kVA) with metering/relaying VT windings; useful at remote switching stations without local distribution, but loading the power winding degrades accuracy.', cite: { page: 398, section: '5.10.8.2' }, tags: ['instrument-transformer', 'auxiliary'] },
  { id: 'it-tests', text: 'Routine factory tests (C57.13 §4.7.2) include applied and induced potential, accuracy and polarity; consult C57.13 Section 8 before any field testing.', cite: { page: 399, section: '5.10.9' }, tags: ['instrument-transformer', 'test'] },
];

// ---------------------------------------------------------------------------
// Coupling capacitors and CCVTs (§5.11)
// ---------------------------------------------------------------------------

export const CC_CCVT_GUIDANCE: readonly Guidance[] = [
  { id: 'cc-purpose', text: 'Coupling capacitors couple power line carrier signals to a high-voltage line, together with line traps and tuners; adding an electromagnetic unit makes a CCVT that also supplies relaying and metering voltage.', cite: { page: 400, section: '5.11.1', originalSource: 'ANSI C93.1' }, tags: ['instrument-transformer', 'communications', 'plc'] },
  { id: 'cc-parts', text: 'A coupling capacitor comprises the oil-filled porcelain capacitor stack and base with drain coil, carrier grounding switch (hookstick operated), protective gap, lead-in terminal, line terminal (no fusing needed), low-voltage and ground terminals, and optional space heater.', cite: { page: [400, 401], section: '5.11.2', figure: '5-58' }, tags: ['instrument-transformer', 'plc'] },
  { id: 'ccvt-economy', text: 'CCVTs, often without carrier accessories, are a more economical alternative to inductive VTs especially above 115 kV, with the same ratings and accuracy available.', cite: { page: 401, section: '5.11.3' }, tags: ['instrument-transformer', 'vt'] },
  { id: 'ccvt-transient', text: 'Stored energy in the capacitors can momentarily distort CCVT secondary voltage after sudden line voltage drops; modern designs minimize this.', cite: { page: 402, section: '5.11.3' }, tags: ['instrument-transformer', 'relaying'] },
  { id: 'ccvt-secondary', text: 'CCVT secondaries are typically 120 V line-to-neutral with a 69.3 V tap; they are usually fused (critical protection circuits sometimes not), must never be intentionally shorted or connected in closed delta.', cite: { page: 403, section: '5.11.3.2-5.11.3.3' }, tags: ['instrument-transformer', 'design-check'] },
  { id: 'ccvt-energize', text: 'Never energize a CCVT from its secondary winding, in test or operation.', cite: { page: 408, section: '5.11.6' }, tags: ['instrument-transformer', 'safety'] },
  { id: 'ccvt-capacitance', text: '"High capacitance" CCVTs (up to 200 VA, classes 0.3/0.6/1.2) suit relaying and SCADA but not revenue metering; "extra-high capacitance" units (up to 400 VA), mainly 115 kV and above, are the only CCVTs suitable for revenue metering (class 0.3) and give better carrier coupling.', cite: { page: [407, 408], section: '5.11.5.4' }, tags: ['instrument-transformer', 'metering', 'design-check'] },
  { id: 'ccvt-accuracy', text: 'Metering CCVTs hold accuracy (0.3, 0.6 or 1.2) from 90% of performance reference voltage to maximum rated voltage; relaying CCVTs are always class 1.2R with added frequency and low-voltage requirements.', cite: { page: 407, section: '5.11.5.3' }, tags: ['instrument-transformer', 'relaying', 'metering'] },
  { id: 'ccvt-full-bil', text: 'Standard CCs and CCVTs are rated line-to-ground with full BIL for each voltage, partly because they sit at line terminations exposed to incoming surges.', cite: { page: 404, section: '5.11.5.1', table: '5-79' }, tags: ['instrument-transformer', 'insulation'] },
];

export const CC_SERVICE_CONDITIONS = {
  ambientC: [-40, 45] as const,
  ambientF: [-40, 113] as const,
  meanLimitsC: { oneHour: 45, twentyFourHours: 40, oneYear: 30 },
  maxAltitudeM: 1000,
  maxAltitudeFt: 3300,
  dielectricLossPctPer500mAbove1000m: 5,
  powerFrequencyHz: 60,
  carrierFrequencyKHz: [30, 500] as const,
  unusual: ['damaging or explosive fumes', 'excessive, abrasive or explosive dust', 'steam', 'salt spray', 'high-voltage cable systems', 'gas-insulated substations'] as const,
  cite: { page: 404, section: '5.11.4', originalSource: 'ANSI C93.1' } satisfies Citation,
} as const;

export interface CcRatingRow {
  nominalKV: number;
  maxSystemKV: number;
  maxRatedKV: number;
  pfWithstand1minDryKV: number;
  pfWithstand10sWetKV: number;
  bilKV: number;
  bslKV: number | null;
  minLeakageIn: number;
  minLeakageMm: number;
  ccvtPerformanceReferenceV: number;
  markedRatioLower: string;
  markedRatioHigher: string;
}

/** Table 5-79 (p. 406): CC/CCVT voltage ratings, dielectric strengths, leakage distances and marked ratios. */
export const TABLE_5_79_CC_RATINGS: readonly CcRatingRow[] = [
  { nominalKV: 34.5, maxSystemKV: 36.2, maxRatedKV: 21, pfWithstand1minDryKV: 85, pfWithstand10sWetKV: 72, bilKV: 200, bslKV: null, minLeakageIn: 26, minLeakageMm: 660, ccvtPerformanceReferenceV: 20125, markedRatioLower: '175:1', markedRatioHigher: '300:1' },
  { nominalKV: 46, maxSystemKV: 48.3, maxRatedKV: 28, pfWithstand1minDryKV: 110, pfWithstand10sWetKV: 95, bilKV: 250, bslKV: null, minLeakageIn: 35, minLeakageMm: 890, ccvtPerformanceReferenceV: 27600, markedRatioLower: '240:1', markedRatioHigher: '400:1' },
  { nominalKV: 69, maxSystemKV: 72.5, maxRatedKV: 42, pfWithstand1minDryKV: 165, pfWithstand10sWetKV: 140, bilKV: 350, bslKV: null, minLeakageIn: 48, minLeakageMm: 1220, ccvtPerformanceReferenceV: 40250, markedRatioLower: '350:1', markedRatioHigher: '600:1' },
  { nominalKV: 115, maxSystemKV: 121, maxRatedKV: 70, pfWithstand1minDryKV: 265, pfWithstand10sWetKV: 230, bilKV: 550, bslKV: null, minLeakageIn: 79, minLeakageMm: 2010, ccvtPerformanceReferenceV: 69000, markedRatioLower: '600:1', markedRatioHigher: '1000:1' },
  { nominalKV: 138, maxSystemKV: 145, maxRatedKV: 84, pfWithstand1minDryKV: 320, pfWithstand10sWetKV: 275, bilKV: 650, bslKV: null, minLeakageIn: 92, minLeakageMm: 2340, ccvtPerformanceReferenceV: 80500, markedRatioLower: '700:1', markedRatioHigher: '1200:1' },
  { nominalKV: 161, maxSystemKV: 169, maxRatedKV: 98, pfWithstand1minDryKV: 370, pfWithstand10sWetKV: 325, bilKV: 750, bslKV: null, minLeakageIn: 114, minLeakageMm: 2900, ccvtPerformanceReferenceV: 92000, markedRatioLower: '800:1', markedRatioHigher: '1400:1' },
  { nominalKV: 230, maxSystemKV: 242, maxRatedKV: 140, pfWithstand1minDryKV: 525, pfWithstand10sWetKV: 460, bilKV: 1050, bslKV: null, minLeakageIn: 154, minLeakageMm: 3910, ccvtPerformanceReferenceV: 138000, markedRatioLower: '1200:1', markedRatioHigher: '2000:1' },
  { nominalKV: 345, maxSystemKV: 362, maxRatedKV: 209, pfWithstand1minDryKV: 785, pfWithstand10sWetKV: 680, bilKV: 1550, bslKV: 975, minLeakageIn: 230, minLeakageMm: 5840, ccvtPerformanceReferenceV: 207000, markedRatioLower: '1800:1', markedRatioHigher: '3000:1' },
  { nominalKV: 500, maxSystemKV: 550, maxRatedKV: 318, pfWithstand1minDryKV: 900, pfWithstand10sWetKV: 780, bilKV: 1800, bslKV: 1300, minLeakageIn: 350, minLeakageMm: 8890, ccvtPerformanceReferenceV: 287500, markedRatioLower: '2500:1', markedRatioHigher: '4500:1' },
  { nominalKV: 765, maxSystemKV: 800, maxRatedKV: 462, pfWithstand1minDryKV: 1200, pfWithstand10sWetKV: 1050, bilKV: 2425, bslKV: 1675, minLeakageIn: 510, minLeakageMm: 12950, ccvtPerformanceReferenceV: 431250, markedRatioLower: '3750:1', markedRatioHigher: '6250:1' },
];

export const TABLE_5_79_CITE: Citation = {
  page: 406,
  section: '5.11.5.1',
  table: '5-79',
  originalSource: `${C93_1}, Table 3 (reproduced with NEMA permission)`,
  note: 'Maximum rated voltage = maximum system voltage ÷ √3 (phase-to-ground). Applying the performance reference voltage gives 115 V across the lower-ratio secondary. Table 5-80 (p. 407) CCVT accuracy burdens equal Table 5-78 (M, W, X, Y, Z, ZZ).',
};

/** §5.11.4.2 (p. 404): approximate CC/CCVT dielectric strength factor above 1000 m (−5% per 500 m). */
export function ccDielectricAltitudeFactor(altitudeM: number): number {
  return altitudeM <= 1000 ? 1 : 1 - 0.05 * ((altitudeM - 1000) / 500);
}

/** No worked numeric example in §5.10-5.11 beyond the C400 and RF illustrations above. */
export const INSTRUMENT_TRANSFORMER_EXAMPLE = null;
