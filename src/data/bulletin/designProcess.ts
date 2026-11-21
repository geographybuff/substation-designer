/**
 * Design-process data from RUS Bulletin 1724E-300, covering:
 * - Chapter 3, "Documents" (pp. 55-71): documents the engineer may produce, the Table 3-1
 *   design chronology, procurement, drawing quality, the 18 drawing types of §3.5.3 and the
 *   studies of §3.6.
 * - Chapter 3 Appendix A, "Typical Substation Drawing Checklist" (pp. 73-90). Highlights only.
 * - Chapter 3 Appendix B, "Substation Design Summary" (pp. 91-118): the data fields the form
 *   asks for.
 *
 * The game can use the chronology for project phases, the drawing types for deliverables, and
 * the design-summary fields to shape project briefs. 7 CFR and RUS form references are as
 * printed in 2001 and may since have been revised.
 */
import type { Citation, Guidance } from './types';

export const DESIGN_PROCESS_CITES = {
  general: { page: 55, section: '3.1' },
  possibleDocuments: { page: 55, section: '3.1.1' },
  needForDocumentation: { page: [55, 56], section: '3.2' },
  procedures: { page: 56, section: '3.3' },
  chronology: { page: 56, section: '3.3', table: '3-1' },
  procurement: { page: [56, 57], section: '3.4' },
  drawingsGeneral: { page: 57, section: '3.5.1' },
  drawingQuality: { page: [57, 59], section: '3.5.2' },
  cadd: { page: 58, section: '3.5.2.3' },
  drawingTypes: { page: 59, section: '3.5.3' },
  oneLineDiagrams: { page: [59, 70], section: '3.5.3.1', figure: '3-1 to 3-22', originalSource: 'IEEE Std 315' },
  cableLists: { page: 71, section: '3.5.3.2' },
  billsOfMaterial: { page: 71, section: '3.5.3.3' },
  drawingList: { page: 71, section: '3.5.3.4' },
  wiringDiagrams: { page: 71, section: '3.5.3.5', originalSource: 'ANSI Y14.15' },
  studies: { page: 71, section: '3.6' },
  appendixA: { page: [73, 90], section: 'Ch. 3 Appendix A' },
  appendixB: { page: [91, 118], section: 'Ch. 3 Appendix B' },
} as const satisfies Record<string, Citation>;

// ---------------------------------------------------------------------------
// §3.1-3.2: documents and why they matter
// ---------------------------------------------------------------------------

/** §3.1.1: documents or studies that may be required of the engineer (order and timing vary by project). */
export const POSSIBLE_DOCUMENTS: readonly string[] = [
  'Site Comparison and Suitability Evaluation',
  'Environmental Assessment (EA) or Environmental Report (ER)',
  'Substation Design Summary Form',
  'Functional One-Line Diagram',
  'Application for Zoning Variance or Change',
  'Specifications for Equipment',
  'Request for Proposals to Furnish Equipment',
  'Evaluation of Proposals to Furnish Equipment',
  'Construction Plan Drawings',
  'Backup Sketches and Calculations for Construction Plans',
  'Substation Drawings (Detailed One-Line, Elementary, and Schematic Diagrams)',
  'Requisitions for Material and Equipment',
  'Application for Building Permit',
  'Application for Permits for Roadway and Drainage Interface',
  'Application for FCC License',
  'Construction Specifications',
  'Inquiry for Proposals to Furnish Construction',
  "Evaluation of Contractor's Proposals",
  "Comment Letters on Equipment Vendors' Submittals",
  'Calculations for Selection of Protective Relaying and Devices',
  'Economic Comparisons',
];
export const POSSIBLE_DOCUMENTS_CITE: Citation = DESIGN_PROCESS_CITES.possibleDocuments;

export const DOCUMENTATION_GUIDANCE: readonly Guidance[] = [
  { id: 'doc-role', text: "The design engineer's main job is to produce, or supervise, the formal plans the substation is built from.", cite: { page: 55, section: '3.1' }, tags: ['documents'] },
  { id: 'doc-units', text: 'Because the utility industry specifies in English units, documents may use them, optionally with metric equivalents in parentheses.', cite: { page: 55, section: '3.1.1' }, tags: ['documents', 'units'] },
  { id: 'doc-sketches', text: 'Working sketches and calculations are not part of the formal plans but are worth keeping for planning and future reference.', cite: { page: 55, section: '3.1.1' }, tags: ['documents'] },
  { id: 'doc-agreement', text: 'A document is how the cooperative and engineer reach agreement; in final form it fixes the design and functional requirements and records what was built, specified or evaluated.', cite: { page: [55, 56], section: '3.2' }, tags: ['documents'] },
  { id: 'doc-records', text: 'Good records give templates for standardizing new substations and help diagnose and correct problems later; Appendix B (Design Summary) is the place to record design data.', cite: { page: 56, section: '3.2' }, tags: ['documents', 'records'] },
];

// ---------------------------------------------------------------------------
// §3.3 Table 3-1: design chronology
// ---------------------------------------------------------------------------

export type DesignPhaseId =
  | 'needs' | 'preLoanEngineering' | 'loanApplication' | 'loanApproval' | 'realEstate'
  | 'majorEquipment' | 'plansAndSpecs' | 'erectionContract' | 'rusDesignApproval'
  | 'contractorSelection' | 'construction' | 'inspection' | 'testing' | 'energizing';

export interface ChronologyStep {
  step: number;
  id: DesignPhaseId;
  name: string;
  /** Regulation or RUS form the bulletin points to for this step, as printed. */
  reference?: string;
  note?: string;
  cite: Citation;
}

const T31: Citation = DESIGN_PROCESS_CITES.chronology;

/** Table 3-1 (p. 56). Elapsed times vary by project; the bulletin gives no durations. */
export const TABLE_3_1_DESIGN_CHRONOLOGY: readonly ChronologyStep[] = [
  { step: 1, id: 'needs', name: 'Identify substation needs', note: "From the Load Forecast (formerly the Power Requirements Study) and the cooperative's long-range plan.", cite: T31 },
  { step: 2, id: 'preLoanEngineering', name: 'Pre-loan engineering', cite: T31 },
  { step: 3, id: 'loanApplication', name: 'Application for loan', reference: '7 CFR 1710.119, "Loan Processing Priorities"', cite: T31 },
  { step: 4, id: 'loanApproval', name: 'Loan approval', cite: T31 },
  { step: 5, id: 'realEstate', name: 'Final procurement of real estate', cite: T31 },
  { step: 6, id: 'majorEquipment', name: 'Selection of major equipment', cite: T31 },
  { step: 7, id: 'plansAndSpecs', name: 'Preparation of plans and specifications', reference: '7 CFR 1724.53, "Preparation of Plans and Specifications"', cite: T31 },
  { step: 8, id: 'erectionContract', name: 'Substation erection contract', reference: 'RUS Form 764, "Substation and Switching Station Erection Contract"', note: 'Generally required for systems with limited construction forces.', cite: T31 },
  { step: 9, id: 'rusDesignApproval', name: 'Design approval by RUS', reference: '7 CFR 1724.54, "Requirements for RUS approval of plans and specifications"', cite: T31 },
  { step: 10, id: 'contractorSelection', name: 'Selection of a construction contractor', note: 'When competitive bids are taken, the engineer acts as described in 7 CFR 1726.19 ("Use of Competitive Procurement").', cite: T31 },
  { step: 11, id: 'construction', name: 'Construction', cite: T31 },
  { step: 12, id: 'inspection', name: 'Inspection', reference: 'RUS Form 235 (Engineering Service Contract, Electric Substation Design and Construction); 7 CFR 1726.403, "Project Construction Contract Closeout"', cite: T31 },
  { step: 13, id: 'testing', name: 'Testing', cite: T31 },
  { step: 14, id: 'energizing', name: 'Energizing', cite: T31 },
];

export const PROCEDURE_GUIDANCE: readonly Guidance[] = [
  { id: 'proc-rus-coop', text: 'RUS prescribes required design procedures, and each cooperative may add its own; the general order is Table 3-1, with elapsed times set by the project.', cite: { page: 56, section: '3.3', originalSource: '7 CFR 1726.22; 7 CFR 1724.53' }, tags: ['procedure', 'schedule'] },
  { id: 'proc-gfr', text: 'The RUS General Field Representative (GFR) can help with the applicable RUS requirements.', cite: { page: 56, section: '3.3' }, tags: ['procedure'] },
];

// ---------------------------------------------------------------------------
// §3.4 Procurement
// ---------------------------------------------------------------------------

export const PROCUREMENT_METHODS = [
  { id: 'informal', name: 'Purchase order following informal quotations' },
  { id: 'formal', name: 'Contract and purchase order following formal competitive bidding' },
] as const;
export const PROCUREMENT_METHODS_CITE: Citation = { page: 56, section: '3.4' };

