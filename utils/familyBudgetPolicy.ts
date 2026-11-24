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
 personalMandatoryExpenses?:readonly {id:string;memberId?:string|null}[];
 personalManualPaidExpenses?:Record<string,string[]>;
}>(settings:T,memberId:string|undefined):T{
 const numberOrZero=(n:number|undefined)=>typeof n==='number'&&Number.isFinite(n)?n:0;
 const expenses=memberId?(settings.personalMandatoryExpenses??[]).filter(e=>e.memberId===memberId):[];
 const ids=new Set(expenses.map(e=>e.id));
 return {...settings,
   initialBalance:memberId?numberOrZero(settings.personalInitialBalance):0,
   initialBalanceDate:memberId?(settings.personalInitialBalanceDate||undefined):undefined,
   savingsRate:memberId?Math.min(100,Math.max(0,numberOrZero(settings.personalSavingsRate))):0,
   targetMonthlyBudget:memberId?Math.max(0,numberOrZero(settings.personalMonthlyBudget)):0,
   manualReservedAmount:memberId?Math.max(0,numberOrZero(settings.personalManualReservedAmount)):0,
   categoryBudgets:{},
   mandatoryExpenses:expenses,
   manualPaidExpenses:Object.fromEntries(Object.entries(settings.personalManualPaidExpenses||{}).map(([month,paid])=>[month,paid.filter(id=>ids.has(id))]))
 };
}


/** Prepare a lossless migration of legacy obligations. No writes or guessed owners. */
export function partitionMandatoryPayments<T extends {id:string;memberId?:string|null}>(
  expenses:readonly T[], paid:Readonly<Record<string,readonly string[]>>, memberIds:readonly string[]
): {byMember:Record<string,{mandatoryExpenses:T[];manualPaidExpenses:Record<string,string[]>}>; issues:string[]} {
  const byMember:Record<string,{mandatoryExpenses:T[];manualPaidExpenses:Record<string,string[]>}>=Object.create(null);
  const owners=new Map<string,string>();
  const issues:string[]=[];
  for(const memberId of new Set(memberIds)){
    if(memberId)byMember[memberId]={mandatoryExpenses:[],manualPaidExpenses:{}};
  }
  const seen=new Set<string>();
  for(const expense of expenses){
    if(!expense.id||seen.has(expense.id)){issues.push('Повторяющийся или пустой ID обязательного платежа');continue;}
    seen.add(expense.id);
    if(!expense.memberId||!Object.prototype.hasOwnProperty.call(byMember,expense.memberId)){
      issues.push('Обязательный платёж без подтверждённого владельца: '+expense.id);continue;
    }
    owners.set(expense.id,expense.memberId);
    byMember[expense.memberId].mandatoryExpenses.push({...expense});
  }
  for(const [month,ids] of Object.entries(paid)){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)){issues.push('Некорректный месяц оплаты: '+month);continue;}
    for(const id of new Set(ids)){
      const owner=owners.get(id);
      if(!owner){issues.push('Отметка оплаты без подтверждённого платежа: '+id);continue;}
      (byMember[owner].manualPaidExpenses[month]??=[]).push(id);
    }
  }
  return {byMember,issues};
}


/** Rebuild the shared obligations from authoritative personal copies only.
 * A nonempty issues list must prevent the caller from committing any writes.
 */
export function mergePersonalMandatoryPayments<T extends {id:string;memberId?:string|null}>(
 documents:readonly {memberId:string;mandatoryExpenses:readonly T[];manualPaidExpenses:Readonly<Record<string,readonly string[]>>}[],
 expectedMemberIds:readonly string[]
):{mandatoryExpenses:T[];manualPaidExpenses:Record<string,string[]>;issues:string[]}{
 const expected=new Set(expectedMemberIds);
 const seenMembers=new Set<string>();
 const seenIds=new Set<string>();
 const mandatoryExpenses:T[]=[];
 const manualPaidExpenses:Record<string,string[]>={};
 const issues:string[]=[];
 for(const document of documents){
   if(!expected.has(document.memberId)||seenMembers.has(document.memberId)){
     issues.push('Неожиданный или повторный профиль');continue;
   }
   seenMembers.add(document.memberId);
   const ownIds=new Set<string>();
   for(const expense of document.mandatoryExpenses){
     if(!expense.id||expense.memberId!==document.memberId||seenIds.has(expense.id)){
       issues.push('Конфликт владельца или ID обязательного платежа');continue;
     }
     seenIds.add(expense.id);ownIds.add(expense.id);mandatoryExpenses.push({...expense});
   }
   for(const [month,ids] of Object.entries(document.manualPaidExpenses)){
     if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)){issues.push('Некорректный месяц оплаты');continue;}
     for(const id of new Set(ids)){
       if(!ownIds.has(id)){issues.push('Отметка оплаты не принадлежит профилю');continue;}
       (manualPaidExpenses[month]??=[]).push(id);
     }
   }
 }
 for(const id of expected)if(!seenMembers.has(id))issues.push('Отсутствует личный документ участника');
 return {mandatoryExpenses,manualPaidExpenses,issues};
}
