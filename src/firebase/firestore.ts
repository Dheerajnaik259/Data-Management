import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, where, Unsubscribe, DocumentData, Timestamp,
  serverTimestamp, getDocs, limit, writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, isFirebaseConfigured } from './config';
import {
  Client, CommunicationLog, Cameraman, Shoot, Expense,
  SettingsDoc, ChangeRequest, AppNotification, ManagedCollection,
} from '../types';

const STORAGE_KEYS = {
  CLIENTS: 'smm_ops_clients',
  COMMUNICATION_LOGS: 'smm_ops_communication_logs',
  CAMERAMEN: 'smm_ops_cameramen',
  SHOOTS: 'smm_ops_shoots',
  EXPENSES: 'smm_ops_expenses',
  SETTINGS: 'smm_ops_settings',
  CHANGE_REQUESTS: 'smm_ops_change_requests',
  NOTIFICATIONS: 'smm_ops_notifications',
  COUNTERS: 'smm_ops_counters',
};

const localListeners: Array<() => void> = [];
function notifyLocalListeners() {
  localListeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
}

// ── SEED DATA ──

export const SEED_SETTINGS: SettingsDoc[] = [
  { id: 'clientStatus', key: 'clientStatus', label: 'Client Status', editable: true, options: [
    { value: 'active', order: 1, archived: false }, { value: 'inactive', order: 2, archived: false },
  ]},
  { id: 'shootStatus', key: 'shootStatus', label: 'Shoot Status', editable: true, options: [
    { value: 'scheduled', order: 1, archived: false }, { value: 'done', order: 2, archived: false },
  ]},
  { id: 'deliverableTypes', key: 'deliverableTypes', label: 'Deliverable Types', editable: true, options: [
    { value: 'reel', order: 1, archived: false }, { value: 'story', order: 2, archived: false }, { value: 'photo set', order: 3, archived: false },
  ]},
  { id: 'expenseCategories', key: 'expenseCategories', label: 'Expense Categories', editable: true, options: [
    { value: 'travel', order: 1, archived: false }, { value: 'equipment', order: 2, archived: false },
    { value: 'software', order: 3, archived: false }, { value: 'other', order: 4, archived: false },
  ]},
];

