import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Cameraman, CameramanAssignment } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';

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
      amount: null,
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
    const updated = [...assignments];
    updated[index] = {
      ...updated[index],
      cameramanId: camId,
    };
    onChange(updated);
  };

  const totalCrewCost = assignments.reduce((acc, a) => acc + (a.amount || 0), 0);

  return (
    <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-lg border border-[#E5E0DA]">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
            Cameramen & Crew Assignments
          </label>
          <p className="text-[11px] text-[#78716C]">
            Assign one or multiple cameramen. Set payout rates later from the Cameraman page.
          </p>
        </div>
      <span className="text-xs font-bold text-[#C85A32]">
          Crew Total: {formatCurrency(totalCrewCost)}
        </span>
      </div>

      {assignments.length === 0 ? (
        <div className="py-4 text-center border border-dashed border-[#D6D3D1] rounded-md bg-white">
          <p className="text-xs text-[#78716C] mb-2">No cameramen assigned yet.</p>
          <button
            type="button"
            onClick={handleAdd}
            disabled={cameramen.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-[#C85A32] rounded-md hover:bg-[#B84A24] transition-colors disabled:opacity-50"
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
                className="bg-white p-3 rounded-md border border-[#E5E0DA] flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-2xs"
              >
                {/* Cameraman Selection */}
                <div className="flex-1 w-full sm:w-auto">
                  <label className="block text-[10px] font-medium text-[#78716C] mb-1">
                    Cameraman #{idx + 1}
                  </label>
                  <select
                    value={assignment.cameramanId}
                    onChange={(e) => handleCameramanSelect(idx, e.target.value)}
                    required
                    className="w-full text-xs bg-[#FAF8F5] border border-[#E5E0DA] rounded-md px-2.5 py-1.5 text-[#1C1917] focus:ring-1 focus:ring-[#C85A32] focus:border-[#C85A32] outline-none"
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

                <div className="w-full sm:w-32">
                  <label className="block text-[10px] font-medium text-[#78716C] mb-1">Call-time override</label>
                  <input type="time" value={assignment.callTime || ''} placeholder={generalCallTime} onChange={e => {
                    const updated = [...assignments]; updated[idx] = { ...updated[idx], callTime: e.target.value || null }; onChange(updated);
                  }} className="w-full text-xs bg-[#FAF8F5] border border-[#E5E0DA] rounded-md px-2.5 py-1.5 text-[#1C1917]" />
                </div>
                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 pt-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 text-[#A8A29E] hover:text-[#DC2626] rounded-md hover:bg-[#FEE2E2]/50 transition-colors"
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
            disabled={cameramen.length === 0}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-[#C85A32] bg-white border border-[#E5E0DA] rounded-md hover:bg-[#FAF8F5] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Cameraman</span>
          </button>
        </div>
      )}
    </div>
  );
};
