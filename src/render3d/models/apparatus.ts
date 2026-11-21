/**
 * Major apparatus: power transformer, step voltage regulators, dead-tank
 * breaker, recloser, capacitor bank, station service transformer, mobile pad.
 */
import type { Parts, V3 } from '../parts';
import { arresterHeight, at, column, girder, hStand, phaseZ, postHeight, tStand, vclass, type ItemInfo, type ModelOut } from './common';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function powerTransformer(p: Parts, I: ItemInfo): ModelOut {
  const { w, d } = I;
  const props = I.it.props;
  const kva = Number(props.kva) || 10000;
  const scale = clamp(0.92 + 0.07 * Math.log2(kva / 10000), 0.8, 1.06);
  const padH = 0.25;
  p.box('concrete', 0.15, -0.05, 0.15, w - 0.15, padH, d - 0.15);
  if (props.containment === 'basic' || props.containment === 'separator') {
    const c = 0.12;
    const hC = padH + 0.3;
    p.box('concrete', 0.02, -0.05, 0.02, w - 0.02, hC, 0.02 + c);
    p.box('concrete', 0.02, -0.05, d - 0.02 - c, w - 0.02, hC, d - 0.02);
    p.box('concrete', 0.02, -0.05, 0.02, 0.02 + c, hC, d - 0.02);
    p.box('concrete', w - 0.02 - c, -0.05, 0.02, w - 0.02, hC, d - 0.02);
  }
  const tx0 = w * 0.22;
  const tx1 = w * 0.78;
  const radD = Math.min(0.95, d * 0.18);
  const tz0 = radD + 0.5;
  const tz1 = d - radD - 0.5;
  const tankTop = padH + 0.12 + 2.45 * scale;
  p.box('tankDark', tx0 + 0.05, padH, tz0 + 0.05, tx1 - 0.05, padH + 0.12, tz1 - 0.05);
  p.box('tank', tx0, padH + 0.12, tz0, tx1, tankTop, tz1);
  p.box('tank', tx0 - 0.06, tankTop, tz0 - 0.06, tx1 + 0.06, tankTop + 0.08, tz1 + 0.06);
  const cover = tankTop + 0.08;

  // Radiator banks on both long faces, with fans for forced-air ratings.
  const ltc = props.ltc === true;
  const rx0 = tx0 + 0.25;
  const rx1 = ltc ? tx1 - 1.0 : tx1 - 0.25;
  const ry0 = padH + 0.45;
  const ry1 = tankTop - 0.3;
  const cooling = String(props.cooling ?? 'OA');
  const fans = cooling === 'OA/FA/FA' ? 3 : cooling === 'OA/FA' ? 2 : 0;
  for (const side of [-1, 1]) {
    const zIn = side < 0 ? tz0 : tz1;
    const zOut = zIn + side * radD;
    const za = Math.min(zIn + side * 0.12, zOut);
    const zb = Math.max(zIn + side * 0.12, zOut);
    if (p.hi) {
      const n = Math.max(4, Math.floor((rx1 - rx0) / 0.19));
      for (let i = 0; i < n; i++) {
        const x = rx0 + ((i + 0.5) * (rx1 - rx0)) / n;
        p.box('tank', x - 0.03, ry0, za, x + 0.03, ry1, zb);
      }
      const zh = zIn + side * 0.1;
      p.cyl('tank', rx0, ry1 - 0.1, zh, rx1, ry1 - 0.1, zh, 0.07, 8);
      p.cyl('tank', rx0, ry0 + 0.1, zh, rx1, ry0 + 0.1, zh, 0.07, 8);
      for (let f = 0; f < fans; f++) {
        const x = rx0 + ((f + 0.5) * (rx1 - rx0)) / fans;
        const ym = ry0 + 0.32;
        p.cyl('steelDark', x, ym, zOut, x, ym, zOut + side * 0.16, 0.24, 14);
        p.cyl('black', x, ym, zOut + side * 0.16, x, ym, zOut + side * 0.18, 0.08, 8);
        p.box('steelDark', x - 0.03, ym + 0.2, zIn + side * 0.15, x + 0.03, ym + 0.26, zOut + side * 0.08);
      }
    } else {
      p.box('tank', rx0, ry0, za, rx1, ry1, zb);
    }
  }
  if (ltc) p.box('tank', tx1 - 0.85, padH + 0.4, tz0 - 0.6, tx1 - 0.05, tankTop - 0.25, tz0);
  // Control cabinet on the low-voltage end.
  p.box('cabinet', tx1, 0.85, d / 2 - 0.45, tx1 + 0.32, 2.05, d / 2 + 0.45);

  // High-voltage bushings, tilted outward, tops at the catalogue live height.
  const spHV = clamp((tz1 - tz0) / 2 - 0.22, 0.3, 1.2);
  const tiltHV = 0.26;
  const lenHV = Math.max(0.5, (I.live - cover) / Math.cos(tiltHV));
  const rHV = 0.07 + I.kv * 0.0007;
  const xHV = tx0 + 0.38;
  const hv: V3[] = [];
  for (const z of phaseZ(d, spHV)) {
    hv.push(p.bushing(xHV, cover, z, -Math.sin(tiltHV), Math.cos(tiltHV), 0, lenHV, rHV));
  }
  // Low-voltage bushings plus the neutral (X0).
  const lvKV = I.it.lvKV ?? 12.47;
  const spLV = clamp(spHV * 0.62, 0.25, 0.6);
  const tiltLV = 0.18;
  const lenLV = clamp(0.38 + lvKV * 0.012, 0.45, 1.1);
  const rLV = 0.055 + lvKV * 0.0007;
  const xLV = tx1 - 0.38;
  const lv: V3[] = [];
  for (const z of phaseZ(d, spLV)) {
    lv.push(p.bushing(xLV, cover, z, Math.sin(tiltLV), Math.cos(tiltLV), 0, lenLV, rLV));
  }
  p.bushing(xLV - 0.42, cover, d / 2 + spLV, 0, 1, 0, lenLV * 0.75, rLV * 0.9);

  // Tank-mounted arresters on brackets beside the bushings.
  const arr = String(props.arresters ?? 'none');
  if (arr === 'hv' || arr === 'hv_lv') {
    const ah = arresterHeight(I.kv) * 0.85;
    for (let k = 0; k < 3; k++) {
      const t = hv[k]!;
      const z = phaseZ(d, spHV)[k]!;
      const x = tx0 - 0.24;
      p.box('steel', x - 0.08, cover - 0.32, z - 0.06, tx0, cover - 0.26, z + 0.06);
      p.shed('polymer', x, cover - 0.26, z, 0, 1, 0, ah, 0.055, 0.1);
      if (p.hi) p.lead(x, cover - 0.26 + ah, z, t[0], t[1], t[2], 0.1, 0.012);
    }
  }
  if (arr === 'hv_lv') {
    const ah = arresterHeight(lvKV) * 0.9;
    for (let k = 0; k < 3; k++) {
      const t = lv[k]!;
      const z = phaseZ(d, spLV)[k]!;
      const x = tx1 + 0.2;
      p.box('steel', tx1, cover - 0.3, z - 0.05, x + 0.07, cover - 0.25, z + 0.05);
      p.shed('polymer', x, cover - 0.25, z, 0, 1, 0, ah, 0.045, 0.085);
      if (p.hi) p.lead(x, cover - 0.25 + ah, z, t[0], t[1], t[2], 0.05, 0.012);
    }
  }
  return { terminals: { hv, lv } };
}

