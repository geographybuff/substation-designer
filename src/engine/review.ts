/**
 * Design review: runs every check, evaluates objectives, costs, reliability
 * and produces the pass/star result shown to the player.
 */
import { computeStation, type StationCalc } from './calc';
import { analyzeElectrical, checkElectrical, type ElectricalFacts } from './checks/electrical';
import { checkPhysical } from './checks/physical';
import { checkRatings } from './checks/ratings';
import { designCost, type CostBreakdown } from './costs';
import { transformerTopRatingKVA } from './equipment';
import { checkGrounding, evaluateGrounding, type GroundingResult } from './grounding';
import { evaluateShielding, SHIELDING_CITES, type ShieldingResult } from './lightning';
import { evaluateReliability, type ReliabilityResult } from './reliability';
import { recognizeScheme, type SchemeId } from './schemes';
import { analyzeTopology, type Topology } from './topology';
import type { Design, Finding, LevelDef, Objective, Severity } from './types';
import { voltageClassFor } from '../data/bulletin/voltageClasses';

export interface ObjectiveStatus {
  objective: Objective;
  met: boolean;
  note?: string;
}

export interface DesignReview {
  findings: Finding[];
  counts: Record<Severity, number>;
  objectives: ObjectiveStatus[];
  cost: CostBreakdown;
  calc: StationCalc;
  topo: Topology;
  facts: ElectricalFacts;
  shielding: ShieldingResult;
  grounding: GroundingResult | null;
  reliability: ReliabilityResult;
  scheme: { hv: SchemeId; lv: SchemeId };
  /** Minutes per customer per year scored against the level target (unplanned + planned). */
  scoredSaidi: number;
  passed: boolean;
  stars: 0 | 1 | 2 | 3;
  score: number;
  blockers: string[];
}

const SEV_ORDER: Record<Severity, number> = { critical: 0, major: 1, minor: 2, info: 3 };

