import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { dataContext, authState, toast, whatsappMocks } = vi.hoisted(() => ({
  dataContext: {
    shoots: [],
    clients: [] as unknown[],
    cameramen: [] as unknown[],
    settings: [] as unknown[],
    handleCreateOrSubmit: vi.fn(),
    handleUpdateOrSubmit: vi.fn(),
    handleEditAndResubmit: vi.fn(),
    getSettingsOptions: vi.fn(),
  },
  authState: { user: { uid: 'founder-1', role: 'founder' } },
  toast: vi.fn(),
  whatsappMocks: {
    buildShootScheduleWhatsAppDrafts: vi.fn(() => []),
    prepareWhatsAppDraftTabs: vi.fn((): Array<{ recipient: string; url: string; tab: Window | null }> => []),
    completeWhatsAppDraftTabs: vi.fn(() => []),
    cancelWhatsAppDraftTabs: vi.fn(),
  },
}));

vi.mock('../../context/DataContext', () => ({ useData: () => dataContext }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('../../utils/whatsapp', () => whatsappMocks);
vi.mock('../common/SlideOver', () => ({
  SlideOver: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) => (
    isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null
  ),
}));
vi.mock('./AssignmentEditor', () => ({ AssignmentEditor: () => null }));
vi.mock('./DeliverablesEditor', () => ({ DeliverablesEditor: () => null }));

import { Client } from '../../types';
import { ShootForm } from './ShootForm';

const client: Client = {
  id: 'client-1', name: 'Client One', phone: '123', email: '', notes: '', status: 'active',
  contractLink: '', createdAt: '', deletedAt: null, deletedBy: null,
};

describe('ShootForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = { uid: 'founder-1', role: 'founder' };
    dataContext.shoots = [];
    dataContext.clients = [client];
    dataContext.cameramen = [];
    dataContext.settings = [];
    dataContext.handleCreateOrSubmit.mockResolvedValue('shoot-new');
    dataContext.handleUpdateOrSubmit.mockResolvedValue(undefined);
    dataContext.handleEditAndResubmit.mockResolvedValue(undefined);
    dataContext.getSettingsOptions.mockReturnValue([{ value: 'scheduled', order: 1, archived: false }]);
  });

  afterEach(() => cleanup());

  it('creates a new shoot and prepares scheduling drafts for a direct-write role', async () => {
    const onClose = vi.fn();
    render(<ShootForm isOpen onClose={onClose} />);

    await waitFor(() => expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe(client.id));
    fireEvent.change(screen.getByPlaceholderText('e.g. Olive Studio, Bandra'), { target: { value: ' Studio A ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Shoot' }));

    await waitFor(() => expect(dataContext.handleCreateOrSubmit).toHaveBeenCalledWith(
      'shoots',
      expect.objectContaining({
        clientId: client.id,
        location: 'Studio A',
        status: 'scheduled',
        clientPaid: false,
        clientInvoiceNumber: null,
      }),
    ));
    expect(whatsappMocks.buildShootScheduleWhatsAppDrafts).toHaveBeenCalled();
    expect(whatsappMocks.prepareWhatsAppDraftTabs).toHaveBeenCalledWith([]);
    expect(whatsappMocks.completeWhatsAppDraftTabs).toHaveBeenCalledWith([]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancels any prepared drafts and keeps the form open when saving fails', async () => {
    const onClose = vi.fn();
    dataContext.handleCreateOrSubmit.mockRejectedValueOnce(new Error('Save failed'));
    whatsappMocks.prepareWhatsAppDraftTabs.mockReturnValueOnce([{ recipient: 'Client One', url: '', tab: null }]);
    render(<ShootForm isOpen onClose={onClose} />);

    await waitFor(() => expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe(client.id));
    fireEvent.change(screen.getByPlaceholderText('e.g. Olive Studio, Bandra'), { target: { value: 'Studio A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Shoot' }));

    expect(await screen.findByText('Failed to save shoot details. Try again.')).toBeTruthy();
    expect(whatsappMocks.cancelWhatsAppDraftTabs).toHaveBeenCalledWith([
      { recipient: 'Client One', url: '', tab: null },
    ]);
    expect(onClose).not.toHaveBeenCalled();
  });
});
