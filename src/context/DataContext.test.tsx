import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { dataMocks, whatsappMocks, authState, toast } = vi.hoisted(() => ({
  dataMocks: {
    subscribeToClients: vi.fn(),
    subscribeToCameramen: vi.fn(),
    subscribeToShoots: vi.fn(),
    subscribeToExpenses: vi.fn(),
    subscribeToSettings: vi.fn(),
    subscribeToChangeRequests: vi.fn(),
    subscribeToNotifications: vi.fn(),
    subscribeToDeletedRecords: vi.fn(),
    updateSettingsDoc: vi.fn(),
    fetchClients: vi.fn(),
    fetchCameramen: vi.fn(),
    fetchShoots: vi.fn(),
    fetchExpenses: vi.fn(),
    fetchChangeRequests: vi.fn(),
    fetchDeletedRecords: vi.fn(),
    directCreate: vi.fn(),
    directUpdate: vi.fn(),
    softDelete: vi.fn(),
    restoreRecord: vi.fn(),
    hardDelete: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    addCommunicationLog: vi.fn(),
    resetToSeedData: vi.fn(),
    requestInvoiceNumber: vi.fn(),
    findUserIdByRole: vi.fn(),
    submitChangeRequestWithNotification: vi.fn(),
    resubmitChangeRequestWithNotification: vi.fn(),
    reviewChangeRequestWithNotification: vi.fn(),
    deleteChangeRequest: vi.fn(),
    updateShootOperationalData: vi.fn(),
  },
  whatsappMocks: {
    buildShootScheduleWhatsAppDrafts: vi.fn(),
    prepareWhatsAppDraftTabs: vi.fn(),
    completeWhatsAppDraftTabs: vi.fn(),
    cancelWhatsAppDraftTabs: vi.fn(),
  },
  authState: { user: { uid: 'admin-1', role: 'admin' } as { uid: string; role: string } | null },
  toast: vi.fn(),
}));

vi.mock('../supabase/data', () => dataMocks);
vi.mock('../supabase/config', () => ({ isSupabaseConfigured: true }));
vi.mock('../utils/whatsapp', () => whatsappMocks);
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: authState.user }) }));
vi.mock('./ToastContext', () => ({ useToast: () => ({ toast }) }));

import { DataProvider, useData } from './DataContext';
import { ChangeRequest, Client, Cameraman, Expense, Shoot } from '../types';

let changeRequests: ChangeRequest[] = [];

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

const expenses: Expense[] = [{
  id: 'expense-1', description: 'Travel', amount: 30, date: '2099-12-01', category: 'travel',
  createdAt: '', deletedAt: null, deletedBy: null,
}];

function ContextProbe() {
  const data = useData();
  return (
    <>
      <output data-testid="snapshot">{JSON.stringify({
        loading: data.loading,
        paymentCount: data.paymentRecords.length,
        clientLedger: data.getClientLedger(client.id),
        cameramanLedger: data.getCameramanLedger(cameraman.id),
        dashboardStats: data.dashboardStats,
      })}</output>
      <button type="button" onClick={() => void data.handleToggleClientPayment('shoot-1', true)}>Mark paid</button>
      <button type="button" onClick={() => void data.handleApprove('cr-1')}>Approve shoot</button>
    </>
  );
}

