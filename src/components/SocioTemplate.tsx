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
  Edit3,
  Trash2,
  Save,
  AlertTriangle,
  History,
  Upload,
  FileCheck,
  Eye,
  RefreshCw,
  File,
  Image as ImageIcon
} from 'lucide-react';
import { AssociationMember, WorkerUser, DocumentType, ActivityLog, MemberDocument } from '../types';
import ConfirmModal from './ConfirmModal';
import DniPhotoCapture from './DniPhotoCapture';
import { generateSvadhisthanaAltaPdf } from '../utils/pdfGenerator';
import { supabase } from '../supabaseClient';

export interface SocioTemplateProps {
  member: AssociationMember & { 
    dniFrontImage?: string; 
    dni_front_image?: string; 
    memberPhoto?: string;
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

  const [activeTab, setActiveTab] = useState<'badge' | 'edit' | 'audit' | 'docs'>('badge');
  const [auditLogs, setAuditLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Documentos y escaneos adjuntos
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulario de edición
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

  // 1 Sola foto del socio
  const [editPhoto, setEditPhoto] = useState<string | null>(
    member.dniFrontImage || member.dni_front_image || member.memberPhoto || null
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cargar Documentos Adjuntos del Socio
  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('member_documents')
        .select('*')
        .eq('member_id', currentMember.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDocuments(data.map((d: any) => ({
          id: d.id,
          memberId: d.member_id,
          name: d.name,
          fileType: d.file_type,
          fileUrl: d.file_url,
          uploadedBy: d.uploaded_by,
          createdAt: d.created_at
        })));
      }
    } catch (e) {
      console.error('Error cargando documentos del socio:', e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const res = await fetch(`/api/members/${currentMember.id}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Error obteniendo logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
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
    setEditPhoto(currentMember.dniFrontImage || currentMember.dni_front_image || currentMember.memberPhoto || null);
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

    const updatedData: AssociationMember = {
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
      dniFrontImage: editPhoto,
      dni_front_image: editPhoto,
      memberPhoto: editPhoto
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
          dni_front_image: editPhoto,
          member_photo: editPhoto
        })
        .eq('id', currentMember.id);

      if (error) throw error;

      if (onUpdateMember) {
        await onUpdateMember(updatedData);
      }
      setCurrentMember(updatedData);
      setSaveSuccess("¡Ficha y fotografía actualizadas!");
      await fetchAuditLogs();
      setTimeout(() => {
        setActiveTab('badge');
        setSaveSuccess(null);
      }, 900);
    } catch (err: any) {
      setSaveError(err.message || "Error al actualizar información.");
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
      setSaveError(err.message || 'Error al dar de baja.');
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = generateSvadhisthanaAltaPdf(currentMember);
    doc.save(`Alta_Socio_${currentMember.dniPassport}_Svadhisthana.pdf`);
  };

  // Subir Documento / Escaneo / PDF / Imagen
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    setIsUploadingDoc(true);
    let fType: 'pdf' | 'image' | 'doc' = 'doc';
    if (file.type.includes('pdf')) fType = 'pdf';
    else if (file.type.includes('image')) fType = 'image';

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Content = event.target?.result as string;

      try {
        const payload = {
          member_id: currentMember.id,
          name: file.name,
          file_type: fType,
          file_url: base64Content,
          uploaded_by: currentWorker?.name || 'Administrador'
        };

        const { data, error } = await supabase
          .from('member_documents')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        setDocuments(prev => [
          {
            id: data.id,
            memberId: data.member_id,
            name: data.name,
            fileType: data.file_type,
            fileUrl: data.file_url,
            uploadedBy: data.uploaded_by,
            createdAt: data.created_at
          },
          ...prev
        ]);

        alert(`¡Archivo "${file.name}" adjuntado al expediente del socio con éxito!`);
      } catch (err: any) {
        alert('Error subiendo documento: ' + err.message);
      } finally {
        setIsUploadingDoc(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!confirm(`¿Eliminar el documento "${docName}"?`)) return;
    try {
      const { error } = await supabase.from('member_documents').delete().eq('id', docId);
      if (error) throw error;
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      alert('Error eliminando documento: ' + err.message);
    }
  };

  const handleOpenDocument = (docItem: MemberDocument) => {
    if (docItem.fileUrl.startsWith('data:')) {
      const win = window.open();
      if (win) {
        if (docItem.fileType === 'pdf') {
          win.document.write(`<iframe src="${docItem.fileUrl}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else if (docItem.fileType === 'image') {
          win.document.write(`<img src="${docItem.fileUrl}" style="max-width:100%; max-height:100vh; margin:auto; display:block;" />`);
        } else {
          const a = document.createElement('a');
          a.href = docItem.fileUrl;
          a.download = docItem.name;
          a.click();
        }
      }
    } else {
      window.open(docItem.fileUrl, '_blank');
    }
  };

  const memberPhotoDisplay = currentMember.dniFrontImage || currentMember.dni_front_image || currentMember.memberPhoto;

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
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeTab === 'badge' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <IdCard size={13} />
                Carnet
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('docs'); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeTab === 'docs' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileCheck size={13} />
                Documentos ({documents.length})
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('edit'); resetEditForm(); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeTab === 'edit' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Edit3 size={13} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('audit'); fetchAuditLogs(); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  activeTab === 'audit' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:text-white'
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

          {/* TAB 1: CARNET OFICIAL (CON 1 SOLA FOTO) */}
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
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      currentMember.registrationStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {currentMember.registrationStatus === 'approved' ? 'Aprobado' : 'Pendiente'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  {/* FOTO ÚNICA DEL ROSTRO DEL SOCIO */}
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-emerald-400/50 shadow-lg relative bg-brand-dark shrink-0 flex items-center justify-center">
                    {memberPhotoDisplay ? (
                      <img 
                        src={memberPhotoDisplay} 
                        alt="Foto Socio" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-3xl font-display font-black text-white">
                        {currentMember.firstName.charAt(0)}{currentMember.lastName.charAt(0)}
                      </span>
                    )}
                    <span className="absolute bottom-1 text-[7px] font-mono text-white font-bold uppercase bg-black/75 px-1.5 py-0.2 rounded">
                      Socio
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
            </div>
          )}

