import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Cpu, 
  Bell, 
  ShieldAlert, 
  Database, 
  LogOut, 
  UserPlus, 
  Search, 
  FileDown, 
  Trash2, 
  UserCheck, 
  UserX, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  AlertCircle,
  CheckCircle,
  Copy,
  ChevronRight,
  Sparkles,
  Wifi,
  X,
  Volume2,
  Upload,
  FileUp,
  Edit3,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { jsPDF } from 'jspdf';
import Papa from 'papaparse';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

import { WorkerUser, AssociationMember, RealTimeNotification, SupabaseConfig, ActivityLog } from './types';
import MobilePreview from './components/MobilePreview';
import SocioTemplate from './components/SocioTemplate';
import ScannerStage from './components/ScannerStage';
import WorkersPanel from './components/WorkersPanel';
import WorkerPortal from './components/WorkerPortal';
import DuplicateWarningModal from './components/DuplicateWarningModal';
import DashboardStats from './components/DashboardStats';

// ─── Snake_case → camelCase mappers ────────────────────────────────────────
const mapWorker = (w: any): WorkerUser => ({
  id: w.id,
  email: w.email,
  name: w.name,
  role: w.role,
  permissions: w.permissions ?? [],
  active: w.active,
  createdAt: w.created_at,
});

const mapMember = (m: any): AssociationMember => ({
  id: m.id,
  dniPassport: m.dni_passport,
  documentType: m.document_type,
  firstName: m.first_name,
  lastName: m.last_name,
  nationality: m.nationality,
  birthDate: m.birth_date,
  expiryDate: m.expiry_date,
  email: m.email ?? '',
  phone: m.phone ?? '',
  address: m.address ?? '',
  gender: m.gender,
  registrationStatus: m.registration_status ?? 'approved',
  registerDate: m.created_at,
  registeredBy: m.registered_by
    ? { id: m.registered_by.id, name: m.registered_by.name }
    : { id: m.registered_by_id ?? '', name: 'Desconocido' },
});

