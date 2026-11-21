/**
 * Protective relaying data from RUS Bulletin 1724E-300, Chapter 12 "Protective Relaying" (pp. 601-636),
 * Appendix F "Standard Device Function Numbers" (pp. 637-645) and Appendix G "Suggested Suffix Letters"
 * (pp. 646-649). Appendices F and G are reprinted in the bulletin from IEEE Std C37.2-1996; device names
 * are kept as printed, but the long IEEE definitions are NOT reproduced — `role` texts are our paraphrase.
 *
 * Numbers the game can use directly: distance zone reaches/delays, breaker-failure timer, coordination
 * margins, transformer-size thresholds for fuse vs relay protection, and the device lists of Figs 12-12..12-16.
 */
import type { Citation, Guidance } from './types';

const C37_2 = 'IEEE Std C37.2-1996, "IEEE Standard Electrical Power System Device Function Numbers and Contact Designations"';

export const RELAYING_CITES = {
  purpose: { page: 601, section: '12.1.1' },
  objectives: { page: 601, section: '12.1.2' },
  abnormalConditions: { page: [601, 603], section: '12.1.3' },
  fundamentals: { page: [603, 604], section: '12.2' },
  relayModules: { page: [604, 607], section: '12.3.1', figure: '12-1' },
  relaySelection: { page: [607, 609], section: '12.3.2' },
  relayTypes: { page: [609, 613], section: '12.3.3-12.3.13', figure: '12-2 to 12-4' },
  schemesGeneral: { page: [613, 614], section: '12.4.1' },
  transmissionLine: { page: [614, 624], section: '12.4.2', figure: '12-5 to 12-11' },
  stepDistance: { page: [615, 617], section: '12.4.2.1.3', figure: '12-6' },
  pilot: { page: [617, 624], section: '12.4.2.2', figure: '12-7 to 12-11' },
  distributionFeeder: { page: [624, 626], section: '12.4.3', figure: '12-12' },
  transformer: { page: [626, 628], section: '12.4.4.1', figure: '12-13' },
  bus: { page: [628, 630], section: '12.4.4.2', figure: '12-14, 12-15' },
  breakerFailure: { page: [630, 632], section: '12.4.4.3', figure: '12-16' },
  reclosing: { page: [631, 633], section: '12.4.5' },
  coordination: { page: [633, 635], section: '12.4.6', figure: '12-17' },
  appendixF: { page: [637, 645], originalSource: C37_2 },
  appendixG: { page: [646, 649], originalSource: C37_2 },
} as const satisfies Record<string, Citation>;

// ---------------------------------------------------------------------------
// Purpose, objectives, abnormal conditions
// ---------------------------------------------------------------------------

export const RELAYING_PURPOSE: readonly Guidance[] = [
  { id: 'purpose', text: 'Protective relays detect faulted lines or apparatus and start the breakers or other interrupters that isolate them; they also detect other abnormal conditions and either alarm or trip.', cite: RELAYING_CITES.purpose, tags: ['relaying'] },
  { id: 'goal', text: 'The aim is to limit the effects of a disturbance and the damage to equipment while keeping the rest of the system in service.', cite: RELAYING_CITES.objectives, tags: ['relaying'] },
];

export interface DesignObjective {
  id: 'dependability' | 'security' | 'speed' | 'simplicity';
  text: string;
  cite: Citation;
}

/** §12.1.2 (p. 601): the four qualities of a good relaying system, paraphrased. */
export const RELAYING_OBJECTIVES: readonly DesignObjective[] = [
  { id: 'dependability', text: 'Operates correctly when it should, and selectively, removing the least possible part of the system.', cite: { page: 601, section: '12.1.2.1' } },
  { id: 'security', text: 'Avoids misoperation; each scheme must operate or restrain selectively with the others.', cite: { page: 601, section: '12.1.2.2' } },
  { id: 'speed', text: 'Clears every fault as fast as possible consistent with dependability and security.', cite: { page: 601, section: '12.1.2.3' } },
  { id: 'simplicity', text: 'No more complex than the application needs; extra equipment adds failure and misoperation risk.', cite: { page: 601, section: '12.1.2.4' } },
];

export interface AbnormalCondition {
  id: string;
  name: string;
  /** Paraphrased consequence / detection note. */
  text: string;
  /** Device function numbers (Appendix F) the condition maps to; our mapping, from Appendix F device names. */
  typicalDevices: readonly string[];
  cite: Citation;
}

/** §12.1.3 (pp. 601-603): indications of defective equipment or abnormal conditions. */
export const ABNORMAL_CONDITIONS: readonly AbnormalCondition[] = [
  { id: 'short-circuit', name: 'Short circuits (phase and ground faults)', text: 'Phase faults give high current and low voltage; ground faults may or may not, depending on whether the system is ungrounded, resistance grounded or effectively grounded.', typicalDevices: ['50', '51', '21', '67', '87'], cite: { page: 601, section: '12.1.3.1' } },
  { id: 'heating', name: 'Excessive heating', text: 'Overload, high ambient temperature or cooling failure shortens equipment life.', typicalDevices: ['49', '26'], cite: { page: [601, 602], section: '12.1.3.2' } },
  { id: 'overvoltage', name: 'Overvoltage', text: 'Equipment tolerates about 5% above nameplate voltage; more can fail insulation, shorten life, overheat magnetic devices and resistors, and destroy electronics.', typicalDevices: ['59'], cite: { page: 602, section: '12.1.3.3' } },
  { id: 'undervoltage', name: 'Undervoltage', text: 'Sustained undervoltage overheats motors, drops out contactors and leads to equipment failure.', typicalDevices: ['27'], cite: { page: 602, section: '12.1.3.4' } },
  { id: 'unbalance', name: 'Unbalanced phase conditions', text: 'Sudden current or voltage unbalance usually means an open or partly shorted phase; negative-sequence current badly overheats three-phase motors. Negative- and zero-sequence elements detect it.', typicalDevices: ['46', '47', '60'], cite: { page: 602, section: '12.1.3.5' } },
  { id: 'phase-rotation', name: 'Reversed phase rotation', text: 'Can follow circuit changes or an open phase and can damage driven equipment such as conveyors.', typicalDevices: ['47'], cite: { page: 602, section: '12.1.3.6' } },
  { id: 'frequency', name: 'Abnormal frequency', text: 'Occurs when load and generation are unequal; frequency-sensitive loads are affected.', typicalDevices: ['81'], cite: { page: 602, section: '12.1.3.7' } },
  { id: 'overspeed', name: 'Overspeed', text: 'Sudden loss of load can overspeed generators or series motors dangerously.', typicalDevices: ['12'], cite: { page: 602, section: '12.1.3.8' } },
  { id: 'pressure', name: 'Abnormal pressure', text: 'Internal faults in liquid-insulated equipment such as transformers create high internal pressure.', typicalDevices: ['63'], cite: { page: 602, section: '12.1.3.9' } },
  { id: 'impedance', name: 'Abnormal impedance', text: 'Large deviations from an equipment\'s known impedance indicate failure.', typicalDevices: ['21'], cite: { page: 602, section: '12.1.3.10' } },
  { id: 'out-of-step', name: 'Out-of-step conditions', text: 'A machine past its critical angle must be removed and resynchronized; impedance relays trip or block to split the system at points chosen by stability studies.', typicalDevices: ['68', '78'], cite: { page: 603, section: '12.1.3.11' } },
  { id: 'sync-check', name: 'Excessive phase angle at closing (synchronism check)', text: 'Closing across large voltage or angle differences causes damaging currents; the voltages and angle across the breaker are checked before closing.', typicalDevices: ['25'], cite: { page: 603, section: '12.1.3.12' } },
];

// ---------------------------------------------------------------------------
// Fundamentals and relay technology
// ---------------------------------------------------------------------------

