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
  X, 
  Check, 
  RefreshCw, 
  Coins, 
  Lock, 
  ArrowRightLeft,
  AlertTriangle,
  Filter,
  CheckSquare,
  Square,
  Layers
} from 'lucide-react';
import { AssociationMember, CannabisProduct, DispensationLog, WorkerUser } from '../types';
import { supabase } from '../supabaseClient';
import StickyNotesWidget from './StickyNotesWidget';

interface DashboardStatsProps {
  members: AssociationMember[];
  currentWorker?: WorkerUser | null;
}

interface BatchDispenseItem {
  product: CannabisProduct;
  grams: string;
  euros: string;
  pesoReal: string;
}

export default function DashboardStats({ members, currentWorker }: DashboardStatsProps) {
  const isAdmin = !currentWorker || currentWorker.role === 'admin';
  const canModifyDispensation = isAdmin || (currentWorker?.permissions?.includes('modify_dispensations') ?? false);
  const canManageCatalog = isAdmin || (currentWorker?.permissions?.includes('manage_catalog') ?? true);
  const canDispense = isAdmin || (currentWorker?.permissions?.includes('dispense_cannabis') ?? true);

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

  // FILTRO POR VARIEDAD EN AUDITORÍA
  const [selectedProductFilters, setSelectedProductFilters] = useState<string[]>([]);

  // SELECCIÓN MÚLTIPLE PARA DISPENSACIÓN EN LOTE (BATCH)
  const [selectedBatchProductIds, setSelectedBatchProductIds] = useState<string[]>([]);
  const [isBatchDispenseModalOpen, setIsBatchDispenseModalOpen] = useState(false);
  const [batchDispenseDate, setBatchDispenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchItems, setBatchItems] = useState<BatchDispenseItem[]>([]);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Modales Producto individual
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CannabisProduct | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'SATIVA' | 'INDICA' | 'HÍBRIDA' | 'EXTRACCIÓN' | 'COMESTIBLE'>('HÍBRIDA');
  const [formThcCbd, setFormThcCbd] = useState('');
  const [formPrice, setFormPrice] = useState('8.00');
  const [formStock, setFormStock] = useState('100');

  // Modal Dispensación Individual
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [selectedProductToDispense, setSelectedProductToDispense] = useState<CannabisProduct | null>(null);
  const [dispenseDate, setDispenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [dispenseGrams, setDispenseGrams] = useState('5.0');
  const [dispenseEuros, setDispenseEuros] = useState('40.00');
  const [pesoReal, setPesoReal] = useState('5.0');

  // Modal Edición Dispensación
  const [isEditDispenseModalOpen, setIsEditDispenseModalOpen] = useState(false);
  const [editingDispense, setEditingDispense] = useState<DispensationLog | null>(null);
  const [editDispenseGrams, setEditDispenseGrams] = useState('');
  const [editRealWeight, setEditRealWeight] = useState('');

  const parseDecimalInput = (val: string): number => {
    if (!val) return 0;
    const clean = String(val).trim().replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const fetchDispensaryData = async () => {
    setIsLoading(true);
    try {
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

      const { data: dispData, error: dispErr } = await supabase
        .from('dispensations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!dispErr && dispData) {
        setDispensations(dispData.map((d: any) => ({
          id: d.id,
          productId: d.product_id,
          productName: d.product_name,
          memberId: d.member_id,
          memberNumber: d.member_number || 'JORNADA',
          memberName: d.member_name || 'Dispensación Diaria',
          grams: Number(d.grams) || 0,
          realWeight: d.real_weight !== null && d.real_weight !== undefined ? Number(d.real_weight) : Number(d.grams) || 0,
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

  // CRUD Productos
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('HÍBRIDA');
    setFormThcCbd('THC: 20% | CBD: 1%');
    setFormPrice('8.00');
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
      price_per_gram: parseDecimalInput(formPrice),
      stock_grams: parseDecimalInput(formStock),
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
      setSelectedBatchProductIds(prev => prev.filter(pId => pId !== id));
    } catch (err: any) {
      alert("Error eliminando producto: " + err.message);
    }
  };

  // --- SELECCIÓN MÚLTIPLE DE VARIEDADES PARA DISPENSAR EN LOTE ---
  const toggleSelectBatchProduct = (productId: string) => {
    setSelectedBatchProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  const selectAllBatchProducts = () => {
    if (selectedBatchProductIds.length === products.length) {
      setSelectedBatchProductIds([]);
    } else {
      setSelectedBatchProductIds(products.map(p => p.id));
    }
  };

  const handleOpenBatchModal = () => {
    const selectedProds = products.filter(p => selectedBatchProductIds.includes(p.id));
    if (selectedProds.length === 0) return;

    const initialItems: BatchDispenseItem[] = selectedProds.map(prod => {
      const initG = 5.0;
      const initEur = (initG * prod.pricePerGram).toFixed(2);
      return {
        product: prod,
        grams: initG.toString(),
        euros: initEur,
        pesoReal: initG.toString()
      };
    });

    setBatchItems(initialItems);
    setBatchDispenseDate(new Date().toISOString().split('T')[0]);
    setIsBatchDispenseModalOpen(true);
  };

  const handleBatchItemGramsChange = (index: number, val: string) => {
    setBatchItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.grams = val;
      const g = parseDecimalInput(val);
      item.euros = (g * item.product.pricePerGram).toFixed(2);
      item.pesoReal = val;
      updated[index] = item;
      return updated;
    });
  };

  const handleBatchItemEurosChange = (index: number, val: string) => {
    setBatchItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.euros = val;
      const eur = parseDecimalInput(val);
      if (item.product.pricePerGram > 0) {
        const calculatedGrams = (eur / item.product.pricePerGram).toFixed(2);
        item.grams = calculatedGrams;
        item.pesoReal = calculatedGrams;
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleBatchItemRealWeightChange = (index: number, val: string) => {
    setBatchItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], pesoReal: val };
      return updated;
    });
  };

  const handleRemoveBatchItem = (index: number) => {
    const itemToRemove = batchItems[index];
    setBatchItems(prev => prev.filter((_, i) => i !== index));
    if (itemToRemove) {
      setSelectedBatchProductIds(prev => prev.filter(id => id !== itemToRemove.product.id));
    }
  };

  // Validación de límites en lote
  const checkBatchErrors = () => {
    for (const item of batchItems) {
      const g = parseDecimalInput(item.grams);
      const pr = parseDecimalInput(item.pesoReal);
      const maxExtra = g < 5 ? 0.09 : 1.0;
      const extra = pr - g;
      if (g <= 0) return true;
      if (extra > maxExtra + 0.0001) return true;
    }
    return false;
  };

  const hasBatchErrors = checkBatchErrors();

  const handleConfirmBatchDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchItems.length === 0 || hasBatchErrors || isSubmittingBatch) return;

    setIsSubmittingBatch(true);
    const nowTimeStr = new Date().toTimeString().split(' ')[0];
    const timestamp = new Date(`${batchDispenseDate}T${nowTimeStr}`).toISOString();
    const workerName = currentWorker?.name || 'Administrador / Trabajador';

    try {
      for (const item of batchItems) {
        const gramsNum = parseDecimalInput(item.grams);
        const eurosNum = parseDecimalInput(item.euros);
        const pesoRealNum = parseDecimalInput(item.pesoReal) || gramsNum;

        // 1. Guardar registro en dispensaciones
        const { error: dispErr } = await supabase.from('dispensations').insert([{
          product_id: item.product.id,
          product_name: item.product.name,
          member_id: null,
          member_number: 'JORNADA',
          member_name: `Cierre Múltiple (${batchDispenseDate}) • Real: ${pesoRealNum.toFixed(2)}g`,
          grams: gramsNum,
          real_weight: pesoRealNum,
          total_price: eurosNum,
          dispensed_by: workerName,
          created_at: timestamp
        }]);

        if (dispErr) throw dispErr;

        // 2. Descontar el Peso Real de inventario
        const currentStock = Number(item.product.stockGrams) || 0;
        const newStock = Math.max(0, currentStock - pesoRealNum);

        await supabase
          .from('cannabis_products')
          .update({ stock_grams: newStock })
          .eq('id', item.product.id);
      }

      setIsBatchDispenseModalOpen(false);
      setSelectedBatchProductIds([]);
      setBatchItems([]);
      fetchDispensaryData();
    } catch (err: any) {
      alert("Error en dispensación múltiple: " + err.message);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // --- DISPENSACIÓN INDIVIDUAL ---
  const handleOpenDispense = (prod: CannabisProduct) => {
    setSelectedProductToDispense(prod);
    setDispenseDate(new Date().toISOString().split('T')[0]);
    const initGrams = 5.0;
    const initEuros = (initGrams * prod.pricePerGram).toFixed(2);
    setDispenseGrams(initGrams.toString());
    setDispenseEuros(initEuros);
    setPesoReal(initGrams.toString());
    setIsDispenseModalOpen(true);
  };

  const handleGramsChange = (val: string) => {
    setDispenseGrams(val);
    if (!selectedProductToDispense) return;
    const g = parseDecimalInput(val);
    const calculatedEuros = (g * selectedProductToDispense.pricePerGram).toFixed(2);
    setDispenseEuros(calculatedEuros);
    setPesoReal(val);
  };

  const handleEurosChange = (val: string) => {
    setDispenseEuros(val);
    if (!selectedProductToDispense || selectedProductToDispense.pricePerGram <= 0) return;
    const eur = parseDecimalInput(val);
    const calculatedGrams = (eur / selectedProductToDispense.pricePerGram).toFixed(2);
    setDispenseGrams(calculatedGrams);
    setPesoReal(calculatedGrams);
  };

  const currentGramsNum = parseDecimalInput(dispenseGrams);
  const currentPesoRealNum = parseDecimalInput(pesoReal);
  const maxAllowedExtra = currentGramsNum < 5 ? 0.09 : 1.0;
  const maxAllowedRealWeight = Number((currentGramsNum + maxAllowedExtra).toFixed(2));
  const currentExtra = Number((currentPesoRealNum - currentGramsNum).toFixed(2));
  const isExtraExceeded = currentExtra > maxAllowedExtra + 0.0001;

  const handleConfirmDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductToDispense) return;

    const gramsNum = parseDecimalInput(dispenseGrams);
    const eurosNum = parseDecimalInput(dispenseEuros);
    const pesoRealNum = parseDecimalInput(pesoReal) || gramsNum;

    if (gramsNum <= 0 && eurosNum <= 0) {
      alert("Introduce una cantidad válida en gramos o euros.");
      return;
    }

    const extraLimit = gramsNum < 5 ? 0.09 : 1.0;
    const maxRealWeight = Number((gramsNum + extraLimit).toFixed(2));
    if (pesoRealNum > maxRealWeight + 0.0001) {
      alert(`⚠️ Límite de cortesía superado:\nPara ${gramsNum}g, el extra máximo permitido es de +${extraLimit}g.\nEl peso real no puede superar ${maxRealWeight}g.`);
      return;
    }

    const nowTimeStr = new Date().toTimeString().split(' ')[0];
    const timestamp = new Date(`${dispenseDate}T${nowTimeStr}`).toISOString();
    const workerName = currentWorker?.name || 'Administrador / Trabajador';

    try {
      const { error: dispErr } = await supabase.from('dispensations').insert([{
        product_id: selectedProductToDispense.id,
        product_name: selectedProductToDispense.name,
        member_id: null,
        member_number: 'JORNADA',
        member_name: `Cierre (${dispenseDate}) • Real: ${pesoRealNum.toFixed(2)}g`,
        grams: gramsNum,
        real_weight: pesoRealNum,
        total_price: eurosNum,
        dispensed_by: workerName,
        created_at: timestamp
      }]);

      if (dispErr) throw dispErr;

      const currentStock = Number(selectedProductToDispense.stockGrams) || 0;
      const newStock = Math.max(0, currentStock - pesoRealNum);

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

  const handleOpenEditDispense = (log: DispensationLog) => {
    if (!canModifyDispensation) {
      alert("No dispones de permiso para editar registros de la auditoría.");
      return;
    }
    setEditingDispense(log);
    setEditDispenseGrams(log.grams.toString());
    setEditRealWeight((log.realWeight || log.grams).toString());
    setIsEditDispenseModalOpen(true);
  };

  const handleSaveDispenseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDispense || !canModifyDispensation) return;

    const newGrams = parseDecimalInput(editDispenseGrams);
    const newRealWeight = parseDecimalInput(editRealWeight) || newGrams;
    if (newGrams <= 0) return;

    const editExtraLimit = newGrams < 5 ? 0.09 : 1.0;
    const maxRealWeight = Number((newGrams + editExtraLimit).toFixed(2));
    if (newRealWeight > maxRealWeight + 0.0001) {
      alert(`⚠️ Límite de cortesía superado:\nPara ${newGrams}g, el extra máximo permitido es de +${editExtraLimit}g.\nEl peso real no puede superar ${maxRealWeight}g.`);
      return;
    }

    const oldRealWeight = editingDispense.realWeight || editingDispense.grams;
    const diffGrams = newRealWeight - oldRealWeight;
    const pricePerGram = editingDispense.grams > 0 ? editingDispense.totalPrice / editingDispense.grams : 8;
    const newTotalPrice = newGrams * pricePerGram;

    try {
      const { error: dispErr } = await supabase
        .from('dispensations')
        .update({ 
          grams: newGrams, 
          real_weight: newRealWeight,
          total_price: newTotalPrice 
        })
        .eq('id', editingDispense.id);
      if (dispErr) throw dispErr;

      if (editingDispense.productId) {
        const { data: prodData } = await supabase
          .from('cannabis_products')
          .select('stock_grams')
          .eq('id', editingDispense.productId)
          .single();

        if (prodData) {
          const currentStock = parseFloat(prodData.stock_grams) || 0;
          const newStock = Math.max(0, currentStock - diffGrams);
          await supabase
            .from('cannabis_products')
            .update({ stock_grams: newStock })
            .eq('id', editingDispense.productId);
        }
      }

      setIsEditDispenseModalOpen(false);
      fetchDispensaryData();
    } catch (err: any) {
      alert("Error al editar entrega: " + err.message);
    }
  };

  const handleDeleteDispensation = async (log: DispensationLog) => {
    if (!canModifyDispensation) {
      alert("No dispones de permiso para anular registros de dispensación.");
      return;
    }

    const weightToRestore = log.realWeight || log.grams;
    if (!confirm(`¿Anular el registro de ${log.productName}? Esto restaurará ${weightToRestore}g en el inventario.`)) return;

    try {
      if (log.productId) {
        const { data: prodData } = await supabase
          .from('cannabis_products')
          .select('stock_grams')
          .eq('id', log.productId)
          .single();

        if (prodData) {
          const restoredStock = (parseFloat(prodData.stock_grams) || 0) + weightToRestore;
          await supabase
            .from('cannabis_products')
            .update({ stock_grams: restoredStock })
            .eq('id', log.productId);
        }
      }

      const { error } = await supabase.from('dispensations').delete().eq('id', log.id);
      if (error) throw error;

      fetchDispensaryData();
    } catch (err: any) {
      alert("Error al anular el registro: " + err.message);
    }
  };

  // --- FILTROS DE TIEMPO Y PRODUCTOS ---
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const currentDay = now.getDay();
  const distanceToMonday = (currentDay + 6) % 7;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const periodFilteredDispensations = dispensations.filter(d => {
    const time = new Date(d.createdAt).getTime();
    if (periodFilter === 'day') return time >= startOfDay;
    if (periodFilter === 'week') return time >= startOfWeek;
    if (periodFilter === 'month') return time >= startOfMonth;
    return true;
  });

  const availableProductNames: string[] = Array.from(
    new Set<string>(periodFilteredDispensations.map(d => d.productName))
  ).sort();

  const filteredDispensations = periodFilteredDispensations.filter(d => {
    if (selectedProductFilters.length === 0) return true;
    return selectedProductFilters.includes(d.productName);
  });

  const totalGramsSold = filteredDispensations.reduce((acc, curr) => acc + curr.grams, 0);
  const totalRealWeightDispensed = filteredDispensations.reduce((acc, curr) => acc + (curr.realWeight || curr.grams), 0);
  const totalAmountSold = filteredDispensations.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalOperations = filteredDispensations.length;

  const productBreakdown: Record<string, { grams: number; realWeight: number; total: number; count: number }> = {};
  periodFilteredDispensations.forEach(d => {
    if (!productBreakdown[d.productName]) {
      productBreakdown[d.productName] = { grams: 0, realWeight: 0, total: 0, count: 0 };
    }
    productBreakdown[d.productName].grams += d.grams;
    productBreakdown[d.productName].realWeight += (d.realWeight || d.grams);
    productBreakdown[d.productName].total += d.totalPrice;
    productBreakdown[d.productName].count += 1;
  });

  const sortedProductStats = Object.entries(productBreakdown).sort((a, b) => b[1].grams - a[1].grams);

  const toggleProductFilter = (prodName: string) => {
    setSelectedProductFilters(prev => 
      prev.includes(prodName) 
        ? prev.filter(p => p !== prodName) 
        : [...prev, prodName]
    );
  };

  const clearProductFilters = () => {
    setSelectedProductFilters([]);
  };

  // Totales acumulados para el modal de Dispensación Múltiple
  const batchTotalGrams = batchItems.reduce((acc, item) => acc + parseDecimalInput(item.grams), 0);
  const batchTotalEuros = batchItems.reduce((acc, item) => acc + parseDecimalInput(item.euros), 0);
  const batchTotalPesoReal = batchItems.reduce((acc, item) => acc + (parseDecimalInput(item.pesoReal) || parseDecimalInput(item.grams)), 0);
  const batchTotalCourtesy = batchTotalPesoReal - batchTotalGrams;

  return (
    <div className="space-y-6">
      
      {/* 1. SECCIÓN SUPERIOR: KPIS + WIDGET STICKY NOTES */}
      <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-5 md:p-7 shadow-2xl relative overflow-hidden" title="Panel de Auditoría e Inteligencia del Club">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1a2a1e] pb-5 mb-6">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg" title="Módulo Seguro">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold bg-[#1a2a1e] text-emerald-400 px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-500/20" title="Panel Exclusivo">
                  PANEL DE INTELIGENCIA & AUDITORÍA
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-display font-black text-white mt-0.5 tracking-tight">
                Dashboard de Métricas & Rendimiento
              </h3>
            </div>
          </div>

          <StickyNotesWidget currentUser={currentWorker} />

          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#080d0a] text-emerald-400 border border-[#1a2a1e]" title="Socios activos y validados en el censo actual">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {totalMembers} Socios Auditados
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#080d0a] border border-[#1a2a1e] rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all" title="Total histórico de socios registrados en la asociación">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">TOTAL MIEMBROS</span>
              <Users size={16} className="text-emerald-400" />
            </div>
            <div className="my-3">
              <span className="text-3xl font-display font-black text-white">{totalMembers}</span>
              <span className="text-xs text-gray-500 font-mono ml-1.5">100%</span>
            </div>
            <div className="text-[11px] font-mono flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold" title="Socios aprobados">{approvedMembers} activos</span>
              <span className="text-gray-600">•</span>
              <span className="text-amber-400 font-bold" title="Socios en revisión">{pendingMembers} pendientes</span>
            </div>
          </div>

          <div className="bg-[#080d0a] border border-[#1a2a1e] rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all" title="Porcentaje de solicitudes de alta aprobadas respecto al total">
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

          <div className="bg-[#080d0a] border border-[#1a2a1e] rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all" title="Nacionalidad predominante dentro de la comunidad de socios">
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

          <div className="bg-[#080d0a] border border-[#1a2a1e] rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all" title="Altas de socios completadas en el transcurso del mes actual">
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

      {/* 2. CATÁLOGO DE VARIEDADES & DISPENSACIÓN DIARIA (CON MULTI-SELECCIÓN) */}
      <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-5 md:p-7 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a2a1e] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-display font-black text-white uppercase flex items-center gap-2">
                <ShoppingBag size={20} className="text-emerald-400" />
                Variedades Disponibles & Control Diario
              </h3>
              {selectedBatchProductIds.length > 0 && (
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full animate-pulse">
                  {selectedBatchProductIds.length} seleccionadas
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Selecciona una o varias variedades para dispensar conjuntamente con pesajes independientes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botón para seleccionar / deseleccionar todas */}
            {canDispense && products.length > 0 && (
              <button
                type="button"
                onClick={selectAllBatchProducts}
                className="h-10 px-3 bg-[#080d0a] hover:bg-[#1a2a1e] border border-[#1a2a1e] text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                title={selectedBatchProductIds.length === products.length ? "Deseleccionar todas" : "Seleccionar todas las variedades del catálogo"}
              >
                {selectedBatchProductIds.length === products.length ? <CheckSquare size={14} className="text-emerald-400" /> : <Square size={14} />}
                <span className="hidden sm:inline">{selectedBatchProductIds.length === products.length ? 'Deseleccionar' : 'Seleccionar Todas'}</span>
              </button>
            )}

            {/* BOTÓN PROMINENTE DISPENSAR SELECCIONADAS */}
            {canDispense && selectedBatchProductIds.length > 0 && (
              <button
                type="button"
                onClick={handleOpenBatchModal}
                className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-xl shadow-emerald-950/60 transition-all animate-bounce"
                title="Abrir ventana para dispensar las variedades seleccionadas a la vez"
              >
                <Layers size={16} />
                <span>Dispensar Selección ({selectedBatchProductIds.length})</span>
              </button>
            )}

            <button
              onClick={fetchDispensaryData}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-[#080d0a] border border-[#1a2a1e] text-gray-400 hover:text-white transition-all"
              title="Recargar catálogo e inventario"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {canManageCatalog && (
              <button
                onClick={handleOpenCreateProduct}
                className="h-10 px-4 bg-[#101b13] hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-xl text-xs font-bold uppercase flex items-center gap-2 shadow-lg transition-all"
                title="Añadir una nueva variedad al dispensario"
              >
                <Plus size={16} /> Añadir Variedad
              </button>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center bg-[#080d0a] rounded-2xl border border-dashed border-[#1a2a1e] text-gray-500 text-xs">
            No hay variedades registradas en el catálogo. Haz clic en "Añadir Variedad" para comenzar.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map(prod => {
              const isSelectedForBatch = selectedBatchProductIds.includes(prod.id);

              return (
                <div 
                  key={prod.id}
                  className={`border rounded-2xl p-4.5 flex flex-col justify-between transition-all space-y-3 relative ${
                    isSelectedForBatch 
                      ? 'bg-[#0f1d14] border-emerald-500 shadow-lg ring-1 ring-emerald-500/50' 
                      : 'bg-[#080d0a] border-[#1a2a1e] hover:border-emerald-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Selector de selección múltiple */}
                        {canDispense && (
                          <button
                            type="button"
                            onClick={() => toggleSelectBatchProduct(prod.id)}
                            className="p-1 text-gray-400 hover:text-emerald-400 transition-colors"
                            title={isSelectedForBatch ? "Quitar de la selección múltiple" : "Añadir a la dispensación múltiple"}
                          >
                            {isSelectedForBatch ? <CheckSquare size={16} className="text-emerald-400" /> : <Square size={16} className="text-gray-600" />}
                          </button>
                        )}

                        <span 
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                            prod.category === 'SATIVA' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                            prod.category === 'INDICA' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                            prod.category === 'EXTRACCIÓN' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          }`}
                          title={`Tipo de genética: ${prod.category}`}
                        >
                          {prod.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {canManageCatalog && (
                          <button 
                            onClick={() => handleOpenEditProduct(prod)}
                            className="p-1 text-gray-400 hover:text-emerald-400 transition-colors"
                            title="Editar precio, stock o información de la variedad"
                          >
                            <Edit3 size={13} />
                          </button>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-1 text-gray-400 hover:text-rose-400 transition-colors"
                            title="Eliminar variedad permanentemente del catálogo"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-2.5 truncate" title={prod.name}>{prod.name}</h4>
                    <p className="text-[10px] font-mono text-gray-400 mt-0.5" title="Concentración estimada">{prod.thcCbd || 'THC: Estándar'}</p>
                  </div>

                  <div className="pt-3 border-t border-[#1a2a1e] space-y-2.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-[10px] font-mono text-gray-500 uppercase">Aporte / Gramo:</span>
                      <span className="font-mono font-black text-emerald-400 text-sm" title="Aporte fijado por gramo">{prod.pricePerGram.toFixed(2)} €</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-gray-500">Stock:</span>
                      <span className={`font-bold ${prod.stockGrams < 20 ? 'text-rose-400 animate-pulse' : 'text-gray-300'}`} title="Stock restante en almacén">
                        {prod.stockGrams.toFixed(2)} g
                      </span>
                    </div>

                    {canDispense && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => handleOpenDispense(prod)}
                          className="flex-1 h-8 bg-emerald-600/15 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                          title="Dispensar solo esta variedad"
                        >
                          <Scale size={13} /> Dispensar
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleSelectBatchProduct(prod.id)}
                          className={`h-8 px-2.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                            isSelectedForBatch 
                              ? 'bg-emerald-600 border-emerald-500 text-white' 
                              : 'bg-[#080d0a] border-[#1a2a1e] text-gray-400 hover:text-white'
                          }`}
                          title={isSelectedForBatch ? "Desmarcar para lote" : "Marcar para dispensación múltiple"}
                        >
                          {isSelectedForBatch ? '✓ En lote' : '+ Lote'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. AUDITORÍA & RESUMEN DE DISPENSACIÓN */}
      <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-5 md:p-7 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a2a1e] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-display font-black text-white uppercase flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-400" />
                Auditoría & Resumen de Dispensación
              </h3>
              {!canModifyDispensation && (
                <span className="text-[9px] font-mono font-bold bg-[#080d0a] text-gray-400 px-2 py-0.5 rounded border border-[#1a2a1e] flex items-center gap-1" title="Modo consulta habilitado: Puedes revisar todos los datos sin modificar">
                  <Lock size={10} className="text-amber-400" /> Solo Lectura
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Control transparente de cantidades cobradas, peso real entregado y aportaciones totales
            </p>
          </div>

          <div className="flex p-1 bg-[#080d0a] rounded-xl border border-[#1a2a1e] self-start sm:self-center">
            <button
              onClick={() => setPeriodFilter('day')}
              className={`px-3 sm:px-4 h-8 text-xs font-semibold rounded-lg transition-all ${
                periodFilter === 'day' ? 'bg-[#0e1711] text-emerald-400 font-bold border border-emerald-500/30 shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Filtrar operaciones del día de hoy"
            >
              Hoy (Día)
            </button>
            <button
              onClick={() => setPeriodFilter('week')}
              className={`px-3 sm:px-4 h-8 text-xs font-semibold rounded-lg transition-all ${
                periodFilter === 'week' ? 'bg-[#0e1711] text-emerald-400 font-bold border border-emerald-500/30 shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Filtrar operaciones de la semana en curso"
            >
              Esta Semana
            </button>
            <button
              onClick={() => setPeriodFilter('month')}
              className={`px-3 sm:px-4 h-8 text-xs font-semibold rounded-lg transition-all ${
                periodFilter === 'month' ? 'bg-[#0e1711] text-emerald-400 font-bold border border-emerald-500/30 shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Filtrar operaciones del mes actual"
            >
              Este Mes
            </button>
          </div>
        </div>

        {/* BARRA DE FILTRO POR VARIEDAD / PRODUCTO */}
        <div className="bg-[#080d0a] border border-[#1a2a1e] rounded-2xl p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-emerald-400" />
              <span className="text-[11px] font-mono font-bold text-gray-300 uppercase tracking-wider">
                Filtro por Variedad:
              </span>
              {selectedProductFilters.length > 0 ? (
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                  {selectedProductFilters.length} {selectedProductFilters.length === 1 ? 'seleccionada' : 'seleccionadas'}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-gray-500">
                  Mostrando todas las variedades
                </span>
              )}
            </div>

            {selectedProductFilters.length > 0 && (
              <button
                type="button"
                onClick={clearProductFilters}
                className="h-6 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1"
                title="Quitar filtro de variedades y ver todo"
              >
                <X size={11} /> Limpiar Filtro
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={clearProductFilters}
              className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border transition-all ${
                selectedProductFilters.length === 0
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-[#0e1711] border-[#1a2a1e] text-gray-400 hover:text-white hover:border-gray-700'
              }`}
              title="Mostrar todas las variedades sin filtrar"
            >
              [TODAS]
            </button>

            {availableProductNames.map((prodName: string) => {
              const isSelected = selectedProductFilters.includes(prodName);
              return (
                <button
                  key={prodName}
                  type="button"
                  onClick={() => toggleProductFilter(prodName)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm ring-1 ring-emerald-500/40'
                      : 'bg-[#0e1711] border-[#1a2a1e] text-gray-400 hover:text-gray-200 hover:border-emerald-500/40'
                  }`}
                  title={`Clic para ${isSelected ? 'deseleccionar' : 'seleccionar'} ${prodName}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
                  <span>{prodName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumen del Periodo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-[#080d0a] border border-[#1a2a1e] rounded-2xl flex items-center justify-between" title="Cantidad teórica de gramos facturada en función de las aportaciones (filtrada)">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">TOTAL DISPENSADO</span>
              <p className="text-2xl font-black text-white mt-1">{totalGramsSold.toFixed(2)} <span className="text-sm font-normal text-gray-400">g</span></p>
            </div>
            <Scale size={24} className="text-emerald-400" />
          </div>

          <div className="p-4 bg-[#080d0a] border border-amber-500/30 rounded-2xl flex items-center justify-between" title="Peso físico real total que salió de la báscula y se descontó del inventario (filtrado)">
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">TOTAL PESO REAL</span>
              <p className="text-2xl font-black text-amber-300 mt-1">{totalRealWeightDispensed.toFixed(2)} <span className="text-sm font-normal text-amber-500/70">g</span></p>
            </div>
            <Scale size={24} className="text-amber-400" />
          </div>

          <div className="p-4 bg-[#080d0a] border border-[#1a2a1e] rounded-2xl flex items-center justify-between" title="Aportaciones económicas totales acumuladas en este periodo (filtrada)">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">APORTACIONES TOTALES</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{totalAmountSold.toFixed(2)} <span className="text-sm font-normal text-emerald-500/70">€</span></p>
            </div>
            <Coins size={24} className="text-emerald-400" />
          </div>

          <div className="p-4 bg-[#080d0a] border border-[#1a2a1e] rounded-2xl flex items-center justify-between" title="Cantidad de cierres de jornada o dispensaciones registradas (filtrada)">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase font-bold">CIERRES REGISTRADOS</span>
              <p className="text-2xl font-black text-white mt-1">{totalOperations}</p>
            </div>
            <Clock size={24} className="text-emerald-400" />
          </div>
        </div>

        {/* Desglose por Variedad en el Periodo */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono" title="Haz clic en cualquier variedad para seleccionarla o deseleccionarla">
              Ranking de Variedades ({periodFilter === 'day' ? 'Hoy' : periodFilter === 'week' ? 'Semana' : 'Mes'})
            </h4>
            <span className="text-[10px] font-mono text-gray-500 hidden sm:inline-block">
              * Haz clic en una variedad para seleccionarla o filtrar
            </span>
          </div>

          {sortedProductStats.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No hay dispensaciones en este periodo temporal.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {sortedProductStats.map(([prodName, stats]) => {
                const isSelected = selectedProductFilters.includes(prodName);
                const hasFiltersActive = selectedProductFilters.length > 0;

                return (
                  <div 
                    key={prodName} 
                    onClick={() => toggleProductFilter(prodName)}
                    className={`p-3 rounded-xl text-xs space-y-1.5 cursor-pointer transition-all border select-none ${
                      isSelected
                        ? 'bg-[#101b13] border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                        : hasFiltersActive
                          ? 'bg-[#080d0a]/50 border-[#1a2a1e] opacity-45 hover:opacity-100 hover:border-gray-700'
                          : 'bg-[#080d0a] border-[#1a2a1e] hover:border-emerald-500/40'
                    }`}
                    title={`Haz clic para ${isSelected ? 'deseleccionar' : 'filtrar por'} ${prodName}`}
                  >
                    <div className="flex justify-between items-center gap-1">
                      <span className={`font-bold truncate ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                        {prodName}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isSelected && <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-1 rounded">✓</span>}
                        <span className="text-[10px] font-mono text-emerald-400 font-bold" title="Gramos cobrados">{stats.grams.toFixed(2)} g</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                      <span className="text-amber-400" title="Peso físico real entregado">Real: {stats.realWeight.toFixed(2)} g</span>
                      <span title="Aporte económico total">{stats.total.toFixed(2)} €</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bitácora de Cierres de Jornada */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
              Bitácora de Cierres de Jornada
            </h4>
            {selectedProductFilters.length > 0 && (
              <span className="text-[10px] font-mono text-emerald-400">
                Filtrando {filteredDispensations.length} {filteredDispensations.length === 1 ? 'registro' : 'registros'}
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-[#1a2a1e] rounded-2xl bg-[#080d0a]">
            {filteredDispensations.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">Sin registros en el periodo o filtro seleccionado.</p>
            ) : (
              <table className="w-full text-left border-collapse text-xs min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#1a2a1e] font-mono text-[10px] text-gray-500 uppercase font-bold bg-[#0e1711]/50">
                    <th className="py-3 px-4" title="Fecha en la que tuvo lugar la dispensación">Fecha de Jornada</th>
                    <th className="py-3 px-4" title="Nombre de la variedad dispensada">Variedad Dispensada</th>
                    <th className="py-3 px-4 text-center" title="Gramos cobrados en aportación">Gramos Cobrados</th>
                    <th className="py-3 px-4 text-center text-amber-400" title="Peso físico real de báscula descontado del almacén">Peso Real</th>
                    <th className="py-3 px-4 text-right" title="Aportación económica recaudada">Aporte (€)</th>
                    <th className="py-3 px-4 text-right" title="Agente que registró la dispensación">Registrado por</th>
                    {canModifyDispensation && <th className="py-3 px-4 text-right" title="Opciones de corrección">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2a1e]">
                  {filteredDispensations.map(disp => (
                    <tr key={disp.id} className="hover:bg-[#0e1711]/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-300 font-bold" title={new Date(disp.createdAt).toLocaleString()}>
                        {new Date(disp.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400" title={disp.productName}>
                        {disp.productName}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white" title="Gramos teóricos cobrados">
                        {disp.grams.toFixed(2)} g
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-300" title="Peso físico real entregado y restado del stock">
                        {(disp.realWeight || disp.grams).toFixed(2)} g
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400" title="Aporte económico total">
                        {disp.totalPrice.toFixed(2)} €
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[10px] text-gray-400" title="Usuario responsable">
                        {disp.dispensedBy}
                      </td>
                      {canModifyDispensation && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditDispense(disp)}
                              className="p-1.5 bg-[#0e1711] hover:bg-[#1a2a1e] border border-[#1a2a1e] rounded-lg text-gray-400 hover:text-emerald-400 transition-colors"
                              title="Editar gramos cobrados o peso real"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteDispensation(disp)}
                              className="p-1.5 bg-[#0e1711] hover:bg-rose-500/10 border border-[#1a2a1e] hover:border-rose-500/30 rounded-lg text-gray-400 hover:text-rose-400 transition-colors"
                              title="Anular registro y restaurar stock en inventario"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MODAL DISPENSACIÓN MÚLTIPLE EN LOTE (BATCH DISPENSE) */}
      {/* ======================================================== */}
      {isBatchDispenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-5 sm:p-7 max-w-3xl w-full relative space-y-4 shadow-2xl max-h-[92vh] flex flex-col">
            <button 
              type="button"
              onClick={() => setIsBatchDispenseModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              title="Cerrar ventana"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1a2a1e] pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                  <Layers size={22} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                    Dispensación Conjunta ({batchItems.length} Variedades)
                  </h3>
                  <span className="text-[10px] font-mono text-gray-400">
                    Ajusta gramos, euros y peso real en báscula por cada producto
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBatchDispenseDate(new Date().toISOString().split('T')[0])}
                  className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition-all"
                  title="Establecer fecha de hoy"
                >
                  <Calendar size={11} /> Hoy
                </button>
                <input
                  type="date"
                  required
                  value={batchDispenseDate}
                  onChange={e => setBatchDispenseDate(e.target.value)}
                  className="h-8 px-2 bg-[#080d0a] border border-[#1a2a1e] rounded-lg text-white font-mono text-xs font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Listado dinámico de variedades seleccionadas */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh]">
              {batchItems.map((item, index) => {
                const gNum = parseDecimalInput(item.grams);
                const prNum = parseDecimalInput(item.pesoReal);
                const maxExtra = gNum < 5 ? 0.09 : 1.0;
                const maxAllowedPr = Number((gNum + maxExtra).toFixed(2));
                const extra = Number((prNum - gNum).toFixed(2));
                const isItemExceeded = extra > maxExtra + 0.0001;

                return (
                  <div 
                    key={item.product.id}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                      isItemExceeded 
                        ? 'bg-rose-950/20 border-rose-500/50' 
                        : 'bg-[#080d0a] border-[#1a2a1e]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[#1a2a1e]/60 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-white truncate">
                          {item.product.name}
                        </span>
                        <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
                          {item.product.category}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 shrink-0">
                          {item.product.pricePerGram.toFixed(2)} €/g
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-gray-500">
                          Stock: {item.product.stockGrams.toFixed(2)}g
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBatchItem(index)}
                          className="p-1 text-gray-500 hover:text-rose-400 rounded transition-colors"
                          title="Quitar esta variedad de la lista"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* Gramos Cobrados */}
                      <div>
                        <label className="block text-[9px] font-mono text-gray-400 uppercase font-bold mb-1">
                          Gramos Cobrados *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          value={item.grams}
                          onChange={e => handleBatchItemGramsChange(index, e.target.value)}
                          placeholder="0.00"
                          className="w-full h-9 px-2.5 bg-[#0e1711] border border-[#1a2a1e] rounded-xl text-white font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                          title="Gramos facturados"
                        />
                      </div>

                      {/* Euros Producidos */}
                      <div>
                        <label className="block text-[9px] font-mono text-gray-400 uppercase font-bold mb-1">
                          Euros Producidos (€) *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            required
                            value={item.euros}
                            onChange={e => handleBatchItemEurosChange(index, e.target.value)}
                            placeholder="0.00"
                            className="w-full h-9 px-2.5 pr-6 bg-[#0e1711] border border-[#1a2a1e] rounded-xl text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                            title="Aporte en euros"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-[10px] text-emerald-500">
                            €
                          </span>
                        </div>
                      </div>

                      {/* Peso Real Báscula */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[9px] font-mono text-amber-400 uppercase font-bold">
                            Peso Real Báscula *
                          </label>
                          <span className="text-[8px] font-mono text-gray-500">
                            Máx: {maxAllowedPr.toFixed(2)}g
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            required
                            value={item.pesoReal}
                            onChange={e => handleBatchItemRealWeightChange(index, e.target.value)}
                            placeholder="0.00"
                            className={`w-full h-9 px-2.5 pr-6 bg-[#0e1711] border rounded-xl font-mono font-bold text-xs focus:outline-none ${
                              isItemExceeded 
                                ? 'border-rose-500 text-rose-400 ring-1 ring-rose-500/50' 
                                : 'border-amber-500/30 text-amber-300 focus:border-amber-400'
                            }`}
                            title="Gramos físicos reales que salieron del stock"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-[10px] text-amber-500">
                            g
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Feedback de cortesía por fila */}
                    {isItemExceeded ? (
                      <p className="text-[9px] font-mono text-rose-400 flex items-center gap-1">
                        <AlertTriangle size={11} className="shrink-0" />
                        Límite superado: Máximo +{maxExtra.toFixed(2)}g de cortesía (tope: {maxAllowedPr.toFixed(2)}g).
                      </p>
                    ) : extra > 0 ? (
                      <p className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                        <Check size={11} /> Cortesía aplicada: +{extra.toFixed(2)}g (Permitido hasta +{maxExtra.toFixed(2)}g).
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Cuadro Resumen Acumulado del Lote */}
            <div className="p-3.5 bg-[#080d0a] rounded-2xl border border-[#1a2a1e] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-[9px] text-gray-500 uppercase font-bold block">Gramos Cobrados:</span>
                <span className="text-base font-black text-white">{batchTotalGrams.toFixed(2)} g</span>
              </div>
              <div>
                <span className="text-[9px] text-amber-400 uppercase font-bold block">Peso Real Báscula:</span>
                <span className="text-base font-black text-amber-300">{batchTotalPesoReal.toFixed(2)} g</span>
              </div>
              <div>
                <span className="text-[9px] text-emerald-400 uppercase font-bold block">Aporte Total (€):</span>
                <span className="text-base font-black text-emerald-400">{batchTotalEuros.toFixed(2)} €</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Cortesía Total:</span>
                <span className={`text-base font-black ${batchTotalCourtesy > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  +{Math.max(0, batchTotalCourtesy).toFixed(2)} g
                </span>
              </div>
            </div>

            {hasBatchErrors && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>Revisa las variedades marcadas en rojo: superan el límite de cortesía (+0.09g para menos de 5g | +1.0g para 5g o más).</span>
              </div>
            )}

            {/* Botones de acción */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#1a2a1e]">
              <button
                type="button"
                onClick={() => setIsBatchDispenseModalOpen(false)}
                className="h-10 px-4 bg-[#080d0a] hover:bg-[#1a2a1e] border border-[#1a2a1e] text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-all"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={hasBatchErrors || batchItems.length === 0 || isSubmittingBatch}
                onClick={handleConfirmBatchDispense}
                className={`h-10 px-6 rounded-xl text-xs font-bold uppercase shadow-lg flex items-center gap-2 transition-all ${
                  hasBatchErrors || batchItems.length === 0 || isSubmittingBatch
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-[#1a2a1e]'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-98'
                }`}
                title={hasBatchErrors ? "Corrige los pesos que exceden el límite" : "Confirmar y dispensar todas las variedades"}
              >
                {isSubmittingBatch ? <RefreshCw size={14} className="animate-spin" /> : <Check size={16} />}
                <span>{isSubmittingBatch ? 'Procesando Lote...' : `Confirmar Dispensación Múltiple (${batchItems.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL CREAR / EDITAR VARIEDAD */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-6 max-w-md w-full relative space-y-4 shadow-2xl">
            <button 
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              title="Cerrar modal"
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
                  title="Nombre comercial de la variedad"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Tipo / Categoría</label>
                  <select
                    value={formCategory}
                    onChange={(e: any) => setFormCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
                    title="Genética o tipo de producto"
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
                    type="text"
                    inputMode="decimal"
                    required
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    placeholder="8.00"
                    className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    title="Aporte fijado por cada gramo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Stock Inicial (Gramos) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    placeholder="100.0"
                    className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    title="Cantidad física disponible en stock"
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
                    title="Etiqueta informativa de cannabinoides"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 mt-4"
                title="Guardar variedad en el catálogo"
              >
                <Check size={16} />
                <span>{editingProduct ? 'Actualizar Variedad' : 'Guardar Variedad'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL DISPENSAR JORNADA INDIVIDUAL */}
      {isDispenseModalOpen && selectedProductToDispense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-6 sm:p-7 max-w-md w-full relative space-y-4 shadow-2xl overflow-hidden">
            <button 
              type="button"
              onClick={() => setIsDispenseModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              title="Cerrar modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 border-b border-[#1a2a1e] pb-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                <Scale size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  Cierre: {selectedProductToDispense.name}
                </h3>
                <span className="text-[10px] font-mono text-gray-400">
                  {selectedProductToDispense.pricePerGram.toFixed(2)} € / gramo
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmDispense} className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono text-gray-400 uppercase font-bold">
                    Fecha de la Jornada *
                  </label>
                  <button
                    type="button"
                    onClick={() => setDispenseDate(new Date().toISOString().split('T')[0])}
                    className="text-[10px] font-mono font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 flex items-center gap-1 transition-all"
                    title="Establecer fecha de hoy"
                  >
                    <Calendar size={11} /> Hoy
                  </button>
                </div>
                <input
                  type="date"
                  required
                  value={dispenseDate}
                  onChange={e => setDispenseDate(e.target.value)}
                  className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-mono text-xs font-bold focus:outline-none focus:border-emerald-500"
                  title="Fecha del cierre de jornada"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">
                  Gramos Dispensados en el Día *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={dispenseGrams}
                    onChange={e => handleGramsChange(e.target.value)}
                    className="flex-1 min-w-0 h-10 px-3.5 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                    title="Gramos teóricos cobrados"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    {['5.0', '10.0', '20.0'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleGramsChange(g)}
                        className="px-2.5 h-10 bg-[#080d0a] border border-[#1a2a1e] hover:border-emerald-500/50 hover:text-emerald-400 text-gray-300 font-mono text-xs font-bold rounded-xl transition-all"
                        title={`Seleccionar ${g} gramos`}
                      >
                        {g}g
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono text-gray-400 uppercase font-bold flex items-center gap-1">
                    <Coins size={11} className="text-emerald-400" />
                    Euros Producidos (€) *
                  </label>
                  <span className="text-[9px] font-mono text-gray-500 flex items-center gap-0.5" title="Se calcula al escribir gramos o euros">
                    <ArrowRightLeft size={9} /> Auto-calculado
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={dispenseEuros}
                    onChange={e => handleEurosChange(e.target.value)}
                    className="w-full h-10 px-3.5 pr-8 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                    title="Aporte económico total producido"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-emerald-500">
                    €
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1">
                    <Scale size={11} className="text-amber-400" />
                    Peso Real (Báscula / Entrega Física) *
                  </label>
                  <span className="text-[9px] font-mono text-gray-400" title="Gramos físicos que salen del tarro">
                    Máx: {maxAllowedRealWeight.toFixed(2)} g (+{maxAllowedExtra.toFixed(2)}g)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={pesoReal}
                    onChange={e => setPesoReal(e.target.value)}
                    className={`w-full h-10 px-3.5 pr-8 bg-[#080d0a] border rounded-xl font-mono font-bold text-sm focus:outline-none transition-colors ${
                      isExtraExceeded 
                        ? 'border-rose-500 text-rose-400' 
                        : 'border-amber-500/30 focus:border-amber-400 text-amber-300'
                    }`}
                    title="Gramos físicos reales que se restan del stock del club"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-amber-500">
                    g
                  </span>
                </div>

                {isExtraExceeded ? (
                  <div className="mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-1.5 text-rose-400 text-[10px] font-mono">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <span>
                      Límite superado: Para {currentGramsNum}g, el extra máximo permitido es de +{maxAllowedExtra.toFixed(2)}g (Peso real máx: {maxAllowedRealWeight.toFixed(2)}g).
                    </span>
                  </div>
                ) : currentExtra > 0 ? (
                  <p className="text-[9px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                    <Check size={11} /> Cortesía aplicada: +{currentExtra.toFixed(2)}g (Permitido hasta +{maxAllowedExtra.toFixed(2)}g).
                  </p>
                ) : (
                  <p className="text-[9px] font-mono text-gray-500 mt-1">
                    * Límite de cortesía: +0.09g para menos de 5g | +1.00g para 5g o más.
                  </p>
                )}
              </div>

              <div className="p-3 bg-[#080d0a] rounded-xl border border-[#1a2a1e] space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Aporte Económico:</span>
                  <span className="text-base font-black text-emerald-400" title="Total que entra a caja">
                    {(parseDecimalInput(dispenseEuros) || 0).toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#1a2a1e]">
                  <span className="text-gray-500">Descuento de Stock (Peso Real):</span>
                  <span className={`font-bold ${isExtraExceeded ? 'text-rose-500' : 'text-rose-400'}`} title="Disminución de stock real">
                    -{(parseDecimalInput(pesoReal) || parseDecimalInput(dispenseGrams) || 0).toFixed(2)} g
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                  <span>Stock restante proyectado:</span>
                  <span className="text-gray-300 font-bold">
                    {Math.max(0, selectedProductToDispense.stockGrams - (parseDecimalInput(pesoReal) || parseDecimalInput(dispenseGrams) || 0)).toFixed(2)} g
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isExtraExceeded}
                className={`w-full h-11 font-bold uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 ${
                  isExtraExceeded 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-[#1a2a1e]' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={isExtraExceeded ? "Ajusta el peso real dentro del margen permitido" : "Confirmar el cierre y descontar inventario"}
              >
                <Check size={16} />
                <span>Confirmar Cierre de Jornada</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL EDITAR DISPENSACIÓN */}
      {isEditDispenseModalOpen && editingDispense && canModifyDispensation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0e1711] border border-[#1a2a1e] rounded-3xl p-6 max-w-md w-full relative space-y-4 shadow-2xl">
            <button 
              onClick={() => setIsEditDispenseModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              title="Cerrar modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 border-b border-[#1a2a1e] pb-3">
              <Edit3 className="text-emerald-400" size={20} />
              <div>
                <h3 className="text-sm font-bold text-white uppercase">Modificar Registro</h3>
                <span className="text-[10px] font-mono text-gray-400">{editingDispense.productName}</span>
              </div>
            </div>

            <form onSubmit={handleSaveDispenseEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1">Gramos Cobrados *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={editDispenseGrams}
                  onChange={e => setEditDispenseGrams(e.target.value)}
                  className="w-full h-10 px-3 bg-[#080d0a] border border-[#1a2a1e] rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                  title="Gramos cobrados en la aportación"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-amber-400 uppercase font-bold mb-1">Peso Real de Báscula (Descontado de Stock) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={editRealWeight}
                  onChange={e => setEditRealWeight(e.target.value)}
                  className="w-full h-10 px-3 bg-[#080d0a] border border-amber-500/30 rounded-xl text-amber-300 font-mono font-bold text-sm focus:outline-none"
                  title="Gramos físicos reales que salieron del stock"
                />
              </div>

              <div className="p-3 bg-[#080d0a] rounded-xl border border-[#1a2a1e] flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold uppercase font-mono">Nuevo Aporte Estimado:</span>
                <span className="text-lg font-black font-mono text-emerald-400">
                  {(parseDecimalInput(editDispenseGrams) * (editingDispense.grams > 0 ? (editingDispense.totalPrice / editingDispense.grams) : 8)).toFixed(2)} €
                </span>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded-xl shadow-lg flex items-center justify-center gap-2"
                title="Guardar corrección"
              >
                <Check size={16} />
                <span>Guardar Cambios</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}