/**
 * Shunt capacitor equipment data from RUS Bulletin 1724E-300 §5.6 (pp. 262-298).
 *
 * Covers: purpose and system considerations (switching transients, back-to-back inrush with
 * Eq. 5-4 and Example 5-1, resonance), bank types (open-rack, metal-enclosed), bank
 * configurations (grounded wye, ungrounded wye, delta, double wye, series groups), ratings
 * (Table 5-35), switching devices (Table 5-36) and current multipliers, controls (Table 5-37),
 * fusing and protective controls, grounding/short-circuiting safety (§5.6.8) and mounting.
 * Guidance text is paraphrased.
 */
import type { Citation, Guidance, Sourced } from './types';

// ---------------------------------------------------------------------------
// Purpose and system considerations
// ---------------------------------------------------------------------------

export const CAPACITOR_SYSTEM_GUIDANCE: readonly Guidance[] = [
  {
    id: 'cap-purpose',
    text: 'Substation shunt capacitor banks improve power factor and voltage by supplying leading kilovars; sizing and location criteria are in RUS Bulletin 1724D-112.',
    cite: { page: 262, section: '5.6.1', originalSource: 'IEEE Std. 1036; NEMA Std. CP-1' },
    tags: ['capacitor'],
  },
  {
    id: 'cap-study-each-bank',
    text: 'Evaluate switching transients and possible harmonic resonance for every bank installation, because a bank changes how the system responds to disturbances.',
    cite: { page: 263, section: '5.6.2.1' },
    tags: ['capacitor', 'studies', 'design-check'],
  },
  {
    id: 'cap-isolated-inrush',
    text: 'Inrush to a single isolated bank is less than the available fault current, so it does not limit a circuit breaker, but the momentary rating of other switching devices should be checked.',
    cite: { page: 263, section: '5.6.2.2.1.1' },
    tags: ['capacitor', 'switching', 'inrush'],
  },
  {
    id: 'cap-back-to-back',
    text: 'Energizing a bank next to one already on the same bus causes very high, high-frequency inrush between the banks that decays within a fraction of a cycle; added inductance may be required (Fig. 5-13).',
    cite: { page: 263, section: '5.6.2.2.1.2', figure: '5-13' },
    tags: ['capacitor', 'switching', 'inrush', 'reactor'],
  },
  {
    id: 'cap-induced-voltage',
    text: 'Inrush can induce voltages in control cables; limit them with shielded cables, radial circuits within one cable, and single-point or peninsula grounding of the bank.',
    cite: { page: 264, section: '5.6.2.2.1.3', originalSource: 'ANSI/IEEE Std. C37.99' },
    tags: ['capacitor', 'control-cable', 'grounding'],
  },
  {
    id: 'cap-voltage-magnification',
    text: 'Capacitors at more than one voltage level can amplify switching transients at the secondary-side bank, tripping adjustable-speed drives and damaging surge suppressors.',
    cite: { page: 265, section: '5.6.2.2.1.4' },
    tags: ['capacitor', 'switching', 'power-quality'],
  },
  {
    id: 'cap-transient-control',
    text: 'Switching transients can be cut with series current-limiting reactance or with pre-insertion inductors on circuit switchers, pre-insertion resistors on breakers, or synchronously closed vacuum switches.',
    cite: { page: 265, section: '5.6.2.2.2' },
    tags: ['capacitor', 'switching', 'circuit-switcher', 'breaker'],
  },
  {
    id: 'cap-restrike',
    text: 'A switching device that restrikes while interrupting capacitive current produces about three times system voltage; make sure banks are not dropped by underrated upstream breakers.',
    cite: { page: 265, section: '5.6.2.2.3' },
    tags: ['capacitor', 'switching', 'breaker', 'design-check'],
  },
  {
    id: 'cap-spacing-reactors',
    text: 'Spacing banks as far apart as possible in the yard may supply enough inductance to limit inrush; otherwise install current-limiting reactors between parallel switched banks, spaced apart to limit mutual coupling.',
    cite: { page: [265, 267], section: '5.6.2.2.4' },
    tags: ['capacitor', 'reactor', 'layout'],
  },
  {
    id: 'cap-reactor-rating',
    text: 'Inrush reactors should be continuously rated at least equal to the switches they protect and meet IEEE C57.16; give the manufacturer total substation MVAR, bus inductance between banks and available fault current.',
    cite: { page: [266, 267], section: '5.6.2.2.4' },
    tags: ['capacitor', 'reactor', 'specification'],
  },
  {
    id: 'cap-resonance',
    text: 'A shunt bank resonates with system inductance; remote switching or harmonic sources can excite it, causing overvoltages that fail capacitors, arresters, instrument transformers and fuses.',
    cite: { page: 267, section: '5.6.2.3' },
    tags: ['capacitor', 'resonance', 'harmonics'],
  },
  {
    id: 'cap-tuning',
    text: 'A series reactor can tune a bank to an offending harmonic, forming a single-tuned filter that absorbs that harmonic and avoids parallel resonance (see IEEE 519).',
    cite: { page: 267, section: '5.6.2.4' },
    tags: ['capacitor', 'harmonics', 'reactor'],
  },
];

