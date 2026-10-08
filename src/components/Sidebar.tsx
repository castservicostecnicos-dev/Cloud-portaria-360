import React from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Video,
  Package,
  Megaphone,
  UserPlus,
  Wrench,
  BadgeCheck,
  Car,
  Building2,
  Users,
  AlertTriangle,
  Key,
  BarChart3,
  Settings,
  X,
  Sparkles,
  ShieldAlert,
  LogOut,
  Clock,
} from 'lucide-react';
import { UserRole } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { storage } from '../services/storage';

export type ActiveTab =
  | 'dev_master'
  | 'dev_demo'
  | 'dashboard'
  | 'access'
  | 'cctv'
  | 'deliveries'
  | 'notices'
  | 'visitors'
  | 'contractors'
  | 'public_agents'
  | 'vehicles'
  | 'apartments'
  | 'residents'
  | 'occurrences'
  | 'other_controls'
  | 'reports'
  | 'admin';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  userRole: UserRole;
  pendingDeliveriesCount: number;
  openOccurrencesCount: number;
  waitingAuthCount: number;
  onLogout?: () => void;
  onOpenShiftHandover?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
  userRole,
  pendingDeliveriesCount,
  openOccurrencesCount,
  waitingAuthCount,
  onLogout,
  onOpenShiftHandover,
}) => {
  const currentUser = storage.getCurrentUser();
  const condo = storage.getCondo();
  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  const navGroups =
    userRole === 'dev'
      ? [
          {
            label: 'Funções DEV',
            items: [
              {
                id: 'dev_master' as ActiveTab,
                label: 'Gestão de Condomínios',
                icon: Building2,
                badge: 'DEV',
                badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
              },
            ],
          },
        ]
      : [
          {
            label: 'Operação Principal',
            items: [
              { id: 'dashboard' as ActiveTab, label: 'Painel da Portaria', icon: LayoutDashboard },
              {
                id: 'access' as ActiveTab,
                label: 'Controle de Acesso',
                icon: ShieldCheck,
                badge: waitingAuthCount > 0 ? `${waitingAuthCount} pend.` : undefined,
                badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-600/30',
              },
              { id: 'cctv' as ActiveTab, label: 'Câmeras CFTV', icon: Video, highlight: true },
            ],
          },
          {
            label: 'Fluxo Diário & Comunicação',
            items: [
              {
                id: 'deliveries' as ActiveTab,
                label: 'Encomendas & WhatsApp',
                icon: Package,
                badge: pendingDeliveriesCount > 0 ? String(pendingDeliveriesCount) : undefined,
                badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-600/30',
              },
              { id: 'notices' as ActiveTab, label: 'Mural de Avisos & Envios', icon: Megaphone },
              { id: 'visitors' as ActiveTab, label: 'Visitantes & Autorizações', icon: UserPlus },
              { id: 'contractors' as ActiveTab, label: 'Prestadores de Serviço', icon: Wrench },
              { id: 'public_agents' as ActiveTab, label: 'Agentes Públicos', icon: BadgeCheck },
              { id: 'vehicles' as ActiveTab, label: 'Veículos & Garagem', icon: Car },
            ],
          },
          {
            label: 'Cadastros & Ocorrências',
            items: [
              { id: 'apartments' as ActiveTab, label: 'Ficha do Apartamento', icon: Building2 },
              { id: 'residents' as ActiveTab, label: 'Moradores', icon: Users },
              {
                id: 'occurrences' as ActiveTab,
                label: 'Livro de Ocorrências',
                icon: AlertTriangle,
                badge: openOccurrencesCount > 0 ? String(openOccurrencesCount) : undefined,
                badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-600/30',
              },
              { id: 'other_controls' as ActiveTab, label: 'Chaves, Achados & Mudanças', icon: Key },
            ],
          },
          {
            label: 'Gerenciamento',
            items: [
              { id: 'reports' as ActiveTab, label: 'Relatórios & Exportação', icon: BarChart3 },
              {
                id: 'admin' as ActiveTab,
                label: userRole === 'admin' ? 'Cadastrar Porteiros & Prédio' : 'Condomínio & Usuários',
                icon: Settings,
                badge: userRole === 'admin' ? 'ADM' : undefined,
                badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
              },
            ],
          },
        ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header Close */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-800 flex items-center justify-center shrink-0 shadow">
              <img src="/app-icon.png" alt="CAST 360" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold text-white">Menu CAST 360</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Sidebar Top Logo Branding */}
        <div className="hidden lg:flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-900 flex items-center justify-center shrink-0 shadow">
            <img src="/app-icon.png" alt="CAST 360" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>CAST 360</span>
              <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded">PRO</span>
            </div>
            <p className="text-[10px] text-slate-400">Gestão de Portaria</p>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded border font-mono-tabular font-semibold shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white border-white/30'
                            : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* PWA Install Promo in Sidebar */}
        <div className="px-3 pb-2">
          <PWAInstallButton variant="full" />
        </div>

        {/* Active Operator & Logout Box */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0 shadow-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-white block truncate leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-400 block truncate capitalize">
                {currentUser.role === 'dev'
                  ? 'Dev Master'
                  : currentUser.role === 'admin'
                  ? `ADM Predial (Observador) · ${condo.name}`
                  : `${currentUser.role} · ${condo.name}`}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            {userRole !== 'dev' && onOpenShiftHandover && (
              <button
                onClick={() => {
                  onCloseMobile();
                  onOpenShiftHandover();
                }}
                title="Passagem de Turno da Portaria"
                className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 hover:border-amber-700 text-amber-300 hover:text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Passagem de Turno</span>
              </button>
            )}

            {onLogout && (
              <button
                onClick={() => {
                  onCloseMobile();
                  onLogout();
                }}
                title="Sair do Sistema / Desconectar"
                className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 hover:border-rose-700 text-rose-300 hover:text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Sair do Sistema</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/90 text-[10px] text-slate-400 flex items-center justify-between">
          <div className="truncate">
            <span className="text-slate-300 font-medium block truncate">Portaria CAST 360</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Posto de Atendimento Ativo
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">v2.5</span>
        </div>
      </aside>
    </>
  );
};
