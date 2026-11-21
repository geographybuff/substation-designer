/**
 * General design considerations from RUS Bulletin 1724E-300 Chapter 2 (pp. 41-53): initial vs
 * ultimate requirements, site selection factors, environmental items (appearance, public safety,
 * noise with Table 2-1, corona, effluent), weather (Fig. 2-1 basic wind speed), altitude
 * (Table 2-2), earthquakes (Fig. 2-2 zones, with zone factors and the zone-based rule from
 * §7.4.7 / Table 7-1, p. 437), wildlife and contamination, and the interfacing, reliability,
 * operating, safety and maintenance considerations of §2.4-2.8.
 * Guidance text is paraphrased.
 */
import type { Guidance, Sourced } from './types';

// ---------------------------------------------------------------------------
// §2.1 Initial and ultimate requirements
// ---------------------------------------------------------------------------

export const PLANNING_GUIDANCE: readonly Guidance[] = [
  {
    id: 'env-long-range-plan',
    text: 'Plan for both the initial need and the ultimate size of the substation; the long-range plan should set requirements years ahead.',
    cite: { page: 41, section: '2.1' },
    tags: ['planning', 'expansion'],
  },
  {
    id: 'env-ultimate-in-initial',
    text: 'Consider ultimate requirements during the initial design and compare costs to decide what provisions to build in now to make later additions easy.',
    cite: { page: 41, section: '2.1' },
    tags: ['planning', 'expansion', 'cost'],
  },
  {
    id: 'env-outage-for-additions',
    text: 'A major factor in planning future construction is the outage needed to add equipment, weighed against the utility\'s ability to serve load during that outage.',
    cite: { page: 41, section: '2.1' },
    tags: ['planning', 'expansion', 'reliability'],
  },
  {
    id: 'env-standard-designs',
    text: 'Changes to standard design philosophies should be reviewed by the people who design, operate and maintain the equipment; departures from standard designs can jeopardize operation.',
    cite: { page: 41, section: '2.1' },
    tags: ['planning', 'operations'],
  },
  {
    id: 'env-design-summary',
    text: 'Record the basic design data on the Substation Design Summary form (Appendix B to Chapter 3).',
    cite: { page: 41, section: '2.1' },
    tags: ['planning', 'documents'],
  },
];

// ---------------------------------------------------------------------------
// §2.2 Site considerations
// ---------------------------------------------------------------------------

export interface SiteFactor {
  /** Letter as listed in §2.2. */
  item: string;
  text: string;
  tags: readonly string[];
}

/** §2.2: factors to evaluate when selecting a substation site (paraphrased list a-x). */
export const SITE_SELECTION_FACTORS: Sourced<readonly SiteFactor[]> = {
  value: [
    { item: 'a', text: 'Location of present and future load center', tags: ['load'] },
    { item: 'b', text: 'Location of existing and future power sources', tags: ['source'] },
    { item: 'c', text: 'Right-of-way and line access for overhead or underground transmission and distribution circuits', tags: ['lines', 'access'] },
    { item: 'd', text: 'Alternative land uses', tags: ['land'] },
    { item: 'e', text: 'Location of existing distribution lines', tags: ['lines'] },
    { item: 'f', text: 'All-weather road and rail access for heavy equipment, and site access roads', tags: ['access'] },
    { item: 'g', text: 'Objections to appearance, noise or electrical effects', tags: ['appearance', 'noise'] },
    { item: 'h', text: 'Site maintenance needs (repairs, watering, mowing, landscaping, storage, painting)', tags: ['maintenance'] },
    { item: 'i', text: 'Present and future impact on other private or public facilities', tags: ['community'] },
    { item: 'j', text: 'Soil resistivity', tags: ['grounding', 'soil'] },
    { item: 'k', text: 'Drainage and soil conditions', tags: ['drainage', 'soil'] },
    { item: 'l', text: 'Cost of earth removal, earth addition and earthmoving', tags: ['cost', 'grading'] },
    { item: 'm', text: 'Atmospheric conditions such as salt and industrial contamination', tags: ['contamination'] },
    { item: 'n', text: 'Cost of cleaning up contaminated soil or buried materials', tags: ['cost', 'contamination'] },
    { item: 'o', text: 'Space for future as well as present use', tags: ['expansion'] },
    { item: 'p', text: 'Land title limits, zoning and ordinances', tags: ['legal'] },
    { item: 'q', text: 'Topography; avoid earthquake faults, floodplains, wetlands and prime or unique farmland where possible', tags: ['topography', 'seismic', 'flood'] },
    { item: 'r', text: 'Public safety', tags: ['safety'] },
    { item: 's', text: 'Public concern; avoid schools, daycare centers and playgrounds', tags: ['community', 'safety'] },
    { item: 't', text: 'Security against theft, vandalism, damage, sabotage and weather', tags: ['security'] },
    { item: 'u', text: 'Total cost including transmission and distribution lines and environmental factors', tags: ['cost'] },
    { item: 'v', text: 'Threatened and endangered species and their critical habitat', tags: ['environment'] },
    { item: 'w', text: 'Cultural resources', tags: ['environment'] },
    { item: 'x', text: 'Possible adverse effects on nearby communications facilities', tags: ['communications'] },
  ],
  cite: { page: [41, 42], section: '2.2' },
};

