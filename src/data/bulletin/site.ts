/**
 * Site design data from RUS Bulletin 1724E-300: Chapter 6 "Site Design" (pp. 413-425), Appendix C "Sample Substation
 * Security Fence Specification" (pp. 426-430, incl. Table 6-3), §8.4 "Oil Pollution" (pp. 492-494) and
 * Table 11-2 "Soil Corrosiveness vs. Resistivity" (p. 598).
 *
 * Includes the bulletin's worked culvert example (Rational Method + Chezy-Manning) as SITE_DRAINAGE_EXAMPLE.
 * Fence grounding lives in grounding.ts (FIG_9_36_FENCE_GROUNDING, §9.10.10.1).
 */
import type { Citation, Guidance } from './types';

export const SITE_CITES = {
  general: { page: 413, section: '6.1' },
  yardTypes: { page: [413, 414], section: '6.2', figure: '6-1, 6-2, 6-3' },
  preliminary: { page: [414, 415], section: '6.3' },
  drainage: { page: [415, 419], section: '6.4', table: '6-1', figure: '6-4, 6-5' },
  earthwork: { page: [419, 422], section: '6.5', table: '6-2', originalSource: 'ASTM D2487 (Unified Soil Classification)' },
  roads: { page: [422, 423], section: '6.6' },
  erosion: { page: 423, section: '6.7' },
  surfacing: { page: [423, 424], section: '6.8' },
  fence: { page: [424, 430], section: '6.9; Appendix C', table: '6-3', figure: '6-6' },
  oil: { page: [492, 494], section: '8.4', figure: '8-15', originalSource: '40 CFR 110 and 112; ANSI/IEEE Std 980; RUS Bulletin 1724E-302' },
  corrosion: { page: [597, 598], section: '11.3.5', table: '11-2' },
} as const satisfies Record<string, Citation>;

export const SITE_GENERAL_GUIDANCE: readonly Guidance[] = [
  { id: 'site-objective', text: 'Site work should give an easily accessible, dry, maintenance-free area for substation equipment and structures.', cite: { page: 413, section: '6.1' }, tags: ['site'] },
  { id: 'site-visit', text: 'The engineer should inspect the site in person before design and use its natural drainage and topography, coordinated with the electrical layout.', cite: { page: 413, section: '6.1' }, tags: ['site'] },
];

// ---------------------------------------------------------------------------
// Yard types and preliminary data
// ---------------------------------------------------------------------------

export interface YardType {
  id: 'flat' | 'sloped' | 'stepped';
  prevalence: string;
  text: string;
  cite: Citation;
}

export const YARD_TYPES: readonly YardType[] = [
  { id: 'flat', prevalence: 'most prevalent', text: 'Preferred: allows uniform foundation elevations and structure heights; grade the yard nominally flat unless property limits, severe topography or subsurface rock dictate otherwise.', cite: { page: [413, 414], section: '6.2.1', figure: '6-1' } },
  { id: 'sloped', prevalence: 'occasionally required', text: 'A continuously sloping yard may pay off when property restrictions or economics outweigh the benefits of a flat yard.', cite: { page: [413, 414], section: '6.2.2', figure: '6-2' } },
  { id: 'stepped', prevalence: 'seldom required', text: 'Two or more levels, forced by extreme property limits, mountainous terrain or rock that makes excavation uneconomical.', cite: { page: [413, 414], section: '6.2.3', figure: '6-3' } },
];

export const YARD_TYPE_NOTE: Guidance = {
  id: 'yard-extra-design',
  text: 'Sloped and stepped yards need extra design effort and close coordination with the electrical layout, and may need more structures and varying foundation elevations.',
  cite: { page: 414, section: '6.2.3' },
  tags: ['site'],
};

