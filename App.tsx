
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Settings as SettingsIcon, Sparkles, LayoutGrid, Wallet, CalendarDays, ShoppingBag, TrendingUp, Users, Crown, ListChecks, CheckCircle2, Circle, X, CreditCard, Calendar, Target, Loader2, Grip, Zap, MessageCircle, LogIn, Lock, LogOut, Cloud, Shield, AlertTriangle, Bug, ArrowRight, Bell, WifiOff, Maximize2, ChevronLeft, Snowflake, Gift, ChevronDown, MonitorPlay, Check, Bot } from 'lucide-react';
import { Transaction, SavingsGoal, AppSettings, ShoppingItem, FamilyEvent, FamilyMember, LearnedRule, Category, Subscription, Debt, PantryItem, LoyaltyCard, WidgetConfig, MeterReading, WishlistItem, MandatoryExpense } from './types';
import { FAMILY_MEMBERS as INITIAL_FAMILY_MEMBERS, INITIAL_CATEGORIES, getIconById } from './constants';
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
import ChartsSection from './components/ChartsSection';
import MonthlyAnalyticsWidget from './components/MonthlyAnalyticsWidget';
import ServicesHub from './components/ServicesHub';
import MandatoryExpensesList from './components/MandatoryExpensesList';
import MandatoryExpenseModal from './components/MandatoryExpenseModal';
import RecentTransactionsWidget from './components/RecentTransactionsWidget';
import NotificationsModal from './components/NotificationsModal';
import PinScreen from './components/PinScreen';
import LoginScreen from './components/LoginScreen';
import { parseAlfaStatement } from './utils/alfaParser';

// Firebase Imports
import { auth, googleProvider } from './firebase';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { subscribeToCollection, subscribeToSettings, addItem, addItemsBatch, updateItem, deleteItem, getOrInitUserFamily, saveSettings, deleteItemsBatch } from './utils/db';