export const ENERGIZATION_TRANSIENTS: Sourced<{
  /** Overvoltage on energization can reach this multiple of system voltage. */
  maxOvervoltagePu: number;
  /** Inrush current range, multiples of normal steady-state current. */
  inrushTimesNormal: readonly [number, number];
  /** A single restrike produces a transient of this multiple of system voltage. */
  restrikeOvervoltagePu: number;
}> = {
  value: { maxOvervoltagePu: 2, inrushTimesNormal: [5, 15], restrikeOvervoltagePu: 3 },
  cite: { page: [263, 265], section: '5.6.2.2.1, 5.6.2.2.3', originalSource: 'ANSI/IEEE Std. C37.012 (calculation guidance)' },
};

/**
 * Eq. 5-4: inductance per phase (µH) of a current-limiting reactor in each phase of each of n equal parallel banks
 * to hold back-to-back inrush to `maxInrushKA`. `mvarPerPhase` is each bank's megavars per phase at 60 Hz.
 */
export function inrushReactorMicroHenry(mvarPerPhase: number, nBanks: number, maxInrushKA: number, frequencyHz = 60): number {
  return (mvarPerPhase * 1e6 * (nBanks - 1)) / (maxInrushKA * maxInrushKA * Math.PI * frequencyHz * nBanks);
}

/** Example 5-1: back-to-back switching of two 13,500 kvar, 14,400 V banks with 15 kV vacuum switches rated 20,000 A momentary peak. */
export const INRUSH_REACTOR_EXAMPLE = {
  cite: { page: 266, section: '5.6.2.2.4', equation: '5-4' } satisfies Citation,
  inputs: {
    bankKvar3Phase: 13500,
    systemV: 14400,
    frequencyHz: 60,
    nBanks: 2,
    /** Switch momentary peak rating used as the allowable inrush, kA. */
    maxInrushKA: 20,
    /** 13.5 / 3 = 4.5 MVAR per phase (printed garbled as "13 − 5/3 ≥ 4.5"). */
    mvarPerPhase: 4.5,
    pi: 3.1416,
  },
  results: {
    inductanceMicroHenry: 29.8,
    /** "would probably specify a 30 µH, 600-ampere reactor" */
    specifiedReactorMicroHenry: 30,
    specifiedReactorAmps: 600,
    /** Minimum continuous reactor rating for ungrounded banks: 1.25 × 13,500 / (14.4 × √3) = 676 A. */
    ungroundedMultiplier: 1.25,
    minContinuousReactorA: 676,
  },
  note:
    'UNCERTAIN: the example first suggests a 600 A reactor, then computes a 676 A minimum continuous rating for ungrounded banks; the 600 A figure may refer to the switch rating. Both are kept as printed.',
};

