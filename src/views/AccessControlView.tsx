import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  LogOut,
  Camera,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Car,
  User,
  Wrench,
  BadgeCheck,
  Phone,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { storage } from '../services/storage';
import { AccessLog, AccessStatus, PersonType, Block, Apartment, Resident } from '../types';
import { CameraCaptureModal } from '../components/CameraCaptureModal';

interface AccessControlViewProps {
  onTriggerWhatsApp?: (payload: { phone: string; residentName: string; visitorName?: string }) => void;
}

export const AccessControlView: React.FC<AccessControlViewProps> = ({ onTriggerWhatsApp }) => {
  const currentUser = storage.getCurrentUser();
  const isObserver = currentUser.role === 'admin';
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // New entry form state
  const [personName, setPersonName] = useState('');
  const [personType, setPersonType] = useState<PersonType>('visitante');
  const [document, setDocument] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('bloco-a');
  const [selectedAptId, setSelectedAptId] = useState('apt-101a');
  const [purpose, setPurpose] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [authorizationMethod, setAuthorizationMethod] = useState<'interfone' | 'whatsapp' | 'presencial' | 'previa' | 'portaria'>('interfone');
  const [authorizedByName, setAuthorizedByName] = useState('');
  const [status, setStatus] = useState<AccessStatus>('dentro');
  const [notes, setNotes] = useState('');

  const refreshData = () => {
    setLogs(storage.getAccessLogs());
    setBlocks(storage.getBlocks());
    setApartments(storage.getApartments());
    setResidents(storage.getResidents());
  };

  const applyApartment = (aptId: string, blockId?: string) => {
    setSelectedAptId(aptId);
    if (blockId) setSelectedBlockId(blockId);

    const aptResidents = storage.getResidents().filter((r) => r.apartmentId === aptId && r.active);
    if (aptResidents.length > 0) {
      const primaryRes =
        aptResidents.find((r) => r.isNotificationContact) ||
        aptResidents.find((r) => r.isMainResident) ||
        aptResidents[0];
      setAuthorizedByName(primaryRes.name);
    }
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (showNewEntryModal) {
      const allApts = storage.getApartments();
      const current = allApts.find((a) => a.id === selectedAptId) || allApts[0];
      if (current) {
        applyApartment(current.id, current.blockId);
      }
    }
  }, [showNewEntryModal]);

  const handleBlockChange = (newBlockId: string) => {
    setSelectedBlockId(newBlockId);
    const blockApts = storage.getApartments().filter((a) => a.blockId === newBlockId);
    if (blockApts.length > 0) {
      applyApartment(blockApts[0].id, newBlockId);
    }
  };

  const handleAptChange = (newAptId: string) => {
    const apt = storage.getApartments().find((a) => a.id === newAptId);
    applyApartment(newAptId, apt?.blockId || selectedBlockId);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.document && log.document.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.vehiclePlate && log.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.apartmentId && log.apartmentId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesType = filterType === 'all' || log.personType === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !purpose) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const entryTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const user = storage.getCurrentUser();

    const newLog: AccessLog = {
      id: `acc-${Date.now()}`,
      personName,
      personType,
      document,
      apartmentId: selectedAptId || undefined,
      blockId: selectedBlockId || undefined,
      purpose,
      vehiclePlate: vehiclePlate ? vehiclePlate.toUpperCase() : undefined,
      authorizationMethod,
      authorizedByName: authorizedByName || 'Portaria',
      entryTime,
      status,
      operatorName: user.name,
      notes,
      photoUrl: capturedPhoto || undefined,
    };

    storage.saveAccessLog(newLog);
    setShowNewEntryModal(false);
    resetForm();
  };

  const resetForm = () => {
    setPersonName('');
    setDocument('');
    setPurpose('');
    setVehiclePlate('');
    setNotes('');
    setCapturedPhoto(null);
    setStatus('dentro');
  };

  const handleRegisterExit = (log: AccessLog) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const exitTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const updated: AccessLog = {
      ...log,
      exitTime,
      status: 'saiu',
    };
    storage.saveAccessLog(updated);
  };

  const handleUpdateStatus = (log: AccessLog, newStatus: AccessStatus) => {
    const updated: AccessLog = {
      ...log,
      status: newStatus,
    };
    storage.saveAccessLog(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Controle de Acesso</h2>
          </div>
        </div>

        {isObserver ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 rounded-lg text-xs font-semibold shrink-0">
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>Modo Observador</span>
          </div>
        ) : (
          <button
            onClick={() => setShowNewEntryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Entrada</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, documento, placa ou apartamento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="dentro">Dentro do Condomínio</option>
            <option value="aguardando_autorizacao">Aguardando Autorização</option>
            <option value="saiu">Já Saíram</option>
            <option value="recusado">Recusados</option>
            <option value="cancelado">Cancelados</option>
          </select>

          {/* Person Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">Todos os Tipos</option>
            <option value="morador">Morador</option>
            <option value="visitante">Visitante</option>
            <option value="prestador">Prestador</option>
            <option value="agente_publico">Agente Público</option>
            <option value="entregador">Entregador</option>
          </select>
        </div>
      </div>

      {/* Access Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Pessoa / Tipo</th>
                <th className="py-3 px-4">Destino (Apt / Bloco)</th>
                <th className="py-3 px-4">Motivo / Placa</th>
                <th className="py-3 px-4">Entrada / Saída</th>
                <th className="py-3 px-4">Autorização</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Nenhum registro de acesso encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const aptNum = log.apartmentId ? log.apartmentId.replace('apt-', '').toUpperCase() : 'Geral';
                  return (
                    <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                      {/* Person info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {log.photoUrl ? (
                            <img
                              src={log.photoUrl}
                              alt={log.personName}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                              {log.personType === 'visitante' && <Users className="w-4 h-4 text-purple-400" />}
                              {log.personType === 'prestador' && <Wrench className="w-4 h-4 text-teal-400" />}
                              {log.personType === 'agente_publico' && <BadgeCheck className="w-4 h-4 text-amber-400" />}
                              {log.personType === 'morador' && <User className="w-4 h-4 text-emerald-400" />}
                              {log.personType === 'entregador' && <Users className="w-4 h-4 text-sky-400" />}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-white block">{log.personName}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {log.document || 'Sem documento'} · <span className="capitalize">{log.personType}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-white">Apt {aptNum}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {log.blockId ? (log.blockId === 'bloco-a' ? 'Torre Acácia' : 'Torre Jacarandá') : 'Área Comum'}
                        </span>
                      </td>

                      {/* Purpose & Vehicle */}
                      <td className="py-3 px-4">
                        <span className="text-slate-200 block truncate max-w-[200px]">{log.purpose}</span>
                        {log.vehiclePlate && (
                          <span className="inline-block mt-0.5 text-[10px] font-mono font-bold bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-sky-300">
                            🚗 {log.vehiclePlate}
                          </span>
                        )}
                      </td>

                      {/* Timestamps */}
                      <td className="py-3 px-4 font-mono-tabular">
                        <div className="text-slate-200">Entrada: {log.entryTime.slice(11)}</div>
                        <div className="text-[10px] text-slate-500">
                          {log.exitTime ? `Saída: ${log.exitTime.slice(11)}` : 'Ainda no local'}
                        </div>
                      </td>

                      {/* Authorization */}
                      <td className="py-3 px-4 text-[11px]">
                        <span className="text-slate-200 block">{log.authorizedByName || 'Portaria'}</span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          Via {log.authorizationMethod || 'portaria'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {log.status === 'dentro' && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold text-xs bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            No condomínio
                          </span>
                        )}
                        {log.status === 'aguardando_autorizacao' && (
                          <span className="inline-flex items-center gap-1 text-amber-300 font-medium text-xs bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-400" />
                            Aguardando
                          </span>
                        )}
                        {log.status === 'saiu' && (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                            Saiu
                          </span>
                        )}
                        {log.status === 'recusado' && (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-xs">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            Recusado
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isObserver ? (
                            <span className="text-[10px] text-slate-500 font-mono italic">Observador</span>
                          ) : (
                            <>
                              {log.status === 'aguardando_autorizacao' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(log, 'dentro')}
                                    className="px-2 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800 hover:bg-emerald-900 rounded transition-colors"
                                  >
                                    Liberar
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(log, 'recusado')}
                                    className="px-2 py-1 text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800 hover:bg-rose-900 rounded transition-colors"
                                  >
                                    Recusar
                                  </button>
                                </>
                              )}

                              {log.status === 'dentro' && (
                                <button
                                  onClick={() => handleRegisterExit(log)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/60 rounded-lg transition-colors"
                                  title="Registrar saída do condomínio"
                                >
                                  <LogOut className="w-3.5 h-3.5" />
                                  <span>Dar Saída</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Access Entry Modal */}
      {showNewEntryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateEntry}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Registrar Entrada / Acesso</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewEntryModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Pessoa *</label>
                  <select
                    value={personType}
                    onChange={(e) => setPersonType(e.target.value as PersonType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="visitante">Visitante</option>
                    <option value="prestador">Prestador de Serviço</option>
                    <option value="morador">Morador</option>
                    <option value="agente_publico">Agente Público (Polícia, Correios...)</option>
                    <option value="entregador">Entregador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status Imediato *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AccessStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="dentro">Dentro do Condomínio (Liberado)</option>
                    <option value="aguardando_autorizacao">Aguardando Autorização Morador</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome da pessoa"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Documento (RG / CPF)</label>
                  <input
                    type="text"
                    placeholder="RG 00.000.000-0 ou CPF"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Placa do Veículo (se houver)</label>
                  <input
                    type="text"
                    placeholder="ABC1D23"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono-tabular"
                  />
                </div>
              </div>

              {/* Apartment and Block Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bloco / Torre</label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => handleBlockChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.identification})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Apartamento</label>
                  <select
                    value={selectedAptId}
                    onChange={(e) => handleAptChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
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

              {/* Auto-identified resident banner for this apartment */}
              {(() => {
                const currentResidents = storage.getResidents().filter((r) => r.apartmentId === selectedAptId && r.active);
                if (currentResidents.length === 0) return null;
                const primary = currentResidents.find((r) => r.name === authorizedByName) || currentResidents[0];
                return (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <div>
                        <span className="text-[11px] text-emerald-400 font-semibold block">
                          Morador Responsável Preenchido:
                        </span>
                        <span className="text-white font-bold">{primary.name}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                          {primary.phone || primary.whatsapp}
                        </span>
                      </div>
                    </div>

                    {onTriggerWhatsApp && (primary.phone || primary.whatsapp) && (
                      <button
                        type="button"
                        onClick={() =>
                          onTriggerWhatsApp({
                            phone: primary.whatsapp || primary.phone,
                            residentName: primary.name,
                            visitorName: personName || 'Pessoa na portaria',
                          })
                        }
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Avisar Morador</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Motivo / Finalidade do Acesso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Visita social, reparo de vazamento, entrega..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Forma de Autorização</label>
                  <select
                    value={authorizationMethod}
                    onChange={(e) => setAuthorizationMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="interfone">Interfone</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="previa">Autorização Prévia Cadastrada</option>
                    <option value="presencial">Presencial (Morador desceu)</option>
                    <option value="portaria">Critério da Portaria</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Quem Autorizou</label>
                  <input
                    type="text"
                    placeholder="Nome do morador autorizador"
                    value={authorizedByName}
                    onChange={(e) => setAuthorizedByName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Photo capture trigger */}
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="font-semibold text-white block">Foto do Visitante / Documento</span>
                    <span className="text-[11px] text-slate-400">
                      {capturedPhoto ? 'Foto anexada com sucesso' : 'Opcional (Recomendado para prestadores)'}
                    </span>
                  </div>
                </div>

                {capturedPhoto ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={capturedPhoto}
                      alt="Captura"
                      className="w-8 h-8 rounded object-cover border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setCapturedPhoto(null)}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Capturar
                  </button>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewEntryModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
              >
                Registrar Entrada
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(img) => setCapturedPhoto(img)}
        title="Capturar Foto do Visitante ou Documento"
      />
    </div>
  );
};
