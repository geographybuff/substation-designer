/**
 * Inspection, testing, maintenance and uprating data from RUS Bulletin 1724E-300:
 * Chapter 18 "Inspection" (pp. 717-731, Table 18-1), Chapter 19 "Tests" (pp. 733-745, Tables 19-1..19-4),
 * Chapter 20 "Maintenance" (pp. 747-754, Table 20-1) and Chapter 21 "Uprating and Expanding Existing
 * Substations" (pp. 755-764).
 *
 * Intervals are in calendar months, as the tables state. Table 20-1 and Table 19-2 are the main inputs for the
 * game's maintenance simulation; neither lists reclosers (see §18.4.7 and §19.3.13 notes below).
 */
import type { Citation, Guidance } from './types';

export const MAINTENANCE_CITES = {
  inspection: { page: [717, 731], section: '18' },
  periodicInspection: { page: 718, section: '18.3' },
  visual: { page: [719, 723], section: '18.3.1' },
  diagnostic: { page: [723, 726], section: '18.3.2', table: '18-1' },
  detailed: { page: [726, 728], section: '18.3.3' },
  internal: { page: [728, 729], section: '18.3.4' },
  nonPeriodic: { page: [729, 730], section: '18.4' },
  tests: { page: [733, 745], section: '19', table: '19-1 to 19-4' },
  maintenance: { page: [747, 750], section: '20.1-20.3', table: '20-1' },
  rcm: { page: [751, 754], section: '20.4' },
  uprating: { page: [755, 764], section: '21' },
} as const satisfies Record<string, Citation>;

// ---------------------------------------------------------------------------
// Inspection (Chapter 18)
// ---------------------------------------------------------------------------

/** §18.3 (p. 718): recommended inspection frequencies (may be varied under a reliability-centered program). */
export const INSPECTION_FREQUENCIES = {
  visualWholeSubstation: { months: 1, label: 'monthly' },
  diagnosticOnline: { months: 12, label: 'annually' },
  detailedMajorEquipment: { months: 12, label: 'annually (de-energized)' },
  internalTransformersRegulators: { months: null, label: 'as required; open-type transformers and regulators not internally inspected for at least 3 years should be, if time permits' },
  cite: {
    page: [718, 730],
    section: '18.3; 18.3.4; 18.4.4',
    note: 'UNCERTAIN: §18.3.3 (p. 726) refers to "bi-monthly inspections suggested in Section 18.3", and Table 19-2 lists visual inspection every 2 months, while §18.3 itself says monthly visual inspection.',
  } satisfies Citation,
} as const;

export const INSPECTION_GUIDANCE: readonly Guidance[] = [
  { id: 'in-tailor', text: 'Inspection guidelines are general and must be tailored to each site and its equipment, following manufacturers\' instruction books, NETA specifications and applicable codes (NEC, ANSI, IEEE, NFPA, NEMA, OSHA).', cite: { page: 717, section: '18.1' }, tags: ['maintenance', 'inspection'] },
  { id: 'in-records', text: 'Keep records per substation: equipment nameplate data with tap connections and trip settings, inspection records, and a site-specific inspection checklist.', cite: { page: 717, section: '18.2.1' }, tags: ['maintenance', 'records'] },
  { id: 'in-safety', text: 'Inspectors must know the station\'s operating procedures, the NESC and OSHA rules, protective and interlocking schemes, equipment capabilities, safety and grounding equipment and first aid, and keep minimum approach distances (NESC Sections 43-44; OSHA 1910.333).', cite: { page: [717, 718], section: '18.2.2', originalSource: 'ANSI C2; OSHA 29 CFR 1910 and 1926' }, tags: ['maintenance', 'safety'] },
  { id: 'in-visual-ground', text: 'Make energized visual inspections from ground level (binoculars for elevated equipment) and never remove ground connections while energized, since a dangerous voltage can appear across the gap.', cite: { page: 719, section: '18.3.1' }, tags: ['maintenance', 'inspection', 'safety', 'grounding'] },
  { id: 'in-oil-temp', text: 'Transformer oil temperature should not exceed nameplate maximum winding temperature rise + ambient (≤ 40 °C) + 10 °C; it is generally below 95 °C (55 °C-rise units) or 105 °C (65 °C-rise units).', cite: { page: 719, section: '18.3.1.1' }, tags: ['maintenance', 'transformer'] },
  { id: 'in-breaker-exercise', text: 'If a breaker has not operated in the preceding year, bypass it and trip it by simulating relay action to check its sequence.', cite: { page: 720, section: '18.3.1.3' }, tags: ['maintenance', 'breaker'] },
  { id: 'in-arrester', text: 'Check arresters for damaged porcelain, loose connections, corrosion and signs of pressure relief, and record discharge counter readings.', cite: { page: 720, section: '18.3.1.5' }, tags: ['maintenance', 'arrester'] },
  { id: 'in-battery', text: 'Check station battery connections, electrolyte level and specific gravity (record temperature), the charger output, and ground detector lamps for dc grounds.', cite: { page: 721, section: '18.3.1.10' }, tags: ['maintenance', 'battery'] },
  { id: 'in-fence', text: 'Keep the gap under the fence under about 2 in and under the gate under about 4 in; check fabric, barbed wire tension, latches and braid connections, and that no wire fences are tied to the substation fence.', cite: { page: 723, section: '18.3.1.16' }, tags: ['maintenance', 'fence', 'design-check'] },
  { id: 'in-yard', text: 'Check signs, lighting, spare parts and fuses, hot sticks, fire protection and oil drainage provisions, bird nests near energized parts, yard low spots, weeds, trash and unauthorized storage.', cite: { page: [722, 723], section: '18.3.1.15' }, tags: ['maintenance', 'yard'] },
  { id: 'in-deenergized', text: 'Whenever any part of the station is de-energized, inspect at close range what cannot be seen when energized: porcelain, switch contacts, bus fittings, tap changers nearing their operation count, breakers not inspected in 12 months, and ground connections.', cite: { page: [729, 730], section: '18.4' }, tags: ['maintenance', 'inspection'] },
  { id: 'in-ground-test', text: 'Measure overall ground grid resistance if not done for some years; this needs shield wires and neutrals disconnected, so the whole station must be de-energized.', cite: { page: 730, section: '18.4.9' }, tags: ['maintenance', 'grounding', 'test'] },
  { id: 'in-reclosers', text: 'Oil circuit reclosers are inspected per 7 CFR 1730 and RUS Bulletin 1730-1.', cite: { page: 730, section: '18.4.7', originalSource: '7 CFR 1730; RUS Bulletin 1730-1' }, tags: ['maintenance', 'recloser'] },
];

