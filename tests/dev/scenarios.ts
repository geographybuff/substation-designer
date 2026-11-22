/**
 * Dev scenarios for the 3D harness (view3d-harness.html?scenario=/tests/dev/scenarios.ts&v=<name>):
 * ways a player might draw the Keep the Lights On 12.47 kV bus, for checking junction rendering.
 */
import { SOLUTIONS } from '../../src/levels/solutions';
import { getLevel } from '../../src/levels';
import { makeItem, moveItem } from '../../src/engine/design';
import { itemPorts } from '../../src/engine/items';
import { setSiteAltitude } from '../../src/engine/site';
import type { Conductor, Design, LevelDef, Vec2 } from '../../src/engine/types';

const LV = 12.47;
const J = 25;
const bus = (id: string, ...pts: Array<[number, number]>): Conductor => ({ id, kv: LV, elevation: 'low', size: 'pipe2', points: pts.map(([x, y]) => ({ x, y })) });

function bay(d: Design, n: number, y: number): Vec2 {
  const sw = makeItem(d, 'switch', 27, 0, 0, LV);
  sw.y = y - (itemPorts(sw)[0]!.pos.y - sw.y);
  sw.id = `S${n}`;
  d.items.push(sw);
  return itemPorts(sw)[0]!.pos;
}

type P = { top: Vec2; mid: Vec2; bot: Vec2 };
const VARIANTS: Record<string, (p: P) => Conductor[]> = {
  // The vertical bus is one run; the transformer and S3 buses tap it from either side.
  vthrough: (p) => [bus('V', [p.top.x, p.top.y], [J, p.top.y], [J, p.bot.y], [p.bot.x, p.bot.y]), bus('T', [20, 21], [J, 21]), bus('M', [J, 21], [p.mid.x, p.mid.y])],
  // The transformer-to-S3 bus is one run; the upper and lower buses tap it from either side.
  hthrough: (p) => [bus('T', [20, 21], [p.mid.x, p.mid.y]), bus('V1', [p.top.x, p.top.y], [J, p.top.y], [J, 21]), bus('V2', [J, 21], [J, p.bot.y], [p.bot.x, p.bot.y])],
  // Transformer bus turns up to S2 at J; the lower bus taps that corner; S3 taps the vertical.
  corner: (p) => [bus('T', [20, 21], [J, 21], [J, p.top.y], [p.top.x, p.top.y]), bus('V2', [J, 21], [J, p.bot.y], [p.bot.x, p.bot.y]), bus('M', [J, 21], [p.mid.x, p.mid.y])],
};

export function scenario(v: string | null): { design: Design; level: LevelDef } {
  // sol:<levelId> shows that level's reference solution.
  if (v?.startsWith('sol:')) {
    const lv = getLevel(v.slice(4))!;
    setSiteAltitude(lv.site.altitudeM);
    return { design: SOLUTIONS[lv.id]!(), level: lv };
  }
  const level = getLevel('l2-keep-the-lights-on')!;
  setSiteAltitude(level.site.altitudeM);
  if (v === 'sideentry') {
    // R1 dragged half a metre off its bay line: the buses dog-leg into its terminals.
    const sol = SOLUTIONS[level.id]!();
    const r1 = sol.items.find((i) => i.id === 'R1')!;
    return { design: moveItem(sol, 'R1', r1.x, r1.y + 0.5), level };
  }
  const d = SOLUTIONS[level.id]!();
  d.items = d.items.filter((i) => ['L1', 'S1', 'F1', 'T1'].includes(i.id));
  d.conductors = d.conductors.filter((c) => ['H1', 'H2', 'H3'].includes(c.id));
  const p = { top: bay(d, 2, 10), mid: bay(d, 3, 21), bot: bay(d, 4, 32) };
  d.conductors.push(...(VARIANTS[v ?? 'vthrough'] ?? VARIANTS.vthrough!)(p));
  return { design: d, level };
}
