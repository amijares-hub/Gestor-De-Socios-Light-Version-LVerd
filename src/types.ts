export type WorkerRole = 'admin' | 'worker';

export interface WorkerUser {
  id: string;
  email: string;
  name: string;
  role: WorkerRole;
  permissions: string[]; // e.g., 'register_users', 'view_all', 'send_push', 'manage_workers', 'export_data', 'delete_records'
  active: boolean;
  createdAt: string;
}

export type DocumentType = 'DNI' | 'PASSPORT';

export interface AssociationMember {
  id: string;
  dniPassport: string;
  documentType: DocumentType;
  firstName: string;
  lastName: string;
  nationality: string;
  birthDate: string;
  expiryDate: string;
  email: string;
  phone: string;
  address: string;
  gender?: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  registrationStatus: 'pending' | 'approved' | 'rejected';
  registerDate: string;
  registeredBy: {
    id: string;
    name: string;
  };
}

export interface RealTimeNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  senderName: string;
  senderRole: WorkerRole;
  isPush: boolean;
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
  workerRole: WorkerRole;
  action: string;
  details: string;
  memberId?: string;
  memberName?: string;
  changes?: FieldChange[];
}
