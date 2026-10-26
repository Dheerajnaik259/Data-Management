import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Cameraman, CameramanAssignment } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { TimeInput12h } from '../common/TimeInput12h';

interface AssignmentEditorProps {
  assignments: CameramanAssignment[];
  onChange: (assignments: CameramanAssignment[]) => void;
  cameramen: Cameraman[];
  shootDate?: string;
  generalCallTime?: string;
}

export const AssignmentEditor: React.FC<AssignmentEditorProps> = ({
  assignments,
  onChange,
  cameramen, shootDate = '', generalCallTime = '',
}) => {
  const handleAdd = () => {
    // Pick first available cameraman or empty
    const firstCam = cameramen[0];
    const newAssignment: CameramanAssignment = {
      cameramanId: firstCam ? firstCam.id : '',
      amount: firstCam ? firstCam.rate : null,
      paid: false,
      callTime: null,
      checkedInAt: null,
    };
    onChange([...assignments, newAssignment]);
  };

  const handleRemove = (index: number) => {
    const updated = assignments.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleCameramanSelect = (index: number, camId: string) => {
    const selectedCam = cameramen.find(c => c.id === camId);
    const updated = [...assignments];
    updated[index] = {
      ...updated[index],
      cameramanId: camId,
      amount: updated[index].amount ?? (selectedCam ? selectedCam.rate : null),
    };
    onChange(updated);
  };

  const totalCrewCost = assignments.reduce((acc, a) => acc + (a.amount || 0), 0);

  return (
    <div className="space-y-3 bg-white/[0.025] p-4 rounded-lg border border-[var(--color-border)]">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider">
            Cameramen & Crew Assignments
          </label>
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            Assign crew. Payout-rate changes follow the role-based approval workflow.
          </p>
        </div>
      <span className="text-xs font-bold text-[var(--color-accent)]">
          Crew Total: {formatCurrency(totalCrewCost)}
        </span>
      </div>

      {assignments.length === 0 ? (
        <div className="py-4 text-center border border-dashed border-[var(--color-border)] rounded-md bg-[var(--color-surface)]">
          <p className="text-xs text-[var(--color-text-secondary)] mb-2">No cameramen assigned yet.</p>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[var(--color-text-on-accent)] bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Cameraman</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {assignments.map((assignment, idx) => {
            return (
              <div
                key={idx}
                className="bg-[var(--color-surface)] p-3 rounded-md border border-[var(--color-border)] flex flex-col sm:flex-row items-start sm:items-center gap-3"
              >
                {/* Cameraman Selection */}
                <div className="flex-1 w-full sm:w-auto">
                  <label className="block text-[10px] font-medium text-[var(--color-text-secondary)] mb-1">
                    Cameraman #{idx + 1}
                  </label>
                  <select
                    value={assignment.cameramanId}
                    onChange={(e) => handleCameramanSelect(idx, e.target.value)}
                    required
                    className="w-full text-xs bg-[#0C0F11] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] outline-none"
                  >
                    <option value="" disabled>
                      Select Cameraman...
                    </option>
                    {cameramen.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Std: {formatCurrency(c.rate)})
                      </option>
                    ))}
                  </select>
                  {shootDate && cameramen.find(c => c.id === assignment.cameramanId)?.unavailability?.some(item => item.date === shootDate) && <p className="mt-1 text-[10px] text-amber-700">Unavailable on this date. Confirm before scheduling.</p>}
                  {assignment.cameramanId && assignments.filter(a => a.cameramanId === assignment.cameramanId).length > 1 && (
                    <p className="mt-1 text-[10px] text-red-600 dark:text-red-400 font-semibold">Warning: Cameraman is assigned multiple times to this shoot.</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-[var(--color-text-secondary)] mb-1">Call-time override</label>
                  <TimeInput12h
                    value={assignment.callTime || ''}
                    onChange={(val) => {
                      const updated = [...assignments];
                      updated[idx] = { ...updated[idx], callTime: val || null };
                      onChange(updated);
                    }}
                  />
                </div>
                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 pt-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 text-[var(--color-text-muted)] hover:text-red-300 rounded-md hover:bg-red-500/10 transition-colors"
                    title="Remove assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-[var(--color-accent)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Cameraman</span>
          </button>
        </div>
      )}
    </div>
  );
};
