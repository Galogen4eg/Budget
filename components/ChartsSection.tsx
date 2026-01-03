
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings } from '../types';
import { INITIAL_CATEGORIES as CATEGORIES } from '../constants';
import { PieChart as PieIcon, Layers, Maximize2, X, ChevronRight, ArrowRight } from 'lucide-react';

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

  // Unified click handler for slices
  const handleSliceClick = (index: number, catId: string, e?: React.MouseEvent) => {
      // Important: Stop propagation so we can control logic explicitly
      if (e) e.stopPropagation(); 
      
      if (!isExpanded) {
          setIsExpanded(true);
          return;
      }

      if (activeIndex === index) {
          // Double click (click on already active) -> Drill down
          if (onCategoryClick) onCategoryClick(catId);
      } else {
          // Select
          setActiveIndex(index);
      }
  };

  // Unified click handler for legend items
  const handleLegendClick = (catId: string, index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isExpanded) {
          setIsExpanded(true);
          return;
      }
      
      if (activeIndex === index) {
          if (onCategoryClick) onCategoryClick(catId);
      } else {
          setActiveIndex(index);
      }
  };

  // Main container click (background)
  const handleContainerClick = () => {
      if (!isExpanded) setIsExpanded(true);
  };

  const renderChartContent = (isFullScreen: boolean) => {
      const activeItem = activeIndex !== -1 ? expenseData[activeIndex] : null;
      
      const showCenterInfo = isFullScreen ? !!activeItem : true;
      const centerValue = activeItem ? activeItem.value : totalExpense;
      const centerLabel = activeItem ? activeItem.name : 'Всего';
      const centerColor = activeItem ? activeItem.color : '#1C1C1E';

      const legendItems = isFullScreen ? expenseData : expenseData.slice(0, 4);

      if (expenseData.length === 0) {
        return (
             <div className="flex-1 flex flex-col items-center justify-center opacity-40 min-h-[150px]">
                <PieIcon size={32} className="mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Нет расходов<br/>за этот период</span>
             </div>
        );
      }

      return (
        <div className={`w-full h-full flex ${isFullScreen ? 'flex-col' : 'flex-row items-center'} gap-2`}>
            {/* Chart Area */}
            {/* We enforce a min-height or flex-1. In widget mode, flex-1 works if parent has height. */}
            <div className={`${isFullScreen ? 'w-full flex-1 min-h-[35vh]' : 'flex-1 h-full min-h-[160px]'} relative`}>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                    {showCenterInfo ? (
                        <>
                            <span 
                                className={`${isFullScreen ? 'text-sm mb-1' : 'text-[8px] mb-0.5'} font-bold uppercase tracking-wider transition-colors duration-300 truncate max-w-[80%] text-center`}
                                style={{ color: activeItem ? centerColor : '#9CA3AF' }}
                            >
                                {centerLabel}
                            </span>
                            <span className={`${isFullScreen ? 'text-4xl' : 'text-xs md:text-sm'} font-black text-[#1C1C1E] tabular-nums leading-none`}>
                                {settings.privacyMode 
                                    ? '•••' 
                                    : centerValue.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })
                                }
                            </span>
                            {activeItem && (
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className={`${isFullScreen ? 'text-xs' : 'text-[7px]'} font-black text-gray-300`}>
                                        {Math.round(activeItem.percent! * 100)}%
                                    </span>
                                    {isFullScreen && (
                                        <div className="pointer-events-auto bg-blue-50 text-blue-500 rounded-full p-1 ml-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); if(onCategoryClick) onCategoryClick(activeItem.id); }}>
                                            <ArrowRight size={12}/>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="opacity-20 text-gray-300">
                            <Layers size={isFullScreen ? 48 : 24} />
                        </div>
                    )}
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={expenseData}
                            innerRadius={isFullScreen ? "55%" : "60%"}
                            outerRadius={isFullScreen ? "80%" : "85%"}
                            paddingAngle={isFullScreen ? 4 : 3}
                            dataKey="value"
                            stroke="none"
                            onMouseEnter={(_, index) => isFullScreen && setActiveIndex(index)}
                            onMouseLeave={() => isFullScreen && setActiveIndex(-1)}
                            onClick={(_, index, e) => handleSliceClick(index, expenseData[index].id, e)}
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
            <div className={`
                ${isFullScreen 
                    ? 'w-full shrink-0 flex-1 grid grid-cols-1 gap-2 p-4 overflow-y-auto min-h-[200px]' 
                    : 'w-[45%] pl-2 flex flex-col justify-center gap-1.5 overflow-y-auto no-scrollbar h-full py-2'
                } z-10
            `}>
                {legendItems.map((item, idx) => {
                    const isActive = activeIndex === idx;
                    return (
                        <div 
                            key={item.name}
                            onMouseEnter={() => isFullScreen && setActiveIndex(idx)}
                            onMouseLeave={() => isFullScreen && setActiveIndex(-1)}
                            onClick={(e) => handleLegendClick(item.id, idx, e)}
                            className={`
                                group/item flex items-center justify-between cursor-pointer transition-all duration-300
                                ${isFullScreen ? 'p-4 bg-white rounded-2xl shadow-sm border border-gray-100' : 'pr-1'}
                                ${isFullScreen && activeIndex !== -1 && !isActive ? 'opacity-30' : 'opacity-100'}
                            `}
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                <div 
                                    className={`${isFullScreen ? 'w-4 h-4' : 'w-1.5 h-1.5'} rounded-full transition-all duration-300 flex-shrink-0 ${isActive ? 'scale-150' : ''}`} 
                                    style={{ backgroundColor: item.color, boxShadow: isActive ? `0 0 8px ${item.color}` : 'none' }} 
                                />
                                <span className={`${isFullScreen ? 'text-sm' : 'text-[9px]'} font-bold text-[#1C1C1E] truncate leading-tight`}>
                                    {item.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 pl-1 shrink-0">
                                <div className="flex flex-col items-end">
                                    <span className={`${isFullScreen ? 'text-sm' : 'text-[8px]'} font-black text-[#1C1C1E] tabular-nums leading-none`}>
                                        {isFullScreen ? item.value.toLocaleString() : `${Math.round(item.percent! * 100)}%`}
                                    </span>
                                    {isFullScreen && (
                                        <span className="text-[10px] font-bold text-gray-400">
                                            {Math.round(item.percent! * 100)}%
                                        </span>
                                    )}
                                </div>
                                {isFullScreen && <ChevronRight size={16} className="text-gray-300" />}
                            </div>
                        </div>
                    );
                })}
                {!isFullScreen && expenseData.length > 4 && (
                    <div className="text-[8px] font-bold text-gray-300 pl-3 mt-0.5">
                        +{expenseData.length - 4} еще
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
        onClick={handleContainerClick}
        className="bg-white rounded-[2.5rem] border border-white shadow-soft transition-all flex flex-col h-full relative group overflow-hidden p-4 cursor-pointer"
      >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-[60px] opacity-60 pointer-events-none -mr-10 -mt-10" />
          
          {/* Header */}
          <div className="flex justify-between items-center mb-1 shrink-0 z-20 relative">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-50 rounded-xl">
                      <PieIcon size={14} className="text-orange-500" />
                  </div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Структура
                  </h3>
              </div>
              <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(true);
                  }}
                  className="p-1.5 -mr-1.5 text-gray-300 hover:text-blue-500 transition-colors"
                  title="Развернуть"
              >
                  <Maximize2 size={16} />
              </button>
          </div>

          {/* Chart Content Wrapper: Must have height for ResponsiveContainer */}
          <div className="flex-1 w-full relative z-10 min-h-[160px]">
             {renderChartContent(false)}
          </div>
      </div>

      {/* Expanded Modal (Maximize) */}
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
                    className="relative bg-[#F2F2F7] w-full max-w-lg h-[80vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Modal Header */}
                    <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center shrink-0">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                                Расходы за период
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-[#1C1C1E] tabular-nums tracking-tight">
                                    {settings.privacyMode ? '•••' : totalExpense.toLocaleString()}
                                </span>
                                <span className="text-xl font-bold text-gray-300">{settings.currency}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsExpanded(false)} 
                            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                        >
                            <X size={20}/>
                        </button>
                    </div>

                    <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col p-4">
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
