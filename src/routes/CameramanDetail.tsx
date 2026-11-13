import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { formatCurrency, parseCurrencyInput } from '../utils/formatCurrency';
import { formatTime12h } from '../utils/formatTime';
import { CameramanForm } from '../components/cameramen/CameramanForm';
import { InvoicePreviewModal } from '../components/invoices/InvoicePreviewModal';
import { Cameraman, CameramanLedger, Shoot } from '../types';
import { ArrowLeft, Phone, ExternalLink, Edit2, Edit3, Calendar, MapPin, CheckCircle2, Clock, FileText, Video, Check, X } from 'lucide-react';
import { FileLink } from '../components/common/FileLink';
import { getCameramanAssignments, getPendingCameramanRates } from './cameramanDetailLogic';
import type { CameramanAssignmentItem } from './cameramanDetailLogic';

export const CameramanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { cameramen, shoots, clients, getCameramanLedger, handleToggleCameramanPayment, handleToggleCameramanCheckIn, handleSetCameramanRate, changeRequests } = useData();

  const cameraman = cameramen.find(c => c.id === id);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [receiptModalShoot, setReceiptModalShoot] = useState<{ shoot: Shoot; amount: number; paid: boolean; paidAt?: string | null; assignmentIndex: number; } | null>(null);
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<number>(0);

  if (!cameraman) {
    return (
      <div className="p-8 text-center bg-[var(--color-bg)] min-h-screen flex flex-col items-center justify-center">
        <h2 className="font-serif text-xl font-bold text-[var(--color-text)] mb-2">Cameraman Not Found</h2>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4">The requested cameraman record does not exist or has been removed.</p>
        <Link to="/cameramen" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)]">
          <ArrowLeft className="w-3.5 h-3.5" /> <span>Back to Cameramen</span>
        </Link>
      </div>
    );
  }

  const ledger = getCameramanLedger(cameraman.id);
  const clientMap = new Map(clients.map(c => [c.id, c.name]));

  const assignedShoots = getCameramanAssignments(shoots, cameraman.id);
  const pendingRates = getPendingCameramanRates(assignedShoots);
  const handleRateSave = async (item: CameramanAssignmentItem) => {
    const amount = Number(rateDrafts[item.shoot.id]);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await handleSetCameramanRate(item.shoot.id, item.assignmentIndex, amount);
    setRateDrafts(current => ({ ...current, [item.shoot.id]: '' }));
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header title={cameraman.name} subtitle="Freelance videographer profile, assigned shoot jobs, and disbursement history"
        action={
          <div className="flex items-center gap-2">
            <Link to="/cameramen" className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> <span>Back</span>
            </Link>
            <button type="button" onClick={() => setIsEditFormOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> <span>Edit Details</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
        <CameramanProfileSummary cameraman={cameraman} ledger={ledger} assignedCount={assignedShoots.length} />

        <CameramanAssignmentsTable
          cameramanName={cameraman.name}
          assignments={assignedShoots}
          clientMap={clientMap}
          editingRowKey={editingRowKey}
          editingAmount={editingAmount}
          onAmountChange={setEditingAmount}
          onSaveRate={async item => {
            await handleSetCameramanRate(item.shoot.id, item.assignmentIndex, editingAmount);
            setEditingRowKey(null);
          }}
          onCancelEdit={() => setEditingRowKey(null)}
          onStartEdit={item => {
            setEditingRowKey(`${item.shoot.id}-${item.assignmentIndex}`);
            setEditingAmount(item.amount || 0);
          }}
          onTogglePayment={item => handleToggleCameramanPayment(item.shoot.id, item.assignmentIndex, true)}
          onToggleCheckIn={item => handleToggleCameramanCheckIn(item.shoot.id, item.assignmentIndex, !item.shoot.assignments[item.assignmentIndex].checkedInAt)}
          onOpenReceipt={item => {
            if (item.amount !== null) {
              setReceiptModalShoot({ shoot: item.shoot, amount: item.amount, paid: item.paid, paidAt: item.paidAt, assignmentIndex: item.assignmentIndex });
            }
          }}
        />

        <PendingCameramanRates
          pendingRates={pendingRates}
          changeRequests={changeRequests}
          rateDrafts={rateDrafts}
          onDraftChange={(shootId, value) => setRateDrafts(current => ({ ...current, [shootId]: value }))}
          onSaveRate={handleRateSave}
        />
      </main>

      <CameramanForm isOpen={isEditFormOpen} onClose={() => setIsEditFormOpen(false)} initialCameraman={cameraman} />
      {receiptModalShoot && <InvoicePreviewModal isOpen={Boolean(receiptModalShoot)} onClose={() => setReceiptModalShoot(null)} type="cameraman_receipt" cameraman={cameraman} shoot={receiptModalShoot.shoot} assignmentAmount={receiptModalShoot.amount} assignmentPaid={receiptModalShoot.paid} assignmentPaidAt={receiptModalShoot.paidAt} assignmentIndex={receiptModalShoot.assignmentIndex} />}
    </div>
  );
};

interface CameramanAssignmentRowProps {
  item: CameramanAssignmentItem;
  clientName: string;
  isEditing: boolean;
  editingAmount: number;
  onAmountChange: (amount: number) => void;
  onSaveRate: () => Promise<void>;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onTogglePayment: () => Promise<void>;
  onToggleCheckIn: () => void;
  onOpenReceipt: () => void;
}

interface CameramanAssignmentsTableProps {
  cameramanName: string;
  assignments: CameramanAssignmentItem[];
  clientMap: Map<string, string>;
  editingRowKey: string | null;
  editingAmount: number;
  onAmountChange: (amount: number) => void;
  onSaveRate: (item: CameramanAssignmentItem) => Promise<void>;
  onCancelEdit: () => void;
  onStartEdit: (item: CameramanAssignmentItem) => void;
  onTogglePayment: (item: CameramanAssignmentItem) => Promise<void>;
  onToggleCheckIn: (item: CameramanAssignmentItem) => void;
  onOpenReceipt: (item: CameramanAssignmentItem) => void;
}

interface PendingCameramanRatesProps {
  pendingRates: CameramanAssignmentItem[];
  changeRequests: ReturnType<typeof useData>['changeRequests'];
  rateDrafts: Record<string, string>;
  onDraftChange: (shootId: string, value: string) => void;
  onSaveRate: (item: CameramanAssignmentItem) => Promise<void>;
}

const PendingCameramanRates: React.FC<PendingCameramanRatesProps> = ({
  pendingRates,
  changeRequests,
  rateDrafts,
  onDraftChange,
  onSaveRate,
}) => (
  <section className="liquid-table-container overflow-hidden">
    <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <h3 className="font-serif text-base font-bold text-[var(--color-text)]">Pending Rates</h3>
      <p className="text-xs text-[var(--color-text-secondary)]">Set payout amounts after a shoot assignment has been approved.</p>
    </div>
    {pendingRates.length === 0 ? <p className="p-6 text-xs text-[var(--color-text-muted)]">No pending payout rates.</p> : (
      <div className="divide-y divide-[var(--color-border)]">
        {pendingRates.map(item => {
          const isPendingCR = changeRequests.some(request =>
            request.targetCollection === 'shoots' &&
            request.targetDocId === item.shoot.id &&
            request.status === 'pending',
          );
          return (
            <div key={`${item.shoot.id}-${item.assignmentIndex}`} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-48">
                <p className="text-sm font-semibold text-[var(--color-text)]">{item.shoot.date} · {item.shoot.location}</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">Payout is not set</p>
              </div>
              {isPendingCR ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-md text-xs font-medium border border-amber-200 dark:border-amber-800/50">
                  <Clock className="w-3.5 h-3.5" /> Rate submitted for approval
                </div>
              ) : (
                <>
                  <input type="number" min="1" value={rateDrafts[item.shoot.id] || ''} onChange={event => onDraftChange(item.shoot.id, event.target.value)} placeholder="Amount (₹)" className="w-36 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)]" />
                  <button type="button" onClick={() => { void onSaveRate(item); }} className="px-3 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md">Save Rate</button>
                </>
              )}
            </div>
          );
        })}
      </div>
    )}
  </section>
);

