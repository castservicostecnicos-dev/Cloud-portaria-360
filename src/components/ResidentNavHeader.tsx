import React from 'react';
import { LayoutDashboard, CalendarCheck, Megaphone, AlertTriangle } from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface ResidentNavHeaderProps {
  activeTab: ActiveTab;
  onNavigateTab: (tab: ActiveTab) => void;
  pendingDeliveriesCount?: number;
  openOccurrencesCount?: number;
  pendingBookingsCount?: number;
}

export const ResidentNavHeader: React.FC<ResidentNavHeaderProps> = ({
  activeTab,
  onNavigateTab,
  pendingDeliveriesCount = 0,
  openOccurrencesCount = 0,
  pendingBookingsCount = 0,
}) => {
  const tabs = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Painel Geral',
      shortLabel: 'Painel',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'bookings' as ActiveTab,
      label: 'Áreas & Reservas',
      shortLabel: 'Reservas',
      icon: CalendarCheck,
      badge: pendingBookingsCount > 0 ? String(pendingBookingsCount) : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    {
      id: 'notices' as ActiveTab,
      label: 'Mural & Avisos',
      shortLabel: 'Avisos',
      icon: Megaphone,
      badge: pendingDeliveriesCount > 0 ? `${pendingDeliveriesCount} enc.` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    {
      id: 'occurrences' as ActiveTab,
      label: 'Livro de Ocorrências',
      shortLabel: 'Ocorrências',
      icon: AlertTriangle,
      badge: openOccurrencesCount > 0 ? String(openOccurrencesCount) : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    },
  ];

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-1.5 sm:p-2 mb-4 shadow-md">
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onNavigateTab(tab.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap min-w-max ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>

              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono-tabular shrink-0 ${
                    tab.badgeColor || 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
