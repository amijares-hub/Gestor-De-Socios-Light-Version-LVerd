import { useState, useEffect } from 'react';
import { 
  Shield, 
  User, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  History, 
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react';
import { WorkerUser, ActivityLog } from '../types';

interface WorkersPanelProps {
  adminWorker: WorkerUser;
  workers: WorkerUser[];
  onUpdateWorker: (id: string, updatedFields: Partial<WorkerUser>) => void;
  onDeleteWorker: (id: string) => void;
  logs: ActivityLog[];
  onRefreshLogs: () => void;
}

export default function WorkersPanel({ 
  adminWorker, 
  workers, 
  onUpdateWorker, 
  onDeleteWorker,
  logs,
  onRefreshLogs
}: WorkersPanelProps) {
  const [activeTab, setActiveTab] = useState<'workers' | 'logs'>('workers');
  const [editingPermissionsId, setEditingPermissionsId] = useState<string | null>(null);

  // Granular permissions lists
  const availablePermissions = [
    { key: 'register_users', label: 'Registrar Socios' },
    { key: 'view_all', label: 'Consultar Fichas' },
    { key: 'send_push', label: 'Enviar Notificaciones' },
    { key: 'manage_workers', label: 'Gestionar Personal' },
    { key: 'export_data', label: 'Exportar Datos' },
    { key: 'delete_records', label: 'Eliminar Registros' }
  ];

  const handlePermissionToggle = (worker: WorkerUser, permission: string) => {
    let newPermissions = [...worker.permissions];
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

  return (
    <div id="admin-workers-panel" className="bg-panel-dark border border-border-dark rounded-3xl p-6 flex flex-col h-full">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-dark/60 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
            <Shield size={20} />
          </div>
          <div>
            <h4 className="text-sm font-display font-bold text-gray-200 uppercase tracking-wider">
              Consola de Administración
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Gestiona accesos, aprueba cuentas de trabajadores y revisa la auditoría
            </p>
          </div>
        </div>

        {/* Inner Tabs Selector */}
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
            onClick={() => setActiveTab('logs')}
            className={`px-4 h-8 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'logs' ? 'bg-panel-dark text-white shadow border border-border-dark' : 'text-gray-400 hover:text-white'
            }`}
          >
            <History size={13} /> Auditoría ({logs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: WORKERS LIST */}
      {activeTab === 'workers' && (
        <div className="flex-1 flex flex-col overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-border-dark font-mono text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <th className="pb-3 pl-2">Personal</th>
                <th className="pb-3">Rol</th>
                <th className="pb-3">Estado Acceso</th>
                <th className="pb-3 text-center">Permisos</th>
                <th className="pb-3 text-right pr-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/40 text-xs">
              {workers.map(worker => {
                const isSelf = worker.id === adminWorker.id;
                const isDefaultAdmin = worker.id === 'admin-default' || worker.id === 'worker-demo';
                const isEditingPermissions = editingPermissionsId === worker.id;

                return (
                  <tr key={worker.id} className="hover:bg-brand-dark/25 transition-colors group">
                    {/* Name & Email */}
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-900 border border-border-dark flex items-center justify-center text-gray-400 font-semibold uppercase">
                          {worker.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-200">{worker.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{worker.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role Tag and Toggle */}
                    <td className="py-3.5">
                      <button 
                        disabled={isSelf || isDefaultAdmin}
                        onClick={() => handleRoleToggle(worker)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                          worker.role === 'admin' 
                            ? 'bg-brand-red/10 border-brand-red/25 text-brand-red hover:bg-brand-red/20' 
                            : 'bg-gray-900 border-border-dark text-gray-400 hover:border-gray-600'
                        }`}
                        title={isSelf ? "No puedes cambiar tu propio rol" : "Haz clic para cambiar rol"}
                      >
                        {worker.role}
                      </button>
                    </td>

                    {/* Active Toggle approval */}
                    <td className="py-3.5">
                      <button 
                        disabled={isSelf || isDefaultAdmin}
                        onClick={() => handleActiveToggle(worker)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                          worker.active 
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20' 
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-400 hover:bg-rose-500/20 animate-pulse'
                        }`}
                        title={isSelf ? "No puedes suspenderte a ti mismo" : "Haz clic para cambiar acceso"}
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

                    {/* Permissions Config Drawer Trigger */}
                    <td className="py-3.5 text-center">
                      {isEditingPermissions ? (
                        <div className="inline-flex flex-wrap gap-1 max-w-[280px] p-2 bg-black/40 border border-border-dark rounded-xl text-[10px]">
                          {availablePermissions.map(p => {
                            const hasPerm = worker.permissions.includes(p.key);
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
                          disabled={isSelf || isDefaultAdmin}
                          onClick={() => setEditingPermissionsId(worker.id)}
                          className="px-3 py-1 bg-gray-900 hover:bg-brand-dark text-gray-300 font-semibold border border-border-dark rounded-lg flex items-center gap-1.5 mx-auto transition-all text-[11px]"
                        >
                          <Sliders size={11} /> {worker.permissions.length} Permisos
                        </button>
                      )}
                    </td>

                    {/* Delete worker */}
                    <td className="py-3.5 text-right pr-2">
                      <button 
                        disabled={isSelf || isDefaultAdmin}
                        onClick={() => onDeleteWorker(worker.id)}
                        className={`p-1.5 rounded-lg border border-transparent transition-all ${
                          isSelf || isDefaultAdmin 
                            ? 'text-gray-700 cursor-not-allowed' 
                            : 'text-gray-400 hover:text-brand-red hover:bg-brand-red/10 hover:border-brand-red/20'
                        }`}
                        title="Eliminar trabajador del sistema"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Locked indicators */}
          <div className="mt-5 p-4 rounded-xl bg-gray-900/30 border border-border-dark text-gray-500 text-[11px] flex gap-2 items-center leading-relaxed">
            <Lock size={14} className="shrink-0 text-gray-600" />
            <p>Los trabajadores predeterminados del sistema de pruebas de Laguna Verde (<span className="font-mono text-gray-400">admin-default</span> y <span className="font-mono text-gray-400">worker-demo</span>) están bloqueados por seguridad y no admiten modificaciones ni eliminación.</p>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT HISTORY LOGS */}
      {activeTab === 'logs' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase">
              Registros Históricos Recientes (Inversos)
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
              <p className="text-gray-600 text-center py-6">No hay registros de auditoría registrados.</p>
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

    </div>
  );
}
