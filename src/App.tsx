/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, MaintenanceReport } from './types';
import {
  initStorage,
  getCurrentUser,
  setCurrentUser,
  getReports,
  getUsers,
  getCompanyConfig,
  subscribeToStorageUpdates,
} from './services/storageService';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { NewMaintenanceView } from './components/NewMaintenanceView';
import { ReportsView } from './components/ReportsView';
import { ReportDetailModal } from './components/ReportDetailModal';
import { TechnicalDemandsView } from './components/TechnicalDemandsView';
import { MovementsView } from './components/MovementsView';
import { InventoryView } from './components/InventoryView';
import { CinemasView } from './components/CinemasView';
import { SalasView } from './components/SalasView';
import { EquipmentView } from './components/EquipmentView';
import { UsersView } from './components/UsersView';
import { LogsView } from './components/LogsView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { AboutView } from './components/AboutView';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<MaintenanceReport | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dataVersion, setDataVersion] = useState<number>(0);

  // Initialize storage & theme on mount and subscribe to real-time cloud updates
  useEffect(() => {
    initStorage();
    const user = getCurrentUser();
    setCurrentUserState(user);

    if (user) {
      if (user.role === 'technician') {
        setActiveTab('nova_manutencao');
      } else {
        setActiveTab('dashboard');
      }
    }

    setReports(getReports());

    const company = getCompanyConfig();
    if (company.theme === 'dark' || (company.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    // Subscribe to Firestore updates in real-time
    const unsubscribe = subscribeToStorageUpdates((type) => {
      setReports(getReports());
      setDataVersion((v) => v + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Ensure technicians are redirected away from admin tabs if they try to switch
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      const adminOnlyTabs = ['dashboard', 'cinemas', 'salas', 'equipamentos', 'tecnicos', 'logs', 'configuracoes'];
      if (adminOnlyTabs.includes(activeTab)) {
        setActiveTab('nova_manutencao');
      }
    }
  }, [activeTab, currentUser]);

  const handleRefreshData = () => {
    setReports(getReports());
  };

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUserState(user);
    if (user.role === 'technician') {
      setActiveTab('nova_manutencao');
    } else {
      setActiveTab('dashboard');
    }
    handleRefreshData();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setCurrentUserState(user);
    if (user.role === 'technician' && ['cinemas', 'salas', 'equipamentos', 'tecnicos', 'logs', 'configuracoes'].includes(activeTab)) {
      setActiveTab('nova_manutencao');
    }
    handleRefreshData();
  };

  const handleReportSubmitted = (newReport: MaintenanceReport) => {
    handleRefreshData();
    setSelectedReport(newReport);
    setActiveTab('relatorios');
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans transition-colors">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(true)}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          activeTab={activeTab}
          onNewMaintenance={() => setActiveTab('nova_manutencao')}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (activeTab !== 'relatorios') {
              setActiveTab('relatorios');
            }
          }}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              key={`dash-${dataVersion}`}
              reports={reports}
              onNewMaintenance={() => setActiveTab('nova_manutencao')}
              onViewReports={() => setActiveTab('relatorios')}
              onSelectReport={(r) => setSelectedReport(r)}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'nova_manutencao' && (
            <NewMaintenanceView
              key={`new-maint-${dataVersion}`}
              currentUser={currentUser}
              onReportSubmitted={handleReportSubmitted}
              onCancel={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'relatorios' && (
            <ReportsView
              key={`reports-${dataVersion}`}
              reports={reports}
              currentUser={currentUser}
              onSelectReport={(r) => setSelectedReport(r)}
              onNewMaintenance={() => setActiveTab('nova_manutencao')}
              onRefresh={handleRefreshData}
            />
          )}

          {activeTab === 'demandas' && (
            <TechnicalDemandsView
              key={`demands-${dataVersion}`}
              currentUser={currentUser}
              onRefresh={handleRefreshData}
            />
          )}

          {activeTab === 'movimentacoes' && (
            <MovementsView
              key={`movements-${dataVersion}`}
              currentUser={currentUser}
              onRefresh={handleRefreshData}
            />
          )}

          {activeTab === 'estoque' && (
            <InventoryView
              key={`inventory-${dataVersion}`}
              currentUser={currentUser}
              onRefresh={handleRefreshData}
            />
          )}

          {activeTab === 'cinemas' && (
            <CinemasView key={`cinemas-${dataVersion}`} currentUser={currentUser} onRefresh={handleRefreshData} />
          )}

          {activeTab === 'salas' && (
            <SalasView key={`salas-${dataVersion}`} currentUser={currentUser} onRefresh={handleRefreshData} />
          )}

          {activeTab === 'equipamentos' && (
            <EquipmentView key={`equip-${dataVersion}`} currentUser={currentUser} onRefresh={handleRefreshData} />
          )}

          {activeTab === 'tecnicos' && (
            <UsersView key={`users-${dataVersion}`} currentUser={currentUser} onRefresh={handleRefreshData} />
          )}

          {activeTab === 'logs' && <LogsView key={`logs-${dataVersion}`} />}

          {activeTab === 'configuracoes' && (
            <SettingsView
              key={`config-${dataVersion}`}
              currentUser={currentUser}
              onRefresh={handleRefreshData}
              isDarkMode={isDarkMode}
              onToggleTheme={handleToggleTheme}
            />
          )}

          {activeTab === 'perfil' && (
            <ProfileView currentUser={currentUser} onRefresh={handleRefreshData} />
          )}

          {activeTab === 'sobre' && <AboutView />}
        </main>

        {/* Global Footer */}
        <footer className="py-4 px-6 text-center text-xs text-gray-500 dark:text-slate-400 border-t border-gray-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 transition-colors mt-auto">
          <p className="font-bold text-gray-800 dark:text-slate-200">
            CalibraCine • Gestão técnica de cinema digital v2.3
          </p>
          <p className="mt-0.5 text-[11px]">
            Desenvolvido por <strong className="text-gray-900 dark:text-slate-100">Ronald Ramos</strong>
          </p>
        </footer>
      </div>

      {/* Report Detail Lightbox/Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          currentUser={currentUser}
          onReportDeleted={handleRefreshData}
        />
      )}
    </div>
  );
}
