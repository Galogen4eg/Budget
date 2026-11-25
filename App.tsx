import { useMobileViewport } from './hooks/useMobileViewport';
import { FinancialDataState } from './components/FinancialDataState';

import TerraSplash from './components/TerraSplash';
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Settings as SettingsIcon, Bell, LayoutGrid, ShoppingBag, PieChart, Calendar, AppWindow, Users, User, Settings2, Bot, Plus, Users2, BrainCircuit, WifiOff, Wifi, LayoutDashboard, Leaf, Wallet, Sparkles, MessageSquare } from 'lucide-react';
import { triggerHaptic } from './utils/haptics';
import { 
  Transaction, SavingsGoal, ShoppingItem, FamilyMember, PantryItem, MandatoryExpense, Debt, Category, LearnedRule, WidgetConfig, AppNotification, FamilyEvent
} from './types';
import { Toaster, toast } from 'sonner';

import SmartHeader from './components/SmartHeader';
import MonthlyAnalyticsWidget from './components/MonthlyAnalyticsWidget';
import RecentTransactionsWidget from './components/RecentTransactionsWidget';

import ShoppingWidget from './components/ShoppingWidget';
import WalletWidget from './components/WalletWidget';
import FamilyPlans from './components/FamilyPlans';
import TransactionHistory from './components/TransactionHistory';
import SpendingCalendar from './components/SpendingCalendar';
import MandatoryExpensesList from './components/MandatoryExpensesList';
import CategoryProgress from './components/CategoryProgress';
import CategoryAnalysisWidget from './components/CategoryAnalysisWidget';
import GoalsSection from './components/GoalsSection';
import LoginScreen from './components/LoginScreen';

import TerraOverview from './components/TerraOverview';

import AddTransactionModal from './components/AddTransactionModal';
import EventModal from './components/EventModal';
import DrillDownModal from './components/DrillDownModal';
import ImportModal from './components/ImportModal';
import SettingsModal from './components/SettingsModal';
import DuplicatesModal from './components/DuplicatesModal';
import AIChatModal from './components/AIChatModal';
import GoalModal from './components/GoalModal';
import MandatoryExpenseModal from './components/MandatoryExpenseModal';

import { MemberMarker } from './constants';
import { sendTelegramMessage as dispatchTelegramMessage } from './utils/telegram';
import { enqueueTelegramMessage, initTelegramQueueSync } from './utils/telegramQueue';

const TerraBudget = React.lazy(() => import('./components/TerraBudget'));
const ShoppingList = React.lazy(() => import('./components/ShoppingList'));
const FamilyChat = React.lazy(() => import('./components/FamilyChat'));
const ServicesHub = React.lazy(() => import('./components/ServicesHub'));

const OnboardingModal = React.lazy(() => import('./components/OnboardingModal'));
const PinScreen = React.lazy(() => import('./components/PinScreen'));
const NotificationsModal = React.lazy(() => import('./components/NotificationsModal'));

import { parseAlfaStatement } from './utils/alfaParser';
import { isCategoryForType } from './utils/categoryCatalog';
import { useTelegramSync } from './hooks/useTelegramSync';
import { stopTelegramBotListener } from './utils/telegramBotListener';
import { auth } from './firebase';
import { isSavingsTransfer, applySavingsTransferToGoals } from './utils/savingsSync';
import { assertBulkDeleteSafe, isGoalSavingsTransfer, savingsContributionKopecks, assertGoalDeletionSafe } from './utils/transactionSavingsConsistency';
import { learnedRuleChangesSavings } from './utils/importSafety';
import { resolveImportMemberId, assertImportRowsBelongToMember } from './utils/importMemberIdentity';
import { assertImportBatchReady, assertImportSavingsReady } from './utils/importSafety';
import { 
  addItem, updateItem, deleteItem, saveTransactionWithGoal, deleteTransactionWithGoal, 
  addItemsBatch, addAlfaItemsIdempotent, addImportedSavingsItemIdempotent, deleteUnlinkedSavingsGoal, areAlfaItemsSavedOnServer, updateItemsBatch, deleteItemsBatch, joinFamily, moveShoppingToPantry, generateUniqueId,
  saveFamilyPlanEvent, deleteFamilyPlanEvent, saveFamilyPlanOccurrence 
} from './utils/db';

import { useAuth } from './contexts/AuthContext';
import { useData, DEFAULT_SETTINGS } from './contexts/DataContext';

import { MENU_TABS, visibleMenuTabs } from './utils/menuNavigation';

const TAB_ICONS = {overview:LayoutDashboard,budget:Wallet,plans:Calendar,shopping:ShoppingBag,chat:MessageSquare,services:AppWindow};
const TAB_CONFIG=MENU_TABS.map(tab=>({...tab,icon:TAB_ICONS[tab.id]}));
const TAB_GROUPS=[{id:'finance',label:'Финансы'},{id:'family',label:'Семья'},{id:'tools',label:'Инструменты'}] as const;

const DEFAULT_WIDGET_CONFIGS: WidgetConfig[] = [
    { id: 'balance', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } }, 
    { id: 'category_analysis', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'shopping', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'wallet', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'goals', isVisible: false, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
];

import { rememberTabVisit, shouldMountTab } from './utils/tabLifecycle';

const TabLoading=()=>(
  <div role="status" className="flex flex-1 min-h-0 items-center justify-center text-sm text-graphite-muted" aria-live="polite">Загрузка раздела…</div>
);

const pageVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1, transition: { duration: 0.12, ease: 'easeOut' } },
  out: { opacity: 0, transition: { duration: 0.08, ease: 'easeIn' } }
};

