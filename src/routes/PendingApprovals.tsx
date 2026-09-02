import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { canApprove } from '../utils/permissions';
import { canSubmitForApproval } from '../utils/permissions';
import { Check, X, Eye, MessageSquare, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { ChangeRequest } from '../types';
import { ClientForm } from '../components/clients/ClientForm';
import { CameramanForm } from '../components/cameramen/CameramanForm';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ShootForm } from '../components/shoots/ShootForm';
import { formatSingularCollection } from '../utils/formatCollection';
import { formatTime12h } from '../utils/formatTime';

const TAB_FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;

export const PendingApprovals: React.FC = () => {
  const ctx = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { changeRequests, handleApprove, handleReject, handleDeleteChangeRequest } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState<typeof TAB_FILTERS[number]>('all');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  
  // Modal states
  const [viewModalCR, setViewModalCR] = useState<ChangeRequest | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
      if (viewModalCR?.id === rejectId) setViewModalCR(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reject request';
      setRejectError(msg);
    } finally {
      setIsRejecting(false);
    }
  };

  const doDelete = async () => {
    if (!deleteConfirmId || isDeleting) return;
    setIsDeleting(true);
    try {
      await handleDeleteChangeRequest(deleteConfirmId);
      if (viewModalCR?.id === deleteConfirmId) setViewModalCR(null);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
    };
    return `inline-flex items-center px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${map[status] || ''}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header title="Pending Approvals" subtitle="Review and manage change requests" onOpenMobile={ctx?.onOpenMobileNav} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[var(--color-bg)] rounded-lg p-1 w-fit border border-[var(--color-border)]">
          {TAB_FILTERS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                tab === t ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-xs font-semibold' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}>
              {t} {t !== 'all' && <span className="ml-1 opacity-60">({changeRequests.filter(cr => cr.status === t).length})</span>}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
            <Clock className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-[var(--color-text-muted)]">No {tab === 'all' ? '' : tab} change requests found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(cr => (
              <CRCard key={cr.id} cr={cr} isFounder={isFounder} canResubmit={Boolean(user && canSubmitForApproval(user.role))}
                onView={() => setViewModalCR(cr)}
                onApprove={() => handleApprove(cr.id)}
                onReject={() => openRejectModal(cr.id)}
                onDelete={() => setDeleteConfirmId(cr.id)}
                onResubmit={() => setResubmission(cr)}
                statusBadge={statusBadge} />
            ))}
          </div>
        )}

        {/* REJECT MODAL */}
        {rejectId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isRejecting && setRejectId(null)} />
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

        {/* DELETE CONFIRMATION MODAL */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteConfirmId(null)} />
            <div className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl max-w-md w-full p-6 z-10 space-y-4">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">Delete Change Request?</h3>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Are you sure you want to permanently delete this change request? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting} className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] rounded-md disabled:opacity-50">Cancel</button>
                <button type="button" onClick={doDelete} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 shadow-xs">
                  {isDeleting ? 'Deleting...' : 'Delete Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW DETAILS POPUP MODAL */}
        {viewModalCR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewModalCR(null)} />
            <div className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl max-w-2xl w-full p-6 z-10 space-y-5 my-8">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={statusBadge(viewModalCR.status)}>{viewModalCR.status}</span>
                    <span className="text-xs text-[var(--color-text-muted)] uppercase font-semibold">
                      {viewModalCR.action} {formatSingularCollection(viewModalCR.targetCollection)}
                    </span>
                    {viewModalCR.revisionCount > 0 && <span className="text-xs text-blue-500 font-semibold">v{viewModalCR.revisionCount + 1}</span>}
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[var(--color-text)]">
                    {(viewModalCR.proposedData?.name as string) || (viewModalCR.proposedData?.description as string) || `${viewModalCR.targetCollection} ${viewModalCR.action}`}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Requested by <span className="font-mono text-[var(--color-text-secondary)]">{viewModalCR.requestedBy}</span> on {new Date(viewModalCR.requestedAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <button type="button" onClick={() => setViewModalCR(null)} className="p-1 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Review Note */}
              {viewModalCR.reviewNote && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Review Note:</span>
                    <span>{viewModalCR.reviewNote}</span>
                  </div>
                </div>
              )}

              {/* Proposed Data Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Proposed Field Details</h4>
                <div className="bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                  {Object.entries(viewModalCR.proposedData || {}).map(([key, val]) => {
                    let displayVal = String(val);
                    if (val === null || val === undefined) displayVal = 'None';
                    else if (key === 'callTime') displayVal = formatTime12h(String(val)) || 'None';
                    else if (Array.isArray(val)) {
                      if (val.length === 0) displayVal = 'None';
                      else if (key === 'assignments') {
                        displayVal = val.map((v: any) => {
                          const name = typeof v.cameramanId === 'string' ? v.cameramanId.replace('cam-', 'Cameraman ') : 'Unknown';
                          const amt = v.amount !== null && v.amount !== undefined ? `₹${v.amount}` : 'Pending';
                          const time = v.callTime ? ` • ${formatTime12h(v.callTime)}` : '';
                          return `${name} (${amt}${time})`;
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
                      <div key={key} className="bg-[var(--color-surface)] p-2.5 rounded border border-[var(--color-border)] space-y-0.5">
                        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] block uppercase tracking-wider">{key}</span>
                        <span className="text-xs font-medium text-[var(--color-text)] block break-words font-mono">{displayVal}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)]">
                <button type="button" onClick={() => setDeleteConfirmId(viewModalCR.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                  <Trash2 className="w-4 h-4" /> Delete Request
                </button>

                <div className="flex items-center gap-2">
                  {viewModalCR.status === 'rejected' && user && canSubmitForApproval(user.role) && (
                    <button type="button" onClick={() => { setResubmission(viewModalCR); setViewModalCR(null); }} className="px-4 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-md">
                      Edit & Resubmit
                    </button>
                  )}
                  {isFounder && viewModalCR.status === 'pending' && (
                    <>
                      <button type="button" onClick={() => openRejectModal(viewModalCR.id)} className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md">
                        Reject
                      </button>
                      <button type="button" onClick={async () => { await handleApprove(viewModalCR.id); setViewModalCR(null); }} className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md">
                        Approve
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => setViewModalCR(null)} className="px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border)] rounded-md">
                    Close
                  </button>
                </div>
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
  cr: ChangeRequest; isFounder: boolean; canResubmit: boolean;
  onView: () => void; onApprove: () => Promise<void> | void; onReject: () => void; onDelete: () => void; onResubmit: () => void;
  statusBadge: (s: string) => string;
}

const CRCard: React.FC<CRCardProps> = ({ cr, isFounder, canResubmit, onView, onApprove, onReject, onDelete, onResubmit, statusBadge }) => {
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
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden transition-all hover:border-[var(--color-accent)]">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={onView}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={statusBadge(cr.status)}>{cr.status}</span>
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wider">{cr.action} {formatSingularCollection(cr.targetCollection)}</span>
            {cr.revisionCount > 0 && <span className="text-[10px] text-blue-500 font-semibold">v{cr.revisionCount + 1}</span>}
          </div>
          <p className="text-sm font-semibold text-[var(--color-text)] mt-1 truncate">{proposedName || `${cr.targetCollection} ${cr.action}`}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            by {cr.requestedBy} · {new Date(cr.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {isFounder && cr.status === 'pending' && (
            <>
              <button type="button" onClick={handleApproveClick} disabled={isApproving} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1 disabled:opacity-50 shadow-xs">
                <Check className="w-3.5 h-3.5" /> {isApproving ? 'Approving...' : 'Approve'}
              </button>
              <button type="button" onClick={onReject} disabled={isApproving} className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center gap-1 disabled:opacity-50 shadow-xs">
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            </>
          )}

          {cr.status === 'rejected' && canResubmit && (
            <button type="button" onClick={onResubmit} className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-md">
              Edit & Resubmit
            </button>
          )}

          {/* View Details Popup Trigger */}
          <button type="button" onClick={onView} title="View full details" className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] transition-colors border border-[var(--color-border)]">
            <Eye className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button type="button" onClick={onDelete} title="Delete change request" className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-[var(--color-border)]">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
