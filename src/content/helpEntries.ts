/**
 * "Help me fix this" entries for every review check and campaign objective.
 * Steps speak the game's language (toolbox names, Inspector fields, overlays)
 * and paraphrase the bulletin rule the check enforces. Keep each step short and
 * concrete; prefer naming the actual items involved.
 *
 * One-click fixes are offered only for Inspector settings whose effect on the
 * review is certain from the check code (and that cannot raise a new finding).
 */
import { GROUNDING_RULES } from '../data/bulletin/grounding';
import { voltageClassFor } from '../data/bulletin/voltageClasses';
import { transformerHVCurrentA } from '../engine/calc';
import { busHeight, CATALOG, CONDUCTOR_SIZES, defaultProps } from '../engine/catalog';
import { ARRESTER_NEAR_M } from '../engine/checks/electrical';
import { fenceRequiredDistance } from '../engine/checks/physical';
import { alignItemToBus, voltagesFor } from '../engine/design';
import { arresterRating, LIGHTNING_MARGIN_MIN, regulatorCapacityA, standardRecloserRows, transformerHvBilKV, transformerRatings, transformerSiteRatingKVA } from '../engine/equipment';
import { rectContainsRect, rectsOverlap } from '../engine/geometry';
import { evaluateGrounding, GROUND_KCMIL } from '../engine/grounding';
import { footprintOf, itemLabel, itemRect } from '../engine/items';
import type { DesignReview } from '../engine/review';
import { SCHEMES, type SchemeId } from '../engine/schemes';
import { clearanceClassFor, currentSiteFactor, isHighAltitude } from '../engine/site';
import type { Conductor, Design, Finding, GroundConductorSize, ItemKind, LevelDef, ObjectiveKind, PlacedItem, Props, Side } from '../engine/types';
import type { FindingHelpFn, Help, HelpCtx, HelpFix, ObjectiveHelpFn } from './help';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const byId = (design: Design, id: string | undefined): PlacedItem | undefined => (id ? design.items.find((i) => i.id === id) : undefined);
const condById = (design: Design, id: string | undefined): Conductor | undefined => (id ? design.conductors.find((c) => c.id === id) : undefined);

const label = (design: Design, id: string | undefined) => {
  const it = byId(design, id);
  return it ? itemLabel(it) : 'the equipment';
};
const names = (items: readonly PlacedItem[]) => items.map((i) => itemLabel(i)).join(', ');
const isItem = (x: PlacedItem | undefined): x is PlacedItem => !!x;
const itemsOf = (design: Design, ids: readonly string[]) => ids.map((id) => byId(design, id)).filter(isItem);
const uniq = <T>(xs: readonly T[]) => [...new Set(xs)];

/** Toolbox name of an equipment kind (the toolbox drops any trailing " (...)"). */
const N = (kind: ItemKind) => CATALOG[kind].name.replace(/ \(.*\)$/, '');
/** Toolbox name with an article where the name is singular ("a Disconnect Switch", "Power Fuses"). */
const PLURAL_NAMES: ReadonlySet<ItemKind> = new Set(['fuse', 'hookstick_switch', 'regulator', 'vt', 'ccvt']);
const aN = (kind: ItemKind) => (PLURAL_NAMES.has(kind) ? N(kind) : `${/^[AEIOU]/.test(N(kind)) ? 'an' : 'a'} ${N(kind)}`);

const m = (x: number) => `${Number(x.toFixed(2))} m`;
const hvText = (l: LevelDef) => `${l.system.hvKV} kV`;
const lvText = (l: LevelDef) => `${l.system.lvKV ?? l.system.hvKV} kV`;
const sideOf = (l: LevelDef, kv: number): 'hv' | 'lv' => (Math.abs(kv - l.system.hvKV) < 0.01 || l.system.lvKV === undefined ? 'hv' : 'lv');
const DIR: Record<Side, string> = { N: 'north', S: 'south', E: 'east', W: 'west' };

/** First of the given kinds that the level's toolbox offers. */
const pickTool = (l: LevelDef, ...kinds: ItemKind[]): ItemKind | undefined => kinds.find((k) => l.tools.includes(k));

/** Drop empty entries so optional steps can be written inline. */
const steps = (...xs: Array<string | null | undefined | false>): string[] => xs.filter((x): x is string => !!x);

const SITE_PANEL = 'Click empty ground so nothing is selected: the Inspector then shows the site settings.';

const findingsOf = (review: DesignReview, prefix: string) => review.findings.filter((f) => f.checkId.startsWith(prefix));
const idsOf = (fs: readonly Finding[]) => uniq(fs.flatMap((f) => f.itemIds ?? []));
const titlesOf = (fs: readonly Finding[], max = 3) => {
  const t = uniq(fs.map((f) => f.title));
  return t.slice(0, max).join('; ') + (t.length > max ? `; and ${t.length - max} more` : '');
};

/** A copy of the design with some props of one item changed, or null if the item is gone. */
function withProps(d: Design, id: string, patch: Props): Design | null {
  if (!d.items.some((i) => i.id === id)) return null;
  return { ...d, items: d.items.map((i) => (i.id === id ? { ...i, props: { ...i.props, ...patch } } : i)) };
}

/** A copy of the design with relay codes added to an item's Protective relays. */
function withRelays(d: Design, id: string, codes: readonly string[]): Design | null {
  const it = byId(d, id);
  if (!it) return null;
  const cur = Array.isArray(it.props.relays) ? it.props.relays : [];
  return withProps(d, id, { relays: [...cur, ...codes.filter((c) => !cur.includes(c))] });
}

/** Numeric option values of an Inspector select, ascending. */
function numOptions(kind: ItemKind, key: string): number[] {
  return (CATALOG[kind].props.find((p) => p.key === key)?.options ?? [])
    .map((o) => Number(o.value))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
}

/** Available fault current (kA) at a device's terminals and its year-end load current (A), as the ratings checks see them. */
function dutyOf(review: DesignReview, id: string): { faultKA: number; amps: number } {
  const d = review.topo.deviceById.get(id);
  const faultKA = d ? Math.max(0, ...[d.a, d.b].map((n) => (n ? (review.calc.faultKA.get(n) ?? 0) : 0))) : 0;
  return { faultKA, amps: review.calc.deviceCurrentA.get(id) ?? 0 };
}

/**
 * The standard recloser rating (Tables 5-60/5-61) nearest the present setting
 * that interrupts the available fault current and carries the load current.
 */
function recloserRating(it: PlacedItem, { level, review }: HelpCtx): { continuousA: number; interruptingKA: number } | null {
  const { faultKA, amps } = dutyOf(review, it.id);
  const f = currentSiteFactor('recloser', level.site.altitudeM);
  const cur = Number(it.props.continuousA) || 0;
  const ok = standardRecloserRows(it.kv, String(it.props.interrupter))
    .filter((r) => r.interruptingA / 1000 >= faultKA - 1e-6 && r.continuousA * f >= amps - 1e-6)
    .sort((a, b) => Math.abs(a.continuousA - cur) - Math.abs(b.continuousA - cur) || a.interruptingA - b.interruptingA || a.continuousA - b.continuousA);
  const r = ok[0];
  return r ? { continuousA: r.continuousA, interruptingKA: r.interruptingA / 1000 } : null;
}

const recloserText = (r: { continuousA: number; interruptingKA: number }) => `${r.continuousA} A / ${r.interruptingKA} kA`;

/**
 * Smallest Self-cooled rating whose usable top rating covers `needMVA`: with the present
 * cooling, and with more fan stages where that allows a smaller unit (only stage counts
 * the §5.2.2 rules offer for that size).
 */
function transformerSuggestion(it: PlacedItem, needMVA: number, belowKVA = Infinity): string | null {
  const kvas = numOptions('transformer', 'kva').filter((kva) => kva < belowKVA);
  const cooling = String(it.props.cooling ?? 'OA');
  const COOLINGS = ['OA', 'OA/FA', 'OA/FA/FA'];
  const smallest = (c: string) =>
    kvas.find((kva) => transformerRatings(kva, c).stagesAllowed && transformerSiteRatingKVA({ ...it, props: { ...it.props, kva, cooling: c } }) / 1000 >= needMVA - 1e-9);
  const fmt = (kva: number, c: string) => `${kva / 1000} MVA ${c}`;
  const own = smallest(cooling);
  let alt: { kva: number; c: string } | undefined;
  for (const c of COOLINGS.slice(COOLINGS.indexOf(cooling) + 1)) {
    const kva = smallest(c);
    if (kva !== undefined && (own === undefined || kva < own) && (!alt || kva < alt.kva)) alt = { kva, c };
  }
  if (own === undefined) return alt ? fmt(alt.kva, alt.c) : null;
  return alt ? `${fmt(own, cooling)}, or ${fmt(alt.kva, alt.c)}` : fmt(own, cooling);
}

/** Help for the shielding finding and objective. */
function shieldingHelp({ level, review }: HelpCtx, itemIds: string[]): Help {
  const pct = Math.round(review.shielding.coveredFraction * 100);
  return {
    what: `A direct lightning stroke to unshielded bus or equipment can destroy it and take the station out. Masts and shield wires must put everything energized inside their zone of protection (section 4.7.3); ${pct}% is covered now.`,
    steps: steps(
      level.features.shieldWires && 'Turn on the Shielding overlay: anything outside the shaded zone is exposed.',
      `Place a ${N('mast')} near the exposed equipment and raise its Mast height in the Inspector (up to 30 m). A taller mast covers a wider circle.`,
      level.features.shieldWires && 'To cover a long bus, pick Shield wire and click one mast, then another: the wire protects a strip between them.',
      'Masts are grounded steel: keep each one clear of the buses by the Table 4-7 clearance to grounded parts.',
    ),
    tool: pickTool(level, 'mast'),
    overlay: level.features.shieldWires ? 'shielding' : undefined,
    guide: 'shielding',
    itemIds,
  };
}

/** Grid changes that lower mesh (touch) and step voltages, in order of effect. */
function groundingRemedies({ design, level }: HelpCtx, kind: 'touch' | 'step'): string[] {
  const g = design.groundGrid;
  const surf =
    level.features.surfacing && design.surfacing.material === 'none'
      ? `Under Yard surfacing set Material to Crushed rock and Thickness to at least ${GROUNDING_RULES.surfaceLayerMinThicknessM.value} m. A resistive surface raises the tolerable ${kind} voltage more than anything else (Table 9-4).`
      : null;
  const mesh = `Reduce Mesh spacing D (now ${g.spacingM} m): closer conductors flatten the voltage between them.`;
  const rods = `Add Ground rods around the perimeter (now ${g.rodCount}), each at least ${GROUNDING_RULES.rodMinLengthM.value} m long.`;
  const deep = `Bury the grid deeper with Burial depth h (now ${g.depthM} m, up to ${GROUNDING_RULES.burialDepthM.value[1]} m).`;
  return kind === 'touch' ? steps(surf, mesh, rods) : steps(surf, rods, deep);
}

/** Rods for the corners and every other perimeter junction of the grid as the review models it (§9.10.3). */
function suggestedRods(design: Design): number {
  const g = design.groundGrid;
  if (!design.fence) return 4;
  const e = g.extendBeyondFenceM;
  const lx = design.fence.rect.w + 2 * e;
  const ly = design.fence.rect.h + 2 * e;
  const D = Math.max(1, g.spacingM);
  const alongX = Math.max(2, Math.floor(ly / D + 1e-9) + 1);
  const alongY = Math.max(2, Math.floor(lx / D + 1e-9) + 1);
  return Math.max(4, Math.ceil((2 * (alongX + alongY) - 4) / 2));
}

/** Steps to put a transformer primary protective device in place. */
function primaryProtectionSteps(level: LevelDef, xfmr: PlacedItem | undefined): { steps: string[]; tool: ItemKind | undefined } {
  const mva = xfmr ? Number(xfmr.props.kva) / 1000 : 0;
  const relayDev = pickTool(level, 'circuit_switcher', 'breaker');
  const tool = mva >= 10 && relayDev ? relayDev : (pickTool(level, 'fuse') ?? relayDev);
  const name = xfmr ? itemLabel(xfmr) : 'the transformer';
  return {
    tool,
    steps: steps(
      tool && `Place ${aN(tool)} (${hvText(level)}) in the connection between the primary disconnect switch and ${name}'s HV terminal.`,
      `Keep a ${N('switch')} on its line side so it can be isolated.`,
      'Fuses suit transformers up to about 10 MVA (and some up to 30 MVA); larger units use a circuit switcher or breaker tripped by transformer relays (section 12.4.4.1).',
      tool && tool !== 'fuse' && `Then select ${name} and tick 87T, 63 and 50/51 under Protective relays so the device has something to trip it.`,
    ),
  };
}

