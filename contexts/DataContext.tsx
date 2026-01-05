
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  Transaction, AppSettings, FamilyMember, ShoppingItem, FamilyEvent, 
  Subscription, Debt, Project, PantryItem, MeterReading, 
  LoyaltyCard, WishlistItem, SavingsGoal, LearnedRule, Category, MandatoryExpense 
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
    { id: 'balance', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    { id: 'charts', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'shopping', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    { id: 'goals', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
  ],
  isPinEnabled: false,
  enabledTabs: ['overview', 'budget', 'plans', 'shopping', 'services'],
  enabledServices: ['wallet', 'meters', 'subs', 'wishlist', 'chat', 'pantry', 'debts', 'projects'],
  defaultBudgetMode: 'personal',
  autoSendEventsToTelegram: false,
  pushEnabled: false,
  dayStartHour: 8,
  dayEndHour: 23,
  initialBalance: 0,
  salaryDates: [10, 25],
  mandatoryExpenses: [],
  alfaMapping: { date: 'дата', time: '', amount: 'сумма', category: '', note: 'описание' },
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
  subscriptions: Subscription[];
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>;
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
  const { familyId, user } = useAuth();

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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // UI State moved here as it affects derived calculations
  const [savingsRate, setSavingsRate] = useState(10);
  const [budgetMode, setBudgetMode] = useState<'personal' | 'family'>('personal');

  // --- Subscriptions ---
  useEffect(() => {
    // Always try to load global rules, even if family isn't ready
    const unsubGlobal = subscribeToGlobalRules((rules) => {
        setGlobalRules(rules);
    });

    if (!familyId) {
        // Load demo data if no family
        setTransactions(DEMO_TRANSACTIONS);
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
      subscribeToCollection(familyId, 'subscriptions', (data) => setSubscriptions(data as Subscription[])),
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

    return () => unsubs.forEach(u => u());
  }, [familyId]);

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
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return (settings.initialBalance || 0) + income - expense;
  }, [filteredTransactions, settings.initialBalance]);

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
    subscriptions, setSubscriptions,
    debts, setDebts,
    projects, setProjects,
    loyaltyCards, setLoyaltyCards,
    meterReadings, setMeterReadings,
    wishlist, setWishlist,
    
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
