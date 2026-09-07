import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DniPhotoCapture from './DniPhotoCapture';
import { 
  Users, UserPlus, Bell, User, Search, CheckCircle2, Clock, 
  RefreshCw, LogOut, FileText, Trash2, Home, Download, CheckSquare, Square,
  Lock, ChevronRight, ChevronDown, ChevronUp, ExternalLink, Volume2, VolumeX, 
  Eye, EyeOff, Sliders, ArrowRight, AlertTriangle, Menu
} from 'lucide-react';
import { AssociationMember, WorkerUser, RealTimeNotification, DocumentType } from '../types';
import ConfirmModal from './ConfirmModal';
import DuplicateWarningModal from './DuplicateWarningModal';
import WorkerAlertPreferencesPanel, { WorkerPreferences, defaultWorkerPrefs } from './WorkerAlertPreferencesPanel';
import { generateSvadhisthanaAltaPdf, exportBulkMembersPdf } from '../utils/pdfGenerator';

export interface WorkerPortalProps {
  activeWorker: WorkerUser;
  members: AssociationMember[];
  onSelectMember: (member: AssociationMember) => void;
  onMemberRegistered: (newMember: AssociationMember) => void;
  onLogout: () => void;
  notifications: RealTimeNotification[];
  realtimeConnected: boolean;
  onUpdateMember?: (updated: AssociationMember) => void;
  onDeleteMember?: (id: string) => void;
  appName?: string;
  appLogo?: string | null;
}

export type PortalTab = 'home' | 'socios' | 'registro' | 'notificaciones' | 'perfil';

