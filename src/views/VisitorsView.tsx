import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Visitor, Block, Apartment, Resident, AccessLog } from '../types';
import { WhatsAppPayload } from '../services/whatsapp';

interface VisitorsViewProps {
  onTriggerWhatsApp: (payload: WhatsAppPayload) => void;
  onFastCheckIn: (name: string, type: 'visitante', aptId: string, blockId: string, doc: string) => void;
}

export const VisitorsView: React.FC<VisitorsViewProps> = ({
  onTriggerWhatsApp,
  onFastCheckIn,
}) => {
  const currentUser = storage.getCurrentUser();
  const isObserver = currentUser.role === 'admin';
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Visitor Form State
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('bloco-a');
  const [selectedAptId, setSelectedAptId] = useState('apt-101a');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState('14:00');
  const [isPreAuthorized, setIsPreAuthorized] = useState(true);
  const [notes, setNotes] = useState('');

  const refreshData = () => {
    setVisitors(storage.getVisitors());
    setBlocks(storage.getBlocks());
    setApartments(storage.getApartments());
    setResidents(storage.getResidents());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  const filteredVisitors = visitors.filter((v) => {
    return (
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.document.includes(searchQuery) ||
      v.apartmentId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !document) {
      alert('Nome e documento são obrigatórios.');
      return;
    }

    const hostResident = residents.find((r) => r.apartmentId === selectedAptId && r.isMainResident) || residents.find((r) => r.apartmentId === selectedAptId);

    const newVis: Visitor = {
      id: `vis-${Date.now()}`,
      name,
      document,
      phone,
      apartmentId: selectedAptId,
      blockId: selectedBlockId,
      authorizedByMoradorId: hostResident?.id,
      authorizedByName: hostResident?.name || 'Morador Titular',
      scheduledDate,
      scheduledTime,
      notes,
      isPreAuthorized: true,
    };

    storage.saveVisitor(newVis);

    // Morador autorizou: registra o acesso imediatamente no condomínio
    onFastCheckIn(newVis.name, 'visitante', newVis.apartmentId, newVis.blockId, newVis.document);

    setShowAddModal(false);
  };

  const handleRequestApproval = (vis: Visitor) => {
    const aptNum = vis.apartmentId.replace('apt-', '').toUpperCase();
    const hostResident = residents.find((r) => r.apartmentId === vis.apartmentId && r.isNotificationContact) || residents.find((r) => r.apartmentId === vis.apartmentId);

    onTriggerWhatsApp({
      phone: hostResident ? hostResident.phone : '',
      residentName: hostResident ? hostResident.name : 'Morador(a)',
      apartmentNumber: aptNum,
      visitorName: vis.name,
      templateKey: 'visitante_aguardando',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Visitantes</h2>
          </div>
        </div>

        {isObserver ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/80 border border-purple-700/60 text-purple-300 rounded-lg text-xs font-semibold shrink-0">
            <Eye className="w-4 h-4 text-purple-400" />
            <span>Modo Observador</span>
          </div>
        ) : (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Visitante</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar visitantes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Visitors List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVisitors.map((vis) => {
          const aptNum = vis.apartmentId.replace('apt-', '').toUpperCase();
          const block = blocks.find((b) => b.id === vis.blockId);

          return (
            <div
              key={vis.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-white text-xs leading-tight">{vis.name}</h4>
                    <span className="text-[10px] text-slate-400">Doc: {vis.document}</span>
                  </div>

                  <span className="text-xs font-mono font-bold text-white bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                    Apt {aptNum}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                  <p>
                    Autorizado por:{' '}
                    <strong className="text-slate-200">{vis.authorizedByName || 'Morador'}</strong>
                  </p>
                  <p>Data Prevista: <span className="font-mono text-slate-300">{vis.scheduledDate} {vis.scheduledTime && `às ${vis.scheduledTime}`}</span></p>
                  {vis.notes && <p className="text-[10px] text-slate-500">{vis.notes}</p>}
                </div>

                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Autorizado pelo Morador
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleRequestApproval(vis)}
                  className="flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 font-semibold"
                  title="Contatar morador do apartamento via WhatsApp ou interfone"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>Contatar Apto</span>
                </button>

                {isObserver ? (
                  <span className="text-[10px] text-slate-500 font-mono italic">Observador</span>
                ) : (
                  <button
                    onClick={() => onFastCheckIn(vis.name, 'visitante', vis.apartmentId, vis.blockId, vis.document)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                    title="Dar entrada imediata após liberação do apartamento"
                  >
                    <span>Dar Entrada (Liberado)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Visitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain modal-overlay">
          <form
            onSubmit={handleCreateVisitor}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col my-auto max-h-[calc(100dvh-2rem)] overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0 sticky top-0 z-20">
              <h3 className="text-sm font-semibold text-white">Cadastrar Autorização de Visitante</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome Completo do Visitante *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do visitante"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Documento (RG / CPF) *</label>
                  <input
                    type="text"
                    required
                    placeholder="RG ou CPF"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Telefone do Visitante</label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bloco / Torre</label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.identification})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Apartamento Visitado *</label>
                  <select
                    value={selectedAptId}
                    onChange={(e) => setSelectedAptId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    {apartments
                      .filter((a) => !selectedBlockId || a.blockId === selectedBlockId)
                      .map((apt) => (
                        <option key={apt.id} value={apt.id}>
                          Apt {apt.number} ({apt.floor}º Andar)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Data Prevista *</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Horário Previsto</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observações da Visita</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Parente do morador, confraternização..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="p-3.5 bg-purple-950/40 border border-purple-800/50 rounded-xl text-xs text-purple-200 space-y-1.5">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Regra de Entrada e Liberação pelo Morador:
                </p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  O porteiro realiza o contato prévio com a unidade (interfone ou WhatsApp). Se o morador liberar, o cadastro é concluído e a entrada no condomínio é concedida imediatamente. Se o morador não liberar, o visitante não entra e nenhum cadastro é registrado no sistema.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-pre"
                  checked={isPreAuthorized}
                  onChange={(e) => setIsPreAuthorized(e.target.checked)}
                  className="accent-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="chk-pre" className="text-slate-200 font-medium cursor-pointer">
                  Morador contatado e autorizou a entrada imediata
                </label>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2 shrink-0 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer"
              >
                Cadastrar e Liberar Entrada
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
