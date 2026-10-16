import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageSquare,
  UserCheck,
  Building,
  Check,
  X,
  Edit2,
  Trash2,
  Eye,
  Key,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Resident, Block, Apartment } from '../types';
import { WhatsAppPayload } from '../services/whatsapp';
import { ResidentInviteModal } from '../components/ResidentInviteModal';

interface ResidentsViewProps {
  onTriggerWhatsApp: (payload: WhatsAppPayload) => void;
}

export const ResidentsView: React.FC<ResidentsViewProps> = ({ onTriggerWhatsApp }) => {
  const currentUser = storage.getCurrentUser();
  const isObserver = currentUser.role === 'admin';
  const [residents, setResidents] = useState<Resident[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBlock, setFilterBlock] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedResidentForInvite, setSelectedResidentForInvite] = useState<Resident | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('bloco-a');
  const [selectedAptId, setSelectedAptId] = useState('apt-101a');
  const [type, setType] = useState<Resident['type']>('proprietario');
  const [isMainResident, setIsMainResident] = useState(false);
  const [isNotificationContact, setIsNotificationContact] = useState(true);
  const [canReceivePackages, setCanReceivePackages] = useState(true);
  const [canAuthorizeVisitors, setCanAuthorizeVisitors] = useState(true);
  const [canAuthorizeContractors, setCanAuthorizeContractors] = useState(true);
  const [notes, setNotes] = useState('');

  const refreshData = () => {
    setResidents(storage.getResidents());
    setBlocks(storage.getBlocks());
    setApartments(storage.getApartments());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  const filteredResidents = residents.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cpf.includes(searchQuery) ||
      r.phone.includes(searchQuery) ||
      r.apartmentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBlock = filterBlock === 'all' || r.blockId === filterBlock;
    return matchesSearch && matchesBlock;
  });

  const handleOpenAdd = () => {
    setEditingResident(null);
    setName('');
    setCpf('');
    setRg('');
    setPhone('');
    setEmail('');
    setType('proprietario');
    setIsMainResident(false);
    setIsNotificationContact(true);
    setCanReceivePackages(true);
    setCanAuthorizeVisitors(true);
    setCanAuthorizeContractors(true);
    setNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (res: Resident) => {
    setEditingResident(res);
    setName(res.name);
    setCpf(res.cpf);
    setRg(res.rg || '');
    setPhone(res.phone);
    setEmail(res.email);
    setSelectedBlockId(res.blockId);
    setSelectedAptId(res.apartmentId);
    setType(res.type);
    setIsMainResident(res.isMainResident);
    setIsNotificationContact(res.isNotificationContact);
    setCanReceivePackages(res.canReceivePackages);
    setCanAuthorizeVisitors(res.canAuthorizeVisitors);
    setCanAuthorizeContractors(res.canAuthorizeContractors);
    setNotes(res.notes || '');
    setShowAddModal(true);
  };

  const handleSaveResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('Nome e telefone são obrigatórios.');
      return;
    }

    const res: Resident = {
      id: editingResident ? editingResident.id : `res-${Date.now()}`,
      name,
      cpf: cpf || '000.000.000-00',
      rg,
      phone,
      whatsapp: phone.replace(/\D/g, ''),
      email: email || 'morador@solardaspalmeiras.com.br',
      apartmentId: selectedAptId,
      blockId: selectedBlockId,
      type,
      active: true,
      isMainResident,
      isNotificationContact,
      canReceivePackages,
      canAuthorizeVisitors,
      canAuthorizeContractors,
      notes,
    };

    storage.saveResident(res);
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir o cadastro deste morador?')) {
      storage.deleteResident(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Moradores</h2>
          </div>
        </div>

        {isObserver ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 rounded-lg text-xs font-semibold shrink-0">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Modo Observador</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedResidentForInvite(null);
                setIsInviteModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Convidar Morador (App)</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Morador</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar moradores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={filterBlock}
          onChange={(e) => setFilterBlock(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
        >
          <option value="all">Todos os Blocos / Torres</option>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.identification})
            </option>
          ))}
        </select>
      </div>

      {/* Residents Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResidents.map((r) => {
          const aptNum = r.apartmentId.replace('apt-', '').toUpperCase();
          const block = blocks.find((b) => b.id === r.blockId);

          return (
            <div
              key={r.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs leading-tight">{r.name}</h4>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {r.type} · {r.isMainResident ? 'Titular' : 'Dependente'}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-white bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                    Apt {aptNum}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                  <p>CPF: <span className="font-mono text-slate-300">{r.cpf}</span></p>
                  <p>Telefone: <span className="text-slate-200 font-medium">{r.phone}</span></p>
                  <p>E-mail: <span className="text-slate-300">{r.email}</span></p>
                  <p>Torre: <span className="text-slate-300">{block?.name || 'Torre A'}</span></p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[10px] text-slate-400">
                  {r.isNotificationContact && (
                    <span className="bg-emerald-950/50 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                      Notificações WhatsApp
                    </span>
                  )}
                  {r.canReceivePackages && (
                    <span className="bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                      Recebe encomendas
                    </span>
                  )}
                  {r.canAuthorizeVisitors && (
                    <span className="bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                      Autoriza visitas
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      onTriggerWhatsApp({
                        phone: r.phone,
                        residentName: r.name,
                        apartmentNumber: aptNum,
                        blockName: block?.name,
                      });
                    }}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedResidentForInvite(r);
                      setIsInviteModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                    title="Convidar morador para acessar o app"
                  >
                    <Key className="w-3 h-3" />
                    <span>Convidar App</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {isObserver ? (
                    <span className="text-[10px] text-slate-500 font-mono italic">Observador</span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="p-1.5 text-slate-400 hover:text-white rounded"
                        title="Editar Morador"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded"
                        title="Excluir Morador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Resident Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain modal-overlay">
          <form
            onSubmit={handleSaveResident}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col my-auto max-h-[calc(100dvh-2rem)] overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0 sticky top-0 z-20">
              <h3 className="text-sm font-semibold text-white">
                {editingResident ? 'Editar Dados do Morador' : 'Novo Cadastro de Morador'}
              </h3>
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
                <label className="block text-slate-300 font-medium mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do morador"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">CPF</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bloco / Torre</label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
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
                  <label className="block text-slate-300 font-medium mb-1">Apartamento *</label>
                  <select
                    value={selectedAptId}
                    onChange={(e) => setSelectedAptId(e.target.value)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Vínculo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="proprietario">Proprietário</option>
                    <option value="inquilino">Inquilino</option>
                    <option value="familiar">Familiar</option>
                    <option value="dependente">Dependente</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Permissions & Roles */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-main"
                    checked={isMainResident}
                    onChange={(e) => setIsMainResident(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <label htmlFor="chk-main" className="text-slate-200">
                    Definir como Morador Principal / Titular da Unidade
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-notif"
                    checked={isNotificationContact}
                    onChange={(e) => setIsNotificationContact(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <label htmlFor="chk-notif" className="text-slate-200">
                    Receber notificações prioritárias da portaria (encomendas, avisos)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-del"
                    checked={canReceivePackages}
                    onChange={(e) => setCanReceivePackages(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <label htmlFor="chk-del" className="text-slate-200">
                    Autorizado a receber encomendas na portaria
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-vis"
                    checked={canAuthorizeVisitors}
                    onChange={(e) => setCanAuthorizeVisitors(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <label htmlFor="chk-vis" className="text-slate-200">
                    Autorizado a liberar visitantes e prestadores
                  </label>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2 shrink-0 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
              >
                Salvar Morador
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resident Invite Modal */}
      <ResidentInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setSelectedResidentForInvite(null);
        }}
        preSelectedResident={selectedResidentForInvite}
        onTriggerWhatsApp={onTriggerWhatsApp}
      />
    </div>
  );
};
