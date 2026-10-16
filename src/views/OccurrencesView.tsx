import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Camera,
  CheckCircle2,
  Clock,
  Building,
  User,
  Shield,
  Trash2,
  Edit2,
  Image,
  Eye,
  FileText,
  ArrowRight,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Occurrence, OccurrenceType, Block, Apartment, ShiftEntry } from '../types';
import { CameraCaptureModal } from '../components/CameraCaptureModal';

interface OccurrencesViewProps {
  initialSnapshot?: { url: string; cameraName: string } | null;
  onClearSnapshot?: () => void;
  onOpenShiftHandover?: () => void;
}

export const OccurrencesView: React.FC<OccurrencesViewProps> = ({
  initialSnapshot,
  onClearSnapshot,
  onOpenShiftHandover,
}) => {
  const currentUser = storage.getCurrentUser();
  const isObserver = currentUser.role === 'admin';
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'occurrences' | 'shifts'>('occurrences');
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<OccurrenceType>('barulho');
  const [location, setLocation] = useState('');
  const [involvedParties, setInvolvedParties] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('bloco-a');
  const [selectedAptId, setSelectedAptId] = useState('apt-101a');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [status, setStatus] = useState<Occurrence['status']>('aberta');

  const refreshData = () => {
    setOccurrences(storage.getOccurrences());
    setShifts(storage.getShiftEntries());
    setBlocks(storage.getBlocks());
    setApartments(storage.getApartments());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (initialSnapshot) {
      setAttachedPhotos([initialSnapshot.url]);
      setDescription(`[Evidência capturada pela Câmera CFTV: ${initialSnapshot.cameraName}]\n`);
      setShowAddModal(true);
      if (onClearSnapshot) onClearSnapshot();
    }
  }, [initialSnapshot]);

  const filteredOccurrences = occurrences.filter((occ) => {
    if (currentUser.role === 'morador' && currentUser.apartmentId) {
      const isMine =
        occ.apartmentId === currentUser.apartmentId || occ.operatorName.includes(currentUser.name);
      const isGeneral = !occ.apartmentId;
      if (!isMine && !isGeneral) return false;
    }
    const matchesSearch =
      occ.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occ.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occ.involvedParties.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || occ.status === filterStatus;
    const matchesType = filterType === 'all' || occ.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateOccurrence = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!location.trim() || !description.trim()) {
      setFormError('Por favor informe o local e a descrição detalhada da ocorrência.');
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const user = storage.getCurrentUser();

    const isMorador = user.role === 'morador';
    const effectiveAptId = isMorador ? (user.apartmentId || selectedAptId) : (selectedAptId || undefined);
    const effectiveBlockId = isMorador ? (user.blockId || selectedBlockId) : (selectedBlockId || undefined);
    const effectiveOperator = isMorador
      ? `${user.name} (Morador Apt ${user.unitNumber || ''})`
      : user.name;
    const effectiveStatus = isMorador ? 'aberta' : status;

    const newOcc: Occurrence = {
      id: `oco-${Date.now()}`,
      date,
      time,
      type,
      location: location.trim(),
      involvedParties: involvedParties.trim() || (isMorador ? `Morador ${user.name}` : ''),
      apartmentId: effectiveAptId,
      blockId: effectiveBlockId,
      description: description.trim(),
      photos: attachedPhotos.length > 0 ? attachedPhotos : undefined,
      operatorName: effectiveOperator,
      status: effectiveStatus,
      actionTaken: isMorador ? undefined : (actionTaken.trim() || undefined),
    };

    storage.saveOccurrence(newOcc);
    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setLocation('');
    setInvolvedParties('');
    setDescription('');
    setActionTaken('');
    setAttachedPhotos([]);
    setStatus('aberta');
    setFormError(null);
  };

  const handleUpdateStatus = (occ: Occurrence, newStatus: Occurrence['status']) => {
    const updated: Occurrence = {
      ...occ,
      status: newStatus,
    };
    storage.saveOccurrence(updated);
  };

  const condo = storage.getCondo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {currentUser.role === 'morador' ? 'Livro de Ocorrências do Morador' : 'Livro de Ocorrências'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentUser.role === 'morador'
              ? `Acompanhamento e registro de ocorrências para o Apt ${currentUser.unitNumber || ''} (${currentUser.blockName || 'Torre'})`
              : 'Registro de incidentes, manutenções, barulho e passagem de plantão da portaria'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentUser.role !== 'morador' && onOpenShiftHandover && (
            <button
              onClick={onOpenShiftHandover}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Passagem de Turno</span>
            </button>
          )}

          {!isObserver && (
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Ocorrência</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs: Ocorrências vs Livro de Turno (Hidden for morador) */}
      {currentUser.role !== 'morador' && (
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('occurrences')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'occurrences'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/80 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>Ocorrências ({occurrences.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'shifts'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/80 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Passagens de Turno ({shifts.length})</span>
          </button>
        </div>
      )}

      {/* TAB 1: OCORRÊNCIAS */}
      {activeTab === 'occurrences' && (
        <div className="space-y-4">
          {/* Filter and Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar ocorrências..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-rose-500"
              >
                <option value="all">Todos os Status</option>
                <option value="aberta">Abertas</option>
                <option value="em_analise">Em Análise</option>
                <option value="resolvida">Resolvidas</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-rose-500 capitalize"
              >
                <option value="all">Todas as Categorias</option>
                <option value="barulho">Barulho</option>
                <option value="vaga_garagem">Vaga Garagem</option>
                <option value="danos_patrimonio">Dano Patrimônio</option>
                <option value="animal_estimacao">Animais</option>
                <option value="seguranca">Segurança</option>
                <option value="mudanca_nao_agendada">Mudança</option>
                <option value="vazamento">Vazamento</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          {/* Occurrences List */}
          <div className="space-y-3">
            {filteredOccurrences.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2">
                <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Nenhuma ocorrência encontrada</p>
                <p className="text-xs">Não há registros com os filtros atuais.</p>
              </div>
            ) : (
              filteredOccurrences.map((occ) => {
                const aptNum = occ.apartmentId ? occ.apartmentId.replace('apt-', '').toUpperCase() : 'Área Comum';

                return (
                  <div
                    key={occ.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 hover:border-slate-700 transition-colors shadow space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold uppercase text-white bg-slate-800 border border-slate-700 px-2.5 py-1 rounded">
                          {occ.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-300 font-semibold">{occ.location}</span>
                        <span className="text-[10px] text-slate-400">· Apt {aptNum}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono-tabular text-slate-400">
                          {occ.date} às {occ.time}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                            occ.status === 'aberta'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : occ.status === 'em_analise'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {occ.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {occ.description}
                    </div>

                    {occ.involvedParties && (
                      <p className="text-[11px] text-slate-400">
                        Envolvidos: <strong className="text-slate-300">{occ.involvedParties}</strong>
                      </p>
                    )}

                    {occ.actionTaken && (
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-0.5">
                        <span className="font-semibold text-emerald-400 block text-[11px]">
                          Providência / Desfecho Adotado:
                        </span>
                        <p className="text-slate-300">{occ.actionTaken}</p>
                      </div>
                    )}

                    {/* Attached photos */}
                    {occ.photos && occ.photos.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        {occ.photos.map((p, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-700 w-20 h-16 bg-black">
                            <img src={p} alt="Evidência" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer and status changer */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">
                        Registrado por porteiro: <strong className="text-slate-400">{occ.operatorName}</strong>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {occ.status !== 'resolvida' && (
                          <button
                            onClick={() => handleUpdateStatus(occ, 'resolvida')}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-700/60 rounded-lg transition-colors cursor-pointer"
                          >
                            Marcar como Resolvida
                          </button>
                        )}
                        {occ.status === 'aberta' && (
                          <button
                            onClick={() => handleUpdateStatus(occ, 'em_analise')}
                            className="px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-950/50 hover:bg-amber-900 border border-amber-700/60 rounded-lg transition-colors cursor-pointer"
                          >
                            Em Análise
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVRO DE PASSAGEM DE TURNO */}
      {activeTab === 'shifts' && (
        <div className="space-y-4 text-xs">
          {/* Banner de Continuidade de Turno */}
          <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-600/40 rounded-xl p-4 shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Livro Oficial de Passagem de Plantão</h3>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Garante que todas as entradas, encomendas, ocorrências e chaves sejam transmitidas com precisão ao próximo operador.
                </p>
              </div>
            </div>

            {onOpenShiftHandover && (
              <button
                onClick={onOpenShiftHandover}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Nova Passagem de Turno</span>
              </button>
            )}
          </div>

          {/* Lista de Registros de Turno */}
          <div className="space-y-3">
            {shifts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Nenhum registro de turno cadastrado</p>
                <p className="text-xs">Realize a primeira passagem de turno para abrir o livro.</p>
              </div>
            ) : (
              shifts.map((shift, idx) => (
                <div
                  key={shift.id || idx}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded">
                        {shift.shiftTurn}
                      </span>
                      <span className="text-xs text-white font-semibold flex items-center gap-1.5">
                        <span>{shift.operatorName}</span>
                        {shift.handoverTo && (
                          <>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-emerald-400">{shift.handoverTo}</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono-tabular text-slate-400">
                        {shift.startedAt || shift.shiftDate} {shift.endedAt ? `até ${shift.endedAt}` : '(Em andamento)'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                          shift.handoverCompleted
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-sky-950 text-sky-300 border border-sky-800'
                        }`}
                      >
                        {shift.handoverCompleted ? 'Turno Concluído' : 'Turno Ativo'}
                      </span>
                    </div>
                  </div>

                  {/* Observações Gerais */}
                  {shift.generalNotes && (
                    <div className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-bold block mb-1">
                        Observações do Operador:
                      </span>
                      {shift.generalNotes}
                    </div>
                  )}

                  {/* Checklist de Pendências */}
                  {shift.pendencies && shift.pendencies.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-300 block">
                        Checklist de Pendências Repassadas ({shift.pendencies.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {shift.pendencies.map((p) => (
                          <div
                            key={p.id}
                            className={`p-2 rounded border flex items-center gap-2 text-[11px] ${
                              p.resolved
                                ? 'bg-emerald-950/20 border-emerald-900/40 text-slate-400'
                                : 'bg-slate-950 border-slate-800 text-slate-200'
                            }`}
                          >
                            <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${p.resolved ? 'text-emerald-400' : 'text-slate-500'}`} />
                            <span className={`truncate ${p.resolved ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                              {p.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Add Occurrence */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain modal-overlay">
          <form
            onSubmit={handleCreateOccurrence}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col my-auto max-h-[calc(100dvh-2rem)] overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0 sticky top-0 z-20">
              <h3 className="text-sm font-semibold text-white">Registrar Nova Ocorrência</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1 overscroll-contain">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {currentUser.role === 'morador' ? (
                <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                    Unidade do Relator
                  </span>
                  <p className="text-white font-bold">
                    Apt {currentUser.unitNumber || '101'} · {currentUser.blockName || 'Torre A'}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Morador(a): {currentUser.name}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Tipo de Ocorrência *</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as OccurrenceType)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="barulho">Barulho / Som Alto</option>
                      <option value="vaga_garagem">Vaga de Garagem</option>
                      <option value="danos_patrimonio">Dano ao Patrimônio</option>
                      <option value="animal_estimacao">Animais de Estimação</option>
                      <option value="seguranca">Segurança / Acesso Suspeito</option>
                      <option value="mudanca_nao_agendada">Mudança Sem Agendamento</option>
                      <option value="vazamento">Vazamento / Manutenção</option>
                      <option value="outros">Outros Incidentes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Status Inicial</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Occurrence['status'])}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="aberta">Aberta</option>
                      <option value="em_analise">Em Análise</option>
                      <option value="resolvida">Resolvida na Hora</option>
                    </select>
                  </div>
                </div>
              )}

              {currentUser.role === 'morador' && (
                <div>
                  <label className="block text-slate-300 mb-1">Tipo de Ocorrência *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as OccurrenceType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="barulho">Barulho / Som Alto Fora do Horário</option>
                    <option value="vaga_garagem">Vaga de Garagem Obstruída / Ocupada</option>
                    <option value="danos_patrimonio">Dano ao Patrimônio / Área Comum</option>
                    <option value="animal_estimacao">Animais de Estimação Soltos / Sujeira</option>
                    <option value="seguranca">Segurança / Movimento Suspeito</option>
                    <option value="vazamento">Vazamento / Problema Hidráulico / Manutenção</option>
                    <option value="outros">Outros Incidentes</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1">Local da Ocorrência *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Garagem Subsolo 1, Corredor do 4º andar, Piscina ou Hall Social"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              {currentUser.role !== 'morador' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Bloco Envolvido</label>
                    <select
                      value={selectedBlockId}
                      onChange={(e) => setSelectedBlockId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="">Área Comum (Sem Bloco)</option>
                      {blocks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Apartamento Envolvido</label>
                    <select
                      value={selectedAptId}
                      onChange={(e) => setSelectedAptId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="">Nenhum / Área Geral</option>
                      {apartments
                        .filter((a) => !selectedBlockId || a.blockId === selectedBlockId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            Apt {a.number}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1">Pessoas ou Unidades Envolvidas</label>
                <input
                  type="text"
                  placeholder="Ex: Morador do 402B e prestador da Net"
                  value={involvedParties}
                  onChange={(e) => setInvolvedParties(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Descrição dos Fatos *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Descreva com detalhes o que aconteceu, horários e pessoas que relataram..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              {currentUser.role !== 'morador' && (
                <div>
                  <label className="block text-slate-300 mb-1">Ação Tomada / Desfecho Imediato</label>
                  <input
                    type="text"
                    placeholder="Ex: Interfonei para o apto 402B solicitando cessar o barulho, som desligado às 23h15."
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              )}

              {/* Photo evidence */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300">Evidências Fotográficas ({attachedPhotos.length})</label>
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Fotografar (Câmera Traseira)</span>
                  </button>
                </div>

                {attachedPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attachedPhotos.map((photo, i) => (
                      <div key={i} className="relative w-16 h-16 rounded border border-slate-700 overflow-hidden group">
                        <img src={photo} alt="Evidência" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setAttachedPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-red-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end gap-2 text-xs shrink-0 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold cursor-pointer"
              >
                Salvar no Livro de Ocorrências
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCaptureModal
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={(photo) => {
            setAttachedPhotos((prev) => [...prev, photo]);
            setShowCamera(false);
          }}
          title="Fotografar Evidência da Ocorrência"
          defaultFacingMode="environment"
        />
      )}
    </div>
  );
};
