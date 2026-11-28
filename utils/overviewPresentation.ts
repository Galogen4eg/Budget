import { cents, money } from './budgetFinancialMath.ts';

/** Presentation only: keep the original proportion in the bar; never imply a nonzero expense is zero. */
export function overviewCategoryShare(amount:number,total:number):{percent:number;label:string}{
 const denominator=cents(total);
 const percent=denominator>0?Math.max(0,Math.min(100,cents(amount)/denominator*100)):0;
 return {percent,label:percent>0&&percent<1?'<1%':percent>99&&percent<100?'>99%':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(percent)+'%'};
}

/** A daily forecast is not a configured monthly spending limit. */
export function overviewChartGuide(scale:'day'|'week'|'month',monthly:number|null|undefined,daily:number,applicable:boolean):{value:number;label:string}{
 const candidate=scale==='month'?monthly??0:daily;
 const value=applicable&&Number.isFinite(candidate)&&candidate>0?money(cents(candidate)):0;
 return {value,label:scale==='month'?'Лимит на месяц':'Ориентир на день'};
}
