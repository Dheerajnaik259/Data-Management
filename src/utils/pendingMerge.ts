import { ChangeRequest, Client, Cameraman, Shoot, Expense } from '../types';

export function mergePendingItems<T extends { id: string }>(
  items: T[],
  changeRequests: ChangeRequest[],
  collectionName: 'clients' | 'cameramen' | 'shoots' | 'expenses'
): Array<T & { _pendingStatus?: 'pending_create' | 'pending_edit' | 'rejected' }> {
  // 1. Process edits onto existing items
  const editRequests = changeRequests.filter(cr => cr.targetCollection === collectionName && cr.action === 'edit' && cr.targetDocId);
  const editMap = new Map(editRequests.map(cr => [cr.targetDocId, cr]));

  const mergedItems = items.map(item => {
    const req = editMap.get(item.id);
    if (req) {
      return {
        ...item,
        ...req.proposedData,
        _pendingStatus: req.status === 'rejected' ? 'rejected' : 'pending_edit'
      } as T & { _pendingStatus: 'pending_edit' | 'rejected' };
    }
    return item;
  });

  // 2. Process creates (append as new items)
  const createRequests = changeRequests.filter(cr => cr.targetCollection === collectionName && cr.action === 'create');
  
  createRequests.forEach(req => {
    mergedItems.unshift({
      ...req.proposedData,
      id: `pending-cr-${req.id}`, // Temporary ID for rendering
      _pendingStatus: req.status === 'rejected' ? 'rejected' : 'pending_create'
    } as unknown as T & { _pendingStatus: 'pending_create' | 'rejected' });
  });

  return mergedItems;
}
