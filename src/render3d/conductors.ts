/**
 * Rigid bus. Each SceneConductor polyline becomes three aluminum pipes (one per
 * phase, offset by the phase spacing with mitred corners) at the conductor
 * height, carried on station-post bus supports.
 *
 * Junctions: conductors are first split wherever one ends on another, so every
 * junction is a point where conductor ends meet and the picture depends only on
 * the electrical junction, not on the order the player drew the buses in. At
 * each junction the straightest pair of branches is joined into one continuous
 * run (two ends alone always join, so corners mitre cleanly). A second straight
 * pair crosses beneath that run, and any other branch is a tap. Crossing runs and
 * taps are drawn one level lower and each phase rises vertically to its own phase
 * of the run above, so they never visually short across it. Ends at a device
 * port get flexible jumpers to that device's terminals.
 */
import type { LineBasicMaterial, Vector3 } from 'three';
import type { SceneModel } from '../engine/scene';
import { offsetPolyline } from '../engine/geometry';
import type { Vec2 } from '../engine/types';

export { offsetPolyline };
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
  /** How far the run is lowered below its nominal height (taps and crossing runs). */
  drop: number;
  /** Junctions where this run passes straight beneath another run and connects to it. */
  crossings: Vec2[];
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

/** Vertical step between bus levels at a junction: at least the Table 4-7 metal-to-metal clearance plus margin. */
export function levelStep(kv: number, height: number): number {
  const vc = vclass(kv);
  const base = vc.minMetalToMetalM + 0.15;
  const room = height - vc.groundClearanceM - 0.1;
  return Math.max(base, Math.min(Math.max(base, vc.rigidBusPhaseSpacingM), room));
}

type SC = SceneModel['conductors'][number];
interface Piece {
  c: SC;
  pts: Vec2[];
}

/** Split `pc` where `pt` lies on its interior (on a segment or at an inner vertex). */
function splitPiece(pc: Piece, pt: Vec2): [Piece, Piece] | null {
  const pts = pc.pts;
  if (near(pts[0]!, pt) || near(pts[pts.length - 1]!, pt)) return null;
  for (let i = 0; i + 1 < pts.length; i++) {
    if (pointSegDist(pt, pts[i]!, pts[i + 1]!) > EPS) continue;
    if (near(pts[i + 1]!, pt)) return [{ c: pc.c, pts: pts.slice(0, i + 2) }, { c: pc.c, pts: pts.slice(i + 1) }];
    const q = { x: pt.x, y: pt.y };
    return [
      { c: pc.c, pts: [...pts.slice(0, i + 1), q] },
      { c: pc.c, pts: [q, ...pts.slice(i + 1)] },
    ];
  }
  return null;
}

const pieceLen = (pts: readonly Vec2[]) => {
  let l = 0;
  for (let i = 0; i + 1 < pts.length; i++) l += Math.hypot(pts[i + 1]!.x - pts[i]!.x, pts[i + 1]!.y - pts[i]!.y);
  return l;
};

