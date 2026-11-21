import { CATALOG, type Footprint } from './catalog';
import { localToWorld, rotateDir, rotatedSize } from './geometry';
import type { PlacedItem, Rect, Vec2 } from './types';

export interface WorldPort {
  itemId: string;
  portId: string;
  pos: Vec2;
  dir: Vec2;
}

export function footprintOf(item: Pick<PlacedItem, 'kind' | 'kv' | 'props'>): Footprint {
  return CATALOG[item.kind].footprint(item.kv, item.props);
}

/** World-space rectangle occupied by an item. */
export function itemRect(item: PlacedItem, fp: Footprint = footprintOf(item)): Rect {
  const s = rotatedSize(fp.w, fp.d, item.rot);
  return { x: item.x, y: item.y, w: s.w, h: s.h };
}

export function itemCenter(item: PlacedItem): Vec2 {
  const r = itemRect(item);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function itemPorts(item: PlacedItem, fp: Footprint = footprintOf(item)): WorldPort[] {
  return fp.ports.map((p) => ({
    itemId: item.id,
    portId: p.id,
    pos: localToWorld(p.local, fp.w, fp.d, item.rot, item.x, item.y),
    dir: rotateDir(p.dir, item.rot),
  }));
}

export function itemLabel(item: PlacedItem): string {
  return item.label ?? `${CATALOG[item.kind].tag} ${item.id.replace(/^\D+/, '')}`;
}
