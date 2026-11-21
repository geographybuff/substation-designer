/**
 * Rigid bus. Each SceneConductor polyline becomes three aluminum pipes (one per
 * phase, offset by the phase spacing with mitred corners) at the conductor
 * height, carried on station-post bus supports.
 *
 * Junctions: two conductor ends meeting at a free point are joined into one
 * continuous run (so corners mitre cleanly). A conductor ending on another run
 * is a tap: it is drawn lower (by the phase-to-phase clearance) and each phase
 * rises vertically to its own phase of the main run, so taps never visually
 * short across the main bus. Ends at a device port get flexible jumpers to that
 * device's terminals.
 */
import type { LineBasicMaterial, Vector3 } from 'three';
import type { SceneModel } from '../engine/scene';
import type { Vec2 } from '../engine/types';
import type { LineBatch, PartBatch } from './batch';
import { column, girder, postHeight, vclass } from './models/common';
import type { Parts } from './parts';

export interface PortRef {
  itemId: string;
  portId: string;
  pos: Vec2;
  /** Outward unit direction in plan. */
  dir: Vec2;
  /** Device terminals in world coordinates (one per phase), if the model defines them. */
  terminals: Vector3[] | null;
}

type EndKind = { t: 'free' } | { t: 'port'; ports: PortRef[] } | { t: 'tee'; at: Vec2 };

export interface Chain {
  pts: Vec2[];
  owners: string[];
  live: boolean[];
  height: number;
  sp: number;
  kv: number;
  closed: boolean;
  start: EndKind;
  end: EndKind;
  /** How far the run is lowered below its nominal height (taps). */
  drop: number;
}

const EPS = 0.02;
const MAX_SPAN = 6;
const key = (p: Vec2) => `${Math.round(p.x * 50)},${Math.round(p.y * 50)}`;

function pointSegDist(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  let t = len2 < 1e-12 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

const near = (a: Vec2, b: Vec2) => Math.abs(a.x - b.x) <= EPS && Math.abs(a.y - b.y) <= EPS;

function unit(dx: number, dy: number): Vec2 {
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
}

/** Pipe radius by voltage class (2-4 in. aluminum pipe, slightly exaggerated for legibility). */
export function pipeRadius(kv: number): number {
  return kv <= 38 ? 0.038 : kv <= 72.5 ? 0.046 : kv <= 169 ? 0.056 : 0.066;
}

/** Offset polyline by `o` along the left normal with mitred joints. */
export function offsetPolyline(pts: readonly Vec2[], closed: boolean, o: number): Vec2[] {
  const n = pts.length;
  const segN: Vec2[] = [];
  for (let i = 0; i + 1 < n; i++) {
    const d = unit(pts[i + 1]!.x - pts[i]!.x, pts[i + 1]!.y - pts[i]!.y);
    segN.push({ x: -d.y, y: d.x });
  }
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    let n0 = i > 0 ? segN[i - 1] : closed ? segN[segN.length - 1] : undefined;
    let n1 = i < n - 1 ? segN[i] : closed ? segN[0] : undefined;
    n0 = n0 ?? n1!;
    n1 = n1 ?? n0;
    let mx = n0.x + n1.x;
    let my = n0.y + n1.y;
    const ml = Math.hypot(mx, my);
    if (ml < 1e-6) {
      mx = n0.x;
      my = n0.y;
    } else {
      mx /= ml;
      my /= ml;
    }
    const cos = mx * n0.x + my * n0.y;
    const s = o / Math.max(0.25, cos);
    out.push({ x: pts[i]!.x + mx * s, y: pts[i]!.y + my * s });
  }
  return out;
}

