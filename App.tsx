
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Settings as SettingsIcon, Sparkles, LayoutGrid, Wallet, CalendarDays, ShoppingBag, TrendingUp, Users, Crown, ListChecks, CheckCircle2, Circle, X, CreditCard, Calendar, Target, Loader2, Grip, Zap, MessageCircle, LogIn, Lock, LogOut, Cloud, Shield, AlertTriangle, Bug, ArrowRight, Bell, WifiOff, Maximize2, ChevronLeft, Snowflake, Gift, ChevronDown, MonitorPlay } from 'lucide-react';
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
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { subscribeToCollection, subscribeToSettings, addItem, addItemsBatch, updateItem, deleteItem, saveSettings, getOrInitUserFamily, joinFamily, generateUniqueId } from './utils/db';

// --- MOCK DATA FOR DEMO MODE ---
const DEMO_MEMBERS: FamilyMember[] = [
  { id: 'demo_papa', name: 'Папа', color: '#007AFF', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', isAdmin: true, userId: 'demo_user' },
  { id: 'demo_mama', name: 'Мама', color: '#FF2D55', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
  { id: 'demo_kid', name: 'Сын', color: '#34C759', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Buddy' },
];

const DEMO_GOALS: SavingsGoal[] = [
  { id: 'g1', title: 'Отпуск на море', targetAmount: 200000, currentAmount: 85000, icon: 'Plane', color: '#5856D6' },
  { id: 'g2', title: 'Новый ноутбук', targetAmount: 150000, currentAmount: 120000, icon: 'Tv', color: '#FF9500' },
];

const DEMO_SHOPPING: ShoppingItem[] = [
  { id: 's1', title: 'Молоко', amount: '2', unit: 'л', completed: false, memberId: 'demo_mama', priority: 'medium', category: 'dairy' },
  { id: 's2', title: 'Хлеб бородинский', amount: '1', unit: 'шт', completed: true, memberId: 'demo_papa', priority: 'medium', category: 'bakery' },
  { id: 's3', title: 'Яблоки', amount: '1.5', unit: 'кг', completed: false, memberId: 'demo_kid', priority: 'low', category: 'produce' },
];

const DEMO_EVENTS: FamilyEvent[] = [
  { id: 'e1', title: 'Семейный ужин', description: 'В итальянском ресторане', date: new Date().toISOString().split('T')[0], time: '19:00', duration: 2, memberIds: ['demo_papa', 'demo_mama', 'demo_kid'], checklist: [] },
  { id: 'e2', title: 'Платеж по ипотеке', description: 'Обязательно', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '10:00', duration: 1, memberIds: ['demo_papa'], checklist: [] },
];

const DEMO_TRANSACTIONS_GEN = () => {
  const txs: Transaction[] = [];
  const cats = ['food', 'auto', 'restaurants', 'shopping', 'utilities', 'entertainment'];
  const now = new Date();
  for (let i = 0; i < 20; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - Math.floor(Math.random() * 10));
    txs.push({
      id: `t${i}`,
      amount: Math.floor(Math.random() * 5000) + 150,
      type: 'expense',
      category: cats[Math.floor(Math.random() * cats.length)],
      memberId: Math.random() > 0.5 ? 'demo_papa' : 'demo_mama',
      userId: 'demo_user',
      note: `Покупка #${i+1}`,
      date: day.toISOString(),
    });
  }
  // Add income
  txs.push({ id: 'inc1', amount: 150000, type: 'income', category: 'salary', memberId: 'demo_papa', userId: 'demo_user', note: 'Зарплата', date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString() });
  return txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'balance', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
  { id: 'charts', isVisible: true, mobile: { colSpan: 2, rowSpan: 3 }, desktop: { colSpan: 2, rowSpan: 3 } }, 
  { id: 'daily', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
  { id: 'spent', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
  { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 2 }, desktop: { colSpan: 2, rowSpan: 2 } },
  { id: 'goals', isVisible: true, mobile: { colSpan: 2, rowSpan: 2 }, desktop: { colSpan: 1, rowSpan: 3 } }, 
  { id: 'shopping', isVisible: true, mobile: { colSpan: 2, rowSpan: 2 }, desktop: { colSpan: 1, rowSpan: 3 } }, 
];

const DEFAULT_SETTINGS: AppSettings = {
  familyName: 'Семья',
  currency: '₽',
  startOfMonthDay: 1,
  privacyMode: false,
  widgets: DEFAULT_WIDGETS,
  enabledTabs: ['overview', 'budget', 'plans', 'shopping', 'services'],
  enabledServices: ['wallet', 'subs', 'debts', 'pantry', 'chat', 'meters', 'wishlist'],
  isPinEnabled: false, 
  defaultBudgetMode: 'personal', 
  telegramBotToken: '',
  telegramChatId: '',
  eventTemplate: '*Событие*\n{{title}}\n{{date}} {{time}}\n{{members}}\n{{duration}}',
  shoppingTemplate: '🛒 *Список покупок:*\n\n{{items}}',
  dayStartHour: 8,
  dayEndHour: 22,
  autoSendEventsToTelegram: false,
  initialBalance: 50000,
  initialBalanceDate: new Date().toISOString().split('T')[0],
  salaryDates: [10, 25],
  mandatoryExpenses: [{ id: 'me1', name: 'Ипотека', amount: 45000, keywords: ['ипотека', 'банк'] }],
  alfaMapping: { date: 'дата', time: 'время', amount: 'сумма', category: 'категория', note: 'описание' }
};

// Robust escaping for Telegram MarkdownV2
const escapeMarkdown = (text: string) => {
  if (!text) return '';
  const specialChars = /[_*[\]()~`>#+\-=|{}.!]/g;
  return String(text).replace(specialChars, '\\$&');
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
    <div className="fixed inset-0 pointer-events-none z-[50] overflow-hidden">
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

const LoginScreen = ({ onLogin, onDemoLogin, loading }: { onLogin: () => void, onDemoLogin: () => void, loading: boolean }) => (
  <div className="fixed inset-0 bg-[#EBEFF5] flex flex-col items-center justify-center p-6 overflow-hidden">
    {/* Animated Background Blobs */}
    <motion.div 
      animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none" 
    />
    <motion.div 
      animate={{ scale: [1, 1.1, 1], rotate: [0, -45, 0] }}
      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-400/20 rounded-full blur-[120px] pointer-events-none" 
    />

    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className="relative z-10 w-full max-w-sm"
    >
      <div className="bg-white/60 backdrop-blur-xl rounded-[3rem] p-10 shadow-2xl border border-white/50 flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-blue-600 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-lg shadow-blue-500/30">
          <Wallet size={48} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-3xl font-black text-[#1C1C1E] mb-3 tracking-tight">Family Budget</h1>
        <p className="text-gray-500 font-bold text-sm mb-10 leading-relaxed">
          Семейные финансы,<br/>которые приятно вести.
        </p>
        
        <div className="w-full space-y-3">
            <button 
              onClick={onLogin} 
              disabled={loading}
              className="w-full bg-[#1C1C1E] text-white font-black py-5 rounded-[2rem] shadow-xl shadow-black/10 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5 rounded-full bg-white p-0.5" alt="Google" />
                  <span>Войти через Google</span>
                </>
              )}
            </button>

            <button 
              onClick={onDemoLogin} 
              className="w-full bg-white text-[#1C1C1E] font-black py-5 rounded-[2rem] shadow-lg border border-gray-100 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <MonitorPlay size={20} className="text-blue-500" />
              <span>Демо режим</span>
            </button>
        </div>
        
        <p className="mt-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Secure & Private
        </p>
      </div>
    </motion.div>
  </div>
);

const DomainErrorScreen = ({ domain }: { domain: string }) => (<div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center z-[1000] relative"><div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-lg shadow-red-500/10 mb-6"><Shield size={40} className="text-red-500" /></div><h1 className="text-2xl font-black text-[#1C1C1E] mb-2">Домен не разрешен</h1><p className="text-gray-500 mb-8 max-w-xs font-medium">Этот домен отсутствует в настройках безопасности вашего проекта Firebase.</p><button onClick={() => window.location.reload()} className="w-full bg-red-500 text-white px-6 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-transform">Готово, обновить страницу</button></div>);

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authErrorDomain, setAuthErrorDomain] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [pendingMember, setPendingMember] = useState<FamilyMember | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Demo Mode State
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'plans' | 'shopping' | 'services'>('overview');
  const [budgetMode, setBudgetMode] = useState<'personal' | 'family'>('personal'); 
  
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
  const [installPrompt, setInstallPrompt] = useState<any>(null);

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
  const prevShoppingRef = useRef<ShoppingItem[]>([]);
  const prevEventsRef = useRef<FamilyEvent[]>([]);
  const isFirstLoad = useRef<{shopping: boolean, events: boolean}>({ shopping: true, events: true });

  const [fabOpen, setFabOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [enlargedWidget, setEnlargedWidget] = useState<string | null>(null);
  const [detailCategory, setDetailCategory] = useState<string | null>(null);
  const [detailSearchQuery, setDetailSearchQuery] = useState<string>('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Year Logic
  const isNewYear = useMemo(() => {
    const now = new Date();
    // Extended date for winter vibe
    const endDate = new Date('2026-02-28'); 
    return now < endDate;
  }, []);

  const themeColor = isNewYear ? 'rose-500' : 'blue-600';
  const themeBg = isNewYear ? 'bg-rose-500' : 'bg-blue-600';
  const themeText = isNewYear ? 'text-rose-500' : 'text-blue-600';

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setAppNotification({ message: "Соединение восстановлено", type: "success" }); };
    const handleOffline = () => { setIsOnline(false); setAppNotification({ message: "Офлайн режим. Данные сохраняются локально.", type: "warning" }); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [activeTab]);
  useEffect(() => { const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); }; window.addEventListener('beforeinstallprompt', handler); return () => window.removeEventListener('beforeinstallprompt', handler); }, []);
  useEffect(() => { const params = new URLSearchParams(window.location.search); const joinId = params.get('join'); if (joinId) setPendingInviteId(joinId); }, []);
  useEffect(() => { getRedirectResult(auth).catch((error) => { if (error.code === 'auth/unauthorized-domain') setAuthErrorDomain(window.location.hostname); }); const unsubscribe = onAuthStateChanged(auth, async (currentUser) => { setUser(currentUser); if (currentUser) { try { const fid = await getOrInitUserFamily(currentUser); setFamilyId(fid); } catch (e) { setFamilyId(currentUser.uid); } } else { setFamilyId(null); } setAuthLoading(false); }); return () => unsubscribe(); }, []);

  useEffect(() => {
    if (!familyId) return;
    
    // DEMO MODE LOADING
    if (isDemoMode) {
        setTransactions(DEMO_TRANSACTIONS_GEN());
        setFamilyMembers(DEMO_MEMBERS);
        familyMembersRef.current = DEMO_MEMBERS;
        setMembersLoaded(true);
        setGoals(DEMO_GOALS);
        setShoppingItems(DEMO_SHOPPING);
        setEvents(DEMO_EVENTS);
        setCategories(INITIAL_CATEGORIES);
        setSettings(DEFAULT_SETTINGS);
        settingsRef.current = DEFAULT_SETTINGS;
        setBudgetMode('personal'); // Explicitly personal as per request
        return;
    }

    // REAL FIREBASE LOADING
    setTransactions([]);
    setMembersLoaded(false); 
    isFirstLoad.current = { shopping: true, events: true };
    prevShoppingRef.current = [];
    prevEventsRef.current = [];

    const unsubTx = subscribeToCollection(familyId, 'transactions', (data) => setTransactions(data as Transaction[]));
    const unsubMembers = subscribeToCollection(familyId, 'members', (data) => { const newMembers = data as FamilyMember[]; setFamilyMembers(newMembers); familyMembersRef.current = newMembers; setMembersLoaded(true); });
    const unsubGoals = subscribeToCollection(familyId, 'goals', (data) => setGoals(data as SavingsGoal[]));
    const unsubShopping = subscribeToCollection(familyId, 'shopping', (data) => { const items = data as ShoppingItem[]; setShoppingItems(items); if (!isFirstLoad.current.shopping && user) { const newItems = items.filter(item => !prevShoppingRef.current.find(prev => prev.id === item.id)); const externalItems = newItems.filter(item => item.userId && item.userId !== user.uid); if (externalItems.length > 0) { const authorName = familyMembersRef.current.find(m => m.userId === externalItems[0].userId)?.name || 'Кто-то'; setAppNotification({ message: `${authorName} добавил(а): ${externalItems[0].title}` }); } } prevShoppingRef.current = items; isFirstLoad.current.shopping = false; });
    const unsubEvents = subscribeToCollection(familyId, 'events', (data) => { const evs = data as FamilyEvent[]; setEvents(evs); if (!isFirstLoad.current.events && user) { const newEvents = evs.filter(e => !prevEventsRef.current.find(prev => prev.id === e.id)); const externalEvents = newEvents.filter(e => e.userId && e.userId !== user.uid); if (externalEvents.length > 0) { const authorName = familyMembersRef.current.find(m => m.userId === externalEvents[0].userId)?.name || 'Кто-то'; setAppNotification({ message: `${authorName} создал(а) событие: ${externalEvents[0].title}` }); } } prevEventsRef.current = evs; isFirstLoad.current.events = false; });
    const unsubCats = subscribeToCollection(familyId, 'categories', (data) => { const dbCats = data as Category[]; if(dbCats.length > 0) { const hasStandard = dbCats.some(c => INITIAL_CATEGORIES.some(ic => ic.id === c.id)); if (!hasStandard) { setCategories([...INITIAL_CATEGORIES, ...dbCats]); } else { setCategories(dbCats); } } else { setCategories(INITIAL_CATEGORIES); } });
    const unsubRules = subscribeToCollection(familyId, 'rules', (data) => setLearnedRules(data as LearnedRule[]));
    const unsubSubs = subscribeToCollection(familyId, 'subscriptions', (data) => setSubscriptions(data as Subscription[]));
    const unsubDebts = subscribeToCollection(familyId, 'debts', (data) => setDebts(data as Debt[]));
    const unsubPantry = subscribeToCollection(familyId, 'pantry', (data) => setPantry(data as PantryItem[]));
    const unsubCards = subscribeToCollection(familyId, 'cards', (data) => setLoyaltyCards(data as LoyaltyCard[]));
    const unsubMeters = subscribeToCollection(familyId, 'meters', (data) => setMeterReadings(data as MeterReading[]));
    const unsubWishlist = subscribeToCollection(familyId, 'wishlist', (data) => setWishlist(data as WishlistItem[]));
    const unsubSettings = subscribeToSettings(familyId, (data) => { 
        const loadedSettings = { ...DEFAULT_SETTINGS, ...data } as AppSettings; 
        if (data.widgets && data.widgets.length > 0) {
            loadedSettings.widgets = data.widgets;
        }
        setSettings(loadedSettings); 
        settingsRef.current = loadedSettings;
    });
    
    // Check if settings require PIN when settings are loaded/changed
    const unsubscribeSettingsCheck = subscribeToSettings(familyId, (data) => {
        if (data && data.isPinEnabled !== undefined) {
            const savedPin = localStorage.getItem('family_budget_pin');
            if (data.isPinEnabled && !savedPin && !isOnboarding) {
                // If remote settings say PIN is ON, but we don't have it locally, prompt creation
                // setPinStatus('create'); // This can be annoying if sync happens unexpectedly, use with caution or user prompt
            }
        }
    });

    return () => { unsubTx(); unsubMembers(); unsubGoals(); unsubShopping(); unsubEvents(); unsubCats(); unsubRules(); unsubSubs(); unsubDebts(); unsubPantry(); unsubCards(); unsubMeters(); unsubSettings(); unsubWishlist(); unsubscribeSettingsCheck(); };
  }, [familyId, user, isDemoMode]);

  useEffect(() => { if (user && familyId && membersLoaded && !isDemoMode) { const me = familyMembers.find(m => m.userId === user.uid || m.id === user.uid); setIsOnboarding(!me); } }, [user, familyId, membersLoaded, familyMembers, isDemoMode]);

  const handleOnboardingStep1 = (name: string, color: string) => { if (!user || !familyId) return; const newMember: FamilyMember = { id: user.uid, userId: user.uid, name, color, isAdmin: familyMembers.length === 0, avatar: user.photoURL || undefined }; setPendingMember(newMember); setIsOnboarding(false); setPinStatus('create'); };
  
  const handlePinCreated = (pin: string) => { 
      localStorage.setItem('family_budget_pin', pin); 
      setPinCode(pin); 
      // Also enable PIN in settings if it's the first time
      updateSettings({ ...settings, isPinEnabled: true });
      
      if (pendingMember && familyId) { 
          addItem(familyId, 'members', pendingMember); 
          setPendingMember(null); 
      } 
      setPinStatus('unlocked'); 
  };
  
  const handleForgotPin = async () => {
      if (window.confirm("Чтобы сбросить код-пароль, необходимо заново войти в аккаунт. Продолжить?")) {
          localStorage.removeItem('family_budget_pin');
          await signOut(auth);
          window.location.reload();
      }
  };
  
  const togglePrivacy = () => { const newMode = !settings.privacyMode; setSettings(prev => ({...prev, privacyMode: newMode})); if (familyId && !isDemoMode) { saveSettings(familyId, {...settings, privacyMode: newMode}); } };
  
  useEffect(() => { 
      const savedPin = localStorage.getItem('family_budget_pin'); 
      setPinCode(savedPin); 
      if (savedPin && !isDemoMode) setPinStatus('locked'); 
      else if (settings.isPinEnabled && !savedPin && !isDemoMode) { setPinStatus('create'); } 
      else setPinStatus('unlocked'); 
  }, [isDemoMode]);

  const createSyncHandler = <T extends { id: string }>(collectionName: string, currentState: T[], setter?: (data: T[]) => void) => { 
      return (newStateOrUpdater: T[] | ((prev: T[]) => T[])) => { 
          // Logic to calculate new state to support both direct array and function updater
          let newState: T[];
          if (typeof newStateOrUpdater === 'function') {
              newState = (newStateOrUpdater as Function)(currentState);
          } else {
              newState = newStateOrUpdater;
          }

          if (isDemoMode) {
              if (setter) setter(newState);
              return;
          }

          if (!familyId) return; 
          const newIds = new Set(newState.map(i => i.id)); 
          currentState.forEach(item => { if (!newIds.has(item.id)) deleteItem(familyId, collectionName, item.id); }); 
          newState.forEach(newItem => { const oldItem = currentState.find(i => i.id === newItem.id); if (!oldItem) { addItem(familyId, collectionName, newItem); } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) { updateItem(familyId, collectionName, newItem.id, newItem); } }); 
      }; 
  };
  
  const handleSendToTelegram = async (event: FamilyEvent): Promise<boolean> => { 
    if (isDemoMode) { setAppNotification({ message: "Отправлено в демо-чат" }); return true; }
    const currentSettings = settingsRef.current;
    if (!currentSettings.telegramBotToken || !currentSettings.telegramChatId) { setAppNotification({ message: "Настройте Telegram", type: 'error' }); return false; }
    
    // Fill empty fields with "не указано"
    const formattedDate = event.date ? event.date.split('-').reverse().join('.') : 'не указано';
    const time = event.time || 'не указано';
    const description = event.description || 'не указано';
    
    const participantNames = (event.memberIds || []).map(id => familyMembersRef.current.find(m => m.id === id)?.name).filter(Boolean);
    const membersText = participantNames.length > 0 ? participantNames.join(', ') : 'не указано';
    
    // Use template or default lines
    const lines = [
        '*Событие*', 
        escapeMarkdown(event.title), 
        `📅 ${escapeMarkdown(formattedDate)} ${escapeMarkdown(time)}`, 
        `👥 ${escapeMarkdown(membersText)}`,
        `📝 ${escapeMarkdown(description)}`
    ];
    
    try { 
      const response = await fetch(`https://api.telegram.org/bot${currentSettings.telegramBotToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: currentSettings.telegramChatId, text: lines.join('\n'), parse_mode: 'MarkdownV2' }) }); 
      if (!response.ok) { setAppNotification({ message: "Ошибка Telegram API", type: 'error' }); return false; }
      return true; 
    } catch (e) { setAppNotification({ message: "Ошибка сети", type: 'error' }); return false; } 
  };

  const handleSendShoppingToTelegram = async (items: ShoppingItem[]): Promise<boolean> => {
    if (isDemoMode) { setAppNotification({ message: "Список отправлен" }); return true; }
    const currentSettings = settingsRef.current;
    if (!currentSettings.telegramBotToken || !currentSettings.telegramChatId) { setAppNotification({ message: "Настройте Telegram", type: "error" }); return false; }
    const listText = items.map(i => `\\- ${escapeMarkdown(i.title)} \\(${escapeMarkdown(i.amount || '')} ${escapeMarkdown(i.unit)}\\)`).join('\n');
    let text = currentSettings.shoppingTemplate || DEFAULT_SETTINGS.shoppingTemplate || ""; text = text.replace(/{{items}}/g, listText);
    try { const res = await fetch(`https://api.telegram.org/bot${currentSettings.telegramBotToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: currentSettings.telegramChatId, text: text, parse_mode: 'MarkdownV2' }) }); if (!res.ok) return false; setAppNotification({ message: "Отправлено!" }); return true; } catch (e) { return false; }
  };

  const handleSaveTransaction = (tx: Omit<Transaction, 'id'>) => { 
      if (isDemoMode) {
          const newTx = { ...tx, id: generateUniqueId(), userId: 'demo_user' };
          if (editingTransaction) {
              setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? { ...newTx, id: editingTransaction.id } : t));
          } else {
              setTransactions(prev => [newTx, ...prev]);
          }
          return;
      }
      if (!familyId) return; 
      if (editingTransaction) updateItem(familyId, 'transactions', editingTransaction.id, tx); 
      else addItem(familyId, 'transactions', { ...tx, id: generateUniqueId(), userId: user?.uid }); 
  };

  const handleConfirmImport = async () => { 
      if (isDemoMode) {
          const itemsToSave = importPreview.map(tx => ({ ...tx, id: generateUniqueId(), userId: 'demo_user' }));
          setTransactions(prev => [...itemsToSave, ...prev]);
          setAppNotification({ message: `Импортировано ${itemsToSave.length}`, type: "success" });
          setIsImportModalOpen(false);
          return;
      }
      if (!familyId || importPreview.length === 0) return; 
      try { setIsImporting(true); const itemsToSave = importPreview.map(tx => ({ ...tx, id: generateUniqueId(), userId: user?.uid })); await addItemsBatch(familyId, 'transactions', itemsToSave); setAppNotification({ message: `Импортировано ${itemsToSave.length}`, type: "success" }); setIsImportModalOpen(false); } catch (e) { setAppNotification({ message: "Ошибка", type: "error" }); } finally { setIsImporting(false); } 
  };

  const handleLearnRule = async (rule: LearnedRule) => { 
      if (isDemoMode) {
          setLearnedRules(prev => [...prev, rule]);
          const matchingTxs = transactions.filter(t => (t.rawNote || t.note || '').toLowerCase().includes(rule.keyword.toLowerCase()));
          if (matchingTxs.length > 0) {
              const updates = matchingTxs.map(t => ({ ...t, category: rule.categoryId, note: rule.cleanName }));
              setTransactions(prev => prev.map(t => updates.find(u => u.id === t.id) || t));
              setAppNotification({ message: `Обновлено ${matchingTxs.length} операций`, type: 'success' });
          }
          return;
      }
      if (!familyId) return; try { await addItem(familyId, 'rules', rule); const matchingTxs = transactions.filter(t => (t.rawNote || t.note || '').toLowerCase().includes(rule.keyword.toLowerCase())); if (matchingTxs.length > 0) { const updates = matchingTxs.map(t => ({ ...t, category: rule.categoryId, note: rule.cleanName })); await addItemsBatch(familyId, 'transactions', updates); setAppNotification({ message: `Обновлено ${matchingTxs.length} операций`, type: 'success' }); } } catch (e) { setAppNotification({ message: "Ошибка", type: 'error' }); } 
  };

  const handleDeleteTransaction = (id: string) => { 
      if (isDemoMode) {
          setTransactions(prev => prev.filter(t => t.id !== id));
          setIsModalOpen(false);
          setEditingTransaction(null);
          return;
      }
      if (!familyId) return; 
      deleteItem(familyId, 'transactions', id); 
      setIsModalOpen(false); 
      setEditingTransaction(null); 
  };

  const handleGoogleLogin = async () => { setAuthErrorDomain(null); try { await signInWithPopup(auth, googleProvider); } catch (error: any) { if (error.code === 'auth/unauthorized-domain') { setAuthErrorDomain(window.location.hostname); return; } try { await signInWithRedirect(auth, googleProvider); } catch (e) {} } };
  
  const handleDemoLogin = () => {
      setIsDemoMode(true);
      setUser({ uid: 'demo_user', displayName: 'Demo User', email: 'demo@example.com' } as FirebaseUser);
      setFamilyId('demo_family');
      setAuthLoading(false);
  };

  const handleLogout = async () => { 
      if (isDemoMode) {
          setIsDemoMode(false);
          setUser(null);
          setFamilyId(null);
          setIsSettingsOpen(false);
      } else {
          await signOut(auth); setUser(null); setFamilyId(null); setIsSettingsOpen(false); 
      }
  };

  const updateSettings = (newSettings: AppSettings) => { 
      setSettings(newSettings); 
      settingsRef.current = newSettings; 
      if (!isDemoMode && familyId) saveSettings(familyId, newSettings); 
  };

  const handleJoinFamily = async (targetId: string) => { 
      if (isDemoMode) { alert("Недоступно в демо-режиме"); return; }
      if (!user) return; try { await joinFamily(user, targetId); setFamilyId(targetId); setIsSettingsOpen(false); setPendingInviteId(null); } catch (e) { console.error(e); } 
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || (!familyId && !isDemoMode)) return; setIsImporting(true); try { const parsed = await parseAlfaStatement(file, settings.alfaMapping, familyId || 'demo', learnedRules, categories, transactions); if (parsed.length > 0) { const withUser = parsed.map(p => ({ ...p, userId: user?.uid })); setImportPreview(withUser); setIsImportModalOpen(true); } else { setAppNotification({ message: "Нет новых операций", type: "warning" }); } } catch (err) { setAppNotification({ message: "Ошибка импорта", type: "error" }); } finally { setIsImporting(false); if (e.target) e.target.value = ''; } };
  
  const handleAddCategory = (cat: Category) => { 
      if (isDemoMode) { setCategories(prev => [...prev, cat]); return; }
      if (familyId) addItem(familyId, 'categories', cat); 
  };

  const handleLinkMandatory = (expenseId: string, keyword: string) => { const expenses = settings.mandatoryExpenses || []; const updatedExpenses = expenses.map(exp => { if (exp.id === expenseId) { const currentKeywords = exp.keywords || []; if (!currentKeywords.includes(keyword)) { return { ...exp, keywords: [...currentKeywords, keyword] }; } } return exp; }); updateSettings({ ...settings, mandatoryExpenses: updatedExpenses }); };

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
      
      // Base transactions (ignoring current date filter, showing all time for category detail)
      let baseTxs = transactions;
      if (budgetMode === 'personal' && user) {
          baseTxs = transactions.filter(t => (t.userId === user.uid) || (t.memberId === user.uid));
      }
      
      return baseTxs.filter(t => t.category === detailCategory);
  }, [transactions, detailCategory, budgetMode, user]);

  const monthTransactions = useMemo(() => {
    let txs = transactions.filter(t => { const tDate = new Date(t.date); return tDate.getMonth() === currentMonth.getMonth() && tDate.getFullYear() === currentMonth.getFullYear(); });
    if (budgetMode === 'personal' && user) { txs = txs.filter(t => (t.userId === user.uid) || (t.memberId === user.uid)); } 
    return txs;
  }, [transactions, currentMonth, budgetMode, user]);

  const totalBalance = useMemo(() => { let txsToCount = transactions; if (budgetMode === 'personal' && user) { txsToCount = transactions.filter(t => (t.userId === user.uid) || (t.memberId === user.uid)); } const startDate = settings.initialBalanceDate ? new Date(settings.initialBalanceDate) : new Date(0); startDate.setHours(0, 0, 0, 0); const txSum = txsToCount.reduce((acc, tx) => { const txDate = new Date(tx.date); if (txDate < startDate) return acc; return tx.type === 'income' ? acc + tx.amount : acc - tx.amount; }, 0); return settings.initialBalance + txSum; }, [transactions, settings.initialBalance, settings.initialBalanceDate, budgetMode, user]);
  const currentMonthExpenses = useMemo(() => { const now = new Date(); return filteredTransactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === now.getMonth()).reduce((acc, t) => acc + t.amount, 0); }, [filteredTransactions]);
  const shoppingPreview = useMemo(() => shoppingItems.filter(i => !i.completed).slice(0, 8), [shoppingItems]);

  const NAV_TABS = [ { id: 'overview', label: 'Обзор', icon: <LayoutGrid size={22} /> }, { id: 'budget', label: 'Бюджет', icon: <Wallet size={22} /> }, { id: 'plans', label: 'Планы', icon: <CalendarDays size={22} /> }, { id: 'shopping', label: 'Покупки', icon: <ShoppingBag size={22} /> }, { id: 'services', label: 'Сервисы', icon: <Grip size={22} /> } ];
  const visibleTabs = NAV_TABS.filter(tab => settings.enabledTabs?.includes(tab.id));

  if (authErrorDomain) return <DomainErrorScreen domain={authErrorDomain} />;
  if (isOnboarding && !isDemoMode) return <OnboardingModal initialName={user?.displayName || ''} onSave={handleOnboardingStep1} />;
  if (pinStatus !== 'unlocked' && !isDemoMode) return <PinScreen mode={pinStatus === 'create' ? 'create' : (pinStatus === 'disable_confirm' ? 'disable' : 'unlock')} onSuccess={(pin) => { if(pinStatus === 'create') handlePinCreated(pin); else if(pinStatus === 'disable_confirm') { localStorage.removeItem('family_budget_pin'); setPinCode(null); setPinStatus('unlocked'); updateSettings({ ...settings, isPinEnabled: false }); } else setPinStatus('unlocked'); }} onCancel={pinStatus === 'disable_confirm' ? () => { setPinStatus('unlocked'); setIsSettingsOpen(true); } : undefined} onForgot={handleForgotPin} savedPin={pinCode || undefined} />;
  if (!user) return <LoginScreen onLogin={handleGoogleLogin} onDemoLogin={handleDemoLogin} loading={authLoading} />;

  return (
    <div className={`min-h-screen pb-44 md:pb-24 max-w-7xl mx-auto px-4 md:px-6 pt-12 text-[#1C1C1E] relative ${isNewYear ? 'bg-gradient-to-b from-[#EBEFF5] to-[#E3E8F0]' : ''}`}>
      {isNewYear && <Snowfall />}
      <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx,.xls,.csv" className="hidden" />
      <AnimatePresence>{appNotification && <NotificationToast notification={appNotification} onClose={() => setAppNotification(null)} />}</AnimatePresence>

      <header className="flex justify-between items-start mb-8 md:mb-10 text-[#1C1C1E] relative z-10">
        <div><div className="flex items-center gap-4 h-10">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#1C1C1E] flex items-center gap-2">
                {isNewYear ? 'С Новым Годом!' : (NAV_TABS.find(t => t.id === activeTab)?.label || 'Обзор')}
                {isNewYear && <Gift className="text-red-500 animate-bounce" />}
            </h1>
            {(activeTab === 'overview' || activeTab === 'budget') && (<div className="flex bg-gray-100/50 p-1 rounded-full relative h-9 items-center border border-gray-100"><button onClick={() => setBudgetMode('personal')} className={`relative z-10 px-3 md:px-4 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${budgetMode === 'personal' ? 'text-black' : 'text-gray-400'}`}>Мой{budgetMode === 'personal' && <motion.div layoutId="budget-toggle" className="absolute inset-0 bg-white rounded-full shadow-sm -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}</button><button onClick={() => setBudgetMode('family')} className={`relative z-10 px-3 md:px-4 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${budgetMode === 'family' ? themeText : 'text-gray-400'}`}>Общий{budgetMode === 'family' && <motion.div layoutId="budget-toggle" className="absolute inset-0 bg-white rounded-full shadow-sm -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}</button></div>)}</div></div>
        <div className="flex gap-2">
            {!isOnline && (<div className="w-11 h-11 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center animate-pulse" title="Нет интернета"><WifiOff size={20} /></div>)}
            {isDemoMode && <div className="px-3 py-2 bg-blue-50 text-blue-600 font-black text-[9px] uppercase tracking-widest rounded-2xl flex items-center">DEMO</div>}
            <button onClick={() => setIsSettingsOpen(true)} className="p-3 md:p-4 bg-white shadow-soft rounded-3xl text-gray-400 border border-white hover:bg-gray-50 transition-colors ios-btn-active"><SettingsIcon size={20} /></button>
        </div>
      </header>

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 w-full">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[115px] md:auto-rows-[135px] w-full">
                {settings.widgets.map(widget => {
                    if (!widget.isVisible) return null;
                    const { id } = widget;
                    const colClass = `col-span-${widget.mobile.colSpan} md:col-span-${widget.desktop.colSpan}`;
                    const rowClass = `row-span-${widget.mobile.rowSpan} md:row-span-${widget.desktop.rowSpan}`;
                    if (id === 'balance') return (<div key={id} className={`${colClass} ${rowClass}`}><SmartHeader balance={totalBalance} savingsRate={savingsRate} settings={settings} onTogglePrivacy={togglePrivacy} className="h-full" /></div>);
                    if (id === 'daily') return (<div key={id} className={`${colClass} ${rowClass}`}><Widget label={budgetMode === 'family' ? "Общий лимит" : "Мой лимит"} value={`${(totalBalance * (1 - savingsRate/100) / 30).toLocaleString('ru-RU', {maximumFractionDigits: 0})} ${settings.currency}`} icon={<TrendingUp size={18}/>} className="h-full" accentColor="green" /></div>);
                    if (id === 'spent') return (<div key={id} className={`${colClass} ${rowClass}`}><Widget label={budgetMode === 'family' ? "Траты семьи" : "Мои траты"} value={`${currentMonthExpenses.toLocaleString('ru-RU')} ${settings.currency}`} icon={<LayoutGrid size={18}/>} className="h-full" accentColor="red" /></div>);
                    if (id === 'charts') return (<div key={id} onClick={() => setEnlargedWidget('charts')} className={`${colClass} ${rowClass} cursor-pointer group relative`}><div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-2 rounded-xl backdrop-blur-md shadow-sm"><Maximize2 size={16} className="text-gray-400" /></div><ChartsSection transactions={filteredTransactions} settings={settings} /></div>);
                    if (id === 'month_chart') return (<div key={id} onClick={() => setEnlargedWidget('month_chart')} className={`${colClass} ${rowClass} cursor-pointer group relative`}><div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-2 rounded-xl backdrop-blur-md shadow-sm"><Maximize2 size={16} className="text-gray-400" /></div><MonthlyAnalyticsWidget transactions={monthTransactions} currentMonth={currentMonth} settings={settings} /></div>);
                    if (id === 'goals') return (<div key={id} className={`${colClass} ${rowClass}`}><GoalsSection goals={goals} settings={settings} onAddGoal={() => { setSelectedGoal(null); setIsGoalModalOpen(true); }} onEditGoal={(goal) => { setSelectedGoal(goal); setIsGoalModalOpen(true); }} className="h-full" /></div>);
                    if (id === 'shopping') return (<div key={id} onClick={() => setActiveTab('shopping')} className={`${colClass} ${rowClass} bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-soft flex flex-col transition-all hover:scale-[1.01] overflow-hidden cursor-pointer`}><div className="flex items-center justify-between mb-3"><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Купить</h3><div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><ShoppingBag size={16}/></div></div><div className="flex flex-wrap gap-1.5 overflow-hidden">{shoppingPreview.length === 0 ? (<div className="flex-1 flex flex-col items-center justify-center text-center text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl"><ShoppingBag size={18} className="mb-1 opacity-50"/><span className="font-bold text-[8px] uppercase tracking-wider">Список пуст</span></div>) : shoppingPreview.map(item => (<div key={item.id} className="px-2.5 py-1.5 flex items-center gap-1.5 bg-gray-50 rounded-xl border border-gray-100/50"><div className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" /><span className="font-bold text-[10px] text-[#1C1C1E] whitespace-nowrap">{item.title}</span></div>))}</div></div>);
                    return null;
                })}
              </div>
              <div className="fixed bottom-32 right-8 z-[100] flex flex-col items-end gap-3 pointer-events-none"><AnimatePresence>{fabOpen && (<><motion.button initial={{opacity:0, y:20, scale:0.8}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, y:20, scale:0.8}} transition={{delay:0.05}} onClick={() => { setFabOpen(false); setIsEventModalOpen(true); setActiveEventToEdit(null); }} className="pointer-events-auto flex items-center gap-3 bg-white p-3 pr-5 rounded-2xl shadow-xl border border-gray-50"><div className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center"><Calendar size={20} /></div><span className="font-black text-sm text-[#1C1C1E]">Событие</span></motion.button><motion.button initial={{opacity:0, y:20, scale:0.8}} animate={{opacity:1, y:0, scale:1}} onClick={() => { setFabOpen(false); setEditingTransaction(null); setIsModalOpen(true); }} className="pointer-events-auto flex items-center gap-3 bg-white p-3 pr-5 rounded-2xl shadow-xl border border-gray-50"><div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center"><CreditCard size={20} /></div><span className="font-black text-sm text-[#1C1C1E]">Операция</span></motion.button></>)}</AnimatePresence><button onClick={() => setFabOpen(!fabOpen)} className={`pointer-events-auto w-16 h-16 rounded-[1.8rem] flex items-center justify-center shadow-lg transition-all duration-300 ${fabOpen ? 'bg-black rotate-45 text-white' : `${themeBg} text-white`}`}><Plus size={32} strokeWidth={3} /></button></div>
              <AnimatePresence>{fabOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setFabOpen(false)} className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[90]" />}</AnimatePresence>
            </motion.div>
          )}
          {activeTab === 'budget' && (
            <motion.div key="budget" className="space-y-6 w-full">
              <section className="flex flex-col gap-6 w-full"><div className="flex justify-between items-center px-1"><h2 className="text-xl font-black text-[#1C1C1E]">{selectedDate ? `Траты за ${selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}` : 'Календарь трат'}</h2><div className="flex gap-2"><button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className={`p-3 bg-white border border-gray-100 ${themeText} rounded-2xl shadow-sm ios-btn-active`}><Plus size={20} /></button><button disabled={isImporting} onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 ${themeText} font-bold text-sm bg-blue-50 px-5 py-2.5 rounded-2xl shadow-sm ios-btn-active ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>{isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {isImporting ? 'Загрузка...' : 'Импорт'}</button></div></div><SpendingCalendar transactions={filteredTransactions} selectedDate={selectedDate} onSelectDate={setSelectedDate} currentMonth={currentMonth} onMonthChange={setCurrentMonth} settings={settings} /></section>
              <section className="w-full">
                  <div 
                      className="flex items-center justify-between mb-5 px-1 cursor-pointer"
                      onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  >
                      <div className="flex items-center gap-2">
                          <h2 className="text-xl font-black text-[#1C1C1E]">
                              {selectedDate ? 'Операции дня' : 'Операции месяца'}
                          </h2>
                          <span className="bg-gray-100 text-gray-400 px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                              {filteredTransactions.length}
                          </span>
                      </div>
                      <div className={`p-2 bg-gray-50 rounded-full transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown size={20} className="text-gray-400" />
                      </div>
                  </div>
                  
                  <AnimatePresence>
                      {isHistoryExpanded && (
                          <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                          >
                              <TransactionHistory transactions={filteredTransactions} setTransactions={setTransactions} settings={settings} members={familyMembers} onLearnRule={handleLearnRule} categories={categories} filterMode={selectedDate ? 'day' : 'month'} onEditTransaction={(tx) => { setEditingTransaction(tx); setIsModalOpen(true); }} />
                          </motion.div>
                      )}
                  </AnimatePresence>
              </section>
              <div className="grid grid-cols-2 gap-2 md:gap-4"><div className="w-full min-w-0"><MandatoryExpensesList expenses={settings.mandatoryExpenses || []} transactions={transactions} settings={settings} currentMonth={currentMonth} /></div><div className="w-full min-w-0"><CategoryProgress transactions={filteredTransactions} settings={settings} categories={categories} /></div></div>
            </motion.div>
          )}
          {activeTab === 'plans' && (<motion.div key="plans" className="w-full"><FamilyPlans events={events} setEvents={createSyncHandler('events', events, setEvents)} settings={settings} members={familyMembers} onSendToTelegram={handleSendToTelegram} /></motion.div>)}
          {activeTab === 'shopping' && (<motion.div key="shopping" className="w-full"><ShoppingList items={shoppingItems} setItems={createSyncHandler('shopping', shoppingItems, setShoppingItems)} settings={settings} members={familyMembers} transactions={transactions} onCompletePurchase={(a,c,n) => handleSaveTransaction({amount:a,category:c,note:n,type:'expense',memberId:user.uid,date:new Date().toISOString()})} onMoveToPantry={(item) => { const newItem: PantryItem = { id: generateUniqueId(), title: item.title, amount: item.amount || '1', unit: item.unit, category: item.category, addedDate: new Date().toISOString() }; if(familyId && !isDemoMode) addItem(familyId, 'pantry', newItem); else if(isDemoMode) setPantry([...pantry, newItem]); }} onSendToTelegram={handleSendShoppingToTelegram} /></motion.div>)}
          {activeTab === 'services' && (<motion.div key="services" className="w-full"><ServicesHub events={events} setEvents={(newEvents) => { const evs = typeof newEvents === 'function' ? newEvents(events) : newEvents; createSyncHandler('events', events, setEvents)(evs); const newItems = evs.filter(e => !events.find(old => old.id === e.id)); newItems.forEach(e => { if (settings.autoSendEventsToTelegram) handleSendToTelegram(e); }); }} settings={settings} members={familyMembers} subscriptions={subscriptions} setSubscriptions={createSyncHandler('subscriptions', subscriptions, setSubscriptions)} debts={debts} setDebts={createSyncHandler('debts', debts, setDebts)} pantry={pantry} setPantry={createSyncHandler('pantry', pantry, setPantry)} transactions={transactions} goals={goals} loyaltyCards={loyaltyCards} setLoyaltyCards={createSyncHandler('cards', loyaltyCards, setLoyaltyCards)} readings={meterReadings} setReadings={createSyncHandler('meters', meterReadings, setMeterReadings)} wishlist={wishlist} setWishlist={createSyncHandler('wishlist', wishlist, setWishlist)} /></motion.div>)}
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
                  {enlargedWidget === 'charts' && <ChartsSection transactions={filteredTransactions} settings={settings} onCategoryClick={(catId) => { setDetailCategory(catId); setDetailSearchQuery(''); setEnlargedWidget(null); }} />}
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
                          <div className="mb-4">
                              <p className="text-xs text-gray-400 font-bold uppercase mb-4 tracking-widest text-center">История операций (все время)</p>
                          </div>
                          <TransactionHistory 
                            transactions={categoryTransactions} 
                            setTransactions={setTransactions} 
                            settings={settings} 
                            members={familyMembers} 
                            onLearnRule={handleLearnRule} 
                            categories={categories} 
                            initialSearch={detailSearchQuery}
                          />
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isModalOpen && <AddTransactionModal onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} onSubmit={handleSaveTransaction} onDelete={handleDeleteTransaction} settings={settings} members={familyMembers} categories={categories} initialTransaction={editingTransaction} onLinkMandatory={handleLinkMandatory} />}
        {isEventModalOpen && <EventModal event={activeEventToEdit} members={familyMembers} onClose={() => { setIsEventModalOpen(false); setActiveEventToEdit(null); }} onSave={(e) => { 
            if(isDemoMode) {
               setEvents(prev => {
                   const exists = prev.find(p => p.id === e.id);
                   return exists ? prev.map(p => p.id === e.id ? e : p) : [...prev, e];
               });
            } else if(familyId) { 
               if(activeEventToEdit) updateItem(familyId, 'events', e.id, e); else addItem(familyId, 'events', e); 
            } 
            if (settings.autoSendEventsToTelegram) handleSendToTelegram(e); 
            setIsEventModalOpen(false); setActiveEventToEdit(null); 
        }} onDelete={(id) => { 
            if(isDemoMode) setEvents(prev => prev.filter(e => e.id !== id));
            else if(familyId) deleteItem(familyId, 'events', id); 
            setIsEventModalOpen(false); setActiveEventToEdit(null); 
        }} onSendToTelegram={handleSendToTelegram} templates={events.filter(e => e.isTemplate)} settings={settings} />}
        {isGoalModalOpen && <GoalModal goal={selectedGoal} onClose={() => { setIsGoalModalOpen(false); setSelectedGoal(null); }} onSave={(g) => { 
            if(isDemoMode) {
               setGoals(prev => {
                   const exists = prev.find(p => p.id === g.id);
                   return exists ? prev.map(p => p.id === g.id ? g : p) : [...prev, g];
               });
            } else if(familyId) { 
               if(selectedGoal) updateItem(familyId, 'goals', g.id, g); else addItem(familyId, 'goals', g); 
            } 
            setIsGoalModalOpen(false); 
        }} onDelete={(id) => { 
            if(isDemoMode) setGoals(prev => prev.filter(g => g.id !== id));
            else if(familyId) deleteItem(familyId, 'goals', id); 
            setIsGoalModalOpen(false); 
        }} settings={settings} />}
        {isSettingsOpen && <SettingsModal settings={settings} onClose={() => setIsSettingsOpen(false)} onUpdate={updateSettings} onReset={() => {}} savingsRate={savingsRate} setSavingsRate={setSavingsRate} members={familyMembers} onUpdateMembers={createSyncHandler('members', familyMembers, setFamilyMembers)} categories={categories} onUpdateCategories={createSyncHandler('categories', categories, setCategories)} learnedRules={learnedRules} onUpdateRules={createSyncHandler('rules', learnedRules, setLearnedRules)} onEnablePin={() => { setIsSettingsOpen(false); setPinStatus('create'); }} onDisablePin={() => { setIsSettingsOpen(false); setPinStatus('disable_confirm'); }} currentFamilyId={familyId} onJoinFamily={handleJoinFamily} onLogout={handleLogout} installPrompt={installPrompt} transactions={transactions} />}
        {isImportModalOpen && <ImportModal preview={importPreview} onConfirm={handleConfirmImport} onCancel={() => setIsImportModalOpen(false)} settings={settings} onUpdateItem={(idx, updates) => { setImportPreview(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item)); }} onLearnRule={handleLearnRule} categories={categories} onAddCategory={handleAddCategory} />}
        {pendingInviteId && pendingInviteId !== familyId && !isDemoMode && (<div className="fixed inset-0 z-[700] flex items-center justify-center p-6"><motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/20 backdrop-blur-md" /><motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="relative bg-white w-full max-sm rounded-[2.5rem] p-8 shadow-2xl text-center space-y-4"><div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-2"><Users size={32} /></div><h3 className="font-black text-xl text-[#1C1C1E]">Приглашение в семью</h3><p className="text-sm font-medium text-gray-500">Вы перешли по ссылке-приглашению. Хотите присоединиться к бюджету этой семьи?</p><div className="font-mono bg-gray-50 p-3 rounded-xl text-xs">{pendingInviteId}</div><div className="flex gap-3 mt-4"><button onClick={() => setPendingInviteId(null)} className="flex-1 py-4 bg-gray-100 rounded-xl font-black uppercase text-xs text-gray-400">Отмена</button><button onClick={() => handleJoinFamily(pendingInviteId)} className="flex-1 py-4 bg-pink-500 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-pink-500/30">Вступить</button></div></motion.div></div>)}
      </AnimatePresence>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, activeColor }: any) => <button onClick={onClick} className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-[1.8rem] transition-all ${active ? `${activeColor} bg-blue-50/50 scale-100 font-black` : 'text-gray-400'}`}>{React.cloneElement(icon, { strokeWidth: active ? 3 : 2 })}<span className="text-[10px] uppercase tracking-widest font-black leading-none">{label}</span></button>;
export default App;
