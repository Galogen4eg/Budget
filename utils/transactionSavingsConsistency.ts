import { isSavingsTransfer } from './savingsSync.ts';

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

/** Link an already reconciled historical transfer; do not apply its contribution twice. */
export function savingsLinkRepairPatch(
 row:(SavingsLike&{memberId:string;date?:string})|undefined,
 expected:{id:string;owner:string|null;previousGoalId:string|null;amount:number|null;type:string|null;date:string|null},
 goal:{id:string;memberId?:string|null;currentAmount:number}|undefined,
 confirmed:{id:string;memberId:string|null;currentAmount:number|null}
):{linkedGoalId:string}{
 if(!row||!expected.owner||row.id!==expected.id||row.memberId!==expected.owner||
    (row.linkedGoalId||null)!==expected.previousGoalId||row.amount!==expected.amount||
    row.type!==expected.type||(row.date??null)!==expected.date||!isSavingsTransfer(row)||
    !Number.isFinite(row.amount))throw new Error('Операция изменилась. Повторите проверку.');
 if(!goal||goal.id!==confirmed.id||goal.memberId!==row.memberId||goal.memberId!==confirmed.memberId||
    !Number.isFinite(goal.currentAmount)||goal.currentAmount!==confirmed.currentAmount||
    goal.id===row.linkedGoalId)throw new Error('Цель изменилась или не принадлежит владельцу операции. Повторите проверку.');
 return {linkedGoalId:goal.id};
}
