const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { decodeHtml, parseVendedorCorretora } = require('../core/text.cjs');
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

function htmlToRows(html, filePath = '') {
  const clean = html.replace(/\r?\n/g, ' ');
  const titulo = extractHtmlTitle(clean) || path.basename(filePath, path.extname(filePath));
  const periodoMatch = clean.match(/Per[^:<]*odo:\s*<\/b>\s*([^<]*)/i);
  const periodo = decodeHtml(periodoMatch ? periodoMatch[1] : '');
  const loteMatch = clean.match(/Lote:\s*<\/b>\s*([^<]*)\s*-\s*<b[^>]*>\s*([^<]*)/i);
  const lote = loteMatch ? `${decodeHtml(loteMatch[1])} - ${decodeHtml(loteMatch[2])}` : '';
  const totalMatch = clean.match(/Total de Comiss[^:]*a pagar:\s*<b[^>]*>\s*([^<]*)/i);
  const total = decodeHtml(totalMatch ? totalMatch[1] : '');

  const rows = [
    [titulo], [`Período: ${periodo}`], [`Lote: ${lote}`], [],
    [`Total de Comissões a pagar: ${total}`], [], [], ['Comissao_normal']
  ];
  const tableMatch = clean.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return rows;

  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(tableMatch[0])) !== null) {
    const row = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[0])) !== null) row.push(decodeHtml(tdMatch[1]));
    if (row.length) rows.push(row);
  }
  return rows;
}

function readHtmlInput(filePath) {
  const html = fs.readFileSync(filePath).toString('latin1');
  const rows = htmlToRows(html, filePath);
  return {
    filePath,
    type: 'html-xls',
    rows,
    info: parseVendedorCorretora(rows[0]?.[0], filePath)
  };
}

async function readInput(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const firstBytes = fs.readFileSync(filePath).slice(0, 20).toString('latin1').toLowerCase();
  return extension === '.xlsx' || firstBytes.startsWith('pk')
    ? readXlsxInput(filePath)
    : readHtmlInput(filePath);
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
  getRowsFromXlsxSheet
};
