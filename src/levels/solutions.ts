/**
 * Reference solutions: one known-good design per campaign level. Unit tests
 * assert each one is accepted (so every level is beatable), and the e2e test
 * loads them through the debug hook.
 */
import { CATALOG, defaultProps } from '../engine/catalog';
import { newDesign } from '../engine/design';
import type { Conductor, Design, ItemKind, PlacedItem, Props, Rotation } from '../engine/types';
import { getLevel } from '.';

function it(id: string, kind: ItemKind, x: number, y: number, kv: number, props: Props = {}, rot: Rotation = 0, label?: string): PlacedItem {
  return { id, kind, x, y, rot, kv, props: { ...defaultProps(kind), ...props }, label };
}
function bus(id: string, kv: number, ...pts: Array<[number, number]>): Conductor {
  return { id, kv, elevation: 'low', size: 'pipe2', points: pts.map(([x, y]) => ({ x, y })) };
}

/** Half the across-phase depth of an item's footprint (so its terminals sit on centre line y). */
function halfDepth(kind: ItemKind, kv: number, props: Props = {}): number {
  return CATALOG[kind].footprint(kv, { ...defaultProps(kind), ...props }).d / 2;
}

/**
 * A distribution feeder bay at centre line y: source switch, recloser (or breaker), load switch and
 * getaway; optional bypass row 4 m above (Fig. 4-4).
 */
function feederBay(
  n: number,
  y: number,
  feeder: string,
  opts: { busX: number; x0: number; bypass: boolean; kv?: number; recloser?: Props; breaker?: Props },
): { items: PlacedItem[]; conductors: Conductor[] } {
  const LV = opts.kv ?? 12.47;
  const { busX, x0 } = opts;
  const dev: ItemKind = opts.breaker ? 'breaker' : 'recloser';
  const devProps = opts.breaker ?? opts.recloser ?? {};
  const devW = CATALOG[dev].footprint(LV, { ...defaultProps(dev), ...devProps }).w;
  const swW = CATALOG.switch.footprint(LV, defaultProps('switch')).w;
  const xs = { sa: x0, dev: x0 + swW + 2, sb: x0 + swW + 2 + devW + 2 };
  const xfe = xs.sb + swW + 2;
  const items = [
    it(`SA${n}`, 'switch', xs.sa, y - halfDepth('switch', LV), LV),
    it(`R${n}`, dev, xs.dev, y - halfDepth(dev, LV, devProps), LV, devProps, 0, `${dev === 'breaker' ? 'CB' : 'R'}${n}`),
    it(`SB${n}`, 'switch', xs.sb, y - halfDepth('switch', LV), LV),
    it(`FE${n}`, 'feeder_exit', xfe, y - halfDepth('feeder_exit', LV), LV, { feeder }, 0, `Feeder ${n}`),
  ];
  const conductors = [
    bus(`F${n}a`, LV, [busX, y], [xs.sa, y]),
    bus(`F${n}b`, LV, [xs.sa + swW, y], [xs.dev, y]),
    bus(`F${n}c`, LV, [xs.dev + devW, y], [xs.sb, y]),
    bus(`F${n}d`, LV, [xs.sb + swW, y], [xfe, y]),
  ];
  if (opts.bypass) {
    const hsW = CATALOG.hookstick_switch.footprint(LV, defaultProps('hookstick_switch')).w;
    const hx = xs.dev + devW / 2 - hsW / 2;
    const yb = y - 4;
    items.push(it(`HS${n}`, 'hookstick_switch', hx, yb - halfDepth('hookstick_switch', LV), LV, { normallyOpen: true }, 0, `${dev === 'breaker' ? 'CB' : 'R'}${n} bypass`));
    conductors.push(bus(`F${n}e`, LV, [busX, yb], [hx, yb]));
    conductors.push(bus(`F${n}f`, LV, [hx + hsW, yb], [xfe - 1, yb], [xfe - 1, y]));
  }
  return { items, conductors };
}

