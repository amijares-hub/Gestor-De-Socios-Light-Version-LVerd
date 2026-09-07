import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldAlert, 
  LogOut, 
  UserPlus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react';
import { supabase } from './supabaseClient';

import { WorkerUser, AssociationMember, RealTimeNotification, ActivityLog } from './types';
import SocioTemplate from './components/SocioTemplate';
import WorkersPanel from './components/WorkersPanel';
import WorkerPortal from './components/WorkerPortal';
import DuplicateWarningModal from './components/DuplicateWarningModal';
import DashboardStats from './components/DashboardStats';
import DniPhotoCapture from './components/DniPhotoCapture';
import { generateSvadhisthanaAltaPdf } from './utils/pdfGenerator';

const mapMemberFromDB = (m: any): AssociationMember & { dniFrontImage?: string; dniBackImage?: string } => ({
  id: m.id,
  firstName: m.first_name || '',
  lastName: m.last_name || '',
  dniPassport: m.dni_passport || '',
  documentType: m.document_type || 'DNI',
  nationality: m.nationality || 'ESPAÑOLA',
  birthDate: m.birth_date || '',
  expiryDate: m.expiry_date || '',
  email: m.email || '',
  phone: m.phone || '',
  address: m.address || '',
  gender: m.gender || 'MASCULINO',
  registrationStatus: m.registration_status || 'approved',
  registerDate: m.created_at || new Date().toISOString(),
  registeredBy: {
    id: m.registered_by || 'admin',
    name: 'Sistema / Agente'
  },
  dniFrontImage: m.dni_front_image || null,
  dniBackImage: m.dni_back_image || null
});

