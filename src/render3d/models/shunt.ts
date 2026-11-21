/**
 * One-terminal (shunt) devices on pedestal stands: surge arresters, voltage
 * transformers and coupling-capacitor voltage transformers.
 */
import type { Parts, V3 } from '../parts';
import { arresterHeight, at, phaseStand, type ItemInfo, type ModelOut } from './common';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function arresterStand(p: Parts, I: ItemInfo): ModelOut {
  const xc = I.w / 2;
  const ah = arresterHeight(I.kv);
  const yBase = I.live - ah - 0.14;
  phaseStand(p, I, xc, yBase);
  const rc = 0.055 + I.kv * 0.0004;
  const rs = rc * 1.9;
  for (const z of I.zs) {
    p.vcyl('steel', xc, z, yBase, yBase + 0.06, rs * 0.85, p.hi ? 10 : 6);
    p.shed('polymer', xc, yBase + 0.06, z, 0, 1, 0, ah, rc, rs, Math.max(4, Math.round(ah / 0.05)));
    p.vcyl('aluminum', xc, z, yBase + 0.06 + ah, I.live, rc * 1.2, p.hi ? 10 : 6);
    if (p.hi) {
      if (I.kv >= 100) p.torus('aluminum', xc, I.live - 0.25, z, 0.32, 0.07);
      p.cyl('copper', xc + rs, yBase + 0.02, z, xc + 0.12, 0.2, z, 0.01, 4);
    }
  }
  return { terminals: { a: at(xc, I.live + 0.01, I.zs) } };
}

export function voltageTransformer(p: Parts, I: ItemInfo): ModelOut {
  const xc = I.w / 2;
  const a: V3[] = [];
  if (I.kv < 40) {
    // Cast-epoxy distribution-class unit.
    const bh = 0.36;
    const bw = 0.3;
    const bd = 0.26;
    const yBase = I.live - bh - 0.24;
    phaseStand(p, I, xc, yBase);
    for (const z of I.zs) {
      p.box('black', xc - bw / 2, yBase, z - bd / 2, xc + bw / 2, yBase + bh, z + bd / 2);
      p.shed('black', xc, yBase + bh, z, 0, 1, 0, 0.18, 0.05, 0.08, 3);
      p.vcyl('aluminum', xc, z, yBase + bh + 0.18, I.live, 0.03, 6);
      a.push([xc, I.live, z]);
    }
  } else {
    const th = 0.55;
    const tr = 0.2 + I.kv * 0.0005;
    const bl = clamp(0.3 + I.kv * 0.011, 0.5, 2.6);
    const yBase = I.live - th - bl;
    phaseStand(p, I, xc, yBase);
    for (const z of I.zs) {
      p.vcyl('tank', xc, z, yBase, yBase + th, tr, p.hi ? 14 : 8);
      if (p.hi) p.box('cabinet', xc - 0.12, yBase + 0.12, z - tr - 0.12, xc + 0.12, yBase + 0.32, z - tr + 0.02);
      a.push(p.bushing(xc, yBase + th, z, 0, 1, 0, bl, 0.07 + I.kv * 0.0004));
    }
  }
  return { terminals: { a } };
}

export function ccvt(p: Parts, I: ItemInfo): ModelOut {
  const xc = I.w / 2;
  const eh = 0.6;
  const ew = Math.min(0.55, I.sp * 0.7);
  const stack = clamp(0.4 + I.kv * 0.014, 1.0, 3.6);
  const yBase = I.live - eh - stack - 0.08;
  phaseStand(p, I, xc, yBase);
  for (const z of I.zs) {
    p.box('tank', xc - ew / 2, yBase, z - ew / 2, xc + ew / 2, yBase + eh, z + ew / 2);
    p.shed('porcelain', xc, yBase + eh, z, 0, 1, 0, stack, 0.11, 0.2, undefined, 0.85);
    p.vcyl('aluminum', xc, z, yBase + eh + stack, I.live, 0.09, p.hi ? 10 : 6);
    if (p.hi && I.kv >= 100) p.torus('aluminum', xc, I.live - 0.05, z, 0.3, 0.07);
  }
  if (p.hi && I.it.props.carrier !== false) {
    p.box('cabinet', xc + 0.14, 1.0, I.d / 2 - 0.22, xc + 0.44, 1.55, I.d / 2 + 0.22);
  }
  return { terminals: { a: at(xc, I.live, I.zs) } };
}
