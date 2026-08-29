import React, { useState, useEffect } from 'react';
import { SlideOver } from '../common/SlideOver';
import { Shoot, CameramanAssignment, Deliverable, ChangeRequest } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { AssignmentEditor } from './AssignmentEditor';
import { DeliverablesEditor } from './DeliverablesEditor';
import { parseCurrencyInput } from '../../utils/formatCurrency';
import { canSubmitForApproval } from '../../utils/permissions';

interface ShootFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialShoot?: Shoot | null;
  resubmission?: ChangeRequest | null;
}

export const ShootForm: React.FC<ShootFormProps> = ({ isOpen, onClose, initialShoot, resubmission }) => {
  const { clients, cameramen, handleCreateOrSubmit, handleUpdateOrSubmit, handleEditAndResubmit, getSettingsOptions, changeRequests } = useData();
  const { user } = useAuth();

  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [callTime, setCallTime] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<string>('');
  const [clientAmount, setClientAmount] = useState<number>(0);
  const [assignments, setAssignments] = useState<CameramanAssignment[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableClients = clients.filter(c => !changeRequests.some(cr => cr.targetCollection === 'clients' && cr.targetDocId === c.id && cr.status === 'pending'));
  const availableCameramen = cameramen.filter(c => !changeRequests.some(cr => cr.targetCollection === 'cameramen' && cr.targetDocId === c.id && cr.status === 'pending'));

  const statusOptions = getSettingsOptions('shootStatus');
  const defaultStatus = statusOptions[0]?.value || '';

  useEffect(() => {
    if (resubmission) {
      const proposed = resubmission.proposedData;
      setClientId(String(proposed.clientId || '')); setDate(String(proposed.date || new Date().toISOString().split('T')[0]));
      setCallTime(String(proposed.callTime || '')); setLocation(String(proposed.location || ''));
      setStatus(String(proposed.status || defaultStatus)); setClientAmount(Number(proposed.clientAmount || 0));
      setAssignments(Array.isArray(proposed.assignments) ? proposed.assignments as CameramanAssignment[] : []);
      setDeliverables(Array.isArray(proposed.deliverables) ? proposed.deliverables as Deliverable[] : []);
    } else if (initialShoot) {
      setClientId(initialShoot.clientId); setDate(initialShoot.date);
      setCallTime(initialShoot.callTime || '');
      setLocation(initialShoot.location); setStatus(initialShoot.status || defaultStatus);
      setClientAmount(initialShoot.clientAmount || 0);
      setAssignments(initialShoot.assignments || []);
      setDeliverables(initialShoot.deliverables || []);
    } else {
      setClientId(availableClients.length > 0 ? availableClients[0].id : '');
      setDate(new Date().toISOString().split('T')[0]);
      setLocation(''); setCallTime(''); setStatus(defaultStatus); setClientAmount(0);
      setAssignments([]); setDeliverables([]);
    }
    setErrorMessage(null);
  }, [initialShoot, isOpen, availableClients, defaultStatus, resubmission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!clientId) { setErrorMessage('Please select a client.'); return; }
    if (!location.trim()) { setErrorMessage('Location is required.'); return; }
    if (!date) { setErrorMessage('Date is required.'); return; }
    if (clientAmount < 0) { setErrorMessage('Client amount must be non-negative.'); return; }
    
    // Check pending dependencies (cannot link to a pending client/cameraman)
    // Actually the picker shouldn't show them if they are excluded, but let's assume they are valid if selected.

    setIsSaving(true);
    try {
      const data = { clientId, date, callTime: callTime.trim(), location: location.trim(), status, clientAmount, assignments, deliverables };
      if (resubmission) {
        await handleEditAndResubmit(resubmission.id, data);
      } else if (initialShoot) {
        await handleUpdateOrSubmit('shoots', initialShoot.id, data);
      } else {
        await handleCreateOrSubmit('shoots', { ...data, clientPaid: false, clientInvoiceNumber: null });
      }
      onClose();
    } catch { setErrorMessage('Failed to save shoot details. Try again.'); }
    finally { setIsSaving(false); }
  };

  const isAdmin = Boolean(user && canSubmitForApproval(user.role));
  const submitLabel = isSaving ? 'Saving...' : resubmission ? 'Resubmit for Approval' : initialShoot
    ? (isAdmin ? 'Submit Update for Approval' : 'Update Shoot')
    : (isAdmin ? 'Submit for Approval' : 'Create Shoot');

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} widthClass="max-w-2xl"
      title={resubmission ? 'Edit & Resubmit Shoot' : initialShoot ? 'Edit Shoot Details' : 'Schedule New Shoot'}
      subtitle="Job details, client billing, crew assignments, and deliverables">
      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        {errorMessage && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-800 dark:text-red-300">{errorMessage}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Client *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} required
              className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none">
              <option value="" disabled>Select a client...</option>
              {availableClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Shoot Status *</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none capitalize">
              {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.value}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Shoot Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Location *</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Olive Studio, Bandra" required
              className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">General Call Time</label>
          <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)}
            className="w-full max-w-xs text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none" />
        </div>

        <div className="pt-4 border-t border-[var(--color-border)]">
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Client Billing Amount (₹) *</label>
          <input type="number" min="0" step="500" value={clientAmount || ''} onChange={e => setClientAmount(parseCurrencyInput(e.target.value))} placeholder="e.g. 45000" required
            className="w-full max-w-xs text-lg bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none font-bold" />
        </div>

        <div className="pt-4 border-t border-[var(--color-border)]">
          <AssignmentEditor assignments={assignments} onChange={setAssignments} cameramen={availableCameramen} shootDate={date} generalCallTime={callTime} />
        </div>

        <div className="pt-4 border-t border-[var(--color-border)]">
          <DeliverablesEditor deliverables={deliverables} onChange={setDeliverables} />
        </div>

        <div className="fixed bottom-0 right-0 w-full md:w-[42rem] max-w-full bg-[var(--color-surface)] border-t border-[var(--color-border)] px-6 py-4 flex items-center justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button type="button" onClick={onClose} disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors">Cancel</button>
          <button type="submit" disabled={isSaving}
            className="px-6 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] shadow-xs disabled:opacity-50 transition-colors">{submitLabel}</button>
        </div>
      </form>
    </SlideOver>
  );
};
