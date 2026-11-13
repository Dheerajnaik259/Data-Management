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
import { toLocalDateString } from '../utils/localDate';
import { canApprove } from '../utils/permissions';

const updateMetricHighlight = (event: React.PointerEvent<HTMLElement>) => {
  if (event.pointerType !== 'mouse') return;
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
};

type DashboardData = ReturnType<typeof useData>;

interface DashboardMetricsInput {
  shoots: DashboardData['shoots'];
  clients: DashboardData['clients'];
  cameramen: DashboardData['cameramen'];
  expenses: DashboardData['expenses'];
  changeRequests: DashboardData['changeRequests'];
  dashboardStats: DashboardData['dashboardStats'];
  isAdmin: boolean;
  userId: string | undefined;
}

const useDashboardMetrics = ({
  shoots, clients, cameramen, expenses, changeRequests, dashboardStats, isAdmin, userId,
}: DashboardMetricsInput) => {
  const todayStr = toLocalDateString(new Date());
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = toLocalDateString(tomorrowObj);

  const dispatchShoots = useMemo(() => [...shoots]
    .filter(s => s.date === todayStr || s.date === tomorrowStr)
    .sort((a, b) => a.date.localeCompare(b.date)), [shoots, todayStr, tomorrowStr]);

  const upcomingShoots = useMemo(() => [...shoots]
    .filter(s => s.status === 'scheduled' || s.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6), [shoots, todayStr]);

  const myChangeRequests = useMemo(() => {
    if (!isAdmin) return [];
    return changeRequests.filter(cr => cr.requestedBy === userId).slice(0, 5);
  }, [changeRequests, isAdmin, userId]);

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
          if (del.fileLink && del.fileLink.trim()) withCloudLink += count;
        });
      }
    });
    return { totalDeliverablesCount: total, shootsWithDeliverablesCount: shootsCount, withCloudLinkCount: withCloudLink };
  }, [shoots]);

  const shootsWithoutCrewCount = useMemo(() => shoots.filter(s =>
    (s.status === 'scheduled' || s.date >= todayStr) &&
    (!s.assignments || s.assignments.length === 0 || s.assignments.every(a => !a.cameramanId)),
  ).length, [shoots, todayStr]);

  const crewAvailabilityStats = useMemo(() => {
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
      totalCrew: cameramen.length,
      assignedCrewCount: assignedSet.size,
      unavailableCrewCount: unavailableCount,
    };
  }, [cameramen, shoots, todayStr]);

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

  const pendingFounderApprovals = useMemo(
    () => changeRequests.filter(cr => cr.status === 'pending'),
    [changeRequests],
  );

  const clientProfitabilityRanking = useMemo(() => clients.map(client => {
    const clientShoots = shoots.filter(s => s.clientId === client.id);
    const invoicedRevenue = clientShoots.reduce((sum, s) => sum + (s.clientAmount || 0), 0);
    const crewCosts = clientShoots.reduce((sum, s) => sum + (s.assignments || []).reduce((acc, a) => acc + (a.amount || 0), 0), 0);
    const shootIds = new Set(clientShoots.map(s => s.id));
    const directExpenses = expenses.filter(e => e.shootId && shootIds.has(e.shootId)).reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalCosts = crewCosts + directExpenses;
    const netMargin = invoicedRevenue - totalCosts;
    const marginPercent = invoicedRevenue > 0 ? Math.round((netMargin / invoicedRevenue) * 100) : 0;
    return { client, shootsCount: clientShoots.length, invoicedRevenue, totalCosts, netMargin, marginPercent };
  }).sort((a, b) => b.netMargin - a.netMargin), [clients, shoots, expenses]);

  const netOperatingCashflow = dashboardStats.paidClientAmount - dashboardStats.paidCameramanAmount - dashboardStats.totalExpenses;
  const totalBilled = dashboardStats.paidClientAmount + dashboardStats.pendingClientAmount;
  const collectionRate = totalBilled > 0 ? Math.round((dashboardStats.paidClientAmount / totalBilled) * 100) : 0;

  return {
    todayStr, tomorrowStr, dispatchShoots, upcomingShoots, myChangeRequests, deliverablesStats,
    shootsWithoutCrewCount, crewAvailabilityStats, operationalExceptions, pendingFounderApprovals,
    clientProfitabilityRanking, netOperatingCashflow, collectionRate,
  };
};

