import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DniPhotoCapture from './DniPhotoCapture';
import { 
  Users, UserPlus, Bell, User, Search, CheckCircle2, Clock, 
  RefreshCw, LogOut, FileText, Trash2, Home, Download, CheckSquare, Square,
  ChevronRight, ExternalLink, Volume2, VolumeX, Eye, EyeOff, Sliders, ArrowRight,
  AlertTriangle, XCircle, Lock, ShieldCheck
} from 'lucide-react';
import { AssociationMember, WorkerUser, RealTimeNotification, DocumentType } from '../types';
import DuplicateWarningModal from './DuplicateWarningModal';
import WorkerAlertPreferencesPanel, { WorkerPreferences, defaultWorkerPrefs } from './WorkerAlertPreferencesPanel';
import ConfirmModal from './ConfirmModal';
import { generateSvadhisthanaAltaPdf, exportBulkMembersPdf } from '../utils/pdfGenerator';

export interface WorkerPortalProps {
  activeWorker: WorkerUser;
  members: AssociationMember[];
  onSelectMember: (member: AssociationMember) => void;
  onMemberRegistered: (newMember: AssociationMember) => void;
  onLogout: () => void;
  notifications: RealTimeNotification[];
  onSendNotification?: (title: string, message: string, priority?: 'high' | 'normal' | 'low') => Promise<any>;
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

  // Control de Permisos
  const hasPermission = (permKey: string) => {
    if (activeWorker.role === 'admin') return true;
    return activeWorker.permissions?.includes(permKey) ?? false;
  };

  // Estado para modal de baja/eliminación
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

  // Fotografías DNI / Cámara
  const [dniFront, setDniFront] = useState<string | null>(null);
  const [dniBack, setDniBack] = useState<string | null>(null);

  // Advertencia de Duplicados
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

  // Preferencias de Alertas y Sonido
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

  // Modo Privacidad para ocultar DNI
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

