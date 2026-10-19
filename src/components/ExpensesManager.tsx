import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  TrendingDown, 
  Coins, 
  X, 
  Check, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Expense, ExpenseCategory } from '../types';

const PRESET_CATEGORIES: ExpenseCategory[] = [
  'Alquiler',
  'Luz',
  'Agua',
  'Internet',
  'Alarma',
  'Suministros varios (compras)',
  'Gastos administrativos',
  'Seguros',
  'Extintores',
  'Impuestos Varios',
  'Otros'
];

export default function ExpensesManager() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Formulario
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Suministros varios (compras)');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setExpenses(data.map((item: any) => ({
          id: item.id,
          category: item.category,
          customCategory: item.custom_category || '',
          description: item.description || '',
          amount: Number(item.amount) || 0,
          expenseDate: item.expense_date,
          createdBy: item.created_by || 'Admin',
          createdAt: item.created_at
        })));
      }
    } catch (err) {
      console.error('Error al cargar gastos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleOpenCreate = () => {
    setEditingExpense(null);
    setFormCategory('Suministros varios (compras)');
    setFormCustomCategory('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormCategory(exp.category);
    setFormCustomCategory(exp.customCategory || '');
    setFormAmount(exp.amount.toString());
    setFormDate(exp.expenseDate);
    setFormDescription(exp.description || '');
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Introduce un importe válido mayor a 0');
      return;
    }

    if (formCategory === 'Otros' && !formCustomCategory.trim()) {
      alert('Especifica el concepto de la categoría "Otros"');
      return;
    }

    const payload = {
      category: formCategory,
      custom_category: formCategory === 'Otros' ? formCustomCategory.trim() : null,
      description: formDescription.trim(),
      amount: amountNum,
      expense_date: formDate,
      created_by: 'Administrador'
    };

    try {
      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingExpense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      alert('Error guardando gasto: ' + err.message);
    }
  };

  const handleDeleteExpense = async (exp: Expense) => {
    const label = exp.category === 'Otros' && exp.customCategory ? exp.customCategory : exp.category;
    if (!confirm(`¿Eliminar el registro de gasto "${label}" por ${exp.amount.toFixed(2)} €?`)) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', exp.id);
      if (error) throw error;
      setExpenses(prev => prev.filter(item => item.id !== exp.id));
    } catch (err: any) {
      alert('Error al eliminar gasto: ' + err.message);
    }
  };

  // --- FILTRO TEMPORAL ---
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const currentDayOfWeek = now.getDay();
  const distanceToMonday = (currentDayOfWeek + 6) % 7;
  const startOfWeekDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);
  const startOfWeekStr = startOfWeekDate.toISOString().split('T')[0];

  const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const startOfYearStr = `${now.getFullYear()}-01-01`;

  const filteredExpenses = expenses.filter(exp => {
    const d = exp.expenseDate;
    if (periodFilter === 'day') return d === todayStr;
    if (periodFilter === 'week') return d >= startOfWeekStr && d <= todayStr;
    if (periodFilter === 'month') return d >= startOfMonthStr;
    if (periodFilter === 'year') return d >= startOfYearStr;
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const countExpenses = filteredExpenses.length;

  // Desglose por categoría
  const categoryStats: Record<string, { total: number; count: number }> = {};
  filteredExpenses.forEach(exp => {
    const catName = exp.category === 'Otros' && exp.customCategory 
      ? `Otros: ${exp.customCategory}` 
      : exp.category;

    if (!categoryStats[catName]) {
      categoryStats[catName] = { total: 0, count: 0 };
    }
    categoryStats[catName].total += exp.amount;
    categoryStats[catName].count += 1;
  });

  const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1].total - a[1].total);
  const topCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : 'N/D';
  const topCategoryTotal = sortedCategories.length > 0 ? sortedCategories[0][1].total : 0;

  return (
    <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-5 md:p-7 shadow-2xl space-y-6">
      
      {/* Cabecera y Selector de Periodo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a2a1e] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold bg-[#1a2a1e] text-emerald-400 px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-500/20">
              CONTABILIDAD & SUMINISTROS
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-display font-black text-white uppercase flex items-center gap-2 mt-1">
            <Receipt size={20} className="text-emerald-400" />
            Control de Gastos Operativos
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Registro contable de alquiler, suministros, impuestos y compras generales
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de periodo: Día, Semana, Mes, Año */}
          <div className="flex p-1 bg-[#080d0a] rounded-xl border border-[#1a2a1e]">
            <button
              type="button"
              onClick={() => setPeriodFilter('day')}
              className={`px-3 h-8 text-xs font-semibold rounded-lg transition-all ${
                periodFilter === 'day' ? 'bg-[#0e1711] text-emerald-400 font-bold border border-emerald-500/30 shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Hoy (Día)
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('week')}
              className={`px-3 h-8 text-xs font-semibold rounded-lg transition-all ${
                periodFilter === 'week' ? 'bg-[#0e1711] text-emerald-400 font-bold border border-emerald-500/30 shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Esta Semana
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('month')}
              className={`px-3 h-8 text-xs font-semibold rounded-lg transition-all ${
                periodFilter === 'month' ? 'bg-[#0e1711] text-emerald-400 font-bold border border-emerald-500/30 shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('year')}
              className={`px-3 h-8 text-xs font-semibold rounded-lg transition-all ${
                periodFilter === 'year' ? 'bg-[#0e1711] text-emerald-400 font-bold border border-emerald-500/30 shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Este Año
            </button>
          </div>

          <button
            type="button"
            onClick={fetchExpenses}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#080d0a] border border-[#1a2a1e] text-gray-400 hover:text-white transition-all"
            title="Actualizar datos"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 shadow-lg transition-all"
          >
            <Plus size={16} /> Registrar Gasto
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Gastos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#080d0a] border border-[#1a2a1e] rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">TOTAL GASTOS ({periodFilter === 'day' ? 'HOY' : periodFilter === 'week' ? 'SEMANA' : periodFilter === 'month' ? 'MES' : 'AÑO'})</span>
            <p className="text-2xl font-black text-rose-400 mt-1">
              {totalExpenses.toFixed(2)} <span className="text-sm font-normal text-rose-500/70">€</span>
            </p>
          </div>
          <TrendingDown size={24} className="text-rose-400" />
        </div>

        <div className="p-4 bg-[#080d0a] border border-[#1a2a1e] rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">MAYOR CONCEPTO</span>
            <p className="text-base font-black text-white mt-1 truncate max-w-[180px]">{topCategory}</p>
            <span className="text-xs font-mono text-gray-400">{topCategoryTotal.toFixed(2)} €</span>
          </div>
          <FolderOpen size={24} className="text-emerald-400" />
        </div>

        <div className="p-4 bg-[#080d0a] border border-[#1a2a1e] rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">PAGOS REGISTRADOS</span>
            <p className="text-2xl font-black text-white mt-1">{countExpenses}</p>
          </div>
          <Coins size={24} className="text-emerald-400" />
        </div>
      </div>

      {/* Desglose de Gastos por Categoría */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
          Desglose por Suministro / Categoría
        </h4>

        {sortedCategories.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No hay gastos contabilizados en este periodo.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sortedCategories.map(([cat, stats]) => (
              <div key={cat} className="p-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white truncate pr-2">{cat}</span>
                  <span className="text-[11px] font-mono text-rose-400 font-bold shrink-0">{stats.total.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                  <span>{stats.count} {stats.count === 1 ? 'registro' : 'registros'}</span>
                  <span>{totalExpenses > 0 ? Math.round((stats.total / totalExpenses) * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabla Detallada de Gastos */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
          Libro de Gastos & Facturas
        </h4>

        <div className="overflow-x-auto border border-[#1a2a1e] rounded-2xl bg-[#080d0a]">
          {filteredExpenses.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">Sin movimientos en este periodo temporal.</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-[#1a2a1e] font-mono text-[10px] text-gray-500 uppercase font-bold bg-[#0e1711]/50">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Categoría / Suministro</th>
                  <th className="py-3 px-4">Concepto / Notas</th>
                  <th className="py-3 px-4 text-right">Importe (€)</th>
                  <th className="py-3 px-4 text-right">Registrado por</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2a1e]">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-[#0e1711]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-400">
                      {new Date(exp.expenseDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-white block">
                        {exp.category === 'Otros' && exp.customCategory ? exp.customCategory : exp.category}
                      </span>
                      {exp.category === 'Otros' && (
                        <span className="text-[9px] font-mono text-emerald-400 uppercase">Categoría: Otros</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {exp.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                      -{exp.amount.toFixed(2)} €
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[10px] text-gray-500">
                      {exp.createdBy}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 bg-[#0e1711] hover:bg-[#1a2a1e] border border-[#1a2a1e] rounded-lg text-gray-400 hover:text-emerald-400 transition-colors"
                          title="Editar gasto"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp)}
                          className="p-1.5 bg-[#0e1711] hover:bg-rose-500/10 border border-[#1a2a1e] hover:border-rose-500/30 rounded-lg text-gray-400 hover:text-rose-400 transition-colors"
                          title="Eliminar gasto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Registrar / Editar Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-6 max-w-md w-full relative space-y-4 shadow-2xl">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 border-b border-[#1a2a1e] pb-3">
              <Receipt className="text-emerald-400" size={20} />
              <h3 className="text-sm font-bold text-white uppercase">
                {editingExpense ? 'Modificar Registro de Gasto' : 'Nuevo Gasto / Suministro'}
              </h3>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">
                  Categoría de Suministro *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
                >
                  {PRESET_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Campo para escribir si se selecciona 'Otros' */}
              {formCategory === 'Otros' && (
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">
                    Especificar Categoría (Texto libre) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    placeholder="Ej: Mantenimiento aire acondicionado"
                    className="w-full h-10 px-3 bg-[#080d0a] border border-emerald-500/50 rounded-xl text-white font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">
                    Importe (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">
                    Fecha del Gasto *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">
                  Descripción / Concepto (Opcional)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ej: Factura Endesa mes de octubre"
                  className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2"
              >
                <Check size={16} />
                <span>{editingExpense ? 'Actualizar Gasto' : 'Confirmar y Guardar Gasto'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