const SCHEME_GUIDE: Partial<Record<SchemeId, string>> = {
  single_bus: 'scheme-single-bus',
  sectionalized_bus: 'scheme-sectionalized-bus',
  main_transfer: 'scheme-main-and-transfer',
  ring_bus: 'scheme-ring-bus',
  breaker_and_half: 'scheme-breaker-and-a-half',
  double_breaker: 'scheme-double-breaker-double-bus',
};

// ---------------------------------------------------------------------------
// Shared finding entries (used by more than one checkId)
// ---------------------------------------------------------------------------

const groundDepth: FindingHelpFn = (_f, { design }) => {
  const [lo, hi] = GROUNDING_RULES.burialDepthM.value;
  return {
    what: `Grid conductors are normally buried ${lo}–${hi} m below final grade (section 9.10.2): shallower ones are easily damaged and give high step voltages, and the equations are not checked outside this range.`,
    steps: [SITE_PANEL, `Under Ground grid set Burial depth h between ${lo} and ${hi} m (now ${design.groundGrid.depthM} m; 0.5 m is common).`],
    overlay: 'grounding',
    guide: 'grounding',
  };
};

const groundSurfaceThin: FindingHelpFn = (_f, { design }) => {
  const t = GROUNDING_RULES.surfaceLayerMinThicknessM.value;
  return {
    what: `Section 9.10.2 calls for at least ${t * 100} cm (4 in) of crushed rock or equal over the yard; a thinner layer gives less protection against touch and step voltages.`,
    steps: [SITE_PANEL, `Under Yard surfacing set Thickness to at least ${t} m (now ${design.surfacing.thicknessM} m).`],
    guide: 'grounding',
  };
};

const groundNoSurface: FindingHelpFn = (_f, { level }) => ({
  what: 'A layer of crushed rock over the yard puts a high resistance under people’s feet, which greatly raises the touch and step voltages they can tolerate (factor Cs, Table 9-4).',
  steps: level.features.surfacing
    ? [SITE_PANEL, `Under Yard surfacing set Material to Crushed rock (or Washed granite) and Thickness to at least ${GROUNDING_RULES.surfaceLayerMinThicknessM.value} m.`]
    : ['This project does not offer yard surfacing, so there is nothing to change here.', 'Keep touch and step voltages safe with the grid itself: mesh spacing, rods and depth.'],
  guide: 'grounding',
});

const relayFeeder: FindingHelpFn = (f, { design, level }) => {
  const id = f.itemIds?.[0];
  const ground = f.checkId === 'relay.feeder.ground';
  const codes = ground ? ['50N/51N'] : level.system.hvEffectivelyGrounded ? ['50/51', '50N/51N'] : ['50/51'];
  return {
    what: ground
      ? `On a grounded system a feeder breaker also carries a ground (neutral) overcurrent relay, 50N/51N, which sees ground faults too small for the phase relays.`
      : `${label(design, id)} protects a feeder, but a breaker only opens when a relay tells it to. Feeder breakers use inverse-time overcurrent relays with instantaneous elements (50/51); without them only backup protection clears a feeder fault.`,
    steps: steps(
      `Select ${label(design, id)}.`,
      `Under Protective relays tick ${codes.join(' and ')}.`,
      !ground && '79 Automatic reclosing is optional: it restores service after temporary faults.',
    ),
    guide: 'relaying',
    fix: id ? { label: `Tick ${codes.join(' and ')} on ${label(design, id)}`, apply: (d) => withRelays(d, id, codes) } : undefined,
  };
};

const relayXfmr: FindingHelpFn = (f, { design }) => {
  const tid = f.itemIds?.[0];
  const dev = f.itemIds?.[1];
  const diff = f.checkId === 'relay.xfmr.diff';
  const codes = diff ? ['87T', '63'] : ['87T', '63', '50/51'];
  const t = byId(design, tid);
  return {
    what: diff
      ? `${label(design, tid)}${t ? ` is ${Number(t.props.kva) / 1000} MVA. Transformers` : ' is large. Transformers'} of 10 MVA and up are usually protected by percentage differential (87T) and sudden-pressure (63) relays as well as overcurrent (Fig. 12-13), which catch internal faults quickly.`
      : `A circuit switcher or breaker on the transformer primary opens only when transformer relays trip it. ${dev ? label(design, dev) : 'The primary device'} has nothing to trip it, so a transformer fault would be left to the line's protection.`,
    steps: steps(`Select ${label(design, tid)} (the transformer itself).`, `Under Protective relays tick ${codes.join(', ')}.`, !diff && '87T and 63 catch faults inside the tank; 50/51 backs them up and covers the low-voltage bus.'),
    diagram: 'xfmr-primary',
    guide: 'relaying',
    itemIds: tid ? [tid] : undefined,
    fix: tid ? { label: `Tick ${codes.join(', ')} on ${label(design, tid)}`, apply: (d) => withRelays(d, tid, codes) } : undefined,
  };
};

const ratingFuse: FindingHelpFn = (f, { design }) => {
  const fuse = byId(design, f.itemIds?.[0]);
  const t = byId(design, f.itemIds?.[1]);
  const small = f.checkId === 'rating.fuse.small';
  let advice = 'Pick the smallest Fuse rating above the transformer’s full-load current at its top rating.';
  if (t) {
    const fla = transformerHVCurrentA(t);
    const max = (3 * Number(t.props.kva)) / (Math.sqrt(3) * t.kv);
    const fit = numOptions('fuse', 'ampRating').find((a) => a >= fla && a <= max);
    advice = fit
      ? `Set Fuse rating to ${fit}E: ${itemLabel(t)} draws up to ${Math.round(fla)} A at its top rating, and the fuse should not be much more than three times its self-cooled current (${Math.round(max)} A).`
      : `No fuse size fits ${itemLabel(t)} (it draws up to ${Math.round(fla)} A); use a circuit switcher or breaker instead.`;
  }
  return {
    what: small
      ? 'The fuse is smaller than the current the transformer carries at full load with its fans running, so it would melt on a hot afternoon with no fault at all.'
      : 'A fuse far above the transformer rating gives poor protection: it would not melt for many faults inside the transformer.',
    steps: steps(fuse && `Select ${itemLabel(fuse)}.`, advice),
    guide: 'primary-protection',
  };
};

