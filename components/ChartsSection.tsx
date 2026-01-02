
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { Transaction, AppSettings } from '../types';
import { INITIAL_CATEGORIES as CATEGORIES } from '../constants';
import { PieChart as PieIcon, ChevronRight, Layers } from 'lucide-react';

interface ChartsSectionProps {
  transactions: Transaction[];
  settings: AppSettings;
  onCategoryClick?: (categoryId: string) => void;
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0px 4px 10px ${fill}60)` }}
      />
    </g>
  );
};

const ChartsSection: React.FC<ChartsSectionProps> = ({ transactions, settings, onCategoryClick }) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  
  // Determine mode based on interactivity prop
  const isFullScreen = !!onCategoryClick;

  const expenseData = useMemo(() => {
      const data = transactions
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
        }, [] as { name: string; value: number; color: string; id: string; percent?: number }[]);
      
      const total = data.reduce((sum, item) => sum + item.value, 0);
      return data.map(d => ({ ...d, percent: total > 0 ? d.value / total : 0 })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalExpense = expenseData.reduce((sum, item) => sum + item.value, 0);

  // Determine what to show in the center
  const activeItem = activeIndex !== -1 ? expenseData[activeIndex] : null;
  
  // In Full Screen, we show Total at the top, so center is for Active Item ONLY.
  // In Widget, we show Total in center by default.
  const showCenterInfo = isFullScreen ? !!activeItem : true;
  
  const centerValue = activeItem ? activeItem.value : totalExpense;
  const centerLabel = activeItem ? activeItem.name : 'Всего';
  const centerColor = activeItem ? activeItem.color : '#1C1C1E';

  // Items to show in legend
  const legendItems = isFullScreen ? expenseData : expenseData.slice(0, 5);

  if (expenseData.length === 0) {
    return (
      <div className="bg-white h-full flex flex-col items-center justify-center rounded-[2.5rem] border border-white shadow-soft p-6 relative overflow-hidden">
         <div className="absolute inset-0 bg-gray-50/50" />
         <div className="relative z-10 flex flex-col items-center gap-2 opacity-40">
            <PieIcon size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest">Нет данных</span>
         </div>
      </div>
    );
  }

  const handleClick = (data: any, index: number) => {
      if (onCategoryClick && data.id) {
          onCategoryClick(data.id);
      } else {
          setActiveIndex(prev => prev === index ? -1 : index);
      }
  };

  return (
    <div className={`bg-white rounded-[2.5rem] border border-white shadow-soft transition-all flex flex-col h-full relative group overflow-hidden ${isFullScreen ? 'p-0' : 'p-3'}`}>
        {/* Subtle Background Decor */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-[60px] opacity-60 pointer-events-none -mr-10 -mt-10" />
        
        {/* Full Screen Header: Total Amount at the very top */}
        {isFullScreen && (
            <div className="flex flex-col items-center pt-6 px-4 shrink-0 z-20">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Расходы за период
                </span>
                <span className="text-4xl md:text-5xl font-black text-[#1C1C1E] tabular-nums tracking-tight">
                    {settings.privacyMode 
                        ? '•••' 
                        : totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    }
                    <span className="text-xl text-gray-300 ml-2 font-bold">{settings.currency}</span>
                </span>
            </div>
        )}

        {/* Widget Header */}
        {!isFullScreen && (
            <div className="flex justify-between items-center mb-1 shrink-0 z-10 relative px-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-50 rounded-xl">
                        <PieIcon size={14} className="text-orange-500" />
                    </div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Структура
                    </h3>
                </div>
            </div>
        )}

        {/* Content Container */}
        <div className={`flex-1 min-h-0 relative flex ${isFullScreen ? 'flex-col' : 'flex-row items-center'}`}>
            
            {/* Chart Area */}
            {/* Widget: 65% width to give more space to legend. FullScreen: Flex-1 */}
            <div className={`${isFullScreen ? 'w-full flex-1 min-h-[40%]' : 'w-[65%] h-full relative -ml-2'}`}>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                    {showCenterInfo ? (
                        <>
                            <span 
                                className={`${isFullScreen ? 'text-sm mb-1' : 'text-[8px] mb-0.5'} font-bold uppercase tracking-wider transition-colors duration-300 truncate max-w-[80%]`}
                                style={{ color: activeItem ? centerColor : '#9CA3AF' }}
                            >
                                {centerLabel}
                            </span>
                            <span className={`${isFullScreen ? 'text-3xl' : 'text-sm md:text-lg'} font-black text-[#1C1C1E] tabular-nums leading-none`}>
                                {settings.privacyMode 
                                    ? '•••' 
                                    : centerValue.toLocaleString(undefined, { notation: centerValue > 999999 ? 'compact' : 'standard', maximumFractionDigits: 1 })
                                }
                            </span>
                            {activeItem && (
                                <span className={`${isFullScreen ? 'text-xs mt-1' : 'text-[8px] mt-0.5'} font-black text-gray-300`}>
                                    {Math.round(activeItem.percent! * 100)}%
                                </span>
                            )}
                        </>
                    ) : (
                        // Default Icon in center for Full Screen when no segment selected
                        <div className="opacity-20 text-gray-300">
                            <Layers size={48} />
                        </div>
                    )}
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={expenseData}
                            innerRadius={isFullScreen ? "55%" : "55%"}
                            outerRadius={isFullScreen ? "85%" : "100%"}
                            paddingAngle={isFullScreen ? 4 : 3}
                            dataKey="value"
                            stroke="none"
                            onMouseEnter={(_, index) => !onCategoryClick && setActiveIndex(index)}
                            onMouseLeave={() => !onCategoryClick && setActiveIndex(-1)}
                            onClick={(data, index) => handleClick(data.payload, index)}
                            animationBegin={0}
                            animationDuration={800}
                            style={{ cursor: 'pointer' }}
                        >
                            {expenseData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.color} 
                                    stroke={entry.color}
                                    strokeWidth={0}
                                />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend Area */}
            {/* Widget: 35% width + Padding left to separate from chart */}
            <div className={`
                ${isFullScreen 
                    ? 'w-full shrink-0 grid grid-cols-2 gap-3 p-4 bg-gray-50/50 rounded-t-[2.5rem] overflow-y-auto max-h-[40%]' 
                    : 'w-[35%] pl-3 flex flex-col justify-center gap-1.5 overflow-y-auto no-scrollbar h-full py-1'
                } z-10
            `}>
                {legendItems.map((item, idx) => {
                    const isActive = activeIndex === idx;
                    return (
                        <div 
                            key={item.name}
                            onMouseEnter={() => !onCategoryClick && setActiveIndex(idx)}
                            onMouseLeave={() => !onCategoryClick && setActiveIndex(-1)}
                            onClick={(e) => { e.stopPropagation(); handleClick(item, idx); }}
                            className={`
                                group/item flex items-center justify-between cursor-pointer transition-all duration-300
                                ${isFullScreen ? 'p-3 bg-white rounded-2xl shadow-sm border border-gray-100' : 'pr-1'}
                                ${activeIndex !== -1 && !isActive ? 'opacity-30' : 'opacity-100'}
                            `}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div 
                                    className={`${isFullScreen ? 'w-3 h-3' : 'w-1.5 h-1.5'} rounded-full transition-all duration-300 flex-shrink-0 ${isActive ? 'scale-150' : ''}`} 
                                    style={{ backgroundColor: item.color, boxShadow: isActive ? `0 0 8px ${item.color}` : 'none' }} 
                                />
                                <div className="flex flex-col min-w-0">
                                    <span className={`${isFullScreen ? 'text-xs' : 'text-[8px]'} font-bold text-[#1C1C1E] truncate leading-tight`}>
                                        {item.name}
                                    </span>
                                </div>
                            </div>
                            <span className={`${isFullScreen ? 'text-xs' : 'text-[7px]'} font-bold text-gray-400 tabular-nums leading-tight flex-shrink-0`}>
                                {Math.round(item.percent! * 100)}%
                            </span>
                        </div>
                    );
                })}
                {!isFullScreen && expenseData.length > 5 && (
                    <div className="text-[7px] font-bold text-gray-300 pl-4 mt-0.5">
                        ...
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ChartsSection;
