import { cents, money } from './budgetFinancialMath.ts';

export type CalendarTransaction = {date:string;type:'income'|'expense';amount:number};

/** Daily sums are kept in integer kopecks for the entire selected month. */
export function buildBudgetDayMoney(
  transactions:readonly CalendarTransaction[],
  month:Date
):Record<number,{income:number;expense:number;net:number;count:number}>{
  const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const sums=Array.from({length:days},()=>({income:0,expense:0,count:0}));
  for(const transaction of transactions){
    const date=new Date(transaction.date);
    if(!Number.isFinite(date.getTime())||
       date.getFullYear()!==month.getFullYear()||date.getMonth()!==month.getMonth())continue;
    const index=date.getDate()-1;
    if(!sums[index]||!Number.isFinite(transaction.amount))continue;
    const kopecks=cents(transaction.amount);
    if(transaction.type==='income')sums[index].income+=kopecks;
    if(transaction.type==='expense')sums[index].expense+=kopecks;
    sums[index].count++;
  }
  return Object.fromEntries(sums.map((sum,index)=>[index+1,{
    income:money(sum.income),expense:money(sum.expense),
    net:money(sum.income-sum.expense),count:sum.count
  }]));
}
