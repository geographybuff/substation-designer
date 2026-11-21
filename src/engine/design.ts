/**
 * Pure design-editing operations used by the editor. Every function returns a
 * new Design (structural sharing where convenient) so undo/redo can keep
 * snapshots.
 */
import { CATALOG, DEFAULT_CONDUCTOR, defaultProps } from './catalog';
import { GRID, newId, rectsOverlap, samePoint, snap } from './geometry';
import { footprintOf, itemPorts, itemRect } from './items';
import type { Conductor, Design, FenceDesign, GroundGridDesign, ItemKind, LevelDef, PlacedItem, Props, Rect, Rotation, SurfacingDesign, Vec2 } from './types';

export const DEFAULT_GROUND_GRID: GroundGridDesign = {
  enabled: false,
  spacingM: 7,
  conductor: '4/0',
  depthM: 0.5,
  rodCount: 0,
  rodLengthM: 3,
  extendBeyondFenceM: 1,
  fenceBonded: true,
};

export const DEFAULT_SURFACING: SurfacingDesign = { material: 'none', thicknessM: 0.1 };

export function newDesign(level: LevelDef): Design {
  return {
    version: 1,
    levelId: level.id,
    items: [...level.fixtures.map((f) => structuredClone(f)), ...(level.starter?.items ?? []).map((i) => structuredClone(i))],
    conductors: (level.starter?.conductors ?? []).map((c) => structuredClone(c)),
    fence: level.starter?.fence ? structuredClone(level.starter.fence) : null,
    shieldWires: [],
    groundGrid: { ...DEFAULT_GROUND_GRID, ...(level.starter?.groundGrid ?? {}) },
    surfacing: { ...DEFAULT_SURFACING, ...(level.starter?.surfacing ?? {}) },
    shieldingMethod: 'fixed_angle',
  };
}

const PREFIX: Record<ItemKind, string> = {
  line_terminal: 'L',
  feeder_exit: 'FE',
  switch: 'S',
  hookstick_switch: 'HS',
  fuse: 'F',
  circuit_switcher: 'CS',
  breaker: 'CB',
  recloser: 'R',
  transformer: 'T',
  regulator: 'RG',
  arrester: 'LA',
  capacitor_bank: 'C',
  vt: 'VT',
  ccvt: 'CCVT',
  wave_trap: 'WT',
  metering: 'MTR',
  station_service: 'SS',
  mobile_pad: 'MP',
  control_house: 'CH',
  mast: 'M',
};

export function makeItem(design: Design, kind: ItemKind, x: number, y: number, rot: Rotation, kv: number, extraProps: Props = {}): PlacedItem {
  const id = newId(PREFIX[kind], design.items.map((i) => i.id));
  return { id, kind, x: snap(x), y: snap(y), rot, kv, props: { ...defaultProps(kind), ...extraProps } };
}

/** Rectangle an item would occupy (for ghost previews). */
export function previewRect(kind: ItemKind, kv: number, props: Props, x: number, y: number, rot: Rotation): Rect {
  return itemRect({ id: '_', kind, kv, props, x, y, rot });
}

export function placementBlocked(design: Design, level: LevelDef, rect: Rect, ignoreId?: string): string | null {
  if (rect.x < -1e-6 || rect.y < -1e-6 || rect.x + rect.w > level.site.width + 1e-6 || rect.y + rect.h > level.site.depth + 1e-6) return 'Outside the property';
  for (const nb of level.site.noBuild ?? []) if (rectsOverlap(rect, nb)) return `No-build area: ${nb.label}`;
  for (const it of design.items) {
    if (it.id === ignoreId) continue;
    if (rectsOverlap(rect, itemRect(it))) return `Overlaps ${it.label ?? it.id}`;
  }
  return null;
}

export function addItem(design: Design, item: PlacedItem): Design {
  return { ...design, items: [...design.items, item] };
}

export function updateItem(design: Design, id: string, patch: Partial<PlacedItem>): Design {
  return { ...design, items: design.items.map((i) => (i.id === id ? { ...i, ...patch, props: patch.props ? { ...i.props, ...patch.props } : i.props } : i)) };
}

export function setItemProp(design: Design, id: string, key: string, value: Props[string]): Design {
  return { ...design, items: design.items.map((i) => (i.id === id ? { ...i, props: { ...i.props, [key]: value } } : i)) };
}

/**
 * Move an item; conductor endpoints attached to its terminals follow it with an
 * orthogonal dog-leg so connections survive the move.
 */
export function moveItem(design: Design, id: string, x: number, y: number): Design {
  const it = design.items.find((i) => i.id === id);
  if (!it || it.locked) return design;
  const fp = footprintOf(it);
  const before = portPositions(it, fp);
  const moved: PlacedItem = { ...it, x: snap(x), y: snap(y) };
  const after = portPositions(moved, fp);
  let conductors = design.conductors;
  for (let k = 0; k < before.length; k++) {
    const from = before[k]!;
    const to = after[k]!;
    if (samePoint(from, to)) continue;
    conductors = conductors.map((c) => reattachEnd(c, from, to));
  }
  return { ...design, items: design.items.map((i) => (i.id === id ? moved : i)), conductors };
}

function portPositions(it: PlacedItem, fp = footprintOf(it)): Vec2[] {
  return itemPorts(it, fp).map((p) => p.pos);
}

