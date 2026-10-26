import React from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-[var(--color-surface)] border-[var(--color-success)]/40 text-[var(--color-text)]';
      case 'error':
        return 'bg-[var(--color-surface)] border-[var(--color-error)]/40 text-[var(--color-text)]';
      case 'warning':
        return 'bg-[var(--color-surface)] border-[var(--color-warning)]/40 text-[var(--color-text)]';
      default:
        return 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]';
    }
  };

  const Icon = type === 'success' ? CheckCircle : (type === 'error' || type === 'warning') ? AlertTriangle : Info;
  const iconColor = type === 'success' ? 'text-[var(--color-success)]' : type === 'error' ? 'text-[var(--color-error)]' : type === 'warning' ? 'text-[var(--color-warning)]' : 'text-[var(--color-accent)]';

  return (
    <div className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-2xs max-w-sm w-full transition-all duration-150 ease-out ${getStyles()}`}>
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
        <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
      </button>
    </div>
  );
};
