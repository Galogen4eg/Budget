

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FamilyEvent, AppSettings, FamilyMember } from '../types';
import EventModal from './EventModal';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from '../contexts/AuthContext';
import { saveFamilyPlanEvent, deleteFamilyPlanEvent, saveFamilyPlanOccurrence } from '../utils/db';
import { buildCalendarOccurrences } from '../utils/familyPlanEngine';
import { formatLocalCalendarDate } from '../utils/calendarDates';
import { dueCalendarNotifications, paymentAgenda } from '../utils/calendarReminders';
import FamilyAgendaPanel from './FamilyAgendaPanel';
import { toast } from 'sonner';
import { telegramReminderKey } from '../utils/calendarTelegram';
import { updateTelegramSchedule, disableTelegramSchedule, refreshFamilyTelegramSchedules, getTelegramScheduleStatus } from '../utils/calendarTelegramServer';
import { enableCalendarPush, disableCalendarPush, isCalendarPushRegisteredLocally } from '../utils/calendarPush';
import FamilyPlansMobile from './FamilyPlansMobile';
import FamilyPlansDesktop from './FamilyPlansDesktop';
import { filterEventsForCalendarMonth, parseLocalCalendarDate } from '../utils/calendarDates';

interface FamilyPlansProps {
  events: FamilyEvent[];
  setEvents: (events: FamilyEvent[] | ((prev: FamilyEvent[]) => FamilyEvent[])) => void;
  settings: AppSettings;
  members: FamilyMember[];
  onSendToTelegram: (e: FamilyEvent) => Promise<boolean>;
  onDeleteEvent?: (id: string) => Promise<void>;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenBudget?: () => void;
}