export const RELAYING_FUNDAMENTALS: readonly Guidance[] = [
  { id: 'phasors', text: 'Phasor diagrams (always paired with a circuit diagram) are used to connect relays and analyse their operation after faults.', cite: { page: 603, section: '12.2.1' }, tags: ['relaying'] },
  { id: 'polarity', text: 'CT polarity: current entering primary terminal H1 leaves secondary terminal X1; the marks show relative direction for correct connections. PT polarity marks mean the same.', cite: { page: 603, section: '12.2.2' }, tags: ['relaying', 'instrument-transformer'] },
  { id: 'fault-causes', text: 'Air insulation can be bridged by birds, rodents, snakes, kite strings or tree limbs, broken down by lightning, or weakened by fire and smoke; porcelain can be bridged by dirty moisture or salt or crack.', cite: { page: [603, 604], section: '12.2.3' }, tags: ['relaying', 'faults'] },
  { id: 'symmetrical-components', text: 'Symmetrical components (Fortescue, 1918) are the foundation of fault analysis and of several relay principles.', cite: { page: 604, section: '12.2.4' }, tags: ['relaying'] },
  { id: 'inputs', text: 'Relays get scaled voltages from potential transformers and scaled currents from current transformers (§5.10).', cite: { page: 604, section: '12.2.5' }, tags: ['relaying', 'instrument-transformer'] },
  { id: 'modules', text: 'Every relay has an input module, a decision module and an output module, built from electromechanical, static or microprocessor components.', cite: { page: 604, section: '12.3.1', figure: '12-1' }, tags: ['relaying'] },
];

/** §12.3.1 (p. 605): the five most common relay functions. */
export const RELAY_FUNCTION_CLASSES = {
  values: ['protection', 'regulation', 'reclosing and synchronization', 'monitoring', 'auxiliary'] as const,
  cite: { page: [604, 605], section: '12.3.1' } satisfies Citation,
} as const;

export interface RelayTechnology {
  id: 'electromechanical' | 'static' | 'microprocessor';
  points: readonly string[];
  cite: Citation;
}

/** §12.3.1-12.3.2, §12.4.1 (pp. 605-614): relay construction technologies, paraphrased. */
export const RELAY_TECHNOLOGIES: readonly RelayTechnology[] = [
  {
    id: 'electromechanical',
    points: [
      'Oldest, best-documented; one discrete function per case; settings by taps, dials and switches.',
      'Induction discs, plungers, balance beams, thermal or D\'Arsonval units; operation recorded by a dropped target.',
      'A simple overcurrent relay has two settings (tap and time dial).',
    ],
    cite: { page: [605, 608], section: '12.3.1-12.3.2' },
  },
  {
    id: 'static',
    points: [
      'Solid-state threshold detectors; generally faster than electromechanical (some operate in under 1 cycle).',
      'Often fit the same cases as electromechanical relays; CT/PT leads often need shielding.',
      'Slightly faster and less maintenance than electromechanical, but considerably more costly.',
    ],
    cite: { page: [606, 613], section: '12.3.1.2; 12.3.2.2; 12.3.2.4; 12.4.1' },
  },
  {
    id: 'microprocessor',
    points: [
      'Many functions per case, multiple setting groups, metering, event records, fault location and communications.',
      'Typical operating speed 1.5 to 2 cycles; usually self-checking, but output contacts may not be covered by the alarm.',
      'Fewer relays, less panel space and wiring and possibly smaller control buildings in new installations.',
      'Settings can run to 10 or more pages; unused functions should be disabled. Setting groups can be changed inadvertently.',
    ],
    cite: { page: [605, 614], section: '12.3.1; 12.3.2.3-12.3.2.9; 12.4.1' },
  },
];

/** §12.3.2.4 (p. 608): typical operating times. */
export const RELAY_OPERATING_SPEED = {
  microprocessorCycles: [1.5, 2] as const,
  someStaticUnderCycles: 1,
  cite: { page: 608, section: '12.3.2.4' } satisfies Citation,
} as const;

export const RELAY_SELECTION_GUIDANCE: readonly Guidance[] = [
  { id: 'sel-study', text: 'Choose relays from the failure modes of each component, the inputs available, and the speed needed for stability.', cite: { page: 607, section: '12.3.2' }, tags: ['relaying'] },
  { id: 'sel-people', text: 'Consider the crews who will operate and test the relays (training, test computers), spare-parts availability over the installation life, and the cooperative\'s preferences.', cite: { page: 608, section: '12.3.2.7-12.3.2.10' }, tags: ['relaying'] },
  { id: 'sel-no-plc', text: 'Use relays for protective functions and keep automation equipment (e.g. PLCs) for added operating and metering features.', cite: { page: 609, section: '12.3.2.11' }, tags: ['relaying', 'automation'] },
];

// ---------------------------------------------------------------------------
// Basic relay types (§12.3.3-12.3.13)
// ---------------------------------------------------------------------------

export interface RelayType {
  id: string;
  name: string;
  /** Appendix F device numbers that correspond to this relay type (our mapping by device name). */
  deviceNumbers: readonly string[];
  respondsTo: string;
  notes: readonly string[];
  cite: Citation;
}

export const RELAY_TYPES: readonly RelayType[] = [
  {
    id: 'overcurrent', name: 'Overcurrent relay', deviceNumbers: ['50', '51'],
    respondsTo: 'Current magnitude above a set value (instantaneous 50 or time-delayed 51).',
    notes: [
      'Constructions: plunger, rotating induction disc, static, microprocessor; voltage-restrained variants exist.',
      'Characteristic on the R-X diagram is a circle centred on the origin (Fig 12-2).',
      'Simplest to apply, but hard to discriminate where fault currents differ little (e.g. short lines with high fault duty); long chains of overcurrent relays give excessive delays.',
    ],
    cite: { page: [609, 610], section: '12.3.3', figure: '12-2' },
  },
  {
    id: 'distance', name: 'Distance relay', deviceNumbers: ['21'],
    respondsTo: 'Voltage (restraint) and current (operate) together, i.e. impedance below a set reach.',
    notes: [
      'Operates within a few cycles for impedance inside its circle; time delay is added by a separate timer.',
      'Inherently directional; circle passes through the origin, with the reach as its diameter (Fig 12-3).',
      'Discriminates fault location better than overcurrent where fault current magnitudes do not; several zones are used, and concentric zones serve out-of-step detection.',
    ],
    cite: { page: [609, 611], section: '12.3.4', figure: '12-3' },
  },
  {
    id: 'differential', name: 'Differential relay', deviceNumbers: ['87'],
    respondsTo: 'Difference between two or more currents ("what goes in must come out") above a set value.',
    notes: [
      'Used for internal faults in transformers, generators and buses; restraint coils (and harmonic restraint for transformers) tolerate CT mismatch and ratio differences.',
      'Very sensitive; usually trips through a lockout relay (86) that prevents automatic or remote re-energizing.',
    ],
    cite: { page: [611, 612], section: '12.3.5', figure: '12-4' },
  },
  { id: 'overvoltage', name: 'Overvoltage relay', deviceNumbers: ['59'], respondsTo: 'Voltage above a set value.', notes: ['Same constructions as overcurrent relays.'], cite: { page: 612, section: '12.3.6' } },
  { id: 'undervoltage', name: 'Undervoltage relay', deviceNumbers: ['27'], respondsTo: 'Voltage below a set value.', notes: ['Same construction as overvoltage relays.'], cite: { page: 612, section: '12.3.7' } },
  { id: 'power', name: 'Power relay', deviceNumbers: ['32'], respondsTo: 'V·I·cos(angle) above a set value.', notes: ['Inherently directional: closes for power flow in one direction only.'], cite: { page: 612, section: '12.3.8' } },
  {
    id: 'directional-overcurrent', name: 'Directional overcurrent relay', deviceNumbers: ['67'],
    respondsTo: 'Excessive current flowing in a given direction.',
    notes: [
      'An overcurrent unit supervised by a directional unit, usually in the same case.',
      'Microprocessor versions offer a choice of polarizing quantity (residual or negative-sequence current or voltage).',
    ],
    cite: { page: 612, section: '12.3.9' },
  },
  { id: 'frequency', name: 'Frequency relay', deviceNumbers: ['81'], respondsTo: 'Frequency above or below a set value.', notes: ['Vibrating reed or induction disc, static, or microprocessor.'], cite: { page: [612, 613], section: '12.3.10' } },
  {
    id: 'thermal', name: 'Thermal relay', deviceNumbers: ['49', '26'],
    respondsTo: 'Temperature above a set value.',
    notes: ['Direct type: an embedded sensor such as a thermocouple.', 'Replica type: a bimetal element heated by a current proportional to the equipment current.'],
    cite: { page: 613, section: '12.3.11' },
  },
  {
    id: 'pressure', name: 'Pressure relay', deviceNumbers: ['63'],
    respondsTo: 'Sudden change of fluid or gas pressure.',
    notes: ['A bypass orifice equalizes slow pressure changes so only sudden rises (internal faults) operate the contacts.'],
    cite: { page: 613, section: '12.3.12' },
  },
  {
    id: 'auxiliary', name: 'Auxiliary relay', deviceNumbers: ['2', '62', '86', '94'],
    respondsTo: 'A signal from an initiating relay.',
    notes: ['Provides time delay, counting and extra contacts; lockout (86) and timers (62) are examples used in Figs 12-13 and 12-16.'],
    cite: { page: 613, section: '12.3.13' },
  },
];

