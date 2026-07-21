import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Trophy, Award, Medal, Users, TrendingUp,
  Building2, ChevronDown, Wallet, Crown
} from 'lucide-react';
import { formatBRL } from '../App';

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTE = [
  ['#0564d8', '#0b78ef'], ['#04a9de', '#0891b2'], ['#7c3aed', '#a855f7'],
  ['#059669', '#10b981'], ['#d97706', '#f59e0b'], ['#e11d48', '#f43f5e'],
  ['#0f766e', '#14b8a6'], ['#4338ca', '#6366f1']
];

function avatarGradient(name) {
  let hash = 0;
  const str = String(name || '');
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const [c1, c2] = AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

export default function Analytics({ savedReports }) {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isListExpanded, setIsListExpanded] = useState(false);

  const availableMonths = useMemo(() => {
    if (!savedReports || !savedReports.length) return [];
    const monthsMap = new Map();
    savedReports.forEach(r => {
      if (r.month && r.label) monthsMap.set(r.month, r.label);
    });
    return Array.from(monthsMap.entries())
      .map(([val, label]) => ({ val, label }))
      .sort((a, b) => b.val.localeCompare(a.val));
  }, [savedReports]);

  const rawRanking = useMemo(() => {
    if (!savedReports || !savedReports.length) return [];

    const filteredReports = selectedMonth === 'all'
      ? savedReports
      : savedReports.filter(r => r.month === selectedMonth);

    const sellersMap = new Map();

    filteredReports.forEach(report => {
      if (!report.summary) return;
      report.summary.forEach(brokerData => {
        const corretoraName = brokerData.corretora || 'Corretora não identificada';

        if (brokerData.vendedoresDetalhes) {
          brokerData.vendedoresDetalhes.forEach(vendedor => {
            const nome = vendedor.nome || 'Vendedor Desconhecido';
            const valor = Number(vendedor.total || 0);

            if (!sellersMap.has(nome)) {
              sellersMap.set(nome, { nome, total: 0, corretoras: new Set() });
            }

            const sellerObj = sellersMap.get(nome);
            sellerObj.total += valor;
            sellerObj.corretoras.add(corretoraName);
          });
        }
      });
    });

    return Array.from(sellersMap.values())
      .map(seller => ({ ...seller, corretorasArray: Array.from(seller.corretoras).sort() }))
      .sort((a, b) => b.total - a.total);
  }, [savedReports, selectedMonth]);

  const ranking = useMemo(() => {
    if (!searchTerm.trim()) return rawRanking;
    const term = searchTerm.toLowerCase();
    return rawRanking.filter(s => s.nome.toLowerCase().includes(term));
  }, [rawRanking, searchTerm]);

  const top3 = useMemo(() => ranking.slice(0, 3), [ranking]);
  const others = useMemo(() => ranking.slice(3), [ranking]);
  const maxTotal = rawRanking[0]?.total || 1;

  const stats = useMemo(() => {
    const totalVendedores = rawRanking.length;
    const totalGeral = rawRanking.reduce((sum, s) => sum + s.total, 0);
    const media = totalVendedores ? totalGeral / totalVendedores : 0;
    const corretorasSet = new Set();
    rawRanking.forEach(s => s.corretorasArray.forEach(c => corretorasSet.add(c)));
    return { totalVendedores, totalGeral, media, totalCorretoras: corretorasSet.size };
  }, [rawRanking]);

  if (!savedReports || savedReports.length === 0) {
    return (
      <div className="page active">
        <div className="page-title">
          <div>
            <h1>Analítica</h1>
            <p>Ranking e análise detalhada de vendas por vendedor.</p>
          </div>
        </div>
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          Nenhum relatório salvo no histórico para gerar a análise.
        </div>
      </div>
    );
  }

  const isSearching = searchTerm.trim().length > 0;
  const periodLabel = selectedMonth === 'all'
    ? 'todos os períodos'
    : (availableMonths.find(m => m.val === selectedMonth)?.label || selectedMonth);

  return (
    <div className="page active analytics-page">
      <div className="page-title">
        <div>
          <h1>Analítica</h1>
          <p>Ranking consolidado de vendedores em {periodLabel}.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="metric-grid" style={{ marginBottom: 24 }}>
        <div className="metric">
          <div className="metric-icon blue"><Wallet size={24} /></div>
          <div>
            <small>Total vendido</small>
            <strong>{formatBRL(stats.totalGeral)}</strong>
          </div>
        </div>
        <div className="metric">
          <div className="metric-icon green"><Users size={24} /></div>
          <div>
            <small>Vendedores ativos</small>
            <strong>{stats.totalVendedores}</strong>
          </div>
        </div>
        <div className="metric">
          <div className="metric-icon cyan"><Building2 size={24} /></div>
          <div>
            <small>Corretoras envolvidas</small>
            <strong>{stats.totalCorretoras}</strong>
          </div>
        </div>
        <div className="metric">
          <div className="metric-icon amber"><TrendingUp size={24} /></div>
          <div>
            <small>Média por vendedor</small>
            <strong>{formatBRL(stats.media)}</strong>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="panel an-toolbar">
        <div className="an-toolbar-row">
          <div className="an-search">
            <Search size={16} className="an-search-icon" />
            <input
              type="text"
              placeholder="Buscar vendedor por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="an-search-input"
            />
            {searchTerm && (
              <button className="an-search-clear" onClick={() => setSearchTerm('')} aria-label="Limpar busca">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="an-period">
            <label htmlFor="monthFilter">Período</label>
            <select
              id="monthFilter"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="an-period-select"
            >
              <option value="all">Tempo geral (todos os meses)</option>
              {availableMonths.map(m => (
                <option key={m.val} value={m.val}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {ranking.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          Nenhum vendedor encontrado com os filtros selecionados.
        </div>
      ) : (
        <>
          {!isSearching ? (
            <div className="an-podium">
              {[top3[1], top3[0], top3[2]].map((seller, slotIdx) => {
                if (!seller) return <div key={slotIdx} className="an-podium-empty" />;
                const rank = slotIdx === 1 ? 1 : (slotIdx === 0 ? 2 : 3);
                const Icon = rank === 1 ? Trophy : rank === 2 ? Award : Medal;
                return (
                  <motion.div
                    key={seller.nome}
                    className={`an-podium-card rank-${rank}`}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: rank === 1 ? 0 : rank === 2 ? 0.08 : 0.16 }}
                  >
                    {rank === 1 && <Crown size={18} className="an-podium-crown" />}
                    <div className="an-podium-rank-icon">
                      <Icon size={20} />
                    </div>
                    <div
                      className="an-avatar"
                      style={{ background: avatarGradient(seller.nome) }}
                      title={seller.nome}
                    >
                      {getInitials(seller.nome)}
                    </div>
                    <div className="an-podium-name" title={seller.nome}>{seller.nome}</div>
                    <div className="an-podium-value">{formatBRL(seller.total)}</div>
                    <div className="an-podium-corretoras">
                      {seller.corretorasArray.map(c => (
                        <span key={c} className="an-badge" title={c}>{c}</span>
                      ))}
                    </div>
                    <div className="an-podium-base">{rank}º</div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="an-search-info">
              Exibindo resultados da busca por "<strong>{searchTerm}</strong>" — {ranking.length} vendedor{ranking.length !== 1 ? 'es' : ''} encontrado{ranking.length !== 1 ? 's' : ''}
            </div>
          )}

          {(others.length > 0 || isSearching) && (
            <div className="panel an-list-panel">
              <div
                className={`an-list-trigger ${isListExpanded || isSearching ? 'expanded' : ''}`}
                onClick={() => !isSearching && setIsListExpanded(v => !v)}
                style={{ cursor: isSearching ? 'default' : 'pointer' }}
              >
                <div className="an-list-title">
                  <h3>{isSearching ? 'Resultados da busca' : 'Demais posições'}</h3>
                  {!isSearching && <span className="an-badge-count">{others.length} vendedores</span>}
                </div>
                {!isSearching && (
                  <span className="an-list-chevron">
                    <ChevronDown size={14} style={{ transform: isListExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} />
                    {isListExpanded ? 'Recolher' : 'Expandir'}
                  </span>
                )}
              </div>

              <AnimatePresence initial={false}>
                {(isListExpanded || isSearching) && (
                  <motion.div
                    className="an-list"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    {(isSearching ? ranking : others).map((seller) => {
                      const realIndex = rawRanking.findIndex(s => s.nome === seller.nome);
                      const position = realIndex !== -1 ? realIndex + 1 : 0;
                      const isTop3 = position > 0 && position <= 3;
                      const pct = Math.max(4, Math.round((seller.total / maxTotal) * 100));

                      return (
                        <div key={seller.nome} className={`an-list-item ${isTop3 ? 'highlight' : ''}`}>
                          <div className="an-list-position">{position}º</div>
                          <div
                            className="an-avatar sm"
                            style={{ background: avatarGradient(seller.nome) }}
                          >
                            {getInitials(seller.nome)}
                          </div>
                          <div className="an-list-info">
                            <div className="an-list-name" title={seller.nome}>{seller.nome}</div>
                            <div className="an-list-corretoras">
                              {seller.corretorasArray.map(c => (
                                <span key={c} className="an-badge" title={c}>{c}</span>
                              ))}
                            </div>
                            <div className="an-list-bar-track">
                              <div className="an-list-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <div className="an-list-value">{formatBRL(seller.total)}</div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}
