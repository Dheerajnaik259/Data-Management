import React, { useState, useEffect } from 'react';
import { SlideOver } from '../common/SlideOver';
import { Cameraman, ChangeRequest } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { parseCurrencyInput } from '../../utils/formatCurrency';
import { canSubmitForApproval } from '../../utils/permissions';

interface CameramanFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialCameraman?: Cameraman | null;
  resubmission?: ChangeRequest | null;
}

export const CameramanForm: React.FC<CameramanFormProps> = ({ isOpen, onClose, initialCameraman, resubmission }) => {
  const { cameramen, handleCreateOrSubmit, handleUpdateOrSubmit, handleEditAndResubmit } = useData();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rate, setRate] = useState<number>(3000);
  const [notes, setNotes] = useState('');
  const [contractLink, setContractLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (resubmission) {
      const proposed = resubmission.proposedData || {};
      const existingCam = resubmission.targetDocId ? cameramen.find(c => c.id === resubmission.targetDocId) : null;

      setName(String(proposed.name || existingCam?.name || ''));
      setPhone(String(proposed.phone || existingCam?.phone || ''));
      setRate(Number(proposed.rate ?? existingCam?.rate ?? 0));
      setNotes(String(proposed.notes || existingCam?.notes || ''));
      setContractLink(String(proposed.contractLink || proposed.contract_link || existingCam?.contractLink || ''));
    } else if (initialCameraman) {
      setName(initialCameraman.name); setPhone(initialCameraman.phone);
      setRate(initialCameraman.rate || 0); setNotes(initialCameraman.notes || '');
      setContractLink(initialCameraman.contractLink || '');
    } else { setName(''); setPhone(''); setRate(3000); setNotes(''); setContractLink(''); }
    setErrorMessage(null);
  }, [isOpen, initialCameraman?.id, resubmission?.id, cameramen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setErrorMessage(null);
    if (!name.trim()) { setErrorMessage('Name is required.'); return; }
    if (!phone.trim()) { setErrorMessage('Phone is required.'); return; }

    if (!initialCameraman && !resubmission) {
      const duplicate = cameramen.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase() || c.phone.trim() === phone.trim());
      if (duplicate) {
        setErrorMessage(`A cameraman with name "${name.trim()}" or phone "${phone.trim()}" already exists.`);
        return;
      }
    }
    setIsSaving(true);
    try {
      const data = { name: name.trim(), phone: phone.trim(), rate, notes: notes.trim(), contractLink: contractLink.trim() };
      if (resubmission) { await handleEditAndResubmit(resubmission.id, data); }
      else if (initialCameraman) { await handleUpdateOrSubmit('cameramen', initialCameraman.id, data); }
      else { await handleCreateOrSubmit('cameramen', data); }
      onClose();
    } catch { setErrorMessage('Failed to save. Try again.'); }
    finally { setIsSaving(false); }
  };

  const isAdmin = Boolean(user && canSubmitForApproval(user.role));
  const submitLabel = isSaving ? 'Saving...' : resubmission ? 'Resubmit for Approval' : initialCameraman
    ? (isAdmin ? 'Submit Update for Approval' : 'Update Cameraman')
    : (isAdmin ? 'Submit for Approval' : 'Add Cameraman');

  return (
    <SlideOver isOpen={isOpen} onClose={onClose}
      title={resubmission ? 'Edit & Resubmit Cameraman' : initialCameraman ? 'Edit Cameraman' : 'Add Freelance Cameraman'}
      subtitle="Crew roster, contact details, standard daily rates">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-800 dark:text-red-300">{errorMessage}</div>}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Full Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Rohan Sharma"
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Phone / WhatsApp *</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+91 98765 11223"
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none" />
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Include the country code so schedule messages open in the correct WhatsApp chat.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Standard Rate (₹) *</label>
          <input type="number" min="0" step="100" value={rate || ''} onChange={e => setRate(parseCurrencyInput(e.target.value))} required
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none font-semibold" />
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Default rate prefilled per shoot, customizable per assignment.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Contract / NDA Link</label>
          <input type="url" value={contractLink} onChange={e => setContractLink(e.target.value)} placeholder="https://drive.google.com/..."
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Notes</label>
          <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Gear, specialties..."
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none" />
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
