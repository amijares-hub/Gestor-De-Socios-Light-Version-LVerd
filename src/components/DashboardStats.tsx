import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  Globe, 
  Calendar, 
  ShieldCheck, 
  BarChart3, 
  PieChart as PieIcon, 
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { AssociationMember } from '../types';

export interface DashboardStatsProps {
  members: AssociationMember[];
  className?: string;
}

const STATUS_COLORS = {
  active: '#10b981',    // Emerald
  pending: '#f59e0b',   // Amber
  rejected: '#f43f5e',  // Rose
};

const NATIONALITY_COLORS = [
  '#dc2626', // Brand red
  '#ef4444',
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#64748b'  // Slate
];

export default function DashboardStats({ members, className = '' }: DashboardStatsProps) {
  // 1. Key calculations
  const stats = useMemo(() => {
    const total = members.length;
    const approved = members.filter(m => m.registrationStatus === 'approved').length;
    const pending = members.filter(m => m.registrationStatus === 'pending').length;
    const rejected = members.filter(m => m.registrationStatus === 'rejected').length;
    
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    
    // Monthly registrations count for current month
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthRegistrations = members.filter(m => {
      try {
        return m.registerDate && m.registerDate.startsWith(currentMonthPrefix);
      } catch {
        return false;
      }
    }).length;

    // Status breakdown for PieChart
    const statusData = [
      { name: 'Activos / Aprobados', value: approved, color: STATUS_COLORS.active },
      { name: 'Pendientes', value: pending, color: STATUS_COLORS.pending },
      { name: 'Rechazados', value: rejected, color: STATUS_COLORS.rejected },
    ].filter(item => item.value > 0 || total === 0);

    // Nationality breakdown for BarChart
    const nationalityMap: Record<string, number> = {};
    members.forEach(m => {
      const nat = (m.nationality || 'NO ESPECIFICADA').trim().toUpperCase();
      nationalityMap[nat] = (nationalityMap[nat] || 0) + 1;
    });

    const sortedNationalities = Object.entries(nationalityMap)
      .sort((a, b) => b[1] - a[1]);

    const topNationalities = sortedNationalities.slice(0, 5).map(([name, count], index) => ({
      name,
      cantidad: count,
      porcentaje: total > 0 ? Math.round((count / total) * 100) : 0,
      fill: NATIONALITY_COLORS[index % NATIONALITY_COLORS.length]
    }));

    if (sortedNationalities.length > 5) {
      const othersCount = sortedNationalities.slice(5).reduce((acc, curr) => acc + curr[1], 0);
      topNationalities.push({
        name: 'OTRAS',
        cantidad: othersCount,
        porcentaje: total > 0 ? Math.round((othersCount / total) * 100) : 0,
        fill: '#64748b'
      });
    }

    const topNationalityName = sortedNationalities[0]?.[0] || 'N/D';
    const topNationalityCount = sortedNationalities[0]?.[1] || 0;

    // Monthly registrations breakdown (Last 6 to 12 months)
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyMap: Record<string, { label: string; yearMonth: string; total: number; aprobados: number; pendientes: number }> = {};

    // Initialize past 6 months to guarantee clean chronological display even if empty
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      monthlyMap[ym] = { label, yearMonth: ym, total: 0, aprobados: 0, pendientes: 0 };
    }

    // Populate with real data
    members.forEach(m => {
      try {
        const dateObj = new Date(m.registerDate);
        if (isNaN(dateObj.getTime())) return;
        const ym = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        const label = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear().toString().slice(2)}`;
        
        if (!monthlyMap[ym]) {
          monthlyMap[ym] = { label, yearMonth: ym, total: 0, aprobados: 0, pendientes: 0 };
        }
        monthlyMap[ym].total += 1;
        if (m.registrationStatus === 'approved') monthlyMap[ym].aprobados += 1;
        if (m.registrationStatus === 'pending') monthlyMap[ym].pendientes += 1;
      } catch (e) {
        // ignore invalid dates
      }
    });

    const monthlyData = Object.values(monthlyMap)
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

    return {
      total,
      approved,
      pending,
      rejected,
      approvalRate,
      thisMonthRegistrations,
      topNationalityName,
      topNationalityCount,
      statusData,
      topNationalities,
      monthlyData
    };
  }, [members]);

  // Custom Dark Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-panel-dark/95 backdrop-blur-md border border-border-dark p-3 rounded-xl shadow-2xl text-xs font-mono">
          {label && <div className="text-gray-300 font-bold mb-1 border-b border-border-dark pb-1">{label}</div>}
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center gap-2 py-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill || '#dc2626' }} />
              <span className="text-gray-400">{entry.name}:</span>
              <span className="font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Admin Section Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-panel-dark via-panel-dark to-brand-dark border border-border-dark rounded-3xl p-5 md:p-6 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-80" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red shadow-lg shadow-brand-red/10">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-brand-red/15 text-brand-red border border-brand-red/30 px-2 py-0.5 rounded-md">
                  Panel de Inteligencia & Auditoría
                </span>
                <span className="text-[10px] font-mono text-gray-400">Exclusivo Administradores</span>
              </div>
              <h2 className="text-base md:text-xl font-display font-black text-white tracking-tight mt-0.5">
                Dashboard de Métricas & Rendimiento
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-brand-dark px-3 py-1.5 rounded-xl border border-border-dark">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{members.length} Socios Auditados</span>
          </div>
        </div>

        {/* 4 Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          
          <div className="bg-brand-dark/70 border border-border-dark/80 rounded-2xl p-3.5 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Total Miembros</span>
              <Users size={14} className="text-brand-red" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-display font-black text-white">{stats.total}</span>
              <span className="text-[10px] text-gray-500 font-mono">100%</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400">
              <span className="text-emerald-400 font-bold">{stats.approved} activos</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{stats.pending} pendientes</span>
            </div>
          </div>

          <div className="bg-brand-dark/70 border border-border-dark/80 rounded-2xl p-3.5 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Tasa de Aprobación</span>
              <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-display font-black text-emerald-400">{stats.approvalRate}%</span>
              <span className="text-[10px] text-emerald-500/70 font-mono font-bold">Validados</span>
            </div>
            <div className="mt-1 text-[10px] text-gray-500">
              {stats.rejected} expedientes denegados
            </div>
          </div>

          <div className="bg-brand-dark/70 border border-border-dark/80 rounded-2xl p-3.5 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Nacionalidad Top</span>
              <Globe size={14} className="text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-display font-black text-white truncate" title={stats.topNationalityName}>
                {stats.topNationalityName}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-gray-400 flex items-center justify-between">
              <span>{stats.topNationalityCount} socios</span>
              <span className="font-mono text-blue-400">
                {stats.total > 0 ? Math.round((stats.topNationalityCount / stats.total) * 100) : 0}% del censo
              </span>
            </div>
          </div>

          <div className="bg-brand-dark/70 border border-border-dark/80 rounded-2xl p-3.5 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Altas Mes Actual</span>
              <Calendar size={14} className="text-brand-red" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-display font-black text-white">{stats.thisMonthRegistrations}</span>
              <span className="text-[10px] text-brand-red font-mono font-bold">Nuevos</span>
            </div>
            <div className="mt-1 text-[10px] text-gray-500">
              Registrados mediante OCR/Manual
            </div>
          </div>

        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CHART 1: Registros Mensuales (Timeline Trend) - 7 cols on large screens */}
        <div className="lg:col-span-7 bg-panel-dark border border-border-dark rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-border-dark/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-brand-red" />
                <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                  Registros Mensuales
                </h3>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Evolución de altas mensuales en la asociación (tendencia cronológica)
              </p>
            </div>
            <span className="text-[10px] font-mono bg-brand-red/10 border border-brand-red/30 text-brand-red px-2.5 py-1 rounded-lg font-bold">
              Mensual
            </span>
          </div>

          <div className="h-64 w-full mt-2">
            {stats.monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
                No hay datos suficientes para graficar registros mensuales.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaRegistros" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="areaAprobados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    name="Total Registros" 
                    stroke="#dc2626" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#areaRegistros)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="aprobados" 
                    name="Aprobados" 
                    stroke="#10b981" 
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1} 
                    fill="url(#areaAprobados)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border-dark/60 flex items-center justify-between text-[11px] font-mono text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-red"></span>
                Total Altas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Aprobados
              </span>
            </div>
            <span>Últimos meses</span>
          </div>
        </div>

        {/* CHART 2: Socios Activos vs Pendientes (Donut Pie) - 5 cols on large screens */}
        <div className="lg:col-span-5 bg-panel-dark border border-border-dark rounded-3xl p-5 md:p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2 border-b border-border-dark/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <PieIcon size={16} className="text-emerald-400" />
                <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                  Activos vs Pendientes
                </h3>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Estado de tramitación y validez del censo
              </p>
            </div>
          </div>

          <div className="h-56 w-full flex items-center justify-center relative">
            {stats.total === 0 ? (
              <div className="text-xs text-gray-500 font-mono">Sin datos de miembros</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#121218" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Inner Center Label */}
            {stats.total > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-display font-black text-white">{stats.total}</span>
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">Socios</span>
              </div>
            )}
          </div>

          {/* Status Breakdown Legend Cards */}
          <div className="grid grid-cols-3 gap-2 border-t border-border-dark/60 pt-3">
            <div className="bg-brand-dark p-2 rounded-xl text-center border border-emerald-500/20">
              <span className="text-[9px] font-mono uppercase text-emerald-400 font-bold block">Activos</span>
              <span className="text-sm font-bold text-white">{stats.approved}</span>
              <span className="text-[9px] text-gray-500 block font-mono">
                {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
              </span>
            </div>

            <div className="bg-brand-dark p-2 rounded-xl text-center border border-amber-500/20">
              <span className="text-[9px] font-mono uppercase text-amber-400 font-bold block">Pendientes</span>
              <span className="text-sm font-bold text-white">{stats.pending}</span>
              <span className="text-[9px] text-gray-500 block font-mono">
                {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%
              </span>
            </div>

            <div className="bg-brand-dark p-2 rounded-xl text-center border border-rose-500/20">
              <span className="text-[9px] font-mono uppercase text-rose-400 font-bold block">Rechazados</span>
              <span className="text-sm font-bold text-white">{stats.rejected}</span>
              <span className="text-[9px] text-gray-500 block font-mono">
                {stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* CHART 3: Distribución por Nacionalidad */}
      <div className="bg-panel-dark border border-border-dark rounded-3xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-border-dark/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-blue-400" />
              <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                Distribución por Nacionalidad
              </h3>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Representación demográfica de los miembros registrados en la asociación
            </p>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            {stats.topNationalities.length} Grupos Principales
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Bar Chart Visualizer */}
          <div className="lg:col-span-7 h-60 w-full">
            {stats.topNationalities.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
                No hay nacionalidades registradas.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.topNationalities}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cantidad" name="Socios" radius={[0, 8, 8, 0]}>
                    {stats.topNationalities.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Detailed Breakdown List */}
          <div className="lg:col-span-5 space-y-2.5">
            {stats.topNationalities.map((nat, i) => (
              <div 
                key={nat.name}
                className="bg-brand-dark/80 border border-border-dark/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: nat.fill }} />
                  <span className="font-bold text-gray-200 truncate uppercase">{nat.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                  <span className="text-white font-bold">{nat.cantidad} socios</span>
                  <span className="text-gray-500 font-semibold w-10 text-right">{nat.porcentaje}%</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}
