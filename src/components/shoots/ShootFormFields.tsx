import React, { Dispatch, FormEventHandler, SetStateAction } from 'react';
import { Cameraman, Client, SettingsOption } from '../../types';
import { parseCurrencyInput } from '../../utils/formatCurrency';
import { AssignmentEditor } from './AssignmentEditor';
import { DeliverablesEditor } from './DeliverablesEditor';
import { ShootFormValues } from './shootFormLogic';
import { TimeInput12h } from '../common/TimeInput12h';

interface ShootFormChangeHandlers {
  clientId: Dispatch<SetStateAction<string>>;
  date: Dispatch<SetStateAction<string>>;
  callTime: Dispatch<SetStateAction<string>>;
  location: Dispatch<SetStateAction<string>>;
  status: Dispatch<SetStateAction<string>>;
  clientAmount: Dispatch<SetStateAction<number>>;
  assignments: Dispatch<SetStateAction<ShootFormValues['assignments']>>;
  deliverables: Dispatch<SetStateAction<ShootFormValues['deliverables']>>;
}

interface ShootFormFieldsProps {
  values: ShootFormValues;
  onChange: ShootFormChangeHandlers;
  clients: Client[];
  cameramen: Cameraman[];
  statusOptions: SettingsOption[];
  errorMessage: string | null;
  isSaving: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export const ShootFormFields: React.FC<ShootFormFieldsProps> = ({
  values,
  onChange,
  clients,
  cameramen,
  statusOptions,
  errorMessage,
  isSaving,
  submitLabel,
  onClose,
  onSubmit,
}) => (
  <form onSubmit={onSubmit} className="space-y-6 pb-20">
    {errorMessage && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-800 dark:text-red-300">{errorMessage}</div>}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Client *</label>
        <select value={values.clientId} onChange={event => onChange.clientId(event.target.value)} required
          className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none">
          <option value="" disabled>Select a client...</option>
          {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Shoot Status *</label>
        <select value={values.status} onChange={event => onChange.status(event.target.value)}
          className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none capitalize">
          {statusOptions.map(option => <option key={option.value} value={option.value}>{option.value}</option>)}
        </select>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Shoot Date *</label>
        <input type="date" value={values.date} onChange={event => onChange.date(event.target.value)} required
          className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Location *</label>
        <input type="text" value={values.location} onChange={event => onChange.location(event.target.value)} placeholder="e.g. Olive Studio, Bandra" required
          className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none" />
      </div>
    </div>

    <div>
      <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">General Call Time</label>
      <TimeInput12h value={values.callTime} onChange={onChange.callTime} />
      <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">Required when assigning crew unless each cameraman has a call-time override.</p>
    </div>

    <div className="pt-4 border-t border-[var(--color-border)]">
      <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5">Client Billing Amount (₹) *</label>
      <input type="number" min="0" max="9999999" step="any" value={values.clientAmount || ''} onChange={event => onChange.clientAmount(parseCurrencyInput(event.target.value))} placeholder="e.g. 45000"
        className="w-full max-w-xs text-lg bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none font-bold" />
    </div>

    <div className="pt-4 border-t border-[var(--color-border)]">
      <AssignmentEditor assignments={values.assignments} onChange={onChange.assignments} cameramen={cameramen} shootDate={values.date} generalCallTime={values.callTime} />
    </div>

    <div className="pt-4 border-t border-[var(--color-border)]">
      <DeliverablesEditor deliverables={values.deliverables} onChange={onChange.deliverables} />
    </div>

    <div className="fixed bottom-0 right-0 w-full md:w-[42rem] max-w-full bg-[var(--color-surface)] border-t border-[var(--color-border)] px-6 py-4 flex items-center justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <button type="button" onClick={onClose} disabled={isSaving}
        className="px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors">Cancel</button>
      <button type="submit" disabled={isSaving}
        className="px-6 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] shadow-xs disabled:opacity-50 transition-colors">{submitLabel}</button>
    </div>
  </form>
);