export const SITE_GUIDANCE: readonly Guidance[] = [
  {
    id: 'env-site-critical',
    text: 'Location and siting are among the most critical design factors; poor choices can mean too many substations and excess line investment.',
    cite: { page: 41, section: '2.2' },
    tags: ['site'],
  },
  {
    id: 'env-site-prior-use',
    text: 'Investigate a site before buying it: a former dump with buried material or toxic waste can be very costly to clean up before grading and foundations.',
    cite: { page: 41, section: '2.2' },
    tags: ['site', 'cost', 'contamination'],
  },
  {
    id: 'env-site-gpr-communications',
    text: 'Choose a location that keeps all communications facilities outside the substation\'s 300 V peak ground-potential-rise zone of influence.',
    cite: { page: 42, section: '2.2', originalSource: 'ANSI/IEEE Std. 367-1987; ANSI/IEEE Std. 487-1992' },
    tags: ['site', 'grounding', 'communications', 'design-check'],
  },
];

// ---------------------------------------------------------------------------
// §2.3.1 Environmental: regulation, appearance, public safety, noise, corona, effluent
// ---------------------------------------------------------------------------

/** New physical disturbance above which an Environmental Assessment (EA) rather than an Environmental Report (ER) is generally needed. */
export const ENVIRONMENTAL_ASSESSMENT_THRESHOLD: Sourced<{ hectares: number; acres: number }> = {
  value: { hectares: 2, acres: 5 },
  cite: { page: 42, section: '2.3.1.1', originalSource: '7 CFR 1794; RUS Bulletins 1794A-600 and 1794-601', note: 'Stated as a general rule.' },
};

/** Disturbed area during construction above which a state stormwater discharge permit is required. */
export const STORMWATER_PERMIT_THRESHOLD_ACRES: Sourced<number> = {
  value: 5.0,
  cite: { page: 45, section: '2.3.1.6' },
};

/** RUS-recommended fence: 8 ft total = 7 ft fabric + 1 ft barbed-wire extension. */
export const RUS_FENCE_RECOMMENDATION: Sourced<{ totalFt: number; fabricFt: number; barbedWireExtensionFt: number; totalM: number; fabricM: number }> = {
  value: { totalFt: 8, fabricFt: 7, barbedWireExtensionFt: 1, totalM: 2.44, fabricM: 2.134 },
  cite: {
    page: 43,
    section: '2.3.1.3',
    originalSource: 'National Electrical Safety Code; IEEE Std. 1119',
    note: 'Chapter 2 gives feet only; metric values are the bulletin\'s own equivalents used elsewhere (2.44 m for 8 ft on p. 287; 2134 mm for 7 ft in Table 6-3 title, p. 427). Fence grounding: Chapter 9; materials: §6.9.',
  },
};

export const PUBLIC_SAFETY_GUIDANCE: readonly Guidance[] = [
  {
    id: 'env-fence-primary',
    text: 'A suitable barrier, such as a grounded metal fence meeting the NESC and IEEE 1119 (or stricter local rules), is the main means of keeping the public safe.',
    cite: { page: 43, section: '2.3.1.3' },
    tags: ['fence', 'safety', 'design-check'],
  },
  {
    id: 'env-fence-peripheral-ground',
    text: 'Further protection comes from sound design inside the fence and a peripheral ground conductor outside it (see Chapter 9).',
    cite: { page: 43, section: '2.3.1.3' },
    tags: ['fence', 'grounding', 'safety'],
  },
  {
    id: 'env-signs',
    text: 'Post warning signs on the perimeter fence - at least one per side even on the smallest station; consider bilingual or "No Trespassing" signs where useful (ANSI Z535.2).',
    cite: { page: 43, section: '2.3.1.3' },
    tags: ['fence', 'signs', 'safety', 'design-check'],
  },
  {
    id: 'env-lighting',
    text: 'Yard lighting deters vandalism and helps night work; being able to switch part of it off at night can make the station more acceptable to neighbors.',
    cite: { page: 43, section: '2.3.1.2' },
    tags: ['lighting', 'appearance', 'security'],
  },
];

