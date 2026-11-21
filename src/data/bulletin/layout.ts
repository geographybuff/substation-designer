/**
 * Physical layout data from RUS Bulletin 1724E-300 §4.2-4.6 (pp. 119-141), excluding Table 4-1
 * (switching-scheme cost comparison, extracted separately by the lead).
 *
 * Covers: layout considerations (initial parameters, scheme selection, expansion, profile,
 * underground exits, equipment removal / Fig. 4-1), distribution substations (Figs. 4-2..4-5),
 * transmission substations (Figs. 4-6, 4-7: bypass, arresters, carrier, VTs, CTs, grounding
 * switches), switching stations (Fig. 4-8), and the six typical bus configurations (Figs. 4-9..4-16)
 * with paraphrased advantages/disadvantages and their behaviour for bus faults, breaker failures
 * and breaker maintenance. Figure descriptions are written from the page images.
 */
import type { Citation, Guidance, Sourced } from './types';

// ---------------------------------------------------------------------------
// Machine-readable layout rules
// ---------------------------------------------------------------------------

export const LAYOUT_RULES = {
  /** Distribution substations: primary voltage usually up to this value, kV. */
  distributionMaxPrimaryKV: { value: 230, cite: { page: 121, section: '4.3' } } satisfies Sourced<number>,
  /** Transmission substations: primary and secondary voltages usually this value or higher, kV. */
  transmissionMinKV: { value: 69, cite: { page: 125, section: '4.4' } } satisfies Sourced<number>,
  /** The typical bus configurations apply up to this voltage, kV. */
  busConfigurationsMaxKV: { value: 345, cite: { page: 128, section: '4.6' } } satisfies Sourced<number>,
  /** In multi-bay low-profile layouts, bays are commonly grouped at most two wide before the bay spacing is increased for equipment removal. */
  maxBaysBeforeWiderSpacing: {
    value: 2,
    cite: { page: [120, 133], section: '4.2.6, 4.6.3', figure: '4-1' },
  } satisfies Sourced<number>,
  /** Leave at least this many ends of every major bus open for expansion (preferably both). */
  minOpenBusEnds: { value: 1, cite: { page: 120, section: '4.2.3', note: 'Preferably both ends.' } } satisfies Sourced<number>,
  /** Ring bus: four positions is a practical maximum; six is usually considered the limit (rings up to 10 positions exist). */
  ringBusPracticalMaxPositions: { value: 4, cite: { page: 136, section: '4.6.4' } } satisfies Sourced<number>,
  ringBusUsualLimitPositions: { value: 6, cite: { page: 136, section: '4.6.4.2' } } satisfies Sourced<number>,
} as const;

// ---------------------------------------------------------------------------
// §4.2 Layout considerations
// ---------------------------------------------------------------------------

