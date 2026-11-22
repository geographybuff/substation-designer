import { describe, expect, it } from 'vitest';
import { sampleDesign, SAMPLE_LEVEL } from '../src/engine/samples';
import { reviewDesign } from '../src/engine/review';
import { fenceRequiredDistance, fenceZoneViolation } from '../src/engine/checks/physical';
import { fixedAngleProtected, strikeDistanceM, allowableStrokeCurrentKA } from '../src/engine/lightning';
import type { Design } from '../src/engine/types';
import { SOLUTIONS } from '../src/levels/solutions';
import { getLevel } from '../src/levels';
import { alignItemToBus, moveItem } from '../src/engine/design';

const clone = (d: Design): Design => structuredClone(d);

describe('design review of the reference substation', () => {
  const r = reviewDesign(sampleDesign(), SAMPLE_LEVEL);
  it('has no critical or major findings', () => {
    expect(r.findings.filter((f) => f.severity === 'critical' || f.severity === 'major').map((f) => f.title)).toEqual([]);
  });
  it('recognizes a single LV bus and a fused HV tap', () => {
    expect(r.scheme).toEqual({ hv: 'none', lv: 'single_bus' });
  });
  it('is fully shielded by its masts', () => {
    expect(r.shielding.coveredFraction).toBe(1);
  });
  it('computes LV fault level from source and Table 5-11 transformer impedance', () => {
    // 69 kV (350 kV BIL) transformer without LTC: 8.0% on its 10 MVA OA base (Table 5-11).
    // Zs = 100 / (sqrt3 * 69 * 8) = 0.1046 pu, Zt = 0.08 * 100/10 = 0.8 pu (100 MVA base).
    const expected = 100 / (Math.sqrt(3) * 12.47) / (100 / (Math.sqrt(3) * 69 * 8) + 0.8);
    const lvNode = r.topo.nodeOfPort.get('T1:lv')!;
    expect(r.calc.faultKA.get(lvNode)).toBeCloseTo(expected, 6);
    expect(expected).toBeCloseTo(5.12, 2);
  });
});

describe('design review catches classic mistakes', () => {
  it('flags a feeder without its own recloser (§4.3.1)', () => {
    const d = clone(sampleDesign());
    // Replace R1 with a solid jumper: remove recloser and connect across.
    d.items = d.items.filter((i) => i.id !== 'R1');
    d.conductors.push({ id: 'J', kv: 12.47, elevation: 'low', size: 'pipe2', points: [{ x: 33, y: 16 }, { x: 35, y: 16 }] });
    const r = reviewDesign(d, SAMPLE_LEVEL);
    expect(r.findings.some((f) => f.checkId === 'prot.feeder' && f.severity === 'critical')).toBe(true);
  });
  it('flags missing recloser bypass in maintenance analysis (§4.3.4)', () => {
    const d = clone(sampleDesign());
    d.items = d.items.filter((i) => i.id !== 'HS1');
    d.conductors = d.conductors.filter((c) => c.id !== 'C10' && c.id !== 'C11');
    const r = reviewDesign(d, SAMPLE_LEVEL);
    expect(r.facts.bypassed.get('R1')).toBe(false);
    expect(r.facts.bypassed.get('R2')).toBe(true);
    expect(r.reliability.contributions.some((c) => c.planned && c.itemId === 'R1')).toBe(true);
  });
  it('flags equipment of mixed voltages tied together', () => {
    const d = clone(sampleDesign());
    d.conductors.push({ id: 'X', kv: 12.47, elevation: 'low', size: 'pipe2', points: [{ x: 13, y: 23 }, { x: 13, y: 30 }, { x: 27, y: 30 }] });
    const r = reviewDesign(d, SAMPLE_LEVEL);
    expect(r.findings.some((f) => f.checkId === 'conn.voltage')).toBe(true);
  });
  it('flags live equipment inside the fence safety zone (Fig. 4-21)', () => {
    const d = clone(sampleDesign());
    d.fence!.rect = { x: 4.5, y: 8, w: 42.5, h: 30 };
    const r = reviewDesign(d, SAMPLE_LEVEL);
    expect(r.findings.some((f) => f.checkId.startsWith('fence.'))).toBe(true);
  });
  it('flags an interrupting rating below the available fault current', () => {
    const d = clone(sampleDesign());
    d.items.find((i) => i.id === 'R1')!.props.interruptingKA = 4;
    const r = reviewDesign(d, SAMPLE_LEVEL);
    expect(r.findings.some((f) => f.checkId === 'rating.interrupt' && f.itemIds?.includes('R1'))).toBe(true);
  });
});