/** Documents governing material and equipment selection, as listed on p. 57. */
export const PROCUREMENT_REFERENCES: readonly string[] = [
  '7 CFR 1728, "Electric Standards and Specifications for Materials and Construction"',
  '7 CFR 1726.22, "Methods of Construction"',
  'Information Publication 202-1, "List of Materials Acceptable for Use on Systems of RUS Electrification Borrowers"',
  '7 CFR 1726.21, "New Materials"',
  'Bulletin 43-9, "\'Buy American\' Requirement" (as updated at 62 FR 7205, Feb. 19, 1997)',
  '7 CFR 1728.20, "Establishment of Standards and Specifications"',
];
export const PROCUREMENT_REFERENCES_CITE: Citation = { page: 57, section: '3.4' };

export const PROCUREMENT_GUIDANCE: readonly Guidance[] = [
  { id: 'proc-lead-time', text: 'Long lead times for major or special equipment often make buying equipment in increments the better choice.', cite: { page: 57, section: '3.4' }, tags: ['procurement', 'schedule'] },
  { id: 'proc-package', text: 'Small projects suit "standard package" procurement, while large projects may need many vendors.', cite: { page: 57, section: '3.4' }, tags: ['procurement'] },
];

// ---------------------------------------------------------------------------
// §3.5 Drawings
// ---------------------------------------------------------------------------

export const DRAWING_GUIDANCE: readonly Guidance[] = [
  { id: 'dwg-minimum-set', text: 'For a basic distribution substation, the engineer may only need to custom-make a One-Line Diagram and a Plot Plan; on a small station, the foundation and grounding details can go on the plot plan.', cite: { page: 57, section: '3.5.1' }, tags: ['drawings', 'distribution'] },
  { id: 'dwg-larger', text: 'Larger substations need more documentation; RUS Form 235 gives a basic list of drawings that are often needed.', cite: { page: 57, section: '3.5.1' }, tags: ['drawings'] },
  { id: 'dwg-ansi', text: 'Follow ANSI Std Y14 drafting practice; prints get used in the field, so show the needed dimensions and interfaces so nobody has to scale the drawing.', cite: { page: 57, section: '3.5.2.2', originalSource: 'ANSI Y14 (American Drafting Standards Manual)' }, tags: ['drawings', 'quality'] },
  { id: 'dwg-bar-scale', text: 'Use bar-type graphic scales because drawings are often reproduced at different sizes, and note tolerances such as anchor-bolt locations and panel mounting holes.', cite: { page: 57, section: '3.5.2.2' }, tags: ['drawings', 'quality'] },
  { id: 'dwg-legend', text: 'Put a full legend, including special symbols, on the first sheet of each drawing type; use IEEE Std 315 electrical symbols and prefer added details over long lists of notes.', cite: { page: 58, section: '3.5.2.4', originalSource: 'IEEE Std 315' }, tags: ['drawings', 'symbols'] },
  { id: 'dwg-titles-approvals', text: 'Titles should be concise and specific, reference drawings should be listed coherently, and every drawing and revision must show its approvals and dates.', cite: { page: [58, 59], section: '3.5.2.5-3.5.2.7' }, tags: ['drawings', 'quality'] },
  { id: 'dwg-checklists', text: 'The bulletin recommends using checklists (Appendix A) as a design quality-control tool.', cite: { page: 59, section: '3.5.3' }, tags: ['drawings', 'quality'] },
  { id: 'dwg-one-line-first', text: 'One-line diagrams are the main substation reference drawings and should be prepared first; switching and relaying information may share one diagram if it stays readable.', cite: { page: 59, section: '3.5.3.1' }, tags: ['drawings', 'one-line'] },
  { id: 'dwg-one-line-symbols', text: 'Figures 3-1 to 3-19 show acceptable symbols, mostly based on IEEE Std 315; each symbol should be accompanied by its pertinent equipment data.', cite: { page: [59, 67], section: '3.5.3.1', figure: '3-1 to 3-19', originalSource: 'IEEE Std 315; IEEE C37.2-1996 (Fig 3-19)' }, tags: ['drawings', 'one-line', 'symbols'] },
  { id: 'dwg-two-one-lines', text: 'Except for simpler substations, it is desirable to have both a switching one-line and a functional relaying one-line (see Figs 3-21 and 3-22).', cite: { page: 66, section: '3.5.3.1', figure: '3-20 to 3-22' }, tags: ['drawings', 'one-line', 'relaying'] },
  { id: 'dwg-cable-list', text: 'Cables can be identified on a conduit layout when there are few; large stations generally need a separate cable identification list.', cite: { page: 71, section: '3.5.3.2' }, tags: ['drawings', 'cables'] },
  { id: 'dwg-list', text: "Every substation should have a drawing list, which at the cooperative's and engineer's discretion can include manufacturers' drawings, design calculations and standard drawings.", cite: { page: 71, section: '3.5.3.4' }, tags: ['drawings'] },
  { id: 'dwg-wiring', text: 'Prepare schematic and detailed wiring diagrams per ANSI Std Y14.15.', cite: { page: 71, section: '3.5.3.5', originalSource: 'ANSI Y14.15, "Electrical and Electronic Diagrams"' }, tags: ['drawings', 'wiring'] },
];

/** §3.5.2.3.2: parameters to set up before creating any CADD drawings (paraphrased). */
export const CADD_STARTUP_PARAMETERS: readonly string[] = [
  'Decide the key drawing criteria: what each drawing must show.',
  'Set legends for the symbols to be used.',
  'Standardize line weights and text sizes.',
  'Set standard layer or level schemes.',
  'Allow layers to be isolated and other files to be referenced.',
  'Allow a change in one file to carry through to related drawings.',
  'Keep a cell or block library of frequently reused items in a standard location.',
  'Create seed or prototype files as the base for new drawings.',
];
/** §3.5.2.3.3: manual detailing practices that still apply to CADD (paraphrased). */
export const CADD_DETAILING_GUIDELINES: readonly string[] = [
  'Draw to scale where possible.',
  'Dimension clearly.',
  'Choose line weights and text sizes carefully, using standard sizes.',
  'Do not over-detail just because CADD makes it easy (e.g. bolt threads).',
  "Follow the cooperative's detailing standards or coordinate with its key design staff.",
  "Don't draw in CADD a detail you wouldn't draw in ink on mylar.",
  "Avoid translating between vendors' CADD formats; use the cooperative's standard software.",
  'Avoid mixing CADD packages on a project or within a cooperative.',
];
export const CADD_CITE: Citation = DESIGN_PROCESS_CITES.cadd;

export type DrawingTypeId =
  | 'oneLineSwitching' | 'oneLineRelaying' | 'threeLine' | 'electricalPlotPlan' | 'sitePreparation'
  | 'fenceLayout' | 'electricalLayouts' | 'structureErection' | 'foundationLayouts' | 'groundingLayout'
  | 'conduitLayout' | 'controlHouse' | 'stationService' | 'cableConduitLists' | 'billsOfMaterial'
  | 'drawingList' | 'controlPanels' | 'wiringDiagrams';

export interface DrawingType {
  n: number;
  id: DrawingTypeId;
  name: string;
  note?: string;
  cite: Citation;
}

const D353: Citation = DESIGN_PROCESS_CITES.drawingTypes;

/** §3.5.3 (p. 59): the main construction and reference drawings often required. */
export const DRAWING_TYPES: readonly DrawingType[] = [
  { n: 1, id: 'oneLineSwitching', name: 'One-Line Diagram - Switching', note: 'Prepare first (§3.5.3.1).', cite: D353 },
  { n: 2, id: 'oneLineRelaying', name: 'One-Line Diagram - Functional Relaying', note: 'May be combined with the switching one-line if not too complicated.', cite: D353 },
  { n: 3, id: 'threeLine', name: 'Three-Line Diagram', cite: D353 },
  { n: 4, id: 'electricalPlotPlan', name: 'Electrical Plot Plan', note: 'On small stations it can also carry foundation and grounding details (§3.5.1).', cite: D353 },
  { n: 5, id: 'sitePreparation', name: 'Site Preparation', cite: D353 },
  { n: 6, id: 'fenceLayout', name: 'Fence Layout', cite: D353 },
  { n: 7, id: 'electricalLayouts', name: 'Electrical Layouts', cite: D353 },
  { n: 8, id: 'structureErection', name: 'Structure Erection Diagrams', cite: D353 },
  { n: 9, id: 'foundationLayouts', name: 'Foundation Layouts', cite: D353 },
  { n: 10, id: 'groundingLayout', name: 'Grounding Layout', cite: D353 },
  { n: 11, id: 'conduitLayout', name: 'Conduit Layout', cite: D353 },
  { n: 12, id: 'controlHouse', name: 'Control House - Architectural, Equipment, Layout, Lighting, Etc.', cite: D353 },
  { n: 13, id: 'stationService', name: 'Station Service Diagrams AC and DC', cite: D353 },
  { n: 14, id: 'cableConduitLists', name: 'Cable Lists and Conduit Lists', note: 'See the cable ID scheme (§3.5.3.2).', cite: D353 },
  { n: 15, id: 'billsOfMaterial', name: 'Bills of Material', note: 'Minimum content per §3.5.3.3.', cite: D353 },
  { n: 16, id: 'drawingList', name: 'Drawing List', cite: D353 },
  { n: 17, id: 'controlPanels', name: 'Control Panels', cite: D353 },
  { n: 18, id: 'wiringDiagrams', name: 'Schematic and Detailed Wiring Diagrams', note: 'Per ANSI Y14.15 (§3.5.3.5).', cite: D353 },
];

