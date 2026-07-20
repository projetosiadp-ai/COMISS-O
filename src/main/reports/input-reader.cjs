const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { decodeHtml, parseVendedorCorretora, parseBrazilCurrency, formatNumberBR } = require('../core/text.cjs');
const { extractHtmlCommissionRecords, recordsFromRows } = require('../core/duplicate-analysis.cjs');

function getLastUsedRow(sheet) {
  let last = 1;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (row.actualCellCount > 0) last = rowNumber;
  });
  return last;
}

function getLastUsedCol(sheet) {
  let last = 1;
  sheet.eachRow({ includeEmpty: false }, row => {
    row.eachCell({ includeEmpty: false }, (_, colNumber) => {
      if (colNumber > last) last = colNumber;
    });
  });
  return last;
}

function getRowsFromXlsxSheet(sheet) {
  const rows = [];
  const lastRow = getLastUsedRow(sheet);
  const lastCol = getLastUsedCol(sheet);
  for (let rowNumber = 1; rowNumber <= lastRow; rowNumber++) {
    const row = [];
    for (let colNumber = 1; colNumber <= lastCol; colNumber++) {
      row.push(sheet.getCell(rowNumber, colNumber).value);
    }
    rows.push(row);
  }
  return rows;
}

async function readXlsxInput(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const info = parseVendedorCorretora(sheet.getCell('A1').value, filePath);
  return { filePath, type: 'xlsx', workbook, sheet, info };
}

function extractHtmlTitle(clean) {
  const withoutStyle = clean.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const beforePeriodHtml = withoutStyle.split(/<\s*b[^>]*>\s*Per[ií]odo\s*:/i)[0] || withoutStyle;
  const boldMatches = [...beforePeriodHtml.matchAll(/<b[^>]*>\s*([\s\S]*?)\s*<\/b>/gi)]
    .map(match => decodeHtml(match[1]))
    .filter(value => value && !/^Per[ií]odo|^Lote|^Total|^Comissao/i.test(value));
  if (boldMatches.length) return boldMatches[0];

  const plain = decodeHtml(withoutStyle.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, ' '));
  const beforePeriod = plain.split(/Per[ií]odo/i)[0] || plain;
  return beforePeriod.split(/\n|\s{3,}/).map(value => value.trim())
    .find(value => value && !/^style/i.test(value)) || '';
}

