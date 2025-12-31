
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Settings as SettingsIcon, Sparkles, LayoutGrid, Wallet, CalendarDays, ShoppingBag, TrendingUp, Users, Crown, ListChecks, CheckCircle2, Circle, X, CreditCard, Calendar, Target, Loader2, Grip, Zap, MessageCircle, LogIn, Lock, LogOut, Cloud, Shield, AlertTriangle, Bug, ArrowRight, Bell, WifiOff, Maximize2, ChevronLeft, Snowflake, Gift } from 'lucide-react';
import { Transaction, SavingsGoal, AppSettings, ShoppingItem, FamilyEvent, FamilyMember, LearnedRule, Category, Subscription, Debt, PantryItem, LoyaltyCard, WidgetConfig, MeterReading, WishlistItem } from './types';
import { FAMILY_MEMBERS as INITIAL_FAMILY_MEMBERS, INITIAL_CATEGORIES } from './constants';
import AddTransactionModal from './components/AddTransactionModal';
import TransactionHistory from './components/TransactionHistory';
import GoalsSection from './components/GoalsSection';
import SmartHeader from './components/SmartHeader';
import SpendingCalendar from './components/SpendingCalendar';
import CategoryProgress from './components/CategoryProgress';
import ImportModal from './components/ImportModal';
import SettingsModal from './components/SettingsModal';
import ShoppingList from './components/ShoppingList';
import FamilyPlans from './components/FamilyPlans';
import EventModal from './components/EventModal';
import GoalModal from './components/GoalModal';
import Widget from './components/Widget';
import ChartsSection from './components/ChartsSection';
import MonthlyAnalyticsWidget from './components/MonthlyAnalyticsWidget';
import ServicesHub from './components/ServicesHub';
import PinScreen from './components/PinScreen';
import OnboardingModal from './components/OnboardingModal';
import MandatoryExpensesList from './components/MandatoryExpensesList';
import { parseAlfaStatement } from './utils/alfaParser';

