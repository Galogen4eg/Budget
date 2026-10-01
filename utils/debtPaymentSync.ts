import { Debt, MandatoryExpense, Transaction, AppSettings } from '../types';

/** Порог признания платежа оплаченным (95% от ожидаемой суммы) */
export const PAYMENT_MATCH_THRESHOLD = 0.95;

/** Категория транзакций по умолчанию для погашения долгов */
export const DEBT_TRANSACTION_CATEGORY = 'debts';

/**
 * Источник отметки об оплате долга в текущем месяце
 */
export type DebtPaymentSource = 'transaction' | 'mandatory_expense' | 'manual_debt' | 'none';

export type PaymentStatusCode = 'paid' | 'partially_paid' | 'unpaid';

/**
 * Расширенная информация о статусе погашения долга за указанный месяц
 */
export interface DebtMonthPaymentStatus {
  isPaid: boolean;
  status: PaymentStatusCode;
  paidAmount: number;
  expectedAmount: number;
  remainingAmount: number;
  source: DebtPaymentSource;
  linkedExpense?: MandatoryExpense;
  matchedTransactions: Transaction[];
  lastPaymentDate?: string;
  displayStatusText: string;
}

/**
 * Проверяет, является ли обязательный платёж долговым обязательством
 * @param expense Обязательный платёж
 */
export function isDebtExpense(expense: MandatoryExpense): boolean {
  return expense.expenseType === 'debt' || Boolean(expense.linkedDebtId);
}

/**
 * Формирует ключ месяца в формате YYYY-MM
 * @param date Дата целевого месяца
 */
export function getMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Находит обязательный платёж, связанный с указанным долгом
 * @param debtId Идентификатор долга
 * @param expenses Список обязательных платежей
 */
export function findLinkedExpenseForDebt(
  debtId: string,
  expenses: MandatoryExpense[] = []
): MandatoryExpense | undefined {
  if (!debtId || !expenses.length) return undefined;
  return expenses.find(e => e.linkedDebtId === debtId);
}

/**
 * Находит долг, связанный с указанным обязательным платежом
 * @param expense Обязательный платёж
 * @param debts Список долгов
 */
export function findLinkedDebtForExpense(
  expense: MandatoryExpense,
  debts: Debt[] = []
): Debt | undefined {
  if (!expense || !debts.length) return undefined;
  if (expense.linkedDebtId) {
    return debts.find(d => d.id === expense.linkedDebtId);
  }
  return debts.find(d => d.linkedExpenseId === expense.id);
}

/**
 * Находит все транзакции расходов за указанный месяц, относящиеся к долгу или связанному платежу
 */
export function getDebtMatchingTransactions(
  debt: Debt,
  linkedExpense: MandatoryExpense | undefined,
  transactions: Transaction[] = [],
  month: Date = new Date()
): Transaction[] {
  const targetYear = month.getFullYear();
  const targetMonth = month.getMonth();
  const debtNameLower = debt.name.trim().toLowerCase();
  const keywords = linkedExpense?.keywords || [];

  return transactions.filter(tx => {
    if (tx.type !== 'expense') return false;

    const txDate = new Date(tx.date);
    if (txDate.getFullYear() !== targetYear || txDate.getMonth() !== targetMonth) {
      return false;
    }

    // Прямая привязка к долгу
    if (tx.linkedDebtId === debt.id) return true;

    // Прямая привязка к обязательному платежу
    if (linkedExpense && tx.linkedExpenseId === linkedExpense.id) return true;

    const note = (tx.note || '').toLowerCase();
    const rawNote = (tx.rawNote || '').toLowerCase();

    // Совпадение по ключевым словам связанного обязательного платежа
    if (keywords.length > 0) {
      const matchKeyword = keywords.some(
        k => k.trim() && (note.includes(k.toLowerCase()) || rawNote.includes(k.toLowerCase()))
      );
      if (matchKeyword) return true;
    }

    // Совпадение по имени долга при категории "Долги"
    if (tx.category === DEBT_TRANSACTION_CATEGORY && debtNameLower) {
      return note.includes(debtNameLower) || rawNote.includes(debtNameLower);
    }

    return false;
  });
}

