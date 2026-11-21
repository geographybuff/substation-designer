/**
 * Substation automation and communications data from RUS Bulletin 1724E-300:
 * Chapter 14 "Substation Automation" (pp. 659-669) and Chapter 17 "Communications" (pp. 699-714,
 * incl. Table 17-1 "Substation Communication Methods vs. Applications").
 * Reflects 2001 practice (DNP 3.0, UCA 2.0, VSAT, SONET); the game should present it as historical context.
 */
import type { Citation, Guidance } from './types';

export const COMMUNICATIONS_CITES = {
  automationIntro: { page: 659, section: '14.1' },
  openVsProprietary: { page: [659, 660], section: '14.2' },
  architecture: { page: [660, 662], section: '14.3-14.4', figure: '14-1, 14-2' },
  hostProcessor: { page: [661, 663], section: '14.4.1' },
  ieds: { page: [663, 664], section: '14.4.2' },
  plcs: { page: 664, section: '14.4.3' },
  dataConcentrator: { page: 665, section: '14.4.4' },
  lan: { page: [665, 666], section: '14.4.5' },
  protocols: { page: [666, 669], section: '14.4.6' },
  commsApplications: { page: [699, 700], section: '17.1-17.2', table: '17-1' },
  plc: { page: [700, 705], section: '17.3.1', figure: '17-1 to 17-4' },
  audioTone: { page: 705, section: '17.3.2' },
  shieldWire: { page: 706, section: '17.3.3' },
  microwave: { page: [706, 708], section: '17.3.4', figure: '17-5, 17-6' },
  fiber: { page: [709, 711], section: '17.3.5', figure: '17-7, 17-8' },
  wireLines: { page: [711, 712], section: '17.3.6', originalSource: 'IEEE Std 487-1992' },
  satellite: { page: [712, 713], section: '17.3.7', figure: '17-9' },
} as const satisfies Record<string, Citation>;

// ---------------------------------------------------------------------------
// Chapter 14: substation automation
// ---------------------------------------------------------------------------

export const AUTOMATION_GUIDANCE: readonly Guidance[] = [
  { id: 'sa-definition', text: 'Substation automation uses computers, communications, networking and intelligent electronic devices (IEDs) to optimize operation and allow cost-effective remote monitoring and control, extending traditional SCADA.', cite: { page: 659, section: '14.1' }, tags: ['automation'] },
  { id: 'sa-legacy', text: 'In legacy SCADA a control-center master station polls "dumb" RTUs that read transducers and contacts and operate control relays; automation replaces transducers with IEDs on a substation LAN and adds programmable RTUs and PLCs.', cite: { page: 659, section: '14.1' }, tags: ['automation', 'scada'] },
  { id: 'sa-protocol-obstacle', text: 'The main integration obstacle has been proprietary LAN protocols needing costly converters; standardization was progressing toward vendor-independent networks.', cite: { page: 659, section: '14.1' }, tags: ['automation', 'protocol'] },
  { id: 'sa-open', text: 'Proprietary networks give one point of responsibility and plug-and-play but lock in the vendor (escrow the source code); open systems allow competitive multivendor supply but make the user responsible for interoperability.', cite: { page: [659, 660], section: '14.2' }, tags: ['automation'] },
  { id: 'sa-layers', text: 'The architecture stacks from field devices up to the operator interface, in two layers: the substation data acquisition and control layer (the bulletin\'s focus) and the utility enterprise information layer.', cite: { page: 660, section: '14.3', figure: '14-1' }, tags: ['automation'] },
  { id: 'sa-range', text: 'Automation ranges from a single serial link between an RTU and an electronic recloser to a fully networked station with digital relays, reclosers, PLCs, a host processor and HMI.', cite: { page: 660, section: '14.4', figure: '14-2' }, tags: ['automation'] },
];

export interface AutomationElement {
  id: 'host-processor' | 'ied' | 'plc' | 'data-concentrator' | 'lan' | 'serial';
  name: string;
  points: readonly string[];
  cite: Citation;
}

