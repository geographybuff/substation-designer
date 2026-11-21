/**
 * Plan <-> three.js coordinate mapping.
 *
 * Plan: x east, y south, heights z up (metres). three.js: X = plan x,
 * Y = height, Z = plan y. This is a proper rotation (no mirroring): with Y up,
 * X east and Z south form a right-handed frame, north is -Z.
 *
 * Item models are authored in a local frame: X in [0, w] along the power-flow
 * axis, Z in [0, d] across the phases, Y up; local (lx, lz) is the same point as
 * the engine's unrotated footprint coordinate (lx, ly). Item rotation is quarter
 * turns clockwise in plan view, i.e. a rotation of -rot * 90 degrees about +Y.
 */
import { Matrix4, Vector3 } from 'three';
import type { Rect, Rotation, Vec2 } from '../engine/types';

/** [cos, sin] of -rot * 90 degrees, exact for quarter turns. */
const QUARTER: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1],
];

export interface Placement {
  rect: Rect;
  w: number;
  d: number;
  rot: Rotation;
}

function cs(rot: Rotation): readonly [number, number] {
  return QUARTER[rot] ?? QUARTER[0]!;
}

/** Matrix taking an item's local model coordinates to world (three.js) coordinates. */
export function itemMatrix(p: Placement, out = new Matrix4()): Matrix4 {
  const [c, s] = cs(p.rot);
  const cx = p.rect.x + p.rect.w / 2;
  const cz = p.rect.y + p.rect.h / 2;
  const hw = p.w / 2;
  const hd = p.d / 2;
  return out.set(c, 0, s, cx - c * hw - s * hd, 0, 1, 0, 0, -s, 0, c, cz + s * hw - c * hd, 0, 0, 0, 1);
}

/** Local footprint point (lx along flow, ly across) to plan coordinates. */
export function localToPlan(p: Placement, lx: number, ly: number): Vec2 {
  const [c, s] = cs(p.rot);
  const ux = lx - p.w / 2;
  const uz = ly - p.d / 2;
  return { x: p.rect.x + p.rect.w / 2 + c * ux + s * uz, y: p.rect.y + p.rect.h / 2 - s * ux + c * uz };
}

/** Local direction to plan direction. */
export function localDirToPlan(rot: Rotation, dx: number, dy: number): Vec2 {
  const [c, s] = cs(rot);
  return { x: c * dx + s * dy, y: -s * dx + c * dy };
}

export function planToWorld(x: number, y: number, h = 0, out = new Vector3()): Vector3 {
  return out.set(x, h, y);
}
