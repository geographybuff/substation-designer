/**
 * End-to-end smoke test against a built copy of the game.
 *
 *   node e2e/smoke.mjs [path-to-index.html-or-dir] [screenshot-dir]
 *
 * Verifies that the license gate blocks play until the license is scrolled,
 * agreed and accepted, then walks through the menu into the first project,
 * loads a reference solution, energizes it and checks the results screen.
 * Uses the pre-installed Playwright Chromium.
 */
import { createServer } from 'node:http';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const target = resolve(process.argv[2] ?? 'dist');
const shots = resolve(process.argv[3] ?? 'e2e/screenshots');
await mkdir(shots, { recursive: true });

const isFile = (await stat(target)).isFile();
const root = isFile ? resolve(target, '..') : target;
const indexName = isFile ? target.slice(root.length + 1) : 'index.html';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const file = join(root, url === '/' ? indexName : url);
    if (!file.startsWith(root)) throw new Error('bad path');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const fail = (msg) => {
  throw new Error(msg);
};
const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${port}/?e2e=1`);

  // 1. License gate blocks everything until accepted.
  await page.waitForSelector('[data-testid=license-gate]');
  if (await page.$('[data-testid=main-menu]')) fail('Main menu visible before license acceptance');
  if (!(await page.isDisabled('[data-testid=license-accept]'))) fail('Accept enabled before agreeing');
  if (!(await page.isDisabled('[data-testid=license-agree]'))) fail('Agree checkbox enabled before scrolling to the end');
  await page.screenshot({ path: join(shots, '01-license.png') });
  await page.$eval('[data-testid=license-text]', (el) => {
    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event('scroll'));
  });
  await page.check('[data-testid=license-agree]');
  if (await page.isDisabled('[data-testid=license-accept]')) fail('Accept still disabled after agreeing');
  await page.click('[data-testid=license-accept]');
  await page.waitForSelector('[data-testid=main-menu]');
  await page.screenshot({ path: join(shots, '02-menu.png') });

  // Acceptance persists across reloads.
  await page.reload();
  await page.waitForSelector('[data-testid=main-menu]');

  // 2. Campaign -> first project.
  await page.click('[data-testid=menu-campaign]');
  await page.waitForSelector('[data-testid=level-select]');
  await page.screenshot({ path: join(shots, '03-levels.png') });
  await page.click('[data-testid=level-l1-first-light]');
  await page.waitForSelector('[data-testid=briefing]');
  await page.screenshot({ path: join(shots, '04-briefing.png') });
  await page.click('[data-testid=briefing-start]');
  await page.waitForSelector('[data-testid=plan-canvas]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(shots, '05-editor-empty.png') });

  // 3. Load the reference solution through the debug hook and energize.
  const ok = await page.evaluate(() => window.__substationDesigner?.loadSolution('l1-first-light') ?? false);
  if (!ok) fail('Could not load reference solution');
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(shots, '06-editor-solution.png') });
  await page.click('[data-testid=tab-review]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(shots, '07-review.png') });
  await page.click('[data-testid=energize]');
  await page.waitForSelector('[data-testid=results]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(shots, '08-results.png'), fullPage: true });
  const passed = await page.textContent('[data-testid=results]');
  if (!passed.includes('Commissioned')) fail('Reference solution was not commissioned');

  // 4. Field guide and settings render.
  await page.evaluate(() => window.__substationDesigner?.go('guide'));
  await page.waitForSelector('[data-testid=field-guide]');
  await page.screenshot({ path: join(shots, '09-guide.png') });
  await page.evaluate(() => window.__substationDesigner?.go('settings'));
  await page.waitForSelector('[data-testid=settings]');
  await page.click('[data-testid=preset-low]');
  await page.screenshot({ path: join(shots, '10-settings.png') });

  if (errors.length) fail(`Console errors:\n${errors.join('\n')}`);
  console.log(`E2E smoke test passed. Screenshots in ${shots}`);
} finally {
  await browser.close();
  server.close();
}
