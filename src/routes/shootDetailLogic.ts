import { Expense, Shoot } from '../types';

export interface ShootFinancials {
  directExpenses: Expense[];
  totalCrewPayouts: number;
  shootDirectExpenses: number;
  totalProductionCost: number;
  netMargin: number;
  marginPercentage: number;
}

export function calculateShootFinancials(shoot: Shoot, expenses: Expense[]): ShootFinancials {
  const totalCrewPayouts = (shoot.assignments || []).reduce((total, assignment) => total + (assignment.amount || 0), 0);
  const directExpenses = expenses.filter(expense => expense.shootId === shoot.id);
  const shootDirectExpenses = directExpenses.reduce((total, expense) => total + (expense.amount || 0), 0);
  const totalProductionCost = totalCrewPayouts + shootDirectExpenses;
  const netMargin = shoot.clientAmount - totalProductionCost;
  const marginPercentage = shoot.clientAmount > 0
    ? Math.round((netMargin / shoot.clientAmount) * 100)
    : 0;

  return {
    directExpenses,
    totalCrewPayouts,
    shootDirectExpenses,
    totalProductionCost,
    netMargin,
    marginPercentage,
  };
}