export const LAYOUT_GUIDANCE: readonly Guidance[] = [
  {
    id: 'lay-initial-parameters',
    text: 'Before detailed design, settle circuit quantities, configurations and ratings, relay schemes, any special equipment (capacitors, current-limiting reactors, neutral grounding), surge protection and direct-stroke protection.',
    cite: { page: 119, section: '4.2.1' },
    tags: ['layout', 'planning'],
  },
  {
    id: 'lay-scheme-selection',
    text: 'Choose the switching scheme with the whole system in view; a simple scheme now with a planned conversion to a more elaborate one later is often economical as circuits are added.',
    cite: { page: 119, section: '4.2.2' },
    tags: ['layout', 'bus-scheme', 'expansion'],
  },
  {
    id: 'lay-flexibility-cost',
    text: 'Flexibility and reliability rise with cost, so the final configuration is a compromise; large stations handling much power need high degrees of both.',
    cite: { page: 119, section: '4.2.2' },
    tags: ['layout', 'bus-scheme', 'reliability', 'cost'],
  },
  {
    id: 'lay-expansion-forecast',
    text: 'Arrange the initial design to accommodate the current long-range forecast and buy as large a site as practical, since a substation usually stays in service indefinitely.',
    cite: { page: 119, section: '4.2.3' },
    tags: ['layout', 'expansion', 'site'],
  },
  {
    id: 'lay-open-bus-ends',
    text: 'Leave at least one, and preferably both, ends of every major bus open for future extension.',
    cite: { page: 120, section: '4.2.3' },
    tags: ['layout', 'expansion', 'bus', 'design-check'],
  },
  {
    id: 'lay-preinstall',
    text: 'Extra switches, switch stands and bus supports are often installed initially to make later expansion easier.',
    cite: { page: 120, section: '4.2.3' },
    tags: ['layout', 'expansion'],
  },
  {
    id: 'lay-low-profile',
    text: 'Most new substations use low-profile structures and rigid bus; this may need a larger area, but easier operation and maintenance usually pay for the extra land.',
    cite: { page: 120, section: '4.2.4' },
    tags: ['layout', 'profile', 'rigid-bus'],
  },
  {
    id: 'lay-underground-exits',
    text: 'Running circuits underground as they leave the station improves appearance and can shrink or eliminate large supporting structures.',
    cite: { page: 120, section: '4.2.5' },
    tags: ['layout', 'appearance', 'underground'],
  },
  {
    id: 'lay-equipment-removal',
    text: 'Leave room and a clear route to install and remove large equipment such as transformers and breakers; low buses can block removal even at safe operating heights.',
    cite: { page: 120, section: '4.2.6' },
    tags: ['layout', 'equipment-removal', 'design-check'],
  },
  {
    id: 'lay-main-bus-high',
    text: 'Placing main buses higher than the bay buses and equipment keeps them from blocking removal of interior equipment.',
    cite: { page: 120, section: '4.2.6' },
    tags: ['layout', 'equipment-removal', 'bus'],
  },
  {
    id: 'lay-removable-bus',
    text: 'Removable bus sections can open a path for moving large equipment, but the bus must be de-energized to use them.',
    cite: { page: 120, section: '4.2.6' },
    tags: ['layout', 'equipment-removal', 'bus'],
  },
  {
    id: 'lay-bay-pairs',
    text: 'In multi-bay layouts, group bays in pairs and widen the spacing after every two bays so equipment can be moved out sideways (Fig. 4-1).',
    cite: { page: [120, 121], section: '4.2.6', figure: '4-1' },
    tags: ['layout', 'equipment-removal', 'bay-spacing', 'design-check'],
  },
];

export const FIG_4_1_EQUIPMENT_REMOVAL: Sourced<string> = {
  value:
    'Plan view of six parallel bays arranged as three pairs (bays 1-2, 3-4, 5-6) with extra space between pairs; arrows show equipment from each bay being moved sideways into the gap and out.',
  cite: { page: 121, section: '4.2.6', figure: '4-1' },
};

// ---------------------------------------------------------------------------
// §4.3 Distribution substations
// ---------------------------------------------------------------------------

export const DISTRIBUTION_SUBSTATION: Sourced<{ oneLine: string; notes: readonly string[] }> = {
  value: {
    oneLine:
      'Fig. 4-2: subtransmission line -> primary disconnect switch -> transformer -> low-voltage bus; two feeder positions, each disconnect -> breaker or recloser -> disconnect -> distribution circuit.',
    notes: [
      'Initial construction may have only one distribution circuit.',
      'The primary disconnect (usually three-pole, single-throw, group-operated) isolates the station from the subtransmission system.',
      'Transformers are two-winding, single- or three-phase; the trend is to three-phase units. With single-phase units a fourth may be added as a spare.',
      'Losing a three-phase transformer means losing the substation, so the layout should allow quick installation of a mobile transformer or mobile substation.',
      'Feeders are protected by breakers or reclosers with disconnects on both sides; switches may be single-pole hook stick or three-pole group-operated.',
    ],
  },
  cite: { page: [121, 122], section: '4.3, 4.3.1', figure: '4-2' },
};

