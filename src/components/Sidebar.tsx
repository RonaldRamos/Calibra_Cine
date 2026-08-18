import React from 'react';
import { CalibraCineLogo } from './CalibraCineLogo';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  ClipboardList,
  Film,
  Tv,
  Cpu,
  Users,
  ShieldCheck,
  Settings,
  User as UserIcon,
  LogOut,
  X,
  Clapperboard,
  Info,
  ArrowLeftRight,
  Boxes,
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  isOpen,
  onClose,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { id: 'nova_manutencao', label: 'Nova Manutenção', icon: PlusCircle, adminOnly: false, highlight: true },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, adminOnly: false },
    { id: 'demandas', label: 'Demandas Técnicas', icon: ClipboardList, adminOnly: false },
    { id: 'movimentacoes', label: 'Movimentações', icon: ArrowLeftRight, adminOnly: false },
    { id: 'estoque', label: 'Estoque', icon: Boxes, adminOnly: false },
    { id: 'cinemas', label: 'Cinemas', icon: Film, adminOnly: true },
    { id: 'salas', label: 'Salas', icon: Tv, adminOnly: true },
    { id: 'equipamentos', label: 'Equipamentos', icon: Cpu, adminOnly: true },
    { id: 'tecnicos', label: 'Técnicos & Usuários', icon: Users, adminOnly: true },
    { id: 'logs', label: 'Logs & Auditoria', icon: ShieldCheck, adminOnly: true },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
    { id: 'sobre', label: 'Sobre o App', icon: Info, adminOnly: false },
    { id: 'perfil', label: 'Meu Perfil', icon: UserIcon, adminOnly: false },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#111625] text-slate-200 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full justify-between py-4">
          <div>
            {/* Brand Header */}
            <div className="px-5 pb-5 flex items-center justify-between border-b border-slate-800/80">
              <CalibraCineLogo size="md" />
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="px-3 pt-4 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)] scrollbar-none">
              {navItems.map((item) => {
                if (item.adminOnly && !isAdmin) return null;

                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Footer Section */}
          <div className="px-3 space-y-1 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => {
                setActiveTab('perfil');
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                activeTab === 'perfil'
                  ? 'bg-blue-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <UserIcon className="w-4.5 h-4.5" />
              <span>Meu Perfil</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>Sair</span>
            </button>

            {/* App & Creator Credit Footer */}
            <div className="pt-3 pb-1 text-center border-t border-slate-800/60">
              <p className="text-[11px] font-bold text-slate-300">CalibraCine v2.3</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Desenvolvido por <span className="text-slate-300 font-medium">Ronald Ramos</span></p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