/** §18.3.1 (pp. 719-723): visual inspection checklist categories, paraphrased (one line each). */
export const VISUAL_INSPECTION_ITEMS: readonly { equipment: string; checks: string; cite: Citation }[] = [
  { equipment: 'Power transformers', checks: 'Control cabinet and mechanism; bushings, terminals and oil leaks; oil levels (tank, tap changer, bushings); inert gas pressure; LTC counter; oil temperature.', cite: { page: 719, section: '18.3.1.1' } },
  { equipment: 'Voltage regulators', checks: 'As transformers; run briefly in manual, confirm automatic return; record counter.', cite: { page: 719, section: '18.3.1.2' } },
  { equipment: 'Circuit breakers (oil, vacuum, SF6, air blast)', checks: 'Bushings, terminals, leaks and gas pressure; oil levels; heaters; operation counter; plug-in contacts; compressor hours.', cite: { page: [719, 720], section: '18.3.1.3' } },
  { equipment: 'Fuses', checks: 'Clip contact surfaces; cracked or contaminated insulators.', cite: { page: 720, section: '18.3.1.4' } },
  { equipment: 'Surge arresters', checks: 'Porcelain, connections, corrosion; signs of pressure relief; discharge counters.', cite: { page: 720, section: '18.3.1.5' } },
  { equipment: 'Buses and shield wire', checks: 'Bus supports, bolts and clamps; flexible bus and shield wire condition; suspension insulators including line entrances.', cite: { page: 720, section: '18.3.1.6' } },
  { equipment: 'Capacitors', checks: 'Fuses; damaged tanks or bushings; dielectric leaks.', cite: { page: 720, section: '18.3.1.7' } },
  { equipment: 'Reactors', checks: 'Paint and varnish; bushings; valve and gasket leaks.', cite: { page: 720, section: '18.3.1.8' } },
  { equipment: 'Disconnects and switches', checks: 'Porcelain, connections, corrosion; contacts and arcing horns; mechanism; corona-causing damage; grounding braids; gearbox moisture; corona rings.', cite: { page: 721, section: '18.3.1.9' } },
  { equipment: 'Control and metering', checks: 'CT/VT cases and connections; switch contacts, lamps, test blocks, condensation; meters registering; test-block meter checks; relay targets and cases; battery and charger; annunciator lights.', cite: { page: 721, section: '18.3.1.10' } },
  { equipment: 'Structures', checks: 'Loose or missing bolts; paint/galvanizing damage and corrosion; buckling and cracks.', cite: { page: 722, section: '18.3.1.11' } },
  { equipment: 'Grounding system', checks: 'All above-grade ground connections at equipment, structures and fences; flexible braids.', cite: { page: 722, section: '18.3.1.12' } },
  { equipment: 'Cable', checks: 'Physical damage; insulation/jacket deterioration; movement; loose connections; shield grounding, supports, terminations.', cite: { page: 722, section: '18.3.1.13' } },
  { equipment: 'Foundations', checks: 'Settlement, cracks, spalling, honeycombing, exposed rebar, anchor bolt corrosion.', cite: { page: 722, section: '18.3.1.14' } },
  { equipment: 'Substation area', checks: 'Warning signs, lighting, spares, hot sticks, fire protection and oil drainage, bird nests, yard condition, auxiliary breaker positions, weeds and storage.', cite: { page: [722, 723], section: '18.3.1.15' } },
  { equipment: 'Substation fence', checks: 'Gap under fence < 2 in and under gate < 4 in; fabric intact, no rust; barbed wire taut; latches work; braids intact; no wire fences tied on.', cite: { page: 723, section: '18.3.1.16' } },
];

export type InspectionTechnology = 'infrared' | 'labOil' | 'ultrasonicFlow' | 'vibration' | 'ultrasound' | 'recordingTemp' | 'onSiteOil' | 'visual';

/** Table 18-1 (p. 724): substation inspection technology matrix. */
export const TABLE_18_1_INSPECTION_MATRIX: readonly { component: string; technologies: readonly InspectionTechnology[] }[] = [
  { component: 'Generator step-up transformer', technologies: ['infrared', 'labOil', 'ultrasonicFlow', 'vibration', 'ultrasound', 'recordingTemp', 'onSiteOil', 'visual'] },
  { component: 'Transmission transformer', technologies: ['infrared', 'labOil', 'ultrasonicFlow', 'vibration', 'ultrasound', 'recordingTemp', 'onSiteOil', 'visual'] },
  { component: 'Step-down distribution transformer', technologies: ['infrared', 'labOil', 'ultrasonicFlow', 'vibration', 'ultrasound', 'recordingTemp', 'onSiteOil', 'visual'] },
  { component: 'Current transformer', technologies: ['infrared', 'ultrasound', 'visual'] },
  { component: 'Potential transformer', technologies: ['infrared', 'ultrasound', 'visual'] },
  { component: 'Transformer blower motors', technologies: ['infrared', 'labOil', 'vibration', 'ultrasound', 'visual'] },
  { component: 'Transformer oil pumps', technologies: ['infrared', 'ultrasonicFlow', 'vibration', 'ultrasound', 'visual'] },
  { component: 'Transformer coolers', technologies: ['infrared', 'visual'] },
  { component: 'Transformer tap changers', technologies: ['infrared', 'labOil', 'recordingTemp'] },
  { component: 'Transformer control cabinets', technologies: ['infrared', 'visual'] },
  { component: 'Oil circuit breakers', technologies: ['infrared', 'labOil', 'ultrasound', 'visual'] },
  { component: 'Air circuit breakers', technologies: ['infrared', 'ultrasound', 'visual'] },
  { component: 'SF6 breakers', technologies: [] },
  { component: 'DC control batteries', technologies: ['visual'] },
  { component: 'Transmission & distribution bus', technologies: ['infrared', 'ultrasound', 'visual'] },
  { component: 'Disconnects', technologies: ['infrared', 'ultrasound', 'visual'] },
  { component: 'Enclosed switchgear', technologies: ['infrared', 'ultrasound', 'visual'] },
  { component: 'Ground networks', technologies: ['infrared', 'visual'] },
  { component: 'Distribution regulators', technologies: ['infrared', 'labOil', 'recordingTemp', 'onSiteOil', 'visual'] },
  { component: 'Light & power transformers', technologies: ['infrared', 'visual'] },
  { component: 'DC control bus', technologies: ['infrared', 'visual'] },
  { component: 'Fuse & fuse clip', technologies: ['infrared', 'visual'] },
  { component: 'Terminal blocks', technologies: ['infrared', 'visual'] },
  { component: 'Enclosed buswork', technologies: ['infrared', 'ultrasound'] },
  { component: 'Cable splices', technologies: ['infrared', 'ultrasound', 'visual'] },
  { component: 'Reactors', technologies: ['infrared', 'ultrasound', 'visual'] },
  { component: 'Compressor motors', technologies: ['infrared', 'vibration', 'ultrasound', 'visual'] },
  { component: 'Nitrogen systems', technologies: ['ultrasound'] },
  { component: 'Motors', technologies: ['infrared', 'vibration', 'ultrasound', 'visual'] },
  { component: 'Lightning arresters', technologies: ['infrared', 'ultrasound', 'visual'] },
  { component: 'Carrier current wave traps', technologies: ['infrared', 'ultrasound', 'visual'] },
  { component: 'Insulators', technologies: ['infrared', 'ultrasound', 'visual'] },
  { component: 'Batteries', technologies: ['infrared', 'visual'] },
];

