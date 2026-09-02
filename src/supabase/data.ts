import {
  AppNotification,
  Cameraman,
  ChangeRequest,
  Client,
  CommunicationLog,
  Expense,
  ManagedCollection,
  SettingsDoc,
  Shoot,
} from '../types';
import { isSupabaseConfigured, supabase } from './config';

export type Unsubscribe = () => void;

type DataRow = Record<string, unknown>;
type DeletedRecord = { collection: ManagedCollection; record: Client | Cameraman | Shoot | Expense };

const managedCollections: ManagedCollection[] = ['clients', 'cameramen', 'shoots', 'expenses'];

function clientOrThrow() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before using operational data.');
  }
  return supabase;
}

function throwOnError(error: { message: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message}`);
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function asClient(row: DataRow): Client {
  return {
    id: stringValue(row.id), name: stringValue(row.name), phone: stringValue(row.phone),
    email: stringValue(row.email), notes: stringValue(row.notes), status: stringValue(row.status, 'active'),
    contractLink: stringValue(row.contract_link), createdAt: stringValue(row.created_at),
    deletedAt: row.deleted_at ? stringValue(row.deleted_at) : null,
    deletedBy: row.deleted_by ? stringValue(row.deleted_by) : null,
  };
}

function asCameraman(row: DataRow): Cameraman {
  return {
    id: stringValue(row.id), name: stringValue(row.name), phone: stringValue(row.phone),
    rate: numberValue(row.rate), notes: stringValue(row.notes), contractLink: stringValue(row.contract_link),
    unavailability: arrayValue<{ date: string; reason: string }>(row.unavailability),
    createdAt: stringValue(row.created_at), deletedAt: row.deleted_at ? stringValue(row.deleted_at) : null,
    deletedBy: row.deleted_by ? stringValue(row.deleted_by) : null,
  };
}

function asShoot(row: DataRow): Shoot {
  const assignments = arrayValue<Shoot['assignments'][number]>(row.assignments);
  return {
    id: stringValue(row.id), clientId: stringValue(row.client_id), date: stringValue(row.date),
    callTime: stringValue(row.call_time), location: stringValue(row.location), status: stringValue(row.status),
    clientAmount: numberValue(row.client_amount), clientPaid: Boolean(row.client_paid),
    clientPaidAt: row.client_paid_at ? stringValue(row.client_paid_at) : null,
    clientInvoiceNumber: row.client_invoice_number ? stringValue(row.client_invoice_number) : null,
    assignedCameramanIds: arrayValue<string>(row.assigned_cameraman_ids).length
      ? arrayValue<string>(row.assigned_cameraman_ids)
      : assignments.map(assignment => assignment.cameramanId),
    assignments,
    deliverables: arrayValue<Shoot['deliverables'][number]>(row.deliverables),
    clientNotifiedAt: row.client_notified_at ? stringValue(row.client_notified_at) : null,
    createdAt: stringValue(row.created_at), deletedAt: row.deleted_at ? stringValue(row.deleted_at) : null,
    deletedBy: row.deleted_by ? stringValue(row.deleted_by) : null,
  };
}

function asExpense(row: DataRow): Expense {
  return {
    id: stringValue(row.id), description: stringValue(row.description), amount: numberValue(row.amount),
    date: stringValue(row.date), shootId: row.shoot_id ? stringValue(row.shoot_id) : undefined,
    category: stringValue(row.category), createdAt: stringValue(row.created_at),
    deletedAt: row.deleted_at ? stringValue(row.deleted_at) : null,
    deletedBy: row.deleted_by ? stringValue(row.deleted_by) : null,
  };
}

function asSettings(row: DataRow): SettingsDoc {
  return {
    id: stringValue(row.id), key: stringValue(row.key), label: stringValue(row.label),
    editable: Boolean(row.editable), options: arrayValue<SettingsDoc['options'][number]>(row.options),
  };
}

function asChangeRequest(row: DataRow): ChangeRequest {
  return {
    id: stringValue(row.id), targetCollection: stringValue(row.target_collection) as ManagedCollection,
    targetDocId: row.target_doc_id ? stringValue(row.target_doc_id) : null,
    action: stringValue(row.action) as ChangeRequest['action'],
    proposedData: (row.proposed_data || {}) as Record<string, unknown>,
    requestedBy: stringValue(row.requested_by), requestedAt: stringValue(row.requested_at),
    status: stringValue(row.status) as ChangeRequest['status'],
    reviewedBy: row.reviewed_by ? stringValue(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? stringValue(row.reviewed_at) : null,
    reviewNote: stringValue(row.review_note), revisionCount: numberValue(row.revision_count),
  };
}

function asNotification(row: DataRow): AppNotification {
  return {
    id: stringValue(row.id), recipientId: stringValue(row.recipient_id),
    type: stringValue(row.type) as AppNotification['type'],
    relatedChangeRequestId: stringValue(row.related_change_request_id), message: stringValue(row.message),
    read: Boolean(row.read), createdAt: stringValue(row.created_at),
  };
}

function asCommunicationLog(row: DataRow): CommunicationLog {
  return {
    id: stringValue(row.id), clientId: stringValue(row.client_id), date: stringValue(row.date),
    note: stringValue(row.note), loggedBy: stringValue(row.logged_by_name, stringValue(row.logged_by)),
    createdAt: stringValue(row.created_at),
  };
}

function entityToRow(col: ManagedCollection, data: Record<string, unknown>): DataRow {
  const keyMap: Record<string, string> = {
    clientId: 'client_id', callTime: 'call_time', clientAmount: 'client_amount',
    clientPaid: 'client_paid', clientPaidAt: 'client_paid_at', clientInvoiceNumber: 'client_invoice_number',
    assignedCameramanIds: 'assigned_cameraman_ids', clientNotifiedAt: 'client_notified_at',
    contractLink: 'contract_link', createdAt: 'created_at', deletedAt: 'deleted_at', deletedBy: 'deleted_by',
    shootId: 'shoot_id',
  };
  const ignoredKeys = new Set(['id', 'createdAt']);
  const row: DataRow = {};

  Object.entries(data).forEach(([key, value]) => {
    if (!ignoredKeys.has(key)) row[keyMap[key] || key] = value;
  });

  if (col === 'shoots' && Array.isArray(data.assignments) && !row.assigned_cameraman_ids) {
    row.assigned_cameraman_ids = data.assignments
      .map(assignment => (assignment as { cameramanId?: string }).cameramanId)
      .filter((id): id is string => Boolean(id));
  }
  return row;
}

function changeRequestToRow(data: Partial<ChangeRequest>): DataRow {
  const keyMap: Record<string, string> = {
    targetCollection: 'target_collection', targetDocId: 'target_doc_id', proposedData: 'proposed_data',
    requestedBy: 'requested_by', requestedAt: 'requested_at', reviewedBy: 'reviewed_by',
    reviewedAt: 'reviewed_at', reviewNote: 'review_note', revisionCount: 'revision_count',
  };
  const row: DataRow = {};
  Object.entries(data).forEach(([key, value]) => { if (key !== 'id') row[keyMap[key] || key] = value; });
  return row;
}

function subscribeToRows<T>(
  channelName: string,
  tables: string[],
  load: () => Promise<T[]>,
  callback: (items: T[]) => void,
): Unsubscribe {
  const client = clientOrThrow();
  let active = true;
  let latestLoad = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const refresh = async () => {
    const requestId = ++latestLoad;
    try {
      const items = await load();
      if (active && requestId === latestLoad) callback(items);
    } catch (error) {
      console.error(`Unable to refresh ${channelName}:`, error);
    }
  };

  const debouncedRefresh = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (active) void refresh();
    }, 200);
  };

  void refresh();
  let channel = client.channel(channelName);
  tables.forEach(table => {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => { debouncedRefresh(); });
  });
  channel.subscribe();

  return () => {
    active = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    void client.removeChannel(channel);
  };
}

export function subscribeToClients(callback: (items: Client[]) => void): Unsubscribe {
  return subscribeToRows('clients-live', ['clients'], async () => {
    const { data, error } = await clientOrThrow().from('clients').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    throwOnError(error, 'Unable to load clients');
    return (data || []).map(row => asClient(row as DataRow));
  }, callback);
}

export function subscribeToCameramen(callback: (items: Cameraman[]) => void): Unsubscribe {
  return subscribeToRows('cameramen-live', ['cameramen'], async () => {
    const { data, error } = await clientOrThrow().from('cameramen').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    throwOnError(error, 'Unable to load cameramen');
    return (data || []).map(row => asCameraman(row as DataRow));
  }, callback);
}

export function subscribeToShoots(callback: (items: Shoot[]) => void): Unsubscribe {
  return subscribeToRows('shoots-live', ['shoots'], async () => {
    const { data, error } = await clientOrThrow().from('shoots').select('*').is('deleted_at', null).order('date', { ascending: false });
    throwOnError(error, 'Unable to load shoots');
    return (data || []).map(row => asShoot(row as DataRow));
  }, callback);
}

export function subscribeToExpenses(callback: (items: Expense[]) => void): Unsubscribe {
  return subscribeToRows('expenses-live', ['expenses'], async () => {
    const { data, error } = await clientOrThrow().from('expenses').select('*').is('deleted_at', null).order('date', { ascending: false });
    throwOnError(error, 'Unable to load expenses');
    return (data || []).map(row => asExpense(row as DataRow));
  }, callback);
}

export function subscribeToSettings(callback: (items: SettingsDoc[]) => void): Unsubscribe {
  return subscribeToRows('settings-live', ['settings'], async () => {
    const { data, error } = await clientOrThrow().from('settings').select('*').order('key');
    throwOnError(error, 'Unable to load settings');
    return (data || []).map(row => asSettings(row as DataRow));
  }, callback);
}

export function subscribeToDeletedRecords(callback: (items: DeletedRecord[]) => void): Unsubscribe {
  return subscribeToRows('recycle-bin-live', managedCollections, async () => {
    const client = clientOrThrow();
    const [clients, cameramen, shoots, expenses] = await Promise.all([
      client.from('clients').select('*').not('deleted_at', 'is', null).gt('deleted_at', '2000-01-01T00:00:00.000Z'),
      client.from('cameramen').select('*').not('deleted_at', 'is', null).gt('deleted_at', '2000-01-01T00:00:00.000Z'),
      client.from('shoots').select('*').not('deleted_at', 'is', null).gt('deleted_at', '2000-01-01T00:00:00.000Z'),
      client.from('expenses').select('*').not('deleted_at', 'is', null).gt('deleted_at', '2000-01-01T00:00:00.000Z'),
    ]);
    [clients, cameramen, shoots, expenses].forEach(result => throwOnError(result.error, 'Unable to load recycle bin'));
    return [
      ...(clients.data || []).map(row => ({ collection: 'clients' as const, record: asClient(row as DataRow) })),
      ...(cameramen.data || []).map(row => ({ collection: 'cameramen' as const, record: asCameraman(row as DataRow) })),
      ...(shoots.data || []).map(row => ({ collection: 'shoots' as const, record: asShoot(row as DataRow) })),
      ...(expenses.data || []).map(row => ({ collection: 'expenses' as const, record: asExpense(row as DataRow) })),
    ].sort((a, b) => new Date(b.record.deletedAt || 0).getTime() - new Date(a.record.deletedAt || 0).getTime());
  }, callback);
}

export function subscribeToCommunicationLogs(clientId: string, callback: (items: CommunicationLog[]) => void): Unsubscribe {
  return subscribeToRows(`communication-${clientId}`, ['communication_logs'], async () => {
    const { data, error } = await clientOrThrow().from('communication_logs').select('*').eq('client_id', clientId).order('date', { ascending: false });
    throwOnError(error, 'Unable to load communication history');
    return (data || []).map(row => asCommunicationLog(row as DataRow));
  }, callback);
}

export function subscribeToChangeRequests(callback: (items: ChangeRequest[]) => void): Unsubscribe {
  return subscribeToRows('change-requests-live', ['change_requests'], async () => {
    const { data, error } = await clientOrThrow().from('change_requests').select('*').order('requested_at', { ascending: false });
    throwOnError(error, 'Unable to load approval requests');
    return (data || []).map(row => asChangeRequest(row as DataRow));
  }, callback);
}

export function subscribeToNotifications(recipientId: string, callback: (items: AppNotification[]) => void): Unsubscribe {
  return subscribeToRows(`notifications-${recipientId}`, ['notifications'], async () => {
    const { data, error } = await clientOrThrow().from('notifications').select('*').eq('recipient_id', recipientId).order('created_at', { ascending: false });
    throwOnError(error, 'Unable to load notifications');
    return (data || []).map(row => asNotification(row as DataRow));
  }, callback);
}

export async function updateSettingsDoc(settingsId: string, data: Partial<SettingsDoc>): Promise<void> {
  const row: Record<string, unknown> = {
    id: settingsId,
    key: settingsId,
    label: data.label || (settingsId === 'businessProfile' ? 'Business Profile' : settingsId),
    editable: true,
    ...entityToRow('clients', data as Record<string, unknown>),
  };
  const { error } = await clientOrThrow().from('settings').upsert(row, { onConflict: 'id' });
  throwOnError(error, 'Unable to update settings');
}

export async function addCommunicationLog(clientId: string, logData: { date: string; note: string; loggedBy: string }): Promise<string> {
  const { data, error } = await clientOrThrow().from('communication_logs').insert({
    client_id: clientId, date: logData.date, note: logData.note, logged_by_name: logData.loggedBy,
  }).select('id').single();
  throwOnError(error, 'Unable to add communication entry');
  return stringValue(data?.id);
}

export async function directCreate(col: ManagedCollection, data: Record<string, unknown>): Promise<string> {
  const row = { ...entityToRow(col, data), deleted_at: null, deleted_by: null };
  const { data: created, error } = await clientOrThrow().from(col).insert(row).select('id').single();
  throwOnError(error, `Unable to create ${col.slice(0, -1)}`);
  return stringValue(created?.id);
}

export async function directUpdate(col: ManagedCollection, docId: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await clientOrThrow().from(col).update(entityToRow(col, data)).eq('id', docId);
  throwOnError(error, `Unable to update ${col.slice(0, -1)}`);
}

export async function updateShootOperationalData(shootId: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await clientOrThrow().rpc('update_shoot_operational', {
    p_shoot_id: shootId,
    p_changes: entityToRow('shoots', data),
  });
  throwOnError(error, 'Unable to update shoot operations');
}

export async function softDelete(col: ManagedCollection, docId: string): Promise<void> {
  const client = clientOrThrow();
  const { error: rpcErr } = await client.rpc('set_record_deleted', {
    p_collection: col,
    p_record_id: docId,
    p_deleted: true,
  });
  if (!rpcErr) return;

  const { error } = await client.from(col).update({ deleted_at: new Date().toISOString() }).eq('id', docId);
  throwOnError(error, `Unable to delete ${col.slice(0, -1)}`);
}

export async function restoreRecord(col: ManagedCollection, docId: string): Promise<void> {
  const client = clientOrThrow();
  const { error: rpcErr } = await client.rpc('set_record_deleted', {
    p_collection: col,
    p_record_id: docId,
    p_deleted: false,
  });
  if (!rpcErr) return;

  const { error } = await client.from(col).update({ deleted_at: null, deleted_by: null }).eq('id', docId);
  throwOnError(error, `Unable to restore ${col.slice(0, -1)}`);
}

export async function hardDelete(col: ManagedCollection, docId: string): Promise<void> {
  const client = clientOrThrow();

  if (col === 'clients') {
    const { data: clientShoots } = await client.from('shoots').select('id').eq('client_id', docId);
    if (clientShoots && clientShoots.length > 0) {
      const shootIds = clientShoots.map(s => s.id);
      const { data: clientExpenses } = await client.from('expenses').select('id').in('shoot_id', shootIds);
      if (clientExpenses && clientExpenses.length > 0) {
        for (const exp of clientExpenses) {
          await client.rpc('hard_delete_record', { p_collection: 'expenses', p_record_id: exp.id });
        }
      }
      for (const shootId of shootIds) {
        await client.rpc('hard_delete_record', { p_collection: 'shoots', p_record_id: shootId });
      }
    }
    await client.from('communication_logs').delete().eq('client_id', docId);
  } else if (col === 'shoots') {
    const { data: shootExpenses } = await client.from('expenses').select('id').eq('shoot_id', docId);
    if (shootExpenses && shootExpenses.length > 0) {
      for (const exp of shootExpenses) {
        await client.rpc('hard_delete_record', { p_collection: 'expenses', p_record_id: exp.id });
      }
    }
  }

  await client.from('change_requests').delete().eq('target_doc_id', docId);
  await client.from('change_requests').delete().eq('target_collection', col).eq('target_doc_id', docId);

  const { error: rpcErr } = await client.rpc('hard_delete_record', { p_collection: col, p_record_id: docId });
  if (rpcErr) {
    console.error(`RPC hard_delete_record failed for ${col} ${docId}:`, rpcErr);
    throw new Error(rpcErr.message || `Unable to permanently delete ${col.slice(0, -1)}`);
  }
}

export async function createChangeRequest(changeRequest: Omit<ChangeRequest, 'id'>): Promise<string> {
  const { data, error } = await clientOrThrow().from('change_requests').insert(changeRequestToRow(changeRequest)).select('id').single();
  throwOnError(error, 'Unable to submit approval request');
  return stringValue(data?.id);
}

export async function updateChangeRequest(changeRequestId: string, data: Partial<ChangeRequest>): Promise<void> {
  const { error } = await clientOrThrow().from('change_requests').update(changeRequestToRow(data)).eq('id', changeRequestId);
  throwOnError(error, 'Unable to update approval request');
}

export async function createNotification(notification: Omit<AppNotification, 'id'>): Promise<string> {
  const { data, error } = await clientOrThrow().from('notifications').insert({
    recipient_id: notification.recipientId, type: notification.type,
    related_change_request_id: notification.relatedChangeRequestId, message: notification.message,
    read: notification.read,
  }).select('id').single();
  throwOnError(error, 'Unable to create notification');
  return stringValue(data?.id);
}

export async function submitChangeRequestWithNotification(changeRequest: Omit<ChangeRequest, 'id'>, recipientId: string, message: string): Promise<string> {
  const changeRequestId = await createChangeRequest(changeRequest);
  try {
    await createNotification({ recipientId, type: 'pending_approval', relatedChangeRequestId: changeRequestId, message, read: false, createdAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Notification send deferred:', err);
  }
  return changeRequestId;
}

export async function resubmitChangeRequestWithNotification(changeRequestId: string, data: Partial<ChangeRequest>, recipientId: string, message: string): Promise<void> {
  await updateChangeRequest(changeRequestId, data);
  try {
    await createNotification({ recipientId, type: 'resubmitted', relatedChangeRequestId: changeRequestId, message, read: false, createdAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Notification send deferred:', err);
  }
}

export async function reviewChangeRequestWithNotification(changeRequest: ChangeRequest, reviewerId: string, status: 'approved' | 'rejected', reviewNote: string): Promise<void> {
  if (status === 'approved') {
    if (changeRequest.action === 'create') await directCreate(changeRequest.targetCollection, changeRequest.proposedData);
    else if (changeRequest.action === 'edit' && changeRequest.targetDocId) await directUpdate(changeRequest.targetCollection, changeRequest.targetDocId, changeRequest.proposedData);
    else if (changeRequest.action === 'delete' && changeRequest.targetDocId) await softDelete(changeRequest.targetCollection, changeRequest.targetDocId);
  }
  await updateChangeRequest(changeRequest.id, { status, reviewedBy: reviewerId, reviewedAt: new Date().toISOString(), reviewNote });
  try {
    await createNotification({
      recipientId: changeRequest.requestedBy, type: status, relatedChangeRequestId: changeRequest.id,
      message: `Your ${changeRequest.targetCollection.slice(0, -1)} ${changeRequest.action} was ${status}`,
      read: false, createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Notification send deferred:', err);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await clientOrThrow().from('notifications').update({ read: true }).eq('id', notificationId);
  throwOnError(error, 'Unable to mark notification as read');
}

export async function markAllNotificationsRead(recipientId: string): Promise<void> {
  const { error } = await clientOrThrow().from('notifications').update({ read: true }).eq('recipient_id', recipientId).eq('read', false);
  throwOnError(error, 'Unable to mark notifications as read');
}

export async function findUserIdByRole(role: string): Promise<string> {
  const { data, error } = await clientOrThrow().from('profiles').select('id').eq('role', role).limit(1).maybeSingle();
  throwOnError(error, `Unable to find ${role} account`);
  if (!data?.id) throw new Error(`No ${role} account is configured in Supabase profiles.`);
  return stringValue(data.id);
}

export async function requestInvoiceNumber(type: 'client' | 'payout', shootId: string, assignmentIndex?: number): Promise<string> {
  const { data, error } = await clientOrThrow().rpc('assign_invoice_number', {
    p_type: type, p_shoot_id: shootId, p_assignment_index: assignmentIndex ?? null,
  });
  throwOnError(error, 'Unable to assign document number');
  if (!data) throw new Error('Unable to assign document number.');
  return stringValue(data);
}

export function resetToSeedData(): void {
  throw new Error('Demo data is no longer stored locally. Configure Supabase and use real records instead.');
}