/** Bulletin figure numbers for the one-line symbols (Figs 3-1 to 3-19), for a symbol library. */
export const ONE_LINE_SYMBOL_FIGURES: readonly { figure: string; subject: string; page: number }[] = [
  { figure: '3-1', subject: 'Power transformer (with LTC on low-voltage side)', page: 60 },
  { figure: '3-2', subject: 'Three-phase transformer with tertiary', page: 60 },
  { figure: '3-3', subject: 'Three-phase autotransformer', page: 60 },
  { figure: '3-4', subject: 'Step voltage regulator with bypass switch', page: 61 },
  { figure: '3-5', subject: 'Hook stick-operated disconnecting switch', page: 61 },
  { figure: '3-6', subject: 'Three-phase gang-operated disconnecting switch with horn gaps and grounding switch', page: 61 },
  { figure: '3-7', subject: 'Three-phase double side-break disconnecting switch with motor operator', page: 62 },
  { figure: '3-8', subject: 'Fused disconnect', page: 62 },
  { figure: '3-9', subject: 'Oil circuit recloser', page: 63 },
  { figure: '3-10', subject: 'Circuit breaker (with bushing CTs and reclosing relay)', page: 63 },
  { figure: '3-11', subject: 'Surge arrester', page: 63 },
  { figure: '3-12', subject: 'Voltage transformer', page: 64 },
  { figure: '3-13', subject: 'Current transformer (show polarity marks on the functional relaying one-line)', page: 64 },
  { figure: '3-14', subject: 'Coupling capacitor with voltage transformer', page: 64 },
  { figure: '3-15', subject: 'Coupling capacitor, wave trap, tuning unit and power line carrier transmitter/receiver', page: 64 },
  { figure: '3-16', subject: 'Disconnecting clamp', page: 65 },
  { figure: '3-17', subject: 'Shunt capacitor', page: 65 },
  { figure: '3-18', subject: 'Miscellaneous one-line diagram symbols', page: 66 },
  { figure: '3-19', subject: 'Typical relay and meter representation (IEEE C37.2-1996 device numbers)', page: 67 },
];
export const ONE_LINE_SYMBOL_FIGURES_CITE: Citation = {
  page: [60, 67], section: '3.5.3.1', figure: '3-1 to 3-19', originalSource: 'IEEE Std 315 (1975); IEEE C37.2-1996 (Fig 3-19)',
};

/**
 * Fig 3-20 (p. 68): the bulletin's conceptual one-line of a transmission substation, read from
 * the figure. It is only meant to illustrate symbols (p. 66), not to recommend a design.
 */
export const CONCEPTUAL_ONE_LINE_EXAMPLE = {
  description: 'Transmission substation, 161 kV to 69 kV, two transformers',
  hv: {
    kV: 161, bus: '161 kV bus (single bus as drawn)',
    lineBreakers: [{ line: '161-17', breaker: '277' }, { line: '161-20', breaker: '177' }],
    transformerBreakers: [{ transformer: 'Transf. 2', breaker: '299' }, { transformer: 'Transf. 1', breaker: '199' }],
  },
  lv: {
    kV: 69, bus: '69 kV main bus and 69 kV transfer bus (main-and-transfer)',
    transformerBreakers: [{ transformer: 'Transf. 2', breaker: '266' }, { transformer: 'Transf. 1', breaker: '166' }],
    lineBreakers: [
      { line: '69-30', breaker: '688' }, { line: '69-7', breaker: '188' }, { line: '69-21', breaker: '588' },
      { line: '69-19', breaker: '488' }, { line: '69-8', breaker: '388' }, { line: '69-2', breaker: '288' },
    ],
    busTieBreaker: '155',
    note: 'Each 69 kV line has a bypass switch to the transfer bus; the transformer low-side positions are drawn without one.',
  },
  cite: { page: [66, 68], section: '3.5.3.1', figure: '3-20', note: 'Breaker numbers as printed; the bulletin does not explain the numbering scheme.' } as Citation,
} as const;

/**
 * Figs 3-21/3-22 (pp. 69-70): partial switching and functional relaying one-lines for 161 kV line
 * 161-20. Current-transformer allocation read from Fig 3-22, listed from the line side to the bus side.
 */
export const FUNCTIONAL_RELAYING_ONE_LINE_EXAMPLE = {
  line: '161-20',
  communication: 'Line trap plus coupling capacitor, tuning unit and carrier transmitter/receiver (power line carrier)',
  currentTransformers: [
    { position: 'line side of breaker', ratio: '2000-5A MR', connected: '500-5A', connection: 'delta', use: 'Bus differential relaying' },
    { position: 'line side of breaker', ratio: '2000-5A MR', connected: '200-5A', connection: 'wye', use: 'Backup relaying' },
    { position: 'bus side of breaker', ratio: '2000-5A MR', connected: '800-5A', connection: 'wye', use: 'Primary relaying' },
    { position: 'bus side of breaker', ratio: '2000-5A MR', connected: '600-5A', connection: 'wye', use: 'Metering' },
  ],
  deviceNumbersShown: ['21', '25/27', '50G', '67', '79', '94'],
  cite: { page: [69, 70], section: '3.5.3.1', figure: '3-21, 3-22', note: 'UNCERTAIN: device labels were read from the small figure print; "MR" = multi-ratio. The carrier T/R box is labelled "100 Hz" as printed, which looks like a misprint, so the frequency is omitted.' } as Citation,
} as const;

// §3.5.3.2 cable identification scheme -----------------------------------------------------

export interface CableId {
  /** Equipment row centerline letter (series A, B, C, D ...). */
  rowLetter: string;
  /** Perpendicular row centerline number (series 1, 2, 3 ...). */
  columnNumber: number;
  /** Function numeral; the bulletin's example uses 3 for a control cable. */
  functionCode: number;
}

/** Only code 3 (control) is given; the bulletin says other numerals can denote other functions. */
export const CABLE_FUNCTION_CODES: Readonly<Record<number, string>> = { 3: 'control' };
export const CABLE_ID_CITE: Citation = DESIGN_PROCESS_CITES.cableLists;

export function formatCableId(c: CableId): string {
  return `${c.rowLetter.toUpperCase()}${c.columnNumber}-${c.functionCode}`;
}

/** Parse ids like "C4-3"; returns null for strings that do not follow the scheme. */
export function parseCableId(s: string): CableId | null {
  const m = /^([A-Za-z]+)(\d+)-(\d+)$/.exec(s.trim());
  if (!m) return null;
  return { rowLetter: m[1]!.toUpperCase(), columnNumber: Number(m[2]), functionCode: Number(m[3]) };
}

/** Worked example from §3.5.3.2: a control cable from a breaker at grid location C4. */
export const CABLE_ID_EXAMPLE = {
  id: 'C4-3',
  parsed: { rowLetter: 'C', columnNumber: 4, functionCode: 3 } as CableId,
  meaning: 'Control cable whose one end is at the circuit breaker at grid location C4 (row C crossed by centerline 4)',
  cite: CABLE_ID_CITE,
} as const;

/** §3.5.3.3: minimum information a bill-of-materials format should include. */
export const BILL_OF_MATERIALS_MIN_FIELDS: readonly string[] = [
  'Identification of the substation',
  'Alphanumeric code name used on construction drawings for identification and location',
  'Adequate description of each item',
  'Reference to the applicable purchasing document',
  'Quantity of the item',
  'Reference to the drawing(s) showing the item for installation',
];
export const BILL_OF_MATERIALS_CITE: Citation = DESIGN_PROCESS_CITES.billsOfMaterial;

// ---------------------------------------------------------------------------
// §3.6 Studies
// ---------------------------------------------------------------------------

