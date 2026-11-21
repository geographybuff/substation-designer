/**
 * Insulator and bare-conductor data from RUS Bulletin 1724E-300 §4.8-4.10 (pp. 146-163), plus the
 * loading tables used by the bus design procedures (Tables 4-11, 4-12, 4-14, 4-15).
 *
 * Covers: apparatus insulators (types, Table 4-3 BIL altitude factors, Tables 4-4/4-5 typical
 * characteristics, mounting), suspension insulators (excluding Table 4-6), clearance adjustments of
 * §4.9 with the Table 4-9 altitude example, conductor materials, rigid and flexible conductors,
 * ampacity basis with the Table 4-10 altitude example, bus connections, NESC wind/ice loading
 * (Tables 4-11, 4-15), span/deflection factors (Table 4-12) and Schedule 40 aluminum pipe properties
 * (Table 4-14). Tables 4-2, 4-6, 4-7 and 4-8 are in voltageClasses.ts.
 */
import type { Citation, Guidance, Sourced } from './types';

// ---------------------------------------------------------------------------
// Apparatus insulators (§4.8.1)
// ---------------------------------------------------------------------------

export const APPARATUS_INSULATOR_GUIDANCE: readonly Guidance[] = [
  {
    id: 'ins-types',
    text: 'Outdoor apparatus insulators support rigid bus and equipment above ground potential; they are usually wet-process porcelain, in cap-and-pin or post types.',
    cite: { page: 146, section: '4.8.1.1' },
    tags: ['insulator'],
  },
  {
    id: 'ins-contamination-bil',
    text: 'In areas of extremely high contamination, consider insulators with a higher BIL than normally listed for the system voltage, or longer leakage distance.',
    cite: { page: [146, 148], section: '4.8.1.2, 4.8.1.5' },
    tags: ['insulator', 'contamination', 'BIL'],
  },
  {
    id: 'ins-post-recommended',
    text: 'Post insulators are the type most used today and are recommended for new construction and rebuilds; cap-and-pin insulators are the original type and still found in service.',
    cite: { page: [146, 148], section: '4.8.1.3, 4.8.1.4, 4.8.1.6' },
    tags: ['insulator', 'selection'],
  },
  {
    id: 'ins-polymer-not-switch',
    text: 'Polymer post insulators are less rigid than porcelain or composite types and are not recommended for switch supports.',
    cite: { page: 146, section: '4.8.1.4' },
    tags: ['insulator', 'switch'],
  },
  {
    id: 'ins-stacking',
    text: 'Single non-stacking post insulators are normally used through 69 kV (350 kV BIL); stacking posts are used at 115 kV (550 kV BIL) and above.',
    cite: { page: 147, section: '4.8.1.4', figure: '4-19' },
    tags: ['insulator', 'design-check'],
  },
  {
    id: 'ins-post-skirts',
    text: 'Short post skirts resist flashover damage, and broken skirts rarely cause flashover because little of the leakage distance is lost; posts generally have longer leakage distance than cap-and-pin units.',
    cite: { page: 147, section: '4.8.1.4, 4.8.1.5' },
    tags: ['insulator', 'contamination'],
  },
  {
    id: 'ins-cantilever',
    text: 'Cantilever strength is usually the key mechanical rating; post insulators have equal cantilever ratings upright and underhung. Tensile, compressive and torsional strength can also matter.',
    cite: { page: 148, section: '4.8.1.6' },
    tags: ['insulator', 'mechanical'],
  },
  {
    id: 'ins-horizontal',
    text: 'Horizontally mounted insulators must also carry the weight of insulators, fittings, bus and equipment; some manufacturers reduce allowable loads for this position.',
    cite: { page: 151, section: '4.8.1.7' },
    tags: ['insulator', 'mechanical'],
  },
  {
    id: 'ins-colors',
    text: 'Post insulators come in different colors, so state a preference before purchase.',
    cite: { page: 147, section: '4.8.1.4' },
    tags: ['insulator', 'appearance'],
  },
];

export const INSULATOR_MOUNTING: Sourced<{
  boltCircles: readonly { in: number; cm: number }[];
  tappedHoles: readonly string[];
}> = {
  value: {
    boltCircles: [
      { in: 3, cm: 7.62 },
      { in: 5, cm: 12.7 },
      { in: 7, cm: 17.8 },
      { in: 12, cm: 30.5 },
      { in: 14, cm: 35.6 },
    ],
    tappedHoles: ['1/2 in, 13 threads per inch', '5/8 in, 11 threads per inch', '3/4 in, 10 threads per inch'],
  },
  cite: {
    page: 151,
    section: '4.8.1.7',
    note: 'End caps have four mounting holes; the bolt circle depends on strength and voltage rating. Adapters between bolt circles exist.',
  },
};

export interface AltitudeBilRow {
  altitudeM: number;
  altitudeFt: number;
  factor: number;
}

/** Table 4-3: altitude correction factors applied to BIL (insulators and air-insulated equipment). */
export const TABLE_4_3_BIL_ALTITUDE: Sourced<readonly AltitudeBilRow[]> = {
  value: [
    { altitudeM: 1000, altitudeFt: 3300, factor: 1.0 },
    { altitudeM: 1200, altitudeFt: 4000, factor: 0.98 },
    { altitudeM: 1500, altitudeFt: 5000, factor: 0.95 },
    { altitudeM: 1800, altitudeFt: 6000, factor: 0.92 },
    { altitudeM: 2100, altitudeFt: 7000, factor: 0.89 },
    { altitudeM: 2400, altitudeFt: 8000, factor: 0.86 },
    { altitudeM: 2700, altitudeFt: 9000, factor: 0.83 },
    { altitudeM: 3000, altitudeFt: 10000, factor: 0.8 },
    { altitudeM: 3600, altitudeFt: 12000, factor: 0.75 },
    { altitudeM: 4200, altitudeFt: 14000, factor: 0.7 },
    { altitudeM: 4800, altitudeFt: 16000, factor: 0.65 },
    { altitudeM: 5400, altitudeFt: 18000, factor: 0.61 },
    { altitudeM: 6000, altitudeFt: 20000, factor: 0.56 },
  ],
  cite: {
    page: [146, 147],
    section: '4.8.1.2',
    table: '4-3',
    originalSource: 'ANSI/IEEE Std. C37.30-1992, Table 1',
    note: 'Apply above 1000 m (3300 ft) to reduce insulator BILs. The bulletin notes the factors were under review.',
  },
};

