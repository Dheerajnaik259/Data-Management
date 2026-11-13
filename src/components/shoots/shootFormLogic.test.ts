import { describe, expect, it, vi } from 'vitest';
import { ChangeRequest, Client, Shoot } from '../../types';
import {
  getInitialShootFormValues,
  shouldOpenScheduleWhatsApp,
  submitShootForm,
  validateShootForm,
} from './shootFormLogic';

const client: Client = {
  id: 'client-1', name: 'Client One', phone: '123', email: '', notes: '', status: 'active',
  contractLink: '', createdAt: '', deletedAt: null, deletedBy: null,
};

const shoot: Shoot = {
  id: 'shoot-1', clientId: client.id, date: '2026-11-15', callTime: '09:00',
  location: 'Studio A', status: 'scheduled', clientAmount: 100, clientPaid: false,
  assignedCameramanIds: [], assignments: [], deliverables: [], createdAt: '',
  deletedAt: null, deletedBy: null,
};

const request: ChangeRequest = {
  id: 'request-1', targetCollection: 'shoots', targetDocId: shoot.id, action: 'edit',
  proposedData: { location: 'Studio B', client_amount: 250 }, requestedBy: 'user-1',
  requestedAt: '', status: 'rejected', reviewedBy: null, reviewedAt: null,
  reviewNote: '', revisionCount: 0,
};

describe('ShootForm logic', () => {
  it('initializes new and resubmitted shoots with the existing fallback precedence', () => {
    const newValues = getInitialShootFormValues({
      shoots: [], clients: [client], defaultStatus: 'scheduled',
    });
    expect(newValues).toMatchObject({
      clientId: client.id,
      date: new Date().toISOString().split('T')[0],
      status: 'scheduled',
      assignments: [],
      deliverables: [],
    });

    const resubmissionValues = getInitialShootFormValues({
      resubmission: request,
      shoots: [shoot],
      clients: [client],
      defaultStatus: 'scheduled',
    });
    expect(resubmissionValues).toMatchObject({
      clientId: client.id,
      date: shoot.date,
      location: 'Studio B',
      callTime: shoot.callTime,
      clientAmount: 250,
      status: shoot.status,
    });
  });

  it('validates required fields, non-negative amounts, HTTPS links, and crew call times', () => {
    const values = {
      clientId: client.id, date: shoot.date, callTime: '', location: 'Studio A',
      status: 'scheduled', clientAmount: 0, assignments: [], deliverables: [],
    };

    expect(validateShootForm({ ...values, clientId: '' })).toBe('Please select a client.');
    expect(validateShootForm({ ...values, location: '  ' })).toBe('Location is required.');
    expect(validateShootForm({ ...values, date: '' })).toBe('Date is required.');
    expect(validateShootForm({ ...values, clientAmount: -1 })).toBe('Client amount must be non-negative.');
    expect(validateShootForm({
      ...values,
      deliverables: [{ type: 'reel', count: 1, fileLink: 'http://example.com' }],
    })).toBe('Deliverable links must use HTTPS.');
    expect(validateShootForm({
      ...values,
      assignments: [{ cameramanId: 'cam-1', amount: 50, paid: false, callTime: null }],
    })).toContain('call time');
  });

  it('only opens scheduling drafts for a new scheduled shoot created by a direct-write role', () => {
    expect(shouldOpenScheduleWhatsApp(null, null, 'scheduled', 'founder')).toBe(true);
    expect(shouldOpenScheduleWhatsApp(null, null, 'Scheduled', 'admin')).toBe(false);
    expect(shouldOpenScheduleWhatsApp(shoot, null, 'scheduled', 'founder')).toBe(false);
    expect(shouldOpenScheduleWhatsApp(null, request, 'scheduled', 'founder')).toBe(false);
  });

  it('routes create, update, and resubmission through their matching context actions', async () => {
    const handlers = {
      handleCreateOrSubmit: vi.fn().mockResolvedValue('new-shoot'),
      handleUpdateOrSubmit: vi.fn().mockResolvedValue(undefined),
      handleEditAndResubmit: vi.fn().mockResolvedValue(undefined),
    };
    const values = {
      clientId: client.id, date: shoot.date, callTime: ' 09:00 ', location: ' Studio A ',
      status: 'scheduled', clientAmount: 100, assignments: [], deliverables: [],
    };

    await submitShootForm({ values, handlers });
    expect(handlers.handleCreateOrSubmit).toHaveBeenCalledWith('shoots', expect.objectContaining({
      callTime: '09:00', location: 'Studio A', clientPaid: false, clientInvoiceNumber: null,
    }));

    await submitShootForm({ initialShoot: shoot, values, handlers });
    expect(handlers.handleUpdateOrSubmit).toHaveBeenCalledWith('shoots', shoot.id, expect.not.objectContaining({
      clientPaid: false,
    }));

    await submitShootForm({ resubmission: request, values, handlers });
    expect(handlers.handleEditAndResubmit).toHaveBeenCalledWith(request.id, expect.not.objectContaining({
      clientInvoiceNumber: null,
    }));
    expect(handlers.handleCreateOrSubmit).toHaveBeenCalledTimes(1);
  });
});