const surgeArresterRating: FindingHelpFn = (f, { design, level, review }) => {
  const a = byId(design, f.itemIds?.[0]);
  const margin = f.checkId === 'surge.margin';
  let detail = 'Set MCOV rating to Auto: the game then picks the smallest standard rating that is safe for the system voltage.';
  if (a) {
    const node = review.topo.nodeOfPort.get(`${a.id}:a`);
    const kvNode = (node && review.topo.nodeById.get(node)?.kv) || a.kv;
    const xf = node ? design.items.find((t) => t.kind === 'transformer' && review.topo.nodeOfPort.get(`${t.id}:hv`) === node) : undefined;
    const bil = xf ? Math.min(transformerHvBilKV(xf.kv), voltageClassFor(kvNode).bilKV) : voltageClassFor(kvNode).bilKV;
    const auto = arresterRating(kvNode, level.system.hvEffectivelyGrounded, 0, bil);
    detail =
      auto.ratioL >= LIGHTNING_MARGIN_MIN
        ? `Set MCOV rating to Auto: that picks ${auto.mcovKV} kV${auto.minMcovKV > 0 ? `, the smallest standard rating above the ${auto.minMcovKV.toFixed(1)} kV this ${kvNode} kV system needs (Eq. 5-7)` : ''}, with a protective ratio of ${auto.ratioL.toFixed(2)}.`
        : `Even the lowest safe MCOV (${auto.mcovKV} kV) gives a ratio of only ${auto.ratioL.toFixed(2)} against ${bil} kV BIL here; check the arrester is on the bus it is meant to protect.`;
  }
  return {
    what: margin
      ? `The arrester's protective level is too close to the insulation level (BIL) it protects. The ratio BIL / protective level must be at least ${LIGHTNING_MARGIN_MIN.toFixed(2)} (section 5.8.7); a lower MCOV rating clamps surges lower.`
      : 'The arrester’s maximum continuous operating voltage (MCOV) is below the normal line-to-ground voltage, so it would conduct all the time and fail.',
    steps: steps(a && `Select ${itemLabel(a)}.`, detail),
    guide: 'arresters-detail',
  };
};

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export const FINDING_HELP: Record<string, FindingHelpFn> = {
  // ---------------------------------------------------------------- site and placement
  'site.bounds': (f, { design }) => {
    const it = byId(design, f.itemIds?.[0]);
    return {
      what: `Everything has to be built on the land the cooperative has acquired, and part of this ${it ? 'equipment' : 'bus'} lies outside the property line.`,
      steps: it
        ? [`Drag ${itemLabel(it)} with Select / move until its whole outline is inside the property.`, 'Buses attached to its terminals follow it; check they stay inside too.']
        : ['Select the bus and press Del (or use Erase).', 'Redraw it with the Bus tool inside the property outline.'],
      guide: 'site-design',
    };
  },
  'site.nobuild': (f, { design, level }) => {
    const it = byId(design, f.itemIds?.[0]);
    const area = (level.site.noBuild ?? []).find((nb) => f.title.includes(`(${nb.label})`))?.label ?? 'restricted area';
    return {
      what: `Nothing may be built in the ${area}: the site plan reserves it (a creek, an easement or similar).`,
      steps: it
        ? [`Drag ${itemLabel(it)} with Select / move until its outline is clear of the hatched ${area}.`, 'Buses attached to it follow; reroute any that still cross the area.']
        : ['Select the bus and press Del (or use Erase).', `Redraw it around the ${area}, not across it.`],
      guide: 'site-design',
    };
  },
  'place.overlap': (f, { design }) => {
    let [a, b] = itemsOf(design, f.itemIds ?? []);
    if (b?.locked && a && !a.locked) [a, b] = [b, a];
    return {
      what: 'Two pieces of equipment cannot stand on the same ground: each needs its own foundation and room around it.',
      steps: steps(
        b && a ? `Drag ${itemLabel(b)} with Select / move to an open spot so its outline no longer touches ${itemLabel(a)}.` : 'Drag one of the two items to an open spot.',
        'Leave room for the bus between them; buses attached to its terminals follow it.',
      ),
    };
  },

  // ---------------------------------------------------------------- fence
  'fence.missing': (_f, { level }) => {
    const b = fenceRequiredDistance(0, level.system.hvKV, level.site.altitudeM);
    return {
      what: 'Energized equipment must be enclosed by the security fence, with live parts kept out of the Fig. 4-21 safety clearance zone along its inside so nobody can reach them through or over the fence.',
      steps: steps(
        'Pick the Fence tool and drag a rectangle around all the equipment, with a few metres to spare on every side.',
        `Turn on the Fence zone overlay: no live part or bus may sit in the red band${b > 0 ? ` (about ${m(b)} wide at ${hvText(level)} for low live parts)` : ''}.`,
        `With nothing selected, set the gate in the Inspector: Gate side towards the road (${DIR[level.site.roadSide]}), wide enough to bring a transformer in.`,
      ),
      tool: 'fence',
      overlay: 'fenceZone',
      guide: 'fence-clearance',
    };
  },
  'fence.bounds': () => ({
    what: 'The fence has to stand on the cooperative’s own land, and part of it is outside the property line.',
    steps: ['Pick the Fence tool and drag a new rectangle that stays inside the property outline (it replaces the old fence).', 'If the yard no longer fits, move equipment closer together first, keeping the clearances.'],
    tool: 'fence',
    overlay: 'fenceZone',
    guide: 'fence-clearance',
  }),
  'fence.outside': (f, { design }) => {
    const it = byId(design, f.itemIds?.[0]);
    return {
      what: it
        ? `Energized equipment and the control house belong inside the fenced yard, where only qualified people can reach them. ${itemLabel(it)} is outside it.`
        : 'Station bus belongs inside the fenced yard, and part of this bus is outside it.',
      steps: steps(
        it ? `Pick the Fence tool and drag a larger rectangle that encloses ${itemLabel(it)}, leaving room for the safety zone.` : 'Pick the Fence tool and drag a larger rectangle: every corner point of the bus must be inside the fence.',
        it && !it.locked ? `Or drag ${itemLabel(it)} inside the fence with Select / move.` : !it ? 'Or reroute the bus so it stays inside.' : null,
        'Check the Fence zone overlay afterwards: live parts must also clear the red band.',
      ),
      tool: 'fence',
      overlay: 'fenceZone',
      guide: 'fence-clearance',
    };
  },
  'fence.clearance': (f, { design, level }) => {
    const alt = level.site.altitudeM;
    const it = byId(design, f.itemIds?.[0]);
    const c = condById(design, f.conductorIds?.[0]);
    let step = 'Move it farther from the fence, or enlarge the fence with the Fence tool.';
    if (it) {
      const need = fenceRequiredDistance(footprintOf(it).liveHeight, it.kv, alt);
      step = `Keep the outline of ${itemLabel(it)} at least ${m(need)} from the fence: ${it.locked ? 'it is fixed in place, so redraw the fence farther out with the Fence tool' : 'drag it inward, or redraw the fence farther out with the Fence tool'}.`;
    } else if (c) {
      const need = fenceRequiredDistance(busHeight(c.kv, c.elevation), c.kv, alt);
      const s = clearanceClassFor(c.kv).rigidBusPhaseSpacingM;
      step = `Keep the outer phase at least ${m(need)} from the fence; where the bus runs along the fence its centre line needs about ${m(need + s)} (phase spacing ${m(s)}). Reroute it inward or redraw the fence farther out.`;
    }
    return {
      what: 'Live parts are inside the Fig. 4-21 safety clearance zone, close enough to the fence that someone outside could reach them or a tool pushed through the fence could touch them.',
      steps: ['Turn on the Fence zone overlay to see the red band along the fence.', step],
      tool: 'fence',
      overlay: 'fenceZone',
      guide: 'fence-clearance',
    };
  },
  'site.expansion': (_f, { design, level }) => ({
    what: 'The long-range plan adds equipment in the reserved area. Section 4.2.3 asks for the initial layout to accommodate that forecast, so the area has to be inside the fence from the start.',
    steps: steps(
      'Pick the Fence tool and drag a rectangle that encloses both your equipment and the hatched expansion area.',
      design.fence && level.expansionArea && !rectContainsRect(design.fence.rect, level.expansionArea) && 'The whole reserved rectangle must be inside, not only part of it.',
      'Keep the area itself empty.',
    ),
    tool: 'fence',
    guide: 'removal-expansion',
  }),
  'site.expansion.blocked': (f, { design }) => {
    const its = itemsOf(design, f.itemIds ?? []);
    return {
      what: 'The reserved area must stay clear so the next bay can be added without rebuilding the station (section 4.2.3).',
      steps: steps(
        its.length ? `Drag ${names(its)} out of the hatched expansion area.` : null,
        f.conductorIds?.length ? 'Reroute the buses that cross the area around it, not through it.' : null,
        'A bus may end at the edge of the area, ready to be extended later, but not run inside it.',
      ),
      guide: 'removal-expansion',
    };
  },

  // ---------------------------------------------------------------- clearances
  'clear.phase': (f, { design }) => {
    const cs = (f.conductorIds ?? []).map((id) => condById(design, id)).filter((c): c is Conductor => !!c);
    const need = Math.max(0, ...cs.map((c) => clearanceClassFor(c.kv).minMetalToMetalM));
    const centre = need + cs.reduce((s, c) => s + clearanceClassFor(c.kv).rigidBusPhaseSpacingM, 0);
    return {
      what: 'Two buses that belong to different circuits come too close. Their outer phases need the Table 4-7 minimum metal-to-metal clearance so a flashover cannot jump from one to the other.',
      steps: steps(
        `Move one of the buses so the outer phases are at least ${m(need)} apart. Each bus is as wide as twice its phase spacing, so leave about ${m(centre)} between the centre lines of parallel runs.`,
        'Where two buses have to cross, select one and set Elevation to High in the Inspector so it passes over the other.',
        'If they are meant to be the same circuit, join them: end one bus on the other.',
      ),
      guide: 'clearances',
    };
  },
  'clear.ground': (f, { design }) => {
    const it = byId(design, f.itemIds?.[0]);
    const c = condById(design, f.conductorIds?.[0]);
    const need = c ? clearanceClassFor(c.kv).minToGroundedPartsM : 0;
    const s = c ? clearanceClassFor(c.kv).rigidBusPhaseSpacingM : 0;
    const mast = it?.kind === 'mast';
    const highClears = !!c && !!it && !mast && busHeight(c.kv, 'high') >= footprintOf(it).height + need;
    return {
      what: `Grounded structures such as ${mast ? 'lightning masts' : 'the control house'} must keep the Table 4-7 clearance to grounded parts from energized bus, or a flashover to ground can occur.`,
      steps: steps(
        `Move ${it ? itemLabel(it) : 'the structure'} or reroute the bus so the outer phase is at least ${m(need)} from it (about ${m(need + s)} from the bus centre line).`,
        mast && 'Masts are checked in plan whatever their height, so raising the bus does not help; pick a mast position that still covers the equipment (Shielding overlay).',
        highClears && c?.elevation === 'low' && 'Or select the bus and set Elevation to High: it then passes over the roof with enough clearance.',
      ),
      guide: 'clearances',
    };
  },
  'clear.equipment': (f, { design }) => {
    const it = byId(design, f.itemIds?.[0]);
    const c = condById(design, f.conductorIds?.[0]);
    const metal = c ? Math.max(clearanceClassFor(c.kv).minMetalToMetalM, clearanceClassFor(it?.kv || c.kv).minMetalToMetalM) : 0;
    const need = metal * 0.5;
    const s = c ? clearanceClassFor(c.kv).rigidBusPhaseSpacingM : 0;
    const highClears = !!c && !!it && c.elevation === 'low' && busHeight(c.kv, 'high') - footprintOf(it).height >= metal + 0.5;
    return {
      what: `A bus that is not connected to ${it ? itemLabel(it) : 'this equipment'} passes too close to it. Energized parts of different circuits need the Table 4-7 clearance between them.`,
      steps: steps(
        `Reroute the bus so its outer phase stays at least ${m(need)} from the equipment outline (about ${m(need + s)} from the bus centre line).`,
        highClears ? 'Or select the bus and set Elevation to High in the Inspector: it then passes over the equipment with enough vertical clearance.' : it && !it.locked ? `Or move ${itemLabel(it)} away from the bus.` : null,
      ),
      guide: 'clearances',
    };
  },

  // ---------------------------------------------------------------- equipment removal
  'layout.removal': (f, { design }) => {
    const it = byId(design, f.itemIds?.[0]);
    const narrow = it ? Math.min(itemRect(it).w, itemRect(it).h) : 0;
    const gate = design.fence?.gate;
    return {
      what: `${it ? itemLabel(it) : 'This equipment'} must be able to leave the yard on a truck if it fails. Section 4.2.6 asks for a clear route from each large piece of equipment to the gate.`,
      steps: steps(
        'Turn on the Removal overlay to see which routes are blocked.',
        it && `Keep a lane at least ${m(narrow)} wide (the narrow side of ${itemLabel(it)}) from it to the gate, clear of other equipment.`,
        'Low buses across the lane block it. Select them and set Elevation to High in the Inspector, or route them around the lane; buses that end on its own terminals do not count.',
        gate && it && gate.width + 1e-6 < narrow
          ? `The gate is only ${m(gate.width)} wide: with nothing selected, set Gate width to at least ${m(Math.ceil(narrow * 2) / 2)} in the Inspector.`
          : 'With nothing selected, check Gate side and Gate offset in the Inspector so the gate opens onto the lane.',
      ),
      overlay: 'removal',
      guide: 'removal-expansion',
    };
  },

  // ---------------------------------------------------------------- connectivity
  'conn.port': (f, { design, level, review }) => {
    const it = byId(design, f.itemIds?.[0]);
    const name = it ? itemLabel(it) : 'the equipment';
    const ports = it ? review.topo.unconnectedPorts.filter((p) => p.itemId === it.id).map((p) => p.portId) : [];
    const single = !!it && footprintOf(it).ports.length === 1;
    const portName = (p: string) => (p === 'hv' ? 'HV terminal' : p === 'lv' ? 'LV terminal' : single ? 'terminal' : `terminal ${p.toUpperCase()}`);
    const portKV = (p: string) => (it ? (p === 'lv' ? Number(it.props.lvKV) || it.kv : it.kv) : level.system.hvKV);
    const which = ports.length ? ports.map(portName).join(' and ') : 'terminal';
    const draw = (p: string | undefined) =>
      `Pick the Bus tool at ${portKV(p ?? 'a')} kV, click the ${p ? portName(p) : 'terminal'} dot on ${name}, and finish on the next piece of equipment or on an existing ${portKV(p ?? 'a')} kV bus.`;
    return {
      what: `Every terminal (the dot on the equipment outline) needs a bus. ${it ? itemLabel(it) : 'This equipment'} has its ${which} unconnected, so it is not part of the circuit yet.`,
      steps: [
        ...(ports.length > 1 && portKV(ports[0]!) !== portKV(ports[1]!) ? ports.map(draw) : [draw(ports[0])]),
        'Click to add corners on the way. A bus connects where it touches a terminal dot, or where one of its ends or corners lies on another bus.',
      ],
      tool: 'bus',
      side: sideOf(level, portKV(ports[0] ?? 'a')),
      guide: 'how-to-play',
    };
  },
  'conn.voltage': (_f, { level }) => ({
    what: 'Equipment and bus rated for different system voltages are joined at one point. Only a transformer can connect two voltage levels.',
    steps: steps(
      'Find the part at the wrong voltage: each bus is coloured by its voltage, and the Inspector shows the kV of whatever you select.',
      'Erase a wrong bus and redraw it with the Bus tool at the right voltage. For equipment, delete it and place it again from the toolbox entry for the right voltage.',
      level.system.lvKV !== undefined && `Join ${hvText(level)} and ${lvText(level)} only through the ${N('transformer')}: its HV terminal is on the left and its LV terminal on the right before rotating.`,
    ),
    guide: 'how-to-play',
  }),
  'conn.shorted': (f, { design }) => {
    const name = label(design, f.itemIds?.[0]);
    return {
      what: `Both terminals of ${name} connect to the same bus, so current flows around it and the device does nothing.`,
      steps: [
        `Look at the buses at ${name}: one probably runs straight past both terminal dots, or a bus joins its two sides.`,
        'Erase that bus and draw separate buses, one from each terminal to its own circuit.',
        `For a bypass, put ${N('hookstick_switch')} or a ${N('switch')} with Normally open ticked between the two sides instead of a plain bus.`,
      ],
      guide: 'bypass',
    };
  },
  'conn.rating': (f, { design, level }) => {
    const it = byId(design, f.itemIds?.[0]);
    const v = it ? CATALOG[it.kind].voltages : undefined;
    const ok = it ? voltagesFor(it.kind, level) : [];
    return {
      what: it && v ? `${N(it.kind)} is not made for ${it.kv} kV in the game; it is used from ${v.min} to ${v.max} kV.` : 'This equipment is not made for the voltage it is placed at.',
      steps: steps(
        it && ok.length ? `Delete ${itemLabel(it)} and place it again from the toolbox entry for ${ok.map((k) => `${k} kV`).join(' or ')}.` : null,
        it && !ok.length ? `This project has no voltage that ${N(it.kind)} is made for: delete it and use different equipment.` : null,
        'Reconnect its buses afterwards.',
      ),
    };
  },
  'conn.nosource': (_f, { design, level }) => {
    const lines = design.items.filter((i) => i.kind === 'line_terminal' && i.props.flow !== 'out');
    return {
      what: 'Nothing is connected to the incoming line, so the station has no supply. The line ends on its dead-end structure; the station starts with a bus from that terminal.',
      steps: steps(
        `Pick the Bus tool at ${hvText(level)}.`,
        `Click the terminal dot of ${lines.length ? names(lines) : 'the incoming line terminal'} and draw into the yard to the next piece of equipment, usually a ${N('switch')}.`,
        level.system.lvKV !== undefined
          ? `Carry on from the switch through the transformer primary protection to the ${N('transformer')}'s HV terminal.`
          : 'Each line then joins the station bus through its breakers.',
      ),
      tool: 'bus',
      side: 'hv',
      diagram: level.system.lvKV !== undefined ? 'tap' : undefined,
      guide: 'basic-distribution',
      itemIds: lines.map((l) => l.id),
    };
  },
  'conn.feederunassigned': (f, { design, level }) => {
    const used = new Set(design.items.filter((i) => i.kind === 'feeder_exit').map((i) => String(i.props.feeder ?? '')));
    const free = level.system.feeders.find((fd) => !used.has(fd.name));
    const id = f.itemIds?.[0];
    return {
      what: 'Each getaway is where one distribution feeder leaves the station. The game cannot count this one until you say which feeder it carries.',
      steps: [`Select ${label(design, id)}.`, `In the Inspector, set Feeder to ${free ? free.name : 'one of the feeders listed in the project brief'}.`],
      fix: free && id ? { label: `Assign it to ${free.name}`, apply: (d) => withProps(d, id, { feeder: free.name }) } : undefined,
    };
  },
  'conn.dead': (f, { design, review }) => {
    const id = f.itemIds?.[0];
    const name = label(design, id);
    const node = review.topo.loads.find((l) => l.itemId === id)?.node ?? null;
    const no = design.items.filter((i) => (i.kind === 'switch' || i.kind === 'hookstick_switch' || i.kind === 'breaker') && i.props.normallyOpen);
    const viaNO = !!node && review.topo.reach({ closeNormallyOpen: true }).has(node);
    // A single normally-open device that, closed on its own, would energize the getaway.
    const culprits = viaNO ? no.filter((x) => review.topo.reach({ closeNormallyOpen: true, open: new Set(no.filter((y) => y !== x).map((y) => y.id)) }).has(node!)) : [];
    const blame = culprits.length ? culprits : no;
    const loose = itemsOf(design, uniq(review.topo.unconnectedPorts.map((p) => p.itemId))).filter((x) => x.kind !== 'mobile_pad');
    return {
      what: node
        ? `${name} has a bus on its terminal, but no closed path leads from it back to an incoming line, so its members get no power.`
        : `${name} has no bus on its terminal yet, so nothing feeds it and its members get no power.`,
      steps: steps(
        node ? `Follow the buses back from ${name} towards the incoming line.` : `Pick the Bus tool and draw from the terminal dot of ${name} to the bay or bus that should feed it.`,
        viaNO && `The path is broken by a normally-open device (${names(blame)}). Untick Normally open on the one in the main path; keep it ticked only on bypass and tie switches.`,
        !viaNO && loose.length > 0 && `Terminals with no bus on the way: ${names(loose)}. Draw the missing buses with the Bus tool.`,
        !viaNO && !loose.length && 'Look for a gap: a bus that stops short of a terminal dot or of another bus.',
        'Every series device (switch, fuse, recloser, regulator, transformer) needs a bus on both terminals.',
      ),
      itemIds: uniq([...(id ? [id] : []), ...(viaNO ? blame : loose).map((x) => x.id)]),
      guide: 'basic-distribution',
    };
  },
  'conn.feedermissing': (f, { design, level }) => {
    const feeder = level.system.feeders.find((fd) => f.title.startsWith(fd.name));
    const name = feeder?.name ?? 'this feeder';
    const unassigned = design.items.filter((i) => i.kind === 'feeder_exit' && !level.system.feeders.some((fd) => fd.name === i.props.feeder));
    return {
      what: `${name}${feeder ? ` (${feeder.customers.toLocaleString('en-US')} members)` : ''} has no getaway, so it is not served. Each feeder leaves the station on its own bay with its own protective device (section 4.3.1).`,
      steps: steps(
        unassigned.length > 0 && `${names(unassigned)} has no feeder yet: select it and set Feeder to ${name}.`,
        `${unassigned.length ? 'Otherwise build' : 'Build'} a feeder bay off the ${lvText(level)} station bus: ${N('switch')}, ${N(pickTool(level, 'recloser', 'breaker') ?? 'recloser')}, ${N('switch')}, then a ${N('feeder_exit')}, joined with ${lvText(level)} bus.`,
        `Select the getaway and set Feeder to ${name} in the Inspector.`,
      ),
      tool: pickTool(level, 'feeder_exit'),
      side: 'lv',
      diagram: 'feeder-bay',
      guide: 'basic-distribution',
      itemIds: unassigned.map((i) => i.id),
    };
  },
  'conn.feederdup': (f, { design, level }) => {
    const exits = itemsOf(design, f.itemIds ?? []);
    const used = new Set(design.items.filter((i) => i.kind === 'feeder_exit').map((i) => String(i.props.feeder ?? '')));
    const free = level.system.feeders.find((fd) => !used.has(fd.name));
    return {
      what: 'Each feeder leaves the substation once. Two getaways carrying the same feeder would tie it back to the station twice.',
      steps: steps(
        `Select ${exits.length > 1 ? itemLabel(exits[exits.length - 1]!) : 'one of the getaways'} and set Feeder to ${free ? free.name : 'a feeder that has no getaway yet'}.`,
        !free && 'If every feeder already has a getaway, delete the extra one.',
      ),
      guide: 'basic-distribution',
    };
  },
  'conn.sideentry': (f, { design }) => {
    const id = f.itemIds?.[0];
    const cid = f.conductorIds?.[0];
    return {
      what: 'The bus reaches this terminal from the side, so its three phases arrive lined up along the terminal instead of across it and the connections to the bushings squeeze together or cross instead of keeping the phase spacing. Phase-to-phase clearance (Table 4-7) applies to those connections too.',
      steps: [
        `Line ${label(design, id)} up with the bus: drag it until its terminal sits exactly on the bus centre line (the bus tool then runs straight in).`,
        'Or redraw the last part of the bus so it leaves the terminal straight out, in the direction the terminal faces, before turning.',
      ],
      diagram: 'straight-entry',
      guide: 'clearances',
      fix: id && cid ? { label: `Line ${label(design, id)} up with the bus`, apply: (d, l) => alignItemToBus(d, l, id, cid) } : undefined,
    };
  },
  'clear.selfphase': (f, { design }) => {
    const cid = f.conductorIds?.[0];
    const id = f.itemIds?.[0];
    return {
      what: 'This bus turns twice within less than two phase spacings (a jog or a tight U-turn), so its outer phases fold into each other. The three phases of one bus need the Table 4-7 metal-to-metal clearance from each other, the same as two separate buses.',
      steps: [
        id ? `Move ${label(design, id)} so its terminals line up with the bus and the jog disappears.` : 'Move the equipment at one end so the bus can run straight.',
        'Or redraw the bus with each sideways step at least twice the phase spacing long.',
      ],
      diagram: 'straight-entry',
      guide: 'clearances',
      fix: id && cid ? { label: `Line ${label(design, id)} up with the bus`, apply: (d, l) => alignItemToBus(d, l, id, cid) } : undefined,
    };
  },

  // ---------------------------------------------------------------- protection arrangement
  'prot.feeder': (f, { design, level }) => {
    const it = byId(design, f.itemIds?.[0]);
    if (it?.kind === 'line_terminal') {
      return {
        what: `Each line leaving the station needs station breakers that can clear a fault on it without dropping the other lines. ${itemLabel(it)} has none of its own.`,
        steps: [
          `Connect ${itemLabel(it)} to the station bus through ${N('breaker')}s, so that opening them separates this line and nothing else. In a ring bus, the line joins the ring between two breakers.`,
          'Check that none of those breakers has Normally open (tie) ticked.',
          `Give each breaker a ${N('switch')} on both sides for maintenance.`,
        ],
        tool: pickTool(level, 'breaker'),
        side: 'hv',
        guide: SCHEME_GUIDE.ring_bus,
      };
    }
    const dev = pickTool(level, 'recloser', 'breaker') ?? 'recloser';
    return {
      what: `${it ? itemLabel(it) : 'This feeder'} has no protective device of its own. Each distribution feeder needs its own ${N('recloser').toLowerCase()} or breaker so a fault on it does not take out the whole substation (section 4.3.1).`,
      steps: steps(
        `Put ${aN(dev)} in the getaway's bay, between the station bus and ${it ? itemLabel(it) : 'the getaway'}.`,
        'One device per feeder: if two getaways hang below the same recloser, split the bus so each has its own bay.',
        `Give the device a ${N('switch')} on each side so it can be maintained.`,
        dev === 'breaker' && 'Leave Normally open (tie) unticked on a feeder breaker.',
      ),
      tool: dev,
      side: 'lv',
      diagram: 'feeder-bay',
      guide: 'basic-distribution',
    };
  },
  'prot.source': (f, { design, level }) => ({
    what: `With several lines feeding the station, a fault on one line must be cleared by breakers at the station so the other lines stay in service (section 12.4.2). ${label(design, f.itemIds?.[0])} joins the bus without breakers that can separate it.`,
    steps: [
      `Connect ${label(design, f.itemIds?.[0])} to the station bus through ${N('breaker')}s, so that opening them separates this line and nothing else.`,
      'In a ring bus each line joins the ring between two breakers; switches alone cannot clear a fault.',
      'Check that none of those breakers has Normally open (tie) ticked.',
    ],
    tool: pickTool(level, 'breaker'),
    side: 'hv',
    guide: SCHEME_GUIDE.ring_bus,
  }),
  'prot.primary': (f, { design, level }) => {
    const t = byId(design, f.itemIds?.[0]);
    const p = primaryProtectionSteps(level, t);
    return {
      what: `${t ? itemLabel(t) : 'The transformer'} has nothing on its primary that can clear a fault in the transformer or on the low-voltage bus. Power fuses, a circuit switcher or a circuit breaker does this job (section 4.3.2).`,
      steps: p.steps,
      tool: p.tool,
      side: 'hv',
      diagram: 'xfmr-primary',
      guide: 'primary-protection',
    };
  },

  // ---------------------------------------------------------------- auxiliary systems
  'aux.dc': (_f, { design, level }) => {
    const houses = design.items.filter((i) => i.kind === 'control_house');
    return {
      what: 'Power circuit breakers and circuit switchers trip from relays powered by the station battery. Without DC control power they cannot open on a fault.',
      steps: houses.length
        ? [`Select ${itemLabel(houses[0]!)}.`, 'Tick Station battery & charger (125 V DC) in the Inspector.']
        : [`Place a ${N('control_house')} inside the fence, clear of the buses (it is a grounded structure).`, 'Keep Station battery & charger (125 V DC) ticked in the Inspector.'],
      tool: pickTool(level, 'control_house'),
      guide: 'auxiliary',
      itemIds: houses.length ? [houses[0]!.id] : undefined,
    };
  },
  'aux.ac': (_f, { level }) => ({
    what: 'The AC auxiliary system (battery charger, heaters, lighting, fans) needs a reliable source, usually a station service transformer fed from the station bus.',
    steps: [`Place a ${N('station_service')} (${lvText(level)}) near the control house.`, `Draw a short ${lvText(level)} bus from its terminal to the station bus, on the source side of the feeder reclosers.`],
    tool: pickTool(level, 'station_service'),
    side: 'lv',
    guide: 'auxiliary',
  }),
  'maint.isolation': (f, { design, level }) => {
    const name = label(design, f.itemIds?.[0]);
    return {
      what: `${name} cannot be de-energized for maintenance without shutting down more of the station. It needs disconnect switches on both its source and load sides (section 4.3.1).`,
      steps: [
        `Put a ${N('switch')} (or ${N('hookstick_switch')} at distribution voltage) right next to each terminal of ${name}, each joined to it by its own short bus.`,
        `Opening the two switches must leave ${name} dead while every other feeder stays on, so do not connect anything else between a switch and the device.`,
      ],
      tool: pickTool(level, 'switch', 'hookstick_switch'),
      diagram: 'feeder-bay',
      guide: 'basic-distribution',
    };
  },
  'volt.regulation': (_f, { design, level }) => {
    const xf = design.items.filter((i) => i.kind === 'transformer');
    return {
      what: 'Long rural feeders sag in voltage under load, so the station has to regulate it: an LTC transformer or bus regulators for the whole bus, or a regulator bank on each feeder (section 4.3.3).',
      steps: steps(
        xf.length > 0 && `Bus regulation: select ${xf.length > 1 ? `each transformer (${names(xf)})` : names(xf)} and tick Load tap changer (LTC) in the Inspector.`,
        pickTool(level, 'regulator') && `Or place ${N('regulator')} in series between the transformer LV terminal and the station bus, so every feeder is fed through them.`,
        pickTool(level, 'regulator') && 'Feeder regulation: one regulator bank in each feeder bay instead.',
        'The highlighted getaways are the ones still fed without regulation.',
      ),
      tool: pickTool(level, 'regulator'),
      side: 'lv',
      diagram: 'regulator-bypass',
      guide: 'voltage-regulation',
    };
  },

  // ---------------------------------------------------------------- surge arresters
  'surge.xfmr.hv': (f, { design, level, review }) => {
    const t = byId(design, f.itemIds?.[0]);
    const fuses = t ? itemsOf(design, review.facts.primaryProtection.get(t.id) ?? []).filter((x) => x.kind === 'fuse') : [];
    const name = t ? itemLabel(t) : 'the transformer';
    return {
      what: `Surge arresters belong as close as practical to the transformer’s high-voltage bushings, where they limit lightning and switching surges before they reach the winding (section 4.3.5). ${name} has none.`,
      steps: fuses.length
        ? [
            `Place a ${N('arrester')} (${hvText(level)}) and connect its terminal to the bus between the disconnect switch and ${names(fuses)}: the line side of the fuses.`,
            `Keep it within ${ARRESTER_NEAR_M} m of ${name}'s HV terminal.`,
            'Arresters on the transformer side of the fuses would send surge current through the fuse links.',
          ]
        : [
            `Select ${name} and set Tank-mounted surge arresters to HV and LV sides in the Inspector.`,
            `Or place a ${N('arrester')} on the ${hvText(level)} bus within ${ARRESTER_NEAR_M} m of the HV terminal.`,
          ],
      tool: pickTool(level, 'arrester'),
      side: 'hv',
      diagram: 'arresters',
      guide: 'arresters',
    };
  },
  'surge.fuse': (f, { design, level, review }) => {
    const t = byId(design, f.itemIds?.[0]);
    const fuses = t ? itemsOf(design, review.facts.primaryProtection.get(t.id) ?? []).filter((x) => x.kind === 'fuse') : [];
    const name = t ? itemLabel(t) : 'the transformer';
    return {
      what: 'With fuse protection, the transformer arresters go on the line side of the fuses, close to the transformer. On the transformer side, surge current flows through the fuse links and can stress or partly melt them (section 4.3.5).',
      steps: [
        `Place a ${N('arrester')} (${hvText(level)}) and connect its terminal to the bus between the disconnect switch and ${fuses.length ? names(fuses) : 'the fuses'}.`,
        `Keep it within ${ARRESTER_NEAR_M} m of ${name}'s HV terminal, so put the fuses close to the transformer.`,
        'The tank-mounted arresters can stay; the finding clears once the line-side stand is there.',
      ],
      tool: pickTool(level, 'arrester'),
      side: 'hv',
      diagram: 'arresters',
      guide: 'arresters',
    };
  },
  'surge.xfmr.lv': (f, { design, level }) => {
    const name = label(design, f.itemIds?.[0]);
    return {
      what: 'Transformers are also sensitive to surges arriving from the distribution side, so they get arresters at the low-voltage bushings as well (section 4.3.5).',
      steps: [`Select ${name} and set Tank-mounted surge arresters to HV and LV sides in the Inspector.`, `Or place a ${N('arrester')} (${lvText(level)}) on the LV bus within ${ARRESTER_NEAR_M} m of the LV terminal.`],
      tool: pickTool(level, 'arrester'),
      side: 'lv',
      diagram: 'arresters',
      guide: 'arresters',
    };
  },
  'surge.reg': (f, { design, level }) => {
    const id = f.itemIds?.[0];
    const name = label(design, id);
    return {
      what: 'Voltage regulators need surge protection too; arresters are normally mounted directly on the regulator tanks (section 4.3.5).',
      steps: [`Select ${name} and tick Tank-mounted arresters in the Inspector.`, `Or place a ${N('arrester')} (${lvText(level)}) on the bus at either side, within ${ARRESTER_NEAR_M} m.`],
      diagram: 'arresters',
      guide: 'arresters',
      fix: id ? { label: `Tick Tank-mounted arresters on ${name}`, apply: (d) => withProps(d, id, { arresters: true }) } : undefined,
    };
  },
  'surge.mcov': surgeArresterRating,
  'surge.margin': surgeArresterRating,
  'surge.class': (f, { design }) => {
    const a = byId(design, f.itemIds?.[0]);
    const dist = String(a?.props.class) === 'distribution';
    return {
      what: dist
        ? 'Distribution-class arresters may be used only on the low-voltage side, on the load side of the feeder reclosers or breakers (section 5.8.2). Elsewhere they cannot handle the station’s surge energy and fault current.'
        : 'Station-class arresters are recommended for substations of 10 MVA and above, systems above 150 kV, and where the fault current exceeds what intermediate-class arresters can safely vent (section 5.8.2).',
      steps: steps(a && `Select ${itemLabel(a)}.`, 'Set Arrester class to Station in the Inspector.'),
      guide: 'arresters-detail',
    };
  },
  'surge.line': (f, { design, level }) => {
    const it = byId(design, f.itemIds?.[0]);
    return {
      what: 'Arresters at each line entrance stop surges travelling in on the line before they reach the station equipment (section 5.8.9).',
      steps: [
        `Place a ${N('arrester')} (${it?.kv ?? level.system.hvKV} kV) beside ${it ? itemLabel(it) : 'the line terminal'}.`,
        `Connect it to the bus between the line terminal and the first switch, within ${ARRESTER_NEAR_M} m of the terminal dot.`,
      ],
      tool: pickTool(level, 'arrester'),
      side: 'hv',
      diagram: 'arresters',
      guide: 'arresters',
    };
  },

  // ---------------------------------------------------------------- protective relaying
  'relay.feeder': relayFeeder,
  'relay.feeder.ground': relayFeeder,
  'relay.line': (f, { design }) => {
    const it = byId(design, f.itemIds?.[0]);
    const hv = (it?.kv ?? 0) >= 69;
    return {
      what: `${it ? itemLabel(it) : 'This breaker'} protects a line but has no relay to trip it. Line breakers need overcurrent, directional overcurrent, distance or pilot relaying chosen for the line (section 12.4.2).`,
      steps: steps(
        it && `Select ${itemLabel(it)}.`,
        hv ? 'Under Protective relays tick 21 Distance, and 67 Directional overcurrent for ground faults.' : 'Under Protective relays tick 50/51 Phase overcurrent (or 67 Directional overcurrent where power can flow both ways).',
        hv && 'Add 85 Pilot where the whole line must be cleared at high speed.',
      ),
      guide: 'relaying',
    };
  },
  'relay.line.distance': (f, { design }) => ({
    what: 'Transmission lines are commonly protected with step-distance relays (21), with a pilot channel (85) where the whole line has to be cleared at high speed. Overcurrent relays alone are slow and hard to coordinate on a network.',
    steps: [`Select ${label(design, f.itemIds?.[0])}.`, 'Under Protective relays tick 21 Distance (and 85 Pilot if the line needs high-speed clearing).'],
    guide: 'relaying',
  }),
  'relay.bus': (f, { design }) => ({
    what: 'Bus-tie and bus breakers need relays too: overcurrent or bus differential (87B) relaying lets them clear a bus fault selectively instead of leaving it to the line or transformer protection.',
    steps: [`Select ${label(design, f.itemIds?.[0])}.`, 'Under Protective relays tick 50/51 Phase overcurrent (and 50N/51N), or 87B Bus differential.'],
    guide: 'relaying',
  }),
  'relay.xfmr': relayXfmr,
  'relay.xfmr.diff': relayXfmr,
  'relay.fuse.size': (f, { design, level }) => {
    const name = label(design, f.itemIds?.[0]);
    const dev = pickTool(level, 'circuit_switcher', 'breaker');
    return {
      what: `${name} is larger than about 30 MVA, beyond what fuses can protect (section 12.4.4.1). A transformer this size needs relay protection with a circuit switcher or breaker on its primary.`,
      steps: steps(
        dev ? `Delete the transformer-primary Power Fuses and place a ${N(dev)} (${hvText(level)}) in their place, then reconnect the buses.` : 'Choose a smaller transformer if the load forecast allows; this project offers no relay-tripped device.',
        dev && `Select ${name} and tick 87T, 63 and 50/51 under Protective relays.`,
        dev && 'Or choose a smaller transformer if the load forecast allows.',
      ),
      tool: dev,
      side: 'hv',
      diagram: 'xfmr-primary',
      guide: 'primary-protection',
    };
  },
  'relay.fuse.advice': (f, { design, level }) => {
    const dev = pickTool(level, 'circuit_switcher', 'breaker');
    return {
      what: `${label(design, f.itemIds?.[0])} is in the size range (10 MVA and up) where cooperatives usually protect the transformer with relays instead of fuses (section 12.4.4.1). Fuses are cheaper but do little for faults inside the transformer. This is advice, not an error.`,
      steps: steps(
        'To keep fuses: nothing to do. The finding is informational and does not cost stars.',
        `To use relays instead: replace the transformer-primary Power Fuses with a ${dev ? N(dev) : 'Circuit Switcher or Power Circuit Breaker'}${dev ? '' : ' (if this project offers them)'}, with a disconnect switch on its line side.`,
        'Then select the transformer and tick its relays under Protective relays: 87T (differential), 63 (sudden pressure) and 50/51.',
      ),
      diagram: 'xfmr-primary',
      guide: 'primary-protection',
    };
  },

  // ---------------------------------------------------------------- ratings
  'rating.xfmr.now': (f, { design, level, review }) => {
    const t = byId(design, f.itemIds?.[0]);
    const load = t ? review.calc.transformerLoadMVA.get(t.id) : undefined;
    const sug = t && load ? transformerSuggestion(t, load.horizon) : null;
    return {
      what: `${t ? itemLabel(t) : 'The transformer'} cannot carry today’s peak load even with its fans running${isHighAltitude(level.site.altitudeM) ? ' and derated for altitude' : ''}. It would overheat on the first hot afternoon.`,
      steps: steps(
        t && `Select ${itemLabel(t)}.`,
        load ? `Pick a larger Self-cooled (OA) rating or more Cooling stages: the top rating must cover ${load.now.toFixed(1)} MVA today and ${load.horizon.toFixed(1)} MVA in year ${level.system.horizonYears}.` : 'Pick a larger Self-cooled (OA) rating or more Cooling stages.',
        sug && `For example ${sug}.`,
      ),
      guide: 'transformers',
    };
  },
  'rating.xfmr.horizon': (f, { design, level, review }) => {
    const t = byId(design, f.itemIds?.[0]);
    const load = t ? review.calc.transformerLoadMVA.get(t.id) : undefined;
    const sug = t && load ? transformerSuggestion(t, load.horizon) : null;
    return {
      what: `The load grows ${level.system.growthPct}% a year, and ${t ? itemLabel(t) : 'the transformer'} will be overloaded within ${level.system.horizonYears} years. The bulletin asks for the station to be planned for the long-range forecast (section 2.1).`,
      steps: steps(
        t && `Select ${itemLabel(t)}.`,
        load ? `Pick a larger Self-cooled (OA) rating or more Cooling stages so the top rating covers ${load.horizon.toFixed(1)} MVA.` : 'Pick a larger Self-cooled (OA) rating or more Cooling stages.',
        sug && `For example ${sug}.`,
      ),
      guide: 'transformers',
    };
  },
  'rating.xfmr.oversized': (f, { design, level, review }) => {
    const t = byId(design, f.itemIds?.[0]);
    const load = t ? review.calc.transformerLoadMVA.get(t.id) : undefined;
    const sug = t && load ? transformerSuggestion(t, load.horizon, Number(t.props.kva)) : null;
    return {
      what: `${t ? itemLabel(t) : 'The transformer'} is far bigger than the forecast needs. That is safe, but a smaller unit would cost less. This is advice, not an error.`,
      steps: steps(
        'To keep it: nothing to do. The finding is informational.',
        load && `To save money, pick a smaller Self-cooled (OA) rating whose top rating still covers ${load.horizon.toFixed(1)} MVA in year ${level.system.horizonYears}${sug ? `, for example ${sug}` : ''}.`,
      ),
      guide: 'transformers',
    };
  },
  'rating.recloser.std': (f, ctx) => {
    const it = byId(ctx.design, f.itemIds?.[0]);
    const r = it ? recloserRating(it, ctx) : null;
    return {
      what: 'Reclosers come in standard combinations of continuous and interrupting rating (Tables 5-60 and 5-61). This one is set to a combination that is not made.',
      steps: steps(it && `Select ${itemLabel(it)}.`, r ? `Pick Standard rating ${recloserText(r)} in the Inspector: the nearest standard rating that still carries the load and interrupts the available fault current.` : 'Pick one of the listed ratings under Standard rating in the Inspector.'),
      guide: 'reclosers',
      fix: it && r ? { label: `Set ${itemLabel(it)} to ${recloserText(r)}`, apply: (d) => withProps(d, it.id, r) } : undefined,
    };
  },
  'rating.interrupt': (f, ctx) => {
    const it = byId(ctx.design, f.itemIds?.[0]);
    const { faultKA } = it ? dutyOf(ctx.review, it.id) : { faultKA: 0 };
    let fix: HelpFix | undefined;
    let step = 'Pick a higher interrupting rating in the Inspector.';
    if (it?.kind === 'recloser') {
      const r = recloserRating(it, ctx);
      if (r) {
        step = `Pick Standard rating ${recloserText(r)} (at least ${faultKA.toFixed(1)} kA) in the Inspector.`;
        fix = { label: `Set ${itemLabel(it)} to ${recloserText(r)}`, apply: (d) => withProps(d, it.id, r) };
      } else step = `No standard recloser rating interrupts ${faultKA.toFixed(1)} kA here; use a ${N('breaker')} if the project offers one.`;
    } else if (it) {
      const field = it.kind === 'breaker' ? 'Short-circuit rating' : 'Interrupting rating';
      const ka = numOptions(it.kind, 'interruptingKA').find((v) => v >= faultKA - 1e-6);
      if (ka !== undefined) {
        step = `Set ${field} to ${ka} kA in the Inspector (the available fault current is ${faultKA.toFixed(1)} kA).`;
        fix = { label: `Set ${itemLabel(it)} to ${ka} kA`, apply: (d) => withProps(d, it.id, { interruptingKA: ka }) };
      } else step = `No ${N(it.kind)} rating covers ${faultKA.toFixed(1)} kA; use a device with a higher rating.`;
    }
    return {
      what: 'A protective device must be able to interrupt the largest fault current available where it is installed (section 5.3.3). Otherwise it could fail violently while clearing a fault.',
      steps: steps(it && `Select ${itemLabel(it)}.`, step),
      guide: it?.kind === 'recloser' ? 'reclosers' : 'breakers',
      fix,
    };
  },
  'rating.continuous': (f, { design, level, review }) => {
    const it = byId(design, f.itemIds?.[0]);
    let step = 'Pick a higher Continuous current in the Inspector.';
    if (it) {
      const { amps } = dutyOf(review, it.id);
      const fac = currentSiteFactor(it.kind, level.site.altitudeM);
      const needA = amps / fac;
      if (it.kind === 'recloser') {
        step = `Pick a Standard rating with at least ${Math.ceil(needA)} A continuous in the Inspector.`;
      } else {
        const a = numOptions(it.kind, 'continuousA').find((v) => v >= needA - 1e-6);
        step = a !== undefined ? `Set Continuous current to ${a} A in the Inspector (about ${Math.round(amps)} A flows at the year-${level.system.horizonYears} peak${fac < 1 ? `; ratings are derated ×${fac.toFixed(3)} at this altitude` : ''}).` : `No ${N(it.kind)} rating carries ${Math.round(amps)} A; split the load or use different equipment.`;
      }
    }
    return {
      what: `${it ? itemLabel(it) : 'This device'} will carry more current at the forecast peak than it is rated for, so it would overheat.`,
      steps: steps(it && `Select ${itemLabel(it)}.`, step),
      guide: it?.kind === 'recloser' ? 'reclosers' : it?.kind === 'switch' || it?.kind === 'hookstick_switch' ? 'air-switches' : 'breakers',
    };
  },
  'rating.regulator': (f, { design, level, review }) => {
    const it = byId(design, f.itemIds?.[0]);
    let step = 'Pick a larger Rated current (at ±10%) or a narrower Regulation range in the Inspector.';
    if (it) {
      const { amps } = dutyOf(review, it.id);
      const fac = currentSiteFactor('regulator', level.site.altitudeM);
      const fits = (props: Props) => regulatorCapacityA({ ...it, props: { ...it.props, ...props } }) * fac >= amps - 1e-6;
      const rated = numOptions('regulator', 'ratedA').find((a) => fits({ ratedA: a }));
      const range = numOptions('regulator', 'rangePct')
        .reverse()
        .find((r) => fits({ rangePct: r }));
      const narrower = range !== undefined && range !== Number(it.props.rangePct) ? range : undefined;
      const flow = `about ${Math.round(amps)} A flows at the year-${level.system.horizonYears} peak`;
      step =
        rated !== undefined
          ? `Set Rated current (at ±10%) to ${rated} A${narrower !== undefined ? `, or keep it and narrow Regulation range to ±${narrower}%` : ''} (${flow}).`
          : narrower !== undefined
            ? `Narrow Regulation range to ±${narrower}% (${flow}).`
            : `No regulator size here carries ${Math.round(amps)} A; regulate each feeder separately instead.`;
    }
    return {
      what: 'A regulator bank carries the full current of the feeders it regulates. Narrowing the regulation range lets the same bank carry more (Table 5-28), but this one is too small either way.',
      steps: steps(it && `Select ${itemLabel(it)}.`, step),
      guide: 'regulators',
    };
  },
  'rating.fuse.small': ratingFuse,
  'rating.fuse.large': ratingFuse,
  'rating.bus': (f, { design, level, review }) => {
    const c = condById(design, f.conductorIds?.[0]);
    const node = c ? review.topo.nodeOfConductor.get(c.id) : undefined;
    const amps = node ? (review.calc.nodeCurrentA.get(node) ?? 0) : 0;
    const fac = currentSiteFactor('bus', level.site.altitudeM);
    const size = CONDUCTOR_SIZES.find((s) => s.ampacityA * fac >= amps);
    return {
      what: 'This bus carries more current at the forecast peak than its conductor is good for, so it would run too hot (section 4.10.4).',
      steps: steps('Select the bus.', size ? `Set Conductor to ${size.label} or larger in the Inspector (about ${Math.round(amps)} A flows here).` : `Even the largest conductor does not carry ${Math.round(amps)} A; split the load over two bus runs.`),
      guide: 'insulators-conductors',
    };
  },

  // ---------------------------------------------------------------- grounding
  ground: (f) => ({
    what: `Ground grid design advice: ${f.detail}`,
    steps: [SITE_PANEL, 'Adjust the Ground grid settings (mesh spacing, depth, rods) so the grid stays inside the range the bulletin’s equations were checked for.'],
    overlay: 'grounding',
    guide: 'grounding',
  }),
  'ground.missing': (_f, { design }) => ({
    what: 'Every substation needs a ground grid under the yard. During a ground fault it keeps the voltages a person can touch or step across within tolerable limits (section 9.10).',
    steps: [SITE_PANEL, 'Under Ground grid tick Install grid.', 'Then watch the Review panel: it compares the mesh voltage with the tolerable touch voltage as you adjust spacing, rods and surfacing.'],
    overlay: 'grounding',
    guide: 'grounding',
    fix: design.fence
      ? {
          label: 'Install the ground grid',
          apply: (d, l) => {
            const nd: Design = { ...d, groundGrid: { ...d.groundGrid, enabled: true } };
            return nd.fence && evaluateGrounding(nd, l) ? nd : null;
          },
        }
      : undefined,
  }),
  'ground.touch': (_f, ctx) => {
    const g = ctx.review.grounding;
    return {
      what: `During a ground fault, a person touching grounded steel would be exposed to the mesh voltage${g ? ` (${Math.round(g.meshVoltageV).toLocaleString('en-US')} V)` : ''}, which is above the tolerable touch voltage${g ? ` (${Math.round(g.touchTolerableV).toLocaleString('en-US')} V)` : ''} for this fault duration (section 9.8).`,
      steps: [SITE_PANEL, ...groundingRemedies(ctx, 'touch')].slice(0, 5),
      overlay: 'grounding',
      guide: 'grounding',
    };
  },
  'ground.step': (_f, ctx) => {
    const g = ctx.review.grounding;
    return {
      what: `During a ground fault the voltage between a person's feet near the grid edge${g ? ` (${Math.round(g.stepVoltageV).toLocaleString('en-US')} V)` : ''} would exceed the tolerable step voltage${g ? ` (${Math.round(g.stepTolerableV).toLocaleString('en-US')} V)` : ''} (section 9.10.5).`,
      steps: [SITE_PANEL, ...groundingRemedies(ctx, 'step')].slice(0, 5),
      overlay: 'grounding',
      guide: 'grounding',
    };
  },
  'ground.conductor': (_f, { design, level, review }) => {
    const req = review.grounding?.requiredKcmil ?? 0;
    const size = (Object.keys(GROUND_KCMIL) as GroundConductorSize[]).find((s) => GROUND_KCMIL[s] >= req);
    const fmt = (s: GroundConductorSize) => (s.includes('/') ? `${s} AWG` : `${s} kcmil`);
    return {
      what: `Grid conductors must carry the full ground fault current (${level.system.hvGroundFaultKA} kA for ${level.system.faultDurationS} s) without fusing (Eq. 9-11). ${fmt(design.groundGrid.conductor)} copper is too small.`,
      steps: [
        SITE_PANEL,
        req > 0 && size ? `Under Ground grid set Conductor (copper) to ${fmt(size)} or larger (about ${Math.ceil(req)} kcmil is needed).` : `Under Ground grid pick a larger Conductor (copper)${req > 0 ? '; even 500 kcmil is short, so check the fault data' : ''}.`,
      ],
      overlay: 'grounding',
      guide: 'grounding',
    };
  },
  'ground.fenceext': (_f, { design }) => {
    const min = GROUNDING_RULES.perimeterConductorOutsideFenceM.value;
    return {
      what: 'Someone touching the fence from outside stands beyond the yard. Running the perimeter conductor at least 0.91 m (3 ft) outside the fence puts them over the grid, where the ground potential is controlled (section 9.10.10).',
      steps: [SITE_PANEL, `Under Ground grid set Extend beyond fence to at least ${min} m (now ${design.groundGrid.extendBeyondFenceM} m; 1.25 m matches the recommended 4 ft).`],
      overlay: 'grounding',
      guide: 'grounding',
    };
  },
  'ground.fencebond': () => ({
    what: 'A fence that is not bonded to the grid can sit at a very different voltage from the ground under a person touching it. Bond it at corner posts and line posts every 12–15 m (40–50 ft).',
    steps: [SITE_PANEL, 'Under Ground grid tick Fence bonded to grid.'],
    overlay: 'grounding',
    guide: 'grounding',
  }),
  'ground.depth': groundDepth,
  'ground.depth-range': groundDepth,
  'ground.ks-depth': groundDepth,
  'ground.surfacethin': groundSurfaceThin,
  'ground.surface-thin': groundSurfaceThin,
  'ground.surface': groundNoSurface,
  'ground.no-surface-layer': groundNoSurface,
  'ground.surface-resistivity': (_f, { level }) => ({
    what: 'The surface layer should have a resistivity of at least 3000 Ω·m, wet or dry (section 9.10.2), so it insulates people’s feet from the ground.',
    steps: level.features.surfacing ? [SITE_PANEL, 'Under Yard surfacing set Material to Crushed rock or Washed granite.'] : ['This project does not offer yard surfacing; nothing to change here.'],
    guide: 'grounding',
  }),
  'ground.cs-out-of-chart': (_f, { design }) => ({
    what: 'The surface layer is so much more resistive than the soil (or so thin or thick) that its Cs factor falls off the edge of Fig. 9-35, so the game reads it at the chart edge. This is information, not an error.',
    steps: [
      'Nothing has to change. Over low-resistivity soil, crushed rock always lands here.',
      `If you want margin, keep the mesh voltage comfortably below the tolerable touch voltage in the Review panel (Thickness is now ${design.surfacing.thicknessM} m).`,
    ],
    guide: 'grounding',
  }),
  'ground.ts-range': () => ({
    what: 'The project’s fault clearing time is outside the 0.03–3.0 s range the body-current equation is based on. It is set by the project, not by your design.',
    steps: ['Nothing to change: the finding notes that the tolerable voltages are less certain for this fault duration.', 'Keep extra margin between the mesh voltage and the tolerable touch voltage.'],
    guide: 'grounding',
  }),
  'ground.spacing-range': (_f, { design }) => ({
    what: 'Grid conductors are normally spaced 3–15 m apart (section 9.10.2). The actual spacing is the fence size divided into equal meshes, so it can come out larger than the value you set.',
    steps: [SITE_PANEL, `Under Ground grid set Mesh spacing D between 3 and 15 m (now ${design.groundGrid.spacingM} m).`],
    overlay: 'grounding',
    guide: 'grounding',
  }),
  'ground.spacing-ratio': (_f, { design }) => ({
    what: 'The grid’s meshes are much longer one way than the other (more than 1:3), outside what section 9.10.2 recommends. This happens when the yard is narrow compared with the mesh spacing.',
    steps: [SITE_PANEL, `Under Ground grid reduce Mesh spacing D (now ${design.groundGrid.spacingM} m) so both directions get several conductors.`],
    overlay: 'grounding',
    guide: 'grounding',
  }),
  'ground.mesh-size': (_f, { design }) => ({
    what: 'The simplified mesh and step voltage equations are checked for meshes 2.5–22.5 m across (section 9.10.8).',
    steps: [SITE_PANEL, `Under Ground grid set Mesh spacing D between 2.5 and 22.5 m (now ${design.groundGrid.spacingM} m).`],
    overlay: 'grounding',
    guide: 'grounding',
  }),
  'ground.mesh-count': (_f, { design }) => ({
    what: 'The simplified equations are checked for at most 40 meshes along a side (section 9.10.8).',
    steps: [SITE_PANEL, `Under Ground grid increase Mesh spacing D (now ${design.groundGrid.spacingM} m).`],
    overlay: 'grounding',
    guide: 'grounding',
  }),
  'ground.area-range': () => ({
    what: 'The grid area is outside the 6.25–10,000 m² range the simplified equations were checked for; a real design of this size would be checked by computer analysis.',
    steps: ['You can keep it: the finding is advice.', 'To stay inside the range, make the fence smaller (Fence tool) or reduce Extend beyond fence in the site settings.'],
    overlay: 'grounding',
    guide: 'grounding',
  }),
  'ground.rod-length': () => ({
    what: `Ground rods should be at least ${GROUNDING_RULES.rodMinLengthM.value} m (8 ft) long (section 9.10.2) to reach moist, stable soil.`,
    steps: [SITE_PANEL, `Under Ground grid set Rod length to at least ${GROUNDING_RULES.rodMinLengthM.value} m.`],
    overlay: 'grounding',
    guide: 'grounding',
  }),
  'ground.rod-current': (_f, { design, review }) => {
    const max = GROUNDING_RULES.rodMaxAverageCurrentA.value;
    const need = review.grounding ? Math.ceil(review.grounding.gridCurrentA / max) : 0;
    return {
      what: `Each rod should carry no more than about ${max} A of the grid current on average (section 9.10.2); too few rods would overheat the soil around them.`,
      steps: [SITE_PANEL, need > 0 ? `Under Ground grid set Ground rods to at least ${need} (now ${design.groundGrid.rodCount}).` : 'Under Ground grid add Ground rods.'],
      overlay: 'grounding',
      guide: 'grounding',
    };
  },
  'ground.no-rods': (_f, { design }) => ({
    what: 'Ground rods reach lower, more stable soil and help most at the perimeter, where step voltages are highest. Section 9.10.3 suggests rods at the corners and at every other junction around the edge.',
    steps: [SITE_PANEL, `Under Ground grid set Ground rods to about ${suggestedRods(design)}: one at each corner and one at every other junction around the edge (the review spreads them around the perimeter).`],
    overlay: 'grounding',
    guide: 'grounding',
  }),

  // ---------------------------------------------------------------- lightning shielding
  'shield.exposed': (f, ctx) => shieldingHelp(ctx, f.itemIds ?? []),

  // ---------------------------------------------------------------- site conditions
  'site.altitude': () => ({
    what: 'Thin air insulates and cools less. Above 1000 m the game raises the insulation level and clearances (Tables 4-3 and 4-9) and derates transformer, breaker, recloser, switch, regulator and bus current ratings. This is information, not an error.',
    steps: ['Give equipment more room than on a low site: footprints, bus heights and clearances are larger here.', 'Check ratings against the derated values the Inspector shows for each item (for transformers, Usable at this altitude).'],
    guide: 'high-altitude',
  }),
};

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

