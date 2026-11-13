import {
  Cameraman,
  CameramanLedger,
  ChangeRequest,
  Client,
  ClientLedger,
  Expense,
  PaymentRecord,
  SettingsDoc,
  SettingsOption,
  Shoot,
} from '../types';
import { checkOverdue } from '../utils/overdueCheck';
import { toLocalDateString } from '../utils/localDate';

export const DEFAULT_SETTINGS_OPTIONS: Record<string, SettingsOption[]> = {
  clientStatus: [
    { value: 'active', order: 1, archived: false },
    { value: 'inactive', order: 2, archived: false },
  ],
  shootStatus: [
    { value: 'scheduled', order: 1, archived: false },
    { value: 'done', order: 2, archived: false },
  ],
  deliverableTypes: [
    { value: 'reel', order: 1, archived: false },
    { value: 'story', order: 2, archived: false },
    { value: 'photo set', order: 3, archived: false },
    { value: 'Social media strategy & campaign planning', order: 4, archived: false },
    { value: 'Social media account management', order: 5, archived: false },
    { value: 'Content calendar', order: 6, archived: false },
    { value: 'Social media post design', order: 7, archived: false },
    { value: 'Caption & copywriting', order: 8, archived: false },
    { value: 'Reels & short-form video', order: 9, archived: false },
    { value: 'Community management', order: 10, archived: false },
    { value: 'Paid ads management (ad spend billed separately)', order: 11, archived: false },
    { value: 'Campaign performance report', order: 12, archived: false },
  ],
  expenseCategories: [
    { value: 'travel', order: 1, archived: false },
    { value: 'equipment', order: 2, archived: false },
    { value: 'software', order: 3, archived: false },
    { value: 'other', order: 4, archived: false },
  ],
};

export function getSettingsOptions(
  settings: SettingsDoc[],
  key: string,
  includeArchived = false,
): SettingsOption[] {
  const doc = settings.find(setting => setting.key === key);
  const defaults = DEFAULT_SETTINGS_OPTIONS[key] || [];
  const storedOptions = doc?.options && doc.options.length > 0 ? doc.options : null;
  const rawOptions = storedOptions && key === 'deliverableTypes'
    ? [
        ...storedOptions,
        ...defaults.filter(option => !storedOptions.some(
          stored => stored.value.toLocaleLowerCase() === option.value.toLocaleLowerCase(),
        )),
      ]
    : storedOptions || defaults;
  const options = includeArchived ? rawOptions : rawOptions.filter(option => !option.archived);
  return [...options].sort((a, b) => a.order - b.order);
}

export function buildClientLedgerMap(shoots: Shoot[]): Map<string, ClientLedger> {
  const map = new Map<string, ClientLedger>();
  shoots.forEach(shoot => {
    if (!shoot.clientId) return;
    const current = map.get(shoot.clientId) || { totalBilled: 0, totalPaid: 0, outstanding: 0 };
    const amount = shoot.clientAmount || 0;
    current.totalBilled += amount;
    if (shoot.clientPaid) current.totalPaid += amount;
    current.outstanding = current.totalBilled - current.totalPaid;
    map.set(shoot.clientId, current);
  });
  return map;
}

export function buildCameramanLedgerMap(shoots: Shoot[]): Map<string, CameramanLedger> {
  const map = new Map<string, CameramanLedger>();
  shoots.forEach(shoot => {
    shoot.assignments?.forEach(assignment => {
      if (!assignment.cameramanId) return;
      const current = map.get(assignment.cameramanId) || { totalAssigned: 0, totalPaid: 0, outstanding: 0 };
      const amount = assignment.amount || 0;
      current.totalAssigned += amount;
      if (assignment.paid) current.totalPaid += amount;
      current.outstanding = current.totalAssigned - current.totalPaid;
      map.set(assignment.cameramanId, current);
    });
  });
  return map;
}

export function buildPaymentRecords(
  shoots: Shoot[],
  clients: Client[],
  cameramen: Cameraman[],
  graceDays: number,
): PaymentRecord[] {
  const records: PaymentRecord[] = [];
  const clientMap = new Map<string, Client>(clients.map(client => [client.id, client]));
  const cameramanMap = new Map<string, Cameraman>(cameramen.map(cameraman => [cameraman.id, cameraman]));

  shoots.forEach(shoot => {
    const client = clientMap.get(shoot.clientId);
    records.push({
      id: `inc-${shoot.id}`, type: 'incoming', shootId: shoot.id,
      targetId: shoot.clientId, targetName: client?.name || 'Unknown',
      phone: client?.phone, shootDate: shoot.date, shootLocation: shoot.location,
      shootStatus: shoot.status, amount: shoot.clientAmount, isPaid: shoot.clientPaid,
      paidAt: shoot.clientPaidAt,
      overdueInfo: checkOverdue(shoot.date, shoot.clientPaid, shoot.status, graceDays),
    });
    shoot.assignments?.forEach((assignment, assignmentIndex) => {
      const cameraman = cameramanMap.get(assignment.cameramanId);
      records.push({
        id: `out-${shoot.id}-${assignmentIndex}`, type: 'outgoing', shootId: shoot.id,
        targetId: assignment.cameramanId, targetName: cameraman?.name || 'Unknown',
        phone: cameraman?.phone, shootDate: shoot.date, shootLocation: shoot.location,
        shootStatus: shoot.status, amount: assignment.amount || 0,
        hasAssignedRate: assignment.amount !== null, isPaid: assignment.paid,
        paidAt: assignment.paidAt,
        overdueInfo: checkOverdue(shoot.date, assignment.paid, shoot.status, graceDays),
        assignmentIndex,
      });
    });
  });

  return records.sort((a, b) => new Date(b.shootDate).getTime() - new Date(a.shootDate).getTime());
}

export function buildDashboardStats(
  paymentRecords: PaymentRecord[],
  expenses: Expense[],
  shoots: Shoot[],
  changeRequests: ChangeRequest[],
) {
  let pendingClientAmount = 0;
  let pendingClientCount = 0;
  let pendingCameramanAmount = 0;
  let pendingCameramanCount = 0;
  let overdueIncomingCount = 0;
  let overdueOutgoingCount = 0;
  let paidCameramanAmount = 0;
  let paidCameramanCount = 0;
  let paidClientAmount = 0;
  let paidClientCount = 0;

  paymentRecords.forEach(record => {
    if (record.type === 'incoming') {
      if (!record.isPaid) {
        pendingClientAmount += record.amount;
        pendingClientCount++;
        if (record.overdueInfo.isOverdue) overdueIncomingCount++;
      } else {
        paidClientAmount += record.amount;
        paidClientCount++;
      }
    }
    if (record.type === 'outgoing') {
      if (!record.isPaid) {
        pendingCameramanAmount += record.amount;
        pendingCameramanCount++;
        if (record.overdueInfo.isOverdue) overdueOutgoingCount++;
      } else {
        paidCameramanAmount += record.amount;
        paidCameramanCount++;
      }
    }
  });

  const todayStr = toLocalDateString(new Date());
  return {
    pendingClientAmount, pendingClientCount,
    pendingCameramanAmount, pendingCameramanCount,
    paidCameramanAmount, paidCameramanCount,
    paidClientAmount, paidClientCount,
    totalExpenses: expenses.reduce((total, expense) => total + (expense.amount || 0), 0),
    upcomingShootsCount: shoots.filter(shoot => shoot.date >= todayStr).length,
    overdueIncomingCount, overdueOutgoingCount,
    pendingApprovalsCount: changeRequests.filter(request => request.status === 'pending').length,
  };
}
