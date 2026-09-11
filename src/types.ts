export type WorkerRole = 'admin' | 'worker';

export interface WorkerUser {
  id: string;
  email: string;
  name: string;
  password?: string;
  role: WorkerRole;
  permissions?: string[];
  active: boolean;
  createdAt?: string;
}

export type DocumentType = 'DNI' | 'PASSPORT' | 'NIE';

export interface AssociationMember {
  id: string;
  memberNumber: string; // Número de socio alfanumérico único (Ej: SOC-K9P2X4)
  dniPassport: string;
  documentType: DocumentType;
  firstName: string;
  lastName: string;
  nationality: string;
  birthDate?: string;
  expiryDate?: string;
  email?: string;
  phone?: string;
  address?: string;
  gender?: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  memberPhoto?: string | null; // Fotografía del rostro del socio
  signedPdf?: string | null;
  signed_pdf?: string | null;
  registrationStatus: 'pending' | 'approved' | 'rejected';
  registerDate: string;
  registeredBy?: {
    id: string;
    name: string;
  };
}

export interface RealTimeNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  senderName?: string;
  senderRole?: WorkerRole | string;
  isPush?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConnected: boolean;
}

export interface FieldChange {
  field: string;
  label?: string;
  from: any;
  to: any;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  workerName: string;
  workerRole?: WorkerRole | string;
  action: string;
  details: string;
  memberId?: string;
  memberName?: string;
  changes?: FieldChange[];
}