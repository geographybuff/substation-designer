/**
 * Desktop-shell smoke test: launches the Electron app (after `vite build`),
 * checks the license gate, accepts it, verifies acceptance was recorded in the
 * user-data folder, relaunches and checks the main menu appears directly.
 *
 *   xvfb-run -a node e2e/electron-smoke.mjs [screenshot-dir]
 */
import { createRequire } from 'node:module';
import { mkdtemp, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { _electron: electron } = require('playwright');
const shots = resolve(process.argv[2] ?? 'e2e/screenshots');
await mkdir(shots, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), 'sd-electron-'));
const launch = () => electron.launch({ args: ['.', `--user-data-dir=${userData}`, '--no-sandbox'], env: { ...process.env, ELECTRON_ENABLE_LOGGING: '0' } });

const fail = (m) => {
  throw new Error(m);
};
let app = await launch();
try {
  let win = await app.firstWindow();
  await win.waitForSelector('[data-testid=license-gate]', { timeout: 30000 });
  const hasBridge = await win.evaluate(() => typeof window.substationDesktop?.quit === 'function');
  if (!hasBridge) fail('desktop bridge not exposed');
  await win.screenshot({ path: join(shots, 'electron-01-license.png') });
  await win.$eval('[data-testid=license-text]', (el) => {
    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event('scroll'));
  });
  await win.check('[data-testid=license-agree]');
  await win.click('[data-testid=license-accept]');
  await win.waitForSelector('[data-testid=main-menu]');
  await win.waitForTimeout(300);
  const rec = JSON.parse(await readFile(join(userData, 'license-acceptance.json'), 'utf8'));
  if (!/^[0-9a-f]{8}$/.test(rec.hash)) fail('license acceptance not recorded in user data');
  await win.screenshot({ path: join(shots, 'electron-02-menu.png') });
  await app.close();

  // Relaunch: acceptance persists, menu shows directly.
  app = await launch();
  win = await app.firstWindow();
  await win.waitForSelector('[data-testid=main-menu]', { timeout: 30000 });
  // Hardware acceleration toggle round-trips through the main process.
  const hw = await win.evaluate(() => window.substationDesktop.getHardwareAcceleration());
  if (hw !== true) fail('hardware acceleration should default to on');
  await win.evaluate(() => window.substationDesktop.setHardwareAcceleration(false));
  await win.waitForTimeout(200);
  const settings = JSON.parse(await readFile(join(userData, 'desktop-settings.json'), 'utf8'));
  if (settings.hardwareAcceleration !== false) fail('hardware acceleration setting not saved');
  console.log('Electron smoke test passed');
} finally {
  await app.close().catch(() => {});
}
