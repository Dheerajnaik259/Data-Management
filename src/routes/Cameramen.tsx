import React, { useState, useMemo } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { Cameraman } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { CameramanForm } from '../components/cameramen/CameramanForm';
import { ExportCsvButton } from '../components/common/ExportCsvButton';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Plus, Edit2, Trash2, Phone, Video, ExternalLink, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canDelete } from '../utils/permissions';
import { mergePendingItems } from '../utils/pendingMerge';

export const Cameramen: React.FC = () => {
  const navigate = useNavigate();
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { cameramen, getCameramanLedger, handleSoftDelete } = useData();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCameraman, setEditingCameraman] = useState<Cameraman | null>(null);
  const [deleteCamId, setDeleteCamId] = useState<string | null>(null);

  const { changeRequests } = useData();

  const mergedCameramen = useMemo(() => {
    return mergePendingItems(cameramen, changeRequests, 'cameramen');
  }, [cameramen, changeRequests]);

  const filteredCameramen = useMemo(() => {
    return mergedCameramen.filter((cam) => {
      return (
        cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cam.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cam.notes && cam.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [mergedCameramen, searchQuery]);

  const csvData = useMemo(() => {
    return filteredCameramen.map((c) => {
      const ledger = getCameramanLedger(c.id);
      return {
        id: c.id, name: c.name, phone: c.phone, standardRate: c.rate,
        totalAssigned: ledger.totalAssigned, totalPaid: ledger.totalPaid, outstanding: ledger.outstanding,
        contractLink: c.contractLink || '', createdAt: c.createdAt, notes: c.notes || '',
      };
    });
  }, [filteredCameramen, getCameramanLedger]);

  const handleEdit = (cam: Cameraman, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setEditingCameraman(cam); setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setDeleteCamId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteCamId) {
      await handleSoftDelete('cameramen', deleteCamId);
      setDeleteCamId(null);
    }
  };

  const canActDelete = user ? canDelete(user.role) : false;

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header
        title="Cameramen & Freelance Crew"
        subtitle="Freelance videographers, standard rate cards, and disbursement ledgers"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search cameramen by name, gear, phone..."
        onOpenMobile={onOpenMobileNav}
        action={
          <div className="flex items-center gap-2">
            <ExportCsvButton filename="Cameramen_Roster" data={csvData} label="Export CSV" />
            <button type="button" onClick={() => { setEditingCameraman(null); setIsFormOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs">
              <Plus className="w-4 h-4" /> <span>Add Cameraman</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--color-text-secondary)]">Showing {filteredCameramen.length} registered freelance operators</p>
        </div>

        {filteredCameramen.length === 0 ? (
          <EmptyState
            icon={<Video className="w-6 h-6 text-[var(--color-text-muted)]" />}
            title="No Cameramen Found"
            description={searchQuery ? 'No cameraman matched your search. Try changing the query.' : 'Add freelance cameramen to your roster to assign them to shoot jobs.'}
            actionLabel={searchQuery ? undefined : 'Add First Cameraman'}
            onAction={searchQuery ? undefined : () => { setEditingCameraman(null); setIsFormOpen(true); }}
          />
        ) : (
          <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                <thead className="bg-[var(--color-bg)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Cameraman</th>
                    <th className="px-6 py-3.5 font-semibold">Phone / WhatsApp</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Standard Daily Rate</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Total Assigned</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Total Paid</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Payout Due</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredCameramen.map((cam) => {
                    const ledger = getCameramanLedger(cam.id);
                    const isPending = cam._pendingStatus === 'pending_create' || cam._pendingStatus === 'pending_edit';
                    const isRejected = cam._pendingStatus === 'rejected';

                    return (
                      <tr key={cam.id} onClick={() => !isPending && !isRejected && navigate(`/cameramen/${cam.id}`)}
                        className={`transition-colors group ${isPending || isRejected ? 'opacity-70 bg-[var(--color-bg-hover)]' : 'hover:bg-[var(--color-bg-hover)] cursor-pointer'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link to={`/cameramen/${cam.id}`} className={`font-semibold text-sm text-[var(--color-text-primary)] ${!isPending && !isRejected ? 'group-hover:underline' : 'pointer-events-none'}`}>
                              {cam.name}
                            </Link>
                            {isPending && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">PENDING</span>}
                            {isRejected && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">REJECTED</span>}
                          </div>
                          {cam.notes && <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-xs mt-0.5">{cam.notes}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-[var(--color-text-secondary)]"><Phone className="w-3 h-3 text-[var(--color-text-muted)]" />{cam.phone}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-[var(--color-text)]">
                          {formatCurrency(cam.rate)}/day
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-[var(--color-text-secondary)]">{formatCurrency(ledger.totalAssigned)}</td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-500">{formatCurrency(ledger.totalPaid)}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold">
                          <span className={ledger.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-muted)]'}>
                            {formatCurrency(ledger.outstanding)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {cam.contractLink && (
                              <a href={cam.contractLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] rounded-md transition-colors" title="View Contract">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button type="button" onClick={(e) => handleEdit(cam as Cameraman, e)} disabled={isPending}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] rounded-md transition-colors disabled:opacity-50" title="Edit Cameraman">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {canActDelete && (
                              <button type="button" onClick={(e) => handleDeleteClick(cam.id, e)} disabled={isPending}
                                className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50" title="Delete Cameraman">
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

      <CameramanForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingCameraman(null); }} initialCameraman={editingCameraman} />
      <ConfirmDialog isOpen={Boolean(deleteCamId)} onClose={() => setDeleteCamId(null)} onConfirm={handleConfirmDelete}
        title="Delete Cameraman" message="Are you sure you want to remove this cameraman from the roster? They will be moved to the recycle bin." confirmLabel="Delete Cameraman" isDestructive />
    </div>
  );
};
