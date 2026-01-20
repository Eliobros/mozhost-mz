import { app, BrowserWindow, ipcMain, Notification } from 'electron';
import isDev from 'electron-is-dev';
import { join } from 'path';
import prepareNext from 'electron-next';
import Store from 'electron-store';

let mainWindow: BrowserWindow | null = null;

// Inicializa storage local
const store = new Store();

// Handler: Notificações
ipcMain.handle('show-notification', async (event, { title, body }) => {
  new Notification({ title, body }).show();
});

// Handler: Storage - Get
ipcMain.handle('store-get', async (event, key) => {
  return store.get(key);
});

// Handler: Storage - Set
ipcMain.handle('store-set', async (event, key, value) => {
  store.set(key, value);
});

// Handler: Storage - Delete
ipcMain.handle('store-delete', async (event, key) => {
  store.delete(key);
});

// Handler: Versão do app
ipcMain.handle('get-version', async () => {
  return app.getVersion();
});

const createWindow = async () => {
  // Prepara Next.js
  await prepareNext('./renderer');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    icon: join(__dirname, '../resources/icon.png'),
    title: 'MozHost',
  });

  const url = isDev
    ? 'http://localhost:8888' // Nextron usa porta 8888
    : `file://${join(__dirname, '../renderer/out/index.html')}`;

  mainWindow.loadURL(url);

  // DevTools em modo desenvolvimento
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