/**
 * BIL altitude factor from Table 4-3, linearly interpolated (1.0 at or below 1000 m; last row beyond 6000 m).
 * Interpolation is a game convention; the bulletin's own example uses a tabulated altitude.
 */
export function bilAltitudeFactor(altitudeM: number): number {
  const rows = TABLE_4_3_BIL_ALTITUDE.value;
  if (altitudeM <= rows[0].altitudeM) return 1;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    if (altitudeM <= b.altitudeM) return a.factor + ((altitudeM - a.altitudeM) / (b.altitudeM - a.altitudeM)) * (b.factor - a.factor);
  }
  return rows[rows.length - 1].factor;
}

export interface CapAndPinInsulator {
  bilKV: number;
  techRef: number;
  uprightCantileverLb: number;
  uprightCantileverN: number;
  underhungCantileverLb: number;
  underhungCantileverN: number;
  boltCircleIn: number;
  boltCircleCm: number;
  heightIn: number;
  heightCm: number;
  /** Height excludes the 3.5 in (8.89 cm) sub-base required for full BIL (note 1). */
  excludesSubBase: boolean;
  leakageIn: number;
  leakageCm: number;
}

const cp = (
  bilKV: number,
  techRef: number,
  up: [number, number],
  under: [number, number],
  bolt: [number, number],
  height: [number, number],
  excludesSubBase: boolean,
  leak: [number, number],
): CapAndPinInsulator => ({
  bilKV,
  techRef,
  uprightCantileverLb: up[0],
  uprightCantileverN: up[1],
  underhungCantileverLb: under[0],
  underhungCantileverN: under[1],
  boltCircleIn: bolt[0],
  boltCircleCm: bolt[1],
  heightIn: height[0],
  heightCm: height[1],
  excludesSubBase,
  leakageIn: leak[0],
  leakageCm: leak[1],
});

/** Table 4-4: typical characteristics of cap-and-pin apparatus insulators. */
export const TABLE_4_4_CAP_AND_PIN: Sourced<readonly CapAndPinInsulator[]> = {
  value: [
    cp(95, 1, [2000, 8896], [1000, 4448], [3, 7.62], [7.5, 19.1], false, [7.5, 19.1]),
    cp(95, 41, [4000, 17792], [3000, 13344], [3, 7.62], [8, 20.3], false, [8, 20.3]),
    cp(110, 4, [2000, 8896], [1000, 4448], [3, 7.62], [10, 25.4], false, [12.0, 30.5]),
    cp(110, 44, [4000, 17792], [3000, 13344], [5, 12.7], [10, 25.4], false, [14.0, 35.6]),
    cp(150, 7, [2000, 8896], [1000, 4448], [3, 7.62], [12, 30.5], false, [20.0, 50.8]),
    cp(150, 46, [4000, 17792], [3000, 13344], [5, 12.7], [12, 30.5], false, [18.0, 45.7]),
    cp(190, 147, [3000, 13344], [2000, 8896], [3, 7.62], [14.5, 36.8], false, [26.0, 66.0]),
    cp(200, 10, [2000, 8896], [1000, 4448], [3, 7.62], [15, 38.1], false, [28.0, 71.1]),
    cp(200, 49, [4000, 17792], [3000, 13344], [5, 12.7], [15, 38.1], false, [28.0, 71.1]),
    cp(210, 140, [7000, 31136], [4000, 17792], [5, 12.7], [14.5, 36.8], false, [33.0, 83.8]),
    cp(210, 141, [10000, 44480], [6000, 26688], [5, 12.7], [14.5, 36.8], false, [33.0, 83.8]),
    cp(210, 142, [10000, 44480], [6000, 26688], [7, 17.8], [14.5, 36.8], false, [33.0, 83.8]),
    cp(210, 191, [20000, 88960], [12000, 53376], [7, 17.8], [14.5, 36.8], false, [33.0, 83.8]),
    cp(210, 164, [4000, 17792], [3500, 15568], [3, 7.62], [14.5, 36.8], false, [33.0, 83.8]),
    cp(250, 13, [2000, 8896], [1000, 4448], [3, 7.62], [18, 45.7], false, [36.0, 91.4]),
    cp(250, 165, [3000, 13344], [2000, 8896], [3, 7.62], [18, 45.7], false, [36.0, 91.4]),
    cp(350, 16, [1500, 6672], [1000, 4448], [3, 7.62], [29, 73.7], false, [52.0, 132.0]),
    cp(350, 56, [3000, 13344], [2350, 10453], [5, 12.7], [29.0, 73.7], true, [66.0, 168.0]),
    cp(350, 166, [2000, 8896], [2000, 8896], [3, 7.62], [29.0, 73.7], true, [66.0, 168.0]),
    cp(550, 19, [1700, 7562], [1470, 6539], [5, 12.7], [43.5, 111.0], true, [99.0, 252.0]),
    cp(550, 167, [1000, 4448], [1000, 4448], [3, 7.62], [43.5, 111.0], true, [99.0, 252.0]),
    cp(650, 170, [1000, 4448], [1000, 4448], [3, 7.62], [54.0, 137.2], true, [108.0, 274.3]),
    cp(750, 168, [1000, 4448], [1000, 4448], [3, 7.62], [58.0, 147.3], true, [132.0, 335.3]),
    cp(750, 25, [1200, 5338], [1070, 4759], [5, 12.7], [58.0, 147.0], true, [132.0, 335.0]),
    cp(750, 123, [2000, 8896], [1750, 7784], [5, 12.7], [58.0, 147.0], true, [132.0, 335.0]),
    cp(900, 126, [910, 4048], [840, 3736], [5, 12.7], [72.5, 184.0], true, [165.0, 419.0]),
    cp(900, 27, [1450, 6450], [1350, 6005], [5, 12.7], [72.5, 184.0], true, [165.0, 419.0]),
    cp(1050, 128, [750, 3336], [700, 3114], [5, 12.7], [87.0, 221.0], true, [198.0, 503.0]),
    cp(1050, 28, [1170, 5204], [1100, 4893], [5, 12.7], [87.0, 221.0], true, [198.0, 503.0]),
    cp(1050, 196, [2300, 10230], [2300, 10230], [7, 17.8], [87, 221.0], true, [198, 503.0]),
    cp(1300, 133, [1000, 4448], [950, 4226], [7, 17.8], [101.5, 257.8], true, [231, 586.7]),
    cp(1300, 197, [2000, 8896], [2000, 8896], [7, 17.8], [101.5, 257.8], true, [231, 586.7]),
  ],
  cite: {
    page: [148, 149],
    section: '4.8.1.6',
    table: '4-4',
    originalSource: 'ANSI Std. C29.8-1985, Table 1',
    note: 'Representative, typical values; refer to manufacturers\' data for actual ratings.',
  },
};

