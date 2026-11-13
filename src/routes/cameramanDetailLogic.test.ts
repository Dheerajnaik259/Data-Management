import { describe, expect, it } from 'vitest';
import { Shoot } from '../types';
import { getCameramanAssignments, getPendingCameramanRates } from './cameramanDetailLogic';

const shoots: Shoot[] = [
  {
    id: 'shoot-1', clientId: 'client-1', date: '2026-11-10', callTime: '', location: 'Studio A',
    status: 'done', clientAmount: 100, clientPaid: true, assignedCameramanIds: ['cam-1'],
    assignments: [
      { cameramanId: 'cam-2', amount: 10, paid: true },
      { cameramanId: 'cam-1', amount: null, paid: false },
    ],
    deliverables: [], createdAt: '', deletedAt: null, deletedBy: null,
  },
  {
    id: 'shoot-2', clientId: 'client-1', date: '2026-11-11', callTime: '', location: 'Studio B',
    status: 'scheduled', clientAmount: 200, clientPaid: false, assignedCameramanIds: ['cam-1'],
    assignments: [{ cameramanId: 'cam-1', amount: 25, paid: true, paidAt: '2026-11-11T00:00:00Z' }],
    deliverables: [], createdAt: '', deletedAt: null, deletedBy: null,
  },
];

describe('Cameraman detail assignment logic', () => {
  it('collects only matching assignments while retaining their shoot index and payout fields', () => {
    const assignments = getCameramanAssignments(shoots, 'cam-1');

    expect(assignments.map(item => ({
      shootId: item.shoot.id,
      amount: item.amount,
      paid: item.paid,
      paidAt: item.paidAt,
      assignmentIndex: item.assignmentIndex,
    }))).toEqual([
      { shootId: 'shoot-1', amount: null, paid: false, paidAt: undefined, assignmentIndex: 1 },
      { shootId: 'shoot-2', amount: 25, paid: true, paidAt: '2026-11-11T00:00:00Z', assignmentIndex: 0 },
    ]);
    expect(getPendingCameramanRates(assignments)).toEqual([assignments[0]]);
  });

  it('returns an empty list for a cameraman with no assignments', () => {
    expect(getCameramanAssignments(shoots, 'cam-missing')).toEqual([]);
    expect(getPendingCameramanRates([])).toEqual([]);
  });
});