const CameramanAssignmentsTable: React.FC<CameramanAssignmentsTableProps> = ({
  cameramanName,
  assignments,
  clientMap,
  editingRowKey,
  editingAmount,
  onAmountChange,
  onSaveRate,
  onCancelEdit,
  onStartEdit,
  onTogglePayment,
  onToggleCheckIn,
  onOpenReceipt,
}) => (
  <section className="liquid-table-container overflow-hidden">
    <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
      <div>
        <h3 className="font-serif text-base font-bold text-[var(--color-text)]">Shoot Assignments & Payout Vouchers</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">History of shoots worked by {cameramanName} with custom shoot rates</p>
      </div>
    </div>
    {assignments.length === 0 ? (
      <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">This cameraman has not been assigned to any shoot jobs yet.</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
          <thead className="bg-[var(--color-bg)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
            <tr>
              <th className="px-6 py-3.5 font-semibold">Shoot Date</th>
              <th className="px-6 py-3.5 font-semibold">Client</th>
              <th className="px-6 py-3.5 font-semibold">Location</th>
              <th className="px-6 py-3.5 font-semibold text-right">Agreed Shoot Payout</th>
              <th className="px-6 py-3.5 font-semibold text-center">Payout Status</th>
              <th className="px-6 py-3.5 font-semibold text-right">Receipt / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {assignments.map(item => {
              const rowKey = `${item.shoot.id}-${item.assignmentIndex}`;
              return (
                <CameramanAssignmentRow
                  key={rowKey}
                  item={item}
                  clientName={clientMap.get(item.shoot.clientId) || 'Client'}
                  isEditing={editingRowKey === rowKey}
                  editingAmount={editingAmount}
                  onAmountChange={onAmountChange}
                  onSaveRate={() => onSaveRate(item)}
                  onCancelEdit={onCancelEdit}
                  onStartEdit={() => onStartEdit(item)}
                  onTogglePayment={() => onTogglePayment(item)}
                  onToggleCheckIn={() => onToggleCheckIn(item)}
                  onOpenReceipt={() => onOpenReceipt(item)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const CameramanProfileSummary: React.FC<{
  cameraman: Cameraman;
  ledger: CameramanLedger;
  assignedCount: number;
}> = ({ cameraman, ledger, assignedCount }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="liquid-content-panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
          Freelance Operator
        </span>
        <span className="text-[11px] text-[var(--color-text-muted)] font-mono">ID: {cameraman.id.slice(0, 8)}</span>
      </div>
      <div>
        <h2 className="font-serif text-2xl font-bold text-[var(--color-text)] tracking-tight">{cameraman.name}</h2>
        <div className="mt-2 space-y-1.5 text-xs text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <a href={`tel:${cameraman.phone}`} className="hover:underline font-medium">{cameraman.phone}</a>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-[var(--color-text-secondary)]">Standard Base Rate:</span>
            <span className="font-bold text-[var(--color-text)]">{formatCurrency(cameraman.rate)} / day</span>
          </div>
          {cameraman.contractLink ? (
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <FileLink fileRef={cameraman.contractLink} className="text-[var(--color-accent)] hover:underline font-medium truncate">Freelancer NDA / Agreement &rarr;</FileLink>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--color-text-muted)] italic">No contract/NDA document linked.</p>
          )}
        </div>
      </div>
      {cameraman.notes && (
        <div className="pt-3 border-t border-[var(--color-border)]">
          <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Gear Specialties & Notes</span>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">{cameraman.notes}</p>
        </div>
      )}
    </div>
    <div className="liquid-content-panel lg:col-span-2 p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">Cameraman Disbursement Ledger</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">Aggregated shoot assignments and payout records</p>
          </div>
          <span className="text-xs font-medium text-[var(--color-text-secondary)] font-mono bg-[var(--color-bg)] px-2.5 py-1 rounded border border-[var(--color-border)]">{assignedCount} Assigned Jobs</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
            <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">Total Assigned Payouts</span>
            <span className="text-xl font-bold font-serif text-[var(--color-text)] block mt-1">{formatCurrency(ledger.totalAssigned)}</span>
          </div>
          <div className="p-4 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
            <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">Total Paid Out</span>
            <span className="text-xl font-bold font-serif text-emerald-600 dark:text-emerald-500 block mt-1">{formatCurrency(ledger.totalPaid)}</span>
          </div>
          <div className="p-4 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
            <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block">Balance Outstanding</span>
            <span className={`text-xl font-bold font-serif block mt-1 ${ledger.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-secondary)]'}`}>{formatCurrency(ledger.outstanding)}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <span>Disbursement Method: Direct Bank / UPI Transfer</span>
        {ledger.outstanding === 0 && ledger.totalAssigned > 0 && (
          <span className="text-emerald-600 dark:text-emerald-500 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> All crew payouts settled
          </span>
        )}
      </div>
    </div>
  </div>
);

const CameramanAssignmentRow: React.FC<CameramanAssignmentRowProps> = ({
  item, clientName, isEditing, editingAmount, onAmountChange, onSaveRate, onCancelEdit, onStartEdit, onTogglePayment, onToggleCheckIn, onOpenReceipt,
}) => (
  <tr className="hover:bg-[var(--color-bg-hover)] transition-colors">
    <td className="px-6 py-4 font-mono font-medium text-[var(--color-text)]">
      {item.shoot.date}
      {(item.shoot.assignments[item.assignmentIndex]?.callTime || item.shoot.callTime) && (
        <span className="block text-[10px] text-[var(--color-text-muted)] font-sans">
          Call: {formatTime12h(item.shoot.assignments[item.assignmentIndex]?.callTime || item.shoot.callTime)}
        </span>
      )}
    </td>
    <td className="px-6 py-4 font-semibold text-[var(--color-text)]">{clientName}</td>
    <td className="px-6 py-4 text-[var(--color-text-secondary)]">{item.shoot.location}</td>
    <td className="px-6 py-4 font-mono font-semibold text-[var(--color-text)]">
      {isEditing ? (
        <div className="flex items-center justify-end gap-1.5">
          <input
            type="number"
            value={editingAmount || ''}
            onChange={e => onAmountChange(parseCurrencyInput(e.target.value))}
            className="w-24 px-2 py-1 text-xs font-mono font-bold bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <button type="button" onClick={() => { void onSaveRate(); }} className="p-1 text-white bg-emerald-600 rounded hover:bg-emerald-700 transition-colors" title="Save Payout Rate">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onCancelEdit} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors" title="Cancel">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-1.5 group/rate">
          <span>{formatCurrency(item.amount)}</span>
          <button type="button" onClick={onStartEdit} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] opacity-60 group-hover/rate:opacity-100 transition-opacity" title="Edit Agreed Shoot Payout">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </td>
    <td className="px-6 py-4 text-center">
      <button type="button" disabled={item.amount === null || item.paid} title={item.paid ? 'Paid status is final and cannot be changed.' : undefined} onClick={() => { void onTogglePayment().catch(() => {}); }} className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${item.paid ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 disabled:opacity-50'}`}>
        {item.paid ? <><CheckCircle2 className="w-3.5 h-3.5" /><span>Paid</span></> : <><Clock className="w-3.5 h-3.5" /><span>{item.amount === null ? 'Rate not set' : `Disburse ${formatCurrency(item.amount)}`}</span></>}
      </button>
      <button type="button" onClick={onToggleCheckIn} className="ml-2 px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-md">
        {item.shoot.assignments[item.assignmentIndex].checkedInAt ? 'Checked in' : 'Check in'}
      </button>
    </td>
    <td className="px-6 py-4 text-right">
      <button type="button" disabled={item.amount === null} onClick={onOpenReceipt} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--color-accent)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-50">
        <FileText className="w-3.5 h-3.5" /> <span>Voucher PDF</span>
      </button>
    </td>
  </tr>
);
