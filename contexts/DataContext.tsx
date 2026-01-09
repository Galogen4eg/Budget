
import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { 
  Transaction, AppSettings, FamilyMember, ShoppingItem, FamilyEvent, 
  Debt, Project, PantryItem, MeterReading, 
  LoyaltyCard, WishlistItem, SavingsGoal, LearnedRule, Category, MandatoryExpense, AppNotification 
} from '../types';
import { 
  FAMILY_MEMBERS, INITIAL_CATEGORIES, DEMO_TRANSACTIONS
} from '../constants';
import { 
  subscribeToCollection, subscribeToSettings, subscribeToGlobalRules,
  addItemsBatch, updateItemsBatch, deleteItemsBatch 
} from '../utils/db';
import { useAuth } from './AuthContext';

// Default Settings
const DEFAULT_SETTINGS: AppSettings = {
  familyName: 'Семья',
  currency: '₽',
  startOfMonthDay: 1,
  privacyMode: false,
  theme: 'light', // Default theme
  widgets: [
    // Left Column (Tall)
    { id: 'category_analysis', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
    // Center Top (Wide)
    { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    // Center Bottom Left
    { id: 'shopping', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    // Center Bottom Right
    { id: 'goals', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    // Right Column (Tall)
    { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
    
    { id: 'balance', isVisible: false, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
  ],
  isPinEnabled: false,
  enabledTabs: ['overview', 'budget', 'plans', 'shopping', 'services'],
  enabledServices: ['wallet', 'chat', 'debts', 'projects'], // 'subs' removed from default
  defaultBudgetMode: 'personal',
  autoSendEventsToTelegram: false,
  pushEnabled: false,
  dayStartHour: 8,
  dayEndHour: 23,
  initialBalance: 0,
  salaryDates: [10, 25],
  mandatoryExpenses: [],
  enableSmartReserve: true, // New Default
  manualReservedAmount: 0,
  manualPaidExpenses: {},
  ignoredDuplicatePairs: [], // Default empty
  alfaMapping: { date: 'дата', time: '', amount: 'сумма', category: '', note: 'описание' },
  
  // Detailed default templates
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
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  debts: Debt[];
  setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  loyaltyCards: LoyaltyCard[];
  setLoyaltyCards: React.Dispatch<React.SetStateAction<LoyaltyCard[]>>;
  meterReadings: MeterReading[];
  setMeterReadings: React.Dispatch<React.SetStateAction<MeterReading[]>>;
  wishlist: WishlistItem[];
  setWishlist: React.Dispatch<React.SetStateAction<WishlistItem[]>>;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  
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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { familyId, user, loading: authLoading } = useAuth();

  // --- Data State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [pantry, setPantryState] = useState<PantryItem[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>(FAMILY_MEMBERS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [localRules, setLocalRules] = useState<LearnedRule[]>([]);
  const [globalRules, setGlobalRules] = useState<LearnedRule[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  // Computed learned rules (Local overrides Global)
  const learnedRules = useMemo(() => {
      // Map global rules first
      const ruleMap = new Map<string, LearnedRule>();
      globalRules.forEach(r => ruleMap.set(r.keyword.toLowerCase(), r));
      // Override with local rules
      localRules.forEach(r => ruleMap.set(r.keyword.toLowerCase(), r));
      return Array.from(ruleMap.values());
  }, [localRules, globalRules]);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // Services Data
  const [debts, setDebts] = useState<Debt[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // UI State moved here as it affects derived calculations
  const [savingsRate, setSavingsRate] = useState(10);
  const [budgetMode, setBudgetMode] = useState<'personal' | 'family'>('personal');

  // Ref to track initial load to avoid overwriting local storage with empty states
  const isInitialLoad = useRef(true);

  // --- Subscriptions ---
  useEffect(() => {
    // Always try to load global rules, even if family isn't ready
    const unsubGlobal = subscribeToGlobalRules((rules) => {
        setGlobalRules(rules);
    });

    if (!familyId) {
        // Load data from LocalStorage if available, otherwise use defaults
        const loadLocal = (key: string, setter: (val: any) => void, fallback?: any) => {
            const stored = localStorage.getItem(`local_${key}`);
            if (stored) {
                try {
                    setter(JSON.parse(stored));
                } catch (e) {
                    console.error(`Failed to parse local_${key}`, e);
                    if (fallback) setter(fallback);
                }
            } else if (fallback) {
                setter(fallback);
            }
        };

        loadLocal('transactions', setTransactions, DEMO_TRANSACTIONS);
        loadLocal('shopping', setShoppingItems, []);
        loadLocal('events', setEvents, []);
        loadLocal('pantry', setPantryState, []);
        loadLocal('goals', setGoals, []);
        loadLocal('debts', setDebts, []);
        loadLocal('projects', setProjects, []);
        loadLocal('loyalty', setLoyaltyCards, []);
        loadLocal('wishlist', setWishlist, []);
        loadLocal('settings', (s: AppSettings) => setSettings(prev => ({...prev, ...s})), DEFAULT_SETTINGS);
        
        // Members need special handling to ensure user is there
        const storedMembers = localStorage.getItem('local_members');
        if (storedMembers) {
            setMembers(JSON.parse(storedMembers));
        }

        isInitialLoad.current = false;
        return unsubGlobal;
    }

    const unsubs = [
      unsubGlobal,
      subscribeToCollection(familyId, 'transactions', (data) => {
          if (data.length > 0) setTransactions(data as Transaction[]);
          else setTransactions(DEMO_TRANSACTIONS); 
      }),
      subscribeToCollection(familyId, 'shopping', (data) => setShoppingItems(data as ShoppingItem[])),
      subscribeToCollection(familyId, 'pantry', (data) => setPantryState(data as PantryItem[])),
      subscribeToCollection(familyId, 'events', (data) => setEvents(data as FamilyEvent[])),
      subscribeToCollection(familyId, 'goals', (data) => setGoals(data as SavingsGoal[])),
      subscribeToCollection(familyId, 'members', (data) => { if (data.length) setMembers(data as FamilyMember[]); }),
      subscribeToCollection(familyId, 'categories', (data) => { 
          if (data.length > 0) setCategories(data as Category[]);
      }),
      subscribeToCollection(familyId, 'rules', (data) => setLocalRules(data as LearnedRule[])),
      subscribeToCollection(familyId, 'debts', (data) => setDebts(data as Debt[])),
      subscribeToCollection(familyId, 'projects', (data) => setProjects(data as Project[])),
      subscribeToCollection(familyId, 'loyalty', (data) => setLoyaltyCards(data as LoyaltyCard[])),
      subscribeToCollection(familyId, 'readings', (data) => setMeterReadings(data as MeterReading[])),
      subscribeToCollection(familyId, 'wishlist', (data) => setWishlist(data as WishlistItem[])),
      subscribeToSettings(familyId, (data) => {
          if (data) {
              setSettings(prev => ({ ...prev, ...data }));
              if (data.defaultBudgetMode) setBudgetMode(data.defaultBudgetMode);
          }
      })
    ];

    isInitialLoad.current = false;
    return () => unsubs.forEach(u => u());
  }, [familyId]);

  // --- Local Storage Sync (For Demo/Offline Mode) ---
  useEffect(() => {
      // Only save to local storage if:
      // 1. Not loading auth
      // 2. Not initial load
      // 3. No family ID (or explicit offline mode)
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
      }
  }, [
      authLoading, familyId, transactions, shoppingItems, events, pantry, 
      goals, debts, projects, loyaltyCards, wishlist, settings, members
  ]);

  // Safety net for categories
  useEffect(() => {
      if (categories.length === 0) {
          setCategories(INITIAL_CATEGORIES);
          if (familyId) {
              addItemsBatch(familyId, 'categories', INITIAL_CATEGORIES)
                .catch(err => console.error("Failed to restore categories to DB", err));
          }
      }
  }, [categories, familyId]);

  // --- Logic Helpers ---
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

  // --- Derived Calculations ---
  const filteredTransactions = useMemo(() => {
      if (budgetMode === 'family') return transactions;
      const currentUserId = user?.uid;
      const myMemberId = members.find(m => m.userId === currentUserId)?.id;
      if (!myMemberId) return transactions;
      return transactions.filter(t => t.memberId === myMemberId);
  }, [transactions, budgetMode, members, user]);

  const totalBalance = useMemo(() => {
    let relevantTransactions = filteredTransactions;

    // If a start date is set for the initial balance, filter transactions
    if (settings.initialBalanceDate) {
        const startDate = new Date(settings.initialBalanceDate);
        // Normalize time to start of day to be inclusive
        startDate.setHours(0, 0, 0, 0);
        
        relevantTransactions = filteredTransactions.filter(t => {
            return new Date(t.date).getTime() >= startDate.getTime();
        });
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
    learnedRules, setLearnedRules: setLocalRules, // Setter updates local rules
    settings, setSettings,
    debts, setDebts,
    projects, setProjects,
    loyaltyCards, setLoyaltyCards,
    meterReadings, setMeterReadings,
    wishlist, setWishlist,
    notifications, setNotifications,
    
    filteredTransactions,
    totalBalance,
    currentMonthSpent,
    savingsRate, setSavingsRate,
    budgetMode, setBudgetMode
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
