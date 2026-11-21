/**
 * Lines leaving the yard: from a line terminal's dead-end (transmission, wood
 * H-frames) or a feeder getaway (distribution, wood poles) out past the site
 * boundary. The first span is always drawn so the connection reads; with
 * scenery on, the line continues across the countryside.
 */
import type { LineBasicMaterial, Vector3 } from 'three';
import type { SceneModel } from '../engine/scene';
import type { Vec2 } from '../engine/types';
import type { LineBatch, PartBatch } from './batch';
import type { Parts } from './parts';

export interface OffsiteDef {
  owner: string;
  attach: Vector3[];
  /** Plan direction (unit). */
  dir: Vec2;
  kind: 'transmission' | 'distribution';
}

/** Distance from p along d to the edge of the site rectangle (0 if already outside). */
function exitDistance(p: Vec2, d: Vec2, w: number, h: number): number {
  if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) return 0;
  let t = Infinity;
  if (d.x > 1e-6) t = Math.min(t, (w - p.x) / d.x);
  if (d.x < -1e-6) t = Math.min(t, -p.x / d.x);
  if (d.y > 1e-6) t = Math.min(t, (h - p.y) / d.y);
  if (d.y < -1e-6) t = Math.min(t, -p.y / d.y);
  return Number.isFinite(t) ? t : 0;
}

function sagLine(lines: LineBatch, mat: LineBasicMaterial, a: Vector3 | number[], b: number[], sag: number, n: number): void {
  const ax = Array.isArray(a) ? a[0]! : a.x;
  const ay = Array.isArray(a) ? a[1]! : a.y;
  const az = Array.isArray(a) ? a[2]! : a.z;
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(ax + (b[0]! - ax) * t, ay + (b[1]! - ay) * t - 4 * sag * t * (1 - t), az + (b[2]! - az) * t);
  }
  lines.polyline('wire', mat, pts);
}

/** Corridors (plan segments with half-width) that scenery must keep clear of. */
export interface Corridor {
  a: Vec2;
  b: Vec2;
  half: number;
}

export function buildOffsite(
  p: Parts,
  batch: PartBatch,
  lines: LineBatch,
  wireMat: LineBasicMaterial,
  model: SceneModel,
  defs: readonly OffsiteDef[],
  scenery: boolean,
): Corridor[] {
  const corridors: Corridor[] = [];
  const nSeg = p.hi ? 12 : 6;
  for (const def of defs) {
    if (def.attach.length === 0) continue;
    p.use(batch, def.owner);
    const tx = def.kind === 'transmission';
    let cx = 0;
    let cz = 0;
    let H0 = 0;
    for (const a of def.attach) {
      cx += a.x;
      cz += a.z;
      H0 += a.y;
    }
    cx /= def.attach.length;
    cz /= def.attach.length;
    H0 /= def.attach.length;
    const d = def.dir;
    const lat = { x: -d.y, y: d.x };
    const offs = def.attach.map((a) => (a.x - cx) * lat.x + (a.z - cz) * lat.y);
    const maxOff = Math.max(...offs.map((o) => Math.abs(o)), 0.3);
    const D = Math.min(120, Math.max(12, exitDistance({ x: cx, y: cz }, d, model.site.width, model.site.depth) + (tx ? 16 : 12)));
    const spans = scenery ? (tx ? 5 : 6) : 1;
    const spanLen = tx ? 80 : 45;
    let prev: Array<Vector3 | number[]> = def.attach;
    for (let s = 0; s < spans; s++) {
      const dist = D + s * spanLen;
      const px = cx + d.x * dist;
      const pz = cz + d.y * dist;
      const next: number[][] = [];
      if (tx) {
        // Wood H-frame: two poles, crossarm, X-brace, suspension strings.
        const yArm = H0 + 2.6;
        const hp = yArm + 0.7;
        const po = maxOff + 1.1;
        for (const sgn of [-1, 1]) p.cone('wood', px + lat.x * po * sgn, -0.05, pz + lat.y * po * sgn, px + lat.x * po * sgn, hp, pz + lat.y * po * sgn, 0.2, 0.14, p.hi ? 8 : 6);
        p.beam('crossarm', px - lat.x * (po + 0.5), yArm, pz - lat.y * (po + 0.5), px + lat.x * (po + 0.5), yArm, pz + lat.y * (po + 0.5), 0.14, 0.2);
        if (p.hi) {
          p.beam('crossarm', px - lat.x * po, 2.2, pz - lat.y * po, px + lat.x * po, yArm - 1.4, pz + lat.y * po, 0.08, 0.08);
          p.beam('crossarm', px + lat.x * po, 2.2, pz + lat.y * po, px - lat.x * po, yArm - 1.4, pz - lat.y * po, 0.08, 0.08);
        }
        for (const o of offs) {
          const x = px + lat.x * o;
          const z = pz + lat.y * o;
          p.cyl('porcelain', x, yArm - 0.1, z, x, yArm - 1.15, z, p.hi ? 0.11 : 0.07, p.hi ? 10 : 6);
          next.push([x, yArm - 1.2, z]);
        }
      } else {
        // Wood distribution pole with an alley arm and pin insulators.
        const yArm = H0 + 0.3;
        const po = maxOff + 0.45;
        const ppx = px + lat.x * po;
        const ppz = pz + lat.y * po;
        p.cone('wood', ppx, -0.05, ppz, ppx, yArm + 0.9, ppz, 0.15, 0.11, p.hi ? 8 : 6);
        p.beam('crossarm', ppx + lat.x * 0.15, yArm - 0.06, ppz + lat.y * 0.15, px - lat.x * (maxOff + 0.3), yArm - 0.06, pz - lat.y * (maxOff + 0.3), 0.09, 0.11);
        for (const o of offs) {
          const x = px + lat.x * o;
          const z = pz + lat.y * o;
          p.vcyl('porcelain', x, z, yArm, yArm + 0.22, p.hi ? 0.06 : 0.045, p.hi ? 8 : 5);
          next.push([x, yArm + 0.24, z]);
        }
      }
      for (let k = 0; k < next.length && k < prev.length; k++) {
        const a = prev[k]!;
        const b = next[k]!;
        const ax = Array.isArray(a) ? a[0]! : a.x;
        const az = Array.isArray(a) ? a[2]! : a.z;
        const span = Math.hypot(b[0]! - ax, b[2]! - az);
        sagLine(lines, wireMat, a, b, (tx ? 0.012 : 0.01) * span + 0.1, nSeg);
      }
      prev = next;
    }
    corridors.push({
      a: { x: cx, y: cz },
      b: { x: cx + d.x * (D + (spans - 1) * spanLen + 30), y: cz + d.y * (D + (spans - 1) * spanLen + 30) },
      half: maxOff + (tx ? 14 : 9),
    });
  }
  return corridors;
}