// ---------------------------------------------------------------------------
// Types and configurations
// ---------------------------------------------------------------------------

export type CapacitorBankType = 'open-rack' | 'metal-enclosed';

export interface CapacitorBankTypeInfo {
  id: CapacitorBankType;
  summary: string;
  /** Voltage range the bulletin associates with the type. */
  voltageRange: string;
  facts: readonly string[];
  cite: Citation;
}

export const CAPACITOR_BANK_TYPES: readonly CapacitorBankTypeInfo[] = [
  {
    id: 'open-rack',
    summary: 'Capacitor units in aluminum or galvanized-steel racks, with switching, instrument transformers and surge protection on separate structures.',
    voltageRange: 'Large blocks of kvar on distribution and transmission systems up to 765 kV',
    facts: [
      'Largest standard upright rack usually holds 40 units; largest edge-mount rack usually 32.',
      'Many exposed live parts: must be fenced; key interlocks can prevent entry until the bank is grounded.',
      'Susceptible to rodent faults, and clearances for live parts and expulsion fuses make the footprint large.',
      'Units usually have one bushing when the insulated rack is part of the circuit; delta-connected racks need two-bushing units.',
      'Units are protected by external fuses.',
    ],
    cite: { page: [267, 268], section: '5.6.3, 5.6.3.1' },
  },
  {
    id: 'metal-enclosed',
    summary: 'All bank components inside a grounded enclosure, so no fence is needed and rodent problems are reduced; better looking and can be shipped pre-assembled.',
    voltageRange: 'Medium blocks of kvar on distribution systems up to 34.5 kV',
    facts: [
      'Typically includes internally fused units, current-limiting reactors, vacuum switches, grounding switches, main fuses, disconnects, arresters, instrument transformers, controls and a cable entrance section.',
      'Enclosure doors are key-interlocked against entry into live compartments.',
      'Internally fused units are compact and more reliable than externally fused units.',
      'Externally fused units use non-expulsion, capacitor-rated current-limiting fuses; expulsion fuses are not used.',
    ],
    cite: { page: [267, 287], section: '5.6.3, 5.6.3.2, 5.6.9.2', note: 'Fuse statement from §5.6.9.2 (p. 287).' },
  },
];

export type BankConnection = 'grounded-wye' | 'ungrounded-wye' | 'delta' | 'double-wye';

export interface BankConfigurationInfo {
  id: BankConnection;
  name: string;
  facts: readonly string[];
  cite: Citation;
}

export const BANK_CONFIGURATIONS: readonly BankConfigurationInfo[] = [
  {
    id: 'grounded-wye',
    name: 'Grounded wye',
    facts: [
      'With one series section per phase, a failed unit\'s fuse sees the full available system fault current, so high-interrupting current-limiting fuses are needed where fault current is about 4 kA or more.',
      'Very small banks are possible without overvoltage on the remaining units when one fails, which simplifies protection; open racks need not be insulated from ground.',
      'Protected by neutral-current unbalance relaying (Fig. 5-15).',
    ],
    cite: { page: [268, 283], section: '5.6.4, 5.6.7.1.3.1, 5.6.7.2.1', figure: '5-15' },
  },
  {
    id: 'ungrounded-wye',
    name: 'Ungrounded (floating) wye',
    facts: [
      'With one series section per phase, the unfaulted phases limit fault current: a failed unit\'s fuse sees at most three times normal phase current, so cheaper low-interrupting fuses can be used.',
      'A small risk of simultaneous failures in two phases is accepted.',
      'The floating neutral needs full line-to-ground insulation and ground clearance.',
      'Protected by a neutral-voltage-shift relay using a VT (usually 15 kV) in the neutral (Fig. 5-16).',
    ],
    cite: { page: [269, 284], section: '5.6.4, 5.6.7.1.3.2, 5.6.7.2.2', figure: '5-16' },
  },
  {
    id: 'delta',
    name: 'Delta',
    facts: [
      'Generally used only at 23 kV or below, where system voltage equals the unit voltage rating.',
      'Must be insulated from ground; with one series group per phase, unit fuses must interrupt phase-to-phase fault current (usually current-limiting fuses).',
      'Delta racks require two-bushing units.',
    ],
    cite: { page: [268, 269], section: '5.6.3.1, 5.6.4' },
  },
  {
    id: 'double-wye',
    name: 'Double wye (wye-wye)',
    facts: [
      'Used for large kvar with low-interrupting expulsion fuses; with multiple series groups the fault current is limited so current-limiting unit fuses are not usually needed unless the parallel kvar exceeds 4,650 kvar.',
      'With only single series groups the fault current is not limited, so unit fuses must interrupt the available fault current.',
      'Protected by a CT between the two ungrounded neutrals; sensitive, but buswork is harder to design and discharge current into a failed unit may exceed its fuse rating (Figs. 5-14, 5-17).',
    ],
    cite: { page: [269, 284], section: '5.6.4, 5.6.7.2.3', figure: '5-14, 5-17' },
  },
];

