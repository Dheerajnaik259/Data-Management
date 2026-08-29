import React from 'react';
import { Menu, Search } from 'lucide-react';
import { NotificationBell } from '../common/NotificationBell';

interface HeaderProps {
  title: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  action?: React.ReactNode;
  onOpenMobile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title, subtitle, searchQuery, onSearchChange,
  searchPlaceholder = 'Search records...', action, onOpenMobile,
}) => {
  return (
    <header className="sticky top-0 z-20 bg-[var(--color-surface)]/90 backdrop-blur-sm border-b border-[var(--color-border)] px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
      <div className="flex items-center gap-3">
        {onOpenMobile && (
          <button type="button" onClick={onOpenMobile}
            className="md:hidden p-2 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border)]">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input type="text" value={searchQuery || ''} onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all" />
          </div>
        )}
        <NotificationBell />
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </header>
  );
};
