/**
 * Equipment rating helpers built on the cited bulletin data modules.
 */
import { COOLING_UPRATE_RULES, forcedCooledRatingsKVA, standardImpedancePct, TABLE_5_11_STANDARD_IMPEDANCE, TABLE_5_9_THREE_PHASE_HV_BIL } from '../data/bulletin/transformers';
import { regulatorCurrentCapabilityA, TABLE_5_28_SINGLE_PHASE_RANGE_CURRENT } from '../data/bulletin/regulators';
import type { Citation } from '../data/bulletin/types';
import type { PlacedItem } from './types';

export const EQUIPMENT_CITES = {
  cooling: COOLING_UPRATE_RULES.cite,
  impedance: TABLE_5_11_STANDARD_IMPEDANCE.cite,
  hvBil: TABLE_5_9_THREE_PHASE_HV_BIL.cite,
  regulatorRange: TABLE_5_28_SINGLE_PHASE_RANGE_CURRENT.cite,
} satisfies Record<string, Citation>;

export function coolingStages(cooling: string): 0 | 1 | 2 {
  return cooling === 'OA/FA/FA' ? 2 : cooling === 'OA/FA' ? 1 : 0;
}

/**
 * Ratings [OA, FA1, FA2…] under the §5.2.2 rules (p. 192): one fan stage adds
 * 15% (750–2000 kVA) or 25% (2500–10 000 kVA); above 10 000 kVA up to two
 * stages each add one third of the OA rating. Returns the allowed ratings, and
 * whether the requested number of stages is offered for this size.
 */
export function transformerRatings(kva: number, cooling: string): { ratings: number[]; stagesAllowed: boolean } {
  const want = coolingStages(cooling);
  const exact = forcedCooledRatingsKVA(kva, want);
  if (exact) return { ratings: exact, stagesAllowed: true };
  for (let s = want - 1; s >= 0; s--) {
    const r = forcedCooledRatingsKVA(kva, s as 0 | 1 | 2);
    if (r) return { ratings: r, stagesAllowed: false };
  }
  return { ratings: [kva], stagesAllowed: want === 0 };
}

export function transformerTopRatingKVA(it: PlacedItem): number {
  const kva = Number(it.props.kva) || 0;
  const { ratings } = transformerRatings(kva, String(it.props.cooling ?? 'OA'));
  return ratings[ratings.length - 1] ?? kva;
}

/** HV winding BIL of a three-phase power transformer (Table 5-9), kV. */
export function transformerHvBilKV(hvKV: number): number {
  const rows = TABLE_5_9_THREE_PHASE_HV_BIL.value;
  const v = hvKV * 1000;
  const row = rows.find((r) => r.hvV >= v - 1) ?? rows[rows.length - 1]!;
  return row.powerBilKV;
}

/** Standard percent impedance at the OA rating (Table 5-11), for the transformer's HV BIL, LV voltage and LTC. */
export function typicalImpedancePct(it: PlacedItem): number {
  const bil = transformerHvBilKV(it.kv);
  const lvVolts = (Number(it.props.lvKV) || 12.47) * 1000;
  const z = standardImpedancePct(bil, lvVolts, !!it.props.ltc, Number(it.props.kva) || 0);
  if (z != null) return z;
  // Table 5-11 has no LTC value for the lowest BIL class: fall back to the no-LTC value.
  return standardImpedancePct(bil, lvVolts, false, Number(it.props.kva) || 0) ?? 8;
}

/**
 * Regulator current capability at its selected range (Table 5-28, single-phase
 * units). The table's 668 A footnote caps the uprated current from a reduced
 * range; it never takes a larger unit below its own ±10% rating.
 */
export function regulatorCapacityA(it: PlacedItem): number {
  const rated = Number(it.props.ratedA) || 0;
  return Math.max(rated, regulatorCurrentCapabilityA(rated, Number(it.props.rangePct) || 10, 1));
}

export function regulatorRangeMultiplier(rangePct: number): number {
  return regulatorCurrentCapabilityA(100, rangePct, 1) / 100;
}
