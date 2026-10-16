import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Megaphone,
  AlertTriangle,
  Package,
  Building2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Plus,
  CheckCircle2,
  MapPin,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { storage } from '../services/storage';
import { AreaBooking, CommonArea, DeliveryItem, CommunicationNotice, Occurrence, User } from '../types';
import { ActiveTab } from '../components/Sidebar';
import { ResidentNavHeader } from '../components/ResidentNavHeader';

interface ResidentDashboardViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

export const ResidentDashboardView: React.FC<ResidentDashboardViewProps> = ({ onNavigateTab }) => {
  const [currentUser, setCurrentUser] = useState<User>(storage.getCurrentUser());
  const [condo, setCondo] = useState(storage.getCondo());

  // Data for the 3 authorized resident sessions
  const [myBookings, setMyBookings] = useState<AreaBooking[]>([]);
  const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
  const [notices, setNotices] = useState<CommunicationNotice[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<DeliveryItem[]>([]);
  const [myOccurrences, setMyOccurrences] = useState<Occurrence[]>([]);

  const refreshData = () => {
    const user = storage.getCurrentUser();
    setCurrentUser(user);
    setCondo(storage.getCondo());

    // 1. Áreas & Reservas
    const allBookings = storage.getBookings();
    const areas = storage.getCommonAreas();
    setCommonAreas(areas.filter((a) => a.status === 'disponivel'));

    const userBookings = allBookings.filter((b) => {
      if (user.apartmentId && b.apartmentId === user.apartmentId) return true;
      if (user.unitNumber && b.apartmentNumber === user.unitNumber) return true;
      if (b.residentEmail && b.residentEmail.toLowerCase() === user.email.toLowerCase()) return true;
      return false;
    });
    setMyBookings(userBookings);

    // 2. Mural & Avisos + Encomendas
    const allNotices = storage.getNotices();
    const activeNotices = allNotices.filter((n) => n.status === 'enviado');
    setNotices(activeNotices);

    const allDels = storage.getDeliveries();
    const pendingDels = allDels.filter((d) => {
      const matchApt =
        (user.apartmentId && d.apartmentId === user.apartmentId) ||
        (user.unitNumber && d.recipientName.includes(user.unitNumber));
      const notPickedUp = d.status !== 'retirado' && d.status !== 'devolvido';
      return matchApt && notPickedUp;
    });
    setMyDeliveries(pendingDels);

    // 3. Livro de Ocorrências
    const allOccurrences = storage.getOccurrences();
    const userOccurrences = allOccurrences.filter((o) => {
      if (user.apartmentId && o.apartmentId === user.apartmentId) return true;
      if (o.involvedParties && o.involvedParties.toLowerCase().includes(user.name.toLowerCase())) return true;
      if (user.unitNumber && o.location && o.location.includes(user.unitNumber)) return true;
      return false;
    });
    setMyOccurrences(userOccurrences);
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return () => unsub();
  }, []);

  const activeBookings = myBookings.filter(
    (b) => b.status === 'confirmada' || b.status === 'pendente_aprovacao'
  );
  const openOccurrences = myOccurrences.filter(
    (o) => o.status === 'aberta' || o.status === 'em_analise'
  );

  return (
    <div className="space-y-5">
      {/* Top Session Switcher - Exclusively for the 3 resident sessions */}
      <ResidentNavHeader
        activeTab="dashboard"
        onNavigateTab={onNavigateTab}
        pendingBookingsCount={activeBookings.length}
        pendingDeliveriesCount={myDeliveries.length}
        openOccurrencesCount={openOccurrences.length}
      />

      {/* Welcome Card & Unit Identity */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-purple-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Portal do Morador
              </span>
              <span className="text-xs text-slate-400 font-medium">{condo.name}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Olá, {currentUser.name}!
            </h1>

            <p className="text-xs text-slate-300 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>
                Unidade:{' '}
                <strong className="text-white font-semibold">
                  Apt {currentUser.unitNumber || '101'}
                </strong>{' '}
                · {currentUser.blockName || 'Torre Principal'}
              </span>
            </p>
          </div>

          {/* Pending Delivery Notification Pill if packages waiting at portaria */}
          {myDeliveries.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab('notices')}
              className="p-3 bg-amber-950/60 border border-amber-500/50 hover:border-amber-400 rounded-xl flex items-center gap-3 transition-colors cursor-pointer group shrink-0 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                <Package className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wide">
                  Encomenda na Portaria
                </span>
                <span className="text-xs font-bold text-white">
                  {myDeliveries.length}{' '}
                  {myDeliveries.length === 1 ? 'objeto aguardando' : 'objetos aguardando'} retirada
                </span>
                <span className="text-[10px] text-amber-300/80 block mt-0.5 flex items-center gap-1">
                  Ver detalhes <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* THE 3 EXCLUSIVE SESSIONS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Sessões do Condômino
            </h2>
            <p className="text-xs text-slate-400">
              Acesse e gerencie suas solicitações no condomínio
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SESSÃO 1: ÁREAS & RESERVAS */}
          <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-lg transition-all group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-md">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {activeBookings.length}{' '}
                  {activeBookings.length === 1 ? 'Reserva Ativa' : 'Reservas Ativas'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Áreas & Reservas
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Consulte disponibilidade e agende churrasqueira, salão de festas e outros espaços
                  comuns.
                </p>
              </div>

              {/* Quick stats or next booking preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Espaços disponíveis:</span>
                  <strong className="text-white">{commonAreas.length} áreas</strong>
                </div>

                {activeBookings.length > 0 ? (
                  <div className="pt-1.5 border-t border-slate-800/60">
                    <span className="text-[10px] text-emerald-400 font-semibold block uppercase">
                      Próxima Reserva:
                    </span>
                    <p className="text-white font-medium text-xs truncate">
                      {activeBookings[0].areaName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono-tabular">
                      📅 {activeBookings[0].bookingDate} ({activeBookings[0].slotLabel})
                    </p>
                  </div>
                ) : (
                  <div className="pt-1 text-[11px] text-slate-500 italic">
                    Nenhuma reserva agendada no momento.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('bookings')}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acessar Áreas & Reservas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SESSÃO 2: MURAL & AVISOS */}
          <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-lg transition-all group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-amber-950/70 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shadow-md">
                  <Megaphone className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {notices.length} {notices.length === 1 ? 'Aviso Ativo' : 'Avisos Ativos'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  Mural & Avisos
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Comunicados oficiais da administração, notificações de encomendas e avisos
                  importantes.
                </p>
              </div>

              {/* Quick stats or pending packages preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Encomendas na portaria:</span>
                  <strong
                    className={
                      myDeliveries.length > 0 ? 'text-amber-400 font-bold' : 'text-slate-300'
                    }
                  >
                    {myDeliveries.length} pacote(s)
                  </strong>
                </div>

                {notices.length > 0 ? (
                  <div className="pt-1.5 border-t border-slate-800/60">
                    <span className="text-[10px] text-amber-400 font-semibold block uppercase">
                      Último Comunicado:
                    </span>
                    <p className="text-white font-medium text-xs truncate">{notices[0].title}</p>
                    <p className="text-[10px] text-slate-400">
                      {notices[0].sentAt ? `Enviado em ${notices[0].sentAt}` : 'Publicado'}
                    </p>
                  </div>
                ) : (
                  <div className="pt-1 text-[11px] text-slate-500 italic">
                    Nenhum comunicado pendente.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('notices')}
                className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acessar Mural & Avisos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SESSÃO 3: LIVRO DE OCORRÊNCIAS */}
          <div className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-lg transition-all group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-rose-950/70 border border-rose-500/40 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform shadow-md">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  {openOccurrences.length} {openOccurrences.length === 1 ? 'Em Aberto' : 'Em Aberto'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                  Livro de Ocorrências
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Comunique barulho, manutenção, dúvidas ou ocorrências com fotos e acompanhe a
                  resolução.
                </p>
              </div>

              {/* Quick stats or user occurrences preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Total registradas:</span>
                  <strong className="text-white">{myOccurrences.length} ocorrência(s)</strong>
                </div>

                {myOccurrences.length > 0 ? (
                  <div className="pt-1.5 border-t border-slate-800/60">
                    <span className="text-[10px] text-rose-400 font-semibold block uppercase">
                      Último Registro:
                    </span>
                    <p className="text-white font-medium text-xs truncate">
                      {myOccurrences[0].description}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono-tabular">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${myOccurrences[0].status === 'resolvida' ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      />
                      Status:{' '}
                      {myOccurrences[0].status === 'resolvida'
                        ? 'Resolvida'
                        : myOccurrences[0].status === 'em_analise'
                        ? 'Em Análise'
                        : 'Aberta'}
                    </p>
                  </div>
                ) : (
                  <div className="pt-1 text-[11px] text-slate-500 italic">
                    Nenhuma ocorrência registrada por sua unidade.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('occurrences')}
                className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-950/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acessar Livro de Ocorrências</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Helpful Guidelines Card */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-slate-300 font-semibold">Privacidade e Segurança do Condômino</p>
          <p className="mt-0.5">
            O Portal do Morador é estritamente restrito aos dados da sua unidade (
            {currentUser.unitNumber || '101'}). Informações da guarita, câmeras de segurança e
            registros de terceiros são restritos aos operadores da portaria.
          </p>
        </div>
      </div>
    </div>
  );
};