export interface PostInsulator {
  bilKV: number;
  techRef: number;
  uprightCantileverLb: number;
  uprightCantileverN: number;
  underhungCantileverLb: number;
  underhungCantileverN: number;
  boltCircleTopIn: number;
  boltCircleTopCm: number;
  boltCircleBottomIn: number;
  boltCircleBottomCm: number;
  heightIn: number;
  heightCm: number;
  leakageIn: number;
  leakageCm: number;
}

const po = (
  bilKV: number,
  techRef: number,
  cant: [number, number],
  top: [number, number],
  bottom: [number, number],
  height: [number, number],
  leak: [number, number],
): PostInsulator => ({
  bilKV,
  techRef,
  uprightCantileverLb: cant[0],
  uprightCantileverN: cant[1],
  underhungCantileverLb: cant[0],
  underhungCantileverN: cant[1],
  boltCircleTopIn: top[0],
  boltCircleTopCm: top[1],
  boltCircleBottomIn: bottom[0],
  boltCircleBottomCm: bottom[1],
  heightIn: height[0],
  heightCm: height[1],
  leakageIn: leak[0],
  leakageCm: leak[1],
});

/** Table 4-5: typical characteristics of post-type apparatus insulators (upright = underhung cantilever in every row). */
export const TABLE_4_5_POST: Sourced<readonly PostInsulator[]> = {
  value: [
    po(95, 202, [2000, 8896], [3, 7.62], [3, 7.62], [7.5, 19.1], [10.5, 26.7]),
    po(95, 202, [4000, 17792], [5, 12.7], [5, 12.7], [7.5, 19.1], [10.5, 26.7]),
    po(110, 205, [2000, 8896], [3, 7.62], [3, 7.62], [10, 25.4], [15.5, 39.4]),
    po(110, 225, [4000, 17792], [5, 12.7], [5, 12.7], [12, 30.5], [15.5, 39.4]),
    po(150, 208, [2000, 8896], [3, 7.62], [3, 7.62], [14, 35.6], [24, 61.0]),
    po(150, 227, [4000, 17792], [5, 12.7], [5, 12.7], [15, 38.1], [24, 61.0]),
    po(200, 210, [2000, 8896], [3, 7.62], [3, 7.62], [18, 45.7], [37, 94]),
    po(200, 231, [4000, 17792], [5, 12.7], [5, 12.7], [20, 50.8], [37, 94]),
    po(250, 214, [2000, 8896], [3, 7.62], [3, 7.62], [22, 55.9], [43, 109]),
    po(250, 267, [4000, 17792], [5, 12.7], [5, 12.7], [24, 61.0], [43, 109]),
    po(350, 216, [1500, 6672], [3, 7.62], [3, 7.62], [30, 76.2], [72, 183]),
    po(350, 278, [3000, 13344], [5, 12.7], [5, 12.7], [30, 76.2], [72, 183]),
    po(550, 286, [1700, 7562], [5, 12.7], [5, 12.7], [45, 114], [99, 251]),
    po(550, 287, [2600, 11564], [5, 12.7], [5, 12.7], [45, 114], [99, 251]),
    po(650, 288, [1400, 6227], [5, 12.7], [5, 12.7], [54, 137], [116, 295]),
    po(650, 289, [2200, 9786], [5, 12.7], [5, 12.7], [54, 137], [116, 295]),
    po(750, 291, [1200, 5338], [5, 12.7], [5, 12.7], [62, 157], [132, 335]),
    po(750, 295, [1850, 8229], [5, 12.7], [5, 12.7], [62, 157], [132, 335]),
    po(900, 304, [950, 4226], [5, 12.7], [5, 12.7], [80, 203], [165, 419]),
    po(900, 308, [1450, 6450], [5, 12.7], [5, 12.7], [80, 203], [165, 419]),
    po(1050, 312, [800, 3558], [5, 12.7], [5, 12.7], [92, 234], [198, 503]),
    po(1050, 316, [1250, 5560], [5, 12.7], [5, 12.7], [92, 234], [198, 503]),
    po(1050, 362, [2300, 10230], [7, 17.8], [7, 17.8], [92, 234], [198, 503]),
    po(1300, 324, [1000, 4448], [5, 12.7], [5, 12.7], [106, 269], [231, 587]),
    po(1300, 367, [1450, 6450], [5, 12.7], [7, 17.8], [106, 269], [231, 587]),
    po(1300, 368, [2000, 8896], [7, 17.8], [7, 17.8], [106, 269], [231, 587]),
    po(1300, 369, [2050, 9118], [5, 12.7], [7, 17.8], [106, 269], [231, 587]),
  ],
  cite: {
    page: [148, 150],
    section: '4.8.1.6',
    table: '4-5',
    originalSource: 'ANSI Std. C29.9-1983, Tables 1 and 2',
    note: 'Representative, typical values. Both 95 kV rows print technical reference 202 (the 4000 lb row likely has a different number in C29.9).',
  },
};

