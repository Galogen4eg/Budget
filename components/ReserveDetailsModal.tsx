import { useModalSurface } from '../hooks/useDialogFocus';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {terraTransition} from '../utils/uiMotion';
import useModalBackHandler from '../hooks/useModalBackHandler';
import {ICON_ACTION,TOOLBAR_ACTION,TOOLBAR_ACTION_IDLE,TOOLBAR_ACTION_PRIMARY} from './filterUiTokens';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import { 
  X, Lock, ShieldCheck, Receipt, PiggyBank, Box, Coins, 
  Info, Clock, Calendar, Check, ArrowRight, Edit3, CheckCircle2, RotateCcw,
  CreditCard, Home, Link2
} from 'lucide-react';
import { MandatoryExpense } from '../types';
import { reserveSelection } from '../utils/reserveSelection';
import { parseDebtAmount } from '../utils/debtEdit';
import { formatBudgetMoney } from '../utils/budgetFinancialMath';

export interface DetailedMandatoryExpense {
  expense: MandatoryExpense;
  amountNeeded: number;
  paidAmount?: number;
  isPaid: boolean;
  isManuallyPaid: boolean;
  isOverdue?: boolean;
  subtitle?: string;
}

export interface ReserveDetailsModalProps {
  isOpen?: boolean;
  onClose: () => void;
  totalBalance: number;
  reservedAmount: number;
  totalReserved?: number;
  savingsAmount?: number;
  manualReserved?: number;
  manualReservedAmount?: number;
  mandatoryAmount?: number;
  unpaidMandatoryTotal: number;
  availableBalance: number;
  availableForSavings?: number;
  dailyBudget?: number;
  daysRemaining?: number;
  savingsRate?: number;
  settings?: any;
  futureExpenses: DetailedMandatoryExpense[];
  onUpdateManualSavings?: (amount: number) => void | Promise<any>;
  onTogglePaid?: (expenseId: string, isPaid: boolean) => Promise<boolean>;
  onPayExpenses?: (expenseIds: string[]) => Promise<boolean>;
  onEditExpense?: (expense: MandatoryExpense) => void;
  privacyMode?: boolean;
  currency?: string;
  [key: string]: any;
}

