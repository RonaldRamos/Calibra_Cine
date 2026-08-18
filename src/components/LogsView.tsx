import React, { useState } from 'react';
import { ShieldCheck, Trash2, AlertTriangle, Search, CheckSquare, Square, Filter, RefreshCw } from 'lucide-react';
import { getActivityLogs, deleteActivityLog, deleteMultipleActivityLogs, clearAllActivityLogs, addActivityLog } from '../services/storageService';
import { ActivityLog } from '../types';

export const LogsView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>(() => getActivityLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals state
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [deletingSingleLog, setDeletingSingleLog] = useState<ActivityLog | null>(null);
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);

  const reloadLogs = () => {
    setLogs(getActivityLogs());
    setSelectedIds([]);
  };

  // Filtered logs
  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.userName.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      log.userRole.toLowerCase().includes(term) ||
      new Date(log.timestamp).toLocaleString('pt-BR').includes(term)
    );
  });

  // Checkbox Selection logic
  const isAllSelected = filteredLogs.length > 0 && filteredLogs.every((l) => selectedIds.includes(l.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLogs.map((l) => l.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Delete Single
  const handleConfirmDeleteSingle = () => {
    if (!deletingSingleLog) return;
    deleteActivityLog(deletingSingleLog.id);
    setDeletingSingleLog(null);
    reloadLogs();
  };

  // Delete Selected
  const handleConfirmDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    deleteMultipleActivityLogs(selectedIds);
    setShowDeleteSelectedModal(false);
    reloadLogs();
  };

  // Clear All
  const handleConfirmClearAll = () => {
    clearAllActivityLogs();
    // Add a log entry noting that logs were cleared
    addActivityLog('LIMPAR_LOGS', 'Todos os logs de auditoria foram apagados pelo administrador.');
    setShowClearAllModal(false);
    reloadLogs();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Trilha de Auditoria
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-500" />
            Logs e Histórico de Atividades ({logs.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registro de segurança contendo todas as alterações de relatórios, logins e ações administrativas.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteSelectedModal(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs animate-fadeIn"
            >
              <Trash2 className="w-4 h-4" />
              <span>Apagar Selecionados ({selectedIds.length})</span>
            </button>
          )}

          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearAllModal(true)}
              className="px-3.5 py-2 bg-rose-950/20 hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:border-rose-500 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Apagar Todos os Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por usuário, ação, detalhes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
          <span className="font-medium">
            Exibindo <strong>{filteredLogs.length}</strong> de <strong>{logs.length}</strong> registros
          </span>
          <button
            type="button"
            onClick={reloadLogs}
            className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    disabled={filteredLogs.length === 0}
                    className="cursor-pointer text-slate-400 hover:text-sky-500 disabled:opacity-40"
                    title={isAllSelected ? 'Desmarcar todos' : 'Selecionar todos nesta visualização'}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-sky-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Perfil</th>
                <th className="py-3 px-4">Ação Realizada</th>
                <th className="py-3 px-4">Detalhes</th>
                <th className="py-3 px-4 text-right w-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isSelected = selectedIds.includes(log.id);
                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-sky-50/60 dark:bg-sky-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(log.id)}
                          className="cursor-pointer text-slate-400 hover:text-sky-500"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {log.userName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.userRole === 'admin'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          }`}
                        >
                          {log.userRole}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-md">
                        {log.details}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setDeletingSingleLog(log)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Apagar este log específico"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <p className="font-bold text-sm">Nenhum log de atividade encontrado</p>
                      <p className="text-xs text-slate-400">
                        {searchTerm ? 'Tente buscar por outro termo.' : 'A trilha de auditoria está vazia.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION MODAL: DELETE SINGLE LOG */}
      {deletingSingleLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">Apagar Registro de Log?</h3>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
              <div>
                <strong className="text-slate-500">Data/Hora:</strong>{' '}
                {new Date(deletingSingleLog.timestamp).toLocaleString('pt-BR')}
              </div>
              <div>
                <strong className="text-slate-500">Ação:</strong>{' '}
                <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{deletingSingleLog.action}</span>
              </div>
              <div>
                <strong className="text-slate-500">Usuário:</strong> {deletingSingleLog.userName}
              </div>
              <div className="truncate">
                <strong className="text-slate-500">Detalhes:</strong> {deletingSingleLog.details}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingSingleLog(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Sim, Apagar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE SELECTED LOGS */}
      {showDeleteSelectedModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">Apagar Logs Selecionados?</h3>
                <p className="text-xs text-slate-500">
                  Você está prestes a excluir <strong>{selectedIds.length}</strong> registro(s).
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tem certeza de que deseja remover permanentemente os logs selecionados da trilha de auditoria?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteSelectedModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSelected}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Sim, Apagar Selecionados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: CLEAR ALL LOGS */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">Limpar TODOS os Logs?</h3>
                <p className="text-xs text-slate-500">Ação crítica de auditoria</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Esta ação apagar todos os <strong>{logs.length}</strong> registros do histórico de atividades. O histórico de acessos e modificações será completamente zerado.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Sim, Apagar Todos os Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