export const BANK_DESIGN_RULES: Sourced<{
  /** Maximum operating voltage on any unit, percent of its rated voltage. */
  maxUnitVoltagePct: number;
  /** Above this fault current, single-series-section grounded-wye/delta banks need current-limiting unit fuses, kA. */
  currentLimitingFuseThresholdKA: number;
  /** Series groups limit fault current enough for non-current-limiting fuses when parallel kvar per group does not exceed this. */
  maxParallelKvarPerGroup: number;
  /** Multiple series sections are not practical below this voltage, kV (and not in housed equipment). */
  minKVForMultipleSeriesSections: number;
}> = {
  value: { maxUnitVoltagePct: 110, currentLimitingFuseThresholdKA: 4, maxParallelKvarPerGroup: 4650, minKVForMultipleSeriesSections: 15 },
  cite: {
    page: [268, 283],
    section: '5.6.4, 5.6.7.1.3',
    originalSource: 'ANSI/IEEE Std. C37.99',
    note: 'Choose the number of parallel units per series group so losing any one unit does not push the others above 110 %. Use the fewest series groups (highest unit voltage) for economy and unbalance sensitivity.',
  },
};

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------

/** Table 5-35: capacitor unit voltage and BIL ratings. */
export const TABLE_5_35_CAPACITOR_BIL: Sourced<readonly { unitVoltageV: string; bilKV: readonly number[]; singleBushingOnly?: boolean }[]> = {
  value: [
    { unitVoltageV: '2,400-4,800', bilKV: [75] },
    { unitVoltageV: '6,640-12,470', bilKV: [95] },
    { unitVoltageV: '13,280-14,400', bilKV: [95, 125] },
    { unitVoltageV: '15,125-19,920', bilKV: [125] },
    { unitVoltageV: '19,920', bilKV: [125, 150], singleBushingOnly: true },
    { unitVoltageV: '19,920-24,940', bilKV: [150, 200], singleBushingOnly: true },
  ],
  cite: { page: [270, 271], section: '5.6.5.3', table: '5-35', originalSource: 'IEEE Std. 1036-1992, based on Table 3' },
};

