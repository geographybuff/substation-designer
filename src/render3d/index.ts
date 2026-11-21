/**
 * 3D view of a substation design (three.js / WebGL 2).
 *
 * Renders on demand only: a frame is drawn when the scene, camera, size,
 * settings or selection change, or while camera easing / the energized-bus
 * pulse is running, and never faster than the maxFps cap. When nothing changes
 * the view costs no CPU or GPU time.
 */
import {
  BackSide,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type MeshLambertMaterial,
  type MeshStandardMaterial,
  type Texture,
  type WebGLRenderTarget,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SceneModel } from '../engine/scene';
import type { GraphicsSettings } from '../settings/graphics';
import type { BatchMesh } from './batch';
import { buildScene, type BuiltScene } from './build';
import { needsNewRenderer, renderConfig, sceneKey, type RenderConfig } from './config';
import { ResourceLibrary } from './library';
import { roadSide } from './site';
import { skyTexture } from './textures';

export interface View3DStats {
  /** Draw calls and triangles of the last rendered frame. */
  drawCalls: number;
  triangles: number;
  /** Frames rendered during the last second (0 while idle: rendering is on demand). */
  fps: number;
  /** GPU resources currently allocated by the renderer. */
  geometries: number;
  textures: number;
}

export interface View3D {
  update(scene: SceneModel): void;
  setSettings(s: GraphicsSettings): void;
  setSelection(ids: readonly string[]): void;
  setGroundGridVisible(v: boolean): void;
  resize(): void;
  frame(): void;
  getStats(): View3DStats;
  dispose(): void;
}

export interface View3DOptions {
  /** Click on equipment (its item id) or on empty ground (null). */
  onPick?: (itemId: string | null) => void;
  /** The GPU context was lost; the view shows nothing until it is restored or recreated. */
  onContextLost?: () => void;
}

const SKY_TOP = '#7aa6d6';
const SKY_HORIZON = '#dde7ee';
const SKY_LOW = 0xcfdde8;
/** Unit vector from the scene toward the sun: south-west, about 50 degrees up. */
const SUN_DIR = new Vector3(-0.45, 0.78, 0.43).normalize();
const UP = new Vector3(0, 1, 0);

