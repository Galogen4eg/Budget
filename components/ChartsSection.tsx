
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
            <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-white/50 flex flex-col gap-1 z-50">
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

  const onPieEnter = (_: any, index: number) => {
    // Only highlight if we are not navigating
    if (!onCategoryClick) setActiveIndex(index);
  };

  const onPieLeave = () => {
    if (!onCategoryClick) setActiveIndex(-1);
  };

  const handleClick = (data: any, index: number) => {
      if (onCategoryClick && data.id) {
          // If we have a navigation handler, call it immediately.
          // No need to set active index as we are navigating away or opening modal
          onCategoryClick(data.id);
      } else {
          // Toggle selection mode
          setActiveIndex(prev => prev === index ? -1 : index);
      }
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-[2.5rem] border border-gray-100 shadow-soft transition-all flex flex-col h-full relative group">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Структура трат
            </h3>
        </div>

        <div className="flex-1 min-h-0 relative">
            <div className="flex items-center h-full">
                <div className="w-[50%] h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        {...{ activeIndex } as any}
                        activeShape={renderActiveShape}
                        data={expenseData}
                        innerRadius="65%"
                        outerRadius="85%"
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={onPieEnter}
                        onMouseLeave={onPieLeave}
                        onClick={(data, index) => handleClick(data.payload, index)}
                        animationBegin={0}
                        animationDuration={1000}
                        style={{ outline: 'none', cursor: 'pointer' }}
                        >
                        {expenseData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color} 
                                style={{ outline: 'none' }} 
                            />
                        ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip currency={settings.currency} privacyMode={settings.privacyMode} />} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="w-[50%] pl-3 md:pl-4 flex flex-col justify-center gap-2 overflow-hidden">
                    {expenseData.sort((a, b) => b.value - a.value).slice(0, 4).map((item, idx) => (
                    <div key={item.name} 
                            onMouseEnter={() => !onCategoryClick && setActiveIndex(expenseData.findIndex(e => e.name === item.name))}
                            onMouseLeave={() => !onCategoryClick && setActiveIndex(-1)}
                            onClick={(e) => {
                                e.stopPropagation(); // Stop bubbling
                                handleClick(item, expenseData.findIndex(e => e.name === item.name));
                            }}
                            className={`flex items-start gap-1.5 transition-opacity duration-300 cursor-pointer ${activeIndex !== -1 && activeIndex !== expenseData.findIndex(e => e.name === item.name) ? 'opacity-30' : 'opacity-100'}`}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: item.color }} />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[7px] md:text-[8px] text-gray-400 font-bold uppercase truncate whitespace-nowrap tracking-tighter">{item.name}</span>
                            <span className="font-black text-[#1C1C1E] text-[9px] md:text-[11px] leading-none whitespace-nowrap tabular-nums">
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
