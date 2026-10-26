import React from 'react';
import { OverdueInfo } from '../../types';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface OverdueBadgeProps {
  isPaid: boolean;
  overdueInfo?: OverdueInfo;
  className?: string;
  size?: 'sm' | 'md';
}

export const OverdueBadge: React.FC<OverdueBadgeProps> = ({
  isPaid,
  overdueInfo,
  className = '',
  size = 'md',
}) => {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (isPaid) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-400/20 ${pad} ${className}`}
      >
        <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Paid</span>
      </span>
    );
  }

  if (!overdueInfo) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-md bg-white/[0.04] text-[var(--color-text-secondary)] border border-[var(--color-border)] ${pad} ${className}`}
      >
        <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Pending</span>
      </span>
    );
  }

  if (overdueInfo.isOverdue) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-md bg-red-500/10 text-red-300 border border-red-400/25 ${pad} ${className}`}
      >
        <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>{overdueInfo.label}</span>
      </span>
    );
  }

  if (overdueInfo.label === 'Due Today') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-md bg-amber-500/10 text-amber-300 border border-amber-400/25 ${pad} ${className}`}
      >
        <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Due Today</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-md bg-white/[0.04] text-[var(--color-text-secondary)] border border-[var(--color-border)] ${pad} ${className}`}
    >
      <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{overdueInfo.label}</span>
    </span>
  );
};