export const AUTOMATION_ELEMENTS: readonly AutomationElement[] = [
  {
    id: 'host-processor', name: 'Substation host processor',
    points: [
      'Stores field data locally, provides the local HMI (Windows-type GUI), can run logic and closed-loop control, and is the gateway to the SCADA host.',
      'A single non-redundant processor suffices for small substations; larger or critical stations warrant a dual-redundant processor with automatic failover.',
    ],
    cite: { page: [661, 663], section: '14.4.1' },
  },
  {
    id: 'ied', name: 'Intelligent electronic devices (IEDs)',
    points: [
      'Examples: multifunction meters, digital relays, PLCs, digital fault and sequence-of-events recorders, regulator and capacitor controls, electronic reclosers.',
      'Besides their primary function they supply power flows, volts, amps, symmetrical components, fault data, relay targets, sequence of events and oscillography over a serial or network port, eliminating discrete transducers.',
      'Should be individually addressable and support open protocols (DNP 3.0, ModBus, ASCII, UCA 2.0, IEC 870-5-101/103, TCP/IP); data latency of polled or scanned acquisition must be quantified.',
    ],
    cite: { page: [663, 664], section: '14.4.2' },
  },
  {
    id: 'plc', name: 'Programmable logic controllers',
    points: [
      'Generic, ladder-logic programmable devices now built to substation standards (e.g. ANSI C37.90a surge withstand) and fast enough for some protective functions.',
      'Uses: reclosing, auto-sectionalizing, carrier check-back, LTC and capacitor control, local HMI and annunciation, complex breaker control and tripping.',
      'Using PLCs between relays and breakers is not generally recommended (relays should do protection, §12.3.2.11).',
    ],
    cite: { page: 664, section: '14.4.3' },
  },
  {
    id: 'data-concentrator', name: 'Data concentrator',
    points: ['Integrates incompatible IED protocols into one protocol for an external host; with UCA its role shrinks but it still saves bandwidth on slow wide-area links.'],
    cite: { page: 665, section: '14.4.4' },
  },
  {
    id: 'lan', name: 'Substation LAN',
    points: [
      'Media: coaxial cable, unshielded twisted pair, optical fiber; fiber is immune to electrical transients and is recommended for all IEDs engaged in protection.',
      'Access methods: CSMA/CD ("Ethernet", IEEE 802.3, non-deterministic, best lightly loaded), token ring (802.5) and token bus (802.4) (deterministic), FDDI (dual 100 Mbps fiber rings, mostly backbone); ATM over SONET at 155.52 or 622.08 Mbps.',
    ],
    cite: { page: [665, 666], section: '14.4.5' },
  },
  {
    id: 'serial', name: 'Serial data interfaces',
    points: [
      'RS-232 (ANSI/TIA/EIA-232-E, about 50 ft or less without low-capacitance cable); RS-422 (balanced, faster and longer) and RS-423 (unbalanced); RS-485 (balanced, multidrop) is the most common in substations.',
    ],
    cite: { page: 666, section: '14.4.5.3' },
  },
];

export const PROTOCOLS = {
  list: [
    { name: 'DNP 3.0', note: 'Widest vendor support; de facto industry standard; maintained by the DNP Users Group.' },
    { name: 'IEC 870-5', note: 'IEC TC 57 WG 3 telecontrol/teleprotection protocol; with DNP 3.0 recommended by trial-use IEEE Std 1379 (1994).' },
    { name: 'ModBus (ASCII and RTU)', note: 'Modicon message structure for controllers.' },
    { name: 'MMS (ISO 9506)', note: 'Application-independent real-time messaging; the basis of UCA.' },
    { name: 'Landis & Gyr 8979', note: 'Byte-oriented utility protocol.' },
    { name: 'UCA 2.0', note: 'EPRI Utility Communications Architecture over OSI or TCP/IP using MMS; UCA 1.0 adopted 1991; GOMSFE object models (Draft 0.7, Dec 1997) from EPRI RP-3599 led by AEP.' },
  ] as const,
  cite: { page: [666, 669], section: '14.4.6' } satisfies Citation,
} as const;

export const PROTOCOL_GUIDANCE: readonly Guidance[] = [
  { id: 'pr-def', text: 'Devices must share physical interface, access method and protocol; vendors typically support several protocols (one RTU offered 34, four at once).', cite: { page: 666, section: '14.4.6.1' }, tags: ['automation', 'protocol'] },
  { id: 'pr-versions', text: 'Devices claiming the same protocol may implement different versions; research the protocol\'s history and vendors\' modifications.', cite: { page: [667, 668], section: '14.4.6.1.1' }, tags: ['automation', 'protocol'] },
  { id: 'pr-plug-and-play', text: 'Require demonstrated plug-and-play interoperability between the specific devices; for new interfaces put protocol emulation on one party (RTU or data concentrator maker).', cite: { page: 668, section: '14.4.6.1.1' }, tags: ['automation', 'protocol', 'design-check'] },
];

// ---------------------------------------------------------------------------
// Chapter 17: communications
// ---------------------------------------------------------------------------

export type CommApplication = 'relaying' | 'scadaAutomation' | 'voice' | 'telemetering';
export type CommMethod = 'powerLineCarrier' | 'audioTone' | 'microwave' | 'fiberOptics' | 'wireLine' | 'satelliteVsat';

