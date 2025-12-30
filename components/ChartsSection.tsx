
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis } from 'recharts';
import { Transaction, AppSettings } from '../types';
import { INITIAL_CATEGORIES as CATEGORIES } from '../constants';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface ChartsSectionProps {
  transactions: Transaction[];
  settings: AppSettings;
}

const ChartsSection: React.FC<ChartsSectionProps> = ({ transactions, settings }) => {
  const [activeChart, setActiveChart] = useState<'pie' | 'bar'>('pie');

  // Данные для круговой диаграммы (по категориям)
  const expenseData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, tx) => {
      const category = CATEGORIES.find(c => c.id === tx.category);
      const label = category?.label || 'Прочее';
      const existing = acc.find(item => item.name === label);
      if (existing) {
        existing.value += tx.amount;
      } else {
        acc.push({ name: label, value: tx.amount, color: category?.color || '#888' });
      }
      return acc;
    }, [] as { name: string; value: number; color: string }[]);

  // Данные для динамики (последние 7 дней)
  const dynamicsData = React.useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      
      const dayTotal = transactions
        .filter(t => t.type === 'expense' && new Date(t.date).toDateString() === date.toDateString())
        .reduce((sum, t) => sum + t.amount, 0);
      
      days.push({ name: dateStr, value: dayTotal });
    }
    return days;
  }, [transactions]);

  if (transactions.filter(t => t.type === 'expense').length === 0) {
    return (
      <div className="bg-white h-full flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-gray-200 text-gray-300 text-xs font-bold uppercase tracking-widest p-6">
        Нет данных
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-soft transition-all flex flex-col h-full relative group">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">
                {activeChart === 'pie' ? 'Структура трат' : 'Динамика'}
            </h3>
            <div className="flex bg-gray-50 p-1 rounded-xl">
                <button onClick={() => setActiveChart('pie')} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${activeChart === 'pie' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Pie</button>
                <button onClick={() => setActiveChart('bar')} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${activeChart === 'bar' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Bar</button>
            </div>
        </div>

        <div className="flex-1 min-h-0 relative">
            {activeChart === 'pie' ? (
                <div className="flex items-center h-full">
                    <div className="w-1/2 h-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={expenseData}
                            innerRadius="60%"
                            outerRadius="80%"
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            >
                            {expenseData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            </Pie>
                            <Tooltip 
                            formatter={(value: number) => [`${value.toLocaleString()} ${settings.currency}`, '']}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900', padding: '8px' }} 
                            />
                        </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-wider">Траты</span>
                        </div>
                    </div>
                    <div className="w-1/2 pl-4 flex flex-col justify-center gap-2 overflow-hidden">
                        {expenseData.sort((a, b) => b.value - a.value).slice(0, 4).map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] text-gray-400 font-bold uppercase truncate max-w-[80px]">{item.name}</span>
                                <span className="font-black text-[#1C1C1E] text-[10px] leading-none">
                                    {settings.privacyMode ? '•••' : item.value.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dynamicsData}>
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 8, fontWeight: 700, fill: '#AEAEB2' }}
                        dy={5}
                        interval={1}
                    />
                    <Tooltip 
                        cursor={{ fill: '#F2F2F7', radius: 6 }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: 'bold' }}
                        formatter={(value: number) => [`${value.toLocaleString()}`, '']}
                    />
                    <Bar dataKey="value" fill="#007AFF" radius={[4, 4, 4, 4]} barSize={12} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    </div>
  );
};

export default ChartsSection;
