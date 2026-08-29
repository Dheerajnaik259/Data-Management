import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { Shoot, Client, Cameraman } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { InvoicePreviewModal } from '../components/invoices/InvoicePreviewModal';
import { generateClientInvoicePDF, generateCameramanPayoutReceiptPDF } from '../utils/pdfGenerator';
import { EmptyState } from '../components/common/EmptyState';
import { FileText, Download, Printer, Calendar, CheckCircle2, Clock } from 'lucide-react';

interface InvoiceListItem {
  id: string;
  type: 'client_invoice' | 'cameraman_receipt';
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

export const Invoices: React.FC = () => {
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { shoots, clients, cameramen } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'client_invoice' | 'cameraman_receipt'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const [activeModalItem, setActiveModalItem] = useState<InvoiceListItem | null>(null);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const cameramanMap = useMemo(() => new Map(cameramen.map(c => [c.id, c])), [cameramen]);

  const allDocItems: InvoiceListItem[] = useMemo(() => {
    const list: InvoiceListItem[] = [];
    shoots.forEach(shoot => {
      const client = clientMap.get(shoot.clientId);
      const clientName = client ? client.name : 'Unknown Client';
      const invNumber = `INV-${shoot.date.replace(/-/g, '')}-${shoot.id.slice(0, 4).toUpperCase()}`;

      list.push({
        id: `inv-${shoot.id}`, type: 'client_invoice', docNumber: invNumber, recipientName: clientName, targetId: shoot.clientId, shoot, shootDate: shoot.date, shootLocation: shoot.location, amount: shoot.clientAmount, isPaid: shoot.clientPaid, paidAt: shoot.clientPaidAt,
      });

      if (shoot.assignments && shoot.assignments.length) {
        shoot.assignments.forEach((assignment, index) => {
          const cam = cameramanMap.get(assignment.cameramanId);
          const camName = cam ? cam.name : 'Crew Member';
          const receiptNumber = `RCP-${shoot.date.replace(/-/g, '')}-${assignment.cameramanId.slice(0, 4).toUpperCase()}`;

          list.push({
            id: `rcp-${shoot.id}-${assignment.cameramanId}-${index}`, type: 'cameraman_receipt', docNumber: receiptNumber, recipientName: camName, targetId: assignment.cameramanId, shoot, shootDate: shoot.date, shootLocation: shoot.location, amount: assignment.amount || 0, isPaid: assignment.paid, paidAt: assignment.paidAt, assignmentIndex: index,
          });
        });
      }
    });

    list.sort((a, b) => new Date(b.shootDate).getTime() - new Date(a.shootDate).getTime());
    return list;
  }, [shoots, clientMap, cameramanMap]);

  const filteredItems = useMemo(() => {
    return allDocItems.filter(item => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (statusFilter === 'paid' && !item.isPaid) return false;
      if (statusFilter === 'pending' && item.isPaid) return false;
      return item.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) || item.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) || item.shootLocation.toLowerCase().includes(searchQuery.toLowerCase()) || item.shootDate.includes(searchQuery);
    });
  }, [allDocItems, typeFilter, statusFilter, searchQuery]);

  const handleDownload = (item: InvoiceListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'client_invoice') {
      const client = clientMap.get(item.targetId);
      if (client) {
        const doc = generateClientInvoicePDF(client, item.shoot);
        doc.save(`${item.docNumber}_${client.name.replace(/\s+/g, '_')}.pdf`);
      }
    } else {
      const cam = cameramanMap.get(item.targetId);
      if (cam) {
        const doc = generateCameramanPayoutReceiptPDF(cam, item.shoot, item.amount, item.isPaid, item.paidAt);
        doc.save(`${item.docNumber}_${cam.name.replace(/\s+/g, '_')}.pdf`);
      }
    }
  };

  const handlePrint = (item: InvoiceListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'client_invoice') {
      const client = clientMap.get(item.targetId);
      if (client) {
        const doc = generateClientInvoicePDF(client, item.shoot);
        doc.autoPrint(); window.open(doc.output('bloburl'), '_blank');
      }
    } else {
      const cam = cameramanMap.get(item.targetId);
      if (cam) {
        const doc = generateCameramanPayoutReceiptPDF(cam, item.shoot, item.amount, item.isPaid, item.paidAt);
        doc.autoPrint(); window.open(doc.output('bloburl'), '_blank');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header title="Invoices & Payout Vouchers" subtitle="Generate and download branded PDF invoices for clients and disbursement vouchers for cameramen" searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Search by invoice #, client, cameraman, location..." onOpenMobile={onOpenMobileNav} />
      <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-[var(--color-bg)] p-1 rounded-md border border-[var(--color-border)] text-xs">
            <button type="button" onClick={() => setTypeFilter('all')} className={`px-3 py-1.5 rounded font-medium transition-colors ${typeFilter === 'all' ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-2xs' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>All Documents ({allDocItems.length})</button>
            <button type="button" onClick={() => setTypeFilter('client_invoice')} className={`px-3 py-1.5 rounded font-medium transition-colors ${typeFilter === 'client_invoice' ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>Client Invoices</button>
            <button type="button" onClick={() => setTypeFilter('cameraman_receipt')} className={`px-3 py-1.5 rounded font-medium transition-colors ${typeFilter === 'cameraman_receipt' ? 'bg-[var(--color-surface)] text-red-600 dark:text-red-400 font-semibold shadow-2xs' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>Crew Payout Vouchers</button>
          </div>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')} className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-[var(--color-text)] outline-none">
              <option value="all">All Payment Statuses</option>
              <option value="pending">Pending Payment</option>
              <option value="paid">Settled / Paid</option>
            </select>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState icon={<FileText className="w-6 h-6 text-[var(--color-text-muted)]" />} title="No Documents Found" description="No invoices or payout vouchers match your current filters." />
        ) : (
          <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                <thead className="bg-[var(--color-bg)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Document</th>
                    <th className="px-6 py-3.5 font-semibold">Type</th>
                    <th className="px-6 py-3.5 font-semibold">Recipient / Account</th>
                    <th className="px-6 py-3.5 font-semibold">Shoot Date & Location</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Amount (₹)</th>
                    <th className="px-6 py-3.5 font-semibold text-center">Status</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredItems.map(item => {
                    const isClient = item.type === 'client_invoice';
                    return (
                      <tr key={item.id} className="hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer" onClick={() => setActiveModalItem(item)}>
                        <td className="px-6 py-4 font-mono font-bold text-[var(--color-text)]">
                          <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[var(--color-accent)]" />{item.docNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${isClient ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {isClient ? 'Client Invoice' : 'Crew Voucher'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-sm text-[var(--color-text)]">{item.recipientName}</td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-[var(--color-text)] block truncate max-w-xs">{item.shootLocation}</span>
                          <span className="text-[11px] text-[var(--color-text-secondary)] inline-flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3 text-[var(--color-text-muted)]" />{item.shootDate}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-sm text-[var(--color-text)] whitespace-nowrap">{formatCurrency(item.amount)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold ${item.isPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                            {item.isPaid ? <><CheckCircle2 className="w-3 h-3" /><span>Settled</span></> : <><Clock className="w-3 h-3" /><span>Pending</span></>}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setActiveModalItem(item); }} className="px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-hover)] transition-colors">Preview</button>
                            <button type="button" onClick={(e) => handlePrint(item, e)} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded transition-colors" title="Print Document"><Printer className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={(e) => handleDownload(item, e)} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded transition-colors" title="Download PDF"><Download className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {activeModalItem && <InvoicePreviewModal isOpen={Boolean(activeModalItem)} onClose={() => setActiveModalItem(null)} type={activeModalItem.type} client={activeModalItem.type === 'client_invoice' ? clientMap.get(activeModalItem.targetId) : undefined} cameraman={activeModalItem.type === 'cameraman_receipt' ? cameramanMap.get(activeModalItem.targetId) : undefined} shoot={activeModalItem.shoot} assignmentAmount={activeModalItem.amount} assignmentPaid={activeModalItem.isPaid} assignmentPaidAt={activeModalItem.paidAt} />}
    </div>
  );
};
