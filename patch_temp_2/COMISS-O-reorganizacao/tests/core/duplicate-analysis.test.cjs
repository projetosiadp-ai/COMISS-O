const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

const {
  analyzeDuplicateRecords,
  extractHtmlCommissionRecords
} = require('../../src/main/core/duplicate-analysis.cjs');
const { loadCurrentMain } = require('../helpers/electron-main-harness.cjs');

const base = {
  filePath: 'C:\\entrada\\lote-a.xls',
  table: 'Comissao_normal',
  cliente: 'CLIENTE TESTE',
  cpf: '111.222.333-44',
  contrato: '9001',
  parcela: '2',
  pagamento: '05/07/2026',
  comissao: 'R$ 12,34'
};

test('classifies exact business-key repetitions as confirmed duplicates', () => {
  const result = analyzeDuplicateRecords([
    { ...base, rowNumber: 2 },
    { ...base, filePath: 'C:\\entrada\\lote-b.xls', rowNumber: 8 }
  ]);

  assert.equal(result.totalRecords, 2);
  assert.equal(result.confirmed.length, 1);
  assert.equal(result.confirmed[0].records.length, 2);
  assert.equal(result.possible.length, 0);
});

test('classifies same CPF and contract with different values as possible duplicates', () => {
  const result = analyzeDuplicateRecords([
    { ...base, rowNumber: 2 },
    { ...base, rowNumber: 3, pagamento: '06/07/2026', comissao: '13,00' }
  ]);

  assert.equal(result.confirmed.length, 0);
  assert.equal(result.possible.length, 1);
  assert.deepEqual(result.possible[0].differences.sort(), ['comissao', 'pagamento']);
});

test('does not classify records without CPF and contract', () => {
  const result = analyzeDuplicateRecords([
    { ...base, rowNumber: 2, cpf: '' },
    { ...base, rowNumber: 3, cpf: '' }
  ]);

  assert.equal(result.confirmed.length, 0);
  assert.equal(result.possible.length, 0);
  assert.equal(result.unidentifiableRecords, 2);
});

test('extracts all HTML tables while keeping sensitive values local in memory', () => {
  const html = `
    Comissao_normal
    <table id="PF">
      <tr><td>Responsável</td><td>Contrato</td><td>CPF</td><td>Parcela</td><td>Pagamento</td><td>Comissão</td></tr>
      <tr><td>CLIENTE A</td><td>100</td><td>111.111.111-11</td><td>1</td><td>01/07/2026</td><td>10,00</td></tr>
    </table>
    PJ
    <table id="PJ">
      <tr><td>Empresa</td><td>Parcela</td><td>Pagamento</td><td>Comissão</td></tr>
      <tr><td>EMPRESA A</td><td>1</td><td>01/07/2026</td><td>20,00</td></tr>
    </table>`;

  const records = extractHtmlCommissionRecords(html, 'C:\\entrada\\lote.xls');

  assert.equal(records.length, 2);
  assert.equal(records[0].cliente, 'CLIENTE A');
  assert.equal(records[0].cpf, '111.111.111-11');
  assert.equal(records[1].cliente, 'EMPRESA A');
});

test('analyzes the whole selected batch through IPC before processing', async () => {
  const { handlers } = loadCurrentMain({ userDataPath: path.join(os.tmpdir(), 'commission-test') });
  const analyze = handlers.get('analyze-duplicates');
  assert.equal(typeof analyze, 'function');

  const fixture = path.resolve(__dirname, '../fixtures/sample-export.xls');
  const result = await analyze({}, { files: [fixture, fixture] });

  assert.equal(result.totalRecords, 6);
  assert.equal(result.confirmed.length, 2);
  assert.equal(result.possible.length, 0);
  assert.equal(result.requiresConfirmation, true);
});
