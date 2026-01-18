import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { 
  Transaction, AppSettings, FamilyMember, ShoppingItem, FamilyEvent, 
  Debt, Project, PantryItem, 
  LoyaltyCard, WishlistItem, SavingsGoal, LearnedRule, Category, AppNotification, Reminder, AIKnowledgeItem
} from '../types';
import { 
  INITIAL_CATEGORIES
} from '../constants';
import { 
  subscribeToCollection, subscribeToSettings, subscribeToGlobalRules,
  addItemsBatch, deleteItemsBatch, addItem, deleteItem, saveSettings, getLegacyFamilySettings
} from '../utils/db';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export const DEFAULT_SETTINGS: AppSettings = {
  familyName: 'Семья',
  currency: '₽',
  startOfMonthDay: 1,
  privacyMode: false,
  theme: 'light',
  savingsRate: 10,
  widgets: [
    { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
    { id: 'category_analysis', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    { id: 'shopping', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'goals', isVisible: false, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
    { id: 'balance', isVisible: false, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
  ],
  isPinEnabled: false,
  enabledTabs: ['overview', 'budget', 'plans', 'shopping', 'services'],
  enabledServices: ['wallet', 'projects', 'chat', 'pantry', 'debts', 'forecast', 'wishlist'], 
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
  eventTemplate: `📅 *{title}*\n\n🕒 {date} в {time}\n📝 {desc}`,
  shoppingTemplate: `🛒 *Список покупок* ({total} поз.)\n\n{items}`,
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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { familyId, user } = useAuth();

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
      globalRules.forEach(r => ruleMap.set(r.keyword.toLowerCase(), r));
      localRules.forEach(r => ruleMap.set(r.keyword.toLowerCase(), r));
      return Array.from(ruleMap.values());
  }, [localRules, globalRules]);

  const updateSavingsRate = async (rate: number) => {
      const newSettings = { ...settings, savingsRate: rate };
      setSettings(newSettings);
      if (user?.uid) await saveSettings(user.uid, newSettings);
  };

  useEffect(() => {
    const unsubGlobal = subscribeToGlobalRules((rules) => setGlobalRules(rules));

    if (!user) return unsubGlobal;

    const unsubs: (() => void)[] = [unsubGlobal];

    // Подписка на настройки (хранятся в профиле пользователя)
    unsubs.push(subscribeToSettings(user.uid, async (data) => {
        if (data) {
            setSettings(prev => ({ ...prev, ...data }));
            if (data.defaultBudgetMode) setBudgetMode(data.defaultBudgetMode);
        } else if (familyId) {
            // Если в профиле пусто, пробуем мигрировать старые семейные
            const legacy = await getLegacyFamilySettings(familyId);
            if (legacy) {
                setSettings(legacy);
                await saveSettings(user.uid, legacy);
            }
        }
    }, (err) => {
        if (err.code === 'permission-denied') {
            toast.error("Доступ к профилю ограничен. Проверьте вход.");
        }
    }));

    if (familyId) {
        const handlePermissionError = (coll: string) => {
            console.warn(`Permission error for: ${coll}`);
        };

        unsubs.push(subscribeToCollection(familyId, 'transactions', (data) => setTransactions(data as Transaction[]), () => handlePermissionError('transactions')));
        unsubs.push(subscribeToCollection(familyId, 'shopping', (data) => setShoppingItems(data as ShoppingItem[]), () => handlePermissionError('shopping')));
        unsubs.push(subscribeToCollection(familyId, 'pantry', (data) => setPantryState(data as PantryItem[])));
        unsubs.push(subscribeToCollection(familyId, 'events', (data) => setEvents(data as FamilyEvent[])));
        unsubs.push(subscribeToCollection(familyId, 'goals', (data) => setGoals(data as SavingsGoal[])));
        unsubs.push(subscribeToCollection(familyId, 'members', (data) => { if (data.length > 0) setMembers(data as FamilyMember[]); }));
        unsubs.push(subscribeToCollection(familyId, 'categories', (data) => { if (data.length > 0) setCategories(data as Category[]); }));
        unsubs.push(subscribeToCollection(familyId, 'rules', (data) => setLocalRules(data as LearnedRule[])));
        unsubs.push(subscribeToCollection(familyId, 'knowledge', (data) => setAiKnowledge(data as AIKnowledgeItem[])));
        unsubs.push(subscribeToCollection(familyId, 'debts', (data) => setDebts(data as Debt[])));
        unsubs.push(subscribeToCollection(familyId, 'projects', (data) => setProjects(data as Project[])));
        unsubs.push(subscribeToCollection(familyId, 'loyalty', (data) => setLoyaltyCards(data as LoyaltyCard[])));
        unsubs.push(subscribeToCollection(familyId, 'wishlist', (data) => setWishlist(data as WishlistItem[])));
    }

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
      const currentUserId = user?.uid;
      const myMemberId = members.find(m => m.userId === currentUserId)?.id;
      if (!myMemberId) return transactions;
      return transactions.filter(t => t.memberId === myMemberId || t.userId === currentUserId);
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

  return (
    <DataContext.Provider value={{
      transactions, setTransactions,
      shoppingItems, setShoppingItems,
      pantry, setPantry: handlePantryUpdate,
      events, setEvents,
      goals, setGoals,
      members, setMembers,
      categories, setCategories,
      learnedRules, setLearnedRules: setLocalRules,
      aiKnowledge, addAIKnowledge, deleteAIKnowledge,
      settings, setSettings,
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
    }}>
      {children}
    </DataContext.Provider>
  );
};