export const APPEARANCE_GUIDANCE: readonly Guidance[] = [
  {
    id: 'env-appearance-trend',
    text: 'The trend is to site substations so they are not strikingly visible; a station set back from a busy road may need little architectural treatment.',
    cite: { page: 42, section: '2.3.1.2' },
    tags: ['appearance', 'site'],
  },
  {
    id: 'env-appearance-profile',
    text: 'A lower silhouette (solid-shape structures, low-profile equipment, underground exits) improves appearance but may need a larger site.',
    cite: { page: [42, 43], section: '2.3.1.2' },
    tags: ['appearance', 'profile', 'layout'],
  },
  {
    id: 'env-appearance-screening',
    text: 'Landscaping, walls or natural screening can blend a station into its surroundings; complementary colors generally work better than contrasting ones.',
    cite: { page: 43, section: '2.3.1.2' },
    tags: ['appearance'],
  },
];

export interface NoiseZoneRow {
  zone: 'A' | 'B' | 'C-1' | 'C-2' | 'D-1' | 'D-2' | 'D-3';
  exposureClass: 'Minimal' | 'Moderate' | 'Significant' | 'Severe';
  /** DNL (day-night average sound level) band, dB: above `dnlAbove` (exclusive) up to `dnlMax` (inclusive); null = open-ended. */
  dnlAbove: number | null;
  dnlMax: number | null;
  /** Leq (hour) band, dB (same bounds as DNL in this table). */
  leqAbove: number | null;
  leqMax: number | null;
  /** NEF (noise exposure forecast) band. */
  nefAbove: number | null;
  nefMax: number | null;
  hudStandard: 'Acceptable' | 'Normally Unacceptable' | 'Unacceptable' | null;
}

/** Table 2-1: noise-zone classification for land-use planning. */
export const TABLE_2_1_NOISE_ZONES: Sourced<readonly NoiseZoneRow[]> = {
  value: [
    { zone: 'A', exposureClass: 'Minimal', dnlAbove: null, dnlMax: 55, leqAbove: null, leqMax: 55, nefAbove: null, nefMax: 20, hudStandard: 'Acceptable' },
    { zone: 'B', exposureClass: 'Moderate', dnlAbove: 55, dnlMax: 65, leqAbove: 55, leqMax: 65, nefAbove: 25, nefMax: 30, hudStandard: 'Acceptable' },
    { zone: 'C-1', exposureClass: 'Significant', dnlAbove: 65, dnlMax: 70, leqAbove: 65, leqMax: 70, nefAbove: 30, nefMax: 35, hudStandard: 'Normally Unacceptable' },
    { zone: 'C-2', exposureClass: 'Significant', dnlAbove: 70, dnlMax: 75, leqAbove: 70, leqMax: 75, nefAbove: 35, nefMax: 40, hudStandard: 'Normally Unacceptable' },
    { zone: 'D-1', exposureClass: 'Severe', dnlAbove: 75, dnlMax: 80, leqAbove: 75, leqMax: 80, nefAbove: null, nefMax: 45, hudStandard: null },
    { zone: 'D-2', exposureClass: 'Severe', dnlAbove: 80, dnlMax: 85, leqAbove: 80, leqMax: 85, nefAbove: 45, nefMax: 50, hudStandard: 'Unacceptable' },
    { zone: 'D-3', exposureClass: 'Severe', dnlAbove: 85, dnlMax: null, leqAbove: 85, leqMax: null, nefAbove: 50, nefMax: null, hudStandard: 'Unacceptable' },
  ],
  cite: {
    page: 44,
    section: '2.3.1.4',
    table: '2-1',
    originalSource: 'Federal Interagency Committee on Urban Noise, 1980, p. 5',
    note:
      'HUD, DOT and EPA recognize Ldn = 55 dB as a goal (not a regulation) for outdoor residential areas. As printed, zone B NEF starts "above 25" while zone A stops at 20; ' +
      'zone D-1 has no HUD entry and its NEF is "not exceeding 45". The "Unacceptable" HUD cell spans D-2 and D-3.',
  },
};

