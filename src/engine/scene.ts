/**
 * Renderer-neutral description of a design, consumed by the 3D view.
 * Plan coordinates (x east, y south) and heights in metres.
 */
import { busHeight, CATALOG } from './catalog';
import { voltageClassFor } from '../data/bulletin/voltageClasses';
import { footprintOf, itemRect } from './items';
import type { ConductorElevation, Design, ItemKind, LevelDef, Props, Rect, Rotation, SurfacingMaterial, Vec2, Vec3 } from './types';

export interface SceneItem {
  id: string;
  kind: ItemKind;
  /** World rectangle (already rotated). */
  rect: Rect;
  /** Unrotated footprint size: w along the local x (power-flow) axis, d across the phases. */
  w: number;
  d: number;
  rot: Rotation;
  /** Rated voltage (kV); 0 for non-electrical. For transformers, HV rating. */
  kv: number;
  /** For transformers/mobile pads: LV rating (kV). */
  lvKV?: number;
  /** Centre-to-centre phase spacing to draw (m), 0 when not applicable. */
  phaseSpacing: number;
  liveHeight: number;
  height: number;
  props: Props;
  label: string;
  energized: boolean;
}

export interface SceneConductor {
  id: string;
  points: Vec2[];
  height: number;
  phaseSpacing: number;
  kv: number;
  elevation: ConductorElevation;
  energized: boolean;
}

export interface SceneModel {
  site: { width: number; depth: number; noBuild: Array<Rect & { label: string }> };
  surfacing: { material: SurfacingMaterial; rect: Rect | null };
  fence: { rect: Rect; height: number; gate: { side: 'N' | 'S' | 'E' | 'W'; offset: number; width: number } } | null;
  items: SceneItem[];
  conductors: SceneConductor[];
  shieldWires: Array<{ id: string; a: Vec3; b: Vec3 }>;
  groundGrid: { rect: Rect; spacing: number } | null;
}

/** Fence height used for rendering: 2.13 m (7 ft) fabric + 0.3 m barbed-wire extension. */
export const FENCE_HEIGHT_M = 2.44;

export function buildSceneModel(design: Design, level: LevelDef, energizedNodeIds?: (id: string) => boolean): SceneModel {
  const isOn = energizedNodeIds ?? (() => false);
  const items: SceneItem[] = design.items.map((it) => {
    const fp = footprintOf(it);
    const rect = itemRect(it, fp);
    const def = CATALOG[it.kind];
    const phaseSpacing = it.kv > 0 ? voltageClassFor(it.kv).rigidBusPhaseSpacingM : 0;
    return {
      id: it.id,
      kind: it.kind,
      rect,
      w: fp.w,
      d: fp.d,
      rot: it.rot,
      kv: it.kv,
      lvKV: typeof it.props.lvKV === 'number' ? it.props.lvKV : undefined,
      phaseSpacing,
      liveHeight: fp.liveHeight,
      height: fp.height,
      props: it.props,
      label: it.label ?? def.tag,
      energized: isOn(it.id),
    };
  });
  const conductors: SceneConductor[] = design.conductors.map((c) => ({
    id: c.id,
    points: c.points,
    height: busHeight(c.kv, c.elevation),
    phaseSpacing: voltageClassFor(c.kv).rigidBusPhaseSpacingM,
    kv: c.kv,
    elevation: c.elevation,
    energized: isOn(c.id),
  }));
  const mastById = new Map(design.items.filter((i) => i.kind === 'mast').map((m) => [m.id, m]));
  const shieldWires = design.shieldWires.flatMap((sw) => {
    const a = mastById.get(sw.a);
    const b = mastById.get(sw.b);
    if (!a || !b) return [];
    const ra = itemRect(a);
    const rb = itemRect(b);
    return [
      {
        id: sw.id,
        a: { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2, z: Number(a.props.heightM) || 18 },
        b: { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2, z: Number(b.props.heightM) || 18 },
      },
    ];
  });
  const fence = design.fence;
  let groundGrid: SceneModel['groundGrid'] = null;
  if (fence && design.groundGrid.enabled) {
    const e = design.groundGrid.extendBeyondFenceM;
    groundGrid = {
      rect: { x: fence.rect.x - e, y: fence.rect.y - e, w: fence.rect.w + 2 * e, h: fence.rect.h + 2 * e },
      spacing: design.groundGrid.spacingM,
    };
  }
  const surfRect = fence
    ? { x: fence.rect.x - 1, y: fence.rect.y - 1, w: fence.rect.w + 2, h: fence.rect.h + 2 }
    : null;
  return {
    site: { width: level.site.width, depth: level.site.depth, noBuild: level.site.noBuild ?? [] },
    surfacing: { material: design.surfacing.material, rect: design.surfacing.material === 'none' ? null : surfRect },
    fence: fence ? { rect: fence.rect, height: FENCE_HEIGHT_M, gate: fence.gate } : null,
    items,
    conductors,
    shieldWires,
    groundGrid,
  };
}
