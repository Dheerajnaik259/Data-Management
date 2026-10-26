import React, { useState } from 'react';
import { Plus, MessageSquare, Calendar, User } from 'lucide-react';
import { CommunicationLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface CommunicationLogEditorProps {
  clientId: string;
  logs: CommunicationLog[];
}

export const CommunicationLogEditor: React.FC<CommunicationLogEditorProps> = ({
  clientId,
  logs,
}) => {
  const { user } = useAuth();
  const { handleAddCommunication } = useData();

  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    setIsSubmitting(true);
    try {
      const loggedBy = user?.displayName || (user?.email?.split('@')[0] ?? 'Founder');
      await handleAddCommunication(clientId, note.trim(), loggedBy, date);
      setNote('');
      setIsOpen(false);
    } catch (err) {
      console.error('Error adding communication log:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold text-[var(--color-text)]">
            Communication Log & Meeting Notes
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Running chronological history of calls, brief updates, and client requests
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-on-accent)] bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Communication</span>
        </button>
      </div>

      {/* Add note card */}
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] space-y-3 shadow-xs animate-in fade-in"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-[var(--color-text)]">New Entry</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date:</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-2 py-1 text-[var(--color-text)] outline-none"
              />
            </div>
          </div>

          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Record summary of call, client approvals, feedback on deliverables, or action items..."
            required
            className="w-full text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md p-2.5 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] outline-none"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !note.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-[var(--color-text-on-accent)] bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      )}

      {/* List of communication logs */}
      {logs.length === 0 ? (
        <div className="p-6 text-center bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <MessageSquare className="w-6 h-6 text-[var(--color-text-muted)] mx-auto mb-2" />
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            No communication logged for this client yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] space-y-2 shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--color-text)] flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    {log.loggedBy || 'Founder'}
                  </span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[11px] bg-[var(--color-bg)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                  {log.date}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
                {log.note}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
