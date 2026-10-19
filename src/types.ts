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
  memberNumber?: string; // Número de socio alfanumérico único (Ej: SOC-K9P2X4)
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
  // Compatibilidad con componentes existentes
  dniFrontImage?: string | null;
  dni_front_image?: string | null;
  dniBackImage?: string | null;
  dni_back_image?: string | null;
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

export interface CannabisProduct {
  id: string;
  name: string;
  category: 'SATIVA' | 'INDICA' | 'HÍBRIDA' | 'EXTRACCIÓN' | 'COMESTIBLE';
  thcCbd?: string;
  pricePerGram: number;
  stockGrams: number;
  isActive: boolean;
  createdAt?: string;
}

export interface DispensationLog {
  id: string;
  productId?: string;
  productName: string;
  memberId?: string;
  memberNumber: string;
  memberName: string;
  grams: number;
  totalPrice: number;
  dispensedBy: string;
  createdAt: string;
}

export interface PanicAlert {
  id: string;
  workerId?: string;
  workerName: string;
  workerRole: string;
  location?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'FALSE_ALARM';
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
}