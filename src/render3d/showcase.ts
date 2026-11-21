/**
 * Dev-only showcase design for the harness: every item kind, all four
 * rotations, taps and shunt devices, wired port-to-port with the engine's own
 * footprint/port math so misaligned terminals would be visible.
 */
import { defaultProps } from '../engine/catalog';
import { localToWorld, rotateDir } from '../engine/geometry';
import { footprintOf } from '../engine/items';
import { SAMPLE_LEVEL } from '../engine/samples';
import type { Conductor, Design, ItemKind, LevelDef, PlacedItem, Props, Rotation, Vec2 } from '../engine/types';

export const SHOWCASE_LEVEL: LevelDef = {
  ...SAMPLE_LEVEL,
  id: 'showcase',
  title: 'Showcase',
  site: { ...SAMPLE_LEVEL.site, width: 110, depth: 80, roadSide: 'E', noBuild: [{ x: 0, y: 79, w: 110, h: 1, label: 'Drainage easement' }, { x: 106, y: 0, w: 4, h: 80, label: 'Creek' }] },
};

export function showcaseDesign(): Design {
  const items: PlacedItem[] = [];
  const conductors: Conductor[] = [];
  let n = 0;
  const wire = (kv: number, pts: Vec2[]) => conductors.push({ id: `W${++n}`, kv, elevation: 'low', size: 'pipe2', points: pts });

  /** Place items in a chain flowing along `rot`, joined by 2 m conductors. Returns the last free port. */
  const chain = (prefix: string, start: Vec2, rot: Rotation, kv: number, kinds: Array<[ItemKind, Props?, number?]>): Vec2 => {
    const dir = rotateDir({ x: 1, y: 0 }, rot);
    let cur = start;
    kinds.forEach(([kind, props, kvOverride], i) => {
      const it: PlacedItem = { id: `${prefix}${i + 1}`, kind, x: 0, y: 0, rot, kv: kvOverride ?? kv, props: { ...defaultProps(kind), ...props } };
      const fp = footprintOf(it);
      const pa = fp.ports[0]!;
      const off = localToWorld(pa.local, fp.w, fp.d, rot, 0, 0);
      const target = i === 0 || kind === 'line_terminal' ? cur : { x: cur.x + dir.x * 2, y: cur.y + dir.y * 2 };
      it.x = target.x - off.x;
      it.y = target.y - off.y;
      if (target !== cur) wire(it.kv, [cur, target]);
      items.push(it);
      const pb = fp.ports[fp.ports.length - 1]!;
      cur = fp.ports.length > 1 || kind === 'line_terminal' ? localToWorld(pb.local, fp.w, fp.d, rot, it.x, it.y) : cur;
    });
    return cur;
  };

  // 69 kV line through to a 12.47 kV underground getaway.
  chain('A', { x: 4, y: 14 }, 0, 69, [
    ['line_terminal', { flow: 'in' }],
    ['wave_trap'],
    ['metering'],
    ['circuit_switcher'],
    ['breaker'],
    ['transformer', { lvKV: 12.47, cooling: 'OA/FA/FA', ltc: true, containment: 'basic' }],
    ['recloser', { control: 'hydraulic' }, 12.47],
    ['feeder_exit', { underground: true }, 12.47],
  ]);

  // 12.47 kV bus with shunt devices tapped from below (rot 1: port faces north).
  const busY = 34;
  wire(12.47, [{ x: 8, y: busY }, { x: 62, y: busY }]);
  const shunts: Array<[ItemKind, Props?]> = [['arrester'], ['vt'], ['capacitor_bank', { kvar: 3600 }], ['station_service'], ['vt', {}]];
  let x = 12;
  shunts.forEach(([kind, props], i) => {
    const it: PlacedItem = { id: `S${i + 1}`, kind, x: 0, y: 0, rot: 1, kv: 12.47, props: { ...defaultProps(kind), ...props } };
    const fp = footprintOf(it);
    const off = localToWorld(fp.ports[0]!.local, fp.w, fp.d, 1, 0, 0);
    it.x = x - off.x;
    it.y = busY + 2 - off.y;
    items.push(it);
    wire(12.47, [{ x, y: busY }, { x, y: busY + 2 }]);
    x += Math.max(fp.d, 3) + 6;
  });
  chain('F', { x: 62, y: busY }, 0, 12.47, [['hookstick_switch'], ['fuse'], ['breaker'], ['feeder_exit']]);

  // 69 kV shunts on a short bus: CCVT and arrester (port facing south, rot 3).
  wire(69, [{ x: 70, y: 8 }, { x: 92, y: 8 }]);
  for (const [i, kind] of (['ccvt', 'arrester', 'vt'] as ItemKind[]).entries()) {
    const it: PlacedItem = { id: `H${i + 1}`, kind, x: 0, y: 0, rot: 3, kv: 69, props: defaultProps(kind) };
    const fp = footprintOf(it);
    const px = 74 + i * 7;
    const off = localToWorld(fp.ports[0]!.local, fp.w, fp.d, 3, 0, 0);
    it.x = px - off.x;
    it.y = 6 - off.y;
    items.push(it);
    wire(69, [{ x: px, y: 8 }, { x: px, y: 6 }]);
  }

  // Rotated chains: flowing south (rot 1), west (rot 2) and north (rot 3).
  chain('R', { x: 96, y: 16 }, 1, 12.47, [['switch'], ['regulator'], ['switch', { normallyOpen: true }]]);
  chain('W', { x: 92, y: 62 }, 2, 12.47, [['recloser'], ['switch', { style: 'side_break' }]]);
  chain('N', { x: 76, y: 74 }, 3, 69, [['switch'], ['fuse'], ['transformer', { lvKV: 24.9, arresters: 'hv' }]]);

  // Mobile pad, masts, control house (rotated).
  const pad: PlacedItem = { id: 'MP1', kind: 'mobile_pad', x: 8, y: 46, rot: 0, kv: 69, props: { ...defaultProps('mobile_pad'), lvKV: 12.47 } };
  items.push(pad);
  items.push({ id: 'CH1', kind: 'control_house', x: 30, y: 52, rot: 1, kv: 0, props: { ...defaultProps('control_house'), size: 'large' } });
  const masts: Array<[string, number, number, number]> = [
    ['M1', 20, 26, 18],
    ['M2', 50, 26, 21],
    ['M3', 50, 58, 15],
    ['M4', 84, 30, 24],
  ];
  for (const [id, mx, my, h] of masts) items.push({ id, kind: 'mast', x: mx, y: my, rot: 0, kv: 0, props: { heightM: h } });

  return {
    version: 1,
    levelId: 'showcase',
    items,
    conductors,
    fence: { rect: { x: 1, y: 2, w: 104, h: 76 }, gate: { side: 'E', offset: 30, width: 7 } },
    shieldWires: [
      { id: 'SW1', a: 'M1', b: 'M2' },
      { id: 'SW2', a: 'M2', b: 'M3' },
      { id: 'SW3', a: 'M2', b: 'M4' },
    ],
    groundGrid: { enabled: true, spacingM: 8, conductor: '4/0', depthM: 0.5, rodCount: 12, rodLengthM: 3, extendBeyondFenceM: 1, fenceBonded: true },
    surfacing: { material: 'washed_granite', thicknessM: 0.1 },
    shieldingMethod: 'fixed_angle',
  };
}
