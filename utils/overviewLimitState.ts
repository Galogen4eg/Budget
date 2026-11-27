import {cents,money} from './budgetFinancialMath.ts';
/** Presentation-only status of the existing monthly limit, in exact kopecks. */
export function overviewLimitState(spent:number,limit:number){
 const used=Math.max(0,cents(spent)),target=cents(limit);
 if(target<=0)return null;
 const percentage=used/target*100;
 const status=used>target?'over':used===target?'exhausted':percentage>=80?'near':'normal';
 return {status,percentage,barWidth:Math.min(100,percentage),difference:money(Math.abs(target-used))};
}