/**
 * Вычисляет детальный статус погашения долга за текущий месяц с учётом транзакций и обязательных платежей
 */
export function computeDebtMonthPaymentStatus(
  debt: Debt,
  linkedExpense: MandatoryExpense | undefined,
  transactions: Transaction[] = [],
  settings: AppSettings,
  month: Date = new Date()
): DebtMonthPaymentStatus {
  const expectedAmount = debt.monthlyPayment || linkedExpense?.amount || 0;
  const monthKey = getMonthKey(month);
  const manualPaidList = settings.manualPaidExpenses?.[monthKey] || [];

  const matchedTransactions = getDebtMatchingTransactions(debt, linkedExpense, transactions, month);
  const totalPaidByTx = matchedTransactions.reduce((acc, tx) => acc + tx.amount, 0);

  const isFullyPaidByTx = expectedAmount > 0 
    ? totalPaidByTx >= expectedAmount
    : totalPaidByTx > 0;

  const isPartiallyPaidByTx = expectedAmount > 0 && totalPaidByTx > 0 && totalPaidByTx < expectedAmount;

  const isLinkedExpenseManualPaid = linkedExpense 
    ? manualPaidList.includes(linkedExpense.id) 
    : false;

  const isManualDebtPaid = Boolean(debt.paidThisMonth);

  // Сортируем транзакции по дате (последняя первая)
  const sortedTxs = [...matchedTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastTx = sortedTxs[0];

  if (isFullyPaidByTx) {
    return {
      isPaid: true,
      status: 'paid',
      paidAmount: totalPaidByTx,
      expectedAmount,
      remainingAmount: 0,
      source: 'transaction',
      linkedExpense,
      matchedTransactions: sortedTxs,
      lastPaymentDate: lastTx?.date,
      displayStatusText: `Оплачено операцией (${Math.round(totalPaidByTx).toLocaleString('ru-RU')} ₽)`
    };
  }

  if (isLinkedExpenseManualPaid) {
    return {
      isPaid: true,
      status: 'paid',
      paidAmount: expectedAmount,
      expectedAmount,
      remainingAmount: 0,
      source: 'mandatory_expense',
      linkedExpense,
      matchedTransactions: sortedTxs,
      displayStatusText: `Отмечено через «${linkedExpense?.name || 'обязательный платёж'}»`
    };
  }

  if (isManualDebtPaid) {
    return {
      isPaid: true,
      status: 'paid',
      paidAmount: expectedAmount,
      expectedAmount,
      remainingAmount: 0,
      source: 'manual_debt',
      linkedExpense,
      matchedTransactions: sortedTxs,
      displayStatusText: 'Взнос отмечен вручную'
    };
  }

  if (isPartiallyPaidByTx) {
    const remainingAmount = Math.max(0, expectedAmount - totalPaidByTx);
    return {
      isPaid: false,
      status: 'partially_paid',
      paidAmount: totalPaidByTx,
      expectedAmount,
      remainingAmount,
      source: 'transaction',
      linkedExpense,
      matchedTransactions: sortedTxs,
      lastPaymentDate: lastTx?.date,
      displayStatusText: `Частично оплачено (${Math.round(totalPaidByTx).toLocaleString('ru-RU')} из ${Math.round(expectedAmount).toLocaleString('ru-RU')} ₽, остаток ${Math.round(remainingAmount).toLocaleString('ru-RU')} ₽)`
    };
  }

  const remainingAmount = expectedAmount;
  return {
    isPaid: false,
    status: 'unpaid',
    paidAmount: totalPaidByTx,
    expectedAmount,
    remainingAmount,
    source: 'none',
    linkedExpense,
    matchedTransactions: sortedTxs,
    displayStatusText: linkedExpense 
      ? `Ожидает оплаты (до ${linkedExpense.day}-го числа)` 
      : 'Ожидает платежа в этом месяце'
  };
}