export const Dashboard: React.FC = () => {
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { shoots, clients, cameramen, expenses, changeRequests, dashboardStats, handleToggleCameramanCheckIn } = useData();
  const { user } = useAuth();

  const [isShootFormOpen, setIsShootFormOpen] = useState(false);
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const cameramanMap = useMemo(() => new Map(cameramen.map(c => [c.id, c])), [cameramen]);

  const isAdmin = user?.role === 'admin';
  const isFounder = Boolean(user && canApprove(user.role));
  const isSocialMediaManager = user?.role === 'social_media_manager';
  const metrics = useDashboardMetrics({
    shoots,
    clients,
    cameramen,
    expenses,
    changeRequests,
    dashboardStats,
    isAdmin,
    userId: user?.uid,
  });
  const {
    todayStr, tomorrowStr, dispatchShoots, upcomingShoots, myChangeRequests, deliverablesStats,
    shootsWithoutCrewCount, crewAvailabilityStats, operationalExceptions, pendingFounderApprovals,
    clientProfitabilityRanking, netOperatingCashflow, collectionRate,
  } = metrics;

  if (isSocialMediaManager) {
    return (
      <SocialMediaDashboard
        onOpenMobileNav={onOpenMobileNav}
        clients={clients}
        upcomingShootCount={upcomingShoots.length}
        changeRequests={changeRequests}
        userId={user?.uid}
        isShootFormOpen={isShootFormOpen}
        onOpenShootForm={() => setIsShootFormOpen(true)}
        onCloseShootForm={() => setIsShootFormOpen(false)}
      />
    );
  }

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
            <button type="button" onClick={() => setIsShootFormOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[var(--color-text-on-accent)] bg-[var(--color-accent)] rounded hover:bg-[var(--color-accent-hover)] transition-colors">
              <Plus className="w-3.5 h-3.5" /> <span>Schedule Shoot</span>
            </button>
          </div>
        }
      />

      <main className="w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
        
        {/* ════════════════════════════════════════════════════════════ */}
        {/* ── ADMIN DASHBOARD VIEW ── */}
        {/* ════════════════════════════════════════════════════════════ */}
        {isAdmin && (
          <>
            <AdminMetricCards
              stats={dashboardStats}
              dispatchCount={dispatchShoots.length}
              scheduledCount={shoots.filter(shoot => shoot.status === 'scheduled').length}
              deliverablesStats={deliverablesStats}
              pendingSubmissions={myChangeRequests.filter(request => request.status === 'pending').length}
            />

            <AdminDispatchConsole
              dispatchShoots={dispatchShoots}
              todayStr={todayStr}
              clientMap={clientMap}
              cameramanMap={cameramanMap}
              onCheckIn={handleToggleCameramanCheckIn}
            />

            <OperationalExceptionsPanel exceptions={operationalExceptions} />

            <AdminResourceStats
              deliverablesStats={deliverablesStats}
              crewAvailabilityStats={crewAvailabilityStats}
              shootsWithoutCrewCount={shootsWithoutCrewCount}
            />

            <MyChangeRequestsTable requests={myChangeRequests} />
          </>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* ── FOUNDER EXECUTIVE DASHBOARD VIEW ── */}
        {/* ════════════════════════════════════════════════════════════ */}
        {isFounder && (
          <>
            <FounderMetricCards
              stats={dashboardStats}
              pendingApprovalCount={pendingFounderApprovals.length}
              netOperatingCashflow={netOperatingCashflow}
              expenseCount={expenses.length}
            />

            {/* FOUNDER SECTION A — GOVERNANCE ACTION CALLOUT BANNER */}
            <FounderApprovalNotice pendingCount={pendingFounderApprovals.length} />

            <ClientProfitabilityTable clients={clientProfitabilityRanking} />

            {/* FOUNDER SECTION C — REVENUE & OUTFLOW GROWTH CHART (2 LINES) */}
            <GrowthChart shoots={shoots} expenses={expenses} />

            <FounderBusinessSummary
              stats={dashboardStats}
              clients={clients}
              shoots={shoots}
              collectionRate={collectionRate}
              netOperatingCashflow={netOperatingCashflow}
            />

            {/* FOUNDER SECTION F — STRATEGIC ATTENTION FEED */}
            <section className="grid grid-cols-1 gap-6">
              <AttentionFeed />
            </section>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* ── SHARED: ACTIVE SHOOT SCHEDULE SUMMARY ── */}
        {/* ════════════════════════════════════════════════════════════ */}
        <UpcomingShootsSummary shoots={upcomingShoots} clientMap={clientMap} />
      </main>

      <ShootForm isOpen={isShootFormOpen} onClose={() => setIsShootFormOpen(false)} />
    </div>
  );
};

interface AdminDispatchConsoleProps {
  dispatchShoots: DashboardData['shoots'];
  todayStr: string;
  clientMap: Map<string, DashboardData['clients'][number]>;
  cameramanMap: Map<string, DashboardData['cameramen'][number]>;
  onCheckIn: DashboardData['handleToggleCameramanCheckIn'];
}

interface FounderMetricCardsProps {
  stats: DashboardData['dashboardStats'];
  pendingApprovalCount: number;
  netOperatingCashflow: number;
  expenseCount: number;
}

const FounderMetricCards: React.FC<FounderMetricCardsProps> = ({
  stats,
  pendingApprovalCount,
  netOperatingCashflow,
  expenseCount,
}) => (
  <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div onPointerMove={updateMetricHighlight} className="liquid-metric-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Net Operating Cashflow</span>
        <TrendingUp className="w-4 h-4 text-[var(--color-accent)]" />
      </div>
      <div className="text-2xl font-bold font-sans text-[var(--color-accent)]">{formatCurrency(netOperatingCashflow)}</div>
      <div className="text-xs text-[var(--color-text-secondary)]"><span>Client cash received minus paid crew & expenses</span></div>
    </div>
    <Link to="/approvals" onPointerMove={updateMetricHighlight} className="liquid-metric-card p-4 space-y-2 block">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Pending Approvals</span>
        <ShieldCheck className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </div>
      <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{pendingApprovalCount}</div>
      <div className="text-xs text-[var(--color-text-secondary)]"><span>Admin submissions awaiting Founder review</span></div>
    </Link>
    <Link to="/payments" onPointerMove={updateMetricHighlight} className="liquid-metric-card p-4 space-y-2 block">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Client Receivables</span>
        <Receipt className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </div>
      <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{formatCurrency(stats.pendingClientAmount)}</div>
      <div className="text-xs text-[var(--color-text-secondary)]"><span>{stats.pendingClientCount} active client invoices</span></div>
    </Link>
    <Link to="/expenses" onPointerMove={updateMetricHighlight} className="liquid-metric-card p-4 space-y-2 block">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Total Operating Outflow</span>
        <TrendingDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </div>
      <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{formatCurrency(stats.paidCameramanAmount + stats.totalExpenses)}</div>
      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <span>{expenseCount} receipts ({formatCurrency(stats.totalExpenses)})</span>
        <span className="text-[var(--color-success)] font-semibold">{formatCurrency(stats.paidCameramanAmount)} crew paid</span>
      </div>
    </Link>
  </section>
);

const FounderApprovalNotice: React.FC<{ pendingCount: number }> = ({ pendingCount }) => pendingCount > 0 ? (
  <div className="liquid-dispatch-panel p-4 rounded-xl flex items-center justify-between gap-3 text-xs">
    <div className="flex items-center gap-3">
      <ShieldCheck className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
      <div>
        <h4 className="font-semibold text-[var(--color-text-primary)] uppercase tracking-wider text-[11px]">Governance Action Required</h4>
        <p className="text-[var(--color-text-secondary)]">
          Admin has submitted <span className="font-bold text-[var(--color-text-primary)]">{pendingCount} record update{pendingCount > 1 ? 's' : ''}</span> for your review and approval.
        </p>
      </div>
    </div>
    <Link to="/approvals" className="px-3 py-1.5 text-xs font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded transition-colors shrink-0 flex items-center gap-1">
      <span>Review Approvals</span> <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  </div>
) : (
  <div className="liquid-glass-inner p-3.5 rounded-xl flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
    <span className="flex items-center gap-2 font-medium">
      <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
      <span>No approvals requiring your attention. All admin submissions reviewed.</span>
    </span>
    <Link to="/approvals" className="font-semibold text-[var(--color-text-primary)] hover:underline">Approvals Desk &rarr;</Link>
  </div>
);

interface FounderBusinessSummaryProps {
  stats: DashboardData['dashboardStats'];
  clients: DashboardData['clients'];
  shoots: DashboardData['shoots'];
  collectionRate: number;
  netOperatingCashflow: number;
}

const FounderBusinessSummary: React.FC<FounderBusinessSummaryProps> = ({
  stats,
  clients,
  shoots,
  collectionRate,
  netOperatingCashflow,
}) => (
  <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="liquid-content-panel p-4 space-y-3">
      <div className="liquid-panel-header flex items-center justify-between -mx-4 -mt-4 px-4 py-3.5 mb-3 border-b pb-2.5 rounded-t-[inherit]">
        <h3 className="font-serif text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span>Financial Snapshot</span>
        </h3>
        <span className="text-xs text-[var(--color-text-secondary)] font-mono">System Ledger</span>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
          <span className="text-[var(--color-text-secondary)]">Client Revenue Received</span>
          <span className="font-mono font-semibold text-[var(--color-success)]">{formatCurrency(stats.paidClientAmount)}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
          <span className="text-[var(--color-text-secondary)]">Outstanding Receivables</span>
          <span className="font-mono font-semibold text-[var(--color-warning)]">{formatCurrency(stats.pendingClientAmount)}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
          <span className="text-[var(--color-text-secondary)]">Crew Payouts Paid</span>
          <span className="font-mono text-[var(--color-error)]">-{formatCurrency(stats.paidCameramanAmount)}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
          <span className="text-[var(--color-text-secondary)]">Logged Operating Expenses</span>
          <span className="font-mono text-[var(--color-error)]">-{formatCurrency(stats.totalExpenses)}</span>
        </div>
        <div className="flex justify-between pt-2 text-sm font-bold">
          <span className="text-[var(--color-text-primary)]">Net Operating Cashflow</span>
          <span className={`font-mono ${netOperatingCashflow >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
            {formatCurrency(netOperatingCashflow)}
          </span>
        </div>
      </div>
    </div>
    <div className="liquid-content-panel p-4 space-y-3">
      <div className="liquid-panel-header flex items-center justify-between -mx-4 -mt-4 px-4 py-3.5 mb-3 border-b pb-2.5 rounded-t-[inherit]">
        <h3 className="font-serif text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <PieChart className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span>Business Overview KPIs</span>
        </h3>
        <span className="text-xs text-[var(--color-text-secondary)] font-mono">Agency Totals</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="liquid-glass-inner p-3 rounded-xl space-y-1">
          <span className="text-[var(--color-text-secondary)] font-medium block">Active Client Brands</span>
          <span className="text-xl font-bold font-sans text-[var(--color-text-primary)]">{clients.filter(client => client.status === 'active').length}</span>
        </div>
        <div className="liquid-glass-inner p-3 rounded-xl space-y-1">
          <span className="text-[var(--color-text-secondary)] font-medium block">Total Production Jobs</span>
          <span className="text-xl font-bold font-sans text-[var(--color-text-primary)]">{shoots.length}</span>
        </div>
        <div className="liquid-glass-inner p-3 rounded-xl space-y-1">
          <span className="text-[var(--color-success)] font-medium block">Completed Shoots</span>
          <span className="text-xl font-bold font-sans text-[var(--color-success)]">{shoots.filter(shoot => shoot.status === 'done').length}</span>
        </div>
        <div className="liquid-glass-inner p-3 rounded-xl space-y-1">
          <span className="text-[var(--color-accent)] font-medium block">Collection Rate</span>
          <span className="text-xl font-bold font-sans text-[var(--color-accent)]">{collectionRate}%</span>
        </div>
      </div>
    </div>
  </section>
);

interface AdminResourceStatsProps {
  deliverablesStats: ReturnType<typeof useDashboardMetrics>['deliverablesStats'];
  crewAvailabilityStats: ReturnType<typeof useDashboardMetrics>['crewAvailabilityStats'];
  shootsWithoutCrewCount: number;
}

const AdminResourceStats: React.FC<AdminResourceStatsProps> = ({
  deliverablesStats,
  crewAvailabilityStats,
  shootsWithoutCrewCount,
}) => (
  <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="liquid-content-panel liquid-dispatch-panel p-4 space-y-3">
      <div className="liquid-panel-header flex items-center justify-between -mx-4 -mt-4 px-4 py-3.5 mb-3 border-b pb-2.5 rounded-t-[inherit]">
        <h3 className="font-serif text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span>Deliverables Tracker</span>
        </h3>
        <Link to="/shoots" className="text-xs text-[var(--color-text-primary)] hover:underline font-semibold">View Shoots &rarr;</Link>
      </div>
      <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
        <div className="liquid-glass-inner p-3 rounded-xl space-y-1">
          <span className="text-[var(--color-text-secondary)] font-medium block">Total Assets</span>
          <div className="text-xl font-bold font-sans text-[var(--color-text-primary)]">{deliverablesStats.totalDeliverablesCount}</div>
        </div>
        <div className="liquid-glass-inner p-3 rounded-xl space-y-1">
          <span className="text-[var(--color-text-secondary)] font-medium block">Shoots Tracked</span>
          <div className="text-xl font-bold font-sans text-[var(--color-text-primary)]">{deliverablesStats.shootsWithDeliverablesCount}</div>
        </div>
        <div className="liquid-glass-inner p-3 rounded-xl space-y-1">
          <span className="text-[var(--color-text-secondary)] font-medium block">With Cloud Link</span>
          <div className="text-xl font-bold font-sans text-[var(--color-text-secondary)]">{deliverablesStats.withCloudLinkCount}</div>
        </div>
      </div>
    </div>
    <div className="liquid-content-panel liquid-dispatch-panel p-4 space-y-3">
      <div className="liquid-panel-header flex items-center justify-between -mx-4 -mt-4 px-4 py-3.5 mb-3 border-b pb-2.5 rounded-t-[inherit]">
        <h3 className="font-serif text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span>Crew Availability Summary</span>
        </h3>
        <Link to="/cameramen" className="text-xs text-[var(--color-text-primary)] hover:underline font-semibold">Manage Crew &rarr;</Link>
      </div>
      <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
        <div className="liquid-glass-inner p-3 rounded-xl space-y-1">
          <span className="text-[var(--color-text-secondary)] font-medium block">Total Roster</span>
          <div className="text-xl font-bold font-sans text-[var(--color-text-primary)]">{crewAvailabilityStats.totalCrew}</div>
        </div>
        <div className="liquid-glass-inner p-3 rounded-xl space-y-1">
          <span className="text-[var(--color-success)] font-medium block">Assigned Crew</span>
          <div className="text-xl font-bold font-sans text-[var(--color-success)]">{crewAvailabilityStats.assignedCrewCount}</div>
        </div>
        <div className="liquid-glass-inner p-3 rounded-xl space-y-1">
          <span className="text-[var(--color-error)] font-medium block">Unavailable Today</span>
          <div className="text-xl font-bold font-sans text-[var(--color-error)]">{crewAvailabilityStats.unavailableCrewCount}</div>
        </div>
      </div>
      {shootsWithoutCrewCount > 0 && (
        <p className="liquid-glass-status text-xs text-[var(--color-error)] font-medium text-center py-1 rounded-lg">
          {shootsWithoutCrewCount} upcoming shoot(s) require crew assignment
        </p>
      )}
    </div>
  </section>
);

interface AdminMetricCardsProps {
  stats: DashboardData['dashboardStats'];
  dispatchCount: number;
  scheduledCount: number;
  deliverablesStats: ReturnType<typeof useDashboardMetrics>['deliverablesStats'];
  pendingSubmissions: number;
}

const AdminMetricCards: React.FC<AdminMetricCardsProps> = ({
  stats,
  dispatchCount,
  scheduledCount,
  deliverablesStats,
  pendingSubmissions,
}) => (
  <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    <Link to="/shoots" onPointerMove={updateMetricHighlight} className="liquid-metric-card p-4 space-y-2 block">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Shoots Today / Tomorrow</span>
        <Film className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </div>
      <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{dispatchCount}</div>
      <div className="text-xs text-[var(--color-text-secondary)]"><span>{scheduledCount} total active scheduled</span></div>
    </Link>
    <Link to="/payments" onPointerMove={updateMetricHighlight} className="liquid-metric-card p-4 space-y-2 block">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Invoices To Chase</span>
        <TrendingUp className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </div>
      <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{formatCurrency(stats.pendingClientAmount)}</div>
      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <span>{stats.pendingClientCount} pending</span>
        {stats.overdueIncomingCount > 0 && <span className="text-[var(--color-error)] font-semibold">{stats.overdueIncomingCount} overdue</span>}
      </div>
    </Link>
    <Link to="/payments" onPointerMove={updateMetricHighlight} className="liquid-metric-card p-4 space-y-2 block">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Crew Payouts Status</span>
        <TrendingDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </div>
      <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{formatCurrency(stats.pendingCameramanAmount)}</div>
      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <span>{stats.pendingCameramanCount} pending</span>
        <span className="text-[var(--color-success)] font-semibold">{formatCurrency(stats.paidCameramanAmount)} paid</span>
      </div>
    </Link>
    <Link to="/shoots" onPointerMove={updateMetricHighlight} className="liquid-metric-card p-4 space-y-2 block">
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
    <Link to="/approvals" onPointerMove={updateMetricHighlight} className="liquid-metric-card p-4 space-y-2 block">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">My Submissions</span>
        <CheckSquare className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </div>
      <div className="text-2xl font-bold font-sans text-[var(--color-text-primary)]">{pendingSubmissions}</div>
      <div className="text-xs text-[var(--color-text-secondary)]"><span>Awaiting Founder review</span></div>
    </Link>
  </section>
);

const AdminDispatchConsole: React.FC<AdminDispatchConsoleProps> = ({
  dispatchShoots,
  todayStr,
  clientMap,
  cameramanMap,
  onCheckIn,
}) => (
  <section className="liquid-content-panel liquid-dispatch-panel overflow-hidden">
    <div className="liquid-panel-header px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between">
      <div>
        <h3 className="font-serif text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span>Daily Crew Dispatch Console</span>
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)]">Send prefilled call-sheets and WhatsApp reminders to videographers for immediate shoots (Today & Tomorrow)</p>
      </div>
      <span className="liquid-glass-status px-2.5 py-1 rounded-full text-xs font-medium text-[var(--color-text-secondary)]">
        {dispatchShoots.length} Immediate Shoot{dispatchShoots.length === 1 ? '' : 's'}
      </span>
    </div>

    {dispatchShoots.length === 0 ? (
      <div className="liquid-glass-inner m-3 p-6 text-center text-xs text-[var(--color-text-secondary)] space-y-1 rounded-xl">
        <CheckCircle2 className="w-6 h-6 mx-auto text-[var(--color-success)] mb-1" />
        <p className="font-semibold text-[var(--color-text-primary)]">No shoots scheduled for today or tomorrow.</p>
        <p>All crew dispatches are up to date.</p>
      </div>
    ) : (
      <div className="divide-y divide-[var(--color-border)] text-xs">
        {dispatchShoots.map(shoot => {
          const client = clientMap.get(shoot.clientId);
          return (
            <div key={shoot.id} className="liquid-glass-inner m-3 p-4 flex items-center justify-between gap-4 rounded-xl hover:bg-white/[0.025] transition-colors">
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
              <div className="flex items-center gap-4">
                <div className="space-y-1 text-right">
                  {shoot.assignments && shoot.assignments.length > 0 ? (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {shoot.assignments.map((assignment, index) => {
                        const cameraman = cameramanMap.get(assignment.cameramanId);
                        const whatsappUrl = cameraman ? buildCameramanScheduleWhatsAppUrl({
                          phone: cameraman.phone,
                          cameramanName: cameraman.name,
                          clientName: client?.name || 'Client',
                          date: shoot.date,
                          callTime: shoot.callTime,
                          location: shoot.location,
                        }) : null;
                        return (
                          <div key={index} className="liquid-glass-status flex items-center gap-1.5 px-2.5 py-1 rounded-lg">
                            <span className="font-medium text-[var(--color-text-primary)]">{cameraman?.name || 'Unassigned'}</span>
                            {assignment.checkedInAt ? (
                              <span className="text-[10px] text-[var(--color-success)] font-semibold">✓ Checked In</span>
                            ) : (
                              <button type="button" onClick={() => onCheckIn(shoot.id, index, true)} className="text-[10px] text-[var(--color-warning)] hover:underline font-medium">Check In</button>
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
                <Link to={`/shoots/${shoot.id}`} className="liquid-glass-button px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] rounded-lg shrink-0">
                  View Shoot &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
);

const OperationalExceptionsPanel: React.FC<{
  exceptions: ReturnType<typeof useDashboardMetrics>['operationalExceptions'];
}> = ({ exceptions }) => (
  <section className="liquid-content-panel liquid-dispatch-panel p-4 space-y-3">
    <div className="liquid-panel-header flex items-center justify-between -mx-4 -mt-4 px-4 py-3.5 mb-3 border-b pb-2.5 rounded-t-[inherit]">
      <h3 className="font-serif text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
        <span>Action Required (Operational Exceptions)</span>
      </h3>
      <span className="text-xs text-[var(--color-text-secondary)]">{exceptions.length} issue{exceptions.length === 1 ? '' : 's'}</span>
    </div>
    {exceptions.length === 0 ? (
      <div className="liquid-glass-inner p-3 text-center text-xs text-[var(--color-success)] font-medium rounded-xl">
        ✨ All caught up! No operational actions required.
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {exceptions.map(item => (
          <div key={item.id} className="liquid-glass-inner p-2.5 rounded-xl flex items-center justify-between text-xs">
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
);

const MyChangeRequestsTable: React.FC<{ requests: DashboardData['changeRequests'] }> = ({ requests }) => (
  <section className="liquid-content-panel liquid-dispatch-panel overflow-hidden">
    <div className="liquid-panel-header px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between">
      <div>
        <h3 className="font-serif text-base font-semibold text-[var(--color-text-primary)]">My Change Requests Submitted for Approval</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">Status of record additions/edits submitted to Founder governance</p>
      </div>
      <Link to="/approvals" className="text-xs font-semibold text-[var(--color-text-primary)] hover:underline">View All &rarr;</Link>
    </div>
    {requests.length === 0 ? (
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
            {requests.map(request => (
              <tr key={request.id} className="hover:bg-[var(--color-background)] transition-colors">
                <td className="px-5 py-3 font-medium text-[var(--color-text-primary)] uppercase">{formatSingularCollection(request.targetCollection)}</td>
                <td className="px-5 py-3 capitalize font-medium">{request.action}</td>
                <td className="px-5 py-3 font-mono text-[var(--color-text-secondary)]">{new Date(request.requestedAt).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${request.status === 'approved' ? 'text-[var(--color-success)]' : request.status === 'rejected' ? 'text-[var(--color-error)]' : 'text-[var(--color-warning)]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${request.status === 'approved' ? 'bg-[var(--color-success)]' : request.status === 'rejected' ? 'bg-[var(--color-error)]' : 'bg-[var(--color-warning)]'}`} />
                    <span className="capitalize">{request.status}</span>
                  </span>
                </td>
                <td className="px-5 py-3 text-[var(--color-text-secondary)] italic max-w-xs truncate">{request.reviewNote || '—'}</td>
                <td className="px-5 py-3 text-right">
                  {request.status === 'rejected' ? (
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
);

const ClientProfitabilityTable: React.FC<{
  clients: ReturnType<typeof useDashboardMetrics>['clientProfitabilityRanking'];
}> = ({ clients }) => (
  <section className="liquid-content-panel overflow-hidden">
    <div className="liquid-panel-header px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between">
      <div>
        <h3 className="font-serif text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span>Client Profitability & Margin Ranking</span>
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)]">Revenue minus crew payouts and direct shoot expenses per client account</p>
      </div>
    </div>
    {clients.length === 0 ? (
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
            {clients.map(item => (
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
);

interface SocialMediaDashboardProps {
  onOpenMobileNav: () => void;
  clients: DashboardData['clients'];
  upcomingShootCount: number;
  changeRequests: DashboardData['changeRequests'];
  userId: string | undefined;
  isShootFormOpen: boolean;
  onOpenShootForm: () => void;
  onCloseShootForm: () => void;
}

const SocialMediaDashboard: React.FC<SocialMediaDashboardProps> = ({
  onOpenMobileNav, clients, upcomingShootCount, changeRequests, userId,
  isShootFormOpen, onOpenShootForm, onCloseShootForm,
}) => {
  const pendingRequestCount = changeRequests.filter(request =>
    request.requestedBy === userId && request.status === 'pending',
  ).length;

  return (
    <div className="flex-1 flex min-w-0 flex-col pb-12">
      <Header
        title="Social Media Workspace"
        subtitle="Manage client and shoot updates for Founder approval"
        onOpenMobile={onOpenMobileNav}
        action={<button type="button" onClick={onOpenShootForm} className="inline-flex items-center gap-1.5 rounded bg-[var(--color-accent)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)]"><Plus className="h-3.5 w-3.5" /> Schedule Shoot</button>}
      />
      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <Link to="/clients" className="liquid-metric-card block p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Active Clients</span>
            <div className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{clients.filter(client => client.status === 'active').length}</div>
            <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">View client accounts</span>
          </Link>
          <Link to="/schedule" className="liquid-metric-card block p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Upcoming Shoots</span>
            <div className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{upcomingShootCount}</div>
            <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">Open the shoot calendar</span>
          </Link>
          <Link to="/approvals" className="liquid-metric-card block p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">My Pending Requests</span>
            <div className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">{pendingRequestCount}</div>
            <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">Track your submissions</span>
          </Link>
        </section>
        <section className="liquid-content-panel p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Your role</h2>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">You can manage client and shoot information by submitting changes for Founder approval. Financial records, team administration, and deletion tools are not part of this workspace.</p>
        </section>
      </main>
      <ShootForm isOpen={isShootFormOpen} onClose={onCloseShootForm} />
    </div>
  );
};

const UpcomingShootsSummary: React.FC<{
  shoots: DashboardData['shoots'];
  clientMap: Map<string, DashboardData['clients'][number]>;
}> = ({ shoots, clientMap }) => (
  <section className="liquid-content-panel overflow-hidden">
    <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between">
      <div>
        <h3 className="font-serif text-base font-semibold text-[var(--color-text-primary)]">Active Shoot Schedule Summary</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">Jobs scheduled for execution and immediate production</p>
      </div>
      <Link to="/shoots" className="text-xs font-semibold text-[var(--color-text-primary)] hover:underline inline-flex items-center gap-1">
        <span>View All Shoots</span> <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
    {shoots.length === 0 ? (
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
            {shoots.map(shoot => {
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
);
