import { ChangeRequest, Client, Cameraman, Shoot, Expense } from '../types';

export function mergePendingItems<T extends { id: string }>(
  items: T[],
  changeRequests: ChangeRequest[],
  collectionName: 'clients' | 'cameramen' | 'shoots' | 'expenses'
): Array<T & { _pendingStatus?: 'pending_create' | 'pending_edit' | 'rejected' }> {
  // Sort change requests from newest to oldest
  const sortedCRs = [...changeRequests].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );

  // 1. Process edits onto existing items based on the LATEST change request
  const latestEditMap = new Map<string, ChangeRequest>();
  sortedCRs.forEach(cr => {
    if (cr.targetCollection === collectionName && cr.action === 'edit' && cr.targetDocId) {
      if (!latestEditMap.has(cr.targetDocId)) {
        latestEditMap.set(cr.targetDocId, cr);
      }
    }
  });

  const mergedItems = items.map(item => {
    const latestReq = latestEditMap.get(item.id);
    if (latestReq && (latestReq.status === 'pending' || latestReq.status === 'rejected')) {
      return {
        ...item,
        ...(latestReq.status === 'pending' ? latestReq.proposedData : {}),
        _pendingStatus: latestReq.status === 'rejected' ? 'rejected' : 'pending_edit'
      } as T & { _pendingStatus: 'pending_edit' | 'rejected' };
    }
    return item;
  });

  // 2. Process creates (only append pending or rejected create requests that are not yet in database)
  const latestCreateMap = new Map<string, ChangeRequest>();
  sortedCRs.forEach(cr => {
    if (cr.targetCollection === collectionName && cr.action === 'create') {
      const key = cr.targetDocId || cr.id;
      if (!latestCreateMap.has(key)) {
        latestCreateMap.set(key, cr);
      }
    }
  });

  latestCreateMap.forEach(req => {
    if (req.status === 'pending' || req.status === 'rejected') {
      const existsInItems = req.targetDocId && items.some(i => i.id === req.targetDocId);
      if (!existsInItems) {
        mergedItems.unshift({
          ...req.proposedData,
          id: `pending-cr-${req.id}`,
          _pendingStatus: req.status === 'rejected' ? 'rejected' : 'pending_create'
        } as unknown as T & { _pendingStatus: 'pending_create' | 'rejected' });
      }
    }
  });

  return mergedItems;
}
