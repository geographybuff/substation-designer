/**
 * Substation grounding (ground-grid) design: data, equations and design rules
 * from RUS Bulletin 1724E-300, Chapter 9 "Grounding" (pp. 501-562).
 *
 * The bulletin's method is the simplified, uniform-soil procedure of IEEE Std 80
 * (it cites IEEE Std 80 Draft 13, June 19, 1998). This module provides:
 *  - every Chapter 9 equation as printed (plain text + LaTeX) with variable definitions,
 *  - small pure functions implementing each equation (JSDoc names the equation number),
 *  - Tables 9-1 to 9-4 (numeric content),
 *  - digitized values of the split-factor charts (Figs 9-6..9-27) and of the Cs chart (Fig 9-35),
 *  - the design rules, procedure steps and special danger points as paraphrased guidance,
 *  - evaluateRectangularGrid(): the complete §9.10 check for a uniform rectangular grid.
 *
 * Units are SI (m, m², Ω, Ω·m, A, s) unless a name says otherwise. Eqs 9-10/9-11 use kA and kcmil,
 * as the bulletin does.
 *
 * Chapter 9 contains NO worked numeric design example (see GROUNDING_EXAMPLE); the functions are
 * instead checked against Table 9-1 (Eq 9-7) and Table 9-3 (Eq 9-10), see GROUNDING_TABLE_FIXTURES.
 */
import type { Citation, Guidance } from './types';

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

const IEEE80 = 'IEEE Std 80, "Guide for Safety in AC Substation Grounding" (bulletin cites Draft 13, June 19, 1998)';

export const GROUNDING_CITES = {
  general: { page: [501, 502], section: '9.1' },
  resistanceTargets: {
    page: 502,
    section: '9.1',
    note: 'Large/transmission substations: about 1 ohm or less; smaller distribution substations: usually 1 to 5 ohms depending on local conditions.',
  },
  procedureBasis: { page: 502, section: '9.1', originalSource: IEEE80 },
  definitions: { page: 503, section: '9.2' },
  soilResistivity: { page: [504, 506], section: '9.3', originalSource: 'IEEE Std 81-1983 (measurement methods)' },
  uniformSoil: { page: 506, section: '9.3.2', equation: '9-3' },
  gridArea: { page: 506, section: '9.4' },
  faultCurrentPaths: { page: [506, 509], section: '9.5', figure: '9-2 to 9-5', originalSource: `${IEEE80}, Figures 15-1 to 15-4` },
  symmetricalGridCurrent: { page: 510, section: '9.5.1', equation: '9-4, 9-5' },
  splitFactor: { page: [510, 533], section: '9.5.2', figure: '9-6 to 9-27', originalSource: `${IEEE80}, Figures C1 to C22` },
  decrementFactor: { page: [533, 534], section: '9.5.3', equation: '9-7', table: '9-1', originalSource: `${IEEE80}, Table 15-1` },
  maxGridCurrent: { page: 534, section: '9.5.4', equation: '9-8' },
  asymmetricalFault: { page: [534, 535], section: '9.5.5', equation: '9-9' },
  conductorMaterial: { page: 535, section: '9.6.1' },
  conductorSizing: { page: [535, 537], section: '9.6.2', equation: '9-10, 9-11', table: '9-2, 9-3', originalSource: `${IEEE80}, Tables 11-1 and 11-2` },
  equipmentGroundConductor: { page: 536, section: '9.6.3' },
  gridConductorSizing: { page: 537, section: '9.6.4' },
  additionalSizingFactors: { page: 537, section: '9.6.5' },
  connections: { page: [537, 538], section: '9.6.6' },
  bodyCurrent: { page: 539, section: '9.7.1', equation: '9-12' },
  shockSituations: { page: [540, 542], section: '9.7.2', figure: '9-28, 9-29', originalSource: `${IEEE80}, Figures 8-1, 8-2` },
  tolerableVoltages: { page: [540, 545], section: '9.8', equation: '9-13 to 9-19', figure: '9-30 to 9-34', originalSource: `${IEEE80}, Figures 7-1 to 7-5` },
  surfaceMaterial: { page: [545, 546], section: '9.9', table: '9-4', originalSource: `${IEEE80}, Table 12-1` },
  csFactor: { page: [546, 547], section: '9.9.1', equation: '9-20, 9-21', figure: '9-35', originalSource: `${IEEE80}, Figure 7-6` },
  generalConcepts: { page: 548, section: '9.10.1' },
  designProcedure: { page: [548, 550], section: '9.10.2' },
  preliminaryDesign: { page: 550, section: '9.10.3' },
  meshVoltage: { page: [551, 553], section: '9.10.4', equation: '9-22 to 9-33' },
  stepVoltage: { page: [553, 554], section: '9.10.5', equation: '9-34 to 9-36' },
  gpr: { page: [554, 555], section: '9.10.6', equation: '9-37, 9-38' },
  designModifications: { page: [555, 557], section: '9.10.7' },
  equationValidity: { page: 557, section: '9.10.8' },
  computerAnalysis: { page: 557, section: '9.10.9' },
  fence: { page: [557, 559], section: '9.10.10.1', figure: '9-36' },
  operatingHandles: { page: [558, 561], section: '9.10.10.2', figure: '9-37' },
  cableSheaths: { page: 561, section: '9.10.10.3' },
  arresterGrounding: { page: 561, section: '9.10.10.4' },
  transferredVoltage: { page: [561, 562], section: '9.10.11' },
  sustainedCurrents: { page: 562, section: '9.10.12' },
} as const satisfies Record<string, Citation>;

// ---------------------------------------------------------------------------
// Equation catalogue (as printed) for the Field Guide
// ---------------------------------------------------------------------------

export interface EquationVariable {
  symbol: string;
  description: string;
  /** Unit as given by the bulletin ('' for dimensionless). */
  unit: string;
}

export interface BulletinEquation {
  /** Equation number as printed, e.g. "9-22". */
  id: string;
  name: string;
  /** Plain-text transcription faithful to the printed equation. */
  printed: string;
  /** LaTeX transcription of the same equation. */
  latex: string;
  variables: readonly EquationVariable[];
  /** Name of the exported function in this module that implements it. */
  implementedBy?: string;
  cite: Citation;
}

const V = (symbol: string, description: string, unit: string): EquationVariable => ({ symbol, description, unit });

