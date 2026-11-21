/**
 * Small procedural textures drawn on a canvas at runtime (no image assets).
 * Only used when RenderConfig.textures is on.
 */
import { CanvasTexture, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
}

function finish(c: HTMLCanvasElement, repeat: boolean, srgb = true): Texture {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  if (repeat) {
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
  }
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  return t;
}

/** Speckles drawn with wrap-around so the tile repeats seamlessly. */
function speckle(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  r: () => number,
  colors: string[],
  minR: number,
  maxR: number,
): void {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)]!;
    const x = r() * size;
    const y = r() * size;
    const rad = minR + r() * (maxR - minR);
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const px = x + ox;
        const py = y + oy;
        if (px < -rad || py < -rad || px > size + rad || py > size + rad) continue;
        ctx.beginPath();
        ctx.ellipse(px, py, rad, rad * (0.6 + r() * 0.4), r() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** Crushed rock surfacing; one tile covers ~2 m. */
export function gravelTexture(): Texture {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#a9a398';
  ctx.fillRect(0, 0, S, S);
  const r = rng(11);
  speckle(ctx, S, 2600, r, ['#8f897e', '#bdb7ac', '#9c958a', '#c9c3b8', '#7d776d', '#b3aa9a'], 0.8, 2.6);
  return finish(c, true);
}

/** Pasture grass; one tile covers ~6 m. */
export function grassTexture(): Texture {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, S, S);
  const r = rng(23);
  speckle(ctx, S, 1800, r, ['#e2e8d6', '#f4f7ee', '#d5dcc6', '#eef2e4', '#c9d1b8'], 1.5, 5);
  return finish(c, true);
}

/** Crop rows: white with darker stripes, multiplied by a per-field vertex colour. */
export function stripeTexture(): Texture {
  const W = 8;
  const H = 64;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 8) {
    ctx.fillStyle = 'rgba(70,60,40,0.22)';
    ctx.fillRect(0, y, W, 3);
  }
  return finish(c, true);
}

/** Chain-link diamonds on a transparent background; one tile covers ~0.15 m. */
export function chainLinkTexture(): Texture {
  const S = 64;
  const [c, ctx] = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(150,158,162,1)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (const o of [-S, 0, S]) {
    ctx.moveTo(o, 0);
    ctx.lineTo(o + S, S);
    ctx.moveTo(o + S, 0);
    ctx.lineTo(o, S);
  }
  ctx.stroke();
  return finish(c, true);
}

/** Vertical sky gradient used as the scene background (drawn screen-aligned). */
export function skyTexture(top: string, horizon: string): Texture {
  const [c, ctx] = canvas(4, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(0.62, horizon);
  g.addColorStop(1, horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  return finish(c, false);
}
