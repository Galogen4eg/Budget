
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Settings as SettingsIcon, Sparkles, LayoutGrid, Wallet, CalendarDays, ShoppingBag, TrendingUp, Users, Crown, ListChecks, CheckCircle2, Circle, X, CreditCard, Calendar, Target, Loader2, Grip, Zap, MessageCircle, LogIn, Lock, LogOut, Cloud, Shield, AlertTriangle } from 'lucide-react';
import { Transaction, SavingsGoal, AppSettings, ShoppingItem, FamilyEvent, FamilyMember, LearnedRule, Category, Subscription, Debt, PantryItem, MeterReading, LoyaltyCard } from './types';
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
import ServicesHub from './components/ServicesHub';
import PinScreen from './components/PinScreen';
import OnboardingModal from './components/OnboardingModal'; // Import new component
import { parseAlfaStatement } from './utils/alfaParser';

// Firebase Imports
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult, User as FirebaseUser } from 'firebase/auth';
import { subscribeToCollection, subscribeToSettings, addItem, updateItem, deleteItem, saveSettings, syncInitialData, getOrInitUserFamily, joinFamily } from './utils/db';

const DEFAULT_SETTINGS: AppSettings = {
  familyName: 'Семья',
  currency: '₽',
  startOfMonthDay: 1,
  privacyMode: false,
  enabledWidgets: ['balance', 'daily', 'spent', 'goals', 'charts', 'shopping'],
  enabledTabs: ['overview', 'budget', 'plans', 'shopping', 'services'],
  enabledServices: ['wallet', 'subs', 'debts', 'pantry', 'meters', 'chat'],
  isPinEnabled: true, 
  defaultBudgetMode: 'family',
  telegramBotToken: '',
  telegramChatId: '',
  dayStartHour: 8,
  dayEndHour: 22,
  autoSendEventsToTelegram: false,
  initialBalance: 0,
  initialBalanceDate: new Date().toISOString().split('T')[0], // Default to today
  alfaMapping: {
    date: 'дата',
    amount: 'сумма',
    category: 'категория',
    note: 'описание'
  }
};

// --- Firebase Login Component ---
const LoginScreen = ({ onLogin, loading }: { onLogin: () => void, loading: boolean }) => {
  return (
    <div className="min-h-screen bg-[#FBFDFF] flex flex-col items-center justify-center p-6">
      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2.5rem] flex items-center justify-center text-white mb-8 shadow-2xl shadow-blue-500/30">
        <Sparkles size={48} />
      </div>
      <h1 className="text-3xl font-black text-[#1C1C1E] mb-2 text-center tracking-tight">Family Budget</h1>
      <p className="text-gray-400 font-bold mb-12 text-center text-sm max-w-xs">Синхронизация, аналитика и контроль финансов в одном месте.</p>
      
      <button 
        onClick={onLogin}
        disabled={loading}
        className="bg-white text-[#1C1C1E] p-6 rounded-[2rem] border border-gray-100 shadow-xl flex items-center gap-4 hover:scale-[1.02] transition-transform active:scale-95 w-full max-w-xs justify-center relative overflow-hidden"
      >
        {loading ? (
           <Loader2 className="animate-spin text-blue-500" />
        ) : (
           <>
             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="G" />
             <span className="font-black text-lg">Войти через Google</span>
           </>
        )}
      </button>
      
      <p className="mt-12 text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
        <Cloud size={12} /> Powered by Firebase
      </p>
    </div>
  );
};

// --- Domain Error Screen ---
const DomainErrorScreen = ({ domain }: { domain: string }) => (
  <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center z-[1000] relative">
     <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-lg shadow-red-500/10 mb-6">
       <Shield size={40} className="text-red-500" />
     </div>
     <h1 className="text-2xl font-black text-[#1C1C1E] mb-2">Домен не разрешен</h1>
     <p className="text-gray-500 mb-8 max-w-xs font-medium">Этот домен отсутствует в настройках безопасности вашего проекта Firebase.</p>
     
     <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 mb-8 w-full max-w-xs relative overflow-hidden">
       <p className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Текущий домен</p>
       <code className="text-xl font-mono font-bold text-[#1C1C1E] block break-all">{domain}</code>
       <div className="absolute top-0 right-0 p-2 opacity-50"><AlertTriangle size={16} className="text-red-300"/></div>
     </div>

     <div className="space-y-4 w-full max-w-xs">
       <div className="bg-white/50 p-4 rounded-xl border border-red-100/50 text-left">
          <p className="text-xs text-gray-600 leading-relaxed font-medium">
            1. Перейдите в <span className="font-bold">Firebase Console</span><br/>
            2. Откройте <span className="font-bold">Authentication</span> → <span className="font-bold">Settings</span><br/>
            3. Вкладка <span className="font-bold">Authorized Domains</span><br/>
            4. Нажмите <span className="font-bold">Add Domain</span> и вставьте строку выше.
          </p>
       </div>
       
       <button onClick={() => window.location.reload()} className="w-full bg-red-500 text-white px-6 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-transform">
         Готово, обновить страницу
       </button>
     </div>
  </div>
);

