
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, Clock, Mic, BrainCircuit, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';
import EventModal from './EventModal';
import { GoogleGenAI } from "@google/genai";
import { MemberMarker } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem } from '../utils/db';

interface FamilyPlansProps {
  events: FamilyEvent[];
  setEvents: (events: FamilyEvent[] | ((prev: FamilyEvent[]) => FamilyEvent[])) => void;
  settings: AppSettings;
  members: FamilyMember[];
  onSendToTelegram: (e: FamilyEvent) => Promise<boolean>;
  onDeleteEvent?: (id: string) => void;
}

type ViewMode = 'month' | 'week' | 'day' | 'list';
type ListFilter = 'upcoming' | 'past';

const FamilyPlans: React.FC<FamilyPlansProps> = ({ events, setEvents, settings, members, onSendToTelegram, onDeleteEvent }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month'); 
  const [listFilter, setListFilter] = useState<ListFilter>('upcoming');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeEvent, setActiveEvent] = useState<{ event: FamilyEvent | null; prefill?: any } | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { familyId } = useAuth();

  // Time grid configuration from settings or defaults
  const startHour = settings.dayStartHour ?? 8;
  const endHour = settings.dayEndHour ?? 22;
  const hours = useMemo(() => {
      // Ensure valid range
      const start = Math.max(0, Math.min(23, startHour));
      const end = Math.max(start + 1, Math.min(24, endHour));
      return Array.from({ length: end - start }, (_, i) => start + i);
  }, [startHour, endHour]);

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper to get YYYY-MM-DD in LOCAL time, ignoring timezone shifts
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const processVoiceWithGemini = async (text: string) => {
    if (!process.env.API_KEY) {
        showNotify('API Key не настроен. Проверьте настройки хостинга.', 'error');
        return;
    }
    
    setIsProcessingVoice(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const today = getLocalDateString(new Date());
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Today is ${today}. Parse this event: "${text}". JSON ONLY: { "title": string, "date": "YYYY-MM-DD", "time": "HH:MM" }.`,
        config: { responseMimeType: "application/json" }
      });

      let responseText = response.text || "{}";
      // Cleanup markdown if present
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error("Ошибка парсинга JSON от AI");
      }

      if (data.title) {
          setActiveEvent({ event: null, prefill: { title: data.title, date: data.date || today, time: data.time || '12:00' } });
          showNotify('Событие распознано!');
      } else {
          showNotify('Не удалось понять детали события', 'error');
      }
    } catch (err: any) {
      console.error("Voice AI Error:", err);
      let errorMsg = "Неизвестная ошибка AI";
      if (err instanceof Error) errorMsg = err.message;
      else if (typeof err === 'string') errorMsg = err;
      
      showNotify(`Ошибка: ${errorMsg}`, 'error');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { showNotify('Ваш браузер не поддерживает голосовой ввод', 'error'); return; }
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
        r.onerror = (e: any) => {
            console.error("Speech Error:", e.error);
            let msg = 'Ошибка микрофона';
            if (e.error === 'not-allowed') msg = 'Нет доступа к микрофону';
            else if (e.error === 'no-speech') msg = 'Вас не слышно';
            else if (e.error === 'network') msg = 'Нет сети';
            
            showNotify(msg, 'error');
            setIsListening(false);
        };
        r.start();
    } catch (e) { showNotify('Не удалось запустить микрофон', 'error'); }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Helper to get events for a specific date object
  const getEventsForDate = (date: Date) => {
    const dateStr = getLocalDateString(date);
    return events.filter(e => e.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  };

  // Helper to determine event colors based on participants
  const getEventColors = (memberIds: string[]) => {
      const eventMembers = members.filter(m => memberIds.includes(m.id));
      
      // Default Blue Style
      let background = '#EFF6FF'; // blue-50
      let border = '#BFDBFE'; // blue-200
      let text = '#1D4ED8'; // blue-700
      let indicator = '#3B82F6'; // blue-500

      if (eventMembers.length === 1) {
          // Single member: Solid pastel color
          const c = eventMembers[0].color;
          background = `${c}26`; // ~15% opacity
          border = c; // solid border
          text = '#1C1C1E'; // Dark text for readability (Will check dark mode in component)
          indicator = c;
      } else if (eventMembers.length > 1) {
          // Multiple members: Gradient
          const stops = eventMembers.map((m, i, arr) => {
              const percent = Math.round((i / (arr.length - 1)) * 100);
              return `${m.color}33 ${percent}%`; // ~20% opacity
          }).join(', ');
          background = `linear-gradient(135deg, ${stops})`;
          border = 'transparent'; // Gradient border is tricky, keep transparent
          text = '#1C1C1E';
          indicator = eventMembers[0].color; // Primary indicator
      }

      return { background, borderColor: border, color: text, indicator };
  };

  const getEventStyle = (event: FamilyEvent) => {
      const [h, m] = event.time.split(':').map(Number);
      if (h < startHour || h >= endHour) return null; // Event out of view bounds
      
      const startMinutes = (h - startHour) * 60 + m;
      const durationMinutes = (event.duration || 1) * 60;
      
      // Calculate pixels (assuming 60px per hour height)
      const top = (startMinutes / 60) * 64; // 64px is height of hour row (h-16)
      const height = (durationMinutes / 60) * 64;
      
      const colors = getEventColors(event.memberIds);

      return { 
          top: `${top}px`, 
          height: `${height}px`,
          background: colors.background,
          borderColor: colors.borderColor,
          color: colors.color
      };
  };

  // Generate days for Month View
  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  }, [selectedDate]);

  // Generate days for Week View
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });
  }, [selectedDate]);

  const handleSaveEvent = async (e: FamilyEvent) => {
      // 1. Optimistic Update
      setEvents(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(ev => ev.id === e.id);
        if (existingIndex > -1) {
          updated[existingIndex] = e;
        } else {
          updated.push(e);
        }
        return updated;
      }); 
      setActiveEvent(null); 
      
      // 2. DB Update
      if (familyId) {
          // Check if it's an update or create
          const exists = events.some(ev => ev.id === e.id);
          if (exists) {
              await updateItem(familyId, 'events', e.id, e);
          } else {
              await addItem(familyId, 'events', e);
          }
      }

      if (settings.autoSendEventsToTelegram) onSendToTelegram(e);
  };

  const handleDeleteEvent = async (id: string) => {
      setEvents(prev => prev.filter(e => e.id !== id));
      if (familyId) {
          await deleteItem(familyId, 'events', id);
      }
      if (onDeleteEvent) onDeleteEvent(id); // Propagate if needed
      setActiveEvent(null);
  };

  const renderTimeGrid = (days: Date[], hideHeader = false) => {
      return (
          <div className="flex flex-col h-[calc(100dvh-13rem)] min-h-[400px] bg-white dark:bg-[#1C1C1E] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden relative">
              {/* Single Scroll Container for Header + Body */}
              <div className="flex-1 overflow-auto relative no-scrollbar">
                  
                  {/* Sticky Header Row */}
                  {!hideHeader && (
                      <div className="flex min-w-full sticky top-0 z-20 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-sm border-b border-gray-100 dark:border-white/5">
                          {/* Top-Left Corner (Sticky Left) */}
                          <div className="w-12 shrink-0 border-r border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1C1E] sticky left-0 z-30" /> 
                          
                          {/* Day Columns Header */}
                          <div className="flex flex-1 min-w-0">
                              {days.map((day, idx) => {
                                  const isToday = day.toDateString() === new Date().toDateString();
                                  return (
                                      <div key={idx} className="flex-1 min-w-0 p-2 text-center border-r border-gray-100 dark:border-white/5 last:border-0">
                                          <div className={`text-[9px] font-black uppercase truncate ${isToday ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                              {day.toLocaleDateString('ru-RU', { weekday: 'short' })}
                                          </div>
                                          <div className={`text-sm font-black ${isToday ? 'text-blue-600' : 'text-[#1C1C1E] dark:text-white'}`}>
                                              {day.getDate()}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  )}

                  {/* Grid Body */}
                  <div className="flex min-w-full relative">
                      {/* Time Labels Column (Sticky Left) */}
                      <div className="w-12 shrink-0 border-r border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1C1E] sticky left-0 z-10">
                          {hours.map(hour => (
                              <div key={hour} className="h-16 text-[9px] font-bold text-gray-400 dark:text-gray-600 text-center pt-2 relative">
                                  {hour}:00
                                  <div className="absolute top-0 right-0 w-2 h-[1px] bg-gray-200 dark:bg-white/10" />
                              </div>
                          ))}
                      </div>

                      {/* Day Columns Container */}
                      <div className="flex flex-1 relative min-w-0">
                          {/* Horizontal Grid Lines */}
                          <div className="absolute inset-0 flex flex-col pointer-events-none">
                              {hours.map(hour => (
                                  <div key={`line-${hour}`} className="h-16 border-b border-gray-50 dark:border-white/5 w-full" />
                              ))}
                          </div>

                          {/* Vertical Day Columns */}
                          {days.map((day, dIdx) => {
                              const dayEvents = getEventsForDate(day);
                              
                              return (
                                  <div key={dIdx} className="flex-1 min-w-0 relative border-r border-gray-50 dark:border-white/5 last:border-0">
                                      {/* Clickable Slots */}
                                      {hours.map(hour => (
                                          <div 
                                              key={`slot-${dIdx}-${hour}`}
                                              onClick={() => {
                                                  const dateStr = getLocalDateString(day);
                                                  const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                                                  setActiveEvent({ event: null, prefill: { date: dateStr, time: timeStr } });
                                              }}
                                              className="h-16 w-full cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
                                          />
                                      ))}

                                      {/* Events Overlay */}
                                      {dayEvents.map(ev => {
                                          const style = getEventStyle(ev);
                                          if (!style) return null;
                                          const isShort = (ev.duration || 1) < 1;
                                          
                                          return (
                                              <div 
                                                  key={ev.id}
                                                  onClick={(e) => { e.stopPropagation(); setActiveEvent({ event: ev }); }}
                                                  className="absolute left-0.5 right-0.5 rounded-lg p-1 cursor-pointer hover:brightness-95 transition-all overflow-hidden shadow-sm z-10 border"
                                                  style={style}
                                              >
                                                  <div className="flex flex-col h-full">
                                                      <span className="text-[9px] font-black leading-tight truncate opacity-90 dark:text-white">{ev.title}</span>
                                                      {!isShort && (
                                                          <div className="text-[8px] font-bold truncate opacity-70 dark:text-white/80">
                                                              {ev.time} ({ev.duration || 1}ч)
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderEventsList = (dateToRender: Date) => {
    // Collect ALL events for the month of dateToRender
    const targetMonth = dateToRender.getMonth();
    const targetYear = dateToRender.getFullYear();
    
    // Filter and sort events for the entire month
    const monthEvents = events
        .filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        })
        .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`).getTime();
            const dateB = new Date(`${b.date}T${b.time}`).getTime();
            return dateA - dateB;
        });

    // Group by date string
    const groupedEvents: Record<string, FamilyEvent[]> = {};
    monthEvents.forEach(e => {
        if (!groupedEvents[e.date]) groupedEvents[e.date] = [];
        groupedEvents[e.date].push(e);
    });

    const hasEvents = monthEvents.length > 0;

    return (
        <div className="space-y-4 pb-4">
             {!hasEvents ? (
                 <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] border border-dashed border-gray-200 dark:border-white/10 text-center">
                    <CalendarIcon size={24} className="text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">В этом месяце событий нет</p>
                    <button onClick={() => setActiveEvent({ event: null, prefill: { date: getLocalDateString(dateToRender) } })} className="mt-4 text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl">
                        Создать
                    </button>
                 </div>
             ) : (
                 Object.keys(groupedEvents).sort().map(dateStr => {
                     const dateObj = new Date(dateStr);
                     const isToday = new Date().toDateString() === dateObj.toDateString();
                     const dayEvents = groupedEvents[dateStr];

                     return (
                        <div key={dateStr} className="space-y-2">
                            {/* Day Header - Modified for alignment */}
                            <div className="sticky top-0 z-10 bg-[#F2F2F7]/95 dark:bg-black/95 backdrop-blur-sm py-3 px-2 flex items-baseline gap-2">
                                <span className={`text-base font-black ${isToday ? 'text-blue-500' : 'text-[#1C1C1E] dark:text-white'}`}>
                                    {dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                                </span>
                                <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                                    {dateObj.toLocaleDateString('ru-RU', { weekday: 'long' })}
                                </span>
                            </div>

                            {/* Events for this day */}
                            <div className="space-y-3">
                                {dayEvents.map(event => {
                                     const eventMembers = members.filter(m => event.memberIds.includes(m.id));
                                     const colors = getEventColors(event.memberIds);
                                     
                                     return (
                                        <div 
                                            key={event.id} 
                                            onClick={() => setActiveEvent({ event })} 
                                            // Removed hover:scale-[1.01], added active:scale-[0.99]
                                            className="p-5 rounded-[2rem] border shadow-sm active:scale-[0.99] transition-transform cursor-pointer relative overflow-hidden group"
                                            style={{ 
                                                background: colors.background === '#EFF6FF' ? 'var(--bg-card-default, white)' : colors.background, 
                                                borderColor: colors.borderColor === '#BFDBFE' ? 'transparent' : colors.borderColor 
                                            }}
                                        >
                                            <style>{`:root { --bg-card-default: white; } .dark { --bg-card-default: #1C1C1E; }`}</style>

                                            <div className="flex items-start gap-4">
                                                <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                                                    <div className="text-sm font-black text-[#1C1C1E] dark:text-white">{event.time}</div>
                                                    <div className="flex items-center gap-1 text-[9px] font-black bg-white/50 dark:bg-white/10 px-1.5 py-0.5 rounded-md" style={{ color: colors.indicator }}>
                                                        <Clock size={10} />
                                                        {event.duration ? `${event.duration}ч` : '1ч'}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0 pb-2">
                                                    <h4 className="font-black text-[15px] leading-tight text-[#1C1C1E] dark:text-white mb-1">{event.title}</h4>
                                                    {event.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{event.description}</p>}
                                                    
                                                    <div className="flex items-center justify-between mt-2">
                                                        <div className="flex -space-x-2">
                                                            {eventMembers.map(m => (
                                                                <div key={m.id} className="border-2 border-white dark:border-[#1C1C1E] rounded-[1rem] relative z-10">
                                                                    <MemberMarker member={m} size="sm" />
                                                                </div>
                                                            ))}
                                                            {eventMembers.length === 0 && <span className="text-[10px] text-gray-400 italic">Нет участников</span>}
                                                        </div>
                                                        {event.checklist && event.checklist.length > 0 && (
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-white/60 dark:bg-white/5 px-2 py-1 rounded-lg">
                                                                <span className={event.checklist.every(i => i.completed) ? 'text-green-500' : ''}>
                                                                    {event.checklist.filter(i => i.completed).length}/{event.checklist.length}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                     );
                                 })}
                            </div>
                        </div>
                     );
                 })
             )}
        </div>
    );
  };

  return (
    <div className="space-y-4 relative w-full flex flex-col">
      <AnimatePresence>
        {notification && <motion.div initial={{opacity:0,y:-20,x:'-50%'}} animate={{opacity:1,y:0,x:'-50%'}} exit={{opacity:0}} className={`fixed top-24 left-1/2 z-[600] px-6 py-3 rounded-full shadow-lg border backdrop-blur-md whitespace-nowrap ${notification.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-[#1C1C1E] dark:bg-white text-white dark:text-black border-transparent'}`}><span className="text-xs font-black uppercase tracking-widest">{notification.message}</span></motion.div>}
        {(isListening || isProcessingVoice) && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[700] bg-white/80 dark:bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center"><div className="bg-white dark:bg-[#1C1C1E] p-10 rounded-[3rem] shadow-2xl border dark:border-white/10 flex flex-col items-center gap-6"><div className="relative"><div className={`absolute inset-0 bg-blue-500/30 rounded-full blur-xl ${isListening ? 'animate-ping' : 'animate-pulse'}`} />{isListening ? <Mic size={56} className="text-blue-500 relative" /> : <BrainCircuit size={56} className="text-purple-500 relative animate-pulse" />}</div><div className="text-center"><p className="font-black text-xl text-[#1C1C1E] dark:text-white mb-2">{isListening ? 'Говорите...' : 'Анализирую...'}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-[200px]">Например: "Записаться к врачу завтра в 14:00"</p></div></div></motion.div>}
      </AnimatePresence>

      <div className="flex flex-col gap-4">
        {/* Single Row Header to match Budget tab height */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex-1 min-w-0 flex bg-gray-100/50 dark:bg-[#1C1C1E] p-1 rounded-2xl border border-white/50 dark:border-white/5 shadow-sm overflow-x-auto no-scrollbar">
            {(['month', 'week', 'day', 'list'] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === mode ? 'bg-white dark:bg-[#2C2C2E] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400'}`}>
                {mode === 'month' ? 'Месяц' : mode === 'week' ? 'Неделя' : mode === 'day' ? 'День' : 'Все'}
              </button>
            ))}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={startListening} className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-[#1C1C1E] text-blue-500 border dark:border-white/5'}`}><Mic size={22} /></button>
            <button onClick={() => setActiveEvent({ event: null, prefill: { date: getLocalDateString(selectedDate) } })} className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Plus size={24} strokeWidth={3} /></button>
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="flex flex-col h-[calc(100dvh-13rem)]">
            <div className="flex bg-white/50 dark:bg-white/5 p-1 rounded-2xl border dark:border-white/5 w-fit mb-4 shrink-0">
              <button onClick={() => setListFilter('upcoming')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${listFilter === 'upcoming' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}>Будущие</button>
              <button onClick={() => setListFilter('past')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${listFilter === 'past' ? 'bg-gray-400 text-white' : 'text-gray-400'}`}>Прошедшие</button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-4">
                {events
                .filter(e => {
                    const eDate = new Date(`${e.date}T${e.time}`);
                    const now = new Date();
                    return listFilter === 'upcoming' ? eDate >= now : eDate < now;
                })
                .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
                .map(event => {
                    const colors = getEventColors(event.memberIds);
                    return (
                        <div 
                            key={event.id} 
                            onClick={() => setActiveEvent({ event })} 
                            className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border dark:border-white/5 shadow-sm dark:shadow-none flex items-center gap-4 active:scale-95 transition-transform"
                            style={{ 
                                background: colors.background === '#EFF6FF' ? 'var(--bg-card-default, white)' : colors.background,
                                borderColor: colors.borderColor === '#BFDBFE' ? 'transparent' : colors.borderColor
                            }}
                        >
                            <style>{`:root { --bg-card-default: white; } .dark { --bg-card-default: #1C1C1E; }`}</style>
                            <div className="w-14 h-14 rounded-2xl bg-white/50 dark:bg-white/5 flex flex-col items-center justify-center border dark:border-white/5 shrink-0">
                                <span className="text-[9px] font-black uppercase leading-none mb-1" style={{ color: colors.indicator }}>{new Date(event.date).toLocaleDateString('ru-RU', {month:'short'})}</span>
                                <span className="text-xl font-black text-[#1C1C1E] dark:text-white leading-none">{new Date(event.date).getDate()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-[15px] truncate text-[#1C1C1E] dark:text-white">{event.title}</h4>
                                <div className="text-[10px] font-bold text-gray-400 flex items-center gap-2 mt-1">
                                    <span className="flex items-center gap-1"><Clock size={10}/> {event.time}</span>
                                    <span className="flex items-center gap-1 bg-white/50 dark:bg-white/10 text-blue-500 px-1.5 rounded-md"><Clock size={8}/> {event.duration || 1}ч</span>
                                    {event.checklist && event.checklist.length > 0 && <span className="bg-white/50 dark:bg-white/10 px-1.5 rounded text-[9px]">{event.checklist.filter(c=>c.completed).length}/{event.checklist.length}</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {events.length === 0 && <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase">Список пуст</div>}
            </div>
          </div>
        )}

        {viewMode === 'month' && (
            <div className="flex flex-col h-[calc(100dvh-13rem)]">
                <div className="bg-white dark:bg-[#1C1C1E] p-4 md:p-6 rounded-[2.5rem] shadow-soft dark:shadow-none border border-white dark:border-white/5 shrink-0 mb-2">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth()-1); setSelectedDate(d); }} className="p-2 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-full transition-colors"><ChevronLeft size={20} className="text-gray-400"/></button>
                        <span className="font-black text-sm uppercase tracking-widest text-[#1C1C1E] dark:text-white">{selectedDate.toLocaleDateString('ru-RU', {month:'long', year:'numeric'})}</span>
                        <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth()+1); setSelectedDate(d); }} className="p-2 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-full transition-colors"><ChevronRight size={20} className="text-gray-400"/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-y-4 gap-x-1 md:gap-x-2">
                        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d} className="text-center text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase">{d}</div>)}
                        {/* Empty cells for padding */}
                        {Array.from({ length: (new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay() + 6) % 7 }).map((_, i) => <div key={`pad-${i}`} />)}
                        
                        {monthDays.map((date) => {
                            const isSelected = date.toDateString() === selectedDate.toDateString();
                            const isToday = date.toDateString() === new Date().toDateString();
                            const dayEvents = getEventsForDate(date);
                            const hasEvents = dayEvents.length > 0;

                            // Collect all participant colors for this day's events
                            const dayDots: string[] = [];
                            dayEvents.forEach(ev => {
                                if (ev.memberIds.length > 0) {
                                    ev.memberIds.forEach(mId => {
                                        const m = members.find(mem => mem.id === mId);
                                        if (m) dayDots.push(m.color);
                                    });
                                } else {
                                    // Fallback for events with no members assigned
                                    dayDots.push('#9CA3AF'); 
                                }
                            });

                            return (
                                <button 
                                    key={date.toISOString()} 
                                    onClick={() => {
                                        handleDateSelect(date);
                                    }}
                                    className={`relative flex flex-col items-center justify-center h-10 w-full rounded-xl transition-all ${isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : isToday ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400' : 'text-[#1C1C1E] dark:text-white hover:bg-gray-50 dark:hover:bg-[#2C2C2E]'}`}
                                >
                                    <span className={`text-xs ${isSelected || isToday ? 'font-black' : 'font-bold'}`}>{date.getDate()}</span>
                                    {hasEvents && !isSelected && (
                                        <div className="absolute bottom-1.5 flex gap-0.5 justify-center px-1">
                                            {dayDots.slice(0, 4).map((color, i) => (
                                                <div key={i} className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                            ))}
                                            {dayDots.length > 4 && <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {/* Updated: Pass full month logic inside renderEventsList */}
                <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                    {renderEventsList(selectedDate)}
                </div>
            </div>
        )}

        {viewMode === 'week' && (
            <>
                <div className="flex justify-between items-center mb-4 px-2">
                     <span className="font-black text-xs uppercase tracking-widest text-gray-400">{selectedDate.toLocaleDateString('ru-RU', {month:'long'})}</span>
                     <div className="flex gap-1">
                        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-7); setSelectedDate(d); }} className="p-1.5 bg-gray-50 dark:bg-[#1C1C1E] rounded-lg"><ChevronLeft size={16} className="text-gray-400"/></button>
                        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+7); setSelectedDate(d); }} className="p-1.5 bg-gray-50 dark:bg-[#1C1C1E] rounded-lg"><ChevronRight size={16} className="text-gray-400"/></button>
                     </div>
                </div>
                {renderTimeGrid(weekDays)}
            </>
        )}

        {viewMode === 'day' && (
            <>
                <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] shadow-soft dark:shadow-none border border-white dark:border-white/5 text-center mb-4">
                    <div className="flex items-center justify-between">
                         <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); }} className="p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl"><ChevronLeft size={20} className="text-[#1C1C1E] dark:text-white"/></button>
                         <div className="flex flex-col items-center">
                             <span className="text-sm font-black text-gray-400 uppercase tracking-widest">{selectedDate.toLocaleDateString('ru-RU', {weekday:'long'})}</span>
                             <span className="text-4xl font-black text-[#1C1C1E] dark:text-white">{selectedDate.getDate()}</span>
                             <span className="text-sm font-bold text-blue-500 uppercase tracking-wide">{selectedDate.toLocaleDateString('ru-RU', {month:'long'})}</span>
                         </div>
                         <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); }} className="p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl"><ChevronRight size={20} className="text-[#1C1C1E] dark:text-white"/></button>
                    </div>
                </div>
                {/* Hide redundant header in day view */}
                {renderTimeGrid([selectedDate], true)}
            </>
        )}
      </div>

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
