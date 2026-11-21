import React,{useMemo,useState} from 'react';
import { toast } from 'sonner';
import type { AppSettings, Category, Transaction } from '../types';
import { useData } from '../contexts/DataContext';
import { buildCategoryBudgetRows, forecastUntilSalary, normalizeCategoryBudget } from '../utils/budgetPlanning';
import { formatBudgetMoney } from '../utils/budgetFinancialMath';

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
 const {updateSettings}=useData();
 const [categoryId,setCategoryId]=useState('');
 const [amount,setAmount]=useState('');
 const [saving,setSaving]=useState(false);
 const [editing,setEditing]=useState(false);
 const expenseCategories=useMemo(()=>categories.filter(c=>
   !c.parentId && c.transactionType!=='income'
 ),[categories]);
 const limits=settings.categoryBudgets||{};
 const rows=useMemo(()=>buildCategoryBudgetRows(monthTransactions,categories,limits),
  [monthTransactions,categories,limits]);
 const forecast=useMemo(()=>forecastUntilSalary({
   transactions,now:new Date(),daysRemaining:daysToSalary,totalBalance,reservedAmount
 }),[transactions,daysToSalary,totalBalance,reservedAmount]);
 const currency=(value:number)=>settings.privacyMode?'•••':formatBudgetMoney(value)+' ₽';
 const save=async()=>{
   if(saving||!categoryId)return;
   const entered=Number(amount.replace(',','.'));
   const limit=amount.trim()?normalizeCategoryBudget(entered):null;
   if(amount.trim()&&limit===null){toast.error('Введите положительный лимит в рублях');return;}
   setSaving(true);
   try{
     const next={...limits};
     if(limit===null)delete next[categoryId]; else next[categoryId]=limit;
     await updateSettings({categoryBudgets:next});
     setEditing(false);
     setAmount('');
     toast.success(limit===null?'Лимит удалён':'Лимит сохранён');
   }catch(error){toast.error('Не удалось сохранить лимит');}
   finally{setSaving(false);}
 };
 return (
  <section className="rounded-2xl border border-surface-border dark:border-white/10 bg-white dark:bg-[#1C1C1E] p-4 space-y-3 min-w-0">
   <div className="flex justify-between items-start gap-2">
     <div>
       <h3 className="text-sm font-bold text-graphite dark:text-white">Лимиты по категориям</h3>
       <p className="text-xs text-graphite-muted dark:text-gray-400">Общие семейные лимиты на календарный месяц</p>
     </div>
     <button type="button" onClick={()=>setEditing(x=>!x)}
       aria-expanded={editing}
       className="min-h-[36px] px-3 text-xs font-semibold text-primary dark:text-green-400 rounded-lg border border-surface-border dark:border-white/15">
       {editing?'Закрыть':'+ Лимит'}
     </button>
   </div>
   {editing&&(
    <div className="flex flex-col gap-2 rounded-xl bg-[#FAF8F5] dark:bg-[#252528] p-3">
      <label htmlFor="budget-limit-category" className="text-xs font-semibold">Категория</label>
      <select id="budget-limit-category" value={categoryId} onChange={e=>{
       const id=e.target.value;setCategoryId(id);setAmount(limits[id]?String(limits[id]):'');
      }} className="min-h-[44px] w-full rounded-lg border border-surface-border dark:border-white/15 bg-white dark:bg-[#202024] px-2 text-sm">
       <option value="">Выберите категорию</option>
       {expenseCategories.map(cat=><option key={cat.id} value={cat.id}>{cat.label}</option>)}
      </select>
      <label htmlFor="budget-limit-amount" className="text-xs font-semibold">Лимит в месяц, ₽ (пустое поле — удалить)</label>
      <input id="budget-limit-amount" inputMode="decimal" value={amount}
        placeholder="Например, 30000" onChange={e=>setAmount(e.target.value)}
        className="min-h-[44px] w-full rounded-lg border border-surface-border dark:border-white/15 bg-white dark:bg-[#202024] px-3 text-sm"/>
      <button type="button" onClick={save} disabled={saving||!categoryId}
       className="min-h-[44px] rounded-lg bg-primary disabled:opacity-40 text-white text-sm font-semibold">
       {saving?'Сохранение…':'Сохранить лимит'}
      </button>
    </div>
   )}
   {rows.length===0?<p className="text-sm text-graphite-muted dark:text-gray-400">Лимитов пока нет. Добавьте первый, чтобы отслеживать расходы.</p>:
    <div className="space-y-3">
     {rows.map(row=><div key={row.categoryId} className="space-y-1.5">
      <div className="flex justify-between gap-2 text-xs">
       <span className="font-medium text-graphite dark:text-white truncate">{row.label}</span>
       <span className={row.overLimit?'font-semibold text-red-600 dark:text-red-400':'text-graphite-muted dark:text-gray-400'}>
        {currency(row.spent)} / {currency(row.limit)}
       </span>
      </div>
      <div className="h-2 w-full bg-[#EAE6DE] dark:bg-white/10 rounded-full overflow-hidden">
       <div className={row.overLimit?'h-full rounded-full bg-red-500':'h-full rounded-full bg-[#4A7C59]'}
        style={{width:row.percentage+'%'}}/>
      </div>
      <p className="text-[11px] text-graphite-muted dark:text-gray-400">
       {row.overLimit?'Лимит превышен на '+currency(row.spent-row.limit):'Осталось '+currency(row.remaining)}
      </p>
     </div>)}
    </div>
   }
   {isCurrentMonth&&(
    <div className="border-t border-surface-border dark:border-white/10 pt-3 space-y-1.5">
     <h3 className="text-sm font-bold text-graphite dark:text-white">Прогноз до зарплаты</h3>
     <p className="text-xs text-graphite-muted dark:text-gray-400">Через {daysToSalary} дн. · средний расход за последние 14 дней</p>
     {!forecast.hasHistory?<p className="text-sm text-graphite-muted dark:text-gray-400">Недостаточно расходов для прогноза.</p>:(
      <>
       <div className="flex justify-between text-sm"><span>Средний расход за день</span><b>{currency(forecast.averageDaily)}</b></div>
       <div className="flex justify-between text-sm"><span>Ожидаемые расходы</span><b>{currency(forecast.projectedSpending!)}</b></div>
       <div className="flex justify-between text-sm"><span>Прогноз свободного остатка</span><b>{currency(forecast.projectedFreeBalance!)}</b></div>
       <p className="text-[11px] text-graphite-muted dark:text-gray-400">
         Оценка по прошлым тратам без будущих доходов. Уже учтённые резервы не вычитаются повторно.
       </p>
      </>
     )}
    </div>
   )}
  </section>
 );
}
