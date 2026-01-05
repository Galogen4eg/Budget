
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings } from '../types';
import { INITIAL_CATEGORIES as CATEGORIES } from '../constants';
import { PieChart as PieIcon, Maximize2, X, ChevronRight, ArrowRight } from 'lucide-react';

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
        style={{ filter: `drop-shadow(0px 4px 10px ${fill}60)` }}
      />
    </g>
  );
};

const ChartsSection: React.FC<ChartsSectionProps> = ({ transactions, settings, onCategoryClick }) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isExpanded, setIsExpanded] = useState(false);

  // Prepare Data
  const expenseData = useMemo(() => {
      const data = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, tx) => {
          const category = CATEGORIES.find(c => c.id === tx.category);
          const label = category?.label || 'Прочее';
          const catId = category?.id || 'other';
          const existing = acc.find(item => item.id === catId);
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

  // --- Handlers ---

  const handleWidgetClick = () => {
      setIsExpanded(true);
  };

  const handleLegendClick = (catId: string) => {
      if (onCategoryClick) {
          onCategoryClick(catId);
          setIsExpanded(false); // Optional: close modal on navigation
      }
  };

  // --- Render Components ---

  const renderChart = (isFullScreen: boolean) => {
      const activeItem = activeIndex !== -1 ? expenseData[activeIndex] : null;
      const centerValue = activeItem ? activeItem.value : totalExpense;
      const centerLabel = activeItem ? activeItem.name : 'Всего';

      if (expenseData.length === 0) {
          return (
             <div className="flex flex-col items-center justify-center h-full opacity-40">
                <PieIcon size={32} className="mb-2 text-gray-400 dark:text-gray-600" />
                <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-600">Нет данных</span>
             </div>
          );
      }

      // Compact view: Maximize radius to fill container
      // Full screen view: Use original proportions
      const innerR = isFullScreen ? "55%" : "60%";
      const outerR = isFullScreen ? "80%" : "100%";

      return (
        <div className="relative w-full h-full">
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none p-1">
                <span className="text-[8px] font-bold uppercase tracking-wider opacity-50 mb-0.5 text-[#1C1C1E] dark:text-white truncate max-w-full">
                    {centerLabel}
                </span>
                <span className={`font-black text-[#1C1C1E] dark:text-white tabular-nums leading-none truncate max-w-full text-center ${isFullScreen ? 'text-3xl' : 'text-lg tracking-tighter'}`}>
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
                        innerRadius={innerR}
                        outerRadius={outerR}
                        paddingAngle={4}
                        cornerRadius={isFullScreen ? 6 : 4}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(_, index) => isFullScreen && setActiveIndex(index)}
                        onMouseLeave={() => isFullScreen && setActiveIndex(-1)}
                        onClick={(_, index) => {
                            if (isFullScreen) {
                                setActiveIndex(index === activeIndex ? -1 : index);
                            } else {
                                setIsExpanded(true);
                            }
                        }}
                        animationDuration={1000}
                        style={{ cursor: 'pointer' }}
                    >
                        {expenseData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color} 
                                opacity={activeIndex !== -1 && activeIndex !== index ? 0.3 : 1}
                                style={{ transition: 'opacity 0.3s ease' }}
                            />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
      );
  };

  return (
    <>
      {/* 1. Compact Widget View */}
      <div 
        onClick={handleWidgetClick}
        className="bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none h-full flex flex-col relative overflow-hidden p-4 cursor-pointer group hover:scale-[1.01] transition-transform"
      >
          {/* Decorative BG */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 dark:bg-orange-900/10 rounded-full blur-[60px] opacity-60 pointer-events-none -mr-10 -mt-10" />
          
          <div className="flex justify-between items-center mb-1 shrink-0 z-20 relative">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                      <PieIcon size={14} className="text-orange-500" />
                  </div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Структура
                  </h3>
              </div>
              <Maximize2 size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
          </div>

          <div className="flex-1 flex items-center justify-between gap-1 min-h-0">
             <div className="w-1/2 h-full min-h-[90px] relative">
                 {renderChart(false)}
             </div>
             
             {/* Mini Legend */}
             <div className="w-1/2 flex flex-col gap-1 justify-center pl-2 border-l border-gray-50 dark:border-white/5">
                 {expenseData.slice(0, 3).map((item, i) => (
                     <div key={item.id} className="flex items-center justify-between overflow-hidden">
                         <div className="flex items-center gap-1.5 min-w-0 flex-1">
                             <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                             <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300 truncate leading-tight">{item.name}</span>
                         </div>
                         <span className="text-[8px] font-black text-[#1C1C1E] dark:text-white tabular-nums shrink-0">
                             {Math.round(item.percent! * 100)}%
                         </span>
                     </div>
                 ))}
                 {expenseData.length > 3 && (
                     <span className="text-[8px] font-bold text-blue-500 mt-0.5 pl-3">
                         + еще {expenseData.length - 3}
                     </span>
                 )}
                 {expenseData.length === 0 && <span className="text-[9px] text-gray-300">Пусто</span>}
             </div>
          </div>
      </div>

      {/* 2. Expanded Full-Screen Modal */}
      <AnimatePresence>
        {isExpanded && createPortal(
            <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    onClick={() => setIsExpanded(false)} 
                    className="absolute inset-0 bg-[#1C1C1E]/40 backdrop-blur-md" 
                />
                
                <motion.div 
                    initial={{ y: "100%" }} 
                    animate={{ y: 0 }} 
                    exit={{ y: "100%" }}
                    transition={{ type: 'spring', damping: 32, stiffness: 350 }}
                    className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-2xl h-[90vh] md:h-[85vh] md:rounded-[3rem] rounded-t-[3rem] shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 bg-white dark:bg-[#1C1C1E] border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                        <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                Аналитика расходов
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-[#1C1C1E] dark:text-white tabular-nums tracking-tight">
                                    {settings.privacyMode ? '•••' : totalExpense.toLocaleString()}
                                </span>
                                <span className="text-lg font-bold text-gray-300">{settings.currency}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsExpanded(false)} 
                            className="w-10 h-10 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500 dark:text-white hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors"
                        >
                            <X size={20}/>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-black flex flex-col">
                        {/* Big Chart */}
                        <div className="h-[350px] w-full shrink-0 py-4 bg-[#F8F9FB] dark:bg-[#151517] relative">
                            {renderChart(true)}
                        </div>

                        {/* Full Legend */}
                        <div className="flex-1 p-6 space-y-3 bg-white dark:bg-black">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Детализация</h4>
                            {expenseData.map((item, idx) => {
                                const isActive = activeIndex === idx;
                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => handleLegendClick(item.id)}
                                        className={`
                                            flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border
                                            ${isActive 
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                                                : 'bg-gray-50 dark:bg-[#1C1C1E] border-transparent hover:bg-gray-100 dark:hover:bg-[#2C2C2E]'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                                            <div 
                                                className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                                                style={{ backgroundColor: item.color }} 
                                            />
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <div className="flex justify-between items-center w-full pr-2">
                                                    <span className="text-sm font-bold text-[#1C1C1E] dark:text-white truncate">
                                                        {item.name}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        {Math.round(item.percent! * 100)}%
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full mt-1.5 overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full" 
                                                        style={{ width: `${item.percent! * 100}%`, backgroundColor: item.color }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pl-2">
                                            <div className="text-right">
                                                <div className="text-sm font-black text-[#1C1C1E] dark:text-white tabular-nums">
                                                    {settings.privacyMode ? '•••' : item.value.toLocaleString()}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
