/**
 * Dev harness for the 3D view (served by Vite at /view3d-harness.html).
 * Renders the sample design full-window with quality preset buttons and a
 * stats readout. Also exposes window.__harness for automated checks.
 *
 * URL parameters: preset=low|medium|high, design=showcase (every item kind
 * and rotation), grid=1, sel=ID,ID, live=1, focus=ITEM_ID (close-up camera),
 * look=x,y,z (orbit target), az=deg, el=deg, dist=m, scenario=/module.ts&v=name (a dev module exporting
 * scenario(v) => { design, level }, e.g. tests/dev/scenarios.ts).
 */
import { buildSceneModel } from '../engine/scene';
import type { Design, LevelDef } from '../engine/types';
import { SAMPLE_LEVEL, sampleDesign } from '../engine/samples';
import { applyPreset, DEFAULT_GRAPHICS, type GraphicsSettings } from '../settings/graphics';
import { createView3D, type SubstationView } from './index';
import { SHOWCASE_LEVEL, showcaseDesign } from './showcase';

type Preset = 'low' | 'medium' | 'high';

// Count live WebGL objects per context so the leak test can see buffers the
// renderer does not report (objects of a lost context are freed with it).
type GLCounts = { buffers: number; textures: number; programs: number; vaos: number; renderbuffers: number; framebuffers: number };
const glCounts = new Map<unknown, GLCounts>();
const countsFor = (ctx: unknown): GLCounts => {
  let c = glCounts.get(ctx);
  if (!c) {
    c = { buffers: 0, textures: 0, programs: 0, vaos: 0, renderbuffers: 0, framebuffers: 0 };
    glCounts.set(ctx, c);
  }
  return c;
};
{
  const P = WebGL2RenderingContext.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  const wrap = (create: string, del: string, k: keyof GLCounts) => {
    const c = P[create]!;
    const d = P[del]!;
    P[create] = function (this: unknown, ...a: unknown[]) {
      const r = c.apply(this, a);
      if (r) countsFor(this)[k]++;
      return r;
    };
    P[del] = function (this: unknown, ...a: unknown[]) {
      if (a[0]) countsFor(this)[k]--;
      return d.apply(this, a);
    };
  };
  wrap('createBuffer', 'deleteBuffer', 'buffers');
  wrap('createTexture', 'deleteTexture', 'textures');
  wrap('createProgram', 'deleteProgram', 'programs');
  wrap('createVertexArray', 'deleteVertexArray', 'vaos');
  wrap('createRenderbuffer', 'deleteRenderbuffer', 'renderbuffers');
  wrap('createFramebuffer', 'deleteFramebuffer', 'framebuffers');
}

const params = new URLSearchParams(location.search);
let preset: Preset = (['low', 'medium', 'high'] as const).find((p) => p === params.get('preset')) ?? 'medium';
let settings: GraphicsSettings = applyPreset(DEFAULT_GRAPHICS, preset);
let live = params.get('live') === '1';
let grid = params.get('grid') === '1';
let selection = (params.get('sel') ?? '').split(',').filter(Boolean);
const showcase = params.get('design') === 'showcase';
// scenario=/path/module.ts&v=name: a dev module exporting scenario(name) => { design, level }.
const scenarioPath = params.get('scenario');
const scenario = scenarioPath ? ((await import(/* @vite-ignore */ scenarioPath)) as { scenario: (v: string | null) => { design: Design; level: LevelDef } }).scenario(params.get('v')) : null;
const design = scenario?.design ?? (showcase ? showcaseDesign() : sampleDesign());
const level = scenario?.level ?? (showcase ? SHOWCASE_LEVEL : SAMPLE_LEVEL);
const allIds = new Set([...design.items.map((i) => i.id), ...design.conductors.map((c) => c.id)]);
const model = () => buildSceneModel(design, level, live ? (id) => allIds.has(id) : undefined);

const container = document.getElementById('view')!;
const ui = document.getElementById('ui')!;
let lastPick = '(none)';
const view = createView3D(container, settings, {
  onPick: (id) => {
    lastPick = id ?? '(ground)';
    selection = id ? [id] : [];
    view?.setSelection(selection);
  },
}) as SubstationView | null;

