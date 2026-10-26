import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Video, Film, IndianRupee, FileText, Receipt,
  LogOut, Settings, ClipboardCheck, Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { getRoleLabel } from '../../utils/permissions';
import { useToast } from '../../context/ToastContext';

const mpixelMediaLogo = new URL('../../assets/mpixelmedia-logo.png', import.meta.url).href;

interface SidebarProps { onCloseMobile?: () => void; }

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, logout, isBackendLive } = useAuth();
  const { dashboardStats, shoots } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to sign out.' });
    }
  };

  // Count cameramen assignments with pending rates (amount == null)
  const pendingCameramanRates = useMemo(() => {
    let count = 0;
    shoots.forEach(s => {
      s.assignments?.forEach(a => {
        if (a.amount === null || a.amount === undefined) count++;
      });
    });
    return count;
  }, [shoots]);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/shoots', label: 'Shoots', icon: Film },
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/cameramen', label: 'Cameramen', icon: Video, badge: pendingCameramanRates },
    { to: '/payments', label: 'Payments', icon: IndianRupee },
    { to: '/invoices', label: 'Invoices', icon: FileText },
    { to: '/expenses', label: 'Expenses', icon: Receipt },
    { to: '/approvals', label: 'Approvals', icon: ClipboardCheck, badge: dashboardStats.pendingApprovalsCount },
    { to: '/recycle-bin', label: 'Recycle Bin', icon: Trash2 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 h-full flex flex-col justify-between overflow-y-auto select-none backdrop-blur-xl border-r border-[var(--color-border)]"
      style={{ backgroundColor: 'var(--color-sidebar)', color: 'var(--color-text)' }}>
      <div>
        {/* Brand header */}
        <div className="p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <img src={mpixelMediaLogo} alt="mpixelmedia" className="w-12 h-12 rounded-lg object-cover shrink-0" />
            <div>
              <h1 className="text-sm font-semibold tracking-tight leading-tight text-[var(--color-text)]">ERP Mpixel Media</h1>
              <span className="text-[10px] font-medium tracking-wide uppercase text-[var(--color-text-muted)]">Operations Desk</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--color-border)] bg-white/[0.035] text-[11px] text-[var(--color-text-secondary)]">
            <span className={`w-2 h-2 rounded-full ${isBackendLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-medium">{isBackendLive ? 'Live System' : 'Offline'}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1" aria-label="Main navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={() => onCloseMobile?.()}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'font-semibold bg-[rgba(66,222,213,0.09)]'
                      : 'hover:bg-white/[0.045]'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                })}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-[var(--color-accent)]" />
                    )}
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-text-on-accent)] text-[10px] font-bold px-1.5">
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 space-y-3 border-t border-[var(--color-border)]">
        {/* User info */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-white/[0.08] text-[var(--color-accent-mint)]">
            {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-[var(--color-text)]">
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-[10px] truncate text-[var(--color-text-muted)]">
              {user?.role ? getRoleLabel(user.role) : 'User'}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button type="button" onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md text-[var(--color-text-secondary)] hover:text-red-300 hover:bg-red-500/10 transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
