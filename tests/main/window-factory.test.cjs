const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { createWindowFactory } = require('../../src/main/app/create-window.cjs');

test('creates the same protected production window from the modular factory', () => {
  let options;
  let loadedFile;
  class BrowserWindow {
    constructor(value) {
      options = value;
      this.webContents = { setWindowOpenHandler() {}, on() {} };
    }
    loadFile(value) { loadedFile = value; }
  }
  const appRoot = path.join('C:', 'contabilizador');
  const createWindow = createWindowFactory({ BrowserWindow, appRoot, isDevelopment: false });
  createWindow();

  assert.equal(options.webPreferences.sandbox, true);
  assert.equal(options.webPreferences.contextIsolation, true);
  assert.equal(loadedFile, path.join(appRoot, 'dist', 'index.html'));
});
