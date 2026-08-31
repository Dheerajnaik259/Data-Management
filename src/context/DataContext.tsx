import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Client, Cameraman, Shoot, Expense, ClientLedger, CameramanLedger,
  PaymentRecord, SettingsDoc, ChangeRequest, AppNotification, SettingsOption, ManagedCollection,
} from '../types';
import {
  subscribeToClients, subscribeToCameramen, subscribeToShoots, subscribeToExpenses,
  subscribeToSettings, updateSettingsDoc, subscribeToChangeRequests,
  subscribeToNotifications, subscribeToDeletedRecords,
  directCreate, directUpdate, softDelete, restoreRecord, hardDelete,
  markNotificationRead, markAllNotificationsRead,
  addCommunicationLog, resetToSeedData, requestInvoiceNumber, findUserIdByRole,
  submitChangeRequestWithNotification, resubmitChangeRequestWithNotification,
  reviewChangeRequestWithNotification,
  updateShootOperationalData,
} from '../supabase/data';
import { isSupabaseConfigured } from '../supabase/config';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { checkOverdue } from '../utils/overdueCheck';
import { parseOperationalSettings } from '../config/business';
import { canCreateDirect, canApprove, canDelete as canDeletePerm, canSubmitForApproval } from '../utils/permissions';

interface DashboardStats {
  pendingClientAmount: number;
  pendingClientCount: number;
  pendingCameramanAmount: number;
  pendingCameramanCount: number;
  totalExpenses: number;
  upcomingShootsCount: number;
  overdueIncomingCount: number;
  overdueOutgoingCount: number;
  pendingApprovalsCount: number;
}

