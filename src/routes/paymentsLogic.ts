import { PaymentRecord } from '../types';

export type PaymentTab = 'all' | 'incoming' | 'outgoing';
export type PaymentStatusFilter = 'all' | 'pending' | 'paid' | 'overdue';

export interface PaymentStats {
  pendingIncoming: number;
  pendingOutgoing: number;
  overdueIncoming: number;
  overdueOutgoing: number;
  netPendingCashflow: number;
}

export function filterPaymentRecords(
  records: PaymentRecord[],
  activeTab: PaymentTab,
  statusFilter: PaymentStatusFilter,
  searchQuery: string,
): PaymentRecord[] {
  return records.filter(record => {
    if (activeTab !== 'all' && record.type !== activeTab) return false;
    if (statusFilter === 'pending' && record.isPaid) return false;
    if (statusFilter === 'paid' && !record.isPaid) return false;
    if (statusFilter === 'overdue' && (record.isPaid || !record.overdueInfo.isOverdue)) return false;
    return record.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.shootLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.shootDate.includes(searchQuery) ||
      Boolean(record.phone && record.phone.includes(searchQuery));
  });
}

export function summarizePaymentRecords(records: PaymentRecord[]): PaymentStats {
  let pendingIncoming = 0;
  let pendingOutgoing = 0;
  let overdueIncoming = 0;
  let overdueOutgoing = 0;

  records.forEach(record => {
    if (record.type === 'incoming') {
      if (!record.isPaid) {
        pendingIncoming += record.amount;
        if (record.overdueInfo.isOverdue) overdueIncoming++;
      }
    } else if (!record.isPaid) {
      pendingOutgoing += record.amount;
      if (record.overdueInfo.isOverdue) overdueOutgoing++;
    }
  });

  return {
    pendingIncoming,
    pendingOutgoing,
    overdueIncoming,
    overdueOutgoing,
    netPendingCashflow: pendingIncoming - pendingOutgoing,
  };
}

interface PaymentActions {
  toggleClientPayment: (shootId: string, isPaid: boolean) => Promise<void>;
  toggleCameramanPayment: (shootId: string, assignmentIndex: number, isPaid: boolean) => Promise<void>;
}

export async function togglePaymentRecord(record: PaymentRecord, actions: PaymentActions): Promise<void> {
  if (record.type === 'outgoing' && !record.hasAssignedRate && !record.isPaid) return;
  if (record.type === 'incoming') {
    await actions.toggleClientPayment(record.shootId, !record.isPaid);
    return;
  }
  await actions.toggleCameramanPayment(record.shootId, record.assignmentIndex ?? 0, !record.isPaid);
}
