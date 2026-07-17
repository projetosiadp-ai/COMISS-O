const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { loadCurrentMain } = require('../helpers/electron-main-harness.cjs');

const EXPECTED_IPC_CHANNELS = [
  'get-app-settings', 'save-app-settings',
  'list-saved-reports', 'delete-saved-report', 'list-trashed-reports', 'restore-saved-report',
  'cancel-processing', 'open-path',
  'select-files', 'select-ready-files', 'select-summary-files', 'select-output-folder', 'select-general-files',
  'analyze-duplicates', 'generate-summary-pdf', 'generate-reports', 'import-ready-reports',
  'parse-general-inputs', 'generate-general-report',
  'get-corretoras-config', 'save-corretoras-config'
];

test('keeps the stable IPC surface after moving the Electron entry point', () => {
  const modularEntry = path.resolve(__dirname, '../../src/main/index.cjs');
  assert.equal(fs.existsSync(modularEntry), true, 'src/main/index.cjs must be the maintained entry point');

  const { handlers } = loadCurrentMain({
    userDataPath: fs.mkdtempSync(path.join(os.tmpdir(), 'commission-ipc-contract-'))
  });
  assert.deepEqual([...handlers.keys()].sort(), [...EXPECTED_IPC_CHANNELS].sort());
});

module.exports = { EXPECTED_IPC_CHANNELS };
