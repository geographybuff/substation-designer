/**
 * Narrative operations simulation: plays out N years of service by sampling
 * events from the reliability model's rates with a seeded RNG, and narrates
 * them with references to the bulletin's design guidance.
 */
import type { Citation } from '../data/bulletin/types';
import { loadAt } from './calc';
import { transformerSiteRatingKVA } from './equipment';
import { EVENT_ASSUMPTIONS } from './reliability';
import type { DesignReview } from './review';
import type { Design, LevelDef } from './types';

export interface SimEvent {
  year: number;
  month: number;
  kind: 'failure' | 'maintenance' | 'feeder' | 'line' | 'lightning' | 'surge' | 'bus' | 'good' | 'growth';
  title: string;
  detail: string;
  customers: number;
  customerMinutes: number;
  planned: boolean;
  external: boolean;
  itemId?: string;
  cite?: Citation;
}

export interface SimulationResult {
  seed: number;
  years: number;
  events: SimEvent[];
  /** Customer-minutes per year (scored causes only). */
  minutesByYear: number[];
  /** Outage minutes per customer per year averaged over the run (scored causes). */
  saidi: number;
  peakByYear: number[];
  capacityMVA: number;
  momentaryOperations: number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(rate: number, rnd: () => number): number {
  if (rate <= 0) return 0;
  const L = Math.exp(-rate);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L && k < 50);
  return k - 1;
}

const CITE: Record<string, Citation> = {
  bypass: { page: [123, 124], section: '4.3.4' },
  mobile: { page: 122, section: '4.3.1' },
  shield: { page: 142, section: '4.7.3' },
  arrester: { page: 124, section: '4.3.5' },
  recloser: { page: 357, section: '5.9' },
  feeder: { page: [121, 122], section: '4.3.1' },
  growth: { page: 41, section: '2.1' },
  regulator: { page: [122, 123], section: '4.3.3' },
};