/** Noise zone for a DNL value (dB), per Table 2-1. */
export function noiseZoneForDnl(dnlDb: number): NoiseZoneRow {
  const rows = TABLE_2_1_NOISE_ZONES.value;
  return rows.find((r) => r.dnlMax === null || dnlDb <= r.dnlMax) ?? rows[rows.length - 1];
}

/** Substation noise is generally not a problem if, combined with ambient, it is less than this many dBA above ambient. */
export const NOISE_ABOVE_AMBIENT_RULE_DBA: Sourced<number> = {
  value: 5,
  cite: {
    page: 45,
    section: '2.3.1.4.3',
    note: 'Measure ambient during the quietest period, roughly midnight to 4 a.m. Formulas for noise vs distance are in IEEE Std. 1127 (not reproduced).',
  },
};

export const NOISE_GUIDANCE: readonly Guidance[] = [
  {
    id: 'env-noise-sources',
    text: 'Transformers have the greatest potential for objectionable noise; regulators, breakers and other intermittent sources also contribute.',
    cite: { page: 43, section: '2.3.1.4' },
    tags: ['noise', 'transformer'],
  },
  {
    id: 'env-noise-corona',
    text: 'Corona hiss is seldom serious at 230 kV and below if electrical-effects guidelines are followed; 345 kV designs normally need EHV fittings or corona shields.',
    cite: { page: 43, section: '2.3.1.4' },
    tags: ['noise', 'corona'],
  },
  {
    id: 'env-noise-site',
    text: 'Near homes, pick the site farthest from residences and avoid direct line of sight; earth mounds or shrubbery soften the psychological impact.',
    cite: { page: [44, 45], section: '2.3.1.4.1' },
    tags: ['noise', 'site'],
  },
  {
    id: 'env-noise-layout',
    text: 'Place transformers as far from the fence as possible, leave room for a sound barrier if noise may be a problem, and remember future transformers add noise.',
    cite: { page: 45, section: '2.3.1.4.2' },
    tags: ['noise', 'layout', 'transformer', 'design-check'],
  },
];

/** Minimum conductor sizes from a corona standpoint for connections to VTs, coupling capacitors, etc. (§2.3.1.5). */
export const CORONA_MIN_CONDUCTOR: Sourced<readonly { systemKV: number; minSize: string }[]> = {
  value: [
    { systemKV: 138, minSize: '1/0' },
    { systemKV: 161, minSize: '1/0' },
    { systemKV: 230, minSize: '3/0' },
    { systemKV: 345, minSize: 'bundled conductors for equipment jumpers' },
  ],
  cite: {
    page: 45,
    section: '2.3.1.5',
    note: 'Fittings and parts other than conductors do not produce serious corona at 230 kV and below; at 345 kV use corona shields and corona-free connectors.',
  },
};

export const EFFLUENT_GUIDANCE: readonly Guidance[] = [
  {
    id: 'env-oil-spill',
    text: 'Federal rules (40 CFR 110/112) forbid harmful quantities of oil reaching navigable waters; a Spill Prevention Control and Countermeasures (SPCC) plan is required, though total containment is not.',
    cite: { page: 45, section: '2.3.1.6', originalSource: '40 CFR 110, 112; IEEE Std. 980; RUS Bulletin 1724E-302' },
    tags: ['oil', 'environment', 'transformer'],
  },
  {
    id: 'env-pcb',
    text: 'PCB insulating liquids are no longer used in transformers and capacitors because they resist biodegradation.',
    cite: { page: 46, section: '2.3.1.6' },
    tags: ['oil', 'environment'],
  },
];

// ---------------------------------------------------------------------------
// §2.3.2 Weather
// ---------------------------------------------------------------------------

export interface WindContour {
  mph: number;
  ms: number;
  /** Where the contour appears on Fig. 2-1 (description of the map, not bulletin text). */
  where: string;
}

