
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings } from '../types';
import { INITIAL_CATEGORIES as CATEGORIES } from '../constants';
import { PieChart as PieIcon, Maximize2, X, ChevronRight } from 'lucide-react';

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
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0px 0px 6px ${fill}80)` }}
      />
    </g>
  );
};

const ChartsSection: React.FC<ChartsSectionProps> = ({ transactions, settings, onCategoryClick }) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isExpanded, setIsExpanded] = useState(false);

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

  // In expanded mode, clicks on slices drill down
  const handleSliceClick = (index: number, catId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation(); 
      if (onCategoryClick) onCategoryClick(catId);
  };

  const handleLegendClick = (catId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (onCategoryClick) onCategoryClick(catId);
  };

  const renderChartContent = (isFullScreen: boolean) => {
      const activeItem = activeIndex !== -1 ? expenseData[activeIndex] : null;
      
      // Always show total in center unless hovering a slice
      const centerValue = activeItem ? activeItem.value : totalExpense;
      const centerLabel = activeItem ? activeItem.name : 'Всего';
      
      const legendItems = isFullScreen ? expenseData : expenseData.slice(0, 4);

      if (expenseData.length === 0) {
        return (
             <div className="flex-1 flex flex-col items-center justify-center opacity-40 min-h-[150px] dark:text-white">
                <PieIcon size={32} className="mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Нет расходов<br/>за этот период</span>
             </div>
        );
      }

      return (
        // POINTER EVENTS LOGIC: 
        // If !isFullScreen (Widget Mode), prevent inner elements from capturing clicks.
        // This ensures the parent container's onClick always fires.
        <div className={`w-full h-full flex flex-col md:flex-row gap-4 items-center ${!isFullScreen ? 'pointer-events-none' : ''}`}>
            {/* Chart Area */}
            <div className={`relative ${isFullScreen ? 'flex-1 w-full md:w-1/2 min-h-[300px]' : 'w-full md:w-1/2 h-40 md:h-full shrink-0'}`}>
                
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-0 pointer-events-none">
                    <span 
                        className="text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 truncate max-w-[80%] text-center opacity-50"
                        style={{ color: settings.theme === 'dark' ? 'white' : '#1C1C1E' }}
                    >
                        {centerLabel}
                    </span>
                    
                    <span className={`font-black text-[#1C1C1E] dark:text-white tabular-nums leading-none ${isFullScreen ? 'text-3xl' : 'text-sm md:text-xl'}`}>
                        {settings.privacyMode 
                            ? '•••' 
                            : centerValue.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })
                        }
                    </span>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={expenseData}
                            innerRadius={isFullScreen ? "65%" : "65%"} 
                            outerRadius={isFullScreen ? "85%" : "80%"}
                            paddingAngle={4}
                            cornerRadius={6}
                            dataKey="value"
                            stroke="none"
                            onMouseEnter={(_, index) => isFullScreen && window.innerWidth > 768 && setActiveIndex(index)}
                            onMouseLeave={() => isFullScreen && window.innerWidth > 768 && setActiveIndex(-1)}
                            onClick={(_, index, e) => isFullScreen && handleSliceClick(index, expenseData[index].id, e)}
                            animationBegin={0}
                            animationDuration={800}
                            style={{ cursor: isFullScreen ? 'pointer' : 'default' }}
                        >
                            {expenseData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.color} 
                                    stroke={entry.color}
                                    strokeWidth={0}
                                    opacity={activeIndex !== -1 && activeIndex !== index ? 0.3 : 1}
                                    style={{ transition: 'opacity 0.3s ease' }}
                                />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend Area */}
            <div className={`
                flex flex-col gap-2 w-full
                ${isFullScreen 
                    ? 'md:w-1/2 p-4 overflow-y-auto no-scrollbar max-h-[40vh] md:max-h-[60vh]' 
                    : 'md:w-1/2 overflow-hidden justify-center'
                } z-10
            `}>
                {legendItems.map((item, idx) => {
                    const isActive = activeIndex === idx;
                    return (
                        <div 
                            key={item.name}
                            onMouseEnter={() => isFullScreen && window.innerWidth > 768 && setActiveIndex(idx)}
                            onMouseLeave={() => isFullScreen && window.innerWidth > 768 && setActiveIndex(-1)}
                            onClick={(e) => isFullScreen && handleLegendClick(item.id, e)}
                            className={`
                                group/item flex items-center justify-between transition-all duration-200 rounded-xl
                                ${isFullScreen ? 'p-3 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] cursor-pointer' : 'py-1'}
                                ${isFullScreen && activeIndex !== -1 && !isActive ? 'opacity-30' : 'opacity-100'}
                            `}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div 
                                    className={`rounded-full flex-shrink-0 transition-all duration-300 ${isFullScreen ? 'w-3 h-3' : 'w-2 h-2'}`}
                                    style={{ backgroundColor: item.color }} 
                                />
                                <div className="flex flex-col min-w-0">
                                    <span className={`${isFullScreen ? 'text-sm' : 'text-[10px]'} font-bold text-[#1C1C1E] dark:text-white truncate`}>
                                        {item.name}
                                    </span>
                                    {isFullScreen && (
                                        <div className="h-1 w-16 bg-gray-100 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${item.percent! * 100}%`, backgroundColor: item.color }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-end shrink-0 pl-2">
                                <span className={`${isFullScreen ? 'text-sm' : 'text-[10px]'} font-black text-[#1C1C1E] dark:text-white tabular-nums`}>
                                    {isFullScreen 
                                        ? (settings.privacyMode ? '•••' : item.value.toLocaleString())
                                        : `${Math.round(item.percent! * 100)}%`
                                    }
                                </span>
                                {isFullScreen && (
                                    <span className="text-[10px] font-bold text-gray-400">
                                        {Math.round(item.percent! * 100)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {/* "See more" link */}
                {!isFullScreen && expenseData.length > 4 && (
                    <div className="text-[9px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 pl-5">
                        Еще {expenseData.length - 4} категорий <ChevronRight size={10} />
                    </div>
                )}
            </div>
        </div>
      );
  };

  return (
    <>
      {/* Widget Layout */}
      <div 
        onClick={() => setIsExpanded(true)}
        className="bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none transition-all flex flex-col h-full relative group overflow-hidden p-5 cursor-pointer hover:scale-[1.01]"
      >
          {/* Subtle bg decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 dark:bg-orange-900/10 rounded-full blur-[60px] opacity-60 pointer-events-none -mr-10 -mt-10" />
          
          {/* Header */}
          <div className="flex justify-between items-center mb-2 shrink-0 z-20 relative pointer-events-none">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                      <PieIcon size={14} className="text-orange-500" />
                  </div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Структура
                  </h3>
              </div>
              <button 
                  // Separate expand button, needs pointer-events-auto because parent header has none
                  className="p-1.5 -mr-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-500 transition-colors bg-white dark:bg-[#2C2C2E] rounded-full shadow-sm z-40 pointer-events-auto"
                  title="Развернуть"
                  onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(true);
                  }}
              >
                  <Maximize2 size={14} />
              </button>
          </div>

          {/* Chart Content Wrapper */}
          <div className="flex-1 w-full relative z-10 min-h-0 flex flex-col justify-center">
             {renderChartContent(false)}
          </div>
      </div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {isExpanded && createPortal(
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    onClick={() => setIsExpanded(false)} 
                    className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" 
                />
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.9, opacity: 0 }} 
                    className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-2xl h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border dark:border-white/10"
                >
                    {/* Modal Header */}
                    <div className="p-6 bg-white dark:bg-[#1C1C1E] border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                                Расходы за период
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-[#1C1C1E] dark:text-white tabular-nums tracking-tight">
                                    {settings.privacyMode ? '•••' : totalExpense.toLocaleString()}
                                </span>
                                <span className="text-xl font-bold text-gray-300">{settings.currency}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsExpanded(false)} 
                            className="w-10 h-10 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500 dark:text-white hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors"
                        >
                            <X size={20}/>
                        </button>
                    </div>

                    <div className="flex-1 bg-gray-50 dark:bg-black overflow-hidden flex flex-col p-6">
                        {renderChartContent(true)}
                    </div>
                </motion.div>
            </div>,
            document.body
        )}
      </AnimatePresence>
    </>
  );
};

export default ChartsSection;
