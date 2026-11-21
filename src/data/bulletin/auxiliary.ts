/**
 * Station auxiliary systems and control houses from RUS Bulletin 1724E-300:
 * Chapter 15 "AC and DC Auxiliary Systems" (pp. 673-687) and Chapter 16 "Control Houses" (pp. 689-698).
 *
 * Includes the bulletin's worked examples: battery selection (Example 15-1), charger sizing (Example 15-2,
 * Eq 15-3) and the ac transfer-switch sizing illustration of Fig 15-2.
 */
import type { Citation, Guidance } from './types';

export const AUXILIARY_CITES = {
  acLoads: { page: 673, section: '15.1.1' },
  acDesign: { page: [673, 678], section: '15.1.2', figure: '15-1, 15-2' },
  acEquipment: { page: [678, 680], section: '15.1.3' },
  acSummary: { page: 680, section: '15.1.4' },
  dcLoads: { page: 680, section: '15.2.1' },
  dcDesign: { page: 681, section: '15.2.2' },
  cells: { page: [681, 682], section: '15.2.3' },
  dutyCycle: { page: [682, 683], section: '15.2.4' },
  dcEquipment: { page: [683, 686], section: '15.2.5', figure: '15-3, 15-4' },
  controlHouse: { page: [689, 698], section: '16' },
} as const satisfies Record<string, Citation>;

// ---------------------------------------------------------------------------
// AC auxiliary system (§15.1)
// ---------------------------------------------------------------------------

export const AC_AUX_LOADS = {
  typical: [
    'Transformer cooling, oil pumps and load tap changers',
    'Circuit breaker air compressors and charging motors',
    'Outdoor device heaters',
    'Outdoor lighting and receptacles',
    'Control house lighting and receptacles',
    'Control house heating, ventilating and air conditioning',
    'Battery charger input',
    'Water well pump',
    'Motor-operated disconnect switches',
  ] as const,
  critical: [
    'Battery chargers (which, through the batteries, supply breaker trip/close and communication circuits)',
    'Transformer cooling',
    'Power circuit breaker compressors and motors',
    'Trouble-light receptacles in the yard',
    'Security lighting',
    'Breaker control circuits',
    'Fire alarm circuit(s)',
    'Electric heating',
    'Substation automation circuitry',
  ] as const,
  cite: { page: [673, 674], section: '15.1.1; 15.1.2.4', note: 'Critical loads should be grouped on panel(s) fed from the normal source, forming the minimum load for transfer to the alternative supply.' } satisfies Citation,
} as const;

