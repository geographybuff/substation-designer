/**
 * Substation Designer — Electron main process (Windows desktop build).
 *
 * - Loads the bundled game from dist/index.html.
 * - Hardware acceleration can be turned off from the game's Settings for old or
 *   unreliable GPUs (stored in desktop-settings.json, applied on next launch).
 * - Records license acceptance in the user-data folder as well as in the game's
 *   own storage, so acceptance survives cleared browser storage.
 */
'use strict';

const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const SETTINGS_FILE = () => path.join(app.getPath('userData'), 'desktop-settings.json');
const LICENSE_FILE = () => path.join(app.getPath('userData'), 'license-acceptance.json');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  } catch (err) {
    console.error('Could not write', file, err);
  }
}

// Must run before the app is ready.
const desktopSettings = readJson(SETTINGS_FILE(), { hardwareAcceleration: true });
if (desktopSettings.hardwareAcceleration === false || process.argv.includes('--disable-gpu')) {
  app.disableHardwareAcceleration();
  // Keep WebGL available through Chromium's software renderer so the 3D view still works (slowly).
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#0f1720',
    show: false,
    title: 'Substation Designer',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win.once('ready-to-show', () => win && win.show());
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // Never navigate away from the game; open web links in the user's browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });
  win.on('closed', () => {
    win = null;
  });
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'View',
        submenu: [{ role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'quit' }],
      },
    ]),
  );
  createWindow();
});

app.on('window-all-closed', () => app.quit());

// --- IPC bridge (see preload.cjs) ------------------------------------------------

ipcMain.on('sd:quit', () => app.quit());
ipcMain.on('sd:toggle-fullscreen', () => win && win.setFullScreen(!win.isFullScreen()));
ipcMain.on('sd:get-hw-accel', (event) => {
  event.returnValue = desktopSettings.hardwareAcceleration !== false;
});
ipcMain.on('sd:set-hw-accel', (_event, enabled) => {
  desktopSettings.hardwareAcceleration = !!enabled;
  writeJson(SETTINGS_FILE(), desktopSettings);
});
ipcMain.on('sd:license-get', (event) => {
  const rec = readJson(LICENSE_FILE(), null);
  event.returnValue = rec && typeof rec.hash === 'string' ? rec.hash : null;
});
ipcMain.on('sd:license-accept', (_event, hash) => {
  if (typeof hash !== 'string' || !/^[0-9a-f]{8}$/.test(hash)) return;
  writeJson(LICENSE_FILE(), { hash, acceptedAt: new Date().toISOString(), version: app.getVersion() });
});
ipcMain.handle('sd:save-file', async (_event, name, contents) => {
  if (!win || typeof contents !== 'string') return false;
  const res = await dialog.showSaveDialog(win, { defaultPath: String(name || 'design.json'), filters: [{ name: 'Substation design', extensions: ['json'] }] });
  if (res.canceled || !res.filePath) return false;
  fs.writeFileSync(res.filePath, contents, 'utf8');
  return true;
});
ipcMain.handle('sd:open-file', async () => {
  if (!win) return null;
  const res = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Substation design', extensions: ['json'] }] });
  if (res.canceled || !res.filePaths[0]) return null;
  return fs.readFileSync(res.filePaths[0], 'utf8');
});
