import { isSavingsTransfer } from './savingsSync.ts';

type SavingsLike = {
  id:string;
  type:'income'|'expense';
  amount:number;
  category?:string;
  note?:string;
  rawNote?:string;
  linkedGoalId?:string;
  externalSavingsConfirmed?:boolean;
};

const kopecks=(value:number)=>Number.isFinite(value)?Math.round(value*100):0;

// Keep financial classification intact; exclude reviewed external transfers only from goal accounting.
export function isGoalSavingsTransfer(tx:SavingsLike|null|undefined):boolean{
  return Boolean(tx&&isSavingsTransfer(tx)&&!(tx.externalSavingsConfirmed===true&&!tx.linkedGoalId));
}
export function savingsContributionKopecks(tx:SavingsLike|null|undefined):number{
  if(!tx || !isGoalSavingsTransfer(tx))return 0;
  return (tx.type==='expense'?1:-1)*kopecks(tx.amount);
}

/**
 * The caller supplies the CURRENT server balance. Never use a balance copied
 * from another user's React state. All currency arithmetic uses kopecks.
 */
export function nextSavingsGoalAmount(
  currentAmount:number,previousContributionKopecks:number,nextContributionKopecks:number
):number{
  return Math.max(0,kopecks(currentAmount)-previousContributionKopecks+nextContributionKopecks)/100;
}

/** Bulk deletion without goal adjustment would corrupt a household savings balance. */
export function assertBulkDeleteSafe(transactions:readonly SavingsLike[],ids:readonly string[]):void{
  const selected=new Set(ids);
  if(transactions.some(tx=>selected.has(tx.id)&&isSavingsTransfer(tx))){
    throw new Error('В выбранных операциях есть переводы в накопления. Удалите их по одной через карточку операции, чтобы баланс цели изменился вместе с записью.');
  }
}

/** Any historical reference must be preserved, even a malformed savings category. */
export function assertGoalDeletionSafe(goalId:string,transactions:readonly {linkedGoalId?:string}[]):void{
 if(!goalId)throw new Error('Накопительная цель недоступна');
 if(transactions.some(tx=>tx.linkedGoalId===goalId))throw new Error('Цель связана с операциями. Сначала корректно измените или удалите связанные переводы.');
}