export const CAPACITOR_UNIT_RATINGS: Sourced<{
  unitVoltageRangeKV: readonly [number, number];
  /** Most cooperatives use capacitor equipment at or above this voltage, kV. */
  typicalMinKV: number;
  standardUnitKvar: readonly number[];
  bilRangeKV: readonly [number, number];
  /** Max ambient for outdoor, unrestricted ventilation (average of hourly readings on the hottest day), °C. */
  maxAmbientOutdoorC: number;
  maxAmbientIsolatedC: number;
  maxAmbientMultipleRowsTiersC: number;
  maxAmbientEnclosedC: number;
  minContinuousOperationC: number;
}> = {
  value: {
    unitVoltageRangeKV: [2.4, 25],
    typicalMinKV: 7.2,
    standardUnitKvar: [50, 100, 150, 200, 300, 400],
    bilRangeKV: [75, 200],
    maxAmbientOutdoorC: 40,
    maxAmbientIsolatedC: 46,
    maxAmbientMultipleRowsTiersC: 40,
    maxAmbientEnclosedC: 40,
    minContinuousOperationC: -40,
  },
  cite: {
    page: [269, 271],
    section: '5.6.5',
    note: 'No upper size limit is defined for internally fused units. Units of the same or different voltages can be connected in series to reach circuit voltage. Consult the manufacturer below -40 °C.',
  },
};

// ---------------------------------------------------------------------------
// Switching devices and controls
// ---------------------------------------------------------------------------

/** Table 5-36: devices that may be used for capacitor switching. */
export const TABLE_5_36_SWITCHING_DEVICES: Sourced<{ circuitBreakers: readonly string[]; interrupterSwitches: readonly string[] }> = {
  value: {
    circuitBreakers: ['Air', 'Air-magnetic', 'Oil', 'SF6', 'Vacuum'],
    interrupterSwitches: ['Oil', 'SF6', 'Vacuum'],
  },
  cite: { page: 271, section: '5.6.6.1', table: '5-36' },
};

export const SWITCHING_DEVICE_SIZING: Sourced<{
  /** Switching-device voltage rating at least this percent of rated capacitor voltage. */
  minVoltageRatingPctOfCapacitor: number;
  overvoltageFactor: number;
  capacitanceToleranceFactor: readonly [number, number];
  harmonicFactorUngrounded: number;
  harmonicFactorGrounded: number;
  /** Total continuous-current multiplier usually considered adequate. */
  totalMultiplierUngrounded: number;
  totalMultiplierGrounded: number;
}> = {
  value: {
    minVoltageRatingPctOfCapacitor: 110,
    overvoltageFactor: 1.1,
    capacitanceToleranceFactor: [1.05, 1.15],
    harmonicFactorUngrounded: 1.05,
    harmonicFactorGrounded: 1.1,
    totalMultiplierUngrounded: 1.25,
    totalMultiplierGrounded: 1.35,
  },
  cite: {
    page: 271,
    section: '5.6.6.1',
    originalSource: 'ANSI/IEEE Std. C37.99',
    note: 'Most switching devices are derated for capacitor switching; rated capacitance switching current is usually well below the continuous rating.',
  },
};

/** Minimum continuous current rating (A) for a capacitor switch or reactor: multiplier × kvar / (kV × √3) (Example 5-1 form). */
export function capacitorSwitchMinContinuousA(bankKvar3Phase: number, systemKVLL: number, grounded: boolean): number {
  const m = grounded ? SWITCHING_DEVICE_SIZING.value.totalMultiplierGrounded : SWITCHING_DEVICE_SIZING.value.totalMultiplierUngrounded;
  return (m * bankKvar3Phase) / (systemKVLL * Math.sqrt(3));
}

export type CapacitorControlType = 'manual' | 'time' | 'temperature' | 'voltage' | 'current' | 'kilovar';

export interface CapacitorControlInfo {
  id: CapacitorControlType;
  advantages: readonly string[];
  disadvantages: readonly string[];
  notes: readonly string[];
  cite: Citation;
}

