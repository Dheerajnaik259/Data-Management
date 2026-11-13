import { Dispatch, SetStateAction } from 'react';
import { AuthUser, Cameraman, ChangeRequest, Client, Expense, ManagedCollection, Shoot } from '../types';
import {
  directCreate,
  directUpdate,
  deleteChangeRequest,
  hardDelete,
  restoreRecord,
  softDelete,
  submitChangeRequestWithNotification,
} from '../supabase/data';
import {
  canCreateDirect,
  canDelete as canDeletePerm,
  canHardDelete as canHardDeletePerm,
  canSubmitCollectionForApproval,
} from '../utils/permissions';
import { formatSingularCollection } from '../utils/formatCollection';
import { useToast } from './ToastContext';

type Toast = ReturnType<typeof useToast>['toast'];
type DeletedRecord = { collection: ManagedCollection; record: Client | Cameraman | Shoot | Expense };

interface DataCrudActionDependencies {
  user: AuthUser | null;
  toast: Toast;
  changeRequests: ChangeRequest[];
  setChangeRequests: Dispatch<SetStateAction<ChangeRequest[]>>;
  setClients: Dispatch<SetStateAction<Client[]>>;
  setCameramen: Dispatch<SetStateAction<Cameraman[]>>;
  setShoots: Dispatch<SetStateAction<Shoot[]>>;
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  setDeletedRecords: Dispatch<SetStateAction<DeletedRecord[]>>;
  getApprovalRecipientId: () => Promise<string>;
}

export function createDataCrudActions({
  user,
  toast,
  changeRequests,
  setChangeRequests,
  setClients,
  setCameramen,
  setShoots,
  setExpenses,
  setDeletedRecords,
  getApprovalRecipientId,
}: DataCrudActionDependencies) {
  const handleCreateOrSubmit = async (col: ManagedCollection, data: Record<string, unknown>): Promise<string> => {
    try {
      if (!user) throw new Error('Not authenticated');
      if (canCreateDirect(user.role)) {
        return await directCreate(col, data);
      }
      if (!canSubmitCollectionForApproval(user.role, col)) throw new Error('Your role cannot submit this type of change.');
      const pendingDup = changeRequests.some(cr =>
        cr.targetCollection === col &&
        cr.action === 'create' &&
        cr.status === 'pending' &&
        JSON.stringify(cr.proposedData) === JSON.stringify(data)
      );
      if (pendingDup) {
        toast({ type: 'warning', message: 'An approval request with this exact data is already pending.' });
        return '';
      }
      const crId = await submitChangeRequestWithNotification({
        targetCollection: col, targetDocId: null, action: 'create',
        proposedData: data, requestedBy: user.uid,
        requestedAt: new Date().toISOString(), status: 'pending',
        reviewedBy: null, reviewedAt: null, reviewNote: '', revisionCount: 0,
      }, await getApprovalRecipientId(), `New ${col.slice(0, -1)} submission needs review`);

      if (crId) {
        const newCr: ChangeRequest = {
          id: crId,
          targetCollection: col,
          targetDocId: null,
          action: 'create',
          proposedData: data,
          requestedBy: user.uid,
          requestedAt: new Date().toISOString(),
          status: 'pending',
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: '',
          revisionCount: 0,
        };
        setChangeRequests(prev => [newCr, ...prev.filter(changeRequest => changeRequest.id !== crId)]);
        toast({ type: 'success', message: `Submitted new ${formatSingularCollection(col)} for approval.` });
      }
      return crId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      toast({ type: 'error', message });
      throw err;
    }
  };

  const handleUpdateOrSubmit = async (col: ManagedCollection, docId: string, data: Record<string, unknown>): Promise<void> => {
    try {
      if (!user) throw new Error('Not authenticated');
      if (canCreateDirect(user.role)) {
        await directUpdate(col, docId, data);
        return;
      }
      if (!canSubmitCollectionForApproval(user.role, col)) throw new Error('Your role cannot submit this type of change.');
      const crId = await submitChangeRequestWithNotification({
        targetCollection: col, targetDocId: docId, action: 'edit',
        proposedData: data, requestedBy: user.uid,
        requestedAt: new Date().toISOString(), status: 'pending',
        reviewedBy: null, reviewedAt: null, reviewNote: '', revisionCount: 0,
      }, await getApprovalRecipientId(), `${col.slice(0, -1)} edit needs review`);

      if (crId) {
        const newCr: ChangeRequest = {
          id: crId,
          targetCollection: col,
          targetDocId: docId,
          action: 'edit',
          proposedData: data,
          requestedBy: user.uid,
          requestedAt: new Date().toISOString(),
          status: 'pending',
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: '',
          revisionCount: 0,
        };
        setChangeRequests(prev => [newCr, ...prev.filter(changeRequest => changeRequest.id !== crId)]);
        toast({ type: 'success', message: `Submitted ${formatSingularCollection(col)} edits for approval.` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      toast({ type: 'error', message });
      throw err;
    }
  };

  const handleSoftDelete = async (col: ManagedCollection, docId: string) => {
    try {
      if (!user || !canDeletePerm(user.role)) throw new Error('You do not have permission to delete records.');
      if (docId.startsWith('pending-cr-')) {
        const crId = docId.replace('pending-cr-', '');
        await deleteChangeRequest(crId);
        setChangeRequests(prev => prev.filter(changeRequest => changeRequest.id !== crId));
        toast({ type: 'success', message: 'Pending request cancelled.' });
        return;
      }
      await softDelete(col, docId);
      if (col === 'clients') setClients(prev => prev.filter(client => client.id !== docId));
      if (col === 'cameramen') setCameramen(prev => prev.filter(cameraman => cameraman.id !== docId));
      if (col === 'shoots') setShoots(prev => prev.filter(shoot => shoot.id !== docId));
      if (col === 'expenses') setExpenses(prev => prev.filter(expense => expense.id !== docId));
      toast({ type: 'success', message: `${formatSingularCollection(col)} moved to Recycle Bin.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete record';
      toast({ type: 'error', message });
      throw err;
    }
  };

  const handleRestore = async (col: ManagedCollection, docId: string) => {
    try {
      if (!user || !canDeletePerm(user.role)) throw new Error('You do not have permission to restore records.');
      await restoreRecord(col, docId);
      setDeletedRecords(prev => prev.filter(record => !(record.collection === col && record.record.id === docId)));
      toast({ type: 'success', message: `${formatSingularCollection(col)} restored.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore record';
      toast({ type: 'error', message });
      throw err;
    }
  };

  const handleHardDelete = async (col: ManagedCollection, docId: string) => {
    try {
      if (!user || !canHardDeletePerm(user.role)) throw new Error('Only a Founder can permanently delete records from the Recycle Bin.');
      if (docId.startsWith('pending-cr-')) {
        const crId = docId.replace('pending-cr-', '');
        await deleteChangeRequest(crId);
        setChangeRequests(prev => prev.filter(changeRequest => changeRequest.id !== crId));
      } else {
        await hardDelete(col, docId);
      }
      setDeletedRecords(prev => prev.filter(record => !(record.collection === col && record.record.id === docId)));
      toast({ type: 'success', message: `${col.slice(0, -1)} permanently deleted.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to permanently delete record';
      toast({ type: 'error', message });
      throw err;
    }
  };

  return {
    handleCreateOrSubmit,
    handleUpdateOrSubmit,
    handleSoftDelete,
    handleRestore,
    handleHardDelete,
  };
}
