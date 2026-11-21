/**
 * Direct-stroke shielding evaluation (Bulletin §4.7.3).
 *
 * Fixed angle method (Fig. 4-17): a single mast protects a cone whose side
 * makes angle A with the vertical; a single shield wire protects a wedge with
 * angle A on both sides. Between two masts the inner boundary uses the wider
 * angle B. Recommended values: A = 30°, B = 45° (ranges 20–60° and 40–60°).
 *
 * In 3-D we model the zone between a pair of masts as a "tent": along the line
 * joining the masts the ridge height follows the two B-lines (a V between the
 * mast tops); away from that line the zone falls off at angle A. This reduces
 * exactly to Fig. 4-17 in the vertical plane through the masts.
 *
 * Rolling sphere method (Eq. 4-1 to 4-3): strike distance R = 8·K·Is^0.65 (m)
 * with Is = 2.2·BIL/Zs (kA). K = 1.2 for strokes to masts, 1.0 for wires/ground.
 * A point is exposed if a sphere of radius R can touch it without penetrating
 * the ground or any mast or shield wire.
 */
import type { Citation } from '../data/bulletin/types';
import { busHeight, CATALOG } from './catalog';
import { samplePolyline } from './geometry';
import { footprintOf, itemRect } from './items';
import type { Design, Vec2, Vec3 } from './types';

export const SHIELDING_CITES = {
  fixedAngle: { page: 143, section: '4.7.3.4.1', figure: '4-17' } satisfies Citation,
  rollingSphere: { page: [144, 145], section: '4.7.3.4.2', equation: '4-1, 4-2' } satisfies Citation,
  general: { page: 142, section: '4.7.3.1' } satisfies Citation,
  grounding: { page: 145, section: '4.7.3.5' } satisfies Citation,
  shieldWireTension: { page: 142, section: '4.7.3.2' } satisfies Citation,
} as const;

/** Fig. 4-17 angle ranges and recommended values (degrees from vertical). */
export const FIXED_ANGLE = {
  A: { min: 20, max: 60, recommended: 30 },
  B: { min: 40, max: 60, recommended: 45 },
} as const;

/** Maximum shield wire design tension (§4.7.3.2): 8900 N (2000 lb) per conductor. */
export const SHIELD_WIRE_MAX_TENSION_N = 8900;
/** Shield wires should extend at least 805 m (1/2 mile) from the substation where lines are unshielded (§4.7.3.2). */
export const SHIELD_WIRE_LINE_EXTENSION_M = 805;
/** Adequate shielding lets no more than 0.1% of predicted strokes terminate on protected equipment (§4.7.3.4). */
export const ADEQUATE_SHIELDING_FAILURE_FRACTION = 0.001;

export interface Mast {
  id: string;
  p: Vec2;
  h: number;
}

export interface Wire {
  id: string;
  a: Vec3;
  b: Vec3;
}

export interface ShieldGeometry {
  masts: Mast[];
  wires: Wire[];
}

export interface ProtectedTarget {
  id: string;
  kind: 'item' | 'conductor';
  points: Vec3[];
}

export interface ShieldingResult {
  method: 'fixed_angle' | 'rolling_sphere';
  targets: Array<{ id: string; kind: 'item' | 'conductor'; covered: number; total: number; exposed: Vec3[] }>;
  coveredFraction: number;
  /** Rolling sphere radius used (m), if applicable. */
  sphereRadiusM?: number;
}

const DEG = Math.PI / 180;

export function shieldGeometry(design: Design): ShieldGeometry {
  const masts: Mast[] = design.items
    .filter((i) => i.kind === 'mast')
    .map((m) => {
      const r = itemRect(m);
      return { id: m.id, p: { x: r.x + r.w / 2, y: r.y + r.h / 2 }, h: Number(m.props.heightM) || 18 };
    });
  const byId = new Map(masts.map((m) => [m.id, m]));
  const wires: Wire[] = [];
  for (const sw of design.shieldWires) {
    const a = byId.get(sw.a);
    const b = byId.get(sw.b);
    if (!a || !b) continue;
    // Attach 0.5 m below the mast tops to allow for sag at mid-span.
    wires.push({ id: sw.id, a: { x: a.p.x, y: a.p.y, z: a.h - 0.5 }, b: { x: b.p.x, y: b.p.y, z: b.h - 0.5 } });
  }
  return { masts, wires };
}