/** WebGL 2 is required by three.js r163+. */
export function isWebGLAvailable(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Create the 3D view inside `container`. Returns null (never throws) when WebGL is unavailable. */
export function createView3D(container: HTMLElement, settings: GraphicsSettings, opts: View3DOptions = {}): View3D | null {
  if (!isWebGLAvailable()) return null;
  try {
    return new SubstationView(container, settings, opts);
  } catch (e) {
    console.warn('3D view unavailable:', e);
    return null;
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export class SubstationView implements View3D {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(45, 1.6, 0.8, 2000);
  renderer: WebGLRenderer;
  controls: OrbitControls;
  private canvas: HTMLCanvasElement;
  private cfg: RenderConfig;
  private settings: GraphicsSettings;
  private readonly lib = new ResourceLibrary();
  private built: BuiltScene | null = null;
  private model: SceneModel | null = null;
  private selection = new Set<string>();
  private gridVisible = false;
  private readonly hemi = new HemisphereLight(0xdde8f5, 0x7a735f, 1);
  private readonly sun = new DirectionalLight(0xfff3e0, 2.2);
  private envRT: WebGLRenderTarget | null = null;
  private skyTex: Texture | null = null;
  private raf = 0;
  private dirty = true;
  private lastFrame = -1e9;
  private readonly frameTimes: number[] = [];
  private disposed = false;
  private lost = false;
  private framed = false;
  private userMoved = false;
  private width = 0;
  private height = 0;
  private ro: ResizeObserver | null = null;
  private down: { x: number; y: number; t: number } | null = null;
  private readonly raycaster = new Raycaster();

  constructor(
    private readonly container: HTMLElement,
    settings: GraphicsSettings,
    private readonly opts: View3DOptions,
  ) {
    this.settings = settings;
    this.cfg = renderConfig(settings, globalThis.devicePixelRatio || 1);
    this.renderer = this.createRenderer();
    this.canvas = this.renderer.domElement;
    container.prepend(this.canvas); // below any overlay the host puts in the container
    try {
      this.controls = this.createControls();
      this.attachCanvasEvents();
      this.scene.add(this.hemi, this.sun, this.sun.target);
      this.sun.shadow.bias = -0.0004;
      this.sun.shadow.normalBias = 0.03;
      this.camera.position.set(30, 30, 60);
      this.controls.target.set(25, 0.5, 23);
      this.applyEnvironment();
      if (typeof ResizeObserver !== 'undefined') {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(container);
      }
      this.resize();
    } catch (e) {
      // Do not leave a half-initialised canvas or context behind.
      this.disposed = true;
      this.detachCanvasEvents();
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.canvas.remove();
      throw e;
    }
  }

  // ---------------------------------------------------------------- public API

  update(model: SceneModel): void {
    if (this.disposed) return;
    this.model = model;
    this.rebuild();
    if (!this.framed && !this.userMoved) this.frame();
  }

  setSettings(s: GraphicsSettings): void {
    if (this.disposed) return;
    const prev = this.cfg;
    this.settings = s;
    const next = renderConfig(s, globalThis.devicePixelRatio || 1);
    this.cfg = next;
    if (needsNewRenderer(prev, next)) {
      this.recreateRenderer();
      return;
    }
    this.controls.enableDamping = next.damping;
    this.applyEnvironment();
    if (prev.shadows !== next.shadows) this.lib.invalidateMaterials();
    if (sceneKey(prev) !== sceneKey(next)) this.rebuild();
    this.resize();
    this.requestRender();
  }

  setSelection(ids: readonly string[]): void {
    if (this.disposed) return;
    this.selection = new Set(ids);
    this.built?.setSelection(this.selection);
    this.requestRender();
  }

  setGroundGridVisible(v: boolean): void {
    this.gridVisible = v;
    if (this.built?.grid) this.built.grid.visible = v;
    this.requestRender();
  }

  resize(): void {
    if (this.disposed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const pr = renderConfig(this.settings, globalThis.devicePixelRatio || 1).pixelRatio;
    if (Math.abs(pr - this.renderer.getPixelRatio()) > 1e-3) this.renderer.setPixelRatio(pr);
    this.width = w;
    this.height = h;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.framed && this.built && !this.userMoved) this.frame();
    this.requestRender();
  }

  /** Fit the camera to the fenced yard (or the equipment), viewed from the road side. */
  frame(): void {
    if (this.disposed) return;
    if (!this.built || !this.model) {
      this.framed = false;
      return;
    }
    const b = this.built.yard;
    const c = b.getCenter(new Vector3());
    const size = b.getSize(new Vector3());
    const r = Math.max(8, Math.hypot(size.x, size.z) / 2);
    const aspect = this.width > 0 && this.height > 0 ? this.width / this.height : 1.6;
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const dist = (r / Math.sin(Math.min(vfov, hfov) / 2)) * 0.92;
    const side = roadSide(this.model);
    const base = side === 'S' ? 0 : side === 'E' ? Math.PI / 2 : side === 'N' ? Math.PI : -Math.PI / 2;
    const az = base + 0.38;
    const el = 0.6;
    const target = new Vector3(c.x, clamp(size.y * 0.12, 0.5, 2), c.z);
    this.controls.target.copy(target);
    this.camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(az) * Math.cos(el) * dist,
    );
    this.controls.maxDistance = Math.max(160, dist * 3);
    this.controls.update();
    // Framed for real only once the aspect ratio is known; resize() re-frames otherwise.
    this.framed = this.width > 0 && this.height > 0;
    this.requestRender();
  }

  getStats(): View3DStats {
    const info = this.renderer.info;
    const now = performance.now();
    const fps = this.frameTimes.filter((t) => now - t <= 1000).length;
    return {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      fps,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro?.disconnect();
    this.ro = null;
    this.detachCanvasEvents();
    this.controls.dispose();
    this.dropScene(true);
    this.lib.disposeAll();
    this.disposeEnvironment();
    this.sun.dispose();
    this.hemi.dispose();
    this.renderer.dispose();
    try {
      this.renderer.forceContextLoss();
    } catch {
      /* extension unavailable */
    }
    this.canvas.remove();
  }

  /** Internals for the dev harness and tests. */
  get debug() {
    return { renderer: this.renderer, camera: this.camera, controls: this.controls, scene: this.scene, built: this.built, lib: this.lib, cfg: this.cfg };
  }

  // ------------------------------------------------------------- render loop

  private requestRender = (): void => {
    this.dirty = true;
    this.schedule();
  };

  private schedule(): void {
    if (!this.raf && !this.disposed && !this.lost) this.raf = requestAnimationFrame(this.tick);
  }

  private animating(): boolean {
    return this.cfg.pulse && this.built?.liveMaterial != null;
  }

  private tick = (now: number): void => {
    this.raf = 0;
    if (this.disposed || this.lost) return;
    const animating = this.animating();
    const interval = this.dirty || !animating ? this.cfg.frameIntervalMs : this.cfg.animFrameIntervalMs;
    if (interval > 0 && now - this.lastFrame < interval - 1) {
      this.schedule();
      return;
    }
    // Camera easing: update() emits 'change' (which re-schedules) while still moving.
    if (this.controls.enableDamping) this.controls.update();
    if (!this.dirty && !animating) return;
    this.lastFrame = now;
    if (animating) {
      const m = this.built!.liveMaterial as MeshStandardMaterial | MeshLambertMaterial;
      m.emissiveIntensity = 0.18 + 0.3 * (0.5 + 0.5 * Math.sin((now / 2600) * Math.PI * 2));
    }
    this.dirty = false;
    if (this.width > 0 && this.height > 0) {
      this.renderer.render(this.scene, this.camera);
      this.frameTimes.push(now);
      while (this.frameTimes.length > 0 && now - this.frameTimes[0]! > 1000) this.frameTimes.shift();
    }
    if (animating) this.schedule();
  };

  // ---------------------------------------------------------------- building

  private rebuild(): void {
    if (!this.model || this.lost || this.disposed) return;
    this.lib.begin();
    let next: BuiltScene;
    try {
      next = buildScene(this.model, this.cfg, this.lib);
    } catch (e) {
      console.error('3D scene build failed:', e);
      return;
    }
    this.dropScene(true);
    this.lib.sweep();
    this.built = next;
    this.scene.add(next.root);
    next.setSelection(this.selection);
    if (next.grid) next.grid.visible = this.gridVisible;
    this.fitShadowCamera();
    this.renderer.shadowMap.needsUpdate = true;
    this.requestRender();
  }

  private dropScene(dispose: boolean): void {
    if (!this.built) return;
    this.scene.remove(this.built.root);
    if (dispose) this.built.dispose();
    this.built = null;
  }

  /** Fit the sun's orthographic shadow camera tightly around the yard. */
  private fitShadowCamera(): void {
    if (!this.built) return;
    const b = this.built.yard.clone().expandByVector(new Vector3(3, 0, 3));
    b.max.y = Math.max(b.max.y, 4);
    const c = b.getCenter(new Vector3());
    const radius = b.getSize(new Vector3()).length() / 2;
    this.sun.position.copy(c).addScaledVector(SUN_DIR, radius + 30);
    this.sun.target.position.copy(c);
    this.sun.updateMatrixWorld();
    this.sun.target.updateMatrixWorld();
    const view = new Matrix4().lookAt(this.sun.position, c, UP).setPosition(this.sun.position).invert();
    const lo = new Vector3(Infinity, Infinity, Infinity);
    const hi = new Vector3(-Infinity, -Infinity, -Infinity);
    const v = new Vector3();
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(view);
      lo.min(v);
      hi.max(v);
    }
    const cam = this.sun.shadow.camera;
    cam.left = lo.x - 1;
    cam.right = hi.x + 1;
    cam.bottom = lo.y - 1;
    cam.top = hi.y + 1;
    cam.near = Math.max(0.5, -hi.z - 5);
    cam.far = -lo.z + 5;
    cam.updateProjectionMatrix();
  }

  // ------------------------------------------------------------- environment

  private applyEnvironment(): void {
    const cfg = this.cfg;
    if (cfg.textures) {
      this.skyTex ??= skyTexture(SKY_TOP, SKY_HORIZON);
      this.scene.background = this.skyTex;
    } else {
      this.scene.background = new Color(SKY_LOW);
      this.skyTex?.dispose();
      this.skyTex = null;
    }
    this.scene.fog = new Fog(cfg.textures ? SKY_HORIZON : SKY_LOW, cfg.fogNear, cfg.fogFar);
    const pbr = cfg.materials === 'standard';
    this.hemi.intensity = pbr ? 0.75 : 1.55;
    this.sun.intensity = pbr ? 2.4 : 2.0;
    if (cfg.envMap) {
      this.envRT ??= this.makeEnvironment();
      this.scene.environment = this.envRT.texture;
      this.scene.environmentIntensity = 0.7;
    } else {
      this.scene.environment = null;
      this.envRT?.dispose();
      this.envRT = null;
    }
    const shadows = cfg.shadows !== 'off';
    this.renderer.shadowMap.enabled = shadows;
    this.sun.castShadow = shadows;
    if (shadows) {
      if (this.sun.shadow.mapSize.x !== cfg.shadowMapSize) {
        this.sun.shadow.mapSize.set(cfg.shadowMapSize, cfg.shadowMapSize);
        this.sun.shadow.map?.dispose();
        this.sun.shadow.map = null;
      }
      this.sun.shadow.radius = cfg.shadowRadius;
    } else if (this.sun.shadow.map) {
      this.sun.shadow.map.dispose();
      this.sun.shadow.map = null;
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.camera.far = cfg.fogFar * 1.5;
    this.camera.updateProjectionMatrix();
    this.controls.enableDamping = cfg.damping;
  }

  /** Prefiltered sky/ground gradient for PBR materials (metal reads as metal). */
  private makeEnvironment(): WebGLRenderTarget {
    const pmrem = new PMREMGenerator(this.renderer);
    const geo = new SphereGeometry(10, 32, 16);
    const pos = geo.getAttribute('position');
    const zenith = new Color(0x5d8fcf);
    const horizon = new Color(0xe9eef0);
    const ground = new Color(0x6f6a58);
    const sunDir = SUN_DIR;
    const col: number[] = [];
    const c = new Color();
    const n = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      n.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      if (n.y >= 0) c.copy(horizon).lerp(zenith, Math.pow(n.y, 0.6));
      else c.copy(horizon).lerp(ground, Math.min(1, -n.y * 5));
      const s = Math.max(0, n.dot(sunDir));
      const glow = Math.pow(s, 40) * 6;
      col.push(c.r + glow, c.g + glow * 0.95, c.b + glow * 0.85);
    }
    geo.setAttribute('color', new Float32BufferAttribute(col, 3));
    const mat = new MeshBasicMaterial({ vertexColors: true, side: BackSide });
    const envScene = new Scene();
    envScene.add(new Mesh(geo, mat));
    const rt = pmrem.fromScene(envScene, 0.035);
    geo.dispose();
    mat.dispose();
    pmrem.dispose();
    return rt;
  }

  private disposeEnvironment(): void {
    this.envRT?.dispose();
    this.envRT = null;
    this.skyTex?.dispose();
    this.skyTex = null;
    this.scene.environment = null;
    this.scene.background = null;
  }

  // -------------------------------------------------------- renderer / context

  private createRenderer(): WebGLRenderer {
    const r = new WebGLRenderer({
      antialias: this.cfg.antialias,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!r.getContext()) throw new Error('No WebGL context');
    r.setPixelRatio(this.cfg.pixelRatio);
    r.outputColorSpace = SRGBColorSpace;
    r.toneMapping = NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.type = PCFShadowMap;
    r.shadowMap.autoUpdate = false; // the yard is static: re-render shadows only after a change
    const c = r.domElement;
    c.style.display = 'block';
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.outline = 'none';
    return r;
  }

  private createControls(): OrbitControls {
    const c = new OrbitControls(this.camera, this.canvas);
    c.enableDamping = this.cfg.damping;
    c.dampingFactor = 0.14;
    c.screenSpacePanning = false; // pan across the ground plane
    c.maxPolarAngle = Math.PI * 0.46; // never look up from below the horizon
    c.minDistance = 5;
    c.maxDistance = 400;
    c.zoomToCursor = true;
    c.addEventListener('change', this.onControlsChange);
    c.addEventListener('start', this.onControlsStart);
    return c;
  }

  private recreateRenderer(): void {
    const target = this.controls.target.clone();
    this.dropScene(true);
    this.lib.disposeAll();
    this.disposeEnvironment();
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.detachCanvasEvents();
    this.controls.dispose();
    this.renderer.dispose();
    try {
      this.renderer.forceContextLoss();
    } catch {
      /* ignore */
    }
    // Keep the canvas where it was among the container's children (host overlays stay on top).
    const next = this.canvas.nextSibling;
    this.canvas.remove();
    try {
      this.renderer = this.createRenderer();
    } catch (e) {
      console.warn('3D view: could not recreate the renderer', e);
      this.lost = true;
      this.opts.onContextLost?.();
      return;
    }
    this.lost = false;
    this.canvas = this.renderer.domElement;
    this.container.insertBefore(this.canvas, next && next.parentNode === this.container ? next : null);
    this.controls = this.createControls();
    this.controls.target.copy(target);
    this.controls.update();
    this.attachCanvasEvents();
    this.applyEnvironment();
    this.resize();
    this.rebuild();
  }

  private attachCanvasEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private detachCanvasEvents(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
  }

  private onContextLost = (e: Event): void => {
    e.preventDefault(); // allow restoration
    this.lost = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.canvas.style.visibility = 'hidden';
    this.opts.onContextLost?.();
  };

  private onContextRestored = (): void => {
    if (this.disposed) return;
    this.lost = false;
    this.canvas.style.visibility = '';
    // GPU objects died with the old context: forget them and rebuild from scratch.
    this.dropScene(false);
    this.lib.forgetAll();
    this.envRT = null;
    this.skyTex = null;
    this.sun.shadow.map = null;
    this.applyEnvironment();
    this.rebuild();
    this.requestRender();
  };

  // ------------------------------------------------------------ interaction

  private onControlsStart = (): void => {
    this.userMoved = true;
  };

  private onControlsChange = (): void => {
    const t = this.controls.target;
    if (this.built) {
      const b = this.built.yard;
      t.x = clamp(t.x, b.min.x - 80, b.max.x + 80);
      t.z = clamp(t.z, b.min.z - 80, b.max.z + 80);
    }
    // With the target at least 0.5 m up, maxPolarAngle and minDistance keep the
    // camera above ground: y >= 0.5 + 5 * cos(0.46 * PI) = 1.1 m.
    t.y = clamp(t.y, 0.5, 25);
    this.requestRender();
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || !e.isPrimary) return;
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
  };

  private onPointerCancel = (): void => {
    this.down = null;
  };

  private onPointerUp = (e: PointerEvent): void => {
    const d = this.down;
    this.down = null;
    if (!d || e.button !== 0) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5 || performance.now() - d.t > 700) return;
    this.opts.onPick?.(this.pick(e.clientX, e.clientY));
  };

  /** Item under the given client coordinates, or null. */
  pick(clientX: number, clientY: number): string | null {
    const built = this.built;
    if (!built) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    for (const h of this.raycaster.intersectObjects(built.pickMeshes, false)) {
      const owners = (h.object as BatchMesh).userData.owners;
      const id = h.instanceId !== undefined ? owners[h.instanceId] : null;
      if (id && built.itemIds.has(id)) return id;
    }
    // Footprint boxes make thin equipment (and its footprint) easy to hit.
    let best: string | null = null;
    let bestD = Infinity;
    const hit = new Vector3();
    for (const pr of built.proxies) {
      if (!this.raycaster.ray.intersectBox(pr.box, hit)) continue;
      const dd = hit.distanceTo(this.raycaster.ray.origin);
      if (dd < bestD) {
        bestD = dd;
        best = pr.id;
      }
    }
    return best;
  }
}
