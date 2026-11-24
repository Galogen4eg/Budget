import { isSavingsTransfer } from './savingsSync.ts';

type ImportCategory={id:string;transactionType?:'income'|'expense'};
type ImportRow={id?:string;category:string;type:'income'|'expense';note?:string;rawNote?:string;linkedGoalId?:string};

export function isEligibleForImport(row:ImportRow,categories:readonly ImportCategory[]):boolean{
  if(!row.category||row.category==='other')return false;
  const category=categories.find(c=>c.id===row.category);
  return Boolean(category&&(!category.transactionType||category.transactionType===row.type));
}

export function splitImportReview<T extends ImportRow>(rows:readonly T[],categories:readonly ImportCategory[]):{
 ready:T[];needsReview:T[]
}{
 const ready:T[]=[],needsReview:T[]=[];
 for(const row of rows)(isEligibleForImport(row,categories)?ready:needsReview).push(row);
 return {ready,needsReview};
}

export function learnedRuleChangesSavings(before:ImportRow,after:ImportRow):boolean{
 return isSavingsTransfer(before)!==isSavingsTransfer(after);
}

/** Shared safety gate for both the preview and App import callback. */
export function assertImportBatchReady<T extends ImportRow & {
 amount:number;date:string;memberId:string
}>(rows:readonly T[],categories:readonly ImportCategory[],expectedMemberId:string):void{
 if(!rows.length)throw new Error('Нет операций для импорта');
 if(!expectedMemberId||rows.some(row=>row.memberId!==expectedMemberId))
   throw new Error('В выписке указан другой участник семьи');
 if(rows.some(row=>!isEligibleForImport(row,categories)))
   throw new Error('У некоторых операций категория отсутствует или не подходит к типу');
 if(rows.some(row=>!Number.isFinite(row.amount)||row.amount<=0||
   !Number.isSafeInteger(Math.round(row.amount*100))||
   Math.abs(row.amount*100-Math.round(row.amount*100))>0.000001))
   throw new Error('Неверная сумма: требуется положительное число с точностью до копейки');
 if(rows.some(row=>!row.date||!Number.isFinite(new Date(row.date).getTime())))
   throw new Error('В выписке есть операции с недействительной датой');
 const ids=rows.map(row=>row.id).filter(Boolean);
 if(new Set(ids).size!==ids.length)
   throw new Error('В выбранных операциях повторяются идентификаторы');
}

/** All savings dispositions must be explicit and owner-compatible before any import write. */
export function assertImportSavingsReady(
 rows:readonly (ImportRow & {memberId:string;externalSavingsConfirmed?:boolean})[],
 goals:readonly {id:string;memberId?:string}[],expectedMemberId:string
):void{
 const byId=new Map(goals.map(goal=>[goal.id,goal]));
 for(const row of rows){
   if(!expectedMemberId||row.memberId!==expectedMemberId)throw new Error('Владелец операции не совпадает с владельцем выписки');
   if(!isSavingsTransfer(row)){
     if(row.externalSavingsConfirmed===true)throw new Error('Уберите отметку внешнего перевода у обычной операции');
     continue;
   }
   if(row.externalSavingsConfirmed===true){
     if(row.linkedGoalId)throw new Error('Нельзя одновременно указать цель и перевод без цели');
     continue;
   }
   if(!row.linkedGoalId)throw new Error('Выберите цель или банковский перевод без цели для всех накопительных операций');
   if(byId.get(row.linkedGoalId)?.memberId!==expectedMemberId)throw new Error('Накопительная цель недоступна или принадлежит другому участнику');
 }
}
