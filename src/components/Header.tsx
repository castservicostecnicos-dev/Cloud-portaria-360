import React, { useState, useEffect } from 'react';
import {
  Search,
  UserCheck,
  Shield,
  ChevronDown,
  Clock,
  Bell,
  Menu,
  Key,
  Sparkles,
  Lock,
  LogOut,
  Building2,
  Mail,
  Phone,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { storage } from '../services/storage';
import { User } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenShiftHandover: () => void;
  onToggleSidebarMobile: () => void;
  onOpenQuickNotice?: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onUserChanged?: (user: User) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenShiftHandover,
  onToggleSidebarMobile,
  onOpenQuickNotice,
  onOpenLogin,
  onLogout,
  onUserChanged,
}) => {
  const [currentUser, setCurrentUser] = useState<User>(storage.getCurrentUser());
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [condo, setCondo] = useState(storage.getCondo());
  const [insideCount, setInsideCount] = useState(0);
  const [pendingDeliveriesCount, setPendingDeliveriesCount] = useState(0);
  const [currentTime, setCurrentTime] = useState('');

  const isDevOrDemo = currentUser.role === 'dev' || currentUser.email === 'ale11062@gmail.com';

  const refreshData = () => {
    setCurrentUser(storage.getCurrentUser());
    setCondo(storage.getCondo());

    const accessLogs = storage.getAccessLogs();
    const inside = accessLogs.filter((l) => l.status === 'dentro').length;
    setInsideCount(inside);

    const dels = storage.getDeliveries();
    const pendingDels = dels.filter((d) => d.status !== 'retirado' && d.status !== 'devolvido').length;
    setPendingDeliveriesCount(pendingDels);
  };

  useEffect(() => {
    refreshData();
    const unsub = storage.subscribe(refreshData);

    const updateClock = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setCurrentTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100 px-2.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 w-full max-w-full">
      {/* Zone 1: Mobile Hamburger + Brand Name */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
        <button
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          aria-label="Abrir Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-800 flex items-center justify-center shrink-0 shadow-md">
            <img
              src="/app-icon.png"
              alt="Logo CAST 360"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/pwa-192x192.png';
              }}
            />
          </div>
          <div className="leading-tight min-w-0">
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1 sm:gap-1.5 truncate">
              <span>CAST 360</span>
              <span className="text-[9px] sm:text-[10px] font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1 sm:px-1.5 py-0.2 rounded shrink-0">
                PRO
              </span>
            </h1>

            {currentUser.role === 'dev' ? (
              <p className="text-[10px] sm:text-[11px] text-purple-300 font-semibold truncate max-w-[140px] sm:max-w-[240px]">
                Painel DEV Master
              </p>
            ) : currentUser.role === 'admin' &&
            storage.getClientCondos().filter((c) =>
              (currentUser.managedCondoIds && currentUser.managedCondoIds.includes(c.id)) ||
              (c.admPredial && c.admPredial.email.toLowerCase() === currentUser.email.toLowerCase()) ||
              c.id === currentUser.condoId
            ).length > 1 ? (
              <div className="flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <select
                  value={storage.getActiveCondoId()}
                  onChange={(e) => {
                    storage.switchActiveCondo(e.target.value);
                    refreshData();
                    if (onUserChanged) onUserChanged(currentUser);
                  }}
                  className="bg-slate-950 text-emerald-300 font-semibold border border-emerald-700/60 rounded px-1.5 py-0.5 text-[10px] sm:text-[11px] focus:outline-none focus:border-emerald-400 cursor-pointer max-w-[140px] sm:max-w-[210px] truncate"
                  title="Trocar condomínio em atendimento"
                >
                  {storage
                    .getClientCondos()
                    .filter((c) =>
                      (currentUser.managedCondoIds && currentUser.managedCondoIds.includes(c.id)) ||
                      (c.admPredial && c.admPredial.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                      c.id === currentUser.condoId
                    )
                    .map((mc) => (
                      <option key={mc.id} value={mc.id} className="bg-slate-900 text-white">
                        {mc.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[110px] sm:max-w-[220px]">
                {condo.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Zone 2: Realtime Operational Status Strip (or DEV Strip) */}
      {currentUser.role === 'dev' ? (
        <div className="hidden md:flex items-center gap-3 text-xs text-purple-300">
          <div className="flex items-center gap-1.5 font-mono-tabular">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-200 font-semibold">{currentTime}</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-purple-200 font-medium">Gestão Central de Condomínios</span>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-5 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-mono-tabular">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-200 font-semibold">{currentTime}</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              No Condomínio:{' '}
              <strong className="text-white font-mono-tabular">{insideCount}</strong> pessoas
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <div>
            <span>
              Encomendas Pendentes:{' '}
              <strong className="text-amber-300 font-mono-tabular">{pendingDeliveriesCount}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Zone 3: Global Search, Quick Handover & User Role Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Quick Search Button (Portaria & Observador) */}
        {currentUser.role !== 'dev' && (
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 text-xs text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors group shrink-0"
            title="Buscar morador, placa, apartamento, encomenda (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
            <span className="hidden sm:inline">Pesquisar...</span>
            <kbd className="hidden lg:inline-block text-[10px] px-1.5 py-0.5 text-slate-400 bg-slate-800 rounded border border-slate-700 font-mono">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Turn Handover Button */}
        <button
          onClick={onOpenShiftHandover}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors cursor-pointer"
          title="Passagem de Turno e Livro de Plantão"
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="whitespace-nowrap">Passagem de Turno</span>
        </button>

        {/* User Profile & Auth Button */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-2.5 sm:py-1.5 text-xs border rounded-lg transition-colors shrink-0 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 cursor-pointer"
          >
            <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-emerald-600/30 text-emerald-300">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block max-w-[120px] truncate">
              <span className="font-medium text-white block truncate">
                {currentUser.name.split(' ')[0]}
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 capitalize">
                {currentUser.role === 'dev' ? 'Dev Master' : currentUser.role === 'admin' ? 'ADM Predial' : currentUser.role}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserDropdown && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent"
                onClick={() => setShowUserDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Sessão Ativa
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded font-mono">
                  {currentUser.role === 'dev' ? 'DEV MASTER' : 'POSTO ATIVO'}
                </span>
              </div>

              {/* Logged in User Profile Card */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-md">
                    {currentUser.name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-xs sm:text-sm truncate">
                      {currentUser.name}
                    </h4>
                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded capitalize bg-emerald-950 text-emerald-300 border border-emerald-800 mt-0.5">
                      {currentUser.role === 'dev' ? 'Dev Master' : currentUser.role === 'admin' ? 'ADM Predial' : currentUser.role === 'supervisor' ? 'Supervisor' : 'Porteiro / Operador'}
                    </span>

                    <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                      {currentUser.email && (
                        <p className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{currentUser.email}</span>
                        </p>
                      )}
                      {currentUser.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{currentUser.phone}</span>
                        </p>
                      )}
                      <p className="flex items-center gap-1.5 text-slate-300 font-medium truncate">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{currentUser.condoName || condo.name}</span>
                      </p>
                      {currentUser.role === 'porteiro' && currentUser.shiftTurn && (
                        <p className="flex items-center gap-1.5 text-sky-300 font-mono text-[10px] bg-sky-950/60 p-1.5 rounded border border-sky-900/60 mt-1">
                          <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="truncate">{currentUser.shiftTurn}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-3 bg-slate-950 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenShiftHandover();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-xl transition-all cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Passagem de Turno da Portaria</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-xl shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          </>
        )}
        </div>

        {/* Dedicated Quick Logout Button */}
        <button
          onClick={onLogout}
          title="Sair do Sistema"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 hover:border-rose-700 rounded-lg shadow-sm transition-all cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline font-semibold">Sair</span>
        </button>
      </div>
    </header>
  );
};
