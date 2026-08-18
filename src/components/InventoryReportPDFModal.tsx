import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Download,
  Building2,
  Boxes,
  AlertTriangle,
  Layers,
  Filter,
  CheckCircle2,
  DollarSign,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { InventoryItem, Cinema, User, CompanyConfig } from '../types';
import { generateInventoryPDF } from '../utils/pdfGenerator';

interface InventoryReportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  cinemas: Cinema[];
  company: CompanyConfig;
  currentUser: User | null;
  defaultCinemaId?: string; // currently filtered cinema in view
}

export const InventoryReportPDFModal: React.FC<InventoryReportPDFModalProps> = ({
  isOpen,
  onClose,
  inventory,
  cinemas,
  company,
  currentUser,
  defaultCinemaId = 'all',
}) => {
  const [scope, setScope] = useState<'all' | 'single'>(
    defaultCinemaId !== 'all' ? 'single' : 'all'
  );
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>(
    defaultCinemaId !== 'all' ? defaultCinemaId : (cinemas[0]?.id || '')
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [onlyAlerts, setOnlyAlerts] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter items based on user selection in modal
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      // Scope filter
      if (scope === 'single') {
        if (item.cinemaId !== selectedCinemaId) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Only alerts filter (Baixo Estoque / Sem Estoque)
      if (onlyAlerts) {
        if (item.status !== 'Baixo Estoque' && item.status !== 'Sem Estoque') {
          return false;
        }
      } else if (selectedStatus !== 'all') {
        if (item.status !== selectedStatus) return false;
      }

      return true;
    });
  }, [inventory, scope, selectedCinemaId, selectedCategory, selectedStatus, onlyAlerts]);

  // Preview metrics
  const previewMetrics = useMemo(() => {
    const totalItems = filteredItems.length;
    const totalUnits = filteredItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    const lowStock = filteredItems.filter((i) => i.status === 'Baixo Estoque').length;
    const outOfStock = filteredItems.filter((i) => i.status === 'Sem Estoque').length;
    const totalValue = filteredItems.reduce((acc, curr) => {
      if (curr.unitCost && curr.quantity > 0) {
        return acc + curr.unitCost * curr.quantity;
      }
      return acc;
    }, 0);

    return { totalItems, totalUnits, lowStock, outOfStock, totalValue };
  }, [filteredItems]);

  const selectedCinemaObj = useMemo(() => {
    return cinemas.find((c) => c.id === selectedCinemaId);
  }, [cinemas, selectedCinemaId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSuccessMsg(null);

    try {
      await generateInventoryPDF({
        scope: scope === 'all' ? 'all' : selectedCinemaId,
        cinemaName: scope === 'all' ? 'Todos os Cinemas' : selectedCinemaObj?.name || 'Cinema',
        items: filteredItems,
        cinemas: cinemas,
        company: company,
        user: currentUser,
        onlyAlerts: onlyAlerts,
        selectedCategory: selectedCategory,
        selectedStatus: selectedStatus,
      });

      setSuccessMsg('Relatório PDF gerado com sucesso!');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err) {
      console.error('Error in PDF generation:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Gerar Relatório de Estoque em PDF
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exporte o relatório consolidado de todos os cinemas ou por cinema específico
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Quick preset buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setScope('all');
                setOnlyAlerts(false);
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                scope === 'all'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className={`p-2 rounded-lg ${scope === 'all' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white">Geral (Todos os Cinemas)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Consolidado da rede com subtotais por complexo
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setScope('single');
                if (!selectedCinemaId && cinemas[0]) {
                  setSelectedCinemaId(cinemas[0].id);
                }
              }}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                scope === 'single'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className={`p-2 rounded-lg ${scope === 'single' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white">Por Cinema Específico</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Relatório detalhado do estoque de uma unidade
                </div>
              </div>
            </button>
          </div>

          {/* If Single Cinema, choose cinema */}
          {scope === 'single' && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Selecione o Cinema para o Relatório *
              </label>
              <select
                value={selectedCinemaId}
                onChange={(e) => setSelectedCinemaId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
              >
                {cinemas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.city ? `(${c.city} - ${c.state})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filter options */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>Filtros do Relatório</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Categoria de Equipamento
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="projetor">Projetores & Módulos</option>
                  <option value="som">Áudio & Processadores</option>
                  <option value="servidor">Servidores & IMB</option>
                  <option value="lampada">Lâmpadas & Consumíveis</option>
                  <option value="pecas">Peças & Placas Eletrônicas</option>
                  <option value="cabos">Cabos & Conexões</option>
                  <option value="optico">Lentes & Ópticos</option>
                  <option value="acessorios">Acessórios & 3D</option>
                  <option value="outros">Outros Insumos</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Situação / Status
                </label>
                <select
                  value={onlyAlerts ? 'alerts_only' : selectedStatus}
                  onChange={(e) => {
                    if (e.target.value === 'alerts_only') {
                      setOnlyAlerts(true);
                      setSelectedStatus('all');
                    } else {
                      setOnlyAlerts(false);
                      setSelectedStatus(e.target.value);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                >
                  <option value="all">Todos os Status (Completo)</option>
                  <option value="alerts_only">⚠️ Apenas Alertas (Baixo Estoque & Sem Estoque)</option>
                  <option value="Em Estoque">Apenas Em Estoque</option>
                  <option value="Baixo Estoque">Apenas Baixo Estoque</option>
                  <option value="Sem Estoque">Apenas Sem Estoque (Zerados)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyAlerts}
                  onChange={(e) => setOnlyAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-700"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Destacar apenas itens necessitando reposição ou zerados
                </span>
              </label>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                Resumo da Prévia do Documento
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                {scope === 'all' ? `Toda a Rede (${cinemas.length} Cinemas)` : selectedCinemaObj?.name}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Itens / SKUs</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {previewMetrics.totalItems}
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Qtd. Física</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {previewMetrics.totalUnits}
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Em Alerta</div>
                <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {previewMetrics.lowStock + previewMetrics.outOfStock}
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Valor Total</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
                    previewMetrics.totalValue
                  )}
                </div>
              </div>
            </div>

            {filteredItems.length === 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900/50">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Nenhum item encontrado com os filtros selecionados. Ajuste os filtros acima.</span>
              </div>
            )}
          </div>

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-900/50 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Fechar
          </button>

          <button
            id="btn-confirm-export-inventory-pdf"
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || filteredItems.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Renderizando PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Baixar Relatório PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