export const TABLE_18_1_CITE: Citation = { page: 724, section: '18.3.2', table: '18-1', note: 'The SF6 breaker row is printed with no entries.' };

/** §18.3.2.1 (pp. 723-725): infrared thermography survey rules. */
export const INFRARED_THERMOGRAPHY = {
  minLoadPctOfRated: 40,
  detectDeltaC: 1,
  atC: 30,
  severity: [
    { deltaC: [1, 2] as const, action: 'possible deficiency, warrants investigation' },
    { deltaC: [4, 15] as const, action: 'deficiency, repair as time permits' },
    { deltaC: [16, null] as const, action: 'major deficiency, repair immediately' },
  ],
  cite: { page: [723, 725], section: '18.3.2.1', originalSource: 'NFPA 70B, Section 18-16', note: 'UNCERTAIN: the printed bands (1-2, 4-15, 16+ °C) leave differences between 2 and 4 °C unclassified, so infraredSeverity returns null there. Scan during maximum possible loading but not less than 40% of rating.' } satisfies Citation,
} as const;

/** Severity class for an infrared temperature difference (°C) per §18.3.2.1; null below 1 °C or in the printed 2-4 °C gap. */
export function infraredSeverity(deltaC: number): 'investigate' | 'repair-when-possible' | 'repair-immediately' | null {
  if (deltaC >= 16) return 'repair-immediately';
  if (deltaC >= 4) return 'repair-when-possible';
  if (deltaC >= 1 && deltaC <= 2) return 'investigate';
  return null;
}

export const DIAGNOSTIC_GUIDANCE: readonly Guidance[] = [
  { id: 'dg-oil', text: 'Oil-filled transformers and breakers gas at a faster rate when they start to malfunction; laboratory dissolved-gas and oil-quality analysis reveal this (IEEE C57.106).', cite: { page: 725, section: '18.3.2.2' }, tags: ['maintenance', 'transformer', 'oil'] },
  { id: 'dg-ultrasound', text: 'Ultrasound detectors find inaudible corona on buses, internal arcing, partial discharge or loose parts in transformers, and cavitation or wear in cooling pumps and fans.', cite: { page: 725, section: '18.3.2.3' }, tags: ['maintenance'] },
  { id: 'dg-portable-dga', text: 'Portable gas-in-oil analysis can trend dissolved combustible gases in the field; a noticeable increase calls for a laboratory analysis.', cite: { page: 726, section: '18.3.2.4' }, tags: ['maintenance', 'oil'] },
  { id: 'dg-annual', text: 'Annual de-energized inspections are recommended for disconnects and switches, metal-clad switchgear, and air, oil, air-blast/SF6 and vacuum circuit breakers.', cite: { page: [726, 728], section: '18.3.3' }, tags: ['maintenance', 'inspection'] },
  { id: 'dg-untank', text: 'Untank oil breakers only when the instruction book requires, usually after interrupting near-maximum current or a set number of operations, coordinated with the annual inspection.', cite: { page: 728, section: '18.3.3.4' }, tags: ['maintenance', 'breaker'] },
];

// ---------------------------------------------------------------------------
// Tests (Chapter 19)
// ---------------------------------------------------------------------------

export type TestId =
  | 'insulationResistance' | 'powerFactor' | 'dcHighPotential' | 'dielectricAbsorption' | 'acOverPotential' | 'contactResistance'
  | 'windingResistance' | 'calibration' | 'oilNeutralization' | 'oilInterfacialTension' | 'oilDielectricStrength' | 'oilColor'
  | 'oilVisual' | 'oilPowerFactor' | 'oilCombustibleGas' | 'sf6GasAnalysis' | 'timing' | 'motionAnalyzer' | 'seriesOvercurrent'
  | 'turnsRatio' | 'polarity' | 'capacitance' | 'pressureTestPiping' | 'gridResistance' | 'visualInspection' | 'coreToGroundInsulation';

/** Paragraph in §19.3 describing each test (from the tables' last row). */
export const TEST_PARAGRAPHS: Readonly<Record<TestId, string>> = {
  insulationResistance: '19.3.1', powerFactor: '19.3.2', dcHighPotential: '19.3.3', dielectricAbsorption: '19.3.4', acOverPotential: '19.3.5',
  contactResistance: '19.3.6', windingResistance: '19.3.7', calibration: '19.3.17', oilNeutralization: '19.3.8', oilInterfacialTension: '19.3.8',
  oilDielectricStrength: '19.3.8', oilColor: '19.3.8', oilVisual: '19.3.8', oilPowerFactor: '19.3.8', oilCombustibleGas: '19.3.9',
  sf6GasAnalysis: '19.3.10', timing: '19.3.11', motionAnalyzer: '19.3.12', seriesOvercurrent: '19.3.13', turnsRatio: '19.3.14',
  polarity: '19.3.15', capacitance: '19.3.18', pressureTestPiping: '19.3.19', gridResistance: '19.3.20', visualInspection: '—', coreToGroundInsulation: '19.3.1',
};

