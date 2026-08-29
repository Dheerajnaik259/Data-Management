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
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#44403C] bg-white border border-[#E5E0DA] rounded-md hover:bg-[#FAF8F5] hover:text-[#1C1917] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs ${className}`}
      title="Download CSV spreadsheet"
    >
      <Download className="w-3.5 h-3.5 text-[#78716C]" />
      <span>{label}</span>
    </button>
  );
}
