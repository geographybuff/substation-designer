import { describe, expect, it } from 'vitest';
import { arresterRating, defaultRecloserRating, standardRecloserRows } from '../src/engine/equipment';
import { reviewDesign } from '../src/engine/review';
import { sampleDesign, SAMPLE_LEVEL } from '../src/engine/samples';

describe('standard recloser ratings (Tables 5-60, 5-61)', () => {
  it('offers the 15.5 kV vacuum rows for a 12.47 kV system', () => {
    const rows = standardRecloserRows(12.47, 'vacuum');
    expect(rows.every((r) => r.ratedMaxKV === 15.5)).toBe(true);
    expect(rows.map((r) => `${r.continuousA}/${r.interruptingA}`)).toContain('560/12000');
  });
  it('uses the 27 kV class for 24.9 kV and defaults to 560 A', () => {
    expect(defaultRecloserRating(24.9, 'vacuum')).toEqual({ continuousA: 560, interruptingKA: 10 });
  });
  it('flags a non-standard combination', () => {
    const d = sampleDesign();
    d.items.find((i) => i.id === 'R1')!.props.interruptingKA = 10;
    expect(reviewDesign(d, SAMPLE_LEVEL).findings.some((f) => f.checkId === 'rating.recloser.std' && f.itemIds?.includes('R1'))).toBe(true);
  });
});

describe('arrester MCOV and protective margin (§5.8.7)', () => {
  it('auto-selects the smallest Table 5-57 rating meeting Eq. 5-7', () => {
    const r = arresterRating(69, true, 0, 350);
    expect(r.minMcovKV).toBeCloseTo((69 * 1.05) / Math.sqrt(3), 6);
    expect(r.mcovKV).toBe(42);
    expect(r.ratioL).toBeGreaterThan(1.2);
  });
  it('flags an MCOV below the minimum and an excessive rating', () => {
    const lo = sampleDesign();
    lo.items.push({ id: 'LAx', kind: 'arrester', x: 1.5, y: 25.5, rot: 1, kv: 69, props: { class: 'station', mcovKV: 39 } });
    lo.conductors.push({ id: 'Tx', kv: 69, elevation: 'low', size: 'pipe2', points: [{ x: 3.5, y: 23 }, { x: 3.5, y: 25.5 }] });
    expect(reviewDesign(lo, SAMPLE_LEVEL).findings.some((f) => f.checkId === 'surge.mcov')).toBe(true);
    const r = arresterRating(69, true, 98, 350);
    expect(r.ratioL).toBeLessThan(1.2);
  });
});