const FamilyPlans: React.FC<FamilyPlansProps> = ({ 
  events, 
  setEvents, 
  settings, 
  members, 
  onSendToTelegram, 
  onDeleteEvent,
  onOpenSettings,
  onOpenNotifications,
  onOpenBudget
}) => {
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [listTab, setListTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isDesktop, setIsDesktop] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  
  // Modal & Logic State
  const [activeEvent, setActiveEvent] = useState<{ event: FamilyEvent | null; prefill?: any } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { familyId, user } = useAuth();
  const [remindersEnabled,setRemindersEnabled]=useState(false);
  const [pushEnabled,setPushEnabled]=useState(false);
  const [telegramRemindersEnabled,setTelegramRemindersEnabled]=useState(false);
  const telegramSyncRef=useRef(false);
  const telegramPendingRef=useRef<null|(()=>Promise<void>)>(null);

  const apiKey = settings.geminiApiKey || process.env.API_KEY;

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
    if (!apiKey) {
        toast.error('API Key не настроен в настройках приложения');
        return;
    }
    
    setIsProcessingVoice(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const todayStr = getLocalDateString(new Date());
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
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

  // Recurring instances are view-only projections of saved family events.
  const visibleEvents = useMemo(() => {
    const first=new Date(currentDate.getFullYear(),currentDate.getMonth()-1,1);
    const last=new Date(currentDate.getFullYear(),currentDate.getMonth()+3,0);
    return buildCalendarOccurrences(events,formatLocalCalendarDate(first),formatLocalCalendarDate(last));
  },[events,currentDate]);

  const ownProfileId = members.find(member=>member.userId && member.userId===user?.uid)?.id;
  const reminderKey=`budget:foreground-reminders:${familyId||'none'}:${user?.uid||'none'}`;
  useEffect(()=>{
    setRemindersEnabled(localStorage.getItem(reminderKey)==='enabled');
    setPushEnabled(user?.uid ? isCalendarPushRegisteredLocally(user.uid) : false);
  },[reminderKey]);

  const telegramChatId=settings.telegramChatId?.trim()||'';
  const telegramConfigured=Boolean(settings.telegramBotToken?.trim()&&telegramChatId);
  const telegramKey=telegramReminderKey(familyId||'none',user?.uid||'none',telegramChatId||'none');
  useEffect(()=>{
    if(!user?.uid||!familyId)return;
    let cancelled=false;
    void getTelegramScheduleStatus().then(status=>{
      if(cancelled)return;
      setTelegramRemindersEnabled(status.enabled);
      if(status.enabled)localStorage.setItem(telegramKey,'enabled');
      else localStorage.removeItem(telegramKey);
    }).catch(error=>{
      if(!cancelled)console.warn('Telegram schedule status unavailable',error);
    });
    return ()=>{cancelled=true;};
  },[familyId,user?.uid,telegramKey]);

  const toggleTelegramReminders=async()=>{
    if(telegramRemindersEnabled){
      try{
        await disableTelegramSchedule();
        localStorage.removeItem(telegramKey);
        setTelegramRemindersEnabled(false);
        toast.info('Фоновые напоминания Telegram отключены.');
      }catch(error){
        toast.error(error instanceof Error?error.message:'Не удалось отключить расписание');
      }
      return;
    }
    if(!telegramConfigured){
      toast.error('Сначала настройте Telegram-бота и Chat ID.');
      onOpenSettings?.();
      return;
    }
    if(!familyId||!user?.uid)return;
    try{
      await updateTelegramSchedule({familyId,events,members,settings});
      localStorage.setItem(telegramKey,'enabled');
      setTelegramRemindersEnabled(true);
      toast.success('Напоминания Telegram сохранены на сервере, Budget можно закрывать.');
    }catch(error){
      toast.error(error instanceof Error?error.message:'Не удалось создать расписание');
    }
  };

  useEffect(()=>{
    if(!familyId||!user?.uid)return;
    // A second family member can edit shared plans while the first is offline.
    // Send a snapshot only when Firestore data changes; do not poll.
    const timer=window.setTimeout(()=>{
      telegramPendingRef.current=()=>telegramRemindersEnabled&&telegramConfigured
        ?updateTelegramSchedule({familyId,events,members,settings})
        :refreshFamilyTelegramSchedules({familyId,events,members,settings});
      if(telegramSyncRef.current)return;
      const drain=async()=>{
        telegramSyncRef.current=true;
        try{
          while(telegramPendingRef.current){
            const send=telegramPendingRef.current;
            telegramPendingRef.current=null;
            try{await send();}
            catch(error){console.warn('Telegram schedule synchronization failed',error);}
          }
        }finally{telegramSyncRef.current=false;}
      };
      void drain();
    },1200);
    return ()=>window.clearTimeout(timer);
  },[telegramRemindersEnabled,telegramConfigured,telegramKey,familyId,user?.uid,events,members,
    settings.telegramBotToken,settings.telegramChatId,settings.mandatoryExpenses,settings.manualPaidExpenses]);

  const enableReminders=async()=>{
    if(remindersEnabled){
      localStorage.removeItem(reminderKey);
      setRemindersEnabled(false);
      if(user?.uid){
        try{await disableCalendarPush(user.uid);setPushEnabled(false);}
        catch(error){toast.error('Не удалось отключить фоновые push на сервере. Проверьте подключение и повторите.');}
      }
      toast.info('Локальные напоминания отключены.');
      return;
    }
    if(typeof Notification!=='undefined'&&Notification.permission==='default'){
      try{await Notification.requestPermission();}catch(error){console.warn('Notification permission unavailable',error);}
    }
    localStorage.setItem(reminderKey,'enabled');
    setRemindersEnabled(true);
    if(!user?.uid) {
      toast.info('Напоминания включены при открытом Budget.');
      return;
    }
    try{
      const result=await enableCalendarPush(user.uid);
      setPushEnabled(result==='enabled');
      if(result==='enabled')toast.success('Фоновые push подключены на этом устройстве.');
      else if(result==='not-configured')toast.info('Локальные напоминания включены. Для push нужен VAPID-ключ Firebase.');
      else toast.info('Локальные напоминания включены. Фоновые push недоступны в этом браузере или запрещены.');
    }catch(error){
      console.warn('FCM device registration failed',error);
      toast.error('Локальные напоминания работают, но регистрацию push не удалось завершить.');
    }
  };

  useEffect(()=>{
    if(!remindersEnabled||pushEnabled||!familyId||!user)return;
    const tick=()=>{
      const now=new Date(),today=formatLocalCalendarDate(now);
      const end=new Date(now);end.setDate(end.getDate()+40);
      const future=buildCalendarOccurrences(events,today,formatLocalCalendarDate(end));
      const monthly=Array.from({length:3},(_,i)=>paymentAgenda(
        settings.mandatoryExpenses||[],new Date(now.getFullYear(),now.getMonth()+i,1),settings.manualPaidExpenses||{}
      ));
      // Browser timers can pause while the tab is in the background. Resume from
      // the last check, but avoid replaying notifications older than one hour.
      const checkedKey=`${reminderKey}:last-checked`;
      const previous=Number(localStorage.getItem(checkedKey));
      const since=Number.isFinite(previous)&&previous>0&&previous<=now.getTime()
        ?new Date(Math.max(previous,now.getTime()-3600000))
        :new Date(now.getTime()-120000);
      const due=dueCalendarNotifications([...future,...monthly.flat()],now,ownProfileId,since);
      localStorage.setItem(checkedKey,String(now.getTime()));
      const key=`${reminderKey}:seen`;
      let seen:string[]=[];
      try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))seen=saved;}catch{}
      const newItems=due.filter(item=>!seen.includes(item.id));
      if(newItems.length===0)return;
      for(const entry of newItems){
        try{
          if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
            new Notification('Budget: напоминание',{body:entry.title,tag:entry.id});
          }else toast.info('Напоминание: '+entry.title);
        }catch{toast.info('Напоминание: '+entry.title);}
      }
      localStorage.setItem(key,JSON.stringify([...seen,...newItems.map(item=>item.id)].slice(-250)));
    };
    tick();
    const interval=window.setInterval(tick,30000);
    const onFocus=()=>tick();
    window.addEventListener('focus',onFocus);
    return ()=>{window.clearInterval(interval);window.removeEventListener('focus',onFocus);};
  },[events,remindersEnabled,pushEnabled,familyId,user?.uid,ownProfileId,reminderKey,settings.mandatoryExpenses,settings.manualPaidExpenses]);

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
      month: month === 0 ? 11 : month - 1,
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
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      current: false
    }));

    return [...prevDays, ...currentDays, ...nextDays];
  }, [currentDate]);

  // --- Filtered Data ---
  const getEventsForDate = (d: Date) => {
      const dateStr = getLocalDateString(d);
      return visibleEvents.filter(e => e.date === dateStr);
  };

  const selectedDayEvents = useMemo(() => {
      const dayEvents = getEventsForDate(selectedDate);
      // Sort events by time ascending (08:00 before 12:00)
      return dayEvents.sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDate, visibleEvents]);

  const filteredListEvents = useMemo(
    () => filterEventsForCalendarMonth(visibleEvents, currentDate, listTab),
    [visibleEvents, listTab, currentDate]
  );

  const groupedListEvents = useMemo(() => {
    return filteredListEvents.reduce((groups, event) => {
        const d = parseLocalCalendarDate(event.date);
        const dateKey = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(event);
        return groups;
    }, {} as Record<string, FamilyEvent[]>);
  }, [filteredListEvents]);

  // --- Actions ---
  const handleSaveEvent=async (next:FamilyEvent)=>{
    if(!familyId)throw new Error('Семейный аккаунт недоступен');
    if(next.seriesId){
      const parent=events.find(e=>e.id===next.seriesId);
      if(!parent)throw new Error('Повторяющаяся серия удалена');
      await saveFamilyPlanOccurrence(familyId,parent,next.occurrenceDate||next.date,next);
    }else{
      const old=events.find(e=>e.id===next.id)||null;
      await saveFamilyPlanEvent(familyId,next,old);
    }
    setActiveEvent(null);
    toast.success('План сохранён');
    if(settings.autoSendEventsToTelegram)void onSendToTelegram(next);
  };

  const handleDeleteEvent=async (id:string,scope:'single'|'series'='series')=>{
    if(!familyId)throw new Error('Семейный аккаунт недоступен');
    const source=activeEvent?.event;
    const parentId=source?.seriesId||source?.id;
    if(source&&(source.seriesId||source.recurrence&&source.recurrence!=='none')&&scope==='single'&&parentId){
      const parent=events.find(e=>e.id===parentId);
      if(!parent)throw new Error('Серия уже удалена');
      await saveFamilyPlanOccurrence(familyId,parent,source.occurrenceDate||source.date,null);
    }else{
      const target=events.find(e=>e.id===(scope==='series'&&parentId?parentId:id));
      if(!target)throw new Error('Событие уже удалено');
      await deleteFamilyPlanEvent(familyId,target.id,target);
    }
    setActiveEvent(null);
    toast.success('Событие удалено');
  };

  const handleUpdateEvent=async (next:FamilyEvent)=>{
    if(!familyId)throw new Error('Семейный аккаунт недоступен');
    if(next.seriesId){
      const parent=events.find(e=>e.id===next.seriesId);
      if(!parent)throw new Error('Серия удалена');
      await saveFamilyPlanOccurrence(familyId,parent,next.occurrenceDate||next.date,next);
      return;
    }
    const old=events.find(e=>e.id===next.id)||null;
    await saveFamilyPlanEvent(familyId,next,old);
  };

  const handleToggleTask=async (task:FamilyEvent)=>{
    if(!familyId)throw new Error('Семейный аккаунт недоступен');
    const updated={...task,completed:!task.completed,completedAt:!task.completed?new Date().toISOString():undefined};
    if(task.seriesId||task.recurrence&&task.recurrence!=='none'){
      const baseId=task.seriesId||task.id;
      const base=events.find(e=>e.id===baseId);
      if(!base)throw new Error('Серия удалена');
      await saveFamilyPlanOccurrence(familyId,base,task.occurrenceDate||task.date,updated);
    }else{
      await saveFamilyPlanEvent(familyId,updated,events.find(e=>e.id===task.id)||null);
    }
  };

  const commonProps = {
      events:visibleEvents,
      members,
      settings,
      currentDate,
      setCurrentDate,
      selectedDate,
      setSelectedDate,
      viewMode,
      setViewMode,
      listTab,
      setListTab,
      calendarData,
      selectedDayEvents,
      onOpenEvent: (event: FamilyEvent | null | undefined, prefill?: any) => setActiveEvent({ event: event || null, prefill }),
      isListening,
      isProcessingVoice,
      startListening,
      onSendToTelegram,
      onUpdateEvent: handleUpdateEvent,
      onOpenSettings,
      onOpenNotifications
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-y-contain touch-pan-y md:overflow-hidden" data-testid="plans-scroll-container">
      <FamilyAgendaPanel events={events} members={members}
        onOpenEvent={(event,prefill)=>setActiveEvent({event:event||null,prefill})}
        onToggleTask={handleToggleTask}
        onEnableReminders={()=>void enableReminders()}
        remindersEnabled={remindersEnabled}
        pushEnabled={pushEnabled}
        telegramRemindersEnabled={telegramRemindersEnabled}
        telegramConfigured={telegramConfigured}
        onToggleTelegramReminders={toggleTelegramReminders}/>
        <div className="flex-none min-h-0 md:flex-1 md:overflow-hidden">
        {isDesktop ? (
            <FamilyPlansDesktop 
                {...commonProps} 
            />
        ) : (
            <FamilyPlansMobile 
                {...commonProps}
                groupedListEvents={groupedListEvents}
            />
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
                allEvents={events} // Pass all events for conflict detection
            />
            )}
        </AnimatePresence>
    </div>
  );
};

export default FamilyPlans;