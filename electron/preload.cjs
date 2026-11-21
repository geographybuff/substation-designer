/**
 * Preload: exposes a minimal, explicit API to the game as window.substationDesktop.
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('substationDesktop', {
  platform: process.platform,
  version: process.versions.electron,
  quit: () => ipcRenderer.send('sd:quit'),
  toggleFullscreen: () => ipcRenderer.send('sd:toggle-fullscreen'),
  getHardwareAcceleration: () => ipcRenderer.sendSync('sd:get-hw-accel'),
  setHardwareAcceleration: (enabled) => ipcRenderer.send('sd:set-hw-accel', !!enabled),
  licenseAcceptedHash: () => ipcRenderer.sendSync('sd:license-get'),
  recordLicenseAcceptance: (hash) => ipcRenderer.send('sd:license-accept', String(hash)),
  saveFile: (name, contents) => ipcRenderer.invoke('sd:save-file', String(name), String(contents)),
  openFile: () => ipcRenderer.invoke('sd:open-file'),
});
