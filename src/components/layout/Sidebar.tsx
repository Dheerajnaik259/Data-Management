import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Video, Film, IndianRupee, FileText, Receipt,
  LogOut, Settings, ClipboardCheck, Trash2, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { getRoleLabel } from '../../utils/permissions';

interface SidebarProps { onCloseMobile?: () => void; }

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, logout, isBackendLive } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { dashboardStats, shoots } = useData();
  const navigate = useNavigate();

  const handleLogout = async () => { try { await logout(); navigate('/login'); } catch {} };

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
    <aside className="w-60 h-full flex flex-col justify-between overflow-y-auto select-none"
      style={{ backgroundColor: 'var(--color-sidebar)', color: 'var(--color-text-on-dark, #FAF8F5)' }}>
      <div>
        {/* Brand header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold tracking-tight leading-none" style={{ color: '#FAF8F5' }}>SMM Ops</h1>
              <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: 'rgba(250,248,245,0.5)' }}>Operations Desk</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px]"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(250,248,245,0.6)' }}>
            <span className={`w-2 h-2 rounded-full ${isBackendLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-medium">{isBackendLive ? 'Live Supabase' : 'Local Demo'}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={event => {
                event.preventDefault();
                window.location.assign(item.to);
                onCloseMobile?.();
              }}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'font-semibold'
                      : 'hover:bg-white/[0.06]'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--color-accent)' : 'rgba(250,248,245,0.65)',
                })}>
                {({ isActive }) => (
                  <>
                    {/* Terracotta left accent bar for active item */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--color-accent)]" />
                    )}
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-white text-[10px] font-bold px-1.5">
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
      <div className="p-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Dark mode toggle */}
        <button onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
          style={{ color: 'rgba(250,248,245,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-serif text-sm font-bold"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(250,248,245,0.7)' }}>
            {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#FAF8F5' }}>
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(250,248,245,0.45)' }}>
              {user?.role ? getRoleLabel(user.role) : 'User'}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button type="button" onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors"
          style={{ color: 'rgba(250,248,245,0.5)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FCA5A5'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(250,248,245,0.5)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