export const GROUNDING_EQUATIONS: readonly BulletinEquation[] = [
  {
    id: '9-1',
    name: 'Wenner four-pin apparent resistivity',
    printed: 'ρa = 4πaR / [1 + 2a/√(a² + 4b²) − a/√(a² + b²)]',
    latex: '\\rho_a = \\dfrac{4\\pi a R}{1 + \\dfrac{2a}{\\sqrt{a^2+4b^2}} - \\dfrac{a}{\\sqrt{a^2+b^2}}}',
    variables: [
      V('ρa', 'Apparent resistivity of the soil', 'Ω·m'),
      V('R', 'Measured resistance (inner-probe voltage / outer-probe current)', 'Ω'),
      V('a', 'Distance between adjacent electrodes', 'm'),
      V('b', 'Depth of the electrodes', 'm'),
    ],
    implementedBy: 'wennerApparentResistivity',
    cite: { page: 504, section: '9.3', equation: '9-1', figure: '9-1', originalSource: `${IEEE80}, Figure 13-1 (method figure)` },
  },
  {
    id: '9-2',
    name: 'Wenner apparent resistivity, shallow probes (b small compared to a)',
    printed: 'ρa = 2πaR',
    latex: '\\rho_a = 2\\pi a R',
    variables: [V('ρa', 'Apparent resistivity at depth ≈ a', 'Ω·m'), V('a', 'Probe spacing', 'm'), V('R', 'Measured resistance', 'Ω')],
    implementedBy: 'wennerApparentResistivityShallow',
    cite: { page: 504, section: '9.3', equation: '9-2', note: 'The resistivity measured at spacing a is taken to represent the soil to a depth of about a.' },
  },
  {
    id: '9-3',
    name: 'Approximate uniform soil resistivity (average of measurements)',
    printed: 'ρa(av1) = [ρa(1) + ρa(2) + ρa(3) + … + ρa(n)] / n',
    latex: '\\rho_{a(av1)} = \\dfrac{\\rho_{a(1)} + \\rho_{a(2)} + \\rho_{a(3)} + \\dots + \\rho_{a(n)}}{n}',
    variables: [
      V('ρa(1)…ρa(n)', 'Measured apparent resistivities at different four-pin spacings or driven-rod depths', 'Ω·m'),
      V('n', 'Total number of measurements', ''),
    ],
    implementedBy: 'uniformSoilResistivity',
    cite: { page: 506, section: '9.3.2', equation: '9-3' },
  },
  {
    id: '9-4',
    name: 'Symmetrical grid current',
    printed: 'Ig = Sf · If',
    latex: 'I_g = S_f \\cdot I_f',
    variables: [
      V('Ig', 'rms symmetrical grid current', 'A'),
      V('If', 'rms symmetrical ground fault current', 'A'),
      V('Sf', 'Fault current division (split) factor, decimal', ''),
    ],
    implementedBy: 'symmetricalGridCurrent',
    cite: { page: 510, section: '9.5.1', equation: '9-4' },
  },
  {
    id: '9-5',
    name: 'Symmetrical grid current from zero-sequence current (sustained initial fault current)',
    printed: 'Ig = Sf · (3I0)',
    latex: 'I_g = S_f \\cdot (3I_0)',
    variables: [V('I0', 'Symmetrical rms zero-sequence fault current', 'A'), V('Sf', 'Split factor, decimal', '')],
    implementedBy: 'symmetricalGridCurrent',
    cite: { page: 510, section: '9.5.1', equation: '9-5' },
  },
  {
    id: '9-6',
    name: 'Approximate grid resistance (x-coordinate for the split-factor charts)',
    printed: 'Rg = (ρ/4) · √(π/A)',
    latex: 'R_g = \\dfrac{\\rho}{4}\\sqrt{\\dfrac{\\pi}{A}}',
    variables: [
      V('Rg', 'Substation ground resistance', 'Ω'),
      V('ρ', 'Soil resistivity, ρa(av1) from Eq 9-3', 'Ω·m'),
      V('A', 'Area occupied by the ground grid', 'm²'),
    ],
    implementedBy: 'preliminaryGridResistance',
    cite: { page: [532, 533], section: '9.5.2', equation: '9-6' },
  },
  {
    id: '9-7',
    name: 'Decrement factor',
    printed: 'Df = √{1 + (Ta/tf) · [1 − e^(−2tf/Ta)]},  Ta = X/(ωR); for 60 Hz Ta = X/(120πR)',
    latex: 'D_f = \\sqrt{1 + \\dfrac{T_a}{t_f}\\left(1 - e^{-2t_f/T_a}\\right)},\\quad T_a = \\dfrac{X}{\\omega R}',
    variables: [
      V('Df', 'Decrement factor', ''),
      V('tf', 'Time duration of fault', 's'),
      V('Ta', 'DC offset time constant = X/(ωR), using the system subtransient X/R at the fault location', 's'),
    ],
    implementedBy: 'decrementFactor',
    cite: {
      page: 533,
      section: '9.5.3',
      equation: '9-7',
      note: 'The square root is printed on the page image but lost in the PDF text layer; verified against the page image and Table 9-1.',
    },
  },
  {
    id: '9-8',
    name: 'Maximum grid current',
    printed: 'IG = Df · Ig',
    latex: 'I_G = D_f \\cdot I_g',
    variables: [
      V('IG', 'Maximum grid current (flows through the grid to remote earth)', 'A'),
      V('Df', 'Decrement factor for the entire fault duration tf', ''),
      V('Ig', 'rms symmetrical grid current (Eq 9-4/9-5)', 'A'),
    ],
    implementedBy: 'maximumGridCurrent',
    cite: { page: 534, section: '9.5.4', equation: '9-8' },
  },
  {
    id: '9-9',
    name: 'Effective asymmetrical fault current',
    printed: 'IF = Df · If',
    latex: 'I_F = D_f \\cdot I_f',
    variables: [V('IF', 'Effective asymmetrical fault current', 'A'), V('If', 'rms symmetrical ground fault current', 'A'), V('Df', 'Decrement factor', '')],
    implementedBy: 'effectiveAsymmetricalFaultCurrent',
    cite: { page: [534, 535], section: '9.5.5', equation: '9-9' },
  },
  {
    id: '9-10',
    name: 'Ground conductor size',
    printed: 'Akcmil = I · 197.4 / √{[TCAP/(tc·αr·ρr)] · ln[(Ko + Tm)/(Ko + Ta)]}',
    latex: 'A_{kcmil} = I\\,\\dfrac{197.4}{\\sqrt{\\left(\\dfrac{TCAP}{t_c\\,\\alpha_r\\,\\rho_r}\\right)\\ln\\left(\\dfrac{K_o+T_m}{K_o+T_a}\\right)}}',
    variables: [
      V('I', 'rms fault current (IF for equipment grounds; IG or, more conservatively, IF for grid conductors)', 'kA'),
      V('Akcmil', 'Area of conductor', 'kcmil'),
      V('Tm', 'Maximum allowable temperature', '°C'),
      V('Ta', 'Ambient temperature', '°C'),
      V('αr', 'Thermal coefficient of resistivity at reference temperature Tr (Table 9-2 gives values at 20 °C)', '1/°C'),
      V('ρr', 'Resistivity of the ground conductor at reference temperature Tr', 'µΩ·cm'),
      V('Ko', '1/αo or (1/αr) − Tr', '°C'),
      V('tc', 'Fault current duration', 's'),
      V('TCAP', 'Thermal capacity per unit volume (Table 9-2)', 'J/(cm³·°C)'),
    ],
    implementedBy: 'groundConductorAreaKcmil',
    cite: { page: [535, 536], section: '9.6.2', equation: '9-10', table: '9-2', originalSource: `${IEEE80}, Table 11-1` },
  },
  {
    id: '9-11',
    name: 'Ground conductor size, simplified (English units)',
    printed: 'Akcmil = I · Kf · √tc',
    latex: 'A_{kcmil} = I \\cdot K_f \\sqrt{t_c}',
    variables: [
      V('Akcmil', 'Area of conductor', 'kcmil'),
      V('I', 'rms fault current', 'kA'),
      V('tc', 'Fault current duration', 's'),
      V('Kf', 'Material constant from Table 9-3 (ambient Ta = 40 °C)', ''),
    ],
    implementedBy: 'groundConductorAreaKcmilSimplified',
    cite: { page: 536, section: '9.6.2.1', equation: '9-11', table: '9-3', originalSource: `${IEEE80}, Table 11-2` },
  },
  {
    id: '9-12',
    name: 'Tolerable body current (99.5% of persons, no ventricular fibrillation)',
    printed: 'IB = k/√ts;  k = 0.116 (50 kg / 110 lb), k = 0.157 (70 kg / 155 lb)',
    latex: 'I_B = \\dfrac{k}{\\sqrt{t_s}}',
    variables: [
      V('IB', 'rms magnitude of current through the body', 'A'),
      V('ts', 'Duration of current exposure (valid 0.03 to 3.0 s)', 's'),
      V('k', 'Constant related to electric shock energy: 0.116 for 50 kg, 0.157 for 70 kg', ''),
    ],
    implementedBy: 'tolerableBodyCurrent',
    cite: { page: 539, section: '9.7.1', equation: '9-12' },
  },
  {
    id: '9-13',
    name: 'Step voltage (body circuit)',
    printed: 'Estep = (RB + 2Rf) · IB',
    latex: 'E_{step} = (R_B + 2R_f)\\cdot I_B',
    variables: [
      V('Estep', 'Step voltage', 'V'),
      V('RB', 'Body resistance, generally estimated as 1000 Ω for dc and 50/60 Hz ac', 'Ω'),
      V('Rf', 'Ground resistance of one foot (Eq 9-15)', 'Ω'),
      V('IB', 'Tolerable body current (Eq 9-12)', 'A'),
    ],
    implementedBy: 'stepVoltageFromBodyCircuit',
    cite: { page: 544, section: '9.8', equation: '9-13' },
  },
  {
    id: '9-14',
    name: 'Touch voltage (body circuit)',
    printed: 'Etouch = (RB + Rf/2) · IB',
    latex: 'E_{touch} = \\left(R_B + \\dfrac{R_f}{2}\\right)\\cdot I_B',
    variables: [V('Etouch', 'Touch voltage', 'V'), V('RB', 'Body resistance (1000 Ω)', 'Ω'), V('Rf', 'Ground resistance of one foot', 'Ω'), V('IB', 'Body current', 'A')],
    implementedBy: 'touchVoltageFromBodyCircuit',
    cite: { page: 544, section: '9.8', equation: '9-14' },
  },
  {
    id: '9-15',
    name: 'Ground resistance of one foot',
    printed: 'Rf = Cs · 3ρs',
    latex: 'R_f = C_s \\cdot 3\\rho_s',
    variables: [
      V('Rf', 'Ground resistance of one foot', 'Ω'),
      V('Cs', 'Surface layer derating factor (Cs = 1 if no protective surface layer)', ''),
      V('ρs', 'Resistivity of the protective surface layer (ρs = ρ if no surface layer)', 'Ω·m'),
    ],
    implementedBy: 'footResistance',
    cite: { page: 544, section: '9.8', equation: '9-15' },
  },
  {
    id: '9-16',
    name: 'Tolerable step voltage, 50 kg person',
    printed: 'Estep50 = (1000 + 6Cs·ρs) · 0.116/√ts',
    latex: 'E_{step50} = (1000 + 6C_s\\rho_s)\\dfrac{0.116}{\\sqrt{t_s}}',
    variables: [V('Cs', 'Surface layer derating factor', ''), V('ρs', 'Surface layer resistivity', 'Ω·m'), V('ts', 'Shock duration', 's')],
    implementedBy: 'tolerableStep50kg',
    cite: { page: 545, section: '9.8', equation: '9-16' },
  },
  {
    id: '9-17',
    name: 'Tolerable touch voltage, 50 kg person',
    printed: 'Etouch50 = (1000 + 1.5Cs·ρs) · 0.116/√ts',
    latex: 'E_{touch50} = (1000 + 1.5C_s\\rho_s)\\dfrac{0.116}{\\sqrt{t_s}}',
    variables: [V('Cs', 'Surface layer derating factor', ''), V('ρs', 'Surface layer resistivity', 'Ω·m'), V('ts', 'Shock duration', 's')],
    implementedBy: 'tolerableTouch50kg',
    cite: { page: 545, section: '9.8', equation: '9-17' },
  },
  {
    id: '9-18',
    name: 'Tolerable step voltage, 70 kg person',
    printed: 'Estep70 = (1000 + 6Cs·ρs) · 0.157/√ts',
    latex: 'E_{step70} = (1000 + 6C_s\\rho_s)\\dfrac{0.157}{\\sqrt{t_s}}',
    variables: [V('Cs', 'Surface layer derating factor', ''), V('ρs', 'Surface layer resistivity', 'Ω·m'), V('ts', 'Shock duration', 's')],
    implementedBy: 'tolerableStep70kg',
    cite: { page: 545, section: '9.8', equation: '9-18' },
  },
  {
    id: '9-19',
    name: 'Tolerable touch voltage, 70 kg person',
    printed: 'Etouch70 = (1000 + 1.5Cs·ρs) · 0.157/√ts',
    latex: 'E_{touch70} = (1000 + 1.5C_s\\rho_s)\\dfrac{0.157}{\\sqrt{t_s}}',
    variables: [V('Cs', 'Surface layer derating factor', ''), V('ρs', 'Surface layer resistivity', 'Ω·m'), V('ts', 'Shock duration', 's')],
    implementedBy: 'tolerableTouch70kg',
    cite: { page: 545, section: '9.8', equation: '9-19' },
  },
  {
    id: '9-20',
    name: 'Surface layer derating factor (analytical series)',
    printed: 'Cs = 1 + (16·b/ρs) · Σ(n=1..∞) Kⁿ · Rm(2nhs)',
    latex: 'C_s = 1 + \\dfrac{16\\,b}{\\rho_s}\\sum_{n=1}^{\\infty} K^n R_{m(2nh_s)}',
    variables: [
      V('Cs', 'Surface layer derating factor', ''),
      V('K', 'Reflection factor (Eq 9-21)', ''),
      V('ρs', 'Surface material resistivity', 'Ω·m'),
      V('hs', 'Thickness of the surface material', 'm'),
      V('b', 'Radius of the circular metallic disc representing the foot (charts use 0.08 m)', 'm'),
      V('Rm(2nhs)', 'Mutual ground resistance between two similar, parallel, coaxial plates separated by 2nhs in an infinite medium of resistivity ρs', 'Ω'),
    ],
    implementedBy: 'surfaceLayerDeratingFactor (via the digitized Fig 9-35 chart; Rm is not given in closed form)',
    cite: {
      page: [546, 547],
      section: '9.9.1',
      equation: '9-20',
      note: 'The bulletin gives no closed form for Rm and directs users to read Cs from Fig 9-35 (precalculated for b = 0.08 m).',
    },
  },
  {
    id: '9-21',
    name: 'Reflection factor',
    printed: 'K = (ρ − ρs)/(ρ + ρs)',
    latex: 'K = \\dfrac{\\rho - \\rho_s}{\\rho + \\rho_s}',
    variables: [V('ρ', 'Resistivity of the earth beneath the surface material', 'Ω·m'), V('ρs', 'Surface material resistivity', 'Ω·m')],
    implementedBy: 'reflectionFactor',
    cite: { page: 546, section: '9.9.1', equation: '9-21' },
  },
  {
    id: '9-22',
    name: 'Mesh voltage',
    printed: 'Em = ρ · Km · Ki · IG / LM',
    latex: 'E_m = \\dfrac{\\rho \\cdot K_m \\cdot K_i \\cdot I_G}{L_M}',
    variables: [
      V('ρ', 'Soil resistivity', 'Ω·m'),
      V('Km', 'Spacing factor for mesh voltage (Eq 9-23)', ''),
      V('Ki', 'Correction factor for grid geometry (Eq 9-31)', ''),
      V('IG', 'Maximum grid current between grid and surrounding earth, including dc offset', 'A'),
      V('LM', 'Effective length of Lc + LR for mesh voltage (Eq 9-32/9-33)', 'm'),
    ],
    implementedBy: 'meshVoltage',
    cite: { page: 551, section: '9.10.4', equation: '9-22' },
  },
  {
    id: '9-23',
    name: 'Geometrical (spacing) factor for mesh voltage',
    printed: 'Km = (1/(2·π)) · { ln[ D²/(16·h·d) + (D + 2·h)²/(8·D·d) − h/(4·d) ] + (Kii/Kh) · ln[ 8/(π(2·n − 1)) ] }',
    latex:
      'K_m = \\dfrac{1}{2\\pi}\\left[\\ln\\left(\\dfrac{D^2}{16hd} + \\dfrac{(D+2h)^2}{8Dd} - \\dfrac{h}{4d}\\right) + \\dfrac{K_{ii}}{K_h}\\ln\\left(\\dfrac{8}{\\pi(2n-1)}\\right)\\right]',
    variables: [
      V('D', 'Spacing between parallel conductors', 'm'),
      V('d', 'Diameter of grid conductors', 'm'),
      V('h', 'Depth of ground grid conductors', 'm'),
      V('n', 'Geometric factor (Eq 9-26)', ''),
      V('Kh', 'Corrective weighting factor for grid depth (Eq 9-25)', ''),
      V('Kii', 'Corrective weighting factor for inner conductors on the corner mesh (1, or Eq 9-24)', ''),
    ],
    implementedBy: 'meshSpacingFactorKm',
    cite: { page: 551, section: '9.10.4', equation: '9-23' },
  },
  {
    id: '9-24',
    name: 'Kii for grids without perimeter/corner rods',
    printed: 'Kii = 1/(2·n)^(2/n)   (Kii = 1 for grids with rods along the perimeter or in the corners)',
    latex: 'K_{ii} = \\dfrac{1}{(2n)^{2/n}}',
    variables: [V('n', 'Geometric factor', '')],
    implementedBy: 'innerConductorFactorKii',
    cite: { page: 552, section: '9.10.4', equation: '9-24' },
  },
  {
    id: '9-25',
    name: 'Depth weighting factor',
    printed: 'Kh = √(1 + h/ho),  ho = 1 m (grid reference depth)',
    latex: 'K_h = \\sqrt{1 + \\dfrac{h}{h_o}},\\quad h_o = 1\\,\\text{m}',
    variables: [V('h', 'Grid depth', 'm'), V('ho', 'Grid reference depth = 1 m', 'm')],
    implementedBy: 'depthFactorKh',
    cite: { page: 552, section: '9.10.4', equation: '9-25' },
  },
  {
    id: '9-26',
    name: 'Effective number of parallel conductors',
    printed: 'n = na · nb · nc · nd',
    latex: 'n = n_a \\cdot n_b \\cdot n_c \\cdot n_d',
    variables: [V('na…nd', 'Shape components (Eqs 9-27 to 9-30)', '')],
    implementedBy: 'geometryFactorN',
    cite: { page: 552, section: '9.10.4', equation: '9-26' },
  },
  {
    id: '9-27',
    name: 'Geometry component na',
    printed: 'na = 2·LC/Lp',
    latex: 'n_a = \\dfrac{2L_C}{L_p}',
    variables: [V('LC', 'Total length of conductor in the horizontal grid', 'm'), V('Lp', 'Peripheral length of the grid', 'm')],
    implementedBy: 'geometryFactorN',
    cite: { page: 552, section: '9.10.4', equation: '9-27' },
  },
  {
    id: '9-28',
    name: 'Geometry component nb (nb = 1 for square grids)',
    printed: 'nb = √(Lp/(4·√A))',
    latex: 'n_b = \\sqrt{\\dfrac{L_p}{4\\sqrt{A}}}',
    variables: [V('Lp', 'Peripheral length of the grid', 'm'), V('A', 'Area of the grid', 'm²')],
    implementedBy: 'geometryFactorN',
    cite: { page: 552, section: '9.10.4', equation: '9-28' },
  },
  {
    id: '9-29',
    name: 'Geometry component nc (nc = 1 for square and rectangular grids)',
    printed: 'nc = [Lx·Ly/A]^(0.7·A/(Lx·Ly))',
    latex: 'n_c = \\left[\\dfrac{L_x L_y}{A}\\right]^{\\frac{0.7A}{L_x L_y}}',
    variables: [V('Lx', 'Maximum length of the grid in the x direction', 'm'), V('Ly', 'Maximum length of the grid in the y direction', 'm'), V('A', 'Area of the grid', 'm²')],
    implementedBy: 'geometryFactorN',
    cite: { page: 552, section: '9.10.4', equation: '9-29' },
  },
  {
    id: '9-30',
    name: 'Geometry component nd (nd = 1 for square, rectangular and L-shaped grids)',
    printed: 'nd = Dm/√(Lx² + Ly²)',
    latex: 'n_d = \\dfrac{D_m}{\\sqrt{L_x^2 + L_y^2}}',
    variables: [V('Dm', 'Maximum distance between any two points on the grid', 'm'), V('Lx, Ly', 'Maximum grid lengths in x and y', 'm')],
    implementedBy: 'geometryFactorN',
    cite: { page: 553, section: '9.10.4', equation: '9-30' },
  },
  {
    id: '9-31',
    name: 'Irregularity (geometry correction) factor',
    printed: 'Ki = 0.644 + 0.148·n',
    latex: 'K_i = 0.644 + 0.148\\,n',
    variables: [V('n', 'Geometric factor', '')],
    implementedBy: 'irregularityFactorKi',
    cite: { page: 553, section: '9.10.4', equation: '9-31' },
  },
  {
    id: '9-32',
    name: 'Effective buried length for mesh voltage: no rods, or a few rods none in corners/perimeter',
    printed: 'LM = LC + LR',
    latex: 'L_M = L_C + L_R',
    variables: [V('LC', 'Total grid conductor length', 'm'), V('LR', 'Total length of all ground rods', 'm')],
    implementedBy: 'effectiveMeshLengthLM',
    cite: { page: 553, section: '9.10.4', equation: '9-32' },
  },
  {
    id: '9-33',
    name: 'Effective buried length for mesh voltage: rods in corners and along the perimeter (and throughout)',
    printed: 'LM = LC + [1.55 + 1.22·(Lr/√(Lx² + Ly²))]·LR',
    latex: 'L_M = L_C + \\left[1.55 + 1.22\\left(\\dfrac{L_r}{\\sqrt{L_x^2+L_y^2}}\\right)\\right]L_R',
    variables: [V('Lr', 'Length of each ground rod', 'm'), V('LR', 'Total rod length', 'm'), V('Lx, Ly', 'Maximum grid lengths', 'm')],
    implementedBy: 'effectiveMeshLengthLM',
    cite: { page: 553, section: '9.10.4', equation: '9-33' },
  },
  {
    id: '9-34',
    name: 'Step voltage',
    printed: 'Es = ρ · Ks · Ki · IG / LS',
    latex: 'E_s = \\dfrac{\\rho \\cdot K_s \\cdot K_i \\cdot I_G}{L_S}',
    variables: [
      V('Ks', 'Spacing factor for step voltage (Eq 9-36)', ''),
      V('Ki', 'Correction factor for grid geometry (Eq 9-31)', ''),
      V('IG', 'Maximum grid current including dc offset', 'A'),
      V('LS', 'Effective buried conductor length (Eq 9-35)', 'm'),
    ],
    implementedBy: 'stepVoltage',
    cite: { page: 554, section: '9.10.5', equation: '9-34' },
  },
  {
    id: '9-35',
    name: 'Effective buried length for step voltage (with or without rods)',
    printed: 'LS = 0.75·LC + 0.85·LR',
    latex: 'L_S = 0.75\\,L_C + 0.85\\,L_R',
    variables: [V('LC', 'Total grid conductor length', 'm'), V('LR', 'Total rod length', 'm')],
    implementedBy: 'effectiveStepLengthLS',
    cite: { page: 554, section: '9.10.5', equation: '9-35' },
  },
  {
    id: '9-36',
    name: 'Spacing factor for step voltage (0.25 m < h < 2.5 m)',
    printed: 'Ks = (1/π) · [1/(2·h) + 1/(D + h) + (1/D)·(1 − 0.5^(n−2))]',
    latex: 'K_s = \\dfrac{1}{\\pi}\\left[\\dfrac{1}{2h} + \\dfrac{1}{D+h} + \\dfrac{1}{D}\\left(1 - 0.5^{\\,n-2}\\right)\\right]',
    variables: [V('D', 'Spacing between parallel conductors', 'm'), V('h', 'Grid depth', 'm'), V('n', 'Geometric factor', '')],
    implementedBy: 'stepSpacingFactorKs',
    cite: {
      page: 554,
      section: '9.10.5',
      equation: '9-36',
      note: 'Maximum step voltage is assumed over 1 m beginning at, and extending outside, the perimeter conductor on the bisector of the most extreme corner.',
    },
  },
  {
    id: '9-37',
    name: 'Ground potential rise',
    printed: 'VGPR = IG · Rg',
    latex: 'V_{GPR} = I_G R_g',
    variables: [V('VGPR', 'Ground potential rise', 'V'), V('IG', 'Maximum grid current (Eq 9-8)', 'A'), V('Rg', 'Ground grid resistance (Eq 9-38)', 'Ω')],
    implementedBy: 'groundPotentialRise',
    cite: { page: 555, section: '9.10.6', equation: '9-37' },
  },
  {
    id: '9-38',
    name: 'Grid resistance',
    printed: 'Rg = ρ · [1/LT + (1/√(20A)) · (1 + 1/(1 + h·√(20/A)))]',
    latex: 'R_g = \\rho\\left[\\dfrac{1}{L_T} + \\dfrac{1}{\\sqrt{20A}}\\left(1 + \\dfrac{1}{1 + h\\sqrt{20/A}}\\right)\\right]',
    variables: [
      V('h', 'Depth of the grid', 'm'),
      V('A', 'Area occupied by the ground grid', 'm²'),
      V('LT', 'Total buried length of conductors', 'm'),
      V('ρ', 'Soil resistivity, ρa(av1)', 'Ω·m'),
    ],
    implementedBy: 'gridResistance',
    cite: { page: 555, section: '9.10.6', equation: '9-38' },
  },
];

// ---------------------------------------------------------------------------
// Equation implementations
// ---------------------------------------------------------------------------

function assertPositive(name: string, v: number): void {
  if (!(v > 0) || !Number.isFinite(v)) throw new RangeError(`${name} must be a positive finite number (got ${v})`);
}

/** Eq 9-1 (p. 504): Wenner four-pin apparent resistivity ρa (Ω·m) from spacing a (m), probe depth b (m), measured R (Ω). */
export function wennerApparentResistivity(a: number, b: number, rOhm: number): number {
  assertPositive('a', a);
  const denom = 1 + (2 * a) / Math.sqrt(a * a + 4 * b * b) - a / Math.sqrt(a * a + b * b);
  return (4 * Math.PI * a * rOhm) / denom;
}

/** Eq 9-2 (p. 504): ρa = 2πaR, valid when probe depth b is small compared to spacing a. */
export function wennerApparentResistivityShallow(a: number, rOhm: number): number {
  return 2 * Math.PI * a * rOhm;
}

/** Eq 9-3 (p. 506): uniform-soil resistivity ρa(av1) as the arithmetic mean of the apparent resistivity readings. */
export function uniformSoilResistivity(readings: readonly number[]): number {
  if (readings.length === 0) throw new RangeError('at least one resistivity reading is required');
  return readings.reduce((s, r) => s + r, 0) / readings.length;
}

/**
 * Eq 9-4 / 9-5 (p. 510): symmetrical grid current Ig = Sf · If (or Sf · 3I0).
 * @param sf split factor as a decimal (the charts give a percentage; divide by 100)
 * @param faultCurrentA If or 3I0, A rms symmetrical
 */
export function symmetricalGridCurrent(sf: number, faultCurrentA: number): number {
  return sf * faultCurrentA;
}

/** Eq 9-6 (p. 532): approximate grid resistance Rg = (ρ/4)·√(π/A), used as the x-coordinate of the split-factor charts. */
export function preliminaryGridResistance(rho: number, areaM2: number): number {
  assertPositive('area', areaM2);
  return (rho / 4) * Math.sqrt(Math.PI / areaM2);
}

/** §9.5.3 (p. 533): dc offset time constant Ta = X/(ωR) in seconds; for 60 Hz Ta = X/(120πR). */
export function dcOffsetTimeConstant(xOverR: number, frequencyHz = 60): number {
  return xOverR / (2 * Math.PI * frequencyHz);
}

/**
 * Eq 9-7 (p. 533): decrement factor Df = √(1 + (Ta/tf)(1 − e^(−2tf/Ta))).
 * Reproduces Table 9-1 to ±0.001. The bulletin notes Df = 1.0 may be used for fault durations
 * significantly greater than 1 s (p. 534); this function always evaluates the equation.
 */
export function decrementFactor(tf: number, xOverR: number, frequencyHz = 60): number {
  assertPositive('tf', tf);
  if (xOverR <= 0) return 1;
  const ta = dcOffsetTimeConstant(xOverR, frequencyHz);
  return Math.sqrt(1 + (ta / tf) * (1 - Math.exp((-2 * tf) / ta)));
}

/** Eq 9-8 (p. 534): maximum grid current IG = Df · Ig. */
export function maximumGridCurrent(df: number, igA: number): number {
  return df * igA;
}

/** Eq 9-9 (p. 534): effective asymmetrical fault current IF = Df · If (used to size equipment ground conductors, §9.6.3). */
export function effectiveAsymmetricalFaultCurrent(df: number, ifA: number): number {
  return df * ifA;
}

// ----- Conductor sizing (Tables 9-2 / 9-3, Eqs 9-10 / 9-11) -----

export type GroundConductorMaterialId =
  | 'copper-annealed-soft-drawn'
  | 'copper-commercial-hard-drawn'
  | 'copper-clad-steel-wire-40'
  | 'copper-clad-steel-wire-30'
  | 'copper-clad-steel-rod-20';

export interface GroundConductorMaterial {
  id: GroundConductorMaterialId;
  description: string;
  /** Material conductivity, % IACS. */
  conductivityPct: number;
  /** αr at 20 °C, 1/°C. */
  alphaR20: number;
  /** Ko at 0 °C, °C. */
  ko: number;
  /** Fusing temperature Tm, °C (from ASTM standards). */
  fusingTempC: number;
  /** ρr at 20 °C, µΩ·cm. */
  rhoR20: number;
  /** Thermal capacity TCAP, J/(cm³·°C). */
  tcap: number;
}

/** Table 9-2 (p. 536): material constants for Eq 9-10. */
export const TABLE_9_2_MATERIALS: readonly GroundConductorMaterial[] = [
  { id: 'copper-annealed-soft-drawn', description: 'Copper, annealed soft-drawn', conductivityPct: 100.0, alphaR20: 0.00393, ko: 234, fusingTempC: 1083, rhoR20: 1.72, tcap: 3.42 },
  { id: 'copper-commercial-hard-drawn', description: 'Copper, commercial hard-drawn', conductivityPct: 97.0, alphaR20: 0.00381, ko: 242, fusingTempC: 1084, rhoR20: 1.78, tcap: 3.42 },
  { id: 'copper-clad-steel-wire-40', description: 'Copper-clad steel wire (40%)', conductivityPct: 40.0, alphaR20: 0.00378, ko: 245, fusingTempC: 1084, rhoR20: 4.40, tcap: 3.85 },
  { id: 'copper-clad-steel-wire-30', description: 'Copper-clad steel wire (30%)', conductivityPct: 30.0, alphaR20: 0.00378, ko: 245, fusingTempC: 1084, rhoR20: 5.86, tcap: 3.85 },
  { id: 'copper-clad-steel-rod-20', description: 'Copper-clad steel rod (20%), based on 0.010 in (0.254 mm) copper thickness', conductivityPct: 20.0, alphaR20: 0.00378, ko: 245, fusingTempC: 1084, rhoR20: 8.62, tcap: 3.85 },
];

