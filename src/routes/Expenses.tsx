import React, { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { Expense } from '../types';
import { formatCurrency } from '../utils/formatCurrency';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { ExportCsvButton } from '../components/common/ExportCsvButton';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Plus, Edit2, Trash2, Receipt, Car, Camera, Laptop, Layers, Calendar, Filter, Film } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canDelete } from '../utils/permissions';
import { mergePendingItems } from '../utils/pendingMerge';

export const Expenses: React.FC = () => {
  const { onOpenMobileNav } = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { expenses, shoots, clients, handleSoftDelete, getSettingsOptions } = useData();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [shootFilter, setShootFilter] = useState<string>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const shootMap = useMemo(() => new Map(shoots.map(s => [s.id, s])), [shoots]);
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
  const categoryOptions = getSettingsOptions('expenseCategories');

  const { changeRequests } = useData();

  const mergedExpenses = useMemo(() => {
    return mergePendingItems(expenses, changeRequests, 'expenses');
  }, [expenses, changeRequests]);

  const filteredExpenses = useMemo(() => {
    return mergedExpenses.filter(exp => {
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
      if (shootFilter !== 'all' && exp.shootId !== shootFilter) return false;
      const shootLoc = (exp.shootId ? shootMap.get(exp.shootId)?.location : '') || '';
      return exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || exp.date.includes(searchQuery) || shootLoc.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [mergedExpenses, categoryFilter, shootFilter, searchQuery, shootMap]);

  const categoryStats = useMemo(() => {
    let travel = 0, equipment = 0, software = 0, other = 0;
    expenses.forEach(e => {
      if (e.category === 'travel') travel += e.amount;
      else if (e.category === 'equipment') equipment += e.amount;
      else if (e.category === 'software') software += e.amount;
      else other += e.amount;
    });
    return { travel, equipment, software, other, total: travel + equipment + software + other };
  }, [expenses]);

  const csvData = useMemo(() => {
    return filteredExpenses.map(e => {
      const shoot = e.shootId ? shootMap.get(e.shootId) : null;
      return {
        id: e.id, description: e.description, amount: e.amount, date: e.date, category: e.category,
        linkedShootLocation: shoot ? shoot.location : 'General Overhead',
        linkedShootDate: shoot ? shoot.date : 'N/A',
        linkedClient: shoot ? clientMap.get(shoot.clientId) || 'Client' : 'N/A',
        createdAt: e.createdAt,
      };
    });
  }, [filteredExpenses, shootMap, clientMap]);

  const handleEdit = (exp: Expense) => { setEditingExpense(exp); setIsFormOpen(true); };
  const handleDeleteConfirm = async () => { if (deleteExpenseId) { await handleSoftDelete('expenses', deleteExpenseId); setDeleteExpenseId(null); } };
  const canActDelete = user ? canDelete(user.role) : false;

  const getCategoryIcon = (cat: string) => {
    if (cat === 'travel') return <Car className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
    if (cat === 'equipment') return <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    if (cat === 'software') return <Laptop className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
    return <Layers className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <Header
        title="Operating Expenses" subtitle="Track travel fares, camera rentals, subscriptions, and production expenditures"
        searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Search expenses by description, shoot, date..."
        onOpenMobile={onOpenMobileNav}
        action={
          <div className="flex items-center gap-2">
            <ExportCsvButton filename="Operating_Expenses_Ledger" data={csvData} label="Export CSV" />
            <button type="button" onClick={() => { setEditingExpense(null); setIsFormOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs">
              <Plus className="w-4 h-4" /> <span>Log Expense</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Travel & Transport</span>
              <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Car className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(categoryStats.travel)}</div>
          </div>
          <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Equipment & Gear</span>
              <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center"><Camera className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(categoryStats.equipment)}</div>
          </div>
          <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Software & Cloud</span>
              <div className="w-7 h-7 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center"><Laptop className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(categoryStats.software)}</div>
          </div>
          <div className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Total Operating Costs</span>
              <div className="w-7 h-7 rounded-md bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)] flex items-center justify-center"><Receipt className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(categoryStats.total)}</div>
            <div className="text-xs text-[var(--color-text-muted)]"><span>{expenses.length} receipts logged (showing {filteredExpenses.length})</span></div>
          </div>
        </section>

        <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-[var(--color-bg)] p-1 rounded-md border border-[var(--color-border)] text-xs flex-wrap">
            <button type="button" onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${categoryFilter === 'all' ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-2xs' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>
              All Categories ({expenses.length})
            </button>
            {categoryOptions.map(opt => (
              <button key={opt.value} type="button" onClick={() => setCategoryFilter(opt.value)}
                className={`px-3 py-1.5 rounded font-medium transition-colors capitalize ${categoryFilter === opt.value ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-semibold shadow-2xs' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}`}>
                {opt.value}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <select value={shootFilter} onChange={e => setShootFilter(e.target.value)}
              className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-[var(--color-text)] outline-none max-w-xs truncate">
              <option value="all">All Shoots / Overhead</option>
              {shoots.map(s => <option key={s.id} value={s.id}>{s.date} - {s.location}</option>)}
            </select>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <EmptyState icon={<Receipt className="w-6 h-6 text-[var(--color-text-muted)]" />} title="No Expenses Found" description="No expense receipts match your filters. Log a new expense to get started."
            actionLabel="Log Expense" onAction={() => { setEditingExpense(null); setIsFormOpen(true); }} />
        ) : (
          <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
                <thead className="bg-[var(--color-bg)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Date</th>
                    <th className="px-6 py-3.5 font-semibold">Description</th>
                    <th className="px-6 py-3.5 font-semibold">Category</th>
                    <th className="px-6 py-3.5 font-semibold">Associated Shoot Job</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Amount (₹)</th>
                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredExpenses.map((exp) => {
                    const shoot = exp.shootId ? shootMap.get(exp.shootId) : null;
                    const clientName = shoot ? clientMap.get(shoot.clientId) : null;
                    const isPending = exp._pendingStatus === 'pending_create' || exp._pendingStatus === 'pending_edit';
                    const isRejected = exp._pendingStatus === 'rejected';

                    return (
                      <tr key={exp.id} className={`transition-colors group ${isPending || isRejected ? 'opacity-70 bg-[var(--color-bg-hover)]' : 'hover:bg-[var(--color-bg-hover)]'}`}>
                        <td className="px-6 py-4 font-mono font-medium text-[var(--color-text)] whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />{exp.date}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-sm text-[var(--color-text)]">
                          <div className="flex items-center gap-2">
                            <span>{exp.description}</span>
                            {isPending && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">PENDING</span>}
                            {isRejected && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">REJECTED</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium capitalize bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)]">
                            {getCategoryIcon(exp.category)} <span>{exp.category}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {shoot ? (
                            <Link to={`/shoots/${shoot.id}`} onClick={e => isPending ? e.preventDefault() : e.stopPropagation()} className={`font-medium ${isPending ? 'text-[var(--color-text-primary)] pointer-events-none' : 'text-[var(--color-text-primary)] hover:underline'} flex items-center gap-1`}>
                              <Film className="w-3 h-3 text-[var(--color-text-muted)]" /><span>{shoot.location} ({clientName || 'Client'})</span>
                            </Link>
                          ) : (
                            <span className="text-[11px] text-[var(--color-text-muted)] italic">General Business Overhead</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-sm text-[var(--color-text)] whitespace-nowrap">{formatCurrency(exp.amount)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" onClick={() => handleEdit(exp as Expense)} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] rounded-md transition-colors" title="Edit Expense">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {canActDelete && (
                              <button type="button" onClick={() => setDeleteExpenseId(exp.id)} disabled={isPending} className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50" title="Delete Expense">
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

      <ExpenseForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingExpense(null); }} initialExpense={editingExpense} />
      <ConfirmDialog isOpen={Boolean(deleteExpenseId)} onClose={() => setDeleteExpenseId(null)} onConfirm={handleDeleteConfirm}
        title="Delete Expense" message="Are you sure you want to delete this expense receipt? It will be moved to the recycle bin." confirmLabel="Delete Expense" isDestructive />
    </div>
  );
};
