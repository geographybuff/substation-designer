/**
 * Protective relaying checks (Bulletin Chapter 12): every breaker and circuit
 * switcher needs relays that can trip it, chosen for what it protects.
 */
import { FEEDER_PROTECTION, RELAYING_CITES, TRANSFORMER_PROTECTION_FIG_12_13, TRANSFORMER_PROTECTION_THRESHOLDS } from '../../data/bulletin/relaying';
import type { Citation } from '../../data/bulletin/types';
import { itemLabel } from '../items';
import type { Topology } from '../topology';
import type { Design, Finding, LevelDef, PlacedItem } from '../types';
import type { ElectricalFacts } from './electrical';

let seq = 0;
const fid = (check: string) => `${check}#${++seq}`;

const FEEDER_CITE: Citation = FEEDER_PROTECTION.devices[0].cite;
const XFMR_CITE: Citation = TRANSFORMER_PROTECTION_FIG_12_13.cite;
const THRESH_CITE: Citation = TRANSFORMER_PROTECTION_THRESHOLDS.cite;

const relaysOf = (it: PlacedItem | undefined): string[] => ((it?.props.relays as string[] | undefined) ?? []).slice();

export type BreakerRole = 'feeder' | 'line' | 'transformer' | 'tie' | 'bus';

export function breakerRoles(design: Design, topo: Topology, facts: ElectricalFacts): Map<string, BreakerRole> {
  const roles = new Map<string, BreakerRole>();
  const items = new Map(design.items.map((i) => [i.id, i]));
  const dedicated = new Map<string, 'feeder' | 'line'>();
  for (const [endpoint, set] of facts.protectionSets) {
    const role = items.get(endpoint)?.kind === 'feeder_exit' ? 'feeder' : 'line';
    for (const p of set) if (!dedicated.has(p) || role === 'feeder') dedicated.set(p, role);
  }
  const primary = new Set<string>();
  for (const prot of facts.primaryProtection.values()) prot.forEach((p) => primary.add(p));
  for (const it of design.items) {
    if (it.kind !== 'breaker' && it.kind !== 'circuit_switcher') continue;
    const d = topo.deviceById.get(it.id);
    if (dedicated.has(it.id)) roles.set(it.id, dedicated.get(it.id)!);
    else if (primary.has(it.id)) roles.set(it.id, 'transformer');
    else if (it.props.normallyOpen) roles.set(it.id, 'tie');
    else if (d && topo.sources.some((s) => s.node && (s.node === d.a || s.node === d.b))) roles.set(it.id, 'line');
    else roles.set(it.id, 'bus');
  }
  return roles;
}

/** The transformer a primary protective device protects (if any). */
function transformersProtectedBy(facts: ElectricalFacts, deviceId: string): string[] {
  const out: string[] = [];
  for (const [t, prot] of facts.primaryProtection) if (prot.includes(deviceId)) out.push(t);
  return out;
}

