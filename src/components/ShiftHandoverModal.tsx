import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckSquare,
  Square,
  X,
  AlertCircle,
  Check,
  LogOut,
  ShieldCheck,
  Package,
  Key,
  Users,
  FileText,
  UserCheck,
  ArrowRight,
  Database,
  Download,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { storage } from '../services/storage';
import {
  ShiftEntry,
  ShiftPendingItem,
  User,
  CondoConfig,
  calculateShiftsForScale,
  getWorkScaleSummary,
} from '../types';

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTurnoCompleted?: () => void;
  onUserChanged?: (user: User) => void;
  onLogoutRequested?: () => void;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  onTurnoCompleted,
  onLogoutRequested,
}) => {
  const [currentUser, setCurrentUser] = useState<User>(storage.getCurrentUser());
  const [condo, setCondo] = useState<CondoConfig>(storage.getCondo());
  const [nextOperatorName, setNextOperatorName] = useState('');
  const [selectedNextUser, setSelectedNextUser] = useState<User | null>(null);
  const [nextShiftTurn, setNextShiftTurn] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [pendencies, setPendencies] = useState<ShiftPendingItem[]>([]);
  const [activeShift, setActiveShift] = useState<ShiftEntry | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [signedSuccess, setSignedSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Live post statistics to guarantee continuity for next shift
  const [insidePeopleList, setInsidePeopleList] = useState<{ name: string; type: string; apt: string; time: string }[]>([]);
  const [insideCount, setInsideCount] = useState(0);
  const [pendingDeliveriesCount, setPendingDeliveriesCount] = useState(0);
  const [openOccurrencesCount, setOpenOccurrencesCount] = useState(0);
  const [keysOutCount, setKeysOutCount] = useState(0);

  // Backup snapshot states and metrics
  const [saveLocalSnapshot, setSaveLocalSnapshot] = useState(true);
  const [forceDownloadBackup, setForceDownloadBackup] = useState(true);
  const [allOccurrencesCount, setAllOccurrencesCount] = useState(0);
  const [allAccessLogsCount, setAllAccessLogsCount] = useState(0);
  const [backupGeneratedNotice, setBackupGeneratedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentCondo = storage.getCondo();
      const currentOperator = storage.getCurrentUser();
      const backupConfig = storage.getBackupConfig();
      setSaveLocalSnapshot(backupConfig.autoSnapshotOnShiftClose ?? true);
      setForceDownloadBackup(backupConfig.forceDownloadOnShiftClose ?? true);
      setAllOccurrencesCount(storage.getOccurrences().length);
      setAllAccessLogsCount(storage.getAccessLogs().length);
      setBackupGeneratedNotice(null);
      setCondo(currentCondo);
      setCurrentUser(currentOperator);
      setValidationError(null);
      setSignedSuccess(false);

      // Load all available users for this condo
      const condoUsers = storage.getAllUsers().filter(
        (u) => (u.condoId === currentCondo.id || !u.condoId || u.role === 'porteiro') && u.active
      );
      setAllUsers(condoUsers);

      // Scale and default next turn
      const currentScale = currentCondo.workScale || '8h_3turnos';
      const currentStartHour = currentCondo.workScaleStartHour || '06:00';
      const shiftsList = calculateShiftsForScale(currentScale, currentStartHour);
      const defaultNextTurn = shiftsList[0]?.label || 'Plantão Normal';
      setNextShiftTurn(defaultNextTurn);

      // Check other operators to suggest next operator
      const otherOperators = condoUsers.filter((u) => u.id !== currentOperator.id && u.role === 'porteiro');
      if (otherOperators.length > 0) {
        setNextOperatorName(otherOperators[0].name);
        setSelectedNextUser(otherOperators[0]);
        if (otherOperators[0].shiftTurn) {
          setNextShiftTurn(otherOperators[0].shiftTurn);
        }
      }

      // Check live pending issues from other modules
      const keysOut = storage.getKeys().filter((k) => k.status === 'retirado');
      const openOcos = storage.getOccurrences().filter((o) => o.status === 'aberta' || o.status === 'em_analise');
      const peopleInside = storage.getAccessLogs().filter((l) => l.status === 'dentro');
      const pendingDels = storage.getDeliveries().filter((d) => d.status === 'aguardando_retirada' || d.status === 'recebido');

      setInsideCount(peopleInside.length);
      setInsidePeopleList(
        peopleInside.map((p) => ({
          name: p.personName,
          type: p.personType === 'prestador' ? 'Prestador' : 'Visitante',
          apt: p.apartmentId ? `Apt ${p.apartmentId.replace(/^apt-/, '').toUpperCase()}` : 'Geral',
          time: p.entryTime ? p.entryTime.slice(11, 16) : '--:--',
        }))
      );
      setPendingDeliveriesCount(pendingDels.length);
      setOpenOccurrencesCount(openOcos.length);
      setKeysOutCount(keysOut.length);

      // Retrieve existing shifts
      const shifts = storage.getShiftEntries();
      const currentOpen = shifts.find((s) => !s.handoverCompleted) || shifts[0] || null;
      setActiveShift(currentOpen);
      if (currentOpen && !currentOpen.handoverCompleted) {
        setGeneralNotes(currentOpen.generalNotes || '');
      } else {
        setGeneralNotes('');
      }

      // Populate fresh dynamic pendencies from live condominium records
      const dynamicPendencies: ShiftPendingItem[] = [
        ...keysOut.map((k) => ({
          id: `k-${k.id}`,
          label: `Chave ${k.number} (${k.identification}) entregue para ${k.handedTo} ainda não devolvida`,
          category: 'chave' as const,
          resolved: false,
        })),
        ...openOcos.map((o) => ({
          id: `o-${o.id}`,
          label: `Ocorrência em aberto: ${o.type} (${o.location}) - ${o.description.slice(0, 50)}...`,
          category: 'ocorrencia' as const,
          resolved: false,
        })),
        ...peopleInside.slice(0, 3).map((p) => ({
          id: `p-${p.id}`,
          label: `${p.personType.toUpperCase()} ${p.personName} permanece dentro do condomínio (Entrada: ${p.entryTime.slice(11)})`,
          category: 'visitante' as const,
          resolved: false,
        })),
        {
          id: 'p-dels',
          label: `Total de ${pendingDels.length} encomenda(s) aguardando retirada nos armários da guarita`,
          category: 'encomenda' as const,
          resolved: false,
        },
      ];
      setPendencies(dynamicPendencies);
    }
  }, [isOpen]);

  const togglePendency = (id: string) => {
    setPendencies((prev) =>
      prev.map((item) => (item.id === id ? { ...item, resolved: !item.resolved } : item))
    );
  };

  const handleFinishShift = () => {
    setValidationError(null);

    const cleanNextName =
      nextOperatorName.trim() ||
      selectedNextUser?.name ||
      allUsers.find((u) => u.id !== currentUser.id && u.role === 'porteiro')?.name ||
      'Próximo Plantonista';

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const endedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // 1. Update and close the active shift in history
    const shifts = storage.getShiftEntries();
    const existingOpen = shifts.find((s) => !s.handoverCompleted);

    const closingShift: ShiftEntry = {
      id: existingOpen ? existingOpen.id : `shift-${Date.now()}-out`,
      shiftDate: existingOpen?.shiftDate || todayStr,
      shiftTurn: existingOpen?.shiftTurn || currentUser.shiftTurn || 'Plantão Concluído',
      operatorName: existingOpen?.operatorName || currentUser.name,
      startedAt: existingOpen?.startedAt || currentUser.lastLogin || endedAt,
      endedAt,
      generalNotes:
        generalNotes.trim() ||
        existingOpen?.generalNotes ||
        'Turno finalizado com sucesso. Controles e pendências repassados ao próximo operador.',
      handoverTo: cleanNextName,
      handoverCompleted: true,
      pendencies,
    };
    storage.saveShiftEntry(closingShift);

    // 2. Create the next shift immediately inheriting unresolved pendencies
    const unresolvedPendencies = pendencies.filter((p) => !p.resolved);
    const newShiftEntry: ShiftEntry = {
      id: `shift-${Date.now()}-in`,
      shiftDate: todayStr,
      shiftTurn: nextShiftTurn || (condo.workScale === '12x36' ? 'Diurno (06h às 18h)' : '1º Turno: Manhã (06h às 14h)'),
      operatorName: cleanNextName,
      startedAt: endedAt,
      generalNotes: `Turno assumido de ${currentUser.name}. Controles operacionais, acessos e encomendas recebidos.`,
      handoverCompleted: false,
      pendencies: unresolvedPendencies,
    };
    storage.saveShiftEntry(newShiftEntry);

    // 3. Register audit log
    storage.addAuditLog(
      'Passagem de Turno Concluída',
      'Turno',
      `Plantão repassado de ${currentUser.name} para ${cleanNextName}. Pendências repassadas: ${unresolvedPendencies.length}.`
    );

    // 4. Ensure next operator exists as a valid user in storage
    if (!selectedNextUser && cleanNextName && cleanNextName !== 'Próximo Plantonista') {
      const found = storage.getAllUsers().find(
        (u) => u.name.toLowerCase() === cleanNextName.toLowerCase()
      );
      if (!found) {
        const newCreatedUser: User = {
          id: `usr-op-${Date.now()}`,
          name: cleanNextName,
          email: `${cleanNextName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.')}@portaria.local`,
          password: 'portaria123',
          role: 'porteiro',
          phone: '',
          condoId: condo.id,
          condoName: condo.name,
          active: true,
          shiftTurn: nextShiftTurn || 'Manhã (06h às 14h)',
          permissions: {
            canManageUsers: false,
            canConfigCondo: false,
            canDeleteRecords: false,
            canViewReports: true,
            canManageSettings: false,
          },
        };
        storage.saveUser(newCreatedUser);
      }
    }

    // 5. Automatic database export and daily backup snapshot
    if (saveLocalSnapshot || forceDownloadBackup) {
      try {
        const snap = storage.createBackupSnapshot(
          'shift_handover',
          currentUser.name,
          forceDownloadBackup,
          `Fechamento de turno repassado para ${cleanNextName}. Pendências repassadas: ${unresolvedPendencies.length}.`
        );
        if (forceDownloadBackup) {
          setBackupGeneratedNotice(
            `Backup baixado (.json) e snapshot salvo localmente (${snap.counts.occurrences} ocorrências, ${snap.counts.accessLogs} acessos).`
          );
        } else {
          setBackupGeneratedNotice(
            `Snapshot salvo no navegador (${snap.counts.occurrences} ocorrências, ${snap.counts.accessLogs} acessos).`
          );
        }
      } catch (err) {
        console.error('Error generating shift handover backup snapshot:', err);
      }
    }

    setSignedSuccess(true);

    // Logout and redirect cleanly to login screen
    setTimeout(() => {
      setSignedSuccess(false);
      onClose();
      if (onLogoutRequested) {
        onLogoutRequested();
      } else {
        storage.logout();
      }
      if (onTurnoCompleted) {
        onTurnoCompleted();
      }
    }, 1400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-md shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Passagem de Turno da Portaria</span>
                <span className="text-[10px] text-amber-400 font-mono font-normal bg-amber-950/60 border border-amber-800/60 px-2 py-0.2 rounded">
                  Oficial
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Operador Encerrando: <strong className="text-emerald-400">{currentUser.name}</strong> ({currentUser.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar sem transferir"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* CONTINUIDADE OPERACIONAL: Resumo do Posto para o Próximo Turno */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-800/50 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Status do Posto</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 font-mono-tabular">
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-center">
                <Users className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                <span className="text-sm font-bold text-white block">{insideCount}</span>
                <span className="text-[10px] text-slate-400 font-sans block truncate">Pessoas Dentro</span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-center">
                <Package className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="text-sm font-bold text-white block">{pendingDeliveriesCount}</span>
                <span className="text-[10px] text-slate-400 font-sans block truncate">Encomendas na Guarita</span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-center">
                <AlertCircle className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                <span className="text-sm font-bold text-white block">{openOccurrencesCount}</span>
                <span className="text-[10px] text-slate-400 font-sans block truncate">Ocorrências Abertas</span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-center">
                <Key className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <span className="text-sm font-bold text-white block">{keysOutCount}</span>
                <span className="text-[10px] text-slate-400 font-sans block truncate">Chaves Retiradas</span>
              </div>
            </div>

            {insidePeopleList.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <span className="text-slate-400 font-semibold block mb-1">
                  Atualmente no condomínio:
                </span>
                <div className="space-y-1">
                  {insidePeopleList.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/60">
                      <span className="truncate">
                        <strong className="text-emerald-400">[{item.type}]</strong> {item.name} ({item.apt})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">Entrada {item.time}</span>
                    </div>
                  ))}
                  {insidePeopleList.length > 3 && (
                    <span className="text-[10px] text-slate-500 italic block text-right">
                      +{insidePeopleList.length - 3} outros no Controle de Acesso
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Shift Checklist / Pendências */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Checklist de Pendências Repassadas</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {pendencies.filter((p) => p.resolved).length} de {pendencies.length} resolvidas
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
              {pendencies.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-2">
                  Nenhuma pendência operacional registrada neste turno.
                </p>
              ) : (
                pendencies.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => togglePendency(item.id)}
                    className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                      item.resolved ? 'bg-emerald-950/20 text-slate-400' : 'hover:bg-slate-900 text-slate-200'
                    }`}
                  >
                    <button type="button" className="mt-0.5 text-emerald-400 shrink-0">
                      {item.resolved ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <span
                      className={`text-xs leading-relaxed select-none ${
                        item.resolved ? 'line-through text-slate-500' : 'text-slate-200 font-medium'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Observações Gerais do Turno */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Observações do Turno</span>
            </label>
            <textarea
              rows={3}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Observações do plantão para o próximo operador..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none placeholder-slate-500 leading-relaxed"
            />
          </div>

          {/* Próximo Porteiro Assumindo */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
              <span>Próximo Porteiro *</span>
            </label>

            {allUsers.filter((u) => u.id !== currentUser.id && u.active).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                {allUsers
                  .filter((u) => u.id !== currentUser.id && u.active)
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setNextOperatorName(u.name);
                        setSelectedNextUser(u);
                        if (u.shiftTurn) {
                          setNextShiftTurn(u.shiftTurn);
                        }
                        setValidationError(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                        nextOperatorName === u.name
                          ? 'border-emerald-500 bg-emerald-950/40 text-white shadow'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold truncate text-white">{u.name}</p>
                        <p className="text-[10px] text-slate-400 capitalize truncate">
                          {u.role === 'admin' ? 'ADM Predial' : 'Porteiro'} {u.shiftTurn ? `• ${u.shiftTurn}` : ''}
                        </p>
                      </div>
                      {nextOperatorName === u.name && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </button>
                  ))}
              </div>
            )}

            <input
              type="text"
              required
              placeholder="Digite o nome do operador que assume o posto..."
              value={nextOperatorName}
              onChange={(e) => {
                setNextOperatorName(e.target.value);
                setSelectedNextUser(null);
                setValidationError(null);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Turno Assumido */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
            <label className="block text-slate-200 font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Turno que o Operador Está Assumindo *</span>
              </span>
              <span className="text-[10px] text-amber-300 font-mono">
                {condo.workScale === '12x36' ? 'Escala 12x36' : 'Escala 8h (3 Turnos)'}
              </span>
            </label>
            <select
              value={nextShiftTurn}
              onChange={(e) => setNextShiftTurn(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs cursor-pointer focus:outline-none focus:border-emerald-500"
            >
              <option value="">Selecione o Turno</option>
              {calculateShiftsForScale(condo.workScale || '8h_3turnos', condo.workScaleStartHour || '06:00').map((s) => (
                <option key={s.id} value={s.label}>
                  {s.label} ({s.timeRange})
                </option>
              ))}
            </select>
          </div>

          {/* Exportação Automática de Banco de Dados & Backup Diário */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Exportação & Backup Automático de Segurança</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Snapshot do Turno
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Cópia de segurança completa com todas as ocorrências e registros de acesso.
                  </p>
                </div>
              </div>
            </div>

            {/* Badges de conteúdo capturado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-center">
                <p className="text-slate-400 text-[9px] font-medium">Ocorrências</p>
                <p className="font-bold text-amber-300 text-xs">{allOccurrencesCount} totais ({openOccurrencesCount} abertas)</p>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-center">
                <p className="text-slate-400 text-[9px] font-medium">Acessos Portaria</p>
                <p className="font-bold text-sky-300 text-xs">{allAccessLogsCount} registros</p>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-center">
                <p className="text-slate-400 text-[9px] font-medium">Pessoas no Posto</p>
                <p className="font-bold text-emerald-300 text-xs">{insideCount} presentes</p>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-center">
                <p className="text-slate-400 text-[9px] font-medium">Armário Encomendas</p>
                <p className="font-bold text-purple-300 text-xs">{pendingDeliveriesCount} pendentes</p>
              </div>
            </div>

            {/* Opções de Backup */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={saveLocalSnapshot}
                  onChange={(e) => setSaveLocalSnapshot(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Salvar snapshot no armazenamento local do navegador</span>
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Gera e mantém ponto de restauração local na memória do navegador para consulta ou auditoria.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={forceDownloadBackup}
                  onChange={(e) => setForceDownloadBackup(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-emerald-300 text-xs flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Forçar download do arquivo de backup (.json) ao fechar o turno</span>
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Baixa automaticamente o arquivo JSON com data e hora para a pasta de downloads do operador.
                  </p>
                </div>
              </label>
            </div>

            {backupGeneratedNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{backupGeneratedNotice}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleFinishShift}
            disabled={signedSuccess}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer ${
              signedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-600 hover:bg-amber-500 active:scale-[0.98]'
            }`}
          >
            {signedSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Turno Assinado com Sucesso! Redirecionando...</span>
              </>
            ) : (
              <>
                <span>Assinar & Concluir Passagem de Turno</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
