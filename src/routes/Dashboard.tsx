import React, { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { ShootForm } from '../components/shoots/ShootForm';
import { 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Film, 
  AlertTriangle, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  CheckSquare, 
  UserCheck, 
  Building2, 
  MessageSquare,
  PieChart,
  Users
} from 'lucide-react';
import { GrowthChart } from '../components/dashboard/GrowthChart';
import { AttentionFeed } from '../components/dashboard/AttentionFeed';
import { buildCameramanScheduleWhatsAppUrl } from '../utils/whatsapp';
import { formatTime12h } from '../utils/formatTime';
import { formatSingularCollection } from '../utils/formatCollection';

export const Dashboard: React.FC = () => {
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { shoots, clients, cameramen, expenses, changeRequests, dashboardStats, handleToggleCameramanCheckIn } = useData();
  const { user } = useAuth();

  const [isShootFormOpen, setIsShootFormOpen] = useState(false);
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const cameramanMap = useMemo(() => new Map(cameramen.map(c => [c.id, c])), [cameramen]);

  const isAdmin = user?.role === 'admin';
  const isFounder = user?.role === 'founder';

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  // ── ADMIN COMPUTED DATA ──

  // Shoots scheduled today or tomorrow for crew dispatch console
  const dispatchShoots = useMemo(() => {
    return [...shoots]
      .filter(s => s.date === todayStr || s.date === tomorrowStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [shoots, todayStr, tomorrowStr]);

  // Active / upcoming shoots for summary
  const upcomingShoots = useMemo(() => {
    return [...shoots]
      .filter(s => s.status === 'scheduled' || s.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [shoots, todayStr]);

  // Admin's submitted change requests
  const myChangeRequests = useMemo(() => {
    if (!isAdmin) return [];
    return changeRequests.filter(cr => cr.requestedBy === user?.uid).slice(0, 5);
  }, [changeRequests, isAdmin, user?.uid]);

  // Deliverables Statistics (from shoots.deliverables schema - cloud link is optional)
  const deliverablesStats = useMemo(() => {
    let total = 0;
    let shootsCount = 0;
    let withCloudLink = 0;
    shoots.forEach(shoot => {
      if (shoot.deliverables && shoot.deliverables.length > 0) {
        shootsCount++;
        shoot.deliverables.forEach(del => {
          const count = del.count || 1;
          total += count;
          if (del.fileLink && del.fileLink.trim()) {
            withCloudLink += count;
          }
        });
      }
    });
    return { totalDeliverablesCount: total, shootsWithDeliverablesCount: shootsCount, withCloudLinkCount: withCloudLink };
  }, [shoots]);

  // Shoots without assigned crew (from shoots.assignments schema)
  const shootsWithoutCrewCount = useMemo(() => {
    return shoots.filter(s => (s.status === 'scheduled' || s.date >= todayStr) && (!s.assignments || s.assignments.length === 0 || s.assignments.every(a => !a.cameramanId))).length;
  }, [shoots, todayStr]);

  // Crew Availability Statistics (from cameramen & shoots schema)
  const crewAvailabilityStats = useMemo(() => {
    const totalCrew = cameramen.length;
    const assignedSet = new Set<string>();
    shoots.forEach(s => {
      if (s.status === 'scheduled' || s.date >= todayStr) {
        (s.assignments || []).forEach(a => {
          if (a.cameramanId) assignedSet.add(a.cameramanId);
        });
      }
    });
    const unavailableCount = cameramen.filter(c => (c.unavailability || []).some(u => u.date === todayStr)).length;
    return {
      totalCrew,
      assignedCrewCount: assignedSet.size,
      unavailableCrewCount: unavailableCount,
    };
  }, [cameramen, shoots, todayStr]);

  // Operational Exceptions list for Admin "Action Required"
  const operationalExceptions = useMemo(() => {
    const list: Array<{ id: string; label: string; link: string; type: 'error' | 'warning' }> = [];
    
    if (shootsWithoutCrewCount > 0) {
      list.push({ id: 'no-crew', label: `${shootsWithoutCrewCount} shoot(s) without assigned crew`, link: '/shoots', type: 'error' });
    }
    if (dashboardStats.overdueIncomingCount > 0) {
      list.push({ id: 'overdue-inc', label: `${dashboardStats.overdueIncomingCount} overdue client invoice(s)`, link: '/payments', type: 'error' });
    }
    if (dashboardStats.pendingCameramanCount > 0) {
      list.push({ id: 'pending-cam', label: `${dashboardStats.pendingCameramanCount} pending crew payout(s)`, link: '/payments', type: 'warning' });
    }
    const rejectedCount = myChangeRequests.filter(c => c.status === 'rejected').length;
    if (rejectedCount > 0) {
      list.push({ id: 'rejected-req', label: `${rejectedCount} rejected submission(s) requiring edit & resubmit`, link: '/approvals', type: 'warning' });
    }
    return list;
  }, [shootsWithoutCrewCount, dashboardStats.overdueIncomingCount, dashboardStats.pendingCameramanCount, myChangeRequests]);

  // ── FOUNDER COMPUTED DATA ──

  const pendingFounderApprovals = useMemo(() => {
    return changeRequests.filter(cr => cr.status === 'pending');
  }, [changeRequests]);

  // Client Profitability Metrics (calculated from shoots, assignments, & expenses)
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

  // Financial Snapshot & Cashflow (from schema)
  const netOperatingCashflow = dashboardStats.paidClientAmount - dashboardStats.paidCameramanAmount - dashboardStats.totalExpenses;
  const totalBilled = dashboardStats.paidClientAmount + dashboardStats.pendingClientAmount;
  const collectionRate = totalBilled > 0 ? Math.round((dashboardStats.paidClientAmount / totalBilled) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header
        title={isAdmin ? "Admin Operations Console" : "Founder Executive Dashboard"}
        subtitle={isAdmin ? "Execute, dispatch crew, follow up on payments, and submit operational changes" : "Review governance, monitor cashflow, analyze profitability, and track revenue growth"}
        onOpenMobile={onOpenMobileNav}
        action={
          <div className="flex items-center gap-2">
            {isFounder && pendingFounderApprovals.length > 0 && (
              <Link to="/approvals" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded hover:bg-[var(--color-background)] transition-colors">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Approvals ({pendingFounderApprovals.length})</span>
              </Link>
            )}
            <button type="button" onClick={() => setIsShootFormOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded hover:bg-[var(--color-accent-hover)] transition-colors">
              <Plus className="w-3.5 h-3.5" /> <span>Schedule Shoot</span>
            </button>
          </div>
        }
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* ════════════════════════════════════════════════════════════ */}
        {/* ── ADMIN DASHBOARD VIEW ── */}
        {/* ════════════════════════════════════════════════════════════ */}
        {isAdmin && (
          <>
            {/* Top KPI Cards Grid (Admin Focus - Clean Line Icons, No Circle Bgs) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* 1. Shoots Today / Tomorrow */}
              <Link to="/shoots" className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors space-y-2 block">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Shoots Today / Tomorrow</span>
                  <Film className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
                <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{dispatchShoots.length}</div>
                <div className="text-xs text-[var(--color-text-secondary)]"><span>{shoots.filter(s => s.status === 'scheduled').length} total active scheduled</span></div>
              </Link>

              {/* 2. Client Invoices to Chase */}
              <Link to="/payments" className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors space-y-2 block">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Invoices To Chase</span>
                  <TrendingUp className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
                <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{formatCurrency(dashboardStats.pendingClientAmount)}</div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{dashboardStats.pendingClientCount} pending</span>
                  {dashboardStats.overdueIncomingCount > 0 && <span className="text-[var(--color-error)] font-semibold">{dashboardStats.overdueIncomingCount} overdue</span>}
                </div>
              </Link>

              {/* 3. Crew Payouts Status */}
              <Link to="/payments" className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors space-y-2 block">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Crew Payouts Status</span>
                  <TrendingDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
                <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{formatCurrency(dashboardStats.pendingCameramanAmount)}</div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{dashboardStats.pendingCameramanCount} pending</span>
                  <span className="text-[var(--color-success)] font-semibold">{formatCurrency(dashboardStats.paidCameramanAmount)} paid</span>
                </div>
              </Link>

              {/* 4. Deliverables Assets */}
              <Link to="/shoots" className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors space-y-2 block">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Deliverables Assets</span>
                  <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
                <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{deliverablesStats.totalDeliverablesCount}</div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{deliverablesStats.shootsWithDeliverablesCount} shoots with assets</span>
                  <span>{deliverablesStats.withCloudLinkCount} with link</span>
                </div>
              </Link>

              {/* 5. My Submissions Queue */}
              <Link to="/approvals" className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors space-y-2 block">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">My Submissions</span>
                  <CheckSquare className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
                <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{myChangeRequests.filter(c => c.status === 'pending').length}</div>
                <div className="text-xs text-[var(--color-text-secondary)]"><span>Awaiting Founder review</span></div>
              </Link>
            </section>

            {/* ADMIN SECTION A — DAILY CREW DISPATCH CONSOLE */}
            <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <span>Daily Crew Dispatch Console</span>
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">Send prefilled call-sheets and WhatsApp reminders to videographers for immediate shoots (Today & Tomorrow)</p>
                </div>
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {dispatchShoots.length} Immediate Shoot{dispatchShoots.length === 1 ? '' : 's'}
                </span>
              </div>

              {dispatchShoots.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--color-text-secondary)] space-y-1">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-[var(--color-success)] mb-1" />
                  <p className="font-semibold text-[var(--color-text-primary)]">No shoots scheduled for today or tomorrow.</p>
                  <p>All crew dispatches are up to date.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)] text-xs">
                  {dispatchShoots.map(shoot => {
                    const client = clientMap.get(shoot.clientId);
                    return (
                      <div key={shoot.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--color-background)] transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[var(--color-text-primary)]">{client?.name || 'Unknown Client'}</span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${shoot.date === todayStr ? 'text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]'}`}>
                              • {shoot.date === todayStr ? 'Today' : 'Tomorrow'}
                            </span>
                            <span className="font-mono text-[var(--color-text-secondary)]">{shoot.date}</span>
                          </div>
                          <div className="flex items-center gap-4 text-[var(--color-text-secondary)]">
                            <span className="flex items-center gap-1 font-mono"><Clock className="w-3.5 h-3.5" />{formatTime12h(shoot.callTime)}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{shoot.location}</span>
                          </div>
                        </div>

                        {/* Assigned Crew List & Call Sheet Actions */}
                        <div className="flex items-center gap-4">
                          <div className="space-y-1 text-right">
                            {shoot.assignments && shoot.assignments.length > 0 ? (
                              <div className="flex flex-wrap gap-2 justify-end">
                                {shoot.assignments.map((asgn, idx) => {
                                  const cam = cameramanMap.get(asgn.cameramanId);
                                  const whatsappUrl = cam ? buildCameramanScheduleWhatsAppUrl({
                                    phone: cam.phone,
                                    cameramanName: cam.name,
                                    clientName: client?.name || 'Client',
                                    date: shoot.date,
                                    callTime: shoot.callTime,
                                    location: shoot.location
                                  }) : null;
                                  return (
                                    <div key={idx} className="flex items-center gap-1.5 bg-[var(--color-background)] px-2.5 py-1 rounded border border-[var(--color-border)]">
                                      <span className="font-medium text-[var(--color-text-primary)]">{cam?.name || 'Unassigned'}</span>
                                      {asgn.checkedInAt ? (
                                        <span className="text-[10px] text-[var(--color-success)] font-semibold">✓ Checked In</span>
                                      ) : (
                                        <button type="button" onClick={() => handleToggleCameramanCheckIn(shoot.id, idx, true)} className="text-[10px] text-[var(--color-warning)] hover:underline font-medium">Check In</button>
                                      )}
                                      {whatsappUrl && (
                                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-success)] hover:underline flex items-center gap-0.5 font-semibold ml-1" title="Send WhatsApp Call Sheet">
                                          <MessageSquare className="w-3 h-3" /> WhatsApp
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-[var(--color-error)] font-medium">No crew assigned</span>
                            )}
                          </div>

                          <Link to={`/shoots/${shoot.id}`} className="px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] bg-[var(--color-background)] hover:bg-[var(--color-border)] rounded border border-[var(--color-border)] transition-colors shrink-0">
                            View Shoot &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ADMIN SECTION B — ACTION REQUIRED (Operational Exceptions) */}
            <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                <h3 className="font-serif text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
                  <span>Action Required (Operational Exceptions)</span>
                </h3>
                <span className="text-xs text-[var(--color-text-secondary)]">{operationalExceptions.length} issue{operationalExceptions.length === 1 ? '' : 's'}</span>
              </div>

              {operationalExceptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-[var(--color-success)] font-medium bg-[var(--color-background)] rounded border border-[var(--color-border)]">
                  ✨ All caught up! No operational actions required.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {operationalExceptions.map(item => (
                    <div key={item.id} className="p-2.5 bg-[var(--color-background)] rounded border border-[var(--color-border)] flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'error' ? 'bg-[var(--color-error)]' : 'bg-[var(--color-warning)]'}`} />
                        <span>{item.label}</span>
                      </span>
                      <Link to={item.link} className="font-medium text-[var(--color-text-primary)] hover:underline shrink-0 ml-2">
                        View &rarr;
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ADMIN SECTION C & D — DELIVERABLES TRACKER & CREW AVAILABILITY */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Deliverables Tracker */}
              <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                  <h3 className="font-serif text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <span>Deliverables Tracker</span>
                  </h3>
                  <Link to="/shoots" className="text-xs text-[var(--color-text-primary)] hover:underline font-semibold">View Shoots &rarr;</Link>
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-3 bg-[var(--color-background)] rounded border border-[var(--color-border)] space-y-1">
                    <span className="text-[var(--color-text-secondary)] font-medium block">Total Assets</span>
                    <div className="text-xl font-bold font-sans text-[var(--color-text-primary)]">{deliverablesStats.totalDeliverablesCount}</div>
                  </div>
                  <div className="p-3 bg-[var(--color-background)] rounded border border-[var(--color-border)] space-y-1">
                    <span className="text-[var(--color-text-secondary)] font-medium block">Shoots Tracked</span>
                    <div className="text-xl font-bold font-sans text-[var(--color-text-primary)]">{deliverablesStats.shootsWithDeliverablesCount}</div>
                  </div>
                  <div className="p-3 bg-[var(--color-background)] rounded border border-[var(--color-border)] space-y-1">
                    <span className="text-[var(--color-text-secondary)] font-medium block">With Cloud Link</span>
                    <div className="text-xl font-bold font-sans text-[var(--color-text-secondary)]">{deliverablesStats.withCloudLinkCount}</div>
                  </div>
                </div>
              </div>

              {/* Crew Availability */}
              <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                  <h3 className="font-serif text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <span>Crew Availability Summary</span>
                  </h3>
                  <Link to="/cameramen" className="text-xs text-[var(--color-text-primary)] hover:underline font-semibold">Manage Crew &rarr;</Link>
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-3 bg-[var(--color-background)] rounded border border-[var(--color-border)] space-y-1">
                    <span className="text-[var(--color-text-secondary)] font-medium block">Total Roster</span>
                    <div className="text-xl font-bold font-sans text-[var(--color-text-primary)]">{crewAvailabilityStats.totalCrew}</div>
                  </div>
                  <div className="p-3 bg-[var(--color-background)] rounded border border-[var(--color-border)] space-y-1">
                    <span className="text-[var(--color-success)] font-medium block">Assigned Crew</span>
                    <div className="text-xl font-bold font-sans text-[var(--color-success)]">{crewAvailabilityStats.assignedCrewCount}</div>
                  </div>
                  <div className="p-3 bg-[var(--color-background)] rounded border border-[var(--color-border)] space-y-1">
                    <span className="text-[var(--color-error)] font-medium block">Unavailable Today</span>
                    <div className="text-xl font-bold font-sans text-[var(--color-error)]">{crewAvailabilityStats.unavailableCrewCount}</div>
                  </div>
                </div>
                {shootsWithoutCrewCount > 0 && (
                  <p className="text-xs text-[var(--color-error)] font-medium text-center bg-[var(--color-background)] py-1 rounded border border-[var(--color-border)]">
                    {shootsWithoutCrewCount} upcoming shoot(s) require crew assignment
                  </p>
                )}
              </div>
            </section>

            {/* ADMIN SECTION E — MY CHANGE REQUESTS */}
            <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-semibold text-[var(--color-text-primary)]">My Change Requests Submitted for Approval</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">Status of record additions/edits submitted to Founder governance</p>
                </div>
                <Link to="/approvals" className="text-xs font-semibold text-[var(--color-text-primary)] hover:underline">View All &rarr;</Link>
              </div>

              {myChangeRequests.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--color-text-secondary)]">No change requests submitted yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                    <thead className="bg-[var(--color-background)] text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Target Item</th>
                        <th className="px-5 py-3 font-semibold">Action</th>
                        <th className="px-5 py-3 font-semibold">Submission Date</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold">Review Note</th>
                        <th className="px-5 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {myChangeRequests.map(req => (
                        <tr key={req.id} className="hover:bg-[var(--color-background)] transition-colors">
                          <td className="px-5 py-3 font-medium text-[var(--color-text-primary)] uppercase">{formatSingularCollection(req.targetCollection)}</td>
                          <td className="px-5 py-3 capitalize font-medium">{req.action}</td>
                          <td className="px-5 py-3 font-mono text-[var(--color-text-secondary)]">{new Date(req.requestedAt).toLocaleDateString()}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${req.status === 'approved' ? 'text-[var(--color-success)]' : req.status === 'rejected' ? 'text-[var(--color-error)]' : 'text-[var(--color-warning)]'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${req.status === 'approved' ? 'bg-[var(--color-success)]' : req.status === 'rejected' ? 'bg-[var(--color-error)]' : 'bg-[var(--color-warning)]'}`} />
                              <span className="capitalize">{req.status}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3 text-[var(--color-text-secondary)] italic max-w-xs truncate">{req.reviewNote || '—'}</td>
                          <td className="px-5 py-3 text-right">
                            {req.status === 'rejected' ? (
                              <Link to="/approvals" className="px-2.5 py-1 text-xs font-semibold text-white bg-[var(--color-warning)] hover:opacity-90 rounded transition-opacity">
                                Edit & Resubmit
                              </Link>
                            ) : (
                              <Link to="/approvals" className="text-xs font-medium text-[var(--color-text-primary)] hover:underline">Details &rarr;</Link>
                            )}
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

        {/* ════════════════════════════════════════════════════════════ */}
        {/* ── FOUNDER EXECUTIVE DASHBOARD VIEW ── */}
        {/* ════════════════════════════════════════════════════════════ */}
        {isFounder && (
          <>
            {/* Founder Primary KPI Cards (4 Cards - Terracotta Accent on Cashflow) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* 1. Net Operating Cashflow (Primary Highlight Card) */}
              <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Net Operating Cashflow</span>
                  <TrendingUp className="w-4 h-4 text-[var(--color-accent)]" />
                </div>
                <div className="text-2xl font-bold font-sans text-[var(--color-accent)]">
                  {formatCurrency(netOperatingCashflow)}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]"><span>Client cash received minus paid crew & expenses</span></div>
              </div>

              {/* 2. Pending Approvals Queue */}
              <Link to="/approvals" className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors space-y-2 block">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Pending Approvals</span>
                  <ShieldCheck className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
                <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{pendingFounderApprovals.length}</div>
                <div className="text-xs text-[var(--color-text-secondary)]"><span>Admin submissions awaiting Founder review</span></div>
              </Link>

              {/* 3. Client Receivables */}
              <Link to="/payments" className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors space-y-2 block">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Client Receivables</span>
                  <Receipt className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
                <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{formatCurrency(dashboardStats.pendingClientAmount)}</div>
                <div className="text-xs text-[var(--color-text-secondary)]"><span>{dashboardStats.pendingClientCount} active client invoices</span></div>
              </Link>

              {/* 4. Total Operating Outflow */}
              <Link to="/expenses" className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors space-y-2 block">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Total Operating Outflow</span>
                  <TrendingDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
                <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{formatCurrency(dashboardStats.paidCameramanAmount + dashboardStats.totalExpenses)}</div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{expenses.length} receipts ({formatCurrency(dashboardStats.totalExpenses)})</span>
                  <span className="text-[var(--color-success)] font-semibold">{formatCurrency(dashboardStats.paidCameramanAmount)} crew paid</span>
                </div>
              </Link>
            </section>

            {/* FOUNDER SECTION A — GOVERNANCE ACTION CALLOUT BANNER */}
            {pendingFounderApprovals.length > 0 ? (
              <div className="p-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                  <div>
                    <h4 className="font-semibold text-[var(--color-text-primary)] uppercase tracking-wider text-[11px]">Governance Action Required</h4>
                    <p className="text-[var(--color-text-secondary)]">
                      Admin has submitted <span className="font-bold text-[var(--color-text-primary)]">{pendingFounderApprovals.length} record update{pendingFounderApprovals.length > 1 ? 's' : ''}</span> for your review and approval.
                    </p>
                  </div>
                </div>
                <Link to="/approvals" className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded transition-colors shrink-0 flex items-center gap-1">
                  <span>Review Approvals</span> <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="p-3.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                  <span>No approvals requiring your attention. All admin submissions reviewed.</span>
                </span>
                <Link to="/approvals" className="font-semibold text-[var(--color-text-primary)] hover:underline">Approvals Desk &rarr;</Link>
              </div>
            )}

            {/* FOUNDER SECTION B — CLIENT PROFITABILITY & MARGIN RANKING TABLE */}
            <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <span>Client Profitability & Margin Ranking</span>
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">Revenue minus crew payouts and direct shoot expenses per client account</p>
                </div>
              </div>

              {clientProfitabilityRanking.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--color-text-secondary)]">No client accounts available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                    <thead className="bg-[var(--color-background)] text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Client Brand Name</th>
                        <th className="px-5 py-3 font-semibold text-center">Shoots</th>
                        <th className="px-5 py-3 font-semibold text-right">Invoiced Revenue (₹)</th>
                        <th className="px-5 py-3 font-semibold text-right">Total Production Cost (₹)</th>
                        <th className="px-5 py-3 font-semibold text-right">Net Margin (₹)</th>
                        <th className="px-5 py-3 font-semibold text-center">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {clientProfitabilityRanking.map(item => (
                        <tr key={item.client.id} className="hover:bg-[var(--color-background)] transition-colors">
                          <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">
                            <Link to={`/clients/${item.client.id}`} className="hover:underline">{item.client.name}</Link>
                          </td>
                          <td className="px-5 py-3.5 text-center font-mono">{item.shootsCount}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-semibold text-[var(--color-text-primary)]">{formatCurrency(item.invoicedRevenue)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-[var(--color-error)]">{formatCurrency(item.totalCosts)}</td>
                          <td className={`px-5 py-3.5 text-right font-mono font-bold ${item.netMargin >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                            {formatCurrency(item.netMargin)}
                          </td>
                          <td className="px-5 py-3.5 text-center font-mono font-semibold">
                            <span className={item.marginPercent >= 50 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}>
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

            {/* FOUNDER SECTION C — REVENUE & OUTFLOW GROWTH CHART (2 LINES) */}
            <GrowthChart shoots={shoots} expenses={expenses} />

            {/* FOUNDER SECTION D & E — FINANCIAL SNAPSHOT & BUSINESS OVERVIEW */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Financial Snapshot */}
              <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                  <h3 className="font-serif text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <span>Financial Snapshot</span>
                  </h3>
                  <span className="text-xs text-[var(--color-text-secondary)] font-mono">System Ledger</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
                    <span className="text-[var(--color-text-secondary)]">Client Revenue Received</span>
                    <span className="font-mono font-semibold text-[var(--color-success)]">{formatCurrency(dashboardStats.paidClientAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
                    <span className="text-[var(--color-text-secondary)]">Outstanding Receivables</span>
                    <span className="font-mono font-semibold text-[var(--color-warning)]">{formatCurrency(dashboardStats.pendingClientAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
                    <span className="text-[var(--color-text-secondary)]">Crew Payouts Paid</span>
                    <span className="font-mono text-[var(--color-error)]">-{formatCurrency(dashboardStats.paidCameramanAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
                    <span className="text-[var(--color-text-secondary)]">Logged Operating Expenses</span>
                    <span className="font-mono text-[var(--color-error)]">-{formatCurrency(dashboardStats.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-sm font-bold">
                    <span className="text-[var(--color-text-primary)]">Net Operating Cashflow</span>
                    <span className={`font-mono ${netOperatingCashflow >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                      {formatCurrency(netOperatingCashflow)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Overview */}
              <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
                  <h3 className="font-serif text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    <span>Business Overview KPIs</span>
                  </h3>
                  <span className="text-xs text-[var(--color-text-secondary)] font-mono">Agency Totals</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-[var(--color-background)] rounded border border-[var(--color-border)] space-y-1">
                    <span className="text-[var(--color-text-secondary)] font-medium block">Active Client Brands</span>
                    <span className="text-xl font-bold font-sans text-[var(--color-text-primary)]">{clients.filter(c => c.status === 'active').length}</span>
                  </div>
                  <div className="p-3 bg-[var(--color-background)] rounded border border-[var(--color-border)] space-y-1">
                    <span className="text-[var(--color-text-secondary)] font-medium block">Total Production Jobs</span>
                    <span className="text-xl font-bold font-sans text-[var(--color-text-primary)]">{shoots.length}</span>
                  </div>
                  <div className="p-3 bg-[var(--color-background)] rounded border border-[var(--color-border)] space-y-1">
                    <span className="text-[var(--color-success)] font-medium block">Completed Shoots</span>
                    <span className="text-xl font-bold font-sans text-[var(--color-success)]">{shoots.filter(s => s.status === 'done').length}</span>
                  </div>
                  <div className="p-3 bg-[var(--color-background)] rounded border border-[var(--color-border)] space-y-1">
                    <span className="text-[var(--color-accent)] font-medium block">Collection Rate</span>
                    <span className="text-xl font-bold font-sans text-[var(--color-accent)]">{collectionRate}%</span>
                  </div>
                </div>
              </div>
            </section>

            {/* FOUNDER SECTION F — STRATEGIC ATTENTION FEED */}
            <section className="grid grid-cols-1 gap-6">
              <AttentionFeed />
            </section>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* ── SHARED: ACTIVE SHOOT SCHEDULE SUMMARY ── */}
        {/* ════════════════════════════════════════════════════════════ */}
        <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-semibold text-[var(--color-text-primary)]">Active Shoot Schedule Summary</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">Jobs scheduled for execution and immediate production</p>
            </div>
            <Link to="/shoots" className="text-xs font-semibold text-[var(--color-text-primary)] hover:underline inline-flex items-center gap-1">
              <span>View All Shoots</span> <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {upcomingShoots.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--color-text-secondary)]">No upcoming shoots scheduled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                <thead className="bg-[var(--color-background)] text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Client / Brand</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Location</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Client Amount</th>
                    <th className="px-5 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {upcomingShoots.map(shoot => {
                    const client = clientMap.get(shoot.clientId);
                    return (
                      <tr key={shoot.id} className="hover:bg-[var(--color-background)] transition-colors">
                        <td className="px-5 py-3 font-medium text-[var(--color-text-primary)]"><Link to={`/clients/${shoot.clientId}`} className="hover:underline font-semibold">{client ? client.name : 'Unknown Client'}</Link></td>
                        <td className="px-5 py-3 font-mono text-[var(--color-text-secondary)]"><span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />{shoot.date}</span></td>
                        <td className="px-5 py-3 text-[var(--color-text-secondary)]"><span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />{shoot.location}</span></td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${shoot.status === 'done' ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${shoot.status === 'done' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'}`} />
                            <span className="capitalize">{shoot.status}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold font-mono text-[var(--color-text-primary)]">{formatCurrency(shoot.clientAmount)}</td>
                        <td className="px-5 py-3 text-right"><Link to={`/shoots/${shoot.id}`} className="text-xs font-semibold text-[var(--color-text-primary)] hover:underline">Open Workspace &rarr;</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <ShootForm isOpen={isShootFormOpen} onClose={() => setIsShootFormOpen(false)} />
    </div>
  );
};
