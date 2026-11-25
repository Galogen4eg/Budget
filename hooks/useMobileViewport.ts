import {useEffect,useState} from 'react';
import {keyboardViewport} from '../utils/mobileViewport';
export function useMobileViewport(){
 const [state,setState]=useState<{keyboardOpen:boolean;height:number|null}>({keyboardOpen:false,height:null});
 useEffect(()=>{
  const vv=window.visualViewport;if(!vv)return;
  const mobile=window.matchMedia('(max-width:767px)');
  let baseline=Math.max(window.innerHeight,vv.height),frame=0;
  const update=()=>{
   const el=document.activeElement;
   const editable=el instanceof HTMLElement&&(el.isContentEditable||el instanceof HTMLTextAreaElement||(el instanceof HTMLInputElement&&!['checkbox','radio','button','submit','range','file','color','hidden'].includes(el.type)&&!el.readOnly));
   if(!editable||!mobile.matches)baseline=Math.max(window.innerHeight,vv.height);
   const next=keyboardViewport({mobile:mobile.matches,editable,scale:vv.scale,baseline,height:vv.height});
   setState(previous=>previous.keyboardOpen===next.keyboardOpen&&previous.height===next.height?previous:next);
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);};
  const orientation=()=>{baseline=Math.max(window.innerHeight,vv.height);schedule();};
  vv.addEventListener('resize',schedule);vv.addEventListener('scroll',schedule);window.addEventListener('resize',schedule);window.addEventListener('orientationchange',orientation);document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
  update();
  return()=>{cancelAnimationFrame(frame);vv.removeEventListener('resize',schedule);vv.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);window.removeEventListener('orientationchange',orientation);document.removeEventListener('focusin',schedule);document.removeEventListener('focusout',schedule);};
 },[]);
 return state;
}
