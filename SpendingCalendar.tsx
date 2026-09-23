import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Transaction, AppSettings } from '../types';

interface SpendingCalendarProps {
  transactions: Transaction[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  settings: AppSettings;
}

/**
 * SpendingCalendar: Interactive monthly expense calendar.
 * Styled using the warm Terra design system.
 */
const SpendingCalendar: React.FC<SpendingCalendarProps> = ({ 
  transactions, 
  selectedDate, 
  onSelectDate, 
  currentMonth, 
  onMonthChange, 
  settings 
}) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: offset }, (_, i) => null);

  const handlePrevMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
    onSelectDate(null);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
    onSelectDate(null);
  };

  const getDayStats = (day: number) => {
    const dayTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });

    const income = Math.round(dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0));
    const expense = Math.round(dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0));
    const net = Math.round(income - expense);

    return {
      income,
      expense,
      net,
      hasTransactions: dayTxs.length > 0
    };
  };

  const formatCompact = (val: number) => {
    const abs = Math.round(Math.abs(val));
    if (abs >= 1000000) {
      return `${Math.round(abs / 1000000)}M`;
    }
    if (abs >= 1000) {
      return `${Math.round(abs / 1000)}k`;
    }
    return `${abs}`;
  };

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-4 md:p-6 shadow-sm border border-surface-border dark:border-white/10 overflow-hidden transition-all">
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-5">
         <button 
            onClick={handlePrevMonth} 
            className="p-2 hover:bg-[#FAF8F5] dark:hover:bg-[#2C2C2E] rounded-full transition-colors text-gray-400 hover:text-graphite dark:hover:text-white"
            aria-label="Предыдущий месяц"
         >
            <ChevronLeft size={20} />
         </button>
         
         <div className="flex flex-col items-center">
             <span className="text-sm md:text-base font-headline font-bold text-graphite dark:text-white capitalize tracking-tight">
                 {currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
             </span>
             {selectedDate && (
                 <button 
                    onClick={() => onSelectDate(null)}
                    className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 hover:bg-primary/20 dark:bg-green-950/40 dark:text-green-400 px-2.5 py-0.5 rounded-lg mt-1 flex items-center gap-1 transition-colors"
                 >
                    <Calendar size={10} />
                    Показать весь месяц
                 </button>
             )}
         </div>

         <button 
            onClick={handleNextMonth} 
            className="p-2 hover:bg-[#FAF8F5] dark:hover:bg-[#2C2C2E] rounded-full transition-colors text-gray-400 hover:text-graphite dark:hover:text-white"
            aria-label="Следующий месяц"
         >
            <ChevronRight size={20} />
         </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map(d => (
          <div key={d} className="text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500 text-center py-1 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-1.5">
        {padding.map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const stats = getDayStats(day);
          const now = new Date();
          const isToday = now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
          const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
          
          return (
            <button
              key={day}
              onClick={() => {
                if (isSelected) {
                    onSelectDate(null);
                } else {
                    onSelectDate(new Date(year, month, day));
                }
              }}
              className={`relative flex flex-col items-center justify-center aspect-square md:aspect-auto md:h-13 rounded-xl md:rounded-2xl transition-all duration-200 group ${
                isSelected 
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105 z-10' 
                  : isToday 
                    ? 'bg-[#EAF2EC] dark:bg-[#4A7C59]/20 text-[#4A7C59] dark:text-green-400 border border-[#D5E6D8] dark:border-[#4A7C59]/30' 
                    : 'bg-[#FAF8F5] dark:bg-[#252528] hover:bg-gray-100 dark:hover:bg-[#2C2C2E] text-graphite dark:text-white border border-surface-border/60 dark:border-white/5'
              }`}
            >
              <span className={`text-[11px] md:text-xs leading-none ${isSelected ? 'font-black' : 'font-bold'}`}>
                {day}
              </span>
              <div className={`transition-all duration-200 ${settings.privacyMode ? 'blur-[3px]' : ''}`}>
                {stats.hasTransactions && (
                  <span className={`text-[8px] md:text-[10px] mt-1 font-mono leading-none ${
                    isSelected 
                      ? 'text-white/95 font-bold' 
                      : stats.net > 0 
                        ? 'text-primary dark:text-green-400 font-bold' 
                        : stats.net < 0 
                          ? 'text-[#D95C48] dark:text-red-400 font-semibold' 
                          : 'text-graphite-muted dark:text-gray-400 font-medium'
                  }`}>
                    {stats.net > 0 ? `+${formatCompact(stats.net)}` : stats.net < 0 ? `-${formatCompact(stats.net)}` : '0'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SpendingCalendar;
