import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Building,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  Eye,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Contractor, ContractorType, Block, Apartment, Resident } from '../types';
import { WhatsAppPayload } from '../services/whatsapp';

interface ContractorsViewProps {
  onTriggerWhatsApp: (payload: WhatsAppPayload) => void;
  onFastCheckIn: (name: string, type: 'prestador', aptId: string, blockId: string, doc: string) => void;
}

export const ContractorsView: React.FC<ContractorsViewProps> = ({
  onTriggerWhatsApp,
  onFastCheckIn,
}) => {
  const currentUser = storage.getCurrentUser();
  const isObserver = currentUser.role === 'admin';
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Contractor Form State
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState<ContractorType>('manutencao');
  const [selectedBlockId, setSelectedBlockId] = useState('bloco-a');
  const [selectedAptId, setSelectedAptId] = useState('apt-101a');
  const [authorizationType, setAuthorizationType] = useState<'pontual' | 'recorrente'>('pontual');
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const refreshData = () => {
    setContractors(storage.getContractors());
    setBlocks(storage.getBlocks());
    setApartments(storage.getApartments());
    setResidents(storage.getResidents());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  const filteredContractors = contractors.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.document.includes(searchQuery) ||
      c.serviceType.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateContractor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !company) {
      alert('Nome e empresa são obrigatórios.');
      return;
    }

    const hostResident = residents.find((r) => r.apartmentId === selectedAptId && r.isMainResident) || residents.find((r) => r.apartmentId === selectedAptId);

    const newCont: Contractor = {
      id: `cont-${Date.now()}`,
      name,
      document,
      company,
      phone,
      serviceType,
      apartmentId: selectedAptId,
      blockId: selectedBlockId,
      responsibleResidentId: hostResident?.id,
      responsibleResidentName: hostResident?.name || 'Morador Titular',
      authorizationType,
      validFrom,
      validUntil,
      notes,
    };

    storage.saveContractor(newCont);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Prestadores de Serviço</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Consulta e liberação de técnicos e prestadores autorizados.
          </p>
        </div>

        {isObserver ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-950/80 border border-teal-700/60 text-teal-300 rounded-lg text-xs font-semibold shrink-0">
            <Eye className="w-4 h-4 text-teal-400" />
            <span>Modo Observador (Visualização Síndico/ADM)</span>
          </div>
        ) : (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Prestador</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por nome do técnico, empresa, documento ou serviço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Contractors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContractors.map((cont) => {
          const aptNum = cont.apartmentId.replace('apt-', '').toUpperCase();
          const block = blocks.find((b) => b.id === cont.blockId);

          return (
            <div
              key={cont.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-white text-xs leading-tight">{cont.name}</h4>
                    <span className="text-[11px] text-teal-400 font-medium">{cont.company}</span>
                  </div>

                  <span className="text-xs font-mono font-bold text-white bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                    Apt {aptNum}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                  <p>Serviço: <strong className="text-slate-200 capitalize">{cont.serviceType.replace('_', ' ')}</strong></p>
                  <p>Documento: <span className="font-mono text-slate-300">{cont.document}</span></p>
                  <p>Morador Responsável: <span className="text-slate-300">{cont.responsibleResidentName}</span></p>
                  <p>Validade: <span className="font-mono text-slate-300">{cont.validFrom} até {cont.validUntil}</span></p>
                  {cont.notes && <p className="text-[10px] text-slate-500">{cont.notes}</p>}
                </div>

                <div className="mt-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      cont.authorizationType === 'recorrente'
                        ? 'text-teal-300 bg-teal-950/40 border border-teal-800/60'
                        : 'text-sky-300 bg-sky-950/40 border border-sky-800/60'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {cont.authorizationType === 'recorrente' ? 'Autorização Recorrente' : 'Acesso Pontual'}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    const hostResident = residents.find((r) => r.apartmentId === cont.apartmentId);
                    onTriggerWhatsApp({
                      phone: hostResident ? hostResident.phone : '',
                      residentName: cont.responsibleResidentName || 'Morador(a)',
                      apartmentNumber: aptNum,
                      contractorName: cont.name,
                      company: cont.company,
                      reason: cont.serviceType.replace('_', ' '),
                      templateKey: 'prestador_aguardando',
                    });
                  }}
                  className="flex items-center gap-1 text-xs text-teal-300 hover:text-teal-200 font-semibold"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Avisar Morador</span>
                </button>

                {isObserver ? (
                  <span className="text-[10px] text-slate-500 font-mono italic">Observador</span>
                ) : (
                  <button
                    onClick={() => onFastCheckIn(cont.name, 'prestador', cont.apartmentId, cont.blockId, cont.document)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                  >
                    <span>Liberar Entrada</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateContractor}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Cadastrar Prestador de Serviço</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nome do Profissional *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do prestador"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Empresa / Terceirizada *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Vivo Fibra, Hidráulica Express"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Serviço</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as ContractorType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="eletricista">Eletricista</option>
                    <option value="encanador">Encanador / Hidráulica</option>
                    <option value="tecnico_internet">Técnico de Internet / Fibra</option>
                    <option value="tv_cabo">TV a Cabo / Telecom</option>
                    <option value="manutencao">Manutenção Geral</option>
                    <option value="obras">Obras / Reforma</option>
                    <option value="limpeza">Limpeza / Diarista</option>
                    <option value="jardinagem">Jardinagem / Piscina</option>
                    <option value="empresa_terceirizada">Empresa Terceirizada</option>
                    <option value="outro">Outro Serviço</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Documento (RG / CPF)</label>
                  <input
                    type="text"
                    placeholder="RG ou CPF"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500 font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bloco / Torre</label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.identification})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Apartamento Responsável *</label>
                  <select
                    value={selectedAptId}
                    onChange={(e) => setSelectedAptId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    {apartments
                      .filter((a) => !selectedBlockId || a.blockId === selectedBlockId)
                      .map((apt) => (
                        <option key={apt.id} value={apt.id}>
                          Apt {apt.number}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Autorização</label>
                  <select
                    value={authorizationType}
                    onChange={(e) => setAuthorizationType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="pontual">Pontual (Apenas Hoje)</option>
                    <option value="recorrente">Recorrente (Diarista / Contrato)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Válido Até</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500 font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observações / Escopo do Serviço</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Troca de fiação, reparo hidráulico..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
              >
                Salvar Prestador
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
