import React, { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion,useReducedMotion } from 'framer-motion';
import useModalBackHandler from '../hooks/useModalBackHandler';
import {terraTransition} from '../utils/uiMotion';
import { X } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { notificationView, markNotificationsRead, type NotificationFilter } from '../utils/notificationView';

interface NotificationsModalProps { readonly onClose: () => void; }
const control = 'min-h-[44px] min-w-[44px] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] transition-colors motion-reduce:transition-none';
export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
 const { notifications, setNotifications, dismissNotification } = useData();
 const [filter,setFilter] = useState<NotificationFilter>('all');
 const {items,unread} = notificationView(notifications,filter);
 const headingId = useId();
 const closeRef = useRef<HTMLButtonElement>(null);
 useBodyScrollLock();
 useModalBackHandler(true,onClose);
 const reduced=Boolean(useReducedMotion());
 const dialogRef=useRef<HTMLDivElement>(null);
 const onDialogKeyDown=useDialogFocus(dialogRef,closeRef,onClose);
 return createPortal(
  <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center sm:p-4">
   <motion.div initial={reduced?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={terraTransition(reduced,.18)} onClick={onClose} aria-hidden="true" className="absolute inset-0 bg-black/40"/>
   <motion.div ref={dialogRef} tabIndex={-1} data-terra-dialog role="dialog" aria-modal="true" aria-labelledby={headingId}
    onKeyDown={onDialogKeyDown}
    data-terra-settle-panel data-testid="terra-notifications-dialog"
    initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}} transition={terraTransition(reduced,.18)}
    className="relative w-full max-w-[480px] h-[100dvh] sm:h-auto sm:max-h-[85dvh] bg-[var(--terra-surface)] text-[var(--terra-ink)] sm:rounded-2xl sm:border border-[var(--terra-border)] flex flex-col overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
    <header className="px-3 sm:px-4 py-2 border-b border-[var(--terra-border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
     <div className="flex items-center gap-2 min-w-0">
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Закрыть" className={control+' flex items-center justify-center hover:bg-[var(--terra-soft)]'}><X size={20} aria-hidden="true"/></button>
      <h2 id={headingId} className="text-lg font-semibold">Уведомления</h2>
     </div>
     <button type="button" onClick={()=>setNotifications(markNotificationsRead)} disabled={unread===0} className={control+' px-3 text-sm font-semibold hover:bg-[var(--terra-soft)] disabled:opacity-50'}>Прочитать все</button>
    </header>
    <div role="group" aria-label="Фильтр уведомлений" className="flex gap-2 px-4 py-2 shrink-0">
     {([{id:'all',label:'Все',count:notifications.length},{id:'unread',label:'Новые',count:unread}] as const).map(option=>
      <button key={option.id} type="button" aria-pressed={filter===option.id} onClick={()=>setFilter(option.id)} className={control+' px-3 text-sm font-medium '+(filter===option.id?'bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)] ring-1 ring-[var(--terra-primary-text)]':'bg-[var(--terra-soft)] text-[var(--terra-ink)]')}>{option.label} <span className="tabular-nums">{option.count}</span></button>
     )}
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 sm:px-4 divide-y divide-[var(--terra-border)]">
     {items.length===0 ? <p role="status" className="py-8 text-center text-sm text-[var(--terra-muted)]">{filter==='unread'?'Нет новых уведомлений':'Нет уведомлений'}</p> :
      items.map(item=><article key={item.id} className="py-3 flex gap-2 items-start">
       <div className="flex-1 min-w-0 break-words">
        <h3 className="text-sm font-semibold">{item.title}</h3>
        {!item.isRead&&<span className="text-xs text-[var(--terra-ink)]">Новое</span>}
        <p className="text-sm mt-1 leading-relaxed">{item.message}</p>
        {Number.isFinite(Date.parse(item.date))&&<time dateTime={item.date} className="text-xs text-[var(--terra-muted)]">{new Date(item.date).toLocaleString('ru-RU')}</time>}
       </div>
       <button type="button" onClick={()=>dismissNotification(item.id)} aria-label={'Скрыть уведомление: '+item.title} className={control+' flex items-center justify-center hover:bg-[var(--terra-surface)]'}><X size={18} aria-hidden="true"/></button>
      </article>)
     }
    </div>
   </motion.div>
  </div>,document.body
 );
};
export default NotificationsModal;
