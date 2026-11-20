import React, { useMemo, useState } from 'react';
import { CalendarDays, CircleCheck, Circle, Download, Bell, Plus, Repeat2, Wallet, ListTodo } from 'lucide-react';
import { toast } from 'sonner';
import type { FamilyEvent, MandatoryExpense, FamilyMember } from '../types';
import { formatLocalCalendarDate } from '../utils/calendarDates';
import { upcomingAgenda } from '../utils/familyPlanEngine';
import { paymentAgenda } from '../utils/calendarReminders';
import { makeCalendarICS } from '../utils/calendarExport';

interface Props {
 events: FamilyEvent[];
 members: FamilyMember[];
 payments: MandatoryExpense[];
 paidByMonth?: Record<string,string[]>;
 onOpenBudget?: () => void;
 onOpenEvent:(event?:FamilyEvent|null,prefill?:Record<string,unknown>)=>void;
 onToggleTask:(event:FamilyEvent)=>Promise<void>;
 onEnableReminders:()=>void;
 remindersEnabled:boolean;
}
type View='today'|'week'|'month'|'tasks';
export const FamilyAgendaPanel:React.FC<Props>=({
 events,members,payments,paidByMonth,onOpenBudget,onOpenEvent,onToggleTask,onEnableReminders,remindersEnabled
})=>{
 const [view,setView]=useState<View>('week');
 const [savingId,setSavingId]=useState<string|null>(null);
 const today=formatLocalCalendarDate(new Date());
 const agenda=useMemo(()=>{
  const count=view==='today'?1:view==='week'?7:30;
  const raw=upcomingAgenda(events,today,count);
  const dates=new Date();const candidates:FamilyEvent[]=[];
  for(let i=0;i<3;i++){
   const month=new Date(dates.getFullYear(),dates.getMonth()+i,1);
   candidates.push(...paymentAgenda(payments,month));
  }
  const end=new Date();end.setDate(end.getDate()+count-1);
  const last=formatLocalCalendarDate(end);
  const all=[...raw,...candidates.filter(x=>x.date>=today&&x.date<=last &&
    !((paidByMonth?.[x.date.slice(0,7)]||[]).includes(x.linkedExpenseId||'')))];
  return all.filter(x=>view==='tasks'?x.kind==='task':true)
   .sort((a,b)=>(a.date+' '+a.time).localeCompare(b.date+' '+b.time)).slice(0,60);
 },[events,payments,paidByMonth,today,view]);
 const exportICS=()=>{
  const ics=makeCalendarICS(events);
  const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));
  const a=document.createElement('a');
  a.href=url;a.download='budget-family-calendar.ics';a.click();
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
 return <section className="border-b border-stone-200 dark:border-white/10 bg-[#FAF8F5] dark:bg-[#18181A] px-3 sm:px-5 py-3 space-y-3 shrink-0">
  <div className="flex items-center justify-between flex-wrap gap-2">
   <div className="flex items-center gap-2">
    <ListTodo size={17} className="text-[#4A7C59]"/>
    <h2 className="text-sm font-bold dark:text-white">Ближайшие дела</h2>
   </div>
   <div className="flex gap-1.5 flex-wrap">
    <button type="button" onClick={()=>onOpenEvent(null,{kind:'task',date:today})}
      className="rounded-xl px-2.5 py-2 bg-[#4A7C59] text-white text-xs font-bold flex items-center gap-1">
      <Plus size={14}/>Задача
    </button>
    <button type="button" onClick={onEnableReminders} title="Напоминания работают при открытом приложении"
      className="rounded-xl border border-stone-200 dark:border-white/20 text-xs font-medium px-2.5 py-2 dark:text-white flex items-center gap-1">
      <Bell size={14}/>{remindersEnabled?'Напоминания вкл.':'Включить напоминания'}
    </button>
    <button type="button" onClick={exportICS} title="Скачать события в формате iCalendar"
      className="rounded-xl border border-stone-200 dark:border-white/20 text-xs font-medium px-2.5 py-2 dark:text-white flex items-center gap-1">
      <Download size={14}/> .ics
    </button>
   </div>
  </div>
  <div className="flex items-center gap-1 overflow-x-auto" role="group" aria-label="Период календаря">
   {([['today','Сегодня'],['week','7 дней'],['month','30 дней'],['tasks','Задачи']] as const).map(([id,label])=>
    <button key={id} type="button" aria-pressed={view===id} onClick={()=>setView(id)}
     className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${view===id?'bg-[#4A7C59] text-white':'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-200'}`}>
     {label}
    </button>
   )}
  </div>
  <div className="max-h-44 sm:max-h-52 overflow-y-auto space-y-1.5" aria-label="Ближайшие события и семейные задачи">
   {agenda.length===0&&<p className="text-xs text-stone-500 py-3">Пока нет запланированных дел на этот период.</p>}
   {agenda.map(event=><div key={event.id} className="flex gap-2 items-center py-2 px-2 rounded-xl bg-white dark:bg-white/5">
    {event.kind==='task'&&!event.linkedExpenseId?
      <button type="button" title="Отметить выполнение" disabled={savingId===event.id}
       onClick={()=>void toggle(event)} className="p-1 text-[#4A7C59] shrink-0">
       {event.completed?<CircleCheck size={19}/>:<Circle size={19}/>}
      </button>:
      event.linkedExpenseId?<Wallet size={17} className="text-[#4A7C59] shrink-0"/>:
      <CalendarDays size={17} className="text-[#4A7C59] shrink-0"/>}
    <button type="button" disabled={Boolean(event.linkedExpenseId&&!onOpenBudget)}
     onClick={()=>event.linkedExpenseId?onOpenBudget?.():onOpenEvent(event)}
     className="text-left min-w-0 flex-1 disabled:cursor-default">
     <div className="text-xs sm:text-sm font-semibold dark:text-white truncate">{event.title}
      {event.recurrence&&event.recurrence!=='none'&&<Repeat2 size={12} className="inline ml-1 text-stone-400"/>}
     </div>
     <div className="text-[11px] text-stone-500 truncate">{event.date} · {event.time} · {event.linkedExpenseId?'Открыть обязательные платежи':memberNames(event)}</div>
    </button>
   </div>)}
  </div>
  <p className="text-[10px] text-stone-500 dark:text-stone-400">Напоминания здесь работают при открытом Budget; фоновые push требуют отдельного подключения. Платежи показаны без автоматического списания.</p>
 </section>;
};
export default FamilyAgendaPanel;