export const INITIAL_SEED_DATA = {
  clients: [
    { id: 'client-1', name: 'Aura Lifestyle & Apparel', phone: '+91 98231 44556', email: 'accounts@aura.example', notes: 'Quarterly fashion lookbook and seasonal product reels.', status: 'active', contractLink: '', createdAt: '2026-07-01T10:00:00.000Z', deletedAt: null, deletedBy: null },
    { id: 'client-2', name: 'Kafila Craft Brewery & Kitchen', phone: '+91 97112 88990', email: 'finance@kafila.example', notes: 'Weekly food & beverage showcase videos.', status: 'active', contractLink: '', createdAt: '2026-07-10T12:00:00.000Z', deletedAt: null, deletedBy: null },
    { id: 'client-3', name: 'Dr. Varma Dental Aesthetics', phone: '+91 99401 22334', email: 'admin@varma.example', notes: 'Doctor reels, patient testimonials.', status: 'active', contractLink: '', createdAt: '2026-07-15T09:30:00.000Z', deletedAt: null, deletedBy: null },
  ] as Client[],
  cameramen: [
    { id: 'cam-1', name: 'Rohan Sharma', phone: '+91 98765 11223', rate: 3500, notes: 'Sony FX3, cinematic gimbal.', contractLink: '', unavailability: [], createdAt: '2026-06-15T11:00:00.000Z', deletedAt: null, deletedBy: null },
    { id: 'cam-2', name: 'Arjun Das', phone: '+91 99887 66554', rate: 3000, notes: 'Fast paced event shooter.', contractLink: '', unavailability: [], createdAt: '2026-06-20T14:00:00.000Z', deletedAt: null, deletedBy: null },
    { id: 'cam-3', name: 'Vikram Mehta', phone: '+91 91234 55667', rate: 2500, notes: 'Reliable secondary camera operator.', contractLink: '', unavailability: [], createdAt: '2026-07-02T16:00:00.000Z', deletedAt: null, deletedBy: null },
  ] as Cameraman[],
  shoots: [
    { id: 'shoot-1', clientId: 'client-1', date: '2026-08-10', callTime: '09:00 AM', location: 'Olive Studio, Bandra West, Mumbai', status: 'done', clientAmount: 45000, clientPaid: false, clientPaidAt: null, clientInvoiceNumber: null, assignedCameramanIds: ['cam-1', 'cam-2'], assignments: [
      { cameramanId: 'cam-1', amount: 4000, paid: true, paidAt: '2026-08-12T10:00:00.000Z', payoutVoucherNumber: null, callTime: null, checkedInAt: '2026-08-10T08:55:00.000Z' },
      { cameramanId: 'cam-2', amount: 3000, paid: false, paidAt: null, payoutVoucherNumber: null, callTime: null, checkedInAt: null },
    ], deliverables: [
      { type: 'reel', count: 6, fileLink: '' }, { type: 'photo set', count: 20, fileLink: '' },
    ], clientNotifiedAt: null, createdAt: '2026-08-01T09:00:00.000Z', deletedAt: null, deletedBy: null },
    { id: 'shoot-2', clientId: 'client-2', date: '2026-08-14', callTime: '07:30 AM', location: 'Kafila Rooftop, Indiranagar, Bengaluru', status: 'done', clientAmount: 30000, clientPaid: true, clientPaidAt: '2026-08-16T13:00:00.000Z', clientInvoiceNumber: null, assignedCameramanIds: ['cam-1', 'cam-3'], assignments: [
      { cameramanId: 'cam-1', amount: 3500, paid: true, paidAt: '2026-08-15T11:00:00.000Z', payoutVoucherNumber: null, callTime: null, checkedInAt: '2026-08-14T07:20:00.000Z' },
      { cameramanId: 'cam-3', amount: 2500, paid: true, paidAt: '2026-08-15T11:00:00.000Z', payoutVoucherNumber: null, callTime: null, checkedInAt: '2026-08-14T07:25:00.000Z' },
    ], deliverables: [
      { type: 'reel', count: 4, fileLink: '' }, { type: 'story', count: 1, fileLink: '' },
    ], clientNotifiedAt: null, createdAt: '2026-08-05T15:00:00.000Z', deletedAt: null, deletedBy: null },
    { id: 'shoot-3', clientId: 'client-3', date: '2026-08-20', callTime: '10:00 AM', location: 'Varma Clinic, Jubilee Hills, Hyderabad', status: 'scheduled', clientAmount: 25000, clientPaid: false, clientPaidAt: null, clientInvoiceNumber: null, assignedCameramanIds: ['cam-2'], assignments: [
      { cameramanId: 'cam-2', amount: null, paid: false, paidAt: null, payoutVoucherNumber: null, callTime: null, checkedInAt: null },
    ], deliverables: [
      { type: 'reel', count: 5, fileLink: '' },
    ], clientNotifiedAt: null, createdAt: '2026-08-12T11:00:00.000Z', deletedAt: null, deletedBy: null },
  ] as Shoot[],
  expenses: [
    { id: 'exp-1', description: 'Studio Lighting Gel Filters', amount: 2400, date: '2026-08-08', shootId: 'shoot-1', category: 'equipment', createdAt: '2026-08-08T16:00:00.000Z', deletedAt: null, deletedBy: null },
    { id: 'exp-2', description: 'Uber Cab for Crew & Gear', amount: 1250, date: '2026-08-10', shootId: 'shoot-1', category: 'travel', createdAt: '2026-08-10T21:00:00.000Z', deletedAt: null, deletedBy: null },
    { id: 'exp-3', description: 'Epidemic Sound Annual License', amount: 8500, date: '2026-08-02', shootId: '', category: 'software', createdAt: '2026-08-02T10:00:00.000Z', deletedAt: null, deletedBy: null },
  ] as Expense[],
  communicationLogs: [
    { id: 'log-1', clientId: 'client-1', date: '2026-08-02', note: 'Briefing call regarding Monsoon Collection lookbook.', loggedBy: 'Kushagra (Founder)', createdAt: '2026-08-02T11:30:00.000Z' },
    { id: 'log-2', clientId: 'client-1', date: '2026-08-11', note: 'Sent preview drafts of 6 reels. Client requested font change.', loggedBy: 'Dheeraj (Admin)', createdAt: '2026-08-11T17:00:00.000Z' },
    { id: 'log-3', clientId: 'client-2', date: '2026-08-12', note: 'Confirmed menu dishes for Thursday shoot.', loggedBy: 'Kushagra (Founder)', createdAt: '2026-08-12T14:00:00.000Z' },
  ] as CommunicationLog[],
};

// ── LOCAL STORAGE HELPERS ──

function getLocal<T>(key: string, fallback: T[]): T[] {
  const item = localStorage.getItem(key);
  if (!item) { localStorage.setItem(key, JSON.stringify(fallback)); return fallback; }
  try { return JSON.parse(item); } catch { return fallback; }
}
function saveLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
  notifyLocalListeners();
}

// Firestore stores timestamps and document references; the UI deliberately
// works with ISO strings and document IDs. These helpers keep that boundary
// in one place instead of leaking Firestore-specific values into components.
function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : '';
}

function toDateInput(value: unknown): string {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : '';
}

function referenceId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') return value.id;
  return null;
}

function toTimestamp(value: unknown): Timestamp | unknown {
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === 'string') {
    const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    if (!Number.isNaN(date.getTime())) return Timestamp.fromDate(date);
  }
  return value;
}

