/**
 * Series switching and instrument devices mounted on low-profile steel stands:
 * group-operated disconnects, hook-stick switches, power fuses, circuit
 * switchers, metering units and line traps.
 */
import type { Parts, V3 } from '../parts';
import { at, hStand, phaseStand, phaseZ, tStand, type ItemInfo, type ModelOut } from './common';

/** Phase spacing for an air switch of the given style, limited to the footprint. */
function switchSpacing(I: ItemInfo): number {
  const style = I.it.props.style;
  const vc = I.vc;
  const s =
    style === 'side_break'
      ? (vc.switchSpacingSideBreakM ?? vc.switchSpacingVerticalBreakM)
      : style === 'horn_gap'
        ? (vc.switchSpacingHornGapM ?? vc.switchSpacingVerticalBreakM)
        : vc.switchSpacingVerticalBreakM;
  return Math.max(0.25, Math.min(s, (I.d - 0.5) / 2));
}

/** Low-profile stand: girder across the phases at mid-span plus a base channel per phase. */
function switchStand(p: Parts, I: ItemInfo, zs: readonly number[], x1: number, x2: number, yIns: number): void {
  const xc = I.w / 2;
  const yG = yIns - 0.1;
  const z0 = Math.max(0.15, zs[0]! - 0.42);
  const z1 = Math.min(I.d - 0.15, zs[2]! + 0.42);
  if (z1 - z0 <= 2.0) tStand(p, xc, I.d / 2, z0, z1, yG, 0.2);
  else hStand(p, xc, z0 + 0.1, z1 - 0.1, yG, 0.3, 0.2);
  for (const z of zs) p.box('steel', x1 - 0.12, yG, z - 0.06, x2 + 0.12, yIns, z + 0.06);
}

/** Blade from the hinge contact; open blades stand nearly vertical. */
function blade(p: Parts, x1: number, x2: number, y: number, z: number, open: boolean, r: number): void {
  const L = x2 - x1;
  if (open) {
    const a = (72 * Math.PI) / 180;
    p.cyl('aluminum', x1, y, z, x1 + Math.cos(a) * L, y + Math.sin(a) * L, z, r, 6);
  } else {
    p.cyl('aluminum', x1, y, z, x2, y, z, r, 6);
  }
}

export function disconnectSwitch(p: Parts, I: ItemInfo): ModelOut {
  const zs = phaseZ(I.d, switchSpacing(I));
  const x1 = Math.min(0.32, I.w * 0.14);
  const x2 = I.w - x1;
  const h = I.insH;
  const yIns = I.live - h - 0.06;
  const open = I.it.props.normallyOpen === true;
  switchStand(p, I, zs, x1, x2, yIns);
  const xr = x1 + Math.min(0.32, (x2 - x1) * 0.2);
  for (const z of zs) {
    p.post(x1, yIns, z, h);
    p.post(x2, yIns, z, h);
    if (p.hi) p.post(xr, yIns, z, h); // rotating insulator of a vertical-break switch
    p.box('aluminum', x1 - 0.1, I.live - 0.06, z - 0.05, x1 + 0.08, I.live, z + 0.05);
    p.box('aluminum', x2 - 0.08, I.live - 0.06, z - 0.05, x2 + 0.1, I.live, z + 0.05);
    blade(p, x1, x2, I.live + 0.03, z, open, 0.032);
    if (p.hi && !open) p.box('aluminum', x2 - 0.05, I.live, z - 0.07, x2 + 0.03, I.live + 0.1, z + 0.07);
  }
  if (p.hi) {
    // Interphase operating rod and the vertical operating pipe down to the handle.
    p.cyl('steel', xr, yIns - 0.04, zs[0], xr, yIns - 0.04, zs[2], 0.022, 6);
    const zc = Math.max(0.12, zs[0] - 0.42) + 0.1;
    p.cyl('steel', I.w / 2 + 0.16, 1.0, zc, I.w / 2 + 0.16, yIns - 0.1, zc, 0.022, 6);
    if (I.it.props.motor === true) p.box('cabinet', I.w / 2 + 0.08, 0.9, zc - 0.22, I.w / 2 + 0.42, 1.55, zc + 0.22);
    else p.box('steelDark', I.w / 2 + 0.1, 0.95, zc - 0.08, I.w / 2 + 0.3, 1.15, zc + 0.08);
    if (I.it.props.groundingBlade === true) {
      for (const z of zs) p.cyl('aluminum', x1 + 0.02, yIns + 0.1, z + 0.12, x1 + 0.02, yIns + h * 0.85, z + 0.12, 0.018, 6);
    }
  }
  return {
    terminals: { a: at(x1 - 0.1, I.live - 0.03, zs), b: at(x2 + 0.1, I.live - 0.03, zs) },
  };
}

