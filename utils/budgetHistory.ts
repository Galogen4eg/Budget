import type { Transaction, Category, FamilyMember } from '../types';

export type HistoryTransactionType='all'|'income'|'expense';

/** Filter visible history without mutating the shared financial ledger. */
export function filterBudgetHistory<T extends Pick<Transaction,
  'id'|'date'|'type'|'note'|'rawNote'|'category'|'memberId'>>(
  source:readonly T[],
  type:HistoryTransactionType,
  query:string,
  categories:readonly Pick<Category,'id'|'label'>[],
  members:readonly Pick<FamilyMember,'id'|'name'>[]
):T[]{
  const needle=query.trim().toLocaleLowerCase('ru-RU');
  const categoryNames=new Map(categories.map(item=>[item.id,item.label]));
  const memberNames=new Map(members.map(item=>[item.id,item.name]));
  return source.filter(tx=>{
    if(type!=='all' && tx.type!==type)return false;
    if(!needle)return true;
    return [tx.note,tx.rawNote,categoryNames.get(tx.category),memberNames.get(tx.memberId)]
      .some(part=>part?.toLocaleLowerCase('ru-RU').includes(needle));
  }).sort((left,right)=>{
    const a=new Date(left.date).getTime(), b=new Date(right.date).getTime();
    return (Number.isFinite(b)?b:0)-(Number.isFinite(a)?a:0)||left.id.localeCompare(right.id);
  });
}
