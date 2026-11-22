import type { Rect, Rotation, Vec2 } from './types';

export const GRID = 0.5;
export const EPS = 1e-6;

export const snap = (v: number, step = GRID): number => Math.round(v / step) * step;
/** Round up to a multiple of `step` (with a little tolerance for float noise). */
export const ceilTo = (v: number, step: number): number => Math.ceil(v / step - 1e-9) * step;

export const v2 = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const samePoint = (a: Vec2, b: Vec2, tol = 1e-3): boolean =>
  Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;

/** Size of a w x d footprint after rotation. */
export function rotatedSize(w: number, d: number, rot: Rotation): { w: number; h: number } {
  return rot % 2 === 0 ? { w, h: d } : { w: d, h: w };
}

/**
 * Map a local point (relative to the unrotated footprint's top-left, size w x d)
 * to world coordinates for an item whose rotated footprint's top-left is (x, y).
 * Rotation is clockwise in screen space (+y down).
 */
export function localToWorld(
  local: Vec2,
  w: number,
  d: number,
  rot: Rotation,
  x: number,
  y: number,
): Vec2 {
  switch (rot) {
    case 0:
      return { x: x + local.x, y: y + local.y };
    case 1:
      // 90° CW: local (lx, ly) -> (d - ly, lx)
      return { x: x + (d - local.y), y: y + local.x };
    case 2:
      return { x: x + (w - local.x), y: y + (d - local.y) };
    case 3:
      // 270° CW: local (lx, ly) -> (ly, w - lx)
      return { x: x + local.y, y: y + (w - local.x) };
  }
}

/** Outward direction of a port that lies on a footprint edge, in world space. */
export function rotateDir(dir: Vec2, rot: Rotation): Vec2 {
  let { x, y } = dir;
  for (let i = 0; i < rot; i++) {
    const nx = -y;
    const ny = x;
    x = nx;
    y = ny;
  }
  return { x: Math.round(x), y: Math.round(y) };
}

export function rectsOverlap(a: Rect, b: Rect, tol = 1e-6): boolean {
  return a.x < b.x + b.w - tol && b.x < a.x + a.w - tol && a.y < b.y + b.h - tol && b.y < a.y + a.h - tol;
}

export function rectContainsRect(outer: Rect, inner: Rect, tol = 1e-6): boolean {
  return (
    inner.x >= outer.x - tol &&
    inner.y >= outer.y - tol &&
    inner.x + inner.w <= outer.x + outer.w + tol &&
    inner.y + inner.h <= outer.y + outer.h + tol
  );
}

export function pointInRect(p: Vec2, r: Rect, tol = 0): boolean {
  return p.x >= r.x - tol && p.x <= r.x + r.w + tol && p.y >= r.y - tol && p.y <= r.y + r.h + tol;
}

export function inflateRect(r: Rect, m: number): Rect {
  return { x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m };
}

