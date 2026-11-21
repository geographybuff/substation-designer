/**
 * Structures: H-frame dead-end for incoming/outgoing lines, feeder getaway
 * (distribution pole or underground riser), lightning mast, control house.
 */
import type { Parts, V3 } from '../parts';
import { at, girder, pier, tStand, type ItemInfo, type ModelOut } from './common';

/** Quadratic Bezier lead (sampled into straight cable pieces). */
function bezierLead(p: Parts, a: V3, c: V3, b: V3, r: number): void {
  const n = p.hi ? 6 : 2;
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const q: V3 = [
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
      u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
    ];
    p.cyl('cable', prev[0], prev[1], prev[2], q[0], q[1], q[2], r, p.hi ? 6 : 4);
    prev = q;
  }
}

export function lineTerminal(p: Parts, I: ItemInfo): ModelOut {
  const { w, d, zs } = I;
  const xc = w / 2;
  const zA = 0.35;
  const zB = d - 0.35;
  const yA = I.live; // conductor attachment height
  for (const z of [zA, zB]) {
    pier(p, xc, z, 0.75);
    if (p.hi) p.cone('steel', xc, 0.2, z, xc, I.top, z, 0.21, 0.14, 4, Math.PI / 4);
    else p.box('steel', xc - 0.14, 0.2, z - 0.14, xc + 0.14, I.top, z + 0.14);
  }
  girder(p, xc, zA, xc, zB, yA + 0.4, 0.45, 0.32);
  // Low bus-support girder with a station post per phase: the in-yard terminal.
  const yS = I.bus - I.insH - 0.05;
  girder(p, xc, zA, xc, zB, yS, 0.3, 0.24);
  const n = Math.max(1, I.vc.minSuspensionInsulators);
  const Ls = n * 0.146 + 0.35;
  const x0 = xc - 0.17;
  const attach: V3[] = [];
  for (const z of zs) {
    const xe = x0 - Ls;
    p.cyl('steel', x0, yA, z, x0 - 0.16, yA, z, 0.02, 6);
    if (p.hi) {
      p.cyl('steel', x0 - 0.16, yA, z, xe + 0.12, yA, z, 0.014, 6);
      for (let i = 0; i < n; i++) {
        const x = x0 - 0.2 - i * 0.146 - 0.06;
        p.cyl('porcelain', x - 0.022, yA, z, x + 0.022, yA, z, 0.125, 12);
      }
    } else {
      p.cyl('porcelain', x0 - 0.16, yA, z, xe + 0.12, yA, z, 0.08, 6);
    }
    p.cyl('steel', xe + 0.12, yA, z, xe, yA, z, 0.025, 6);
    attach.push([xe, yA, z]);
    p.post(xc, yS, z, I.insH);
    p.box('aluminum', xc - 0.1, I.bus - 0.05, z - 0.05, xc + 0.12, I.bus, z + 0.05);
    // Slack jumper from the dead-end clamp down under the girder to the bus support.
    bezierLead(p, [xe, yA - 0.04, z], [xe - 0.2, I.bus + 0.3, z], [xc - 0.08, I.bus, z], 0.022);
  }
  if (p.hi) {
    // Shield-wire peaks on the column tops.
    for (const z of [zA, zB]) p.cone('steel', xc, I.top, z, xc, I.top + 0.9, z, 0.07, 0.03, 4, Math.PI / 4);
  }
  return {
    terminals: { a: at(xc + 0.08, I.bus - 0.02, zs) },
    offsite: { attach, dir: [-1, 0], kind: 'transmission' },
  };
}

export function feederExit(p: Parts, I: ItemInfo): ModelOut {
  if (I.it.props.underground === true) return undergroundRiser(p, I);
  const { d, zs } = I;
  const xc = I.w / 2;
  const zp = Math.min(d - 0.17, zs[2] + 0.42);
  const zArm0 = Math.max(0.05, zs[0] - 0.3);
  // Wood pole with two alley arms: the dead-end arm on top, the bus-support arm below.
  p.cone('wood', xc, -0.05, zp, xc, I.top, zp, 0.17, 0.12, p.hi ? 10 : 6);
  const yU = I.live - 0.12;
  p.box('crossarm', xc - 0.05, yU - 0.06, zArm0, xc + 0.05, yU + 0.06, zp + 0.12);
  const insH = I.insH;
  const yL = I.bus - insH - 0.06;
  p.box('crossarm', xc - 0.05, yL - 0.12, zArm0, xc + 0.05, yL, zp + 0.12);
  if (p.hi) {
    p.beam('steel', xc, yU - 0.06, zArm0 + 0.25, xc, yU - 0.95, zp - 0.12, 0.035, 0.035);
    p.beam('steel', xc, yL - 0.12, zArm0 + 0.25, xc, yL - 0.95, zp - 0.12, 0.035, 0.035);
  }
  const len = 0.32 + I.kv * 0.012;
  const attach: V3[] = [];
  for (const z of zs) {
    p.shed('polymer', xc + 0.06, I.live, z, 1, 0, 0, len, 0.032, 0.06, Math.max(4, Math.round(len / 0.06)));
    p.cyl('steel', xc + 0.06 + len, I.live, z, xc + 0.14 + len, I.live, z, 0.015, 6);
    attach.push([xc + 0.14 + len, I.live, z]);
    p.post(xc, yL, z, insH);
    // Riser lead from the bus-support insulator up to the dead-end.
    p.lead(xc + 0.03, I.bus, z, xc + 0.08, I.live - 0.03, z, 0, 0.016);
    if (p.hi) {
      // Riser arrester on the upper arm.
      p.box('steel', xc - 0.2, yU - 0.1, z - 0.03, xc - 0.05, yU - 0.06, z + 0.03);
      p.shed('polymer', xc - 0.17, yU - 0.5, z, 0, 1, 0, 0.36, 0.035, 0.065, 6);
    }
  }
  return {
    terminals: { a: at(xc - 0.02, I.bus + 0.02, zs) },
    offsite: { attach, dir: [1, 0], kind: 'distribution' },
  };
}

