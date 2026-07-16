const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { readInput, readDuplicateRecords } = require('../../src/main/reports/input-reader.cjs');

const fixture = path.resolve(__dirname, '../fixtures/sample-export.xls');

test('reads the disguised HTML export through the focused input reader', async () => {
  const input = await readInput(fixture);
  assert.equal(input.type, 'html-xls');
  assert.equal(input.info.corretora, 'F&G CORRETORA DE SEGUROS LTDA');
  assert.equal(input.rows[8][3], 'Contrato');
});

test('reads every table for local duplicate analysis', async () => {
  const records = await readDuplicateRecords(fixture);
  assert.equal(records.length, 3);
  assert.equal(records[0].contrato, '5001');
});
