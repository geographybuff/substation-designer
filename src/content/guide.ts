/**
 * Field Guide articles. Text is paraphrased from RUS Bulletin 1724E-300 with
 * citations; tables are generated from the same cited data the game's checks
 * use, so the guide and the rules can't drift apart.
 */
import type { Citation } from '../data/bulletin/types';
import { VOLTAGE_CLASSES, VOLTAGE_CLASS_CITES } from '../data/bulletin/voltageClasses';
import { EVENT_ASSUMPTIONS, RATES } from '../engine/reliability';
import { SCHEMES } from '../engine/schemes';
import { FIXED_ANGLE, SHIELD_WIRE_LINE_EXTENSION_M, SHIELD_WIRE_MAX_TENSION_N } from '../engine/lightning';

export type Block =
  | { p: string }
  | { h: string }
  | { list: string[] }
  | { note: string }
  | { table: { head: string[]; rows: Array<Array<string | number>>; caption?: string; cite?: Citation } };

export interface GuideArticle {
  id: string;
  title: string;
  category: 'Playing' | 'Layout' | 'Protection' | 'Lightning' | 'Grounding' | 'Equipment' | 'Site' | 'Systems' | 'About';
  body: Block[];
  cites: Citation[];
  tags?: string[];
}

const ft = (m: number) => (m / 0.3048).toFixed(1);