interface DataContextType {
  clients: Client[];
  cameramen: Cameraman[];
  shoots: Shoot[];
  expenses: Expense[];
  settings: SettingsDoc[];
  changeRequests: ChangeRequest[];
  notifications: AppNotification[];
  deletedRecords: Array<{ collection: ManagedCollection; record: Client | Cameraman | Shoot | Expense }>;
  loading: boolean;
  dashboardStats: DashboardStats;
  getClientLedger: (clientId: string) => ClientLedger;
  getCameramanLedger: (cameramanId: string) => CameramanLedger;
  getSettingsOptions: (key: string, includeArchived?: boolean) => SettingsOption[];
  paymentRecords: PaymentRecord[];
  // Role-aware CRUD
  handleCreateOrSubmit: (col: ManagedCollection, data: Record<string, unknown>) => Promise<string>;
  handleUpdateOrSubmit: (col: ManagedCollection, docId: string, data: Record<string, unknown>) => Promise<void>;
  handleSoftDelete: (col: ManagedCollection, docId: string) => Promise<void>;
  handleRestore: (col: ManagedCollection, docId: string) => Promise<void>;
  handleHardDelete: (col: ManagedCollection, docId: string) => Promise<void>;
  // Shoot-specific
  handleToggleClientPayment: (shootId: string, isPaid: boolean) => Promise<void>;
  handleToggleCameramanPayment: (shootId: string, idx: number, isPaid: boolean) => Promise<void>;
  handleToggleCameramanCheckIn: (shootId: string, idx: number, checkedIn: boolean) => Promise<void>;
  // Approval
  handleApprove: (crId: string, reviewNote?: string) => Promise<void>;
  handleReject: (crId: string, reviewNote: string) => Promise<void>;
  handleEditAndResubmit: (crId: string, newData: Record<string, unknown>) => Promise<void>;
  // Settings
  handleUpdateSettings: (id: string, data: Partial<SettingsDoc>) => Promise<void>;
  // Notifications
  handleMarkRead: (notifId: string) => Promise<void>;
  handleMarkAllRead: () => Promise<void>;
  // Communication
  handleAddCommunication: (clientId: string, note: string, loggedBy: string, date: string) => Promise<string>;
  // Invoice
  handleGenerateInvoiceNumber: (shootId: string) => Promise<string>;
  handleGenerateVoucherNumber: (shootId: string, assignmentIndex: number) => Promise<string>;
  // Demo
  handleResetDemoData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [cameramen, setCameramen] = useState<Cameraman[]>([]);
  const [shoots, setShoots] = useState<Shoot[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<SettingsDoc[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<Array<{ collection: ManagedCollection; record: Client | Cameraman | Shoot | Expense }>>([]);
  const [loadCount, setLoadCount] = useState(0);
  const loading = loadCount < 5; // wait for clients, cameramen, shoots, expenses, settings

  useEffect(() => {
    if (!isSupabaseConfigured) {
      toast({
        type: 'error',
        duration: 10000,
        message: 'Operational data is unavailable until Supabase is configured. No local demo data is used.',
      });
      setLoadCount(5);
      return;
    }
    setLoadCount(0);
    const loaded = () => setLoadCount(c => c + 1);
    const unsubs = [
      subscribeToClients(d => { setClients(d); loaded(); }),
      subscribeToCameramen(d => { setCameramen(d); loaded(); }),
      subscribeToShoots(d => { setShoots(d); loaded(); }),
      subscribeToExpenses(d => { setExpenses(d); loaded(); }),
      subscribeToSettings(d => { setSettings(d); loaded(); }),
      subscribeToChangeRequests(setChangeRequests),
      subscribeToDeletedRecords(setDeletedRecords),
    ];
    return () => unsubs.forEach(u => u());
  }, [toast]);

  useEffect(() => {
    const reportUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason instanceof Error ? event.reason.message : 'An unexpected operation failed.';
      toast({ type: 'error', duration: 6000, message });
    };
    window.addEventListener('unhandledrejection', reportUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', reportUnhandledRejection);
  }, [toast]);

  // Subscribe to notifications for current user
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, setNotifications);
    return () => unsub();
  }, [user?.uid]);

  const getSettingsOptions = useCallback((key: string, includeArchived = false): SettingsOption[] => {
    const doc = settings.find(s => s.key === key);
    if (!doc) return [];
    const opts = includeArchived ? doc.options : doc.options.filter(o => !o.archived);
    return [...opts].sort((a, b) => a.order - b.order);
  }, [settings]);

  // Find the other user's ID for notifications
  const getApprovalRecipientId = useCallback(async (): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    return findUserIdByRole(canSubmitForApproval(user.role) ? 'founder' : 'admin');
  }, [user]);

  const getClientLedger = (clientId: string): ClientLedger => {
    const cs = shoots.filter(s => s.clientId === clientId);
    const totalBilled = cs.reduce((a, s) => a + (s.clientAmount || 0), 0);
    const totalPaid = cs.filter(s => s.clientPaid).reduce((a, s) => a + (s.clientAmount || 0), 0);
    return { totalBilled, totalPaid, outstanding: totalBilled - totalPaid };
  };

  const getCameramanLedger = (cameramanId: string): CameramanLedger => {
    let totalAssigned = 0, totalPaid = 0;
    shoots.forEach(s => {
      s.assignments?.forEach(a => {
        if (a.cameramanId === cameramanId) {
          totalAssigned += a.amount || 0;
          if (a.paid) totalPaid += a.amount || 0;
        }
      });
    });
    return { totalAssigned, totalPaid, outstanding: totalAssigned - totalPaid };
  };

  const operationalSettings = useMemo(() => {
    return parseOperationalSettings(settings.find(s => s.key === 'operationalSettings'));
  }, [settings]);

  const paymentRecords: PaymentRecord[] = useMemo(() => {
    const records: PaymentRecord[] = [];
    const clientMap = new Map<string, Client>(clients.map(c => [c.id, c]));
    const camMap = new Map<string, Cameraman>(cameramen.map(c => [c.id, c]));
    const graceDays = operationalSettings.paymentGraceDays;
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
      shoot.assignments?.forEach((a, idx) => {
        const cam = camMap.get(a.cameramanId);
        records.push({
          id: `out-${shoot.id}-${idx}`, type: 'outgoing', shootId: shoot.id,
          targetId: a.cameramanId, targetName: cam?.name || 'Unknown',
          phone: cam?.phone, shootDate: shoot.date, shootLocation: shoot.location,
          shootStatus: shoot.status, amount: a.amount || 0, hasAssignedRate: a.amount !== null, isPaid: a.paid,
          paidAt: a.paidAt,
          overdueInfo: checkOverdue(shoot.date, a.paid, shoot.status, graceDays),
          assignmentIndex: idx,
        });
      });
    });
    return records.sort((a, b) => new Date(b.shootDate).getTime() - new Date(a.shootDate).getTime());
  }, [shoots, clients, cameramen, operationalSettings.paymentGraceDays]);

  const dashboardStats: DashboardStats = useMemo(() => {
    let pca = 0, pcc = 0, pcma = 0, pcmc = 0, oic = 0, ooc = 0;
    paymentRecords.forEach(r => {
      if (r.type === 'incoming' && !r.isPaid) { pca += r.amount; pcc++; if (r.overdueInfo.isOverdue) oic++; }
      if (r.type === 'outgoing' && !r.isPaid) { pcma += r.amount; pcmc++; if (r.overdueInfo.isOverdue) ooc++; }
    });
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      pendingClientAmount: pca, pendingClientCount: pcc,
      pendingCameramanAmount: pcma, pendingCameramanCount: pcmc,
      totalExpenses: expenses.reduce((a, e) => a + (e.amount || 0), 0),
      upcomingShootsCount: shoots.filter(s => s.date >= todayStr).length,
      overdueIncomingCount: oic, overdueOutgoingCount: ooc,
      pendingApprovalsCount: changeRequests.filter(cr => cr.status === 'pending').length,
    };
  }, [paymentRecords, expenses, shoots, changeRequests]);

  // ── Role-aware CRUD ──

  const handleCreateOrSubmit = async (col: ManagedCollection, data: Record<string, unknown>): Promise<string> => {
    try {
      if (!user) throw new Error('Not authenticated');
      if (canCreateDirect(user.role)) {
        return await directCreate(col, data);
      }
      if (!canSubmitForApproval(user.role)) throw new Error('You do not have permission to submit this change.');
      return await submitChangeRequestWithNotification({
        targetCollection: col, targetDocId: null, action: 'create',
        proposedData: data, requestedBy: user.uid,
        requestedAt: new Date().toISOString(), status: 'pending',
        reviewedBy: null, reviewedAt: null, reviewNote: '', revisionCount: 0,
      }, await getApprovalRecipientId(), `New ${col.slice(0, -1)} submission needs review`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  const handleUpdateOrSubmit = async (col: ManagedCollection, docId: string, data: Record<string, unknown>): Promise<void> => {
    try {
      if (!user) throw new Error('Not authenticated');
      if (canCreateDirect(user.role)) {
        await directUpdate(col, docId, data);
        return;
      }
      if (!canSubmitForApproval(user.role)) throw new Error('You do not have permission to submit this change.');
      await submitChangeRequestWithNotification({
        targetCollection: col, targetDocId: docId, action: 'edit',
        proposedData: data, requestedBy: user.uid,
        requestedAt: new Date().toISOString(), status: 'pending',
        reviewedBy: null, reviewedAt: null, reviewNote: '', revisionCount: 0,
      }, await getApprovalRecipientId(), `${col.slice(0, -1)} edit needs review`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  const handleSoftDelete = async (col: ManagedCollection, docId: string) => {
    try {
      if (!user || !canDeletePerm(user.role)) throw new Error('You do not have permission to delete records.');
      await softDelete(col, docId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete record';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  const handleRestore = async (col: ManagedCollection, docId: string) => {
    try {
      if (!user || !canDeletePerm(user.role)) throw new Error('You do not have permission to restore records.');
      await restoreRecord(col, docId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to restore record';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  const handleHardDelete = async (col: ManagedCollection, docId: string) => {
    try {
      if (!user || !canDeletePerm(user.role)) throw new Error('You do not have permission to permanently delete records.');
      await hardDelete(col, docId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to permanently delete record';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  // Shoot payment toggles (direct — these aren't data-entry, they're status updates)
  const handleToggleClientPayment = async (shootId: string, isPaid: boolean) => {
    try {
      await updateShootOperationalData(shootId, { clientPaid: isPaid, clientPaidAt: isPaid ? new Date().toISOString() : null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update client payment status';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  const handleToggleCameramanPayment = async (shootId: string, idx: number, isPaid: boolean) => {
    try {
      const shoot = shoots.find(s => s.id === shootId);
      if (!shoot?.assignments?.[idx]) return;
      const updated = [...shoot.assignments];
      if (updated[idx].amount === null && isPaid) throw new Error('Set the cameraman payout before marking it paid.');
      updated[idx] = { ...updated[idx], paid: isPaid, paidAt: isPaid ? new Date().toISOString() : null };
      await updateShootOperationalData(shootId, { assignments: updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update crew payout status';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  const handleToggleCameramanCheckIn = async (shootId: string, idx: number, checkedIn: boolean) => {
    try {
      const shoot = shoots.find(s => s.id === shootId);
      if (!shoot?.assignments?.[idx]) return;
      const updated = [...shoot.assignments];
      updated[idx] = { ...updated[idx], checkedInAt: checkedIn ? new Date().toISOString() : null };
      await updateShootOperationalData(shootId, { assignments: updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update crew check-in';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  // ── Approval ──
  const handleApprove = async (crId: string, reviewNote = '') => {
    try {
      if (!user || !canApprove(user.role)) throw new Error('Not authorized to approve requests.');
      const cr = changeRequests.find(c => c.id === crId);
      if (!cr || cr.status !== 'pending') return;
      await reviewChangeRequestWithNotification(cr, user.uid, 'approved', reviewNote);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to approve request';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  const handleReject = async (crId: string, reviewNote: string) => {
    try {
      if (!user || !canApprove(user.role)) throw new Error('Not authorized to reject requests.');
      const cr = changeRequests.find(c => c.id === crId);
      if (!cr || cr.status !== 'pending') return;
      await reviewChangeRequestWithNotification(cr, user.uid, 'rejected', reviewNote);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reject request';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  const handleEditAndResubmit = async (crId: string, newData: Record<string, unknown>) => {
    try {
      if (!user || !canSubmitForApproval(user.role)) throw new Error('Not authorized to resubmit.');
      const cr = changeRequests.find(c => c.id === crId);
      if (!cr || cr.requestedBy !== user.uid || (cr.status !== 'pending' && cr.status !== 'rejected')) return;
      await resubmitChangeRequestWithNotification(crId, {
        proposedData: newData, status: 'pending',
        reviewedBy: null, reviewedAt: null, reviewNote: '',
        revisionCount: cr.revisionCount + 1,
        requestedAt: new Date().toISOString(),
      }, await getApprovalRecipientId(), `${cr.targetCollection.slice(0, -1)} resubmitted for review`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resubmit request';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  const handleUpdateSettings = async (id: string, data: Partial<SettingsDoc>) => {
    try {
      if (id === 'businessProfile' && user?.role !== 'founder') {
        throw new Error('Only the Founder has permission to edit company invoice profile settings.');
      }
      await updateSettingsDoc(id, data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update settings';
      toast({ type: 'error', message: msg });
      throw err;
    }
  };

  const handleMarkRead = async (notifId: string) => { await markNotificationRead(notifId); };
  const handleMarkAllRead = async () => { if (user) await markAllNotificationsRead(user.uid); };

  const handleAddCommunication = async (clientId: string, note: string, loggedBy: string, date: string) => {
    return await addCommunicationLog(clientId, { date, note, loggedBy });
  };

  const handleGenerateInvoiceNumber = async (shootId: string): Promise<string> => {
    const shoot = shoots.find(s => s.id === shootId);
    if (shoot?.clientInvoiceNumber) return shoot.clientInvoiceNumber;
    if (!shoot?.clientPaid) throw new Error('Mark the client payment as paid before generating an invoice.');
    const num = await requestInvoiceNumber('client', shootId);
    return num;
  };

  const handleGenerateVoucherNumber = async (shootId: string, assignmentIndex: number): Promise<string> => {
    const shoot = shoots.find(s => s.id === shootId);
    if (!shoot?.assignments?.[assignmentIndex]) return '';
    if (shoot.assignments[assignmentIndex].payoutVoucherNumber) return shoot.assignments[assignmentIndex].payoutVoucherNumber!;
    if (!shoot.assignments[assignmentIndex].paid) throw new Error('Mark the payout as paid before generating a voucher.');
    const num = await requestInvoiceNumber('payout', shootId, assignmentIndex);
    return num;
  };

  const handleResetDemoData = () => {
    try { resetToSeedData(); }
    catch (error) { toast({ type: 'info', message: error instanceof Error ? error.message : 'Demo data is unavailable.' }); }
  };

  return (
    <DataContext.Provider value={{
      clients, cameramen, shoots, expenses, settings, changeRequests, notifications, deletedRecords,
      loading, dashboardStats, getClientLedger, getCameramanLedger, getSettingsOptions, paymentRecords,
      handleCreateOrSubmit, handleUpdateOrSubmit, handleSoftDelete, handleRestore, handleHardDelete,
      handleToggleClientPayment, handleToggleCameramanPayment,
      handleToggleCameramanCheckIn,
      handleApprove, handleReject, handleEditAndResubmit,
      handleUpdateSettings, handleMarkRead, handleMarkAllRead,
      handleAddCommunication, handleGenerateInvoiceNumber, handleGenerateVoucherNumber,
      handleResetDemoData,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