          {/* TAB 2: GESTOR DE DOCUMENTOS Y ESCANEOS ADJUNTOS */}
          {activeTab === 'docs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border-dark pb-3">
                <div>
                  <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck size={15} className="text-emerald-400" />
                    Expediente & Documentos Físicos Escaneados
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Sube y gestiona cualquier documento, escaneo o PDF firmado del socio.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all shadow"
                >
                  {isUploadingDoc ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                  <span>Subir Documento</span>
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="p-8 text-center bg-panel-dark/50 border border-dashed border-border-dark rounded-2xl text-xs text-gray-500 space-y-2">
                  <FileText size={28} className="mx-auto text-gray-600" />
                  <p>No hay documentos ni escaneos adjuntos en este expediente.</p>
                  <p className="text-[10px] text-gray-600">Puedes adjuntar contratos firmados, escaneos de DNI o documentos médicos en PDF o imagen.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 max-h-[48vh] overflow-y-auto pr-1">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-3 bg-panel-dark border border-border-dark rounded-xl flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#080d0a] border border-[#1a2a1e] flex items-center justify-center text-emerald-400 shrink-0">
                          {doc.fileType === 'pdf' ? <FileText size={16} /> : doc.fileType === 'image' ? <ImageIcon size={16} /> : <File size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{doc.name}</p>
                          <p className="text-[9px] font-mono text-gray-500">
                            Subido por {doc.uploadedBy} • {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenDocument(doc)}
                          className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                          title="Abrir o ver documento"
                        >
                          <Eye size={12} /> Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id, doc.name)}
                          className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Eliminar documento"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EDITAR SOCIO (CON 1 SOLA FOTO) */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pb-6 md:pb-0">
              <div>
                <h3 className="text-xs font-display font-bold text-white uppercase tracking-wider">
                  Modificar Socio
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Edita datos personales y fotografía del socio.
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

              {/* Captura de 1 sola foto */}
              <DniPhotoCapture
                frontImage={editPhoto}
                onChangeFront={setEditPhoto}
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

          {/* TAB 4: AUDITORÍA */}
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

        {/* Panel Lateral */}
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

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full h-9 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 mt-4"
            >
              <Trash2 size={13} />
              Dar de Baja / Eliminar Socio
            </button>
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
                onClick={() => {
                  const text = `Socio: ${currentMember.firstName} ${currentMember.lastName}\nDoc: ${currentMember.documentType} ${currentMember.dniPassport}\nNacionalidad: ${currentMember.nationality}`;
                  navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="h-8 bg-gray-900 border border-border-dark text-gray-300 rounded-xl font-semibold text-xs flex items-center justify-center gap-1"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const csvContent = `data:text/csv;charset=utf-8,"ID","DNI","Nombre","Apellidos"\n"${currentMember.id}","${currentMember.dniPassport}","${currentMember.firstName}","${currentMember.lastName}"`;
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `socio_${currentMember.dniPassport}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
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