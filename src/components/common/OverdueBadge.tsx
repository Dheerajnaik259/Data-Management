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
        className={`inline-flex items-center gap-1 font-medium rounded-md bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] ${pad} ${className}`}
      >
        <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Paid</span>
      </span>
    );
  }

  if (!overdueInfo) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-md bg-[#F5F5F4] text-[#57534E] border border-[#E7E5E4] ${pad} ${className}`}
      >
        <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Pending</span>
      </span>
    );
  }

  if (overdueInfo.isOverdue) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-md bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] animate-pulse-subtle ${pad} ${className}`}
      >
        <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>{overdueInfo.label}</span>
      </span>
    );
  }

  if (overdueInfo.label === 'Due Today') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-md bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] ${pad} ${className}`}
      >
        <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Due Today</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-md bg-[#F5F5F4] text-[#57534E] border border-[#E7E5E4] ${pad} ${className}`}
    >
      <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{overdueInfo.label}</span>
    </span>
  );
};
