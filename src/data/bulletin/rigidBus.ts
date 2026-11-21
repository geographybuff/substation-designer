/**
 * Rigid bus design procedure from RUS Bulletin 1724E-300 §4.11 (pp. 163-176), with the gist of
 * strain bus design §4.12 (pp. 176-184).
 *
 * Covers: general considerations, the step-by-step procedure, Eqs. 4-4..4-11 (short-circuit force,
 * ice and wind load, total load, maximum span, deflection, insulator cantilever strength, thermal
 * expansion) in metric and US forms, drag coefficients (Fig. 4-22), coupler locations (Table 4-13),
 * vibration damping, and the full §4.11.3 worked example; plus strain-bus Eqs. 4-12..4-14, the
 * suspension-insulator sag method (Fig. 4-26) and both §4.12.2 sample calculations.
 * Span/deflection factors (Table 4-12), NESC loads (Tables 4-11/4-15) and pipe properties
 * (Table 4-14) live in insulatorsConductors.ts.
 *
 * Unit conventions follow the bulletin. Metric: force per length N/m, diameters and spacing cm,
 * spans m, stress kPa, section modulus cm³, inertia cm⁴, deflection cm. US: lb/ft, in, ft, psi, in³, in⁴, in.
 */
import type { Citation, Guidance, Sourced } from './types';

export type UnitSystem = 'SI' | 'US';

// ---------------------------------------------------------------------------
// General considerations and procedure
// ---------------------------------------------------------------------------

export const RIGID_BUS_CONSIDERATIONS: readonly Guidance[] = [
  {
    id: 'rb-location',
    text: 'Place rigid bus with ample clearance for equipment maintenance and removal and so construction and maintenance vehicles can get in.',
    cite: { page: 163, section: '4.11.1.1' },
    tags: ['rigid-bus', 'layout', 'equipment-removal'],
  },
  {
    id: 'rb-expansion',
    text: 'Size and position buses so future expansion is easy.',
    cite: { page: 163, section: '4.11.1.2' },
    tags: ['rigid-bus', 'expansion'],
  },
  {
    id: 'rb-conductor',
    text: 'Choose bus conductors on ampacity, physical properties and cost, large enough to survive faults and overcurrents without overheating.',
    cite: { page: 163, section: '4.11.1.3' },
    tags: ['rigid-bus', 'conductor', 'ampacity'],
  },
  {
    id: 'rb-short-circuit',
    text: 'Short circuits create large forces in the bus; both phase spacing and fault current affect them and must be designed for.',
    cite: { page: 163, section: '4.11.1.4' },
    tags: ['rigid-bus', 'fault'],
  },
  {
    id: 'rb-wind-ice',
    text: 'Use NESC wind and ice loadings as a minimum, and more severe local criteria where they apply.',
    cite: { page: 163, section: '4.11.1.5' },
    tags: ['rigid-bus', 'wind', 'ice'],
  },
  {
    id: 'rb-insulator-strength',
    text: 'Insulator strength is set mainly by total bus loading, especially short-circuit force; because ratings come in few steps, lay out the bus to suit practical insulators.',
    cite: { page: 163, section: '4.11.1.6' },
    tags: ['rigid-bus', 'insulator'],
  },
  {
    id: 'rb-sag',
    text: 'Limit sag; it depends on conductor weight and section, span and vertical load, and a flat bus looks much neater.',
    cite: { page: 163, section: '4.11.1.7' },
    tags: ['rigid-bus', 'deflection', 'appearance'],
  },
  {
    id: 'rb-aeolian',
    text: 'Avoid spans whose natural frequency matches frequent winds, and use damping conductors or devices to control aeolian vibration.',
    cite: { page: 163, section: '4.11.1.8' },
    tags: ['rigid-bus', 'vibration'],
  },
  {
    id: 'rb-thermal',
    text: 'Provide for expansion over the full range from the lowest design temperature de-energized to the maximum operating temperature, or insulators and equipment can be damaged.',
    cite: { page: 164, section: '4.11.1.9' },
    tags: ['rigid-bus', 'thermal-expansion'],
  },
  {
    id: 'rb-couplers',
    text: 'Long buses need couplers between conductor sections, located where loads and fault forces will not damage them.',
    cite: { page: 164, section: '4.11.1.10' },
    tags: ['rigid-bus', 'couplers'],
  },
];

export interface ProcedureStep {
  step: number;
  title: string;
  text: string;
  equation?: string;
  table?: string;
  cite: Citation;
}

