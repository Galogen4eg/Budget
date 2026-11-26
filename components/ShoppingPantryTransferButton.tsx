import React,{useRef,useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {toast} from 'sonner';
import type {ShoppingItem} from '../types';
export default function ShoppingPantryTransferButton({item,onMoveToPantry}:{item:ShoppingItem;onMoveToPantry:(item:ShoppingItem)=>Promise<void>}){
 const pending=useRef(false);
 const [busy,setBusy]=useState(false);
 const move=async()=>{
  if(pending.current)return;
  pending.current=true;setBusy(true);
  try{await onMoveToPantry(item);toast.success('Товар перемещён в кладовую');}
  catch{toast.error('Не удалось подтвердить перенос в кладовую. Проверьте список перед повтором.');}
  finally{pending.current=false;setBusy(false);}
 };
 return <button type="button" disabled={busy} aria-busy={busy} onClick={event=>{event.stopPropagation();void move();}}
  title="В кладовку" aria-label={'В кладовку: '+item.title}
  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[var(--terra-primary-text)] hover:bg-[var(--terra-primary-soft)] transition-colors terra-press focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] disabled:opacity-50">
  <ArrowRight size={17} aria-hidden="true"/>
 </button>;
}