/** Table 5-37 (paraphrased) and §5.6.6.2.1-5.6.6.2.6. */
export const CAPACITOR_CONTROLS: readonly CapacitorControlInfo[] = [
  {
    id: 'manual',
    advantages: ['No control device needed; personnel operate the switching device'],
    disadvantages: ['Needs attendants at the substation'],
    notes: ['Can be operated in the yard or remotely from a panel.'],
    cite: { page: 277, section: '5.6.6.2.1', table: '5-37' },
  },
  {
    id: 'time',
    advantages: ['No electrical input, so usable anywhere on the circuit', 'Among the most economical automatic controls'],
    disadvantages: [
      'Only where power factor and demand repeat on a regular daily/weekly pattern',
      'Can cause high voltage on holidays or other unusually light-load periods',
      'Ignores abnormal voltage',
    ],
    notes: ['Needs a carry-over device for outages (modern units: microprocessor, 24 h / 7 day programs, lithium battery backup); may skip weekends.'],
    cite: { page: [277, 278], section: '5.6.6.2.2', table: '5-37' },
  },
  {
    id: 'temperature',
    advantages: ['No electrical input; switches capacitors on when ambient temperature passes a set point'],
    disadvantages: ['Only where load clearly tracks temperature, such as air-conditioning load'],
    notes: ['Requires knowing the kvar-vs-temperature relationship to set it.'],
    cite: { page: [277, 278], section: '5.6.6.2.3', table: '5-37' },
  },
  {
    id: 'voltage',
    advantages: ['Adds or removes capacitors when voltage leaves the allowed band', 'Simplest control that responds to electrical conditions'],
    disadvantages: [
      'Only where voltage drops noticeably with load',
      'Harder to coordinate with regulators and other switched banks',
      'Needs a separate potential transformer',
    ],
    notes: [
      'Bandwidth must exceed the voltage change caused by switching the bank, or it will "hunt".',
      'Responds to a nominal 120 V signal ranging 108-132 V.',
      'With a vacuum switch, protect the monitoring VT primary with a distribution-class arrester.',
    ],
    cite: { page: [277, 278], section: '5.6.6.2.4', table: '5-37' },
  },
  {
    id: 'current',
    advantages: ['Usable wherever load current can be measured; non-directional', 'Suits circuits dominated by known motor loads (pumping, irrigation)'],
    disadvantages: ['Needs a current transformer', 'Adjustment slightly more complex'],
    notes: [
      'Responds to 0.5-5 A from a 5 A CT secondary.',
      'Should automatically short the CT secondary when the control circuit is opened.',
    ],
    cite: { page: [277, 279], section: '5.6.6.2.5', table: '5-37' },
  },
  {
    id: 'kilovar',
    advantages: ['Best at minimizing losses because it senses kvar directly', 'Suits regulated voltage with unpredictable power factor'],
    disadvantages: ['Most expensive', 'Directional - reversed feed reverses the signal', 'Ignores abnormal voltage', 'Needs both a CT and a PT'],
    notes: [
      'Turn-off setting must exceed turn-on setting plus the bank size (e.g. more than +2100 kvar for a 2100 kvar bank) to prevent hunting.',
      'Usually a 120 V VT across two phases and a 5 A CT in the third, giving a 90° angle at unity power factor.',
    ],
    cite: { page: [277, 279], section: '5.6.6.2.6', table: '5-37' },
  },
];

/** §5.6.6.2.6 hunting rule illustrated with a 2100 kvar bank. */
export const VAR_CONTROL_HUNTING_EXAMPLE = {
  cite: { page: 279, section: '5.6.6.2.6' } satisfies Citation,
  bankKvar: 2100,
  rule: 'turnOffSettingKvar > turnOnSettingKvar + bankKvar',
};

