import { useEffect, useState } from 'preact/hooks';
import { newDesign } from '../engine/design';
import { reviewDesign, type DesignReview } from '../engine/review';
import { setSiteAltitude } from '../engine/site';
import type { Design, ItemKind, LevelDef } from '../engine/types';
import { DEFAULT_GRAPHICS, type GraphicsSettings } from '../settings/graphics';
import { getLevel } from '../levels';
import { load, save } from './persist';

type Listener = () => void;

export class Store<S extends object> {
  private state: S;
  private listeners = new Set<Listener>();
  constructor(init: S) {
    this.state = init;
  }
  get = (): S => this.state;
  set = (patch: Partial<S> | ((s: S) => Partial<S>)): void => {
    const p = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = { ...this.state, ...p };
    for (const l of [...this.listeners]) l();
  };
  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
}

export function useStore<S extends object, T>(store: Store<S>, sel: (s: S) => T): T {
  const [value, setValue] = useState(() => sel(store.get()));
  useEffect(() => {
    const check = () => {
      const next = sel(store.get());
      setValue((prev) => (Object.is(prev, next) ? prev : next));
    };
    check();
    return store.subscribe(check);
  }, [store]);
  return value;
}

export type Screen = 'menu' | 'levels' | 'editor' | 'results' | 'guide' | 'settings' | 'credits';

export type Tool =
  | { kind: 'select' }
  | { kind: 'place'; item: ItemKind; kv: number }
  | { kind: 'bus'; kv: number; elevation: 'low' | 'high' }
  | { kind: 'fence' }
  | { kind: 'shieldwire' }
  | { kind: 'erase' };

export interface Overlays {
  shielding: boolean;
  fenceZone: boolean;
  grounding: boolean;
  removal: boolean;
  labels: boolean;
  grid: boolean;
}

export interface LevelProgress {
  completed: boolean;
  stars: number;
  bestScore: number;
}

export interface GameSettings {
  units: 'metric' | 'imperial';
  showTips: boolean;
}

export interface AppState {
  screen: Screen;
  licenseAccepted: boolean;
  levelId: string | null;
  design: Design | null;
  past: Design[];
  future: Design[];
  selection: string[];
  tool: Tool;
  view: '2d' | '3d';
  overlays: Overlays;
  review: DesignReview | null;
  reviewStale: boolean;
  progress: Record<string, LevelProgress>;
  graphics: GraphicsSettings;
  game: GameSettings;
  showBriefing: boolean;
  tutorialStep: number;
  lastResult: { review: DesignReview; levelId: string; sim: import('../engine/simulation').SimulationResult } | null;
  guideTopic: string | null;
  toast: { text: string; tone: 'info' | 'warn' | 'error'; at: number } | null;
}

const initialGraphics: GraphicsSettings = { ...DEFAULT_GRAPHICS, ...load<Partial<GraphicsSettings>>('graphics', {}) };

export const store = new Store<AppState>({
  screen: 'menu',
  licenseAccepted: false,
  levelId: null,
  design: null,
  past: [],
  future: [],
  selection: [],
  tool: { kind: 'select' },
  view: '2d',
  overlays: { shielding: false, fenceZone: true, grounding: false, removal: false, labels: true, grid: true },
  review: null,
  reviewStale: true,
  progress: load<Record<string, LevelProgress>>('progress', {}),
  graphics: initialGraphics,
  game: { units: 'metric', showTips: true, ...load<Partial<GameSettings>>('game', {}) },
  showBriefing: false,
  tutorialStep: 0,
  lastResult: null,
  guideTopic: null,
  toast: null,
});

export const currentLevel = (): LevelDef | null => {
  const id = store.get().levelId;
  return id ? (getLevel(id) ?? null) : null;
};

// ---------------------------------------------------------------------------
// Design editing with history
// ---------------------------------------------------------------------------

const HISTORY_LIMIT = 100;
let reviewTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleReview(delayMs = 180): void {
  store.set({ reviewStale: true });
  if (reviewTimer) clearTimeout(reviewTimer);
  reviewTimer = setTimeout(runReviewNow, delayMs);
}

export function runReviewNow(): DesignReview | null {
  if (reviewTimer) clearTimeout(reviewTimer);
  reviewTimer = null;
  const { design } = store.get();
  const level = currentLevel();
  if (!design || !level) return null;
  try {
    const review = reviewDesign(design, level);
    store.set({ review, reviewStale: false });
    return review;
  } catch (err) {
    console.error('review failed', err);
    store.set({ reviewStale: false });
    return null;
  }
}

export function commit(next: Design, opts: { replace?: boolean } = {}): void {
  const { design, past } = store.get();
  if (!design || next === design) return;
  store.set({
    design: next,
    past: opts.replace ? past : [...past.slice(-HISTORY_LIMIT + 1), design],
    future: [],
  });
  autosave();
  scheduleReview();
}

export function undo(): void {
  const { past, design, future } = store.get();
  if (!past.length || !design) return;
  const prev = past[past.length - 1]!;
  store.set({ design: prev, past: past.slice(0, -1), future: [design, ...future], selection: [] });
  autosave();
  scheduleReview();
}

export function redo(): void {
  const { past, design, future } = store.get();
  if (!future.length || !design) return;
  const next = future[0]!;
  store.set({ design: next, past: [...past, design], future: future.slice(1), selection: [] });
  autosave();
  scheduleReview();
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function autosave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { design, levelId } = store.get();
    if (design && levelId) save(`design:${levelId}`, design);
  }, 400);
}

export function startLevel(levelId: string, fresh = false): void {
  const level = getLevel(levelId);
  if (!level) return;
  setSiteAltitude(level.site.altitudeM);
  const saved = fresh ? null : load<Design | null>(`design:${levelId}`, null);
  const design = saved && saved.version === 1 && saved.levelId === levelId ? saved : newDesign(level);
  store.set({
    screen: 'editor',
    levelId,
    design,
    past: [],
    future: [],
    selection: [],
    tool: { kind: 'select' },
    review: null,
    showBriefing: !saved || fresh,
    tutorialStep: 0,
    view: '2d',
  });
  scheduleReview(0);
}

export function resetLevel(): void {
  const { levelId } = store.get();
  if (!levelId) return;
  const level = getLevel(levelId)!;
  commit(newDesign(level));
  store.set({ selection: [], tutorialStep: 0 });
}

export function recordProgress(levelId: string, stars: number, score: number, passed: boolean): void {
  const progress = { ...store.get().progress };
  const prev = progress[levelId] ?? { completed: false, stars: 0, bestScore: 0 };
  progress[levelId] = { completed: prev.completed || passed, stars: Math.max(prev.stars, stars), bestScore: Math.max(prev.bestScore, score) };
  store.set({ progress });
  save('progress', progress);
}

export function setGraphics(g: GraphicsSettings): void {
  store.set({ graphics: g });
  save('graphics', g);
}

export function setGame(g: GameSettings): void {
  store.set({ game: g });
  save('game', g);
}

export function toast(text: string, tone: 'info' | 'warn' | 'error' = 'info'): void {
  store.set({ toast: { text, tone, at: Date.now() } });
}

export function go(screen: Screen): void {
  store.set({ screen });
}
