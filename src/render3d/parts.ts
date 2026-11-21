/**
 * Part builder used by every model. Primitives are emitted into the current
 * PartBatch in the current frame (an item's local frame or world), so model
 * code only deals with local coordinates and material names.
 */
import { Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import type { PartBatch } from './batch';
import type { RenderConfig } from './config';
import { shedGeometry, unitBox, unitCylinder, unitPrism, unitSphere, unitTorus } from './geometries';
import type { ResourceLibrary } from './library';
import { getMaterial, type MatName } from './materials';

export type V3 = [number, number, number];

const UP = new Vector3(0, 1, 0);
const cm = (v: number) => Math.max(1, Math.round(v * 100));
const mm5 = (v: number) => Math.max(1, Math.round(v * 200));

export class Parts {
  readonly hi: boolean;
  readonly segs: number;
  private batch: PartBatch | null = null;
  private owner: string | null = null;
  private readonly base = new Matrix4();
  private readonly local = new Matrix4();
  private readonly world = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();
  private readonly d = new Vector3();

  constructor(
    private readonly lib: ResourceLibrary,
    readonly cfg: RenderConfig,
  ) {
    this.hi = cfg.detail === 'high';
    this.segs = cfg.segments;
  }

  /** Send subsequent parts to `batch`, owned by `owner`, authored in frame `base` (default: world). */
  use(batch: PartBatch, owner: string | null, base?: Matrix4): void {
    this.batch = batch;
    this.owner = owner;
    if (base) this.base.copy(base);
    else this.base.identity();
  }

  private emit(geoKey: string, make: () => BufferGeometry, mat: MatName): void {
    if (!this.batch) return;
    const geo = this.lib.geometry(geoKey, make);
    const m = getMaterial(this.lib, this.cfg, mat);
    this.world.multiplyMatrices(this.base, this.local);
    this.batch.add(`${geoKey}|${mat}`, geo, m, this.world, this.owner);
  }

  /** Axis-aligned box between two corners. */
  box(mat: MatName, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void {
    this.p.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.s.set(Math.abs(x1 - x0) || 1e-3, Math.abs(y1 - y0) || 1e-3, Math.abs(z1 - z0) || 1e-3);
    this.q.identity();
    this.local.compose(this.p, this.q, this.s);
    this.emit('box', unitBox, mat);
  }

  /** Box centred on (cx, cy, cz), rotated about Y. */
  boxAt(mat: MatName, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, rotY = 0): void {
    this.p.set(cx, cy, cz);
    this.s.set(sx, sy, sz);
    this.q.setFromAxisAngle(UP, rotY);
    this.local.compose(this.p, this.q, this.s);
    this.emit('box', unitBox, mat);
  }

  /** Rectangular member from a to b with horizontal width w and vertical depth h. */
  beam(mat: MatName, ax: number, ay: number, az: number, bx: number, by: number, bz: number, w: number, h: number): void {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-6) return;
    const Xx = dx / len;
    const Xy = dy / len;
    const Xz = dz / len;
    let zx = -Xz;
    let zz = Xx;
    const zl = Math.hypot(zx, zz);
    if (zl < 1e-6) {
      zx = 0;
      zz = 1;
    } else {
      zx /= zl;
      zz /= zl;
    }
    // Y = Z x X keeps the basis right-handed.
    const Yx = -zz * Xy;
    const Yy = zz * Xx - zx * Xz;
    const Yz = zx * Xy;
    this.local.set(
      Xx * len, Yx * h, zx * w, (ax + bx) / 2,
      Xy * len, Yy * h, 0, (ay + by) / 2,
      Xz * len, Yz * h, zz * w, (az + bz) / 2,
      0, 0, 0, 1,
    );
    this.emit('box', unitBox, mat);
  }

  /** Cylinder of radius r from a to b. */
  cyl(mat: MatName, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, segs = this.segs): void {
    this.d.set(bx - ax, by - ay, bz - az);
    const len = this.d.length();
    if (len < 1e-6) return;
    this.q.setFromUnitVectors(UP, this.d.divideScalar(len));
    this.p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    this.s.set(r, len, r);
    this.local.compose(this.p, this.q, this.s);
    this.emit(`cyl${segs}`, () => unitCylinder(segs), mat);
  }

  /** Vertical cylinder. */
  vcyl(mat: MatName, x: number, z: number, y0: number, y1: number, r: number, segs = this.segs): void {
    this.p.set(x, (y0 + y1) / 2, z);
    this.s.set(r, Math.max(1e-3, y1 - y0), r);
    this.q.identity();
    this.local.compose(this.p, this.q, this.s);
    this.emit(`cyl${segs}`, () => unitCylinder(segs), mat);
  }

  /** Tapered cylinder from a (radius r0) to b (radius r1). */
  cone(mat: MatName, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r0: number, r1: number, segs = this.segs, rotY = 0): void {
    this.d.set(bx - ax, by - ay, bz - az);
    const len = this.d.length();
    if (len < 1e-6 || r0 <= 0) return;
    const ratio = Math.min(1, Math.max(0.05, Math.round((r1 / r0) * 20) / 20));
    this.q.setFromUnitVectors(UP, this.d.divideScalar(len));
    if (rotY !== 0) this.q.multiply(new Quaternion().setFromAxisAngle(UP, rotY));
    this.p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    this.s.set(r0, len, r0);
    this.local.compose(this.p, this.q, this.s);
    this.emit(`cone${segs}_${ratio}`, () => unitCylinder(segs, ratio), mat);
  }

  sphere(mat: MatName, x: number, y: number, z: number, r: number, sy = r): void {
    const detail = this.hi ? 1 : 0;
    this.p.set(x, y, z);
    this.s.set(r, sy, r);
    this.q.identity();
    this.local.compose(this.p, this.q, this.s);
    this.emit(`sph${detail}`, () => unitSphere(detail), mat);
  }

  /** Horizontal ring (grading/corona ring) of major radius R. */
  torus(mat: MatName, x: number, y: number, z: number, R: number, tube = 0.08): void {
    const t = Math.round(tube * 100) / 100;
    this.p.set(x, y, z);
    this.s.set(R, R, R);
    this.q.identity();
    this.local.compose(this.p, this.q, this.s);
    this.emit(`tor${t}_${this.hi ? 1 : 0}`, () => unitTorus(t, this.hi ? 6 : 4, this.hi ? 20 : 10), mat);
  }

  /** Gable roof prism centred on (cx, cz) with base at y0; ridge along the local X axis (after rotY). */
  prism(mat: MatName, cx: number, y0: number, cz: number, sx: number, rise: number, sz: number, rotY = 0): void {
    this.p.set(cx, y0, cz);
    this.s.set(sx, rise, sz);
    this.q.setFromAxisAngle(UP, rotY);
    this.local.compose(this.p, this.q, this.s);
    this.emit('prism', unitPrism, mat);
  }

  /**
   * Insulator body from a along unit direction (dx, dy, dz): core radius rc,
   * shed radius rs. Plain cylinder at low detail.
   */
  shed(mat: MatName, ax: number, ay: number, az: number, dx: number, dy: number, dz: number, len: number, rc: number, rs: number, sheds?: number, taper = 1): void {
    if (len <= 0.01) return;
    if (!this.hi) {
      const bx = ax + dx * len;
      const by = ay + dy * len;
      const bz = az + dz * len;
      if (taper < 0.95) this.cone(mat, ax, ay, az, bx, by, bz, rc * 1.45, rc * 1.45 * taper, 6);
      else this.cyl(mat, ax, ay, az, bx, by, bz, rc * 1.45, 6);
      return;
    }
    const L = cm(len) / 100;
    const c = mm5(rc) / 200;
    const s = mm5(rs) / 200;
    const n = sheds ?? Math.max(3, Math.round(L / 0.075));
    const t = Math.round(taper * 20) / 20;
    const key = `shed${cm(L)}_${mm5(c)}_${mm5(s)}_${n}_${t}`;
    this.d.set(dx, dy, dz).normalize();
    this.q.setFromUnitVectors(UP, this.d);
    this.p.set(ax, ay, az);
    this.s.set(1, 1, 1);
    this.local.compose(this.p, this.q, this.s);
    this.emit(key, () => shedGeometry(L, c, s, n, 10, t), mat);
  }

  /** Station post insulator standing on (x, y0, z) with overall height h. */
  post(x: number, y0: number, z: number, h: number, mat: MatName = 'porcelain'): void {
    const rc = 0.045 + 0.02 * h;
    const rs = rc * 2.15;
    if (!this.hi) {
      this.vcyl(mat, x, z, y0, y0 + h, rc * 1.45, 6);
      return;
    }
    const cap = Math.min(0.05, h * 0.12);
    this.vcyl('steel', x, z, y0, y0 + cap, rs * 0.8);
    this.shed(mat, x, y0 + cap, z, 0, 1, 0, h - 2 * cap, rc, rs);
    this.vcyl('steel', x, z, y0 + h - cap, y0 + h, rc * 1.25);
  }

  /** Apparatus bushing from base a along (dx, dy, dz); returns its terminal point. */
  bushing(ax: number, ay: number, az: number, dx: number, dy: number, dz: number, len: number, r: number, mat: MatName = 'porcelain'): V3 {
    const l = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / l;
    const uy = dy / l;
    const uz = dz / l;
    const body = Math.max(0.1, len - 0.1);
    this.shed(mat, ax, ay, az, ux, uy, uz, body, r, r * 1.75, Math.max(3, Math.round(body / 0.09)), 0.72);
    const tx = ax + ux * body;
    const ty = ay + uy * body;
    const tz = az + uz * body;
    this.cyl('aluminum', tx, ty, tz, tx + ux * 0.1, ty + uy * 0.1, tz + uz * 0.1, r * 0.55, this.hi ? 8 : 6);
    return [tx + ux * 0.1, ty + uy * 0.1, tz + uz * 0.1];
  }

  /** Flexible lead (cable) between two points, sagging by `sag` at mid-span at high detail. */
  lead(ax: number, ay: number, az: number, bx: number, by: number, bz: number, sag = 0, r = 0.018, mat: MatName = 'cable'): void {
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    if (len < 0.03) return;
    const n = this.hi && sag > 0.01 && len > 0.6 ? 4 : 1;
    let px = ax;
    let py = ay;
    let pz = az;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t - (n > 1 ? 4 * sag * t * (1 - t) : 0);
      const z = az + (bz - az) * t;
      this.cyl(mat, px, py, pz, x, y, z, r, this.hi ? 6 : 4);
      px = x;
      py = y;
      pz = z;
    }
  }
}
