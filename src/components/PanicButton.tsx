import React, { useState, useEffect } from 'react';
import { AlertOctagon, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { WorkerUser } from '../types';

interface PanicButtonProps {
  currentWorker: WorkerUser;
  locationLabel?: string;
}

export default function PanicButton({ currentWorker, locationLabel = 'Dispensario Principal' }: PanicButtonProps) {
  const [isTriggered, setIsTriggered] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const triggerPanicAlert = async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentWorker.id);
      const validWorkerId = isUuid ? currentWorker.id : null;

      // 1. Insertar en tabla de emergencias críticas
      await supabase.from('panic_alerts').insert([{
        worker_id: validWorkerId,
        worker_name: currentWorker.name,
        worker_role: currentWorker.role,
        location: locationLabel,
        status: 'ACTIVE'
      }]);

      // 2. Insertar notificación prioritaria
      await supabase.from('notifications').insert([{
        title: '🚨 ALERTA DE SEGURIDAD (BOTÓN DE PÁNICO)',
        message: `Activado por ${currentWorker.name} en ${locationLabel}. Emergencia en curso.`,
        priority: 'high'
      }]);

      // 3. Registrar en auditoría
      await supabase.from('activity_logs').insert([{
        worker_name: currentWorker.name,
        worker_role: currentWorker.role,
        action: 'PANIC_BUTTON_TRIGGERED',
        details: `Botón de pánico presionado desde ${locationLabel}`
      }]);

      // 4. Consultar números activos de los dueños para WhatsApp
      const { data: contacts } = await supabase
        .from('emergency_contacts')
        .select('name, phone')
        .eq('is_active', true);

      if (contacts && contacts.length > 0) {
        // Llamada a la función de envío de WhatsApp
        await fetch('/api/send-panic-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerName: currentWorker.name,
            location: locationLabel,
            timestamp: new Date().toISOString(),
            recipients: contacts
          })
        }).catch(e => console.warn('Servicio WhatsApp en segundo plano:', e));
      }

      setIsTriggered(true);
      setTimeout(() => setIsTriggered(false), 3000);
    } catch (err) {
      console.error('Error al emitir alerta de pánico:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Escuchador del atajo de teclado global: Ctrl + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        // Prevenir la selección de todo el texto del navegador
        e.preventDefault();
        e.stopPropagation();
        triggerPanicAlert();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWorker, locationLabel, isSending]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={triggerPanicAlert}
        disabled={isSending}
        title="Botón de Pánico (Atajo: Ctrl + A)"
        className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
          isTriggered 
            ? 'bg-emerald-600 text-white animate-pulse' 
            : 'bg-rose-500/15 hover:bg-rose-600 border border-rose-500/30 text-rose-400 hover:text-white'
        }`}
      >
        <AlertOctagon size={14} className={isSending ? 'animate-spin' : ''} />
        <span>{isTriggered ? 'Alerta Emitida' : 'Pánico'}</span>
        <span className="hidden sm:inline-block text-[9px] font-mono opacity-60 ml-0.5">(Ctrl+A)</span>
      </button>
    </div>
  );
}
