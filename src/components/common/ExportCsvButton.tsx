import React from 'react';
import { Download } from 'lucide-react';
import { exportToCsv } from '../../utils/csvExport';
import { useToast } from '../../context/ToastContext';

interface ExportCsvButtonProps<T extends Record<string, unknown>> {
  filename: string;
  data: T[];
  headers?: { key: keyof T; label: string }[];
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function ExportCsvButton<T extends Record<string, unknown>>({
  filename,
  data,
  headers,
  label = 'Export CSV',
  className = '',
  disabled = false,
}: ExportCsvButtonProps<T>) {
  const { toast } = useToast();
  const handleExport = () => {
    if (!data.length) {
      toast({ type: 'info', message: 'No records are available to export.' });
      return;
    }
    if (!exportToCsv(filename, data, headers)) {
      toast({ type: 'info', message: 'No records are available to export.' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className={`liquid-glass-button inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] rounded-lg hover:text-[var(--color-text)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Download CSV spreadsheet"
    >
      <Download className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
      <span>{label}</span>
    </button>
  );
}
