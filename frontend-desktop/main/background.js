import { app, BrowserWindow } from 'electron';
import isDev from 'electron-is-dev';
import { join } from 'path';
import prepareNext from 'electron-next';

let mainWindow: BrowserWindow | null = null;

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