/** Table 17-1 (p. 699): substation communication methods vs. applications (true = "Y"). */
export const TABLE_17_1_METHODS_VS_APPLICATIONS: Readonly<Record<CommApplication, Readonly<Record<CommMethod, boolean>>>> = {
  relaying: { powerLineCarrier: true, audioTone: true, microwave: true, fiberOptics: true, wireLine: true, satelliteVsat: false },
  scadaAutomation: { powerLineCarrier: true, audioTone: false, microwave: true, fiberOptics: true, wireLine: true, satelliteVsat: true },
  voice: { powerLineCarrier: true, audioTone: false, microwave: true, fiberOptics: true, wireLine: true, satelliteVsat: false },
  telemetering: { powerLineCarrier: true, audioTone: true, microwave: true, fiberOptics: true, wireLine: true, satelliteVsat: false },
};

export const TABLE_17_1_CITE: Citation = { page: 699, section: '17.1', table: '17-1' };

/** Whether Table 17-1 lists a method as appropriate for an application. */
export function methodSuitsApplication(method: CommMethod, application: CommApplication): boolean {
  return TABLE_17_1_METHODS_VS_APPLICATIONS[application][method];
}

export const COMM_APPLICATIONS: readonly Guidance[] = [
  { id: 'app-relaying', text: 'Pilot relaying needs a two-way channel between line terminals, often miles apart, to trip at high speed for 100% of the line; the data is mostly simple two-state signals.', cite: { page: 699, section: '17.2.1' }, tags: ['communications', 'relaying'] },
  { id: 'app-scada', text: 'SCADA links the control-center master station with substation RTUs (or IEDs) over distances from under a mile to hundreds of miles, to monitor and control breakers, tap changers, capacitors and alarms.', cite: { page: [699, 700], section: '17.2.2' }, tags: ['communications', 'scada'] },
  { id: 'app-telemetering', text: 'Without SCADA, analog telemetering carries scaled mA, voltage or frequency-shift audio signals to remote readouts, recorders or annunciators.', cite: { page: 700, section: '17.2.3' }, tags: ['communications'] },
  { id: 'app-voice', text: 'Voice is needed between fixed points and mobile crews, over cable, radio or the power system, on leased or cooperative-owned facilities.', cite: { page: 700, section: '17.2.4' }, tags: ['communications'] },
];

export interface CommMethodInfo {
  id: CommMethod | 'shieldWire';
  name: string;
  numbers: Readonly<Record<string, number | readonly [number, number] | string>>;
  points: readonly string[];
  cite: Citation;
}