export function voltageRegulator(p: Parts, I: ItemInfo): ModelOut {
  const { w, d } = I;
  const sp = clamp(Math.max(1.2, I.it.phaseSpacing), 0.5, (d - 0.9) / 2);
  const zs = phaseZ(d, sp);
  const r = Math.min(0.46, sp * 0.4);
  const yPlat = 1.55;
  const bl = 0.5;
  const canTop = Math.max(yPlat + 0.9, I.live - bl - 0.08);
  const xc = w / 2;
  // Platform: two H-frames tied together.
  hStand(p, xc - 0.55, 0.3, d - 0.3, yPlat, 0.2, 0.15);
  hStand(p, xc + 0.55, 0.3, d - 0.3, yPlat, 0.2, 0.15);
  for (const z of [0.3, d - 0.3]) p.box('steel', xc - 0.62, yPlat - 0.18, z - 0.05, xc + 0.62, yPlat - 0.02, z + 0.05);
  const a: V3[] = [];
  const b: V3[] = [];
  const segs = p.hi ? 16 : 8;
  for (const z of zs) {
    p.box('tankDark', xc - r * 1.1, yPlat, z - r * 1.1, xc + r * 1.1, yPlat + 0.05, z + r * 1.1);
    p.vcyl('tank', xc, z, yPlat + 0.05, canTop, r, segs);
    p.vcyl('tank', xc, z, canTop, canTop + 0.06, r * 1.06, segs);
    const yb = canTop + 0.06;
    a.push(p.bushing(xc - r * 0.5, yb, z, -0.12, 1, 0, bl, 0.05));
    b.push(p.bushing(xc + r * 0.5, yb, z, 0.12, 1, 0, bl, 0.05));
    p.bushing(xc, yb, z + r * 0.45, 0, 1, 0.1, bl * 0.75, 0.045);
    if (p.hi) {
      const ym = yPlat + (canTop - yPlat) * 0.45;
      p.box('cabinet', xc - r - 0.24, ym, z - 0.17, xc - r - 0.02, ym + 0.44, z + 0.17);
      for (const dz of [-0.18, 0, 0.18]) p.box('tank', xc + r - 0.04, yPlat + 0.25, z + dz - 0.025, xc + r + 0.16, canTop - 0.15, z + dz + 0.025);
      p.vcyl('black', xc + r * 0.25, z - r * 0.5, yb, yb + 0.05, 0.09, 10);
      if (I.it.props.arresters === true) {
        p.shed('polymer', xc - r * 0.95, yb - 0.1, z, 0, 1, 0, 0.36, 0.035, 0.065);
        p.shed('polymer', xc + r * 0.95, yb - 0.1, z, 0, 1, 0, 0.36, 0.035, 0.065);
      }
    }
  }
  return { terminals: { a, b } };
}

