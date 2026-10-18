import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  Globe, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Scale, 
  ShoppingBag, 
  Clock, 
  TrendingUp, 
  Filter, 
  X, 
  Check, 
  AlertCircle,
  RefreshCw,
  Coins
} from 'lucide-react';
import { AssociationMember } from '../types';
import { supabase } from '../supabaseClient';

export interface CannabisProduct {
  id: string;
  name: string;
  category: 'SATIVA' | 'INDICA' | 'HÍBRIDA' | 'EXTRACCIÓN' | 'COMESTIBLE';
  thcCbd?: string;
  pricePerGram: number;
  stockGrams: number;
  isActive: boolean;
  createdAt?: string;
}

export interface DispensationLog {
  id: string;
  productId?: string;
  productName: string;
  memberId?: string;
  memberNumber: string;
  memberName: string;
  grams: number;
  totalPrice: number;
  dispensedBy: string;
  createdAt: string;
}

interface DashboardStatsProps {
  members: AssociationMember[];
}

export default function DashboardStats({ members }: DashboardStatsProps) {
  // --- 1. MÉTRICAS EXISTENTES DE SOCIOS ---
  const totalMembers = members.length;
  const approvedMembers = members.filter(m => m.registrationStatus === 'approved').length;
  const pendingMembers = members.filter(m => m.registrationStatus === 'pending').length;
  const approvalRate = totalMembers > 0 ? Math.round((approvedMembers / totalMembers) * 100) : 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const membersThisMonth = members.filter(m => {
    const d = new Date(m.registerDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const natCount: Record<string, number> = {};
  members.forEach(m => {
    const nat = m.nationality ? m.nationality.toUpperCase().trim() : 'ESPAÑOLA';
    natCount[nat] = (natCount[nat] || 0) + 1;
  });
  let topNationality = 'N/D';
  let topNatCount = 0;
  Object.entries(natCount).forEach(([nat, count]) => {
    if (count > topNatCount) {
      topNatCount = count;
      topNationality = nat;
    }
  });
  const topNatPercentage = totalMembers > 0 ? Math.round((topNatCount / totalMembers) * 100) : 0;

  // --- 2. ESTADOS DE PRODUCTOS & DISPENSARIO ---
  const [products, setProducts] = useState<CannabisProduct[]>([]);
  const [dispensations, setDispensations] = useState<DispensationLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [periodFilter, setPeriodFilter] = useState<'day' | 'week' | 'month'>('day');

  // Modales
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CannabisProduct | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'SATIVA' | 'INDICA' | 'HÍBRIDA' | 'EXTRACCIÓN' | 'COMESTIBLE'>('HÍBRIDA');
  const [formThcCbd, setFormThcCbd] = useState('');
  const [formPrice, setFormPrice] = useState('6.00');
  const [formStock, setFormStock] = useState('100');

  // Modal Dispensación Rápida
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [selectedProductToDispense, setSelectedProductToDispense] = useState<CannabisProduct | null>(null);
  const [dispenseGrams, setDispenseGrams] = useState('1.5');
  const [dispenseMemberSearch, setDispenseMemberSearch] = useState('');
  const [selectedMemberForDispense, setSelectedMemberForDispense] = useState<AssociationMember | null>(null);

  // Cargar Productos y Dispensaciones
  const fetchDispensaryData = async () => {
    setIsLoading(true);
    try {
      // Cargar productos
      const { data: prodData, error: prodErr } = await supabase
        .from('cannabis_products')
        .select('*')
        .order('name', { ascending: true });

      if (!prodErr && prodData) {
        setProducts(prodData.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category || 'HÍBRIDA',
          thcCbd: p.thc_cbd || '',
          pricePerGram: Number(p.price_per_gram) || 0,
          stockGrams: Number(p.stock_grams) || 0,
          isActive: p.is_active ?? true,
          createdAt: p.created_at
        })));
      }

      // Cargar dispensaciones
      const { data: dispData, error: dispErr } = await supabase
        .from('dispensations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!dispErr && dispData) {
        setDispensations(dispData.map((d: any) => ({
          id: d.id,
          productId: d.product_id,
          productName: d.product_name,
          memberId: d.member_id,
          memberNumber: d.member_number,
          memberName: d.member_name,
          grams: Number(d.grams) || 0,
          totalPrice: Number(d.total_price) || 0,
          dispensedBy: d.dispensed_by || 'Admin',
          createdAt: d.created_at
        })));
      }
    } catch (err) {
      console.error("Error al cargar datos del dispensario:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDispensaryData();
  }, []);

  // --- 3. CRUD DE PRODUCTOS ---
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('HÍBRIDA');
    setFormThcCbd('THC: 20% | CBD: 1%');
    setFormPrice('6.00');
    setFormStock('100');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: CannabisProduct) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormThcCbd(prod.thcCbd || '');
    setFormPrice(prod.pricePerGram.toString());
    setFormStock(prod.stockGrams.toString());
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const payload = {
      name: formName.trim().toUpperCase(),
      category: formCategory,
      thc_cbd: formThcCbd.trim(),
      price_per_gram: parseFloat(formPrice) || 0,
      stock_grams: parseFloat(formStock) || 0,
      is_active: true
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('cannabis_products')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cannabis_products')
          .insert([payload]);
        if (error) throw error;
      }
      setIsProductModalOpen(false);
      fetchDispensaryData();
    } catch (err: any) {
      alert("Error al guardar producto: " + err.message);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la variedad "${name}" del catálogo?`)) return;
    try {
      const { error } = await supabase.from('cannabis_products').delete().eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert("Error eliminando producto: " + err.message);
    }
  };

  // --- 4. DISPENSACIÓN RÁPIDA ---
  const handleOpenDispense = (prod: CannabisProduct) => {
    setSelectedProductToDispense(prod);
    setDispenseGrams('1.5');
    setDispenseMemberSearch('');
    setSelectedMemberForDispense(members[0] || null);
    setIsDispenseModalOpen(true);
  };

  const handleConfirmDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductToDispense || !selectedMemberForDispense) {
      alert("Selecciona un socio para dispensar.");
      return;
    }

    const gramsNum = parseFloat(dispenseGrams) || 0;
    if (gramsNum <= 0) return;

    const totalPrice = gramsNum * selectedProductToDispense.pricePerGram;

    try {
      // 1. Guardar registro en dispensations
      const { error: dispErr } = await supabase.from('dispensations').insert([{
        product_id: selectedProductToDispense.id,
        product_name: selectedProductToDispense.name,
        member_id: selectedMemberForDispense.id,
        member_number: (selectedMemberForDispense as any).memberNumber || `SOC-${selectedMemberForDispense.id.slice(0, 6)}`,
        member_name: `${selectedMemberForDispense.firstName} ${selectedMemberForDispense.lastName}`,
        grams: gramsNum,
        total_price: totalPrice,
        dispensed_by: 'Administrador'
      }]);

      if (dispErr) throw dispErr;

      // 2. Descontar del stock disponible
      const newStock = Math.max(0, selectedProductToDispense.stockGrams - gramsNum);
      await supabase
        .from('cannabis_products')
        .update({ stock_grams: newStock })
        .eq('id', selectedProductToDispense.id);

      setIsDispenseModalOpen(false);
      fetchDispensaryData();
    } catch (err: any) {
      alert("Error registrando dispensación: " + err.message);
    }
  };

  // --- 5. FILTROS TEMPORALES PARA EL LOG / HISTORIAL ---
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Inicio de semana (Lunes)
  const currentDay = now.getDay();
  const distanceToMonday = (currentDay + 6) % 7;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday).getTime();

  // Inicio de mes
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const filteredDispensations = dispensations.filter(d => {
    const time = new Date(d.createdAt).getTime();
    if (periodFilter === 'day') return time >= startOfDay;
    if (periodFilter === 'week') return time >= startOfWeek;
    if (periodFilter === 'month') return time >= startOfMonth;
    return true;
  });

  // Totales en el periodo seleccionado
  const totalGramsSold = filteredDispensations.reduce((acc, curr) => acc + curr.grams, 0);
  const totalAmountSold = filteredDispensations.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalOperations = filteredDispensations.length;

  // Desglose por producto en el periodo
  const productBreakdown: Record<string, { grams: number; total: number; count: number }> = {};
  filteredDispensations.forEach(d => {
    if (!productBreakdown[d.productName]) {
      productBreakdown[d.productName] = { grams: 0, total: 0, count: 0 };
    }
    productBreakdown[d.productName].grams += d.grams;
    productBreakdown[d.productName].total += d.totalPrice;
    productBreakdown[d.productName].count += 1;
  });

  const sortedProductStats = Object.entries(productBreakdown).sort((a, b) => b[1].grams - a[1].grams);

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. SECCIÓN SUPERIOR: TARJETAS KPI DE SOCIOS (IMAGEN EXACTA) */}
      {/* ======================================================== */}
      <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-5 md:p-7 shadow-2xl relative overflow-hidden">
        
        {/* Cabecera del Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a2a1e] pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/40">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold bg-[#1a2a1e] text-emerald-400 px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-500/20">
                  PANEL DE INTELIGENCIA & AUDITORÍA
                </span>
                <span className="text-[10px] text-gray-500 font-mono">Exclusivo Administradores</span>
              </div>
              <h3 className="text-base sm:text-lg font-display font-black text-white mt-0.5 tracking-tight">
                Dashboard de Métricas & Rendimiento
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#080d0a] text-emerald-400 border border-[#1a2a1e]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {totalMembers} Socios Auditados
            </span>
          </div>
        </div>

        {/* 4 Tarjetas KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Miembros */}
          <div className="bg-[#080d0a] border border-[#1a2a1e] rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">TOTAL MIEMBROS</span>
              <Users size={16} className="text-emerald-400" />
            </div>
            <div className="my-3">
              <span className="text-3xl font-display font-black text-white">{totalMembers}</span>
              <span className="text-xs text-gray-500 font-mono ml-1.5">100%</span>
            </div>
            <div className="text-[11px] font-mono flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">{approvedMembers} activos</span>
              <span className="text-gray-600">•</span>
              <span className="text-amber-400 font-bold">{pendingMembers} pendientes</span>
            </div>
          </div>

          {/* Card 2: Tasa de Aprobación */}
          <div className="bg-[#080d0a] border border-[#1a2a1e] rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">TASA DE APROBACIÓN</span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="my-3">
              <span className="text-3xl font-display font-black text-emerald-400">{approvalRate}%</span>
              <span className="text-xs text-emerald-400/80 font-mono ml-1.5">Validados</span>
            </div>
            <div className="text-[11px] font-mono text-gray-500">
              0 expedientes denegados
            </div>
          </div>

          {/* Card 3: Nacionalidad Top */}
          <div className="bg-[#080d0a] border border-[#1a2a1e] rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">NACIONALIDAD TOP</span>
              <Globe size={16} className="text-emerald-400" />
            </div>
            <div className="my-3">
              <span className="text-2xl font-display font-black text-white truncate block">{topNationality}</span>
            </div>
            <div className="text-[11px] font-mono flex justify-between items-center text-gray-400">
              <span>{topNatCount} socios</span>
              <span className="text-emerald-400 font-bold">{topNatPercentage}% del censo</span>
            </div>
          </div>

          {/* Card 4: Altas Mes Actual */}
          <div className="bg-[#080d0a] border border-[#1a2a1e] rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">ALTAS MES ACTUAL</span>
              <Calendar size={16} className="text-emerald-400" />
            </div>
            <div className="my-3">
              <span className="text-3xl font-display font-black text-white">{membersThisMonth}</span>
              <span className="text-xs text-emerald-400 font-mono ml-1.5">Nuevos</span>
            </div>
            <div className="text-[11px] font-mono text-gray-500">
              Registrados mediante OCR/Manual
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CATÁLOGO DE VARIEDADES & DISPENSACIÓN DIARIA */}
      {/* ======================================================== */}
      <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-5 md:p-7 shadow-2xl space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a2a1e] pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-display font-black text-white uppercase flex items-center gap-2">
              <ShoppingBag size={20} className="text-emerald-400" />
              Variedades Disponibles & Dispensario
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Administra el menú diario, fija precios por gramo y dispensa directamente a los socios
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchDispensaryData}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-[#080d0a] border border-[#1a2a1e] text-gray-400 hover:text-white transition-all"
              title="Recargar datos"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={handleOpenCreateProduct}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-2 shadow-lg transition-all"
            >
              <Plus size={16} /> Añadir Variedad
            </button>
          </div>
        </div>

        {/* Cuadrícula de Variedades / Productos */}
        {products.length === 0 ? (
          <div className="p-8 text-center bg-[#080d0a] rounded-2xl border border-dashed border-[#1a2a1e] text-gray-500 text-xs">
            No hay variedades registradas en el catálogo. Haz clic en "Añadir Variedad" para comenzar.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map(prod => (
              <div 
                key={prod.id}
                className="bg-[#080d0a] border border-[#1a2a1e] hover:border-emerald-500/40 rounded-2xl p-4.5 flex flex-col justify-between transition-all space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                      prod.category === 'SATIVA' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                      prod.category === 'INDICA' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                      prod.category === 'EXTRACCIÓN' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    }`}>
                      {prod.category}
                    </span>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenEditProduct(prod)}
                        className="p-1 text-gray-400 hover:text-emerald-400 transition-colors"
                        title="Editar precio o stock"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(prod.id, prod.name)}
                        className="p-1 text-gray-400 hover:text-rose-400 transition-colors"
                        title="Eliminar variedad"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-white mt-2.5 truncate">{prod.name}</h4>
                  <p className="text-[10px] font-mono text-gray-400 mt-0.5">{prod.thcCbd || 'THC: Estándar'}</p>
                </div>

                <div className="pt-3 border-t border-[#1a2a1e] space-y-2.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">Aporte / Gramo:</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">{prod.pricePerGram.toFixed(2)} €</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-gray-500">Stock:</span>
                    <span className={`font-bold ${prod.stockGrams < 20 ? 'text-rose-400 animate-pulse' : 'text-gray-300'}`}>
                      {prod.stockGrams.toFixed(1)} g
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenDispense(prod)}
                    className="w-full h-8 bg-emerald-600/15 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Scale size={13} /> Dispensar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. HISTORIAL / BITÁCORA DE DISPENSACIÓN INTUITIVA */}
      {/* ======================================================== */}
      <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-5 md:p-7 shadow-2xl space-y-6">
        
        {/* Filtros Temporales (Día / Semana / Mes) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a2a1e] pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-display font-black text-white uppercase flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-400" />
              Auditoría & Resumen de Dispensación
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Control transparente de cantidades entregadas y aportaciones de socios
            </p>
          </div>

          {/* Selector de Periodo */}
          <div className="flex p-1 bg-[#080d0a] rounded-xl border border-[#1a2a1e] self-start sm:self-center">
            <button
              onClick={() => setPeriodFilter('day')}
              className={`px-3 sm:px-4 h-8 text-xs font-semibold rounded-lg transition-all ${
                periodFilter === 'day' ? 'bg-[#0e1711] text-emerald-400 font-bold border border-emerald-500/30 shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Hoy (Día)
            </button>
            <button
              onClick={() => setPeriodFilter('week')}
              className={`px-3 sm:px-4 h-8 text-xs font-semibold rounded-lg transition-all ${
                periodFilter === 'week' ? 'bg-[#0e1711] text-emerald-400 font-bold border border-emerald-500/30 shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setPeriodFilter('month')}
              className={`px-3 sm:px-4 h-8 text-xs font-semibold rounded-lg transition-all ${
                periodFilter === 'month' ? 'bg-[#0e1711] text-emerald-400 font-bold border border-emerald-500/30 shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Este Mes
            </button>
          </div>
        </div>

        {/* Resumen del Periodo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#080d0a] border border-[#1a2a1e] rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">TOTAL DISPENSADO</span>
              <p className="text-2xl font-black text-white mt-1">{totalGramsSold.toFixed(1)} <span className="text-sm font-normal text-gray-400">g</span></p>
            </div>
            <Scale size={24} className="text-emerald-400" />
          </div>

          <div className="p-4 bg-[#080d0a] border border-[#1a2a1e] rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">APORTACIONES TOTALES</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{totalAmountSold.toFixed(2)} <span className="text-sm font-normal text-emerald-500/70">€</span></p>
            </div>
            <Coins size={24} className="text-emerald-400" />
          </div>

          <div className="p-4 bg-[#080d0a] border border-[#1a2a1e] rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">OPERACIONES REGISTRADAS</span>
              <p className="text-2xl font-black text-white mt-1">{totalOperations}</p>
            </div>
            <Clock size={24} className="text-emerald-400" />
          </div>
        </div>

        {/* Desglose por Variedad en el Periodo */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
            Ranking de Variedades ({periodFilter === 'day' ? 'Hoy' : periodFilter === 'week' ? 'Semana' : 'Mes'})
          </h4>

          {sortedProductStats.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No hay dispensaciones en este periodo temporal.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {sortedProductStats.map(([prodName, stats]) => (
                <div key={prodName} className="p-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white truncate">{prodName}</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{stats.grams.toFixed(1)} g</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                    <span>{stats.count} entregas</span>
                    <span>{stats.total.toFixed(2)} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabla Detallada de Historial */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
            Bitácora de Operaciones Recientes
          </h4>

          <div className="overflow-x-auto border border-[#1a2a1e] rounded-2xl bg-[#080d0a]">
            {filteredDispensations.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">Sin registros en el periodo seleccionado.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-[#1a2a1e] font-mono text-[10px] text-gray-500 uppercase font-bold bg-[#0e1711]/50">
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Socio / Identificador</th>
                    <th className="py-3 px-4">Variedad Dispensada</th>
                    <th className="py-3 px-4 text-center">Cantidad</th>
                    <th className="py-3 px-4 text-right">Aporte (€)</th>
                    <th className="py-3 px-4 text-right">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2a1e]">
                  {filteredDispensations.map(disp => (
                    <tr key={disp.id} className="hover:bg-[#0e1711]/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-400">
                        {new Date(disp.createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{disp.memberName}</span>
                        <span className="text-[10px] font-mono text-emerald-400">{disp.memberNumber}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-200">
                        {disp.productName}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">
                        {disp.grams.toFixed(1)} g
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {disp.totalPrice.toFixed(2)} €
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[10px] text-gray-400">
                        {disp.dispensedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 4. MODAL CREAR / EDITAR PRODUCTO */}
      {/* ======================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-6 max-w-md w-full relative space-y-4 shadow-2xl">
            <button 
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 border-b border-[#1a2a1e] pb-3">
              <ShoppingBag className="text-emerald-400" size={20} />
              <h3 className="text-sm font-bold text-white uppercase">
                {editingProduct ? 'Editar Variedad' : 'Nueva Variedad de Cannabis'}
              </h3>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Nombre de la Variedad *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej: Amnesia Lemon"
                  className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Tipo / Categoría</label>
                  <select
                    value={formCategory}
                    onChange={(e: any) => setFormCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SATIVA">SATIVA</option>
                    <option value="INDICA">INDICA</option>
                    <option value="HÍBRIDA">HÍBRIDA</option>
                    <option value="EXTRACCIÓN">EXTRACCIÓN</option>
                    <option value="COMESTIBLE">COMESTIBLE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Precio por Gramo (€) *</label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Stock Inicial (Gramos) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">THC / CBD (Etiqueta)</label>
                  <input
                    type="text"
                    value={formThcCbd}
                    onChange={e => setFormThcCbd(e.target.value)}
                    placeholder="THC: 20% | CBD: 1%"
                    className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 mt-4"
              >
                <Check size={16} />
                <span>{editingProduct ? 'Actualizar Variedad' : 'Guardar Variedad'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL DISPENSACIÓN RÁPIDA */}
      {/* ======================================================== */}
      {isDispenseModalOpen && selectedProductToDispense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-6 max-w-sm w-full relative space-y-4 shadow-2xl">
            <button 
              onClick={() => setIsDispenseModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 border-b border-[#1a2a1e] pb-3">
              <Scale className="text-emerald-400" size={20} />
              <div>
                <h3 className="text-sm font-bold text-white uppercase">Dispensar {selectedProductToDispense.name}</h3>
                <span className="text-[10px] font-mono text-gray-400">{selectedProductToDispense.pricePerGram.toFixed(2)} € / gramo</span>
              </div>
            </div>

            <form onSubmit={handleConfirmDispense} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Socio Solicitante *</label>
                <select
                  value={selectedMemberForDispense?.id || ''}
                  onChange={(e) => {
                    const found = members.find(m => m.id === e.target.value);
                    if (found) setSelectedMemberForDispense(found);
                  }}
                  className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.lastName}, {m.firstName} ({(m as any).memberNumber || m.dniPassport})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Gramos a dispensar *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={selectedProductToDispense.stockGrams}
                    required
                    value={dispenseGrams}
                    onChange={e => setDispenseGrams(e.target.value)}
                    className="flex-1 h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-1">
                    {['1.0', '2.0', '5.0'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setDispenseGrams(g)}
                        className="px-2.5 h-10 bg-[#080d0a] border border-[#1a2a1e] hover:border-emerald-500 text-gray-300 font-mono text-xs rounded-xl"
                      >
                        {g}g
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Calculado */}
              <div className="p-3 bg-[#080d0a] rounded-xl border border-[#1a2a1e] flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold uppercase font-mono">Aporte Total:</span>
                <span className="text-lg font-black font-mono text-emerald-400">
                  {((parseFloat(dispenseGrams) || 0) * selectedProductToDispense.pricePerGram).toFixed(2)} €
                </span>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                <Check size={16} />
                <span>Confirmar Entrega</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}