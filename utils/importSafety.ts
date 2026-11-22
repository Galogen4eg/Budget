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
