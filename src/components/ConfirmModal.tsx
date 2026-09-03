import React, { useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertOctagon, 
  Loader2, 
  X 
} from 'lucide-react';

export type ConfirmActionType = 'danger' | 'warning' | 'success' | 'info';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmActionType;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  isLoading?: boolean;
  details?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'Cancelar',
  type = 'danger',
  icon: CustomIcon,
  isLoading = false,
  details,
  onConfirm,
  onCancel
}: ConfirmModalProps) {

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isLoading) return;
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  // Visual styling variants based on action type
  const typeConfig = {
    danger: {
      defaultIcon: Trash2,
      iconBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/10',
      modalBorder: 'border-rose-500/30',
      glowBg: 'bg-rose-500/5',
      confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 border border-rose-500/40',
      defaultConfirmText: 'Sí, Eliminar'
    },
    warning: {
      defaultIcon: AlertOctagon,
      iconBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10',
      modalBorder: 'border-amber-500/30',
      glowBg: 'bg-amber-500/5',
      confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25 border border-amber-500/40',
      defaultConfirmText: 'Sí, Continuar'
    },
    success: {
      defaultIcon: CheckCircle2,
      iconBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10',
      modalBorder: 'border-emerald-500/30',
      glowBg: 'bg-emerald-500/5',
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 border border-emerald-500/40',
      defaultConfirmText: 'Sí, Aprobar'
    },
    info: {
      defaultIcon: AlertTriangle,
      iconBg: 'bg-teal-500/10 border-teal-500/30 text-teal-400 shadow-teal-500/10',
      modalBorder: 'border-teal-500/30',
      glowBg: 'bg-teal-500/5',
      confirmBtn: 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/25 border border-teal-500/40',
      defaultConfirmText: 'Confirmar'
    }
  };

  const config = typeConfig[type];
  const IconComponent = CustomIcon || config.defaultIcon;
  const resolvedConfirmText = confirmText || config.defaultConfirmText;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
    >
      <div 
        className={`relative w-full max-w-md bg-panel-dark border ${config.modalBorder} rounded-3xl p-6 shadow-2xl overflow-hidden transition-all transform animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div className={`absolute -right-16 -top-16 w-48 h-48 ${config.glowBg} rounded-full blur-3xl pointer-events-none`} />

        {/* Close Icon button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white bg-brand-dark/70 hover:bg-brand-dark border border-border-dark hover:border-gray-600 rounded-full transition-all disabled:opacity-50"
          title="Cerrar modal"
        >
          <X size={15} />
        </button>

        {/* Modal Header & Icon */}
        <div className="flex flex-col items-center text-center space-y-3.5">
          <div className={`w-13 h-13 p-3 rounded-2xl border ${config.iconBg} flex items-center justify-center shadow-lg`}>
            <IconComponent size={26} />
          </div>

          <div>
            <h3 className="text-base font-display font-bold text-white tracking-wide">
              {title}
            </h3>
            <div className="text-xs text-gray-400 mt-2 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Optional details box */}
        {details && (
          <div className="mt-4 p-3.5 rounded-xl bg-brand-dark/80 border border-border-dark text-xs text-gray-300">
            {details}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 h-11 px-4 bg-brand-dark border border-border-dark hover:border-gray-600 text-gray-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 h-11 px-4 ${config.confirmBtn} rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-display`}
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <span>{resolvedConfirmText}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
