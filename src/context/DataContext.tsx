import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Client, Cameraman, Shoot, Expense, ClientLedger, CameramanLedger,
  PaymentRecord, SettingsDoc, ChangeRequest, AppNotification, SettingsOption, ManagedCollection,
} from '../types';
import {
  subscribeToClients, subscribeToCameramen, subscribeToShoots, subscribeToExpenses,
  subscribeToSettings, updateSettingsDoc, subscribeToChangeRequests,
  subscribeToNotifications, subscribeToDeletedRecords,
  markNotificationRead, markAllNotificationsRead,
  addCommunicationLog, resetToSeedData, requestInvoiceNumber, findUserIdByRole,
} from '../supabase/data';
import { isSupabaseConfigured } from '../supabase/config';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { parseOperationalSettings } from '../config/business';
import { canCreateDirect, canSubmitForApproval, canEditBusinessProfile } from '../utils/permissions';
import {
  buildCameramanLedgerMap,
  buildClientLedgerMap,
  buildDashboardStats,
  buildPaymentRecords,
  getSettingsOptions as selectSettingsOptions,
} from './dataSelectors';
import { createDataCrudActions } from './dataCrudActions';
import { createShootActions } from './shootActions';
import { createApprovalActions } from './approvalActions';

interface DashboardStats {
  pendingClientAmount: number;
  pendingClientCount: number;
  pendingCameramanAmount: number;
  pendingCameramanCount: number;
  paidCameramanAmount: number;
  paidCameramanCount: number;
  paidClientAmount: number;
  paidClientCount: number;
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
  handleSetCameramanRate: (shootId: string, idx: number, amount: number) => Promise<void>;
  handleToggleCameramanCheckIn: (shootId: string, idx: number, checkedIn: boolean) => Promise<void>;
  handleApprove: (crId: string, reviewNote?: string) => Promise<void>;
  handleReject: (crId: string, reviewNote: string) => Promise<void>;
  handleEditAndResubmit: (crId: string, newData: Record<string, unknown>) => Promise<void>;
  handleDeleteChangeRequest: (crId: string) => Promise<void>;
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
    if (!user) {
      setClients([]);
      setCameramen([]);
      setShoots([]);
      setExpenses([]);
      setSettings([]);
      setChangeRequests([]);
      setNotifications([]);
      setDeletedRecords([]);
      setLoadCount(5);
      return;
    }
    if (!isSupabaseConfigured) {
      toast({
        type: 'error',
        duration: 10000,
        message: 'Operational data is unavailable until the database connection is configured.',
      });
      setLoadCount(5);
      return;
    }
    setLoadCount(0);
    const loaded = () => setLoadCount(c => c + 1);
    const canAccessFinance = user.role === 'admin' || canCreateDirect(user.role);
    const unsubs = [
      subscribeToClients(d => { setClients(d); loaded(); }),
      subscribeToCameramen(d => { setCameramen(d); loaded(); }),
      subscribeToShoots(d => { setShoots(d); loaded(); }),
      subscribeToSettings(d => { setSettings(d); loaded(); }),
      subscribeToChangeRequests(setChangeRequests),
    ];
    if (canAccessFinance) {
      unsubs.push(subscribeToExpenses(d => { setExpenses(d); loaded(); }));
      unsubs.push(subscribeToDeletedRecords(setDeletedRecords));
    } else {
      setExpenses([]);
      setDeletedRecords([]);
      loaded();
    }
    return () => unsubs.forEach(u => u());
  }, [toast, user?.uid]);

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

  const getSettingsOptions = useCallback((key: string, includeArchived = false): SettingsOption[] => (
    selectSettingsOptions(settings, key, includeArchived)
  ), [settings]);

  // Find the other user's ID for notifications
  const getApprovalRecipientId = useCallback(async (): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    return findUserIdByRole(canSubmitForApproval(user.role) ? 'founder' : 'admin');
  }, [user]);

  const clientLedgerMap = useMemo(() => buildClientLedgerMap(shoots), [shoots]);
  const cameramanLedgerMap = useMemo(() => buildCameramanLedgerMap(shoots), [shoots]);

  const getClientLedger = useCallback((clientId: string): ClientLedger => {
    return clientLedgerMap.get(clientId) || { totalBilled: 0, totalPaid: 0, outstanding: 0 };
  }, [clientLedgerMap]);

  const getCameramanLedger = useCallback((cameramanId: string): CameramanLedger => {
    return cameramanLedgerMap.get(cameramanId) || { totalAssigned: 0, totalPaid: 0, outstanding: 0 };
  }, [cameramanLedgerMap]);

  const operationalSettings = useMemo(() => {
    return parseOperationalSettings(settings.find(s => s.key === 'operationalSettings'));
  }, [settings]);

  const paymentRecords: PaymentRecord[] = useMemo(
    () => buildPaymentRecords(shoots, clients, cameramen, operationalSettings.paymentGraceDays),
    [shoots, clients, cameramen, operationalSettings.paymentGraceDays],
  );

  const dashboardStats: DashboardStats = useMemo(
    () => buildDashboardStats(paymentRecords, expenses, shoots, changeRequests),
    [paymentRecords, expenses, shoots, changeRequests],
  );

  const crudActions = createDataCrudActions({
    user, toast, changeRequests, setChangeRequests, setClients, setCameramen, setShoots, setExpenses,
    setDeletedRecords, getApprovalRecipientId,
  });
  const {
    handleCreateOrSubmit,
    handleUpdateOrSubmit,
    handleSoftDelete,
    handleRestore,
    handleHardDelete,
  } = crudActions;

  const shootActions = createShootActions({ shoots, user, toast, handleUpdateOrSubmit });
  const {
    handleToggleClientPayment,
    handleToggleCameramanPayment,
    handleSetCameramanRate,
    handleToggleCameramanCheckIn,
  } = shootActions;

  const approvalActions = createApprovalActions({
    user,
    toast,
    changeRequests,
    clients,
    cameramen,
    settings,
    setChangeRequests,
    setClients,
    setCameramen,
    setShoots,
    setExpenses,
    getApprovalRecipientId,
  });
  const {
    handleApprove,
    handleReject,
    handleEditAndResubmit,
    handleDeleteChangeRequest,
  } = approvalActions;

  const handleUpdateSettings = async (id: string, data: Partial<SettingsDoc>) => {
    try {
      if (id === 'businessProfile' && (!user || !canEditBusinessProfile(user.role))) {
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
      handleToggleClientPayment, handleToggleCameramanPayment, handleSetCameramanRate,
      handleToggleCameramanCheckIn,
      handleApprove, handleReject, handleEditAndResubmit, handleDeleteChangeRequest,
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
