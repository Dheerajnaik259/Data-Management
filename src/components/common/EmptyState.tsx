import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] mb-4">
        {icon || <FolderOpen className="w-6 h-6 text-[var(--color-text-muted)]" />}
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[var(--color-text-on-accent)] bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
