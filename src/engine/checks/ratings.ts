/**
 * Ratings checks: transformer capacity, interrupting and continuous ratings,
 * regulator capability, fuse sizing and bus ampacity.
 */
import { CONDUCTOR_SIZES } from '../catalog';
import { transformerHVCurrentA, type StationCalc } from '../calc';
import { isStandardRecloserRating, RECLOSER_TABLE_CITES, regulatorCapacityA, regulatorRangeMultiplier, transformerSiteRatingKVA, transformerTopRatingKVA } from '../equipment';
import { ALTITUDE_CITES, currentSiteFactor, isHighAltitude, siteAltitudeM } from '../site';
import { itemLabel } from '../items';
import type { Topology } from '../topology';
import type { Design, Finding, LevelDef } from '../types';

let seq = 0;
const fid = (check: string) => `${check}#${++seq}`;

export function checkRatings(design: Design, level: LevelDef, topo: Topology, calc: StationCalc): Finding[] {
  seq = 0;
  const out: Finding[] = [];
  const H = level.system.horizonYears;

  for (const it of design.items) {
    const d = topo.deviceById.get(it.id);
    // --- Transformer capacity ----------------------------------------------------
    if (it.kind === 'transformer') {
      const load = calc.transformerLoadMVA.get(it.id);
      if (!load) continue;
      const topMVA = transformerSiteRatingKVA(it) / 1000;
      const oaMVA = Number(it.props.kva) / 1000;
      const derated = isHighAltitude() ? ` (nameplate ${(transformerTopRatingKVA(it) / 1000).toFixed(1)} MVA derated for ${siteAltitudeM()} m altitude, Table 5-2)` : '';
      const altCite = isHighAltitude() ? [ALTITUDE_CITES.transformer] : [];
      if (load.now > topMVA * 1.0001) {
        out.push({ id: fid('rating.xfmr.now'), checkId: 'rating.xfmr.now', severity: 'critical', category: 'ratings', title: `${itemLabel(it)} is overloaded on day one`, detail: `Peak load ${load.now.toFixed(1)} MVA exceeds its top rating of ${topMVA.toFixed(1)} MVA (${it.props.cooling})${derated}.`, itemIds: [it.id], cite: [{ page: 193, section: '5.2.3' }, ...altCite] });
      } else if (load.horizon > topMVA * 1.0001) {
        out.push({ id: fid('rating.xfmr.horizon'), checkId: 'rating.xfmr.horizon', severity: 'major', category: 'ratings', title: `${itemLabel(it)} will be overloaded within ${H} years`, detail: `Forecast peak ${load.horizon.toFixed(1)} MVA in year ${H} exceeds its top rating of ${topMVA.toFixed(1)} MVA${derated}. Plan for the long-range forecast: a larger unit or more fan stages.`, itemIds: [it.id], cite: [{ page: 41, section: '2.1' }, { page: 193, section: '5.2.3' }, ...altCite] });
      } else if (load.horizon < oaMVA * 0.35) {
        out.push({ id: fid('rating.xfmr.oversized'), checkId: 'rating.xfmr.oversized', severity: 'info', category: 'ratings', title: `${itemLabel(it)} is lightly loaded`, detail: `Forecast peak is only ${Math.round((100 * load.horizon) / oaMVA)}% of its self-cooled rating; a smaller unit would save money.`, itemIds: [it.id] });
      }
    }
    if (!d) continue;
    const nodesKA = [d.a, d.b].map((n) => (n ? calc.faultKA.get(n) ?? 0 : 0));
    const faultKA = Math.max(...nodesKA);
    const amps = calc.deviceCurrentA.get(it.id) ?? 0;

    if (it.kind === 'recloser' && !isStandardRecloserRating(it)) {
      out.push({ id: fid('rating.recloser.std'), checkId: 'rating.recloser.std', severity: 'minor', category: 'ratings', title: `${itemLabel(it)}: not a standard recloser rating`, detail: `Pick one of the standard ${it.props.interrupter} recloser ratings for this voltage class in the inspector.`, itemIds: [it.id], cite: [it.props.interrupter === 'oil' ? RECLOSER_TABLE_CITES.oil : RECLOSER_TABLE_CITES.vacuum] });
    }
    // --- Interrupting ratings ------------------------------------------------------
    if (it.kind === 'breaker' || it.kind === 'recloser' || it.kind === 'fuse' || it.kind === 'circuit_switcher') {
      const rating = Number(it.props.interruptingKA) || 0;
      if (faultKA > rating + 1e-6) {
        out.push({
          id: fid('rating.interrupt'),
          checkId: 'rating.interrupt',
          severity: 'critical',
          category: 'ratings',
          title: `${itemLabel(it)} cannot interrupt the available fault current`,
          detail: `Available fault current here is ${faultKA.toFixed(1)} kA but the device is rated ${rating} kA. It could fail violently clearing a fault.`,
          itemIds: [it.id],
          cite: [{ page: 226, section: '5.3.3' }],
        });
      }
    }
    // --- Continuous current ratings ------------------------------------------------------
    if (it.kind === 'breaker' || it.kind === 'recloser' || it.kind === 'switch' || it.kind === 'hookstick_switch' || it.kind === 'circuit_switcher') {
      const nameplate = Number(it.props.continuousA) || 0;
      const f = currentSiteFactor(it.kind);
      const rating = nameplate * f;
      if (amps > rating + 1e-6) {
        out.push({
          id: fid('rating.continuous'),
          checkId: 'rating.continuous',
          severity: 'major',
          category: 'ratings',
          title: `${itemLabel(it)} continuous rating too low`,
          detail: `It will carry about ${Math.round(amps)} A at the year-${H} peak but is rated ${f < 1 ? `${Math.round(rating)} A at this altitude (${nameplate} A × ${f.toFixed(3)})` : `${rating} A`}.`,
          itemIds: [it.id],
          cite: f < 1 ? [it.kind === 'recloser' ? ALTITUDE_CITES.recloser : it.kind === 'switch' || it.kind === 'hookstick_switch' ? ALTITUDE_CITES.switch : ALTITUDE_CITES.breaker] : undefined,
        });
      }
    }
    if (it.kind === 'regulator') {
      const cap = regulatorCapacityA(it) * currentSiteFactor('regulator');
      if (amps > cap + 1e-6) {
        const mult = regulatorRangeMultiplier(Number(it.props.rangePct));
        out.push({
          id: fid('rating.regulator'),
          checkId: 'rating.regulator',
          severity: 'major',
          category: 'ratings',
          title: `${itemLabel(it)} is too small`,
          detail: `Load current ≈ ${Math.round(amps)} A at year ${H}; at ±${it.props.rangePct}% regulation the bank carries ${Math.round(cap)} A (${Math.round(mult * 100)}% of its ±10% rating). Choose a larger rating or a narrower range.`,
          itemIds: [it.id],
          cite: [{ page: 257, section: '5.5.3', table: '5-28' }, ...(isHighAltitude() ? [ALTITUDE_CITES.regulator] : [])],
        });
      }
    }
    if (it.kind === 'fuse') {
      // Game rule: fuse must carry the transformer's top-rated current without melting, but not be grossly oversized.
      const t = design.items.find((x) => x.kind === 'transformer' && topo.deviceById.get(x.id)?.a && (topo.deviceById.get(x.id)!.a === d.a || topo.deviceById.get(x.id)!.a === d.b));
      if (t) {
        const fla = transformerHVCurrentA(t);
        const rating = Number(it.props.ampRating);
        if (rating < fla) {
          out.push({ id: fid('rating.fuse.small'), checkId: 'rating.fuse.small', severity: 'major', category: 'ratings', title: `${itemLabel(it)} will blow on normal load`, detail: `${t.label ?? 'Transformer'} draws up to ${Math.round(fla)} A at its top rating; the ${rating}E fuse is too small.`, itemIds: [it.id, t.id] });
        } else if (rating > 3 * (Number(t.props.kva) / (Math.sqrt(3) * t.kv))) {
          out.push({ id: fid('rating.fuse.large'), checkId: 'rating.fuse.large', severity: 'minor', category: 'ratings', title: `${itemLabel(it)} is oversized`, detail: 'A fuse far above the transformer rating gives poor protection for transformer faults.', itemIds: [it.id, t.id] });
        }
      }
    }
  }

  // --- Bus ampacity -------------------------------------------------------------------------
  for (const c of design.conductors) {
    const n = topo.nodeOfConductor.get(c.id);
    if (!n) continue;
    const amps = calc.nodeCurrentA.get(n) ?? 0;
    const size = CONDUCTOR_SIZES.find((s) => s.key === c.size) ?? CONDUCTOR_SIZES[0]!;
    const ampacity = size.ampacityA * currentSiteFactor('bus');
    if (amps > ampacity) {
      out.push({ id: fid('rating.bus'), checkId: 'rating.bus', severity: 'major', category: 'ratings', title: 'Bus conductor too small', detail: `About ${Math.round(amps)} A flows here; ${size.label} is good for ${Math.round(ampacity)} A${isHighAltitude() ? ' at this altitude (Table 4-10)' : ''}.`, conductorIds: [c.id], cite: [{ page: 160, section: '4.10.4' }, ...(isHighAltitude() ? [ALTITUDE_CITES.bus] : [])] });
    }
  }
  return out;
}