function toReference(collectionName: string, value: unknown) {
  if (!db || value === null || value === undefined || value === '') return value;
  if (typeof value === 'object' && 'path' in value) return value;
  return doc(db, collectionName, String(value));
}

function normalizeEntity(collectionName: ManagedCollection, id: string, data: Record<string, unknown>): Client | Cameraman | Shoot | Expense {
  const common = {
    id,
    createdAt: toIso(data.createdAt),
    deletedAt: data.deletedAt ? toIso(data.deletedAt) : null,
    deletedBy: data.deletedBy ? referenceId(data.deletedBy) : null,
  };

  if (collectionName === 'clients') {
    return { ...common, name: String(data.name || ''), phone: String(data.phone || ''), email: String(data.email || ''), notes: String(data.notes || ''), status: String(data.status || ''), contractLink: String(data.contractLink || '') };
  }
  if (collectionName === 'cameramen') {
    const unavailability = Array.isArray(data.unavailability) ? data.unavailability.map(item => ({ date: String((item as Record<string, unknown>).date || ''), reason: String((item as Record<string, unknown>).reason || '') })) : [];
    return { ...common, name: String(data.name || ''), phone: String(data.phone || ''), rate: Number(data.rate || 0), notes: String(data.notes || ''), contractLink: String(data.contractLink || ''), unavailability };
  }
  if (collectionName === 'shoots') {
    const assignments = Array.isArray(data.assignments) ? data.assignments.map(item => {
      const assignment = item as Record<string, unknown>;
      return {
        cameramanId: referenceId(assignment.cameramanId) || '',
        amount: assignment.amount === null || assignment.amount === undefined ? null : Number(assignment.amount),
        paid: Boolean(assignment.paid),
        paidAt: assignment.paidAt ? toIso(assignment.paidAt) : null,
        callTime: assignment.callTime ? String(assignment.callTime) : null,
        checkedInAt: assignment.checkedInAt ? toIso(assignment.checkedInAt) : null,
        payoutVoucherNumber: assignment.payoutVoucherNumber ? String(assignment.payoutVoucherNumber) : null,
      };
    }) : [];
    const deliverables = Array.isArray(data.deliverables) ? data.deliverables.map(item => {
      const deliverable = item as Record<string, unknown>;
      return { type: String(deliverable.type || ''), count: Number(deliverable.count || 0), fileLink: String(deliverable.fileLink || '') };
    }) : [];
    const assignedCameramanIds = assignments.map(a => a.cameramanId).filter(Boolean);
    return {
      ...common,
      clientId: referenceId(data.clientId) || '',
      date: toDateInput(data.date),
      callTime: String(data.callTime || ''),
      location: String(data.location || ''),
      status: String(data.status || ''),
      clientAmount: Number(data.clientAmount || 0),
      clientPaid: Boolean(data.clientPaid),
      clientPaidAt: data.clientPaidAt ? toIso(data.clientPaidAt) : null,
      clientInvoiceNumber: data.clientInvoiceNumber ? String(data.clientInvoiceNumber) : null,
      assignedCameramanIds,
      assignments,
      deliverables,
      clientNotifiedAt: data.clientNotifiedAt ? toIso(data.clientNotifiedAt) : null,
    };
  }
  return {
    ...common,
    description: String(data.description || ''),
    amount: Number(data.amount || 0),
    date: toDateInput(data.date),
    shootId: referenceId(data.shootId) || '',
    category: String(data.category || ''),
  };
}

function toFirestoreEntityData(collectionName: ManagedCollection, rawData: Record<string, unknown>): Record<string, unknown> {
  const data = { ...rawData };

  if (collectionName === 'shoots') {
    data.clientId = toReference('clients', data.clientId);
    data.date = toTimestamp(data.date);
    data.clientPaidAt = data.clientPaidAt ? toTimestamp(data.clientPaidAt) : data.clientPaidAt;
    data.clientNotifiedAt = data.clientNotifiedAt ? toTimestamp(data.clientNotifiedAt) : data.clientNotifiedAt;
    if (Array.isArray(data.assignments)) {
      // Auto-compute assignedCameramanIds from assignments for Firestore array-contains queries
      data.assignedCameramanIds = data.assignments.map((item: Record<string, unknown>) => {
        const cId = item.cameramanId;
        if (typeof cId === 'string') return cId;
        if (cId && typeof cId === 'object' && 'id' in cId) return (cId as { id: string }).id;
        return null;
      }).filter(Boolean);
      data.assignments = data.assignments.map(item => {
        const assignment = item as Record<string, unknown>;
        return {
          ...assignment,
          cameramanId: toReference('cameramen', assignment.cameramanId),
          paidAt: assignment.paidAt ? toTimestamp(assignment.paidAt) : assignment.paidAt,
          checkedInAt: assignment.checkedInAt ? toTimestamp(assignment.checkedInAt) : assignment.checkedInAt,
        };
      });
    }
  }

  if (collectionName === 'expenses') {
    data.date = toTimestamp(data.date);
    data.shootId = toReference('shoots', data.shootId);
  }

  if ('deletedBy' in data) data.deletedBy = toReference('users', data.deletedBy);
  return data;
}

