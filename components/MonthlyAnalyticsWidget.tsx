
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis, CartesianGrid } from 'recharts';
import { Transaction, AppSettings } from '../types';

interface MonthlyAnalyticsWidgetProps {
  transactions: Transaction[];
  currentMonth: Date;
  settings: AppSettings;
}

const MonthlyAnalyticsWidget: React.FC<MonthlyAnalyticsWidgetProps> = ({ transactions, currentMonth, settings }) => {
  const data = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // Calculate average daily spending for threshold highlighting
    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const avgDaily = totalExpenses / daysInMonth;
    
    return days.map(day => {
      const dateStr = new Date(year, month, day).toLocaleDateString('ru-RU', { day: 'numeric' });
      
      const dayTotal = transactions
        .filter(t => {
            const d = new Date(t.date);
            return t.type === 'expense' && 
                   d.getDate() === day && 
                   d.getMonth() === month && 
                   d.getFullYear() === year;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        day: dateStr,
        value: dayTotal,
        isHigh: dayTotal > (avgDaily * 1.5) && dayTotal > 0, // Highlight if 50% above average
        fullDate: new Date(year, month, day)
      };
    });
  }, [transactions, currentMonth]);

  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-soft flex flex-col h-full relative group transition-all hover:scale-[1.01]">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">
                    Траты: {currentMonth.toLocaleString('ru-RU', { month: 'long' })}
                </h3>
                <div className="text-2xl font-black text-[#1C1C1E] mt-1">
                    {settings.privacyMode ? '••••••' : total.toLocaleString()} <span className="text-gray-300 text-lg">{settings.currency}</span>
                </div>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
            </div>
        </div>

        <div className="flex-1 min-h-[100px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#D1D5DB' }} 
                        interval={data.length > 20 ? 4 : 2} 
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#D1D5DB' }}
                    />
                    <Tooltip 
                        cursor={{ fill: '#F3F4F6', radius: 8 }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 mb-1">{payload[0].payload.day} {currentMonth.toLocaleString('ru-RU', { month: 'long' })}</p>
                                        <p className="text-sm font-black text-[#1C1C1E]">
                                            {settings.privacyMode ? '•••' : Number(payload[0].value).toLocaleString()} {settings.currency}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.isHigh ? '#FF3B30' : '#007AFF'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default MonthlyAnalyticsWidget;