export const AC_AUX_GUIDANCE: readonly Guidance[] = [
  { id: 'ac-demand', text: 'Size auxiliary transformers from demand kVA: tabulate connected kVA of every ac load and apply a demand factor to each (diversity and load factor need not be considered).', cite: { page: 673, section: '15.1.2.1' }, tags: ['auxiliary', 'ac', 'sizing'] },
  { id: 'ac-growth', text: 'Include near-term expansion load in the transformer size; for distant expansion it may be cheaper to add a transformer later.', cite: { page: 673, section: '15.1.2.1' }, tags: ['auxiliary', 'ac', 'sizing'] },
  { id: 'ac-feeds', text: 'One auxiliary transformer usually suffices at small distribution substations; large transmission substations serving large load blocks should have dual feeds to two separate auxiliary transformers.', cite: { page: 673, section: '15.1.2.2' }, tags: ['auxiliary', 'ac', 'design-check'] },
  { id: 'ac-sources', text: 'Dual sources should be independent so one loss does not affect the other; designate the less reliable as alternative. A power transformer tertiary winding is a popular normal source; a 480 or 240 V customer-level distribution feeder can be the alternative.', cite: { page: 673, section: '15.1.2.2' }, tags: ['auxiliary', 'ac'] },
  { id: 'ac-entry', text: 'Underground runs on substation property should use direct-buried conduit with a spare capped conduit, so a failed cable can be bypassed quickly.', cite: { page: 674, section: '15.1.2.3' }, tags: ['auxiliary', 'ac', 'cable'] },
  { id: 'ac-one-voltage', text: 'Standardize on one auxiliary secondary voltage per power system where possible, preferably the same level used for underground customers so spare transformers can be shared.', cite: { page: [674, 678], section: '15.1.2.5; 15.1.3.1' }, tags: ['auxiliary', 'ac'] },
  { id: 'ac-transfer', text: 'With two sources, transfer may be manual at attended stations but must be automatic at unattended stations; transfer is done on the secondary side (NEC Article 700).', cite: { page: 676, section: '15.1.2.6', originalSource: 'NEC Article 700' }, tags: ['auxiliary', 'ac', 'design-check'] },
  { id: 'ac-transfer-switch', text: 'Transfer switches should be break-before-make double-throw, mechanically interlocked, and rated to withstand the available fault current; alarm loss of voltage on either source.', cite: { page: [676, 677], section: '15.1.2.6', figure: '15-2' }, tags: ['auxiliary', 'ac'] },
  { id: 'ac-fault', text: 'Protective devices must interrupt auxiliary-system fault current as well as carry load; compute symmetrical fault current from total reactance (Eq 15-1) and use a 1.7 multiplier for asymmetrical current.', cite: { page: [677, 678], section: '15.1.2.7', equation: '15-1' }, tags: ['auxiliary', 'ac', 'fault-current'] },
  { id: 'ac-padmount', text: 'Pad-mounted distribution transformers (ANSI C57.12.25 single-phase ≤167 kVA; C57.12.26 three-phase ≤2500 kVA, both 34500GrdY/19920 V and below) suit large stations, with primary fused switches; small stations can use structure-mounted distribution transformers.', cite: { page: [678, 679], section: '15.1.3.1', originalSource: 'ANSI C57.12.25; ANSI C57.12.26' }, tags: ['auxiliary', 'ac', 'transformer'] },
  { id: 'ac-panels', text: 'Use NEMA 1 enclosures indoors and NEMA 3R outdoors; circuit breaker panelboards avoid fuse inventories and wrong-size replacements, while fuses are cheapest for very small installations. Provide about 20% spare breakers or fuses.', cite: { page: [679, 680], section: '15.1.3.2; 15.1.4' }, tags: ['auxiliary', 'ac'] },
  { id: 'ac-gfi', text: 'All branch breakers feeding ac yard circuits shall be ground-fault-interrupting (GFI) type; with fused panels, yard receptacles shall be GFI type.', cite: { page: 680, section: '15.1.4' }, tags: ['auxiliary', 'ac', 'safety', 'design-check'] },
  { id: 'ac-lighting', text: 'Outdoor lighting is for security and safety (photoelectric control; FAA lighting if a microwave tower requires it); the basic requirement is 1-2 foot-candles in equipment areas.', cite: { page: 679, section: '15.1.3.3' }, tags: ['auxiliary', 'lighting'] },
  { id: 'ac-receptacles', text: 'Place convenience receptacles in equipment cabinets and around the yard to serve 50-foot extension-cord trouble lights.', cite: { page: 679, section: '15.1.3.3' }, tags: ['auxiliary', 'lighting'] },
  { id: 'ac-indoor', text: 'Light relay and control panel fronts well; 4-foot fluorescent lamps are recommended over 8-foot for easier storage.', cite: { page: 680, section: '15.1.3.3' }, tags: ['auxiliary', 'lighting', 'control-house'] },
];

export interface SecondaryVoltageOption {
  id: string;
  name: string;
  grounded: boolean;
  notes: string;
}

/** §15.1.2.5 and Fig 15-1 (pp. 674-676): ac auxiliary secondary voltage options. */
export const AC_SECONDARY_VOLTAGES: readonly SecondaryVoltageOption[] = [
  { id: '480-240D', name: '480/240 V three-phase delta', grounded: false, notes: 'Three-phase fans and pumps at 480 V (motors rated 460/230 V, within NEMA +10%). Ungrounded: needs ground detection that alarms on the first ground and trips on a second.' },
  { id: '480Y277', name: '480Y/277 V three-phase four-wire', grounded: true, notes: 'Luminaires can use 277 V ballasts; receptacles fed through small dry-type 480-120 V transformers.' },
  { id: '208Y120', name: '208Y/120 V three-phase four-wire', grounded: true, notes: 'Combination power/lighting panels and direct 120 V receptacles reduce labor and material, partly offset by larger conductors than at 480 V.' },
  { id: '240D', name: '240 V three-phase delta', grounded: false, notes: 'Motors rated 230 V. Ungrounded: ground detection alarms on the first ground and trips on a second.' },
  { id: '240-120D', name: '240/120 V delta, three-phase four-wire (center-tapped phase)', grounded: true, notes: 'Most common level in moderate-size substations; combination panels serve 240 V single-phase loads too.' },
  { id: '240-120OD', name: '240/120 V open delta, three-phase four-wire', grounded: true, notes: 'Only 58% of the kVA of three transformers is usable; economical for medium or temporary installations and construction power; a third unit can be added later.' },
  { id: '240-120-1ph', name: '240/120 V single-phase three-wire', grounded: true, notes: '"Residential" service, applicable to small substations.' },
];