function normalizeChangeRequest(id: string, data: Record<string, unknown>): ChangeRequest {
  const targetCollection = data.targetCollection as ManagedCollection;
  const proposedData = (data.proposedData || {}) as Record<string, unknown>;
  return {
    id,
    targetCollection,
    targetDocId: referenceId(data.targetDocId),
    action: data.action === 'edit' ? 'edit' : 'create',
    proposedData: normalizeEntityDataForUi(targetCollection, proposedData),
    requestedBy: referenceId(data.requestedBy) || '',
    requestedAt: toIso(data.requestedAt),
    status: data.status as ChangeRequest['status'],
    reviewedBy: referenceId(data.reviewedBy),
    reviewedAt: data.reviewedAt ? toIso(data.reviewedAt) : null,
    reviewNote: String(data.reviewNote || ''),
    revisionCount: Number(data.revisionCount || 0),
  };
}

function normalizeEntityDataForUi(collectionName: ManagedCollection, data: Record<string, unknown>): Record<string, unknown> {
  if (collectionName === 'shoots') {
    const normalized = normalizeEntity('shoots', '', data) as Shoot;
    const { id: _id, createdAt: _createdAt, deletedAt: _deletedAt, deletedBy: _deletedBy, ...proposedData } = normalized;
    return proposedData;
  }
  if (collectionName === 'expenses') {
    const normalized = normalizeEntity('expenses', '', data) as Expense;
    const { id: _id, createdAt: _createdAt, deletedAt: _deletedAt, deletedBy: _deletedBy, ...proposedData } = normalized;
    return proposedData;
  }
  return { ...data };
}

function toFirestoreChangeRequestData(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };
  const targetCollection = result.targetCollection as ManagedCollection | undefined;
  if (targetCollection && result.targetDocId !== null && result.targetDocId !== undefined) {
    result.targetDocId = toReference(targetCollection, result.targetDocId);
  }
  if (targetCollection && result.proposedData && typeof result.proposedData === 'object') {
    result.proposedData = toFirestoreEntityData(targetCollection, result.proposedData as Record<string, unknown>);
  }
  if ('requestedBy' in result) result.requestedBy = toReference('users', result.requestedBy);
  if ('reviewedBy' in result) result.reviewedBy = toReference('users', result.reviewedBy);
  if ('requestedAt' in result && result.requestedAt !== null) result.requestedAt = serverTimestamp();
  if ('reviewedAt' in result && result.reviewedAt !== null) result.reviewedAt = serverTimestamp();
  return result;
}

function normalizeNotification(id: string, data: Record<string, unknown>): AppNotification {
  return {
    id,
    recipientId: referenceId(data.recipientId) || '',
    type: data.type as AppNotification['type'],
    relatedChangeRequestId: referenceId(data.relatedChangeRequestId) || '',
    message: String(data.message || ''),
    read: Boolean(data.read),
    createdAt: toIso(data.createdAt),
  };
}

// ── SETTINGS ──

export function subscribeToSettings(callback: (s: SettingsDoc[]) => void): Unsubscribe {
  if (isFirebaseConfigured && db) {
    return onSnapshot(collection(db, 'settings'), (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SettingsDoc)));
    });
  }
  const notify = () => callback(getLocal<SettingsDoc>(STORAGE_KEYS.SETTINGS, SEED_SETTINGS));
  notify(); localListeners.push(notify);
  return () => { const i = localListeners.indexOf(notify); if (i !== -1) localListeners.splice(i, 1); };
}

export async function updateSettingsDoc(settingsId: string, data: Partial<SettingsDoc>): Promise<void> {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, 'settings', settingsId), data as DocumentData);
  } else {
    const items = getLocal<SettingsDoc>(STORAGE_KEYS.SETTINGS, SEED_SETTINGS);
    const idx = items.findIndex(s => s.id === settingsId);
    if (idx !== -1) { items[idx] = { ...items[idx], ...data }; saveLocal(STORAGE_KEYS.SETTINGS, items); }
  }
}

// ── ACTIVE RECORD SUBSCRIPTIONS (exclude deletedAt != null) ──

export function subscribeToClients(callback: (c: Client[]) => void): Unsubscribe {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'clients'), where('deletedAt', '==', null), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => normalizeEntity('clients', d.id, d.data()) as Client)));
  }
  const notify = () => {
    const data = getLocal<Client>(STORAGE_KEYS.CLIENTS, INITIAL_SEED_DATA.clients);
    callback(data.filter(c => !c.deletedAt));
  };
  notify(); localListeners.push(notify);
  return () => { const i = localListeners.indexOf(notify); if (i !== -1) localListeners.splice(i, 1); };
}