/** Group conductors into continuous runs and classify their ends. Pure: exported for tests. */
export function buildChains(model: Pick<SceneModel, 'conductors'>, ports: readonly PortRef[]): Chain[] {
  const conds = model.conductors
    .map((c) => {
      const pts: Vec2[] = [];
      for (const p of c.points) if (!pts.length || !near(pts[pts.length - 1]!, p)) pts.push({ x: p.x, y: p.y });
      return { c, pts };
    })
    .filter((x) => x.pts.length >= 2);

  const portIndex = new Map<string, PortRef[]>();
  for (const p of ports) {
    const k = key(p.pos);
    const l = portIndex.get(k);
    if (l) l.push(p);
    else portIndex.set(k, [p]);
  }
  type CEnd = { ci: number; end: 0 | 1 };
  const ek = (e: CEnd) => `${e.ci}:${e.end}`;
  const endPt = (e: CEnd) => {
    const pts = conds[e.ci]!.pts;
    return e.end === 0 ? pts[0]! : pts[pts.length - 1]!;
  };
  const outDir = (e: CEnd) => {
    const pts = conds[e.ci]!.pts;
    const a = e.end === 0 ? pts[0]! : pts[pts.length - 1]!;
    const b = e.end === 0 ? pts[1]! : pts[pts.length - 2]!;
    return unit(b.x - a.x, b.y - a.y);
  };
  const nodes = new Map<string, CEnd[]>();
  conds.forEach((_, ci) => {
    for (const end of [0, 1] as const) {
      const k = key(endPt({ ci, end }));
      const l = nodes.get(k);
      if (l) l.push({ ci, end });
      else nodes.set(k, [{ ci, end }]);
    }
  });
  const passesThrough = (pt: Vec2) =>
    conds.some(({ pts }) => {
      if (near(pts[0]!, pt) || near(pts[pts.length - 1]!, pt)) return false;
      for (let i = 0; i + 1 < pts.length; i++) if (pointSegDist(pt, pts[i]!, pts[i + 1]!) <= EPS) return true;
      return false;
    });

  const join = new Map<string, CEnd>();
  const kinds = new Map<string, EndKind>();
  for (const [k, ends] of nodes) {
    const pt = endPt(ends[0]!);
    const prts = portIndex.get(k);
    if (prts && prts.length) {
      for (const e of ends) kinds.set(ek(e), { t: 'port', ports: prts });
      continue;
    }
    if (passesThrough(pt)) {
      for (const e of ends) kinds.set(ek(e), { t: 'tee', at: pt });
      continue;
    }
    if (ends.length === 1) {
      kinds.set(ek(ends[0]!), { t: 'free' });
      continue;
    }
    let best: [CEnd, CEnd] | null = null;
    let bestScore = 0.7;
    for (let i = 0; i < ends.length; i++) {
      for (let j = i + 1; j < ends.length; j++) {
        const a = ends[i]!;
        const b = ends[j]!;
        const ca = conds[a.ci]!.c;
        const cb = conds[b.ci]!.c;
        if (Math.abs(ca.height - cb.height) > 1e-3 || Math.abs(ca.phaseSpacing - cb.phaseSpacing) > 1e-3) continue;
        const da = outDir(a);
        const db = outDir(b);
        const score = da.x * db.x + da.y * db.y;
        if (score < bestScore) {
          bestScore = score;
          best = [a, b];
        }
      }
    }
    if (best) {
      join.set(ek(best[0]), best[1]);
      join.set(ek(best[1]), best[0]);
      for (const e of ends) if (e !== best[0] && e !== best[1]) kinds.set(ek(e), { t: 'tee', at: pt });
    } else {
      for (const e of ends) kinds.set(ek(e), { t: 'free' });
    }
  }

  const used = new Array<boolean>(conds.length).fill(false);
  const chains: Chain[] = [];
  for (let ci = 0; ci < conds.length; ci++) {
    if (used[ci]) continue;
    // Walk back to the head of the run.
    let x = ci;
    let e: 0 | 1 = 0;
    let closed = false;
    const seen = new Set<number>([ci]);
    for (;;) {
      const pr = join.get(`${x}:${e}`);
      if (!pr) break;
      if (seen.has(pr.ci)) {
        closed = true;
        break;
      }
      seen.add(pr.ci);
      x = pr.ci;
      e = (1 - pr.end) as 0 | 1;
    }
    if (closed) {
      x = ci;
      e = 0;
    }
    const headKind = kinds.get(`${x}:${e}`) ?? { t: 'free' };
    const pts: Vec2[] = [];
    const owners: string[] = [];
    const live: boolean[] = [];
    const visited = new Set<number>();
    let startEnd: 0 | 1 = e;
    let tailKind: EndKind = { t: 'free' };
    for (;;) {
      visited.add(x);
      used[x] = true;
      const { c, pts: cp0 } = conds[x]!;
      const cp = startEnd === 1 ? [...cp0].reverse() : cp0;
      for (let i = 0; i < cp.length; i++) {
        if (pts.length > 0 && i === 0) continue;
        if (pts.length > 0) {
          owners.push(c.id);
          live.push(c.energized);
        }
        pts.push(cp[i]!);
      }
      const exitEnd = (1 - startEnd) as 0 | 1;
      const pr = join.get(`${x}:${exitEnd}`);
      if (!pr || visited.has(pr.ci)) {
        tailKind = kinds.get(`${x}:${exitEnd}`) ?? { t: 'free' };
        break;
      }
      x = pr.ci;
      startEnd = pr.end;
    }
    const c0 = conds[ci]!.c;
    const start = closed ? ({ t: 'free' } as EndKind) : headKind;
    const end = closed ? ({ t: 'free' } as EndKind) : tailKind;
    const tee = start.t === 'tee' || end.t === 'tee';
    chains.push({
      pts,
      owners,
      live,
      height: c0.height,
      sp: c0.phaseSpacing,
      kv: c0.kv,
      closed,
      start,
      end,
      drop: tee ? vclass(c0.kv).minMetalToMetalM + 0.15 : 0,
    });
  }
  return chains;
}