export function reviewDesign(design: Design, level: LevelDef, opts: { shieldingMethod?: 'fixed_angle' | 'rolling_sphere' } = {}): DesignReview {
  const topo = analyzeTopology(design, level);
  const facts = analyzeElectrical(design, level, topo);
  const calc = computeStation(design, level, topo);
  const findings: Finding[] = [];
  findings.push(...checkPhysical(design, level, topo));
  findings.push(...checkElectrical(design, level, topo, facts));
  findings.push(...checkRatings(design, level, topo, calc));

  // Lightning shielding.
  const method = opts.shieldingMethod ?? design.shieldingMethod;
  const shielding = evaluateShielding(design, { method, bilKV: voltageClassFor(level.system.hvKV).bilKV, surgeImpedanceOhm: 350 });
  const exposed = shielding.targets.filter((t) => t.covered < t.total);
  if (exposed.length) {
    const pct = Math.round((1 - shielding.coveredFraction) * 100);
    findings.push({
      id: 'shield.exposed#1',
      checkId: 'shield.exposed',
      severity: shielding.coveredFraction < 0.9 ? 'major' : 'minor',
      category: 'lightning',
      title: `${exposed.length} item${exposed.length > 1 ? 's' : ''} outside the zone of protection`,
      detail: `${pct}% of energized equipment and bus is exposed to direct strokes (${method === 'fixed_angle' ? 'fixed angle method, 30°/45°' : 'rolling sphere method'}). Add or raise lightning masts or shield wires.`,
      itemIds: exposed.filter((t) => t.kind === 'item').map((t) => t.id),
      conductorIds: exposed.filter((t) => t.kind === 'conductor').map((t) => t.id),
      cite: [method === 'fixed_angle' ? SHIELDING_CITES.fixedAngle : SHIELDING_CITES.rollingSphere, SHIELDING_CITES.general],
    });
  }

  // Grounding.
  const grounding = evaluateGrounding(design, level);
  findings.push(...checkGrounding(design, level, grounding));

  const reliability = evaluateReliability(design, level, topo, facts, calc, shielding.coveredFraction);
  const cost = designCost(design, level);
  const scheme = recognizeScheme(design, level, topo);

  findings.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const counts: Record<Severity, number> = { critical: 0, major: 0, minor: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;

  const has = (prefix: string, sev?: Severity[]) => findings.some((f) => f.checkId.startsWith(prefix) && (!sev || sev.includes(f.severity)));
  const objectives: ObjectiveStatus[] = level.objectives.map((o) => {
    let met = false;
    let note: string | undefined;
    switch (o.kind) {
      case 'feeders_served':
        met = !has('conn.feedermissing') && !has('conn.dead') && !has('conn.feederunassigned');
        break;
      case 'feeder_protection':
        met = !has('prot.feeder');
        break;
      case 'transformer_protection':
        met = !has('prot.primary') && design.items.some((i) => i.kind === 'transformer');
        break;
      case 'voltage_regulation':
        met = !has('volt.regulation') && topo.loads.length > 0;
        break;
      case 'bypass_reclosers': {
        const devs = design.items.filter((i) => i.kind === 'recloser' || (i.kind === 'breaker' && topo.loads.some((l) => l.feeder && facts.feederProtection.get(l.itemId) === i.id)));
        met = devs.length > 0 && devs.every((d) => facts.bypassed.get(d.id));
        break;
      }
      case 'bypass_regulators': {
        const regs = design.items.filter((i) => i.kind === 'regulator');
        met = regs.length > 0 && regs.every((r) => facts.bypassed.get(r.id));
        break;
      }
      case 'shielding':
        met = shielding.coveredFraction >= 0.999;
        note = `${Math.round(shielding.coveredFraction * 100)}% covered`;
        break;
      case 'grounding_safe':
        met = !!grounding && grounding.safe;
        break;
      case 'fence':
        met = !!design.fence && !has('fence', ['critical']);
        break;
      case 'transformer_capacity':
        met = design.items.some((i) => i.kind === 'transformer') && !has('rating.xfmr.now') && !has('rating.xfmr.horizon');
        break;
      case 'mobile_provision': {
        const pads = design.items.filter((i) => i.kind === 'mobile_pad');
        met = pads.some((p) => {
          const d = topo.deviceById.get(p.id);
          if (!d?.a || !d.b) return false;
          const xf = topo.devices.filter((t) => t.kind === 'transformer');
          const reach = topo.reach({ open: new Set(xf.map((x) => x.itemId)), closeNormallyOpen: true, mobileConnected: true });
          return topo.loads.filter((l) => l.feeder).every((l) => reach.has(l.node!));
        });
        break;
      }
      case 'expansion_area':
        met = !has('site.expansion');
        break;
      case 'n_minus_1_transformer': {
        const xf = design.items.filter((i) => i.kind === 'transformer');
        met =
          xf.length >= 2 &&
          xf.every((t) => {
            const reach = topo.reach({ open: new Set([t.id]), closeNormallyOpen: true });
            const servedAll = topo.loads.every((l) => !l.node || reach.has(l.node));
            const remaining = xf.filter((x) => x !== t).reduce((s, x) => s + transformerTopRatingKVA(x) / 1000, 0);
            return servedAll && remaining >= calc.loadNowMVA;
          });
        break;
      }
      case 'switching_scheme':
        met = scheme.hv === o.param || scheme.lv === o.param;
        note = `HV: ${scheme.hv}, LV: ${scheme.lv}`;
        break;
      case 'line_protection':
        met = !has('prot.feeder') && !has('prot.line');
        break;
      case 'arresters':
        met = !has('surge.');
        break;
      case 'capacitor_kvar': {
        const kvar = design.items.filter((i) => i.kind === 'capacitor_bank').reduce((s, c) => s + Number(c.props.kvar), 0);
        met = kvar >= Number(o.param ?? 0);
        note = `${kvar} kvar installed`;
        break;
      }
      case 'removal_path':
        met = !has('layout.removal');
        break;
    }
    return { objective: o, met, note };
  });

  const scoredSaidi = reliability.saidiUnplanned + reliability.saidiPlanned;
  const blockers: string[] = [];
  if (counts.critical) blockers.push(`${counts.critical} critical finding${counts.critical > 1 ? 's' : ''}`);
  const missed = objectives.filter((o) => !o.met && !o.objective.optional);
  if (missed.length) blockers.push(`${missed.length} required objective${missed.length > 1 ? 's' : ''} not met`);
  if (cost.total > level.budget) blockers.push('over budget');
  const passed = !level.sandbox && blockers.length === 0;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (passed) {
    stars = 1;
    if (counts.major === 0 && scoredSaidi <= level.reliabilityTarget) {
      stars = 2;
      const optionalOk = objectives.filter((o) => o.objective.optional).every((o) => o.met);
      if (optionalOk && counts.minor === 0 && cost.total <= level.budget * 0.95) stars = 3;
    }
  }
  const score = Math.max(
    0,
    Math.round(
      1000 -
        counts.critical * 150 -
        counts.major * 50 -
        counts.minor * 10 -
        Math.max(0, scoredSaidi - level.reliabilityTarget) * 2 +
        Math.max(0, (level.budget - cost.total) / level.budget) * 300,
    ),
  );
  return { findings, counts, objectives, cost, calc, topo, facts, shielding, grounding, reliability, scheme, scoredSaidi, passed, stars, score, blockers };
}
