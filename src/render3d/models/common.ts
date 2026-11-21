/**
 * Shared model helpers: per-item derived dimensions, insulator sizing from the
 * voltage class, and galvanized-steel structure pieces.
 *
 * Model frame: X in [0, w] along the power-flow axis (ports on the X = 0 and
 * X = w edges), Z in [0, d] across the three phases, Y up, metres.
 */
import { busHeight } from '../../engine/catalog';
import type { SceneItem } from '../../engine/scene';
import { type VoltageClassRow } from '../../data/bulletin/voltageClasses';
import { clearanceClassFor } from '../../engine/site';
import type { Parts, V3 } from '../parts';

export type PortId = 'a' | 'b' | 'hv' | 'lv';

export interface OffsiteLocal {
  /** Conductor attachment points (local frame), one per phase. */
  attach: V3[];
  /** Direction the line leaves in (local X/Z plane). */
  dir: [number, number];
  kind: 'transmission' | 'distribution';
}

export interface ModelOut {
  /** Terminal points per port (local frame), one per phase, ordered by Z. */
  terminals: Partial<Record<PortId, V3[]>>;
  offsite?: OffsiteLocal;
}

export interface ItemInfo {
  it: SceneItem;
  w: number;
  d: number;
  kv: number;
  /** Top of energized parts / overall height (catalogue). */
  live: number;
  top: number;
  /** Low-profile bus height for the item's voltage (conductor terminal height). */
  bus: number;
  vc: VoltageClassRow;
  /** Phase spacing and the three phase Z positions to draw. */
  sp: number;
  zs: [number, number, number];
  /** Station post insulator height for the item's BIL. */
  insH: number;
  hi: boolean;
}

export type ModelFn = (p: Parts, I: ItemInfo) => ModelOut;

export function vclass(kv: number): VoltageClassRow {
  try {
    return clearanceClassFor(kv > 0 ? kv : 12.47);
  } catch {
    return clearanceClassFor(230);
  }
}

export function safeBusHeight(kv: number, elevation: 'low' | 'high' = 'low'): number {
  try {
    return busHeight(kv > 0 ? kv : 12.47, elevation);
  } catch {
    return 6;
  }
}

const POST_BY_BIL: Array<[number, number]> = [
  [95, 0.3],
  [110, 0.34],
  [150, 0.4],
  [200, 0.48],
  [250, 0.58],
  [350, 0.76],
  [550, 1.14],
  [650, 1.37],
  [750, 1.57],
  [900, 2.03],
];

