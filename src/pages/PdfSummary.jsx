import React, { useState } from 'react';
import { formatBRL } from '../App';
import { generateGeneralReport } from '../services/reportGenerator';

export default function PdfSummary({ addLog }) {
  const log = (type, msg) => {
    if (addLog) addLog(type, msg);
  };

  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  const [progress, setProgress] = useState({
    percent: 0,
    message: 'Selecione as planilhas para começar.',
    phase: 'aguardando',
    title: 'Aguardando processamento'
  });
  
  const [status, setStatus] = useState({
    type: '', // 'loading', 'success', 'error', ''
    message: ''
  });
  
  const [result, setResult] = useState(null);

  const onProgress = (current, total, message, phase) => {
    const labels = { 
      leitura: 'Lendo planilhas', 
      geracao: 'Gerando PDF', 
      concluido: 'Concluído', 
      processando: 'Processando' 
    };
    const percent = total ? Math.max(0, Math.min(100, Math.round((current / total) * 100))) : 0;
    setProgress({
      percent,
      message: message || '',
      phase: phase || 'processando',
      title: labels[phase] || 'Processando'
    });
    if (message) {
      if (phase === 'concluido') {
        log('success', message);
      } else {
        log('info', message);
      }
    }
  };

  const addFiles = (files) => {
    const allowed = /\.(xls|xlsx)$/i;
    const filtered = (files || []).filter(f => allowed.test(f.name));
    setSelectedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const newFiles = filtered.filter(f => !existingNames.has(f.name));
      const next = [...prev, ...newFiles];
      log('info', `${newFiles.length} planilhas de resumo válidas adicionadas. Total na fila: ${next.length}`);
      return next;
    });
  };

  const handleSelectFiles = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleGenerateSummary = async () => {
    if (!selectedFiles.length) {
      setStatus({ type: 'error', message: 'Selecione ou arraste as planilhas prontas.' });
      log('error', 'Tentativa de gerar PDF de resumo sem arquivos selecionados.');
      return;
    }

    setProcessing(true);
    setResult(null);
    setProgress({
      percent: 0,
      message: 'Preparando...',
      phase: 'processando',
      title: 'Processando'
    });
    setStatus({
      type: 'loading',
      message: 'Gerando o PDF único...'
    });
    log('info', 'Iniciando compilação do PDF de resumo de comissões.');

    try {
      const res = await generateGeneralReport(selectedFiles, onProgress);

      setResult(res);
      setStatus({
        type: 'success',
        message: 'PDF gerado e baixado com sucesso!'
      });

      log('success', 'PDF de resumo compilado com sucesso e baixado para a máquina local!');
      if (res.errors && res.errors.length > 0) {
        log('error', `${res.errors.length} erro(s) ao ler arquivos para o resumo PDF.`);
        res.errors.forEach(err => log('error', `Erro no resumo: ${err}`));
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.message || 'Erro ao gerar o PDF.'
      });
      log('error', `Erro crítico ao compilar PDF de resumo: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div id="page-pdf-summary" className="page active">
      <div className="page-title">
        <div>
          <h1>PDF de resumo</h1>
          <p>Use planilhas já prontas. O nome da corretora será lido pelo nome do arquivo.</p>
        </div>
      </div>

      <section className="panel">
        <div 
          id="summaryDropzone" 
          className={`dropzone small ${dragOver ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          tabIndex="0"
          style={{ position: 'relative' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}>
            <div className="upload-icon">⇧</div>
            <strong>Arraste as planilhas prontas</strong>
            <span>ou clique para selecionar</span>
            <small>.XLS · .XLSX</small>
            <input type="file" multiple accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleSelectFiles} />
          </label>
        </div>
        <p id="summaryFileCount" className="muted" style={{ marginTop: '12px' }}>
          {selectedFiles.length ? `${selectedFiles.length} arquivo(s) selecionado(s).` : 'Nenhum arquivo selecionado.'}
        </p>
        <div id="summaryFileList" className="file-list">
          {selectedFiles.map((file, idx) => (
            <div key={idx} className="file-chip" title={file.name}>
              {file.name}
            </div>
          ))}
        </div>
      </section>

      <section className="panel progress-panel">
        <div className="progress-head">
          <strong id="summaryProgressTitle">{progress.title}</strong>
          <b id="summaryProgressPercent">{progress.percent}%</b>
        </div>
        <div className="progress-track">
          <div id="summaryProgressFill" className="progress-fill" style={{ width: `${progress.percent}%` }}></div>
        </div>
        <p id="summaryProgressText">{progress.message}</p>
      </section>

      <div className="action-row">
        <button 
          id="btnGenerateSummary" 
          className="primary large" 
          onClick={handleGenerateSummary}
          disabled={processing}
        >
          Gerar PDF único
        </button>
      </div>

      {status.type && (
        <div id="summaryStatus" className={`status ${status.type}`}>
          {status.message}
        </div>
      )}

      {result && (
        <section id="summaryPdfPreview" className="panel">
          <div className="panel-head">
            <div>
              <h2>Resumo gerado</h2>
              <p>{result.items?.length || 0} corretora(s) — {formatBRL(result.totalGeral)}</p>
            </div>
          </div>
          <div className="summary-table">
            <table>
              <thead>
                <tr>
                  <th>Corretora</th>
                  <th>Valor total</th>
                </tr>
              </thead>
              <tbody>
                {(result.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.corretora}</td>
                    <td>{formatBRL(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
