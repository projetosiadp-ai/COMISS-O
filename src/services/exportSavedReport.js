import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { safeFileName, formatBRL } from '../lib/core/text';

export async function exportSingleBrokerWorkbook(report, brokerItem) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'glzn-comercial';
  wb.created = new Date();
  const ws = wb.addWorksheet('Comissões Gerais', { views: [{ showGridLines: true }] });

  ws.getRow(1).getCell(1).value = brokerItem.corretora;
  ws.getRow(1).font = { bold: true, size: 14 };

  ws.getRow(2).getCell(1).value = `Mês: ${report.label || report.month}`;
  ws.getRow(3).getCell(1).value = `Total de Comissões a pagar: ${formatBRL(brokerItem.totalConsolidado ?? brokerItem.total ?? 0)}`;
  ws.getRow(3).font = { bold: true };

  const headerRow = ws.getRow(5);
  headerRow.getCell(1).value = 'Vendedor / Responsável';
  headerRow.getCell(2).value = 'Comissão';
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };

  let rIdx = 6;
  const vendedores = brokerItem.vendedoresDetalhes || (brokerItem.nomesVendedores || []).map(n => ({ nome: n, total: null }));
  for (const v of vendedores) {
    const row = ws.getRow(rIdx++);
    row.getCell(1).value = v.nome;
    if (v.total !== null && v.total !== undefined) {
      row.getCell(2).value = Number(v.total);
      row.getCell(2).numFmt = '#,##0.00';
    }
  }

  ws.getColumn(1).width = 40;
  ws.getColumn(2).width = 20;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `${safeFileName(brokerItem.corretora)}.xlsx`;
  saveAs(blob, fileName);
}

export async function exportSavedReportZip(report) {
  return exportSavedReportWorkbooks(report, { chooseFolder: false, asZip: true });
}

// Exporta todas as planilhas individuais (ex: FJS APOIO.xlsx, GEBARA.xlsx, W3G.xlsx...) em 1 clique
export async function exportSavedReportWorkbooks(report, options = { chooseFolder: true, asZip: false }) {
  const summary = report.summary || [];
  if (!summary || summary.length === 0) {
    alert('Nenhum dado disponível neste relatório para exportar.');
    return;
  }

  const generatedFiles = [];

  // Gera cada planilha individual por corretora
  for (const item of summary) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'glzn-comercial';
    wb.created = new Date();
    const ws = wb.addWorksheet('Comissões Gerais', { views: [{ showGridLines: true }] });

    ws.getRow(1).getCell(1).value = item.corretora;
    ws.getRow(1).font = { bold: true, size: 14 };

    ws.getRow(2).getCell(1).value = `Mês: ${report.label || report.month}`;
    ws.getRow(3).getCell(1).value = `Total de Comissões a pagar: ${formatBRL(item.totalConsolidado ?? item.total ?? 0)}`;
    ws.getRow(3).font = { bold: true };

    const headerRow = ws.getRow(5);
    headerRow.getCell(1).value = 'Vendedor / Responsável';
    headerRow.getCell(2).value = 'Comissão';
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFBFBF' } };

    let rIdx = 6;
    const vendedores = item.vendedoresDetalhes || (item.nomesVendedores || []).map(n => ({ nome: n, total: null }));
    for (const v of vendedores) {
      const row = ws.getRow(rIdx++);
      row.getCell(1).value = v.nome;
      if (v.total !== null && v.total !== undefined) {
        row.getCell(2).value = Number(v.total);
        row.getCell(2).numFmt = '#,##0.00';
      }
    }

    ws.getColumn(1).width = 40;
    ws.getColumn(2).width = 20;

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `${safeFileName(item.corretora)}.xlsx`;
    generatedFiles.push({ fileName, blob });
  }

  // 1. Tenta salvar via Seletor de Pasta do Windows se suportado
  if (options.chooseFolder && !options.asZip && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await window.showDirectoryPicker();
      let count = 0;
      for (const fileObj of generatedFiles) {
        const fileHandle = await dirHandle.getFileHandle(fileObj.fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(fileObj.blob);
        await writable.close();
        count++;
      }
      alert(`${count} planilha(s) individuais salvas com sucesso na pasta do Windows selecionada!`);
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('showDirectoryPicker não permitido ou cancelado, gerando pacote ZIP:', err);
    }
  }

  // 2. Pacote ZIP Único com todas as planilhas individuais dentro (Zero popups repetidos!)
  const zip = new JSZip();
  const folderName = safeFileName(report.label || report.month);
  
  for (const fileObj of generatedFiles) {
    zip.file(fileObj.fileName, fileObj.blob);
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const zipFileName = `Planilhas_Individuais_${folderName}.zip`;
  saveAs(zipContent, zipFileName);
}
