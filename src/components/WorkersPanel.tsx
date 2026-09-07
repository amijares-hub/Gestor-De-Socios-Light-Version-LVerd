import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  User, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  History, 
  RefreshCw,
  Sliders,
  Check,
  KeyRound,
  Edit3,
  X,
  AlertCircle,
  Upload,
  Sparkles
} from 'lucide-react';
import { WorkerUser, ActivityLog } from '../types';
import { supabase } from '../supabaseClient';

interface WorkersPanelProps {
  adminWorker: WorkerUser;
  workers: WorkerUser[];
  onUpdateWorker: (id: string, updatedFields: Partial<WorkerUser>) => void;
  onDeleteWorker: (id: string) => void;
  logs: ActivityLog[];
  onRefreshLogs: () => void;
  appName?: string;
  appLogo?: string | null;
  onUpdateAppSettings?: (newName: string, newLogo: string | null) => Promise<void>;
}

export default function WorkersPanel({ 
  adminWorker, 
  workers, 
  onUpdateWorker, 
  onDeleteWorker,
  logs,
  onRefreshLogs,
  appName = 'SVADHISTHANA',
  appLogo = null,
  onUpdateAppSettings
}: WorkersPanelProps) {
  const [activeTab, setActiveTab] = useState<'workers' | 'settings' | 'logs'>('workers');
  const [editingPermissionsId, setEditingPermissionsId] = useState<string | null>(null);

  const [editAppName, setEditAppName] = useState<string>(appName || 'SVADHISTHANA');
  const [editAppLogo, setEditAppLogo] = useState<string | null>(appLogo);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (appName) setEditAppName(appName);
    setEditAppLogo(appLogo);
  }, [appName, appLogo]);

  const [selectedWorkerForPass, setSelectedWorkerForPass] = useState<WorkerUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const [selectedWorkerForName, setSelectedWorkerForName] = useState<WorkerUser | null>(null);
  const [newName, setNewName] = useState('');
  const [nameMessage, setNameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const availablePermissions = [
    { key: 'register_users', label: 'Registrar Socios' },
    { key: 'view_all', label: 'Consultar Fichas' },
    { key: 'send_push', label: 'Enviar Notificaciones' },
    { key: 'manage_workers', label: 'Gestionar Personal' },
    { key: 'export_data', label: 'Exportar Datos' },
    { key: 'delete_records', label: 'Eliminar Registros' }
  ];

  const handlePermissionToggle = (worker: WorkerUser, permission: string) => {
    let newPermissions = [...(worker.permissions || [])];
    if (newPermissions.includes(permission)) {
      newPermissions = newPermissions.filter(p => p !== permission);
    } else {
      newPermissions.push(permission);
    }
    onUpdateWorker(worker.id, { permissions: newPermissions });
  };

  const handleRoleToggle = (worker: WorkerUser) => {
    const nextRole = worker.role === 'admin' ? 'worker' : 'admin';
    onUpdateWorker(worker.id, { role: nextRole });
  };

  const handleActiveToggle = (worker: WorkerUser) => {
    onUpdateWorker(worker.id, { active: !worker.active });
  };

  const handleSaveAppSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAppName || !editAppName.trim()) return;

    setIsSavingSettings(true);
    setSettingsSuccess(null);

    try {
      if (onUpdateAppSettings) {
        await onUpdateAppSettings(editAppName.trim().toUpperCase(), editAppLogo);
      }
      setSettingsSuccess('¡Branding del App actualizado con éxito!');
      setTimeout(() => setSettingsSuccess(null), 2500);
    } catch (err: any) {
      alert('Error guardando configuración: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 300, 300);
          const compressedLogo = canvas.toDataURL('image/png', 0.85);
          setEditAppLogo(compressedLogo);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAdminChangeName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerForName) return;
    setNameMessage(null);

    if (newName.trim().length < 2) {
      setNameMessage({ type: 'error', text: 'El nombre debe tener al menos 2 caracteres.' });
      return;
    }

    setIsUpdatingName(true);

    try {
      const { error } = await supabase
        .from('workers')
        .update({ name: newName.trim() })
        .eq('id', selectedWorkerForName.id);

      if (error) throw error;

      onUpdateWorker(selectedWorkerForName.id, { name: newName.trim() });
      setNameMessage({ type: 'success', text: 'Nombre de usuario actualizado correctamente.' });

      setTimeout(() => {
        setSelectedWorkerForName(null);
        setNewName('');
        setNameMessage(null);
      }, 1000);

    } catch (err: any) {
      setNameMessage({ type: 'error', text: err.message || 'Error al actualizar nombre.' });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleAdminChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerForPass) return;
    setPassMessage(null);

    if (newPassword.trim().length < 4) {
      setPassMessage({ type: 'error', text: 'La contraseña debe tener al menos 4 caracteres.' });
      return;
    }

    setIsUpdatingPass(true);

    try {
      const { error } = await supabase
        .from('workers')
        .update({ password: newPassword.trim() })
        .eq('id', selectedWorkerForPass.id);

      if (error) throw error;

      onUpdateWorker(selectedWorkerForPass.id, { password: newPassword.trim() });
      setPassMessage({ type: 'success', text: `Contraseña de ${selectedWorkerForPass.name} actualizada.` });

      setTimeout(() => {
        setSelectedWorkerForPass(null);
        setNewPassword('');
        setPassMessage(null);
      }, 1000);

    } catch (err: any) {
      setPassMessage({ type: 'error', text: err.message || 'Error al actualizar contraseña.' });
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const safeAppName = editAppName || appName || 'SVADHISTHANA';

  return (
    <div id="admin-workers-panel" className="bg-panel-dark border border-border-dark rounded-3xl p-6 flex flex-col h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-dark/60 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
            <Shield size={20} />
          </div>
          <div>
            <h4 className="text-sm font-display font-bold text-gray-200 uppercase tracking-wider">
              Consola de Administración {safeAppName}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Personaliza el App, gestiona usuarios, contraseñas, accesos y permisos
            </p>
          </div>
        </div>

        <div className="flex p-1 bg-brand-dark rounded-xl border border-border-dark self-start sm:self-center">
          <button 
            onClick={() => setActiveTab('workers')}
            className={`px-4 h-8 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'workers' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
            }`}
          >
            <User size={13} /> Trabajadores ({workers.length})
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 h-8 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'settings' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles size={13} className="text-amber-400" /> Branding del App
          </button>

          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-4 h-8 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'logs' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
            }`}
          >
            <History size={13} /> Auditoría ({logs.length})
          </button>
        </div>
      </div>

      {activeTab === 'workers' && (
        <div className="flex-1 flex flex-col overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-border-dark font-mono text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <th className="pb-3 pl-2">Personal / Usuario</th>
                <th className="pb-3">Rol</th>
                <th className="pb-3">Estado Acceso</th>
                <th className="pb-3 text-center">Permisos</th>
                <th className="pb-3 text-right pr-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/40 text-xs">
              {workers.map(worker => {
                const isSelf = worker.id === adminWorker.id;
                const isEditingPermissions = editingPermissionsId === worker.id;

                return (
                  <tr key={worker.id} className="hover:bg-brand-dark/25 transition-colors group">
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-900 border border-border-dark flex items-center justify-center text-gray-400 font-semibold uppercase">
                          {worker.name ? worker.name[0] : 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-200">{worker.name}</p>
                            {isSelf && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">(Tú)</span>}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">{worker.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5">
                      <button 
                        disabled={isSelf}
                        onClick={() => handleRoleToggle(worker)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                          worker.role === 'admin' 
                            ? 'bg-brand-red/10 border-brand-red/25 text-brand-red hover:bg-brand-red/20' 
                            : 'bg-gray-900 border-border-dark text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {worker.role}
                      </button>
                    </td>

                    <td className="py-3.5">
                      <button 
                        disabled={isSelf}
                        onClick={() => handleActiveToggle(worker)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                          worker.active 
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20' 
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-400 hover:bg-rose-500/20 animate-pulse'
                        }`}
                      >
                        {worker.active ? (
                          <>
                            <CheckCircle2 size={12} /> ACTIVO
                          </>
                        ) : (
                          <>
                            <XCircle size={12} /> PENDIENTE
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 text-center">
                      {isEditingPermissions ? (
                        <div className="inline-flex flex-wrap gap-1 max-w-[280px] p-2 bg-black/40 border border-border-dark rounded-xl text-[10px]">
                          {availablePermissions.map(p => {
                            const hasPerm = worker.permissions?.includes(p.key);
                            return (
                              <button
                                key={p.key}
                                onClick={() => handlePermissionToggle(worker, p.key)}
                                className={`px-2 py-0.5 rounded font-medium flex items-center gap-1 transition-all ${
                                  hasPerm 
                                    ? 'bg-brand-red/20 text-brand-red border border-brand-red/35' 
                                    : 'bg-gray-900 text-gray-500 border border-transparent hover:border-gray-700'
                                }`}
                              >
                                {hasPerm && <Check size={8} />} {p.label}
                              </button>
                            );
                          })}
                          <button 
                            onClick={() => setEditingPermissionsId(null)}
                            className="px-2 py-0.5 bg-gray-800 text-white font-bold rounded"
                          >
                            Listo
                          </button>
                        </div>
                      ) : (
                        <button 
                          disabled={isSelf}
                          onClick={() => setEditingPermissionsId(worker.id)}
                          className="px-3 py-1 bg-gray-900 hover:bg-brand-dark text-gray-300 font-semibold border border-border-dark rounded-lg flex items-center gap-1.5 mx-auto transition-all text-[11px]"
                        >
                          <Sliders size={11} /> {worker.permissions?.length || 0} Permisos
                        </button>
                      )}
                    </td>

                    <td className="py-3.5 text-right pr-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedWorkerForName(worker);
                            setNewName(worker.name);
                            setNameMessage(null);
                          }}
                          className="p-1.5 rounded-lg bg-brand-dark hover:bg-gray-800 text-emerald-400 hover:text-emerald-300 border border-border-dark transition-all"
                          title="Editar Nombre de Usuario"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedWorkerForPass(worker);
                            setNewPassword('');
                            setPassMessage(null);
                          }}
                          className="p-1.5 rounded-lg bg-brand-dark hover:bg-gray-800 text-amber-400 hover:text-amber-300 border border-border-dark transition-all"
                          title="Cambiar contraseña de este usuario"
                        >
                          <KeyRound size={14} />
                        </button>

                        <button 
                          disabled={isSelf}
                          onClick={() => onDeleteWorker(worker.id)}
                          className={`p-1.5 rounded-lg border border-transparent transition-all ${
                            isSelf 
                              ? 'text-gray-700 cursor-not-allowed' 
                              : 'text-gray-400 hover:text-brand-red hover:bg-brand-red/10 hover:border-brand-red/20'
                          }`}
                          title="Eliminar trabajador"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <form onSubmit={handleSaveAppSettings} className="max-w-xl mx-auto w-full space-y-6 py-2 text-xs">
          <div className="bg-brand-dark p-5 border border-border-dark rounded-2xl space-y-4">
            <h4 className="text-sm font-bold text-white uppercase flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" /> Personalización Visual de la Aplicación
            </h4>
            <p className="text-gray-400 leading-relaxed">
              Cambia el nombre oficial del negocio y sube una imagen como Avatar/Logo.
            </p>

            {settingsSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{settingsSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold mb-1.5">
                Nombre de la Aplicación / Negocio *
              </label>
              <input
                type="text"
                required
                value={editAppName}
                onChange={e => setEditAppName(e.target.value.toUpperCase())}
                placeholder="Ej: SVADHISTHANA"
                className="w-full h-11 px-4 bg-panel-dark border border-border-dark rounded-xl text-sm font-bold text-white uppercase focus:outline-none focus:border-brand-red"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-mono text-gray-400 uppercase font-bold">
                Logo / Avatar Oficial
              </label>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 border border-emerald-400/50 flex items-center justify-center text-white font-black text-xl overflow-hidden shrink-0 shadow-lg">
                  {editAppLogo ? (
                    <img src={editAppLogo} alt="Logo App" className="w-full h-full object-cover" />
                  ) : (
                    safeAppName.slice(0, 2)
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="px-4 py-2 bg-panel-dark border border-border-dark hover:border-brand-red text-gray-200 rounded-xl font-bold uppercase text-[11px] inline-flex items-center gap-2 cursor-pointer transition-all">
                    <Upload size={14} className="text-brand-red" />
                    <span>Subir Nueva Imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>

                  {editAppLogo && (
                    <button
                      type="button"
                      onClick={() => setEditAppLogo(null)}
                      className="block text-[10px] text-rose-400 hover:underline font-bold"
                    >
                      Quitar logo (Usar iniciales por defecto)
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="w-full h-11 bg-brand-red hover:bg-brand-red-hover text-white font-bold uppercase text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 mt-4"
            >
              {isSavingSettings ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              <span>Guardar Personalización</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'logs' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase">
              Registros Históricos Recientes
            </span>
            <button 
              onClick={onRefreshLogs}
              className="px-2.5 py-1 bg-gray-900 hover:bg-brand-dark text-gray-300 font-semibold border border-border-dark rounded-lg flex items-center gap-1 text-[10px] transition-all"
            >
              <RefreshCw size={10} /> Actualizar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[380px] border border-border-dark rounded-xl bg-brand-dark/50 p-4 font-mono text-[11px] flex flex-col gap-3.5">
            {logs.length === 0 ? (
              <p className="text-gray-600 text-center py-6">No hay registros de auditoría.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="border-b border-border-dark/40 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row justify-between text-gray-500 text-[9px] mb-1 gap-1">
                    <span>📅 {new Date(log.timestamp).toLocaleString()}</span>
                    <span className="text-gray-600">ID: #{log.id}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-gray-200">
                    <span className="px-1.5 py-0.5 rounded bg-brand-red/10 text-brand-red text-[9px] font-bold uppercase tracking-wider">
                      {log.action}
                    </span>
                    <span className="text-gray-400 font-sans">por</span>
                    <span className="font-bold text-gray-300">{log.workerName}</span>
                    <span className="text-gray-600 font-sans">({log.workerRole})</span>
                  </div>
                  <p className="text-gray-400 mt-1 font-sans text-xs leading-relaxed pl-1 border-l-2 border-brand-red/20">
                    {log.details}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Editar Nombre */}
      {selectedWorkerForName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-panel-dark border border-border-dark rounded-3xl p-6 max-w-sm w-full relative space-y-4 shadow-2xl">
            <button 
              onClick={() => setSelectedWorkerForName(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 border-b border-border-dark pb-3">
              <Edit3 className="text-emerald-400" size={20} />
              <h3 className="text-sm font-bold text-white uppercase">Editar Nombre de Usuario</h3>
            </div>

            {nameMessage && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                nameMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {nameMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{nameMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleAdminChangeName} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Nuevo Nombre / Usuario</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej: El Big Boss"
                  className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingName}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                {isUpdatingName ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                <span>Guardar Nombre</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cambiar Contraseña */}
      {selectedWorkerForPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-panel-dark border border-border-dark rounded-3xl p-6 max-w-sm w-full relative space-y-4 shadow-2xl">
            <button 
              onClick={() => setSelectedWorkerForPass(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 border-b border-border-dark pb-3">
              <KeyRound className="text-brand-red" size={20} />
              <h3 className="text-sm font-bold text-white uppercase">Cambiar Contraseña</h3>
            </div>

            {passMessage && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                passMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {passMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{passMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleAdminChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Nueva Contraseña</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Ej: worker123"
                  className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-brand-red"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPass}
                className="w-full h-11 bg-brand-red hover:bg-brand-red-hover text-white font-bold text-xs uppercase rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                {isUpdatingPass ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                <span>Guardar Nueva Contraseña</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}