import { describe, expect, it } from 'vitest';
import { ChangeRequest, Client, Cameraman, Expense, SettingsDoc, Shoot } from '../types';
import {
  buildCameramanLedgerMap,
  buildClientLedgerMap,
  buildDashboardStats,
  buildPaymentRecords,
  getSettingsOptions,
} from './dataSelectors';

const client: Client = {
  id: 'client-1', name: 'Client One', phone: '123', email: '', notes: '', status: 'active',
  contractLink: '', createdAt: '', deletedAt: null, deletedBy: null,
};

const cameraman: Cameraman = {
  id: 'cam-1', name: 'Crew One', phone: '456', rate: 50, notes: '', contractLink: '',
  unavailability: [], createdAt: '', deletedAt: null, deletedBy: null,
};

const shoots: Shoot[] = [
  {
    id: 'shoot-1', clientId: client.id, date: '2099-12-01', callTime: '', location: 'Studio A',
    status: 'scheduled', clientAmount: 100, clientPaid: false, assignedCameramanIds: ['cam-1'],
    assignments: [{ cameramanId: cameraman.id, amount: 50, paid: false }], deliverables: [],
    createdAt: '', deletedAt: null, deletedBy: null,
  },
  {
    id: 'shoot-2', clientId: client.id, date: '2099-12-02', callTime: '', location: 'Studio B',
    status: 'done', clientAmount: 200, clientPaid: true, assignedCameramanIds: ['cam-1'],
    assignments: [{ cameramanId: cameraman.id, amount: 80, paid: true }], deliverables: [],
    createdAt: '', deletedAt: null, deletedBy: null,
  },
];

describe('DataContext selectors', () => {
  it('builds client and cameraman ledgers from shoots and assignments', () => {
    expect(buildClientLedgerMap(shoots).get(client.id)).toEqual({
      totalBilled: 300, totalPaid: 200, outstanding: 100,
    });
    expect(buildCameramanLedgerMap(shoots).get(cameraman.id)).toEqual({
      totalAssigned: 130, totalPaid: 80, outstanding: 50,
    });
  });

  it('builds sorted payment records and matching dashboard totals', () => {
    const records = buildPaymentRecords(shoots, [client], [cameraman], 7);
    const expenses: Expense[] = [{
      id: 'expense-1', description: 'Travel', amount: 30, date: '2099-12-01',
      category: 'travel', createdAt: '', deletedAt: null, deletedBy: null,
    }];
    const changeRequests: ChangeRequest[] = [{
      id: 'cr-1', targetCollection: 'shoots', targetDocId: 'shoot-1', action: 'edit',
      proposedData: {}, requestedBy: 'admin-1', requestedAt: '2099-01-01', status: 'pending',
      reviewedBy: null, reviewedAt: null, reviewNote: '', revisionCount: 0,
    }];

    expect(records).toHaveLength(4);
    expect(records[0].shootId).toBe('shoot-2');
    expect(records.find(record => record.id === 'out-shoot-1-0')).toMatchObject({
      targetName: cameraman.name, amount: 50, isPaid: false, assignmentIndex: 0,
    });
    expect(buildDashboardStats(records, expenses, shoots, changeRequests)).toMatchObject({
      pendingClientAmount: 100,
      pendingCameramanAmount: 50,
      paidClientAmount: 200,
      paidCameramanAmount: 80,
      totalExpenses: 30,
      upcomingShootsCount: 2,
      pendingApprovalsCount: 1,
    });
  });

  it('merges missing deliverable defaults case-insensitively and respects archived filtering', () => {
    const settings: SettingsDoc[] = [{
      id: 'deliverables', key: 'deliverableTypes', label: 'Deliverables', editable: true,
      options: [
        { value: 'REEL', order: 2, archived: false },
        { value: 'legacy', order: 1, archived: true },
      ],
    }];

    expect(getSettingsOptions(settings, 'deliverableTypes').map(option => option.value)).toContain('REEL');
    expect(getSettingsOptions(settings, 'deliverableTypes').map(option => option.value)).not.toContain('reel');
    expect(getSettingsOptions(settings, 'deliverableTypes').map(option => option.value)).not.toContain('legacy');
    expect(getSettingsOptions(settings, 'deliverableTypes', true).map(option => option.value)).toContain('legacy');
  });
});