function undergroundRiser(p: Parts, I: ItemInfo): ModelOut {
  const { d, zs } = I;
  const xc = I.w / 2;
  const termH = Math.max(0.45, I.insH * 1.4);
  const yG = I.bus - termH - 0.05;
  tStand(p, xc - 0.12, d / 2, Math.max(0.1, zs[0] - 0.25), Math.min(d - 0.1, zs[2] + 0.25), yG);
  const xcab = xc + 0.2;
  for (const z of zs) {
    p.shed('polymer', xc, yG, z, 0, 1, 0, termH, 0.055, 0.11, undefined, 0.8);
    p.vcyl('aluminum', xc, z, yG + termH, I.bus, 0.035, 6);
    p.cyl('black', xc, yG + 0.02, z, xcab, yG - 0.25, z, 0.035, 6);
    p.cyl('black', xcab, yG - 0.25, z, xcab, 0.55, z, 0.035, 6);
    p.cyl('steelDark', xcab, -0.05, z, xcab, 0.6, z, 0.06, 8);
  }
  p.box('concrete', xc - 0.15, -0.05, zs[0] - 0.3, xc + 0.5, 0.08, zs[2] + 0.3);
  return { terminals: { a: at(xc, I.bus + 0.02, zs) } };
}

export function lightningMast(p: Parts, I: ItemInfo): ModelOut {
  const x = I.w / 2;
  const z = I.d / 2;
  const h = Number(I.it.props.heightM) || I.top || 18;
  const fin = Math.min(1.4, h * 0.08);
  p.vcyl('concrete', x, z, -0.05, 0.3, 0.42, p.hi ? 12 : 8);
  p.box('steel', x - 0.3, 0.3, z - 0.3, x + 0.3, 0.34, z + 0.3);
  const segs = p.hi ? 12 : 6;
  if (p.hi) {
    const hj = 0.58 * (h - fin);
    p.cone('galv', x, 0.34, z, x, hj, z, 0.2, 0.135, segs);
    p.vcyl('galv', x, z, hj - 0.07, hj + 0.07, 0.15, segs);
    p.cone('galv', x, hj, z, x, h - fin, z, 0.125, 0.07, segs);
    p.sphere('galv', x, h - fin, z, 0.08);
  } else {
    p.cone('galv', x, 0.34, z, x, h - fin, z, 0.19, 0.07, segs);
  }
  p.cone('galv', x, h - fin, z, x, h, z, 0.025, 0.008, p.hi ? 6 : 4);
  return { terminals: {} };
}

export function controlHouse(p: Parts, I: ItemInfo): ModelOut {
  const { w, d, top } = I;
  const wallTop = top - Math.min(0.75, d * 0.12);
  p.box('concrete', 0.05, -0.05, 0.05, w - 0.05, 0.2, d - 0.05);
  const x0 = 0.28;
  const x1 = w - 0.28;
  const z0 = 0.22;
  const z1 = d - 0.22;
  p.box('wall', x0, 0.2, z0, x1, wallTop, z1);
  p.prism('roof', w / 2, wallTop, d / 2, w - 0.12, top - wallTop, d - 0.12);
  const dx = Math.min(w * 0.28, 2.2);
  p.box('door', dx - 0.5, 0.2, z0 - 0.04, dx + 0.5, 2.3, z0 + 0.01);
  if (p.hi) {
    p.box('roof', x0 - 0.01, 0.2, z0 - 0.01, x1 + 0.01, 0.34, z1 + 0.01);
    p.box('cabinet', dx - 0.1, 2.45, z0 - 0.12, dx + 0.1, 2.58, z0);
    p.box('cabinet', x1, 1.1, d / 2 - 0.45, x1 + 0.22, 2.0, d / 2 + 0.45);
    p.box('door', w * 0.68 - 0.9, 0.2, z1 - 0.01, w * 0.68 + 0.9, 2.5, z1 + 0.04);
    // Cable entrance hood and conduit from the yard.
    p.box('steelDark', x0 - 0.18, 0.2, d / 2 - 0.3, x0, 0.9, d / 2 + 0.3);
  }
  return { terminals: {} };
}