export const TABLE_9_2_CITE: Citation = {
  page: 536,
  section: '9.6.2',
  table: '9-2',
  originalSource: `${IEEE80}, Table 11-1`,
  note: 'Fusing temperatures from ASTM standards; αr and ρr are at the same 20 °C reference temperature.',
};

export interface KfRow {
  materialId: GroundConductorMaterialId;
  description: string;
  conductivityPct: number;
  /** Tm, °C (fusing temperature or limited conductor temperature). */
  tmC: number;
  kf: number;
}

/** Table 9-3 (p. 537): Kf for Eq 9-11 (ambient 40 °C). */
export const TABLE_9_3_KF: readonly KfRow[] = [
  { materialId: 'copper-annealed-soft-drawn', description: 'Copper, annealed soft-drawn', conductivityPct: 100.0, tmC: 1083, kf: 7.00 },
  { materialId: 'copper-commercial-hard-drawn', description: 'Copper, commercial hard-drawn', conductivityPct: 97.0, tmC: 1084, kf: 7.06 },
  { materialId: 'copper-commercial-hard-drawn', description: 'Copper, commercial hard-drawn (limited to 250 °C to avoid annealing)', conductivityPct: 97.0, tmC: 250, kf: 11.78 },
  { materialId: 'copper-clad-steel-wire-40', description: 'Copper-clad steel wire', conductivityPct: 40.0, tmC: 1084, kf: 10.45 },
  { materialId: 'copper-clad-steel-wire-30', description: 'Copper-clad steel wire', conductivityPct: 30.0, tmC: 1084, kf: 12.06 },
  { materialId: 'copper-clad-steel-rod-20', description: 'Copper-clad steel rod', conductivityPct: 20.0, tmC: 1084, kf: 14.64 },
];

export const TABLE_9_3_CITE: Citation = { page: 537, section: '9.6.2.1', table: '9-3', originalSource: `${IEEE80}, Table 11-2` };

/**
 * Eq 9-10 (p. 535): required ground conductor area in kcmil.
 * @param currentKA rms fault current I in kA (IF for equipment ground conductors §9.6.3; IG, or more
 *                  conservatively IF, for grid conductors §9.6.4)
 * @param tcS fault current duration tc, s (maximum possible clearing time including backup, §9.10.2 step 4)
 * @param material Table 9-2 material
 * @param ambientC Ta, °C (Table 9-3 uses 40 °C)
 * @param maxTempC Tm, °C; defaults to the material's fusing temperature (use 250 °C for hard-drawn copper
 *                 when its strength is needed, §9.6.5)
 */
export function groundConductorAreaKcmil(
  currentKA: number,
  tcS: number,
  material: GroundConductorMaterial,
  ambientC = 40,
  maxTempC: number = material.fusingTempC,
): number {
  assertPositive('tc', tcS);
  const tcapTerm = material.tcap / (tcS * material.alphaR20 * material.rhoR20);
  const lnTerm = Math.log((material.ko + maxTempC) / (material.ko + ambientC));
  return (currentKA * 197.4) / Math.sqrt(tcapTerm * lnTerm);
}

/** Eq 9-11 (p. 536): simplified conductor area Akcmil = I · Kf · √tc (I in kA, Kf from Table 9-3). */
export function groundConductorAreaKcmilSimplified(currentKA: number, tcS: number, kf: number): number {
  return currentKA * kf * Math.sqrt(tcS);
}

/** Unit conversion helper (not bulletin data): 1 kcmil = 0.506707 mm². The bulletin's own pairs agree: 2/0 AWG ≈ 67 mm², 500 kcmil ≈ 253 mm². */
export const MM2_PER_KCMIL = 0.506707;

// ----- Body current and tolerable voltages (Eqs 9-12 .. 9-19) -----

export type BodyWeightKg = 50 | 70;

/** §9.7.1 (p. 539): shock-energy constant k of Eq 9-12. */
export const BODY_CURRENT_K: Readonly<Record<BodyWeightKg, number>> = { 50: 0.116, 70: 0.157 };

/** §9.8 (p. 544): body resistance RB generally estimated at 1000 Ω for dc and 50/60 Hz ac. */
export const BODY_RESISTANCE_OHM = 1000;

/** Eq 9-12 (p. 539): tolerable body current IB = k/√ts (A). Based on tests between 0.03 and 3.0 s only. */
export function tolerableBodyCurrent(tsS: number, weightKg: BodyWeightKg): number {
  assertPositive('ts', tsS);
  return BODY_CURRENT_K[weightKg] / Math.sqrt(tsS);
}

/** Eq 9-15 (p. 544): ground resistance of one foot Rf = Cs · 3ρs (Ω). */
export function footResistance(cs: number, rhoS: number): number {
  return cs * 3 * rhoS;
}

/** Eq 9-13 (p. 544): Estep = (RB + 2Rf) · IB. */
export function stepVoltageFromBodyCircuit(rbOhm: number, rfOhm: number, ibA: number): number {
  return (rbOhm + 2 * rfOhm) * ibA;
}

/** Eq 9-14 (p. 544): Etouch = (RB + Rf/2) · IB. */
export function touchVoltageFromBodyCircuit(rbOhm: number, rfOhm: number, ibA: number): number {
  return (rbOhm + rfOhm / 2) * ibA;
}

/** Eq 9-16 (p. 545): tolerable step voltage, 50 kg: (1000 + 6·Cs·ρs) · 0.116/√ts (V). */
export function tolerableStep50kg(rhoS: number, cs: number, tsS: number): number {
  assertPositive('ts', tsS);
  return ((1000 + 6 * cs * rhoS) * 0.116) / Math.sqrt(tsS);
}

/** Eq 9-17 (p. 545): tolerable touch voltage, 50 kg: (1000 + 1.5·Cs·ρs) · 0.116/√ts (V). */
export function tolerableTouch50kg(rhoS: number, cs: number, tsS: number): number {
  assertPositive('ts', tsS);
  return ((1000 + 1.5 * cs * rhoS) * 0.116) / Math.sqrt(tsS);
}

/** Eq 9-18 (p. 545): tolerable step voltage, 70 kg: (1000 + 6·Cs·ρs) · 0.157/√ts (V). */
export function tolerableStep70kg(rhoS: number, cs: number, tsS: number): number {
  assertPositive('ts', tsS);
  return ((1000 + 6 * cs * rhoS) * 0.157) / Math.sqrt(tsS);
}

/** Eq 9-19 (p. 545): tolerable touch voltage, 70 kg: (1000 + 1.5·Cs·ρs) · 0.157/√ts (V). */
export function tolerableTouch70kg(rhoS: number, cs: number, tsS: number): number {
  assertPositive('ts', tsS);
  return ((1000 + 1.5 * cs * rhoS) * 0.157) / Math.sqrt(tsS);
}

/** Eqs 9-17 / 9-19 selected by body weight. */
export function tolerableTouch(rhoS: number, cs: number, tsS: number, weightKg: BodyWeightKg): number {
  return weightKg === 50 ? tolerableTouch50kg(rhoS, cs, tsS) : tolerableTouch70kg(rhoS, cs, tsS);
}

/** Eqs 9-16 / 9-18 selected by body weight. */
export function tolerableStep(rhoS: number, cs: number, tsS: number, weightKg: BodyWeightKg): number {
  return weightKg === 50 ? tolerableStep50kg(rhoS, cs, tsS) : tolerableStep70kg(rhoS, cs, tsS);
}

/** §9.7.1 (p. 539): Eq 9-12 is based on tests limited to 0.03-3.0 s and is not valid outside that range. */
export const BODY_CURRENT_VALID_DURATION_S = { min: 0.03, max: 3.0, cite: GROUNDING_CITES.bodyCurrent } as const;

/** §9.7.1 (p. 539): physiological thresholds quoted by the bulletin (50/60 Hz), in mA. */
export const BODY_CURRENT_THRESHOLDS = {
  perceptionMA: 1,
  letGoRangeMA: [1, 6] as const,
  cannotReleaseRangeMA: [9, 25] as const,
  ventricularFibrillationFromMA: 60,
  cite: { page: 539, section: '9.7.1', note: 'Approximate values; 60 mA is about the current of a 7.5 W, 120 V lamp.' } satisfies Citation,
} as const;

// ----- Surface layer: K, Cs (Eqs 9-20, 9-21; Fig 9-35; Table 9-4) -----

/** Eq 9-21 (p. 546): reflection factor K = (ρ − ρs)/(ρ + ρs). Negative when the surface layer is more resistive than the soil. */
export function reflectionFactor(rho: number, rhoS: number): number {
  return (rho - rhoS) / (rho + rhoS);
}

/**
 * Fig 9-35 (p. 547), digitized: Cs versus surface layer thickness hs for reflection factors K = -0.1 … -0.95,
 * precalculated by the source for a foot radius b = 0.08 m. Rows are hs (m); columns follow `k`.
 * The K = 0 column is not on the chart: it follows directly from Eq 9-20 (all Kⁿ terms vanish, so Cs = 1).
 */
export const FIG_9_35_CS = {
  footRadiusM: 0.08,
  k: [0, -0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9, -0.95] as const,
  /** [hs (m), Cs for each k in order]. */
  rows: [
    [0, [1, 0.82, 0.67, 0.54, 0.43, 0.34, 0.26, 0.18, 0.12, 0.06, 0.03]],
    [0.01, [1, 0.85, 0.73, 0.62, 0.53, 0.44, 0.36, 0.30, 0.24, 0.18, 0.16]],
    [0.02, [1, 0.88, 0.77, 0.68, 0.60, 0.52, 0.45, 0.39, 0.34, 0.29, 0.26]],
    [0.03, [1, 0.90, 0.81, 0.73, 0.66, 0.59, 0.53, 0.47, 0.42, 0.38, 0.36]],
    [0.04, [1, 0.91, 0.83, 0.76, 0.70, 0.65, 0.59, 0.54, 0.50, 0.45, 0.43]],
    [0.05, [1, 0.92, 0.86, 0.80, 0.74, 0.69, 0.64, 0.59, 0.55, 0.52, 0.50]],
    [0.06, [1, 0.93, 0.87, 0.82, 0.77, 0.72, 0.68, 0.64, 0.60, 0.57, 0.55]],
    [0.08, [1, 0.95, 0.90, 0.85, 0.81, 0.77, 0.74, 0.71, 0.68, 0.65, 0.63]],
    [0.10, [1, 0.95, 0.91, 0.88, 0.84, 0.81, 0.78, 0.75, 0.73, 0.70, 0.69]],
    [0.12, [1, 0.96, 0.93, 0.90, 0.87, 0.84, 0.81, 0.79, 0.77, 0.75, 0.74]],
    [0.15, [1, 0.97, 0.94, 0.91, 0.89, 0.87, 0.85, 0.83, 0.81, 0.79, 0.78]],
    [0.20, [1, 0.97, 0.95, 0.93, 0.92, 0.90, 0.88, 0.87, 0.85, 0.84, 0.83]],
    [0.25, [1, 0.98, 0.96, 0.95, 0.93, 0.92, 0.91, 0.89, 0.88, 0.87, 0.87]],
    [0.29, [1, 0.98, 0.97, 0.95, 0.94, 0.93, 0.92, 0.91, 0.90, 0.89, 0.89]],
  ] as ReadonlyArray<readonly [number, readonly number[]]>,
  cite: {
    page: 547,
    section: '9.9.1',
    figure: '9-35',
    originalSource: `${IEEE80}, Figure 7-6`,
    note:
      'UNCERTAIN: values digitized from the scanned chart (axis-calibrated, estimated accuracy ±0.01). The hs = 0 row was read at the ' +
      "chart's left edge and agrees with ρ/ρs = (1+K)/(1−K) within 0.01. Curves are drawn to hs ≈ 0.297 m; K = -0.9 and -0.95 nearly merge above 0.2 m.",
  } satisfies Citation,
} as const;

export interface CsLookup {
  cs: number;
  /** True when K or hs fell outside the chart (-0.95 ≤ K ≤ 0, 0 ≤ hs ≤ 0.29 m) and was clamped. */
  clamped: boolean;
}

/**
 * Surface layer derating factor Cs by bilinear interpolation of digitized Fig 9-35 (see FIG_9_35_CS).
 * If there is no surface layer, the bulletin sets Cs = 1 and ρs = ρ (§9.8, p. 544) — do not call this then.
 * Clamping K below -0.95 over-estimates Cs (non-conservative); callers should flag `clamped` results.
 */
export function surfaceLayerDeratingFactor(k: number, hsM: number): CsLookup {
  const ks = FIG_9_35_CS.k;
  const rows = FIG_9_35_CS.rows;
  let clamped = false;
  let kk = k;
  if (kk > 0) { kk = 0; clamped = true; }
  if (kk < -0.95) { kk = -0.95; clamped = true; }
  let h = hsM;
  const hMax = rows[rows.length - 1][0];
  if (h < 0) { h = 0; clamped = true; }
  if (h > hMax) { h = hMax; clamped = true; }
  // k array is descending (0 .. -0.95)
  let j = 0;
  while (j < ks.length - 2 && kk < ks[j + 1]) j++;
  const k0 = ks[j], k1 = ks[j + 1];
  const tk = k0 === k1 ? 0 : (kk - k0) / (k1 - k0);
  let i = 0;
  while (i < rows.length - 2 && h > rows[i + 1][0]) i++;
  const [h0, r0] = rows[i];
  const [h1, r1] = rows[i + 1];
  const th = h1 === h0 ? 0 : (h - h0) / (h1 - h0);
  const c0 = r0[j] + (r0[j + 1] - r0[j]) * tk;
  const c1 = r1[j] + (r1[j + 1] - r1[j]) * tk;
  return { cs: c0 + (c1 - c0) * th, clamped };
}

export interface SurfaceMaterialRow {
  no: number;
  description: string;
  /** Dry resistivity range, Ω·m (null where the table shows a dash). */
  dryOhmM: readonly [number, number] | null;
  /** Wet resistivity range, Ω·m. */
  wetOhmM: readonly [number, number];
  /** Water used for the wet test, as printed (e.g. "Groundwater, 45 Ω-m"). */
  wetCondition?: string;
  /** Sampling location state abbreviation as printed (NC, GA, CA, MI). */
  region?: string;
  note?: string;
}

/** Table 9-4 (p. 546): typical surface material resistivities (single values are stored as [v, v]). */
export const TABLE_9_4_SURFACE_MATERIALS: readonly SurfaceMaterialRow[] = [
  { no: 1, description: 'Crusher run granite with fines', region: 'NC', dryOhmM: [140e6, 140e6], wetOhmM: [1300, 1300], wetCondition: 'Groundwater, 45 Ω-m' },
  { no: 2, description: '1½ in. (0.04 m) crusher run granite with fines', region: 'GA', dryOhmM: [4000, 4000], wetOhmM: [1200, 1200], wetCondition: 'Rainwater, 100 Ω-m' },
  { no: 3, description: '¾-1 in. (0.02-0.025 m) granite with fines', region: 'CA', dryOhmM: null, wetOhmM: [6513, 6513], wetCondition: '10 minutes after 45 Ω-m water drained' },
  { no: 4, description: '#4 (1-2 in.) (0.025-0.05 m) washed granite', region: 'GA', dryOhmM: [1.5e6, 4.5e6], wetOhmM: [5000, 5000], wetCondition: 'Rainwater, 100 Ω-m' },
  { no: 5, description: '#3 (2-4 in.) (0.05-0.1 m) washed granite', region: 'GA', dryOhmM: [2.6e6, 3e6], wetOhmM: [10000, 10000], wetCondition: 'Rainwater, 100 Ω-m' },
  { no: 6, description: 'Size unknown, washed limestone', region: 'MI', dryOhmM: [7e6, 7e6], wetOhmM: [2000, 3000], wetCondition: 'Groundwater, 45 Ω-m' },
  { no: 7, description: 'Washed granite, similar to ¾-in. (0.02 m) gravel', dryOhmM: [2e6, 2e6], wetOhmM: [10000, 10000] },
  { no: 8, description: 'Washed granite, similar to pea gravel', dryOhmM: [40e6, 40e6], wetOhmM: [5000, 5000] },
  { no: 9, description: '#57 (¾-in.) (0.02 m) washed granite', region: 'NC', dryOhmM: [190e6, 190e6], wetOhmM: [8000, 8000], wetCondition: 'Groundwater, 45 Ω-m' },
  { no: 10, description: 'Asphalt', dryOhmM: [2e6, 30e6], wetOhmM: [10000, 6e6] },
  { no: 11, description: 'Concrete', dryOhmM: [1e6, 1e9], wetOhmM: [21, 100], note: 'Dry value is for oven-dried concrete; air-cured concrete can be much lower due to moisture content.' },
];

export const TABLE_9_4_CITE: Citation = {
  page: 546,
  section: '9.9',
  table: '9-4',
  originalSource: `${IEEE80}, Table 12-1`,
  note: 'Values are not valid for all stone types and sizes in a region; the bulletin says to test the stone actually used.',
};

// ----- Mesh voltage (Eqs 9-22 .. 9-33) -----

/** Eq 9-22 (p. 551): mesh voltage Em = ρ·Km·Ki·IG/LM (V). */
export function meshVoltage(rho: number, km: number, ki: number, igMaxA: number, lmM: number): number {
  assertPositive('LM', lmM);
  return (rho * km * ki * igMaxA) / lmM;
}

/** Eq 9-25 (p. 552): Kh = √(1 + h/ho), ho = 1 m. */
export function depthFactorKh(hM: number): number {
  return Math.sqrt(1 + hM / 1);
}

/**
 * Kii (p. 552): 1 for grids with ground rods along the perimeter or in the corners (and possibly throughout);
 * Eq 9-24, Kii = 1/(2n)^(2/n), for grids with no rods or only a few rods none in the corners or on the perimeter.
 */
export function innerConductorFactorKii(n: number, rodsOnPerimeterOrCorners: boolean): number {
  if (rodsOnPerimeterOrCorners) return 1;
  return 1 / Math.pow(2 * n, 2 / n);
}

/** Eq 9-23 (p. 551): geometrical spacing factor Km for mesh voltage. */
export function meshSpacingFactorKm(dSpacingM: number, dConductorM: number, hM: number, n: number, kii: number, kh: number): number {
  assertPositive('D', dSpacingM);
  assertPositive('d', dConductorM);
  assertPositive('h', hM);
  const D = dSpacingM, d = dConductorM, h = hM;
  const term1 = Math.log((D * D) / (16 * h * d) + ((D + 2 * h) * (D + 2 * h)) / (8 * D * d) - h / (4 * d));
  const term2 = (kii / kh) * Math.log(8 / (Math.PI * (2 * n - 1)));
  return (term1 + term2) / (2 * Math.PI);
}