export default function WorkerPortal({
  activeWorker,
  members,
  onSelectMember,
  onMemberRegistered,
  onLogout,
  notifications,
  realtimeConnected,
  onDeleteMember,
  appName = 'SVADHISTHANA',
  appLogo = null
}: WorkerPortalProps) {
  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

  // Verificación estricta de permisos asignados al trabajador
  const hasPermission = (permKey: string) => {
    if (activeWorker.role === 'admin') return true;
    return activeWorker.permissions?.includes(permKey) ?? false;
  };

  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  const handleDeleteFromList = (e: React.MouseEvent, memberId: string, memberName: string) => {
    e.stopPropagation();
    if (!hasPermission('delete_records')) {
      alert('No tienes permiso para eliminar registros.');
      return;
    }
    setMemberToDelete({ id: memberId, name: memberName });
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete || !hasPermission('delete_records')) return;
    setIsDeletingMember(true);
    try {
      if (onDeleteMember) {
        await onDeleteMember(memberToDelete.id);
      } else {
        await supabase.from('members').delete().eq('id', memberToDelete.id);
      }
      setMemberToDelete(null);
    } catch (err) {
      console.error("Error al eliminar socio:", err);
    } finally {
      setIsDeletingMember(false);
    }
  };

  // Buscador y Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'approved' | 'pending' | 'rejected'>('TODOS');
  const [docFilter, setDocFilter] = useState<'TODOS' | 'DNI' | 'PASSPORT'>('TODOS');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Formulario de Alta
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regDniPassport, setRegDniPassport] = useState('');
  const [regDocType, setRegDocType] = useState<DocumentType>('DNI');
  const [regNationality, setRegNationality] = useState('ESPAÑOLA');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regExpiryDate, setRegExpiryDate] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [lastRegisteredMember, setLastRegisteredMember] = useState<AssociationMember | null>(null);

  // Fotografías DNI
  const [dniFront, setDniFront] = useState<string | null>(null);
  const [dniBack, setDniBack] = useState<string | null>(null);

  // Duplicados
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isOpen: boolean;
    documentNumber: string;
    documentType: string;
    existingMember: AssociationMember | null;
  }>({
    isOpen: false,
    documentNumber: '',
    documentType: '',
    existingMember: null
  });

  const workerPrefsKey = `worker_prefs_${activeWorker.id}`;
  const loadPrefs = (): WorkerPreferences => {
    try {
      const saved = localStorage.getItem(workerPrefsKey);
      if (saved) return { ...defaultWorkerPrefs, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return defaultWorkerPrefs;
  };

  const [prefs, setPrefs] = useState<WorkerPreferences>(loadPrefs);

  useEffect(() => {
    try {
      localStorage.setItem(workerPrefsKey, JSON.stringify(prefs));
    } catch (e) {
      console.error(e);
    }
  }, [prefs, workerPrefsKey]);

  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('laguna_worker_privacy_mode') !== 'false';
  });
  const [revealedDniIds, setRevealedDniIds] = useState<Record<string, boolean>>({});
  const [showPrefsInSocios, setShowPrefsInSocios] = useState<boolean>(false);

  const formatMaskedDni = (dni: string, isRevealed: boolean) => {
    if (isRevealed || !privacyMode) return dni;
    if (!dni) return '••••••';
    const clean = dni.trim();
    if (clean.length <= 4) return '••••••••';
    return `${clean.slice(0, 2)}••••${clean.slice(-2)}`;
  };

  const playBeep = (freq: number = 880, type: OscillatorType = 'sine', duration: number = 0.12) => {
    if (!prefs.masterSound) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // ignore
    }
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('register_users')) {
      setSubmitError('No tienes permiso para registrar socios.');
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);

    const docNum = regDniPassport.trim().toUpperCase();
    if (!docNum || !regFirstName.trim() || !regLastName.trim()) {
      setSubmitError('Por favor, completa los campos obligatorios (*).');
      return;
    }

    const duplicate = members.find(m => m.dniPassport.toUpperCase() === docNum);
    if (duplicate) {
      setDuplicateWarning({
        isOpen: true,
        documentNumber: docNum,
        documentType: regDocType,
        existingMember: duplicate
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeWorker.id);
      const validWorkerId = isUuid ? activeWorker.id : null;

      const { data, error } = await supabase
        .from('members')
        .insert([{
          first_name: regFirstName.trim().toUpperCase(),
          last_name: regLastName.trim().toUpperCase(),
          dni_passport: docNum,
          document_type: regDocType,
          nationality: regNationality.trim().toUpperCase(),
          birth_date: regBirthDate || null,
          expiry_date: regExpiryDate || null,
          email: regEmail.trim() || null,
          phone: regPhone.trim() || null,
          address: regAddress.trim() || null,
          registration_status: 'approved',
          registered_by: validWorkerId,
          dni_front_image: dniFront,
          dni_back_image: dniBack
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);

      const newMember: AssociationMember = {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        dniPassport: data.dni_passport,
        documentType: data.document_type,
        nationality: data.nationality,
        birthDate: data.birth_date,
        expiryDate: data.expiry_date,
        email: data.email,
        phone: data.phone,
        address: data.address,
        registrationStatus: data.registration_status,
        registerDate: data.created_at,
        registeredBy: { id: activeWorker.id, name: activeWorker.name }
      };

      onMemberRegistered(newMember);
      setLastRegisteredMember(newMember);
      setSubmitSuccess(`🎉 Socio ${data.first_name} ${data.last_name} guardado con éxito.`);
      playBeep(1040, 'triangle', 0.18);

      setRegFirstName('');
      setRegLastName('');
      setRegDniPassport('');
      setRegBirthDate('');
      setRegExpiryDate('');
      setRegEmail('');
      setRegPhone('');
      setRegAddress('');
      setDniFront(null);
      setDniBack(null);

    } catch (err: any) {
      setSubmitError(err.message || 'Error al guardar socio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectMember = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMemberIds.length === filteredMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map(m => m.id));
    }
  };

  const handleExportBulkPdfs = () => {
    if (!hasPermission('export_data')) {
      alert('No tienes permisos para exportar archivos.');
      return;
    }
    const selected = members.filter(m => selectedMemberIds.includes(m.id));
    if (selected.length === 0) return;
    exportBulkMembersPdf(selected);
  };

  const filteredMembers = members.filter(m => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      m.firstName.toLowerCase().includes(term) ||
      m.lastName.toLowerCase().includes(term) ||
      m.dniPassport.toLowerCase().includes(term) ||
      (m.email && m.email.toLowerCase().includes(term));
    
    if (!matchesSearch) return false;
    if (statusFilter !== 'TODOS' && m.registrationStatus !== statusFilter) return false;
    if (docFilter !== 'TODOS' && m.documentType !== docFilter) return false;

    return true;
  });

  const approvedCount = members.filter(m => m.registrationStatus === 'approved').length;
  const pendingCount = members.filter(m => m.registrationStatus === 'pending').length;
  const recentMembers = [...members].reverse().slice(0, 5);

  return (
    <div className="min-h-screen bg-brand-dark text-gray-200 flex flex-col selection:bg-brand-red selection:text-white">
      
      <ConfirmModal
        isOpen={!!memberToDelete}
        type="danger"
        title="¿Confirmar baja del socio?"
        message={
          <span>
            ¿Estás seguro de que deseas dar de baja a <strong className="text-white font-bold">{memberToDelete?.name}</strong> de {appName}?
          </span>
        }
        confirmText="Sí, Eliminar Socio"
        cancelText="Cancelar"
        isLoading={isDeletingMember}
        onConfirm={handleConfirmDeleteMember}
        onCancel={() => setMemberToDelete(null)}
      />

      {/* Header Superior */}
      <header className="sticky top-0 z-30 bg-panel-dark/80 backdrop-blur-md border-b border-border-dark px-3 sm:px-6 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-display font-black text-white text-xs shadow-lg overflow-hidden shrink-0">
            {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-cover" /> : appName.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-display font-bold text-white text-xs sm:text-sm md:text-base tracking-wider uppercase truncate max-w-[120px] sm:max-w-none">
                {appName}
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Trabajador
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => {
              setPrefs((prev: any) => ({ ...prev, masterSound: !prev.masterSound }));
              if (!prefs.masterSound) playBeep(700, 'sine', 0.1);
            }}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all ${
              prefs.masterSound 
                ? 'bg-brand-dark text-gray-300 border-border-dark' 
                : 'bg-brand-red/10 text-brand-red border-brand-red/30'
            }`}
          >
            {prefs.masterSound ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <div className="flex items-center gap-2 bg-brand-dark/70 border border-border-dark px-2.5 py-1 rounded-xl">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {activeWorker.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-white leading-tight truncate max-w-[100px]">{activeWorker.name}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 sm:p-2 rounded-xl bg-brand-dark hover:bg-brand-red/15 text-gray-400 hover:text-brand-red border border-border-dark"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* MENÚ ACORDEÓN DESPLEGABLE EXCLUSIVO PARA MÓVILES (< md) */}
      <div className="md:hidden bg-panel-dark border-b border-border-dark px-3 py-2.5">
        <button
          type="button"
          onClick={() => setIsAccordionOpen(!isAccordionOpen)}
          className="w-full flex items-center justify-between bg-brand-dark px-3.5 py-2 rounded-xl border border-border-dark text-xs font-bold text-white transition-all active:scale-98"
        >
          <div className="flex items-center gap-2">
            <Menu size={15} className="text-brand-red shrink-0" />
            <span className="uppercase tracking-wider truncate">
              {activeTab === 'home' && 'Menú: Inicio'}
              {activeTab === 'socios' && `Menú: Socios (${members.length})`}
              {activeTab === 'registro' && 'Menú: Alta de Socio'}
              {activeTab === 'notificaciones' && `Menú: Avisos (${notifications.length})`}
              {activeTab === 'perfil' && 'Menú: Mi Perfil'}
            </span>
          </div>
          {isAccordionOpen ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
        </button>

        {isAccordionOpen && (
          <div className="mt-2 p-2 bg-brand-dark rounded-2xl border border-border-dark grid grid-cols-3 gap-1.5 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <button
              type="button"
              onClick={() => { setActiveTab('home'); setIsAccordionOpen(false); }}
              className={`p-2.5 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                activeTab === 'home' ? 'bg-panel-dark text-white border border-border-dark font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Home size={18} className="mb-1 text-emerald-400" />
              <span className="text-[10px] font-bold">Home</span>
            </button>

            {hasPermission('view_all') && (
              <button
                type="button"
                onClick={() => { setActiveTab('socios'); setIsAccordionOpen(false); }}
                className={`p-2.5 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                  activeTab === 'socios' ? 'bg-panel-dark text-white border border-border-dark font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users size={18} className="mb-1 text-blue-400" />
                <span className="text-[10px] font-bold">Socios ({members.length})</span>
              </button>
            )}

            {hasPermission('register_users') && (
              <button
                type="button"
                onClick={() => { setActiveTab('registro'); setIsAccordionOpen(false); }}
                className={`p-2.5 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                  activeTab === 'registro' ? 'bg-panel-dark text-white border border-border-dark font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                <UserPlus size={18} className="mb-1 text-brand-red" />
                <span className="text-[10px] font-bold">Alta Socio</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { setActiveTab('notificaciones'); setIsAccordionOpen(false); }}
              className={`p-2.5 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                activeTab === 'notificaciones' ? 'bg-panel-dark text-white border border-border-dark font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Bell size={18} className="mb-1 text-amber-400" />
              <span className="text-[10px] font-bold">Avisos ({notifications.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('perfil'); setIsAccordionOpen(false); }}
              className={`p-2.5 rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                activeTab === 'perfil' ? 'bg-panel-dark text-white border border-border-dark font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              <User size={18} className="mb-1 text-purple-400" />
              <span className="text-[10px] font-bold">Perfil</span>
            </button>
          </div>
        )}
      </div>

      {/* Menú de Navegación Estándar para Escritorio (>= md) */}
      <nav className="hidden md:flex bg-panel-dark/40 border-b border-border-dark px-6 py-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 max-w-7xl mx-auto w-full">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'home' ? 'bg-brand-red text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Home size={15} /> Home
          </button>

          {hasPermission('view_all') && (
            <button
              onClick={() => setActiveTab('socios')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'socios' ? 'bg-brand-red text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users size={15} /> Socios ({members.length})
            </button>
          )}

          {hasPermission('register_users') && (
            <button
              onClick={() => setActiveTab('registro')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'registro' ? 'bg-brand-red text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus size={15} /> Alta Socio
            </button>
          )}

          <button
            onClick={() => setActiveTab('notificaciones')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'notificaciones' ? 'bg-brand-red text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bell size={15} /> Notificaciones ({notifications.length})
          </button>

          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'perfil' ? 'bg-brand-red text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <User size={15} /> Mi Perfil
          </button>
        </div>
      </nav>

      {/* Contenedor Principal */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 md:p-6 pb-28 md:pb-8">
        
        {/* TAB 0: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-4 sm:space-y-6">
            
            <div className="relative overflow-hidden bg-panel-dark border border-border-dark rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-600 flex items-center justify-center font-display font-black text-white text-xl sm:text-2xl shadow-xl overflow-hidden shrink-0">
                    {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-cover" /> : activeWorker.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-brand-red/10 text-brand-red border border-brand-red/25 px-2 py-0.5 rounded-full uppercase">
                      Portal {appName}
                    </span>
                    <h1 className="text-lg sm:text-2xl md:text-3xl font-display font-black text-white mt-1">
                      Hola, {activeWorker.name}
                    </h1>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {hasPermission('register_users') && (
                    <button
                      onClick={() => setActiveTab('registro')}
                      className="flex-1 sm:flex-none h-10 sm:h-11 px-4 sm:px-5 bg-brand-red text-white rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 shadow-lg active:scale-98"
                    >
                      <UserPlus size={15} /> Alta Socio
                    </button>
                  )}
                  {hasPermission('view_all') && (
                    <button
                      onClick={() => setActiveTab('socios')}
                      className="flex-1 sm:flex-none h-10 sm:h-11 px-4 sm:px-5 bg-brand-dark text-gray-200 border border-border-dark rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Users size={15} /> Directorio
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="bg-panel-dark border border-border-dark rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between">
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-gray-400 uppercase">Total Socios</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl sm:text-3xl font-black text-white">{members.length}</span>
                  <Users size={16} className="text-brand-red" />
                </div>
              </div>

              <div className="bg-panel-dark border border-border-dark rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between">
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-gray-400 uppercase">Aprobados</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl sm:text-3xl font-black text-emerald-400">{approvedCount}</span>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
              </div>

              <div className="bg-panel-dark border border-border-dark rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between">
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-gray-400 uppercase">Pendientes</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl sm:text-3xl font-black text-amber-400">{pendingCount}</span>
                  <Clock size={16} className="text-amber-400" />
                </div>
              </div>

              <div className="bg-panel-dark border border-border-dark rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between">
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-gray-400 uppercase">Avisos</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl sm:text-3xl font-black text-white">{notifications.length}</span>
                  <Bell size={16} className="text-brand-red" />
                </div>
              </div>
            </div>

            {/* Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div 
                onClick={() => hasPermission('register_users') && setActiveTab('registro')}
                className={`bg-panel-dark border border-border-dark rounded-2xl p-4 flex flex-col justify-between active:scale-98 transition-all ${
                  hasPermission('register_users') ? 'cursor-pointer hover:border-brand-red/60' : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-brand-red/10 text-brand-red flex items-center justify-center mb-2">
                    <UserPlus size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-white">Alta Socio Cámara DNI</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Captura fotos de DNI con la cámara.</p>
                </div>
              </div>

              <div 
                onClick={() => hasPermission('view_all') && setActiveTab('socios')}
                className={`bg-panel-dark border border-border-dark rounded-2xl p-4 flex flex-col justify-between active:scale-98 transition-all ${
                  hasPermission('view_all') ? 'cursor-pointer hover:border-blue-500/60' : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
                    <Users size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-white">Directorio Socios</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Búsqueda rápida y exportación PDF.</p>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('notificaciones')}
                className="bg-panel-dark border border-border-dark rounded-2xl p-4 flex flex-col justify-between cursor-pointer active:scale-98 transition-all hover:border-amber-500/60 sm:col-span-2 md:col-span-1"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2">
                    <Bell size={18} />
                  </div>
                  <h3 className="text-xs font-bold text-white">Avisos Operativos</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Revisa alertas del sistema.</p>
                </div>
              </div>
            </div>

            {/* Ultimos Socios */}
            <div className="bg-panel-dark border border-border-dark rounded-2xl overflow-hidden shadow-xl">
              <div className="p-3.5 border-b border-border-dark flex items-center justify-between">
                <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-brand-red" /> Socios Recientes
                </h3>
              </div>

              {recentMembers.length === 0 ? (
                <p className="p-6 text-center text-gray-500 text-xs">Sin registros recientes.</p>
              ) : (
                <div className="divide-y divide-border-dark">
                  {recentMembers.map((m) => (
                    <div 
                      key={m.id} 
                      onClick={() => onSelectMember(m)}
                      className="p-3 sm:p-4 flex items-center justify-between gap-2 hover:bg-brand-dark/50 cursor-pointer active:bg-brand-dark"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                          {m.firstName.charAt(0)}{m.lastName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{m.firstName} {m.lastName}</p>
                          <p className="text-[10px] font-mono text-gray-400 truncate">{m.documentType}: {m.dniPassport}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {m.registrationStatus === 'approved' ? 'Activo' : 'Pendiente'}
                        </span>
                        <ChevronRight size={14} className="text-gray-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 1: DIRECTORIO SOCIOS */}
        {activeTab === 'socios' && (
          hasPermission('view_all') ? (
            <div className="space-y-4">
              <div className="bg-panel-dark border border-border-dark rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPrefsInSocios(!showPrefsInSocios)}
                    className="h-8 px-2.5 bg-brand-dark border border-border-dark text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Sliders size={12} className="text-emerald-400" />
                    <span>Avisos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !privacyMode;
                      setPrivacyMode(next);
                      localStorage.setItem('laguna_worker_privacy_mode', String(next));
                    }}
                    className="h-8 px-2.5 bg-brand-dark border border-border-dark text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    {privacyMode ? <EyeOff size={12} className="text-emerald-400" /> : <Eye size={12} />}
                    <span>DNI</span>
                  </button>
                </div>

                {selectedMemberIds.length > 0 && hasPermission('export_data') && (
                  <button
                    onClick={handleExportBulkPdfs}
                    className="px-3 h-8 bg-brand-red text-white font-bold text-xs uppercase rounded-lg flex items-center gap-1"
                  >
                    <Download size={12} /> Bulk ({selectedMemberIds.length})
                  </button>
                )}
              </div>

              {showPrefsInSocios && (
                <WorkerAlertPreferencesPanel
                  activeWorker={activeWorker}
                  prefs={prefs}
                  onUpdatePrefs={setPrefs}
                  playBeep={playBeep}
                />
              )}

              <div className="bg-panel-dark border border-border-dark rounded-2xl p-3 space-y-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por DNI o nombre..."
                    className="w-full h-10 pl-9 pr-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="h-9 px-2 bg-brand-dark border border-border-dark rounded-xl text-[11px] text-gray-300"
                  >
                    <option value="TODOS">Todos Estados</option>
                    <option value="approved">Aprobados</option>
                    <option value="pending">Pendientes</option>
                  </select>

                  <select
                    value={docFilter}
                    onChange={(e: any) => setDocFilter(e.target.value)}
                    className="h-9 px-2 bg-brand-dark border border-border-dark rounded-xl text-[11px] text-gray-300"
                  >
                    <option value="TODOS">Todos Docs</option>
                    <option value="DNI">Solo DNI</option>
                    <option value="PASSPORT">Pasaporte</option>
                  </select>
                </div>
              </div>

              <div className="bg-panel-dark border border-border-dark rounded-2xl overflow-hidden shadow-xl">
                <div className="p-3 bg-brand-dark border-b border-border-dark flex items-center gap-2">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                    {selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0 ? <CheckSquare size={16} className="text-brand-red" /> : <Square size={16} />}
                  </button>
                  <span className="text-xs font-bold text-gray-300">Seleccionar Todos</span>
                </div>

                <div className="divide-y divide-border-dark">
                  {filteredMembers.map(m => (
                    <div key={m.id} className="p-3 sm:p-4 flex justify-between items-center hover:bg-brand-dark/40 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button onClick={() => toggleSelectMember(m.id)} className="shrink-0">
                          {selectedMemberIds.includes(m.id) ? <CheckSquare size={16} className="text-brand-red" /> : <Square size={16} className="text-gray-500" />}
                        </button>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs truncate">{m.lastName}, {m.firstName}</p>
                          <p className="text-[10px] font-mono text-gray-400">{m.documentType}: {formatMaskedDni(m.dniPassport, !!revealedDniIds[m.id])}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            const doc = generateSvadhisthanaAltaPdf(m);
                            doc.save(`Alta_Socio_${m.dniPassport}_${appName}.pdf`);
                          }}
                          className="p-1.5 bg-brand-dark border border-border-dark text-gray-300 rounded-lg text-xs font-bold"
                          title="PDF"
                        >
                          <FileText size={13} />
                        </button>
                        <button onClick={() => onSelectMember(m)} className="px-2.5 py-1.5 bg-brand-dark border border-border-dark text-xs font-bold text-gray-300 rounded-lg">Ficha</button>
                        {hasPermission('delete_records') && (
                          <button onClick={(e) => handleDeleteFromList(e, m.id, `${m.firstName} ${m.lastName}`)} className="p-1.5 text-gray-500 hover:text-rose-400">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 bg-panel-dark border border-border-dark rounded-2xl text-center space-y-2">
              <Lock size={32} className="mx-auto text-rose-400" />
              <h4 className="text-sm font-bold text-white uppercase">Acceso Restringido</h4>
              <p className="text-xs text-gray-400">No dispones del permiso "view_all" para ver el directorio de socios.</p>
            </div>
          )
        )}

        {/* TAB 2: ALTA OFICIAL DE SOCIO */}
        {activeTab === 'registro' && (
          hasPermission('register_users') ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              <div className="lg:col-span-5 space-y-4">
                <DniPhotoCapture
                  frontImage={dniFront}
                  backImage={dniBack}
                  onChangeFront={setDniFront}
                  onChangeBack={setDniBack}
                />
              </div>

              <div className="lg:col-span-7">
                <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
                  <div className="border-b border-border-dark pb-2.5">
                    <h3 className="text-sm sm:text-base font-display font-bold text-white uppercase tracking-wider">
                      Alta Oficial de Socio — {appName}
                    </h3>
                  </div>

                  {submitError && <div className="p-3 bg-rose-500/10 text-rose-300 text-xs rounded-xl">{submitError}</div>}
                  {submitSuccess && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs space-y-2">
                      <p className="font-semibold">{submitSuccess}</p>
                      {lastRegisteredMember && (
                        <button
                          type="button"
                          onClick={() => {
                            const doc = generateSvadhisthanaAltaPdf(lastRegisteredMember);
                            doc.save(`Alta_Socio_${lastRegisteredMember.dniPassport}_${appName}.pdf`);
                          }}
                          className="w-full py-2 bg-brand-red text-white font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <Download size={13} /> Imprimir Ficha de Alta PDF
                        </button>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleRegisterMember} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1">Tipo Documento *</label>
                        <select value={regDocType} onChange={(e: any) => setRegDocType(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white font-semibold">
                          <option value="DNI">DNI (Español) / NIE</option>
                          <option value="PASSPORT">Pasaporte</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1">Número Documento *</label>
                        <input type="text" required value={regDniPassport} onChange={e => setRegDniPassport(e.target.value.toUpperCase())} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs font-mono font-bold text-white uppercase" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1">Nombre *</label>
                        <input type="text" required value={regFirstName} onChange={e => setRegFirstName(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white uppercase" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1">Apellidos *</label>
                        <input type="text" required value={regLastName} onChange={e => setRegLastName(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white uppercase" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1">Nacionalidad</label>
                        <input type="text" value={regNationality} onChange={e => setRegNationality(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white uppercase" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1">Fecha Nacimiento</label>
                        <input type="date" value={regBirthDate} onChange={e => setRegBirthDate(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1">Validez Documento</label>
                        <input type="date" value={regExpiryDate} onChange={e => setRegExpiryDate(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1">Correo Electrónico</label>
                        <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1">Teléfono</label>
                        <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1">Dirección</label>
                      <input type="text" value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white" />
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full h-11 bg-brand-red hover:bg-brand-red-hover text-white font-bold text-xs uppercase rounded-xl shadow-lg transition-all active:scale-98">
                      {isSubmitting ? 'Registrando...' : 'Confirmar y Registrar Socio'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-panel-dark border border-border-dark rounded-2xl text-center space-y-2">
              <Lock size={32} className="mx-auto text-rose-400" />
              <h4 className="text-sm font-bold text-white uppercase">Acceso Restringido</h4>
              <p className="text-xs text-gray-400">No dispones del permiso "register_users" para dar de alta nuevos socios.</p>
            </div>
          )
        )}

        {/* TAB 3: NOTIFICACIONES */}
        {activeTab === 'notificaciones' && (
          <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Avisos Operativos</h3>
            {notifications.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">Sin notificaciones nuevas.</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="p-3 bg-brand-dark rounded-xl text-xs border border-border-dark space-y-0.5">
                  <p className="font-bold text-white">{n.title}</p>
                  <p className="text-gray-400 leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: PERFIL */}
        {activeTab === 'perfil' && (
          <div className="bg-panel-dark border border-border-dark rounded-2xl p-5 sm:p-6 shadow-xl space-y-2 text-xs">
            <h3 className="font-bold text-white uppercase text-sm">Perfil de Operador</h3>
            <p className="text-gray-300">Nombre: <span className="font-bold text-white">{activeWorker.name}</span></p>
            <p className="text-gray-300">Email: <span className="font-mono text-gray-300">{activeWorker.email}</span></p>
            <p className="text-gray-300">Rol: <span className="uppercase text-emerald-400 font-bold">{activeWorker.role}</span></p>
          </div>
        )}
      </main>

      {/* Navegación Flotante Móvil Táctil (< md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-panel-dark/95 backdrop-blur-xl border-t border-border-dark px-2 flex justify-around items-center z-40 shadow-2xl">
        <button 
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'home' ? 'text-brand-red font-bold' : 'text-gray-400'
          }`}
        >
          <Home size={18} />
          <span className="text-[9px] uppercase tracking-wide mt-1 font-mono font-bold">Home</span>
        </button>

        {hasPermission('view_all') && (
          <button 
            type="button"
            onClick={() => setActiveTab('socios')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              activeTab === 'socios' ? 'text-brand-red font-bold' : 'text-gray-400'
            }`}
          >
            <Users size={18} />
            <span className="text-[9px] uppercase tracking-wide mt-1 font-mono font-bold">Socios</span>
          </button>
        )}

        {hasPermission('register_users') && (
          <button 
            type="button"
            onClick={() => setActiveTab('registro')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              activeTab === 'registro' ? 'text-brand-red font-bold' : 'text-gray-400'
            }`}
          >
            <div className="w-8 h-8 -mt-2 bg-brand-red rounded-xl flex items-center justify-center text-white shadow-lg border border-brand-red/40">
              <UserPlus size={15} />
            </div>
            <span className="text-[9px] uppercase tracking-wide mt-0.5 font-mono font-bold">Alta</span>
          </button>
        )}

        <button 
          type="button"
          onClick={() => setActiveTab('notificaciones')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'notificaciones' ? 'text-brand-red font-bold' : 'text-gray-400'
          }`}
        >
          <Bell size={18} />
          <span className="text-[9px] uppercase tracking-wide mt-1 font-mono font-bold">Avisos</span>
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('perfil')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'perfil' ? 'text-brand-red font-bold' : 'text-gray-400'
          }`}
        >
          <User size={18} />
          <span className="text-[9px] uppercase tracking-wide mt-1 font-mono font-bold">Perfil</span>
        </button>
      </nav>

      <DuplicateWarningModal
        isOpen={duplicateWarning.isOpen}
        onClose={() => setDuplicateWarning(prev => ({ ...prev, isOpen: false }))}
        documentNumber={duplicateWarning.documentNumber}
        documentType={duplicateWarning.documentType}
        existingMember={duplicateWarning.existingMember}
        onViewMember={(member) => {
          setDuplicateWarning(prev => ({ ...prev, isOpen: false }));
          onSelectMember(member);
        }}
      />
    </div>
  );
}