// Firebase Imports
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { subscribeToCollection, subscribeToSettings, addItem, updateItem, deleteItem, saveSettings, getOrInitUserFamily, generateUniqueId } from './utils/db';

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'balance', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
  { id: 'charts', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 2 } },
  { id: 'daily', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
  { id: 'spent', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
  { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
  { id: 'goals', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
  { id: 'shopping', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
];

const DEFAULT_SETTINGS: AppSettings = {
  familyName: 'Семья',
  currency: '₽',
  startOfMonthDay: 1,
  privacyMode: false,
  widgets: DEFAULT_WIDGETS,
  enabledTabs: ['overview', 'budget', 'plans', 'shopping', 'services'],
  enabledServices: ['wallet', 'subs', 'debts', 'pantry', 'chat', 'meters', 'wishlist'],
  isPinEnabled: true, 
  defaultBudgetMode: 'family',
  telegramBotToken: '',
  telegramChatId: '',
  eventTemplate: '*Событие*\n{{title}}\n{{date}} {{time}}\n{{members}}\n{{duration}}',
  shoppingTemplate: '🛒 *Список покупок:*\n\n{{items}}',
  dayStartHour: 8,
  dayEndHour: 22,
  autoSendEventsToTelegram: false,
  initialBalance: 0,
  initialBalanceDate: new Date().toISOString().split('T')[0],
  salaryDates: [10, 25],
  mandatoryExpenses: [],
  alfaMapping: { date: 'дата', time: 'время', amount: 'сумма', category: 'категория', note: 'описание' }
};

const Snowfall = () => {
  const snowflakes = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${Math.random() * 5 + 5}s`,
    animationDelay: `${Math.random() * 5}s`,
    opacity: Math.random() * 0.5 + 0.3,
    size: Math.random() * 10 + 10 + 'px'
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {snowflakes.map(flake => (
        <div
          key={flake.id}
          className="snowflake"
          style={{
            left: flake.left,
            animationDuration: flake.animationDuration,
            animationDelay: flake.animationDelay,
            opacity: flake.opacity,
            fontSize: flake.size
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
};

const LoginScreen = ({ onLogin, loading }: { onLogin: () => void, loading: boolean }) => (
  <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-6 text-center">
    <div className="w-24 h-24 bg-blue-500 rounded-[2.5rem] flex items-center justify-center text-white mb-8 shadow-2xl shadow-blue-500/20">
      <Wallet size={48} strokeWidth={2.5} />
    </div>
    <h1 className="text-4xl font-black text-[#1C1C1E] mb-4 tracking-tight">Family Budget</h1>
    <p className="text-gray-400 font-bold mb-10 max-w-xs">Управляйте семейными финансами вместе. Просто, красиво, эффективно.</p>
    <button 
      onClick={onLogin} 
      disabled={loading}
      className="w-full max-w-xs bg-white text-[#1C1C1E] font-black py-5 rounded-[2rem] shadow-soft border border-gray-100 flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
    >
      {loading ? <Loader2 size={24} className="animate-spin" /> : (
        <>
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Войти через Google
        </>
      )}
    </button>
  </div>
);

const NotificationToast = ({ notification, onClose }: { notification: { message: string, type?: string }, onClose: () => void }) => {
  const bgColor = notification.type === 'error' ? 'bg-red-500' : notification.type === 'warning' ? 'bg-orange-500' : 'bg-green-500';
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -20, x: '-50%' }}
      className={`fixed top-6 left-1/2 z-[2000] px-6 py-3 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 ${bgColor}`}
    >
      <span>{notification.message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={14} /></button>
    </motion.div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'plans' | 'shopping' | 'services'>('overview');
  const [budgetMode, setBudgetMode] = useState<'personal' | 'family'>('family'); 
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const familyMembersRef = useRef<FamilyMember[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [learnedRules, setLearnedRules] = useState<LearnedRule[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [pinStatus, setPinStatus] = useState<'locked' | 'unlocked' | 'create' | 'disable_confirm'>('unlocked');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeEventToEdit, setActiveEventToEdit] = useState<FamilyEvent | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [importPreview, setImportPreview] = useState<Omit<Transaction, 'id'>[]>([]);
  const [savingsRate, setSavingsRate] = useState(20);
  const [appNotification, setAppNotification] = useState<{message: string, type?: string} | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [enlargedWidget, setEnlargedWidget] = useState<string | null>(null);
  const [detailCategory, setDetailCategory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [pendingMember, setPendingMember] = useState<FamilyMember | null>(null);

  // New Year Logic
  const isNewYear = useMemo(() => {
    const now = new Date();
    const endDate = new Date('2026-01-10');
    return now < endDate;
  }, []);

  const themeColor = isNewYear ? 'rose-500' : 'blue-600';
  const themeBg = isNewYear ? 'bg-rose-500' : 'bg-blue-600';
  const themeText = isNewYear ? 'text-rose-500' : 'text-blue-600';

  const visibleTabs = useMemo(() => {
    const allTabs = [
      { id: 'overview', label: 'Обзор', icon: <LayoutGrid size={24} /> },
      { id: 'budget', label: 'Бюджет', icon: <Wallet size={24} /> },
      { id: 'plans', label: 'Планы', icon: <CalendarDays size={24} /> },
      { id: 'shopping', label: 'Покупки', icon: <ShoppingBag size={24} /> },
      { id: 'services', label: 'Сервисы', icon: <ListChecks size={24} /> },
    ];
    return allTabs.filter(tab => settings.enabledTabs.includes(tab.id));
  }, [settings.enabledTabs]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setAppNotification({ message: "Соединение восстановлено", type: "success" }); };
    const handleOffline = () => { setIsOnline(false); setAppNotification({ message: "Офлайн режим. Данные сохраняются локально.", type: "warning" }); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => { onAuthStateChanged(auth, async (currentUser) => { setUser(currentUser); if (currentUser) { try { const fid = await getOrInitUserFamily(currentUser); setFamilyId(fid); } catch (e) { setFamilyId(currentUser.uid); } } else { setFamilyId(null); } setAuthLoading(false); }); }, []);

  useEffect(() => {
    if (!familyId) return;
    const unsubTx = subscribeToCollection(familyId, 'transactions', (data) => setTransactions(data as Transaction[]));
    const unsubMembers = subscribeToCollection(familyId, 'members', (data) => { const newMembers = data as FamilyMember[]; setFamilyMembers(newMembers); familyMembersRef.current = newMembers; setMembersLoaded(true); });
    const unsubGoals = subscribeToCollection(familyId, 'goals', (data) => setGoals(data as SavingsGoal[]));
    const unsubShopping = subscribeToCollection(familyId, 'shopping', (data) => setShoppingItems(data as ShoppingItem[]));
    const unsubEvents = subscribeToCollection(familyId, 'events', (data) => setEvents(data as FamilyEvent[]));
    const unsubCats = subscribeToCollection(familyId, 'categories', (data) => { const dbCats = data as Category[]; if(dbCats.length > 0) setCategories(dbCats); });
    const unsubRules = subscribeToCollection(familyId, 'rules', (data) => setLearnedRules(data as LearnedRule[]));
    const unsubSubs = subscribeToCollection(familyId, 'subscriptions', (data) => setSubscriptions(data as Subscription[]));
    const unsubDebts = subscribeToCollection(familyId, 'debts', (data) => setDebts(data as Debt[]));
    const unsubPantry = subscribeToCollection(familyId, 'pantry', (data) => setPantry(data as PantryItem[]));
    const unsubCards = subscribeToCollection(familyId, 'cards', (data) => setLoyaltyCards(data as LoyaltyCard[]));
    const unsubMeters = subscribeToCollection(familyId, 'meters', (data) => setMeterReadings(data as MeterReading[]));
    const unsubWishlist = subscribeToCollection(familyId, 'wishlist', (data) => setWishlist(data as WishlistItem[]));
    const unsubSettings = subscribeToSettings(familyId, (data) => { const loadedSettings = { ...DEFAULT_SETTINGS, ...data } as AppSettings; setSettings(loadedSettings); settingsRef.current = loadedSettings; });
    return () => { unsubTx(); unsubMembers(); unsubGoals(); unsubShopping(); unsubEvents(); unsubCats(); unsubRules(); unsubSubs(); unsubDebts(); unsubPantry(); unsubCards(); unsubMeters(); unsubSettings(); unsubWishlist(); };
  }, [familyId]);

  useEffect(() => { if (user && familyId && membersLoaded) { const me = familyMembers.find(m => m.userId === user.uid || m.id === user.uid); setIsOnboarding(!me); } }, [user, familyId, membersLoaded, familyMembers]);

  const handleOnboardingStep1 = (name: string, color: string) => { if (!user || !familyId) return; const newMember: FamilyMember = { id: user.uid, userId: user.uid, name, color, isAdmin: familyMembers.length === 0, avatar: user.photoURL || undefined }; setPendingMember(newMember); setIsOnboarding(false); setPinStatus('create'); };
  const handlePinCreated = (pin: string) => { localStorage.setItem('family_budget_pin', pin); setPinCode(pin); if (pendingMember && familyId) { addItem(familyId, 'members', pendingMember); setPendingMember(null); } setPinStatus('unlocked'); };
  const togglePrivacy = () => { const newMode = !settings.privacyMode; setSettings(prev => ({...prev, privacyMode: newMode})); if (familyId) { saveSettings(familyId, {...settings, privacyMode: newMode}); } };
  useEffect(() => { const savedPin = localStorage.getItem('family_budget_pin'); setPinCode(savedPin); if (savedPin) setPinStatus('locked'); else if (settings.isPinEnabled && !savedPin) { setPinStatus('create'); } else setPinStatus('unlocked'); }, []);

  const handleSaveTransaction = (tx: Omit<Transaction, 'id'>) => { if (!familyId) return; if (editingTransaction) { updateItem(familyId, 'transactions', editingTransaction.id, tx); } else { addItem(familyId, 'transactions', { ...tx, id: generateUniqueId(), userId: user?.uid }); } };
  const handleDeleteTransaction = (id: string) => { if (!familyId) return; deleteItem(familyId, 'transactions', id); setIsModalOpen(false); setEditingTransaction(null); };
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (error) { try { await signInWithRedirect(auth, googleProvider); } catch (e) {} } };
  const handleLogout = async () => { await signOut(auth); setUser(null); setFamilyId(null); setIsSettingsOpen(false); };
  const updateSettings = (newSettings: AppSettings) => { if(!familyId) return; setSettings(newSettings); settingsRef.current = newSettings; saveSettings(familyId, newSettings); };
  
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !familyId) return; setIsImporting(true); try { const parsed = await parseAlfaStatement(file, settings.alfaMapping, familyId, learnedRules, categories, transactions); if (parsed.length > 0) { const withUser = parsed.map(p => ({ ...p, userId: user?.uid })); setImportPreview(withUser); setIsImportModalOpen(true); } else { setAppNotification({ message: "Новых операций не найдено", type: "warning" }); } } catch (err) { setAppNotification({ message: "Ошибка импорта", type: "error" }); } finally { setIsImporting(false); if (e.target) e.target.value = ''; } };

  const filteredTransactions = useMemo(() => { 
    let txs = transactions.filter(t => { 
      const tDate = new Date(t.date); 
      if (selectedDate) { return tDate.getDate() === selectedDate.getDate() && tDate.getMonth() === selectedDate.getMonth() && tDate.getFullYear() === selectedDate.getFullYear(); } 
      return tDate.getMonth() === currentMonth.getMonth() && tDate.getFullYear() === currentMonth.getFullYear(); 
    }); 
    if (budgetMode === 'personal' && user) { txs = txs.filter(t => (t.userId === user.uid) || (t.memberId === user.uid)); } 
    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedDate, currentMonth, budgetMode, user]);

  const categoryTransactions = useMemo(() => {
      if (!detailCategory) return [];
      return filteredTransactions.filter(t => t.category === detailCategory);
  }, [filteredTransactions, detailCategory]);

  const monthTransactions = useMemo(() => {
    let txs = transactions.filter(t => { const tDate = new Date(t.date); return tDate.getMonth() === currentMonth.getMonth() && tDate.getFullYear() === currentMonth.getFullYear(); });
    if (budgetMode === 'personal' && user) { txs = txs.filter(t => (t.userId === user.uid) || (t.memberId === user.uid)); }
    return txs;
  }, [transactions, currentMonth, budgetMode, user]);

  const totalBalance = useMemo(() => { let txsToCount = transactions; if (budgetMode === 'personal' && user) { txsToCount = transactions.filter(t => (t.userId === user.uid) || (t.memberId === user.uid)); } const startDate = settings.initialBalanceDate ? new Date(settings.initialBalanceDate) : new Date(0); const txSum = txsToCount.reduce((acc, tx) => { const txDate = new Date(tx.date); if (txDate < startDate) return acc; return tx.type === 'income' ? acc + tx.amount : acc - tx.amount; }, 0); return settings.initialBalance + txSum; }, [transactions, settings, budgetMode, user]);
  const currentMonthExpenses = useMemo(() => filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0), [filteredTransactions]);

  if (isOnboarding) return <OnboardingModal initialName={user?.displayName || ''} onSave={handleOnboardingStep1} />;
  if (pinStatus !== 'unlocked') return <PinScreen mode={pinStatus === 'create' ? 'create' : (pinStatus === 'disable_confirm' ? 'disable' : 'unlock')} onSuccess={(pin) => { if(pinStatus === 'create') handlePinCreated(pin); else if(pinStatus === 'disable_confirm') { localStorage.removeItem('family_budget_pin'); setPinCode(null); setPinStatus('unlocked'); } else setPinStatus('unlocked'); }} savedPin={pinCode || undefined} />;
  if (!user) return <LoginScreen onLogin={handleGoogleLogin} loading={authLoading} />;

  const createSyncHandler = <T extends { id: string }>(collectionName: string, currentState: T[]) => { return (newStateOrUpdater: T[] | ((prev: T[]) => T[])) => { if (!familyId) return; let newState: T[]; if (typeof newStateOrUpdater === 'function') { newState = (newStateOrUpdater as Function)(currentState); } else { newState = newStateOrUpdater; } const newIds = new Set(newState.map(i => i.id)); currentState.forEach(item => { if (!newIds.has(item.id)) deleteItem(familyId, collectionName, item.id); }); newState.forEach(newItem => { const oldItem = currentState.find(i => i.id === newItem.id); if (!oldItem) { addItem(familyId, collectionName, newItem); } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) { updateItem(familyId, collectionName, newItem.id, newItem); } }); }; };

  return (
    <div className={`min-h-screen pb-44 md:pb-24 max-w-7xl mx-auto px-4 md:px-6 pt-12 text-[#1C1C1E] relative ${isNewYear ? 'bg-gradient-to-b from-[#EBEFF5] to-[#E3E8F0]' : ''}`}>
      {isNewYear && <Snowfall />}
      <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx,.xls,.csv" className="hidden" />
      <AnimatePresence>{appNotification && <NotificationToast notification={appNotification} onClose={() => setAppNotification(null)} />}</AnimatePresence>

      <header className="flex justify-between items-start mb-8 md:mb-10 text-[#1C1C1E] relative z-10">
        <div><div className="flex items-center gap-4 h-10">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#1C1C1E] flex items-center gap-2">
                {isNewYear ? 'С Новым Годом!' : (activeTab === 'overview' ? 'Обзор' : activeTab === 'budget' ? 'Бюджет' : activeTab === 'plans' ? 'Планы' : activeTab === 'shopping' ? 'Покупки' : 'Сервисы')}
                {isNewYear && <Gift className="text-red-500 animate-bounce" />}
            </h1>
            {(activeTab === 'overview' || activeTab === 'budget') && (<div className="flex bg-gray-100/50 p-1 rounded-full relative h-9 items-center border border-gray-100"><button onClick={() => setBudgetMode('personal')} className={`relative z-10 px-3 md:px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${budgetMode === 'personal' ? 'text-black' : 'text-gray-400'}`}>Мой{budgetMode === 'personal' && <motion.div layoutId="budget-toggle" className="absolute inset-0 bg-white rounded-full shadow-sm -z-10" />}</button><button onClick={() => setBudgetMode('family')} className={`relative z-10 px-3 md:px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${budgetMode === 'family' ? themeText : 'text-gray-400'}`}>Общий{budgetMode === 'family' && <motion.div layoutId="budget-toggle" className="absolute inset-0 bg-white rounded-full shadow-sm -z-10" />}</button></div>)}</div></div>
        <div className="flex gap-2">{!isOnline && (<div className="w-11 h-11 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center animate-pulse"><WifiOff size={20} /></div>)}<button onClick={() => setIsSettingsOpen(true)} className="p-3 md:p-4 bg-white shadow-soft rounded-3xl text-gray-400 border border-white hover:bg-gray-50 transition-colors ios-btn-active"><SettingsIcon size={20} /></button></div>
      </header>

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 w-full">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[160px] md:auto-rows-[180px] w-full">
                {settings.widgets.map(widget => {
                    if (!widget.isVisible) return null;
                    const { id } = widget;
                    const colClass = `col-span-${widget.mobile.colSpan} md:col-span-${widget.desktop.colSpan}`;
                    const rowClass = `row-span-${widget.mobile.rowSpan} md:row-span-${widget.desktop.rowSpan}`;
                    if (id === 'balance') return (<div key={id} className={`${colClass} ${rowClass}`}><SmartHeader balance={totalBalance} savingsRate={savingsRate} settings={settings} onTogglePrivacy={togglePrivacy} className="h-full" /></div>);
                    if (id === 'daily') return (<div key={id} className={`${colClass} ${rowClass}`}><Widget label={budgetMode === 'family' ? "Общий лимит" : "Мой лимит"} value={`${(totalBalance * (1 - savingsRate/100) / 30).toLocaleString('ru-RU', {maximumFractionDigits: 0})} ${settings.currency}`} icon={<TrendingUp size={18}/>} className="h-full" /></div>);
                    if (id === 'spent') return (<div key={id} className={`${colClass} ${rowClass}`}><Widget label={budgetMode === 'family' ? "Траты семьи" : "Мои траты"} value={`${currentMonthExpenses.toLocaleString('ru-RU')} ${settings.currency}`} icon={<LayoutGrid size={18}/>} className="h-full" /></div>);
                    if (id === 'charts') return (<div key={id} onClick={() => setEnlargedWidget('charts')} className={`${colClass} ${rowClass} cursor-pointer group relative`}><div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-2 rounded-xl backdrop-blur-md shadow-sm"><Maximize2 size={16} className="text-gray-400" /></div><ChartsSection transactions={filteredTransactions} settings={settings} onCategoryClick={(catId) => { setDetailCategory(catId); setEnlargedWidget(null); }} /></div>);
                    if (id === 'month_chart') return (<div key={id} onClick={() => setEnlargedWidget('month_chart')} className={`${colClass} ${rowClass} cursor-pointer group relative`}><div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-2 rounded-xl backdrop-blur-md shadow-sm"><Maximize2 size={16} className="text-gray-400" /></div><MonthlyAnalyticsWidget transactions={monthTransactions} currentMonth={currentMonth} settings={settings} /></div>);
                    if (id === 'goals') return (<div key={id} className={`${colClass} ${rowClass}`}><GoalsSection goals={goals} settings={settings} onAddGoal={() => { setSelectedGoal(null); setIsGoalModalOpen(true); }} onEditGoal={(goal) => { setSelectedGoal(goal); setIsGoalModalOpen(true); }} className="h-full" /></div>);
                    if (id === 'shopping') return (<div key={id} onClick={() => setActiveTab('shopping')} className={`${colClass} ${rowClass} bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-soft flex flex-col transition-all hover:scale-[1.01] overflow-hidden cursor-pointer`}><div className="flex items-center justify-between mb-3"><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Купить</h3><div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><ShoppingBag size={16}/></div></div><div className="flex flex-wrap gap-1.5 overflow-hidden">{shoppingItems.filter(i => !i.completed).slice(0, 8).map(item => (<div key={item.id} className="px-2.5 py-1.5 flex items-center gap-1.5 bg-gray-50 rounded-xl border border-gray-100/50"><div className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" /><span className="font-bold text-[10px] text-[#1C1C1E] whitespace-nowrap">{item.title}</span></div>))}</div></div>);
                    return null;
                })}
              </div>

              {/* FAB - Fixed style and alignment */}
              <div className="fixed bottom-32 right-4 md:right-[calc((100%-1280px)/2+24px)] z-[100] flex flex-col items-end gap-3 pointer-events-none">
                <AnimatePresence>
                  {fabOpen && (
                    <>
                      <motion.button initial={{opacity:0, y:20, scale:0.8}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, y:20, scale:0.8}} transition={{delay:0.05}} onClick={() => { setFabOpen(false); setIsEventModalOpen(true); setActiveEventToEdit(null); }} className="pointer-events-auto flex items-center gap-3 bg-white p-3 pr-5 rounded-2xl shadow-xl border border-gray-50">
                        <div className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center"><Calendar size={20} /></div>
                        <span className="font-black text-sm text-[#1C1C1E]">Событие</span>
                      </motion.button>
                      <motion.button initial={{opacity:0, y:20, scale:0.8}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, y:20, scale:0.8}} onClick={() => { setFabOpen(false); setEditingTransaction(null); setIsModalOpen(true); }} className="pointer-events-auto flex items-center gap-3 bg-white p-3 pr-5 rounded-2xl shadow-xl border border-gray-50">
                        <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center"><CreditCard size={20} /></div>
                        <span className="font-black text-sm text-[#1C1C1E]">Операция</span>
                      </motion.button>
                    </>
                  )}
                </AnimatePresence>
                <button onClick={() => setFabOpen(!fabOpen)} className={`pointer-events-auto w-16 h-16 rounded-[1.8rem] flex items-center justify-center shadow-2xl transition-all duration-300 ${fabOpen ? 'bg-black rotate-45 text-white shadow-black/20' : `${themeBg} text-white shadow-lg`}`}>
                  <Plus size={32} strokeWidth={3} />
                </button>
              </div>
              <AnimatePresence>{fabOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setFabOpen(false)} className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[90]" />}</AnimatePresence>
            </motion.div>
          )}
          {activeTab === 'budget' && (
            <motion.div key="budget" className="space-y-6 w-full">
              <section className="flex flex-col gap-6 w-full"><div className="flex justify-between items-center px-1"><h2 className="text-xl font-black text-[#1C1C1E]">{selectedDate ? `Траты за ${selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}` : 'Календарь трат'}</h2><div className="flex gap-2"><button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className={`p-3 bg-white border border-gray-100 ${themeText} rounded-2xl shadow-sm ios-btn-active`}><Plus size={20} /></button><button disabled={isImporting} onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 ${themeText} font-bold text-sm bg-blue-50 px-5 py-2.5 rounded-2xl shadow-sm ios-btn-active ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>{isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {isImporting ? 'Загрузка...' : 'Импорт'}</button></div></div><SpendingCalendar transactions={filteredTransactions} selectedDate={selectedDate} onSelectDate={setSelectedDate} currentMonth={currentMonth} onMonthChange={setCurrentMonth} settings={settings} /></section>
              <section className="w-full"><TransactionHistory transactions={filteredTransactions} setTransactions={setTransactions} settings={settings} members={familyMembers} onLearnRule={() => {}} categories={categories} filterMode={selectedDate ? 'day' : 'month'} onEditTransaction={(tx) => { setEditingTransaction(tx); setIsModalOpen(true); }} /></section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><MandatoryExpensesList expenses={settings.mandatoryExpenses || []} transactions={transactions} settings={settings} currentMonth={currentMonth} /><CategoryProgress transactions={filteredTransactions} settings={settings} categories={categories} /></div>
            </motion.div>
          )}
          {activeTab === 'plans' && (<motion.div key="plans" className="w-full"><FamilyPlans events={events} setEvents={createSyncHandler('events', events)} settings={settings} members={familyMembers} onSendToTelegram={async () => true} /></motion.div>)}
          {activeTab === 'shopping' && (<motion.div key="shopping" className="w-full"><ShoppingList items={shoppingItems} setItems={createSyncHandler('shopping', shoppingItems)} settings={settings} members={familyMembers} transactions={transactions} onCompletePurchase={() => {}} /></motion.div>)}
          {activeTab === 'services' && (<motion.div key="services" className="w-full"><ServicesHub events={events} setEvents={createSyncHandler('events', events)} settings={settings} members={familyMembers} subscriptions={subscriptions} setSubscriptions={createSyncHandler('subscriptions', subscriptions)} debts={debts} setDebts={createSyncHandler('debts', debts)} pantry={pantry} setPantry={createSyncHandler('pantry', pantry)} transactions={transactions} goals={goals} loyaltyCards={loyaltyCards} setLoyaltyCards={createSyncHandler('cards', loyaltyCards)} readings={meterReadings} setReadings={createSyncHandler('meters', meterReadings)} wishlist={wishlist} setWishlist={createSyncHandler('wishlist', wishlist)} /></motion.div>)}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-1.5 shadow-soft z-[100] flex justify-between items-center">{visibleTabs.map(tab => (<NavButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id as any)} icon={tab.icon} label={tab.label} activeColor={themeText} />))}</nav>

      {/* Enlarged Widget Modal */}
      <AnimatePresence>
        {enlargedWidget && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEnlargedWidget(null)} className="absolute inset-0 bg-[#1C1C1E]/60 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-4xl h-[80vh] md:h-[70vh] rounded-[3rem] shadow-2xl p-6 md:p-10 flex flex-col overflow-hidden">
               <button onClick={() => setEnlargedWidget(null)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors z-20"><X size={24}/></button>
               <div className="flex-1 min-h-0 pt-8">
                  {enlargedWidget === 'charts' && <ChartsSection transactions={filteredTransactions} settings={settings} onCategoryClick={(catId) => { setDetailCategory(catId); setEnlargedWidget(null); }} />}
                  {enlargedWidget === 'month_chart' && <MonthlyAnalyticsWidget transactions={monthTransactions} currentMonth={currentMonth} settings={settings} />}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Detail Modal */}
      <AnimatePresence>
          {detailCategory && (
              <div className="fixed inset-0 z-[1100] flex items-end md:items-center justify-center p-0 md:p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetailCategory(null)} className="absolute inset-0 bg-black/40 backdrop-blur-md" />
                  <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative bg-[#F2F2F7] w-full max-w-2xl md:rounded-[3rem] rounded-t-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                      <div className="bg-white p-6 flex justify-between items-center border-b border-gray-100 shrink-0">
                          <div className="flex items-center gap-3">
                              <button onClick={() => setDetailCategory(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><ChevronLeft size={24}/></button>
                              <h3 className="font-black text-xl text-[#1C1C1E]">
                                  {categories.find(c => c.id === detailCategory)?.label}
                              </h3>
                          </div>
                          <button onClick={() => setDetailCategory(null)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><X size={20}/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                          <TransactionHistory transactions={categoryTransactions} setTransactions={setTransactions} settings={settings} members={familyMembers} onLearnRule={() => {}} categories={categories} />
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isModalOpen && <AddTransactionModal onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} onSubmit={handleSaveTransaction} onDelete={handleDeleteTransaction} settings={settings} members={familyMembers} categories={categories} initialTransaction={editingTransaction} />}
        {isEventModalOpen && <EventModal event={activeEventToEdit} members={familyMembers} onClose={() => { setIsEventModalOpen(false); setActiveEventToEdit(null); }} onSave={() => {}} onDelete={() => {}} onSendToTelegram={async () => true} templates={[]} settings={settings} />}
        {isGoalModalOpen && <GoalModal goal={selectedGoal} onClose={() => { setIsGoalModalOpen(false); setSelectedGoal(null); }} onSave={() => {}} onDelete={() => {}} settings={settings} />}
        {isSettingsOpen && <SettingsModal settings={settings} onClose={() => setIsSettingsOpen(false)} onUpdate={updateSettings} onReset={() => {}} savingsRate={savingsRate} setSavingsRate={setSavingsRate} members={familyMembers} onUpdateMembers={createSyncHandler('members', familyMembers)} categories={categories} onUpdateCategories={createSyncHandler('categories', categories)} learnedRules={learnedRules} onUpdateRules={createSyncHandler('rules', learnedRules)} currentFamilyId={familyId} onJoinFamily={() => {}} onLogout={handleLogout} transactions={transactions} />}
        {isImportModalOpen && <ImportModal preview={importPreview} onConfirm={() => setIsImportModalOpen(false)} onCancel={() => setIsImportModalOpen(false)} settings={settings} onUpdateItem={() => {}} onLearnRule={() => {}} categories={categories} onAddCategory={() => {}} />}
      </AnimatePresence>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, activeColor }: any) => <button onClick={onClick} className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-[1.8rem] transition-all ${active ? `${activeColor} bg-blue-50/50 scale-100 font-black` : 'text-gray-400'}`}>{React.cloneElement(icon, { strokeWidth: active ? 3 : 2 })}<span className="text-[10px] uppercase tracking-widest font-black leading-none">{label}</span></button>;
export default App;
