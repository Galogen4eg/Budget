
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';
import EventModal from './EventModal';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem } from '../utils/db';
import { toast } from 'sonner';
import FamilyPlansMobile from './FamilyPlansMobile';
import FamilyPlansDesktop from './FamilyPlansDesktop';

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
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Modal & Logic State
  const [activeEvent, setActiveEvent] = useState<{ event: FamilyEvent | null; prefill?: any } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { familyId } = useAuth();

  // Responsive Check
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
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

  // --- Calendar Data ---
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

  // --- Filtered Data ---
  const getEventsForDate = (d: Date) => {
      const dateStr = getLocalDateString(d);
      return events.filter(e => e.date === dateStr);
  };

  const selectedDayEvents = useMemo(() => {
      const dayEvents = getEventsForDate(selectedDate);
      // Sort events by time ascending (08:00 before 12:00)
      return dayEvents.sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDate, events]);

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

  // --- Actions ---
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

  const commonProps = {
      events,
      members,
      settings,
      currentDate,
      setCurrentDate,
      selectedDate,
      setSelectedDate,
      calendarData,
      selectedDayEvents,
      onOpenEvent: (event: FamilyEvent | null | undefined, prefill?: any) => setActiveEvent({ event: event || null, prefill }),
      isListening,
      isProcessingVoice,
      startListening,
      onSendToTelegram // Pass this down
  };

  return (
    <>
        {isDesktop ? (
            <FamilyPlansDesktop 
                {...commonProps} 
            />
        ) : (
            <FamilyPlansMobile 
                {...commonProps}
                viewMode={viewMode}
                setViewMode={setViewMode}
                listTab={listTab}
                setListTab={setListTab}
                groupedListEvents={groupedListEvents}
            />
        )}

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
                allEvents={events} // Pass all events for conflict detection
            />
            )}
        </AnimatePresence>
    </>
  );
};

export default FamilyPlans;