// ---------------------------------------------------------------------------
// Transmission line protection (§12.4.2)
// ---------------------------------------------------------------------------

/** §12.4.2 (p. 614): schemes available for transmission line protection. */
export const TRANSMISSION_LINE_SCHEME_OPTIONS = {
  values: [
    'Overcurrent, instantaneous, nondirectional',
    'Overcurrent, timed (inverse curve or discrete time), nondirectional',
    'Overcurrent, instantaneous, directional',
    'Overcurrent, timed (inverse curve or discrete time), directional',
    'Current differential using overcurrent relays',
    'Distance, instantaneous and timed',
    'Pilot, with a communication channel between all terminals',
  ] as const,
  cite: { page: 614, section: '12.4.2' } satisfies Citation,
} as const;

/** §12.4.2 (p. 614): what the relay engineer needs to know to choose line protection. */
export const LINE_PROTECTION_DATA_NEEDED = {
  values: [
    'Line configuration', 'Number of line terminals', 'Radial or looped', 'Number of taps', 'Expected loading', 'Fault levels',
    'Other line-specific data', 'Load-specific requirements (specified outage times, temporary power levels)',
    'System constraints such as out-of-step requirements', 'Coordination with the remote terminals\' relaying',
  ] as const,
  cite: { page: 614, section: '12.4.2' } satisfies Citation,
} as const;

export interface DistanceZone {
  zone: 1 | 2 | 3;
  /** Reach as percent of the protected line impedance [min, max]. */
  reachPctOfLine: readonly [number, number];
  /** Trip delay in cycles (60 Hz) [min, max]; 0 = instantaneous (no intentional delay). */
  delayCycles: readonly [number, number];
  purpose: string;
  cite: Citation;
}

/** §12.4.2.1.3 (pp. 616-617): typical step-distance settings. */
export const STEP_DISTANCE_ZONES: readonly DistanceZone[] = [
  { zone: 1, reachPctOfLine: [85, 95], delayCycles: [0, 0], purpose: 'Instantaneous tripping for most of the line, set short of the remote terminal.', cite: { page: 616, section: '12.4.2.1.3', figure: '12-6' } },
  { zone: 2, reachPctOfLine: [120, 150], delayCycles: [18, 30], purpose: 'Covers the rest of the line, reaching into but not past the far ends of adjacent lines.', cite: { page: 616, section: '12.4.2.1.3', figure: '12-6' } },
  { zone: 3, reachPctOfLine: [200, 225], delayCycles: [60, 120], purpose: 'Reaches through the next line as backup for breaker failure; may encroach on load and respond to swings. Sometimes reversed (carrier schemes, local breaker failure).', cite: { page: 617, section: '12.4.2.1.3' } },
];

/** §12.4.2.1.3 (p. 616): with Zone 1 at both ends, 70-90% of the line gets instantaneous clearing from both terminals. */
export const STEP_DISTANCE_INSTANTANEOUS_COVERAGE_PCT = { value: [70, 90] as const, cite: { page: 616, section: '12.4.2.1.3' } satisfies Citation } as const;

export interface LineScheme {
  id: string;
  name: string;
  category: 'non-pilot' | 'pilot-directional-comparison' | 'pilot-phase-comparison';
  /** Device numbers named in the bulletin text/figures for the scheme. */
  devices: readonly string[];
  channel?: string;
  numbers?: Readonly<Record<string, number | readonly [number, number]>>;
  points: readonly string[];
  cite: Citation;
}

export const TRANSMISSION_LINE_SCHEMES: readonly LineScheme[] = [
  {
    id: 'overcurrent', name: 'Overcurrent relaying', category: 'non-pilot', devices: ['51', '50', '67'],
    points: [
      'Simplest protection; used on lower-voltage lines and radial feeders, occasionally as transmission backup.',
      'Basic radial form: nondirectional inverse-time relays, two phase and one ground; trip time lengthens with distance to the fault.',
      'Directional relays are added where backfeed is possible; an instantaneous element covers close-in high-current faults.',
      'Coordinating overcurrent relays on a networked system is extremely difficult and should be avoided where possible.',
    ],
    cite: { page: 615, section: '12.4.2.1.1' },
  },
  {
    id: 'current-differential-oc', name: 'Current differential with an overcurrent relay (incl. open differential)', category: 'non-pilot', devices: ['51'],
    points: [
      'CTs of all terminals are hard-wired in a differential connection to an overcurrent relay; more secure and sensitive than plain overcurrent.',
      'Used inside a substation or plant for short line segments or buses that do not need differential-relay speed; must be set above CT mismatch.',
      'Open differential (Fig 12-5): CTs on N-1 of the lines, relay set for the load of the un-CT\'d line; often backs up a transformer differential at an in-and-out substation.',
    ],
    cite: { page: [615, 616], section: '12.4.2.1.2', figure: '12-5' },
  },
  {
    id: 'step-distance', name: 'Step distance relaying', category: 'non-pilot', devices: ['21'],
    numbers: { zone1ReachPct: [85, 95], zone2ReachPct: [120, 150], zone2DelayCycles: [18, 30], zone3ReachPct: [200, 225], zone3DelayCycles: [60, 120] },
    points: [
      'Fixed reach regardless of system conditions, works for fault currents below load current, little transient overreach; needs line potential sources and costs more than overcurrent.',
      'Faults near one terminal are cleared sequentially: near breaker instantly, remote breaker after the Zone 2 delay.',
      'Difficult on very short lines (tiny settings may overreach); three-terminal lines normally need a pilot scheme.',
    ],
    cite: { page: [615, 617], section: '12.4.2.1.3', figure: '12-6' },
  },
  {
    id: 'dcb', name: 'Directional comparison blocking', category: 'pilot-directional-comparison', devices: ['21', '67', '85'],
    channel: 'On/off power line carrier (also audio tone or microwave)',
    numbers: { coordinationDelayMs: [6, 16] },
    points: [
      'Forward trip relays reach past the remote end; reverse start relays send a block signal for faults behind the terminal.',
      'A 6-16 ms tripping delay waits for a possible block signal; the channel is not needed to trip, so channel failure risks overtripping for adjacent-line faults.',
      'No signal has to pass through the fault, making it the most popular carrier relaying system.',
    ],
    cite: { page: [617, 618], section: '12.4.2.2.1', figure: '12-7' },
  },
  {
    id: 'dcub', name: 'Directional comparison unblocking', category: 'pilot-directional-comparison', devices: ['21P', '85'],
    channel: 'Frequency shift keying (continuous guard signal)',
    numbers: { lossOfChannelTripWindowMs: 150 },
    points: [
      'A guard frequency is sent continuously and shifted to trip for internal faults.',
      'On loss of both guard and trip signals, about 150 ms of trip permission is allowed, then the channel locks out.',
      'More secure than blocking; continuous channel can be monitored. Separate channels between each pair of terminals; suits two- and multi-terminal lines.',
    ],
    cite: { page: [618, 619], section: '12.4.2.2.1', figure: '12-8' },
  },
  {
    id: 'pott', name: 'Permissive overreaching transfer trip', category: 'pilot-directional-comparison', devices: ['21', '85'],
    channel: 'Audio tone FSK over microwave, leased line or fiber (power line carrier not recommended)',
    points: [
      'One overreaching detector per terminal; both ends must see the fault and exchange trip signals.',
      'Highly secure, but less dependable than blocking because the trip signal must be received; often used when a non-pilot line gets a channel added.',
    ],
    cite: { page: 619, section: '12.4.2.2.1' },
  },
  {
    id: 'dutt', name: 'Direct underreaching transfer trip', category: 'pilot-directional-comparison', devices: ['21', '85'],
    channel: 'Audio tone FSK over microwave, leased line or fiber; dual-channel transfer trip reduces false trips',
    points: ['Underreaching detector trips locally and keys a direct trip to the remote end with no local confirmation.', 'Least complex but seldom used because false channel outputs cause false trips.'],
    cite: { page: 620, section: '12.4.2.2.1', figure: '12-9' },
  },
  {
    id: 'putt', name: 'Permissive underreaching transfer trip', category: 'pilot-directional-comparison', devices: ['21', '85'],
    channel: 'Audio tone FSK over microwave, leased line or fiber (carrier not normally used)',
    points: ['Like direct underreach, but the received trip needs confirmation by a local overreaching detector.', 'Commonly chosen when a step-distance line gets a pilot channel added.'],
    cite: { page: 621, section: '12.4.2.2.1', figure: '12-10' },
  },
  {
    id: 'phase-comparison', name: 'Phase comparison', category: 'pilot-phase-comparison', devices: ['87', '85'],
    channel: 'Usually on/off, keyed when fault detectors pick up',
    points: [
      'Compares current direction at each terminal and trips when current flows into the line at all ends; immune to load and swings, needs no potential unless distance supervision is required.',
      'Fault detectors must be set above line charging current; timers compensate channel transit time. Popular on series-compensated lines.',
      'Variants: pilot wire (telephone pair; lines of about a mile or so; being replaced by fiber), single-phase, dual-phase (separate channel per half-cycle polarity) and segregated phase comparison (a channel per phase).',
    ],
    cite: { page: [621, 624], section: '12.4.2.2.2', figure: '12-11' },
  },
];