export const OBJECTIVE_HELP: Partial<Record<ObjectiveKind, ObjectiveHelpFn>> = {
  feeders_served: (_o, { design, level, review }) => {
    const exits = design.items.filter((i) => i.kind === 'feeder_exit');
    const used = new Set(exits.map((e) => String(e.props.feeder ?? '')));
    const missing = level.system.feeders.filter((fd) => !used.has(fd.name));
    const unassigned = exits.filter((e) => !level.system.feeders.some((fd) => fd.name === e.props.feeder));
    const dead = itemsOf(design, idsOf(findingsOf(review, 'conn.dead')));
    return {
      what: 'Each feeder named in the brief must leave the station on its own getaway, assigned to that feeder and energized from the incoming line.',
      steps: steps(
        `Build one bay per feeder off the ${lvText(level)} station bus: ${N('switch')}, ${N(pickTool(level, 'recloser', 'breaker') ?? 'recloser')}, ${N('switch')}, then a ${N('feeder_exit')}.`,
        'Select each getaway and set Feeder in the Inspector; each feeder leaves on exactly one getaway.',
        missing.length > 0 && `Feeders without a getaway: ${missing.map((fd) => fd.name).join(', ')}.`,
        unassigned.length > 0 && `Getaways with no feeder: ${names(unassigned)}.`,
        dead.length > 0 && `Not energized: ${names(dead)}. Look for a missing bus or a switch left normally open.`,
      ),
      tool: pickTool(level, 'feeder_exit'),
      side: 'lv',
      diagram: 'feeder-bay',
      guide: 'basic-distribution',
      itemIds: uniq([...unassigned, ...dead].map((i) => i.id)),
    };
  },
  feeder_protection: (_o, { design, level, review }) => {
    const unprot = itemsOf(design, idsOf(findingsOf(review, 'prot.feeder')));
    const dev = pickTool(level, 'recloser', 'breaker') ?? 'recloser';
    return {
      what: 'Each distribution feeder needs its own recloser or breaker, so a fault on one feeder trips only that feeder instead of the whole substation (section 4.3.1).',
      steps: steps(
        `Put ${aN(dev)} in each feeder bay, between the station bus and the getaway.`,
        'One device per feeder: if two getaways hang below the same recloser, split the bus so each has its own bay.',
        `Give each device a ${N('switch')} on both sides for maintenance.`,
        unprot.length > 0 ? `Still unprotected: ${names(unprot)}.` : 'Connect the feeder getaways first; the review checks each energized feeder.',
      ),
      tool: dev,
      side: 'lv',
      diagram: 'feeder-bay',
      guide: 'basic-distribution',
      itemIds: unprot.map((i) => i.id),
    };
  },
  transformer_protection: (_o, { design, level, review }) => {
    const xf = design.items.filter((i) => i.kind === 'transformer');
    const flagged = itemsOf(design, idsOf(findingsOf(review, 'prot.primary')));
    const target = flagged[0] ?? xf.find((t) => !(review.facts.primaryProtection.get(t.id)?.length)) ?? xf[0];
    const p = primaryProtectionSteps(level, target);
    return {
      what: 'The transformer primary needs a protective device (power fuses, a circuit switcher or a circuit breaker) that clears faults in the transformer and on the low-voltage bus (section 4.3.2).',
      steps: xf.length ? p.steps : [`Place a ${N('transformer')} and connect its HV terminal to the incoming line through a ${N('switch')}.`, ...p.steps.slice(0, 2)],
      tool: xf.length ? p.tool : pickTool(level, 'transformer'),
      side: 'hv',
      diagram: 'xfmr-primary',
      guide: 'primary-protection',
      itemIds: (flagged.length ? flagged : xf.filter((t) => !(review.facts.primaryProtection.get(t.id)?.length))).map((t) => t.id),
    };
  },
  voltage_regulation: (_o, { design, level, review }) => {
    const xf = design.items.filter((i) => i.kind === 'transformer');
    const unreg = itemsOf(design, review.facts.unregulatedLoads);
    return {
      what: 'Long rural feeders sag in voltage under load, so the station has to regulate it: an LTC transformer or bus regulators for the whole bus, or a regulator bank on each feeder (section 4.3.3).',
      steps: steps(
        !review.topo.loads.length && 'Build and connect the feeder getaways first; the review then checks each one for regulation.',
        xf.length > 0 && `Bus regulation: select ${xf.length > 1 ? `each transformer (${names(xf)})` : names(xf)} and tick Load tap changer (LTC) in the Inspector.`,
        pickTool(level, 'regulator') && `Or place ${N('regulator')} between the transformer LV terminal and the station bus, or one bank in each feeder bay.`,
        unreg.length > 0 && `Still unregulated: ${names(unreg)}.`,
      ),
      tool: pickTool(level, 'regulator'),
      side: 'lv',
      diagram: 'regulator-bypass',
      guide: 'voltage-regulation',
      itemIds: unreg.map((i) => i.id),
    };
  },
  bypass_reclosers: (_o, { design, level, review }) => {
    const devs = design.items.filter((i) => i.kind === 'recloser' || (i.kind === 'breaker' && review.topo.loads.some((l) => l.feeder && review.facts.feederProtection.get(l.itemId) === i.id)));
    const missing = devs.filter((d) => !review.facts.bypassed.get(d.id));
    return {
      what: 'Reclosers need regular maintenance. A bypass lets a crew take the recloser out (open it and its two disconnect switches) while the feeder stays energized through a normally-open bypass switch (section 4.3.4, Fig. 4-4).',
      steps: [
        `Pick "${N('hookstick_switch')}" (${lvText(level)}) in the toolbox and place one beside each recloser bay.`,
        'Select it and tick "Normally open" in the Inspector: it is closed only during maintenance.',
        'Draw a bus from the station bus (on the source side of the bay\'s first disconnect switch) to one side of the bypass switch.',
        "Draw a bus from the other side to the feeder side of the bay's last disconnect switch, for example onto the bus that runs to the getaway.",
        devs.length === 0 ? 'Place the feeder reclosers first.' : missing.length ? `Still to do: ${names(missing)}.` : 'Every recloser has a bypass.',
      ],
      tool: pickTool(level, 'hookstick_switch'),
      side: 'lv',
      diagram: 'recloser-bypass',
      guide: 'bypass',
      itemIds: missing.map((x) => x.id),
    };
  },
  bypass_regulators: (_o, { design, level, review }) => {
    const regs = design.items.filter((i) => i.kind === 'regulator');
    const missing = regs.filter((r) => !review.facts.bypassed.get(r.id));
    const connected = (r: PlacedItem) => {
      const d = review.topo.deviceById.get(r.id);
      return !!d?.a && !!d.b;
    };
    const fixable = missing.length > 0 && missing.every((r) => !r.props.bypass && connected(r));
    return {
      what: 'A regulator bank also needs maintenance. Bypass switches let a crew take it out of service while the feeder stays energized, at unregulated voltage for a while (section 4.3.3).',
      steps: regs.length
        ? steps(
            'Select each regulator bank and tick Bypass switches in the Inspector: its integral bypass carries the load while it is out.',
            `Or build a bypass yourself: ${N('switch')}es on both sides of the bank and a normally-open ${N('hookstick_switch')} around it, as for a recloser.`,
            'The bank must be connected on both sides for its bypass to count.',
            missing.length > 0 && `Still to do: ${names(missing)}.`,
          )
        : [`Place ${N('regulator')} first (see the voltage regulation objective).`, 'Then tick Bypass switches on each bank in the Inspector.'],
      tool: regs.length ? undefined : pickTool(level, 'regulator'),
      side: 'lv',
      diagram: 'regulator-bypass',
      guide: 'voltage-regulation',
      itemIds: missing.map((r) => r.id),
      fix: fixable
        ? {
            label: missing.length === 1 ? `Tick Bypass switches on ${itemLabel(missing[0]!)}` : 'Tick Bypass switches on every regulator',
            apply: (d) => missing.reduce<Design | null>((acc, r) => (acc ? withProps(acc, r.id, { bypass: true }) : null), d),
          }
        : undefined,
    };
  },
  shielding: (_o, ctx) => shieldingHelp(ctx, ctx.review.shielding.targets.filter((t) => t.kind === 'item' && t.covered < t.total).map((t) => t.id)),
  grounding_safe: (_o, ctx) => {
    const { design, level, review } = ctx;
    const g = review.grounding;
    let s: string[];
    if (!design.fence) s = ['Draw the fence first with the Fence tool: the ground grid covers the fenced yard and extends beyond it.', SITE_PANEL, 'Under Ground grid tick Install grid.'];
    else if (!design.groundGrid.enabled || !g) s = [SITE_PANEL, 'Under Ground grid tick Install grid.', 'Then compare the mesh voltage with the tolerable touch voltage in the Review panel.'];
    else {
      const touch = !g.eval.meshVoltageOk;
      s = steps(
        touch && `Touch: mesh voltage ${Math.round(g.meshVoltageV).toLocaleString('en-US')} V against ${Math.round(g.touchTolerableV).toLocaleString('en-US')} V tolerable.`,
        !g.eval.stepVoltageOk && `Step: ${Math.round(g.stepVoltageV).toLocaleString('en-US')} V against ${Math.round(g.stepTolerableV).toLocaleString('en-US')} V tolerable.`,
        SITE_PANEL,
        ...groundingRemedies(ctx, touch || g.eval.stepVoltageOk ? 'touch' : 'step'),
      ).slice(0, 5);
    }
    return {
      what: `During a ground fault (${level.system.hvGroundFaultKA} kA here) the whole yard rises in voltage. The grid has to keep the touch and step voltages a person could meet below the tolerable limits (section 9.10).`,
      steps: s,
      tool: design.fence ? undefined : 'fence',
      overlay: level.features.groundGrid ? 'grounding' : undefined,
      guide: 'grounding',
    };
  },
  fence: (_o, { design, review }) => {
    const crit = review.findings.filter((f) => f.checkId.startsWith('fence') && f.severity === 'critical');
    return {
      what: 'Energized equipment must be inside the security fence, with live parts kept out of the Fig. 4-21 safety clearance zone along its inside.',
      steps: design.fence
        ? steps('Turn on the Fence zone overlay: nothing live may sit in the red band.', crit.length > 0 && `Still to fix: ${titlesOf(crit)}.`, 'Redraw the fence with the Fence tool (it replaces the old one), or move equipment inward.')
        : ['Pick the Fence tool and drag a rectangle around all the equipment, with a few metres to spare on every side.', 'Turn on the Fence zone overlay: nothing live may sit in the red band.'],
      tool: 'fence',
      overlay: 'fenceZone',
      guide: 'fence-clearance',
      itemIds: idsOf(crit),
    };
  },
  transformer_capacity: (_o, { design, level, review }) => {
    const xf = design.items.filter((i) => i.kind === 'transformer');
    const over = itemsOf(design, idsOf([...findingsOf(review, 'rating.xfmr.now'), ...findingsOf(review, 'rating.xfmr.horizon')]));
    const H = level.system.horizonYears;
    const now = review.calc.loadNowMVA;
    const later = review.calc.loadHorizonMVA;
    const probe: PlacedItem = { id: '_', kind: 'transformer', x: 0, y: 0, rot: 0, kv: level.system.hvKV, props: { ...defaultProps('transformer'), lvKV: level.system.lvKV ?? level.system.hvKV } };
    const sug = transformerSuggestion(over[0] ?? xf[0] ?? probe, later);
    return {
      what: `The transformer’s top rating (with its fans running${isHighAltitude(level.site.altitudeM) ? ', derated for altitude' : ''}) must carry the peak load today (${now.toFixed(1)} MVA) and the forecast peak in year ${H} (${later.toFixed(1)} MVA).`,
      steps: steps(
        !xf.length && `Place a ${N('transformer')} and connect it between the high-voltage supply and the ${lvText(level)} bus.`,
        `Select the transformer and pick its Self-cooled (OA) rating and Cooling stages in the Inspector; the Inspector shows its top rating.`,
        sug && `A single transformer needs at least ${sug}.`,
        over.length > 0 && `Too small now: ${names(over)}.`,
      ),
      tool: xf.length ? undefined : pickTool(level, 'transformer'),
      side: 'hv',
      guide: 'transformers',
      itemIds: over.map((t) => t.id),
    };
  },
  mobile_provision: (_o, { design, level }) => {
    const pads = design.items.filter((i) => i.kind === 'mobile_pad');
    return {
      what: 'Losing the only transformer drops every member. A connection pad lets the cooperative bring in its mobile transformer and pick up all the feeders quickly (sections 4.3.1 and 4.13).',
      steps: steps(
        !pads.length && `Place a ${N('mobile_pad')} (${hvText(level)}) inside the fence, with room for the trailer.`,
        `Connect its HV terminal to the ${hvText(level)} bus on the source side of the transformer protection, through a ${N('switch')} with Normally open ticked.`,
        `Connect its LV terminal to the ${lvText(level)} station bus through another normally-open ${N('switch')}, so the mobile unit can feed every feeder.`,
        'The pad must reach every feeder with the main transformer out, so connect it upstream of the feeder bays.',
      ),
      tool: pickTool(level, 'mobile_pad'),
      side: 'hv',
      diagram: 'mobile-pad',
      guide: 'mobile',
      itemIds: pads.map((p) => p.id),
    };
  },
  expansion_area: (_o, { design, level }) => {
    const ea = level.expansionArea;
    const blockers = ea ? design.items.filter((i) => rectsOverlap(itemRect(i), ea)) : [];
    return {
      what: 'The long-range plan adds equipment in the reserved area, so it has to be inside the fence and kept empty from the start (section 4.2.3).',
      steps: steps(
        (!design.fence || (ea && !rectContainsRect(design.fence.rect, ea))) && 'Pick the Fence tool and drag a rectangle that encloses both your equipment and the hatched expansion area.',
        'Keep the area empty: no equipment or bus may touch it.',
        blockers.length > 0 && `Move out: ${names(blockers)}.`,
      ),
      tool: 'fence',
      guide: 'removal-expansion',
      itemIds: blockers.map((b) => b.id),
    };
  },
  n_minus_1_transformer: (_o, { design, level, review }) => {
    const xf = design.items.filter((i) => i.kind === 'transformer');
    const now = review.calc.loadNowMVA;
    const small = xf.filter((t) => transformerSiteRatingKVA(t) / 1000 < now - 1e-9);
    return {
      what: `If either transformer fails, the other must pick up every feeder after switching, so each one alone has to carry today’s peak of ${now.toFixed(1)} MVA (section 4.2.2).`,
      steps: steps(
        xf.length < 2 && `Place ${xf.length ? 'a second' : 'two'} ${N('transformer')}${xf.length ? '' : 's'}, each with its own primary protection.`,
        `Size each one so its top rating covers ${now.toFixed(1)} MVA (Self-cooled rating and Cooling stages in the Inspector).`,
        small.length > 0 && `Too small to carry the station alone: ${names(small)}.`,
        `Give each transformer its own ${lvText(level)} bus section and join the sections with a ${N('breaker')} that has Normally open (tie) ticked, so one transformer can feed both sections.`,
      ),
      tool: xf.length < 2 ? pickTool(level, 'transformer') : pickTool(level, 'breaker'),
      side: xf.length < 2 ? 'hv' : 'lv',
      diagram: 'sectionalized-bus',
      guide: SCHEME_GUIDE.sectionalized_bus,
      itemIds: small.map((t) => t.id),
    };
  },
  switching_scheme: (o, { level, review }) => {
    const want = String(o.objective.param ?? '') as SchemeId;
    const info = SCHEMES[want];
    const now = `The review currently recognizes ${SCHEMES[review.scheme.hv]?.name ?? review.scheme.hv} at ${hvText(level)}${level.system.lvKV !== undefined ? ` and ${SCHEMES[review.scheme.lv]?.name ?? review.scheme.lv} at ${lvText(level)}` : ''}.`;
    let s: string[];
    if (want === 'sectionalized_bus') {
      s = [
        `Split the ${lvText(level)} bus into two sections, each fed by its own transformer.`,
        `Join the two sections with a ${N('breaker')} and tick Normally open (tie) on it.`,
        `Hang the feeder bays off the sections (two on each), each through its own ${N(pickTool(level, 'recloser', 'breaker') ?? 'recloser')}.`,
        now,
      ];
    } else if (want === 'ring_bus') {
      s = [
        `Arrange four ${N('breaker')}s in a closed loop of bus, each with a ${N('switch')} on both sides.`,
        'Connect one line to each stretch of bus between two breakers: every section of the ring must carry a line.',
        'Check that none of the ring breakers has Normally open (tie) ticked.',
        now,
      ];
    } else {
      s = [`Arrange the breakers as ${info ? `a ${info.name.toLowerCase()}` : 'the required scheme'} (see the Field Guide for the one-line).`, now];
    }
    return {
      what: `The project calls for ${info ? `a ${info.name.toLowerCase()}` : 'a specific bus arrangement'}. The bus arrangement decides what a breaker failure or bus fault takes out and how breakers can be maintained (section 4.6).`,
      steps: s,
      tool: pickTool(level, 'breaker'),
      side: want === 'sectionalized_bus' ? 'lv' : 'hv',
      diagram: want === 'sectionalized_bus' ? 'sectionalized-bus' : undefined,
      guide: SCHEME_GUIDE[want] ?? 'schemes',
    };
  },
  line_protection: (_o, { design, level, review }) => {
    const fs = review.findings.filter((f) => ['prot.feeder', 'prot.source', 'relay.line'].some((p) => f.checkId.startsWith(p)));
    return {
      what: 'A fault on any line must be cleared by the station breakers next to it, tripped by relays chosen for transmission lines, so the other lines stay in service (section 12.4.2).',
      steps: steps(
        `Connect every line to the station bus through ${N('breaker')}s: in a ring bus, between the two breakers on either side of it.`,
        `Select each line breaker and tick 21 Distance under Protective relays${level.system.hvKV >= 69 ? '; at this voltage the review also expects 21 or 85, not overcurrent alone' : ''}.`,
        fs.length > 0 && `Still to fix: ${titlesOf(fs)}.`,
      ),
      tool: pickTool(level, 'breaker'),
      side: 'hv',
      guide: 'relaying',
      itemIds: itemsOf(design, idsOf(fs)).map((i) => i.id),
    };
  },
  arresters: (_o, { design, level, review }) => {
    const fs = findingsOf(review, 'surge.');
    return {
      what: 'Surge arresters limit lightning and switching overvoltages before they reach equipment insulation: at the transformer bushings, at line entrances and on regulators (section 4.3.5).',
      steps: steps(
        `Transformers: Tank-mounted surge arresters on the HV and LV sides (Inspector), or a ${N('arrester')} within ${ARRESTER_NEAR_M} m of each terminal; with fuses, put the HV arresters on the line side of the fuses.`,
        level.system.hvKV >= 69 && `Line entrances: a ${N('arrester')} on the bus right at each incoming line terminal.`,
        design.items.some((i) => i.kind === 'regulator') && 'Regulators: tick Tank-mounted arresters.',
        fs.length > 0 && `Still to fix: ${titlesOf(fs)}.`,
      ),
      tool: pickTool(level, 'arrester'),
      side: 'hv',
      diagram: 'arresters',
      guide: 'arresters',
      itemIds: idsOf(fs),
    };
  },
  capacitor_kvar: (o, { design, level }) => {
    const want = Number(o.objective.param ?? 0);
    const have = design.items.filter((i) => i.kind === 'capacitor_bank').reduce((s, c) => s + Number(c.props.kvar), 0);
    return {
      what: `The cooperative wants ${want.toLocaleString('en-US')} kvar of shunt capacitors to support voltage and improve power factor; ${have.toLocaleString('en-US')} kvar is installed.`,
      steps: [`Place ${N('capacitor_bank')}s (${lvText(level)}) and connect each to the station bus.`, `Set Bank size in the Inspector until the total reaches ${want.toLocaleString('en-US')} kvar.`],
      tool: pickTool(level, 'capacitor_bank'),
      side: 'lv',
      guide: 'capacitors',
    };
  },
  removal_path: (_o, { design, review }) => {
    const fs = findingsOf(review, 'layout.removal');
    const its = itemsOf(design, idsOf(fs));
    return {
      what: 'Large equipment must be able to leave the yard on a truck if it fails. Section 4.2.6 asks for a clear route from each transformer and breaker to the gate.',
      steps: steps(
        'Turn on the Removal overlay to see which routes are blocked.',
        'Keep a lane as wide as the equipment from each one to the gate, clear of other equipment.',
        'Low buses across the lane block it: select them and set Elevation to High in the Inspector, or route them around.',
        its.length > 0 && `Blocked now: ${names(its)}.`,
        !design.fence && 'Draw the fence and its gate first: routes lead to the gate.',
      ),
      overlay: 'removal',
      guide: 'removal-expansion',
      itemIds: its.map((i) => i.id),
    };
  },
  clearances: (_o, { level, review }) => {
    const fs = review.findings.filter((f) => f.checkId.startsWith('clear.') || f.checkId === 'fence.clearance');
    const high = isHighAltitude(level.site.altitudeM);
    return {
      what: `Energized parts must keep the Table 4-7 clearances from each other, from grounded structures and from the fence${high ? `. At ${level.site.altitudeM} m those are the larger clearances of the altitude-corrected insulation level (section 4.9)` : ''}.`,
      steps: steps(
        'Open each clearance finding in the Review panel; its help gives the distance needed.',
        'Where two buses cross, set one to Elevation High in the Inspector.',
        'Keep masts and the control house clear of bus, and live parts out of the Fence zone overlay’s red band.',
        fs.length > 0 && `Still to fix: ${titlesOf(fs)}.`,
      ),
      overlay: 'fenceZone',
      guide: high ? 'high-altitude' : 'clearances',
      itemIds: idsOf(fs),
    };
  },
};
