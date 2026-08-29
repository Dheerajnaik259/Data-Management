import { OverdueInfo } from '../types';

// Default payment grace period threshold in days after shoot date
export const DEFAULT_PAYMENT_GRACE_DAYS = 7;

/**
 * Evaluates whether a payment is overdue based on shoot date and paid status
 */
export function checkOverdue(
  shootDate: string,
  isPaid: boolean,
  shootStatus: string = 'done',
  graceDays: number = DEFAULT_PAYMENT_GRACE_DAYS
): OverdueInfo {
  if (isPaid) {
    return {
      isOverdue: false,
      daysDiff: 0,
      dueDate: shootDate,
      label: 'Paid',
    };
  }

  if (shootStatus !== 'done') {
    return {
      isOverdue: false,
      daysDiff: 0,
      dueDate: '',
      label: 'Pending completion',
    };
  }

  if (!shootDate) {
    return {
      isOverdue: false,
      daysDiff: 0,
      dueDate: '',
      label: 'Pending',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = shootDate.split('-').map(Number);
  const shoot = new Date(year, month - 1, day);
  shoot.setHours(0, 0, 0, 0);

  // Due date = shoot date + graceDays
  const due = new Date(shoot);
  due.setDate(due.getDate() + graceDays);

  // Difference in days between today and due date
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.floor((today.getTime() - due.getTime()) / msPerDay);

  const formattedDueDate = due.toISOString().split('T')[0];

  if (daysDiff > 0) {
    return {
      isOverdue: true,
      daysDiff,
      dueDate: formattedDueDate,
      label: `${daysDiff}d Overdue`,
    };
  } else if (daysDiff === 0) {
    return {
      isOverdue: false,
      daysDiff: 0,
      dueDate: formattedDueDate,
      label: 'Due Today',
    };
  } else {
    const daysRemaining = Math.abs(daysDiff);
    return {
      isOverdue: false,
      daysDiff,
      dueDate: formattedDueDate,
      label: `Due in ${daysRemaining}d`,
    };
  }
}

export const checkPaymentOverdue = checkOverdue;