/** A feeder bay hanging south of a horizontal bus at (cx, busY), with a bypass column 4 m east. 12.47 kV geometry. */
function verticalFeederBay(n: number, cx: number, busY: number, feeder: string, opts: { recloser?: Props }): { items: PlacedItem[]; conductors: Conductor[] } {
  const LV = 12.47;
  const y0 = busY + 2;
  const items = [
    it(`SA${n}`, 'switch', cx - 1.5, y0, LV, {}, 1),
    it(`R${n}`, 'recloser', cx - 1.5, y0 + 4, LV, opts.recloser ?? {}, 1, `R${n}`),
    it(`SB${n}`, 'switch', cx - 1.5, y0 + 8, LV, {}, 1),
    it(`FE${n}`, 'feeder_exit', cx - 1.5, y0 + 12, LV, { feeder }, 1, `Feeder ${n}`),
    it(`HS${n}`, 'hookstick_switch', cx + 3, y0 + 4.25, LV, { normallyOpen: true }, 1, `R${n} bypass`),
  ];
  const conductors = [
    bus(`F${n}a`, LV, [cx, busY], [cx, y0]),
    bus(`F${n}b`, LV, [cx, y0 + 2], [cx, y0 + 4]),
    bus(`F${n}c`, LV, [cx, y0 + 6], [cx, y0 + 8]),
    bus(`F${n}d`, LV, [cx, y0 + 10], [cx, y0 + 12]),
    bus(`F${n}e`, LV, [cx + 4, busY], [cx + 4, y0 + 4.25]),
    bus(`F${n}f`, LV, [cx + 4, y0 + 5.75], [cx + 4, y0 + 11], [cx, y0 + 11]),
  ];
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

  'l4-mobile-ready': () =>
    withLevel('l4-mobile-ready', (d) => {
      const HV = 69;
      const LV = 24.9;
      d.items.push(
        it('S1', 'switch', 5, 18.5, HV, {}, 0, 'Primary disconnect'),
        it('F1', 'fuse', 9.5, 18.5, HV, { ampRating: 125, interruptingKA: 20 }, 0, 'T1 fuses'),
        it('T1', 'transformer', 14, 18.5, HV, { kva: 10000, cooling: 'OA/FA', lvKV: LV }, 0, 'T1'),
        it('RG1', 'regulator', 22, 19, LV, { ratedA: 328, rangePct: 10, bypass: true, arresters: true }, 0, 'Bus regulators'),
        it('S6', 'switch', 10, 8.5, HV, { normallyOpen: true }, 0, 'Mobile HV switch'),
        it('MP1', 'mobile_pad', 14, 8.5, HV, { lvKV: LV }, 0, 'Mobile pad'),
        it('S7', 'switch', 30, 9.5, LV, { normallyOpen: true }, 0, 'Mobile LV switch'),
        it('LA1', 'arrester', 2.5, 25.5, HV, { class: 'station' }, 1, 'Line entrance arresters'),
        it('LA2', 'arrester', 6.5, 25.5, HV, { class: 'station' }, 1, 'T1 arresters'),
      );
      d.conductors.push(
        bus('H1', HV, [2.5, 21], [5, 21]),
        bus('H1t', HV, [4.5, 21], [4.5, 25.5]),
        bus('H2', HV, [7.5, 21], [9.5, 21]),
        bus('H2t', HV, [8.5, 21], [8.5, 25.5]),
        bus('H3', HV, [12, 21], [14, 21]),
        bus('H4', HV, [9, 21], [9, 11], [10, 11]),
        bus('H5', HV, [12.5, 11], [14, 11]),
        bus('L1', LV, [20, 21], [22, 21]),
        bus('L2', LV, [24.5, 21], [34, 21]),
        bus('L3', LV, [28, 11], [30, 11]),
        bus('L4', LV, [32, 11], [34, 11]),
        bus('LB', LV, [34, 11], [34, 37]),
      );
      const names = ['Feeder 1 — Hickory Hill', 'Feeder 2 — Clay Bank', 'Feeder 3 — Pine Flats'];
      [17, 27, 37].forEach((y, i) => {
        const b = feederBay(i + 1, y, names[i]!, { busX: 34, x0: 36, bypass: true, kv: LV, recloser: { continuousA: 200, interruptingKA: 4 } });
        d.items.push(...b.items);
        d.conductors.push(...b.conductors);
      });
      d.items.push(...L4_MASTS.map(([x, y, h], i) => it(`M${i + 1}`, 'mast', x, y, 0, { heightM: h })));
      d.fence = { rect: { x: 0.5, y: 5, w: 53.5, h: 39 }, gate: { side: 'S', offset: 14, width: 6 } };
    }),

  'l5-growing-pains': () =>
    withLevel('l5-growing-pains', (d) => {
      const HV = 69;
      const LV = 12.47;
      d.items.push(
        it('S1', 'switch', 5, 9.5, HV, {}, 0, 'Primary disconnect'),
        it('F1', 'fuse', 11.5, 14, HV, { ampRating: 200, interruptingKA: 20 }, 1, 'T1 fuses'),
        it('T1', 'transformer', 11.5, 18, HV, { kva: 12000, cooling: 'OA/FA/FA', ltc: true, lvKV: LV }, 1, 'T1'),
        it('F2', 'fuse', 31.5, 14, HV, { ampRating: 200, interruptingKA: 20 }, 1, 'T2 fuses'),
        it('T2', 'transformer', 31.5, 18, HV, { kva: 12000, cooling: 'OA/FA/FA', ltc: true, lvKV: LV }, 1, 'T2'),
        it('CB0', 'breaker', 22.5, 26.5, LV, { medium: 'vacuum', interruptingKA: 12.5, normallyOpen: true, relays: ['50/51', '50N/51N'] }, 0, 'Bus tie'),
        it('SS1', 'station_service', 10, 24.5, LV, { kva: 50 }, 3, 'Station service'),
        it('CH1', 'control_house', 48, 42, 0, { size: 'small', battery: true }, 0, 'Control house'),
        it('LA1', 'arrester', 3, 15, HV, { class: 'station' }, 1, 'Line entrance arresters'),
        it('LA2', 'arrester', 17, 13.5, HV, { class: 'station' }, 1, 'T1 arresters'),
        it('LA3', 'arrester', 37, 13.5, HV, { class: 'station' }, 1, 'T2 arresters'),
      );
      d.conductors.push(
        bus('H1', HV, [2.5, 12], [5, 12]),
        bus('H1t', HV, [5, 12], [5, 15]),
        { ...bus('HB', HV, [7.5, 12], [44, 12]), elevation: 'high' },
        bus('H2', HV, [14, 12], [14, 14]),
        bus('H3', HV, [14, 16.5], [14, 18]),
        bus('H4', HV, [34, 12], [34, 14]),
        bus('H5', HV, [34, 16.5], [34, 18]),
        bus('H6', HV, [19, 12], [19, 13.5]),
        bus('H7', HV, [39, 12], [39, 13.5]),
        bus('BA', LV, [8, 28], [22.5, 28]),
        bus('BB', LV, [25, 28], [40, 28]),
        bus('T1L', LV, [14, 24], [14, 28]),
        bus('T2L', LV, [34, 24], [34, 28]),
        bus('SSL', LV, [11, 26], [11, 28]),
      );
      const names = ['Feeder 1 — Riverside', 'Feeder 2 — Processor', 'Feeder 3 — Oak Park', 'Feeder 4 — Mill Creek'];
      [9, 17, 27, 35].forEach((cx, i) => {
        const b = verticalFeederBay(i + 1, cx, 28, names[i]!, { recloser: { continuousA: 400, interruptingKA: 8 } });
        d.items.push(...b.items);
        d.conductors.push(...b.conductors);
      });
      d.items.push(...L5_MASTS.map(([x, y, h], i) => it(`M${i + 1}`, 'mast', x, y, 0, { heightM: h })));
      d.fence = { rect: { x: 0.5, y: 5, w: 69.5, h: 42 }, gate: { side: 'N', offset: 16, width: 6 } };
    }),
};

/** Mast positions for the L4 and L5 solutions (greedy coverage search). */
export const L4_MASTS: Array<[number, number, number]> = [[39, 19.5, 20], [40.5, 30, 20], [12, 24, 20], [12, 13.5, 20], [39, 9, 20], [1.5, 27, 20], [39, 34.5, 20]];
export const L5_MASTS: Array<[number, number, number]> = [[15, 33, 20], [33, 33, 20], [10.5, 15, 20], [34.5, 7.5, 20], [7.5, 45, 20], [37.5, 15, 20], [30, 42, 20], [1.5, 19.5, 20], [13.5, 7.5, 20]];

/** Mast positions for the L3 solution (found by a greedy coverage search, see tests). */
export const L3_MASTS: Array<[number, number, number]> = [
  [33, 22, 20],
  [11, 24, 20],
  [32, 13, 20],
  [32, 27, 20],
  [1, 17, 20],
];
