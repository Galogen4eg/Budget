import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Transaction, AppSettings } from '../../types';

interface DrillDownAnalyticsChartProps {
  familyTransactions: Transaction[];
  currentMonth?: Date;
  settings: AppSettings;
  activeSubcategoryId?: string | null;
  monthLabel: string;
}

export const DrillDownAnalyticsChart: React.FC<DrillDownAnalyticsChartProps> = ({
  familyTransactions,
  currentMonth,
  activeSubcategoryId,
  monthLabel
}) => {
  const [chartGranularity, setChartGranularity] = useState<'daily' | 'weekly'>('daily');
  const [chartSeriesFilter, setChartSeriesFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [hoveredBar, setHoveredBar] = useState<{
    x: number;
    y: number;
    label: string;
    expense: number;
    income: number;
  } | null>(null);

  const totalExpense = useMemo(() => {
    return Math.round(
      familyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    );
  }, [familyTransactions]);

  // Dynamic Aggregated Chart Data (Daily / Weekly & Peak Day)
  const aggregatedChartData = useMemo(() => {
    const daysInMonth = currentMonth 
      ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
      : 30;

    const monthShort = currentMonth 
      ? currentMonth.toLocaleString('ru-RU', { month: 'short' }).replace('.', '')
      : 'сен';

    interface ChartAggItem {
      id: string;
      label: string;
      dayNum?: number;
      expense: number;
      income: number;
    }

    let list: ChartAggItem[] = [];

    if (chartGranularity === 'daily') {
      const map = new Map<number, ChartAggItem>();
      for (let i = 1; i <= daysInMonth; i++) {
        map.set(i, { id: `${i}`, label: `${i} ${monthShort}`, dayNum: i, expense: 0, income: 0 });
      }

      familyTransactions.forEach(t => {
        const d = new Date(t.date);
        const dayNum = d.getDate();
        const existing = map.get(dayNum);
        if (existing) {
          if (t.type === 'expense') existing.expense += t.amount;
          if (t.type === 'income') existing.income += t.amount;
        }
      });

      list = Array.from(map.values());
    } else {
      const weeksCount = Math.ceil(daysInMonth / 7);
      const weekMap = new Map<number, ChartAggItem>();

      for (let w = 1; w <= weeksCount; w++) {
        const startDay = (w - 1) * 7 + 1;
        const endDay = Math.min(daysInMonth, w * 7);
        weekMap.set(w, {
          id: `week_${w}`,
          label: `${startDay}–${endDay} ${monthShort}`,
          expense: 0,
          income: 0
        });
      }

      familyTransactions.forEach(t => {
        const d = new Date(t.date);
        const dayNum = d.getDate();
        const weekIndex = Math.min(weeksCount, Math.floor((dayNum - 1) / 7) + 1);
        const existing = weekMap.get(weekIndex);
        if (existing) {
          if (t.type === 'expense') existing.expense += t.amount;
          if (t.type === 'income') existing.income += t.amount;
        }
      });

      list = Array.from(weekMap.values());
    }

    let peakItem = list[0];
    let maxVolume = 0;

    list.forEach(item => {
      let vol = item.expense + item.income;
      if (chartSeriesFilter === 'expense') vol = item.expense;
      if (chartSeriesFilter === 'income') vol = item.income;

      if (vol > maxVolume) {
        maxVolume = vol;
        peakItem = item;
      }
    });

    const activeCount = list.filter(i => i.expense > 0 || i.income > 0).length || 1;
    const avgDaily = Math.round(totalExpense / (chartGranularity === 'daily' ? activeCount : daysInMonth));

    return { list, peakItem, avgDaily, activeCount };
  }, [familyTransactions, currentMonth, totalExpense, chartGranularity, chartSeriesFilter]);

  // Scaled SVG Chart points & geometry
  const renderedChartData = useMemo(() => {
    const list = aggregatedChartData.list;
    const itemCount = list.length || 1;

    let rawMax = 0;
    list.forEach(item => {
      if (chartSeriesFilter === 'all') {
        rawMax = Math.max(rawMax, item.expense, item.income);
      } else if (chartSeriesFilter === 'expense') {
        rawMax = Math.max(rawMax, item.expense);
      } else if (chartSeriesFilter === 'income') {
        rawMax = Math.max(rawMax, item.income);
      }
    });

    if (rawMax === 0) rawMax = 1000;

    let maxVal = 1000;
    if (rawMax <= 500) {
      maxVal = Math.ceil(rawMax / 100) * 100 || 200;
    } else if (rawMax <= 2000) {
      maxVal = Math.ceil(rawMax / 250) * 250;
    } else if (rawMax <= 10000) {
      maxVal = Math.ceil(rawMax / 1000) * 1000;
    } else if (rawMax <= 50000) {
      maxVal = Math.ceil(rawMax / 5000) * 5000;
    } else {
      maxVal = Math.ceil(rawMax / 10000) * 10000;
    }

    const leftX = 65;
    const rightX = 920;
    const widthX = rightX - leftX;

    const topY = 32;
    const bottomY = 160;
    const heightY = bottomY - topY;

    const trendPoints: { x: number; y: number; label: string; expense: number; income: number }[] = [];

    const bars = list.map((item, idx) => {
      const x = leftX + (idx / Math.max(1, itemCount - 1)) * widthX;

      const showExpense = chartSeriesFilter === 'all' || chartSeriesFilter === 'expense';
      const showIncome = chartSeriesFilter === 'all' || chartSeriesFilter === 'income';

      const expenseH = showExpense ? (item.expense / maxVal) * heightY : 0;
      const expenseY = bottomY - expenseH;

      const incomeH = showIncome ? (item.income / maxVal) * heightY : 0;
      const incomeY = bottomY - incomeH;

      let mainVal = 0;
      if (chartSeriesFilter === 'expense') mainVal = item.expense;
      else if (chartSeriesFilter === 'income') mainVal = item.income;
      else mainVal = item.expense > 0 ? item.expense : item.income;

      const mainY = bottomY - (mainVal / maxVal) * heightY;

      if (mainVal > 0) {
        trendPoints.push({
          x,
          y: Math.max(topY, Math.min(bottomY, mainY)),
          label: item.label,
          expense: item.expense,
          income: item.income
        });
      }

      return {
        id: item.id,
        label: item.label,
        dayNum: item.dayNum,
        x,
        expense: item.expense,
        income: item.income,
        expenseH,
        expenseY,
        incomeH,
        incomeY,
        showExpense: showExpense && item.expense > 0,
        showIncome: showIncome && item.income > 0,
        isPeak: item.id === aggregatedChartData.peakItem?.id && (item.expense > 0 || item.income > 0),
        val: mainVal
      };
    });

    const lineD = trendPoints.length > 0
      ? trendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      : '';

    const areaD = lineD ? `${lineD} L ${rightX} ${bottomY} L ${leftX} ${bottomY} Z` : '';

    return {
      maxVal,
      midVal: Math.round(maxVal * 0.66),
      lowVal: Math.round(maxVal * 0.33),
      leftX,
      rightX,
      topY,
      bottomY,
      bars,
      lineD,
      areaD
    };
  }, [aggregatedChartData, chartSeriesFilter]);

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#242428] border border-[#E4E0D8]/60 dark:border-white/10 shadow-2xs overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-headline font-bold text-[#2E3230] dark:text-white">
            Динамика трат {chartGranularity === 'daily' ? 'по дням' : 'по неделям'} <span className="text-xs font-normal text-[#68726B]">({monthLabel})</span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Interactive Legend with toggle filter */}
          <div className="flex items-center gap-2 text-xs font-semibold select-none">
            <button
              type="button"
              onClick={() => setChartSeriesFilter(prev => prev === 'expense' ? 'all' : 'expense')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                chartSeriesFilter === 'expense'
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-400 font-bold'
                  : chartSeriesFilter === 'all'
                    ? 'hover:bg-black/5 dark:hover:bg-white/5 text-[#2E3230] dark:text-stone-300'
                    : 'opacity-40 hover:opacity-75 text-[#68726B]'
              }`}
              title="Нажмите, чтобы показать только списания"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Списания</span>
            </button>

            <button
              type="button"
              onClick={() => setChartSeriesFilter(prev => prev === 'income' ? 'all' : 'income')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                chartSeriesFilter === 'income'
                  ? 'bg-[#EAF2EC] dark:bg-green-950/60 text-[#4A7C59] dark:text-green-300 ring-1 ring-[#4A7C59] font-bold'
                  : chartSeriesFilter === 'all'
                    ? 'hover:bg-black/5 dark:hover:bg-white/5 text-[#2E3230] dark:text-stone-300'
                    : 'opacity-40 hover:opacity-75 text-[#68726B]'
              }`}
              title="Нажмите, чтобы показать только пополнения"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#4A7C59]" />
              <span>Пополнения</span>
            </button>

            {chartSeriesFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setChartSeriesFilter('all')}
                className="text-[11px] text-[#68726B] underline hover:text-[#2E3230] cursor-pointer ml-1"
              >
                Сбросить
              </button>
            )}
          </div>

          {/* Granularity Tabs */}
          <div className="flex items-center bg-[#F5F1EA] dark:bg-stone-800 p-0.5 rounded-lg border border-[#E4E0D8]/50 dark:border-white/10">
            <button 
              type="button"
              onClick={() => setChartGranularity('daily')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                chartGranularity === 'daily' ? 'bg-white dark:bg-[#1C1C1E] text-[#2E3230] dark:text-white shadow-2xs' : 'text-[#68726B]'
              }`}
            >
              По дням
            </button>
            <button 
              type="button"
              onClick={() => setChartGranularity('weekly')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                chartGranularity === 'weekly' ? 'bg-white dark:bg-[#1C1C1E] text-[#2E3230] dark:text-white shadow-2xs' : 'text-[#68726B]'
              }`}
            >
              По неделям
            </button>
          </div>
        </div>
      </div>

      {/* Wide Clean SVG Chart with Clipping Mask */}
      <div className="relative w-full h-[210px] rounded-xl">
        <svg className="w-full h-full overflow-hidden" viewBox="0 0 940 210" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4A7C59" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4A7C59" stopOpacity="0.0" />
            </linearGradient>

            <clipPath id="chartPlotArea">
              <rect x="60" y="20" width="865" height="150" />
            </clipPath>
          </defs>

          {/* Grid Lines & Dynamic Y-Axis Labels */}
          <line x1="60" y1="32" x2="920" y2="32" stroke="#E4E0D8" strokeDasharray="3,3" strokeOpacity="0.5" />
          <text x="54" y="36" fill="#68726B" fontSize="11" textAnchor="end">{renderedChartData.maxVal.toLocaleString('ru-RU')} ₽</text>

          <line x1="60" y1="75" x2="920" y2="75" stroke="#E4E0D8" strokeDasharray="3,3" strokeOpacity="0.5" />
          <text x="54" y="79" fill="#68726B" fontSize="11" textAnchor="end">{renderedChartData.midVal.toLocaleString('ru-RU')} ₽</text>

          <line x1="60" y1="118" x2="920" y2="118" stroke="#E4E0D8" strokeDasharray="3,3" strokeOpacity="0.5" />
          <text x="54" y="122" fill="#68726B" fontSize="11" textAnchor="end">{renderedChartData.lowVal.toLocaleString('ru-RU')} ₽</text>

          <line x1="60" y1="160" x2="920" y2="160" stroke="#68726B" strokeWidth="1" strokeOpacity="0.4" />
          <text x="54" y="164" fill="#68726B" fontSize="11" textAnchor="end">0</text>

          {/* Clipped Trend Path & Bars */}
          <g clipPath="url(#chartPlotArea)">
            {renderedChartData.areaD && (
              <path 
                d={renderedChartData.areaD} 
                fill="url(#areaGradient)"
                className="transition-all duration-300"
              />
            )}
            
            {renderedChartData.lineD && (
              <path 
                d={renderedChartData.lineD} 
                fill="none" 
                stroke="#4A7C59" 
                strokeWidth="2.5" 
                strokeLinejoin="round" 
                strokeLinecap="round" 
                className="transition-all duration-300"
              />
            )}

            {/* Bars */}
            {renderedChartData.bars.map((b, i) => (
              <g key={b.id || i}>
                {b.showExpense && (
                  <rect 
                    x={b.x - (chartGranularity === 'weekly' ? 12 : 5)} 
                    y={b.expenseY} 
                    width={chartGranularity === 'weekly' ? "24" : "10"} 
                    height={Math.max(2, b.expenseH)} 
                    rx="3" 
                    fill="#E11D48" 
                    fillOpacity={hoveredBar?.label === b.label ? 1 : 0.8} 
                  />
                )}
                {b.showIncome && (
                  <rect 
                    x={b.x + (chartGranularity === 'weekly' ? (b.showExpense ? 14 : -12) : (b.showExpense ? 6 : -5))} 
                    y={b.incomeY} 
                    width={chartGranularity === 'weekly' ? "24" : "10"} 
                    height={Math.max(2, b.incomeH)} 
                    rx="3" 
                    fill="#4A7C59" 
                    fillOpacity={hoveredBar?.label === b.label ? 1 : 0.9} 
                  />
                )}
              </g>
            ))}

            {/* Interactive Hover Highlight Line & Dot */}
            {hoveredBar && (
              <g pointerEvents="none">
                <line 
                  x1={hoveredBar.x} 
                  y1={renderedChartData.topY} 
                  x2={hoveredBar.x} 
                  y2={renderedChartData.bottomY} 
                  stroke="#4A7C59" 
                  strokeWidth="1.5" 
                  strokeDasharray="3,3" 
                />
                <circle 
                  cx={hoveredBar.x} 
                  cy={hoveredBar.y} 
                  r={5} 
                  fill="#4A7C59" 
                  stroke="#FFFFFF" 
                  strokeWidth={2} 
                />
              </g>
            )}

            {/* Invisible Full-Height Overlay Columns for smooth Hover capture */}
            {renderedChartData.bars.map((b, i) => {
              const colW = Math.max(16, (renderedChartData.rightX - renderedChartData.leftX) / Math.max(1, renderedChartData.bars.length));
              return (
                <rect 
                  key={`hover-col-${b.id || i}`}
                  x={b.x - colW / 2}
                  y={renderedChartData.topY}
                  width={colW}
                  height={renderedChartData.bottomY - renderedChartData.topY + 30}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredBar({
                    x: b.x,
                    y: b.showExpense && b.showIncome 
                      ? Math.min(b.expenseY, b.incomeY) 
                      : (b.showExpense ? b.expenseY : (b.showIncome ? b.incomeY : renderedChartData.bottomY)),
                    label: b.label,
                    expense: b.expense,
                    income: b.income
                  })}
                  onMouseLeave={() => setHoveredBar(null)}
                />
              );
            })}
          </g>

          {/* Dynamic X-Axis Labels */}
          {renderedChartData.bars
            .filter((b, i, arr) => {
              if (chartGranularity === 'weekly') return true;
              return i === 0 || i === 4 || i === 9 || i === 14 || i === 19 || i === 24 || i === arr.length - 1;
            })
            .map((b, i) => (
              <text 
                key={b.id || i} 
                x={b.x} 
                y="182" 
                fill={hoveredBar?.label === b.label ? "#4A7C59" : "#68726B"} 
                fontSize={chartGranularity === 'weekly' ? "10" : "11"} 
                fontWeight={hoveredBar?.label === b.label ? "700" : "400"} 
                textAnchor="middle"
              >
                {b.label}
              </text>
            ))}
        </svg>

        {/* HTML Floating Tooltip on Hover */}
        {hoveredBar && (() => {
          const isTopClose = hoveredBar.y < 85;
          const leftPercent = Math.max(14, Math.min(86, (hoveredBar.x / 940) * 100));
          const topPercent = (hoveredBar.y / 210) * 100;

          return (
            <div 
              className={`absolute pointer-events-none z-50 bg-[#1C1C1E] text-white px-3.5 py-2.5 rounded-xl shadow-2xl border border-white/20 text-xs flex flex-col gap-1 -translate-x-1/2 transition-all duration-75 ${
                isTopClose ? 'translate-y-3' : '-translate-y-full -translate-y-2'
              }`}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`
              }}
            >
              <div className="font-bold text-gray-200 border-b border-white/10 pb-1 flex items-center justify-between gap-3">
                <span>{hoveredBar.label} {monthLabel}</span>
              </div>
              <div className="flex flex-col gap-0.5 pt-0.5 font-headline font-semibold whitespace-nowrap">
                {hoveredBar.expense > 0 && (
                  <span className="text-rose-400">
                    Расход: -{Math.round(hoveredBar.expense).toLocaleString('ru-RU')} ₽
                  </span>
                )}
                {hoveredBar.income > 0 && (
                  <span className="text-[#4ADE80]">
                    Доход: +{Math.round(hoveredBar.income).toLocaleString('ru-RU')} ₽
                  </span>
                )}
                {hoveredBar.expense === 0 && hoveredBar.income === 0 && (
                  <span className="text-gray-400">Операций не было</span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default DrillDownAnalyticsChart;
