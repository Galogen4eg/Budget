
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Clock, Mic, Loader2, CheckSquare, Square, Users, BellRing,
  LayoutGrid, List, History, Sparkles, Send, Hourglass
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';
import { MemberMarker } from '../constants';

interface FamilyPlansDesktopProps {
  events: FamilyEvent[];
  members: FamilyMember[];
  settings: AppSettings;
  
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  
  calendarData: any[]; // Array of day objects
  selectedDayEvents: FamilyEvent[];
  
  onOpenEvent: (event?: FamilyEvent | null, prefill?: any) => void;
  onSendToTelegram: (e: FamilyEvent) => Promise<boolean>;
  
  isListening: boolean;
  isProcessingVoice: boolean;
  startListening: () => void;
}

const FamilyPlansDesktop: React.FC<FamilyPlansDesktopProps> = ({
  events,
  members,
  currentDate, setCurrentDate,
  selectedDate, setSelectedDate,
  calendarData, selectedDayEvents,
  onOpenEvent, onSendToTelegram,
  isListening, isProcessingVoice, startListening
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [listTab, setListTab] = useState<'upcoming' | 'past'>('upcoming');

  const monthName = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const changeDate = (dir: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + dir);
    setCurrentDate(newDate);
  };

  const handleDateClick = (d: { year: number, month: number, day: number }) => {
    const newDate = new Date(d.year, d.month, d.day);
    setSelectedDate(newDate);
  };

  const getFormatReminder = (minutes: number) => {
      if (minutes >= 1440) return `За ${(minutes/1440).toFixed(0)} дн.`;
      if (minutes >= 60) return `За ${(minutes/60).toFixed(0)} ч.`;
      return `За ${minutes} мин.`;
  };

  // --- List View Logic ---
  const filteredListEvents = useMemo(() => {
    const now = new Date();
    // Reset time for accurate day comparison if needed, but for "upcoming" we usually want exact time
    // For simplicity, strict time comparison
    
    return events.filter(e => {
        const eDate = new Date(`${e.date}T${e.time || '00:00'}`);
        if (listTab === 'upcoming') {
            return eDate >= now;
        } else {
            return eDate < now;
        }
    }).sort((a, b) => {
        const da = new Date(`${a.date}T${a.time || '00:00'}`);
        const db = new Date(`${b.date}T${b.time || '00:00'}`);
        return listTab === 'upcoming' ? da.getTime() - db.getTime() : db.getTime() - da.getTime();
    });
  }, [events, listTab]);

  const groupedListEvents = useMemo(() => {
      const groups: Record<string, FamilyEvent[]> = {};
      filteredListEvents.forEach(e => {
          const d = new Date(e.date);
          const key = d.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
          if (!groups[key]) groups[key] = [];
          groups[key].push(e);
      });
      return groups;
  }, [filteredListEvents]);

  return (
    <div className="flex h-full w-full bg-[#F2F2F7] dark:bg-black text-[#1C1C1E] dark:text-white font-sans overflow-hidden">
        
        {/* Main Content (Left Side) */}
        <main className="flex-1 flex flex-col min-w-0 h-full">
            <header className="bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-xl border-b border-black/5 dark:border-white/10 flex items-center justify-between px-8 h-20 shrink-0">
                <div className="flex items-center gap-6">
                    {viewMode === 'calendar' ? (
                        <h1 className="text-2xl font-extrabold capitalize leading-tight truncate">{monthName}</h1>
                    ) : (
                        <div className="flex bg-gray-200 dark:bg-white/10 p-1 rounded-xl">
                            <button 
                                onClick={() => setListTab('upcoming')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${listTab === 'upcoming' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                            >
                                <Sparkles size={14} /> Будущие
                            </button>
                            <button 
                                onClick={() => setListTab('past')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${listTab === 'past' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-gray-800 dark:text-white' : 'text-gray-500'}`}
                            >
                                <History size={14} /> Прошедшие
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* View Switcher */}
                    <div className="flex bg-gray-200 dark:bg-white/10 p-1 rounded-xl">
                        <button 
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-gray-300 dark:bg-white/10 mx-1"></div>

                    <button onClick={startListening} className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white dark:hover:bg-white/10 text-blue-500'}`}>
                        {isProcessingVoice ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
                    </button>

                    {viewMode === 'calendar' && (
                        <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-1">
                            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm rounded-lg transition-all active:scale-90 text-gray-600 dark:text-gray-300">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={() => {
                                const now = new Date();
                                setCurrentDate(now);
                                setSelectedDate(now);
                            }} className="px-4 py-1.5 text-xs font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                Сегодня
                            </button>
                            <button onClick={() => changeDate(1)} className="p-2 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm rounded-lg transition-all active:scale-90 text-gray-600 dark:text-gray-300">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}

                    <button 
                        onClick={() => onOpenEvent(null, { date: getLocalDateString(selectedDate) })}
                        className="bg-blue-500 hover:bg-blue-600 active:scale-95 text-white h-11 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25"
                    >
                        <Plus size={20} strokeWidth={3} />
                        <span className="text-sm font-bold">Создать</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 p-8 overflow-hidden flex flex-col">
                {viewMode === 'calendar' ? (
                    <>
                        <div className="grid grid-cols-7 mb-2 px-2 shrink-0">
                            {weekDays.map(day => (
                                <div key={day} className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                    {day}
                                </div>
                            ))}
                        </div>
                        
                        <div className="grid grid-cols-7 grid-rows-6 flex-1 gap-px bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/5 min-h-0">
                            {calendarData.map((d, i) => {
                                const dateObj = new Date(d.year, d.month, d.day);
                                const dateStr = getLocalDateString(dateObj);
                                const dayEvents = events.filter((e: FamilyEvent) => e.date === dateStr);

                                const isSelected = selectedDate.getDate() === d.day && selectedDate.getMonth() === d.month && selectedDate.getFullYear() === d.year;
                                const isToday = new Date().getDate() === d.day && new Date().getMonth() === d.month && new Date().getFullYear() === d.year;

                                const uniqueColors = Array.from(new Set(dayEvents.flatMap((e: FamilyEvent) => e.memberIds).map((id: string) => {
                                    const m = members.find(mem => mem.id === id);
                                    return m ? m.color : '#9CA3AF';
                                }))).slice(0, 3);

                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => handleDateClick(d)}
                                        className={`p-2 transition-all cursor-pointer relative flex flex-col ${d.current ? 'bg-white dark:bg-[#1C1C1E]' : 'bg-[#F9F9FB] dark:bg-black/20 opacity-40'} ${isSelected ? 'bg-blue-50/50 dark:bg-blue-500/10 z-10' : 'hover:bg-blue-50/20 dark:hover:bg-blue-500/5'}`}
                                    >
                                        <div className="flex justify-between items-start shrink-0">
                                            <span className={`text-sm font-bold flex items-center justify-center w-8 h-8 rounded-full transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110' : isSelected ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {d.day}
                                            </span>
                                            {uniqueColors.length > 0 && (
                                                <div className="flex gap-1 mt-1.5 mr-1">
                                                    {uniqueColors.map((c: string) => (
                                                        <div key={c} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="mt-1 space-y-1 overflow-hidden">
                                            {dayEvents.slice(0, 2).map((event: FamilyEvent) => (
                                                <div 
                                                    key={event.id} 
                                                    className="text-white text-[9px] py-0.5 px-1.5 rounded-md font-bold truncate shadow-sm bg-blue-500"
                                                >
                                                    {event.time} {event.title}
                                                </div>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <div className="text-[9px] text-gray-400 dark:text-gray-500 font-bold px-1 italic">
                                                    + {dayEvents.length - 2}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    /* LIST VIEW */
                    <div className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-20">
                        {Object.keys(groupedListEvents).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                                <CalendarIcon size={48} className="mb-4 opacity-20" />
                                <p className="font-bold text-sm uppercase tracking-widest">
                                    {listTab === 'upcoming' ? 'Нет будущих событий' : 'История пуста'}
                                </p>
                            </div>
                        ) : (
                            Object.entries(groupedListEvents).map(([month, monthEvents]) => (
                                <div key={month}>
                                    <div className="sticky top-0 bg-[#F2F2F7]/95 dark:bg-black/95 backdrop-blur-sm py-3 px-1 z-10 mb-2 border-b border-gray-200 dark:border-white/10">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{month}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {monthEvents.map(event => {
                                            const eventDate = new Date(event.date);
                                            const dayNum = eventDate.getDate();
                                            const weekDay = eventDate.toLocaleDateString('ru-RU', { weekday: 'short' });
                                            const attendeeNames = event.memberIds
                                                .map(id => members.find(m => m.id === id)?.name)
                                                .filter(Boolean)
                                                .join(', ');

                                            return (
                                                <div 
                                                    key={event.id}
                                                    onClick={() => { setSelectedDate(eventDate); onOpenEvent(event); }}
                                                    className="group flex items-center bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl border border-transparent hover:border-blue-500/20 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                                                >
                                                    {/* Date Badge */}
                                                    <div className="flex flex-col items-center justify-center w-14 h-14 bg-gray-50 dark:bg-white/5 rounded-2xl mr-6 border border-gray-100 dark:border-white/5">
                                                        <span className="text-xl font-black text-[#1C1C1E] dark:text-white leading-none">{dayNum}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{weekDay}</span>
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg">
                                                                <Clock size={12} className="text-blue-600 dark:text-blue-400"/>
                                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{event.time}</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                                <Hourglass size={10} /> {event.duration || 1} ч
                                                            </span>
                                                        </div>
                                                        <h4 className="text-lg font-bold text-[#1C1C1E] dark:text-white truncate pr-4">{event.title}</h4>
                                                        {attendeeNames && (
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <Users size={12} className="text-gray-400" />
                                                                <span className="text-xs font-medium text-gray-500">{attendeeNames}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onSendToTelegram(event); }}
                                                            className="p-3 bg-gray-50 dark:bg-[#2C2C2E] hover:bg-blue-500 hover:text-white text-gray-400 rounded-xl transition-colors"
                                                            title="Отправить в Telegram"
                                                        >
                                                            <Send size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </main>

        {/* Right Details Panel (Inspector) */}
        <aside className="w-96 bg-white dark:bg-[#1C1C1E] border-l border-black/5 dark:border-white/10 flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.02)] dark:shadow-none z-20 h-full hidden xl:flex">
            <div className="p-8 h-full flex flex-col">
                <div className="flex justify-between items-center mb-10 shrink-0">
                    <h2 className="text-xl font-extrabold tracking-tight">Инспектор</h2>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="mb-10 animate-in fade-in slide-in-from-top-2">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3">Выбрано</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
                            {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-lg font-medium text-blue-500 dark:text-blue-400 capitalize">{selectedDate.toLocaleDateString('ru-RU', { weekday: 'long' })}</p>
                    </div>

                    {selectedDayEvents.length > 0 ? (
                        <div className="space-y-8">
                            {selectedDayEvents.map(event => {
                                const assignedMembers = members.filter(m => event.memberIds.includes(m.id));
                                const hasChecklist = event.checklist && event.checklist.length > 0;
                                const hasReminders = event.reminders && event.reminders.length > 0;

                                return (
                                    <div key={event.id} className="group animate-in fade-in slide-in-from-right-4 duration-400 cursor-pointer" onClick={() => onOpenEvent(event)}>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500`}>
                                                <CalendarIcon size={24} strokeWidth={2.5} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-black text-gray-900 dark:text-white truncate leading-none mb-1">{event.title}</h3>
                                            </div>
                                        </div>

                                        <div className="space-y-4 ml-2 border-l-2 border-black/[0.03] dark:border-white/[0.05] pl-6 py-2">
                                            <div className="flex items-center gap-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                                                <Clock size={18} className="text-gray-300 dark:text-gray-600" />
                                                <span>{event.time} — {event.duration || 1} ч</span>
                                            </div>

                                            {assignedMembers.length > 0 && (
                                                <div className="flex items-start gap-3 text-sm font-medium">
                                                    <Users size={18} className="text-gray-300 dark:text-gray-600 mt-0.5" />
                                                    <div className="flex flex-wrap gap-2">
                                                        {assignedMembers.map(m => (
                                                            <div key={m.id} className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-lg">
                                                                <MemberMarker member={m} size="sm" />
                                                                <span className="text-[10px] text-[#1C1C1E] dark:text-white">{m.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {event.description && (
                                                <div className="flex items-start gap-3 text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed bg-[#F2F2F7]/50 dark:bg-white/5 p-4 rounded-2xl border border-black/[0.02] dark:border-white/[0.02]">
                                                    {event.description}
                                                </div>
                                            )}

                                            {hasChecklist && (
                                                <div className="space-y-2">
                                                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                        <CheckSquare size={12} /> Чек-лист ({event.checklist!.filter(i=>i.completed).length}/{event.checklist!.length})
                                                    </div>
                                                    <div className="space-y-1">
                                                        {event.checklist!.slice(0, 3).map(item => (
                                                            <div key={item.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                                {item.completed ? <CheckSquare size={12} className="text-green-500" /> : <Square size={12} />}
                                                                <span className={item.completed ? 'line-through opacity-60' : ''}>{item.text}</span>
                                                            </div>
                                                        ))}
                                                        {event.checklist!.length > 3 && (
                                                            <span className="text-[9px] text-gray-400 pl-5">+ еще {event.checklist!.length - 3}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {hasReminders && (
                                                <div className="flex flex-wrap gap-2">
                                                    {event.reminders!.map((r, i) => (
                                                        <div key={i} className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
                                                            <BellRing size={10} /> {getFormatReminder(r)}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-center px-4 bg-[#F2F2F7]/30 dark:bg-white/5 rounded-3xl border-2 border-dashed border-black/[0.05] dark:border-white/[0.05]">
                            <div className="w-20 h-20 bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm flex items-center justify-center text-gray-200 dark:text-gray-700 mb-6">
                                <Plus size={40} strokeWidth={3} />
                            </div>
                            <p className="text-gray-400 dark:text-gray-500 text-sm font-bold max-w-[180px]">На этот день пока нет планов</p>
                            <button 
                                onClick={() => onOpenEvent(null, { date: getLocalDateString(selectedDate) })}
                                className="mt-6 bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 px-6 py-2.5 rounded-xl text-xs font-black shadow-sm border border-black/5 dark:border-white/5 hover:shadow-md active:scale-95 transition-all"
                            >
                                СОЗДАТЬ
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    </div>
  );
};

export default FamilyPlansDesktop;