/** §4.11.2: procedure for rigid bus design. */
export const RIGID_BUS_PROCEDURE: readonly ProcedureStep[] = [
  {
    step: 1,
    title: 'Material and size',
    text: 'Select conductor material and size for the continuous current; on longer high-voltage spans structural capability may govern, but ampacity must always be met.',
    table: '4-14',
    cite: { page: 164, section: '4.11.2.1' },
  },
  { step: 2, title: 'Spacing', text: 'Take the centerline-to-centerline phase spacing from Tables 4-7 and 4-8.', table: '4-7, 4-8', cite: { page: 164, section: '4.11.2.2' } },
  { step: 3, title: 'Short-circuit force', text: 'Compute the maximum short-circuit force on the conductor.', equation: '4-4', cite: { page: 164, section: '4.11.2.3' } },
  {
    step: 4,
    title: 'Loading',
    text: 'Compute ice load, wind load and total load using NESC district values as minimums (and consider extreme wind).',
    equation: '4-5, 4-6, 4-7',
    table: '4-11',
    cite: { page: [164, 166], section: '4.11.2.4' },
  },
  { step: 5, title: 'Span', text: 'Compute the maximum support spacing.', equation: '4-8', table: '4-12', cite: { page: 167, section: '4.11.2.5' } },
  {
    step: 6,
    title: 'Deflection',
    text: 'Compute the maximum vertical deflection and keep it within 1/200 of the span; otherwise use a larger conductor or shorter span and recalculate.',
    equation: '4-9',
    table: '4-12',
    cite: { page: 168, section: '4.11.2.6' },
  },
  {
    step: 7,
    title: 'Insulator cantilever strength',
    text: 'Compute the minimum insulator cantilever strength and pick insulators rated at least that; if none suffice, widen phase spacing or shorten spans.',
    equation: '4-10',
    table: '4-4, 4-5',
    cite: { page: 168, section: '4.11.2.7' },
  },
  { step: 8, title: 'Thermal expansion', text: 'Compute conductor expansion and provide fixed, slip-fit and expansion fittings so no span is captured.', equation: '4-11', cite: { page: [168, 170], section: '4.11.2.8' } },
  { step: 9, title: 'Couplers', text: 'Locate couplers at points of zero bending moment where possible.', table: '4-13', cite: { page: 170, section: '4.11.2.9' } },
  { step: 10, title: 'Aeolian vibration', text: 'Provide damping on spans longer than about 6 m (20 ft).', cite: { page: [170, 171], section: '4.11.2.10' } },
];

// ---------------------------------------------------------------------------
// Equations
// ---------------------------------------------------------------------------

export interface EquationVariable {
  symbol: string;
  meaning: string;
  unitSI: string;
  unitUS: string;
}

export interface BusEquation {
  id: string;
  name: string;
  formulaSI: string;
  formulaUS: string;
  variables: readonly EquationVariable[];
  notes?: readonly string[];
  cite: Citation;
}