/** Points that must be shielded: energized equipment tops and bus runs. */
export function shieldTargets(design: Design): ProtectedTarget[] {
  const targets: ProtectedTarget[] = [];
  for (const it of design.items) {
    const def = CATALOG[it.kind];
    // Line dead-ends and feeder getaways sit at the boundary and are shielded as part of the line.
    if (!def.live || it.kind === 'line_terminal' || it.kind === 'feeder_exit') continue;
    const fp = footprintOf(it);
    const r = itemRect(it, fp);
    const z = fp.liveHeight;
    const inset = Math.min(0.25, r.w / 4, r.h / 4);
    const xs = [r.x + inset, r.x + r.w / 2, r.x + r.w - inset];
    const ys = [r.y + inset, r.y + r.h / 2, r.y + r.h - inset];
    const pts: Vec3[] = [];
    for (const x of xs) for (const y of ys) pts.push({ x, y, z });
    targets.push({ id: it.id, kind: 'item', points: pts });
  }
  for (const c of design.conductors) {
    if (c.points.length < 2) continue;
    const z = busHeight(c.kv, c.elevation);
    targets.push({ id: c.id, kind: 'conductor', points: samplePolyline(c.points, 1).map((p) => ({ ...p, z })) });
  }
  return targets;
}

// ---------------------------------------------------------------------------
// Fixed angle
// ---------------------------------------------------------------------------

export function fixedAngleProtected(p: Vec3, g: ShieldGeometry, angleA: number = FIXED_ANGLE.A.recommended, angleB: number = FIXED_ANGLE.B.recommended): boolean {
  const tA = Math.tan(angleA * DEG);
  const tB = Math.tan(angleB * DEG);
  for (const m of g.masts) {
    if (p.z >= m.h) continue;
    if (Math.hypot(p.x - m.p.x, p.y - m.p.y) <= (m.h - p.z) * tA + 1e-9) return true;
  }
  // Mast pairs: tent with a B-angle V ridge along the joining line and A-angle sides.
  for (let i = 0; i < g.masts.length; i++) {
    for (let j = i + 1; j < g.masts.length; j++) {
      const m1 = g.masts[i]!;
      const m2 = g.masts[j]!;
      const dx = m2.p.x - m1.p.x;
      const dy = m2.p.y - m1.p.y;
      const s = Math.hypot(dx, dy);
      if (s < 1e-6) continue;
      const t = ((p.x - m1.p.x) * dx + (p.y - m1.p.y) * dy) / (s * s);
      if (t < 0 || t > 1) continue;
      const ridge = Math.max(m1.h - (t * s) / tB, m2.h - ((1 - t) * s) / tB);
      if (ridge <= p.z) continue;
      const lateral = Math.abs((p.x - m1.p.x) * dy - (p.y - m1.p.y) * dx) / s;
      if (lateral <= (ridge - p.z) * tA + 1e-9) return true;
    }
  }
  // Shield wires: wedge with angle A on both sides.
  for (const w of g.wires) {
    const dx = w.b.x - w.a.x;
    const dy = w.b.y - w.a.y;
    const s2 = dx * dx + dy * dy;
    if (s2 < 1e-9) continue;
    const t = ((p.x - w.a.x) * dx + (p.y - w.a.y) * dy) / s2;
    if (t < 0 || t > 1) continue;
    const hz = w.a.z + t * (w.b.z - w.a.z);
    if (hz <= p.z) continue;
    const lateral = Math.abs((p.x - w.a.x) * dy - (p.y - w.a.y) * dx) / Math.sqrt(s2);
    if (lateral <= (hz - p.z) * tA + 1e-9) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Rolling sphere
// ---------------------------------------------------------------------------

/** Eq. 4-1: allowable stroke current Is (kA) = 2.2 · BIL / Zs. */
export function allowableStrokeCurrentKA(bilKV: number, surgeImpedanceOhm: number): number {
  return (2.2 * bilKV) / surgeImpedanceOhm;
}

/** Eq. 4-2: strike distance in metres, R = 8 · K · Is^0.65. K = 1.2 to a mast, 1.0 to wires or ground. */
export function strikeDistanceM(strokeKA: number, K: number): number {
  return 8 * K * Math.pow(strokeKA, 0.65);
}

function distPointToSeg3(p: Vec3, a: Vec3, b: Vec3): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = len2 > 0 ? ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby), p.z - (a.z + t * abz));
}

/**
 * Exposure test by sampling candidate sphere centres on the cap of directions
 * that keep the sphere above ground. Masts use radius K=1.2·R0/1.0 scaling
 * via `radiusMast`; wires use `radius`.
 */
