import { afterEach, describe, expect, it } from 'vitest';
import { bilAltitudeFactor } from '../src/data/bulletin/insulatorsConductors';
import { busHeight } from '../src/engine/catalog';
import { standardRecloserRows, transformerSiteRatingKVA } from '../src/engine/equipment';
import { reviewDesign } from '../src/engine/review';
import { clearanceClassFor, currentSiteFactor, insulationSteps, setSiteAltitude, specifiedBilKV } from '../src/engine/site';
import type { PlacedItem } from '../src/engine/types';
import { getLevel } from '../src/levels';
import { SOLUTIONS } from '../src/levels/solutions';

const xfmr = (kva: number, cooling: string): PlacedItem => ({ id: 'T', kind: 'transformer', x: 0, y: 0, rot: 0, kv: 115, props: { kva, cooling } });

afterEach(() => setSiteAltitude(0));

describe('altitude corrections', () => {
  it('reproduces the bulletin Table 4-9 example (115 kV at 2400 m selects 650 kV BIL)', () => {
    expect(bilAltitudeFactor(2400)).toBe(0.86);
    expect([550, 650, 750].map((b) => Math.round(b * bilAltitudeFactor(2400)))).toEqual([473, 559, 645]);
    expect(specifiedBilKV(115, 2400)).toBe(650);
    expect(clearanceClassFor(115, 2400).nominalKV).toBe(138);
    expect(specifiedBilKV(115, 1000)).toBe(550);
    expect(specifiedBilKV(24.9, 2400)).toBe(200);
    expect(insulationSteps(115, 2400)).toBe(1);
    expect(insulationSteps(69, 900)).toBe(0);
  });

  it('raises bus heights with the selected clearance class', () => {
    setSiteAltitude(0);
    const low = busHeight(115, 'low');
    setSiteAltitude(2400);
    expect(busHeight(115, 'low')).toBeGreaterThan(low);
  });

  it('derates transformer kVA per Table 5-2 (0.5 %/100 m forced air, 0.4 %/100 m self-cooled)', () => {
    setSiteAltitude(2400);
    expect(transformerSiteRatingKVA(xfmr(12000, 'OA/FA'))).toBeCloseTo(16000 * 0.93, 6);
    expect(transformerSiteRatingKVA(xfmr(10000, 'OA'))).toBeCloseTo(10000 * 0.944, 6);
    setSiteAltitude(900);
    expect(transformerSiteRatingKVA(xfmr(12000, 'OA/FA'))).toBe(16000);
  });

  it('needs a higher-voltage recloser class at altitude (Table 5-59 voltage factor)', () => {
    setSiteAltitude(0);
    expect(standardRecloserRows(24.9, 'vacuum').every((r) => r.ratedMaxKV === 27)).toBe(true);
    setSiteAltitude(2400);
    const rows = standardRecloserRows(24.9, 'vacuum');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.ratedMaxKV * 0.86 >= 25.8)).toBe(true);
  });

  it('applies the current factors of Tables 5-25 and 4-10', () => {
    expect(currentSiteFactor('breaker', 3000)).toBe(0.96);
    expect(currentSiteFactor('bus', 2400)).toBe(0.97);
    expect(currentSiteFactor('recloser', 800)).toBe(1);
  });

  it('makes the Thin Air solution fail with a transformer sized for sea level', () => {
    const level = getLevel('l8-thin-air')!;
    const d = SOLUTIONS['l8-thin-air']!();
    const t = d.items.find((i) => i.id === 'T1')!;
    t.props = { ...t.props, kva: 10000, cooling: 'OA/FA' };
    const r = reviewDesign(d, level);
    expect(r.findings.some((f) => f.checkId === 'rating.xfmr.horizon')).toBe(true);
    const seaLevel = reviewDesign(d, { ...level, site: { ...level.site, altitudeM: 300 } });
    expect(seaLevel.findings.some((f) => f.checkId === 'rating.xfmr.horizon')).toBe(false);
  });
});
