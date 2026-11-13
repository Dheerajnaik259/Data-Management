import { ChangeRequest } from '../types';

export type ApprovalTab = 'all' | 'pending' | 'approved' | 'rejected';

export function filterChangeRequests(
  requests: ChangeRequest[],
  tab: ApprovalTab,
  userId: string | undefined,
  isSubmitter: boolean,
  isApprover: boolean,
): ChangeRequest[] {
  const visibleRequests = isSubmitter && !isApprover
    ? requests.filter(request => request.requestedBy === userId)
    : requests;
  return visibleRequests.filter(request => tab === 'all' || request.status === tab);
}
