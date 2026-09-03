import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Scan, 
  Bell, 
  User, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ExternalLink, 
  Volume2, 
  VolumeX, 
  Camera, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw, 
  LogOut, 
  ChevronRight, 
  FileText,
  IdCard,
  Check,
  ShieldCheck,
  Send,
  Eye,
  EyeOff,
  Sliders,
  Home,
  FileCheck,
  ArrowRight,
  Activity,
  Edit3,
  Trash2
} from 'lucide-react';
import { AssociationMember, WorkerUser, RealTimeNotification, DocumentType } from '../types';
import DuplicateWarningModal from './DuplicateWarningModal';
import LiveCameraScanner, { ExtractedDocumentData } from './LiveCameraScanner';
import WorkerAlertPreferencesPanel, { WorkerPreferences, defaultWorkerPrefs } from './WorkerAlertPreferencesPanel';
import ConfirmModal from './ConfirmModal';

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
}

export type PortalTab = 'home' | 'socios' | 'registro' | 'notificaciones' | 'perfil';

export default function WorkerPortal({
  activeWorker,
  members,
  onSelectMember,
  onMemberRegistered,
  onLogout,
  notifications,
  onSendNotification,
  realtimeConnected,
  onUpdateMember,
  onDeleteMember
}: WorkerPortalProps) {
  // Navigation Tabs: 'home' | 'socios' | 'registro' | 'notificaciones' | 'perfil'
  const [activeTab, setActiveTab] = useState<PortalTab>('home');

  // Confirmation modal state for member deletion
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  // Quick delete handler for list view
  const handleDeleteFromList = (e: React.MouseEvent, memberId: string, memberName: string) => {
    e.stopPropagation();
    setMemberToDelete({ id: memberId, name: memberName });
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeletingMember(true);
    try {
      if (onDeleteMember) {
        await onDeleteMember(memberToDelete.id);
      } else {
        await fetch(`/api/members/${memberToDelete.id}?worker=${encodeURIComponent(JSON.stringify(activeWorker))}`, {
          method: 'DELETE'
        });
      }
      setMemberToDelete(null);
    } catch (err) {
      console.error("Error al eliminar socio:", err);
    } finally {
      setIsDeletingMember(false);
    }
  };

  // Socios Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'approved' | 'pending' | 'rejected'>('TODOS');
  const [docFilter, setDocFilter] = useState<'TODOS' | 'DNI' | 'PASSPORT'>('TODOS');

  // Registration Form State
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

  // Scanner Simulator / OCR State
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scannerMode, setScannerMode] = useState<'camera' | 'preset'>('camera');

  // Handle Ultra-Fast Live Camera Capture
  const handleLiveCameraCaptured = (data: ExtractedDocumentData) => {
    setRegFirstName(data.firstName || '');
    setRegLastName(data.lastName || '');
    const docNum = (data.dniPassport || '').trim().toUpperCase();
    setRegDniPassport(docNum);
    setRegDocType(data.documentType === 'PASSPORT' ? 'PASSPORT' : (docNum.startsWith('X') || docNum.startsWith('Y') || docNum.startsWith('Z') ? 'NIE' : 'DNI'));
    setRegNationality((data.nationality || 'ESPAÑOLA').toUpperCase());
    setRegBirthDate(data.birthDate || '');
    setRegExpiryDate(data.expiryDate || '');
    if (data.email) setRegEmail(data.email);
    if (data.phone) setRegPhone(data.phone);
    if (data.address) setRegAddress(data.address);
    setSubmitSuccess('¡Documento escaneado ultra-rápido y formulario completado!');

    if (prefs.ocrScan?.sound) {
      playBeep(920, 'sine', 0.15);
    }

    // Duplicate Check against members
    const duplicate = members.find(m => m.dniPassport.toUpperCase() === docNum);
    if (duplicate) {
      setDuplicateWarning({
        isOpen: true,
        documentNumber: docNum,
        documentType: data.documentType,
        existingMember: duplicate
      });
    }
  };

  // Duplicate Warning Modal State
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

  // Sound & Notification Preferences
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

  // Privacy Mode (Obfuscate DNI / Passport in public places)
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('laguna_worker_privacy_mode') !== 'false';
  });
  const [revealedDniIds, setRevealedDniIds] = useState<Record<string, boolean>>({});

  const formatMaskedDni = (dni: string, isRevealed: boolean) => {
    if (isRevealed || !privacyMode) return dni;
    if (!dni) return '••••••';
    const clean = dni.trim();
    if (clean.length <= 4) return '••••••••';
    return `${clean.slice(0, 2)}••••${clean.slice(-2)}`;
  };

  // Preference panel toggle in Socios tab
  const [showPrefsInSocios, setShowPrefsInSocios] = useState<boolean>(false);

  // Audio synthesizer via Web Audio API
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
      // safe catch for autoplay restrictions
    }
  };

  // Real-time duplicate check against existing members list
  const existingDuplicate = members.find(
    m => m.dniPassport.toUpperCase() === regDniPassport.trim().toUpperCase()
  );

  // Handle OCR Predefined Presets
  const applyPreset = (presetType: 'dni' | 'nie' | 'passport') => {
    setIsScanning(true);
    setScanMessage('Procesando extracción OCR del documento...');
    setTimeout(() => {
      if (presetType === 'dni') {
        setRegFirstName('CARLOS');
        setRegLastName('NAVARRO SÁNCHEZ');
        setRegDniPassport('48291048K');
        setRegDocType('DNI');
        setRegNationality('ESPAÑOLA');
        setRegBirthDate('1988-04-12');
        setRegExpiryDate('2030-04-12');
        setRegEmail('carlos.navarro@email.com');
        setRegPhone('+34 611 234 567');
        setRegAddress('Calle Gran Vía 45, 3ºB, Madrid');
      } else if (presetType === 'nie') {
        setRegFirstName('SOPHIE');
        setRegLastName('LEROY');
        setRegDniPassport('Y8921345T');
        setRegDocType('DNI');
        setRegNationality('FRANCESA');
        setRegBirthDate('1994-09-21');
        setRegExpiryDate('2028-09-21');
        setRegEmail('sophie.leroy@email.com');
        setRegPhone('+34 688 987 654');
        setRegAddress('Avenida Diagonal 120, Barcelona');
      } else {
        setRegFirstName('MATEO');
        setRegLastName('ROSSI');
        setRegDniPassport('AA1298453');
        setRegDocType('PASSPORT');
        setRegNationality('ITALIANA');
        setRegBirthDate('1991-11-03');
        setRegExpiryDate('2032-11-03');
        setRegEmail('mateo.rossi@email.com');
        setRegPhone('+34 622 345 678');
        setRegAddress('Plaza Mayor 14, Valencia');
      }
      setIsScanning(false);
      setScanMessage(null);
      if (prefs.ocrScan?.sound) {
        playBeep(920, 'sine', 0.15);
      }
    }, 450);
  };

  // Submit Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const docNum = regDniPassport.trim().toUpperCase();
    if (!docNum || !regFirstName.trim() || !regLastName.trim()) {
      setSubmitError('Por favor, completa los campos obligatorios (DNI/Pasaporte, Nombre y Apellidos).');
      return;
    }

    // Check for duplicate in local state
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
      const payload = {
        memberData: {
          firstName: regFirstName.trim().toUpperCase(),
          lastName: regLastName.trim().toUpperCase(),
          dniPassport: docNum,
          documentType: regDocType,
          nationality: regNationality.trim().toUpperCase(),
          birthDate: regBirthDate,
          expiryDate: regExpiryDate,
          email: regEmail.trim(),
          phone: regPhone.trim(),
          address: regAddress.trim(),
          registrationStatus: 'approved'
        },
        worker: activeWorker
      };

      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.existingMember) {
          setDuplicateWarning({
            isOpen: true,
            documentNumber: docNum,
            documentType: regDocType,
            existingMember: data.existingMember
          });
          return;
        }
        throw new Error(data.error || 'Error al procesar el registro del socio.');
      }

      onMemberRegistered(data);
      setSubmitSuccess(`Socio ${data.firstName} ${data.lastName} (${data.dniPassport}) registrado con éxito.`);
      if (prefs.memberReg?.sound) {
        playBeep(1040, 'triangle', 0.18);
      }

      // Reset fields
      setRegFirstName('');
      setRegLastName('');
      setRegDniPassport('');
      setRegBirthDate('');
      setRegExpiryDate('');
      setRegEmail('');
      setRegPhone('');
      setRegAddress('');

    } catch (err: any) {
      setSubmitError(err.message || 'Error inesperado al guardar el socio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter(m => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      m.firstName.toLowerCase().includes(term) ||
      m.lastName.toLowerCase().includes(term) ||
      m.dniPassport.toLowerCase().includes(term) ||
      (m.email && m.email.toLowerCase().includes(term));
    
    if (!matchesSearch) return false;

    if (statusFilter !== 'TODOS' && m.registrationStatus !== statusFilter) {
      return false;
    }

    if (docFilter !== 'TODOS') {
      if (docFilter === 'DNI' && m.documentType !== 'DNI') return false;
      if (docFilter === 'PASSPORT' && m.documentType !== 'PASSPORT') return false;
    }

    return true;
  });

  const approvedCount = members.filter(m => m.registrationStatus === 'approved').length;
  const pendingCount = members.filter(m => m.registrationStatus === 'pending').length;
  const rejectedCount = members.filter(m => m.registrationStatus === 'rejected').length;
  const recentMembers = [...members].reverse().slice(0, 5);

  return (
    <div className="min-h-screen bg-brand-dark text-gray-200 flex flex-col selection:bg-brand-red selection:text-white">
      
      {/* Reusable ConfirmModal for Member Deletion */}
      <ConfirmModal
        isOpen={!!memberToDelete}
        type="danger"
        title="¿Confirmar baja del socio?"
        message={
          <span>
            ¿Estás seguro de que deseas dar de baja y eliminar de forma permanente a <strong className="text-white font-bold">{memberToDelete?.name}</strong> de la asociación Laguna Verde?
          </span>
        }
        confirmText="Sí, Eliminar Socio"
        cancelText="Cancelar"
        isLoading={isDeletingMember}
        onConfirm={handleConfirmDeleteMember}
        onCancel={() => setMemberToDelete(null)}
      />

      {/* Top Header - Responsive & High-End Tech */}
      <header className="sticky top-0 z-30 bg-panel-dark/80 backdrop-blur-md border-b border-border-dark px-4 md:px-8 py-3.5 flex items-center justify-between">
        
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-display font-black text-white text-xs shadow-lg shadow-emerald-950/40 border border-emerald-400/40">
            LV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-white text-sm md:text-base tracking-wider uppercase">
                Laguna Verde
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

        {/* Realtime Status & Worker Profile */}
        <div className="flex items-center gap-3 md:gap-4">
          
          {/* SSE Live Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-dark border border-border-dark text-[10px] font-mono">
            <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="text-gray-400">{realtimeConnected ? 'Realtime Conectado' : 'Conectando...'}</span>
          </div>

          {/* Sound Toggle Quick Button */}
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

          {/* Worker Info Pill - Avatar box completely green with white letter */}
          <div className="flex items-center gap-2.5 bg-brand-dark/70 border border-border-dark px-3 py-1.5 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 border border-emerald-400/50 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {activeWorker.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-white leading-tight">{activeWorker.name}</p>
              <p className="text-[9px] font-mono text-gray-400 uppercase">{activeWorker.role}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-brand-dark hover:bg-brand-red/15 text-gray-400 hover:text-brand-red border border-border-dark hover:border-brand-red/30 transition-all"
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Navigation Sub-header / Tabs (Responsive) */}
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

          <button
            onClick={() => setActiveTab('registro')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'registro'
                ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20 glow-border'
                : 'text-gray-400 hover:text-white hover:bg-panel-dark'
            }`}
          >
            <UserPlus size={15} />
            Alta & Escáner
          </button>

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
            Mi Perfil & Ajustes
          </button>

        </div>
      </nav>

      {/* Main Content Area - Full width on laptop, comfortable on phone */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 md:py-8 pb-24 md:pb-8">
        
        {/* ======================================================== */}
        {/* TAB 0: HOME (HOMEPAGE & ACTION DASHBOARD) */}
        {/* ======================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            
            {/* High-End Tech Hero Greeting Banner */}
            <div className="relative overflow-hidden bg-panel-dark border border-border-dark rounded-3xl p-5 md:p-8 shadow-2xl">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-80" />
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                
                <div className="flex items-start md:items-center gap-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-emerald-600 flex items-center justify-center font-display font-black text-white text-2xl shadow-xl shadow-emerald-950/40 border border-emerald-400/40 shrink-0">
                    {activeWorker.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-bold bg-brand-red/10 text-brand-red border border-brand-red/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Portal Operativo Laguna Verde
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <h1 className="text-xl md:text-3xl font-display font-black text-white tracking-tight">
                      Hola, {activeWorker.name}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-xl">
                      Terminal operativo para verificación de identidad, registro de socios mediante escáner óptico OCR y control de auditoría.
                    </p>
                  </div>
                </div>

                {/* Primary CTA buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('registro')}
                    className="h-11 px-5 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-brand-red/25 glow-border"
                  >
                    <UserPlus size={16} />
                    Alta con Escáner OCR
                  </button>
                  <button
                    onClick={() => setActiveTab('socios')}
                    className="h-11 px-5 bg-brand-dark hover:bg-border-dark text-gray-200 border border-border-dark rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    <Users size={16} />
                    Gestionar Socios
                  </button>
                </div>

              </div>
            </div>

            {/* Quick KPI Metrics */}
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

            {/* Quick Interactive Feature Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Tile 1: OCR Scanner */}
              <div 
                onClick={() => setActiveTab('registro')}
                className="bg-panel-dark border border-border-dark hover:border-brand-red/60 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-brand-red/10 group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-brand-red/10 text-brand-red border border-brand-red/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Scan size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-brand-red transition-colors flex items-center gap-1.5">
                    Lector Óptico & Escáner OCR
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Escanea DNI español o Pasaporte con la cámara o presets inteligentes para autocompletar la ficha en segundos.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border-dark flex items-center justify-between text-[11px] font-mono text-gray-500">
                  <span>Detección de duplicados</span>
                  <span className="text-brand-red font-bold">Abrir Escáner →</span>
                </div>
              </div>

              {/* Tile 2: Manage Members & Filters */}
              <div 
                onClick={() => setActiveTab('socios')}
                className="bg-panel-dark border border-border-dark hover:border-brand-red/60 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-brand-red/10 group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                    Directorio & Filtros Avanzados
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Búsqueda por DNI, pasaporte, nombres, filtros por estado (aprobado/pendiente) y exportación a PDF.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border-dark flex items-center justify-between text-[11px] font-mono text-gray-500">
                  <span>{members.length} registros</span>
                  <span className="text-blue-400 font-bold">Explorar Lista →</span>
                </div>
              </div>

              {/* Tile 3: Notification Center */}
              <div 
                onClick={() => setActiveTab('notificaciones')}
                className="bg-panel-dark border border-border-dark hover:border-brand-red/60 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-brand-red/10 group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Bell size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    Centro de Avisos & Push
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Difunde notificaciones operativas a todos los terminales y gestiona las preferencias de audio/visual por actividad.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border-dark flex items-center justify-between text-[11px] font-mono text-gray-500">
                  <span>{notifications.length} avisos</span>
                  <span className="text-amber-400 font-bold">Ver Alertas →</span>
                </div>
              </div>

            </div>

            {/* Recent Members Section */}
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
                <button
                  onClick={() => setActiveTab('socios')}
                  className="text-xs text-brand-red hover:underline font-bold flex items-center gap-1"
                >
                  Ver todos ({members.length}) <ChevronRight size={14} />
                </button>
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
                            : m.registrationStatus === 'pending' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {m.registrationStatus === 'approved' ? 'Aprobado' : m.registrationStatus === 'pending' ? 'Pendiente' : 'Rechazado'}
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
          <div className="space-y-6">
            
            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Total de Socios</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl md:text-3xl font-display font-black text-white">{members.length}</span>
                  <Users size={18} className="text-brand-red" />
                </div>
              </div>

              <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Aprobados</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl md:text-3xl font-display font-black text-emerald-400">
                    {members.filter(m => m.registrationStatus === 'approved').length}
                  </span>
                  <CheckCircle2 size={18} className="text-emerald-400" />
                </div>
              </div>

              <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Pendientes</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl md:text-3xl font-display font-black text-amber-400">
                    {members.filter(m => m.registrationStatus === 'pending').length}
                  </span>
                  <Clock size={18} className="text-amber-400" />
                </div>
              </div>

              <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Alta Rápida</span>
                <button 
                  onClick={() => setActiveTab('registro')}
                  className="mt-2 h-9 w-full bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all glow-border shadow-md"
                >
                  <UserPlus size={14} /> Registrar Socio
                </button>
              </div>
            </div>

            {/* Preferences & Privacy Controls Toolbar (in Socios) */}
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
                  title="Configurar avisos sonoros y notificaciones visuales para cada actividad"
                >
                  <Sliders size={13} className="text-emerald-400" />
                  <span>Avisos & Notificaciones</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {showPrefsInSocios ? 'Ocultar Panel' : 'Configurar'}
                  </span>
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
                  title="Ocultar o mostrar DNIs en lugares públicos para mayor privacidad"
                >
                  {privacyMode ? <EyeOff size={13} className="text-emerald-400" /> : <Eye size={13} />}
                  <span>Privacidad DNI: {privacyMode ? 'Ofuscado' : 'Visible'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${prefs.masterSound ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
                  <span>{prefs.masterSound ? 'Audio Activo' : 'Audio Silenciado'}</span>
                </span>
              </div>
            </div>

            {/* Expandable Preferences Panel inside Socios */}
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

            {/* Search & Filters Bar */}
            <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              
              {/* Search Box */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, apellidos, DNI o pasaporte..."
                  className="w-full h-11 pl-10 pr-4 bg-brand-dark border border-border-dark rounded-xl text-xs md:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Status & Document Filters */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                
                {/* Status Selector */}
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

                {/* Doc Type Selector */}
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

            {/* Members Directory - Responsive Table for Laptops, Cards for Mobile */}
            <div className="bg-panel-dark border border-border-dark rounded-2xl overflow-hidden shadow-xl">
              
              <div className="p-4 border-b border-border-dark flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                    Directorio de Socios
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {filteredMembers.length} de {members.length} socios registrados
                  </p>
                </div>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="p-12 text-center">
                  <Users size={36} className="mx-auto text-gray-600 mb-3" />
                  <h4 className="text-sm font-bold text-gray-300">No se encontraron socios</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    No hay resultados para los términos o filtros seleccionados. Prueba a modificar los filtros.
                  </p>
                </div>
              ) : (
                <>
                  {/* Laptop / Tablet View: Spacious Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-brand-dark/60 text-gray-400 font-mono uppercase text-[10px] tracking-wider border-b border-border-dark">
                          <th className="py-3.5 px-4 font-semibold">Socio</th>
                          <th className="py-3.5 px-4 font-semibold">Documento</th>
                          <th className="py-3.5 px-4 font-semibold">Nacionalidad</th>
                          <th className="py-3.5 px-4 font-semibold">Estado</th>
                          <th className="py-3.5 px-4 font-semibold">Fecha de Alta</th>
                          <th className="py-3.5 px-4 font-semibold text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-dark/60">
                        {filteredMembers.map((m) => (
                          <tr 
                            key={m.id}
                            onClick={() => onSelectMember(m)}
                            className="hover:bg-brand-dark/40 cursor-pointer transition-colors group"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-600 border border-emerald-400/50 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                                  {m.firstName.charAt(0)}{m.lastName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-white group-hover:text-brand-red transition-colors">
                                    {m.firstName} {m.lastName}
                                  </div>
                                  <div className="text-[11px] text-gray-400">{m.email || 'Sin correo'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-mono font-bold ${
                                  privacyMode && !revealedDniIds[m.id] ? 'tracking-widest text-emerald-300/90' : 'text-gray-200'
                                }`}>
                                  {formatMaskedDni(m.dniPassport, !!revealedDniIds[m.id])}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRevealedDniIds(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                                  }}
                                  className="p-1 text-gray-400 hover:text-emerald-400 bg-brand-dark/80 hover:bg-emerald-950/40 border border-border-dark hover:border-emerald-500/40 rounded-lg transition-colors"
                                  title={revealedDniIds[m.id] || !privacyMode ? "Ocultar documento" : "Mostrar documento"}
                                >
                                  {revealedDniIds[m.id] || !privacyMode ? <EyeOff size={11} /> : <Eye size={11} />}
                                </button>
                              </div>
                              <span className="text-[10px] text-gray-500 block font-mono mt-0.5">{m.documentType}</span>
                            </td>
                            <td className="py-3.5 px-4 text-gray-300">
                              {m.nationality}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                m.registrationStatus === 'approved' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : m.registrationStatus === 'pending'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  m.registrationStatus === 'approved' ? 'bg-emerald-400' : m.registrationStatus === 'pending' ? 'bg-amber-400' : 'bg-rose-400'
                                }`}></span>
                                {m.registrationStatus === 'approved' ? 'Aprobado' : m.registrationStatus === 'pending' ? 'Pendiente' : 'Rechazado'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                              {new Date(m.registerDate).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectMember(m);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-brand-dark hover:bg-brand-red hover:text-white border border-border-dark hover:border-brand-red text-gray-300 font-semibold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm"
                                  title="Ver Ficha / Carnet Oficial"
                                >
                                  <FileText size={13} />
                                  <span>Ficha</span>
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectMember(m);
                                  }}
                                  className="p-1.5 rounded-xl bg-brand-dark hover:bg-gray-800 text-gray-400 hover:text-white border border-border-dark hover:border-gray-600 transition-all"
                                  title="Editar Información"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button 
                                  onClick={(e) => handleDeleteFromList(e, m.id, `${m.firstName} ${m.lastName}`)}
                                  className="p-1.5 rounded-xl bg-brand-dark hover:bg-rose-500/15 text-gray-400 hover:text-rose-400 border border-border-dark hover:border-rose-500/30 transition-all"
                                  title="Eliminar Socio"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View: High-contrast Cards */}
                  <div className="md:hidden divide-y divide-border-dark">
                    {filteredMembers.map((m) => (
                      <div 
                        key={m.id}
                        onClick={() => onSelectMember(m)}
                        className="p-4 hover:bg-brand-dark/40 active:bg-brand-dark transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 border border-emerald-400/50 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                            {m.firstName.charAt(0)}{m.lastName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">
                              {m.firstName} {m.lastName}
                            </h4>
                            <p className="text-xs font-mono text-gray-400 flex items-center gap-2 mt-0.5">
                              <span className={`font-semibold ${privacyMode && !revealedDniIds[m.id] ? 'tracking-widest text-emerald-300' : 'text-gray-300'}`}>
                                {formatMaskedDni(m.dniPassport, !!revealedDniIds[m.id])}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRevealedDniIds(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                                }}
                                className="p-0.5 text-gray-400 hover:text-emerald-400"
                                title={revealedDniIds[m.id] || !privacyMode ? "Ocultar DNI" : "Mostrar DNI"}
                              >
                                {revealedDniIds[m.id] || !privacyMode ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                              <span>•</span>
                              <span>{m.nationality}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                            m.registrationStatus === 'approved' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {m.registrationStatus === 'approved' ? 'Aprobado' : 'Pendiente'}
                          </span>
                          <button
                            onClick={(e) => handleDeleteFromList(e, m.id, `${m.firstName} ${m.lastName}`)}
                            className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Eliminar Socio"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={16} className="text-gray-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: ALTA & ESCÁNER DOCUMENTAL (RESPONSIVE 2-COLUMN) */}
        {/* ======================================================== */}
        {activeTab === 'registro' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column (5 cols on laptop): OCR Scanner & Presets */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Scanner Box */}
              <div className="bg-panel-dark border border-border-dark rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Scan size={18} className="text-brand-red" />
                    <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                      Escáner Documental OCR
                    </h3>
                  </div>
                  
                  {/* Mode switcher */}
                  <div className="flex items-center bg-brand-dark p-0.5 rounded-lg border border-border-dark text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setScannerMode('camera')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-bold ${
                        scannerMode === 'camera' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Camera size={12} className={scannerMode === 'camera' ? 'text-brand-red' : ''} />
                      Cámara
                    </button>
                    <button
                      type="button"
                      onClick={() => setScannerMode('preset')}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-bold ${
                        scannerMode === 'preset' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <IdCard size={12} className={scannerMode === 'preset' ? 'text-brand-red' : ''} />
                      Muestras
                    </button>
                  </div>
                </div>

                {/* Viewport: Live Camera or Preset Viewfinder */}
                {scannerMode === 'camera' ? (
                  <div className="w-full">
                    <LiveCameraScanner
                      workerSession={activeWorker}
                      onCaptureData={handleLiveCameraCaptured}
                    />
                  </div>
                ) : (
                  <div>
                    {/* Camera / Scan Window Viewfinder */}
                    <div className="relative aspect-[16/10] bg-brand-dark rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center p-4 overflow-hidden group">
                      
                      {/* Viewfinder Corners */}
                      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-brand-red"></div>
                      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-brand-red"></div>
                      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-brand-red"></div>
                      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-brand-red"></div>

                      {isScanning ? (
                        <div className="flex flex-col items-center gap-3 text-center z-10">
                          <RefreshCw size={32} className="text-brand-red animate-spin" />
                          <p className="text-xs font-mono text-white font-semibold">{scanMessage}</p>
                          <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-red animate-[pulse_1s_infinite]"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center text-gray-400">
                          <IdCard size={36} className="text-gray-500 group-hover:text-brand-red transition-colors" />
                          <p className="text-xs font-semibold text-gray-300">
                            Carga rápida de prueba
                          </p>
                          <p className="text-[11px] text-gray-500 max-w-xs">
                            Selecciona una muestra para simular la extracción y validación de campos.
                          </p>
                        </div>
                      )}

                      {/* Red Laser line animation during scan */}
                      {isScanning && (
                        <div className="absolute left-0 right-0 h-0.5 bg-brand-red shadow-[0_0_8px_#dc2626] animate-[bounce_2s_infinite]"></div>
                      )}
                    </div>

                    {/* Predefined Test Presets for Instant Testing */}
                    <div className="mt-4 pt-4 border-t border-border-dark">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                          Cargar Muestra Rápida
                        </span>
                        <span className="text-[9px] text-brand-red font-mono font-bold">1-CLIC OCR</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => applyPreset('dni')}
                          className="py-2 px-2 bg-brand-dark hover:bg-gray-800 border border-border-dark hover:border-brand-red/40 rounded-xl text-[11px] font-semibold text-gray-300 hover:text-white transition-all text-center flex flex-col items-center gap-1"
                        >
                          <IdCard size={14} className="text-brand-red" />
                          DNI Español
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('nie')}
                          className="py-2 px-2 bg-brand-dark hover:bg-gray-800 border border-border-dark hover:border-brand-red/40 rounded-xl text-[11px] font-semibold text-gray-300 hover:text-white transition-all text-center flex flex-col items-center gap-1"
                        >
                          <IdCard size={14} className="text-amber-400" />
                          NIE Europeo
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('passport')}
                          className="py-2 px-2 bg-brand-dark hover:bg-gray-800 border border-border-dark hover:border-brand-red/40 rounded-xl text-[11px] font-semibold text-gray-300 hover:text-white transition-all text-center flex flex-col items-center gap-1"
                        >
                          <FileText size={14} className="text-emerald-400" />
                          Pasaporte
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Duplicate Inline Tooltip/Alert if typed */}
              {existingDuplicate && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-300 flex items-start gap-3 shadow-lg">
                  <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-white">¡Atención: Documento ya registrado!</p>
                    <p className="text-amber-200/90 mt-0.5">
                      El identificador <span className="font-mono font-bold text-white">{existingDuplicate.dniPassport}</span> pertenece a <span className="font-bold text-white">{existingDuplicate.firstName} {existingDuplicate.lastName}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => onSelectMember(existingDuplicate)}
                      className="mt-2 text-[11px] font-bold text-amber-300 hover:text-white inline-flex items-center gap-1.5 underline"
                    >
                      <Eye size={12} />
                      Ver Ficha de {existingDuplicate.firstName} {existingDuplicate.lastName}
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column (7 cols on laptop): Official Registration Form */}
            <div className="lg:col-span-7">
              <div className="bg-panel-dark border border-border-dark rounded-2xl p-5 md:p-6 shadow-xl">
                
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-display font-bold text-white uppercase tracking-wider">
                      Formulario de Alta Oficial
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
                  <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <XCircle size={16} className="shrink-0 text-rose-400" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  
                  {/* Row 1: Document Type & Number */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Tipo Documento *
                      </label>
                      <select
                        value={regDocType}
                        onChange={(e: any) => setRegDocType(e.target.value)}
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                      >
                        <option value="DNI">DNI (Español) / NIE</option>
                        <option value="PASSPORT">Pasaporte Internacional</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Número de Documento *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={regDniPassport}
                          onChange={(e) => setRegDniPassport(e.target.value.toUpperCase())}
                          placeholder="Ej: 12345678Z o AA123456"
                          className={`w-full h-10 px-3 bg-brand-dark border rounded-xl text-xs font-mono font-bold text-white uppercase focus:outline-none transition-all ${
                            existingDuplicate ? 'border-amber-500 bg-amber-500/5' : 'border-border-dark focus:border-brand-red'
                          }`}
                        />
                        {existingDuplicate && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-400">
                            Ya existe
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: First & Last Names */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Nombre(s) *
                      </label>
                      <input
                        type="text"
                        required
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="Ej: MARÍA"
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white uppercase focus:outline-none focus:border-brand-red font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Apellidos *
                      </label>
                      <input
                        type="text"
                        required
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="Ej: GARCÍA LÓPEZ"
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white uppercase focus:outline-none focus:border-brand-red font-medium"
                      />
                    </div>
                  </div>

                  {/* Row 3: Nationality, BirthDate, Expiry */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Nacionalidad
                      </label>
                      <input
                        type="text"
                        value={regNationality}
                        onChange={(e) => setRegNationality(e.target.value)}
                        placeholder="ESPAÑOLA"
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white uppercase focus:outline-none focus:border-brand-red font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Fecha Nacimiento
                      </label>
                      <input
                        type="date"
                        value={regBirthDate}
                        onChange={(e) => setRegBirthDate(e.target.value)}
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-brand-red"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Validez Documento
                      </label>
                      <input
                        type="date"
                        value={regExpiryDate}
                        onChange={(e) => setRegExpiryDate(e.target.value)}
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-brand-red"
                      />
                    </div>
                  </div>

                  {/* Row 4: Contact info (Email, Phone) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="socio@ejemplo.com"
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-brand-red font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+34 600 000 000"
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-brand-red font-medium"
                      />
                    </div>
                  </div>

                  {/* Row 5: Address */}
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Dirección de Residencia
                    </label>
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="Calle, Número, Piso, Ciudad"
                      className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-brand-red font-medium"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-brand-red hover:bg-brand-red-hover disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-red/20 glow-border flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" /> Registrando Socio...
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} /> Confirmar y Registrar Socio Oficial
                        </>
                      )}
                    </button>
                  </div>

                </form>

              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: NOTIFICACIONES (ALERTAS EN TIEMPO REAL) */}
        {/* ======================================================== */}
        {activeTab === 'notificaciones' && (
          <div className="max-w-3xl mx-auto space-y-4">
            
            <div className="bg-panel-dark border border-border-dark rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                    Centro de Notificaciones & Alertas
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Avisos en tiempo real sobre socios, validaciones y actividad del sistema.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-gray-400 bg-brand-dark px-2.5 py-1 rounded-lg border border-border-dark">
                  {notifications.length} Avisos
                </span>
              </div>

              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Bell size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-xs font-semibold text-gray-400">Sin notificaciones pendientes</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Las nuevas alertas aparecerán aquí en vivo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div 
                      key={n.id}
                      className="p-4 rounded-xl bg-brand-dark/70 border border-border-dark hover:border-gray-700 transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          n.priority === 'high' || n.isPush ? 'bg-brand-red/20 text-brand-red' : 'bg-gray-800 text-gray-300'
                        }`}>
                          <Bell size={14} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{n.title}</h4>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-gray-500">
                            <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                            <span>•</span>
                            <span>De: {n.senderName || 'Sistema'}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                        n.priority === 'high' || n.isPush ? 'bg-brand-red/20 text-brand-red' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {n.priority || (n.isPush ? 'PUSH' : 'NORMAL')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: MI PERFIL & PREFERENCIAS DE ALERTAS */}
        {/* ======================================================== */}
        {activeTab === 'perfil' && (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Worker Account Card */}
            <div className="bg-panel-dark border border-border-dark rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 border border-emerald-400/50 flex items-center justify-center text-white font-display font-black text-2xl shadow-lg shadow-emerald-950/40">
                  {activeWorker.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-display font-bold text-white">{activeWorker.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      {activeWorker.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{activeWorker.email}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">ID Trabajador: #{activeWorker.id}</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="px-4 py-2 bg-brand-dark hover:bg-emerald-950/40 text-gray-300 hover:text-emerald-400 border border-border-dark hover:border-emerald-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <LogOut size={14} /> Cerrar Sesión
              </button>
            </div>

            {/* Notification Preferences (Sound & Visual Management) */}
            <WorkerAlertPreferencesPanel
              activeWorker={activeWorker}
              prefs={prefs}
              onUpdatePrefs={setPrefs}
              playBeep={playBeep}
            />

          </div>
        )}

      </main>

      {/* Duplicate Warning Modal with direct link to existing member */}
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

      {/* ======================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Phones & Tablets) */}
      {/* Replaced 'Perfil' with 'Socios' and 'Socios' with 'Home' */}
      {/* Home -> Homepage | Socios -> Member List with Filters */}
      {/* ======================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-panel-dark/95 backdrop-blur-xl border-t border-border-dark px-2 flex justify-around items-center z-40 shadow-2xl">
        {/* Tab 1: HOME -> Directs to homepage */}
        <button 
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'home' ? 'text-brand-red font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Home size={18} className={activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.5]'} />
          <span className="text-[10px] uppercase tracking-wide mt-1 font-mono font-bold">Home</span>
        </button>

        {/* Tab 2: SOCIOS -> Directs to member management list (filtros) */}
        <button 
          type="button"
          onClick={() => setActiveTab('socios')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'socios' ? 'text-brand-red font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users size={18} className={activeTab === 'socios' ? 'stroke-[2.5]' : 'stroke-[1.5]'} />
          <span className="text-[10px] uppercase tracking-wide mt-1 font-mono font-bold">Socios</span>
        </button>

        {/* Tab 3: ALTA & ESCÁNER */}
        <button 
          type="button"
          onClick={() => setActiveTab('registro')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'registro' ? 'text-brand-red font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="w-8 h-8 -mt-2 bg-brand-red rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-red/30 border border-brand-red/40">
            <UserPlus size={16} />
          </div>
          <span className="text-[9px] uppercase tracking-wide mt-0.5 font-mono font-bold">Alta</span>
        </button>

        {/* Tab 4: NOTIFICACIONES */}
        <button 
          type="button"
          onClick={() => setActiveTab('notificaciones')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
            activeTab === 'notificaciones' ? 'text-brand-red font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Bell size={18} className={activeTab === 'notificaciones' ? 'stroke-[2.5]' : 'stroke-[1.5]'} />
          {notifications.length > 0 && (
            <span className="absolute top-1 right-4 w-2 h-2 bg-brand-red rounded-full ring-2 ring-panel-dark"></span>
          )}
          <span className="text-[10px] uppercase tracking-wide mt-1 font-mono font-bold">Avisos</span>
        </button>

        {/* Tab 5: PERFIL */}
        <button 
          type="button"
          onClick={() => setActiveTab('perfil')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'perfil' ? 'text-brand-red font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <User size={18} className={activeTab === 'perfil' ? 'stroke-[2.5]' : 'stroke-[1.5]'} />
          <span className="text-[10px] uppercase tracking-wide mt-1 font-mono font-bold">Perfil</span>
        </button>
      </nav>

    </div>
  );
}
