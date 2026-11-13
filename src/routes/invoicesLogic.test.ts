import { describe, expect, it } from 'vitest';
import { Cameraman, Client, Shoot } from '../types';
import { buildInvoiceList, filterInvoiceItems } from './invoicesLogic';

const shoots: Shoot[] = [
  {
    id: 'older', clientId: 'client-1', date: '2026-10-10', callTime: '09:00', location: 'Studio A',
    status: 'done', clientAmount: 500, clientPaid: true, clientInvoiceNumber: 'INV-001',
    assignedCameramanIds: ['cam-1'],
    assignments: [{ cameramanId: 'cam-1', amount: 150, paid: true, payoutVoucherNumber: 'RCP-001' }],
    deliverables: [], createdAt: '', deletedAt: null, deletedBy: null,
  },
  {
    id: 'newer', clientId: 'missing-client', date: '2026-11-10', callTime: '10:00', location: 'Studio B',
    status: 'scheduled', clientAmount: 700, clientPaid: false,
    assignedCameramanIds: ['missing-cam'],
    assignments: [{ cameramanId: 'missing-cam', amount: null, paid: false }],
    deliverables: [], createdAt: '', deletedAt: null, deletedBy: null,
  },
];

const clients = new Map<string, Client>([
  ['client-1', {
    id: 'client-1', name: 'Acme', phone: '', email: '', notes: '', status: 'active',
    contractLink: '', createdAt: '', deletedAt: null, deletedBy: null,
  }],
]);

const cameramen = new Map<string, Cameraman>([
  ['cam-1', {
    id: 'cam-1', name: 'Crew One', phone: '', rate: 0, notes: '', contractLink: '',
    unavailability: [], createdAt: '', deletedAt: null, deletedBy: null,
  }],
]);

describe('Invoices route logic', () => {
  it('builds client invoices and crew vouchers newest-first with existing fallback values', () => {
    const items = buildInvoiceList(shoots, clients, cameramen);

    expect(items.map(({ id, type, recipientName, amount, docNumber }) => ({
      id, type, recipientName, amount, docNumber,
    }))).toEqual([
      { id: 'inv-newer', type: 'client_invoice', recipientName: 'Unknown Client', amount: 700, docNumber: 'Not issued' },
      { id: 'rcp-newer-missing-cam-0', type: 'cameraman_receipt', recipientName: 'Crew Member', amount: 0, docNumber: 'Not issued' },
      { id: 'inv-older', type: 'client_invoice', recipientName: 'Acme', amount: 500, docNumber: 'INV-001' },
      { id: 'rcp-older-cam-1-0', type: 'cameraman_receipt', recipientName: 'Crew One', amount: 150, docNumber: 'RCP-001' },
    ]);
  });

  it('filters by document kind, payment status, and searchable fields', () => {
    const items = buildInvoiceList(shoots, clients, cameramen);

    expect(filterInvoiceItems(items, 'client_invoice', 'pending', '')).toEqual([items[0]]);
    expect(filterInvoiceItems(items, 'all', 'paid', '')).toEqual(items.slice(2));
    expect(filterInvoiceItems(items, 'all', 'all', 'Crew One')).toEqual([items[3]]);
    expect(filterInvoiceItems(items, 'all', 'all', 'Studio B')).toEqual(items.slice(0, 2));
  });
});
