
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  memberId: string; // Ссылка на FamilyMember (для отображения иконки)
  userId?: string;  // Реальный UID пользователя из Firebase (для прав доступа)
  note: string;
  date: string;
  rawNote?: string;
}

export interface LearnedRule {
  id: string;
  keyword: string;
  cleanName: string;
  categoryId: string;
}

export interface FamilyMember {
  id: string;
  userId?: string; // Связь с Firebase Auth UID
  name: string;
  color: string;
  avatar?: string;
  isAdmin?: boolean;
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
  userId?: string; // Кто добавил (Firebase UID)
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export interface WishlistItem {
  id: string;
  title: string;
  price?: number;
  currency: string;
  url?: string; // Ссылка на магазин
  imageUrl?: string; // Фото желания
  ownerId: string; // Чье желание
  reservedBy?: string; // Кто обещал подарить (ID члена семьи)
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
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
  userId?: string; // Кто создал (Firebase UID)
  isTemplate?: boolean;
  checklist?: ChecklistItem[];
  reminders?: number[]; // Array of minutes before event (e.g. [60, 1440])
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  nextPaymentDate: string;
  category: string;
  icon: string;
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  currentBalance: number;
  interestRate?: number;
  minPayment?: number;
  color: string;
}

export interface PantryItem {
  id: string;
  title: string;
  amount: string;
  unit: string;
  category: string;
  expiryDate?: string;
  addedDate: string;
}

export interface LoyaltyCard {
  id: string;
  name: string;
  number: string;
  color: string;
  icon: string; // Emoji or Lucide icon name
  barcodeType?: 'code128' | 'qr'; 
}

export interface MandatoryExpense {
  id: string;
  name: string;
  amount: number;
  keywords?: string[]; // Array of keywords to match transactions automatically
}

export interface MeterReading {
  id: string;
  type: 'water_hot' | 'water_cold' | 'electricity' | 'gas';
  value: number;
  date: string;
  prevValue?: number;
}

export interface WidgetConfig {
  id: string;
  isVisible: boolean;
  mobile: { colSpan: number; rowSpan: number };
  desktop: { colSpan: number; rowSpan: number };
}

export interface AppSettings {
  familyName: string;
  currency: string;
  startOfMonthDay: number;
  privacyMode: boolean;
  
  // Replaces simple string array with detailed config
  widgets: WidgetConfig[]; 
  
  isPinEnabled: boolean;
  
  // Конфигурация видимости
  enabledTabs: string[];
  enabledServices: string[];
  
  // Режим бюджета по умолчанию
  defaultBudgetMode: 'personal' | 'family'; 

  telegramBotToken?: string;
  telegramChatId?: string;
  autoSendEventsToTelegram: boolean;
  eventTemplate?: string;
  shoppingTemplate?: string;
  
  dayStartHour: number;
  dayEndHour: number;
  
  // Salary / Balance Config
  initialBalance: number;
  initialBalanceDate?: string;
  salaryDates: number[]; // Array of days (e.g., [10, 25])
  mandatoryExpenses: MandatoryExpense[]; // New: Fixed monthly costs

  alfaMapping: {
    date: string;
    time: string;
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
  isCustom?: boolean;
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
