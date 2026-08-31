import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { canApprove } from '../utils/permissions';
import { canSubmitForApproval } from '../utils/permissions';
import { formatCurrency } from '../utils/formatCurrency';
import { Check, X, RefreshCw, Eye, MessageSquare } from 'lucide-react';
import { ChangeRequest } from '../types';
import { ClientForm } from '../components/clients/ClientForm';
import { CameramanForm } from '../components/cameramen/CameramanForm';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ShootForm } from '../components/shoots/ShootForm';

const TAB_FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;

export const PendingApprovals: React.FC = () => {
  const ctx = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { changeRequests, handleApprove, handleReject } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState<typeof TAB_FILTERS[number]>('all');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resubmission, setResubmission] = useState<ChangeRequest | null>(null);

  const filtered = changeRequests.filter(cr => tab === 'all' || cr.status === tab);
  const isFounder = user ? canApprove(user.role) : false;

  const openRejectModal = (id: string) => {
    setRejectId(id);
    setRejectNote('');
    setRejectError(null);
  };

  const doReject = async () => {
    if (!rejectId || isRejecting) return;
    setIsRejecting(true);
    setRejectError(null);
    try {
      await handleReject(rejectId, rejectNote.trim() || 'No reason provided');
      setRejectId(null);
      setRejectNote('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reject request';
      setRejectError(msg);
    } finally {
      setIsRejecting(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return `inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${map[status] || ''}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header title="Pending Approvals" subtitle="Review and manage change requests" onOpenMobile={ctx?.onOpenMobileNav} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[var(--color-bg)] rounded-lg p-1 w-fit border border-[var(--color-border)]">
          {TAB_FILTERS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                tab === t ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}>
              {t} {t !== 'all' && <span className="ml-1 opacity-60">({changeRequests.filter(cr => cr.status === t).length})</span>}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[var(--color-text-muted)]">No {tab === 'all' ? '' : tab} change requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(cr => (
              <CRCard key={cr.id} cr={cr} isFounder={isFounder} canResubmit={Boolean(user && canSubmitForApproval(user.role))}
                isExpanded={expandedId === cr.id}
                onToggle={() => setExpandedId(expandedId === cr.id ? null : cr.id)}
                onApprove={() => handleApprove(cr.id)}
                onReject={() => openRejectModal(cr.id)}
                onResubmit={() => setResubmission(cr)}
                statusBadge={statusBadge} />
            ))}
          </div>
        )}

        {/* Reject modal */}
        {rejectId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isRejecting && setRejectId(null)} />
            <div className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl max-w-md w-full p-6 z-10 space-y-4">
              <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">Reject Request</h3>
              {rejectError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-800 dark:text-red-300">
                  {rejectError}
                </div>
              )}
              <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3} disabled={isRejecting}
                placeholder="Reason for rejection..."
                className="w-full px-3 py-2 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50" />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setRejectId(null)} disabled={isRejecting} className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] rounded-md disabled:opacity-50">Cancel</button>
                <button type="button" onClick={doReject} disabled={isRejecting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 shadow-xs">
                  {isRejecting ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {resubmission?.targetCollection === 'clients' && <ClientForm isOpen onClose={() => setResubmission(null)} resubmission={resubmission} />}
      {resubmission?.targetCollection === 'cameramen' && <CameramanForm isOpen onClose={() => setResubmission(null)} resubmission={resubmission} />}
      {resubmission?.targetCollection === 'expenses' && <ExpenseForm isOpen onClose={() => setResubmission(null)} resubmission={resubmission} />}
      {resubmission?.targetCollection === 'shoots' && <ShootForm isOpen onClose={() => setResubmission(null)} resubmission={resubmission} />}
    </div>
  );
};

interface CRCardProps {
  cr: ChangeRequest; isFounder: boolean; canResubmit: boolean; isExpanded: boolean;
  onToggle: () => void; onApprove: () => Promise<void> | void; onReject: () => void; onResubmit: () => void;
  statusBadge: (s: string) => string;
}

const CRCard: React.FC<CRCardProps> = ({ cr, isFounder, canResubmit, isExpanded, onToggle, onApprove, onReject, onResubmit, statusBadge }) => {
  const [isApproving, setIsApproving] = useState(false);
  const proposedName = (cr.proposedData?.name as string) || (cr.proposedData?.description as string) || '';

  const handleApproveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isApproving) return;
    setIsApproving(true);
    try {
      await onApprove();
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden transition-colors">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[var(--color-bg-hover)]" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={statusBadge(cr.status)}>{cr.status}</span>
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-medium">{cr.action} {cr.targetCollection.slice(0, -1)}</span>
            {cr.revisionCount > 0 && <span className="text-[10px] text-blue-500">v{cr.revisionCount + 1}</span>}
          </div>
          <p className="text-sm font-medium text-[var(--color-text)] mt-1 truncate">{proposedName || `${cr.targetCollection} ${cr.action}`}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            by {cr.requestedBy} · {new Date(cr.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        {cr.status === 'pending' && (
          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={handleApproveClick} disabled={isApproving} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1 disabled:opacity-50 shadow-xs">
              <Check className="w-3 h-3" /> {isApproving ? 'Approving...' : 'Approve'}
            </button>
            <button type="button" onClick={onReject} disabled={isApproving} className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center gap-1 disabled:opacity-50 shadow-xs">
              <X className="w-3 h-3" /> Reject
            </button>
          </div>
        )}
        <Eye className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
      </div>
      {isExpanded && (
        <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
          {cr.status === 'rejected' && canResubmit && <button type="button" onClick={onResubmit} className="mb-3 px-3 py-1.5 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md">Edit & Resubmit</button>}
          {cr.reviewNote && (
            <div className="mb-3 flex items-start gap-2 text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-[var(--color-text-muted)] mt-0.5 shrink-0" />
              <span className="text-[var(--color-text-secondary)]"><strong>Review note:</strong> {cr.reviewNote}</span>
            </div>
          )}
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-medium mb-2">Proposed Data</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(cr.proposedData).map(([key, val]) => {
              let displayVal = String(val);
              if (val === null || val === undefined) displayVal = 'None';
              else if (Array.isArray(val)) {
                if (val.length === 0) displayVal = 'None';
                else if (key === 'assignments') {
                  displayVal = val.map((v: any) => {
                    const name = typeof v.cameramanId === 'string' ? v.cameramanId.replace('cam-', 'Cameraman ') : 'Unknown';
                    const amt = v.amount !== null && v.amount !== undefined ? `₹${v.amount}` : 'Pending';
                    return `${name} (${amt})`;
                  }).join(', ');
                } else if (key === 'deliverables') {
                  displayVal = val.map((v: any) => `${v.count}x ${v.type}`).join(', ');
                } else if (typeof val[0] === 'string') {
                  displayVal = val.join(', ');
                } else {
                  displayVal = val.map(v => JSON.stringify(v)).join(', ');
                }
              } else if (typeof val === 'object') {
                displayVal = JSON.stringify(val);
              } else if (typeof val === 'boolean') {
                displayVal = val ? 'Yes' : 'No';
              }
              
              return (
                <div key={key} className="text-xs">
                  <span className="text-[var(--color-text-muted)]">{key}: </span>
                  <span className="text-[var(--color-text)]">{displayVal}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