/** Lightest-duty post (Table 4-5) whose cantilever rating meets `requiredN` at the given BIL, or undefined. */
export function selectPostInsulator(bilKV: number, requiredN: number): PostInsulator | undefined {
  return TABLE_4_5_POST.value
    .filter((p) => p.bilKV === bilKV && p.uprightCantileverN >= requiredN)
    .sort((a, b) => a.uprightCantileverN - b.uprightCantileverN)[0];
}

// ---------------------------------------------------------------------------
// Suspension insulators (§4.8.2; Table 4-6 is in voltageClasses.ts)
// ---------------------------------------------------------------------------

export const SUSPENSION_INSULATOR_FACTS: Sourced<{
  standardDiameterCm: number;
  standardDiameterIn: number;
  standardLengthCm: number;
  standardLengthIn: number;
  /** Max working load, percent of mechanical-electrical (M&E) rating. */
  maxLoadPctOfME: number;
  /** Proof-test rating, fraction of M&E rating (ANSI C29.2). */
  proofTestFractionOfME: number;
}> = {
  value: { standardDiameterCm: 25.4, standardDiameterIn: 10, standardLengthCm: 14.6, standardLengthIn: 5.75, maxLoadPctOfME: 40, proofTestFractionOfME: 0.5 },
  cite: { page: [151, 153], section: '4.8.2.1, 4.8.2.3', figure: '4-20', note: 'M&E ratings are ultimate strengths listed in RUS IP 202-1.' },
};

export const SUSPENSION_INSULATOR_GUIDANCE: readonly Guidance[] = [
  {
    id: 'susp-types',
    text: 'Suspension insulators insulate and support strain buses: distribution dead-end types (clevis) at distribution voltage, conventional 10 in units (clevis or ball-and-socket) at higher voltage, in porcelain, polymer or glass.',
    cite: { page: 151, section: '4.8.2.1' },
    tags: ['insulator', 'strain-bus'],
  },
  {
    id: 'susp-coordination',
    text: 'Use enough units to prevent needless flashovers but not so many that flashovers go phase-to-phase instead of to ground.',
    cite: { page: 151, section: '4.8.2.2' },
    tags: ['insulator', 'strain-bus', 'insulation-coordination'],
  },
  {
    id: 'susp-extra-units',
    text: 'Add units above Table 4-6 quantities at altitude (derate BIL by Table 4-3), in heavy contamination, typically one more when dead-ending on steel, and one or two more when the string approaches 45° or 90° from vertical.',
    cite: { page: 151, section: '4.8.2.2', table: '4-3, 4-6' },
    tags: ['insulator', 'strain-bus', 'altitude', 'design-check'],
  },
];

// ---------------------------------------------------------------------------
// §4.9 clearance adjustments and the Table 4-9 altitude example
// ---------------------------------------------------------------------------

export const CLEARANCE_ADJUSTMENTS: Sourced<{
  /** Increase Table 4-7 metal-to-metal, phase spacing and ground clearances by at least this percent for non-rigid conductors. */
  nonRigidIncreasePct: number;
  /** In contaminated areas, use clearances this many steps above normal. */
  contaminationStepsUp: number;
}> = {
  value: { nonRigidIncreasePct: 50, contaminationStepsUp: 1 },
  cite: {
    page: 156,
    section: '4.9',
    note: 'Non-rigid conductor movement can also be checked with NESC conductor movement envelopes. Extremely contaminated sites may need more clearance.',
  },
};

export const CLEARANCE_GUIDANCE: readonly Guidance[] = [
  {
    id: 'clr-flashover-to-ground',
    text: 'Coordinate phase-to-ground and phase-to-phase clearances so any flashover goes to ground rather than between phases.',
    cite: { page: 153, section: '4.9' },
    tags: ['clearance', 'insulation-coordination'],
  },
  {
    id: 'clr-switch-all-positions',
    text: 'Air-switch minimum metal-to-metal clearances must hold with the switch open, closed or anywhere in between.',
    cite: { page: [153, 156], section: '4.9' },
    tags: ['clearance', 'switch', 'design-check'],
  },
  {
    id: 'clr-altitude-method',
    text: 'Above 1000 m, derate the standard BILs with Table 4-3 and use the clearances of the BIL that still gives the required withstand (Table 4-9 example).',
    cite: { page: 156, section: '4.9', table: '4-3, 4-9' },
    tags: ['clearance', 'altitude', 'BIL', 'design-check'],
  },
  {
    id: 'clr-arrester-option',
    text: 'Instead of raising BIL at altitude, the engineer may show that modern surge arresters still protect the derated equipment with adequate margin.',
    cite: { page: 156, section: '4.9' },
    tags: ['clearance', 'altitude', 'arrester'],
  },
  {
    id: 'clr-maintenance-space',
    text: 'Leave working space around equipment that will be maintained next to energized parts, keep clearances between crossing buses, and position transformers and breakers so any bushing can be removed.',
    cite: { page: 156, section: '4.9' },
    tags: ['clearance', 'maintenance', 'layout'],
  },
  {
    id: 'clr-moving-parts',
    text: 'Place switches and other equipment with external moving parts so they never infringe the minimum clearances in any position, allowing for deflection under heavy loading.',
    cite: { page: 156, section: '4.9' },
    tags: ['clearance', 'switch', 'design-check'],
  },
  {
    id: 'clr-nesc',
    text: 'The Table 4-7/4-8 clearances exceed NESC requirements in most situations, but NESC clearances must always be maintained.',
    cite: { page: 157, section: '4.9' },
    tags: ['clearance', 'codes'],
  },
];

