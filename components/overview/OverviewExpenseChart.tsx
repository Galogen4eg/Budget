import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { AppSettings } from '../../types';

interface ChartPoint {
  date: string;
  amount: number;
  label?: string;
}

interface OverviewExpenseChartProps {
  currentMonthName: string;
  budgetMode: 'family' | 'personal';
  chartScale: 'day' | 'week' | 'month';
  setChartScale: (scale: 'day' | 'week' | 'month') => void;
  chartData: ChartPoint[];
  settings: AppSettings;
  formatAmount: (val: number) => string;
}

export const OverviewExpenseChart: React.FC<OverviewExpenseChartProps> = ({
  currentMonthName,
  budgetMode,
  chartScale,
  setChartScale,
  chartData,
  settings,
  formatAmount
}) => {
  return (
    <section className="bg-[#FAF8F5] dark:bg-[#1C1C1E] rounded-3xl p-5 sm:p-6 border border-[#EAE6DD] dark:border-white/10 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold font-headline text-graphite dark:text-white leading-tight">
            Динамика расходов
          </h3>
          <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
            {currentMonthName}, {budgetMode === 'family' ? 'семейные траты' : 'личные траты'}
          </p>
        </div>

        {/* Scale Toggle Tabs */}
        <div className="bg-[#EAE6DD] dark:bg-[#2C2C2E] p-0.5 rounded-xl flex items-center text-xs self-start sm:self-auto">
          {(['day', 'week', 'month'] as const).map(scale => {
            const labels: Record<string, string> = { day: 'День', week: 'Неделя', month: 'Месяц' };
            const isActive = chartScale === scale;
            return (
              <button
                key={scale}
                type="button"
                onClick={() => setChartScale(scale)}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#FAF8F5] dark:bg-[#1C1C1E] text-graphite dark:text-white shadow-xs'
                    : 'text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white'
                }`}
              >
                {labels[scale]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4A7C59" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#4A7C59" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE6DD" />
            <XAxis 
              dataKey="date" 
              tickLine={false} 
              axisLine={false} 
              tick={{ fontSize: 11, fill: '#888' }} 
            />
            <YAxis 
              tickLine={false} 
              axisLine={false} 
              tick={{ fontSize: 11, fill: '#888' }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as ChartPoint;
                  return (
                    <div className="bg-[#FAF8F5] dark:bg-[#1C1C1E] p-3 rounded-2xl border border-[#EAE6DD] dark:border-white/10 shadow-lg text-xs font-sans space-y-1">
                      <p className="font-bold text-graphite dark:text-white">{data.label || data.date}</p>
                      <p className="text-[#4A7C59] font-extrabold font-headline">
                        {settings.privacyMode ? '•••' : `${formatAmount(data.amount)} ₽`}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="#4A7C59" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#expenseGradient)" 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default OverviewExpenseChart;
