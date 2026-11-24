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
