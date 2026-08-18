import React, { useState, useEffect } from 'react';
import {
  X,
  Boxes,
  Building2,
  Tag,
  Hash,
  MapPin,
  Layers,
  AlertTriangle,
  DollarSign,
  Calendar,
  FileText,
  Save,
} from 'lucide-react';
import { InventoryItem, EquipmentCategory, User, Cinema } from '../types';
import { saveInventoryItem, calculateStockStatus } from '../services/storageService';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit: InventoryItem | null;
  cinemas: Cinema[];
  currentUser: User | null;
  defaultCinemaId?: string;
  onSuccess?: () => void;
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'projetor', label: 'Projetores & Módulos' },
  { value: 'som', label: 'Áudio & Processamento' },
  { value: 'servidor', label: 'Servidores & IMB' },
  { value: 'lampada', label: 'Lâmpadas & Consumíveis' },
  { value: 'pecas', label: 'Peças & Placas Eletrônicas' },
  { value: 'cabos', label: 'Cabos & Conectores' },
  { value: 'optico', label: 'Lentes & Ópticos' },
  { value: 'acessorios', label: 'Acessórios & 3D' },
  { value: 'outros', label: 'Outros Suprimentos' },
];

const UNIT_OPTIONS = ['unid.', 'peça', 'kit', 'par', 'metro', 'caixa', 'rolo'];

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  itemToEdit,
  cinemas,
  currentUser,
  defaultCinemaId,
  onSuccess,
}) => {
  const [cinemaId, setCinemaId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('lampada');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [minQuantity, setMinQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>('unid.');
  const [unitCost, setUnitCost] = useState<string>('');
  const [lastRestockDate, setLastRestockDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (itemToEdit) {
        setCinemaId(itemToEdit.cinemaId);
        setName(itemToEdit.name);
        setCategory(itemToEdit.category || 'lampada');
        setBrand(itemToEdit.brand || '');
        setModel(itemToEdit.model || '');
        setPartNumber(itemToEdit.partNumber || '');
        setSerialNumber(itemToEdit.serialNumber || '');
        setLocation(itemToEdit.location || '');
        setQuantity(itemToEdit.quantity || 0);
        setMinQuantity(itemToEdit.minQuantity ?? 1);
        setUnit(itemToEdit.unit || 'unid.');
        setUnitCost(itemToEdit.unitCost !== undefined ? String(itemToEdit.unitCost) : '');
        setLastRestockDate(itemToEdit.lastRestockDate || '');
        setNotes(itemToEdit.notes || '');
      } else {
        const initialCinema = defaultCinemaId && defaultCinemaId !== 'all' 
          ? defaultCinemaId 
          : (cinemas.length > 0 ? cinemas[0].id : '');
        setCinemaId(initialCinema);
        setName('');
        setCategory('lampada');
        setBrand('');
        setModel('');
        setPartNumber('');
        setSerialNumber('');
        setLocation('');
        setQuantity(1);
        setMinQuantity(1);
        setUnit('unid.');
        setUnitCost('');
        setLastRestockDate(new Date().toISOString().split('T')[0]);
        setNotes('');
      }
    }
  }, [isOpen, itemToEdit, cinemas, defaultCinemaId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Informe o nome ou descrição do equipamento / item de estoque.');
      return;
    }
    if (!cinemaId) {
      setError('Selecione o cinema de alocação deste item.');
      return;
    }
    if (quantity < 0) {
      setError('A quantidade em estoque não pode ser negativa.');
      return;
    }

    const selectedCinema = cinemas.find((c) => c.id === cinemaId);
    const cinemaName = selectedCinema ? selectedCinema.name : 'Cinema';
    const now = new Date().toISOString();

    const numericCost = unitCost.trim() !== '' ? parseFloat(unitCost.replace(',', '.')) : undefined;

    const stockItem: InventoryItem = {
      id: itemToEdit ? itemToEdit.id : `EST-${Date.now().toString().slice(-6)}`,
      cinemaId,
      cinemaName,
      name: name.trim(),
      category,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      partNumber: partNumber.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      location: location.trim() || undefined,
      quantity: Number(quantity),
      minQuantity: Number(minQuantity) >= 0 ? Number(minQuantity) : 0,
      unit: unit.trim() || 'unid.',
      status: calculateStockStatus(Number(quantity), Number(minQuantity)),
      unitCost: !isNaN(numericCost as number) ? numericCost : undefined,
      lastRestockDate: lastRestockDate.trim() || undefined,
      notes: notes.trim() || undefined,
      createdById: itemToEdit?.createdById || currentUser?.id,
      createdByName: itemToEdit?.createdByName || currentUser?.name,
      createdAt: itemToEdit ? itemToEdit.createdAt : now,
      updatedAt: now,
    };

    saveInventoryItem(stockItem, currentUser);
    if (onSuccess) onSuccess();
    onClose();
  };

  const calculatedStatus = calculateStockStatus(Number(quantity), Number(minQuantity));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="inventory-modal-container"
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden transition-all my-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-semibold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {itemToEdit ? 'Editar Item de Estoque' : 'Cadastrar Item no Estoque'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {itemToEdit ? `Código: ${itemToEdit.id}` : 'Adicione peças, lâmpadas ou equipamentos sobressalentes'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-inventory-modal"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cinema e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                Cinema / Complexo *
              </label>
              <select
                id="inventory-cinema-select"
                value={cinemaId}
                onChange={(e) => setCinemaId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              >
                <option value="" disabled>Selecione um cinema</option>
                {cinemas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city}/{c.state})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                Categoria do Item *
              </label>
              <select
                id="inventory-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nome / Descrição Principal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nome / Descrição do Item *
            </label>
            <input
              id="inventory-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lâmpada Xenon Ushio 3000W, Filtro Laser Barco SP4K, etc."
              required
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
            />
          </div>

          {/* Marca, Modelo e Códigos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Fabricante / Marca
              </label>
              <input
                id="inventory-brand-input"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Barco, Ushio, Osram, Christie, Dolby, JBL"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Modelo
              </label>
              <input
                id="inventory-model-input"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: DXL-30BA, CP4230, Core 110f"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Part Number / Código da Peça
              </label>
              <input
                id="inventory-partnumber-input"
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="Ex: R9801321, USH-3000-BA"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Localização Física no Cinema
              </label>
              <input
                id="inventory-location-input"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Almoxarifado Cabine 1 - Prateleira A, Armário TI"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              />
            </div>
          </div>

          {/* Quantidades e Estoque Mínimo */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                Controle de Quantidade & Nível de Estoque
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  calculatedStatus === 'Em Estoque'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : calculatedStatus === 'Baixo Estoque'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                Status: {calculatedStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantidade Atual *
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(0, prev - 1))}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-center text-base"
                  >
                    -
                  </button>
                  <input
                    id="inventory-quantity-input"
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    required
                    className="w-full text-center px-2 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-base font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-center text-base"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mínimo de Segurança
                </label>
                <input
                  id="inventory-minquantity-input"
                  type="number"
                  min="0"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Ex: 2"
                  className="w-full text-center px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5 text-center">Gera alerta de baixo estoque</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Unidade
                </label>
                <select
                  id="inventory-unit-select"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Custo Unitário e Data de Reposição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                Custo Unitário Estimado (R$)
              </label>
              <input
                id="inventory-cost-input"
                type="text"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Ex: 4850.00"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data da Última Reposição
              </label>
              <input
                id="inventory-date-input"
                type="date"
                value={lastRestockDate}
                onChange={(e) => setLastRestockDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Observações Técnicas / Aplicação
            </label>
            <textarea
              id="inventory-notes-textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Lâmpadas de reserva para projetores Barco das Salas 01 e 02."
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition resize-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              id="btn-save-inventory-item"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm hover:shadow transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{itemToEdit ? 'Atualizar Estoque' : 'Cadastrar Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