/** If a conductor starts or ends at `from`, move that end to `to`, inserting a corner to stay orthogonal. */
function reattachEnd(c: Conductor, from: Vec2, to: Vec2): Conductor {
  const pts = c.points;
  const n = pts.length;
  if (n < 2) return c;
  const fix = (end: Vec2, neighbour: Vec2): Vec2[] => {
    // Returns replacement points from neighbour (exclusive) to the new end (inclusive).
    if (Math.abs(neighbour.x - to.x) < 1e-9 || Math.abs(neighbour.y - to.y) < 1e-9) return [to];
    // Preserve the original leg direction where possible.
    const horizontalLeg = Math.abs(end.y - neighbour.y) < 1e-9;
    const corner = horizontalLeg ? { x: to.x, y: neighbour.y } : { x: neighbour.x, y: to.y };
    return [corner, to];
  };
  if (samePoint(pts[0]!, from)) {
    const rest = pts.slice(1);
    const repl = fix(pts[0]!, pts[1]!).reverse();
    return { ...c, points: simplify([...repl, ...rest]) };
  }
  if (samePoint(pts[n - 1]!, from)) {
    const head = pts.slice(0, n - 1);
    return { ...c, points: simplify([...head, ...fix(pts[n - 1]!, pts[n - 2]!)]) };
  }
  return c;
}

/** Remove duplicate and collinear interior points. */
export function simplify(points: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (const p of points) {
    const q = { x: snap(p.x, GRID / 2), y: snap(p.y, GRID / 2) };
    if (out.length && samePoint(out[out.length - 1]!, q)) continue;
    out.push(q);
    while (out.length >= 3) {
      const a = out[out.length - 3]!;
      const b = out[out.length - 2]!;
      const c = out[out.length - 1]!;
      const collinear = (Math.abs(a.x - b.x) < 1e-9 && Math.abs(b.x - c.x) < 1e-9) || (Math.abs(a.y - b.y) < 1e-9 && Math.abs(b.y - c.y) < 1e-9);
      if (!collinear) break;
      out.splice(out.length - 2, 1);
    }
  }
  return out;
}

export function rotateItem(design: Design, id: string): Design {
  const it = design.items.find((i) => i.id === id);
  if (!it || it.locked) return design;
  const fp = footprintOf(it);
  const before = itemRect(it, fp);
  const rot = ((it.rot + 1) % 4) as Rotation;
  // Keep the centre roughly fixed.
  const after = itemRect({ ...it, rot }, fp);
  const x = snap(before.x + before.w / 2 - after.w / 2);
  const y = snap(before.y + before.h / 2 - after.h / 2);
  return { ...design, items: design.items.map((i) => (i.id === id ? { ...i, rot, x, y } : i)) };
}

export function deleteItems(design: Design, ids: readonly string[]): Design {
  const del = new Set(ids.filter((id) => !design.items.find((i) => i.id === id)?.locked));
  return {
    ...design,
    items: design.items.filter((i) => !del.has(i.id)),
    shieldWires: design.shieldWires.filter((s) => !del.has(s.a) && !del.has(s.b)),
  };
}

export function addConductor(design: Design, points: Vec2[], kv: number, elevation: Conductor['elevation'] = 'low', size = DEFAULT_CONDUCTOR): Design {
  const pts = simplify(points);
  if (pts.length < 2) return design;
  const id = newId('B', design.conductors.map((c) => c.id));
  return { ...design, conductors: [...design.conductors, { id, points: pts, kv, elevation, size }] };
}

export function updateConductor(design: Design, id: string, patch: Partial<Conductor>): Design {
  return { ...design, conductors: design.conductors.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}

export function deleteConductors(design: Design, ids: readonly string[]): Design {
  const del = new Set(ids);
  return { ...design, conductors: design.conductors.filter((c) => !del.has(c.id)) };
}

export function setFence(design: Design, fence: FenceDesign | null): Design {
  return { ...design, fence };
}

export function addShieldWire(design: Design, a: string, b: string): Design {
  if (a === b) return design;
  if (design.shieldWires.some((s) => (s.a === a && s.b === b) || (s.a === b && s.b === a))) return design;
  const id = newId('SW', design.shieldWires.map((s) => s.id));
  return { ...design, shieldWires: [...design.shieldWires, { id, a, b }] };
}

export function deleteShieldWire(design: Design, id: string): Design {
  return { ...design, shieldWires: design.shieldWires.filter((s) => s.id !== id) };
}

/** Orthogonal route from a to b: horizontal-first or vertical-first L. */
export function lRoute(a: Vec2, b: Vec2, horizontalFirst: boolean): Vec2[] {
  if (Math.abs(a.x - b.x) < 1e-9 || Math.abs(a.y - b.y) < 1e-9) return [a, b];
  return horizontalFirst ? [a, { x: b.x, y: a.y }, b] : [a, { x: a.x, y: b.y }, b];
}

/** Voltage choices offered in the toolbox for an item kind in a level. */
export function voltagesFor(kind: ItemKind, level: LevelDef): number[] {
  const v = CATALOG[kind].voltages;
  if (!v) return [0];
  const sys = [level.system.hvKV, ...(level.system.lvKV !== undefined ? [level.system.lvKV] : [])];
  return sys.filter((kv) => kv >= v.min - 0.01 && kv <= v.max + 0.01);
}

/** Make sure transformers carry the level's LV rating. */
export function transformerProps(level: LevelDef): Props {
  return { lvKV: level.system.lvKV ?? level.system.hvKV };
}
