/**
 * Field Guide articles generated from the cited bulletin data modules. Each
 * bullet is a paraphrase from the data files and carries its own citation.
 */
import { formatCitation, type Guidance } from '../data/bulletin/types';
import { BUS_CONFIGURATION_GUIDANCE, BUS_SCHEMES, DISTRIBUTION_GUIDANCE, LAYOUT_GUIDANCE, SWITCHING_STATION, TRANSMISSION_GUIDANCE, TRANSMISSION_SUBSTATION } from '../data/bulletin/layout';
import { MOBILE_GUIDANCE, MOBILE_NUMBERS } from '../data/bulletin/mobile';
import { TRANSFORMER_GUIDANCE, TABLE_5_11_STANDARD_IMPEDANCE, COOLING_UPRATE_RULES } from '../data/bulletin/transformers';
import { REGULATOR_CONTROL_GUIDANCE, REGULATOR_TYPE_GUIDANCE, TABLE_5_28_SINGLE_PHASE_RANGE_CURRENT } from '../data/bulletin/regulators';
import { SWITCH_GUIDANCE } from '../data/bulletin/airSwitches';
import { BREAKER_APPLICATION_GUIDANCE, BREAKER_CONSTRUCTION_FACTS, TABLE_5_23_OUTDOOR_72_5_KV_AND_BELOW } from '../data/bulletin/breakers';
import { CAPACITOR_SYSTEM_GUIDANCE, GROUNDING_SAFETY_GUIDANCE, PROTECTION_GUIDANCE as CAPACITOR_PROTECTION_GUIDANCE } from '../data/bulletin/capacitors';
import { ALTITUDE_GUIDANCE, OTHER_ENVIRONMENT_GUIDANCE, PLANNING_GUIDANCE, PUBLIC_SAFETY_GUIDANCE, SEISMIC_GUIDANCE, SITE_GUIDANCE, TABLE_2_2_ALTITUDE_CORRECTION, WEATHER_GUIDANCE } from '../data/bulletin/environment';
import { APPARATUS_INSULATOR_GUIDANCE, CONDUCTOR_GUIDANCE, BUS_CONNECTION_GUIDANCE } from '../data/bulletin/insulatorsConductors';
import type { Block, GuideArticle } from './guide';

const cite = (g: Guidance) => formatCitation(g.cite, true);
const bullets = (list: readonly Guidance[]): Block => ({ list: list.map((g) => `${g.text} (${cite(g)})`) });
const uniqCites = (lists: ReadonlyArray<readonly Guidance[]>) => {
  const seen = new Set<string>();
  const out = [];
  for (const l of lists)
    for (const g of l) {
      const k = formatCitation(g.cite);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(g.cite);
    }
  return out.slice(0, 6);
};

function guidanceArticle(id: string, title: string, category: GuideArticle['category'], intro: string, lists: Array<[string | null, readonly Guidance[]]>, extra: Block[] = [], tags: string[] = []): GuideArticle {
  const body: Block[] = [{ p: intro }];
  for (const [h, l] of lists) {
    if (!l.length) continue;
    if (h) body.push({ h });
    body.push(bullets(l));
  }
  body.push(...extra);
  return { id, title, category, body, cites: uniqCites(lists.map(([, l]) => l)), tags };
}

const OUTCOME_TEXT: Record<string, string> = {
  'entire-substation': 'the entire substation',
  'faulted-section-only': 'only the faulted section',
  'no-circuits': 'no circuits',
  'affected-section-only': 'only the affected section',
  'two-adjacent-sections': 'two adjacent sections',
  'one-or-two-circuits': 'one or two circuits',
  'one-circuit': 'one circuit',
};

const schemeArticles: GuideArticle[] = BUS_SCHEMES.map((s) => ({
  id: `scheme-${s.id}`,
  title: `Bus scheme: ${s.name}`,
  category: 'Layout',
  cites: [s.cite],
  tags: ['bus scheme', s.name.toLowerCase()],
  body: [
    { p: s.summary },
    { p: s.oneLine },
    {
      table: {
        head: ['Event', 'What is lost'],
        rows: [
          ['Bus fault', OUTCOME_TEXT[s.reliability.busFault.outcome] ?? s.reliability.busFault.outcome],
          ['Breaker failure', OUTCOME_TEXT[s.reliability.breakerFailure.outcome] ?? s.reliability.breakerFailure.outcome],
          ['Breaker maintenance', s.reliability.breakerMaintenance.text],
        ],
        cite: s.cite,
      },
    },
    { h: 'Advantages' },
    { list: [...s.advantages] },
    { h: 'Disadvantages' },
    { list: [...s.disadvantages] },
    ...(s.notes.length ? [{ list: [...s.notes] } as Block] : []),
    { p: `Figures: ${s.figures.map((f) => `Fig. ${f.figure} (p. ${f.page})`).join(', ')}. Breakers per circuit: ${s.breakersPerCircuit}.` },
  ],
}));

