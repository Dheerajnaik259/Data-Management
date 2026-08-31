import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { canRestore, canHardDelete } from '../utils/permissions';
import { RotateCcw, Trash2, CheckSquare, Square } from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ManagedCollection } from '../types';

export const RecycleBin: React.FC = () => {
  const ctx = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { deletedRecords, handleRestore, handleHardDelete } = useData();
  const { user } = useAuth();

  const [confirmAction, setConfirmAction] = useState<{ col: ManagedCollection; id: string; type: 'restore' | 'delete' } | null>(null);
  const [bulkConfirmType, setBulkConfirmType] = useState<'restore' | 'delete' | null>(null);
  const [filterCol, setFilterCol] = useState<string>('all');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const canRes = user ? canRestore(user.role) : false;
  const canHard = user ? canHardDelete(user.role) : false;
  const filtered = filterCol === 'all' ? deletedRecords : deletedRecords.filter(d => d.collection === filterCol);

  const colCounts: Record<string, number> = {};
  deletedRecords.forEach(d => { colCounts[d.collection] = (colCounts[d.collection] || 0) + 1; });

  const getName = (record: Record<string, unknown>): string => {
    return (record.name as string) || (record.description as string) || (record.location as string) || 'Unnamed';
  };

  const handleToggleSelect = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const isAllSelected = filtered.length > 0 && filtered.every(item => selectedKeys.has(`${item.collection}-${(item.record as { id: string }).id}`));

  const handleSelectAll = () => {
    if (isAllSelected) {
      const next = new Set(selectedKeys);
      filtered.forEach(item => next.delete(`${item.collection}-${(item.record as { id: string }).id}`));
      setSelectedKeys(next);
    } else {
      const next = new Set(selectedKeys);
      filtered.forEach(item => next.add(`${item.collection}-${(item.record as { id: string }).id}`));
      setSelectedKeys(next);
    }
  };

  const handleSingleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'restore') await handleRestore(confirmAction.col, confirmAction.id);
    else await handleHardDelete(confirmAction.col, confirmAction.id);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.delete(`${confirmAction.col}-${confirmAction.id}`);
      return next;
    });
    setConfirmAction(null);
  };

  const handleBulkAction = async () => {
    if (!bulkConfirmType) return;
    const selectedItems = filtered.filter(item => selectedKeys.has(`${item.collection}-${(item.record as { id: string }).id}`));

    if (bulkConfirmType === 'restore') {
      await Promise.all(selectedItems.map(item => handleRestore(item.collection, (item.record as { id: string }).id)));
    } else {
      await Promise.all(selectedItems.map(item => handleHardDelete(item.collection, (item.record as { id: string }).id)));
    }

    const next = new Set(selectedKeys);
    selectedItems.forEach(item => next.delete(`${item.collection}-${(item.record as { id: string }).id}`));
    setSelectedKeys(next);
    setBulkConfirmType(null);
  };

  const selectedCountInFiltered = filtered.filter(item => selectedKeys.has(`${item.collection}-${(item.record as { id: string }).id}`)).length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header title="Recycle Bin" subtitle={`${deletedRecords.length} deleted records`} onOpenMobile={ctx?.onOpenMobileNav} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        
        {/* Bulk Action Bar */}
        {selectedCountInFiltered > 0 && (
          <div className="mb-6 p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg flex items-center justify-between flex-wrap gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text)]">
              <span className="bg-[var(--color-accent)] text-white px-2 py-0.5 rounded text-[11px] font-bold">{selectedCountInFiltered}</span>
              <span>item(s) selected</span>
            </div>
            <div className="flex items-center gap-2">
              {canRes && (
                <button
                  type="button"
                  onClick={() => setBulkConfirmType('restore')}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-md flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore Selected ({selectedCountInFiltered})
                </button>
              )}
              {canHard && (
                <button
                  type="button"
                  onClick={() => setBulkConfirmType('delete')}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md flex items-center gap-1.5 border border-red-200 dark:border-red-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Forever Selected ({selectedCountInFiltered})
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedKeys(new Set())}
                className="px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] underline"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Filter tabs and Select All */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex gap-1 bg-[var(--color-bg)] rounded-lg p-1 w-fit border border-[var(--color-border)]">
            {['all', 'clients', 'cameramen', 'shoots', 'expenses'].map(col => (
              <button key={col} onClick={() => setFilterCol(col)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                  filterCol === col ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-secondary)]'
                }`}>
                {col} {col !== 'all' && colCounts[col] ? `(${colCounts[col]})` : ''}
              </button>
            ))}
          </div>

          {filtered.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-1.5 rounded-md transition-colors"
            >
              {isAllSelected ? <CheckSquare className="w-4 h-4 text-[var(--color-accent)]" /> : <Square className="w-4 h-4 text-[var(--color-text-muted)]" />}
              <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Trash2 className="w-10 h-10 mx-auto text-[var(--color-text-muted)] mb-3 opacity-40" />
            <p className="text-sm text-[var(--color-text-muted)]">Recycle bin is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(({ collection: col, record }) => {
              const itemKey = `${col}-${(record as { id: string }).id}`;
              const isChecked = selectedKeys.has(itemKey);
              return (
                <div key={itemKey}
                  className={`flex items-center gap-4 bg-[var(--color-surface)] border rounded-lg px-5 py-3 transition-colors ${isChecked ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]/10' : 'border-[var(--color-border)]'}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleSelect(itemKey)}
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-medium text-[var(--color-text-muted)] bg-[var(--color-bg)] px-1.5 py-0.5 rounded">{col}</span>
                      <span className="text-sm font-medium text-[var(--color-text)] truncate">{getName(record as unknown as Record<string, unknown>)}</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      Deleted {record.deletedAt ? new Date(record.deletedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canRes && (
                      <button onClick={() => setConfirmAction({ col, id: (record as { id: string }).id, type: 'restore' })}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-md flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                        <RotateCcw className="w-3 h-3" /> Restore
                      </button>
                    )}
                    {canHard && (
                      <button onClick={() => setConfirmAction({ col, id: (record as { id: string }).id, type: 'delete' })}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md flex items-center gap-1 border border-red-200 dark:border-red-800">
                        <Trash2 className="w-3 h-3" /> Delete Forever
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Single Item Confirm Modal */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleSingleConfirm}
        title={confirmAction?.type === 'restore' ? 'Restore Record' : 'Delete Permanently'}
        message={confirmAction?.type === 'restore'
          ? 'This will restore the record back to its original collection.'
          : 'This action cannot be undone. The record will be permanently removed.'}
        confirmLabel={confirmAction?.type === 'restore' ? 'Restore' : 'Delete Forever'}
        isDestructive={confirmAction?.type === 'delete'}
      />

      {/* Bulk Items Confirm Modal */}
      <ConfirmDialog
        isOpen={!!bulkConfirmType}
        onClose={() => setBulkConfirmType(null)}
        onConfirm={handleBulkAction}
        title={bulkConfirmType === 'restore' ? `Restore ${selectedCountInFiltered} Records` : `Delete ${selectedCountInFiltered} Records Permanently`}
        message={bulkConfirmType === 'restore'
          ? `Are you sure you want to restore these ${selectedCountInFiltered} selected records?`
          : `This action cannot be undone. These ${selectedCountInFiltered} selected records will be permanently erased.`}
        confirmLabel={bulkConfirmType === 'restore' ? `Restore All (${selectedCountInFiltered})` : `Delete All Forever (${selectedCountInFiltered})`}
        isDestructive={bulkConfirmType === 'delete'}
      />
    </div>
  );
};