export type GridShape = 'square' | 'rectangular' | 'L-shaped' | 'T-shaped' | 'triangular' | 'other';

export interface GridGeometry {
  shape: GridShape;
  /** LC, total length of horizontal grid conductor, m. */
  totalConductorLengthM: number;
  /** Lp, peripheral length, m. */
  perimeterM: number;
  /** A, grid area, m². */
  areaM2: number;
  /** Lx, Ly: maximum lengths in x and y, m (needed for nc and nd when the shape requires them). */
  lengthXM: number;
  lengthYM: number;
  /** Dm, maximum distance between any two points on the grid, m (needed for nd for T-shaped/triangular/other grids). */
  maxDistanceM?: number;
}

export interface GeometryFactorN {
  na: number;
  nb: number;
  nc: number;
  nd: number;
  n: number;
}

/**
 * Eqs 9-26 to 9-30 (pp. 552-553): effective number of parallel conductors n = na·nb·nc·nd.
 * nb = 1 for square grids; nc = 1 for square and rectangular grids; nd = 1 for square, rectangular and L-shaped grids.
 */
export function geometryFactorN(g: GridGeometry): GeometryFactorN {
  const na = (2 * g.totalConductorLengthM) / g.perimeterM; // Eq 9-27
  const nb = g.shape === 'square' ? 1 : Math.sqrt(g.perimeterM / (4 * Math.sqrt(g.areaM2))); // Eq 9-28
  const lxly = g.lengthXM * g.lengthYM;
  const nc = g.shape === 'square' || g.shape === 'rectangular' ? 1 : Math.pow(lxly / g.areaM2, (0.7 * g.areaM2) / lxly); // Eq 9-29
  let nd = 1;
  if (!(g.shape === 'square' || g.shape === 'rectangular' || g.shape === 'L-shaped')) {
    const dm = g.maxDistanceM ?? Math.hypot(g.lengthXM, g.lengthYM);
    nd = dm / Math.hypot(g.lengthXM, g.lengthYM); // Eq 9-30
  }
  return { na, nb, nc, nd, n: na * nb * nc * nd };
}

/** Eq 9-31 (p. 553): Ki = 0.644 + 0.148·n. */
export function irregularityFactorKi(n: number): number {
  return 0.644 + 0.148 * n;
}

/**
 * Eqs 9-32 / 9-33 (p. 553): effective buried length LM for mesh voltage.
 * @param rodsInCornersAndPerimeter true → Eq 9-33 (rods in corners, along the perimeter and throughout);
 *        false → Eq 9-32 (no rods, or a few scattered rods none in corners/perimeter)
 * @param rodLengthM Lr, length of each rod (Eq 9-33 only)
 */
export function effectiveMeshLengthLM(
  lcM: number,
  lrTotalM: number,
  rodsInCornersAndPerimeter: boolean,
  rodLengthM = 0,
  lengthXM = 0,
  lengthYM = 0,
): number {
  if (!rodsInCornersAndPerimeter || lrTotalM === 0) return lcM + lrTotalM; // Eq 9-32
  const diag = Math.hypot(lengthXM, lengthYM);
  assertPositive('grid diagonal', diag);
  return lcM + (1.55 + 1.22 * (rodLengthM / diag)) * lrTotalM; // Eq 9-33
}

// ----- Step voltage (Eqs 9-34 .. 9-36) -----

/** Eq 9-34 (p. 554): step voltage Es = ρ·Ks·Ki·IG/LS (V). */
export function stepVoltage(rho: number, ks: number, ki: number, igMaxA: number, lsM: number): number {
  assertPositive('LS', lsM);
  return (rho * ks * ki * igMaxA) / lsM;
}

/** Eq 9-35 (p. 554): LS = 0.75·LC + 0.85·LR. */
export function effectiveStepLengthLS(lcM: number, lrTotalM: number): number {
  return 0.75 * lcM + 0.85 * lrTotalM;
}

/** Eq 9-36 (p. 554): Ks = (1/π)[1/(2h) + 1/(D+h) + (1/D)(1 − 0.5^(n−2))], for 0.25 m < h < 2.5 m. */
export function stepSpacingFactorKs(dSpacingM: number, hM: number, n: number): number {
  assertPositive('D', dSpacingM);
  assertPositive('h', hM);
  return (1 / (2 * hM) + 1 / (dSpacingM + hM) + (1 / dSpacingM) * (1 - Math.pow(0.5, n - 2))) / Math.PI;
}

/** §9.10.5 (p. 554): range of burial depth for which Eq 9-36 applies. */
export const KS_VALID_DEPTH_M = { min: 0.25, max: 2.5 } as const;

// ----- GPR and grid resistance (Eqs 9-37, 9-38) -----

/** Eq 9-37 (p. 555): VGPR = IG · Rg (V). */
export function groundPotentialRise(igMaxA: number, rgOhm: number): number {
  return igMaxA * rgOhm;
}

/** Eq 9-38 (p. 555): Rg = ρ[1/LT + (1/√(20A))(1 + 1/(1 + h√(20/A)))] (Ω). */
export function gridResistance(rho: number, ltM: number, areaM2: number, hM: number): number {
  assertPositive('LT', ltM);
  assertPositive('A', areaM2);
  return rho * (1 / ltM + (1 / Math.sqrt(20 * areaM2)) * (1 + 1 / (1 + hM * Math.sqrt(20 / areaM2))));
}

// ---------------------------------------------------------------------------
// Table 9-1: decrement factor
// ---------------------------------------------------------------------------

export interface DecrementRow {
  seconds: number;
  cyclesAt60Hz: number;
  /** Df for X/R = 10, 20, 30, 40. */
  df: readonly [number, number, number, number];
}