function htmlToRows(html, filePath = '', shouldDeduplicate = false) {
  const clean = html.replace(/\r?\n/g, ' ');

  const titulo = extractHtmlTitle(clean) || path.basename(filePath, path.extname(filePath));

  const periodoMatch = clean.match(/Per[^:<]*odo:\s*<\/b>\s*([^<]*)/i);
  const periodo = decodeHtml(periodoMatch ? periodoMatch[1] : '');

  const loteMatch = clean.match(/Lote:\s*<\/b>\s*([^<]*)\s*-\s*<b[^>]*>\s*([^<]*)/i);
  const lote = loteMatch ? `${decodeHtml(loteMatch[1])} - ${decodeHtml(loteMatch[2])}` : '';

  const totalMatch = clean.match(/Total de Comiss[^:]*a pagar:\s*<b[^>]*>\s*([^<]*)/i);
  const totalOriginal = decodeHtml(totalMatch ? totalMatch[1] : '');

  const rows = [];
  rows[0] = [titulo];
  rows[1] = [`Período: ${periodo}`];
  rows[2] = [`Lote: ${lote}`];
  rows[3] = [];
  rows[5] = [];
  rows[6] = [];
  rows[7] = ['Comissao_normal'];

  // Extrai todas as linhas <tr> de um bloco de HTML de tabela
  function parseTableRows(tableHtml) {
    const result = [];
    const trRx = /<tr[\s\S]*?<\/tr>/gi;
    const tdRx = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let trM;
    while ((trM = trRx.exec(tableHtml)) !== null) {
      const cells = [];
      let tdM;
      while ((tdM = tdRx.exec(trM[0])) !== null) {
        cells.push(decodeHtml(tdM[1]));
      }
      if (cells.length > 0) result.push(cells);
    }
    return result;
  }

  // --- 1. Lê tabela PJ (GRD_ResultadoPJ) para coletar empresas PJ e calcular total PJ ---
  const pjCompanies = new Set();
  let pjTotal = 0;
  let pjAllRows = [];
  const pjTableMatch = clean.match(/id="GRD_ResultadoPJ"[^>]*>([\s\S]*?)<\/table>/i);
  if (pjTableMatch) {
    pjAllRows = parseTableRows(pjTableMatch[1]);
    // Colunas PJ: [0]Código [1]Empresa [2]Parcela [3]Vencimento [4]Pagamento
    //             [5]Recebido [6]Regra [7]Comissão [8]Vidas [9]Mensalidade
    for (let i = 1; i < pjAllRows.length; i++) {
      const row = pjAllRows[i];
      if (row.some(c => String(c || '').toUpperCase().includes('TOTAL'))) continue;
      const empresa = String(row[1] || '').trim();
      if (!empresa) continue;
      const comissao = parseBrazilCurrency(String(row[7] || ''));
      const recebido = parseBrazilCurrency(String(row[5] || ''));
      if (recebido !== null || comissao !== null) {
        pjCompanies.add(empresa);
        if (comissao !== null) pjTotal += comissao;
      }
    }
  }

  // --- 2. Lê tabela PF (GRD_ResultadoPF), removendo empresas que já constam no PJ ---
  const pfTableMatch = clean.match(/id="GRD_ResultadoPF"[^>]*>([\s\S]*?)<\/table>/i);

  if (!pfTableMatch) {
    // Fallback: sem ID específico, comportamento antigo (primeira tabela)
    const tableMatch = clean.match(/<table[\s\S]*?<\/table>/i);
    if (!tableMatch) {
      rows[4] = [`Total de Comissões a pagar: ${totalOriginal}`];
      return rows;
    }
    const allRows = parseTableRows(tableMatch[0]);
    allRows.forEach(r => rows.push(r));
    rows[4] = [`Total de Comissões a pagar: ${totalOriginal}`];
    return rows;
  }

  const pfAllRows = parseTableRows(pfTableMatch[1]);
  let pfTotal = 0;
  const pfDataRows = [];

  // pfAllRows[0] = cabeçalho da tabela PF
  if (pfAllRows[0]) rows.push(pfAllRows[0]);

  // Colunas PF: [0]Código [1]Responsável [2]Usuário [3]Contrato [4]CPF
  //             [5]Empresa [6]Plano [7]Parcela [8]Vencimento [9]Pagamento
  //             [10]Regra [11]Recebido [12]Comissão [13]Mensalidade [14]Data de Adesão
  for (let i = 1; i < pfAllRows.length; i++) {
    const row = pfAllRows[i];
    if (row.some(c => String(c || '').toUpperCase().includes('TOTAL'))) continue;
    const code = String(row[0] || '').trim();
    if (!code) continue;
    // Remove linhas de empresas que já constam no bloco PJ (apenas se a dedupilação for solicitada)
    const empresa = String(row[5] || '').trim();
    if (shouldDeduplicate && pjCompanies.size > 0 && empresa && pjCompanies.has(empresa)) continue;
    const comissao = parseBrazilCurrency(String(row[12] || ''));
    if (comissao !== null) pfTotal += comissao;
    pfDataRows.push(row);
  }

  pfDataRows.forEach(r => rows.push(r));

  // --- 3. Adiciona bloco PJ ao final, mapeando para o formato de colunas PF ---
  if (pjAllRows.length > 0 && pjCompanies.size > 0) {
    rows.push([]); // separador
    rows.push(['PJ']); // rótulo de seção (não é cabeçalho de tabela)
    for (let i = 1; i < pjAllRows.length; i++) {
      const row = pjAllRows[i];
      if (row.some(c => String(c || '').toUpperCase().includes('TOTAL'))) continue;
      const empresa = String(row[1] || '').trim();
      if (!empresa) continue;
      const recebido = parseBrazilCurrency(String(row[5] || ''));
      const comissao = parseBrazilCurrency(String(row[7] || ''));
      if (recebido === null && comissao === null) continue;
      // Mapeia colunas PJ para as posições equivalentes da tabela PF
      rows.push([
        row[0],  // [0]  Código
        row[1],  // [1]  Responsável ← usa Empresa PJ
        '',      // [2]  Usuário
        '',      // [3]  Contrato
        '',      // [4]  CPF
        row[1],  // [5]  Empresa
        '',      // [6]  Plano
        row[2],  // [7]  Parcela
        row[3],  // [8]  Vencimento
        row[4],  // [9]  Pagamento
        row[6],  // [10] Regra
        row[5],  // [11] Recebido
        row[7],  // [12] Comissão
        row[9],  // [13] Mensalidade
        ''       // [14] Data de Adesão
      ]);
    }
  }

  // --- 4. Total recalculado = PF restante + PJ ---
  const grandTotal = Math.round((pfTotal + pjTotal + Number.EPSILON) * 100) / 100;
  rows[4] = [`Total de Comissões a pagar: ${formatNumberBR(grandTotal)}`];
  return rows;
}