export function rollingSphereProtected(p: Vec3, g: ShieldGeometry, radius: number, radiusMast = radius, samples = 360): boolean {
  if (p.z >= radius) return false;
  const minUz = Math.max(0, 1 - p.z / radius);
  const rings = 12;
  const perRing = Math.max(8, Math.round(samples / rings));
  for (let r = 0; r <= rings; r++) {
    const uz = minUz + ((1 - minUz) * r) / rings;
    const rho = Math.sqrt(Math.max(0, 1 - uz * uz));
    const n = r === rings ? 1 : perRing;
    for (let k = 0; k < n; k++) {
      const phi = (2 * Math.PI * k) / n;
      const c: Vec3 = { x: p.x + radius * rho * Math.cos(phi), y: p.y + radius * rho * Math.sin(phi), z: p.z + radius * uz };
      if (c.z < radius - 1e-6) continue;
      let blocked = false;
      for (const m of g.masts) {
        const d = distPointToSeg3(c, { x: m.p.x, y: m.p.y, z: 0 }, { x: m.p.x, y: m.p.y, z: m.h });
        if (d < radiusMast - 1e-6) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        for (const w of g.wires) {
          if (distPointToSeg3(c, w.a, w.b) < radius - 1e-6) {
            blocked = true;
            break;
          }
        }
      }
      if (!blocked) return false; // a sphere can rest on p: exposed
    }
  }
  return true;
}

export interface ShieldingOptions {
  method: 'fixed_angle' | 'rolling_sphere';
  angleA?: number;
  angleB?: number;
  /** For rolling sphere: governing BIL (kV) and conductor surge impedance (ohms). */
  bilKV?: number;
  surgeImpedanceOhm?: number;
}

export function evaluateShielding(design: Design, opts: ShieldingOptions): ShieldingResult {
  const g = shieldGeometry(design);
  const targets = shieldTargets(design);
  let radius = 0;
  let radiusMast = 0;
  let test: (p: Vec3) => boolean;
  if (opts.method === 'rolling_sphere') {
    const Is = allowableStrokeCurrentKA(opts.bilKV ?? 350, opts.surgeImpedanceOhm ?? 350);
    radius = strikeDistanceM(Is, 1.0);
    radiusMast = strikeDistanceM(Is, 1.2);
    test = (p) => rollingSphereProtected(p, g, radius, radiusMast);
  } else {
    test = (p) => fixedAngleProtected(p, g, opts.angleA, opts.angleB);
  }
  let covered = 0;
  let total = 0;
  const out: ShieldingResult['targets'] = [];
  for (const t of targets) {
    const exposed: Vec3[] = [];
    let c = 0;
    for (const p of t.points) {
      if (test(p)) c++;
      else exposed.push(p);
    }
    covered += c;
    total += t.points.length;
    out.push({ id: t.id, kind: t.kind, covered: c, total: t.points.length, exposed });
  }
  return {
    method: opts.method,
    targets: out,
    coveredFraction: total ? covered / total : 1,
    sphereRadiusM: opts.method === 'rolling_sphere' ? radius : undefined,
  };
}

/** Boolean protection map at a reference height, for the plan-view overlay. */
export function shieldingMap(
  design: Design,
  bounds: { x: number; y: number; w: number; h: number },
  zRef: number,
  cell: number,
  opts: ShieldingOptions,
): { cols: number; rows: number; cell: number; x0: number; y0: number; data: Uint8Array } {
  const g = shieldGeometry(design);
  const cols = Math.max(1, Math.ceil(bounds.w / cell));
  const rows = Math.max(1, Math.ceil(bounds.h / cell));
  const data = new Uint8Array(cols * rows);
  let test: (p: Vec3) => boolean;
  if (opts.method === 'rolling_sphere') {
    const Is = allowableStrokeCurrentKA(opts.bilKV ?? 350, opts.surgeImpedanceOhm ?? 350);
    const r = strikeDistanceM(Is, 1.0);
    const rm = strikeDistanceM(Is, 1.2);
    test = (p) => rollingSphereProtected(p, g, r, rm, 120);
  } else {
    test = (p) => fixedAngleProtected(p, g, opts.angleA, opts.angleB);
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const p = { x: bounds.x + (i + 0.5) * cell, y: bounds.y + (j + 0.5) * cell, z: zRef };
      data[j * cols + i] = test(p) ? 1 : 0;
    }
  }
  return { cols, rows, cell, x0: bounds.x, y0: bounds.y, data };
}