/** Fig. 2-1 (ANSI/ASCE 7-95 Fig. 6-1): basic wind speed contours, 3-second gust at 10 m (33 ft), Exposure C, annual probability 0.02. */
export const FIG_2_1_BASIC_WIND_SPEED: Sourced<{
  contours: readonly WindContour[];
  islands: readonly { location: string; mph: number; ms: number }[];
  notes: readonly string[];
}> = {
  value: {
    contours: [
      { mph: 85, ms: 38, where: 'Pacific Coast states region (west of the heavy boundary line)' },
      { mph: 90, ms: 40, where: 'Most of the interior and northern United States; interior Alaska' },
      { mph: 100, ms: 45, where: 'Gulf and Atlantic coastal bands; Alaska coast' },
      { mph: 110, ms: 49, where: 'Gulf and Atlantic coastal bands; Alaska coast' },
      { mph: 120, ms: 54, where: 'Gulf and Atlantic coastal bands; Alaska coast' },
      { mph: 130, ms: 58, where: 'Gulf and Atlantic coasts (e.g. New England/Mid-Atlantic shore); western Alaska and Aleutians' },
      { mph: 140, ms: 63, where: 'Texas/Gulf coast, Carolinas, Florida' },
      { mph: 150, ms: 67, where: 'South Florida and the central Gulf coast' },
    ],
    islands: [
      { location: 'Hawaii', mph: 105, ms: 47 },
      { location: 'Puerto Rico', mph: 125, ms: 56 },
      { location: 'Guam', mph: 170, ms: 76 },
      { location: 'Virgin Islands', mph: 125, ms: 56 },
      { location: 'American Samoa', mph: 125, ms: 56 },
    ],
    notes: [
      'Values are 3-second gust speeds at 33 ft (10 m) above ground for Exposure C, annual probability 0.02.',
      'Linear interpolation between contours is permitted.',
      'Islands and coastal areas use the coastal contour.',
      'Mountainous terrain, gorges, ocean promontories and special wind regions (hatched) need examination for unusual winds.',
    ],
  },
  cite: {
    page: [46, 49],
    section: '2.3.2.3',
    figure: '2-1',
    originalSource: 'ANSI/ASCE Std. 7-95, Figure 6-1',
    note:
      'The bulletin says substations should resist at least these wind speeds; local conditions may require more. Contour locations are read from the map image and summarized - use the actual map for a specific site.',
  },
};

export const WEATHER_GUIDANCE: readonly Guidance[] = [
  {
    id: 'env-weather-reliability',
    text: 'As dependence on electricity grows, substations must run more reliably through weather extremes than in the past.',
    cite: { page: 46, section: '2.3.2.1' },
    tags: ['weather', 'reliability'],
  },
  {
    id: 'env-temperature',
    text: 'Design for the extreme temperatures expected at the site; they can affect breakers, relays and bus.',
    cite: { page: 46, section: '2.3.2.2' },
    tags: ['weather', 'temperature'],
  },
  {
    id: 'env-wind',
    text: 'As a minimum, a substation should withstand the Fig. 2-1 basic wind speed for its location; local conditions may call for more.',
    cite: { page: 46, section: '2.3.2.3', figure: '2-1' },
    tags: ['weather', 'wind', 'structure', 'design-check'],
  },
  {
    id: 'env-ice',
    text: 'A substation must keep operating and stay undamaged under ice; use local ice history to decide whether to exceed the loadings in equipment standards.',
    cite: { page: 46, section: '2.3.2.4' },
    tags: ['weather', 'ice', 'structure'],
  },
  {
    id: 'env-rain',
    text: 'Drainage should leave little standing water within a few hours of a heavy rain (see Chapter 6).',
    cite: { page: 46, section: '2.3.2.5' },
    tags: ['weather', 'drainage'],
  },
  {
    id: 'env-snow',
    text: 'Snow drifting and accumulation are highly variable; keep clearances with snow present and seek local data.',
    cite: { page: 46, section: '2.3.2.6' },
    tags: ['weather', 'snow', 'clearance'],
  },
  {
    id: 'env-lightning',
    text: 'Lightning protection combines surge arresters (little help against direct strokes) with shielding by overhead wires or masts; together they reduce the chance of damage.',
    cite: { page: 46, section: '2.3.2.7' },
    tags: ['weather', 'lightning', 'arrester', 'shielding'],
  },
  {
    id: 'env-humidity',
    text: 'Use differential-thermostat heaters in outdoor cabinets prone to condensation; frequent fog with contamination can cause insulator flashovers, countered by special insulation or cleaning.',
    cite: { page: 46, section: '2.3.2.8' },
    tags: ['weather', 'humidity', 'contamination', 'insulator'],
  },
];

// ---------------------------------------------------------------------------
// §2.3.3 Altitude (Table 2-2)
// ---------------------------------------------------------------------------

