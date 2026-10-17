/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { storage } from './services/storage';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { QuickSearchModal } from './components/QuickSearchModal';
import { ShiftHandoverModal } from './components/ShiftHandoverModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { LoginModal } from './components/LoginModal';
import { WhatsAppPayload } from './services/whatsapp';
import { DeliveryItem } from './types';
import { LayoutDashboard, ShieldCheck, Package, Video, Menu, Sparkles, AlertTriangle, RotateCcw } from 'lucide-react';

// Views
import { DashboardView } from './views/DashboardView';
import { AccessControlView } from './views/AccessControlView';
import { CCTVView } from './views/CCTVView';
import { DeliveriesView } from './views/DeliveriesView';
import { NoticesView } from './views/NoticesView';
import { BookingsView } from './views/BookingsView';
import { VisitorsView } from './views/VisitorsView';
import { ContractorsView } from './views/ContractorsView';
import { PublicAgentsView } from './views/PublicAgentsView';
import { VehiclesView } from './views/VehiclesView';
import { ApartmentsView } from './views/ApartmentsView';
import { ResidentsView } from './views/ResidentsView';
import { OccurrencesView } from './views/OccurrencesView';
import { OtherControlsView } from './views/OtherControlsView';
import { ReportsView } from './views/ReportsView';
import { AdminSettingsView } from './views/AdminSettingsView';
import { DevMasterView } from './views/DevMasterView';
import { ResidentDashboardView } from './views/ResidentDashboardView';
import { ResidentNavHeader } from './components/ResidentNavHeader';

