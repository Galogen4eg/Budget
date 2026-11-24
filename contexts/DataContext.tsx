

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { 
  Transaction, AppSettings, FamilyMember, ShoppingItem, FamilyEvent, 
  Debt, PantryItem, 
  LoyaltyCard, SavingsGoal, LearnedRule, Category, AppNotification, Reminder, AIKnowledgeItem
} from '../types';
import { 
  FAMILY_MEMBERS, INITIAL_CATEGORIES, DEFAULT_RULES, DEMO_TRANSACTIONS,
  DEMO_SHOPPING_ITEMS, DEMO_EVENTS, DEMO_GOALS, DEMO_DEBTS, DEMO_LOYALTY_CARDS, DEMO_MANDATORY_EXPENSES
} from '../constants';
import { 
  subscribeToCollection, subscribeToGlobalRules,
  addItemsBatch, deleteItemsBatch, addItem, deleteItem, createCategoriesIfMissing, saveAppSettingsPatch, commitMandatoryPaymentBundle, commitPersonalMandatoryPaymentBundle, subscribeToAppSettings, subscribeToHouseholdBudgetPolicy, subscribeToScopedFinancialCollection
} from '../utils/db';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { missingMerchantCategories } from '../utils/merchantCategoryCatalog';
import { missingIncomeCategories } from '../utils/categoryCatalog';
import { effectiveBudgetMode, projectPersonalFinance, visibleBudgetRecords, toPersonalSettingsPatch } from '../utils/familyBudgetPolicy';
import { diffSettings, personalTransactions } from '../utils/budgetConsistency';

