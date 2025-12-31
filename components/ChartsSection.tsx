
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { Transaction, AppSettings } from '../types';
import { INITIAL_CATEGORIES as CATEGORIES } from '../constants';

interface ChartsSectionProps {
  transactions: Transaction[];
  settings: AppSettings;
  onCategoryClick?: (categoryId: string) => void;
}

const CustomTooltip = ({ active, payload, currency, privacyMode }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-white/50 flex flex-col gap-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{data.name}</p>
                <p className="text-sm font-black text-[#1C1C1E] tabular-nums">
                    {privacyMode ? '••••••' : `${data.value.toLocaleString()} ${currency}`}
                </p>
                {data.percent && (
                    <p className="text-[9px] font-bold text-blue-500 uppercase">{Math.round(data.percent * 100)}% от трат</p>
                )}
            </div>
        );
    }
    return null;
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g style={{ outline: 'none' }}>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ outline: 'none' }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 12}
        fill={fill}
        style={{ outline: 'none' }}
      />
    </g>
  );
};

const ChartsSection: React.FC<ChartsSectionProps> = ({ transactions, settings, onCategoryClick }) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  const expenseData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, tx) => {
      const category = CATEGORIES.find(c => c.id === tx.category);
      const label = category?.label || 'Прочее';
      const catId = category?.id || 'other';
      const existing = acc.find(item => item.name === label);
      if (existing) {
        existing.value += tx.amount;
      } else {
        acc.push({ name: label, value: tx.amount, color: category?.color || '#888', id: catId });
      }
      return acc;
    }, [] as { name: string; value: number; color: string; id: string }[]);

  if (transactions.filter(t => t.type === 'expense').length === 0) {
    return (
      <div className="bg-white h-full flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-gray-200 text-gray-300 text-xs font-bold uppercase tracking-widest p-6">
        Нет данных
      </div>
    );
  }

  const handleSliceClick = (data: any) => {
    if (onCategoryClick) onCategoryClick(data.id);
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-[2.5rem] border border-gray-100 shadow-soft transition-all flex flex-col h-full relative group">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Структура трат
            </h3>
        </div>

        <div className="flex-1 min-h-0 relative">
            <div className="flex items-center h-full flex-col md:flex-row">
                <div className="w-full md:w-[50%] h-[180px] md:h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        activeIndex={activeIndex}
                        activeShape={renderActiveShape}
                        data={expenseData}
                        innerRadius="65%"
                        outerRadius="85%"
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(-1)}
                        onClick={handleSliceClick}
                        animationBegin={0}
                        animationDuration={1000}
                        style={{ outline: 'none' }}
                        >
                        {expenseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none', cursor: 'pointer' }} />
                        ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip currency={settings.currency} privacyMode={settings.privacyMode} />} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="w-full md:w-[50%] md:pl-6 flex flex-col justify-center gap-2 overflow-y-auto no-scrollbar py-2">
                    {expenseData.sort((a, b) => b.value - a.value).slice(0, 6).map((item, idx) => (
                    <div key={item.name} 
                         onClick={() => handleSliceClick(item)}
                         className={`flex items-start gap-3 p-2 rounded-2xl transition-all cursor-pointer hover:bg-gray-50 ${activeIndex === expenseData.findIndex(e => e.name === item.name) ? 'bg-gray-50 scale-[1.02]' : 'opacity-100'}`}>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 shadow-sm" style={{ backgroundColor: item.color }} />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-tight truncate leading-none mb-1">{item.name}</span>
                            <span className="font-black text-[#1C1C1E] text-xs tabular-nums">
                                {settings.privacyMode ? '•••' : item.value.toLocaleString()} {settings.currency}
                            </span>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ChartsSection;
