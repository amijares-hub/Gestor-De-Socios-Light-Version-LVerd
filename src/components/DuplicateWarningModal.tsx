import React from 'react';
import { 
  AlertTriangle, 
  ExternalLink, 
  X, 
  User, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle,
  ShieldAlert
} from 'lucide-react';
import { AssociationMember } from '../types';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentNumber: string;
  documentType: string;
  existingMember: AssociationMember | null;
  onViewMember: (member: AssociationMember) => void;
}

export default function DuplicateWarningModal({
  isOpen,
  onClose,
  documentNumber,
  documentType,
  existingMember,
  onViewMember
}: DuplicateWarningModalProps) {
  if (!isOpen || !existingMember) return null;

  const statusConfig = {
    approved: {
      label: 'Aprobado Oficial',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: CheckCircle2
    },
    pending: {
      label: 'Pendiente de Revisión',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: Clock
    },
    rejected: {
      label: 'Rechazado',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: XCircle
    }
  };

  const statusInfo = statusConfig[existingMember.registrationStatus] || statusConfig.approved;
  const StatusIcon = statusInfo.icon;

  const handleOpenFicha = () => {
    onClose();
    onViewMember(existingMember);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-lg bg-panel-dark border-2 border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden glow-border">
        
        {/* Decorative alert top line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-brand-red to-amber-500"></div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-brand-dark/80 rounded-full border border-border-dark hover:border-amber-500/40 transition-all"
          title="Cerrar advertencia"
        >
          <X size={16} />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <ShieldAlert size={26} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Alerta de Duplicidad
              </span>
            </div>
            <h3 className="text-base md:text-lg font-display font-bold text-white mt-1">
              Documento Ya Registrado
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              El <span className="font-semibold text-gray-200">{documentType}</span> con número <span className="font-mono font-bold text-brand-red">{documentNumber.toUpperCase()}</span> ya existe en la base de datos.
            </p>
          </div>
        </div>

        {/* Existing Member Card Summary */}
        <div className="bg-brand-dark/70 border border-border-dark/80 rounded-2xl p-4.5 mb-6 relative overflow-hidden">
          <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Ficha del Socio Coincidente</span>
            <span className="text-gray-500 font-mono text-[9px]">ID: #{existingMember.id.toUpperCase()}</span>
          </div>

          <div className="flex items-start gap-3.5">
            {/* Avatar frame */}
            <div className="w-14 h-16 rounded-xl bg-[#16161c] border border-border-dark flex flex-col items-center justify-center shrink-0 text-gray-500 relative overflow-hidden">
              <User size={24} className="text-gray-400" />
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-red/50"></div>
            </div>

            {/* Member metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-white truncate">
                  {existingMember.firstName} {existingMember.lastName}
                </h4>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                  <StatusIcon size={11} />
                  {statusInfo.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-[11px] text-gray-400 font-sans">
                <div>
                  <span className="text-gray-500 text-[10px] block">Nacionalidad:</span>
                  <span className="font-semibold text-gray-300">{existingMember.nationality}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Fecha de Nacimiento:</span>
                  <span className="font-semibold text-gray-300">{existingMember.birthDate || 'N/D'}</span>
                </div>
                <div className="col-span-2 mt-1 pt-1.5 border-t border-border-dark/40 text-[10px] text-gray-500 flex items-center justify-between">
                  <span>Alta: {new Date(existingMember.registerDate).toLocaleDateString()}</span>
                  <span>Por: {existingMember.registeredBy.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleOpenFicha}
            className="flex-1 h-11 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-red/20 border border-brand-red/30 flex items-center justify-center gap-2 glow-border"
          >
            <FileText size={15} />
            Ver Ficha del Socio Existente
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white rounded-xl font-semibold text-xs transition-all border border-border-dark"
          >
            Corregir Documento
          </button>
        </div>

        <p className="text-[10px] text-gray-500 text-center mt-3 font-sans">
          Para evitar registros duplicados, consulta o actualiza la ficha del socio existente en lugar de crear una nueva.
        </p>

      </div>
    </div>
  );
}
