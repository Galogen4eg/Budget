import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useModalSurface } from '../hooks/useDialogFocus';
import useModalBackHandler from '../hooks/useModalBackHandler';
import { terraTransition } from '../utils/uiMotion';
import { X, Calendar, ArrowUpRight, ArrowDownRight, Tag, Clock } from 'lucide-react';
import { Transaction, Category, FamilyMember } from '../types';
import BrandIcon from './BrandIcon';
import { getMerchantBrandKey } from '../utils/categorizer';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import { monthlyMoneyTotals, formatBudgetMoney, formatSignedBudgetMoney } from '../utils/budgetFinancialMath';
import {ICON_ACTION,TOOLBAR_ACTION,TOOLBAR_ACTION_IDLE,TOOLBAR_ACTION_PRIMARY} from './filterUiTokens';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  transactions: Transaction[];
  categories: Category[];
  members: FamilyMember[];
  onEditTransaction: (tx: Transaction) => void;
  onAddTransactionForDay: () => void;
  dailySafeLimit: number;
  privacyMode: boolean;
}

/**
 * DayDetailModal: Detailed view of a single day's financial report matching the user mockup.
 * Displays income, expenses, daily balance, list of operations with member badges and quick receipt entry.
 */
const DayDetailModal: React.FC<DayDetailModalProps> = ({
  isOpen,
  onClose,
  date,
  transactions,
  categories,
  members,
  onEditTransaction,
  onAddTransactionForDay,
  dailySafeLimit,
  privacyMode
}) => {
  useBodyScrollLock(isOpen);
  useModalBackHandler(isOpen,onClose);
  const surface=useModalSurface(onClose,{enabled:isOpen,initialSelector:'[aria-label="Закрыть детали дня"]'});
  const reduced=Boolean(useReducedMotion());

  if (!isOpen) return null;

  const dayTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getDate() === date.getDate() && 
           d.getMonth() === date.getMonth() && 
           d.getFullYear() === date.getFullYear();
  });

  const { income, expense, net } = monthlyMoneyTotals(dayTransactions);

  const dayNumber = date.getDate();
  const dayName = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isToday = new Date().toDateString() === date.toDateString();

  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={reduced?false:{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }} transition={terraTransition(reduced,.18)}
        className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div 
          {...surface} role="dialog" aria-modal="true" aria-labelledby="terra-day-detail-heading" data-testid="terra-day-detail"
          initial={reduced?false:{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 6, opacity: 0 }}
          transition={terraTransition(reduced,.2)}
          className="terra-overview-dialog bg-[var(--terra-surface)] text-[var(--terra-ink)] w-full max-w-3xl rounded-none sm:rounded-2xl border border-[var(--terra-border)] shadow-lg flex flex-col min-h-0 h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90dvh] overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
          onClick={(e) => e.stopPropagation()}
        >

          <header className="flex items-center justify-between gap-2 p-3 sm:p-4 border-b border-[var(--terra-border)] shrink-0">
            <div className="min-w-0">
              <h3 id="terra-day-detail-heading" className="text-lg font-semibold font-headline text-[var(--terra-ink)] capitalize [overflow-wrap:anywhere]">{dayName}</h3>
              {isToday&&<p className="text-xs text-[var(--terra-muted)]">Сегодня</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Закрыть детали дня" className={ICON_ACTION+' '+TOOLBAR_ACTION_IDLE}><X size={18}/></button>
          </header>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y p-3 sm:p-4 space-y-3" data-testid="terra-day-detail-scroll">
            <dl className="terra-day-metrics grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl border border-[var(--terra-border)] tabular-nums">
              <div className="col-span-2 sm:col-span-1 min-w-0"><dt className="text-xs text-[var(--terra-muted)]">Баланс дня</dt><dd data-testid="day-detail-net" className={`text-lg font-semibold [overflow-wrap:anywhere] ${!privacyMode&&net<0?'text-[var(--terra-danger-text)]':'text-[var(--terra-ink)]'}`}>{formatSignedBudgetMoney(net,privacyMode,true)}</dd></div>
              <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">Доходы</dt><dd data-testid="day-detail-income" className="text-base font-semibold [overflow-wrap:anywhere] text-[var(--terra-primary-text)]">{formatSignedBudgetMoney(income,privacyMode,true)}</dd></div>
              <div className="min-w-0"><dt className="text-xs text-[var(--terra-muted)]">Расходы</dt><dd data-testid="day-detail-expense" className="text-base font-semibold [overflow-wrap:anywhere]">{formatSignedBudgetMoney(-expense,privacyMode)}</dd></div>
              <div className="col-span-full flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--terra-border)] pt-2 text-sm"><dt className="text-[var(--terra-muted)]">Дневной ориентир</dt><dd className="font-medium tabular-nums">{privacyMode?'•••':dailySafeLimit>0?formatBudgetMoney(dailySafeLimit)+' ₽/день':'Не задан'}</dd></div>
            </dl>
        {/* Transactions list */}
        <div className="space-y-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--terra-ink)]">
                Операции за {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </span>
              <span className="text-[11px] text-[var(--terra-muted)] font-medium">
                {dayTransactions.length}
              </span>
            </div>

            {dayTransactions.length === 0 ? (
              <div className="text-center py-6 text-[var(--terra-muted)] text-sm bg-[var(--terra-soft)] rounded-xl">
                Трат и доходов в этот день не зафиксировано
              </div>
            ) : (
              <div className="divide-y divide-[var(--terra-border)]">
                {dayTransactions.map(tx => {
                  const category = categories.find(c => c.id === tx.category);
                  const member = members.find(m => m.id === tx.memberId);
                  const displayTitle = tx.payee || tx.note || tx.rawNote || category?.label || 'Операция';
                  const brandKey = getMerchantBrandKey(displayTitle);

                  return (
                    <button type="button"
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      aria-label={`Редактировать операцию: ${displayTitle}`} className="terra-overview-history-row min-h-[56px] w-full py-2 text-left items-center hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
                    >
                      <div className="contents">
                        <div className="w-9 h-9 shrink-0">
                          <BrandIcon name={displayTitle} brandKey={brandKey} category={category} size="sm" className="w-9 h-9"/>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex flex-wrap items-center gap-1">
                            <h5 className="text-sm font-medium text-[var(--terra-ink)] [overflow-wrap:anywhere]">
                              {displayTitle}
                            </h5>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              tx.type === 'income' 
                                ? 'bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)]' 
                                : 'bg-[var(--terra-soft)] text-[var(--terra-muted)]'
                            }`}>
                              {tx.type === 'income' ? 'Доход' : 'Расход'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--terra-muted)] mt-0.5">
                            {member && (
                              <span className="flex items-center gap-1 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.color }} />
                                {member.name}
                              </span>
                            )}
                            {category && <span>• {category.label}</span>}
                            {tx.rawNote && tx.rawNote !== displayTitle && (
                              <span className="truncate max-w-[120px]">({tx.rawNote})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right min-w-0 [overflow-wrap:anywhere]">
                        <div className={`text-sm font-bold font-headline tabular-nums ${
                          tx.type === 'income' ? 'text-[var(--terra-primary-text)]' : 'text-[var(--terra-ink)]'
                        }`}>
                          {formatSignedBudgetMoney(tx.type === 'expense' ? -tx.amount : tx.amount,privacyMode,true)}
                        </div>

                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

          </div>
        {/* Footer with Actions */}
        <footer className="terra-overview-dialog-footer p-3 sm:px-4 border-t border-[var(--terra-border)] flex flex-wrap items-center justify-end gap-2 shrink-0">
          <button 
            onClick={onAddTransactionForDay}
            type="button" className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_PRIMARY+" terra-press"}
          >
            + Добавить операцию
          </button>
          
          <button 
            onClick={onClose}
            type="button" className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_IDLE}
          >
            Закрыть
          </button>
        </footer>
      </motion.div>
    </motion.div>
  </AnimatePresence>, document.body
  );
};

export default DayDetailModal;