// Default Settings
export const DEFAULT_SETTINGS: AppSettings = {
  familyName: 'Семья',
  currency: '₽',
  startOfMonthDay: 1,
  privacyMode: false,
  theme: 'light', // Default theme
  savingsRate: 10, // Default savings rate
  geminiApiKey: '', // Default empty key
  widgets: [
    { id: 'balance', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
    { id: 'category_analysis', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
    { id: 'shopping', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'week_events', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'wallet', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'goals', isVisible: false, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
  ],
  isPinEnabled: false,
  enabledTabs: ['overview', 'budget', 'plans', 'shopping', 'chat', 'services'],
  enabledServices: ['wallet', 'debts'], 
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
  importSourcesReady: boolean;
  settingsReady: boolean;
  learnedRules: LearnedRule[];
  setLearnedRules: React.Dispatch<React.SetStateAction<LearnedRule[]>>;
  aiKnowledge: AIKnowledgeItem[];
  addAIKnowledge: (text: string) => Promise<void>;
  deleteAIKnowledge: (id: string) => Promise<void>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>; // Patch only modified fields
  updateMandatoryPaymentBundle: (
    changes: Pick<AppSettings, 'mandatoryExpenses' | 'manualPaidExpenses'>,
    debtChanges: ReadonlyArray<{id: string; changes: Partial<Debt>}>
  ) => Promise<void>;
  debts: Debt[];
  setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
  loyaltyCards: LoyaltyCard[];
  setLoyaltyCards: React.Dispatch<React.SetStateAction<LoyaltyCard[]>>;
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
  householdPersonal: boolean;
  financialSettings: AppSettings;
  budgetMode: 'personal' | 'family';
  setBudgetMode: React.Dispatch<React.SetStateAction<'personal' | 'family'>>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export const useData = () => useContext(DataContext);

/**
 * Валидатор и санитайзер транзакций для гарантии числового формата суммы и корректных дат
 */
export const sanitizeTransaction = (raw: any): Transaction => {
  const num = Number(raw?.amount);
  const amount = Number.isFinite(num) ? Math.abs(num) : 0;
  return {
    ...raw,
    id: raw?.id || String(Date.now()),
    amount,
    date: raw?.date || new Date().toISOString(),
    type: raw?.type === 'income' ? 'income' : 'expense'
  };
};

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
  const [transactionsReady, setTransactionsReady] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);
  const [localRules, setLocalRules] = useState<LearnedRule[]>([]);
  const [globalRules, setGlobalRules] = useState<LearnedRule[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [aiKnowledge, setAiKnowledge] = useState<AIKnowledgeItem[]>([]);
  
  const learnedRules = useMemo(() => {
      const ruleMap = new Map<string, LearnedRule>();
      
      const addRuleToMap = (r: LearnedRule) => {
        const kw = (r.keyword || (r.keywords && r.keywords[0]) || '').toLowerCase().trim();
        if (!kw) return;
        const normalized: LearnedRule = {
          ...r,
          keyword: kw,
          keywords: r.keywords && r.keywords.length > 0 ? Array.from(new Set(r.keywords.map(k => k.toLowerCase().trim()))) : [kw]
        };
        ruleMap.set(kw, normalized);
      };

      // 1. Apply Default Rules (Lowest Priority)
      DEFAULT_RULES.forEach(addRuleToMap);
      
      // 2. Apply Global Database Rules (Medium Priority)
      globalRules.forEach(addRuleToMap);
      
      // 3. Apply Local Family Rules (Highest Priority - Overrides others)
      localRules.forEach(addRuleToMap);
      
      return Array.from(ruleMap.values());
  }, [localRules, globalRules]);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loadedSettingsScope,setLoadedSettingsScope]=useState<string|null>(null);
  const [loadedMembersScope,setLoadedMembersScope]=useState<string|null>(null);
  const memberScope=familyId&&user?.uid?familyId+':'+user.uid:null;
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);

  // Removed isolated savingsRate state
  const [preferredBudgetMode, setBudgetMode] = useState<'personal' | 'family'>('personal');
  const [householdPolicy,setHouseholdPolicy]=useState<{familyId:string;actorUid:string;policy:'family'|'personal'}|null>(null);
  const policyReady=!familyId||(householdPolicy?.familyId===familyId&&householdPolicy?.actorUid===user?.uid);
  const householdPersonal=Boolean(familyId&&(!policyReady||householdPolicy?.policy==='personal'));
  const budgetMode=effectiveBudgetMode(householdPersonal?'personal':'family',preferredBudgetMode);
  const linkedMemberId=(!familyId||loadedMembersScope===memberScope)?members.find(m=>m.userId&&m.userId===user?.uid)?.id:undefined;
  const settingsScope=memberScope&&policyReady?memberScope+':'+(householdPersonal?'personal':'family'):null;
  const settingsReady=!familyId||Boolean(settingsScope&&loadedSettingsScope===settingsScope);
  const baseSettings=settingsReady?settings:DEFAULT_SETTINGS;
  useEffect(()=>{
    if(!familyId||!user?.uid)return;
    setHouseholdPolicy(null);
    return subscribeToHouseholdBudgetPolicy(familyId,
      value=>setHouseholdPolicy({familyId,actorUid:user.uid,policy:value.policy}),
      ()=>setHouseholdPolicy(null));
  },[familyId,user?.uid]);
  const financialSettings=useMemo(()=>householdPersonal?projectPersonalFinance(baseSettings,policyReady&&settingsReady?linkedMemberId:undefined):baseSettings,[householdPersonal,baseSettings,linkedMemberId,policyReady,settingsReady]);
  useEffect(()=>{
    if(!familyId||!user?.uid||!settingsScope)return;
    setLoadedSettingsScope(null);
    return subscribeToAppSettings(familyId,user.uid,data=>{
      const next={...DEFAULT_SETTINGS,...data,widgets:mergeWidgets(data.widgets)};
      settingsRef.current=next;
      setSettings(next);
      setLoadedSettingsScope(settingsScope);
      if(data.defaultBudgetMode)setBudgetMode(data.defaultBudgetMode);
    });
  },[familyId,user?.uid,settingsScope]);
  const visibleTransactions=useMemo(()=>householdPersonal?visibleBudgetRecords(transactions,'personal',policyReady?linkedMemberId:undefined):transactions,[householdPersonal,transactions,linkedMemberId,policyReady]);
  const visibleGoals=useMemo(()=>householdPersonal?visibleBudgetRecords(goals,'personal',policyReady?linkedMemberId:undefined):goals,[householdPersonal,goals,linkedMemberId,policyReady]);
  const visibleDebts=useMemo(()=>householdPersonal?visibleBudgetRecords(debts,'personal',policyReady?linkedMemberId:undefined):debts,[householdPersonal,debts,linkedMemberId,policyReady]);


  useEffect(()=>{
    if(!familyId)return;
    setTransactions([]);setGoals([]);setDebts([]);setTransactionsReady(false);
    if(!policyReady||(householdPersonal&&!linkedMemberId))return;
    const mode=householdPersonal?'personal':'family';
    const onError=(error:Error)=>console.error('Financial subscription failed',error);
    const unsubs=[
      subscribeToScopedFinancialCollection(familyId,'transactions',mode,linkedMemberId,items=>{setTransactions(items.map(sanitizeTransaction));setTransactionsReady(true);},error=>{setTransactionsReady(false);onError(error);}),
      subscribeToScopedFinancialCollection(familyId,'goals',mode,linkedMemberId,items=>setGoals(items as SavingsGoal[]),onError),
      subscribeToScopedFinancialCollection(familyId,'debts',mode,linkedMemberId,items=>setDebts(items as Debt[]),onError)
    ];
    return ()=>unsubs.forEach(unsub=>unsub());
  },[familyId,policyReady,householdPersonal,linkedMemberId]);

  const isInitialLoad = useRef(true);
  const merchantCatalogSyncAttempted = useRef(new Set<string>());

  // Wrapper for savings rate to maintain API compatibility but store in settings
  const updateSavingsRate = async (rate: number) => {
      if(familyId&&!policyReady)throw new Error('Режим бюджета ещё не подтверждён');
      await updateSettings(householdPersonal?{personalSavingsRate:rate}:{savingsRate:rate});
  };

  // Persist only modified keys; a stale client must not rewrite unrelated
  // family fields belonging to another person's settings change.
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
      const current = settingsRef.current;
      if(familyId&&(!policyReady||!settingsReady))throw new Error('Дождитесь загрузки настроек бюджета');
      const changes=diffSettings(householdPersonal?projectPersonalFinance(current,linkedMemberId):current,newSettings);
      const patch=householdPersonal?toPersonalSettingsPatch<AppSettings>(changes):changes;
      if (!Object.keys(patch).length) return;
      const merged = { ...current, ...patch,
          ...(patch.manualPaidExpenses ? { manualPaidExpenses: {
              ...(current.manualPaidExpenses || {}), ...patch.manualPaidExpenses
          }} : {})
      };
      settingsRef.current = merged;
      setSettings(merged);
      if (familyId && user) {
          try {
              await saveAppSettingsPatch(familyId, user.uid, patch);
          } catch (error) {
              // Firestore subscription is authoritative; do not claim success.
              settingsRef.current = current;
              setSettings(current);
              throw error;
          }
      }
  };

  // One atomic commit across family obligations and linked debts.
  // Optimistic state is intentionally avoided: errors leave the UI editable.
  const updateMandatoryPaymentBundle = async (
    changes: Pick<AppSettings, 'mandatoryExpenses' | 'manualPaidExpenses'>,
    debtChanges: ReadonlyArray<{id: string; changes: Partial<Debt>}>
  ) => {
    if(familyId&&householdPersonal){
      if(!policyReady||!settingsReady||!user?.uid||!linkedMemberId)throw new Error('Личный профиль не подтверждён');
      const personalChanges={...changes,mandatoryExpenses:changes.mandatoryExpenses.map(e=>({...e,memberId:e.memberId??linkedMemberId}))};
      await commitPersonalMandatoryPaymentBundle(familyId,user.uid,linkedMemberId,personalChanges,debtChanges);
      // Authoritative snapshots update private settings and debts after commit.
      return;
    }
    if (familyId && user) {
      await commitMandatoryPaymentBundle(familyId, user.uid, changes, debtChanges);
    }
    const current = settingsRef.current;
    const merged = {...current, ...changes,
      manualPaidExpenses: {...(current.manualPaidExpenses || {}), ...(changes.manualPaidExpenses || {})}
    };
    settingsRef.current=merged;
    setSettings(merged);
    if (debtChanges.length) {
      const byId = new Map<string,Partial<Debt>>(debtChanges.map(item=>[item.id,item.changes] as const));
      setDebts(previous=>previous.map(debt=>byId.has(debt.id)
        ? {...debt,...byId.get(debt.id)} : debt));
    }
  };

  // Unified persistent updater for learned rules
  const updateRules = async (rulesOrFn: LearnedRule[] | ((prev: LearnedRule[]) => LearnedRule[])) => {
      const updated = typeof rulesOrFn === 'function' ? rulesOrFn(localRules) : rulesOrFn;
      setLocalRules(updated);
      try {
          localStorage.setItem('local_rules', JSON.stringify(updated));
      } catch (e) {
          console.warn("Failed to write local_rules to localStorage:", e);
      }
      if (familyId) {
          try {
              await addItemsBatch(familyId, 'rules', updated);
          } catch (e) {
              console.warn("Failed to sync rules with Firestore:", e);
          }
      }
  };

  // --- Subscriptions ---
  useEffect(() => {
    setTransactionsReady(false);
    setCatalogReady(false);
    // Always load locally cached rules as baseline to prevent rules disappearance on reload
    const cachedRules = localStorage.getItem('local_rules');
    if (cachedRules) {
        try {
            const parsed = JSON.parse(cachedRules);
            if (Array.isArray(parsed) && parsed.length > 0) {
                setLocalRules(parsed);
            }
        } catch (e) {
            console.warn("Could not parse cached local_rules", e);
        }
    }

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
        const demoMembers = isOfflineMode ? FAMILY_MEMBERS : [];
        const demoCards = isOfflineMode ? DEMO_LOYALTY_CARDS : [];

        loadLocal('transactions', (items: any[]) => {
            const list = Array.isArray(items) ? items.map(sanitizeTransaction) : [];
            setTransactions(list);
        }, demoTransactions.map(sanitizeTransaction));
        loadLocal('shopping', setShoppingItems, demoShopping);
        loadLocal('events', setEvents, demoEvents);
        loadLocal('goals', setGoals, demoGoals);
        loadLocal('debts', setDebts, demoDebts);
        loadLocal('pantry', setPantryState, []);
        loadLocal('loyalty', setLoyaltyCards, demoCards);
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
      subscribeToCollection(familyId, 'shopping', (data) => {
        const uniqueMap = new Map<string, ShoppingItem>();
        (data as ShoppingItem[]).forEach(item => {
          if (item && item.id) uniqueMap.set(item.id, item);
        });
        setShoppingItems(Array.from(uniqueMap.values()));
      }),
      subscribeToCollection(familyId, 'pantry', (data) => setPantryState(data as PantryItem[])),
      subscribeToCollection(familyId, 'events', (data) => setEvents(data as FamilyEvent[])),
      subscribeToCollection(familyId, 'members', (data) => {
          setMembers(data as FamilyMember[]);
          setLoadedMembersScope(memberScope);
      }),
      subscribeToCollection(familyId, 'categories', (data) => {
          const saved = data as Category[];
          if (saved.length > 0) setCategories(saved);
          // Older families were initialized before named store subcategories
          // existed. The Firestore snapshot must not permanently erase them.
          // Create only missing built-ins; existing customized docs stay intact.
          // New families need the complete default catalog; existing families
          // retain their custom deletions except essential income/merchant IDs.
          const missing = saved.length === 0 ? INITIAL_CATEGORIES :
              [...missingMerchantCategories(INITIAL_CATEGORIES, saved), ...missingIncomeCategories(INITIAL_CATEGORIES, saved)];
          if (missing.length === 0) setCatalogReady(true);
          if (missing.length > 0 && !merchantCatalogSyncAttempted.current.has(familyId)) {
              merchantCatalogSyncAttempted.current.add(familyId);
              void createCategoriesIfMissing(familyId, missing)
                  .catch(error => {
                      merchantCatalogSyncAttempted.current.delete(familyId);
                      console.error('Could not restore bank categories:', error);
                      toast.error('Не удалось синхронизировать категории с Firebase. Автоимпорт приостановлен.');
                  });
          }
      }),
      subscribeToCollection(familyId, 'rules', async (data) => {
          const list = (data as LearnedRule[]) || [];
          if (list.length > 0) {
              setLocalRules(list);
              try { localStorage.setItem('local_rules', JSON.stringify(list)); } catch {}
          } else {
              // If Firestore rules are empty, check if we have cached rules locally and upload them
              const cached = localStorage.getItem('local_rules');
              if (cached) {
                  try {
                      const parsed = JSON.parse(cached);
                      if (Array.isArray(parsed) && parsed.length > 0) {
                          setLocalRules(parsed);
                          await addItemsBatch(familyId, 'rules', parsed);
                      }
                  } catch (e) {
                      console.warn("Failed to migrate cached rules to Firestore", e);
                  }
              }
          }
      }),
      subscribeToCollection(familyId, 'knowledge', (data) => setAiKnowledge(data as AIKnowledgeItem[])),
      subscribeToCollection(familyId, 'loyalty', (data) => setLoyaltyCards(data as LoyaltyCard[])),

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
      // Always keep local rules backed up on device
      try { localStorage.setItem('local_rules', JSON.stringify(localRules)); } catch {}

      if (!authLoading && !isInitialLoad.current && !familyId) {
          localStorage.setItem('local_transactions', JSON.stringify(transactions));
          localStorage.setItem('local_shopping', JSON.stringify(shoppingItems));
          localStorage.setItem('local_events', JSON.stringify(events));
          localStorage.setItem('local_pantry', JSON.stringify(pantry));
          localStorage.setItem('local_goals', JSON.stringify(goals));
          localStorage.setItem('local_debts', JSON.stringify(debts));
          localStorage.setItem('local_loyalty', JSON.stringify(loyaltyCards));
          localStorage.setItem('local_settings', JSON.stringify(settings));
          localStorage.setItem('local_members', JSON.stringify(members));
          localStorage.setItem('local_knowledge', JSON.stringify(aiKnowledge));
          localStorage.setItem('local_reminders', JSON.stringify(reminders));
      } else {
          localStorage.setItem('local_reminders', JSON.stringify(reminders));
      }
  }, [
      authLoading, familyId, transactions, shoppingItems, events, pantry, 
      goals, debts, loyaltyCards, settings, members, reminders, 
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
      const currentUserId = user?.uid;
      const myMemberId = members.find(m => m.userId && m.userId === currentUserId)?.id;
      return personalTransactions(visibleTransactions, budgetMode, myMemberId);
  }, [visibleTransactions, budgetMode, members, user]);

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateStr);
  };

  const totalBalance = useMemo(() => {
    let relevantTransactions = filteredTransactions;
    if (financialSettings.initialBalanceDate) {
        const startDate = parseLocalDate(financialSettings.initialBalanceDate);
        startDate.setHours(0, 0, 0, 0);
        relevantTransactions = filteredTransactions.filter(t => parseLocalDate(t.date).getTime() >= startDate.getTime());
    }
    const income = relevantTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + (Number.isFinite(Number(t.amount)) ? Math.abs(Number(t.amount)) : 0), 0);
    const expense = relevantTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + (Number.isFinite(Number(t.amount)) ? Math.abs(Number(t.amount)) : 0), 0);
    const safeInitial = Number.isFinite(Number(financialSettings.initialBalance)) ? Number(financialSettings.initialBalance) : 0;
    const rawBalance = safeInitial + income - expense;
    return Math.round(rawBalance * 100) / 100;
  }, [filteredTransactions, financialSettings.initialBalance, financialSettings.initialBalanceDate]);

  const currentMonthSpent = useMemo(() => {
    const now = new Date();
    const rawSpent = filteredTransactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        const txDate = parseLocalDate(t.date);
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      })
      .reduce((acc, t) => acc + (Number.isFinite(Number(t.amount)) ? Math.abs(Number(t.amount)) : 0), 0);
    return Math.round(rawSpent * 100) / 100;
  }, [filteredTransactions]);

  const value = {
    householdPersonal, financialSettings,
    transactions: visibleTransactions, setTransactions,
    shoppingItems, setShoppingItems,
    pantry, setPantry: handlePantryUpdate,
    events, setEvents,
    goals: visibleGoals, setGoals,
    members, setMembers,
    categories, setCategories,
    importSourcesReady: transactionsReady && catalogReady && settingsReady,
    settingsReady,
    learnedRules, setLearnedRules: updateRules,
    aiKnowledge, addAIKnowledge, deleteAIKnowledge,
    settings:financialSettings, setSettings, updateSettings, updateMandatoryPaymentBundle, // Expose scoped settings
    debts: visibleDebts, setDebts,
    loyaltyCards, setLoyaltyCards,
    notifications, setNotifications,
    addReminder,
    dismissedNotificationIds,
    dismissNotification,
    
    filteredTransactions,
    totalBalance,
    currentMonthSpent,
    savingsRate: financialSettings.savingsRate ?? 10,
    setSavingsRate: updateSavingsRate,
    budgetMode, setBudgetMode
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};