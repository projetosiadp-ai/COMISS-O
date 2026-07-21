import React from 'react';
import { formatBRL } from '../App';

export default function HistoryTable({ reports, onDelete }) {
  if (!reports || !reports.length) {
    return <div className="empty-state">Nenhum relatório salvo ainda.</div>;
  }


  return (
    <table className="history-table">
      <thead>
        <tr>
          <th>Relatório</th>
          <th>Vendedores</th>
          <th>Corretoras</th>
          <th>Valor total</th>
          <th>Arquivos</th>
          <th>Criado em</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((report) => (
          <tr key={report.id}>
            <td><strong>{report.label}</strong></td>
            <td>{Number(report.sellers || 0)}</td>
            <td>{Number(report.brokers || 0)}</td>
            <td>{formatBRL(report.totalValue)}</td>
            <td>{Number(report.inputFiles || 0)}</td>
            <td>{new Date(report.createdAt).toLocaleString('pt-BR')}</td>
            <td>
              <div className="history-row-actions">
                <button className="delete" onClick={() => onDelete(report.id)}>Excluir</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