export default function App() {
  const [workerSession, setWorkerSession] = useState<WorkerUser | null>(() => {
    try {
      const saved = localStorage.getItem('svadhisthana_worker_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [appName, setAppName] = useState<string>('SVADHISTHANA');
  const [appLogo, setAppLogo] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

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

  const [activeTab, setActiveTab] = useState<string>('members');
  const [members, setMembers] = useState<AssociationMember[]>([]);
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [selectedMember, setSelectedMember] = useState<AssociationMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [docTypeFilter] = useState<'all' | 'DNI' | 'PASSPORT'>('all');

  const [privacyMode] = useState<boolean>(() => {
    return localStorage.getItem('laguna_privacy_mode') !== 'false';
  });
  const [revealedDniIds] = useState<Record<string, boolean>>({});

  const formatMaskedDni = (dni: string, isRevealed: boolean) => {
    if (isRevealed || !privacyMode) return dni;
    if (!dni) return '••••••';
    const clean = dni.trim();
    if (clean.length <= 4) return '••••••••';
    return `${clean.slice(0, 2)}••••${clean.slice(-2)}`;
  };

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
  const [formDniFront, setFormDniFront] = useState<string | null>(null);
  const [formDniBack, setFormDniBack] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRegisteredMember, setLastRegisteredMember] = useState<AssociationMember | null>(null);

  const fetchAppSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        if (data.app_name) setAppName(data.app_name);
        if (data.app_logo) setAppLogo(data.app_logo);
      }
    } catch (e) {
      console.error("Error obteniendo app_settings:", e);
    }
  };

  useEffect(() => {
    fetchAppSettings();
  }, []);

  useEffect(() => {
    document.title = `${appName} - Panel Oficial`;
  }, [appName]);

  const handleUpdateAppSettings = async (newName: string, newLogo: string | null) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 1, app_name: newName, app_logo: newLogo, updated_at: new Date().toISOString() });

    if (error) throw error;

    setAppName(newName);
    setAppLogo(newLogo);
  };

  const loadData = async () => {
    try {
      const { data: membersData } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (membersData) {
        setMembers(membersData.map(mapMemberFromDB));
      }

      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (notifData) {
        setNotifications(notifData.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: n.created_at,
          senderName: 'Sistema',
          senderRole: 'admin',
          priority: n.priority
        })));
      }

      const { data: logsData } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsData) {
        setActivityLogs(logsData.map((l: any) => ({
          id: l.id,
          timestamp: l.created_at,
          workerName: 'Agente',
          workerRole: 'worker',
          action: l.action,
          details: l.details,
          memberId: l.member_id,
          changes: l.changes
        })));
      }

      const { data: workersData } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false });

      if (workersData) {
        setWorkers(workersData);
      }
    } catch (e) {
      console.error("Error al cargar datos:", e);
    }
  };

  useEffect(() => {
    if (workerSession) {
      localStorage.setItem('svadhisthana_worker_session', JSON.stringify(workerSession));
      loadData();

      const channel = supabase.channel('public-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workers' }, () => loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => fetchAppSettings())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      localStorage.removeItem('svadhisthana_worker_session');
    }
  }, [workerSession]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const inputVal = authIdentifier.trim();

    try {
      if (authMode === 'login') {
        const { data: worker, error } = await supabase
          .from('workers')
          .select('*')
          .or(`email.ilike.${inputVal},name.ilike.${inputVal}`)
          .eq('password', authPassword.trim())
          .maybeSingle();

        if (error || !worker) {
          throw new Error('Credenciales incorrectas o usuario no encontrado.');
        }

        if (!worker.active) {
          throw new Error('Esta cuenta está pendiente de aprobación por un administrador.');
        }

        setWorkerSession(worker);
        localStorage.setItem('svadhisthana_worker_session', JSON.stringify(worker));
      } else {
        const { data, error } = await supabase
          .from('workers')
          .insert([{
            name: authName.trim(),
            email: inputVal,
            password: authPassword.trim(),
            role: 'worker',
            active: true
          }])
          .select()
          .single();

        if (error) throw new Error(error.message);

        setWorkerSession(data);
        localStorage.setItem('svadhisthana_worker_session', JSON.stringify(data));
      }
    } catch (err: any) {
      setAuthError(err.message || "Error al procesar la solicitud.");
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('svadhisthana_worker_session');
    setWorkerSession(null);
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanDoc = formDniPassport.trim().toUpperCase();
    if (!cleanDoc || !formFirstName.trim() || !formLastName.trim()) {
      setFormError('Por favor, completa los campos obligatorios (*).');
      return;
    }

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

    setIsSubmitting(true);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workerSession?.id || '');
      const validWorkerId = isUuid ? workerSession?.id : null;

      const { data, error } = await supabase
        .from('members')
        .insert([{
          first_name: formFirstName.trim().toUpperCase(),
          last_name: formLastName.trim().toUpperCase(),
          dni_passport: cleanDoc,
          document_type: formDocType,
          nationality: formNationality.trim().toUpperCase(),
          birth_date: formBirthDate || null,
          expiry_date: formExpiryDate || null,
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          address: formAddress.trim() || null,
          registration_status: 'approved',
          registered_by: validWorkerId,
          dni_front_image: formDniFront,
          dni_back_image: formDniBack
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
        registeredBy: { id: workerSession?.id || 'admin', name: workerSession?.name || 'Admin' }
      };

      setLastRegisteredMember(newMember);
      setFormSuccess(`🎉 Socio ${data.first_name} ${data.last_name} guardado con éxito.`);
      loadData();

      setFormFirstName('');
      setFormLastName('');
      setFormDniPassport('');
      setFormBirthDate('');
      setFormExpiryDate('');
      setFormEmail('');
      setFormPhone('');
      setFormAddress('');
      setFormDniFront(null);
      setFormDniBack(null);

    } catch (err: any) {
      setFormError(err.message || 'Error al registrar el socio en Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (id: string, skipConfirm = false) => {
    if (!skipConfirm && !confirm("¿Estás seguro de dar de baja este socio permanentemente?")) return false;

    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== id));
      if (selectedMember?.id === id) setSelectedMember(null);
      return true;
    } catch (e: any) {
      console.error("Error eliminando socio:", e.message);
      alert(`Error al eliminar socio: ${e.message}`);
      return false;
    }
  };

  const handleUpdateMember = async (updatedMember: AssociationMember) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .update({
          first_name: updatedMember.firstName,
          last_name: updatedMember.lastName,
          dni_passport: updatedMember.dniPassport,
          document_type: updatedMember.documentType,
          nationality: updatedMember.nationality,
          birth_date: updatedMember.birthDate || null,
          expiry_date: updatedMember.expiryDate || null,
          email: updatedMember.email || null,
          phone: updatedMember.phone || null,
          address: updatedMember.address || null,
          registration_status: updatedMember.registrationStatus
        })
        .eq('id', updatedMember.id)
        .select()
        .single();

      if (error) throw error;

      const mapped = mapMemberFromDB(data);
      setMembers(prev => prev.map(m => m.id === mapped.id ? mapped : m));
      if (selectedMember?.id === mapped.id) setSelectedMember(mapped);
      return true;
    } catch (e: any) {
      console.error("Error al actualizar socio:", e.message);
      return false;
    }
  };

  const handleUpdateWorker = async (id: string, updatedFields: Partial<WorkerUser>) => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .update(updatedFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setWorkers(prev => prev.map(w => w.id === id ? { ...w, ...data } : w));

      if (workerSession && id === workerSession.id) {
        const updatedSession = { ...workerSession, ...data };
        setWorkerSession(updatedSession);
        localStorage.setItem('svadhisthana_worker_session', JSON.stringify(updatedSession));
      }
    } catch (e: any) {
      console.error("Error al actualizar trabajador:", e.message);
      alert(`Error al actualizar trabajador: ${e.message}`);
    }
  };

  const handleDeleteWorker = async (id: string) => {
    if (!confirm("¿Desvincular a este trabajador permanentemente?")) return;
    try {
      await supabase.from('workers').delete().eq('id', id);
      setWorkers(prev => prev.filter(w => w.id !== id));
    } catch (e: any) {
      console.error("Error al eliminar trabajador:", e.message);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchSearch = 
      m.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.dniPassport.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'all' || m.registrationStatus === statusFilter;
    const matchDocType = docTypeFilter === 'all' || m.documentType === docTypeFilter;

    return matchSearch && matchStatus && matchDocType;
  });

  if (!workerSession) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-panel-dark border border-border-dark rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center font-black text-white text-xl mb-3 overflow-hidden shadow-lg border border-emerald-400/40">
              {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-cover" /> : appName.slice(0, 2)}
            </div>
            <span className="text-[10px] font-mono text-brand-red font-extrabold tracking-widest uppercase">
              ASOCIACIÓN CANNABICA {appName}
            </span>
            <h1 className="text-2xl font-display font-black text-white mt-1 uppercase tracking-tight">
              Acceso de Personal
            </h1>
          </div>

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            {authMode === 'register' && (
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="text-gray-400 font-bold uppercase font-mono">Nombre Completo / Usuario</label>
                <input 
                  type="text" 
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  placeholder="Ej. Trabajador Svadhisthana"
                  className="h-11 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-brand-red"
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-gray-400 font-bold uppercase font-mono">Correo O Nombre de Usuario</label>
              <input 
                type="text" 
                value={authIdentifier}
                onChange={e => setAuthIdentifier(e.target.value)}
                placeholder="Ej. admin@svadhisthana.es O El Big Boss"
                className="h-11 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-brand-red"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-gray-400 font-bold uppercase font-mono">Contraseña</label>
              <input 
                type="password" 
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 bg-brand-dark text-gray-200 border border-border-dark rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-brand-red"
                required
              />
            </div>

            <button 
              type="submit" 
              className="h-11 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold text-sm tracking-wide uppercase transition-all mt-2"
            >
              {authMode === 'login' ? 'Iniciar Sesión' : 'Registrar Cuenta'}
            </button>
          </form>

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

          <div className="mt-6 border-t border-border-dark pt-5 text-center">
            <button 
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(null); }}
              className="text-xs font-semibold text-gray-400 hover:text-white"
            >
              {authMode === 'login' ? '¿Eres nuevo trabajador? Registrarse' : '¿Ya tienes cuenta? Acceder'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (workerSession.role !== 'admin') {
    return (
      <>
        <WorkerPortal 
          activeWorker={workerSession}
          members={members}
          onSelectMember={(member) => setSelectedMember(member)}
          onMemberRegistered={(newMember) => setMembers(prev => [newMember, ...prev])}
          onLogout={handleLogout}
          notifications={notifications}
          realtimeConnected={true}
          onUpdateMember={handleUpdateMember}
          onDeleteMember={handleDeleteMember}
          appName={appName}
          appLogo={appLogo}
        />

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

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col relative text-gray-200">
      <header className="h-16 border-b border-border-dark bg-panel-dark/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-xs overflow-hidden shadow">
            {appLogo ? <img src={appLogo} alt="Logo" className="w-full h-full object-cover" /> : appName.slice(0, 2)}
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase">{appName}</h1>
            <p className="text-[9px] font-mono text-gray-500 font-bold">ADMIN PANEL</p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 bg-brand-dark p-1 border border-border-dark rounded-xl text-xs font-semibold">
          <button 
            onClick={() => setActiveTab('members')}
            className={`px-4 py-1.5 rounded-lg ${activeTab === 'members' ? 'bg-panel-dark text-white' : 'text-gray-400'}`}
          >
            <Users size={13} /> Socios ({members.length})
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={`px-4 py-1.5 rounded-lg ${activeTab === 'register' ? 'bg-panel-dark text-white' : 'text-gray-400'}`}
          >
            <UserPlus size={13} /> Alta Socio
          </button>
          <button 
            onClick={() => setActiveTab('workers')}
            className={`px-4 py-1.5 rounded-lg ${activeTab === 'workers' ? 'bg-panel-dark text-white' : 'text-gray-400'}`}
          >
            <ShieldAlert size={13} /> Personal & Auditoría
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-white leading-none">{workerSession.name}</p>
            <p className="text-[10px] font-mono text-gray-500 uppercase">{workerSession.role}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-brand-red">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {activeTab === 'members' && (
          <div className="space-y-6">
            <DashboardStats members={members} />

            <div className="bg-panel-dark border border-border-dark rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white uppercase">Directorio de Miembros ({members.length})</h2>
                <button 
                  onClick={() => setActiveTab('register')}
                  className="px-4 py-2 bg-brand-red text-white rounded-xl text-xs font-bold uppercase"
                >
                  <UserPlus size={14} /> Registrar Socio Nuevo
                </button>
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Buscar por nombre, DNI..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 bg-brand-dark text-gray-200 border border-border-dark rounded-xl pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMembers.map(member => (
                  <div key={member.id} className="bg-brand-dark border border-border-dark rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 font-bold uppercase">
                        {member.documentType}: {formatMaskedDni(member.dniPassport, !!revealedDniIds[member.id])}
                      </span>
                      <h4 className="text-sm font-bold text-white">{member.lastName}, {member.firstName}</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">{member.email || 'Sin correo'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedMember(member)}
                        className="px-3 py-1 bg-gray-900 border border-border-dark text-xs font-bold text-gray-300 rounded-lg"
                      >
                        Ficha
                      </button>
                      <button 
                        onClick={() => handleDeleteMember(member.id)}
                        className="p-1.5 bg-gray-900 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 rounded-lg border border-border-dark"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ALTA OFICIAL DE SOCIO EN VISTA ADMIN */}
        {activeTab === 'register' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <div className="lg:col-span-5 space-y-4">
              <DniPhotoCapture
                frontImage={formDniFront}
                backImage={formDniBack}
                onChangeFront={setFormDniFront}
                onChangeBack={setFormDniBack}
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
                    Agente: {workerSession.name.split(' ')[0]}
                  </span>
                </div>

                {formError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="shrink-0 text-emerald-400" />
                      <p className="font-semibold">{formSuccess}</p>
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
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Tipo Documento *
                      </label>
                      <select
                        value={formDocType}
                        onChange={(e: any) => setFormDocType(e.target.value)}
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
                      <input
                        type="text"
                        required
                        value={formDniPassport}
                        onChange={(e) => setFormDniPassport(e.target.value.toUpperCase())}
                        placeholder="Ej: 12345678Z o AA123456"
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-brand-red"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Nombre(s) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formFirstName}
                        onChange={(e) => setFormFirstName(e.target.value)}
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
                        value={formLastName}
                        onChange={(e) => setFormLastName(e.target.value)}
                        placeholder="Ej: GARCÍA LÓPEZ"
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white uppercase focus:outline-none focus:border-brand-red font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Nacionalidad
                      </label>
                      <input
                        type="text"
                        value={formNationality}
                        onChange={(e) => setFormNationality(e.target.value)}
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
                        value={formBirthDate}
                        onChange={(e) => setFormBirthDate(e.target.value)}
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-brand-red"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Validez Documento
                      </label>
                      <input
                        type="date"
                        value={formExpiryDate}
                        onChange={(e) => setFormExpiryDate(e.target.value)}
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-brand-red"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
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
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+34 600 000 000"
                        className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-brand-red font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Dirección de Residencia
                    </label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Calle, Número, Piso, Ciudad"
                      className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none focus:border-brand-red font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-brand-red hover:bg-brand-red-hover disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? 'Registrando Socio...' : 'Confirmar y Registrar Socio Oficial'}
                  </button>
                </form>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'workers' && (
          <WorkersPanel 
            adminWorker={workerSession}
            workers={workers}
            onUpdateWorker={handleUpdateWorker}
            onDeleteWorker={handleDeleteWorker}
            logs={activityLogs}
            onRefreshLogs={loadData}
            appName={appName}
            appLogo={appLogo}
            onUpdateAppSettings={handleUpdateAppSettings}
          />
        )}
      </main>

      {selectedMember && (
        <SocioTemplate 
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdateMember={handleUpdateMember}
          onDeleteMember={handleDeleteMember}
          currentWorker={workerSession}
        />
      )}
    </div>
  );
}