export function deadTankBreaker(p: Parts, I: ItemInfo): ModelOut {
  const { w, zs } = I;
  const tankR = clamp(0.16 + I.kv * 0.0027, 0.2, 0.6);
  const L = clamp(w * 0.55, 0.9, 3.2);
  const tilt = 0.3;
  const bl = clamp(0.5 + I.kv * 0.012, 0.6, 3.4);
  const rb = 0.06 + I.kv * 0.0007;
  const xc = w / 2;
  const yC = I.live - bl * Math.cos(tilt) - tankR * 0.92;
  const yF = yC - tankR - 0.02;
  for (const x of [xc - L * 0.32, xc + L * 0.32]) {
    for (const z of [zs[0], zs[2]]) column(p, x, z, yF - 0.15, 0.14);
    p.box('steel', x - 0.08, yF - 0.15, zs[0] - 0.12, x + 0.08, yF, zs[2] + 0.12);
    if (p.hi) {
      p.beam('steel', x, 0.6, zs[0], x, yF - 0.15, zs[2], 0.05, 0.05);
      p.beam('steel', x, 0.6, zs[2], x, yF - 0.15, zs[0], 0.05, 0.05);
    }
  }
  const segs = p.hi ? 16 : 8;
  const a: V3[] = [];
  const b: V3[] = [];
  for (const z of zs) {
    p.cyl('tank', xc - L / 2, yC, z, xc + L / 2, yC, z, tankR, segs);
    if (p.hi) {
      p.cyl('tankDark', xc - L / 2 - 0.04, yC, z, xc - L / 2 + 0.05, yC, z, tankR * 1.07, segs);
      p.cyl('tankDark', xc + L / 2 - 0.05, yC, z, xc + L / 2 + 0.04, yC, z, tankR * 1.07, segs);
    }
    const yb = yC + tankR * 0.92;
    for (const s of [-1, 1]) {
      const bx = xc + s * L * 0.3;
      const dx = s * Math.sin(tilt);
      const dy = Math.cos(tilt);
      if (p.hi) p.cyl('tankDark', bx, yb - 0.05, z, bx + dx * 0.3, yb + dy * 0.3, z, rb * 1.7, 12);
      const t = p.bushing(bx + dx * (p.hi ? 0.3 : 0), yb + (p.hi ? dy * 0.3 : 0), z, dx, dy, 0, p.hi ? bl - 0.3 : bl, rb);
      (s < 0 ? a : b).push(t);
    }
  }
  // Mechanism / control cabinet on the side of the frame.
  const zc1 = Math.max(0.3, zs[0] - tankR - 0.06);
  p.box('cabinet', xc - 0.45, 0.85, 0.06, xc + 0.45, Math.min(yF - 0.2, 2.25), zc1);
  return { terminals: { a, b } };
}