export function hookstickSwitch(p: Parts, I: ItemInfo): ModelOut {
  const zs = phaseZ(I.d, Math.max(0.25, Math.min(I.vc.switchSpacingVerticalBreakM, (I.d - 0.4) / 2)));
  const x1 = 0.28;
  const x2 = I.w - 0.28;
  const h = I.insH;
  const yIns = I.live - h - 0.05;
  const open = I.it.props.normallyOpen === true;
  switchStand(p, I, zs, x1, x2, yIns);
  for (const z of zs) {
    p.post(x1, yIns, z, h);
    p.post(x2, yIns, z, h);
    p.box('aluminum', x1 - 0.08, I.live - 0.05, z - 0.04, x1 + 0.06, I.live, z + 0.04);
    p.box('aluminum', x2 - 0.06, I.live - 0.05, z - 0.04, x2 + 0.08, I.live, z + 0.04);
    // Hinge at x2, blade swings up toward the operator with a pull ring at the tip.
    const L = x2 - x1;
    if (open) {
      const a = (68 * Math.PI) / 180;
      const tx = x2 - Math.cos(a) * L;
      const ty = I.live + 0.02 + Math.sin(a) * L;
      p.cyl('aluminum', x2, I.live + 0.02, z, tx, ty, z, 0.022, 6);
      if (p.hi) p.torus('aluminum', tx, ty + 0.05, z, 0.045, 0.25);
    } else {
      p.cyl('aluminum', x2, I.live + 0.02, z, x1, I.live + 0.02, z, 0.022, 6);
      if (p.hi) p.torus('aluminum', x1 + 0.12, I.live + 0.09, z, 0.045, 0.25);
    }
  }
  return {
    terminals: { a: at(x1 - 0.08, I.live - 0.03, zs), b: at(x2 + 0.08, I.live - 0.03, zs) },
  };
}

export function powerFuse(p: Parts, I: ItemInfo): ModelOut {
  const zs = phaseZ(I.d, Math.max(0.25, Math.min(I.vc.switchSpacingVerticalBreakM, (I.d - 0.5) / 2)));
  const x1 = Math.min(0.32, I.w * 0.14);
  const x2 = I.w - x1;
  const h = I.insH;
  const yIns = I.live - h - 0.06;
  switchStand(p, I, zs, x1, x2, yIns);
  const r = Math.min(0.075, 0.035 + I.kv * 0.0006);
  for (const z of zs) {
    p.post(x1, yIns, z, h);
    p.post(x2, yIns, z, h);
    p.box('aluminum', x1 - 0.1, I.live - 0.06, z - 0.06, x1 + 0.1, I.live + 0.02, z + 0.06);
    p.box('aluminum', x2 - 0.1, I.live - 0.06, z - 0.06, x2 + 0.1, I.live + 0.02, z + 0.06);
    // Fuse unit between the contacts, slightly raised at the hinge end.
    const ya = I.live + r + 0.04;
    const yb = I.live + r + 0.16;
    p.cyl('fiberglass', x1 + 0.14, ya, z, x2 - 0.14, yb, z, r, p.hi ? 10 : 6);
    p.cyl('aluminum', x1 + 0.04, ya - 0.01, z, x1 + 0.18, ya, z, r * 1.25, p.hi ? 10 : 6);
    p.cyl('aluminum', x2 - 0.18, yb, z, x2 - 0.04, yb + 0.01, z, r * 1.25, p.hi ? 10 : 6);
    if (p.hi) p.torus('aluminum', x2 - 0.1, yb + r + 0.06, z, 0.05, 0.22);
  }
  return {
    terminals: { a: at(x1 - 0.1, I.live - 0.02, zs), b: at(x2 + 0.1, I.live - 0.02, zs) },
  };
}