export function rectCenter(r: Rect): Vec2 {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Euclidean gap between two rectangles (0 if they touch or overlap). */
export function rectGap(a: Rect, b: Rect): number {
  const dx = Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.hypot(dx, dy);
}

/** Distance from a point to a segment. */
export function pointSegDist(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < EPS) return dist(p, a);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

export function pointOnSegment(p: Vec2, a: Vec2, b: Vec2, tol = 1e-3): boolean {
  return pointSegDist(p, a, b) <= tol;
}

function orient(a: Vec2, b: Vec2, c: Vec2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

export function segmentsIntersect(p1: Vec2, p2: Vec2, q1: Vec2, q2: Vec2): boolean {
  const d1 = orient(q1, q2, p1);
  const d2 = orient(q1, q2, p2);
  const d3 = orient(p1, p2, q1);
  const d4 = orient(p1, p2, q2);
  if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) {
    return true;
  }
  if (Math.abs(d1) <= EPS && pointOnSegment(p1, q1, q2)) return true;
  if (Math.abs(d2) <= EPS && pointOnSegment(p2, q1, q2)) return true;
  if (Math.abs(d3) <= EPS && pointOnSegment(q1, p1, p2)) return true;
  if (Math.abs(d4) <= EPS && pointOnSegment(q2, p1, p2)) return true;
  return false;
}

/** Minimum distance between two segments. */
export function segSegDist(p1: Vec2, p2: Vec2, q1: Vec2, q2: Vec2): number {
  if (segmentsIntersect(p1, p2, q1, q2)) return 0;
  return Math.min(
    pointSegDist(p1, q1, q2),
    pointSegDist(p2, q1, q2),
    pointSegDist(q1, p1, p2),
    pointSegDist(q2, p1, p2),
  );
}

/** Minimum distance from a segment to a rectangle (0 if it touches or crosses it). */
export function segRectDist(a: Vec2, b: Vec2, r: Rect): number {
  if (pointInRect(a, r) || pointInRect(b, r)) return 0;
  const c1 = { x: r.x, y: r.y };
  const c2 = { x: r.x + r.w, y: r.y };
  const c3 = { x: r.x + r.w, y: r.y + r.h };
  const c4 = { x: r.x, y: r.y + r.h };
  return Math.min(segSegDist(a, b, c1, c2), segSegDist(a, b, c2, c3), segSegDist(a, b, c3, c4), segSegDist(a, b, c4, c1));
}

/** Iterate the segments of a polyline. */
export function* segments(points: readonly Vec2[]): Generator<[Vec2, Vec2]> {
  for (let i = 0; i + 1 < points.length; i++) yield [points[i]!, points[i + 1]!];
}

export function polylineLength(points: readonly Vec2[]): number {
  let L = 0;
  for (const [a, b] of segments(points)) L += dist(a, b);
  return L;
}

/** Sample points along a polyline every `step` metres (including vertices). */
export function samplePolyline(points: readonly Vec2[], step: number): Vec2[] {
  const out: Vec2[] = [];
  for (const [a, b] of segments(points)) {
    const L = dist(a, b);
    const n = Math.max(1, Math.ceil(L / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  if (points.length) out.push({ ...points[points.length - 1]! });
  return out;
}

/** Distance from point to the boundary of a rectangle (positive inside or outside). */
export function distToRectBoundary(p: Vec2, r: Rect): number {
  const inside = pointInRect(p, r);
  if (inside) {
    return Math.min(p.x - r.x, r.x + r.w - p.x, p.y - r.y, r.y + r.h - p.y);
  }
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** Gap between a rectangle and the boundary of an enclosing rectangle (negative if it pokes out). */
export function rectInsetFrom(inner: Rect, outer: Rect): number {
  return Math.min(
    inner.x - outer.x,
    outer.x + outer.w - (inner.x + inner.w),
    inner.y - outer.y,
    outer.y + outer.h - (inner.y + inner.h),
  );
}

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Deterministic id generator for new objects. */
export function newId(prefix: string, existing: Iterable<string>): string {
  const used = new Set(existing);
  for (let i = 1; ; i++) {
    const id = `${prefix}${i}`;
    if (!used.has(id)) return id;
  }
}

/** Offset polyline by `o` along the left normal with mitred joints. */
/** Used for the three phase conductors of a bus in plan and 3D. */
export function offsetPolyline(pts: readonly Vec2[], closed: boolean, o: number): Vec2[] {
  const n = pts.length;
  const segN: Vec2[] = [];
  for (let i = 0; i + 1 < n; i++) {
    const dx = pts[i + 1]!.x - pts[i]!.x;
    const dy = pts[i + 1]!.y - pts[i]!.y;
    const l = Math.hypot(dx, dy) || 1;
    const d = { x: dx / l, y: dy / l };
    segN.push({ x: -d.y, y: d.x });
  }
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    let n0 = i > 0 ? segN[i - 1] : closed ? segN[segN.length - 1] : undefined;
    let n1 = i < n - 1 ? segN[i] : closed ? segN[0] : undefined;
    n0 = n0 ?? n1!;
    n1 = n1 ?? n0;
    let mx = n0.x + n1.x;
    let my = n0.y + n1.y;
    const ml = Math.hypot(mx, my);
    if (ml < 1e-6) {
      mx = n0.x;
      my = n0.y;
    } else {
      mx /= ml;
      my /= ml;
    }
    const cos = mx * n0.x + my * n0.y;
    const s = o / Math.max(0.25, cos);
    out.push({ x: pts[i]!.x + mx * s, y: pts[i]!.y + my * s });
  }
  return out;
}
