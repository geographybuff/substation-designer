import { describe, expect, it } from 'vitest';
import { CAMPAIGN, ALL_LEVELS } from '../src/levels';
import { SOLUTIONS } from '../src/levels/solutions';
import { reviewDesign } from '../src/engine/review';
import { newDesign } from '../src/engine/design';
import { simulate } from '../src/engine/simulation';
import { stepDone, stepPending } from '../src/levels/tutorial';

describe('campaign levels', () => {
  it('have unique ids and orders', () => {
    expect(new Set(ALL_LEVELS.map((l) => l.id)).size).toBe(ALL_LEVELS.length);
    expect(new Set(CAMPAIGN.map((l) => l.order)).size).toBe(CAMPAIGN.length);
  });

  for (const level of CAMPAIGN) {
    describe(level.title, () => {
      it('has a reference solution', () => {
        expect(SOLUTIONS[level.id]).toBeTypeOf('function');
      });
      it('reference solution is accepted with three stars', () => {
        const r = reviewDesign(SOLUTIONS[level.id]!(), level);
        const why = [...r.blockers, ...r.findings.map((f) => `${f.severity}: ${f.title}`)].join('\n');
        expect(r.passed, why).toBe(true);
        expect(r.stars, why).toBe(3);
        expect(r.cost.total).toBeLessThanOrEqual(level.budget);
      });
      it('an empty design is not accepted', () => {
        const r = reviewDesign(newDesign(level), level);
        expect(r.passed).toBe(false);
      });
      it('simulation is deterministic for a seed', () => {
        const d = SOLUTIONS[level.id]!();
        const r = reviewDesign(d, level);
        const a = simulate(d, level, r, 42);
        const b = simulate(d, level, r, 42);
        expect(a.events).toEqual(b.events);
        expect(a.peakByYear).toHaveLength(level.simYears);
      });
      it('objectives cite the bulletin where they encode a rule', () => {
        for (const o of level.objectives) {
          if (o.kind === 'feeders_served') continue;
          expect(o.cite, o.text).toBeDefined();
        }
      });
    });
  }
});

describe('First Light tutorial', () => {
  const level = CAMPAIGN.find((l) => l.id === 'l1-first-light')!;

  it('completes the feeder-bay step with both bays built', () => {
    const d = SOLUTIONS[level.id]!();
    const r = reviewDesign(d, level);
    expect(stepDone('feeders_protected', d, level, r)).toBe(true);
    expect(stepPending('feeders_protected', r)).toEqual([]);
  });

  it('names the missing feeder when only one bay is built', () => {
    const d = SOLUTIONS[level.id]!();
    d.items = d.items.filter((i) => !['SA2', 'R2', 'SB2', 'FE2'].includes(i.id));
    d.conductors = d.conductors.filter((c) => !c.id.startsWith('F2'));
    const r = reviewDesign(d, level);
    expect(stepDone('feeders_protected', d, level, r)).toBe(false);
    expect(stepPending('feeders_protected', r).join(' ')).toContain('Mill Road');
  });
});
