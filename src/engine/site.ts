/**
 * Site conditions shared by clearance and rating helpers: altitude above sea level.
 *
 * Equipment ratings and the clearances of Tables 4-7 and 4-8 apply at 1000 m (3300 ft)
 * or less. Above that the bulletin derates insulation (Table 4-3), current ratings
 * (Tables 4-10, 5-25, 5-41, 5-59) and transformer kVA (Table 5-2). The active level
 * sets the altitude once (when a level starts, and at every review), so the many
 * footprint and clearance helpers that take only a voltage stay simple.
 */
import { breakerAltitudeFactors, TABLE_5_25_BREAKER_ALTITUDE } from '../data/bulletin/breakers';
import { bilAltitudeFactor, TABLE_4_10_CURRENT_ALTITUDE, TABLE_4_3_BIL_ALTITUDE } from '../data/bulletin/insulatorsConductors';
import { recloserAltitudeFactors, TABLE_5_59_CITE } from '../data/bulletin/reclosers';
import { regulatorAltitudeLoadFactor, TABLE_5_34_REGULATOR_LOADING_ALTITUDE } from '../data/bulletin/regulators';
import { TABLE_5_41_SWITCH_ALTITUDE } from '../data/bulletin/airSwitches';
import { TABLE_5_2_KVA_ALTITUDE_DERATING, transformerAltitudeKvaFactor } from '../data/bulletin/transformers';
import type { Citation } from '../data/bulletin/types';
import { VOLTAGE_CLASSES, voltageClassFor, type VoltageClassRow } from '../data/bulletin/voltageClasses';
import type { ItemKind } from './types';

/** Ratings and clearances apply up to this altitude without correction. */
export const STANDARD_ALTITUDE_M = 1000;

let altitudeM = 0;

export function setSiteAltitude(m: number | undefined): void {
  altitudeM = typeof m === 'number' && Number.isFinite(m) ? m : 0;
}

export function siteAltitudeM(): number {
  return altitudeM;
}

export const isHighAltitude = (alt = altitudeM): boolean => alt > STANDARD_ALTITUDE_M;

/** Table 4-3 dielectric (BIL) correction factor at the site; 1 at or below 1000 m. */
export function siteBilFactor(alt = altitudeM): number {
  return isHighAltitude(alt) ? bilAltitudeFactor(alt) : 1;
}

export const ALTITUDE_CITES = {
  /** §4.9 (p. 156): derate the standard BILs by Table 4-3, then use the clearances of the BIL selected. */
  clearances: { page: 156, section: '4.9', table: '4-9', note: 'Derate the standard BILs by the Table 4-3 factors, then choose the Table 4-7 clearances of the BIL selected (e.g. 115 kV at 2400 m: 650 kV BIL).' },
  bil: TABLE_4_3_BIL_ALTITUDE.cite,
  transformer: TABLE_5_2_KVA_ALTITUDE_DERATING.cite,
  breaker: TABLE_5_25_BREAKER_ALTITUDE.cite,
  recloser: TABLE_5_59_CITE,
  switch: TABLE_5_41_SWITCH_ALTITUDE.cite,
  regulator: TABLE_5_34_REGULATOR_LOADING_ALTITUDE.cite,
  bus: TABLE_4_10_CURRENT_ALTITUDE.cite,
} satisfies Record<string, Citation>;

/**
 * The Table 4-7/4-8 row whose clearances apply to a system of `kv` at the site. At or below
 * 1000 m this is the system's own voltage class. Above it, §4.9: the standard BILs are
 * derated by Table 4-3 and the smallest standard BIL whose derated value still equals the
 * system's standard BIL is selected; its clearances (and insulation) are used.
 */
export function clearanceClassFor(kv: number, alt = altitudeM): VoltageClassRow {
  const vc = voltageClassFor(kv);
  const f = siteBilFactor(alt);
  if (f >= 1) return vc;
  return VOLTAGE_CLASSES.find((r) => r.bilKV * f >= vc.bilKV - 1e-9) ?? VOLTAGE_CLASSES[VOLTAGE_CLASSES.length - 1]!;
}

/** Equipment BIL specified for a system of `kv` at the site (the standard BIL below 1000 m). */
export const specifiedBilKV = (kv: number, alt = altitudeM): number => clearanceClassFor(kv, alt).bilKV;

/** Number of standard BIL steps the site adds above the system's own class (0 below 1000 m). */
export function insulationSteps(kv: number, alt = altitudeM): number {
  const base = VOLTAGE_CLASSES.indexOf(voltageClassFor(kv));
  return Math.max(0, VOLTAGE_CLASSES.indexOf(clearanceClassFor(kv, alt)) - base);
}

/** Table 5-2: transformer kVA multiplier at the site (forced-air ratings derate 0.5 %/100 m, self-cooled 0.4 %/100 m). */
export function transformerSiteFactor(forcedCooled: boolean, alt = altitudeM): number {
  return isHighAltitude(alt) ? transformerAltitudeKvaFactor(alt, forcedCooled) : 1;
}

/** Continuous-current multiplier for a device kind at the site (Tables 5-25, 5-41, 5-59, 5-34, 4-10). */
export function currentSiteFactor(kind: ItemKind | 'bus', alt = altitudeM, opts: { forcedAir?: boolean } = {}): number {
  if (!isHighAltitude(alt)) return 1;
  switch (kind) {
    case 'breaker':
    case 'circuit_switcher':
      return breakerAltitudeFactors(alt).currentFactor;
    case 'recloser':
      return recloserAltitudeFactors(alt).current;
    case 'switch':
    case 'hookstick_switch':
      return interpolate(TABLE_5_41_SWITCH_ALTITUDE.value.map((r) => [r.altitudeM, r.currentFactor] as const), alt);
    case 'regulator':
      return regulatorAltitudeLoadFactor(alt, !!opts.forcedAir);
    case 'bus':
      return interpolate(TABLE_4_10_CURRENT_ALTITUDE.value.map((r) => [r.altitudeM, r.currentFactor] as const), alt);
    default:
      return 1;
  }
}

/** Recloser voltage multiplier (Table 5-59): rated maximum voltage × factor must cover the system. */
export function recloserVoltageFactor(alt = altitudeM): number {
  return isHighAltitude(alt) ? recloserAltitudeFactors(alt).voltage : 1;
}

function interpolate(rows: ReadonlyArray<readonly [number, number]>, x: number): number {
  if (x <= rows[0]![0]) return rows[0]![1];
  for (let i = 1; i < rows.length; i++) {
    const [x1, y1] = rows[i]!;
    const [x0, y0] = rows[i - 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return rows[rows.length - 1]![1];
}