export const TRANSMISSION_LINE_GUIDANCE: readonly Guidance[] = [
  { id: 'tl-significance', text: 'Line protection depends on the line\'s importance and how fast its faults must be cleared, not on voltage alone.', cite: { page: 614, section: '12.4.2' }, tags: ['relaying', 'transmission-line'] },
  { id: 'tl-345', text: 'Lines at 345 kV normally use two primary relay schemes with pilot protection.', cite: { page: 614, section: '12.4.2' }, tags: ['relaying', 'transmission-line'] },
  { id: 'tl-primary-backup', text: 'Schemes may be used alone or combined as primary and secondary protection for phase and ground faults.', cite: { page: 614, section: '12.4.2' }, tags: ['relaying', 'transmission-line'] },
  { id: 'tl-pilot', text: 'Pilot schemes compare quantities at all terminals over pilot wire, microwave, fiber or power line carrier; they are either directional comparison or phase comparison.', cite: { page: 617, section: '12.4.2.2' }, tags: ['relaying', 'transmission-line', 'communications'] },
];

// ---------------------------------------------------------------------------
// Distribution feeders (§12.4.3, Fig 12-12)
// ---------------------------------------------------------------------------

export const FEEDER_PROTECTION = {
  devices: [
    { id: 'breaker-relays', text: 'Feeder breakers use overcurrent relays: historically at least two phase and one ground (if grounded) nondirectional inverse-time relays with instantaneous elements; often a third phase relay so one can be disabled or bench tested. Microprocessor practice: three phase elements plus neutral.', devices: ['50', '51', '50N', '51N'], cite: { page: 624, section: '12.4.3.1' } },
    { id: 'extra', text: 'Voltage-controlled overcurrent and negative-sequence relays may be added; microprocessor relays offer setting groups that can follow configuration changes.', devices: ['51V', '46'], cite: { page: 625, section: '12.4.3.1' } },
    { id: 'recloser', text: 'Reclosers are compact self-contained breakers with programmable fast and delayed trips and reclosures, for substation or pole mounting; single-phase units are series-trip, three-phase units series or non-series trip (solid-state control with battery).', devices: ['79'], cite: { page: 625, section: '12.4.3.2' } },
    { id: 'single-vs-three', text: 'Single-phase reclosers usually give better reliability on rural circuits; three-phase reclosers with ground trip suit predominantly three-phase or large loads needing ground-fault sensitivity.', devices: [], cite: { page: 625, section: '12.4.3.2' } },
    { id: 'sectionalizer', text: 'Sectionalizers do not interrupt fault current; they count upstream recloser operations and open while the line is dead, and can interrupt load current within rating.', devices: [], cite: { page: 625, section: '12.4.3.2.1' } },
    { id: 'fuse', text: 'Fuses protect distribution transformers and branches, are normally the farthest-downstream device, and are occasionally used in the substation for a feeder or as backup for a recloser/breaker bypass switch.', devices: [], cite: { page: 625, section: '12.4.3.2.2' } },
  ],
  /** Fig 12-12 (p. 624): one-line of a distribution circuit's protective elements. */
  fig12_12: {
    elements: ['Supply station bus', 'CT with 50/51 overcurrent relay', 'Feeder circuit breaker', 'Fused distribution transformer tap', 'Line recloser (ACR)', 'Sectionalizer (S)', 'Fused branch lines'],
    faultPoints: { F1: 'on a fused branch', F2: 'beyond the sectionalizer', F3: 'between recloser and sectionalizer', F4: 'between the station breaker and the recloser' },
    cite: { page: 624, section: '12.4.3.1', figure: '12-12' } satisfies Citation,
  },
} as const;

/**
 * §12.4.3.2.3 (pp. 625-626), Fig 12-12: the bulletin's (qualitative) distribution coordination example.
 * Usable as a scripted scenario test; it contains no currents or times.
 */
