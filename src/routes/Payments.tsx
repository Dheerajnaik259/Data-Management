import React, { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { PaymentRecord, Shoot } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { OverdueBadge } from '../components/common/OverdueBadge';
import { ExportCsvButton } from '../components/common/ExportCsvButton';
import { EmptyState } from '../components/common/EmptyState';
import { InvoicePreviewModal } from '../components/invoices/InvoicePreviewModal';
import { TrendingUp, TrendingDown, CheckCircle2, Clock, MessageSquare, FileText, Calendar, Filter, ArrowUpRight } from 'lucide-react';

import { parseOperationalSettings } from '../config/business';
import { buildClientPaymentReminderWhatsAppUrl } from '../utils/whatsapp';
import {
  filterPaymentRecords,
  summarizePaymentRecords,
  togglePaymentRecord,
} from './paymentsLogic';
import type { PaymentStats, PaymentStatusFilter, PaymentTab } from './paymentsLogic';

export const Payments: React.FC = () => {
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { paymentRecords, shoots, clients, cameramen, settings, handleToggleClientPayment, handleToggleCameramanPayment } = useData();
  const operationalSettings = parseOperationalSettings(settings.find(s => s.key === 'operationalSettings'));

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PaymentTab>('all');
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');

  const [previewData, setPreviewData] = useState<{ type: 'client_invoice' | 'cameraman_receipt'; shoot: Shoot; targetId: string; amount: number; paid: boolean; paidAt?: string | null; assignmentIndex?: number; } | null>(null);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const cameramanMap = useMemo(() => new Map(cameramen.map(c => [c.id, c])), [cameramen]);
  const shootMap = useMemo(() => new Map(shoots.map(s => [s.id, s])), [shoots]);

  const getWhatsAppReminderUrl = (item: PaymentRecord) => {
    if (!item.phone) return '#';
    return buildClientPaymentReminderWhatsAppUrl({
      phone: item.phone,
      clientName: item.targetName,
      amount: formatCurrency(item.amount),
      date: item.shootDate,
      location: item.shootLocation,
      template: operationalSettings.clientReminderTemplate,
    }) || '#';
  };

  const filteredRecords = useMemo(
    () => filterPaymentRecords(paymentRecords, activeTab, statusFilter, searchQuery),
    [paymentRecords, activeTab, statusFilter, searchQuery],
  );
  const stats = useMemo(() => summarizePaymentRecords(paymentRecords), [paymentRecords]);

  const csvData = useMemo(() => filteredRecords.map(r => ({
    id: r.id, flowType: r.type === 'incoming' ? 'RECEIVABLE (CLIENT)' : 'PAYOUT (CAMERAMAN)', targetName: r.targetName, phone: r.phone || '', shootDate: r.shootDate, shootLocation: r.shootLocation, amount: r.amount, status: r.isPaid ? 'PAID' : 'PENDING', paidAt: r.paidAt || '', isOverdue: r.overdueInfo.isOverdue ? 'YES' : 'NO', overdueDateLabel: r.overdueInfo.label,
  })), [filteredRecords]);

  const handleTogglePayment = async (record: PaymentRecord) => {
    await togglePaymentRecord(record, {
      toggleClientPayment: handleToggleClientPayment,
      toggleCameramanPayment: handleToggleCameramanPayment,
    });
  };

  const handleOpenPdf = (record: PaymentRecord) => {
    const shoot = shootMap.get(record.shootId);
    if (!shoot) return;
    setPreviewData({ type: record.type === 'incoming' ? 'client_invoice' : 'cameraman_receipt', shoot, targetId: record.targetId, amount: record.amount, paid: record.isPaid, paidAt: record.paidAt, assignmentIndex: record.assignmentIndex });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header title="Payments & Disbursements Desk" subtitle="Track incoming client receivables, freelance crew payouts, and overdue balances" searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Search payments by client, cameraman, location, phone..." onOpenMobile={onOpenMobileNav} action={<div className="flex items-center gap-2"><ExportCsvButton filename="Payments_Disbursements_Ledger" data={csvData} label="Export CSV" /></div>} />
      <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <PaymentSummary stats={stats} />
        <PaymentFilters
          paymentCount={paymentRecords.length}
          activeTab={activeTab}
          statusFilter={statusFilter}
          onTabChange={setActiveTab}
          onStatusChange={setStatusFilter}
        />

        <PaymentRecordsTable
          records={filteredRecords}
          reminderUrl={getWhatsAppReminderUrl}
          onTogglePayment={handleTogglePayment}
          onOpenPdf={handleOpenPdf}
        />
      </main>

      {previewData && <InvoicePreviewModal isOpen={Boolean(previewData)} onClose={() => setPreviewData(null)} type={previewData.type} client={previewData.type === 'client_invoice' ? clientMap.get(previewData.targetId) : undefined} cameraman={previewData.type === 'cameraman_receipt' ? cameramanMap.get(previewData.targetId) : undefined} shoot={previewData.shoot} assignmentAmount={previewData.amount} assignmentPaid={previewData.paid} assignmentPaidAt={previewData.paidAt} assignmentIndex={previewData.assignmentIndex} />}
    </div>
  );
};

interface PaymentRowProps {
  item: PaymentRecord;
  reminderUrl: string;
  onTogglePayment: (record: PaymentRecord) => Promise<void>;
  onOpenPdf: (record: PaymentRecord) => void;
}

const PaymentRow: React.FC<PaymentRowProps> = ({ item, reminderUrl, onTogglePayment, onOpenPdf }) => {
  const isClient = item.type === 'incoming';
  const paymentActionDisabled = !isClient && !item.isPaid && !item.hasAssignedRate;
  const targetLink = isClient ? `/clients/${item.targetId}` : `/cameramen/${item.targetId}`;

  return (
    <tr className="hover:bg-[var(--color-bg-hover)] transition-colors">
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${isClient ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'}`}>
          {isClient ? <><TrendingUp className="w-3 h-3" /><span>Money In</span></> : <><TrendingDown className="w-3 h-3" /><span>Money Out</span></>}
        </span>
      </td>
      <td className="px-6 py-4">
        <Link to={targetLink} className="font-semibold text-sm text-[var(--color-text)] hover:underline transition-colors flex items-center gap-1">
          <span>{item.targetName}</span><ArrowUpRight className="w-3 h-3 text-[var(--color-text-muted)]" />
        </Link>
        {item.phone && <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5">{item.phone}</span>}
      </td>
      <td className="px-6 py-4">
        <Link to={`/shoots/${item.shootId}`} className="font-medium text-[var(--color-text)] hover:underline block truncate max-w-xs">{item.shootLocation}</Link>
        <span className="text-[11px] text-[var(--color-text-secondary)] inline-flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3 text-[var(--color-text-muted)]" />{item.shootDate}</span>
      </td>
      <td className="px-6 py-4 text-right font-mono font-bold text-sm text-[var(--color-text)] whitespace-nowrap">{formatCurrency(item.amount)}</td>
      <td className="px-6 py-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <button type="button" disabled={paymentActionDisabled || item.isPaid} title={item.isPaid ? 'Paid status is final and cannot be changed.' : paymentActionDisabled ? 'Set the cameraman payout before marking it paid.' : undefined} onClick={() => { void onTogglePayment(item).catch(() => {}); }} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${item.isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'}`}>
            {item.isPaid ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" /><span>Paid</span></> : <><Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /><span>Mark Paid</span></>}
          </button>
          <OverdueBadge isPaid={item.isPaid} overdueInfo={item.overdueInfo} size="sm" />
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {!item.isPaid && item.phone && (
            <a href={reminderUrl} target="_blank" rel="noreferrer" className="p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors" title="Send WhatsApp Payment Reminder"><MessageSquare className="w-3.5 h-3.5" /></a>
          )}
          <button type="button" onClick={() => onOpenPdf(item)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-hover)] transition-colors" title={isClient ? 'View Client Invoice PDF' : 'View Payout Voucher PDF'}>
            <FileText className="w-3.5 h-3.5 text-[var(--color-accent)]" /><span>{isClient ? 'Invoice PDF' : 'Voucher PDF'}</span>
          </button>
        </div>
      </td>
    </tr>
  );
};

const PaymentSummary: React.FC<{ stats: PaymentStats }> = ({ stats }) => (
  <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div className="liquid-metric-card p-5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Money In (Pending Client Bills)</span>
        <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
      </div>
      <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(stats.pendingIncoming)}</div>
      <div className="text-xs text-[var(--color-text-secondary)]">{stats.overdueIncoming > 0 ? <span className="text-red-600 dark:text-red-400 font-semibold">{stats.overdueIncoming} client payment{stats.overdueIncoming > 1 ? 's' : ''} overdue</span> : <span>No overdue receivables</span>}</div>
    </div>
    <div className="liquid-metric-card p-5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Money Out (Pending Crew Payouts)</span>
        <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center justify-center"><TrendingDown className="w-4 h-4" /></div>
      </div>
      <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(stats.pendingOutgoing)}</div>
      <div className="text-xs text-[var(--color-text-secondary)]">{stats.overdueOutgoing > 0 ? <span className="text-red-600 dark:text-red-400 font-semibold">{stats.overdueOutgoing} crew payout{stats.overdueOutgoing > 1 ? 's' : ''} overdue</span> : <span>All crew payouts on schedule</span>}</div>
    </div>
    <div className="liquid-metric-card p-5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Net Pending Cashflow</span>
        <div className="w-7 h-7 rounded-md bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)] flex items-center justify-center font-bold text-xs">₹</div>
      </div>
      <div className={`text-2xl font-bold font-serif ${stats.netPendingCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>{formatCurrency(stats.netPendingCashflow)}</div>
      <div className="text-xs text-[var(--color-text-secondary)]"><span>Receivables minus pending disbursements</span></div>
    </div>
  </section>
);

interface PaymentFiltersProps {
  paymentCount: number;
  activeTab: PaymentTab;
  statusFilter: PaymentStatusFilter;
  onTabChange: React.Dispatch<React.SetStateAction<PaymentTab>>;
  onStatusChange: React.Dispatch<React.SetStateAction<PaymentStatusFilter>>;
}

const PaymentFilters: React.FC<PaymentFiltersProps> = ({
  paymentCount,
  activeTab,
  statusFilter,
  onTabChange,
  onStatusChange,
}) => (
  <div className="liquid-control-tray p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
    <div className="flex items-center gap-1 bg-[var(--color-bg)] p-1 rounded-md border border-[var(--color-border)] text-xs">
      <button type="button" onClick={() => onTabChange('all')} className={`px-3 py-1.5 rounded font-medium transition-colors ${activeTab === 'all' ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-2xs' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>All Transactions ({paymentCount})</button>
      <button type="button" onClick={() => onTabChange('incoming')} className={`px-3 py-1.5 rounded font-medium transition-colors ${activeTab === 'incoming' ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>Money In (Client Bills)</button>
      <button type="button" onClick={() => onTabChange('outgoing')} className={`px-3 py-1.5 rounded font-medium transition-colors ${activeTab === 'outgoing' ? 'bg-[var(--color-surface)] text-red-600 dark:text-red-400 font-semibold shadow-2xs' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>Money Out (Crew Payouts)</button>
    </div>
    <div className="flex items-center gap-2">
      <Filter className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
      <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value as PaymentStatusFilter)} className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-[var(--color-text)] outline-none">
        <option value="all">All Payment Statuses</option>
        <option value="pending">Pending Only</option>
        <option value="overdue">Overdue Only (!)</option>
        <option value="paid">Settled / Paid Only</option>
      </select>
    </div>
  </div>
);

interface PaymentRecordsTableProps {
  records: PaymentRecord[];
  reminderUrl: (record: PaymentRecord) => string;
  onTogglePayment: (record: PaymentRecord) => Promise<void>;
  onOpenPdf: (record: PaymentRecord) => void;
}

const PaymentRecordsTable: React.FC<PaymentRecordsTableProps> = ({
  records,
  reminderUrl,
  onTogglePayment,
  onOpenPdf,
}) => records.length === 0 ? (
  <EmptyState icon={<Clock className="w-6 h-6 text-[var(--color-text-muted)]" />} title="No Payment Records Found" description="No transactions match your current search and filter settings." />
) : (
  <div className="liquid-table-container overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
        <thead className="bg-[var(--color-bg)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
          <tr>
            <th className="px-6 py-3.5 font-semibold">Type</th>
            <th className="px-6 py-3.5 font-semibold">Recipient / Payer</th>
            <th className="px-6 py-3.5 font-semibold">Shoot Job</th>
            <th className="px-6 py-3.5 font-semibold text-right">Amount (₹)</th>
            <th className="px-6 py-3.5 font-semibold text-center">Status</th>
            <th className="px-6 py-3.5 font-semibold text-right">Actions & Reminders</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {records.map(item => (
            <PaymentRow
              key={item.id}
              item={item}
              reminderUrl={reminderUrl(item)}
              onTogglePayment={onTogglePayment}
              onOpenPdf={onOpenPdf}
            />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
