const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeBaseText,
  parseBrazilNumber,
  parseBrazilCurrency,
  parseVendedorCorretora
} = require('../../src/main/core/text.cjs');

test('normalizes accents and punctuation for matching', () => {
  assert.equal(normalizeBaseText('  Comissão & Saúde  '), 'COMISSAO E SAUDE');
});

test('parses Brazilian numbers without changing percent semantics', () => {
  assert.equal(parseBrazilNumber('1.773,81'), 1773.81);
  assert.equal(parseBrazilNumber('40%'), 0.4);
  assert.equal(parseBrazilNumber('texto'), null);
});

test('extracts the last Brazilian currency-like value from a label', () => {
  assert.equal(parseBrazilCurrency('Total de Comissões a pagar: 1.773,81'), 1773.81);
});

test('recognizes seller and broker from the existing title convention', () => {
  assert.deepEqual(parseVendedorCorretora('VENDEDOR - CORRETORA'), {
    vendedor: 'VENDEDOR',
    corretora: 'CORRETORA',
    titulo: 'VENDEDOR - CORRETORA',
    isPrincipalCorretora: false
  });
});
