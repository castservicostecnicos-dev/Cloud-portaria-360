import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Key,
  CheckCircle2,
  XCircle,
  Search,
  Clock,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  X,
  Shield,
  Users,
} from 'lucide-react';
import { storage } from '../services/storage';
import {
  ClientCondo,
  User,
  CondoWorkScale,
  WORK_SCALE_CONFIG,
  calculateShiftsForScale,
  getWorkScaleSummary,
} from '../types';

interface DevMasterViewProps {
  onEnterCondoDemo?: (condoId: string) => void;
  onOpenWhatsApp?: (payload: { phone: string; message: string; residentName: string; aptNumber: string; block: string }) => void;
  initialTab?: string;
}

export const DevMasterView: React.FC<DevMasterViewProps> = () => {
  const [condos, setCondos] = useState<ClientCondo[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCondo, setEditingCondo] = useState<ClientCondo | null>(null);
  const [resetPasswordCondo, setResetPasswordCondo] = useState<ClientCondo | null>(null);
  const [condoToDelete, setCondoToDelete] = useState<ClientCondo | null>(null);

  // Form Fields - Condomínio
  const [condoName, setCondoName] = useState('');
  const [condoCnpj, setCondoCnpj] = useState('');
  const [condoAddress, setCondoAddress] = useState('');
  const [condoCity, setCondoCity] = useState('São Paulo');
  const [condoState, setCondoState] = useState('SP');
  const [condoBlocks, setCondoBlocks] = useState(2);
  const [condoApts, setCondoApts] = useState(40);
  const [condoWorkScale, setCondoWorkScale] = useState<CondoWorkScale>('8h_3turnos');
  const [condoWorkScaleStartHour, setCondoWorkScaleStartHour] = useState('06:00');

  // Form Fields - ADM Predial
  const [admName, setAdmName] = useState('');
  const [admEmail, setAdmEmail] = useState('');
  const [admPhone, setAdmPhone] = useState('');
  const [admPassword, setAdmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password Recovery Modal State
  const [selectedUserToReset, setSelectedUserToReset] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Manage Porteiros per Condo Modal State
  const [viewingPorteirosCondo, setViewingPorteirosCondo] = useState<ClientCondo | null>(null);
  const [isAddingPorteiro, setIsAddingPorteiro] = useState(false);
  const [newPorteiroName, setNewPorteiroName] = useState('');
  const [newPorteiroEmail, setNewPorteiroEmail] = useState('');
  const [newPorteiroPassword, setNewPorteiroPassword] = useState('portaria123');
  const [newPorteiroShift, setNewPorteiroShift] = useState('');

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const refreshData = () => {
    setCondos(storage.getClientCondos());
    setAllUsers(storage.getAllUsers());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  const triggerFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setCondoName('');
    setCondoCnpj('');
    setCondoAddress('');
    setCondoCity('São Paulo');
    setCondoState('SP');
    setCondoBlocks(2);
    setCondoApts(40);
    setCondoWorkScale('8h_3turnos');
    setCondoWorkScaleStartHour('06:00');

    setAdmName('');
    setAdmEmail('');
    setAdmPhone('');
    setAdmPassword(`adm@${Math.floor(1000 + Math.random() * 9000)}`);
    setShowPassword(false);

    setIsCreateModalOpen(true);
  };

  // Open Edit / Register Modal
  const handleOpenEditModal = (c: ClientCondo) => {
    setEditingCondo(c);
    setCondoName(c.name);
    setCondoCnpj(c.cnpj || '');
    setCondoAddress(c.address || '');
    setCondoCity(c.city || 'São Paulo');
    setCondoState(c.state || 'SP');
    setCondoBlocks(c.blocksCount || 1);
    setCondoApts(c.aptsCount || 20);
    setCondoWorkScale(c.workScale || '8h_3turnos');
    setCondoWorkScaleStartHour(c.workScaleStartHour || '06:00');

    setAdmName(c.admPredial?.name || '');
    setAdmEmail(c.admPredial?.email || '');
    setAdmPhone(c.admPredial?.phone || '');
    setAdmPassword(c.admPredial?.password || 'senha123');
    setShowPassword(false);
  };

  // Save New Condominium + ADM Predial
  const handleSaveNewCondo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!condoName.trim()) {
      triggerFeedback('Informe o nome do condomínio.', 'error');
      return;
    }
    if (!admName.trim() || !admEmail.trim()) {
      triggerFeedback('Informe o nome e o e-mail do ADM Predial.', 'error');
      return;
    }

    const startHour = condoWorkScaleStartHour.trim() || '06:00';

    // 1. Create Condominium with configured shift entry hour and loaded notes
    const created = storage.quickCreateCondo({
      name: condoName.trim(),
      cnpj: condoCnpj.trim() || undefined,
      address: condoAddress.trim() || 'Acesso Principal',
      city: condoCity.trim(),
      state: condoState.trim(),
      blocksCount: Number(condoBlocks) || 1,
      aptsCount: Number(condoApts) || 20,
      workScale: condoWorkScale,
      workScaleStartHour: startHour,
      workScaleNotes: getWorkScaleSummary(condoWorkScale, startHour),
    });

    // 2. Create ADM Predial user and link
    const finalPassword = admPassword.trim() || `adm@${Math.floor(1000 + Math.random() * 9000)}`;
    storage.saveAdmPredial({
      name: admName.trim(),
      email: admEmail.trim().toLowerCase(),
      password: finalPassword,
      phone: admPhone.trim(),
      cargo: 'ADM Predial / Síndico',
      active: true,
      condoIds: [created.id],
    });

    setIsCreateModalOpen(false);
    refreshData();
    triggerFeedback(`Condomínio "${created.name}" e ADM Predial cadastrados com sucesso!`);
  };

  // Save Edit Condominium
  const handleSaveEditCondo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCondo) return;
    if (!condoName.trim()) {
      triggerFeedback('Informe o nome do condomínio.', 'error');
      return;
    }

    const startHour = condoWorkScaleStartHour.trim() || '06:00';

    const updatedCondo: ClientCondo = {
      ...editingCondo,
      name: condoName.trim(),
      cnpj: condoCnpj.trim() || undefined,
      address: condoAddress.trim(),
      city: condoCity.trim(),
      state: condoState.trim(),
      blocksCount: Number(condoBlocks) || 1,
      aptsCount: Number(condoApts) || 20,
      workScale: condoWorkScale,
      workScaleStartHour: startHour,
      workScaleNotes: getWorkScaleSummary(condoWorkScale, startHour),
      admPredial: {
        id: editingCondo.admPredial?.id || `user-adm-${Date.now()}`,
        name: admName.trim(),
        email: admEmail.trim().toLowerCase(),
        password: admPassword.trim() || editingCondo.admPredial?.password || 'senha123',
        phone: admPhone.trim(),
        cargo: editingCondo.admPredial?.cargo || 'ADM Predial / Síndico',
      },
    };

    storage.saveClientCondo(updatedCondo);

    // Sync ADM Predial user in users table
    storage.saveAdmPredial({
      id: updatedCondo.admPredial.id,
      name: updatedCondo.admPredial.name,
      email: updatedCondo.admPredial.email,
      password: updatedCondo.admPredial.password,
      phone: updatedCondo.admPredial.phone,
      cargo: updatedCondo.admPredial.cargo,
      active: updatedCondo.active,
      condoIds: [updatedCondo.id],
    });

    setEditingCondo(null);
    refreshData();
    triggerFeedback(`Dados do condomínio "${updatedCondo.name}" atualizados com sucesso!`);
  };

  // Toggle Condominium Active / Inactive
  const handleToggleCondo = (c: ClientCondo) => {
    const res = storage.toggleClientCondoStatus(c.id);
    refreshData();
    triggerFeedback(
      `Condomínio "${c.name}" foi ${res.active ? 'ATIVADO' : 'DESATIVADO'}.`
    );
  };

  // Open Password Recovery Modal
  const handleOpenResetPassword = (c: ClientCondo) => {
    setResetPasswordCondo(c);
    const condoUsers = storage.getAllUsers().filter(
      (u) => u.condoId === c.id || (c.admPredial && u.email.toLowerCase() === c.admPredial.email.toLowerCase())
    );
    const targetUser = condoUsers.find((u) => u.role === 'admin') || condoUsers[0] || null;
    setSelectedUserToReset(targetUser);
    setNewPasswordInput(targetUser?.password || c.admPredial?.password || 'senha123');
    setCopiedKey(false);
  };

  // Save New Password
  const handleSaveResetPassword = () => {
    if (!resetPasswordCondo || !newPasswordInput.trim()) return;

    if (selectedUserToReset) {
      storage.resetUserPassword(selectedUserToReset.id, newPasswordInput.trim());
    } else {
      const admId = resetPasswordCondo.admPredial?.id;
      if (admId) {
        storage.resetAdmPassword(admId, newPasswordInput.trim());
      } else {
        const updated = {
          ...resetPasswordCondo,
          admPredial: {
            ...resetPasswordCondo.admPredial,
            password: newPasswordInput.trim(),
          },
        };
        storage.saveClientCondo(updated);
      }
    }

    refreshData();
    setResetPasswordCondo(null);
    triggerFeedback('Senha do usuário atualizada com sucesso pelo Dev Master!');
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPasswordInput);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Delete Condominium with strict porteiro revocation
  const handleConfirmDelete = () => {
    if (!condoToDelete) return;
    const porteirosCount = allUsers.filter((u) => u.role === 'porteiro' && u.condoId === condoToDelete.id).length;
    storage.deleteClientCondo(condoToDelete.id);
    refreshData();
    triggerFeedback(`Condomínio "${condoToDelete.name}" excluído. ${porteirosCount} porteiro(s) vinculado(s) excluído(s) e acesso cancelado imediatamente.`);
    if (viewingPorteirosCondo?.id === condoToDelete.id) {
      setViewingPorteirosCondo(null);
    }
    setCondoToDelete(null);
  };

  // Create Porteiro strictly tied to viewing condo
  const handleCreatePorteiroForCondo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingPorteirosCondo || !newPorteiroName.trim() || !newPorteiroEmail.trim()) return;

    try {
      const newPorteiro: User = {
        id: `user-porteiro-${Date.now()}`,
        name: newPorteiroName.trim(),
        email: newPorteiroEmail.trim().toLowerCase(),
        password: newPorteiroPassword.trim() || 'portaria123',
        role: 'porteiro',
        phone: '',
        active: true,
        condoId: viewingPorteirosCondo.id,
        condoName: viewingPorteirosCondo.name,
        shiftTurn: newPorteiroShift.trim() || '1º Turno (06h às 14h)',
        permissions: {
          canManageUsers: false,
          canConfigCondo: false,
          canDeleteRecords: false,
          canViewReports: true,
          canManageSettings: false,
        },
      };

      storage.saveUser(newPorteiro);
      refreshData();
      setNewPorteiroName('');
      setNewPorteiroEmail('');
      setNewPorteiroPassword('portaria123');
      setNewPorteiroShift('');
      setIsAddingPorteiro(false);
      triggerFeedback(`Porteiro ${newPorteiro.name} cadastrado com vínculo obrigatório ao condomínio "${viewingPorteirosCondo.name}".`);
    } catch (err: any) {
      triggerFeedback(err.message || 'Erro ao cadastrar porteiro', 'error');
    }
  };

  // Delete Porteiro
  const handleDeletePorteiro = (porteiroId: string, porteiroName: string) => {
    storage.deleteUser(porteiroId);
    refreshData();
    triggerFeedback(`Porteiro ${porteiroName} excluído do sistema.`);
  };

  // Filtered condos
  const filteredCondos = condos.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.cnpj && c.cnpj.includes(searchQuery)) ||
      (c.admPredial?.name && c.admPredial.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.admPredial?.email && c.admPredial.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'ativo'
        ? c.active
        : !c.active;

    return matchesSearch && matchesStatus;
  });

  const totalCondos = condos.length;
  const activeCondos = condos.filter((c) => c.active).length;
  const inactiveCondos = totalCondos - activeCondos;
  const totalPorteiros = allUsers.filter((u) => u.role === 'porteiro').length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/80'
              : 'bg-rose-950/90 text-rose-300 border border-rose-700/80'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header & Compact Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 border border-purple-500/40">
              DEV Master
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Gestão de Condomínios
            </h2>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Condomínio</span>
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Condomínios</span>
            <span className="text-lg font-bold text-white font-mono">{totalCondos}</span>
          </div>
          <Building2 className="w-4 h-4 text-slate-500" />
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Ativos</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{activeCondos}</span>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Desativados</span>
            <span className="text-lg font-bold text-rose-400 font-mono">{inactiveCondos}</span>
          </div>
          <XCircle className="w-4 h-4 text-rose-500" />
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">Porteiros no Total</span>
            <span className="text-lg font-bold text-sky-400 font-mono">{totalPorteiros}</span>
          </div>
          <Shield className="w-4 h-4 text-sky-500" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por condomínio, CNPJ ou ADM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs w-full sm:w-auto justify-end">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({totalCondos})
          </button>
          <button
            onClick={() => setStatusFilter('ativo')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              statusFilter === 'ativo' ? 'bg-emerald-950 text-emerald-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ativos ({activeCondos})
          </button>
          <button
            onClick={() => setStatusFilter('inativo')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              statusFilter === 'inativo' ? 'bg-rose-950 text-rose-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Desativados ({inactiveCondos})
          </button>
        </div>
      </div>

      {/* Condos List */}
      <div className="space-y-3">
        {filteredCondos.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">Nenhum condomínio encontrado com os filtros selecionados.</p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Condomínio</span>
            </button>
          </div>
        ) : (
          filteredCondos.map((c) => {
            const condoPorteiros = allUsers.filter((u) => u.role === 'porteiro' && u.condoId === c.id);

            return (
              <div
                key={c.id}
                className={`bg-slate-900 border rounded-xl p-4 transition-all ${
                  c.active ? 'border-slate-800 hover:border-slate-700' : 'border-rose-900/40 bg-slate-950/60 opacity-80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Condo & ADM details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        c.active ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white truncate">{c.name}</h3>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            c.active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                              : 'bg-rose-950 text-rose-300 border border-rose-800/80'
                          }`}
                        >
                          {c.active ? 'Ativo' : 'Desativado'}
                        </span>
                        <span
                          title={c.workScaleNotes || getWorkScaleSummary(c.workScale || '8h_3turnos', c.workScaleStartHour || '06:00')}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700 flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3 text-sky-400" />
                          <span>
                            {c.workScale === '12x36'
                              ? `12x36 (Início: ${c.workScaleStartHour || '06:00'})`
                              : `8h 3 Turnos (Início: ${c.workScaleStartHour || '06:00'})`}
                          </span>
                        </span>
                        {c.cnpj && (
                          <span className="text-[10px] font-mono text-slate-400">
                            CNPJ: {c.cnpj}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                        <span>{c.address}, {c.city} - {c.state}</span>
                        <span>• {c.blocksCount} bloco(s), {c.aptsCount} unidades</span>
                      </div>

                      {/* ADM Predial Info */}
                      <div className="mt-2 pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="text-slate-300 font-medium flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                          <span>ADM Predial: <strong className="text-white">{c.admPredial?.name || 'Não atribuído'}</strong></span>
                        </span>

                        {c.admPredial?.email && (
                          <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{c.admPredial.email}</span>
                          </span>
                        )}

                        {c.admPredial?.phone && (
                          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{c.admPredial.phone}</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setViewingPorteirosCondo(c);
                            setIsAddingPorteiro(false);
                          }}
                          className="text-sky-300 hover:text-white text-[11px] font-medium bg-sky-950/60 hover:bg-sky-900/60 px-2.5 py-1 rounded-lg border border-sky-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Visualizar e gerenciar porteiros vinculados a este condomínio"
                        >
                          <Shield className="w-3 h-3 text-sky-400" />
                          <span>{condoPorteiros.length} porteiro(s) vinculado(s)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dedicated Actions: Ativar/Desativar, Registrar/Editar, Recuperar Senha, Excluir */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end">
                    {/* 1. Ativar / Desativar */}
                    <button
                      type="button"
                      onClick={() => handleToggleCondo(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                        c.active
                          ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                      }`}
                      title={c.active ? 'Desativar condomínio' : 'Ativar condomínio'}
                    >
                      {c.active ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Desativar</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ativar</span>
                        </>
                      )}
                    </button>

                    {/* 2. Recuperar Senha */}
                    <button
                      type="button"
                      onClick={() => handleOpenResetPassword(c)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Recuperar ou redefinir senha do ADM Predial"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Recuperar Senha</span>
                    </button>

                    {/* 3. Registrar / Editar Condomínio */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(c)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-sky-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Registrar / Editar dados do condomínio e ADM"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Registrar / Editar</span>
                    </button>

                    {/* 4. Excluir Condomínio */}
                    <button
                      type="button"
                      onClick={() => setCondoToDelete(c)}
                      className="p-1.5 bg-slate-950 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 rounded-lg transition-colors"
                      title="Excluir condomínio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: CADASTRAR CONDOMÍNIO (DEV CRIA CONDOMÍNIO + ADM PREDIAL) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveNewCondo}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Cadastrar Novo Condomínio</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Seção 1: Condomínio */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                  1. Dados do Condomínio
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Nome do Condomínio *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Residencial Solar das Palmeiras"
                      value={condoName}
                      onChange={(e) => setCondoName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">CNPJ</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={condoCnpj}
                      onChange={(e) => setCondoCnpj(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Modelo de Escala *</label>
                    <select
                      value={condoWorkScale}
                      onChange={(e) => setCondoWorkScale(e.target.value as CondoWorkScale)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="8h_3turnos">Escala de 8h (3 Turnos de 8 horas)</option>
                      <option value="12x36">Escala 12h x 36h (Diurno e Noturno)</option>
                    </select>
                  </div>
                </div>

                {/* Configuração de Horário de Entrada do 1º Turno com cálculo automático */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-slate-200 text-xs font-bold">
                        {condoWorkScale === '12x36'
                          ? 'Horário de Entrada da Manhã (Diurno)'
                          : 'Horário de Entrada do 1º Turno (Manhã)'}
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <input
                        type="time"
                        value={condoWorkScaleStartHour}
                        onChange={(e) => setCondoWorkScaleStartHour(e.target.value || '06:00')}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex gap-1">
                        {['06:00', '07:00', '08:00'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCondoWorkScaleStartHour(preset)}
                            className={`px-2 py-1 text-[11px] rounded border transition-colors font-mono ${
                              condoWorkScaleStartHour === preset
                                ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            {preset.split(':')[0]}h
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Turnos gerados automaticamente */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Horários Carregados Automaticamente (Entrada e Saída):</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {calculateShiftsForScale(condoWorkScale, condoWorkScaleStartHour)
                        .filter((s) => s.id !== '8h_folguista' && s.id !== '12x36_folguista')
                        .map((s) => (
                          <div
                            key={s.id}
                            className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">{s.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                                {condoWorkScale === '12x36' ? '12 horas' : '8 horas'}
                              </span>
                            </div>
                            <div className="mt-1 text-emerald-400 font-mono font-bold text-xs">
                              {s.startHour} às {s.endHour}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800 flex justify-between">
                              <span>Entrada: <strong className="text-slate-300 font-mono">{s.startHour}</strong></span>
                              <span>Saída: <strong className="text-slate-300 font-mono">{s.endHour}</strong></span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Endereço</label>
                  <input
                    type="text"
                    placeholder="Rua, número, bairro"
                    value={condoAddress}
                    onChange={(e) => setCondoAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Cidade</label>
                    <input
                      type="text"
                      value={condoCity}
                      onChange={(e) => setCondoCity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={condoState}
                      onChange={(e) => setCondoState(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Blocos</label>
                    <input
                      type="number"
                      min={1}
                      value={condoBlocks}
                      onChange={(e) => setCondoBlocks(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Aptos</label>
                    <input
                      type="number"
                      min={1}
                      value={condoApts}
                      onChange={(e) => setCondoApts(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: ADM Predial */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                  2. ADM Predial Responsável
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nome do ADM Predial *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Menezes"
                      value={admName}
                      onChange={(e) => setAdmName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">E-mail de Login *</label>
                    <input
                      type="email"
                      required
                      placeholder="carlos@predial.com"
                      value={admEmail}
                      onChange={(e) => setAdmEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={admPhone}
                      onChange={(e) => setAdmPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Senha Inicial de Acesso *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={admPassword}
                        onChange={(e) => setAdmPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3.5 py-2 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
              >
                Cadastrar Condomínio & ADM Predial
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDITAR / REGISTRAR CONDOMÍNIO & ADM */}
      {editingCondo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditCondo}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Registrar / Editar Condomínio</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCondo(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider block">
                  1. Dados do Condomínio
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1">Nome do Condomínio *</label>
                    <input
                      type="text"
                      required
                      value={condoName}
                      onChange={(e) => setCondoName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={condoCnpj}
                      onChange={(e) => setCondoCnpj(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Modelo de Escala *</label>
                    <select
                      value={condoWorkScale}
                      onChange={(e) => setCondoWorkScale(e.target.value as CondoWorkScale)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="8h_3turnos">Escala de 8h (3 Turnos de 8 horas)</option>
                      <option value="12x36">Escala 12h x 36h (Diurno e Noturno)</option>
                    </select>
                  </div>
                </div>

                {/* Configuração de Horário de Entrada do 1º Turno com cálculo automático */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-slate-200 text-xs font-bold">
                        {condoWorkScale === '12x36'
                          ? 'Horário de Entrada da Manhã (Diurno)'
                          : 'Horário de Entrada do 1º Turno (Manhã)'}
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <input
                        type="time"
                        value={condoWorkScaleStartHour}
                        onChange={(e) => setCondoWorkScaleStartHour(e.target.value || '06:00')}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                      />
                      <div className="flex gap-1">
                        {['06:00', '07:00', '08:00'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCondoWorkScaleStartHour(preset)}
                            className={`px-2 py-1 text-[11px] rounded border transition-colors font-mono ${
                              condoWorkScaleStartHour === preset
                                ? 'bg-sky-600 text-white border-sky-500 font-bold'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            {preset.split(':')[0]}h
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Turnos gerados automaticamente */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-2">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>Horários Carregados Automaticamente (Entrada e Saída):</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {calculateShiftsForScale(condoWorkScale, condoWorkScaleStartHour)
                        .filter((s) => s.id !== '8h_folguista' && s.id !== '12x36_folguista')
                        .map((s) => (
                          <div
                            key={s.id}
                            className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">{s.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-mono">
                                {condoWorkScale === '12x36' ? '12 horas' : '8 horas'}
                              </span>
                            </div>
                            <div className="mt-1 text-sky-400 font-mono font-bold text-xs">
                              {s.startHour} às {s.endHour}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800 flex justify-between">
                              <span>Entrada: <strong className="text-slate-300 font-mono">{s.startHour}</strong></span>
                              <span>Saída: <strong className="text-slate-300 font-mono">{s.endHour}</strong></span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Endereço</label>
                  <input
                    type="text"
                    value={condoAddress}
                    onChange={(e) => setCondoAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Cidade</label>
                    <input
                      type="text"
                      value={condoCity}
                      onChange={(e) => setCondoCity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={condoState}
                      onChange={(e) => setCondoState(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Blocos</label>
                    <input
                      type="number"
                      min={1}
                      value={condoBlocks}
                      onChange={(e) => setCondoBlocks(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Aptos</label>
                    <input
                      type="number"
                      min={1}
                      value={condoApts}
                      onChange={(e) => setCondoApts(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                  2. ADM Predial Responsável
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nome do ADM Predial *</label>
                    <input
                      type="text"
                      required
                      value={admName}
                      onChange={(e) => setAdmName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">E-mail de Login *</label>
                    <input
                      type="email"
                      required
                      value={admEmail}
                      onChange={(e) => setAdmEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Telefone</label>
                    <input
                      type="text"
                      value={admPhone}
                      onChange={(e) => setAdmPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Senha de Acesso</label>
                    <input
                      type="text"
                      value={admPassword}
                      onChange={(e) => setAdmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCondo(null)}
                className="px-3.5 py-2 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: RECUPERAR / REDEFINIR SENHA (DEV MASTER) */}
      {resetPasswordCondo && (() => {
        const condoUsers = allUsers.filter(
          (u) => u.condoId === resetPasswordCondo.id || (resetPasswordCondo.admPredial && u.email.toLowerCase() === resetPasswordCondo.admPredial.email.toLowerCase())
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Recuperar Senha de Usuários (Dev)</h3>
                </div>
                <button
                  onClick={() => setResetPasswordCondo(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs space-y-3">
                <p className="text-slate-300">
                  Condomínio: <strong className="text-white">{resetPasswordCondo.name}</strong>
                </p>

                {condoUsers.length > 0 && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Selecionar Usuário para Recuperação</label>
                    <select
                      value={selectedUserToReset?.id || ''}
                      onChange={(e) => {
                        const found = condoUsers.find((u) => u.id === e.target.value);
                        if (found) {
                          setSelectedUserToReset(found);
                          setNewPasswordInput(found.password || 'senha123');
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    >
                      {condoUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'admin' ? 'ADM Predial' : 'Porteiro'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Senha de Acesso de {selectedUserToReset ? selectedUserToReset.name : 'Usuário'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-mono text-sm font-bold focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700"
                      title="Copiar senha"
                    >
                      {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedKey ? 'Copiada' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setNewPasswordInput(`adm@${Math.floor(100000 + Math.random() * 900000)}`)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 underline"
                >
                  Gerar nova senha aleatória
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setResetPasswordCondo(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSaveResetPassword}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-md"
              >
                Salvar Nova Senha
              </button>
            </div>
          </div>
        </div>
      );
    })()}

      {/* MODAL: EXCLUIR CONDOMÍNIO (REVOGAÇÃO IMEDIATA DE PORTEIROS) */}
      {condoToDelete && (() => {
        const porteirosLinked = allUsers.filter((u) => u.role === 'porteiro' && u.condoId === condoToDelete.id);
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-rose-800/80 rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-white">Excluir Condomínio</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Tem certeza que deseja excluir o condomínio <strong className="text-white">"{condoToDelete.name}"</strong>?
              </p>

              <p className="text-xs text-rose-400">
                A exclusão removerá o condomínio e revogará imediatamente o acesso de {porteirosLinked.length} porteiro(s) vinculado(s).
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCondoToDelete(null)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Excluir Condomínio e Revogar Porteiros
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: GERENCIAR PORTEIROS DO CONDOMÍNIO SELECIONADO */}
      {viewingPorteirosCondo && (() => {
        const porteirosOfThisCondo = allUsers.filter((u) => u.role === 'porteiro' && u.condoId === viewingPorteirosCondo.id);
        const condoShifts = calculateShiftsForScale(viewingPorteirosCondo.workScale || '8h_3turnos', viewingPorteirosCondo.workScaleStartHour || '06:00');

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Porteiros Vinculados: {viewingPorteirosCondo.name}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewingPorteirosCondo(null);
                    setIsAddingPorteiro(false);
                  }}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto text-xs">
                {/* List of Porteiros */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">
                      Porteiros Cadastrados ({porteirosOfThisCondo.length})
                    </span>
                    {!isAddingPorteiro && (
                      <button
                        type="button"
                        onClick={() => setIsAddingPorteiro(true)}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Novo Porteiro</span>
                      </button>
                    )}
                  </div>

                  {porteirosOfThisCondo.length === 0 ? (
                    <div className="p-6 text-center bg-slate-950 rounded-lg border border-slate-800">
                      <p className="text-slate-400">Nenhum porteiro cadastrado neste condomínio.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                      {porteirosOfThisCondo.map((p) => (
                        <div key={p.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-900/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white truncate">{p.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${p.active ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                                {p.active ? 'Ativo' : 'Bloqueado'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                              <span>E-mail: <strong className="text-slate-300 font-mono">{p.email}</strong></span>
                              {p.shiftTurn && (
                                <span className="text-sky-300 font-mono text-[10px]">
                                  🕒 {p.shiftTurn}
                                </span>
                              )}
                              <span>Senha: <strong className="text-amber-300 font-mono">{p.password || '••••••••'}</strong></span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePorteiro(p.id, p.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg border border-slate-800 hover:border-rose-800 transition-colors cursor-pointer"
                            title="Excluir porteiro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline form to add porteiro to this condo */}
                {isAddingPorteiro && (
                  <form onSubmit={handleCreatePorteiroForCondo} className="p-4 bg-slate-950 border border-sky-800/80 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-semibold text-white text-xs">Novo Porteiro para {viewingPorteirosCondo.name}</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingPorteiro(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={newPorteiroName}
                          onChange={(e) => setNewPorteiroName(e.target.value)}
                          placeholder="Ex: Carlos Eduardo"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">E-mail de Acesso *</label>
                        <input
                          type="email"
                          required
                          value={newPorteiroEmail}
                          onChange={(e) => setNewPorteiroEmail(e.target.value)}
                          placeholder="carlos.portaria@condominio.com"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Senha Inicial</label>
                        <input
                          type="text"
                          value={newPorteiroPassword}
                          onChange={(e) => setNewPorteiroPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Turno de Trabalho</label>
                        <select
                          value={newPorteiroShift}
                          onChange={(e) => setNewPorteiroShift(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                        >
                          <option value="">Selecione o Turno</option>
                          {condoShifts.map((s) => (
                            <option key={s.id} value={s.label}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingPorteiro(false)}
                        className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        Cadastrar Porteiro
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setViewingPorteirosCondo(null);
                    setIsAddingPorteiro(false);
                  }}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
