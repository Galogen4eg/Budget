
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, Clock, Mic, BrainCircuit, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';
import EventModal from './EventModal';
import { GoogleGenAI } from "@google/genai";
import { MemberMarker } from '../constants';

interface FamilyPlansProps {
  events: FamilyEvent[];
  setEvents: (events: FamilyEvent[] | ((prev: FamilyEvent[]) => FamilyEvent[])) => void;
  settings: AppSettings;
  members: FamilyMember[];
  onSendToTelegram: (e: FamilyEvent) => Promise<boolean>;
}

type ViewMode = 'month' | 'week' | 'day' | 'list';
type ListFilter = 'upcoming' | 'past';

const FamilyPlans: React.FC<FamilyPlansProps> = ({ events, setEvents, settings, members, onSendToTelegram }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month'); 
  const [listFilter, setListFilter] = useState<ListFilter>('upcoming');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeEvent, setActiveEvent] = useState<{ event: FamilyEvent | null; prefill?: any } | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Time grid configuration from settings or defaults
  const startHour = settings.dayStartHour ?? 8;
  const endHour = settings.dayEndHour ?? 22;
  const hours = useMemo(() => Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i), [startHour, endHour]);

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const processVoiceWithGemini = async (text: string) => {
    if (!process.env.API_KEY) {
        showNotify('API Key не настроен в .env', 'error');
        return;
    }
    
    setIsProcessingVoice(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const today = new Date().toISOString().split('T')[0];
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Today is ${today}. Parse this event: "${text}". JSON ONLY: { "title": string, "date": "YYYY-MM-DD", "time": "HH:MM" }.`,
        config: { responseMimeType: "application/json" }
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Пустой ответ от AI");

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
            console.error("Speech Error:", e);
            showNotify(`Ошибка микрофона: ${e.error}`, 'error');
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
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  };

  const getEventStyle = (event: FamilyEvent) => {
      const [h, m] = event.time.split(':').map(Number);
      if (h < startHour || h > endHour) return null; // Event out of view bounds (simplified)
      
      const startMinutes = (h - startHour) * 60 + m;
      const durationMinutes = (event.duration || 1) * 60;
      
      // Calculate pixels (assuming 60px per hour height)
      const top = (startMinutes / 60) * 64; // 64px is height of hour row (h-16)
      const height = (durationMinutes / 60) * 64;
      
      return { top: `${top}px`, height: `${height}px` };
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

  const renderTimeGrid = (days: Date[]) => {
      const hourHeight = 64; // h-16
      
      return (
          <div className="flex flex-col h-[600px] bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden relative">
              {/* Header Days */}
              <div className="flex border-b border-gray-100 bg-gray-50/50 shrink-0 z-10 sticky top-0">
                  <div className="w-12 shrink-0 border-r border-gray-100 bg-white" /> {/* Time column header */}
                  <div className="flex flex-1 overflow-x-auto no-scrollbar">
                      {days.map((day, idx) => {
                          const isToday = day.toDateString() === new Date().toDateString();
                          return (
                              <div key={idx} className="flex-1 min-w-[80px] p-2 text-center border-r border-gray-100 last:border-0">
                                  <div className={`text-[9px] font-black uppercase ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>
                                      {day.toLocaleDateString('ru-RU', { weekday: 'short' })}
                                  </div>
                                  <div className={`text-sm font-black ${isToday ? 'text-blue-600' : 'text-[#1C1C1E]'}`}>
                                      {day.getDate()}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* Time Grid Body */}
              <div className="flex-1 overflow-y-auto no-scrollbar relative">
                  <div className="flex min-h-full">
                      {/* Time Labels Column */}
                      <div className="w-12 shrink-0 border-r border-gray-100 bg-white z-10 sticky left-0">
                          {hours.map(hour => (
                              <div key={hour} className="h-16 text-[9px] font-bold text-gray-400 text-center pt-2 relative">
                                  {hour}:00
                                  <div className="absolute top-0 right-0 w-2 h-[1px] bg-gray-200" />
                              </div>
                          ))}
                      </div>

                      {/* Columns Container */}
                      <div className="flex flex-1 relative">
                          {/* Grid Lines Background */}
                          <div className="absolute inset-0 flex flex-col">
                              {hours.map(hour => (
                                  <div key={`line-${hour}`} className="h-16 border-b border-gray-50 w-full" />
                              ))}
                          </div>

                          {days.map((day, dIdx) => {
                              const dayEvents = getEventsForDate(day);
                              
                              return (
                                  <div key={dIdx} className="flex-1 min-w-[80px] relative border-r border-gray-50 last:border-0">
                                      {/* Clickable Slots */}
                                      {hours.map(hour => (
                                          <div 
                                              key={`slot-${dIdx}-${hour}`}
                                              onClick={() => {
                                                  const dateStr = day.toISOString().split('T')[0];
                                                  const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                                                  setActiveEvent({ event: null, prefill: { date: dateStr, time: timeStr } });
                                              }}
                                              className="h-16 w-full cursor-pointer hover:bg-blue-50/30 transition-colors"
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
                                                  className="absolute left-1 right-1 rounded-lg bg-blue-100/90 border border-blue-200 p-1 cursor-pointer hover:brightness-95 transition-all overflow-hidden shadow-sm z-10"
                                                  style={style}
                                              >
                                                  <div className="flex flex-col h-full">
                                                      <span className="text-[9px] font-black text-blue-700 leading-tight truncate">{ev.title}</span>
                                                      {!isShort && (
                                                          <div className="text-[8px] text-blue-500 font-bold truncate">
                                                              {ev.time}
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
    const daysEvents = getEventsForDate(dateToRender);
    const isToday = new Date().toDateString() === dateToRender.toDateString();

    return (
        <div className="space-y-3 mt-4">
             <div className="flex items-center gap-2 mb-2 px-2">
                <h3 className="font-black text-lg text-[#1C1C1E]">
                    {isToday ? 'Сегодня, ' : ''}
                    {dateToRender.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </h3>
                <span className="bg-gray-100 text-gray-400 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
                    {daysEvents.length}
                </span>
             </div>

             {daysEvents.length === 0 ? (
                 <div className="flex flex-col items-center justify-center p-8 bg-white rounded-[2.5rem] border border-dashed border-gray-200 text-center">
                    <CalendarIcon size={24} className="text-gray-300 mb-2" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Нет событий</p>
                    <button onClick={() => setActiveEvent({ event: null, prefill: { date: dateToRender.toISOString().split('T')[0] } })} className="mt-4 text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl">
                        Создать
                    </button>
                 </div>
             ) : (
                 daysEvents.map(event => {
                     const eventMembers = members.filter(m => event.memberIds.includes(m.id));
                     return (
                        <div key={event.id} onClick={() => setActiveEvent({ event })} className="bg-white p-5 rounded-[2rem] border shadow-sm hover:scale-[1.01] transition-transform cursor-pointer relative overflow-hidden group">
                            <div className="flex items-start gap-4">
                                <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                                    <div className="text-sm font-black text-[#1C1C1E]">{event.time}</div>
                                    <div className="text-[10px] font-bold text-gray-400">{event.duration ? `${event.duration}ч` : '1ч'}</div>
                                    <div className={`w-0.5 h-full bg-gray-100 rounded-full mt-1 group-hover:bg-blue-200 transition-colors`}/>
                                </div>
                                <div className="flex-1 min-w-0 pb-2">
                                    <h4 className="font-black text-[15px] leading-tight text-[#1C1C1E] mb-1">{event.title}</h4>
                                    {event.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{event.description}</p>}
                                    
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex -space-x-2">
                                            {eventMembers.map(m => (
                                                <div key={m.id} className="border-2 border-white rounded-[1rem] relative z-10">
                                                    <MemberMarker member={m} size="sm" />
                                                </div>
                                            ))}
                                            {eventMembers.length === 0 && <span className="text-[10px] text-gray-400 italic">Нет участников</span>}
                                        </div>
                                        {event.checklist && event.checklist.length > 0 && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
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
                 })
             )}
        </div>
    );
  };

  return (
    <div className="space-y-6 relative w-full h-full flex flex-col pb-20">
      <AnimatePresence>
        {notification && <motion.div initial={{opacity:0,y:-20,x:'-50%'}} animate={{opacity:1,y:0,x:'-50%'}} exit={{opacity:0}} className={`fixed top-24 left-1/2 z-[600] px-6 py-3 rounded-full shadow-lg border backdrop-blur-md whitespace-nowrap ${notification.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-[#1C1C1E] text-white border-transparent'}`}><span className="text-xs font-black uppercase tracking-widest">{notification.message}</span></motion.div>}
        {(isListening || isProcessingVoice) && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[700] bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center"><div className="bg-white p-10 rounded-[3rem] shadow-2xl border flex flex-col items-center gap-6"><div className="relative"><div className={`absolute inset-0 bg-blue-500/30 rounded-full blur-xl ${isListening ? 'animate-ping' : 'animate-pulse'}`} />{isListening ? <Mic size={56} className="text-blue-500 relative" /> : <BrainCircuit size={56} className="text-purple-500 relative animate-pulse" />}</div><div className="text-center"><p className="font-black text-xl text-[#1C1C1E] mb-2">{isListening ? 'Говорите...' : 'Анализирую...'}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-[200px]">Например: "Записаться к врачу завтра в 14:00"</p></div></div></motion.div>}
      </AnimatePresence>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 px-1">
          <div className="flex bg-gray-100/50 p-1 rounded-2xl border border-white/50 shadow-sm overflow-x-auto no-scrollbar shrink-0">
            {(['month', 'week', 'day', 'list'] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>
                {mode === 'month' ? 'Месяц' : mode === 'week' ? 'Неделя' : mode === 'day' ? 'День' : 'Все'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={startListening} className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-blue-500 border'}`}><Mic size={22} /></button>
            <button onClick={() => setActiveEvent({ event: null, prefill: { date: selectedDate.toISOString().split('T')[0] } })} className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Plus size={24} strokeWidth={3} /></button>
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="space-y-4">
            <div className="flex bg-white/50 p-1 rounded-2xl border w-fit">
              <button onClick={() => setListFilter('upcoming')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${listFilter === 'upcoming' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}>Будущие</button>
              <button onClick={() => setListFilter('past')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${listFilter === 'past' ? 'bg-gray-400 text-white' : 'text-gray-400'}`}>Прошедшие</button>
            </div>
            {events
              .filter(e => {
                  const eDate = new Date(`${e.date}T${e.time}`);
                  const now = new Date();
                  return listFilter === 'upcoming' ? eDate >= now : eDate < now;
              })
              .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
              .map(event => (
                <div key={event.id} onClick={() => setActiveEvent({ event })} className="bg-white p-5 rounded-[2rem] border shadow-sm flex items-center gap-4 active:scale-95 transition-transform">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex flex-col items-center justify-center border shrink-0">
                        <span className="text-[9px] font-black text-blue-500 uppercase leading-none mb-1">{new Date(event.date).toLocaleDateString('ru-RU', {month:'short'})}</span>
                        <span className="text-xl font-black text-[#1C1C1E] leading-none">{new Date(event.date).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-black text-[15px] truncate text-[#1C1C1E]">{event.title}</h4>
                        <div className="text-[10px] font-bold text-gray-400 flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1"><Clock size={10}/> {event.time}</span>
                            {event.checklist && event.checklist.length > 0 && <span className="bg-gray-100 px-1.5 rounded text-[9px]">{event.checklist.filter(c=>c.completed).length}/{event.checklist.length}</span>}
                        </div>
                    </div>
                </div>
            ))}
            {events.length === 0 && <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase">Список пуст</div>}
          </div>
        )}

        {viewMode === 'month' && (
            <>
                <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth()-1); setSelectedDate(d); }} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ChevronLeft size={20} className="text-gray-400"/></button>
                        <span className="font-black text-sm uppercase tracking-widest text-[#1C1C1E]">{selectedDate.toLocaleDateString('ru-RU', {month:'long', year:'numeric'})}</span>
                        <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth()+1); setSelectedDate(d); }} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ChevronRight size={20} className="text-gray-400"/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d} className="text-center text-[9px] font-black text-gray-300 uppercase">{d}</div>)}
                        {/* Empty cells for padding */}
                        {Array.from({ length: (new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay() + 6) % 7 }).map((_, i) => <div key={`pad-${i}`} />)}
                        
                        {monthDays.map((date) => {
                            const isSelected = date.toDateString() === selectedDate.toDateString();
                            const isToday = date.toDateString() === new Date().toDateString();
                            const dayEvents = getEventsForDate(date);
                            const hasEvents = dayEvents.length > 0;

                            return (
                                <button 
                                    key={date.toISOString()} 
                                    onClick={() => handleDateSelect(date)}
                                    className={`relative flex flex-col items-center justify-center h-10 w-full rounded-xl transition-all ${isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : isToday ? 'bg-blue-50 text-blue-500' : 'text-[#1C1C1E] hover:bg-gray-50'}`}
                                >
                                    <span className={`text-xs ${isSelected || isToday ? 'font-black' : 'font-bold'}`}>{date.getDate()}</span>
                                    {hasEvents && !isSelected && (
                                        <div className="absolute bottom-1.5 flex gap-0.5">
                                            <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                                            {dayEvents.length > 1 && <div className="w-1 h-1 rounded-full bg-blue-500/50" />}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {renderEventsList(selectedDate)}
            </>
        )}

        {viewMode === 'week' && (
            <>
                <div className="flex justify-between items-center mb-4 px-2">
                     <span className="font-black text-xs uppercase tracking-widest text-gray-400">{selectedDate.toLocaleDateString('ru-RU', {month:'long'})}</span>
                     <div className="flex gap-1">
                        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-7); setSelectedDate(d); }} className="p-1.5 bg-gray-50 rounded-lg"><ChevronLeft size={16} className="text-gray-400"/></button>
                        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+7); setSelectedDate(d); }} className="p-1.5 bg-gray-50 rounded-lg"><ChevronRight size={16} className="text-gray-400"/></button>
                     </div>
                </div>
                {renderTimeGrid(weekDays)}
            </>
        )}

        {viewMode === 'day' && (
            <>
                <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white text-center mb-4">
                    <div className="flex items-center justify-between">
                         <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); }} className="p-3 bg-gray-50 rounded-2xl"><ChevronLeft size={20}/></button>
                         <div className="flex flex-col items-center">
                             <span className="text-sm font-black text-gray-400 uppercase tracking-widest">{selectedDate.toLocaleDateString('ru-RU', {weekday:'long'})}</span>
                             <span className="text-4xl font-black text-[#1C1C1E]">{selectedDate.getDate()}</span>
                             <span className="text-sm font-bold text-blue-500 uppercase tracking-wide">{selectedDate.toLocaleDateString('ru-RU', {month:'long'})}</span>
                         </div>
                         <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); }} className="p-3 bg-gray-50 rounded-2xl"><ChevronRight size={20}/></button>
                    </div>
                </div>
                {renderTimeGrid([selectedDate])}
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
            onSave={e => { 
              setEvents(prev => {
                const updated = Array.isArray(prev) ? [...prev] : [];
                const existingIndex = updated.findIndex(ev => ev.id === e.id);
                if (existingIndex > -1) {
                  updated[existingIndex] = e;
                } else {
                  updated.push(e);
                }
                return updated;
              }); 
              setActiveEvent(null); 
              if (settings.autoSendEventsToTelegram) onSendToTelegram(e);
            }} 
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
