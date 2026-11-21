import { isSavingsTransfer } from './savingsSync';

type SavingsLike = {
  id:string;
  type:'income'|'expense';
  amount:number;
  category?:string;
  note?:string;
  rawNote?:string;
  linkedGoalId?:string;
};

const kopecks=(value:number)=>Number.isFinite(value)?Math.round(value*100):0;

export function savingsContributionKopecks(tx:SavingsLike|null|undefined):number{
  if(!tx || !isSavingsTransfer(tx))return 0;
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
