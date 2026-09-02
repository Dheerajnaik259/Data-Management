import React, { useState, useEffect } from 'react';
import { SlideOver } from '../common/SlideOver';
import { ChangeRequest, Client } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { canSubmitForApproval } from '../../utils/permissions';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialClient?: Client | null;
  resubmission?: ChangeRequest | null;
}

export const ClientForm: React.FC<ClientFormProps> = ({ isOpen, onClose, initialClient, resubmission }) => {
  const { clients, handleCreateOrSubmit, handleUpdateOrSubmit, handleEditAndResubmit, getSettingsOptions } = useData();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [contractLink, setContractLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusOptions = getSettingsOptions('clientStatus');
  const defaultStatus = statusOptions[0]?.value || '';

  useEffect(() => {
    if (!isOpen) return;
    if (resubmission) {
      const proposed = resubmission.proposedData;
      setName(String(proposed.name || '')); setPhone(String(proposed.phone || ''));
      setEmail(String(proposed.email || ''));
      setNotes(String(proposed.notes || '')); setStatus(String(proposed.status || defaultStatus));
      setContractLink(String(proposed.contractLink || ''));
    } else if (initialClient) {
      setName(initialClient.name); setPhone(initialClient.phone);
      setEmail(initialClient.email || '');
      setNotes(initialClient.notes || ''); setStatus(initialClient.status || defaultStatus);
      setContractLink(initialClient.contractLink || '');
    } else {
      setName(''); setPhone(''); setEmail(''); setNotes(''); setStatus(defaultStatus); setContractLink('');
    }
    setErrorMessage(null);
  }, [isOpen, initialClient?.id, resubmission?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setErrorMessage(null);
    if (!name.trim()) { setErrorMessage('Client name is required.'); return; }
    if (!phone.trim()) { setErrorMessage('Phone number is required.'); return; }
    if (!email.trim()) { setErrorMessage('Email address is required.'); return; }

    if (!initialClient && !resubmission) {
      const duplicate = clients.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (duplicate) {
        setErrorMessage(`A client account named "${name.trim()}" already exists.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const data = { name: name.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim(), status, contractLink: contractLink.trim() };
      if (resubmission) {
        await handleEditAndResubmit(resubmission.id, data);
      } else if (initialClient) {
        await handleUpdateOrSubmit('clients', initialClient.id, data);
      } else {
        await handleCreateOrSubmit('clients', data);
      }
      onClose();
    } catch (err) {
      console.error('Error saving client:', err);
      setErrorMessage('Failed to save. Please try again.');
    } finally { setIsSaving(false); }
  };

  const isAdmin = Boolean(user && canSubmitForApproval(user.role));
  const submitLabel = isSaving ? 'Saving...' : resubmission ? 'Resubmit for Approval' : initialClient
    ? (isAdmin ? 'Submit Update for Approval' : 'Update Client')
    : (isAdmin ? 'Submit for Approval' : 'Add Client');

  return (
    <SlideOver isOpen={isOpen} onClose={onClose}
      title={resubmission ? 'Edit & Resubmit Client' : initialClient ? 'Edit Client Record' : 'Add New Client'}
      subtitle="Enter company details, contact information, and contract references">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-800 dark:text-red-300">{errorMessage}</div>
        )}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Client / Brand Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Aura Lifestyle & Apparel"
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Primary Phone *</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+91 98765 43210"
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Billing Email *</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="accounts@client.com"
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Account Status *</label>
          <select value={status || defaultStatus} onChange={e => setStatus(e.target.value)}
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] outline-none capitalize">
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="capitalize">
                {opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Contract Link</label>
          <input type="url" value={contractLink} onChange={e => setContractLink(e.target.value)} placeholder="https://drive.google.com/..."
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Notes</label>
          <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Key contacts, billing cycle, special requirements..."
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] outline-none" />
        </div>
        <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3 sticky bottom-0 bg-[var(--color-surface)] py-3">
          <button type="button" onClick={onClose} disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors">Cancel</button>
          <button type="submit" disabled={isSaving}
            className="px-5 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs disabled:opacity-50">{submitLabel}</button>
        </div>
      </form>
    </SlideOver>
  );
};