/** Table 4-9 and the §4.9 example: 121 kV maximum voltage at 2400 m (8000 ft), factor 0.86. */
export const BIL_ALTITUDE_EXAMPLE = {
  cite: { page: 156, section: '4.9', table: '4-9' } satisfies Citation,
  altitudeM: 2400,
  altitudeFt: 8000,
  maxVoltageKV: 121,
  factor: 0.86,
  derated: [
    { standardBilKV: 550, deratedBilKV: 473 },
    { standardBilKV: 650, deratedBilKV: 559 },
    { standardBilKV: 750, deratedBilKV: 645 },
  ],
  /** 650 kV BIL derates to 559 kV, i.e. at least the 550 kV needed, so 650 kV BIL clearances (Tables 4-7, 4-8) are used. */
  selectedBilKV: 650,
};

// ---------------------------------------------------------------------------
// §4.10 Bare conductors
// ---------------------------------------------------------------------------

export const CONDUCTOR_MATERIAL_FACTS: Sourced<{
  /** Aluminum conductivity as a percent of copper's, range. */
  aluminumConductivityPctOfCopper: readonly [number, number];
  /** Copper weighs roughly this multiple of aluminum for the same ampacity. */
  copperWeightRatioSameAmpacity: number;
  /** Copper carries about this multiple (or more) of the current of the same size aluminum conductor. */
  copperAmpacityRatioSameSize: number;
  /** 6063-T6 vs 6061-T6: conductivity about this percent higher... */
  alloy6063ConductivityHigherPct: number;
  /** ...and minimum yield strength about this percent lower. */
  alloy6063YieldLowerPct: number;
  /** Schedule 80 walls are about this percent thicker than Schedule 40. */
  schedule80WallThickerPct: number;
}> = {
  value: {
    aluminumConductivityPctOfCopper: [50, 60],
    copperWeightRatioSameAmpacity: 2,
    copperAmpacityRatioSameSize: 1.3,
    alloy6063ConductivityHigherPct: 23,
    alloy6063YieldLowerPct: 29,
    schedule80WallThickerPct: 40,
  },
  cite: { page: [157, 160], section: '4.10.1, 4.10.2.5, 4.10.4' },
};

export const CONDUCTOR_GUIDANCE: readonly Guidance[] = [
  {
    id: 'cond-aluminum-trend',
    text: 'The trend is to aluminum conductors; copper is used mainly to extend existing copper systems.',
    cite: { page: 157, section: '4.10.1' },
    tags: ['conductor', 'bus'],
  },
  {
    id: 'cond-aluminum-tradeoffs',
    text: 'Aluminum needs larger sizes for the same current, which raises wind and ice load but reduces corona; copper is about twice as heavy for equal ampacity, so it sags more unless supports or tensions increase.',
    cite: { page: 157, section: '4.10.1' },
    tags: ['conductor', 'bus', 'corona'],
  },
  {
    id: 'cond-flat-bars',
    text: 'Flat bars bend and join easily and can be grouped for high current, but skin and proximity effects limit grouping, corona limits them to lower voltages, and they need closely spaced supports.',
    cite: { page: 157, section: '4.10.2.1' },
    tags: ['conductor', 'rigid-bus'],
  },
  {
    id: 'cond-structural-shapes',
    text: 'Angles and channels bolt directly to insulators and are somewhat stiffer than flat bars of equal ampacity, allowing longer support spacing.',
    cite: { page: [157, 159], section: '4.10.2.2' },
    tags: ['conductor', 'rigid-bus'],
  },
  {
    id: 'cond-round-tube',
    text: 'Round tubular conductor is the most popular outdoor bus: structurally and electrically efficient, minimizes corona, permits long spans, and fittings are widely available.',
    cite: { page: 159, section: '4.10.2.3' },
    tags: ['conductor', 'rigid-bus', 'corona'],
  },
  {
    id: 'cond-alloys',
    text: 'Round tubes are usually 6061-T6 or 6063-T6 aluminum; 6063-T6 carries more current but, being weaker, may need shorter spans. Alloy 6106-T61 is common for bars, shapes and square tubes.',
    cite: { page: 159, section: '4.10.2.5' },
    tags: ['conductor', 'rigid-bus'],
  },
  {
    id: 'cond-flexible',
    text: 'Flexible bus and taps are stranded copper, aluminum or ACSR (Class A or AA stranding per ASTM B231), chosen by span, tension, sag and cost; size by ampacity, strength, weight and, at high voltage, diameter for corona.',
    cite: { page: 159, section: '4.10.3' },
    tags: ['conductor', 'strain-bus', 'corona'],
  },
];

