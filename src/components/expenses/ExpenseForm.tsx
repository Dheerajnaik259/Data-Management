import React, { useState, useEffect } from 'react';
import { SlideOver } from '../common/SlideOver';
import { ChangeRequest, Expense } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { parseCurrencyInput } from '../../utils/formatCurrency';
import { canSubmitForApproval } from '../../utils/permissions';

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialExpense?: Expense | null;
  resubmission?: ChangeRequest | null;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ isOpen, onClose, initialExpense, resubmission }) => {
  const { shoots, clients, handleCreateOrSubmit, handleUpdateOrSubmit, handleEditAndResubmit, getSettingsOptions } = useData();
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('');
  const [shootId, setShootId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categoryOptions = getSettingsOptions('expenseCategories');
  const defaultCategory = categoryOptions[0]?.value || '';

  useEffect(() => {
    if (!isOpen) return;
    if (resubmission) {
      const proposed = resubmission.proposedData;
      setDescription(String(proposed.description || '')); setAmount(Number(proposed.amount || 0));
      setDate(String(proposed.date || new Date().toISOString().split('T')[0]));
      setCategory(String(proposed.category || defaultCategory)); setShootId(String(proposed.shootId || ''));
    } else if (initialExpense) {
      setDescription(initialExpense.description); setAmount(initialExpense.amount || 0);
      setDate(initialExpense.date); setCategory(initialExpense.category || defaultCategory);
      setShootId(initialExpense.shootId || '');
    } else {
      setDescription(''); setAmount(0); setDate(new Date().toISOString().split('T')[0]);
      setCategory(defaultCategory); setShootId('');
    }
    setErrorMessage(null);
  }, [isOpen, initialExpense?.id, resubmission?.id]);

  const clientMap = new Map<string, string>(clients.map(c => [c.id, c.name]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setErrorMessage(null);
    if (!description.trim()) { setErrorMessage('Description is required.'); return; }
    if (amount <= 0) { setErrorMessage('Amount must be > 0.'); return; }
    if (!date) { setErrorMessage('Date is required.'); return; }

    setIsSaving(true);
    try {
      const data = { description: description.trim(), amount, date, category, shootId: shootId || undefined };
      if (resubmission) { await handleEditAndResubmit(resubmission.id, data); }
      else if (initialExpense) { await handleUpdateOrSubmit('expenses', initialExpense.id, data); }
      else { await handleCreateOrSubmit('expenses', data); }
      onClose();
    } catch { setErrorMessage('Failed to save expense. Try again.'); }
    finally { setIsSaving(false); }
  };

  const isAdmin = Boolean(user && canSubmitForApproval(user.role));
  const submitLabel = isSaving ? 'Saving...' : resubmission ? 'Resubmit for Approval' : initialExpense
    ? (isAdmin ? 'Submit Update for Approval' : 'Update Expense')
    : (isAdmin ? 'Submit for Approval' : 'Add Expense');

  return (
    <SlideOver isOpen={isOpen} onClose={onClose}
      title={resubmission ? 'Edit & Resubmit Expense' : initialExpense ? 'Edit Expense Record' : 'Record Business Expense'}
      subtitle="Track travel, gear rentals, software, and overhead costs">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-800 dark:text-red-300">{errorMessage}</div>}
        
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Description *</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} required placeholder="e.g. Uber cab for crew"
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Amount (₹) *</label>
            <input type="number" min="1" step="50" value={amount || ''} onChange={e => setAmount(parseCurrencyInput(e.target.value))} required
              className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none" />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Category *</label>
          <select value={category || defaultCategory} onChange={e => setCategory(e.target.value)}
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none capitalize">
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="capitalize">
                {opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Link to Shoot (Optional)</label>
          <select value={shootId} onChange={e => setShootId(e.target.value)}
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none">
            <option value="">-- General Operational Expense (No Shoot) --</option>
            {shoots.map(s => (
              <option key={s.id} value={s.id}>{s.date} - {clientMap.get(s.clientId) || 'Unknown Client'} ({s.location})</option>
            ))}
          </select>
        </div>
        
        <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3 sticky bottom-0 bg-[var(--color-surface)] py-3">
          <button type="button" onClick={onClose} disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)]">Cancel</button>
          <button type="submit" disabled={isSaving}
            className="px-5 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] shadow-xs disabled:opacity-50">{submitLabel}</button>
        </div>
      </form>
    </SlideOver>
  );
};
