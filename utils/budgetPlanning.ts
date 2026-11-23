import { cents, money, sumMoney } from './budgetFinancialMath.ts';
import { isSavingsTransfer } from './savingsSync.ts';

type CategoryLike={id:string;label:string;parentId?:string};
type ExpenseLike={type:string;category:string;amount:number;date:string;id:string;note?:string;rawNote?:string;linkedGoalId?:string;linkedExpenseId?:string;linkedDebtId?:string};

export type CategoryBudgetRow={
 categoryId:string;label:string;spent:number;limit:number;remaining:number;percentage:number;overLimit:boolean;
};

export function normalizeCategoryBudget(value:number):number|null{
 if(!Number.isFinite(value)||value<=0)return null;
 return money(cents(value));
}

/** Validate human-entered limits before writing; never silently round input. */
export function parseCategoryBudgetInput(raw:string):number|null{
 const normalized=raw.trim().replace(/[\s\u00a0]/g,'').replace(',','.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(normalized))return null;
 const value=Number(normalized);
 if(!Number.isFinite(value)||value<=0||!Number.isSafeInteger(Math.round(value*100)))return null;
 return money(Math.round(value*100));
}

export function buildCategoryBudgetRows(
 transactions:readonly ExpenseLike[],
 categories:readonly CategoryLike[],
 limits:Readonly<Record<string,number>>
):CategoryBudgetRow[]{
 const result:CategoryBudgetRow[]=[];
 for(const category of categories){
   const limit=normalizeCategoryBudget(limits[category.id]);
   if(limit===null)continue;
   // A parent budget covers every descendant; avoid crediting an operation
   // twice inside the same budget.
   const included=new Set([category.id]);
   let changed=true;
   while(changed){
     changed=false;
     for(const child of categories){
       if(child.parentId&&included.has(child.parentId)&&!included.has(child.id)){
         included.add(child.id);
         changed=true;
       }
     }
   }
   const spent=sumMoney(transactions.filter(tx=>tx.type==='expense'&&included.has(tx.category))
     .map(tx=>Math.abs(tx.amount)));
   const rest=money(Math.max(0,cents(limit)-cents(spent)));
   result.push({
     categoryId:category.id,label:category.label,spent,limit,remaining:rest,
     percentage:limit>0?Math.min(100,Math.round((spent/limit)*100)):0,
     overLimit:cents(spent)>cents(limit)
   });
 }
 return result;
}

export interface BudgetForecast {
 availableToday:number;
 averageDaily:number;
 projectedSpending:number|null;
 projectedFreeBalance:number|null;
 hasHistory:boolean;
 observedDays:number;
}

/**
 * Conservative guidance, not a promise. Uses a fixed 14-day observation
 * window, excludes savings transfers already reflected in the ledger.
 * No future salaries are assumed.
 */
export function forecastUntilSalary(input:{
 transactions:readonly ExpenseLike[];
 now:Date;daysRemaining:number;totalBalance:number;reservedAmount:number;
}):BudgetForecast{
 const {transactions,now,daysRemaining,totalBalance,reservedAmount}=input;
 const availableToday=money(Math.max(0,cents(totalBalance)-Math.max(0,cents(reservedAmount))));
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const start=new Date(today);start.setDate(start.getDate()-13);
 const end=new Date(today);end.setDate(end.getDate()+1);
 const costs=transactions.filter(tx=>{
   const date=new Date(tx.date);
   return tx.type==='expense'&&!isSavingsTransfer(tx)&&!tx.linkedExpenseId&&!tx.linkedDebtId&&Number.isFinite(date.getTime())
     &&date>=start&&date<end;
 });
 const observedDays=14;
 if(!costs.length||!Number.isFinite(daysRemaining)||daysRemaining<=0){
   return {availableToday,averageDaily:0,projectedSpending:null,projectedFreeBalance:null,hasHistory:false,observedDays};
 }
 const expenseCents=costs.reduce((acc,tx)=>acc+Math.max(0,cents(tx.amount)),0);
 const avgCents=Math.round(expenseCents/observedDays);
 const estimatedCents=avgCents*Math.ceil(daysRemaining);
 return {
   availableToday, averageDaily:money(avgCents),
   projectedSpending:money(estimatedCents),
   projectedFreeBalance:money(Math.max(0,cents(availableToday)-estimatedCents)),
   hasHistory:true,observedDays
 };
}
