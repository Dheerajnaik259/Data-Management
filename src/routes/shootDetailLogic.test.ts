import { describe, expect, it } from 'vitest';
import { Expense, Shoot } from '../types';
import { calculateShootFinancials } from './shootDetailLogic';

const shoot: Shoot = {
  id: 'shoot-1', clientId: 'client-1', date: '2026-11-10', callTime: '09:00', location: 'Studio',
  status: 'done', clientAmount: 1000, clientPaid: true, assignedCameramanIds: ['cam-1', 'cam-2'],
  assignments: [
    { cameramanId: 'cam-1', amount: 300, paid: true },
    { cameramanId: 'cam-2', amount: null, paid: false },
  ],
  deliverables: [], createdAt: '', deletedAt: null, deletedBy: null,
};

const expenses: Expense[] = [
  { id: 'expense-1', description: 'Travel', amount: 100, date: '', shootId: 'shoot-1', category: '', createdAt: '', deletedAt: null, deletedBy: null },
  { id: 'expense-2', description: 'Meals', amount: 50, date: '', shootId: 'shoot-1', category: '', createdAt: '', deletedAt: null, deletedBy: null },
  { id: 'expense-other', description: 'Other shoot', amount: 900, date: '', shootId: 'shoot-2', category: '', createdAt: '', deletedAt: null, deletedBy: null },
];

describe('Shoot detail financial logic', () => {
  it('calculates crew and direct costs and excludes other shoots', () => {
    expect(calculateShootFinancials(shoot, expenses)).toEqual({
      directExpenses: expenses.slice(0, 2),
      totalCrewPayouts: 300,
      shootDirectExpenses: 150,
      totalProductionCost: 450,
      netMargin: 550,
      marginPercentage: 55,
    });
  });

  it('keeps the existing zero-bill margin percentage fallback', () => {
    expect(calculateShootFinancials({ ...shoot, clientAmount: 0 }, expenses).marginPercentage).toBe(0);
  });
});
