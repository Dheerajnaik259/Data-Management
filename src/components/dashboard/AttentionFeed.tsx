import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatSingularCollection } from '../../utils/formatCollection';
import { OverdueBadge } from '../common/OverdueBadge';
import { AlertCircle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ChangeRequest, Shoot } from '../../types';

interface AttentionItem {
  id: string;
  type: 'overdue_incoming' | 'overdue_outgoing' | 'pending_approval' | 'pending_rate' | 'rejected_request';
  title: string;
  subtitle: string;
  urgency: number; // 0 = highest, 100 = lowest
  amount?: number;
  link: string;
  overdueInfo?: any;
  actionLabel?: string;
  onAction?: () => void;
}

export const AttentionFeed: React.FC = () => {
  const { user } = useAuth();
  const { paymentRecords, changeRequests, shoots, clients, cameramen, handleToggleClientPayment, handleToggleCameramanPayment } = useData();

  const isAdmin = user?.role === 'admin';
  const isFounder = user?.role === 'founder';

  const items: AttentionItem[] = [];

  // 1. Overdue Client Payments (Both roles see this)
  paymentRecords
    .filter(r => r.type === 'incoming' && !r.isPaid && r.overdueInfo.isOverdue)
    .forEach(r => {
      items.push({
        id: `inc-${r.id}`,
        type: 'overdue_incoming',
        title: `Overdue from ${r.targetName}`,
        subtitle: `Shoot: ${r.shootDate}`,
        urgency: 10 - Math.min(10, r.overdueInfo.daysDiff), // Higher days diff = lower number = higher urgency
        amount: r.amount,
        link: `/clients/${r.targetId}`,
        overdueInfo: r.overdueInfo,
        actionLabel: 'Mark Paid',
        onAction: () => handleToggleClientPayment(r.shootId, true)
      });
    });

  // 2. Overdue Cameraman Payouts (Both roles see this)
  paymentRecords
    .filter(r => r.type === 'outgoing' && !r.isPaid && r.overdueInfo.isOverdue)
    .forEach(r => {
      items.push({
        id: `out-${r.id}`,
        type: 'overdue_outgoing',
        title: `Overdue payout to ${r.targetName}`,
        subtitle: `Shoot: ${r.shootDate}`,
        urgency: 15 - Math.min(10, r.overdueInfo.daysDiff),
        amount: r.amount,
        link: `/cameramen/${r.targetId}`,
        overdueInfo: r.overdueInfo,
        actionLabel: 'Mark Paid',
        onAction: () => handleToggleCameramanPayment(r.shootId, r.assignmentIndex ?? 0, true)
      });
    });

  // 3. Pending Change Requests
  changeRequests
    .filter(cr => cr.status === 'pending')
    .forEach(cr => {
      // Founder needs to approve them (high urgency)
      // Admin just sees them waiting (low urgency)
      items.push({
        id: `cr-${cr.id}`,
        type: 'pending_approval',
        title: `${cr.action === 'create' ? 'New' : 'Edit'} ${formatSingularCollection(cr.targetCollection)} awaiting approval`,
        subtitle: `Submitted by Admin on ${new Date(cr.requestedAt).toLocaleDateString()}`,
        urgency: isFounder ? 20 : 80,
        link: '/approvals'
      });
    });

  // 4. Rejected Change Requests (Admin needs to resubmit)
  if (isAdmin) {
    changeRequests
      .filter(cr => cr.status === 'rejected')
      .forEach(cr => {
        items.push({
          id: `cr-rej-${cr.id}`,
          type: 'rejected_request',
          title: `Rejected: ${cr.action === 'create' ? 'New' : 'Edit'} ${formatSingularCollection(cr.targetCollection)}`,
          subtitle: `Note: ${cr.reviewNote}`,
          urgency: 25,
          link: '/approvals'
        });
      });
  }

  // 5. Cameramen with pending rates
  shoots.forEach(shoot => {
    shoot.assignments?.forEach((a, idx) => {
      if (a.amount === null || a.amount === undefined) {
        const cam = cameramen.find(c => c.id === a.cameramanId);
        items.push({
          id: `rate-${shoot.id}-${idx}`,
          type: 'pending_rate',
          title: `Set payout rate for ${cam?.name || 'Cameraman'}`,
          subtitle: `Shoot: ${shoot.date} at ${shoot.location}`,
          urgency: 30, // Mid urgency
          link: `/cameramen/${a.cameramanId}`
        });
      }
    });
  });

  // Sort by urgency (lowest number first)
  items.sort((a, b) => a.urgency - b.urgency);
  const feedItems = items.slice(0, 15); // Show top 15 items

  if (feedItems.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs p-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
        <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">You're all caught up!</h3>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">No overdue payments, pending approvals, or pending rates.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          <h3 className="font-serif text-base font-bold text-[var(--color-text)]">Needs Your Attention</h3>
        </div>
        <span className="text-xs font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 rounded-full">
          {items.length} item{items.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex-1 divide-y divide-[var(--color-border)]">
        {feedItems.map(item => (
          <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:bg-[var(--color-bg-hover)] transition-colors group">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                item.type === 'overdue_incoming' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                item.type === 'overdue_outgoing' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                item.type === 'rejected_request' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {['overdue_incoming', 'overdue_outgoing', 'rejected_request'].includes(item.type) ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm text-[var(--color-text)]">{item.title}</span>
                  {item.overdueInfo && <OverdueBadge isPaid={false} overdueInfo={item.overdueInfo} size="sm" />}
                  {item.type === 'pending_approval' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">PENDING</span>}
                  {item.type === 'rejected_request' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">REJECTED</span>}
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{item.subtitle}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-right shrink-0">
              {item.amount !== undefined && (
                <span className="font-bold text-sm font-mono text-[var(--color-text)]">{formatCurrency(item.amount)}</span>
              )}
              {item.onAction ? (
                <button type="button" onClick={item.onAction} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded-md border border-emerald-200 dark:border-emerald-800" title={item.actionLabel}>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              ) : null}
              <Link to={item.link} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
      {items.length > 15 && (
        <div className="p-3 text-center bg-[var(--color-bg)] border-t border-[var(--color-border)]">
          <span className="text-[11px] text-[var(--color-text-muted)]">+{items.length - 15} more items</span>
        </div>
      )}
    </div>
  );
};
