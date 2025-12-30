
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, X, Trash2, Copy, Bookmark, Calendar, Clock, User, Check, Timer, Minus, History, FastForward, Mic, MicOff, Loader2, AlertCircle, Send, Sparkles, ListChecks, CheckCircle2, Circle, BrainCircuit } from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';
import { MemberMarker } from '../constants';
import EventModal from './EventModal';
import { GoogleGenAI } from "@google/genai";

interface FamilyPlansProps {
  events: FamilyEvent[];
  setEvents: (events: FamilyEvent[]) => void;
  settings: AppSettings;
  members: FamilyMember[];
  onSendToTelegram: (e: FamilyEvent) => Promise<boolean>;
}

type ViewMode = 'month' | 'week' | 'day' | 'list';
type ListFilter = 'upcoming' | 'past';

const ROW_HEIGHT = 80;

const FamilyPlans: React.FC<FamilyPlansProps> = ({ events, setEvents, settings, members, onSendToTelegram }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month'); 
  const [listFilter, setListFilter] = useState<ListFilter>('upcoming');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [activeEvent, setActiveEvent] = useState<{
    event: FamilyEvent | null;
    prefill?: { date: string; time: string; title?: string; memberIds?: string[] };
  } | null>(null);

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const handleSaveEvent = async (event: FamilyEvent) => {
    const isNew = !events.find(e => e.id === event.id);
    if (!isNew) {
      setEvents(events.map(e => e.id === event.id ? event : e));
    } else {
      setEvents([event, ...events]);
    }
    setActiveEvent(null);
  };

  const processVoiceWithGemini = async (text: string) => {
    setIsProcessingVoice(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const today = new Date().toISOString().split('T')[0];
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Today is ${today}. Parse this event description into JSON: "${text}".
        Fields needed: title, date (YYYY-MM-DD), time (HH:MM). Return JSON object ONLY.`,
        config: { responseMimeType: "application/json" }
      });

      let jsonText = response.text || '{}';
      const data = JSON.parse(jsonText);
      
      if (data.title) {
          setActiveEvent({
              event: null,
              prefill: {
                  title: data.title,
                  date: data.date || today,
                  time: data.time || '12:00',
              }
          });
          showNotify('Событие распознано!');
      } else {
          showNotify('Не удалось понять детали события', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotify(`Ошибка ИИ: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { showNotify('Ваш браузер не поддерживает голос', 'error'); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    try {
        const r = new SR();
        recognitionRef.current = r;
        r.lang = 'ru-RU';
        r.onstart = () => setIsListening(true);
        r.onend = () => { if (!isProcessingVoice) setIsListening(false); };
        r.onerror = () => setIsListening(false);
        r.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            if (transcript) processVoiceWithGemini(transcript);
        };
        r.start();
    } catch (e) { showNotify('Ошибка микрофона', 'error'); }
  };

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`).getTime();
      const dateTimeB = new Date(`${b.date}T${b.time}`).getTime();
      return dateTimeA - dateTimeB;
    });
  }, [events]);

  const filteredListEvents = useMemo(() => {
    const now = new Date().getTime();
    return sortedEvents.filter(event => {
      const eventTime = new Date(`${event.date}T${event.time}`).getTime();
      return listFilter === 'upcoming' ? eventTime >= now : eventTime < now;
    });
  }, [sortedEvents, listFilter]);

  const weekDays = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [selectedDate]);

  return (
    <div className="space-y-6 relative w-full h-full flex flex-col">
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className={`fixed top-24 left-1/2 z-[600] px-6 py-3 rounded-full shadow-lg border backdrop-blur-md ${notification.type === 'error' ? 'bg-red-500 text-white border-red-400' : 'bg-blue-600 text-white border-blue-400'}`}>
            <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
          </motion.div>
        )}
        {(isListening || isProcessingVoice) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[700] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center">
                <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className={`absolute inset-0 bg-blue-500/30 rounded-full blur-xl ${isListening ? 'animate-ping' : 'animate-pulse'}`} />
                        {isListening ? <Mic size={48} className="text-blue-500 relative z-10" /> : <BrainCircuit size={48} className="text-purple-500 relative z-10 animate-pulse" />}
                    </div>
                    <p className="font-black text-lg text-[#1C1C1E]">{isListening ? 'Говорите...' : 'Обрабатываю...'}</p>
                    <button onClick={() => { recognitionRef.current?.stop(); setIsListening(false); setIsProcessingVoice(false); }} className="text-xs font-bold text-gray-400 uppercase tracking-widest">Отмена</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-6 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4 px-1">
          <div className="flex bg-gray-100/50 p-1 rounded-2xl border border-white/50 shadow-sm overflow-hidden flex-nowrap shrink-0">
            {(['month', 'week', 'day', 'list'] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>
                {mode === 'month' ? 'Месяц' : mode === 'week' ? 'Неделя' : mode === 'day' ? 'День' : 'Список'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={startListening} className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-blue-500 border border-blue-100'}`}>
               {isListening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <button onClick={() => setActiveEvent({ event: null })} className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 ios-btn-active">
                <Plus size={24} strokeWidth={3} />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="flex bg-white/50 p-1 rounded-2xl border border-white self-start w-fit">
                <button onClick={() => setListFilter('upcoming')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${listFilter === 'upcoming' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400'}`}><FastForward size={14} /> Будущие</button>
                <button onClick={() => setListFilter('past')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${listFilter === 'past' ? 'bg-gray-400 text-white shadow-sm' : 'text-gray-400'}`}><History size={14} /> Прошедшие</button>
              </div>
              {filteredListEvents.length === 0 ? <div className="p-12 text-center text-gray-400">Нет планов</div> : filteredListEvents.map(event => (
                <EventCard key={event.id} event={event} members={members} settings={settings} onClick={() => setActiveEvent({ event })} />
              ))}
            </motion.div>
          )}

          {viewMode === 'day' && (
             <motion.div key="day" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-[2rem] shadow-sm border border-white mx-1">
                  <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ChevronLeft size={20}/></button>
                  <span className="font-black text-sm uppercase tracking-widest">{selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                  <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ChevronRight size={20}/></button>
                </div>
                <TimeGridView date={selectedDate} events={sortedEvents} settings={settings} members={members} onEdit={(ev) => setActiveEvent({ event: ev })} onGridClick={(h) => setActiveEvent({ event: null, prefill: { date: selectedDate.toISOString().split('T')[0], time: `${String(h).padStart(2, '0')}:00` } })} />
             </motion.div>
          )}

          {viewMode === 'week' && (
            <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
               <div className="flex items-center gap-2 px-1">
                 <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 7); setSelectedDate(d); }} className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm ios-btn-active"><ChevronLeft size={20} /></button>
                 <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar py-2 px-1">
                   {weekDays.map((d, i) => {
                      const isSelected = d.toDateString() === selectedDate.toDateString();
                      return (
                        <button key={i} onClick={() => setSelectedDate(new Date(d))} className={`flex-shrink-0 w-16 md:w-20 p-3 md:p-4 rounded-3xl border transition-all flex flex-col items-center shadow-sm ${isSelected ? 'bg-blue-500 text-white border-blue-500 scale-105' : 'bg-white text-[#1C1C1E] border-white'}`}>
                          <span className={`text-[9px] font-black uppercase ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>{d.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                          <span className="text-lg font-black">{d.getDate()}</span>
                        </button>
                      )
                   })}
                 </div>
                 <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 7); setSelectedDate(d); }} className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm ios-btn-active"><ChevronRight size={20} /></button>
               </div>
               <TimeGridView date={selectedDate} events={sortedEvents} settings={settings} members={members} onEdit={(ev) => setActiveEvent({ event: ev })} onGridClick={(h) => setActiveEvent({ event: null, prefill: { date: selectedDate.toISOString().split('T')[0], time: `${String(h).padStart(2, '0')}:00` } })} />
            </motion.div>
          )}

          {viewMode === 'month' && (
             <motion.div key="month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row gap-6 h-auto md:h-[calc(100vh-180px)]">
                <div className="flex-1 bg-white p-6 rounded-[2.5rem] shadow-soft border border-white flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4 px-1 shrink-0">
                    <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d); }} className="p-2 hover:bg-gray-50 rounded-full"><ChevronLeft size={20}/></button>
                    <span className="font-black text-xs uppercase tracking-widest">{selectedDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d); }} className="p-2 hover:bg-gray-50 rounded-full"><ChevronRight size={20}/></button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center mb-2 shrink-0">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (<span key={d} className="text-[10px] font-black text-gray-300 uppercase">{d}</span>))}</div>
                  <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 min-h-[300px]">
                    {(() => {
                      const year = selectedDate.getFullYear(); const month = selectedDate.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const firstDay = new Date(year, month, 1).getDay(); const offset = firstDay === 0 ? 6 : firstDay - 1;
                      const cells = []; for (let i = 0; i < offset; i++) cells.push(<div key={`empty-${i}`} />);
                      for (let d = 1; d <= daysInMonth; d++) {
                        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const dayEvents = sortedEvents.filter(e => e.date === ds);
                        const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
                        const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === month;
                        cells.push(
                            <button key={d} onClick={() => { setActiveEvent({ event: null, prefill: { date: ds, time: '12:00' } }); }} className={`w-full h-full flex flex-col items-center justify-center rounded-xl border transition-all ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50/50 border-transparent hover:bg-gray-100'}`} >
                                <span className={`text-[10px] font-black ${isToday ? 'text-blue-600' : ''}`}>{d}</span>
                                <div className="flex gap-0.5 mt-1 overflow-hidden px-1 h-1.5 w-full justify-center">
                                    {dayEvents.slice(0, 3).map(e => (<div key={e.id} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: members.find(m => m.id === (e.memberIds?.[0] || ''))?.color || '#8E8E93' }} />))}
                                </div>
                            </button>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>
                <div className="w-full md:w-80 space-y-4 overflow-y-auto no-scrollbar md:h-full shrink-0">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-2 sticky top-0 bg-[#EBEFF5] py-2 z-10">События в этом месяце</h3>
                  {sortedEvents.filter(e => e.date.startsWith(selectedDate.toISOString().slice(0,7))).length === 0 ? 
                      <div className="p-8 text-center bg-white rounded-[2rem] text-gray-300 font-black uppercase text-[10px] border border-dashed border-gray-200">
                          <p className="mb-2">Нет событий</p>
                          <button onClick={() => setActiveEvent({ event: null, prefill: { date: selectedDate.toISOString().split('T')[0], time: '12:00' } })} className="text-blue-500">Добавить +</button>
                      </div> : 
                      sortedEvents.filter(e => e.date.startsWith(selectedDate.toISOString().slice(0,7))).map(event => (<EventCard key={event.id} event={event} members={members} settings={settings} onClick={() => setActiveEvent({ event })} />))
                  }
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeEvent && (
          <EventModal
            event={activeEvent.event}
            prefill={activeEvent.prefill}
            members={members}
            onClose={() => setActiveEvent(null)}
            onSave={handleSaveEvent}
            onDelete={(id) => { setEvents(events.filter(e => e.id !== id)); setActiveEvent(null); }}
            onSendToTelegram={onSendToTelegram}
            templates={events.filter(e => e.isTemplate)}
            settings={settings}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const TimeGridView: React.FC<{ date: Date; events: FamilyEvent[]; settings: AppSettings; members: FamilyMember[]; onEdit: (ev: FamilyEvent) => void; onGridClick: (hour: number) => void; }> = ({ date, events, settings, members, onEdit, onGridClick }) => {
  const ds = date.toISOString().split('T')[0];
  const dayEvents = events.filter(e => e.date === ds);
  const start = settings.dayStartHour || 8; const end = settings.dayEndHour || 22;
  const hours = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return (
    <div className="bg-white rounded-[2.5rem] border border-white shadow-soft overflow-hidden flex relative">
      <div className="w-16 flex-shrink-0 border-r border-gray-50 pt-6">{hours.map(h => (<div key={h} className="h-20 flex flex-col items-center justify-start"><span className="text-[11px] font-black text-gray-300 uppercase tracking-tighter">{String(h).padStart(2, '0')}:00</span></div>))}</div>
      <div className="flex-1 relative pt-6" style={{ height: hours.length * ROW_HEIGHT + 40 }}>
        {hours.map(h => (<div key={h} className="relative h-20"><div className="absolute top-0 left-0 right-0 border-t border-gray-100" /><div className="absolute inset-0 hover:bg-blue-50/30 transition-colors cursor-crosshair z-0" onClick={() => onGridClick(h)} /></div>))}
        {dayEvents.map(event => {
          const [h, m] = event.time.split(':').map(Number); const dur = event.duration || 1;
          const top = ((h + m/60) - start) * ROW_HEIGHT + 6; const height = dur * ROW_HEIGHT;
          if (h < start || h > end) return null;
          const participants = members.filter(m => event.memberIds?.includes(m.id));
          const color = participants.length > 0 ? participants[0].color : '#8E8E93';
          return (
            <motion.div key={event.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onEdit(event); }} className={`absolute left-2 right-2 rounded-2xl p-3 flex flex-col justify-between overflow-hidden cursor-pointer shadow-sm border border-white/20 ios-btn-active z-10`} style={{ top, height: Math.max(height - 4, 30), background: participants.length > 1 ? `linear-gradient(135deg, ${participants.map(p => p.color).join(', ')})` : color, color: '#fff' }}>
              <div className="relative z-10 flex flex-col"><div className="flex justify-between items-start"><span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">{event.time}</span></div><h5 className="font-black text-xs leading-tight line-clamp-2">{event.title}</h5></div>
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] pointer-events-none" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const EventCard: React.FC<{ event: FamilyEvent; members: FamilyMember[]; settings: AppSettings; onClick: () => void; }> = ({ event, members, settings, onClick }) => {
  const participants = members.filter(m => event.memberIds?.includes(m.id));
  const date = new Date(event.date);
  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onClick} className={`bg-white p-5 rounded-[2rem] border border-white shadow-sm flex items-center gap-4 relative overflow-hidden`}>
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: participants.length > 1 ? `linear-gradient(to bottom, ${participants.map(p => p.color).join(', ')})` : (participants[0]?.color || '#8E8E93') }} />
      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex flex-col items-center justify-center border border-gray-100 flex-shrink-0"><span className="text-[10px] font-black text-blue-500 uppercase leading-none">{date.toLocaleDateString('ru-RU', { month: 'short' })}</span><span className="text-lg font-black leading-none">{date.getDate()}</span></div>
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-[15px] truncate" style={{ color: participants[0]?.color || '#1C1C1E' }}>{event.title}</h4>
        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-gray-400">
          <Clock size={10} /> {event.time} • {participants.length > 0 ? (participants.length === 1 ? participants[0].name : `${participants.length} уч.`) : 'Без уч.'}
        </div>
      </div>
    </motion.div>
  );
};

export default FamilyPlans;
