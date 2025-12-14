import { Transaction, RecurringTransaction } from '../types';

export const calculateBalanceAfter = (transactions: Transaction[], initialBalance: number): Transaction[] => {
  let balance = initialBalance;
  return [...transactions]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(tx => {
      balance += tx.type === 'income' ? tx.amount : -tx.amount;
      return { ...tx, balanceAfter: balance };
    });
};

export const calculateCurrentBalance = (transactions: Transaction[], initialBalance: number): number => {
  return calculateBalanceAfter(transactions, initialBalance).reduce((balance, tx) => {
    return tx.type === 'income' ? balance + tx.amount : balance - tx.amount;
  }, 0);
};

export const calculateSavingsAmount = (currentBalance: number, savingsRate: number): number => {
  return currentBalance * (savingsRate / 100);
};

export const calculateDailyLimit = (
  currentBalance: number,
  recurringTransactions: RecurringTransaction[],
  daysLeftInMonth: number
): number => {
  if (daysLeftInMonth <= 0) return 0;
  
  // Calculate total recurring expenses for remaining days
  const today = new Date();
  const recurringExpensesForRemainingDays = recurringTransactions.reduce((total, rt) => {
    // Only include recurring transactions that happen on or after today's day
    if (rt.dayOfMonth >= today.getDate()) {
      return total + rt.amount;
    }
    return total;
  }, 0);
  
  return (currentBalance - recurringExpensesForRemainingDays) / daysLeftInMonth;
};

export const groupTransactionsByCategory = (transactions: Transaction[]): Record<string, number> => {
  return transactions.reduce((acc, transaction) => {
    acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
    return acc;
  }, {} as Record<string, number>);
};

export const filterTransactionsByMonth = (transactions: Transaction[], month: Date): Transaction[] => {
  return transactions.filter(tx => 
    tx.date.getFullYear() === month.getFullYear() &&
    tx.date.getMonth() === month.getMonth()
  );
};