export const RIGID_BUS_EQUATIONS: readonly BusEquation[] = [
  {
    id: '4-4',
    name: 'Maximum short-circuit force',
    formulaSI: 'F_SC = 13.9e-5 · K_SC · i² / D',
    formulaUS: 'F_SC = 37.4e-7 · K_SC · i² / D',
    variables: [
      { symbol: 'F_SC', meaning: 'Max short-circuit force on the center conductor of a three-phase flat bus of equally spaced round or square tubes', unitSI: 'N/m', unitUS: 'lb/ft' },
      { symbol: 'K_SC', meaning: 'Short-circuit force reduction factor (0.5 to 1.0; 0.67 recommended)', unitSI: '-', unitUS: '-' },
      { symbol: 'i', meaning: 'RMS three-phase symmetrical short-circuit current', unitSI: 'A', unitUS: 'A' },
      { symbol: 'D', meaning: 'Centerline-to-centerline conductor spacing', unitSI: 'cm', unitUS: 'in' },
    ],
    cite: { page: 164, section: '4.11.2.3', equation: '4-4' },
  },
  {
    id: '4-5',
    name: 'Ice loading',
    formulaSI: 'W_I = 0.704 · (d1² − d2²)',
    formulaUS: 'W_I = 0.311 · (d1² − d2²)',
    variables: [
      { symbol: 'W_I', meaning: 'Ice load', unitSI: 'N/m', unitUS: 'lb/ft' },
      { symbol: 'd1', meaning: 'Outside diameter with ice (radial ice from Table 4-11)', unitSI: 'cm', unitUS: 'in' },
      { symbol: 'd2', meaning: 'Outside diameter without ice', unitSI: 'cm', unitUS: 'in' },
    ],
    cite: { page: 165, section: '4.11.2.4', equation: '4-5' },
  },
  {
    id: '4-6',
    name: 'Wind loading',
    formulaSI: 'F_W = 0.01 · C_D · P_W · d1',
    formulaUS: 'F_W = 0.083 · C_D · P_W · d1',
    variables: [
      { symbol: 'F_W', meaning: 'Wind load', unitSI: 'N/m', unitUS: 'lb/ft' },
      { symbol: 'C_D', meaning: 'Drag coefficient (Fig. 4-22; 1.00 for round)', unitSI: '-', unitUS: '-' },
      { symbol: 'P_W', meaning: 'Wind pressure (Table 4-11)', unitSI: 'Pa', unitUS: 'lb/ft²' },
      { symbol: 'd1', meaning: 'Outside diameter with ice', unitSI: 'cm', unitUS: 'in' },
    ],
    cite: { page: 165, section: '4.11.2.4', equation: '4-6' },
  },
  {
    id: '4-7',
    name: 'Total bus conductor loading',
    formulaSI: 'F_T = [(F_SC + F_W)² + (W_C + W_I)²]^½',
    formulaUS: 'F_T = [(F_SC + F_W)² + (W_C + W_I)²]^½',
    variables: [
      { symbol: 'F_T', meaning: 'Total load', unitSI: 'N/m', unitUS: 'lb/ft' },
      { symbol: 'W_C', meaning: 'Conductor weight (add damping-cable weight if used)', unitSI: 'N/m', unitUS: 'lb/ft' },
    ],
    notes: [
      'Eq. 4-7 applies maximum wind and maximum ice together; NESC and IEEE 605 apply them separately, which lowers F_T. Use engineering judgement for the governing case.',
    ],
    cite: { page: [165, 166], section: '4.11.2.4', equation: '4-7' },
  },
  {
    id: '4-8',
    name: 'Maximum bus support spacing',
    formulaSI: 'L_M = K_SM · (F_B · S / F_T)^½',
    formulaUS: 'L_M = K_SE · (F_B · S / F_T)^½',
    variables: [
      { symbol: 'L_M', meaning: 'Maximum support spacing', unitSI: 'm', unitUS: 'ft' },
      { symbol: 'K_SM / K_SE', meaning: 'Multiplying factor (Table 4-12)', unitSI: '-', unitUS: '-' },
      { symbol: 'F_B', meaning: 'Maximum desirable fiber stress (includes a 1.25 safety factor)', unitSI: 'kPa', unitUS: 'lb/in²' },
      { symbol: 'S', meaning: 'Section modulus', unitSI: 'cm³', unitUS: 'in³' },
      { symbol: 'F_T', meaning: 'Total load', unitSI: 'N/m', unitUS: 'lb/ft' },
    ],
    cite: { page: 167, section: '4.11.2.5', equation: '4-8', table: '4-12' },
  },
  {
    id: '4-9',
    name: 'Maximum vertical deflection',
    formulaSI: 'y = K_DM · (W_C + W_I) · L⁴ / (E · I)',
    formulaUS: 'y = K_DE · (W_C + W_I) · L⁴ / (E · I)',
    variables: [
      { symbol: 'y', meaning: 'Maximum vertical deflection (limit to 1/200 of span)', unitSI: 'cm', unitUS: 'in' },
      { symbol: 'K_DM / K_DE', meaning: 'Multiplying factor (Table 4-12)', unitSI: '-', unitUS: '-' },
      { symbol: 'L', meaning: 'Support spacing', unitSI: 'm', unitUS: 'ft' },
      { symbol: 'E', meaning: 'Modulus of elasticity', unitSI: 'kPa', unitUS: 'lb/in²' },
      { symbol: 'I', meaning: 'Moment of inertia', unitSI: 'cm⁴', unitUS: 'in⁴' },
    ],
    cite: { page: 168, section: '4.11.2.6', equation: '4-9', table: '4-12' },
  },
  {
    id: '4-10',
    name: 'Minimum insulator cantilever strength',
    formulaSI: 'W_S = 2.5 · (F_SC + F_W) · L_S',
    formulaUS: 'W_S = 2.5 · (F_SC + F_W) · L_S',
    variables: [
      { symbol: 'W_S', meaning: 'Minimum insulator cantilever strength', unitSI: 'N', unitUS: 'lb' },
      { symbol: 'L_S', meaning: 'Half the sum of the two adjacent span lengths', unitSI: 'm', unitUS: 'ft' },
    ],
    notes: ['The factor 2.5 is an insulator safety factor: working load = 40 % of rated cantilever strength.'],
    cite: { page: 168, section: '4.11.2.7', equation: '4-10' },
  },
  {
    id: '4-11',
    name: 'Thermal expansion',
    formulaSI: 'Δl = α · l · ΔT',
    formulaUS: 'Δl = α · l · ΔT',
    variables: [
      { symbol: 'Δl', meaning: 'Conductor expansion (final minus initial length)', unitSI: 'cm', unitUS: 'in' },
      { symbol: 'α', meaning: 'Linear expansion coefficient: Al 2.3e-5/°C (1.3e-5/°F); Cu 1.7e-5/°C (9.2e-6/°F)', unitSI: '1/°C', unitUS: '1/°F' },
      { symbol: 'l', meaning: 'Initial length', unitSI: 'cm', unitUS: 'in' },
      { symbol: 'ΔT', meaning: 'Temperature change', unitSI: '°C', unitUS: '°F' },
    ],
    cite: { page: [168, 169], section: '4.11.2.8', equation: '4-11' },
  },
];

