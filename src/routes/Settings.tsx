import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { SettingsDoc, SettingsOption } from '../types';
import { Plus, GripVertical, Archive, RotateCcw, Pencil, Check, X, ChevronUp, ChevronDown, Building2, Save, Lock, User, KeyRound, MessageSquare, Sliders } from 'lucide-react';
import { parseBusinessProfileFromSettings, BusinessProfileData, parseOperationalSettings, OperationalSettingsData } from '../config/business';

export const Settings: React.FC = () => {
  const ctx = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { settings, handleUpdateSettings } = useData();
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const businessDoc = settings.find(s => s.key === 'businessProfile');
  const operationalDoc = settings.find(s => s.key === 'operationalSettings');
  const optionListSettings = settings.filter(s => s.key !== 'businessProfile' && s.key !== 'operationalSettings');

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header title="Settings" subtitle="Manage account, operational defaults, company profile, and dropdown lists" onOpenMobile={ctx?.onOpenMobileNav} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        <MyAccountCard />
        <OperationalDefaultsCard setting={operationalDoc} onSave={handleUpdateSettings} />
        <BusinessProfileCard setting={businessDoc} onSave={handleUpdateSettings} />

        {optionListSettings.map(setting => (
          <SettingsCard key={setting.id} setting={setting}
            isEditing={editingKey === setting.key}
            onEdit={() => setEditingKey(setting.key)}
            onClose={() => setEditingKey(null)}
            onSave={handleUpdateSettings} />
        ))}

        {optionListSettings.length === 0 && !businessDoc && !operationalDoc && (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No configurable option lists are available yet. Confirm that the Supabase setup SQL has been applied.</p>
        )}
      </div>
    </div>
  );
};