export function recloser(p: Parts, I: ItemInfo): ModelOut {
  const { w, d, zs } = I;
  const round = I.it.props.control === 'hydraulic' || I.it.props.interrupter === 'oil';
  const bl = clamp(0.35 + I.kv * 0.012, 0.45, 1.0);
  const tankH = round ? 0.75 : 0.55;
  const tilt = 0.2;
  const yT = I.live - bl * Math.cos(tilt) - tankH - 0.02;
  const lx0 = 0.4;
  const lx1 = w - 0.4;
  const lz0 = Math.max(0.22, zs[0] - 0.36);
  const lz1 = Math.min(d - 0.22, zs[2] + 0.36);
  for (const x of [lx0, lx1]) for (const z of [lz0, lz1]) column(p, x, z, yT - 0.1, 0.1);
  for (const z of [lz0, lz1]) p.box('steel', lx0 - 0.06, yT - 0.12, z - 0.05, lx1 + 0.06, yT, z + 0.05);
  for (const x of [lx0, lx1]) p.box('steel', x - 0.05, yT - 0.12, lz0 - 0.06, x + 0.05, yT, lz1 + 0.06);
  if (p.hi) {
    for (const z of [lz0, lz1]) {
      p.beam('steel', lx0, 0.5, z, lx1, yT - 0.12, z, 0.04, 0.04);
      p.beam('steel', lx1, 0.5, z, lx0, yT - 0.12, z, 0.04, 0.04);
    }
  }
  const xc = w / 2;
  if (round) {
    const r = Math.min(0.28, I.sp * 0.42);
    for (const z of zs) {
      p.vcyl('tank', xc, z, yT, yT + tankH, r, p.hi ? 14 : 8);
      p.vcyl('tankDark', xc, z, yT + tankH - 0.06, yT + tankH, r * 1.08, p.hi ? 14 : 8);
    }
  } else {
    p.box('tank', xc - 0.42, yT, zs[0] - 0.28, xc + 0.42, yT + tankH, zs[2] + 0.28);
    if (p.hi) p.box('tankDark', xc - 0.45, yT + tankH - 0.05, zs[0] - 0.31, xc + 0.45, yT + tankH, zs[2] + 0.31);
  }
  const a: V3[] = [];
  const b: V3[] = [];
  for (const z of zs) {
    a.push(p.bushing(xc - 0.2, yT + tankH, z, -Math.sin(tilt), Math.cos(tilt), 0, bl, 0.055));
    b.push(p.bushing(xc + 0.2, yT + tankH, z, Math.sin(tilt), Math.cos(tilt), 0, bl, 0.055));
  }
  // Control cabinet hung from the frame, with its control cable.
  p.box('cabinet', xc - 0.25, 1.05, 0.04, xc + 0.25, 1.85, Math.max(0.2, lz0 - 0.08));
  if (p.hi) p.lead(xc, 1.85, 0.15, xc, yT + 0.1, zs[0] - 0.28, 0.1, 0.015, 'black');
  return { terminals: { a, b } };
}

export function capacitorBank(p: Parts, I: ItemInfo): ModelOut {
  const { w, d, zs } = I;
  const kvar = Number(I.it.props.kvar) || 2400;
  const perPhase = clamp(Math.round(kvar / 3 / 200), 2, 12);
  const perTier = Math.max(1, Math.min(perPhase, Math.floor((w - 0.8) / 0.46)));
  const tiers = Math.ceil(perPhase / perTier);
  const tierH = 0.78;
  const insH = Math.min(I.insH, 0.6);
  const yTopUnits = I.live - 0.3;
  const yRack0 = yTopUnits - tiers * tierH;
  const yBase = yRack0 - insH - 0.06;
  const sx0 = 0.45;
  const sx1 = w - 0.45;
  const sz0 = 0.3;
  const sz1 = d - 0.3;
  for (const x of [sx0, sx1]) for (const z of [sz0, sz1]) column(p, x, z, yBase - 0.2, 0.16);
  for (const z of [sz0, sz1]) girder(p, sx0 - 0.1, z, sx1 + 0.1, z, yBase, 0.2, 0.16);
  for (const x of [sx0, sx1]) for (const z of [sz0, sz1]) p.post(x, yBase, z, insH);
  // Rack: corner posts, a frame per tier.
  for (const x of [sx0, sx1]) for (const z of [sz0, sz1]) p.box('steel', x - 0.03, yRack0, z - 0.03, x + 0.03, yTopUnits + 0.05, z + 0.03);
  for (let t = 0; t <= tiers; t++) {
    const y = yRack0 + t * tierH;
    for (const z of [sz0, sz1]) p.box('steel', sx0, y, z - 0.04, sx1, y + 0.05, z + 0.04);
    for (const z of zs) p.box('steel', sx0, y, z - 0.1, sx1, y + 0.04, z + 0.1);
  }
  const pitch = (sx1 - sx0) / perTier;
  for (const z of zs) {
    let placed = 0;
    for (let t = 0; t < tiers; t++) {
      for (let i = 0; i < perTier && placed < perPhase; i++, placed++) {
        const x = sx0 + pitch * (i + 0.5);
        const y0 = yRack0 + t * tierH + 0.06;
        p.box('cabinet', x - 0.17, y0, z - 0.075, x + 0.17, y0 + 0.5, z + 0.075);
        if (p.hi) {
          p.vcyl('porcelain', x, z, y0 + 0.5, y0 + 0.62, 0.03, 6);
          if (t === tiers - 1) p.cyl('fiberglass', x, y0 + 0.62, z, x, I.live - 0.08, z, 0.016, 5);
        }
      }
    }
    p.cyl('aluminum', 0.2, I.live - 0.05, z, sx1, I.live - 0.05, z, 0.028, 6);
    p.post(sx1, yTopUnits + 0.05, z, Math.max(0.1, I.live - 0.08 - yTopUnits - 0.05));
  }
  return { terminals: { a: at(0.2, I.live - 0.05, zs) } };
}

