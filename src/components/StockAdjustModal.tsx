import React, { useState } from 'react';
import { X, Plus, Minus, ArrowDownRight, ArrowUpRight, AlertCircle, Save } from 'lucide-react';
import { InventoryItem, User } from '../types';
import { adjustInventoryQuantity } from '../services/storageService';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  currentUser: User | null;
  onSuccess?: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  onSuccess,
}) => {
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const currentQty = item.quantity || 0;
  const newQty = direction === 'in' ? currentQty + amount : Math.max(0, currentQty - amount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Informe uma quantidade maior que zero.');
      return;
    }
    if (direction === 'out' && amount > currentQty) {
      setError(`A quantidade de saída (${amount}) não pode ser maior que o saldo em estoque (${currentQty}).`);
      return;
    }

    const delta = direction === 'in' ? amount : -amount;
    adjustInventoryQuantity(item.id, delta, reason.trim() || undefined, currentUser);

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Movimentação Rápida de Estoque</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
              {item.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Stock Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Localização</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.cinemaName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">Saldo Atual</p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white">
                {currentQty} <span className="text-xs font-normal text-slate-500">{item.unit || 'un.'}</span>
              </p>
            </div>
          </div>

          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setDirection('in');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                direction === 'in'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Entrada (+)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection('out');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                direction === 'out'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Saída / Baixa (-)</span>
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Quantidade para {direction === 'in' ? 'Entrada' : 'Saída'} ({item.unit || 'un.'})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAmount((prev) => Math.max(1, prev - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                id="adjust-amount-input"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-center py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setAmount((prev) => prev + 1)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Result preview */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between text-xs">
            <span className="text-amber-800 dark:text-amber-300 font-medium">Novo saldo projetado:</span>
            <span className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
              {newQty} {item.unit || 'un.'}
            </span>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Motivo / Observação
            </label>
            <input
              id="adjust-reason-input"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={direction === 'in' ? 'Ex: Chegada de pedido do fornecedor, reposição' : 'Ex: Instalado na Sala 02, substituição preventiva'}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 ${
                direction === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Confirmar {direction === 'in' ? 'Entrada' : 'Baixa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
