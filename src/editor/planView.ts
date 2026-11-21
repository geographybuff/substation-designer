/**
 * Canvas 2D plan view: camera, rendering and hit testing. Renders on demand
 * (only when something changed) and honours the graphics settings.
 */
import { voltageClassFor } from '../data/bulletin/voltageClasses';
import { busHeight, CATALOG } from '../engine/catalog';
import { fenceRequiredDistance, gateSegment, removalPath } from '../engine/checks/physical';
import { pointSegDist, samePoint, segments } from '../engine/geometry';
import { footprintOf, itemPorts, itemRect, type WorldPort } from '../engine/items';
import { shieldingMap } from '../engine/lightning';
import type { DesignReview } from '../engine/review';
import type { Design, ItemKind, LevelDef, Props, Rect, Rotation, Severity, Vec2 } from '../engine/types';
import { effectivePixelRatio, frameIntervalMs, type GraphicsSettings } from '../settings/graphics';
import type { Overlays } from '../app/store';
import { drawItem } from './drawItems';
import { kvColor, THEME } from './theme';

export interface Ghost {
  kind: ItemKind;
  kv: number;
  props: Props;
  x: number;
  y: number;
  rot: Rotation;
  blocked: string | null;
}

export interface PlanState {
  design: Design;
  level: LevelDef;
  review: DesignReview | null;
  selection: ReadonlySet<string>;
  hover: string | null;
  hoverPort: WorldPort | null;
  overlays: Overlays;
  ghost: Ghost | null;
  busDraft: { points: Vec2[]; cursor: Vec2; kv: number; elevation: 'low' | 'high'; horizontalFirst: boolean } | null;
  fenceDraft: Rect | null;
  shieldDraft: { from: Vec2; cursor: Vec2 } | null;
  cursor: Vec2 | null;
  graphics: GraphicsSettings;
}

export interface Camera {
  /** World point at the canvas centre. */
  cx: number;
  cy: number;
  /** Pixels per metre. */
  scale: number;
}

const SEV_COLOR: Record<Severity, string> = { critical: THEME.critical, major: THEME.major, minor: THEME.minor, info: THEME.info };
const SEV_RANK: Record<Severity, number> = { critical: 0, major: 1, minor: 2, info: 3 };