export const RIGID_BUS_CONSTANTS: Sourced<{
  kscRange: readonly [number, number];
  kscRecommended: number;
  /** Maximum desirable fiber stress for round tubes (safety factor 1.25 included). */
  fiberStress: Readonly<Record<'copper' | '6061-T6' | '6063-T6', { kPa: number; psi: number }>>;
  fiberStressSafetyFactor: number;
  deflectionLimitFractionOfSpan: number;
  insulatorSafetyFactor: number;
  alphaPerC: Readonly<Record<'aluminum' | 'copper', number>>;
  alphaPerF: Readonly<Record<'aluminum' | 'copper', number>>;
  maxContinuousSectionM: number;
  maxContinuousSectionFt: number;
  vibrationDampingAboveSpanM: number;
  vibrationDampingAboveSpanFt: number;
  /** Off-ideal coupler positions: reduce allowable fiber stress by up to this percent. */
  offIdealCouplerFiberStressReductionPct: number;
}> = {
  value: {
    kscRange: [0.5, 1.0],
    kscRecommended: 0.67,
    fiberStress: {
      copper: { kPa: 1.38e5, psi: 20000 },
      '6061-T6': { kPa: 1.93e5, psi: 28000 },
      '6063-T6': { kPa: 1.38e5, psi: 20000 },
    },
    fiberStressSafetyFactor: 1.25,
    deflectionLimitFractionOfSpan: 1 / 200,
    insulatorSafetyFactor: 2.5,
    alphaPerC: { aluminum: 2.3e-5, copper: 1.7e-5 },
    alphaPerF: { aluminum: 1.3e-5, copper: 9.2e-6 },
    maxContinuousSectionM: 30.48,
    maxContinuousSectionFt: 100,
    vibrationDampingAboveSpanM: 6,
    vibrationDampingAboveSpanFt: 20,
    offIdealCouplerFiberStressReductionPct: 50,
  },
  cite: { page: [164, 170], section: '4.11.2' },
};

/** Fig. 4-22: drag coefficients for structural shapes (λ → ∞, λ = span / vertical dimension of conductor). */
export const FIG_4_22_DRAG_COEFFICIENTS: Sourced<readonly { profile: string; cd: number }[]> = {
  value: [
    { profile: 'Square bar (flat face to wind)', cd: 2.03 },
    { profile: 'Round tube or rod', cd: 1.0 },
    { profile: 'Flat bar edge-on or channel (web to wind)', cd: 2.0 },
    { profile: 'I-beam (web vertical)', cd: 2.04 },
    { profile: 'Angle, vertical leg facing wind', cd: 2.0 },
    { profile: 'Angle, vertical leg leeward', cd: 1.83 },
    { profile: 'Double angles / tee', cd: 1.99 },
  ],
  cite: {
    page: 166,
    figure: '4-22',
    originalSource: 'ANSI/IEEE Std. 605-1987, Table 1',
    note: 'Profiles described in words from the figure; orientation labels are a reading of the sketches.',
  },
};

/** Table 4-13: ideal coupler locations (multiples of span length L, measured from the left-most support). */
export const TABLE_4_13_COUPLER_LOCATIONS: Sourced<Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, readonly number[]>>> = {
  value: {
    1: [],
    2: [0.75, 1.25],
    3: [0.8, 1.276, 1.724, 2.2],
    4: [0.786, 1.266, 1.806, 2.194, 2.734, 3.214],
    5: [0.789, 1.268, 1.783, 2.196, 2.804, 3.217, 3.732, 4.211],
    6: [0.788, 1.268, 1.79, 2.196, 2.785, 3.215, 3.804, 4.21, 4.732, 5.212],
  },
  cite: {
    page: 170,
    section: '4.11.2.9',
    table: '4-13',
    note:
      'Continuous, uniformly loaded rigid conductors; locations are points of zero bending moment. Single simply supported spans have zero moment only at the supports, so couplers are not recommended.',
  },
};

export const COUPLER_AND_EXPANSION_GUIDANCE: readonly Guidance[] = [
  {
    id: 'rb-no-captured-spans',
    text: 'Avoid bus sections fixed at both ends with no allowance for expansion; connect to breaker, transformer, VT and other bushings with flexible conductors or expansion connectors.',
    cite: { page: 169, section: '4.11.2.8' },
    tags: ['rigid-bus', 'thermal-expansion', 'design-check'],
  },
  {
    id: 'rb-switch-expansion-terminals',
    text: 'Connections to switches on apparatus insulators may need expansion terminals, depending on where other expansion points are; expansion fittings on long horizontal buses should allow only longitudinal movement.',
    cite: { page: 169, section: '4.11.2.8' },
    tags: ['rigid-bus', 'thermal-expansion', 'switch'],
  },
  {
    id: 'rb-section-length',
    text: 'Limit continuous bus sections to about 30.48 m (100 ft) by fixing some supports and letting others slide (Fig. 4-23: slip-fit, fixed and expansion-coupler supports dividing a bus of 15.24 m spans into four sections).',
    cite: { page: 169, section: '4.11.2.8', figure: '4-23' },
    tags: ['rigid-bus', 'thermal-expansion', 'design-check'],
  },
  {
    id: 'rb-coupler-type',
    text: 'Make couplers as long as possible; bolted clamp couplers need the NEMA CC1 bolt count, welded aluminum couplers should be internal, and compression couplers must be properly sized.',
    cite: { page: 170, section: '4.11.2.9' },
    tags: ['rigid-bus', 'couplers'],
  },
  {
    id: 'rb-coupler-position',
    text: 'Welding and bolting weaken the conductor locally, so put couplers at zero-moment points (Table 4-13); elsewhere cut the allowable fiber stress by up to 50 % and recheck the span.',
    cite: { page: 170, section: '4.11.2.9', table: '4-13' },
    tags: ['rigid-bus', 'couplers', 'design-check'],
  },
  {
    id: 'rb-damping',
    text: 'Damp aeolian vibration on spans over about 6 m (20 ft) with loose scrap cable inside the tube for the full bus length (straightened, held by driven end caps) or one prefabricated damper per span.',
    cite: { page: [170, 171], section: '4.11.2.10' },
    tags: ['rigid-bus', 'vibration', 'design-check'],
  },
];

