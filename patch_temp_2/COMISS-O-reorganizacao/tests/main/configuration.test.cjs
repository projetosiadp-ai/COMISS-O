const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createAppSettings } = require('../../src/main/config/app-settings.cjs');
const { createCorretorasRepository } = require('../../src/main/config/corretoras.cjs');

test('uses the portable directory as the default report destination', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'commission-settings-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repository = createAppSettings({
    app: { isPackaged: true, getPath: () => path.join(root, 'user-data') },
    env: { PORTABLE_EXECUTABLE_DIR: root },
    executablePath: path.join(root, 'app.exe')
  });

  assert.deepEqual(repository.get(), { defaultOutputFolder: path.join(root, 'Relatorios') });
  assert.equal(fs.existsSync(path.join(root, 'Relatorios')), true);
});

test('copies and loads the versioned default broker aliases', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'commission-brokers-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bundledConfigPath = path.resolve(__dirname, '../../config/corretoras.default.json');
  const repository = createCorretorasRepository({
    app: { isPackaged: false, getPath: () => root },
    env: {},
    bundledConfigPath
  });

  assert.equal(repository.getAll()['AS PRIME'][0], 'AS PRIME');
  assert.equal(fs.existsSync(path.join(root, 'DadosCompartilhados', 'corretoras.json')), true);
});
