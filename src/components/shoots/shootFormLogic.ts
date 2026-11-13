import { canCreateDirect } from '../../utils/permissions';
import { safeHttpUrl } from '../../utils/safeHttpUrl';
import { buildShootScheduleWhatsAppDrafts } from '../../utils/whatsapp';
import { Cameraman, CameramanAssignment, ChangeRequest, Client, Deliverable, Shoot } from '../../types';

export interface ShootFormValues {
  clientId: string;
  date: string;
  callTime: string;
  location: string;
  status: string;
  clientAmount: number;
  assignments: CameramanAssignment[];
  deliverables: Deliverable[];
}

interface InitialValuesOptions {
  resubmission?: ChangeRequest | null;
  initialShoot?: Shoot | null;
  shoots: Shoot[];
  clients: Client[];
  defaultStatus: string;
}

export function getInitialShootFormValues({
  resubmission,
  initialShoot,
  shoots,
  clients,
  defaultStatus,
}: InitialValuesOptions): ShootFormValues {
  if (resubmission) {
    const proposed = resubmission.proposedData || {};
    const existingShoot = resubmission.targetDocId
      ? shoots.find(shoot => shoot.id === resubmission.targetDocId)
      : null;
    const assignments = (proposed.assignments || existingShoot?.assignments || []) as CameramanAssignment[];
    const deliverables = (proposed.deliverables || existingShoot?.deliverables || []) as Deliverable[];

    return {
      clientId: String(proposed.clientId || proposed.client_id || existingShoot?.clientId || clients[0]?.id || ''),
      date: String(proposed.date || existingShoot?.date || new Date().toISOString().split('T')[0]),
      callTime: String(proposed.callTime || proposed.call_time || existingShoot?.callTime || ''),
      location: String(proposed.location || existingShoot?.location || ''),
      status: String(proposed.status || existingShoot?.status || defaultStatus),
      clientAmount: Number(proposed.clientAmount ?? proposed.client_amount ?? existingShoot?.clientAmount ?? 0),
      assignments: Array.isArray(assignments) ? assignments : [],
      deliverables: Array.isArray(deliverables) ? deliverables : [],
    };
  }

  if (initialShoot) {
    return {
      clientId: initialShoot.clientId,
      date: initialShoot.date,
      callTime: initialShoot.callTime || '',
      location: initialShoot.location,
      status: initialShoot.status || defaultStatus,
      clientAmount: initialShoot.clientAmount || 0,
      assignments: initialShoot.assignments || [],
      deliverables: initialShoot.deliverables || [],
    };
  }

  return {
    clientId: clients[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    callTime: '',
    location: '',
    status: defaultStatus,
    clientAmount: 0,
    assignments: [],
    deliverables: [],
  };
}

export function validateShootForm(values: ShootFormValues): string | null {
  if (!values.clientId) return 'Please select a client.';
  if (!values.location.trim()) return 'Location is required.';
  if (!values.date) return 'Date is required.';
  if (values.clientAmount < 0) return 'Client amount must be non-negative.';
  if (values.deliverables.some(item => item.fileLink.trim() && !safeHttpUrl(item.fileLink.trim()))) {
    return 'Deliverable links must use HTTPS.';
  }
  if (values.assignments.length > 0 && !values.callTime.trim() && values.assignments.some(assignment => !assignment.callTime)) {
    return 'Enter a general call time or a call-time override for every assigned cameraman.';
  }
  return null;
}

export function shouldOpenScheduleWhatsApp(
  initialShoot: Shoot | null | undefined,
  resubmission: ChangeRequest | null | undefined,
  status: string,
  userRole: string | undefined,
): boolean {
  return !initialShoot && !resubmission && status.toLowerCase() === 'scheduled' && Boolean(userRole && canCreateDirect(userRole));
}

export function getShootSubmitLabel(
  isSaving: boolean,
  resubmission: ChangeRequest | null | undefined,
  initialShoot: Shoot | null | undefined,
  isAdmin: boolean,
): string {
  if (isSaving) return 'Saving...';
  if (resubmission) return 'Resubmit for Approval';
  if (initialShoot) return isAdmin ? 'Submit Update for Approval' : 'Update Shoot';
  return isAdmin ? 'Submit for Approval' : 'Create Shoot';
}

export function getShootFormTitle(
  resubmission: ChangeRequest | null | undefined,
  initialShoot: Shoot | null | undefined,
): string {
  if (resubmission) return 'Edit & Resubmit Shoot';
  return initialShoot ? 'Edit Shoot Details' : 'Schedule New Shoot';
}

export function buildScheduleWhatsAppDrafts(
  shouldOpenWhatsApp: boolean,
  values: ShootFormValues,
  clients: Client[],
  cameramen: Cameraman[],
  crewScheduleTemplate?: string,
) {
  if (!shouldOpenWhatsApp) return [];
  return buildShootScheduleWhatsAppDrafts(
    {
      clientId: values.clientId,
      date: values.date,
      callTime: values.callTime.trim(),
      location: values.location.trim(),
      assignments: values.assignments,
    },
    clients.find(client => client.id === values.clientId),
    cameramen,
    crewScheduleTemplate,
  );
}

interface ShootSubmitHandlers {
  handleEditAndResubmit: (requestId: string, data: Record<string, unknown>) => Promise<void>;
  handleUpdateOrSubmit: (collection: 'shoots', shootId: string, data: Record<string, unknown>) => Promise<void>;
  handleCreateOrSubmit: (collection: 'shoots', data: Record<string, unknown>) => Promise<string>;
}

interface SubmitShootOptions {
  resubmission?: ChangeRequest | null;
  initialShoot?: Shoot | null;
  values: ShootFormValues;
  handlers: ShootSubmitHandlers;
}

export async function submitShootForm({
  resubmission,
  initialShoot,
  values,
  handlers,
}: SubmitShootOptions): Promise<void> {
  const data = {
    clientId: values.clientId,
    date: values.date,
    callTime: values.callTime.trim(),
    location: values.location.trim(),
    status: values.status,
    clientAmount: values.clientAmount,
    assignments: values.assignments,
    deliverables: values.deliverables,
  };

  if (resubmission) {
    await handlers.handleEditAndResubmit(resubmission.id, data);
  } else if (initialShoot) {
    await handlers.handleUpdateOrSubmit('shoots', initialShoot.id, data);
  } else {
    await handlers.handleCreateOrSubmit('shoots', { ...data, clientPaid: false, clientInvoiceNumber: null });
  }
}
