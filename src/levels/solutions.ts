/**
 * Reference solutions: one known-good design per campaign level. Unit tests
 * assert each one is accepted (so every level is beatable), and the e2e test
 * loads them through the debug hook.
 */
import { defaultProps } from '../engine/catalog';
import { newDesign } from '../engine/design';
import type { Conductor, Design, ItemKind, PlacedItem, Props, Rotation } from '../engine/types';
import { getLevel } from '.';

function it(id: string, kind: ItemKind, x: number, y: number, kv: number, props: Props = {}, rot: Rotation = 0, label?: string): PlacedItem {
  return { id, kind, x, y, rot, kv, props: { ...defaultProps(kind), ...props }, label };
}
function bus(id: string, kv: number, ...pts: Array<[number, number]>): Conductor {
  return { id, kv, elevation: 'low', size: 'pipe2', points: pts.map(([x, y]) => ({ x, y })) };
}

/** A distribution feeder bay at centre line y: source switch, recloser, load switch, getaway; optional bypass row 4 m above. */
function feederBay(n: number, y: number, feeder: string, opts: { busX: number; x0: number; bypass: boolean; recloser?: Props }): { items: PlacedItem[]; conductors: Conductor[] } {
  const LV = 12.47;
  const { busX, x0 } = opts;
  const items = [
    it(`SA${n}`, 'switch', x0, y - 1.5, LV),
    it(`R${n}`, 'recloser', x0 + 4, y - 1.5, LV, opts.recloser ?? {}, 0, `R${n}`),
    it(`SB${n}`, 'switch', x0 + 8, y - 1.5, LV),
    it(`FE${n}`, 'feeder_exit', x0 + 12, y - 1.5, LV, { feeder }, 0, `Feeder ${n}`),
  ];
  const conductors = [
    bus(`F${n}a`, LV, [busX, y], [x0, y]),
    bus(`F${n}b`, LV, [x0 + 2, y], [x0 + 4, y]),
    bus(`F${n}c`, LV, [x0 + 6, y], [x0 + 8, y]),
    bus(`F${n}d`, LV, [x0 + 10, y], [x0 + 12, y]),
  ];
  if (opts.bypass) {
    items.push(it(`HS${n}`, 'hookstick_switch', x0 + 4.5, y - 5, LV, { normallyOpen: true }, 0, `R${n} bypass`));
    conductors.push(bus(`F${n}e`, LV, [busX, y - 4], [x0 + 4.5, y - 4]));
    conductors.push(bus(`F${n}f`, LV, [x0 + 6, y - 4], [x0 + 11, y - 4], [x0 + 11, y]));
  }
  return { items, conductors };
}

function withLevel(levelId: string, build: (d: Design) => void): Design {
  const d = newDesign(getLevel(levelId)!);
  build(d);
  return d;
}

