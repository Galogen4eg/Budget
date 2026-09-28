import React, { useState, useMemo } from 'react';
import { Check, AlertCircle, DollarSign, Edit2, Plus, Home, CreditCard, Link2 } from 'lucide-react';
import { MandatoryExpense, Transaction, AppSettings, FamilyMember, Debt } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { saveSettings, updateItem } from '../utils/db';
import { MemberMarker } from '../constants';
import { 
  findLinkedDebtForExpense, 
  isDebtExpense, 
  PAYMENT_MATCH_THRESHOLD, 
  DEBT_TRANSACTION_CATEGORY 
} from '../utils/debtPaymentSync';

interface MandatoryExpensesListProps {
  expenses: MandatoryExpense[];
  transactions: Transaction[];
  settings: AppSettings;
  currentMonth: Date;
  members: FamilyMember[];
  onEdit?: (expense: MandatoryExpense) => void;
  onAdd?: () => void;
}

type ExpenseFilterType = 'all' | 'regular' | 'debt';

/**
 * MandatoryExpensesList: Recurring bills & debt payments.
 * Distinguishes regular living expenses (utilities, internet) from debt obligations (mortgage, loans).
 */
export const MandatoryExpensesList: React.FC<MandatoryExpensesListProps> = ({ 
  expenses, 
  transactions, 
  settings, 
  currentMonth, 
  members, 
  onEdit, 
  onAdd 
}) => {
  const [filterType, setFilterType] = useState<ExpenseFilterType>('all');
  const { setSettings, debts, setDebts } = useData();
  const { familyId } = useAuth();

  const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonthNow = useMemo(() => {
    const today = new Date();
    return today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
  }, [currentMonth]);

  // Toggle Manual Paid Status with bidirectional Debt sync
  const toggleManualPaid = async (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    
    const currentManuals = settings.manualPaidExpenses || {};
    const monthIds = currentManuals[currentMonthKey] || [];
    const isCurrentlyManual = monthIds.includes(expenseId);
    const newIsPaid = !isCurrentlyManual;

    let newMonthIds: string[];
    if (isCurrentlyManual) {
      newMonthIds = monthIds.filter(id => id !== expenseId);
    } else {
      newMonthIds = [...monthIds, expenseId];
    }

    const newSettings = { 
      ...settings, 
      manualPaidExpenses: {
        ...currentManuals,
        [currentMonthKey]: newMonthIds
      }
    };

    setSettings(newSettings);
    if (familyId) await saveSettings(familyId, newSettings);

    // Синхронизация с карточкой долга, если платёж привязан
    const targetExpense = (expenses || []).find(ex => ex.id === expenseId);
    if (targetExpense) {
      const linkedDebt = findLinkedDebtForExpense(targetExpense, debts);
      if (linkedDebt) {
        const debtUpdates: Partial<Debt> = { paidThisMonth: newIsPaid };
        setDebts(prev => prev.map(d => d.id === linkedDebt.id ? { ...d, ...debtUpdates } : d));
        if (familyId) {
          await updateItem(familyId, 'debts', linkedDebt.id, debtUpdates);
        }
      }
    }
  };

  // Process and compute stats
  const { processedExpenses, totalPaid, totalBudget, regularBudget, debtBudget, regularPaid, debtPaid } = useMemo(() => {
    const targetYear = currentMonth.getFullYear();
    const targetMonth = currentMonth.getMonth();

    const monthTransactions = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const processed = (expenses || []).map(expense => {
      const isDebt = isDebtExpense(expense);
      const linkedDebt = findLinkedDebtForExpense(expense, debts);
      const keywords = expense.keywords || [];
      const debtNameLower = linkedDebt?.name ? linkedDebt.name.toLowerCase() : '';

      const matches = monthTransactions.filter(tx => {
        // Прямая привязка к расходу
        if (tx.linkedExpenseId === expense.id) return true;

        // Прямая привязка к связанному долгу
        if (linkedDebt && tx.linkedDebtId === linkedDebt.id) return true;

        const noteLower = (tx.note || '').toLowerCase();
        const rawLower = (tx.rawNote || '').toLowerCase();

        // Совпадение по ключевым словам
        if (keywords.length > 0) {
          const matched = keywords.some(k => 
            k.trim() && (noteLower.includes(k.toLowerCase()) || rawLower.includes(k.toLowerCase()))
          );
          if (matched) return true;
        }

        // Совпадение по имени долга в категории долгов
        if (isDebt && debtNameLower && tx.category === DEBT_TRANSACTION_CATEGORY) {
          return noteLower.includes(debtNameLower) || rawLower.includes(debtNameLower);
        }

        return false;
      });

      const paidAmount = matches.reduce((sum, tx) => sum + tx.amount, 0);
      const isAutoPaid = expense.amount > 0 && paidAmount >= (expense.amount * PAYMENT_MATCH_THRESHOLD);
      const isManuallyPaid = (settings.manualPaidExpenses?.[currentMonthKey] || []).includes(expense.id);
      const isPaidViaLinkedDebt = Boolean(linkedDebt?.paidThisMonth);
      const isPaid = isAutoPaid || isManuallyPaid || isPaidViaLinkedDebt;
      
      const progress = expense.amount > 0 ? Math.min(100, (paidAmount / expense.amount) * 100) : 0;
      const today = new Date();
      const isOverdue = !isPaid && isCurrentMonthNow && today.getDate() > (expense.day || 1);

      return { 
        ...expense, 
        isDebt,
        linkedDebt,
        paidAmount, 
        isPaid, 
        isAutoPaid, 
        isManuallyPaid, 
        isPaidViaLinkedDebt,
        progress, 
        isOverdue 
      };
    }).sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
      return (a.day || 0) - (b.day || 0);
    });

    let budgetSum = 0;
    let paidSum = 0;
    let regBudget = 0;
    let regPaid = 0;
    let dBudget = 0;
    let dPaid = 0;

    processed.forEach(e => {
      budgetSum += e.amount;
      const itemPaid = e.isPaid ? e.amount : Math.min(e.paidAmount, e.amount);
      paidSum += itemPaid;

      if (e.isDebt) {
        dBudget += e.amount;
        dPaid += itemPaid;
      } else {
        regBudget += e.amount;
        regPaid += itemPaid;
      }
    });

    return { 
      processedExpenses: processed, 
      totalPaid: paidSum, 
      totalBudget: budgetSum,
      regularBudget: regBudget,
      debtBudget: dBudget,
      regularPaid: regPaid,
      debtPaid: dPaid
    };
  }, [expenses, transactions, currentMonth, settings.manualPaidExpenses, currentMonthKey, debts, isCurrentMonthNow]);

  // Filter items based on active tab
  const visibleExpenses = useMemo(() => {
    if (filterType === 'regular') return processedExpenses.filter(e => !e.isDebt);
    if (filterType === 'debt') return processedExpenses.filter(e => e.isDebt);
    return processedExpenses;
  }, [processedExpenses, filterType]);

  const regularCount = processedExpenses.filter(e => !e.isDebt).length;
  const debtCount = processedExpenses.filter(e => e.isDebt).length;

  return (
    <div className="bg-white dark:bg-[#1C1C1E] p-5 md:p-6 rounded-3xl border border-surface-border dark:border-white/10 shadow-sm w-full flex flex-col h-auto">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FDF2F2] dark:bg-red-950/40 text-[#E05252] dark:text-red-400 flex items-center justify-center shrink-0">
            <DollarSign size={17} />
          </div>
          <div>
            <h3 className="text-sm font-headline font-bold text-graphite dark:text-white uppercase tracking-wide leading-none">
              Обязательные платежи
            </h3>
            <span className="text-[10px] md:text-xs font-mono font-bold text-gray-400 dark:text-gray-500 block mt-1">
              {Math.round(totalPaid).toLocaleString('ru-RU')} / {totalBudget.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        {onAdd && (
          <button 
            onClick={onAdd}
            className="w-8 h-8 bg-[#FAF8F5] dark:bg-[#252528] text-graphite dark:text-white rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#2C2C2E] border border-surface-border dark:border-white/5 transition-colors shadow-xs cursor-pointer"
            title="Добавить обязательный платеж"
            aria-label="Добавить обязательный платеж"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Разграничение бюджетов: Бытовые vs Долги */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-[11px] font-medium">
        <div className="p-2 rounded-xl bg-[#FAF8F5] dark:bg-white/5 border border-stone-200/60 dark:border-white/5 flex items-center gap-2">
          <Home size={13} className="text-[#4A7C59] shrink-0" />
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-wider text-stone-400">Бытовые</div>
            <div className="font-bold text-stone-800 dark:text-stone-200 truncate">
              {Math.round(regularPaid).toLocaleString('ru-RU')} / {regularBudget.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 flex items-center gap-2">
          <CreditCard size={13} className="text-[#8C3A3A] dark:text-rose-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-400">Долги и кредиты</div>
            <div className="font-bold text-stone-800 dark:text-stone-200 truncate">
              {Math.round(debtPaid).toLocaleString('ru-RU')} / {debtBudget.toLocaleString('ru-RU')} ₽
            </div>
          </div>
        </div>
      </div>

      {/* Вкладки-фильтры: Все / Бытовые / Долги */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800/60 rounded-xl mb-3">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filterType === 'all'
              ? 'bg-white dark:bg-[#252528] text-stone-900 dark:text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-800 dark:text-gray-400'
          }`}
        >
          Все ({processedExpenses.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterType('regular')}
          className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            filterType === 'regular'
              ? 'bg-white dark:bg-[#252528] text-[#4A7C59] dark:text-emerald-400 shadow-xs'
              : 'text-stone-500 hover:text-stone-800 dark:text-gray-400'
          }`}
        >
          <Home size={12} />
          <span>Бытовые ({regularCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('debt')}
          className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            filterType === 'debt'
              ? 'bg-white dark:bg-[#252528] text-[#8C3A3A] dark:text-rose-400 shadow-xs'
              : 'text-stone-500 hover:text-stone-800 dark:text-gray-400'
          }`}
        >
          <CreditCard size={12} />
          <span>Долги ({debtCount})</span>
        </button>
      </div>

      {/* Expense List */}
      <div className="space-y-2.5">
        {visibleExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-gray-400">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              {filterType === 'debt' ? 'Нет долговых платежей' : filterType === 'regular' ? 'Нет бытовых платежей' : 'Список пуст'}
            </span>
          </div>
        ) : (
          visibleExpenses.map(expense => {
            const assignedMember = members.find(m => m.id === expense.memberId);
            
            return (
              <div 
                key={expense.id} 
                onClick={() => onEdit && onEdit(expense)} 
                className={`relative flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group ${
                  expense.isPaid 
                    ? 'bg-[#FAF8F5]/60 dark:bg-[#252528]/40 border-transparent opacity-75 hover:opacity-100' 
                    : expense.isDebt
                      ? 'bg-white dark:bg-[#252528] border-amber-200/60 dark:border-amber-900/30 hover:border-amber-300 shadow-xs'
                      : 'bg-white dark:bg-[#252528] border-surface-border dark:border-white/5 hover:border-gray-300 dark:hover:border-white/15 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Checkbox / Day Button */}
                  <button
                    onClick={(e) => toggleManualPaid(e, expense.id)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all active:scale-95 cursor-pointer ${
                      expense.isPaid 
                        ? 'bg-[#4A7C59] border-[#4A7C59] text-white shadow-xs' 
                        : expense.isOverdue
                          ? 'bg-[#FDF2F2] dark:bg-red-950/40 border-[#FADCDD] dark:border-red-900/40 text-[#E05252]'
                          : expense.isDebt
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-[#8C3A3A] dark:text-rose-400 hover:border-[#4A7C59]'
                            : 'bg-[#FAF8F5] dark:bg-[#2C2C2E] border-surface-border dark:border-white/10 text-graphite-muted hover:border-[#4A7C59] hover:text-[#4A7C59]'
                    }`}
                    title={expense.isPaid ? "Отметить как неоплаченное" : "Отметить оплаченным"}
                  >
                    {expense.isPaid ? <Check size={16} strokeWidth={2.5} /> : <span className="text-xs font-headline font-bold">{expense.day}</span>}
                  </button>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold truncate ${expense.isPaid ? 'text-gray-400 line-through' : 'text-graphite dark:text-white'}`}>
                        {expense.name}
                      </span>

                      {/* Бейдж типа: Долг / Бытовой */}
                      {expense.isDebt ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 flex items-center gap-1">
                          <CreditCard size={10} />
                          <span>Долг</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-gray-300 flex items-center gap-1">
                          <Home size={10} />
                          <span>Услуга</span>
                        </span>
                      )}

                      {assignedMember && !expense.isPaid && (
                        <div className="scale-75 origin-left">
                          <MemberMarker member={assignedMember} size="sm" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {expense.isOverdue && !expense.isPaid && (
                        <span className="text-[9px] font-mono font-bold text-[#E05252] uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle size={10} /> Просрочено
                        </span>
                      )}
                      {!expense.isOverdue && !expense.isPaid && (
                        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                          до {expense.day}-го числа
                        </span>
                      )}
                      {expense.isPaid && (
                        <span className="text-[9px] font-mono font-bold text-[#4A7C59] dark:text-green-400 bg-[#EAF2EC] dark:bg-[#4A7C59]/20 px-1.5 py-0.5 rounded">
                          {expense.isAutoPaid ? 'Операция' : expense.isPaidViaLinkedDebt ? 'В сервисе долгов' : 'Вручную'}
                        </span>
                      )}

                      {/* Информация о связанном долге */}
                      {expense.linkedDebt && (
                        <span className="text-[9px] font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1 truncate max-w-[170px]" title={`Связан с долгом: ${expense.linkedDebt.name}`}>
                          <Link2 size={10} className="shrink-0 text-amber-600 dark:text-amber-400" />
                          <span className="truncate">{expense.linkedDebt.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-2.5 pl-2">
                  <div className="flex flex-col items-end">
                    <span className={`text-xs md:text-sm font-headline font-bold tabular-nums ${expense.isPaid ? 'text-gray-400' : 'text-graphite dark:text-white'}`}>
                      {expense.amount.toLocaleString('ru-RU')} ₽
                    </span>
                    
                    {!expense.isPaid && expense.progress > 0 && (
                      <div className="w-12 h-1 bg-gray-100 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-[#4A7C59]" style={{ width: `${expense.progress}%` }} />
                      </div>
                    )}
                    
                    {!expense.isPaid && expense.paidAmount > 0 && (
                      <span className="text-[8px] font-mono font-bold text-[#4A7C59]">
                        оплачено: {Math.round(expense.paidAmount)}
                      </span>
                    )}
                  </div>
                  {onEdit && (
                    <div className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                      <Edit2 size={13} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MandatoryExpensesList;
