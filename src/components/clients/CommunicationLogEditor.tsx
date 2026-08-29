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
          <h3 className="font-serif text-lg font-bold text-[#1C1917]">
            Communication Log & Meeting Notes
          </h3>
          <p className="text-xs text-[#78716C]">
            Running chronological history of calls, brief updates, and client requests
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#C85A32] rounded-md hover:bg-[#B84A24] transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Communication</span>
        </button>
      </div>

      {/* Add note card */}
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded-lg border border-[#E5E0DA] space-y-3 shadow-xs animate-in fade-in"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#1C1917]">New Entry</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#78716C] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date:</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="text-xs bg-[#FAF8F5] border border-[#E5E0DA] rounded-md px-2 py-1 text-[#1C1917] outline-none"
              />
            </div>
          </div>

          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Record summary of call, client approvals, feedback on deliverables, or action items..."
            required
            className="w-full text-xs bg-[#FAF8F5] border border-[#E5E0DA] rounded-md p-2.5 text-[#1C1917] placeholder:text-[#A8A29E] focus:ring-1 focus:ring-[#C85A32] focus:border-[#C85A32] outline-none"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-[#78716C] hover:bg-[#FAF8F5] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !note.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#C85A32] rounded-md hover:bg-[#B84A24] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      )}

      {/* List of communication logs */}
      {logs.length === 0 ? (
        <div className="p-6 text-center bg-white rounded-lg border border-[#E5E0DA]">
          <MessageSquare className="w-6 h-6 text-[#A8A29E] mx-auto mb-2" />
          <p className="text-xs font-medium text-[#78716C]">
            No communication logged for this client yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white p-4 rounded-lg border border-[#E5E0DA] space-y-2 shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs text-[#78716C]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1C1917] flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#C85A32]" />
                    {log.loggedBy || 'Founder'}
                  </span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[11px] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E5E0DA]">
                  {log.date}
                </span>
              </div>
              <p className="text-xs text-[#292524] leading-relaxed whitespace-pre-wrap">
                {log.note}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
