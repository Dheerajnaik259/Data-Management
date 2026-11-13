import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { formatCurrency } from '../utils/formatCurrency';
import { InvoicePreviewModal } from '../components/invoices/InvoicePreviewModal';
import { generateClientInvoicePDF, generateCameramanPayoutReceiptPDF } from '../utils/pdfGenerator';
import { EmptyState } from '../components/common/EmptyState';
import { FileText, Download, Printer, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { requestInvoiceNumber } from '../supabase/data';
import { parseBusinessProfileFromSettings } from '../config/business';
import { useToast } from '../context/ToastContext';
import { buildInvoiceList, filterInvoiceItems } from './invoicesLogic';
import type { InvoiceListItem, InvoiceStatusFilter, InvoiceTypeFilter } from './invoicesLogic';

export const Invoices: React.FC = () => {
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { shoots, clients, cameramen, settings } = useData();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<InvoiceTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('all');

  const [activeModalItem, setActiveModalItem] = useState<InvoiceListItem | null>(null);
  const [issuedNumbers, setIssuedNumbers] = useState<Record<string, string>>({});
  const [processingDocumentId, setProcessingDocumentId] = useState<string | null>(null);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const cameramanMap = useMemo(() => new Map(cameramen.map(c => [c.id, c])), [cameramen]);
  const businessProfile = parseBusinessProfileFromSettings(settings.find(setting => setting.key === 'businessProfile'));

  const allDocItems = useMemo(
    () => buildInvoiceList(shoots, clientMap, cameramanMap),
    [shoots, clientMap, cameramanMap],
  );
  const filteredItems = useMemo(
    () => filterInvoiceItems(allDocItems, typeFilter, statusFilter, searchQuery),
    [allDocItems, typeFilter, statusFilter, searchQuery],
  );

  const resolveNumber = async (item: InvoiceListItem): Promise<string> => {
    const alreadyIssued = issuedNumbers[item.id] || (item.type === 'client_invoice'
      ? item.shoot.clientInvoiceNumber
      : item.shoot.assignments?.[item.assignmentIndex ?? -1]?.payoutVoucherNumber);
    if (alreadyIssued) return alreadyIssued;
    if (!item.isPaid) return `DRAFT-${item.id.slice(-8).toUpperCase()}`;
    const number = await requestInvoiceNumber(
      item.type === 'client_invoice' ? 'client' : 'payout',
      item.shoot.id,
      item.assignmentIndex,
    );
    setIssuedNumbers(current => ({ ...current, [item.id]: number }));
    return number;
  };

  const handleDownload = async (item: InvoiceListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingDocumentId(item.id);
    try {
      const number = await resolveNumber(item);
      if (item.type === 'client_invoice') {
        const client = clientMap.get(item.targetId);
        if (!client) throw new Error('Client record is unavailable for this invoice.');
        const doc = await generateClientInvoicePDF(client, item.shoot, { ...businessProfile, invoiceNumber: number });
        doc.save(`${number}_${client.name.replace(/\s+/g, '_')}.pdf`);
      } else {
        const cam = cameramanMap.get(item.targetId);
        if (!cam) throw new Error('Cameraman record is unavailable for this payout voucher.');
        const doc = await generateCameramanPayoutReceiptPDF(cam, item.shoot, item.amount, item.isPaid, item.paidAt, { ...businessProfile, invoiceNumber: number });
        doc.save(`${number}_${cam.name.replace(/\s+/g, '_')}.pdf`);
      }
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to generate this document.' });
    } finally {
      setProcessingDocumentId(null);
    }
  };

  const handlePrint = async (item: InvoiceListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingDocumentId(item.id);
    try {
      const number = await resolveNumber(item);
      if (item.type === 'client_invoice') {
        const client = clientMap.get(item.targetId);
        if (!client) throw new Error('Client record is unavailable for this invoice.');
        const doc = await generateClientInvoicePDF(client, item.shoot, { ...businessProfile, invoiceNumber: number });
        doc.autoPrint(); window.open(doc.output('bloburl'), '_blank');
      } else {
        const cam = cameramanMap.get(item.targetId);
        if (!cam) throw new Error('Cameraman record is unavailable for this payout voucher.');
        const doc = await generateCameramanPayoutReceiptPDF(cam, item.shoot, item.amount, item.isPaid, item.paidAt, { ...businessProfile, invoiceNumber: number });
        doc.autoPrint(); window.open(doc.output('bloburl'), '_blank');
      }
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to prepare this document for printing.' });
    } finally {
      setProcessingDocumentId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header title="Invoices & Payout Vouchers" subtitle="Generate and download branded PDF invoices for clients and disbursement vouchers for cameramen" searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Search by invoice #, client, cameraman, location..." onOpenMobile={onOpenMobileNav} />
      <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <div className="liquid-control-tray p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-[var(--color-bg)] p-1 rounded-md border border-[var(--color-border)] text-xs">
            <button type="button" onClick={() => setTypeFilter('all')} className={`px-3 py-1.5 rounded font-medium transition-colors ${typeFilter === 'all' ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-2xs' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>All Documents ({allDocItems.length})</button>
            <button type="button" onClick={() => setTypeFilter('client_invoice')} className={`px-3 py-1.5 rounded font-medium transition-colors ${typeFilter === 'client_invoice' ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>Client Invoices</button>
            <button type="button" onClick={() => setTypeFilter('cameraman_receipt')} className={`px-3 py-1.5 rounded font-medium transition-colors ${typeFilter === 'cameraman_receipt' ? 'bg-[var(--color-surface)] text-red-600 dark:text-red-400 font-semibold shadow-2xs' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>Crew Payout Vouchers</button>
          </div>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InvoiceStatusFilter)} className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-[var(--color-text)] outline-none">
              <option value="all">All Payment Statuses</option>
              <option value="pending">Pending Payment</option>
              <option value="paid">Settled / Paid</option>
            </select>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState icon={<FileText className="w-6 h-6 text-[var(--color-text-muted)]" />} title="No Documents Found" description="No invoices or payout vouchers match your current filters." />
        ) : (
          <div className="liquid-table-container overflow-hidden">
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
                  {filteredItems.map(item => (
                    <InvoiceRow
                      key={item.id}
                      item={item}
                      processing={processingDocumentId === item.id}
                      onPreview={() => setActiveModalItem(item)}
                      onPrint={handlePrint}
                      onDownload={handleDownload}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {activeModalItem && <InvoicePreviewModal isOpen={Boolean(activeModalItem)} onClose={() => setActiveModalItem(null)} type={activeModalItem.type} client={activeModalItem.type === 'client_invoice' ? clientMap.get(activeModalItem.targetId) : undefined} cameraman={activeModalItem.type === 'cameraman_receipt' ? cameramanMap.get(activeModalItem.targetId) : undefined} shoot={activeModalItem.shoot} assignmentAmount={activeModalItem.amount} assignmentPaid={activeModalItem.isPaid} assignmentPaidAt={activeModalItem.paidAt} assignmentIndex={activeModalItem.assignmentIndex} documentNumber={issuedNumbers[activeModalItem.id] || (activeModalItem.docNumber !== 'Not issued' ? activeModalItem.docNumber : undefined)} />}
    </div>
  );
};

interface InvoiceRowProps {
  item: InvoiceListItem;
  processing: boolean;
  onPreview: () => void;
  onPrint: (item: InvoiceListItem, event: React.MouseEvent) => Promise<void>;
  onDownload: (item: InvoiceListItem, event: React.MouseEvent) => Promise<void>;
}

const InvoiceRow: React.FC<InvoiceRowProps> = ({ item, processing, onPreview, onPrint, onDownload }) => {
  const isClient = item.type === 'client_invoice';
  return (
    <tr className="hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer" onClick={onPreview}>
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
          <button type="button" onClick={e => { e.stopPropagation(); onPreview(); }} className="px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-hover)] transition-colors">Preview</button>
          <button type="button" disabled={processing} onClick={e => { e.stopPropagation(); void onPrint(item, e); }} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded transition-colors disabled:opacity-50" title="Print Document"><Printer className="w-3.5 h-3.5" /></button>
          <button type="button" disabled={processing} onClick={e => { e.stopPropagation(); void onDownload(item, e); }} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded transition-colors disabled:opacity-50" title="Download PDF"><Download className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
};
