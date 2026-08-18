import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  FileDown,
  Trash2,
  Calendar,
  RefreshCw,
  PlusCircle,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  MaintenanceReport,
  User,
  ReportFilter,
  EquipmentCategory,
  MaintenanceType,
  ReportStatus,
} from '../types';
import { getCinemas, getSalas, getUsers, getCompanyConfig, deleteReport } from '../services/storageService';
import { generateReportPDF } from '../utils/pdfGenerator';
import { formatDateBR } from '../utils/dateFormatter';

interface ReportsViewProps {
  reports: MaintenanceReport[];
  currentUser: User | null;
  onSelectReport: (report: MaintenanceReport) => void;
  onNewMaintenance: () => void;
  onRefresh: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  currentUser,
  onSelectReport,
  onNewMaintenance,
  onRefresh,
}) => {
  const cinemas = getCinemas();
  const salas = getSalas();
  const users = getUsers();
  const company = getCompanyConfig();

  const isAdmin = currentUser?.role === 'admin';

  // Filters State
  const [filter, setFilter] = useState<ReportFilter>({
    startDate: '',
    endDate: '',
    cinemaId: '',
    salaId: '',
    technicianId: '',
    category: 'all',
    maintenanceType: 'all',
    status: 'all',
    searchQuery: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  const handleDownloadSingleReport = async (report: MaintenanceReport) => {
    if (downloadingReportId) return;
    setDownloadingReportId(report.id);
    try {
      await generateReportPDF(report, company);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setDownloadingReportId(null);
    }
  };

  // Filter Logic
  const filteredReports = reports.filter((r) => {
    // Technician restriction: If technician, only show own reports OR allow viewing all if submitted
    if (!isAdmin && r.technicianId !== currentUser?.id && r.status === 'draft') {
      return false;
    }

    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      const matchQuery =
        r.id.toLowerCase().includes(q) ||
        r.cinemaName.toLowerCase().includes(q) ||
        r.salaName.toLowerCase().includes(q) ||
        r.technicianName.toLowerCase().includes(q) ||
        r.generalDescription.toLowerCase().includes(q);
      if (!matchQuery) return false;
    }

    if (filter.startDate && r.date < filter.startDate) return false;
    if (filter.endDate && r.date > filter.endDate) return false;
    if (filter.cinemaId && r.cinemaId !== filter.cinemaId) return false;
    if (filter.salaId && r.salaId !== filter.salaId) return false;
    if (filter.technicianId && r.technicianId !== filter.technicianId) return false;
    if (filter.maintenanceType !== 'all' && r.maintenanceType !== filter.maintenanceType) return false;
    if (filter.status !== 'all' && r.status !== filter.status) return false;

    if (filter.category !== 'all') {
      const hasCat = r.equipmentItems?.some((eq) => eq.category === filter.category);
      if (!hasCat) return false;
    }

    return true;
  });

  const handleClearFilters = () => {
    setFilter({
      startDate: '',
      endDate: '',
      cinemaId: '',
      salaId: '',
      technicianId: '',
      category: 'all',
      maintenanceType: 'all',
      status: 'all',
      searchQuery: '',
    });
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Data', 'Hora', 'Cinema', 'Sala', 'Técnico', 'Tipo', 'Status', 'Qtd Equipamentos'];
    const rows = filteredReports.map((r) => [
      r.id,
      r.date,
      r.time,
      `"${r.cinemaName}"`,
      `"${r.salaName}"`,
      `"${r.technicianName}"`,
      r.maintenanceType,
      r.status,
      r.equipmentItems ? r.equipmentItems.length : 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Relatorios_CMM_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Histórico & Consulta
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Relatórios de Manutenção ({filteredReports.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Filtre por período, cinema, técnico ou categoria e baixe o PDF compilado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showFilters
                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filtros Avançados</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exportar para CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={onNewMaintenance}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-sm shadow-sky-600/20 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Manutenção</span>
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      {(showFilters || filter.searchQuery) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Filtros de Pesquisa
            </h3>
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Busca Livre (Texto)
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Código, cinema, modelo..."
                  value={filter.searchQuery}
                  onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Cinema
              </label>
              <select
                value={filter.cinemaId}
                onChange={(e) => setFilter({ ...filter, cinemaId: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
              >
                <option value="">Todos os Cinemas</option>
                {cinemas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Técnico
              </label>
              <select
                value={filter.technicianId}
                onChange={(e) => setFilter({ ...filter, technicianId: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
              >
                <option value="">Todos os Técnicos</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Tipo Manutenção
              </label>
              <select
                value={filter.maintenanceType}
                onChange={(e) =>
                  setFilter({ ...filter, maintenanceType: e.target.value as MaintenanceType | 'all' })
                }
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
              >
                <option value="all">Todos os Tipos</option>
                <option value="Preventiva">Preventiva</option>
                <option value="Corretiva">Corretiva</option>
                <option value="Emergencial">Emergencial</option>
                <option value="Inspeção">Inspeção</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={filter.startDate || ''}
                onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={filter.endDate || ''}
                onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Categoria de Equipamento
              </label>
              <select
                value={filter.category}
                onChange={(e) =>
                  setFilter({ ...filter, category: e.target.value as EquipmentCategory | 'all' })
                }
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
              >
                <option value="all">Todas as Categorias</option>
                <option value="projetor">Projetores</option>
                <option value="servidor">Servidores</option>
                <option value="processador">Processadores de Áudio</option>
                <option value="automacao">Automação</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Status
              </label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value as ReportStatus | 'all' })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
              >
                <option value="all">Todos os Status</option>
                <option value="submitted">Concluído e Enviado</option>
                <option value="draft">Rascunho</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* REPORTS DATA TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Nenhum relatório encontrado</p>
            <p className="text-xs text-slate-500 mt-1">Tente ajustar os filtros ou emitir uma nova manutenção.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Cinema & Sala</th>
                  <th className="py-3 px-4">Técnico</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-center">Fotos</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
                {filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">{r.id}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateBR(r.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{r.cinemaName}</div>
                      <div className="text-[10px] text-slate-500">{r.salaName} [{r.salaType}]</div>
                    </td>
                    <td className="py-3 px-4 font-semibold">{r.technicianName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.maintenanceType === 'Preventiva'
                            ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                            : r.maintenanceType === 'Emergencial'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {r.maintenanceType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {r.photos ? r.photos.length : 0} 📸
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'submitted'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {r.status === 'submitted' ? 'Concluído' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectReport(r)}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Visualizar Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadSingleReport(r)}
                          disabled={downloadingReportId === r.id}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            downloadingReportId === r.id
                              ? 'text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 cursor-not-allowed'
                              : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title="Baixar PDF"
                        >
                          {downloadingReportId === r.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (confirm(`Excluir o relatório ${r.id}?`)) {
                                deleteReport(r.id);
                                onRefresh();
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
