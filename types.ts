
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

export interface AIKnowledgeItem {
  id: string;
  text: string;
  addedDate: string;
}

export interface FamilyMember {
  id: string;
  userId?: string;
  name: string;
  email?: string; // Email for invitation
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

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: string;
  nextPaymentDate: string;
  category: string;
  icon: string;
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

export interface Reminder {
  id: string;
  text: string;
  targetTime: number; // Timestamp
  createdAt: number;
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

export interface MeterReading {
  id: string;
  type: 'water_hot' | 'water_cold' | 'electricity' | 'gas';
  value: number;
  date: string;
  prevValue?: number;
}

export interface LoyaltyCard {
  id: string;
  name: string;
  number: string;
  color: string;
  icon: string;
  barcodeFormat?: 'qr' | 'aztec' | 'code128' | 'ean13' | 'other'; // Enhanced barcode support
}

export interface MandatoryExpense {
  id: string;
  name: string;
  amount: number;
  day: number; // Day of the month (1-31)
  remind: boolean;
  keywords?: string[];
}

export interface WidgetConfig {
  id: string;
  isVisible: boolean;
  mobile: { colSpan: number; rowSpan: number };
  desktop: { colSpan: number; rowSpan: number };
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
}

export interface FeedbackItem {
  id: string;
  comment: string;
  elementTag: string; // e.g. "BUTTON"
  elementClass: string;
  screenshot?: string; // Base64 screenshot
  timestamp: string;
  status: 'open' | 'fixed';
  path: string; // Current URL path
}

export interface AppSettings {
  familyName: string;
  currency: string;
  startOfMonthDay: number;
  privacyMode: boolean;
  theme: 'light' | 'dark'; // New Theme property
  savingsRate: number; // PERSISTED SAVINGS RATE
  
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
  enableSmartReserve?: boolean; // Toggle for deducting mandatory expenses from budget
  
  // New: Manual control over reserve
  manualReservedAmount?: number; 
  // Map of "YYYY-MM" -> [expenseId1, expenseId2] (Paid manually)
  manualPaidExpenses?: Record<string, string[]>;

  // Stores IDs of transaction pairs marked as "Not a duplicate"
  // Format: "id1_id2" (sorted alphabetically)
  ignoredDuplicatePairs?: string[];

  // Debugging & Development
  showFeedbackTool?: boolean;

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