/** Table 19-1 (p. 735): acceptance test requirements by equipment. */
export const TABLE_19_1_ACCEPTANCE_TESTS: readonly { item: string; tests: readonly TestId[] }[] = [
  { item: 'Transformer, conservator type', tests: ['insulationResistance', 'powerFactor', 'dielectricAbsorption', 'windingResistance', 'oilDielectricStrength', 'oilPowerFactor', 'turnsRatio', 'polarity', 'visualInspection', 'coreToGroundInsulation'] },
  { item: 'Transformer, inert gas cushion type', tests: ['insulationResistance', 'powerFactor', 'dielectricAbsorption', 'windingResistance', 'oilDielectricStrength', 'oilPowerFactor', 'turnsRatio', 'polarity', 'visualInspection', 'coreToGroundInsulation'] },
  { item: 'Load tap changer mechanism', tests: ['powerFactor', 'oilDielectricStrength', 'oilPowerFactor', 'visualInspection'] },
  { item: 'Regulators', tests: ['powerFactor', 'dielectricAbsorption', 'windingResistance', 'oilDielectricStrength', 'oilPowerFactor', 'visualInspection'] },
  { item: 'Oil circuit breakers', tests: ['powerFactor', 'oilDielectricStrength', 'timing', 'visualInspection'] },
  { item: 'Air circuit breakers', tests: ['powerFactor', 'acOverPotential', 'seriesOvercurrent', 'visualInspection'] },
  { item: 'Vacuum circuit breakers', tests: ['powerFactor', 'timing', 'visualInspection'] },
  { item: 'SF6 circuit breakers', tests: ['powerFactor', 'timing', 'pressureTestPiping', 'visualInspection'] },
  { item: 'Air blast circuit breakers', tests: ['powerFactor', 'timing', 'pressureTestPiping', 'visualInspection'] },
  { item: 'PTs', tests: ['insulationResistance', 'powerFactor', 'turnsRatio', 'polarity', 'visualInspection'] },
  { item: 'CTs', tests: ['insulationResistance', 'powerFactor', 'turnsRatio', 'polarity', 'visualInspection'] },
  { item: 'CCPDs', tests: ['powerFactor', 'capacitance', 'visualInspection'] },
  { item: 'Surge arresters', tests: ['powerFactor', 'visualInspection'] },
  { item: 'Cable, 600 V', tests: ['insulationResistance', 'dielectricAbsorption', 'visualInspection'] },
  { item: 'Cable, 5 kV and above', tests: ['insulationResistance', 'powerFactor', 'dcHighPotential', 'dielectricAbsorption', 'visualInspection'] },
  { item: 'Disconnects and air break switches', tests: ['powerFactor', 'visualInspection'] },
  { item: 'Vacuum switches', tests: ['powerFactor', 'dcHighPotential', 'timing', 'visualInspection'] },
  { item: 'Circuit switchers', tests: ['powerFactor', 'timing', 'visualInspection'] },
  { item: 'Capacitors', tests: ['capacitance', 'visualInspection'] },
  { item: 'Metal-clad switchgear', tests: ['insulationResistance', 'powerFactor', 'dcHighPotential', 'dielectricAbsorption', 'acOverPotential', 'visualInspection'] },
  { item: 'Protective relays', tests: ['insulationResistance', 'acOverPotential', 'visualInspection'] },
  { item: 'Metering equipment', tests: ['insulationResistance', 'visualInspection'] },
  { item: 'Substation ground grid', tests: ['gridResistance', 'visualInspection'] },
];

export const TABLE_19_1_CITE: Citation = { page: 735, section: '19.2.1', table: '19-1' };

/** Table 19-2 (p. 736): periodic test requirements, interval in calendar months per test. */
export const TABLE_19_2_PERIODIC_TESTS: readonly { item: string; months: Readonly<Partial<Record<TestId, number>>> }[] = [
  { item: 'Transformer, conservator type', months: { insulationResistance: 12, powerFactor: 12, oilNeutralization: 12, oilInterfacialTension: 12, oilDielectricStrength: 12, oilColor: 12, oilVisual: 6, oilPowerFactor: 12, oilCombustibleGas: 6, turnsRatio: 24, visualInspection: 2, coreToGroundInsulation: 12 } },
  { item: 'Transformer, inert gas cushion type', months: { insulationResistance: 12, powerFactor: 12, oilNeutralization: 12, oilInterfacialTension: 12, oilDielectricStrength: 12, oilColor: 12, oilVisual: 6, oilPowerFactor: 12, oilCombustibleGas: 6, turnsRatio: 24, visualInspection: 2, coreToGroundInsulation: 12 } },
  { item: 'Load tap changer mechanism', months: { powerFactor: 12, oilNeutralization: 12, oilInterfacialTension: 12, oilDielectricStrength: 12, oilColor: 12, oilVisual: 6, oilPowerFactor: 12, visualInspection: 2 } },
  { item: 'Regulators', months: { insulationResistance: 12, powerFactor: 12, oilNeutralization: 12, oilInterfacialTension: 12, oilDielectricStrength: 12, oilColor: 12, oilVisual: 6, oilPowerFactor: 12, visualInspection: 2 } },
  { item: 'Oil circuit breakers', months: { powerFactor: 12, contactResistance: 12, oilNeutralization: 12, oilInterfacialTension: 12, oilDielectricStrength: 12, oilColor: 12, oilVisual: 6, oilPowerFactor: 12, timing: 12, motionAnalyzer: 12, visualInspection: 2 } },
  { item: 'Air circuit breakers', months: { powerFactor: 12, acOverPotential: 24, contactResistance: 12, timing: 12, seriesOvercurrent: 12, visualInspection: 2 } },
  { item: 'Vacuum circuit breakers', months: { powerFactor: 12, contactResistance: 12, timing: 12, visualInspection: 2 } },
  { item: 'SF6 circuit breakers', months: { powerFactor: 12, contactResistance: 12, sf6GasAnalysis: 12, timing: 12, visualInspection: 2 } },
  { item: 'Air blast circuit breakers', months: { powerFactor: 12, contactResistance: 12, timing: 12, visualInspection: 2 } },
  { item: 'PTs', months: { powerFactor: 12, visualInspection: 2 } },
  { item: 'CTs', months: { powerFactor: 12, visualInspection: 2 } },
  { item: 'CCPDs', months: { powerFactor: 12, capacitance: 12, visualInspection: 2 } },
  { item: 'Surge arresters', months: { powerFactor: 12, visualInspection: 2 } },
  { item: 'Cable, 600 V', months: { visualInspection: 2 } },
  { item: 'Cable, 5 kV and above', months: { powerFactor: 12, dcHighPotential: 12, dielectricAbsorption: 12, visualInspection: 2 } },
  { item: 'Disconnects and air break switches', months: { powerFactor: 12, contactResistance: 12, visualInspection: 2 } },
  { item: 'Vacuum switches', months: { powerFactor: 12, dcHighPotential: 12, contactResistance: 12, visualInspection: 2 } },
  { item: 'Circuit switchers', months: { powerFactor: 12, contactResistance: 12, visualInspection: 2 } },
  { item: 'Capacitors', months: { capacitance: 12, visualInspection: 2 } },
  { item: 'Metal-clad switchgear', months: { insulationResistance: 12, powerFactor: 12, dcHighPotential: 12, acOverPotential: 24, visualInspection: 1 } },
  { item: 'Protective relays', months: { acOverPotential: 24, calibration: 12, visualInspection: 1 } },
  { item: 'Metering equipment', months: { calibration: 12, visualInspection: 1 } },
  { item: 'Substation ground grid', months: { visualInspection: 1 } },
];