export const DATA_ARTICLES: GuideArticle[] = [
  guidanceArticle('layout-considerations', 'Layout considerations', 'Layout', 'Detailed layout starts from the basic design parameters and the switching scheme, and plans for growth, profile and equipment removal.', [[null, LAYOUT_GUIDANCE]], [], ['layout', 'expansion', 'profile']),
  guidanceArticle('distribution-substations', 'Distribution substations in detail', 'Layout', 'More guidance on the traditional rural distribution substation and its bypass arrangements.', [[null, DISTRIBUTION_GUIDANCE]], [], ['distribution']),
  guidanceArticle(
    'transmission-substations',
    'Transmission substations',
    'Layout',
    TRANSMISSION_SUBSTATION.value.oneLine,
    [[null, TRANSMISSION_GUIDANCE]],
    [{ list: [...TRANSMISSION_SUBSTATION.value.notes] }],
    ['transmission', 'carrier', 'ccvt'],
  ),
  {
    id: 'switching-stations',
    title: 'Switching stations',
    category: 'Layout',
    cites: [SWITCHING_STATION.cite],
    tags: ['switching station'],
    body: [{ p: SWITCHING_STATION.value.oneLine }, { list: [...SWITCHING_STATION.value.notes] }],
  },
  ...schemeArticles,
  guidanceArticle('scheme-guidance', 'Choosing a bus configuration', 'Layout', 'General guidance that applies across the typical bus configurations.', [[null, BUS_CONFIGURATION_GUIDANCE]], [], ['bus scheme']),
  guidanceArticle(
    'mobile',
    'Mobile transformers and substations',
    'Equipment',
    'A failed three-phase transformer takes the whole substation out, so layouts should allow a mobile transformer or mobile substation to be installed quickly.',
    [[null, MOBILE_GUIDANCE]],
    [
      {
        list: [
          `Connect the trailer to the ground grid with at least ${MOBILE_NUMBERS.value.minGroundConnections} independent connections.`,
          `Mobile-unit impedance may be as high as ${MOBILE_NUMBERS.value.typicalImpedancePct[0]}–${MOBILE_NUMBERS.value.typicalImpedancePct[1]}% on the forced-cooled base — check paralleling and fault levels.`,
          `A mobile substation conveniently serves only ${MOBILE_NUMBERS.value.maxDistributionCircuits} distribution circuits without an auxiliary switching structure.`,
        ],
      },
    ],
    ['mobile', 'transformer'],
  ),
  guidanceArticle(
    'transformers',
    'Power transformers',
    'Equipment',
    'Ratings, cooling, impedance and other characteristics of substation power transformers.',
    [[null, TRANSFORMER_GUIDANCE]],
    [
      { h: 'Fan-cooled ratings used in the game' },
      { p: 'One stage of forced-air cooling adds 15% to the self-cooled rating for 750–2000 kVA units and 25% for 2500–10 000 kVA units. Above 10 000 kVA, up to two stages each add one third of the self-cooled rating (e.g. 12/16/20 MVA).' },
      { note: `Source: ${formatCitation(COOLING_UPRATE_RULES.cite)}. The bulletin lists the range of standard kVA ratings rather than every size; the game offers common sizes within those ranges.` },
      {
        table: {
          head: ['HV BIL (kV)', 'Without LTC, LV ≥ 2400 V', 'With LTC'],
          rows: TABLE_5_11_STANDARD_IMPEDANCE.value.map((r) => [r.hvBilMinKV === r.hvBilMaxKV ? r.hvBilMinKV : `${r.hvBilMinKV}–${r.hvBilMaxKV}`, `${r.noLtcLv2400Up}%`, r.ltcLv2400Up != null ? `${r.ltcLv2400Up}%` : '—']),
          caption: 'Standard percent impedance at the self-cooled rating. The game uses it to compute low-voltage fault current.',
          cite: TABLE_5_11_STANDARD_IMPEDANCE.cite,
        },
      },
    ],
    ['transformer', 'impedance', 'cooling'],
  ),
  guidanceArticle(
    'regulators',
    'Step-voltage regulators',
    'Equipment',
    'Regulators hold distribution voltage within limits as load changes.',
    [
      [null, REGULATOR_TYPE_GUIDANCE],
      ['Controls', REGULATOR_CONTROL_GUIDANCE],
    ],
    [
      {
        table: {
          head: ['Range of regulation', 'Current, % of rating'],
          rows: TABLE_5_28_SINGLE_PHASE_RANGE_CURRENT.value.rows.map((r) => [`±${r.rangePct}%`, `${r.currentPctOfRated}%`]),
          caption: `Single-phase step regulators rated 19.9 kV and below; maximum current ${TABLE_5_28_SINGLE_PHASE_RANGE_CURRENT.value.maxCurrentA} A.`,
          cite: TABLE_5_28_SINGLE_PHASE_RANGE_CURRENT.cite,
        },
      },
    ],
    ['regulator', 'range', 'bypass'],
  ),
  guidanceArticle('air-switches', 'Outdoor air switches', 'Equipment', 'Disconnect, grounding and interrupter switches used throughout the yard.', [[null, SWITCH_GUIDANCE]], [], ['switch', 'disconnect', 'hook stick']),
  guidanceArticle(
    'breakers',
    'Power circuit breakers',
    'Equipment',
    'Breakers interrupt load and fault current on command from protective relays.',
    [
      ['Construction', BREAKER_CONSTRUCTION_FACTS],
      ['Application', BREAKER_APPLICATION_GUIDANCE],
    ],
    [
      {
        table: {
          head: ['Rated max kV', 'Continuous A', 'Short-circuit kA', 'Interrupting time ms'],
          rows: TABLE_5_23_OUTDOOR_72_5_KV_AND_BELOW.value.map((r) => [r.ratedMaxKV, r.continuousA.join(', '), r.shortCircuitKA, r.interruptingTimeMs]),
          caption: 'Preferred ratings for outdoor circuit breakers 72.5 kV and below.',
          cite: TABLE_5_23_OUTDOOR_72_5_KV_AND_BELOW.cite,
        },
      },
    ],
    ['breaker', 'interrupting'],
  ),
  guidanceArticle(
    'capacitors',
    'Shunt capacitor banks',
    'Equipment',
    'Shunt capacitors supply reactive power, supporting voltage and improving power factor.',
    [
      [null, CAPACITOR_SYSTEM_GUIDANCE],
      ['Protection', CAPACITOR_PROTECTION_GUIDANCE],
      ['Grounding and safety', GROUNDING_SAFETY_GUIDANCE],
    ],
    [],
    ['capacitor', 'kvar', 'power factor'],
  ),
  guidanceArticle(
    'site-environment',
    'Site and environment',
    'Site',
    'Site selection, public safety, weather, altitude and earthquakes all shape a substation design.',
    [
      ['Planning', PLANNING_GUIDANCE],
      ['Site selection', SITE_GUIDANCE],
      ['Public safety', PUBLIC_SAFETY_GUIDANCE],
      ['Weather', WEATHER_GUIDANCE],
      ['Altitude', ALTITUDE_GUIDANCE],
      ['Earthquakes', SEISMIC_GUIDANCE],
      ['Other considerations', OTHER_ENVIRONMENT_GUIDANCE],
    ],
    [
      {
        table: {
          head: ['Altitude (m)', 'Dielectric factor', 'Current factor'],
          rows: TABLE_2_2_ALTITUDE_CORRECTION.value.map((r) => [`${r.altitudeM} (${r.altitudeFt} ft)`, r.dielectric, r.current]),
          caption: 'Altitude correction factors for substation equipment.',
          cite: TABLE_2_2_ALTITUDE_CORRECTION.cite,
        },
      },
    ],
    ['site', 'altitude', 'seismic', 'weather', 'noise'],
  ),
  guidanceArticle(
    'insulators-conductors',
    'Insulators and bus conductors',
    'Equipment',
    'Apparatus insulators support rigid bus and equipment; conductors must carry load and fault current within clearances.',
    [
      ['Apparatus insulators', APPARATUS_INSULATOR_GUIDANCE],
      ['Conductors', CONDUCTOR_GUIDANCE],
      ['Bus connections', BUS_CONNECTION_GUIDANCE],
    ],
    [],
    ['insulator', 'conductor', 'ampacity'],
  ),
];
