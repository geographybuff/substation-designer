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
import { buildChains, junctionClearance, junctionZones, MIN_GAP, offsetPolyline, planSupports, PORT_INSET, type Chain, type PortRef } from '../src/render3d/conductors';
import { CAMPAIGN } from '../src/levels';
import { SOLUTIONS } from '../src/levels/solutions';
import { setSiteAltitude } from '../src/engine/site';
import { scenario } from './dev/scenarios';
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
    // Runs are split where taps land, so count corners rather than vertices.
    const corners = main.pts.filter((b, i) => {
      if (i === 0 || i === main.pts.length - 1) return false;
      const a = main.pts[i - 1]!;
      const c = main.pts[i + 1]!;
      return Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) > 1e-6;
    });
    expect(corners).toHaveLength(2);
    expect(main.drop).toBe(0);
    for (const tap of ['C5', 'C6', 'C12', 'C11', 'C17']) {
      const ch = chains.find((c) => c.owners.includes(tap))!;
      expect(ch.drop, tap).toBeGreaterThan(0.3);
      expect([ch.start.t, ch.end.t], tap).toContain('tee');
    }
    const c1 = chains.find((c) => c.owners.includes('C1'))!;
    expect(c1.start.t).toBe('port');
    expect(c1.end.t).toBe('port');
    // Every conductor is drawn, and nothing else.
    expect([...new Set(chains.flatMap((c) => c.owners))].sort()).toEqual(model.conductors.map((c) => c.id).sort());
  });

  it('draws a junction the same way whatever order its buses were drawn in', () => {
    // A four-way junction at (10, 10): the vertical run is longer, so it is the main run.
    const c = (id: string, ...pts: Array<[number, number]>) => ({ id, points: pts.map(([x, y]) => ({ x, y })), height: 4, phaseSpacing: 0.6, kv: 12.47, elevation: 'low' as const, energized: false });
    const layouts = {
      verticalThrough: [c('V', [10, 0], [10, 20]), c('W', [4, 10], [10, 10]), c('E', [10, 10], [14, 10])],
      horizontalThrough: [c('H', [4, 10], [14, 10]), c('N', [10, 0], [10, 10]), c('S', [10, 10], [10, 20])],
      cornerAndTaps: [c('L', [4, 10], [10, 10], [10, 0]), c('S', [10, 10], [10, 20]), c('E', [10, 10], [14, 10])],
    };
    const shape = (conds: ReturnType<typeof c>[]) =>
      buildChains({ conductors: conds }, [])
        .map((ch) => {
          const xs = ch.pts.map((p) => p.x);
          const ys = ch.pts.map((p) => p.y);
          return `${Math.min(...xs)},${Math.min(...ys)}-${Math.max(...xs)},${Math.max(...ys)} drop=${ch.drop.toFixed(2)} cross=${ch.crossings.length}`;
        })
        .sort();
    const ref = shape(layouts.verticalThrough);
    expect(ref).toEqual(['10,0-10,20 drop=0.00 cross=0', '4,10-14,10 drop=0.61 cross=1']);
    expect(shape(layouts.horizontalThrough)).toEqual(ref);
    expect(shape(layouts.cornerAndTaps)).toEqual(ref);
  });
});

