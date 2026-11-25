

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
  subscribeToCollection, subscribeToWorkspaceCollection, subscribeToGlobalRules,
  addItemsBatch, deleteItemsBatch, addItem, deleteItem, createCategoriesIfMissing, saveAppSettingsPatch, commitMandatoryPaymentBundle, commitPersonalMandatoryPaymentBundle, commitDebtEdit, subscribeToAppSettings, subscribeToHouseholdBudgetPolicy, subscribeToScopedFinancialCollection, subscribeToPersonalCollection, savePersonalItems, deletePersonalItem
} from '../utils/db';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { missingMerchantCategories } from '../utils/merchantCategoryCatalog';
import { missingIncomeCategories } from '../utils/categoryCatalog';
import { displayBudgetMode, budgetDisplayPreferenceKey, projectPersonalDisplayFinance, projectPersonalFinance, visibleBudgetRecords, toPersonalSettingsPatch } from '../utils/familyBudgetPolicy';
import { diffSettings, personalTransactions } from '../utils/budgetConsistency';
import { ledgerBalance, sumMoney } from '../utils/budgetFinancialMath';
import { planDebtExpenseLink } from '../utils/debtEdit';
import { initialWorkspaceRead, updateWorkspaceRead, workspaceStatus, type WorkspaceCollection, type WorkspaceStatus } from '../utils/workspaceReadState';
import { initialFinancialRead, updateFinancialRead, financialReadStatus, type FinancialCollection, type FinancialReadStatus } from '../utils/financialReadState';

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
  financialDataStatus: FinancialReadStatus;
  retryFinancialData: () => void;
  workspaceStatuses: {plans:WorkspaceStatus;shopping:WorkspaceStatus;wallet:WorkspaceStatus};
  retryWorkspace:()=>void;
  settingsReady: boolean;
  familyCalendarReady: boolean;
  shoppingReady: boolean;
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
  saveDebtEdit: (debt:Debt,creating:boolean)=>Promise<void>;
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
  hideSharedBudget: boolean;
  setHideSharedBudget: (hide:boolean)=>void;
  personalDisplayOnly: boolean;
  personalOpeningKnown: boolean;
  displaySettings: AppSettings;
  displayTransactions: Transaction[];
  displayGoals: SavingsGoal[];
  displayMembers: FamilyMember[];
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
  const [financialRead,setFinancialRead]=useState(()=>initialFinancialRead(null));
  const [financialRetry,setFinancialRetry]=useState(0);
  const [workspaceRead,setWorkspaceRead]=useState(()=>initialWorkspaceRead(null));
  const [workspaceRetry,setWorkspaceRetry]=useState(0);
  const retryWorkspace=()=>{
    if(Date.now()<financialRetryAfter.current){toast.info('Повторная проверка временно недоступна. Попробуйте позже.');return;}
    financialRetryAfter.current=Date.now()+10000;
    setWorkspaceRead(initialWorkspaceRead(null));setWorkspaceRetry(n=>n+1);
  };
  const [policyReadError,setPolicyReadError]=useState(false);
  const [settingsReadError,setSettingsReadError]=useState(false);
  const financialRetryAfter=useRef(0);
  const rememberReadFailure=(error:Error)=>{
    if(/resource.exhausted|quota|429/i.test(String((error as Error & {code?:string}).code||'')+' '+error.message))
      financialRetryAfter.current=Math.max(financialRetryAfter.current,Date.now()+300_000);
  };
  const retryFinancialData=()=>{
    if(Date.now()<financialRetryAfter.current){toast.info('Повторная проверка временно недоступна. Попробуйте позже.');return;}
    financialRetryAfter.current=Date.now()+10_000;
    setTransactionsReady(false);
    setFinancialRead(initialFinancialRead(null));
    setPolicyReadError(false);setSettingsReadError(false);
    setFinancialRetry(n=>n+1);
  };
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
  const [loadedEventsScope,setLoadedEventsScope]=useState<string|null>(null);
  const [loadedShoppingScope,setLoadedShoppingScope]=useState<string|null>(null);
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
  // Local device preference scoped to the signed-in account and household.
  const displayKey=budgetDisplayPreferenceKey(familyId,user?.uid);
  const [displayPreference,setDisplayPreference]=useState<{key:string;hide:boolean}|null>(null);
  const storedHide=useMemo(()=>{try{return localStorage.getItem(displayKey)==='1';}catch{return false;}},[displayKey]);
  const hideSharedBudget=displayPreference?.key===displayKey?displayPreference.hide:storedHide;
  const setHideSharedBudget=(hide:boolean)=>{
    setDisplayPreference({key:displayKey,hide});
    try{localStorage.setItem(displayKey,hide?'1':'0');}catch{}
  };
  const personalDisplayOnly=hideSharedBudget&&!householdPersonal;
  const budgetMode=displayBudgetMode(householdPersonal?'personal':'family',preferredBudgetMode,hideSharedBudget);
  const linkedMemberId=(!familyId||loadedMembersScope===memberScope)?members.find(m=>m.userId&&m.userId===user?.uid)?.id:undefined;
  const settingsScope=memberScope&&policyReady?memberScope+':'+(householdPersonal?'personal':'family'):null;
  const settingsReady=!familyId||Boolean(settingsScope&&loadedSettingsScope===settingsScope);
  const workspaceScope=familyId?JSON.stringify([memberScope,workspaceRetry]):null;
  const workspaceStatuses={plans:workspaceStatus(workspaceRead,workspaceScope,['events','members']),shopping:workspaceStatus(workspaceRead,workspaceScope,['shopping','pantry','members']),wallet:workspaceStatus(workspaceRead,workspaceScope,['loyalty'])};
  const shoppingReady=!familyId||Boolean(memberScope&&loadedShoppingScope===memberScope&&workspaceStatuses.shopping==='ready');
  const familyCalendarReady=Boolean(memberScope&&loadedEventsScope===memberScope&&loadedMembersScope===memberScope&&settingsReady&&workspaceStatuses.plans==='ready');
  const baseSettings=settingsReady?settings:DEFAULT_SETTINGS;
  useEffect(()=>{
    if(!familyId||!user?.uid)return;
    setHouseholdPolicy(null);setPolicyReadError(false);
    let active=true;
    const stop=subscribeToHouseholdBudgetPolicy(familyId,
      value=>{if(active){setPolicyReadError(false);setHouseholdPolicy({familyId,actorUid:user.uid,policy:value.policy});}},
      error=>{if(active){rememberReadFailure(error);setPolicyReadError(true);setHouseholdPolicy(null);}});
    return ()=>{active=false;stop();};
  },[familyId,user?.uid,financialRetry]);
  const financialSettings=useMemo(()=>householdPersonal?projectPersonalFinance(baseSettings,policyReady&&settingsReady?linkedMemberId:undefined):baseSettings,[householdPersonal,baseSettings,linkedMemberId,policyReady,settingsReady]);
  useEffect(()=>{
    if(!familyId||!user?.uid||!settingsScope)return;
    setLoadedSettingsScope(null);setSettingsReadError(false);
    let active=true;
    const stop=subscribeToAppSettings(familyId,user.uid,data=>{
      if(!active)return;
      const next={...DEFAULT_SETTINGS,...data,widgets:mergeWidgets(data.widgets)};
      settingsRef.current=next;
      setSettings(next);setSettingsReadError(false);
      setLoadedSettingsScope(settingsScope);
    },error=>{if(active){rememberReadFailure(error);setSettingsReadError(true);setLoadedSettingsScope(null);}});
    return ()=>{active=false;stop();};
  },[familyId,user?.uid,settingsScope,financialRetry]);
  // A settings snapshot for an unrelated field must not reset the current mode.
  useEffect(()=>{if(settingsReady)setBudgetMode(baseSettings.defaultBudgetMode||'personal');},[settingsScope,settingsReady,baseSettings.defaultBudgetMode]);
  // Each account, family and ledger policy owns an independent snapshot scope.
  const financialQueryMemberId=householdPersonal?linkedMemberId:undefined;
  const financialScope=familyId?JSON.stringify([familyId,user?.uid??null,policyReady,householdPersonal,financialQueryMemberId??null,financialRetry]):null;
  const financialScopeMatches=!familyId||financialRead.scope===financialScope;
  const financialDataStatus:FinancialReadStatus=familyId&&(policyReadError||settingsReadError)?'error':financialReadStatus(financialRead,financialScope,settingsReady&&policyReady);
  const visibleTransactions=useMemo(()=>!financialScopeMatches?[]:householdPersonal?visibleBudgetRecords(transactions,'personal',policyReady?linkedMemberId:undefined):transactions,[financialScopeMatches,householdPersonal,transactions,linkedMemberId,policyReady]);
  const visibleGoals=useMemo(()=>!financialScopeMatches?[]:householdPersonal?visibleBudgetRecords(goals,'personal',policyReady?linkedMemberId:undefined):goals,[financialScopeMatches,householdPersonal,goals,linkedMemberId,policyReady]);
  const visibleDebts=useMemo(()=>!financialScopeMatches?[]:householdPersonal?visibleBudgetRecords(debts,'personal',policyReady?linkedMemberId:undefined):debts,[financialScopeMatches,householdPersonal,debts,linkedMemberId,policyReady]);


  const displaySettings=useMemo(()=>personalDisplayOnly?projectPersonalDisplayFinance(financialSettings,linkedMemberId):financialSettings,[personalDisplayOnly,financialSettings,linkedMemberId]);
  const displayTransactions=useMemo(()=>personalDisplayOnly?visibleBudgetRecords(visibleTransactions,'personal',linkedMemberId):visibleTransactions,[personalDisplayOnly,visibleTransactions,linkedMemberId]);
  const displayGoals=useMemo(()=>personalDisplayOnly?visibleBudgetRecords(visibleGoals,'personal',linkedMemberId):visibleGoals,[personalDisplayOnly,visibleGoals,linkedMemberId]);
  const displayMembers=useMemo(()=>personalDisplayOnly||householdPersonal?members.filter(m=>m.id===linkedMemberId):members,[personalDisplayOnly,householdPersonal,members,linkedMemberId]);
  const personalOpeningKnown=!personalDisplayOnly||(Boolean(linkedMemberId)&&typeof financialSettings.personalInitialBalance==='number'&&Number.isFinite(financialSettings.personalInitialBalance));

  useEffect(()=>{
    if(!familyId||!financialScope)return;
    const scope=financialScope;
    setFinancialRead(initialFinancialRead(scope));
    setTransactions([]);setGoals([]);setDebts([]);setTransactionsReady(false);
    if(!policyReady||(householdPersonal&&!financialQueryMemberId))return;
    let active=true;
    const mode=householdPersonal?'personal':'family';
    const receive=(kind:FinancialCollection,apply:(items:any[])=>void)=>(items:any[],metadata:{fromCache:boolean;hasPendingWrites:boolean})=>{
      if(!active)return;
      apply(items);
      setFinancialRead(previous=>updateFinancialRead(previous,scope,kind,metadata.fromCache?'stale':'ready'));
      if(kind==='transactions')setTransactionsReady(!metadata.fromCache&&!metadata.hasPendingWrites);
    };
    const fail=(kind:FinancialCollection)=>(error:Error)=>{
      if(!active)return;
      rememberReadFailure(error);
      setFinancialRead(previous=>updateFinancialRead(previous,scope,kind,'error'));
      if(kind==='transactions')setTransactionsReady(false);
      console.error('Financial subscription failed',kind,error);
    };
    const unsubs=[
      subscribeToScopedFinancialCollection(familyId,'transactions',mode,financialQueryMemberId,receive('transactions',items=>setTransactions(items.map(sanitizeTransaction))),fail('transactions')),
      subscribeToScopedFinancialCollection(familyId,'goals',mode,financialQueryMemberId,receive('goals',items=>setGoals(items as SavingsGoal[])),fail('goals')),
      subscribeToScopedFinancialCollection(familyId,'debts',mode,financialQueryMemberId,receive('debts',items=>setDebts(items as Debt[])),fail('debts'))
    ];
    return ()=>{active=false;unsubs.forEach(unsub=>unsub());};
  },[familyId,financialScope,policyReady,householdPersonal,financialQueryMemberId]);

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

  const saveDebtEdit=async(debt:Debt,creating:boolean)=>{
    if(familyId){
      if(financialDataStatus!=='ready'||!user?.uid||(householdPersonal&&!linkedMemberId))throw new Error('Дождитесь подтверждения финансовых данных.');
      await commitDebtEdit(familyId,user.uid,householdPersonal?linkedMemberId:undefined,debt,creating);
      return; // Authoritative listeners publish both saved documents.
    }
    const current=settingsRef.current;
    const mandatoryExpenses=planDebtExpenseLink(current.mandatoryExpenses??[],debt);
    const next={...current,mandatoryExpenses};
    settingsRef.current=next;setSettings(next);
    setDebts(previous=>creating?[...previous,debt]:previous.map(item=>item.id===debt.id?debt:item));
  };

  // Shared and private learned rules never reuse another scope's storage.
  const updateRules = async (rulesOrFn: LearnedRule[] | ((prev: LearnedRule[]) => LearnedRule[])) => {
      const updated = typeof rulesOrFn === 'function' ? rulesOrFn(localRules) : rulesOrFn;
      if(familyId){
        if(!policyReady||!user?.uid)throw new Error('Режим бюджета не подтверждён');
        if(householdPersonal)await savePersonalItems(familyId,user.uid,'rules',updated);
        else await addItemsBatch(familyId,'rules',updated);
      }else{
        localStorage.setItem('local_rules',JSON.stringify(updated));
      }
      setLocalRules(updated);
  };
  useEffect(()=>{
    if(!familyId||!user?.uid)return;
    setLocalRules([]);setAiKnowledge([]);setNotifications([]);
    if(!policyReady)return;
    const subscribe=(kind:'rules'|'knowledge',callback:(rows:any[])=>void)=>householdPersonal
      ?subscribeToPersonalCollection(familyId,user.uid,kind,callback)
      :subscribeToCollection(familyId,kind,callback);
    const stopRules=subscribe('rules',rows=>setLocalRules(rows as LearnedRule[]));
    const stopKnowledge=subscribe('knowledge',rows=>setAiKnowledge(rows as AIKnowledgeItem[]));
    return ()=>{stopRules();stopKnowledge();};
  },[familyId,user?.uid,policyReady,householdPersonal]);

  // --- Subscriptions ---
  useEffect(() => {
    setCatalogReady(false);
    setLoadedEventsScope(null);setLoadedShoppingScope(null);
    // Always load locally cached rules as baseline to prevent rules disappearance on reload
    const cachedRules = !familyId ? localStorage.getItem('local_rules') : null;
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

    setGlobalRules([]);
    const unsubGlobal = familyId && user?.uid ? subscribeToGlobalRules(setGlobalRules) : () => {};

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

    let active=true;
    const scope=workspaceScope!;
    setWorkspaceRead(initialWorkspaceRead(scope));
    const listen=(kind:WorkspaceCollection,apply:(data:any[])=>void)=>subscribeToWorkspaceCollection(familyId,kind,(data,metadata)=>{
      if(!active)return;
      setWorkspaceRead(previous=>updateWorkspaceRead(previous,scope,kind,metadata.fromCache?'stale':'ready'));
      // Unconfirmed cache must not masquerade as a confirmed empty collection.
      if(!metadata.fromCache)apply(data);
    },error=>{
      if(!active)return;
      rememberReadFailure(error);setWorkspaceRead(previous=>updateWorkspaceRead(previous,scope,kind,'error'));
      console.error('Workspace subscription failed',kind,error);
    });
    const unsubs = [
      unsubGlobal,
      listen('shopping', (data) => {
        const uniqueMap = new Map<string, ShoppingItem>();
        (data as ShoppingItem[]).forEach(item => {
          if (item && item.id) uniqueMap.set(item.id, item);
        });
        setShoppingItems(Array.from(uniqueMap.values()));setLoadedShoppingScope(memberScope);
      }),
      listen('pantry', (data) => setPantryState(data as PantryItem[])),
      listen('events', (data) => {setEvents(data as FamilyEvent[]);setLoadedEventsScope(memberScope);}),
      listen('members', (data) => {
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
      listen('loyalty', (data) => setLoyaltyCards(data as LoyaltyCard[])),

    ];
    
    // Always load dismissed notifications from local storage (device specific preference)
    const storedDismissed = localStorage.getItem('local_dismissed_notifs');
    if (storedDismissed) {
        try { setDismissedNotificationIds(JSON.parse(storedDismissed)); } catch {}
    }

    isInitialLoad.current = false;
    return () => {active=false;unsubs.forEach(u => u());};
  }, [familyId, isOfflineMode, user?.uid, workspaceScope]);

  // --- Local Storage Sync ---
  useEffect(() => {
      // Sync dismissed notifications to local storage immediately
      localStorage.setItem('local_dismissed_notifs', JSON.stringify(dismissedNotificationIds));
      // Always keep local rules backed up on device
      if(!familyId)try { localStorage.setItem('local_rules', JSON.stringify(localRules)); } catch {}

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
      if(familyId){
        if(!policyReady||!user?.uid)throw new Error('Режим бюджета не подтверждён');
        if(householdPersonal)await savePersonalItems(familyId,user.uid,'knowledge',[newItem]);
        else await addItem(familyId,'knowledge',newItem);
      }
      setAiKnowledge(prev => [...prev.filter(item=>item.id!==newItem.id),newItem]);
  };

  const deleteAIKnowledge = async (id: string) => {
      if(familyId){
        if(!policyReady||!user?.uid)throw new Error('Режим бюджета не подтверждён');
        if(householdPersonal)await deletePersonalItem(familyId,user.uid,'knowledge',id);
        else await deleteItem(familyId,'knowledge',id);
      }
      setAiKnowledge(prev => prev.filter(k => k.id !== id));
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
      return personalTransactions(visibleTransactions, budgetMode, linkedMemberId);
  }, [visibleTransactions, budgetMode, linkedMemberId]);

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

  const totalBalance=useMemo(()=>ledgerBalance(displayTransactions,displaySettings.initialBalance,displaySettings.initialBalanceDate),[displayTransactions,displaySettings.initialBalance,displaySettings.initialBalanceDate]);
  const currentMonthSpent=useMemo(()=>{
    const now=new Date();
    return sumMoney(filteredTransactions.filter(t=>{
      if(t.type!=='expense')return false;
      const d=parseLocalDate(t.date);
      return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    }).map(t=>t.amount));
  },[filteredTransactions]);

  const value = {
    householdPersonal, financialSettings, hideSharedBudget, setHideSharedBudget, personalDisplayOnly, personalOpeningKnown, displaySettings, displayTransactions, displayGoals, displayMembers,
    transactions: visibleTransactions, setTransactions,
    shoppingItems:!familyId||workspaceRead.scope===workspaceScope&&loadedShoppingScope===memberScope?shoppingItems:[], setShoppingItems,
    pantry:!familyId||workspaceRead.scope===workspaceScope&&workspaceRead.states.pantry==='ready'?pantry:[], setPantry: handlePantryUpdate,
    events:!familyId||workspaceRead.scope===workspaceScope&&loadedEventsScope===memberScope?events:[], setEvents,
    goals: visibleGoals, setGoals,
    members, setMembers,
    categories, setCategories,
    importSourcesReady: transactionsReady && catalogReady && settingsReady && financialDataStatus==='ready',
    financialDataStatus,retryFinancialData,workspaceStatuses,retryWorkspace,
    settingsReady, familyCalendarReady, shoppingReady,
    learnedRules, setLearnedRules: updateRules,
    aiKnowledge, addAIKnowledge, deleteAIKnowledge,
    settings:financialSettings, setSettings, updateSettings, updateMandatoryPaymentBundle, saveDebtEdit, // Expose scoped settings
    debts: visibleDebts, setDebts,
    loyaltyCards:!familyId||workspaceRead.scope===workspaceScope&&workspaceRead.states.loyalty==='ready'?loyaltyCards:[], setLoyaltyCards,
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