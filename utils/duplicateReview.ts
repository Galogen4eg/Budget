import type { Transaction } from '../types';

type Candidate = Pick<Transaction,'id'|'date'|'amount'|'type'|'note'|'rawNote'>;
const stableAlfaId=(id:string)=>/^alfa_[a-f0-9]{40}$/i.test(id);
const clean=(value?:string)=>(value||'').trim().toLocaleLowerCase('ru-RU');
/** Candidate ONLY: never proof of duplication or permission to delete. */
export function isPotentialDuplicate(left:Candidate,right:Candidate):boolean{
  if(left.id===right.id)return false;
  // Stable bank identifiers have priority over fuzzy matching: these are
  // two distinct purchases even if they share an amount and timestamp.
  if(stableAlfaId(left.id)&&stableAlfaId(right.id))return false;
  const a=new Date(left.date).getTime(),b=new Date(right.date).getTime();
  if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>86400000)return false;
  if(Math.round(left.amount*100)!==Math.round(right.amount*100)||left.type!==right.type)return false;
  const note1=clean(left.note),note2=clean(right.note);
  const raw1=clean(left.rawNote),raw2=clean(right.rawNote);
  return Boolean((note1&&note1===note2)||(raw1&&raw1===raw2));
}
