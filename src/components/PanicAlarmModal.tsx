import React, { useEffect, useRef } from 'react';
import { ShieldAlert, Volume2, VolumeX, CheckCircle, MapPin, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { PanicAlert, WorkerUser } from '../types';

interface PanicAlarmModalProps {
  alerts: PanicAlert[];
  currentAdmin: WorkerUser;
  onAlertResolved: (alertId: string) => void;
}

export default function PanicAlarmModal({ alerts, currentAdmin, onAlertResolved }: PanicAlarmModalProps) {
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorIntervalRef = useRef<number | null>(null);

  // Reproductor de Sirena de Emergencia modular
  const startSiren = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      if (oscillatorIntervalRef.current) return;

      let highTone = false;
      oscillatorIntervalRef.current = window.setInterval(() => {
        if (!audioCtxRef.current) return;
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(highTone ? 960 : 640, audioCtxRef.current.currentTime);
        highTone = !highTone;

        gain.gain.setValueAtTime(0.12, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);

        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.28);
      }, 300);
    } catch (e) {
      console.warn("Autoplay bloqueado por el navegador:", e);
    }
  };

  const stopSiren = () => {
    if (oscillatorIntervalRef.current) {
      clearInterval(oscillatorIntervalRef.current);
      oscillatorIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  useEffect(() => {
    if (activeAlerts.length > 0) {
      startSiren();
    } else {
      stopSiren();
    }
    return () => stopSiren();
  }, [activeAlerts.length]);

  const handleResolveAlert = async (alertId: string, resolution: 'RESOLVED' | 'FALSE_ALARM') => {
    try {
      await supabase
        .from('panic_alerts')
        .update({
          status: resolution,
          resolved_by: currentAdmin.name,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      onAlertResolved(alertId);
    } catch (err) {
      console.error("Error al resolver alerta:", err);
    }
  };

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0e1711] border-2 border-rose-600 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6 animate-pulse">
        
        {/* Cabecera Urgente */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-600/50 animate-bounce">
            <ShieldAlert size={32} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
              EMERGENCIA EN CURSO
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-black text-white mt-1">
              ¡BOTÓN DE PÁNICO ACTIVADO!
            </h2>
          </div>
        </div>

        {/* Lista de alertas activas */}
        <div className="space-y-3">
          {activeAlerts.map(alert => (
            <div key={alert.id} className="p-4 bg-[#080d0a] border border-rose-500/40 rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white text-sm">{alert.workerName}</span>
                <span className="text-[10px] font-mono text-rose-400 font-bold uppercase">{alert.workerRole}</span>
              </div>

              <div className="flex flex-wrap gap-4 text-[11px] text-gray-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-rose-400" />
                  {alert.location || 'Dispensario Principal'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} className="text-rose-400" />
                  {new Date(alert.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1a2a1e]">
                <button
                  type="button"
                  onClick={() => handleResolveAlert(alert.id, 'RESOLVED')}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <CheckCircle size={15} /> Atendida / Apagar
                </button>

                <button
                  type="button"
                  onClick={() => handleResolveAlert(alert.id, 'FALSE_ALARM')}
                  className="py-2.5 bg-gray-900 hover:bg-gray-800 border border-[#1a2a1e] text-gray-300 font-bold text-xs uppercase rounded-xl"
                >
                  Falsa Alarma
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-center font-mono text-gray-500">
          La alarma sonora continuará activa hasta que un administrador verifique y desactive la alerta.
        </p>
      </div>
    </div>
  );
}