interface Ctx {
  p: Parts;
  batch: PartBatch;
}

function own(ctx: Ctx, id: string): void {
  ctx.p.use(ctx.batch, id);
}

function jumpers(ctx: Ctx, phase: readonly Vec2[], h: number, port: PortRef): void {
  const T = port.terminals;
  if (!T || T.length === 0) return;
  const ax = -port.dir.y;
  const ay = port.dir.x;
  const P = phase.map((q) => ({ q, s: q.x * ax + q.y * ay })).sort((a, b) => a.s - b.s);
  const Ts = T.map((t) => ({ t, s: t.x * ax + t.z * ay })).sort((a, b) => a.s - b.s);
  for (let i = 0; i < P.length; i++) {
    const q = P[i]!.q;
    let t = Ts.length === P.length ? Ts[i]!.t : Ts[0]!.t;
    if (Ts.length !== P.length) {
      let bd = Infinity;
      for (const c of Ts) {
        const dd = Math.abs(c.s - P[i]!.s);
        if (dd < bd) {
          bd = dd;
          t = c.t;
        }
      }
    }
    const len = Math.hypot(t.x - q.x, t.y - h, t.z - q.y);
    const horiz = Math.hypot(t.x - q.x, t.z - q.y);
    ctx.p.lead(q.x, h, q.y, t.x, t.y, t.z, horiz > len * 0.6 ? Math.min(0.12, 0.06 * len) : 0, 0.02);
  }
}

function busSupport(p: Parts, pts3: readonly Vec2[], h: number, kv: number): void {
  const r = pipeRadius(kv);
  const insH = postHeight(kv);
  const yb = h - r - insH;
  if (yb < 0.6) return;
  const a = pts3[0]!;
  const b = pts3[2]!;
  const c = pts3[1]!;
  const d = unit(b.x - a.x, b.y - a.y);
  const span = Math.hypot(b.x - a.x, b.y - a.y);
  const ext = 0.28;
  const A = { x: a.x - d.x * ext, y: a.y - d.y * ext };
  const B = { x: b.x + d.x * ext, y: b.y + d.y * ext };
  if (span + 2 * ext <= 1.9) {
    column(p, c.x, c.y, yb - 0.18, 0.16);
    p.beam('steel', A.x, yb - 0.09, A.y, B.x, yb - 0.09, B.y, 0.14, 0.18);
    if (p.hi) {
      p.beam('steel', c.x, yb - 0.6, c.y, A.x + d.x * 0.2, yb - 0.18, A.y + d.y * 0.2, 0.05, 0.05);
      p.beam('steel', c.x, yb - 0.6, c.y, B.x - d.x * 0.2, yb - 0.18, B.y - d.y * 0.2, 0.05, 0.05);
    }
  } else {
    const ca = { x: a.x - d.x * (ext - 0.14), y: a.y - d.y * (ext - 0.14) };
    const cb = { x: b.x + d.x * (ext - 0.14), y: b.y + d.y * (ext - 0.14) };
    column(p, ca.x, ca.y, yb - 0.24, 0.18);
    column(p, cb.x, cb.y, yb - 0.24, 0.18);
    girder(p, A.x, A.y, B.x, B.y, yb, 0.24, 0.2);
  }
  for (const q of pts3) {
    p.post(q.x, yb, q.y, insH);
    if (p.hi) p.box('aluminum', q.x - 0.06, h - r - 0.03, q.y - 0.06, q.x + 0.06, h - r + 0.02, q.y + 0.06);
  }
}

export interface ConductorResult {
  hasLive: boolean;
}

/**
 * Emit pipes, supports, jumpers and tap risers for all conductors. With
 * `animations`, energized runs use the glowing material (the view pulses it).
 */
