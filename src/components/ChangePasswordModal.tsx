import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { WorkerUser } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  activeWorker: WorkerUser;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, activeWorker, onClose }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword.length < 4) {
      setStatusMsg({ type: 'error', text: 'La contraseña debe tener al menos 4 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('workers')
        .update({ password: newPassword })
        .eq('id', activeWorker.id);

      if (error) throw error;

      setStatusMsg({ type: 'success', text: '¡Contraseña actualizada con éxito!' });
      setTimeout(() => {
        onClose();
        setStatusMsg(null);
        setNewPassword('');
        setConfirmPassword('');
      }, 1200);

    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al actualizar la contraseña.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-panel-dark border border-border-dark rounded-3xl p-6 max-w-md w-full relative space-y-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 border-b border-border-dark pb-3">
          <Lock className="text-brand-red" size={20} />
          <h3 className="text-sm font-bold text-white uppercase">Cambiar Contraseña</h3>
        </div>

        {statusMsg && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Nueva Contraseña</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Confirmar Contraseña</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full h-10 px-3 bg-brand-dark border border-border-dark rounded-xl text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-brand-red text-white font-bold text-xs uppercase rounded-xl shadow-lg"
          >
            {loading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}