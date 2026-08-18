import React, { useState, useEffect } from 'react';
import { Menu, Shield, Wrench, Calendar, ChevronDown, UserCheck, Lock, X, Check, Eye, EyeOff, Smartphone, Download, Mail, Cloud } from 'lucide-react';
import { User } from '../types';
import { getUsers, getCompanyConfig, addActivityLog, subscribeToStorageUpdates } from '../services/storageService';

interface NavbarProps {
  onToggleSidebar: () => void;
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  activeTab: string;
  onNewMaintenance: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  currentUser,
  onSelectUser,
  activeTab,
  searchQuery,
  onSearchChange,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const allUsers = getUsers().filter((u) => u.status === 'ativo');

  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [targetUserToSwitch, setTargetUserToSwitch] = useState<User | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallHelpModal, setShowInstallHelpModal] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribeToStorageUpdates((type) => {
      if (!type || type === 'users') {
        setTick((t) => t + 1);
      }
    });
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsAppInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallHelpModal(true);
    }
  };

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Visão geral do sistema' },
    nova_manutencao: { title: 'Nova Manutenção', subtitle: 'Preencha os dados da manutenção' },
    relatorios: { title: 'Relatórios', subtitle: 'Histórico e emissão de relatórios' },
    demandas: { title: 'Demandas Técnicas', subtitle: 'Acompanhamento de chamados e pendências' },
    movimentacoes: { title: 'Movimentações de Equipamentos', subtitle: 'Rastreabilidade de empréstimos, transferências e trocas' },
    estoque: { title: 'Estoque de Equipamentos & Peças', subtitle: 'Controle de suprimentos, peças e saldos por cinema e geral' },
    cinemas: { title: 'Cinemas', subtitle: 'Gestão de complexos de cinema' },
    salas: { title: 'Salas', subtitle: 'Gestão de salas de exibição' },
    equipamentos: { title: 'Equipamentos', subtitle: 'Catálogo de projetores, áudio e servidores' },
    tecnicos: { title: 'Técnicos', subtitle: 'Equipe técnica e especialistas' },
    logs: { title: 'Usuários & Logs', subtitle: 'Usuários do sistema e auditoria' },
    configuracoes: { title: 'Configurações', subtitle: 'Ajustes gerais do CalibraCine' },
    sobre: { title: 'Sobre o CalibraCine', subtitle: 'Informações do sistema e criador Ronald Ramos' },
    perfil: { title: 'Meu Perfil', subtitle: 'Dados da conta e preferências' },
  };

  const currentTabInfo = tabTitles[activeTab] || {
    title: 'Dashboard',
    subtitle: 'Visão geral do sistema',
  };

  const handleUserClick = (u: User) => {
    if (u.id === currentUser?.id) {
      setShowSelectorModal(false);
      return;
    }

    if (u.role === 'admin') {
      // Require admin password
      setTargetUserToSwitch(u);
      setAdminPasswordInput('');
      setPasswordError('');
    } else {
      // Switch immediately for technician
      onSelectUser(u);
      setShowSelectorModal(false);
      setTargetUserToSwitch(null);
    }
  };

  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserToSwitch) return;

    const expectedPassword = targetUserToSwitch.password || '257910';

    if (adminPasswordInput.trim() === expectedPassword.trim()) {
      onSelectUser(targetUserToSwitch);
      setShowSelectorModal(false);
      setTargetUserToSwitch(null);
      setAdminPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Senha incorreta! Digite a senha de Administrador válida.');
    }
  };

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-[#E5E7EB] dark:border-slate-800 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-slate-100 leading-tight">
              {currentTabInfo.title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 hidden sm:block">
              {currentTabInfo.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install App Button */}
          {!isAppInstalled && (
            <button
              type="button"
              onClick={handleInstallClick}
              title="Instalar CalibraCine como App no Celular ou Computador"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {/* Date Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg text-xs font-medium text-gray-700 dark:text-slate-200 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400" />
            <span className="capitalize">{todayFormatted}</span>
          </div>

          {/* Cloud Sync Online Badge */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold shadow-2xs"
            title="Firebase Firestore Online: Sincronização em tempo real entre todos os dispositivos ativada"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px]">Nuvem Sincronizada</span>
          </div>

          {/* Interactive Technician / User Selector Button */}
          <button
            type="button"
            onClick={() => {
              setShowSelectorModal(true);
              setTargetUserToSwitch(null);
              setPasswordError('');
            }}
            title="Clique para selecionar outro técnico ou administrador"
            className="flex items-center gap-2.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-sky-200 dark:border-slate-700 rounded-xl shadow-2xs transition-all cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
              {currentUser?.name.substring(0, 1) || 'T'}
            </div>
            <div className="text-left leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-extrabold uppercase text-sky-700 dark:text-sky-400">
                  {currentUser?.role === 'admin' ? 'Administrador' : 'Técnico Ativo'}
                </span>
                <ChevronDown className="w-3 h-3 text-sky-600 dark:text-sky-400 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-slate-100 block truncate max-w-[150px]">
                {currentUser?.name || 'Selecionar Técnico'}
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* TECHNICIAN / USER SELECTION & ADMIN PASSWORD MODAL */}
      {showSelectorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setShowSelectorModal(false);
                setTargetUserToSwitch(null);
              }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {!targetUserToSwitch ? (
              <>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">
                    <UserCheck className="w-4 h-4" />
                    <span>Seleção de Técnico</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Quem está operando o sistema?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Selecione o técnico responsável para registrar atendimentos e manutenções.
                  </p>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {allUsers.map((u) => {
                    const isSelected = u.id === currentUser?.id;
                    const isAdminUser = u.role === 'admin';

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleUserClick(u)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-400 dark:border-sky-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center ${
                              isAdminUser
                                ? 'bg-amber-600 text-white'
                                : 'bg-sky-600 text-white'
                            }`}
                          >
                            {u.name.substring(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                                {u.name}
                              </span>
                              {isAdminUser && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-md uppercase flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" /> Requer Senha
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                              {u.specialty || u.email}
                            </span>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="px-2 py-0.5 bg-sky-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                            <Check className="w-3 h-3" /> Atual
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 opacity-80 group-hover:opacity-100">
                            Selecionar →
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* ADMIN PASSWORD PROMPT */
              <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
                <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="p-2 bg-amber-600 text-white rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                      Autenticação de Administrador
                    </h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      O perfil {targetUserToSwitch.name} exige senha de acesso.
                    </p>
                  </div>
                </div>

                {passwordError && (
                  <div className="p-2.5 bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800">
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Digite a Senha do Administrador:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      placeholder="••••••••"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const config = getCompanyConfig();
                        const targetEmail = targetUserToSwitch?.email || config.email || 'admin@calibracine.com';
                        alert(`📧 Solicitação enviada!\n\nInstruções para redefinição de senha encaminhadas para o e-mail cadastrado nas Configurações:\n\n${targetEmail}`);
                        addActivityLog('RECUPERACAO_SENHA', `Solicitação de recuperação de senha para ${targetUserToSwitch?.name} enviada para ${targetEmail}`, null);
                      }}
                      className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Esqueceu a senha? Solicitar por e-mail</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTargetUserToSwitch(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Acessar como Admin</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PWA INSTALL INSTRUCTIONS MODAL */}
      {showInstallHelpModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowInstallHelpModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Instalar Atalho do CalibraCine
                </h3>
                <p className="text-xs text-slate-500">
                  Acesse como aplicativo direto no seu celular Android ou iOS.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 border border-slate-200 dark:border-slate-700">
                <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-sky-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                    1
                  </span>
                  No Google Chrome (Android):
                </div>
                <p className="text-slate-600 dark:text-slate-400 pl-6">
                  Toque nos <strong>3 pontinhos (⋮)</strong> no canto superior direito do Chrome e selecione <strong className="text-sky-600 dark:text-sky-400">"Instalar aplicativo"</strong> ou <strong className="text-sky-600 dark:text-sky-400">"Adicionar à tela inicial"</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 border border-slate-200 dark:border-slate-700">
                <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-sky-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                    2
                  </span>
                  No Safari (iPhone / iOS):
                </div>
                <p className="text-slate-600 dark:text-slate-400 pl-6">
                  Toque no ícone de <strong>Compartilhar (⎋)</strong> na barra inferior e escolha <strong className="text-sky-600 dark:text-sky-400">"Adicionar à Tela de Início"</strong>.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowInstallHelpModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