function readHtmlInput(filePath, shouldDeduplicate = false) {
  const html = fs.readFileSync(filePath).toString('latin1');
  const rows = htmlToRows(html, filePath, shouldDeduplicate);
  return {
    filePath,
    type: 'html-xls',
    rows,
    info: parseVendedorCorretora(rows[0]?.[0], filePath)
  };
}

async function readInput(filePath, shouldDeduplicate = false) {
  const extension = path.extname(filePath).toLowerCase();
  const firstBytes = fs.readFileSync(filePath).slice(0, 20).toString('latin1').toLowerCase();
  return extension === '.xlsx' || firstBytes.startsWith('pk')
    ? readXlsxInput(filePath)
    : readHtmlInput(filePath, shouldDeduplicate);
}

async function analyzeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const firstBytes = fs.readFileSync(filePath).slice(0, 20).toString('latin1').toLowerCase();

  let brokerName = 'Corretora não identificada';
  try {
    const item = await readInput(filePath, false);
    if (item && item.info) {
      brokerName = item.info.corretora || brokerName;
    }
  } catch (err) {
    console.error('Erro ao ler corretora no analyzeFile:', err);
  }

  if (ext === '.xlsx' || firstBytes.startsWith('pk')) {
    return { filePath, fileName: path.basename(filePath), brokerName, hasDuplicates: false, duplicateCompanies: [] };
  }

  const html = fs.readFileSync(filePath, 'latin1');
  const clean = html.replace(/\r?\n/g, ' ');

  // Parse PJ table
  const pjCompanies = new Set();
  const pjTableMatch = clean.match(/id="GRD_ResultadoPJ"[^>]*>([\s\S]*?)<\/table>/i);
  if (pjTableMatch) {
    const trRx = /<tr[\s\S]*?<\/tr>/gi;
    const tdRx = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let trM;
    while ((trM = trRx.exec(pjTableMatch[1])) !== null) {
      const cells = [];
      let tdM;
      while ((tdM = tdRx.exec(trM[0])) !== null) {
        cells.push(decodeHtml(tdM[1]));
      }
      if (cells.length > 0 && !cells.some(c => String(c || '').toUpperCase().includes('TOTAL'))) {
        const empresa = String(cells[1] || '').trim();
        if (empresa) pjCompanies.add(empresa);
      }
    }
  }

  // Parse PF table and look for duplicates
  const duplicateCompanies = new Set();
  const pfTableMatch = clean.match(/id="GRD_ResultadoPF"[^>]*>([\s\S]*?)<\/table>/i);
  if (pfTableMatch && pjCompanies.size > 0) {
    const trRx = /<tr[\s\S]*?<\/tr>/gi;
    const tdRx = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let trM;
    while ((trM = trRx.exec(pfTableMatch[1])) !== null) {
      const cells = [];
      let tdM;
      while ((tdM = tdRx.exec(trM[0])) !== null) {
        cells.push(decodeHtml(tdM[1]));
      }
      if (cells.length > 0 && !cells.some(c => String(c || '').toUpperCase().includes('TOTAL'))) {
        const empresa = String(cells[5] || '').trim();
        if (empresa && pjCompanies.has(empresa)) {
          duplicateCompanies.add(empresa);
        }
      }
    }
  }

  return {
    filePath,
    fileName: path.basename(filePath),
    brokerName,
    hasDuplicates: duplicateCompanies.size > 0,
    duplicateCompanies: Array.from(duplicateCompanies)
  };
}

async function readDuplicateRecords(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);
  const firstBytes = buffer.slice(0, 20).toString('latin1').toLowerCase();
  if (extension !== '.xlsx' && !firstBytes.startsWith('pk')) {
    return extractHtmlCommissionRecords(buffer.toString('latin1'), filePath);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return workbook.worksheets.flatMap(sheet => recordsFromRows(getRowsFromXlsxSheet(sheet), {
    filePath,
    table: sheet.name
  }));
}

module.exports = {
  extractHtmlTitle,
  htmlToRows,
  readInput,
  readDuplicateRecords,
  getLastUsedRow,
  getLastUsedCol,
  getRowsFromXlsxSheet,
  analyzeFile
};