export const DESIGN_STUDIES = [
  { id: 'feasibility', name: 'Feasibility studies' },
  { id: 'economic', name: 'Economic comparisons' },
  { id: 'voltageDrop', name: 'Voltage-drop calculations for control and auxiliary power circuits' },
  { id: 'busComparison', name: 'Rigid versus strain bus design comparisons' },
  { id: 'structural', name: 'Structural design calculations' },
] as const;
export const DESIGN_STUDIES_CITE: Citation = DESIGN_PROCESS_CITES.studies;
export const DESIGN_STUDIES_GUIDANCE: Guidance = {
  id: 'studies-retain', text: 'Many substations need studies such as these (the list is open-ended); keep the results and calculations with the rest of that substation\'s documents.',
  cite: DESIGN_PROCESS_CITES.studies, tags: ['studies', 'records'],
};

// ---------------------------------------------------------------------------
// Appendix A: Typical Substation Drawing Checklist (highlights)
// ---------------------------------------------------------------------------

export type ChecklistSectionId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q';

/** "General - for all drawings" items (p. 74), condensed. */
export const CHECKLIST_GENERAL_ITEMS: readonly string[] = [
  'Title block', "Engineer's seal", 'Drawing dates (issued for owner approval)', 'Revision block',
  'Signature lines: detailed, designed, checked (one engineer may not check all contract drawings)',
  'Symbology matches the Legend drawing', 'Coordinate system on border margins',
  'Material, size and identification satisfactory to the cooperative', 'Reproducible line work and lettering',
  'Smallest lettering readable at the smallest planned reduction', 'Organized to minimize field inconvenience',
  'No ambiguity, incompleteness or misleading emphasis', 'Legends, notes and symbols checked',
  'Appropriate drawings referenced', 'All cooperative or RUS changes incorporated',
  'Plans, sections, elevations, details and panel layouts: bar scale and view designation/title',
  'Plans, plan-view details, one-lines and three-lines: north arrow (grid, true or magnetic)',
];
export const CHECKLIST_GENERAL_CITE: Citation = { page: 74, section: 'Ch. 3 Appendix A' };

export interface ChecklistSection {
  id: ChecklistSectionId;
  title: string;
  /** Selected items, condensed (not the full checklist). */
  highlights: readonly string[];
  cite: Citation;
}

const AA = (page: number | [number, number]): Citation => ({ page, section: 'Ch. 3 Appendix A' });

export const CHECKLIST_SECTIONS: readonly ChecklistSection[] = [
  { id: 'A', title: 'Cover Sheet/Index', highlights: ['Engineer\'s seal, cooperative name and logo', 'Project description, contract number and name, project number, year', 'List of contract drawings and reference drawings', 'Vicinity map with north arrow'], cite: AA(74) },
  { id: 'B', title: 'Legend', highlights: ['Every symbol used in the set; no separate legends on other drawings except complex civil site grading plans'], cite: AA(75) },
  { id: 'C', title: 'Elementary One-Line Diagram(s)', highlights: ['Substation names and voltages', 'Breakers with PCB numbers; disconnect switches with numbers', 'Line and major equipment designations, phasing, future equipment', 'Transmission line length, conductor/stranding and transpositions', 'Bus drawn in its relative physical location where possible', 'Interties with phasing difference between utilities', 'Power fuses'], cite: AA(75) },
  { id: 'D', title: 'Relay One-Line Diagram(s)', highlights: ['Incoming lines, switches, arrester quantity and rating', 'Power transformer box: winding type, phasing, bushings, neutral/ground, voltage, MVA and cooling ratings, HV/LV taps, LTC, impedances, winding diagram', 'Power fuses with continuous rating; station service transformer data', 'Breakers: bushing pole numbers, designation, continuous rating, breaker number', 'CCVT/CVT/PT windings, ratios and phase; line trap rating', 'CTs: orientation, polarity marks, wye/delta, maximum and connected ratio; unused CTs shorted', 'Control logic drawn short, with few crossings and arrowheads toward the direction of action'], cite: AA([75, 77]) },
  { id: 'E', title: 'General Arrangement Plan', highlights: ['First transmission structure outside the fence, with coordinates', 'At least two survey monuments with elevations tied to the substation baselines', 'Transmission line right-of-way, property lines and other utility corridors', 'Borrow/waste, trash and storage areas; site access', 'Vicinity map tied to state plane coordinates'], cite: AA([77, 78]) },
  { id: 'F', title: 'Site Plans, Sections, and Details', highlights: ['Baseline, benchmark, fence coordinates, state plane grid', 'New and existing grade, buried facilities, borrow area, access roads', 'Sections showing fence, baseline, elevations and grades', 'Fence and gate details'], cite: AA(78) },
  { id: 'G', title: 'Substation Plan, Sections, and Details', highlights: ['Fence and warning signs', 'All equipment and structures, including static masts, cable trench and designated drive paths', 'Bus details (end bells, grounding studs, jumpers, strain bus, bus cutting schedule) and phasing', 'Fence-to-equipment dimensions, future equipment', 'Sections: conductor takeoff heights and maximum tensions, bus support type (slip, fixed, expansion), area lighting'], cite: AA([78, 79]) },
  { id: 'H', title: 'Foundation Plan and Details', highlights: ['Foundation key, top-of-concrete elevations, baselines, monuments, buried facilities, fence', 'Foundations for equipment, deadends, static masts, control building, cable trench and oil containment', 'Dimensions to foundation centerlines; manholes and handholes', 'Drilled shaft schedule and anchor bolt details/locations'], cite: AA([79, 80]) },
  { id: 'I', title: 'Structure Plan and Details', highlights: ['Usually combined with the Substation Plan; a separate drawing only for complex stations', 'Loading table, baselines, monuments, dimensions to structure centerlines'], cite: AA(80) },
  { id: 'J', title: 'Grounding Plan and Details', highlights: ['Baseline and grid dimensions where needed', 'Cable trench ground, fence ground, switch operator mat, riser locations', 'Bill of material for each conductor size', 'Typical equipment, structure, power transformer, switch, and fence and gate grounding details'], cite: AA(81) },
  { id: 'K', title: 'Raceway Plan and Details', highlights: ['Raceway schedule; conduit and direct-buried cable routing and designations', 'Cable trench, yard lighting and receptacles, manholes and handholes'], cite: AA(81) },
  { id: 'L', title: 'Duct Bank and High-Voltage Cable Plan and Details', highlights: ['Duct bank curve data (delta, radius, length, tangent), stationing, northing/easting of the ends', 'Profiles and sections: duct size, quantity and arrangement, reinforcing, depth, backfill and clearances'], cite: AA([81, 82]) },
  { id: 'M', title: 'Control Building Plans, Sections, and Details', highlights: ['Equipment plan: panelboards, batteries, charger, AC/DC panels, eye wash, fuse boxes, fire extinguisher, exit sign', 'Raceway plan with cable tray and building cable trench', 'Lighting and grounding plan: lights, switches, receptacles, ground conductors and connections', 'HVAC and architectural plans may be done by those disciplines'], cite: AA([82, 83]) },
  { id: 'N', title: 'Substation Bill of Materials', highlights: ['May be kept in database format'], cite: AA(83) },
  { id: 'O', title: 'Relay Control Panel (Switchboard) Layouts and Wiring Diagrams', highlights: ['Front view: panel designation, mimic bus, relays, control and test switches, future relays and panels', 'Nameplate schedule and relay bill of material', 'Wiring diagrams: device graphics with terminals and a termination list beside each device, terminal blocks with external and panel-to-panel circuits'], cite: AA([83, 84]) },
  { id: 'P', title: 'Three-Line Diagrams, AC and DC Schematics', highlights: ['Power three-line: three phases, physically oriented, with phasing', 'Breakers, switches, arresters, CCVT/PT and CT details (orientation, polarity, ratios)', 'Circuit designations per circuit schedule, with color-coded conductors and spares', 'AC current/potential schematics, DC trip and close schematics, SCADA and alarm schematics with a SCADA point list'], cite: AA([84, 89]) },
  { id: 'Q', title: 'Miscellaneous Equipment Yard External Connection Diagrams', highlights: ['Schematic reference, notes defining terms and non-legend symbols, device graphic'], cite: AA([89, 90]) },
];

/**
 * Game-side cross-reference from §3.5.3 drawing types to Appendix A checklist sections. The
 * bulletin does not give this mapping; it is inferred from matching titles.
 */
