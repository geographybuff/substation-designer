/**
 * Turns a SceneModel into a three.js group for the current RenderConfig.
 * Everything created here that owns GPU buffers is tracked and released by
 * BuiltScene.dispose(); shared geometries/materials live in the library.
 */
import { Box3, Group, LineSegments, Mesh, Vector3, type Material, type Object3D } from 'three';
import { CATALOG } from '../engine/catalog';
import type { SceneItem, SceneModel } from '../engine/scene';
import type { Vec2 } from '../engine/types';
import { applyTint, LineBatch, PartBatch, type BatchMesh } from './batch';
import type { RenderConfig } from './config';
import { buildConductors, buildShieldWires, type PortRef } from './conductors';
import { itemMatrix, localDirToPlan, localToPlan } from './coords';
import { unitBoxEdges } from './geometries';
import type { ResourceLibrary } from './library';
import { getLineMaterial, getMaterial, getSelectFillMaterial, SELECT_TINT } from './materials';
import { fallbackModel, itemInfo, MODELS, type ModelOut } from './models';
import { buildOffsite, type OffsiteDef } from './offsite';
import { Parts } from './parts';
import { buildScenery } from './scenery';
import { buildFence, buildGround, buildGroundGrid, quadGeometry, type Disposer } from './site';

export interface BuiltScene {
  root: Group;
  /** Ground grid overlay (toggle with .visible). */
  grid: Object3D | null;
  /** Bounds of the yard (fence, equipment, masts) for camera framing and the shadow camera. */
  yard: Box3;
  pickMeshes: BatchMesh[];
  proxies: Array<{ id: string; box: Box3 }>;
  itemIds: Set<string>;
  /** Material of energized conductors (animated), if any. */
  liveMaterial: Material | null;
  stats: { instancedMeshes: number; instances: number };
  setSelection(ids: ReadonlySet<string>): void;
  dispose(): void;
}

interface PortDefLite {
  id: string;
  local: Vec2;
  dir: Vec2;
}

function portDefs(it: SceneItem): PortDefLite[] {
  try {
    return CATALOG[it.kind].footprint(it.kv, it.props).ports;
  } catch {
    return [];
  }
}

