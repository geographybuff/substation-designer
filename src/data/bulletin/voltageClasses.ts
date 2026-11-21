/**
 * Voltage-class data: insulation levels, clearances, phase spacings and fence
 * safety clearances, merged from several tables of RUS Bulletin 1724E-300.
 *
 * All distances in metres. Values apply at altitudes of 1000 m (3300 ft) or
 * less; for higher altitudes the bulletin directs that Table 4-3 correction
 * factors be applied (see altitude data).
 */
import type { Citation } from './types';

export interface VoltageClassRow {
  /** Nominal phase-to-phase voltage, kV. */
  nominalKV: number;
  /** Maximum phase-to-phase voltage, kV (Table 4-7). */
  maxKV: number;
  /** Basic lightning impulse insulation level, kV crest (Tables 4-2 / 4-7). */
  bilKV: number;
  /** Table 4-7: minimum metal-to-metal clearance for rigid conductors (phase-to-phase). */
  minMetalToMetalM: number;
  /** Table 4-7: centerline-to-centerline phase spacing for rigid buses. */
  rigidBusPhaseSpacingM: number;
  /** Table 4-7: minimum clearance from rigid conductors to grounded parts. */
  minToGroundedPartsM: number;
  /** Table 4-7: minimum clearance between bare overhead conductors and ground, for personal safety. */
  groundClearanceM: number;
  /** Table 4-7: minimum clearance between bare overhead conductors and roadways inside the substation enclosure. */
  roadwayClearanceM: number;
  /** Table 4-8: minimum metal-to-metal clearance for air switches. */
  switchMinMetalToMetalM: number;
  /** Table 4-8: centerline phase spacing, vertical break disconnect switches. */
  switchSpacingVerticalBreakM: number;
  /** Table 4-8: centerline phase spacing, side or horizontal break disconnect switches (null where the table gives none). */
  switchSpacingSideBreakM: number | null;
  /** Table 4-8: centerline phase spacing, all horn gap switches (null where the table gives none). */
  switchSpacingHornGapM: number | null;
  /** Table 4-6: minimum quantity of standard 146 x 254 mm (5-3/4 x 10 in) suspension insulators. */
  minSuspensionInsulators: number;
  /** Figure 4-21 dimension A: vertical safety clearance zone height at the fence (null if not tabulated). */
  fenceDimAM: number | null;
  /** Figure 4-21 dimension B: horizontal safety clearance from fence to live parts (null if not tabulated). */
  fenceDimBM: number | null;
}

export const VOLTAGE_CLASS_CITES = {
  insulatorBIL: {
    page: 146,
    section: '4.8.1.2',
    table: '4-2',
    originalSource: 'NEMA SG-6-1995, Table 32-1',
  } satisfies Citation,
  suspensionInsulators: { page: 153, section: '4.8.2', table: '4-6' } satisfies Citation,
  clearances: {
    page: 154,
    section: '4.9',
    table: '4-7',
    originalSource: 'ANSI C37.32-1996, Table 5; NEMA SG-6-1995, Table 32-1',
    note: 'Values are for altitudes of 1000 m (3300 ft) or less; apply Table 4-3 above that.',
  } satisfies Citation,
  switchSpacing: {
    page: 155,
    section: '4.9',
    table: '4-8',
    originalSource: 'ANSI C37.32-1996, Table 5',
    note: 'Minimum metal-to-metal clearances apply with switches open, closed, or in between.',
  } satisfies Citation,
  fence: {
    page: 158,
    figure: '4-21',
    originalSource: 'IEEE Std 119-1988, Fig. 1; ANSI C2-1987 (NESC) Rules 232, 124',
    note:
      'Dimension B is the horizontal clearance from the fence to unguarded live parts; dimension A is the height of the safety clearance zone. ' +
      'For 115 kV and above, dimension A is increased 3% per 300 m (1000 ft) above 1000 m (3300 ft).',
  } satisfies Citation,
  foundationToInsulator: {
    page: 154,
    table: '4-7',
    note:
      'Table 4-7 note 3: clearance from top of foundation to the bottom of bushings or insulators of energized equipment should never be less than 2.44 m (8 ft).',
  } satisfies Citation,
} as const;

/** Minimum height from top of foundation to bottom of energized bushings/insulators (Table 4-7 note 3). */
export const MIN_FOUNDATION_TO_INSULATOR_M = 2.44;

/**
 * Rows for the nominal voltages the game uses. The 230 kV row uses the 900 kV
 * BIL entries; the tables also list a 1050 kV BIL option for 230 kV.
 */
