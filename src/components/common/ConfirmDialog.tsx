import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  isDestructive = true,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="glass-panel-elevated relative max-w-md w-full p-6 overflow-hidden z-10"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isDestructive ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 id="confirm-dialog-title" className="text-lg font-bold text-[var(--color-text)]">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close confirmation dialog"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">{message}</p>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] bg-white/[0.035] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-xs ${
                isDestructive
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-on-accent)]'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
