import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Eye, 
  Bell, 
  Sliders, 
  UserPlus, 
  Scan, 
  Clock, 
  Edit3, 
  ShieldAlert, 
  Radio, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { WorkerUser } from '../types';

export interface ActivityPrefItem {
  sound: boolean;
  visual: boolean;
}

export interface WorkerPreferences {
  memberReg: ActivityPrefItem;
  ocrScan: ActivityPrefItem;
  docExpiry: ActivityPrefItem;
  memberUpdate: ActivityPrefItem;
  securityAlert: ActivityPrefItem;
  pushMessage: ActivityPrefItem;
  masterSound: boolean;
}

export const defaultWorkerPrefs: WorkerPreferences = {
  memberReg: { sound: true, visual: true },
  ocrScan: { sound: true, visual: true },
  docExpiry: { sound: false, visual: true },
  memberUpdate: { sound: true, visual: true },
  securityAlert: { sound: true, visual: true },
  pushMessage: { sound: true, visual: true },
  masterSound: true
};

interface WorkerAlertPreferencesPanelProps {
  activeWorker: WorkerUser;
  prefs: WorkerPreferences;
  onUpdatePrefs: (updated: WorkerPreferences) => void;
  playBeep?: (freq?: number, type?: OscillatorType, duration?: number) => void;
  compact?: boolean;
}

export default function WorkerAlertPreferencesPanel({
  activeWorker,
  prefs,
  onUpdatePrefs,
  playBeep,
  compact = false
}: WorkerAlertPreferencesPanelProps) {
  
  const handleToggleSound = (key: keyof Omit<WorkerPreferences, 'masterSound'>) => {
    const current = prefs[key];
    const nextSound = !current.sound;
    const updated: WorkerPreferences = {
      ...prefs,
      [key]: { ...current, sound: nextSound }
    };
    onUpdatePrefs(updated);
    if (nextSound && prefs.masterSound && playBeep) {
      playBeep(880, 'sine', 0.12);
    }
  };

  const handleToggleVisual = (key: keyof Omit<WorkerPreferences, 'masterSound'>) => {
    const current = prefs[key];
    const updated: WorkerPreferences = {
      ...prefs,
      [key]: { ...current, visual: !current.visual }
    };
    onUpdatePrefs(updated);
  };

  const handleToggleMasterSound = () => {
    const nextMaster = !prefs.masterSound;
    const updated: WorkerPreferences = {
      ...prefs,
      masterSound: nextMaster
    };
    onUpdatePrefs(updated);
    if (nextMaster && playBeep) {
      playBeep(780, 'sine', 0.14);
    }
  };

  const eventCategories = [
    {
      key: 'memberReg' as const,
      label: 'Alta de Nuevos Socios',
      desc: 'Notificación cuando se registra y guarda un nuevo socio en el club.',
      icon: UserPlus,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      key: 'ocrScan' as const,
      label: 'Lector Óptico & Escáner OCR',
      desc: 'Confirmación instantánea al extraer datos de DNI, NIE o Pasaporte.',
      icon: Scan,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      key: 'docExpiry' as const,
      label: 'Vencimiento de Documentos',
      desc: 'Alertas tempranas de socios con carnets o pasaportes próximos a caducar.',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20'
    },
    {
      key: 'memberUpdate' as const,
      label: 'Modificación & Edición de Ficha',
      desc: 'Eventos al actualizar datos de contacto, estado o información del socio.',
      icon: Edit3,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20'
    },
    {
      key: 'securityAlert' as const,
      label: 'Alertas de Seguridad & Auditoría',
      desc: 'Intentos de duplicados, discrepancias de NIE/DNI o accesos restringidos.',
      icon: ShieldAlert,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20'
    },
    {
      key: 'pushMessage' as const,
      label: 'Difusión Push en Vivo',
      desc: 'Mensajes prioritarios y comunicados internos del equipo en tiempo real.',
      icon: Radio,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    }
  ];

  return (
    <div className="bg-panel-dark border border-border-dark rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
      {/* Subtle Cannabis Ambient Glow */}
      <div className="absolute -right-20 -top-20 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-dark">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
            <Sliders size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                Preferencias de Alertas & Notificaciones
              </h4>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {activeWorker.name}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Configura independientemente avisos sonoros (Web Audio) y visuales. Se guardan localmente en tu dispositivo.
            </p>
          </div>
        </div>

        {/* Master Audio & Test sound */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {playBeep && (
            <button
              type="button"
              onClick={() => playBeep(880, 'sine', 0.15)}
              className="h-8 px-3 rounded-lg bg-brand-dark hover:bg-emerald-950/40 border border-border-dark hover:border-emerald-500/40 text-[11px] font-bold text-gray-300 hover:text-emerald-300 flex items-center gap-1.5 transition-all shadow-sm"
              title="Escuchar tono acústico de prueba"
            >
              <Volume2 size={13} className="text-emerald-400" />
              <span>Probar Tono</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleMasterSound}
            className={`h-8 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
              prefs.masterSound 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm' 
                : 'bg-brand-dark border-border-dark text-gray-500'
            }`}
            title="Activar o silenciar todo el audio de la aplicación"
          >
            {prefs.masterSound ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>Audio Maestro: {prefs.masterSound ? 'Activo' : 'Silenciado'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Activity Events */}
      <div className={`mt-4 grid grid-cols-1 ${compact ? 'gap-2.5' : 'md:grid-cols-2 gap-3.5'}`}>
        {eventCategories.map((item) => {
          const pref = prefs[item.key] || { sound: true, visual: true };
          const IconComponent = item.icon;

          return (
            <div 
              key={item.key}
              className="bg-brand-dark/70 hover:bg-brand-dark/95 border border-border-dark hover:border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all"
            >
              {/* Event Header */}
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <IconComponent size={15} className={item.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white block leading-tight truncate">
                    {item.label}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* Toggle Controls */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dark/60">
                
                {/* 1. Aviso Sonoro */}
                <button
                  type="button"
                  onClick={() => handleToggleSound(item.key)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                    pref.sound && prefs.masterSound
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                      : 'bg-panel-dark border-border-dark text-gray-500 hover:text-gray-400'
                  }`}
                  title={pref.sound ? "Desactivar aviso acústico" : "Activar aviso acústico"}
                >
                  {pref.sound && prefs.masterSound ? (
                    <Volume2 size={12} className="text-emerald-400" />
                  ) : (
                    <VolumeX size={12} className="text-gray-500" />
                  )}
                  <span>Aviso Sonoro</span>
                  {pref.sound && prefs.masterSound && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>

                {/* 2. Notificación Visual */}
                <button
                  type="button"
                  onClick={() => handleToggleVisual(item.key)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                    pref.visual
                      ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm'
                      : 'bg-panel-dark border-border-dark text-gray-500 hover:text-gray-400'
                  }`}
                  title={pref.visual ? "Desactivar notificación visual" : "Activar notificación visual"}
                >
                  {pref.visual ? (
                    <Eye size={12} className="text-teal-400" />
                  ) : (
                    <Eye size={12} className="text-gray-500 opacity-40" />
                  )}
                  <span>Visual</span>
                  {pref.visual && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  )}
                </button>

              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-border-dark flex items-center justify-between text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-400" />
          Configuración vinculada a la sesión de {activeWorker.email}
        </span>
        <span className="font-mono text-[10px]">
          Persistencia: localStorage
        </span>
      </div>
    </div>
  );
}
