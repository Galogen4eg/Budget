
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  Transaction, AppSettings, FamilyMember, ShoppingItem, FamilyEvent, 
  Debt, Project, PantryItem, 
  LoyaltyCard, WishlistItem, SavingsGoal, LearnedRule, Category, AppNotification, Reminder, AIKnowledgeItem
} from '../types';
import { INITIAL_CATEGORIES, DEFAULT_RULES } from '../constants';
import { 
  subscribeToCollection, subscribeToGlobalRules,
  addItemsBatch, deleteItemsBatch, addItem, deleteItem, saveAppSettings, subscribeToAppSettings
} from '../utils/db';
import { useAuth } from './AuthContext';

export const DEFAULT_SETTINGS: AppSettings = {
  familyName: 'Семья',
  currency: '₽',
  startOfMonthDay: 1,
  privacyMode: false,
  theme: 'light',
  savingsRate: 10,
  geminiApiKey: '',
  widgets: [
    { id: 'balance', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
    { id: 'category_analysis', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
    { id: 'shopping', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'wallet', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'goals', isVisible: false, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
  ],
  isPinEnabled: false,
  enabledTabs: ['overview', 'budget', 'plans', 'shopping', 'services'],
  enabledServices: ['wallet', 'projects', 'debts'], 
  defaultBudgetMode: 'personal',
  autoSendEventsToTelegram: false,
  pushEnabled: false,
  dayStartHour: 8,
  dayEndHour: 23,
  initialBalance: 0,
  salaryDates: [10, 25],
  mandatoryExpenses: [],
  enableSmartReserve: true,
  manualReservedAmount: 0,
  manualPaidExpenses: {},
  ignoredDuplicatePairs: [],
  showFeedbackTool: false,
  alfaMapping: { date: 'дата', time: '', amount: 'сумма', category: '', note: 'описание' },
  eventTemplate: `📅 *{title}*\n\n🕒 {date} в {time} (на {duration}ч)\n📝 {desc}\n\n👥 Участники: {members}\n📋 Чек-лист: {checklist}`,
  shoppingTemplate: `🛒 *Список покупок* ({total} поз.)\n📅 {date}\n\n{items}\n\nКупите по дороге домой! 🏠`,
};

interface DataContextType {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  shoppingItems: ShoppingItem[];
  setShoppingItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  pantry: PantryItem[];
  setPantry: (dataOrFn: PantryItem[] | ((prev: PantryItem[]) => PantryItem[])) => Promise<void>;
  events: FamilyEvent[];
  setEvents: React.Dispatch<React.SetStateAction<FamilyEvent[]>>;
  goals: SavingsGoal[];
  setGoals: React.Dispatch<React.SetStateAction<SavingsGoal[]>>;
  members: FamilyMember[];
  setMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  learnedRules: LearnedRule[];
  setLearnedRules: React.Dispatch<React.SetStateAction<LearnedRule[]>>;
  aiKnowledge: AIKnowledgeItem[];
  addAIKnowledge: (text: string) => Promise<void>;
  deleteAIKnowledge: (id: string) => Promise<void>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  debts: Debt[];
  setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  loyaltyCards: LoyaltyCard[];
  setLoyaltyCards: React.Dispatch<React.SetStateAction<LoyaltyCard[]>>;
  wishlist: WishlistItem[];
  setWishlist: React.Dispatch<React.SetStateAction<WishlistItem[]>>;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  addReminder: (text: string, delayMs: number) => void;
  dismissedNotificationIds: string[];
  dismissNotification: (id: string) => void;
  filteredTransactions: Transaction[];
  totalBalance: number;
  currentMonthSpent: number;
  savingsRate: number;
  setSavingsRate: (rate: number) => void;
  budgetMode: 'personal' | 'family';
  setBudgetMode: React.Dispatch<React.SetStateAction<'personal' | 'family'>>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export const useData = () => useContext(DataContext);

const mergeWidgets = (currentWidgets: any[] = []) => {
    const defaultWidgets = DEFAULT_SETTINGS.widgets || [];
    const currentIds = new Set(currentWidgets.map(w => w.id));
    const missing = defaultWidgets.filter(w => !currentIds.has(w.id));
    if (missing.length > 0) {
        return [...currentWidgets, ...missing];
    }
    return currentWidgets;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { familyId, user, loading: authLoading } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [pantry, setPantryState] = useState<PantryItem[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]); 
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [localRules, setLocalRules] = useState<LearnedRule[]>([]);
  const [globalRules, setGlobalRules] = useState<LearnedRule[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [aiKnowledge, setAiKnowledge] = useState<AIKnowledgeItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [budgetMode, setBudgetMode] = useState<'personal' | 'family'>('personal');

  const learnedRules = useMemo(() => {
      const ruleMap = new Map<string, LearnedRule>();
      DEFAULT_RULES.forEach(r => ruleMap.set(r.keyword.toLowerCase(), r));
      globalRules.forEach(r => ruleMap.set(r.keyword.toLowerCase(), r));
      localRules.forEach(r => ruleMap.set(r.keyword.toLowerCase(), r));
      return Array.from(ruleMap.values());
  }, [localRules, globalRules]);

  const updateSavingsRate = async (rate: number) => {
      const newSettings = { ...settings, savingsRate: rate };
      setSettings(newSettings);
      if (familyId && user) await saveAppSettings(familyId, user.uid, newSettings);
  };

  const updateSettings = async (newSettings: AppSettings) => {
      setSettings(newSettings);
      if (familyId && user) {
          await saveAppSettings(familyId, user.uid, newSettings);
      }
  };

  // Only subscribe to collections if we have a family ID. 
  // No offline fallback.
  useEffect(() => {
    // Global rules are always useful to fetch if we have connection
    const unsubGlobal = subscribeToGlobalRules((rules) => setGlobalRules(rules));

    if (!familyId) {
        // If no family ID (not logged in), we do nothing. 
        // The app will likely show the login screen.
        return unsubGlobal;
    }

    const unsubs = [
      unsubGlobal,
      subscribeToCollection(familyId, 'transactions', (data) => setTransactions(data as Transaction[])),
      subscribeToCollection(familyId, 'shopping', (data) => setShoppingItems(data as ShoppingItem[])),
      subscribeToCollection(familyId, 'pantry', (data) => setPantryState(data as PantryItem[])),
      subscribeToCollection(familyId, 'events', (data) => setEvents(data as FamilyEvent[])),
      subscribeToCollection(familyId, 'goals', (data) => setGoals(data as SavingsGoal[])),
      subscribeToCollection(familyId, 'members', (data) => { if (data.length) setMembers(data as FamilyMember[]); }),
      subscribeToCollection(familyId, 'categories', (data) => { if (data.length) setCategories(data as Category[]); }),
      subscribeToCollection(familyId, 'rules', (data) => setLocalRules(data as LearnedRule[])),
      subscribeToCollection(familyId, 'knowledge', (data) => setAiKnowledge(data as AIKnowledgeItem[])),
      subscribeToCollection(familyId, 'debts', (data) => setDebts(data as Debt[])),
      subscribeToCollection(familyId, 'projects', (data) => setProjects(data as Project[])),
      subscribeToCollection(familyId, 'loyalty', (data) => setLoyaltyCards(data as LoyaltyCard[])),
      subscribeToCollection(familyId, 'wishlist', (data) => setWishlist(data as WishlistItem[])),
      subscribeToAppSettings(familyId, user?.uid || 'unknown', (data) => {
          if (data) {
              setSettings(prev => ({ ...DEFAULT_SETTINGS, ...prev, ...data, widgets: mergeWidgets(data.widgets) }));
              if (data.defaultBudgetMode) setBudgetMode(data.defaultBudgetMode);
          }
      })
    ];
    
    return () => unsubs.forEach(u => u());
  }, [familyId, user?.uid]);

  const dismissNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setDismissedNotificationIds(prev => [...prev, id]);
  };

  const addReminder = (text: string, delayMs: number) => {
      const newReminder: Reminder = {
          id: Date.now().toString(),
          text,
          targetTime: Date.now() + delayMs,
          createdAt: Date.now()
      };
      setReminders(prev => [...prev, newReminder]);
  };

  // Simple in-memory reminder check for the session
  useEffect(() => {
      const checkReminders = () => {
          const now = Date.now();
          setReminders(prev => {
              const due = prev.filter(r => r.targetTime <= now);
              const upcoming = prev.filter(r => r.targetTime > now);
              
              if (due.length > 0) {
                  const newNotifs: AppNotification[] = due.map(r => ({
                      id: `reminder_${r.id}`,
                      title: 'Напоминание ⏰',
                      message: r.text,
                      type: 'info',
                      date: new Date().toISOString(),
                      isRead: false
                  }));
                  
                  const filteredNew = newNotifs.filter(n => !dismissedNotificationIds.includes(n.id));
                  if (filteredNew.length > 0) {
                      setNotifications(curr => [...filteredNew, ...curr]);
                  }
              }
              return upcoming;
          });
      };
      const interval = setInterval(checkReminders, 5000); 
      return () => clearInterval(interval);
  }, [dismissedNotificationIds]);

  const addAIKnowledge = async (text: string) => {
      const newItem: AIKnowledgeItem = { id: Date.now().toString(), text, addedDate: new Date().toISOString() };
      setAiKnowledge(prev => [...prev, newItem]);
      if (familyId) await addItem(familyId, 'knowledge', newItem);
  };

  const deleteAIKnowledge = async (id: string) => {
      setAiKnowledge(prev => prev.filter(k => k.id !== id));
      if (familyId) await deleteItem(familyId, 'knowledge', id);
  };

  const handlePantryUpdate = async (dataOrFn: PantryItem[] | ((prev: PantryItem[]) => PantryItem[])) => {
      const newData = typeof dataOrFn === 'function' ? dataOrFn(pantry) : dataOrFn;
      if (familyId) {
          const addedItems = newData.filter(newItem => !pantry.some(oldItem => oldItem.id === newItem.id));
          if (addedItems.length > 0) await addItemsBatch(familyId, 'pantry', addedItems);
          const removedIds = pantry.filter(oldItem => !newData.some(newItem => newItem.id === oldItem.id)).map(i => i.id);
          if (removedIds.length > 0) await deleteItemsBatch(familyId, 'pantry', removedIds);
      }
      setPantryState(newData);
  };

  const filteredTransactions = useMemo(() => {
      if (budgetMode === 'family') return transactions;
      const myMemberId = members.find(m => m.userId === user?.uid)?.id;
      if (!myMemberId) return transactions;
      return transactions.filter(t => t.memberId === myMemberId);
  }, [transactions, budgetMode, members, user]);

  const totalBalance = useMemo(() => {
    let relevantTransactions = filteredTransactions;
    if (settings.initialBalanceDate) {
        const startDate = new Date(settings.initialBalanceDate);
        startDate.setHours(0, 0, 0, 0);
        relevantTransactions = filteredTransactions.filter(t => new Date(t.date).getTime() >= startDate.getTime());
    }
    const income = relevantTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = relevantTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return (settings.initialBalance || 0) + income - expense;
  }, [filteredTransactions, settings.initialBalance, settings.initialBalanceDate]);

  const currentMonthSpent = useMemo(() => {
    const now = new Date();
    return filteredTransactions
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear())
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  const value = {
    transactions, setTransactions,
    shoppingItems, setShoppingItems,
    pantry, setPantry: handlePantryUpdate,
    events, setEvents,
    goals, setGoals,
    members, setMembers,
    categories, setCategories,
    learnedRules, setLearnedRules: setLocalRules,
    aiKnowledge, addAIKnowledge, deleteAIKnowledge,
    settings, setSettings, updateSettings,
    debts, setDebts,
    projects, setProjects,
    loyaltyCards, setLoyaltyCards,
    wishlist, setWishlist,
    notifications, setNotifications,
    addReminder,
    dismissedNotificationIds,
    dismissNotification,
    filteredTransactions,
    totalBalance,
    currentMonthSpent,
    savingsRate: settings.savingsRate ?? 10,
    setSavingsRate: updateSavingsRate,
    budgetMode, setBudgetMode
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