// ---------------------------------------------------------------------------
// Equation functions
// ---------------------------------------------------------------------------

/** Eq. 4-4. SI: N/m with i in A, D in cm. US: lb/ft with D in inches. */
export function shortCircuitForce(iA: number, spacing: number, units: UnitSystem, ksc = 0.67): number {
  const c = units === 'SI' ? 13.9e-5 : 37.4e-7;
  return (c * ksc * iA * iA) / spacing;
}

/** Eq. 4-5 / 4-12. SI: N/m with diameters in cm. US: lb/ft with diameters in inches. */
export function iceLoad(d1WithIce: number, d2Bare: number, units: UnitSystem): number {
  return (units === 'SI' ? 0.704 : 0.311) * (d1WithIce * d1WithIce - d2Bare * d2Bare);
}

/** Eq. 4-6 (with C_D) / 4-13 (C_D = 1). SI: N/m with Pa and cm. US: lb/ft with lb/ft² and in. */
export function windLoad(windPressure: number, d1WithIce: number, units: UnitSystem, cd = 1.0): number {
  return (units === 'SI' ? 0.01 : 0.083) * cd * windPressure * d1WithIce;
}

/** Eq. 4-7: total rigid-bus load (any consistent force-per-length units). */
export function totalRigidBusLoad(fsc: number, fw: number, wc: number, wi: number): number {
  return Math.sqrt((fsc + fw) ** 2 + (wc + wi) ** 2);
}

/** Eq. 4-8: maximum support spacing. Pass K_SM (SI: m) or K_SE (US: ft). */
export function maxSupportSpacing(k: number, fiberStress: number, sectionModulus: number, totalLoad: number): number {
  return k * Math.sqrt((fiberStress * sectionModulus) / totalLoad);
}

/** Eq. 4-9: maximum vertical deflection. Pass K_DM (SI: cm) or K_DE (US: in). */
export function maxDeflection(k: number, wc: number, wi: number, span: number, e: number, i: number): number {
  return (k * (wc + wi) * span ** 4) / (e * i);
}

/** Deflection limit = span/200, in cm for a span in m (SI) or in inches for a span in ft (US). */
export function deflectionLimit(span: number, units: UnitSystem): number {
  return (units === 'SI' ? span * 100 : span * 12) / 200;
}

/** Eq. 4-10: minimum insulator cantilever strength (N with N/m and m; lb with lb/ft and ft). */
export function minCantileverStrength(fsc: number, fw: number, leftSpan: number, rightSpan: number): number {
  return 2.5 * (fsc + fw) * ((leftSpan + rightSpan) / 2);
}

/** Eq. 4-11: thermal expansion, in the length unit of `length`. */
export function thermalExpansion(alpha: number, length: number, deltaT: number): number {
  return alpha * length * deltaT;
}

/** Table 4-13 coupler positions for n equal spans of length L (same unit as L). */
export function couplerLocations(nSpans: 1 | 2 | 3 | 4 | 5 | 6, spanLength: number): number[] {
  return TABLE_4_13_COUPLER_LOCATIONS.value[nSpans].map((f) => f * spanLength);
}

export interface RigidBusCheckInput {
  faultCurrentA: number;
  spacingCm: number;
  ksc?: number;
  bareDiameterCm: number;
  radialIceCm: number;
  windPa: number;
  dragCoefficient?: number;
  conductorWeightNPerM: number;
  fiberStressKPa: number;
  sectionModulusCm3: number;
  eKPa: number;
  inertiaCm4: number;
  spanM: number;
  /** Table 4-12 factors for the support arrangement. */
  kSM: number;
  kDM: number;
}

export interface RigidBusCheckResult {
  fscNPerM: number;
  wiNPerM: number;
  fwNPerM: number;
  ftNPerM: number;
  maxSpanM: number;
  deflectionCm: number;
  deflectionLimitCm: number;
  cantileverN: number;
  spanOk: boolean;
  deflectionOk: boolean;
}

/** Runs §4.11.2 steps 3-7 in metric units for equal spans (cantilever uses two equal adjacent spans). */
export function checkRigidBusSI(x: RigidBusCheckInput): RigidBusCheckResult {
  const d1 = x.bareDiameterCm + 2 * x.radialIceCm;
  const fsc = shortCircuitForce(x.faultCurrentA, x.spacingCm, 'SI', x.ksc ?? 0.67);
  const wi = iceLoad(d1, x.bareDiameterCm, 'SI');
  const fw = windLoad(x.windPa, d1, 'SI', x.dragCoefficient ?? 1.0);
  const ft = totalRigidBusLoad(fsc, fw, x.conductorWeightNPerM, wi);
  const maxSpan = maxSupportSpacing(x.kSM, x.fiberStressKPa, x.sectionModulusCm3, ft);
  const y = maxDeflection(x.kDM, x.conductorWeightNPerM, wi, x.spanM, x.eKPa, x.inertiaCm4);
  const yLim = deflectionLimit(x.spanM, 'SI');
  return {
    fscNPerM: fsc,
    wiNPerM: wi,
    fwNPerM: fw,
    ftNPerM: ft,
    maxSpanM: maxSpan,
    deflectionCm: y,
    deflectionLimitCm: yLim,
    cantileverN: minCantileverStrength(fsc, fw, x.spanM, x.spanM),
    spanOk: x.spanM <= maxSpan,
    deflectionOk: y <= yLim,
  };
}

