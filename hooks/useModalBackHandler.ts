import { useEffect, useRef } from 'react';
import { modalBackTarget } from '../utils/modalBackTarget';

type Entry={id:string;close:()=>void};
const entries:Entry[]=[];
let sequence=0;
function onPopState(event:PopStateEvent){
 const id=modalBackTarget(entries.map(entry=>entry.id),event.state?.modalId);
 if(id===null)return;
 const entry=entries[entries.length-1];
 // Consume exactly one active registration before invoking its callback.
 if(entry?.id===id){entries.pop();entry.close();}
}
export function useModalBackHandler(isOpen:boolean,onClose:()=>void){
 const onCloseRef=useRef(onClose);
 onCloseRef.current=onClose;
 useEffect(()=>{
  if(!isOpen)return;
  const id='terra-modal-'+Date.now()+'-'+(++sequence);
  try{
   window.history.pushState({...window.history.state,modalId:id},'');
  }catch(error){
   console.warn('Failed to push modal history state:',error);
   return;
  }
  const entry:Entry={id,close:()=>onCloseRef.current()};
  if(entries.length===0)window.addEventListener('popstate',onPopState);
  entries.push(entry);
  return ()=>{
   const index=entries.indexOf(entry);
   if(index>=0)entries.splice(index,1);
   if(entries.length===0)window.removeEventListener('popstate',onPopState);
   // Do not call history.back() on ordinary close: that could close a parent.
  };
 },[isOpen]);
}
export default useModalBackHandler;
