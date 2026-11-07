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

  const isCompact = !onCloseMobile;
  const navGroups = [
    {
      label: 'Workspace',
      items: [
        { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/clients', label: 'Clients', icon: Users },
        { to: '/shoots', label: 'Shoots', icon: Film },
        { to: '/cameramen', label: 'Cameramen', icon: Video, badge: pendingCameramanRates },
      ],
    },
    {
      label: 'Finance',
      items: [
        { to: '/payments', label: 'Payments', icon: IndianRupee },
        { to: '/invoices', label: 'Invoices', icon: FileText },
        { to: '/expenses', label: 'Expenses', icon: Receipt },
      ],
    },
    {
      label: 'Governance',
      items: [
        { to: '/approvals', label: 'Approvals', icon: ClipboardCheck, badge: dashboardStats.pendingApprovalsCount },
        { to: '/recycle-bin', label: 'Recycle Bin', icon: Trash2 },
      ],
    },
  ];

  return (
    <aside
      className={`liquid-sidebar h-full flex flex-col justify-between select-none ${isCompact ? 'is-compact' : ''}`}
      aria-label="Application navigation"
      style={{ backgroundColor: 'var(--color-sidebar)', color: 'var(--color-text)' }}
    >
      <div>
        {/* Brand header */}
        <div className={`border-b border-white/[0.07] ${isCompact ? 'px-3 py-4' : 'p-5'}`}>
          <div className={`flex items-center ${isCompact ? 'justify-center' : 'gap-3'}`}>
            <img
              src={mpixelMediaLogo}
              alt="mpixelmedia"
              title={isCompact ? 'ERP Mpixel Media' : undefined}
              className={`${isCompact ? 'w-11 h-11' : 'w-12 h-12'} rounded-xl object-contain shrink-0`}
            />
            {!isCompact && (
              <div>
                <h1 className="text-sm font-semibold tracking-tight leading-tight text-[var(--color-text)]">ERP Mpixel Media</h1>
                <span className="text-[10px] font-medium tracking-wide uppercase text-[var(--color-text-muted)]">Operations Desk</span>
              </div>
            )}
          </div>
          <div
            className={`liquid-system-status flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.035] text-[11px] text-[var(--color-text-secondary)] ${isCompact ? 'mx-auto mt-3 h-7 w-7 justify-center rounded-full' : 'mt-4 px-2.5 py-1.5'}`}
            title={isBackendLive ? 'Live System' : 'Offline'}
            aria-label={isBackendLive ? 'Backend status: live' : 'Backend status: offline'}
          >
            <span className={`w-2 h-2 rounded-full ${isBackendLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {!isCompact && <span className="font-medium">{isBackendLive ? 'Live System' : 'Offline'}</span>}
          </div>
        </div>

        <nav className="liquid-sidebar-navigation px-2.5 py-3" aria-label="Main navigation">
          {navGroups.map((group, groupIndex) => (
            <div
              key={group.label}
              role="group"
              aria-label={group.label}
              className={groupIndex > 0 ? 'liquid-nav-group mt-3 border-t border-white/[0.07] pt-3' : ''}
            >
              {!isCompact && (
                <p className="px-3 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => onCloseMobile?.()}
                      title={isCompact ? item.label : undefined}
                      aria-label={isCompact ? item.label : undefined}
                      className={({ isActive }) =>
                        `liquid-nav-link relative flex items-center rounded-xl text-[13px] font-medium ${isCompact ? 'mx-auto h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5'} ${isActive ? 'is-active font-semibold' : ''}`
                      }
                      style={({ isActive }) => ({
                        color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className={`absolute ${isCompact ? 'left-0 top-1/2 h-5 w-[2px] -translate-y-1/2' : 'left-0 top-1/2 h-5 w-[2px] -translate-y-1/2'} rounded-r-full bg-[var(--color-accent)]`} />
                          )}
                          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                          {!isCompact && <span className="min-w-0 flex-1">{item.label}</span>}
                          {item.badge ? (
                            <span className={`liquid-nav-badge flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-text-on-accent)] font-bold ${isCompact ? 'absolute -right-1 -top-1 min-w-[17px] h-[17px] px-1 text-[9px]' : 'min-w-[20px] h-5 px-1.5 text-[10px]'}`}>
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className={`border-t border-white/[0.07] ${isCompact ? 'px-2.5 py-3' : 'p-4'} space-y-2`}>
        <NavLink
          to="/settings"
          onClick={() => onCloseMobile?.()}
          title={isCompact ? 'Settings' : undefined}
          aria-label={isCompact ? 'Settings' : undefined}
          className={({ isActive }) =>
            `liquid-nav-link flex items-center rounded-xl text-[13px] font-medium ${isCompact ? 'mx-auto h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5'} ${isActive ? 'is-active font-semibold' : ''}`
          }
          style={({ isActive }) => ({
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          })}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {!isCompact && <span>Settings</span>}
        </NavLink>
        {/* User info */}
        <div
          className={`flex items-center ${isCompact ? 'justify-center py-1' : 'gap-3 px-2'}`}
          title={`${user?.displayName || user?.email || 'User'} · ${user?.role ? getRoleLabel(user.role) : 'User'}`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.08] text-sm font-bold text-[var(--color-accent-mint)]">
            {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
          {!isCompact && <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-[var(--color-text)]">
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-[10px] truncate text-[var(--color-text-muted)]">
              {user?.role ? getRoleLabel(user.role) : 'User'}
            </p>
          </div>}
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleLogout}
          title={isCompact ? 'Sign out' : undefined}
          aria-label="Sign out"
          className={`liquid-signout flex items-center justify-center rounded-xl text-xs font-medium text-[var(--color-text-secondary)] hover:text-red-300 hover:bg-red-500/10 ${isCompact ? 'mx-auto h-10 w-10' : 'w-full gap-2 px-3 py-2.5'}`}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {!isCompact && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
