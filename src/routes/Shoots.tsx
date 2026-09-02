import React, { useState, useMemo } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { Shoot } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { formatTime12h } from '../utils/formatTime';
import { ShootForm } from '../components/shoots/ShootForm';
import { ExportCsvButton } from '../components/common/ExportCsvButton';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { OverdueBadge } from '../components/common/OverdueBadge';
import { checkOverdue } from '../utils/overdueCheck';
import { Plus, Edit2, Trash2, Calendar, MapPin, Film, CheckCircle2, Clock, ArrowUpRight, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canDelete } from '../utils/permissions';
import { mergePendingItems } from '../utils/pendingMerge';
import { parseOperationalSettings } from '../config/business';

export const Shoots: React.FC = () => {
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const navigate = useNavigate();
  const { shoots, clients, cameramen, settings, handleSoftDelete, handleToggleClientPayment, handleUpdateOrSubmit, getSettingsOptions } = useData();
  const { user } = useAuth();
  const operationalSettings = parseOperationalSettings(settings.find(s => s.key === 'operationalSettings'));

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [cameramanFilter, setCameramanFilter] = useState<string>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShoot, setEditingShoot] = useState<Shoot | null>(null);
  const [deleteShootId, setDeleteShootId] = useState<string | null>(null);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const cameramanMap = useMemo(() => new Map(cameramen.map(c => [c.id, c])), [cameramen]);
  const statusOptions = getSettingsOptions('shootStatus');

  const { changeRequests } = useData();

  const mergedShoots = useMemo(() => {
    return mergePendingItems(shoots, changeRequests, 'shoots');
  }, [shoots, changeRequests]);

  const filteredShoots = useMemo(() => {
    return mergedShoots.filter((shoot) => {
      const client = clientMap.get(shoot.clientId);
      const clientName = client?.name || '';
      const matchesSearch = clientName.toLowerCase().includes(searchQuery.toLowerCase()) || shoot.location.toLowerCase().includes(searchQuery.toLowerCase()) || shoot.date.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || shoot.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || (paymentFilter === 'paid' && shoot.clientPaid) || (paymentFilter === 'pending' && !shoot.clientPaid);
      const matchesClient = clientFilter === 'all' || shoot.clientId === clientFilter;
      const matchesCameraman = cameramanFilter === 'all' || (shoot.assignments && shoot.assignments.some(a => a.cameramanId === cameramanFilter));
      return matchesSearch && matchesStatus && matchesPayment && matchesClient && matchesCameraman;
    });
  }, [mergedShoots, clientMap, searchQuery, statusFilter, paymentFilter, clientFilter, cameramanFilter]);

  const csvData = useMemo(() => {
    return filteredShoots.map((s) => {
      const client = clientMap.get(s.clientId);
      const crewNames = (s.assignments || []).map(a => `${cameramanMap.get(a.cameramanId)?.name || 'Crew'} (₹${a.amount}${a.paid ? ' - Paid' : ' - Due'})`).join('; ');
      const totalCrewPayout = (s.assignments || []).reduce((acc, a) => acc + a.amount, 0);
      const deliverableSummary = (s.deliverables || []).map(d => `${d.count}x ${d.type}`).join(', ');
      return {
        id: s.id, date: s.date, client: client?.name || 'Unknown', location: s.location, status: s.status,
        clientAmount: s.clientAmount, clientPaid: s.clientPaid ? 'PAID' : 'PENDING', clientPaidAt: s.clientPaidAt || '',
        crewPayoutTotal: totalCrewPayout, crewAssignments: crewNames, deliverables: deliverableSummary, createdAt: s.createdAt,
      };
    });
  }, [filteredShoots, clientMap, cameramanMap]);

  const handleEdit = (shoot: Shoot, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setEditingShoot(shoot); setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setDeleteShootId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteShootId) {
      await handleSoftDelete('shoots', deleteShootId);
      setDeleteShootId(null);
    }
  };

  const canActDelete = user ? canDelete(user.role) : false;

  const getStatusColor = (status: string) => {
    if (status === 'done') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (status === 'scheduled') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header
        title="Production Shoots" subtitle="Manage video shoots, freelance crews, client receivables, and deliverable links"
        searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Search shoots by client, location, date..."
        onOpenMobile={onOpenMobileNav}
        action={
          <div className="flex items-center gap-2">
            <ExportCsvButton filename="Shoots_Production_Schedule" data={csvData} label="Export CSV" />
            <button type="button" onClick={() => { setEditingShoot(null); setIsFormOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs">
              <Plus className="w-4 h-4" /> <span>Schedule Shoot</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text)]">
            <Filter className="w-3.5 h-3.5 text-[var(--color-accent)]" /> <span>Filter Shoots</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Shoot Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="w-full text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 text-[var(--color-text)] outline-none capitalize">
                <option value="all">All Statuses</option>
                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.value}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Client Payment</label>
              <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as any)}
                className="w-full text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 text-[var(--color-text)] outline-none">
                <option value="all">All Payment Statuses</option>
                <option value="pending">Pending Client Payment</option>
                <option value="paid">Payment Received (Settled)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Client Brand</label>
              <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
                className="w-full text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 text-[var(--color-text)] outline-none">
                <option value="all">All Clients ({clients.length})</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Assigned Cameraman</label>
              <select value={cameramanFilter} onChange={e => setCameramanFilter(e.target.value)}
                className="w-full text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 text-[var(--color-text)] outline-none">
                <option value="all">All Cameramen ({cameramen.length})</option>
                {cameramen.map(cam => <option key={cam.id} value={cam.id}>{cam.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {filteredShoots.length === 0 ? (
          <EmptyState
            icon={<Film className="w-6 h-6 text-[var(--color-text-muted)]" />} title="No Production Shoots Found"
            description={searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' ? 'No shoot jobs match your filter criteria.' : 'Schedule your first video or photo production shoot to get started.'}
            actionLabel={searchQuery ? undefined : 'Schedule First Shoot'}
            onAction={searchQuery ? undefined : () => { setEditingShoot(null); setIsFormOpen(true); }}
          />
        ) : (
          <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                <thead className="bg-[var(--color-bg)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Date</th>
                    <th className="px-6 py-3.5 font-semibold">Client / Brand</th>
                    <th className="px-6 py-3.5 font-semibold">Location</th>
                    <th className="px-6 py-3.5 font-semibold">Crew Assigned</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Client Bill (₹)</th>
                    <th className="px-6 py-3.5 font-semibold text-center">Payment</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredShoots.map((shoot) => {
                    const client = clientMap.get(shoot.clientId);
                    const overdueInfo = checkOverdue(shoot.date, shoot.clientPaid, shoot.status, operationalSettings.paymentGraceDays);
                    const assignedCams = (shoot.assignments || []).map(a => ({ ...a, name: cameramanMap.get(a.cameramanId)?.name || 'Crew' }));
                    const isPending = shoot._pendingStatus === 'pending_create' || shoot._pendingStatus === 'pending_edit';
                    const isRejected = shoot._pendingStatus === 'rejected';

                    return (
                      <tr key={shoot.id} onClick={() => !isPending && !isRejected && navigate(`/shoots/${shoot.id}`)}
                        className={`transition-colors group ${isPending || isRejected ? 'opacity-70 bg-[var(--color-bg-hover)]' : 'hover:bg-[var(--color-bg-hover)] cursor-pointer'}`}>
                        <td className="px-6 py-4 font-mono font-medium text-[var(--color-text)] whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />{shoot.date}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-sm text-[var(--color-text)]">
                          <div className="flex items-center gap-2">
                            <Link to={`/clients/${shoot.clientId}`} onClick={e => e.stopPropagation()} className={`text-[var(--color-text-primary)] ${!isPending && !isRejected ? 'group-hover:underline' : 'pointer-events-none'} flex items-center gap-1`}>
                              <span>{client?.name || 'Unknown Client'}</span>
                            </Link>
                            {isPending && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">PENDING</span>}
                            {isRejected && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">REJECTED</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                          <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" /><span className="truncate max-w-[160px]">{shoot.location}</span></span>
                        </td>
                        <td className="px-6 py-4">
                          {assignedCams.length === 0 ? <span className="text-[11px] text-[var(--color-text-muted)] italic">No crew assigned</span> : (
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {assignedCams.map((c, i) => (
                                <span key={i} className="inline-flex items-center px-1.5 py-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[10px] text-[var(--color-text-secondary)]">
                                  {c.name} (₹{c.amount}{(c.callTime || shoot.callTime) ? ` • ${formatTime12h(c.callTime || shoot.callTime)}` : ''})
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleUpdateOrSubmit('shoots', shoot.id, { status: shoot.status === 'scheduled' ? 'done' : 'scheduled' }); }} disabled={isPending}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 ${getStatusColor(shoot.status)}`} title="Click to toggle scheduled/done status">
                            {shoot.status}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--color-text)] whitespace-nowrap">{formatCurrency(shoot.clientAmount)}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleClientPayment(shoot.id, !shoot.clientPaid); }} disabled={isPending}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-colors disabled:opacity-50 ${shoot.clientPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'}`}>
                              {shoot.clientPaid ? <><CheckCircle2 className="w-3.5 h-3.5" /><span>Paid</span></> : <><Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /><span>Pending</span></>}
                            </button>
                            <OverdueBadge isPaid={shoot.clientPaid} overdueInfo={overdueInfo} size="sm" />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link to={`/shoots/${shoot.id}`} onClick={e => isPending ? e.preventDefault() : e.stopPropagation()} className={`px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] bg-[var(--color-bg)] rounded border border-[var(--color-border)] ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>Open</Link>
                            <button type="button" onClick={e => handleEdit(shoot as Shoot, e)} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] rounded-md transition-colors" title="Edit Shoot">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {canActDelete && (
                              <button type="button" onClick={e => handleDeleteClick(shoot.id, e)} disabled={isPending} className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50" title="Delete Shoot">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <ShootForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingShoot(null); }} initialShoot={editingShoot} />
      <ConfirmDialog isOpen={Boolean(deleteShootId)} onClose={() => setDeleteShootId(null)} onConfirm={handleConfirmDelete}
        title="Delete Shoot Record" message="Are you sure you want to delete this shoot? It will be moved to the recycle bin." confirmLabel="Delete Shoot" isDestructive />
    </div>
  );
};
