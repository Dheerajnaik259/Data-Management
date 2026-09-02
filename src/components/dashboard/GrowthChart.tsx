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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { points, latestIncome, latestOutgoing, netPosition } = useMemo(() => {
    const now = new Date();
    const start = range === 'All' ? null : new Date(now);
    if (start) start.setMonth(now.getMonth() - (range === '1M' ? 1 : range === '6M' ? 6 : 12));

    const dailyData: Record<string, { income: number; outgoing: number }> = {};

    // 1. Income (Cleared Client Payments)
    shoots.forEach(shoot => {
      if (shoot.clientPaid && shoot.clientAmount > 0) {
        const dateStr = shoot.clientPaidAt ? (shoot.clientPaidAt as string).split('T')[0] : shoot.date;
        if (!dailyData[dateStr]) dailyData[dateStr] = { income: 0, outgoing: 0 };
        dailyData[dateStr].income += shoot.clientAmount;
      }
    });

    // 2. Outgoing (Paid Crew Payouts + Direct Expenses)
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
  
  // Layout Dimensions with left margin for Y-axis numericals
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 28;
  const paddingBottom = 30;
  const width = 760;
  const height = 240;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Grid steps (4 lines: 0%, 33%, 66%, 100%)
  const ySteps = [1, 0.66, 0.33, 0];

  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + chartHeight - (val / maxVal) * chartHeight;
  };

  const incomePointsStr = points.map((p, i) => `${getX(i)},${getY(p.income)}`).join(' ');
  const outgoingPointsStr = points.map((p, i) => `${getX(i)},${getY(p.outgoing)}`).join(' ');

  return (
    <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-base font-semibold text-[var(--color-text)]">Income & Outgoing Cashflow Growth</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">2-Line visual trend comparing cleared client payments vs crew payouts & operating expenses</p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1">
          {(['1M', '6M', '1Y', 'All'] as Range[]).map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                range === option
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'
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
            <div className="text-xl font-bold font-mono text-[var(--color-text)]">{formatCurrency(latestIncome)}</div>
          </div>

          <div className="space-y-0.5">
            <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Outgoing (Crew & Expenses)</span>
            </span>
            <div className="text-xl font-bold font-mono text-red-500">{formatCurrency(latestOutgoing)}</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[var(--color-text-secondary)] font-medium block">Net Cash Position</span>
            <div className={`text-xl font-bold font-mono ${netPosition >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {formatCurrency(netPosition)}
            </div>
          </div>
        </div>

        {/* Graph Area with Y-Axis Numericals & Hover Numerical Badges */}
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-60" role="img" aria-label="Income and outgoing cashflow line chart">
            {/* Horizontal Gridlines & Y-Axis Numerical Labels */}
            {ySteps.map((ratio, idx) => {
              const yVal = paddingTop + chartHeight * (1 - ratio);
              const numericalVal = Math.round(maxVal * ratio);
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    x2={width - paddingRight}
                    y1={yVal}
                    y2={yVal}
                    stroke="var(--color-border)"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                  />
                  {/* Y-Axis Numerical Value */}
                  <text
                    x={paddingLeft - 10}
                    y={yVal + 4}
                    textAnchor="end"
                    fill="var(--color-text-secondary)"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {formatCurrency(numericalVal)}
                  </text>
                </g>
              );
            })}

            {/* Line 1: Income (Terracotta Accent Solid Line) */}
            <polyline
              points={incomePointsStr}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Line 2: Outgoing (Red Dashed Line) */}
            <polyline
              points={outgoingPointsStr}
              fill="none"
              stroke="#EF4444"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Point Vertex Circles and Numerical Labels */}
            {points.map((p, index) => {
              const cx = getX(index);
              const cyIncome = getY(p.income);
              const cyOutgoing = getY(p.outgoing);
              const isHovered = hoverIndex === index;

              return (
                <g key={index} onMouseEnter={() => setHoverIndex(index)} onMouseLeave={() => setHoverIndex(null)} className="cursor-pointer">
                  {/* Income Vertex Circle */}
                  <circle cx={cx} cy={cyIncome} r={isHovered ? 5.5 : 4} fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="2.5" />
                  {/* Income Point Numerical Value */}
                  <text
                    x={cx}
                    y={cyIncome - 10}
                    textAnchor="middle"
                    fill="var(--color-accent)"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    {formatCurrency(p.income)}
                  </text>

                  {/* Outgoing Vertex Circle */}
                  <circle cx={cx} cy={cyOutgoing} r={isHovered ? 5.5 : 4} fill="var(--color-surface)" stroke="#EF4444" strokeWidth="2.5" />
                  {/* Outgoing Point Numerical Value */}
                  <text
                    x={cx}
                    y={cyOutgoing + 16}
                    textAnchor="middle"
                    fill="#EF4444"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    {formatCurrency(p.outgoing)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Date X-Axis */}
        <div className="flex justify-between text-[11px] text-[var(--color-text-secondary)] font-mono px-2 pt-1 border-t border-[var(--color-border)]">
          <span>{points[0]?.label || ''}</span>
          {points.length > 2 && <span>{points[Math.floor(points.length / 2)]?.label}</span>}
          <span>{points[points.length - 1]?.label || ''}</span>
        </div>
      </div>
    </section>
  );
};