export const SOLUTIONS: Record<string, () => Design> = {
  'l1-first-light': () =>
    withLevel('l1-first-light', (d) => {
      const HV = 69;
      const LV = 12.47;
      d.items.push(
        it('S1', 'switch', 5, 15.5, HV, {}, 0, 'Primary disconnect'),
        it('F1', 'fuse', 9.5, 15.5, HV, { ampRating: 65, interruptingKA: 20 }, 0, 'T1 fuses'),
        it('T1', 'transformer', 14, 15.5, HV, { kva: 5000, cooling: 'OA/FA', lvKV: LV }, 0, 'T1'),
      );
      d.conductors.push(bus('H1', HV, [2.5, 18], [5, 18]), bus('H2', HV, [7.5, 18], [9.5, 18]), bus('H3', HV, [12, 18], [14, 18]), bus('L1', LV, [20, 18], [23, 18]), bus('LB', LV, [23, 12], [23, 24]));
      const f1 = feederBay(1, 12, 'Feeder 1 — Elm Grove', { busX: 23, x0: 25, bypass: false, recloser: { continuousA: 200, interruptingKA: 4 } });
      const f2 = feederBay(2, 24, 'Feeder 2 — Mill Road', { busX: 23, x0: 25, bypass: false, recloser: { continuousA: 200, interruptingKA: 4 } });
      d.items.push(...f1.items, ...f2.items);
      d.conductors.push(...f1.conductors, ...f2.conductors);
      d.fence = { rect: { x: 0.5, y: 8, w: 39.5, h: 20 }, gate: { side: 'S', offset: 14, width: 6 } };
    }),

  'l2-keep-the-lights-on': () =>
    withLevel('l2-keep-the-lights-on', (d) => {
      const HV = 69;
      const LV = 12.47;
      d.items.push(
        it('S1', 'switch', 5, 18.5, HV, {}, 0, 'Primary disconnect'),
        it('F1', 'fuse', 9.5, 18.5, HV, { ampRating: 125, interruptingKA: 20 }, 0, 'T1 fuses'),
        it('T1', 'transformer', 14, 18.5, HV, { kva: 10000, cooling: 'OA/FA', lvKV: LV }, 0, 'T1'),
        it('RG1', 'regulator', 22, 19, LV, { ratedA: 548, rangePct: 10, bypass: true, arresters: true }, 0, 'Bus regulators'),
      );
      d.conductors.push(
        bus('H1', HV, [2.5, 21], [5, 21]),
        bus('H2', HV, [7.5, 21], [9.5, 21]),
        bus('H3', HV, [12, 21], [14, 21]),
        bus('L1', LV, [20, 21], [22, 21]),
        bus('L2', LV, [24.5, 21], [27, 21]),
        bus('LB', LV, [27, 10], [27, 34]),
      );
      const names = ['Feeder 1 — North Ridge', 'Feeder 2 — Cottonwood', 'Feeder 3 — River Bottoms'];
      [14, 24, 34].forEach((y, i) => {
        const b = feederBay(i + 1, y, names[i]!, { busX: 27, x0: 29, bypass: true, recloser: { continuousA: 400, interruptingKA: 8 } });
        d.items.push(...b.items);
        d.conductors.push(...b.conductors);
      });
      d.fence = { rect: { x: 0.5, y: 6.5, w: 44.5, h: 31.5 }, gate: { side: 'E', offset: 2, width: 6 } };
    }),

  'l3-thunderstorm-alley': () =>
    withLevel('l3-thunderstorm-alley', (d) => {
      const HV = 69;
      const LV = 12.47;
      d.items.push(
        it('S1', 'switch', 5, 18.5, HV, {}, 0, 'Primary disconnect'),
        it('F1', 'fuse', 9.5, 18.5, HV, { ampRating: 100, interruptingKA: 20 }, 0, 'T1 fuses'),
        it('T1', 'transformer', 14, 18.5, HV, { kva: 7500, cooling: 'OA/FA', lvKV: LV, arresters: 'hv_lv' }, 0, 'T1'),
        it('RG1', 'regulator', 22, 19, LV, { ratedA: 438, rangePct: 10, bypass: true, arresters: true }, 0, 'Bus regulators'),
        it('LA1', 'arrester', 2.5, 25.5, HV, { class: 'station' }, 1, 'Line entrance arresters'),
        it('LA2', 'arrester', 6.5, 25.5, HV, { class: 'station' }, 1, 'T1 arresters (line side of fuses)'),
      );
      d.conductors.push(
        bus('H1', HV, [2.5, 21], [5, 21]),
        bus('H1t', HV, [4.5, 21], [4.5, 25.5]),
        bus('H2', HV, [7.5, 21], [9.5, 21]),
        bus('H2t', HV, [8.5, 21], [8.5, 25.5]),
        bus('H3', HV, [12, 21], [14, 21]),
        bus('L1', LV, [20, 21], [22, 21]),
        bus('L2', LV, [24.5, 21], [27, 21]),
        bus('LB', LV, [27, 12], [27, 30]),
      );
      const names = ['Feeder 1 — Buffalo Flats', 'Feeder 2 — Stony Creek'];
      [16, 30].forEach((y, i) => {
        const b = feederBay(i + 1, y, names[i]!, { busX: 27, x0: 29, bypass: true, recloser: { continuousA: 400, interruptingKA: 6 } });
        d.items.push(...b.items);
        d.conductors.push(...b.conductors);
      });
      d.items.push(...L3_MASTS.map(([x, y, h], i) => it(`M${i + 1}`, 'mast', x, y, 0, { heightM: h })));
      d.fence = { rect: { x: 0.5, y: 8.5, w: 44.5, h: 28 }, gate: { side: 'S', offset: 18, width: 6 } };
    }),
};

/** Mast positions for the L3 solution (found by a greedy coverage search, see tests). */
export const L3_MASTS: Array<[number, number, number]> = [
  [33, 22, 20],
  [11, 24, 20],
  [32, 13, 20],
  [32, 27, 20],
  [1, 17, 20],
];