const App: React.FC = () => {
  // --- Auth & Firebase State ---
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authErrorDomain, setAuthErrorDomain] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  
  // --- App State ---
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'plans' | 'shopping' | 'services'>('overview');
  const [budgetMode, setBudgetMode] = useState<'personal' | 'family'>('family'); 
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  
  // Start with empty array to avoid flashes of dummy data
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [learnedRules, setLearnedRules] = useState<LearnedRule[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // PIN Logic
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [pinStatus, setPinStatus] = useState<'locked' | 'unlocked' | 'create' | 'disable_confirm'>('unlocked');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [importPreview, setImportPreview] = useState<Omit<Transaction, 'id'>[]>([]);
  const [savingsRate, setSavingsRate] = useState(20);
  
  // Calendar
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // --- CHECK FOR INVITE LINK ON LOAD ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (joinId) {
      setPendingInviteId(joinId);
    }
  }, []);

  // --- FIREBASE AUTH LISTENER ---
  useEffect(() => {
    // Check for redirect result (e.g. returning from Google login)
    getRedirectResult(auth).catch((error) => {
        console.error("Redirect Login Error:", error);
        if (error.code === 'auth/unauthorized-domain') {
            setAuthErrorDomain(window.location.hostname);
        }
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch the user's mapped family ID
        try {
          const fid = await getOrInitUserFamily(currentUser);
          setFamilyId(fid);
        } catch (e) {
          console.error("Error fetching family ID", e);
          // Fallback
          setFamilyId(currentUser.uid);
        }
      } else {
        setFamilyId(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- DATA SYNC (FIRESTORE) ---
  useEffect(() => {
    if (!familyId) return;

    // Clear previous state before sync to avoid flashing old data if switching families
    setTransactions([]);
    setMembersLoaded(false); // Reset loading state
    
    const unsubTx = subscribeToCollection(familyId, 'transactions', (data) => setTransactions(data as Transaction[]));
    const unsubMembers = subscribeToCollection(familyId, 'members', (data) => {
       setFamilyMembers(data as FamilyMember[]);
       setMembersLoaded(true);
    });
    const unsubGoals = subscribeToCollection(familyId, 'goals', (data) => setGoals(data as SavingsGoal[]));
    const unsubShopping = subscribeToCollection(familyId, 'shopping', (data) => setShoppingItems(data as ShoppingItem[]));
    const unsubEvents = subscribeToCollection(familyId, 'events', (data) => setEvents(data as FamilyEvent[]));
    const unsubCats = subscribeToCollection(familyId, 'categories', (data) => { if(data.length > 0) setCategories(data as Category[]); });
    const unsubRules = subscribeToCollection(familyId, 'rules', (data) => setLearnedRules(data as LearnedRule[]));
    
    // Services
    const unsubSubs = subscribeToCollection(familyId, 'subscriptions', (data) => setSubscriptions(data as Subscription[]));
    const unsubDebts = subscribeToCollection(familyId, 'debts', (data) => setDebts(data as Debt[]));
    const unsubPantry = subscribeToCollection(familyId, 'pantry', (data) => setPantry(data as PantryItem[]));
    const unsubMeters = subscribeToCollection(familyId, 'meters', (data) => setMeterReadings(data as MeterReading[]));
    const unsubCards = subscribeToCollection(familyId, 'cards', (data) => setLoyaltyCards(data as LoyaltyCard[]));

    const unsubSettings = subscribeToSettings(familyId, (data) => {
       setSettings({ ...DEFAULT_SETTINGS, ...data });
    });

    return () => {
      unsubTx(); unsubMembers(); unsubGoals(); unsubShopping(); unsubEvents(); unsubCats(); unsubRules();
      unsubSubs(); unsubDebts(); unsubPantry(); unsubMeters(); unsubCards(); unsubSettings();
    };
  }, [familyId]); // Re-run when familyId changes

  // --- ONBOARDING CHECK ---
  useEffect(() => {
    if (user && familyId && membersLoaded) {
      const me = familyMembers.find(m => m.userId === user.uid || m.id === user.uid);
      if (!me) {
        setIsOnboarding(true);
      } else {
        setIsOnboarding(false);
      }
    }
  }, [user, familyId, membersLoaded, familyMembers]);

  const handleOnboardingComplete = (name: string, color: string) => {
    if (!user || !familyId) return;
    
    const newMember: FamilyMember = {
      id: user.uid,
      userId: user.uid,
      name,
      color,
      avatar: user.photoURL || undefined,
      isAdmin: familyMembers.length === 0 // Admin if first
    };
    
    addItem(familyId, 'members', newMember);
    setIsOnboarding(false);
  };

  // --- PIN Logic Initialization ---
  useEffect(() => {
    const savedPin = localStorage.getItem('family_budget_pin');
    setPinCode(savedPin);
    if (savedPin) setPinStatus('locked');
    else if (settings.isPinEnabled && !savedPin) setPinStatus('create');
    else setPinStatus('unlocked');
  }, []);

  // --- GENERIC SYNC HANDLER ---
  const createSyncHandler = <T extends { id: string }>(collectionName: string, currentState: T[]) => {
    return (newStateOrUpdater: T[] | ((prev: T[]) => T[])) => {
      if (!familyId) return;

      let newState: T[];
      if (typeof newStateOrUpdater === 'function') {
         newState = (newStateOrUpdater as Function)(currentState);
      } else {
         newState = newStateOrUpdater;
      }

      // 1. Находим удаленные (есть в текущем, нет в новом)
      const newIds = new Set(newState.map(i => i.id));
      currentState.forEach(item => {
         if (!newIds.has(item.id)) deleteItem(familyId, collectionName, item.id);
      });

      // 2. Находим добавленные и измененные
      newState.forEach(newItem => {
         const oldItem = currentState.find(i => i.id === newItem.id);
         if (!oldItem) {
            addItem(familyId, collectionName, newItem);
         } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
            updateItem(familyId, collectionName, newItem.id, newItem);
         }
      });
    };
  };

  // --- DATA HANDLERS ---
  const handleSaveTransaction = (tx: Omit<Transaction, 'id'>) => {
    if (!familyId) return;
    if (editingTransaction) {
        updateItem(familyId, 'transactions', editingTransaction.id, tx);
    } else {
        addItem(familyId, 'transactions', { ...tx, id: Date.now().toString(), userId: user?.uid });
    }
  };

  const handleDeleteTransaction = (id: string) => {
      if (!familyId) return;
      deleteItem(familyId, 'transactions', id);
      setIsModalOpen(false);
      setEditingTransaction(null);
  };

  const handleGoogleLogin = async () => {
    setAuthErrorDomain(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login Error:", error);

      if (error.code === 'auth/unauthorized-domain') {
        setAuthErrorDomain(window.location.hostname);
        return;
      }

      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        try {
           // Fallback to redirect
           await signInWithRedirect(auth, googleProvider);
        } catch (redirectError: any) {
           console.error("Redirect login failed", redirectError);
           if (redirectError.code === 'auth/unauthorized-domain') {
             setAuthErrorDomain(window.location.hostname);
           } else {
             alert("Не удалось войти. Пожалуйста, разрешите всплывающие окна или используйте другой браузер.");
           }
        }
      } else {
        alert("Ошибка входа: " + (error.message || 'Неизвестная ошибка'));
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setFamilyId(null);
  };

  const updateSettings = (newSettings: AppSettings) => {
    if(!familyId) return;
    setSettings(newSettings);
    saveSettings(familyId, newSettings);
  };

  // --- Join Family Handler ---
  const handleJoinFamily = async (targetId: string) => {
    if (!user) return;
    try {
      await joinFamily(user, targetId);
      setFamilyId(targetId); // Update local state to trigger DB sync switch
      setIsSettingsOpen(false);
      setPendingInviteId(null); // Clear pending invite
      
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('join');
      window.history.replaceState({}, '', url);

      alert("Вы успешно присоединились к семье! Данные обновлены.");
    } catch (e) {
      console.error(e);
      alert("Ошибка при присоединении.");
    }
  };

  const rejectInvite = () => {
    setPendingInviteId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('join');
    window.history.replaceState({}, '', url);
  };

  // ... (File Import Logic remains same)
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !familyId) return;
    setIsImporting(true);
    try {
      const parsed = await parseAlfaStatement(file, settings.alfaMapping, familyId, learnedRules, categories, transactions);
      if (parsed && parsed.length > 0) {
        const withUser = parsed.map(p => ({ ...p, userId: user?.uid }));
        const sorted = [...withUser].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setImportPreview(sorted);
        setIsImportModalOpen(true);
      } else {
        alert("Новых операций не найдено.");
      }
    } catch (err) {
      alert(`Ошибка: ${err instanceof Error ? err.message : "Не удалось прочитать файл"}`);
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  // ... (Filtering logic remains same)
  const filteredTransactions = useMemo(() => {
    let txs = transactions.filter(t => {
      const tDate = new Date(t.date);
      if (selectedDate) {
        return (
          tDate.getDate() === selectedDate.getDate() &&
          tDate.getMonth() === selectedDate.getMonth() &&
          tDate.getFullYear() === selectedDate.getFullYear()
        );
      }
      return (
        tDate.getMonth() === currentMonth.getMonth() &&
        tDate.getFullYear() === currentMonth.getFullYear()
      );
    });
    if (budgetMode === 'personal' && user) {
        txs = txs.filter(t => (t.userId === user.uid) || (t.memberId === user.uid));
    }
    return txs;
  }, [transactions, selectedDate, currentMonth, budgetMode, user]);

  const totalBalance = useMemo(() => {
    let txsToCount = transactions;
    if (budgetMode === 'personal' && user) {
        txsToCount = transactions.filter(t => (t.userId === user.uid) || (t.memberId === user.uid));
    }
    
    // Determine start date for calculation
    const startDate = settings.initialBalanceDate ? new Date(settings.initialBalanceDate) : new Date(0);
    startDate.setHours(0, 0, 0, 0);

    const txSum = txsToCount.reduce((acc, tx) => {
      // Ignore transactions before the initial balance date
      const txDate = new Date(tx.date);
      if (txDate < startDate) return acc;
      return tx.type === 'income' ? acc + tx.amount : acc - tx.amount;
    }, 0);

    return settings.initialBalance + txSum;
  }, [transactions, settings.initialBalance, settings.initialBalanceDate, budgetMode, user]);

  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    return filteredTransactions
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === now.getMonth())
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  const shoppingPreview = useMemo(() => shoppingItems.filter(i => !i.completed).slice(0, 4), [shoppingItems]);

  const NAV_TABS = [
    { id: 'overview', label: 'Обзор', icon: <LayoutGrid size={22} /> },
    { id: 'budget', label: 'Бюджет', icon: <Wallet size={22} /> },
    { id: 'plans', label: 'Планы', icon: <CalendarDays size={22} /> },
    { id: 'shopping', label: 'Покупки', icon: <ShoppingBag size={22} /> },
    { id: 'services', label: 'Сервисы', icon: <Grip size={22} /> },
  ];
  const visibleTabs = NAV_TABS.filter(tab => settings.enabledTabs?.includes(tab.id));

  // --- DOMAIN ERROR SCREEN ---
  if (authErrorDomain) {
    return <DomainErrorScreen domain={authErrorDomain} />;
  }

  // --- PIN SCREEN ---
  if (pinStatus !== 'unlocked') {
    return (
        <PinScreen 
            mode={pinStatus === 'create' ? 'create' : pinStatus === 'disable_confirm' ? 'disable' : 'unlock'} 
            onSuccess={(pin) => {
               if(pinStatus === 'create') { localStorage.setItem('family_budget_pin', pin); setPinCode(pin); setPinStatus('unlocked'); }
               else if(pinStatus === 'disable_confirm') { localStorage.removeItem('family_budget_pin'); setPinCode(null); setPinStatus('unlocked'); }
               else setPinStatus('unlocked');
            }}
            onCancel={pinStatus === 'disable_confirm' ? () => { setPinStatus('unlocked'); setIsSettingsOpen(true); } : undefined}
            savedPin={pinCode || undefined}
        />
    );
  }

  // --- LOGIN ---
  if (!user) {
    return <LoginScreen onLogin={handleGoogleLogin} loading={authLoading} />;
  }

  // --- ONBOARDING ---
  if (isOnboarding) {
    return (
      <OnboardingModal 
        initialName={user.displayName || ''} 
        onSave={handleOnboardingComplete} 
      />
    );
  }

  return (
    <div className="min-h-screen pb-44 md:pb-24 max-w-2xl mx-auto px-6 pt-12 text-[#1C1C1E]">
      <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx,.xls,.csv" className="hidden" />
      
      <header className="flex justify-between items-start mb-10 text-[#1C1C1E]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-yellow-600 fill-yellow-600" />
            <span className="text-sm font-bold text-gray-400">Бюджет {settings.familyName}</span>
          </div>
          <div className="flex items-center gap-3">
             <h1 className="text-4xl font-black tracking-tight text-[#1C1C1E]">
                {NAV_TABS.find(t => t.id === activeTab)?.label || 'Обзор'}
             </h1>
             {(activeTab === 'overview' || activeTab === 'budget') && (
                 <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setBudgetMode('personal')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${budgetMode === 'personal' ? 'bg-white text-[#1C1C1E] shadow-sm' : 'text-gray-400'}`}
                    >
                      Мой
                    </button>
                    <button 
                      onClick={() => setBudgetMode('family')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${budgetMode === 'family' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                    >
                      Общий
                    </button>
                 </div>
             )}
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={handleLogout} className="p-4 bg-gray-100 rounded-3xl text-gray-400 hover:bg-gray-200 transition-colors ios-btn-active">
               <LogOut size={22} />
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-white shadow-soft rounded-3xl text-gray-400 border border-white hover:bg-gray-50 transition-colors ios-btn-active">
               <SettingsIcon size={22} />
            </button>
        </div>
      </header>

      <main>
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              {settings.enabledWidgets.includes('balance') && <SmartHeader balance={totalBalance} savingsRate={savingsRate} settings={settings} />}
              <div className="grid grid-cols-2 gap-5">
                {settings.enabledWidgets.includes('daily') && <Widget label={budgetMode === 'family' ? "Общий лимит" : "Мой лимит"} value={`${(totalBalance * (1 - savingsRate/100) / 30).toLocaleString('ru-RU', {maximumFractionDigits: 0})} ${settings.currency}`} icon={<TrendingUp size={18}/>} />}
                {settings.enabledWidgets.includes('spent') && <Widget label={budgetMode === 'family' ? "Траты семьи" : "Мои траты"} value={`${currentMonthExpenses.toLocaleString('ru-RU')} ${settings.currency}`} icon={<LayoutGrid size={18}/>} />}
              </div>
              {settings.enabledWidgets.includes('charts') && <ChartsSection transactions={filteredTransactions} settings={settings} />}
              {settings.enabledWidgets.includes('goals') && (
                <GoalsSection goals={goals} settings={settings} onAddGoal={() => { setSelectedGoal(null); setIsGoalModalOpen(true); }} onEditGoal={(goal) => { setSelectedGoal(goal); setIsGoalModalOpen(true); }} />
              )}
              {settings.enabledWidgets.includes('shopping') && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                          <h2 className="text-xl font-black text-[#1C1C1E]">Нужно купить</h2>
                          <button onClick={() => setActiveTab('shopping')} className="text-xs font-bold text-blue-500 bg-blue-50 px-3 py-1.5 rounded-xl">Весь список</button>
                    </div>
                    {shoppingPreview.length === 0 ? (
                        <div className="bg-white p-6 rounded-[2rem] border border-white shadow-soft text-center text-gray-400 font-bold text-xs uppercase tracking-widest">Список пуст</div>
                    ) : (
                      <div className="bg-white p-2 rounded-[2.5rem] border border-white shadow-soft">
                          {shoppingPreview.map(item => (
                              <div key={item.id} className="p-4 flex items-center gap-3 border-b border-gray-50 last:border-none">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  <span className="font-bold text-sm text-[#1C1C1E]">{item.title}</span>
                              </div>
                          ))}
                      </div>
                    )}
                </div>
              )}
              <button onClick={() => setIsActionMenuOpen(true)} className="fixed bottom-32 right-8 w-16 h-16 bg-blue-500 text-white rounded-[1.8rem] flex items-center justify-center shadow-[0_15px_30px_rgba(59,130,246,0.3)] z-[100] ios-btn-active"><Plus size={32} strokeWidth={3} /></button>
            </motion.div>
          )}
          {activeTab === 'budget' && (
            <motion.div key="budget" className="space-y-10">
              <section className="flex flex-col gap-6">
                <div className="flex justify-between items-center px-1">
                  <h2 className="text-xl font-black text-[#1C1C1E]">
                    {selectedDate ? `Траты за ${selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}` : 'Календарь трат'}
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => { setIsActionMenuOpen(false); setEditingTransaction(null); setIsModalOpen(true); }} className="p-3 bg-white border border-gray-100 text-blue-500 rounded-2xl shadow-sm ios-btn-active"><Plus size={20} /></button>
                    <button disabled={isImporting} onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 text-blue-500 font-bold text-sm bg-blue-50 px-5 py-2.5 rounded-2xl shadow-sm ios-btn-active ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {isImporting ? 'Загрузка...' : 'Импорт'}
                    </button>
                  </div>
                </div>
                <SpendingCalendar transactions={filteredTransactions} selectedDate={selectedDate} onSelectDate={setSelectedDate} currentMonth={currentMonth} onMonthChange={setCurrentMonth} settings={settings} />
              </section>
              <section>
                <div className="flex items-center gap-2 mb-5 px-1">
                  <h2 className="text-xl font-black text-[#1C1C1E]">{selectedDate ? 'Операции дня' : 'Операции месяца'}</h2>
                  <span className="bg-gray-100 text-gray-400 px-2 py-1 rounded-lg text-[10px] font-black uppercase">{filteredTransactions.length}</span>
                </div>
                <TransactionHistory 
                  transactions={filteredTransactions} 
                  setTransactions={setTransactions} 
                  settings={settings} 
                  members={familyMembers} 
                  onLearnRule={(rule) => { if(familyId) addItem(familyId, 'rules', rule); }} 
                  categories={categories}
                  filterMode={selectedDate ? 'day' : 'month'}
                  onEditTransaction={(tx) => { setEditingTransaction(tx); setIsModalOpen(true); }}
                />
              </section>
              <section>
                <h2 className="text-xl font-black mb-5 px-1 text-[#1C1C1E]">{selectedDate ? 'Категории дня' : 'Категории месяца'}</h2>
                <CategoryProgress transactions={filteredTransactions} settings={settings} categories={categories} />
              </section>
            </motion.div>
          )}
          {activeTab === 'plans' && (
            <motion.div key="plans">
               <FamilyPlans 
                 events={events} 
                 setEvents={createSyncHandler('events', events)} 
                 settings={settings} 
                 members={familyMembers} 
               />
            </motion.div>
          )}
          {activeTab === 'shopping' && (
            <motion.div key="shopping">
               <ShoppingList 
                 items={shoppingItems} 
                 setItems={createSyncHandler('shopping', shoppingItems)} 
                 settings={settings} 
                 members={familyMembers} 
                 transactions={transactions} 
                 onCompletePurchase={(a,c,n) => handleSaveTransaction({amount:a,category:c,note:n,type:'expense',memberId:user.uid,date:new Date().toISOString()})} 
                 onMoveToPantry={(item) => {
                    const newItem: PantryItem = { id: Date.now().toString(), title: item.title, amount: item.amount || '1', unit: item.unit, category: item.category, addedDate: new Date().toISOString() };
                    if(familyId) addItem(familyId, 'pantry', newItem);
                 }}
               />
            </motion.div>
          )}
          {activeTab === 'services' && (
            <motion.div key="services">
               <ServicesHub 
                 events={events} setEvents={createSyncHandler('events', events)}
                 settings={settings} members={familyMembers}
                 subscriptions={subscriptions} setSubscriptions={createSyncHandler('subscriptions', subscriptions)}
                 debts={debts} setDebts={createSyncHandler('debts', debts)}
                 pantry={pantry} setPantry={createSyncHandler('pantry', pantry)}
                 meterReadings={meterReadings} setMeterReadings={createSyncHandler('meters', meterReadings)}
                 transactions={transactions} goals={goals}
                 loyaltyCards={loyaltyCards} setLoyaltyCards={createSyncHandler('cards', loyaltyCards)}
               />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-1.5 shadow-soft z-[100] flex justify-between items-center">
        {visibleTabs.map(tab => (
           <NavButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id as any)} icon={tab.icon} label={tab.label} />
        ))}
      </nav>

      {/* Modals - wired to DB handlers */}
      <AnimatePresence>
        {isModalOpen && <AddTransactionModal onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} onSubmit={handleSaveTransaction} onDelete={handleDeleteTransaction} settings={settings} members={familyMembers} categories={categories} initialTransaction={editingTransaction} />}
        {isEventModalOpen && <EventModal event={null} members={familyMembers} onClose={() => setIsEventModalOpen(false)} onSave={(e) => { if(familyId) addItem(familyId, 'events', e); setIsEventModalOpen(false); }} onSendToTelegram={async () => false} templates={events.filter(e => e.isTemplate)} settings={settings} />}
        {isGoalModalOpen && <GoalModal goal={selectedGoal} onClose={() => { setIsGoalModalOpen(false); setSelectedGoal(null); }} onSave={(g) => { if(familyId) { if(selectedGoal) updateItem(familyId, 'goals', g.id, g); else addItem(familyId, 'goals', g); } setIsGoalModalOpen(false); }} onDelete={(id) => { if(familyId) deleteItem(familyId, 'goals', id); setIsGoalModalOpen(false); }} settings={settings} />}
        {isSettingsOpen && (
          <SettingsModal 
            settings={settings} 
            onClose={() => setIsSettingsOpen(false)} 
            onUpdate={updateSettings} 
            onReset={() => {}} 
            savingsRate={savingsRate} 
            setSavingsRate={setSavingsRate} 
            members={familyMembers} 
            onUpdateMembers={createSyncHandler('members', familyMembers)} 
            categories={categories} 
            onUpdateCategories={createSyncHandler('categories', categories)} 
            learnedRules={learnedRules} 
            onUpdateRules={createSyncHandler('rules', learnedRules)} 
            onEnablePin={() => { setIsSettingsOpen(false); setPinStatus('create'); }} 
            onDisablePin={() => { setIsSettingsOpen(false); setPinStatus('disable_confirm'); }}
            currentFamilyId={familyId}
            onJoinFamily={handleJoinFamily}
          />
        )}
        {isImportModalOpen && <ImportModal preview={importPreview} onConfirm={() => { importPreview.forEach(t => handleSaveTransaction(t)); setIsImportModalOpen(false); }} onCancel={() => setIsImportModalOpen(false)} settings={settings} onUpdateItem={(idx, updates) => { setImportPreview(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item)); }} onLearnRule={(rule) => { if(familyId) addItem(familyId, 'rules', rule); }} categories={categories} />}
        
        {/* Invitation Confirmation Modal */}
        {pendingInviteId && pendingInviteId !== familyId && (
           <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/20 backdrop-blur-md" />
              <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center space-y-4">
                 <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-2"><Users size={32} /></div>
                 <h3 className="font-black text-xl text-[#1C1C1E]">Приглашение в семью</h3>
                 <p className="text-sm font-medium text-gray-500">Вы перешли по ссылке-приглашению. Хотите присоединиться к бюджету этой семьи?</p>
                 <div className="font-mono bg-gray-50 p-3 rounded-xl text-xs">{pendingInviteId}</div>
                 <div className="flex gap-3 mt-4">
                    <button onClick={rejectInvite} className="flex-1 py-4 bg-gray-100 rounded-xl font-black uppercase text-xs text-gray-400">Отмена</button>
                    <button onClick={() => handleJoinFamily(pendingInviteId)} className="flex-1 py-4 bg-pink-500 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-pink-500/30">Вступить</button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => <button onClick={onClick} className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-[1.8rem] transition-all ${active ? 'text-blue-600 bg-blue-50/50 scale-100 font-black' : 'text-gray-400'}`}>{React.cloneElement(icon, { strokeWidth: active ? 3 : 2 })}<span className="text-[10px] uppercase tracking-widest font-black leading-none">{label}</span></button>;
export default App;