export const COMM_METHODS: readonly CommMethodInfo[] = [
  {
    id: 'powerLineCarrier', name: 'Power line carrier (PLC)',
    numbers: { frequencyKHz: [30, 500], maxPowerW: 100, typicalPowerW: 10, hybridLossDb: 3 },
    points: [
      'Being displaced by fiber but still used for relaying, voice and low-speed data; coupled through coupling capacitors (often also CCVT potential sources) with line traps on the station side to confine the signal.',
      'Line traps are parallel L-C circuits in series with the coupled phase, rated for the line BIL, current and short-circuit withstand, so physically large; line tuners match impedance and hybrids combine transmitters and receivers (3 dB loss each).',
      'Tuning: single-frequency resonant (lowest loss, least flexible), double-frequency resonant (two peaks, up to four frequencies with hybrids), wideband (high-pass, more loss, increasingly popular for many functions).',
      'Modulation: on/off (blocking schemes only; quiescent, so checkback testing is used), frequency-shift keying (continuous guard allows channel monitoring and can drive through an arcing fault), single sideband (little used in the US because of cost).',
    ],
    cite: { page: [700, 705], section: '17.3.1', figure: '17-1 to 17-4' },
  },
  {
    id: 'audioTone', name: 'Audio tone',
    numbers: { frequencyHz: [1000, 3000] },
    points: [
      'FSK only (no voice); mainly short-distance over wire lines; noise and frequency-translation detection add security.',
      'Always needs another medium to carry it (wire line, microwave, fiber, PLC or shield wire).',
    ],
    cite: { page: 705, section: '17.3.2' },
  },
  {
    id: 'shieldWire', name: 'Carrier or audio tone on insulated shield wire',
    numbers: { shieldWireInsulationKV: 15 },
    points: ['Uses insulated EHV shield wires (insulated to cut induced losses, gapped for lightning) through special protective couplers; not used for relaying because of lightning uncertainty, but a low-cost data/voice option.'],
    cite: { page: 706, section: '17.3.3' },
  },
  {
    id: 'microwave', name: 'Microwave',
    numbers: { minFrequencyMHz: 960, analogMaxChannels: 600, digitalMaxChannels: 2016, masBandMHz: [900, 960], masMinRemotes: 4 },
    points: [
      'Line-of-sight (repeaters for long paths); economical when many channels are needed between two points; most systems need an FCC license; path fading can be a problem.',
      'Digital (TDM/PCM) systems now dominate new installations and carry data efficiently; utilities buy monitored hot-standby radios and often parallel microwave with PLC for transmission relaying.',
      'Multiple address systems (MAS, 900-960 MHz) share one channel among four or more remotes, suit polled SCADA only, and are unsuitable for telephone or protective relaying.',
    ],
    cite: { page: [706, 708], section: '17.3.4', figure: '17-5, 17-6' },
  },
  {
    id: 'fiberOptics', name: 'Optical fiber',
    numbers: { opgwFibers: [6, 48], adssFibers: [4, 216], adssTypicalMaxKV: 69, ds1Mbps: 1.544, ds1VoiceChannels: 24, oc1Mbps: 51.84, oc1VoiceChannels: 672, oc3Mbps: 155.52, oc3VoiceChannels: 2016 },
    points: [
      'The technology of choice for most substation communications: immune to electrical interference with enormous capacity.',
      'OPGW puts 6-48 fibers inside the shield wire (no underbuild clearance problems, offsets new shield wire cost); ADSS (4-216 fibers, all-dielectric) suits distribution and subtransmission poles up to 69 kV and can enter the station without carrying GPR.',
      'Substation multiplexers (DS1, SONET OC-1, OC-3) carry voice, data and relaying with fault-tolerant rings; fiber links also isolate metallic telephone circuits from GPR.',
    ],
    cite: { page: [709, 711], section: '17.3.5', figure: '17-7, 17-8' },
  },
  {
    id: 'wireLine', name: 'Wire lines (leased telephone circuits)',
    numbers: {},
    points: [
      'Common for routine voice and data; circuits entering stations need high-voltage protection against GPR and induced voltage per IEEE Std 487-1992 (carbon blocks, gaps, gas tubes, neutralizing and isolating transformers, drainage reactors, optical couplers).',
      'Voice and data circuits may use carbon blocks that take the circuit out of service when they operate; relaying circuits must stay in service during and after faults (fiber isolators, insulating transformers, gas tubes with drainage reactors, neutralizing transformers; pilot wire with dc monitoring needs neutralizing transformers).',
      'Relaying over leased lines only if the telephone company provides adequately protected circuits.',
    ],
    cite: { page: [711, 712], section: '17.3.6', originalSource: 'IEEE Std 487-1992' },
  },
  {
    id: 'satelliteVsat', name: 'Satellite (VSAT)',
    numbers: { roundTripS: 0.239, messageDelayS: 0.5, equinoxOutageHoursPerYear: [1, 2] },
    points: [
      'Widely used for SCADA master-to-RTU links over very large areas; electric cooperatives are probably the largest utility users.',
      'Leased space segment billed by data volume; immune to wind, ice and lightning and needs no high-voltage isolation, but heavy rain and equinox sun outages (about 1-2 h/yr) interrupt it.',
      'About 0.5 s delay per message (two satellite round trips of at least 0.239 s each), so only for delay-tolerant data such as SCADA, not voice or protective relaying.',
    ],
    cite: { page: [712, 713], section: '17.3.7', note: 'NRECA/EPRI Project 91-10 developed UCA-compliant satellite technology for rural substations.' },
  },
];

export const COMM_DESIGN_RULES: readonly Guidance[] = [
  { id: 'cr-fiber-protection', text: 'Connect all IEDs engaged in protection with fiber-optic media.', cite: { page: 665, section: '14.4.5.1' }, tags: ['communications', 'relaying', 'design-check'] },
  { id: 'cr-vsat-no-relay', text: 'Do not use VSAT satellite links for voice or protective relaying.', cite: { page: 712, section: '17.3.7.1', table: '17-1' }, tags: ['communications', 'relaying', 'design-check'] },
  { id: 'cr-mas-scada-only', text: 'Use MAS radio only for polled SCADA, not telephone or relaying.', cite: { page: 707, section: '17.3.4.2' }, tags: ['communications', 'design-check'] },
  { id: 'cr-shield-wire-no-relay', text: 'Do not rely on carrier over insulated shield wire for protective relaying.', cite: { page: 706, section: '17.3.3' }, tags: ['communications', 'relaying', 'design-check'] },
  { id: 'cr-gpr-isolation', text: 'Metallic communication circuits entering the station need protection against GPR and induction (IEEE 487), or fiber isolation.', cite: { page: [709, 711], section: '17.3.5.2; 17.3.6' }, tags: ['communications', 'grounding', 'transferred-voltage', 'design-check'] },
  { id: 'cr-pott-no-plc', text: 'Permissive transfer-trip schemes need a trip signal through the fault, so power line carrier is not recommended for them (§12.4.2.2.1).', cite: { page: [619, 621], section: '12.4.2.2.1' }, tags: ['communications', 'relaying', 'design-check'] },
];
