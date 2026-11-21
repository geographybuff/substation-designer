/**
 * Cache of GPU-backed resources (geometries, materials, textures) shared
 * between scene builds. Each build calls begin(), fetches what it needs (which
 * marks it as used) and then sweep() disposes everything the new build did not
 * touch, so rebuilding the same design reuses every buffer and rebuilding a
 * different one frees what is no longer needed.
 */
import type { BufferGeometry, Material, Texture } from 'three';

interface Entry<T> {
  res: T;
  used: number;
  deps: string[];
}

export type TextureGetter = (key: string, make: () => Texture) => Texture;

export class ResourceLibrary {
  private readonly geos = new Map<string, Entry<BufferGeometry>>();
  private readonly mats = new Map<string, Entry<Material>>();
  private readonly texs = new Map<string, Entry<Texture>>();
  private gen = 0;

  begin(): void {
    this.gen++;
  }

  geometry(key: string, make: () => BufferGeometry): BufferGeometry {
    let e = this.geos.get(key);
    if (!e) {
      e = { res: make(), used: this.gen, deps: [] };
      this.geos.set(key, e);
    } else e.used = this.gen;
    return e.res;
  }

  texture(key: string, make: () => Texture): Texture {
    let e = this.texs.get(key);
    if (!e) {
      e = { res: make(), used: this.gen, deps: [] };
      this.texs.set(key, e);
    } else e.used = this.gen;
    return e.res;
  }

  /** Materials record the textures they were created with so those stay alive with them. */
  material<T extends Material>(key: string, make: (tex: TextureGetter) => T): T {
    let e = this.mats.get(key);
    if (!e) {
      const deps: string[] = [];
      const res = make((k, mk) => {
        deps.push(k);
        return this.texture(k, mk);
      });
      e = { res, used: this.gen, deps };
      this.mats.set(key, e);
    } else {
      e.used = this.gen;
      for (const d of e.deps) {
        const t = this.texs.get(d);
        if (t) t.used = this.gen;
      }
    }
    return e.res as T;
  }

  /** Flag every cached material for recompilation (e.g. after the shadow setup changed). */
  invalidateMaterials(): void {
    for (const e of this.mats.values()) e.res.needsUpdate = true;
  }

  /** Dispose resources not used since the last begin(). */
  sweep(): void {
    for (const map of [this.geos, this.mats, this.texs] as Array<Map<string, Entry<{ dispose(): void }>>>) {
      for (const [k, e] of map) {
        if (e.used !== this.gen) {
          e.res.dispose();
          map.delete(k);
        }
      }
    }
  }

  disposeAll(): void {
    for (const map of [this.geos, this.mats, this.texs] as Array<Map<string, Entry<{ dispose(): void }>>>) {
      for (const e of map.values()) e.res.dispose();
      map.clear();
    }
  }

  /** Drop every entry without disposing (after a lost context, the GPU objects are already gone). */
  forgetAll(): void {
    this.geos.clear();
    this.mats.clear();
    this.texs.clear();
  }

  counts(): { geometries: number; materials: number; textures: number } {
    return { geometries: this.geos.size, materials: this.mats.size, textures: this.texs.size };
  }
}