export const AC_SECONDARY_VOLTAGES_CITE: Citation = { page: [674, 676], section: '15.1.2.5', figure: '15-1', note: '"grounded" flags our reading of each connection; the bulletin explicitly calls the two delta-only systems ungrounded.' };

/** §15.1.2.6 (p. 677): automatic transfer switch operating points. */
export const AUTOMATIC_TRANSFER = {
  transferBelowPctRated: 83,
  returnAbovePctRated: [92, 95] as const,
  returnTimeDelay: 'adjustable',
  cite: { page: 677, section: '15.1.2.6' } satisfies Citation,
} as const;

/** Eq 15-1 (p. 678): symmetrical fault current IF = (line-to-line kV) / (√3 × ohms reactance) → kA. */
export function auxFaultCurrentKA(lineToLineKV: number, totalReactanceOhm: number): number {
  return lineToLineKV / (Math.sqrt(3) * totalReactanceOhm);
}

/** §15.1.2.7 (p. 678): multiplying factor for asymmetrical current, satisfactory for auxiliary power calculations. */
export const AUX_ASYMMETRY_FACTOR = 1.7;

/** Fig 15-2 illustration (pp. 676-678): transfer switch sizing for an all-load transfer scheme. */
export const AC_TRANSFER_SWITCH_EXAMPLE = {
  transformerKVA: 150,
  fullLoadA: 360, // 150 kVA at 240 V three-phase = 360.8 A
  selectedSwitchA: 400,
  fault: { sourceKVA: 250000, feeders: 'two 500 kcmil per phase, 3.05 m (10 ft)', transformerReactancePct: 4, approxFaultA: 10000 },
  reactancesOhm: { source250MVA: 0.00023, transformer150kVA: 0.0023, currentTransformer: 0.0005, cable10ft: 0.001 },
  cite: {
    page: [676, 678],
    section: '15.1.2.6-15.1.2.7',
    figure: '15-2',
    equation: '15-1',
    note:
      'UNCERTAIN: the listed reactances (sum ≈ 0.004 Ω) give about 34 kA at 240 V via Eq 15-1, not the stated ≈10 kA. A 150 kVA, 4%, 240 V transformer is ≈ 0.0154 Ω, which gives about 8 kA with the other values; the 0.0023 Ω figure corresponds to a 1000 kVA unit. Fault at point C (at the switch) is highest.',
  } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// DC auxiliary system (§15.2)
// ---------------------------------------------------------------------------

export const DC_AUX = {
  loads: ['Relaying, supervisory, alarm and control equipment', 'Emergency control house lighting', 'Circuit breaker trip and close circuits'] as const,
  commonVoltagesV: [24, 32, 48, 120, 240] as const,
  model: { nominalV: 120, cells: 60, nominalVPerCell: 2, finalVPerCell: 1.75, finalBatteryV: 105 },
  minBackupHours: 8,
  dropMaxPct: 3,
  solidStateMaxV: 140,
  cellSwitch: '50/60 cell switch: recharge or equalize at the 50-cell position',
  cite: { page: [680, 686], section: '15.2' } satisfies Citation,
} as const;

export const DC_AUX_GUIDANCE: readonly Guidance[] = [
  { id: 'dc-system', text: 'A substation dc system is a battery of suitable voltage and ampere-hour size floating on the control bus in parallel with a voltage-regulated charger; the charger carries steady loads and short intermittent loads within its capacity, the battery supplies the excess and everything if ac fails.', cite: { page: 681, section: '15.2.2' }, tags: ['auxiliary', 'dc', 'battery'] },
  { id: 'dc-two-voltages', text: 'Where two dc voltages are needed (e.g. 48 V microwave and 120 V station), use separate batteries and chargers or a dc-dc converter for small loads; do not tap a larger battery.', cite: { page: 681, section: '15.2.2' }, tags: ['auxiliary', 'dc', 'battery', 'design-check'] },
  { id: 'dc-8h', text: 'Size the main battery to allow at least 8 hours of normal substation operation; undersizing risks reclose failures, while oversizing only costs money.', cite: { page: 681, section: '15.2.2' }, tags: ['auxiliary', 'dc', 'battery', 'design-check'] },
  { id: 'dc-type-choice', text: 'Choose cell type on first cost, float life, annual depreciation and the number of deep discharges needed; a stationary battery stays in place up to 30 years, so system-wide cell standardization is unnecessary.', cite: { page: [681, 682], section: '15.2.3' }, tags: ['auxiliary', 'dc', 'battery'] },
  { id: 'dc-duty', text: 'Tabulate every dc load with voltage, current, duration and frequency of use (the last two form the duty cycle).', cite: { page: [682, 683], section: '15.2.4' }, tags: ['auxiliary', 'dc', 'battery'] },
  { id: 'dc-rates', text: 'Continuous loads (lights, relays) use the battery\'s 3-8 hour ratings, emergency lighting and some communications the 1-3 hour ratings, and breaker/relay operations the 1-minute rating; simultaneous breaker operations add.', cite: { page: 683, section: '15.2.4' }, tags: ['auxiliary', 'dc', 'battery'] },
  { id: 'dc-cables', text: 'Size dc cables and cabinets like ac ones but with no demand factor, holding voltage drop within 3%; short-circuit capacity is not a special consideration.', cite: { page: 683, section: '15.2.4' }, tags: ['auxiliary', 'dc', 'cable', 'design-check'] },
  { id: 'dc-rating-basis', text: 'Lead batteries are rated in ampere-hours at the 8-hour rate to 1.75 V per cell average at 25 °C (77 °F).', cite: { page: 683, section: '15.2.5.1' }, tags: ['auxiliary', 'dc', 'battery'] },
  { id: 'dc-charger', text: 'Battery life depends more on the charger than on any other external factor; substations use solid-state bridge rectifier chargers sized by Eq 15-3 and rounded up to the next standard size, with status and ac-failure alarms.', cite: { page: 685, section: '15.2.5.2', equation: '15-3' }, tags: ['auxiliary', 'dc', 'charger'] },
  { id: 'dc-eliminator', text: 'If the charger must act as a battery eliminator during battery maintenance, check its ripple against the dc input ratings of electronic relays, which rely on the battery as a filter.', cite: { page: 686, section: '15.2.5.2' }, tags: ['auxiliary', 'dc', 'charger'] },
  { id: 'dc-ungrounded', text: 'The dc system should be ungrounded, fed through fuse or (increasingly) circuit breaker panels, with the charger fitted with ground detection for positive or negative grounds (Fig 15-4).', cite: { page: 686, section: '15.2.5.3', figure: '15-4' }, tags: ['auxiliary', 'dc', 'design-check'] },
  { id: 'dc-separate-conduits', text: 'Run the positive and negative battery leads in separate PVC conduits to the first fused disconnect so they cannot short together with no protection.', cite: { page: 686, section: '15.2.5.3', figure: '15-3' }, tags: ['auxiliary', 'dc', 'design-check'] },
  { id: 'dc-140v', text: 'Solid-state relay panels may be damaged above 140 V dc, which equalizing can exceed: recharge on the 50-cell tap of a 50/60 cell switch (or remove cells), and add a surge suppressor across the battery for breaker-switching transients.', cite: { page: 686, section: '15.2.5.3' }, tags: ['auxiliary', 'dc', 'battery'] },
];

export interface BatteryType {
  id: 'lead-acid' | 'nickel-cadmium' | 'lead-calcium';
  name: string;
  chemistry: string;
  numbers: Readonly<Record<string, number | readonly [number, number]>>;
  advantages: readonly string[];
  disadvantages: readonly string[];
  cite: Citation;
}

/** §15.2.3 (pp. 681-682): cell types. */
export const BATTERY_TYPES: readonly BatteryType[] = [
  {
    id: 'lead-acid', name: 'Lead acid',
    chemistry: 'Positive plate lead peroxide, negative plate pure sponge lead, dilute sulphuric acid electrolyte.',
    numbers: { openCircuitVPerCellNominal: 2.25, ratingTempC: 25, ratingTempF: 77 },
    advantages: ['State of charge can be checked by hydrometer (Eq 15-2)'],
    disadvantages: ['Specific gravity varies with temperature (needs a thermometer and correction curves)', 'Corrosive sulphuric acid fumes'],
    cite: { page: 682, section: '15.2.3.1', equation: '15-2' },
  },
  {
    id: 'nickel-cadmium', name: 'Nickel cadmium (Ni-Cad)',
    chemistry: 'Positive plate nickel hydrate, negative plate cadmium sponge, potassium hydroxide electrolyte (SG 1.160-1.190 at 25 °C).',
    numbers: { openCircuitVPerCell: [1.30, 1.38], fullChargeVPerCell: 1.4, electrolyteSG: [1.160, 1.190] },
    advantages: ['Infrequent maintenance', 'No corrosive fumes (can be installed in cubicles)', 'Immune to inadvertent overcharge', 'Less derating below 25 °C'],
    disadvantages: ['Initial cost (main reason it is not used more for main station batteries)', 'Specific gravity does not indicate state of charge'],
    cite: { page: 682, section: '15.2.3.2' },
  },
  {
    id: 'lead-calcium', name: 'Lead calcium',
    chemistry: 'Like lead acid, with about 0.8% calcium added to the lead grid for strength.',
    numbers: { calciumPct: 0.8 },
    advantages: ['Stronger grid', 'Greatly reduced internal losses'],
    disadvantages: [],
    cite: { page: 682, section: '15.2.3.3' },
  },
];

/** Eq 15-2 (p. 682): lead-acid cell volts = specific gravity + 0.84. */
export function leadAcidCellVolts(specificGravity: number): number {
  return specificGravity + 0.84;
}

/** Eq 15-3 (p. 685): charger capacity A = L + 1.1·C/H (L continuous load A; C discharge Ah; H recharge time h). */
export function chargerAmps(continuousLoadA: number, dischargeAh: number, rechargeHours: number): number {
  return continuousLoadA + (1.1 * dischargeAh) / rechargeHours;
}

export interface DcLoad {
  name: string;
  amps: number;
  hours: number;
}

/** Ampere-hours of a duty cycle (sum of amps × hours), as tabulated in Example 15-2. */
export function dutyCycleAh(loads: readonly DcLoad[]): number {
  return loads.reduce((s, l) => s + l.amps * l.hours, 0);
}

export const AUX_EQUATIONS = [
  { id: '15-1', printed: 'IF = Line-to-Line kV / (√3 * Ohms Reactance)', variables: 'Ohms reactance: total reactance of all current-carrying parts from source to fault', cite: { page: 678, section: '15.1.2.7', equation: '15-1', note: 'The √ is lost in the PDF text layer; verified on the page image.' } satisfies Citation },
  { id: '15-2', printed: 'Cell Volts = S.G. + 0.84', variables: 'S.G. = specific gravity of the electrolyte (lead-acid)', cite: { page: 682, section: '15.2.3.1', equation: '15-2' } satisfies Citation },
  { id: '15-3', printed: 'A = L + 1.1C / H', variables: 'A charger capacity (A); L continuous load (A); C discharge (Ah); H recharge time (h)', cite: { page: 685, section: '15.2.5.2', equation: '15-3' } satisfies Citation },
] as const;

/** Example 15-1 (pp. 683-685): battery selection for the 120 V model. */
export const BATTERY_SELECTION_EXAMPLE = {
  dutyCycle: [
    { name: 'Ten 40-watt, 120-volt lamps', amps: 3.5, hours: 3 },
    { name: 'Relays and panel indicating lamps', amps: 5.0, hours: 8 },
    { name: 'Communications', amps: 5.0, hours: 3 },
    { name: 'Three simultaneous breaker operations', amps: 100.0, hours: 1 / 60 },
  ] as readonly DcLoad[],
  selectedCell: { plates: 7, oneMinuteAmpsTo175V: 200, ampHoursAtRate: { h8: 145, h5: 130, h3: 115, h1: 80 } },
  cellsInSeries: 60,
  cellType: 'lead calcium',
  cite: { page: [683, 685], section: '15.2.5.1', note: 'Approximate vendor data quoted by the bulletin; it stresses this is only a numerical illustration and real selection needs vendor data.' } satisfies Citation,
} as const;

/** Example 15-2 (p. 685): charger selection with an 8-hour recharge. */
export const CHARGER_SELECTION_EXAMPLE = {
  loadsAh: [
    { name: 'DC lights', amps: 3.5, hours: 3, ah: 10.5 },
    { name: 'Communications', amps: 5.0, hours: 3, ah: 15.0 },
    { name: 'Breaker operations', amps: 100.0, hours: 1 / 60, ah: 1.7 },
    { name: 'Panel load', amps: 5.0, hours: 8, ah: 40.0 },
  ] as const,
  totalAh: 67.2,
  continuousLoadA: 5,
  rechargeHours: 8,
  chargerA: 14.24,
  result: 'Select the next larger standard charger size; check vendor correction factors above 1000 m (3300 ft) and 40 °C (104 °F).',
  cite: { page: 685, section: '15.2.5.2', equation: '15-3' } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// Control houses (Chapter 16)
// ---------------------------------------------------------------------------

export const CONTROL_HOUSE_NUMBERS = {
  defaultBearingWithoutSoilData: { kPa: 48, lbPerFt2: 1000 },
  foundationInsulation: { cm: 5.1, in: 2 },
  floorSlabThickness: { cm: [12.7, 15.2] as const, in: [5, 6] as const },
  floorAboveGrade: { cm: [10.2, 20.3] as const, in: [4, 8] as const },
  slabBase: { cm: 10.2, in: 4 },
  vaporBarrier: { mm: 0.15, in: 0.006 },
  builtUpRoofMaxSlope: { cmPerM: 8.3, inPerFt: 1 },
  airChangesPerHour: [3, 5] as const,
  relayGlassMinAboveFloorIn: 12,
  rackWidth: { cm: 48.26, in: 19 },
  wellSupply: { lPerMin: 22, gpm: 5, minPressureKPa: 172.4, minPressurePsi: 25 },
  wellToSepticMin: { m: 15.2, ft: 50, note: 'Absent local ordinances.' },
  batteryRoomTemp: { c: 25, f: 77, note: 'UNCERTAIN: printed "32 °C (77 °F)"; 77 °F = 25 °C, consistent with the 25 °C battery rating basis of §15.2.3.1.' },
  cite: { page: [689, 698], section: '16.2-16.3' } satisfies Citation,
} as const;

export const CONTROL_HOUSE_GUIDANCE: readonly Guidance[] = [
  { id: 'ch-when', text: 'Small distribution substations can keep relays, meters and controls in weatherproof cabinets; larger substations need a separate control house, which may also hold switchgear, workshop, storage and lavatory space.', cite: { page: 689, section: '16.1' }, tags: ['control-house'] },
  { id: 'ch-foundation', text: 'Foundations are usually spread footings below frost depth (48 kPa / 1000 lb/ft² allowable bearing if no soil data) or drilled piers for pre-engineered metal buildings; insulate foundation walls with 5.1 cm (2 in) rigid insulation.', cite: { page: 689, section: '16.2.1' }, tags: ['control-house', 'foundation'] },
  { id: 'ch-floor', text: 'Use a 12.7-15.2 cm (5-6 in) reinforced floating slab on 10.2 cm (4 in) of compacted base with a 0.15 mm vapor barrier, 10-20 cm (4-8 in) above outside grade; settle cable routing (trenches or false floor) before finalizing the slab.', cite: { page: [689, 690], section: '16.2.2' }, tags: ['control-house'] },
  { id: 'ch-superstructure', text: 'Build with fire-resistant, low-maintenance materials; most new control houses are pre-engineered metal (easiest to procure and erect) or masonry block (economical when sized to block modules).', cite: { page: 690, section: '16.2.3', figure: '16-1, 16-2, 16-3' }, tags: ['control-house'] },
  { id: 'ch-roof', text: 'Masonry buildings use precast concrete or steel joist/deck roofs, preferably sloped; built-up pitch and slag suits slopes up to 8.3 cm/m (1 in/ft).', cite: { page: 692, section: '16.2.3' }, tags: ['control-house'] },
  { id: 'ch-doors', text: 'Provide at least one double door (possibly with a removable transom) for equipment, and a second exit where an accident could block a single exit (NESC; NEC); doors need locks, astragals, weatherstripping and quick-exit hardware.', cite: { page: 692, section: '16.2.3', originalSource: 'NESC; NEC' }, tags: ['control-house', 'safety', 'design-check'] },
  { id: 'ch-battery-vent', text: 'Ventilate the battery area to keep hydrogen below an explosive mixture (annunciate powered-ventilation failure); an isolated battery room gets a gravity roof ventilator, not a powered one.', cite: { page: [692, 698], section: '16.2.3; 16.3.7' }, tags: ['control-house', 'battery', 'safety', 'design-check'] },
  { id: 'ch-eyewash', text: 'Provide eyewash water or a neutralizing agent, eye protection and clothing at the battery, and marked fire extinguishers in the control house.', cite: { page: 692, section: '16.2.3' }, tags: ['control-house', 'battery', 'safety'] },
  { id: 'ch-windows', text: 'Windows are optional in office and lavatory areas and not needed in battery, control or metering areas.', cite: { page: 692, section: '16.2.3' }, tags: ['control-house'] },
  { id: 'ch-panels', text: 'Distribution circuits can use single vertical panels (one per circuit); higher-voltage circuits use duplex panels back-to-back with controls in front and relays behind; static relays and communications equipment often mount in 19-inch racks.', cite: { page: [692, 694], section: '16.3.1', figure: '16-4, 16-5' }, tags: ['control-house', 'relaying'] },
  { id: 'ch-panel-layout', text: 'Arrange panels to mirror the yard layout (mimic buses help), meters at eye level, switches at convenient height near the board center, relays from the top down and glass-covered relays at least 12 in above the floor; label every device and leave room to test and remove relays.', cite: { page: 694, section: '16.3.1' }, tags: ['control-house', 'relaying'] },
  { id: 'ch-compact', text: 'Three-phase microprocessor relays replacing single-phase electromechanical relays and meters are shrinking control houses; vendors can supply factory-wired and tested panels with the building.', cite: { page: 694, section: '16.3.1' }, tags: ['control-house', 'relaying'] },
  { id: 'ch-dc-room', text: 'Put the battery in a separate room where practical; otherwise keep switching devices and receptacles away, ventilate, and guard live parts. Charger and dc panel normally sit in the relay room.', cite: { page: 695, section: '16.3.2' }, tags: ['control-house', 'battery', 'design-check'] },
  { id: 'ch-ac', text: 'Give the workshop a high-capacity and a three-phase ac source; two ac sources through a manual or automatic transfer switch improve reliability.', cite: { page: 695, section: '16.3.3' }, tags: ['control-house', 'auxiliary'] },
  { id: 'ch-cableways', text: 'Cableways may be floor trenches with flush plates (often along panel backs), false floors with planned separated routes, conduits, wireways or overhead cable trays (NEC, NEMA).', cite: { page: [695, 696], section: '16.3.4' }, tags: ['control-house', 'cable'] },
  { id: 'ch-entrance', text: 'Bring cables in through smooth, bevelled wall windows, drained sleeves pitched outward, or covered drained cable pits, and leave spare openings for future cables.', cite: { page: [696, 697], section: '16.3.5' }, tags: ['control-house', 'cable'] },
  { id: 'ch-lighting', text: 'Use glare-free fluorescent lighting and a dc emergency incandescent system fed from battery packs or the station battery.', cite: { page: 697, section: '16.3.6' }, tags: ['control-house', 'lighting'] },
  { id: 'ch-hvac', text: 'Heat with unit heaters (or heat pumps where cooling is needed), using dual control: a minimum level for the equipment and a comfort level for maintenance visits; unattended stations need not be kept at comfort temperature.', cite: { page: 697, section: '16.3.7' }, tags: ['control-house', 'hvac'] },
  { id: 'ch-ventilation', text: 'Heat-only buildings need powered ventilation for 3-5 air changes per hour with thermostatic roof ventilators and wall louvers on fusible links; keep positive pressure to exclude dust and combustible gases.', cite: { page: [697, 698], section: '16.3.7; 15.1.3.3' }, tags: ['control-house', 'hvac', 'design-check'] },
  { id: 'ch-plumbing', text: 'A well, if used, should supply 22 L/min (5 gpm) at 172.4 kPa (25 psi) or more; septic systems follow local health codes, with at least 15.2 m (50 ft) from well to septic field absent local rules.', cite: { page: 698, section: '16.3.8' }, tags: ['control-house'] },
  { id: 'ch-comms', text: 'A commercial telephone is usual; larger stations add system telephone or carrier voice channels and SCADA or substation automation.', cite: { page: 698, section: '16.3.9' }, tags: ['control-house', 'communications'] },
];