export function stationService(p: Parts, I: ItemInfo): ModelOut {
  const { w, d } = I;
  const sp = Math.min(I.sp, (d - 0.5) / 2);
  const zs = phaseZ(d, sp);
  const r = Math.min(0.22, sp * 0.36);
  const bl = 0.3;
  const canH = 0.62;
  const xc = w / 2;
  const yPlat = I.live - bl - canH - 0.1;
  if (d <= 2.4) tStand(p, xc, d / 2, 0.12, d - 0.12, yPlat);
  else hStand(p, xc, 0.25, d - 0.25, yPlat, 0.2, 0.15);
  const a: V3[] = [];
  for (const z of zs) {
    p.vcyl('tank', xc, z, yPlat, yPlat + canH, r, p.hi ? 12 : 8);
    p.vcyl('tankDark', xc, z, yPlat + canH, yPlat + canH + 0.04, r * 1.08, p.hi ? 12 : 8);
    a.push(p.bushing(xc - r * 0.35, yPlat + canH + 0.04, z, 0, 1, 0, bl, 0.04));
    if (p.hi) p.vcyl('black', xc + r * 0.9, z, yPlat + canH * 0.5, yPlat + canH * 0.7, 0.03, 6);
  }
  if (p.hi) p.cyl('steelDark', xc + 0.28, -0.05, d / 2, xc + 0.28, yPlat + 0.35, d / 2, 0.035, 6);
  return { terminals: { a } };
}

export function mobilePad(p: Parts, I: ItemInfo): ModelOut {
  const { w, d } = I;
  p.box('concrete', 0, -0.05, 0.15, w, 0.15, d - 0.15);
  const m = 0.5;
  const t = 0.08;
  p.box('yellow', m, 0.15, m, w - m, 0.158, m + t);
  p.box('yellow', m, 0.15, d - m - t, w - m, 0.158, d - m);
  p.box('yellow', m, 0.15, m, m + t, 0.158, d - m);
  p.box('yellow', w - m - t, 0.15, m, w - m, 0.158, d - m);
  for (const x of [0.25, w - 0.25]) for (const z of [0.3, d - 0.3]) p.vcyl('yellow', x, z, 0.15, 1.05, 0.08, p.hi ? 10 : 6);
  // High-voltage connection stand.
  const insHV = I.insH;
  hStand(p, 0.65, 0.35, d - 0.35, I.live - insHV - 0.06, 0.25);
  for (const z of I.zs) {
    p.post(0.65, I.live - insHV - 0.06, z, insHV);
    p.box('aluminum', 0.55, I.live - 0.06, z - 0.05, 0.75, I.live, z + 0.05);
  }
  // Low-voltage connection stand.
  const lvKV = I.it.lvKV ?? (typeof I.it.props.lvKV === 'number' ? I.it.props.lvKV : 12.47);
  const spLV = Math.min(vclass(lvKV).rigidBusPhaseSpacingM, (d - 0.6) / 2);
  const zsLV = phaseZ(d, spLV);
  const insLV = postHeight(lvKV);
  const yLV = I.live - insLV - 0.06;
  if (zsLV[2] - zsLV[0] + 0.6 <= 2.2) tStand(p, w - 0.65, d / 2, zsLV[0] - 0.3, zsLV[2] + 0.3, yLV);
  else hStand(p, w - 0.65, 0.35, d - 0.35, yLV, 0.22);
  for (const z of zsLV) {
    p.post(w - 0.65, yLV, z, insLV);
    p.box('aluminum', w - 0.75, I.live - 0.06, z - 0.05, w - 0.55, I.live, z + 0.05);
  }
  return { terminals: { hv: at(0.65, I.live - 0.02, I.zs), lv: at(w - 0.65, I.live - 0.02, zsLV) } };
}
