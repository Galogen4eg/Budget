import { FILTER_RAIL, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_IDLE } from './filterUiTokens';
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { agendaDisclosureTransition } from '../utils/uiMotion';
import { CalendarDays, CircleCheck, Circle, Download, Bell, Send, Plus, Repeat2, ListTodo, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { FamilyEvent, FamilyMember } from '../types';
import { formatLocalCalendarDate } from '../utils/calendarDates';
import { upcomingAgenda, buildCalendarOccurrences } from '../utils/familyPlanEngine';
import { makeCalendarICS } from '../utils/calendarExport';

interface Props {
 events: FamilyEvent[];
 members: FamilyMember[];
 onOpenEvent:(event?:FamilyEvent|null,prefill?:Record<string,unknown>)=>void;
 onToggleTask:(event:FamilyEvent)=>Promise<void>;
 onEnableReminders:()=>void;
 remindersEnabled:boolean;
 pushEnabled?:boolean;
 telegramRemindersEnabled?:boolean;
 telegramConfigured?:boolean;
 onToggleTelegramReminders?:()=>void;
}
type View='today'|'week'|'month'|'tasks';
export const FamilyAgendaPanel:React.FC<Props>=({
 events,members,onOpenEvent,onToggleTask,onEnableReminders,remindersEnabled,pushEnabled=false,telegramRemindersEnabled=false,telegramConfigured=false,onToggleTelegramReminders
})=>{
 const [view,setView]=useState<View>('week');
 const [expanded,setExpanded]=useState(false);
 const contentRef=React.useRef<HTMLDivElement|null>(null);
 const reduceMotion=useReducedMotion();
 const panelOpen=expanded;
 useEffect(()=>{
   if(contentRef.current) contentRef.current.inert=!panelOpen;
 },[panelOpen]);
 const [savingId,setSavingId]=useState<string|null>(null);
 const [today,setToday]=useState(()=>formatLocalCalendarDate(new Date()));
 useEffect(()=>{
   const id=window.setInterval(()=>{
     const current=formatLocalCalendarDate(new Date());
     setToday(previous=>previous===current?previous:current);
   },60000);
   return ()=>window.clearInterval(id);
 },[]);
 const agenda=useMemo(()=>{
  const count=view==='today'?1:view==='week'?7:30;
  const raw=upcomingAgenda(events,today,count);
  // Keep overdue tasks visible in the Tasks tab instead of losing them at midnight.
  const pastFrom=new Date();pastFrom.setDate(pastFrom.getDate()-30);
  const overdue=view==='tasks'
    ?buildCalendarOccurrences(events,formatLocalCalendarDate(pastFrom),formatLocalCalendarDate(new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()-1)))
      .filter(e=>e.kind==='task'&&!e.completed)
    :[];
  const all=[...overdue,...raw];
  return all.filter(x=>view==='tasks'?x.kind==='task':true)
   .sort((a,b)=>(a.date+' '+a.time).localeCompare(b.date+' '+b.time)).slice(0,60);
 },[events,today,view]);
 const exportICS=()=>{
  const ics=makeCalendarICS(events);
  const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));
  const a=document.createElement('a');
  a.href=url;a.download='budget-family-calendar.ics';
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const memberNames=(event:FamilyEvent)=>event.memberIds.length
  ?event.memberIds.map(id=>members.find(member=>member.id===id)?.name).filter(Boolean).join(', ')
  :'Общее дело';
 const toggle=async(event:FamilyEvent)=>{
  if(savingId)return;
  setSavingId(event.id);
  try{await onToggleTask(event);}catch(error){
   toast.error(error instanceof Error?error.message:'Не удалось обновить задачу');
  }finally{setSavingId(null);}
 };
 return <section className="border-b border-[var(--terra-border)] dark:border-white/10 bg-[var(--terra-surface)] dark:bg-[var(--terra-surface)] px-3 sm:px-5 py-2.5 space-y-2 shrink-0">
  <div className="flex items-center justify-between flex-wrap gap-2">
   <button type="button" onClick={()=>setExpanded(prev=>!prev)} aria-expanded={panelOpen}
      aria-controls="family-agenda-content"
      className="min-h-[44px] flex items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[var(--terra-ink)] dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59]">
    <ListTodo size={17} className="text-[#4A7C59]"/>
    Ближайшие дела <span className="text-xs font-normal text-stone-500">({agenda.length})</span>
    <ChevronDown size={16} aria-hidden="true" className={`text-stone-500 transition-transform ${expanded?'rotate-180':''}`}/>
   </button>
   <div className="hidden md:flex gap-1.5 flex-wrap">
    <button type="button" aria-label="Создать задачу" onClick={()=>onOpenEvent(null,{kind:'task',date:today})}
      className="min-h-[44px] rounded-xl px-2.5 py-2 bg-[#4A7C59] text-white text-xs font-bold flex items-center gap-1">
      <Plus size={14}/>Задача
    </button>
    <button type="button" onClick={onEnableReminders} aria-pressed={remindersEnabled} title={pushEnabled?"Фоновые push включены":"Напоминания работают при открытом приложении"}
      className="min-h-[44px] rounded-xl border border-[var(--terra-border)] dark:border-white/20 text-xs font-medium px-2.5 py-2 dark:text-white flex items-center gap-1">
      <Bell size={14}/>{remindersEnabled?(pushEnabled?'Push включены':'Напоминания вкл.'):'Включить напоминания'}
    </button>
    <button type="button" onClick={onToggleTelegramReminders}
      title={telegramConfigured?'Фоновые напоминания через Telegram по расписанию Vercel':'Сначала настройте Telegram-бота'}
      aria-pressed={telegramRemindersEnabled}
      className="min-h-[44px] rounded-xl border border-[var(--terra-border)] dark:border-white/20 text-xs font-medium px-2.5 py-2 dark:text-white flex items-center gap-1">
      <Send size={14}/>{telegramRemindersEnabled?'Telegram: вкл.':'Telegram: выкл.'}
    </button>
    <button type="button" onClick={exportICS} title="Скачать события в формате iCalendar"
      className="min-h-[44px] rounded-xl border border-[var(--terra-border)] dark:border-white/20 text-xs font-medium px-2.5 py-2 dark:text-white flex items-center gap-1">
      <Download size={14}/> .ics
    </button>
   </div>
  </div>
  <div id="family-agenda-content">
   <MotionConfig reducedMotion="user">
    <AnimatePresence initial={false}>
     {panelOpen && (
      <motion.div ref={contentRef} key="agenda-disclosure" initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        transition={agendaDisclosureTransition(Boolean(reduceMotion))}
        aria-hidden={!panelOpen}
        className="overflow-hidden space-y-2">
  <div className="md:hidden flex flex-wrap gap-2">
    <button type="button" aria-label="Создать задачу" onClick={()=>onOpenEvent(null,{kind:'task',date:today})}
      className="min-h-[44px] rounded-xl px-3 bg-[#4A7C59] text-white text-sm font-semibold flex items-center gap-1"><Plus size={16}/>Задача</button>
    <button type="button" onClick={onEnableReminders} aria-pressed={remindersEnabled} className="min-h-[44px] rounded-xl px-3 border border-[var(--terra-border)] dark:border-white/20 text-sm dark:text-white flex items-center gap-1"><Bell size={16}/>{remindersEnabled?(pushEnabled?'Push: вкл.':'Напоминания: вкл.'):'Напоминания: выкл.'}</button>
    <button type="button" onClick={onToggleTelegramReminders} aria-pressed={telegramRemindersEnabled} className="min-h-[44px] rounded-xl px-3 border border-[var(--terra-border)] dark:border-white/20 text-sm dark:text-white flex items-center gap-1"><Send size={16}/>{telegramRemindersEnabled?'Telegram: вкл.':'Telegram: выкл.'}</button>
    <button type="button" onClick={exportICS} className="min-h-[44px] rounded-xl px-3 border border-[var(--terra-border)] dark:border-white/20 text-sm dark:text-white flex items-center gap-1"><Download size={16}/>.ics</button>
  </div>
  <div className={FILTER_RAIL} role="group" aria-label="Период календаря">
   {([['today','Сегодня'],['week','7 дней'],['month','30 дней'],['tasks','Задачи']] as const).map(([id,label])=>
    <button key={id} type="button" aria-pressed={view===id} onClick={()=>setView(id)}
     className={`${FILTER_CHIP} ${view===id ? FILTER_CHIP_ACTIVE : FILTER_CHIP_IDLE}`}>
     {label}
    </button>
   )}
  </div>
  <div className="divide-y divide-[var(--terra-border)]" aria-label="Ближайшие события и семейные задачи">
   {agenda.length===0&&<p className="text-xs text-stone-500 py-3">Пока нет запланированных дел на этот период.</p>}
   {agenda.map(event=><div key={event.id} className="flex gap-2 items-center py-2 px-2 rounded-lg">
    {event.kind==='task'?
      <button type="button" title="Отметить выполнение" disabled={savingId===event.id}
       onClick={()=>void toggle(event)} aria-label={event.completed?"Вернуть задачу":"Отметить выполнение"} aria-pressed={Boolean(event.completed)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#4A7C59] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
       {event.completed?<CircleCheck size={19}/>:<Circle size={19}/>}
      </button>:<CalendarDays size={17} className="text-[#4A7C59] shrink-0"/>}
    <button type="button" onClick={()=>onOpenEvent(event)}
     className="text-left min-h-[44px] min-w-0 flex-1 rounded-lg focus-visible:ring-2 focus-visible:ring-primary">
     <div className="text-xs sm:text-sm font-semibold dark:text-white break-words">{event.title}
      {event.recurrence&&event.recurrence!=='none'&&<Repeat2 size={12} className="inline ml-1 text-stone-400"/>}
     </div>
     <div className="text-xs text-[var(--terra-muted)] break-words">{event.date} · {event.time} · {memberNames(event)} {event.kind==='task'&&!event.completed&&event.date<today?'· Просрочено':''}</div>
    </button>
   </div>)}
  </div>
  <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">{pushEnabled?'Фоновые push настроены для устройства.':'Обычные напоминания работают при открытом Budget.'} Telegram-напоминания отправляются с сервера, если включены.</p>
      </motion.div>
     )}
    </AnimatePresence>
   </MotionConfig>
  </div>
 </section>;
};
export default FamilyAgendaPanel;
