import { describe, expect, it } from 'vitest';
import { CAMPAIGN, ALL_LEVELS } from '../src/levels';
import { SOLUTIONS } from '../src/levels/solutions';
import { reviewDesign } from '../src/engine/review';
import { newDesign, voltagesFor } from '../src/engine/design';
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
    expect(stepPending('feeders_protected', d, level, r)).toEqual([]);
  });

  it('names the missing feeder when only one bay is built', () => {
    const d = SOLUTIONS[level.id]!();
    d.items = d.items.filter((i) => !['SA2', 'R2', 'SB2', 'FE2'].includes(i.id));
    d.conductors = d.conductors.filter((c) => !c.id.startsWith('F2'));
    const r = reviewDesign(d, level);
    expect(stepDone('feeders_protected', d, level, r)).toBe(false);
    expect(stepPending('feeders_protected', d, level, r).join(' ')).toContain('Mill Road');
  });
});

describe('campaign tutorials', () => {
  it('only use known completion conditions and objectives the level has', async () => {
    const { TUTORIAL_CONDITIONS } = await import('../src/levels/tutorial');
    for (const level of CAMPAIGN) {
      for (const st of level.tutorial ?? []) {
        if (st.until?.startsWith('objective:')) expect(level.objectives.map((o) => o.kind), `${level.id} ${st.id}`).toContain(st.until.slice(10));
        else if (st.until) expect(Object.keys(TUTORIAL_CONDITIONS), `${level.id} ${st.id}`).toContain(st.until);
        if (st.objective) expect(level.objectives.map((o) => o.kind), `${level.id} ${st.id}`).toContain(st.objective);
        if (st.highlightTool && !['bus', 'fence'].includes(st.highlightTool)) expect(level.tools, `${level.id} ${st.id}`).toContain(st.highlightTool);
      }
    }
    expect(CAMPAIGN.filter((l) => l.tutorial?.length).length).toBe(CAMPAIGN.length);
  });

  it('reference solutions complete every tutorial step', () => {
    for (const level of CAMPAIGN) {
      const d = SOLUTIONS[level.id]!();
      const r = reviewDesign(d, level);
      for (const st of level.tutorial ?? []) if (st.until) expect(stepDone(st.until, d, level, r), `${level.id} ${st.id}`).toBe(true);
    }
  });
});

describe('tutorial toolbox highlights', () => {
  it('name the voltage when a highlighted tool comes at both of the level voltages', () => {
    for (const level of CAMPAIGN) {
      for (const st of level.tutorial ?? []) {
        if (!st.highlightTool) continue;
        const kvs = st.highlightTool === 'bus' || st.highlightTool === 'highbus' ? [level.system.hvKV, level.system.lvKV].filter((v) => v !== undefined) : st.highlightTool in { fence: 1, shieldwire: 1 } ? [0] : voltagesFor(st.highlightTool as never, level);
        if (kvs.length > 1) expect(st.highlightSide, `${level.id} ${st.id}: ${st.highlightTool} comes at ${kvs.join(' and ')} kV`).toBeDefined();
      }
    }
  });

  it('First Light highlights only the 69 kV disconnect switch', () => {
    const level = CAMPAIGN.find((l) => l.id === 'l1-first-light')!;
    const st = level.tutorial!.find((s) => s.until === 'has_hv_switch')!;
    expect(st.highlightSide).toBe('hv');
  });
});

describe('Keep the Lights On tutorial', () => {
  const level = CAMPAIGN.find((l) => l.id === 'l2-keep-the-lights-on')!;
  const regStep = level.tutorial!.find((s) => s.id === 't2')!;
  const bypassStep = level.tutorial!.find((s) => s.id === 't3')!;
  /** The solution's high side, transformer and bus regulators, with no feeder bays yet. */
  const stationOnly = () => {
    const d = SOLUTIONS[level.id]!();
    d.items = d.items.filter((i) => ['S1', 'F1', 'T1', 'RG1'].includes(i.id) || i.locked);
    d.conductors = d.conductors.filter((c) => ['H1', 'H2', 'H3', 'L1'].includes(c.id));
    return d;
  };

  it('finishes the regulation step once bus regulators sit on the transformer, before any feeder exists', () => {
    const d = stationOnly();
    const r = reviewDesign(d, level);
    expect(r.topo.loads.length).toBe(0);
    expect(stepDone(regStep.until, d, level, r)).toBe(true);
  });

  it('waits, and says why, while the regulator is not connected to the transformer', () => {
    const d = stationOnly();
    d.conductors = d.conductors.filter((c) => c.id !== 'L1');
    const r = reviewDesign(d, level);
    expect(stepDone(regStep.until, d, level, r)).toBe(false);
    expect(stepPending(regStep.until, d, level, r).join(' ')).toMatch(/transformer's low-voltage terminal/);
  });

  it('counts a load tap changer as regulation', () => {
    const d = stationOnly();
    d.items = d.items.filter((i) => i.id !== 'RG1');
    const t = d.items.find((i) => i.id === 'T1')!;
    t.props = { ...t.props, ltc: true };
    expect(stepDone(regStep.until, d, level, reviewDesign(d, level))).toBe(true);
  });

  it('explains the bypass step bay by bay', () => {
    const full = SOLUTIONS[level.id]!();
    expect(stepPending(bypassStep.until, full, level, reviewDesign(full, level))).toEqual([]);

    // No reclosers: hook stick switches wired in series with each feeder, as a player might try.
    const d = SOLUTIONS[level.id]!();
    d.items = d.items.filter((i) => !/^(R|SB|HS)\d$/.test(i.id));
    d.conductors = d.conductors.filter((c) => !/^F\d[b-f]$/.test(c.id));
    const r1 = reviewDesign(d, level);
    const before = stepPending(bypassStep.until, d, level, r1).join(' ');
    expect(before).toMatch(/not connected|no recloser/);

    // Reclosers in place but the bypass switch left closed.
    const d2 = SOLUTIONS[level.id]!();
    const hs = d2.items.find((i) => i.id === 'HS1')!;
    hs.props = { ...hs.props, normallyOpen: false };
    const r2 = reviewDesign(d2, level);
    expect(stepPending(bypassStep.until, d2, level, r2).join(' ')).toContain('Normally open');

    // Bypass removed from one bay: that recloser is named.
    const d3 = SOLUTIONS[level.id]!();
    d3.items = d3.items.filter((i) => i.id !== 'HS2');
    const r3 = reviewDesign(d3, level);
    expect(stepDone(bypassStep.until, d3, level, r3)).toBe(false);
    expect(stepPending(bypassStep.until, d3, level, r3).join(' ')).toMatch(/R2.*no bypass/);
  });

  it('shows the diagrams that explain the two steps', () => {
    expect(regStep.diagram).toBe('bus-regulation');
    expect(bypassStep.diagram).toBe('recloser-bypass');
  });
});
