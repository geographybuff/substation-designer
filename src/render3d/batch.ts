/**
 * Batching. Every model part is a cached geometry + cached material + matrix;
 * parts sharing geometry and material become one InstancedMesh, so the number
 * of draw calls depends on the variety of part types, not on the number of
 * items in the yard. Lines (wires, barbed wire, ground grid) are merged per
 * material into LineSegments.
 */
import {
  BufferGeometry,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedMesh,
  LineSegments,
  type Color,
  type LineBasicMaterial,
  type Material,
  type Matrix4,
  type Object3D,
} from 'three';

interface Group {
  geo: BufferGeometry;
  mat: Material;
  matrices: number[];
  owners: Array<string | null>;
}

export interface BatchMesh extends InstancedMesh {
  userData: { owners: Array<string | null> };
}

export class PartBatch {
  private readonly groups = new Map<string, Group>();

  constructor(
    readonly cast: boolean,
    readonly receive: boolean,
    /** Pickable batches carry per-instance colours (selection tint) and owner ids. */
    readonly pickable: boolean,
  ) {}

  add(key: string, geo: BufferGeometry, mat: Material, m: Matrix4, owner: string | null): void {
    let g = this.groups.get(key);
    if (!g) {
      g = { geo, mat, matrices: [], owners: [] };
      this.groups.set(key, g);
    }
    const e = m.elements;
    for (let i = 0; i < 16; i++) g.matrices.push(e[i]!);
    g.owners.push(owner);
  }

  /** Create the instanced meshes under `parent`. Caller disposes them (InstancedMesh.dispose). */
  build(parent: Object3D): BatchMesh[] {
    const out: BatchMesh[] = [];
    for (const g of this.groups.values()) {
      const n = g.owners.length;
      if (n === 0) continue;
      const mesh = new InstancedMesh(g.geo, g.mat, n) as BatchMesh;
      mesh.instanceMatrix.array.set(g.matrices);
      mesh.instanceMatrix.needsUpdate = true;
      if (this.pickable) {
        mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
      }
      mesh.userData = { owners: g.owners };
      mesh.castShadow = this.cast;
      mesh.receiveShadow = this.receive;
      mesh.matrixAutoUpdate = false;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      parent.add(mesh);
      out.push(mesh);
    }
    this.groups.clear();
    return out;
  }
}

/** Tint the instances owned by any of `ids`; everything else back to white. */
export function applyTint(meshes: readonly BatchMesh[], ids: ReadonlySet<string>, tint: Color): void {
  for (const mesh of meshes) {
    const attr = mesh.instanceColor;
    if (!attr) continue;
    const arr = attr.array as Float32Array;
    const owners = mesh.userData.owners;
    let changed = false;
    for (let i = 0; i < owners.length; i++) {
      const o = owners[i];
      const sel = o !== null && o !== undefined && ids.has(o);
      const r = sel ? tint.r : 1;
      const g = sel ? tint.g : 1;
      const b = sel ? tint.b : 1;
      const j = i * 3;
      if (arr[j] !== r || arr[j + 1] !== g || arr[j + 2] !== b) {
        arr[j] = r;
        arr[j + 1] = g;
        arr[j + 2] = b;
        changed = true;
      }
    }
    if (changed) attr.needsUpdate = true;
  }
}

export class LineBatch {
  private readonly sets = new Map<string, { mat: LineBasicMaterial; pos: number[] }>();

  private set(key: string, mat: LineBasicMaterial): number[] {
    let s = this.sets.get(key);
    if (!s) {
      s = { mat, pos: [] };
      this.sets.set(key, s);
    }
    return s.pos;
  }

  seg(key: string, mat: LineBasicMaterial, ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
    this.set(key, mat).push(ax, ay, az, bx, by, bz);
  }

  /** Polyline from a flat [x, y, z, x, y, z, ...] array. */
  polyline(key: string, mat: LineBasicMaterial, pts: readonly number[]): void {
    const p = this.set(key, mat);
    for (let i = 0; i + 5 < pts.length; i += 3) {
      p.push(pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!, pts[i + 4]!, pts[i + 5]!);
    }
  }

  /** Create one LineSegments per key under `parent`; the caller disposes their geometries. */
  build(parent: Object3D): Map<string, LineSegments> {
    const out = new Map<string, LineSegments>();
    for (const [key, s] of this.sets) {
      if (s.pos.length === 0) continue;
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(s.pos, 3));
      geo.computeBoundingSphere();
      const line = new LineSegments(geo, s.mat);
      line.matrixAutoUpdate = false;
      parent.add(line);
      out.set(key, line);
    }
    this.sets.clear();
    return out;
  }
}