describe('DataProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    changeRequests = [];
    authState.user = { uid: 'admin-1', role: 'admin' };
    window.confirm = vi.fn(() => true);
    whatsappMocks.buildShootScheduleWhatsAppDrafts.mockReturnValue([{ recipient: 'Crew One' }]);
    whatsappMocks.prepareWhatsAppDraftTabs.mockReturnValue(['tab-1']);
    whatsappMocks.completeWhatsAppDraftTabs.mockReturnValue(['Crew One']);

    dataMocks.subscribeToClients.mockImplementation((callback: (items: Client[]) => void) => {
      callback([client]);
      return vi.fn();
    });
    dataMocks.subscribeToCameramen.mockImplementation((callback: (items: Cameraman[]) => void) => {
      callback([cameraman]);
      return vi.fn();
    });
    dataMocks.subscribeToShoots.mockImplementation((callback: (items: Shoot[]) => void) => {
      callback(shoots);
      return vi.fn();
    });
    dataMocks.subscribeToExpenses.mockImplementation((callback: (items: Expense[]) => void) => {
      callback(expenses);
      return vi.fn();
    });
    dataMocks.subscribeToSettings.mockImplementation((callback: (items: never[]) => void) => {
      callback([]);
      return vi.fn();
    });
    dataMocks.subscribeToChangeRequests.mockImplementation((callback: (items: never[]) => void) => {
      callback(changeRequests as never[]);
      return vi.fn();
    });
    dataMocks.subscribeToNotifications.mockImplementation((_userId: string, callback: (items: never[]) => void) => {
      callback([]);
      return vi.fn();
    });
    dataMocks.subscribeToDeletedRecords.mockImplementation((callback: (items: never[]) => void) => {
      callback([]);
      return vi.fn();
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('subscribes to operational data and exposes consistent derived ledgers and totals', async () => {
    render(<DataProvider><ContextProbe /></DataProvider>);

    await waitFor(() => {
      const snapshot = JSON.parse(screen.getByTestId('snapshot').textContent || '{}');
      expect(snapshot.loading).toBe(false);
      expect(snapshot.paymentCount).toBe(4);
    });

    const snapshot = JSON.parse(screen.getByTestId('snapshot').textContent || '{}');
    expect(snapshot.clientLedger).toEqual({ totalBilled: 300, totalPaid: 200, outstanding: 100 });
    expect(snapshot.cameramanLedger).toEqual({ totalAssigned: 130, totalPaid: 80, outstanding: 50 });
    expect(snapshot.dashboardStats).toMatchObject({
      pendingClientAmount: 100,
      pendingCameramanAmount: 50,
      paidClientAmount: 200,
      paidCameramanAmount: 80,
      totalExpenses: 30,
      upcomingShootsCount: 2,
    });
    expect(dataMocks.subscribeToExpenses).toHaveBeenCalledTimes(1);
    expect(dataMocks.subscribeToDeletedRecords).toHaveBeenCalledTimes(1);
  });

  it('confirms and persists a client payment through the public context action', async () => {
    render(<DataProvider><ContextProbe /></DataProvider>);

    await waitFor(() => expect(JSON.parse(screen.getByTestId('snapshot').textContent || '{}').loading).toBe(false));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark paid' }));
    });

    expect(window.confirm).toHaveBeenCalledWith('Mark this client payment as paid? This is final and cannot be changed back to pending.');
    expect(dataMocks.updateShootOperationalData).toHaveBeenCalledWith('shoot-1', expect.objectContaining({
      clientPaid: true,
      clientPaidAt: expect.any(String),
    }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('prepares schedule drafts before approval and reports blocked recipients', async () => {
    changeRequests = [{
      id: 'cr-1',
      targetCollection: 'shoots',
      targetDocId: null,
      action: 'create',
      proposedData: {
        clientId: client.id,
        date: '2099-12-03',
        callTime: '09:00',
        location: 'Studio C',
        status: 'scheduled',
        assignments: [{ cameramanId: cameraman.id, callTime: '08:30' }],
      },
      requestedBy: 'creator-1',
      requestedAt: '2099-01-01',
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: '',
      revisionCount: 0,
    }];
    dataMocks.fetchChangeRequests.mockResolvedValue([]);
    dataMocks.fetchClients.mockResolvedValue([client]);
    dataMocks.fetchCameramen.mockResolvedValue([cameraman]);
    dataMocks.fetchShoots.mockResolvedValue(shoots);
    dataMocks.fetchExpenses.mockResolvedValue(expenses);

    render(<DataProvider><ContextProbe /></DataProvider>);
    await waitFor(() => expect(JSON.parse(screen.getByTestId('snapshot').textContent || '{}').loading).toBe(false));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Approve shoot' }));
    });

    expect(whatsappMocks.buildShootScheduleWhatsAppDrafts).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: client.id, location: 'Studio C' }),
      client,
      [cameraman],
      expect.any(String),
    );
    expect(whatsappMocks.prepareWhatsAppDraftTabs).toHaveBeenCalled();
    expect(dataMocks.reviewChangeRequestWithNotification).toHaveBeenCalledWith('cr-1', 'approved', '');
    expect(whatsappMocks.completeWhatsAppDraftTabs).toHaveBeenCalledWith(['tab-1']);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      type: 'warning',
      message: expect.stringContaining('Crew One'),
    }));
  });
});
