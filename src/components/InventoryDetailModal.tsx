import React, { useState } from 'react';
import {
  X,
  Boxes,
  Building2,
  Tag,
  Hash,
  MapPin,
  DollarSign,
  Calendar,
  Layers,
  FileText,
  Edit2,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Loader2,
} from 'lucide-react';
import { InventoryItem, User } from '../types';
import { getCompanyConfig, getCinemas } from '../services/storageService';
import { generateInventoryPDF } from '../utils/pdfGenerator';

interface InventoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  currentUser: User | null;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onOpenAdjust: (item: InventoryItem) => void;
}

export const InventoryDetailModal: React.FC<InventoryDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  onEdit,
  onDelete,
  onOpenAdjust,
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!isOpen || !item) return null;

  const handleDownloadItemPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const company = getCompanyConfig();
      const cinemas = getCinemas();
      await generateInventoryPDF({
        scope: item.cinemaId,
        cinemaName: item.cinemaName,
        items: [item],
        cinemas: cinemas,
        company: company,
        user: currentUser,
      });
    } catch (err) {
      console.error('Error generating single item PDF:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Em Estoque':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            Em Estoque
          </span>
        );
      case 'Baixo Estoque':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            Baixo Estoque
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
            Sem Estoque / Esgotado
          </span>
        );
    }
  };

  const getCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
      projetor: 'Projetores & Módulos',
      som: 'Áudio & Processamento',
      servidor: 'Servidores & IMB',
      lampada: 'Lâmpadas & Consumíveis',
      pecas: 'Peças & Placas',
      cabos: 'Cabos & Conectores',
      optico: 'Lentes & Ópticos',
      acessorios: 'Acessórios & 3D',
      outros: 'Outros Suprimentos',
    };
    return map[category] || category;
  };

  const formattedCost = item.unitCost !== undefined
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitCost)
    : null;

  const totalValue = item.unitCost !== undefined
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitCost * item.quantity)
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  {item.id}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {getCategoryLabel(item.category)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {item.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Stock KPI summary row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/70">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status do Estoque</span>
              <div className="mt-2">{getStatusBadge(item.status)}</div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/70">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Saldo Atual</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{item.quantity}</span>
                <span className="text-xs font-semibold text-slate-500">{item.unit || 'unid.'}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Mínimo de segurança: <strong className="text-slate-600 dark:text-slate-300">{item.minQuantity ?? 0} {item.unit || 'unid.'}</strong>
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/70">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Custo / Valor Total</span>
              <div className="mt-1">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {totalValue || 'Não informado'}
                </span>
              </div>
              {formattedCost && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Unitário: <strong className="text-slate-600 dark:text-slate-300">{formattedCost}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Quick stock adjustment buttons */}
          <div className="flex items-center justify-between p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/40">
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Movimentar Saldo Físico:
            </span>
            <button
              onClick={() => {
                onClose();
                onOpenAdjust(item);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Registrar Entrada / Baixa</span>
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <Building2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Complexo / Cinema</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.cinemaName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Localização Física</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{item.location || 'Não especificada'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <Tag className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Fabricante & Modelo</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {item.brand || ''} {item.model ? `- ${item.model}` : (!item.brand ? 'Não informado' : '')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <Hash className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Part Number / Serial</p>
                <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                  {item.partNumber || item.serialNumber || 'Nenhum código registrado'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Última Reposição / Entrada</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {item.lastRestockDate
                    ? new Date(item.lastRestockDate + 'T00:00:00').toLocaleDateString('pt-BR')
                    : 'Sem registro de reposição recente'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400">Data de Cadastro</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {new Date(item.createdAt).toLocaleDateString('pt-BR')} por {item.createdByName || 'Técnico'}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                Observações Técnicas & Aplicação:
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {item.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Deseja realmente excluir "${item.name}" do estoque?`)) {
                onDelete(item.id);
                onClose();
              }
            }}
            className="px-3.5 py-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadItemPDF}
              disabled={isGeneratingPDF}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              title="Baixar ficha técnica deste item em PDF"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Ficha em PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editar Item</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
