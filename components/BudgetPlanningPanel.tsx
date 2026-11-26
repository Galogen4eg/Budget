import React,{useId,useMemo,useRef,useState} from 'react';
import { categoriesForType } from '../utils/categoryCatalog';
import { SURFACE_CARD, TOOLBAR_ACTION, TOOLBAR_ACTION_IDLE, TOOLBAR_ACTION_PRIMARY, SECTION_HEADING } from './filterUiTokens';
import { toast } from 'sonner';
import type { AppSettings, Category, Transaction } from '../types';
import { useData } from '../contexts/DataContext';
import { buildCategoryBudgetRows, forecastUntilSalary, parseCategoryBudgetInput } from '../utils/budgetPlanning';
import { formatBudgetMoney } from '../utils/budgetFinancialMath';
import { buildMonthlyBudgetReport } from '../utils/budgetMonthlyReport';

interface Props {
 settings:AppSettings;categories:Category[];transactions:Transaction[];
 monthTransactions:Transaction[];currentMonth:Date;isCurrentMonth:boolean;
 totalBalance:number;reservedAmount:number;daysToSalary:number;
}

/** Shared mobile/desktop category budget and non-guaranteed forecast widget. */
export default function BudgetPlanningPanel({
 settings,categories,transactions,monthTransactions,currentMonth,isCurrentMonth,
 totalBalance,reservedAmount,daysToSalary
}:Props){
 const {updateSettings,householdPersonal,personalDisplayOnly,personalOpeningKnown}=useData();
 const personalOnly=householdPersonal||personalDisplayOnly;
 const [categoryId,setCategoryId]=useState('');
 const [amount,setAmount]=useState('');
 const [saving,setSaving]=useState(false);
 const [editing,setEditing]=useState(false);
 const formId=useId(),categoryInputId=useId(),amountId=useId();
 const mutationPending=useRef(false);
 const [error,setError]=useState('');
 const expenseCategories=useMemo(()=>categoriesForType(categories,'expense'),[categories]);
 const categoryNames=useMemo(()=>new Map(categories.map(c=>[c.id,c.label])),[categories]);
 const limits=settings.categoryBudgets||{};
 const rows=useMemo(()=>buildCategoryBudgetRows(monthTransactions,categories,limits),
  [monthTransactions,categories,limits]);
 const monthlyReport=useMemo(()=>buildMonthlyBudgetReport(transactions,categories,limits,currentMonth),
  [transactions,categories,limits,currentMonth]);
 const forecast=useMemo(()=>forecastUntilSalary({
   transactions,now:new Date(),daysRemaining:daysToSalary,totalBalance,reservedAmount
 }),[transactions,daysToSalary,totalBalance,reservedAmount]);
 const currency=(value:number)=>settings.privacyMode?'•••':formatBudgetMoney(value)+' ₽';
 const openLimit=(id:string)=>{if(mutationPending.current)return;setCategoryId(id);setAmount(id&&limits[id]?String(limits[id]):'');setError('');setEditing(true);};
 const save=async()=>{
   if(mutationPending.current||!categoryId)return;
   setError('');
   const limit=amount.trim()?parseCategoryBudgetInput(amount):null;
   if(amount.trim()&&limit===null){
     setError('Укажите положительный лимит с точностью до копейки.');
     return;
   }
   mutationPending.current=true;
   setSaving(true);
   try{
     const next={...limits};
     if(limit===null)delete next[categoryId]; else next[categoryId]=limit;
     await updateSettings(personalDisplayOnly?{personalCategoryBudgets:next}:{categoryBudgets:next});
     setEditing(false);
     setAmount('');
     toast.success(limit===null?'Лимит удалён':'Лимит сохранён');
   }catch{setError('Не удалось сохранить лимит. Введённые данные сохранены в форме.');}
   finally{mutationPending.current=false;setSaving(false);}
 };
 return (
  <section data-testid="budget-planning" className={SURFACE_CARD+" space-y-4 min-w-0"}>
   <div className="flex justify-between items-start gap-2">
     <div>
       <h3 className={SECTION_HEADING}>Лимиты по категориям</h3>
       <p className="text-xs text-graphite-muted dark:text-gray-400">{personalOnly?'Личные лимиты на календарный месяц':'Общие семейные лимиты на календарный месяц'}</p>
     </div>
     <button type="button" onClick={()=>editing?(setEditing(false),setError('')):openLimit('')}
       aria-expanded={editing}
       disabled={saving}
       aria-controls={formId}
       className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_IDLE}>
       {editing?'Закрыть':'+ Лимит'}
     </button>
   </div>
   {editing&&(
    <div id={formId} className="flex flex-col gap-2 rounded-xl bg-[var(--terra-soft)] p-3">
      <label htmlFor={categoryInputId} className="text-xs font-semibold">Категория</label>
      <select id={categoryInputId} value={categoryId} disabled={saving} onChange={e=>{
       const id=e.target.value;openLimit(id);
      }} className="min-h-[44px] min-w-0 w-full rounded-lg border border-[var(--terra-control-border)] bg-[var(--terra-surface)] text-[var(--terra-ink)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] px-2 text-sm">
       <option value="">Выберите категорию</option>
       {expenseCategories.map(cat=><option key={cat.id} value={cat.id}>{cat.parentId ? `${categoryNames.get(cat.parentId) || 'Категория'} / ${cat.label}` : cat.label}</option>)}
      </select>
      <label htmlFor={amountId} className="text-xs font-semibold">Лимит в месяц, ₽ (пустое поле — удалить)</label>
      <p className="text-xs text-[var(--terra-muted)]">{personalOnly?'Устанавливается для личного бюджета.':'Устанавливается для всей семьи.'} Можно задать лимит и для подкатегории; в общем плане она не дублируется.</p>
      <input id={amountId} type="text" inputMode="decimal" disabled={saving} value={amount}
        placeholder="Например, 30000,50" onChange={e=>{setAmount(e.target.value);setError('');}}
        className="min-h-[44px] min-w-0 w-full rounded-lg border border-[var(--terra-control-border)] bg-[var(--terra-surface)] text-[var(--terra-ink)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] px-3 text-sm"/>
      <button type="button" onClick={save} disabled={saving||!categoryId||(!amount.trim()&&!limits[categoryId])} aria-busy={saving}
       className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_PRIMARY}>
       {saving?'Сохранение…':amount.trim()?'Сохранить лимит':'Удалить лимит'}
      </button>
      {error&&<p role="alert" className="text-sm text-[var(--terra-danger-text)]">{error}</p>}
    </div>
   )}
   {rows.length===0?<p className="text-sm text-graphite-muted dark:text-gray-400">Лимитов пока нет. Добавьте первый, чтобы отслеживать расходы.</p>:
    <div className="space-y-3">
     {rows.map(row=><div key={row.categoryId} className="space-y-1.5">
      <div className="flex flex-wrap justify-between items-center gap-2 text-sm">
       <button type="button" disabled={saving} onClick={()=>openLimit(row.categoryId)} data-limit-category={row.categoryId} aria-label={"Изменить лимит: "+row.label} className="min-h-[44px] min-w-0 text-left font-semibold text-[var(--terra-ink)] rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] break-words">{row.label}</button>
       <span className={"tabular-nums break-words "+(!settings.privacyMode&&row.overLimit?'font-semibold text-[var(--terra-danger-text)]':'text-[var(--terra-muted)]')}>
        {currency(row.spent)} / {currency(row.limit)}
       </span>
      </div>
      {!settings.privacyMode&&<div data-testid="category-limit-progress" role="progressbar" aria-label={"Использование лимита: "+row.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.percentage} className="h-2 w-full bg-[var(--terra-soft)] rounded-full overflow-hidden">
       <div className={"h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none "+(row.overLimit?'bg-[var(--terra-danger-text)]':'bg-[var(--terra-primary-solid)]')}
        style={{width:row.percentage+'%'}}/>
      </div>}
      <p className="text-xs text-[var(--terra-muted)]">
       {settings.privacyMode?'Суммы скрыты':row.overLimit?'Лимит превышен на '+currency(row.spent-row.limit):'Осталось '+currency(row.remaining)}
      </p>
     </div>)}
    </div>
   }
   <div className="border-t border-surface-border dark:border-white/10 pt-3 space-y-2" aria-label="Месячный отчёт бюджета">
     <h3 className="text-sm font-bold text-graphite dark:text-white">План и факт за месяц</h3>
     <p className="text-xs text-graphite-muted dark:text-gray-400">
       {currentMonth.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})} · фактические операции из бюджета, без событий календаря
     </p>
     <div className="grid grid-cols-2 gap-2">
       <div className="rounded-xl bg-[var(--terra-soft)] p-3">
         <p className="text-xs text-[var(--terra-muted)]">Доходы</p>
         <p className="text-base font-semibold tabular-nums [overflow-wrap:anywhere]">{currency(monthlyReport.income)}</p>
       </div>
       <div className="rounded-xl bg-[var(--terra-soft)] p-3">
         <p className="text-xs text-[var(--terra-muted)]">Расходы</p>
         <p className="text-base font-semibold tabular-nums [overflow-wrap:anywhere]">{currency(monthlyReport.expense)}</p>
       </div>
     </div>
     <div className="flex justify-between gap-2 text-sm">
       <span className="text-graphite-muted dark:text-gray-400">Итог месяца</span>
       <strong className="tabular-nums">{currency(monthlyReport.net)}</strong>
     </div>
     {monthlyReport.planned > 0 ? (<>
       <div className="flex justify-between gap-2 text-sm">
         <span>План по категориям</span>
         <b className="tabular-nums">{currency(monthlyReport.planned)}</b>
       </div>
       <div className="flex justify-between gap-2 text-sm">
         <span>Факт по категориям с лимитом</span>
         <b className="tabular-nums">{currency(monthlyReport.plannedSpent)}</b>
       </div>
       <div className="flex justify-between gap-2 text-xs text-graphite-muted dark:text-gray-400">
         <span>Осталось по лимитам</span>
         <span>{currency(monthlyReport.plannedRemaining)}</span>
       </div>
       {!settings.privacyMode&&monthlyReport.overBudget > 0 && (
         <p className="text-xs font-semibold text-red-600 dark:text-red-400">
           Превышение отдельных лимитов: {currency(monthlyReport.overBudget)}
         </p>
       )}
       {monthlyReport.overlappingLimitIds.length>0 && (
         <p className="text-xs text-graphite-muted dark:text-gray-400">
           В общем плане не дублируются вложенные лимиты: {monthlyReport.overlappingLimitIds.length}.
         </p>
       )}
     </>) : (
       <p className="text-xs text-graphite-muted dark:text-gray-400">
         Для сравнения плана с фактом добавьте лимит хотя бы одной категории.
       </p>
     )}
     {!settings.privacyMode&&monthlyReport.unplannedSpent>0 && (
       <p className="text-xs text-graphite-muted dark:text-gray-400">
         Расходы вне категорий с лимитами: {currency(monthlyReport.unplannedSpent)}
       </p>
     )}
     <div className="border-t border-surface-border dark:border-white/10 pt-2">
       <p className="text-xs text-graphite-muted dark:text-gray-400">
         Прошлый месяц: {currency(monthlyReport.previousMonthExpense)} расходов.
         {settings.privacyMode?'':monthlyReport.expenseChangePercent===null
           ? ' Нет базы для процентного сравнения.'
           : ` Изменение: ${monthlyReport.expenseChangePercent>0?'+':''}${monthlyReport.expenseChangePercent}%.`}
       </p>
     </div>
   </div>
   {isCurrentMonth&&personalOpeningKnown&&(
    <div className="border-t border-surface-border dark:border-white/10 pt-3 space-y-1.5">
     <h3 className="text-sm font-bold text-graphite dark:text-white">Прогноз до зарплаты</h3>
     <p className="text-xs text-graphite-muted dark:text-gray-400">Через {daysToSalary} дн. · средний расход за последние 14 дней</p>
     {!forecast.hasHistory?<p className="text-sm text-graphite-muted dark:text-gray-400">Недостаточно расходов для прогноза.</p>:(
      <>
       <div className="flex justify-between text-sm"><span>Средний расход за день</span><b>{currency(forecast.averageDaily)}</b></div>
       <div className="flex justify-between text-sm"><span>Ожидаемые расходы</span><b>{currency(forecast.projectedSpending!)}</b></div>
       <div className="flex justify-between text-sm"><span>Прогноз свободного остатка</span><b>{currency(forecast.projectedFreeBalance!)}</b></div>
       <p className="text-xs text-[var(--terra-muted)]">
         Оценка по прошлым тратам без будущих доходов. Уже учтённые резервы не вычитаются повторно.
       </p>
      </>
     )}
    </div>
   )}
  </section>
 );
}
