const path = require('node:path');

function normalizeBaseText(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/&/g, ' E ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeFileName(name) {
  return String(name || 'SEM_NOME')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.text) return String(value.text);
    if (value.richText) return value.richText.map(x => x.text).join('');
    if (value.result !== undefined) return String(value.result);
    if (value.formula !== undefined && value.result !== undefined) return String(value.result);
  }
  return String(value);
}

function parseVendedorCorretora(rawTitle, filePath = '') {
  let text = decodeHtml(getText(rawTitle))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  text = text.replace(/[–—]/g, '-').replace(/\s*-\s*/g, ' - ');

  let vendedor = '';
  let corretora = '';
  let isPrincipalCorretora = false;
  const parts = text.split(' - ').map(part => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    vendedor = parts[0];
    corretora = parts.slice(1).join(' - ');
  }

  if (!corretora && text && !text.match(/^Per[ií]odo|^Lote|^Total|^Comissao/i)) {
    corretora = text;
    vendedor = 'Corretora principal';
    isPrincipalCorretora = true;
  }

  if ((!corretora || corretora === 'Corretora não identificada') && filePath) {
    const base = path.basename(filePath, path.extname(filePath))
      .replace(/[_]+/g, ' ')
      .replace(/[–—]/g, '-')
      .replace(/\s*-\s*/g, ' - ')
      .trim();
    const fileParts = base.split(' - ').map(part => part.trim()).filter(Boolean);
    if (fileParts.length >= 2) {
      vendedor = vendedor || fileParts[0];
      corretora = fileParts.slice(1).join(' - ');
      text = text || base;
      isPrincipalCorretora = false;
    }
  }

  return {
    vendedor: vendedor || 'Corretora principal',
    corretora: corretora || 'Corretora não identificada',
    titulo: text || 'Identificação não encontrada',
    isPrincipalCorretora
  };
}

function parseBrazilNumber(text) {
  let value = String(text || '').trim();
  if (!value) return null;
  value = value.replace(/R\$/gi, '').replace(/\s+/g, '');
  const isPercent = value.endsWith('%');
  if (isPercent) value = value.slice(0, -1);
  if (!/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(value) && !/^-?\d+(,\d+)?$/.test(value) && !/^-?\d+(\.\d+)?$/.test(value)) {
    return null;
  }
  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return isPercent ? number / 100 : number;
}

function parseBrazilCurrency(text) {
  const raw = String(text || '').replace(/R\$/gi, '').trim();
  const matches = raw.match(/-?\d{1,3}(?:\.\d{3})*,\d{1,2}|-?\d+,\d{1,2}|-?\d+(?:\.\d+)?/g);
  if (!matches || !matches.length) return null;
  let value = matches[matches.length - 1].replace(/\s/g, '');
  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumberBR(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatBRL(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

module.exports = {
  normalizeBaseText,
  safeFileName,
  decodeHtml,
  getText,
  parseVendedorCorretora,
  parseBrazilNumber,
  parseBrazilCurrency,
  formatNumberBR,
  formatBRL
};
