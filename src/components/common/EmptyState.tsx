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
      className={`flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-[#E5E0DA] ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E5E0DA] flex items-center justify-center text-[#78716C] mb-4">
        {icon || <FolderOpen className="w-6 h-6 text-[#A8A29E]" />}
      </div>
      <h3 className="font-serif text-lg font-semibold text-[#1C1917] mb-1">{title}</h3>
      <p className="text-sm text-[#78716C] max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#C85A32] rounded-md hover:bg-[#B84A24] transition-colors shadow-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