export const AMPACITY_BASIS: Sourced<{
  ambientC: number;
  ambientF: number;
  /** Usual temperature rise limit, °C / °F, for a total of 70 °C (158 °F). */
  riseC: number;
  riseF: number;
  totalMaxC: number;
  totalMaxF: number;
  /** Rises of this value and higher have been used successfully, °C / °F. */
  higherRiseUsedC: number;
  higherRiseUsedF: number;
  emissivityAluminum: number;
  emissivityCopper: number;
  /** Proximity-effect losses are negligible at or above this spacing, cm / in. */
  proximityNegligibleSpacingCm: number;
  proximityNegligibleSpacingIn: number;
}> = {
  value: {
    ambientC: 40,
    ambientF: 104,
    riseC: 30,
    riseF: 54,
    totalMaxC: 70,
    totalMaxF: 158,
    higherRiseUsedC: 50,
    higherRiseUsedF: 90,
    emissivityAluminum: 0.5,
    emissivityCopper: 0.8,
    proximityNegligibleSpacingCm: 45.7,
    proximityNegligibleSpacingIn: 18,
  },
  cite: {
    page: 160,
    section: '4.10.4',
    note:
      'Emissivities are for heavily weathered surfaces; higher emissivity gives higher ampacity. Wind raises and sun lowers ampacity. No ampacity tables are given in the bulletin (the only figure is 1890 A for 3 in Sch 40 6063-T6 pipe in the §4.11.3 example).',
  },
};

export interface AltitudeCurrentRow {
  altitudeM: number;
  altitudeFt: number;
  currentFactor: number;
  ambientFactor: number;
}

/** Table 4-10: altitude correction factors for current rating and ambient temperature (do not apply both). */
export const TABLE_4_10_CURRENT_ALTITUDE: Sourced<readonly AltitudeCurrentRow[]> = {
  value: [
    { altitudeM: 1000, altitudeFt: 3300, currentFactor: 1.0, ambientFactor: 1.0 },
    { altitudeM: 1200, altitudeFt: 4000, currentFactor: 0.995, ambientFactor: 0.992 },
    { altitudeM: 1500, altitudeFt: 5000, currentFactor: 0.99, ambientFactor: 0.98 },
    { altitudeM: 1800, altitudeFt: 6000, currentFactor: 0.985, ambientFactor: 0.968 },
    { altitudeM: 2100, altitudeFt: 7000, currentFactor: 0.98, ambientFactor: 0.956 },
    { altitudeM: 2400, altitudeFt: 8000, currentFactor: 0.97, ambientFactor: 0.944 },
    { altitudeM: 2700, altitudeFt: 9000, currentFactor: 0.965, ambientFactor: 0.932 },
    { altitudeM: 3000, altitudeFt: 10000, currentFactor: 0.96, ambientFactor: 0.92 },
    { altitudeM: 3600, altitudeFt: 12000, currentFactor: 0.95, ambientFactor: 0.896 },
    { altitudeM: 4200, altitudeFt: 14000, currentFactor: 0.935, ambientFactor: 0.872 },
    { altitudeM: 4800, altitudeFt: 16000, currentFactor: 0.925, ambientFactor: 0.848 },
    { altitudeM: 5400, altitudeFt: 18000, currentFactor: 0.91, ambientFactor: 0.824 },
    { altitudeM: 6000, altitudeFt: 20000, currentFactor: 0.9, ambientFactor: 0.8 },
  ],
  cite: {
    page: [160, 161],
    section: '4.10.4',
    table: '4-10',
    originalSource: 'ANSI Std. C37.30-1992, Table 1',
    note: 'The current-rating and ambient-temperature corrections should not be applied at the same time. Factors were under review.',
  },
};

/** §4.10.4 worked example: a 1000 A conductor (40 °C ambient, 30 °C rise) used at 5400 m (18,000 ft). */
export const AMPACITY_ALTITUDE_EXAMPLE = {
  cite: { page: 160, section: '4.10.4', table: '4-10' } satisfies Citation,
  ratedA: 1000,
  ambientC: 40,
  riseC: 30,
  altitudeM: 5400,
  altitudeFt: 18000,
  /** Option 1: derate current: 1000 × 0.910 = 910 A at 40 °C ambient. */
  deratedA: 910,
  /** Option 2: keep 1000 A if ambient ≤ 40 × 0.824 = 33 °C (104 × 0.824 = 85.7 °F). */
  maxAmbientAtFullCurrentC: 33,
  maxAmbientAtFullCurrentF: 85.7,
  note: 'The bulletin prints the rise in option 1 as "30 °F (54 °F)"; 30 °C (54 °F) is meant.',
};

// ---------------------------------------------------------------------------
// §4.10.5 Bus connections
// ---------------------------------------------------------------------------

export const BUS_CONNECTION_FACTS: Sourced<{
  rigidBusLengthRangeM: readonly [number, number];
  rigidBusLengthRangeFt: readonly [number, number];
  /** Copper/bronze lug to copper/bronze terminal: ≥2 × 1/2-13 silicon bronze bolts, torque. */
  cuToCuBoltTorqueNm: number;
  cuToCuBoltTorqueLbFt: number;
  /** Aluminum lug to copper/bronze terminal with anodized aluminum bolts (2024-T4 bolts, 6061-T6 nuts), torque. */
  alBoltTorqueNm: number;
  alBoltTorqueLbFt: number;
  minBoltsPerLug: number;
  boltSize: string;
  /** Compression connectors with at least this many circumferential compressions are recommended. */
  minCompressions: number;
}> = {
  value: {
    rigidBusLengthRangeM: [3.05, 12.2],
    rigidBusLengthRangeFt: [10, 40],
    cuToCuBoltTorqueNm: 54.23,
    cuToCuBoltTorqueLbFt: 40,
    alBoltTorqueNm: 33.9,
    alBoltTorqueLbFt: 25,
    minBoltsPerLug: 2,
    boltSize: '1/2 in, 13 threads per inch',
    minCompressions: 2,
  },
  cite: {
    page: [160, 162],
    section: '4.10.5',
    originalSource: 'NEMA Std. CC1 (connector design and bolt quantities)',
    note:
      'UNCERTAIN: two paragraphs on p. 162 both describe an aluminum conductor on a copper/bronze terminal but give different hardware (aluminum bolts at 33.9 N·m vs stainless/tin-plated bronze with spring washers); one was probably meant for another material pair.',
  },
};

