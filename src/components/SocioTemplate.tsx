import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  X,
  Copy,
  Check,
  IdCard,
  ShieldCheck,
  Edit3,
  Trash2,
  Save,
  AlertTriangle,
  History,
  Clock,
  ArrowRight,
  Upload,
  FileCheck,
  Eye,
  RefreshCw
} from 'lucide-react';
import { AssociationMember, WorkerUser, DocumentType, ActivityLog } from '../types';
import ConfirmModal from './ConfirmModal';
import DniPhotoCapture from './DniPhotoCapture';
import { generateSvadhisthanaAltaPdf } from '../utils/pdfGenerator';
import { supabase } from '../supabaseClient';

export interface SocioTemplateProps {
  member: AssociationMember & { 
    dniFrontImage?: string; 
    dniBackImage?: string; 
    dni_front_image?: string; 
    dni_back_image?: string;
    signedPdf?: string | null;
    signed_pdf?: string | null;
  };
  onClose: () => void;
  onUpdateMember?: (updated: AssociationMember) => Promise<boolean | void> | boolean | void;
  onDeleteMember?: (id: string) => Promise<boolean | void> | boolean | void;
  currentWorker?: WorkerUser | null;
}

export default function SocioTemplate({
  member,
  onClose,
  onUpdateMember,
  onDeleteMember,
  currentWorker
}: SocioTemplateProps) {
  const [currentMember, setCurrentMember] = useState(member);
  const [copied, setCopied] = useState(false);
  const [includeAuditHistory, setIncludeAuditHistory] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'badge' | 'edit' | 'audit'>('badge');
  const [auditLogs, setAuditLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [editFirstName, setEditFirstName] = useState(member.firstName);
  const [editLastName, setEditLastName] = useState(member.lastName);
  const [editDocType, setEditDocType] = useState<DocumentType>(member.documentType || 'DNI');
  const [editDniPassport, setEditDniPassport] = useState(member.dniPassport);
  const [editNationality, setEditNationality] = useState(member.nationality);
  const [editBirthDate, setEditBirthDate] = useState(member.birthDate);
  const [editExpiryDate, setEditExpiryDate] = useState(member.expiryDate);
  const [editGender, setEditGender] = useState<'MASCULINO' | 'FEMENINO' | 'OTRO'>(member.gender || 'MASCULINO');
  const [editStatus, setEditStatus] = useState<'pending' | 'approved' | 'rejected'>(member.registrationStatus);
  const [editEmail, setEditEmail] = useState(member.email || '');
  const [editPhone, setEditPhone] = useState(member.phone || '');
  const [editAddress, setEditAddress] = useState(member.address || '');

  const [editDniFront, setEditDniFront] = useState<string | null>(
    member.dniFrontImage || member.dni_front_image || null
  );
  const [editDniBack, setEditDniBack] = useState<string | null>(
    member.dniBackImage || member.dni_back_image || null
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAuditLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const res = await fetch(`/api/members/${currentMember.id}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      } else {
        const fallbackRes = await fetch(`/api/activity-logs?memberId=${currentMember.id}`);
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setAuditLogs(data);
        }
      }
    } catch (err) {
      console.error("Error obteniendo logs de auditoría:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [currentMember.id]);

  const resetEditForm = () => {
    setEditFirstName(currentMember.firstName);
    setEditLastName(currentMember.lastName);
    setEditDocType(currentMember.documentType || 'DNI');
    setEditDniPassport(currentMember.dniPassport);
    setEditNationality(currentMember.nationality);
    setEditBirthDate(currentMember.birthDate);
    setEditExpiryDate(currentMember.expiryDate);
    setEditGender(currentMember.gender || 'MASCULINO');
    setEditStatus(currentMember.registrationStatus);
    setEditEmail(currentMember.email || '');
    setEditPhone(currentMember.phone || '');
    setEditAddress(currentMember.address || '');
    setEditDniFront(currentMember.dniFrontImage || currentMember.dni_front_image || null);
    setEditDniBack(currentMember.dniBackImage || currentMember.dni_back_image || null);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirstName.trim() || !editLastName.trim() || !editDniPassport.trim()) {
      setSaveError("Nombre, apellidos y documento son obligatorios.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const updatedData: AssociationMember & { dniFrontImage?: string | null; dniBackImage?: string | null; dni_front_image?: string | null; dni_back_image?: string | null } = {
      ...currentMember,
      firstName: editFirstName.trim().toUpperCase(),
      lastName: editLastName.trim().toUpperCase(),
      documentType: editDocType,
      dniPassport: editDniPassport.trim().toUpperCase(),
      nationality: editNationality.trim().toUpperCase(),
      birthDate: editBirthDate,
      expiryDate: editExpiryDate,
      gender: editGender,
      registrationStatus: editStatus,
      email: editEmail.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
      dniFrontImage: editDniFront,
      dniBackImage: editDniBack,
      dni_front_image: editDniFront,
      dni_back_image: editDniBack
    };

    try {
      const { error } = await supabase
        .from('members')
        .update({
          first_name: updatedData.firstName,
          last_name: updatedData.lastName,
          dni_passport: updatedData.dniPassport,
          document_type: updatedData.documentType,
          nationality: updatedData.nationality,
          birth_date: updatedData.birthDate || null,
          expiry_date: updatedData.expiryDate || null,
          email: updatedData.email || null,
          phone: updatedData.phone || null,
          address: updatedData.address || null,
          gender: updatedData.gender,
          registration_status: updatedData.registrationStatus,
          dni_front_image: editDniFront,
          dni_back_image: editDniBack
        })
        .eq('id', currentMember.id);

      if (error) throw error;

      if (onUpdateMember) {
        await onUpdateMember(updatedData);
      }
      setCurrentMember(updatedData);
      setSaveSuccess("¡Ficha y fotografías actualizadas!");
      await fetchAuditLogs();
      setTimeout(() => {
        setActiveTab('badge');
        setSaveSuccess(null);
      }, 900);
    } catch (err: any) {
      setSaveError(err.message || "Error al actualizar la información del socio.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async () => {
    setIsDeleting(true);
    try {
      if (onDeleteMember) {
        await onDeleteMember(currentMember.id);
      }
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Error al dar de baja al socio.');
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = generateSvadhisthanaAltaPdf(currentMember);
    doc.save(`Alta_Socio_${currentMember.dniPassport}_Svadhisthana.pdf`);
  };

  const handleUploadSignedPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (file.type !== 'application/pdf') {
      alert('Por favor, selecciona un archivo en formato PDF.');
      return;
    }

    setIsUploadingPdf(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Pdf = event.target?.result as string;
      try {
        const { error } = await supabase
          .from('members')
          .update({ signed_pdf: base64Pdf })
          .eq('id', currentMember.id);

        if (error) throw error;

        const updated = { ...currentMember, signedPdf: base64Pdf, signed_pdf: base64Pdf };
        setCurrentMember(updated);
        if (onUpdateMember) onUpdateMember(updated);
        alert('¡PDF firmado subido y guardado correctamente!');
      } catch (err: any) {
        alert('Error al guardar el PDF firmado: ' + err.message);
      } finally {
        setIsUploadingPdf(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadSignedPdf = () => {
    const pdfData = currentMember.signedPdf || currentMember.signed_pdf;
    if (!pdfData) return;

    const link = document.createElement('a');
    link.href = pdfData;
    link.download = `Svadhisthana_Alta_Firmada_${currentMember.dniPassport}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyDetails = () => {
    const text = `Socio: ${currentMember.firstName} ${currentMember.lastName}\nDoc: ${currentMember.documentType} ${currentMember.dniPassport}\nNacionalidad: ${currentMember.nationality}\nEstado: ${currentMember.registrationStatus}\nAlta: ${currentMember.registerDate}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    const headers = [
      "ID", "Documento", "Tipo", "Nombre", "Apellidos", "Nacionalidad",
      "Fecha Nacimiento", "Fecha Caducidad", "Email", "Telefono", "Direccion", "Estado", "Fecha Alta", "Registrador"
    ];
    const row = [
      currentMember.id,
      currentMember.dniPassport,
      currentMember.documentType,
      currentMember.firstName,
      currentMember.lastName,
      currentMember.nationality,
      currentMember.birthDate,
      currentMember.expiryDate,
      currentMember.email,
      currentMember.phone,
      currentMember.address,
      currentMember.registrationStatus,
      currentMember.registerDate,
      currentMember.registeredBy?.name || 'ADMIN'
    ];
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.map(h => `"${h}"`).join(','), row.map(r => `"${(r || '').replace(/"/g, '""')}"`).join(',')].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `socio_${currentMember.dniPassport}_${currentMember.lastName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const frontImageDisplay = currentMember.dniFrontImage || currentMember.dni_front_image;
  const backImageDisplay = currentMember.dniBackImage || currentMember.dni_back_image;
  const signedPdfData = currentMember.signedPdf || currentMember.signed_pdf;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md no-print overflow-hidden">
      <ConfirmModal
        isOpen={confirmDelete}
        type="danger"
        title="¿Confirmar baja del socio?"
        message={
          <span>
            Esta acción eliminará a <strong className="text-white font-bold">{currentMember.firstName} {currentMember.lastName}</strong> ({currentMember.dniPassport}) permanentemente.
          </span>
        }
        confirmText="Sí, Eliminar Socio"
        cancelText="Cancelar"
        isLoading={isDeleting}
        onConfirm={handleDeleteMember}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="relative w-full h-full md:h-auto md:max-h-[92vh] max-w-4xl bg-panel-dark md:border md:border-border-dark md:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-2 text-gray-400 hover:text-white bg-gray-900/90 rounded-full border border-border-dark transition-all"
        >
          <X size={18} />
        </button>

        {/* Panel Principal */}
        <div className="flex-1 bg-brand-dark p-4 sm:p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border-dark overflow-y-auto">
          
          <div className="flex items-center justify-between gap-2 mb-4 border-b border-border-dark pb-3">
            <div className="flex items-center gap-1 bg-panel-dark p-1 rounded-xl border border-border-dark flex-wrap">
              <button
                type="button"
                onClick={() => { setActiveTab('badge'); setSaveError(null); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${activeTab === 'badge'
                    ? 'bg-brand-red text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <IdCard size={13} />
                Carnet
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('edit'); resetEditForm(); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${activeTab === 'edit'
                    ? 'bg-brand-red text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Edit3 size={13} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('audit'); fetchAuditLogs(); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${activeTab === 'audit'
                    ? 'bg-brand-red text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <History size={13} />
                Auditoría
              </button>
            </div>

            <div className="text-[10px] font-mono text-gray-400 pr-10 md:pr-0">
              <span className="text-brand-red font-bold">#{currentMember.id.slice(0, 8)}</span>
            </div>
          </div>

          {/* EDITAR DATOS */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pb-6 md:pb-0">
              <div>
                <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">
                  Modificar Socio
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Edita datos y fotografías del DNI.
                </p>
              </div>

              {saveError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle size={14} className="shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              <DniPhotoCapture
                frontImage={editDniFront}
                backImage={editDniBack}
                onChangeFront={setEditDniFront}
                onChangeBack={setEditDniBack}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={e => setEditFirstName(e.target.value)}
                    required
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={e => setEditLastName(e.target.value)}
                    required
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Tipo Documento
                  </label>
                  <select
                    value={editDocType}
                    onChange={e => setEditDocType(e.target.value as DocumentType)}
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  >
                    <option value="DNI">DNI (España)</option>
                    <option value="PASSPORT">Pasaporte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    N° Documento *
                  </label>
                  <input
                    type="text"
                    value={editDniPassport}
                    onChange={e => setEditDniPassport(e.target.value)}
                    required
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-brand-red font-mono font-bold focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Nacionalidad
                  </label>
                  <input
                    type="text"
                    value={editNationality}
                    onChange={e => setEditNationality(e.target.value)}
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Estado Registro
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  >
                    <option value="approved">Aprobado / Activo</option>
                    <option value="pending">Pendiente</option>
                    <option value="rejected">Rechazado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Fecha Nacimiento
                  </label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={e => setEditBirthDate(e.target.value)}
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Fecha Caducidad
                  </label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={e => setEditExpiryDate(e.target.value)}
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Correo
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-border-dark">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 h-10 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  <Save size={14} />
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('badge'); resetEditForm(); }}
                  disabled={isSaving}
                  className="px-4 h-10 bg-gray-900 border border-border-dark text-gray-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* FICHA TIPO CARNET */}
          {activeTab === 'badge' && (
            <div className="space-y-4">
              <div className="border border-border-dark/60 rounded-2xl p-4 sm:p-5 relative bg-gradient-to-b from-panel-dark/40 to-brand-dark overflow-hidden">
                <div className="flex justify-between items-start border-b border-border-dark pb-3 mb-3">
                  <div>
                    <span className="text-[9px] font-mono text-brand-red font-bold tracking-widest uppercase">
                      ASOCIACIÓN CANNABICA SVADHISTHANA
                    </span>
                    <h4 className="text-base font-display font-bold text-gray-100 mt-0.5">
                      FICHA OFICIAL DE SOCIO
                    </h4>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${currentMember.registrationStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                      {currentMember.registrationStatus === 'approved' ? 'Aprobado' : 'Pendiente'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  <div className="w-24 h-32 bg-emerald-600 rounded-xl border border-emerald-400/50 flex flex-col items-center justify-center relative overflow-hidden shrink-0 shadow-lg">
                    <span className="text-2xl font-display font-black text-white">
                      {currentMember.firstName.charAt(0)}{currentMember.lastName.charAt(0)}
                    </span>
                    <span className="absolute bottom-1 text-[7px] font-mono text-white font-bold uppercase bg-emerald-800/90 px-1.5 py-0.5 rounded">
                      FOTO
                    </span>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs w-full">
                    <div>
                      <p className="text-[8px] font-mono text-gray-500 font-semibold uppercase">Apellidos</p>
                      <p className="font-bold text-gray-200 mt-0.5 truncate">{currentMember.lastName}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-gray-500 font-semibold uppercase">Nombre</p>
                      <p className="font-bold text-gray-200 mt-0.5 truncate">{currentMember.firstName}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-gray-500 font-semibold uppercase">ID Documento</p>
                      <p className="font-mono font-bold text-brand-red mt-0.5">{currentMember.dniPassport}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-gray-500 font-semibold uppercase">Tipo</p>
                      <p className="font-bold text-gray-200 mt-0.5">{currentMember.documentType}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-gray-500 font-semibold uppercase">Nacionalidad</p>
                      <p className="font-bold text-gray-200 mt-0.5">{currentMember.nationality}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-gray-500 font-semibold uppercase">Nacimiento</p>
                      <p className="font-bold text-gray-200 mt-0.5">{currentMember.birthDate || 'N/D'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {(frontImageDisplay || backImageDisplay) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-brand-dark p-3 sm:p-4 rounded-2xl border border-border-dark">
                  <div>
                    <p className="text-[9px] font-mono text-gray-400 uppercase font-bold mb-1.5">DNI Anverso</p>
                    {frontImageDisplay ? (
                      <img src={frontImageDisplay} alt="DNI Delantera" className="w-full aspect-[1.58/1] object-cover rounded-xl border border-border-dark" />
                    ) : (
                      <div className="aspect-[1.58/1] bg-panel-dark border border-dashed border-border-dark rounded-xl flex items-center justify-center text-xs text-gray-500">
                        Sin foto
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-[9px] font-mono text-gray-400 uppercase font-bold mb-1.5">DNI Reverso</p>
                    {backImageDisplay ? (
                      <img src={backImageDisplay} alt="DNI Trasera" className="w-full aspect-[1.58/1] object-cover rounded-xl border border-border-dark" />
                    ) : (
                      <div className="aspect-[1.58/1] bg-panel-dark border border-dashed border-border-dark rounded-xl flex items-center justify-center text-xs text-gray-500">
                        Sin foto
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AUDITORÍA */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border-dark">
                <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <History size={14} className="text-emerald-400" />
                  Historial de Auditoría
                </h3>
                <button
                  type="button"
                  onClick={fetchAuditLogs}
                  disabled={isLoadingLogs}
                  className="p-1 bg-panel-dark border border-border-dark text-gray-300 rounded-lg text-xs"
                >
                  <RefreshCw size={12} className={isLoadingLogs ? 'animate-spin' : ''} />
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">Sin registros de auditoría.</p>
              ) : (
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1 text-xs">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-panel-dark rounded-xl border border-border-dark space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                        <span className="font-bold text-emerald-400">{log.action}</span>
                        <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-gray-300">{log.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel Lateral de Datos de Contacto y Acciones */}
        <div className="w-full md:w-80 bg-panel-dark p-4 sm:p-6 flex flex-col justify-between overflow-y-auto shrink-0 space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-display font-semibold text-gray-200 uppercase tracking-wider">
                Datos de Contacto
              </h4>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <Mail size={13} className="text-brand-red shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[8px] font-mono text-gray-500 uppercase">Correo</p>
                  <p className="font-medium text-gray-300 truncate">{currentMember.email || 'No proporcionado'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone size={13} className="text-brand-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-[8px] font-mono text-gray-500 uppercase">Teléfono</p>
                  <p className="font-medium text-gray-300">{currentMember.phone || 'No proporcionado'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-brand-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-[8px] font-mono text-gray-500 uppercase">Dirección</p>
                  <p className="font-medium text-gray-300 leading-tight">{currentMember.address || 'No proporcionado'}</p>
                </div>
              </div>
            </div>

            {/* SECCIÓN DE PDF FIRMADO */}
            <div className="pt-3 border-t border-border-dark space-y-2">
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleUploadSignedPdf}
              />

              <div className="p-3 bg-brand-dark/80 rounded-xl border border-border-dark space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-200">
                  <span className="flex items-center gap-1.5 uppercase text-[10px] font-mono text-gray-400">
                    <FileCheck size={13} className="text-emerald-400" /> PDF Firmado
                  </span>
                  {signedPdfData ? (
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                      GUARDADO
                    </span>
                  ) : (
                    <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                      PENDIENTE
                    </span>
                  )}
                </div>

                {signedPdfData ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadSignedPdf}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow"
                    >
                      <Eye size={12} /> Ver PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={isUploadingPdf}
                      className="p-1.5 bg-panel-dark border border-border-dark text-gray-300 rounded-lg text-xs font-bold"
                    >
                      <Upload size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isUploadingPdf}
                    className="w-full py-2 bg-brand-dark border border-dashed border-border-dark text-gray-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    {isUploadingPdf ? <RefreshCw size={12} className="animate-spin text-brand-red" /> : <Upload size={12} className="text-brand-red" />}
                    <span>Subir PDF Firmado</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full h-9 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
              >
                <Trash2 size={13} />
                Dar de Baja / Eliminar Socio
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-border-dark">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="w-full h-10 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg"
            >
              <Download size={14} /> Imprimir Ficha B&W
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyDetails}
                className="h-8 bg-gray-900 border border-border-dark text-gray-300 rounded-xl font-semibold text-xs flex items-center justify-center gap-1"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="h-8 bg-gray-900 border border-border-dark text-gray-300 rounded-xl font-semibold text-xs flex items-center justify-center gap-1"
              >
                <Download size={12} /> CSV
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}