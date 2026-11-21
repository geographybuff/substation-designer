/**
 * Equipment rating helpers built on the cited bulletin data modules.
 */
import { COOLING_UPRATE_RULES, forcedCooledRatingsKVA, standardImpedancePct, TABLE_5_11_STANDARD_IMPEDANCE, TABLE_5_9_THREE_PHASE_HV_BIL } from '../data/bulletin/transformers';
import { regulatorCurrentCapabilityA, TABLE_5_28_SINGLE_PHASE_RANGE_CURRENT } from '../data/bulletin/regulators';
import type { Citation } from '../data/bulletin/types';
import { TABLE_5_60_OIL_RECLOSERS, TABLE_5_61_VACUUM_RECLOSERS, type RecloserRatingRow } from '../data/bulletin/reclosers';
import { minDutyCycleUngroundedKV, minMcovSolidlyGroundedKV, PROTECTIVE_MARGINS, TABLE_5_57_CITE, TABLE_5_57_MOV_RATINGS, TABLE_5_58_MOV_CHARACTERISTICS } from '../data/bulletin/arresters';
import { voltageClassFor } from '../data/bulletin/voltageClasses';
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

// ---------------------------------------------------------------------------
// Reclosers: standard ratings from Tables 5-60 (oil) and 5-61 (vacuum)
// ---------------------------------------------------------------------------

export const RECLOSER_TABLE_CITES = {
  oil: { page: 365, section: '5.9.3', table: '5-60' },
  vacuum: { page: 366, section: '5.9.3', table: '5-61' },
} satisfies Record<string, Citation>;

/** Three-phase overhead recloser rating rows for the item's voltage class and interrupter type. */
export function standardRecloserRows(kv: number, interrupter: string): RecloserRatingRow[] {
  const vcMax = voltageClassFor(kv).maxKV;
  const rows = (interrupter === 'oil' ? TABLE_5_60_OIL_RECLOSERS : TABLE_5_61_VACUUM_RECLOSERS).filter((r) => r.phases === 3 && r.ratedMaxKV >= vcMax - 1e-6);
  if (!rows.length) return [];
  const classMax = Math.min(...rows.map((r) => r.ratedMaxKV));
  return rows.filter((r) => r.ratedMaxKV === classMax);
}

export function isStandardRecloserRating(it: PlacedItem): boolean {
  const a = Number(it.props.continuousA);
  const ka = Number(it.props.interruptingKA);
  return standardRecloserRows(it.kv, String(it.props.interrupter)).some((r) => r.continuousA === a && Math.abs(r.interruptingA / 1000 - ka) < 1e-6);
}

/** A sensible default rating row (560 A where available). */
export function defaultRecloserRating(kv: number, interrupter: string): { continuousA: number; interruptingKA: number } | null {
  const rows = standardRecloserRows(kv, interrupter);
  const r = rows.find((x) => x.continuousA === 560) ?? rows[Math.floor(rows.length / 2)];
  return r ? { continuousA: r.continuousA, interruptingKA: r.interruptingA / 1000 } : null;
}

// ---------------------------------------------------------------------------
// Metal-oxide arresters: MCOV selection (Eq. 5-7) and protective margin (§5.8.7)
// ---------------------------------------------------------------------------

export interface ArresterRating {
  /** Selected MCOV, kV rms (auto = smallest Table 5-57 rating meeting the minimum). */
  mcovKV: number;
  dutyCycleKV: number;
  /** Minimum MCOV the system requires, kV rms. */
  minMcovKV: number;
  /** Lightning protective level (8x20 µs discharge, upper bound of Table 5-58), kV crest. */
  lplKV: number;
  /** BIL of the protected insulation, kV crest. */
  bilKV: number;
  /** Ratio L = BIL / LPL (must be ≥ 1.20). */
  ratioL: number;
  auto: boolean;
}

export const ARRESTER_CITES = {
  mcov: { page: 344, section: '5.8.7.3', equation: '5-7' },
  margin: { page: 347, section: '5.8.7' },
  ratings: TABLE_5_57_CITE,
} satisfies Record<string, Citation>;

/**
 * Rate an arrester on a system of nominal voltage `systemKV`. On effectively grounded systems the
 * minimum MCOV is E_LL·1.05/√3 (Eq. 5-7); otherwise the duty-cycle rating must be at least E_LL·1.05.
 * The lightning protective level uses the upper per-unit discharge voltage of the Table 5-58 station
 * class row for the system, times the MCOV crest.
 */
export function arresterRating(systemKV: number, effectivelyGrounded: boolean, chosenMcovKV: number, protectedBilKV: number): ArresterRating {
  const minMcov = effectivelyGrounded ? minMcovSolidlyGroundedKV(systemKV) : 0;
  const minDuty = effectivelyGrounded ? 0 : minDutyCycleUngroundedKV(systemKV);
  const sorted = [...TABLE_5_57_MOV_RATINGS].sort((a, b) => a.mcovKV - b.mcovKV);
  const autoRow = sorted.find((r) => r.mcovKV >= minMcov - 1e-9 && r.dutyCycleKV >= minDuty - 1e-9) ?? sorted[sorted.length - 1]!;
  const chosen = chosenMcovKV > 0 ? (sorted.find((r) => Math.abs(r.mcovKV - chosenMcovKV) < 1e-6) ?? autoRow) : autoRow;
  const maxLL = voltageClassFor(systemKV).maxKV;
  const row = TABLE_5_58_MOV_CHARACTERISTICS.station.find((r) => r.maxSystemLLkV >= maxLL - 1e-6) ?? TABLE_5_58_MOV_CHARACTERISTICS.station[TABLE_5_58_MOV_CHARACTERISTICS.station.length - 1]!;
  const lpl = row.lightningDischarge8x20Pu[1] * Math.SQRT2 * chosen.mcovKV;
  return {
    mcovKV: chosen.mcovKV,
    dutyCycleKV: chosen.dutyCycleKV,
    minMcovKV: effectivelyGrounded ? minMcov : 0,
    lplKV: lpl,
    bilKV: protectedBilKV,
    ratioL: protectedBilKV / lpl,
    auto: !(chosenMcovKV > 0),
  };
}

export const LIGHTNING_MARGIN_MIN = PROTECTIVE_MARGINS.lightningMinRatio;