if (!view) {
  ui.textContent = 'WebGL 2 is not available - the 3D view is disabled.';
  (window as unknown as Record<string, unknown>).__harness = { ready: true, webgl: false };
} else {
  view.update(model());
  view.setSelection(selection);
  view.setGroundGridVisible(grid);

  const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
  const settle = async (n = 3) => {
    for (let i = 0; i < n; i++) await nextFrame();
  };

  const focus = (id: string, azDeg = 35, elDeg = 22, distM?: number) => {
    const pr = view.debug.built?.proxies.find((p) => p.id === id);
    if (!pr) return false;
    const c = pr.box.getCenter(pr.box.min.clone());
    const s = pr.box.getSize(pr.box.min.clone());
    const dist = distM ?? Math.max(s.x, s.y, s.z) * 1.5 + 3;
    const az = (azDeg * Math.PI) / 180;
    const el = (elDeg * Math.PI) / 180;
    view.debug.controls.target.set(c.x, c.y * 0.8, c.z);
    view.debug.camera.position.set(c.x + Math.sin(az) * Math.cos(el) * dist, c.y * 0.8 + Math.sin(el) * dist, c.z + Math.cos(az) * Math.cos(el) * dist);
    view.debug.controls.update();
    return true;
  };

  const orbitTo = (azDeg: number, elDeg: number, dist: number) => {
    const t = view.debug.controls.target;
    const az = (azDeg * Math.PI) / 180;
    const el = (elDeg * Math.PI) / 180;
    view.debug.camera.position.set(t.x + Math.sin(az) * Math.cos(el) * dist, t.y + Math.sin(el) * dist, t.z + Math.cos(az) * Math.cos(el) * dist);
    view.debug.controls.update();
  };

  const harness = {
    ready: false,
    webgl: true,
    view,
    gl: () => ({ ...countsFor(view.debug.renderer.getContext()) }),
    setPreset: async (p: Preset) => {
      preset = p;
      settings = applyPreset(settings, p);
      view.setSettings(settings);
      render();
      await settle();
    },
    setSettings: async (patch: Partial<GraphicsSettings>) => {
      settings = { ...settings, ...patch, preset: 'custom' };
      view.setSettings(settings);
      render();
      await settle();
    },
    focus: async (id: string, az?: number, el?: number, dist?: number) => {
      const ok = focus(id, az, el, dist);
      await settle();
      return ok;
    },
    orbitTo: async (az: number, el: number, dist: number) => {
      orbitTo(az, el, dist);
      await settle();
    },
    frame: async () => {
      view.frame();
      await settle();
    },
    /** Rebuild the scene n times, rendering each, and report GPU resource counts before/after. */
    leakTest: async (n = 50) => {
      await settle();
      const snap = () => ({ ...view.getStats(), gl: { ...countsFor(view.debug.renderer.getContext()) }, lib: view.debug.lib.counts(), programs: view.debug.renderer.info.programs?.length ?? 0 });
      view.update(model());
      await settle(2);
      const before = snap();
      for (let i = 0; i < n; i++) {
        view.update(model());
        await nextFrame();
      }
      await settle(2);
      return { before, after: snap() };
    },
    /** Orbit continuously for `ms` and report rendered fps and CPU time per frame. */
    benchmark: async (ms = 3000) => {
      const r = view.debug.renderer;
      const orig = r.render.bind(r);
      let cpu = 0;
      let frames = 0;
      r.render = (s, c) => {
        const t0 = performance.now();
        orig(s, c);
        cpu += performance.now() - t0;
        frames++;
      };
      const t0 = performance.now();
      let a = 0;
      while (performance.now() - t0 < ms) {
        a += 0.6;
        orbitTo(20 + a, 30, 70);
        await nextFrame();
      }
      const elapsed = performance.now() - t0;
      r.render = orig;
      const st = view.getStats();
      return { fps: (frames * 1000) / elapsed, cpuMsPerFrame: frames ? cpu / frames : 0, frames, drawCalls: st.drawCalls, triangles: st.triangles };
    },
    /** Draw calls/triangles of a normal frame and of a frame that also re-renders the shadow map. */
    frameCost: async () => {
      view.debug.renderer.shadowMap.needsUpdate = true;
      orbitTo(25, 33, 75);
      await settle(2);
      const r = view.debug.renderer;
      r.shadowMap.needsUpdate = true;
      r.render(view.debug.scene, view.debug.camera);
      const withShadow = { calls: r.info.render.calls, triangles: r.info.render.triangles };
      r.render(view.debug.scene, view.debug.camera);
      const main = { calls: r.info.render.calls, triangles: r.info.render.triangles };
      return { main, withShadow, built: view.debug.built?.stats, lib: view.debug.lib.counts(), pixelRatio: r.getPixelRatio() };
    },
    pick: (x: number, y: number) => view.pick(x, y),
    stats: () => ({ ...view.getStats(), gl: { ...countsFor(view.debug.renderer.getContext()) } }),
    get lastPick() {
      return lastPick;
    },
    /** Screen position (CSS px) of an item's footprint centre, for click tests. */
    screenOf: (id: string) => {
      const pr = view.debug.built?.proxies.find((p) => p.id === id);
      if (!pr) return null;
      const c = pr.box.getCenter(pr.box.min.clone());
      c.y = Math.min(c.y, 2.5);
      c.project(view.debug.camera);
      const r = container.getBoundingClientRect();
      return { x: r.left + ((c.x + 1) / 2) * r.width, y: r.top + ((1 - c.y) / 2) * r.height };
    },
    setLive: async (on: boolean) => {
      live = on;
      view.update(model());
      render();
      await settle();
    },
    api: { createView3D, model, get settings() { return settings; } },
  };
  (window as unknown as Record<string, unknown>).__harness = harness;

  const btn = (label: string, on: boolean, fn: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (on) b.className = 'on';
    b.onclick = fn;
    return b;
  };
  const statsEl = document.createElement('div');
  statsEl.id = 'stats';
  const render = () => {
    ui.replaceChildren();
    const row1 = document.createElement('div');
    for (const p of ['low', 'medium', 'high'] as const) row1.append(btn(p[0]!.toUpperCase() + p.slice(1), p === preset, () => void harness.setPreset(p)));
    row1.append(btn('Frame', false, () => view.frame()));
    const row2 = document.createElement('div');
    row2.append(
      btn('Ground grid', grid, () => {
        grid = !grid;
        view.setGroundGridVisible(grid);
        render();
      }),
      btn('Energized', live, () => {
        live = !live;
        view.update(model());
        render();
      }),
      btn('Select T1', selection.includes('T1'), () => {
        selection = selection.includes('T1') ? [] : ['T1'];
        view.setSelection(selection);
        render();
      }),
      btn('Leak test x50', false, () => {
        void harness.leakTest(50).then((r) => {
          console.log('leak test', r);
          alert(`geometries ${r.before.geometries} -> ${r.after.geometries}, textures ${r.before.textures} -> ${r.after.textures}, GL buffers ${r.before.gl.buffers} -> ${r.after.gl.buffers}`);
        });
      }),
      btn('Benchmark', false, () => {
        void harness.benchmark().then((r) => alert(`${r.fps.toFixed(1)} fps, ${r.cpuMsPerFrame.toFixed(2)} ms CPU/frame`));
      }),
    );
    ui.append(row1, row2, statsEl);
  };
  render();
  setInterval(() => {
    const s = view.getStats();
    statsEl.textContent =
      `draw calls ${s.drawCalls}   triangles ${s.triangles.toLocaleString()}\n` +
      `fps ${s.fps}${s.fps === 0 ? ' (idle - renders on demand)' : ''}\n` +
      `GPU geometries ${s.geometries}  textures ${s.textures}  buffers ${countsFor(view.debug.renderer.getContext()).buffers}\n` +
      `last pick ${lastPick}`;
  }, 400);

  void (async () => {
    await settle(4);
    const f = params.get('focus');
    const look = params.get('look')?.split(',').map(Number);
    if (look && look.length === 3) view.debug.controls.target.set(look[0]!, look[1]!, look[2]!);
    if (f) focus(f, Number(params.get('az') ?? 35), Number(params.get('el') ?? 22), params.has('dist') ? Number(params.get('dist')) : undefined);
    else if (params.has('az')) orbitTo(Number(params.get('az')), Number(params.get('el') ?? 30), Number(params.get('dist') ?? 70));
    await settle(4);
    harness.ready = true;
  })();
}