export const VOLTAGE_CLASSES: readonly VoltageClassRow[] = [
  { nominalKV: 7.5, maxKV: 8.3, bilKV: 95, minMetalToMetalM: 0.178, rigidBusPhaseSpacingM: 0.457, minToGroundedPartsM: 0.152, groundClearanceM: 2.44, roadwayClearanceM: 6.10, switchMinMetalToMetalM: 0.175, switchSpacingVerticalBreakM: 0.457, switchSpacingSideBreakM: 0.762, switchSpacingHornGapM: 0.914, minSuspensionInsulators: 1, fenceDimAM: 4.6, fenceDimBM: 3.1 },
  { nominalKV: 14.4, maxKV: 15.5, bilKV: 110, minMetalToMetalM: 0.305, rigidBusPhaseSpacingM: 0.610, minToGroundedPartsM: 0.178, groundClearanceM: 2.74, roadwayClearanceM: 6.40, switchMinMetalToMetalM: 0.305, switchSpacingVerticalBreakM: 0.610, switchSpacingSideBreakM: 0.762, switchSpacingHornGapM: 0.914, minSuspensionInsulators: 2, fenceDimAM: 4.6, fenceDimBM: 3.1 },
  { nominalKV: 23, maxKV: 25.8, bilKV: 150, minMetalToMetalM: 0.381, rigidBusPhaseSpacingM: 0.762, minToGroundedPartsM: 0.254, groundClearanceM: 3.05, roadwayClearanceM: 6.71, switchMinMetalToMetalM: 0.381, switchSpacingVerticalBreakM: 0.762, switchSpacingSideBreakM: 0.914, switchSpacingHornGapM: 1.22, minSuspensionInsulators: 2, fenceDimAM: 4.6, fenceDimBM: 3.1 },
  { nominalKV: 34.5, maxKV: 38, bilKV: 200, minMetalToMetalM: 0.457, rigidBusPhaseSpacingM: 0.914, minToGroundedPartsM: 0.330, groundClearanceM: 3.05, roadwayClearanceM: 6.71, switchMinMetalToMetalM: 0.457, switchSpacingVerticalBreakM: 0.914, switchSpacingSideBreakM: 1.22, switchSpacingHornGapM: 1.52, minSuspensionInsulators: 3, fenceDimAM: 4.6, fenceDimBM: 3.1 },
  { nominalKV: 46, maxKV: 48.3, bilKV: 250, minMetalToMetalM: 0.533, rigidBusPhaseSpacingM: 1.22, minToGroundedPartsM: 0.432, groundClearanceM: 3.05, roadwayClearanceM: 6.71, switchMinMetalToMetalM: 0.533, switchSpacingVerticalBreakM: 1.22, switchSpacingSideBreakM: 1.52, switchSpacingHornGapM: 1.83, minSuspensionInsulators: 4, fenceDimAM: 4.9, fenceDimBM: 3.7 },
  { nominalKV: 69, maxKV: 72.5, bilKV: 350, minMetalToMetalM: 0.787, rigidBusPhaseSpacingM: 1.52, minToGroundedPartsM: 0.635, groundClearanceM: 3.35, roadwayClearanceM: 7.01, switchMinMetalToMetalM: 0.787, switchSpacingVerticalBreakM: 1.52, switchSpacingSideBreakM: 1.83, switchSpacingHornGapM: 2.13, minSuspensionInsulators: 5, fenceDimAM: 4.9, fenceDimBM: 3.7 },
  { nominalKV: 115, maxKV: 121, bilKV: 550, minMetalToMetalM: 1.35, rigidBusPhaseSpacingM: 2.13, minToGroundedPartsM: 1.07, groundClearanceM: 3.66, roadwayClearanceM: 7.62, switchMinMetalToMetalM: 1.35, switchSpacingVerticalBreakM: 2.13, switchSpacingSideBreakM: 2.74, switchSpacingHornGapM: 3.05, minSuspensionInsulators: 8, fenceDimAM: 5.1, fenceDimBM: 4.0 },
  { nominalKV: 138, maxKV: 145, bilKV: 650, minMetalToMetalM: 1.60, rigidBusPhaseSpacingM: 2.44, minToGroundedPartsM: 1.27, groundClearanceM: 3.96, roadwayClearanceM: 7.62, switchMinMetalToMetalM: 1.60, switchSpacingVerticalBreakM: 2.44, switchSpacingSideBreakM: 3.35, switchSpacingHornGapM: 3.66, minSuspensionInsulators: 9, fenceDimAM: 5.2, fenceDimBM: 4.3 },
  { nominalKV: 161, maxKV: 169, bilKV: 750, minMetalToMetalM: 1.83, rigidBusPhaseSpacingM: 2.74, minToGroundedPartsM: 1.47, groundClearanceM: 4.27, roadwayClearanceM: 7.92, switchMinMetalToMetalM: 1.83, switchSpacingVerticalBreakM: 2.74, switchSpacingSideBreakM: 3.96, switchSpacingHornGapM: 4.27, minSuspensionInsulators: 10, fenceDimAM: 5.4, fenceDimBM: 4.3 },
  { nominalKV: 230, maxKV: 242, bilKV: 900, minMetalToMetalM: 2.26, rigidBusPhaseSpacingM: 3.35, minToGroundedPartsM: 1.80, groundClearanceM: 4.57, roadwayClearanceM: 8.23, switchMinMetalToMetalM: 2.26, switchSpacingVerticalBreakM: 3.35, switchSpacingSideBreakM: 4.87, switchSpacingHornGapM: 4.87, minSuspensionInsulators: 12, fenceDimAM: 5.8, fenceDimBM: 4.9 },
] as const;

/**
 * Distribution secondary voltages named by the bulletin for distribution
 * substations (§4.3, p. 121): 12.5Y/7.2, 13.2Y/7.6, 13.8Y/8.0, 24.9Y/14.4 and 34.5Y/19.9 kV.
 * They map onto the 15 kV (14.4), 25 kV (23) and 34.5 kV clearance rows.
 */
export const DISTRIBUTION_SECONDARY_VOLTAGES = {
  values: ['12.5Y/7.2', '13.2Y/7.6', '13.8Y/8.0', '24.9Y/14.4', '34.5Y/19.9'] as const,
  cite: { page: 121, section: '4.3' } satisfies Citation,
};

/**
 * Find the clearance row governing a system: the smallest tabulated class whose
 * maximum voltage is at least the system's nominal voltage (e.g. 12.47 kV -> 14.4 kV
 * class with 15.5 kV max; 24.9 kV -> 23 kV class with 25.8 kV max).
 */
export function voltageClassFor(systemKV: number): VoltageClassRow {
  const row = VOLTAGE_CLASSES.find((r) => r.maxKV >= systemKV);
  if (!row) throw new Error(`No voltage class covers ${systemKV} kV`);
  return row;
}