describe('phases of one bus (Table 4-7)', () => {
  const level = getLevel('l2-keep-the-lights-on')!;
  const ids = (d: Design) => reviewDesign(d, level).findings.map((f) => f.checkId);

  it('flags a bus entering a terminal from the side after an off-line drag, and lines it back up', () => {
    const ok = SOLUTIONS[level.id]!();
    const r1 = ok.items.find((i) => i.id === 'R1')!;
    // Half a metre off the bay centre line: the moved bus ends dog-leg into both terminals.
    const off = moveItem(ok, 'R1', r1.x, r1.y + 0.5);
    const f = reviewDesign(off, level).findings.filter((x) => x.checkId === 'conn.sideentry');
    expect(f.length).toBeGreaterThan(0);
    expect(f[0]!.itemIds).toEqual(['R1']);
    const fixed = alignItemToBus(off, level, 'R1', f[0]!.conductorIds![0]!)!;
    expect(fixed).not.toBeNull();
    expect(fixed.items.find((i) => i.id === 'R1')!.y).toBeCloseTo(r1.y);
    expect(ids(fixed)).not.toContain('conn.sideentry');
    expect(ids(fixed)).not.toContain('clear.selfphase');
  });

  it('flags a jog shorter than two phase spacings', () => {
    const d = SOLUTIONS[level.id]!();
    // Replace a straight feeder connection with a 0.5 m Z-jog (12.47 kV phase spacing is 0.61 m).
    const c = d.conductors.find((x) => x.id === 'F1d')!;
    const [a, b] = [c.points[0]!, c.points[c.points.length - 1]!];
    const mx = (a.x + b.x) / 2;
    c.points = [a, { x: mx - 0.5, y: a.y }, { x: mx - 0.5, y: a.y + 0.5 }, { x: mx, y: a.y + 0.5 }, { x: mx, y: a.y }, b];
    expect(ids(d)).toContain('clear.selfphase');
  });

  it('accepts square corners and branches that tap a straight terminal entry', () => {
    for (const lv of ['l1-first-light', 'l2-keep-the-lights-on', 'l5-growing-pains']) {
      const l = getLevel(lv)!;
      const found = reviewDesign(SOLUTIONS[lv]!(), l).findings.map((f) => f.checkId);
      expect(found).not.toContain('conn.sideentry');
      expect(found).not.toContain('clear.selfphase');
    }
  });
});

describe('Figure 4-21 fence safety zone', () => {
  it('requires the full B distance for low live parts', () => {
    expect(fenceRequiredDistance(1.0, 69)).toBeCloseTo(3.7);
    expect(fenceZoneViolation(3.6, 1.0, 69)).toBe(true);
    expect(fenceZoneViolation(3.7, 1.0, 69)).toBe(false);
  });
  it('allows parts above height A right at the fence', () => {
    expect(fenceRequiredDistance(5.0, 69)).toBe(0);
    expect(fenceZoneViolation(0.1, 9, 69)).toBe(false);
  });
});

describe('§4.7.3 shielding methods', () => {
  it('fixed angle: single mast cone at 30°', () => {
    const g = { masts: [{ id: 'm', p: { x: 0, y: 0 }, h: 20 }], wires: [] };
    const r = (20 - 5) * Math.tan((30 * Math.PI) / 180);
    expect(fixedAngleProtected({ x: r - 0.01, y: 0, z: 5 }, g)).toBe(true);
    expect(fixedAngleProtected({ x: r + 0.01, y: 0, z: 5 }, g)).toBe(false);
  });
  it('fixed angle: between two masts uses 45°', () => {
    const g = { masts: [{ id: 'a', p: { x: 0, y: 0 }, h: 20 }, { id: 'b', p: { x: 24, y: 0 }, h: 20 }], wires: [] };
    // Midpoint ridge = 20 - 12 = 8 m.
    expect(fixedAngleProtected({ x: 12, y: 0, z: 7.9 }, g)).toBe(true);
    expect(fixedAngleProtected({ x: 12, y: 0, z: 8.1 }, g)).toBe(false);
  });
  it('rolling sphere: Eq. 4-1 and 4-2', () => {
    const Is = allowableStrokeCurrentKA(350, 350);
    expect(Is).toBeCloseTo(2.2);
    expect(strikeDistanceM(Is, 1)).toBeCloseTo(8 * Math.pow(2.2, 0.65), 6);
  });
});

describe('alignment guide', () => {
  it('slides equipment placed half a metre off the bay line back onto it', async () => {
    const { alignPlacement } = await import('../src/engine/design');
    const level = getLevel('l2-keep-the-lights-on')!;
    const d = SOLUTIONS[level.id]!();
    const r1 = d.items.find((i) => i.id === 'R1')!;
    const without = { ...d, items: d.items.filter((i) => i.id !== 'R1') };
    expect(alignPlacement(without, { ...r1, y: r1.y + 0.5 })).toEqual({ x: r1.x, y: r1.y });
    expect(alignPlacement(without, { ...r1, y: r1.y - 0.5 })).toEqual({ x: r1.x, y: r1.y });
    // Far off the line: left alone.
    expect(alignPlacement(without, { ...r1, y: r1.y + 2 })).toEqual({ x: r1.x, y: r1.y + 2 });
  });
});
