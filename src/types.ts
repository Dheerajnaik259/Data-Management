// ── Enum types are now plain strings, sourced from settings collection at runtime ──

export interface SettingsOption {
  value: string;
  order: number;
  archived: boolean;
}

export interface SettingsDoc {
  id: string;
  key: string;
  label: string;
  options: SettingsOption[];
  editable: boolean;
}

// ── Core entity types ──

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  status: string; // from settings.clientStatus
  contractLink: string;
  createdAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface CommunicationLog {
  id: string;
  clientId: string;
  date: string;
  note: string;
  loggedBy: string;
  createdAt: string;
}

export interface Cameraman {
  id: string;
  name: string;
  phone: string;
  rate: number;
  notes: string;
  contractLink: string;
  unavailability: Array<{ date: string; reason: string }>;
  createdAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface CameramanAssignment {
  cameramanId: string;
  amount: number | null;
  paid: boolean;
  paidAt?: string | null;
  callTime?: string | null;
  checkedInAt?: string | null;
  payoutVoucherNumber?: string | null; // RCP-{YYYY}-{seq}, assigned on first voucher generation
}

export interface Deliverable {
  type: string; // from settings.deliverableTypes
  count: number;
  fileLink: string;
}

export interface Shoot {
  id: string;
  clientId: string;
  date: string; // YYYY-MM-DD
  callTime: string;
  location: string;
  status: string; // from settings.shootStatus
  clientAmount: number; // always INR
  clientPaid: boolean;
  clientPaidAt?: string | null;
  clientInvoiceNumber?: string | null; // INV-{YYYY}-{seq}, assigned on first invoice generation
  assignedCameramanIds: string[]; // flat mirror of assignments[].cameramanId for Firestore array-contains queries
  assignments: CameramanAssignment[];
  deliverables: Deliverable[];
  clientNotifiedAt?: string | null; // set by Cloud Function after shoot-confirmation email sent
  createdAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  shootId?: string;
  category: string; // from settings.expenseCategories
  createdAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

// ── Invoice counters ──

export interface InvoiceCounter {
  clientInvoiceNext: number;
  payoutVoucherNext: number;
}

// ── Auth & Users ──

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  // Keep this open so adding a future role is a permissions-map change,
  // rather than a type-system rewrite.
  role: string;
}

export interface UserDoc {
  id: string;
  role: string;
  name: string;
  email: string;
}

// ── Change Approval Workflow ──

export type ChangeRequestAction = 'create' | 'edit' | 'delete';
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';
export type ManagedCollection = 'clients' | 'cameramen' | 'shoots' | 'expenses';

export interface ChangeRequest {
  id: string;
  targetCollection: ManagedCollection;
  targetDocId: string | null; // null if create
  action: ChangeRequestAction;
  proposedData: Record<string, unknown>;
  requestedBy: string; // admin uid
  requestedAt: string;
  status: ChangeRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string;
  revisionCount: number;
}

// ── Notifications ──

export type NotificationType = 'pending_approval' | 'approved' | 'rejected' | 'resubmitted';

export interface AppNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  relatedChangeRequestId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ── Computed / Display types ──

export interface OverdueInfo {
  isOverdue: boolean;
  daysDiff: number;
  dueDate: string;
  label: string;
}

export interface PaymentRecord {
  id: string;
  type: 'incoming' | 'outgoing';
  shootId: string;
  targetId: string; // clientId or cameramanId
  targetName: string;
  phone?: string;
  shootDate: string;
  shootLocation: string;
  shootStatus: string;
  amount: number;
  hasAssignedRate?: boolean;
  isPaid: boolean;
  paidAt?: string | null;
  overdueInfo: OverdueInfo;
  assignmentIndex?: number; // for cameraman payouts
}

export interface ClientLedger {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
}

export interface CameramanLedger {
  totalAssigned: number;
  totalPaid: number;
  outstanding: number;
}
