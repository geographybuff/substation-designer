/**
 * Editor input controller: translates pointer and keyboard input on the plan
 * canvas into design operations, and keeps the PlanView's state up to date.
 */
import { CATALOG } from '../engine/catalog';
import {
  addConductor,
  addItem,
  alignPlacement,
  addShieldWire,
  deleteConductors,
  deleteItems,
  deleteShieldWire,
  makeItem,
  moveItem,
  placementBlocked,
  previewRect,
  rotateItem,
  setFence,
  transformerProps,
} from '../engine/design';
import { pointSegDist, samePoint, segments, snap } from '../engine/geometry';
import { defaultRecloserRating } from '../engine/equipment';
import { itemPorts, itemRect, type WorldPort } from '../engine/items';
import type { Design, Rotation, Side, Vec2 } from '../engine/types';
import { commit, currentLevel, redo, store, undo, type Tool } from '../app/store';
import { PlanView, type Ghost, type PlanState } from './planView';

interface Drag {
  kind: 'pan' | 'move' | 'fence';
  startScreen: Vec2;
  startWorld: Vec2;
  itemId?: string;
  itemStart?: Vec2;
  moved: boolean;
}

export class EditorController {
  readonly view: PlanView;
  private drag: Drag | null = null;
  private dragPreview: Design | null = null;
  private hover: string | null = null;
  private hoverPort: WorldPort | null = null;
  private cursor: Vec2 | null = null;
  private ghostRot: Rotation = 0;
  private busDraft: PlanState['busDraft'] = null;
  private shieldFrom: string | null = null;
  private fenceDraft: PlanState['fenceDraft'] = null;
  private spaceDown = false;
  private unsub: () => void;
  private lastTool: Tool | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.view = new PlanView(canvas);
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('dblclick', this.onDblClick);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    this.unsub = store.subscribe(() => {
      const t = store.get().tool;
      if (t !== this.lastTool) {
        this.lastTool = t;
        this.cancelDrafts();
      }
      this.push();
    });
    this.view.resize();
    this.push();
    this.fitSite();
    // Expose screen<->world mapping to the end-to-end test (only with ?e2e).
    if (typeof window !== 'undefined' && window.location.search.includes('e2e')) {
      (window as unknown as { __sdWorldToScreen?: (x: number, y: number) => Vec2 }).__sdWorldToScreen = (x, y) => this.view.worldToScreen({ x, y });
    }
  }

  dispose(): void {
    this.unsub();
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    this.view.dispose();
  }

  fitSite(): void {
    const level = currentLevel();
    const d = store.get().design;
    if (!level) return;
    const r = d?.fence ? { x: d.fence.rect.x - 6, y: d.fence.rect.y - 6, w: d.fence.rect.w + 12, h: d.fence.rect.h + 12 } : { x: 0, y: 0, w: level.site.width, h: level.site.depth };
    this.view.resize();
    this.view.fit(r);
  }

  focus(at: Vec2): void {
    this.view.cam.cx = at.x;
    this.view.cam.cy = at.y;
    this.view.cam.scale = Math.max(this.view.cam.scale, 18);
    this.view.invalidate();
  }

  // --- State push --------------------------------------------------------------

  private design(): Design | null {
    return this.dragPreview ?? store.get().design;
  }

  push(): void {
    const s = store.get();
    const level = currentLevel();
    const design = this.design();
    if (!design || !level) return;
    let ghost: Ghost | null = null;
    if (s.tool.kind === 'place' && this.cursor) {
      const kind = s.tool.item;
      const props = { ...(kind === 'transformer' || kind === 'mobile_pad' ? transformerProps(level) : {}), ...defaultPropsFor(kind) };
      const r0 = previewRect(kind, s.tool.kv, props, 0, 0, this.ghostRot);
      const { x, y } = alignPlacement(design, { kind, kv: s.tool.kv, props, rot: this.ghostRot, x: snap(this.cursor.x - r0.w / 2), y: snap(this.cursor.y - r0.h / 2) });
      const rect = previewRect(kind, s.tool.kv, props, x, y, this.ghostRot);
      ghost = { kind, kv: s.tool.kv, props, x, y, rot: this.ghostRot, blocked: placementBlocked(design, level, rect) };
    }
    let shieldDraft: PlanState['shieldDraft'] = null;
    if (this.shieldFrom && this.cursor) {
      const m = design.items.find((i) => i.id === this.shieldFrom);
      if (m) {
        const r = itemRect(m);
        shieldDraft = { from: { x: r.x + r.w / 2, y: r.y + r.h / 2 }, cursor: this.cursor };
      }
    }
    this.view.setState({
      design,
      level,
      review: s.review,
      selection: new Set(s.selection),
      hover: this.hover,
      hoverPort: this.hoverPort,
      overlays: s.overlays,
      ghost,
      busDraft: this.busDraft,
      fenceDraft: this.fenceDraft,
      shieldDraft,
      cursor: this.cursor,
      graphics: s.graphics,
    });
  }

  private cancelDrafts(): void {
    this.busDraft = null;
    this.shieldFrom = null;
    this.fenceDraft = null;
    this.drag = null;
    this.dragPreview = null;
  }

  // --- Pointer events -------------------------------------------------------------

  private screenPt(e: PointerEvent | MouseEvent | WheelEvent): Vec2 {
    const r = this.view.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent): void => {
    this.view.canvas.setPointerCapture(e.pointerId);
    const sp = this.screenPt(e);
    const wp = this.view.screenToWorld(sp);
    const s = store.get();
    if (e.button === 1 || e.button === 2 || (e.button === 0 && this.spaceDown)) {
      if (e.button === 2 && (this.busDraft || this.shieldFrom)) {
        // Right click finishes a bus draft / cancels a shield wire.
        if (this.busDraft) this.finishBus();
        this.shieldFrom = null;
        this.push();
        return;
      }
      if (e.button === 2 && s.tool.kind !== 'select') {
        store.set({ tool: { kind: 'select' } });
        return;
      }
      this.drag = { kind: 'pan', startScreen: sp, startWorld: wp, moved: false };
      return;
    }
    if (e.button !== 0) return;
    const design = store.get().design;
    const level = currentLevel();
    if (!design || !level) return;

    switch (s.tool.kind) {
      case 'select': {
        const id = this.view.itemAt(wp);
        if (id) {
          const it = design.items.find((i) => i.id === id)!;
          this.select(id, e.shiftKey);
          if (!it.locked) this.drag = { kind: 'move', startScreen: sp, startWorld: wp, itemId: id, itemStart: { x: it.x, y: it.y }, moved: false };
          return;
        }
        const cid = this.view.conductorAt(wp) ?? this.view.shieldWireAt(wp);
        if (cid) {
          this.select(cid, e.shiftKey);
          return;
        }
        store.set({ selection: [] });
        this.drag = { kind: 'pan', startScreen: sp, startWorld: wp, moved: false };
        return;
      }
      case 'place': {
        this.placeAt(wp, e.shiftKey);
        return;
      }
      case 'bus': {
        this.busClick(wp);
        return;
      }
      case 'fence': {
        const p = { x: snap(wp.x), y: snap(wp.y) };
        this.drag = { kind: 'fence', startScreen: sp, startWorld: p, moved: false };
        this.fenceDraft = { x: p.x, y: p.y, w: 0, h: 0 };
        this.push();
        return;
      }
      case 'shieldwire': {
        const id = this.view.itemAt(wp);
        const it = id ? design.items.find((i) => i.id === id) : null;
        if (!it || it.kind !== 'mast') {
          this.shieldFrom = null;
          this.push();
          return;
        }
        if (!this.shieldFrom) this.shieldFrom = it.id;
        else {
          commit(addShieldWire(design, this.shieldFrom, it.id));
          this.shieldFrom = null;
        }
        this.push();
        return;
      }
      case 'erase': {
        const id = this.view.itemAt(wp);
        if (id) {
          commit(deleteItems(design, [id]));
          return;
        }
        const cid = this.view.conductorAt(wp);
        if (cid) {
          commit(deleteConductors(design, [cid]));
          return;
        }
        const sw = this.view.shieldWireAt(wp);
        if (sw) commit(deleteShieldWire(design, sw));
        return;
      }
    }
  };

  private onMove = (e: PointerEvent): void => {
    const sp = this.screenPt(e);
    const wp = this.view.screenToWorld(sp);
    const s = store.get();
    this.cursor = { x: snap(wp.x), y: snap(wp.y) };
    if (this.drag) {
      const dx = sp.x - this.drag.startScreen.x;
      const dy = sp.y - this.drag.startScreen.y;
      if (Math.hypot(dx, dy) > 3) this.drag.moved = true;
      if (this.drag.kind === 'pan') {
        this.view.panBy(e.movementX, e.movementY);
      } else if (this.drag.kind === 'move' && this.drag.moved) {
        const base = store.get().design!;
        const ddx = snap(wp.x - this.drag.startWorld.x);
        const ddy = snap(wp.y - this.drag.startWorld.y);
        const moving = base.items.find((i) => i.id === this.drag!.itemId);
        const to = moving ? alignPlacement(base, { ...moving, x: this.drag.itemStart!.x + ddx, y: this.drag.itemStart!.y + ddy }, moving.id) : { x: this.drag.itemStart!.x + ddx, y: this.drag.itemStart!.y + ddy };
        this.dragPreview = moveItem(base, this.drag.itemId!, to.x, to.y);
      } else if (this.drag.kind === 'fence') {
        const a = this.drag.startWorld;
        const b = this.cursor;
        this.fenceDraft = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
      }
      this.push();
      return;
    }
    // Hover feedback.
    this.hoverPort = s.tool.kind === 'bus' || s.tool.kind === 'select' ? this.view.portAt(wp) : null;
    if (s.tool.kind === 'bus') {
      const snapP = this.snapBusPoint(wp);
      this.cursor = snapP.point;
      if (this.busDraft) this.busDraft = { ...this.busDraft, cursor: snapP.point };
    }
    this.hover = s.tool.kind === 'select' || s.tool.kind === 'erase' || s.tool.kind === 'shieldwire' ? (this.view.itemAt(wp) ?? (s.tool.kind !== 'shieldwire' ? (this.view.conductorAt(wp) ?? this.view.shieldWireAt(wp)) : null)) : null;
    this.view.canvas.style.cursor = this.hover && s.tool.kind === 'select' ? 'pointer' : s.tool.kind === 'select' ? 'default' : 'crosshair';
    this.push();
  };

  private onUp = (e: PointerEvent): void => {
    try {
      this.view.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    const level = currentLevel();
    const base = store.get().design;
    if (!base || !level) return;
    if (d.kind === 'move' && this.dragPreview) {
      const moved = this.dragPreview.items.find((i) => i.id === d.itemId)!;
      const blocked = placementBlocked(this.dragPreview, level, itemRect(moved), moved.id);
      if (!blocked) commit(this.dragPreview);
      else store.set({ toast: { text: `Can't move there: ${blocked}`, tone: 'warn', at: Date.now() } });
      this.dragPreview = null;
    } else if (d.kind === 'fence' && this.fenceDraft) {
      const r = this.fenceDraft;
      this.fenceDraft = null;
      if (r.w >= 6 && r.h >= 6) {
        const side: Side = level.site.roadSide;
        const len = side === 'N' || side === 'S' ? r.w : r.h;
        const width = Math.min(6, Math.max(3, len - 2));
        commit(setFence(base, { rect: r, gate: { side, offset: snap((len - width) / 2), width } }));
        store.set({ tool: { kind: 'select' } });
      }
    }
    this.push();
  };

  private onLeave = (): void => {
    this.cursor = null;
    this.hover = null;
    this.hoverPort = null;
    this.push();
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015));
    this.view.zoomAt(this.screenPt(e), factor);
  };

  private onDblClick = (): void => {
    if (this.busDraft) this.finishBus();
  };

  // --- Keyboard -----------------------------------------------------------------------

  private onKey = (e: KeyboardEvent): void => {
    if (store.get().screen !== 'editor') return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
    const s = store.get();
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.code === 'Space') {
      this.spaceDown = true;
      if (this.busDraft) {
        this.busDraft = { ...this.busDraft, horizontalFirst: !this.busDraft.horizontalFirst };
        this.push();
      }
      e.preventDefault();
      return;
    }
    if (ctrl && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (ctrl && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (ctrl) return;
    switch (e.key) {
      case 'Escape':
        if (this.busDraft || this.shieldFrom || this.fenceDraft) this.cancelDrafts();
        else if (s.tool.kind !== 'select') store.set({ tool: { kind: 'select' } });
        else store.set({ selection: [] });
        this.push();
        break;
      case 'Enter':
        if (this.busDraft) this.finishBus();
        break;
      case 'Delete':
      case 'Backspace':
        this.deleteSelection();
        break;
      case 'r':
      case 'R':
        if (s.tool.kind === 'place') {
          this.ghostRot = ((this.ghostRot + 1) % 4) as Rotation;
          this.push();
        } else this.rotateSelection();
        break;
      case 'v':
      case 'V':
        store.set({ tool: { kind: 'select' } });
        break;
      case 'b':
      case 'B': {
        const level = currentLevel();
        if (!level) break;
        const kvs = [level.system.hvKV, ...(level.system.lvKV !== undefined ? [level.system.lvKV] : [])];
        const cur = s.tool.kind === 'bus' ? s.tool.kv : null;
        const next = cur === null ? kvs[0]! : kvs[(kvs.indexOf(cur) + 1) % kvs.length]!;
        store.set({ tool: { kind: 'bus', kv: next, elevation: 'low' } });
        break;
      }
      case 'f':
      case 'F':
        if (currentLevel()?.features.fence) store.set({ tool: { kind: 'fence' } });
        break;
      case 'e':
      case 'E':
        store.set({ tool: { kind: 'erase' } });
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') this.spaceDown = false;
  };

  // --- Actions ---------------------------------------------------------------------------

  private select(id: string, additive: boolean): void {
    const sel = store.get().selection;
    store.set({ selection: additive ? (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]) : [id] });
  }

  deleteSelection(): void {
    const s = store.get();
    if (!s.design || !s.selection.length) return;
    let d = deleteItems(s.design, s.selection);
    d = deleteConductors(d, s.selection);
    for (const id of s.selection) d = deleteShieldWire(d, id);
    commit(d);
    store.set({ selection: [] });
  }

  rotateSelection(): void {
    const s = store.get();
    if (!s.design) return;
    let d = s.design;
    for (const id of s.selection) d = rotateItem(d, id);
    if (d !== s.design) commit(d);
  }

  private placeAt(wp: Vec2, keepTool: boolean): void {
    const s = store.get();
    const level = currentLevel();
    const design = s.design;
    if (s.tool.kind !== 'place' || !design || !level) return;
    const kind = s.tool.item;
    const props = { ...(kind === 'transformer' || kind === 'mobile_pad' ? transformerProps(level) : {}), ...defaultPropsFor(kind) };
    const r0 = previewRect(kind, s.tool.kv, props, 0, 0, this.ghostRot);
    const { x, y } = alignPlacement(design, { kind, kv: s.tool.kv, props, rot: this.ghostRot, x: snap(wp.x - r0.w / 2), y: snap(wp.y - r0.h / 2) });
    const rect = previewRect(kind, s.tool.kv, props, x, y, this.ghostRot);
    const blocked = placementBlocked(design, level, rect);
    if (blocked) {
      store.set({ toast: { text: blocked, tone: 'warn', at: Date.now() } });
      return;
    }
    const it = makeItem(design, kind, x, y, this.ghostRot, s.tool.kv, props);
    if (kind === 'recloser') Object.assign(it.props, defaultRecloserRating(s.tool.kv, String(it.props.interrupter)) ?? {});
    if (kind === 'feeder_exit') {
      const used = new Set(design.items.filter((i) => i.kind === 'feeder_exit').map((i) => i.props.feeder));
      const free = level.system.feeders.find((f) => !used.has(f.name));
      if (free) it.props.feeder = free.name;
    }
    commit(addItem(design, it));
    store.set({ selection: [it.id], ...(keepTool ? {} : {}) });
  }

  /** Snap a bus point to ports, existing bus vertices/segments, or the grid. */
  private snapBusPoint(wp: Vec2): { point: Vec2; port?: WorldPort; conductorId?: string } {
    const design = this.design();
    const port = this.view.portAt(wp);
    if (port) return { point: port.pos, port };
    if (design) {
      const tol = 8 / this.view.cam.scale;
      for (const c of design.conductors) {
        for (const v of c.points) if (Math.hypot(v.x - wp.x, v.y - wp.y) <= tol) return { point: v, conductorId: c.id };
      }
      for (const c of design.conductors) {
        for (const [a, b] of segments(c.points)) {
          if (pointSegDist(wp, a, b) <= tol) {
            const horiz = Math.abs(a.y - b.y) < 1e-9;
            const p = horiz ? { x: snap(Math.min(Math.max(wp.x, Math.min(a.x, b.x)), Math.max(a.x, b.x))), y: a.y } : { x: a.x, y: snap(Math.min(Math.max(wp.y, Math.min(a.y, b.y)), Math.max(a.y, b.y))) };
            return { point: p, conductorId: c.id };
          }
        }
      }
    }
    return { point: { x: snap(wp.x), y: snap(wp.y) } };
  }

  private busClick(wp: Vec2): void {
    const s = store.get();
    if (s.tool.kind !== 'bus') return;
    const design = store.get().design;
    if (!design) return;
    const snapped = this.snapBusPoint(wp);
    if (!this.busDraft) {
      // Adopt the voltage of whatever we start on.
      let kv = s.tool.kv;
      if (snapped.port) {
        const it = design.items.find((i) => i.id === snapped.port!.itemId)!;
        kv = (it.kind === 'transformer' || it.kind === 'mobile_pad') && snapped.port.portId === 'lv' ? Number(it.props.lvKV) : it.kv || kv;
      } else if (snapped.conductorId) {
        kv = design.conductors.find((c) => c.id === snapped.conductorId)!.kv;
      }
      if (kv !== s.tool.kv) store.set({ tool: { ...s.tool, kv } });
      this.busDraft = { points: [snapped.point], cursor: snapped.point, kv, elevation: s.tool.elevation, horizontalFirst: true };
      this.push();
      return;
    }
    const d = this.busDraft;
    const last = d.points[d.points.length - 1]!;
    if (samePoint(last, snapped.point)) {
      this.finishBus();
      return;
    }
    const pts = [...d.points];
    if (Math.abs(last.x - snapped.point.x) > 1e-9 && Math.abs(last.y - snapped.point.y) > 1e-9) {
      pts.push(d.horizontalFirst ? { x: snapped.point.x, y: last.y } : { x: last.x, y: snapped.point.y });
    }
    pts.push(snapped.point);
    this.busDraft = { ...d, points: pts };
    // Finish automatically when we land on a terminal or an existing bus.
    if (snapped.port || snapped.conductorId) this.finishBus();
    else this.push();
  }

  private finishBus(): void {
    const d = this.busDraft;
    this.busDraft = null;
    const design = store.get().design;
    if (d && design && d.points.length >= 2) commit(addConductor(design, d.points, d.kv, d.elevation));
    this.push();
  }
}

function defaultPropsFor(kind: Parameters<typeof makeItem>[1]) {
  const p: Record<string, unknown> = {};
  for (const def of CATALOG[kind].props) p[def.key] = def.default;
  return p as Record<string, string | number | boolean | string[]>;
}

export function portsOf(design: Design): WorldPort[] {
  return design.items.flatMap((i) => itemPorts(i));
}