/** Table 9-1 (p. 534): typical values of Df. Columns are X/R = 10, 20, 30, 40. */
export const TABLE_9_1_DECREMENT = {
  xOverR: [10, 20, 30, 40] as const,
  rows: [
    { seconds: 0.00833, cyclesAt60Hz: 0.5, df: [1.576, 1.648, 1.675, 1.688] },
    { seconds: 0.05, cyclesAt60Hz: 3, df: [1.232, 1.378, 1.462, 1.515] },
    { seconds: 0.1, cyclesAt60Hz: 6, df: [1.125, 1.232, 1.316, 1.378] },
    { seconds: 0.2, cyclesAt60Hz: 12, df: [1.064, 1.125, 1.181, 1.232] },
    { seconds: 0.3, cyclesAt60Hz: 18, df: [1.043, 1.085, 1.125, 1.163] },
    { seconds: 0.4, cyclesAt60Hz: 24, df: [1.033, 1.064, 1.095, 1.125] },
    { seconds: 0.5, cyclesAt60Hz: 30, df: [1.026, 1.052, 1.077, 1.101] },
    { seconds: 0.75, cyclesAt60Hz: 45, df: [1.018, 1.035, 1.052, 1.068] },
    { seconds: 1.0, cyclesAt60Hz: 60, df: [1.013, 1.026, 1.039, 1.052] },
  ] as readonly DecrementRow[],
  cite: {
    page: 534,
    section: '9.5.3',
    table: '9-1',
    originalSource: `${IEEE80}, Table 15-1`,
    note: 'First row printed as "0.008 33" s (half a cycle at 60 Hz). Df = 1.0 may be used for durations significantly greater than 1 s.',
  } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// Split factor charts (Figs 9-6 .. 9-27)
// ---------------------------------------------------------------------------

/** Grid-resistance abscissae (Ω) at which each digitized split-factor curve is sampled. */
export const SPLIT_FACTOR_RG_POINTS_OHM = [0.1, 0.2, 0.5, 1, 2, 5, 10, 25] as const;

export interface SplitFactorCurve {
  /** Curve label as printed, "A/B" = number of transmission lines / number of feeders. */
  label: string;
  lines: number;
  feeders: number;
  /**
   * Percent of total fault current flowing in the grid at each SPLIT_FACTOR_RG_POINTS_OHM value
   * (null = the curve is already below the chart's 1% floor).
   */
  pct: readonly (number | null)[];
  /** Grid resistance (Ω) at which the curve reaches the 1% floor, when it does so before 25 Ω. */
  floorAtOhm?: number;
}

export interface SplitFactorFigure {
  figure: string;
  page: number;
  /** Percent of fault current contributed by remote sources (100 = no local zero-sequence source). */
  remotePercent: 100 | 75 | 50 | 25;
  lineGroundResistance: 'low' | 'high';
  /** Transmission tower footing resistance assumed by the chart, Ω (null: no transmission line shield wire). */
  transmissionGroundOhm: number | null;
  /** Distribution (feeder) ground resistance assumed by the chart, Ω (null: no feeders). */
  distributionGroundOhm: number | null;
  /** Number of transmission lines fixed for the whole chart, or 'per-curve'. */
  transmissionLines: number | 'per-curve';
  /** Number of feeders fixed for the whole chart (0), or 'per-curve'. */
  feeders: 0 | 'per-curve';
  /** IEEE Std 80 Draft 13 figure number credited in the caption. */
  ieeeFigure: string;
  curves: readonly SplitFactorCurve[];
  /** False for Fig 9-15, whose printed chart does not match its caption (see note). */
  usable: boolean;
  note?: string;
}

const SF_NOTE =
  'UNCERTAIN: values digitized from the bulletin\'s vector chart paths (log-log axes calibrated to the gridlines, residual < 1.1 pt, ' +
  'i.e. about ±2% of the reading); rounded to 2 significant figures (1 decimal below 10%). Curve identities were checked against the printed labels.';

const c = (lines: number, feeders: number, pct: readonly (number | null)[], floorAtOhm?: number): SplitFactorCurve =>
  floorAtOhm === undefined ? { label: `${lines}/${feeders}`, lines, feeders, pct } : { label: `${lines}/${feeders}`, lines, feeders, pct, floorAtOhm };

/** Figs 9-6 to 9-27 (pp. 511-532): approximate split factor Sf charts, digitized. */
export const SPLIT_FACTOR_FIGURES: readonly SplitFactorFigure[] = [
  {
    figure: '9-6', page: 511, remotePercent: 100, lineGroundResistance: 'low', transmissionGroundOhm: 15, distributionGroundOhm: 25,
    transmissionLines: 1, feeders: 'per-curve', ieeeFigure: 'C1', usable: true,
    curves: [
      c(1, 1, [86, 78, 64, 48, 33, 16, 8.9, 3.7]),
      c(1, 2, [81, 71, 54, 37, 23, 11, 5.6, 2.3]),
      c(1, 4, [75, 61, 40, 25, 14, 6.2, 3.2, 1.3]),
      c(1, 8, [64, 47, 27, 15, 8.1, 3.4, 1.7, null], 18),
      c(1, 12, [56, 37, 20, 11, 5.8, 2.4, 1.2, null], 12),
      c(1, 16, [49, 31, 16, 8.5, 4.4, 1.8, null, null], 8.9),
    ],
  },
  {
    figure: '9-7', page: 512, remotePercent: 100, lineGroundResistance: 'high', transmissionGroundOhm: 100, distributionGroundOhm: 200,
    transmissionLines: 1, feeders: 'per-curve', ieeeFigure: 'C2', usable: true,
    curves: [
      c(1, 1, [91, 88, 80, 72, 58, 37, 23, 11]),
      c(1, 2, [89, 85, 76, 65, 49, 29, 17, 7.6]),
      c(1, 4, [86, 80, 69, 54, 37, 20, 11, 4.7]),
      c(1, 8, [82, 73, 56, 40, 25, 12, 6.5, 2.7]),
      c(1, 12, [79, 66, 47, 32, 19, 8.7, 4.6, 1.9]),
      c(1, 16, [75, 61, 42, 27, 15, 6.9, 3.5, 1.5]),
    ],
  },
  {
    figure: '9-8', page: 513, remotePercent: 100, lineGroundResistance: 'low', transmissionGroundOhm: 15, distributionGroundOhm: 25,
    transmissionLines: 2, feeders: 'per-curve', ieeeFigure: 'C3', usable: true,
    curves: [
      c(2, 1, [83, 75, 57, 40, 26, 12, 6.4, 2.7]),
      c(2, 2, [79, 68, 48, 33, 20, 8.8, 4.6, 1.9]),
      c(2, 4, [73, 58, 37, 23, 13, 5.7, 2.9, 1.2]),
      c(2, 8, [62, 44, 25, 14, 7.7, 3.3, 1.6, null], 16),
      c(2, 12, [54, 37, 20, 10, 5.6, 2.3, 1.1, null], 11),
      c(2, 16, [48, 30, 15, 8.2, 4.2, 1.7, null, null], 9),
    ],
  },
  {
    figure: '9-9', page: 514, remotePercent: 100, lineGroundResistance: 'high', transmissionGroundOhm: 100, distributionGroundOhm: 200,
    transmissionLines: 2, feeders: 'per-curve', ieeeFigure: 'C4', usable: true,
    curves: [
      c(2, 1, [89, 86, 76, 64, 49, 29, 17, 7.6]),
      c(2, 2, [87, 83, 72, 59, 42, 23, 13, 5.8]),
      c(2, 4, [86, 79, 64, 49, 34, 17, 9.3, 4.0]),
      c(2, 8, [82, 71, 54, 37, 23, 11, 5.9, 2.4]),
      c(2, 12, [77, 64, 46, 30, 18, 8.1, 4.3, 1.7]),
      c(2, 16, [74, 59, 40, 25, 15, 6.4, 3.4, 1.4]),
    ],
  },
  {
    figure: '9-10', page: 515, remotePercent: 100, lineGroundResistance: 'low', transmissionGroundOhm: 15, distributionGroundOhm: 25,
    transmissionLines: 4, feeders: 'per-curve', ieeeFigure: 'C5', usable: true,
    curves: [
      c(4, 1, [78, 66, 47, 31, 18, 8.2, 4.3, 1.8]),
      c(4, 2, [76, 61, 41, 26, 15, 6.5, 3.4, 1.4]),
      c(4, 4, [69, 53, 32, 19, 11, 4.6, 2.3, null], 25),
      c(4, 8, [59, 41, 23, 13, 6.9, 2.9, 1.5, null], 15),
      c(4, 12, [52, 34, 18, 9.6, 5.1, 2.1, null, null], 10),
      c(4, 16, [46, 29, 15, 7.7, 3.9, 1.6, null, null], 7.9),
    ],
  },
  {
    figure: '9-11', page: 516, remotePercent: 100, lineGroundResistance: 'high', transmissionGroundOhm: 100, distributionGroundOhm: 200,
    transmissionLines: 4, feeders: 'per-curve', ieeeFigure: 'C6', usable: true,
    curves: [
      c(4, 1, [88, 81, 68, 54, 37, 20, 11, 4.7]),
      c(4, 2, [86, 78, 65, 49, 33, 17, 9.3, 3.9]),
      c(4, 4, [85, 75, 59, 42, 27, 13, 7.2, 3.0]),
      c(4, 8, [79, 68, 49, 34, 20, 9.3, 4.9, 2.0]),
      c(4, 12, [76, 62, 43, 27, 16, 7.2, 3.7, 1.5]),
      c(4, 16, [73, 58, 38, 23, 13, 5.8, 3.0, 1.2]),
    ],
  },
  {
    figure: '9-12', page: 517, remotePercent: 100, lineGroundResistance: 'low', transmissionGroundOhm: 15, distributionGroundOhm: 25,
    transmissionLines: 8, feeders: 'per-curve', ieeeFigure: 'C7', usable: true,
    curves: [
      c(8, 1, [70, 53, 34, 21, 12, 5.0, 2.6, 1.0]),
      c(8, 2, [67, 51, 30, 18, 10, 4.3, 2.2, null], 22),
      c(8, 4, [61, 45, 26, 15, 8.0, 3.4, 1.7, null], 17),
      c(8, 8, [54, 36, 20, 11, 5.8, 2.3, 1.2, null], 12),
      c(8, 12, [48, 31, 16, 8.5, 4.4, 1.8, null, null], 8.9),
      c(8, 16, [42, 26, 13, 6.9, 3.5, 1.4, null, null], 7.3),
    ],
  },
  {
    figure: '9-13', page: 518, remotePercent: 100, lineGroundResistance: 'high', transmissionGroundOhm: 100, distributionGroundOhm: 200,
    transmissionLines: 8, feeders: 'per-curve', ieeeFigure: 'C8', usable: true,
    curves: [
      c(8, 1, [82, 72, 56, 39, 25, 12, 6.3, 2.7]),
      c(8, 2, [81, 71, 53, 37, 24, 11, 5.8, 2.4]),
      c(8, 4, [79, 68, 49, 34, 20, 9.3, 4.9, 2.0]),
      c(8, 8, [75, 62, 43, 27, 16, 7.2, 3.7, 1.5]),
      c(8, 12, [71, 57, 38, 24, 13, 5.8, 3.0, 1.2]),
      c(8, 16, [69, 53, 34, 20, 11, 4.9, 2.5, null], 25),
    ],
  },
  {
    figure: '9-14', page: 519, remotePercent: 100, lineGroundResistance: 'low', transmissionGroundOhm: 15, distributionGroundOhm: 25,
    transmissionLines: 12, feeders: 'per-curve', ieeeFigure: 'C9', usable: true,
    curves: [
      c(12, 1, [62, 45, 27, 16, 8.4, 3.5, 1.8, null], 18),
      c(12, 2, [60, 43, 25, 14, 7.7, 3.2, 1.6, null], 17),
      c(12, 4, [57, 39, 22, 12, 6.4, 2.7, 1.3, null], 14),
      c(12, 8, [49, 33, 17, 9.2, 4.8, 2.0, null, null], 10),
      c(12, 12, [45, 28, 14, 7.5, 3.8, 1.6, null, null], 7.9),
      c(12, 16, [40, 24, 12, 6.3, 3.2, 1.3, null, null], 6.5),
    ],
  },
  {
    figure: '9-15', page: 520, remotePercent: 100, lineGroundResistance: 'high', transmissionGroundOhm: 15, distributionGroundOhm: 25,
    transmissionLines: 16, feeders: 'per-curve', ieeeFigure: 'C10', usable: false,
    note:
      'UNCERTAIN: MISPRINT. The caption says "12 Transmission Lines, High Line Ground Resistance", but the printed chart is headed ' +
      '"TRANS GND - 15 OHMS / DIST. GND - 25 OHMS", its curves are labelled 16/1 … 16/16, and its curves match Fig 9-16 within about 1%. ' +
      'The 12-line, high-resistance chart is therefore missing from the bulletin. The data below are the chart as printed (16 lines, low).',
    curves: [
      c(16, 1, [57, 39, 22, 12, 6.6, 2.8, 1.4, null], 14),
      c(16, 2, [55, 38, 20, 12, 6.1, 2.5, 1.3, null], 13),
      c(16, 4, [52, 34, 18, 10, 5.3, 2.2, 1.1, null], 11),
      c(16, 8, [46, 29, 15, 8.0, 4.2, 1.7, null, null], 8.6),
      c(16, 12, [41, 25, 12, 6.6, 3.4, 1.4, null, null], 7),
      c(16, 16, [37, 22, 11, 5.6, 2.9, 1.2, null, null], 5.9),
    ],
  },
  {
    figure: '9-16', page: 521, remotePercent: 100, lineGroundResistance: 'low', transmissionGroundOhm: 15, distributionGroundOhm: 25,
    transmissionLines: 16, feeders: 'per-curve', ieeeFigure: 'C11', usable: true,
    curves: [
      c(16, 1, [57, 39, 22, 12, 6.5, 2.8, 1.4, null], 14),
      c(16, 2, [55, 38, 20, 12, 6.1, 2.5, 1.3, null], 13),
      c(16, 4, [52, 34, 18, 10, 5.3, 2.2, 1.1, null], 11),
      c(16, 8, [46, 29, 15, 8.0, 4.2, 1.7, null, null], 8.6),
      c(16, 12, [41, 25, 12, 6.6, 3.4, 1.4, null, null], 7.1),
      c(16, 16, [37, 22, 11, 5.7, 2.9, 1.2, null, null], 5.9),
    ],
  },
  {
    figure: '9-17', page: 522, remotePercent: 100, lineGroundResistance: 'high', transmissionGroundOhm: 100, distributionGroundOhm: 200,
    transmissionLines: 16, feeders: 'per-curve', ieeeFigure: 'C12', usable: true,
    curves: [
      c(16, 1, [74, 61, 41, 26, 15, 6.7, 3.5, 1.4]),
      c(16, 2, [74, 60, 40, 25, 14, 6.3, 3.3, 1.4]),
      c(16, 4, [71, 59, 37, 24, 13, 5.8, 3.0, 1.2]),
      c(16, 8, [69, 53, 33, 20, 11, 4.8, 2.5, 1.0]),
      c(16, 12, [65, 49, 30, 18, 9.9, 4.2, 2.2, null], 22),
      c(16, 16, [63, 47, 28, 16, 8.8, 3.7, 1.9, null], 19),
    ],
  },
  {
    figure: '9-18', page: 523, remotePercent: 100, lineGroundResistance: 'low', transmissionGroundOhm: 15, distributionGroundOhm: null,
    transmissionLines: 'per-curve', feeders: 0, ieeeFigure: 'C13', usable: true,
    curves: [
      c(1, 0, [90, 86, 78, 68, 54, 33, 20, 9.1]),
      c(2, 0, [87, 81, 68, 54, 38, 20, 11, 4.8]),
      c(4, 0, [81, 70, 54, 38, 23, 11, 5.8, 2.4]),
      c(8, 0, [72, 57, 37, 23, 13, 5.9, 3.0, 1.2]),
      c(12, 0, [64, 48, 29, 17, 9.4, 4.0, 2.0, null], 21),
      c(16, 0, [59, 41, 24, 13, 7.2, 3.0, 1.6, null], 16),
    ],
  },
  {
    figure: '9-19', page: 524, remotePercent: 100, lineGroundResistance: 'high', transmissionGroundOhm: 100, distributionGroundOhm: null,
    transmissionLines: 'per-curve', feeders: 0, ieeeFigure: 'C14', usable: true,
    curves: [
      c(1, 0, [92, 91, 86, 82, 72, 54, 37, 19]),
      c(2, 0, [91, 88, 82, 72, 58, 37, 23, 11]),
      c(4, 0, [88, 83, 72, 58, 42, 23, 13, 5.7]),
      c(8, 0, [83, 74, 58, 42, 27, 13, 7.1, 3.0]),
      c(12, 0, [79, 67, 49, 33, 20, 9.2, 4.9, 2.0]),
      c(16, 0, [74, 61, 42, 27, 16, 7.1, 3.7, 1.5]),
    ],
  },
  {
    figure: '9-20', page: 525, remotePercent: 100, lineGroundResistance: 'low', transmissionGroundOhm: null, distributionGroundOhm: 25,
    transmissionLines: 0, feeders: 'per-curve', ieeeFigure: 'C15', usable: true,
    curves: [
      c(0, 1, [95, 91, 79, 64, 47, 25, 14, 6.1]),
      c(0, 2, [91, 82, 65, 47, 30, 14, 7.6, 3.1]),
      c(0, 4, [82, 68, 47, 30, 17, 7.5, 3.8, 1.6]),
      c(0, 8, [70, 51, 30, 17, 9.3, 3.9, 2.0, null], 20),
      c(0, 12, [60, 41, 22, 12, 6.4, 2.6, 1.3, null], 13),
      c(0, 16, [53, 34, 17, 9.4, 4.9, 2.0, null, null], 10),
    ],
  },
  {
    figure: '9-21', page: 526, remotePercent: 100, lineGroundResistance: 'high', transmissionGroundOhm: null, distributionGroundOhm: 200,
    transmissionLines: 0, feeders: 'per-curve', ieeeFigure: 'C16', usable: true,
    curves: [
      c(0, 1, [99, 98, 92, 88, 77, 58, 40, 21]),
      c(0, 2, [98, 95, 88, 77, 63, 40, 25, 12]),
      c(0, 4, [95, 89, 77, 63, 46, 25, 14, 6.2]),
      c(0, 8, [89, 80, 63, 46, 30, 14, 7.8, 3.3]),
      c(0, 12, [84, 73, 53, 36, 22, 10, 5.3, 2.2]),
      c(0, 16, [81, 67, 46, 30, 17, 7.7, 4.0, 1.6]),
    ],
  },
  {
    figure: '9-22', page: 527, remotePercent: 75, lineGroundResistance: 'low', transmissionGroundOhm: 15, distributionGroundOhm: null,
    transmissionLines: 'per-curve', feeders: 0, ieeeFigure: 'C17', usable: true,
    curves: [
      c(1, 0, [68, 66, 60, 52, 41, 25, 15, 6.9]),
      c(2, 0, [66, 61, 52, 41, 28, 15, 8.2, 3.6]),
      c(4, 0, [62, 54, 41, 28, 18, 8.3, 4.4, 1.8]),
      c(8, 0, [55, 43, 29, 18, 10, 4.5, 2.3, null], 23),
      c(12, 0, [49, 37, 22, 13, 7.2, 3.0, 1.5, null], 15),
      c(16, 0, [44, 32, 18, 10, 5.5, 2.3, 1.2, null], 12),
    ],
  },
  {
    figure: '9-23', page: 528, remotePercent: 75, lineGroundResistance: 'high', transmissionGroundOhm: 100, distributionGroundOhm: null,
    transmissionLines: 'per-curve', feeders: 0, ieeeFigure: 'C18', usable: true,
    curves: [
      c(1, 0, [69, 69, 66, 62, 55, 41, 28, 15]),
      c(2, 0, [69, 66, 62, 55, 45, 28, 18, 8.2]),
      c(4, 0, [67, 63, 54, 44, 32, 18, 10, 4.4]),
      c(8, 0, [64, 57, 44, 32, 21, 10, 5.4, 2.2]),
      c(12, 0, [60, 51, 37, 25, 15, 7.0, 3.7, 1.5]),
      c(16, 0, [57, 47, 32, 21, 12, 5.4, 2.8, 1.2]),
    ],
  },
  {
    figure: '9-24', page: 529, remotePercent: 50, lineGroundResistance: 'low', transmissionGroundOhm: 15, distributionGroundOhm: null,
    transmissionLines: 'per-curve', feeders: 0, ieeeFigure: 'C19', usable: true,
    curves: [
      c(1, 0, [46, 44, 40, 35, 27, 17, 10, 4.6]),
      c(2, 0, [44, 41, 35, 27, 19, 10, 5.6, 2.4]),
      c(4, 0, [42, 37, 28, 20, 12, 5.7, 3.0, 1.3]),
      c(8, 0, [38, 30, 20, 12, 7.0, 3.1, 1.6, null], 16),
      c(12, 0, [35, 26, 15, 9.0, 4.9, 2.1, 1.1, null], 11),
      c(16, 0, [31, 22, 12, 7.0, 3.8, 1.6, null, null], 7.9),
    ],
  },
  {
    figure: '9-25', page: 530, remotePercent: 50, lineGroundResistance: 'high', transmissionGroundOhm: 100, distributionGroundOhm: null,
    transmissionLines: 'per-curve', feeders: 0, ieeeFigure: 'C20', usable: true,
    curves: [
      c(1, 0, [47, 46, 44, 41, 37, 27, 19, 10]),
      c(2, 0, [46, 45, 41, 36, 30, 19, 12, 5.5]),
      c(4, 0, [46, 43, 37, 30, 22, 12, 6.8, 2.9]),
      c(8, 0, [44, 40, 31, 22, 14, 7.1, 3.7, 1.6]),
      c(12, 0, [42, 36, 26, 18, 11, 4.9, 2.5, null], 25),
      c(16, 0, [40, 33, 22, 14, 8.3, 3.7, 1.9, null], 20),
    ],
  },
  {
    figure: '9-26', page: 531, remotePercent: 25, lineGroundResistance: 'low', transmissionGroundOhm: 15, distributionGroundOhm: null,
    transmissionLines: 'per-curve', feeders: 0, ieeeFigure: 'C21', usable: true,
    note:
      'UNCERTAIN: the 1/0 and 2/0 curves start near 38-39% at 0.1 Ω, above the 25% remote share, and cross each other at low Rg; ' +
      'this is how the chart is printed. Verify against IEEE Std 80 Annex C before relying on Figs 9-26/9-27.',
    curves: [
      c(1, 0, [38, 36, 33, 28, 23, 14, 8.2, 3.8]),
      c(2, 0, [39, 36, 31, 24, 17, 8.8, 4.9, 2.1]),
      c(4, 0, [21, 19, 14, 9.9, 6.2, 2.9, 1.5, null], 15),
      c(8, 0, [20, 16, 11, 6.6, 3.8, 1.6, null, null], 8.5),
      c(12, 0, [19, 14, 8.2, 4.8, 2.6, 1.1, null, null], 5.7),
      c(16, 0, [16, 11, 6.5, 3.6, 2.0, null, null, null], 4),
    ],
  },
  {
    figure: '9-27', page: 532, remotePercent: 25, lineGroundResistance: 'high', transmissionGroundOhm: 100, distributionGroundOhm: null,
    transmissionLines: 'per-curve', feeders: 0, ieeeFigure: 'C22', usable: true,
    note: 'UNCERTAIN: as Fig 9-26, the 1/0 and 2/0 curves start near 40% (above the 25% remote share); 4/0 and 8/0 also cross at low Rg.',
    curves: [
      c(1, 0, [39, 38, 36, 34, 30, 23, 15, 8.0]),
      c(2, 0, [41, 40, 37, 33, 26, 17, 10, 4.8]),
      c(4, 0, [23, 22, 19, 15, 11, 6.1, 3.4, 1.5]),
      c(8, 0, [24, 21, 17, 12, 7.6, 3.7, 1.9, null], 20),
      c(12, 0, [23, 19, 14, 9.4, 5.7, 2.6, 1.3, null], 14),
      c(16, 0, [21, 17, 12, 7.6, 4.3, 1.9, null, null], 10),
    ],
  },
];

export const SPLIT_FACTOR_CHART_CITE: Citation = {
  page: [510, 533],
  section: '9.5.2',
  figure: '9-6 to 9-27',
  originalSource: `${IEEE80}, Figures C1 to C22`,
  note: SF_NOTE,
};

/** §9.5.2 rules for using the charts, paraphrased. */
export const SPLIT_FACTOR_GUIDANCE: readonly Guidance[] = [
  {
    id: 'sf-purpose',
    text: 'The split factor accounts for the fact that only part of the fault current returns through the earth; the rest returns over shield wires, neutrals, buried pipes and cables.',
    cite: { page: 510, section: '9.5.2' },
    tags: ['grounding', 'split-factor'],
  },
  {
    id: 'sf-method',
    text: 'A program such as EPRI SMECC is the most accurate way to find the earth-return share, but it needs extensive data, so the bulletin uses the graphical method.',
    cite: { page: 510, section: '9.5.2' },
    tags: ['grounding', 'split-factor'],
  },
  {
    id: 'sf-100-remote',
    text: 'Figs 9-6 to 9-21 (100% remote contribution) represent distribution substations with delta-wye grounded transformers, switching stations, and transmission stations with no local zero-sequence source.',
    cite: { page: 511, section: '9.5.2', figure: '9-6 to 9-21' },
    tags: ['grounding', 'split-factor'],
  },
  {
    id: 'sf-local',
    text: 'Figs 9-22 to 9-27 (75/50/25% remote) represent transmission or generating stations with local zero-sequence sources such as autotransformers or grounded-wye step-up transformers; feeders count as transmission lines on these charts, and a larger local share means less earth current.',
    cite: { page: 526, section: '9.5.2', figure: '9-22 to 9-27' },
    tags: ['grounding', 'split-factor'],
  },
  {
    id: 'sf-count',
    text: 'Count only transmission lines with overhead shield wires and feeders with solidly grounded neutrals; if the count falls between curves, use the curve with fewer lines.',
    cite: { page: 532, section: '9.5.2' },
    tags: ['grounding', 'split-factor', 'design-check'],
  },
  {
    id: 'sf-rg',
    text: 'Enter the chart with the approximate grid resistance from Eq 9-6 and read the percentage on the y-axis, then convert it to a decimal before using it in Eq 9-4.',
    cite: { page: [532, 533], section: '9.5.2', equation: '9-6' },
    tags: ['grounding', 'split-factor'],
  },
  {
    id: 'sf-tower-impedance',
    text: 'The approximate tower (footing) impedance of the lines and feeders must be known to pick between the low-resistance charts (15 Ω towers / 25 Ω distribution grounds) and the high-resistance charts (100 Ω / 200 Ω).',
    cite: { page: 532, section: '9.5.2', note: 'Ohm values are from the chart headings.' },
    tags: ['grounding', 'split-factor'],
  },
  {
    id: 'sf-shield-wires',
    text: 'The chart values assume every shield wire entering the station is bonded to the grid; bonding them, or using larger or more conductive shield wires, diverts fault current away from the earth.',
    cite: { page: 556, section: '9.10.7' },
    tags: ['grounding', 'split-factor', 'shield-wire'],
  },
];

export interface SplitFactorQuery {
  /** Percent of the fault current supplied from remote sources (100 for a delta-wye distribution substation). */
  remotePercent: number;
  /** Transmission lines with overhead shield wires (bonded to the grid). */
  transmissionLines: number;
  /** Feeders with solidly grounded (multigrounded) neutrals. */
  feeders: number;
  lineGroundResistance: 'low' | 'high';
  /** Grid resistance, Ω (Eq 9-6 for a first estimate). */
  gridResistanceOhm: number;
}

export interface SplitFactorResult {
  /** Split factor as a decimal (chart % / 100). */
  sf: number;
  figure: string | null;
  curve: string | null;
  notes: string[];
}

const SF_STEPS = [1, 2, 4, 8, 12, 16] as const;
function roundDownToStep(nLines: number): number {
  let best: number = SF_STEPS[0];
  for (const s of SF_STEPS) if (nLines >= s) best = s;
  return best;
}

/** Log-log interpolation of one digitized curve at grid resistance rg (Ω). */
export function interpolateSplitFactorCurve(curve: SplitFactorCurve, rgOhm: number): { pct: number; note?: string } {
  const pts: Array<[number, number]> = [];
  SPLIT_FACTOR_RG_POINTS_OHM.forEach((r, i) => {
    const v = curve.pct[i];
    if (v !== null && v !== undefined) pts.push([r, v]);
  });
  if (curve.floorAtOhm !== undefined) pts.push([curve.floorAtOhm, 1]);
  pts.sort((a, b) => a[0] - b[0]);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (rgOhm <= first[0]) return { pct: first[1], note: rgOhm < first[0] ? 'Rg below 0.1 Ω chart range: used the 0.1 Ω value (may under-estimate Sf).' : undefined };
  if (rgOhm >= last[0]) {
    if (curve.floorAtOhm !== undefined) return { pct: 1, note: 'Curve is below the 1% chart floor at this Rg: used 1% (an upper bound).' };
    return { pct: last[1], note: rgOhm > last[0] ? 'Rg above 25 Ω chart range: used the 25 Ω value (conservative).' : undefined };
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const [r0, p0] = pts[i];
    const [r1, p1] = pts[i + 1];
    if (rgOhm >= r0 && rgOhm <= r1) {
      const t = (Math.log(rgOhm) - Math.log(r0)) / (Math.log(r1) - Math.log(r0));
      return { pct: Math.exp(Math.log(p0) + t * (Math.log(p1) - Math.log(p0))) };
    }
  }
  return { pct: last[1] };
}

/**
 * Pick the bulletin chart and curve for a station and read Sf (as a decimal).
 * Bulletin rules applied: only shielded lines / grounded-neutral feeders count; between curve values use the
 * lower number of lines (applied to feeders too); feeders count as lines on the local-source charts.
 * Game-side choices (NOT stated by the bulletin) are reported in `notes`: remote shares between 25/50/75/100%
 * are rounded up (more earth current), Fig 9-15 is replaced by Fig 9-13 because of its misprint, and a station
 * with no shielded lines and no grounded-neutral feeders gets Sf = 1.
 */
export function splitFactorFromCharts(q: SplitFactorQuery): SplitFactorResult {
  const notes: string[] = [];
  const lines = Math.max(0, Math.floor(q.transmissionLines));
  const feeders = Math.max(0, Math.floor(q.feeders));
  const remoteSteps = [25, 50, 75, 100] as const;
  const remote = remoteSteps.find((r) => q.remotePercent <= r) ?? 100;
  if (remote !== q.remotePercent) notes.push(`Remote share ${q.remotePercent}% rounded up to the ${remote}% charts (game assumption, conservative).`);

  let fig: SplitFactorFigure | undefined;
  let curve: SplitFactorCurve | undefined;
  if (remote === 100) {
    if (lines === 0 && feeders === 0) {
      notes.push('No shielded lines or grounded-neutral feeders: all fault current assumed to return through earth, Sf = 1 (game assumption).');
      return { sf: 1, figure: null, curve: null, notes };
    }
    if (feeders === 0) {
      fig = SPLIT_FACTOR_FIGURES.find((f) => f.remotePercent === 100 && f.feeders === 0 && f.lineGroundResistance === q.lineGroundResistance);
      const L = roundDownToStep(lines);
      curve = fig?.curves.find((cv) => cv.lines === L);
    } else if (lines === 0) {
      fig = SPLIT_FACTOR_FIGURES.find((f) => f.remotePercent === 100 && f.transmissionLines === 0 && f.lineGroundResistance === q.lineGroundResistance);
      const F = roundDownToStep(feeders);
      curve = fig?.curves.find((cv) => cv.feeders === F);
    } else {
      let L = roundDownToStep(lines);
      if (L === 12 && q.lineGroundResistance === 'high') {
        L = 8;
        notes.push('Fig 9-15 (12 lines, high resistance) is misprinted in the bulletin; used Fig 9-13 (8 lines), i.e. the next lower number of lines.');
      }
      fig = SPLIT_FACTOR_FIGURES.find((f) => f.remotePercent === 100 && f.transmissionLines === L && f.lineGroundResistance === q.lineGroundResistance && f.usable);
      const F = roundDownToStep(feeders);
      curve = fig?.curves.find((cv) => cv.feeders === F);
    }
  } else {
    const total = lines + feeders; // feeders are counted as transmission lines on the local-source charts
    if (total === 0) {
      notes.push('No shielded lines: the local-source charts need at least one line; Sf = remote share used (game assumption).');
      return { sf: remote / 100, figure: null, curve: null, notes };
    }
    fig = SPLIT_FACTOR_FIGURES.find((f) => f.remotePercent === remote && f.lineGroundResistance === q.lineGroundResistance);
    curve = fig?.curves.find((cv) => cv.lines === roundDownToStep(total));
  }
  if (!fig || !curve) throw new Error('No split-factor chart matches the query');
  const r = interpolateSplitFactorCurve(curve, q.gridResistanceOhm);
  if (r.note) notes.push(r.note);
  return { sf: r.pct / 100, figure: fig.figure, curve: curve.label, notes };
}

// ---------------------------------------------------------------------------
// Design rules and limits (numbers the game can check)
// ---------------------------------------------------------------------------

export interface RuleValue<T> {
  value: T;
  unit: string;
  /** Imperial value as printed, when the bulletin gives one. */
  imperial?: string;
  cite: Citation;
}

export const GROUNDING_RULES = {
  gridResistanceTransmissionOhm: { value: 1, unit: 'Ω (about, or less)', cite: GROUNDING_CITES.resistanceTargets } as RuleValue<number>,
  gridResistanceDistributionOhm: { value: [1, 5] as const, unit: 'Ω (usual acceptable range)', cite: GROUNDING_CITES.resistanceTargets } as RuleValue<readonly [number, number]>,
  /** §9.4: fence at least 3 ft inside the outer grid conductors. §9.10.2 step 2 / §9.10.10.1: perimeter conductor 0.91 m (3 ft) outside the fence. */
  perimeterConductorOutsideFenceM: { value: 0.91, unit: 'm minimum', imperial: '3.0 ft', cite: { page: [548, 558], section: '9.10.2 step 2; 9.10.10.1', note: 'Fig 9-36: 3 ft is the minimum, 4 ft is recommended. §9.4 (p. 506) states the same 3 ft minimum.' } } as RuleValue<number>,
  perimeterConductorOutsideFenceRecommendedM: { value: 1.22, unit: 'm', imperial: '4 ft-0 in', cite: { page: 559, figure: '9-36', note: 'Metric value converted from 4 ft (drawing gives feet only).' } } as RuleValue<number>,
  gridBeyondOutwardSwingingGateM: { value: 0.91, unit: 'm minimum past the maximum gate swing', imperial: '3 ft', cite: { page: 558, section: '9.10.10.1', note: 'Gates should swing inward; Fig 9-36 shows the gate by-pass conductor 1 ft-6 in beyond opened gates.' } } as RuleValue<number>,
  fenceGroundConnectionSpacingM: {
    value: [12.19, 15.24] as const,
    unit: 'm between line-post connections (plus every corner post)',
    imperial: '40 to 50 ft',
    cite: { page: 558, section: '9.10.10.1', note: 'UNCERTAIN: the bulletin prints "12.92 to 15.24 meters (40 to 50 feet)"; 40 ft = 12.19 m, so 12.92 appears to be a typo. Fig 9-36 plan shows "75\' approx." between connections on one side.' },
  } as RuleValue<readonly [number, number]>,
  conductorSpacingFirstRowM: { value: [3, 15] as const, unit: 'm', imperial: '9.8 to 49.2 ft', cite: { page: 549, section: '9.10.2 step 8' } } as RuleValue<readonly [number, number]>,
  conductorSpacingRatio: { value: [1, 3] as const, unit: 'second-row spacing ÷ first-row spacing (1:1 to 1:3)', cite: { page: 549, section: '9.10.2 step 8' } } as RuleValue<readonly [number, number]>,
  preliminaryMeshSizeM: { value: [6.1, 12.2] as const, unit: 'm square mesh', imperial: '20 to 40 ft', cite: { page: 550, section: '9.10.3 step 2' } } as RuleValue<readonly [number, number]>,
  gridConductorSizeRange: { value: ['2/0 AWG (67 mm²)', '500 kcmil (253 mm²)'] as const, unit: '', cite: { page: 549, section: '9.10.2 step 8', note: 'Conductor diameter has negligible effect on mesh voltage; size per §9.6.4.' } } as RuleValue<readonly [string, string]>,
  criticalConnectionMinSize: { value: '1/0 AWG', unit: '', cite: { page: 538, section: '9.6.6', note: 'For mechanical adequacy of any critical connection.' } } as RuleValue<string>,
  burialDepthM: { value: [0.46, 1.5] as const, unit: 'm below final grade (excluding crushed rock)', imperial: '18 to 59.1 in', cite: { page: 549, section: '9.10.2 step 9', note: 'Deeper burial may be needed where soil is normally dry near the surface.' } } as RuleValue<readonly [number, number]>,
  preliminaryDepthM: { value: 0.4572, unit: 'm', imperial: '18 in', cite: { page: 550, section: '9.10.3 step 3' } } as RuleValue<number>,
  rodDiameterM: { value: 0.016, unit: 'm', imperial: '5/8 in', cite: { page: 549, section: '9.10.2 step 10' } } as RuleValue<number>,
  rodMinLengthM: { value: 2.5, unit: 'm minimum', imperial: '8.0 ft', cite: { page: 549, section: '9.10.2 step 10', note: 'Copper, steel or other approved type from RUS IP 202-1. Fig 9-36 lists 8 ft-0 in minimum rods.' } } as RuleValue<number>,
  rodTopBelowGradeM: { value: 0.05, unit: 'm minimum', imperial: '1.97 in', cite: { page: 549, section: '9.10.2 step 10' } } as RuleValue<number>,
  rodMinSpacing: { value: 'not closer than the rod length', unit: '', cite: { page: 549, section: '9.10.2 step 10' } } as RuleValue<string>,
  rodMaxAverageCurrentA: { value: 300, unit: 'A average fault current per rod (all grid current assumed to enter through the rods)', cite: { page: 549, section: '9.10.2 step 10' } } as RuleValue<number>,
  surfaceLayerMinThicknessM: { value: 0.10, unit: 'm minimum', imperial: '4 in', cite: { page: 549, section: '9.10.2 step 7' } } as RuleValue<number>,
  surfaceLayerTypicalThicknessM: { value: [0.08, 0.15] as const, unit: 'm', imperial: '3 to 6 in', cite: { page: 545, section: '9.9' } } as RuleValue<readonly [number, number]>,
  surfaceLayerPreliminaryThicknessM: { value: 0.1016, unit: 'm', imperial: '4 in', cite: { page: 550, section: '9.10.3 step 4', note: '§9.9.1 (p. 547) gives 0.101 m (4 in) for the initial Cs reading unless a standard thickness is used.' } } as RuleValue<number>,
  surfaceLayerPracticalMaxThicknessM: { value: 0.1524, unit: 'm (practical limit)', imperial: '6 in', cite: { page: 555, section: '9.10.7' } } as RuleValue<number>,
  surfaceLayerMinResistivityOhmM: { value: 3000, unit: 'Ω·m minimum, wet or dry', cite: { page: 549, section: '9.10.2 step 7' } } as RuleValue<number>,
  surfaceLayerExtentOutsideFenceM: {
    value: 1.0,
    unit: 'm minimum outside the fence',
    imperial: '3.3 ft',
    cite: { page: 549, section: '9.10.2 step 7', note: '§9.9 (p. 545) and §9.10.10.2 (p. 558) describe 0.91-1.22 m (3-4 ft) outside the fence; without it the touch voltage outside the fence may be dangerously high.' },
  } as RuleValue<number>,
  deepLayerRodsDepthM: { value: 3.05, unit: 'm', imperial: '10 ft', cite: { page: 556, section: '9.10.7', note: 'Use longer rods when a lower-resistivity bottom layer lies deeper than this.' } } as RuleValue<number>,
  wireMat: { value: 'No. 6 AWG copper-clad steel wires in a 0.6 × 0.6 m (24 × 24 in) grid', unit: '', cite: { page: [556, 557], section: '9.10.7' } } as RuleValue<string>,
  distributionFaultGrowthFactor: { value: 1.1, unit: '× I0 (suggested future-growth factor for distribution stations)', cite: { page: 510, section: '9.5.1' } } as RuleValue<number>,
  interruptingRatingMultiple: { value: 10, unit: '× ultimate SLG fault current (upper end, if equipment interrupting rating is used)', cite: { page: 510, section: '9.5.1', note: 'Using the interrupting rating is extremely conservative and may make a compliant grid impossible.' } } as RuleValue<number>,
  dfUnityAboveS: { value: 1, unit: 's (Df = 1.0 may be used for durations significantly greater than this)', cite: { page: 534, section: '9.5.3' } } as RuleValue<number>,
  hardDrawnCopperMaxTempC: { value: 250, unit: '°C (to avoid annealing when strength is needed)', cite: { page: 537, section: '9.6.5' } } as RuleValue<number>,
} as const;

/** §9.10.8 (p. 557): parameter ranges over which the Em/Es equations were compared with computer results. */
export const EQUATION_VALIDITY_RANGE = {
  areaM2: [6.25, 10000] as const,
  areaFt2: [67.27, 107639.1] as const,
  meshesPerSide: [1, 40] as const,
  meshSizeM: [2.5, 22.5] as const,
  shapes: ['square', 'rectangular', 'triangular', 'T-shaped', 'L-shaped'] as const,
  cite: {
    page: 557,
    section: '9.10.8',
    note: 'UNCERTAIN: the mesh size is printed as "2.5 to 22.5 meters (8.2 to 78.8 feet)"; 22.5 m = 73.8 ft, so the feet value appears to be a typo. Uniform soil and uniform conductor spacing assumed throughout.',
  } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// Procedure, modifications, danger points (paraphrased guidance)
// ---------------------------------------------------------------------------

/** §9.10.2 (pp. 548-550): the 16-step design procedure, paraphrased. */
export const DESIGN_PROCEDURE_STEPS: readonly Guidance[] = [
  { id: 'dp-01', text: 'Bury a network of bare conductors that grounds neutrals, equipment and structures; the design is adequate when the calculated mesh and step voltages are below the tolerable touch and step voltages.', cite: { page: 548, section: '9.10.2 step 1' }, tags: ['grounding', 'procedure'] },
  { id: 'dp-02', text: 'Cover the whole fenced area with grid and run a perimeter conductor 0.91 m (3 ft) outside the fence, including around gates in any position; also ring the equipment cluster if the fence is far from it.', cite: { page: 548, section: '9.10.2 step 2' }, tags: ['grounding', 'procedure', 'fence', 'design-check'] },
  { id: 'dp-03', text: 'Use soil resistivity tests to choose a uniform or two-layer soil model; preliminary uniform-soil resistance estimates are refined later, ideally by detailed computer analysis.', cite: { page: 548, section: '9.10.2 step 3', note: 'UNCERTAIN: the text says preliminary resistance can be found with "Equation 9-3", which is the resistivity average; the resistance equations are 9-6 and 9-38.' }, tags: ['grounding', 'procedure', 'soil'] },
  { id: 'dp-04', text: 'Use the maximum expected future fault current (3I0) that any grounding conductor will carry, and a clearing time tc that includes backup protection.', cite: { page: 548, section: '9.10.2 step 4' }, tags: ['grounding', 'procedure', 'fault-current'] },
  { id: 'dp-05', text: 'Compute the tolerable touch and step voltages (§9.8); worst-case primary clearing time is normally used for ts, backup clearing time for an extremely conservative design.', cite: { page: 549, section: '9.10.2 step 5', originalSource: 'IEEE Std 80 clauses 5.2 to 6.3' }, tags: ['grounding', 'procedure'] },
  { id: 'dp-06', text: 'Size the equipment ground conductors per §9.6.2.', cite: { page: 549, section: '9.10.2 step 6' }, tags: ['grounding', 'procedure', 'conductor'] },
  { id: 'dp-07', text: 'Cover everything inside the fence, plus at least 1.0 m (3.3 ft) outside it, with at least 10 cm (4 in) of crushed rock (or equal) of at least 3000 Ω·m wet or dry.', cite: { page: 549, section: '9.10.2 step 7' }, tags: ['grounding', 'procedure', 'surfacing', 'design-check'] },
  { id: 'dp-08', text: 'Lay the grid as a checkerboard with conductors 3-15 m apart in one direction and 1 to 3 times that spacing in the other, bonding every crossing; conductors range from 2/0 AWG to 500 kcmil.', cite: { page: 549, section: '9.10.2 step 8' }, tags: ['grounding', 'procedure', 'design-check'] },
  { id: 'dp-09', text: 'Bury grid conductors 0.46-1.5 m (18-59 in) below final grade (not counting the rock), plowed in or trenched; dry surface soils may need deeper burial.', cite: { page: 549, section: '9.10.2 step 9' }, tags: ['grounding', 'procedure', 'design-check'] },
  { id: 'dp-10', text: 'Put rods at grid corners and perimeter junctions and near surge arresters and major equipment; use 16 mm (5/8 in) × 2.5 m (8 ft) minimum rods, tops 5 cm below grade, spaced at least one rod length apart, and enough rods that each averages no more than 300 A.', cite: { page: 549, section: '9.10.2 step 10' }, tags: ['grounding', 'procedure', 'rods', 'design-check'] },
  { id: 'dp-11', text: 'If the GPR of the preliminary design is below the tolerable touch voltage, no further analysis is needed beyond adding access to equipment grounds.', cite: { page: 549, section: '9.10.2 step 11' }, tags: ['grounding', 'procedure', 'gpr'] },
  { id: 'dp-12', text: 'Otherwise compute mesh and step voltages with the uniform-soil approximations of §9.10.4 and §9.10.5.', cite: { page: 549, section: '9.10.2 step 12' }, tags: ['grounding', 'procedure'] },
  { id: 'dp-13', text: 'If the mesh voltage is below the tolerable touch voltage the design may be complete; if not, revise it (§9.10.7).', cite: { page: 550, section: '9.10.2 step 13' }, tags: ['grounding', 'procedure'] },
  { id: 'dp-14', text: 'Both computed touch (mesh) and step voltages must be below their tolerable values, or the design must be revised.', cite: { page: 550, section: '9.10.2 step 14' }, tags: ['grounding', 'procedure', 'design-check'] },
  { id: 'dp-15', text: 'Revisions include closer conductor spacing and more ground rods (§9.10.7).', cite: { page: 550, section: '9.10.2 step 15' }, tags: ['grounding', 'procedure'] },
  { id: 'dp-16', text: 'Finally add conductors for irregular sites and near equipment, extra rods at arresters and transformer neutrals, and review transferred-potential and special danger points.', cite: { page: 550, section: '9.10.2 step 16' }, tags: ['grounding', 'procedure'] },
];

/** §9.10.3 (p. 550): preliminary design steps, paraphrased. */
export const PRELIMINARY_DESIGN_STEPS: readonly Guidance[] = [
  { id: 'pd-uniform', text: 'Use uniform square or rectangular mesh so the simplified equations apply everywhere; later changes must never create a mesh larger than the one analysed.', cite: { page: 550, section: '9.10.3' }, tags: ['grounding', 'preliminary'] },
  { id: 'pd-1', text: 'Draw the largest square, rectangular, triangular, T- or L-shaped grid that fits the site (the same outline used for the grid area in §9.4).', cite: { page: 550, section: '9.10.3 step 1' }, tags: ['grounding', 'preliminary'] },
  { id: 'pd-2', text: 'Start with square meshes of about 6.1-12.2 m (20-40 ft) on a side.', cite: { page: 550, section: '9.10.3 step 2' }, tags: ['grounding', 'preliminary'] },
  { id: 'pd-3', text: 'Set the grid depth h to 45.72 cm (18 in).', cite: { page: 550, section: '9.10.3 step 3' }, tags: ['grounding', 'preliminary'] },
  { id: 'pd-4', text: 'Set the surface layer thickness to 10.16 cm (4 in).', cite: { page: 550, section: '9.10.3 step 4' }, tags: ['grounding', 'preliminary'] },
  { id: 'pd-5', text: 'Put a ground rod at every other perimeter grid junction and at the corners; rods discharge mostly from their lower ends and tame the high current density at the perimeter.', cite: { page: 550, section: '9.10.3 step 5' }, tags: ['grounding', 'preliminary', 'rods'] },
];

/** §9.4 (p. 506): grid area guidance. */
export const GRID_AREA_GUIDANCE: readonly Guidance[] = [
  { id: 'area-max', text: 'Make the grid as large as possible, preferably the whole site: area lowers grid resistance far more than adding conductor does.', cite: { page: 506, section: '9.4' }, tags: ['grounding', 'area'] },
  { id: 'area-fence', text: 'Place outer grid conductors on the site boundary with the fence at least 3 ft inside them, and coordinate fence and grid layout early.', cite: { page: 506, section: '9.4' }, tags: ['grounding', 'area', 'fence', 'design-check'] },
  { id: 'area-shapes', text: 'The simplified equations need a square, rectangular, triangular, T- or L-shaped grid; on irregular sites, perimeter conductors added after design make the result more conservative.', cite: { page: 506, section: '9.4' }, tags: ['grounding', 'area'] },
];

/** §9.3 (pp. 504-506): soil resistivity guidance. */
export const SOIL_GUIDANCE: readonly Guidance[] = [
  { id: 'soil-measure', text: 'Measure soil resistivity at several places on the site before design, taking more readings where results vary widely or are very high.', cite: { page: 504, section: '9.3' }, tags: ['grounding', 'soil'] },
  { id: 'soil-wenner', text: 'The Wenner four-pin method is the most common: four probes in a line at equal spacing a; the reading at spacing a represents soil to about depth a.', cite: { page: 504, section: '9.3', figure: '9-1' }, tags: ['grounding', 'soil'] },
  { id: 'soil-records', text: 'Record soil temperature and moisture with each measurement, and note buried metal objects, which can invalidate readings.', cite: { page: [504, 505], section: '9.3' }, tags: ['grounding', 'soil'] },
  { id: 'soil-model', text: 'Use a uniform soil model only when apparent resistivity varies moderately; large variation calls for a two-layer or multi-layer model.', cite: { page: 505, section: '9.3.1' }, tags: ['grounding', 'soil'] },
  { id: 'soil-average', text: 'For the simplified IEEE Std 80 method, a single uniform resistivity is taken as the average of the measured apparent resistivities (Eq 9-3).', cite: { page: 506, section: '9.3.2', equation: '9-3' }, tags: ['grounding', 'soil'] },
  { id: 'soil-seasonal', text: 'Upper-layer resistivity can rise sharply when soil freezes or dries, while deeper layers stay nearly constant, which is why rods reaching lower layers help.', cite: { page: 548, section: '9.10.1' }, tags: ['grounding', 'soil', 'rods'] },
];

/** §9.5 (pp. 506-535): fault current guidance. */
export const FAULT_CURRENT_GUIDANCE: readonly Guidance[] = [
  { id: 'fc-worst', text: 'The grid designer needs the maximum fault current that will flow between the grid and remote earth over the station\'s life, not just the total fault current.', cite: { page: 507, section: '9.5' }, tags: ['grounding', 'fault-current'] },
  { id: 'fc-transmission', text: 'For transmission substations compute the maximum single-line-to-ground I0 for present and ultimate configurations at every voltage level and use the largest.', cite: { page: 510, section: '9.5.1' }, tags: ['grounding', 'fault-current'] },
  { id: 'fc-distribution', text: 'For distribution stations fault current grows little over the station life, so a growth factor of about 1.1 × I0 is suggested.', cite: { page: 510, section: '9.5.1' }, tags: ['grounding', 'fault-current'] },
  { id: 'fc-remote-faults', text: 'Faults inside a station with a grounded-wye transformer usually do not give the worst earth current; line-to-ground faults some distance away usually do.', cite: { page: 534, section: '9.5.4' }, tags: ['grounding', 'fault-current'] },
  { id: 'fc-tf', text: 'For Df, use the fastest clearing time (relay plus breaker) at transmission substations and the worst-case backup clearing time at distribution and industrial substations; both choices maximize Df.', cite: { page: 533, section: '9.5.3' }, tags: ['grounding', 'fault-current'] },
  { id: 'fc-xr', text: 'Ta uses the system subtransient X/R at the fault location; a large X/R means a slowly decaying dc offset and a larger Df.', cite: { page: 533, section: '9.5.3' }, tags: ['grounding', 'fault-current'] },
  { id: 'fc-dc-offset', text: 'DC offset makes conductors run hotter for the same fault, and can make mechanical forces and absorbed energy almost four times those of a symmetrical fault.', cite: { page: 535, section: '9.5.5' }, tags: ['grounding', 'fault-current', 'conductor'] },
];

/** §9.6 (pp. 535-538): conductor material, sizing and connection guidance. */
export const CONDUCTOR_GUIDANCE: readonly Guidance[] = [
  { id: 'cond-materials', text: 'Copper and copper-clad steel are the usual US grounding materials; copper resists most underground corrosion because it is cathodic to most nearby buried metals.', cite: { page: 535, section: '9.6.1' }, tags: ['grounding', 'conductor'] },
  { id: 'cond-ccs', text: 'Copper-clad steel is mostly used for rods and sometimes for grids where theft is a problem.', cite: { page: 535, section: '9.6.1.2' }, tags: ['grounding', 'conductor', 'rods'] },
  { id: 'cond-equipment', text: 'Size equipment ground conductors with the full effective asymmetrical fault current IF, because all of it passes through them before dividing in the grid.', cite: { page: 536, section: '9.6.3' }, tags: ['grounding', 'conductor', 'design-check'] },
  { id: 'cond-grid', text: 'IEEE Std 80 allows sizing grid conductors with IG, but using IF is more conservative, adds strength and corrosion margin, and is preferred given the cost of later replacement.', cite: { page: 537, section: '9.6.4' }, tags: ['grounding', 'conductor', 'design-check'] },
  { id: 'cond-temp', text: 'Limit conductor temperature near flammable material, and keep hard-drawn copper below 250 °C when its strength matters.', cite: { page: 537, section: '9.6.5' }, tags: ['grounding', 'conductor'] },
  { id: 'cond-corrosion', text: 'Where soil promotes corrosion, choose a larger conductor than the thermal calculation requires.', cite: { page: 537, section: '9.6.5' }, tags: ['grounding', 'conductor', 'corrosion'] },
  { id: 'cond-bond-all', text: 'Bond all electrodes, all exposed metal that could become energized (structures, tanks, housings, guards), and all fault current sources (arresters, capacitors, transformers, neutrals) to the grid.', cite: { page: [537, 538], section: '9.6.6' }, tags: ['grounding', 'connections', 'design-check'] },
  { id: 'cond-redundant', text: 'Add a second ground connection at critical points such as equipment neutrals, arrester grounds, operating handles and ground mats, and never assume current divides equally between leads.', cite: { page: 538, section: '9.6.6' }, tags: ['grounding', 'connections', 'design-check'] },
  { id: 'cond-min-size', text: 'Critical connections should be no smaller than 1/0 AWG, kept short, and shaped to the foundation to avoid mechanical damage.', cite: { page: 538, section: '9.6.6' }, tags: ['grounding', 'connections', 'design-check'] },
  { id: 'cond-exothermic', text: 'RUS recommends exothermic welds for underground connections; compression connectors must use oxide-inhibiting compound, and soldered joints should be avoided.', cite: { page: 538, section: '9.6.6', originalSource: 'IEEE Std 837 (connector qualification)' }, tags: ['grounding', 'connections'] },
  { id: 'cond-structure-path', text: 'Steel or aluminum structures and transformer tanks may serve as ground paths only if their conductance, including joints, equals the conductor they replace and is maintained.', cite: { page: 538, section: '9.6.6' }, tags: ['grounding', 'connections'] },
];

/** §9.7-9.9 (pp. 538-547): safety, tolerable voltage and surface layer guidance. */
export const SAFETY_GUIDANCE: readonly Guidance[] = [
  { id: 'safe-objectives', text: 'A grounding system must keep touch and step voltages below the level that causes ventricular fibrillation, carry fault and surge currents to earth, and give relays a low-resistance path to detect ground faults.', cite: { page: 501, section: '9.1' }, tags: ['grounding', 'safety'] },
  { id: 'safe-low-r-not-enough', text: 'A low grid resistance alone does not guarantee safety; the whole system must keep potential differences across the body tolerable.', cite: { page: 501, section: '9.1' }, tags: ['grounding', 'safety'] },
  { id: 'safe-fibrillation', text: 'Design limits are based on the current that causes ventricular fibrillation, since relays normally clear faults before longer-duration effects matter.', cite: { page: 539, section: '9.7.1' }, tags: ['grounding', 'safety'] },
  { id: 'safe-fast-clearing', text: 'Faster protection allows much higher tolerable body current; choosing primary or backup clearing time for ts is an engineering judgment.', cite: { page: 539, section: '9.7.1' }, tags: ['grounding', 'safety', 'relaying'] },
  { id: 'safe-metal-to-metal', text: 'Pipes, rails or fences inside or near the grid that are not bonded to it can create dangerous metal-to-metal touch voltages; bonding them to the grid is the practical cure.', cite: { page: 540, section: '9.7.2' }, tags: ['grounding', 'safety', 'design-check'] },
  { id: 'safe-touch-limits', text: 'The tolerable touch voltage is usually the limiting criterion; the lower the tolerable values, the harder the grid design.', cite: { page: 540, section: '9.8' }, tags: ['grounding', 'safety'] },
  { id: 'safe-surface-layer', text: 'A thin layer of high-resistivity rock raises foot contact resistance; in a French test, 0.1-0.15 m of moist river gravel (5000 Ω·m) cut body current about tenfold compared with moist ground.', cite: { page: 545, section: '9.9' }, tags: ['grounding', 'safety', 'surfacing'] },
  { id: 'safe-surface-water', text: 'Surface rock resistivity depends strongly on stone type, size, fines and the water it is wet with; sea spray can lower it substantially, so test the local stone.', cite: { page: [545, 546], section: '9.9' }, tags: ['grounding', 'surfacing'] },
  { id: 'safe-surface-outside', text: 'Extend the rock 0.91-1.22 m (3-4 ft) outside the fence, otherwise the touch voltage there may become dangerously high.', cite: { page: 545, section: '9.9' }, tags: ['grounding', 'surfacing', 'fence', 'design-check'] },
  { id: 'safe-no-layer', text: 'With no protective surface layer use Cs = 1 and ρs equal to the native soil resistivity.', cite: { page: 544, section: '9.8' }, tags: ['grounding', 'surfacing'] },
  { id: 'safe-sustained', text: 'After the design passes for maximum fault current, check sustained currents below relay pickup: body currents from them should stay below the let-go level.', cite: { page: 562, section: '9.10.12' }, tags: ['grounding', 'safety'] },
];

/** §9.10.4-9.10.6 (pp. 551-555): interpretation notes for Em, Es, GPR. */
export const VOLTAGE_CALC_GUIDANCE: readonly Guidance[] = [
  { id: 'em-meaning', text: 'Mesh voltage, from a grounded structure to the centre of a grid mesh, is the highest touch voltage normally found inside the grid and is the basis for a safe design.', cite: { page: 551, section: '9.10.4' }, tags: ['grounding', 'mesh-voltage'] },
  { id: 'em-corner', text: 'With rods near the perimeter or tight perimeter meshes, the touch voltage at a grid corner can exceed the corner mesh voltage.', cite: { page: 551, section: '9.10.4' }, tags: ['grounding', 'mesh-voltage'] },
  { id: 'es-meaning', text: 'Step voltages in a grid designed for safe mesh voltage are usually well within limits, because the feet are in series and the current path avoids the heart.', cite: { page: [553, 554], section: '9.10.5' }, tags: ['grounding', 'step-voltage'] },
  { id: 'gpr-meaning', text: 'GPR is the grid\'s maximum voltage relative to remote earth; every step, touch and transferred voltage scales with it, so keep it low.', cite: { page: [554, 555], section: '9.10.6' }, tags: ['grounding', 'gpr'] },
  { id: 'rg-drivers', text: 'Grid resistance falls with larger area and more buried conductor and rises with soil resistivity, which varies with moisture, temperature and freezing.', cite: { page: 555, section: '9.10.6' }, tags: ['grounding', 'resistance'] },
  { id: 'gpr-check', text: 'If IG·Rg is below the tolerable touch voltage there is no fibrillation danger in any shock case; if not, examine transferred potentials and the touch and step voltages.', cite: { page: 555, section: '9.10.6' }, tags: ['grounding', 'gpr', 'design-check'] },
  { id: 'geometry-impact', text: 'Grid area, conductor spacing and depth affect mesh voltage most; conductor diameter and surface layer thickness matter less.', cite: { page: 548, section: '9.10.1' }, tags: ['grounding', 'mesh-voltage'] },
];

/** §9.10.7 (pp. 555-557): ways to fix a failing design, in the bulletin's order. */
export const DESIGN_MODIFICATIONS: readonly (Guidance & { modelledBySimplifiedEquations: boolean })[] = [
  { id: 'mod-mesh', text: 'Reduce mesh size by adding parallel conductors in each direction.', cite: { page: 555, section: '9.10.7' }, tags: ['grounding', 'fix'], modelledBySimplifiedEquations: true },
  { id: 'mod-rock', text: 'Thicken the surface rock layer, up to a practical limit of about 15.24 cm (6 in).', cite: { page: 555, section: '9.10.7' }, tags: ['grounding', 'fix', 'surfacing'], modelledBySimplifiedEquations: true },
  { id: 'mod-limit-current', text: 'Limit total fault current if feasible (GPR and gradients drop in proportion), but not at the cost of slower clearing, which can increase danger.', cite: { page: 556, section: '9.10.7' }, tags: ['grounding', 'fix'], modelledBySimplifiedEquations: true },
  { id: 'mod-perimeter', text: 'Add parallel conductors around the perimeter to make smaller edge meshes (needs computer analysis, e.g. EPRI SGSYS).', cite: { page: 556, section: '9.10.7' }, tags: ['grounding', 'fix'], modelledBySimplifiedEquations: false },
  { id: 'mod-divert', text: 'Divert fault current by bonding all incoming shield wires to the grid or using larger/more conductive shield wires; on very small, high-resistivity sites this may be the only workable fix.', cite: { page: 556, section: '9.10.7' }, tags: ['grounding', 'fix', 'shield-wire'], modelledBySimplifiedEquations: false },
  { id: 'mod-long-rods', text: 'If a lower-resistivity layer lies deeper than 3.05 m (10 ft), use longer rods to reach it.', cite: { page: 556, section: '9.10.7' }, tags: ['grounding', 'fix', 'rods'], modelledBySimplifiedEquations: false },
  { id: 'mod-well', text: 'On high-resistivity sites, drill a well and use it as a low-resistance point.', cite: { page: 556, section: '9.10.7' }, tags: ['grounding', 'fix'], modelledBySimplifiedEquations: false },
  { id: 'mod-deep-electrodes', text: 'Supplement the grid with deep electrodes (usually rods, sometimes ground wells) where shallow soil is too resistive, including seasonally dry or frozen soil.', cite: { page: 556, section: '9.10.7' }, tags: ['grounding', 'fix', 'rods'], modelledBySimplifiedEquations: false },
  { id: 'mod-additives', text: 'Treat the soil with additives to lower its resistivity.', cite: { page: 556, section: '9.10.7', originalSource: 'IEEE Std 80 clause 14.5' }, tags: ['grounding', 'fix'], modelledBySimplifiedEquations: false },
  { id: 'mod-wire-mats', text: 'Lay wire mats (e.g. No. 6 AWG copper-clad steel on a 0.6 m grid) under the surface rock, bonded to the grid at several points.', cite: { page: [556, 557], section: '9.10.7' }, tags: ['grounding', 'fix'], modelledBySimplifiedEquations: false },
  { id: 'mod-satellite', text: 'Build a satellite grid in a nearby low-resistivity deposit (e.g. clay) and connect it to the main grid.', cite: { page: 557, section: '9.10.7' }, tags: ['grounding', 'fix'], modelledBySimplifiedEquations: false },
  { id: 'mod-bar-access', text: 'Bar access to hazardous areas where practical.', cite: { page: 557, section: '9.10.7' }, tags: ['grounding', 'fix'], modelledBySimplifiedEquations: false },
];

/** §9.10.9 (p. 557): reasons to use computer analysis instead of the simplified equations. */
export const COMPUTER_ANALYSIS_REASONS: readonly Guidance[] = [
  { id: 'ca-range', text: 'Design parameters fall outside the range of the simplified equations.', cite: { page: 557, section: '9.10.9' }, tags: ['grounding'] },
  { id: 'ca-layers', text: 'Soil resistivity varies enough to need a two-layer or multi-layer model.', cite: { page: 557, section: '9.10.9' }, tags: ['grounding', 'soil'] },
  { id: 'ca-uneven', text: 'Conductor or rod spacing is uneven.', cite: { page: 557, section: '9.10.9' }, tags: ['grounding'] },
  { id: 'ca-local', text: 'Local danger points need more detailed study.', cite: { page: 557, section: '9.10.9' }, tags: ['grounding'] },
  { id: 'ca-buried-metal', text: 'Buried metal not connected to the grid complicates the system.', cite: { page: 557, section: '9.10.9' }, tags: ['grounding'] },
  { id: 'ca-optimize', text: 'The preliminary design is to be optimized.', cite: { page: 557, section: '9.10.9' }, tags: ['grounding'] },
];

/** §9.10.10 (pp. 557-561): special danger points. */
export const SPECIAL_DANGER_POINTS: readonly Guidance[] = [
  { id: 'sdp-fence-public', text: 'The fence is accessible to the public, so touch voltage must be tolerable on both sides of it.', cite: { page: 557, section: '9.10.10.1' }, tags: ['grounding', 'fence', 'design-check'] },
  { id: 'sdp-fence-conductor', text: 'Bond the fence to an outer grid conductor at least 0.91 m (3 ft, about an arm\'s length) outside it, at every corner post and at line posts every 40-50 ft, with gateposts bonded to the adjacent fence.', cite: { page: 558, section: '9.10.10.1', figure: '9-36' }, tags: ['grounding', 'fence', 'design-check'] },
  { id: 'sdp-gates', text: 'Gates should swing inward and be prevented from swinging out; an outward-swinging gate needs grid extending 0.91 m (3 ft) beyond its full swing.', cite: { page: 558, section: '9.10.10.1' }, tags: ['grounding', 'fence', 'gate', 'design-check'] },
  { id: 'sdp-handles', text: 'Switch operating handles combine a person touching grounded metal with an operation that can cause breakdown, so provide a metal operator platform (mat) bonded to the handle, even if the handle is insulated.', cite: { page: 558, section: '9.10.10.2', figure: '9-37' }, tags: ['grounding', 'switch', 'design-check'] },
  { id: 'sdp-handle-rock', text: 'Operator safety at switches also relies on 3-6 in of clean crushed rock over the whole yard extending 3-4 ft outside the fence.', cite: { page: 558, section: '9.10.10.2' }, tags: ['grounding', 'switch', 'surfacing'] },
  { id: 'sdp-handle-platform', text: 'With only the handle connection, little current flows through the operator because the rock insulates the platform; keep the platform clean of vegetation and contamination, which would defeat this.', cite: { page: 561, section: '9.10.10.2' }, tags: ['grounding', 'switch', 'maintenance'] },
  { id: 'sdp-handle-checklist', text: 'The engineer should prepare a safety checklist covering handle and platform grounding for crews to follow before operating a switch.', cite: { page: 561, section: '9.10.10.2' }, tags: ['grounding', 'switch', 'maintenance'] },
  { id: 'sdp-cable-sheaths', text: 'Ground power cable metallic sheaths at two or more points (terminations, splices, taps) but control cable shields at one end only; add a parallel ground cable where sheaths may carry excessive ground current.', cite: { page: 561, section: '9.10.10.3' }, tags: ['grounding', 'cable'] },
  { id: 'sdp-arresters', text: 'Connect arrester grounds as close as possible to the protected equipment\'s ground terminal by a short, direct path free of sharp bends; use a separate copper conductor if tank or structure paths are doubtful.', cite: { page: 561, section: '9.10.10.4' }, tags: ['grounding', 'arrester', 'design-check'] },
];

/** Fig 9-36 (p. 559): typical chain link fence grounding details (RUS drawing), paraphrased. */
export const FIG_9_36_FENCE_GROUNDING = {
  items: [
    { id: 'f36-interconnect', text: 'Interconnect the fence ground with the station ground grid.' },
    { id: 'f36-continuous', text: 'Run the perimeter ground wire as a continuous cable connected to fence posts, all gate posts and all corners, looping it through rod and fence clamps to minimize splices.' },
    { id: 'f36-intervals', text: 'Space fence-to-grid connections to limit step-potential gradients, each able to carry the maximum foreseeable ground fault current.' },
    { id: 'f36-offset', text: 'Perimeter conductor 3 ft-0 in outside the fence is the minimum; 4 ft-0 in is recommended.' },
    { id: 'f36-gate-bypass', text: 'Run a gate by-pass conductor 1 ft-6 in beyond the opened gates; bond gates to posts with flexible tinned copper braid (1-1/2 × 3/16 in).' },
    { id: 'f36-risers', text: 'Fence risers are No. 2 soft-drawn solid bare tinned copper woven through the fabric; ground rods 8 ft-0 in minimum; leave 2 ft-0 in of slack where wire passes under a road.' },
    { id: 'f36-height', text: 'Minimum fence height is 7 ft (6 ft fabric + 1 ft barbed wire); RUS recommends 8 ft (7 ft fabric + 1 ft barbed wire), with barbed wire overhanging away from the yard and 7 ft fabric where barbed wire is prohibited.' },
  ] as readonly { id: string; text: string }[],
  cite: { page: 559, section: '9.10.10.1', figure: '9-36', note: 'Drawing references RUS specification S-6 for other requirements.' } satisfies Citation,
} as const;

/** Fig 9-37 (p. 560): typical switch grounding, paraphrased. */
export const FIG_9_37_SWITCH_GROUNDING = {
  items: [
    { id: 'f37-braid', text: 'A braid bonds the vertical operating pipe to the structure (grounding device on multi-revolution gear controls).' },
    { id: 'f37-platform', text: 'A conductor clamped to the structure runs to a clamp on the operator\'s platform, which sits on the crushed rock; the structure is grounded to the grid.' },
    { id: 'f37-visible', text: 'The platform conductor must be installed above grade so it can be inspected visually during routine maintenance.' },
  ] as readonly { id: string; text: string }[],
  cite: { page: 560, section: '9.10.10.2', figure: '9-37' } satisfies Citation,
} as const;

/** §9.10.11 (pp. 561-562): transferred voltage. */
export const TRANSFERRED_VOLTAGE_GUIDANCE: readonly Guidance[] = [
  { id: 'tv-what', text: 'Transferred voltage is a touch contact with a conductor (communication circuit, low-voltage neutral, conduit, pipe, rail, metallic fence) that connects the grid area with a remote point; the shock can approach the full GPR.', cite: { page: 561, section: '9.10.11' }, tags: ['grounding', 'transferred-voltage'] },
  { id: 'tv-avoid', text: 'Designing the grid for transferred voltage is impractical; instead use isolating or neutralizing devices and treat and label such circuits and pipes as if they were live.', cite: { page: 562, section: '9.10.11', originalSource: 'IEEE Std 80 clause 17.9' }, tags: ['grounding', 'transferred-voltage', 'design-check'] },
];

/** §9.1 / §9.10.1 general concepts. */
export const GENERAL_GROUNDING_GUIDANCE: readonly Guidance[] = [
  { id: 'gen-scope', text: 'Chapter 9 covers 50-60 Hz grounding of outdoor ac substations; dc stations and lightning surge effects are outside its scope.', cite: { page: 501, section: '9.1' }, tags: ['grounding'] },
  { id: 'gen-components', text: 'An effective system combines driven rods, a buried interconnected grid, equipment ground mats, connections to structures, equipment and neutrals, and an insulating surface layer.', cite: { page: 501, section: '9.1' }, tags: ['grounding'] },
  { id: 'gen-main-threat', text: 'Line-to-ground fault current flowing through the grid is the main shock threat to personnel.', cite: { page: 501, section: '9.1' }, tags: ['grounding', 'safety'] },
  { id: 'gen-conservative', text: 'Because soil data are uncertain and vary with weather, the design approach must be conservative.', cite: { page: 502, section: '9.1' }, tags: ['grounding'] },
  { id: 'gen-grid-rods', text: 'Horizontal grid conductors control surface step and touch voltages best; vertical rods dissipate current best when they reach lower-resistivity layers.', cite: { page: 548, section: '9.10.1' }, tags: ['grounding', 'rods'] },
  { id: 'gen-area', text: 'Grid area is the single most important geometric factor for grid resistance, and thus GPR.', cite: { page: 548, section: '9.10.1' }, tags: ['grounding', 'area'] },
  { id: 'gen-expansion', text: 'When a station is expanded or uprated to a higher voltage, measure resistivity in the expansion area and redesign the grounding for the new fault current per Chapter 9.', cite: { page: 760, section: '21.4.3' }, tags: ['grounding', 'expansion'] },
  { id: 'gen-test', text: 'Measure ground grid resistance periodically (three-probe instrument) and compare with earlier readings or the design value; this requires disconnecting shield wires and neutrals, so the station must be de-energized.', cite: { page: [730, 745], section: '18.4.9; 19.3.20' }, tags: ['grounding', 'maintenance', 'test'] },
];

// ---------------------------------------------------------------------------
// Whole-procedure evaluator for a uniform rectangular (or square) grid
// ---------------------------------------------------------------------------

/**
 * 'perimeter-and-corners': rods in the corners and along the perimeter (optionally also inside) → Kii = 1, Eq 9-33.
 * 'interior-only': a few rods scattered inside, none in corners or on the perimeter → Eq 9-24, Eq 9-32.
 */
export type RodPlacement = 'perimeter-and-corners' | 'interior-only';

export interface RectangularGridInput {
  /** ρ, uniform soil resistivity (Eq 9-3 average), Ω·m. */
  soilResistivity: number;
  /** Protective surface layer; omit for none (then Cs = 1, ρs = ρ). Give `cs` to override the Fig 9-35 lookup. */
  surfaceLayer?: { resistivity: number; thicknessM: number; cs?: number };
  /** Grid outline Lx × Ly, m. */
  lengthXM: number;
  lengthYM: number;
  /** Number of parallel conductors running in the x direction (each Lx long), and in the y direction (each Ly long). Minimum 2 each. */
  conductorsAlongX: number;
  conductorsAlongY: number;
  /** h, burial depth, m. */
  depthM: number;
  /** d, conductor diameter, m. */
  conductorDiameterM: number;
  rods?: { count: number; lengthM: number; placement: RodPlacement };
  /** rms symmetrical ground fault current If or 3I0, A (maximum expected future value, §9.10.2 step 4). */
  faultCurrentA: number;
  /** Split factor as a decimal (from the charts via splitFactorFromCharts, or a brief-provided value). */
  splitFactor: number;
  /** Df directly, or computed from tf and X/R (Eq 9-7). */
  decrementFactor?: number;
  faultDurationS?: number;
  xOverR?: number;
  frequencyHz?: number;
  /** ts, shock duration for Eqs 9-16..9-19, s. */
  shockDurationS: number;
  bodyWeightKg: BodyWeightKg;
}

export interface GridWarning {
  code: string;
  message: string;
  cite: Citation;
}

export interface GridEvaluation {
  areaM2: number;
  perimeterM: number;
  /** D used in Km and Ks: the larger of the two conductor spacings (conservative choice, see notes). */
  spacingM: number;
  spacingXM: number;
  spacingYM: number;
  lcM: number;
  lrM: number;
  ltM: number;
  reflectionFactorK: number | null;
  cs: number;
  surfaceResistivity: number;
  bodyCurrentA: number;
  tolerableTouchV: number;
  tolerableStepV: number;
  df: number;
  symmetricalGridCurrentA: number;
  maxGridCurrentA: number;
  gridResistanceOhm: number;
  gprV: number;
  n: GeometryFactorN;
  kii: number;
  kh: number;
  km: number;
  ki: number;
  lmM: number;
  meshVoltageV: number;
  ks: number;
  lsM: number;
  stepVoltageV: number;
  /** Step 11: GPR below tolerable touch voltage (no further analysis needed). */
  gprBelowTolerableTouch: boolean;
  /** Steps 13-14. */
  meshVoltageOk: boolean;
  stepVoltageOk: boolean;
  /** Overall: GPR below tolerable touch, or both Em and Es below their limits. */
  safe: boolean;
  warnings: GridWarning[];
}

/**
 * Runs the §9.10 simplified design check for a uniform rectangular or square grid in uniform soil:
 * Cs (Fig 9-35) → tolerable touch/step (Eqs 9-16..9-19) → Ig, Df, IG (Eqs 9-4/9-5, 9-7, 9-8) → Rg (Eq 9-38)
 * → GPR (Eq 9-37) → n, Kii, Kh, Km, Ki, LM, Em (Eqs 9-22..9-33) → Ks, LS, Es (Eqs 9-34..9-36), and flags
 * departures from the bulletin's rules of thumb. Conductor sizing is separate (groundConductorAreaKcmil).
 */
export function evaluateRectangularGrid(inp: RectangularGridInput): GridEvaluation {
  const warnings: GridWarning[] = [];
  const warn = (code: string, message: string, cite: Citation) => warnings.push({ code, message, cite });
  const { lengthXM: Lx, lengthYM: Ly, depthM: h, conductorDiameterM: d } = inp;
  if (inp.conductorsAlongX < 2 || inp.conductorsAlongY < 2) throw new RangeError('need at least 2 conductors in each direction');
  const rho = inp.soilResistivity;

  // Geometry
  const areaM2 = Lx * Ly;
  const perimeterM = 2 * (Lx + Ly);
  const spacingYM = Ly / (inp.conductorsAlongX - 1); // spacing between the x-running conductors
  const spacingXM = Lx / (inp.conductorsAlongY - 1); // spacing between the y-running conductors
  const D = Math.max(spacingXM, spacingYM);
  const lcM = inp.conductorsAlongX * Lx + inp.conductorsAlongY * Ly;
  const rodCount = inp.rods?.count ?? 0;
  const rodLen = inp.rods?.lengthM ?? 0;
  const lrM = rodCount * rodLen;
  const ltM = lcM + lrM;
  const rodsPerimeter = rodCount > 0 && inp.rods?.placement === 'perimeter-and-corners';
  const shape: GridShape = Math.abs(Lx - Ly) < 1e-9 ? 'square' : 'rectangular';

  // Surface layer
  let cs = 1;
  let rhoS = rho;
  let K: number | null = null;
  if (inp.surfaceLayer) {
    rhoS = inp.surfaceLayer.resistivity;
    K = reflectionFactor(rho, rhoS);
    if (inp.surfaceLayer.cs !== undefined) cs = inp.surfaceLayer.cs;
    else {
      const look = surfaceLayerDeratingFactor(K, inp.surfaceLayer.thicknessM);
      cs = look.cs;
      if (look.clamped) warn('cs-out-of-chart', `K = ${K.toFixed(3)} or hs = ${inp.surfaceLayer.thicknessM} m is outside Fig 9-35; Cs was read at the chart edge (K < -0.95 makes this non-conservative).`, FIG_9_35_CS.cite);
    }
    if (inp.surfaceLayer.thicknessM < GROUNDING_RULES.surfaceLayerMinThicknessM.value)
      warn('surface-thin', 'Surface layer thinner than the 10 cm (4 in) minimum of §9.10.2 step 7.', GROUNDING_RULES.surfaceLayerMinThicknessM.cite);
    if (inp.surfaceLayer.resistivity < GROUNDING_RULES.surfaceLayerMinResistivityOhmM.value)
      warn('surface-resistivity', 'Surface material below the 3000 Ω·m (wet or dry) minimum of §9.10.2 step 7.', GROUNDING_RULES.surfaceLayerMinResistivityOhmM.cite);
  } else {
    warn('no-surface-layer', 'No protective surface layer: Cs = 1 and ρs = ρ (§9.8); §9.10.2 step 7 calls for at least 10 cm of ≥3000 Ω·m rock.', GROUNDING_RULES.surfaceLayerMinThicknessM.cite);
  }

  // Tolerable voltages
  const ts = inp.shockDurationS;
  if (ts < BODY_CURRENT_VALID_DURATION_S.min || ts > BODY_CURRENT_VALID_DURATION_S.max)
    warn('ts-range', 'Shock duration outside the 0.03-3.0 s range on which Eq 9-12 is based.', GROUNDING_CITES.bodyCurrent);
  const bodyCurrentA = tolerableBodyCurrent(ts, inp.bodyWeightKg);
  const tolerableTouchV = tolerableTouch(rhoS, cs, ts, inp.bodyWeightKg);
  const tolerableStepV = tolerableStep(rhoS, cs, ts, inp.bodyWeightKg);

  // Currents
  let df = inp.decrementFactor;
  if (df === undefined) {
    if (inp.faultDurationS === undefined || inp.xOverR === undefined) throw new RangeError('give decrementFactor, or faultDurationS and xOverR');
    df = decrementFactor(inp.faultDurationS, inp.xOverR, inp.frequencyHz ?? 60);
  }
  const symmetricalGridCurrentA = symmetricalGridCurrent(inp.splitFactor, inp.faultCurrentA);
  const maxGridCurrentA = maximumGridCurrent(df, symmetricalGridCurrentA);

  // Resistance and GPR
  const gridResistanceOhm = gridResistance(rho, ltM, areaM2, h);
  const gprV = groundPotentialRise(maxGridCurrentA, gridResistanceOhm);

  // Mesh voltage
  const n = geometryFactorN({ shape, totalConductorLengthM: lcM, perimeterM, areaM2, lengthXM: Lx, lengthYM: Ly });
  const kii = innerConductorFactorKii(n.n, rodsPerimeter);
  const kh = depthFactorKh(h);
  const km = meshSpacingFactorKm(D, d, h, n.n, kii, kh);
  const ki = irregularityFactorKi(n.n);
  const lmM = effectiveMeshLengthLM(lcM, lrM, rodsPerimeter, rodLen, Lx, Ly);
  const meshVoltageV = meshVoltage(rho, km, ki, maxGridCurrentA, lmM);

  // Step voltage
  const ks = stepSpacingFactorKs(D, h, n.n);
  const lsM = effectiveStepLengthLS(lcM, lrM);
  const stepVoltageV = stepVoltage(rho, ks, ki, maxGridCurrentA, lsM);

  // Rule-of-thumb and validity checks
  const sMin = Math.min(spacingXM, spacingYM);
  const [spLo, spHi] = GROUNDING_RULES.conductorSpacingFirstRowM.value;
  if (sMin < spLo || D > spHi) warn('spacing-range', `Conductor spacing ${sMin.toFixed(1)}-${D.toFixed(1)} m is outside the 3-15 m range of §9.10.2 step 8.`, GROUNDING_RULES.conductorSpacingFirstRowM.cite);
  if (D / sMin > 3 + 1e-9) warn('spacing-ratio', 'Perpendicular spacing ratio exceeds 1:3 (§9.10.2 step 8).', GROUNDING_RULES.conductorSpacingRatio.cite);
  if (Math.abs(spacingXM - spacingYM) > 1e-6) warn('unequal-spacing', 'Unequal spacings: the larger spacing was used for D in Km and Ks (game assumption; the bulletin assumes square mesh).', GROUNDING_CITES.preliminaryDesign);
  const [hLo, hHi] = GROUNDING_RULES.burialDepthM.value;
  if (h < hLo || h > hHi) warn('depth-range', 'Burial depth outside 0.46-1.5 m (§9.10.2 step 9).', GROUNDING_RULES.burialDepthM.cite);
  if (h <= KS_VALID_DEPTH_M.min || h >= KS_VALID_DEPTH_M.max) warn('ks-depth', 'Eq 9-36 for Ks applies only for 0.25 m < h < 2.5 m.', GROUNDING_CITES.stepVoltage);
  if (areaM2 < EQUATION_VALIDITY_RANGE.areaM2[0] || areaM2 > EQUATION_VALIDITY_RANGE.areaM2[1]) warn('area-range', 'Grid area outside the 6.25-10,000 m² range checked for the simplified equations; use computer analysis.', EQUATION_VALIDITY_RANGE.cite);
  const meshesX = inp.conductorsAlongY - 1;
  const meshesY = inp.conductorsAlongX - 1;
  if (Math.max(meshesX, meshesY) > EQUATION_VALIDITY_RANGE.meshesPerSide[1]) warn('mesh-count', 'More than 40 meshes along a side (§9.10.8).', EQUATION_VALIDITY_RANGE.cite);
  if (sMin < EQUATION_VALIDITY_RANGE.meshSizeM[0] || D > EQUATION_VALIDITY_RANGE.meshSizeM[1]) warn('mesh-size', 'Mesh size outside 2.5-22.5 m (§9.10.8).', EQUATION_VALIDITY_RANGE.cite);
  if (rodCount > 0) {
    if (rodLen < GROUNDING_RULES.rodMinLengthM.value) warn('rod-length', 'Rods shorter than the 2.5 m (8 ft) minimum of §9.10.2 step 10.', GROUNDING_RULES.rodMinLengthM.cite);
    if (maxGridCurrentA / rodCount > GROUNDING_RULES.rodMaxAverageCurrentA.value)
      warn('rod-current', `Average rod current ${(maxGridCurrentA / rodCount).toFixed(0)} A exceeds 300 A; add rods (§9.10.2 step 10).`, GROUNDING_RULES.rodMaxAverageCurrentA.cite);
  } else {
    warn('no-rods', 'No ground rods: §9.10.3 suggests rods at the corners and every other perimeter junction.', GROUNDING_CITES.preliminaryDesign);
  }

  const gprBelowTolerableTouch = gprV < tolerableTouchV;
  const meshVoltageOk = meshVoltageV < tolerableTouchV;
  const stepVoltageOk = stepVoltageV < tolerableStepV;
  return {
    areaM2, perimeterM, spacingM: D, spacingXM, spacingYM, lcM, lrM, ltM,
    reflectionFactorK: K, cs, surfaceResistivity: rhoS,
    bodyCurrentA, tolerableTouchV, tolerableStepV,
    df, symmetricalGridCurrentA, maxGridCurrentA,
    gridResistanceOhm, gprV,
    n, kii, kh, km, ki, lmM, meshVoltageV,
    ks, lsM, stepVoltageV,
    gprBelowTolerableTouch, meshVoltageOk, stepVoltageOk,
    safe: gprBelowTolerableTouch || (meshVoltageOk && stepVoltageOk),
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Worked example / test fixtures
// ---------------------------------------------------------------------------

/**
 * RUS Bulletin 1724E-300 Chapter 9 does not work a numeric ground-grid design example (checked §9.1-9.11,
 * pp. 501-562). This constant is deliberately null so callers do not mistake external data for bulletin data.
 * See docs/research/civil-protection-notes.md for an external (IEEE Std 80-2000 Annex B) cross-check.
 */
export const GROUNDING_EXAMPLE = null;

/**
 * Bulletin-internal consistency fixtures usable as unit tests: Table 9-1 is generated by Eq 9-7
 * (decrementFactor reproduces every cell within ±0.001) and Table 9-3 by Eq 9-10 with Table 9-2
 * constants and Ta = 40 °C (groundConductorAreaKcmil(1, 1, material, 40, Tm) reproduces Kf within ±0.01).
 */
export const GROUNDING_TABLE_FIXTURES = {
  decrementFactor: { table: TABLE_9_1_DECREMENT, toleranceAbs: 0.001, frequencyHz: 60 },
  kf: { table: TABLE_9_3_KF, materials: TABLE_9_2_MATERIALS, ambientC: 40, toleranceAbs: 0.01 },
} as const;
