
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Settings as SettingsIcon, Sparkles, LayoutGrid, Wallet, CalendarDays, ShoppingBag, TrendingUp, Users, Crown, ListChecks, CheckCircle2, Circle, X, CreditCard, Calendar, Target, Loader2, Grip, Zap, MessageCircle, LogIn, Lock, LogOut, Cloud, Shield, AlertTriangle, Bug, ArrowRight } from 'lucide-react';
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
import OnboardingModal from './components/OnboardingModal';
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
  salaryDates: [10, 25], // Default salary dates
  mandatoryExpenses: [], // Default empty
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
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[#EBEFF5]">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-400/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-400/20 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 bg-white/60 backdrop-blur-2xl border border-white/50 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] w-full max-w-md md:max-w-4xl md:flex overflow-hidden"
      >
        {/* Left Side (Visual) */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 p-12 flex-col justify-between text-white relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
           <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                 <Sparkles size={32} className="text-white" />
              </div>
              <h2 className="text-4xl font-black tracking-tight leading-tight mb-4">Управляйте семейным бюджетом вместе.</h2>
              <p className="text-blue-100 font-medium text-lg leading-relaxed opacity-90">Синхронизация, аналитика и умные советы в одном приложении.</p>
           </div>
           <div className="relative z-10 flex gap-2">
              <div className="w-2 h-2 bg-white rounded-full opacity-100" />
              <div className="w-2 h-2 bg-white rounded-full opacity-50" />
              <div className="w-2 h-2 bg-white rounded-full opacity-50" />
           </div>
        </div>

        {/* Right Side (Action) */}
        <div className="p-10 md:p-14 md:w-1/2 flex flex-col justify-center items-center text-center">
          <div className="md:hidden w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-xl shadow-blue-500/20">
            <Sparkles size={40} />
          </div>
          
          <h1 className="text-3xl font-black text-[#1C1C1E] mb-3 tracking-tight">Family Budget</h1>
          <p className="text-gray-400 font-bold mb-10 text-sm md:text-base">Вход в пространство вашей семьи</p>
          
          <button 
            onClick={onLogin}
            disabled={loading}
            className="group w-full bg-[#1C1C1E] hover:bg-black text-white p-5 rounded-[2rem] shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95 relative overflow-hidden"
          >
            {loading ? (
               <Loader2 className="animate-spin text-white" />
            ) : (
               <>
                 <div className="bg-white p-1.5 rounded-full">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                 </div>
                 <span className="font-bold text-base">Войти через Google</span>
                 <ArrowRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-6 text-gray-400" />
               </>
            )}
          </button>
          
          <p className="mt-12 text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
            <Cloud size={12} /> Powered by Firebase
          </p>
        </div>
      </motion.div>
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
  const [pendingMember, setPendingMember] = useState<FamilyMember | null>(null);
  
  // --- App State ---
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'plans' | 'shopping' | 'services'>('overview');
  const [budgetMode, setBudgetMode] = useState<'personal' | 'family'>('family'); 
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  
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

  // PWA Install Prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [importPreview, setImportPreview] = useState<Omit<Transaction, 'id'>[]>([]);
  const [savingsRate, setSavingsRate] = useState(20);
  
  // FAB Menu
  const [fabOpen, setFabOpen] = useState(false);
  
  // Calendar
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // --- PWA INSTALL LISTENER ---
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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
    getRedirectResult(auth).catch((error) => {
        console.error("Redirect Login Error:", error);
        if (error.code === 'auth/unauthorized-domain') {
            setAuthErrorDomain(window.location.hostname);
        }
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const fid = await getOrInitUserFamily(currentUser);
          setFamilyId(fid);
        } catch (e) {
          console.error("Error fetching family ID", e);
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
    setTransactions([]);
    setMembersLoaded(false); 
    
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
    
    const unsubSubs = subscribeToCollection(familyId, 'subscriptions', (data) => setSubscriptions(data as Subscription[]));
    const unsubDebts = subscribeToCollection(familyId, 'debts', (data) => setDebts(data as Debt[]));
    const unsubPantry = subscribeToCollection(familyId, 'pantry', (data) => setPantry(data as PantryItem[]));
    const unsubMeters = subscribeToCollection(familyId, 'meters', (data) => setMeterReadings(data as MeterReading[]));
    const unsubCards = subscribeToCollection(familyId, 'cards', (data) => setLoyaltyCards(data as LoyaltyCard[]));

    const unsubSettings = subscribeToSettings(familyId, (data) => {
       // Merge to ensure no missing keys if schema updated
       setSettings({ ...DEFAULT_SETTINGS, ...data });
    });

    return () => {
      unsubTx(); unsubMembers(); unsubGoals(); unsubShopping(); unsubEvents(); unsubCats(); unsubRules();
      unsubSubs(); unsubDebts(); unsubPantry(); unsubMeters(); unsubCards(); unsubSettings();
    };
  }, [familyId]); 

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

  const handleOnboardingStep1 = (name: string, color: string) => {
    if (!user || !familyId) return;
    
    // Create member object but don't save yet
    const newMember: FamilyMember = {
      id: user.uid,
      userId: user.uid,
      name,
      color,
      isAdmin: familyMembers.length === 0,
      avatar: user.photoURL || undefined
    };
    
    setPendingMember(newMember);
    setIsOnboarding(false);
    
    // Force PIN creation
    setPinStatus('create');
  };

  const handlePinCreated = (pin: string) => {
      localStorage.setItem('family_budget_pin', pin); 
      setPinCode(pin); 
      
      // If we came from onboarding (pendingMember exists), save the user now
      if (pendingMember && familyId) {
          addItem(familyId, 'members', pendingMember);
          setPendingMember(null);
      }
      
      setPinStatus('unlocked');
  };

  const togglePrivacy = () => {
      const newMode = !settings.privacyMode;
      // Optimistic update for UI responsiveness
      setSettings(prev => ({...prev, privacyMode: newMode}));
      // Persist
      if (familyId) {
          saveSettings(familyId, {...settings, privacyMode: newMode});
      }
  };

  useEffect(() => {
    const savedPin = localStorage.getItem('family_budget_pin');
    setPinCode(savedPin);
    if (savedPin) setPinStatus('locked');
    else if (settings.isPinEnabled && !savedPin) {
        // Only force create here if NOT onboarding (onboarding handles it manually)
        // We check isOnboarding indirectly via familyMembers check usually
        setPinStatus('create'); 
    }
    else setPinStatus('unlocked');
  }, []);

  const createSyncHandler = <T extends { id: string }>(collectionName: string, currentState: T[]) => {
    return (newStateOrUpdater: T[] | ((prev: T[]) => T[])) => {
      if (!familyId) return;
      let newState: T[];
      if (typeof newStateOrUpdater === 'function') {
         newState = (newStateOrUpdater as Function)(currentState);
      } else {
         newState = newStateOrUpdater;
      }
      const newIds = new Set(newState.map(i => i.id));
      currentState.forEach(item => {
         if (!newIds.has(item.id)) deleteItem(familyId, collectionName, item.id);
      });
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

  // --- TELEGRAM LOGIC ---
  const handleSendToTelegram = async (event: FamilyEvent): Promise<boolean> => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
        console.error("Missing Telegram Settings in handleSendToTelegram", settings);
        return false;
    }

    let message = `📅 *${event.title}*\n`;
    message += `🗓 ${new Date(event.date).toLocaleDateString('ru-RU')}\n`;
    message += `⏰ ${event.time}\n`;
    if (event.description) message += `📝 ${event.description}\n`;
    
    // Format reminders for text
    if (event.reminders && event.reminders.length > 0) {
        message += `🔔 Напоминание установлено`;
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: settings.telegramChatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        const data = await response.json();
        if (!data.ok) console.error("Telegram API Error:", data);
        return data.ok;
    } catch (e) {
        console.error("Failed to send telegram message", e);
        return false;
    }
  };

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
           await signInWithRedirect(auth, googleProvider);
        } catch (redirectError: any) {
           if (redirectError.code === 'auth/unauthorized-domain') {
             setAuthErrorDomain(window.location.hostname);
           } else {
             alert("Не удалось войти.");
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
    setIsSettingsOpen(false);
  };

  const updateSettings = (newSettings: AppSettings) => {
    if(!familyId) return;
    setSettings(newSettings);
    saveSettings(familyId, newSettings);
  };

  const handleJoinFamily = async (targetId: string) => {
    if (!user) return;
    try {
      await joinFamily(user, targetId);
      setFamilyId(targetId); 
      setIsSettingsOpen(false);
      setPendingInviteId(null); 
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
    const startDate = settings.initialBalanceDate ? new Date(settings.initialBalanceDate) : new Date(0);
    startDate.setHours(0, 0, 0, 0);
    const txSum = txsToCount.reduce((acc, tx) => {
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

  // --- RENDER ---
  if (authErrorDomain) return <DomainErrorScreen domain={authErrorDomain} />;
  
  if (isOnboarding) return <OnboardingModal initialName={user?.displayName || ''} onSave={handleOnboardingStep1} />;

  if (pinStatus !== 'unlocked') {
    return (
        <PinScreen 
            mode={pinStatus === 'create' ? 'create' : pinStatus === 'disable_confirm' ? 'disable' : 'unlock'} 
            onSuccess={(pin) => {
               if(pinStatus === 'create') { 
                   handlePinCreated(pin);
               }
               else if(pinStatus === 'disable_confirm') { localStorage.removeItem('family_budget_pin'); setPinCode(null); setPinStatus('unlocked'); }
               else setPinStatus('unlocked');
            }}
            onCancel={pinStatus === 'disable_confirm' ? () => { setPinStatus('unlocked'); setIsSettingsOpen(true); } : undefined}
            savedPin={pinCode || undefined}
        />
    );
  }
  if (!user) return <LoginScreen onLogin={handleGoogleLogin} loading={authLoading} />;

  return (
    <div className="min-h-screen pb-44 md:pb-24 max-w-7xl mx-auto px-6 pt-12 text-[#1C1C1E]">
      <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx,.xls,.csv" className="hidden" />
      
      <header className="flex justify-between items-start mb-10 text-[#1C1C1E]">
        <div>
          {/* Family name removed as requested */}
          <div className="flex items-center gap-4 h-10">
             <h1 className="text-4xl font-black tracking-tight text-[#1C1C1E]">
                {NAV_TABS.find(t => t.id === activeTab)?.label || 'Обзор'}
             </h1>
             {(activeTab === 'overview' || activeTab === 'budget') ? (
                 <div className="flex bg-gray-100/50 p-1 rounded-full relative h-9 items-center border border-gray-100">
                    <button 
                      onClick={() => setBudgetMode('personal')} 
                      className={`relative z-10 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${budgetMode === 'personal' ? 'text-black' : 'text-gray-400'}`}
                    >
                      Мой
                      {budgetMode === 'personal' && (
                        <motion.div 
                          layoutId="budget-toggle"
                          className="absolute inset-0 bg-white rounded-full shadow-sm -z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                    <button 
                      onClick={() => setBudgetMode('family')} 
                      className={`relative z-10 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${budgetMode === 'family' ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      Общий
                      {budgetMode === 'family' && (
                        <motion.div 
                          layoutId="budget-toggle"
                          className="absolute inset-0 bg-white rounded-full shadow-sm -z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                 </div>
             ) : (
                 <div className="h-10 w-0" /> // Placeholder to maintain vertical alignment
             )}
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-white shadow-soft rounded-3xl text-gray-400 border border-white hover:bg-gray-50 transition-colors ios-btn-active">
               <SettingsIcon size={22} />
            </button>
        </div>
      </header>

      <main>
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              {/* Dynamic Grid Layout based on User Order */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                {settings.enabledWidgets.map(widgetId => {
                    // 1. Balance Widget (Double Width)
                    if (widgetId === 'balance') {
                        return <SmartHeader key="balance" balance={totalBalance} savingsRate={savingsRate} settings={settings} onTogglePrivacy={togglePrivacy} className="md:col-span-2" />;
                    }
                    
                    // 2. Daily Budget Widget (Single Width)
                    // Note: If SmartHeader is enabled, it contains daily budget visually, so maybe hide standalone unless user really wants it.
                    // But for constructor logic, we render what is enabled.
                    if (widgetId === 'daily' && !settings.enabledWidgets.includes('balance')) {
                        return (
                            <Widget key="daily" className="md:col-span-1" label={budgetMode === 'family' ? "Общий лимит" : "Мой лимит"} value={`${(totalBalance * (1 - savingsRate/100) / 30).toLocaleString('ru-RU', {maximumFractionDigits: 0})} ${settings.currency}`} icon={<TrendingUp size={18}/>} />
                        );
                    }

                    // 3. Spent Widget (Single Width)
                    if (widgetId === 'spent') {
                        return (
                            <Widget key="spent" className="md:col-span-1" label={budgetMode === 'family' ? "Траты семьи" : "Мои траты"} value={`${currentMonthExpenses.toLocaleString('ru-RU')} ${settings.currency}`} icon={<LayoutGrid size={18}/>} />
                        );
                    }

                    // 4. Charts Widget (Single Width)
                    if (widgetId === 'charts') {
                        return <div key="charts" className="md:col-span-1"><ChartsSection transactions={filteredTransactions} settings={settings} /></div>;
                    }

                    // 5. Goals Widget (Single Width)
                    if (widgetId === 'goals') {
                        return (
                            <div key="goals" className="md:col-span-1 h-full">
                                <GoalsSection goals={goals} settings={settings} onAddGoal={() => { setSelectedGoal(null); setIsGoalModalOpen(true); }} onEditGoal={(goal) => { setSelectedGoal(goal); setIsGoalModalOpen(true); }} className="h-full" />
                            </div>
                        );
                    }

                    // 6. Shopping Widget (Single Width)
                    if (widgetId === 'shopping') {
                        return (
                            <div key="shopping" className="md:col-span-1 space-y-0 bg-white p-6 rounded-[2.5rem] border border-white shadow-soft h-full">
                                <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Нужно купить</h3>
                                        <button onClick={() => setActiveTab('shopping')} className="text-[10px] font-bold text-blue-500 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-wider">Все</button>
                                </div>
                                {shoppingPreview.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-center text-gray-300 py-6 border-2 border-dashed border-gray-100 rounded-2xl">
                                        <ShoppingBag size={20} className="mb-2 opacity-50"/>
                                        <span className="font-bold text-[10px] uppercase">Список пуст</span>
                                    </div>
                                ) : (
                                    <div className="grid gap-2">
                                        {shoppingPreview.map(item => (
                                            <div key={item.id} className="p-3 flex items-center gap-3 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                                <span className="font-bold text-xs text-[#1C1C1E] truncate">{item.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    
                    return null;
                })}
              </div>
              
              {/* FAB Menu */}
              <div className="fixed bottom-32 right-8 z-[100] flex flex-col items-end gap-3 pointer-events-none">
                 <AnimatePresence>
                   {fabOpen && (
                     <>
                        <motion.button initial={{opacity:0, y:20, scale:0.8}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, y:20, scale:0.8}} transition={{delay:0.05}} onClick={() => { setFabOpen(false); setIsEventModalOpen(true); }} className="pointer-events-auto flex items-center gap-3 bg-white p-3 pr-5 rounded-2xl shadow-xl border border-gray-50">
                           <div className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center"><Calendar size={20} /></div>
                           <span className="font-black text-sm text-[#1C1C1E]">Событие</span>
                        </motion.button>
                        <motion.button initial={{opacity:0, y:20, scale:0.8}} animate={{opacity:1, y:0, scale:1}} onClick={() => { setFabOpen(false); setEditingTransaction(null); setIsModalOpen(true); }} className="pointer-events-auto flex items-center gap-3 bg-white p-3 pr-5 rounded-2xl shadow-xl border border-gray-50">
                           <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center"><CreditCard size={20} /></div>
                           <span className="font-black text-sm text-[#1C1C1E]">Операция</span>
                        </motion.button>
                     </>
                   )}
                 </AnimatePresence>
                 <button onClick={() => setFabOpen(!fabOpen)} className={`pointer-events-auto w-16 h-16 rounded-[1.8rem] flex items-center justify-center shadow-[0_15px_30px_rgba(59,130,246,0.3)] transition-all duration-300 ${fabOpen ? 'bg-black rotate-45 text-white' : 'bg-blue-500 text-white'}`}>
                    <Plus size={32} strokeWidth={3} />
                 </button>
              </div>
              
              {/* Overlay for FAB */}
              <AnimatePresence>
                 {fabOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setFabOpen(false)} className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[90]" />}
              </AnimatePresence>
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
                    <button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className="p-3 bg-white border border-gray-100 text-blue-500 rounded-2xl shadow-sm ios-btn-active"><Plus size={20} /></button>
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
                 events={events} setEvents={(newEvents) => {
                     const evs = typeof newEvents === 'function' ? newEvents(events) : newEvents;
                     createSyncHandler('events', events)(evs);
                     const newItems = evs.filter(e => !events.find(old => old.id === e.id));
                     newItems.forEach(e => {
                         if (settings.autoSendEventsToTelegram) handleSendToTelegram(e);
                     });
                 }}
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
        
        {isEventModalOpen && (
          <EventModal 
            event={null} 
            members={familyMembers} 
            onClose={() => setIsEventModalOpen(false)} 
            onSave={(e) => { 
                if(familyId) addItem(familyId, 'events', e); 
                if (settings.autoSendEventsToTelegram) handleSendToTelegram(e);
                setIsEventModalOpen(false); 
            }} 
            onSendToTelegram={handleSendToTelegram} 
            templates={events.filter(e => e.isTemplate)} 
            settings={settings} 
          />
        )}

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
            onLogout={handleLogout}
            installPrompt={installPrompt} // Pass prompt
          />
        )}
        {isImportModalOpen && <ImportModal preview={importPreview} onConfirm={() => { importPreview.forEach(t => handleSaveTransaction(t)); setIsImportModalOpen(false); }} onCancel={() => setIsImportModalOpen(false)} settings={settings} onUpdateItem={(idx, updates) => { setImportPreview(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item)); }} onLearnRule={(rule) => { if(familyId) addItem(familyId, 'rules', rule); }} categories={categories} />}
        
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
