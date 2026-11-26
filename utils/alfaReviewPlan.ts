import type { Transaction } from '../types';
import { isEligibleForImport } from './importSafety.ts';
import { isSavingsTransfer } from './savingsSync.ts';
export type AlfaReviewReason='category'|'savings';
export type AlfaReviewPlanRow={row:Transaction;reason:AlfaReviewReason|null};
export type AlfaReviewEntry={id:string;row:Transaction;reason:AlfaReviewReason;createdAt:string};
export type AlfaReviewResult={fileSha256:string;requested:number;created:number;existing:number;queued:number;unverified:number};
type ImportCategory={id:string;transactionType?:'income'|'expense'};
export function planAlfaReview(rows:readonly Transaction[],categories:readonly ImportCategory[],memberId:string):AlfaReviewPlanRow[]{
 if(!memberId||!rows.length)throw new Error('Invalid import owner or empty statement');
 const ids=new Set<string>();
 return rows.map(source=>{
  if(!/^alfa_[a-f0-9]{40}$/.test(source.id)||ids.has(source.id)||source.memberId!==memberId||
     !['income','expense'].includes(source.type)||!Number.isFinite(source.amount)||source.amount<=0||
     !Number.isSafeInteger(Math.round(source.amount*100))||Math.abs(source.amount*100-Math.round(source.amount*100))>0.000001||
     typeof source.date!=='string'||!Number.isFinite(Date.parse(source.date))||typeof source.note!=='string'||
     typeof source.category!=='string')throw new Error('Invalid Alfa review row');
  ids.add(source.id);
  const reason:AlfaReviewReason|null=isSavingsTransfer(source)||source.externalSavingsConfirmed===true?'savings':!isEligibleForImport(source,categories)?'category':null;
  const row:Transaction={id:source.id,memberId,type:source.type,amount:source.amount,date:source.date,note:source.note,category:source.category,
   ...(typeof source.rawNote==='string'?{rawNote:source.rawNote}:{}),
   ...(typeof source.payee==='string'?{payee:source.payee}:{}),
   ...(typeof source.subcategory==='string'?{subcategory:source.subcategory}:{})};
  return {row,reason};
 });
}
export function assertAlfaReviewResult(result:AlfaReviewResult,sha:string):void{
 if(!/^[a-f0-9]{64}$/.test(sha)||result.fileSha256!==sha||
    ![result.requested,result.created,result.existing,result.queued,result.unverified].every(n=>Number.isSafeInteger(n)&&n>=0)||
    result.requested<1||result.created+result.existing+result.queued+result.unverified!==result.requested)
  throw new Error('Invalid review result');
}