export class PlanView {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  cam: Camera = { cx: 30, cy: 20, scale: 14 };
  private state: PlanState | null = null;
  private dirty = true;
  private raf = 0;
  private lastFrame = 0;
  private cssW = 1;
  private cssH = 1;
  private dpr = 1;
  private shieldCache: { design: Design; map: ReturnType<typeof shieldingMap>; zRef: number } | null = null;
  private removalCache: { design: Design; paths: Array<{ id: string; ok: boolean; path?: Vec2[] }> } | null = null;
  private disposed = false;
  private animT = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
  }

  setState(s: PlanState): void {
    this.state = s;
    this.invalidate();
  }

  invalidate(): void {
    this.dirty = true;
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, r.width);
    this.cssH = Math.max(1, r.height);
    const g = this.state?.graphics;
    this.dpr = g ? effectivePixelRatio(g, window.devicePixelRatio || 1) : window.devicePixelRatio || 1;
    const w = Math.round(this.cssW * this.dpr);
    const h = Math.round(this.cssH * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx.imageSmoothingEnabled = !!g?.antialias;
    this.invalidate();
  }

  // --- Camera -----------------------------------------------------------------

  worldToScreen(p: Vec2): Vec2 {
    return { x: (p.x - this.cam.cx) * this.cam.scale + this.cssW / 2, y: (p.y - this.cam.cy) * this.cam.scale + this.cssH / 2 };
  }

  screenToWorld(p: Vec2): Vec2 {
    return { x: (p.x - this.cssW / 2) / this.cam.scale + this.cam.cx, y: (p.y - this.cssH / 2) / this.cam.scale + this.cam.cy };
  }

  fit(rect: Rect, margin = 40): void {
    const sx = (this.cssW - 2 * margin) / Math.max(1, rect.w);
    const sy = (this.cssH - 2 * margin) / Math.max(1, rect.h);
    this.cam = { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, scale: Math.max(3, Math.min(60, Math.min(sx, sy))) };
    this.invalidate();
  }

  zoomAt(screen: Vec2, factor: number): void {
    const before = this.screenToWorld(screen);
    this.cam.scale = Math.max(3, Math.min(80, this.cam.scale * factor));
    const after = this.screenToWorld(screen);
    this.cam.cx += before.x - after.x;
    this.cam.cy += before.y - after.y;
    this.invalidate();
  }

  panBy(dxPx: number, dyPx: number): void {
    this.cam.cx -= dxPx / this.cam.scale;
    this.cam.cy -= dyPx / this.cam.scale;
    this.invalidate();
  }

  // --- Hit testing --------------------------------------------------------------

  itemAt(p: Vec2): string | null {
    const s = this.state;
    if (!s) return null;
    for (let i = s.design.items.length - 1; i >= 0; i--) {
      const it = s.design.items[i]!;
      const r = itemRect(it);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return it.id;
    }
    return null;
  }

  conductorAt(p: Vec2, tolPx = 7): string | null {
    const s = this.state;
    if (!s) return null;
    const tol = tolPx / this.cam.scale;
    let best: { id: string; d: number } | null = null;
    for (const c of s.design.conductors) {
      const extra = voltageClassFor(c.kv).rigidBusPhaseSpacingM;
      for (const [a, b] of segments(c.points)) {
        const d = pointSegDist(p, a, b);
        if (d <= tol + extra && (!best || d < best.d)) best = { id: c.id, d };
      }
    }
    return best?.id ?? null;
  }

  shieldWireAt(p: Vec2, tolPx = 6): string | null {
    const s = this.state;
    if (!s) return null;
    const masts = new Map(s.design.items.filter((i) => i.kind === 'mast').map((m) => [m.id, itemRect(m)]));
    for (const w of s.design.shieldWires) {
      const a = masts.get(w.a);
      const b = masts.get(w.b);
      if (!a || !b) continue;
      const pa = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const pb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      if (pointSegDist(p, pa, pb) <= tolPx / this.cam.scale) return w.id;
    }
    return null;
  }

  portAt(p: Vec2, tolPx = 10): WorldPort | null {
    const s = this.state;
    if (!s) return null;
    const tol = tolPx / this.cam.scale;
    let best: { port: WorldPort; d: number } | null = null;
    for (const it of s.design.items) {
      for (const port of itemPorts(it)) {
        const d = Math.hypot(port.pos.x - p.x, port.pos.y - p.y);
        if (d <= tol && (!best || d < best.d)) best = { port, d };
      }
    }
    return best?.port ?? null;
  }

  // --- Render loop -----------------------------------------------------------------

  private loop(t: number): void {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const s = this.state;
    const animating = !!s && s.graphics.animations && !s.graphics.reduceMotion && !!s.review && s.review.counts.critical === 0;
    if (!this.dirty && !animating) return;
    const interval = s ? frameIntervalMs(s.graphics) : 0;
    const minInterval = animating && !this.dirty ? Math.max(interval, 1000 / 30) : interval;
    if (minInterval && t - this.lastFrame < minInterval - 1) return;
    this.lastFrame = t;
    this.animT = t / 1000;
    this.dirty = false;
    this.render();
  }

  render(): void {
    const s = this.state;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = THEME.outside;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    if (!s) return;
    const { design, level } = s;
    const sc = this.cam.scale;
    const px = (n: number) => n / sc;
    // World transform.
    ctx.setTransform(this.dpr * sc, 0, 0, this.dpr * sc, this.dpr * (this.cssW / 2 - this.cam.cx * sc), this.dpr * (this.cssH / 2 - this.cam.cy * sc));

    // Site parcel.
    ctx.fillStyle = THEME.grass;
    ctx.fillRect(0, 0, level.site.width, level.site.depth);
    ctx.strokeStyle = THEME.grassEdge;
    ctx.lineWidth = px(2);
    ctx.setLineDash([px(8), px(5)]);
    ctx.strokeRect(0, 0, level.site.width, level.site.depth);
    ctx.setLineDash([]);
    this.drawRoad(level);

    for (const nb of level.site.noBuild ?? []) {
      ctx.fillStyle = THEME.noBuild;
      ctx.fillRect(nb.x, nb.y, nb.w, nb.h);
      ctx.strokeStyle = THEME.noBuildEdge;
      ctx.lineWidth = px(1.5);
      ctx.strokeRect(nb.x, nb.y, nb.w, nb.h);
      this.label(nb.label, { x: nb.x + nb.w / 2, y: nb.y + nb.h / 2 }, THEME.noBuildEdge, 11);
    }

    // Yard surfacing.
    const fence = design.fence;
    if (fence) {
      ctx.fillStyle = design.surfacing.material === 'none' ? 'rgba(120,110,90,0.35)' : THEME.gravel;
      ctx.fillRect(fence.rect.x - 1, fence.rect.y - 1, fence.rect.w + 2, fence.rect.h + 2);
    }

    // Grid.
    if (s.overlays.grid && sc > 6) this.drawGrid(level);

    if (level.expansionArea) {
      const ea = level.expansionArea;
      ctx.fillStyle = THEME.expansion;
      ctx.fillRect(ea.x, ea.y, ea.w, ea.h);
      ctx.strokeStyle = THEME.expansionEdge;
      ctx.lineWidth = px(1.5);
      ctx.setLineDash([px(6), px(4)]);
      ctx.strokeRect(ea.x, ea.y, ea.w, ea.h);
      ctx.setLineDash([]);
      this.label('Future expansion', { x: ea.x + ea.w / 2, y: ea.y + ea.h / 2 }, THEME.expansionEdge, 11);
    }

    // Ground grid overlay.
    if (s.overlays.grounding && fence && design.groundGrid.enabled) this.drawGroundGrid(design);

    // Shielding overlay.
    if (s.overlays.shielding) this.drawShielding(design, level);

    // Fence and its safety zone.
    if (fence) {
      if (s.overlays.fenceZone) this.drawFenceZone(design, level);
      this.drawFence(design);
    }

    // Conductors.
    for (const c of design.conductors) this.drawConductor(c.points, c.kv, c.elevation, s.selection.has(c.id) ? 'sel' : s.hover === c.id ? 'hover' : null);
    this.drawJunctions(design);

    // Items.
    const detail = s.graphics.detail3d;
    for (const it of design.items) {
      const fp = footprintOf(it);
      const r = itemRect(it, fp);
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate((it.rot * Math.PI) / 2);
      drawItem(ctx, it, fp, { scale: sc, detail });
      ctx.restore();
      if (s.selection.has(it.id) || s.hover === it.id) {
        ctx.strokeStyle = s.selection.has(it.id) ? THEME.select : THEME.hover;
        ctx.lineWidth = px(s.selection.has(it.id) ? 2.5 : 2);
        ctx.strokeRect(r.x - px(3), r.y - px(3), r.w + px(6), r.h + px(6));
      }
      if (it.locked && sc > 8) {
        ctx.fillStyle = THEME.textDim;
        ctx.font = `${px(9)}px system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('🔒', r.x + px(2), r.y + px(2));
      }
    }

    // Shield wires.
    this.drawShieldWires(design);

    // Removal paths.
    if (s.overlays.removal && fence) this.drawRemoval(design);

    // Ports.
    const connected = new Set(s.review ? [...s.review.topo.nodeOfPort.keys()] : []);
    for (const it of design.items) {
      for (const p of itemPorts(it)) {
        const ok = connected.has(`${p.itemId}:${p.portId}`);
        const isHover = s.hoverPort && s.hoverPort.itemId === p.itemId && s.hoverPort.portId === p.portId;
        const r = Math.max(px(isHover ? 6 : 4), 0.12);
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = ok ? THEME.portOk : THEME.portOpen;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = px(1);
        ctx.stroke();
      }
    }

    // Labels.
    if (s.overlays.labels && sc > 7) {
      for (const it of design.items) {
        const r = itemRect(it);
        const focused = s.selection.has(it.id) || s.hover === it.id;
        const full = it.label ?? it.id;
        const text = focused || full.length <= 14 ? full : it.id;
        const kvText = it.kind === 'transformer' ? `${Number(it.props.kva) / 1000} MVA` : it.kind === 'mast' ? `${it.props.heightM} m` : '';
        this.label(text + (kvText ? ` · ${kvText}` : ''), { x: r.x + r.w / 2, y: r.y + r.h + px(9) }, THEME.textDim, 11);
      }
    }

    // Finding markers.
    if (s.review) this.drawFindingMarkers(design, s.review);

    // Drafts and ghosts.
    if (s.busDraft) this.drawBusDraft(s.busDraft);
    if (s.fenceDraft) {
      ctx.strokeStyle = THEME.fence;
      ctx.lineWidth = px(2);
      ctx.setLineDash([px(6), px(4)]);
      ctx.strokeRect(s.fenceDraft.x, s.fenceDraft.y, s.fenceDraft.w, s.fenceDraft.h);
      ctx.setLineDash([]);
      this.label(`${s.fenceDraft.w.toFixed(1)} × ${s.fenceDraft.h.toFixed(1)} m`, { x: s.fenceDraft.x + s.fenceDraft.w / 2, y: s.fenceDraft.y - px(10) }, THEME.text, 12);
    }
    if (s.shieldDraft) {
      ctx.strokeStyle = THEME.shieldWire;
      ctx.lineWidth = px(1.5);
      ctx.setLineDash([px(4), px(4)]);
      ctx.beginPath();
      ctx.moveTo(s.shieldDraft.from.x, s.shieldDraft.from.y);
      ctx.lineTo(s.shieldDraft.cursor.x, s.shieldDraft.cursor.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (s.ghost) {
      const g = s.ghost;
      const fake = { id: '_ghost', kind: g.kind, kv: g.kv, props: g.props, x: g.x, y: g.y, rot: g.rot };
      const fp = footprintOf(fake);
      const r = itemRect(fake, fp);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate((g.rot * Math.PI) / 2);
      drawItem(ctx, fake, fp, { scale: sc, detail, ghost: g.blocked ? 'bad' : 'ok' });
      ctx.restore();
      if (g.blocked) this.label(g.blocked, { x: r.x + r.w / 2, y: r.y - px(10) }, THEME.critical, 12);
      else if (g.kind === 'mast') this.drawMastRing({ x: r.x + 0.5, y: r.y + 0.5 }, Number(g.props.heightM) || 18);
    }

    // Cursor coordinate readout.
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (s.cursor) {
      ctx.fillStyle = 'rgba(15,23,42,0.7)';
      ctx.fillRect(this.cssW - 132, this.cssH - 26, 126, 20);
      ctx.fillStyle = THEME.textDim;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`x ${s.cursor.x.toFixed(1)}  y ${s.cursor.y.toFixed(1)} m`, this.cssW - 12, this.cssH - 16);
    }
    this.drawScaleBar();
  }

  // --- Drawing helpers -------------------------------------------------------------------

  private label(text: string, at: Vec2, color: string, sizePx: number): void {
    const ctx = this.ctx;
    const sc = this.cam.scale;
    ctx.font = `${sizePx / sc}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(15,23,42,0.6)';
    ctx.fillRect(at.x - w / 2 - 3 / sc, at.y - (sizePx * 0.65) / sc, w + 6 / sc, (sizePx * 1.3) / sc);
    ctx.fillStyle = color;
    ctx.fillText(text, at.x, at.y);
  }

  private drawRoad(level: LevelDef): void {
    const ctx = this.ctx;
    const { width: W, depth: D, roadSide } = level.site;
    ctx.fillStyle = '#4b4b48';
    const t = 6;
    if (roadSide === 'S') ctx.fillRect(-20, D + 2, W + 40, t);
    if (roadSide === 'N') ctx.fillRect(-20, -2 - t, W + 40, t);
    if (roadSide === 'E') ctx.fillRect(W + 2, -20, t, D + 40);
    if (roadSide === 'W') ctx.fillRect(-2 - t, -20, t, D + 40);
  }

  private drawGrid(level: LevelDef): void {
    const ctx = this.ctx;
    const sc = this.cam.scale;
    const tl = this.screenToWorld({ x: 0, y: 0 });
    const br = this.screenToWorld({ x: this.cssW, y: this.cssH });
    const x0 = Math.max(0, Math.floor(tl.x));
    const x1 = Math.min(level.site.width, Math.ceil(br.x));
    const y0 = Math.max(0, Math.floor(tl.y));
    const y1 = Math.min(level.site.depth, Math.ceil(br.y));
    const step = sc > 22 ? 0.5 : 1;
    ctx.lineWidth = 1 / sc;
    ctx.beginPath();
    ctx.strokeStyle = THEME.gridMinor;
    for (let x = x0; x <= x1; x += step) {
      if (x % 5 === 0) continue;
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
    }
    for (let y = y0; y <= y1; y += step) {
      if (y % 5 === 0) continue;
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = THEME.gridMajor;
    for (let x = Math.ceil(x0 / 5) * 5; x <= x1; x += 5) {
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
    }
    for (let y = Math.ceil(y0 / 5) * 5; y <= y1; y += 5) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
  }

  private drawFence(design: Design): void {
    const ctx = this.ctx;
    const f = design.fence!;
    const sc = this.cam.scale;
    const gate = gateSegment(design)!;
    const r = f.rect;
    const corners = [
      { x: r.x, y: r.y },
      { x: r.x + r.w, y: r.y },
      { x: r.x + r.w, y: r.y + r.h },
      { x: r.x, y: r.y + r.h },
    ];
    ctx.strokeStyle = THEME.fence;
    ctx.lineWidth = 2.2 / sc;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % 4]!;
      // Split around the gate if it lies on this side.
      const onSide = pointSegDist(gate.a, a, b) < 1e-6 && pointSegDist(gate.b, a, b) < 1e-6;
      if (!onSide) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        continue;
      }
      const da = Math.hypot(gate.a.x - a.x, gate.a.y - a.y);
      const db = Math.hypot(gate.b.x - a.x, gate.b.y - a.y);
      const [g1, g2] = da < db ? [gate.a, gate.b] : [gate.b, gate.a];
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(g1.x, g1.y);
      ctx.moveTo(g2.x, g2.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    // Posts every ~3 m.
    ctx.fillStyle = THEME.fence;
    const post = 3 / sc;
    for (let i = 0; i < 4; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % 4]!;
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.round(L / 3));
      for (let k = 0; k <= n; k++) {
        const x = a.x + ((b.x - a.x) * k) / n;
        const y = a.y + ((b.y - a.y) * k) / n;
        ctx.fillRect(x - post / 2, y - post / 2, post, post);
      }
    }
    // Gate swing marks.
    ctx.strokeStyle = THEME.fence;
    ctx.lineWidth = 1.2 / sc;
    ctx.setLineDash([4 / sc, 3 / sc]);
    ctx.beginPath();
    ctx.moveTo(gate.a.x, gate.a.y);
    ctx.lineTo(gate.b.x, gate.b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    this.label('GATE', { x: (gate.a.x + gate.b.x) / 2, y: (gate.a.y + gate.b.y) / 2 }, THEME.fence, 10);
  }

  private drawFenceZone(design: Design, level: LevelDef): void {
    const ctx = this.ctx;
    const f = design.fence!.rect;
    // Use the highest system voltage and a typical low-profile equipment height of 3 m.
    const kv = Math.max(level.system.hvKV, level.system.lvKV ?? 0);
    const zone = fenceRequiredDistance(3, kv, level.site.altitudeM);
    if (zone <= 0) return;
    ctx.fillStyle = THEME.fenceZone;
    ctx.beginPath();
    ctx.rect(f.x, f.y, f.w, f.h);
    ctx.rect(f.x + zone, f.y + zone, Math.max(0, f.w - 2 * zone), Math.max(0, f.h - 2 * zone));
    ctx.fill('evenodd');
  }

  private conductorWidth(): number {
    return Math.max(1.4, Math.min(3, this.cam.scale * 0.09)) / this.cam.scale;
  }

  private drawConductor(points: readonly Vec2[], kv: number, elevation: 'low' | 'high', mark: 'sel' | 'hover' | null, alpha = 1): void {
    const ctx = this.ctx;
    const s = voltageClassFor(kv).rigidBusPhaseSpacingM;
    const color = kvColor(kv);
    ctx.globalAlpha = alpha;
    if (mark) {
      ctx.strokeStyle = mark === 'sel' ? THEME.select : THEME.hover;
      ctx.lineWidth = 2 * s + 0.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = alpha * 0.35;
      ctx.beginPath();
      points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }
    if (elevation === 'high') {
      ctx.strokeStyle = 'rgba(15,23,42,0.45)';
      ctx.lineWidth = 2 * s + 0.35;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = this.conductorWidth();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    for (const off of [-s, 0, s]) {
      ctx.beginPath();
      for (const [a, b] of segments(points)) {
        const horiz = Math.abs(a.y - b.y) < 1e-9;
        const ox = horiz ? 0 : off;
        const oy = horiz ? off : 0;
        ctx.moveTo(a.x + ox, a.y + oy);
        ctx.lineTo(b.x + ox, b.y + oy);
      }
      ctx.stroke();
    }
    // Animated flow dashes along the centre phase.
    const st = this.state;
    if (st && st.graphics.animations && !st.graphics.reduceMotion && alpha === 1 && st.review && st.review.counts.critical === 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = this.conductorWidth() * 0.8;
      const dash = 0.6;
      ctx.setLineDash([dash, dash * 3]);
      ctx.lineDashOffset = -this.animT * 2.5;
      ctx.beginPath();
      points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Bus support stands every ~6 m at low-profile runs.
    if (elevation === 'high' && this.cam.scale > 10) {
      ctx.fillStyle = THEME.textDim;
      const mid = points[Math.floor(points.length / 2)]!;
      ctx.font = `${9 / this.cam.scale}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`high ${busHeight(kv, 'high')} m`, mid.x, mid.y - s - 6 / this.cam.scale);
    }
    ctx.globalAlpha = 1;
  }

  private drawJunctions(design: Design): void {
    const ctx = this.ctx;
    const r = Math.max(0.12, 3 / this.cam.scale);
    for (const c of design.conductors) {
      for (const v of [c.points[0], c.points[c.points.length - 1]]) {
        if (!v) continue;
        const touches = design.conductors.some((o) => o !== c && [...segments(o.points)].some(([a, b]) => pointSegDist(v, a, b) < 1e-3));
        if (!touches) continue;
        ctx.fillStyle = kvColor(c.kv);
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawBusDraft(d: NonNullable<PlanState['busDraft']>): void {
    const pts = [...d.points];
    const last = pts[pts.length - 1];
    if (last && !samePoint(last, d.cursor)) {
      const a = last;
      const b = d.cursor;
      if (Math.abs(a.x - b.x) > 1e-9 && Math.abs(a.y - b.y) > 1e-9) pts.push(d.horizontalFirst ? { x: b.x, y: a.y } : { x: a.x, y: b.y });
      pts.push(b);
    }
    if (pts.length >= 2) this.drawConductor(pts, d.kv, d.elevation, null, 0.6);
    const ctx = this.ctx;
    ctx.fillStyle = kvColor(d.kv);
    for (const p of d.points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 / this.cam.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawShieldWires(design: Design): void {
    const ctx = this.ctx;
    const masts = new Map(design.items.filter((i) => i.kind === 'mast').map((m) => [m.id, itemRect(m)]));
    ctx.strokeStyle = THEME.shieldWire;
    ctx.lineWidth = 1.2 / this.cam.scale;
    ctx.setLineDash([5 / this.cam.scale, 3 / this.cam.scale]);
    for (const w of design.shieldWires) {
      const a = masts.get(w.a);
      const b = masts.get(w.b);
      if (!a || !b) continue;
      const sel = this.state?.selection.has(w.id);
      ctx.strokeStyle = sel ? THEME.select : THEME.shieldWire;
      ctx.beginPath();
      ctx.moveTo(a.x + a.w / 2, a.y + a.h / 2);
      ctx.lineTo(b.x + b.w / 2, b.y + b.h / 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  private drawMastRing(c: Vec2, h: number): void {
    const ctx = this.ctx;
    const z = 4.5;
    const r = Math.max(0, (h - z) * Math.tan(Math.PI / 6));
    ctx.strokeStyle = 'rgba(74,222,128,0.7)';
    ctx.lineWidth = 1.5 / this.cam.scale;
    ctx.setLineDash([4 / this.cam.scale, 4 / this.cam.scale]);
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawShielding(design: Design, level: LevelDef): void {
    const bounds = design.fence ? { x: design.fence.rect.x - 2, y: design.fence.rect.y - 2, w: design.fence.rect.w + 4, h: design.fence.rect.h + 4 } : { x: 0, y: 0, w: level.site.width, h: level.site.depth };
    const items = design.items.filter((i) => CATALOG[i.kind].live && i.kind !== 'line_terminal' && i.kind !== 'feeder_exit');
    const zRef = items.length ? Math.max(...items.map((i) => footprintOf(i).liveHeight)) : 4.5;
    if (!this.shieldCache || this.shieldCache.design !== design || this.shieldCache.zRef !== zRef) {
      const cell = this.state?.graphics.detail3d === 'low' ? 1 : 0.5;
      this.shieldCache = { design, zRef, map: shieldingMap(design, bounds, zRef, cell, { method: 'fixed_angle' }) };
    }
    const m = this.shieldCache.map;
    const ctx = this.ctx;
    for (let j = 0; j < m.rows; j++) {
      for (let i = 0; i < m.cols; i++) {
        ctx.fillStyle = m.data[j * m.cols + i] ? THEME.protected : THEME.exposed;
        ctx.fillRect(m.x0 + i * m.cell, m.y0 + j * m.cell, m.cell + 0.01, m.cell + 0.01);
      }
    }
    for (const mast of design.items.filter((i) => i.kind === 'mast')) {
      const r = itemRect(mast);
      this.drawMastRing({ x: r.x + 0.5, y: r.y + 0.5 }, Number(mast.props.heightM) || 18);
    }
    this.label(`Protection at ${zRef.toFixed(1)} m (fixed angle 30°/45°)`, { x: bounds.x + bounds.w / 2, y: bounds.y - 1 }, '#bbf7d0', 11);
  }

  private drawGroundGrid(design: Design): void {
    const ctx = this.ctx;
    const f = design.fence!.rect;
    const g = design.groundGrid;
    const e = g.extendBeyondFenceM;
    const r = { x: f.x - e, y: f.y - e, w: f.w + 2 * e, h: f.h + 2 * e };
    const D = Math.max(0.5, g.spacingM);
    ctx.strokeStyle = THEME.copper;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.4 / this.cam.scale;
    ctx.beginPath();
    const nx = Math.max(1, Math.round(r.w / D));
    const ny = Math.max(1, Math.round(r.h / D));
    for (let i = 0; i <= nx; i++) {
      const x = r.x + (r.w * i) / nx;
      ctx.moveTo(x, r.y);
      ctx.lineTo(x, r.y + r.h);
    }
    for (let j = 0; j <= ny; j++) {
      const y = r.y + (r.h * j) / ny;
      ctx.moveTo(r.x, y);
      ctx.lineTo(r.x + r.w, y);
    }
    ctx.stroke();
    // Rods spread around the perimeter.
    ctx.fillStyle = THEME.copper;
    const per = 2 * (r.w + r.h);
    for (let k = 0; k < g.rodCount; k++) {
      let t = (per * k) / Math.max(1, g.rodCount);
      let x: number;
      let y: number;
      if (t < r.w) [x, y] = [r.x + t, r.y];
      else if ((t -= r.w) < r.h) [x, y] = [r.x + r.w, r.y + t];
      else if ((t -= r.h) < r.w) [x, y] = [r.x + r.w - t, r.y + r.h];
      else [x, y] = [r.x, r.y + r.h - (t - r.w)];
      ctx.beginPath();
      ctx.arc(x, y, 3.5 / this.cam.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawRemoval(design: Design): void {
    if (!this.removalCache || this.removalCache.design !== design) {
      const rects = new Map(design.items.map((i) => [i.id, itemRect(i)]));
      const paths = design.items.filter((i) => i.kind === 'transformer' || i.kind === 'breaker').map((i) => ({ id: i.id, ...removalPath(design, i, rects) }));
      this.removalCache = { design, paths };
    }
    const ctx = this.ctx;
    for (const p of this.removalCache.paths) {
      const it = design.items.find((i) => i.id === p.id);
      if (!it) continue;
      const r = itemRect(it);
      if (p.ok && p.path) {
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 2 / this.cam.scale;
        ctx.setLineDash([6 / this.cam.scale, 4 / this.cam.scale]);
        ctx.beginPath();
        p.path.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        this.label('✖ no removal route', { x: r.x + r.w / 2, y: r.y - 0.8 }, THEME.critical, 11);
      }
    }
  }

  private drawFindingMarkers(design: Design, review: DesignReview): void {
    const worst = new Map<string, Severity>();
    for (const f of review.findings) {
      if (f.severity === 'info') continue;
      for (const id of [...(f.itemIds ?? []), ...(f.conductorIds ?? [])]) {
        const prev = worst.get(id);
        if (!prev || SEV_RANK[f.severity] < SEV_RANK[prev]) worst.set(id, f.severity);
      }
    }
    const ctx = this.ctx;
    const r = Math.max(0.35, 7 / this.cam.scale);
    const mark = (at: Vec2, sev: Severity) => {
      ctx.fillStyle = SEV_COLOR[sev];
      ctx.beginPath();
      ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${r * 1.5}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', at.x, at.y + r * 0.08);
    };
    for (const it of design.items) {
      const sev = worst.get(it.id);
      if (!sev) continue;
      const rect = itemRect(it);
      mark({ x: rect.x + rect.w, y: rect.y }, sev);
    }
    for (const c of design.conductors) {
      const sev = worst.get(c.id);
      if (!sev || c.points.length < 2) continue;
      const a = c.points[0]!;
      const b = c.points[1]!;
      mark({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, sev);
    }
  }

  private drawScaleBar(): void {
    const ctx = this.ctx;
    const sc = this.cam.scale;
    const meters = sc > 30 ? 2 : sc > 15 ? 5 : sc > 7 ? 10 : 20;
    const w = meters * sc;
    const x = 14;
    const y = this.cssH - 18;
    ctx.fillStyle = 'rgba(15,23,42,0.7)';
    ctx.fillRect(x - 6, y - 14, w + 56, 22);
    ctx.strokeStyle = THEME.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y + 4);
    ctx.moveTo(x + w, y - 4);
    ctx.lineTo(x + w, y + 4);
    ctx.stroke();
    ctx.fillStyle = THEME.text;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${meters} m`, x + w + 6, y);
  }
}
