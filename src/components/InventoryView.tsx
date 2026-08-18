import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Building2,
  Tag,
  Hash,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Edit2,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  MinusSquare,
  LayoutGrid,
  List,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Package,
  Globe,
  SlidersHorizontal,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  RefreshCw,
  FileText,
  Download,
  Loader2,
} from 'lucide-react';
import { InventoryItem, StockStatus, User, Cinema, CompanyConfig } from '../types';
import {
  getInventory,
  getCinemas,
  getCompanyConfig,
  deleteInventoryItem,
  deleteMultipleInventoryItems,
  adjustInventoryQuantity,
  saveInventoryItem,
} from '../services/storageService';
import { InventoryModal } from './InventoryModal';
import { StockAdjustModal } from './StockAdjustModal';
import { InventoryDetailModal } from './InventoryDetailModal';
import { InventoryReportPDFModal } from './InventoryReportPDFModal';
import { generateInventoryPDF } from '../utils/pdfGenerator';

interface InventoryViewProps {
  currentUser: User | null;
  onRefresh?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ currentUser, onRefresh }) => {
  const inventory = getInventory();
  const cinemas = getCinemas();
  const company = getCompanyConfig();

  // Scope: 'all' (Geral / Consolidado) or cinemaId ('cin-1', etc.)
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>('all');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<StockStatus | 'all'>('all');

  // View Mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('calibracine_inventory_view_mode');
    return saved === 'list' ? 'list' : 'grid';
  });

  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('calibracine_inventory_view_mode', mode);
  };

  // Selection for Batch Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [itemToAdjust, setItemToAdjust] = useState<InventoryItem | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [itemToView, setItemToView] = useState<InventoryItem | null>(null);

  // PDF Export Modal State & Quick Download State
  const [isExportPDFModalOpen, setIsExportPDFModalOpen] = useState(false);
  const [isQuickDownloading, setIsQuickDownloading] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Quick Direct PDF download helper for current active view
  const handleQuickDownloadPDF = async () => {
    setIsQuickDownloading(true);
    setPdfSuccessMessage(null);
    try {
      const activeCinemaObj = cinemas.find((c) => c.id === selectedCinemaId);
      await generateInventoryPDF({
        scope: selectedCinemaId,
        cinemaName: selectedCinemaId === 'all' ? 'Todos os Cinemas' : activeCinemaObj?.name || 'Cinema',
        items: filteredItems,
        cinemas: cinemas,
        company: company,
        user: currentUser,
        selectedCategory: selectedCategory,
        selectedStatus: selectedStatus,
      });

      setPdfSuccessMessage('Relatório PDF gerado com sucesso!');
      setTimeout(() => setPdfSuccessMessage(null), 3500);
    } catch (err) {
      console.error('Error generating quick inventory PDF:', err);
    } finally {
      setIsQuickDownloading(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      // Scope / Cinema filter
      if (selectedCinemaId !== 'all' && item.cinemaId !== selectedCinemaId) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Search Query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesBrand = item.brand?.toLowerCase().includes(query) || false;
        const matchesModel = item.model?.toLowerCase().includes(query) || false;
        const matchesPartNum = item.partNumber?.toLowerCase().includes(query) || false;
        const matchesSerial = item.serialNumber?.toLowerCase().includes(query) || false;
        const matchesLocation = item.location?.toLowerCase().includes(query) || false;
        const matchesCinema = item.cinemaName.toLowerCase().includes(query);
        const matchesNotes = item.notes?.toLowerCase().includes(query) || false;

        return (
          matchesName ||
          matchesBrand ||
          matchesModel ||
          matchesPartNum ||
          matchesSerial ||
          matchesLocation ||
          matchesCinema ||
          matchesNotes
        );
      }

      return true;
    });
  }, [inventory, selectedCinemaId, selectedStatus, selectedCategory, searchQuery]);

  // Overall & Scope metrics
  const metrics = useMemo(() => {
    // If a specific cinema is selected, compute metrics for that cinema; otherwise for entire inventory
    const scopeItems = selectedCinemaId === 'all' 
      ? inventory 
      : inventory.filter((i) => i.cinemaId === selectedCinemaId);

    const totalSKUs = scopeItems.length;
    const totalPhysicalUnits = scopeItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    const lowStockCount = scopeItems.filter((i) => i.status === 'Baixo Estoque').length;
    const outOfStockCount = scopeItems.filter((i) => i.status === 'Sem Estoque').length;
    const inStockCount = scopeItems.filter((i) => i.status === 'Em Estoque').length;
    const totalValue = scopeItems.reduce((acc, curr) => {
      if (curr.unitCost && curr.quantity > 0) {
        return acc + curr.unitCost * curr.quantity;
      }
      return acc;
    }, 0);

    return {
      totalSKUs,
      totalPhysicalUnits,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      totalValue,
    };
  }, [inventory, selectedCinemaId]);

  // Handle Selection
  const isAllSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < filteredItems.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (
      window.confirm(
        `Tem certeza que deseja excluir ${selectedIds.length} item(ns) de estoque permanentemente?`
      )
    ) {
      deleteMultipleInventoryItems(selectedIds, currentUser);
      setSelectedIds([]);
      if (onRefresh) onRefresh();
    }
  };

  const handleQuickAdjust = (item: InventoryItem, delta: number) => {
    if (item.quantity + delta < 0) return;
    adjustInventoryQuantity(item.id, delta, 'Ajuste rápido no painel', currentUser);
    if (onRefresh) onRefresh();
  };

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'Em Estoque':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" />
            Em Estoque
          </span>
        );
      case 'Baixo Estoque':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <AlertTriangle className="w-3 h-3" />
            Baixo Estoque
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
            <AlertCircle className="w-3 h-3" />
            Sem Estoque
          </span>
        );
    }
  };

  const getCategoryBadge = (category: string) => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      projetor: { label: 'Projetor', bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
      som: { label: 'Áudio', bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300' },
      servidor: { label: 'Servidor/TI', bg: 'bg-indigo-100 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300' },
      lampada: { label: 'Lâmpada', bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' },
      pecas: { label: 'Peças/Placas', bg: 'bg-cyan-100 dark:bg-cyan-950/60', text: 'text-cyan-800 dark:text-cyan-300' },
      cabos: { label: 'Cabos', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
      optico: { label: 'Óptico', bg: 'bg-teal-100 dark:bg-teal-950/60', text: 'text-teal-800 dark:text-teal-300' },
      acessorios: { label: 'Acessórios/3D', bg: 'bg-pink-100 dark:bg-pink-950/60', text: 'text-pink-800 dark:text-pink-300' },
      outros: { label: 'Outros', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
    };

    const c = map[category] || { label: category, bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' };
    return (
      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const formattedTotalValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(metrics.totalValue);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Estoque de Equipamentos & Peças</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie itens, lâmpadas sobressalentes, placas e suprimentos por cinema ou em visão consolidada.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick PDF export for current view */}
          <button
            id="btn-quick-export-inventory-pdf"
            type="button"
            onClick={handleQuickDownloadPDF}
            disabled={isQuickDownloading || filteredItems.length === 0}
            className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm hover:shadow transition flex items-center gap-2 disabled:opacity-50"
            title="Download direto do PDF com os filtros e cinema atuais"
          >
            {isQuickDownloading ? (
              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
            <span className="hidden sm:inline">PDF Rápido</span>
          </button>

          {/* Detailed / Configurable PDF Export Modal trigger */}
          <button
            id="btn-open-inventory-pdf-modal"
            type="button"
            onClick={() => setIsExportPDFModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Exportar Relatório PDF</span>
          </button>

          <button
            id="btn-new-inventory-item"
            type="button"
            onClick={() => {
              setItemToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm hover:shadow transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Item no Estoque</span>
          </button>
        </div>
      </div>

      {pdfSuccessMessage && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-900/50 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{pdfSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setPdfSuccessMessage(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:opacity-75"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Scope Selector: Visão Geral vs Por Cinema */}
      <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 shrink-0 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Visualização:
          </span>

          <button
            type="button"
            onClick={() => setSelectedCinemaId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedCinemaId === 'all'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Geral (Todos os Cinemas)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {inventory.length}
            </span>
          </button>

          {cinemas.map((cinema) => {
            const count = inventory.filter((i) => i.cinemaId === cinema.id).length;
            const hasAlert = inventory.some(
              (i) => i.cinemaId === cinema.id && (i.status === 'Sem Estoque' || i.status === 'Baixo Estoque')
            );
            return (
              <button
                key={cinema.id}
                type="button"
                onClick={() => setSelectedCinemaId(cinema.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedCinemaId === cinema.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <span>{cinema.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedCinemaId === cinema.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
                {hasAlert && selectedCinemaId !== cinema.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Scope Label badge */}
        <div className="shrink-0 flex items-center gap-2 px-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Exibindo:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">
            {selectedCinemaId === 'all'
              ? 'Toda a Rede (' + cinemas.length + ' Cinemas)'
              : cinemas.find((c) => c.id === selectedCinemaId)?.name || 'Cinema Selecionado'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tipos de Itens (SKUs)</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {metrics.totalSKUs}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Itens cadastrados</p>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Unidades Físicas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {metrics.totalPhysicalUnits}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Peças / Lâmpadas no saldo</p>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Baixo Estoque</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
            {metrics.lowStockCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Atingiram o estoque mínimo</p>
        </div>

        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sem Estoque / Esgotados</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
            {metrics.outOfStockCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Saldo zerado no complexo</p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Valor Estimado</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-2 truncate" title={formattedTotalValue}>
            {formattedTotalValue}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Patrimônio estocado</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="inventory-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome do item, fabricante, modelo, part number, localização..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              id="filter-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as StockStatus | 'all')}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="all">Situação: Todas</option>
              <option value="Em Estoque">Em Estoque</option>
              <option value="Baixo Estoque">Baixo Estoque</option>
              <option value="Sem Estoque">Sem Estoque / Esgotado</option>
            </select>

            {/* Category Filter */}
            <select
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="all">Categoria: Todas</option>
              <option value="lampada">Lâmpadas & Consumíveis</option>
              <option value="projetor">Projetores & Módulos</option>
              <option value="som">Áudio & Processamento</option>
              <option value="servidor">Servidores & IMB</option>
              <option value="pecas">Peças & Placas</option>
              <option value="cabos">Cabos & Conectores</option>
              <option value="optico">Lentes & Ópticos</option>
              <option value="acessorios">Acessórios & 3D</option>
              <option value="outros">Outros</option>
            </select>

            {/* Layout View Toggle */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="Visualização em Grade"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="Visualização em Lista / Tabela"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Selection Bar & Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-amber-600" />
              ) : isSomeSelected ? (
                <MinusSquare className="w-4 h-4 text-amber-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>Selecionar Todos ({filteredItems.length})</span>
            </button>

            {selectedIds.length > 0 && (
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {selectedIds.length} item(ns) selecionado(s)
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Desmarcar
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Selecionados</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Items Display */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Nenhum item de estoque encontrado
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5">
            Não há equipamentos ou suprimentos cadastrados para os filtros selecionados. Cadastre um novo item ou ajuste os parâmetros de busca.
          </p>
          <button
            type="button"
            onClick={() => {
              setItemToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="mt-5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeiro Item</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const isOutOfStock = item.quantity <= 0;
            const isLowStock = item.status === 'Baixo Estoque';

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-800/90 rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20'
                    : isOutOfStock
                    ? 'border-rose-200 dark:border-rose-900/60'
                    : isLowStock
                    ? 'border-amber-200 dark:border-amber-900/60'
                    : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(item.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                        {item.id}
                      </span>
                      {getCategoryBadge(item.category)}
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div>
                    <h3
                      onClick={() => {
                        setItemToView(item);
                        setIsDetailModalOpen(true);
                      }}
                      className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition line-clamp-1"
                      title={item.name}
                    >
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{item.cinemaName}</span>
                    </p>
                  </div>
                </div>

                {/* Card Body with Stock Level meter & details */}
                <div className="p-4 space-y-3.5 flex-1">
                  {/* Stock Quantity Meter */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Saldo em Estoque</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className={`text-2xl font-extrabold ${
                          isOutOfStock ? 'text-rose-600 dark:text-rose-400' : isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {item.quantity}
                        </span>
                        <span className="text-xs font-medium text-slate-500">{item.unit || 'un.'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Mín. segurança: {item.minQuantity ?? 1} {item.unit || 'un.'}
                      </p>
                    </div>

                    {/* Quick increment / decrement buttons */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                      <button
                        type="button"
                        onClick={() => handleQuickAdjust(item, -1)}
                        disabled={item.quantity <= 0}
                        className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-200 hover:text-rose-600 font-bold flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                        title="Baixa de 1 unidade"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setItemToAdjust(item);
                          setIsAdjustModalOpen(true);
                        }}
                        className="px-2 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded transition"
                        title="Registrar movimentação com motivo"
                      >
                        Ajustar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdjust(item, +1)}
                        className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 hover:text-emerald-600 font-bold flex items-center justify-center transition text-xs"
                        title="Entrada de 1 unidade"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Attributes metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {item.location && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate" title={item.location}>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    )}
                    {item.partNumber && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate" title={`Part Number: ${item.partNumber}`}>
                        <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px] truncate">{item.partNumber}</span>
                      </div>
                    )}
                    {(item.brand || item.model) && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate col-span-2">
                        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.brand} {item.model ? `- ${item.model}` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {item.unitCost ? `R$ ${item.unitCost.toFixed(2)} / ${item.unit || 'un.'}` : 'Sem custo unitário'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setItemToView(item);
                        setIsDetailModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setItemToEdit(item);
                        setIsFormModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                      title="Editar item"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Deseja excluir "${item.name}" do estoque?`)) {
                          deleteInventoryItem(item.id, currentUser);
                          if (onRefresh) onRefresh();
                        }
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Excluir item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/75 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 pl-4 pr-2 w-10">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                      ) : isSomeSelected ? (
                        <MinusSquare className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-3">Código & Item</th>
                  <th className="py-3.5 px-3">Cinema / Local</th>
                  <th className="py-3.5 px-3">Categoria</th>
                  <th className="py-3.5 px-3">Situação</th>
                  <th className="py-3.5 px-3 text-center">Saldo em Estoque</th>
                  <th className="py-3.5 px-3 text-right">Custo Estimado</th>
                  <th className="py-3.5 pr-4 pl-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isOutOfStock = item.quantity <= 0;
                  const isLowStock = item.status === 'Baixo Estoque';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition ${
                        isSelected ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(item.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Code and Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-[11px] bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                            {item.id}
                          </span>
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setItemToView(item);
                                setIsDetailModalOpen(true);
                              }}
                              className="font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition text-left"
                            >
                              {item.name}
                            </button>
                            {(item.brand || item.model || item.partNumber) && (
                              <p className="text-[11px] text-slate-400">
                                {item.brand} {item.model} {item.partNumber ? `(PN: ${item.partNumber})` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cinema / Location */}
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{item.cinemaName}</p>
                        {item.location && <p className="text-[11px] text-slate-400">{item.location}</p>}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">{getCategoryBadge(item.category)}</td>

                      {/* Status */}
                      <td className="py-3 px-3">{getStatusBadge(item.status)}</td>

                      {/* Quantity & Quick Adjustment */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(item, -1)}
                            disabled={item.quantity <= 0}
                            className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-900 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center transition disabled:opacity-20 text-xs"
                          >
                            -
                          </button>
                          <div className="text-center min-w-[50px]">
                            <span className={`font-extrabold text-sm ${
                              isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-900 dark:text-white'
                            }`}>
                              {item.quantity}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">{item.unit || 'un.'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(item, +1)}
                            className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center transition text-xs"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                        {item.unitCost
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                              item.unitCost * item.quantity
                            )
                          : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 pr-4 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setItemToAdjust(item);
                              setIsAdjustModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="Ajustar saldo"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setItemToView(item);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setItemToEdit(item);
                              setIsFormModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Deseja excluir "${item.name}" do estoque?`)) {
                                deleteInventoryItem(item.id, currentUser);
                                if (onRefresh) onRefresh();
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* Modals */}
      {isFormModalOpen && (
        <InventoryModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setItemToEdit(null);
          }}
          itemToEdit={itemToEdit}
          cinemas={cinemas}
          currentUser={currentUser}
          defaultCinemaId={selectedCinemaId}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {isAdjustModalOpen && itemToAdjust && (
        <StockAdjustModal
          isOpen={isAdjustModalOpen}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setItemToAdjust(null);
          }}
          item={itemToAdjust}
          currentUser={currentUser}
          onSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {isDetailModalOpen && itemToView && (
        <InventoryDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setItemToView(null);
          }}
          item={itemToView}
          currentUser={currentUser}
          onEdit={(item) => {
            setItemToEdit(item);
            setIsFormModalOpen(true);
          }}
          onDelete={(id) => {
            deleteInventoryItem(id, currentUser);
            if (onRefresh) onRefresh();
          }}
          onOpenAdjust={(item) => {
            setItemToAdjust(item);
            setIsAdjustModalOpen(true);
          }}
        />
      )}

      {isExportPDFModalOpen && (
        <InventoryReportPDFModal
          isOpen={isExportPDFModalOpen}
          onClose={() => setIsExportPDFModalOpen(false)}
          inventory={inventory}
          cinemas={cinemas}
          company={company}
          currentUser={currentUser}
          defaultCinemaId={selectedCinemaId}
        />
      )}
    </div>
  );
};