// ---------------------------------------------------------------------------
// §4.11.3 worked example
// ---------------------------------------------------------------------------

/**
 * §4.11.3 bus design example (161 kV, 750 kV BIL, 1800 A, 24 kA, heavy NESC loading, post insulators,
 * 45.72 m / 150 ft bus with a disconnect at one end and external dampers). Values as printed.
 */
export const RIGID_BUS_EXAMPLE = {
  cite: { page: [171, 176], section: '4.11.3', figure: '4-24, 4-25' } satisfies Citation,
  inputs: {
    totalLengthM: 45.72,
    totalLengthFt: 150,
    initialSpans: 4,
    initialSpanM: 11.43,
    initialSpanFt: 37.5,
    voltageKV: 161,
    bilKV: 750,
    insulatorType: 'post',
    continuousA: 1800,
    shortCircuitA: 24000,
    altitudeM: 304.8,
    altitudeFt: 1000,
    nescDistrict: 'heavy' as const,
    vibrationControl: 'external prefabricated dampers',
  },
  conductor: {
    description: '3 in IPS Schedule 40 6063-T6 aluminum pipe (7.6 cm), 1890 A',
    ampacityA: 1890,
    wcNPerM: 38.2,
    wcLbPerFt: 2.62,
    d2Cm: 8.89,
    d2In: 3.5,
    inertiaCm4: 125.6,
    inertiaIn4: 3.017,
    eKPa: 6.9e7,
    ePsi: 10e6,
    sectionModulusCm3: 28.2,
    sectionModulusIn3: 1.72,
    fiberStressKPa: 1.38e5,
    fiberStressPsi: 20000,
  },
  spacing: { dCm: 274, dIn: 108, source: 'Table 4-7 (161 kV)' },
  shortCircuitForce: { ksc: 0.67, fscNPerM: 195.8, fscLbPerFt: 13.4, note: 'Later steps use 13.3 lb/ft.' },
  loading: {
    radialIceCm: 1.27,
    radialIceIn: 0.5,
    windPa: 191.5,
    windPsf: 4.0,
    d1Cm: 11.43,
    d1In: 4.5,
    wiNPerM: 36.3,
    wiLbPerFt: 2.49,
    fwNPerM: 21.9,
    fwLbPerFt: 1.49,
    ftNPerM: 230.1,
    ftLbPerFt: 15.6,
    note: 'The bulletin cites "Table 4-9" for the ice thickness; Table 4-11 is meant. Wind 191.5 Pa is used for 4.0 psf (Table 4-11 lists 190 Pa). C_D for round tube (1.0) is omitted in the printed wind equation.',
  },
  supportSpacing: {
    kSM: 0.096,
    kSE: 0.88,
    maxSpanM: 12.48,
    maxSpanFt: 41.3,
    verdict: 'The assumed 11.43 m (37.5 ft) spans are structurally permissible.',
  },
  deflectionTrial1: {
    spanM: 11.43,
    spanFt: 37.5,
    kDM: 6.9e4,
    kDE: 11.9,
    yCm: 10.1,
    yIn: 3.99,
    yMaxCm: 5.72,
    yMaxIn: 2.25,
    verdict: 'Exceeds the 1/200 limit - redesign with shorter spans.',
  },
  deflectionTrial2: {
    spans: 5,
    spanM: 9.14,
    spanFt: 30,
    yCm: 4.14,
    yIn: 1.63,
    yMaxCm: 4.57,
    yMaxIn: 1.8,
    verdict: 'Within the limit; 9.14 m (30 ft) support spacing is adequate.',
  },
  cantilever: {
    lsM: 9.14,
    lsFt: 30,
    wsN: 4974,
    wsLb: 1109,
    selectedInsulator: 'Table 4-5 technical reference 291 (750 kV BIL post), 5338 N (1200 lb) cantilever',
  },
  thermalExpansion: {
    deltaTC: 50,
    deltaTF: 90,
    alphaPerC: 2.3e-5,
    alphaPerF: 1.3e-5,
    expansionCm: 5.26,
    expansionIn: 2.11,
  },
  couplers: {
    /** Table 4-13, five spans of 9.14 m (30 ft). */
    idealLocationsM: [7.2, 11.6, 16.3, 20.1, 25.6, 29.4, 34.1, 38.5],
    idealLocationsFt: [23.7, 38.0, 53.5, 65.9, 84.1, 96.5, 112.0, 126.3],
    /** With 12.19 m (40 ft) conductor lengths, couplers go at points 2, 4, 6 and 8. */
    conductorLengthM: 12.19,
    conductorLengthFt: 40,
    chosenPoints: [2, 4, 6, 8],
  },
  /** Fig. 4-25 support types left to right over the five spans. */
  supportsLeftToRight: ['slip-fit', 'slip-fit', 'fixed', 'slip-fit', 'slip-fit', 'expansion terminal'],
  vibration: 'Spans are fairly long, so dampers (or scrap cable, whose weight must then be added to W_C) are needed.',
};

