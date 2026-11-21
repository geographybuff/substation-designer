/**
 * Lazy loader for the 3D view module so the 2D-only path never pays for it.
 * Returns null if the module or WebGL is unavailable.
 */
import type { SceneModel } from '../engine/scene';
import type { GraphicsSettings } from '../settings/graphics';

export interface View3DLike {
  update(scene: SceneModel): void;
  setSettings(s: GraphicsSettings): void;
  setSelection(ids: readonly string[]): void;
  setGroundGridVisible(v: boolean): void;
  resize(): void;
  frame(): void;
  getStats(): { drawCalls: number; triangles: number; fps: number };
  dispose(): void;
}

export interface View3DModule {
  isWebGLAvailable(): boolean;
  createView3D(container: HTMLElement, settings: GraphicsSettings, opts?: { onPick?: (itemId: string | null) => void }): View3DLike | null;
}

export async function loadView3D(): Promise<View3DModule | null> {
  try {
    return await import('../render3d');
  } catch (err) {
    console.warn('3D view could not be loaded', err);
    return null;
  }
}