export const DRAWING_TYPE_CHECKLIST_MAP: Readonly<Record<DrawingTypeId, readonly ChecklistSectionId[]>> = {
  oneLineSwitching: ['C'], oneLineRelaying: ['D'], threeLine: ['P'], electricalPlotPlan: ['E', 'G'],
  sitePreparation: ['F'], fenceLayout: ['F', 'G'], electricalLayouts: ['G'], structureErection: ['I'],
  foundationLayouts: ['H'], groundingLayout: ['J'], conduitLayout: ['K', 'L'], controlHouse: ['M'],
  stationService: ['P'], cableConduitLists: ['K'], billsOfMaterial: ['N'], drawingList: ['A'],
  controlPanels: ['O'], wiringDiagrams: ['O', 'P', 'Q'],
};
export const DRAWING_TYPE_CHECKLIST_MAP_CITE: Citation = {
  page: [59, 90], section: '3.5.3; Ch. 3 Appendix A',
  note: 'UNCERTAIN: inferred mapping by title; the bulletin does not cross-reference the two lists.',
};

// ---------------------------------------------------------------------------
// Appendix B: Substation Design Summary (data fields)
// ---------------------------------------------------------------------------

export interface SummaryField {
  /** Field label, condensed from the form. */
  label: string;
  /** Unit as printed (metric first). */
  unit?: string;
  /** Imperial unit printed in parentheses, if any. */
  unitImperial?: string;
  /** Choices printed on the form. */
  options?: readonly string[];
  /** Symbol as printed (grounding section). */
  symbol?: string;
  /** Exported function in this repo that computes the value, if any. */
  computedBy?: string;
  note?: string;
}

export interface SummarySection {
  /** Section number on the form, e.g. "9.3". */
  id: string;
  title: string;
  /** Bulletin chapter that explains this topic (form sections mirror chapters 1-17). */
  chapter: number;
  /** The form repeats the block for each of these, e.g. "each voltage". */
  repeatPer?: string;
  fields: readonly SummaryField[];
  cite: Citation;
}

function F(label: string, unit?: string, unitImperial?: string, extra?: Omit<SummaryField, 'label' | 'unit' | 'unitImperial'>): SummaryField {
  const f: SummaryField = { label, ...extra };
  if (unit !== undefined) f.unit = unit;
  if (unitImperial !== undefined) f.unitImperial = unitImperial;
  return f;
}
const O = (label: string, options: readonly string[], unit?: string): SummaryField => F(label, unit, undefined, { options });
const AB = (page: number | [number, number], id: string, note?: string): Citation =>
  note ? { page, section: `Ch. 3 Appendix B, ${id}`, note } : { page, section: `Ch. 3 Appendix B, ${id}` };

const BUS_CONFIGS = ['single bus', 'sectionalized bus', 'main and transfer bus', 'ring bus', 'breaker-and-a-half', 'double breaker-double bus'] as const;
const YES_NO = ['yes', 'no'] as const;

export const DESIGN_SUMMARY_GUIDANCE: readonly Guidance[] = [
  { id: 'ds-living', text: 'The design summary records basic substation requirements and is updated from initial design to in-service; together with its supporting documents it becomes the complete record of the substation.', cite: AB(94, '1.1'), tags: ['documents', 'records'] },
  { id: 'ds-revisions', text: 'Each revision is lettered with preparer and date, and revised items are flagged in the left margin.', cite: AB(94, '1.2'), tags: ['documents'] },
];

