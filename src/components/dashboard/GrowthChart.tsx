import React, { useMemo, useState } from 'react';
import { Shoot } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';

interface GrowthChartProps {
  shoots: Shoot[];
}

type Range = '1M' | '6M' | '1Y' | 'All';

export const GrowthChart: React.FC<GrowthChartProps> = ({ shoots }) => {
  const [range, setRange] = useState<Range>('6M');
  const points = useMemo(() => {
    const now = new Date();
    const start = range === 'All' ? null : new Date(now);
    if (start) start.setMonth(now.getMonth() - (range === '1M' ? 1 : range === '6M' ? 6 : 12));
    const payments = shoots
      .filter(shoot => shoot.clientPaid && shoot.clientPaidAt)
      .map(shoot => ({ dateStr: (shoot.clientPaidAt as string).split('T')[0], amount: shoot.clientAmount }))
      .reduce((acc, curr) => {
        acc[curr.dateStr] = (acc[curr.dateStr] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);

    const sortedDates = Object.keys(payments)
      .map(d => new Date(d))
      .filter(d => !start || d >= start)
      .sort((a, b) => a.getTime() - b.getTime());

    let running = 0;
    const values = sortedDates.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      running += payments[dateStr];
      return { label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: running };
    });
    if (values.length === 0) return [{ label: 'No payments', value: 0 }];
    return values;
  }, [range, shoots]);

  const max = Math.max(...points.map(point => point.value), 1);
  const width = 720;
  const height = 220;
  const chartPoints = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - (point.value / max) * (height - 24) - 12;
    return `${x},${y}`;
  }).join(' ');

  return (
    <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-2xs overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-base font-bold text-[var(--color-text)]">Revenue Growth</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">Cumulative client payments by the date they landed</p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Revenue chart range">
          {(['1M', '6M', '1Y', 'All'] as Range[]).map(option => (
            <button key={option} type="button" onClick={() => setRange(option)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded border ${range === option ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'}`}>
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold font-serif text-[var(--color-text)]">{formatCurrency(points[points.length - 1].value)}</span>
          <span className="text-[11px] text-[var(--color-text-muted)]">{points.length === 1 && points[0].value === 0 ? 'No cleared payments in range' : `${points.length} payment${points.length === 1 ? '' : 's'}`}</span>
        </div>
        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52" role="img" aria-label="Cumulative revenue line chart" preserveAspectRatio="none">
            {[0, 1, 2, 3].map(line => <line key={line} x1="0" x2={width} y1={(height / 3) * line + 12} y2={(height / 3) * line + 12} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 6" />)}
            <polyline points={chartPoints} fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]">
          <span>{points[0].label}</span><span>{points[points.length - 1].label}</span>
        </div>
      </div>
    </section>
  );
};