export const TABLE_19_2_CITE: Citation = {
  page: 736,
  section: '19.2.2',
  table: '19-2',
  note: 'Numbers are calendar months between periodic tests. Tests after failure are the same as Table 19-2 except that high-voltage tests are not usually performed (§19.2.3). Ground grid resistance has no periodic interval in the table; §18.4.9 says to measure it if not done for a number of years.',
};

/** §19.3 (pp. 734-745): numeric criteria quoted for the tests. */
export const TEST_CRITERIA = {
  insulationResistanceMinMegohm: {
    acMotors75C: { v120: 1.12, v208: 1.2, v240: 1.25, v480: 1.5 },
    dcMotors75C: 1.0,
    hvBreakers20C: 10000,
    hvBushings20C: 10000,
    oilFilledTransformer20C: '1.5E / kVA',
    dryTypeTransformer20C: '30E / kVA',
    cite: { page: 737, section: '19.3.1.2', note: 'UNCERTAIN: printed as 1.5E/kVA and 30E/kVA (E = winding voltage rating, kVA = winding rating) with no unit for E; the common industry form of this rule divides by √kVA. Megger: 500/1000/2500 V.' } satisfies Citation,
  },
  powerFactorPctAt20C: {
    rows: [
      { item: 'Bushings, condenser and oil filled', pct: 0.5 },
      { item: 'Bushings, compound filled', pct: 2.5 },
      { item: 'Transformers, oil filled, new', pct: 0.5 },
      { item: 'Transformers, oil filled', pct: [1.0, 2.0] as const },
      { item: 'Cable, PILC', pct: 0.3 },
      { item: 'Cable, varnished cambric insulated', pct: [4.0, 8.0] as const },
      { item: 'Cable, rubber insulated', pct: [4.0, 8.0] as const },
    ],
    cite: { page: [737, 738], section: '19.3.2.2', table: '19-3', note: 'Reference values only; test above 0 °C (ice conducts).' } satisfies Citation,
  },
  dcHipotPctOfFactory: { acceptance: [80, 85] as const, periodic: [60, 65] as const, periodicPilcNeopreneJacket: [55, 60] as const, cite: { page: 739, section: '19.3.3.2' } satisfies Citation },
  dielectricAbsorptionRatios: {
    rows: [
      { condition: 'Dangerous', ratio60to30: null, ratio10to1: '< 1' },
      { condition: 'Poor', ratio60to30: '< 1.1', ratio10to1: '< 1.5' },
      { condition: 'Questionable', ratio60to30: '1.1-1.25', ratio10to1: '1.5-2.0' },
      { condition: 'Fair', ratio60to30: '1.25-1.4', ratio10to1: '2.0-3.0' },
      { condition: 'Good', ratio60to30: '1.4-1.6', ratio10to1: '3.0-4.0' },
      { condition: 'Excellent', ratio60to30: '> 1.6', ratio10to1: '> 4.0' },
    ],
    cite: { page: 740, section: '19.3.4.2', table: '19-4', note: 'Readings every 15 s for 3 min then each minute until three equal readings (2500 V megger).' } satisfies Citation,
  },
  acOverPotential: { acceptance: '2 × operating voltage + 100 V, but not less than 1500 V', periodic: '1.7 × operating voltage', durationMin: 1, appliesTo: '600 V and below devices and wiring', cite: { page: 740, section: '19.3.5' } satisfies Citation },
  contactResistanceMicroOhm: { breakersMediumVoltage: [10, 50] as const, breakersHighVoltage: [50, 350] as const, reclosers: [50, 200] as const, cite: { page: 740, section: '19.3.6.2', note: 'Typical ranges; manufacturer limits govern.' } satisfies Citation },
  oilActionLimits: {
    neutralizationNumberReclaimAbove: [0.35, 0.5] as const,
    interfacialTensionReclaimBelowDynesPerCm: 18,
    dielectricStrengthReconditionBelowKV: 28,
    colorReclaimAbove: 3.5,
    visual: 'Cloudy, dirty or visible water: reclaim.',
    cite: { page: [741, 742], section: '19.3.8.2', originalSource: 'IEEE C57.106; ASTM D974, D971/D2285, D1500, D877/D1816' } satisfies Citation,
  },
  combustibleGasPct: { incipientFault: [0.5, 5.0] as const, removeFromServiceAbove: 5.0, cite: { page: 742, section: '19.3.9', note: 'Gas-cushion combustible gas by volume; repeat at shorter intervals once detected.' } satisfies Citation },
  seriesOvercurrent: { text: 'Periodically test all reclosers and low-voltage breakers with series trip devices at several current levels to verify time-current characteristics and minimum instantaneous trip.', cite: { page: 743, section: '19.3.13' } satisfies Citation },
  groundGridResistance: { text: 'Measure periodically with a three-probe instrument and compare with earlier values or design criteria.', cite: { page: 745, section: '19.3.20' } satisfies Citation },
} as const;

