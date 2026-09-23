import React from 'react';
import { X, Calendar, ArrowUpRight, ArrowDownRight, Tag, Clock } from 'lucide-react';
import { Transaction, Category, FamilyMember } from '../types';
import BrandIcon from './BrandIcon';
import { getMerchantBrandKey } from '../utils/categorizer';

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
  if (!isOpen) return null;

  const dayTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getDate() === date.getDate() && 
           d.getMonth() === date.getMonth() && 
           d.getFullYear() === date.getFullYear();
  });

  const income = Math.round(dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0));
  const expense = Math.round(dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));
  const net = Math.round(income - expense);

  const dayNumber = date.getDate();
  const dayName = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isToday = new Date().toDateString() === date.toDateString();

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#2E3230]/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1C1C1E] w-full max-w-2xl rounded-2xl border border-surface-border dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-surface-border/80 dark:border-white/10 bg-[#FAF9F6] dark:bg-[#252528]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex flex-col items-center justify-center font-headline font-bold shadow-xs leading-none shrink-0">
              <span className="text-[10px] uppercase font-sans font-bold tracking-wider opacity-80">
                {date.toLocaleDateString('ru-RU', { month: 'short' })}
              </span>
              <span className="text-base leading-none">{dayNumber}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-headline text-graphite dark:text-white capitalize">
                  {dayName}
                </h3>
                {isToday && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Сегодня
                  </span>
                )}
              </div>
              <p className="text-xs text-graphite-muted dark:text-gray-400 mt-0.5">
                Финансовые операции и детальный баланс дня
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-surface-border dark:border-white/10 hover:bg-[#F3EFE7] dark:hover:bg-white/5 text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
            title="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sub-header Bar with Daily Balance */}
        <div className="p-3.5 sm:px-5 bg-[#FAF6F0] dark:bg-[#1E1E20] border-b border-surface-border/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-graphite-muted dark:text-gray-400 font-medium">
                Баланс дня:
              </span>
              <span className={`text-lg font-bold font-headline tabular-nums ${
                net >= 0 ? 'text-[#4A7C59] dark:text-green-400' : 'text-[#E05252] dark:text-red-400'
              }`}>
                {privacyMode ? '•••' : `${net > 0 ? '+' : ''}${net.toLocaleString('ru-RU')} ₽`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {income > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800/30">
                  +{income.toLocaleString('ru-RU')} ₽
                </span>
              )}
              {expense > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300 text-[11px] font-bold border border-red-200 dark:border-red-800/30">
                  -{expense.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-graphite-muted dark:text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Дневной безопасный темп: <b className="text-graphite dark:text-white">{Math.round(dailySafeLimit).toLocaleString('ru-RU')} ₽/дн</b></span>
          </div>
        </div>

        {/* Transactions list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-headline uppercase tracking-wide text-graphite dark:text-white">
                Операции за {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </span>
              <span className="text-[11px] text-graphite-muted dark:text-gray-400 font-medium">
                {dayTransactions.length} {dayTransactions.length === 1 ? 'операция' : 'операций'}
              </span>
            </div>

            {dayTransactions.length === 0 ? (
              <div className="text-center py-10 text-graphite-muted dark:text-gray-500 text-xs italic bg-[#FAF9F6] dark:bg-[#252528] rounded-xl border border-dashed border-surface-border dark:border-white/10">
                Трат и доходов в этот день не зафиксировано
              </div>
            ) : (
              <div className="space-y-2">
                {dayTransactions.map(tx => {
                  const category = categories.find(c => c.id === tx.category);
                  const member = members.find(m => m.id === tx.memberId);
                  const displayTitle = tx.note || category?.label || 'Операция';
                  const brandKey = getMerchantBrandKey(displayTitle);

                  return (
                    <div 
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      className="p-3 rounded-xl bg-white dark:bg-[#252528] border border-surface-border dark:border-white/5 hover:border-primary/50 shadow-xs flex items-center justify-between cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="shrink-0">
                          <BrandIcon name={displayTitle} brandKey={brandKey} category={category} size="md" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-graphite dark:text-white truncate group-hover:text-primary transition">
                              {displayTitle}
                            </h5>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              tx.type === 'income' 
                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                            }`}>
                              {tx.type === 'income' ? 'Доход' : 'Расход'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-graphite-muted dark:text-gray-400 mt-0.5">
                            {member && (
                              <span className="flex items-center gap-1 font-semibold" style={{ color: member.color }}>
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

                      <div className="text-right shrink-0 pl-3">
                        <div className={`text-sm font-bold font-headline tabular-nums ${
                          tx.type === 'income' ? 'text-primary dark:text-green-400' : 'text-graphite dark:text-white'
                        }`}>
                          {privacyMode ? '•••' : `${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('ru-RU')} ₽`}
                        </div>
                        <span className="text-[9px] text-graphite-muted dark:text-gray-500">
                          редактировать ↗
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="p-4 sm:px-5 border-t border-surface-border dark:border-white/10 bg-[#FAF9F6] dark:bg-[#252528] flex items-center justify-between gap-2">
          <button 
            onClick={onAddTransactionForDay}
            className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark active:scale-95 rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            + Добавить операцию
          </button>
          
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-graphite dark:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-surface-border dark:border-white/10 rounded-xl transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayDetailModal;