// ---------------------------------------------------------------------------
// §4.12 Strain bus (gist)
// ---------------------------------------------------------------------------

export const STRAIN_BUS_FACTS: Sourced<{
  /** Usual maximum design tension per conductor under the most severe loading, N / lb. */
  maxTensionN: number;
  maxTensionLb: number;
  /** Max suspension insulator loading, percent of M&E rating (porcelain) or manufacturer's rating (fiberglass). */
  maxInsulatorLoadPct: number;
  /** Increase Table 4-7 clearances by at least this percent for non-rigid conductors. */
  clearanceIncreasePct: number;
}> = {
  value: { maxTensionN: 13350, maxTensionLb: 3000, maxInsulatorLoadPct: 40, clearanceIncreasePct: 50 },
  cite: { page: [177, 179], section: '4.12.1.5, 4.12.1.7, 4.12.2.2, 4.12.2.5' },
};

export const STRAIN_BUS_GUIDANCE: readonly Guidance[] = [
  {
    id: 'sb-movement',
    text: 'Flexible strain-bus conductors move a lot, so position them to keep clearances to other equipment under all loading and weather conditions.',
    cite: { page: 176, section: '4.12.1.1' },
    tags: ['strain-bus', 'clearance'],
  },
  {
    id: 'sb-structures',
    text: 'Strain buses need large supporting structures, which can block future expansion if poorly placed.',
    cite: { page: 177, section: '4.12.1.2' },
    tags: ['strain-bus', 'expansion', 'structure'],
  },
  {
    id: 'sb-sag-tension',
    text: 'Longer spans sag more at the same tension; tensions are usually held to about 13,350 N (3000 lb) or less to avoid breakage over equipment and keep structures small, and structure deflection adds sag.',
    cite: { page: 177, section: '4.12.1.6, 4.12.1.7' },
    tags: ['strain-bus', 'sag'],
  },
  {
    id: 'sb-taps',
    text: 'Install taps from strain buses to equipment as slack connections so they do not pull on equipment.',
    cite: { page: 177, section: '4.12.1.9' },
    tags: ['strain-bus', 'connections'],
  },
  {
    id: 'sb-procedure',
    text: 'Strain bus design: size for current, set spacing from Tables 4-7/4-8 increased 50 %, choose insulator quantity from Table 4-6, compute loading (Eqs. 4-12..4-14), find conductor sag, add the insulator-string sag, and chart stringing sags and tensions by temperature.',
    cite: { page: [177, 181], section: '4.12.2' },
    tags: ['strain-bus', 'procedure'],
  },
  {
    id: 'sb-max-sag-case',
    text: 'With light loading (no ice) maximum sag may occur at the highest conductor temperature; otherwise check both the hottest condition and maximum loading.',
    cite: { page: 179, section: '4.12.2.5' },
    tags: ['strain-bus', 'sag'],
  },
];

/** Eq. 4-14: strain-bus total loading, F_T = [F_W² + (W_C + W_I)²]^½ + k (k from Table 4-15). */
export function strainBusTotalLoad(fw: number, wc: number, wi: number, k: number): number {
  return Math.sqrt(fw ** 2 + (wc + wi) ** 2) + k;
}

export interface InsulatorSagInput {
  /** Horizontal conductor tension (N or lb). */
  tension: number;
  /** Insulator string weight per unit length (N/m or lb/ft). */
  insulatorWeightPerLength: number;
  /** Conductor weight per unit length (N/m or lb/ft). */
  conductorWeightPerLength: number;
  /** Span length (m or ft). */
  span: number;
  /** Insulator string length (m or ft). */
  stringLength: number;
}

/** §4.12.2.6 / Fig. 4-26: suspension-insulator contribution to strain-bus sag (consistent units). */
export function suspensionInsulatorSag(x: InsulatorSagInput): {
  cI: number;
  cC: number;
  xBD: number;
  xBC: number;
  yBC: number;
  lAC: number;
  xAC: number;
  yAC: number;
  yI: number;
} {
  const cI = x.tension / x.insulatorWeightPerLength;
  const cC = x.tension / x.conductorWeightPerLength;
  const xBD = x.span / 2 - x.stringLength;
  const xBC = (cI / cC) * xBD;
  const yBC = cI * (Math.cosh(xBC / cI) - 1);
  const lAC = x.stringLength + cI * Math.sinh(xBC / cI);
  const xAC = cI * Math.asinh(lAC / cI);
  const yAC = cI * (Math.cosh(xAC / cI) - 1);
  return { cI, cC, xBD, xBC, yBC, lAC, xAC, yAC, yI: yAC - yBC };
}