// ---------------------------------------------------------------------------
// Maintenance (Chapter 20)
// ---------------------------------------------------------------------------

export type MaintenanceTaskId =
  | 'cleanPorcelain' | 'cleanLubricateAdjustMech' | 'cleanReplaceAlignContacts' | 'tightenConnections' | 'majorOverhaul'
  | 'cleanBurnishContacts' | 'lubricateAuxMotors' | 'replaceBreatherDehydrator' | 'changeGearboxOil' | 'checkLiquidLevels';

export const MAINTENANCE_TASK_NAMES: Readonly<Record<MaintenanceTaskId, string>> = {
  cleanPorcelain: 'Clean exposed porcelain',
  cleanLubricateAdjustMech: 'Clean, lubricate & adjust mechanism',
  cleanReplaceAlignContacts: 'Clean or replace and align contacts',
  tightenConnections: 'Tighten connections',
  majorOverhaul: 'Major overhaul',
  cleanBurnishContacts: 'Clean & burnish contacts',
  lubricateAuxMotors: 'Lubricate auxiliary motors',
  replaceBreatherDehydrator: 'Replace dehydrator in breather',
  changeGearboxOil: 'Change oil in gear boxes',
  checkLiquidLevels: 'Check liquid levels',
};

/** A Table 20-1 interval: months, or 'operations' where the asterisk marks a number/type-of-operations requirement. */
export type MaintenanceInterval = number | 'operations';

/** Table 20-1 (p. 748): recommendations for periodic maintenance (calendar months). */
export const TABLE_20_1_PERIODIC_MAINTENANCE: readonly { equipment: string; tasks: Readonly<Partial<Record<MaintenanceTaskId, MaintenanceInterval>>> }[] = [
  { equipment: 'Transformers, inert gas cushioned', tasks: { cleanPorcelain: 12, tightenConnections: 12, lubricateAuxMotors: 6 } },
  { equipment: 'Regulators', tasks: { cleanPorcelain: 12, tightenConnections: 12 } },
  { equipment: 'Oil circuit breakers', tasks: { cleanPorcelain: 12, cleanLubricateAdjustMech: 12, tightenConnections: 12, majorOverhaul: 'operations' } },
  { equipment: 'Air circuit breakers', tasks: { cleanPorcelain: 12, cleanLubricateAdjustMech: 12, tightenConnections: 12, majorOverhaul: 'operations' } },
  { equipment: 'Vacuum circuit breakers', tasks: { cleanPorcelain: 12, cleanLubricateAdjustMech: 12, tightenConnections: 12, majorOverhaul: 'operations' } },
  { equipment: 'SF6 circuit breakers', tasks: { cleanPorcelain: 12, cleanLubricateAdjustMech: 12, tightenConnections: 12, majorOverhaul: 'operations' } },
  { equipment: 'Air blast circuit breakers', tasks: { cleanPorcelain: 12, cleanLubricateAdjustMech: 12, tightenConnections: 12, majorOverhaul: 'operations' } },
  { equipment: 'PTs', tasks: { cleanPorcelain: 12, tightenConnections: 12 } },
  { equipment: 'CTs', tasks: { cleanPorcelain: 12, tightenConnections: 12 } },
  { equipment: 'CCPDs', tasks: { cleanPorcelain: 12, tightenConnections: 12 } },
  { equipment: 'Surge arresters', tasks: { cleanPorcelain: 12, tightenConnections: 12 } },
  { equipment: 'Disconnects and air break switches', tasks: { cleanPorcelain: 12, cleanLubricateAdjustMech: 12, cleanReplaceAlignContacts: 12, tightenConnections: 12, lubricateAuxMotors: 6, changeGearboxOil: 24 } },
  { equipment: 'Vacuum switches', tasks: { cleanPorcelain: 12, cleanReplaceAlignContacts: 12, tightenConnections: 12 } },
  { equipment: 'Circuit switches', tasks: { cleanPorcelain: 12, cleanReplaceAlignContacts: 12, tightenConnections: 12 } },
  { equipment: 'Capacitors', tasks: { cleanPorcelain: 12, tightenConnections: 12 } },
  { equipment: 'Metal-clad switchgear', tasks: { cleanLubricateAdjustMech: 12, tightenConnections: 12 } },
  { equipment: 'Relays', tasks: { tightenConnections: 12, cleanBurnishContacts: 12 } },
  { equipment: 'Transformer tap changer mechanism', tasks: { majorOverhaul: 'operations' } },
  { equipment: 'Transformer, conservator type', tasks: { cleanPorcelain: 12, tightenConnections: 12, replaceBreatherDehydrator: 6 } },
  { equipment: 'Station battery', tasks: { checkLiquidLevels: 2 } },
];

export const TABLE_20_1_CITE: Citation = {
  page: 748,
  section: '20.2',
  table: '20-1',
  note: 'Numbers are recommended intervals in calendar months; an asterisk (here "operations") means the requirement depends on the number and/or type of operations. Reclosers are not listed.',
};

/** All Table 20-1 tasks for an equipment name (case-insensitive substring match), or undefined. */
export function maintenanceTasksFor(equipment: string): Readonly<Partial<Record<MaintenanceTaskId, MaintenanceInterval>>> | undefined {
  const q = equipment.toLowerCase();
  return TABLE_20_1_PERIODIC_MAINTENANCE.find((r) => r.equipment.toLowerCase().includes(q))?.tasks;
}

