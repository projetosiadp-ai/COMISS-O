const Module = require('node:module');
const path = require('node:path');

function loadCurrentMain({ userDataPath }) {
  const handlers = new Map();
  const originalLoad = Module._load;
  const electronMock = {
    app: {
      whenReady: () => ({ then() {} }),
      on() {},
      quit() {},
      getPath(name) {
        if (name !== 'userData') throw new Error(`Unexpected app path in test: ${name}`);
        return userDataPath;
      }
    },
    BrowserWindow: class BrowserWindow { static getAllWindows() { return []; } },
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
    shell: { openPath: async () => '' }
  };

  Module._load = function loadWithElectronMock(request, parent, isMain) {
    if (request === 'electron') return electronMock;
    return originalLoad.call(this, request, parent, isMain);
  };

  const mainPath = path.resolve(__dirname, '../../main.js');
  delete require.cache[mainPath];
  try {
    require(mainPath);
  } finally {
    Module._load = originalLoad;
  }
  return { handlers };
}

module.exports = { loadCurrentMain };
