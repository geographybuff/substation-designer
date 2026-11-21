/**
 * Mobile transformer and mobile substation provisions from RUS Bulletin 1724E-300 §4.13
 * (pp. 184-186) and §5.12 (pp. 409-412), plus the related remarks in §4.3.1 (p. 122) and §5.2.2
 * (p. 192). Mostly paraphrased guidance, with the few numbers the bulletin gives.
 */
import type { Guidance, Sourced } from './types';

export const MOBILE_NUMBERS: Sourced<{
  /** Minimum independent connections between trailer and ground system. */
  minGroundConnections: number;
  /** Mobile-unit transformer impedance on the forced-cooled base may be as high as this range, percent. */
  typicalImpedancePct: readonly [number, number];
  /** Paralleled transformer impedances should differ by no more than this percent (relative). */
  maxParallelImpedanceDifferencePct: number;
  /** Mobile substations conveniently provide only this many distribution circuits without an auxiliary switching structure. */
  maxDistributionCircuits: number;
  /** Cable connections at and above this voltage are especially costly, favoring short bare jumpers, kV. */
  costlyCableFromKV: number;
}> = {
  value: {
    minGroundConnections: 2,
    typicalImpedancePct: [12, 15],
    maxParallelImpedanceDifferencePct: 7.5,
    maxDistributionCircuits: 2,
    costlyCableFromKV: 69,
  },
  cite: {
    page: [186, 411],
    section: '4.13.5, 5.12.3, 5.12.5.1, 5.12.5.3',
    note: 'Parallel example (p. 410): 7 % nameplate -> allowed 6.475 % to 7.525 %. Distribution circuits: "only one or two".',
  },
};

/** Aspects to consider when applying mobile transformers or substations (§4.13 list). */
export const MOBILE_APPLICATION_ASPECTS: Sourced<readonly string[]> = {
  value: [
    'Size and maneuverability of the equipment',
    'Installation location and provisions',
    'Electrical clearances',
    'Primary and secondary connections',
    'Grounding',
    'Auxiliary system requirements',
    'Safety',
  ],
  cite: { page: [184, 185], section: '4.13' },
};

