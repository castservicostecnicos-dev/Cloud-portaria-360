import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Package,
  AlertTriangle,
  Clock,
  Car,
  Wrench,
  Users,
  ShieldCheck,
  Video,
  LogOut,
  Send,
  Building,
  Plus,
  ArrowUpRight,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { storage } from '../services/storage';
import { AccessLog, DeliveryItem, Occurrence, Vehicle, User } from '../types';
import { ActiveTab } from '../components/Sidebar';
import { WhatsAppPayload } from '../services/whatsapp';

interface DashboardViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenQuickEntryModal: () => void;
  onOpenQuickExitModal: () => void;
  onOpenQuickDeliveryModal: () => void;
  onOpenQuickOccurrenceModal: () => void;
  onTriggerWhatsApp: (payload: WhatsAppPayload) => void;
  onPickupDelivery: (delivery: DeliveryItem) => void;
  onOpenShiftHandover?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenQuickEntryModal,
  onOpenQuickExitModal,
  onOpenQuickDeliveryModal,
  onOpenQuickOccurrenceModal,
  onTriggerWhatsApp,
  onPickupDelivery,
  onOpenShiftHandover,
}) => {
  const [currentUser, setCurrentUser] = useState<User>(storage.getCurrentUser());
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cameras, setCameras] = useState(storage.getCCTVCameras());

  const refreshData = () => {
    setCurrentUser(storage.getCurrentUser());
    setAccessLogs(storage.getAccessLogs());
    setDeliveries(storage.getDeliveries());
    setOccurrences(storage.getOccurrences());
    setVehicles(storage.getVehicles());
    setCameras(storage.getCCTVCameras());
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  // Compute live indicators
  const insidePeople = accessLogs.filter((l) => l.status === 'dentro');
  const waitingApproval = accessLogs.filter((l) => l.status === 'aguardando_autorizacao');
  const contractorsInside = insidePeople.filter((l) => l.personType === 'prestador');
  const visitorsInside = insidePeople.filter((l) => l.personType === 'visitante');
  const pendingDeliveries = deliveries.filter((d) => d.status !== 'retirado' && d.status !== 'devolvido');
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const deliveriesToday = deliveries.filter((d) => d.receivedAt.startsWith(todayDateStr));
  const openOccurrences = occurrences.filter((o) => o.status === 'aberta' || o.status === 'em_analise');
  const activeVehiclesInside = vehicles.filter((v) => v.status === 'ativo').length;

  const handleQuickCheckout = (log: AccessLog) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const exitTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    const updated: AccessLog = {
      ...log,
      exitTime,
      status: 'saiu',
    };
    storage.saveAccessLog(updated);
    storage.addAuditLog('Saída Registrada', 'Controle de Acesso', `Saída de ${log.personName} (${log.personType}) registrada`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Operator Greeting */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-800 shadow-md shrink-0 flex items-center justify-center">
            <img src="/app-icon.png" alt="CAST 360" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-medium mb-1">
              {currentUser.role === 'admin' ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-indigo-400">ADM Predial · {storage.getCondo().name}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400">Portaria · {storage.getCondo().name}</span>
                </>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Olá, {currentUser.name.split(' ')[0]}!
            </h2>
          </div>
        </div>

        {/* Shift summary / Handover / Admin status */}
        <div className="flex items-center gap-2">
          {currentUser.role !== 'admin' && onOpenShiftHandover && (
            <button
              onClick={onOpenShiftHandover}
              title="Passagem de Turno"
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-950/50 hover:bg-amber-900/70 border border-amber-800/60 text-amber-300 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Passagem de Turno</span>
            </button>
          )}

          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 sm:px-4">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">
                {currentUser.role === 'admin' ? 'Perfil' : 'Turno'}
              </span>
              <span className="text-xs font-semibold text-white">
                {currentUser.role === 'admin' ? 'ADM Predial' : currentUser.shiftTurn || 'Plantão'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              {currentUser.role === 'admin' ? 'ADM' : '24h'}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {currentUser.role === 'admin' ? 'Módulos de Gestão' : 'Operações da Portaria'}
          </h3>
        </div>

        {currentUser.role === 'admin' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
            <button
              onClick={() => onNavigateTab('access')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] border border-slate-700 text-white rounded-xl shadow transition-all group min-w-0 text-center"
            >
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Acessos</span>
            </button>

            <button
              onClick={() => onNavigateTab('deliveries')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] border border-slate-700 text-white rounded-xl shadow transition-all group min-w-0 text-center"
            >
              <Package className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Encomendas</span>
            </button>

            <button
              onClick={() => onNavigateTab('cctv')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] border border-slate-700 text-white rounded-xl shadow transition-all group min-w-0 text-center"
            >
              <Video className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Câmeras CFTV</span>
            </button>

            <button
              onClick={() => onNavigateTab('occurrences')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] border border-slate-700 text-white rounded-xl shadow transition-all group min-w-0 text-center"
            >
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Ocorrências</span>
            </button>

            <button
              onClick={() => onNavigateTab('apartments')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] border border-slate-700 text-white rounded-xl shadow transition-all group min-w-0 text-center"
            >
              <Building className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Ficha Apt</span>
            </button>

            <button
              onClick={() => onNavigateTab('admin')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white rounded-xl shadow-lg shadow-indigo-950/30 transition-all group min-w-0 text-center"
            >
              <Users className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-white group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Porteiros</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {/* Action 1: Registrar Entrada */}
            <button
              onClick={onOpenQuickEntryModal}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl shadow-lg shadow-emerald-950/30 transition-all group min-w-0 text-center"
            >
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-white group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Registrar Entrada</span>
            </button>

            {/* Action 2: Registrar Saída */}
            <button
              onClick={onOpenQuickExitModal}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] border border-slate-700 text-white rounded-xl shadow transition-all group min-w-0 text-center"
            >
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Registrar Saída</span>
            </button>

            {/* Action 3: Nova Encomenda */}
            <button
              onClick={onOpenQuickDeliveryModal}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white rounded-xl shadow-lg shadow-indigo-950/30 transition-all group min-w-0 text-center"
            >
              <Package className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-white group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Nova Encomenda</span>
            </button>

            {/* Action 4: Câmeras CFTV */}
            <button
              onClick={() => onNavigateTab('cctv')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] border border-slate-700 text-white rounded-xl shadow transition-all group min-w-0 text-center"
            >
              <Video className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Câmeras CFTV</span>
            </button>

            {/* Action 5: Nova Ocorrência */}
            <button
              onClick={onOpenQuickOccurrenceModal}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] border border-slate-700 text-white rounded-xl shadow transition-all group min-w-0 text-center"
            >
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Nova Ocorrência</span>
            </button>

            {/* Action 6: Consultar Apartamento */}
            <button
              onClick={() => onNavigateTab('apartments')}
              className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-800 hover:bg-slate-750 active:scale-[0.98] border border-slate-700 text-white rounded-xl shadow transition-all group min-w-0 text-center"
            >
              <Building className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide">Ficha Apt</span>
            </button>
          </div>
        )}
      </div>

      {/* REALTIME OPERATIONAL COUNTERS (Grid of metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1 */}
        <div
          onClick={() => onNavigateTab('access')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>No Condomínio</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono-tabular">
            {insidePeople.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
            <span>{visitorsInside.length} vis · {contractorsInside.length} prest</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </div>
        </div>

        {/* Metric 2 */}
        <div
          onClick={() => onNavigateTab('access')}
          className={`border rounded-xl p-3 cursor-pointer transition-colors ${
            waitingApproval.length > 0
              ? 'bg-amber-950/20 border-amber-600/50 hover:border-amber-500'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Aguardando Aprovação</span>
            <Clock className={`w-4 h-4 ${waitingApproval.length > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono-tabular ${waitingApproval.length > 0 ? 'text-amber-300' : 'text-white'}`}>
            {waitingApproval.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
            <span>Interfone / WhatsApp</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </div>
        </div>

        {/* Metric 3 */}
        <div
          onClick={() => onNavigateTab('deliveries')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Encomendas Pendentes</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono-tabular">
            {pendingDeliveries.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
            <span>{deliveriesToday.length} recebidas hoje</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </div>
        </div>

        {/* Metric 4 */}
        <div
          onClick={() => onNavigateTab('contractors')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Prestadores Dentro</span>
            <Wrench className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono-tabular">
            {contractorsInside.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
            <span>Manutenções ativas</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </div>
        </div>

        {/* Metric 5 */}
        <div
          onClick={() => onNavigateTab('occurrences')}
          className={`border rounded-xl p-3 cursor-pointer transition-colors ${
            openOccurrences.length > 0
              ? 'bg-rose-950/20 border-rose-600/50 hover:border-rose-500'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Ocorrências Abertas</span>
            <AlertTriangle className={`w-4 h-4 ${openOccurrences.length > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono-tabular ${openOccurrences.length > 0 ? 'text-rose-300' : 'text-white'}`}>
            {openOccurrences.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
            <span>{occurrences.length} no total</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </div>
        </div>

        {/* Metric 6 */}
        <div
          onClick={() => onNavigateTab('vehicles')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Veículos Cadastrados</span>
            <Car className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono-tabular">
            {activeVehiclesInside}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
            <span>Garagem Subsolo</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </div>
        </div>
      </div>

      {/* TWO COLUMN WORKSPACE: Quem está dentro agora & Encomendas para retirada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Pessoas Atualmente Dentro do Condomínio */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Pessoas no Condomínio ({insidePeople.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('access')}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Ver Todos</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 flex-1 overflow-y-auto max-h-[360px]">
            {insidePeople.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhuma pessoa externa no condomínio.
              </div>
            ) : (
              insidePeople.map((log) => {
                const aptNumber = log.apartmentId ? log.apartmentId.replace('apt-', '').toUpperCase() : 'Geral';
                return (
                  <div key={log.id} className="p-3.5 hover:bg-slate-850/60 transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 truncate">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                        {log.personType === 'visitante' && <Users className="w-4 h-4 text-purple-400" />}
                        {log.personType === 'prestador' && <Wrench className="w-4 h-4 text-teal-400" />}
                        {log.personType === 'agente_publico' && <ShieldCheck className="w-4 h-4 text-amber-400" />}
                        {log.personType === 'morador' && <UserCheck className="w-4 h-4 text-emerald-400" />}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">{log.personName}</span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            · {log.personType.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Destino: <strong className="text-slate-200">Apt {aptNumber}</strong> · Motivo: {log.purpose}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono-tabular mt-0.5">
                          Entrada: {log.entryTime.slice(11)} · Porteiro: {log.operatorName}
                        </p>
                      </div>
                    </div>

                    {currentUser.role === 'admin' ? (
                      <span className="text-[10px] text-slate-500 font-mono italic shrink-0">Observador</span>
                    ) : (
                      <button
                        onClick={() => handleQuickCheckout(log)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 rounded-lg transition-colors shrink-0"
                        title="Registrar Saída Agora"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Dar Saída</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Encomendas e Itens Aguardando Retirada */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Encomendas Pendentes ({pendingDeliveries.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('deliveries')}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Ver Todas</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 flex-1 overflow-y-auto max-h-[360px]">
            {pendingDeliveries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhuma encomenda pendente.
              </div>
            ) : (
              pendingDeliveries.map((del) => {
                const aptNumber = del.apartmentId.replace('apt-', '').toUpperCase();
                const resident = storage.getResidents().find((r) => r.apartmentId === del.apartmentId && r.isMainResident);
                return (
                  <div key={del.id} className="p-3.5 hover:bg-slate-850/60 transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 truncate">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-600/30">
                        <Package className="w-4 h-4" />
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">{del.recipientName}</span>
                          <span className="text-[10px] text-amber-300 font-mono-tabular bg-amber-950/60 px-1 rounded border border-amber-800/40">
                            Apt {aptNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {del.description} · <span className="text-slate-300 font-medium">{del.storageLocation}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono-tabular mt-0.5">
                          {del.code} · Recebido: {del.receivedAt.slice(11)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Avisar pelo WhatsApp button */}
                      <button
                        onClick={() => {
                          onTriggerWhatsApp({
                            phone: resident ? resident.phone : '',
                            residentName: del.recipientName,
                            apartmentNumber: aptNumber,
                            itemType: del.type,
                            code: del.code,
                            description: del.description,
                            templateKey: del.type === 'remedio' ? 'remedio_urgente' : 'encomenda_recebida',
                          });
                        }}
                        className="p-1.5 text-emerald-400 hover:text-white hover:bg-emerald-600/40 border border-emerald-600/40 rounded-lg transition-colors"
                        title="Avisar Morador pelo WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      {/* Registrar Retirada apenas para operador */}
                      {currentUser.role !== 'admin' && (
                        <button
                          onClick={() => onPickupDelivery(del)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 rounded-lg transition-colors"
                        >
                          Retirar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* QUICK CCTV CAMERAS STRIP */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Câmeras CFTV
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('cctv')}
            className="text-xs text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>Ver CFTV</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cameras.slice(0, 3).map((cam) => (
            <div
              key={cam.id}
              onClick={() => onNavigateTab('cctv')}
              className="group relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 aspect-video cursor-pointer hover:border-sky-500/60 transition-all"
            >
              {cam.snapshotUrl ? (
                <img
                  src={cam.snapshotUrl}
                  alt={cam.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-600 p-4">
                  <Video className="w-8 h-8 mb-1 opacity-50" />
                  <span className="text-[11px] font-mono">FEED CFTV</span>
                </div>
              )}

              {/* Camera Overlays */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/75 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>REC · {cam.name.split(':')[0]}</span>
              </div>

              <div className="absolute top-2 right-2 bg-black/75 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">
                {cam.resolution.split(' ')[0]}
              </div>

              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 text-left">
                <p className="text-xs font-semibold text-white truncate">{cam.name}</p>
                <p className="text-[10px] text-slate-300 truncate">{cam.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
