import React,{useState,useRef} from 'react';
import {Pencil,Trash2} from 'lucide-react';
import type {PantryItem} from '../types';
import {updateItem,deleteItem} from '../utils/db';
import {normalizePantryEdit} from '../utils/pantryMove';
import {toast} from 'sonner';
type Props={familyId:string|null;items:PantryItem[];ready:boolean};
type Draft={id:string;amount:string;unit:string;expiryDate:string};
const field='w-full min-w-0 min-h-[44px] rounded-lg border border-[var(--terra-border)] bg-[var(--terra-surface)] px-3 text-sm text-[var(--terra-ink)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]';
const action='min-h-[44px] min-w-[44px] px-3 rounded-lg text-sm font-medium focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] disabled:opacity-50';
export default function PantryInventory({familyId,items,ready}:Props){
 const [draft,setDraft]=useState<Draft|null>(null);
 const [confirmId,setConfirmId]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const pending=useRef(false);
 const [error,setError]=useState('');
 const run=async(work:(id:string)=>Promise<void>)=>{
  if(pending.current||!familyId||!ready)return;
  pending.current=true;setBusy(true);setError('');
  try{await work(familyId);setDraft(null);setConfirmId(null);}
  catch(e){setError(e instanceof Error?e.message:'Не удалось сохранить изменения');}
  finally{pending.current=false;setBusy(false);}
 };
 if(!ready)return <p role="status" className="text-sm text-[var(--terra-muted)]">Ожидаем данные кладовой…</p>;
 if(!items.length)return <p className="py-2 text-sm text-[var(--terra-muted)]">Кладовая пуста. Перенесите сюда купленный товар.</p>;
 return <div className="space-y-2 min-w-0">
 <ul className="divide-y divide-[var(--terra-border)] max-h-[min(32dvh,16rem)] overflow-y-auto overscroll-contain">
 {items.map(item=><li data-pantry-id={item.id} key={item.id} className="py-2 flex flex-wrap items-center gap-2 text-sm">
 <div className="flex-1 min-w-0"><div className="font-semibold break-words">{item.title}</div><div className="tabular-nums text-[var(--terra-muted)]">{item.amount} {item.unit}</div><div className="text-xs text-[var(--terra-muted)]">{item.expiryDate?'Годен до: '+item.expiryDate.slice(0,10).split('-').reverse().join('.'):'Срок не указан'}</div></div>
 <button type="button" className={action} aria-label={'Редактировать запас: '+item.title} disabled={busy||!familyId} onClick={()=>{setError('');setConfirmId(null);setDraft({id:item.id,amount:item.amount,unit:item.unit,expiryDate:item.expiryDate?.slice(0,10)||''});}}><Pencil size={16}/></button>
 <button type="button" className={action+' text-[var(--terra-danger-text)]'} aria-label={'Удалить запас: '+item.title} disabled={busy||!familyId} onClick={()=>{setError('');setDraft(null);setConfirmId(item.id);}}><Trash2 size={16}/></button>
 </li>)}
 </ul>
 {draft&&<form className="space-y-2 border-t border-[var(--terra-border)] pt-3" onSubmit={e=>{e.preventDefault();void run(async id=>{if(!items.some(x=>x.id===draft.id))throw Error('Запас уже удалён');await updateItem(id,'pantry',draft.id,normalizePantryEdit(draft));toast.success('Запас обновлён');});}}>
 <h3 className="font-semibold text-sm">{items.find(x=>x.id===draft.id)?.title||'Запас'}</h3>
 <div className="grid grid-cols-2 gap-2"><label className="text-sm min-w-0">Количество<input className={field} inputMode="decimal" required value={draft.amount} disabled={busy} onChange={e=>setDraft({...draft,amount:e.target.value})}/></label>
 <label className="text-sm min-w-0">Единица<input className={field} required maxLength={30} value={draft.unit} disabled={busy} onChange={e=>setDraft({...draft,unit:e.target.value})}/></label></div>
 <label className="block text-sm">Годен до<input className={field} type="date" value={draft.expiryDate} disabled={busy} onChange={e=>setDraft({...draft,expiryDate:e.target.value})}/></label>
 <div className="flex flex-wrap gap-2"><button type="submit" className={action+' bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)]'} disabled={busy||!familyId}>{busy?'Сохранение…':'Сохранить'}</button><button type="button" className={action} disabled={busy} onClick={()=>{setDraft(null);setError('');}}>Отмена</button></div></form>}
 {confirmId&&<div className="space-y-2 border-t border-[var(--terra-border)] pt-3"><p className="text-sm">Удалить «{items.find(x=>x.id===confirmId)?.title||'запас'}» из кладовой?</p><div className="flex gap-2"><button type="button" disabled={busy||!familyId} className={action+' text-[var(--terra-danger-text)]'} onClick={()=>void run(async id=>{await deleteItem(id,'pantry',confirmId);toast.success('Запас удалён');})}>Удалить</button><button type="button" className={action} disabled={busy} onClick={()=>{setConfirmId(null);setError('');}}>Отмена</button></div></div>}
 {error&&<p role="alert" className="text-sm text-[var(--terra-danger-text)]">{error}</p>}
 </div>;
}
