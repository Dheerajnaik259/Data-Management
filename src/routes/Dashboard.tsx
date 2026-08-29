import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { formatCurrency } from '../utils/formatCurrency';
import { OverdueBadge } from '../components/common/OverdueBadge';
import { ShootForm } from '../components/shoots/ShootForm';
import { TrendingUp, TrendingDown, Receipt, Film, AlertTriangle, Plus, ArrowRight, CheckCircle2, Calendar, MapPin, Clock, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GrowthChart } from '../components/dashboard/GrowthChart';
import { AttentionFeed } from '../components/dashboard/AttentionFeed';

export const Dashboard: React.FC = () => {
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { shoots, clients, expenses, paymentRecords, dashboardStats, handleToggleClientPayment, handleToggleCameramanPayment, handleResetDemoData } = useData();
  const { user } = useAuth();

  const [isShootFormOpen, setIsShootFormOpen] = useState(false);
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingShoots = shoots.filter(s => s.status === 'scheduled' || s.date >= todayStr).slice(0, 5);
  const recentExpenses = [...expenses].slice(0, 5);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header title="Operations Dashboard" subtitle="Real-time operational summary, upcoming shoots, and pending disbursements" onOpenMobile={onOpenMobileNav}
        action={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button type="button" onClick={handleResetDemoData} className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors" title="Reset with realistic demo records">
                <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reset Demo</span>
              </button>
            )}
            <button type="button" onClick={() => setIsShootFormOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs">
              <Plus className="w-4 h-4" /> <span>Schedule Shoot</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
        {(dashboardStats.overdueIncomingCount > 0 || dashboardStats.overdueOutgoingCount > 0) && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">Payment Attention Required</h4>
                <p className="text-xs text-red-700 dark:text-red-400">
                  {dashboardStats.overdueIncomingCount > 0 && <span className="font-semibold">{dashboardStats.overdueIncomingCount} client payment{dashboardStats.overdueIncomingCount > 1 ? 's are' : ' is'} overdue. </span>}
                  {dashboardStats.overdueOutgoingCount > 0 && <span>{dashboardStats.overdueOutgoingCount} cameraman payout{dashboardStats.overdueOutgoingCount > 1 ? 's are' : ' is'} overdue.</span>}
                </p>
              </div>
            </div>
            <Link to="/payments" className="text-xs font-bold text-red-800 dark:text-red-300 hover:underline inline-flex items-center gap-1 shrink-0">
              <span>Review in Payments Desk</span> <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Money In (Pending)</span>
              <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(dashboardStats.pendingClientAmount)}</div>
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>{dashboardStats.pendingClientCount} pending invoices</span>
              {dashboardStats.overdueIncomingCount > 0 && <span className="text-red-600 dark:text-red-400 font-semibold">{dashboardStats.overdueIncomingCount} overdue</span>}
            </div>
          </div>

          <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Money Out (Disbursements)</span>
              <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center justify-center"><TrendingDown className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(dashboardStats.pendingCameramanAmount)}</div>
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>{dashboardStats.pendingCameramanCount} crew payouts</span>
              {dashboardStats.overdueOutgoingCount > 0 && <span className="text-red-600 dark:text-red-400 font-semibold">{dashboardStats.overdueOutgoingCount} overdue</span>}
            </div>
          </div>

          <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Total Expenses Logged</span>
              <div className="w-7 h-7 rounded-md bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)] flex items-center justify-center"><Receipt className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(dashboardStats.totalExpenses)}</div>
            <div className="text-xs text-[var(--color-text-secondary)]"><span>{expenses.length} operating receipts</span></div>
          </div>

          <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Upcoming Shoot Jobs</span>
              <div className="w-7 h-7 rounded-md bg-[var(--color-bg)] text-[var(--color-accent)] border border-[var(--color-border)] flex items-center justify-center"><Film className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{dashboardStats.upcomingShootsCount}</div>
            <div className="text-xs text-[var(--color-text-secondary)]"><span>{shoots.length} total historical shoots</span></div>
          </div>
        </section>

        <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base font-bold text-[var(--color-text)]">Upcoming & Active Shoot Schedule</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">Jobs scheduled for execution and immediate production</p>
            </div>
            <Link to="/shoots" className="text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] inline-flex items-center gap-1">
              <span>View All Shoots</span> <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {upcomingShoots.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No upcoming shoots scheduled. Click &ldquo;Schedule Shoot&rdquo; to add your next production job.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                <thead className="bg-[var(--color-bg)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Client / Brand</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold">Location</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Client Amount</th>
                    <th className="px-6 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {upcomingShoots.map(shoot => {
                    const client = clientMap.get(shoot.clientId);
                    return (
                      <tr key={shoot.id} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                        <td className="px-6 py-3.5 font-medium text-[var(--color-text)]"><Link to={`/clients/${shoot.clientId}`} className="hover:underline font-semibold">{client ? client.name : 'Unknown Client'}</Link></td>
                        <td className="px-6 py-3.5 font-mono text-[var(--color-text-secondary)]"><span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />{shoot.date}</span></td>
                        <td className="px-6 py-3.5 text-[var(--color-text-secondary)]"><span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />{shoot.location}</span></td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider ${shoot.status === 'done' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                            {shoot.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-semibold font-mono text-[var(--color-text)]">{formatCurrency(shoot.clientAmount)}</td>
                        <td className="px-6 py-3.5 text-right"><Link to={`/shoots/${shoot.id}`} className="text-xs font-semibold text-[var(--color-text-primary)] hover:underline">Open Workspace &rarr;</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <AttentionFeed />
          </div>
        </section>

        <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-bold text-[var(--color-text)]">Recent Operating Expenses</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Travel, gear rental, and software costs outside cameraman payouts</p>
            </div>
            <Link to="/expenses" className="text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] inline-flex items-center gap-1">
              <span>Manage Expenses</span> <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No expense records logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                <thead className="bg-[var(--color-bg)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Description</th>
                    <th className="px-6 py-3 font-semibold">Category</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {recentExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                      <td className="px-6 py-3.5 font-medium text-[var(--color-text)]">{exp.description}</td>
                      <td className="px-6 py-3.5"><span className="capitalize px-2 py-0.5 bg-[var(--color-bg)] rounded border border-[var(--color-border)] text-[11px]">{exp.category}</span></td>
                      <td className="px-6 py-3.5 font-mono text-[var(--color-text-secondary)]">{exp.date}</td>
                      <td className="px-6 py-3.5 text-right font-semibold font-mono text-[var(--color-text)]">{formatCurrency(exp.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <GrowthChart shoots={shoots} />
      </main>

      <ShootForm isOpen={isShootFormOpen} onClose={() => setIsShootFormOpen(false)} />
    </div>
  );
};
