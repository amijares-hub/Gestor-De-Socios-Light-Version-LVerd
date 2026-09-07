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
      setSaveSuccess("¡Ficha y fotografías actualizadas exitosamente!");
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
        alert('¡PDF firmado subido y guardado correctamente en la ficha del socio!');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/85 backdrop-blur-md no-print">
      <ConfirmModal
        isOpen={confirmDelete}
        type="danger"
        title="¿Confirmar baja del socio?"
        message={
          <span>
            Esta acción eliminará de forma permanente a <strong className="text-white font-bold">{currentMember.firstName} {currentMember.lastName}</strong> ({currentMember.dniPassport}) de la base de datos de la asociación Cannábica Svadhisthana.
          </span>
        }
        confirmText="Sí, Eliminar Socio"
        cancelText="Cancelar"
        isLoading={isDeleting}
        onConfirm={handleDeleteMember}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="relative w-full max-w-4xl bg-panel-dark border border-border-dark rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[92vh] md:h-auto max-h-[92vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-gray-400 hover:text-white bg-gray-900/80 rounded-full border border-border-dark hover:border-brand-red transition-all"
        >
          <X size={18} />
        </button>

        <div className="flex-1 bg-brand-dark p-5 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border-dark overflow-y-auto">
          <div className="flex items-center justify-between gap-3 mb-4 border-b border-border-dark pb-3">
            <div className="flex items-center gap-1.5 bg-panel-dark p-1 rounded-xl border border-border-dark flex-wrap">
              <button
                type="button"
                onClick={() => { setActiveTab('badge'); setSaveError(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTab === 'badge'
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <IdCard size={13} />
                Ficha Socio
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('edit'); resetEditForm(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTab === 'edit'
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Edit3 size={13} />
                Editar Datos
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('audit'); fetchAuditLogs(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTab === 'audit'
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <History size={13} />
                Auditoría
                {auditLogs.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${activeTab === 'audit' ? 'bg-white/20 text-white' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    }`}>
                    {auditLogs.length}
                  </span>
                )}
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-gray-400">
              <span>ID:</span>
              <span className="text-brand-red font-bold">#{currentMember.id.slice(0, 8)}</span>
            </div>
          </div>

          {activeTab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                    Modificar Información del Socio
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Actualiza los campos oficiales y fotografías del DNI en la base de datos.
                  </p>
                </div>
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

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold">
                  Fotografías del Documento DNI / Pasaporte
                </label>
                <DniPhotoCapture
                  frontImage={editDniFront}
                  backImage={editDniBack}
                  onChangeFront={setEditDniFront}
                  onChangeBack={setEditDniBack}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Nombre <span className="text-brand-red">*</span>
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
                    Apellidos <span className="text-brand-red">*</span>
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
                    Tipo de Documento
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
                    N° Documento <span className="text-brand-red">*</span>
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
                    Estado de Registro
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  >
                    <option value="approved">Aprobado / Activo</option>
                    <option value="pending">Pendiente de Aprobación</option>
                    <option value="rejected">Rechazado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Fecha de Nacimiento
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
                    Fecha de Caducidad
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
                    Género
                  </label>
                  <select
                    value={editGender}
                    onChange={e => setEditGender(e.target.value as any)}
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  >
                    <option value="MASCULINO">MASCULINO</option>
                    <option value="FEMENINO">FEMENINO</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="socio@email.com"
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Dirección Física
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    placeholder="Calle, número, piso, ciudad"
                    className="w-full h-9 px-3 bg-panel-dark border border-border-dark rounded-xl text-white font-medium focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border-dark">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 h-10 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-red/20 transition-all"
                >
                  <Save size={14} />
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('badge'); resetEditForm(); }}
                  disabled={isSaving}
                  className="px-4 h-10 bg-gray-900 border border-border-dark hover:border-gray-600 text-gray-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {activeTab === 'badge' && (
            <div className="space-y-4">
              <div className="border border-border-dark/60 rounded-2xl p-5 relative bg-gradient-to-b from-panel-dark/40 to-brand-dark overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl font-black font-display text-gray-800/5 select-none pointer-events-none uppercase tracking-widest text-center">
                  SVADHISTHANA
                </div>

                <div className="flex justify-between items-start border-b border-border-dark pb-4 mb-4">
                  <div>
                    <span className="text-[10px] font-mono text-brand-red font-bold tracking-widest uppercase">
                      ASOCIACIÓN CANNABICA SVADHISTHANA
                    </span>
                    <h4 className="text-lg font-display font-bold text-gray-100 mt-1">
                      FICHA OFICIAL DE SOCIO
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${currentMember.registrationStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        currentMember.registrationStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {currentMember.registrationStatus === 'approved' ? 'Aprobado' :
                        currentMember.registrationStatus === 'pending' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                  <div className="w-28 h-36 bg-emerald-600 rounded-xl border border-emerald-400/50 flex flex-col items-center justify-center relative overflow-hidden shrink-0 shadow-lg shadow-emerald-950/40">
                    <span className="text-3xl font-display font-black text-white tracking-wider">
                      {currentMember.firstName.charAt(0)}{currentMember.lastName.charAt(0)}
                    </span>
                    <span className="absolute bottom-2 text-[8px] font-mono text-white font-bold uppercase tracking-wider bg-emerald-800/90 px-2 py-0.5 rounded">
                      FOTO SOCIO
                    </span>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/40 animate-pulse"></div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs w-full">
                    <div>
                      <p className="text-[9px] font-mono text-gray-500 font-semibold uppercase">Apellidos / Surname</p>
                      <p className="font-bold text-gray-200 mt-0.5">{currentMember.lastName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-gray-500 font-semibold uppercase">Nombre / Given Name</p>
                      <p className="font-bold text-gray-200 mt-0.5">{currentMember.firstName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-gray-500 font-semibold uppercase">ID Documento / Doc ID</p>
                      <p className="font-mono font-bold text-brand-red mt-0.5">{currentMember.dniPassport}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-gray-500 font-semibold uppercase">Tipo / Document Type</p>
                      <p className="font-bold text-gray-200 mt-0.5">{currentMember.documentType}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-gray-500 font-semibold uppercase">Nacionalidad / Nationality</p>
                      <p className="font-bold text-gray-200 mt-0.5">{currentMember.nationality}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-gray-500 font-semibold uppercase">Nacimiento / Date of Birth</p>
                      <p className="font-bold text-gray-200 mt-0.5">{currentMember.birthDate || 'N/D'}</p>
                    </div>
                    <div className="col-span-2 border-t border-border-dark/60 pt-3">
                      <p className="text-[9px] font-mono text-gray-500 font-semibold uppercase">Validez / Expiry Date</p>
                      <p className="font-bold text-gray-200 mt-0.5">{currentMember.expiryDate || 'PERMANENTE'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border-dark flex justify-between items-center">
                  <div className="font-mono text-[9px] text-gray-500">
                    <p>REGISTRO ASOCIACIÓN: {new Date(currentMember.registerDate).toLocaleDateString()}</p>
                    <p className="text-gray-600 mt-0.5">UID: {currentMember.id.toUpperCase()}</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-panel-dark/50 border border-border-dark flex items-center gap-3">
                <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                <div className="text-[11px] text-gray-400">
                  <p className="font-semibold text-gray-200">Expediente Oficial Verificado</p>
                  <p>Registrado por {currentMember.registeredBy?.name || 'ADMIN'} el {new Date(currentMember.registerDate).toLocaleDateString()}</p>
                </div>
              </div>

              {(frontImageDisplay || backImageDisplay) && (
                <div className="grid grid-cols-2 gap-3 bg-brand-dark p-4 rounded-2xl border border-border-dark mt-4">
                  <div>
                    <p className="text-[10px] font-mono text-gray-400 uppercase font-bold mb-2">DNI Delantera (Anverso)</p>
                    {frontImageDisplay ? (
                      <img src={frontImageDisplay} alt="DNI Delantera" className="w-full aspect-[1.58/1] object-cover rounded-xl border border-border-dark" />
                    ) : (
                      <div className="aspect-[1.58/1] bg-panel-dark border border-dashed border-border-dark rounded-xl flex items-center justify-center text-xs text-gray-500">
                        Sin foto delantera
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-mono text-gray-400 uppercase font-bold mb-2">DNI Trasera (Reverso)</p>
                    {backImageDisplay ? (
                      <img src={backImageDisplay} alt="DNI Trasera" className="w-full aspect-[1.58/1] object-cover rounded-xl border border-border-dark" />
                    ) : (
                      <div className="aspect-[1.58/1] bg-panel-dark border border-dashed border-border-dark rounded-xl flex items-center justify-center text-xs text-gray-500">
                        Sin foto trasera
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-dark">
                <div>
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-emerald-400" />
                    <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                      Historial de Auditoría & Trazabilidad
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Registro auditable: quién editó, qué campo se cambió y fecha exacta.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchAuditLogs}
                  disabled={isLoadingLogs}
                  className="px-2.5 py-1.5 bg-panel-dark border border-border-dark hover:border-emerald-500/40 text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  title="Recargar logs"
                >
                  <RefreshCw size={12} className={`text-emerald-400 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 py-1">
                <div className="p-3 bg-panel-dark/70 rounded-xl border border-border-dark/80">
                  <span className="text-[10px] font-mono uppercase text-gray-400 font-semibold block">Total Registros</span>
                  <span className="text-base font-display font-bold text-white mt-0.5 block">{auditLogs.length}</span>
                </div>
                <div className="p-3 bg-panel-dark/70 rounded-xl border border-border-dark/80">
                  <span className="text-[10px] font-mono uppercase text-gray-400 font-semibold block">Socio Auditado</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 mt-1 block truncate">
                    {currentMember.dniPassport}
                  </span>
                </div>
                <div className="p-3 bg-panel-dark/70 rounded-xl border border-border-dark/80">
                  <span className="text-[10px] font-mono uppercase text-gray-400 font-semibold block">Último Cambio</span>
                  <span className="text-xs font-medium text-gray-300 mt-1 block truncate">
                    {auditLogs[0] ? new Date(auditLogs[0].timestamp).toLocaleDateString() : 'Ninguno'}
                  </span>
                </div>
              </div>

              {isLoadingLogs && auditLogs.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw size={24} className="text-emerald-400 animate-spin" />
                  <p className="text-xs text-gray-400 font-medium">Consultando registro de auditoría...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 px-4 rounded-2xl bg-panel-dark/40 border border-border-dark/60 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                    <History size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Sin registros de auditoría</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Cualquier edición de datos, modificación de estado o registro quedará automáticamente guardado en esta bitácora.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {auditLogs.map((log) => {
                    const isAlta = log.action?.includes('ALTA');
                    const isEstado = log.action?.includes('ESTADO') || log.action?.includes('APROB') || log.action?.includes('RECHAZ');
                    const isBaja = log.action?.includes('BAJA');

                    return (
                      <div
                        key={log.id}
                        className="p-3.5 bg-panel-dark/80 hover:bg-panel-dark border border-border-dark/90 hover:border-emerald-500/30 rounded-2xl transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase border ${isAlta ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                                isBaja ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' :
                                  isEstado ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                                    'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                              }`}>
                              {log.action}
                            </span>

                            <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                              <Clock size={11} className="text-gray-500" />
                              {new Date(log.timestamp).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 bg-brand-dark px-2 py-1 rounded-lg border border-border-dark">
                            <div className="w-5 h-5 rounded bg-emerald-600 border border-emerald-400/40 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                              {log.workerName ? log.workerName.charAt(0).toUpperCase() : 'W'}
                            </div>
                            <div className="text-left">
                              <span className="text-[11px] font-bold text-gray-200 block leading-tight">
                                {log.workerName}
                              </span>
                              <span className="text-[9px] font-mono text-gray-400 uppercase">
                                {log.workerRole === 'admin' ? 'Admin' : 'Operador'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed">
                          {log.details}
                        </p>

                        {log.changes && log.changes.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border-dark/60 space-y-1.5">
                            <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">
                              Campos modificados:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {log.changes.map((ch, idx) => (
                                <div key={idx} className="p-2 bg-brand-dark/90 rounded-xl border border-border-dark/70 text-xs">
                                  <div className="font-semibold text-gray-300 text-[11px] mb-1">
                                    {ch.label || ch.field}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-mono flex-wrap">
                                    <span className="line-through text-rose-400/80 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                      {String(ch.from || '(vacío)')}
                                    </span>
                                    <ArrowRight size={11} className="text-gray-500 shrink-0" />
                                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                      {String(ch.to || '(vacío)')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full md:w-80 bg-panel-dark p-6 flex flex-col justify-between overflow-y-auto shrink-0">
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-display font-semibold text-gray-200 uppercase tracking-wider">
                Datos de Contacto
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Información del socio en el sistema
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Mail size={13} className="text-brand-red shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Correo</p>
                  <p className="font-medium text-gray-300 truncate">{currentMember.email || 'No proporcionado'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone size={13} className="text-brand-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Teléfono</p>
                  <p className="font-medium text-gray-300">{currentMember.phone || 'No proporcionado'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin size={13} className="text-brand-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-mono text-gray-500 uppercase">Dirección</p>
                  <p className="font-medium text-gray-300 leading-relaxed">{currentMember.address || 'No proporcionado'}</p>
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
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                      GUARDADO
                    </span>
                  ) : (
                    <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold">
                      PENDIENTE
                    </span>
                  )}
                </div>

                {signedPdfData ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadSignedPdf}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow transition-all"
                    >
                      <Eye size={12} /> Ver / Descargar PDF Firmado
                    </button>
                    <button
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={isUploadingPdf}
                      className="p-1.5 bg-panel-dark border border-border-dark hover:border-gray-600 text-gray-300 rounded-lg text-xs font-bold"
                      title="Reemplazar PDF Firmado"
                    >
                      <Upload size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isUploadingPdf}
                    className="w-full py-2 bg-brand-dark hover:bg-border-dark border border-dashed border-border-dark hover:border-brand-red text-gray-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    {isUploadingPdf ? (
                      <>
                        <RefreshCw size={12} className="animate-spin text-brand-red" /> Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload size={12} className="text-brand-red" /> Subir PDF Firmado del Socio
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => { setActiveTab('badge'); setSaveError(null); }}
                  className={`h-9 border rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${activeTab === 'badge'
                      ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                      : 'bg-brand-dark border-border-dark hover:border-gray-600 text-gray-300'
                    }`}
                >
                  <IdCard size={13} className="text-emerald-400" />
                  Carnet
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('edit'); resetEditForm(); }}
                  className={`h-9 border rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${activeTab === 'edit'
                      ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                      : 'bg-brand-dark border-border-dark hover:border-gray-600 text-gray-300'
                    }`}
                >
                  <Edit3 size={13} className="text-emerald-400" />
                  Editar
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setActiveTab('audit'); fetchAuditLogs(); }}
                className={`w-full h-9 border rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${activeTab === 'audit'
                    ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-brand-dark border-border-dark hover:border-emerald-500/40 text-gray-300 hover:text-white'
                  }`}
              >
                <History size={13} className="text-emerald-400" />
                Historial de Auditoría ({auditLogs.length})
              </button>

              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full h-9 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 size={13} />
                Dar de Baja / Eliminar Socio
              </button>
            </div>

            <div className="pt-4 border-t border-border-dark space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={12} className="text-brand-red" />
                  Documentación Svadhisthana
                </span>
              </div>

              <label
                onClick={() => setIncludeAuditHistory(!includeAuditHistory)}
                className="flex items-center justify-between p-2 rounded-xl bg-brand-dark/50 border border-border-dark hover:border-gray-700 cursor-pointer select-none transition-all"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck size={13} className={includeAuditHistory ? "text-emerald-400" : "text-gray-500"} />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-gray-300">Historial de Auditoría</span>
                    <span className="text-[9px] text-gray-500">Agente y fecha de alta</span>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${includeAuditHistory ? 'bg-brand-red text-white' : 'border border-gray-600 bg-transparent'
                  }`}>
                  {includeAuditHistory && <Check size={11} />}
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-border-dark mt-4">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="w-full h-10 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-red/20 glow-border transition-all"
            >
              <Download size={14} /> Imprimir Ficha de Alta B&W (Firma)
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyDetails}
                className="h-8 bg-gray-900 border border-border-dark hover:border-brand-red hover:text-white rounded-xl text-gray-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="h-8 bg-gray-900 border border-border-dark hover:border-brand-red hover:text-white rounded-xl text-gray-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
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