export const DISTRIBUTION_GUIDANCE: readonly Guidance[] = [
  {
    id: 'dist-primary-protection',
    text: 'Provide a protective device on the transformer primary - power fuses, a circuit breaker, a circuit switcher or a vacuum interrupter, chosen by voltage, fault level and transformer size; it can double as the primary disconnect.',
    cite: { page: 122, section: '4.3.2' },
    tags: ['distribution', 'transformer', 'protection', 'fuse', 'design-check'],
  },
  {
    id: 'dist-bus-vs-feeder-regulation',
    text: 'Rural distribution stations usually need voltage regulation: feeder regulation when feeders have very different load characteristics, bus regulation (LTC, regulators or switched capacitors) when they are similar.',
    cite: { page: 122, section: '4.3.3', figure: '4-3' },
    tags: ['distribution', 'regulator', 'LTC', 'capacitor'],
  },
  {
    id: 'dist-regulator-bypass',
    text: 'Provide regulator bypass facilities so regulators can be maintained without de-energizing the feeder or bus (Fig. 4-3).',
    cite: { page: 123, section: '4.3.3', figure: '4-3' },
    tags: ['distribution', 'regulator', 'bypass', 'design-check'],
  },
  {
    id: 'dist-breaker-bypass',
    text: 'Breaker or recloser bypass facilities allow maintenance without de-energizing the circuit; they are usually three independent hook stick switches or one three-pole group-operated switch (Fig. 4-4).',
    cite: { page: 123, section: '4.3.4', figure: '4-4' },
    tags: ['distribution', 'breaker', 'recloser', 'bypass', 'design-check'],
  },
  {
    id: 'dist-tandem-switch',
    text: 'A tandem switch combines the bypass switch and the load-side disconnect on one base, fitting in about the space of one single-pole disconnect (Fig. 4-5).',
    cite: { page: 123, section: '4.3.4', figure: '4-5' },
    tags: ['distribution', 'bypass', 'switch'],
  },
  {
    id: 'dist-fused-bypass',
    text: 'Replacing the bypass switch with a fuse keeps the circuit protected while its breaker or recloser is bypassed.',
    cite: { page: 123, section: '4.3.4' },
    tags: ['distribution', 'bypass', 'fuse', 'protection'],
  },
  {
    id: 'dist-arrester-close',
    text: 'Install surge arresters as close as practical to the transformers, regulators and other equipment they protect (on transformer brackets, separate stands or nearby structures; on regulator tanks).',
    cite: { page: 124, section: '4.3.5' },
    tags: ['distribution', 'arrester', 'design-check'],
  },
  {
    id: 'dist-arrester-fuse-side',
    text: 'When a transformer is fused, connect its arresters on the line side of the fuses, close to the transformer, to spare the fuse from arrester discharge current.',
    cite: { page: 124, section: '4.3.5' },
    tags: ['distribution', 'arrester', 'fuse', 'design-check'],
  },
  {
    id: 'dist-enclosed',
    text: 'Where space is tight, consider metal-enclosed switchgear or a unit substation (switchgear joined to a transformer); feeders then usually leave underground.',
    cite: { page: [124, 125], section: '4.3.6' },
    tags: ['distribution', 'switchgear', 'layout'],
  },
];

export const BYPASS_FIGURES: Sourced<readonly { figure: string; page: number; description: string }[]> = {
  value: [
    {
      figure: '4-3',
      page: 123,
      description:
        'Bus regulation: one regulator set in the transformer secondary lead with a bypass switch and source/load disconnects, ahead of the feeder breakers. Feeder regulation: a regulator after each feeder breaker, each with its own bypass and disconnects.',
    },
    {
      figure: '4-4',
      page: 124,
      description: 'Each feeder runs bus -> disconnect -> breaker/recloser -> disconnect, with a bypass switch connected from the bus side around all three to the feeder side.',
    },
    {
      figure: '4-5',
      page: 124,
      description: 'Tandem switch: the bypass switch and the load-side disconnect share one base, so the bypass and the breaker loop take little more space than one disconnect.',
    },
    {
      figure: '4-7',
      page: 126,
      description: 'Transmission breaker bypass: a group-operated switch bridges from the line side to the transformer side around disconnect -> breaker -> disconnect.',
    },
  ],
  cite: { page: [123, 126], section: '4.3.3, 4.3.4, 4.4.2' },
};

// ---------------------------------------------------------------------------
// §4.4 Transmission substations, §4.5 Switching stations
// ---------------------------------------------------------------------------

