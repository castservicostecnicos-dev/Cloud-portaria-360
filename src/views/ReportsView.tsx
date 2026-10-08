import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  Search,
  FileSpreadsheet,
} from 'lucide-react';
import { storage } from '../services/storage';
import { AccessLog, DeliveryItem, Occurrence, Block, Apartment } from '../types';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<
    'acessos' | 'encomendas' | 'ocorrencias' | 'dentro_agora'
  >('acessos');

  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');

  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);

  const refreshData = () => {
    setAccessLogs(storage.getAccessLogs());
    setDeliveries(storage.getDeliveries());
    setOccurrences(storage.getOccurrences());
    setBlocks(storage.getBlocks());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  // Filtered dataset
  const filteredAccess = accessLogs.filter((log) => {
    const logDate = log.entryTime.slice(0, 10);
    const inRange = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
    const matchesBlock = selectedBlock === 'all' || log.blockId === selectedBlock;
    const matchesSearch =
      !searchFilter ||
      log.personName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (log.apartmentId && log.apartmentId.toLowerCase().includes(searchFilter.toLowerCase()));
    return inRange && matchesBlock && matchesSearch;
  });

  const filteredDeliveries = deliveries.filter((del) => {
    const delDate = del.receivedAt.slice(0, 10);
    const inRange = (!startDate || delDate >= startDate) && (!endDate || delDate <= endDate);
    const matchesBlock = selectedBlock === 'all' || del.blockId === selectedBlock;
    const matchesSearch =
      !searchFilter ||
      del.recipientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      del.code.toLowerCase().includes(searchFilter.toLowerCase());
    return inRange && matchesBlock && matchesSearch;
  });

  const filteredOccurrences = occurrences.filter((occ) => {
    const inRange = (!startDate || occ.date >= startDate) && (!endDate || occ.date <= endDate);
    const matchesBlock = selectedBlock === 'all' || occ.blockId === selectedBlock;
    const matchesSearch =
      !searchFilter ||
      occ.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      occ.location.toLowerCase().includes(searchFilter.toLowerCase());
    return inRange && matchesBlock && matchesSearch;
  });

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'acessos' || reportType === 'dentro_agora') {
      const rows = [
        ['ID', 'Nome', 'Tipo', 'Documento', 'Apartamento', 'Entrada', 'Saida', 'Status', 'Porteiro'],
        ...(reportType === 'dentro_agora'
          ? filteredAccess.filter((l) => l.status === 'dentro')
          : filteredAccess
        ).map((l) => [
          l.id,
          l.personName,
          l.personType,
          l.document || '',
          l.apartmentId || '',
          l.entryTime,
          l.exitTime || '',
          l.status,
          l.operatorName,
        ]),
      ];
      csvContent += rows.map((e) => e.map((val) => `"${val}"`).join(';')).join('\n');
    } else if (reportType === 'encomendas') {
      const rows = [
        ['Codigo', 'Destinatario', 'Apartamento', 'Tipo', 'Descricao', 'RecebidoEm', 'Status', 'RetiradoPor'],
        ...filteredDeliveries.map((d) => [
          d.code,
          d.recipientName,
          d.apartmentId,
          d.type,
          d.description,
          d.receivedAt,
          d.status,
          d.pickedUpBy || '',
        ]),
      ];
      csvContent += rows.map((e) => e.map((val) => `"${val}"`).join(';')).join('\n');
    } else {
      const rows = [
        ['ID', 'Data', 'Hora', 'Tipo', 'Local', 'Descricao', 'Status', 'Providencia', 'Porteiro'],
        ...filteredOccurrences.map((o) => [
          o.id,
          o.date,
          o.time,
          o.type,
          o.location,
          o.description,
          o.status,
          o.actionTaken || '',
          o.operatorName,
        ]),
      ];
      csvContent += rows.map((e) => e.map((val) => `"${val}"`).join(';')).join('\n');
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_portaria_${reportType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl no-print">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Relatórios & Exportação</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Histórico e exportação de acessos, encomendas e ocorrências.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and Switcher Controls (no-print) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 no-print">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setReportType('acessos')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              reportType === 'acessos' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Entradas e Saídas ({filteredAccess.length})
          </button>

          <button
            onClick={() => setReportType('dentro_agora')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              reportType === 'dentro_agora' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Atualmente no Condomínio ({accessLogs.filter((l) => l.status === 'dentro').length})
          </button>

          <button
            onClick={() => setReportType('encomendas')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              reportType === 'encomendas' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Encomendas e Recebimentos ({filteredDeliveries.length})
          </button>

          <button
            onClick={() => setReportType('ocorrencias')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
              reportType === 'ocorrencias' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Livro de Ocorrências ({filteredOccurrences.length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono-tabular"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono-tabular"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Filtrar Bloco</label>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
            >
              <option value="all">Todos os Blocos</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Palavra-chave / Busca</label>
            <input
              type="text"
              placeholder="Nome, código, apt..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* REPORT PRINT HEADER (visible during print) */}
      <div className="hidden print-only mb-6 text-slate-900 border-b pb-4">
        <h1 className="text-xl font-bold">{storage.getCondo().name} - Relatório da Portaria</h1>
        <p className="text-xs text-slate-600">
          CNPJ: {storage.getCondo().cnpj} · Período: {startDate} até {endDate} · Tipo: {reportType.toUpperCase()}
        </p>
      </div>

      {/* REPORT DATA TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px]">
              {(reportType === 'acessos' || reportType === 'dentro_agora') && (
                <tr>
                  <th className="py-3 px-4">Pessoa / Tipo</th>
                  <th className="py-3 px-4">Destino</th>
                  <th className="py-3 px-4">Motivo / Placa</th>
                  <th className="py-3 px-4">Entrada</th>
                  <th className="py-3 px-4">Saída</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Porteiro</th>
                </tr>
              )}

              {reportType === 'encomendas' && (
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Destinatário</th>
                  <th className="py-3 px-4">Apartamento</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Recebido em</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Retirada / Assinatura</th>
                </tr>
              )}

              {reportType === 'ocorrencias' && (
                <tr>
                  <th className="py-3 px-4">Data/Hora</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Local</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Providência</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {(reportType === 'acessos' || reportType === 'dentro_agora') &&
                (reportType === 'dentro_agora'
                  ? filteredAccess.filter((l) => l.status === 'dentro')
                  : filteredAccess
                ).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-semibold text-white">
                      {l.personName} <span className="text-[10px] text-slate-400 capitalize">({l.personType})</span>
                    </td>
                    <td className="py-3 px-4 font-mono">Apt {l.apartmentId?.replace('apt-', '').toUpperCase() || 'Geral'}</td>
                    <td className="py-3 px-4">
                      {l.purpose} {l.vehiclePlate && `· [${l.vehiclePlate}]`}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular">{l.entryTime}</td>
                    <td className="py-3 px-4 font-mono-tabular">{l.exitTime || '---'}</td>
                    <td className="py-3 px-4 capitalize">{l.status.replace('_', ' ')}</td>
                    <td className="py-3 px-4 text-slate-400">{l.operatorName.split(' ')[0]}</td>
                  </tr>
                ))}

              {reportType === 'encomendas' &&
                filteredDeliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-mono font-bold text-white">{d.code}</td>
                    <td className="py-3 px-4 font-semibold text-white">{d.recipientName}</td>
                    <td className="py-3 px-4 font-mono">Apt {d.apartmentId.replace('apt-', '').toUpperCase()}</td>
                    <td className="py-3 px-4">{d.description}</td>
                    <td className="py-3 px-4 font-mono-tabular">{d.receivedAt}</td>
                    <td className="py-3 px-4 capitalize">{d.status.replace('_', ' ')}</td>
                    <td className="py-3 px-4 text-[11px]">{d.pickedUpBy || 'Pendente'}</td>
                  </tr>
                ))}

              {reportType === 'ocorrencias' &&
                filteredOccurrences.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-850/50">
                    <td className="py-3 px-4 font-mono-tabular">
                      {o.date} {o.time}
                    </td>
                    <td className="py-3 px-4 font-bold uppercase text-white">{o.type}</td>
                    <td className="py-3 px-4">{o.location}</td>
                    <td className="py-3 px-4 max-w-[280px] truncate">{o.description}</td>
                    <td className="py-3 px-4 capitalize font-mono text-[10px]">{o.status}</td>
                    <td className="py-3 px-4 text-slate-300">{o.actionTaken || 'Sem providência'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