export const BASE_ARTICLES: GuideArticle[] = [
  {
    id: 'how-to-play',
    title: 'How to play',
    category: 'Playing',
    cites: [],
    body: [
      { p: 'Each project is a work order from a fictional rural electric cooperative. Read the brief, lay out the substation in plan view, fix what the design review flags, then press Energize to commission it and see years of operation.' },
      { h: 'Controls' },
      {
        list: [
          'Wheel: zoom. Right-drag, middle-drag or Space+drag: pan. "Fit" frames the yard.',
          'Toolbox: pick equipment at a voltage, then click to place. R rotates before or after placing. Esc or right-click returns to Select.',
          'Bus (B): click a terminal dot, click to add corners, and finish on another terminal or an existing bus. Space flips which way the corner goes. B again cycles the voltage.',
          'Fence (F): drag a rectangle. Set the gate in the inspector with nothing selected.',
          'Select (V): click to select and drag to move; buses follow their terminals. Del deletes. Ctrl+Z / Ctrl+Y undo and redo.',
          'Tab switches between the plan and the 3D view (if enabled in Settings).',
        ],
      },
      { h: 'Stars' },
      { p: 'One star means the cooperative accepts the design: no critical findings, required objectives met and within budget. Two stars also need no major findings and expected outage minutes within the project target. Three stars add the optional objectives, no minor findings and at least 5% under budget.' },
    ],
  },
  {
    id: 'basic-distribution',
    title: 'Basic distribution substation',
    category: 'Layout',
    cites: [{ page: [121, 122], section: '4.3.1', figure: '4-2' }, { page: 121, section: '4.3' }],
    tags: ['feeder', 'recloser', 'disconnect', 'mobile'],
    body: [
      { p: 'Distribution substations take subtransmission or transmission voltage (up to 230 kV) down to primary distribution voltages such as 12.5Y/7.2, 13.2Y/7.6, 13.8Y/8.0, 24.9Y/14.4 or 34.5Y/19.9 kV. The bulletin’s basic arrangement is simple: the incoming circuit passes through a primary disconnect switch, then the power transformer, which feeds a bus with the distribution circuits.' },
      { p: 'The primary disconnect switch — usually three-pole, single-throw and group-operated — isolates the substation from the supply line for maintenance or equipment replacement.' },
      { p: 'Each distribution feeder is protected by a power circuit breaker or an automatic circuit recloser, with disconnect switches on both its source and load sides so it can be fully de-energized for maintenance.' },
      { p: 'Three-phase transformers give a neater layout than banks of single-phase units, but losing a three-phase transformer means losing the whole substation, so the layout should allow a mobile transformer or mobile substation to be installed quickly.' },
    ],
  },
  {
    id: 'primary-protection',
    title: 'Transformer primary protective devices',
    category: 'Protection',
    cites: [{ page: 122, section: '4.3.2' }],
    tags: ['fuse', 'circuit switcher', 'breaker'],
    body: [
      { p: 'A protective device on the transformer primary prevents damage from transformer or low-voltage bus faults, and can double as the primary disconnect. Options include power fuses, circuit breakers, circuit switchers and vacuum interrupters.' },
      { p: 'The choice depends on the voltage, the short-circuit conditions and the transformer’s capacity.' },
      { note: 'In the game, a fuse must carry the transformer’s top (fan-cooled) rated current without melting, and should not be grossly oversized. These sizing rules are game simplifications.' },
    ],
  },
  {
    id: 'voltage-regulation',
    title: 'Voltage regulation',
    category: 'Equipment',
    cites: [{ page: [122, 123], section: '4.3.3', figure: '4-3' }],
    tags: ['regulator', 'ltc', 'bypass'],
    body: [
      { p: 'Rural distribution substations usually need voltage regulation to keep voltage uniform. It can be done per feeder or for the whole bus.' },
      { list: ['Feeder regulation suits multi-circuit substations whose feeders have very different load characteristics; each feeder’s voltage is held individually.', 'Bus regulation suits substations whose feeders have similar loads. The bus can be regulated with a load tap changing (LTC) transformer, single- or three-phase regulators, or switched capacitor banks.'] },
      { p: 'Bypass facilities let a regulator be maintained without de-energizing the feeder or bus. The usual regulator bypass switches perform all the switching operations in the correct sequence and fit in about the space of one single-pole disconnect switch.' },
    ],
  },
  {
    id: 'bypass',
    title: 'Breaker and recloser bypass facilities',
    category: 'Layout',
    cites: [{ page: [123, 124], section: '4.3.4', figure: '4-4' }, { page: 126, section: '4.4.2', figure: '4-7' }],
    tags: ['bypass', 'maintenance', 'hook stick'],
    body: [
      { p: 'Bypass facilities let a circuit breaker or recloser be maintained or repaired without de-energizing its circuit. The typical arrangement adds a bypass switch from the bus side to the line side, around the device and its two disconnect switches.' },
      { p: 'The bypass switches are usually three independently operated hook stick switches, though a three-pole group-operated switch can be used. A tandem switch can combine the bypass and load-side disconnect on one base. A fuse can replace the bypass switch to keep the circuit protected while bypassed.' },
      { note: 'In the game, mark bypass switches “Normally open”. The design review then checks that the feeder stays energized when the device and its disconnects are opened and the bypass is closed.' },
    ],
  },
  {
    id: 'arresters',
    title: 'Surge arresters',
    category: 'Lightning',
    cites: [{ page: 124, section: '4.3.5' }, { page: 142, section: '4.7.2' }],
    tags: ['arrester', 'surge'],
    body: [
      { p: 'Surge arresters protect equipment from overvoltages caused by lightning surges, switching surges and system faults by discharging the surge to the ground system and then stopping power-frequency follow current.' },
      { p: 'Transformers and regulators are particularly sensitive, so arresters go as close as practical to the protected equipment — on transformer tank brackets, separate stands or adjacent structures. On regulators they are normally mounted on the tanks.' },
      { p: 'When a transformer is fuse-protected, connect its arresters on the line side of the fuses, close to the transformer, to reduce stress on the fuse and avoid partially melting the fuse link.' },
    ],
  },
  {
    id: 'shielding',
    title: 'Direct stroke protection',
    category: 'Lightning',
    cites: [{ page: [142, 145], section: '4.7.3', figure: '4-17' }],
    tags: ['mast', 'shield wire', 'fixed angle', 'rolling sphere'],
    body: [
      { p: 'Because a direct lightning stroke to an unshielded substation can be devastating, the bulletin recommends some form of direct-stroke protection: lightning masts, overhead shield wires, or both. A system that lets no more than 0.1% of predicted strokes reach protected equipment is adequate for most situations.' },
      { h: 'Masts and shield wires' },
      {
        list: [
          `Shield wires should be limited to a design tension of ${SHIELD_WIRE_MAX_TENSION_N} N (2000 lb) per conductor, made of high-strength materials, with sag checked against clearances.`,
          `Where lines are not otherwise shielded, extend substation shield wires at least ${SHIELD_WIRE_LINE_EXTENSION_M} m (one-half mile) out along the lines.`,
          'Masts suit nearly all substations and are especially useful for large and low-profile yards. They may also support lighting.',
          'Shielding only works when well grounded: use multiple low-impedance connections to the ground grid — at least two.',
        ],
      },
      { h: 'Fixed angle method (Fig. 4-17)' },
      {
        table: {
          head: ['Angle', 'Range used', 'Recommended'],
          rows: [
            ['A — single mast or wire, and outer sides', `${FIXED_ANGLE.A.min}°–${FIXED_ANGLE.A.max}°`, `${FIXED_ANGLE.A.recommended}°`],
            ['B — between two masts or wires', `${FIXED_ANGLE.B.min}°–${FIXED_ANGLE.B.max}°`, `${FIXED_ANGLE.B.recommended}°`],
          ],
          cite: { page: 143, figure: '4-17' },
        },
      },
      { p: 'A single mast protects a cone and a single shield wire a wedge; overlapping zones of several masts or wires give complete coverage. The game measures angles from the vertical and models the zone between two masts as a tent whose ridge follows the 45° lines.' },
      { h: 'Rolling sphere method' },
      { p: 'An imaginary sphere is rolled over the substation, resting on masts, shield wires and other grounded shielding. Equipment that stays below the sphere’s surface is protected. The sphere radius is the strike distance R = 8·K·Is^0.65 metres (26.25·K·Is^0.65 ft), where Is = 2.2·BIL/Zs is the allowable stroke current in kA and K is 1.2 for masts and 1.0 for wires or the ground plane.' },
      { note: 'The rolling-sphere option in the game needs a conductor surge impedance Zs, which the bulletin does not tabulate; the game assumes 350 Ω.' },
    ],
  },
  {
    id: 'clearances',
    title: 'Outdoor electrical clearances (Table 4-7)',
    category: 'Layout',
    cites: [VOLTAGE_CLASS_CITES.clearances],
    tags: ['clearance', 'phase spacing', 'bil'],
    body: [
      { p: 'Minimum clearances must be kept at all times. Phase-to-ground and phase-to-phase clearances are coordinated so that any flashover goes to ground rather than between phases. Values apply up to 1000 m (3300 ft) altitude.' },
      {
        table: {
          head: ['Nominal kV', 'Max kV', 'BIL kV', 'Metal–metal m', 'Phase spacing m', 'To ground m', 'Ground clearance m', 'Roadway m'],
          rows: VOLTAGE_CLASSES.map((r) => [r.nominalKV, r.maxKV, r.bilKV, r.minMetalToMetalM, r.rigidBusPhaseSpacingM, r.minToGroundedPartsM, r.groundClearanceM, r.roadwayClearanceM]),
          caption: 'Rigid conductors. The 230 kV row shown is for 900 kV BIL.',
          cite: VOLTAGE_CLASS_CITES.clearances,
        },
      },
      { p: 'No energized bushing or insulator should be closer than 2.44 m (8 ft) to the top of its foundation.' },
      { note: 'In the game, each three-phase bus is drawn with the Table 4-7 phase spacing, and buses of different circuits must keep the minimum metal-to-metal clearance between their outer phases unless one is raised to high-bus elevation.' },
    ],
  },
  {
    id: 'switch-spacing',
    title: 'Air switch phase spacing (Table 4-8)',
    category: 'Equipment',
    cites: [VOLTAGE_CLASS_CITES.switchSpacing],
    tags: ['switch', 'disconnect', 'horn gap'],
    body: [
      { p: 'Minimum metal-to-metal clearances must hold with switches open, closed or anywhere in between. Side-break and horn-gap switches need wider phase spacing than vertical-break switches, so they take more room in the game.' },
      {
        table: {
          head: ['Nominal kV', 'BIL kV', 'Metal–metal m', 'Vertical break m', 'Side break m', 'Horn gap m'],
          rows: VOLTAGE_CLASSES.map((r) => [r.nominalKV, r.bilKV, r.switchMinMetalToMetalM, r.switchSpacingVerticalBreakM, r.switchSpacingSideBreakM ?? '—', r.switchSpacingHornGapM ?? '—']),
          cite: VOLTAGE_CLASS_CITES.switchSpacing,
        },
      },
    ],
  },
  {
    id: 'fence-clearance',
    title: 'Safety clearance to the fence (Fig. 4-21)',
    category: 'Site',
    cites: [VOLTAGE_CLASS_CITES.fence],
    tags: ['fence', 'safety'],
    body: [
      { p: 'Live parts inside the fence must stay out of a safety clearance zone so nobody outside can reach them, including with a rod or pole pushed through the fence. The zone extends a horizontal distance B in from the fence up to height A − B, then curves (radius B) up to height A over the fence line.' },
      {
        table: {
          head: ['Nominal kV', 'A (m)', 'A (ft)', 'B (m)', 'B (ft)'],
          rows: [
            ['0.151–34.5', 4.6, '15.0', 3.1, '10.0'],
            ['46–69', 4.9, '16.0', 3.7, '12.0'],
            ['115', 5.1, '16.7', 4.0, '13.0'],
            ['138', 5.2, '17.1', 4.3, '14.0'],
            ['161', 5.4, '17.6', 4.3, '14.0'],
            ['230', 5.8, '19.0', 4.9, '16.0'],
          ],
          cite: VOLTAGE_CLASS_CITES.fence,
        },
      },
      { p: 'For 115 kV and above, increase A by 3% for each 300 m (1000 ft) above 1000 m (3300 ft).' },
      { note: 'Tall structures such as line dead-ends and feeder getaway poles can stand near the fence because their live parts are above height A.' },
    ],
  },
  {
    id: 'bil',
    title: 'Insulation levels (BIL)',
    category: 'Equipment',
    cites: [VOLTAGE_CLASS_CITES.insulatorBIL, VOLTAGE_CLASS_CITES.suspensionInsulators],
    tags: ['bil', 'insulator'],
    body: [
      { p: 'Apparatus insulators are rated by their impulse withstand voltage (BIL). Using the BIL listed for the system voltage normally coordinates with protective devices and other insulation; very contaminated areas may justify a higher BIL. Above 1000 m (3300 ft), altitude correction factors reduce the effective BIL of air-insulated equipment.' },
      {
        table: {
          head: ['Nominal kV', 'Apparatus BIL kV', 'Min. suspension insulators'],
          rows: VOLTAGE_CLASSES.map((r) => [r.nominalKV, r.bilKV, r.minSuspensionInsulators]),
          caption: 'Suspension insulator counts are for standard 146 × 254 mm (5¾ × 10 in) units.',
          cite: VOLTAGE_CLASS_CITES.insulatorBIL,
        },
      },
      { p: 'Post-type insulators are the type most used for new construction and are recommended for new work; polymer posts are less rigid and are not recommended for switch supports.' },
    ],
  },
  {
    id: 'schemes',
    title: 'Switching schemes',
    category: 'Layout',
    cites: [{ page: [128, 141], section: '4.6', table: '4-1' }],
    tags: ['single bus', 'ring bus', 'breaker-and-a-half', 'main and transfer', 'sectionalized'],
    body: [
      { p: 'The switching scheme is chosen for the power system as a whole: flexibility and reliability rise with cost, so the final arrangement is a compromise. A basic scheme can be built first and converted to a more elaborate one as circuits are added.' },
      {
        table: {
          head: ['Scheme', 'Approx. relative cost'],
          rows: (['single_bus', 'sectionalized_bus', 'main_transfer', 'ring_bus', 'breaker_and_half', 'double_breaker'] as const).map((id) => [SCHEMES[id].name, `${SCHEMES[id].relativeCostPct}%`]),
          caption: 'Four-circuit, low-profile arrangements with power circuit breakers in all circuits; transformer costs excluded.',
          cite: { page: 141, section: '4.6.7', table: '4-1' },
        },
      },
      { p: 'Double breaker–double bus gives very high reliability — either bus or any breaker can be taken out without interrupting a circuit — but its cost usually limits it to large generating stations.' },
    ],
  },
  {
    id: 'removal-expansion',
    title: 'Equipment removal and expansion',
    category: 'Site',
    cites: [{ page: 120, section: '4.2.6', figure: '4-1' }, { page: [119, 120], section: '4.2.3' }],
    tags: ['removal', 'expansion', 'high bus'],
    body: [
      { p: 'Layouts must leave room to install and remove large equipment such as power transformers and circuit breakers. Low-profile buses, even at acceptable operating heights, can block removal; placing main buses higher than the bay equipment keeps routes open. Removable bus sections are an alternative but require de-energizing the bus.' },
      { p: 'Plan for the long-range forecast: make the site as large as practical, and leave at least one — preferably both — ends of major buses open for future expansion.' },
      { note: 'The Removal overlay shows a route for each transformer and breaker. Low buses block it; high buses do not.' },
    ],
  },
  {
    id: 'assumptions',
    title: 'Game assumptions',
    category: 'About',
    cites: [],
    tags: ['cost', 'reliability', 'assumption'],
    body: [
      { p: 'Substation Designer uses the bulletin for engineering rules and values. A few things a game needs are not in the bulletin, so they are illustrative game assumptions:' },
      {
        list: [
          'Equipment and construction costs (the bulletin only compares switching schemes in relative terms).',
          'Equipment footprints: sized from the bulletin’s phase spacings but otherwise approximate.',
          'Failure rates, repair times and maintenance outage durations in the reliability model.',
          'Lightning flash density (0.12 flashes/km²/yr per thunderstorm day) and surge damage frequency.',
          'Fuse sizing limits and the 10 m “as close as practical” distance for separate arrester stands.',
          'Bus heights: Table 4-7 ground clearance plus 1.2 m for low-profile bus; high bus at least the roadway clearance plus 0.5 m.',
        ],
      },
      {
        table: {
          head: ['Equipment', 'Failures/yr', 'Repair h', 'Maintenance every', 'Maintenance h'],
          rows: Object.entries(RATES).map(([k, r]) => [k.replace(/_/g, ' '), r!.failuresPerYear, r!.repairHours, r!.maintenanceYears ? `${r!.maintenanceYears} yr` : '—', r!.maintenanceHours || '—']),
          caption: 'Reliability model inputs (game assumptions).',
        },
      },
      { p: `Other inputs: ${EVENT_ASSUMPTIONS.feederFaultsPerYear} faults per feeder per year beyond the substation, ${Math.round(EVENT_ASSUMPTIONS.temporaryFraction * 100)}% of them temporary; ${EVENT_ASSUMPTIONS.switchingHours} h to restore by manual switching (${EVENT_ASSUMPTIONS.scadaSwitchingHours} h with SCADA); ${EVENT_ASSUMPTIONS.mobileInstallHours} h to install a mobile unit on a prepared pad versus ${EVENT_ASSUMPTIONS.mobileUnpreparedHours} h without provisions.` },
      { note: `Bus heights: e.g. 69 kV low bus ${(VOLTAGE_CLASSES.find((r) => r.nominalKV === 69)!.groundClearanceM + 1.2).toFixed(1)} m (${ft(VOLTAGE_CLASSES.find((r) => r.nominalKV === 69)!.groundClearanceM + 1.2)} ft).` },
    ],
  },
];