const mapNotification = (n: any): RealTimeNotification => ({
  id: n.id,
  title: n.title,
  message: n.message,
  timestamp: n.created_at ?? n.timestamp,
  senderName: n.sender_name ?? n.senderName ?? '',
  senderRole: n.sender_role ?? n.senderRole ?? 'worker',
  isPush: n.is_push ?? n.isPush ?? true,
  priority: n.priority,
});
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // Authentication & Session States
  const [workerSession, setWorkerSession] = useState<WorkerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Duplicate Document Warning Modal
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

  // Core Navigation Tabs
  // 'members' | 'scanner' | 'notifications' | 'workers'
  const [activeTab, setActiveTab] = useState<string>('members');

  // Application Data States
  const [members, setMembers] = useState<AssociationMember[]>([]);
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    supabaseUrl: '',
    supabaseAnonKey: '',
    isConnected: false
  });

  // UI Interactive States
  const [selectedMember, setSelectedMember] = useState<AssociationMember | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'DNI' | 'PASSPORT'>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);

  // Privacy Mode (Obfuscate DNI / Passport in public places)
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('laguna_privacy_mode') !== 'false';
  });
  const [revealedDniIds, setRevealedDniIds] = useState<Record<string, boolean>>({});

  const formatMaskedDni = (dni: string, isRevealed: boolean) => {
    if (isRevealed || !privacyMode) return dni;
    if (!dni) return '••••••';
    const clean = dni.trim();
    if (clean.length <= 4) return '••••••••';
    return `${clean.slice(0, 2)}••••${clean.slice(-2)}`;
  };

  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [csvProcessing, setCsvProcessing] = useState(false);
  const [csvResults, setCsvResults] = useState<{ importedCount: number; duplicateCount: number; errors: string[] } | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Form registration state
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formDniPassport, setFormDniPassport] = useState('');
  const [formDocType, setFormDocType] = useState<'DNI' | 'PASSPORT'>('DNI');
  const [formNationality, setFormNationality] = useState('ESPAÑOLA');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Push sender form state
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);

  // Supabase Sync Form state
  const [sbUrl, setSbUrl] = useState('');
  const [sbAnonKey, setSbAnonKey] = useState('');
  const [sbTesting, setSbTesting] = useState(false);
  const [sbError, setSbError] = useState<string | null>(null);
  const [sbSuccess, setSbSuccess] = useState<string | null>(null);

  // Live Toast Notifications queue for incoming push messages
  const [activeToast, setActiveToast] = useState<RealTimeNotification | null>(null);

  // ─── Supabase Auth Listener ──────────────────────────────────────────────
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: worker } = await supabase
          .from('workers')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (worker && worker.active) {
          setWorkerSession(mapWorker(worker));
        } else {
          setWorkerSession(null);
          setAuthError('Tu cuenta está pendiente de aprobación por un administrador.');
          await supabase.auth.signOut();
        }
      } else {
        setWorkerSession(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // ─── Supabase Data Fetch + Realtime Channels ─────────────────────────────
  useEffect(() => {
    if (!workerSession) return;

    const fetchData = async () => {
      const { data: membersData } = await supabase
        .from('members')
        .select('*, registered_by(*)')
        .order('created_at', { ascending: false });
      if (membersData) setMembers(membersData.map(mapMember));

      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (notifData) setNotifications(notifData.map(mapNotification));

      if (workerSession.role === 'admin') {
        const { data: workersData } = await supabase.from('workers').select('*');
        if (workersData) setWorkers(workersData.map(mapWorker));
      }
    };

    fetchData();
    setSseConnected(true);

    // Members channel — recarga completa en cualquier cambio
    const membersChannel = supabase
      .channel('public:members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        fetchData();
      })
      .subscribe();

    // Notifications channel — push incremental + toast + audio
    const notifChannel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const newNotif = mapNotification(payload.new);
        setNotifications(prev => [newNotif, ...prev]);
        setActiveToast(newNotif);

        // Trigger a beautiful audio cue
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 high pitch chirp
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
          // Audio context blocked/not supported, fail silently
        }

        // Auto remove toast after 6 seconds
        setTimeout(() => {
          setActiveToast(current => current?.id === newNotif.id ? null : current);
        }, 6000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(notifChannel);
      setSseConnected(false);
    };
  }, [workerSession]);

  // Real-time duplication check for DNI/Passport in local members list
  useEffect(() => {
    if (!formDniPassport.trim()) {
      if (formError && formError.includes('Socio ya registrado')) {
        setFormError(null);
      }
      return;
    }
    const cleanDoc = formDniPassport.trim().toUpperCase();
    const exists = members.some(m => m.dniPassport.trim().toUpperCase() === cleanDoc);
    if (exists) {
      setFormError(`Socio ya registrado: El DNI o Pasaporte "${cleanDoc}" ya se encuentra registrado en el sistema.`);
    } else {
      if (formError && formError.includes('Socio ya registrado')) {
        setFormError(null);
      }
    }
  }, [formDniPassport, members]);

  // AUTHENTICATION FLOWS
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) setAuthError('Credenciales incorrectas. Verifica tu email y contraseña.');
      // Si no hay error, onAuthStateChange se dispara y actualiza workerSession
    } else {
      // Registro: pasamos el nombre en metadata para que el Trigger SQL lo capture
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: { data: { name: authName } },
      });
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthSuccess('✅ Cuenta solicitada con éxito. Espera la aprobación del administrador antes de acceder.');
        setAuthMode('login');
        setAuthPassword('');
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange pondrá workerSession a null automáticamente
    setActiveTab('members');
    setShowScannerModal(false);
  };

  // OCR AUTOFILLED COMPLETION CALLBACK
  const handleScanCompleted = (result: any) => {
    setFormFirstName(result.firstName);
    setFormLastName(result.lastName);
    setFormDniPassport(result.dniPassport);
    setFormDocType(result.documentType);
    setFormNationality(result.nationality);
    setFormBirthDate(result.birthDate);
    setFormExpiryDate(result.expiryDate);
    setFormEmail(result.email || '');
    setFormPhone(result.phone || '');
    setFormAddress(result.address || '');
    
    // Check if scanned document already exists
    const scannedDoc = (result.dniPassport || '').trim().toUpperCase();
    const existing = members.find(m => m.dniPassport.toUpperCase() === scannedDoc);
    if (existing) {
      setDuplicateWarning({
        isOpen: true,
        documentNumber: scannedDoc,
        documentType: result.documentType || 'DNI',
        existingMember: existing
      });
      return;
    }

    setFormSuccess("✨ Campos rellenados automáticamente con inteligencia artificial. Revisa los datos antes de registrar.");
  };

  // DOCUMENT FORMAT VALIDATION (DNI, NIE, PASSPORT)
  const validateDocument = (doc: string, type: 'DNI' | 'PASSPORT'): { valid: boolean; error?: string } => {
    const cleanDoc = doc.trim().toUpperCase();
    if (!cleanDoc) {
      return { valid: false, error: "El documento no puede estar vacío." };
    }

    if (type === 'DNI') {
      // DNI o NIE español
      const dniRegex = /^[0-9]{8}[A-Z]$/;
      const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;

      if (dniRegex.test(cleanDoc)) {
        const number = parseInt(cleanDoc.slice(0, 8), 10);
        const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        const expectedLetter = letters[number % 23];
        if (cleanDoc.charAt(8) !== expectedLetter) {
          return { valid: false, error: `DNI incorrecto. La letra de control esperada es ${expectedLetter}.` };
        }
        return { valid: true };
      } else if (nieRegex.test(cleanDoc)) {
        let prefix = cleanDoc.charAt(0);
        let replacement = "0";
        if (prefix === "X") replacement = "0";
        else if (prefix === "Y") replacement = "1";
        else if (prefix === "Z") replacement = "2";

        const numberStr = replacement + cleanDoc.slice(1, 8);
        const number = parseInt(numberStr, 10);
        const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        const expectedLetter = letters[number % 23];
        if (cleanDoc.charAt(8) !== expectedLetter) {
          return { valid: false, error: `NIE incorrecto. La letra de control esperada es ${expectedLetter}.` };
        }
        return { valid: true };
      } else {
        return { valid: false, error: "Formato de DNI o NIE español inválido. Ejemplos - DNI: 12345678Z, NIE: X1234567M." };
      }
    } else {
      // Pasaporte europeo / internacional (6-12 caracteres alfanuméricos)
      const passportRegex = /^[A-Z0-9]{6,12}$/;
      if (!passportRegex.test(cleanDoc)) {
        return { valid: false, error: "Formato de pasaporte inválido. Debe tener entre 6 y 12 caracteres alfanuméricos." };
      }
      return { valid: true };
    }
  };

  // REGISTER MEMBER (ALTA SOCIO)
  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Check if duplicate DNI or Passport exists in local members state before DB submission
    const cleanDoc = formDniPassport.trim().toUpperCase();
    const existing = members.find(m => m.dniPassport.trim().toUpperCase() === cleanDoc);
    if (existing) {
      setDuplicateWarning({
        isOpen: true,
        documentNumber: cleanDoc,
        documentType: formDocType,
        existingMember: existing
      });
      return;
    }

    // Validate document format before DB submission
    const validation = validateDocument(formDniPassport, formDocType);
    if (!validation.valid) {
      setFormError(validation.error || "Formato de documento inválido.");
      return;
    }

    try {
      const { error } = await supabase.from('members').insert([{
        first_name: formFirstName,
        last_name: formLastName,
        dni_passport: formDniPassport,
        document_type: formDocType,
        nationality: formNationality,
        birth_date: formBirthDate,
        expiry_date: formExpiryDate || null,
        email: formEmail || null,
        phone: formPhone || null,
        address: formAddress || null,
        registration_status: 'approved',
        registered_by: workerSession!.id,
      }]).select().single();

      if (error) {
        // Unique constraint = documento duplicado en la DB
        if (error.code === '23505') {
          const dup = members.find(m => m.dniPassport.toUpperCase() === cleanDoc) ?? null;
          setDuplicateWarning({
            isOpen: true,
            documentNumber: cleanDoc,
            documentType: formDocType,
            existingMember: dup
          });
          return;
        }
        throw new Error(error.message);
      }

      setFormSuccess(`🎉 Socio ${formFirstName} ${formLastName} registrado con éxito.`);
      // Realtime actualizará la lista en todas las pestañas automáticamente

      // Reset form fields
      setFormFirstName('');
      setFormLastName('');
      setFormDniPassport('');
      setFormNationality('ESPAÑOLA');
      setFormBirthDate('');
      setFormExpiryDate('');
      setFormEmail('');
      setFormPhone('');
      setFormAddress('');

    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // DELETE SINGLE MEMBER
  const handleDeleteMember = async (id: string, skipConfirm = false) => {
    if (!skipConfirm && !confirm("¿Estás seguro de que deseas dar de baja este socio permanentemente?")) return;

    try {
      const res = await fetch(`/api/members/${id}?worker=${encodeURIComponent(JSON.stringify(workerSession))}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== id));
        setSelectedMemberIds(prev => prev.filter(mid => mid !== id));
        if (selectedMember && selectedMember.id === id) {
          setSelectedMember(null);
        }
        return true;
      }
    } catch (e) {
      console.error("Error al eliminar socio:", e);
    }
    return false;
  };

  // UPDATE SINGLE MEMBER (Workers & Admins)
  const handleUpdateMember = async (updatedMember: AssociationMember) => {
    try {
      const res = await fetch(`/api/members/${updatedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberData: updatedMember,
          worker: workerSession
        })
      });

      if (res.ok) {
        const saved: AssociationMember = await res.json();
        setMembers(prev => prev.map(m => m.id === saved.id ? saved : m));
        if (selectedMember && selectedMember.id === saved.id) {
          setSelectedMember(saved);
        }
        return true;
      }
    } catch (e) {
      console.error("Error al actualizar socio:", e);
    }
    return false;
  };

  // BULK ACTIONS
  const handleBulkAction = async (action: 'delete' | 'approve' | 'reject') => {
    if (selectedMemberIds.length === 0) return;
    const actionSpanish = action === 'delete' ? 'eliminar' : action === 'approve' ? 'aprobar' : 'rechazar';
    if (!confirm(`¿Deseas ${actionSpanish} de forma masiva los ${selectedMemberIds.length} registros seleccionados?`)) return;

    try {
      const res = await fetch('/api/members/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ids: selectedMemberIds,
          worker: workerSession
        })
      });

      if (res.ok) {
        if (action === 'delete') {
          setMembers(prev => prev.filter(m => !selectedMemberIds.includes(m.id)));
        } else {
          setMembers(prev => prev.map(m => {
            if (selectedMemberIds.includes(m.id)) {
              return { ...m, registrationStatus: action === 'approve' ? 'approved' : 'rejected' };
            }
            return m;
          }));
        }
        setSelectedMemberIds([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Export multiple member cards into a single consolidated PDF file
  const handleBulkExportPDF = () => {
    if (selectedMemberIds.length === 0) return;

    const selectedMembers = members.filter(m => selectedMemberIds.includes(m.id));
    if (selectedMembers.length === 0) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Colores corporativos (Verde Cannabis)
    const colorRed = [16, 185, 129]; // #10b981 (Cannabis Green)
    const colorDark = [8, 13, 10]; // #080d0a (brand-dark)
    const colorGray = [100, 116, 139]; // Slate gray para etiquetas

    selectedMembers.forEach((member, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // Dibujar cabecera decorativa
      doc.setFillColor(colorDark[0], colorDark[1], colorDark[2]);
      doc.rect(0, 0, 210, 40, 'F');

      // Línea de acento roja
      doc.setFillColor(colorRed[0], colorRed[1], colorRed[2]);
      doc.rect(0, 38, 210, 2, 'F');

      // Logo texto
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('LAGUNA VERDE', 20, 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text('SISTEMA INTEGRAL DE GESTIÓN DE ASOCIACIONES', 20, 30);

      // Estado del socio en esquina derecha superior
      const status = member.registrationStatus || 'pending';
      doc.setFillColor(status === 'approved' ? 16 : status === 'rejected' ? 220 : 217, status === 'approved' ? 185 : status === 'rejected' ? 38 : 119, status === 'approved' ? 129 : status === 'rejected' ? 38 : 6);
      doc.rect(150, 15, 40, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(status.toUpperCase(), 170, 21, { align: 'center' });

      // Cuerpo de la ficha
      doc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('FICHA OFICIAL DE SOCIO', 20, 55);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
      doc.text(`IDENTIFICADOR ÚNICO: #${member.id.toUpperCase()}`, 20, 61);

      // Marco para Foto / Escaneo
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, 70, 45, 55);
      doc.setFillColor(245, 247, 250);
      doc.rect(20, 70, 45, 55, 'F');
      
      // Texto dentro de la foto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('FOTO ESCANEO', 42.5, 95, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('DOCUMENTO ORIGINAL', 42.5, 100, { align: 'center' });

      // Grid de datos (a la derecha de la foto)
      const startX = 75;
      let currentY = 76;
      const rowHeight = 12;

      const drawDataField = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
        doc.text(label.toUpperCase(), startX, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
        doc.text(value || 'N/D', startX, currentY + 5);

        currentY += rowHeight;
      };

      drawDataField('Apellidos / Surnames', member.lastName);
      drawDataField('Nombre / Given Names', member.firstName);
      drawDataField(`${member.documentType} / ID Number`, member.dniPassport);
      drawDataField('Nacionalidad / Nationality', member.nationality);

      // Segunda columna o continuación debajo de la foto
      currentY = 140;
      doc.setDrawColor(220, 220, 220);
      doc.line(20, currentY - 5, 190, currentY - 5);

      const drawDataFieldWide = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
        doc.text(label.toUpperCase(), 20, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
        doc.text(value || 'N/D', 20, currentY + 5);

        currentY += rowHeight;
      };

      drawDataFieldWide('Fecha de Nacimiento / Birth Date', member.birthDate);
      drawDataFieldWide('Validez del Documento / Expiry Date', member.expiryDate || 'PERMANENTE');
      drawDataFieldWide('Correo Electrónico / Email Address', member.email || 'No proporcionado');
      drawDataFieldWide('Número de Teléfono / Phone Number', member.phone || 'No proporcionado');
      drawDataFieldWide('Dirección de Residencia / Physical Address', member.address || 'No proporcionado');

      // Pie de página decorativo
      currentY = 220;
      doc.setDrawColor(220, 220, 220);
      doc.line(20, currentY - 5, 190, currentY - 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
      doc.text('AUDITORÍA DE REGISTRO', 20, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Registrado por: ${member.registeredBy.name} (ID: ${member.registeredBy.id})`, 20, currentY + 5);
      doc.text(`Fecha de Alta: ${new Date(member.registerDate).toLocaleString()}`, 20, currentY + 10);
    });

    doc.save(`fichas_socios_seleccionados_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleSelectAll = () => {
    if (selectedMemberIds.length === filteredMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map(m => m.id));
    }
  };

  const handleSelectMemberId = (id: string) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(mid => mid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // BROADCAST NOTIFICATION
  const handleSendNotification = async (title: string, msg: string) => {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message: msg,
          worker: workerSession
        })
      });

      if (response.ok) {
        const data = await response.json();
        // The SSE trigger will update other browser tabs, let's update this tab instantly
        setNotifications(prev => [data, ...prev]);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const handleMainSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setPushError(null);
    setPushSuccess(null);

    const success = await handleSendNotification(pushTitle, pushMessage);
    if (success) {
      setPushSuccess("🚀 Alerta push enviada y distribuida en tiempo real a todas las terminales.");
      setPushTitle('');
      setPushMessage('');
    } else {
      setPushError("Error al emitir la alerta en el servidor.");
    }
  };

  // SUPABASE CONFIG SAVING
  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSbError(null);
    setSbSuccess(null);
    setSbTesting(true);

    try {
      // Direct client-side validation attempt before saving
      if (sbUrl && sbAnonKey) {
        const client = createClient(sbUrl, sbAnonKey);
        // Quick query to test credentials validity
        const { error } = await client.from('members_sasori').select('count', { count: 'exact', head: true });
        // Even if table doesn't exist, as long as it's not a connection credential failure, we count it as valid
        if (error && error.message.includes('apiKey')) {
          throw new Error("Parámetros de clave Anon incorrectos.");
        }
      }

      const res = await fetch('/api/supabase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseUrl: sbUrl,
          supabaseAnonKey: sbAnonKey,
          isConnected: !!(sbUrl && sbAnonKey),
          worker: workerSession
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSupabaseConfig(data);
        setSbSuccess("⚡ Conectado con éxito a Supabase-js. Todas las altas se sincronizarán en tiempo real.");
      } else {
        throw new Error("El servidor no pudo procesar los ajustes de la base de datos.");
      }

    } catch (err: any) {
      setSbError(err.message || "Fallo en la prueba de conexión a Supabase. Comprueba las URLs.");
    } finally {
      setSbTesting(false);
    }
  };

  // EXPORT ALL TO CSV (SOCIOS DIRECTORY EXPORT)
  const handleExportAllCSV = () => {
    if (members.length === 0) return;
    const headers = ['ID', 'Tipo Doc', 'Documento', 'Nombre', 'Apellidos', 'Nacionalidad', 'F. Nacimiento', 'Validez', 'Email', 'Telefono', 'Direccion', 'Estado', 'F. Alta'];
    const rows = members.map(m => [
      m.id,
      m.documentType,
      m.dniPassport,
      m.firstName,
      m.lastName,
      m.nationality,
      m.birthDate,
      m.expiryDate,
      m.email,
      m.phone,
      m.address,
      m.registrationStatus,
      m.registerDate
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.map(h => `"${h}"`).join(','), ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `registro_socios_completo_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import and parsing function
  const handleImportCSV = () => {
    if (!csvFile) {
      setCsvError("Por favor, selecciona un archivo CSV primero.");
      return;
    }

    setCsvProcessing(true);
    setCsvError(null);
    setCsvSuccess(null);
    setCsvResults(null);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data;
        if (!parsedData || parsedData.length === 0) {
          setCsvError("El archivo CSV no contiene datos válidos o está vacío.");
          setCsvProcessing(false);
          return;
        }

        try {
          const res = await fetch('/api/members/bulk-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              membersList: parsedData,
              worker: workerSession
            })
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Error al procesar la importación masiva.");
          }

          const responseData = await res.json();
          const { imported, duplicates, errors } = responseData;

          // Update local state with newly imported members
          if (imported && imported.length > 0) {
            setMembers(prev => [...prev, ...imported]);

            // Attempt Supabase Sync if connected
            if (supabaseConfig.isConnected && supabaseConfig.supabaseUrl && supabaseConfig.supabaseAnonKey) {
              try {
                const supabase = createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseAnonKey);
                const syncRecords = imported.map((data: any) => ({
                  id_socio: data.id,
                  dni_passport: data.dniPassport,
                  doc_type: data.documentType,
                  first_name: data.firstName,
                  last_name: data.lastName,
                  nationality: data.nationality,
                  birth_date: data.birthDate,
                  expiry_date: data.expiryDate,
                  email: data.email,
                  phone: data.phone,
                  address: data.address,
                  register_date: data.registerDate,
                  registered_by: data.registeredBy.name
                }));
                await supabase.from('members_sasori').insert(syncRecords);
              } catch (e) {
                console.warn("Real-time Supabase sync failed during bulk import: ", e);
              }
            }
          }

          setCsvResults({
            importedCount: imported ? imported.length : 0,
            duplicateCount: duplicates ? duplicates.length : 0,
            errors: errors || []
          });

          setCsvSuccess(`¡Proceso completado! Se han registrado ${imported ? imported.length : 0} socios con éxito.`);
          setCsvFile(null);
        } catch (err: any) {
          setCsvError(err.message || "Fallo al enviar datos del lote al servidor.");
        } finally {
          setCsvProcessing(false);
        }
      },
      error: (err) => {
        setCsvError(`Fallo al parsear el archivo CSV: ${err.message}`);
        setCsvProcessing(false);
      }
    });
  };

  // ADMIN OPERATIONS FOR OTHER WORKERS
  const handleUpdateWorker = async (id: string, updatedFields: Partial<WorkerUser>) => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .update({
          role: updatedFields.role,
          active: updatedFields.active,
          permissions: updatedFields.permissions,
          name: updatedFields.name
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error actualizando trabajador en Supabase:", error.message);
        return;
      }

      // Actualizar el estado local en pantalla al instante
      setWorkers(prev => prev.map(w => w.id === id ? { ...w, ...mapWorker(data) } : w));
    } catch (err) {
      console.error("Error en la conexión a Supabase:", err);
    }
  };

  const handleDeleteWorker = async (id: string) => {
    if (!confirm("¿Deseas desvincular a este trabajador de la asociación permanentemente?")) return;

    try {
      const res = await fetch(`/api/workers/${id}?adminWorker=${JSON.stringify(workerSession)}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setWorkers(prev => prev.filter(w => w.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefreshLogs = async () => {
    const resLogs = await fetch('/api/activity-logs');
    if (resLogs.ok) {
      const data = await resLogs.json();
      setActivityLogs(data);
    }
  };

  // Generate daily registration data for Recharts
  const getChartData = () => {
    const counts: { [date: string]: number } = {};
    members.forEach(m => {
      try {
        const dateStr = new Date(m.registerDate).toISOString().slice(0, 10);
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      } catch (e) {
        const fallbackDate = m.registerDate ? m.registerDate.slice(0, 10) : 'N/D';
        counts[fallbackDate] = (counts[fallbackDate] || 0) + 1;
      }
    });

    return Object.keys(counts)
      .sort()
      .map(date => ({
        date,
        registros: counts[date]
      }));
  };

  // Filters calculation
  const filteredMembers = members.filter(m => {
    const matchSearch = 
      m.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.dniPassport.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'all' || m.registrationStatus === statusFilter;
    const matchDocType = docTypeFilter === 'all' || m.documentType === docTypeFilter;

    let matchDateRange = true;
    if (startDateFilter || endDateFilter) {
      const regDate = new Date(m.registerDate);
      if (startDateFilter) {
        const start = new Date(startDateFilter);
        start.setHours(0, 0, 0, 0);
        if (regDate < start) matchDateRange = false;
      }
      if (endDateFilter) {
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        if (regDate > end) matchDateRange = false;
      }
    }

    return matchSearch && matchStatus && matchDocType && matchDateRange;
  });

  // Loading screen — evita el flash de login mientras Supabase inicializa la sesión
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-brand-red border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-gray-500 tracking-widest uppercase">Iniciando sistema...</p>
      </div>
    );
  }

  // Login view out of session
  if (!workerSession) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4 selection:bg-brand-red selection:text-white">
        
        {/* Glowing backdrop circle */}
        <div className="absolute w-[450px] h-[450px] bg-brand-red/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-panel-dark border border-border-dark rounded-3xl p-8 relative overflow-hidden shadow-2xl z-10">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-red to-transparent"></div>

          {/* Logo Brand Title */}
          <div className="text-center mb-8">
            <span className="text-[10px] font-mono text-brand-red font-extrabold tracking-widest uppercase">
              LAGUNA VERDE ADMIN
            </span>
            <h1 className="text-3xl font-display font-black text-white mt-1 uppercase tracking-tight">
              Portal de Asociación
            </h1>
            <p className="text-xs text-gray-400 mt-2">
              SISTEMA INTEGRAL DE ACCESO Y GESTIÓN DE PERSONAL
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4.5">
            {authMode === 'register' && (
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="text-gray-400 font-bold uppercase font-mono tracking-wider">Nombre Completo</label>
                <input 
                  type="text" 
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="h-11 bg-brand-dark/80 text-gray-200 placeholder-gray-600 border border-border-dark rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-brand-red transition-all"
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-gray-400 font-bold uppercase font-mono tracking-wider">Usuario (Email)</label>
              <input 
                type="email" 
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                placeholder="Ej. worker@lagunaverde.es"
                className="h-11 bg-brand-dark/80 text-gray-200 placeholder-gray-600 border border-border-dark rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-brand-red transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between items-center">
                <label className="text-gray-400 font-bold uppercase font-mono tracking-wider">Contraseña</label>
                {authMode === 'login' && (
                  <span className="text-[10px] text-gray-500 font-semibold cursor-help" title="Demo Admin: admin / Demo Worker: worker">
                    ¿Credenciales demo?
                  </span>
                )}
              </div>
              <input 
                type="password" 
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 bg-brand-dark/80 text-gray-200 placeholder-gray-600 border border-border-dark rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-brand-red transition-all"
                required
              />
            </div>

            {/* Submit button with brand-red primary accent */}
            <button 
              type="submit" 
              className="h-11 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold text-sm tracking-wide uppercase transition-all shadow-lg shadow-brand-red/10 border border-brand-red/20 hover:border-brand-red mt-2"
            >
              {authMode === 'login' ? 'Iniciar Sesión' : 'Registrar Cuenta'}
            </button>
          </form>

          {/* Feedback alerts */}
          {authError && (
            <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-medium flex gap-2 items-center">
              <AlertCircle size={14} className="shrink-0" />
              <p>{authError}</p>
            </div>
          )}

          {authSuccess && (
            <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-medium flex gap-2 items-center">
              <CheckCircle size={14} className="shrink-0" />
              <p>{authSuccess}</p>
            </div>
          )}

          {/* Switch Register / Login Mode */}
          <div className="mt-6 border-t border-border-dark/60 pt-5 text-center">
            <button 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError(null);
                setAuthSuccess(null);
              }}
              className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              {authMode === 'login' 
                ? '¿Eres nuevo trabajador? Solicita tu cuenta' 
                : '¿Ya tienes una cuenta aprobada? Accede'}
            </button>
          </div>

        </div>

        {/* Demo Fast Login helpers in footer */}
        <div className="mt-6 text-center text-[11px] text-gray-600 font-mono flex flex-col gap-1.5">
          <p>🔧 CUENTAS DEMO EXPRESS (Para pruebas directas):</p>
          <p>
            ADMIN: <span className="text-gray-400">admin@lagunaverde.es</span> (Clave: <span className="text-gray-400">admin</span> o <span className="text-gray-400">laguna123</span>)
          </p>
          <p>
            WORKER: <span className="text-gray-400">worker@lagunaverde.es</span> (Clave: <span className="text-gray-400">worker</span> o <span className="text-gray-400">laguna123</span>)
          </p>
        </div>

      </div>
    );
  }

  // WORKER PORTAL VIEW (STRICT NON-ADMIN SECURITY: ADMIN DASHBOARD NEVER VISIBLE)
  if (workerSession.role !== 'admin') {
    return (
      <>
        <WorkerPortal 
          activeWorker={workerSession}
          members={members}
          onSelectMember={(member) => setSelectedMember(member)}
          onMemberRegistered={(newMember) => setMembers(prev => [...prev, newMember])}
          onLogout={handleLogout}
          notifications={notifications}
          onSendNotification={handleSendNotification}
          realtimeConnected={sseConnected}
          onUpdateMember={handleUpdateMember}
          onDeleteMember={handleDeleteMember}
        />

        {/* Member Detail certificate modal */}
        {selectedMember && (
          <SocioTemplate 
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
            currentWorker={workerSession}
          />
        )}
      </>
    );
  }

  // LOGGED IN ADMIN APP VIEW
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col relative text-gray-200 overflow-x-hidden selection:bg-brand-red selection:text-white">
      
      {/* ======================================================== */}
      {/* TOP HEADER NAVIGATION BAR */}
      {/* ======================================================== */}
      <header className="h-16 border-b border-border-dark bg-panel-dark/80 backdrop-blur-md px-6 flex items-center justify-between z-40 sticky top-0 no-print">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center font-display font-black text-white text-xs tracking-wider shadow-lg shadow-emerald-500/20">
            LV
          </div>
          <div>
            <h1 className="text-sm font-display font-black text-white leading-none tracking-wider uppercase">
              Laguna Verde
            </h1>
            <p className="text-[9px] font-mono text-gray-500 font-bold tracking-widest mt-0.5">
              ASSOCIATION PANEL
            </p>
          </div>
        </div>

        {/* Desktop navigation tabs selectors */}
        <nav className="hidden lg:flex items-center gap-1 bg-brand-dark/80 p-1 border border-border-dark rounded-xl text-xs font-semibold">
          <button 
            onClick={() => setActiveTab('members')}
            className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'members' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={13} /> Socios
          </button>

          <button 
            onClick={() => setActiveTab('scanner')}
            className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'scanner' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Cpu size={13} /> Registro Express
          </button>

          <button 
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'notifications' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bell size={13} /> Alertas Push
          </button>

          {workerSession.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('workers')}
              className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'workers' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShieldAlert size={13} /> Personal & Auditoría
            </button>
          )}
        </nav>

        {/* Header Right elements */}
        <div className="flex items-center gap-4">
          
          {/* SSE Live Connection Badge */}
          <div className="flex items-center gap-1.5 bg-brand-dark px-2.5 py-1 rounded-lg border border-border-dark">
            <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`}></span>
            <span className="text-[9px] font-mono font-bold tracking-wider text-gray-400 uppercase">
              {sseConnected ? 'Realtime' : 'Desconectado'}
            </span>
          </div>

          {/* Notifications Bell */}
          <button 
            onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
            className="relative p-2 text-gray-400 hover:text-white bg-brand-dark hover:bg-brand-dark/80 rounded-xl border border-border-dark transition-all"
            title="Historial de Notificaciones"
          >
            <Bell size={15} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-brand-dark animate-bounce">
                {notifications.length}
              </span>
            )}
          </button>

          {/* User profile details badge */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-border-dark/60">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white leading-none">{workerSession.name}</p>
              <p className="text-[10px] font-mono text-gray-500 uppercase font-semibold mt-1">
                {workerSession.role}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-brand-red bg-brand-dark hover:bg-brand-red/10 rounded-xl border border-border-dark hover:border-brand-red/20 transition-all"
              title="Cerrar Sesión"
            >
              <LogOut size={15} />
            </button>
          </div>

        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN LAYOUT: FULL RESPONSIVE ADMIN DASHBOARD */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col items-stretch overflow-y-auto">
        
        {/* Mobile Navigation bar for smaller screens */}
        <div className="lg:hidden flex justify-around border-b border-border-dark bg-panel-dark/90 p-2 text-xs no-print">
          <button 
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-2 text-center font-bold uppercase ${activeTab === 'members' ? 'text-brand-red' : 'text-gray-400'}`}
          >
            Socios
          </button>
          <button 
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 py-2 text-center font-bold uppercase ${activeTab === 'scanner' ? 'text-brand-red' : 'text-gray-400'}`}
          >
            Scanner
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-2 text-center font-bold uppercase ${activeTab === 'notifications' ? 'text-brand-red' : 'text-gray-400'}`}
          >
            Push
          </button>
        </div>

        {/* PRIMARY ACTIVE WORKSPACE: Full-width responsive on laptop and desktop */}
        <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 print:p-0">
          
          {/* ========================================== */}
          {/* TAB 1: SOCIOS DIRECTORY & LISTS */}
          {/* ========================================== */}
          {activeTab === 'members' && (
            <div className="flex flex-col gap-6">
              
              {/* Table controls */}
              <div className="bg-panel-dark border border-border-dark rounded-3xl p-6 relative overflow-hidden no-print">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-red"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-display font-bold text-white uppercase tracking-wider">
                      Directorio de Miembros
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Gestiona, aprueba, consulta y exporta fichas oficiales de la asociación
                    </p>
                  </div>
                  
                  {/* General actions */}
                  <div className="flex gap-2.5 flex-wrap">
                    <button 
                      onClick={() => {
                        const next = !privacyMode;
                        setPrivacyMode(next);
                        localStorage.setItem('laguna_privacy_mode', String(next));
                      }}
                      className={`h-10 px-3.5 border rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        privacyMode 
                          ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:border-emerald-400 shadow-sm' 
                          : 'bg-gray-900 border-border-dark text-gray-400 hover:text-white'
                      }`}
                      title="Ocultar o mostrar DNIs de socios para proteger la privacidad en lugares públicos"
                    >
                      {privacyMode ? <EyeOff size={14} className="text-emerald-400" /> : <Eye size={14} />}
                      <span>Privacidad DNI: {privacyMode ? 'Ofuscado' : 'Visible'}</span>
                    </button>
                    <button 
                      onClick={() => {
                        setShowImportModal(true);
                        setCsvError(null);
                        setCsvSuccess(null);
                        setCsvResults(null);
                        setCsvFile(null);
                      }}
                      className="h-10 px-4 bg-gray-900 border border-border-dark hover:border-brand-red hover:text-white rounded-xl text-gray-300 font-bold text-xs flex items-center gap-2 transition-all"
                    >
                      <Upload size={14} /> Importar CSV (Socios)
                    </button>
                    <button 
                      onClick={handleExportAllCSV}
                      disabled={members.length === 0}
                      className="h-10 px-4 bg-gray-900 border border-border-dark hover:border-brand-red hover:text-white rounded-xl text-gray-300 font-bold text-xs flex items-center gap-2 transition-all"
                    >
                      <FileDown size={14} /> Exportar CSV Completo
                    </button>
                    <button 
                      onClick={() => setActiveTab('scanner')}
                      className="h-10 px-4 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg glow-border transition-all"
                    >
                      <UserPlus size={14} /> Registrar Socio Nuevo
                    </button>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-6 border-t border-border-dark/60 pt-5">
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre, DNI, ID..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full h-10 bg-brand-dark text-gray-200 placeholder-gray-500 border border-border-dark rounded-xl pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-brand-red transition-all"
                    />
                    <Search size={14} className="absolute left-3.5 top-3 text-gray-500" />
                  </div>

                  {/* Filter Status */}
                  <div>
                    <select 
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as any)}
                      className="w-full h-10 bg-brand-dark text-gray-300 border border-border-dark rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-brand-red w-full"
                    >
                      <option value="all">Todos los Estados</option>
                      <option value="approved">Aprobados</option>
                      <option value="pending">Pendientes</option>
                      <option value="rejected">Rechazados</option>
                    </select>
                  </div>

                  {/* Filter Doc Type */}
                  <div>
                    <select 
                      value={docTypeFilter}
                      onChange={e => setDocTypeFilter(e.target.value as any)}
                      className="w-full h-10 bg-brand-dark text-gray-300 border border-border-dark rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-brand-red w-full"
                    >
                      <option value="all">Cualquier Documento</option>
                      <option value="DNI">DNI Español</option>
                      <option value="PASSPORT">Pasaporte Europeo</option>
                    </select>
                  </div>

                  {/* Filter Start Date */}
                  <div className="relative">
                    <input 
                      type="date"
                      value={startDateFilter}
                      onChange={e => setStartDateFilter(e.target.value)}
                      placeholder="Fecha Inicio"
                      className="w-full h-10 bg-brand-dark text-gray-300 border border-border-dark rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-brand-red"
                      title="Fecha de Inicio"
                    />
                  </div>

                  {/* Filter End Date */}
                  <div className="relative flex items-center gap-2">
                    <input 
                      type="date"
                      value={endDateFilter}
                      onChange={e => setEndDateFilter(e.target.value)}
                      placeholder="Fecha Fin"
                      className="w-full h-10 bg-brand-dark text-gray-300 border border-border-dark rounded-xl px-3 text-xs font-semibold focus:outline-none focus:border-brand-red"
                      title="Fecha de Fin"
                    />
                    {(startDateFilter || endDateFilter) && (
                      <button 
                        onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                        className="p-2 text-gray-400 hover:text-brand-red bg-brand-dark hover:bg-brand-red/10 border border-border-dark hover:border-brand-red/20 rounded-xl transition-all shrink-0"
                        title="Limpiar fechas"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bulk Actions Bar if elements selected */}
                {selectedMemberIds.length > 0 && (
                  <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-brand-dark/40 border border-brand-red/10 rounded-2xl p-4 transition-all">
                    <div className="text-xs text-gray-400 font-mono">
                      Seleccionados: <span className="text-brand-red font-bold">{selectedMemberIds.length}</span> miembros
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button 
                        onClick={handleBulkExportPDF}
                        className="px-4 py-1.5 bg-brand-red text-white hover:bg-brand-red-hover rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all shadow-md shadow-brand-red/10 border border-brand-red/20"
                      >
                        <FileDown size={13} /> Exportar Fichas a PDF
                      </button>
                      <button 
                        onClick={() => handleBulkAction('approve')}
                        className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all"
                      >
                        <UserCheck size={13} /> Aprobar
                      </button>
                      <button 
                        onClick={() => handleBulkAction('reject')}
                        className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all"
                      >
                        <UserX size={13} /> Rechazar
                      </button>
                      <button 
                        onClick={() => handleBulkAction('delete')}
                        className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all"
                      >
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================== */}
              {/* ADMIN ONLY: DASHBOARD STATS (RECHARTS)     */}
              {/* ========================================== */}
              {workerSession?.role === 'admin' && (
                <DashboardStats members={members} />
              )}

              {/* Members Grid directory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMembers.length === 0 ? (
                  <div className="col-span-2 bg-panel-dark border border-border-dark rounded-3xl p-10 text-center text-gray-400 font-medium">
                    Ningún socio coincide con los filtros especificados.
                  </div>
                ) : (
                  filteredMembers.map(member => (
                    <div 
                      key={member.id}
                      className="bg-panel-dark border border-border-dark hover:border-brand-red/30 rounded-3xl p-5 flex flex-col justify-between shadow-md relative group transition-all duration-300"
                    >
                      {/* Checkbox selector for bulk actions */}
                      <div className="absolute top-4 left-4 z-10 no-print">
                        <input 
                          type="checkbox"
                          checked={selectedMemberIds.includes(member.id)}
                          onChange={() => handleSelectMemberId(member.id)}
                          className="w-4 h-4 bg-brand-dark rounded border-border-dark accent-brand-red"
                        />
                      </div>

                      {/* Header row with details */}
                      <div className="flex justify-between items-start pl-6 border-b border-border-dark/60 pb-3 mb-3">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest leading-none">
                            ID: #{member.id.toUpperCase()}
                          </span>
                          <h4 className="text-sm font-display font-extrabold text-white mt-1 group-hover:text-brand-red transition-all">
                            {member.lastName}, {member.firstName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] bg-gray-900 border border-border-dark px-2 py-0.5 rounded-lg font-mono text-gray-300 font-semibold tracking-wider inline-flex items-center gap-1">
                              <span className="text-emerald-400 font-bold">{member.documentType}:</span>
                              <span className={privacyMode && !revealedDniIds[member.id] ? 'tracking-widest font-mono text-emerald-300/90 font-bold' : 'font-mono text-gray-200'}>
                                {formatMaskedDni(member.dniPassport, !!revealedDniIds[member.id])}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRevealedDniIds(prev => ({ ...prev, [member.id]: !prev[member.id] }));
                              }}
                              className="p-1 text-gray-400 hover:text-emerald-400 bg-brand-dark/80 hover:bg-emerald-950/40 border border-border-dark hover:border-emerald-500/40 rounded-lg transition-colors"
                              title={revealedDniIds[member.id] || !privacyMode ? "Ocultar documento" : "Mostrar documento"}
                            >
                              {revealedDniIds[member.id] || !privacyMode ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                          </div>
                        </div>
                        
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          member.registrationStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                          member.registrationStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                        }`}>
                          {member.registrationStatus === 'approved' ? 'Aprobado' :
                           member.registrationStatus === 'pending' ? 'Pendiente' : 'Rechazado'}
                        </span>
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[11px] text-gray-400 pb-4">
                        <div className="flex items-center gap-1.5">
                          <Globe size={11} className="text-brand-red" />
                          <span className="truncate">{member.nationality}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail size={11} className="text-brand-red shrink-0" />
                          <span className="truncate">{member.email || 'N/D'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} className="text-brand-red" />
                          <span className="truncate">{member.phone || 'N/D'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={11} className="text-brand-red shrink-0" />
                          <span className="truncate">{member.address || 'N/D'}</span>
                        </div>
                      </div>

                      {/* Controls row */}
                      <div className="flex items-center justify-between border-t border-border-dark/60 pt-3 mt-1 no-print">
                        <div className="text-[10px] text-gray-500">
                          Alta: {new Date(member.registerDate).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleDeleteMember(member.id)}
                            className="p-1.5 bg-gray-900 hover:bg-rose-500/15 text-gray-400 hover:text-rose-400 rounded-lg border border-border-dark hover:border-rose-500/20 transition-all"
                            title="Eliminar Socio"
                          >
                            <Trash2 size={12} />
                          </button>
                          <button 
                            onClick={() => setSelectedMember(member)}
                            className="px-2.5 py-1 bg-gray-900 border border-border-dark hover:border-brand-red hover:text-white rounded-lg text-[11px] font-bold text-gray-300 transition-all flex items-center gap-1"
                            title="Editar Información"
                          >
                            <Edit3 size={11} />
                            <span>Editar</span>
                          </button>
                          <button 
                            onClick={() => setSelectedMember(member)}
                            className="px-3 py-1 bg-brand-dark border border-border-dark hover:border-brand-red hover:text-white rounded-lg text-[11px] font-bold text-gray-300 transition-all flex items-center gap-1"
                          >
                            <span>Ficha</span> <ChevronRight size={10} />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: REGISTER EXPRESS WITH AI OCR */}
          {/* ========================================== */}
          {activeTab === 'scanner' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left OCR Scan control stage */}
              <div className="lg:col-span-5">
                <ScannerStage 
                  onScanCompleted={handleScanCompleted}
                  workerSession={workerSession}
                />
              </div>

              {/* Right Manual and Autocomplete Registration Form */}
              <div className="lg:col-span-7 bg-panel-dark border border-border-dark rounded-3xl p-6 relative">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-display font-bold text-gray-200 uppercase tracking-wider">
                      Formulario de Alta de Socios
                    </h4>
                    <p className="text-xs text-gray-400">
                      Rellena manualmente o utiliza el escáner óptico de la izquierda
                    </p>
                  </div>
                </div>

                <form onSubmit={handleRegisterMember} className="grid grid-cols-2 gap-4 text-xs">
                  
                  {/* First Name */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[10px]">Nombre</label>
                    <input 
                      type="text" 
                      value={formFirstName}
                      onChange={e => setFormFirstName(e.target.value)}
                      placeholder="CARLOS"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold uppercase placeholder:normal-case"
                      required
                    />
                  </div>

                  {/* Last Name */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[10px]">Apellidos</label>
                    <input 
                      type="text" 
                      value={formLastName}
                      onChange={e => setFormLastName(e.target.value)}
                      placeholder="SANCHEZ GOMEZ"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold uppercase placeholder:normal-case"
                      required
                    />
                  </div>

                  {/* Document identifier */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[10px]">Número Documento</label>
                    <input 
                      type="text" 
                      value={formDniPassport}
                      onChange={e => setFormDniPassport(e.target.value)}
                      placeholder="12345678Z o EM9876543"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-mono font-bold uppercase"
                      required
                    />
                  </div>

                  {/* Document Type Selection */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[10px]">Tipo de Documento</label>
                    <select 
                      value={formDocType}
                      onChange={e => setFormDocType(e.target.value as any)}
                      className="h-10 bg-brand-dark text-gray-300 border border-border-dark rounded-xl px-3 focus:outline-none focus:border-brand-red font-semibold"
                    >
                      <option value="DNI">DNI Español</option>
                      <option value="PASSPORT">Pasaporte Europeo</option>
                    </select>
                  </div>

                  {/* Nationality */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[10px]">Nacionalidad</label>
                    <input 
                      type="text" 
                      value={formNationality}
                      onChange={e => setFormNationality(e.target.value)}
                      placeholder="ESPAÑOLA"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold uppercase"
                      required
                    />
                  </div>

                  {/* Birth Date */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[10px]">Fecha Nacimiento</label>
                    <input 
                      type="date" 
                      value={formBirthDate}
                      onChange={e => setFormBirthDate(e.target.value)}
                      className="h-10 bg-brand-dark text-gray-300 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold"
                      required
                    />
                  </div>

                  {/* Expiry Date */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[10px]">Vencimiento Documento</label>
                    <input 
                      type="date" 
                      value={formExpiryDate}
                      onChange={e => setFormExpiryDate(e.target.value)}
                      className="h-10 bg-brand-dark text-gray-300 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold"
                      required
                    />
                  </div>

                  {/* Contact Email */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[10px]">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="carlos.sanchez@email.com"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[10px]">Número Teléfono</label>
                    <input 
                      type="text" 
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="+34 654 987 123"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold"
                    />
                  </div>

                  {/* Address */}
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[10px]">Dirección de Residencia</label>
                    <input 
                      type="text" 
                      value={formAddress}
                      onChange={e => setFormAddress(e.target.value)}
                      placeholder="Calle Gran Vía, 22, Piso 4º Izq, Madrid, España"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold"
                    />
                  </div>

                  <div className="col-span-2 mt-4">
                    <button 
                      type="submit" 
                      className="w-full h-11 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg shadow-brand-red/10 border border-brand-red/20 flex items-center justify-center gap-2"
                    >
                      <UserCheck size={16} /> REGISTRAR SOCIO OFICIALMENTE
                    </button>
                  </div>

                </form>

                {/* Form feedback */}
                {formError && (
                  <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <p>{formError}</p>
                  </div>
                )}

                {formSuccess && (
                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-start gap-2">
                    <CheckCircle size={14} className="shrink-0 mt-0.5" />
                    <p>{formSuccess}</p>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: NOTIFICACIONES PUSH CREATOR */}
          {/* ========================================== */}
          {activeTab === 'notifications' && (
            <div className="w-full max-w-2xl mx-auto bg-panel-dark border border-border-dark rounded-3xl p-8 relative">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-red to-transparent"></div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
                  <Bell size={20} className="animate-bounce" />
                </div>
                <div>
                  <h4 className="text-base font-display font-bold text-gray-200 uppercase tracking-wider">
                    Emisor de Alertas en Tiempo Real
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Envía notificaciones push instantáneas a todos los trabajadores conectados
                  </p>
                </div>
              </div>

              <form onSubmit={handleMainSendPush} className="flex flex-col gap-4 text-xs">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400 font-bold uppercase font-mono tracking-wider">Título de la Alerta</label>
                  <input 
                    type="text" 
                    value={pushTitle}
                    onChange={e => setPushTitle(e.target.value)}
                    placeholder="Ej. Incidencia en Acceso o Reunión General"
                    className="h-11 bg-brand-dark text-gray-200 placeholder-gray-600 border border-border-dark rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-brand-red transition-all"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400 font-bold uppercase font-mono tracking-wider">Mensaje (Cuerpo)</label>
                  <textarea 
                    value={pushMessage}
                    onChange={e => setPushMessage(e.target.value)}
                    placeholder="Escribe los detalles de la notificación que llegará en tiempo real a las pantallas..."
                    className="h-28 p-4 bg-brand-dark text-gray-200 placeholder-gray-600 border border-border-dark rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-red transition-all resize-none"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="h-11 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg shadow-brand-red/10 border border-brand-red/20 hover:border-brand-red flex items-center justify-center gap-2 mt-2"
                >
                  <Bell size={16} /> EMITIR ALERTA PUSH INMEDIATA
                </button>

              </form>

              {pushError && (
                <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p>{pushError}</p>
                </div>
              )}

              {pushSuccess && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-start gap-2">
                  <CheckCircle size={14} className="shrink-0 mt-0.5" />
                  <p>{pushSuccess}</p>
                </div>
              )}

              <div className="mt-6 border-t border-border-dark/60 pt-5 text-gray-500 text-[11px] flex gap-2 items-start leading-relaxed font-mono">
                <Volume2 size={14} className="shrink-0 mt-0.5 text-gray-600" />
                <p>Las alertas enviadas generan un sonido acústico (chirp) de aviso acústico y despliegan una tarjeta de notificación flotante animada de alta prioridad en todas las pantallas activas mediante Server-Sent Events.</p>
              </div>

            </div>
          )}

          {/* ========================================== */}
          {/* TAB 4: PERSONAL MANAGEMENT & PERMISSIONS (ADMIN) */}
          {/* ========================================== */}
          {activeTab === 'workers' && workerSession.role === 'admin' && (
            <WorkersPanel 
              adminWorker={workerSession}
              workers={workers}
              onUpdateWorker={handleUpdateWorker}
              onDeleteWorker={handleDeleteWorker}
              logs={activityLogs}
              onRefreshLogs={handleRefreshLogs}
            />
          )}

        </div>

      </main>

      {/* ======================================================== */}
      {/* GLOBAL MODALS AND FLOATERS */}
      {/* ======================================================== */}

      {/* 1. Member Official Template Certificate Modal */}
      {selectedMember && (
        <SocioTemplate 
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdateMember={handleUpdateMember}
          onDeleteMember={handleDeleteMember}
          currentWorker={workerSession}
        />
      )}

      {/* 2. Alta con Escáner Page/Window Modal for Admins */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-panel-dark border border-border-dark rounded-[32px] p-6 md:p-8 relative max-w-6xl w-full mx-auto shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-brand-red to-transparent"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6 border-b border-border-dark pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
                  <Cpu size={20} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-display font-bold text-white uppercase tracking-wider">
                    Ficha de Alta Oficial de Socio
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Escanea un DNI/Pasaporte con escáner óptico o rellena el formulario de registro de la asociación
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowScannerModal(false)}
                className="p-2 text-gray-400 hover:text-white bg-brand-dark border border-border-dark hover:border-brand-red rounded-xl transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Two Column Grid */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-2">
              {/* Left side: Document Scanner */}
              <div className="lg:col-span-5 flex flex-col justify-start">
                <div className="mb-3">
                  <span className="text-[10px] font-mono text-brand-red font-bold uppercase tracking-widest">PASO 1</span>
                  <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mt-1">Escanear Documento (Opcional)</h3>
                </div>
                <ScannerStage 
                  onScanCompleted={handleScanCompleted}
                  workerSession={workerSession}
                />
              </div>

              {/* Right side: Manual & Auto Registration Form */}
              <div className="lg:col-span-7 bg-brand-dark/40 border border-border-dark/60 rounded-2xl p-5 md:p-6 relative">
                <div className="mb-4">
                  <span className="text-[10px] font-mono text-brand-red font-bold uppercase tracking-widest">PASO 2</span>
                  <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mt-1">Confirmación y Envío de Formulario</h3>
                </div>

                <form onSubmit={handleRegisterMember} className="grid grid-cols-2 gap-4 text-xs">
                  
                  {/* First Name */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[9px]">Nombre</label>
                    <input 
                      type="text" 
                      value={formFirstName}
                      onChange={e => setFormFirstName(e.target.value)}
                      placeholder="CARLOS"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold uppercase placeholder:normal-case"
                      required
                    />
                  </div>

                  {/* Last Name */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[9px]">Apellidos</label>
                    <input 
                      type="text" 
                      value={formLastName}
                      onChange={e => setFormLastName(e.target.value)}
                      placeholder="SANCHEZ GOMEZ"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold uppercase placeholder:normal-case"
                      required
                    />
                  </div>

                  {/* Document identifier */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[9px]">Número Documento</label>
                    <input 
                      type="text" 
                      value={formDniPassport}
                      onChange={e => setFormDniPassport(e.target.value)}
                      placeholder="12345678Z o EM9876543"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-mono font-bold uppercase"
                      required
                    />
                  </div>

                  {/* Document Type Selection */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[9px]">Tipo de Documento</label>
                    <select 
                      value={formDocType}
                      onChange={e => setFormDocType(e.target.value as any)}
                      className="h-10 bg-brand-dark text-gray-300 border border-border-dark rounded-xl px-3 focus:outline-none focus:border-brand-red font-semibold"
                    >
                      <option value="DNI">DNI Español</option>
                      <option value="PASSPORT">Pasaporte Europeo</option>
                    </select>
                  </div>

                  {/* Nationality */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[9px]">Nacionalidad</label>
                    <input 
                      type="text" 
                      value={formNationality}
                      onChange={e => setFormNationality(e.target.value)}
                      placeholder="ESPAÑOLA"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold uppercase"
                      required
                    />
                  </div>

                  {/* Birth Date */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[9px]">Fecha Nacimiento</label>
                    <input 
                      type="date" 
                      value={formBirthDate}
                      onChange={e => setFormBirthDate(e.target.value)}
                      className="h-10 bg-brand-dark text-gray-300 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold"
                      required
                    />
                  </div>

                  {/* Expiry Date */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[9px]">Vencimiento Documento</label>
                    <input 
                      type="date" 
                      value={formExpiryDate}
                      onChange={e => setFormExpiryDate(e.target.value)}
                      className="h-10 bg-brand-dark text-gray-300 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold"
                      required
                    />
                  </div>

                  {/* Contact Email */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[9px]">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="carlos.sanchez@email.com"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[9px]">Número Teléfono</label>
                    <input 
                      type="text" 
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="+34 654 987 123"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold"
                    />
                  </div>

                  {/* Address */}
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-gray-400 font-bold uppercase font-mono text-[9px]">Dirección de Residencia</label>
                    <input 
                      type="text" 
                      value={formAddress}
                      onChange={e => setFormAddress(e.target.value)}
                      placeholder="Calle Gran Vía, 22, Piso 4º Izq, Madrid, España"
                      className="h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-3.5 focus:outline-none focus:border-brand-red font-semibold"
                    />
                  </div>

                  <div className="col-span-2 mt-4">
                    <button 
                      type="submit" 
                      className="w-full h-11 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg shadow-brand-red/10 border border-brand-red/20 flex items-center justify-center gap-2"
                    >
                      <UserCheck size={16} /> REGISTRAR SOCIO OFICIALMENTE
                    </button>
                  </div>

                </form>

                {/* Form feedback */}
                {formError && (
                  <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <p>{formError}</p>
                  </div>
                )}

                {formSuccess && (
                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-start gap-2">
                    <CheckCircle size={14} className="shrink-0 mt-0.5" />
                    <p>{formSuccess}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-panel-dark border border-border-dark rounded-3xl p-6 md:p-8 relative max-w-xl w-full mx-auto shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-red to-transparent"></div>
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
                  <FileUp size={20} />
                </div>
                <div>
                  <h4 className="text-base font-display font-bold text-gray-200 uppercase tracking-wider">
                    Importación Masiva de Socios
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Sube un archivo CSV para registrar múltiples socios en lote
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-1.5 text-gray-400 hover:text-white bg-brand-dark border border-border-dark hover:border-brand-red rounded-lg transition-all"
              >
                <X size={14} />
              </button>
            </div>

            {/* Content container (Scrollable if too long) */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-5 text-xs text-gray-300">
              
              {/* Instructions */}
              {!csvResults && (
                <div className="p-4 bg-brand-dark/40 border border-border-dark rounded-2xl flex flex-col gap-2.5 leading-relaxed">
                  <p className="font-semibold text-gray-200 uppercase font-mono tracking-wider text-[10px]">💡 Formato de Archivo Recomendado:</p>
                  <p>El archivo CSV debe incluir encabezados en la primera fila. Las columnas compatibles son:</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400 bg-brand-dark/60 p-2.5 rounded-xl border border-border-dark/60">
                    <div>• <span className="text-brand-red">Nombre</span> / first_name</div>
                    <div>• <span className="text-brand-red">Apellidos</span> / last_name</div>
                    <div>• <span className="text-brand-red">DNI</span> / Documento</div>
                    <div>• Nacionalidad</div>
                    <div>• Email</div>
                    <div>• Telefono</div>
                  </div>
                  <p className="text-[10px] text-gray-500 italic">Nota: El DNI o Pasaporte se verificará en tiempo real para evitar duplicados en el sistema local.</p>
                </div>
              )}

              {/* Drag and Drop Box */}
              {!csvResults && !csvProcessing && (
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setCsvFile(e.dataTransfer.files[0]);
                      setCsvError(null);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                    csvFile ? 'border-brand-red/50 bg-brand-red/5' : 'border-border-dark hover:border-brand-red/30 hover:bg-brand-red/[0.02]'
                  }`}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv';
                    input.onchange = (e: any) => {
                      if (e.target.files && e.target.files[0]) {
                        setCsvFile(e.target.files[0]);
                        setCsvError(null);
                      }
                    };
                    input.click();
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-brand-dark flex items-center justify-center border border-border-dark text-gray-400">
                    <Upload size={20} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-200">
                      {csvFile ? csvFile.name : 'Arrastra tu archivo CSV aquí'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB` : 'o haz clic para explorar en tu equipo (.csv)'}
                    </p>
                  </div>
                </div>
              )}

              {/* Loader */}
              {csvProcessing && (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-4 border-brand-red/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-brand-red rounded-full animate-spin"></div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-200">Procesando Importación Masiva...</p>
                    <p className="text-[10px] text-gray-500 mt-1">Validando formato de documentos y guardando en la base de datos</p>
                  </div>
                </div>
              )}

              {/* Error messages */}
              {csvError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 flex items-start gap-2.5">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{csvError}</p>
                </div>
              )}

              {/* Success summary & results */}
              {csvResults && (
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-400 flex items-start gap-2.5">
                    <CheckCircle size={15} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">¡Lote de socios importado con éxito!</p>
                      <p className="mt-1 leading-relaxed text-[11px] text-emerald-500/80">
                        Se han insertado {csvResults.importedCount} nuevos miembros en el registro del panel de control.
                      </p>
                    </div>
                  </div>

                  {/* Metrics Box */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-brand-dark border border-border-dark rounded-xl text-center">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold font-mono">REGISTRADOS</span>
                      <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{csvResults.importedCount}</p>
                    </div>
                    <div className="p-3 bg-brand-dark border border-border-dark rounded-xl text-center">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold font-mono">DUPLICADOS</span>
                      <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{csvResults.duplicateCount}</p>
                    </div>
                  </div>

                  {/* List of errors/warnings if any */}
                  {csvResults.errors.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold font-mono">Advertencias en Filas:</span>
                      <div className="bg-brand-dark/60 border border-border-dark/60 rounded-xl p-3.5 max-h-36 overflow-y-auto flex flex-col gap-1.5 font-mono text-[10px] text-gray-500">
                        {csvResults.errors.map((err, i) => (
                          <div key={i} className="flex gap-2 text-rose-400/80">
                            <span className="text-rose-500">•</span>
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action button */}
              {csvFile && !csvProcessing && !csvResults && (
                <button
                  onClick={handleImportCSV}
                  className="h-11 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg shadow-brand-red/10 border border-brand-red/20 hover:border-brand-red flex items-center justify-center gap-2 mt-2 font-display text-[11px]"
                >
                  <FileUp size={14} /> IMPORTAR {csvFile.name}
                </button>
              )}

              {/* Reset state/Close when done */}
              {csvResults && (
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setCsvResults(null);
                  }}
                  className="h-11 bg-gray-900 border border-border-dark hover:border-brand-red hover:text-white text-gray-300 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-2 font-display text-[11px]"
                >
                  ENTENDIDO Y CERRAR
                </button>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 2. Real-time floating Push Notification Alert (Toast popup with sound) */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-brand-dark/95 border-2 border-brand-red rounded-2xl p-4 shadow-2xl animate-[slideIn_0.35s_cubic-bezier(0.16,1,0.3,1)] select-none pointer-events-auto glow-border">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-red animate-ping"></span>
              <span className="text-[10px] font-mono font-black text-brand-red uppercase tracking-widest">
                ALERTA PUSH REALTIME
              </span>
            </div>
            <button 
              onClick={() => setActiveToast(null)}
              className="p-1 text-gray-500 hover:text-white rounded-full transition-colors"
            >
              <X size={12} />
            </button>
          </div>
          <h5 className="text-xs font-display font-extrabold text-white uppercase">
            {activeToast.title}
          </h5>
          <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
            {activeToast.message}
          </p>
          <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 mt-3 border-t border-border-dark pt-2">
            <span>Enviado por {activeToast.senderName} ({activeToast.senderRole})</span>
            <span>{new Date(activeToast.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* 3. Sliding Panel: Notifications Logs History Panel */}
      {showNotificationsDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 bg-panel-dark border-l border-border-dark p-6 shadow-2xl flex flex-col justify-between animate-[slideInRight_0.3s_cubic-bezier(0.16,1,0.3,1)]">
          <div className="flex flex-col h-full min-h-0">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-display font-bold text-gray-200 uppercase tracking-wider">
                Historial de Avisos
              </h4>
              <button 
                onClick={() => setShowNotificationsDrawer(false)}
                className="p-1.5 text-gray-400 hover:text-white bg-brand-dark border border-border-dark hover:border-brand-red rounded-lg transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3.5 min-h-0">
              {notifications.length === 0 ? (
                <p className="text-gray-600 text-xs text-center py-8">Ninguna alerta registrada hoy.</p>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className="p-3 bg-brand-dark/40 border border-border-dark rounded-xl flex flex-col justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white uppercase">{notif.title}</h5>
                      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{notif.message}</p>
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-mono text-gray-600 mt-3 border-t border-border-dark/40 pt-1.5">
                      <span>Emisor: {notif.senderName}</span>
                      <span>{new Date(notif.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Duplicate Member Document Warning Modal */}
      <DuplicateWarningModal
        isOpen={duplicateWarning.isOpen}
        onClose={() => setDuplicateWarning(prev => ({ ...prev, isOpen: false }))}
        documentNumber={duplicateWarning.documentNumber}
        documentType={duplicateWarning.documentType}
        existingMember={duplicateWarning.existingMember}
        onViewMember={(member) => {
          setDuplicateWarning(prev => ({ ...prev, isOpen: false }));
          setSelectedMember(member);
        }}
      />

      {/* CSS Animation keyframes injected dynamically */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(30px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>

    </div>
  );
}
