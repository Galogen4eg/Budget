
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, Sector } from 'recharts';
import { Transaction, AppSettings } from '../types';
import { INITIAL_CATEGORIES as CATEGORIES } from '../constants';

interface ChartsSectionProps {
  transactions: Transaction[];
  settings: AppSettings;
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

const ChartsSection: React.FC<ChartsSectionProps> = ({ transactions, settings }) => {
  const [activeChart, setActiveChart] = useState<'pie' | 'bar'>('pie');
  const [activeIndex, setActiveIndex] = useState(-1);

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

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  const onPieClick = (_: any, index: number) => {
    // Toggle active index on mobile clicks/taps
    setActiveIndex(prev => prev === index ? -1 : index);
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-[2.5rem] border border-gray-100 shadow-soft transition-all flex flex-col h-full relative group">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {activeChart === 'pie' ? 'Структура трат' : 'Динамика'}
            </h3>
            <div className="flex bg-gray-50 p-0.5 rounded-lg">
                <button onClick={() => setActiveChart('pie')} className={`px-1.5 md:px-3 py-1 rounded-md text-[7px] md:text-[9px] font-bold uppercase transition-all ${activeChart === 'pie' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Pie</button>
                <button onClick={() => setActiveChart('bar')} className={`px-1.5 md:px-3 py-1 rounded-md text-[7px] md:text-[9px] font-bold uppercase transition-all ${activeChart === 'bar' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Bar</button>
            </div>
        </div>

        <div className="flex-1 min-h-0 relative">
            {activeChart === 'pie' ? (
                <div className="flex items-center h-full">
                    <div className="w-[50%] h-full relative">
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
                            onMouseEnter={onPieEnter}
                            onMouseLeave={onPieLeave}
                            onClick={onPieClick}
                            animationBegin={0}
                            animationDuration={1000}
                            style={{ outline: 'none' }}
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
                             onMouseEnter={() => setActiveIndex(expenseData.findIndex(e => e.name === item.name))}
                             onMouseLeave={() => setActiveIndex(-1)}
                             onClick={() => setActiveIndex(expenseData.findIndex(e => e.name === item.name))}
                             className={`flex items-start gap-1.5 transition-opacity duration-300 ${activeIndex !== -1 && activeIndex !== expenseData.findIndex(e => e.name === item.name) ? 'opacity-30' : 'opacity-100'}`}>
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
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dynamicsData}>
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 7, fontWeight: 700, fill: '#AEAEB2' }}
                            dy={5}
                            interval={1}
                        />
                        <Tooltip 
                            cursor={{ fill: '#F2F2F7', radius: 8 }}
                            content={<CustomTooltip currency={settings.currency} privacyMode={settings.privacyMode} />}
                        />
                        <Bar 
                            dataKey="value" 
                            fill="#007AFF" 
                            radius={[6, 6, 6, 6]} 
                            barSize={12} 
                            animationDuration={1200}
                        />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    </div>
  );
};

export default ChartsSection;
