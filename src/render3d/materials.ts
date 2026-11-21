/**
 * Material palette. Low detail uses MeshLambertMaterial (cheap diffuse), high
 * detail MeshStandardMaterial lit by a generated sky environment map. All
 * materials are cached in the ResourceLibrary per tier.
 */
import {
  Color,
  DoubleSide,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  type Material,
} from 'three';
import type { SurfacingMaterial } from '../engine/types';
import type { RenderConfig } from './config';
import type { ResourceLibrary } from './library';
import { chainLinkTexture, grassTexture, gravelTexture, stripeTexture } from './textures';

export type MatName =
  | 'steel'
  | 'steelDark'
  | 'concrete'
  | 'porcelain'
  | 'polymer'
  | 'tank'
  | 'tankDark'
  | 'aluminum'
  | 'busLive'
  | 'cable'
  | 'wood'
  | 'crossarm'
  | 'wall'
  | 'roof'
  | 'door'
  | 'cabinet'
  | 'black'
  | 'fiberglass'
  | 'yellow'
  | 'copper'
  | 'trunk'
  | 'leaf'
  | 'leaf2'
  | 'barn'
  | 'house'
  | 'galv'
  | 'asphalt';

interface MatDef {
  color: number;
  rough: number;
  metal: number;
  emissive?: number;
  emissiveIntensity?: number;
}

const DEFS: Record<MatName, MatDef> = {
  steel: { color: 0xb0b8bd, rough: 0.55, metal: 0.3 }, // hot-dip galvanized structural steel
  steelDark: { color: 0x707880, rough: 0.6, metal: 0.3 },
  concrete: { color: 0xbab5aa, rough: 0.95, metal: 0 },
  porcelain: { color: 0xe6e3da, rough: 0.3, metal: 0 },
  polymer: { color: 0x51575c, rough: 0.55, metal: 0 },
  tank: { color: 0xa4abaf, rough: 0.55, metal: 0.15 }, // ANSI 70 gray
  tankDark: { color: 0x80878b, rough: 0.6, metal: 0.15 },
  aluminum: { color: 0xd5d9dc, rough: 0.32, metal: 0.85 },
  busLive: { color: 0xdfe1e0, rough: 0.32, metal: 0.7, emissive: 0xffc24a, emissiveIntensity: 0.3 },
  cable: { color: 0x9aa0a5, rough: 0.45, metal: 0.6 },
  wood: { color: 0x6e5238, rough: 0.9, metal: 0 },
  crossarm: { color: 0x806548, rough: 0.9, metal: 0 },
  wall: { color: 0xdccba5, rough: 0.85, metal: 0 }, // beige prefab metal building
  roof: { color: 0x6c6862, rough: 0.55, metal: 0.35 },
  door: { color: 0x8e9498, rough: 0.6, metal: 0.3 },
  cabinet: { color: 0xbcc0c2, rough: 0.5, metal: 0.2 },
  black: { color: 0x2c2e30, rough: 0.7, metal: 0 },
  fiberglass: { color: 0x8c7b4c, rough: 0.6, metal: 0 },
  yellow: { color: 0xe7b622, rough: 0.6, metal: 0 },
  copper: { color: 0xb86a30, rough: 0.4, metal: 0.8 },
  trunk: { color: 0x5a4532, rough: 1, metal: 0 },
  leaf: { color: 0x51723a, rough: 1, metal: 0 },
  leaf2: { color: 0x3e5a2c, rough: 1, metal: 0 },
  barn: { color: 0x8e3d2f, rough: 0.9, metal: 0 },
  house: { color: 0xeae7de, rough: 0.9, metal: 0 },
  galv: { color: 0xc4cacd, rough: 0.45, metal: 0.4 },
  asphalt: { color: 0x4b4d4f, rough: 0.95, metal: 0 },
};

export function getMaterial(lib: ResourceLibrary, cfg: RenderConfig, name: MatName): Material {
  return lib.material(`${cfg.materials}:${name}`, () => {
    const d = DEFS[name];
    if (cfg.materials === 'lambert') {
      const m = new MeshLambertMaterial({ color: d.color });
      if (d.emissive !== undefined) {
        m.emissive = new Color(d.emissive);
        m.emissiveIntensity = d.emissiveIntensity ?? 1;
      }
      return m;
    }
    const m = new MeshStandardMaterial({ color: d.color, roughness: d.rough, metalness: d.metal });
    if (d.emissive !== undefined) {
      m.emissive = new Color(d.emissive);
      m.emissiveIntensity = d.emissiveIntensity ?? 1;
    }
    return m;
  });
}

