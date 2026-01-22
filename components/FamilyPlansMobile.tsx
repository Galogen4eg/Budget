
import React from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Clock, Mic, Loader2, Filter, MoreHorizontal
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';
import { MemberMarker } from '../constants';

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
  
  isListening: boolean;
  isProcessingVoice: boolean;
  startListening: () => void;
}

const FamilyPlansMobile: React.FC<FamilyPlansMobileProps> = ({
  members, settings,
  currentDate, setCurrentDate,
  selectedDate, setSelectedDate,
  viewMode, setViewMode,
  listTab, setListTab,
  calendarData, selectedDayEvents, groupedListEvents,
  onOpenEvent,
  isListening, isProcessingVoice, startListening
}) => {
  const isDarkMode = settings.theme === 'dark';
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const monthName = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  // Day View Constants
  const startHour = settings.dayStartHour ?? 0;
  const endHour = settings.dayEndHour ?? 23;
  const safeStart = Math.max(0, Math.min(23, startHour));
  const safeEnd = Math.max(safeStart, Math.min(23, endHour));
  const displayEnd = safeEnd === safeStart ? safeStart + 1 : safeEnd;
  const hours = Array.from({ length: displayEnd - safeStart + 1 }, (_, i) => safeStart + i);
  const HOUR_HEIGHT = 80;

  const changeDate = (dir: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + dir);
    } else {
      newDate.setDate(currentDate.getDate() + dir);
    }
    setCurrentDate(newDate);
    if (viewMode === 'day') setSelectedDate(newDate);
  };

  const handleDateClick = (d: { year: number, month: number, day: number }) => {
    const newDate = new Date(d.year, d.month, d.day);
    setSelectedDate(newDate);
    if (viewMode === 'day') setCurrentDate(newDate);
  };

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const renderDayView = () => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const timeIndicatorTop = ((currentHour - safeStart) * HOUR_HEIGHT) + (currentMinutes * HOUR_HEIGHT / 60);
    const showTimeIndicator = isToday && currentHour >= safeStart && currentHour <= displayEnd;

    return (
      <div className="relative flex-1 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 shadow-sm h-full overflow-y-auto no-scrollbar isolate">
        <div className="flex min-h-full">
            <div className="w-14 border-r border-black/5 dark:border-white/10 flex flex-col bg-gray-50/50 dark:bg-black/20 shrink-0">
              {hours.map(hour => (
                <div key={hour} className="relative border-b border-black/[0.02] dark:border-white/[0.02] box-border" style={{ height: `${HOUR_HEIGHT}px` }}>
                  <span className="absolute -top-3 left-0 right-0 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    {`${hour.toString().padStart(2, '0')}:00`}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex-1 relative min-w-0">
              {hours.map(hour => (
                <div 
                    key={hour} 
                    className="border-b border-black/[0.03] dark:border-white/[0.05] w-full cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] box-border"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    onClick={() => {
                        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                        onOpenEvent(null, { date: getLocalDateString(selectedDate), time: timeStr });
                    }}
                ></div>
              ))}

              {showTimeIndicator && (
                <div 
                  className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
                  style={{ top: `${timeIndicatorTop}px` }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-sm"></div>
                  <div className="flex-1 h-px bg-red-500"></div>
                </div>
              )}

              {selectedDayEvents.map(event => {
                const [h, m] = event.time.split(':').map(Number);
                if (h < safeStart || h > displayEnd) return null;

                const top = ((h - safeStart) * HOUR_HEIGHT) + (m * HOUR_HEIGHT / 60);
                const height = ((event.duration || 1) * HOUR_HEIGHT);
                const isSmall = height < 50;
                const eventMembers = members.filter(m => event.memberIds.includes(m.id));

                return (
                  <div 
                    key={event.id}
                    onClick={() => onOpenEvent(event)}
                    className={`absolute left-2 right-2 rounded-xl shadow-sm border-l-4 transition-transform active:scale-[0.98] cursor-pointer group overflow-hidden flex flex-col justify-start z-10 box-border`}
                    style={{ 
                        top: `${top}px`, 
                        height: `${Math.max(30, height - 2)}px`,
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        borderLeftColor: '#3B82F6',
                        padding: isSmall ? '2px 6px' : '8px 10px'
                    }}
                  >
                    {isSmall ? (
                        <div className="flex items-center gap-2 h-full">
                            <span className="text-blue-600 dark:text-blue-300 text-[10px] font-bold whitespace-nowrap leading-none">{event.time}</span>
                            <p className="text-[#1C1C1E] dark:text-white font-extrabold text-xs leading-none truncate flex-1 min-w-0 drop-shadow-sm">{event.title}</p>
                            <div className="flex -space-x-1">
                                {eventMembers.map(m => (
                                    <div key={m.id} className="w-2 h-2 rounded-full border border-white dark:border-[#1C1C1E]" style={{ backgroundColor: m.color }} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-start h-full">
                          <div className="flex-1 min-w-0 pr-1 flex flex-col gap-0.5">
                            <p className="text-[#1C1C1E] dark:text-white font-extrabold text-xs leading-tight truncate drop-shadow-sm">{event.title}</p>
                            <p className="text-blue-600 dark:text-blue-300 text-[10px] flex items-center gap-1 truncate font-medium">
                              <Clock size={10} /> {event.time} — {event.duration || 1} ч
                            </p>
                            <div className="flex -space-x-1 mt-1">
                                {eventMembers.map(m => (
                                    <div key={m.id} className="w-3 h-3 rounded-full border border-white dark:border-[#1C1C1E]" style={{ backgroundColor: m.color }} />
                                ))}
                            </div>
                          </div>
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
      return (
          <div className="flex flex-col h-full gap-4">
              <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl shrink-0">
                  <button onClick={() => setListTab('upcoming')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${listTab === 'upcoming' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}>Будущие</button>
                  <button onClick={() => setListTab('past')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${listTab === 'past' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}>Прошедшие</button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-20">
                  {Object.keys(groupedListEvents).length > 0 ? (
                      Object.entries(groupedListEvents).map(([date, items]) => (
                          <section key={date} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                              <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 px-2 top-0 bg-[#F2F2F7] dark:bg-black z-10 py-2 sticky">{date}</h2>
                              <div className="space-y-3">
                                  {items.map(event => {
                                      const dateObj = new Date(event.date);
                                      return (
                                          <div key={event.id} onClick={() => onOpenEvent(event)} className="group bg-white dark:bg-[#1C1C1E] p-4 rounded-[1.5rem] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center gap-4">
                                              <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shrink-0 bg-blue-500">
                                                  <span className="text-[9px] font-black uppercase opacity-80">{dateObj.toLocaleDateString('ru-RU', { month: 'short' })}</span>
                                                  <span className="text-lg font-black leading-none">{dateObj.getDate()}</span>
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <h3 className="font-bold text-sm truncate text-[#1C1C1E] dark:text-white mb-1">{event.title}</h3>
                                                  <div className="flex items-center gap-3 text-xs font-medium text-gray-400 dark:text-gray-500">
                                                      <div className="flex items-center gap-1">
                                                          <Clock size={12} />
                                                          <span>{event.time}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                              <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                                          </div>
                                      );
                                  })}
                              </div>
                          </section>
                      ))
                  ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                          <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                              <Filter size={24} className="text-gray-400" />
                          </div>
                          <p className="text-xs font-bold text-gray-500">Нет событий</p>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black text-[#1C1C1E] dark:text-white">
      {/* Header */}
      <header className="bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-xl border-b border-black/5 dark:border-white/10 flex flex-col justify-between px-4 py-3 shrink-0 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <h1 className="text-xl font-extrabold capitalize leading-tight truncate">
                {viewMode === 'list' ? 'Все события' : viewMode === 'month' ? monthName : selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </h1>
              {viewMode === 'day' && <p className="text-xs text-gray-500 dark:text-gray-400 font-medium capitalize">{selectedDate.toLocaleDateString('ru-RU', { weekday: 'long' })}</p>}
            </div>
            
            <button onClick={startListening} className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-white/10 text-blue-500 shadow-sm'}`}>
               {isProcessingVoice ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
            </button>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex bg-black/5 dark:bg-white/5 rounded-xl p-1 shadow-inner overflow-x-auto no-scrollbar flex-1">
              <button onClick={() => setViewMode('month')} className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap ${viewMode === 'month' ? 'bg-white dark:bg-white/20 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Месяц</button>
              <button onClick={() => setViewMode('day')} className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap ${viewMode === 'day' ? 'bg-white dark:bg-white/20 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>День</button>
              <button onClick={() => setViewMode('list')} className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap ${viewMode === 'list' ? 'bg-white dark:bg-white/20 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Список</button>
            </div>

            {viewMode !== 'list' && (
                <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-1">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg active:scale-90 text-gray-600 dark:text-gray-300"><ChevronLeft size={20} /></button>
                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg active:scale-90 text-gray-600 dark:text-gray-300"><ChevronRight size={20} /></button>
                </div>
            )}
          </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col p-2 gap-4 h-full relative">
          {viewMode === 'month' ? (
            <div className="flex-1 flex flex-col animate-in fade-in duration-300 min-h-0">
              <div className="grid grid-cols-7 mb-2 px-1 shrink-0">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 grid-rows-6 flex-1 gap-px bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm min-h-0">
                {calendarData.map((d, i) => {
                  const dateObj = new Date(d.year, d.month, d.day);
                  const isSelected = selectedDate.getDate() === d.day && selectedDate.getMonth() === d.month && selectedDate.getFullYear() === d.year;
                  const isToday = new Date().getDate() === d.day && new Date().getMonth() === d.month && new Date().getFullYear() === d.year;
                  
                  // Filter events for this specific day using passed props would be slow if we iterate all events every cell. 
                  // Optimization: In parent passed data is usually enough or we do quick check. 
                  // For Mobile smoothness, we might want to just show dots.
                  // For now we assume `calendarData` might contain event counts if processed in parent, 
                  // but here we just render days. Let's do a quick filter on full events list from props?
                  // NOTE: Passing full event list to mobile component is fine.
                  
                  // To avoid heavy calc in render loop, ideally `calendarData` from parent should have this info.
                  // But we kept logic in parent simple. Let's do simple filter here for dots.
                  const dayEvents = d.current ? calendarData[i]?.events || [] : []; // Assuming parent might enhance it, OR we just filter.
                  // Fallback if parent passed standard calendarData without events attached:
                  // Actually let's assume we filter here.
                  const dateStr = getLocalDateString(dateObj);
                  // We can use groupedListEvents if it contains all events, but that is keyed by formatted string.
                  // Let's rely on simplistic check or `calendarData` if I update parent.
                  // For now, let's keep it simple: Just show the day number.
                  
                  return (
                    <div 
                      key={i} 
                      onClick={() => handleDateClick(d)}
                      className={`relative flex flex-col items-center justify-center p-1 transition-all cursor-pointer ${d.current ? 'bg-white dark:bg-[#1C1C1E]' : 'bg-[#F9F9FB] dark:bg-black/20 opacity-40'} ${isSelected ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                    >
                        <span className={`text-xs font-bold flex items-center justify-center w-7 h-7 rounded-full transition-all ${isToday ? 'bg-blue-600 text-white shadow-md' : isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {d.day}
                        </span>
                        {/* Dot indicators could be added here if we filter events */}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex-1 animate-in slide-in-from-bottom-4 duration-300 min-h-0">
                {renderListView()}
            </div>
          ) : (
            <div className="flex-1 animate-in slide-in-from-bottom-4 duration-300 min-h-0">
              {renderDayView()}
            </div>
          )}
      </div>

      {/* FAB via Portal */}
      {typeof document !== 'undefined' && createPortal(
          <button 
              onClick={() => onOpenEvent(null, { date: getLocalDateString(selectedDate) })}
              className="md:hidden fixed bottom-28 right-4 z-50 bg-blue-500 text-white w-14 h-14 rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center active:scale-90 transition-transform"
          >
              <Plus size={28} strokeWidth={3} />
          </button>,
          document.body
      )}
    </div>
  );
};

export default FamilyPlansMobile;
