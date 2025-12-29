
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Transaction, AppSettings } from '../types';
import { CATEGORIES } from '../constants';

interface ChartsSectionProps {
  transactions: Transaction[];
  settings: AppSettings;
}

const ChartsSection: React.FC<ChartsSectionProps> = ({ transactions, settings }) => {
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
      <div className="bg-white h-48 flex items-center justify-center rounded-[2.5rem] border border-dashed border-gray-200 text-gray-300 text-sm font-bold italic">
        Нужно больше данных для магии ✨
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Круговая диаграмма */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-white shadow-soft transition-all">
        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">Распределение трат</h3>
        <div className="flex flex-col items-center gap-8">
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData}
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString()} ${settings.currency}`, '']}
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                    fontWeight: '900',
                    backgroundColor: '#FFFFFF',
                    padding: '12px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 w-full">
            {expenseData.sort((a, b) => b.value - a.value).slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[10px] text-gray-400 font-black uppercase truncate tracking-wider">{item.name}</span>
                  <span className="font-black text-[#1C1C1E] text-xs leading-none">
                    {item.value.toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* График динамики */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-white shadow-soft transition-all">
        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">Динамика (7 дней)</h3>
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dynamicsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fontWeight: 800, fill: '#AEAEB2' }}
                dy={10}
              />
              <Tooltip 
                cursor={{ fill: '#F2F2F7', radius: 10 }}
                contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: 'bold' }}
                formatter={(value: number) => [`${value.toLocaleString()} ${settings.currency}`, 'Траты']}
              />
              <Bar dataKey="value" fill="#007AFF" radius={[6, 6, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChartsSection;
