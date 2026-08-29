import React from 'react';
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { Deliverable } from '../../types';
import { useData } from '../../context/DataContext';

interface DeliverablesEditorProps {
  deliverables: Deliverable[];
  onChange: (deliverables: Deliverable[]) => void;
}

export const DeliverablesEditor: React.FC<DeliverablesEditorProps> = ({
  deliverables,
  onChange,
}) => {
  const { getSettingsOptions } = useData();
  const typeOptions = getSettingsOptions('deliverableTypes');

  const handleAdd = () => {
    const defaultType = typeOptions[0]?.value;
    if (!defaultType) return;
    onChange([
      ...deliverables,
      {
        type: defaultType,
        count: 1,
        fileLink: '',
      },
    ]);
  };

  const handleRemove = (index: number) => {
    onChange(deliverables.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Deliverable, value: string | number) => {
    const updated = [...deliverables];
    updated[index] = {
      ...updated[index],
      [field]: field === 'count' ? Math.max(1, Number(value) || 1) : value,
    };
    onChange(updated);
  };

  return (
    <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-lg border border-[#E5E0DA]">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
            Deliverables & Assets
          </label>
          <p className="text-[11px] text-[#78716C]">
            Specify reel counts, photo sets, and Google Drive / cloud asset links
          </p>
        </div>
        <span className="text-xs font-medium text-[#78716C]">
          {deliverables.length} Deliverable Items
        </span>
      </div>

      {deliverables.length === 0 ? (
        <div className="py-4 text-center border border-dashed border-[#D6D3D1] rounded-md bg-white">
          <p className="text-xs text-[#78716C] mb-2">No deliverables added yet.</p>
          <button
            type="button"
            onClick={handleAdd}
            disabled={typeOptions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-[#C85A32] rounded-md hover:bg-[#B84A24] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Deliverable</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {deliverables.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-3 rounded-md border border-[#E5E0DA] space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center gap-2">
                {/* Type Selection or Custom Input */}
                <div className="flex-1">
                  <label className="block text-[10px] font-medium text-[#78716C] mb-1">
                    Deliverable Type
                  </label>
                  <select
                    value={item.type}
                    onChange={(e) => handleChange(idx, 'type', e.target.value)}
                    required
                    className="w-full text-xs bg-[#FAF8F5] border border-[#E5E0DA] rounded-md px-2.5 py-1.5 text-[#1C1917] focus:ring-1 focus:ring-[#C85A32] focus:border-[#C85A32] outline-none"
                  >
                    {typeOptions.map(option => <option key={option.value} value={option.value}>{option.value}</option>)}
                  </select>
                </div>

                {/* Count */}
                <div className="w-20">
                  <label className="block text-[10px] font-medium text-[#78716C] mb-1">
                    Qty / Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.count}
                    onChange={(e) => handleChange(idx, 'count', e.target.value)}
                    required
                    className="w-full text-xs bg-[#FAF8F5] border border-[#E5E0DA] rounded-md px-2.5 py-1.5 text-[#1C1917] focus:ring-1 focus:ring-[#C85A32] focus:border-[#C85A32] outline-none"
                  />
                </div>

                {/* Delete row */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 text-[#A8A29E] hover:text-[#DC2626] rounded-md hover:bg-[#FEE2E2]/50 transition-colors"
                    title="Remove deliverable"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cloud Asset Link */}
              <div>
                <label className="block text-[10px] font-medium text-[#78716C] mb-1 flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  <span>Cloud Folder Link (Google Drive / Frame.io / Dropbox)</span>
                </label>
                <input
                  type="url"
                  value={item.fileLink}
                  onChange={(e) => handleChange(idx, 'fileLink', e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full text-xs bg-[#FAF8F5] border border-[#E5E0DA] rounded-md px-2.5 py-1.5 text-[#1C1917] placeholder:text-[#A8A29E] focus:ring-1 focus:ring-[#C85A32] focus:border-[#C85A32] outline-none"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAdd}
            disabled={typeOptions.length === 0}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-[#C85A32] bg-white border border-[#E5E0DA] rounded-md hover:bg-[#FAF8F5] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Deliverable</span>
          </button>
        </div>
      )}
    </div>
  );
};