export interface AltitudeCorrectionRow {
  altitudeFt: number;
  altitudeM: number;
  /** Column A: multiplier on dielectric strength. */
  dielectric: number;
  /** Column B: multiplier on current rating. */
  current: number;
  /** Column C: multiplier on ambient temperature. */
  ambientTemperature: number;
}

/** Table 2-2: altitude correction factors for substation equipment. */
export const TABLE_2_2_ALTITUDE_CORRECTION: Sourced<readonly AltitudeCorrectionRow[]> = {
  value: [
    { altitudeFt: 3300, altitudeM: 1000, dielectric: 1.0, current: 1.0, ambientTemperature: 1.0 },
    { altitudeFt: 4000, altitudeM: 1200, dielectric: 0.98, current: 0.995, ambientTemperature: 0.992 },
    { altitudeFt: 5000, altitudeM: 1500, dielectric: 0.95, current: 0.99, ambientTemperature: 0.98 },
    { altitudeFt: 6000, altitudeM: 1800, dielectric: 0.92, current: 0.985, ambientTemperature: 0.968 },
    { altitudeFt: 7000, altitudeM: 2100, dielectric: 0.89, current: 0.98, ambientTemperature: 0.956 },
    { altitudeFt: 8000, altitudeM: 2400, dielectric: 0.86, current: 0.97, ambientTemperature: 0.944 },
    { altitudeFt: 9000, altitudeM: 2700, dielectric: 0.83, current: 0.965, ambientTemperature: 0.932 },
    { altitudeFt: 10000, altitudeM: 3000, dielectric: 0.8, current: 0.96, ambientTemperature: 0.92 },
    { altitudeFt: 12000, altitudeM: 3600, dielectric: 0.75, current: 0.95, ambientTemperature: 0.896 },
    { altitudeFt: 14000, altitudeM: 4200, dielectric: 0.7, current: 0.935, ambientTemperature: 0.872 },
  ],
  cite: {
    page: [46, 47],
    section: '2.3.3',
    table: '2-2',
    originalSource: 'ANSI/IEEE Std. C37.30-1992, Table 1',
    note:
      'Air-insulated and air-cooled equipment runs hotter and has lower dielectric strength at altitude. The same factors recur in Tables 4-3 (BIL), 4-10 (current/ambient, extended to 6000 m) and 5-41 (air switches). ' +
      'Table 4-10 notes the current and ambient-temperature corrections should not be applied together.',
  },
};

/**
 * Altitude factor from Table 2-2 by linear interpolation (1.0 at or below 1000 m; last row above 4200 m).
 * The bulletin does not say whether to interpolate Table 2-2; interpolation is a game convention
 * (Table 5-25 for breakers explicitly calls for it).
 */
export function altitudeCorrection(altitudeM: number, column: 'dielectric' | 'current' | 'ambientTemperature'): number {
  const rows = TABLE_2_2_ALTITUDE_CORRECTION.value;
  if (altitudeM <= rows[0].altitudeM) return 1;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    if (altitudeM <= b.altitudeM) {
      const t = (altitudeM - a.altitudeM) / (b.altitudeM - a.altitudeM);
      return a[column] + t * (b[column] - a[column]);
    }
  }
  return rows[rows.length - 1][column];
}

export const ALTITUDE_GUIDANCE: readonly Guidance[] = [
  {
    id: 'env-altitude-arresters',
    text: 'Surge arresters work satisfactorily up to an elevation limit set by the manufacturer; above it the application is special and the manufacturer should be consulted.',
    cite: { page: 47, section: '2.3.3' },
    tags: ['altitude', 'arrester'],
  },
  {
    id: 'env-altitude-correct',
    text: 'Correct the dielectric strength of air, the current ratings of conductors in air and the ambient temperature for altitude using Table 2-2.',
    cite: { page: 47, section: '2.3.3', table: '2-2' },
    tags: ['altitude', 'design-check'],
  },
];

// ---------------------------------------------------------------------------
// §2.3.4 Earthquakes (Fig. 2-2, with zone factors from §7.4.7)
// ---------------------------------------------------------------------------

export type SeismicZone = '0' | '1' | '2A' | '2B' | '3' | '4';

export interface SeismicZoneInfo {
  zone: SeismicZone;
  /** UBC zone factor Z (= zero-period acceleration of ground motion, in g). */
  z: number;
}

