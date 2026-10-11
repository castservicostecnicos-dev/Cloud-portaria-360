import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Building,
  MessageSquare,
  Shield,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  FileText,
  Key,
  Clock,
  Cloud,
  Globe,
  Terminal,
  ExternalLink,
  Layers,
  Server,
  Flame,
  Database,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { storage } from '../services/storage';
import {
  CondoConfig,
  User,
  WhatsAppTemplate,
  AuditLog,
  CondoWorkScale,
  WORK_SCALE_CONFIG,
  calculateShiftsForScale,
  getWorkScaleSummary,
} from '../types';

export const AdminSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'condo' | 'users' | 'templates' | 'logs' | 'backup' | 'cloudflare' | 'firebase'>('condo');
  const [currentUser, setCurrentUser] = useState<User>(storage.getCurrentUser());
  const [condo, setCondo] = useState<CondoConfig>(storage.getCondo());
  const [users, setUsers] = useState<User[]>(storage.getUsers());
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(storage.getWhatsAppTemplates());
  const [logs, setLogs] = useState<AuditLog[]>(storage.getAuditLogs());
  const [selectedCondoFilter, setSelectedCondoFilter] = useState<string>('all');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncStats, setCloudSyncStats] = useState<{ count?: number; message?: string } | null>(null);
  const clientCondos = storage.getClientCondos();

  // Editing state for users
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userRole, setUserRole] = useState<User['role']>('porteiro');
  const [userActive, setUserActive] = useState(true);
  const [userShiftTurn, setUserShiftTurn] = useState('');
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [canConfigCondo, setCanConfigCondo] = useState(false);
  const [canDeleteRecords, setCanDeleteRecords] = useState(false);
  const [canViewReports, setCanViewReports] = useState(true);

  // Template editor modal
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateText, setTemplateText] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');

  // Notification message
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const refreshData = () => {
    setCurrentUser(storage.getCurrentUser());
    setCondo(storage.getCondo());
    setUsers(storage.getUsers());
    setTemplates(storage.getWhatsAppTemplates());
    setLogs(storage.getAuditLogs());
  };

  const displayedUsers =
    currentUser.role === 'dev'
      ? selectedCondoFilter === 'all'
        ? users
        : users.filter((u) => u.condoId === selectedCondoFilter)
      : users.filter((u) => !u.condoId || u.condoId === condo.id);

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleTriggerCloudSync = async () => {
    setIsCloudSyncing(true);
    try {
      const res = await storage.pushAllLocalDataToFirestore();
      setCloudSyncStats({ count: res.count, message: `${res.count} registros sincronizados no Firebase Firestore com sucesso!` });
      showFeedback('Sincronização com Firebase concluída!');
    } catch {
      showFeedback('Erro na sincronização');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleHydrateCloud = async () => {
    setIsCloudSyncing(true);
    try {
      await storage.hydrateFromFirestore();
      refreshData();
      showFeedback('Dados atualizados da nuvem Firebase!');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleSaveCondo = (e: React.FormEvent) => {
    e.preventDefault();
    const startHour = condo.workScaleStartHour?.trim() || '06:00';
    const scale = condo.workScale || '8h_3turnos';
    const updatedCondo: CondoConfig = {
      ...condo,
      workScale: scale,
      workScaleStartHour: startHour,
      workScaleNotes: getWorkScaleSummary(scale, startHour),
    };
    setCondo(updatedCondo);
    storage.saveCondo(updatedCondo);
    showFeedback('Configurações do condomínio e escala de trabalho salvas com sucesso!');
  };

  const handleOpenUserModal = (u?: User) => {
    const shiftsList = calculateShiftsForScale(condo.workScale || '8h_3turnos', condo.workScaleStartHour || '06:00');
    const defaultShift = shiftsList[0]?.label || '';
    if (u) {
      setEditingUser(u);
      setUserName(u.name);
      setUserEmail(u.email);
      setUserPassword(u.password || '');
      setUserPhone(u.phone);
      setUserRole(u.role);
      setUserActive(u.active);
      setUserShiftTurn(u.shiftTurn || defaultShift);
      setCanManageUsers(u.permissions.canManageUsers);
      setCanConfigCondo(u.permissions.canConfigCondo);
      setCanDeleteRecords(u.permissions.canDeleteRecords);
      setCanViewReports(u.permissions.canViewReports);
    } else {
      setEditingUser(null);
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserPhone('');
      setUserRole('porteiro');
      setUserActive(true);
      setUserShiftTurn(defaultShift);
      setCanManageUsers(false);
      setCanConfigCondo(false);
      setCanDeleteRecords(false);
      setCanViewReports(true);
    }
    setShowUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const isDev = userRole === 'dev' || userEmail.trim().toLowerCase() === 'ale11062@gmail.com';
    const updated: User = {
      id: editingUser ? editingUser.id : `user-${Date.now()}`,
      name: userName,
      email: userEmail.trim().toLowerCase(),
      password: userPassword || (isDev ? 'cast@2468' : 'senha123'),
      role: isDev ? 'dev' : userRole,
      phone: userPhone,
      active: userActive,
      condoId: isDev ? undefined : (editingUser?.condoId || condo.id),
      condoName: isDev ? undefined : (editingUser?.condoName || condo.name),
      shiftTurn: userRole === 'porteiro' ? userShiftTurn : undefined,
      permissions: {
        canManageUsers: isDev ? true : canManageUsers,
        canConfigCondo: isDev ? true : canConfigCondo,
        canDeleteRecords: isDev ? true : canDeleteRecords,
        canViewReports: isDev ? true : canViewReports,
        canManageSettings: isDev ? true : canConfigCondo,
      },
    };
    storage.saveUser(updated);
    setShowUserModal(false);
    showFeedback('Usuário salvo com sucesso!');
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Deseja excluir este usuário do sistema?')) {
      storage.deleteUser(id);
      showFeedback('Usuário removido.');
    }
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    storage.saveWhatsAppTemplate({
      ...editingTemplate,
      title: templateTitle,
      templateText,
    });
    setEditingTemplate(null);
    showFeedback('Modelo de mensagem WhatsApp atualizado!');
  };

  const handleExportBackup = () => {
    const jsonStr = storage.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_portaria360_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('Arquivo de backup exportado!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (storage.importBackupJSON(content)) {
        showFeedback('Backup restaurado com sucesso!');
      } else {
        alert('Erro ao carregar arquivo de backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetToFactory = () => {
    if (confirm('ATENÇÃO: Deseja redefinir todo o sistema para os dados de demonstração iniciais? Esta ação substituirá dados atuais.')) {
      storage.resetToInitialSeed();
      showFeedback('Sistema restaurado para o padrão inicial!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Administração & Configurações</h2>
          </div>
        </div>

        {/* Feedback pill */}
        {feedbackMsg && (
          <div className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-semibold animate-pulse">
            ✓ {feedbackMsg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('condo')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'condo' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-3.5 h-3.5 text-emerald-400" />
          <span>Dados do Condomínio</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'users' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span>{currentUser.role === 'admin' ? 'Porteiros & Equipe' : 'Usuários & Permissões'} ({displayedUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'templates' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
          <span>Templates WhatsApp ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'logs' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Log de Auditoria ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'backup' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-rose-400" />
          <span>Backup & Segurança</span>
        </button>

        <button
          onClick={() => setActiveTab('cloudflare')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'cloudflare' ? 'bg-orange-950/40 text-orange-300 border border-orange-500/40 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cloud className="w-3.5 h-3.5 text-orange-400" />
          <span>Cloudflare (Pages & Workers)</span>
        </button>

        <button
          onClick={() => setActiveTab('firebase')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'firebase' ? 'bg-amber-950/50 text-amber-300 border border-amber-600/50 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Banco Cloud (Firebase)</span>
        </button>
      </div>

      {/* TAB 1: DADOS DO CONDOMÍNIO */}
      {activeTab === 'condo' && (
        <form onSubmit={handleSaveCondo} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nome do Condomínio *</label>
              <input
                type="text"
                required
                value={condo.name}
                onChange={(e) => setCondo({ ...condo, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">CNPJ *</label>
              <input
                type="text"
                required
                value={condo.cnpj}
                onChange={(e) => setCondo({ ...condo, cnpj: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">Endereço Completo</label>
              <input
                type="text"
                value={condo.address}
                onChange={(e) => setCondo({ ...condo, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">CEP</label>
              <input
                type="text"
                value={condo.cep}
                onChange={(e) => setCondo({ ...condo, cep: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Cidade</label>
              <input
                type="text"
                value={condo.city}
                onChange={(e) => setCondo({ ...condo, city: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Estado</label>
              <input
                type="text"
                value={condo.state}
                onChange={(e) => setCondo({ ...condo, state: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white uppercase"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Telefone da Portaria</label>
              <input
                type="text"
                value={condo.phone}
                onChange={(e) => setCondo({ ...condo, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">E-mail Administrativo</label>
              <input
                type="email"
                value={condo.email}
                onChange={(e) => setCondo({ ...condo, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
          </div>

          {/* Escala de Trabalho dos Porteiros */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span>Escala de Trabalho Aplicada à Portaria</span>
                </h4>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${
                (condo.workScale || '8h_3turnos') === '12x36'
                  ? 'bg-sky-950 text-sky-300 border-sky-800'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}>
                {(condo.workScale || '8h_3turnos') === '12x36'
                  ? `12h x 36h Ativa (Início ${condo.workScaleStartHour || '06:00'})`
                  : `8h (3 Turnos: Início ${condo.workScaleStartHour || '06:00'})`}
              </span>
            </div>

            {/* Input para definir o horário de entrada do primeiro turno / manhã */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-slate-200 text-xs font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      {(condo.workScale || '8h_3turnos') === '12x36'
                        ? 'Horário de Entrada da Manhã (Turno Diurno)'
                        : 'Horário de Entrada do 1º Turno (Manhã)'}
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <input
                    type="time"
                    value={condo.workScaleStartHour || '06:00'}
                    onChange={(e) =>
                      setCondo({
                        ...condo,
                        workScaleStartHour: e.target.value || '06:00',
                      })
                    }
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex gap-1">
                    {['06:00', '07:00', '08:00'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setCondo({
                            ...condo,
                            workScaleStartHour: preset,
                          })
                        }
                        className={`px-2 py-1 text-[11px] rounded border transition-colors font-mono ${
                          (condo.workScaleStartHour || '06:00') === preset
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
            </div>

            {/* Modelos de Escala com Pré-Visualização Dinâmica dos Horários */}
            {(() => {
              const startH = condo.workScaleStartHour || '06:00';
              const shifts12 = calculateShiftsForScale('12x36', startH);
              const shifts8 = calculateShiftsForScale('8h_3turnos', startH);
              const is12x36 = (condo.workScale || '8h_3turnos') === '12x36';

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Option 1: 12x36 */}
                  <div
                    onClick={() => setCondo({ ...condo, workScale: '12x36' })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      is12x36
                        ? 'bg-sky-950/70 border-sky-500 text-white shadow-lg ring-1 ring-sky-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-sky-300">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span>Escala 12h x 36h</span>
                      </span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                        is12x36 ? 'bg-sky-500 border-sky-400 text-black font-bold' : 'border-slate-700'
                      }`}>
                        {is12x36 && '✓'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Plantão de 12 horas de trabalho com 36 horas de descanso contínuo
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5 text-[10px] text-slate-300 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          <span>Turno Diurno: {shifts12[0].startHour} às {shifts12[0].endHour}</span>
                        </span>
                        <span className="text-slate-400">12h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                          <span>Turno Noturno: {shifts12[1].startHour} às {shifts12[1].endHour}</span>
                        </span>
                        <span className="text-slate-400">12h</span>
                      </div>
                    </div>
                  </div>

                  {/* Option 2: 8h em 3 turnos */}
                  <div
                    onClick={() => setCondo({ ...condo, workScale: '8h_3turnos' })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      !is12x36
                        ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-lg ring-1 ring-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-300">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Escala de 8h (3 Turnos)</span>
                      </span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                        !is12x36 ? 'bg-emerald-500 border-emerald-400 text-black font-bold' : 'border-slate-700'
                      }`}>
                        {!is12x36 && '✓'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Cobertura contínua de 24 horas dividida em 3 períodos de 8 horas
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5 text-[10px] text-slate-300 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          <span>1º Turno (Manhã): {shifts8[0].startHour} às {shifts8[0].endHour}</span>
                        </span>
                        <span className="text-slate-400">8h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                          <span>2º Turno (Tarde): {shifts8[1].startHour} às {shifts8[1].endHour}</span>
                        </span>
                        <span className="text-slate-400">8h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                          <span>3º Turno (Noite): {shifts8[2].startHour} às {shifts8[2].endHour}</span>
                        </span>
                        <span className="text-slate-400">8h</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h4 className="font-semibold text-white">Regras Específicas do Condomínio</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">Horário de Entregas & Encomendas</label>
                <input
                  type="text"
                  value={condo.rules.deliveryHours}
                  onChange={(e) =>
                    setCondo({ ...condo, rules: { ...condo.rules, deliveryHours: e.target.value } })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Horário de Silêncio</label>
                <input
                  type="text"
                  value={condo.rules.quietHours}
                  onChange={(e) =>
                    setCondo({ ...condo, rules: { ...condo.rules, quietHours: e.target.value } })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Regras de Mudanças</label>
                <input
                  type="text"
                  value={condo.rules.movingHours}
                  onChange={(e) =>
                    setCondo({ ...condo, rules: { ...condo.rules, movingHours: e.target.value } })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Política de Visitantes</label>
                <input
                  type="text"
                  value={condo.rules.visitorPolicy}
                  onChange={(e) =>
                    setCondo({ ...condo, rules: { ...condo.rules, visitorPolicy: e.target.value } })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Visual Identity & App Icons */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Identidade Visual & Ícones do Aplicativo (PWA)
            </h4>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-slate-900 shadow-xl shrink-0">
                <img src="/app-icon.png" alt="Ícone CAST 360" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Ícone Oficial CAST 360</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-mono-tabular">PWA Ready</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow"
            >
              Salvar Dados do Condomínio
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: USUÁRIOS & PERMISSÕES */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 flex-wrap">
                <span>Equipe de Portaria & Operadores</span>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold">
                  {condo.name}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-normal">
                  {currentUser.role === 'dev' ? 'Modo Master Developer' : 'Gerenciado pelo ADM Predial'}
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {currentUser.role === 'admin' && (currentUser.managedCondoIds && currentUser.managedCondoIds.length > 1) && (
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-emerald-700/60 text-xs">
                  <span className="text-emerald-400 font-semibold text-[11px]">Condomínio:</span>
                  <select
                    value={storage.getActiveCondoId()}
                    onChange={(e) => {
                      storage.switchActiveCondo(e.target.value);
                      refreshData();
                    }}
                    className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    {clientCondos
                      .filter((c) => currentUser.managedCondoIds?.includes(c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {currentUser.role === 'dev' && (
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
                  <span className="text-slate-400 text-[11px]">Filtrar:</span>
                  <select
                    value={selectedCondoFilter}
                    onChange={(e) => setSelectedCondoFilter(e.target.value)}
                    className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-white">Todos os Condomínios ({users.length})</option>
                    {clientCondos.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => {
                  handleOpenUserModal();
                  setUserRole('porteiro');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cadastrar Porteiro</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
            {displayedUsers.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-white">Nenhum operador ou porteiro cadastrado para este condomínio.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Nome</th>
                      <th className="py-3 px-4">E-mail / Telefone</th>
                      {currentUser.role === 'dev' && <th className="py-3 px-4">Condomínio</th>}
                      <th className="py-3 px-4">Perfil</th>
                      <th className="py-3 px-4">Senha / Acesso</th>
                      <th className="py-3 px-4">Permissões Especiais</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {displayedUsers.map((u) => {
                      const isDev = u.role === 'dev' || u.email.toLowerCase() === 'ale11062@gmail.com';
                      return (
                        <tr key={u.id} className={`hover:bg-slate-850/50 ${isDev ? 'bg-purple-950/20' : ''}`}>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-white block">{u.name}</span>
                            {isDev ? (
                              <span className="text-[10px] text-purple-300 font-bold bg-purple-950 px-1 rounded border border-purple-800 inline-block mt-0.5">
                                ⚡ Master Developer
                              </span>
                            ) : u.condoName && currentUser.role === 'dev' ? (
                              <span className="text-[10px] text-slate-400 block mt-0.5">{u.condoName}</span>
                            ) : null}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {u.email} <span className="text-[10px] text-slate-500 block">{u.phone}</span>
                          </td>
                          {currentUser.role === 'dev' && (
                            <td className="py-3 px-4">
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                                isDev
                                  ? 'text-purple-300 bg-purple-950/80 border-purple-800/60'
                                  : 'text-indigo-300 bg-indigo-950/80 border-indigo-800/60'
                              }`}>
                                {isDev ? 'Independente (Sem cliente)' : u.condoName || 'Não vinculado'}
                              </span>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                                isDev
                                  ? 'bg-purple-900/60 text-purple-300 border border-purple-700'
                                  : u.role === 'admin'
                                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {isDev ? 'Dev Master' : u.role}
                            </span>
                            {u.role === 'porteiro' && u.shiftTurn && (
                              <span className="block text-[10px] text-sky-300 font-mono bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/80 mt-1 truncate max-w-[170px]">
                                🕒 {u.shiftTurn}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {currentUser.role === 'dev' ? u.password || '••••••••' : '••••••••'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[10px] space-x-1">
                            {u.permissions.canManageUsers && (
                              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-300">Gestão Usuários</span>
                            )}
                            {u.permissions.canConfigCondo && (
                              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">Config Condomínio</span>
                            )}
                            {u.permissions.canDeleteRecords && (
                              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-rose-300">Excluir Registros</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {u.active ? (
                              <span className="text-emerald-400 font-semibold text-[11px]">Ativo</span>
                            ) : (
                              <span className="text-rose-400 font-semibold text-[11px]">Desativado</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenUserModal(u)}
                                className="p-1.5 text-slate-400 hover:text-white"
                                title="Editar Usuário"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES WHATSAPP */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="font-semibold text-white text-xs">{tpl.title}</h4>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800 px-1.5 py-0.2 rounded uppercase">
                      {tpl.category}
                    </span>
                  </div>
                  <pre className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {tpl.templateText}
                  </pre>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setTemplateTitle(tpl.title);
                      setTemplateText(tpl.templateText);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Modelo</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LOG DE AUDITORIA */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Registros de Auditoria & Trilha de Segurança
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Últimas 50 operações registradas</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Detalhes do Evento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-tabular">
                {logs.slice(0, 50).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-850/50">
                    <td className="py-2.5 px-4 text-slate-400">{l.timestamp}</td>
                    <td className="py-2.5 px-4 text-white font-medium">{l.userName} ({l.userRole})</td>
                    <td className="py-2.5 px-4 text-emerald-400 font-semibold">{l.action}</td>
                    <td className="py-2.5 px-4 text-slate-300">{l.entity}</td>
                    <td className="py-2.5 px-4 text-slate-300 max-w-[320px] truncate">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BACKUP & SEGURANÇA */}
      {activeTab === 'backup' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Cópia de Segurança Completa (Backup JSON)</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Backup Completo (.JSON)</span>
              </button>

              <label className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold border border-slate-700 cursor-pointer">
                <Upload className="w-4 h-4 text-sky-400" />
                <span>Restaurar de Arquivo JSON</span>
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-rose-400 mb-3">Redefinição de Demonstração / Fábrica</h3>
            <button
              onClick={handleResetToFactory}
              className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg font-semibold"
            >
              Resetar Dados para Demonstração Inicial
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: CLOUDFLARE (PAGES & WORKERS) */}
      {activeTab === 'cloudflare' && (
        <div className="space-y-6 text-xs">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-orange-950/60 via-slate-900 to-slate-900 border border-orange-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 shrink-0">
                  <Cloud className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Preparado para Cloudflare</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      100% Pronto
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="https://dash.cloudflare.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Cloudflare Dash</span>
                </a>
              </div>
            </div>
          </div>

          {/* Métodos para Forçar o Deploy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Método 1: Via Terminal / Wrangler CLI */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-orange-400" />
                <span>Método 1: Forçar via Terminal (Wrangler CLI)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Gera o pacote de produção atualizado e envia imediatamente para o Cloudflare Pages.
              </p>

              <div className="space-y-2 pt-1">
                {[
                  {
                    label: 'Forçar Deploy Completo (Build + Deploy Pages)',
                    cmd: 'npm run deploy:force',
                  },
                  {
                    label: 'Deploy Direto no Cloudflare Pages',
                    cmd: 'npx wrangler pages deploy dist --project-name=portaria360',
                  },
                  {
                    label: 'Build de Produção',
                    cmd: 'npm run build',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-lg font-mono">
                    <div className="overflow-hidden">
                      <span className="text-[10px] text-slate-400 font-sans block mb-0.5">{item.label}</span>
                      <span className="text-orange-300 font-semibold text-[11px] break-all">{item.cmd}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.cmd);
                        setCopiedSnippet(item.cmd);
                        setTimeout(() => setCopiedSnippet(null), 2000);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded transition-colors self-start sm:self-auto cursor-pointer shrink-0"
                    >
                      {copiedSnippet === item.cmd ? 'Copiado! ✓' : 'Copiar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Método 2: Via Painel Web da Cloudflare */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-400" />
                <span>Método 2: Forçar pelo Painel da Cloudflare</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Se o seu projeto estiver conectado ao GitHub/GitLab ou configurado no Cloudflare Pages:
              </p>

              <div className="space-y-2.5 text-[11px] text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-950 text-orange-400 border border-orange-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Acesse <strong>dash.cloudflare.com</strong> e vá em <strong>Workers & Pages</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-950 text-orange-400 border border-orange-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>Clique no projeto <strong>portaria360</strong> e abra a aba <strong>Deployments</strong> (Implantações).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-950 text-orange-400 border border-orange-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <span>Clique nos <strong>3 pontinhos (...)</strong> ao lado do último deploy e selecione <strong>Retry deployment</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-950 text-orange-400 border border-orange-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                  <span>Ou clique no botão <strong>Create deployment</strong> para enviar manualmente a pasta <code>dist</code>.</span>
                </div>
              </div>

              {/* Dica de Limpeza de Cache */}
              <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-800/40 text-[11px] text-sky-200">
                <strong>Dica de Cache:</strong> Caso o deploy conclua mas você ainda veja a versão anterior, vá em <strong>Caching</strong> &gt; <strong>Configuration</strong> &gt; <strong>Purge Everything</strong> (Limpar Tudo) no painel do Cloudflare para limpar a CDN instantaneamente.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: BANCO CLOUD (FIREBASE) */}
      {activeTab === 'firebase' && (
        <div className="space-y-4">
          {/* Cloud Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-600/50 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/40">
                <Flame className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white">Banco de Dados Firebase Firestore</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Ativo & Conectado
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ID: <span className="text-slate-200 font-mono font-bold">ai-studio-cloudflareportar-c8712ebc-837b-4a9f-b5d9-94c7ca2b9502</span> • Projeto: <span className="text-slate-200 font-mono">mega-alpha-djkjx</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <button
                onClick={handleHydrateCloud}
                disabled={isCloudSyncing}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>Atualizar da Nuvem</span>
              </button>

              <button
                onClick={handleTriggerCloudSync}
                disabled={isCloudSyncing}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isCloudSyncing ? 'Sincronizando...' : 'Sincronizar Tudo no Firebase'}</span>
              </button>
            </div>
          </div>

          {cloudSyncStats && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-center justify-between">
              <span>{cloudSyncStats.message}</span>
              <button onClick={() => setCloudSyncStats(null)} className="p-1 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Retention & Independence Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Retenção Mínima Garantida: 2 Anos
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Todos os registros de controle de acesso (entradas e saídas de pessoas), veículos, encomendas e ocorrências possuem garantia de armazenamento permanente em nuvem pelo período legal mínimo de 24 meses.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-sky-400" />
                Banco de Dados Independente
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Instância dedicada e isolada na nuvem Google Cloud / Firebase. Opera com independência total de instâncias anteriores ou do ambiente gerador, prevenindo conflitos entre diferentes condomínios.
              </p>
            </div>
          </div>

          {/* Sync Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block">Entradas / Acessos</span>
              <span className="text-lg font-bold text-white font-mono">{storage.getAccessLogs().length}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block">Veículos Cadastrados</span>
              <span className="text-lg font-bold text-sky-400 font-mono">{storage.getVehicles().length}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block">Encomendas</span>
              <span className="text-lg font-bold text-amber-400 font-mono">{storage.getDeliveries().length}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block">Moradores / Usuários</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">{storage.getResidents().length + storage.getAllUsers().length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal User Edit */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUser}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-3.5 text-xs"
          >
            <h3 className="text-sm font-semibold text-white">
              {editingUser ? 'Editar Usuário do Sistema' : 'Novo Usuário do Sistema'}
            </h3>

            {userRole === 'dev' || userEmail.trim().toLowerCase() === 'ale11062@gmail.com' ? (
              <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-900/60 flex items-center justify-between text-[11px]">
                <span className="text-purple-300 font-semibold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  Dev Master Independente
                </span>
                <span className="text-slate-400">Sem vínculo com cliente</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-900/40 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Condomínio Vinculado:</span>
                <span className="font-semibold text-emerald-400 truncate ml-2">
                  {editingUser?.condoName || condo.name}
                </span>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Telefone</label>
                <input
                  type="text"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Perfil de Acesso</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="porteiro">Porteiro / Operador</option>
                  <option value="supervisor">Supervisor de Segurança</option>
                  <option value="admin">Administrador / Síndico</option>
                  {currentUser.role === 'dev' && (
                    <option value="dev">Desenvolvedor / Master</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Status da Conta</label>
                <select
                  value={userActive ? 'active' : 'inactive'}
                  onChange={(e) => setUserActive(e.target.value === 'active')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="active">Ativo (Pode Acessar)</option>
                  <option value="inactive">Desativado / Bloqueado</option>
                </select>
              </div>
            </div>

            {/* Shift Turn Selector for Porteiro */}
            {userRole === 'porteiro' && (
              <div className="p-3 bg-slate-950 border border-sky-800/60 rounded-xl space-y-1.5">
                <label className="block text-sky-300 font-semibold text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Turno / Escala de Trabalho do Porteiro</span>
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono">
                    Escala {condo.workScale === '12x36' ? '12h x 36h' : '8h em 3 Turnos'}
                  </span>
                </label>
                <select
                  value={userShiftTurn}
                  onChange={(e) => setUserShiftTurn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                >
                  <option value="">Selecione o Turno ou Horário de Trabalho</option>
                  {(calculateShiftsForScale(condo.workScale || '8h_3turnos', condo.workScaleStartHour || '06:00') || []).map((s) => (
                    <option key={s.id} value={s.label}>
                      {s.label} ({s.timeRange})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {currentUser.role === 'dev' ? (
              <div>
                <label className="block text-slate-300 font-medium mb-1">Senha de Acesso</label>
                <input
                  type="text"
                  placeholder="Defina a senha"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            ) : (
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-xs">
                As credenciais de acesso são gerenciadas e recuperadas pelo Dev Master.
              </div>
            )}

            {/* Individual Permissions */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <span className="font-semibold text-slate-300 block">Permissões Individuais:</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="p-users"
                  checked={canManageUsers}
                  onChange={(e) => setCanManageUsers(e.target.checked)}
                  className="accent-emerald-600 rounded"
                />
                <label htmlFor="p-users" className="text-slate-300">Pode cadastrar e editar usuários</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="p-condo"
                  checked={canConfigCondo}
                  onChange={(e) => setCanConfigCondo(e.target.checked)}
                  className="accent-emerald-600 rounded"
                />
                <label htmlFor="p-condo" className="text-slate-300">Pode configurar regras e dados do condomínio</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="p-del"
                  checked={canDeleteRecords}
                  onChange={(e) => setCanDeleteRecords(e.target.checked)}
                  className="accent-emerald-600 rounded"
                />
                <label htmlFor="p-del" className="text-slate-300">Pode excluir registros históricos</label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold"
              >
                Salvar Usuário
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Edit Template */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTemplate}
            className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl p-5 space-y-3 text-xs"
          >
            <h3 className="text-sm font-semibold text-white">Editar Modelo de WhatsApp</h3>

            <div>
              <label className="block text-slate-300 mb-1">Título do Modelo</label>
              <input
                type="text"
                required
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Texto com Marcadores Automáticos</label>
              <textarea
                rows={8}
                required
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold"
              >
                Salvar Modelo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
