import { monthlyMoneyTotals } from './budgetFinancialMath';

type DatedTransaction = {id:string;date:string;amount:number;type:string};

export function groupBudgetTransactions<T extends DatedTransaction>(transactions: readonly T[]) {
  const groups=new Map<string,T[]>();
  for(const tx of transactions){
    const date=new Date(tx.date);
    if(!Number.isFinite(date.getTime()))continue;
    const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    if(!groups.has(day))groups.set(day,[]);
    groups.get(day)!.push(tx);
  }
  return [...groups.entries()].sort(([a],[b])=>b.localeCompare(a)).map(([date,items])=>{
    const sorted=[...items].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
    const {income,expense,net}=monthlyMoneyTotals(sorted);
    return {date,transactions:sorted,dayIncome:income,dayExpense:expense,net};
  });
}

export function clampBudgetDay(month: Date,selectedDay:number):number{
  const max=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  return Math.min(max,Math.max(1,Number.isFinite(selectedDay)?Math.floor(selectedDay):1));
}

export type BudgetPeriod = 'context'|'all'|'current_month'|'last_month'|'7_days'|'30_days'|'custom';

function localDay(value:string):Date|null{
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(!match)return null;
  const year=Number(match[1]),month=Number(match[2])-1,day=Number(match[3]);
  const date=new Date(year,month,day);
  return date.getFullYear()===year&&date.getMonth()===month&&date.getDate()===day?date:null;
}

/** Uses local calendar days, including today. No UTC parsing of YYYY-MM-DD. */
export function filterBudgetPeriod<T extends {date:string}>(
  rows:readonly T[],period:BudgetPeriod,now:Date,
  customStart?:string,customEnd?:string
):T[]{
  if(period==='all'||period==='context')return [...rows];
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let start:Date,end:Date;
  switch(period){
    case 'current_month':
      start=new Date(now.getFullYear(),now.getMonth(),1);
      end=new Date(now.getFullYear(),now.getMonth()+1,1);
      break;
    case 'last_month':
      start=new Date(now.getFullYear(),now.getMonth()-1,1);
      end=new Date(now.getFullYear(),now.getMonth(),1);
      break;
    case '7_days':
    case '30_days':
      start=new Date(today);
      start.setDate(start.getDate()-(period==='7_days'?6:29));
      end=new Date(today);
      end.setDate(end.getDate()+1);
      break;
    case 'custom': {
      const from=localDay(customStart||''),to=localDay(customEnd||'');
      if(!from||!to||from>to)return [];
      start=from;
      end=new Date(to);
      end.setDate(end.getDate()+1);
      break;
    }
  }
  return rows.filter(tx=>{
    const time=new Date(tx.date).getTime();
    return Number.isFinite(time)&&time>=start.getTime()&&time<end.getTime();
  });
}

export function visibleBudgetTransactions<T>(
  rows:readonly T[],isDesktop:boolean,showAll:boolean,hasActiveFilters:boolean
):T[]{
  if(isDesktop||showAll||hasActiveFilters)return [...rows];
  return rows.slice(0,15);
}