/** Fig. 2-2 zones with UBC zone factors (Table 7-1). Higher zone numbers are more susceptible. */
export const SEISMIC_ZONES: Sourced<readonly SeismicZoneInfo[]> = {
  value: [
    { zone: '0', z: 0 },
    { zone: '1', z: 0.075 },
    { zone: '2A', z: 0.15 },
    { zone: '2B', z: 0.2 },
    { zone: '3', z: 0.3 },
    { zone: '4', z: 0.4 },
  ],
  cite: {
    page: [47, 437],
    section: '2.3.4, 7.4.7',
    figure: '2-2',
    table: '7-1',
    originalSource: 'Uniform Building Code 1997, Figure 16-2 and Table 16-I',
    note: 'Z is described in §7.4.7 as equivalent to the zero-period acceleration of the ground motion.',
  },
};

/**
 * Rough reading of the Fig. 2-2 map (not bulletin text): zones 3-4 along the Pacific coast and western
 * Nevada, much of coastal and southern Alaska, and pockets of the intermountain West; a zone 3 area in the
 * central Mississippi Valley inside a 2A ring; zone 2A pockets in the Northeast and coastal South Carolina;
 * zones 0-1 over most of the Great Plains, Texas, the upper Midwest and Florida.
 */
export const FIG_2_2_MAP_SUMMARY: Sourced<string> = {
  value:
    'Highest zones (3-4) along the Pacific coast, western Nevada and southern Alaska; zone 3 pocket in the central Mississippi Valley; ' +
    '2A/2B across much of the mountain West with 2A pockets in the Northeast and South Carolina; zones 0-1 over the Plains, Texas, upper Midwest and Florida.',
  cite: {
    page: 50,
    figure: '2-2',
    note: 'UNCERTAIN: summarized from the small map image; the bulletin text only says higher-numbered areas are more susceptible. Use the actual UBC map for a site.',
  },
};

export const SEISMIC_GUIDANCE: readonly Guidance[] = [
  {
    id: 'env-seismic-damage',
    text: 'Intense earthquakes will probably damage a substation, but seismic design limits the damage; foundations, structures, anchors, insulators and conductors are the weak points.',
    cite: { page: 47, section: '2.3.4' },
    tags: ['seismic', 'structure'],
  },
  {
    id: 'env-seismic-lead-times',
    text: 'In high seismic areas weigh not only replacement cost but the lead time to get replacement equipment.',
    cite: { page: 47, section: '2.3.4' },
    tags: ['seismic', 'reliability'],
  },
  {
    id: 'env-seismic-transformers',
    text: 'IEEE C57.114 gives seismic installation recommendations for transformers and reactors.',
    cite: { page: 47, section: '2.3.4' },
    tags: ['seismic', 'transformer'],
  },
  {
    id: 'env-seismic-control-buildings',
    text: 'With federal financing, RUS requires control buildings to meet the seismic provisions of 7 CFR 1792, Subpart C.',
    cite: { page: 47, section: '2.3.4' },
    tags: ['seismic', 'control-house'],
  },
  {
    id: 'env-seismic-ieee693',
    text: 'In zones 3 and 4, equipment supports (rigid or flexible isolated supports) for voltage classes above 121 kV should be designed and qualified to IEEE 693; the simplified method serves elsewhere and for racks in all zones.',
    cite: { page: [437, 438], section: '7.4.7' },
    tags: ['seismic', 'structure', 'design-check'],
  },
  {
    id: 'env-seismic-combinations',
    text: 'Seismic loads are usually not combined with ice and wind loads, but may be combined with short-circuit or operating loads that an earthquake could trigger.',
    cite: { page: 437, section: '7.4.7' },
    tags: ['seismic', 'structure'],
  },
];

// ---------------------------------------------------------------------------
// §2.3.5 Other considerations
// ---------------------------------------------------------------------------

export const OTHER_ENVIRONMENT_GUIDANCE: readonly Guidance[] = [
  {
    id: 'env-wildlife-fence',
    text: 'The perimeter chain-link fence keeps out larger animals and livestock; rodent or reptile barriers may also be needed.',
    cite: { page: 50, section: '2.3.5.1' },
    tags: ['wildlife', 'fence', 'animals'],
  },
  {
    id: 'env-wildlife-materials',
    text: 'Use non-nutritive materials throughout (perfect barriers are impractical), add insect screening where experience shows it helps, and avoid attractive nesting and perching spots.',
    cite: { page: 50, section: '2.3.5.1' },
    tags: ['wildlife', 'animals'],
  },
  {
    id: 'env-wildlife-birds',
    text: 'Provide clearances large enough to keep local bird species from being electrocuted (see the CRN Animal-Caused Outages manual).',
    cite: { page: 50, section: '2.3.5.1' },
    tags: ['wildlife', 'animals', 'clearance', 'reliability'],
  },
  {
    id: 'env-airborne',
    text: 'Where seeds, leaves, dust or salt build up locally, design to keep deposits from compromising insulation or blocking cooling.',
    cite: { page: 50, section: '2.3.5.2' },
    tags: ['contamination', 'insulator', 'cooling'],
  },
];