export const MOBILE_GUIDANCE: readonly Guidance[] = [
  // --- Why and when
  {
    id: 'mob-uses',
    text: 'Mobile transformers and substations give temporary service during maintenance, construction, emergencies or peak-load periods, and enough of them can reduce or eliminate on-site spare transformers.',
    cite: { page: [184, 409], section: '4.13, 5.12' },
    tags: ['mobile', 'reliability', 'spare'],
  },
  {
    id: 'mob-three-phase-backup',
    text: 'Because losing a three-phase transformer means losing the substation, lay the station out so a mobile transformer or mobile substation can be installed quickly.',
    cite: { page: [122, 192], section: '4.3.1, 5.2.2' },
    tags: ['mobile', 'layout', 'transformer', 'design-check'],
  },
  {
    id: 'mob-feasibility',
    text: 'Buy a mobile unit only if an economic study shows it is cheaper than alternatives of comparable reliability, such as individual spares or looped feeders.',
    cite: { page: 409, section: '5.12.1' },
    tags: ['mobile', 'cost'],
  },
  {
    id: 'mob-flexibility-limit',
    text: 'One unit can only cover so many kVA and voltage combinations; systems with very varied substations may need two or more mobile units.',
    cite: { page: 409, section: '5.12.1' },
    tags: ['mobile', 'selection'],
  },
  {
    id: 'mob-highway-limits',
    text: 'Highway size and weight limits, which vary by state, usually force the transformer kVA to be limited; coordinate early with the state highway authorities.',
    cite: { page: 409, section: '5.12.1' },
    tags: ['mobile', 'transport'],
  },
  {
    id: 'mob-savings-condition',
    text: 'Relying on a mobile spare instead of a fourth single-phase transformer at each station saves money only if several substations have about the same kVA and compatible voltages.',
    cite: { page: 410, section: '5.12.2' },
    tags: ['mobile', 'cost', 'transformer'],
  },
  {
    id: 'mob-substation-scope',
    text: 'A mobile substation can carry switches, arresters, fuses, reclosers or breakers, regulation, instrument transformers, relays and controls, so it can replace a whole substation or serve a new site temporarily.',
    cite: { page: 410, section: '5.12.3' },
    tags: ['mobile'],
  },
  {
    id: 'mob-circuits',
    text: 'A mobile substation usually provides only one or two distribution circuits unless an auxiliary switching structure or second trailer is added.',
    cite: { page: 410, section: '5.12.3' },
    tags: ['mobile', 'feeders'],
  },
  // --- Site provisions
  {
    id: 'mob-space-access',
    text: 'Make sure every intended location has room to position and connect the unit, and check substation entrances and access roads in advance.',
    cite: { page: 185, section: '4.13.1' },
    tags: ['mobile', 'access', 'layout', 'design-check'],
  },
  {
    id: 'mob-location-short-connections',
    text: 'Locate the mobile so primary and secondary connections to the permanent equipment are as short as possible and can be made quickly and safely without disturbing nearby equipment.',
    cite: { page: 185, section: '4.13.2' },
    tags: ['mobile', 'layout', 'connections'],
  },
  {
    id: 'mob-provisions',
    text: 'Stations designated for mobile service should have connection provisions: terminals on equipment or buses, and possibly bus extensions or disconnect switches, especially if connections are made energized.',
    cite: { page: 185, section: '4.13.2' },
    tags: ['mobile', 'layout', 'switch'],
  },
  {
    id: 'mob-lv-cabinet',
    text: 'Where low-voltage ac or dc and alarm connections are needed, a permanent weatherproof cabinet near the mobile position can hold terminal blocks, switches and protective devices.',
    cite: { page: 185, section: '4.13.2' },
    tags: ['mobile', 'auxiliary-power', 'alarms'],
  },
  {
    id: 'mob-clearances',
    text: 'Use bare conductors at a mobile location only if Table 4-7 and 4-8 minimum clearances can be held; otherwise insulated conductors may be used.',
    cite: { page: 185, section: '4.13.3' },
    tags: ['mobile', 'clearance', 'design-check'],
  },
  {
    id: 'mob-connections',
    text: 'Keep connections short and bolted, preferably bare; size them for maximum load and expected fault current and check their length before connecting either end.',
    cite: { page: [185, 186], section: '4.13.4' },
    tags: ['mobile', 'connections'],
  },
  {
    id: 'mob-store-hardware',
    text: 'Temporary poles or structures may be needed; store such non-mobile equipment at the substation in advance.',
    cite: { page: [186, 411], section: '4.13.4, 5.12.5.3' },
    tags: ['mobile', 'connections'],
  },
  {
    id: 'mob-cable',
    text: 'Shielded cable with stress cones or potheads can be used for long or exposed connections, but at 69 kV and above cable is costly, so keep primary connections short enough for bare vertical jumpers.',
    cite: { page: 411, section: '5.12.5.3' },
    tags: ['mobile', 'connections', 'cable'],
  },
  // --- Grounding
  {
    id: 'mob-grounding',
    text: 'Make at least two independent connections between the trailer and the ground system; tie to the substation grid when close, or build a separate ground system when far away.',
    cite: { page: [185, 186], section: '4.13.2, 4.13.5' },
    tags: ['mobile', 'grounding', 'safety', 'design-check'],
  },
  {
    id: 'mob-ground-provisions',
    text: 'Grounding provisions can be terminals or ground rods connected to the main grid.',
    cite: { page: 185, section: '4.13.2' },
    tags: ['mobile', 'grounding'],
  },
  // --- Auxiliary systems and cooling
  {
    id: 'mob-aux-supply',
    text: 'Mobile units are usually forced-cooled; if they lack on-board supply transformers, check that station service voltage and capacity suit the fans and pumps, and that the station battery suits any dc needs.',
    cite: { page: [186, 411], section: '4.13.6, 5.12.5.2' },
    tags: ['mobile', 'auxiliary-power', 'cooling', 'design-check'],
  },
  {
    id: 'mob-cooling-features',
    text: 'Specify valves between heat exchanger and tank, a flow relay to alarm or trip on lost oil circulation, individual disconnects for fan and pump motors, and welded or flanged (not threaded) oil piping.',
    cite: { page: 411, section: '5.12.5.2.1-5.12.5.2.3' },
    tags: ['mobile', 'cooling', 'specification'],
  },
  {
    id: 'mob-no-cooling-no-load',
    text: 'If oil circulation or cooling is lost, a mobile unit has no load-carrying ability and can stay energized without load for only a few hours before overheating.',
    cite: { page: 411, section: '5.12.5.2.2' },
    tags: ['mobile', 'cooling', 'reliability'],
  },
  {
    id: 'mob-phase-rotation',
    text: 'Three-phase units need phase-rotation indicators or relays so feeders get the same rotation as from the permanent station, plus protection and reversing switches for fan and pump motors.',
    cite: { page: 410, section: '5.12.4' },
    tags: ['mobile', 'phasing', 'protection'],
  },
  // --- Electrical characteristics
  {
    id: 'mob-high-impedance',
    text: 'Mobile transformers have higher impedance (sometimes 12-15 % on the forced-cooled base), so continuous paralleling with a ground-mounted unit is usually impractical and voltage drop is larger.',
    cite: { page: 410, section: '5.12.5.1' },
    tags: ['mobile', 'impedance', 'parallel', 'regulator'],
  },
  {
    id: 'mob-temporary-parallel',
    text: 'Paralleling a mobile with the ground-mounted unit temporarily is acceptable, but check equipment ratings against the higher short-circuit level.',
    cite: { page: 410, section: '5.12.5.1' },
    tags: ['mobile', 'parallel', 'fault'],
  },
  {
    id: 'mob-arresters',
    text: 'Mount high- and low-voltage surge arresters on the mobile transformer or trailer, since in use it may be too far from the station arresters to be protected.',
    cite: { page: 409, section: '5.12.2' },
    tags: ['mobile', 'arrester', 'design-check'],
  },
  {
    id: 'mob-tradeoffs',
    text: 'A mobile can be treated partly as an expendable tool: reduced insulation, higher temperature ratings, higher impedance, heavier overloading and reduced clearances are acceptable trade-offs, but never minimum safety.',
    cite: { page: [411, 412], section: '5.12.5.5' },
    tags: ['mobile', 'safety'],
  },
  {
    id: 'mob-protection',
    text: 'Because the unit is expensive and hurried temporary installations raise fault risk, give it better-than-normal protection.',
    cite: { page: 412, section: '5.12.5.6' },
    tags: ['mobile', 'protection'],
  },
  {
    id: 'mob-alarms',
    text: 'Temporarily connect the mobile\'s alarms to the substation alarm bus: hot oil, low oil, high combustible gas, breaker lockout, security gate open, and similar.',
    cite: { page: 411, section: '5.12.5.4' },
    tags: ['mobile', 'alarms'],
  },
  // --- Safety
  {
    id: 'mob-always-live',
    text: 'Treat a mobile unit in its operating position as live and dangerous; ground the trailer and neutrals carefully and fit barriers around and under live parts, with interlocks to block energizing if barriers are missing.',
    cite: { page: 411, section: '5.12.5.5' },
    tags: ['mobile', 'safety', 'grounding'],
  },
  {
    id: 'mob-fence',
    text: 'Unless the mobile sits inside the substation fence or another fenced area, surround it with its own fence of equal security and lockable gates.',
    cite: { page: [186, 411], section: '4.13.7, 5.12.5.5' },
    tags: ['mobile', 'fence', 'safety', 'design-check'],
  },
  {
    id: 'mob-assembly',
    text: 'Assemble the unit (barriers, supports, removal of transit bracing) strictly per the manufacturer, on a level site, blocked against movement, with slope within the manufacturer\'s limit.',
    cite: { page: 186, section: '4.13.7' },
    tags: ['mobile', 'site', 'safety'],
  },
  {
    id: 'mob-accessories',
    text: 'Carry needed accessories on the trailer (power and ground cables and connectors, supply transformers, batteries, heaters, lights, outlets, spare fuses, fencing, special tools) unless they are already available at the sites.',
    cite: { page: 412, section: '5.12.6' },
    tags: ['mobile', 'specification'],
  },
];
