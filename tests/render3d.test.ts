import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { ALL_KINDS, defaultProps } from '../src/engine/catalog';
import { localToWorld } from '../src/engine/geometry';
import { footprintOf, itemPorts, itemRect } from '../src/engine/items';
import { SAMPLE_LEVEL, sampleDesign } from '../src/engine/samples';
import { buildSceneModel } from '../src/engine/scene';
import type { PlacedItem, Rotation } from '../src/engine/types';
import { applyPreset, DEFAULT_GRAPHICS, PRESETS } from '../src/settings/graphics';
import { buildScene } from '../src/render3d/build';
import { needsNewRenderer, renderConfig, sceneKey, type RenderConfig } from '../src/render3d/config';
import { buildChains, offsetPolyline, type PortRef } from '../src/render3d/conductors';
import { itemMatrix, localDirToPlan, localToPlan } from '../src/render3d/coords';
import { ResourceLibrary } from '../src/render3d/library';
import { SHOWCASE_LEVEL, showcaseDesign } from '../src/render3d/showcase';

const low = applyPreset(DEFAULT_GRAPHICS, 'low');
const medium = applyPreset(DEFAULT_GRAPHICS, 'medium');
const high = applyPreset(DEFAULT_GRAPHICS, 'high');

describe('renderConfig', () => {
  it('Low is the cheap path', () => {
    const c = renderConfig(low, 1);
    expect(c.materials).toBe('lambert');
    expect(c.envMap).toBe(false);
    expect(c.shadows).toBe('off');
    expect(c.shadowMapSize).toBe(0);
    expect(c.antialias).toBe(false);
    expect(c.pixelRatio).toBeLessThanOrEqual(1);
    expect(renderConfig(low, 2).pixelRatio).toBeLessThanOrEqual(1);
    expect(c.detail).toBe('low');
    expect(c.segments).toBeLessThanOrEqual(6);
    expect(c.textures).toBe(false);
    expect(c.scenery).toBe(false);
    expect(c.animations).toBe(false);
    expect(c.frameIntervalMs).toBeCloseTo(1000 / 30);
  });

  it('High enables PBR, soft shadows and scenery, uncapped', () => {
    const c = renderConfig(high, 2);
    expect(c.materials).toBe('standard');
    expect(c.envMap).toBe(true);
    expect(c.shadows).toBe('high');
    expect(c.shadowMapSize).toBe(2048);
    expect(c.itemsReceiveShadows).toBe(true);
    expect(c.antialias).toBe(true);
    expect(c.pixelRatio).toBe(PRESETS.high.maxPixelRatio);
    expect(c.scenery).toBe(true);
    expect(c.frameIntervalMs).toBe(0);
    // The slow pulse never needs more than 20 fps.
    expect(c.animFrameIntervalMs).toBe(50);
  });

  it('Medium sits in between', () => {
    const c = renderConfig(medium, 2);
    expect(c.shadows).toBe('low');
    expect(c.shadowMapSize).toBe(1024);
    expect(c.itemsReceiveShadows).toBe(false);
    expect(c.pixelRatio).toBe(1.5);
    expect(c.frameIntervalMs).toBeCloseTo(1000 / 60);
  });

  it('reduceMotion turns off camera easing and the pulse', () => {
    const c = renderConfig({ ...high, reduceMotion: true });
    expect(c.damping).toBe(false);
    expect(c.pulse).toBe(false);
    expect(c.animations).toBe(true);
  });

  it('only antialias needs a new renderer; scene-affecting fields change the scene key', () => {
    const a = renderConfig(medium);
    expect(needsNewRenderer(a, renderConfig({ ...medium, antialias: false }))).toBe(true);
    expect(needsNewRenderer(a, renderConfig({ ...medium, shadows: 'high' }))).toBe(false);
    expect(sceneKey(a)).toBe(sceneKey(renderConfig({ ...medium, maxFps: 30, renderScale: 0.5 })));
    expect(sceneKey(a)).not.toBe(sceneKey(renderConfig({ ...medium, detail3d: 'low' })));
    expect(sceneKey(a)).not.toBe(sceneKey(renderConfig({ ...medium, scenery: false })));
    expect(sceneKey(a)).not.toBe(sceneKey(renderConfig({ ...medium, shadows: 'off' })));
  });
});

describe('coordinates', () => {
  it('item frames put every catalogue port exactly where the engine does, in all rotations', () => {
    for (const kind of ALL_KINDS) {
      const kv = kind === 'mast' || kind === 'control_house' ? 0 : kind === 'line_terminal' || kind === 'transformer' || kind === 'ccvt' || kind === 'wave_trap' || kind === 'circuit_switcher' || kind === 'mobile_pad' ? 69 : 12.47;
      for (const rot of [0, 1, 2, 3] as Rotation[]) {
        const it: PlacedItem = { id: 'X', kind, x: 3.5, y: 7, rot, kv, props: defaultProps(kind) };
        const fp = footprintOf(it);
        const placement = { rect: itemRect(it, fp), w: fp.w, d: fp.d, rot };
        const M = itemMatrix(placement);
        for (const port of itemPorts(it, fp)) {
          const local = fp.ports.find((p) => p.id === port.portId)!;
          const v = new Vector3(local.local.x, 1.5, local.local.y).applyMatrix4(M);
          expect(v.x).toBeCloseTo(port.pos.x, 9);
          expect(v.z).toBeCloseTo(port.pos.y, 9);
          expect(v.y).toBeCloseTo(1.5, 9);
          const p2 = localToPlan(placement, local.local.x, local.local.y);
          expect(p2.x).toBeCloseTo(port.pos.x, 9);
          expect(p2.y).toBeCloseTo(port.pos.y, 9);
          const dir = localDirToPlan(rot, local.dir.x, local.dir.y);
          expect(dir.x).toBeCloseTo(port.dir.x, 9);
          expect(dir.y).toBeCloseTo(port.dir.y, 9);
        }
        // Footprint corners map onto the rotated rect.
        const c = localToWorld({ x: fp.w, y: fp.d }, fp.w, fp.d, rot, it.x, it.y);
        const v = new Vector3(fp.w, 0, fp.d).applyMatrix4(M);
        expect(v.x).toBeCloseTo(c.x, 9);
        expect(v.z).toBeCloseTo(c.y, 9);
      }
    }
  });
});

