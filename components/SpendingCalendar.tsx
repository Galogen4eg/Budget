
import React from 'react';
import { motion } from 'framer-motion';
import { Transaction, AppSettings } from '../types';

interface SpendingCalendarProps {
  transactions: Transaction[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  settings: AppSettings;
}

const SpendingCalendar: React.FC<SpendingCalendarProps> = ({ transactions, selectedDate, onSelectDate, settings }) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: offset }, (_, i) => null);

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
    <div className="bg-white rounded-[2.5rem] p-6 shadow-soft border border-white overflow-hidden transition-all">
      <div className="grid grid-cols-7 gap-1 mb-6">
        {weekdays.map(d => (
          <div key={d} className="text-[11px] font-black text-gray-300 text-center py-1 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-3">
        {padding.map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const total = getDayTotal(day);
          const isToday = now.getDate() === day && now.getMonth() === month;
          const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month;
          
          return (
            <button
              key={day}
              onClick={() => onSelectDate(new Date(year, month, day))}
              className={`relative flex flex-col items-center justify-center h-16 rounded-[1.4rem] transition-all duration-300 group ${
                isSelected 
                  ? 'bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)]' 
                  : isToday 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                    : 'bg-gray-50/50 hover:bg-gray-100 text-[#1C1C1E] border border-transparent'
              }`}
            >
              <span className={`text-sm ${isSelected ? 'font-black' : 'font-bold'}`}>
                {day}
              </span>
              <div className={`transition-all duration-300 ${settings.privacyMode ? 'blur-[3px]' : ''}`}>
                {total > 0 && (
                  <span className={`text-[8px] mt-1 font-black leading-none ${isSelected ? 'text-white/80' : 'text-red-500'}`}>
                    {total >= 1000 ? `${(total/1000).toFixed(1)}k` : total}
                  </span>
                )}
              </div>
              {total === 0 && !isSelected && (
                 <div className="w-1 h-1 rounded-full bg-gray-200 mt-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SpendingCalendar;