export function simulate(design: Design, level: LevelDef, review: DesignReview, seed = 1): SimulationResult {
  const rnd = mulberry32(seed);
  const years = level.simYears;
  const events: SimEvent[] = [];
  const minutesByYear = new Array<number>(years).fill(0);
  const total = review.reliability.totalCustomers;
  const capacityMVA = design.items.filter((i) => i.kind === 'transformer').reduce((s, t) => s + transformerSiteRatingKVA(t) / 1000, 0);
  const peakByYear: number[] = [];
  let momentary = 0;
  let warnedCapacity = false;
  const phase = new Map<string, number>();

  for (let y = 1; y <= years; y++) {
    const peak = loadAt(level, y);
    peakByYear.push(peak);
    if (!warnedCapacity && capacityMVA > 0 && peak > capacityMVA) {
      warnedCapacity = true;
      events.push({ year: y, month: 7, kind: 'growth', title: 'Summer peak exceeds transformer capacity', detail: `Peak load reached ${peak.toFixed(1)} MVA against ${capacityMVA.toFixed(1)} MVA of transformer capacity. Overloading shortens transformer life.`, customers: 0, customerMinutes: 0, planned: false, external: false, cite: CITE.growth });
    }
    for (const c of review.reliability.contributions) {
      // Planned maintenance happens on a schedule; everything else is random.
      let n: number;
      if (c.kind === 'maintenance') {
        const interval = c.ratePerYear > 0 ? Math.round(1 / c.ratePerYear) : 0;
        const key = c.itemId ?? c.cause;
        if (!phase.has(key)) phase.set(key, 1 + Math.floor(rnd() * Math.max(1, interval)));
        n = interval > 0 && y >= phase.get(key)! && (y - phase.get(key)!) % interval === 0 ? 1 : 0;
      } else {
        n = poisson(c.ratePerYear, rnd);
      }
      for (let k = 0; k < n; k++) {
        const month = 1 + Math.floor(rnd() * 12);
        const hours = c.customers > 0 ? c.perEvent / (c.customers * 60) : 0;
        const ev: SimEvent = {
          year: y,
          month,
          kind: c.kind,
          title: c.cause,
          detail: narrate(c.kind, c.cause, c.customers, hours, c.planned),
          customers: c.customers,
          customerMinutes: c.perEvent,
          planned: c.planned,
          external: !!c.external,
          itemId: c.itemId,
          cite: citeFor(c.kind, c.itemId ? design.items.find((i) => i.id === c.itemId)?.kind : undefined),
        };
        events.push(ev);
        if (!ev.external) minutesByYear[y - 1]! += ev.customerMinutes;
      }
    }
    // Good news: temporary faults cleared by reclosing, and strokes intercepted by shielding.
    const reclosing = review.topo.loads.filter((l) => {
      const p = review.facts.feederProtection.get(l.itemId);
      if (!p) return false;
      const it = design.items.find((i) => i.id === p);
      return it?.kind === 'recloser' ? it.props.reclosing !== false : ((it?.props.relays as string[] | undefined) ?? []).includes('79');
    }).length;
    if (reclosing) {
      const temp = poisson(EVENT_ASSUMPTIONS.feederFaultsPerYear * EVENT_ASSUMPTIONS.temporaryFraction * reclosing, rnd);
      momentary += temp;
    }
    if (design.fence && review.shielding.coveredFraction > 0) {
      const f = design.fence.rect;
      const strokes = EVENT_ASSUMPTIONS.flashDensityPerTD * level.site.isokeraunicDays * (((f.w + 50) * (f.h + 50)) / 1e6);
      const hits = poisson(strokes * review.shielding.coveredFraction, rnd);
      for (let k = 0; k < hits; k++) {
        events.push({ year: y, month: 5 + Math.floor(rnd() * 4), kind: 'good', title: 'Direct stroke intercepted', detail: 'A lightning stroke terminated on the shielding system and was carried into the ground grid. No equipment damage.', customers: 0, customerMinutes: 0, planned: false, external: false, cite: CITE.shield });
      }
    }
  }
  events.sort((a, b) => a.year - b.year || a.month - b.month);
  const scored = minutesByYear.reduce((s, m) => s + m, 0);
  return { seed, years, events, minutesByYear, saidi: scored / total / years, peakByYear, capacityMVA, momentaryOperations: momentary };
}

function citeFor(kind: SimEvent['kind'], itemKind: string | undefined): Citation | undefined {
  if (kind === 'lightning') return CITE.shield;
  if (kind === 'surge') return CITE.arrester;
  if (kind === 'feeder') return CITE.feeder;
  if (itemKind === 'transformer') return CITE.mobile;
  if (itemKind === 'regulator') return CITE.regulator;
  if (kind === 'maintenance' && (itemKind === 'recloser' || itemKind === 'breaker')) return CITE.bypass;
  return undefined;
}

function narrate(kind: SimEvent['kind'], cause: string, customers: number, hours: number, planned: boolean): string {
  const who = `${customers.toLocaleString()} member${customers === 1 ? '' : 's'}`;
  const dur = hours >= 48 ? `${(hours / 24).toFixed(1)} days` : `${hours.toFixed(1)} hours`;
  switch (kind) {
    case 'maintenance':
      return `${planned ? 'Planned' : 'Unplanned'} outage for ${who} for ${dur}: the equipment could not be taken out of service without de-energizing the circuit.`;
    case 'failure':
      return `${who} lost power; restoration took ${dur}.`;
    case 'feeder':
      return `A distribution line fault was cleared by shared protection, interrupting ${who} for ${dur}.`;
    case 'line':
      return `The supply line tripped; ${who} were without power for ${dur}.`;
    case 'lightning':
      return `A direct stroke hit unshielded equipment. ${who} were out for ${dur} during repairs.`;
    case 'surge':
      return `A lightning surge damaged unprotected equipment. ${who} were out for ${dur}.`;
    case 'bus':
      return `A bus fault interrupted ${who} for ${dur}.`;
    default:
      return cause;
  }
}
