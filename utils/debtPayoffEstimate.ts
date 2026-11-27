/** Principal-only planning estimate, not a bank amortization schedule. Inputs are rubles. */
export function estimateDebtPayoff(balance:number,monthly:number,extra:number):{baselineMonths:number;withExtraMonths:number}|null {
 const amounts=[balance,monthly,extra].map(n=>Math.round(n*100));
 if(amounts.some(n=>!Number.isSafeInteger(n)||n<0)||![balance,monthly,extra].every(n=>Number.isFinite(n)&&n>=0))return null;
 const [remaining,payment,additional]=amounts;
 if(remaining===0)return {baselineMonths:0,withExtraMonths:0};
 if(payment<=0||!Number.isSafeInteger(payment+additional))return null;
 return {baselineMonths:Math.ceil(remaining/payment),withExtraMonths:Math.ceil(remaining/(payment+additional))};
}
