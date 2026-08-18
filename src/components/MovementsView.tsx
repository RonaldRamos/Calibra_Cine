import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Calendar,
  Building2,
  Film,
  Package,
  CheckSquare,
  Square,
  MinusSquare,
  LayoutGrid,
  List,
  ArrowRight,
  Repeat,
  Share2,
  HelpCircle,
  X,
  FileCheck,
  AlertCircle,
  Info,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  EquipmentMovement,
  MovementType,
  MovementStatus,
  EquipmentCategory,
  User,
} from '../types';
import {
  getMovements,
  saveMovement,
  deleteMovement,
  deleteMultipleMovements,
  completeMovement,
  updateMovementStatus,
  getCinemas,
  getEquipmentModels,
} from '../services/storageService';

interface MovementsViewProps {
  currentUser: User | null;
  onRefresh?: () => void;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  currentUser,
  onRefresh,
}) => {
  const movements = getMovements();
  const cinemas = getCinemas();
  const equipmentModels = getEquipmentModels();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<MovementType | 'all'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<MovementStatus | 'all'>('all');
  const [selectedSourceCinema, setSelectedSourceCinema] = useState<string>('all');
  const [selectedDestinationCinema, setSelectedDestinationCinema] = useState<string>('all');

  // View Mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('calibracine_movements_view_mode');
    return saved === 'list' ? 'list' : 'grid';
  });

  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('calibracine_movements_view_mode', mode);
  };

  // Selection State for Bulk Operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<EquipmentMovement | null>(null);
  const [selectedMovementForDetail, setSelectedMovementForDetail] = useState<EquipmentMovement | null>(null);
  const [movementToComplete, setMovementToComplete] = useState<EquipmentMovement | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<EquipmentMovement | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    id: '',
    equipmentDescription: '',
    equipmentCategory: 'projetor' as EquipmentCategory | string,
    equipmentSerial: '',
    equipmentModel: '',
    sourceCinemaId: '',
    sourceCinemaName: '',
    sourceSalaName: '',
    destinationCinemaId: '',
    destinationCinemaName: '',
    destinationSalaName: '',
    type: 'Emprestado' as MovementType,
    status: 'Em Andamento' as MovementStatus,
    date: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    reason: '',
    notes: '',
  });

  // Filter Movements
  const filteredMovements = movements.filter((m) => {
    // Type filter
    if (selectedTypeFilter !== 'all' && m.type !== selectedTypeFilter) return false;

    // Status filter
    if (selectedStatusFilter !== 'all' && m.status !== selectedStatusFilter) return false;

    // Source cinema filter
    if (selectedSourceCinema !== 'all' && m.sourceCinemaId !== selectedSourceCinema) return false;

    // Destination cinema filter
    if (selectedDestinationCinema !== 'all' && m.destinationCinemaId !== selectedDestinationCinema) return false;

    // Text search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = m.id.toLowerCase().includes(q);
      const matchDesc = m.equipmentDescription.toLowerCase().includes(q);
      const matchSerial = m.equipmentSerial?.toLowerCase().includes(q) || false;
      const matchModel = m.equipmentModel?.toLowerCase().includes(q) || false;
      const matchSrc = m.sourceCinemaName.toLowerCase().includes(q);
      const matchDst = m.destinationCinemaName.toLowerCase().includes(q);
      const matchReason = m.reason?.toLowerCase().includes(q) || false;
      const matchNotes = m.notes?.toLowerCase().includes(q) || false;

      if (!matchId && !matchDesc && !matchSerial && !matchModel && !matchSrc && !matchDst && !matchReason && !matchNotes) {
        return false;
      }
    }

    return true;
  });

  // Statistics
  const totalCount = movements.length;
  const inProgressCount = movements.filter((m) => m.status === 'Em Andamento').length;
  const completedCount = movements.filter((m) => m.status === 'Finalizado').length;
  const loanCount = movements.filter((m) => m.type === 'Emprestado').length;
  const transferCount = movements.filter((m) => m.type === 'Transferência Permanente').length;
  const swapCount = movements.filter((m) => m.type === 'Troca').length;

  // Selection handlers
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredMovements.map((m) => m.id);
    const allSelected = filteredIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      // Unselect filtered
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select all filtered
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const isAllFilteredSelected =
    filteredMovements.length > 0 &&
    filteredMovements.every((m) => selectedIds.includes(m.id));
  const isSomeFilteredSelected =
    filteredMovements.some((m) => selectedIds.includes(m.id)) && !isAllFilteredSelected;

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const newSeq = (movements.length + 1).toString().padStart(3, '0');
    const newId = `MOV-${new Date().getFullYear()}-${newSeq}`;

    setEditingMovement(null);
    setFormData({
      id: newId,
      equipmentDescription: '',
      equipmentCategory: 'projetor',
      equipmentSerial: '',
      equipmentModel: '',
      sourceCinemaId: cinemas[0]?.id || '',
      sourceCinemaName: cinemas[0]?.name || '',
      sourceSalaName: '',
      destinationCinemaId: cinemas[1]?.id || '',
      destinationCinemaName: cinemas[1]?.name || '',
      destinationSalaName: '',
      type: 'Emprestado',
      status: 'Em Andamento',
      date: new Date().toISOString().split('T')[0],
      expectedReturnDate: '',
      reason: '',
      notes: '',
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (mov: EquipmentMovement) => {
    setEditingMovement(mov);
    setFormData({
      id: mov.id,
      equipmentDescription: mov.equipmentDescription,
      equipmentCategory: mov.equipmentCategory || 'projetor',
      equipmentSerial: mov.equipmentSerial || '',
      equipmentModel: mov.equipmentModel || '',
      sourceCinemaId: mov.sourceCinemaId,
      sourceCinemaName: mov.sourceCinemaName,
      sourceSalaName: mov.sourceSalaName || '',
      destinationCinemaId: mov.destinationCinemaId,
      destinationCinemaName: mov.destinationCinemaName,
      destinationSalaName: mov.destinationSalaName || '',
      type: mov.type,
      status: mov.status,
      date: mov.date,
      expectedReturnDate: mov.expectedReturnDate || '',
      reason: mov.reason || '',
      notes: mov.notes || '',
    });
    setIsFormModalOpen(true);
  };

  // Save Movement Form
  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.equipmentDescription.trim()) {
      alert('Por favor, informe a descrição do equipamento.');
      return;
    }
    if (!formData.sourceCinemaId) {
      alert('Por favor, selecione o cinema de origem.');
      return;
    }
    if (!formData.destinationCinemaId) {
      alert('Por favor, selecione o cinema de destino.');
      return;
    }
    if (formData.sourceCinemaId === formData.destinationCinemaId) {
      alert('O cinema de origem e o cinema de destino não podem ser os mesmos.');
      return;
    }

    const sourceCinema = cinemas.find((c) => c.id === formData.sourceCinemaId);
    const destinationCinema = cinemas.find((c) => c.id === formData.destinationCinemaId);

    const now = new Date().toISOString();
    const movementToPersist: EquipmentMovement = {
      id: formData.id || `MOV-${Date.now()}`,
      equipmentDescription: formData.equipmentDescription.trim(),
      equipmentCategory: formData.equipmentCategory,
      equipmentSerial: formData.equipmentSerial.trim() || undefined,
      equipmentModel: formData.equipmentModel.trim() || undefined,
      sourceCinemaId: formData.sourceCinemaId,
      sourceCinemaName: sourceCinema?.name || formData.sourceCinemaName,
      sourceSalaName: formData.sourceSalaName.trim() || undefined,
      destinationCinemaId: formData.destinationCinemaId,
      destinationCinemaName: destinationCinema?.name || formData.destinationCinemaName,
      destinationSalaName: formData.destinationSalaName.trim() || undefined,
      type: formData.type,
      status: formData.status,
      date: formData.date || now.split('T')[0],
      expectedReturnDate: formData.type === 'Emprestado' && formData.expectedReturnDate ? formData.expectedReturnDate : undefined,
      reason: formData.reason.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      createdById: editingMovement ? editingMovement.createdById : currentUser?.id,
      createdByName: editingMovement ? editingMovement.createdByName : (currentUser?.name || 'Técnico'),
      createdAt: editingMovement ? editingMovement.createdAt : now,
      updatedAt: now,
      completedAt: formData.status === 'Finalizado' ? (editingMovement?.completedAt || now) : undefined,
      completedNotes: editingMovement?.completedNotes,
      completedById: editingMovement?.completedById,
      completedByName: editingMovement?.completedByName,
    };

    saveMovement(movementToPersist, currentUser);
    setIsFormModalOpen(false);
    if (onRefresh) onRefresh();
  };

  // Quick Finish / Complete Handler
  const handleOpenCompleteModal = (mov: EquipmentMovement) => {
    setMovementToComplete(mov);
    setCompletionNotes('');
  };

  const handleConfirmComplete = () => {
    if (!movementToComplete) return;

    completeMovement(movementToComplete.id, completionNotes.trim() || undefined, currentUser);
    setMovementToComplete(null);
    setCompletionNotes('');
    if (onRefresh) onRefresh();
  };

  // Delete Handlers
  const requestDeleteSingle = (mov: EquipmentMovement) => {
    setItemToDelete(mov);
    setIsBulkDelete(false);
    setIsDeleteModalOpen(true);
  };

  const requestDeleteBulk = () => {
    if (selectedIds.length === 0) return;
    setIsBulkDelete(true);
    setItemToDelete(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (isBulkDelete) {
      deleteMultipleMovements(selectedIds, currentUser);
      setSelectedIds([]);
    } else if (itemToDelete) {
      deleteMovement(itemToDelete.id, currentUser);
      setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete.id));
    }

    setIsDeleteModalOpen(false);
    setItemToDelete(null);
    setIsBulkDelete(false);
    if (selectedMovementForDetail && (isBulkDelete ? selectedIds.includes(selectedMovementForDetail.id) : selectedMovementForDetail.id === itemToDelete?.id)) {
      setSelectedMovementForDetail(null);
    }
    if (onRefresh) onRefresh();
  };

  // Type Badges Helper
  const getTypeBadge = (type: MovementType) => {
    switch (type) {
      case 'Emprestado':
        return {
          label: 'Emprestado',
          bg: 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          icon: Share2,
        };
      case 'Transferência Permanente':
        return {
          label: 'Transferência Permanente',
          bg: 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          icon: ArrowRight,
        };
      case 'Troca':
        return {
          label: 'Troca',
          bg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: Repeat,
        };
      default:
        return {
          label: type,
          bg: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700',
          icon: ArrowLeftRight,
        };
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: MovementStatus) => {
    if (status === 'Finalizado') {
      return {
        label: 'Finalizado',
        bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        icon: CheckCircle2,
      };
    }
    return {
      label: 'Em Andamento',
      bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      icon: Clock,
    };
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/80 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-white tracking-tight">
                Movimentações de Equipamentos
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                Rastreabilidade de empréstimos, transferências e trocas de ativos entre cinemas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Movimentação</span>
          </button>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => {
            setSelectedTypeFilter('all');
            setSelectedStatusFilter('all');
          }}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedTypeFilter === 'all' && selectedStatusFilter === 'all'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">Total</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{totalCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusFilter('Em Andamento')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedStatusFilter === 'Em Andamento'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Em Andamento
          </div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">{inProgressCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTypeFilter('Emprestado')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedTypeFilter === 'Emprestado'
              ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <Share2 className="w-3 h-3" /> Emprestados
          </div>
          <div className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-0.5">{loanCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTypeFilter('Transferência Permanente')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedTypeFilter === 'Transferência Permanente'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Transferências
          </div>
          <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">{transferCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTypeFilter('Troca')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedTypeFilter === 'Troca'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Repeat className="w-3 h-3" /> Trocas
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{swapCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusFilter('Finalizado')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedStatusFilter === 'Finalizado'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Finalizados
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{completedCount}</div>
        </button>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="space-y-3">
        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-3">
          {/* Top Row: Search & View Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-8 lg:col-span-9">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por equipamento, número de série, modelo, cinema, motivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="md:col-span-4 lg:col-span-3 flex items-center justify-end">
              <div className="w-full flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleToggleViewMode('grid')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                  }`}
                  title="Exibição em Grade de Cards"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grade</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleViewMode('list')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                  }`}
                  title="Exibição em Formato de Lista / Tabela"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Lista</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Detailed Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
            {/* Type Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Tipo de Movimentação
              </label>
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value as MovementType | 'all')}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Todos os Tipos</option>
                <option value="Emprestado">Emprestado</option>
                <option value="Transferência Permanente">Transferência Permanente</option>
                <option value="Troca">Troca</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Status do Processo
              </label>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as MovementStatus | 'all')}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>

            {/* Source Cinema Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Cinema de Origem
              </label>
              <select
                value={selectedSourceCinema}
                onChange={(e) => setSelectedSourceCinema(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Qualquer Origem</option>
                {cinemas.map((c) => (
                  <option key={`src-${c.id}`} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Cinema Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Cinema de Destino
              </label>
              <select
                value={selectedDestinationCinema}
                onChange={(e) => setSelectedDestinationCinema(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Qualquer Destino</option>
                {cinemas.map((c) => (
                  <option key={`dst-${c.id}`} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SELECTION CONTROLS TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-gray-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-800 rounded-xl text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="flex items-center gap-2 font-medium text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : isSomeFilteredSelected ? (
                <MinusSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
              <span>
                {isAllFilteredSelected
                  ? 'Desmarcar Todos'
                  : `Selecionar Todos (${filteredMovements.length})`}
              </span>
            </button>

            {selectedIds.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                {selectedIds.length} selecionada{selectedIds.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-1 text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  Limpar Seleção
                </button>
                <button
                  type="button"
                  onClick={requestDeleteBulk}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition-all shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Selecionadas ({selectedIds.length})</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MOVEMENTS CONTENT DISPLAY */}
      {filteredMovements.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-gray-400">
            <ArrowLeftRight className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Nenhuma movimentação encontrada
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            Não há registros correspondentes aos filtros selecionados. Clique em "Nova Movimentação" para registrar um novo deslocamento de equipamento.
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
                      aria-label="Selecionar todas as movimentações"
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
                  <th className="py-3 px-3">Código / Tipo</th>
                  <th className="py-3 px-3 min-w-[220px]">Equipamento & Detalhes</th>
                  <th className="py-3 px-3 min-w-[200px]">Rota (Origem ➔ Destino)</th>
                  <th className="py-3 px-3 min-w-[130px]">Datas</th>
                  <th className="py-3 px-3 min-w-[130px]">Status</th>
                  <th className="py-3 px-3 text-right min-w-[150px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredMovements.map((mov) => {
                  const typeBadge = getTypeBadge(mov.type);
                  const statusBadge = getStatusBadge(mov.status);
                  const TypeIcon = typeBadge.icon;
                  const StatusIcon = statusBadge.icon;
                  const isSelected = selectedIds.includes(mov.id);

                  return (
                    <tr
                      key={mov.id}
                      className={`hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors ${
                        isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/40'
                          : mov.status === 'Finalizado'
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(mov.id)}
                          aria-label={`Selecionar movimentação ${mov.id}`}
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Code & Type */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                            {mov.id}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${typeBadge.bg}`}
                          >
                            <TypeIcon className="w-3 h-3" />
                            {typeBadge.label}
                          </span>
                        </div>
                      </td>

                      {/* Equipment & Details */}
                      <td className="py-3.5 px-3 align-top">
                        <div className="space-y-1">
                          <div className="font-bold text-xs text-gray-900 dark:text-slate-100 flex items-start gap-1.5">
                            <Package className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                            <span>{mov.equipmentDescription}</span>
                          </div>
                          {(mov.equipmentModel || mov.equipmentSerial) && (
                            <div className="text-[11px] text-gray-500 dark:text-slate-400 flex flex-wrap gap-2">
                              {mov.equipmentModel && <span>Modelo: <strong>{mov.equipmentModel}</strong></span>}
                              {mov.equipmentSerial && <span>S/N: <strong className="font-mono">{mov.equipmentSerial}</strong></span>}
                            </div>
                          )}
                          {mov.reason && (
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-1 italic">
                              Motivo: {mov.reason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Route (Source -> Destination) */}
                      <td className="py-3.5 px-3 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300">
                            <span className="font-semibold text-rose-600 dark:text-rose-400 text-[10px] uppercase tracking-wider">Origem:</span>
                            <span className="font-bold truncate">{mov.sourceCinemaName}</span>
                            {mov.sourceSalaName && <span className="text-gray-400 text-[11px]">({mov.sourceSalaName})</span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-wider">Destino:</span>
                            <span className="font-bold truncate">{mov.destinationCinemaName}</span>
                            {mov.destinationSalaName && <span className="text-gray-400 text-[11px]">({mov.destinationSalaName})</span>}
                          </div>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] text-gray-800 dark:text-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>Envio: {mov.date}</span>
                          </div>
                          {mov.type === 'Emprestado' && mov.expectedReturnDate && (
                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold pl-4">
                              Retorno previsto: {mov.expectedReturnDate}
                            </div>
                          )}
                          {mov.completedAt && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pl-4">
                              Finalizado em: {mov.completedAt.split('T')[0]}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <div className="space-y-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${statusBadge.bg}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusBadge.label}
                          </span>
                          {mov.status === 'Em Andamento' && (
                            <div>
                              <button
                                type="button"
                                onClick={() => handleOpenCompleteModal(mov)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Finalizar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => requestDeleteSingle(mov)}
                            title="Excluir movimentação"
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(mov)}
                            title="Editar movimentação"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedMovementForDetail(mov)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>Detalhes</span>
                            <ChevronRight className="w-3.5 h-3.5" />
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
          {filteredMovements.map((mov) => {
            const typeBadge = getTypeBadge(mov.type);
            const statusBadge = getStatusBadge(mov.status);
            const TypeIcon = typeBadge.icon;
            const StatusIcon = statusBadge.icon;
            const isSelected = selectedIds.includes(mov.id);

            return (
              <div
                key={mov.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 transition-all relative flex flex-col justify-between shadow-2xs ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/30'
                    : 'border-[#E5E7EB] dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Bar: Checkbox, ID, Type & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectOne(mov.id)}
                        aria-label={`Selecionar movimentação ${mov.id}`}
                        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                        )}
                      </button>
                      <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                        {mov.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${typeBadge.bg}`}
                      >
                        <TypeIcon className="w-3 h-3" />
                        {typeBadge.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Equipment Title */}
                  <div className="mb-3.5">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-start gap-2">
                      <Package className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span>{mov.equipmentDescription}</span>
                    </h3>
                    {(mov.equipmentModel || mov.equipmentSerial) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-400 mt-1.5 pl-6">
                        {mov.equipmentModel && (
                          <span>Modelo: <strong className="text-gray-700 dark:text-slate-300">{mov.equipmentModel}</strong></span>
                        )}
                        {mov.equipmentSerial && (
                          <span>S/N: <strong className="font-mono text-gray-700 dark:text-slate-300">{mov.equipmentSerial}</strong></span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Movement Route Card: Origin ➔ Destination */}
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-200/70 dark:border-slate-800 space-y-2 mb-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                          Cinema de Origem
                        </div>
                        <div className="font-bold text-gray-900 dark:text-white truncate">
                          {mov.sourceCinemaName}
                        </div>
                        {mov.sourceSalaName && (
                          <div className="text-[11px] text-gray-500 dark:text-slate-400">
                            Sala: {mov.sourceSalaName}
                          </div>
                        )}
                      </div>

                      <div className="px-2 shrink-0 text-blue-500 dark:text-blue-400">
                        <ArrowRight className="w-4 h-4" />
                      </div>

                      <div className="space-y-0.5 flex-1 min-w-0 text-right">
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Cinema de Destino
                        </div>
                        <div className="font-bold text-gray-900 dark:text-white truncate">
                          {mov.destinationCinemaName}
                        </div>
                        {mov.destinationSalaName && (
                          <div className="text-[11px] text-gray-500 dark:text-slate-400">
                            Sala: {mov.destinationSalaName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reason & Notes */}
                  {mov.reason && (
                    <p className="text-xs text-gray-600 dark:text-slate-300 mb-2 leading-relaxed bg-blue-50/40 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                      <strong>Motivo:</strong> {mov.reason}
                    </p>
                  )}
                </div>

                {/* Footer Dates & Actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 mt-2">
                  <div className="text-[11px] text-gray-500 dark:text-slate-400 space-y-0.5">
                    <div className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Data: <strong>{mov.date}</strong></span>
                    </div>
                    {mov.type === 'Emprestado' && mov.expectedReturnDate && (
                      <div className="text-purple-600 dark:text-purple-400 font-bold">
                        Previsão Devolução: {mov.expectedReturnDate}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {mov.status === 'Em Andamento' && (
                      <button
                        type="button"
                        onClick={() => handleOpenCompleteModal(mov)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="Concluir e finalizar movimentação"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Finalizar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(mov)}
                      title="Editar"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => requestDeleteSingle(mov)}
                      title="Excluir"
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMovementForDetail(mov)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                    >
                      Detalhes
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MOVEMENT MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/80 rounded-xl text-blue-600 dark:text-blue-400">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingMovement ? 'Editar Movimentação' : 'Nova Movimentação de Equipamento'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Preencha os dados da transferência ou empréstimo entre complexos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-4 mt-4 text-xs">
              {/* Type Selector (Tabs) */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                  Tipo de Movimentação *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Emprestado', 'Transferência Permanente', 'Troca'] as MovementType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t })}
                      className={`py-2 px-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        formData.type === t
                          ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500 text-blue-700 dark:text-blue-300 shadow-2xs'
                          : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100'
                      }`}
                    >
                      {t === 'Emprestado' && <Share2 className="w-3.5 h-3.5" />}
                      {t === 'Transferência Permanente' && <ArrowRight className="w-3.5 h-3.5" />}
                      {t === 'Troca' && <Repeat className="w-3.5 h-3.5" />}
                      <span className="truncate">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700 dark:text-slate-300">
                    Descrição do Equipamento *
                  </label>
                  {equipmentModels.length > 0 && (
                    <span className="text-[11px] text-gray-400">
                      Ex: Lâmpada Xenon 4000W, Servidor Doremi, etc.
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Nome ou descrição completa do item movimentado..."
                  value={formData.equipmentDescription}
                  onChange={(e) => setFormData({ ...formData, equipmentDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Model, Serial & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Modelo do Equipamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Barco DP2K-20C"
                    value={formData.equipmentModel}
                    onChange={(e) => setFormData({ ...formData, equipmentModel: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Número de Série
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SN-98741-B"
                    value={formData.equipmentSerial}
                    onChange={(e) => setFormData({ ...formData, equipmentSerial: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.equipmentCategory}
                    onChange={(e) => setFormData({ ...formData, equipmentCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-medium cursor-pointer"
                  >
                    <option value="projetor">Projetor & Óptica</option>
                    <option value="servidor">Servidor DCI / Storage</option>
                    <option value="processador">Áudio & Processadores</option>
                    <option value="automacao">Automação & Elétrica</option>
                    <option value="outros">Outros / Peças</option>
                  </select>
                </div>
              </div>

              {/* Origin & Destination Cinemas */}
              <div className="p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Origin */}
                  <div>
                    <label className="block font-bold text-rose-600 dark:text-rose-400 mb-1">
                      Cinema de Origem (De onde sai) *
                    </label>
                    <select
                      required
                      value={formData.sourceCinemaId}
                      onChange={(e) => {
                        const cine = cinemas.find((c) => c.id === e.target.value);
                        setFormData({
                          ...formData,
                          sourceCinemaId: e.target.value,
                          sourceCinemaName: cine?.name || '',
                        });
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-medium cursor-pointer"
                    >
                      <option value="">Selecione o cinema de origem...</option>
                      {cinemas.map((c) => (
                        <option key={`form-src-${c.id}`} value={c.id}>
                          {c.name} ({c.city} - {c.state})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Sala de Origem (Ex: Sala 02 ou Estoque)"
                      value={formData.sourceSalaName}
                      onChange={(e) => setFormData({ ...formData, sourceSalaName: e.target.value })}
                      className="w-full mt-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 font-medium"
                    />
                  </div>

                  {/* Destination */}
                  <div>
                    <label className="block font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                      Cinema de Destino (Para onde vai) *
                    </label>
                    <select
                      required
                      value={formData.destinationCinemaId}
                      onChange={(e) => {
                        const cine = cinemas.find((c) => c.id === e.target.value);
                        setFormData({
                          ...formData,
                          destinationCinemaId: e.target.value,
                          destinationCinemaName: cine?.name || '',
                        });
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-medium cursor-pointer"
                    >
                      <option value="">Selecione o cinema de destino...</option>
                      {cinemas.map((c) => (
                        <option key={`form-dst-${c.id}`} value={c.id}>
                          {c.name} ({c.city} - {c.state})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Sala de Destino (Ex: Sala 04 IMAX ou Cabine)"
                      value={formData.destinationSalaName}
                      onChange={(e) => setFormData({ ...formData, destinationSalaName: e.target.value })}
                      className="w-full mt-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Dates & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Data da Movimentação *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-medium cursor-pointer"
                  />
                </div>

                {formData.type === 'Emprestado' && (
                  <div>
                    <label className="block font-semibold text-purple-600 dark:text-purple-400 mb-1">
                      Previsão de Retorno
                    </label>
                    <input
                      type="date"
                      value={formData.expectedReturnDate}
                      onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-medium cursor-pointer"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Status Atual
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as MovementStatus })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-medium cursor-pointer"
                  >
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Motivo da Movimentação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Suprir queima de equipamento, retrofit de sala, empréstimo provisório..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-medium"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Observações e Cuidados de Envio
                </label>
                <textarea
                  rows={2}
                  placeholder="Instruções de transporte, estado de conservação, cabos ou acessórios inclusos..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-medium"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold shadow-xs cursor-pointer"
                >
                  {editingMovement ? 'Salvar Alterações' : 'Cadastrar Movimentação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE / FINALIZE MOVEMENT MODAL */}
      {movementToComplete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/80 rounded-xl text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Finalizar Movimentação
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {movementToComplete.id} - {movementToComplete.type}
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-gray-900 dark:text-white">
                  {movementToComplete.equipmentDescription}
                </div>
                <div className="text-gray-500 dark:text-slate-400 flex items-center gap-2">
                  <span>{movementToComplete.sourceCinemaName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="font-semibold text-gray-800 dark:text-slate-200">{movementToComplete.destinationCinemaName}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Observações de Conclusão / Devolução (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Informe se o equipamento foi entregue/devolvido com sucesso, instalado ou testado..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-slate-100 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMovementToComplete(null)}
                className="px-3.5 py-2 text-xs font-bold text-gray-600 dark:text-slate-400 hover:text-gray-900 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Conclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedMovementForDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/80 rounded-xl text-blue-600 dark:text-blue-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                      {selectedMovementForDetail.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${getTypeBadge(selectedMovementForDetail.type).bg}`}
                    >
                      {selectedMovementForDetail.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Cadastrado por {selectedMovementForDetail.createdByName || 'Técnico'} em {new Date(selectedMovementForDetail.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMovementForDetail(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Equipment Info Box */}
              <div className="p-4 bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-gray-200/80 dark:border-slate-700 space-y-2">
                <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Equipamento
                </div>
                <div className="text-base font-bold text-gray-900 dark:text-white">
                  {selectedMovementForDetail.equipmentDescription}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-gray-600 dark:text-slate-300">
                  {selectedMovementForDetail.equipmentModel && (
                    <div>
                      <span className="text-gray-400 block text-[10px]">Modelo</span>
                      <strong className="text-gray-800 dark:text-slate-200">{selectedMovementForDetail.equipmentModel}</strong>
                    </div>
                  )}
                  {selectedMovementForDetail.equipmentSerial && (
                    <div>
                      <span className="text-gray-400 block text-[10px]">Número de Série</span>
                      <strong className="font-mono text-gray-800 dark:text-slate-200">{selectedMovementForDetail.equipmentSerial}</strong>
                    </div>
                  )}
                  {selectedMovementForDetail.equipmentCategory && (
                    <div>
                      <span className="text-gray-400 block text-[10px]">Categoria</span>
                      <strong className="capitalize text-gray-800 dark:text-slate-200">{selectedMovementForDetail.equipmentCategory}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Route Info Box */}
              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2.5">
                  Trajeto de Movimentação
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                      Cinema de Origem
                    </span>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {selectedMovementForDetail.sourceCinemaName}
                    </div>
                    {selectedMovementForDetail.sourceSalaName && (
                      <div className="text-gray-500 dark:text-slate-400">
                        Sala: {selectedMovementForDetail.sourceSalaName}
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      Cinema de Destino
                    </span>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {selectedMovementForDetail.destinationCinemaName}
                    </div>
                    {selectedMovementForDetail.destinationSalaName && (
                      <div className="text-gray-500 dark:text-slate-400">
                        Sala: {selectedMovementForDetail.destinationSalaName}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 block text-[10px]">Data de Envio</span>
                  <strong className="text-gray-900 dark:text-white text-xs">{selectedMovementForDetail.date}</strong>
                </div>

                {selectedMovementForDetail.type === 'Emprestado' && (
                  <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
                    <span className="text-purple-600 dark:text-purple-400 block text-[10px] font-bold">Retorno Previsto</span>
                    <strong className="text-purple-700 dark:text-purple-300 text-xs">
                      {selectedMovementForDetail.expectedReturnDate || 'Não estipulado'}
                    </strong>
                  </div>
                )}

                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 block text-[10px]">Status do Processo</span>
                  <strong className="text-gray-900 dark:text-white text-xs">{selectedMovementForDetail.status}</strong>
                </div>
              </div>

              {/* Reason & Notes */}
              {selectedMovementForDetail.reason && (
                <div>
                  <span className="font-bold text-gray-700 dark:text-slate-300 block mb-1">Motivo do Deslocamento:</span>
                  <p className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300">
                    {selectedMovementForDetail.reason}
                  </p>
                </div>
              )}

              {selectedMovementForDetail.notes && (
                <div>
                  <span className="font-bold text-gray-700 dark:text-slate-300 block mb-1">Observações Gerais:</span>
                  <p className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300">
                    {selectedMovementForDetail.notes}
                  </p>
                </div>
              )}

              {/* Completion Notes if finalized */}
              {selectedMovementForDetail.status === 'Finalizado' && (
                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <div className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Movimentação Concluída / Finalizada</span>
                  </div>
                  {selectedMovementForDetail.completedAt && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Concluído em: {new Date(selectedMovementForDetail.completedAt).toLocaleString('pt-BR')} por {selectedMovementForDetail.completedByName || 'Técnico'}
                    </p>
                  )}
                  {selectedMovementForDetail.completedNotes && (
                    <p className="text-xs text-emerald-900 dark:text-emerald-100 pt-1 font-medium">
                      Obs: {selectedMovementForDetail.completedNotes}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  requestDeleteSingle(selectedMovementForDetail);
                }}
                className="px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedMovementForDetail.status === 'Em Andamento' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenCompleteModal(selectedMovementForDetail);
                      setSelectedMovementForDetail(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finalizar Movimentação</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditModal(selectedMovementForDetail);
                    setSelectedMovementForDetail(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/80 rounded-xl text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Confirmar Exclusão
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {isBulkDelete
                    ? `Exclusão de ${selectedIds.length} movimentações selecionadas`
                    : `Exclusão da movimentação ${itemToDelete?.id}`}
                </p>
              </div>
            </div>

            <div className="py-4 text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
              {isBulkDelete ? (
                <p>
                  Tem certeza de que deseja excluir permanentemente as{' '}
                  <strong className="text-rose-600 dark:text-rose-400">{selectedIds.length} movimentações</strong> selecionadas? Esta ação removerá os registros do banco de dados na nuvem e não pode ser desfeita.
                </p>
              ) : (
                <p>
                  Tem certeza de que deseja excluir a movimentação{' '}
                  <strong className="text-gray-900 dark:text-white">{itemToDelete?.id}</strong> referente ao equipamento{' '}
                  <strong className="text-gray-900 dark:text-white">"{itemToDelete?.equipmentDescription}"</strong> ({itemToDelete?.sourceCinemaName} ➔ {itemToDelete?.destinationCinemaName})?
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setItemToDelete(null);
                  setIsBulkDelete(false);
                }}
                className="px-3.5 py-2 text-xs font-bold text-gray-600 dark:text-slate-400 hover:text-gray-900 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
