const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('uschatDesktop', {
  shell: 'electron',
  platform: process.platform,
  version: process.versions.electron,
});