export const MAINTENANCE_GUIDANCE: readonly Guidance[] = [
  { id: 'mn-program', text: 'An effective program combines scheduled (preventive) maintenance with corrective work, balancing reliability against accepted risk, and accounts for make, model, age, load, environment, access and each station\'s importance.', cite: { page: 747, section: '20; 20.1' }, tags: ['maintenance'] },
  { id: 'mn-records', text: 'Keep maintenance records in an electronic database: basis of the program, dates done and next due, condition found, and follow-up needed.', cite: { page: 747, section: '20.1.1' }, tags: ['maintenance', 'records'] },
  { id: 'mn-outages', text: 'Coordinate maintenance outages with power plant or transmission line outages, keep minimum clearances and use temporary barriers when only part of the station is de-energized.', cite: { page: 747, section: '20.1.2' }, tags: ['maintenance', 'safety'] },
  { id: 'mn-oem', text: 'OEM maintenance recommendations are typically conservative; overly conservative maintenance can cause failures, so cooperatives should maintain on actual condition where possible.', cite: { page: [747, 748], section: '20.2' }, tags: ['maintenance', 'simulation'] },
  { id: 'mn-visual-tasks', text: 'At each visual inspection also fill yard low spots, remove trash, replace burned-out lamps, remove bird nests near energized parts, touch up paint and galvanizing, and control vegetation.', cite: { page: 748, section: '20.2.1' }, tags: ['maintenance', 'yard'] },
  { id: 'mn-paint', text: 'Paint outdoor metalwork only above 7.2 °C (45 °F) and below 80% relative humidity, to about 5 mils (0.005 in) uniform thickness; galvanizing on structural steel should generally last more than 12 years, and Class II galvanized fence fabric many years in rural areas.', cite: { page: [749, 750], section: '20.2.2' }, tags: ['maintenance', 'painting', 'simulation'] },
  { id: 'mn-unscheduled', text: 'Correct abnormal conditions found during inspection according to severity: loose connections, contaminated or leaking bushings, deteriorated oil, low gas-cushion pressure, operated pressure relief, oil leaks, sludge, and damaged porcelain, cables or failing capacitors (bulging tanks, leaks, blown fuses).', cite: { page: 750, section: '20.3' }, tags: ['maintenance'] },
  { id: 'mn-ct-demag', text: 'A CT core magnetized by very high current can be demagnetized with the primary open by slowly raising secondary current from 0 to 5 A and back to 0; high-impedance CTs may need 450 V or more.', cite: { page: 750, section: '20.3' }, tags: ['maintenance', 'ct'] },
];

// ---------------------------------------------------------------------------
// Reliability-centered maintenance (§20.4)
// ---------------------------------------------------------------------------

export const RCM = {
  definitionReliability: 'The probability that a system performs a given function satisfactorily for a specified time under specified operating conditions.',
  principles: [
    'Preserve system function (for substations: safe, reliable power delivery).',
    'Identify the specific failure modes that define functional failure.',
    'Prioritize the importance of the failure modes.',
    'Identify effective and applicable preventive maintenance tasks.',
  ] as const,
  methods: [
    { id: 'corrective', text: 'Repair after failure; acceptable only for non-critical components or where prevention is not cost-effective.' },
    { id: 'preventive', text: 'Time- or usage-based tasks; RCM adds the question of why each task is needed.' },
    { id: 'proactive', text: 'Redesign or upgrade of components that repeatedly fail under normal loading or violate codes.' },
    { id: 'predictive', text: 'Condition-based: act only when actual condition warrants; judged the most sensible of the four.' },
  ] as const,
  priorityAttributes: ['Substation voltage', 'Equipment age', 'Number of sensitive customers served', 'Total breaker operations to date', 'Total extended outages to date'] as const,
  ageExplorationStepPct: 10,
  expectedResults: ['Better availability and reliability', 'Increased worker safety', 'Extended equipment life', 'Improved long-range asset planning', 'More cost-effective preventive maintenance scheduling', 'Reduced O&M costs from less corrective maintenance'] as const,
  cite: { page: [751, 754], section: '20.4', originalSource: 'A. M. Smith, Reliability Centered Maintenance (1993); IEEE P1266' } satisfies Citation,
} as const;

export const RCM_GUIDANCE: readonly Guidance[] = [
  { id: 'rcm-why', text: 'Condition-based RCM programs are a response to aging equipment and rising reliability expectations.', cite: { page: 751, section: '20.4' }, tags: ['maintenance', 'rcm'] },
  { id: 'rcm-age-exploration', text: 'Age exploration: if a PM finds no degradation, lengthen the interval by 10% and repeat until attention is needed, then shorten by 10% and keep that as the task interval.', cite: { page: 752, section: '20.4.1' }, tags: ['maintenance', 'rcm', 'simulation'] },
  { id: 'rcm-priority', text: 'Rank substations with a weighted score of voltage, equipment age, sensitive customers, breaker operations and extended outages (customers and outage history weighted heavily), then assess the top-ranked first.', cite: { page: 753, section: '20.4.2' }, tags: ['maintenance', 'rcm', 'simulation'] },
  { id: 'rcm-assessment', text: 'Assessment combines interviews and record review with a Detailed Inspection Procedure (percentage condition adjustments for visible failure modes) and an Online Equipment Evaluation (noise, temperature differences, slow breakers, oil samples).', cite: { page: [753, 754], section: '20.4.2' }, tags: ['maintenance', 'rcm'] },
  { id: 'rcm-cost-curve', text: 'Applying RCM may raise maintenance budgets at first as "accidents waiting to happen" are fixed, but over time it improves reliability and reduces O&M cost.', cite: { page: 754, section: '20.4.2' }, tags: ['maintenance', 'rcm', 'simulation'] },
];

/** §20.4.1 (p. 752) age exploration: next interval after a PM (+10% if no degradation; −10% and stop when attention was needed). */
export function ageExplorationNextInterval(currentInterval: number, degradationFound: boolean): { interval: number; final: boolean } {
  const step = RCM.ageExplorationStepPct / 100;
  return degradationFound ? { interval: currentInterval * (1 - step), final: true } : { interval: currentInterval * (1 + step), final: false };
}

// ---------------------------------------------------------------------------
// Uprating and expansion (Chapter 21)
// ---------------------------------------------------------------------------