/** Group conductors into continuous runs and classify their ends. Pure: exported for tests. */
export function buildChains(model: Pick<SceneModel, 'conductors'>, ports: readonly PortRef[]): Chain[] {
  let conds: Piece[] = model.conductors
    .map((c) => {
      const pts: Vec2[] = [];
      for (const p of c.points) if (!pts.length || !near(pts[pts.length - 1]!, p)) pts.push({ x: p.x, y: p.y });
      return { c, pts };
    })
    .filter((x) => x.pts.length >= 2);

  // Split runs wherever another run ends on them, so junctions are always shared end points.
  for (let guard = 0; guard < 200; guard++) {
    const ends = conds.flatMap((p) => [p.pts[0]!, p.pts[p.pts.length - 1]!]);
    let hit = -1;
    let parts: [Piece, Piece] | null = null;
    for (let pi = 0; pi < conds.length && !parts; pi++) {
      for (const e of ends) {
        parts = splitPiece(conds[pi]!, e);
        if (parts) {
          hit = pi;
          break;
        }
      }
    }
    if (!parts) break;
    conds = [...conds.slice(0, hit), ...parts, ...conds.slice(hit + 1)];
  }

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
  const crossPieces: Array<{ ci: number; at: Vec2 }> = [];
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
    // Candidate pairs, straightest first; among equally straight pairs the longer one is the main run
    // (then the more east-west one), so the choice never depends on drawing order.
    const pairs: Array<{ a: CEnd; b: CEnd; score: number; len: number; ew: number }> = [];
    for (let i = 0; i < ends.length; i++) {
      for (let j = i + 1; j < ends.length; j++) {
        const a = ends[i]!;
        const b = ends[j]!;
        const ca = conds[a.ci]!.c;
        const cb = conds[b.ci]!.c;
        if (a.ci === b.ci) continue;
        if (Math.abs(ca.height - cb.height) > 1e-3 || Math.abs(ca.phaseSpacing - cb.phaseSpacing) > 1e-3) continue;
        const da = outDir(a);
        const db = outDir(b);
        pairs.push({ a, b, score: da.x * db.x + da.y * db.y, len: pieceLen(conds[a.ci]!.pts) + pieceLen(conds[b.ci]!.pts), ew: Math.abs(da.x) });
      }
    }
    const straight = (q: (typeof pairs)[number]) => q.score < -0.7;
    pairs.sort((p, q) => {
      const sp = Number(straight(q)) - Number(straight(p));
      if (sp) return sp;
      if (!straight(p) && Math.abs(p.score - q.score) > 1e-6) return p.score - q.score;
      if (Math.abs(p.len - q.len) > 1e-6) return q.len - p.len;
      return q.ew - p.ew;
    });
    const taken = new Set<string>();
    const free = (e: CEnd) => !taken.has(ek(e));
    const main = pairs.find((q) => q.score < 0.7);
    if (main) {
      join.set(ek(main.a), main.b);
      join.set(ek(main.b), main.a);
      taken.add(ek(main.a)).add(ek(main.b));
      const cross = pairs.find((q) => straight(q) && free(q.a) && free(q.b));
      if (cross) {
        join.set(ek(cross.a), cross.b);
        join.set(ek(cross.b), cross.a);
        taken.add(ek(cross.a)).add(ek(cross.b));
        crossPieces.push({ ci: cross.a.ci, at: pt });
      }
      for (const e of ends) if (free(e)) kinds.set(ek(e), { t: 'tee', at: pt });
    } else {
      for (const e of ends) kinds.set(ek(e), { t: 'free' });
    }
  }

  const used = new Array<boolean>(conds.length).fill(false);
  const chainOf = new Array<number>(conds.length).fill(-1);
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
      chainOf[x] = chains.length;
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
    chains.push({
      pts,
      owners,
      live,
      height: c0.height,
      sp: c0.phaseSpacing,
      kv: c0.kv,
      closed,
      start: closed ? { t: 'free' } : headKind,
      end: closed ? { t: 'free' } : tailKind,
      drop: 0,
      crossings: [],
    });
  }
  for (const cp of crossPieces) chains[chainOf[cp.ci]!]!.crossings.push(cp.at);

  // Levels: a tap or crossing run sits one level below the run it connects to (at most two levels).
  const level = chains.map(() => 0);
  const attachments = chains.map((ch, idx) => {
    const at = [...ch.crossings];
    for (const k of [ch.start, ch.end]) if (k.t === 'tee') at.push(k.at);
    return at.map((J) => chains.findIndex((m, mi) => mi !== idx && !m.crossings.some((q) => near(q, J)) && m.pts.some((_, i) => i + 1 < m.pts.length && pointSegDist(J, m.pts[i]!, m.pts[i + 1]!) <= EPS)));
  });
  for (let it = 0; it < 3; it++) {
    attachments.forEach((ms, idx) => {
      for (const mi of ms) if (mi >= 0) level[idx] = Math.max(level[idx]!, Math.min(2, level[mi]! + 1));
    });
  }
  chains.forEach((ch, idx) => {
    if (!level[idx]) return;
    const step = levelStep(ch.kv, ch.height);
    const room = Math.max(step, ch.height - vclass(ch.kv).groundClearanceM - 0.1);
    ch.drop = Math.max(step, Math.min(level[idx]! * step, room));
  });
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
  let Ts = T.map((t) => ({ t, s: t.x * ax + t.z * ay })).sort((a, b) => a.s - b.s);
  // Pair phases with terminals so the jumpers are shortest overall: for a straight entry that is the
  // sorted order; for a bus arriving from the side it nests them instead of crossing them at random.
  if (Ts.length === P.length && P.length === 3) {
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const cost = (pm: number[]) => pm.reduce((sum, j, i) => sum + (Ts[j]!.t.x - P[i]!.q.x) ** 2 + (Ts[j]!.t.z - P[i]!.q.y) ** 2, 0);
    const best = perms.reduce((a, b) => (cost(b) < cost(a) - 1e-9 ? b : a));
    Ts = best.map((j) => Ts[j]!);
  }
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

  // Crossing runs: pass straight beneath the run above; each phase rises to its own phase line.
  chains.forEach((ch, idx) => {
    for (const J of ch.crossings) {
      const vi = ch.pts.findIndex((q) => near(q, J));
      if (vi < 0) continue;
      const a = ch.pts[Math.max(0, vi - 1)]!;
      const b = ch.pts[Math.min(ch.pts.length - 1, vi + 1)]!;
      const u = unit(b.x - a.x, b.y - a.y);
      let best: { m: number; v: Vec2; score: number } | null = null;
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
      const lines = [-1, 0, 1].map((j) => j * main.sp * dn).sort((p, q) => p - q);
      const ph = phases[idx]!;
      const order = [0, 1, 2].sort((p, q) => {
        const pa = ph[p]![vi]!;
        const pb = ph[q]![vi]!;
        return pa.x * v.x + pa.y * v.y - (pb.x * v.x + pb.y * v.y);
      });
      const owner = ch.owners[Math.min(vi, ch.owners.length - 1)]!;
      order.forEach((k, rank) => {
        const P = ph[k]![vi]!;
        const t = lines[rank]! - ((P.x - J.x) * u.x + (P.y - J.y) * u.y);
        risers.push({ owner, x: P.x + u.x * t, z: P.y + u.y * t, y0: ch.height - ch.drop, y1: main.height - main.drop, r: pipeRadius(ch.kv) * 0.85 });
      });
    }
  });

  // Junctions on each run (where another run taps or crosses beneath): bus supports keep clear of them.
  const junctions: Vec2[][] = chains.map(() => []);
  chains.forEach((ch, idx) => {
    const at = [...ch.crossings];
    for (const k of [ch.start, ch.end]) if (k.t === 'tee') at.push(k.at);
    for (const J of at) {
      chains.forEach((m, mi) => {
        if (mi === idx) return;
        for (let i = 0; i + 1 < m.pts.length; i++) {
          if (pointSegDist(J, m.pts[i]!, m.pts[i + 1]!) <= EPS) {
            junctions[mi]!.push(J);
            return;
          }
        }
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
    // Run coordinate of each junction on this run, and how far supports must stay from it.
    const keep = 1.5 * ch.sp + 0.6;
    const js = junctions[idx]!.map((J) => {
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i + 1 < n; i++) {
        const a = ch.pts[i]!;
        const b = ch.pts[i + 1]!;
        const dd = pointSegDist(J, a, b);
        if (dd < bd) {
          bd = dd;
          best = cum[i]! + Math.hypot(J.x - a.x, J.y - a.y);
        }
      }
      return best;
    });
    for (let ai = 0; ai + 1 < anchors.length; ai++) {
      const s0 = anchors[ai]!.s;
      const s1 = anchors[ai + 1]!.s;
      const L = s1 - s0;
      const extra = Math.ceil(L / MAX_SPAN - 1e-6) - 1;
      for (let j = 1; j <= extra; j++) {
        let s = s0 + (L * j) / (extra + 1);
        const sj = js.find((q) => Math.abs(q - s) < keep);
        if (sj !== undefined) {
          const lo = sj - keep;
          const hi = sj + keep;
          s = s - lo < hi - s && lo > s0 + 0.5 ? lo : hi < s1 - 0.5 ? hi : lo > s0 + 0.5 ? lo : NaN;
          if (!Number.isFinite(s) || js.some((q) => Math.abs(q - s) < keep - 1e-6)) continue;
        }
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
