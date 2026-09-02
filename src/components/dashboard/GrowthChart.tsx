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
        net: runningIncome - runningOutgoing,
      };
    });

    if (values.length === 0) {
      const fallbackLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return {
        points: [{ dateStr: 'none', label: fallbackLabel, income: 0, outgoing: 0, net: 0 }],
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

  // Calculate dynamic max value considering income, outgoing, and net values
  const rawMax = Math.max(...points.map(p => Math.max(p.income, p.outgoing, Math.max(0, p.net))), 100);

  const getNiceMax = (val: number) => {
    if (val <= 500) return Math.ceil(val / 100) * 100;
    if (val <= 2000) return Math.ceil(val / 500) * 500;
    if (val <= 10000) return Math.ceil(val / 1000) * 1000;
    if (val <= 50000) return Math.ceil(val / 5000) * 5000;
    if (val <= 200000) return Math.ceil(val / 20000) * 20000;
    return Math.ceil(val / 50000) * 50000;
  };

  const niceMax = getNiceMax(rawMax);

  // Generate 4 clean dynamic grid ticks: [niceMax, niceMax * 0.75, niceMax * 0.5, niceMax * 0.25, 0]
  const yTicks = [
    niceMax,
    Math.round(niceMax * 0.75),
    Math.round(niceMax * 0.5),
    Math.round(niceMax * 0.25),
    0,
  ];

  // Layout Dimensions
  const paddingLeft = 80;
  const paddingRight = 35;
  const paddingTop = 28;
  const paddingBottom = 30;
  const width = 760;
  const height = 240;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const clampedVal = Math.max(0, val);
    return paddingTop + chartHeight - (clampedVal / niceMax) * chartHeight;
  };

  const incomePointsStr = points.map((p, i) => `${getX(i)},${getY(p.income)}`).join(' ');
  const outgoingPointsStr = points.map((p, i) => `${getX(i)},${getY(p.outgoing)}`).join(' ');
  const netPointsStr = points.map((p, i) => `${getX(i)},${getY(p.net)}`).join(' ');

  // Shaded Area Polygon string for Net Cash Position
  const areaNetStr = [
    `${paddingLeft},${paddingTop + chartHeight}`,
    ...points.map((p, i) => `${getX(i)},${getY(p.net)}`),
    `${width - paddingRight},${paddingTop + chartHeight}`,
  ].join(' ');

  return (
    <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-base font-semibold text-[var(--color-text)]">Cashflow & Net Position Growth</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">3-Line visual trend tracking Income, Outgoing, and Net Profit Position</p>
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
        {/* Metric Summaries / Legend with Color Dots */}
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
            <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Net Cash Position (Profit)</span>
            </span>
            <div className={`text-xl font-bold font-mono ${netPosition >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {formatCurrency(netPosition)}
            </div>
          </div>
        </div>

        {/* Graph Area with 3 Lines (Income, Outgoing, Net Position) */}
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64" role="img" aria-label="Income, outgoing, and net position cashflow chart">
            <defs>
              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Shaded Area under Net Cash Position Line */}
            <polygon points={areaNetStr} fill="url(#netGradient)" />

            {/* Horizontal Gridlines & Dynamic Clean Y-Axis Numerical Labels */}
            {yTicks.map((numericalVal, idx) => {
              const yVal = getY(numericalVal);
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
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Line 2: Outgoing (Red Dashed Line) */}
            <polyline
              points={outgoingPointsStr}
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Line 3: Net Cash Position (Emerald Green Solid Line) */}
            <polyline
              points={netPointsStr}
              fill="none"
              stroke="#10B981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Vertex Dots & Numerical Badges for Data Points */}
            {points.map((p, index) => {
              const cx = getX(index);
              const cyIncome = getY(p.income);
              const cyOutgoing = getY(p.outgoing);
              const cyNet = getY(p.net);
              const isHovered = hoverIndex === index;

              return (
                <g key={index} onMouseEnter={() => setHoverIndex(index)} onMouseLeave={() => setHoverIndex(null)} className="cursor-pointer">
                  {/* Income Vertex Circle */}
                  <circle cx={cx} cy={cyIncome} r={isHovered ? 5 : 3.5} fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="2" />
                  
                  {/* Outgoing Vertex Circle */}
                  <circle cx={cx} cy={cyOutgoing} r={isHovered ? 5 : 3.5} fill="var(--color-surface)" stroke="#EF4444" strokeWidth="2" />

                  {/* Net Cash Position Vertex Circle */}
                  <circle cx={cx} cy={cyNet} r={isHovered ? 6 : 4.5} fill="#10B981" stroke="var(--color-surface)" strokeWidth="2" />

                  {/* Numerical Value Labels */}
                  <text
                    x={cx}
                    y={cyIncome - 8}
                    textAnchor="middle"
                    fill="var(--color-accent)"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    {formatCurrency(p.income)}
                  </text>

                  <text
                    x={cx}
                    y={cyNet + (cyNet < cyOutgoing ? -10 : 16)}
                    textAnchor="middle"
                    fill="#10B981"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="800"
                  >
                    {formatCurrency(p.net)}
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