export function subscribeToCameramen(callback: (c: Cameraman[]) => void): Unsubscribe {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'cameramen'), where('deletedAt', '==', null), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => normalizeEntity('cameramen', d.id, d.data()) as Cameraman)));
  }
  const notify = () => {
    const data = getLocal<Cameraman>(STORAGE_KEYS.CAMERAMEN, INITIAL_SEED_DATA.cameramen);
    callback(data.filter(c => !c.deletedAt));
  };
  notify(); localListeners.push(notify);
  return () => { const i = localListeners.indexOf(notify); if (i !== -1) localListeners.splice(i, 1); };
}

export function subscribeToShoots(callback: (s: Shoot[]) => void): Unsubscribe {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'shoots'), where('deletedAt', '==', null), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => normalizeEntity('shoots', d.id, d.data()) as Shoot)));
  }
  const notify = () => {
    const data = getLocal<Shoot>(STORAGE_KEYS.SHOOTS, INITIAL_SEED_DATA.shoots);
    callback(data.filter(s => !s.deletedAt).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  notify(); localListeners.push(notify);
  return () => { const i = localListeners.indexOf(notify); if (i !== -1) localListeners.splice(i, 1); };
}

export function subscribeToExpenses(callback: (e: Expense[]) => void): Unsubscribe {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'expenses'), where('deletedAt', '==', null), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => normalizeEntity('expenses', d.id, d.data()) as Expense)));
  }
  const notify = () => {
    const data = getLocal<Expense>(STORAGE_KEYS.EXPENSES, INITIAL_SEED_DATA.expenses);
    callback(data.filter(e => !e.deletedAt).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  notify(); localListeners.push(notify);
  return () => { const i = localListeners.indexOf(notify); if (i !== -1) localListeners.splice(i, 1); };
}

// ── DELETED RECORDS (Recycle Bin) ──

export function subscribeToDeletedRecords(callback: (items: Array<{collection: string; record: Client | Cameraman | Shoot | Expense}>) => void): Unsubscribe {
  if (isFirebaseConfigured && db) {
    const collections: ManagedCollection[] = ['clients', 'cameramen', 'shoots', 'expenses'];
    const snapshots = new Map<ManagedCollection, Array<Client | Cameraman | Shoot | Expense>>();
    const publish = () => {
      const records = collections.flatMap(collectionName =>
        (snapshots.get(collectionName) || []).map(record => ({ collection: collectionName, record }))
      );
      records.sort((a, b) => new Date(b.record.deletedAt || 0).getTime() - new Date(a.record.deletedAt || 0).getTime());
      callback(records);
    };
    const unsubs = collections.map(collectionName => onSnapshot(
      query(collection(db, collectionName), where('deletedAt', '>', Timestamp.fromMillis(0)), orderBy('deletedAt', 'desc')),
      snap => {
        snapshots.set(collectionName, snap.docs.map(d => normalizeEntity(collectionName, d.id, d.data())));
        publish();
      },
    ));
    return () => unsubs.forEach(unsub => unsub());
  }
  const notify = () => {
    const results: Array<{collection: string; record: Client | Cameraman | Shoot | Expense}> = [];
    getLocal<Client>(STORAGE_KEYS.CLIENTS, INITIAL_SEED_DATA.clients).filter(c => c.deletedAt).forEach(r => results.push({collection: 'clients', record: r}));
    getLocal<Cameraman>(STORAGE_KEYS.CAMERAMEN, INITIAL_SEED_DATA.cameramen).filter(c => c.deletedAt).forEach(r => results.push({collection: 'cameramen', record: r}));
    getLocal<Shoot>(STORAGE_KEYS.SHOOTS, INITIAL_SEED_DATA.shoots).filter(s => s.deletedAt).forEach(r => results.push({collection: 'shoots', record: r}));
    getLocal<Expense>(STORAGE_KEYS.EXPENSES, INITIAL_SEED_DATA.expenses).filter(e => e.deletedAt).forEach(r => results.push({collection: 'expenses', record: r}));
    results.sort((a, b) => new Date(b.record.deletedAt!).getTime() - new Date(a.record.deletedAt!).getTime());
    callback(results);
  };
  notify(); localListeners.push(notify);
  return () => { const i = localListeners.indexOf(notify); if (i !== -1) localListeners.splice(i, 1); };
}

// ── COMMUNICATION LOGS ──

export function subscribeToCommunicationLogs(clientId: string, callback: (logs: CommunicationLog[]) => void): Unsubscribe {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, `clients/${clientId}/communicationLog`), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        clientId: referenceId(data.clientId) || clientId,
        date: toIso(data.date),
        note: String(data.note || ''),
        loggedBy: referenceId(data.loggedBy) || '',
        createdAt: toIso(data.createdAt),
      } as CommunicationLog;
    })));
  }
  const notify = () => {
    const all = getLocal<CommunicationLog>(STORAGE_KEYS.COMMUNICATION_LOGS, INITIAL_SEED_DATA.communicationLogs);
    callback(all.filter(l => l.clientId === clientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  notify(); localListeners.push(notify);
  return () => { const i = localListeners.indexOf(notify); if (i !== -1) localListeners.splice(i, 1); };
}

export async function addCommunicationLog(clientId: string, logData: { date: string; note: string; loggedBy: string }): Promise<string> {
  if (isFirebaseConfigured && db) {
    const ref = await addDoc(collection(db, `clients/${clientId}/communicationLog`), {
      date: toTimestamp(logData.date),
      note: logData.note,
      clientId: toReference('clients', clientId),
      loggedBy: toReference('users', logData.loggedBy),
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }
  const now = new Date().toISOString();
  const items = getLocal<CommunicationLog>(STORAGE_KEYS.COMMUNICATION_LOGS, INITIAL_SEED_DATA.communicationLogs);
  const newId = `log-${Date.now()}`;
  items.unshift({ id: newId, clientId, ...logData, createdAt: now });
  saveLocal(STORAGE_KEYS.COMMUNICATION_LOGS, items);
  return newId;
}

// ── CRUD: DIRECT WRITES (used by founder role, or by approve action) ──

function getKeyAndSeed(col: ManagedCollection): { key: string; seed: unknown[] } {
  switch (col) {
    case 'clients': return { key: STORAGE_KEYS.CLIENTS, seed: INITIAL_SEED_DATA.clients };
    case 'cameramen': return { key: STORAGE_KEYS.CAMERAMEN, seed: INITIAL_SEED_DATA.cameramen };
    case 'shoots': return { key: STORAGE_KEYS.SHOOTS, seed: INITIAL_SEED_DATA.shoots };
    case 'expenses': return { key: STORAGE_KEYS.EXPENSES, seed: INITIAL_SEED_DATA.expenses };
    default: throw new Error(`Unknown collection: ${col}`);
  }
}

export async function directCreate(col: ManagedCollection, data: Record<string, unknown>): Promise<string> {
  const now = new Date().toISOString();
  if (isFirebaseConfigured && db) {
    const ref = await addDoc(collection(db, col), {
      ...toFirestoreEntityData(col, data),
      createdAt: serverTimestamp(),
      deletedAt: null,
      deletedBy: null,
    });
    return ref.id;
  }
  const { key, seed } = getKeyAndSeed(col);
  const items = getLocal<Record<string, unknown>>(key, seed as Record<string, unknown>[]);
  const newId = `${col.slice(0, 3)}-${Date.now()}`;
  items.unshift({ ...data, id: newId, createdAt: now, deletedAt: null, deletedBy: null });
  saveLocal(key, items);
  return newId;
}

export async function directUpdate(col: ManagedCollection, docId: string, data: Record<string, unknown>): Promise<void> {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, col, docId), toFirestoreEntityData(col, data) as DocumentData);
    return;
  }
  const { key, seed } = getKeyAndSeed(col);
  const items = getLocal<Record<string, unknown>>(key, seed as Record<string, unknown>[]);
  const idx = items.findIndex(i => (i as { id: string }).id === docId);
  if (idx !== -1) { items[idx] = { ...items[idx], ...data }; saveLocal(key, items); }
}

// ── SOFT DELETE / RESTORE / HARD DELETE ──

export async function softDelete(col: ManagedCollection, docId: string, deletedBy: string): Promise<void> {
  await directUpdate(col, docId, { deletedAt: new Date().toISOString(), deletedBy });
}

export async function restoreRecord(col: ManagedCollection, docId: string): Promise<void> {
  await directUpdate(col, docId, { deletedAt: null, deletedBy: null });
}

export async function hardDelete(col: ManagedCollection, docId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    await deleteDoc(doc(db, col, docId));
    return;
  }
  const { key, seed } = getKeyAndSeed(col);
  const items = getLocal<Record<string, unknown>>(key, seed as Record<string, unknown>[]);
  saveLocal(key, items.filter(i => (i as { id: string }).id !== docId));
}

