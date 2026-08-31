import React, { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { Client } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { ClientForm } from '../components/clients/ClientForm';
import { ExportCsvButton } from '../components/common/ExportCsvButton';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Plus, Edit2, Trash2, Phone, ExternalLink, Users, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canDelete } from '../utils/permissions';
import { mergePendingItems } from '../utils/pendingMerge';

export const Clients: React.FC = () => {
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { clients, getClientLedger, handleSoftDelete, handleCleanDuplicates, getSettingsOptions } = useData();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const statusOptions = getSettingsOptions('clientStatus');

  const { changeRequests } = useData();

  const mergedClients = useMemo(() => {
    return mergePendingItems(clients, changeRequests, 'clients');
  }, [clients, changeRequests]);

  const filteredClients = useMemo(() => {
    return mergedClients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.notes && client.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [mergedClients, searchQuery, statusFilter]);

  const csvData = useMemo(() => {
    return filteredClients.map((c) => {
      const ledger = getClientLedger(c.id);
      return {
        id: c.id, name: c.name, phone: c.phone, email: c.email, status: c.status, contractLink: c.contractLink || '',
        totalBilled: ledger.totalBilled, totalPaid: ledger.totalPaid, outstanding: ledger.outstanding,
        createdAt: c.createdAt, notes: c.notes || '',
      };
    });
  }, [filteredClients, getClientLedger]);

  const handleEdit = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setEditingClient(client); setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setDeleteClientId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteClientId) {
      await handleSoftDelete('clients', deleteClientId);
      setDeleteClientId(null);
    }
  };

  const canActDelete = user ? canDelete(user.role) : false;

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header
        title="Client Accounts"
        subtitle="Manage brand clients, contracts, billing ledgers, and contact points"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search clients by name, phone..."
        onOpenMobile={onOpenMobileNav}
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleCleanDuplicates('clients')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
              <span>Clean Duplicates</span>
            </button>
            <ExportCsvButton filename="Clients_List" data={csvData} label="Export CSV" />
            <button type="button" onClick={() => { setEditingClient(null); setIsFormOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs">
              <Plus className="w-4 h-4" /> <span>Add Client</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[var(--color-surface)] p-1 rounded-md border border-[var(--color-border)] text-xs">
            {['all', ...statusOptions.map(option => option.value)].map(status => (
              <button key={status} type="button" onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded font-medium transition-colors capitalize ${
                  statusFilter === status
                    ? 'bg-[var(--color-bg-hover)] text-[var(--color-text)] font-semibold'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}>
                {status} {status !== 'all' && `(${clients.filter(c => c.status === status).length})`}
              </button>
            ))}
          </div>
          <span className="text-xs text-[var(--color-text-secondary)]">Showing {filteredClients.length} of {mergedClients.length} clients</span>
        </div>

        {filteredClients.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6 text-[var(--color-text-muted)]" />}
            title="No Clients Found"
            description={searchQuery ? 'No client matched your search criteria.' : 'Start by adding your first brand or commercial client.'}
            actionLabel={searchQuery ? undefined : 'Add First Client'}
            onAction={searchQuery ? undefined : () => { setEditingClient(null); setIsFormOpen(true); }}
          />
        ) : (
          <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                <thead className="bg-[var(--color-bg)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Client Name</th>
                    <th className="px-6 py-3.5 font-semibold">Phone / WhatsApp</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Total Billed</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Total Paid</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Outstanding</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredClients.map((client) => {
                    const ledger = getClientLedger(client.id);
                    const isPending = client._pendingStatus === 'pending_create' || client._pendingStatus === 'pending_edit';
                    const isRejected = client._pendingStatus === 'rejected';
                    
                    return (
                      <tr key={client.id} onClick={() => !isPending && !isRejected && (window.location.href = `#/clients/${client.id}`)}
                        className={`transition-colors group ${isPending || isRejected ? 'opacity-70 bg-[var(--color-bg-hover)]' : 'hover:bg-[var(--color-bg-hover)] cursor-pointer'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link to={`/clients/${client.id}`} className={`font-semibold text-sm text-[var(--color-text-primary)] ${!isPending && !isRejected ? 'group-hover:underline' : 'pointer-events-none'}`}>
                              {client.name}
                            </Link>
                            {isPending && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">PENDING</span>}
                            {isRejected && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">REJECTED</span>}
                          </div>
                          {client.notes && <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-xs mt-0.5">{client.notes}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 text-[var(--color-text-muted)]" />{client.phone}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            client.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium">{formatCurrency(ledger.totalBilled)}</td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-500">{formatCurrency(ledger.totalPaid)}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold">
                          <span className={ledger.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-muted)]'}>
                            {formatCurrency(ledger.outstanding)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {client.contractLink && (
                              <a href={client.contractLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] rounded-md transition-colors" title="View Contract">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button type="button" onClick={(e) => handleEdit(client as Client, e)} disabled={isPending}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] rounded-md transition-colors disabled:opacity-50" title="Edit Client">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {canActDelete && (
                              <button type="button" onClick={(e) => handleDeleteClick(client.id, e)} disabled={isPending}
                                className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50" title="Delete Client">
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

      <ClientForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingClient(null); }} initialClient={editingClient} />
      <ConfirmDialog isOpen={Boolean(deleteClientId)} onClose={() => setDeleteClientId(null)} onConfirm={handleConfirmDelete}
        title="Delete Client Record" message="Are you sure you want to delete this client? It will be moved to the recycle bin." confirmLabel="Delete Client" isDestructive />
    </div>
  );
};
