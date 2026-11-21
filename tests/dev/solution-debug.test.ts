/**
 * Developer helper (skipped unless LV is set): print the review of the reference solutions.
 *   LV=l8-thin-air npx vitest run tests/dev/solution-debug.test.ts --reporter=verbose --silent=false
 */
import { it } from 'vitest';
import { SOLUTIONS } from '../../src/levels/solutions';
import { getLevel } from '../../src/levels';
import { reviewDesign } from '../../src/engine/review';
it.skipIf(!process.env.LV)('dbg', () => {
  for (const id of (process.env.LV ?? '').split(',')) {
    const level = getLevel(id)!;
    const r = reviewDesign(SOLUTIONS[id]!(), level);
    console.log(`== ${id}: passed=${r.passed} stars=${r.stars} cost=${r.cost.total} saidi=${r.scoredSaidi.toFixed(1)}/${level.reliabilityTarget} cov=${r.shielding.coveredFraction.toFixed(2)} scheme=${r.scheme.hv}/${r.scheme.lv} ground=${r.grounding ? `${Math.round(r.grounding.meshVoltageV)}/${Math.round(r.grounding.touchTolerableV)}` : '-'}`);
    for (const o of r.objectives) if (!o.met) console.log('  OBJ', o.objective.kind, o.note ?? '');
    for (const f of r.findings) if (f.checkId !== 'shield.exposed') console.log('  F', f.severity, f.checkId, '|', f.title, '|', f.detail.slice(0, 100));
  }
});