export function buildConductors(p: Parts, batch: PartBatch, model: SceneModel, ports: readonly PortRef[], animations: boolean): ConductorResult {
  const ctx: Ctx = { p, batch };
  const chains = buildChains(model, ports);
  const phases = chains.map((ch) => [-1, 0, 1].map((k) => offsetPolyline(ch.pts, ch.closed, k * ch.sp)));
  const usedPorts = new Set<PortRef>();
  const risers: Array<{ owner: string; x: number; z: number; y0: number; y1: number; r: number }> = [];

  // Taps: trim/extend each phase of the tapping run onto its own phase line of the main run.
  chains.forEach((ch, idx) => {
    for (const which of ['start', 'end'] as const) {
      const ek = ch[which];
      if (ek.t !== 'tee') continue;
      const J = ek.at;
      let best: { m: number; v: Vec2; score: number } | null = null;
      const n = ch.pts.length;
      const tip = which === 'start' ? ch.pts[0]! : ch.pts[n - 1]!;
      const prev = which === 'start' ? ch.pts[1]! : ch.pts[n - 2]!;
      const u = unit(tip.x - prev.x, tip.y - prev.y);
      chains.forEach((m, mi) => {
        if (mi === idx) return;
        for (let i = 0; i + 1 < m.pts.length; i++) {
          if (pointSegDist(J, m.pts[i]!, m.pts[i + 1]!) > EPS) continue;
          const v = unit(m.pts[i + 1]!.x - m.pts[i]!.x, m.pts[i + 1]!.y - m.pts[i]!.y);
          const score = Math.abs(u.x * v.x + u.y * v.y);
          if (!best || score < best.score) best = { m: mi, v, score };
        }
      });
      if (!best) continue;
      const { m: mi, v, score } = best as { m: number; v: Vec2; score: number };
      if (score > 0.7) continue;
      const main = chains[mi]!;
      const nM = { x: -v.y, y: v.x };
      const dn = nM.x * u.x + nM.y * u.y;
      const lines = [-1, 0, 1].map((j) => ({ j, s: j * main.sp * dn })).sort((a, b) => a.s - b.s);
      const ph = phases[idx]!;
      const ix = which === 'start' ? 0 : n - 1;
      const order = [0, 1, 2].sort((a, b) => {
        const pa = ph[a]![ix]!;
        const pb = ph[b]![ix]!;
        return pa.x * v.x + pa.y * v.y - (pb.x * v.x + pb.y * v.y);
      });
      const hB = ch.height - ch.drop;
      const hM = main.height - main.drop;
      const owner = which === 'start' ? ch.owners[0]! : ch.owners[ch.owners.length - 1]!;
      order.forEach((k, rank) => {
        const E = ph[k]![ix]!;
        const target = lines[rank]!.s;
        const t = target - ((E.x - J.x) * u.x + (E.y - J.y) * u.y);
        const X = { x: E.x + u.x * t, y: E.y + u.y * t };
        ph[k]![ix] = X;
        risers.push({ owner, x: X.x, z: X.y, y0: hB, y1: hM, r: pipeRadius(ch.kv) * 0.85 });
      });
    }
  });

  let hasLive = false;
  const supportKeys = new Set<string>();
  chains.forEach((ch, idx) => {
    const h = ch.height - ch.drop;
    const r = pipeRadius(ch.kv);
    const ph = phases[idx]!;
    const n = ch.pts.length;
    for (let i = 0; i + 1 < n; i++) {
      const live = ch.live[i] === true && animations;
      if (live) hasLive = true;
      own(ctx, ch.owners[i]!);
      for (const line of ph) {
        const a = line[i]!;
        const b = line[i + 1]!;
        const d = unit(b.x - a.x, b.y - a.y);
        const e0 = i > 0 || ch.closed ? r : 0;
        const e1 = i + 2 < n || ch.closed ? r : 0;
        p.cyl(live ? 'busLive' : 'aluminum', a.x - d.x * e0, h, a.y - d.y * e0, b.x + d.x * e1, h, b.y + d.y * e1, r, p.hi ? 10 : 6);
      }
    }
    // Jumpers at device ports.
    for (const which of ['start', 'end'] as const) {
      const ek = ch[which];
      if (ek.t !== 'port') continue;
      const ix = which === 'start' ? 0 : n - 1;
      own(ctx, which === 'start' ? ch.owners[0]! : ch.owners[ch.owners.length - 1]!);
      for (const port of ek.ports) {
        usedPorts.add(port);
        jumpers(ctx, [ph[0]![ix]!, ph[1]![ix]!, ph[2]![ix]!], h, port);
      }
    }
    // Bus supports: corners, free ends and at most MAX_SPAN apart in between.
    const cum: number[] = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1]! + Math.hypot(ch.pts[i]!.x - ch.pts[i - 1]!.x, ch.pts[i]!.y - ch.pts[i - 1]!.y));
    const anchors: Array<{ s: number; vi: number; support: boolean }> = [];
    for (let i = 0; i < n; i++) {
      const isEnd = !ch.closed && (i === 0 || i === n - 1);
      if (isEnd) {
        const kind = i === 0 ? ch.start : ch.end;
        anchors.push({ s: cum[i]!, vi: i, support: kind.t === 'free' });
        continue;
      }
      if (ch.closed && i === n - 1) continue;
      const a = ch.pts[i === 0 ? n - 2 : i - 1]!;
      const b = ch.pts[i]!;
      const c = ch.pts[i + 1]!;
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) > 1e-3) anchors.push({ s: cum[i]!, vi: i, support: true });
    }
    if (ch.closed) anchors.push({ s: cum[n - 1]!, vi: n - 1, support: false });
    own(ctx, ch.owners[0]!);
    const place = (pts3: Vec2[]) => {
      const c = pts3[1]!;
      const k = `${Math.round(c.x * 4)},${Math.round(c.y * 4)},${Math.round(h * 10)}`;
      if (supportKeys.has(k)) return;
      supportKeys.add(k);
      busSupport(p, pts3, h, ch.kv);
    };
    for (const an of anchors) if (an.support) place([ph[0]![an.vi]!, ph[1]![an.vi]!, ph[2]![an.vi]!]);
    for (let ai = 0; ai + 1 < anchors.length; ai++) {
      const s0 = anchors[ai]!.s;
      const s1 = anchors[ai + 1]!.s;
      const L = s1 - s0;
      const extra = Math.ceil(L / MAX_SPAN - 1e-6) - 1;
      for (let j = 1; j <= extra; j++) {
        const s = s0 + (L * j) / (extra + 1);
        let si = 0;
        while (si + 2 < n && cum[si + 1]! < s) si++;
        const a = ch.pts[si]!;
        const b = ch.pts[si + 1]!;
        const segL = cum[si + 1]! - cum[si]! || 1;
        const t = (s - cum[si]!) / segL;
        const cx = a.x + (b.x - a.x) * t;
        const cy = a.y + (b.y - a.y) * t;
        const d = unit(b.x - a.x, b.y - a.y);
        const nx = -d.y;
        const ny = d.x;
        own(ctx, ch.owners[si]!);
        place([-1, 0, 1].map((k) => ({ x: cx + nx * k * ch.sp, y: cy + ny * k * ch.sp })));
      }
    }
  });

  for (const rz of risers) {
    own(ctx, rz.owner);
    p.cyl('aluminum', rz.x, rz.y0 - rz.r, rz.z, rz.x, rz.y1 + rz.r * 0.5, rz.z, rz.r, p.hi ? 8 : 6);
  }

  // Devices tapped mid-run (port on the interior of a run).
  for (const port of ports) {
    if (usedPorts.has(port) || !port.terminals) continue;
    for (const ch of chains) {
      let done = false;
      for (let i = 0; i + 1 < ch.pts.length; i++) {
        const a = ch.pts[i]!;
        const b = ch.pts[i + 1]!;
        if (pointSegDist(port.pos, a, b) > EPS) continue;
        const d = unit(b.x - a.x, b.y - a.y);
        const nx = -d.y;
        const ny = d.x;
        own(ctx, ch.owners[i]!);
        jumpers(ctx, [-1, 0, 1].map((k) => ({ x: port.pos.x + nx * k * ch.sp, y: port.pos.y + ny * k * ch.sp })), ch.height - ch.drop, port);
        done = true;
        break;
      }
      if (done) break;
    }
  }
  return { hasLive };
}

/** Shield wires strung between mast tops, with a little sag. */
export function buildShieldWires(lines: LineBatch, mat: LineBasicMaterial, model: SceneModel, hi: boolean): void {
  const n = hi ? 16 : 8;
  for (const sw of model.shieldWires) {
    const ya = sw.a.z - Math.min(1.4, sw.a.z * 0.08);
    const yb = sw.b.z - Math.min(1.4, sw.b.z * 0.08);
    const span = Math.hypot(sw.b.x - sw.a.x, sw.b.y - sw.a.y);
    const sag = 0.012 * span + 0.15;
    const pts: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(sw.a.x + (sw.b.x - sw.a.x) * t, ya + (yb - ya) * t - 4 * sag * t * (1 - t), sw.a.y + (sw.b.y - sw.a.y) * t);
    }
    lines.polyline('shield', mat, pts);
  }
}