// ── CHANGE REQUESTS ──

export function subscribeToChangeRequests(callback: (cr: ChangeRequest[]) => void): Unsubscribe {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'changeRequests'), orderBy('requestedAt', 'desc'));
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => normalizeChangeRequest(d.id, d.data()))));
  }
  const notify = () => {
    const data = getLocal<ChangeRequest>(STORAGE_KEYS.CHANGE_REQUESTS, []);
    callback(data.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()));
  };
  notify(); localListeners.push(notify);
  return () => { const i = localListeners.indexOf(notify); if (i !== -1) localListeners.splice(i, 1); };
}

export async function createChangeRequest(cr: Omit<ChangeRequest, 'id'>): Promise<string> {
  if (isFirebaseConfigured && db) {
    const ref = await addDoc(collection(db, 'changeRequests'), toFirestoreChangeRequestData(cr) as DocumentData);
    return ref.id;
  }
  const items = getLocal<ChangeRequest>(STORAGE_KEYS.CHANGE_REQUESTS, []);
  const newId = `cr-${Date.now()}`;
  items.unshift({ ...cr, id: newId } as ChangeRequest);
  saveLocal(STORAGE_KEYS.CHANGE_REQUESTS, items);
  return newId;
}

export async function updateChangeRequest(crId: string, data: Partial<ChangeRequest>): Promise<void> {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, 'changeRequests', crId), toFirestoreChangeRequestData(data as Record<string, unknown>) as DocumentData);
    return;
  }
  const items = getLocal<ChangeRequest>(STORAGE_KEYS.CHANGE_REQUESTS, []);
  const idx = items.findIndex(c => c.id === crId);
  if (idx !== -1) { items[idx] = { ...items[idx], ...data }; saveLocal(STORAGE_KEYS.CHANGE_REQUESTS, items); }
}

