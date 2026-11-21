/**
 * Graphics settings shared by the 2D plan view, the 3D view and the UI.
 * "Low" is designed for old laptops and integrated graphics; "2D only" turns
 * the 3D view off entirely so the game runs without WebGL.
 */

export type QualityPreset = 'low' | 'medium' | 'high' | 'custom';

export interface GraphicsSettings {
  preset: QualityPreset;
  /** Multiplier on the device pixel ratio for canvases (0.5–2). Lower = faster, blurrier. */
  renderScale: number;
  /** Cap on the effective device pixel ratio (after renderScale). */
  maxPixelRatio: number;
  antialias: boolean;
  /** Real-time shadows in the 3D view. */
  shadows: 'off' | 'low' | 'high';
  /** Allow the 3D view at all (off = 2D-only mode, no WebGL needed). */
  view3d: boolean;
  /** Geometry detail in 3D: low = simple boxes/cylinders, high = sheds, radiators, lattice detail. */
  detail3d: 'low' | 'high';
  /** Decorative scenery in 3D (trees, farmland, distant poles). */
  scenery: boolean;
  /** Animated power-flow dashes, pulsing highlights, sparks. */
  animations: boolean;
  /** Rain and lightning flashes during simulation playback. */
  weatherFx: boolean;
  /** Frame-rate cap: 30, 60 or 0 for uncapped (display refresh). */
  maxFps: 30 | 60 | 0;
  /** Desktop only: GPU acceleration (takes effect after restart). */
  hardwareAcceleration: boolean;
  /** UI zoom factor. */
  uiScale: number;
  /** Minimise motion (accessibility). Disables camera easing and flashes. */
  reduceMotion: boolean;
}

type PresetValues = Omit<GraphicsSettings, 'preset' | 'hardwareAcceleration' | 'uiScale' | 'reduceMotion'>;

export const PRESETS: Record<Exclude<QualityPreset, 'custom'>, PresetValues> = {
  low: {
    renderScale: 0.75,
    maxPixelRatio: 1,
    antialias: false,
    shadows: 'off',
    view3d: true,
    detail3d: 'low',
    scenery: false,
    animations: false,
    weatherFx: false,
    maxFps: 30,
  },
  medium: {
    renderScale: 1,
    maxPixelRatio: 1.5,
    antialias: true,
    shadows: 'low',
    view3d: true,
    detail3d: 'high',
    scenery: true,
    animations: true,
    weatherFx: true,
    maxFps: 60,
  },
  high: {
    renderScale: 1,
    maxPixelRatio: 2,
    antialias: true,
    shadows: 'high',
    view3d: true,
    detail3d: 'high',
    scenery: true,
    animations: true,
    weatherFx: true,
    maxFps: 0,
  },
};

export const DEFAULT_GRAPHICS: GraphicsSettings = {
  preset: 'medium',
  ...PRESETS.medium,
  hardwareAcceleration: true,
  uiScale: 1,
  reduceMotion: false,
};

export function applyPreset(current: GraphicsSettings, preset: Exclude<QualityPreset, 'custom'>): GraphicsSettings {
  return { ...current, ...PRESETS[preset], preset };
}

/** Effective canvas pixel ratio for the current device. */
export function effectivePixelRatio(s: GraphicsSettings, devicePixelRatio = 1): number {
  return Math.max(0.5, Math.min(s.maxPixelRatio, devicePixelRatio * s.renderScale));
}

/** Frame interval in ms for the fps cap (0 = no cap). */
export function frameIntervalMs(s: GraphicsSettings): number {
  return s.maxFps === 0 ? 0 : 1000 / s.maxFps;
}
