
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis, ReferenceLine } from 'recharts';
import { CalendarDays, TrendingUp, TrendingDown, Target, Maximize2, BarChart3 } from 'lucide-react';
import { Transaction, AppSettings } from '../types';

interface MonthlyAnalyticsWidgetProps {
  transactions: Transaction[];
  currentMonth: Date;
  settings: AppSettings;
}

const CustomAnalyticsTooltip = ({ active, payload, label, settings }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-[#2C2C2E] p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 z-50 min-w-[140px]">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    {data.fullDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-[#1C1C1E] dark:text-white tabular-nums">
                        {settings.privacyMode ? '•••' : Number(payload[0].value).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-gray-400">{settings.currency}</span>
                </div>
                {data.isHigh && (
                    <div className="mt-2 text-[9px] font-black text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                        <TrendingUp size={10} />
                        Выше среднего
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const MonthlyAnalyticsWidget: React.FC<MonthlyAnalyticsWidgetProps> = ({ transactions, currentMonth, settings }) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  const analyticsData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Calculate total monthly expenses first to get accurate average
    const monthExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === month && d.getFullYear() === year;
    });

    const totalExpenses = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
    // Average based on days passed so far if current month, else total days
    const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === year;
    const daysPassed = isCurrentMonth ? new Date().getDate() : daysInMonth;
    const avgDaily = totalExpenses / (daysPassed || 1);
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const chartData = days.map(day => {
      const dateObj = new Date(year, month, day);
      const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric' });
      
      const dayTotal = monthExpenses
        .filter(t => {
            const d = new Date(t.date);
            return d.getDate() === day;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // Determine if spending is "High" (e.g., > 1.5x average)
      const isHigh = dayTotal > (avgDaily * 1.5) && dayTotal > 0;

      return {
        day: dateStr, // Label for X Axis
        value: dayTotal,
        isHigh: isHigh,
        fullDate: dateObj,
        avg: avgDaily // For reference line context if needed
      };
    });

    return { chartData, totalExpenses, avgDaily, maxDay: Math.max(...chartData.map(d => d.value)) };
  }, [transactions, currentMonth]);

  const { chartData, totalExpenses, avgDaily, maxDay } = analyticsData;

  return (
    <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2.5rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none flex flex-col h-full relative overflow-hidden group">
        {/* Subtle decorative background */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50/50 dark:bg-blue-900/10 rounded-full blur-[80px] -mr-10 -mt-10 pointer-events-none opacity-60" />

        {/* Header */}
        <div className="flex justify-between items-start mb-2 relative z-10 shrink-0">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                        <BarChart3 size={14} className="text-blue-500 dark:text-blue-400" />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Динамика
                    </span>
                </div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl md:text-5xl font-black text-[#1C1C1E] dark:text-white tabular-nums tracking-tight leading-none">
                        {settings.privacyMode ? '••••••' : totalExpenses.toLocaleString()}
                    </h2>
                    <span className="text-sm font-bold text-gray-400">{settings.currency}</span>
                </div>
            </div>
        </div>

        {/* Chart */}
        <div className="flex-1 w-full relative z-10 -ml-1 min-h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.8}/>
                        </linearGradient>
                        <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F97316" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#FDBA74" stopOpacity={0.8}/>
                        </linearGradient>
                    </defs>
                    
                    <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 800, fill: '#9CA3AF' }} 
                        interval={chartData.length > 20 ? 4 : 1} // Adaptive interval
                        dy={8}
                    />
                    
                    <Tooltip 
                        content={<CustomAnalyticsTooltip settings={settings} />}
                        cursor={{ fill: settings.theme === 'dark' ? '#2C2C2E' : '#F3F4F6', radius: 8 }}
                    />

                    {/* Average Line */}
                    {avgDaily > 0 && (
                        <ReferenceLine 
                            y={avgDaily} 
                            stroke={settings.theme === 'dark' ? '#4B5563' : '#CBD5E1'}
                            strokeDasharray="3 3" 
                            strokeWidth={1}
                            label={{ 
                                value: 'AVG', 
                                position: 'right', 
                                fill: '#94A3B8', 
                                fontSize: 8, 
                                fontWeight: 900 
                            }} 
                        />
                    )}

                    <Bar 
                        dataKey="value" 
                        radius={[4, 4, 4, 4]} 
                        animationDuration={1200}
                        animationBegin={200}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(-1)}
                    >
                        {chartData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.isHigh ? "url(#colorHigh)" : "url(#colorNormal)"}
                                opacity={activeIndex !== -1 && activeIndex !== index ? 0.3 : 1}
                                style={{ transition: 'opacity 0.3s ease' }}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>

        {/* Footer Stats */}
        <div className="flex gap-3 mt-1 pt-3 border-t border-gray-50 dark:border-white/5 relative z-10 shrink-0">
            <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 relative overflow-hidden">
                    <div className="absolute bottom-0 w-full bg-blue-500 h-1/2" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Среднее</span>
                    <span className="text-[10px] font-black text-[#1C1C1E] dark:text-white tabular-nums">
                        {settings.privacyMode ? '•••' : Math.round(avgDaily).toLocaleString()}
                    </span>
                </div>
            </div>
            
            <div className="w-px bg-gray-100 dark:bg-white/10 h-6 self-center" />

            <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-orange-100 dark:bg-orange-900/50 relative overflow-hidden">
                    <div className="absolute bottom-0 w-full bg-orange-500 h-full" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Макс.</span>
                    <span className="text-[10px] font-black text-[#1C1C1E] dark:text-white tabular-nums">
                        {settings.privacyMode ? '•••' : Math.round(maxDay).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default MonthlyAnalyticsWidget;