export default function App() {
  const mobileViewport=useMobileViewport();
  const { user, familyId, loading: isAuthLoading, logout, enterDemoMode } = useAuth();
  const [showSlowLoadFallback, setShowSlowLoadFallback] = useState(false);
  const importFileDigestRef = useRef<string | null>(null);
  const importFileRef = useRef<File | null>(null);

  useEffect(() => {
    if(!isAuthLoading){
      document.documentElement.dataset.terraStartupMode='compact';
      setShowSlowLoadFallback(false);
      return;
    }
    const timer = setTimeout(() => setShowSlowLoadFallback(true), 2500);
    return () => clearTimeout(timer);
  }, [isAuthLoading]);
  const { 
    transactions, setTransactions,
    shoppingItems, setShoppingItems,
    loyaltyCards,
    setPantry,
    events, setEvents,
    goals, setGoals,
    members, setMembers,
    categories, setCategories,
    importSourcesReady, settingsReady, financialDataStatus,retryFinancialData,
    settings, financialSettings, householdPersonal, personalDisplayOnly, displaySettings, displayTransactions, displayMembers, updateSettings, updateMandatoryPaymentBundle,
    setLearnedRules, learnedRules,
    filteredTransactions,
    totalBalance,
    currentMonthSpent,
    savingsRate, setSavingsRate,
    budgetMode, setBudgetMode,
    notifications
  } = useData();

  // Local Playwright automation may run only against this explicitly compatible,
  // authenticated version of Budget. Older deployed builds lack this marker.
  useEffect(() => {
    if (familyId && members.length > 0 && !isAuthLoading && importSourcesReady) {
      (window as any).__budgetAlfaSyncProtocol = 2;
    } else {
      delete (window as any).__budgetAlfaSyncProtocol;
    }
    return () => { delete (window as any).__budgetAlfaSyncProtocol; };
  }, [familyId, members.length, isAuthLoading, importSourcesReady]);

  const [activeTab, setActiveTab] = useState('overview');
  const tabScope=JSON.stringify([user?.uid??null,familyId??null]);
  const [tabVisits,setTabVisits]=useState<import('./utils/tabLifecycle').TabVisits>(()=>({scope:tabScope,tabs:['overview']}));
  useEffect(()=>{
    if(!isAuthLoading&&user)setTabVisits(previous=>rememberTabVisit(previous,tabScope,activeTab));
  },[tabScope,activeTab,isAuthLoading,user?.uid]);
  const mountTab=(tab:string)=>shouldMountTab(tabVisits,tabScope,activeTab,tab);
  const [installPrompt,setInstallPrompt]=useState<(Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>})|null>(null);
  useEffect(()=>{
    const capture=(event:Event)=>{
      event.preventDefault();
      setInstallPrompt(event as Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>});
    };
    const clear=()=>setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt',capture);
    window.addEventListener('appinstalled',clear);
    return ()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',clear);};
  },[]);

  const [systemDark,setSystemDark]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const update=()=>setSystemDark(media.matches);
    update();media.addEventListener('change',update);
    return ()=>media.removeEventListener('change',update);
  },[]);
  const savedBootTheme=typeof document!=='undefined'?document.documentElement.dataset.bootTheme:undefined;
  const startupTheme=savedBootTheme==='dark'||savedBootTheme==='light'||savedBootTheme==='system'?savedBootTheme:'system';
  const themePreference=isAuthLoading||!user||(familyId&&!settingsReady)?startupTheme:settings.theme;
  const resolvedTheme=themePreference==='system'?(systemDark?'dark':'light'):themePreference;
  const visibleTabIds=visibleMenuTabs(settings.enabledTabs);
  const visibleTabs=TAB_CONFIG.filter(tab=>visibleTabIds.some(id=>id===tab.id));
  const initialTabApplied=useRef<string|null>(null);
  useEffect(()=>{
    if(isAuthLoading)return;
    const key=(user?.uid??'demo')+':'+(familyId??'local');
    if(initialTabApplied.current===key)return;
    if(familyId&&!settingsReady)return;
    initialTabApplied.current=key;
    setActiveTab(visibleTabs.some(t=>t.id===settings.startTab)?settings.startTab!:'overview');
  },[isAuthLoading,user?.uid,familyId,settingsReady,settings.startTab,settings.enabledTabs]);
  // Hidden menu entries remain reachable through explicit overview shortcuts.
  // Visibility preferences do not control authorization.
  const [targetService, setTargetService] = useState<string | null>(null);
  const navigateMenu=(id:string)=>{if(id==='services')setTargetService('menu');setActiveTab(id);};
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FamilyEvent | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isMandatoryModalOpen, setIsMandatoryModalOpen] = useState(false);
  const [selectedMandatoryExpense, setSelectedMandatoryExpense] = useState<MandatoryExpense | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<Transaction, 'id'>[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importingRef=useRef(false); 
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [pinMode, setPinMode] = useState<'unlock' | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drillDownState, setDrillDownState] = useState<{categoryId: string, merchantName?: string} | null>(null);
  const [memberFilter, setMemberFilter] = useState<string | 'all'>('all');
  useEffect(()=>{
    setMemberFilter('all');setSelectedTx(null);setIsAddModalOpen(false);setSelectedMandatoryExpense(null);setIsMandatoryModalOpen(false);setEditingGoal(null);setIsGoalModalOpen(false);setImportPreview(null);setDrillDownState(null);setIsDuplicatesOpen(false);
  },[familyId,user?.uid,householdPersonal]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(()=>typeof window==='undefined'||window.innerWidth>=1024);
  
  // Offline / Network Status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);



  useEffect(()=>{if(householdPersonal||!settingsReady)stopTelegramBotListener();},[householdPersonal,settingsReady]);
  // Двусторонняя синхронизация с Telegram-ботом в реальном времени
  useTelegramSync({
    settings,
    familyId,
    setShoppingItems,
    setTransactions,
    setEvents,
    householdPersonal,
    settingsReady,
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);

    };
    const handleOffline = () => {
      setIsOnline(false);
      triggerHaptic('error');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Each screen owns native scrolling; no simulated outer pull-to-refresh.
  const mainRef = useRef<HTMLDivElement>(null);

  // Scroll to top when tab changes
  useEffect(() => {
      mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  // Filter transactions for Budget tab widgets
  const budgetTransactions = useMemo(() => {
      let txs = filteredTransactions;
      if (memberFilter !== 'all') txs = txs.filter(t => t.memberId === memberFilter);
      return txs;
  }, [filteredTransactions, memberFilter]);

  const budgetStats = useMemo(() => {
      let txs = budgetTransactions.filter(t => {
          const d = new Date(t.date);
          if (selectedDate) {
              return d.toDateString() === selectedDate.toDateString();
          }
          return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
      });
      
      let income = 0;
      let expense = 0;
      txs.forEach(t => {
          if (t.type === 'income') income += t.amount;
          else expense += t.amount;
      });
      return { income, expense, balance: income - expense };
  }, [budgetTransactions, selectedDate, currentMonth]);

  // Filter Mandatory Expenses based on Member Filter & Budget Mode
  const filteredMandatoryExpenses = useMemo(() => {
      const allExpenses = financialSettings.mandatoryExpenses || [];
      const safeMembers = members || [];
      
      // 1. Strict Member Filter from UI (Higher priority)
      if (memberFilter !== 'all') {
          // STRICT MODE: Only show items explicitly assigned to this member.
          // Shared items (where memberId is undefined/null) are hidden to reduce noise.
          return allExpenses.filter(e => e.memberId === memberFilter);
      }

      // 2. Budget Mode Logic (Fallback when 'All' is selected in filter)
      if (budgetMode === 'family') {
          // Show all expenses in Family mode when filter is 'All'
          return allExpenses;
      } else {
          // Personal mode: show expenses assigned to current user OR unassigned (legacy/shared)
          const myMemberId = safeMembers.find(m => m.userId === user?.uid)?.id;
          if (!myMemberId) return []; // Unlinked profile must not inherit another member's payments.
          return allExpenses.filter(e => !e.memberId || e.memberId === myMemberId);
      }
  }, [financialSettings.mandatoryExpenses, budgetMode, members, user?.uid, memberFilter]);

  useEffect(() => {
    if (user?.uid && (!settings.widgets || settings.widgets.length === 0)) {
        const updatedSettings = { ...settings, widgets: DEFAULT_WIDGET_CONFIGS };
        updateSettings(updatedSettings);
    }
  }, [user?.uid]);

  useLayoutEffect(() => {
    const root=document.documentElement;
    root.classList.toggle('dark',resolvedTheme==='dark');
    root.style.colorScheme=resolvedTheme;
    root.style.backgroundColor=resolvedTheme==='dark'?'#121214':'#EBEFF5';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',resolvedTheme==='dark'?'#121214':'#EBEFF5');
    if(!isAuthLoading&&user&&(!familyId||settingsReady)){
      root.dataset.bootTheme=themePreference;
      try{localStorage.setItem('theme',themePreference);}catch{}
    }
  },[resolvedTheme,themePreference,isAuthLoading,user?.uid,familyId,settingsReady]);

  // Synchronize offline Telegram message queue when internet connection restores
  useEffect(() => {
    const unsubscribeSync = initTelegramQueueSync((result) => {
      if (result.processedCount > 0) {
        toast.success(`Офлайн-очередь Telegram: отправлено сообщений (${result.processedCount})`);
      }
    });
    return () => unsubscribeSync();
  }, []);

  const handleAddCategory = async (newCategory: Category) => {
    // Never claim that a newly created category exists until Firestore accepted it.
    // The picker awaits this promise before assigning the operation to the new ID.
    if (familyId) {
      await addItem(familyId, 'categories', newCategory);
    }
    setCategories(prev => {
      const index = prev.findIndex(c => c.id === newCategory.id);
      if (index === -1) return [...prev, newCategory];
      // Also support moving an existing subcategory to another parent.
      return prev.map(c => c.id === newCategory.id ? newCategory : c);
    });
  };

  const handleTransactionSubmit = async (txData: Omit<Transaction, 'id'>) => {
    const editing = selectedTx;
    if (householdPersonal) {
      const owner = members.find(m => m.userId && m.userId === user?.uid)?.id;
      if (!owner || (editing && editing.memberId !== owner) || txData.memberId !== owner)
        throw new Error('В личном режиме доступны только собственные операции');
    }
    const transaction: Transaction = editing
      ? { ...txData, id: editing.id, userId: editing.userId }
      : { ...txData, id: Date.now().toString() + Math.random().toString(36).slice(2, 7) };

    // The transaction form does not expose goal metadata. Preserve a reviewed external transfer on edit.
    if(editing?.externalSavingsConfirmed===true&&!editing.linkedGoalId&&!transaction.linkedGoalId&&isSavingsTransfer(transaction))transaction.externalSavingsConfirmed=true;
    // Persist the goal link so future edits/deletions cannot select a different account.
    const before=editing&&isGoalSavingsTransfer(editing)?(editing.type==='expense'?editing.amount:-editing.amount):0;
    const after=isGoalSavingsTransfer(transaction)?(transaction.type==='expense'?transaction.amount:-transaction.amount):0;
    let affectedGoal: SavingsGoal|undefined;
    if(householdPersonal&&before!==0&&!editing?.linkedGoalId)throw new Error('Старый перевод не привязан к личной цели');
    if(after!==0||before!==0){
      const requestedGoal=transaction.linkedGoalId||editing?.linkedGoalId;
      if(requestedGoal&&!goals.some(g=>g.id===requestedGoal))throw new Error('Накопительная цель недоступна');
      if(!requestedGoal&&before!==0&&goals.length===0)throw new Error('Накопительная цель предыдущего перевода не найдена');
      const candidate=applySavingsTransferToGoals(goals,Math.abs(after||before),after>0,requestedGoal).affectedGoal;
      affectedGoal=goals.some(g=>g.id===candidate.id)?candidate:{...candidate,memberId:transaction.memberId};
      if(householdPersonal&&affectedGoal.memberId!==transaction.memberId)throw new Error('Цель принадлежит другому участнику');
      if(after!==0)transaction.linkedGoalId=affectedGoal.id;
      else delete transaction.linkedGoalId;
    }

    // Never report a saved operation without an acknowledged family write.
    if (!familyId) throw new Error('Семейное пространство не загружено. Операция не сохранена.');
    await saveTransactionWithGoal(
      familyId, transaction, Boolean(editing), affectedGoal
    );

    // Firestore goal snapshots now carry authoritative balances after an atomic write.
    if (editing) {
      setTransactions(prev => prev.map(t => t.id === editing.id ? transaction : t));
      setSelectedTx(null);
    } else {
      setTransactions(prev => [transaction, ...prev]);
    }
  };

  const handleLearnRule = async (rule: LearnedRule) => {
    try {
      if (!familyId) throw new Error('Семья ещё не готова');
      if (!rule.keyword?.trim()) throw new Error('Нельзя сохранить пустое правило');
      // Do not report a learned rule as saved when Firestore rejected it.
      await setLearnedRules(prev => prev.some(r => r.id === rule.id) ? prev : [...prev, rule]);

      const keyword = rule.keyword.trim().toLowerCase();
      let needsIndividualReview = 0;
      const changed: Transaction[] = [];
      for (const original of transactions) {
        const raw = (original.rawNote || original.note || '').toLowerCase();
        if (!raw.includes(keyword) || !isCategoryForType(rule.categoryId, categories, original.type)) continue;
        const updated = {...original,category:rule.categoryId,note:rule.cleanName || original.note};
        if (updated.category === original.category && updated.note === original.note) continue;
        // Reclassification must never secretly create, move or reverse a savings
        // transfer. Individual editing uses Firestore transaction+goal handling.
        if (isSavingsTransfer(original) || isSavingsTransfer(updated) ||
            learnedRuleChangesSavings(original, updated)) {
          needsIndividualReview++;
          continue;
        }
        changed.push(updated);
      }
      if (changed.length) {
        await updateItemsBatch(familyId, 'transactions', changed);
        const ids = new Map(changed.map(tx=>[tx.id,tx]));
        setTransactions(prev=>prev.map(tx=>ids.get(tx.id)||tx));
      }
      if (needsIndividualReview) toast.warning(
        `Правило сохранено. ${needsIndividualReview} переводов в накопления оставлены для отдельного редактирования.`
      );
      toast.success(`Правило сохранено. Обновлено обычных операций: ${changed.length}`);
    } catch (error) {
      console.error('Failed to learn bank category rule',error);
      toast.error('Правило не сохранено полностью. Проверьте соединение и повторите.');
    }
  };

  const handleEditTransaction = (tx: Transaction) => { setSelectedTx(tx); setIsAddModalOpen(true); };

  const handleToggleMandatoryPaid = async (expenseId: string) => {
    const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    const monthIds = financialSettings.manualPaidExpenses?.[monthKey] || [];
    const paid = !monthIds.includes(expenseId);
    const nextMonthIds = paid ? [...monthIds, expenseId] : monthIds.filter(id => id !== expenseId);
    const bill = (financialSettings.mandatoryExpenses || []).find(item => item.id === expenseId);
    if(!bill){toast.error('Платёж недоступен');return;}
    const isThisMonth = currentMonth.getMonth() === new Date().getMonth() &&
      currentMonth.getFullYear() === new Date().getFullYear();
    const debtChanges = bill?.linkedDebtId && isThisMonth
      ? [{id: bill.linkedDebtId, changes: {paidThisMonth: paid}}]
      : [];
    try {
      await updateMandatoryPaymentBundle({
        mandatoryExpenses: financialSettings.mandatoryExpenses || [],
        manualPaidExpenses: {[monthKey]: nextMonthIds}
      },debtChanges);
    } catch (error) {
      toast.error('Не удалось изменить отметку оплаты. Данные не сохранены.');
    }
  };

  const handleResetSettings = async () => {
    if(householdPersonal){
      await updateSettings({theme:DEFAULT_SETTINGS.theme,privacyMode:DEFAULT_SETTINGS.privacyMode,widgets:DEFAULT_SETTINGS.widgets,enabledTabs:DEFAULT_SETTINGS.enabledTabs,startTab:'overview'});
    }else await updateSettings(DEFAULT_SETTINGS);
    toast.success(householdPersonal?'Оформление и навигация сброшены':'Настройки сброшены к значениям по умолчанию');
  };

  const handleDeleteEvent = async (id: string, scope: 'single'|'series' = 'series') => {
      if (!familyId) throw new Error('Family is not ready: event was not deleted');
      const source = selectedEvent || events.find(ev=>ev.id===id);
      const baseId = source?.seriesId || source?.id || id;
      if(scope==='single' && source && (source.seriesId || source.recurrence && source.recurrence!=='none')){
          const parent=events.find(ev=>ev.id===baseId);
          if(!parent) throw new Error('Серия уже удалена');
          await saveFamilyPlanOccurrence(familyId,parent,source.occurrenceDate||source.date,null);
      } else {
          const old=events.find(ev=>ev.id===baseId);
          if(!old) throw new Error('Событие уже удалено');
          await deleteFamilyPlanEvent(familyId,old.id,old);
      }
  };

  const handleImport = async (file: File) => {
    if(importingRef.current)return;
    importingRef.current=true;
    setIsImporting(true);
    importFileDigestRef.current = null;
    importFileRef.current = file;
    try {
        const memberId = resolveImportMemberId(members, user?.uid);
        const data = await parseAlfaStatement(file, settings.alfaMapping, memberId, learnedRules, categories, transactions);
        const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
        importFileDigestRef.current = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        setImportPreview(data);
    } catch (err: any) {
        if (err?.message === 'Новых уникальных операций не найдено.' && familyId) {
          try {
            const memberId = resolveImportMemberId(members, user?.uid);
            const allRows = await parseAlfaStatement(file, settings.alfaMapping, memberId, learnedRules, categories, []);
            if (await areAlfaItemsSavedOnServer(familyId, allRows.map(row => row.id))) {
              const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
              const fileSha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
              window.dispatchEvent(new CustomEvent('budget:import-committed', {
                detail: { count: 0, requested: allRows.length, fileSha256 }
              }));
              toast.info('Все операции этой выписки уже сохранены');
              return;
            }
          } catch (verificationError) {
            console.error('Alfa statement verification failed:', verificationError);
          }
        }
        toast.error(err.message || "Ошибка чтения");
    } finally { importingRef.current=false;setIsImporting(false); }
  };

  const handleMoveToPantry = async (item: ShoppingItem) => {
      if (!familyId) throw new Error('Family is not ready: item was not moved');
      const pantryItem: PantryItem = { id: generateUniqueId(), title: item.title, amount: item.amount || '1', unit: item.unit, category: item.category, addedDate: new Date().toISOString() };
      await moveShoppingToPantry(familyId, item.id, pantryItem);
      setShoppingItems(prev => prev.filter(i => i.id !== item.id));
      // Pantry is updated through the Firestore subscription after the batch commits.
  };

  // Robust Telegram Sender with Offline Queueing support
  const sendTelegramMessage = async (
    text: string, 
    messageIdToEdit?: number, 
    tag?: 'shopping' | 'event' | 'transaction'
  ) => {
    const config = {
      botToken: settings.telegramBotToken,
      chatId: settings.telegramChatId,
      apiUrl: settings.telegramApiUrl,
    };

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      if (config.botToken && config.chatId) {
        await enqueueTelegramMessage({ config, text, messageIdToEdit, tag, parseMode: 'Markdown' });
        toast.info('Нет сети. Сообщение добавлено в очередь и будет отправлено при подключении.');
      }
      return { success: false, code: 'NETWORK_BLOCKED' as const, error: 'Офлайн: сохранено в очередь' };
    }

    const result = await dispatchTelegramMessage({
      config,
      text,
      messageIdToEdit,
      parseMode: 'Markdown',
    });

    if ('code' in result && (result.code === 'NETWORK_TIMEOUT' || result.code === 'NETWORK_BLOCKED')) {
      if (config.botToken && config.chatId) {
        await enqueueTelegramMessage({ config, text, messageIdToEdit, tag, parseMode: 'Markdown' });
        toast.info('Сбой сети. Сообщение добавлено в очередь и будет отправлено при появлении связи.');
      }
    }

    return result;
  };

  const handleSendShoppingToTelegram = async (itemsListToUse?: ShoppingItem[]) => {
      const sourceItems = itemsListToUse && itemsListToUse.length > 0 ? itemsListToUse : shoppingItems;
      const activeItems = sourceItems.filter(i => !i.completed);
      const dateStr = new Date().toLocaleDateString('ru-RU');
      let text = settings.shoppingTemplate || `🛒 *Список покупок* ({date})\n\n{items}`;
      
      let itemsList = activeItems.map(i => `• ${i.title}${i.amount ? ` (${i.amount} ${i.unit})` : ''}`).join('\n');
      if (activeItems.length === 0) itemsList = "✅ Все куплено!";
      
      text = text.replace('{date}', dateStr)
                 .replace('{items}', itemsList)
                 .replace('{total}', activeItems.length.toString());

      const loadingToast = toast.loading('Отправка в Telegram...');
      
      // Check if we can edit previous message for today
      const todayStr = new Date().toDateString();
      let messageIdToEdit = settings.telegramState?.lastShoppingDate === todayStr 
        ? settings.telegramState.lastShoppingMessageId 
        : undefined;

      if (!messageIdToEdit && typeof localStorage !== 'undefined') {
        try {
          const cached = JSON.parse(localStorage.getItem('terra_tg_shopping_state') || '{}');
          if (cached.lastShoppingDate === todayStr && cached.lastShoppingMessageId) {
            messageIdToEdit = cached.lastShoppingMessageId;
          }
        } catch {}
      }

      const result = await sendTelegramMessage(text, messageIdToEdit, 'shopping');
      
      toast.dismiss(loadingToast);
      
      if (result.success) {
          const finalMessageId = ('messageId' in result ? result.messageId : null) || messageIdToEdit;
          if (messageIdToEdit && finalMessageId === messageIdToEdit) {
            toast.success("Список покупок в Telegram обновлен!");
          } else {
            toast.success("Список покупок отправлен в Telegram!");
          }

          if (finalMessageId) {
            const newState = {
              lastShoppingMessageId: finalMessageId,
              lastShoppingDate: todayStr
            };
            try {
              localStorage.setItem('terra_tg_shopping_state', JSON.stringify(newState));
            } catch {}

            await updateSettings({
              telegramState: newState
            });
          }
          return true;
      } else {
          toast.error(('error' in result ? result.error : null) || "Не удалось отправить список в Telegram.");
          return false;
      }
  };

  const handleSendEventToTelegram = async (event: FamilyEvent) => {
      // Use richer default template and include {description} for flexibility
      const template = settings.eventTemplate || `📅 *{title}*\n\n🕒 {date} {time}\n📝 {description}\n\n👥 Участники: {members}\n📋 Чек-лист: {checklist}`;
      
      const memberNames = (event.memberIds || [])
          .map(id => members.find(m => m.id === id)?.name)
          .filter(Boolean)
          .join(', ');
          
      const checklistStr = (event.checklist || [])
          .filter(i => i.text && i.text.trim() !== '')
          .map(i => `• ${i.text} ${i.completed ? '✅' : ''}`)
          .join('\n');

      const dateStr = new Date(event.date).toLocaleDateString('ru-RU');

      const formatReminderMinutes = (m: number) => {
        if (m < 60) return `${m} мин`;
        if (m % 1440 === 0) {
          const d = m / 1440;
          return d === 1 ? '1 день' : d >= 2 && d <= 4 ? `${d} дня` : `${d} дн.`;
        }
        if (m % 60 === 0) {
          const h = m / 60;
          return h === 1 ? '1 час' : h >= 2 && h <= 4 ? `${h} часа` : `${h} ч`;
        }
        return `${Math.floor(m / 60)} ч ${m % 60} мин`;
      };

      const remindersStr = (event.reminders && event.reminders.length > 0)
        ? event.reminders.map(r => `за ${formatReminderMinutes(r)}`).join(', ')
        : '';

      // Comprehensive Data Map
      const dataMap: Record<string, string> = {
          '{title}': event.title,
          '{date}': dateStr,
          '{time}': event.time,
          '{duration}': (event.duration || 1).toString(),
          '{desc}': event.description || '', // Legacy support
          '{description}': event.description || '', // Robust support
          '{members}': memberNames, 
          '{checklist}': checklistStr,
          '{reminders}': remindersStr
      };

      let text = template;

      // 1. Line Removal Logic for empty optional fields
      // Fields that, if empty, should cause their line to be removed
      const optionalFields = ['{desc}', '{description}', '{members}', '{checklist}', '{reminders}'];

      optionalFields.forEach(field => {
          const val = dataMap[field];
          // Aggressive check for empty content (null, undefined, whitespace)
          if (!val || String(val).trim() === '') {
              // Remove the entire line containing this field
              // Escape curly braces for RegExp
              const safeField = field.replace('{', '\\{').replace('}', '\\}');
              // Matches the whole line including the placeholder
              const lineRegex = new RegExp(`^.*${safeField}.*(\\r?\\n|$)`, 'gm');
              text = text.replace(lineRegex, '');
          }
      });

      // 2. Standard Replacement
      Object.entries(dataMap).forEach(([key, value]) => {
          // Replace all occurrences
          text = text.split(key).join(value);
      });

      // 3. Cleanup extra newlines
      text = text.replace(/\n{3,}/g, '\n\n').trim();

      const loadingToast = toast.loading('Отправка события...');
      const result = await sendTelegramMessage(text, undefined, 'event');
      toast.dismiss(loadingToast);

      if (result.success) {
          toast.success("Событие отправлено в Telegram!");
          return true;
      } else {
          toast.error(('error' in result ? result.error : null) || "Не удалось отправить событие в Telegram.");
          return false;
      }
  };

  const handleSaveEvent = async (e: FamilyEvent) => {
      if (!familyId) throw new Error('Family is not ready: event was not saved');
      if(e.seriesId){
          const parent=events.find(ev=>ev.id===e.seriesId);
          if(!parent)throw new Error('Серия удалена');
          await saveFamilyPlanOccurrence(familyId,parent,e.occurrenceDate||e.date,e);
      }else{
          await saveFamilyPlanEvent(familyId,e,events.find(ev=>ev.id===e.id)||null);
      }
      // Firestore subscription updates the list only after server acknowledgement.
      setIsAddEventModalOpen(false);
      if (settings.autoSendEventsToTelegram) void handleSendEventToTelegram(e);
      toast.success('Событие сохранено');
  };

  const handleDeleteTransactionsByPeriod = async (startDate: string, endDate: string) => {
      if (!startDate || !endDate || startDate>endDate) throw new Error('Некорректный период');
      const start = new Date(startDate+'T00:00:00');
      const end = new Date(endDate+'T23:59:59.999');
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) throw new Error('Некорректные даты');
      
      const startTime = start.getTime();
      const endTime = end.getTime();
      
      const toDelete = transactions.filter(t => {
          const tDate = new Date(t.date).getTime();
          return tDate >= startTime && tDate <= endTime;
      });

      if (toDelete.length === 0) {
          toast.info("Нет операций за этот период");
          return;
      }

      const ids = toDelete.map(t => t.id);
      if (!familyId) throw new Error('Family is not ready: transactions were not deleted');
      // Deleting a savings transfer without adjusting its goal would corrupt balances.
      assertBulkDeleteSafe(transactions,ids);
      await deleteItemsBatch(familyId, 'transactions', ids);
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      toast.success(`Удалено ${ids.length} операций`);
  };

  const handleBatchDelete = async (ids: string[]): Promise<boolean> => {
      if (!familyId) {
        toast.error('Семья ещё не подключена');
        return false;
      }
      try {
        if (ids.some(id=>!transactions.some(t=>t.id===id))) throw new Error('Операция недоступна');
        assertBulkDeleteSafe(transactions,ids);
        await deleteItemsBatch(familyId, 'transactions', ids);
        setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
        toast.success(`Удалено ${ids.length} записей`);
        return true;
      } catch(error) {
        toast.error(error instanceof Error ? error.message : 'Удаление не выполнено');
        return false;
      }
  };

  const handleGoalSave = async (goal: any) => {
      const owner = members.find(m => m.userId && m.userId === user?.uid)?.id;
      if (householdPersonal && (!owner || (editingGoal && editingGoal.memberId !== owner)))
          throw new Error('В личном режиме доступны только собственные цели');
      goal = {...goal, ...(editingGoal?.memberId || (!editingGoal && owner) ? {memberId: editingGoal?.memberId || owner} : {})};
      if (editingGoal) {
          if (!familyId) throw new Error('Family is not ready: goal was not saved');
          await updateItem(familyId, 'goals', goal.id, goal);
          setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
      } else {
          if (!familyId) throw new Error('Family is not ready: goal was not saved');
          await addItem(familyId, 'goals', goal);
          setGoals(prev => [...prev, goal]);
      }
      setIsGoalModalOpen(false);
      setEditingGoal(null);
  };

  const handleGoalDelete = async (id: string) => {
      if (!goals.some(g=>g.id===id)) throw new Error('Цель недоступна');
      if (!familyId) throw new Error('Family is not ready: goal was not deleted');
      assertGoalDeletionSafe(id,transactions);
      const own=members.find(m=>m.userId&&m.userId===user?.uid)?.id;
      if(householdPersonal&&!own)throw new Error('Личный профиль не подтверждён');
      await deleteUnlinkedSavingsGoal(familyId,id,householdPersonal?own:undefined);
      setGoals(prev => prev.filter(g => g.id !== id));
      setIsGoalModalOpen(false);
      setEditingGoal(null);
      toast.success('Цель удалена');
  };

  // Helper to check widget visibility
  const isWidgetVisible = (id: string) => {
      const widget = settings.widgets?.find(w => w.id === id);
      return widget ? widget.isVisible : true; // Default to true if not found in config
  };

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const renderWidget = (id: string) => {
      switch (id) {
          case 'balance':
              return <SmartHeader balance={totalBalance} spent={currentMonthSpent} savingsRate={savingsRate} settings={financialSettings} budgetMode={budgetMode} transactions={filteredTransactions} onToggleBudgetMode={householdPersonal ? undefined : () => setBudgetMode(prev => prev === 'family' ? 'personal' : 'family')} onTogglePrivacy={() => updateSettings({ privacyMode: !settings.privacyMode })} className="shrink-0" />;
          case 'month_chart':
              return (
                  <div className="flex-1 h-[280px] lg:h-auto min-h-[250px]">
                      <MonthlyAnalyticsWidget transactions={filteredTransactions} currentMonth={currentMonth} settings={settings} />
                  </div>
              );
          case 'shopping':
              return (
                  <div className="flex-shrink-0 h-auto">
                      <ShoppingWidget items={shoppingItems} onClick={() => setActiveTab('shopping')} />
                  </div>
              );
          case 'wallet':
              return (
                  <div className="flex-shrink-0 h-72">
                      <WalletWidget 
                        cards={loyaltyCards} 
                        onClick={() => {
                            setTargetService('wallet');
                            setActiveTab('services');
                        }} 
                      />
                  </div>
              );
          case 'recent_transactions':
              return (
                  <div className="flex-shrink-0 h-80">
                      <RecentTransactionsWidget transactions={filteredTransactions} categories={categories} members={members} settings={settings} onTransactionClick={handleEditTransaction} onViewAllClick={() => setActiveTab('budget')} />
                  </div>
              );
          case 'goals':
              return (
                  <div className="flex-shrink-0 h-auto min-h-[120px]">
                      <GoalsSection goals={goals} settings={settings} onEditGoal={(g) => { setEditingGoal(g); setIsGoalModalOpen(true); }} onAddGoal={() => { setEditingGoal(null); setIsGoalModalOpen(true); }} />
                  </div>
              );
          case 'category_analysis':
              return (
                  <div className="lg:flex-1 lg:min-h-0 h-[320px] lg:h-auto">
                      <CategoryAnalysisWidget 
                          transactions={filteredTransactions} 
                          categories={categories} 
                          settings={settings} 
                          onClick={() => setDrillDownState({ categoryId: 'all' })} 
                      />
                  </div>
              );
          default:
              return null;
      }
  };

  const activeShoppingCount = useMemo(() => {
    return (shoppingItems || []).filter(i => !i.completed).length;
  }, [shoppingItems]);

  if (isAuthLoading) return <TerraSplash slow={showSlowLoadFallback} onDemo={enterDemoMode} />;
  if (!user) return <LoginScreen />;
  if (pinMode === 'unlock') return <Suspense fallback={null}><PinScreen mode="unlock" savedPin={settings.pinCode} onSuccess={() => setPinMode(null)} onForgot={() => logout()} /></Suspense>;

  return (
    <div data-terra-shell data-keyboard-open={mobileViewport.keyboardOpen?'true':'false'} style={mobileViewport.height===null?undefined:{height:mobileViewport.height}} className="terra-shell h-[100dvh] w-full bg-[var(--terra-canvas)] text-[var(--terra-ink)] flex flex-col md:flex-row overflow-hidden font-sans relative selection:bg-primary/20 selection:text-primary-dark">
      <Toaster position="top-center" richColors theme={resolvedTheme === 'dark' ? 'dark' : 'light'} />

      {/* BEGIN: LeftSidebar (Desktop Terra - Collapsed by default) */}
      <aside className={`hidden md:flex ${isSidebarExpanded ? 'w-56' : 'w-[72px]'} bg-[#FAF8F5] dark:bg-[#1C1C1E] border-r border-surface-border dark:border-white/5 flex-col justify-between shrink-0 min-h-0 z-30 transition-[width] duration-200 motion-reduce:transition-none`}>
        <div className="flex flex-col h-full min-h-0 justify-between items-center w-full py-3">
          <div className="flex flex-col w-full items-center min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {/* Logo & Expand/Collapse Toggle */}
            <div className={`flex items-center ${isSidebarExpanded ? 'px-4 justify-between w-full pb-4' : 'justify-center pb-4'} border-b border-surface-border dark:border-white/5`}>
              <button 
                onClick={() => setIsSidebarExpanded(prev => !prev)}
                className="flex items-center gap-3 cursor-pointer group text-left"
                title={isSidebarExpanded ? "Свернуть меню" : "Развернуть меню"}
                aria-label={isSidebarExpanded ? "Свернуть боковое меню" : "Развернуть боковое меню"}
                aria-expanded={isSidebarExpanded}
              >
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-headline font-bold text-white shadow-[0_2px_8px_rgba(74,124,89,0.25)] shrink-0 transition-colors">
                  <Leaf className="w-5 h-5 text-white stroke-[2.2]" />
                </div>
                {isSidebarExpanded && (
                  <div className="flex flex-col">
                    <span className="text-base font-headline font-black tracking-tight text-graphite dark:text-white">
                      Terra
                    </span>
                    <span className="text-[11px] text-graphite-muted dark:text-gray-400 font-medium">Семейный бюджет</span>
                  </div>
                )}
              </button>
            </div>

            {/* Navigation Links */}
            <nav aria-label="Основное меню" className={`w-full ${isSidebarExpanded ? 'px-3' : 'px-2'} space-y-1 mt-3` }>
              {TAB_GROUPS.map(group=>{
                const tabs=visibleTabs.filter(tab=>tab.group===group.id);
                if(!tabs.length)return null;
                return <div key={group.id} className="space-y-1 pb-2">
                  {isSidebarExpanded&&<div className="px-3 pt-2 pb-1 text-xs font-medium text-graphite-muted">{group.label}</div>}
                  {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={()=>navigateMenu(tab.id)}
                    title={tab.label}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={tab.label}
                    className={`w-full min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSidebarExpanded ? 'gap-3 px-3.5 py-2.5 rounded-xl justify-start' : 'justify-center w-11 h-11 mx-auto rounded-xl'} transition-all cursor-pointer group ${
                      isActive 
                        ? 'bg-primary text-white font-semibold' 
                        : 'text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white hover:bg-surface-subtle dark:hover:bg-[#2C2C2E] font-medium'
                    }`}
                  >
                    <span className="shrink-0 relative">
                      {React.createElement(tab.icon, { 
                        size: 21, 
                        className: isActive ? 'text-white' : 'group-hover:text-primary transition-colors' 
                      })}
                      {!isSidebarExpanded && tab.id === 'shopping' && activeShoppingCount > 0 && (
                        <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-[#FAF8F5] dark:ring-[#1C1C1E]" />
                      )}
                    </span>
                    {isSidebarExpanded && (
                      <span className="text-sm tracking-wide flex-1 text-left">{tab.label}</span>
                    )}
                    {isSidebarExpanded && tab.id === 'shopping' && activeShoppingCount > 0 && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#EAF2EC] dark:bg-primary/30 text-primary dark:text-green-400'}`}>
                        {activeShoppingCount}
                      </span>
                    )}
                  </button>
                );
                  })}
                </div>;
              })}
            </nav>
          </div>

          {/* Sidebar Footer: Quick Actions */}
          <div className={`w-full ${isSidebarExpanded ? 'px-3' : 'px-2'} pt-3 border-t border-surface-border dark:border-white/5`}>
            {/* Quick Actions */}
            <div className={`flex items-center ${isSidebarExpanded ? 'justify-around w-full' : 'flex-col gap-1 w-full'}`}>
              <button 
                type="button"
                onClick={() => setIsAIChatOpen(true)} 
                title="AI Ассистент (Gemini)" aria-label="AI Ассистент" 
                className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[#4A7C59] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
              >
                <Sparkles size={18} />
              </button>
              <button 
                type="button"
                onClick={() => setShowNotifications(true)} 
                title="Уведомления" aria-label="Уведомления" 
                className="relative min-h-[44px] min-w-[44px] p-2 rounded-xl text-graphite-muted dark:text-gray-400 hover:text-primary hover:bg-surface-subtle dark:hover:bg-[#2C2C2E] transition cursor-pointer"
              >
                <Bell size={18} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#1C1C1E]" />
                )}
              </button>
              <button 
                type="button"
                onClick={() => setIsSettingsOpen(true)} 
                title="Настройки" aria-label="Настройки"
                className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-graphite-muted dark:text-gray-400 hover:text-primary hover:bg-surface-subtle dark:hover:bg-[#2C2C2E] transition cursor-pointer"
              >
                <SettingsIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>
      {/* END: LeftSidebar */}

      {/* Main Content Area */}
      <main 
        ref={mainRef} 
        className="flex-1 min-h-0 flex flex-col min-w-0 bg-[var(--terra-canvas)] overflow-hidden relative"
      >
        {/* Offline Alert Banner */}
        {!isOnline && (
          <div className="bg-[var(--terra-offline-soft)] text-[var(--terra-offline-text)] text-sm font-semibold px-4 py-2 flex items-center justify-center gap-2 shrink-0 z-30">
            <WifiOff size={15} />
            <span>Нет сети. Сохранение изменений на сервере не подтверждено</span>
          </div>
        )}

        {isImporting&&<div role="status" className="shrink-0 px-4 py-2 text-sm bg-[var(--terra-pending-soft)] text-[var(--terra-pending-text)]">Чтение выписки…</div>}
        <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
            <div key={tabScope+'-overview'} data-tab-panel="overview" className={`h-full min-h-0 w-full flex-1 flex-col overflow-hidden ${activeTab === 'overview' ? 'flex' : 'hidden'}`}>
                {financialDataStatus!=='ready'?<FinancialDataState status={financialDataStatus} onRetry={retryFinancialData} onSettings={()=>setIsSettingsOpen(true)} onNotifications={()=>setShowNotifications(true)}/>:<TerraOverview 
                    onOpenNotifications={()=>setShowNotifications(true)}
                    onOpenAddModal={() => setIsAddModalOpen(true)}
                    onOpenAIChat={() => setIsAIChatOpen(true)}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onEditTransaction={handleEditTransaction}
                    onNavigateTab={(tabId) => setActiveTab(tabId)}
                    onDrillDown={(catId) => setDrillDownState({ categoryId: catId })}
                    onEditMandatoryExpense={(expense) => {
                        setSelectedMandatoryExpense(expense);
                        setIsMandatoryModalOpen(true);
                    }}
                    currentMonth={currentMonth}
                    onMonthChange={setCurrentMonth}
                    onOpenAddEventModal={() => {
                        setSelectedEvent(null);
                        setIsAddEventModalOpen(true);
                    }}
                    onEditEvent={(ev) => {
                        setSelectedEvent(ev);
                        setIsAddEventModalOpen(true);
                    }}
                />}
            </div>
            
            <div key={tabScope+'-budget'} data-tab-panel="budget" className={`h-full min-h-0 w-full flex-1 flex-col overflow-hidden ${activeTab === 'budget' ? 'flex' : 'hidden'}`}>
                {mountTab('budget') && <Suspense fallback={<TabLoading/>}>
                  {financialDataStatus!=='ready'?<FinancialDataState status={financialDataStatus} onRetry={retryFinancialData} onSettings={()=>setIsSettingsOpen(true)} onNotifications={()=>setShowNotifications(true)}/>:<TerraBudget
                    onOpenNotifications={()=>setShowNotifications(true)}
                    key={householdPersonal?'private-budget':personalDisplayOnly?'personal-display':'joint-budget'}
                    transactions={displayTransactions}
                    categories={categories}
                    members={displayMembers}
                    mandatoryExpenses={displaySettings.mandatoryExpenses || []}
                    settings={displaySettings}
                    currentMonth={currentMonth}
                    onMonthChange={setCurrentMonth}
                    onEditTransaction={handleEditTransaction}
                    onOpenAddModal={() => setIsAddModalOpen(true)}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenTrainModal={() => setDrillDownState({ categoryId: 'other' })}
                    onImportClick={() => {if(!importingRef.current)document.getElementById('import-input')?.click();}}
                    onToggleMandatoryPaid={handleToggleMandatoryPaid}
                    onSelectCategory={(catId) => setDrillDownState({ categoryId: catId })}
                    onAddMandatoryExpense={() => {
                        setSelectedMandatoryExpense(null);
                        setIsMandatoryModalOpen(true);
                    }}
                    onEditMandatoryExpense={(expense) => {
                        setSelectedMandatoryExpense(expense);
                        setIsMandatoryModalOpen(true);
                    }}
                    onQuickAddTransaction={async (title, amount, date, memberId, categoryId) => {
                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        try {
                            const selectedCategory = categories.find(category => category.id === categoryId);
                            if (categoryId !== 'other' && (!selectedCategory || selectedCategory.transactionType === 'income')) {
                                throw new Error('Выбранная категория недоступна для расходов');
                            }
                            await handleTransactionSubmit({
                                amount,
                                type: 'expense',
                                category: categoryId,
                                memberId,
                                note: title,
                                date: dateStr
                            });
                            toast.success(`Операция "${title}" добавлена на ${amount.toLocaleString('ru-RU')} ₽`);
                            return true;
                        } catch (error) {
                            console.error('Quick transaction save failed:', error);
                            toast.error('Не удалось сохранить операцию');
                            return false;
                        }
                    }}
                />}
                </Suspense>}

            </div>
            
            <div key={tabScope+'-plans'} data-tab-panel="plans" className={`h-full min-h-0 w-full flex-1 flex-col overflow-hidden ${activeTab === 'plans' ? 'flex' : 'hidden'}`}>
              <FamilyPlans 
                events={events} 
                setEvents={setEvents} 
                settings={settings} 
                members={members} 
                onSendToTelegram={handleSendEventToTelegram} 
                onDeleteEvent={handleDeleteEvent}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenNotifications={() => setShowNotifications(true)}
                onOpenBudget={() => setActiveTab('budget')}
              />
            </div>

            <div key={tabScope+'-shopping'} data-tab-panel="shopping" className={`h-full min-h-0 w-full flex-1 flex-col overflow-hidden ${activeTab === 'shopping' ? 'flex' : 'hidden'}`}>
              {mountTab('shopping') && <Suspense fallback={<TabLoading/>}>
                  <ShoppingList 
                items={shoppingItems} 
                setItems={setShoppingItems} 
                settings={settings} 
                members={members} 
                onMoveToPantry={handleMoveToPantry} 
                onSendToTelegram={handleSendShoppingToTelegram}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenNotifications={() => setShowNotifications(true)}
              />
                </Suspense>}

            </div>

            <div key={tabScope+'-chat'} data-tab-panel="chat" className={`h-full min-h-0 w-full flex-1 flex-col overflow-hidden ${activeTab === 'chat' ? 'flex' : 'hidden'}`}>
              {mountTab('chat') && <Suspense fallback={<TabLoading/>}>
                  <FamilyChat active={activeTab==='chat'} onOpenSettings={()=>setIsSettingsOpen(true)} onOpenNotifications={()=>setShowNotifications(true)} />
                </Suspense>}

            </div>

            <div key={tabScope+'-services'} data-tab-panel="services" className={`h-full min-h-0 w-full flex-1 flex-col overflow-hidden ${activeTab === 'services' ? 'flex' : 'hidden'}`}>
              {mountTab('services') && <Suspense fallback={<TabLoading/>}>
                  <ServicesHub 
                onOpenNotifications={()=>setShowNotifications(true)}
                initialService={targetService} 
                onClearService={() => setTargetService(null)} 
                onNavigateHome={() => setActiveTab('overview')}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
                </Suspense>}

            </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar matching screenshot */}
      <nav aria-label="Основная навигация" data-terra-tabbar className="md:hidden shrink-0 bg-[var(--terra-surface)] border-t border-[var(--terra-border)] px-1 py-2 flex overflow-x-auto overscroll-x-contain items-center z-40 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
         {visibleTabs.map(tab => {
             const isActive = activeTab === tab.id;
             return (
                <button 
                  key={tab.id} 
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={tab.label}
                  onClick={() => {
                    triggerHaptic('light');
                    navigateMenu(tab.id);
                  }} 
                  className={`relative flex flex-col items-center justify-center flex-1 min-w-[44px] min-h-[48px] px-0.5 py-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors terra-press ${
                    isActive ? 'bg-[#E6EDE5] dark:bg-[#20362A] text-[#326243] dark:text-green-400 font-bold' : 'text-graphite-muted dark:text-gray-400 hover:text-graphite'
                  }`}
                >
                    <span className="relative z-10 flex items-center justify-center">
                      {React.createElement(tab.icon, { size: 21, strokeWidth: isActive ? 2.3 : 1.8 })}
                    </span>
                    <span className="w-full min-w-0 truncate text-center text-[10px] sm:text-[11px] mt-1 font-medium">{tab.label}</span>
                    {tab.id === 'shopping' && activeShoppingCount > 0 && (
                      <span className="absolute top-1 right-[26%] w-2 h-2 rounded-full bg-[#4A7C59]" />
                    )}
                </button>
             );
         })}
      </nav>

      <Suspense fallback={null}>
        <AnimatePresence>
            {isAddModalOpen && <AddTransactionModal 
                key={selectedTx ? `edit-tx-${selectedTx.id}` : 'add-tx-modal'} 
                onClose={() => { setIsAddModalOpen(false); setSelectedTx(null); }} 
                onSubmit={handleTransactionSubmit} 
                settings={financialSettings} 
                members={householdPersonal ? members.filter(m=>m.userId && m.userId===user?.uid) : members} 
                categories={categories} 
                learnedRules={learnedRules}
                initialTransaction={selectedTx} 
                onLearnRule={handleLearnRule} 
                onAddCategory={handleAddCategory} 
                transactions={transactions} 
                onDelete={async (id) => { 
                  const transactionToDelete = transactions.find(t => t.id === id);
                  if (!transactionToDelete) throw new Error('Операция недоступна');
                  let updatedSavings: ReturnType<typeof applySavingsTransferToGoals> | null = null;
                  if (transactionToDelete && isGoalSavingsTransfer(transactionToDelete) && goals.length > 0) {
                    updatedSavings = applySavingsTransferToGoals(
                      goals,
                      transactionToDelete.amount,
                      transactionToDelete.type !== 'expense',
                      transactionToDelete.linkedGoalId
                    );
                  }
                  if (!familyId) throw new Error('Family is not ready: transaction was not deleted');
                  await deleteTransactionWithGoal(familyId, id, updatedSavings?.affectedGoal);
                  // Firestore snapshots reconcile goals after the delete.
                  setTransactions(prev => prev.filter(t => t.id !== id));
                  setIsAddModalOpen(false);
                  setSelectedTx(null);
                  toast.success('Операция удалена');
                }} 
            />}
            {isSettingsOpen && <SettingsModal
                installPrompt={installPrompt}
                onInstallPromptConsumed={()=>setInstallPrompt(null)} 
                key="settings-modal"
                settings={settings} 
                onClose={() => setIsSettingsOpen(false)} 
                onUpdate={async (s) => await updateSettings(s)} 
                onReset={handleResetSettings} 
                savingsRate={savingsRate} 
                setSavingsRate={setSavingsRate} 
                members={members} 
                onUpdateMembers={async (m) => {
                  // Do not acknowledge a family profile change until Firestore
                  // has accepted it; a stale local overwrite misattributes purchases.
                  if (familyId) {
                    await updateItemsBatch(familyId, 'members', m);
                  }
                  setMembers(m);
                  try {
                    localStorage.setItem('local_members', JSON.stringify(m));
                  } catch (storageErr) {
                    console.warn('Failed to save members to localStorage:', storageErr);
                  }
                }}
                categories={categories} 
                onUpdateCategories={async (c) => { if (familyId) await updateItemsBatch(familyId, 'categories', c); }} 
                onDeleteCategory={async id => { if (familyId) await deleteItem(familyId, 'categories', id); }} 
                learnedRules={learnedRules} 
                onUpdateRules={setLearnedRules} 
                currentFamilyId={familyId} 
                onJoinFamily={async (id) => { if(auth.currentUser) { await joinFamily(auth.currentUser, id); window.location.reload(); } }} 
                onLogout={logout} 
                transactions={transactions} 
                onUpdateTransactions={async (updatedTxs) => { 
                    setTransactions(updatedTxs); // Update local state immediately!
                    if (familyId) await updateItemsBatch(familyId, 'transactions', updatedTxs); 
                }} 
                onDeleteTransactionsByPeriod={handleDeleteTransactionsByPeriod} 
                onOpenDuplicates={() => { setIsSettingsOpen(false); setIsDuplicatesOpen(true); }} 
            />}
            {isAIChatOpen && (
              <AIChatModal 
                key={'ai-chat-modal-'+(user?.uid??'demo')+'-'+(familyId??'local')+'-'+(householdPersonal?'personal':'family')} 
                onClose={() => setIsAIChatOpen(false)} 
                onOpenSettings={() => {
                  setIsAIChatOpen(false);
                  setIsSettingsOpen(true);
                }}
              />
            )}
            {drillDownState && <DrillDownModal 
                key="drilldown-modal"
                categoryId={drillDownState.categoryId} 
                merchantName={drillDownState.merchantName} 
                onClose={() => setDrillDownState(null)} 
                transactions={filteredTransactions} 
                setTransactions={setTransactions} 
                settings={financialSettings} 
                members={members} 
                categories={categories} 
                onLearnRule={handleLearnRule} 
                onEditTransaction={handleEditTransaction}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
            />}
            {importPreview && (
              <ImportModal 
                key="import-modal"
                preview={importPreview} 
                onCancel={() => setImportPreview(null)} 
                onConfirm={async (finalItems) => {
                  try {
                    const itemsToImport = finalItems || importPreview;
                    if (!itemsToImport || itemsToImport.length === 0) {
                      setImportPreview(null);
                      toast.info("Импорт отменен (нет операций)");
                      return false;
                    }
                    // Profile bindings can change while the import preview is open.
                    const importMemberId = resolveImportMemberId(members, user?.uid);
                    assertImportRowsBelongToMember(itemsToImport, importMemberId);
                    assertImportBatchReady(itemsToImport, categories, importMemberId);
                    const prepared: Transaction[] = itemsToImport.map(item => {
                      const { tempId, isVerified, rememberRule, mcc, accountMask, ...clean } = item as any;
                      const rawNum = Number(clean.amount);
                      const safeAmount = Number.isFinite(rawNum) ? Math.abs(rawNum) : 0;
                      return {
                        ...clean,
                        amount: safeAmount,
                        date: clean.date || new Date().toISOString(),
                        type: clean.type === 'income' ? 'income' : 'expense',
                        id: clean.id || (Date.now().toString() + Math.random().toString(36).substring(2, 7))
                      };
                    });

                    // Savings transfers have side effects on goals; never process them unattended.
                    const unattended = window.sessionStorage.getItem('alfaSyncUnattended') === '1';
                    if (unattended && prepared.some(t => isSavingsTransfer(t))) {
                      throw new Error('Найдены переводы в накопления: требуется ручная проверка.');
                    }
                    if (unattended && prepared.some(t =>
                      !t.category || t.category === 'other' ||
                      !isCategoryForType(t.category, categories, t.type)
                    )) {
                      throw new Error('В выписке остались операции без надёжной категории. Импорт отложен для ручной проверки, XLSX сохранён.');
                    }
                    // A bank transfer and its savings account must commit together.
                    // Known Alfa IDs are idempotent on retry; no speculative local
                    // goal balance updates and no extra post-import Firestore write.
                    if (!familyId) throw new Error('Семья не подключена. Импорт не выполнен.');
                    // Resolve every savings disposition before committing even ordinary rows.
                    assertImportSavingsReady(prepared,goals,importMemberId);
                    const normalRows = prepared.filter(t=>!isGoalSavingsTransfer(t));
                    const savingsRows = prepared.filter(t=>isGoalSavingsTransfer(t));
                    const created: Transaction[] = [];
                    if(normalRows.length) {
                      const ordinary = normalRows.every(t=>/^alfa_[a-f0-9]{40}$/.test(t.id))
                        ? await addAlfaItemsIdempotent(familyId,normalRows)
                        : await addItemsBatch(familyId,'transactions',normalRows);
                      created.push(...ordinary);
                    }
                    for (const row of savingsRows) {
                      const goal=goals.find(g=>g.id===row.linkedGoalId&&g.memberId===importMemberId);
                      if(!goal)throw new Error('Накопительная цель недоступна. Повторите проверку выписки.');
                      if(await addImportedSavingsItemIdempotent(familyId,row,goal))created.push(row);
                    }
                    const totalImportedSavings=created.reduce((sum,t)=>sum+savingsContributionKopecks(t),0)/100;
                    setImportPreview(null);
                    setTransactions(prev=>[...created.filter(t=>!prev.some(ex=>ex.id===t.id)),...prev]);
                    if (created.length === 0) toast.info('Все операции уже сохранены');
                    else if (totalImportedSavings !== 0) toast.success(
                      `Импортировано ${created.length} операций, изменение накоплений: ${totalImportedSavings.toLocaleString('ru-RU')} ₽`
                    );
                    else toast.success(`Импортировано ${created.length} операций`);

                    // Never acknowledge deletion until every operation in the
                    // original XLSX exists on the Firestore server. The preview
                    // can omit legacy duplicates, so checking only prepared is unsafe.
                    if (familyId && importFileDigestRef.current && importFileRef.current) {
                      const memberId = importMemberId;
                      const allRows = await parseAlfaStatement(
                        importFileRef.current, settings.alfaMapping, memberId,
                        learnedRules, categories, []
                      );
                      const allSaved = await areAlfaItemsSavedOnServer(familyId, allRows.map(row => row.id));
                      if (allSaved) {
                        window.dispatchEvent(new CustomEvent('budget:import-committed', {
                          detail: {
                            count: created.length,
                            requested: allRows.length,
                            fileSha256: importFileDigestRef.current
                          }
                        }));
                      } else {
                        toast.warning('Операции сохранены, но не вся выписка подтверждена на сервере. XLSX оставлен для проверки.');
                      }
                    }
                    return true;
                  } catch (err: any) {
                    console.error("Import error:", err);
                    toast.error("Ошибка сохранения: " + (err.message || String(err)));
                    return false;
                  }
                }}
                settings={settings} 
                categories={categories} 
                onUpdateItem={(idx, updates) => { 
                  const updated = [...importPreview!]; 
                  updated[idx] = { ...updated[idx], ...updates }; 
                  setImportPreview(updated); 
                }} 
                onUpdateAll={(items) => setImportPreview(items)} 
                onLearnRule={handleLearnRule} 
                learnedRules={learnedRules}
                onAddCategory={handleAddCategory} 
                transactions={transactions}
                members={members}
                goals={goals}
              />
            )}
            {showNotifications && <NotificationsModal key="notifications-modal" onClose={() => setShowNotifications(false)} />}
            
            {isMandatoryModalOpen && <MandatoryExpenseModal
                key={selectedMandatoryExpense ? `edit-exp-${selectedMandatoryExpense.id}` : 'mandatory-exp-modal'}
                expense={selectedMandatoryExpense}
                onClose={() => { setIsMandatoryModalOpen(false); setSelectedMandatoryExpense(null); }}
                settings={financialSettings}
                selectedMonth={currentMonth}
                members={householdPersonal?members.filter(m=>m.userId===user?.uid):members}
                onSave={async (e, manuallyPaid) => {
                  const existingId = selectedMandatoryExpense?.id;
                  if(existingId&&!financialSettings.mandatoryExpenses.some(item=>item.id===existingId))throw new Error('Платёж недоступен');
                  const updated = existingId
                    ? (financialSettings.mandatoryExpenses || []).map(item => item.id === existingId ? {...e,id:existingId} : item)
                    : [...(financialSettings.mandatoryExpenses || []), e];
                  const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
                  const monthIds = financialSettings.manualPaidExpenses?.[monthKey] || [];
                  const nextMonthIds = manuallyPaid
                    ? Array.from(new Set([...monthIds,e.id]))
                    : monthIds.filter(id => id !== e.id);
                  const debtChanges: Array<{id:string;changes:Partial<Debt>}> = [];
                  const oldDebtId = selectedMandatoryExpense?.linkedDebtId;
                  if (oldDebtId && oldDebtId !== e.linkedDebtId) {
                    debtChanges.push({id:oldDebtId,changes:{linkedExpenseId:null,paidThisMonth:false}});
                  }
                  if (e.linkedDebtId) {
                    const isThisMonth = currentMonth.getMonth() === new Date().getMonth() &&
                      currentMonth.getFullYear() === new Date().getFullYear();
                    debtChanges.push({id:e.linkedDebtId,changes:{
                      linkedExpenseId:e.id,
                      ...(isThisMonth ? {paidThisMonth:manuallyPaid} : {})
                    }});
                  }
                  await updateMandatoryPaymentBundle({
                    mandatoryExpenses:updated,
                    manualPaidExpenses:{[monthKey]:nextMonthIds}
                  },debtChanges);
                  setIsMandatoryModalOpen(false);
                  setSelectedMandatoryExpense(null);
                }}
                onDelete={async (id) => {
                  if(!financialSettings.mandatoryExpenses.some(item=>item.id===id))throw new Error('Платёж недоступен');
                  const updated = (financialSettings.mandatoryExpenses || []).filter(item => item.id !== id);
                  const manualPaid = Object.fromEntries(
                    Object.entries(financialSettings.manualPaidExpenses || {}).map(([month,ids])=>
                      [month,ids.filter(paidId => paidId !== id)]
                    )
                  );
                  const oldDebtId = selectedMandatoryExpense?.linkedDebtId;
                  const debtChanges = oldDebtId
                    ? [{id:oldDebtId,changes:{linkedExpenseId:null,paidThisMonth:false}}]
                    : [];
                  await updateMandatoryPaymentBundle({
                    mandatoryExpenses:updated,manualPaidExpenses:manualPaid
                  },debtChanges);
                  setIsMandatoryModalOpen(false);
                  setSelectedMandatoryExpense(null);
                }}
            />}

            {isDuplicatesOpen && <DuplicatesModal key="duplicates-modal" transactions={transactions} onClose={() => setIsDuplicatesOpen(false)} onDelete={handleBatchDelete} onIgnore={async (pairs) => { const ignored = [...(settings.ignoredDuplicatePairs || []), ...pairs]; await updateSettings({ ignoredDuplicatePairs: ignored }); }} ignoredPairs={settings.ignoredDuplicatePairs} />}
            {isGoalModalOpen && <GoalModal key={editingGoal ? `edit-goal-${editingGoal.id}` : 'goal-modal'} goal={editingGoal} onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }} onSave={handleGoalSave} onDelete={editingGoal ? () => handleGoalDelete(editingGoal.id) : undefined} settings={settings} />}
            {isAddEventModalOpen && (
                <EventModal 
                    key={selectedEvent ? `edit-event-${selectedEvent.id}` : 'add-event-modal'}
                    event={selectedEvent}
                    members={members}
                    settings={settings}
                    templates={events.filter(e => e.isTemplate)}
                    allEvents={events}
                    onClose={() => {
                        setIsAddEventModalOpen(false);
                        setSelectedEvent(null);
                    }}
                    onSave={async (e) => {
                        await handleSaveEvent(e);
                        setSelectedEvent(null);
                    }}
                    onDelete={async (id, scope) => {
                        await handleDeleteEvent(id,scope);
                        setIsAddEventModalOpen(false);
                        setSelectedEvent(null);
                    }}
                    onSendToTelegram={handleSendEventToTelegram}
                />
            )}
        </AnimatePresence>

        {/* Hidden input for importing statements */}
        <input 
          id="import-input" 
          type="file" 
          accept=".xlsx,.xls,.csv,.txt" 
          className="hidden" 
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleImport(file);
              e.target.value = '';
            }
          }} 
        />
      </Suspense>
    </div>
  );
}