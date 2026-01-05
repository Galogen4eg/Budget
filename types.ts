
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  memberId: string;
  userId?: string;
  note: string;
  date: string;
  rawNote?: string;
  projectId?: string; // Link to a project
}

export interface LearnedRule {
  id: string;
  keyword: string;
  cleanName: string;
  categoryId: string;
}

export interface FamilyMember {
  id: string;
  userId?: string;
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
  userId?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export interface WishlistItem {
  id: string;
  title: string;
  price?: number;
  currency: string;
  url?: string;
  imageUrl?: string;
  ownerId: string;
  reservedBy?: string;
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
  userId?: string;
  isTemplate?: boolean;
  checklist?: ChecklistItem[];
  reminders?: number[];
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

export interface ProjectExpense {
  id: string;
  title: string;
  amount: number;
  date: string;
  memberId: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  totalBudget: number;
  currency: string;
  status: 'active' | 'completed' | 'paused';
  startDate: string;
  endDate?: string;
  color: string;
  icon: string;
  expenses: ProjectExpense[];
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
  icon: string;
  barcodeType?: 'code128' | 'qr'; 
}

export interface MandatoryExpense {
  id: string;
  name: string;
  amount: number;
  day: number; // Day of the month (1-31)
  remind: boolean;
  keywords?: string[];
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
  theme: 'light' | 'dark'; // New Theme property
  
  widgets: WidgetConfig[]; 
  
  isPinEnabled: boolean;
  pinCode?: string; // Stored PIN
  
  enabledTabs: string[];
  enabledServices: string[];
  defaultBudgetMode: 'personal' | 'family'; 

  telegramBotToken?: string;
  telegramChatId?: string;
  autoSendEventsToTelegram: boolean;
  
  // Push Notifications
  pushEnabled: boolean;
  fcmToken?: string;

  eventTemplate?: string;
  shoppingTemplate?: string;
  
  dayStartHour: number;
  dayEndHour: number;
  
  initialBalance: number;
  initialBalanceDate?: string;
  salaryDates: number[];
  mandatoryExpenses: MandatoryExpense[];

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
