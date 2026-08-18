import React, { useState } from 'react';
import { Cpu, Plus, Edit2, Trash2, Tag, Search, Film } from 'lucide-react';
import { EquipmentCategory, EquipmentModel, User } from '../types';
import { getEquipmentModels, saveEquipmentModel, deleteEquipmentModel, getCinemas, addActivityLog } from '../services/storageService';

interface EquipmentViewProps {
  currentUser: User | null;
  onRefresh: () => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({ currentUser, onRefresh }) => {
  const models = getEquipmentModels();
  const cinemas = getCinemas();
  const isAdmin = currentUser?.role === 'admin';

  const [activeCategory, setActiveCategory] = useState<EquipmentCategory | 'all'>('all');
  const [selectedCinemaFilter, setSelectedCinemaFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<EquipmentModel | null>(null);

  // Form State
  const [category, setCategory] = useState<EquipmentCategory>('projetor');
  const [brand, setBrand] = useState('Barco');
  const [modelName, setModelName] = useState('');
  const [cinemaId, setCinemaId] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [description, setDescription] = useState('');

  const filteredModels = models.filter((m) => {
    if (activeCategory !== 'all' && m.category !== activeCategory) return false;
    if (selectedCinemaFilter !== 'all' && m.cinemaId && m.cinemaId !== selectedCinemaFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.brand.toLowerCase().includes(q) ||
        m.model.toLowerCase().includes(q) ||
        (m.cinemaName && m.cinemaName.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingModel(null);
    setCategory(activeCategory === 'all' ? 'projetor' : activeCategory);
    setBrand('');
    setModelName('');
    setCinemaId('');
    setSerialNumber('');
    setDescription('');
    setShowModal(true);
  };

  const handleOpenEdit = (m: EquipmentModel) => {
    setEditingModel(m);
    setCategory(m.category);
    setBrand(m.brand);
    setModelName(m.model);
    setCinemaId(m.cinemaId || '');
    setSerialNumber(m.serialNumber || '');
    setDescription(m.description || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedCinema = cinemas.find((c) => c.id === cinemaId);

    const modelToSave: EquipmentModel = {
      id: editingModel ? editingModel.id : `mod-${Date.now()}`,
      category,
      brand,
      model: modelName,
      cinemaId: cinemaId || undefined,
      cinemaName: selectedCinema ? selectedCinema.name : undefined,
      serialNumber: serialNumber || undefined,
      description,
    };

    saveEquipmentModel(modelToSave);
    addActivityLog(
      editingModel ? 'EDITAR_MODELO' : 'CRIAR_MODELO',
      `Equipamento ${modelToSave.brand} ${modelToSave.model} salvo por ${currentUser?.name}`,
      currentUser
    );
    setShowModal(false);
    onRefresh();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Excluir o modelo ${name}?`)) {
      deleteEquipmentModel(id);
      addActivityLog('EXCLUIR_MODELO', `Modelo ${name} excluído por ${currentUser?.name}`, currentUser);
      onRefresh();
    }
  };

  const categoryLabels: Record<EquipmentCategory, string> = {
    projetor: 'Projetores',
    servidor: 'Servidores',
    processador: 'Processadores de Áudio',
    automacao: 'Automação',
    outros: 'Outros Equipamentos',
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Catálogo de Equipamentos
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Modelos de Equipamentos ({models.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mapeamento de modelos homologados Barco, Christie, Sony, Dolby, Doremi, GDC, QSC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-40 sm:w-48">
            <Film className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedCinemaFilter}
              onChange={(e) => setSelectedCinemaFilter(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
            >
              <option value="all">Todos os Cinemas</option>
              {cinemas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar modelo, marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
            />
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Equipamento</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['all', 'projetor', 'servidor', 'processador', 'automacao', 'outros'] as const).map((cat) => {
          const isActive = activeCategory === cat;
          const label = cat === 'all' ? 'Todas as Categorias' : categoryLabels[cat];
          const count = cat === 'all' ? models.length : models.filter((m) => m.category === cat).length;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((m) => (
          <div
            key={m.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                    {categoryLabels[m.category]}
                  </span>
                  <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                    {m.brand} <span className="font-semibold text-slate-700 dark:text-slate-300">{m.model}</span>
                  </h3>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id, `${m.brand} ${m.model}`)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Cinema Tag */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold">
                <Film className="w-3 h-3 text-blue-600" />
                <span>{m.cinemaName ? m.cinemaName : 'Todos os Cinemas (Global)'}</span>
              </div>

              {m.serialNumber && (
                <div className="mt-1 text-[11px] text-slate-500 font-mono">
                  S/N: {m.serialNumber}
                </div>
              )}

              {m.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  {m.description}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
              ID: {m.id}
            </div>
          </div>
        ))}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {editingModel ? 'Editar Equipamento' : 'Cadastrar Equipamento no Cinema'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cinema Vinculado *</label>
                <select
                  value={cinemaId}
                  onChange={(e) => setCinemaId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                >
                  <option value="">Todos os Cinemas (Disponível Geral)</option>
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                >
                  <option value="projetor">Projetores</option>
                  <option value="servidor">Servidores</option>
                  <option value="processador">Processadores de Áudio</option>
                  <option value="automacao">Automação</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fabricante / Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Barco, Christie, Dolby"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: SP4K-15"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nº de Série / Patrimônio</label>
                <input
                  type="text"
                  placeholder="Ex: BRC-98214-X"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição / Especificações</label>
                <textarea
                  rows={2}
                  placeholder="Especificações técnicas, lâmpada Xenon, laser RGB..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Equipamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
