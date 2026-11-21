import { describe, expect, it } from 'vitest';
import { decrementFactor, evaluateRectangularGrid, groundConductorAreaKcmil, TABLE_9_1_DECREMENT, TABLE_9_2_MATERIALS, TABLE_9_3_KF } from '../src/data/bulletin/grounding';
import { evaluateGrounding, checkGrounding } from '../src/engine/grounding';
import { sampleDesign, SAMPLE_LEVEL } from '../src/engine/samples';

describe('Chapter 9 equations', () => {
  it('Eq 9-7 reproduces every cell of Table 9-1 (decrement factor)', () => {
    for (const row of TABLE_9_1_DECREMENT.rows) {
      TABLE_9_1_DECREMENT.xOverR.forEach((xr, i) => expect(decrementFactor(row.seconds, xr)).toBeCloseTo(row.df[i]!, 2));
    }
  });
  it('Eq 9-10 with Table 9-2 constants reproduces Table 9-3 Kf', () => {
    for (const k of TABLE_9_3_KF) {
      const m = TABLE_9_2_MATERIALS.find((x) => x.id === k.materialId)!;
      expect(groundConductorAreaKcmil(1, 1, m, 40, k.tmC)).toBeCloseTo(k.kf, 1);
    }
  });
  it('matches the IEEE Std 80-2000 Annex B square-grid example the bulletin method follows', () => {
    // 70 m x 70 m, D = 7 m, h = 0.5 m, d = 0.01 m, no rods; rho = 400, crushed rock 2500 ohm-m, Cs = 0.74;
    // 3I0 = 3180 A, Sf = 0.6, Df = 1, ts = 0.5 s, 70 kg.
    const r = evaluateRectangularGrid({
      soilResistivity: 400,
      surfaceLayer: { resistivity: 2500, thicknessM: 0.102, cs: 0.74 },
      lengthXM: 70,
      lengthYM: 70,
      conductorsAlongX: 11,
      conductorsAlongY: 11,
      depthM: 0.5,
      conductorDiameterM: 0.01,
      faultCurrentA: 3180,
      splitFactor: 0.6,
      decrementFactor: 1,
      shockDurationS: 0.5,
      bodyWeightKg: 70,
    });
    expect(r.tolerableTouchV).toBeCloseTo(838.2, 0);
    expect(r.tolerableStepV).toBeCloseTo(2686.6, 0);
    expect(r.maxGridCurrentA).toBeCloseTo(1908, 0);
    expect(r.gridResistanceOhm).toBeCloseTo(2.78, 1);
    expect(r.meshVoltageV / 1002.7).toBeCloseTo(1, 1);
    expect(r.safe).toBe(false);
  });
});

describe('ground grid in the game', () => {
  it('the reference design is safe with crushed rock', () => {
    const g = evaluateGrounding(sampleDesign(), SAMPLE_LEVEL)!;
    expect(g.safe).toBe(true);
    expect(g.meshVoltageV).toBeLessThan(g.touchTolerableV);
  });
  it('removing the surface layer makes touch voltage unsafe', () => {
    const d = sampleDesign();
    d.surfacing = { material: 'none', thicknessM: 0.1 };
    const g = evaluateGrounding(d, SAMPLE_LEVEL)!;
    expect(g.safe).toBe(false);
    expect(checkGrounding(d, SAMPLE_LEVEL, g).some((f) => f.checkId === 'ground.touch' && f.severity === 'critical')).toBe(true);
  });
  it('flags an unbonded fence and a grid that stops at the fence (§9.10.10)', () => {
    const d = sampleDesign();
    d.groundGrid = { ...d.groundGrid, fenceBonded: false, extendBeyondFenceM: 0 };
    const ids = checkGrounding(d, SAMPLE_LEVEL, evaluateGrounding(d, SAMPLE_LEVEL)).map((f) => f.checkId);
    expect(ids).toContain('ground.fencebond');
    expect(ids).toContain('ground.fenceext');
  });
});