export const TRANSMISSION_SUBSTATION: Sourced<{ oneLine: string; notes: readonly string[] }> = {
  value: {
    oneLine:
      'Fig. 4-6: two transmission lines, each line -> disconnect -> breaker -> disconnect -> transformer -> low-voltage disconnect -> common secondary bus; two subtransmission feeders leave the bus through disconnect -> breaker -> disconnect.',
    notes: [
      'One transmission station may feed several distribution stations and large loads, so reliability and operating flexibility are extremely important; equipment can normally be maintained without interrupting circuits.',
      'Initial construction may be one transformer and one subtransmission circuit.',
      'Breakers in the transmission circuits help prevent a complete shutdown for line faults.',
      'Transformers are commonly three-phase autotransformers, usually with tertiaries; two-winding units are used where the primary-secondary phase relationship must be kept.',
      'Low-voltage transformer disconnects let one transformer be de-energized while the other serves both feeders.',
    ],
  },
  cite: { page: [125, 126], section: '4.4, 4.4.1', figure: '4-6' },
};

export const TRANSMISSION_GUIDANCE: readonly Guidance[] = [
  {
    id: 'trans-bypass',
    text: 'Transmission breaker bypass normally uses three independent three-pole group-operated switches (Fig. 4-7).',
    cite: { page: 126, section: '4.4.2', figure: '4-7' },
    tags: ['transmission', 'bypass', 'breaker'],
  },
  {
    id: 'trans-bypass-protection',
    text: 'Bypassing a breaker usually also removes its CTs and therefore the normal relaying, so the protection scheme must cover that case; fused bypass switches can give temporary feeder protection.',
    cite: { page: 126, section: '4.4.2' },
    tags: ['transmission', 'bypass', 'protection', 'design-check'],
  },
  {
    id: 'trans-arresters-transformer',
    text: 'Transmission transformers normally get arresters on every phase of primary and secondary, and on each ungrounded phase of a tertiary brought out for service, mounted close to the bushings.',
    cite: { page: 126, section: '4.4.3' },
    tags: ['transmission', 'arrester', 'transformer', 'design-check'],
  },
  {
    id: 'trans-arresters-line-entrance',
    text: 'Arresters at line entrances belong on the line side of the equipment they protect; on the line side of a breaker they also protect its open gap.',
    cite: { page: 126, section: '4.4.3' },
    tags: ['transmission', 'arrester', 'breaker'],
  },
  {
    id: 'trans-carrier',
    text: 'Line traps and coupling-capacitor voltage transformers for carrier relaying or communications usually sit on separate stands near the line entrance; the relaying scheme sets how many phases need them.',
    cite: { page: 127, section: '4.4.4' },
    tags: ['transmission', 'carrier', 'line-trap', 'CCVT', 'layout'],
  },
  {
    id: 'trans-vts',
    text: 'VTs (for protection, synchronizing and metering) stand on single or three-position stands at line entrances or by the buses; provide a way to disconnect them, such as disconnectable clamps.',
    cite: { page: 127, section: '4.4.5' },
    tags: ['transmission', 'VT', 'layout'],
  },
  {
    id: 'trans-cts',
    text: 'CTs are usually multi-ratio bushing types inside breakers and transformers; separate CTs on their own stands are needed mainly for revenue metering.',
    cite: { page: 127, section: '4.4.6' },
    tags: ['transmission', 'CT', 'layout'],
  },
  {
    id: 'trans-grounding-switches',
    text: 'Manual grounding switches for incoming lines are usually part of the line disconnect and interlocked with it; high-speed grounding switches for transformer protection are generally not preferred.',
    cite: { page: 127, section: '4.4.7' },
    tags: ['transmission', 'grounding-switch', 'safety'],
  },
];

export const SWITCHING_STATION: Sourced<{ oneLine: string; notes: readonly string[] }> = {
  value: {
    oneLine: 'Fig. 4-8: three line terminals, each line -> disconnect -> breaker -> disconnect, tapped to one common bus; no transformers.',
    notes: [
      'Switching stations do not change voltage and contain no power transformers; they usually operate at subtransmission or transmission voltage with transmission-type equipment.',
      'Breakers in each circuit help prevent a complete shutdown for line faults; bypass facilities can be added as in §4.4.2.',
      'Hook stick switches are usually not considered above 69 kV.',
      'Arresters may go on the line positions or on the buses; if in doubt, install them.',
    ],
  },
  cite: { page: [127, 128], section: '4.5, 4.5.1, 4.5.2', figure: '4-8' },
};

