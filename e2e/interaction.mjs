/**
 * Interaction test: drives the real editor with mouse clicks — place a switch
 * from the toolbox, draw a bus between two terminals, and check the tutorial
 * advances.  node e2e/interaction.mjs [dist-dir]
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = resolve(process.argv[2] ?? 'dist');
const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const file = join(root, url === '/' ? 'index.html' : url);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const fail = (m) => {
  throw new Error(m);
};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => localStorage.setItem('substation-designer:license', JSON.stringify({ hash: 'pending', acceptedAt: '' })));
  await page.goto(`http://127.0.0.1:${server.address().port}/?e2e=1`);
  // Accept the license properly through the UI.
  await page.waitForSelector('[data-testid=license-gate]');
  await page.$eval('[data-testid=license-text]', (el) => {
    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event('scroll'));
  });
  await page.check('[data-testid=license-agree]');
  await page.click('[data-testid=license-accept]');
  await page.click('[data-testid=menu-campaign]');
  await page.click('[data-testid=level-l1-first-light]');
  await page.click('[data-testid=briefing-start]');
  await page.waitForSelector('[data-testid=plan-canvas]');
  await page.click('[data-testid=tutorial-next]');
  const canvas = await page.$('[data-testid=plan-canvas]');
  const box = await canvas.boundingBox();
  const at = async (x, y) => {
    const p = await page.evaluate(([x, y]) => window.__sdWorldToScreen(x, y), [x, y]);
    return { x: box.x + p.x, y: box.y + p.y };
  };
  const design = () => page.evaluate(() => window.__substationDesigner.store.get().design);

  // Place a 69 kV disconnect switch with its top-left at (5, 15.5): cursor at the footprint centre.
  await page.click('[data-testid="tool-switch-69"]');
  let p = await at(6.25, 18);
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
  let d = await design();
  const sw = d.items.find((i) => i.kind === 'switch');
  if (!sw || sw.x !== 5 || sw.y !== 15.5) fail(`switch not placed where expected: ${JSON.stringify(sw)}`);

  // Draw a 69 kV bus from the line terminal port (2.5, 18) to the switch port (5, 18).
  await page.click('[data-testid="tool-bus-69"]');
  p = await at(2.5, 18);
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
  p = await at(5, 18);
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
  d = await design();
  const bus = d.conductors.find((c) => c.kv === 69);
  if (!bus || bus.points.length !== 2) fail(`bus not drawn: ${JSON.stringify(d.conductors)}`);
  await page.waitForTimeout(900);
  const review = await page.evaluate(() => window.__substationDesigner.store.get().review);
  if (!review.topo.nodeOfPort[`${sw.id}:a`] && !(await page.evaluate((id) => window.__substationDesigner.store.get().review.topo.nodeOfPort.has(`${id}:a`), sw.id))) fail('switch terminal not connected');
  const step = await page.evaluate(() => window.__substationDesigner.store.get().tutorialStep);
  if (step < 2) fail(`tutorial did not advance (step ${step})`);

  // Rotate and undo work from the keyboard.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+z');
  d = await design();
  if (d.conductors.length !== 0) fail('undo did not remove the bus');
  if (errors.length) fail(errors.join('\n'));
  console.log('Interaction test passed');
} finally {
  await browser.close();
  server.close();
}