export const ReserveDetailsModal: React.FC<ReserveDetailsModalProps> = ({
  isOpen,
  onClose,
  totalBalance,
  reservedAmount,
  savingsAmount = 0,
  manualReserved = 0,
  unpaidMandatoryTotal,
  availableBalance,
  savingsRate = 0,
  futureExpenses,
  onUpdateManualSavings,
  onTogglePaid,
  onPayExpenses,
  onEditExpense,
  privacyMode = false,
  currency = '₽'
}) => {
  useBodyScrollLock(isOpen ?? true);
  useModalBackHandler(isOpen??true,onClose);
  const reduced=Boolean(useReducedMotion());
  const surface=useModalSurface(onClose,{enabled:isOpen??true,initialSelector:'[aria-label="Закрыть"]'});

  const currentMonthName = useMemo(() => {
    const raw = new Date().toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  const [manualInput, setManualInput] = useState<string>(() => String(manualReserved || 0));
  const [busy,setBusy]=useState(false);
  const pending=useRef(false);
  const [actionError,setActionError]=useState('');

  const rawBillsList=futureExpenses;

  // Selected bills for payment
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(() => {
    return new Set(rawBillsList.filter(b => !b.isPaid).map(b => b.expense.id));
  });

  useEffect(() => {
    setManualInput(String(manualReserved || 0));
  }, [manualReserved]);

  async function saveManual(raw:string){
    if(pending.current||!onUpdateManualSavings)return;
    setActionError('');
    try{
      const value=parseDebtAmount(raw);
      if(value===manualReserved){setManualInput(String(value));return;}
      pending.current=true;setBusy(true);
      await onUpdateManualSavings(value);
      setManualInput(String(value));
    }catch(error){
      setActionError(pending.current?'Не удалось сохранить резерв. Повторите попытку.':error instanceof Error?error.message:'Проверьте сумму.');
      setManualInput(raw);
    }finally{pending.current=false;setBusy(false);}
  }
  const handleManualBlur=()=>{void saveManual(manualInput);};

  const handleToggleBill = (id: string) => {
    setSelectedBillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selection=useMemo(()=>reserveSelection(rawBillsList,selectedBillIds),[rawBillsList,selectedBillIds]);
  const selectedCount=selection.ids.length,selectedTotal=selection.total;
  async function performPayment(action:()=>Promise<boolean>){
    if(pending.current)return;
    pending.current=true;setBusy(true);setActionError('');
    try{
      if(!await action())setActionError('Отметка не изменена. Проверьте данные и повторите попытку.');
    }catch{
      setActionError('Не удалось сохранить отметку. Повторите попытку.');
    }finally{pending.current=false;setBusy(false);}
  }
  const handleCancelExpense=(e:React.MouseEvent,expenseId:string)=>{
    e.stopPropagation();e.preventDefault();
    if(onTogglePaid)void performPayment(()=>onTogglePaid(expenseId,false));
  };
  const handlePay=()=>{
    if(!onPayExpenses||!selection.ids.length)return;
    void performPayment(()=>onPayExpenses(selection.ids));
  };

  const formatMoney = (val: number) => {
    if (privacyMode) return '••••';
    return formatBudgetMoney(val);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>{if(!pending.current)onClose();}}>
      <motion.div {...surface} role="dialog" aria-modal="true" aria-labelledby="terra-reserve-heading" data-testid="terra-reserve-dialog"
        initial={reduced?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={terraTransition(reduced,.20)}
        className="terra-overview-dialog w-full max-w-4xl bg-[var(--terra-surface)] text-[var(--terra-ink)] border border-[var(--terra-border)] sm:rounded-2xl shadow-lg flex flex-col min-h-0 h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90dvh] overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]" onClick={e=>e.stopPropagation()}>
        <header className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 border-b border-[var(--terra-border)] shrink-0">
          <h2 id="terra-reserve-heading" className="text-lg font-headline font-semibold min-w-0">Структура резерва</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть" className={ICON_ACTION+' '+TOOLBAR_ACTION_IDLE}><X size={18}/></button>
        </header>
        <div data-testid="terra-reserve-scroll" className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y p-3 sm:p-4 space-y-3">
          <section aria-label="Состав резерва" className="rounded-xl border border-[var(--terra-border)] p-3 space-y-3">
            <div>
              <h3 className="text-sm text-[var(--terra-muted)]">Всего в резерве</h3>
              <p data-testid="reserve-total" className="text-2xl font-headline font-semibold tabular-nums [overflow-wrap:anywhere]">{formatMoney(reservedAmount)} {!privacyMode&&currency}</p>
              <p className="text-xs text-[var(--terra-muted)]">Исключено из доступных средств при расчёте бюджета.</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 border-t border-[var(--terra-border)] pt-3">
              <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">Автокопилка · {savingsRate.toLocaleString('ru-RU')}%</dt><dd className="text-base font-semibold tabular-nums [overflow-wrap:anywhere]">{formatMoney(savingsAmount)} {!privacyMode&&currency}</dd></div>
              <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">Обязательные платежи</dt><dd className="text-base font-semibold tabular-nums [overflow-wrap:anywhere]">{formatMoney(unpaidMandatoryTotal)} {!privacyMode&&currency}</dd></div>
              <div className="min-w-0 col-span-2 sm:col-span-1"><dt className="text-xs text-[var(--terra-muted)]">Ручной резерв</dt><dd className="min-w-0">{privacyMode?<span>••••</span>:<div className="flex items-center gap-2 mt-1">
                <input type="text" inputMode="decimal" disabled={busy||!onUpdateManualSavings} value={manualInput} onChange={e=>setManualInput(e.target.value)}
                  onBlur={handleManualBlur} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}}} aria-label="Сумма вручную"
                  className="w-full min-w-0 min-h-[44px] bg-[var(--terra-surface)] rounded-lg border border-[var(--terra-control-border)] px-2 text-base tabular-nums focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"/>
                <span className="text-sm text-[var(--terra-muted)]">{currency}</span>
              </div>}</dd></div>
              <div className="min-w-0 col-span-2 sm:col-span-1"><dt className="text-xs text-[var(--terra-muted)]">Свободно после резервов</dt><dd className="text-base font-semibold tabular-nums [overflow-wrap:anywhere]">{formatMoney(availableBalance)} {!privacyMode&&currency}</dd></div>
            </dl>
            <button type="button" disabled={busy||privacyMode||!onUpdateManualSavings||availableBalance<=0} onClick={()=>void saveManual(String(Math.round((manualReserved+availableBalance)*100)/100))}
              className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE+' max-w-full h-auto min-h-[44px] whitespace-normal py-2 text-left'}>Добавить свободную сумму в резерв</button>
            <p className="text-xs text-[var(--terra-muted)]">Свободная сумма — расчётный остаток по текущим данным, не гарантия достаточности средств.</p>
          </section>
          <section aria-label="Обязательные платежи" className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-base font-semibold">Обязательные платежи ({rawBillsList.length})</h3><span className="text-xs text-[var(--terra-muted)]">{currentMonthName}</span></div>
            <div className="divide-y divide-[var(--terra-border)] border-y border-[var(--terra-border)]">
              {rawBillsList.length===0&&<p className="py-3 text-sm text-[var(--terra-muted)]">Нет обязательных платежей</p>}
              {rawBillsList.map(item=>{
                const isChecked=selectedBillIds.has(item.expense.id),isPaid=item.isPaid;
                const isDebt=item.expense.expenseType==='debt'||Boolean(item.expense.linkedDebtId);
                return <div key={item.expense.id} data-reserve-bill className="terra-reserve-bill grid items-center gap-2 py-2 min-w-0">
                  {isPaid?<span className="w-11 h-11 flex items-center justify-center text-[var(--terra-primary-text)]"><Check size={18} aria-hidden="true"/></span>:
                    <label className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-[var(--terra-soft)]"><input type="checkbox" checked={isChecked} disabled={busy} aria-label={`Выбрать платёж: ${item.expense.name}`} onChange={()=>handleToggleBill(item.expense.id)} className="w-5 h-5 accent-[var(--terra-primary-solid)]"/></label>}
                  <div className="min-w-0"><p className="text-sm font-semibold [overflow-wrap:anywhere]">{item.expense.name}</p>
                    <p className="text-xs text-[var(--terra-muted)] [overflow-wrap:anywhere]">{item.subtitle|| (isDebt?'Кредит / долг':'Бытовой счёт')}</p>
                    <p className={`text-xs ${isPaid?'text-[var(--terra-primary-text)]':item.isOverdue?'text-[var(--terra-danger-text)]':'text-[var(--terra-muted)]'}`}>{isPaid?'Оплачено':item.isOverdue?'Просрочено':`До ${item.expense.day} числа`}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-right min-w-0 [overflow-wrap:anywhere]">{formatMoney(item.expense.amount)} {!privacyMode&&currency}</span>
                  <div className="terra-reserve-bill-actions flex flex-wrap justify-end gap-1 min-w-0">
                    {onEditExpense&&<button type="button" disabled={busy} onClick={e=>{e.preventDefault();e.stopPropagation();onEditExpense(item.expense);onClose();}}
                      aria-label={`Редактировать обязательный платеж: ${item.expense.name}`} className={ICON_ACTION+' '+TOOLBAR_ACTION_IDLE}><Edit3 size={16}/></button>}
                    {isPaid&&<button type="button" onClick={e=>handleCancelExpense(e,item.expense.id)} disabled={busy||!onTogglePaid}
                      aria-label={`Отменить отметку об оплате: ${item.expense.name}`} className={ICON_ACTION+' '+TOOLBAR_ACTION_IDLE}><RotateCcw size={16}/></button>}
                  </div>
                </div>;
              })}
            </div>
          </section>
        </div>
        <footer className="terra-overview-dialog-footer border-t border-[var(--terra-border)] p-3 sm:p-4 space-y-2 shrink-0">
          {actionError&&<p role="alert" className="text-sm text-[var(--terra-danger-text)]">{actionError}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 text-xs text-[var(--terra-muted)]">Выбрано: {selectedCount}<p className="text-sm font-semibold text-[var(--terra-ink)] tabular-nums [overflow-wrap:anywhere]">Итого: {formatMoney(selectedTotal)} {!privacyMode&&currency}</p></div>
            <button type="button" onClick={handlePay} disabled={busy||selectedCount===0||!onPayExpenses} aria-busy={busy}
              className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_PRIMARY+' min-h-[44px] h-auto max-w-full whitespace-normal py-2 terra-press'}>{busy?'Сохранение…':'Отметить выбранные как оплаченные'}</button>
          </div>
        </footer>
      </motion.div>
    </div>,document.body
  );
};

export default ReserveDetailsModal;