describe('bus supports', () => {
  const portsOf = (model: ReturnType<typeof buildSceneModel>): PortRef[] =>
    model.items.flatMap((it) => footprintOf(it).ports.map((p) => ({ itemId: it.id, portId: p.id, pos: localToPlan(it, p.local.x, p.local.y), dir: localDirToPlan(it.rot, p.dir.x, p.dir.y), terminals: null })));
  const c = (id: string, ...pts: Array<[number, number]>) => ({ id, points: pts.map(([x, y]) => ({ x, y })), height: 4, phaseSpacing: 0.6, kv: 12.47, elevation: 'low' as const, energized: false });
  const runLen = (ch: Chain) => ch.pts.reduce((l, p, i) => (i ? l + Math.hypot(p.x - ch.pts[i - 1]!.x, p.y - ch.pts[i - 1]!.y) : 0), 0);

  it('frame a four-way junction symmetrically on the run above and the run beneath', () => {
    const chains = buildChains({ conductors: [c('V', [10, 0], [10, 20]), c('W', [4, 10], [10, 10]), c('E', [10, 10], [17, 10])] }, []);
    const sup = planSupports(chains);
    const d = junctionClearance(0.6);
    for (const [idx, ch] of chains.entries()) {
      const pts = sup.filter((s) => s.chain === idx).map((s) => s.pts3[1]!);
      const dists = pts.map((p) => Math.hypot(p.x - 10, p.y - 10));
      const near = dists.filter((x) => x < d + 0.5).sort((a, b) => a - b);
      expect(near, `run ${ch.owners.join('+')}`).toHaveLength(2);
      expect(near[0]).toBeCloseTo(d, 6);
      expect(near[1]).toBeCloseTo(d, 6);
      // One on each side of the junction.
      const sides = pts.filter((_, i) => dists[i]! < d + 0.5).map((p) => Math.sign(p.x - 10 + p.y - 10));
      expect(new Set(sides).size).toBe(2);
    }
  });

  it('never leave a bus between two pieces of equipment floating, however short', () => {
    const ports: PortRef[] = [
      { itemId: 'T1', portId: 'lv', pos: { x: 20, y: 21 }, dir: { x: 1, y: 0 }, terminals: null },
      { itemId: 'RG1', portId: 'a', pos: { x: 22, y: 21 }, dir: { x: -1, y: 0 }, terminals: null },
    ];
    const chains = buildChains({ conductors: [c('L1', [20, 21], [22, 21])] }, ports);
    expect([chains[0]!.start.t, chains[0]!.end.t]).toEqual(['port', 'port']);
    const sup = planSupports(chains);
    expect(sup.length).toBeGreaterThanOrEqual(1);
    // A longer one gets a support just behind each terminal.
    const ports2 = [ports[0]!, { ...ports[1]!, pos: { x: 25, y: 21 } }];
    const sup2 = planSupports(buildChains({ conductors: [c('L1', [20, 21], [25, 21])] }, ports2)).map((s) => s.pts3[1]!.x).sort((a, b) => a - b);
    expect(sup2[0]).toBeCloseTo(20 + PORT_INSET, 6);
    expect(sup2[sup2.length - 1]).toBeCloseTo(25 - PORT_INSET, 6);
  });

  const designs: Array<[string, () => { design: Parameters<typeof buildSceneModel>[0]; level: Parameters<typeof buildSceneModel>[1] }]> = [
    ...CAMPAIGN.map((l) => [`solution ${l.id}`, () => (setSiteAltitude(l.site.altitudeM), { design: SOLUTIONS[l.id]!(), level: l })] as [string, () => never]),
    ...['vthrough', 'hthrough', 'corner', 'sideentry'].map((v) => [`scenario ${v}`, () => scenario(v)] as [string, () => never]),
    ['sample design', () => ({ design: sampleDesign(), level: SAMPLE_LEVEL })],
  ];
  for (const [name, make] of designs) {
    it(`hold up every bus run in the ${name}`, () => {
      const { design, level } = make();
      const model = buildSceneModel(design, level);
      const chains = buildChains(model, portsOf(model));
      const sup = planSupports(chains);
      const zones = junctionZones(chains);
      chains.forEach((ch, idx) => {
        const mine = sup.filter((s) => s.chain === idx).map((s) => s.s).sort((a, b) => a - b);
        const L = runLen(ch);
        const label = `${ch.owners.join('+')} (${L.toFixed(1)} m)`;
        const blocked = (s: number) => zones[idx]!.all.some((k) => Math.abs(s - k.s) < k.d);
        // Only a short link between two other runs may rely on its risers alone.
        if (!(ch.start.t === 'tee' && ch.end.t === 'tee')) expect(mine.length, label).toBeGreaterThan(0);
        // No span over 6 m, unless junction clearances leave nowhere in it for a post to stand.
        for (let i = 0; i + 1 < mine.length; i++) {
          if (mine[i + 1]! - mine[i]! <= 6 + 1e-6) continue;
          for (let s = mine[i]! + 0.5; s < mine[i + 1]! - 0.5; s += 0.1) expect(blocked(s), `${label}: span ${mine[i]!.toFixed(2)}–${mine[i + 1]!.toFixed(2)} could take a post at ${s.toFixed(2)}`).toBe(true);
        }
        // A bus ending at equipment has a post just behind that end (or one post mid-way on a bus of up to
        // 3 m between two devices, or a junction post within MIN_GAP), unless a junction there leaves no room.
        const reach = ch.start.t === 'port' && ch.end.t === 'port' && L <= 3 + 1e-6 ? L / 2 + 1e-6 : PORT_INSET + MIN_GAP;
        if (ch.start.t === 'port' && !blocked(PORT_INSET / 2)) expect(mine[0]!, label).toBeLessThanOrEqual(reach);
        if (ch.end.t === 'port' && !blocked(L - PORT_INSET / 2)) expect(L - mine[mine.length - 1]!, label).toBeLessThanOrEqual(reach);
        // No post inside a junction clearance, except at a corner or free end, or as a run's only post (behind a device terminal).
        const corner = (s: number) => sup.some((p) => p.chain === idx && Math.abs(p.s - s) < 1e-6) && ch.pts.some((_, i) => i > 0 && i < ch.pts.length - 1 && Math.abs(runLen({ ...ch, pts: ch.pts.slice(0, i + 1) }) - s) < 1e-6);
        const freeEnd = (s: number) => (ch.start.t === 'free' && s < 1e-6) || (ch.end.t === 'free' && s > L - 1e-6);
        if (mine.length > 1) for (const s of mine) if (!corner(s) && !freeEnd(s)) expect(zones[idx]!.all.some((k) => Math.abs(s - k.s) < k.d - 1e-6), `${label}: post at ${s.toFixed(2)} inside a junction clearance`).toBe(false);
      });
    });
  }
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
