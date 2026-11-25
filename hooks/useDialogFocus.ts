import {useEffect,useRef,type KeyboardEvent,type RefObject} from 'react';

const selector='button:not([disabled]),a[href],input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[contenteditable=true],[tabindex]';
const focusable=(root:HTMLElement)=>Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(el=>el.tabIndex>=0&&!el.matches(':disabled')&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('[inert]'));
const stack:HTMLElement[]=[];
const changed=new Map<HTMLElement,boolean>();
const top=()=>stack[stack.length-1];
function syncInert(){
 for(const [element,previous] of changed)element.inert=previous;
 changed.clear();
 const node=top();
 if(!node)return;
 // Preserve the active overlay and its backdrop; disable sibling branches, including a parent dialog.
 for(let child:HTMLElement=node;child.parentElement&&child!==document.body;child=child.parentElement){
  for(const sibling of Array.from(child.parentElement.children)){
   if(sibling===child||!(sibling instanceof HTMLElement)||sibling.matches('script,style,link,[aria-live],[role=status],[role=alert],[data-sonner-toaster]'))continue;
   if(child===node&&!sibling.matches('[role=dialog], [role=alertdialog]')&&!sibling.querySelector(selector+', [role=dialog], [role=alertdialog]'))continue;
   changed.set(sibling,sibling.inert);sibling.inert=true;
  }
 }
}
type Options={enabled?:boolean;initialSelector?:string;variant?:string};
export function useDialogFocus<T extends HTMLElement>(dialog:RefObject<T>,initial:RefObject<HTMLElement>|undefined,onClose:()=>void,options:Options={}){
 const {enabled=true,initialSelector,variant}=options;
 const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{
  const node=dialog.current;
  if(!enabled||!node)return;
  const previous=document.activeElement;
  stack.push(node);syncInert();
  const preferred=initial?.current??(initialSelector?node.querySelector<HTMLElement>(initialSelector):null);
  const candidates=focusable(node);
  (preferred&&candidates.includes(preferred)?preferred:candidates[0]??node).focus({preventScroll:true});
  return()=>{
   const wasTop=top()===node;
   const index=stack.lastIndexOf(node);if(index>=0)stack.splice(index,1);
   syncInert();
   if(wasTop){
    if(previous instanceof HTMLElement&&previous.isConnected&&!previous.closest('[inert]'))previous.focus({preventScroll:true});
    else if(top())(focusable(top())[0]??top()).focus({preventScroll:true});
   }
  };
 },[dialog,initial,enabled,initialSelector,variant]);
 return (event:KeyboardEvent<T>)=>{
  if(!enabled||!dialog.current||top()!==dialog.current||event.defaultPrevented)return;
  if(event.key==='Escape'&&!event.nativeEvent.isComposing){
   event.preventDefault();event.stopPropagation();closeRef.current();return;
  }
  if(event.key!=='Tab')return;
  const elements=focusable(dialog.current);
  if(!elements.length){event.preventDefault();dialog.current.focus();return;}
  const first=elements[0],last=elements[elements.length-1],active=document.activeElement;
  if(event.shiftKey&&(active===first||!elements.includes(active as HTMLElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(active===last||!elements.includes(active as HTMLElement))){event.preventDefault();first.focus();}
 };
}
export function useModalSurface<T extends HTMLElement=HTMLDivElement>(onClose:()=>void,options:Options={}){
 const ref=useRef<T>(null);
 const onKeyDown=useDialogFocus(ref,undefined,onClose,options);
 return {ref,onKeyDown,tabIndex:-1,'data-terra-dialog':true as const};
}
