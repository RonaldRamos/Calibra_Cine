import React, { useState } from 'react';
import {
  Film,
  Tv,
  Users,
  FileText,
  Wrench,
  Building2,
  ChevronDown,
  Trophy,
  AlertOctagon,
  Award,
  CheckCircle2,
  Filter,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MaintenanceReport, User, Sala } from '../types';
import { getDashboardStats, getCinemas, getUsers, getSalas } from '../services/storageService';
import { formatDateBR } from '../utils/dateFormatter';

interface DashboardViewProps {
  reports: MaintenanceReport[];
  onNewMaintenance: () => void;
  onViewReports: () => void;
  onSelectReport: (report: MaintenanceReport) => void;
  currentUser: User | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  onNewMaintenance,
  onViewReports,
  onSelectReport,
  currentUser,
}) => {
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>('');

  const cinemas = getCinemas();
  const allUsers = getUsers().filter((u) => u.status === 'ativo');
  const allSalas = getSalas();

  // Filter reports by selected cinema if any
  const filteredReports = selectedCinemaId
    ? reports.filter((r) => r.cinemaId === selectedCinemaId)
    : reports;

  const filteredSalas = selectedCinemaId
    ? allSalas.filter((s) => s.cinemaId === selectedCinemaId)
    : allSalas;

  // Stats calculation
  const stats = getDashboardStats();

  const totalCinemasCount = selectedCinemaId ? 1 : cinemas.length;
  const totalSalasCount = filteredSalas.length;
  const paralizedSalas = filteredSalas.filter((s) => s.status === 'Paralizada');
  const maintenanceSalas = filteredSalas.filter((s) => s.status === 'Manutenção');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const reportsTodayCount = filteredReports.filter((r) => r.date === todayStr).length;
  const reportsThisMonthCount = filteredReports.filter((r) => {
    if (!r.date) return false;
    const d = new Date(r.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  }).length;

  // Monthly trend for filtered reports
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyData = monthNames.map((month, idx) => {
    const count = filteredReports.filter((r) => {
      if (!r.date) return false;
      const d = new Date(r.date);
      return d.getFullYear() === currentYear && d.getMonth() === idx;
    }).length;
    return { month, total: count };
  });

  // Equipment category breakdown
  let projetorCount = 0;
  let servidorCount = 0;
  let audioCount = 0;
  let automacaoCount = 0;
  let outrosCount = 0;

  filteredReports.forEach((r) => {
    r.equipmentItems?.forEach((eq) => {
      const type = (eq.category || eq.type || '').toLowerCase();
      if (type.includes('projetor')) projetorCount++;
      else if (type.includes('servidor')) servidorCount++;
      else if (type.includes('áudio') || type.includes('audio') || type.includes('processador')) audioCount++;
      else if (type.includes('automação') || type.includes('automacao')) automacaoCount++;
      else outrosCount++;
    });
  });

  const totalCatSum = projetorCount + servidorCount + audioCount + automacaoCount + outrosCount;
  const denominator = totalCatSum > 0 ? totalCatSum : 1;

  const categoryChartData = [
    { name: 'Projetor', value: projetorCount || 1, percentage: totalCatSum > 0 ? `${Math.round((projetorCount / denominator) * 100)}%` : '0%', color: '#3b82f6' },
    { name: 'Servidor', value: servidorCount || 1, percentage: totalCatSum > 0 ? `${Math.round((servidorCount / denominator) * 100)}%` : '0%', color: '#22c55e' },
    { name: 'Processador Áudio', value: audioCount || 1, percentage: totalCatSum > 0 ? `${Math.round((audioCount / denominator) * 100)}%` : '0%', color: '#f97316' },
    { name: 'Automação', value: automacaoCount || 1, percentage: totalCatSum > 0 ? `${Math.round((automacaoCount / denominator) * 100)}%` : '0%', color: '#a855f7' },
    { name: 'Outros', value: outrosCount || 1, percentage: totalCatSum > 0 ? `${Math.round((outrosCount / denominator) * 100)}%` : '0%', color: '#94a3b8' },
  ];

  // TECHNICIAN PERFORMANCE RANKING
  // Gather stats per user
  const technicianStats = allUsers.map((tech) => {
    const techReports = filteredReports.filter(
      (r) => r.technicianId === tech.id || r.technicianName?.toLowerCase() === tech.name.toLowerCase()
    );

    const total = techReports.length;
    const preventiva = techReports.filter((r) => r.maintenanceType === 'Preventiva').length;
    const corretiva = techReports.filter((r) => r.maintenanceType === 'Corretiva').length;
    const emergencial = techReports.filter((r) => r.maintenanceType === 'Emergencial').length;

    // Get last report date
    const sorted = [...techReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastReportDate = sorted[0]?.date || 'Nenhum';

    return {
      tech,
      total,
      preventiva,
      corretiva,
      emergencial,
      lastReportDate,
    };
  });

  // Sort by total reports descending
  technicianStats.sort((a, b) => b.total - a.total);
  const topTechCount = technicianStats[0]?.total || 1;

  // Latest reports
  const sortedReports = [...filteredReports].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
    return dateB - dateA;
  });
  const latestReports = sortedReports.slice(0, 5);

  // Cinema progress distribution
  const cinemaCounts: Record<string, number> = {};
  filteredReports.forEach((r) => {
    if (r.cinemaName) {
      cinemaCounts[r.cinemaName] = (cinemaCounts[r.cinemaName] || 0) + 1;
    }
  });

  const cinemaEntries = Object.entries(cinemaCounts).sort((a, b) => b[1] - a[1]);
  const maxCinemaCount = cinemaEntries.length > 0 ? cinemaEntries[0][1] : 1;

  const cinemaProgressList = cinemaEntries.slice(0, 5).map(([name, count]) => ({
    name,
    count,
    percentage: Math.min(100, Math.round((count / maxCinemaCount) * 100)),
  }));

  const selectedCinemaName = cinemas.find((c) => c.id === selectedCinemaId)?.name || 'Todos os Cinemas';

  return (
    <div className="space-y-6 pb-12">
      {/* TOP BANNER & CINEMA FILTER SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-2xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Visão Geral Operacional
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Dashboard CalibraCine
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {selectedCinemaName}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhe a performance dos técnicos, emissão de relatórios e status operacional das salas.
          </p>
        </div>

        {/* Cinema Selector Filter */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-2 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden sm:inline shrink-0">
            Filtrar por Cinema:
          </span>
          <select
            value={selectedCinemaId}
            onChange={(e) => setSelectedCinemaId(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
          >
            <option value="">🏢 Todos os Cinemas ({cinemas.length})</option>
            {cinemas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.city}/{c.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5 TOP STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Stat 1: Cinemas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalCinemasCount}</div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Cinemas ativos</div>
          </div>
        </div>

        {/* Stat 2: Salas (with paralized alert) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-end gap-1.5">
              <span>{totalSalasCount}</span>
              {paralizedSalas.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded-md border border-rose-300 animate-pulse">
                  {paralizedSalas.length} Off
                </span>
              )}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Salas cadastradas</div>
          </div>
        </div>

        {/* Stat 3: Técnicos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.totalTechnicians}</div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Técnicos ativos</div>
          </div>
        </div>

        {/* Stat 4: Relatórios este mês */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{reportsThisMonthCount}</div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Relatórios este mês</div>
          </div>
        </div>

        {/* Stat 5: Relatórios hoje */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{reportsTodayCount}</div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Relatórios hoje</div>
          </div>
        </div>
      </div>

      {/* PARALIZED ROOMS ALERT CARD (IF ANY ROOM IS PARALIZED) */}
      {(paralizedSalas.length > 0 || maintenanceSalas.length > 0) && (
        <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-extrabold text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
              <span>Atenção Operacional: Salas Paralizadas / Fora de Serviço ({paralizedSalas.length + maintenanceSalas.length})</span>
            </div>
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-1 rounded-full">
              Status Crítico
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paralizedSalas.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/80 p-3.5 rounded-xl space-y-1.5 text-xs shadow-2xs"
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900 dark:text-slate-100">
                    {s.cinemaName} • {s.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-extrabold border border-rose-300">
                    PARALIZADA
                  </span>
                </div>
                <p className="text-rose-700 dark:text-rose-300 font-medium text-[11px] leading-relaxed">
                  <strong>Motivo:</strong> {s.paralizedReason || 'Aguardando reparo técnico'}
                </p>
              </div>
            ))}

            {maintenanceSalas.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/80 p-3.5 rounded-xl space-y-1.5 text-xs shadow-2xs"
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900 dark:text-slate-100">
                    {s.cinemaName} • {s.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-extrabold border border-amber-300">
                    EM MANUTENÇÃO
                  </span>
                </div>
                <p className="text-amber-700 dark:text-amber-300 font-medium text-[11px]">
                  Técnico atuando na restauração da sala.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RANKING DE DESEMPENHO DOS TÉCNICOS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Ranking de Desempenho dos Técnicos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Classificação baseada na quantidade total de relatórios de manutenção entregues.
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl self-start sm:self-auto">
            Total: {technicianStats.reduce((acc, curr) => acc + curr.total, 0)} relatórios
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {technicianStats.map((item, index) => {
            const isGold = index === 0 && item.total > 0;
            const isSilver = index === 1 && item.total > 0;
            const isBronze = index === 2 && item.total > 0;

            const percentage = topTechCount > 0 ? Math.round((item.total / topTechCount) * 100) : 0;

            return (
              <div
                key={item.tech.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                  isGold
                    ? 'bg-gradient-to-br from-amber-50/80 to-amber-100/30 dark:from-amber-950/40 dark:to-slate-900 border-amber-300 dark:border-amber-800 shadow-xs'
                    : isSilver
                    ? 'bg-gradient-to-br from-slate-100/80 to-slate-50 dark:from-slate-800/60 dark:to-slate-900 border-slate-300 dark:border-slate-700'
                    : isBronze
                    ? 'bg-gradient-to-br from-orange-50/60 to-orange-100/20 dark:from-orange-950/30 dark:to-slate-900 border-orange-300/80 dark:border-orange-900/60'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Badge Number / Medal */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                        isGold
                          ? 'bg-amber-500 text-white shadow-sm'
                          : isSilver
                          ? 'bg-slate-400 text-white'
                          : isBronze
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isGold ? '🥇' : isSilver ? '🥈' : isBronze ? '🥉' : `#${index + 1}`}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{item.tech.name}</span>
                        {item.tech.role === 'admin' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.tech.specialty || 'Técnico de Campo'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                      {item.total}
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Relatórios
                    </p>
                  </div>
                </div>

                {/* Progress Bar Share */}
                <div className="space-y-1 pt-1">
                  <div className="w-full h-2 bg-slate-200/80 dark:bg-slate-700/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isGold
                          ? 'bg-amber-500'
                          : isSilver
                          ? 'bg-slate-500'
                          : isBronze
                          ? 'bg-orange-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.max(8, percentage)}%` }}
                    />
                  </div>

                  {/* Types breakdown */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400 pt-1">
                    <span className="text-emerald-600 dark:text-emerald-400">{item.preventiva} Prev</span>
                    <span className="text-sky-600 dark:text-sky-400">{item.corretiva} Corr</span>
                    <span className="text-rose-600 dark:text-rose-400">{item.emergencial} Emerg</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Manutenções por Mês ({currentYear})
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
              {selectedCinemaName}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Equipment Category Distribution Donut Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Distribuição por Equipamento
            </h3>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div className="h-44 w-44 shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((item, index) => (
                      <Cell key={`cell-${index}`} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Percentage Legend */}
            <div className="space-y-2 flex-1">
              {categoryChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 dark:text-slate-300 truncate font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 ml-2">{item.percentage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: RECENT REPORTS & MAINTENANCE BY CINEMA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Reports Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Últimos Relatórios Entregues
            </h3>
            <button
              onClick={onViewReports}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {latestReports.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum relatório registrado para o filtro selecionado.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                    <th className="py-2.5 px-2">Data</th>
                    <th className="py-2.5 px-2">Cinema</th>
                    <th className="py-2.5 px-2">Sala</th>
                    <th className="py-2.5 px-2">Técnico</th>
                    <th className="py-2.5 px-2">Tipo</th>
                    <th className="py-2.5 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
                  {latestReports.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => onSelectReport(r)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-2 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                        {formatDateBR(r.date)}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                        {r.cinemaName}
                      </td>
                      <td className="py-2.5 px-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.salaName}</td>
                      <td className="py-2.5 px-2 font-medium">{r.technicianName}</td>
                      <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300 capitalize">{r.maintenanceType}</td>
                      <td className="py-2.5 px-2 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {r.status || 'Concluído'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Maintenance by Cinema (Progress Bars) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Manutenções por Cinema
            </h3>
            <button
              onClick={onViewReports}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ver relatórios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 pt-1">
            {cinemaProgressList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum cinema com manutenções registradas.
              </div>
            ) : (
              cinemaProgressList.map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{c.count} relatórios</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
