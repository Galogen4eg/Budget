import { SavingsGoal, Transaction } from '../types';

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