function interp(table: Array<[number, number]>, x: number): number {
  if (x <= table[0]![0]) return table[0]![1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i]!;
    const [x0, y0] = table[i - 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return table[table.length - 1]![1];
}

/** Station post insulator height (m) for a voltage class (standard TR-2xx heights by BIL). */
export function postHeight(kv: number): number {
  return interp(POST_BY_BIL, vclass(kv).bilKV);
}

/** Station-class surge arrester housing height (m). */
export function arresterHeight(kv: number): number {
  return Math.min(3, 0.3 + 0.0105 * Math.max(kv, 4));
}

export function phaseZ(d: number, sp: number): [number, number, number] {
  return [d / 2 - sp, d / 2, d / 2 + sp];
}

export function itemInfo(it: SceneItem, hi: boolean): ItemInfo {
  const vc = vclass(it.kv);
  const sp = Math.max(0.2, Math.min(it.phaseSpacing || vc.rigidBusPhaseSpacingM, (it.d - 0.4) / 2));
  return {
    it,
    w: it.w,
    d: it.d,
    kv: it.kv,
    live: it.liveHeight,
    top: it.height,
    bus: it.kv > 0 ? safeBusHeight(it.kv) : it.liveHeight,
    vc,
    sp,
    zs: phaseZ(it.d, sp),
    insH: postHeight(it.kv),
    hi,
  };
}

export const at = (x: number, y: number, zs: readonly number[]): V3[] => zs.map((z) => [x, y, z] as V3);

/** Concrete pier poking out of the surfacing. */
export function pier(p: Parts, x: number, z: number, size = 0.45): void {
  p.box('concrete', x - size / 2, -0.05, z - size / 2, x + size / 2, 0.2, z + size / 2);
}

/** Galvanized column (wide-flange approximated by a box) on a pier. */
export function column(p: Parts, x: number, z: number, y1: number, size = 0.18): void {
  pier(p, x, z, Math.max(0.4, size * 2.4));
  p.box('steel', x - size / 2, 0.2, z - size / 2, x + size / 2, y1, z + size / 2);
}

/**
 * Horizontal girder between plan points A and B with its top at yTop. At high
 * detail it is a box truss (four chords plus zig-zag lacing), otherwise a solid box.
 */
export function girder(p: Parts, ax: number, az: number, bx: number, bz: number, yTop: number, depth = 0.25, width = 0.2): void {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 1e-3) return;
  const yc = yTop - depth / 2;
  if (!p.hi || len < 1.2 || depth < 0.2) {
    p.beam('steel', ax, yc, az, bx, yc, bz, width, depth);
    return;
  }
  const ux = (bx - ax) / len;
  const uz = (bz - az) / len;
  const nx = -uz;
  const nz = ux;
  const c = 0.045;
  const yT = yTop - c / 2;
  const yB = yTop - depth + c / 2;
  const panels = Math.max(2, Math.round(len / Math.max(depth, 0.35)));
  for (const side of [-1, 1]) {
    const ox = (nx * side * (width - c)) / 2;
    const oz = (nz * side * (width - c)) / 2;
    p.beam('steel', ax + ox, yT, az + oz, bx + ox, yT, bz + oz, c, c);
    p.beam('steel', ax + ox, yB, az + oz, bx + ox, yB, bz + oz, c, c);
    for (let i = 0; i < panels; i++) {
      const t0 = i / panels;
      const t1 = (i + 1) / panels;
      const x0 = ax + ux * len * t0 + ox;
      const z0 = az + uz * len * t0 + oz;
      const x1 = ax + ux * len * t1 + ox;
      const z1 = az + uz * len * t1 + oz;
      if (i % 2 === 0) p.beam('steel', x0, yB, z0, x1, yT, z1, c * 0.7, c * 0.7);
      else p.beam('steel', x0, yT, z0, x1, yB, z1, c * 0.7, c * 0.7);
    }
  }
  // End posts tie the two faces together.
  for (const [x, z] of [
    [ax, az],
    [bx, bz],
  ] as const) {
    p.beam('steel', x, yB, z, x, yT, z, width, c);
  }
}

/** Two-column H-frame across Z at x, columns at zA/zB, girder top at yTop. */
export function hStand(p: Parts, x: number, zA: number, zB: number, yTop: number, girderDepth = 0.25, colSize = 0.18): void {
  column(p, x, zA, yTop - girderDepth, colSize);
  column(p, x, zB, yTop - girderDepth, colSize);
  girder(p, x, zA - colSize / 2, x, zB + colSize / 2, yTop, girderDepth, Math.max(0.16, colSize + 0.02));
  if (p.hi && yTop > 2) {
    // Knee braces.
    const k = Math.min(0.6, (zB - zA) / 4);
    for (const [zc, s] of [
      [zA, 1],
      [zB, -1],
    ] as const) {
      p.beam('steel', x, yTop - girderDepth - k, zc, x, yTop - girderDepth, zc + s * k, 0.06, 0.06);
    }
  }
}

/** Single column with a cap beam across Z (for narrow distribution-voltage stands). */
export function tStand(p: Parts, x: number, z: number, z0: number, z1: number, yTop: number, depth = 0.16): void {
  column(p, x, z, yTop - depth, 0.16);
  p.beam('steel', x, yTop - depth / 2, z0, x, yTop - depth / 2, z1, 0.14, depth);
  if (p.hi && z1 - z0 > 0.8) {
    p.beam('steel', x, yTop - depth - 0.45, z, x, yTop - depth, z0 + 0.15, 0.05, 0.05);
    p.beam('steel', x, yTop - depth - 0.45, z, x, yTop - depth, z1 - 0.15, 0.05, 0.05);
  }
}

/**
 * Pedestal structure carrying one piece of equipment per phase whose base is
 * at yBase: a T-stand when the phases are close, an H-frame otherwise.
 */
export function phaseStand(p: Parts, I: ItemInfo, x: number, yBase: number): void {
  const z0 = Math.max(0.12, I.zs[0] - 0.3);
  const z1 = Math.min(I.d - 0.12, I.zs[2] + 0.3);
  if (z1 - z0 <= 2.2) tStand(p, x, I.d / 2, z0, z1, yBase);
  else hStand(p, x, z0 + 0.12, z1 - 0.12, yBase, 0.22, 0.18);
}