export function buildScene(model: SceneModel, cfg: RenderConfig, lib: ResourceLibrary): BuiltScene {
  const root = new Group();
  root.name = 'substation';
  root.matrixAutoUpdate = false;
  const disposers: Disposer[] = [];
  const hi = cfg.detail === 'high';
  // Equipment, bus and fence share one batch (shared part types share draw calls);
  // scenery is kept separate so it never renders into the shadow map.
  const itemBatch = new PartBatch(true, cfg.itemsReceiveShadows, true);
  const sceneryBatch = new PartBatch(false, false, false);
  const lines = new LineBatch();
  const p = new Parts(lib, cfg);
  const wireMat = getLineMaterial(lib, 'wire');

  // Equipment.
  const ports: PortRef[] = [];
  const offsite: OffsiteDef[] = [];
  const proxies: Array<{ id: string; box: Box3 }> = [];
  const itemIds = new Set<string>();
  const yard = new Box3();
  const v = new Vector3();
  for (const it of model.items) {
    itemIds.add(it.id);
    const M = itemMatrix(it);
    p.use(itemBatch, it.id, M);
    const info = itemInfo(it, hi);
    let out: ModelOut;
    try {
      out = MODELS[it.kind](p, info);
    } catch (e) {
      console.warn(`3D model for ${it.kind} ${it.id} failed`, e);
      out = fallbackModel(p, info);
    }
    const box = new Box3(new Vector3(it.rect.x, 0, it.rect.y), new Vector3(it.rect.x + it.rect.w, Math.max(0.5, it.height), it.rect.y + it.rect.h));
    proxies.push({ id: it.id, box });
    yard.union(box);
    for (const pd of portDefs(it)) {
      const local = out.terminals[pd.id as keyof ModelOut['terminals']];
      ports.push({
        itemId: it.id,
        portId: pd.id,
        pos: localToPlan(it, pd.local.x, pd.local.y),
        dir: localDirToPlan(it.rot, pd.dir.x, pd.dir.y),
        terminals: local ? local.map(([x, y, z]) => new Vector3(x, y, z).applyMatrix4(M)) : null,
      });
    }
    if (out.offsite) {
      const d = localDirToPlan(it.rot, out.offsite.dir[0], out.offsite.dir[1]);
      offsite.push({
        owner: it.id,
        kind: out.offsite.kind,
        dir: d,
        attach: out.offsite.attach.map(([x, y, z]) => v.set(x, y, z).applyMatrix4(M).clone()),
      });
    }
  }

  // Conductors, shield wires, lines leaving the site.
  const { hasLive } = buildConductors(p, itemBatch, model, ports, cfg.animations);
  buildShieldWires(lines, getLineMaterial(lib, 'shield'), model, hi);
  const corridors = buildOffsite(p, itemBatch, lines, wireMat, model, offsite, cfg.scenery);

  // Site and surroundings.
  if (model.fence) {
    const fr = model.fence.rect;
    yard.union(new Box3(new Vector3(fr.x, 0, fr.y), new Vector3(fr.x + fr.w, model.fence.height, fr.y + fr.h)));
  }
  if (yard.isEmpty()) yard.set(new Vector3(0, 0, 0), new Vector3(model.site.width, 3, model.site.depth));
  buildGround(root, disposers, lib, cfg, model);
  buildFence(p, itemBatch, lines, root, disposers, lib, cfg, model);
  if (cfg.scenery) buildScenery(p, sceneryBatch, lines, root, disposers, lib, cfg, model, corridors);

  const pickMeshes = itemBatch.build(root);
  const sceneryMeshes = sceneryBatch.build(root);
  const lineObjs = lines.build(root);
  for (const l of lineObjs.values()) disposers.push(l.geometry);

  let grid: Object3D | null = null;
  const gridLines = buildGroundGrid(lib, model);
  if (gridLines) {
    const g = new Group();
    g.name = 'ground-grid';
    g.matrixAutoUpdate = false;
    for (const l of gridLines.build(g).values()) {
      l.renderOrder = 2;
      disposers.push(l.geometry);
    }
    root.add(g);
    grid = g;
  }

  const instanced = [...pickMeshes, ...sceneryMeshes];
  const liveMaterial = hasLive ? getMaterial(lib, cfg, 'busLive') : null;

  // Selection overlay: shared unit geometries, scaled per selected item.
  const edges = lib.geometry('select-edges', unitBoxEdges);
  const fillGeo = lib.geometry('select-quad', () => quadGeometry(-0.5, -0.5, 0.5, 0.5, 0, 1));
  const selectLine = getLineMaterial(lib, 'select');
  const selectFill = getSelectFillMaterial(lib);
  const overlay = new Group();
  overlay.name = 'selection';
  root.add(overlay);

  return {
    root,
    grid,
    yard,
    pickMeshes,
    proxies,
    itemIds,
    liveMaterial,
    stats: { instancedMeshes: instanced.length, instances: instanced.reduce((n, m) => n + m.count, 0) },
    setSelection(ids) {
      applyTint(pickMeshes, ids, SELECT_TINT);
      overlay.clear();
      for (const pr of proxies) {
        if (!ids.has(pr.id)) continue;
        const size = pr.box.getSize(new Vector3());
        const c = pr.box.getCenter(new Vector3());
        const line = new LineSegments(edges, selectLine);
        line.position.copy(c);
        line.scale.set(size.x + 0.2, size.y + 0.2, size.z + 0.2);
        line.renderOrder = 10;
        overlay.add(line);
        const fill = new Mesh(fillGeo, selectFill);
        fill.position.set(c.x, 0.09, c.z);
        fill.scale.set(size.x + 0.2, 1, size.z + 0.2);
        fill.renderOrder = 9;
        overlay.add(fill);
      }
    },
    dispose() {
      for (const m of instanced) m.dispose();
      for (const d of disposers) d.dispose();
      overlay.clear();
      root.clear();
    },
  };
}
