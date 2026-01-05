
import React from 'react';
import { motion } from 'framer-motion';
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
    onSelectDate(null); // Reset day selection when changing month
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
    onSelectDate(null);
  };

  const getDayTotal = (day: number) => {
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year && t.type === 'expense';
      })
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] p-4 md:p-6 shadow-soft dark:shadow-none border border-white dark:border-white/5 overflow-hidden transition-all">
      <div className="flex justify-between items-center mb-6">
         <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-full transition-colors">
            <ChevronLeft size={20} className="text-gray-400" />
         </button>
         
         <div className="flex flex-col items-center">
             <span className="text-sm font-black text-[#1C1C1E] dark:text-white uppercase tracking-wide">
                 {currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
             </span>
             {selectedDate && (
                 <button 
                    onClick={() => onSelectDate(null)}
                    className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg mt-1 flex items-center gap-1"
                 >
                    <Calendar size={10} />
                    Показать весь месяц
                 </button>
             )}
         </div>

         <button onClick={handleNextMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-full transition-colors">
            <ChevronRight size={20} className="text-gray-400" />
         </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map(d => (
          <div key={d} className="text-[9px] md:text-[10px] font-black text-gray-300 dark:text-gray-600 text-center py-1 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {padding.map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const total = getDayTotal(day);
          const now = new Date();
          const isToday = now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
          const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
          
          return (
            <button
              key={day}
              onClick={() => {
                // Если день уже выбран, снимаем выбор (возвращаемся к месяцу), иначе выбираем день
                if (isSelected) {
                    onSelectDate(null);
                } else {
                    onSelectDate(new Date(year, month, day));
                }
              }}
              className={`relative flex flex-col items-center justify-center aspect-square md:aspect-auto md:h-14 rounded-xl md:rounded-2xl transition-all duration-300 group ${
                isSelected 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 z-10' 
                  : isToday 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50' 
                    : 'bg-gray-50/50 dark:bg-[#2C2C2E]/50 hover:bg-gray-100 dark:hover:bg-[#3A3A3C] text-[#1C1C1E] dark:text-white border border-transparent'
              }`}
            >
              <span className={`text-[10px] md:text-xs ${isSelected ? 'font-black' : 'font-bold'}`}>
                {day}
              </span>
              <div className={`transition-all duration-300 ${settings.privacyMode ? 'blur-[3px]' : ''}`}>
                {total > 0 && (
                  <span className={`text-[7px] md:text-[8px] mt-0.5 font-black leading-none ${isSelected ? 'text-white/90' : 'text-gray-400 dark:text-gray-500'}`}>
                    {total >= 1000 ? `${(total/1000).toFixed(1)}k` : total}
                  </span>
                )}
              </div>
              {total > 0 && !isSelected && (
                 <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-blue-500/40 sm:hidden" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SpendingCalendar;
