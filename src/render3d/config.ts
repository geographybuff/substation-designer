/**
 * Maps the player's GraphicsSettings onto concrete 3D rendering parameters.
 * Pure (no DOM / WebGL) so it can be unit tested.
 */
import { effectivePixelRatio, frameIntervalMs, type GraphicsSettings } from '../settings/graphics';

export type MaterialTier = 'lambert' | 'standard';

export interface RenderConfig {
  /** Canvas pixel ratio (renderScale x devicePixelRatio, capped). */
  readonly pixelRatio: number;
  /** MSAA on the default framebuffer; changing it requires a new WebGLRenderer. */
  readonly antialias: boolean;
  readonly shadows: 'off' | 'low' | 'high';
  /** Shadow map resolution (0 when shadows are off). */
  readonly shadowMapSize: number;
  /** PCF filter radius in shadow-map texels. */
  readonly shadowRadius: number;
  /** Equipment receives shadows too (otherwise only the ground does). */
  readonly itemsReceiveShadows: boolean;
  /** Lambert = cheap per-fragment diffuse; standard = PBR with an environment map. */
  readonly materials: MaterialTier;
  readonly envMap: boolean;
  /** Geometry detail: low = boxes/cylinders, high = sheds, fins, lattice. */
  readonly detail: 'low' | 'high';
  /** Radial segments for generic cylinders. */
  readonly segments: number;
  /** Procedural textures (gravel, grass, chain-link fabric, sky gradient). */
  readonly textures: boolean;
  readonly scenery: boolean;
  /** Visual cue on energized conductors. */
  readonly animations: boolean;
  /** Time-varying cue (pulse). Off with reduceMotion even when animations are on. */
  readonly pulse: boolean;
  /** Camera easing (OrbitControls damping). */
  readonly damping: boolean;
  /** Minimum time between frames while continuously rendering (0 = display refresh). */
  readonly frameIntervalMs: number;
  /** Minimum time between frames when only the slow energized pulse is animating (at most 20 fps). */
  readonly animFrameIntervalMs: number;
  /** Half-size of the ground plane (m). */
  readonly groundExtent: number;
  readonly fogNear: number;
  readonly fogFar: number;
}

export function renderConfig(s: GraphicsSettings, devicePixelRatio = 1): RenderConfig {
  const hi = s.detail3d === 'high';
  const interval = frameIntervalMs(s);
  return {
    pixelRatio: effectivePixelRatio(s, devicePixelRatio),
    antialias: s.antialias,
    shadows: s.shadows,
    shadowMapSize: s.shadows === 'high' ? 2048 : s.shadows === 'low' ? 1024 : 0,
    shadowRadius: s.shadows === 'high' ? 3 : 1.5,
    itemsReceiveShadows: s.shadows === 'high',
    materials: hi ? 'standard' : 'lambert',
    envMap: hi,
    detail: s.detail3d,
    segments: hi ? 12 : 6,
    textures: hi,
    scenery: s.scenery,
    animations: s.animations,
    pulse: s.animations && !s.reduceMotion,
    damping: !s.reduceMotion,
    frameIntervalMs: interval,
    animFrameIntervalMs: Math.max(interval, 50),
    groundExtent: s.scenery ? 900 : 420,
    fogNear: s.scenery ? 240 : 170,
    fogFar: s.scenery ? 860 : 520,
  };
}

/** True when switching between the two configs needs a new WebGL context. */
export function needsNewRenderer(a: RenderConfig, b: RenderConfig): boolean {
  return a.antialias !== b.antialias;
}

/** Key of everything baked into the scene graph; a change means a rebuild. */
export function sceneKey(c: RenderConfig): string {
  return [
    c.materials,
    c.envMap,
    c.detail,
    c.segments,
    c.textures,
    c.scenery,
    c.animations,
    c.shadows,
    c.itemsReceiveShadows,
    c.groundExtent,
  ].join('|');
}