export default function App() {
  const initialUser = storage.getCurrentUser();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    initialUser.role === 'dev' ? 'dev_master' : 'dashboard'
  );
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isNewDeliveryModalOpen, setIsNewDeliveryModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [whatsAppPayload, setWhatsAppPayload] = useState<WhatsAppPayload | null>(null);

  // Cross-view deep linking states
  const [targetApartmentId, setTargetApartmentId] = useState<string | undefined>(undefined);
  const [selectedDeliveryForPickup, setSelectedDeliveryForPickup] = useState<DeliveryItem | null>(null);
  const [snapshotForOccurrence, setSnapshotForOccurrence] = useState<{ url: string; cameraName: string } | null>(null);

  // Quick stats for sidebar badges
  const [pendingDeliveriesCount, setPendingDeliveriesCount] = useState(0);
  const [openOccurrencesCount, setOpenOccurrencesCount] = useState(0);
  const [waitingAuthCount, setWaitingAuthCount] = useState(0);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);

  const refreshBadges = () => {
    const user = storage.getCurrentUser();
    setCurrentUser(user);
    if (user.role === 'dev' && activeTab !== 'dev_master') {
      setActiveTab('dev_master');
    }
    const dels = storage.getDeliveries();
    setPendingDeliveriesCount(dels.filter((d) => d.status !== 'retirado' && d.status !== 'devolvido').length);

    const ocos = storage.getOccurrences();
    setOpenOccurrencesCount(ocos.filter((o) => o.status === 'aberta' || o.status === 'em_analise').length);

    const bks = storage.getBookings();
    setPendingBookingsCount(bks.filter((b) => b.status === 'pendente_aprovacao').length);

    const logs = storage.getAccessLogs();
    setWaitingAuthCount(0);
  };

  useEffect(() => {
    refreshBadges();
    const unsub = storage.subscribe(refreshBadges);
    return () => unsub();
  }, []);

  // Keyboard shortcut for Cmd+K / Ctrl+K (apenas portaria e gestão)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (currentUser.role === 'morador') return;
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser.role]);

  // Enforce strict boundary for morador: Dashboard do Morador + the 3 authorized sessions
  useEffect(() => {
    if (currentUser.role === 'morador' && !['dashboard', 'bookings', 'notices', 'occurrences'].includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUser.role, activeTab]);

  const handleOpenWhatsApp = (payload: WhatsAppPayload) => {
    setWhatsAppPayload(payload);
  };

  const handleFastCheckIn = (
    name: string,
    type: 'visitante' | 'prestador',
    aptId: string,
    blockId: string,
    doc: string
  ) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const entryTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const user = storage.getCurrentUser();

    storage.saveAccessLog({
      id: `acc-${Date.now()}`,
      personName: name,
      personType: type,
      document: doc,
      apartmentId: aptId,
      blockId,
      purpose: type === 'visitante' ? 'Visita Social Autorizada' : 'Prestação de Serviço Autorizada',
      entryTime,
      status: 'dentro',
      authorizationMethod: 'previa',
      authorizedByName: 'Autorização Prévia',
      operatorName: user.name,
    });

    setActiveTab('access');
  };

  const handleSelectSearchResult = (tab: ActiveTab, entityId?: string) => {
    if (tab === 'apartments' && entityId) {
      setTargetApartmentId(entityId);
    }
    setActiveTab(tab);
  };

  const handleLogout = () => {
    setIsShiftModalOpen(false);
    setIsSearchOpen(false);
    setIsSidebarMobileOpen(false);
    setIsLoginModalOpen(false);
    storage.logout();
    refreshBadges();
  };

  // If user is logged out, render the Login Screen directly
  if (currentUser.id === 'guest' || !storage.isAuthenticated()) {
    return (
      <LoginModal
        isOpen={true}
        isFullScreen={true}
        onLoginSuccess={(user) => {
          refreshBadges();
          if (user.role === 'dev') {
            setActiveTab('dev_master');
          } else if (user.role === 'morador') {
            setActiveTab('bookings');
          } else {
            setActiveTab('dashboard');
          }
        }}
      />
    );
  }

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const mainEl = document.getElementById('main-content');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="h-screen h-[100dvh] max-h-screen max-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col antialiased w-full max-w-full overflow-hidden">
      {/* Top Header */}
      <Header
        onOpenSearch={() => {
          if (currentUser.role !== 'morador') setIsSearchOpen(true);
        }}
        onOpenShiftHandover={() => {
          if (currentUser.role !== 'morador') setIsShiftModalOpen(true);
        }}
        onToggleSidebarMobile={() => setIsSidebarMobileOpen((prev) => !prev)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onUserChanged={(user) => {
          refreshBadges();
          if (user.role === 'dev') {
            setActiveTab('dev_master');
          } else if (user.role === 'morador') {
            setActiveTab('bookings');
          } else if (activeTab === 'dev_master' || activeTab === 'dev_demo') {
            setActiveTab('dashboard');
          }
        }}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden w-full max-w-full relative">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isOpenMobile={isSidebarMobileOpen}
          onCloseMobile={() => setIsSidebarMobileOpen(false)}
          userRole={currentUser.role}
          pendingDeliveriesCount={pendingDeliveriesCount}
          openOccurrencesCount={openOccurrencesCount}
          waitingAuthCount={waitingAuthCount}
          pendingBookingsCount={pendingBookingsCount}
          onLogout={handleLogout}
          onOpenShiftHandover={() => setIsShiftModalOpen(true)}
        />

        {/* Main Content Workspace - full width scroll listener with touch-action */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full relative"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          <div
            className={`max-w-7xl mx-auto w-full min-w-0 p-3 sm:p-5 lg:p-8 ${currentUser.role === 'dev' || currentUser.role === 'morador' ? 'pb-8' : 'pb-24 lg:pb-8'}`}
          >

          {currentUser.role === 'dev' ? (
            <DevMasterView onOpenWhatsApp={handleOpenWhatsApp} />
          ) : currentUser.role === 'morador' ? (
            <>
              {activeTab !== 'dashboard' && (
                <ResidentNavHeader
                  activeTab={activeTab}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  pendingBookingsCount={pendingBookingsCount}
                  pendingDeliveriesCount={pendingDeliveriesCount}
                  openOccurrencesCount={openOccurrencesCount}
                />
              )}
              {activeTab === 'dashboard' && (
                <ResidentDashboardView onNavigateTab={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'bookings' && <BookingsView onTriggerWhatsApp={handleOpenWhatsApp} />}
              {activeTab === 'notices' && <NoticesView onTriggerWhatsApp={handleOpenWhatsApp} />}
              {activeTab === 'occurrences' && (
                <OccurrencesView
                  initialSnapshot={snapshotForOccurrence}
                  onClearSnapshot={() => setSnapshotForOccurrence(null)}
                />
              )}
            </>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onOpenQuickEntryModal={() => setActiveTab('access')}
                  onOpenQuickExitModal={() => setActiveTab('access')}
                  onOpenQuickDeliveryModal={() => {
                    setActiveTab('deliveries');
                    setIsNewDeliveryModalOpen(true);
                  }}
                  onOpenQuickOccurrenceModal={() => setActiveTab('occurrences')}
                  onTriggerWhatsApp={handleOpenWhatsApp}
                  onPickupDelivery={(del) => {
                    setSelectedDeliveryForPickup(del);
                    setActiveTab('deliveries');
                  }}
                  onOpenShiftHandover={() => setIsShiftModalOpen(true)}
                />
              )}

              {activeTab === 'access' && <AccessControlView onTriggerWhatsApp={handleOpenWhatsApp} />}

              {activeTab === 'cctv' && (
                <CCTVView
                  onAttachSnapshotToOccurrence={(url, cameraName) => {
                    setSnapshotForOccurrence({ url, cameraName });
                    setActiveTab('occurrences');
                  }}
                />
              )}

              {activeTab === 'deliveries' && (
                <DeliveriesView
                  onTriggerWhatsApp={handleOpenWhatsApp}
                  selectedDeliveryForPickup={selectedDeliveryForPickup}
                  onClearSelectedDelivery={() => setSelectedDeliveryForPickup(null)}
                  initialOpenCreateModal={isNewDeliveryModalOpen}
                  onCloseCreateModal={() => setIsNewDeliveryModalOpen(false)}
                />
              )}

              {activeTab === 'notices' && <NoticesView onTriggerWhatsApp={handleOpenWhatsApp} />}

              {activeTab === 'bookings' && <BookingsView onTriggerWhatsApp={handleOpenWhatsApp} />}

              {activeTab === 'visitors' && (
                <VisitorsView
                  onTriggerWhatsApp={handleOpenWhatsApp}
                  onFastCheckIn={handleFastCheckIn}
                />
              )}

              {activeTab === 'contractors' && (
                <ContractorsView
                  onTriggerWhatsApp={handleOpenWhatsApp}
                  onFastCheckIn={handleFastCheckIn}
                />
              )}

              {activeTab === 'public_agents' && <PublicAgentsView />}

              {activeTab === 'vehicles' && <VehiclesView />}

              {activeTab === 'apartments' && (
                <ApartmentsView
                  onTriggerWhatsApp={handleOpenWhatsApp}
                  targetApartmentId={targetApartmentId}
                />
              )}

              {activeTab === 'residents' && <ResidentsView onTriggerWhatsApp={handleOpenWhatsApp} />}

              {activeTab === 'occurrences' && (
                <OccurrencesView
                  initialSnapshot={snapshotForOccurrence}
                  onClearSnapshot={() => setSnapshotForOccurrence(null)}
                  onOpenShiftHandover={() => setIsShiftModalOpen(true)}
                />
              )}

              {activeTab === 'other_controls' && <OtherControlsView />}

              {activeTab === 'reports' && <ReportsView />}

              {activeTab === 'admin' && <AdminSettingsView />}
            </>
          )}
          </div>
        </main>
      </div>

      {/* Global Interactive Modals */}
      <QuickSearchModal
        isOpen={isSearchOpen && currentUser.role !== 'morador'}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />

      <ShiftHandoverModal
        isOpen={isShiftModalOpen && currentUser.role !== 'morador'}
        onClose={() => setIsShiftModalOpen(false)}
        onTurnoCompleted={() => refreshBadges()}
        onUserChanged={(newUser) => {
          refreshBadges();
          if (newUser.role === 'dev') {
            setActiveTab('dev_master');
          } else if (newUser.role === 'morador') {
            setActiveTab('bookings');
          } else {
            setActiveTab('dashboard');
          }
        }}
        onLogoutRequested={handleLogout}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          refreshBadges();
          if (user.role === 'dev') {
            setActiveTab('dev_master');
          } else {
            setActiveTab('dashboard');
          }
        }}
      />

      {whatsAppPayload && (
        <WhatsAppModal
          isOpen={true}
          onClose={() => setWhatsAppPayload(null)}
          initialPayload={whatsAppPayload}
        />
      )}

      {/* Mobile Fixed Bottom Navigation Bar - Only for portaria/operators, NEVER for Dev or Morador */}
      {currentUser.role !== 'dev' && currentUser.role !== 'morador' && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 lg:hidden flex items-center justify-around px-1 py-1 shadow-2xl safe-area-bottom w-full max-w-full">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Início</span>
          </button>

          <button
            onClick={() => handleTabChange('access')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === 'access' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span>Portaria</span>
          </button>

          <button
            onClick={() => handleTabChange('deliveries')}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === 'deliveries' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <Package className="w-5 h-5 mb-0.5" />
              {pendingDeliveriesCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-black font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-mono">
                  {pendingDeliveriesCount > 9 ? '9+' : pendingDeliveriesCount}
                </span>
              )}
            </div>
            <span>Encomendas</span>
          </button>

          <button
            onClick={() => handleTabChange('cctv')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === 'cctv' ? 'text-sky-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-5 h-5 mb-0.5" />
            <span>Câmeras</span>
          </button>

          <button
            onClick={() => setIsSidebarMobileOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium text-slate-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>Menu</span>
          </button>
        </nav>
      )}
    </div>
  );
}