// ── NOTIFICATIONS ──

export function subscribeToNotifications(recipientId: string, callback: (n: AppNotification[]) => void): Unsubscribe {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, 'notifications'), where('recipientId', '==', doc(db, 'users', recipientId)), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => callback(snap.docs.map(d => normalizeNotification(d.id, d.data()))));
  }
  const notify = () => {
    const all = getLocal<AppNotification>(STORAGE_KEYS.NOTIFICATIONS, []);
    callback(all.filter(n => n.recipientId === recipientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };
  notify(); localListeners.push(notify);
  return () => { const i = localListeners.indexOf(notify); if (i !== -1) localListeners.splice(i, 1); };
}

export async function createNotification(n: Omit<AppNotification, 'id'>): Promise<string> {
  if (isFirebaseConfigured && db) {
    const ref = await addDoc(collection(db, 'notifications'), {
      ...n,
      recipientId: toReference('users', n.recipientId),
      relatedChangeRequestId: toReference('changeRequests', n.relatedChangeRequestId),
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }
  const items = getLocal<AppNotification>(STORAGE_KEYS.NOTIFICATIONS, []);
  const newId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  items.unshift({ ...n, id: newId } as AppNotification);
  saveLocal(STORAGE_KEYS.NOTIFICATIONS, items);
  return newId;
}

export async function submitChangeRequestWithNotification(
  changeRequest: Omit<ChangeRequest, 'id'>,
  recipientId: string,
  message: string,
): Promise<string> {
  if (isFirebaseConfigured && db) {
    const changeRequestRef = doc(collection(db, 'changeRequests'));
    const notificationRef = doc(collection(db, 'notifications'));
    const batch = writeBatch(db);
    batch.set(changeRequestRef, toFirestoreChangeRequestData(changeRequest) as DocumentData);
    batch.set(notificationRef, {
      recipientId: toReference('users', recipientId),
      type: 'pending_approval',
      relatedChangeRequestId: changeRequestRef,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return changeRequestRef.id;
  }

  const changeRequestId = await createChangeRequest(changeRequest);
  await createNotification({
    recipientId,
    type: 'pending_approval',
    relatedChangeRequestId: changeRequestId,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
  return changeRequestId;
}

export async function resubmitChangeRequestWithNotification(
  changeRequestId: string,
  data: Partial<ChangeRequest>,
  recipientId: string,
  message: string,
): Promise<void> {
  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);
    const changeRequestRef = doc(db, 'changeRequests', changeRequestId);
    batch.update(changeRequestRef, toFirestoreChangeRequestData(data as Record<string, unknown>) as DocumentData);
    batch.set(doc(collection(db, 'notifications')), {
      recipientId: toReference('users', recipientId),
      type: 'resubmitted',
      relatedChangeRequestId: changeRequestRef,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return;
  }

  await updateChangeRequest(changeRequestId, data);
  await createNotification({
    recipientId,
    type: 'resubmitted',
    relatedChangeRequestId: changeRequestId,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function reviewChangeRequestWithNotification(
  changeRequest: ChangeRequest,
  reviewerId: string,
  status: 'approved' | 'rejected',
  reviewNote: string,
): Promise<void> {
  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);
    if (status === 'approved') {
      if (changeRequest.action === 'create') {
        const targetRef = doc(collection(db, changeRequest.targetCollection));
        batch.set(targetRef, {
          ...toFirestoreEntityData(changeRequest.targetCollection, changeRequest.proposedData),
          createdAt: serverTimestamp(),
          deletedAt: null,
          deletedBy: null,
        });
      } else if (changeRequest.targetDocId) {
        batch.update(
          doc(db, changeRequest.targetCollection, changeRequest.targetDocId),
          toFirestoreEntityData(changeRequest.targetCollection, changeRequest.proposedData) as DocumentData,
        );
      }
    }
    const changeRequestRef = doc(db, 'changeRequests', changeRequest.id);
    batch.update(changeRequestRef, {
      status,
      reviewedBy: toReference('users', reviewerId),
      reviewedAt: serverTimestamp(),
      reviewNote,
    });
    batch.set(doc(collection(db, 'notifications')), {
      recipientId: toReference('users', changeRequest.requestedBy),
      type: status,
      relatedChangeRequestId: changeRequestRef,
      message: `Your ${changeRequest.targetCollection.slice(0, -1)} ${changeRequest.action} was ${status}`,
      read: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return;
  }

  if (status === 'approved') {
    if (changeRequest.action === 'create') await directCreate(changeRequest.targetCollection, changeRequest.proposedData);
    else if (changeRequest.targetDocId) await directUpdate(changeRequest.targetCollection, changeRequest.targetDocId, changeRequest.proposedData);
  }
  await updateChangeRequest(changeRequest.id, {
    status,
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
    reviewNote,
  });
  await createNotification({
    recipientId: changeRequest.requestedBy,
    type: status,
    relatedChangeRequestId: changeRequest.id,
    message: `Your ${changeRequest.targetCollection.slice(0, -1)} ${changeRequest.action} was ${status}`,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function markNotificationRead(notifId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
    return;
  }
  const items = getLocal<AppNotification>(STORAGE_KEYS.NOTIFICATIONS, []);
  const idx = items.findIndex(n => n.id === notifId);
  if (idx !== -1) { items[idx].read = true; saveLocal(STORAGE_KEYS.NOTIFICATIONS, items); }
}

export async function markAllNotificationsRead(recipientId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    const unreadNotifications = await getDocs(query(
      collection(db, 'notifications'),
      where('recipientId', '==', doc(db, 'users', recipientId)),
      where('read', '==', false),
    ));
    const batch = writeBatch(db);
    unreadNotifications.docs.forEach(notification => batch.update(notification.ref, { read: true }));
    if (!unreadNotifications.empty) await batch.commit();
    return;
  }
  const items = getLocal<AppNotification>(STORAGE_KEYS.NOTIFICATIONS, []);
  let changed = false;
  items.forEach(n => { if (n.recipientId === recipientId && !n.read) { n.read = true; changed = true; } });
  if (changed) saveLocal(STORAGE_KEYS.NOTIFICATIONS, items);
}

export async function findUserIdByRole(role: string): Promise<string> {
  if (!isFirebaseConfigured || !db) return role === 'founder' ? 'local_founder1' : 'local_admin';
  const users = await getDocs(query(collection(db, 'users'), where('role', '==', role), limit(1)));
  if (users.empty) throw new Error(`No ${role} user is configured in Firestore.`);
  return users.docs[0].id;
}

// ── INVOICE COUNTER (local demo fallback) ──

export function getNextInvoiceNumber(type: 'client' | 'payout'): string {
  const year = new Date().getFullYear();
  const counterKey = `${STORAGE_KEYS.COUNTERS}_${year}`;
  const raw = localStorage.getItem(counterKey);
  let counter = { clientInvoiceNext: 1, payoutVoucherNext: 1 };
  if (raw) { try { counter = JSON.parse(raw); } catch {} }

  let number: string;
  if (type === 'client') {
    number = `INV-${year}-${String(counter.clientInvoiceNext).padStart(4, '0')}`;
    counter.clientInvoiceNext++;
  } else {
    number = `RCP-${year}-${String(counter.payoutVoucherNext).padStart(4, '0')}`;
    counter.payoutVoucherNext++;
  }
  localStorage.setItem(counterKey, JSON.stringify(counter));
  return number;
}

export async function requestInvoiceNumber(
  type: 'client' | 'payout',
  shootId: string,
  assignmentIndex?: number,
): Promise<string> {
  if (!isFirebaseConfigured || !functions) return getNextInvoiceNumber(type);
  const assignInvoiceNumber = httpsCallable<
    { type: 'client' | 'payout'; shootId: string; assignmentIndex?: number },
    { number: string }
  >(functions, 'assignInvoiceNumber');
  const result = await assignInvoiceNumber({ type, shootId, assignmentIndex });
  return result.data.number;
}

// ── RESET SEED DATA ──

export function resetToSeedData() {
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_SEED_DATA.clients));
  localStorage.setItem(STORAGE_KEYS.CAMERAMEN, JSON.stringify(INITIAL_SEED_DATA.cameramen));
  localStorage.setItem(STORAGE_KEYS.SHOOTS, JSON.stringify(INITIAL_SEED_DATA.shoots));
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_SEED_DATA.expenses));
  localStorage.setItem(STORAGE_KEYS.COMMUNICATION_LOGS, JSON.stringify(INITIAL_SEED_DATA.communicationLogs));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(SEED_SETTINGS));
  localStorage.setItem(STORAGE_KEYS.CHANGE_REQUESTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
  notifyLocalListeners();
}
