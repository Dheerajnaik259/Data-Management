import React, { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { OverdueBadge } from '../components/common/OverdueBadge';
import { ShootForm } from '../components/shoots/ShootForm';
import { TrendingUp, TrendingDown, Receipt, Film, AlertTriangle, Plus, ArrowRight, CheckCircle2, Calendar, MapPin, Clock, RotateCcw, MessageSquare, ShieldCheck, CheckSquare, Sliders, ChevronRight, UserCheck, PieChart, Building2, Check, X } from 'lucide-react';
import { GrowthChart } from '../components/dashboard/GrowthChart';
import { AttentionFeed } from '../components/dashboard/AttentionFeed';
import { buildCameramanScheduleWhatsAppUrl, buildClientPaymentReminderWhatsAppUrl } from '../utils/whatsapp';
import { formatTime12h } from '../utils/formatTime';
import { parseOperationalSettings } from '../config/business';
import { formatSingularCollection } from '../utils/formatCollection';

export const Dashboard: React.FC = () => {
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { shoots, clients, cameramen, expenses, paymentRecords, changeRequests, settings, dashboardStats, handleResetDemoData } = useData();
  const { user } = useAuth();
  const operationalSettings = useMemo(() => parseOperationalSettings(settings.find(s => s.key === 'operationalSettings')), [settings]);

  const [isShootFormOpen, setIsShootFormOpen] = useState(false);
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const cameramanMap = useMemo(() => new Map(cameramen.map(c => [c.id, c])), [cameramen]);

  const isAdmin = user?.role === 'admin';
  const isFounder = user?.role === 'founder';

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  // Admin Specific Lists
  const dispatchShoots = useMemo(() => {
    return [...shoots]
      .filter(s => s.date === todayStr || s.date === tomorrowStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [shoots, todayStr, tomorrowStr]);

  const upcomingShoots = useMemo(() => {
    return [...shoots]
      .filter(s => s.status === 'scheduled' || s.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [shoots, todayStr]);

  const myChangeRequests = useMemo(() => {
    if (!isAdmin) return [];
    return changeRequests.filter(cr => cr.requestedBy === user?.uid).slice(0, 5);
  }, [changeRequests, isAdmin, user?.uid]);

  const pendingFounderApprovals = useMemo(() => {
    return changeRequests.filter(cr => cr.status === 'pending');
  }, [changeRequests]);

  // Founder Specific Client Profitability Metrics
  const clientProfitabilityRanking = useMemo(() => {
    return clients.map(client => {
      const clientShoots = shoots.filter(s => s.clientId === client.id);
      const invoicedRevenue = clientShoots.reduce((sum, s) => sum + (s.clientAmount || 0), 0);
      const crewCosts = clientShoots.reduce((sum, s) => sum + (s.assignments || []).reduce((acc, a) => acc + (a.amount || 0), 0), 0);
      const shootIds = new Set(clientShoots.map(s => s.id));
      const directExpenses = expenses.filter(e => e.shootId && shootIds.has(e.shootId)).reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const totalCosts = crewCosts + directExpenses;
      const netMargin = invoicedRevenue - totalCosts;
      const marginPercent = invoicedRevenue > 0 ? Math.round((netMargin / invoicedRevenue) * 100) : 0;

      return {
        client,
        shootsCount: clientShoots.length,
        invoicedRevenue,
        totalCosts,
        netMargin,
        marginPercent,
      };
    }).sort((a, b) => b.netMargin - a.netMargin);
  }, [clients, shoots, expenses]);

  const pendingNetPosition = dashboardStats.pendingClientAmount - dashboardStats.pendingCameramanAmount;

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header
        title={isAdmin ? "Admin Operations Console" : "Founder Executive Dashboard"}
        subtitle={isAdmin ? "Daily shoot execution, crew dispatch call-sheets, and client receivable tracking" : "Real-time cashflow, client profitability margins, and governance approval queue"}
        onOpenMobile={onOpenMobileNav}
        action={
          <div className="flex items-center gap-2">
            {isFounder && pendingFounderApprovals.length > 0 && (
              <Link to="/approvals" className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded-md hover:bg-amber-200 transition-colors shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Approvals ({pendingFounderApprovals.length})</span>
              </Link>
            )}
            <button type="button" onClick={() => setIsShootFormOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs">
              <Plus className="w-4 h-4" /> <span>Schedule Shoot</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
        {/* Urgent Attention Alert Banner */}
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
              <span>Review Payments Desk</span> <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ── ADMIN DASHBOARD VIEW ── */}
        {isAdmin && (
          <>
            {/* Admin Stats Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Shoots Today / Tomorrow</span>
                  <div className="w-7 h-7 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center"><Film className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{dispatchShoots.length}</div>
                <div className="text-xs text-[var(--color-text-secondary)]"><span>{shoots.filter(s => s.status === 'scheduled').length} total active scheduled</span></div>
              </div>

              <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Client Invoices To Chase</span>
                  <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(dashboardStats.pendingClientAmount)}</div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{dashboardStats.pendingClientCount} pending</span>
                  {dashboardStats.overdueIncomingCount > 0 && <span className="text-red-600 dark:text-red-400 font-semibold">{dashboardStats.overdueIncomingCount} overdue</span>}
                </div>
              </div>

              <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Crew Payouts Pending</span>
                  <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center justify-center"><TrendingDown className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(dashboardStats.pendingCameramanAmount)}</div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{dashboardStats.pendingCameramanCount} payouts</span>
                  {dashboardStats.overdueOutgoingCount > 0 && <span className="text-red-600 dark:text-red-400 font-semibold">{dashboardStats.overdueOutgoingCount} overdue</span>}
                </div>
              </div>

              <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">My Submissions Queue</span>
                  <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center"><CheckSquare className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{myChangeRequests.filter(c => c.status === 'pending').length}</div>
                <div className="text-xs text-[var(--color-text-secondary)]"><span>Awaiting Founder review</span></div>
              </div>
            </section>

            {/* Daily Crew Dispatch Console */}
            <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <span>Daily Crew Dispatch Console</span>
                    <span className="text-[10px] bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-0.5 rounded font-semibold uppercase tracking-wider">Today / Tomorrow</span>
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">Send prefilled call-sheets and WhatsApp reminders to videographers for immediate shoots</p>
                </div>
              </div>

              {dispatchShoots.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No shoots scheduled specifically for today or tomorrow.</div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {dispatchShoots.map(shoot => {
                    const client = clientMap.get(shoot.clientId);
                    return (
                      <div key={shoot.id} className="p-5 space-y-3 hover:bg-[var(--color-bg-hover)] transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)]/60 pb-3">
                          <div>
                            <span className="font-serif font-bold text-sm text-[var(--color-text)]">{client?.name || 'Client'}</span>
                            <span className="text-xs text-[var(--color-text-secondary)] ml-3 inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-[var(--color-text-muted)]" />{shoot.location}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-mono text-[var(--color-text-secondary)] inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />{shoot.date}</span>
                            <Link to={`/shoots/${shoot.id}`} className="font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-0.5">
                              <span>Shoot Details</span> <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>

                        {/* Assigned Crew Dispatch Buttons */}
                        <div>
                          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Assigned Videographers & WhatsApp Dispatch</span>
                          {!shoot.assignments || shoot.assignments.length === 0 ? (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ No cameramen assigned yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {shoot.assignments.map((assignment, idx) => {
                                const cam = cameramanMap.get(assignment.cameramanId);
                                const scheduleWhatsAppUrl = cam ? buildCameramanScheduleWhatsAppUrl({
                                  phone: cam.phone,
                                  cameramanName: cam.name,
                                  clientName: client?.name,
                                  date: shoot.date,
                                  callTime: assignment.callTime || shoot.callTime,
                                  location: shoot.location,
                                  template: operationalSettings.crewScheduleTemplate,
                                }) : null;

                                return (
                                  <div key={idx} className="p-2.5 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                                    <div>
                                      <span className="font-semibold text-[var(--color-text)] block">{cam?.name || 'Crew Member'}</span>
                                      <span className="text-[10px] text-[var(--color-text-secondary)] block">Call: {formatTime12h(assignment.callTime || shoot.callTime) || 'TBD'}</span>
                                    </div>
                                    {scheduleWhatsAppUrl && (
                                      <a
                                        href={scheduleWhatsAppUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 rounded border border-emerald-300 flex items-center gap-1 transition-colors"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                        <span>Call Sheet</span>
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* My Submissions Queue Card */}
            <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[var(--color-text)]">My Change Requests Submitted for Approval</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">Status of records submitted for Founder review</p>
                </div>
                <Link to="/approvals" className="text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] inline-flex items-center gap-1">
                  <span>View All Approvals</span> <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {myChangeRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No pending or recent change requests submitted.</div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {myChangeRequests.map(cr => (
                    <div key={cr.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--color-text)] capitalize">{cr.action} {formatSingularCollection(cr.targetCollection)}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${cr.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : cr.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                            {cr.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Submitted on {new Date(cr.requestedAt).toLocaleDateString()}</p>
                        {cr.status === 'rejected' && cr.reviewNote && (
                          <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-1">Founder Note: &quot;{cr.reviewNote}&quot;</p>
                        )}
                      </div>
                      <Link to="/approvals" className="px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-hover)]">
                        {cr.status === 'rejected' ? 'Resubmit' : 'View Request'}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── FOUNDER EXECUTIVE DASHBOARD VIEW ── */}
        {isFounder && (
          <>
            {/* Founder High-Level Metrics */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Pending Net Position</span>
                  <div className="w-7 h-7 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center font-bold text-xs">₹</div>
                </div>
                <div className={`text-2xl font-bold font-serif ${pendingNetPosition >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  {formatCurrency(pendingNetPosition)}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]"><span>Outstanding receivables minus pending crew payouts</span></div>
              </div>

              <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Pending Approvals Queue</span>
                  <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center"><ShieldCheck className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{pendingFounderApprovals.length}</div>
                <div className="text-xs text-[var(--color-text-secondary)]"><span>Admin submissions awaiting approval</span></div>
              </div>

              <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Total Client Receivables</span>
                  <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(dashboardStats.pendingClientAmount)}</div>
                <div className="text-xs text-[var(--color-text-secondary)]"><span>{dashboardStats.pendingClientCount} active client invoices</span></div>
              </div>

              <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Total Operating Expenses</span>
                  <div className="w-7 h-7 rounded-md bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)] flex items-center justify-center"><Receipt className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(dashboardStats.totalExpenses)}</div>
                <div className="text-xs text-[var(--color-text-secondary)]"><span>{expenses.length} logged receipts</span></div>
              </div>
            </section>

            {/* Governance Callout Banner */}
            {pendingFounderApprovals.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">Governance Action Required</h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Admin has submitted <span className="font-bold">{pendingFounderApprovals.length} record update{pendingFounderApprovals.length > 1 ? 's' : ''}</span> for your review and approval.
                    </p>
                  </div>
                </div>
                <Link to="/approvals" className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors shrink-0 flex items-center gap-1">
                  <span>Review Approvals Queue</span> <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Client Profitability & Margin Ranking Table */}
            <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--color-accent)]" />
                    <span>Client Profitability & Margin Ranking</span>
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">Revenue minus crew payouts and direct shoot expenses per client account</p>
                </div>
              </div>

              {clientProfitabilityRanking.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No client accounts available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                    <thead className="bg-[var(--color-bg)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                      <tr>
                        <th className="px-6 py-3.5 font-semibold">Client Brand Name</th>
                        <th className="px-6 py-3.5 font-semibold text-center">Shoots</th>
                        <th className="px-6 py-3.5 font-semibold text-right">Invoiced Revenue (₹)</th>
                        <th className="px-6 py-3.5 font-semibold text-right">Total Production Cost (₹)</th>
                        <th className="px-6 py-3.5 font-semibold text-right">Net Margin (₹)</th>
                        <th className="px-6 py-3.5 font-semibold text-center">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {clientProfitabilityRanking.map(item => (
                        <tr key={item.client.id} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                          <td className="px-6 py-4 font-semibold text-[var(--color-text)]">
                            <Link to={`/clients/${item.client.id}`} className="hover:underline">{item.client.name}</Link>
                          </td>
                          <td className="px-6 py-4 text-center font-mono">{item.shootsCount}</td>
                          <td className="px-6 py-4 text-right font-mono font-semibold text-[var(--color-text)]">{formatCurrency(item.invoicedRevenue)}</td>
                          <td className="px-6 py-4 text-right font-mono text-red-600 dark:text-red-400">{formatCurrency(item.totalCosts)}</td>
                          <td className={`px-6 py-4 text-right font-mono font-bold ${item.netMargin >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                            {formatCurrency(item.netMargin)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${item.marginPercent >= 60 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : item.marginPercent >= 30 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                              {item.marginPercent}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {/* ── COMMON SECTIONS ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <AttentionFeed />
          </div>
        </section>

        <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-bold text-[var(--color-text)]">Active Shoot Schedule Summary</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Jobs scheduled for execution and immediate production</p>
            </div>
            <Link to="/shoots" className="text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] inline-flex items-center gap-1">
              <span>View All Shoots</span> <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {upcomingShoots.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No upcoming shoots scheduled.</div>
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

        <GrowthChart shoots={shoots} />
      </main>

      <ShootForm isOpen={isShootFormOpen} onClose={() => setIsShootFormOpen(false)} />
    </div>
  );
};
