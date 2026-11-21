import { describe, expect, it } from 'vitest';
import { sampleDesign, SAMPLE_LEVEL } from '../src/engine/samples';
import { reviewDesign } from '../src/engine/review';
import { fenceRequiredDistance, fenceZoneViolation } from '../src/engine/checks/physical';
import { fixedAngleProtected, strikeDistanceM, allowableStrokeCurrentKA } from '../src/engine/lightning';
import type { Design } from '../src/engine/types';

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
  it('computes LV fault level from source and transformer impedance', () => {
    const lvNode = r.topo.nodeOfPort.get('T1:lv')!;
    expect(r.calc.faultKA.get(lvNode)).toBeCloseTo(5.58, 1);
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