export const CONTROL_GUIDANCE: readonly Guidance[] = [
  {
    id: 'cap-control-objective',
    text: 'The bank\'s purpose (losses, normal or emergency voltage, thermal relief), location, coordination with regulators and other banks, and cost decide the control type; pick the cheapest control that switches on the needed schedule.',
    cite: { page: [272, 277], section: '5.6.6.2' },
    tags: ['capacitor', 'control', 'selection'],
  },
  {
    id: 'cap-control-combos',
    text: 'Common combined functions are time with temperature, voltage with current bias, and voltage with time bias.',
    cite: { page: 279, section: '5.6.6.2.6' },
    tags: ['capacitor', 'control'],
  },
  {
    id: 'cap-multistep',
    text: 'Several banks (e.g. one fixed and two switched by a two-step control) can apply kvar in increments; set them to avoid hunting and choose switches suited to back-to-back duty.',
    cite: { page: 279, section: '5.6.6.2.5' },
    tags: ['capacitor', 'control', 'switching'],
  },
  {
    id: 'cap-control-power',
    text: 'Most controls with lockout relays need nominal 120 V ac; have the manufacturer provide a common junction box for secondary wiring and tell it the control voltages available.',
    cite: { page: 279, section: '5.6.6.3' },
    tags: ['capacitor', 'control', 'auxiliary-power'],
  },
];

// ---------------------------------------------------------------------------
// Protection
// ---------------------------------------------------------------------------

export const PROTECTION_GUIDANCE: readonly Guidance[] = [
  {
    id: 'cap-fuse-purpose',
    text: 'Capacitor unit fuses mainly protect the system from the dielectric failures expected in highly stressed units, rather than protecting the units from overload.',
    cite: { page: 280, section: '5.6.7.1' },
    tags: ['capacitor', 'fuse', 'protection'],
  },
  {
    id: 'cap-internal-external',
    text: 'Externally fused units have a fuse per unit; internally fused units fuse each element and are built with fewer parallel units and more series groups.',
    cite: { page: [280, 281], section: '5.6.7.1', figure: '5-19' },
    tags: ['capacitor', 'fuse'],
  },
  {
    id: 'cap-fuseless',
    text: 'Fuseless banks of polypropylene-film units are simpler and cheaper and have mainly been applied from 69 kV to 230 kV.',
    cite: { page: 280, section: '5.6.7.1' },
    tags: ['capacitor', 'fuse'],
  },
  {
    id: 'cap-fuse-functions',
    text: 'A capacitor fuse must isolate a failed unit with little disturbance, clear before case rupture, show which unit failed (external fuses), and ride through inrush, discharge and normal overloads.',
    cite: { page: [280, 281], section: '5.6.7.1.1' },
    tags: ['capacitor', 'fuse'],
  },
  {
    id: 'cap-group-vs-individual',
    text: 'Group fusing is uncommon in substations except for small ungrounded-wye banks; individual fusing lets a bank keep running after a unit fails and makes kvar reduction as simple as pulling fuses.',
    cite: { page: [281, 282], section: '5.6.7.1.2' },
    tags: ['capacitor', 'fuse'],
  },
  {
    id: 'cap-protective-control',
    text: 'Unbalance protection must take the bank off before any unit sees more than 110 % of rated voltage; use a lockout with manual reset unless the switching device is a breaker with built-in lockout.',
    cite: { page: 283, section: '5.6.7.2' },
    tags: ['capacitor', 'protection', 'design-check'],
  },
  {
    id: 'cap-neutral-relay-harmonics',
    text: 'Grounded-neutral relays must block third harmonics, and the neutral CT is sized for them (about 10 % of phase current if unknown); three phase CTs paralleled for zero sequence can restore sensitivity.',
    cite: { page: 283, section: '5.6.7.2.1' },
    tags: ['capacitor', 'protection', 'harmonics'],
  },
  {
    id: 'cap-ct-vt-protection',
    text: 'Protect CT secondaries in capacitor banks with high-current varistors or spark gaps (wound-primary CTs also need a primary gap or arrester); protect VT primaries with arresters and secondaries with varistors or gaps.',
    cite: { page: 284, section: '5.6.7.3' },
    tags: ['capacitor', 'instrument-transformer', 'protection'],
  },
  {
    id: 'cap-wildlife',
    text: 'Open-rack banks can fault when animals bridge live parts; edge-mount racks have generous clearances, and heat-shrink bus insulation can protect upright racks.',
    cite: { page: 284, section: '5.6.7.4' },
    tags: ['capacitor', 'animals', 'reliability'],
  },
  {
    id: 'cap-lightning',
    text: 'Banks are normally protected by the station arresters, but add arresters at the bank where lightning is heavy or the bank switches often, and coordinate insulation levels.',
    cite: { page: 285, section: '5.6.7.5' },
    tags: ['capacitor', 'arrester'],
  },
  {
    id: 'cap-corona',
    text: 'Above 100 kV, ask the manufacturer whether corona shields are needed.',
    cite: { page: 285, section: '5.6.7.6' },
    tags: ['capacitor', 'corona'],
  },
];

