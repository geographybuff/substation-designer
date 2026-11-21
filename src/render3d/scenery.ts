/**
 * Decorative countryside around the parcel: crop fields, tree rows and
 * woodlots, farmsteads, and a distribution line along the road. Only built
 * when scenery is enabled; deterministic so rebuilds never reshuffle it.
 */
import { BufferGeometry, Float32BufferAttribute, Mesh, type Object3D } from 'three';
import type { SceneModel } from '../engine/scene';
import type { Rect, Vec2 } from '../engine/types';
import type { LineBatch, PartBatch } from './batch';
import type { RenderConfig } from './config';
import type { ResourceLibrary } from './library';
import { getLineMaterial, getSurfaceMaterial } from './materials';
import type { Corridor } from './offsite';
import type { Parts } from './parts';
import { roadRect, roadSide, type Disposer } from './site';
import { rng } from './textures';

const CROPS = [0xcdb36a, 0x86a24f, 0x93ad57, 0x8b7155, 0xb8ae78, 0x9fb35e, 0xc4a864];

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const L = abx * abx + aby * aby;
  const t = L < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / L));
  return Math.hypot(p.x - a.x - t * abx, p.y - a.y - t * aby);
}

export function buildScenery(
  p: Parts,
  batch: PartBatch,
  lines: LineBatch,
  root: Object3D,
  disposers: Disposer[],
  lib: ResourceLibrary,
  cfg: RenderConfig,
  model: SceneModel,
  corridors: readonly Corridor[],
): void {
  const { width: W, depth: D } = model.site;
  const cx = W / 2;
  const cz = D / 2;
  const seed = Math.round(W * 131 + D * 977) || 7;
  const rand = rng(seed);
  const E = cfg.groundExtent * 0.8;
  const road = roadRect(model, cfg.groundExtent);
  const keepOut: Rect[] = [{ x: -30, y: -30, w: W + 60, h: D + 60 }, { x: road.x - 6, y: road.y - 6, w: road.w + 12, h: road.h + 12 }];
  const clear = (pt: Vec2, margin = 0) => {
    for (const r of keepOut) if (pt.x > r.x - margin && pt.x < r.x + r.w + margin && pt.y > r.y - margin && pt.y < r.y + r.h + margin) return false;
    for (const c of corridors) if (segDist(pt, c.a, c.b) < c.half + margin) return false;
    return true;
  };

  // Fields: a patchwork of cells, each a crop colour with row stripes.
  const pos: number[] = [];
  const uvs: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const cw = 120;
  const ch = 85;
  const fieldCells: Rect[] = [];
  for (let gx = -Math.ceil(E / cw); gx < Math.ceil(E / cw); gx++) {
    for (let gz = -Math.ceil(E / ch); gz < Math.ceil(E / ch); gz++) {
      const r: Rect = { x: cx + gx * cw + 3, y: cz + gz * ch + 3, w: cw - 6, h: ch - 6 };
      if (keepOut.some((k) => overlaps(k, r))) continue;
      if (Math.hypot(r.x + r.w / 2 - cx, r.y + r.h / 2 - cz) > E) continue;
      const pick = rand();
      if (pick < 0.22) continue; // pasture: leave the grass
      fieldCells.push(r);
      const c = CROPS[Math.floor(rand() * CROPS.length)]!;
      const rr = ((c >> 16) & 255) / 255;
      const gg = ((c >> 8) & 255) / 255;
      const bb = (c & 255) / 255;
      const base = pos.length / 3;
      const y = -0.1;
      pos.push(r.x, y, r.y, r.x, y, r.y + r.h, r.x + r.w, y, r.y + r.h, r.x + r.w, y, r.y);
      const alongX = rand() < 0.5;
      for (const [px, pz] of [
        [r.x, r.y],
        [r.x, r.y + r.h],
        [r.x + r.w, r.y + r.h],
        [r.x + r.w, r.y],
      ] as const) {
        // 8 stripes per 24 m texture tile: crop rows ~3 m apart.
        uvs.push(0, (alongX ? pz : px) / 24);
        // sRGB to linear for vertex colours.
        col.push(rr ** 2.2, gg ** 2.2, bb ** 2.2);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  if (pos.length) {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    disposers.push(geo);
    const mesh = new Mesh(geo, getSurfaceMaterial(lib, cfg, 'field'));
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
  }

  p.use(batch, null);
  const tree = (x: number, z: number, s: number) => {
    const trunkH = 2.2 * s;
    p.vcyl('trunk', x, z, -0.05, trunkH + 0.5, 0.22 * s, 5);
    const r = (2.4 + rand() * 1.6) * s;
    p.sphere(rand() < 0.5 ? 'leaf' : 'leaf2', x, trunkH + r * 0.85, z, r, r * (1.05 + rand() * 0.25));
  };
  // Hedgerows along some field edges.
  for (const r of fieldCells) {
    if (rand() > 0.32) continue;
    const alongTop = rand() < 0.5;
    const L = alongTop ? r.w : r.h;
    for (let t = 4; t < L; t += 8 + rand() * 6) {
      const pt = alongTop ? { x: r.x + t, y: r.y - 3 } : { x: r.x - 3, y: r.y + t };
      if (clear(pt, 4)) tree(pt.x, pt.y, 0.8 + rand() * 0.5);
    }
  }
  // Woodlots.
  for (let i = 0; i < 6; i++) {
    const ang = rand() * Math.PI * 2;
    const dist = 150 + rand() * (E - 200);
    const wx = cx + Math.cos(ang) * dist;
    const wz = cz + Math.sin(ang) * dist;
    const n = 12 + Math.floor(rand() * 18);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * 28;
      const pt = { x: wx + Math.cos(a) * rr, y: wz + Math.sin(a) * rr };
      if (clear(pt, 4)) tree(pt.x, pt.y, 0.9 + rand() * 0.6);
    }
  }
  // Farmsteads: house, barn, silo and grain bins.
  for (let i = 0; i < 2; i++) {
    const ang = (i === 0 ? 0.6 : 3.7) + rand() * 0.8;
    const dist = 260 + rand() * 120;
    const fx = cx + Math.cos(ang) * dist;
    const fz = cz + Math.sin(ang) * dist;
    if (!clear({ x: fx, y: fz }, 30)) continue;
    p.box('house', fx - 5, 0, fz - 3, fx + 5, 4.5, fz + 3);
    p.prism('roof', fx, 4.5, fz, 10.6, 2.4, 6.6);
    p.box('barn', fx + 14, 0, fz - 9, fx + 26, 6.5, fz + 3);
    p.prism('roof', fx + 20, 6.5, fz - 3, 12.6, 4.0, 12.6, Math.PI / 2);
    p.vcyl('concrete', fx + 30, fz - 6, 0, 15, 2.8, p.hi ? 14 : 8);
    p.sphere('galv', fx + 30, 15, fz - 6, 2.8, 1.8);
    for (let b = 0; b < 2; b++) {
      const bx = fx + 6 + b * 8.5;
      const bz = fz + 12;
      p.vcyl('galv', bx, bz, 0, 5.5, 3.5, p.hi ? 14 : 8);
      p.cone('galv', bx, 5.5, bz, bx, 7.6, bz, 3.7, 0.4, p.hi ? 14 : 8);
    }
    for (let k = 0; k < 8; k++) {
      const pt = { x: fx - 12 + rand() * 50, y: fz - 22 + rand() * 6 };
      tree(pt.x, pt.y, 1.1 + rand() * 0.4);
    }
  }
  // Distribution line along the far side of the road.
  const wire = getLineMaterial(lib, 'wire');
  const side = roadSide(model);
  const horizontal = side === 'N' || side === 'S';
  const off = side === 'S' ? road.y + road.h + 5 : side === 'N' ? road.y - 5 : side === 'E' ? road.x + road.w + 5 : road.x - 5;
  const span = 45;
  const n = Math.floor((2 * E) / span);
  let prev: number[][] | null = null;
  for (let i = 0; i <= n; i++) {
    const t = -E + i * span;
    const px = horizontal ? cx + t : off;
    const pz = horizontal ? off : cz + t;
    const lat = horizontal ? { x: 0, y: 1 } : { x: 1, y: 0 };
    p.cone('wood', px, -0.05, pz, px, 10.5, pz, 0.15, 0.11, p.hi ? 8 : 5);
    p.beam('crossarm', px - lat.x * 1.2, 9.9, pz - lat.y * 1.2, px + lat.x * 1.2, 9.9, pz + lat.y * 1.2, 0.09, 0.11);
    const cur = [-1.0, -0.35, 1.0].map((o) => [px + lat.x * o, 10.15, pz + lat.y * o]);
    if (prev) {
      for (let k = 0; k < 3; k++) {
        const a = prev[k]!;
        const b = cur[k]!;
        const pts: number[] = [];
        for (let s = 0; s <= 8; s++) {
          const u = s / 8;
          pts.push(a[0]! + (b[0]! - a[0]!) * u, a[1]! + (b[1]! - a[1]!) * u - 4 * 0.5 * u * (1 - u), a[2]! + (b[2]! - a[2]!) * u);
        }
        lines.polyline('wire', wire, pts);
      }
    }
    prev = cur;
  }
}