const DEFAULT_WIDGETS: WidgetConfig[] = [
  // Row 1 (Desktop: 2+2=4 cols)
  { id: 'balance', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
  { id: 'goals', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } }, 
  
  // Row 2 (Desktop: 2+2=4 cols)
  { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 2 }, desktop: { colSpan: 2, rowSpan: 2 } },
  { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 2 }, desktop: { colSpan: 2, rowSpan: 2 } },
  
  // Row 3 (Desktop: 2+2=4 cols)
  { id: 'charts', isVisible: true, mobile: { colSpan: 2, rowSpan: 2 }, desktop: { colSpan: 2, rowSpan: 2 } }, 
  { id: 'shopping', isVisible: true, mobile: { colSpan: 2, rowSpan: 2 }, desktop: { colSpan: 2, rowSpan: 2 } }, 
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
  initialBalance: 150000,
  initialBalanceDate: new Date().toISOString().split('T')[0],
  salaryDates: [10, 25],
  mandatoryExpenses: [{ id: 'me1', name: 'Ипотека', amount: 45000, day: 10, remind: true, keywords: ['ипотека', 'банк'] }],
  alfaMapping: { date: 'дата', time: 'время', amount: 'сумма', category: 'категория', note: 'описание' }
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

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'plans' | 'shopping' | 'services'>('overview');
  const [budgetMode, setBudgetMode] = useState<'personal' | 'family'>('personal');
  
  // Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
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
  
  // PIN state
  const [isPinVerified, setIsPinVerified] = useState(false);

  // Navigation State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // UI States
  const [appNotification, setAppNotification] = useState<{message: string, type?: string} | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<Transaction, 'id'>[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeEventToEdit, setActiveEventToEdit] = useState<FamilyEvent | null>(null);
  const [savingsRate, setSavingsRate] = useState(20);
  const [selectedCategoryHistory, setSelectedCategoryHistory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<{catId: string, name: string} | null>(null);
  const [activeTransactionToEdit, setActiveTransactionToEdit] = useState<Transaction | null>(null);
  const [mandatoryExpenseToEdit, setMandatoryExpenseToEdit] = useState<MandatoryExpense | null>(null);
  const [isMandatoryModalOpen, setIsMandatoryModalOpen] = useState(false);
  
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Derived State (Filtered by Budget Mode)
  const filteredTransactions = useMemo(() => {
      if (budgetMode === 'family') return transactions;
      return transactions.filter(t => t.memberId === user?.uid || (isDemoMode && t.memberId === 'papa'));
  }, [transactions, budgetMode, user, isDemoMode]);

  const currentMonthTransactions = useMemo(() => {
      return filteredTransactions.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
      });
  }, [filteredTransactions, currentMonth]);

  const displayedTransactions = useMemo(() => {
      if (selectedDate) {
          return currentMonthTransactions.filter(t => {
              const d = new Date(t.date);
              return d.getDate() === selectedDate.getDate();
          });
      }
      return currentMonthTransactions;
  }, [currentMonthTransactions, selectedDate]);

  const spentThisMonth = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  const currentBalance = useMemo(() => {
      let bal = settings.initialBalance;
      const txSource = filteredTransactions; 
      const totalIncome = txSource.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = txSource.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      return bal + totalIncome - totalExpense;
  }, [filteredTransactions, settings.initialBalance]);

  useEffect(() => { 
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => { 
          setUser(currentUser); 
          if (currentUser) { 
              try { const fid = await getOrInitUserFamily(currentUser); setFamilyId(fid); } 
              catch (e) { setFamilyId(currentUser.uid); } 
          } 
          setAuthLoading(false); 
      }); 
      return () => unsubscribe(); 
  }, []);

  useEffect(() => {
    if (isDemoMode) {
        setSettings(DEFAULT_SETTINGS);
        setFamilyMembers(INITIAL_FAMILY_MEMBERS);
        setCategories(INITIAL_CATEGORIES);
        setGoals([
            { id: '1', title: 'Отпуск', targetAmount: 150000, currentAmount: 45000, icon: 'Plane', color: '#5856D6' },
            { id: '2', title: 'Новый Макбук', targetAmount: 200000, currentAmount: 120000, icon: 'Laptop', color: '#007AFF' }
        ]);
        const demoTransactions: Transaction[] = [];
        const now = new Date();
        const cats = INITIAL_CATEGORIES.map(c => c.id).filter(id => id !== 'income');
        demoTransactions.push({ id: 'inc1', amount: 80000, type: 'income', category: 'salary', memberId: 'papa', note: 'Зарплата', date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString() });
        demoTransactions.push({ id: 'inc2', amount: 65000, type: 'income', category: 'salary', memberId: 'mama', note: 'Аванс', date: new Date(now.getFullYear(), now.getMonth(), 25).toISOString() });
        for (let i = 0; i < 40; i++) {
            const day = Math.floor(Math.random() * now.getDate()) + 1;
            const catId = cats[Math.floor(Math.random() * cats.length)];
            const amount = Math.floor(Math.random() * 5000) + 100;
            demoTransactions.push({
                id: `tx${i}`, amount, type: 'expense', category: catId, memberId: Math.random() > 0.5 ? 'papa' : 'mama', note: 'Покупка', date: new Date(now.getFullYear(), now.getMonth(), day, Math.floor(Math.random()*12)+8, Math.floor(Math.random()*60)).toISOString()
            });
        }
        setTransactions(demoTransactions);
        setEvents([
            { id: 'ev1', title: 'Поход к врачу', description: '', date: new Date().toISOString().split('T')[0], time: '14:00', duration: 1, memberIds: ['mama'], isTemplate: false },
            { id: 'ev2', title: 'Ужин с друзьями', description: '', date: new Date(now.getFullYear(), now.getMonth(), now.getDate()+2).toISOString().split('T')[0], time: '19:00', duration: 3, memberIds: ['papa', 'mama'], isTemplate: false }
        ]);
        setShoppingItems([
            { id: 's1', title: 'Молоко', amount: '1', unit: 'л', category: 'dairy', completed: false, memberId: 'papa', priority: 'medium' },
            { id: 's2', title: 'Хлеб', amount: '1', unit: 'шт', category: 'bakery', completed: false, memberId: 'mama', priority: 'medium' },
            { id: 's3', title: 'Яблоки', amount: '1', unit: 'кг', category: 'produce', completed: true, memberId: 'papa', priority: 'medium' }
        ]);
        return;
    }
    
    if (!familyId) return;
    const unsubEvents = subscribeToCollection(familyId, 'events', (data) => setEvents(data as FamilyEvent[]));
    const unsubTrans = subscribeToCollection(familyId, 'transactions', (data) => setTransactions(data as Transaction[]));
    const unsubCats = subscribeToCollection(familyId, 'categories', (data) => {
        if(data.length > 0) setCategories([...INITIAL_CATEGORIES, ...data as Category[]]); 
    });
    const unsubRules = subscribeToCollection(familyId, 'learnedRules', (data) => setLearnedRules(data as LearnedRule[]));
    const unsubGoals = subscribeToCollection(familyId, 'goals', (data) => setGoals(data as SavingsGoal[]));
    const unsubMembers = subscribeToCollection(familyId, 'members', (data) => {
        if(data.length > 0) setFamilyMembers(data as FamilyMember[]);
        else setFamilyMembers(INITIAL_FAMILY_MEMBERS);
    });
    const unsubShopping = subscribeToCollection(familyId, 'shopping', (data) => setShoppingItems(data as ShoppingItem[]));
    const unsubSettings = subscribeToSettings(familyId, (data) => { 
        if (data) { 
            setSettings({ ...DEFAULT_SETTINGS, ...data }); 
            settingsRef.current = { ...DEFAULT_SETTINGS, ...data }; 
            // Set initial budget mode from settings if available
            if (data.defaultBudgetMode) setBudgetMode(data.defaultBudgetMode);
        }
    });
    
    return () => { 
        unsubEvents(); unsubSettings(); unsubTrans(); unsubCats(); unsubRules(); unsubGoals(); unsubMembers(); unsubShopping();
    };
  }, [familyId, isDemoMode]);

  // ... (handlers like handleSaveEvent, handleSaveTransaction remain unchanged)
  const handleSendToTelegram = async (event: FamilyEvent): Promise<boolean> => { 
      if (isDemoMode) { setAppNotification({ message: "Отправлено в демо-чат" }); return true; } 
      return true; 
  };

  const handleSaveEvent = async (e: FamilyEvent) => {
      try {
          if (isDemoMode) {
             setEvents(prev => {
                 const exists = prev.find(p => p.id === e.id);
                 return exists ? prev.map(p => p.id === e.id ? e : p) : [...prev, e];
             });
          } else {
             if (!familyId) throw new Error("Нет ID семьи. Попробуйте перезагрузить страницу.");
             if (activeEventToEdit) await updateItem(familyId, 'events', e.id, e);
             else await addItem(familyId, 'events', e);
          }
          if (settings.autoSendEventsToTelegram) handleSendToTelegram(e);
          setAppNotification({ message: activeEventToEdit ? "Событие обновлено" : "Событие создано", type: "success" });
          setIsEventModalOpen(false);
          setActiveEventToEdit(null);
      } catch (error: any) {
          console.error("Event Save Error:", error);
          setAppNotification({ message: `Ошибка: ${error.message || 'Не удалось сохранить'}`, type: "error" });
      }
  };

  const handleSaveTransaction = async (tx: Omit<Transaction, 'id'>) => {
      try {
          if (isDemoMode) {
              if (activeTransactionToEdit) {
                  const updated = { ...tx, id: activeTransactionToEdit.id };
                  setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
              } else {
                  const newTx = { ...tx, id: Date.now().toString() };
                  setTransactions(prev => [...prev, newTx]);
              }
          } else {
              if (!familyId) throw new Error("Нет ID семьи");
              if (activeTransactionToEdit) {
                  await updateItem(familyId, 'transactions', activeTransactionToEdit.id, tx);
              } else {
                  await addItem(familyId, 'transactions', tx);
              }
          }
          setAppNotification({ message: activeTransactionToEdit ? "Операция обновлена" : "Операция добавлена", type: "success" });
          setIsTransactionModalOpen(false);
          setActiveTransactionToEdit(null);
      } catch (error: any) {
          console.error("Transaction Save Error:", error);
          setAppNotification({ message: "Ошибка сохранения", type: "error" });
      }
  };

  const handleTransactionDelete = async (id: string) => {
      try {
          if (isDemoMode) {
              setTransactions(prev => prev.filter(t => t.id !== id));
          } else {
              if (!familyId) throw new Error("Нет ID семьи");
              await deleteItem(familyId, 'transactions', id);
          }
          setAppNotification({ message: "Операция удалена", type: "success" });
          setIsTransactionModalOpen(false);
          setActiveTransactionToEdit(null);
      } catch (e) {
          setAppNotification({ message: "Ошибка удаления", type: "error" });
      }
  };

  const handleDeleteTransactionsByPeriod = async (year: number, month: number) => {
      if (isDemoMode) {
          setTransactions(prev => prev.filter(t => {
              const d = new Date(t.date);
              return !(d.getFullYear() === year && d.getMonth() === month);
          }));
      } else if (familyId) {
          const idsToDelete = transactions
              .filter(t => {
                  const d = new Date(t.date);
                  return d.getFullYear() === year && d.getMonth() === month;
              })
              .map(t => t.id);
          if (idsToDelete.length > 0) {
              await deleteItemsBatch(familyId, 'transactions', idsToDelete);
          }
      }
  };

  const handleSaveMandatoryExpense = async (expense: MandatoryExpense) => {
      let updatedExpenses = [...(settings.mandatoryExpenses || [])];
      
      if (mandatoryExpenseToEdit) {
          updatedExpenses = updatedExpenses.map(e => e.id === expense.id ? expense : e);
      } else {
          updatedExpenses.push(expense);
      }
      
      const newSettings = { ...settings, mandatoryExpenses: updatedExpenses };
      setSettings(newSettings);
      
      if (!isDemoMode && familyId) {
          await saveSettings(familyId, newSettings);
      }
      setIsMandatoryModalOpen(false);
      setMandatoryExpenseToEdit(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const defaultMember = user?.uid || 'papa'; 
      const parsed = await parseAlfaStatement(file, settings.alfaMapping, defaultMember, learnedRules, categories, transactions);
      setImportPreview(parsed);
      setIsImportModalOpen(true);
    } catch (err: any) {
      setAppNotification({ message: err.message || "Ошибка импорта", type: "error" });
    }
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
      try {
          if (isDemoMode) {
              const newTxs = importPreview.map(t => ({ ...t, id: Date.now().toString() + Math.random() }));
              setTransactions(prev => [...prev, ...newTxs]);
          } else {
              if (!familyId) throw new Error("Нет ID семьи");
              await addItemsBatch(familyId, 'transactions', importPreview);
          }
          setAppNotification({ message: `Импортировано ${importPreview.length} операций`, type: "success" });
          setIsImportModalOpen(false);
          setImportPreview([]);
      } catch (error: any) {
          setAppNotification({ message: "Ошибка сохранения", type: "error" });
      }
  };

  const handleLearnRule = async (rule: LearnedRule) => {
      if (isDemoMode) {
          setLearnedRules(prev => [...prev, rule]);
      } else if (familyId) {
          await addItem(familyId, 'learnedRules', rule);
      }
  };

  const handleLinkMandatory = async (expenseId: string, keyword: string) => {
      const updatedExpenses = settings.mandatoryExpenses.map(e => {
          if (e.id === expenseId) {
              const currentKeywords = e.keywords || [];
              if (!currentKeywords.includes(keyword)) {
                  return { ...e, keywords: [...currentKeywords, keyword] };
              }
          }
          return e;
      });
      
      const newSettings = { ...settings, mandatoryExpenses: updatedExpenses };
      setSettings(newSettings);
      
      if (!isDemoMode && familyId) {
          await saveSettings(familyId, newSettings);
      }
  };

  const handleUpdateMembers = async (updatedMembers: FamilyMember[]) => {
      setFamilyMembers(updatedMembers);
      if (!isDemoMode && familyId) {
          for (const m of updatedMembers) {
              await updateItem(familyId, 'members', m.id, m).catch(async () => {
                  await addItem(familyId, 'members', m);
              });
          }
      }
  };

  // Widget Map
  const renderWidget = (widgetId: string) => {
      switch(widgetId) {
          case 'month_chart': return <MonthlyAnalyticsWidget transactions={currentMonthTransactions} currentMonth={currentMonth} settings={settings} />;
          case 'recent_transactions': return <RecentTransactionsWidget transactions={filteredTransactions} categories={categories} members={familyMembers} settings={settings} onTransactionClick={(tx) => { setActiveTransactionToEdit(tx); setIsTransactionModalOpen(true); }} onViewAllClick={() => setActiveTab('budget')} />;
          case 'charts': return <ChartsSection transactions={currentMonthTransactions} settings={settings} onCategoryClick={(id) => setSelectedCategoryHistory(id)} />;
          case 'goals': return <GoalsSection goals={goals} settings={settings} onEditGoal={() => {}} onAddGoal={() => {}} />;
          case 'shopping': return <div className="h-full bg-white p-4 rounded-[2.5rem] border border-white shadow-soft"><h3 className="font-black text-sm mb-2">Покупки</h3><div className="space-y-2">{shoppingItems.slice(0,3).map(i => <div key={i.id} className="flex justify-between text-xs font-bold border-b border-gray-50 pb-1"><span>{i.title}</span><span className="text-gray-400">{i.amount}{i.unit}</span></div>)}</div></div>;
          case 'balance': return <div className="h-full bg-white p-6 rounded-[2.5rem] border border-white shadow-soft flex flex-col justify-between"><span className="text-xs font-black uppercase text-gray-400">Баланс</span><div className="text-3xl font-black text-[#1C1C1E]">{currentBalance.toLocaleString()} {settings.currency}</div></div>;
          default: return null;
      }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!user && !isDemoMode) {
      return (
          <LoginScreen 
            onLogin={() => signInWithPopup(auth, googleProvider)} 
            onDemoLogin={() => { setIsDemoMode(true); setUser({ uid: 'demo' } as any); setFamilyId('demo'); }} 
            loading={authLoading} 
          />
      );
  }

  // PIN Protection Check
  if (settings.isPinEnabled && !isPinVerified) {
      return (
          <PinScreen 
            mode="unlock"
            savedPin={settings.pinCode}
            onSuccess={() => setIsPinVerified(true)}
            onForgot={() => {
                if(confirm("Сбросить PIN? Это потребует повторного входа.")) {
                    auth.signOut();
                    window.location.reload();
                }
            }}
          />
      );
  }

  return (
    <div className="min-h-screen bg-[#EBEFF5] pb-32 max-w-7xl mx-auto px-4 pt-6 text-[#1C1C1E]">
      <AnimatePresence>{appNotification && <NotificationToast notification={appNotification} onClose={() => setAppNotification(null)} />}</AnimatePresence>
      
      <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black">Family Budget</h1>
          <div className="flex gap-2">
            <button onClick={() => setIsNotificationsOpen(true)} className="p-2 hover:bg-gray-100 rounded-full transition-colors relative">
                <Bell size={24} strokeWidth={2} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#EBEFF5]"></span>
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><SettingsIcon /></button>
          </div>
      </header>

      <main>
          {activeTab === 'overview' && (
              <div className="space-y-6">
                  <SmartHeader 
                      balance={currentBalance} 
                      spent={spentThisMonth} 
                      savingsRate={savingsRate} 
                      settings={settings}
                      onTogglePrivacy={() => setSettings(s => ({...s, privacyMode: !s.privacyMode}))}
                      budgetMode={budgetMode}
                      onToggleBudgetMode={() => setBudgetMode(budgetMode === 'personal' ? 'family' : 'personal')}
                  />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-auto items-stretch">
                      {settings.widgets.filter(w => w.isVisible).map(widget => (
                          <div 
                            key={widget.id} 
                            className={`col-span-${widget.mobile.colSpan} row-span-${widget.mobile.rowSpan} md:col-span-${widget.desktop.colSpan} md:row-span-${widget.desktop.rowSpan} h-full ${widget.id === 'goals' ? 'order-last md:order-none' : ''}`}
                          >
                              {renderWidget(widget.id)}
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* ... (Rest of tabs remain same: budget, plans, shopping, services) */}
          {activeTab === 'budget' && (
              <div className="space-y-6">
                  <div className="flex gap-3">
                      <button 
                        onClick={() => { setActiveTransactionToEdit(null); setIsTransactionModalOpen(true); }} 
                        className="flex-1 bg-[#1C1C1E] text-white py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                          <Plus size={18} /> Операция
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx,.csv,.xls" />
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex-1 bg-white text-[#1C1C1E] py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-sm border border-gray-100 flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-gray-50"
                      >
                          <Upload size={18} /> Импорт
                      </button>
                  </div>

                  <SpendingCalendar 
                      transactions={currentMonthTransactions} 
                      selectedDate={selectedDate} 
                      onSelectDate={setSelectedDate} 
                      currentMonth={currentMonth} 
                      onMonthChange={setCurrentMonth} 
                      settings={settings}
                  />

                  <MandatoryExpensesList 
                      expenses={settings.mandatoryExpenses} 
                      transactions={currentMonthTransactions} 
                      settings={settings} 
                      currentMonth={currentMonth} 
                      onEdit={(expense) => { setMandatoryExpenseToEdit(expense); setIsMandatoryModalOpen(true); }}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CategoryProgress 
                        transactions={displayedTransactions} 
                        settings={settings} 
                        categories={categories} 
                        onCategoryClick={(catId) => setSelectedCategoryHistory(catId)}
                        onSubCategoryClick={(catId, name) => setSelectedSubCategory({catId, name})}
                      />
                      <TransactionHistory 
                          transactions={displayedTransactions} 
                          setTransactions={setTransactions} 
                          settings={settings} 
                          members={familyMembers} 
                          onLearnRule={handleLearnRule} 
                          categories={categories}
                          onEditTransaction={(tx) => { setActiveTransactionToEdit(tx); setIsTransactionModalOpen(true); }}
                      />
                  </div>
              </div>
          )}

          {activeTab === 'plans' && (
              <FamilyPlans 
                  events={events} 
                  setEvents={setEvents} 
                  settings={settings} 
                  members={familyMembers} 
                  onSendToTelegram={handleSendToTelegram} 
              />
          )}

          {activeTab === 'shopping' && (
              <ShoppingList 
                  items={shoppingItems} 
                  setItems={setShoppingItems} 
                  settings={settings} 
                  members={familyMembers} 
                  onCompletePurchase={() => {}} 
                  initialStoreMode={false}
              />
          )}

          {activeTab === 'services' && (
              <ServicesHub 
                  events={events}
                  setEvents={setEvents}
                  settings={settings}
                  members={familyMembers}
                  subscriptions={subscriptions}
                  setSubscriptions={setSubscriptions}
                  debts={debts}
                  setDebts={setDebts}
                  pantry={pantry}
                  setPantry={setPantry}
                  transactions={transactions}
                  goals={goals}
                  loyaltyCards={loyaltyCards}
                  setLoyaltyCards={setLoyaltyCards}
                  readings={meterReadings}
                  setReadings={setMeterReadings}
                  wishlist={wishlist}
                  setWishlist={setWishlist}
              />
          )}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl p-1.5 rounded-[2.5rem] shadow-2xl flex items-center justify-between z-50 border border-white/50 w-[96%] max-w-[500px]">
          {settings.enabledTabs.includes('overview') && <button onClick={() => setActiveTab('overview')} className={`flex-1 py-4 rounded-[2rem] transition-all duration-300 text-[10px] md:text-xs font-black uppercase tracking-widest ${activeTab === 'overview' ? 'bg-[#1C1C1E] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>Обзор</button>}
          {settings.enabledTabs.includes('budget') && <button onClick={() => setActiveTab('budget')} className={`flex-1 py-4 rounded-[2rem] transition-all duration-300 text-[10px] md:text-xs font-black uppercase tracking-widest ${activeTab === 'budget' ? 'bg-[#1C1C1E] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>Бюджет</button>}
          {settings.enabledTabs.includes('plans') && <button onClick={() => setActiveTab('plans')} className={`flex-1 py-4 rounded-[2rem] transition-all duration-300 text-[10px] md:text-xs font-black uppercase tracking-widest ${activeTab === 'plans' ? 'bg-[#1C1C1E] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>Планы</button>}
          {settings.enabledTabs.includes('shopping') && <button onClick={() => setActiveTab('shopping')} className={`flex-1 py-4 rounded-[2rem] transition-all duration-300 text-[10px] md:text-xs font-black uppercase tracking-widest ${activeTab === 'shopping' ? 'bg-[#1C1C1E] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>Покупки</button>}
          {settings.enabledTabs.includes('services') && <button onClick={() => setActiveTab('services')} className={`flex-1 py-4 rounded-[2rem] transition-all duration-300 text-[10px] md:text-xs font-black uppercase tracking-widest ${activeTab === 'services' ? 'bg-[#1C1C1E] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>Сервисы</button>}
      </nav>

      <AnimatePresence>
        {isEventModalOpen && (
            <EventModal 
                event={activeEventToEdit} 
                members={familyMembers} 
                onClose={() => { setIsEventModalOpen(false); setActiveEventToEdit(null); }} 
                onSave={handleSaveEvent} 
                onDelete={(id) => { if(!isDemoMode && familyId) deleteItem(familyId, 'events', id); setIsEventModalOpen(false); }}
                onSendToTelegram={handleSendToTelegram} 
                templates={events.filter(e => e.isTemplate)} 
                settings={settings} 
            />
        )}
        {isTransactionModalOpen && (
            <AddTransactionModal
                onClose={() => { setIsTransactionModalOpen(false); setActiveTransactionToEdit(null); }}
                onSubmit={handleSaveTransaction}
                onDelete={handleTransactionDelete}
                settings={settings}
                members={familyMembers}
                categories={categories}
                initialTransaction={activeTransactionToEdit}
                onLinkMandatory={handleLinkMandatory}
            />
        )}
        {isImportModalOpen && (
            <ImportModal 
                preview={importPreview}
                onConfirm={handleImportConfirm}
                onCancel={() => { setIsImportModalOpen(false); setImportPreview([]); }}
                settings={settings}
                onUpdateItem={(index, updates) => {
                    const updated = [...importPreview];
                    updated[index] = { ...updated[index], ...updates };
                    setImportPreview(updated);
                }}
                onLearnRule={handleLearnRule}
                categories={categories}
                onAddCategory={(cat) => { if (isDemoMode) setCategories([...categories, cat]); else if (familyId) addItem(familyId, 'categories', cat); }}
            />
        )}
        {isSettingsOpen && (
            <SettingsModal 
                settings={settings} 
                onClose={() => setIsSettingsOpen(false)} 
                onUpdate={(s) => { if(!isDemoMode && familyId) saveSettings(familyId, s); setSettings(s); }} 
                onReset={() => {}} 
                savingsRate={savingsRate} 
                setSavingsRate={setSavingsRate} 
                members={familyMembers} 
                onUpdateMembers={handleUpdateMembers} 
                categories={categories} 
                onUpdateCategories={() => {}} 
                learnedRules={learnedRules} 
                onUpdateRules={() => {}} 
                currentFamilyId={familyId} 
                onJoinFamily={() => {}} 
                onLogout={() => window.location.reload()} 
                transactions={transactions}
                onDeleteTransactionsByPeriod={handleDeleteTransactionsByPeriod}
            />
        )}
        {isMandatoryModalOpen && (
            <MandatoryExpenseModal
                expense={mandatoryExpenseToEdit}
                onClose={() => { setIsMandatoryModalOpen(false); setMandatoryExpenseToEdit(null); }}
                onSave={handleSaveMandatoryExpense}
                onDelete={(id) => {
                    const updated = settings.mandatoryExpenses.filter(e => e.id !== id);
                    const newS = { ...settings, mandatoryExpenses: updated };
                    setSettings(newS);
                    if (!isDemoMode && familyId) saveSettings(familyId, newS);
                    setIsMandatoryModalOpen(false);
                }}
                settings={settings}
            />
        )}
        {isNotificationsOpen && (
            <NotificationsModal
                onClose={() => setIsNotificationsOpen(false)}
            />
        )}
        {(selectedCategoryHistory || selectedSubCategory) && (
            <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSelectedCategoryHistory(null); setSelectedSubCategory(null); }} className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" />
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative bg-[#F2F2F7] w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] h-[90vh]">
                    <div className="bg-white p-6 flex justify-between items-center border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: categories.find(c => c.id === (selectedSubCategory?.catId || selectedCategoryHistory))?.color }}>
                                {getIconById(categories.find(c => c.id === (selectedSubCategory?.catId || selectedCategoryHistory))?.icon || 'MoreHorizontal', 20)}
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black text-[#1C1C1E]">{selectedSubCategory ? selectedSubCategory.name : categories.find(c => c.id === selectedCategoryHistory)?.label || 'Категория'}</h3>
                                {selectedSubCategory && <span className="text-[10px] font-bold text-gray-400 uppercase">История по месту</span>}
                            </div>
                        </div>
                        <button onClick={() => { setSelectedCategoryHistory(null); setSelectedSubCategory(null); }} className="p-3 bg-gray-100 rounded-full text-gray-500"><X size={22}/></button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto no-scrollbar">
                        <TransactionHistory 
                            transactions={displayedTransactions.filter(t => {
                                if (selectedSubCategory) {
                                    return t.category === selectedSubCategory.catId && (t.note === selectedSubCategory.name || t.note.includes(selectedSubCategory.name));
                                }
                                return t.category === selectedCategoryHistory;
                            })}
                            setTransactions={setTransactions}
                            settings={settings}
                            members={familyMembers}
                            onLearnRule={handleLearnRule}
                            categories={categories}
                            filterMode='month'
                            onEditTransaction={(tx) => { setActiveTransactionToEdit(tx); setIsTransactionModalOpen(true); }}
                        />
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};
