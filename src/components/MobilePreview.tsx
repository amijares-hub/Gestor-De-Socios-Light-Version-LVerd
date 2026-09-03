import React, { useState, useRef } from 'react';
import { 
  User, 
  FileText, 
  Bell, 
  Settings as SettingsIcon, 
  HelpCircle, 
  MapPin, 
  Plane, 
  Building, 
  Utensils, 
  Car, 
  Ticket, 
  Search, 
  Percent, 
  Briefcase, 
  UserCheck, 
  ArrowRight,
  Share2,
  FileSpreadsheet,
  FileCheck,
  ArrowLeft,
  Upload,
  Cpu,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  X,
  AlertCircle,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Home,
  Users
} from 'lucide-react';
import { AssociationMember, WorkerUser } from '../types';

interface MobilePreviewProps {
  activeWorker: WorkerUser | null;
  members: AssociationMember[];
  onNavigateToTab: (tab: string) => void;
  onSendNotification: (title: string, message: string) => void;
  onSelectMember: (member: AssociationMember) => void;
  onMemberRegistered?: (newMember: AssociationMember) => void;
}

export default function MobilePreview({ 
  activeWorker, 
  members, 
  onNavigateToTab,
  onSendNotification,
  onSelectMember,
  onMemberRegistered
}: MobilePreviewProps) {
  // Mobile UI States: Tabs
  // 1: Home/Actions, 2: Notifications Center, 3: Members Feed, 4: Integrated Scanner/Alta Socio, 5: Notification Settings, 6: Profile
  const [activeScreen, setActiveScreen] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [activeTab, setActiveTab] = useState<'home' | 'notificaciones' | 'ajustes' | 'socios' | 'perfil' | 'scanner'>('home');

  // Form states for the mobile-integrated scanner registration
  const [mFirstName, setMFirstName] = useState('');
  const [mLastName, setMLastName] = useState('');
  const [mDniPassport, setMDniPassport] = useState('');
  const [mDocType, setMDocType] = useState<'DNI' | 'PASSPORT'>('DNI');
  const [mNationality, setMNationality] = useState('ESPAÑOLA');
  const [mGender, setMGender] = useState<'MASCULINO' | 'FEMENINO' | 'OTRO'>('MASCULINO');
  const [mBirthDate, setMBirthDate] = useState('');
  const [mExpiryDate, setMExpiryDate] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mAddress, setMAddress] = useState('');

  // Scanner states inside mobile preview
  const [mScanning, setMScanning] = useState(false);
  const [mProgress, setMProgress] = useState(0);
  const [mFileName, setMFileName] = useState<string | null>(null);
  const [mScanStatusLogs, setMScanStatusLogs] = useState<string[]>([]);
  const [mScanError, setMScanError] = useState<string | null>(null);
  const [mDragActive, setMDragActive] = useState(false);
  const [mActivePreset, setMActivePreset] = useState<'none' | 'dni_espanol' | 'passport_europe'>('none');

  // Registration states
  const [mRegError, setMRegError] = useState<string | null>(null);
  const [mRegSuccess, setMRegSuccess] = useState<string | null>(null);
  const [mRegistering, setMRegistering] = useState(false);

  const mFileInputRef = useRef<HTMLInputElement>(null);

  // Local state for interactive features
  const [mobileSearch, setMobileSearch] = useState('');
  const [showQuickNotif, setShowQuickNotif] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickMsg, setQuickMsg] = useState('');

  // Advanced filters and sorting states for member consulting
  const [filterGender, setFilterGender] = useState<'TODOS' | 'MASCULINO' | 'FEMENINO' | 'OTRO'>('TODOS');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'alpha_asc' | 'alpha_desc' | 'age_asc' | 'age_desc'>('date_desc');
  const [filterAgeGroup, setFilterAgeGroup] = useState<'TODOS' | 'JOVENES' | 'ADULTOS' | 'SENIORS'>('TODOS'); // JOVENES (<30), ADULTOS (30-50), SENIORS (>50)

