import type { SavingsGoal, Transaction } from '../types';

/**
 * Проверяет, является ли операция переводом на накопительный счет / сбережения
 */
export const isSavingsTransfer = (tx: {
  category?: string;
  note?: string;
  rawNote?: string;
  linkedGoalId?: string;
}): boolean => {
  if (tx.linkedGoalId) return true;
  if (tx.category === 'savings' || tx.category === 'transfer_savings') return true;

  const combined = `${tx.note || ''} ${tx.rawNote || ''}`.toLowerCase();
  
  const savingsKeywords = [
    'накопительный счет',
    'накопительный счёт',
    'на накопительный',
    'пополнение копилки',
    'в копилку',
    'копилка',
    'накопления',
    'сберегательный счет',
    'сберегательный счёт',
    'пополнение вклада',
    'вклад',
    'сбережения'
  ];

  return savingsKeywords.some(keyword => combined.includes(keyword));
};

/**
 * Применяет сумму перевода к целям / накопительным счетам
 */
export const applySavingsTransferToGoals = (
  goals: SavingsGoal[],
  amount: number,
  isAddition: boolean,
  targetGoalId?: string
): { updatedGoals: SavingsGoal[]; affectedGoal: SavingsGoal } => {
  const currentGoals = [...goals];
  let targetGoal: SavingsGoal | undefined;

  if (targetGoalId) {
    targetGoal = currentGoals.find(g => g.id === targetGoalId);
  }

  if (!targetGoal) {
    // Ищем цель со словом "накопительный" или "копилка"
    targetGoal = currentGoals.find(g => 
      g.title.toLowerCase().includes('накопительн') || 
      g.title.toLowerCase().includes('копилк') ||
      g.title.toLowerCase().includes('сбережен')
    );
  }

  // Если цель все еще не найдена, берем первую существующую
  if (!targetGoal && currentGoals.length > 0) {
    targetGoal = currentGoals[0];
  }

  // Если целей вообще нет — создаем новый накопительный счет по умолчанию
  if (!targetGoal) {
    const newGoal: SavingsGoal = {
      id: 'savings_' + Date.now().toString(),
      title: 'Накопительный счет',
      targetAmount: Math.max(100000, amount * 2),
      currentAmount: Math.max(0, isAddition ? amount : 0),
      color: '#7C3AED',
      icon: 'PiggyBank'
    };
    return {
      updatedGoals: [newGoal],
      affectedGoal: newGoal
    };
  }

  const delta = isAddition ? amount : -amount;
  const newAmount = Math.max(0, targetGoal.currentAmount + delta);
  const updatedGoal: SavingsGoal = {
    ...targetGoal,
    currentAmount: Math.round(newAmount * 100) / 100
  };

  const updatedGoals = currentGoals.map(g => g.id === targetGoal!.id ? updatedGoal : g);

  return {
    updatedGoals,
    affectedGoal: updatedGoal
  };
};

/**
 * Recalculate savings side effects when a transaction is created, edited or
 * deleted. Reverses the old contribution before applying the new one, so
 * changing a goal with an unchanged amount still moves the money.
 */
export function planSavingsGoalChanges(
  goals: SavingsGoal[],
  previous: Transaction | null,
  next: Transaction | null
): { updatedGoals: SavingsGoal[]; changedGoals: SavingsGoal[] } {
  let updatedGoals = goals;
  const apply = (tx: Transaction, reverse: boolean) => {
    if (!isSavingsTransfer(tx)) return;
    if (!Number.isFinite(tx.amount) || tx.amount < 0) {
      throw new Error('Некорректная сумма перевода в накопления');
    }
    if (tx.linkedGoalId && !updatedGoals.some(goal => goal.id === tx.linkedGoalId)) {
      throw new Error('Связанная цель накопления не найдена. Выберите существующую цель');
    }
    // An expense to savings increases the goal; an income/withdrawal decreases it.
    const isAddition = (tx.type === 'expense') !== reverse;
    updatedGoals = applySavingsTransferToGoals(
      updatedGoals, tx.amount, isAddition, tx.linkedGoalId
    ).updatedGoals;
  };
  if (previous) apply(previous, true);
  if (next) apply(next, false);
  const previousById = new Map(goals.map(goal => [goal.id, goal]));
  const changedGoals = updatedGoals.filter(goal => {
    const before = previousById.get(goal.id);
    return !before || before.currentAmount !== goal.currentAmount;
  });
  return { updatedGoals, changedGoals };
}

/** Detect a concurrent edit before applying savings side effects again. */
export function assertFinancialVersion(
  expected: Transaction,
  actual: Transaction
): void {
  const keys = ['amount', 'type', 'category', 'linkedGoalId', 'note', 'rawNote'] as const;
  if (keys.some(key => (expected[key] ?? null) !== (actual[key] ?? null))) {
    throw new Error('Операция изменена на другом устройстве. Обновите список перед сохранением');
  }
}

/** Refuse bulk deletion of savings transfers until balances can be recalculated atomically. */
export function assertSafeBulkDelete(
  transactions: readonly Transaction[],
  ids: readonly string[]
): void {
  const deleting = new Set(ids);
  if (transactions.some(tx => deleting.has(tx.id) && isSavingsTransfer(tx))) {
    throw new Error('Выбранные операции содержат переводы в накопления. Удалите их по одной, чтобы правильно пересчитать остаток цели.');
  }
}