export const BUS_CONNECTION_GUIDANCE: readonly Guidance[] = [
  {
    id: 'conn-fewer',
    text: 'For reliability and cost, use as few bus connections as possible; connectors should match the conductor electrically and mechanically.',
    cite: { page: [160, 161], section: '4.10.5.1' },
    tags: ['bus', 'connections'],
  },
  {
    id: 'conn-methods',
    text: 'Connections are bolted (flat surfaces, equipment terminals), clamped, compressed (flexible conductor and now rigid tube) or welded (mainly rigid aluminum).',
    cite: { page: 161, section: '4.10.5.1' },
    tags: ['bus', 'connections'],
  },
  {
    id: 'conn-al-cu',
    text: 'In aluminum-copper joints put the copper below the aluminum so copper salts do not wash onto it, make the aluminum part the more massive, and tin the copper; consider anti-oxidant on aluminum.',
    cite: { page: 162, section: '4.10.5.1.1' },
    tags: ['bus', 'connections', 'corrosion'],
  },
  {
    id: 'conn-matching-material',
    text: 'Use copper or bronze connectors on copper conductors and all-aluminum connectors on aluminum conductors.',
    cite: { page: 162, section: '4.10.5.1.2, 4.10.5.1.3' },
    tags: ['bus', 'connections'],
  },
  {
    id: 'conn-compression-lug-down',
    text: 'Avoid installing compression lugs vertically with the lug down on flexible conductor, to keep moisture out and prevent freeze damage.',
    cite: { page: 162, section: '4.10.5.1.3' },
    tags: ['bus', 'connections'],
  },
  {
    id: 'conn-welded',
    text: 'Properly welded aluminum joints have about the conductor\'s resistance; welding is common in large stations and slightly cheaper than clamps, but may not pay in small ones.',
    cite: { page: 163, section: '4.10.5.2' },
    tags: ['bus', 'connections', 'cost'],
  },
];

// ---------------------------------------------------------------------------
// Loading and section-property tables used by the bus design procedures
// ---------------------------------------------------------------------------

export type LoadingDistrict = 'heavy' | 'medium' | 'light';

export interface NescLoading {
  district: LoadingDistrict;
  iceMm: number;
  iceIn: number;
  windPa: number;
  windPsf: number;
  /** Table 4-15 only: temperature for the loading case. */
  temperatureC: number;
  temperatureF: number;
  /** Table 4-15 only: constant k added to the resultant, N/m and lb/ft. */
  kNPerM: number;
  kLbPerFt: number;
}

/** Tables 4-11 (wind/ice) and 4-15 (adds temperature and k): NESC conductor loading by district. */
export const NESC_LOADING_DISTRICTS: Sourced<readonly NescLoading[]> = {
  value: [
    { district: 'heavy', iceMm: 12.5, iceIn: 0.5, windPa: 190, windPsf: 4.0, temperatureC: -20, temperatureF: 0, kNPerM: 4.4, kLbPerFt: 0.3 },
    { district: 'medium', iceMm: 6.5, iceIn: 0.25, windPa: 190, windPsf: 4.0, temperatureC: -10, temperatureF: 15, kNPerM: 2.5, kLbPerFt: 0.2 },
    { district: 'light', iceMm: 0, iceIn: 0, windPa: 430, windPsf: 9.0, temperatureC: -1.0, temperatureF: 30, kNPerM: 0.73, kLbPerFt: 0.05 },
  ],
  cite: {
    page: [165, 178],
    section: '4.11.2.4, 4.12.2.4',
    table: '4-11, 4-15',
    originalSource: 'IEEE/ANSI C2-1997 (NESC), Tables 250-1 and 251-1',
    note:
      'Treat as minimums; use actual local conditions where more severe conditions are frequent, and also consider extreme wind. The §4.11.3 example uses 191.5 Pa for the 4.0 psf value.',
  },
};

export type BusSupportSystem = 'fixed-both-ends' | 'fixed-one-end-simple-other' | 'simple-single-span' | 'simple-two-spans' | 'simple-three-or-more-spans';

export interface SpanDeflectionFactors {
  system: BusSupportSystem;
  description: string;
  /** Max span factor, metric (Eq. 4-8 with m, kPa, cm³, N/m). */
  kSM: number;
  /** Max span factor, US (ft, psi, in³, lb/ft). */
  kSE: number;
  /** Deflection factor, metric (Eq. 4-9 with cm, N/m, m, kPa, cm⁴). */
  kDM: number;
  /** Deflection factor, US (in, lb/ft, ft, psi, in⁴). */
  kDE: number;
}

/** Table 4-12: conductor maximum span and deflection multiplying factors. */
export const TABLE_4_12_SPAN_DEFLECTION_FACTORS: Sourced<readonly SpanDeflectionFactors[]> = {
  value: [
    { system: 'fixed-both-ends', description: 'Conductor fixed both ends (single span)', kSM: 0.11, kSE: 1.0, kDM: 2.6e4, kDE: 4.5 },
    { system: 'fixed-one-end-simple-other', description: 'Fixed one end, simply supported other end (single span)', kSM: 0.09, kSE: 0.82, kDM: 5.4e4, kDE: 9.34 },
    { system: 'simple-single-span', description: 'Simply supported (single span)', kSM: 0.09, kSE: 0.82, kDM: 1.3e5, kDE: 22.5 },
    { system: 'simple-two-spans', description: 'Simply supported (two equal spans)', kSM: 0.09, kSE: 0.82, kDM: 5.4e4, kDE: 9.34 },
    { system: 'simple-three-or-more-spans', description: 'Simply supported (three or more equal spans)', kSM: 0.096, kSE: 0.88, kDM: 6.9e4, kDE: 11.9 },
  ],
  cite: { page: 167, section: '4.11.2.5', table: '4-12', note: 'For the multi-span cases the maximum deflection occurs in the end spans.' },
};

