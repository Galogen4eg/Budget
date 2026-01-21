
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Settings, 
  Bell, 
  MoreHorizontal,
  Moon,
  Sun,
  Mic,
  BrainCircuit,
  Loader2,
  CheckSquare,
  Square,
  Users,
  BellRing,
  Filter
} from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';
import EventModal from './EventModal';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem } from '../utils/db';
import { toast } from 'sonner';
import { MemberMarker } from '../constants';

interface FamilyPlansProps {
  events: FamilyEvent[];
  setEvents: (events: FamilyEvent[] | ((prev: FamilyEvent[]) => FamilyEvent[])) => void;
  settings: AppSettings;
  members: FamilyMember[];
  onSendToTelegram: (e: FamilyEvent) => Promise<boolean>;
  onDeleteEvent?: (id: string) => void;
}

const FamilyPlans: React.FC<FamilyPlansProps> = ({ events, setEvents, settings, members, onSendToTelegram, onDeleteEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'day' | 'list'>('month');
  const [listTab, setListTab] = useState<'upcoming' | 'past'>('upcoming');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modal & Logic State
  const [activeEvent, setActiveEvent] = useState<{ event: FamilyEvent | null; prefill?: any } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { familyId } = useAuth();

  const isDarkMode = settings.theme === 'dark';

  // Determine Day View Range from Settings
  const startHour = settings.dayStartHour ?? 0;
  const endHour = settings.dayEndHour ?? 23;
  const safeStart = Math.max(0, Math.min(23, startHour));
  const safeEnd = Math.max(safeStart, Math.min(23, endHour));
  // Ensure we display at least one hour if start == end
  const displayEnd = safeEnd === safeStart ? safeStart + 1 : safeEnd;

  // Update current time indicator
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- Voice Logic ---
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const processVoiceWithGemini = async (text: string) => {
    if (!process.env.API_KEY) {
        toast.error('API Key не настроен');
        return;
    }
    
    setIsProcessingVoice(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const todayStr = getLocalDateString(new Date());
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Today is ${todayStr}. Parse this event: "${text}". JSON ONLY: { "title": string, "date": "YYYY-MM-DD", "time": "HH:MM" }.`,
        config: { responseMimeType: "application/json" }
      });

      let responseText = response.text || "{}";
      const data = JSON.parse(responseText);

      if (data.title) {
          setActiveEvent({ event: null, prefill: { title: data.title, date: data.date || todayStr, time: data.time || '12:00' } });
          toast.success('Событие распознано!');
      } else {
          toast.error('Не удалось понять детали');
      }
    } catch (err) {
      console.error(err);
      toast.error('Ошибка AI');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Голосовой ввод не поддерживается'); return; }
    
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }

    try {
        const r = new SR();
        recognitionRef.current = r; r.lang = 'ru-RU';
        r.onstart = () => setIsListening(true);
        r.onend = () => { if (!isProcessingVoice) setIsListening(false); };
        r.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            if (transcript) processVoiceWithGemini(transcript);
        };
        r.start();
    } catch (e) { toast.error('Ошибка микрофона'); }
  };

  // --- Calendar Logic ---
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const prevDays = Array.from({ length: offset }, (_, i) => ({
      day: daysInPrevMonth - offset + i + 1,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      current: false
    }));
    
    const currentDays = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      month,
      year,
      current: true
    }));
    
    const totalSlots = 42;
    const nextDaysCount = totalSlots - prevDays.length - currentDays.length;
    const nextDays = Array.from({ length: nextDaysCount }, (_, i) => ({
      day: i + 1,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      current: false
    }));

    return [...prevDays, ...currentDays, ...nextDays];
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  // Dynamic hours array based on settings
  const hours = Array.from({ length: displayEnd - safeStart + 1 }, (_, i) => safeStart + i);

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

  // Helper to filter events for a specific day
  const getEventsForDate = (d: Date) => {
      const dateStr = getLocalDateString(d);
      return events.filter(e => e.date === dateStr);
  };

  const selectedDayEvents = useMemo(() => {
      return getEventsForDate(selectedDate);
  }, [selectedDate, events]);

  // --- List View Logic ---
  const filteredListEvents = useMemo(() => {
    const now = new Date();
    
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
    return filteredListEvents.reduce((groups, event) => {
        const d = new Date(event.date);
        const dateKey = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(event);
        return groups;
    }, {} as Record<string, FamilyEvent[]>);
  }, [filteredListEvents]);

  // Handle Event Actions
  const handleSaveEvent = async (e: FamilyEvent) => {
      setEvents(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(ev => ev.id === e.id);
        if (existingIndex > -1) updated[existingIndex] = e;
        else updated.push(e);
        return updated;
      }); 
      setActiveEvent(null); 
      
      if (familyId) {
          const exists = events.some(ev => ev.id === e.id);
          if (exists) await updateItem(familyId, 'events', e.id, e);
          else await addItem(familyId, 'events', e);
      }
      if (settings.autoSendEventsToTelegram) onSendToTelegram(e);
  };

  const handleDeleteEvent = async (id: string) => {
      setEvents(prev => prev.filter(e => e.id !== id));
      if (familyId) await deleteItem(familyId, 'events', id);
      if (onDeleteEvent) onDeleteEvent(id); 
      setActiveEvent(null);
  };

  const getMemberColor = (memberIds: string[]) => {
      if (memberIds.length === 0) return '#9CA3AF';
      const m = members.find(mem => mem.id === memberIds[0]);
      return m ? m.color : '#3B82F6';
  };

  const getFormatReminder = (minutes: number) => {
      if (minutes >= 1440) return `За ${(minutes/1440).toFixed(0)} дн.`;
      if (minutes >= 60) return `За ${(minutes/60).toFixed(0)} ч.`;
      return `За ${minutes} мин.`;
  };

  // --- Render Day View ---
  const renderDayView = () => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const currentHour = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    
    // Calculate top position relative to startHour
    const timeIndicatorTop = ((currentHour - safeStart) * 80) + (currentMinutes * 80 / 60);
    const showTimeIndicator = isToday && currentHour >= safeStart && currentHour <= displayEnd;

    return (
      <div className="relative flex flex-1 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm h-full">
        {/* Time Scale */}
        <div className="w-16 md:w-20 border-r border-black/5 dark:border-white/10 flex flex-col bg-gray-50/50 dark:bg-black/20 shrink-0">
          {hours.map(hour => (
            <div key={hour} className="h-20 border-b border-black/[0.02] dark:border-white/[0.02] flex justify-center pt-2">
              <span className="text-[10px] md:text-[11px] font-medium text-gray-400 dark:text-gray-500">{`${hour.toString().padStart(2, '0')}:00`}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 relative overflow-y-auto overflow-x-hidden no-scrollbar h-full">
          {hours.map(hour => (
            <div 
                key={hour} 
                className="h-20 border-b border-black/[0.03] dark:border-white/[0.05] w-full cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                onClick={() => {
                    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                    setActiveEvent({ event: null, prefill: { date: getLocalDateString(selectedDate), time: timeStr } });
                }}
            ></div>
          ))}

          {/* Time Indicator */}
          {showTimeIndicator && (
            <div 
              className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
              style={{ top: `${timeIndicatorTop}px` }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-sm"></div>
              <div className="flex-1 h-px bg-red-500"></div>
            </div>
          )}

          {/* Events */}
          {selectedDayEvents.map(event => {
            const [h, m] = event.time.split(':').map(Number);
            
            // Skip events outside visible range
            if (h < safeStart || h > displayEnd) return null;

            // Adjusted Top Position
            const top = ((h - safeStart) * 80) + (m * 80 / 60);
            const height = ((event.duration || 1) * 80 / 60);
            const color = getMemberColor(event.memberIds);
            const isSmall = height < 60; // Less than 45 mins approx

            return (
              <div 
                key={event.id}
                onClick={() => setActiveEvent({ event })}
                className={`absolute left-2 right-2 md:left-4 md:right-8 rounded-xl p-2 md:p-3 shadow-sm border-l-4 transition-transform active:scale-[0.98] cursor-pointer group hover:brightness-110 overflow-hidden flex flex-col justify-start`}
                style={{ 
                    top: `${top + 2}px`, 
                    height: `${Math.max(30, height - 4)}px`,
                    backgroundColor: `${color}20`,
                    borderLeftColor: color
                }}
              >
                {/* Improved Short Event Layout */}
                {isSmall ? (
                    <div className="flex items-center gap-2 h-full">
                        <span className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-medium whitespace-nowrap">{event.time}</span>
                        <p className="text-[#1C1C1E] dark:text-white font-bold text-xs md:text-sm leading-tight truncate flex-1 min-w-0">{event.title}</p>
                    </div>
                ) : (
                    <div className="flex justify-between items-start h-full">
                      <div className="flex-1 min-w-0 pr-1">
                        <p className="text-[#1C1C1E] dark:text-white font-bold text-xs md:text-sm leading-tight truncate">{event.title}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs mt-0.5 flex items-center gap-1 truncate">
                          <Clock size={10} /> {event.time} — {event.duration || 1} ч
                        </p>
                      </div>
                      <MoreHorizontal size={16} className="text-gray-400 group-hover:text-[#1C1C1E] dark:group-hover:text-white shrink-0" />
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
      return (
          <div className="flex flex-col h-full gap-6">
              {/* List Tabs */}
              <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl shrink-0">
                  <button onClick={() => setListTab('upcoming')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${listTab === 'upcoming' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}>Будущие</button>
                  <button onClick={() => setListTab('past')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${listTab === 'past' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}>Прошедшие</button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pb-8">
                  {Object.keys(groupedListEvents).length > 0 ? (
                      Object.entries(groupedListEvents).map(([date, items]) => (
                          <section key={date} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                              <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 px-2 top-0 bg-[#F2F2F7] dark:bg-black z-10 py-2 sticky">{date}</h2>
                              <div className="space-y-3">
                                  {items.map(event => {
                                      const color = getMemberColor(event.memberIds);
                                      const dateObj = new Date(event.date);
                                      return (
                                          <div key={event.id} onClick={() => setActiveEvent({ event })} className="group bg-white dark:bg-[#1C1C1E] p-4 rounded-[1.5rem] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center gap-4">
                                              <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shrink-0" style={{ backgroundColor: color }}>
                                                  <span className="text-[10px] font-black uppercase opacity-80">{dateObj.toLocaleDateString('ru-RU', { month: 'short' })}</span>
                                                  <span className="text-xl font-black leading-none">{dateObj.getDate()}</span>
                                              </div>
                                              
                                              <div className="flex-1 min-w-0">
                                                  <h3 className="font-bold text-base truncate text-[#1C1C1E] dark:text-white mb-1">{event.title}</h3>
                                                  <div className="flex items-center gap-4 text-xs font-medium text-gray-400 dark:text-gray-500">
                                                      <div className="flex items-center gap-1.5">
                                                          <Clock size={14} />
                                                          <span>{event.time}</span>
                                                      </div>
                                                      {event.description && (
                                                          <div className="truncate max-w-[120px]">{event.description}</div>
                                                      )}
                                                  </div>
                                              </div>
                                              <ChevronRight size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
                                          </div>
                                      );
                                  })}
                              </div>
                          </section>
                      ))
                  ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                          <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                              <Filter size={32} className="text-gray-400" />
                          </div>
                          <p className="text-sm font-bold text-gray-500">Нет событий</p>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className={`flex flex-col md:flex-row h-full w-full transition-colors duration-300 font-sans overflow-hidden bg-[#F2F2F7] dark:bg-black text-[#1C1C1E] dark:text-white relative`}>
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header - Split rows on mobile */}
        <header className="bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-xl border-b border-black/5 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between px-4 py-3 md:px-8 md:h-20 shrink-0 gap-3 md:gap-0">
          
          {/* Row 1 (Mobile): Title & Voice */}
          <div className="flex items-center justify-between md:justify-start md:gap-6 w-full md:w-auto">
            <div className="flex flex-col min-w-0">
              <h1 className="text-xl md:text-2xl font-extrabold capitalize leading-tight truncate">
                {viewMode === 'list' ? 'Все события' : viewMode === 'month' ? monthName : selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </h1>
              {viewMode === 'day' && <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium capitalize hidden md:block">{selectedDate.toLocaleDateString('ru-RU', { weekday: 'long' })}</p>}
            </div>
            
            {/* Mobile Voice Button - Top Right */}
            <button onClick={startListening} className={`md:hidden p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-white/10 text-blue-500 shadow-sm'}`}>
               {isProcessingVoice ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
            </button>
          </div>
          
          {/* Row 2 (Mobile): Controls */}
          <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4 w-full md:w-auto">
            {/* View Switcher */}
            <div className="flex bg-black/5 dark:bg-white/5 rounded-xl p-1 shadow-inner overflow-x-auto no-scrollbar flex-1 md:flex-none max-w-full">
              <button 
                onClick={() => setViewMode('month')}
                className={`flex-1 px-3 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${viewMode === 'month' ? 'bg-white dark:bg-white/20 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                Месяц
              </button>
              <button 
                onClick={() => setViewMode('day')}
                className={`flex-1 px-3 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${viewMode === 'day' ? 'bg-white dark:bg-white/20 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                День
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`flex-1 px-3 py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all whitespace-nowrap ${viewMode === 'list' ? 'bg-white dark:bg-white/20 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                Список
              </button>
            </div>

            {/* Navigation & Desktop Controls */}
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
                {/* Desktop Voice */}
                <button onClick={startListening} className={`hidden md:block p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white dark:hover:bg-white/10 text-blue-500'}`}>
                   {isProcessingVoice ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
                </button>

                {/* Navigation - Hidden on list view */}
                {viewMode !== 'list' && (
                    <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-1">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm rounded-lg transition-all active:scale-90 text-gray-600 dark:text-gray-300">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => {
                        const now = new Date();
                        setCurrentDate(now);
                        setSelectedDate(now);
                    }} className="px-2 md:px-4 py-1.5 text-xs font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <span className="hidden md:inline">Сегодня</span>
                        <span className="md:hidden">●</span>
                    </button>
                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm rounded-lg transition-all active:scale-90 text-gray-600 dark:text-gray-300">
                        <ChevronRight size={20} />
                    </button>
                    </div>
                )}
                
                {/* Desktop Create Button */}
                <button 
                    onClick={() => setActiveEvent({ event: null, prefill: { date: getLocalDateString(selectedDate) } })}
                    className="hidden md:flex bg-blue-500 hover:bg-blue-600 active:scale-95 text-white h-11 px-5 rounded-xl items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25"
                >
                  <Plus size={20} strokeWidth={3} />
                  <span className="text-sm font-bold">Создать</span>
                </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col p-2 md:p-8 gap-4 md:gap-8 h-full relative">
          {viewMode === 'month' ? (
            <div className="flex-1 flex flex-col animate-in fade-in duration-500 min-h-0">
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
                  const dayEvents = getEventsForDate(dateObj);
                  const isSelected = selectedDate.getDate() === d.day && selectedDate.getMonth() === d.month && selectedDate.getFullYear() === d.year;
                  const isToday = new Date().getDate() === d.day && new Date().getMonth() === d.month && new Date().getFullYear() === d.year;

                  return (
                    <div 
                      key={i} 
                      onClick={() => handleDateClick(d)}
                      className={`p-1 md:p-2 transition-all cursor-pointer relative flex flex-col ${d.current ? 'bg-white dark:bg-[#1C1C1E]' : 'bg-[#F9F9FB] dark:bg-black/20 opacity-40'} ${isSelected ? 'bg-blue-50/50 dark:bg-blue-500/10 z-10' : 'hover:bg-blue-50/20 dark:hover:bg-blue-500/5'}`}
                    >
                      <div className="flex justify-between items-start shrink-0">
                        <span className={`text-[10px] md:text-sm font-bold flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110' : isSelected ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-700 dark:text-gray-300'}`}>
                          {d.day}
                        </span>
                        {dayEvents.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 mr-1"></div>}
                      </div>
                      
                      <div className="mt-1 space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map(event => {
                            const color = getMemberColor(event.memberIds);
                            return (
                              <div 
                                key={event.id} 
                                className="text-white text-[8px] md:text-[9px] py-0.5 px-1.5 rounded-md font-bold truncate shadow-sm hidden md:block"
                                style={{ backgroundColor: color }}
                              >
                                {event.time} {event.title}
                              </div>
                            );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-[8px] md:text-[9px] text-gray-400 dark:text-gray-500 font-bold px-1 italic hidden md:block">
                            + {dayEvents.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex-1 animate-in slide-in-from-bottom-4 duration-500 min-h-0">
                {renderListView()}
            </div>
          ) : (
            <div className="flex-1 animate-in slide-in-from-bottom-4 duration-500 min-h-0">
              {renderDayView()}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Floating Action Button (FAB) */}
      <button 
          onClick={() => setActiveEvent({ event: null, prefill: { date: getLocalDateString(selectedDate) } })}
          className="md:hidden fixed bottom-28 right-4 z-40 bg-blue-500 text-white w-14 h-14 rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center active:scale-90 transition-transform"
      >
          <Plus size={28} strokeWidth={3} />
      </button>

      {/* Right Details Panel (Inspector) - Hidden on Mobile */}
      <aside className="hidden lg:flex w-96 bg-white dark:bg-[#1C1C1E] border-l border-black/5 dark:border-white/10 flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.02)] dark:shadow-none z-20 h-full">
        {/* ... (Existing Inspector Code) ... */}
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
                    const color = getMemberColor(event.memberIds);
                    const assignedMembers = members.filter(m => event.memberIds.includes(m.id));
                    const hasChecklist = event.checklist && event.checklist.length > 0;
                    const hasReminders = event.reminders && event.reminders.length > 0;

                    return (
                      <div key={event.id} className="group animate-in fade-in slide-in-from-right-4 duration-400 cursor-pointer" onClick={() => setActiveEvent({ event })}>
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`w-12 h-12 rounded-2xl bg-opacity-15 flex items-center justify-center`} style={{ backgroundColor: `${color}20`, color: color }}>
                            <CalendarIcon size={24} strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white truncate leading-none mb-1">{event.title}</h3>
                          </div>
                        </div>

                        <div className="space-y-4 ml-2 border-l-2 border-black/[0.03] dark:border-white/[0.05] pl-6 py-2">
                          {/* Time */}
                          <div className="flex items-center gap-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                            <Clock size={18} className="text-gray-300 dark:text-gray-600" />
                            <span>{event.time} — {event.duration || 1} ч</span>
                          </div>

                          {/* Members List */}
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

                          {/* Description */}
                          {event.description && (
                              <div className="flex items-start gap-3 text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed bg-[#F2F2F7]/50 dark:bg-white/5 p-4 rounded-2xl border border-black/[0.02] dark:border-white/[0.02]">
                                {event.description}
                              </div>
                          )}

                          {/* Checklist Preview */}
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

                          {/* Reminders Preview */}
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
                    onClick={() => setActiveEvent({ event: null, prefill: { date: getLocalDateString(selectedDate) } })}
                    className="mt-6 bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 px-6 py-2.5 rounded-xl text-xs font-black shadow-sm border border-black/5 dark:border-white/5 hover:shadow-md active:scale-95 transition-all"
                >
                  СОЗДАТЬ
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {activeEvent && (
          <EventModal 
            event={activeEvent.event} 
            prefill={activeEvent.prefill} 
            members={members} 
            onClose={() => setActiveEvent(null)} 
            onSave={handleSaveEvent} 
            onDelete={handleDeleteEvent}
            onSendToTelegram={onSendToTelegram} 
            templates={events.filter(ev => ev.isTemplate)} 
            settings={settings} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FamilyPlans;
