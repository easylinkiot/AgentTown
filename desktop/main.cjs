/* global __dirname */
const path = require('path');
const { app, BrowserWindow, Menu, nativeTheme, shell } = require('electron');
const { createStaticServer } = require('./server.cjs');

let mainWindow = null;
let staticServer = null;

const isDev = !app.isPackaged || process.env.USCHAT_DESKTOP_DEV === '1';
const devUrl = process.env.DESKTOP_START_URL || 'http://127.0.0.1:19008';

function buildMenu() {
  const template = [
    {
      label: 'UsChat',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }],
    },
  ];

  if (isDev) {
    template[2].submenu.push({ type: 'separator' }, { role: 'toggleDevTools' });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function resolveAppUrl() {
  if (isDev) {
    return devUrl;
  }

  if (!staticServer) {
    staticServer = await createStaticServer(path.join(__dirname, '..', 'dist'));
  }
  return staticServer.url;
}

async function createWindow() {
  nativeTheme.themeSource = 'dark';
  buildMenu();

  const startUrl = await resolveAppUrl();
  mainWindow = new BrowserWindow({
    title: 'UsChat',
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#020817',
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const normalized = String(url || '');
    if (!normalized.startsWith(startUrl)) {
      event.preventDefault();
      shell.openExternal(normalized);
    }
  });

  await mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', async () => {
  if (staticServer) {
    try {
      await staticServer.close();
    } catch {
      // no-op
    }
    staticServer = null;
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

app.whenReady().then(createWindow).catch((error) => {
  console.error('[desktop] failed to start', error);
  app.quit();
});
