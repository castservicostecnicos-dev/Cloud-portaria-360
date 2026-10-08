import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Car,
  Package,
  Shield,
  AlertTriangle,
  Clock,
  Phone,
  MessageSquare,
  Search,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Eye,
} from 'lucide-react';
import { storage } from '../services/storage';
import {
  Block,
  Apartment,
  Resident,
  Vehicle,
  Authorization,
  DeliveryItem,
  AccessLog,
  Occurrence,
} from '../types';
import { WhatsAppPayload } from '../services/whatsapp';

interface ApartmentsViewProps {
  onTriggerWhatsApp: (payload: WhatsAppPayload) => void;
  targetApartmentId?: string;
}

export const ApartmentsView: React.FC<ApartmentsViewProps> = ({
  onTriggerWhatsApp,
  targetApartmentId,
}) => {
  const currentUser = storage.getCurrentUser();
  const isObserver = currentUser.role === 'admin';
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);

  const [selectedBlockId, setSelectedBlockId] = useState<string>('bloco-a');
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('apt-101a');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFichaTab, setActiveFichaTab] = useState<
    'moradores' | 'veiculos' | 'autorizacoes' | 'encomendas' | 'acessos' | 'ocorrencias'
  >('moradores');

  // Modals for full editing
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [blockName, setBlockName] = useState('');
  const [blockIdentification, setBlockIdentification] = useState('');
  const [blockAptsCount, setBlockAptsCount] = useState(20);
  const [blockActive, setBlockActive] = useState(true);
  const [blockNotes, setBlockNotes] = useState('');

  const [showAptModal, setShowAptModal] = useState(false);
  const [editingApt, setEditingApt] = useState<Apartment | null>(null);
  const [aptNumber, setAptNumber] = useState('');
  const [aptBlockId, setAptBlockId] = useState('bloco-a');
  const [aptFloor, setAptFloor] = useState(1);
  const [aptStatus, setAptStatus] = useState<Apartment['status']>('ocupado');
  const [aptNotes, setAptNotes] = useState('');

  const [showResidentModal, setShowResidentModal] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [resName, setResName] = useState('');
  const [resCpf, setResCpf] = useState('');
  const [resRg, setResRg] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resEmail, setResEmail] = useState('');
  const [resType, setResType] = useState<Resident['type']>('proprietario');
  const [resMain, setResMain] = useState(false);
  const [resNotification, setResNotification] = useState(true);
  const [resCanPackages, setResCanPackages] = useState(true);
  const [resCanVisitors, setResCanVisitors] = useState(true);
  const [resCanContractors, setResCanContractors] = useState(true);

  const refreshData = () => {
    setBlocks(storage.getBlocks());
    setApartments(storage.getApartments());
    setResidents(storage.getResidents());
    setVehicles(storage.getVehicles());
    setAuthorizations(storage.getAuthorizations());
    setDeliveries(storage.getDeliveries());
    setAccessLogs(storage.getAccessLogs());
    setOccurrences(storage.getOccurrences());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (targetApartmentId) {
      const targetApt = storage.getApartments().find((a) => a.id === targetApartmentId);
      if (targetApt) {
        setSelectedBlockId(targetApt.blockId);
        setSelectedApartmentId(targetApt.id);
      }
    }
  }, [targetApartmentId]);

  const currentApt = apartments.find((a) => a.id === selectedApartmentId);
  const currentBlock = blocks.find((b) => b.id === (currentApt ? currentApt.blockId : selectedBlockId));

  // Linked items for selected apartment
  const aptResidents = residents.filter((r) => r.apartmentId === selectedApartmentId);
  const aptVehicles = vehicles.filter((v) => v.apartmentId === selectedApartmentId);
  const aptAuthorizations = authorizations.filter((a) => a.apartmentId === selectedApartmentId);
  const aptDeliveries = deliveries.filter((d) => d.apartmentId === selectedApartmentId);
  const aptAccessLogs = accessLogs.filter((l) => l.apartmentId === selectedApartmentId);
  const aptOccurrences = occurrences.filter((o) => o.apartmentId === selectedApartmentId);

  // Filtered apts in selected block
  const displayedApts = apartments
    .filter((a) => a.blockId === selectedBlockId)
    .filter((a) => {
      if (!searchQuery) return true;
      const res = residents.filter((r) => r.apartmentId === a.id);
      const resNames = res.map((r) => r.name.toLowerCase()).join(' ');
      return a.number.includes(searchQuery) || resNames.includes(searchQuery.toLowerCase());
    });

  // Block Modal Handlers
  const handleOpenNewBlock = () => {
    setEditingBlock(null);
    setBlockName('');
    setBlockIdentification('');
    setBlockAptsCount(20);
    setBlockActive(true);
    setBlockNotes('');
    setShowBlockModal(true);
  };

  const handleOpenEditBlock = (b: Block) => {
    setEditingBlock(b);
    setBlockName(b.name);
    setBlockIdentification(b.identification);
    setBlockAptsCount(b.aptsCount);
    setBlockActive(b.active);
    setBlockNotes(b.notes || '');
    setShowBlockModal(true);
  };

  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockName || !blockIdentification) {
      alert('Nome e identificação do bloco são obrigatórios.');
      return;
    }

    const b: Block = {
      id: editingBlock ? editingBlock.id : `bloco-${Date.now()}`,
      name: blockName,
      identification: blockIdentification,
      aptsCount: Number(blockAptsCount) || 1,
      active: blockActive,
      notes: blockNotes,
    };

    storage.saveBlock(b);
    setShowBlockModal(false);
    setSelectedBlockId(b.id);
  };

  const handleDeleteBlock = (b: Block) => {
    const aptsInBlock = apartments.filter((a) => a.blockId === b.id);
    if (aptsInBlock.length > 0) {
      alert(`Não é possível excluir o bloco "${b.name}" pois ele possui ${aptsInBlock.length} apartamento(s) cadastrado(s). Exclua ou mova as unidades primeiro.`);
      return;
    }
    if (confirm(`Deseja realmente excluir o bloco "${b.name} (${b.identification})"?`)) {
      storage.deleteBlock(b.id);
      const remaining = blocks.filter((item) => item.id !== b.id);
      if (remaining.length > 0) {
        setSelectedBlockId(remaining[0].id);
      }
    }
  };

  // Apartment Modal Handlers
  const handleOpenNewApt = () => {
    setEditingApt(null);
    setAptNumber('');
    setAptBlockId(selectedBlockId);
    setAptFloor(1);
    setAptStatus('ocupado');
    setAptNotes('');
    setShowAptModal(true);
  };

  const handleOpenEditApt = (apt: Apartment) => {
    setEditingApt(apt);
    setAptNumber(apt.number);
    setAptBlockId(apt.blockId);
    setAptFloor(apt.floor);
    setAptStatus(apt.status);
    setAptNotes(apt.notes || '');
    setShowAptModal(true);
  };

  const handleSaveApt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aptNumber) {
      alert('Número do apartamento é obrigatório.');
      return;
    }

    const apt: Apartment = {
      id: editingApt ? editingApt.id : `apt-${Date.now()}`,
      number: aptNumber.trim(),
      blockId: aptBlockId,
      floor: Number(aptFloor) || 1,
      status: aptStatus,
      notes: aptNotes,
    };

    storage.saveApartment(apt);
    setShowAptModal(false);
    setSelectedBlockId(apt.blockId);
    setSelectedApartmentId(apt.id);
  };

  const handleDeleteApt = (apt: Apartment) => {
    if (confirm(`Deseja realmente excluir a ficha do Apartamento ${apt.number}? Moradores vinculados precisarão ser remanejados.`)) {
      storage.deleteApartment(apt.id);
      const remaining = apartments.filter((a) => a.id !== apt.id && a.blockId === apt.blockId);
      if (remaining.length > 0) {
        setSelectedApartmentId(remaining[0].id);
      }
    }
  };

  // Resident Modal Handlers inside Apartment View
  const handleOpenNewResidentForApt = () => {
    if (!currentApt) return;
    setEditingResident(null);
    setResName('');
    setResCpf('');
    setResRg('');
    setResPhone('');
    setResEmail('');
    setResType('proprietario');
    setResMain(aptResidents.length === 0);
    setResNotification(true);
    setResCanPackages(true);
    setResCanVisitors(true);
    setResCanContractors(true);
    setShowResidentModal(true);
  };

  const handleOpenEditResident = (r: Resident) => {
    setEditingResident(r);
    setResName(r.name);
    setResCpf(r.cpf);
    setResRg(r.rg || '');
    setResPhone(r.phone);
    setResEmail(r.email);
    setResType(r.type);
    setResMain(r.isMainResident);
    setResNotification(r.isNotificationContact);
    setResCanPackages(r.canReceivePackages);
    setResCanVisitors(r.canAuthorizeVisitors);
    setResCanContractors(r.canAuthorizeContractors);
    setShowResidentModal(true);
  };

  const handleSaveResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName || !resPhone || !currentApt) {
      alert('Nome e telefone são obrigatórios.');
      return;
    }

    const res: Resident = {
      id: editingResident ? editingResident.id : `res-${Date.now()}`,
      name: resName.trim(),
      cpf: resCpf || '000.000.000-00',
      rg: resRg,
      phone: resPhone,
      whatsapp: resPhone.replace(/\D/g, ''),
      email: resEmail || 'morador@solardaspalmeiras.com.br',
      apartmentId: currentApt.id,
      blockId: currentApt.blockId,
      type: resType,
      active: true,
      isMainResident: resMain,
      isNotificationContact: resNotification,
      canReceivePackages: resCanPackages,
      canAuthorizeVisitors: resCanVisitors,
      canAuthorizeContractors: resCanContractors,
    };

    storage.saveResident(res);
    setShowResidentModal(false);
  };

  const handleDeleteResident = (r: Resident) => {
    if (confirm(`Deseja remover o morador "${r.name}" deste apartamento?`)) {
      storage.deleteResident(r.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Ficha do Apartamento & Blocos
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Consulta cadastral por apartamento, moradores, veículos e histórico.
          </p>
        </div>

        {/* Block Selector & Block Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded-lg gap-1">
            {blocks.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setSelectedBlockId(b.id);
                  const firstAptInBlock = apartments.find((a) => a.blockId === b.id);
                  if (firstAptInBlock) setSelectedApartmentId(firstAptInBlock.id);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  selectedBlockId === b.id
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {b.name} ({b.identification})
              </button>
            ))}
          </div>

          {isObserver ? (
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 rounded-lg text-xs font-semibold shrink-0">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Modo Observador</span>
            </div>
          ) : (
            <>
              {currentBlock && (
                <button
                  onClick={() => handleOpenEditBlock(currentBlock)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                  title="Editar dados deste bloco/torre"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Editar Bloco</span>
                </button>
              )}

              <button
                onClick={handleOpenNewBlock}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                title="Adicionar novo bloco ou torre ao condomínio"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Bloco</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main 2-column layout: Left = Apt List, Right = Ficha Completa */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Apartment Units Picker (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow flex flex-col">
          <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar nº apt ou morador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono-tabular"
              />
            </div>
            {!isObserver && (
              <button
                onClick={handleOpenNewApt}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 shadow-sm"
                title="Cadastrar novo apartamento neste bloco"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Apt</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-800/80 max-h-[600px] overflow-y-auto">
            {displayedApts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                <p>Nenhum apartamento encontrado neste bloco.</p>
                <button
                  onClick={handleOpenNewApt}
                  className="px-3 py-1 bg-slate-800 text-emerald-400 border border-slate-700 rounded text-xs"
                >
                  + Cadastrar 1º Apartamento
                </button>
              </div>
            ) : (
              displayedApts.map((apt) => {
                const isSelected = apt.id === selectedApartmentId;
                const aptRes = residents.filter((r) => r.apartmentId === apt.id);
                const mainRes = aptRes.find((r) => r.isMainResident) || aptRes[0];

                return (
                  <div
                    key={apt.id}
                    onClick={() => setSelectedApartmentId(apt.id)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-slate-800 border-l-4 border-emerald-500'
                        : 'hover:bg-slate-850/60'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">
                          Apt {apt.number}
                        </span>
                        {apt.status === 'vago' ? (
                          <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 rounded">
                            Vago
                          </span>
                        ) : apt.status === 'reforma' ? (
                          <span className="text-[10px] text-sky-400 bg-sky-950/60 border border-sky-800/60 px-1.5 rounded">
                            Reforma
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 rounded">
                            Ocupado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {mainRes ? `${mainRes.name} (${mainRes.type})` : 'Sem morador cadastrado'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {apt.floor}º Andar · {aptRes.length} morador(es)
                      </p>
                    </div>

                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Ficha Completa do Apartamento (lg:col-span-8) */}
        {currentApt ? (
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow space-y-4 p-5">
            {/* Top Unit Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-white tracking-tight font-mono-tabular">
                    Apartamento {currentApt.number}
                  </h3>
                  <span className="text-xs bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 px-2.5 py-0.5 rounded-full font-medium">
                    {currentBlock?.name} ({currentBlock?.identification})
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Pavimento: <strong>{currentApt.floor}º Andar</strong> · Status:{' '}
                  <strong className="capitalize text-slate-200">{currentApt.status}</strong>
                  {currentApt.notes && ` · Obs: ${currentApt.notes}`}
                </p>
              </div>

              {/* Action Buttons for Apartment */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleOpenEditApt(currentApt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Editar dados cadastrais deste apartamento"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Editar Apartamento</span>
                </button>

                <button
                  onClick={() => handleDeleteApt(currentApt)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Excluir apartamento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Notify Main Resident Button */}
                {aptResidents.length > 0 && (
                  <button
                    onClick={() => {
                      const main = aptResidents.find((r) => r.isNotificationContact) || aptResidents[0];
                      onTriggerWhatsApp({
                        phone: main.phone,
                        residentName: main.name,
                        apartmentNumber: currentApt.number,
                        blockName: currentBlock?.name,
                        templateKey: 'aviso_geral',
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            {/* Ficha Subtabs */}
            <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-medium">
              <button
                onClick={() => setActiveFichaTab('moradores')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeFichaTab === 'moradores'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Moradores ({aptResidents.length})</span>
              </button>

              <button
                onClick={() => setActiveFichaTab('veiculos')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeFichaTab === 'veiculos'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Car className="w-3.5 h-3.5 text-sky-400" />
                <span>Veículos & Vagas ({aptVehicles.length})</span>
              </button>

              <button
                onClick={() => setActiveFichaTab('autorizacoes')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeFichaTab === 'autorizacoes'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Autorizações ({aptAuthorizations.length})</span>
              </button>

              <button
                onClick={() => setActiveFichaTab('encomendas')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeFichaTab === 'encomendas'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span>Encomendas ({aptDeliveries.length})</span>
              </button>

              <button
                onClick={() => setActiveFichaTab('acessos')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeFichaTab === 'acessos'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>Histórico Acessos ({aptAccessLogs.length})</span>
              </button>

              <button
                onClick={() => setActiveFichaTab('ocorrencias')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeFichaTab === 'ocorrencias'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Ocorrências ({aptOccurrences.length})</span>
              </button>
            </div>

            {/* TAB CONTENT */}

            {/* TAB 1: Moradores (With Full Edit / Delete / Add for this unit) */}
            {activeFichaTab === 'moradores' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Moradores cadastrados para o Apartamento {currentApt.number}:
                  </span>
                  <button
                    onClick={handleOpenNewResidentForApt}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Morador nesta Unidade</span>
                  </button>
                </div>

                {aptResidents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                    <p>Nenhum morador cadastrado neste apartamento.</p>
                    <button
                      onClick={handleOpenNewResidentForApt}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold"
                    >
                      Cadastrar Primeiro Morador
                    </button>
                  </div>
                ) : (
                  aptResidents.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{r.name}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.2 rounded capitalize">
                            {r.type}
                          </span>
                          {r.isMainResident && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.2 rounded font-medium">
                              Titular / Principal
                            </span>
                          )}
                          {r.isNotificationContact && (
                            <span className="text-[10px] text-sky-400 bg-sky-950/60 border border-sky-800 px-1.5 py-0.2 rounded">
                              Contato WhatsApp
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          CPF: {r.cpf} {r.rg && `· RG: ${r.rg}`}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Tel/WhatsApp: <strong className="text-slate-200">{r.phone}</strong> · E-mail: {r.email}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                          <span>{r.canReceivePackages ? '✓ Recebe encomendas' : '✗ Não recebe'}</span>
                          <span>{r.canAuthorizeVisitors ? '✓ Autoriza visitas' : '✗ Sem permissão'}</span>
                          <span>{r.canAuthorizeContractors ? '✓ Autoriza serviços' : '✗ Sem permissão'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleOpenEditResident(r)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Editar dados deste morador (corrigir nome, telefone, etc.)"
                        >
                          <Edit2 className="w-3 h-3 text-emerald-400" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => handleDeleteResident(r)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Excluir este morador para cadastrar outro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            onTriggerWhatsApp({
                              phone: r.phone,
                              residentName: r.name,
                              apartmentNumber: currentApt.number,
                              blockName: currentBlock?.name,
                              templateKey: 'aviso_geral',
                            });
                          }}
                          className="p-1.5 text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Enviar WhatsApp direto ao morador"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: Veículos */}
            {activeFichaTab === 'veiculos' && (
              <div className="space-y-3">
                {aptVehicles.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Nenhum veículo vinculado a este apartamento.</p>
                ) : (
                  aptVehicles.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-white">{v.plate}</span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {v.type} · {v.color}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {v.brand} {v.model}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Proprietário: {v.ownerName} · Vaga: {v.parkingSpace || 'Rotativa'}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                        Vaga: {v.parkingSpace || 'S/N'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: Autorizações */}
            {activeFichaTab === 'autorizacoes' && (
              <div className="space-y-3">
                {aptAuthorizations.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Nenhuma autorização prévia cadastrada.</p>
                ) : (
                  aptAuthorizations.map((auth) => (
                    <div
                      key={auth.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{auth.authorizedName || (auth as any).personName}</span>
                        <span className="text-[10px] text-purple-400 bg-purple-950/60 border border-purple-800 px-2 py-0.5 rounded capitalize">
                          {auth.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Doc: {auth.document || 'Não informado'} · Válido até:{' '}
                        <strong className="text-slate-200">{auth.endDate || (auth as any).validUntil}</strong>
                      </p>
                      {auth.notes && <p className="text-[10px] text-slate-500">Obs: {auth.notes}</p>}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: Encomendas */}
            {activeFichaTab === 'encomendas' && (
              <div className="space-y-2">
                {aptDeliveries.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Nenhuma encomenda registrada para este apartamento.</p>
                ) : (
                  aptDeliveries.map((del) => (
                    <div
                      key={del.id}
                      className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{del.code}</span>
                          <span className="text-[10px] text-slate-400 capitalize">({del.type})</span>
                        </div>
                        <p className="text-slate-300 text-[11px] mt-0.5">{del.description}</p>
                        <p className="text-[10px] text-slate-500">Destinatário: {del.recipientName}</p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium inline-block capitalize ${
                            del.status === 'retirado'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {del.status.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 font-mono-tabular">
                          {del.receivedAt.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 5: Histórico de Acessos */}
            {activeFichaTab === 'acessos' && (
              <div className="space-y-2">
                {aptAccessLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Nenhum registro de acesso vinculado a esta unidade.</p>
                ) : (
                  aptAccessLogs.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white">{acc.personName}</span>
                        <span className="text-[10px] text-slate-400 ml-2 capitalize">({acc.personType})</span>
                        <p className="text-[11px] text-slate-400">Motivo: {acc.purpose}</p>
                      </div>

                      <div className="text-right font-mono-tabular text-[11px]">
                        <span className="text-slate-300 block">{acc.entryTime}</span>
                        <span className="text-[10px] text-slate-500">{acc.exitTime ? `Saiu: ${acc.exitTime.slice(11)}` : 'Dentro'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 6: Ocorrências */}
            {activeFichaTab === 'ocorrencias' && (
              <div className="space-y-2">
                {aptOccurrences.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Nenhuma ocorrência registrada para esta unidade.</p>
                ) : (
                  aptOccurrences.map((occ) => (
                    <div
                      key={occ.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white uppercase">{occ.type}</span>
                        <span className="text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded uppercase font-mono">
                          {occ.status}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{occ.description}</p>
                      <p className="text-[10px] text-slate-400">
                        Providência: {occ.actionTaken || 'Em análise pela administração'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-8 p-12 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 text-xs">
            Selecione um apartamento na lista à esquerda para carregar a Ficha Completa.
          </div>
        )}
      </div>

      {/* MODAL 1: CRIAR / EDITAR BLOCO OU TORRE */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBlock}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingBlock ? `Editar Bloco / Torre: ${editingBlock.name}` : 'Cadastrar Novo Bloco / Torre'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome do Bloco *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torre A, Bloco 1, Edifício Jacarandá"
                  value={blockName}
                  onChange={(e) => setBlockName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Identificação / Apelido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torre Acácia, Bloco Leste"
                  value={blockIdentification}
                  onChange={(e) => setBlockIdentification(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Qtd de Apartamentos</label>
                  <input
                    type="number"
                    min="1"
                    value={blockAptsCount}
                    onChange={(e) => setBlockAptsCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status</label>
                  <select
                    value={blockActive ? 'active' : 'inactive'}
                    onChange={(e) => setBlockActive(e.target.value === 'active')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observações</label>
                <input
                  type="text"
                  placeholder="Ex: Bloco residencial com 2 elevadores"
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              {editingBlock ? (
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(editingBlock)}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Bloco</span>
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow"
                >
                  Salvar Bloco
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: CRIAR / EDITAR APARTAMENTO */}
      {showAptModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveApt}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingApt ? `Editar Apartamento: ${editingApt.number}` : 'Cadastrar Novo Apartamento'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAptModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Número da Unidade *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 101, 202A, 1404"
                    value={aptNumber}
                    onChange={(e) => setAptNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono-tabular focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bloco / Torre *</label>
                  <select
                    value={aptBlockId}
                    onChange={(e) => setAptBlockId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.identification})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Andar (Pavimento)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={aptFloor}
                    onChange={(e) => setAptFloor(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status da Unidade</label>
                  <select
                    value={aptStatus}
                    onChange={(e) => setAptStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white capitalize"
                  >
                    <option value="ocupado">Ocupado</option>
                    <option value="vago">Vago</option>
                    <option value="alugado">Alugado</option>
                    <option value="reforma">Em Reforma</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observações da Unidade</label>
                <input
                  type="text"
                  placeholder="Ex: Cobertura duplex, possui 2 vagas de garagem"
                  value={aptNotes}
                  onChange={(e) => setAptNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              {editingApt ? (
                <button
                  type="button"
                  onClick={() => handleDeleteApt(editingApt)}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAptModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow"
                >
                  Salvar Apartamento
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: CRIAR / EDITAR MORADOR VINCULADO AO APARTAMENTO */}
      {showResidentModal && currentApt && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveResident}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingResident
                    ? `Editar Morador: ${editingResident.name}`
                    : `Cadastrar Morador no Apt ${currentApt.number}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResidentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do morador"
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={resCpf}
                    onChange={(e) => setResCpf(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">RG</label>
                  <input
                    type="text"
                    placeholder="RG 00.000.000-0"
                    value={resRg}
                    onChange={(e) => setResRg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98765-4321"
                    value={resPhone}
                    onChange={(e) => setResPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono-tabular focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="morador@email.com"
                    value={resEmail}
                    onChange={(e) => setResEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Vínculo</label>
                  <select
                    value={resType}
                    onChange={(e) => setResType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white capitalize"
                  >
                    <option value="proprietario">Proprietário</option>
                    <option value="inquilino">Inquilino</option>
                    <option value="familiar">Familiar</option>
                    <option value="dependente">Dependente</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Apartamento Vinculado</label>
                  <input
                    type="text"
                    disabled
                    value={`Apt ${currentApt.number} - ${currentBlock?.name}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-400 font-mono-tabular"
                  />
                </div>
              </div>

              {/* Roles & Permissions checkboxes */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <span className="font-semibold text-slate-300 block">Configurações de Autorização:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resMain}
                      onChange={(e) => setResMain(e.target.checked)}
                      className="accent-emerald-600 rounded"
                    />
                    <span>Morador Titular / Principal</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resNotification}
                      onChange={(e) => setResNotification(e.target.checked)}
                      className="accent-emerald-600 rounded"
                    />
                    <span>Contato p/ Avisos WhatsApp</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resCanPackages}
                      onChange={(e) => setResCanPackages(e.target.checked)}
                      className="accent-emerald-600 rounded"
                    />
                    <span>Pode receber encomendas</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resCanVisitors}
                      onChange={(e) => setResCanVisitors(e.target.checked)}
                      className="accent-emerald-600 rounded"
                    />
                    <span>Pode autorizar visitantes</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResidentModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow"
              >
                Salvar Morador
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