export const STRAIN_BUS_EQUATIONS: readonly BusEquation[] = [
  {
    id: '4-12',
    name: 'Ice loading (strain bus)',
    formulaSI: 'W_I = 0.704 · (d1² − d2²)',
    formulaUS: 'W_I = 0.311 · (d1² − d2²)',
    variables: [{ symbol: 'd1', meaning: 'Diameter with ice from Table 4-15', unitSI: 'cm', unitUS: 'in' }],
    cite: { page: 178, section: '4.12.2.4', equation: '4-12' },
  },
  {
    id: '4-13',
    name: 'Wind loading (strain bus)',
    formulaSI: 'F_W = 0.01 · P_W · d1',
    formulaUS: 'F_W = 0.083 · P_W · d1',
    variables: [{ symbol: 'P_W', meaning: 'Wind pressure from Table 4-15', unitSI: 'Pa', unitUS: 'lb/ft²' }],
    cite: { page: 178, section: '4.12.2.4', equation: '4-13' },
  },
  {
    id: '4-14',
    name: 'Total loading (strain bus)',
    formulaSI: 'F_T = [F_W² + (W_C + W_I)²]^½ + k',
    formulaUS: 'F_T = [F_W² + (W_C + W_I)²]^½ + k',
    variables: [{ symbol: 'k', meaning: 'NESC constant from Table 4-15', unitSI: 'N/m', unitUS: 'lb/ft' }],
    cite: { page: [178, 179], section: '4.12.2.4', equation: '4-14' },
  },
  {
    id: 'fig-4-26',
    name: 'Suspension insulator effect on sag',
    formulaSI:
      'C_I = T_C/W_IN; C_C = T_C/W_C; X_BD = L/2 − l_AB; X_BC = (C_I/C_C)·X_BD; Y_BC = C_I(cosh(X_BC/C_I) − 1); l_AC = l_AB + C_I·sinh(X_BC/C_I); X_AC = C_I·asinh(l_AC/C_I); Y_AC = C_I(cosh(X_AC/C_I) − 1); Y_I = Y_AC − Y_BC; Y = Y_I + Y_C',
    formulaUS: 'Same as SI with feet and pounds',
    variables: [
      { symbol: 'T_C', meaning: 'Horizontal conductor tension', unitSI: 'N', unitUS: 'lb' },
      { symbol: 'W_IN', meaning: 'Insulator string weight per length', unitSI: 'N/m', unitUS: 'lb/ft' },
      { symbol: 'l_AB', meaning: 'Insulator string length', unitSI: 'm', unitUS: 'ft' },
      { symbol: 'Y_C', meaning: 'Conductor sag (computed for span 2·X_BD)', unitSI: 'm', unitUS: 'ft' },
    ],
    cite: { page: [179, 180], section: '4.12.2.6', figure: '4-26' },
  },
];

/** §4.12.2.8: sample total-loading calculation (60.96 m span, 161 kV, 795 kcmil 26/7 ACSR, heavy loading). */
export const STRAIN_BUS_LOADING_EXAMPLE = {
  cite: { page: [181, 182], section: '4.12.2.8', equation: '4-12, 4-13, 4-14' } satisfies Citation,
  inputs: {
    spanM: 60.96,
    spanFt: 200,
    voltageKV: 161,
    bilKV: 750,
    conductor: '795 kcmil 26/7 ACSR',
    d2Cm: 2.81,
    d2In: 1.108,
    wcNPerM: 16.0,
    wcLbPerFt: 1.094,
    nescDistrict: 'heavy' as const,
    d1Cm: 5.31,
    d1In: 2.108,
    windPa: 190.0,
    windPsf: 4,
    kNPerM: 4.38,
    kLbPerFt: 0.3,
  },
  results: { wiNPerM: 14.6, wiLbPerFt: 1.0, fwNPerM: 10.2, fwLbPerFt: 0.7, ftNPerM: 36.6, ftLbPerFt: 2.51 },
  note:
    'UNCERTAIN: the metric equations as printed give W_I = 14.3 N/m and F_W = 10.1 N/m; the printed 14.6 and 10.2 N/m equal the US results (1.0 and 0.70 lb/ft) converted. k is used as 4.38 N/m (Table 4-15: 4.4).',
};

/** §4.12.2.9: sample suspension-insulator effect on bus sag. */
export const STRAIN_BUS_INSULATOR_EFFECT_EXAMPLE = {
  cite: { page: [182, 184], section: '4.12.2.9', figure: '4-26' } satisfies Citation,
  inputs: {
    spanM: 60.96,
    spanFt: 200,
    conductor: '795 kcmil 26/7 ACSR',
    wcNPerM: 16.0,
    wcLbPerFt: 1.094,
    tensionN: 8896,
    tensionLb: 2000,
    insulators: 10,
    insulatorLengthCm: 14.6,
    insulatorLengthIn: 5.75,
    insulatorWeightN: 48.9,
    insulatorWeightLb: 11.0,
  },
  resultsSI: { cIM: 26.6, cCM: 556, xBCM: 1.39, yBCM: 0.0363, lACM: 2.85, xACM: 2.84, yACM: 0.152, yIM: 0.116 },
  resultsUS: { cIFt: 87.1, cCFt: 1828, xBCFt: 4.54, yBCFt: 0.118, lACFt: 9.33, xACFt: 9.31, yACFt: 0.498, yIFt: 0.38 },
  note: 'The X_BC step divides by 555 m although C_C was computed as 556 m. Add Y_I to the conductor sag computed for a span of 2·X_BD.',
};
