/**
 * Site: ground and parcel, crushed-rock surfacing, no-build areas, access road
 * and driveway, chain-link fence with barbed-wire extension and gate, and the
 * ground grid overlay.
 */
import { BufferGeometry, Float32BufferAttribute, Mesh, type Object3D } from 'three';
import type { SceneModel } from '../engine/scene';
import type { Rect, Vec2 } from '../engine/types';
import { LineBatch, type PartBatch } from './batch';
import type { RenderConfig } from './config';
import type { ResourceLibrary } from './library';
import { getFabricMaterial, getLineMaterial, getSurfaceMaterial, type SurfaceName } from './materials';
import type { Parts } from './parts';

export interface Disposer {
  dispose(): void;
}

/** Horizontal quad with world-metre UVs (u = x / tile, v = z / tile). */
export function quadGeometry(x0: number, z0: number, x1: number, z1: number, y: number, tile: number): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute([x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0], 3));
  g.setAttribute('normal', new Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute('uv', new Float32BufferAttribute([x0 / tile, z0 / tile, x0 / tile, z1 / tile, x1 / tile, z1 / tile, x1 / tile, z0 / tile], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeBoundingSphere();
  return g;
}

function addQuad(
  root: Object3D,
  disposers: Disposer[],
  lib: ResourceLibrary,
  cfg: RenderConfig,
  name: SurfaceName,
  r: Rect,
  y: number,
  tile: number,
  receive: boolean,
): Mesh {
  const geo = quadGeometry(r.x, r.y, r.x + r.w, r.y + r.h, y, tile);
  disposers.push(geo);
  const mesh = new Mesh(geo, getSurfaceMaterial(lib, cfg, name));
  mesh.receiveShadow = receive;
  mesh.matrixAutoUpdate = false;
  root.add(mesh);
  return mesh;
}

/** Side of the yard the road and gate face. */
export function roadSide(model: SceneModel): 'N' | 'S' | 'E' | 'W' {
  return model.fence?.gate.side ?? 'S';
}

/** Public road strip (plan rect) running along the gate side, outside the parcel. */
export function roadRect(model: SceneModel, extent: number): Rect {
  const { width: W, depth: D } = model.site;
  const cx = W / 2;
  const cz = D / 2;
  switch (roadSide(model)) {
    case 'N':
      return { x: cx - extent, y: -15, w: 2 * extent, h: 7 };
    case 'E':
      return { x: W + 8, y: cz - extent, w: 7, h: 2 * extent };
    case 'W':
      return { x: -15, y: cz - extent, w: 7, h: 2 * extent };
    default:
      return { x: cx - extent, y: D + 8, w: 2 * extent, h: 7 };
  }
}

/** Gate opening on the fence: plan start/end points and the outward normal. */
export function gateGeometry(model: SceneModel): { a: Vec2; b: Vec2; out: Vec2 } | null {
  const f = model.fence;
  if (!f) return null;
  const { x, y, w, h } = f.rect;
  const { side, offset, width } = f.gate;
  const len = side === 'N' || side === 'S' ? w : h;
  const t0 = Math.max(0, Math.min(len, offset));
  const t1 = Math.max(t0, Math.min(len, offset + width));
  switch (side) {
    case 'N':
      return { a: { x: x + t0, y }, b: { x: x + t1, y }, out: { x: 0, y: -1 } };
    case 'S':
      return { a: { x: x + t0, y: y + h }, b: { x: x + t1, y: y + h }, out: { x: 0, y: 1 } };
    case 'E':
      return { a: { x: x + w, y: y + t0 }, b: { x: x + w, y: y + t1 }, out: { x: 1, y: 0 } };
    case 'W':
      return { a: { x, y: y + t0 }, b: { x, y: y + t1 }, out: { x: -1, y: 0 } };
  }
}

export function buildGround(root: Object3D, disposers: Disposer[], lib: ResourceLibrary, cfg: RenderConfig, model: SceneModel): void {
  const E = cfg.groundExtent;
  const { width: W, depth: D } = model.site;
  const cx = W / 2;
  const cz = D / 2;
  const shadows = cfg.shadows !== 'off';
  // Layers are a few centimetres apart (plus polygon offset on the far ground) so
  // they do not z-fight even hundreds of metres away.
  addQuad(root, disposers, lib, cfg, 'grass', { x: cx - E, y: cz - E, w: 2 * E, h: 2 * E }, -0.14, 6, shadows);
  addQuad(root, disposers, lib, cfg, 'parcel', { x: 0, y: 0, w: W, h: D }, -0.06, 6, shadows);
  for (const nb of model.site.noBuild) {
    const water = /creek|stream|river|pond|lake|water|wet|drain/i.test(nb.label);
    addQuad(root, disposers, lib, cfg, water ? 'water' : 'easement', nb, -0.045, 6, shadows);
  }
  const road = roadRect(model, E);
  addQuad(root, disposers, lib, cfg, 'asphalt', road, -0.03, 4, shadows);
  const gate = gateGeometry(model);
  if (gate) {
    const gw = Math.hypot(gate.b.x - gate.a.x, gate.b.y - gate.a.y) + 1;
    const mx = (gate.a.x + gate.b.x) / 2;
    const mz = (gate.a.y + gate.b.y) / 2;
    let r: Rect;
    if (gate.out.y > 0) r = { x: mx - gw / 2, y: mz, w: gw, h: road.y - mz };
    else if (gate.out.y < 0) r = { x: mx - gw / 2, y: road.y + road.h, w: gw, h: mz - (road.y + road.h) };
    else if (gate.out.x > 0) r = { x: mx, y: mz - gw / 2, w: road.x - mx, h: gw };
    else r = { x: road.x + road.w, y: mz - gw / 2, w: mx - (road.x + road.w), h: gw };
    if (r.w > 0 && r.h > 0) addQuad(root, disposers, lib, cfg, 'drive', r, -0.015, 2, shadows);
  }
  if (model.surfacing.rect) {
    addQuad(root, disposers, lib, cfg, model.surfacing.material, model.surfacing.rect, 0.02, 2, shadows);
  }
}

/** Fence posts, rails, fabric, barbed wire and the gate. */
export function buildFence(
  p: Parts,
  batch: PartBatch,
  lines: LineBatch,
  root: Object3D,
  disposers: Disposer[],
  lib: ResourceLibrary,
  cfg: RenderConfig,
  model: SceneModel,
): void {
  const f = model.fence;
  if (!f) return;
  p.use(batch, null);
  const barbed = getLineMaterial(lib, 'barbed');
  const H = Math.max(1.2, f.height - 0.31); // fabric top (2.13 m for the standard 2.44 m fence)
  const { x, y, w, h } = f.rect;
  const sides: Array<{ s: 'N' | 'E' | 'S' | 'W'; a: Vec2; u: Vec2; len: number; out: Vec2 }> = [
    { s: 'N', a: { x, y }, u: { x: 1, y: 0 }, len: w, out: { x: 0, y: -1 } },
    { s: 'E', a: { x: x + w, y }, u: { x: 0, y: 1 }, len: h, out: { x: 1, y: 0 } },
    { s: 'S', a: { x, y: y + h }, u: { x: 1, y: 0 }, len: w, out: { x: 0, y: 1 } },
    { s: 'W', a: { x, y }, u: { x: 0, y: 1 }, len: h, out: { x: -1, y: 0 } },
  ];
  const fab: number[] = [];
  const uv: number[] = [];
  const tile = 0.15;
  const quad = (ax: number, az: number, bx: number, bz: number, y0: number, y1: number, ox = 0, oz = 0) => {
    const L = Math.hypot(bx - ax, bz - az);
    fab.push(ax, y0, az, bx, y0, bz, bx + ox, y1, bz + oz, ax, y0, az, bx + ox, y1, bz + oz, ax + ox, y1, az + oz);
    const u1 = L / tile;
    const v1 = (y1 - y0) / tile;
    uv.push(0, 0, u1, 0, u1, v1, 0, 0, u1, v1, 0, v1);
  };
  const postKeys = new Set<string>();
  const segs = p.hi ? 8 : 5;
  const post = (px: number, pz: number, r: number, out: Vec2) => {
    const k = `${Math.round(px * 20)},${Math.round(pz * 20)}`;
    if (postKeys.has(k)) return;
    postKeys.add(k);
    if (p.hi) {
      p.vcyl('galv', px, pz, -0.05, H + 0.06, r, segs);
      p.beam('galv', px, H + 0.02, pz, px + out.x * 0.3, H + 0.32, pz + out.y * 0.3, 0.03, 0.03);
    } else {
      p.vcyl('galv', px, pz, -0.05, f.height, r, segs);
    }
  };
  for (const sd of sides) {
    const runs: Array<[number, number]> = [];
    if (sd.s === f.gate.side) {
      const g0 = Math.max(0, Math.min(sd.len, f.gate.offset));
      const g1 = Math.max(g0, Math.min(sd.len, f.gate.offset + f.gate.width));
      if (g0 > 0.05) runs.push([0, g0]);
      if (sd.len - g1 > 0.05) runs.push([g1, sd.len]);
    } else runs.push([0, sd.len]);
    for (const [t0, t1] of runs) {
      const L = t1 - t0;
      const n = Math.max(1, Math.ceil(L / 3.0 - 1e-6));
      const ax = sd.a.x + sd.u.x * t0;
      const az = sd.a.y + sd.u.y * t0;
      const bx = sd.a.x + sd.u.x * t1;
      const bz = sd.a.y + sd.u.y * t1;
      for (let i = 0; i <= n; i++) {
        const t = t0 + (L * i) / n;
        const end = i === 0 || i === n;
        post(sd.a.x + sd.u.x * t, sd.a.y + sd.u.y * t, end ? 0.048 : 0.032, sd.out);
      }
      p.cyl('galv', ax, H, az, bx, H, bz, 0.021, p.hi ? 6 : 4);
      quad(ax, az, bx, bz, 0.04, H);
      for (let k = 1; k <= 3; k++) {
        const o = p.hi ? 0.1 * k : 0;
        const yy = p.hi ? H + 0.1 * k : H + 0.1 * k;
        lines.seg('barbed', barbed, ax + sd.out.x * o, yy, az + sd.out.y * o, bx + sd.out.x * o, yy, bz + sd.out.y * o);
      }
      if (p.hi) lines.seg('barbed', barbed, ax, 0.08, az, bx, 0.08, bz);
    }
  }
  // Gate: heavy posts and two leaves swung open outward.
  const gate = gateGeometry(model);
  if (gate) {
    for (const g of [gate.a, gate.b]) p.vcyl('galv', g.x, g.y, -0.05, H + 0.2, 0.06, segs);
    if (p.hi) {
      const gw = Math.hypot(gate.b.x - gate.a.x, gate.b.y - gate.a.y);
      const leaf = gw / 2 - 0.05;
      const ang = (70 * Math.PI) / 180;
      const u = { x: (gate.b.x - gate.a.x) / gw, y: (gate.b.y - gate.a.y) / gw };
      for (const [hinge, dirSign] of [
        [gate.a, 1],
        [gate.b, -1],
      ] as const) {
        // Closed, each leaf points along the opening toward the other; open, it swings outward.
        const ox = u.x * dirSign * Math.cos(ang) + gate.out.x * Math.sin(ang);
        const oz = u.y * dirSign * Math.cos(ang) + gate.out.y * Math.sin(ang);
        const hx = hinge.x + ox * 0.08;
        const hz = hinge.y + oz * 0.08;
        const ex = hinge.x + ox * leaf;
        const ez = hinge.y + oz * leaf;
        for (const yy of [0.12, H - 0.05, H / 2]) p.cyl('galv', hx, yy, hz, ex, yy, ez, 0.02, 6);
        p.cyl('galv', ex, 0.12, ez, ex, H - 0.05, ez, 0.022, 6);
        p.cyl('galv', hx, 0.12, hz, hx, H - 0.05, hz, 0.022, 6);
        quad(hx, hz, ex, ez, 0.14, H - 0.07);
      }
    }
  }
  if (fab.length) {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(fab, 3));
    geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    disposers.push(geo);
    const mesh = new Mesh(geo, getFabricMaterial(lib, cfg));
    mesh.renderOrder = 1;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
  }
}

/** Ground grid conductors drawn as copper lines just above the surfacing. */
export function buildGroundGrid(lib: ResourceLibrary, model: SceneModel): LineBatch | null {
  const gg = model.groundGrid;
  if (!gg || gg.spacing <= 0) return null;
  const lines = new LineBatch();
  const mat = getLineMaterial(lib, 'grid');
  const { x, y, w, h } = gg.rect;
  const yy = 0.07;
  const xs: number[] = [];
  for (let v = x; v < x + w - 1e-6; v += gg.spacing) xs.push(v);
  xs.push(x + w);
  const zs: number[] = [];
  for (let v = y; v < y + h - 1e-6; v += gg.spacing) zs.push(v);
  zs.push(y + h);
  for (const vx of xs) lines.seg('grid', mat, vx, yy, y, vx, yy, y + h);
  for (const vz of zs) lines.seg('grid', mat, x, yy, vz, x + w, yy, vz);
  return lines;
}
