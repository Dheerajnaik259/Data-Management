import { describe, expect, it } from 'vitest';
import { ChangeRequest } from '../types';
import { filterChangeRequests } from './pendingApprovalsLogic';

function request(id: string, requestedBy: string, status: ChangeRequest['status']): ChangeRequest {
  return {
    id, targetCollection: 'clients', targetDocId: null, action: 'create', proposedData: {},
    requestedBy, requestedAt: '', status, reviewedBy: null, reviewedAt: null, reviewNote: '',
    revisionCount: 0,
  };
}

const requests = [
  request('mine-pending', 'user-1', 'pending'),
  request('mine-rejected', 'user-1', 'rejected'),
  request('other-pending', 'user-2', 'pending'),
];

describe('Pending approvals route logic', () => {
  it('limits submitters to their own requests and applies the selected tab', () => {
    expect(filterChangeRequests(requests, 'all', 'user-1', true, false))
      .toEqual(requests.slice(0, 2));
    expect(filterChangeRequests(requests, 'pending', 'user-1', true, false))
      .toEqual([requests[0]]);
  });

  it('keeps all users visible to approvers and non-submitters', () => {
    expect(filterChangeRequests(requests, 'pending', 'user-1', true, true))
      .toEqual([requests[0], requests[2]]);
    expect(filterChangeRequests(requests, 'all', undefined, false, false))
      .toEqual(requests);
  });
});
