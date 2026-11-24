export type HouseholdBudgetPolicy = 'family' | 'personal';
export type BudgetOpening = {amount:number;date?:string};

export function effectiveBudgetMode(policy:HouseholdBudgetPolicy|undefined,preferred:HouseholdBudgetPolicy):HouseholdBudgetPolicy {
  return policy==='personal'?'personal':preferred;
}
export function assertBudgetPolicyOwner(ownerUid:string|undefined,actorUid:string|undefined):void {
  if(!ownerUid||!actorUid||ownerUid!==actorUid)throw new Error('Изменить режим семейного бюджета может только администратор');
}
export function visibleBudgetRecords<T extends {memberId?:string}>(records:readonly T[],policy:HouseholdBudgetPolicy,memberId:string|undefined):T[]{
  if(policy==='family')return [...records];
  return memberId?records.filter(record=>record.memberId===memberId):[];
}
export function resolveBudgetOpening(policy:HouseholdBudgetPolicy,memberId:string|undefined,shared:BudgetOpening,personal:Readonly<Record<string,BudgetOpening>>):BudgetOpening{
  if(policy==='family')return shared;
  if(!memberId)return {amount:0};
  const opening=Object.prototype.hasOwnProperty.call(personal,memberId)?personal[memberId]:undefined;
  return opening&&Number.isFinite(opening.amount)?opening:{amount:0};
}

/** Financial projection only; never persist this derived object as shared settings. */
export function projectPersonalFinance<T extends {
 initialBalance:number; initialBalanceDate?:string; savingsRate:number;
 personalInitialBalance?:number; personalInitialBalanceDate?:string;
 personalSavingsRate?:number; personalMonthlyBudget?:number; personalManualReservedAmount?:number;
 targetMonthlyBudget?:number; manualReservedAmount?:number;
 categoryBudgets?:Record<string,number>;
 mandatoryExpenses:readonly {id:string;memberId?:string|null}[];
 manualPaidExpenses?:Record<string,string[]>;
}>(settings:T,memberId:string|undefined):T{
 const numberOrZero=(n:number|undefined)=>typeof n==='number'&&Number.isFinite(n)?n:0;
 const expenses=memberId?settings.mandatoryExpenses.filter(e=>e.memberId===memberId):[];
 const ids=new Set(expenses.map(e=>e.id));
 return {...settings,
   initialBalance:memberId?numberOrZero(settings.personalInitialBalance):0,
   initialBalanceDate:memberId?(settings.personalInitialBalanceDate||undefined):undefined,
   savingsRate:memberId?Math.min(100,Math.max(0,numberOrZero(settings.personalSavingsRate))):0,
   targetMonthlyBudget:memberId?Math.max(0,numberOrZero(settings.personalMonthlyBudget)):0,
   manualReservedAmount:memberId?Math.max(0,numberOrZero(settings.personalManualReservedAmount)):0,
   categoryBudgets:{},
   mandatoryExpenses:expenses,
   manualPaidExpenses:Object.fromEntries(Object.entries(settings.manualPaidExpenses||{}).map(([month,paid])=>[month,paid.filter(id=>ids.has(id))]))
 };
}
