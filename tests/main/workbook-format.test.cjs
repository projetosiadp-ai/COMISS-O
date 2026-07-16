const test = require('node:test');
const assert = require('node:assert/strict');

const {
  convertCellToNumberIfNeeded,
  consolidateCommissionTotalsInWorksheet
} = require('../../src/main/reports/workbook-format.cjs');

test('keeps Brazilian numeric conversion in the workbook module', () => {
  const cell = { value: '1.234,56' };
  convertCellToNumberIfNeeded(cell, 'Comissão');
  assert.equal(cell.value, 1234.56);
  assert.equal(cell.numFmt, '#,##0.00');
});

test('consolidates repeated total labels without changing the sum rule', () => {
  const cells = new Map([
    ['1:1', { value: 'Total de Comissões a pagar: 10,00' }],
    ['2:1', { value: 'Total de Comissões a pagar: 20,00' }]
  ]);
  const worksheet = {
    eachRow(_options, callback) {
      const row = { actualCellCount: 1, eachCell(_cellOptions, cellCallback) { cellCallback({}, 1); } };
      callback(row, 1);
      callback(row, 2);
    },
    getCell(row, col) {
      const key = `${row}:${col}`;
      if (!cells.has(key)) cells.set(key, { value: null });
      return cells.get(key);
    }
  };
  const result = consolidateCommissionTotalsInWorksheet(worksheet);
  assert.equal(result.total, 30);
  assert.equal(cells.get('2:1').value, null);
});
