const path = require('path');
const {
  decodeHtml,
  getText,
  normalizeBaseText,
  parseBrazilNumber
} = require('./text.cjs');

const COMPARISON_FIELDS = ['parcela', 'pagamento', 'comissao'];

function cleanText(value) {
  return decodeHtml(getText(value)).replace(/\s+/g, ' ').trim();
}

function normalizeIdentifier(value) {
  return normalizeBaseText(cleanText(value)).replace(/[^A-Z0-9]/g, '');
}

function normalizeCpf(value) {
  return cleanText(value).replace(/\D/g, '');
}

function normalizeDate(value) {
  const text = cleanText(value);
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  return normalizeIdentifier(text);
}

function normalizeCommission(value) {
  const parsed = parseBrazilNumber(cleanText(value));
  return parsed === null ? normalizeIdentifier(value) : parsed.toFixed(2);
}

function normalizedRecord(record) {
  return {
    cpf: normalizeCpf(record.cpf),
    contrato: normalizeIdentifier(record.contrato),
    parcela: normalizeIdentifier(record.parcela),
    pagamento: normalizeDate(record.pagamento),
    comissao: normalizeCommission(record.comissao)
  };
}

function uniqueValues(records, field) {
  return new Set(records.map(record => normalizedRecord(record)[field])).size;
}

function createGroup(kind, records, differences = []) {
  return {
    kind,
    cpf: cleanText(records[0].cpf),
    contrato: cleanText(records[0].contrato),
    cliente: cleanText(records[0].cliente),
    differences,
    records
  };
}

function analyzeDuplicateRecords(records) {
  const usable = [];
  let unidentifiableRecords = 0;

  for (const record of records || []) {
    const normalized = normalizedRecord(record);
    if (!normalized.cpf || !normalized.contrato) {
      unidentifiableRecords += 1;
      continue;
    }
    usable.push({ record, normalized });
  }

  const byCustomerContract = new Map();
  for (const item of usable) {
    const key = `${item.normalized.cpf}|${item.normalized.contrato}`;
    if (!byCustomerContract.has(key)) byCustomerContract.set(key, []);
    byCustomerContract.get(key).push(item);
  }

  const confirmed = [];
  const possible = [];

  for (const items of byCustomerContract.values()) {
    if (items.length < 2) continue;

    const byExactKey = new Map();
    for (const item of items) {
      const n = item.normalized;
      const exactKey = `${n.cpf}|${n.contrato}|${n.parcela}|${n.pagamento}|${n.comissao}`;
      if (!byExactKey.has(exactKey)) byExactKey.set(exactKey, []);
      byExactKey.get(exactKey).push(item.record);
    }

    for (const exactRecords of byExactKey.values()) {
      if (exactRecords.length > 1) confirmed.push(createGroup('confirmed', exactRecords));
    }

    if (byExactKey.size > 1) {
      const groupRecords = items.map(item => item.record);
      const differences = COMPARISON_FIELDS.filter(field => uniqueValues(groupRecords, field) > 1);
      possible.push(createGroup('possible', groupRecords, differences));
    }
  }

  return {
    totalRecords: (records || []).length,
    checkedRecords: usable.length,
    unidentifiableRecords,
    confirmed,
    possible,
    requiresConfirmation: confirmed.length > 0 || possible.length > 0
  };
}

function findHeaderIndex(headers, aliases) {
  return headers.findIndex(header => aliases.some(alias => header.includes(alias)));
}

function tableRows(tableHtml) {
  const rows = [];
  const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(tableHtml)) !== null) {
    const row = [];
    const cellRegex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
      row.push(cleanText(cellMatch[1]));
    }
    if (row.length) rows.push(row);
  }
  return rows;
}

function inferTableName(html, tableStart, tableIndex) {
  const prefix = html.slice(Math.max(0, tableStart - 250), tableStart)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const match = prefix.match(/(Comissao[_\s-]*normal|PJ)\s*$/i);
  return match ? cleanText(match[1]) : `Tabela ${tableIndex + 1}`;
}

function recordsFromRows(rows, metadata = {}) {
  if (!rows.length) return [];
  const headers = rows[0].map(value => normalizeBaseText(value));
  const indexes = {
    cliente: findHeaderIndex(headers, ['RESPONS', 'CLIENTE', 'USU', 'EMPRESA']),
    cpf: findHeaderIndex(headers, ['CPF']),
    contrato: findHeaderIndex(headers, ['CONTRATO']),
    parcela: findHeaderIndex(headers, ['PARCELA']),
    pagamento: findHeaderIndex(headers, ['PAGAMENTO']),
    comissao: findHeaderIndex(headers, ['COMISS'])
  };

  const hasUsefulHeader = Object.values(indexes).some(index => index >= 0);
  if (!hasUsefulHeader) return [];

  return rows.slice(1)
    .filter(row => row.some(value => cleanText(value)))
    .map((row, index) => ({
      filePath: metadata.filePath || '',
      fileName: path.basename(metadata.filePath || ''),
      table: metadata.table || '',
      rowNumber: index + 2,
      cliente: indexes.cliente >= 0 ? cleanText(row[indexes.cliente]) : '',
      cpf: indexes.cpf >= 0 ? cleanText(row[indexes.cpf]) : '',
      contrato: indexes.contrato >= 0 ? cleanText(row[indexes.contrato]) : '',
      parcela: indexes.parcela >= 0 ? cleanText(row[indexes.parcela]) : '',
      pagamento: indexes.pagamento >= 0 ? cleanText(row[indexes.pagamento]) : '',
      comissao: indexes.comissao >= 0 ? cleanText(row[indexes.comissao]) : ''
    }));
}

function extractHtmlCommissionRecords(html, filePath = '') {
  const records = [];
  const tableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  let match;
  let tableIndex = 0;
  while ((match = tableRegex.exec(String(html || ''))) !== null) {
    records.push(...recordsFromRows(tableRows(match[0]), {
      filePath,
      table: inferTableName(html, match.index, tableIndex)
    }));
    tableIndex += 1;
  }
  return records;
}

module.exports = {
  analyzeDuplicateRecords,
  extractHtmlCommissionRecords,
  recordsFromRows
};
