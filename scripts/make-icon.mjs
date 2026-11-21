/**
 * Renders the application icon (build/icon.png, 512x512) from an inline SVG
 * using the pre-installed Playwright Chromium. electron-builder converts it
 * to .ico for Windows.  Usage: node scripts/make-icon.mjs
 */
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f4d3c"/><stop offset="1" stop-color="#123126"/></linearGradient></defs>
  <rect width="64" height="64" rx="13" fill="url(#g)"/>
  <g stroke="#9fb1c2" stroke-width="1.6" fill="none" opacity=".55"><path d="M8 50h48M12 50V36h12v14M40 50V30h12v20"/></g>
  <path d="M36 5 17 36h12.5l-4.5 23 21-33H33.5z" fill="#f2c14e" stroke="#7a5a12" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;
await mkdir('build', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await page.locator('svg').screenshot({ path: 'build/icon.png', omitBackground: true });
await browser.close();
console.log('wrote build/icon.png');
