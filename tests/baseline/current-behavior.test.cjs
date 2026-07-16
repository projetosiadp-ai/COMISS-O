const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadCurrentMain } = require('../helpers/electron-main-harness.cjs');

test('generate-reports preserves the current consolidated total and output structure', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commission-baseline-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const { handlers } = loadCurrentMain({ userDataPath: tempDir });
  const handler = handlers.get('generate-reports');
  assert.equal(typeof handler, 'function');

  const result = await handler({ sender: { send() {} } }, {
    files: [path.resolve(__dirname, '../fixtures/sample-export.xls')],
    outputFolder: tempDir,
    sortAlpha: true,
    convertNumbers: true,
    reportMonth: '2026-06'
  });

  assert.equal(result.summary.length, 1);
  assert.equal(result.summary[0].totalConsolidado, 1773.81);
  assert.equal(result.totalFiles, 1);
  assert.equal(fs.existsSync(result.resultFiles[0]), true);
  assert.match(path.basename(result.resultFiles[0]), /F&G CORRETORA DE SEGUROS LTDA\.xlsx$/);
});