export type SurfaceName = 'grass' | 'parcel' | SurfacingMaterial | 'drive' | 'field' | 'water' | 'easement';

const SURFACE_COLORS: Record<SurfaceName, number> = {
  grass: 0x6f8c4a,
  parcel: 0x7d9a55,
  crushed_rock: 0xaba59a,
  washed_granite: 0xc8c1b7,
  asphalt: 0x56585a,
  none: 0x7d9a55,
  drive: 0xa39b8c,
  field: 0xffffff,
  water: 0x5d7f95,
  easement: 0x5f7a45,
};

/** Ground-type surfaces; textured when cfg.textures is on. UVs are world metres / tile size. */
export function getSurfaceMaterial(lib: ResourceLibrary, cfg: RenderConfig, name: SurfaceName): Material {
  return lib.material(`${cfg.materials}:${cfg.textures ? 't' : 'f'}:surf:${name}`, (tex) => {
    const color = SURFACE_COLORS[name];
    let map = null;
    let tint = color;
    if (cfg.textures) {
      if (name === 'crushed_rock' || name === 'drive') {
        map = tex('gravel', gravelTexture);
        tint = name === 'drive' ? 0xe8e2d6 : 0xffffff;
      } else if (name === 'washed_granite') {
        map = tex('gravel', gravelTexture);
        tint = 0xf7f3ee;
      } else if (name === 'grass' || name === 'parcel' || name === 'none' || name === 'easement') {
        map = tex('grass', grassTexture);
      } else if (name === 'field') {
        map = tex('stripes', stripeTexture);
      }
    }
    const vertexColors = name === 'field';
    // Push the far ground layers back in depth so they never z-fight with what lies on them.
    const offset = name === 'grass' ? 4 : name === 'field' ? 2 : 0;
    const extra = offset ? { polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset * 2 } : {};
    if (cfg.materials === 'lambert') {
      return new MeshLambertMaterial({ color: tint, map, vertexColors, ...extra });
    }
    return new MeshStandardMaterial({
      color: tint,
      map,
      vertexColors,
      roughness: name === 'water' ? 0.4 : name === 'asphalt' ? 0.9 : 1,
      metalness: 0,
      ...extra,
    });
  });
}

/** Chain-link fabric: textured and alpha-blended at high detail, a flat translucent sheet at low. */
export function getFabricMaterial(lib: ResourceLibrary, cfg: RenderConfig): Material {
  return lib.material(`${cfg.materials}:${cfg.textures ? 't' : 'f'}:fabric`, (tex) => {
    const common = { side: DoubleSide, transparent: true, depthWrite: false } as const;
    if (cfg.textures) {
      const map = tex('chainlink', chainLinkTexture);
      return cfg.materials === 'lambert'
        ? new MeshLambertMaterial({ ...common, map, color: 0xffffff })
        : new MeshStandardMaterial({ ...common, map, color: 0xffffff, roughness: 0.6, metalness: 0.4 });
    }
    return new MeshLambertMaterial({ ...common, color: 0x9aa1a5, opacity: 0.28 });
  });
}

export type LineName = 'wire' | 'shield' | 'barbed' | 'grid' | 'select';

const LINE_COLORS: Record<LineName, number> = {
  wire: 0x3b3f43,
  shield: 0x596066,
  barbed: 0x6e767b,
  grid: 0xd9782c,
  select: 0xffcf1f,
};

export function getLineMaterial(lib: ResourceLibrary, name: LineName): LineBasicMaterial {
  return lib.material(`line:${name}`, () => {
    const m = new LineBasicMaterial({ color: LINE_COLORS[name] });
    if (name === 'select') {
      m.depthTest = false;
      m.transparent = true;
      m.opacity = 0.95;
    }
    if (name === 'grid') {
      m.transparent = true;
      m.opacity = 0.9;
    }
    return m;
  });
}

/** Translucent fill for the selection footprint. */
export function getSelectFillMaterial(lib: ResourceLibrary): MeshBasicMaterial {
  return lib.material(
    'select-fill',
    () => new MeshBasicMaterial({ color: 0xffcf1f, transparent: true, opacity: 0.28, depthWrite: false }),
  );
}

/** Multiplier applied to the instance colour of selected parts. */
export const SELECT_TINT = new Color(2.1, 1.6, 0.35);
