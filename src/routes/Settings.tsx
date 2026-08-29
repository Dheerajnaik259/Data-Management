import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useData } from '../context/DataContext';
import { SettingsDoc, SettingsOption } from '../types';
import { Plus, GripVertical, Archive, RotateCcw, Pencil, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

export const Settings: React.FC = () => {
  const ctx = useOutletContext<{ onOpenMobileNav: () => void }>();
  const { settings, handleUpdateSettings } = useData();
  const [editingKey, setEditingKey] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header title="Settings" subtitle="Manage configurable option lists" onOpenMobile={ctx?.onOpenMobileNav} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        {settings.map(setting => (
          <SettingsCard key={setting.id} setting={setting}
            isEditing={editingKey === setting.key}
            onEdit={() => setEditingKey(setting.key)}
            onClose={() => setEditingKey(null)}
            onSave={handleUpdateSettings} />
        ))}
        {settings.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No configurable option lists are available yet. Confirm that the Supabase setup SQL has been applied.</p>
        )}
      </div>
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
}
