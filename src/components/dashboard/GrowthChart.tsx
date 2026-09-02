import React, { useMemo, useState } from 'react';
import { Shoot, Expense } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';

interface GrowthChartProps {
  shoots: Shoot[];
  expenses: Expense[];
}

type Range = '1M' | '6M' | '1Y' | 'All';

export const GrowthChart: React.FC<GrowthChartProps> = ({ shoots, expenses }) => {
  const [range, setRange] = useState<Range>('6M');

  const { points, latestIncome, latestOutgoing, netPosition } = useMemo(() => {
    const now = new Date();
    const start = range === 'All' ? null : new Date(now);
    if (start) start.setMonth(now.getMonth() - (range === '1M' ? 1 : range === '6M' ? 6 : 12));

    // Map of dateStr (YYYY-MM-DD) -> { income: number, outgoing: number }
    const dailyData: Record<string, { income: number; outgoing: number }> = {};

    // 1. Process Income (Cleared Client Payments)
    shoots.forEach(shoot => {
      if (shoot.clientPaid && shoot.clientAmount > 0) {
        const dateStr = shoot.clientPaidAt ? (shoot.clientPaidAt as string).split('T')[0] : shoot.date;
        if (!dailyData[dateStr]) dailyData[dateStr] = { income: 0, outgoing: 0 };
        dailyData[dateStr].income += shoot.clientAmount;
      }
    });

    // 2. Process Outgoing Money (Paid Crew Payouts + Direct Expenses)
    shoots.forEach(shoot => {
      (shoot.assignments || []).forEach(asgn => {
        if (asgn.paid && (asgn.amount || 0) > 0) {
          const dateStr = asgn.paidAt ? (asgn.paidAt as string).split('T')[0] : shoot.date;
          if (!dailyData[dateStr]) dailyData[dateStr] = { income: 0, outgoing: 0 };
          dailyData[dateStr].outgoing += asgn.amount || 0;
        }
      });
    });

    expenses.forEach(exp => {
      if ((exp.amount || 0) > 0) {
        const dateStr = exp.date;
        if (!dailyData[dateStr]) dailyData[dateStr] = { income: 0, outgoing: 0 };
        dailyData[dateStr].outgoing += exp.amount || 0;
      }
    });

    // Filter and Sort Dates
    const sortedDates = Object.keys(dailyData)
      .map(d => new Date(d))
      .filter(d => !start || d >= start)
      .sort((a, b) => a.getTime() - b.getTime());

    let runningIncome = 0;
    let runningOutgoing = 0;

    const values = sortedDates.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const data = dailyData[dateStr] || { income: 0, outgoing: 0 };
      runningIncome += data.income;
      runningOutgoing += data.outgoing;

      return {
        dateStr,
        label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        income: runningIncome,
        outgoing: runningOutgoing,
      };
    });

    if (values.length === 0) {
      const fallbackLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return {
        points: [{ dateStr: 'none', label: fallbackLabel, income: 0, outgoing: 0 }],
        latestIncome: 0,
        latestOutgoing: 0,
        netPosition: 0,
      };
    }

    const last = values[values.length - 1];
    return {
      points: values,
      latestIncome: last.income,
      latestOutgoing: last.outgoing,
      netPosition: last.income - last.outgoing,
    };
  }, [range, shoots, expenses]);

  const maxVal = Math.max(...points.map(p => Math.max(p.income, p.outgoing)), 100);
  const width = 720;
  const height = 220;

  const incomePointsStr = points.map((p, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - (p.income / maxVal) * (height - 36) - 18;
    return `${x},${y}`;
  }).join(' ');

  const outgoingPointsStr = points.map((p, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - (p.outgoing / maxVal) * (height - 36) - 18;
    return `${x},${y}`;
  }).join(' ');

  return (
    <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-background)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-base font-semibold text-[var(--color-text-primary)]">Income & Outgoing Cashflow Growth</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">2-Line trend comparing cleared client payments vs paid crew payouts & operating expenses</p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1" role="group" aria-label="Revenue chart range">
          {(['1M', '6M', '1Y', 'All'] as Range[]).map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                range === option
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-background)]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Metric Summaries / Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2 border-b border-[var(--color-border)] text-xs">
          <div className="space-y-0.5">
            <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
              <span>Income (Client Revenue)</span>
            </span>
            <div className="text-xl font-bold font-sans text-[var(--color-text-primary)]">{formatCurrency(latestIncome)}</div>
          </div>

          <div className="space-y-0.5">
            <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-error)]" />
              <span>Outgoing (Crew & Expenses)</span>
            </span>
            <div className="text-xl font-bold font-sans text-[var(--color-error)]">{formatCurrency(latestOutgoing)}</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[var(--color-text-secondary)] font-medium block">Net Cash Position</span>
            <div className={`text-xl font-bold font-sans ${netPosition >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
              {formatCurrency(netPosition)}
            </div>
          </div>
        </div>

        {/* Dual Line SVG Chart */}
        <div className="w-full overflow-hidden pt-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52" role="img" aria-label="Income and outgoing cashflow line chart" preserveAspectRatio="none">
            {/* Gridlines */}
            {[0, 1, 2, 3].map(line => (
              <line
                key={line}
                x1="0"
                x2={width}
                y1={(height / 3) * line + 16}
                y2={(height / 3) * line + 16}
                stroke="var(--color-border)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            ))}

            {/* Line 1: Income (Terracotta Accent Solid Line) */}
            <polyline
              points={incomePointsStr}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Line 2: Outgoing Money (Muted Red Dashed Line) */}
            <polyline
              points={outgoingPointsStr}
              fill="none"
              stroke="var(--color-error)"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Vertex Dots for Data Points */}
            {points.map((p, index) => {
              const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
              const yIncome = height - (p.income / maxVal) * (height - 36) - 18;
              const yOutgoing = height - (p.outgoing / maxVal) * (height - 36) - 18;
              return (
                <g key={index}>
                  <circle cx={x} cy={yIncome} r="3.5" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="2" />
                  <circle cx={x} cy={yOutgoing} r="3.5" fill="var(--color-surface)" stroke="var(--color-error)" strokeWidth="2" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Date X-Axis */}
        <div className="flex justify-between text-[11px] text-[var(--color-text-secondary)] font-mono">
          <span>{points[0]?.label}</span>
          <span>{points[points.length - 1]?.label}</span>
        </div>
      </div>
    </section>
  );
};
