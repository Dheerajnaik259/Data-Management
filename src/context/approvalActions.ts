import { Dispatch, SetStateAction } from 'react';
import { AuthUser, Cameraman, ChangeRequest, Client, Expense, SettingsDoc, Shoot } from '../types';
import {
  deleteChangeRequest,
  fetchCameramen,
  fetchChangeRequests,
  fetchClients,
  fetchExpenses,
  fetchShoots,
  resubmitChangeRequestWithNotification,
  reviewChangeRequestWithNotification,
} from '../supabase/data';
import { parseOperationalSettings } from '../config/business';
import { canApprove, canDelete as canDeletePerm, canSubmitCollectionForApproval, canSubmitForApproval } from '../utils/permissions';
import { formatSingularCollection } from '../utils/formatCollection';
import {
  buildShootScheduleWhatsAppDrafts,
  cancelWhatsAppDraftTabs,
  completeWhatsAppDraftTabs,
  prepareWhatsAppDraftTabs,
} from '../utils/whatsapp';
import { useToast } from './ToastContext';

type Toast = ReturnType<typeof useToast>['toast'];
type WhatsAppTabs = ReturnType<typeof prepareWhatsAppDraftTabs>;

interface ApprovalActionDependencies {
  user: AuthUser | null;
  toast: Toast;
  changeRequests: ChangeRequest[];
  clients: Client[];
  cameramen: Cameraman[];
  settings: SettingsDoc[];
  setChangeRequests: Dispatch<SetStateAction<ChangeRequest[]>>;
  setClients: Dispatch<SetStateAction<Client[]>>;
  setCameramen: Dispatch<SetStateAction<Cameraman[]>>;
  setShoots: Dispatch<SetStateAction<Shoot[]>>;
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  getApprovalRecipientId: () => Promise<string>;
}