// ---------------------------------------------------------------------------
// §5.6.8 Grounding and short-circuiting; §5.6.9 mounting
// ---------------------------------------------------------------------------

export const DISCHARGE_AND_GROUNDING: Sourced<{
  /** Residual voltage after disconnection is reduced to at most this value... */
  residualVoltageMaxV: number;
  /** ...within this time, by internal discharge resistors (NEMA CP-1). */
  dischargeTimeMin: number;
  /** Key-interlock scheme in the typical specification: no entry until de-energized at least this long and grounding/shorting switches closed. */
  interlockMinDeenergizedMin: number;
}> = {
  value: { residualVoltageMaxV: 50, dischargeTimeMin: 5, interlockMinDeenergizedMin: 5 },
  cite: { page: [285, 289], section: '5.6.8, 5.6.12.2', originalSource: 'NEMA Std. CP-1' },
};

export const GROUNDING_SAFETY_GUIDANCE: readonly Guidance[] = [
  {
    id: 'cap-short-and-ground',
    text: 'Provide manually operated switches to short-circuit and ground each series section after the bank is disconnected and before anyone handles it.',
    cite: { page: 285, section: '5.6.8' },
    tags: ['capacitor', 'grounding-switch', 'safety', 'design-check'],
  },
  {
    id: 'cap-ground-switch-types',
    text: 'Hook-stick switches suit open-rack banks and gang-operated switches suit enclosed banks; interlocks can prevent closing them on live circuits and block access until the bank is shorted and grounded.',
    cite: { page: 285, section: '5.6.8' },
    tags: ['capacitor', 'grounding-switch', 'interlock', 'safety'],
  },
];

export const MOUNTING_FACTS: Sourced<{
  /** Upright mounting generally preferred for units up to this voltage, kV; edge mount above. */
  uprightMaxKV: number;
  flangeSpacingCm: number;
  flangeSpacingIn: number;
  /** Air clearance beyond strike distance from expulsion-fuse ends to grounded metal, ft. */
  expulsionFuseExtraClearanceFt: number;
  /** Design withstand (applied non-simultaneously). */
  designWindKmh: number;
  designWindMph: number;
  designIceCm: number;
  designIceIn: number;
  maxTiers: number;
  maxRowsPerTier: number;
  /** Typical substructure height to give ground clearance, m / ft. */
  substructureHeightM: number;
  substructureHeightFt: number;
}> = {
  value: {
    uprightMaxKV: 10,
    flangeSpacingCm: 39.7,
    flangeSpacingIn: 15.625,
    expulsionFuseExtraClearanceFt: 3,
    designWindKmh: 129,
    designWindMph: 80,
    designIceCm: 1.27,
    designIceIn: 0.5,
    maxTiers: 3,
    maxRowsPerTier: 2,
    substructureHeightM: 2.44,
    substructureHeightFt: 8,
  },
  cite: {
    page: [285, 287],
    section: '5.6.9.1',
    figure: '5-20, 5-21',
    note:
      'Equipment is also designed for "minor earthquake conditions"; tell the manufacturer if conditions are more severe. The 3 ft extra clearance is not needed with non-expulsion fuses. ' +
      'Check the 8 ft substructure height against safety codes. Flange spacing printed as 39.7 cm (15-5/8 in).',
  },
};
