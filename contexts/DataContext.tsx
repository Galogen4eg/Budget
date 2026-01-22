
import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { 
  Transaction, AppSettings, FamilyMember, ShoppingItem, FamilyEvent, 
  Debt, Project, PantryItem, 
  LoyaltyCard, WishlistItem, SavingsGoal, LearnedRule, Category, AppNotification, Reminder, AIKnowledgeItem
} from '../types';
import { 
  FAMILY_MEMBERS, INITIAL_CATEGORIES, DEFAULT_RULES, DEMO_TRANSACTIONS,
  DEMO_SHOPPING_ITEMS, DEMO_EVENTS, DEMO_GOALS, DEMO_DEBTS, DEMO_PROJECTS, DEMO_LOYALTY_CARDS, DEMO_MANDATORY_EXPENSES
} from '../constants';
import { 
  subscribeToCollection, subscribeToGlobalRules,
  addItemsBatch, deleteItemsBatch, addItem, deleteItem, saveAppSettings, subscribeToAppSettings
} from '../utils/db';
import { useAuth } from './AuthContext';

// Default Settings
export const DEFAULT_SETTINGS: AppSettings = {
  familyName: 'Семья',
  currency: '₽',
  startOfMonthDay: 1,
  privacyMode: false,
  theme: 'light', // Default theme
  savingsRate: 10, // Default savings rate
  widgets: [
    { id: 'balance', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
    { id: 'category_analysis', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
    { id: 'shopping', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'wallet', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'goals', isVisible: false, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
  ],
  isPinEnabled: false,
  enabledTabs: ['overview', 'budget', 'plans', 'shopping', 'services'],
  enabledServices: ['wallet', 'projects'], 
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
  showFeedbackTool: false, // Default hidden
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
  updateSettings: (newSettings: AppSettings) => Promise<void>; // New unified method
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
  
  // Notification Management
  dismissedNotificationIds: string[];
  dismissNotification: (id: string) => void;

  // Derived Stats
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

// Helper to merge widgets
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
  const { familyId, user, loading: authLoading, isOfflineMode } = useAuth();

  // --- Data State ---
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
  
  const learnedRules = useMemo(() => {
      const ruleMap = new Map<string, LearnedRule>();
      
      // 1. Apply Default Rules (Lowest Priority)
      DEFAULT_RULES.forEach(r => ruleMap.set(r.keyword.toLowerCase(), r));
      
      // 2. Apply Global Database Rules (Medium Priority)
      globalRules.forEach(r => ruleMap.set(r.keyword.toLowerCase(), r));
      
      // 3. Apply Local Family Rules (Highest Priority - Overrides others)
      localRules.forEach(r => ruleMap.set(r.keyword.toLowerCase(), r));
      
      return Array.from(ruleMap.values());
  }, [localRules, globalRules]);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const [debts, setDebts] = useState<Debt[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // Removed isolated savingsRate state
  const [budgetMode, setBudgetMode] = useState<'personal' | 'family'>('personal');

  const isInitialLoad = useRef(true);

  // Wrapper for savings rate to maintain API compatibility but store in settings
  const updateSavingsRate = async (rate: number) => {
      const newSettings = { ...settings, savingsRate: rate };
      setSettings(newSettings);
      if (familyId && user) await saveAppSettings(familyId, user.uid, newSettings);
  };

  // Unified update function exposed to consumers
  const updateSettings = async (newSettings: AppSettings) => {
      setSettings(newSettings);
      if (familyId && user) {
          await saveAppSettings(familyId, user.uid, newSettings);
      }
  };

  // --- Subscriptions ---
  useEffect(() => {
    const unsubGlobal = subscribeToGlobalRules((rules) => {
        setGlobalRules(rules);
    });

    if (!familyId) {
        const loadLocal = (key: string, setter: (val: any) => void, fallback?: any) => {
            const stored = localStorage.getItem(`local_${key}`);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (isOfflineMode && Array.isArray(parsed) && parsed.length === 0 && fallback && Array.isArray(fallback) && fallback.length > 0) {
                        setter(fallback);
                        return;
                    }
                    setter(parsed);
                } catch (e) {
                    console.error(`Failed to parse local_${key}`, e);
                    if (fallback) setter(fallback);
                }
            } else if (fallback) {
                setter(fallback);
            }
        };

        const demoTransactions = isOfflineMode ? DEMO_TRANSACTIONS : [];
        const demoShopping = isOfflineMode ? DEMO_SHOPPING_ITEMS : [];
        const demoEvents = isOfflineMode ? DEMO_EVENTS : [];
        const demoGoals = isOfflineMode ? DEMO_GOALS : [];
        const demoDebts = isOfflineMode ? DEMO_DEBTS : [];
        const demoProjects = isOfflineMode ? DEMO_PROJECTS : [];
        const demoMembers = isOfflineMode ? FAMILY_MEMBERS : [];
        const demoCards = isOfflineMode ? DEMO_LOYALTY_CARDS : [];

        loadLocal('transactions', setTransactions, demoTransactions);
        loadLocal('shopping', setShoppingItems, demoShopping);
        loadLocal('events', setEvents, demoEvents);
        loadLocal('goals', setGoals, demoGoals);
        loadLocal('debts', setDebts, demoDebts);
        loadLocal('projects', setProjects, demoProjects);
        loadLocal('pantry', setPantryState, []);
        loadLocal('loyalty', setLoyaltyCards, demoCards);
        loadLocal('wishlist', setWishlist, []);
        loadLocal('reminders', setReminders, []);
        loadLocal('knowledge', setAiKnowledge, []);
        // RESTORED: Loading local rules for offline mode
        loadLocal('rules', setLocalRules, []);
        
        // Load settings and ensure defaults are applied and widgets merged
        loadLocal('settings', (s: AppSettings) => {
            const mergedSettings = {
                ...s, 
                savingsRate: s.savingsRate ?? 10,
                // Only merge demo expenses if offline and array is empty
                mandatoryExpenses: (isOfflineMode && (!s.mandatoryExpenses || s.mandatoryExpenses.length === 0)) ? DEMO_MANDATORY_EXPENSES : s.mandatoryExpenses || [],
                widgets: mergeWidgets(s.widgets)
            };
            setSettings(prev => ({...prev, ...mergedSettings}));
        }, DEFAULT_SETTINGS);
        loadLocal('dismissed_notifs', setDismissedNotificationIds, []);
        
        const storedMembers = localStorage.getItem('local_members');
        if (storedMembers) {
            const parsedMembers = JSON.parse(storedMembers);
            if (isOfflineMode && parsedMembers.length === 0 && demoMembers.length > 0) {
                setMembers(demoMembers);
            } else {
                setMembers(parsedMembers);
            }
        } else {
            setMembers(demoMembers);
        }

        isInitialLoad.current = false;
        return unsubGlobal;
    }

    const unsubs = [
      unsubGlobal,
      subscribeToCollection(familyId, 'transactions', (data) => setTransactions(data as Transaction[])),
      subscribeToCollection(familyId, 'shopping', (data) => setShoppingItems(data as ShoppingItem[])),
      subscribeToCollection(familyId, 'pantry', (data) => setPantryState(data as PantryItem[])),
      subscribeToCollection(familyId, 'events', (data) => setEvents(data as FamilyEvent[])),
      subscribeToCollection(familyId, 'goals', (data) => setGoals(data as SavingsGoal[])),
      subscribeToCollection(familyId, 'members', (data) => { 
          if (data.length > 0) setMembers(data as FamilyMember[]);
      }),
      subscribeToCollection(familyId, 'categories', (data) => { 
          if (data.length > 0) setCategories(data as Category[]);
      }),
      subscribeToCollection(familyId, 'rules', (data) => setLocalRules(data as LearnedRule[])),
      subscribeToCollection(familyId, 'knowledge', (data) => setAiKnowledge(data as AIKnowledgeItem[])),
      subscribeToCollection(familyId, 'debts', (data) => setDebts(data as Debt[])),
      subscribeToCollection(familyId, 'projects', (data) => setProjects(data as Project[])),
      subscribeToCollection(familyId, 'loyalty', (data) => setLoyaltyCards(data as LoyaltyCard[])),
      subscribeToCollection(familyId, 'wishlist', (data) => setWishlist(data as WishlistItem[])),
      // NEW: Subscribe to merged settings (Shared + User)
      subscribeToAppSettings(familyId, user?.uid || 'unknown', (data) => {
          if (data) {
              const mergedWidgets = mergeWidgets(data.widgets);
              setSettings(prev => ({ ...prev, ...data, widgets: mergedWidgets }));
              if (data.defaultBudgetMode) setBudgetMode(data.defaultBudgetMode);
          }
      })
    ];
    
    // Always load dismissed notifications from local storage (device specific preference)
    const storedDismissed = localStorage.getItem('local_dismissed_notifs');
    if (storedDismissed) {
        try { setDismissedNotificationIds(JSON.parse(storedDismissed)); } catch {}
    }

    isInitialLoad.current = false;
    return () => unsubs.forEach(u => u());
  }, [familyId, isOfflineMode, user?.uid]);

  // --- Local Storage Sync ---
  useEffect(() => {
      // Sync dismissed notifications to local storage immediately
      localStorage.setItem('local_dismissed_notifs', JSON.stringify(dismissedNotificationIds));

      if (!authLoading && !isInitialLoad.current && !familyId) {
          localStorage.setItem('local_transactions', JSON.stringify(transactions));
          localStorage.setItem('local_shopping', JSON.stringify(shoppingItems));
          localStorage.setItem('local_events', JSON.stringify(events));
          localStorage.setItem('local_pantry', JSON.stringify(pantry));
          localStorage.setItem('local_goals', JSON.stringify(goals));
          localStorage.setItem('local_debts', JSON.stringify(debts));
          localStorage.setItem('local_projects', JSON.stringify(projects));
          localStorage.setItem('local_loyalty', JSON.stringify(loyaltyCards));
          localStorage.setItem('local_wishlist', JSON.stringify(wishlist));
          localStorage.setItem('local_settings', JSON.stringify(settings));
          localStorage.setItem('local_members', JSON.stringify(members));
          localStorage.setItem('local_knowledge', JSON.stringify(aiKnowledge));
          localStorage.setItem('local_reminders', JSON.stringify(reminders));
          // RESTORED: Saving rules to local storage
          localStorage.setItem('local_rules', JSON.stringify(localRules));
      } else {
          localStorage.setItem('local_reminders', JSON.stringify(reminders));
      }
  }, [
      authLoading, familyId, transactions, shoppingItems, events, pantry, 
      goals, debts, projects, loyaltyCards, wishlist, settings, members, reminders, 
      aiKnowledge, dismissedNotificationIds, localRules
  ]);

  const dismissNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setDismissedNotificationIds(prev => [...prev, id]);
  };

  // --- Reminder Logic ---
  useEffect(() => {
      const checkReminders = () => {
          const now = Date.now();
          let hasChanges = false;
          
          setReminders(prev => {
              const due = prev.filter(r => r.targetTime <= now);
              const upcoming = prev.filter(r => r.targetTime > now);
              
              if (due.length > 0) {
                  hasChanges = true;
                  const newNotifs: AppNotification[] = due.map(r => ({
                      id: `reminder_${r.id}`,
                      title: 'Напоминание ⏰',
                      message: r.text,
                      type: 'info',
                      date: new Date().toISOString(),
                      isRead: false
                  }));
                  
                  // Filter out if they were somehow already dismissed/seen in this session
                  const filteredNew = newNotifs.filter(n => !dismissedNotificationIds.includes(n.id));
                  
                  if (filteredNew.length > 0) {
                      setNotifications(curr => {
                          // Prevent duplicates in current list
                          const unique = filteredNew.filter(n => !curr.some(c => c.id === n.id));
                          return [...unique, ...curr];
                      });
                      
                      if ("Notification" in window && Notification.permission === "granted") {
                          due.forEach(r => new Notification("Напоминание", { body: r.text, icon: '/favicon.ico' }));
                      }
                      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                  }
              }
              
              return hasChanges ? upcoming : prev;
          });
      };

      if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
      }

      const interval = setInterval(checkReminders, 5000); 
      return () => clearInterval(interval);
  }, [dismissedNotificationIds]);

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
      const newItem: AIKnowledgeItem = {
          id: Date.now().toString(),
          text,
          addedDate: new Date().toISOString()
      };
      setAiKnowledge(prev => [...prev, newItem]);
      if (familyId) await addItem(familyId, 'knowledge', newItem);
  };

  const deleteAIKnowledge = async (id: string) => {
      setAiKnowledge(prev => prev.filter(k => k.id !== id));
      if (familyId) await deleteItem(familyId, 'knowledge', id);
  };

  useEffect(() => {
      if (categories.length === 0) {
          setCategories(INITIAL_CATEGORIES);
          if (familyId) {
              addItemsBatch(familyId, 'categories', INITIAL_CATEGORIES)
                .catch(err => console.error("Failed to restore categories to DB", err));
          }
      }
  }, [categories, familyId]);

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
    settings, setSettings, updateSettings, // Expose unified updater
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

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
