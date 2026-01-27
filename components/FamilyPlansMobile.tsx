

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Check,
  X,
  Briefcase,
  Heart,
  Trophy,
  Coffee,
  LayoutGrid,
  CalendarDays,
  ListTodo,
  History,
  Sparkles,
  User,
  Hourglass,
  Filter,
  Send
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';

interface FamilyPlansMobileProps {
  events: FamilyEvent[];
  members: FamilyMember[];
  settings: AppSettings;
  
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  
  viewMode: 'month' | 'day' | 'list';
  setViewMode: (m: 'month' | 'day' | 'list') => void;
  
  listTab: 'upcoming' | 'past';
  setListTab: (t: 'upcoming' | 'past') => void;
  
  calendarData: any[];
  selectedDayEvents: FamilyEvent[];
  groupedListEvents: Record<string, FamilyEvent[]>;
  
  onOpenEvent: (event?: FamilyEvent | null, prefill?: any) => void;
  onSendToTelegram: (e: FamilyEvent) => Promise<boolean>;
  
  isListening: boolean;
  isProcessingVoice: boolean;
  startListening: () => void;
}

const FamilyPlansMobile: React.FC<FamilyPlansMobileProps> = ({
  events, members, settings,
  currentDate, setCurrentDate,
  selectedDate, setSelectedDate,
  viewMode, setViewMode,
  listTab, setListTab,
  onOpenEvent,
  onSendToTelegram
}) => {
  const isDarkMode = settings.theme === 'dark';
  const scrollRef = useRef<HTMLDivElement>(null);

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!scrollRef.current) return;

    if (viewMode === 'day') {
      const now = new Date();
      const hour = now.getHours();
      // Adjust scroll based on start hour setting
      const startHour = settings.dayStartHour ?? 0;
      const scrollPos = Math.max(0, (hour - startHour) * 80 - 100);
      
      // Use setTimeout to ensure layout is ready
      setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollPos, behavior: 'smooth' });
      }, 100);
    } else {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [viewMode, settings.dayStartHour]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const handleDateClick = (year: number, month: number, day: number) => {
    const newDate = new Date(year, month, day);
    setSelectedDate(newDate);
    if(viewMode === 'day') setCurrentDate(newDate);
    setViewMode('day');
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  // Helper to get colors for event (supports multiple members)
  const getEventColors = (event: FamilyEvent) => {
      if (event.memberIds && event.memberIds.length > 0) {
          return event.memberIds.map(id => {
             const m = members.find(mem => mem.id === id);
             return m ? m.color : '#3B82F6';
          });
      }
      return ['#3B82F6']; // Default Blue
  };

  // For Day View cards (single color only as requested)
  const getSingleEventColor = (event: FamilyEvent) => {
      const colors = getEventColors(event);
      return colors[0];
  };

  const getEventIcon = (event: FamilyEvent) => {
      const title = event.title.toLowerCase();
      if (title.includes('работ') || title.includes('встреч')) return <Briefcase size={12} />;
      if (title.includes('спорт') || title.includes('трен')) return <Trophy size={12} />;
      if (title.includes('отдых') || title.includes('кино')) return <Coffee size={12} />;
      return <Heart size={12} />;
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);
    const days = [];

    const selectedDateStr = formatDateKey(selectedDate);
    
    const today = new Date();
    const isThisMonthAndYear = today.getMonth() === month && today.getFullYear() === year;

    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} className="h-14 w-full" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDateStr === dateStr;
      
      const isToday = isThisMonthAndYear && today.getDate() === day;
      const dayEvents = events.filter(e => e.date === dateStr);

      // Collect distinct separate dots for each participant in each event
      // If one event has 2 participants, we show 2 dots.
      const dayDots: string[] = [];
      dayEvents.forEach(e => {
          if (e.memberIds && e.memberIds.length > 0) {
              e.memberIds.forEach(mid => {
                  const m = members.find(x => x.id === mid);
                  if (m) dayDots.push(m.color);
                  else dayDots.push('#3B82F6');
              });
          } else {
              dayDots.push('#3B82F6');
          }
      });

      const uniqueKey = `${year}-${month}-${day}`;

      days.push(
        <button
          key={uniqueKey}
          onClick={() => handleDateClick(year, month, day)}
          className={`relative h-14 w-full flex flex-col items-center justify-center rounded-2xl transition-all duration-300 ${
            isSelected 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 scale-105 z-10' 
              : isDarkMode 
                ? 'hover:bg-white/10 text-white' 
                : 'hover:bg-gray-200 text-gray-800'
          }`}
        >
          <span className={`text-sm font-bold ${isToday && !isSelected ? 'text-blue-500' : ''}`}>
            {day}
          </span>
          <div className="flex gap-0.5 mt-1.5 h-1 px-1 justify-center flex-wrap max-w-full">
            {dayDots.slice(0, 4).map((color, idx) => (
              <div 
                key={idx} 
                className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : ''}`} 
                style={isSelected ? {} : { backgroundColor: color }}
              />
            ))}
            {dayDots.length > 4 && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-400'}`} />}
          </div>
        </button>
      );
    }
    return days;
  };

  const renderDayView = () => {
    const startHour = settings.dayStartHour ?? 0;
    const endHour = settings.dayEndHour ?? 23;
    const totalHours = endHour - startHour + 1;
    
    // Generate hours based on settings range
    const hours = Array.from({ length: totalHours }, (_, i) => startHour + i);
    
    const selectedDateStr = formatDateKey(selectedDate);
    const dayEvents = events.filter(e => e.date === selectedDateStr);
    const isToday = formatDateKey(new Date()) === selectedDateStr;
    const now = new Date();
    
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Calculate current time line position relative to startHour
    // If current time is outside view range, we don't render the line
    const showTimeLine = isToday && currentHour >= startHour && currentHour <= endHour;
    const timeLineTop = ((currentHour - startHour) * 60 + currentMinutes) / 60 * 80;

    return (
      <div className="relative flex flex-col" style={{ height: `${totalHours * 80}px` }}>
        {showTimeLine && (
          <div 
            className="absolute left-0 right-0 z-40 flex items-center pointer-events-none"
            style={{ top: `${timeLineTop}px` }}
          >
            <div className={`w-12 text-[11px] font-black text-red-500 pr-3 text-right ${isDarkMode ? 'bg-[#0D0D0E]' : 'bg-[#F4F7FB]'}`}>
              {currentHour}:{String(currentMinutes).padStart(2, '0')}
            </div>
            <div className="flex-1 h-[2px] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]"></div>
            <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 border-2 border-white dark:border-[#0D0D0E]"></div>
          </div>
        )}

        {hours.map(hour => (
          <div 
            key={hour} 
            className="relative h-20 flex cursor-pointer"
            onClick={() => onOpenEvent(null, { date: selectedDateStr, time: `${hour.toString().padStart(2, '0')}:00` })}
          >
            <div className={`w-12 -mt-2.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 text-right pr-2 z-10 ${isDarkMode ? 'bg-[#0D0D0E]' : 'bg-[#F4F7FB]'}`}>
              {String(hour).padStart(2, '0')}:00
            </div>
            <div className="flex-1 border-t border-gray-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"></div>
          </div>
        ))}

        {dayEvents.map(event => {
          const [h, m] = event.time.split(':').map(Number);
          
          // Only render if event starts within or overlaps the visible range
          // For simplicity, we render all for that day, but offset logic clips them visually
          
          const topPosition = ((h - startHour) + m / 60) * 80;
          const height = (event.duration || 1) * 80;
          
          // Use single color for Day View cards as requested
          const backgroundColor = getSingleEventColor(event); 
          const attendeeNames = event.memberIds
            .map(id => members.find(m => m.id === id)?.name)
            .filter(Boolean)
            .join(', ');

          return (
            <div 
              key={event.id}
              onClick={() => onOpenEvent(event)}
              className={`absolute left-14 right-2 rounded-2xl p-2 border border-white/20 shadow-xl text-white animate-in fade-in slide-in-from-left-4 duration-500 z-20 overflow-hidden cursor-pointer active:scale-95 transition-transform`}
              style={{ top: `${topPosition}px`, height: `${height - 4}px`, backgroundColor }}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-90">
                    <Clock size={10} strokeWidth={2.5} />
                    {event.time}
                  </div>
                  <h4 className="font-bold text-xs leading-tight truncate pr-2">{event.title}</h4>
                  {attendeeNames && (
                    <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-90 mt-0.5">
                      <User size={10} strokeWidth={2.5} />
                      {attendeeNames}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0 -mt-0.5 -mr-0.5">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSendToTelegram(event); }} 
                        className="text-white/60 hover:text-white p-1"
                        title="Отправить в Telegram"
                    >
                        <Send size={12} />
                    </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    const today = new Date();
    today.setHours(0,0,0,0);

    const sortedEvents = [...events].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.time.localeCompare(b.time);
    });

    const displayEvents = listTab === 'upcoming' 
      ? sortedEvents.filter(e => new Date(e.date) >= today)
      : sortedEvents.filter(e => new Date(e.date) < today).reverse();

    return (
      <div className="space-y-6 pb-20">
        <div className={`p-1 rounded-xl flex gap-1 ${isDarkMode ? 'bg-white/5' : 'bg-gray-200/50'}`}>
          <button 
            onClick={() => setListTab('upcoming')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${listTab === 'upcoming' ? (isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-500'}`}
          >
            <Sparkles size={14} /> Будущие
          </button>
          <button 
            onClick={() => setListTab('past')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${listTab === 'past' ? (isDarkMode ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-500'}`}
          >
            <History size={14} /> Прошедшие
          </button>
        </div>

        <div className="space-y-4">
          {displayEvents.length > 0 ? (
            displayEvents.map(e => {
                const backgroundColor = getSingleEventColor(e);
                const attendeeNames = e.memberIds
                    .map(id => members.find(m => m.id === id)?.name)
                    .filter(Boolean)
                    .join(', ');

                return (
                  <div 
                    key={e.id}
                    onClick={() => onOpenEvent(e)} 
                    className={`p-5 rounded-[28px] flex items-center justify-between border transition-all animate-in fade-in slide-in-from-bottom-2 cursor-pointer active:scale-[0.98] ${isDarkMode ? 'bg-[#1A1A1C] border-white/5' : 'bg-white border-black/[0.03] shadow-sm'} ${listTab === 'past' ? 'opacity-60 grayscale-[0.2]' : ''}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div 
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0`}
                        style={{ backgroundColor }}
                      >
                        {getEventIcon(e)}
                      </div>
                      <div className="min-w-0">
                        <h4 className={`font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{e.title}</h4>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              {new Date(e.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-gray-600 opacity-30"></div>
                            <span className="text-[10px] font-black text-blue-500 uppercase">{e.time}</span>
                            <div className="w-1 h-1 rounded-full bg-gray-600 opacity-30"></div>
                            <span className="flex items-center gap-1 text-[10px] font-black text-orange-500 uppercase whitespace-nowrap">
                              <Hourglass size={10} /> {e.duration || 1} ч
                            </span>
                          </div>
                          {attendeeNames && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-purple-500 uppercase truncate">
                              <User size={10} />
                              {attendeeNames}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 pl-2">
                        <button 
                            onClick={(evt) => { evt.stopPropagation(); onSendToTelegram(e); }}
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                  </div>
                );
            })
          ) : (
            <div className="py-20 text-center opacity-30">
              <Check size={40} className="mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Здесь пока пусто</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative flex flex-col h-full w-full max-w-[480px] mx-auto overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#0D0D0E] text-white' : 'bg-[#F4F7FB] text-[#1C1C1E]'}`}>
      
      <div className="px-6 py-4 z-50 bg-inherit shrink-0 mt-2">
        <div className={`p-1.5 rounded-2xl flex items-center ${isDarkMode ? 'bg-[#1A1A1C]' : 'bg-gray-200/60'}`}>
          <button 
            onClick={() => setViewMode('month')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] text-[10px] font-black uppercase transition-all duration-300 ${viewMode === 'month' ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-500'}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button 
            onClick={() => setViewMode('day')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] text-[10px] font-black uppercase transition-all duration-300 ${viewMode === 'day' ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-500'}`}
          >
            <CalendarDays size={16} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] text-[10px] font-black uppercase transition-all duration-300 ${viewMode === 'list' ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-500'}`}
          >
            <ListTodo size={16} />
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-6 pb-4 no-scrollbar bg-inherit scroll-smooth" ref={scrollRef}>
        {viewMode === 'month' && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className={`rounded-[36px] p-7 shadow-2xl border ${isDarkMode ? 'bg-[#1A1A1C] border-white/5' : 'bg-white border-black/[0.03]'}`}>
              <div className="flex items-center justify-between mb-8 px-1">
                <h2 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {currentDate.toLocaleString('ru', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => changeMonth(-1)} className={`p-2.5 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-100 text-gray-600'}`}><ChevronLeft size={20}/></button>
                  <button onClick={() => changeMonth(1)} className={`p-2.5 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-100 text-gray-600'}`}><ChevronRight size={20}/></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-tighter opacity-80">
                {['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
            </div>

            <div className="mt-10 px-3 pb-20">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                План: {selectedDate.getDate()} {selectedDate.toLocaleString('ru', { month: 'long' })}
                <div className="flex-1 h-[1px] bg-current opacity-10"></div>
              </h3>
              <div className="space-y-4">
                {events.filter(e => e.date === formatDateKey(selectedDate)).length > 0 ? (
                  events.filter(e => e.date === formatDateKey(selectedDate)).map(e => {
                    const backgroundColor = getSingleEventColor(e);
                    const attendeeNames = e.memberIds
                        .map(id => members.find(m => m.id === id)?.name)
                        .filter(Boolean)
                        .join(', ');
                    
                    return (
                        <div key={e.id} onClick={() => onOpenEvent(e)} className={`p-5 rounded-[24px] flex items-center justify-between border transition-all cursor-pointer active:scale-[0.98] ${isDarkMode ? 'bg-[#1A1A1C] border-white/5' : 'bg-white border-black/[0.03] shadow-sm'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-3.5 h-3.5 rounded-full`} style={{ backgroundColor }} />
                            <div>
                            <span className={`font-bold text-sm block ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{e.title}</span>
                            {attendeeNames && <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1 mt-0.5"><User size={10}/> {attendeeNames}</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-black text-gray-400">
                            <button onClick={(evt) => { evt.stopPropagation(); onSendToTelegram(e); }} className="hover:text-blue-500 mr-2"><Send size={14}/></button>
                            <span className="text-blue-500">{e.time}</span>
                            <span className="opacity-30">|</span>
                            <span className="flex items-center gap-1"><Hourglass size={10} /> {e.duration || 1} ч</span>
                        </div>
                        </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500 italic text-center py-4 uppercase font-bold opacity-50">Свободный день</p>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="animate-in slide-in-from-right-10 duration-500 pt-8">
             <div className="mb-6 px-2 flex justify-between items-end">
                <div>
                  <h3 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedDate.toLocaleDateString('ru', { day: 'numeric', month: 'long' })}
                  </h3>
                  <p className="text-xs font-black text-blue-500 uppercase tracking-widest mt-1">{selectedDate.toLocaleDateString('ru', { weekday: 'long' })}</p>
                </div>
                <button onClick={() => setViewMode('month')} className="text-[10px] font-black uppercase text-gray-500 border-b border-gray-500 pb-1 hover:text-blue-500 hover:border-blue-500 transition-colors">К календарю</button>
             </div>
             {renderDayView()}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
            <div className="mb-6 px-2">
              <h3 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Список дел</h3>
              <p className="text-xs font-black text-blue-500 uppercase tracking-widest mt-1">Все ваши задачи</p>
            </div>
            {renderListView()}
          </div>
        )}
      </main>

      {/* FAB: Create New Event via Global Modal */}
      {typeof document !== 'undefined' && createPortal(
          <button 
            onClick={() => onOpenEvent(null, { date: formatDateKey(selectedDate) })}
            className={`fixed bottom-28 right-6 w-16 h-16 bg-blue-600 text-white rounded-[24px] flex items-center justify-center shadow-2xl shadow-blue-600/40 z-[60] active:scale-90 transition-all border-[6px] ${isDarkMode ? 'border-[#0D0D0E]' : 'border-white'}`}
          >
            <Plus size={32} strokeWidth={3} />
          </button>,
          document.body
      )}
    </div>
  );
};

export default FamilyPlansMobile;