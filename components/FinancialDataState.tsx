import React from 'react';
import type { FinancialReadStatus } from '../utils/financialReadState';
export function FinancialDataState({status,onRetry,onSettings}:{status:FinancialReadStatus;onRetry:()=>void;onSettings?:()=>void}){
 const error=status==='error',stale=status==='stale';
 return <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center gap-3 px-5 py-8 text-center bg-[var(--terra-canvas)] text-[var(--terra-ink)]">
  <h2 className="text-lg font-semibold" role={error?'alert':'status'}>{error?'Финансовые данные недоступны':stale?'Данные ожидают подтверждения сервера':'Загрузка финансовых данных…'}</h2>
  <p className="max-w-sm text-sm text-[var(--terra-muted)]">{error?'Не удалось получить актуальные данные. Суммы скрыты до восстановления доступа.':stale?'Проверьте подключение. Неподтверждённые остатки не показаны.':'Ожидаем данные семейного бюджета.'}</p>
  {error&&<button type="button" onClick={onRetry} className="min-h-[44px] rounded-xl px-4 bg-[var(--terra-primary)] text-white font-semibold focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">Повторить загрузку</button>}
  {onSettings&&<button type="button" onClick={onSettings} className="min-h-[44px] rounded-xl px-4 border border-[var(--terra-border)]">Настройки</button>}
 </div>;
}
