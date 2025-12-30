
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, X, Trash2, Calendar, Clock, Mic, MicOff, BrainCircuit, FastForward, History } from 'lucide-react';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';
import EventModal from './EventModal';
import { GoogleGenAI } from "@google/genai";

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

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const processVoiceWithGemini = async (text: string) => {
    if (!process.env.API_KEY) {
        showNotify('API Key не настроен', 'error');
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

      const data = JSON.parse(response.text || '{}');
      if (data.title) {
          setActiveEvent({ event: null, prefill: { title: data.title, date: data.date || today, time: data.time || '12:00' } });
          showNotify('Событие распознано!');
      } else {
          showNotify('Не удалось понять детали', 'error');
      }
    } catch (err) {
      showNotify('Ошибка AI', 'error');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { showNotify('Голос не поддерживается', 'error'); return; }
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
    } catch (e) { showNotify('Ошибка микрофона', 'error'); }
  };

  const sortedEvents = useMemo(() => [...events].sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()), [events]);

  return (
    <div className="space-y-6 relative w-full h-full flex flex-col">
      <AnimatePresence>
        {notification && <motion.div initial={{opacity:0,y:-20,x:'-50%'}} animate={{opacity:1,y:0,x:'-50%'}} exit={{opacity:0}} className={`fixed top-24 left-1/2 z-[600] px-6 py-3 rounded-full shadow-lg border backdrop-blur-md ${notification.type === 'error' ? 'bg-red-50 text-white' : 'bg-blue-600 text-white'}`}><span className="text-xs font-black uppercase tracking-widest">{notification.message}</span></motion.div>}
        {(isListening || isProcessingVoice) && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[700] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center"><div className="bg-white p-8 rounded-[3rem] shadow-2xl border flex flex-col items-center gap-4"><div className="relative"><div className={`absolute inset-0 bg-blue-500/30 rounded-full blur-xl ${isListening ? 'animate-ping' : 'animate-pulse'}`} />{isListening ? <Mic size={48} className="text-blue-500 relative" /> : <BrainCircuit size={48} className="text-purple-500 relative animate-pulse" />}</div><p className="font-black text-lg text-[#1C1C1E]">{isListening ? 'Говорите...' : 'Обрабатываю...'}</p></div></motion.div>}
      </AnimatePresence>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 px-1">
          <div className="flex bg-gray-100/50 p-1 rounded-2xl border border-white/50 shadow-sm overflow-x-auto no-scrollbar shrink-0">
            {(['month', 'week', 'list'] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>
                {mode === 'month' ? 'Месяц' : mode === 'week' ? 'Неделя' : 'Список'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={startListening} className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-blue-500 border'}`}><Mic size={22} /></button>
            <button onClick={() => setActiveEvent({ event: null })} className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><Plus size={24} strokeWidth={3} /></button>
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="space-y-4">
            <div className="flex bg-white/50 p-1 rounded-2xl border w-fit">
              <button onClick={() => setListFilter('upcoming')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${listFilter === 'upcoming' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}>Будущие</button>
              <button onClick={() => setListFilter('past')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${listFilter === 'past' ? 'bg-gray-400 text-white' : 'text-gray-400'}`}>Прошедшие</button>
            </div>
            {sortedEvents.map(event => <div key={event.id} onClick={() => setActiveEvent({ event })} className="bg-white p-5 rounded-[2rem] border shadow-sm flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-gray-50 flex flex-col items-center justify-center border shrink-0"><span className="text-[10px] font-black text-blue-500 uppercase leading-none">{new Date(event.date).toLocaleDateString('ru-RU', {month:'short'})}</span><span className="text-lg font-black">{new Date(event.date).getDate()}</span></div><div className="flex-1 min-w-0"><h4 className="font-black text-[15px] truncate">{event.title}</h4><div className="text-[10px] font-bold text-gray-400"><Clock size={10} className="inline mr-1"/>{event.time}</div></div></div>)}
          </div>
        )}

        {viewMode === 'month' && (
            <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth()-1); setSelectedDate(d); }} className="p-2"><ChevronLeft size={20}/></button>
                    <span className="font-black text-sm uppercase tracking-widest">{selectedDate.toLocaleDateString('ru-RU', {month:'long', year:'numeric'})}</span>
                    <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth()+1); setSelectedDate(d); }} className="p-2"><ChevronRight size={20}/></button>
                </div>
                <div className="grid grid-cols-7 gap-2 h-[300px]">
                    {Array.from({length: 31}).map((_, i) => (<button key={i} className="flex flex-col items-center justify-center rounded-xl bg-gray-50/50 border border-transparent"><span className="text-[10px] font-black">{i+1}</span></button>))}
                </div>
            </div>
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
              
              // Note: Explicit auto-sending to Telegram for new events
              // The App.tsx wrapper handles this generally, but we can also ensure it here.
              setActiveEvent(null); 
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