export function checkProtection(design: Design, level: LevelDef, topo: Topology, facts: ElectricalFacts): Finding[] {
  seq = 0;
  const out: Finding[] = [];
  const items = new Map(design.items.map((i) => [i.id, i]));
  const roles = breakerRoles(design, topo, facts);

  for (const [id, role] of roles) {
    const b = items.get(id)!;
    const r = relaysOf(b);
    const label = itemLabel(b);
    if (b.kind === 'breaker') {
      if (role === 'feeder') {
        if (!r.includes('50/51')) {
          out.push({ id: fid('relay.feeder'), checkId: 'relay.feeder', severity: 'major', category: 'protection', title: `${label}: no phase overcurrent relays`, detail: 'Distribution feeder breakers trip from inverse-time overcurrent relays with instantaneous elements (50/51). Without them a feeder fault is cleared only by backup protection.', itemIds: [id], cite: [FEEDER_CITE] });
        } else if (!r.includes('50N/51N') && level.system.hvEffectivelyGrounded) {
          out.push({ id: fid('relay.feeder.ground'), checkId: 'relay.feeder.ground', severity: 'minor', category: 'protection', title: `${label}: no ground overcurrent relay`, detail: 'On a grounded system feeder breakers also carry a ground (neutral) overcurrent relay (50N/51N) for sensitivity to ground faults.', itemIds: [id], cite: [FEEDER_CITE] });
        }
      }
      if (role === 'line' && !r.some((x) => ['21', '67', '50/51', '85'].includes(x))) {
        out.push({ id: fid('relay.line'), checkId: 'relay.line', severity: 'major', category: 'protection', title: `${label}: no line protection`, detail: 'Line breakers need overcurrent, directional overcurrent, distance (21) or pilot (85) relaying chosen for the line.', itemIds: [id], cite: [RELAYING_CITES.transmissionLine] });
      } else if (role === 'line' && b.kv >= 69 && !r.includes('21') && !r.includes('85')) {
        out.push({ id: fid('relay.line.distance'), checkId: 'relay.line.distance', severity: 'minor', category: 'protection', title: `${label}: consider distance or pilot relaying`, detail: 'Transmission lines are commonly protected with step-distance relays (21), with a pilot channel (85) where high-speed clearing of the whole line is needed.', itemIds: [id], cite: [RELAYING_CITES.stepDistance, RELAYING_CITES.pilot] });
      }
      if ((role === 'tie' || role === 'bus') && !r.some((x) => ['50/51', '87B', '67'].includes(x))) {
        out.push({ id: fid('relay.bus'), checkId: 'relay.bus', severity: 'minor', category: 'protection', title: `${label}: no relays assigned`, detail: 'Bus-tie and bus breakers need overcurrent or bus differential (87B) relaying to clear bus faults selectively.', itemIds: [id], cite: [RELAYING_CITES.bus] });
      }
    }
    if (role === 'transformer') {
      for (const tid of transformersProtectedBy(facts, id)) {
        const t = items.get(tid)!;
        const tr = relaysOf(t);
        const mva = Number(t.props.kva) / 1000;
        if (!tr.some((x) => ['87T', '50/51', '63'].includes(x))) {
          out.push({
            id: fid('relay.xfmr'),
            checkId: 'relay.xfmr',
            severity: 'major',
            category: 'protection',
            title: `${itemLabel(t)}: no transformer relays to trip ${label}`,
            detail: 'A circuit switcher or breaker on the transformer primary only opens when transformer relays tell it to. Assign differential (87T), sudden pressure (63) and overcurrent (50/51) relays on the transformer.',
            itemIds: [tid, id],
            cite: [XFMR_CITE],
          });
        } else if (mva >= TRANSFORMER_PROTECTION_THRESHOLDS.relaysMostOftenAtOrAboveMVA && !(tr.includes('87T') && tr.includes('63'))) {
          out.push({
            id: fid('relay.xfmr.diff'),
            checkId: 'relay.xfmr.diff',
            severity: 'minor',
            category: 'protection',
            title: `${itemLabel(t)}: add differential and sudden-pressure relays`,
            detail: 'Larger transformers are usually protected by sudden pressure (63), percentage differential (87), high-side overcurrent and neutral overcurrent relays (Fig. 12-13).',
            itemIds: [tid],
            cite: [XFMR_CITE],
          });
        }
      }
    }
  }

  // Fuse-protected transformers: fuses suit smaller units.
  for (const [tid, prot] of facts.primaryProtection) {
    if (!prot.length || !prot.every((p) => items.get(p)?.kind === 'fuse')) continue;
    const t = items.get(tid)!;
    const mva = Number(t.props.kva) / 1000;
    if (mva > TRANSFORMER_PROTECTION_THRESHOLDS.fusedUpToMVA) {
      out.push({ id: fid('relay.fuse.size'), checkId: 'relay.fuse.size', severity: 'major', category: 'protection', title: `${itemLabel(t)} is too large for fuse protection`, detail: `Some transformers up to about ${TRANSFORMER_PROTECTION_THRESHOLDS.fusedUpToMVA} MVA are fuse protected, but larger units need relay protection with a circuit switcher or breaker.`, itemIds: [tid], cite: [THRESH_CITE] });
    } else if (mva >= TRANSFORMER_PROTECTION_THRESHOLDS.relaysMostOftenAtOrAboveMVA) {
      out.push({ id: fid('relay.fuse.advice'), checkId: 'relay.fuse.advice', severity: 'info', category: 'protection', title: `${itemLabel(t)}: relay protection is more usual at this size`, detail: `Transformers of ${TRANSFORMER_PROTECTION_THRESHOLDS.almostAlwaysFusedAtOrBelowMVA} MVA and below are almost always fused; relay protection is most often used at ${TRANSFORMER_PROTECTION_THRESHOLDS.relaysMostOftenAtOrAboveMVA} MVA and above. Fuses are economical but protect little against internal faults.`, itemIds: [tid], cite: [THRESH_CITE] });
    }
  }
  return out;
}