export const FEEDER_COORDINATION_EXAMPLE = {
  reclosingSequence: { fastTrips: 1, delayedTrips: 3, note: 'Recloser generally set for one fast and three delayed trips before lockout.' },
  outcomes: [
    { fault: 'F1', clearedBy: 'branch fuse', when: 'blows during the second delayed recloser trip; upstream devices must pass enough integrated current without locking out' },
    { fault: 'F2', clearedBy: 'sectionalizer', when: 'opens after the second delayed recloser trip (while de-energized)' },
    { fault: 'F3', clearedBy: 'recloser', when: 'locks out after the third delayed trip' },
    { fault: 'F4', clearedBy: 'station breaker relay', when: 'set to clear F4 but coordinated not to trip for F3, allowing for electromechanical overtravel and reset times' },
  ],
  caveat: 'Simplified: real feeders have long branches and misapplied devices, so some non-selectivity is accepted and moved to where it does least harm.',
  cite: { page: [625, 626], section: '12.4.3.2.3', figure: '12-12' } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// Transformer, reactor, bus and breaker-failure protection (§12.4.4)
// ---------------------------------------------------------------------------

/** §12.4.4.1 (p. 626): transformer size thresholds for fuse vs relay protection. */
export const TRANSFORMER_PROTECTION_THRESHOLDS = {
  /** Transformers at or below this size are almost always fuse protected. */
  almostAlwaysFusedAtOrBelowMVA: 5,
  /** Relay protection is most often used at or above this size. */
  relaysMostOftenAtOrAboveMVA: 10,
  /** Some transformers this large are still fuse protected. */
  fusedUpToMVA: 30,
  cite: { page: 626, section: '12.4.4.1' } satisfies Citation,
} as const;

export interface SchemeDevice {
  device: string;
  name: string;
  role: string;
  optional?: boolean;
}

/** Fig 12-13 (p. 627): typical transformer relay protection (delta-wye, distribution-type station). */
export const TRANSFORMER_PROTECTION_FIG_12_13: { devices: readonly SchemeDevice[]; notes: readonly string[]; cite: Citation } = {
  devices: [
    { device: '63', name: 'Pressure switch (sudden pressure relay)', role: 'Detects the sudden tank pressure rise of an internal fault; many regard it as the primary transformer protection.' },
    { device: '87', name: 'Differential protective relay', role: 'Primary protection, percentage differential to allow for ratio differences, magnetizing current and CT mismatch.' },
    { device: '86', name: 'Lockout relay', role: 'Operated by 87; trips the local breakers and sends a transfer trip to the remote primary breaker.' },
    { device: '50H/51H', name: 'High-side instantaneous / time overcurrent', role: 'Backup to the differential on the primary winding (a directional phase distance relay may be used if overcurrent cannot coordinate with secondary main and feeder relays).' },
    { device: '51N', name: 'Neutral time overcurrent', role: 'On the transformer neutral CT; added sensitivity to ground faults.' },
    { device: '50L/51L', name: 'Low-side instantaneous / time overcurrent', role: 'Low-side phase overcurrent, shown as optional.', optional: true },
  ],
  notes: [
    'Differential CTs are taken from the local primary breaker and secondary breaker when those breakers exist (optional CT connections).',
    'Without a primary breaker, the transformer is cleared by transfer trip to the remote substation or by a high-speed ground switch, which adds channel or remote clearing time.',
    'Secondary breakers are often omitted; then the engineer decides whether to trip all feeder breakers or open them manually before re-energizing.',
  ],
  cite: { page: [626, 628], section: '12.4.4.1', figure: '12-13' },
};

export const TRANSFORMER_PROTECTION_GUIDANCE: readonly Guidance[] = [
  { id: 'xfmr-fuse-merits', text: 'Fuses are economical and need little maintenance, no breaker and no battery, which also shrinks the control building; but they protect little against internal faults and can single-phase secondary loads if only one blows.', cite: { page: 626, section: '12.4.4.1' }, tags: ['relaying', 'transformer', 'fuse'] },
  { id: 'xfmr-relays', text: 'Larger transformers usually get sudden pressure, differential, overcurrent (or directional phase distance) and ground overcurrent relays.', cite: { page: 626, section: '12.4.4.1', figure: '12-13' }, tags: ['relaying', 'transformer', 'design-check'] },
  { id: 'xfmr-extra', text: 'Negative-sequence relays (sensitive backup, blind to load), overvoltage relays (overexcitation) and thermal relays (overload) may be added.', cite: { page: 628, section: '12.4.4.1' }, tags: ['relaying', 'transformer'] },
  { id: 'xfmr-individual', text: 'Evaluate the protection of each transformer installation individually.', cite: { page: 628, section: '12.4.4.1' }, tags: ['relaying', 'transformer'] },
  { id: 'reactor', text: 'Reactors may use generator-type differential relays with phase and ground overcurrent backup, occasionally phase distance backup.', cite: { page: 628, section: '12.4.4.1' }, tags: ['relaying', 'reactor'] },
];

export interface BusScheme {
  id: string;
  name: string;
  devices: readonly string[];
  points: readonly string[];
  cite: Citation;
}

/** §12.4.4.2 (pp. 628-630): bus protection options, paraphrased. */
export const BUS_PROTECTION_SCHEMES: readonly BusScheme[] = [
  { id: 'remote', name: 'Remote tripping for bus faults', devices: ['21', '51N'], points: ['Remote breakers on all lines feeding the bus trip on Zone 2 or time-delayed ground relays.', 'Simplest and cheapest, but drops loads served from those lines and clearing may be too slow.'], cite: { page: 628, section: '12.4.4.2 item 1' } },
  { id: 'transformer-oc', name: 'Transformer overcurrent relays (distribution substations)', devices: ['50', '51', '51N'], points: ['Phase and neutral overcurrent relays on either side of the transformer protect the bus but must coordinate with feeder relays, so bus clearing is slow.', 'Very simple and partly backs up feeder relays; check that the delay is acceptable.'], cite: { page: 628, section: '12.4.4.2 item 2a', figure: '12-13' } },
  { id: 'current-differential', name: 'Current differential (Fig 12-14)', devices: ['87'], points: ['All bus CTs paralleled into a differential relay; restraint coils help with unequal CT performance but high-fault-duty buses need care.', 'Overcurrent relays can be used in the differential circuit cheaply but have no restraint and must be set slower.'], cite: { page: [628, 629], section: '12.4.4.2 item 2b', figure: '12-14' } },
  { id: 'voltage-differential', name: 'Voltage (high-impedance) differential', devices: ['87'], points: ['A high-impedance voltage element across the paralleled CTs can be set above the worst external-fault voltage yet stay sensitive; performs well on high-fault-duty buses.'], cite: { page: 628, section: '12.4.4.2 item 2b' } },
  { id: 'pseudo-differential', name: 'Pseudo bus differential (Fig 12-15)', devices: ['50-M/51-M', '50-n/51-n', '62'], points: ['Main breaker instantaneous element picks up any bus fault; feeder instantaneous elements (set to reach farther) block it for feeder faults; a 62 timer then trips the main breaker for bus faults.', 'Needs no fault sources on the feeders (or directional feeder elements); slower than true differential, faster than plain overcurrent.'], cite: { page: [629, 630], section: '12.4.4.2 item 2c', figure: '12-15' } },
  { id: 'reverse-zone3', name: 'Reverse-looking Zone 3', devices: ['21'], points: ['A line relay\'s Zone 3 set in reverse sees the bus behind it and trips through a timer.'], cite: { page: 630, section: '12.4.4.2 item 2d' } },
];

/** Fig 12-15 (p. 630): pseudo bus differential logic, as drawn. */
export const PSEUDO_BUS_DIFFERENTIAL_FIG_12_15 = {
  devices: [
    { device: '50-M/51-M', name: 'Main bus relay (transformer secondary)', role: 'Its instantaneous "a" contact starts the bus-fault logic.' },
    { device: '50-1/51-1 … 50-4/51-4', name: 'Feeder relays', role: 'Their instantaneous "b" contacts, in series, block the logic when any feeder sees the fault.' },
    { device: '62', name: 'Time-delay stopping or opening relay (timer)', role: 'Its contact energizes the trip coil (TC) of main breaker M.' },
  ] as readonly SchemeDevice[],
  cite: { page: 630, section: '12.4.4.2', figure: '12-15' } satisfies Citation,
} as const;

/** §12.4.4.3 (pp. 630-631), Fig 12-16: breaker failure protection. */
export const BREAKER_FAILURE = {
  classes: ['Failure of the breaker itself', 'Failure of the relaying associated with the breaker'] as const,
  schemes: [
    { id: 'remote-backup', name: 'Remote backup', text: 'Zone 3 distance and/or ground time-overcurrent relays covering contiguous lines; simple and covers relay or breaker failure, but must stay above load, may miss remote faults, can overtrip multi-terminal or short adjacent lines and is swing-sensitive.', cite: { page: [630, 631], section: '12.4.4.3 item 1' } },
    { id: 'reverse-zone3', name: 'Local backup: reverse Zone 3', text: 'A reverse-looking Zone 3 protects local equipment including adjacent breakers, bus, lines and remote terminals.', cite: { page: 631, section: '12.4.4.3 item 2a' } },
    { id: 'timer-on-primary', name: 'Local backup: timer on primary relays', text: 'If the fault persists past a timer after the primary relays operate, all adjacent breakers trip; no backup for failure of the primary relays themselves.', cite: { page: 631, section: '12.4.4.3 item 2b' } },
    { id: 'duplicate-relaying', name: 'Local backup: duplicate relaying', text: 'A second relay set (up to a fully duplicated dc system on EHV); at 69 kV and above, dual trip coils, primary and secondary relays and dual dc trip buses are common, often from one battery. Does not cover a stuck breaker mechanism.', cite: { page: 631, section: '12.4.4.3 item 2c' } },
    { id: 'full-bf', name: 'Full breaker failure backup (Fig 12-16)', text: 'A separate breaker-failure relay trips all adjacent breakers, and remote breakers by transfer trip, when the breaker fails to clear.', cite: { page: 631, section: '12.4.4.3 item 2d', figure: '12-16' } },
  ],
  fig12_16: {
    devices: [
      { device: 'PRI RLY / SEC RLY', name: 'Primary and secondary protective relays', role: 'Each trips its own breaker trip coil (52T1 / 52T2) through a 52a contact.' },
      { device: '52T1, 52T2', name: 'Dual breaker trip coils', role: 'Independent trip paths.' },
      { device: '62X, 62Y', name: 'Auxiliary (timer-start) relays', role: 'Energized with the primary/secondary trip; either one keys the breaker-failure timer.' },
      { device: '50BF', name: 'Breaker-failure fault detector (instantaneous overcurrent)', role: 'Supervises the timer: if current drops out, nothing happens.' },
      { device: '62T', name: 'Breaker-failure timer', role: 'Times out if the fault is not removed.' },
      { device: '86BF', name: 'Breaker-failure lockout relay', role: 'Trips all adjacent breakers and transfer-trips remote breakers.' },
    ] as readonly SchemeDevice[],
    timerCycles: [10, 20] as const,
    cite: { page: [631, 632], section: '12.4.4.3', figure: '12-16', note: 'Timer setting usually 10 to 20 cycles.' } satisfies Citation,
  },
  dualTripCoilsFromKV: { value: 69, cite: { page: 631, section: '12.4.4.3 item 2c', note: 'Systems of 69 kV and above often have dual trip coils, primary and secondary relays and dual dc trip buses.' } satisfies Citation },
} as const;

// ---------------------------------------------------------------------------
// Reclosing (§12.4.5) and coordination (§12.4.6)
// ---------------------------------------------------------------------------

export const RECLOSING_GUIDANCE: readonly Guidance[] = [
  { id: 'rc-transient', text: 'Most faults on open-wire overhead circuits, such as distribution lines, are transient (e.g. lightning) and clear when the circuit is de-energized, so service can be restored by reclosing.', cite: { page: 631, section: '12.4.5.1' }, tags: ['relaying', 'reclosing'] },
  { id: 'rc-cables', text: 'Reclosing is generally not applied where permanent faults are likely, such as on cables.', cite: { page: 632, section: '12.4.5.1' }, tags: ['relaying', 'reclosing', 'design-check'] },
  { id: 'rc-shots', text: 'Single-shot reclosing relays allow one reclose (manual or self reset); multishot relays allow several and are self-resetting after the breaker stays closed for a set time.', cite: { page: 633, section: '12.4.5.2' }, tags: ['relaying', 'reclosing'] },
  { id: 'rc-radial', text: 'On radial circuits the first reclose is usually instantaneous and any further recloses are time delayed.', cite: { page: 633, section: '12.4.5.2' }, tags: ['relaying', 'reclosing', 'design-check'] },
  { id: 'rc-loop', text: 'On loop or multiterminal lines instantaneous reclosing is generally not used unless relaying ensures all line breakers open simultaneously for every line fault.', cite: { page: 633, section: '12.4.5.2' }, tags: ['relaying', 'reclosing', 'design-check'] },
  { id: 'rc-lockout', text: 'After a set number of unsuccessful reclosures the breaker is locked open.', cite: { page: 633, section: '12.4.5.2' }, tags: ['relaying', 'reclosing'] },
  { id: 'rc-modes', text: 'Automatic reclosing may be instantaneous or delayed, onto a dead or live line, or supervised by synchronism check.', cite: { page: 633, section: '12.4.5.2' }, tags: ['relaying', 'reclosing'] },
];

export const COORDINATION_GUIDANCE: readonly Guidance[] = [
  { id: 'co-definition', text: 'Coordination ensures that only the elements needed to clear a fault, and no more, are tripped in the shortest possible time.', cite: { page: 633, section: '12.4.6' }, tags: ['relaying', 'coordination'] },
  { id: 'co-differential', text: 'Differential schemes and differential-type line protection are inherently selective and need no coordination.', cite: { page: 633, section: '12.4.6' }, tags: ['relaying', 'coordination'] },
  { id: 'co-distance', text: 'Distance relays are the easiest to coordinate: with the instantaneous zone set 10% short of each remote end, 80% of the line is covered instantaneously; the rest relies on time-delayed Zone 2 or a pilot scheme.', cite: { page: 633, section: '12.4.6' }, tags: ['relaying', 'coordination'] },
  { id: 'co-overcurrent', text: 'Overcurrent coordination is harder and needs more detailed system data.', cite: { page: 633, section: '12.4.6' }, tags: ['relaying', 'coordination'] },
  { id: 'co-load-and-min', text: 'Relays must carry reasonable emergency overload without tripping and still operate at minimum generation for faults at the far ends of their zones; check both maximum and minimum generating conditions.', cite: { page: 634, section: '12.4.6' }, tags: ['relaying', 'coordination', 'design-check'] },
  { id: 'co-generator', text: 'Use generator subtransient reactance for maximum fault duty and transient reactance for minimum conditions.', cite: { page: 634, section: '12.4.6' }, tags: ['relaying', 'coordination'] },
  { id: 'co-ground', text: 'For ground relays on transmission systems, usually only maximum fault conditions are shown, but minimum ground faults must be checked when grounded transformers are out of service at minimum generation.', cite: { page: 635, section: '12.4.6' }, tags: ['relaying', 'coordination'] },
  { id: 'co-records', text: 'Results are recorded as "Details of Selectivity" or "Selectivity Curves", and final settings as station "Summary Sheets" for field personnel.', cite: { page: 635, section: '12.4.6' }, tags: ['relaying', 'coordination'] },
];

/** §12.4.6 (p. 634): selectivity margin between a backup (remote) relay and the near relay. */
export const COORDINATION_MARGIN = {
  /** Safety factor as a fraction of (near relay time + breaker opening time). */
  safetyFactorOfRelayPlusBreaker: 0.25,
  /** Minimum safety allowance when relays are field calibrated at the calculated setting, cycles. */
  minimumAllowanceCycles: 6,
  /** Margin when relays are only bench tested at typical values and adjusted in the field without calibration, s. */
  benchTestedMarginS: [0.2, 0.3] as const,
  cite: { page: 634, section: '12.4.6', figure: '12-17' } satisfies Citation,
} as const;

/**
 * §12.4.6 (p. 634): minimum time delay of the remote (backup) relay for selectivity =
 * near relay operating time + breaker opening time + safety margin. Margin = max(25% of (relay + breaker), 6 cycles)
 * for field-calibrated relays; for bench-tested relays the bulletin gives 0.2-0.3 s (the upper value is used unless
 * `benchMarginS` is supplied).
 */
export function requiredBackupDelayS(
  nearRelayS: number,
  breakerOpenS: number,
  fieldCalibrated: boolean,
  frequencyHz = 60,
  benchMarginS: number = COORDINATION_MARGIN.benchTestedMarginS[1],
): number {
  const base = nearRelayS + breakerOpenS;
  const margin = fieldCalibrated
    ? Math.max(COORDINATION_MARGIN.safetyFactorOfRelayPlusBreaker * base, COORDINATION_MARGIN.minimumAllowanceCycles / frequencyHz)
    : benchMarginS;
  return base + margin;
}

/** §12.4.6 (p. 634): synchronous generator fault output behaviour used in coordination studies. */
export const GENERATOR_FAULT_OUTPUT = {
  subtransientDurationCyclesMax: 3,
  subtransientOutputTimesRating: [4, 10] as const,
  transientDurationCycles: { turbineGenerators: 30, condensersAndSlowSpeedUpTo: 120 },
  transientReactancePctOfSubtransient: [125, 150] as const,
  cite: { page: 634, section: '12.4.6' } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// Appendix F: device function numbers (names as printed, from IEEE C37.2-1996)
// ---------------------------------------------------------------------------

export interface DeviceFunction {
  number: string;
  name: string;
  /** Short paraphrase of the device's role for common substation devices (our wording, not the IEEE definition). */
  role?: string;
  /** True for devices used in typical substation protection/control and named in Chapter 12 or its figures. */
  common?: boolean;
}

export const DEVICE_FUNCTION_NUMBERS: readonly DeviceFunction[] = [
  { number: '1', name: 'Master element', role: 'Hand-operated control switch that places equipment in or out of operation.' },
  { number: '2', name: 'Time-delay starting or closing relay', role: 'Adds time delay in a switching or protection sequence (other than 48, 62, 79, 82).', common: true },
  { number: '3', name: 'Checking or interlocking relay', role: 'Lets a sequence proceed only when other devices are in the right positions.', common: true },
  { number: '4', name: 'Master contactor' },
  { number: '5', name: 'Stopping device' },
  { number: '6', name: 'Starting circuit breaker' },
  { number: '7', name: 'Rate-of-change relay' },
  { number: '8', name: 'Control power disconnecting device', role: 'Switch, breaker or fuse block that connects control power to a control bus or equipment.' },
  { number: '9', name: 'Reversing device' },
  { number: '10', name: 'Unit sequence switch' },
  { number: '11', name: 'Multifunction device', role: 'One device performing three or more comparatively important functions; all of them must be defined in the drawing legend or setting record.' },
  { number: '12', name: 'Overspeed device' },
  { number: '13', name: 'Synchronous-speed device' },
  { number: '14', name: 'Underspeed device' },
  { number: '15', name: 'Speed or frequency matching device' },
  { number: '16', name: 'Reserved for future application' },
  { number: '17', name: 'Shunting or discharge switch' },
  { number: '18', name: 'Accelerating or decelerating device' },
  { number: '19', name: 'Starting-to-running transition contactor' },
  { number: '20', name: 'Electrically operated valve' },
  { number: '21', name: 'Distance relay', role: 'Operates when measured line impedance (voltage/current) falls inside its reach.', common: true },
  { number: '22', name: 'Equalizer circuit breaker' },
  { number: '23', name: 'Temperature control device' },
  { number: '24', name: 'Volts per hertz relay', role: 'Operates when the voltage-to-frequency ratio exceeds a preset value.' },
  { number: '25', name: 'Synchronizing or synchronism-check relay', role: 'Permits closing only when voltage, angle and frequency across the breaker are within limits.', common: true },
  { number: '26', name: 'Apparatus thermal device', role: 'Operates on equipment (e.g. transformer oil or winding) temperature.', common: true },
  { number: '27', name: 'Undervoltage relay', role: 'Operates when voltage falls below a set value.', common: true },
  { number: '28', name: 'Flame detector' },
  { number: '29', name: 'Isolating contactor or switch' },
  { number: '30', name: 'Annunciator relay', role: 'Non-automatically reset device giving separate visual indications when protective devices operate; may also perform lockout.', common: true },
  { number: '31', name: 'Separate excitation device' },
  { number: '32', name: 'Directional power relay', role: 'Operates on power flow above a set value in one direction.', common: true },
  { number: '33', name: 'Position switch' },
  { number: '34', name: 'Master sequence device' },
  { number: '35', name: 'Brush-operating or slip-ring short-circuiting device' },
  { number: '36', name: 'Polarity or polarizing voltage device' },
  { number: '37', name: 'Undercurrent or underpower relay' },
  { number: '38', name: 'Bearing protective device' },
  { number: '39', name: 'Mechanical condition monitor' },
  { number: '40', name: 'Field relay' },
  { number: '41', name: 'Field circuit breaker' },
  { number: '42', name: 'Running circuit breaker' },
  { number: '43', name: 'Manual transfer or selector device', role: 'Manually operated device that switches control or potential circuits to change how the associated equipment operates.', common: true },
  { number: '44', name: 'Unit sequence starting relay' },
  { number: '45', name: 'Atmospheric condition monitor' },
  { number: '46', name: 'Reverse-phase or phase-balance current relay', role: 'Negative-sequence (unbalanced) current protection.', common: true },
  { number: '47', name: 'Phase-sequence or phase-balance voltage relay', role: 'Detects wrong phase sequence or unbalanced voltage.', common: true },
  { number: '48', name: 'Incomplete sequence relay' },
  { number: '49', name: 'Machine or transformer thermal relay', role: 'Thermal overload protection of a transformer or machine.', common: true },
  { number: '50', name: 'Instantaneous overcurrent relay', role: 'Operates with no intentional delay above a current setting.', common: true },
  { number: '51', name: 'AC time overcurrent relay', role: 'Operates after a delay that decreases as current increases (inverse time) or a definite time.', common: true },
  { number: '52', name: 'AC circuit breaker', role: 'The ac circuit breaker itself (Fig 12-16 shows its 52a auxiliary contacts and trip coils 52T1/52T2).', common: true },
  { number: '53', name: 'Exciter or dc generator relay' },
  { number: '54', name: 'Turning gear engaging device' },
  { number: '55', name: 'Power factor relay' },
  { number: '56', name: 'Field application relay' },
  { number: '57', name: 'Short-circuiting or grounding device', role: 'Short-circuits or grounds a circuit, automatically or manually (a high-speed ground switch, §12.4.4.1, fits this description; that mapping is ours).', common: true },
  { number: '58', name: 'Rectification failure relay' },
  { number: '59', name: 'Overvoltage relay', role: 'Operates when voltage exceeds a set value.', common: true },
  { number: '60', name: 'Voltage or current balance relay', role: 'Operates on a set difference between the voltage or current of two circuits.', common: true },
  { number: '61', name: 'Density switch or sensor', role: 'Operates at a set density or rate of change of density.', common: true },
  { number: '62', name: 'Time-delay stopping or opening relay', role: 'Timer, e.g. the breaker-failure timer 62T or pseudo bus differential timer.', common: true },
  { number: '63', name: 'Pressure switch', role: 'Includes the transformer sudden pressure relay.', common: true },
  { number: '64', name: 'Ground detector relay', role: 'Operates on failure of machine or apparatus insulation to ground; not used for residual CT relays on grounded systems, which take suffix N or G (e.g. 51N).', common: true },
  { number: '65', name: 'Governor' },
  { number: '66', name: 'Notching or jogging device' },
  { number: '67', name: 'AC directional overcurrent relay', role: 'Overcurrent supervised by fault direction.', common: true },
  { number: '68', name: 'Blocking or "out-of-step" relay', role: 'Initiates a pilot blocking signal for external faults, or blocks tripping or reclosing on out-of-step conditions or power swings.', common: true },
  { number: '69', name: 'Permissive control device', role: 'Two-position device that either permits or prevents closing a breaker or putting equipment into operation.', common: true },
  { number: '70', name: 'Rheostat' },
  { number: '71', name: 'Level switch', role: 'Operates at a set liquid level.', common: true },
  { number: '72', name: 'DC circuit breaker' },
  { number: '73', name: 'Load-resistor contactor' },
  { number: '74', name: 'Alarm relay', role: 'Operates, or works with, a visual or audible alarm (other than an annunciator, 30).', common: true },
  { number: '75', name: 'Position changing mechanism' },
  { number: '76', name: 'DC overcurrent relay', common: true },
  { number: '77', name: 'Telemetering device' },
  { number: '78', name: 'Phase-angle measuring relay', role: 'Operates at a set phase angle, e.g. out-of-step tripping.', common: true },
  { number: '79', name: 'Reclosing relay', role: 'Controls automatic reclosing of a breaker.', common: true },
  { number: '80', name: 'Flow switch' },
  { number: '81', name: 'Frequency relay', role: 'Responds to frequency above or below a set value.', common: true },
  { number: '82', name: 'DC load-measuring reclosing relay' },
  { number: '83', name: 'Automatic selective control or transfer relay', role: 'Automatically selects between sources or conditions, or performs an automatic transfer.', common: true },
  { number: '84', name: 'Operating mechanism', role: 'Complete operating mechanism of a tap changer, induction regulator or similar apparatus with no other number.', common: true },
  { number: '85', name: 'Carrier or pilot-wire relay', role: 'Communication (pilot) channel receiver/transmitter function in pilot schemes.', common: true },
  { number: '86', name: 'Lockout relay', role: 'Trips and holds the associated equipment inoperative until an operator resets it, locally or remotely.', common: true },
  { number: '87', name: 'Differential protective relay', role: 'Operates on the difference between currents entering and leaving the protected zone.', common: true },
  { number: '88', name: 'Auxiliary motor or motor generator' },
  { number: '89', name: 'Line switch', role: 'Disconnecting, load-interrupter or isolating switch in an ac or dc power circuit (number normally needed only if electrically operated or fitted with electrical accessories).', common: true },
  { number: '90', name: 'Regulating device', role: 'Regulates voltage, current, etc. (e.g. voltage regulator control).', common: true },
  { number: '91', name: 'Voltage directional relay' },
  { number: '92', name: 'Voltage and power directional relay' },
  { number: '93', name: 'Field-changing contactor' },
  { number: '94', name: 'Tripping or trip-free relay', role: 'Trips a breaker or prevents immediate reclosing (trip-free).', common: true },
  { number: '95-99', name: 'Used for specific installations when no function 1-94 is suitable' },
];

export const DEVICE_FUNCTION_NUMBERS_CITE: Citation = {
  page: [637, 645],
  originalSource: C37_2,
  note: 'Appendix F reprints the IEEE definitions with permission; names are kept, definitions paraphrased in `role`. The appendix header cites "IEEE Std. 37.2-1996".',
};

export interface SuffixLetter {
  letter: string;
  meaning: string;
}

/** Appendix G (pp. 646-649): suggested suffix letters, by category, as printed. */
export const SUFFIX_LETTERS: Readonly<Record<'auxiliaryDevices' | 'actuatingQuantities' | 'mainDevice' | 'mainDeviceParts' | 'other', readonly SuffixLetter[]>> = {
  auxiliaryDevices: [
    { letter: 'C', meaning: 'Closing relay/contactor' },
    { letter: 'CL', meaning: 'Auxiliary relay, close (energized when main device is closed)' },
    { letter: 'CS', meaning: 'Control switch' },
    { letter: 'D', meaning: '"Down" position switch relay' },
    { letter: 'L', meaning: 'Lowering relay' },
    { letter: 'O', meaning: 'Opening relay/contactor' },
    { letter: 'OP', meaning: 'Auxiliary relay, open (energized when main device is open)' },
    { letter: 'PB', meaning: 'Push button' },
    { letter: 'R', meaning: 'Raising relay' },
    { letter: 'U', meaning: '"Up" position switch relay' },
    { letter: 'X', meaning: 'Auxiliary relay' },
    { letter: 'Y', meaning: 'Auxiliary relay' },
    { letter: 'Z', meaning: 'Auxiliary relay' },
  ],
  actuatingQuantities: [
    { letter: 'A', meaning: 'Air/amperes/alternating' },
    { letter: 'C', meaning: 'Current' },
    { letter: 'D', meaning: 'Direct/discharge' },
    { letter: 'E', meaning: 'Electrolyte' },
    { letter: 'F', meaning: 'Frequency/flow/fault' },
    { letter: 'GP', meaning: 'Gas pressure' },
    { letter: 'H', meaning: 'Explosive/harmonics' },
    { letter: 'I0', meaning: 'Zero sequence current' },
    { letter: 'I-, I2', meaning: 'Negative sequence current' },
    { letter: 'I+, I1', meaning: 'Positive sequence current' },
    { letter: 'J', meaning: 'Differential' },
    { letter: 'L', meaning: 'Level/liquid' },
    { letter: 'P', meaning: 'Power/pressure' },
    { letter: 'PF', meaning: 'Power factor' },
    { letter: 'O', meaning: 'Oil' },
    { letter: 'S', meaning: 'Speed/suction/smoke' },
    { letter: 'T', meaning: 'Temperature' },
    { letter: 'V', meaning: 'Voltage/volts/vacuum' },
    { letter: 'VAR', meaning: 'Reactive power' },
    { letter: 'VB', meaning: 'Vibration' },
    { letter: 'W', meaning: 'Water/watts' },
  ],
  mainDevice: [
    { letter: 'A', meaning: 'Alarm/auxiliary power' },
    { letter: 'AC', meaning: 'Alternating current' },
    { letter: 'AN', meaning: 'Anode' },
    { letter: 'B', meaning: 'Battery/blower/bus' },
    { letter: 'BK', meaning: 'Brake' },
    { letter: 'BL', meaning: 'Block (valve)' },
    { letter: 'BP', meaning: 'Bypass' },
    { letter: 'BT', meaning: 'Bus tie' },
    { letter: 'C', meaning: 'Capacitor/condenser/compensator/carrier current/case/compressor' },
    { letter: 'CA', meaning: 'Cathode' },
    { letter: 'CH', meaning: 'Check (valve)' },
    { letter: 'D', meaning: 'Discharge (valve)' },
    { letter: 'DC', meaning: 'Direct current' },
    { letter: 'E', meaning: 'Exciter' },
    { letter: 'F', meaning: 'Feeder/field/filament/filter/fan' },
    { letter: 'G', meaning: 'Generator/ground (G preferred when the measured quantity is in the path to ground)' },
    { letter: 'H', meaning: 'Heater/housing' },
    { letter: 'L', meaning: 'Line/logic' },
    { letter: 'M', meaning: 'Motor/metering' },
    { letter: 'MOC', meaning: 'Mechanism operated contact (breaker auxiliary switch on the stationary housing of a removable breaker)' },
    { letter: 'N', meaning: 'Network/neutral (N preferred for residual connections, broken-delta connections or internally derived residual quantities)' },
    { letter: 'P', meaning: 'Pump/phase comparison' },
    { letter: 'R', meaning: 'Reactor/rectifier/room' },
    { letter: 'S', meaning: 'Synchronizing/secondary/strainer/sump/suction (valve)' },
    { letter: 'T', meaning: 'Transformer/thyratron' },
    { letter: 'TH', meaning: 'Transformer (high-voltage side)' },
    { letter: 'TL', meaning: 'Transformer (low-voltage side)' },
    { letter: 'TM', meaning: 'Telemeter' },
    { letter: 'TOC', meaning: 'Truck-operated contacts (on the stationary housing of a removable breaker)' },
    { letter: 'TT', meaning: 'Transformer (tertiary-voltage side)' },
    { letter: 'U', meaning: 'Unit' },
  ],
  mainDeviceParts: [
    { letter: 'BK', meaning: 'Brake' },
    { letter: 'C', meaning: 'Coil/condenser/capacitor' },
    { letter: 'CC', meaning: 'Closing coil/closing contactor' },
    { letter: 'HC', meaning: 'Holding coil' },
    { letter: 'M', meaning: 'Operating motor' },
    { letter: 'MF', meaning: 'Fly-ball motor' },
    { letter: 'ML', meaning: 'Load-limit motor' },
    { letter: 'MS', meaning: 'Speed adjusting or synchronizing motor' },
    { letter: 'OC', meaning: 'Opening contactor' },
    { letter: 'S', meaning: 'Solenoid' },
    { letter: 'SI', meaning: 'Seal-in' },
    { letter: 'T', meaning: 'Target' },
    { letter: 'TC', meaning: 'Trip coil' },
    { letter: 'V', meaning: 'Valve' },
  ],
  other: [
    { letter: 'A', meaning: 'Accelerating/automatic' },
    { letter: 'B', meaning: 'Blocking/backup' },
    { letter: 'BF', meaning: 'Breaker failure' },
    { letter: 'C', meaning: 'Close/cold' },
    { letter: 'D', meaning: 'Decelerating/detonate/down/disengaged' },
    { letter: 'E', meaning: 'Emergency/engaged' },
    { letter: 'F', meaning: 'Failure/forward' },
    { letter: 'GP', meaning: 'General purpose' },
    { letter: 'H', meaning: 'Hot/high' },
    { letter: 'HIZ', meaning: 'High impedance fault' },
    { letter: 'HR', meaning: 'Hand reset' },
    { letter: 'HS', meaning: 'High speed' },
    { letter: 'L', meaning: 'Left/local/low/lower/leading' },
    { letter: 'M', meaning: 'Manual' },
    { letter: 'O', meaning: 'Open/over' },
    { letter: 'OFF', meaning: 'Off' },
    { letter: 'ON', meaning: 'On' },
    { letter: 'P', meaning: 'Polarizing' },
    { letter: 'R', meaning: 'Right/raise/reclosing/receiving/remote/reverse' },
    { letter: 'S', meaning: 'Sending/swing' },
    { letter: 'SHS', meaning: 'Semi-high speed' },
    { letter: 'T', meaning: 'Test/trip/trailing' },
    { letter: 'TDC', meaning: 'Time-delay closing contact' },
    { letter: 'TDDO', meaning: 'Time delayed relay coil drop-out' },
    { letter: 'TDO', meaning: 'Time-delay opening contact' },
    { letter: 'TDPU', meaning: 'Time delayed relay coil pickup' },
    { letter: 'THD', meaning: 'Total harmonic distortion' },
    { letter: 'U', meaning: 'Up/under' },
  ],
};

export const SUFFIX_LETTERS_CITE: Citation = {
  page: [646, 649],
  originalSource: C37_2,
  note: 'X-Y breaker control: X energizes the closing coil (or releases stored energy); Y provides anti-pump. Suffixes used in Chapter 12 figures include H, L, N, BF, T, X, Y, P (e.g. 50H, 51N, 86BF, 62T, 62X, 21P).',
};

/** Look up a device number's name, e.g. deviceName('86') → 'Lockout relay'. */
export function deviceName(num: string): string | undefined {
  const n = Number(num);
  if (n >= 95 && n <= 99) return DEVICE_FUNCTION_NUMBERS.find((d) => d.number === '95-99')?.name;
  return DEVICE_FUNCTION_NUMBERS.find((d) => d.number === num)?.name;
}

/**
 * Split a designation like "50H", "51N", "86BF", "62X" or "50-M" into its device number and suffix, and describe
 * them with Appendix F/G names (suffix meanings can be ambiguous across categories; all candidates are returned).
 */
export function describeDesignation(designation: string): { number: string; name?: string; suffix: string; suffixMeanings: string[] } {
  const m = /^(\d{1,2})\s*-?\s*([A-Z0-9+-]*)$/i.exec(designation.trim());
  if (!m) return { number: '', suffix: designation, suffixMeanings: [] };
  const number = m[1];
  const suffix = m[2].toUpperCase();
  const meanings: string[] = [];
  if (suffix) {
    for (const [cat, list] of Object.entries(SUFFIX_LETTERS)) {
      for (const s of list) if (s.letter === suffix) meanings.push(`${s.meaning} (${cat})`);
    }
  }
  return { number, name: deviceName(number), suffix, suffixMeanings: meanings };
}

/** No worked numeric relaying example exists in Chapter 12; FEEDER_COORDINATION_EXAMPLE is the qualitative one. */
export const RELAYING_EXAMPLE = null;
