import React from 'react';
import type { FinancialReadStatus } from '../utils/financialReadState';
import { TOOLBAR_ACTION, TOOLBAR_ACTION_PRIMARY, TOOLBAR_ACTION_IDLE } from './filterUiTokens';
export function FinancialDataState({status,onRetry,onSettings,onNotifications,section='финансовые данные'}:{status:FinancialReadStatus;section?:string;onRetry:()=>void;onSettings?:()=>void;onNotifications?:()=>void}){
 const error=status==='error',stale=status==='stale',pending=status==='pending';
 return <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center gap-3 px-5 py-8 text-center bg-[var(--terra-canvas)] text-[var(--terra-ink)]">
  <h2 className="text-lg font-semibold" data-financial-state={status} role={error?'alert':'status'}>{error?'Не удалось загрузить '+section:stale?'Данные ожидают подтверждения сервера':pending?'Ожидает подтверждения':'Загрузка…'}</h2>
  <p className="max-w-sm text-sm text-[var(--terra-muted)]">{error?'Не удалось получить актуальные данные. Данные скрыты до восстановления доступа.':stale?'Проверьте подключение. Неподтверждённые данные не показаны.':pending?'Изменения ещё не подтверждены сервером. Не повторяйте запись.':'Ожидаем подтверждение сервера.'}</p>
  {(error||stale)&&<button type="button" onClick={onRetry} className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_PRIMARY}>Повторить загрузку</button>}
  {onNotifications&&<button type="button" onClick={onNotifications} className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_IDLE}>Уведомления</button>}
  {onSettings&&<button type="button" onClick={onSettings} className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_IDLE}>Настройки</button>}
 </div>;
}
