import { Cameraman, Client, Shoot } from '../types';

export type InvoiceType = 'client_invoice' | 'cameraman_receipt';
export type InvoiceTypeFilter = 'all' | InvoiceType;
export type InvoiceStatusFilter = 'all' | 'paid' | 'pending';

export interface InvoiceListItem {
  id: string;
  type: InvoiceType;
  docNumber: string;
  recipientName: string;
  targetId: string;
  shoot: Shoot;
  shootDate: string;
  shootLocation: string;
  amount: number;
  isPaid: boolean;
  paidAt?: string | null;
  assignmentIndex?: number;
}

export function buildInvoiceList(
  shoots: Shoot[],
  clientMap: Map<string, Client>,
  cameramanMap: Map<string, Cameraman>,
): InvoiceListItem[] {
  const list: InvoiceListItem[] = [];

  shoots.forEach(shoot => {
    const client = clientMap.get(shoot.clientId);
    list.push({
      id: `inv-${shoot.id}`,
      type: 'client_invoice',
      docNumber: shoot.clientInvoiceNumber || 'Not issued',
      recipientName: client ? client.name : 'Unknown Client',
      targetId: shoot.clientId,
      shoot,
      shootDate: shoot.date,
      shootLocation: shoot.location,
      amount: shoot.clientAmount,
      isPaid: shoot.clientPaid,
      paidAt: shoot.clientPaidAt,
    });

    if (shoot.assignments && shoot.assignments.length) {
      shoot.assignments.forEach((assignment, index) => {
        const cameraman = cameramanMap.get(assignment.cameramanId);
        list.push({
          id: `rcp-${shoot.id}-${assignment.cameramanId}-${index}`,
          type: 'cameraman_receipt',
          docNumber: assignment.payoutVoucherNumber || 'Not issued',
          recipientName: cameraman ? cameraman.name : 'Crew Member',
          targetId: assignment.cameramanId,
          shoot,
          shootDate: shoot.date,
          shootLocation: shoot.location,
          amount: assignment.amount || 0,
          isPaid: assignment.paid,
          paidAt: assignment.paidAt,
          assignmentIndex: index,
        });
      });
    }
  });

  list.sort((a, b) => new Date(b.shootDate).getTime() - new Date(a.shootDate).getTime());
  return list;
}

export function filterInvoiceItems(
  items: InvoiceListItem[],
  typeFilter: InvoiceTypeFilter,
  statusFilter: InvoiceStatusFilter,
  searchQuery: string,
): InvoiceListItem[] {
  return items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (statusFilter === 'paid' && !item.isPaid) return false;
    if (statusFilter === 'pending' && item.isPaid) return false;
    return item.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.shootLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.shootDate.includes(searchQuery);
  });
}
