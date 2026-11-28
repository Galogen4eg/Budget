import React from 'react';
import { FILTER_RAIL,FILTER_CHIP,FILTER_CHIP_ACTIVE,FILTER_CHIP_IDLE,TOOLBAR_ACTION,TOOLBAR_ACTION_IDLE } from './filterUiTokens';
import type { HistoryTransactionType } from '../utils/budgetHistory';
interface Props{
 historyScope:'day'|'month';
 setHistoryScope:(scope:'day'|'month')=>void;
 historyType:HistoryTransactionType;
 setHistoryType:(type:HistoryTransactionType)=>void;
 historySearch:string;
 setHistorySearch:(query:string)=>void;
 historyCategory:string|null;
 setHistoryCategory:(id:string|null)=>void;
 categoryOptions:{id:string;label:string}[];
 selectedDay:number;
 selectedDateLabel?:string;
 count:number;
 total:number;
}
const controlClass='min-h-[44px] min-w-0 w-full rounded-xl border border-[var(--terra-control-border)] bg-[var(--terra-surface)] px-3 py-2 text-sm text-[var(--terra-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]';
export default function BudgetHistoryControls({historyScope,setHistoryScope,historyType,setHistoryType,historySearch,setHistorySearch,historyCategory,setHistoryCategory,categoryOptions,selectedDay,selectedDateLabel,count,total}:Props){
 const active=Boolean(historySearch.trim()||historyType!=='all'||historyCategory!==null);
 return <div data-testid="budget-history-controls" className="terra-history-controls space-y-2">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <h3 className="font-headline text-base font-semibold text-[var(--terra-ink)]">История операций</h3>
   <span role="status" className="text-sm tabular-nums text-[var(--terra-muted)]">{total===0?'Нет операций':`${count} из ${total}`}</span>
  </div>
  <div className="terra-history-toolbar"><div role="group" aria-label="Период истории операций" className={FILTER_RAIL}>
   {(['day','month'] as const).map(scope=><button key={scope} type="button" aria-pressed={historyScope===scope} onClick={()=>setHistoryScope(scope)}
    className={FILTER_CHIP+' terra-press '+(historyScope===scope?FILTER_CHIP_ACTIVE:FILTER_CHIP_IDLE)}>{scope==='day'?'День · '+(selectedDateLabel||selectedDay):'Весь месяц'}</button>)}
  </div>
  <input type="search" aria-label="Поиск по истории операций" value={historySearch} onChange={event=>setHistorySearch(event.target.value)} placeholder="Магазин, название, участник" className={controlClass}/>
  <div className="terra-history-filters grid grid-cols-2 gap-2 min-w-0">
   <select aria-label="Тип операций в истории" value={historyType} onChange={event=>setHistoryType(event.target.value as HistoryTransactionType)} className={controlClass}>
    <option value="all">Все типы</option><option value="expense">Расходы</option><option value="income">Доходы</option>
   </select>
   <select aria-label="Категория операций в истории" value={historyCategory===null?'':'category:'+historyCategory}
    onChange={event=>setHistoryCategory(event.target.value===''?null:event.target.value.slice('category:'.length))} className={controlClass}>
    <option value="">Все категории</option>
    {categoryOptions.map(option=><option key={option.id} value={'category:'+option.id}>{option.label}</option>)}
   </select>
  </div>
  </div>
  {active&&<button type="button" aria-label="Сбросить фильтры истории" onClick={()=>{setHistorySearch('');setHistoryType('all');setHistoryCategory(null);}}
   className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE+' text-[var(--terra-primary-text)]'}>Сбросить фильтры</button>}
 </div>;
}