// ---------------------------------------------------------------------------
// §2.4-2.8 Interfacing, reliability, operating, safety, maintenance
// ---------------------------------------------------------------------------

/** §2.4.1: general limit on takeoff (line pull-off) tension per conductor for small distribution substations. */
export const TAKEOFF_TENSION_LIMIT: Sourced<{ newtons: number; pounds: number }> = {
  value: { newtons: 8900, pounds: 2000 },
  cite: {
    page: 51,
    section: '2.4.1',
    note: 'A general rule; incoming line alignment, wire size and elevation differences can raise the required tension.',
  },
};

export const INTERFACE_GUIDANCE: readonly Guidance[] = [
  {
    id: 'env-interface-agencies',
    text: 'Allow lead time to coordinate road access with public agencies and communications facilities with communications providers.',
    cite: { page: 51, section: '2.4' },
    tags: ['interface', 'access', 'communications'],
  },
  {
    id: 'env-interface-utilities',
    text: 'Coordinate location, design and construction with other local utilities: telecommunications, cable TV, water and sewer, gas, and radio and TV stations.',
    cite: { page: 51, section: '2.4' },
    tags: ['interface'],
  },
  {
    id: 'env-interface-lines',
    text: 'Agree early with line engineers on hardware responsibility, attachment to structures, line identification, station orientation and line approach, phase and shield-wire identification, and pull-off heights, spacings, tensions and angles.',
    cite: { page: 51, section: '2.4' },
    tags: ['interface', 'lines', 'layout'],
  },
  {
    id: 'env-line-tension',
    text: 'Specify the line tension that produces the maximum load on the substation structure under the worst combination of temperature, wind and ice, and state the condition so overload factors can be chosen.',
    cite: { page: 51, section: '2.4.1' },
    tags: ['interface', 'structure', 'lines'],
  },
  {
    id: 'env-reliability-voltage',
    text: 'A prime objective is reliable service within acceptable voltage limits; stations designed to operate within ANSI C84.1 voltage ranges should be reasonably reliable.',
    cite: { page: 51, section: '2.5', originalSource: 'ANSI Std. C84.1-1995' },
    tags: ['reliability', 'voltage'],
  },
  {
    id: 'env-operating-clarity',
    text: 'Keep equipment arrangements, connections, signs and nameplates as clear and simple as possible.',
    cite: { page: 52, section: '2.6' },
    tags: ['operations', 'signs', 'layout'],
  },
  {
    id: 'env-operating-emergency',
    text: 'Plan for occasional emergency conditions by giving some equipment and connections extra current-carrying capacity, depending on how long the condition may last.',
    cite: { page: 52, section: '2.6' },
    tags: ['operations', 'rating', 'reliability'],
  },
  {
    id: 'env-safety-paramount',
    text: 'Safety of the public and of operating and maintenance staff is paramount, achieved through qualified people, good work rules, proper design and correct construction.',
    cite: { page: 52, section: '2.7' },
    tags: ['safety'],
  },
  {
    id: 'env-safety-codes',
    text: 'The engineer must ensure compliance with RUS requirements, the NESC, NEC, OSHA (29 CFR 1910 and 1926) and local rules, and go beyond the minimums where local conditions warrant.',
    cite: { page: 52, section: '2.7' },
    tags: ['safety', 'codes'],
  },
  {
    id: 'env-maintenance-space',
    text: 'Design so maintenance can be done with minimum impact on operation, allowing adequate working space.',
    cite: { page: 52, section: '2.8' },
    tags: ['maintenance', 'layout', 'clearance'],
  },
  {
    id: 'env-maintenance-intervals',
    text: 'When selecting equipment, consider manufacturers\' recommended service intervals and past experience with the manufacturer (see Chapter 20).',
    cite: { page: 52, section: '2.8' },
    tags: ['maintenance', 'selection'],
  },
];
