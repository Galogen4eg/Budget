
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  memberId: string;
  note: string;
  date: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  color: string;
}

export interface ShoppingItem {
  id: string;
  title: string;
  amount?: string;
  unit: 'шт' | 'кг' | 'уп' | 'л';
  estimatedPrice?: number;
  completed: boolean;
  memberId: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface FamilyEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration?: number;
  memberIds: string[];
  isTemplate?: boolean;
  checklist?: ChecklistItem[];
}

export interface AppSettings {
  familyName: string;
  currency: string;
  startOfMonthDay: number;
  privacyMode: boolean;
  enabledWidgets: string[];
  telegramBotToken?: string;
  telegramChatId?: string;
  dayStartHour: number;
  dayEndHour: number;
  autoSendEventsToTelegram: boolean;
  initialBalance: number; // Начальная сумма для расчетов
  alfaMapping: {
    date: string;
    amount: string;
    category: string;
    note: string;
  };
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export enum Type {
  TYPE_UNSPECIFIED = 'TYPE_UNSPECIFIED',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
  NULL = 'NULL',
}