describe('conductors', () => {
  it('offsets polylines with mitred corners', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
    ];
    const o = offsetPolyline(pts, false, 1);
    expect(o[0]).toEqual({ x: 0, y: 1 });
    // The corner point lies on the bisector, sqrt(2) away, so both offset runs meet.
    expect(o[1]!.x).toBeCloseTo(9);
    expect(o[1]!.y).toBeCloseTo(1);
    expect(o[2]!.x).toBeCloseTo(9);
    expect(o[2]!.y).toBeCloseTo(5);
    const closed = offsetPolyline([...pts, { x: 0, y: 5 }, { x: 0, y: 0 }], true, -1);
    expect(closed[0]!.x).toBeCloseTo(closed[closed.length - 1]!.x);
    expect(closed[0]!.y).toBeCloseTo(closed[closed.length - 1]!.y);
  });

  it('joins corners into continuous runs and lowers taps on the sample design', () => {
    const model = buildSceneModel(sampleDesign(), SAMPLE_LEVEL);
    const ports: PortRef[] = [];
    for (const it of model.items) {
      for (const p of footprintOf(it).ports) {
        ports.push({ itemId: it.id, portId: p.id, pos: localToPlan(it, p.local.x, p.local.y), dir: localDirToPlan(it.rot, p.dir.x, p.dir.y), terminals: null });
      }
    }
    const chains = buildChains(model, ports);
    const main = chains.find((c) => c.owners.includes('BUS'))!;
    expect(new Set(main.owners)).toEqual(new Set(['BUS', 'C10', 'C16']));
    expect(main.pts).toHaveLength(4);
    expect(main.drop).toBe(0);
    for (const tap of ['C5', 'C6', 'C12', 'C11', 'C17']) {
      const ch = chains.find((c) => c.owners.includes(tap))!;
      expect(ch.drop, tap).toBeGreaterThan(0.3);
      expect([ch.start.t, ch.end.t], tap).toContain('tee');
    }
    const c1 = chains.find((c) => c.owners.includes('C1'))!;
    expect(c1.start.t).toBe('port');
    expect(c1.end.t).toBe('port');
    // Every conductor is drawn exactly once.
    expect(chains.flatMap((c) => [...new Set(c.owners)]).sort()).toEqual(model.conductors.map((c) => c.id).sort());
  });
});

describe('buildScene (DOM-free paths)', () => {
  const noTextures = (s: typeof low): RenderConfig => ({ ...renderConfig(s), textures: false, envMap: false });

  for (const [name, cfg] of [
    ['low', renderConfig(low)],
    ['high detail', noTextures(high)],
  ] as const) {
    it(`builds and disposes the sample and the all-kinds showcase (${name})`, () => {
      const lib = new ResourceLibrary();
      for (const model of [buildSceneModel(sampleDesign(), SAMPLE_LEVEL), buildSceneModel(showcaseDesign(), SHOWCASE_LEVEL)]) {
        lib.begin();
        const built = buildScene(model, cfg, lib);
        lib.sweep();
        expect(built.proxies).toHaveLength(model.items.length);
        expect(built.pickMeshes.length).toBeGreaterThan(5);
        const fence = model.fence!.rect;
        expect(built.yard.min.x).toBeLessThanOrEqual(fence.x);
        expect(built.yard.max.z).toBeGreaterThanOrEqual(fence.y + fence.h);
        built.setSelection(new Set([model.items[0]!.id]));
        built.dispose();
      }
      lib.disposeAll();
      expect(lib.counts()).toEqual({ geometries: 0, materials: 0, textures: 0 });
    });
  }

  it('Low uses far fewer instanced parts than high detail', () => {
    const model = buildSceneModel(sampleDesign(), SAMPLE_LEVEL);
    const a = buildScene(model, renderConfig(low), new ResourceLibrary());
    const b = buildScene(model, noTextures(high), new ResourceLibrary());
    expect(a.stats.instancedMeshes).toBeLessThan(b.stats.instancedMeshes);
    expect(a.stats.instances * 2).toBeLessThan(b.stats.instances);
  });

  it('copes with an empty design', () => {
    const d = sampleDesign();
    const model = buildSceneModel({ ...d, items: [], conductors: [], fence: null, shieldWires: [] }, SAMPLE_LEVEL);
    const built = buildScene(model, renderConfig(low), new ResourceLibrary());
    expect(built.yard.isEmpty()).toBe(false);
    built.dispose();
  });

  it('reuses cached geometry when the same design is rebuilt', () => {
    const lib = new ResourceLibrary();
    const model = buildSceneModel(sampleDesign(), SAMPLE_LEVEL);
    const cfg = renderConfig(low);
    lib.begin();
    buildScene(model, cfg, lib).dispose();
    lib.sweep();
    const first = lib.counts();
    for (let i = 0; i < 5; i++) {
      lib.begin();
      buildScene(model, cfg, lib).dispose();
      lib.sweep();
    }
    expect(lib.counts()).toEqual(first);
  });
});