// Customizable notification settings
  const [prefNewMember, setPrefNewMember] = useState(true);
  const [prefDocExpiry, setPrefDocExpiry] = useState(true);
  const [prefWeeklyReminder, setPrefWeeklyReminder] = useState(false);
  const [prefSecurityAlert, setPrefSecurityAlert] = useState(true);

  // Play audio feedback safely via Web Audio API
  const playFeedbackBeep = (freq: number = 800, type: OscillatorType = 'sine', duration: number = 0.1) => {
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
      // Safe catch for autoplay constraints
    }
  };

  // Individual worker notification preferences (Avisos sonoros y visuales por actividad)
  const workerId = activeWorker ? activeWorker.id : 'demo-worker';
  const loadWorkerPrefs = () => {
    try {
      const saved = localStorage.getItem(`worker_prefs_${workerId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      memberReg: { sound: true, visual: true },
      ocrScan: { sound: true, visual: true },
      docExpiry: { sound: false, visual: true },
      securityAlert: { sound: true, visual: true }
    };
  };

  const [workerPrefs, setWorkerPrefs] = useState(loadWorkerPrefs);

  // Sync state if activeWorker changes
  React.useEffect(() => {
    setWorkerPrefs(loadWorkerPrefs());
  }, [activeWorker?.id]);

  const updateWorkerPref = (
    activity: 'memberReg' | 'ocrScan' | 'docExpiry' | 'securityAlert', 
    type: 'sound' | 'visual', 
    value: boolean
  ) => {
    const updated = {
      ...workerPrefs,
      [activity]: {
        ...workerPrefs[activity],
        [type]: value
      }
    };
    setWorkerPrefs(updated);
    try {
      localStorage.setItem(`worker_prefs_${workerId}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    // Play tactile/audio beep feedback on user interaction
    if (type === 'sound' && value) {
      playFeedbackBeep(880, 'sine', 0.12);
    } else {
      playFeedbackBeep(440, 'triangle', 0.08);
    }
  };

  // Simulated notifications list inside phone view
  const [mobileNotifications, setMobileNotifications] = useState([
    { id: '1', title: 'Alta de Socio', message: 'Socio CARLOS SANCHEZ GOMEZ registrado con éxito por Administrador.', date: 'Hace 5 min' },
    { id: '2', title: 'Validación OCR', message: 'DNI validado correctamente mediante procesamiento óptico de alta precisión.', date: 'Hace 10 min' },
    { id: '3', title: 'Guardado Seguro', message: 'Socio MARIE DUBOIS subido al servidor seguro en estado pendiente.', date: 'Hace 1 hora' }
  ]);

  // Handle Tab clicks in mobile bottom bar
  const handleTabClick = (tab: 'home' | 'notificaciones' | 'ajustes' | 'socios' | 'perfil' | 'scanner') => {
    setActiveTab(tab);
    if (tab === 'home') {
      setActiveScreen(1);
    } else if (tab === 'notificaciones') {
      setActiveScreen(2);
    } else if (tab === 'ajustes') {
      setActiveScreen(5);
    } else if (tab === 'socios') {
      setActiveScreen(3);
    } else if (tab === 'perfil') {
      setActiveScreen(6);
    }
  };

  const handleQuickNotifSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickTitle && quickMsg) {
      onSendNotification(quickTitle, quickMsg);
      setMobileNotifications(prev => [
        {
          id: Date.now().toString(),
          title: quickTitle,
          message: quickMsg,
          date: 'Justo ahora'
        },
        ...prev
      ]);
      setQuickTitle('');
      setQuickMsg('');
      setShowQuickNotif(false);
    }
  };

  const handleOpenMobileRegistration = () => {
    setActiveScreen(4);
    setActiveTab('scanner');
    // Reset states
    setMFirstName('');
    setMLastName('');
    setMDniPassport('');
    setMDocType('DNI');
    setMNationality('ESPAÑOLA');
    setMGender('MASCULINO');
    setMBirthDate('');
    setMExpiryDate('');
    setMEmail('');
    setMPhone('');
    setMAddress('');
    setMRegSuccess(null);
    setMRegError(null);
    setMScanError(null);
    setMActivePreset('none');
    setMFileName(null);
    setMProgress(0);
    setMScanning(false);
  };

  const triggerMobileScanFlow = async (body: any) => {
    setMScanning(true);
    setMProgress(10);
    setMScanError(null);
    setMScanStatusLogs([
      "🔋 Inicializando lector óptico móvil...",
      "🔗 Conectando con servidor de procesamiento de datos..."
    ]);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    await sleep(400);
    setMProgress(30);
    setMScanStatusLogs(prev => [
      ...prev,
      "⚙️ Desplegando motor de segmentación de caracteres OCR...",
      "📸 Capturando píxeles y capas de contraste..."
    ]);

    await sleep(400);
    setMProgress(55);
    setMScanStatusLogs(prev => [
      ...prev,
      "⚡ Ejecutando análisis de reconocimiento óptico de caracteres (OCR)...",
      "🛡️ Validando marcas de seguridad de DNI/Pasaporte..."
    ]);

    await sleep(450);
    setMProgress(80);
    setMScanStatusLogs(prev => [
      ...prev,
      "🗺️ Mapeando campos obtenidos al esquema de socios...",
      "🔍 Validando formatos de fechas (YYYY-MM-DD)..."
    ]);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          worker: activeWorker
        })
      });

      if (!response.ok) {
        throw new Error("El servidor falló durante el escaneo del documento");
      }

      const parsedData = await response.json();
      
      setMProgress(100);
      setMScanStatusLogs(prev => [
        ...prev,
        "🎉 ¡Escaneo completado exitosamente!",
        `✅ Encontrado ${parsedData.documentType}: ${parsedData.dniPassport}`
      ]);

      await sleep(300);
      
      // Auto-populate form
      setMFirstName(parsedData.firstName || '');
      setMLastName(parsedData.lastName || '');
      setMDniPassport(parsedData.dniPassport || '');
      setMDocType(parsedData.documentType || 'DNI');
      setMNationality(parsedData.nationality || 'ESPAÑOLA');
      setMBirthDate(parsedData.birthDate || '');
      setMExpiryDate(parsedData.expiryDate || '');
      setMEmail(parsedData.email || '');
      setMPhone(parsedData.phone || '');
      setMAddress(parsedData.address || '');
      setMGender(parsedData.gender || 'MASCULINO');
      
      setMScanning(false);
      setMProgress(0);
      setMRegSuccess("✨ Campos auto-completados mediante OCR de alta precisión. Revisa los datos antes de registrar.");

    } catch (e: any) {
      console.error(e);
      setMScanError(e.message || "Error al conectar con el servidor de procesamiento de imagen. Revisa tu conexión.");
      setMScanning(false);
      setMProgress(0);
    }
  };

  const handleMobilePresetScan = (preset: 'dni_espanol' | 'passport_europe') => {
    if (mScanning) return;
    setMActivePreset(preset);
    setMFileName(preset === 'dni_espanol' ? "DNI_ES_Carlos_Sanchez_Mockup.jpg" : "PASSPORT_EU_Marie_Dubois_Mockup.jpg");
    triggerMobileScanFlow({ documentPreset: preset });
  };

  const processMobileFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMScanError("Por favor, sube únicamente archivos de imagen (PNG, JPG, JPEG)");
      return;
    }

    setMFileName(file.name);
    setMActivePreset('none');

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      triggerMobileScanFlow({ imageBase64: base64 });
    };
    reader.onerror = () => {
      setMScanError("Error al cargar el archivo de imagen");
    };
    reader.readAsDataURL(file);
  };

  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processMobileFile(e.target.files[0]);
    }
  };

  const handleMobileDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setMDragActive(true);
    } else if (e.type === "dragleave") {
      setMDragActive(false);
    }
  };

  const handleMobileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processMobileFile(e.dataTransfer.files[0]);
    }
  };

  const validateMobileDocument = (doc: string, type: 'DNI' | 'PASSPORT'): { valid: boolean; error?: string } => {
    const cleanDoc = doc.trim().toUpperCase();
    if (!cleanDoc) {
      return { valid: false, error: "El documento no puede estar vacío." };
    }

    if (type === 'DNI') {
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
        return { valid: false, error: "Formato de DNI o NIE español inválido." };
      }
    } else {
      const passportRegex = /^[A-Z0-9]{6,12}$/;
      if (!passportRegex.test(cleanDoc)) {
        return { valid: false, error: "Formato de pasaporte inválido. Debe tener entre 6 y 12 caracteres alfanuméricos." };
      }
      return { valid: true };
    }
  };

  const handleMobileRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMRegError(null);
    setMRegSuccess(null);
    setMRegistering(true);

    const cleanDoc = mDniPassport.trim().toUpperCase();
    const exists = members.some(m => m.dniPassport.trim().toUpperCase() === cleanDoc);
    if (exists) {
      setMRegError(`El documento "${cleanDoc}" ya se encuentra registrado.`);
      setMRegistering(false);
      return;
    }

    const validation = validateMobileDocument(mDniPassport, mDocType);
    if (!validation.valid) {
      setMRegError(validation.error || "Documento inválido.");
      setMRegistering(false);
      return;
    }

    const payload = {
      memberData: {
        firstName: mFirstName,
        lastName: mLastName,
        dniPassport: mDniPassport,
        documentType: mDocType,
        nationality: mNationality,
        birthDate: mBirthDate,
        expiryDate: mExpiryDate,
        email: mEmail,
        phone: mPhone,
        address: mAddress,
        gender: mGender,
        registrationStatus: 'approved'
      },
      worker: activeWorker
    };

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el registro.');
      }

      setMRegSuccess(`🎉 Socio ${mFirstName} registrado exitosamente.`);
      
      if (onMemberRegistered) {
        onMemberRegistered(data);
      }

      // Reset form fields
      setMFirstName('');
      setMLastName('');
      setMDniPassport('');
      setMNationality('ESPAÑOLA');
      setMBirthDate('');
      setMExpiryDate('');
      setMEmail('');
      setMPhone('');
      setMAddress('');

    } catch (err: any) {
      setMRegError(err.message);
    } finally {
      setMRegistering(false);
    }
  };

  // Calculate age from birthdate
  const calculateAge = (birthDateStr: string): number => {
    if (!birthDateStr) return 0;
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Filter and sort members based on advanced UI controls
  const filteredMembers = [...members]
    .filter(m => {
      // 1. Search text filter
      const matchesSearch = 
        m.firstName.toLowerCase().includes(mobileSearch.toLowerCase()) ||
        m.lastName.toLowerCase().includes(mobileSearch.toLowerCase()) ||
        m.dniPassport.toLowerCase().includes(mobileSearch.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Gender filter
      if (filterGender !== 'TODOS') {
        const mGender = (m.gender || 'MASCULINO').toUpperCase();
        if (mGender !== filterGender) return false;
      }

      // 3. Age group filter (JOVENES < 30, ADULTOS 30-50, SENIORS > 50)
      if (filterAgeGroup !== 'TODOS') {
        const age = calculateAge(m.birthDate);
        if (filterAgeGroup === 'JOVENES' && age >= 30) return false;
        if (filterAgeGroup === 'ADULTOS' && (age < 30 || age > 50)) return false;
        if (filterAgeGroup === 'SENIORS' && age <= 50) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.registerDate).getTime() - new Date(a.registerDate).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.registerDate).getTime() - new Date(b.registerDate).getTime();
      }
      if (sortBy === 'alpha_asc') {
        const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'alpha_desc') {
        const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
        return nameB.localeCompare(nameA);
      }
      if (sortBy === 'age_asc') {
        const ageA = calculateAge(a.birthDate);
        const ageB = calculateAge(b.birthDate);
        return ageA - ageB;
      }
      if (sortBy === 'age_desc') {
        const ageA = calculateAge(a.birthDate);
        const ageB = calculateAge(b.birthDate);
        return ageB - ageA;
      }
      return 0;
    });

  return (
    <div id="mobile-preview-container" className="flex flex-col items-center justify-center p-4">
      {/* Title above phone */}
      <div className="mb-4 text-center">
        <span className="px-3 py-1 text-xs font-mono font-semibold text-brand-red bg-brand-red/10 border border-brand-red/20 rounded-full uppercase tracking-wider">
          Módulo de Adaptación UI/UX
        </span>
        <h3 className="mt-2 text-lg font-display font-medium text-gray-200">
          Vista Móvil de Trabajador
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Inspirada en el layout original con paleta adaptada de Laguna Verde
        </p>
      </div>

      {/* Outer Smartphone Frame */}
      <div className="relative w-[340px] h-[680px] bg-brand-dark rounded-[40px] p-3 shadow-2xl border-4 border-gray-800 flex flex-col overflow-hidden glow-border">
        {/* Notch at the top */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-5 bg-gray-800 rounded-b-2xl z-30 flex items-center justify-center gap-1.5">
          <div className="w-2.5 h-2.5 bg-black rounded-full border border-gray-700"></div>
          <div className="w-12 h-1 bg-black rounded-full"></div>
        </div>

        {/* Screen Area: Native Orange/Gold palette adapted for contrast & premium feel */}
        <div className="w-full h-full bg-[#fca311] rounded-[30px] overflow-y-auto overflow-x-hidden flex flex-col relative pt-5 pb-12 select-none">
          
          {/* ======================================================== */}
          {/* SCREEN 1: HOME PANEL (Adapted from 1st screen in image) */}
          {/* ======================================================== */}
          {activeScreen === 1 && (
            <div className="flex-1 flex flex-col">
              {/* Header Gold Banner with pattern and Avatar */}
              <div className="relative p-6 pt-4 pb-4 flex flex-col items-center">
                {/* Simulated leaf/wave background ornamentations */}
                <div className="absolute top-1 right-2 opacity-15 text-6xl select-none pointer-events-none font-sans font-black">
                  🍃
                </div>
                <div className="absolute top-10 left-3 opacity-15 text-5xl select-none pointer-events-none font-sans font-black">
                  🍂
                </div>

                {/* Avatar Cartoon container */}
                <div className="relative w-28 h-28 bg-[#f5dfbb] rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center mt-2">
                  {/* Styled avatar vector look using tailwind */}
                  <div className="absolute inset-0 bg-[#e3cdab] rounded-full"></div>
                  {/* Hair */}
                  <div className="absolute top-2 w-20 h-10 bg-[#4e3629] rounded-full"></div>
                  {/* Face */}
                  <div className="absolute top-8 w-16 h-16 bg-[#ffd1b3] rounded-full flex flex-col items-center justify-center">
                    {/* Hair strands */}
                    <div className="absolute -top-3 w-16 h-6 bg-[#4e3629] rounded-b-lg"></div>
                    {/* Sunglasses */}
                    <div className="flex gap-1 mt-1 z-10">
                      <div className="w-6 h-4 bg-gray-900 border border-gray-800 rounded-md"></div>
                      <div className="w-2 h-1 bg-gray-900 self-center"></div>
                      <div className="w-6 h-4 bg-gray-900 border border-gray-800 rounded-md"></div>
                    </div>
                    {/* Smile */}
                    <div className="w-5 h-2.5 border-b-2 border-amber-800 rounded-b-full mt-2"></div>
                  </div>
                  {/* Body shirt */}
                  <div className="absolute bottom-0 w-24 h-10 bg-[#3a86c8] rounded-t-xl border-t border-[#ffd1b3]"></div>
                </div>

                <h4 className="mt-3 text-white font-display text-lg font-black tracking-wider uppercase drop-shadow-sm">
                  ¡HOLA, {activeWorker ? activeWorker.name.split(' ')[0] : 'INVITADO'}!
                </h4>
              </div>

              {/* Lower Section: Options lists with white circular icons inside dark orange pills */}
              <div className="bg-[#e85d04] rounded-t-[36px] p-5 flex-1 flex flex-col gap-3 mt-1 shadow-inner">
                
                {/* Option 1: Your Booking -> Escáner Documental */}
                <button 
                  onClick={handleOpenMobileRegistration} 
                  className="w-full h-14 bg-[#d00000] hover:bg-[#a00000] rounded-full px-4 flex items-center gap-4 transition-all shadow-md text-left text-white"
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#d00000] shrink-0">
                    <FileText size={20} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm tracking-wide">Alta con Escáner</p>
                    <p className="text-[10px] text-amber-200">Procesado Óptico OCR</p>
                  </div>
                  <ArrowRight size={16} className="text-amber-200" />
                </button>

                {/* Option 2: Payment Method -> Enviar Alerta */}
                <button 
                  onClick={() => setShowQuickNotif(!showQuickNotif)} 
                  className="w-full h-14 bg-[#d00000] hover:bg-[#a00000] rounded-full px-4 flex items-center gap-4 transition-all shadow-md text-left text-white"
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#d00000] shrink-0">
                    <Bell size={20} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm tracking-wide">Notificación Push</p>
                    <p className="text-[10px] text-amber-200">Envío en tiempo real</p>
                  </div>
                  <ArrowRight size={16} className="text-amber-200" />
                </button>

                {/* Option 3: Settings -> Ajustes de Notificaciones */}
                <button 
                  onClick={() => { setActiveScreen(5); setActiveTab('ajustes'); }} 
                  className="w-full h-14 bg-[#d00000] hover:bg-[#a00000] rounded-full px-4 flex items-center gap-4 transition-all shadow-md text-left text-white"
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#d00000] shrink-0">
                    <SettingsIcon size={20} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm tracking-wide">Ajustes Notificaciones</p>
                    <p className="text-[10px] text-amber-200">Filtros y recordatorios</p>
                  </div>
                  <ArrowRight size={16} className="text-amber-200" />
                </button>

                {/* Option 4: Consultar Socios */}
                <button 
                  onClick={() => { setActiveScreen(3); setActiveTab('socios'); }} 
                  className="w-full h-14 bg-[#d00000] hover:bg-[#a00000] rounded-full px-4 flex items-center gap-4 transition-all shadow-md text-left text-white"
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#d00000] shrink-0">
                    <UserCheck size={20} className="stroke-[2.5]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm tracking-wide">Consultar Socios</p>
                    <p className="text-[10px] text-amber-200">Búsqueda, filtros y listado</p>
                  </div>
                  <ArrowRight size={16} className="text-amber-200" />
                </button>

                {/* Quick Realtime Notification Drawer inside mobile */}
                {showQuickNotif && (
                  <form onSubmit={handleQuickNotifSubmit} className="bg-[#fca311] p-3.5 rounded-2xl shadow-lg mt-1 border border-white/20 flex flex-col gap-2">
                    <h5 className="text-xs font-bold text-amber-900">Push Instantáneo</h5>
                    <input 
                      type="text" 
                      placeholder="Título..."
                      value={quickTitle}
                      onChange={e => setQuickTitle(e.target.value)}
                      className="w-full h-8 bg-white/90 rounded-lg px-2 text-xs font-semibold text-gray-800 placeholder-gray-500 focus:outline-none"
                      required
                    />
                    <textarea 
                      placeholder="Cuerpo del mensaje..."
                      value={quickMsg}
                      onChange={e => setQuickMsg(e.target.value)}
                      className="w-full h-12 bg-white/90 rounded-lg p-2 text-xs text-gray-800 placeholder-gray-500 focus:outline-none resize-none"
                      required
                    />
                    <div className="flex gap-1.5 justify-end mt-1">
                      <button 
                        type="button" 
                        onClick={() => setShowQuickNotif(false)}
                        className="px-2.5 py-1 text-[10px] bg-amber-200 text-amber-950 font-bold rounded-md"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="px-2.5 py-1 text-[10px] bg-red-700 hover:bg-red-800 text-white font-bold rounded-md"
                      >
                        Enviar
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 2: NOTIFICACIONES CENTER */}
          {/* ======================================================== */}
          {activeScreen === 2 && (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
              {/* Header Notifications with Circular Icon */}
              <div className="flex items-center gap-3 mb-4 mt-1">
                <div className="w-14 h-14 bg-[#0a9396] rounded-full flex items-center justify-center text-white border-2 border-white shadow-md shrink-0">
                  <Bell size={28} className="stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-white font-display text-lg font-extrabold tracking-wider uppercase drop-shadow-sm leading-none">
                    ALERTAS
                  </h4>
                  <p className="text-[10px] text-amber-100 font-mono mt-0.5">NOTIFICACIONES PUSH</p>
                </div>
              </div>

              {/* Form to send new push alert directly */}
              <div className="bg-[#e85d04] p-3.5 rounded-2xl shadow-inner border border-white/10 mb-4 flex flex-col gap-2">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-white">Enviar Nueva Alerta Push</h5>
                <form onSubmit={handleQuickNotifSubmit} className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    placeholder="Título del mensaje..."
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    className="w-full h-8 bg-white/90 rounded-lg px-2 text-xs font-semibold text-gray-800 placeholder-gray-500 focus:outline-none"
                    required
                  />
                  <textarea 
                    placeholder="Contenido de la alerta push..."
                    value={quickMsg}
                    onChange={e => setQuickMsg(e.target.value)}
                    className="w-full h-12 bg-white/90 rounded-lg p-2 text-xs text-gray-800 placeholder-gray-500 focus:outline-none resize-none"
                    required
                  />
                  <button 
                    type="submit" 
                    className="w-full h-8 bg-[#d00000] hover:bg-[#a00000] text-white font-extrabold text-xs rounded-lg transition-all uppercase tracking-wider shadow"
                  >
                    Enviar Alerta Realtime
                  </button>
                </form>
              </div>

              {/* Sent Notifications Feed */}
              <div className="flex-1 flex flex-col gap-2.5">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-white border-b border-white/10 pb-1">Historial de Envíos</h5>
                {mobileNotifications.length === 0 ? (
                  <p className="text-[10px] text-amber-100 italic text-center py-4 bg-[#e85d04] rounded-xl">No hay notificaciones enviadas.</p>
                ) : (
                  mobileNotifications.map(n => (
                    <div key={n.id} className="bg-[#d00000] rounded-xl p-3 text-white shadow relative border border-white/10 text-left">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-extrabold text-xs tracking-wider uppercase flex items-center gap-1">
                          <Bell size={10} className="stroke-[2.5]" /> {n.title}
                        </span>
                        <span className="text-[8px] text-amber-200 font-mono">{n.date}</span>
                      </div>
                      <p className="text-[10px] text-amber-100 leading-normal">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 3: SOCIOS FEED (Adapted from 3rd screen in image) */}
          {/* ======================================================== */}
          {activeScreen === 3 && (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
              
              {/* Header Feed with Flight Airplane Circle */}
              <div className="flex items-center gap-3 mb-4 mt-1">
                <div className="w-14 h-14 bg-[#0a9396] rounded-full flex items-center justify-center text-white border-2 border-white shadow-md shrink-0">
                  <UserCheck size={28} className="stroke-[2]" />
                </div>
                <h4 className="text-white font-display text-xl font-extrabold tracking-wider uppercase drop-shadow-sm">
                  SOCIOS
                </h4>
              </div>

              {/* Mobile Search inside list */}
              <div className="relative mb-4">
                <input 
                  type="text"
                  placeholder="Buscar socio..."
                  value={mobileSearch}
                  onChange={e => setMobileSearch(e.target.value)}
                  className="w-full h-10 bg-[#e85d04] text-white placeholder-amber-200 border border-white/10 rounded-xl pl-9 pr-4 text-xs font-bold focus:outline-none focus:border-white shadow-inner"
                />
                <Search size={14} className="absolute left-3 top-3.5 text-amber-200" />
              </div>

              {/* Advanced Sorting and Filtering Panels */}
              <div className="bg-[#e85d04] p-3 rounded-2xl mb-4 border border-white/10 flex flex-col gap-2.5 shadow-inner">
                {/* 1. Sorting Order */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-amber-200 text-left">Ordenar por</span>
                  <div className="grid grid-cols-3 gap-1">
                    <button 
                      type="button"
                      onClick={() => setSortBy(sortBy === 'alpha_asc' ? 'alpha_desc' : 'alpha_asc')}
                      className={`h-7 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider ${sortBy.startsWith('alpha') ? 'bg-[#d00000] text-white border border-white/20' : 'bg-[#fca311]/20 text-white hover:bg-[#fca311]/40'}`}
                    >
                      🔤 Alfa {sortBy === 'alpha_asc' ? '▲' : sortBy === 'alpha_desc' ? '▼' : ''}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSortBy(sortBy === 'date_desc' ? 'date_asc' : 'date_desc')}
                      className={`h-7 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider ${sortBy.startsWith('date') ? 'bg-[#d00000] text-white border border-white/20' : 'bg-[#fca311]/20 text-white hover:bg-[#fca311]/40'}`}
                    >
                      📅 Reg. {sortBy === 'date_desc' ? '▼' : sortBy === 'date_asc' ? '▲' : ''}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSortBy(sortBy === 'age_asc' ? 'age_desc' : 'age_asc')}
                      className={`h-7 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider ${sortBy.startsWith('age') ? 'bg-[#d00000] text-white border border-white/20' : 'bg-[#fca311]/20 text-white hover:bg-[#fca311]/40'}`}
                    >
                      🎂 Edad {sortBy === 'age_asc' ? '▲' : sortBy === 'age_desc' ? '▼' : ''}
                    </button>
                  </div>
                </div>

                {/* 2. Gender Filter */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-amber-200 text-left">Filtrar por Género</span>
                  <div className="grid grid-cols-4 gap-1">
                    {(['TODOS', 'MASCULINO', 'FEMENINO', 'OTRO'] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFilterGender(g)}
                        className={`h-7 rounded-lg text-[8px] font-extrabold transition-all uppercase ${filterGender === g ? 'bg-white text-[#d00000] shadow' : 'bg-[#fca311]/20 text-white hover:bg-[#fca311]/40'}`}
                      >
                        {g === 'TODOS' ? 'TODOS' : g.substring(0, 4)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Age Brackets */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-amber-200 text-left">Filtrar por Edad</span>
                  <div className="grid grid-cols-4 gap-1">
                    {(['TODOS', 'JOVENES', 'ADULTOS', 'SENIORS'] as const).map(ag => (
                      <button
                        key={ag}
                        type="button"
                        onClick={() => setFilterAgeGroup(ag)}
                        className={`h-7 rounded-lg text-[8px] font-extrabold transition-all uppercase ${filterAgeGroup === ag ? 'bg-white text-[#d00000] shadow' : 'bg-[#fca311]/20 text-white hover:bg-[#fca311]/40'}`}
                      >
                        {ag === 'TODOS' ? 'TODOS' : ag === 'JOVENES' ? '<30' : ag === 'ADULTOS' ? '30-50' : '>50'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Feed List (Exactly replicating airline tickets) */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <div className="bg-[#e85d04] p-6 rounded-2xl text-center text-amber-100 font-bold text-xs shadow-inner">
                    Ningún socio registrado
                  </div>
                ) : (
                  filteredMembers.map(member => (
                    <div 
                      key={member.id} 
                      className="bg-[#d00000] rounded-2xl p-4 text-white shadow-lg relative border border-white/10"
                    >
                      {/* Ticket Header Row (White circular icon and title) */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[#d00000]">
                            <UserCheck size={12} className="stroke-[2.5]" />
                          </div>
                          <span className="text-xs font-extrabold tracking-wider uppercase">Socio Activo</span>
                        </div>
                        {/* Share Button representing the export icon in flight header */}
                        <button 
                          onClick={() => onSelectMember(member)}
                          className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                        >
                          <Share2 size={12} className="text-white" />
                        </button>
                      </div>

                      {/* Flight Route adapted -> Name & Doc Identifier */}
                      <div className="flex justify-between items-center border-b border-white/20 pb-2 mb-2">
                        <div>
                          <p className="text-base font-black tracking-tight">{member.firstName}</p>
                          <p className="text-[10px] text-amber-200 tracking-wider">Nombre</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black tracking-tight">{member.lastName.split(' ')[0]}</p>
                          <p className="text-[10px] text-amber-200 tracking-wider">Apellido</p>
                        </div>
                      </div>

                      {/* Flight Info block adapted -> Document details, register date */}
                      <div className="grid grid-cols-2 gap-y-2 text-[10px] mb-3">
                        <div>
                          <p className="text-amber-100 font-bold">DOCUMENTO ({member.documentType})</p>
                          <p className="font-mono font-bold text-xs">{member.dniPassport}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-100 font-bold">NACIONALIDAD</p>
                          <p className="font-bold">{member.nationality}</p>
                        </div>
                        <div>
                          <p className="text-amber-100 font-bold">FECHA REGISTRO</p>
                          <p className="font-bold">{new Date(member.registerDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-100 font-bold">ESTADO ALTA</p>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase mt-0.5 ${
                            member.registrationStatus === 'approved' ? 'bg-emerald-600' :
                            member.registrationStatus === 'pending' ? 'bg-amber-500' : 'bg-rose-600'
                          }`}>
                            {member.registrationStatus}
                          </span>
                        </div>
                      </div>

                      {/* Replicating Flight Price and Details section */}
                      <div className="flex justify-between items-center pt-2.5 border-t border-white/10">
                        <div>
                          <p className="text-[8px] text-amber-200 font-bold uppercase">IDENTIFICADOR DE SOCIO</p>
                          <p className="text-lg font-black tracking-tight text-white font-mono leading-none">#{member.id.toUpperCase()}</p>
                        </div>
                        <button 
                          onClick={() => onSelectMember(member)}
                          className="text-xs font-black text-amber-200 hover:text-white transition-colors uppercase tracking-wider flex items-center gap-1"
                        >
                          Ver Ficha <ArrowRight size={10} />
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 4: FICHA DE ALTA OFICIAL DE SOCIO (INTEGRATED SCANNER & FORM) */}
          {/* ======================================================== */}
          {activeScreen === 4 && (
            <div className="flex-1 flex flex-col bg-brand-dark/95 min-h-full pb-14 text-gray-200 overflow-y-auto">
              
              {/* Screen Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border-dark/60 bg-panel-dark/90 sticky top-0 z-30">
                <button 
                  onClick={() => { setActiveScreen(1); setActiveTab('explore'); }}
                  className="p-1.5 hover:bg-brand-red/10 rounded-lg text-gray-400 hover:text-brand-red transition-all"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="flex-1">
                  <h4 className="text-xs font-display font-black tracking-wider uppercase text-gray-100 flex items-center gap-1.5">
                    Ficha de Alta Oficial
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></span>
                  </h4>
                  <p className="text-[9px] text-gray-400 font-mono">Laguna Verde Mobile Pro</p>
                </div>
              </div>

              {/* Lector de Identidad OCR Section */}
              <div className="p-4 border-b border-border-dark/30 bg-panel-dark/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-gray-300 flex items-center gap-1 uppercase tracking-wider">
                    <Cpu size={12} className="text-brand-red" /> Lector Óptico (OCR)
                  </span>
                  <span className="text-[8px] bg-brand-red/10 border border-brand-red/20 px-1.5 py-0.5 rounded text-brand-red font-mono font-bold uppercase tracking-wider flex items-center gap-0.5">
                    <Cpu size={8} className="animate-pulse" /> Alta Precisión
                  </span>
                </div>

                {/* Simulated scanner box */}
                <div 
                  onDragEnter={handleMobileDrag}
                  onDragOver={handleMobileDrag}
                  onDragLeave={handleMobileDrag}
                  onDrop={handleMobileDrop}
                  onClick={mScanning ? undefined : () => mFileInputRef.current?.click()}
                  className={`relative rounded-xl border border-dashed p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    mDragActive ? 'border-brand-red bg-brand-red/5' :
                    mScanning ? 'border-amber-500/30 bg-amber-500/5 cursor-wait' : 'border-border-dark bg-black/40 hover:bg-black/60'
                  }`}
                >
                  <input 
                    ref={mFileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleMobileFileChange}
                    disabled={mScanning}
                  />

                  {/* Laser scan line anim */}
                  {mScanning && (
                    <div className="absolute left-0 right-0 h-0.5 bg-brand-red shadow-[0_0_10px_#ff2a44] animate-[bounce_2s_infinite] z-10"></div>
                  )}

                  {mScanning ? (
                    <div className="flex flex-col items-center py-2">
                      <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center mb-2">
                        <span className="text-[9px] font-mono font-bold text-amber-400">{mProgress}%</span>
                      </div>
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest animate-pulse">
                        Escaneando...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2">
                      <Upload size={20} className="text-gray-500 mb-1.5" />
                      <p className="text-[10px] font-bold text-gray-300">Toca para capturar o subir DNI</p>
                      <p className="text-[8px] text-gray-500 mt-0.5">PNG, JPG o JPEG</p>
                    </div>
                  )}

                  {mFileName && !mScanning && (
                    <p className="text-[8px] text-brand-red mt-1.5 truncate max-w-xs italic font-mono">
                      📄 {mFileName}
                    </p>
                  )}
                </div>

                {/* Preset Fast Simulate Buttons */}
                {!mScanning && (
                  <div className="mt-3 flex gap-2 justify-center">
                    <button 
                      onClick={() => handleMobilePresetScan('dni_espanol')}
                      type="button"
                      className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-panel-dark border border-border-dark hover:border-brand-red/40 rounded-lg text-gray-300 hover:text-white transition-all flex items-center gap-1 shrink-0"
                    >
                      <Sparkles size={10} className="text-brand-red" /> Simular DNI
                    </button>
                    <button 
                      onClick={() => handleMobilePresetScan('passport_europe')}
                      type="button"
                      className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-panel-dark border border-border-dark hover:border-brand-red/40 rounded-lg text-gray-300 hover:text-white transition-all flex items-center gap-1 shrink-0"
                    >
                      <Sparkles size={10} className="text-brand-red" /> Simular Pasaporte
                    </button>
                  </div>
                )}

                {/* Progress logs in small console */}
                {mScanning && (
                  <div className="mt-3 bg-black/60 border border-border-dark/60 p-2 rounded-lg font-mono text-[8px] text-gray-300 max-h-[80px] overflow-y-auto flex flex-col gap-1 select-none text-left">
                    {mScanStatusLogs.map((log, i) => (
                      <div key={i} className="flex gap-1">
                        <span className="text-gray-600 shrink-0">&gt;</span>
                        <p>{log}</p>
                      </div>
                    ))}
                  </div>
                )}

                {mScanError && (
                  <div className="mt-2 p-2 bg-brand-red/10 border border-brand-red/20 rounded-lg text-[9px] text-brand-red font-semibold flex items-center gap-1">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{mScanError}</span>
                  </div>
                )}
              </div>

              {/* Formulario de Alta */}
              <form onSubmit={handleMobileRegisterMember} className="p-4 flex flex-col gap-3.5">
                <span className="text-[10px] font-bold text-gray-300 flex items-center gap-1 uppercase tracking-wider">
                  <FileText size={12} className="text-brand-red" /> Datos de Registro
                </span>

                {mRegSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-400 flex items-start gap-2 leading-relaxed text-left">
                    <CheckCircle size={14} className="shrink-0 mt-0.5" />
                    <p>{mRegSuccess}</p>
                  </div>
                )}

                {mRegError && (
                  <div className="p-3 bg-brand-red/10 border border-brand-red/20 rounded-xl text-[10px] text-brand-red flex items-start gap-2 leading-relaxed text-left">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <p>{mRegError}</p>
                  </div>
                )}

                {/* Form Fields inside Single-Column layout */}
                <div className="flex flex-col gap-2.5 text-left">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Nombre</label>
                    <input 
                      type="text"
                      value={mFirstName}
                      onChange={e => setMFirstName(e.target.value)}
                      className="w-full h-8 bg-[#1a1a1a] border border-border-dark rounded-lg px-2 text-xs text-white focus:outline-none focus:border-brand-red/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Apellidos</label>
                    <input 
                      type="text"
                      value={mLastName}
                      onChange={e => setMLastName(e.target.value)}
                      className="w-full h-8 bg-[#1a1a1a] border border-border-dark rounded-lg px-2 text-xs text-white focus:outline-none focus:border-brand-red/50"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Tipo Doc.</label>
                      <select 
                        value={mDocType}
                        onChange={e => setMDocType(e.target.value as 'DNI' | 'PASSPORT')}
                        className="w-full h-8 bg-[#1a1a1a] border border-border-dark rounded-lg px-1.5 text-xs text-white focus:outline-none focus:border-brand-red/50"
                      >
                        <option value="DNI">DNI / NIE</option>
                        <option value="PASSPORT">Pasaporte</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Nº Documento</label>
                      <input 
                        type="text"
                        value={mDniPassport}
                        onChange={e => setMDniPassport(e.target.value)}
                        className="w-full h-8 bg-[#1a1a1a] border border-border-dark rounded-lg px-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-brand-red/50"
                        placeholder="e.g., 12345678Z"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Nacionalidad</label>
                      <input 
                        type="text"
                        value={mNationality}
                        onChange={e => setMNationality(e.target.value.toUpperCase())}
                        className="w-full h-8 bg-[#1a1a1a] border border-border-dark rounded-lg px-2 text-xs text-white focus:outline-none focus:border-brand-red/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Género</label>
                      <select 
                        value={mGender}
                        onChange={e => setMGender(e.target.value as 'MASCULINO' | 'FEMENINO' | 'OTRO')}
                        className="w-full h-8 bg-[#1a1a1a] border border-border-dark rounded-lg px-1.5 text-xs text-white focus:outline-none focus:border-brand-red/50"
                      >
                        <option value="MASCULINO">MASCULINO</option>
                        <option value="FEMENINO">FEMENINO</option>
                        <option value="OTRO">OTRO</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">F. Nacimiento</label>
                      <input 
                        type="date"
                        value={mBirthDate}
                        onChange={e => setMBirthDate(e.target.value)}
                        className="w-full h-8 bg-[#1a1a1a] border border-border-dark rounded-lg px-2 text-xs text-white focus:outline-none focus:border-brand-red/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Vencimiento Doc.</label>
                      <input 
                        type="date"
                        value={mExpiryDate}
                        onChange={e => setMExpiryDate(e.target.value)}
                        className="w-full h-8 bg-[#1a1a1a] border border-border-dark rounded-lg px-2 text-xs text-white focus:outline-none focus:border-brand-red/50"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Correo Electrónico</label>
                    <input 
                      type="email"
                      value={mEmail}
                      onChange={e => setMEmail(e.target.value)}
                      className="w-full h-8 bg-[#1a1a1a] border border-border-dark rounded-lg px-2 text-xs text-white focus:outline-none focus:border-brand-red/50"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Teléfono</label>
                    <input 
                      type="tel"
                      value={mPhone}
                      onChange={e => setMPhone(e.target.value)}
                      className="w-full h-8 bg-[#1a1a1a] border border-border-dark rounded-lg px-2 text-xs text-white focus:outline-none focus:border-brand-red/50"
                      placeholder="+34 600 000 000"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">Dirección Completa</label>
                    <input 
                      type="text"
                      value={mAddress}
                      onChange={e => setMAddress(e.target.value)}
                      className="w-full h-8 bg-[#1a1a1a] border border-border-dark rounded-lg px-2 text-xs text-white focus:outline-none focus:border-brand-red/50"
                      placeholder="Calle, número, piso, ciudad"
                    />
                  </div>
                </div>

                {/* Crimson CTA button */}
                <button 
                  type="submit"
                  disabled={mRegistering || mScanning}
                  className="w-full h-10 mt-2 bg-brand-red hover:bg-brand-red/95 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {mRegistering ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Registrar Socio"
                  )}
                </button>
              </form>

            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 5: AJUSTES DE NOTIFICACIONES */}
          {/* ======================================================== */}
          {activeScreen === 5 && (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
              <div className="flex items-center gap-3 mb-6 mt-1">
                <div className="w-14 h-14 bg-[#0a9396] rounded-full flex items-center justify-center text-white border-2 border-white shadow-md shrink-0">
                  <SettingsIcon size={28} className="stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-white font-display text-base font-extrabold tracking-wider uppercase drop-shadow-sm leading-tight text-left">
                    AJUSTES
                  </h4>
                  <p className="text-[10px] text-amber-100 font-mono text-left">NOTIFICACIONES</p>
                </div>
              </div>

              <div className="bg-[#e85d04] rounded-2xl p-4 flex flex-col gap-4 border border-white/10 shadow-inner text-left">
                <h5 className="text-[10px] font-bold text-white uppercase tracking-wider mb-1 border-b border-white/10 pb-1.5">Preferencias de Alertas</h5>

                {/* Switch 1: Nuevos Miembros */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-2">
                    <p className="text-xs font-bold text-white leading-tight">Nuevos Socios</p>
                    <p className="text-[9px] text-amber-200">Alertar al dar de alta un socio nuevo</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setPrefNewMember(!prefNewMember)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 ${prefNewMember ? 'bg-emerald-500 flex justify-end' : 'bg-gray-400 flex justify-start'}`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow"></div>
                  </button>
                </div>

                {/* Switch 2: Caducidad de Documentos */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex-1 pr-2">
                    <p className="text-xs font-bold text-white leading-tight">Vencimiento DNI/Pasaporte</p>
                    <p className="text-[9px] text-amber-200">Avisar si un documento caduca pronto</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setPrefDocExpiry(!prefDocExpiry)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 ${prefDocExpiry ? 'bg-emerald-500 flex justify-end' : 'bg-gray-400 flex justify-start'}`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow"></div>
                  </button>
                </div>

                {/* Switch 3: Resumen Semanal */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex-1 pr-2">
                    <p className="text-xs font-bold text-white leading-tight">Resumen Semanal</p>
                    <p className="text-[9px] text-amber-200">Reporte de altas los lunes por la mañana</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setPrefWeeklyReminder(!prefWeeklyReminder)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 ${prefWeeklyReminder ? 'bg-emerald-500 flex justify-end' : 'bg-gray-400 flex justify-start'}`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow"></div>
                  </button>
                </div>

                {/* Switch 4: Alertas de Seguridad */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex-1 pr-2">
                    <p className="text-xs font-bold text-white leading-tight">Alertas de Seguridad</p>
                    <p className="text-[9px] text-amber-200">Dispositivos nuevos y auditoría activa</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setPrefSecurityAlert(!prefSecurityAlert)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all duration-200 ${prefSecurityAlert ? 'bg-emerald-500 flex justify-end' : 'bg-gray-400 flex justify-start'}`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow"></div>
                  </button>
                </div>
              </div>

              <div className="mt-4 bg-[#d00000] p-4 rounded-2xl text-center text-white border border-white/10 shadow-md">
                <span className="text-xs font-black uppercase tracking-wider block mb-1">💡 Sincronización Laguna Verde</span>
                <p className="text-[10px] text-amber-100">
                  Las preferencias guardadas se aplican al instante y se sincronizan con la base de datos segura.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 6: PERFIL DEL TRABAJADOR */}
          {/* ======================================================== */}
          {activeScreen === 6 && (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
              <div className="flex items-center gap-3 mb-6 mt-1">
                <div className="w-14 h-14 bg-[#0a9396] rounded-full flex items-center justify-center text-white border-2 border-white shadow-md shrink-0">
                  <UserCheck size={28} className="stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-white font-display text-base font-extrabold tracking-wider uppercase drop-shadow-sm leading-tight text-left">
                    PERFIL
                  </h4>
                  <p className="text-[10px] text-amber-100 font-mono text-left">TRABAJADOR AUTORIZADO</p>
                </div>
              </div>

              <div className="bg-[#e85d04] rounded-2xl p-5 flex flex-col items-center border border-white/10 shadow-inner">
                {/* Avatar miniature */}
                <div className="w-20 h-20 bg-[#f5dfbb] rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center relative mb-3">
                  <div className="absolute inset-0 bg-[#e3cdab]"></div>
                  <div className="absolute top-1 w-14 h-8 bg-[#4e3629] rounded-full"></div>
                  <div className="absolute top-5 w-12 h-12 bg-[#ffd1b3] rounded-full flex flex-col items-center">
                    <div className="flex gap-0.5 mt-1">
                      <div className="w-4 h-3 bg-gray-900 rounded-sm"></div>
                      <div className="w-1 h-0.5 bg-gray-900 self-center"></div>
                      <div className="w-4 h-3 bg-gray-900 rounded-sm"></div>
                    </div>
                  </div>
                </div>

                <h5 className="text-sm font-black text-white uppercase tracking-wider">
                  {activeWorker ? activeWorker.name : 'OPERADOR DEMO'}
                </h5>
                <span className="text-[9px] bg-red-700 text-white font-mono px-2 py-0.5 rounded-full mt-1.5 border border-white/20 uppercase tracking-widest font-extrabold">
                  {activeWorker ? activeWorker.role : 'WORKER'}
                </span>

                <div className="w-full mt-4 pt-4 border-t border-white/15 text-xs text-amber-100 flex flex-col gap-2.5 text-left">
                  <div className="flex justify-between">
                    <span className="font-bold text-white">ID Agente:</span>
                    <span className="font-mono bg-black/20 px-1.5 py-0.5 rounded text-[10px]">{activeWorker ? activeWorker.id : 'worker-demo-01'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-white">Estado:</span>
                    <span className="text-emerald-400 font-extrabold uppercase">● ACTIVO EN LÍNEA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-white">Atribuciones:</span>
                    <span className="text-right text-[10px]">Alta OCR, Control Notificaciones</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-white">Terminal ID:</span>
                    <span className="font-mono text-[10px]">LV-TERMINAL-01</span>
                  </div>
                </div>
              </div>

              {/* PANEL DE PREFERENCIAS INDIVIDUALES DE NOTIFICACIONES */}
              <div className="mt-4 bg-panel-dark/95 border border-border-dark/60 rounded-2xl p-4 shadow-lg text-left">
                <div className="flex items-center gap-2 mb-3 border-b border-border-dark pb-2">
                  <Bell className="text-brand-red stroke-[2]" size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">
                    Preferencias de Alertas
                  </span>
                </div>

                <p className="text-[9px] text-gray-400 mb-3 leading-relaxed">
                  Configura tus alertas sonoras y visuales personalizadas para cada tipo de actividad operativa.
                </p>

                <div className="flex flex-col gap-3">
                  {/* Actividad 1: Alta de Socios */}
                  <div className="flex items-center justify-between border-b border-border-dark/30 pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-200 block">Alta de Socios</span>
                      <span className="text-[8px] text-gray-400">Nuevos registros en la plataforma</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Audio toggle */}
                      <button 
                        type="button"
                        onClick={() => updateWorkerPref('memberReg', 'sound', !workerPrefs.memberReg.sound)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          workerPrefs.memberReg.sound 
                            ? 'bg-brand-red/20 border border-brand-red/50 text-brand-red' 
                            : 'bg-black/40 border border-border-dark text-gray-500 hover:text-gray-400'
                        }`}
                        title={workerPrefs.memberReg.sound ? "Desactivar Aviso Sonoro" : "Activar Aviso Sonoro"}
                      >
                        {workerPrefs.memberReg.sound ? <Volume2 size={12} /> : <VolumeX size={12} />}
                      </button>
                      {/* Visual toggle */}
                      <button 
                        type="button"
                        onClick={() => updateWorkerPref('memberReg', 'visual', !workerPrefs.memberReg.visual)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          workerPrefs.memberReg.visual 
                            ? 'bg-brand-red/20 border border-brand-red/50 text-brand-red' 
                            : 'bg-black/40 border border-border-dark text-gray-500 hover:text-gray-400'
                        }`}
                        title={workerPrefs.memberReg.visual ? "Desactivar Alerta Visual" : "Activar Alerta Visual"}
                      >
                        {workerPrefs.memberReg.visual ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Actividad 2: Escaneo OCR */}
                  <div className="flex items-center justify-between border-b border-border-dark/30 pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-200 block">Escaneo DNI (OCR)</span>
                      <span className="text-[8px] text-gray-400">Validación de documentos de identidad</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Audio toggle */}
                      <button 
                        type="button"
                        onClick={() => updateWorkerPref('ocrScan', 'sound', !workerPrefs.ocrScan.sound)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          workerPrefs.ocrScan.sound 
                            ? 'bg-brand-red/20 border border-brand-red/50 text-brand-red' 
                            : 'bg-black/40 border border-border-dark text-gray-500 hover:text-gray-400'
                        }`}
                        title={workerPrefs.ocrScan.sound ? "Desactivar Aviso Sonoro" : "Activar Aviso Sonoro"}
                      >
                        {workerPrefs.ocrScan.sound ? <Volume2 size={12} /> : <VolumeX size={12} />}
                      </button>
                      {/* Visual toggle */}
                      <button 
                        type="button"
                        onClick={() => updateWorkerPref('ocrScan', 'visual', !workerPrefs.ocrScan.visual)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          workerPrefs.ocrScan.visual 
                            ? 'bg-brand-red/20 border border-brand-red/50 text-brand-red' 
                            : 'bg-black/40 border border-border-dark text-gray-500 hover:text-gray-400'
                        }`}
                        title={workerPrefs.ocrScan.visual ? "Desactivar Alerta Visual" : "Activar Alerta Visual"}
                      >
                        {workerPrefs.ocrScan.visual ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Actividad 3: Vencimiento de DNI */}
                  <div className="flex items-center justify-between border-b border-border-dark/30 pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-200 block">Vencimiento de DNI</span>
                      <span className="text-[8px] text-gray-400">Alertas de caducidad inminente</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Audio toggle */}
                      <button 
                        type="button"
                        onClick={() => updateWorkerPref('docExpiry', 'sound', !workerPrefs.docExpiry.sound)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          workerPrefs.docExpiry.sound 
                            ? 'bg-brand-red/20 border border-brand-red/50 text-brand-red' 
                            : 'bg-black/40 border border-border-dark text-gray-500 hover:text-gray-400'
                        }`}
                        title={workerPrefs.docExpiry.sound ? "Desactivar Aviso Sonoro" : "Activar Aviso Sonoro"}
                      >
                        {workerPrefs.docExpiry.sound ? <Volume2 size={12} /> : <VolumeX size={12} />}
                      </button>
                      {/* Visual toggle */}
                      <button 
                        type="button"
                        onClick={() => updateWorkerPref('docExpiry', 'visual', !workerPrefs.docExpiry.visual)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          workerPrefs.docExpiry.visual 
                            ? 'bg-brand-red/20 border border-brand-red/50 text-brand-red' 
                            : 'bg-black/40 border border-border-dark text-gray-500 hover:text-gray-400'
                        }`}
                        title={workerPrefs.docExpiry.visual ? "Desactivar Alerta Visual" : "Activar Alerta Visual"}
                      >
                        {workerPrefs.docExpiry.visual ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Actividad 4: Alertas de Seguridad */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-200 block">Seguridad y Auditoría</span>
                      <span className="text-[8px] text-gray-400">Inicio de sesión y auditoría activa</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Audio toggle */}
                      <button 
                        type="button"
                        onClick={() => updateWorkerPref('securityAlert', 'sound', !workerPrefs.securityAlert.sound)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          workerPrefs.securityAlert.sound 
                            ? 'bg-brand-red/20 border border-brand-red/50 text-brand-red' 
                            : 'bg-black/40 border border-border-dark text-gray-500 hover:text-gray-400'
                        }`}
                        title={workerPrefs.securityAlert.sound ? "Desactivar Aviso Sonoro" : "Activar Aviso Sonoro"}
                      >
                        {workerPrefs.securityAlert.sound ? <Volume2 size={12} /> : <VolumeX size={12} />}
                      </button>
                      {/* Visual toggle */}
                      <button 
                        type="button"
                        onClick={() => updateWorkerPref('securityAlert', 'visual', !workerPrefs.securityAlert.visual)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          workerPrefs.securityAlert.visual 
                            ? 'bg-brand-red/20 border border-brand-red/50 text-brand-red' 
                            : 'bg-black/40 border border-border-dark text-gray-500 hover:text-gray-400'
                        }`}
                        title={workerPrefs.securityAlert.visual ? "Desactivar Alerta Visual" : "Activar Alerta Visual"}
                      >
                        {workerPrefs.securityAlert.visual ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border-dark/40 flex items-center justify-between text-[8px] text-gray-500 font-mono">
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1 uppercase">
                    <CheckCircle size={10} className="animate-pulse" /> Preferencias Guardadas
                  </span>
                  <span>ID: {workerId}</span>
                </div>
              </div>

              <div className="mt-4 bg-[#d00000] p-4 rounded-2xl border border-white/10 text-white shadow-md text-center">
                <span className="text-xs font-black uppercase tracking-wider block mb-1">🔑 Sesión Laguna Verde</span>
                <p className="text-[10px] text-amber-100 mb-3">
                  Autenticado de forma segura para dar de alta socios mediante el lector óptico de identidad.
                </p>
                <button 
                  type="button"
                  onClick={() => onNavigateToTab('members')}
                  className="w-full h-8 bg-white hover:bg-amber-100 text-red-700 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider"
                >
                  Ver Lista de Socios
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PHONE BOTTOM NAVIGATION BAR (Exact 4-tab system) */}
          {/* ======================================================== */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-[#ffd1b3] border-t border-white/20 px-4 flex justify-between items-center z-20 shadow-md rounded-b-[30px]">
            {/* Tab 1: HOME (Homepage & main actions) */}
            <button 
              type="button"
              onClick={() => handleTabClick('home')} 
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                activeTab === 'home' ? 'text-[#d00000]' : 'text-amber-900/60'
              }`}
            >
              <Home size={16} className={activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.5]'} />
              <span className="text-[8px] font-extrabold tracking-wide uppercase mt-0.5">Home</span>
            </button>

            {/* Tab 2: NOTIFICACIONES */}
            <button 
              type="button"
              onClick={() => handleTabClick('notificaciones')} 
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                activeTab === 'notificaciones' ? 'text-[#d00000]' : 'text-amber-900/60'
              }`}
            >
              <Bell size={16} className={activeTab === 'notificaciones' ? 'stroke-[2.5]' : 'stroke-[1.5]'} />
              <span className="text-[8px] font-extrabold tracking-wide uppercase mt-0.5">Notificaciones</span>
            </button>

            {/* Tab 3: AJUSTES */}
            <button 
              type="button"
              onClick={() => handleTabClick('ajustes')} 
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                activeTab === 'ajustes' ? 'text-[#d00000]' : 'text-amber-900/60'
              }`}
            >
              <SettingsIcon size={16} className={activeTab === 'ajustes' ? 'stroke-[2.5]' : 'stroke-[1.5]'} />
              <span className="text-[8px] font-extrabold tracking-wide uppercase mt-0.5">Ajustes</span>
            </button>

            {/* Tab 4: SOCIOS (Members feed with filters) */}
            <button 
              type="button"
              onClick={() => handleTabClick('socios')} 
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                activeTab === 'socios' ? 'text-[#d00000]' : 'text-amber-900/60'
              }`}
            >
              <Users size={16} className={activeTab === 'socios' ? 'stroke-[2.5]' : 'stroke-[1.5]'} />
              <span className="text-[8px] font-extrabold tracking-wide uppercase mt-0.5">Socios</span>
            </button>
          </div>

        </div>
      </div>

      {/* Screen quick selectors below the phone for easy web testing */}
      <div className="flex gap-1.5 mt-4 bg-gray-900/40 p-1.5 rounded-full border border-gray-800 flex-wrap justify-center">
        <button 
          type="button"
          onClick={() => { setActiveScreen(1); setActiveTab('home'); }}
          className={`px-3 py-1 text-[10px] font-mono font-medium rounded-full transition-all ${
            activeScreen === 1 ? 'bg-brand-red text-white font-semibold' : 'text-gray-400 hover:text-white'
          }`}
        >
          📱 1: Home
        </button>
        <button 
          type="button"
          onClick={() => { setActiveScreen(2); setActiveTab('notificaciones'); }}
          className={`px-3 py-1 text-[10px] font-mono font-medium rounded-full transition-all ${
            activeScreen === 2 ? 'bg-brand-red text-white font-semibold' : 'text-gray-400 hover:text-white'
          }`}
        >
          📱 2: Push Center
        </button>
        <button 
          type="button"
          onClick={() => { setActiveScreen(3); setActiveTab('socios'); }}
          className={`px-3 py-1 text-[10px] font-mono font-medium rounded-full transition-all ${
            activeScreen === 3 ? 'bg-brand-red text-white font-semibold' : 'text-gray-400 hover:text-white'
          }`}
        >
          📱 3: List (Filtros)
        </button>
        <button 
          type="button"
          onClick={handleOpenMobileRegistration}
          className={`px-3 py-1 text-[10px] font-mono font-medium rounded-full transition-all ${
            activeScreen === 4 ? 'bg-brand-red text-white font-semibold' : 'text-gray-400 hover:text-white'
          }`}
        >
          📱 4: Lector & Alta
        </button>
        <button 
          type="button"
          onClick={() => { setActiveScreen(5); setActiveTab('ajustes'); }}
          className={`px-3 py-1 text-[10px] font-mono font-medium rounded-full transition-all ${
            activeScreen === 5 ? 'bg-brand-red text-white font-semibold' : 'text-gray-400 hover:text-white'
          }`}
        >
          📱 5: Ajustes Notif.
        </button>
        <button 
          type="button"
          onClick={() => { setActiveScreen(6); setActiveTab('perfil'); }}
          className={`px-3 py-1 text-[10px] font-mono font-medium rounded-full transition-all ${
            activeScreen === 6 ? 'bg-brand-red text-white font-semibold' : 'text-gray-400 hover:text-white'
          }`}
        >
          📱 6: Perfil Operador
        </button>
      </div>
    </div>
  );
}
