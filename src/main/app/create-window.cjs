const path = require('path');

function createWindowFactory({ BrowserWindow, appRoot, isDevelopment = false } = {}) {
  if (!BrowserWindow || !appRoot) throw new Error('Dependências obrigatórias da janela Electron ausentes.');

  return function createWindow() {
    const win = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 1050,
      minHeight: 700,
      backgroundColor: '#ffffff',
      webPreferences: {
        preload: path.join(appRoot, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false
      }
    });

    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => {
      const allowedDevelopmentPage = isDevelopment && url.startsWith('http://localhost:5173');
      if (!allowedDevelopmentPage) event.preventDefault();
    });

    if (isDevelopment) {
      win.loadURL('http://localhost:5173');
      win.webContents.openDevTools();
    } else {
      win.loadFile(path.join(appRoot, 'dist', 'index.html'));
    }
    return win;
  };
}

module.exports = { createWindowFactory };
