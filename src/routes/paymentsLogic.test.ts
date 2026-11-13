import { describe, expect, it, vi } from 'vitest';
import { PaymentRecord } from '../types';
import { filterPaymentRecords, summarizePaymentRecords, togglePaymentRecord } from './paymentsLogic';

const records: PaymentRecord[] = [
  {
    id: 'incoming-pending', type: 'incoming', shootId: 'shoot-1', targetId: 'client-1',
    targetName: 'Acme', phone: '5551234', shootDate: '2026-11-10', shootLocation: 'Studio A',
    shootStatus: 'scheduled', amount: 100, isPaid: false,
    overdueInfo: { isOverdue: true, daysDiff: 1, dueDate: '2026-11-09', label: 'Overdue' },
  },
  {
    id: 'incoming-paid', type: 'incoming', shootId: 'shoot-2', targetId: 'client-2',
    targetName: 'Beta', shootDate: '2026-11-11', shootLocation: 'Studio B',
    shootStatus: 'done', amount: 200, isPaid: true,
    overdueInfo: { isOverdue: false, daysDiff: 0, dueDate: '', label: '' },
  },
  {
    id: 'outgoing-pending', type: 'outgoing', shootId: 'shoot-1', targetId: 'cam-1',
    targetName: 'Crew One', shootDate: '2026-11-10', shootLocation: 'Studio A',
    shootStatus: 'scheduled', amount: 40, hasAssignedRate: true, isPaid: false, assignmentIndex: 2,
    overdueInfo: { isOverdue: true, daysDiff: 1, dueDate: '2026-11-09', label: 'Overdue' },
  },
  {
    id: 'outgoing-unset', type: 'outgoing', shootId: 'shoot-2', targetId: 'cam-2',
    targetName: 'Crew Two', shootDate: '2026-11-11', shootLocation: 'Studio B',
    shootStatus: 'done', amount: 0, hasAssignedRate: false, isPaid: false, assignmentIndex: 0,
    overdueInfo: { isOverdue: false, daysDiff: 0, dueDate: '', label: '' },
  },
];

describe('Payments route logic', () => {
  it('filters by type, payment state, overdue state, and searchable record fields', () => {
    expect(filterPaymentRecords(records, 'incoming', 'all', '')).toEqual(records.slice(0, 2));
    expect(filterPaymentRecords(records, 'all', 'pending', '')).toEqual([records[0], records[2], records[3]]);
    expect(filterPaymentRecords(records, 'all', 'paid', '')).toEqual([records[1]]);
    expect(filterPaymentRecords(records, 'all', 'overdue', '')).toEqual([records[0], records[2]]);
    expect(filterPaymentRecords(records, 'all', 'all', '555')).toEqual([records[0]]);
  });

  it('summarizes pending and overdue amounts by transaction direction', () => {
    expect(summarizePaymentRecords(records)).toEqual({
      pendingIncoming: 100,
      pendingOutgoing: 40,
      overdueIncoming: 1,
      overdueOutgoing: 1,
      netPendingCashflow: 60,
    });
  });

  it('routes paid-state toggles and leaves an unset crew rate unchanged', async () => {
    const actions = {
      toggleClientPayment: vi.fn().mockResolvedValue(undefined),
      toggleCameramanPayment: vi.fn().mockResolvedValue(undefined),
    };

    await togglePaymentRecord(records[0], actions);
    await togglePaymentRecord(records[2], actions);
    await togglePaymentRecord(records[3], actions);

    expect(actions.toggleClientPayment).toHaveBeenCalledWith('shoot-1', true);
    expect(actions.toggleCameramanPayment).toHaveBeenCalledTimes(1);
    expect(actions.toggleCameramanPayment).toHaveBeenCalledWith('shoot-1', 2, true);
  });
});
