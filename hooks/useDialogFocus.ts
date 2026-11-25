import {useEffect,type KeyboardEvent,type RefObject} from 'react';
function focusable(root:HTMLElement) {
 return Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]')).filter(el=>el.tabIndex>=0&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('[inert]'));
}
export function useDialogFocus(dialog:RefObject<HTMLDivElement>,initial:RefObject<HTMLElement>,onClose:()=>void){
 useEffect(()=>{
  const node=dialog.current;if(!node)return;
  const previous=document.activeElement;
  const app=document.getElementById('root');
  const background=app&&!app.contains(node)?app:null;
  const wasInert=background?.inert??false;
  (initial.current??focusable(node)[0])?.focus();
  if(background)background.inert=true;
  return()=>{if(background)background.inert=wasInert;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
 },[dialog,initial]);
 return (event:KeyboardEvent<HTMLDivElement>)=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();return;}
  if(event.key!=='Tab'||!dialog.current)return;
  const elements=focusable(dialog.current);
  if(!elements.length){event.preventDefault();return;}
  const first=elements[0],last=elements[elements.length-1],active=document.activeElement;
  if(event.shiftKey&&(active===first||!dialog.current.contains(active))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(active===last||!dialog.current.contains(active))){event.preventDefault();first.focus();}
 };
}
