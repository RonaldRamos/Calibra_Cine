import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Hourglass,
  Send,
  Building2,
  Film,
  MessageSquare,
  ChevronDown,
  Trash2,
  X,
  User as UserIcon,
  AlertCircle,
  Save,
  Check,
  Edit3,
  CheckSquare,
  Square,
  MinusSquare,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  TechnicalDemand,
  DemandStatus,
  DemandPriority,
  User,
  Cinema,
} from '../types';
import {
  getTechnicalDemands,
  saveTechnicalDemand,
  deleteTechnicalDemand,
  deleteMultipleTechnicalDemands,
  updateDemandStatus,
  updateDemandObservation,
  getCinemas,
  subscribeToStorageUpdates,
} from '../services/storageService';
import { formatDateBR } from '../utils/dateFormatter';

interface TechnicalDemandsViewProps {
  currentUser: User | null;
  onRefresh?: () => void;
}

export const TechnicalDemandsView: React.FC<TechnicalDemandsViewProps> = ({
  currentUser,
}) => {
  const [demands, setDemands] = useState<TechnicalDemand[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCinemaFilter, setSelectedCinemaFilter] = useState<string>('all');

  // Selection state for deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // View mode: 'grid' (cards) or 'list' (tabela/lista)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('calibracine_demands_view_mode');
    return saved === 'list' ? 'list' : 'grid';
  });

  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('calibracine_demands_view_mode', mode);
  };

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedDemandForDetail, setSelectedDemandForDetail] = useState<TechnicalDemand | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    ids: string[];
    items: TechnicalDemand[];
  } | null>(null);

  // New Demand Form State
  const [newCinemaId, setNewCinemaId] = useState('');
  const [newSalaName, setNewSalaName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<DemandPriority>('Média');
  const [formError, setFormError] = useState('');

  // Observation input for detail modal
  const [observationInput, setObservationInput] = useState('');
  const [isSavingObs, setIsSavingObs] = useState(false);
  const [obsSavedFeedback, setObsSavedFeedback] = useState(false);

  const loadData = () => {
    setDemands(getTechnicalDemands());
    setCinemas(getCinemas().filter((c) => !c.status || c.status === 'ativo'));
  };

  useEffect(() => {
    loadData();
    return subscribeToStorageUpdates((type) => {
      if (!type || type === 'demands' || type === 'cinemas') {
        loadData();
      }
    });
  }, []);

  // Clean selected IDs if demands are removed
  useEffect(() => {
    if (selectedIds.length > 0) {
      const validIds = selectedIds.filter((id) => demands.some((d) => d.id === id));
      if (validIds.length !== selectedIds.length) {
        setSelectedIds(validIds);
      }
    }
  }, [demands]);

  // Update selected detail if list changes
  useEffect(() => {
    if (selectedDemandForDetail) {
      const updated = demands.find((d) => d.id === selectedDemandForDetail.id);
      if (updated) {
        setSelectedDemandForDetail(updated);
      }
    }
  }, [demands]);

  // Expiration helper: Checks if demand is overdue
  const isDemandOverdue = (demand: TechnicalDemand): boolean => {
    if (demand.status === 'Concluido') return false;
    if (!demand.dueDate) return false;

    const todayStr = new Date().toISOString().split('T')[0];
    return demand.dueDate < todayStr;
  };

  // Days left or overdue
  const getDueStatusText = (dueDateStr: string, status: DemandStatus) => {
    if (!dueDateStr) return null;
    if (status === 'Concluido') {
      return { text: 'Concluído', color: 'text-emerald-600 dark:text-emerald-400', isOverdue: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = dueDateStr.split('-').map(Number);
    const due = new Date(year, month - 1, day);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Vencida há ${Math.abs(diffDays)} dia(s)`,
        color: 'text-rose-600 dark:text-rose-400 font-bold',
        isOverdue: true,
      };
    } else if (diffDays === 0) {
      return {
        text: 'Vence Hoje!',
        color: 'text-amber-600 dark:text-amber-400 font-bold',
        isOverdue: false,
      };
    } else if (diffDays === 1) {
      return {
        text: 'Vence amanhã',
        color: 'text-amber-500 dark:text-amber-400',
        isOverdue: false,
      };
    } else {
      return {
        text: `Prazo em ${diffDays} dias`,
        color: 'text-slate-500 dark:text-slate-400',
        isOverdue: false,
      };
    }
  };

  // Status configuration styling and icons
  const getStatusBadge = (status: DemandStatus) => {
    switch (status) {
      case 'Pendente':
        return {
          bg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/80',
          icon: Clock,
          label: 'Pendente',
        };
      case 'Solicitado':
        return {
          bg: 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800/80',
          icon: Send,
          label: 'Solicitado',
        };
      case 'Aguardando Aprovação':
        return {
          bg: 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800/80',
          icon: Hourglass,
          label: 'Aguardando Aprovação',
        };
      case 'Concluido':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80',
          icon: CheckCircle2,
          label: 'Concluído',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: Clock,
          label: status,
        };
    }
  };

  // Counts for tabs
  const countTotal = demands.length;
  const countPendente = demands.filter((d) => d.status === 'Pendente').length;
  const countSolicitado = demands.filter((d) => d.status === 'Solicitado').length;
  const countAguardando = demands.filter((d) => d.status === 'Aguardando Aprovação').length;
  const countConcluido = demands.filter((d) => d.status === 'Concluido').length;
  const countVencidas = demands.filter((d) => isDemandOverdue(d)).length;

  // Filter demands
  const filteredDemands = demands.filter((demand) => {
    // Tab filter
    if (selectedStatusTab === 'vencidas') {
      if (!isDemandOverdue(demand)) return false;
    } else if (selectedStatusTab !== 'all') {
      if (demand.status !== selectedStatusTab) return false;
    }

    // Cinema filter
    if (selectedCinemaFilter !== 'all' && demand.cinemaId !== selectedCinemaFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = demand.id.toLowerCase().includes(q);
      const matchTitle = demand.title.toLowerCase().includes(q);
      const matchDesc = demand.description.toLowerCase().includes(q);
      const matchCinema = demand.cinemaName.toLowerCase().includes(q);
      const matchSala = demand.salaName.toLowerCase().includes(q);
      const matchObs = (demand.observations || '').toLowerCase().includes(q);
      return matchId || matchTitle || matchDesc || matchCinema || matchSala || matchObs;
    }

    return true;
  });

  // Selection helpers
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredDemands.map((d) => d.id);
    const allSelected = filteredIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      // Unselect filtered items
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select all filtered items
      const newSet = new Set([...selectedIds, ...filteredIds]);
      setSelectedIds(Array.from(newSet));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const isAllFilteredSelected =
    filteredDemands.length > 0 &&
    filteredDemands.every((d) => selectedIds.includes(d.id));

  const isSomeFilteredSelected =
    filteredDemands.some((d) => selectedIds.includes(d.id)) &&
    !isAllFilteredSelected;

  // Trigger Delete Confirmation Modal for single or selected
  const requestDeleteDemand = (demand: TechnicalDemand) => {
    setDeleteConfirmModal({
      isOpen: true,
      ids: [demand.id],
      items: [demand],
    });
  };

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const itemsToDelete = demands.filter((d) => selectedIds.includes(d.id));
    setDeleteConfirmModal({
      isOpen: true,
      ids: selectedIds,
      items: itemsToDelete,
    });
  };

  // Confirm Deletion Execution
  const handleConfirmDelete = () => {
    if (!deleteConfirmModal) return;

    if (deleteConfirmModal.ids.length === 1) {
      deleteTechnicalDemand(deleteConfirmModal.ids[0], currentUser);
    } else {
      deleteMultipleTechnicalDemands(deleteConfirmModal.ids, currentUser);
    }

    // Clear detail modal if the open demand was deleted
    if (
      selectedDemandForDetail &&
      deleteConfirmModal.ids.includes(selectedDemandForDetail.id)
    ) {
      setSelectedDemandForDetail(null);
    }

    // Clear selection
    setSelectedIds((prev) =>
      prev.filter((id) => !deleteConfirmModal.ids.includes(id))
    );
    setDeleteConfirmModal(null);
  };

  // Handle Save New Demand
  const handleCreateDemand = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newCinemaId) {
      setFormError('Selecione o cinema correspondente.');
      return;
    }
    if (!newSalaName.trim()) {
      setFormError('Digite a sala (ex: Sala 01, Sala 03 IMAX, Cabine Projeção).');
      return;
    }
    if (!newTitle.trim()) {
      setFormError('Digite o título/assunto da demanda.');
      return;
    }
    if (!newDescription.trim()) {
      setFormError('Digite o detalhamento da demanda.');
      return;
    }
    if (!newDueDate) {
      setFormError('Defina o prazo de vencimento da demanda.');
      return;
    }

    const cinemaObj = cinemas.find((c) => c.id === newCinemaId);
    const id = `DEM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newDemand: TechnicalDemand = {
      id,
      cinemaId: newCinemaId,
      cinemaName: cinemaObj?.name || 'Cinema',
      salaName: newSalaName.trim(),
      title: newTitle.trim(),
      description: newDescription.trim(),
      dueDate: newDueDate,
      status: 'Pendente', // Automaticamente inicia como Pendente conforme solicitado
      priority: newPriority,
      createdById: currentUser?.id || 'admin',
      createdByName: currentUser?.name || 'Administrador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveTechnicalDemand(newDemand, currentUser);

    // Reset Form
    setNewCinemaId('');
    setNewSalaName('');
    setNewTitle('');
    setNewDescription('');
    setNewDueDate('');
    setNewPriority('Média');
    setIsNewModalOpen(false);
  };

  // Handle Status change from list or modal
  const handleChangeStatus = (demandId: string, nextStatus: DemandStatus) => {
    updateDemandStatus(demandId, nextStatus, currentUser);
    if (selectedDemandForDetail && selectedDemandForDetail.id === demandId) {
      setSelectedDemandForDetail({
        ...selectedDemandForDetail,
        status: nextStatus,
        completedAt: nextStatus === 'Concluido' ? new Date().toISOString() : undefined,
      });
    }
  };

  // Handle Save Observation in Detail Modal
  const handleSaveObservation = () => {
    if (!selectedDemandForDetail) return;
    if (!observationInput.trim()) return;

    setIsSavingObs(true);
    updateDemandObservation(selectedDemandForDetail.id, observationInput, currentUser);
    setObservationInput('');
    setIsSavingObs(false);
    setObsSavedFeedback(true);
    setTimeout(() => setObsSavedFeedback(false), 2500);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
                Demandas Técnicas
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Controle de chamados, prazos de vencimento e solicitações técnicas dos cinemas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={requestDeleteSelected}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 animate-fade-in"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Selecionadas ({selectedIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setFormError('');
              setIsNewModalOpen(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Demanda</span>
          </button>
        </div>
      </div>

      {/* STATUS TABS MENU */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Todas as Demandas', count: countTotal, color: 'text-gray-700 dark:text-slate-200' },
          { id: 'Pendente', label: 'Pendente', count: countPendente, color: 'text-amber-700 dark:text-amber-400', badgeBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200' },
          { id: 'Solicitado', label: 'Solicitado', count: countSolicitado, color: 'text-sky-700 dark:text-sky-400', badgeBg: 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200' },
          { id: 'Aguardando Aprovação', label: 'Aguardando Aprovação', count: countAguardando, color: 'text-purple-700 dark:text-purple-400', badgeBg: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200' },
          { id: 'Concluido', label: 'Concluído', count: countConcluido, color: 'text-emerald-700 dark:text-emerald-400', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200' },
          { id: 'vencidas', label: 'Vencidas (Alerta)', count: countVencidas, isAlert: true, color: 'text-rose-700 dark:text-rose-400', badgeBg: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200' },
        ].map((tab) => {
          const isActive = selectedStatusTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatusTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/80'
              }`}
            >
              {tab.isAlert && countVencidas > 0 && (
                <AlertTriangle className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-rose-600 animate-pulse'}`} />
              )}
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : tab.badgeBg || 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* FILTER & SEARCH CONTROLS + SELECTION ACTION BAR */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
          {/* Search Input */}
          <div className="relative sm:col-span-6 lg:col-span-7">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ID, cinema, sala, título ou observação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Cinema Filter */}
          <div className="relative sm:col-span-3 lg:col-span-3">
            <select
              value={selectedCinemaFilter}
              onChange={(e) => setSelectedCinemaFilter(e.target.value)}
              aria-label="Filtrar por cinema"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os Cinemas</option>
              {cinemas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle (Grade / Lista) */}
          <div className="sm:col-span-3 lg:col-span-2 flex items-center justify-end">
            <div className="w-full flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                }`}
                title="Exibição em Grade de Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:hidden md:inline">Grade</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('list')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                }`}
                title="Exibição em Formato de Lista"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:hidden md:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>

        {/* SELECTION CONTROLS TOOLBAR */}
        {filteredDemands.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="flex items-center gap-2 text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-colors cursor-pointer"
              >
                {isAllFilteredSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : isSomeFilteredSelected ? (
                  <MinusSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span>
                  {isAllFilteredSelected
                    ? 'Desmarcar Todos'
                    : `Selecionar Todos (${filteredDemands.length})`}
                </span>
              </button>

              {selectedIds.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold rounded-md text-[11px]">
                  {selectedIds.length} selecionada{selectedIds.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Limpar seleção
                </button>
                <button
                  type="button"
                  onClick={requestDeleteSelected}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Selecionadas ({selectedIds.length})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DEMANDS LIST / CARDS */}
      {filteredDemands.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 mx-auto flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
            Nenhuma demanda técnica encontrada
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
            Não há registros correspondentes aos filtros selecionados. Clique em "Cadastrar Demanda" para registrar uma nova solicitação técnica.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* FORMATO DE LISTA / TABELA */
        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      aria-label="Selecionar todas as demandas"
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : isSomeFilteredSelected ? (
                        <MinusSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Código / Prioridade</th>
                  <th className="py-3 px-3">Cinema / Sala</th>
                  <th className="py-3 px-3 min-w-[220px]">Demanda & Detalhes</th>
                  <th className="py-3 px-3 min-w-[150px]">Prazo de Vencimento</th>
                  <th className="py-3 px-3 min-w-[160px]">Status</th>
                  <th className="py-3 px-3 text-right min-w-[130px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredDemands.map((demand) => {
                  const statusConfig = getStatusBadge(demand.status);
                  const StatusIcon = statusConfig.icon;
                  const overdue = isDemandOverdue(demand);
                  const dueInfo = getDueStatusText(demand.dueDate, demand.status);
                  const isSelected = selectedIds.includes(demand.id);

                  return (
                    <tr
                      key={demand.id}
                      className={`hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors ${
                        isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/40'
                          : overdue
                          ? 'bg-rose-50/30 dark:bg-rose-950/20'
                          : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(demand.id)}
                          aria-label={`Selecionar demanda ${demand.id}`}
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Code & Priority */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                            {demand.id}
                          </div>
                          {demand.priority && (
                            <span
                              className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                demand.priority === 'Urgente' || demand.priority === 'Alta'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {demand.priority}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cinema & Sala */}
                      <td className="py-3.5 px-3 align-top">
                        <div className="space-y-0.5 min-w-[140px]">
                          <div className="font-bold text-xs text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Film className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{demand.cinemaName}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                            Sala: <strong className="text-gray-700 dark:text-slate-200">{demand.salaName}</strong>
                          </div>
                        </div>
                      </td>

                      {/* Title, Description & Observation */}
                      <td className="py-3.5 px-3 align-top">
                        <div className="space-y-1">
                          <div className="font-bold text-xs text-gray-900 dark:text-slate-100">
                            {demand.title}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {demand.description}
                          </p>
                          {demand.observations && (
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                              <MessageSquare className="w-3 h-3 shrink-0" />
                              <span className="truncate">Obs: {demand.observations}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Due Date & Alerts */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        {overdue ? (
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 rounded-md font-bold text-[11px]">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>{formatDateBR(demand.dueDate)}</span>
                            </div>
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold pl-0.5">
                              ⚠️ Expirado ({dueInfo?.text})
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs text-gray-800 dark:text-slate-200 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{formatDateBR(demand.dueDate)}</span>
                            </div>
                            {dueInfo && (
                              <div className={`text-[10px] pl-5 font-bold ${dueInfo.color}`}>
                                {dueInfo.text}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status Selector */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <div className="space-y-1.5">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold border ${statusConfig.bg}`}
                          >
                            <StatusIcon className="w-3 h-3 shrink-0" />
                            <span>{statusConfig.label}</span>
                          </div>
                          <div>
                            <select
                              value={demand.status}
                              onChange={(e) => handleChangeStatus(demand.id, e.target.value as DemandStatus)}
                              aria-label="Alterar status"
                              className="px-1.5 py-0.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 rounded-md text-[11px] font-medium cursor-pointer"
                            >
                              <option value="Pendente">Pendente</option>
                              <option value="Solicitado">Solicitado</option>
                              <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                              <option value="Concluido">Concluído</option>
                            </select>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => requestDeleteDemand(demand)}
                            title="Excluir demanda"
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDemandForDetail(demand);
                              setObservationInput(demand.observations || '');
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>Abrir</span>
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* FORMATO DE GRADE (CARDS) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDemands.map((demand) => {
            const statusConfig = getStatusBadge(demand.status);
            const StatusIcon = statusConfig.icon;
            const overdue = isDemandOverdue(demand);
            const dueInfo = getDueStatusText(demand.dueDate, demand.status);
            const isSelected = selectedIds.includes(demand.id);

            return (
              <div
                key={demand.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-2xs transition-all hover:shadow-md flex flex-col justify-between relative ${
                  isSelected
                    ? 'ring-2 ring-blue-500 border-blue-400 dark:border-blue-600 bg-blue-50/10'
                    : overdue
                    ? 'border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-500/20'
                    : 'border-[#E5E7EB] dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Top Bar: Selection Checkbox, Code ID, Cinema, Sala and Status Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                    <div className="flex items-start gap-2.5">
                      {/* Selection Checkbox Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleSelectOne(demand.id)}
                        aria-label={`Selecionar demanda ${demand.id}`}
                        className="mt-0.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                        )}
                      </button>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                            {demand.id}
                          </span>
                          {demand.priority && (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                demand.priority === 'Urgente' || demand.priority === 'Alta'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {demand.priority}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-gray-900 dark:text-slate-100 flex items-center gap-1.5 pt-1">
                          <Film className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">{demand.cinemaName}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                          Sala: <strong className="text-gray-700 dark:text-slate-200">{demand.salaName}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="relative group shrink-0">
                      <div
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${statusConfig.bg}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{statusConfig.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="pt-3 space-y-1.5">
                    <h3 className="text-sm font-black text-gray-900 dark:text-slate-100 leading-snug">
                      {demand.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {demand.description}
                    </p>
                  </div>

                  {/* OVERDUE / DUE DATE ALERT */}
                  <div className="mt-3">
                    {overdue ? (
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-300 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <span>⚠️ ALERTA DE VENCIMENTO: </span>
                          <span className="font-normal text-[11px]">
                            Prazo expirou em <strong>{formatDateBR(demand.dueDate)}</strong> ({dueInfo?.text})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Prazo de Vencimento:</span>
                        <strong className="text-gray-800 dark:text-slate-200">{formatDateBR(demand.dueDate)}</strong>
                        {dueInfo && <span className={`text-[11px] ml-1 ${dueInfo.color}`}>({dueInfo.text})</span>}
                      </div>
                    )}
                  </div>

                  {/* Observação rápida se existir */}
                  {demand.observations && (
                    <div className="mt-3 p-2 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/80 rounded-xl text-[11px] text-gray-600 dark:text-slate-300 flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                      <div className="truncate">
                        <strong>Obs:</strong> {demand.observations}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions: Quick Status Selector, Open Detail & Individual Delete Button */}
                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {/* Quick Change Status Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">Status:</span>
                    <select
                      value={demand.status}
                      onChange={(e) => handleChangeStatus(demand.id, e.target.value as DemandStatus)}
                      aria-label="Alterar status da demanda"
                      className="px-2 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 rounded-lg text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Solicitado">Solicitado</option>
                      <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                      <option value="Concluido">Concluído</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Individual Delete Button */}
                    <button
                      type="button"
                      onClick={() => requestDeleteDemand(demand)}
                      title="Excluir esta demanda"
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Open Detail Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDemandForDetail(demand);
                        setObservationInput(demand.observations || '');
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Abrir Demanda</span>
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO (INDIVIDUAL OU EM MASSA) */}
      {deleteConfirmModal && deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-70 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl my-8 text-xs">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                  {deleteConfirmModal.ids.length === 1
                    ? 'Excluir Demanda Técnica'
                    : `Excluir ${deleteConfirmModal.ids.length} Demandas Selecionadas`}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Esta ação é permanente e removerá o(s) registro(s).
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 rounded-xl space-y-2 text-rose-900 dark:text-rose-200">
              <p className="font-bold text-xs">
                Tem certeza que deseja excluir permanentemente {deleteConfirmModal.ids.length === 1 ? 'a seguinte demanda' : `as ${deleteConfirmModal.ids.length} demandas abaixo`}?
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-none pt-1">
                {deleteConfirmModal.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-white/80 dark:bg-slate-900/80 border border-rose-200/80 dark:border-rose-900/60 rounded-lg text-[11px] text-gray-800 dark:text-slate-200"
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-[10px] text-slate-600 dark:text-slate-400">
                      <span>{item.id}</span>
                      <span>{item.cinemaName} - {item.salaName}</span>
                    </div>
                    <div className="font-bold text-gray-900 dark:text-slate-100 truncate mt-0.5">
                      {item.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR NOVA DEMANDA */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-60 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                  Cadastrar Nova Demanda Técnica
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDemand} className="space-y-4 text-xs">
              {/* Cinema Selector */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Cinema <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newCinemaId}
                  onChange={(e) => setNewCinemaId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">Selecione o cinema...</option>
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city} - {c.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sala (Campo para Digitação) */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Sala (Digite o nome/número da sala) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sala 01, Sala 03 (IMAX), Sala VIP 2, Cabine Central..."
                  value={newSalaName}
                  onChange={(e) => setNewSalaName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Título da Demanda */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Título / Assunto da Demanda <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Troca da lâmpada de projeção / Calibração de som Dolby"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Descrição Detalhada da Demanda */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Detalhamento da Demanda <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva detalhadamente a necessidade técnica, equipamentos envolvidos, defeito observado ou serviço solicitado..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Prazo de Vencimento e Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Prazo de Vencimento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as DemandPriority)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Status Note */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  A demanda será registrada automaticamente com o status <strong>"Pendente"</strong>. Você poderá atualizar o status para Solicitado, Aguardando Aprovação ou Concluído a qualquer momento.
                </span>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-[#E5E7EB] dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Salvar Demanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ABRIR DETALHES DA DEMANDA + DIGITAR OBSERVAÇÃO */}
      {selectedDemandForDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-60 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 text-xs">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 font-mono font-bold text-xs text-slate-800 dark:text-slate-200 rounded-md">
                    {selectedDemandForDetail.id}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500 dark:text-slate-400 text-xs">
                    Criado em: {new Date(selectedDemandForDetail.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <h2 className="text-lg font-black text-gray-900 dark:text-slate-100">
                  {selectedDemandForDetail.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDemandForDetail(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Info Card */}
            <div className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-slate-400 font-medium">Cinema:</span>
                  <p className="font-bold text-gray-900 dark:text-slate-100 mt-0.5">{selectedDemandForDetail.cinemaName}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 font-medium">Sala:</span>
                  <p className="font-bold text-gray-900 dark:text-slate-100 mt-0.5">{selectedDemandForDetail.salaName}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 font-medium">Prazo de Vencimento:</span>
                  <p className="font-bold text-gray-900 dark:text-slate-100 mt-0.5">{selectedDemandForDetail.dueDate}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 font-medium">Prioridade:</span>
                  <p className="font-bold text-gray-900 dark:text-slate-100 mt-0.5">{selectedDemandForDetail.priority || 'Média'}</p>
                </div>
              </div>

              {/* OVERDUE WARNING IN MODAL */}
              {isDemandOverdue(selectedDemandForDetail) && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    ALERTA DE VENCIMENTO: Esta demanda ultrapassou a data limite ({selectedDemandForDetail.dueDate}) e requer atenção técnica imediata!
                  </span>
                </div>
              )}
            </div>

            {/* Demand Description */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Descrição da Demanda
              </h4>
              <div className="p-3.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-800 dark:text-slate-200 leading-relaxed text-xs">
                {selectedDemandForDetail.description}
              </div>
            </div>

            {/* STATUS SELECTOR MENU */}
            <div className="space-y-2">
              <h4 className="font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Alterar Status da Demanda
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Pendente', label: 'Pendente', icon: Clock, activeClass: 'bg-amber-600 text-white border-amber-600 shadow-xs' },
                  { id: 'Solicitado', label: 'Solicitado', icon: Send, activeClass: 'bg-sky-600 text-white border-sky-600 shadow-xs' },
                  { id: 'Aguardando Aprovação', label: 'Aguardando Aprovação', icon: Hourglass, activeClass: 'bg-purple-600 text-white border-purple-600 shadow-xs' },
                  { id: 'Concluido', label: 'Concluído', icon: CheckCircle2, activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs' },
                ].map((s) => {
                  const isCur = selectedDemandForDetail.status === s.id;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleChangeStatus(selectedDemandForDetail.id, s.id as DemandStatus)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        isCur
                          ? s.activeClass
                          : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-center">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* OBSERVATION TEXT FIELD */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                  <span>Texto de Observação / Parecer Técnico</span>
                </h4>
                {obsSavedFeedback && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Observação salva com sucesso!</span>
                  </span>
                )}
              </div>

              <textarea
                rows={3}
                placeholder="Digite aqui anotações, atualizações de status, peças solicitadas ou observações sobre esta demanda..."
                value={observationInput}
                onChange={(e) => setObservationInput(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveObservation}
                  disabled={isSavingObs || !observationInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Observação</span>
                </button>
              </div>

              {/* Observation History */}
              {selectedDemandForDetail.observationHistory && selectedDemandForDetail.observationHistory.length > 0 && (
                <div className="pt-2 space-y-2">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                    Histórico de Observações ({selectedDemandForDetail.observationHistory.length}):
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-none">
                    {selectedDemandForDetail.observationHistory.map((obs) => (
                      <div
                        key={obs.id}
                        className="p-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 text-[10px]">
                          <strong>{obs.authorName}</strong>
                          <span>{new Date(obs.createdAt).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="text-gray-800 dark:text-slate-200">{obs.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  requestDeleteDemand(selectedDemandForDetail);
                }}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Demanda</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDemandForDetail(null)}
                className="px-5 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