// ---------------------------------------------------------------------------
// §4.6 Typical bus configurations
// ---------------------------------------------------------------------------

export type BusSchemeId =
  | 'single-bus'
  | 'sectionalized-bus'
  | 'main-and-transfer'
  | 'ring-bus'
  | 'breaker-and-a-half'
  | 'double-breaker-double-bus';

/** What is lost when a bus (or bus section) faults. */
export type BusFaultOutcome = 'entire-substation' | 'faulted-section-only' | 'no-circuits';
/** What is lost when a breaker fails to clear a fault. */
export type BreakerFailureOutcome = 'entire-substation' | 'affected-section-only' | 'two-adjacent-sections' | 'one-or-two-circuits' | 'one-circuit';
/** What happens when a breaker is taken out for maintenance. */
export type BreakerMaintenanceOutcome = 'bypass-required-protection-reduced' | 'transfer-bus-via-tie-breaker' | 'no-interruption';

export interface BusSchemeFigure {
  figure: string;
  page: number;
  description: string;
}

export interface BusScheme {
  id: BusSchemeId;
  name: string;
  summary: string;
  /** The typical one-line diagram described in words. */
  oneLine: string;
  figures: readonly BusSchemeFigure[];
  /** Breakers per circuit (number) or a short rule. */
  breakersPerCircuit: number | string;
  advantages: readonly string[];
  disadvantages: readonly string[];
  reliability: {
    busFault: { outcome: BusFaultOutcome; text: string };
    breakerFailure: { outcome: BreakerFailureOutcome; text: string };
    breakerMaintenance: { outcome: BreakerMaintenanceOutcome; text: string };
    lineFault: string;
  };
  notes: readonly string[];
  cite: Citation;
}