export function circuitSwitcher(p: Parts, I: ItemInfo): ModelOut {
  const zs = I.zs;
  const x1 = 0.35;
  const x2 = I.w - 0.35;
  const h = I.insH;
  const yIns = I.live - h - 0.25;
  switchStand(p, I, zs, x1, x2, yIns);
  const r = Math.min(0.16, 0.08 + I.kv * 0.0005);
  const xi = x1 + Math.min(1.1, (x2 - x1) * 0.55);
  for (const z of zs) {
    p.post(x1, yIns, z, h);
    p.post(x2, yIns, z, h + 0.19);
    // Interrupter on the first insulator, disconnect blade to the jaw on the second.
    const yc = yIns + h + r;
    p.cyl('tank', x1 - 0.12, yc, z, xi, yc, z, r, p.hi ? 12 : 6);
    p.cyl('aluminum', x1 - 0.18, yc, z, x1 - 0.1, yc, z, r * 0.6, 6);
    p.cyl('aluminum', xi, yc, z, x2, I.live - 0.02, z, 0.03, 6);
    p.box('aluminum', x2 - 0.08, I.live - 0.08, z - 0.05, x2 + 0.1, I.live - 0.02, z + 0.05);
  }
  const zc = Math.max(0.12, zs[0] - 0.42) + 0.1;
  p.box('cabinet', I.w / 2 - 0.35, 1.0, zc - 0.3, I.w / 2 + 0.35, 2.0, zc);
  if (p.hi) p.cyl('steel', I.w / 2, 2.0, zc - 0.15, I.w / 2, yIns - 0.1, zc - 0.15, 0.03, 6);
  return {
    terminals: { a: at(x1 - 0.18, yIns + h + r, zs), b: at(x2 + 0.1, I.live - 0.05, zs) },
  };
}

export function meteringUnit(p: Parts, I: ItemInfo): ModelOut {
  const zs = I.zs;
  const tw = Math.min(0.55, I.w * 0.3);
  const td = Math.min(0.45, I.sp * 0.7);
  const th = Math.min(0.75, 0.4 + I.kv * 0.004);
  const bl = Math.max(0.35, Math.min(1.6, 0.25 + I.kv * 0.011));
  const tilt = 0.32;
  const yBase = I.live - th - bl * Math.cos(tilt) - 0.05;
  phaseStand(p, I, I.w / 2, yBase);
  const a: V3[] = [];
  const b: V3[] = [];
  for (const z of zs) {
    p.box('tank', I.w / 2 - tw / 2, yBase, z - td / 2, I.w / 2 + tw / 2, yBase + th, z + td / 2);
    const r = 0.05 + I.kv * 0.0005;
    a.push(p.bushing(I.w / 2 - tw / 4, yBase + th, z, -Math.sin(tilt), Math.cos(tilt), 0, bl, r));
    b.push(p.bushing(I.w / 2 + tw / 4, yBase + th, z, Math.sin(tilt), Math.cos(tilt), 0, bl, r));
  }
  if (p.hi) p.box('cabinet', I.w / 2 - 0.2, 1.0, 0.06, I.w / 2 + 0.2, 1.55, 0.26);
  return { terminals: { a, b } };
}

export function waveTrap(p: Parts, I: ItemInfo): ModelOut {
  const zs = I.zs;
  const R = Math.min(0.5, I.sp * 0.42, I.w * 0.32);
  const yd0 = I.bus - 0.15;
  const yd1 = I.live;
  const h = Math.min(I.insH, yd0 - 1.2);
  const yBase = yd0 - h - 0.1;
  phaseStand(p, I, I.w / 2, yBase);
  for (const z of zs) {
    p.post(I.w / 2, yBase, z, h);
    p.box('steel', I.w / 2 - R * 0.8, yd0 - 0.1, z - 0.04, I.w / 2 + R * 0.8, yd0, z + 0.04);
    p.vcyl('tankDark', I.w / 2, z, yd0, yd1 - 0.05, R, p.hi ? 16 : 8);
    p.vcyl('aluminum', I.w / 2, z, yd1 - 0.05, yd1, R * 1.06, p.hi ? 16 : 8);
    if (p.hi) {
      p.vcyl('aluminum', I.w / 2, z, yd0, yd0 + 0.05, R * 1.06, 16);
      p.cone('aluminum', I.w / 2, yd1, z, I.w / 2, yd1 + 0.25, z, R * 0.7, R * 0.15, 12);
    }
  }
  return {
    terminals: { a: at(I.w / 2 - R - 0.05, yd0 + 0.1, zs), b: at(I.w / 2 + R + 0.05, yd0 + 0.1, zs) },
  };
}
