import React, { useState } from 'react';
import { Tv, Plus, Edit2, Trash2, AlertOctagon, CheckCircle2, Wrench, ShieldAlert } from 'lucide-react';
import { Sala, SalaType, SalaStatus, User } from '../types';
import { getCinemas, getSalas, saveSala, deleteSala, addActivityLog } from '../services/storageService';

interface SalasViewProps {
  currentUser: User | null;
  onRefresh: () => void;
}

export const SalasView: React.FC<SalasViewProps> = ({ currentUser, onRefresh }) => {
  const cinemas = getCinemas();
  const salas = getSalas();
  const isAdmin = currentUser?.role === 'admin';

  const [selectedCinemaFilter, setSelectedCinemaFilter] = useState<string>('');
  const [editingSala, setEditingSala] = useState<Sala | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Status Change Modal State
  const [paralizeModalSala, setParalizeModalSala] = useState<Sala | null>(null);
  const [newStatus, setNewStatus] = useState<SalaStatus>('Paralizada');
  const [paralizedReason, setParalizedReason] = useState<string>('');

  // Form State
  const [cinemaId, setCinemaId] = useState(cinemas[0]?.id || '');
  const [number, setNumber] = useState(1);
  const [name, setName] = useState('Sala 1');
  const [type, setType] = useState<SalaType>('Convencional');
  const [status, setStatus] = useState<SalaStatus>('Ativa');
  const [notes, setNotes] = useState('');

  const filteredSalas = selectedCinemaFilter
    ? salas.filter((s) => s.cinemaId === selectedCinemaFilter)
    : salas;

  const handleOpenAdd = () => {
    setEditingSala(null);
    setCinemaId(cinemas[0]?.id || '');
    setNumber(salas.length + 1);
    setName(`Sala ${salas.length + 1}`);
    setType('Convencional');
    setStatus('Ativa');
    setNotes('');
    setShowModal(true);
  };

  const handleOpenEdit = (s: Sala) => {
    setEditingSala(s);
    setCinemaId(s.cinemaId);
    setNumber(s.number);
    setName(s.name);
    setType(s.type);
    setStatus(s.status || 'Ativa');
    setNotes(s.notes || '');
    setShowModal(true);
  };

  const handleOpenStatusModal = (s: Sala) => {
    setParalizeModalSala(s);
    setNewStatus(s.status === 'Paralizada' ? 'Ativa' : 'Paralizada');
    setParalizedReason(s.paralizedReason || '');
  };

  const handleSaveStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paralizeModalSala) return;

    const updatedSala: Sala = {
      ...paralizeModalSala,
      status: newStatus,
      paralizedReason: newStatus === 'Paralizada' ? paralizedReason : undefined,
      paralizedAt: newStatus === 'Paralizada' ? new Date().toISOString() : undefined,
    };

    saveSala(updatedSala);
    addActivityLog(
      'ALTERAR_STATUS_SALA',
      `Sala ${updatedSala.name} (${updatedSala.cinemaName}) alterada para [${newStatus}] pelo usuário ${currentUser?.name}${newStatus === 'Paralizada' ? ` - Motivo: ${paralizedReason}` : ''}`,
      currentUser
    );

    setParalizeModalSala(null);
    onRefresh();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cinema = cinemas.find((c) => c.id === cinemaId);

    const salaToSave: Sala = {
      id: editingSala ? editingSala.id : `sala-${Date.now()}`,
      cinemaId,
      cinemaName: cinema?.name || '',
      number: Number(number),
      name,
      type,
      status,
      paralizedReason: status === 'Paralizada' ? editingSala?.paralizedReason : undefined,
      notes,
      createdAt: editingSala ? editingSala.createdAt : new Date().toISOString(),
    };

    saveSala(salaToSave);
    addActivityLog(
      editingSala ? 'EDITAR_SALA' : 'CRIAR_SALA',
      `Sala ${salaToSave.name} (${salaToSave.type}) do cinema ${salaToSave.cinemaName} salva por ${currentUser?.name}`,
      currentUser
    );
    setShowModal(false);
    onRefresh();
  };

  const handleDelete = (id: string, sName: string) => {
    if (confirm(`Deseja excluir a sala ${sName}?`)) {
      deleteSala(id);
      addActivityLog('EXCLUIR_SALA', `Sala ${sName} excluída por ${currentUser?.name}`, currentUser);
      onRefresh();
    }
  };

  const paralizedCount = salas.filter((s) => s.status === 'Paralizada').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Mapeamento e Paralisação de Salas
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Salas de Projeção ({salas.length})
            {paralizedCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                {paralizedCount} {paralizedCount === 1 ? 'Paralizada' : 'Paralizadas'}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cadastre salas e gerencie o status operacional (Ativa, Paralizada ou Em Manutenção).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCinemaFilter}
            onChange={(e) => setSelectedCinemaFilter(e.target.value)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="">Todos os Cinemas</option>
            {cinemas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-sky-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Sala</span>
            </button>
          )}
        </div>
      </div>

      {/* Table of Screens */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Nº</th>
                <th className="py-3 px-4">Nome da Sala</th>
                <th className="py-3 px-4">Cinema Vinculado</th>
                <th className="py-3 px-4">Tecnologia</th>
                <th className="py-3 px-4">Status Operacional</th>
                <th className="py-3 px-4">Motivo / Obs</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
              {filteredSalas.map((s) => {
                const isParalized = s.status === 'Paralizada';
                const isMaintenance = s.status === 'Manutenção';

                return (
                  <tr key={s.id} className={`transition-colors ${isParalized ? 'bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                    <td className="py-3 px-4 font-black text-sky-600 dark:text-sky-400">#{s.number}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-semibold">{s.cinemaName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.type === 'IMAX'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300'
                            : s.type === 'Cinepic' || s.type === 'Laser'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                            : s.type === 'VIP'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {s.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isParalized ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 shadow-xs">
                          <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400 animate-pulse" />
                          PARALIZADA
                        </span>
                      ) : isMaintenance ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                          <Wrench className="w-3 h-3 text-amber-600" />
                          Manutenção
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Ativa
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {isParalized && s.paralizedReason ? (
                        <span className="text-rose-700 dark:text-rose-300 font-bold text-[11px] block truncate" title={s.paralizedReason}>
                          ⚠️ {s.paralizedReason}
                        </span>
                      ) : (
                        <span className="text-slate-500 truncate block">{s.notes || 'Sem observações'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenStatusModal(s)}
                          title="Alterar Status da Sala (Paralizar / Reativar)"
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            isParalized
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                              : 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{isParalized ? 'Reativar Sala' : 'Paralizar'}</span>
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.name)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PARALIZE / STATUS MODAL */}
      {paralizeModalSala && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${newStatus === 'Paralizada' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950'}`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Alterar Status Operacional
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {paralizeModalSala.cinemaName} • {paralizeModalSala.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveStatusChange} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Novo Status da Sala *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('Ativa')}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                      newStatus === 'Ativa'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Ativa
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('Manutenção')}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                      newStatus === 'Manutenção'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Manutenção
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('Paralizada')}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                      newStatus === 'Paralizada'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Paralizada
                  </button>
                </div>
              </div>

              {newStatus === 'Paralizada' && (
                <div>
                  <label className="block font-bold text-rose-700 dark:text-rose-300 mb-1">
                    Motivo da Paralisação *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Descreva o problema crítico (ex: Projetor com bloco óptico danificado, servidor sem boot, vazamento de iluminação)..."
                    value={paralizedReason}
                    onChange={(e) => setParalizedReason(e.target.value)}
                    className="w-full p-2.5 bg-rose-50/50 dark:bg-slate-800 border border-rose-200 dark:border-rose-800 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setParalizeModalSala(null)}
                  className="px-4 py-2 font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-bold text-white rounded-xl shadow-xs cursor-pointer ${
                    newStatus === 'Paralizada' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  Confirmar Alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {editingSala ? 'Editar Sala' : 'Cadastrar Nova Sala'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cinema *</label>
                <select
                  required
                  value={cinemaId}
                  onChange={(e) => setCinemaId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                >
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Número *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={number}
                    onChange={(e) => setNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Sala *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sala 1 - IMAX Laser"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo / Tecnologia *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as SalaType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  >
                    <option value="Convencional">Convencional</option>
                    <option value="Premium">Premium</option>
                    <option value="IMAX">IMAX</option>
                    <option value="VIP">VIP</option>
                    <option value="Cinepic">Cinepic</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Inicial *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SalaStatus)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  >
                    <option value="Ativa">Ativa</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Paralizada">Paralizada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observações</label>
                <textarea
                  rows={3}
                  placeholder="Dimensões da tela, tipo de projetor fixo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