export const BUS_SCHEMES: readonly BusScheme[] = [
  {
    id: 'single-bus',
    name: 'Single bus',
    summary: 'All circuits connect, each through its own breaker, to one main bus that is always energized. It is the simplest scheme and the least reliable.',
    oneLine:
      'Two transformer circuits (transformer -> disconnect -> breaker -> disconnect) and two outgoing lines (disconnect -> breaker -> disconnect -> line) all tap one common bus.',
    figures: [
      {
        figure: '4-9',
        page: 130,
        description:
          'Low profile: each bay is a straight ground-level run - transformer, switch stand, breaker, switch stand, bus supports, switch, breaker, switch, line dead-end structure - joined by rigid bus.',
      },
      {
        figure: '4-10',
        page: 131,
        description:
          'High profile: the same circuits, with switches and bus carried on a box-type steel structure above the breakers; dashed "future circuit breaker bypass switches" bridge each breaker to a bypass bus.',
      },
    ],
    breakersPerCircuit: 1,
    advantages: [
      'Lowest cost',
      'Small land area',
      'Easy to expand',
      'Simple to understand and operate',
      'Protective relaying is relatively simple',
    ],
    disadvantages: [
      'With in-station bypass on the high-profile layout, a bypassed circuit has no protection of its own',
      'Lowest reliability of the schemes',
      'A breaker failure or bus fault drops the entire substation',
      'Maintenance switching can complicate or disable parts of the relaying and coordination',
      'Work on the upper levels of a high-profile layout requires de-energizing or shielding the equipment below',
    ],
    reliability: {
      busFault: { outcome: 'entire-substation', text: 'A bus fault takes the whole substation out of service.' },
      breakerFailure: { outcome: 'entire-substation', text: 'A breaker that fails to operate under fault conditions causes complete loss of the substation.' },
      breakerMaintenance: {
        outcome: 'bypass-required-protection-reduced',
        text:
          'Not recommended without breaker bypass. With in-station bypass the circuit relies on remote breakers, and a line fault while bypassed shuts the whole station down. ' +
          'Alternatively, switches outside the station can parallel two lines so one breaker protects both (equipment must carry both loads).',
      },
      lineFault: 'The line\'s own breaker clears it; the rest of the station stays in service.',
    },
    notes: [
      'The low-profile arrangement cannot later take in-station bypass switches; bypass can instead be built outside the station.',
      'The high-profile arrangement is generally limited to distribution and subtransmission voltages; at transmission voltages, independent structures and strain bus are usual.',
    ],
    cite: { page: [125, 131], section: '4.6.1', figure: '4-9, 4-10', note: 'Line-fault behaviour from §4.4.1/§4.5.1 (pp. 125, 128).' },
  },
  {
    id: 'sectionalized-bus',
    name: 'Sectionalized bus',
    summary: 'Two or more single-bus sections tied together by bus-sectionalizing breakers, which may run normally open or closed as the system requires.',
    oneLine:
      'Each of two bus sections has one transformer circuit and one outgoing line (each disconnect -> breaker -> disconnect); a sectionalizing breaker with disconnects on both sides joins the sections.',
    figures: [
      {
        figure: '4-11',
        page: 132,
        description:
          'One-line only; physically laid out like Figs. 4-9/4-10 with the sectionalizing breaker and its switches in line with the main bus (in high profile, preferably in a bay of its own).',
      },
    ],
    breakersPerCircuit: 'One per circuit plus one per sectionalizing point',
    advantages: [
      'Flexible operation',
      'More reliable than a single bus',
      'Bus sections can be isolated for maintenance',
      'A breaker failure or bus fault drops only part of the substation',
    ],
    disadvantages: [
      'Costs more than a single bus',
      'Needs extra breakers for sectionalizing',
      'Sectionalizing may interrupt circuits that are not faulted',
    ],
    reliability: {
      busFault: { outcome: 'faulted-section-only', text: 'Only the faulted bus section is removed from service; the rest of the station keeps running.' },
      breakerFailure: { outcome: 'affected-section-only', text: 'A breaker failure removes only the affected bus section; faulted parts can be isolated and the rest restored quickly.' },
      breakerMaintenance: { outcome: 'bypass-required-protection-reduced', text: 'Bypass arrangements are the same as for the single bus.' },
      lineFault: 'The line\'s own breaker clears it.',
    },
    notes: [
      'Put interdependent lines and transformers on different bus sections so they are not lost together; analyse all operating contingencies before fixing the circuit grouping.',
    ],
    cite: { page: [132, 133], section: '4.6.2', figure: '4-11' },
  },
  {
    id: 'main-and-transfer',
    name: 'Main and transfer bus',
    summary:
      'Two independent buses. The main bus normally feeds every circuit through its breaker; the normally de-energized transfer bus, with a bus-tie breaker, carries any circuit whose breaker is out for maintenance.',
    oneLine:
      'Transfer bus and main bus run in parallel. Each circuit connects to the main bus through disconnect -> breaker -> disconnect and to the transfer bus through a normally open bypass switch; one position holds the bus-tie breaker (with disconnects) between the two buses.',
    figures: [
      {
        figure: '4-12',
        page: 134,
        description:
          'Low profile: four positions (lines, a transformer and the tie); each circuit needs its own bay, with A-frame dead-end structures carrying the transfer-bus connections over the ground-level breakers and switches.',
      },
      {
        figure: '4-13',
        page: 135,
        description: 'High profile: the same scheme on a box-type structure holding two circuit positions per bay above the breakers.',
      },
    ],
    breakersPerCircuit: 'One per circuit plus one bus-tie breaker',
    advantages: [
      'Breakers can be maintained while service and line protection continue',
      'Reasonable cost',
      'Fairly small land area',
      'Easy to expand',
    ],
    disadvantages: [
      'Needs an extra breaker for the bus tie',
      'The tie breaker must be able to replace any line breaker, so its relaying can be somewhat complicated',
      'A breaker failure or bus fault drops the entire substation',
      'Removing a breaker for maintenance takes somewhat complicated switching',
    ],
    reliability: {
      busFault: { outcome: 'entire-substation', text: 'A main-bus fault causes loss of the entire substation.' },
      breakerFailure: { outcome: 'entire-substation', text: 'A breaker failure causes loss of the entire substation.' },
      breakerMaintenance: {
        outcome: 'transfer-bus-via-tie-breaker',
        text: 'Close the circuit\'s bypass switch, close the tie breaker and its disconnects, then open the breaker to be serviced and its disconnects; the bus-tie breaker then protects the circuit.',
      },
      lineFault: 'The line\'s own breaker (or the tie breaker when transferred) clears it.',
    },
    notes: [
      'Low-profile layouts need one bay per circuit (more land); limit groups to two bays before widening bay spacing for breaker maintenance and removal.',
      'The high-profile box arrangement suits small or screened sites but is generally limited to distribution and subtransmission voltages.',
    ],
    cite: { page: [133, 135], section: '4.6.3', figure: '4-12, 4-13' },
  },
  {
    id: 'ring-bus',
    name: 'Ring bus',
    summary:
      'A sectionalized bus closed into a loop: each bus section is separated from the next by a breaker, and for best reliability each section feeds just one circuit.',
    oneLine:
      'Four breakers, each between two disconnects, form a closed loop; the four nodes between breakers serve two lines (through line disconnects) and two transformers (through disconnects).',
    figures: [
      {
        figure: '4-14',
        page: 137,
        description:
          'Four-position ring in low profile: breakers and switches in a row at ground level with dead-end structures for the line and transformer connections; dashed structures show room to extend to breaker-and-a-half.',
      },
    ],
    breakersPerCircuit: 1,
    advantages: [
      'Flexible operation',
      'High reliability',
      'Bus sections and breakers can be isolated for maintenance without disturbing circuits',
      'Each circuit is fed from two directions',
      'No main buses',
      'Can be expanded to breaker-and-a-half',
      'Economical design',
    ],
    disadvantages: [
      'Faults on two circuits, or a fault during breaker maintenance, can split the ring and leave poor supply/load groupings (some regard this as a second contingency)',
      'Each circuit needs its own potential source for relaying',
      'Usually limited to four positions; six is generally the maximum, although rings of up to ten exist',
      'Relaying is more involved because each breaker responds to faults on two circuits',
      'Automatic reclosing schemes can be complex',
    ],
    reliability: {
      busFault: {
        outcome: 'faulted-section-only',
        text: 'For a line or bus-section fault the breakers on both sides of that section open; all other circuits stay in service.',
      },
      breakerFailure: {
        outcome: 'two-adjacent-sections',
        text: 'The breakers on both sides of the failed breaker open and a transfer trip opens the remote breaker, removing two bus sections (two circuits).',
      },
      breakerMaintenance: {
        outcome: 'no-interruption',
        text: 'Any breaker can normally be taken out without interrupting any circuit, so separate bypass facilities are not needed (the ring is open meanwhile).',
      },
      lineFault: 'Cleared by the two breakers either side of the line\'s bus section; other circuits continue.',
    },
    notes: [
      'Four positions is a practical maximum; for more circuits adopt breaker-and-a-half. Plan relay and control panels so the ring can later be converted.',
      'Plan bay centerline spacing for equipment maintenance and removal.',
    ],
    cite: { page: [136, 139], section: '4.6.4', figure: '4-14, 4-15' },
  },
  {
    id: 'breaker-and-a-half',
    name: 'Breaker-and-a-half',
    summary:
      'Two main buses, both normally energized, joined by bays of three series breakers; a circuit connects between each pair of breakers, so two circuits share three breakers.',
    oneLine:
      'Three bays between the two main buses; each bay is bus -> breaker -> circuit -> breaker -> circuit -> breaker -> bus (lines and transformers), every breaker with disconnects on both sides.',
    figures: [
      {
        figure: '4-15',
        page: 138,
        description: 'The same low-profile equipment assembly as the ring bus, completed into full bays between two main buses with dead-end structures for the circuits.',
      },
    ],
    breakersPerCircuit: 1.5,
    advantages: [
      'Flexible operation',
      'High reliability',
      'Either main bus can be isolated for maintenance without interrupting service',
      'Any breaker can be isolated for maintenance without interrupting service',
      'Each circuit is fed from two directions',
      'A bus fault interrupts no circuits',
      'All switching is done with breakers',
    ],
    disadvantages: [
      'Needs one and a half breakers per circuit',
      'Relaying is involved because the center breaker must respond to faults on either of its circuits',
      'Each circuit should have its own potential source for relaying',
    ],
    reliability: {
      busFault: { outcome: 'no-circuits', text: 'A fault on either main bus interrupts no circuits.' },
      breakerFailure: {
        outcome: 'one-or-two-circuits',
        text: 'Failure of the shared center breaker loses two circuits; failure of an outside breaker loses only one.',
      },
      breakerMaintenance: { outcome: 'no-interruption', text: 'Any breaker can be removed from service without interrupting any circuit.' },
      lineFault: 'Cleared by the two breakers adjacent to the line; the other circuit in the bay stays in service.',
    },
    notes: ['Stations are often built first as a ring bus and later expanded to breaker-and-a-half as circuits are added.'],
    cite: { page: [138, 139], section: '4.6.5', figure: '4-15' },
  },
  {
    id: 'double-breaker-double-bus',
    name: 'Double breaker - double bus',
    summary: 'Two main buses, both normally energized; each circuit sits between its own two breakers, one to each bus.',
    oneLine: 'Three bays (two lines and one transformer); each bay is bus -> breaker -> circuit -> breaker -> bus.',
    figures: [
      {
        figure: '4-16',
        page: 140,
        description: 'Low-profile bay: two breakers with their switches either side of a center dead-end structure for the circuit, connecting to the two main buses at the ends.',
      },
    ],
    breakersPerCircuit: 2,
    advantages: [
      'Flexible operation',
      'Very high reliability',
      'Either main bus can be isolated for maintenance without interrupting service',
      'Any breaker can be isolated for maintenance without interrupting service',
      'Each circuit is fed from two directions',
      'A bus fault interrupts no circuits',
      'A breaker failure loses only one circuit',
      'All switching is done with breakers',
    ],
    disadvantages: ['High cost', 'Needs two breakers per circuit'],
    reliability: {
      busFault: { outcome: 'no-circuits', text: 'Faults on either main bus cause no circuit interruptions.' },
      breakerFailure: { outcome: 'one-circuit', text: 'A breaker failure loses only one circuit.' },
      breakerMaintenance: { outcome: 'no-interruption', text: 'Any breaker can be removed from service without interrupting any circuit.' },
      lineFault: 'Cleared by the circuit\'s two breakers; no other circuit is affected.',
    },
    notes: [
      'Usually limited to large generating stations because of cost; the extra reliability over breaker-and-a-half is rarely justified for transmission or distribution substations.',
      'At generating stations, one bay of a breaker-and-a-half may be built as double-breaker for a generator so it has equal access to both buses.',
    ],
    cite: { page: [139, 141], section: '4.6.6', figure: '4-16' },
  },
];

/** General statement on the typical bus configurations. */
export const BUS_CONFIGURATION_GUIDANCE: readonly Guidance[] = [
  {
    id: 'bus-config-applicability',
    text: 'The typical bus configurations serve distribution, transmission or switching stations up to 345 kV; parts of different layouts can be combined, and actual equipment sizes may change the arrangement.',
    cite: { page: 128, section: '4.6' },
    tags: ['bus-scheme', 'layout'],
  },
  {
    id: 'bus-config-coordinate',
    text: 'Keep layout plans flexible and coordinate with equipment manufacturers so each detail fits the equipment actually bought.',
    cite: { page: 128, section: '4.6' },
    tags: ['bus-scheme', 'layout'],
  },
  {
    id: 'bus-config-selection',
    text: 'Scheme selection weighs many factors, including judgement; the chosen arrangement must meet operating, maintenance, expansion and reliability needs (see Table 4-1 for relative costs).',
    cite: { page: 141, section: '4.6.7' },
    tags: ['bus-scheme', 'cost', 'reliability'],
  },
];

/** Find a bus scheme by id. */
export function busScheme(id: BusSchemeId): BusScheme {
  const s = BUS_SCHEMES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown bus scheme ${id}`);
  return s;
}