const MyAccountCard: React.FC = () => {
  const { user, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setIsUpdating(true);
    setMessage(null);
    try {
      await updatePassword(newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden transition-colors shadow-2xs">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-[var(--color-text)]">My Account & Security</h3>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Manage your credentials and login password</p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-[var(--color-accent)]/10 text-[var(--color-accent)] capitalize">
          Role: {user?.role || 'User'}
        </span>
      </div>

      <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">Email Account</label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)] cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {message ? (
            <span className={`text-xs font-semibold flex items-center gap-1 ${message.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {message.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} {message.text}
            </span>
          ) : (
            <span className="text-[11px] text-[var(--color-text-muted)]">Updating password will take effect on your next login session.</span>
          )}

          <button
            type="submit"
            disabled={isUpdating || !newPassword}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isUpdating ? 'Updating...' : 'Update Password'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

interface OperationalDefaultsCardProps {
  setting?: SettingsDoc;
  onSave: (id: string, data: Partial<SettingsDoc>) => Promise<void>;
}

const OperationalDefaultsCard: React.FC<OperationalDefaultsCardProps> = ({ setting, onSave }) => {
  const initial = parseOperationalSettings(setting);
  const [formData, setFormData] = useState<OperationalSettingsData>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setFormData(parseOperationalSettings(setting));
  }, [setting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = JSON.stringify(formData);
      await onSave('operationalSettings', {
        label: 'Operational Defaults',
        options: [{ value: payload, order: 1, archived: false }],
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving operational settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden transition-colors shadow-2xs">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-[var(--color-text)]">Operational Defaults & WhatsApp Templates</h3>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Customize payment grace period and automated WhatsApp message templates</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">Payment Grace Period (Days)</label>
          <input
            type="number"
            min="1"
            max="90"
            value={formData.paymentGraceDays}
            onChange={e => setFormData({ ...formData, paymentGraceDays: Number(e.target.value) || 7 })}
            className="w-full sm:w-48 px-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            required
          />
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Number of days after shoot date before unpaid client bills are marked overdue.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Client Payment Reminder Template
            </label>
            <textarea
              value={formData.clientReminderTemplate}
              onChange={e => setFormData({ ...formData, clientReminderTemplate: e.target.value })}
              rows={4}
              className="w-full px-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-mono"
              required
            />
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Available tags: <code className="text-[var(--color-accent)] font-mono">&#123;clientName&#125;</code>, <code className="text-[var(--color-accent)] font-mono">&#123;amount&#125;</code>, <code className="text-[var(--color-accent)] font-mono">&#123;date&#125;</code>, <code className="text-[var(--color-accent)] font-mono">&#123;location&#125;</code></p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Crew Schedule Message Template
            </label>
            <textarea
              value={formData.crewScheduleTemplate}
              onChange={e => setFormData({ ...formData, crewScheduleTemplate: e.target.value })}
              rows={4}
              className="w-full px-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-mono"
              required
            />
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Available tags: <code className="text-[var(--color-accent)] font-mono">&#123;cameramanName&#125;</code>, <code className="text-[var(--color-accent)] font-mono">&#123;clientName&#125;</code>, <code className="text-[var(--color-accent)] font-mono">&#123;date&#125;</code>, <code className="text-[var(--color-accent)] font-mono">&#123;callTime&#125;</code>, <code className="text-[var(--color-accent)] font-mono">&#123;location&#125;</code></p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
          {savedSuccess ? (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Operational settings saved!
            </span>
          ) : (
            <span className="text-[11px] text-[var(--color-text-muted)]">Changes apply immediately across WhatsApp notifications and grace period calculations.</span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Operational Defaults'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

interface BusinessProfileCardProps {
  setting?: SettingsDoc;
  onSave: (id: string, data: Partial<SettingsDoc>) => Promise<void>;
}

const BusinessProfileCard: React.FC<BusinessProfileCardProps> = ({ setting, onSave }) => {
  const { user } = useAuth();
  const isFounder = user?.role === 'founder';
  const initial = parseBusinessProfileFromSettings(setting);
  const [formData, setFormData] = useState<BusinessProfileData>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setFormData(parseBusinessProfileFromSettings(setting));
  }, [setting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFounder) return;
    setIsSaving(true);
    try {
      const payload = JSON.stringify(formData);
      await onSave('businessProfile', {
        label: 'Business Profile',
        options: [{ value: payload, order: 1, archived: false }],
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving business profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden transition-colors shadow-2xs">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-[var(--color-text)]">Company & Invoice Profile</h3>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Details printed on client invoices and crew payout vouchers</p>
          </div>
        </div>
        {!isFounder && (
          <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-md font-semibold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Founder Only
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">Business Name</label>
            <input
              type="text"
              disabled={!isFounder}
              value={formData.businessName}
              onChange={e => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="e.g. SMM Ops Media"
              className="w-full px-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-60 disabled:cursor-not-allowed"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">Business Email</label>
            <input
              type="email"
              disabled={!isFounder}
              value={formData.businessEmail}
              onChange={e => setFormData({ ...formData, businessEmail: e.target.value })}
              placeholder="operations@smmops.com"
              className="w-full px-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-60 disabled:cursor-not-allowed"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">Business Phone</label>
            <input
              type="text"
              disabled={!isFounder}
              value={formData.businessPhone}
              onChange={e => setFormData({ ...formData, businessPhone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-60 disabled:cursor-not-allowed"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">Payment & Bank / UPI Instructions</label>
          <textarea
            disabled={!isFounder}
            value={formData.paymentDetails}
            onChange={e => setFormData({ ...formData, paymentDetails: e.target.value })}
            placeholder="e.g. UPI ID: smmops@hdfcbank | Bank: HDFC | A/C: 50200012345678 | IFSC: HDFC0001234"
            rows={2}
            className="w-full px-3 py-1.5 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-60 disabled:cursor-not-allowed"
            required
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Company profile saved!
            </span>
          ) : !isFounder ? (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" /> Only the Founder can edit company payment and profile details.
            </span>
          ) : (
            <span className="text-[11px] text-[var(--color-text-muted)]">Changes apply immediately to generated PDFs.</span>
          )}

          {isFounder && (
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Company Profile'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

interface SettingsCardProps {
  setting: SettingsDoc; isEditing: boolean;
  onEdit: () => void; onClose: () => void;
  onSave: (id: string, data: Partial<SettingsDoc>) => Promise<void>;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ setting, isEditing, onEdit, onClose, onSave }) => {
  const [options, setOptions] = useState<SettingsOption[]>(setting.options);
  const [newValue, setNewValue] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const sorted = [...options].sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (!newValue.trim()) return;
    const maxOrder = options.reduce((m, o) => Math.max(m, o.order), 0);
    const updated = [...options, { value: newValue.trim(), order: maxOrder + 1, archived: false }];
    setOptions(updated);
    setNewValue('');
    onSave(setting.id, { options: updated });
  };

  const handleArchive = (idx: number) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], archived: !updated[idx].archived };
    setOptions(updated);
    onSave(setting.id, { options: updated });
  };

  const handleRename = (idx: number) => {
    if (!editValue.trim()) return;
    const updated = [...options];
    updated[idx] = { ...updated[idx], value: editValue.trim() };
    setOptions(updated);
    setEditIdx(null);
    onSave(setting.id, { options: updated });
  };

  const handleMove = (idx: number, direction: -1 | 1) => {
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[idx], reordered[nextIdx]] = [reordered[nextIdx], reordered[idx]];
    const updated = reordered.map((option, order) => ({ ...option, order: order + 1 }));
    setOptions(updated);
    onSave(setting.id, { options: updated });
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden transition-colors">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div>
          <h3 className="font-serif text-base font-bold text-[var(--color-text)]">{setting.label}</h3>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Key: {setting.key} · {options.filter(o => !o.archived).length} active</p>
        </div>
      </div>
      <div className="p-4 space-y-1.5">
        {sorted.map((opt, idx) => (
          <div key={`${opt.value}-${idx}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${opt.archived ? 'opacity-50 bg-[var(--color-bg)]' : 'hover:bg-[var(--color-bg-hover)]'}`}>
            <GripVertical className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
            {editIdx === idx ? (
              <div className="flex-1 flex items-center gap-2">
                <input value={editValue} onChange={e => setEditValue(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  autoFocus onKeyDown={e => e.key === 'Enter' && handleRename(idx)} />
                <button onClick={() => handleRename(idx)} className="p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditIdx(null)} className="p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <>
                <span className={`flex-1 text-sm ${opt.archived ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}`}>
                  {opt.value}
                </span>
                {opt.archived && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Archived</span>}
                <button type="button" onClick={() => handleMove(idx, -1)} disabled={idx === 0} className="p-1 text-[var(--color-text-muted)] disabled:opacity-30" title="Move up"><ChevronUp className="w-3 h-3" /></button>
                <button type="button" onClick={() => handleMove(idx, 1)} disabled={idx === sorted.length - 1} className="p-1 text-[var(--color-text-muted)] disabled:opacity-30" title="Move down"><ChevronDown className="w-3 h-3" /></button>
                <button onClick={() => { setEditIdx(idx); setEditValue(opt.value); }}
                  className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] rounded">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => handleArchive(idx)}
                  className="p-1 text-[var(--color-text-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded"
                  title={opt.archived ? 'Restore' : 'Archive'}>
                  {opt.archived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                </button>
              </>
            )}
          </div>
        ))}
        {/* Add new */}
        <div className="flex items-center gap-2 pt-2">
          <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Add new option..."
            className="flex-1 px-3 py-1.5 text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <button onClick={handleAdd} disabled={!newValue.trim()}
            className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-md disabled:opacity-50 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
    </div>
  );
};
