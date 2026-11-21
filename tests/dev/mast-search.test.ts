/**
 * Developer helper (skipped unless LV is set): greedy lightning-mast search for a reference solution.
 * Removes the solution's masts and adds masts of height MH (default 20 m) until fully shielded.
 *   LV=l8-thin-air MH=22 npx vitest run tests/dev/mast-search.test.ts --reporter=verbose --silent=false
 */
import { it } from 'vitest';
import { SOLUTIONS } from '../../src/levels/solutions';
import { getLevel } from '../../src/levels';
import { evaluateShielding } from '../../src/engine/lightning';
import { analyzeTopology } from '../../src/engine/topology';
import { checkPhysical } from '../../src/engine/checks/physical';
import type { PlacedItem } from '../../src/engine/types';
it.skipIf(!process.env.LV)('masts', () => {
  for (const id of process.env.LV!.split(',')) {
    const level = getLevel(id)!;
    const base = SOLUTIONS[id]!();
    base.items = base.items.filter((i) => i.kind !== 'mast');
    const f = base.fence!.rect;
    const chosen: PlacedItem[] = [];
    const basePhys = new Set(checkPhysical(base, level, analyzeTopology(base, level)).map((x) => x.checkId + x.title));
    for (let k = 0; k < 10; k++) {
      let best: { cov: number; m: PlacedItem } | null = null;
      for (let x = f.x + 1; x <= f.x + f.w - 2; x += 1.5) for (let y = f.y + 1; y <= f.y + f.h - 2; y += 1.5) {
        const m: PlacedItem = { id: `M${k + 1}`, kind: 'mast', x, y, rot: 0, kv: 0, props: { heightM: Number(process.env.MH ?? 20) } };
        const d = { ...base, items: [...base.items, ...chosen, m] };
        const phys = checkPhysical(d, level, analyzeTopology(d, level)).filter((x2) => x2.severity === 'critical' && !basePhys.has(x2.checkId + x2.title));
        if (phys.length) continue;
        const cov = evaluateShielding(d, { method: 'fixed_angle' }).coveredFraction;
        if (!best || cov > best.cov) best = { cov, m };
      }
      if (!best) break;
      chosen.push(best.m);
      if (best.cov > 0.9999) break;
    }
    const d = { ...base, items: [...base.items, ...chosen] };
    console.log(`MASTS ${id} cov=${evaluateShielding(d, { method: 'fixed_angle' }).coveredFraction.toFixed(3)} ${JSON.stringify(chosen.map((m) => [m.x, m.y, Number(process.env.MH ?? 20)]))}`);
  }
});
