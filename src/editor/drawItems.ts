/**
 * Top-down equipment symbols for the plan view. Drawn in local metres with the
 * origin at the footprint centre, before rotation: x along the power-flow axis
 * (w), y across the phases (d).
 */
import type { Footprint } from '../engine/catalog';
import type { PlacedItem } from '../engine/types';
import { clearanceClassFor } from '../engine/site';
import { kvColor, THEME } from './theme';

export interface DrawOpts {
  /** Pixels per metre (for hairline widths). */
  scale: number;
  detail: 'low' | 'high';
  ghost?: 'ok' | 'bad';
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

export function drawItem(ctx: CanvasRenderingContext2D, it: PlacedItem, fp: Footprint, o: DrawOpts): void {
  const { w, d } = fp;
  const px = (n: number) => n / o.scale;
  const hw = w / 2;
  const hd = d / 2;
  const kv = it.kind === 'transformer' ? it.kv : it.kv;
  const color = kvColor(kv);
  const spacing = it.kv > 0 ? Math.min(clearanceClassFor(it.kv).rigidBusPhaseSpacingM, hd * 0.8) : 0;
  const phases = [-spacing, 0, spacing];
  const hi = o.detail === 'high';

  // Base pad
  ctx.lineWidth = px(1.25);
  if (it.kind !== 'mast' && it.kind !== 'mobile_pad') {
    rr(ctx, -hw, -hd, w, d, 0.25);
    ctx.fillStyle = 'rgba(30,38,46,0.55)';
    ctx.fill();
    ctx.strokeStyle = it.kv > 0 ? color : THEME.steelLight;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const phaseLine = (x0: number, x1: number, width = 2) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = px(width);
    ctx.beginPath();
    for (const p of phases) {
      ctx.moveTo(x0, p);
      ctx.lineTo(x1, p);
    }
    ctx.stroke();
  };

  switch (it.kind) {
    case 'transformer': {
      // Tank with radiators, HV bushings on the left, LV on the right.
      const tw = w * 0.56;
      const td = d * 0.62;
      ctx.fillStyle = THEME.tank;
      rr(ctx, -tw / 2, -td / 2, tw, td, 0.3);
      ctx.fill();
      ctx.strokeStyle = THEME.steelDark;
      ctx.lineWidth = px(1);
      ctx.stroke();
      if (hi) {
        ctx.fillStyle = '#6b7783';
        const fins = 6;
        for (let i = 0; i < fins; i++) {
          const x = -tw / 2 + (tw * (i + 0.5)) / fins - 0.12;
          ctx.fillRect(x, -td / 2 - 0.55, 0.24, 0.55);
          ctx.fillRect(x, td / 2, 0.24, 0.55);
        }
      }
      const hvColor = kvColor(it.kv);
      const lvColor = kvColor(Number(it.props.lvKV) || 0);
      for (const p of phases) {
        ctx.fillStyle = hvColor;
        circle(ctx, -tw / 2 + 0.45, p * 0.85, 0.22);
        ctx.fill();
        ctx.fillStyle = lvColor;
        circle(ctx, tw / 2 - 0.45, p * 0.6, 0.16);
        ctx.fill();
      }
      ctx.strokeStyle = hvColor;
      ctx.lineWidth = px(2);
      ctx.beginPath();
      for (const p of phases) {
        ctx.moveTo(-hw, 0);
        ctx.lineTo(-tw / 2 + 0.45, p * 0.85);
      }
      ctx.stroke();
      ctx.strokeStyle = lvColor;
      ctx.beginPath();
      for (const p of phases) {
        ctx.moveTo(hw, 0);
        ctx.lineTo(tw / 2 - 0.45, p * 0.6);
      }
      ctx.stroke();
      if (it.props.ltc) {
        ctx.fillStyle = THEME.steelLight;
        ctx.fillRect(tw / 2 - 0.2, td / 2 - 0.9, 0.6, 0.8);
      }
      break;
    }
    case 'breaker':
    case 'circuit_switcher': {
      phaseLine(-hw, hw, 1.5);
      for (const p of phases) {
        ctx.fillStyle = it.kind === 'breaker' ? THEME.tank : THEME.steelLight;
        rr(ctx, -w * 0.28, p - 0.28, w * 0.56, 0.56, 0.25);
        ctx.fill();
        ctx.strokeStyle = THEME.steelDark;
        ctx.lineWidth = px(1);
        ctx.stroke();
      }
      if (it.props.normallyOpen) drawOpenMark(ctx, px);
      break;
    }
    case 'recloser': {
      phaseLine(-hw, hw, 1.5);
      ctx.fillStyle = THEME.tank;
      rr(ctx, -0.55, -hd * 0.7, 1.1, d * 0.7, 0.2);
      ctx.fill();
      ctx.strokeStyle = THEME.steelDark;
      ctx.lineWidth = px(1);
      ctx.stroke();
      if (it.props.reclosing !== false && hi) {
        ctx.strokeStyle = THEME.portOk;
        ctx.lineWidth = px(1.5);
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(0.35, hd * 0.4), -Math.PI * 0.8, Math.PI * 0.6);
        ctx.stroke();
      }
      break;
    }
    case 'switch':
    case 'hookstick_switch':
    case 'fuse': {
      const open = !!it.props.normallyOpen;
      ctx.strokeStyle = color;
      ctx.lineWidth = px(2);
      ctx.beginPath();
      for (const p of phases) {
        ctx.moveTo(-hw, p);
        ctx.lineTo(-hw * 0.55, p);
        ctx.moveTo(hw * 0.55, p);
        ctx.lineTo(hw, p);
      }
      ctx.stroke();
      for (const p of phases) {
        if (it.kind === 'fuse') {
          ctx.fillStyle = '#b8c2cc';
          rr(ctx, -hw * 0.5, p - 0.12, w * 0.5, 0.24, 0.1);
          ctx.fill();
        } else {
          ctx.strokeStyle = open ? THEME.textDim : '#e2e8f0';
          ctx.lineWidth = px(it.kind === 'hookstick_switch' ? 1.5 : 2.5);
          ctx.beginPath();
          ctx.moveTo(-hw * 0.55, p);
          ctx.lineTo(open ? hw * 0.35 : hw * 0.55, open ? p - Math.min(0.5, hd * 0.25) : p);
          ctx.stroke();
          ctx.fillStyle = THEME.porcelain;
          circle(ctx, -hw * 0.55, p, 0.11);
          ctx.fill();
          circle(ctx, hw * 0.55, p, 0.11);
          ctx.fill();
        }
      }
      if (it.kind === 'switch' && it.props.motor) {
        ctx.fillStyle = THEME.steelLight;
        ctx.fillRect(-0.2, hd - 0.45, 0.4, 0.35);
      }
      if (open) drawOpenMark(ctx, px);
      break;
    }
    case 'regulator': {
      phaseLine(-hw, -hw * 0.5, 1.5);
      phaseLine(hw * 0.5, hw, 1.5);
      for (const p of [-hd * 0.6, 0, hd * 0.6]) {
        ctx.fillStyle = THEME.tank;
        circle(ctx, 0, p, Math.min(0.55, hd * 0.27));
        ctx.fill();
        ctx.strokeStyle = THEME.steelDark;
        ctx.lineWidth = px(1);
        ctx.stroke();
      }
      if (it.props.bypass) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.setLineDash([px(3), px(3)]);
        ctx.lineWidth = px(1.2);
        ctx.beginPath();
        ctx.moveTo(-hw * 0.6, -hd + 0.15);
        ctx.lineTo(hw * 0.6, -hd + 0.15);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      break;
    }
    case 'arrester':
    case 'vt':
    case 'ccvt':
    case 'station_service': {
      phaseLine(-hw, 0, 1.5);
      for (const p of phases) {
        ctx.fillStyle = it.kind === 'arrester' ? '#8a96a3' : it.kind === 'station_service' ? THEME.tank : '#a5b4c3';
        circle(ctx, 0.05, p, it.kind === 'ccvt' ? 0.22 : 0.17);
        ctx.fill();
      }
      if (it.kind === 'arrester') {
        ctx.strokeStyle = THEME.copper;
        ctx.lineWidth = px(1.2);
        ctx.beginPath();
        ctx.moveTo(0.25, -hd * 0.8);
        ctx.lineTo(0.25, hd * 0.8);
        ctx.stroke();
      }
      break;
    }
    case 'wave_trap':
    case 'metering': {
      phaseLine(-hw, hw, 1.5);
      for (const p of phases) {
        ctx.fillStyle = it.kind === 'wave_trap' ? '#9fb0bf' : '#b6c3cf';
        circle(ctx, 0, p, 0.2);
        ctx.fill();
      }
      break;
    }
    case 'capacitor_bank': {
      phaseLine(-hw, -hw + 0.6, 1.5);
      ctx.fillStyle = '#b8c2cc';
      const rows = 3;
      const cols = 5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = -hw + 0.9 + (c * (w - 1.3)) / cols;
          const y = -hd + 0.4 + (r * (d - 0.8)) / rows;
          ctx.fillRect(x, y, (w - 1.3) / cols - 0.12, (d - 0.8) / rows - 0.15);
        }
      }
      break;
    }
    case 'line_terminal': {
      // H-frame dead end: two posts and a crossarm, conductors leaving toward -x.
      ctx.fillStyle = THEME.steelLight;
      ctx.fillRect(-0.25, -hd + 0.3, 0.5, 0.5);
      ctx.fillRect(-0.25, hd - 0.8, 0.5, 0.5);
      ctx.fillStyle = THEME.steel;
      ctx.fillRect(-0.12, -hd + 0.3, 0.24, d - 0.6);
      ctx.strokeStyle = color;
      ctx.lineWidth = px(2);
      ctx.beginPath();
      for (const p of phases) {
        ctx.moveTo(-hw - 6, p);
        ctx.lineTo(0, p);
        ctx.moveTo(0, p);
        ctx.lineTo(hw, 0);
      }
      ctx.stroke();
      break;
    }
    case 'feeder_exit': {
      ctx.strokeStyle = color;
      ctx.lineWidth = px(2);
      ctx.beginPath();
      for (const p of phases) {
        ctx.moveTo(-hw, 0);
        ctx.lineTo(0, p);
        if (!it.props.underground) {
          ctx.moveTo(0, p);
          ctx.lineTo(hw + 5, p);
        }
      }
      ctx.stroke();
      ctx.fillStyle = it.props.underground ? THEME.steelLight : '#7a5a3a';
      circle(ctx, 0, 0, 0.32);
      ctx.fill();
      ctx.fillStyle = THEME.steel;
      ctx.fillRect(-0.08, -hd + 0.2, 0.16, d - 0.4);
      break;
    }
    case 'mast': {
      ctx.fillStyle = THEME.steelLight;
      circle(ctx, 0, 0, 0.45);
      ctx.fill();
      ctx.strokeStyle = THEME.text;
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      ctx.moveTo(-0.3, -0.3);
      ctx.lineTo(0.3, 0.3);
      ctx.moveTo(0.3, -0.3);
      ctx.lineTo(-0.3, 0.3);
      ctx.stroke();
      break;
    }
    case 'control_house': {
      ctx.fillStyle = THEME.house;
      rr(ctx, -hw + 0.1, -hd + 0.1, w - 0.2, d - 0.2, 0.15);
      ctx.fill();
      ctx.strokeStyle = THEME.houseRoof;
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      ctx.moveTo(-hw + 0.1, 0);
      ctx.lineTo(hw - 0.1, 0);
      ctx.stroke();
      ctx.fillStyle = THEME.steelDark;
      ctx.fillRect(hw - 1.4, hd - 0.25, 0.9, 0.18);
      break;
    }
    case 'mobile_pad': {
      ctx.setLineDash([px(5), px(4)]);
      ctx.strokeStyle = color;
      ctx.lineWidth = px(1.5);
      rr(ctx, -hw, -hd, w, d, 0.3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(148,163,184,0.12)';
      ctx.fill();
      ctx.fillStyle = THEME.textDim;
      for (const x of [-hw + 2, -hw + 3.2, hw - 3.2, hw - 2]) {
        circle(ctx, x, hd - 0.5, 0.3);
        ctx.fill();
        circle(ctx, x, -hd + 0.5, 0.3);
        ctx.fill();
      }
      break;
    }
  }

  if (o.ghost) {
    rr(ctx, -hw, -hd, w, d, 0.25);
    ctx.fillStyle = o.ghost === 'ok' ? THEME.ghostOk : THEME.ghostBad;
    ctx.fill();
  }
}

function drawOpenMark(ctx: CanvasRenderingContext2D, px: (n: number) => number) {
  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  ctx.font = `bold ${px(10)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N.O.', 0, 0);
}