export const UPRATING_NUMBERS = {
  transformerMvaIncreasePct: [15, 20] as const,
  busRatingRiseC: 30,
  busRatingRiseF: 54,
  busRatingAmbientC: 40,
  busRatingAmbientF: 104,
  busEmergencyCurrentIncreaseMaxPct: 25,
  busEmergencyDuration: 'a couple of days',
  newAuxFanPumpCircuitsDemandFactorPct: 100,
  higherVoltageFoundationsIfWithinYears: 10,
  rigidBusPhaseSpacing: { kv115: { m: 2.13, ft: 7 }, kv230: { m: 3.35, ft: 11 } },
  gisEconomicalFromKV: 230,
  ctReconnectExample: { ctRatio: '3000/5 multi-ratio', fromTap: '1200/5', toTap: '2000/5' },
  cite: { page: [755, 761], section: '21.3-21.4' } satisfies Citation,
} as const;

export const UPRATING_GUIDANCE: readonly Guidance[] = [
  { id: 'up-minimums', text: 'Uprated or expanded stations must still meet established minimum clearances and spacings, and must now address seismic criteria, oil spill prevention (possibly containment), fire protection, noise, aesthetics, hazardous materials and EMF.', cite: { page: 755, section: '21.1' }, tags: ['uprating', 'design-check'] },
  { id: 'up-feasibility', text: 'Compare cost estimates (including underground obstructions and environmental impacts) and choose the best cost/benefit plan consistent with the system plan; uprating suits sites without room to expand.', cite: { page: 755, section: '21.2' }, tags: ['uprating'] },
  { id: 'up-capacity-only', text: 'Uprating raises capacity only; the voltage stays the same and circuits normally keep their locations, perhaps reconductored. Get feasibility, cost and warranty answers from the manufacturer\'s headquarters engineering.', cite: { page: 755, section: '21.3' }, tags: ['uprating'] },
  { id: 'up-transformer', text: 'Transformers can often gain 15-20% MVA with added radiators, fans or oil pumps if the original design was conservative; give the manufacturer nameplate and purchase data and loading history.', cite: { page: 756, section: '21.3.1.1' }, tags: ['uprating', 'transformer'] },
  { id: 'up-breakers', text: 'Check breakers for continuous, momentary and interrupting duty (and capacitive switching if capacitors are added); new contacts, bushings or interrupters may fix deficiencies.', cite: { page: 756, section: '21.3.1.2' }, tags: ['uprating', 'breaker'] },
  { id: 'up-ct', text: 'Check CT thermal ratings and ratios; a multi-ratio CT can be reconnected to a higher tap (e.g. 3000/5 from the 1200/5 to the 2000/5 tap), remembering lower taps are less accurate and saturate under heavy faults.', cite: { page: 756, section: '21.3.1.3' }, tags: ['uprating', 'ct'] },
  { id: 'up-trap-ccvt', text: 'Wave traps are current-rated and usually need replacement; CCVTs and VTs are voltage-rated and stay unless added burden exceeds their limits.', cite: { page: [756, 757], section: '21.3.1.4-21.3.1.6' }, tags: ['uprating', 'communications'] },
  { id: 'up-bus', text: 'Bus heating rises with current squared; rate bus for a 30 °C rise over 40 °C ambient at full load, allow at most 25% emergency overcurrent for a couple of days, and recheck insulator cantilever strength for higher fault forces.', cite: { page: 757, section: '21.3.1.7' }, tags: ['uprating', 'bus', 'design-check'] },
  { id: 'up-switches', text: 'Check disconnect continuous and momentary ratings; uprate parts with the original manufacturer or replace.', cite: { page: [757, 758], section: '21.3.1.8' }, tags: ['uprating', 'switch'] },
  { id: 'up-arresters', text: 'Arresters need not change for a capacity uprate (no voltage change), but old designs, especially at transformers, are best replaced, silicon carbide with metal oxide.', cite: { page: 758, section: '21.3.1.9' }, tags: ['uprating', 'arrester'] },
  { id: 'up-aux', text: 'New transformer fan and pump circuits are critical loads at 100% demand factor; check auxiliary capacity, add panels if needed, and above all check the automatic transfer switch full-load and momentary ratings.', cite: { page: 758, section: '21.3.1.11' }, tags: ['uprating', 'auxiliary'] },
  { id: 'up-relays', text: 'Uprating usually means new relay settings and possibly full re-coordination for higher fault current, plus CT reconnection; voltage devices generally stay.', cite: { page: 758, section: '21.3.1.12' }, tags: ['uprating', 'relaying'] },
  { id: 'ex-higher-voltage', text: 'An expansion is the time to consider building for a future higher voltage (e.g. 230 kV spacing at a 115 kV station); if the higher voltage is expected within 10 years, build its foundations now.', cite: { page: [759, 760], section: '21.4.1' }, tags: ['expansion'] },
  { id: 'ex-bus-switches', text: 'Install disconnect switches at bus ends where extensions are expected so future work can be done dead without outages; GIS is a compact but costly option, typically economical from 230 kV up.', cite: { page: 760, section: '21.4.1' }, tags: ['expansion'] },
  { id: 'ex-site-ground', text: 'Take new soil data and resistivity measurements in the expansion area and design its grounding per Chapter 9 for the expected fault current.', cite: { page: 760, section: '21.4.2-21.4.3' }, tags: ['expansion', 'grounding', 'site'] },
  { id: 'ex-control-house', text: 'Enlarging the existing control house is preferred over a separate building; size the enlargement for the future voltage.', cite: { page: 761, section: '21.4.5' }, tags: ['expansion', 'control-house'] },
  { id: 'ex-aux', text: 'For expansion recheck auxiliary transformer, throwover switch (replace for any deficiency), ac/dc panel and switchgear capacity, and battery and charger by summing existing and new loads per Chapter 15.', cite: { page: [761, 762], section: '21.4.6.4' }, tags: ['expansion', 'auxiliary'] },
  { id: 'ex-planning', text: 'Schedule uprating or expansion with CPM, phase construction to minimize outages, inform customers, and assign a qualified person to monitor the plan.', cite: { page: 763, section: '21.5' }, tags: ['expansion', 'planning'] },
  { id: 'ex-new-vs-old', text: 'New construction disturbs customers least; upgrading alone is hard to justify but can win when combined with expansion or when safety and clearances fall short; equipment built to older standards need not be replaced just because standards changed if it performs well.', cite: { page: [763, 764], section: '21.6-21.7' }, tags: ['expansion', 'uprating'] },
];
