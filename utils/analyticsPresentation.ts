import {cents,money} from './budgetFinancialMath.ts';
import {resolveBudgetCategoryRoot} from './budgetCategoryBreakdown.ts';
/** Bars reflect the actual ratio; zero is never drawn as nonzero. */
export function chartBarPercent(value:number,max:number):number {
 if(!Number.isFinite(value)||!Number.isFinite(max)||max<=0||value<=0)return 0;
 return Math.min(100,value/max*100);
}

export type AnalyticsGranularity='daily'|'weekly';
export type AnalyticsSeriesFilter='all'|'expense'|'income';
export interface AnalyticsPoint{id:string;label:string;dayNum?:number;expense:number;income:number}
type AnalyticsRow={date:string;type:string;amount:number};
type PayeeRow={type:string;amount:number;category:string;payee?:string;note?:string};
type AnalyticsCategory={id:string;label:string;parentId?:string;color?:string};

/** Seven-day blocks within the selected month, or the selected single day.
 * Average uses elapsed calendar days in the current month, full days otherwise. */
export function buildAnalyticsSeries(rows:readonly AnalyticsRow[],month:Date,grouping:AnalyticsGranularity,selectedDate?:Date|null,today=new Date()){
 const period=selectedDate||month;
 const year=period.getFullYear(),m=period.getMonth();
 const daysInMonth=new Date(year,m+1,0).getDate();
 const first=selectedDate?selectedDate.getDate():1,last=selectedDate?first:daysInMonth;
 const monthShort=period.toLocaleString('ru-RU',{month:'short'}).replace('.','');
 const step=grouping==='weekly'&&!selectedDate?7:1;
 const list:AnalyticsPoint[]=[];
 for(let day=first;day<=last;day+=step){
  const end=Math.min(last,day+step-1);
  list.push({id:String(day),label:day===end?`${day} ${monthShort}`:`${day}–${end} ${monthShort}`,...(day===end?{dayNum:day}:{}),expense:0,income:0});
 }
 let expense=0,income=0;
 for(const row of rows){
  if(row.type!=='expense'&&row.type!=='income')continue;
  const date=new Date(row.date),day=date.getDate();
  if(date.getFullYear()!==year||date.getMonth()!==m||day<first||day>last)continue;
  const point=list[Math.floor((day-first)/step)];if(!point)continue;
  const amount=cents(row.amount);point[row.type]+=amount;
  if(row.type==='expense')expense+=amount;else income+=amount;
 }
 const days=selectedDate?1:today.getFullYear()===year&&today.getMonth()===m?today.getDate():daysInMonth;
 return {list:list.map(p=>({...p,expense:money(p.expense),income:money(p.income)})),expense:money(expense),income:money(income),avgDaily:money(expense/Math.max(1,days)),days};
}

/** Search filters rows, not financial denominators. */
export function buildPayeeAnalytics(rows:readonly PayeeRow[],categories:readonly AnalyticsCategory[],search=''){
 const byId=new Map(categories.map(c=>[c.id,c]));
 const groups=new Map<string,{catId:string;catName:string;catColor:string;total:number;payees:Map<string,{name:string;spent:number;txCount:number}>}>();
 let total=0;
 for(const row of rows){
  if(row.type!=='expense'||!Number.isFinite(row.amount)||row.amount<=0)continue;
  const amount=cents(row.amount);if(amount<=0)continue;
  const catId=resolveBudgetCategoryRoot(row.category,byId),cat=byId.get(catId);
  const group=groups.get(catId)||{catId,catName:cat?.label||'Без категории',catColor:cat?.color||'#858078',total:0,payees:new Map()};
  const name=row.payee?.trim()||row.note?.trim()||'Без получателя';
  const p=group.payees.get(name)||{name,spent:0,txCount:0};
  p.spent+=amount;p.txCount++;group.payees.set(name,p);
  group.total+=amount;total+=amount;groups.set(catId,group);
 }
 const query=search.trim().toLocaleLowerCase('ru-RU');
 return [...groups.values()].map(g=>({catId:g.catId,catName:g.catName,catColor:g.catColor,totalSpent:money(g.total),
  percentage:chartBarPercent(g.total,total),payeeCount:g.payees.size,
  payeesList:[...g.payees.values()].filter(p=>p.name.toLocaleLowerCase('ru-RU').includes(query))
   .sort((a,b)=>b.spent-a.spent||a.name.localeCompare(b.name,'ru-RU')).map(p=>({...p,spent:money(p.spent),percentage:chartBarPercent(p.spent,g.total)}))
 })).filter(g=>g.payeesList.length>0).sort((a,b)=>b.totalSpent-a.totalSpent);
}
