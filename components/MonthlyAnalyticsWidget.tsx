
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis, CartesianGrid } from 'recharts';
import { Calendar } from 'lucide-react';
import { Transaction, AppSettings } from '../types';

interface MonthlyAnalyticsWidgetProps {
  transactions: Transaction[];
  currentMonth: Date;
  settings: AppSettings;
}

const CustomAnalyticsTooltip = ({ active, payload, currentMonth, privacyMode, currency }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-white/50 flex flex-col gap-0.5 z-50">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">
                    {data.day} {currentMonth.toLocaleString('ru-RU', { month: 'long' })}
                </p>
                <p className="text-sm font-black text-[#1C1C1E] tabular-nums">
                    {privacyMode ? '••••••' : `${Number(payload[0].value).toLocaleString()} ${currency}`}
                </p>
                {data.isHigh && (
                    <div className="flex items-center gap-1 mt-1 text-[8px] font-black text-red-500 uppercase tracking-tighter">
                        <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                        Аномальный расход
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const MonthlyAnalyticsWidget: React.FC<MonthlyAnalyticsWidgetProps> = ({ transactions, currentMonth, settings }) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  const data = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const monthExpenses = transactions.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === month && d.getFullYear() === year;
    });

    const totalExpenses = monthExpenses.reduce((sum, t) => sum + t.amount, 0);
    const avgDaily = totalExpenses / (new Date().getMonth() === month ? new Date().getDate() : daysInMonth);
    
    return days.map(day => {
      const dateStr = new Date(year, month, day).toLocaleDateString('ru-RU', { day: 'numeric' });
      
      const dayTotal = monthExpenses
        .filter(t => {
            const d = new Date(t.date);
            return d.getDate() === day;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        day: dateStr,
        value: dayTotal,
        isHigh: dayTotal > (avgDaily * 1.8) && dayTotal > 1000,
        fullDate: new Date(year, month, day)
      };
    });
  }, [transactions, currentMonth]);

  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="bg-white p-4 md:p-6 rounded-[2.5rem] border border-gray-100 shadow-soft flex flex-col h-full relative group transition-all hover:scale-[1.01] overflow-hidden">
        <div className="flex justify-between items-start mb-2 shrink-0">
            <div className="min-w-0 flex-1">
                <h3 className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5 truncate">
                    Траты: {currentMonth.toLocaleString('ru-RU', { month: 'long' })}
                </h3>
                <div className="text-lg md:text-2xl font-black text-[#1C1C1E] mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis tabular-nums">
                    {settings.privacyMode ? '••••••' : total.toLocaleString()} <span className="text-gray-300 text-xs md:text-lg font-bold">{settings.currency}</span>
                </div>
            </div>
            <div className="w-7 h-7 md:w-10 md:h-10 bg-purple-50 rounded-lg md:rounded-2xl flex items-center justify-center text-purple-500 flex-shrink-0 ml-2">
                <Calendar size={16} />
            </div>
        </div>

        <div className="flex-1 min-h-0 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 8, fontWeight: 700, fill: '#D1D5DB' }} 
                        interval={data.length > 20 ? 4 : 1}
                        dy={5}
                        height={20}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 8, fontWeight: 700, fill: '#D1D5DB' }}
                        width={30}
                    />
                    <Tooltip 
                        cursor={{ fill: '#F9FAFB', radius: 4 }}
                        content={<CustomAnalyticsTooltip currentMonth={currentMonth} privacyMode={settings.privacyMode} currency={settings.currency} />}
                        allowEscapeViewBox={{ x: false, y: false }}
                    />
                    <Bar 
                        dataKey="value" 
                        radius={[3, 3, 3, 3]} 
                        animationDuration={1000}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(-1)}
                        maxBarSize={40}
                    >
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.isHigh ? '#FF3B30' : '#007AFF'} 
                                opacity={activeIndex !== -1 && activeIndex !== index ? 0.3 : 1} 
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default MonthlyAnalyticsWidget;