export const DESIGN_SUMMARY_SECTIONS: readonly SummarySection[] = [
  // 1 Introduction
  { id: '1.2', title: 'Basic identification data', chapter: 1, fields: [F('Substation name'), F("Cooperative's designation and name"), F('Location'), F('Summary prepared by / date'), F('Revision letter, preparer and date')], cite: AB(94, '1.2') },
  { id: '1.3.1', title: 'Schedule: pre-design (proposed or record dates)', chapter: 3, fields: [F('Environmental Assessment or Environmental Report'), F('Site purchase and title clearance'), F('Topographical survey'), F('Ambient noise level survey'), F('Surrounding land use survey'), F('Soil borings'), F('Soil resistivity measurements')], cite: AB(94, '1.3.1') },
  { id: '1.3.2', title: 'Schedule: design', chapter: 3, fields: [F('One-line diagram and general layout for cooperative approval'), F('Detailed design for cooperative approval', undefined, undefined, { note: 'Separate submittals can be listed: foundations, structures, electrical below grade, electrical above grade, protective relaying.' }), F('Design complete')], cite: AB(94, '1.3.2') },
  { id: '1.3.3', title: 'Schedule: procurement', chapter: 3, repeatPer: 'each set of equipment, material and hardware', fields: [F('Specification for cooperative approval'), F('Bid invitation'), F('Pre-bid meeting (sometimes advantageous)'), F('Bids received'), F('Bid opening (usually construction only)'), F('Evaluation of bids'), F('Pre-award meeting (sometimes advantageous)'), F('Contract award'), F('Delivery')], cite: AB([94, 95], '1.3.3') },
  { id: '1.3.4', title: 'Schedule: construction', chapter: 3, fields: [F('Begin construction'), F('Complete site grading'), F('Complete drainage'), F('Complete roadways'), F('Complete fence'), F('Begin foundations, conduit and grounding'), F('Complete below grade'), F('Begin above grade'), F('Complete outdoor yard'), F('Complete control house'), F('Complete testing'), F('Complete inspection'), F('In service')], cite: AB(95, '1.3.4') },
  { id: '1.4', title: 'Permits and licenses', chapter: 3, fields: [F('All permits and licenses needed before and during construction')], cite: AB(95, '1.4') },
  { id: '1.5', title: 'References', chapter: 3, fields: [F('Power requirements study'), F('Two-Year Work Plan'), F('Conceptual one-line diagram')], cite: AB(95, '1.5') },
  // 2 Design considerations
  { id: '2.1.1', title: 'Nominal operating voltages', chapter: 2, repeatPer: 'each voltage', fields: [F('Voltage', 'kV'), F('Design BIL', 'kV'), O('Connection', ['delta', 'wye']), F('Phase rotation'), F('Phase displacement with respect to other voltages (leads or lags)')], cite: AB(95, '2.1') },
  { id: '2.1.2', title: 'Capacity and connections', chapter: 2, fields: [
    F('Voltage transformation HV/LV: initial capacity', 'MVA', undefined, { note: 'Per transformation.' }),
    F('Voltage transformation HV/LV: ultimate capacity', 'MVA'),
    F('Circuit connections per voltage: initial and final quantity'),
    O('Bus configuration per nominal bus voltage: initial and ultimate', BUS_CONFIGS),
    F('Ampacity per bus or circuit: continuous', 'A'), F('Ampacity per bus or circuit: 24-hour temporary', 'A'),
    F('Ultimate power supply fault: three-phase', 'A'), F('Ultimate power supply fault: phase-to-phase', 'A'), F('Ultimate power supply fault: phase-to-ground', 'A'),
    F('Maximum permissible fault clearing time', 's'),
  ], cite: AB(96, '2.1') },
  { id: '2.2', title: 'Site', chapter: 2, fields: [F('Unusual design constraints imposed by the site')], cite: AB(96, '2.2') },
  { id: '2.3', title: 'Environmental', chapter: 2, fields: [F('Design is per the EA or ER (identify)'), F('Property and adjacent land use'), F('Other uses besides the substation (e.g. storage)'), F('Measures to enhance appearance'), F('Unusual cost items for public safety'), F('Rationale for noise contribution'), F('Expected electrostatic and electromagnetic effects'), F('Rationale for effluent design (pollution prevention plan if indicated)')], cite: AB([96, 97], '2.3') },
  { id: '2.3.1-2.3.2', title: 'Weather and temperatures', chapter: 2, fields: [F('Severe local conditions the station is not designed to withstand'), F('Measures for special local conditions'), F('Average annual maximum temperature', '°C', '°F'), F('Average annual minimum temperature', '°C', '°F'), F('Highest recorded temperature', '°C', '°F'), F('Lowest recorded temperature', '°C', '°F')], cite: AB(97, '2.3.1-2.3.2') },
  { id: '2.3.3', title: 'Wind and ice loading', chapter: 2, repeatPer: 'line support structures, equipment support structures and conductors', fields: [F('Wind velocity', 'km/hr', 'mph'), F('Wind safety factor'), F('Gusts', 'km/hr', 'mph'), F('Gust safety factor'), F('Ice thickness', 'cm', 'in.'), F('Ice safety factor')], cite: AB(97, '2.3.3') },
  { id: '2.3.4-2.3.8', title: 'Precipitation, altitude, seismic, wildlife, airborne material', chapter: 2, fields: [F('Design rainfall amount', 'cm/hr', 'in./hr'), F('Design rainfall period', 'hours'), F('Frequency of storm occurrence'), F('Design snowfall: maximum drift depth', 'm', 'ft'), F('Isokeraunic level', 'thunderstorm days per year'), F('Humidity design measures'), F('Altitude above mean sea level', 'm', 'ft'), F('Seismic risk zone'), F('Unusual wildlife protection measures'), F('Airborne foreign material protected against')], cite: AB([97, 98], '2.3.4-2.3.8') },
  // 3 Documents
  { id: '3.1-3.6', title: 'Documents', chapter: 3, fields: [F('Authorizing document for design'), F('Distribution of documents: description, recipient, copies of specs, full-size and half-size drawings', undefined, undefined, { note: 'Table 3-2 (p. 99) gives a typical distribution list.' }), F('Name and address of the RUS General Field Representative'), F('Procurement: major equipment, construction contracts, and equipment/materials/hardware with manufacturer or contractor, contract and PO numbers'), F('Drawing list (with the contract or PO each drawing belongs to)'), F('Studies required')], cite: AB([98, 100], '3') },
  // 4 Physical layout
  { id: '4.1-4.2', title: 'Substation type and type of design', chapter: 4, fields: [O('Substation type', ['distribution', 'transmission', 'switching']), O('Type of design', ["cooperative's standard", 'packaged', 'custom'])], cite: AB(100, '4.1-4.2') },
  { id: '4.3', title: 'Circuit connections', chapter: 4, repeatPer: 'each connection', fields: [
    F('Overhead: nominal voltage', 'kV'), F('Overhead: quantity'), F('Overhead: conductor size, type and material'), F('Overhead: pull-off elevation', 'm', 'ft'),
    F('Overhead: maximum tension', 'N', 'lb', { note: 'Stated with its temperature (°C/°F), ice thickness (cm/in.) and wind velocity (km/hr / mph).' }),
    F('Shield wires: quantity per connection, size/type/material, pull-off elevation, maximum tension', 'N', 'lb'),
    F('Underground: nominal voltage', 'kV'), F('Underground: quantity'), F('Underground: conductor size, type, material and insulation'),
  ], cite: AB(101, '4.3') },
  { id: '4.4-4.6', title: 'Provisions by substation type', chapter: 4, fields: [
    O('Distribution: provision for mobile transformer', YES_NO), O('Distribution: provision for mobile substation', YES_NO),
    F('Provision for future addition of (describe)'),
    O('Provision for source voltage change (initial kV, ultimate kV, change of)', YES_NO), O('Provision for load voltage change (initial kV, ultimate kV, change of)', YES_NO),
  ], cite: AB([101, 102], '4.4-4.6', 'Distribution stations list all five; transmission stations omit the mobile items; switching stations list future additions and a single voltage-change item.') },
  { id: '4.7', title: 'Bus configuration', chapter: 4, repeatPer: 'each bus', fields: [F('Initial: nominal bus voltage', 'kV'), O('Initial: configuration', BUS_CONFIGS), F('Ultimate (if different): nominal voltage and configuration')], cite: AB(102, '4.7') },
  { id: '4.8', title: 'Direct stroke shielding', chapter: 4, fields: [O('Shielding measures', ['rods', 'wires', 'masts']), F('Shielding angle from vertical, single rod/wire/mast', '°'), F('Shielding angle from vertical, adjacent rods/wires/masts', '°')], cite: AB(102, '4.8') },
  { id: '4.9', title: 'Insulators', chapter: 4, repeatPer: 'each voltage', fields: [F('Apparatus: nominal voltage', 'kV'), O('Apparatus: type', ['cap and pin', 'post']), F('Apparatus: BIL', 'kV'), F('Apparatus: color'), F('Apparatus: cantilever strength', 'N', 'lb'), F('Apparatus: NEMA TR No.'), F('Suspension: nominal voltage', 'kV'), F('Suspension: quantity per string'), F('Suspension: color'), F('Suspension: M-E strength', 'N', 'lb'), F('Suspension: ANSI class')], cite: AB(102, '4.9') },
  { id: '4.10', title: 'Electrical clearances', chapter: 4, repeatPer: 'each voltage, for rigid and non-rigid conductors', fields: [F('Nominal voltage', 'kV'), F('Minimum metal-to-metal', 'cm', 'in.'), F('Minimum phase to grounded parts', 'cm', 'in.'), F('Minimum phase to substation grade', 'm', 'ft'), F('Minimum phase to substation roadway', 'm', 'ft'), F('Centerline-to-centerline phase spacing', 'm', 'ft')], cite: AB(103, '4.10') },
  { id: '4.11', title: 'Bus and electrical connections', chapter: 4, repeatPer: 'each case', fields: [F('Nominal voltage', 'kV'), F('Type of connection'), O('Rigid conductors', ['clamp', 'bolted', 'compression', 'welded']), O('Non-rigid conductors', ['clamp', 'compression', 'welded']), F('Fasteners')], cite: AB(103, '4.11') },
  { id: '4.12', title: 'Rigid buses', chapter: 4, repeatPer: 'each bus', fields: [F('Conductor size, type and material'), F('Design short-circuit current (three-phase symmetrical)', 'A rms'), F('Wind and ice loading'), F('Support insulator spacing', 'm', 'ft'), F('Factor of safety for support insulators'), F('Maximum sag without ice'), F('Maximum sag with ice'), F('Aeolian vibration prevention'), F('Provisions for conductor expansion')], cite: AB(103, '4.12') },
  { id: '4.13', title: 'Strain buses', chapter: 4, repeatPer: 'each bus', fields: [F('Conductor size, type, stranding and material'), F('Wind and ice loading'), F('Span length', 'm', 'ft'), F('Factor of safety for suspension insulators'), F('Sag and tension at maximum loading', 'm / N', 'ft / lb'), F('Sag and tension at 25 °C (77 °F)', 'm / N', 'ft / lb'), F('Sag and tension at 70 °C (167 °F)', 'm / N', 'ft / lb')], cite: AB([103, 104], '4.13') },
  // 5 Major equipment
  { id: '5.1', title: 'Power transformers', chapter: 5, repeatPer: 'each different component', fields: [O('Type', ['auto', 'multi-winding', '3-phase', '1-phase']), F('Quantity'), O('Dielectric', ['oil', 'air', 'gas']), F('Rating (up to three stages)', 'MVA'), O('Cooling', ['OA', 'OA/FA', 'OA/FA/FA', 'OA/FOA', 'OA/FA/FOA', 'OA/FOA/FOA']), O('Average winding temperature rise', ['55 °C', '65 °C']), F('Primary, secondary and tertiary voltage with no-load taps', 'kV'), F('LTC: percent above and below nominal, and winding (primary or secondary)'), F('BIL of primary, secondary and tertiary windings', 'kV')], cite: AB(104, '5.1') },
  { id: '5.2', title: 'Power circuit breakers', chapter: 5, fields: [O('Type', ['dead tank', 'live tank']), F('Quantity'), O('Interrupting medium', ['oil', 'gas (SF6)', 'vacuum']), F('Nominal voltage', 'kV'), F('Maximum voltage', 'kV'), F('Rated voltage range factor (K)'), F('Continuous current', 'A rms'), F('Short-circuit current at rated maximum voltage', 'A rms'), F('Maximum symmetrical interrupting capability', 'A rms'), F('3-second short-time current capability', 'A rms'), F('Closing and latching capability', 'A rms'), F('Interrupting time', 'cycles'), O('Operating mechanism', ['solenoid', 'motor', 'pneumohydraulic', 'pneumatic', 'motor-charged spring', 'manual-charged spring', 'manual']), F('Control power voltage', 'VAC / VDC'), F('Auxiliary power voltage', 'VAC')], cite: AB(104, '5.2') },
  { id: '5.3', title: 'Metal-clad switchgear', chapter: 5, fields: [F('Nominal voltage', 'kV'), F('Indoor, outdoor or sheltered aisle'), F('Switching scheme'), F('Continuous current: bus and feeders', 'A'), F('Maximum rms momentary current', 'kA / MVA'), F('Breaker interrupting capability', 'A'), F('Circuit exits underground / overhead')], cite: AB([104, 105], '5.3') },
  { id: '5.4', title: 'Substation voltage regulators', chapter: 5, fields: [F('Type (step or induction; single- or three-phase)'), F('Quantity'), F('Nominal voltage', 'kV'), F('Rating', 'kVA'), F('Percentage regulation (+/-)', '%')], cite: AB(105, '5.4') },
  { id: '5.5', title: 'Shunt capacitor equipment', chapter: 5, fields: [O('Type', ['open rack', 'housed']), F('Quantity'), F('Nominal voltage', 'kV'), F('Bank rating', 'kVAR'), F('Individual unit voltage and rating', 'kV / kVAR'), O('Connection', ['delta', 'wye', 'grounded wye', 'double wye'])], cite: AB(105, '5.5') },
  { id: '5.6', title: 'Air switches', chapter: 5, fields: [O('Type', ['disconnecting', 'grounding', 'horn-gap', 'interrupter', 'selector']), F('Quantity'), O('Construction', ['vertical break', 'double break', 'tilting insulator', 'side break', 'center break', 'vertical reach']), O('Operating mechanism', ['hook stick', 'manual mechanism', 'motor mechanism']), O('Poles', ['single', 'three']), F('Nominal voltage', 'kV'), F('Continuous current', 'A'), F('Momentary current', 'A'), F('Interrupting current', 'A')], cite: AB(105, '5.6') },
  { id: '5.7', title: 'Surge arresters', chapter: 5, fields: [O('Type', ['station', 'intermediate', 'distribution']), F('Quantity'), F('Voltage rating: duty cycle and MCOV', 'kV'), F('Nominal system voltage', 'kV'), O('System', ['grounded', 'ungrounded']), F('Equipment protected')], cite: AB(105, '5.7') },
  { id: '5.8', title: 'Automatic circuit reclosers', chapter: 5, fields: [F('Quantity'), F('Nominal voltage', 'kV'), F('Continuous current', 'A'), F('Interrupting current', 'A'), F('Single- or three-phase'), O('Interrupting medium', ['oil', 'vacuum', 'gas (SF6)']), O('Control', ['hydraulic', 'electronic']), O('Coil tripping', ['series', 'non-series']), O('Closing', ['spring', 'solenoid', 'motor']), F('Minimum tripping current', 'A'), F('Operational sequence to lockout (e.g. 1-A, 3-B)')], cite: AB(106, '5.8') },
  { id: '5.9-5.11', title: 'Instrument transformers and coupling capacitors', chapter: 5, fields: [O('CT type', ['bar', 'window', 'bushing', 'other']), F('CT quantity, nominal system kV, BIL, ratio(s)'), O('CT secondary configuration', ['single', 'dual', 'multi-ratio']), O('CT accuracy', ['metering', 'relaying']), F('CT accuracy class at standard burdens, thermal current rating factor, short-time ratings'), F('VT type (cascade, grounded neutral, insulated neutral, single or double HV line terminal, etc.), quantity, kV, BIL, ratios, accuracy class, thermal burden', 'VA'), O('Coupling capacitor type', ['CC', 'CCVT']), F('Coupling capacitor capacitance', 'pF'), F('Carrier accessories; VT ratios, accuracy class and thermal burden if a CCVT')], cite: AB([106, 107], '5.9-5.11') },
  { id: '5.12', title: 'Mobile units', chapter: 5, fields: [O('Type', ['transformer', 'substation']), F('Quantity'), F('Primary voltage', 'kV'), F('Secondary voltage', 'kV'), F('Capacity', 'MVA'), F('Accessories')], cite: AB(107, '5.12') },
  // 6 Site
  { id: '6.1-6.3', title: 'Site general, drainage and earthwork', chapter: 6, fields: [O('Yard type', ['flat', 'sloped', 'stepped']), F('Nominal finished grade elevation(s) with % slope', 'm', 'ft'), F('Topographical drawing and soil boring references'), O('Drainage system', ['surface', 'closed']), F('Drainage design basis (Ch. 6 §6.4)'), F('Time for runoff from remotest part of drainage area', 'hours'), F('Excess topsoil', 'm³', 'yd³'), F('Fill required', 'm³', 'yd³'), F('Earth to be moved excluding excess topsoil', 'm³', 'yd³')], cite: AB(107, '6.1-6.3') },
  { id: '6.4', title: 'Roads', chapter: 6, repeatPer: 'each access road, interior road and railroad', fields: [F('Length', 'm', 'ft'), F('Width', 'm', 'ft'), F('Maximum grade', '%'), F('Minimum inside curve radius', 'm', 'ft'), F('Base course'), F('Wearing course'), F('Maximum equipment load', 'kg/axle', 'lb/axle')], cite: AB(107, '6.4') },
  { id: '6.5-6.7', title: 'Erosion, surfacing and security fence', chapter: 6, fields: [F('Erosion protection description'), F('Yard surfacing material type and size'), F('Surfacing area and layer depth', 'cm', 'in.'), F('Fence height', 'm', 'ft'), F('Fabric gauge and material'), F('Gates: size and quantity', 'm', 'ft'), F('Depth of post footing holes', 'm', 'ft')], cite: AB(108, '6.5-6.7') },
  // 7 Structures, 8 Foundations
  { id: '7.1-7.2', title: 'Structures', chapter: 7, fields: [F('Material and protective coating or treatment'), F('Line support loading: conductors per phase, shield wires per wire', 'N', 'lb'), F('Equipment weight', 'kg', 'lb'), F('Equipment support short-circuit force', 'N/m', 'lb/ft'), F('Wind and ice loads (per 2.3.3) and seismic'), F('Overload factor (line supports), unit stress limit, deflection limits, rigidity, fasteners')], cite: AB([108, 109], '7') },
  { id: '8.1-8.5', title: 'Foundations', chapter: 8, fields: [F('Soil type'), F('Allowable soil bearing pressure', 'N/m²', 'psf'), F('Other soil capability limitations'), F('Depth below grade to groundwater', 'm', 'ft'), F('Concrete type'), F('Minimum 28-day compressive strength', 'N/cm²', 'psi'), F('Depth below grade to withstand frost', 'm', 'ft'), F('Reinforcing bar per foundation type'), F('Oil pollution abatement methods'), O('Foundation types and function', ['drilled shaft', 'spread footing', 'slab'])], cite: AB(109, '8') },
  // 9 Grounding (mirrors the Chapter 9 design procedure; see grounding.ts)
  { id: '9.1-9.2', title: 'Grounding: soil and grid area', chapter: 9, fields: [F('Date of soil testing'), F('Uniform-soil resistivity (average of measured apparent resistivity)', 'Ω·m', undefined, { symbol: 'ρ', computedBy: 'uniformSoilResistivity' }), F('Grid shape and dimensions'), F('Total ground grid area', 'm²', undefined, { symbol: 'A' })], cite: AB([109, 110], '9.1-9.2') },
  { id: '9.3', title: 'Grounding: fault current', chapter: 9, fields: [
    F('Maximum symmetrical rms zero-sequence fault current (single phase-to-ground)', 'A', undefined, { symbol: 'Io' }),
    F('Initial rms symmetrical ground fault current', 'A', undefined, { symbol: 'If' }),
    F('Symmetrical grid current', 'A', undefined, { symbol: 'Ig', computedBy: 'symmetricalGridCurrent' }),
    F('Substation ground resistance', 'Ω', undefined, { symbol: 'Rg', computedBy: 'gridResistance' }),
    F('Split factor', undefined, undefined, { symbol: 'Sf', computedBy: 'splitFactorFromCharts' }),
    F('Fault duration', 's', undefined, { symbol: 'tf' }),
    F('DC offset time constant', 's', undefined, { symbol: 'Ta', computedBy: 'dcOffsetTimeConstant' }),
    F('Decrement factor', undefined, undefined, { symbol: 'Df', computedBy: 'decrementFactor' }),
    F('Maximum grid current', 'A', undefined, { symbol: 'IG', computedBy: 'maximumGridCurrent' }),
    F('Asymmetrical fault current', 'A', undefined, { symbol: 'IF', computedBy: 'effectiveAsymmetricalFaultCurrent' }),
  ], cite: AB(110, '9.3') },
  { id: '9.4', title: 'Grounding: conductor and rods', chapter: 9, fields: [
    O('Conductor material', ['Cu', 'other']),
    F('Conductor area: main grid, perimeter, risers', 'kcmil', undefined, { symbol: 'Akcmil', computedBy: 'groundConductorAreaKcmil' }),
    F('Conductor length: main grid, perimeter, risers'),
    F('Ground rod diameter, length and quantity'),
  ], cite: AB([110, 111], '9.4') },
  { id: '9.5-9.7', title: 'Grounding: safety limits and surface layer', chapter: 9, fields: [
    F('Rms body current', 'A', undefined, { symbol: 'IB', computedBy: 'tolerableBodyCurrent' }),
    F('Maximum tolerable step voltage', 'V', undefined, { symbol: 'Estep', computedBy: 'tolerableStep' }),
    F('Maximum tolerable touch voltage', 'V', undefined, { symbol: 'Etouch', computedBy: 'tolerableTouch' }),
    F('Protective surface material type'),
    F('Surface material resistivity', 'Ω·m', undefined, { symbol: 'ρs' }),
    F('Reflection factor', undefined, undefined, { symbol: 'K', computedBy: 'reflectionFactor' }),
    F('Reduction factor', undefined, undefined, { symbol: 'Cs', computedBy: 'surfaceLayerDeratingFactor' }),
  ], cite: AB(111, '9.5-9.7') },
  { id: '9.8', title: 'Grounding: design voltages', chapter: 9, fields: [
    F('Total length of grid conductor', 'm', undefined, { symbol: 'LC', note: 'Printed as "LR" on the form.' }),
    F('Total length of ground rods', 'm', undefined, { symbol: 'LR', note: 'Printed as "LC" on the form.' }),
    F('Design mesh voltage', 'V', undefined, { symbol: 'Em', computedBy: 'meshVoltage' }),
    F('Design step voltage', 'V', undefined, { symbol: 'Es', computedBy: 'stepVoltage' }),
    F('Ground potential rise', 'V', undefined, { symbol: 'VGPR', computedBy: 'groundPotentialRise' }),
  ], cite: AB(111, '9.8', 'UNCERTAIN: the form labels grid conductor length "LR" and rod length "LC", the reverse of Chapter 9 (LC = grid conductor, LR = rods, Eqs 9-32 to 9-35). The Chapter 9 symbols are used here.') },
  // 10-11
  { id: '10.1', title: 'Cables', chapter: 10, repeatPer: 'each type of cable', fields: [O('Type', ['control', 'power']), F('Voltage rating', 'V'), F('Conductor size, type and material'), F('Number of conductors'), F('Quantity', 'm', 'ft'), F('Insulation type and thickness', 'mils'), F('Jacket type; thickness over each conductor and over entire cable', 'mils')], cite: AB(111, '10.1') },
  { id: '10.2', title: 'Raceways', chapter: 10, repeatPer: 'each type of raceway', fields: [F('Conduit material and size', 'cm', 'in.'), F('Duct bank width and depth', 'm', 'ft'), F('Duct bank conduits wide and deep, conduit size', 'cm', 'in.'), O('Cable trench type', ['concrete block', 'cast-in-place concrete', 'precast concrete']), F('Cable trench width and depth', 'cm', 'in.')], cite: AB(112, '10.2') },
  { id: '11', title: 'Corrosion', chapter: 11, fields: [F('Rationale for providing (or not) cathodic protection'), F('Soil resistivity survey summary'), F('pH survey summary'), F('Protection system description')], cite: AB(112, '11') },
  // 12 Relaying
  { id: '12.1', title: 'Relaying philosophy', chapter: 12, fields: [F('Coordination with other parts of the system, expected fault currents, speed of interruption sought')], cite: AB(112, '12.1') },
  { id: '12.2', title: 'Transmission line protection', chapter: 12, repeatPer: 'each line', fields: [F('Line destination or description'), F('Nominal voltage', 'kV'), O('Protection scheme', ['phase comparison', 'directional comparison', 'direct underreach', 'permissive underreach', 'permissive overreach', 'overcurrent']), O('Automatic reclosing', YES_NO), F('Relays'), O('Communication channel', ['power line carrier', 'microwave', 'fiber optic', 'leased line'])], cite: AB(113, '12.2') },
  { id: '12.3-12.5', title: 'Transformer, bus and breaker failure protection', chapter: 12, fields: [F('Transformer/reactor: nominal voltages (primary/tertiary/secondary)', 'kV'), O('Transformer/reactor scheme', ['differential', 'sudden pressure', 'directional phase distance', 'ground overcurrent']), O('Bus scheme', ['current differential', 'voltage differential']), F('Breaker failure: where applied'), F('Relays for each')], cite: AB(113, '12.3-12.5') },
  { id: '12.6', title: 'Distribution line protection', chapter: 12, repeatPer: 'each line', fields: [F('Line destination or description'), F('Nominal voltage', 'kV'), O('Protection scheme', ['overcurrent relaying', 'automatic circuit reclosers', 'sectionalizers', 'fuses']), F('Relays and equipment')], cite: AB(113, '12.6') },
  // 13-17
  { id: '13', title: 'Instruments, transducers and meters', chapter: 13, fields: [F('Metering systems and equipment for each')], cite: AB(114, '13') },
  { id: '14', title: 'Substation automation', chapter: 14, fields: [
    O('Functions', ['automatic control', 'supervisory control', 'monitoring', 'human-machine']),
    O('Architecture philosophy', ['proprietary', 'open']),
    F('Architecture layers: user interface / discrete elements or subsystems / substation and field devices'),
    F('Host processor (single or multiple) and redundancy needed'),
    F('IEDs: function, communications medium, protocols, data acquisition method'),
    F('Data concentrator purpose'),
    O('LAN access method', ['CSMA/CD', 'token ring', 'token bus', 'FDDI']),
    F('LAN load, deterministic needs, data rate, node locations'),
    O('LAN media', ['coaxial cable', 'UTP', 'optical fiber']),
    O('Serial interfaces', ['RS-232', 'RS-422/423', 'RS-485']),
    O('Protocols', ['IEC 970-5', 'DNP 3.0', 'MODBUS', 'MMS', 'ASCII', 'Landis & Gyr 8979', 'other']),
  ], cite: AB([114, 115], '14', 'UNCERTAIN: "IEC 970-5" and "RE-422/423" are printed; probably IEC 870-5 and RS-422/423. The serial option is corrected here, the protocol left as printed.') },
  { id: '15.1', title: 'AC auxiliary system', chapter: 15, fields: [F('Connected AC load', 'kVA'), F('Overall demand factor', '%'), F('Auxiliary transformer rating', 'kVA'), F('Auxiliary transformer voltage (primary/secondary)', 'kV'), F('Normal and alternative sources'), O('Auxiliary system voltage', ['480/277 V wye 3-phase 4-wire', '208/120 V wye 3-phase 4-wire', '240/120 V delta 3-phase 4-wire', '240/120 V open-delta 3-phase 4-wire', '240/120 V single-phase 3-wire']), F('Transfer switch'), F('Asymmetrical fault current at main panelboard or switchboard', 'A'), F('Panelboards and switchboards'), F('Outdoor lighting: objective, luminaires, switching method')], cite: AB(115, '15.1') },
  { id: '15.2', title: 'DC auxiliary system', chapter: 15, fields: [F('DC system loads'), F('Nominal voltage', 'V'), F('Battery cell type'), F('Battery capacity', 'Ah'), F('Number of cells'), F('Battery charger output', 'A dc')], cite: AB(115, '15.2') },
  { id: '16', title: 'Control house', chapter: 16, fields: [F('Inside length, width and clear height', 'm', 'ft'), O('Basement', YES_NO), F('Footing width', 'cm', 'in.'), F('Footing depth and depth below grade', 'm', 'ft'), O('Foundation walls', ['cast-in-place concrete', 'concrete block']), F('Perimeter insulation: type, thickness (cm/in.), inside or outside'), F('Floor thickness', 'cm', 'in.'), F('Floor reinforcing and cast-in cable trench'), O('Superstructure', ['pre-engineered metal', 'concrete block']), O('Roof', ['precast prestressed concrete panels', 'steel joists and steel deck']), F('Doors and windows: size and quantity', 'cm', 'in.'), O('Control panel type', ['single', 'double', 'duplex']), F('Control panel function and size', 'cm', 'in.'), F('Cable tray size and support', 'cm', 'in.'), F('Average illumination', 'lumens/m²', 'lumens/ft²'), F('Luminaires and emergency lighting'), F('Air conditioning and heating: number, type, rating of units')], cite: AB([116, 117], '16') },
  { id: '17', title: 'Communications', chapter: 17, repeatPer: 'each channel (17.1)', fields: [O('Application', ['relaying', 'SCADA', 'telemetering', 'voice', 'other']), F('Bandwidth or capacity', 'bits/s'), F('End-to-end channel delay constraints'), F('Remote terminating point(s)'), F('Reliability/redundancy requirements'), F('Total channel capacity'), F('Expansion requirements'), O('Technology', ['power line carrier', 'audio tone', 'carrier or audio tone on shield wire', 'microwave (analog, digital or MAS)', 'fiber optics', 'wire lines', 'satellite'])], cite: AB([117, 118], '17') },
];

/** All design-summary sections the form files under a given bulletin chapter. */
export function summarySectionsForChapter(chapter: number): readonly SummarySection[] {
  return DESIGN_SUMMARY_SECTIONS.filter((s) => s.chapter === chapter);
}

/**
 * Game-side selection of design-summary sections that define a project brief: what the client
 * asks for and the site conditions. This choice is ours; the bulletin does not rank the fields.
 */
export const PROJECT_BRIEF_SECTION_IDS: readonly string[] = [
  '1.2', '2.1.1', '2.1.2', '2.2', '2.3.1-2.3.2', '2.3.3', '2.3.4-2.3.8', '4.1-4.2', '4.3', '4.4-4.6', '4.7', '6.1-6.3', '8.1-8.5', '9.1-9.2', '9.3', '12.1',
];

/** No numeric worked example in Chapter 3; see CABLE_ID_EXAMPLE and the Fig 3-20/3-22 examples. */
export const DESIGN_PROCESS_EXAMPLE = null;