export function createApprovalActions({
  user,
  toast,
  changeRequests,
  clients,
  cameramen,
  settings,
  setChangeRequests,
  setClients,
  setCameramen,
  setShoots,
  setExpenses,
  getApprovalRecipientId,
}: ApprovalActionDependencies) {
  const handleApprove = async (crId: string, reviewNote = '') => {
    let whatsappTabs: WhatsAppTabs = [];
    try {
      if (!user) throw new Error('Not authenticated.');
      const cr = changeRequests.find(request => request.id === crId);
      if (!cr || cr.status !== 'pending') return;

      if (cr.targetCollection === 'shoots' && cr.action === 'create') {
        const proposed = cr.proposedData;
        const assignments = Array.isArray(proposed.assignments)
          ? proposed.assignments.flatMap(assignmentValue => {
            if (!assignmentValue || typeof assignmentValue !== 'object') return [];
            const assignment = assignmentValue as Record<string, unknown>;
            if (typeof assignment.cameramanId !== 'string') return [];
            return [{
              cameramanId: assignment.cameramanId,
              callTime: typeof assignment.callTime === 'string' ? assignment.callTime : null,
            }];
          })
          : [];
        const clientId = typeof proposed.clientId === 'string' ? proposed.clientId : '';
        const date = typeof proposed.date === 'string' ? proposed.date : '';
        const callTime = typeof proposed.callTime === 'string' ? proposed.callTime : '';
        const location = typeof proposed.location === 'string' ? proposed.location : '';
        const status = typeof proposed.status === 'string' ? proposed.status : '';
        if (status.toLowerCase() === 'scheduled' && clientId && date && location) {
          const operationalSettings = parseOperationalSettings(settings.find(setting => setting.key === 'operationalSettings'));
          const drafts = buildShootScheduleWhatsAppDrafts(
            { clientId, date, callTime, location, assignments },
            clients.find(client => client.id === clientId),
            cameramen,
            operationalSettings.crewScheduleTemplate,
          );
          whatsappTabs = prepareWhatsAppDraftTabs(drafts);
        }
      }

      const now = new Date().toISOString();
      await reviewChangeRequestWithNotification(cr.id, 'approved', reviewNote);
      setChangeRequests(prev => prev.map(item =>
        item.id === crId ? { ...item, status: 'approved', reviewedBy: user.uid, reviewedAt: now, reviewNote } : item
      ));
      toast({ type: 'success', message: `${formatSingularCollection(cr.targetCollection)} ${cr.action} approved.` });
      const blockedRecipients = completeWhatsAppDraftTabs(whatsappTabs);
      if (blockedRecipients.length > 0) {
        toast({
          type: 'warning',
          message: `Shoot approved, but your browser blocked WhatsApp for: ${blockedRecipients.join(', ')}. Open the shoot details to launch each message draft.`,
        });
      }

      void fetchChangeRequests().then(setChangeRequests);
      void fetchClients().then(setClients);
      void fetchCameramen().then(setCameramen);
      void fetchShoots().then(setShoots);
      void fetchExpenses().then(setExpenses);
    } catch (err) {
      cancelWhatsAppDraftTabs(whatsappTabs);
      const message = err instanceof Error ? err.message : 'Failed to approve request';
      toast({ type: 'error', message });
      throw err;
    }
  };

  const handleReject = async (crId: string, reviewNote: string) => {
    try {
      if (!user) throw new Error('Not authenticated.');
      const cr = changeRequests.find(request => request.id === crId);
      if (!cr || cr.status !== 'pending') return;

      const now = new Date().toISOString();
      await reviewChangeRequestWithNotification(cr.id, 'rejected', reviewNote);
      setChangeRequests(prev => prev.map(item =>
        item.id === crId ? { ...item, status: 'rejected', reviewedBy: user.uid, reviewedAt: now, reviewNote } : item
      ));
      toast({ type: 'success', message: 'Approval request rejected.' });
      void fetchChangeRequests().then(setChangeRequests);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject request';
      toast({ type: 'error', message });
      throw err;
    }
  };

  const handleEditAndResubmit = async (crId: string, newData: Record<string, unknown>) => {
    try {
      if (!user || !canSubmitForApproval(user.role)) throw new Error('Not authorized to resubmit.');
      const cr = changeRequests.find(request => request.id === crId);
      if (!cr || (cr.status !== 'pending' && cr.status !== 'rejected')) return;
      if (!canSubmitCollectionForApproval(user.role, cr.targetCollection)) throw new Error('Your role cannot resubmit this type of change.');

      const now = new Date().toISOString();
      const updatedCR: ChangeRequest = {
        ...cr,
        proposedData: newData,
        status: 'pending',
        requestedBy: user.uid,
        requestedAt: now,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: '',
        revisionCount: cr.revisionCount + 1,
      };

      const recipientId = await getApprovalRecipientId().catch(() => 'system');

      await resubmitChangeRequestWithNotification(crId, {
        proposedData: newData,
        status: 'pending',
        requestedBy: user.uid,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: '',
        revisionCount: (cr.revisionCount || 0) + 1,
        requestedAt: now,
      }, recipientId, `${formatSingularCollection(cr.targetCollection)} resubmitted for review`);

      setChangeRequests(prev => prev.map(item => item.id === crId ? updatedCR : item));
      toast({ type: 'success', message: 'Resubmitted for Founder approval.' });
      const freshCRs = await fetchChangeRequests();
      setChangeRequests(freshCRs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resubmit request';
      toast({ type: 'error', message });
      throw err;
    }
  };

  const handleDeleteChangeRequest = async (crId: string) => {
    try {
      if (!user) throw new Error('Not authenticated.');
      if (!canDeletePerm(user.role) && !canApprove(user.role)) {
        throw new Error('Your role cannot delete approval requests.');
      }
      const cr = changeRequests.find(request => request.id === crId);
      if (!cr) return;

      await deleteChangeRequest(crId);
      setChangeRequests(prev => prev.filter(item => item.id !== crId));
      toast({ type: 'success', message: 'Change request deleted.' });
      void fetchChangeRequests().then(setChangeRequests);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete change request';
      toast({ type: 'error', message });
      throw err;
    }
  };

  return {
    handleApprove,
    handleReject,
    handleEditAndResubmit,
    handleDeleteChangeRequest,
  };
}