/** §6.3 (pp. 414-415): basic information required for site preparation design. */
export const SITE_PRELIMINARY_DATA = {
  items: [
    'Area maps (aerial photos if available)',
    'Topographic drawing with ground elevations on a 15 m (50 ft) grid',
    'Location and elevation of existing roads, railroads, ditch inverts and culverts',
    'Overhead and underground utilities, especially exact location and depth of pipelines',
    'Property plan (legal description)',
    'Location of the area drainage exits',
    'High-water elevation, if any',
    'Flood zone designation with base flood elevation, if any',
    'Soil borings in the immediate site area',
  ] as const,
  topoGridSpacingM: 15,
  topoGridSpacingFt: 50,
  cite: { page: [414, 415], section: '6.3' } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// Drainage (§6.4)
// ---------------------------------------------------------------------------

export const DRAINAGE_RULES = {
  surfaceSlopePct: [0.5, 0.75] as const,
  rationalMethodMaxAreaAcres: [100, 200] as const,
  designStormRecurrenceYears: [2, 5] as const,
  timeOfConcentrationMin: [15, 20] as const,
  pipeSelfCleaningMinVelocity: { mPerS: 1, ftPerS: 3 },
  unprotectedDitchVelocity: { mPerS: 0.5, ftPerS: [1, 2] as const },
  soddedChannelMaxVelocity: { mPerS: 1.5, ftPerS: 5 },
  cite: { page: [415, 419], section: '6.4.2; 6.4.5' } satisfies Citation,
} as const;

export const DRAINAGE_GUIDANCE: readonly Guidance[] = [
  { id: 'dr-regs', text: 'Check state and local stormwater rules first: many require detention or retention basins and a few require zero discharge from the site.', cite: { page: 415, section: '6.4.1' }, tags: ['site', 'drainage'] },
  { id: 'dr-surface', text: 'All three yard profiles suit surface runoff: grade the surface at 0.5-0.75% so water reaches the yard edge or shallow ditches, then culverts or open channels.', cite: { page: 415, section: '6.4.2' }, tags: ['site', 'drainage', 'design-check'] },
  { id: 'dr-closed', text: 'Closed systems (catch basins and storm sewers) are costly and rarely needed at rural substations.', cite: { page: 415, section: '6.4.3' }, tags: ['site', 'drainage'] },
  { id: 'dr-no-increase', text: 'Coordinate drainage with cable trenches and roads, plan for future additions, and do not discharge more water into an existing outlet than originally reached it; small interceptor ditches prevent slope erosion.', cite: { page: 415, section: '6.4.4' }, tags: ['site', 'drainage', 'design-check'] },
  { id: 'dr-rational', text: 'Size culverts, pipes, ponds and ditches from runoff by the Rational Method (not for drainage areas much over 100-200 acres), using a 2- or 5-year storm and a 15-20 minute time of concentration.', cite: { page: [415, 416], section: '6.4.5', equation: '6-1' }, tags: ['site', 'drainage'] },
  { id: 'dr-velocity', text: 'Check velocities: pipes need at least 1 m/s (3 ft/s) to be self-cleaning; unprotected ditches about 0.5 m/s (1-2 ft/s); sodded channels up to about 1.5 m/s (5 ft/s) before erosion.', cite: { page: 419, section: '6.4.5' }, tags: ['site', 'drainage', 'design-check'] },
  { id: 'dr-ends', text: 'Protect open storm-sewer discharges and both culvert ends against scour with flared end sections and riprap or concrete headwalls.', cite: { page: 419, section: '6.4.5' }, tags: ['site', 'drainage'] },
];

/** Table 6-1 (p. 416): rainfall intensity conversion factors (relative to the 2-year, 30-minute intensity of Figs 6-4/6-5). */
export const TABLE_6_1_RAINFALL = {
  durationFactors: [
    { minutes: 5, factor: 2.22 }, { minutes: 10, factor: 1.71 }, { minutes: 15, factor: 1.44 }, { minutes: 20, factor: 1.25 },
    { minutes: 30, factor: 1.0 }, { minutes: 40, factor: 0.8 }, { minutes: 50, factor: 0.7 }, { minutes: 60, factor: 0.6 },
    { minutes: 90, factor: 0.5 }, { minutes: 120, factor: 0.4 },
  ] as const,
  recurrenceFactors: [
    { years: 2, factor: 1.0 }, { years: 5, factor: 1.3 }, { years: 10, factor: 1.6 }, { years: 25, factor: 1.9 }, { years: 50, factor: 2.2 },
  ] as const,
  cite: {
    page: 416,
    section: '6.4.5',
    table: '6-1',
    note: 'The base value is the 2-year, 30-minute rainfall intensity read from Fig 6-4 (cm/hr) or Fig 6-5 (in/hr), adapted from US Weather Bureau Technical Paper 40 (1961).',
  } satisfies Citation,
} as const;

/**
 * Design rainfall intensity from Table 6-1: i = i(2-yr, 30-min) × duration factor × recurrence factor.
 * Only tabulated durations and recurrence intervals are accepted (no interpolation is given by the bulletin).
 */
export function designRainfallIntensity(i2yr30min: number, durationMin: number, recurrenceYears: number): number {
  const d = TABLE_6_1_RAINFALL.durationFactors.find((r) => r.minutes === durationMin);
  const r = TABLE_6_1_RAINFALL.recurrenceFactors.find((x) => x.years === recurrenceYears);
  if (!d || !r) throw new RangeError('duration or recurrence interval not tabulated in Table 6-1');
  return i2yr30min * d.factor * r.factor;
}

/** Eq 6-1 (p. 416): Rational Method Q = C·i·A (metric: i in m/hr, A in m² → Q in m³/hr; English: in/hr and acres → cfs). */
export function rationalMethodQ(c: number, i: number, area: number): number {
  return c * i * area;
}

/**
 * Eqs 6-2 / 6-3 (p. 418): Chezy-Manning Q = A·(k/n)·R^(2/3)·S^(1/2), k = 1.0 (metric: m², m, m³/s) or 1.486 (English: ft², ft, cfs).
 * For a pipe flowing full, R = D/4.
 */
export function manningQ(area: number, n: number, hydraulicRadius: number, slope: number, units: 'metric' | 'english' = 'metric'): number {
  const k = units === 'metric' ? 1.0 : 1.486;
  return area * (k / n) * Math.pow(hydraulicRadius, 2 / 3) * Math.sqrt(slope);
}

/** Inverse of Eq 6-2/6-3: slope S needed to carry Q. */
export function manningSlopeFor(q: number, area: number, n: number, hydraulicRadius: number, units: 'metric' | 'english' = 'metric'): number {
  const k = units === 'metric' ? 1.0 : 1.486;
  const root = q / (area * (k / n) * Math.pow(hydraulicRadius, 2 / 3));
  return root * root;
}

export const DRAINAGE_EQUATIONS = [
  { id: '6-1', printed: 'Q = CiA', variables: 'A drainage area m² (acres); i average rainfall intensity m/hr (in/hr) for a storm of duration equal to the time of concentration tc; C runoff coefficient; Q m³/hr (cfs) — convert to m³/s for Chezy-Manning', cite: { page: 416, section: '6.4.5', equation: '6-1' } satisfies Citation },
  { id: '6-2', printed: 'Q = AV = A x (1.0/n) x R^(2/3) x S^(1/2)   (metric)', variables: 'Q m³/s; A flow area m²; V m/s; n roughness coefficient; R hydraulic radius m (= area/wetted perimeter = D/4 for a pipe); S hydraulic gradient m/m', cite: { page: 418, section: '6.4.5', equation: '6-2', note: 'Exponents are printed as "R²3 x S¹2" (garbled); they are 2/3 and 1/2, consistent with the worked example.' } satisfies Citation },
  { id: '6-3', printed: 'Q = AV = A x (1.486/n) x R^(2/3) x S^(1/2)   (English)', variables: 'Q cfs; A ft²; V ft/s; R ft; S ft/ft', cite: { page: 418, section: '6.4.5', equation: '6-3' } satisfies Citation },
] as const;

/** §6.4.5.1 (pp. 416-418): culvert design example for a substation in Lansing, Michigan. */
export const SITE_DRAINAGE_EXAMPLE = {
  inputs: { location: 'Lansing, Michigan', drainageAreaM2: 2000, timeOfConcentrationMin: 15, recurrenceYears: 5, runoffCoefficient: 0.5 },
  steps: {
    i2yr30minMPerHr: 0.05, // from Figs 6-4/6-5
    durationFactor: 1.44, // 15 min, Table 6-1
    recurrenceFactor: 1.3, // 5 yr, Table 6-1
    designIntensityMPerHr: 0.094, // 0.05 × 1.44 × 1.3 = 0.0936
    qM3PerHr: 94, // 0.50 × 0.094 × 2000
    qM3PerS: 0.026,
    pipe: { type: 'corrugated metal', diameterM: 0.2, areaM2: 0.032, hydraulicRadiusM: 0.05, manningN: 0.024 },
    requiredSlopeMPerM: 0.021,
    velocityMPerS: 0.81,
    remark: 'Velocity at the minimum slope is not quite self-cleaning (< 1 m/s) but would probably be acceptable.',
  },
  cite: { page: [416, 418], section: '6.4.5.1', table: '6-1', equation: '6-1, 6-2' } satisfies Citation,
} as const;

// ---------------------------------------------------------------------------
// Earthwork (§6.5)
// ---------------------------------------------------------------------------

export const EARTHWORK_RULES = {
  acceptableBorrowSoilsUSCS: ['GW', 'GP', 'GM', 'GC', 'SW', 'SP', 'SM', 'SC'] as const,
  topsoilStripUneconomicDepth: { m: 0.5, in: 18 },
  topsoilMixRatio: 'one or more parts of good (predominantly granular) soil to one part topsoil',
  topsoilMixMaxEmbankment: { m: 1, ft: 3 },
  cutFillSlope: { vertical: 1, horizontal: 4, note: 'if possible' },
  endAreaSectionSpacing: { m: [15, 30] as const, ft: [50, 100] as const },
  endAreaVerticalExaggeration: 10,
  cutUsableAsFillPct: [80, 85] as const,
  compaction: { liftMm: 200, liftIn: 8, pctOfMaxDensity: 95, test: 'AASHTO T180' },
  cite: { page: [419, 422], section: '6.5' } satisfies Citation,
} as const;

export const EARTHWORK_GUIDANCE: readonly Guidance[] = [
  { id: 'ew-first', text: 'Computing earthwork quantities is usually the first step in setting the yard\'s rough grade elevation.', cite: { page: 419, section: '6.5' }, tags: ['site', 'earthwork'] },
  { id: 'ew-clear', text: 'Clear and grub the site, dispose of all vegetation, and strip and stockpile topsoil for later seeding; define topsoil stripping limits as specifically as possible.', cite: { page: 419, section: '6.5' }, tags: ['site', 'earthwork'] },
  { id: 'ew-borrow', text: 'Avoid imported fill (borrow) if possible; when needed it must be clean soil (USCS GW, GP, GM, GC, SW, SP, SM or SC) able to form a stable compacted embankment, ideally from a pit on the property.', cite: { page: 419, section: '6.5.1', table: '6-2' }, tags: ['site', 'earthwork', 'design-check'] },
  { id: 'ew-topsoil', text: 'Stripping all topsoil can be uneconomical when it is 0.5 m (18 in) or deeper or borrow must be hauled far; mixing it with granular subsoil (≥1:1) can serve for embankments up to 1 m (3 ft), but foundations must account for the altered soil.', cite: { page: [419, 421], section: '6.5.2' }, tags: ['site', 'earthwork'] },
  { id: 'ew-balance', text: 'On sloping ground set the yard elevation by balancing cut and fill, assuming only 80-85% of the cut volume is usable as fill; keep cut and fill slopes at 1V:4H if possible.', cite: { page: 421, section: '6.5.3' }, tags: ['site', 'earthwork', 'design-check'] },
  { id: 'ew-compaction', text: 'Compact all fill in 200 mm (8 in) lifts to 95% of AASHTO T180 maximum density, after loosening and compacting the base, to give bearing capacity and avoid settlement that ponds water or breaks ducts and trenches.', cite: { page: 421, section: '6.5.4', originalSource: 'AASHTO T180' }, tags: ['site', 'earthwork', 'design-check'] },
  { id: 'ew-cleanup', text: 'Level surplus excavated earth so it looks neat and does not block drainage, and contour borrow pits smoothly; seed and mulch where needed.', cite: { page: 422, section: '6.5.5' }, tags: ['site', 'earthwork'] },
];

/** Average-end-area earthwork volume for one pair of sections (§6.5.3): ((A1 + A2)/2) × distance. A convenience implementing the described method. */
export function averageEndAreaVolume(area1: number, area2: number, distance: number): number {
  return ((area1 + area2) / 2) * distance;
}

// ---------------------------------------------------------------------------
// Roads (§6.6)
// ---------------------------------------------------------------------------

export const ROAD_RULES = {
  maxGradePct: 7,
  shortGradePct: 10,
  shortGradeLength: { m: [60, 100] as const, ft: [200, 300] as const },
  minInsideRadiusAtMajorRoad: { m: 15, ft: 50, note: 'At 90° intersections with major roads; smaller radii may be adequate below 230 kV.' },
  accessRoadWidth: { m: 6, ft: 20, note: 'Where space allows; crowned at the center.' },
  wearingCourseUpTo69kV: { baseMm: 200, baseIn: 8 },
  wearingCourseLarger: { baseMm: 200, baseIn: 8, surfaceMm: 100, surfaceIn: 4 },
  interiorDriveWidthMax: { m: 5, ft: 16 },
  interiorDriveInsideRadius: { m: 7.5, ft: 25 },
  cite: { page: [422, 423], section: '6.6' } satisfies Citation,
} as const;

export const ROAD_GUIDANCE: readonly Guidance[] = [
  { id: 'rd-heavy', text: 'Access roads must carry heavy equipment in all weather; long roads are designed like secondary county or state roads, and culverts and crossings must take the heavy loads.', cite: { page: 422, section: '6.6.1' }, tags: ['site', 'road'] },
  { id: 'rd-grade', text: 'Keep access road grades to 7% or less so normal movers can haul heavy transformers; 10% is tolerable for 60-100 m (200-300 ft).', cite: { page: 422, section: '6.6.2' }, tags: ['site', 'road', 'design-check'] },
  { id: 'rd-radius', text: 'Use at least a 15 m (50 ft) inside radius where the access road meets a major road at 90°; smaller radii may do below 230 kV.', cite: { page: 422, section: '6.6.3' }, tags: ['site', 'road', 'design-check'] },
  { id: 'rd-section', text: 'Make access roads about 6 m (20 ft) wide and crowned; compact the subgrade like the yard embankment; surface with 200 mm (8 in) of aggregate base up to 69 kV, adding a 100 mm (4 in) surface course for larger stations.', cite: { page: 422, section: '6.6.4' }, tags: ['site', 'road'] },
  { id: 'rd-rail', text: 'A railroad spur may be economical; the railroad usually sets turnout, ballast, tie and rail standards and may install track itself, and the yard compaction requirements suit the spur subgrade.', cite: { page: [422, 423], section: '6.6.5' }, tags: ['site', 'road'] },
  { id: 'rd-yard', text: 'Many yards have no defined drives (the whole yard takes light traffic); defined drives can use the access road surface, about 5 m (16 ft) wide or less with inside radii of 7.5 m (25 ft) or less.', cite: { page: 423, section: '6.6.6' }, tags: ['site', 'road'] },
];

// ---------------------------------------------------------------------------
// Erosion (§6.7)
// ---------------------------------------------------------------------------

export const EROSION_RULES = {
  topsoilThickness: { mm: 100, in: 4 },
  soddingSteeperThan: { vertical: 1, horizontal: 2.5 },
  preferredSlope: { vertical: 1, horizontal: 4 },
  stormwaterPermitDisturbedAcres: 5.0,
  cite: { page: 423, section: '6.7', note: 'The 5.0 acre stormwater discharge permit threshold is from §2.3.1.6 (p. 45).' } satisfies Citation,
} as const;

export const EROSION_GUIDANCE: readonly Guidance[] = [
  { id: 'er-protect', text: 'Protect all cut and fill slopes, ditches and stripped areas outside the fence from wind and water erosion; topsoil about 100 mm (4 in) thick with fertilizer, mulch and seed usually suffices.', cite: { page: 423, section: '6.7.1' }, tags: ['site', 'erosion'] },
  { id: 'er-slopes', text: 'Slopes steeper than 1V:2.5H may need sod; aim for 1V:4H for erosion control and maintenance, and use riprap at ditch corners and intersections.', cite: { page: 423, section: '6.7.1' }, tags: ['site', 'erosion', 'design-check'] },
  { id: 'er-law', text: 'Many states and counties regulate construction-site erosion and sedimentation; compliance drawings can add considerable engineering time.', cite: { page: 423, section: '6.7.2' }, tags: ['site', 'erosion'] },
  { id: 'er-permit', text: 'If more than 5.0 acres will be disturbed during construction, a state stormwater discharge permit is needed before construction starts.', cite: { page: 45, section: '2.3.1.6' }, tags: ['site', 'erosion', 'permit'] },
];

// ---------------------------------------------------------------------------
// Yard surfacing (§6.8)
// ---------------------------------------------------------------------------

export const YARD_SURFACING = {
  thickness: { mm: [100, 150] as const, in: [4, 6] as const },
  extentBeyondFence: { m: 1, ft: 3 },
  stoneSize: { mm: [10, 25] as const, in: ['3/8', '1'] as const },
  maxFinerThan10mmPct: [5, 10] as const,
  heavyDriveOption: { gravelBaseMm: 100, gravelBaseIn: 4, crushedStoneTopMm: 75, crushedStoneTopIn: 3 },
  alternativeMaterials: ['clam shell', 'oyster shell'] as const,
  cite: { page: [423, 424], section: '6.8', note: 'Chapter 9 (§9.10.2 step 7) separately requires at least 10 cm (4 in) of ≥3000 Ω·m rock extending at least 1.0 m (3.3 ft) outside the fence for grounding safety.' } satisfies Citation,
} as const;

export const SURFACING_GUIDANCE: readonly Guidance[] = [
  { id: 'sf-cover', text: 'Cover the whole yard with 100-150 mm (4-6 in) of crushed stone or rock extending 1 m (3 ft) beyond the fence; clam or oyster shell may be used in some areas.', cite: { page: 423, section: '6.8' }, tags: ['site', 'surfacing', 'design-check'] },
  { id: 'sf-benefits', text: 'Surfacing reduces hazardous mesh and touch potentials, suppresses weeds, gives a clean dry walking surface, limits rain erosion and improves light-vehicle access.', cite: { page: [423, 424], section: '6.8' }, tags: ['site', 'surfacing', 'grounding'] },
  { id: 'sf-gradation', text: 'Use 10-25 mm (3/8-1 in) stone with only 5-10% finer than 10 mm, all faces crushed; avoid round river rock, which ruts.', cite: { page: 424, section: '6.8' }, tags: ['site', 'surfacing', 'design-check'] },
  { id: 'sf-drives', text: 'For a stronger drive area, roll 100 mm (4 in) of well-graded gravel base and top it with 75 mm (3 in) of crushed stone.', cite: { page: 424, section: '6.8' }, tags: ['site', 'surfacing'] },
  { id: 'sf-grounding', text: 'Grounding design may call for coarser rock with as few fines as practical, 100-150 mm (4-6 in) thick.', cite: { page: 424, section: '6.8' }, tags: ['site', 'surfacing', 'grounding'] },
  { id: 'sf-install', text: 'Bring the yard to grade and roll it firm (optionally apply soil sterilizer), then spread the stone evenly without rolling, only after substation work is essentially complete.', cite: { page: 424, section: '6.8' }, tags: ['site', 'surfacing', 'construction'] },
];

// ---------------------------------------------------------------------------
// Security fence (§6.9, Appendix C, Table 6-3)
// ---------------------------------------------------------------------------

export interface FencePostSize {
  use: 'line' | 'end/corner/pull' | 'gate';
  type: 'round' | 'square' | 'rolled or formed section';
  metric?: string;
  english?: string;
  rule?: string;
}

/** Table 6-3 (p. 427): fence posts for a 2134 mm (7 ft) fence. */
export const TABLE_6_3_FENCE_POSTS: readonly FencePostSize[] = [
  { use: 'line', type: 'round', metric: '60 mm OD; t = 4 mm', english: '2-3/8 in OD; t = 0.154 in' },
  { use: 'line', type: 'square', metric: '50 mm sq; t = 4.25 mm', english: '2 in sq; t = 0.1875 in' },
  { use: 'line', type: 'rolled or formed section', rule: 'Bending strength about the strong axis not less than that of the round post.' },
  { use: 'end/corner/pull', type: 'round', metric: '73 mm OD; t = 5 mm', english: '2-7/8 in OD; t = 0.203 in' },
  { use: 'end/corner/pull', type: 'square', metric: '63 mm sq; t = 4.75 mm', english: '2-1/2 in sq; t = 0.1875 in' },
  { use: 'end/corner/pull', type: 'rolled or formed section', rule: 'Bending strength about the weak axis not less than that of the round post.' },
  { use: 'gate', type: 'round', metric: '100 mm OD; t = 5.75 mm', english: '4 in OD; t = 0.226 in' },
  { use: 'gate', type: 'square', metric: '76 mm sq; t = 6 mm', english: '3 in sq; t = 0.25 in' },
  { use: 'gate', type: 'rolled or formed section', rule: 'Bending strength about the weak axis not less than that of the round post.' },
];

export const TABLE_6_3_CITE: Citation = {
  page: 427,
  section: 'Appendix C, S.6.2.2',
  table: '6-3',
  originalSource: 'ASTM A53 Grade B (round), ASTM A500 Grade B or A501 (square), ASTM A36 yield (roll-formed); framework strength and coatings per ASTM F1043',
};

/** Appendix C (pp. 426-430): sample chain-link security fence specification, key numbers. */
export const SECURITY_FENCE_SPEC = {
  overallMinHeight: { mm: 2134, ft: 7, note: 'Woven steel fabric on steel posts plus barbed wire on extension arms. NESC C2-1997 allows a 7 ft woven fabric barrier.' },
  rusRecommendedHeight: { ft: 8, fabricFt: 7, barbedWireExtensionFt: 1 },
  fabric: { minHeightMm: 1830, minHeightFt: 6, rusRecommendedFt: 7, wireGauge: 'No. 9 USWG minimum', meshMm: 51, meshIn: 2, minBreakingStrengthN: 5338, minBreakingStrengthLb: 1200, meshAngleDeg: 45, galvanizing: 'ASTM A392 Class 2' },
  linePostMaxSpacing: { mm: 3048, ft: 10, note: 'Measured parallel to the ground.' },
  postEmbedment: { mm: 914, ft: 3, note: 'Into the concrete footing; posts also extend 305 mm (1 ft) extra or accommodate extension arms.' },
  topRail: { minOdMm: 41, minOdIn: '1-5/8', minWallMm: 4, minWallIn: 0.138, minLengthM: 5, minLengthFt: 16, galvanizing: 'ASTM A53' },
  barbedWire: { strandsPerWire: 2, wireGauge: '12-1/2 USWG', barbs: '4-point', maxBarbSpacingMm: 127, maxBarbSpacingIn: 5, galvanizing: 'ASTM A121 Class 3 (after weaving)' },
  extensionArms: { angleDeg: 45, linesOfBarbedWire: 3, topWireAboveFabricMm: 305, topWireAboveFabricFt: 1, minPullDownN: 1112, minPullDownLb: 250, material: 'pressed steel or malleable iron', galvanizing: 'ASTM A153 Class B1' },
  stretcherBar: { minMm: '6 x 19', minIn: '1/4 x 3/4', lengthVsFabric: 'about 25 mm (1 in) less than fabric height', perGateOrEndPost: 1, perCornerOrPullPost: 2 },
  postBraces: { at: 'each gate, corner, pull and end post', strut: 'not smaller than the top rail, attached to the adjacent line post at about mid-height', tensionRodMinDiaMm: 10, tensionRodMinDiaIn: '3/8', galvanizing: 'ASTM A153 (hot-dip)' },
  tensionWire: { minGauge: 'No. 7 USWG galvanized', role: 'in lieu of bottom rail' },
  gateFrames: { construction: 'welded tubular steel, no visible sag or twist', clearanceAboveRoadMm: 76, clearanceAboveRoadIn: 3, minMember: 'structural equivalent of 48 mm (1.9 in) OD standard pipe', barbedWireLines: 3, galvanizing: 'hot-dip' },
  hardware: { hingeSwingDeg: 180, latch: 'heavy-duty drop bar engaging a center stop cast in concrete', keeper: 'holds the free end of the gate open', padlock: true, operableFromEitherSide: true },
  erection: {
    fabricSide: 'outside of the posts',
    tieSpacingLinePostsMm: 356, tieSpacingLinePostsIn: 14,
    tieSpacingTopBottomMm: 610, tieSpacingTopBottomIn: 24,
    stretcherBandSpacingMm: 356, stretcherBandSpacingIn: 14,
    holeMinDiaLinePostMm: 229, holeMinDiaLinePostIn: 9,
    holeMinDiaTerminalPostMm: 305, holeMinDiaTerminalPostIn: 12,
    holeMinDepthMm: 965, holeMinDepthIn: 38,
    concrete: { strengthNPerCm2: 1720, strengthPsi: 2500, at28Days: true, maxAggregateMm: 25, maxAggregateIn: 1, note: 'UNCERTAIN: printed as a "maximum" compressive strength; a minimum is presumably intended.' },
  },
  grounding: 'Per the grounding requirements (see grounding.ts, §9.10.10.1 and Fig 9-36).',
  cite: { page: [426, 430], section: 'Appendix C (S.6.1-S.6.4)', table: '6-3', figure: '6-6', note: 'A sample specification: cooperatives should check local standards and supplier availability. Other rail, post and gate designs may serve equally well (§6.9).' } satisfies Citation,
} as const;

export const FENCE_GUIDANCE: readonly Guidance[] = [
  { id: 'fn-enclose', text: 'Enclose all outdoor substations with a security fence; safety clearances from the fence to live parts are covered in Chapter 4.', cite: { page: 424, section: '6.9' }, tags: ['site', 'fence'] },
  { id: 'fn-timing', text: 'Install the fence as soon as practical after site work, usually by a fence contractor outside the general contract.', cite: { page: 424, section: '6.9' }, tags: ['site', 'fence', 'construction'] },
  { id: 'fn-height', text: 'Minimum fence height is 7 ft (2134 mm) including barbed wire; RUS recommends 8 ft: 7 ft of fabric plus a 1 ft barbed-wire extension angled outward at 45°.', cite: { page: [426, 428], section: 'Appendix C S.6.1, S.6.2.5', figure: '9-36' }, tags: ['site', 'fence', 'design-check'] },
  { id: 'fn-posts', text: 'Line posts no more than 3 m (10 ft) apart, set 914 mm (3 ft) into concrete footings at least 965 mm (38 in) deep; review footing depth for deep frost or shallow rock.', cite: { page: [426, 429], section: 'Appendix C' }, tags: ['site', 'fence', 'design-check'] },
  { id: 'fn-gates', text: 'Gates swing 180°, clear the road by about 76 mm (3 in), lock with a padlock, and should swing inward (an outward swing needs ground grid 0.91 m beyond the swing).', cite: { page: [428, 429], section: 'Appendix C S.6.2.9-S.6.2.10; §9.10.10.1 (p. 558)' }, tags: ['site', 'fence', 'gate', 'grounding'] },
];

// ---------------------------------------------------------------------------
// Oil containment (§8.4)
// ---------------------------------------------------------------------------

export const OIL_CONTAINMENT_THRESHOLDS = {
  undergroundStorageGal: 42000,
  abovegroundStorageGal: 1320,
  singleContainerGal: 660,
  cite: {
    page: 492,
    section: '8.4',
    originalSource: '40 CFR Chapter 1, Parts 110 and 112',
    note: 'Containment is required above these quantities; an SPCC plan is required when such a facility could reasonably be expected to discharge oil into or upon navigable waters. Regulations change; check the current CFR.',
  } satisfies Citation,
} as const;

/** True when 40 CFR 112 containment applies per §8.4 (strictly greater than the thresholds). */
export function oilContainmentRequired(q: { undergroundGal?: number; abovegroundGal?: number; largestContainerGal?: number }): boolean {
  const t = OIL_CONTAINMENT_THRESHOLDS;
  return (q.undergroundGal ?? 0) > t.undergroundStorageGal || (q.abovegroundGal ?? 0) > t.abovegroundStorageGal || (q.largestContainerGal ?? 0) > t.singleContainerGal;
}

export interface OilContainmentOption {
  id: string;
  name: string;
  description: string;
  numbers?: Readonly<Record<string, number | readonly [number, number]>>;
  pros: readonly string[];
  cons: readonly string[];
  cite: Citation;
}

export const OIL_CONTAINMENT_OPTIONS: readonly OilContainmentOption[] = [
  {
    id: 'basic-retention', name: 'Basic retention system',
    description: 'Impervious lined, open or stone-filled sump around the transformer; perforated pipe drains water and oil by gravity to an underground storage tank whose sump pump (float or pressure switch) removes rainwater. A transformer low-oil-level alarm shuts the pump off. Oil is removed by pump truck.',
    numbers: { sumpStoneCm: [5, 9], sumpStoneIn: [2, 3.5], stoneVoidsPct: [25, 40], minWaterAtCutoffIn: 6 },
    pros: ['Reasonably reliable', 'Stone allows easy access around the transformer'],
    cons: ['Costly', 'Sump pump mechanical failure'],
    cite: { page: 493, section: '8.4.1', note: 'The tank must hold all the oil of one transformer between the cutoff water level and the inlet pipe; keeping water over the tank bottom lets small leaks float on it. A variant uses an oil-sensing control that stops a submersible pump in a separate vault when oil is detected.' },
  },
  {
    id: 'oil-separator-tank', name: 'Oil separator tank',
    description: 'Water and oil from the transformer area flow to a separator tank where oil floats and is retained while water discharges continuously; retained oil is pumped to a tank truck. Needs enough gradient for gravity discharge.',
    pros: ['Quite reliable', 'Continuous water pass-through'],
    cons: ['Costly', 'Feasible only with gravity discharge gradient'],
    cite: { page: [493, 494], section: '8.4.2', figure: '8-15', note: 'Tank sized to contain all the oil in one transformer in case of major rupture.' },
  },
  {
    id: 'above-grade-separator', name: 'Above-grade diked separator basin',
    description: 'The separator principle applied to an above-grade diked basin where freezing is not prevalent.',
    pros: ['No underground tank'],
    cons: ['Not suited to freezing climates'],
    cite: { page: 493, section: '8.4.2' },
  },
  {
    id: 'diked-valve', name: 'Lined, diked area with drain valve',
    description: 'Transformer area lined and diked with impervious material; a short 4-inch pipe with a shutoff valve through the dike is left open for drainage and closed on alarm or inspection, or kept closed and opened to drain water at periodic inspections.',
    numbers: { drainPipeIn: 4 },
    pros: ['Relatively economical'],
    cons: ['Needs regular inspection and more maintenance'],
    cite: { page: [493, 494], section: '8.4.2' },
  },
];

export const OIL_GUIDANCE: readonly Guidance[] = [
  { id: 'oil-goal', text: 'The goal of every oil abatement system is to keep all substation oil on site, away from ground water and navigable waters.', cite: { page: [492, 494], section: '8.4; 8.4.3' }, tags: ['site', 'oil', 'environment'] },
  { id: 'oil-choose', text: 'Decide the reliability wanted and whether the system will be self-operating or periodically/seasonally monitored, then weigh each option\'s problems against its cost at each substation.', cite: { page: [492, 494], section: '8.4; 8.4.3' }, tags: ['site', 'oil'] },
  { id: 'oil-spcc', text: 'Federal rules prohibit harmful oil discharges to navigable waters rather than requiring absolute containment; an SPCC plan is required where thresholds are exceeded and a discharge could reach navigable waters.', cite: { page: [45, 492], section: '2.3.1.6; 8.4', originalSource: '40 CFR 110, 112' }, tags: ['site', 'oil', 'permit'] },
];

/**
 * Stone-filled sump volume needed to hold an oil volume given a void fraction (§8.4.1 gives 25-40% voids for 5-9 cm stone).
 * Simple derived arithmetic (volume = oil / voids); the bulletin states the void range but not this formula.
 */
export function stoneSumpVolumeFor(oilVolume: number, voidFraction = 0.25): number {
  if (!(voidFraction > 0 && voidFraction <= 1)) throw new RangeError('voidFraction must be in (0, 1]');
  return oilVolume / voidFraction;
}

// ---------------------------------------------------------------------------
// Soil corrosiveness (Table 11-2)
// ---------------------------------------------------------------------------

export interface SoilCorrosivenessRow {
  class: string;
  /** Resistivity range, Ω·m (max null = open-ended). */
  minOhmM: number;
  maxOhmM: number | null;
}

/** Table 11-2 (p. 598): soil corrosiveness vs. resistivity. */
export const TABLE_11_2_SOIL_CORROSIVENESS: readonly SoilCorrosivenessRow[] = [
  { class: 'Severely Corrosive', minOhmM: 0, maxOhmM: 5 },
  { class: 'Very Corrosive', minOhmM: 5, maxOhmM: 10 },
  { class: 'Corrosive', minOhmM: 10, maxOhmM: 30 },
  { class: 'Moderately Corrosive', minOhmM: 30, maxOhmM: 100 },
  { class: 'Slightly Corrosive', minOhmM: 100, maxOhmM: 250 },
  { class: 'Less Corrosive', minOhmM: 250, maxOhmM: null },
];

export const TABLE_11_2_CITE: Citation = { page: 598, section: '11.3.5', table: '11-2' };

/** Table 11-2 class for a resistivity (Ω·m); boundary values go to the less corrosive class. */
export function soilCorrosiveness(resistivityOhmM: number): string {
  const row = TABLE_11_2_SOIL_CORROSIVENESS.find((r) => resistivityOhmM >= r.minOhmM && (r.maxOhmM === null || resistivityOhmM < r.maxOhmM));
  return row ? row.class : TABLE_11_2_SOIL_CORROSIVENESS[0].class;
}

export const CORROSION_SOIL_GUIDANCE: readonly Guidance[] = [
  { id: 'cor-low-rho', text: 'Soils below about 15-20 Ω·m are regarded as relatively corrosive to steel and copper.', cite: { page: 597, section: '11.3.5' }, tags: ['site', 'corrosion', 'grounding'] },
  { id: 'cor-high-rho', text: 'High-resistivity, well-aerated soils such as sand and gravel may also corrode copper, and places where resistivity changes abruptly (e.g. salty roadside ditches) are probable corrosion spots.', cite: { page: 598, section: '11.3.5' }, tags: ['site', 'corrosion'] },
  { id: 'cor-copper-cp', text: 'If cathodic protection of copper is needed, a design potential of -0.35 V to a copper-copper sulfate half-cell is suggested.', cite: { page: 597, section: '11.3.5' }, tags: ['corrosion'] },
  { id: 'cor-feeders', text: 'Underground exit feeders with bare concentric neutrals may corrode and should get cathodic protection if corrosion is believed possible.', cite: { page: 597, section: '11.3.5' }, tags: ['corrosion', 'cable'] },
];
