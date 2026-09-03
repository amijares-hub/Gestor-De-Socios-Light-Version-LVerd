import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { 
  FileText, 
  Download, 
  Printer, 
  User, 
  Calendar, 
  CreditCard, 
  Globe, 
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
  RotateCcw,
  Sparkles,
  History,
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { AssociationMember, WorkerUser, DocumentType, ActivityLog } from '../types';
import ConfirmModal from './ConfirmModal';

export interface SocioTemplateProps {
  member: AssociationMember;
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
  const [currentMember, setCurrentMember] = useState<AssociationMember>(member);
  const [copied, setCopied] = useState(false);
  const [pageSize, setPageSize] = useState<'a4' | 'id_card'>('a4');
  const [includeAuditHistory, setIncludeAuditHistory] = useState<boolean>(true);

  // Active View Tab: 'badge' | 'edit' | 'audit'
  const [activeTab, setActiveTab] = useState<'badge' | 'edit' | 'audit'>('badge');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Edit Mode State
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

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete State
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch audit logs for this specific member
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
      console.error("Error fetching audit logs for member:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [currentMember.id]);

  // Sync edit form if member prop changes
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
    setSaveError(null);
    setSaveSuccess(null);
  };

  // Save changes
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
    };

    try {
      const res = await fetch(`/api/members/${currentMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberData: updatedData,
          worker: currentWorker
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar los cambios');
      }

      const saved: AssociationMember = await res.json();
      setCurrentMember(saved);
      if (onUpdateMember) {
        await onUpdateMember(saved);
      }
      setSaveSuccess("¡Ficha actualizada exitosamente en la base de datos!");
      // Immediately refresh audit trail
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

  // Delete Member
  const handleDeleteMember = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/members/${currentMember.id}?worker=${encodeURIComponent(JSON.stringify(currentWorker))}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al eliminar el socio');
      }

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

  // Download high-end PDF using jsPDF (A4 or ID Card / Carnet CR-80)
  const handleDownloadPDF = () => {
    const colorRed = [220, 38, 38];
    const colorDark = [18, 18, 24];
    const colorGray = [100, 116, 139];

    if (pageSize === 'id_card') {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 54]
      });

      doc.setFillColor(18, 18, 24);
      doc.rect(0, 0, 85.6, 54, 'F');

      doc.setFillColor(colorRed[0], colorRed[1], colorRed[2]);
      doc.rect(0, 0, 85.6, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('LAGUNA VERDE', 5, 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.setTextColor(180, 180, 190);
      doc.text('CARNET OFICIAL DE SOCIO', 5, 8.5);

      const isApproved = currentMember.registrationStatus === 'approved';
      doc.setFillColor(isApproved ? 16 : 217, isApproved ? 185 : 119, isApproved ? 129 : 6);
      doc.roundedRect(60, 4, 20.6, 4.5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.5);
      doc.text(currentMember.registrationStatus.toUpperCase(), 70.3, 7.2, { align: 'center' });

      doc.setDrawColor(60, 60, 75);
      doc.setFillColor(28, 28, 36);
      doc.roundedRect(5, 12, 22, 28, 1.5, 1.5, 'FD');

      doc.setFillColor(45, 45, 55);
      doc.circle(16, 22, 5, 'F');
      doc.roundedRect(10, 27, 12, 10, 2, 2, 'F');

      doc.setTextColor(140, 140, 160);
      doc.setFontSize(3.5);
      doc.text('FOTO IDENTIFICATIVA', 16, 38.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(150, 150, 165);
      doc.text('APELLIDOS / SURNAME', 30, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text(currentMember.lastName.toUpperCase(), 30, 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(150, 150, 165);
      doc.text('NOMBRE / GIVEN NAME', 30, 21.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(currentMember.firstName.toUpperCase(), 30, 24.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(150, 150, 165);
      doc.text(`${currentMember.documentType} / DOC ID`, 30, 29);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(220, 38, 38);
      doc.text(currentMember.dniPassport.toUpperCase(), 30, 32);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(150, 150, 165);
      doc.text('NACIONALIDAD', 56, 29);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(255, 255, 255);
      doc.text((currentMember.nationality || 'ESPAÑA').toUpperCase(), 56, 32);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(150, 150, 165);
      doc.text('FECHA NACIMIENTO', 30, 36.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.2);
      doc.setTextColor(255, 255, 255);
      doc.text(currentMember.birthDate || 'N/D', 30, 39.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(150, 150, 165);
      doc.text('VALIDEZ / EXPIRY', 56, 36.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.2);
      doc.setTextColor(255, 255, 255);
      doc.text(currentMember.expiryDate || 'PERMANENTE', 56, 39.5);

      doc.setDrawColor(45, 45, 55);
      doc.line(5, 43.5, 80.6, 43.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      doc.setTextColor(180, 180, 190);
      doc.text(`ID SOCIO: #${currentMember.id.toUpperCase()}`, 5, 47);

      if (includeAuditHistory) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(3.5);
        doc.setTextColor(120, 120, 135);
        doc.text(`ALTA: ${new Date(currentMember.registerDate).toLocaleDateString()} | AGENTE: ${currentMember.registeredBy.name.toUpperCase()}`, 5, 50.5);
      }

      doc.setFillColor(255, 255, 255);
      const codeStart = 66;
      for (let i = 0; i < 28; i++) {
        const barWidth = (i % 3 === 0) ? 0.6 : 0.3;
        doc.rect(codeStart + (i * 0.5), 45, barWidth, 4.5, 'F');
      }

      doc.save(`carnet_socio_${currentMember.dniPassport}_${currentMember.lastName.toLowerCase()}.pdf`);
      return;
    }

    // Default: A4 Standard Document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFillColor(colorDark[0], colorDark[1], colorDark[2]);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setFillColor(colorRed[0], colorRed[1], colorRed[2]);
    doc.rect(0, 0, 210, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('LAGUNA VERDE ASOCIACIÓN', 20, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text('SISTEMA INTEGRADO DE REGISTRO & CONTROL DOCUMENTAL', 20, 26);

    const isApproved = currentMember.registrationStatus === 'approved';
    doc.setFillColor(isApproved ? 16 : 217, isApproved ? 185 : 119, isApproved ? 129 : 6);
    doc.roundedRect(145, 14, 45, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(currentMember.registrationStatus.toUpperCase(), 167.5, 19, { align: 'center' });

    doc.setDrawColor(40, 40, 50);
    doc.setLineWidth(0.5);
    doc.line(20, 32, 190, 32);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('FICHA OFICIAL DE SOCIO REGISTRADO', 20, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text(`Identificador de Sistema: #${currentMember.id.toUpperCase()}`, 20, 48);

    doc.setDrawColor(50, 50, 60);
    doc.setFillColor(24, 24, 32);
    doc.roundedRect(20, 56, 170, 75, 4, 4, 'FD');

    doc.setDrawColor(60, 60, 75);
    doc.setFillColor(32, 32, 42);
    doc.roundedRect(28, 64, 35, 45, 2, 2, 'FD');

    doc.setFillColor(60, 60, 75);
    doc.circle(45.5, 78, 8, 'F');
    doc.roundedRect(35.5, 87, 20, 18, 3, 3, 'F');

    doc.setTextColor(140, 140, 160);
    doc.setFontSize(7);
    doc.text('FOTO ESCANEO', 45.5, 104, { align: 'center' });

    let startX = 72;
    let startY = 68;
    let colGap = 60;
    let rowGap = 13;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text('APELLIDOS / SURNAME', startX, startY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(currentMember.lastName, startX, startY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text('NOMBRE / GIVEN NAME', startX + colGap, startY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(currentMember.firstName, startX + colGap, startY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text(`${currentMember.documentType} / DOCUMENT ID`, startX, startY + rowGap);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(colorRed[0], colorRed[1], colorRed[2]);
    doc.text(currentMember.dniPassport, startX, startY + rowGap + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text('NACIONALIDAD / NATIONALITY', startX + colGap, startY + rowGap);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(currentMember.nationality || 'N/D', startX + colGap, startY + rowGap + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text('FECHA DE NACIMIENTO', startX, startY + (rowGap * 2));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(currentMember.birthDate || 'N/D', startX, startY + (rowGap * 2) + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text('FECHA CADUCIDAD DOCUMENTO', startX + colGap, startY + (rowGap * 2));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(currentMember.expiryDate || 'PERMANENTE', startX + colGap, startY + (rowGap * 2) + 4.5);

    doc.setDrawColor(50, 50, 60);
    doc.setFillColor(24, 24, 32);
    doc.roundedRect(20, 137, 170, 48, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(colorRed[0], colorRed[1], colorRed[2]);
    doc.text('INFORMACIÓN DE CONTACTO & LOCALIZACIÓN', 28, 147);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text('CORREO ELECTRÓNICO:', 28, 156);
    doc.setTextColor(255, 255, 255);
    doc.text(currentMember.email || 'No proporcionado', 70, 156);

    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text('TELÉFONO DE CONTACTO:', 28, 165);
    doc.setTextColor(255, 255, 255);
    doc.text(currentMember.phone || 'No proporcionado', 70, 165);

    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text('DIRECCIÓN RESIDENCIAL:', 28, 174);
    doc.setTextColor(255, 255, 255);
    doc.text(currentMember.address || 'No proporcionada', 70, 174);

    if (includeAuditHistory) {
      doc.setDrawColor(50, 50, 60);
      doc.setFillColor(24, 24, 32);
      doc.roundedRect(20, 191, 170, 48, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('HISTORIAL DE AUDITORÍA & TRAZABILIDAD', 28, 201);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
      doc.text('FECHA OFICIAL DE ALTA:', 28, 210);
      doc.setTextColor(255, 255, 255);
      doc.text(new Date(currentMember.registerDate).toLocaleString(), 75, 210);

      doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
      doc.text('AGENTE REGISTRADOR:', 28, 218);
      doc.setTextColor(255, 255, 255);
      doc.text(`${currentMember.registeredBy.name} (ID: ${currentMember.registeredBy.id})`, 75, 218);

      doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
      doc.text('CANAL DE CAPTURA:', 28, 226);
      doc.setTextColor(255, 255, 255);
      doc.text('Escáner OCR Automatizado / Validación Facial', 75, 226);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
    doc.text('LAGUNA VERDE - GESTIÓN DOCUMENTAL Y ACCESO DIGITAL SEGURO', 105, 280, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`Generado el ${new Date().toLocaleString()} por operador autorizado`, 105, 284, { align: 'center' });

    doc.save(`ficha_socio_${currentMember.dniPassport}_${currentMember.lastName.toLowerCase()}.pdf`);
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
      currentMember.registeredBy.name
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.map(h => `"${h}"`).join(','), row.map(r => `"${r.replace(/"/g, '""')}"`).join(',')].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `socio_${currentMember.dniPassport}_${currentMember.lastName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/85 backdrop-blur-md no-print">
      
      {/* Reusable Confirmation Modal for Delete Action */}
      <ConfirmModal
        isOpen={confirmDelete}
        type="danger"
        title="¿Confirmar baja del socio?"
        message={
          <span>
            Esta acción eliminará de forma permanente a <strong className="text-white font-bold">{currentMember.firstName} {currentMember.lastName}</strong> ({currentMember.dniPassport}) de la base de datos de la asociación Laguna Verde.
          </span>
        }
        confirmText="Sí, Eliminar Socio"
        cancelText="Cancelar"
        isLoading={isDeleting}
        onConfirm={handleDeleteMember}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="relative w-full max-w-4xl bg-panel-dark border border-border-dark rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[92vh] md:h-auto max-h-[92vh]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-gray-400 hover:text-white bg-gray-900/80 rounded-full border border-border-dark hover:border-brand-red transition-all"
        >
          <X size={18} />
        </button>

        {/* LEFT COLUMN: Main content (View Certificate OR Edit Form OR Audit Log) */}
        <div className="flex-1 bg-brand-dark p-5 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border-dark overflow-y-auto">
          
          {/* Top Toggle: Carnet vs Editar vs Auditoría */}
          <div className="flex items-center justify-between gap-3 mb-4 border-b border-border-dark pb-3">
            <div className="flex items-center gap-1.5 bg-panel-dark p-1 rounded-xl border border-border-dark flex-wrap">
              <button
                type="button"
                onClick={() => { setActiveTab('badge'); setSaveError(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'badge' 
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/20' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <IdCard size={13} />
                Carnet Oficial
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('edit'); resetEditForm(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'edit' 
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'audit' 
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/20' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <History size={13} />
                Auditoría
                {auditLogs.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                    activeTab === 'audit' ? 'bg-white/20 text-white' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
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

          {/* MODE 1: EDIT FORM */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                    Modificar Información del Socio
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Actualiza los campos oficiales y guarda los cambios en la base de datos.
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

              {/* Form Grid */}
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

              {/* Form Action Buttons */}
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
                  onClick={() => { setIsEditing(false); resetEditForm(); }}
                  disabled={isSaving}
                  className="px-4 h-10 bg-gray-900 border border-border-dark hover:border-gray-600 text-gray-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>

            </form>
          )}

          {/* MODE 2: OFFICIAL CERTIFICATE BADGE DISPLAY */}
          {activeTab === 'badge' && (
            <div className="space-y-4">
              <div className="border border-border-dark/60 rounded-2xl p-5 relative bg-gradient-to-b from-panel-dark/40 to-brand-dark overflow-hidden">
                
                {/* Watermark */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl font-black font-display text-gray-800/5 select-none pointer-events-none uppercase tracking-widest text-center">
                  LAGUNA VERDE
                </div>

                {/* Certificate Header */}
                <div className="flex justify-between items-start border-b border-border-dark pb-4 mb-4">
                  <div>
                    <span className="text-[10px] font-mono text-brand-red font-bold tracking-widest uppercase">
                      LAGUNA VERDE ASOCIACIÓN
                    </span>
                    <h4 className="text-lg font-display font-bold text-gray-100 mt-1">
                      FICHA OFICIAL DE SOCIO
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      currentMember.registrationStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      currentMember.registrationStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {currentMember.registrationStatus === 'approved' ? 'Aprobado' :
                       currentMember.registrationStatus === 'pending' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  </div>
                </div>

                {/* Badge Content */}
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                  
                  {/* Photo Frame / Avatar - Fully green with white text */}
                  <div className="w-28 h-36 bg-emerald-600 rounded-xl border border-emerald-400/50 flex flex-col items-center justify-center relative overflow-hidden shrink-0 shadow-lg shadow-emerald-950/40">
                    <span className="text-3xl font-display font-black text-white tracking-wider">
                      {currentMember.firstName.charAt(0)}{currentMember.lastName.charAt(0)}
                    </span>
                    <span className="absolute bottom-2 text-[8px] font-mono text-white font-bold uppercase tracking-wider bg-emerald-800/90 px-2 py-0.5 rounded">
                      FOTO SOCIO
                    </span>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/40 animate-pulse"></div>
                  </div>

                  {/* Metadata Grid */}
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

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-border-dark flex justify-between items-center">
                  <div className="font-mono text-[9px] text-gray-500">
                    <p>REGISTRO ASOCIACIÓN: {new Date(currentMember.registerDate).toLocaleDateString()}</p>
                    <p className="text-gray-600 mt-0.5">UID: {currentMember.id.toUpperCase()}</p>
                  </div>
                  <div className="h-6 flex items-end gap-0.5" style={{ imageRendering: 'pixelated' }}>
                    <div className="w-0.5 h-6 bg-gray-500"></div>
                    <div className="w-1 h-6 bg-gray-500"></div>
                    <div className="w-0.5 h-6 bg-gray-500"></div>
                    <div className="w-0.5 h-4 bg-gray-500"></div>
                    <div className="w-1 h-6 bg-gray-500"></div>
                    <div className="w-0.5 h-6 bg-gray-500"></div>
                    <div className="w-1 h-5 bg-gray-500"></div>
                    <div className="w-0.5 h-6 bg-gray-500"></div>
                  </div>
                </div>

              </div>

              <div className="p-3.5 rounded-xl bg-panel-dark/50 border border-border-dark flex items-center gap-3">
                <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                <div className="text-[11px] text-gray-400">
                  <p className="font-semibold text-gray-200">Expediente Oficial Verificado</p>
                  <p>Registrado por {currentMember.registeredBy.name} el {new Date(currentMember.registerDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: AUDIT TRAIL LOG SECTION */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {/* Audit Header */}
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

              {/* Summary Metrics */}
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

              {/* Logs List */}
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
                    Cualquier edición de datos, modificación de estado o registro quedará automáticamente guardado en esta bitácora con los valores anteriores y nuevos.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('edit'); resetEditForm(); }}
                    className="mt-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Editar Ficha de Socio
                  </button>
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
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase border ${
                              isAlta ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
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

                          {/* Worker Avatar (solid green, white text) */}
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

                        {/* Details message */}
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {log.details}
                        </p>

                        {/* Granular Field Changes Diff */}
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

        {/* RIGHT COLUMN: Sidebar Controls & Contact Info */}
        <div className="w-full md:w-80 bg-panel-dark p-6 flex flex-col justify-between overflow-y-auto shrink-0">
          
          <div className="space-y-5">
            
            {/* Contact Details */}
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

            {/* Quick Actions: Badge, Edit, Audit & Delete */}
            <div className="pt-3 border-t border-border-dark space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => { setActiveTab('badge'); setSaveError(null); }}
                  className={`h-9 border rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'badge' 
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
                  className={`h-9 border rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'edit' 
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
                className={`w-full h-9 border rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'audit' 
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

            {/* PDF Export Options */}
            <div className="pt-4 border-t border-border-dark space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={12} className="text-brand-red" />
                  Formato Exportación
                </span>
                <span className="text-[9px] font-mono text-brand-red font-semibold uppercase">
                  {pageSize === 'a4' ? 'A4 Oficial' : 'Tarjeta ID'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-brand-dark/80 p-1 rounded-xl border border-border-dark text-[11px]">
                <button
                  type="button"
                  onClick={() => setPageSize('a4')}
                  className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                    pageSize === 'a4'
                      ? 'bg-panel-dark text-white shadow border border-border-dark text-brand-red'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileText size={12} /> A4 Oficial
                </button>
                <button
                  type="button"
                  onClick={() => setPageSize('id_card')}
                  className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                    pageSize === 'id_card'
                      ? 'bg-panel-dark text-white shadow border border-border-dark text-brand-red'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <IdCard size={12} /> Tarjeta ID
                </button>
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
                <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                  includeAuditHistory ? 'bg-brand-red text-white' : 'border border-gray-600 bg-transparent'
                }`}>
                  {includeAuditHistory && <Check size={11} />}
                </div>
              </label>
            </div>

          </div>

          {/* Bottom Export Buttons */}
          <div className="space-y-2 pt-4 border-t border-border-dark mt-4">
            <button 
              type="button"
              onClick={handleDownloadPDF}
              className="w-full h-10 bg-brand-red hover:bg-brand-red-hover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-red/20 glow-border transition-all"
            >
              <Download size={14} /> 
              {pageSize === 'a4' ? 'Descargar Ficha A4 (PDF)' : 'Descargar Carnet ID (PDF)'}
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