  const existingDuplicate = members.find(
    m => m.dniPassport.toUpperCase() === regDniPassport.trim().toUpperCase()
  );

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
      <header className="sticky top-0 z-30 bg-panel-dark/80 backdrop-blur-md border-b border-border-dark px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-display font-black text-white text-xs shadow-lg shadow-emerald-950/40 border border-emerald-400/40 overflow-hidden shrink-0">
            {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-cover" /> : appName.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-white text-sm md:text-base tracking-wider uppercase">
                {appName}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Portal Trabajador
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono hidden sm:block">
              Gestión Documental y Registro de Socios
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-dark border border-border-dark text-[10px] font-mono">
            <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="text-gray-400">{realtimeConnected ? 'Realtime Conectado' : 'Conectando...'}</span>
          </div>

          <button
            onClick={() => {
              setPrefs((prev: any) => ({ ...prev, masterSound: !prev.masterSound }));
              if (!prefs.masterSound) playBeep(700, 'sine', 0.1);
            }}
            className={`p-2 rounded-xl border transition-all ${
              prefs.masterSound 
                ? 'bg-brand-dark text-gray-300 border-border-dark hover:border-brand-red hover:text-white' 
                : 'bg-brand-red/10 text-brand-red border-brand-red/30'
            }`}
            title={prefs.masterSound ? "Silenciar avisos sonoros" : "Activar avisos sonoros"}
          >
            {prefs.masterSound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <div className="flex items-center gap-2.5 bg-brand-dark/70 border border-border-dark px-3 py-1.5 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 border border-emerald-400/50 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {activeWorker.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-white leading-tight">{activeWorker.name}</p>
              <p className="text-[9px] font-mono text-gray-400 uppercase">{activeWorker.role}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-brand-dark hover:bg-brand-red/15 text-gray-400 hover:text-brand-red border border-border-dark transition-all"
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Tabs de Navegación Principal */}
      <nav className="bg-panel-dark/40 border-b border-border-dark px-4 md:px-8 py-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max max-w-7xl mx-auto">
          
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'home'
                ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20 glow-border'
                : 'text-gray-400 hover:text-white hover:bg-panel-dark'
            }`}
          >
            <Home size={15} />
            Home
          </button>

          {hasPermission('view_all') && (
            <button
              onClick={() => setActiveTab('socios')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'socios'
                  ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20 glow-border'
                  : 'text-gray-400 hover:text-white hover:bg-panel-dark'
              }`}
            >
              <Users size={15} />
              Socios
              <span className={`ml-1 px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                activeTab === 'socios' ? 'bg-white/20 text-white' : 'bg-brand-dark text-gray-400'
              }`}>
                {members.length}
              </span>
            </button>
          )}

          {hasPermission('register_users') && (
            <button
              onClick={() => setActiveTab('registro')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'registro'
                  ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20 glow-border'
                  : 'text-gray-400 hover:text-white hover:bg-panel-dark'
              }`}
            >
              <UserPlus size={15} />
              Alta Socio
            </button>
          )}

          <button
            onClick={() => setActiveTab('notificaciones')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'notificaciones'
                ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20 glow-border'
                : 'text-gray-400 hover:text-white hover:bg-panel-dark'
            }`}
          >
            <Bell size={15} />
            Notificaciones
            {notifications.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                activeTab === 'notificaciones' ? 'bg-white/20 text-white' : 'bg-brand-red/30 text-brand-red'
              }`}>
                {notifications.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'perfil'
                ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20 glow-border'
                : 'text-gray-400 hover:text-white hover:bg-panel-dark'
            }`}
          >
            <User size={15} />
            Mi Perfil
          </button>

        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 md:py-8 pb-24 md:pb-8">
        
        {/* ======================================================== */}
        {/* TAB 0: HOME (HERO BANNER, TARJETAS KPI & TILES) */}
        {/* ======================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            
            {/* Hero Banner Banner */}
            <div className="relative overflow-hidden bg-panel-dark border border-border-dark rounded-3xl p-5 md:p-8 shadow-2xl">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-80" />
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                
                <div className="flex items-start md:items-center gap-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-emerald-600 flex items-center justify-center font-display font-black text-white text-2xl shadow-xl shadow-emerald-950/40 border border-emerald-400/40 shrink-0 overflow-hidden">
                    {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-cover" /> : activeWorker.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-bold bg-brand-red/10 text-brand-red border border-brand-red/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Portal Operativo {appName}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <h1 className="text-xl md:text-3xl font-display font-black text-white tracking-tight">
                      Hola, {activeWorker.name}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-xl">
                      Terminal operativo para verificación de identidad, registro de socios con cámara e impresiones oficiales.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {hasPermission('register_users') && (
                    <button
                      onClick={() => setActiveTab('registro')}
                      className="h-11 px-5 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-brand-red/25 glow-border"
                    >
                      <UserPlus size={16} />
                      Alta de Socio
                    </button>
                  )}
                  {hasPermission('view_all') && (
                    <button
                      onClick={() => setActiveTab('socios')}
                      className="h-11 px-5 bg-brand-dark hover:bg-border-dark text-gray-200 border border-border-dark rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                      <Users size={16} />
                      Gestionar Socios
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Métrica KPI Tarjetas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 md:p-5 flex flex-col justify-between hover:border-gray-700 transition-colors">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Total de Socios</span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-2xl md:text-3xl font-display font-black text-white">{members.length}</span>
                  <Users size={20} className="text-brand-red" />
                </div>
                <span className="text-[10px] text-gray-500 mt-1">Registrados en el sistema</span>
              </div>

              <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 md:p-5 flex flex-col justify-between hover:border-gray-700 transition-colors">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Socios Aprobados</span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-2xl md:text-3xl font-display font-black text-emerald-400">{approvedCount}</span>
                  <CheckCircle2 size={20} className="text-emerald-400" />
                </div>
                <span className="text-[10px] text-emerald-500/70 mt-1">Identidad y carnet validados</span>
              </div>

              <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 md:p-5 flex flex-col justify-between hover:border-gray-700 transition-colors">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Pendientes de Revisión</span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-2xl md:text-3xl font-display font-black text-amber-400">{pendingCount}</span>
                  <Clock size={20} className="text-amber-400" />
                </div>
                <span className="text-[10px] text-amber-500/70 mt-1">Esperando validación oficial</span>
              </div>

              <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 md:p-5 flex flex-col justify-between hover:border-gray-700 transition-colors">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Alertas y Notificaciones</span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-2xl md:text-3xl font-display font-black text-white">{notifications.length}</span>
                  <Bell size={20} className="text-brand-red" />
                </div>
                <span className="text-[10px] text-gray-500 mt-1">{realtimeConnected ? 'Canal en tiempo real activo' : 'Desconectado'}</span>
              </div>
            </div>

            {/* Accesos Directos (Tiles) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div 
                onClick={() => hasPermission('register_users') && setActiveTab('registro')}
                className={`bg-panel-dark border border-border-dark rounded-2xl p-5 transition-all flex flex-col justify-between ${
                  hasPermission('register_users') ? 'hover:border-brand-red/60 cursor-pointer group' : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-brand-red/10 text-brand-red border border-brand-red/20 flex items-center justify-center mb-3">
                    <UserPlus size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white transition-colors flex items-center gap-1.5">
                    Alta de Socio con Fotos DNI
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Captura fotografías del anverso y reverso con la cámara e ingresa los datos oficiales.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border-dark flex items-center justify-between text-[11px] font-mono text-gray-500">
                  <span>Detección de duplicados</span>
                  <span className="text-brand-red font-bold">{hasPermission('register_users') ? 'Registrar Socio →' : 'Bloqueado'}</span>
                </div>
              </div>

              <div 
                onClick={() => hasPermission('view_all') && setActiveTab('socios')}
                className={`bg-panel-dark border border-border-dark rounded-2xl p-5 transition-all flex flex-col justify-between ${
                  hasPermission('view_all') ? 'hover:border-blue-500/60 cursor-pointer group' : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3">
                    <Users size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white transition-colors flex items-center gap-1.5">
                    Directorio & Filtros Avanzados
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Búsqueda por DNI, pasaporte, nombres y exportación individual o masiva a PDF.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border-dark flex items-center justify-between text-[11px] font-mono text-gray-500">
                  <span>{members.length} registros</span>
                  <span className="text-blue-400 font-bold">{hasPermission('view_all') ? 'Explorar Lista →' : 'Bloqueado'}</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('notificaciones')}
                className="bg-panel-dark border border-border-dark hover:border-amber-500/60 rounded-2xl p-5 cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-3">
                    <Bell size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    Centro de Avisos & Notificaciones
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Revisa las notificaciones del sistema e historial operativo reciente.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border-dark flex items-center justify-between text-[11px] font-mono text-gray-500">
                  <span>{notifications.length} avisos</span>
                  <span className="text-amber-400 font-bold">Ver Alertas →</span>
                </div>
              </div>

            </div>

            {/* Socios Recientes */}
            <div className="bg-panel-dark border border-border-dark rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 md:p-5 border-b border-border-dark flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock size={16} className="text-brand-red" />
                    Últimos Socios Registrados
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Socios dados de alta recientemente en la asociación
                  </p>
                </div>
                {hasPermission('view_all') && (
                  <button
                    onClick={() => setActiveTab('socios')}
                    className="text-xs text-brand-red hover:underline font-bold flex items-center gap-1"
                  >
                    Ver todos ({members.length}) <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {recentMembers.length === 0 ? (
                <div className="p-10 text-center text-gray-500 text-xs">
                  No hay socios registrados en la base de datos actualmente.
                </div>
              ) : (
                <div className="divide-y divide-border-dark">
                  {recentMembers.map((m) => (
                    <div 
                      key={m.id} 
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-brand-dark/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 border border-emerald-400/50 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm">
                          {m.firstName.charAt(0)}{m.lastName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{m.firstName} {m.lastName}</span>
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] font-mono bg-brand-dark border border-border-dark px-1.5 py-0.5 rounded font-bold ${
                                privacyMode && !revealedDniIds[m.id] ? 'tracking-widest text-emerald-300/90' : 'text-gray-300'
                              }`}>
                                {m.documentType}: {formatMaskedDni(m.dniPassport, !!revealedDniIds[m.id])}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRevealedDniIds(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                                }}
                                className="p-0.5 text-gray-400 hover:text-emerald-400 transition-colors"
                                title={revealedDniIds[m.id] || !privacyMode ? "Ocultar DNI" : "Mostrar DNI"}
                              >
                                {revealedDniIds[m.id] || !privacyMode ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                            </div>
                          </div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                            <span>{m.nationality}</span>
                            <span>•</span>
                            <span>Alta: {new Date(m.registerDate).toLocaleDateString('es-ES')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          m.registrationStatus === 'approved' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {m.registrationStatus === 'approved' ? 'Aprobado' : 'Pendiente'}
                        </span>
                        <button
                          onClick={() => onSelectMember(m)}
                          className="h-8 px-3 bg-brand-dark hover:bg-border-dark text-gray-300 border border-border-dark rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink size={12} />
                          Ficha Oficial
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: SOCIOS (LISTADO & FILTROS) */}
        {/* ======================================================== */}
        {activeTab === 'socios' && (
          hasPermission('view_all') ? (
            <div className="space-y-6">
              
              {/* Barra de Filtros y Preferencias */}
              <div className="bg-panel-dark border border-border-dark rounded-2xl p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowPrefsInSocios(!showPrefsInSocios)}
                    className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                      showPrefsInSocios 
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm' 
                        : 'bg-brand-dark border-border-dark text-gray-300 hover:text-white hover:border-emerald-500/30'
                    }`}
                  >
                    <Sliders size={13} className="text-emerald-400" />
                    <span>Avisos & Notificaciones</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !privacyMode;
                      setPrivacyMode(next);
                      localStorage.setItem('laguna_worker_privacy_mode', String(next));
                    }}
                    className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                      privacyMode
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-sm'
                        : 'bg-brand-dark border-border-dark text-gray-400 hover:text-white'
                    }`}
                  >
                    {privacyMode ? <EyeOff size={13} className="text-emerald-400" /> : <Eye size={13} />}
                    <span>Privacidad DNI: {privacyMode ? 'Ofuscado' : 'Visible'}</span>
                  </button>
                </div>

                {selectedMemberIds.length > 0 && hasPermission('export_data') && (
                  <button
                    onClick={handleExportBulkPdfs}
                    className="px-4 h-9 bg-brand-red text-white font-bold text-xs uppercase rounded-xl flex items-center gap-2 shadow"
                  >
                    <Download size={13} /> Exportar {selectedMemberIds.length} PDFs (Bulk)
                  </button>
                )}
              </div>

              {/* Panel de Preferencias Desplegable */}
              {showPrefsInSocios && (
                <div className="animate-in fade-in duration-200">
                  <WorkerAlertPreferencesPanel
                    activeWorker={activeWorker}
                    prefs={prefs}
                    onUpdatePrefs={setPrefs}
                    playBeep={playBeep}
                  />
                </div>
              )}

              {/* Buscador y Dropdowns */}
              <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre, apellidos, DNI o pasaporte..."
                    className="w-full h-11 pl-10 pr-4 bg-brand-dark border border-border-dark rounded-xl text-xs md:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="h-11 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-gray-300 focus:outline-none focus:border-brand-red font-medium"
                  >
                    <option value="TODOS">Todos los Estados</option>
                    <option value="approved">Aprobados</option>
                    <option value="pending">Pendientes</option>
                    <option value="rejected">Rechazados</option>
                  </select>

                  <select
                    value={docFilter}
                    onChange={(e: any) => setDocFilter(e.target.value)}
                    className="h-11 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-gray-300 focus:outline-none focus:border-brand-red font-medium"
                  >
                    <option value="TODOS">Todos los Documentos</option>
                    <option value="DNI">Solo DNI</option>
                    <option value="PASSPORT">Solo Pasaportes</option>
                  </select>
                </div>
              </div>

              {/* Tabla Directorio */}
              <div className="bg-panel-dark border border-border-dark rounded-2xl overflow-hidden shadow-xl">
                <div className="p-3 bg-brand-dark border-b border-border-dark flex items-center gap-2">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                    {selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0 ? <CheckSquare size={16} className="text-brand-red" /> : <Square size={16} />}
                  </button>
                  <span className="text-xs font-bold text-gray-300">Seleccionar Todos</span>
                </div>

                <div className="divide-y divide-border-dark">
                  {filteredMembers.map(m => (
                    <div key={m.id} className="p-4 flex justify-between items-center hover:bg-brand-dark/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleSelectMember(m.id)}>
                          {selectedMemberIds.includes(m.id) ? <CheckSquare size={16} className="text-brand-red" /> : <Square size={16} className="text-gray-500" />}
                        </button>
                        <div>
                          <p className="font-bold text-white text-xs">{m.lastName}, {m.firstName}</p>
                          <p className="text-[10px] font-mono text-gray-400">{m.documentType}: {formatMaskedDni(m.dniPassport, !!revealedDniIds[m.id])}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const doc = generateSvadhisthanaAltaPdf(m);
                            doc.save(`Alta_Socio_${m.dniPassport}_${appName}.pdf`);
                          }}
                          className="p-2 bg-brand-dark border border-border-dark text-gray-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <FileText size={14} /> PDF
                        </button>
                        <button onClick={() => onSelectMember(m)} className="px-3 py-1.5 bg-brand-dark border border-border-dark text-xs font-bold text-gray-300 rounded-lg">Ficha</button>
                        {hasPermission('delete_records') && (
                          <button onClick={(e) => handleDeleteFromList(e, m.id, `${m.firstName} ${m.lastName}`)} className="p-2 text-gray-500 hover:text-rose-400 rounded-lg">
                            <Trash2 size={14} />
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

        {/* ======================================================== */}
        {/* TAB 2: ALTA OFICIAL (ESTRUCTURA DE 2 COLUMNAS) */}
        {/* ======================================================== */}
        {activeTab === 'registro' && (
          hasPermission('register_users') ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <DniPhotoCapture
                  frontImage={dniFront}
                  backImage={dniBack}
                  onChangeFront={setDniFront}
                  onChangeBack={setDniBack}
                />
              </div>

              <div className="lg:col-span-7">
                <div className="bg-panel-dark border border-border-dark rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-border-dark pb-3">
                    <div>
                      <h3 className="text-base font-display font-bold text-white uppercase tracking-wider">
                        Alta Oficial de Socio — {appName}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Ingresa los datos personales y documentales del nuevo socio.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 bg-brand-dark px-2.5 py-1 rounded-lg border border-border-dark">
                      Agente: {activeWorker.name.split(' ')[0]}
                    </span>
                  </div>

                  {submitError && (
                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                      <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {submitSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                        <p className="font-semibold">{submitSuccess}</p>
                      </div>
                      {lastRegisteredMember && (
                        <button
                          type="button"
                          onClick={() => {
                            const doc = generateSvadhisthanaAltaPdf(lastRegisteredMember);
                            doc.save(`Alta_Socio_${lastRegisteredMember.dniPassport}_${appName}.pdf`);
                          }}
                          className="w-full py-2.5 bg-brand-red hover:bg-brand-red-hover text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                        >
                          <Download size={14} /> Imprimir Ficha de Alta para Firma (PDF B&W)
                        </button>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleRegisterMember} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1.5">Tipo Documento *</label>
                        <select value={regDocType} onChange={(e: any) => setRegDocType(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white">
                          <option value="DNI">DNI (Español) / NIE</option>
                          <option value="PASSPORT">Pasaporte Internacional</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1.5">Número Documento *</label>
                        <input type="text" required value={regDniPassport} onChange={e => setRegDniPassport(e.target.value.toUpperCase())} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs font-mono font-bold text-white uppercase" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1.5">Nombre *</label>
                        <input type="text" required value={regFirstName} onChange={e => setRegFirstName(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white uppercase" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1.5">Apellidos *</label>
                        <input type="text" required value={regLastName} onChange={e => setRegLastName(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white uppercase" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1.5">Nacionalidad</label>
                        <input type="text" value={regNationality} onChange={e => setRegNationality(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white uppercase" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1.5">Fecha Nacimiento</label>
                        <input type="date" value={regBirthDate} onChange={e => setRegBirthDate(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1.5">Validez Documento</label>
                        <input type="date" value={regExpiryDate} onChange={e => setRegExpiryDate(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1.5">Correo Electrónico</label>
                        <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1.5">Teléfono</label>
                        <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase mb-1.5">Dirección</label>
                      <input type="text" value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white" />
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full h-12 bg-brand-red hover:bg-brand-red-hover text-white font-bold text-xs uppercase rounded-xl shadow-lg">
                      {isSubmitting ? 'Registrando Socio...' : 'Confirmar y Registrar Socio Oficial'}
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
          <div className="bg-panel-dark border border-border-dark rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white uppercase">Avisos Operativos</h3>
            {notifications.map(n => (
              <div key={n.id} className="p-3 bg-brand-dark rounded-xl text-xs border border-border-dark">
                <p className="font-bold text-white">{n.title}</p>
                <p className="text-gray-400">{n.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: PERFIL */}
        {activeTab === 'perfil' && (
          <div className="bg-panel-dark border border-border-dark rounded-2xl p-6 shadow-xl space-y-2 text-xs">
            <h3 className="font-bold text-white uppercase text-sm">Perfil de Operador</h3>
            <p className="text-gray-300">Nombre: {activeWorker.name}</p>
            <p className="text-gray-300">Email: {activeWorker.email}</p>
            <p className="text-gray-300">Rol: {activeWorker.role}</p>
          </div>
        )}
      </main>

      {/* Navegación Inferior para Móviles */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-panel-dark/95 backdrop-blur-xl border-t border-border-dark px-2 flex justify-around items-center z-40 shadow-2xl">
        <button 
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'home' ? 'text-brand-red font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Home size={18} />
          <span className="text-[10px] uppercase tracking-wide mt-1 font-mono font-bold">Home</span>
        </button>

        {hasPermission('view_all') && (
          <button 
            type="button"
            onClick={() => setActiveTab('socios')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              activeTab === 'socios' ? 'text-brand-red font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users size={18} />
            <span className="text-[10px] uppercase tracking-wide mt-1 font-mono font-bold">Socios</span>
          </button>
        )}

        {hasPermission('register_users') && (
          <button 
            type="button"
            onClick={() => setActiveTab('registro')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              activeTab === 'registro' ? 'text-brand-red font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="w-8 h-8 -mt-2 bg-brand-red rounded-xl flex items-center justify-center text-white shadow-lg">
              <UserPlus size={16} />
            </div>
            <span className="text-[9px] uppercase tracking-wide mt-0.5 font-mono font-bold">Alta</span>
          </button>
        )}

        <button 
          type="button"
          onClick={() => setActiveTab('notificaciones')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'notificaciones' ? 'text-brand-red font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Bell size={18} />
          <span className="text-[10px] uppercase tracking-wide mt-1 font-mono font-bold">Avisos</span>
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('perfil')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'perfil' ? 'text-brand-red font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <User size={18} />
          <span className="text-[10px] uppercase tracking-wide mt-1 font-mono font-bold">Perfil</span>
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