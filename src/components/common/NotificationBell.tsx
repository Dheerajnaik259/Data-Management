import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { AppNotification } from '../../types';

export const NotificationBell: React.FC = () => {
  const { notifications, changeRequests, handleMarkRead, handleMarkAllRead } = useData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = async (n: AppNotification) => {
    await handleMarkRead(n.id);
    setOpen(false);

    if (n.type === 'approved') {
      const cr = changeRequests.find(c => c.id === n.relatedChangeRequestId);
      if (cr && cr.targetDocId) {
        navigate(`/${cr.targetCollection}/${cr.targetDocId}`);
        return;
      }
    }
    navigate('/approvals');
  };

  const typeColors: Record<string, string> = {
    pending_approval: 'text-amber-600 dark:text-amber-400',
    approved: 'text-emerald-600 dark:text-emerald-400',
    rejected: 'text-red-600 dark:text-red-400',
    resubmitted: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)] transition-colors">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--color-accent)] text-white text-[10px] font-bold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={() => handleMarkAllRead()}
                className="text-[10px] font-medium text-[var(--color-accent)] hover:underline flex items-center gap-1">
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-72">
            {notifications.length === 0 ? (
              <p className="p-4 text-xs text-[var(--color-text-muted)] text-center">No notifications yet</p>
            ) : (
              notifications.slice(0, 20).map(n => (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors ${!n.read ? 'bg-[var(--color-accent)]/5' : ''}`}>
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] mt-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${typeColors[n.type] || 'text-[var(--color-text)]'}`}>
                        {n.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">{n.message}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                        {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {n.read && <Check className="w-3 h-3 text-[var(--color-text-muted)] mt-1 shrink-0" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