export interface AluminumPipeProperties {
  nominalSize: string;
  nominalCm: number;
  outsideDiameterIn: number;
  insideDiameterIn: number;
  outsideDiameterCm: number;
  insideDiameterCm: number;
  wallIn: number;
  wallCm: number;
  areaIn2: number;
  areaCm2: number;
  weightLbPerFt: number;
  weightNPerM: number;
  momentOfInertiaIn4: number;
  momentOfInertiaCm4: number;
  sectionModulusIn3: number;
  sectionModulusCm3: number;
  radiusOfGyrationIn: number;
  radiusOfGyrationCm: number;
}

const pipe = (
  nominalSize: string,
  nominalCm: number,
  od: number,
  id: number,
  odCm: number,
  idCm: number,
  wall: number,
  wallCm: number,
  area: number,
  areaCm2: number,
  wt: number,
  wtN: number,
  i: number,
  iCm: number,
  s: number,
  sCm: number,
  r: number,
  rCm: number,
): AluminumPipeProperties => ({
  nominalSize,
  nominalCm,
  outsideDiameterIn: od,
  insideDiameterIn: id,
  outsideDiameterCm: odCm,
  insideDiameterCm: idCm,
  wallIn: wall,
  wallCm,
  areaIn2: area,
  areaCm2,
  weightLbPerFt: wt,
  weightNPerM: wtN,
  momentOfInertiaIn4: i,
  momentOfInertiaCm4: iCm,
  sectionModulusIn3: s,
  sectionModulusCm3: sCm,
  radiusOfGyrationIn: r,
  radiusOfGyrationCm: rCm,
});

/** Table 4-14: ASA Schedule 40 aluminum pipe conductors, physical properties (no ampacity column). */
export const TABLE_4_14_SCHEDULE_40_AL_PIPE: Sourced<readonly AluminumPipeProperties[]> = {
  value: [
    pipe('1/2', 1.27, 0.84, 0.622, 2.134, 1.58, 0.109, 0.277, 0.25, 1.615, 0.294, 4.29, 0.017, 0.712, 0.041, 0.667, 0.261, 0.664),
    pipe('3/4', 1.91, 1.05, 0.824, 2.667, 2.093, 0.113, 0.287, 0.333, 2.146, 0.391, 5.706, 0.037, 1.54, 0.071, 1.155, 0.334, 0.848),
    pipe('1', 2.54, 1.315, 1.049, 3.34, 2.664, 0.133, 0.338, 0.494, 3.186, 0.581, 8.479, 0.087, 3.634, 0.133, 2.176, 0.421, 1.068),
    pipe('1-1/4', 3.18, 1.66, 1.38, 4.216, 3.505, 0.14, 0.356, 0.669, 4.313, 0.786, 11.47, 0.195, 8.104, 0.235, 3.844, 0.54, 1.371),
    pipe('1-1/2', 3.81, 1.9, 1.61, 4.826, 4.089, 0.145, 0.368, 0.8, 5.158, 0.94, 13.718, 0.31, 12.899, 0.326, 5.345, 0.623, 1.581),
    pipe('2', 5.08, 2.375, 2.067, 6.033, 5.25, 0.154, 0.391, 1.075, 6.932, 1.264, 18.446, 0.666, 27.709, 0.561, 9.187, 0.787, 1.999),
    pipe('2-1/2', 6.35, 2.875, 2.469, 7.303, 6.271, 0.203, 0.516, 1.704, 10.994, 2.004, 29.245, 1.53, 63.683, 1.064, 17.436, 0.947, 2.406),
    pipe('3', 7.62, 3.5, 3.068, 8.89, 7.793, 0.216, 0.549, 2.229, 14.377, 2.621, 38.249, 3.017, 125.577, 1.724, 28.251, 1.164, 2.957),
    pipe('3-1/2', 8.89, 4.0, 3.548, 10.16, 9.012, 0.226, 0.574, 2.68, 17.287, 3.151, 45.983, 4.788, 199.292, 2.394, 39.231, 1.337, 3.396),
    pipe('4', 10.16, 4.5, 4.026, 11.43, 10.226, 0.237, 0.602, 3.174, 20.477, 3.733, 54.476, 7.232, 301.019, 3.214, 52.668, 1.51, 3.835),
    pipe('5', 12.7, 5.563, 5.047, 14.13, 12.819, 0.258, 0.655, 4.3, 27.741, 5.057, 73.798, 15.16, 631.007, 5.451, 89.326, 1.878, 4.77),
    pipe('6', 15.24, 6.625, 6.065, 16.828, 15.405, 0.28, 0.711, 5.581, 36.009, 6.564, 95.79, 28.15, 1171.691, 8.498, 139.257, 2.245, 5.702),
  ],
  cite: {
    page: 172,
    section: '4.11.3.1',
    table: '4-14',
    originalSource: 'Hubbell (Anderson Electrical Products) Technical Data, Table 52',
    note:
      'Wall thickness misprints corrected from the row\'s own OD/ID: 1-1/4 in printed 1.140 in (2.896 cm), stored 0.140 in (0.356 cm); 1-1/2 in printed 1.145 in (2.908 cm), stored 0.145 in (0.368 cm). ' +
      'The table gives no ampacity; the only ampacity in the bulletin is 1890 A for 3 in Sch 40 6063-T6 (§4.11.3.1).',
  },
};

/** The single pipe ampacity value quoted in the bulletin. */
export const PIPE_AMPACITY_IN_BULLETIN: Sourced<{ nominalSize: string; schedule: number; alloy: string; amps: number }> = {
  value: { nominalSize: '3', schedule: 40, alloy: '6063-T6', amps: 1890 },
  cite: { page: 171, section: '4.11.3.1', note: 'Ambient, rise and other assumptions behind this value are not stated.' },
};
