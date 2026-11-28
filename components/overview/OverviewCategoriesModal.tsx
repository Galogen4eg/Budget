import React from 'react';
import {createPortal} from 'react-dom';
import {motion,useReducedMotion} from 'framer-motion';
import {ChevronRight,X} from 'lucide-react';
import {useModalSurface} from '../../hooks/useDialogFocus';
import useModalBackHandler from '../../hooks/useModalBackHandler';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import {terraTransition} from '../../utils/uiMotion';
import {formatBudgetMoney} from '../../utils/budgetFinancialMath';
import {ICON_ACTION,TOOLBAR_ACTION_IDLE} from '../filterUiTokens';

type Item={id:string;name:string;amount:number;percent:number;color:string};
type Props={items:Item[];total:number;period:string;privacyMode:boolean;onClose:()=>void;onSelect:(id:string)=>void;testId?:string};
export function OverviewCategoriesModal({items,total,period,privacyMode,onClose,onSelect,testId='overview-all-categories'}:Props){
 useBodyScrollLock(true);
 useModalBackHandler(true,onClose);
 const surface=useModalSurface(onClose,{initialSelector:'[aria-label="Закрыть список категорий"]'});
 const reduced=Boolean(useReducedMotion());
 const amount=(value:number)=>privacyMode?'••••••':formatBudgetMoney(value)+' ₽';
 return createPortal(
  <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
   <motion.div {...surface} role="dialog" aria-modal="true" aria-labelledby="overview-all-categories-title" data-testid={testId}
    initial={reduced?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={terraTransition(reduced,.20)}
    className="flex flex-col w-full max-w-xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-hidden bg-[var(--terra-surface)] text-[var(--terra-ink)] sm:rounded-2xl border border-[var(--terra-border)] shadow-xl pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]" onClick={event=>event.stopPropagation()}>
    <header className="flex items-start justify-between gap-2 p-4 border-b border-[var(--terra-border)] shrink-0">
     <div className="min-w-0">
      <h2 id="overview-all-categories-title" className="font-headline text-lg font-semibold">Категории расходов</h2>
      <p className="text-sm text-[var(--terra-muted)]">{period} · Категорий: {items.length}</p>
      <p className="mt-1 text-sm tabular-nums [overflow-wrap:anywhere]">Всего: <strong data-testid="overview-all-categories-total">{amount(total)}</strong></p>
     </div>
     <button type="button" className={ICON_ACTION+' '+TOOLBAR_ACTION_IDLE+' shrink-0'} aria-label="Закрыть список категорий" onClick={onClose}><X size={18} aria-hidden="true"/></button>
    </header>
    <div data-testid="overview-all-categories-scroll" className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 sm:px-4 divide-y divide-[var(--terra-border)]">
     {items.map(item=><button type="button" key={item.id} data-category-id={item.id} aria-label={'Операции категории: '+item.name}
       onClick={()=>onSelect(item.id)} className="min-h-[52px] w-full flex items-center gap-2 py-2 text-left rounded-lg hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
       <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor:item.color}}/>
       <span className="flex-1 min-w-0 text-sm font-medium [overflow-wrap:anywhere]">{item.name}</span>
       <span className="text-right min-w-0 max-w-[46%] tabular-nums [overflow-wrap:anywhere]">
        <span className="block text-sm font-semibold">{amount(item.amount)}</span>
        {!privacyMode&&<span className="block text-xs text-[var(--terra-muted)]">{item.percent}%</span>}
       </span>
       <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-[var(--terra-muted)]"/>
     </button>)}
     {items.length===0&&<p className="py-6 text-sm text-[var(--terra-muted)]">За выбранный период расходов нет.</p>}
    </div>
   </motion.div>
  </div>,document.body);
}
