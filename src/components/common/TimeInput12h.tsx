import React, { useMemo } from 'react';
import { Clock, X } from 'lucide-react';
import { formatTime12h } from '../../utils/formatTime';

interface TimeInput12hProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export const TimeInput12h: React.FC<TimeInput12hProps> = ({
  value,
  onChange,
  className = '',
}) => {
  // Parse current value into { hour, minute, period }
  const parsed = useMemo(() => {
    if (!value || !value.trim()) {
      return { hour: '', minute: '', period: 'AM' };
    }
    const formatted = formatTime12h(value);
    const match = formatted.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = match[2];
      const p = match[3].toUpperCase();
      return { hour: h, minute: m, period: p };
    }
    return { hour: '', minute: '', period: 'AM' };
  }, [value]);

  const updateTime = (newHour: string, newMinute: string, newPeriod: string) => {
    if (!newHour && !newMinute) {
      onChange('');
      return;
    }
    const h = newHour || '10';
    const m = newMinute || '00';
    const p = newPeriod || 'AM';
    onChange(`${parseInt(h, 10)}:${m} ${p}`);
  };

  const hoursList = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="inline-flex items-center gap-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 shadow-2xs">
        <Clock className="w-4 h-4 text-[var(--color-text-muted)] mr-1 shrink-0" />
        
        {/* Hour selector */}
        <select
          value={parsed.hour}
          onChange={(e) => updateTime(e.target.value, parsed.minute || '00', parsed.period)}
          className="bg-transparent text-sm font-semibold text-[var(--color-text)] outline-none cursor-pointer"
        >
          <option value="" disabled className="text-[var(--color-text-muted)] bg-[var(--color-surface)]">
            HH
          </option>
          {hoursList.map((h) => (
            <option key={h} value={h} className="bg-[var(--color-surface)] text-[var(--color-text)]">
              {h}
            </option>
          ))}
        </select>

        <span className="text-sm font-bold text-[var(--color-text-muted)]">:</span>

        {/* Minute selector */}
        <select
          value={parsed.minute}
          onChange={(e) => updateTime(parsed.hour || '10', e.target.value, parsed.period)}
          className="bg-transparent text-sm font-semibold text-[var(--color-text)] outline-none cursor-pointer"
        >
          <option value="" disabled className="text-[var(--color-text-muted)] bg-[var(--color-surface)]">
            MM
          </option>
          {minutesList.map((m) => (
            <option key={m} value={m} className="bg-[var(--color-surface)] text-[var(--color-text)]">
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* AM / PM Segmented Control */}
      <div className="inline-flex items-center p-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md">
        <button
          type="button"
          onClick={() => updateTime(parsed.hour || '10', parsed.minute || '00', 'AM')}
          className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
            parsed.period === 'AM' && (parsed.hour || parsed.minute)
              ? 'bg-[var(--color-accent)] text-white shadow-2xs'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => updateTime(parsed.hour || '10', parsed.minute || '00', 'PM')}
          className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
            parsed.period === 'PM' && (parsed.hour || parsed.minute)
              ? 'bg-[var(--color-accent)] text-white shadow-2xs'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          PM
        </button>
      </div>

      {/* Clear Button */}
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="p-1 text-[var(--color-text-muted)] hover:text-red-500 rounded-md transition-colors"
          title="Clear call time"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
