/**
 * Equipment rating helpers. Values come from the bulletin data modules where
 * available (see src/data/bulletin/*); anything not in the bulletin is marked
 * as a game assumption.
 */
import type { PlacedItem } from './types';

/** Multiplier from the self-cooled (OA) rating to the top forced-air rating. */
export function coolingMultiplier(kva: number, cooling: string): number {
  if (cooling === 'OA') return 1;
  // Provisional: ANSI-style fan ratings (refined from bulletin Tables 5-4..5-6 when available).
  if (kva < 2500) return 1.15;
  if (kva <= 10000) return 1.25;
  return cooling === 'OA/FA/FA' ? 1.667 : 1.333;
}

export function transformerTopRatingKVA(it: PlacedItem): number {
  const kva = Number(it.props.kva) || 0;
  return kva * coolingMultiplier(kva, String(it.props.cooling ?? 'OA'));
}

/** Typical percent impedance at the OA rating for the transformer's HV insulation class. */
export function typicalImpedancePct(it: PlacedItem): number {
  const kv = it.kv;
  // Provisional typical values by HV class (refined from bulletin Table 5-11 when available).
  if (kv <= 46) return 6.5;
  if (kv <= 69) return 7.25;
  if (kv <= 138) return 8.0;
  if (kv <= 161) return 8.5;
  return 9.5;
}

/** Regulator current capability as a multiple of its ±10% rating, by regulation range (%). */
export function regulatorRangeMultiplier(rangePct: number): number {
  // Provisional (refined from bulletin Table 5-28 when available).
  const table: Record<string, number> = { '10': 1.0, '8.75': 1.1, '7.5': 1.2, '6.25': 1.35, '5': 1.6 };
  return table[String(rangePct)] ?? 1;
}

export function regulatorCapacityA(it: PlacedItem): number {
  return (Number(it.props.ratedA) || 0) * regulatorRangeMultiplier(Number(it.props.rangePct) || 10);
}
