
import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Settings as SettingsIcon, Bell, LayoutGrid, ShoppingBag, PieChart, Calendar, AppWindow, Users, User, Settings2, Loader2, Bot, Plus, Users2 } from 'lucide-react';
import { 
  Transaction, ShoppingItem, FamilyMember, PantryItem, MandatoryExpense, Category, LearnedRule, WidgetConfig, AppNotification 
} from './types';
import { Toaster, toast } from 'sonner';

import SmartHeader from './components/SmartHeader';
import MonthlyAnalyticsWidget from './components/MonthlyAnalyticsWidget';
import RecentTransactionsWidget from './components/RecentTransactionsWidget';
import ShoppingList from './components/ShoppingList';
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
import ImportModal from './components/ImportModal';
import FeedbackTool from './components/FeedbackTool';
import ServicesHub from './components/ServicesHub';
import { MemberMarker } from './constants';

const AddTransactionModal = React.lazy(() => import('./components/AddTransactionModal'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const OnboardingModal = React.lazy(() => import('./components/OnboardingModal'));
const PinScreen = React.lazy(() => import('./components/PinScreen'));
const NotificationsModal = React.lazy(() => import('./components/NotificationsModal'));
const GoalModal = React.lazy(() => import('./components/GoalModal'));
const MandatoryExpenseModal = React.lazy(() => import('./components/MandatoryExpenseModal'));
const DrillDownModal = React.lazy(() => import('./components/DrillDownModal'));
const DuplicatesModal = React.lazy(() => import('./components/DuplicatesModal'));
const AIChatModal = React.lazy(() => import('./components/AIChatModal'));

import { parseAlfaStatement } from './utils/alfaParser';
import { auth } from './firebase';
import { 
  addItem, updateItem, deleteItem, 
  addItemsBatch, updateItemsBatch, deleteItemsBatch, joinFamily 
} from './utils/db';

import { useAuth } from './contexts/AuthContext';
import { useData, DEFAULT_SETTINGS } from './contexts/DataContext';

const TAB_CONFIG = [
  { id: 'overview', label: 'Обзор', icon: LayoutGrid },
  { id: 'budget', label: 'Бюджет', icon: PieChart },
  { id: 'plans', label: 'Планы', icon: Calendar },
  { id: 'shopping', label: 'Покупки', icon: ShoppingBag },
  { id: 'services', label: 'Сервисы', icon: AppWindow },
];

const DEFAULT_WIDGET_CONFIGS: WidgetConfig[] = [
    { id: 'balance', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } }, 
    { id: 'category_analysis', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'shopping', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'wallet', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'goals', isVisible: false, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
];

const pageVariants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: -10, scale: 0.98 }
};

export default function App() {
  const { user, familyId, loading: isAuthLoading, logout } = useAuth();
  const { 
    transactions, setTransactions,
    shoppingItems, setShoppingItems,
    loyaltyCards,
    setPantry,
    events, setEvents,
    goals, setGoals,
    members,
    categories, setCategories,
    settings, updateSettings, 
    setLearnedRules,
    filteredTransactions,
    totalBalance,
    currentMonthSpent,
    savingsRate, setSavingsRate,
    budgetMode, setBudgetMode,
    notifications
  } = useData();

  const [activeTab, setActiveTab] = useState('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isMandatoryModalOpen, setIsMandatoryModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<Transaction, 'id'>[] | null>(null);
  const [isImporting, setIsImporting] = useState(false); 
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [pinMode, setPinMode] = useState<'unlock' | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drillDownState, setDrillDownState] = useState<{categoryId: string, merchantName?: string} | null>(null);
  const [memberFilter, setMemberFilter] = useState<string | 'all'>('all');
  
  const mainRef = useRef<HTMLDivElement>(null);

  // Scroll to top when tab changes
  useEffect(() => {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Filter transactions for Budget tab widgets
  const budgetTransactions = useMemo(() => {
      let txs = filteredTransactions;
      if (memberFilter !== 'all') txs = txs.filter(t => t.memberId === memberFilter);
      return txs;
  }, [filteredTransactions, memberFilter]);

  // Filter Mandatory Expenses based on Budget Mode
  const filteredMandatoryExpenses = useMemo(() => {
      const allExpenses = settings.mandatoryExpenses || [];
      if (budgetMode === 'family') {
          return allExpenses;
      } else {
          // Personal mode: show only expenses assigned to current user
          const myMemberId = members.find(m => m.userId === user?.uid)?.id;
          if (!myMemberId) return []; // Safety: if member not found, return empty instead of exposing all
          return allExpenses.filter(e => e.memberId === myMemberId);
      }
  }, [settings.mandatoryExpenses, budgetMode, members, user?.uid]);

  useEffect(() => {
    if (user?.uid && (!settings.widgets || settings.widgets.length === 0)) {
        const updatedSettings = { ...settings, widgets: DEFAULT_WIDGET_CONFIGS };
        updateSettings(updatedSettings);
    }
  }, [user?.uid]);

  useEffect(() => {
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const handleTransactionSubmit = async (tx: Omit<Transaction, 'id'>) => {
    if (selectedTx) {
      if (familyId) await updateItem(familyId, 'transactions', selectedTx.id, tx);
      setSelectedTx(null);
    } else {
      if (familyId) await addItem(familyId, 'transactions', tx);
    }
  };

  const handleEditTransaction = (tx: Transaction) => { setSelectedTx(tx); setIsAddModalOpen(true); };

  const handleResetSettings = async () => {
    if (window.confirm("Вы уверены, что хотите сбросить настройки? Это вернет все параметры к значениям по умолчанию.")) {
      await updateSettings(DEFAULT_SETTINGS);
      toast.success("Настройки сброшены");
    }
  };

  const handleDeleteEvent = async (id: string) => {
      setEvents(prev => prev.filter(ev => ev.id !== id));
      if (familyId) {
        await deleteItem(familyId, 'events', id);
      }
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
        const data = await parseAlfaStatement(file, settings.alfaMapping, members[0].id, [], categories, transactions);
        setImportPreview(data);
    } catch (err: any) { toast.error(err.message || "Ошибка чтения"); }
    finally { setIsImporting(false); }
  };

  const handleMoveToPantry = async (item: ShoppingItem) => {
      const pantryItem: PantryItem = { id: Date.now().toString(), title: item.title, amount: item.amount || '1', unit: item.unit, category: item.category, addedDate: new Date().toISOString() };
      setShoppingItems(prev => prev.filter(i => i.id !== item.id));
      await setPantry(prev => [...prev, pantryItem]);
      if (familyId) await deleteItem(familyId, 'shopping', item.id);
  };

  const handleSendShoppingToTelegram = async (items: ShoppingItem[]) => {
      const activeItems = items.filter(i => !i.completed);
      if (activeItems.length === 0) {
          toast.info('Нет активных покупок');
          return false;
      }

      // Format message
      const dateStr = new Date().toLocaleDateString('ru-RU');
      let text = settings.shoppingTemplate || `🛒 *Список покупок* ({date})\n\n{items}`;
      
      const itemsList = activeItems.map(i => `• ${i.title}${i.amount ? ` (${i.amount} ${i.unit})` : ''}`).join('\n');
      
      text = text.replace('{date}', dateStr)
                 .replace('{items}', itemsList)
                 .replace('{total}', activeItems.length.toString());

      // 1. Try Telegram Bot API if configured
      if (settings.telegramBotToken && settings.telegramChatId) {
          const loadingToast = toast.loading('Отправка в Telegram...');
          try {
              const response = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      chat_id: settings.telegramChatId,
                      text: text,
                      parse_mode: 'Markdown'
                  })
              });
              
              if (response.ok) {
                  toast.success('Отправлено в Telegram!', { id: loadingToast });
                  return true;
              } else {
                  throw new Error('Ошибка API Telegram');
              }
          } catch (e) {
              console.error(e);
              toast.dismiss(loadingToast);
              // Fallthrough to native share
          }
      }

      // 2. Native Share API (Mobile)
      if (navigator.share) {
          try {
              await navigator.share({ title: 'Список покупок', text: text });
              return true;
          } catch (e) {
              // User cancelled or error
          }
      }

      // 3. Fallback to Clipboard
      try {
          await navigator.clipboard.writeText(text);
          toast.success('Список скопирован! (Telegram не настроен)');
          return true;
      } catch (e) {
          toast.error('Не удалось отправить или скопировать');
          return false;
      }
  };

  const handleDeleteTransactionsByPeriod = async (startDate: string, endDate: string) => {
      if (!startDate || !endDate) return;
      const start = new Date(startDate);
      start.setHours(0,0,0,0);
      const end = new Date(endDate);
      end.setHours(23,59,59,999);
      
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

      if (!window.confirm(`Удалить ${toDelete.length} операций? Это действие нельзя отменить.`)) return;

      const ids = toDelete.map(t => t.id);
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      if (familyId) await deleteItemsBatch(familyId, 'transactions', ids);
      toast.success("Операции удалены");
  };

  const handleBatchDelete = async (ids: string[]) => {
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      if (familyId) await deleteItemsBatch(familyId, 'transactions', ids);
      toast.success(`Удалено ${ids.length} записей`);
  };

  const handleGoalSave = async (goal: any) => {
      if (editingGoal) {
          setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
          if (familyId) await updateItem(familyId, 'goals', goal.id, goal);
      } else {
          setGoals(prev => [...prev, goal]);
          if (familyId) await addItem(familyId, 'goals', goal);
      }
      setIsGoalModalOpen(false);
      setEditingGoal(null);
  };

  const handleGoalDelete = async (id: string) => {
      if (confirm('Удалить цель?')) {
          setGoals(prev => prev.filter(g => g.id !== id));
          if (familyId) await deleteItem(familyId, 'goals', id);
          setIsGoalModalOpen(false);
          setEditingGoal(null);
      }
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
              return <SmartHeader balance={totalBalance} spent={currentMonthSpent} savingsRate={savingsRate} settings={settings} budgetMode={budgetMode} transactions={filteredTransactions} onToggleBudgetMode={() => setBudgetMode(prev => prev === 'family' ? 'personal' : 'family')} onTogglePrivacy={() => updateSettings({ ...settings, privacyMode: !settings.privacyMode })} className="shrink-0" />;
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
                  <div className="flex-shrink-0 h-auto">
                      <WalletWidget cards={loyaltyCards} onClick={() => setActiveTab('services')} />
                  </div>
              );
          case 'recent_transactions':
              return (
                  <div className="flex-shrink-0 h-auto">
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
                      <CategoryAnalysisWidget transactions={filteredTransactions} categories={categories} settings={settings} onClick={() => setActiveTab('budget')} />
                  </div>
              );
          default:
              return null;
      }
  };

  if (isAuthLoading) return <div className="flex h-screen items-center justify-center bg-[#EBEFF5] dark:bg-black"><Loader2 className="animate-spin text-blue-500" size={32}/></div>;
  if (!user) return <LoginScreen />;
  if (pinMode === 'unlock') return <Suspense fallback={null}><PinScreen mode="unlock" savedPin={settings.pinCode} onSuccess={() => setPinMode(null)} onForgot={() => logout()} /></Suspense>;

  return (
    <div className="h-[100dvh] w-full bg-[#EBEFF5] dark:bg-black text-[#1C1C1E] dark:text-white flex flex-col md:flex-row font-sans overflow-hidden">
      <Toaster position="top-center" richColors theme={settings.theme === 'dark' ? 'dark' : 'light'} />
      <FeedbackTool />

      <div className="md:hidden sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b dark:border-white/5 px-4 py-3 pt-safe flex justify-between items-center shrink-0">
         <div className="text-xl font-black tracking-tighter">FB.</div>
         <div className="flex gap-2">
             <button onClick={() => setIsAIChatOpen(true)} className="p-2 bg-gray-50 dark:bg-[#1C1C1E] rounded-full active:scale-90 transition-transform"><Bot size={20} /></button>
             <button onClick={() => setShowNotifications(true)} className="relative p-2 bg-gray-50 dark:bg-[#1C1C1E] rounded-full active:scale-90 transition-transform"><Bell size={20} />{unreadNotificationsCount > 0 && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-black"/>}</button>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-gray-50 dark:bg-[#1C1C1E] rounded-full active:scale-90 transition-transform"><SettingsIcon size={20} /></button>
         </div>
      </div>

      <main ref={mainRef} className="flex-1 h-full p-4 md:p-8 pb-32 md:pb-8 relative md:ml-28 overflow-y-auto no-scrollbar md:overflow-hidden">
        <div className="w-full flex flex-col gap-4 h-auto lg:h-full">
            <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
                <motion.div key="overview" initial="initial" animate="in" exit="out" variants={pageVariants} className="flex flex-col gap-4 h-auto lg:h-full">
                    
                    {/* Mobile Layout: Dynamic List based on Settings Order */}
                    <div className="flex flex-col gap-4 lg:hidden">
                        {(settings.widgets || DEFAULT_WIDGET_CONFIGS)
                            .filter(w => w.isVisible)
                            .map(widget => (
                                <div key={widget.id}>
                                    {renderWidget(widget.id)}
                                </div>
                            ))
                        }
                    </div>

                    {/* Desktop Layout: Fixed Grid (As original) */}
                    <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-full lg:min-h-0">
                        {/* Left Column: Header + Chart (2/3 width) */}
                        <div className="lg:col-span-2 flex flex-col gap-4 h-auto lg:h-full lg:min-h-0">
                            {/* Header Widget */}
                            {isWidgetVisible('balance') && renderWidget('balance')}
                            
                            {/* Chart fills remaining space */}
                            {isWidgetVisible('month_chart') && renderWidget('month_chart')}
                        </div>
                        
                        {/* Right Column: Stack (1/3 width) */}
                        <div className="flex flex-col gap-4 h-auto lg:h-full lg:min-h-0 lg:overflow-hidden">
                            {/* 1. Shopping (Shrink to fit content) */}
                            {isWidgetVisible('shopping') && renderWidget('shopping')}

                            {/* Wallet Widget */}
                            {isWidgetVisible('wallet') && renderWidget('wallet')}
                            
                            {/* 2. History (Shrink to fit 5 items) */}
                            {isWidgetVisible('recent_transactions') && renderWidget('recent_transactions')}

                            {/* 3. Goals (Optional) */}
                            {isWidgetVisible('goals') && renderWidget('goals')}

                            {/* 4. Categories (Fills remaining space) */}
                            {isWidgetVisible('category_analysis') && renderWidget('category_analysis')}
                        </div>
                    </div>
                </motion.div>
            )}
            
            {activeTab === 'budget' && (
                <motion.div key="budget" initial="initial" animate="in" exit="out" variants={pageVariants} className="flex flex-col gap-6 h-full overflow-y-auto no-scrollbar">
                    <div className="space-y-4">
                        <h1 className="text-3xl font-black">Бюджет</h1>
                        <div className="flex gap-3">
                            <button className="flex-1 bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] font-black text-xs uppercase shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2" onClick={() => setIsAddModalOpen(true)}><Plus size={20} /> Добавить</button>
                            <button className="flex-1 bg-gray-100 dark:bg-[#1C1C1E] text-gray-500 p-5 rounded-[2rem] font-black text-xs uppercase flex items-center justify-center gap-2" onClick={() => document.getElementById('import-input')?.click()} disabled={isImporting}>{isImporting ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18} />} Импорт</button>
                            <input id="import-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); }} />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 w-[calc(100%+2rem)]">
                            <button onClick={() => setMemberFilter('all')} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 shrink-0 ${memberFilter === 'all' ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-black border-transparent' : 'bg-white dark:bg-[#1C1C1E] text-gray-400 border-white dark:border-white/5'}`}><Users2 size={14} /> Все</button>
                            {members.map(m => (<button key={m.id} onClick={() => setMemberFilter(m.id)} className={`flex items-center gap-2 px-3 py-1.5 pr-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 shrink-0 ${memberFilter === m.id ? 'bg-white dark:bg-[#2C2C2E] border-blue-500 text-blue-500 shadow-md scale-105' : 'bg-white/50 dark:bg-[#1C1C1E]/50 text-gray-400 border-white/50 dark:border-white/5 grayscale opacity-60'}`}><MemberMarker member={m} size="sm" /> {m.name}</button>))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                        <div className="flex flex-col gap-6">
                            <SpendingCalendar transactions={budgetTransactions} selectedDate={selectedDate} onSelectDate={setSelectedDate} currentMonth={currentMonth} onMonthChange={setCurrentMonth} settings={settings} />
                            <CategoryProgress transactions={budgetTransactions} categories={categories} settings={settings} currentMonth={currentMonth} selectedDate={selectedDate} onCategoryClick={(id) => setDrillDownState({categoryId: id})} />
                        </div>
                        {/* Pass filtered expenses here */}
                        <div className="h-full"><MandatoryExpensesList expenses={filteredMandatoryExpenses} transactions={budgetTransactions} settings={settings} currentMonth={currentMonth} onEdit={(e) => { setSelectedTx(null); setIsMandatoryModalOpen(true); }} onAdd={() => setIsMandatoryModalOpen(true)} /></div>
                        <div className="h-full"><TransactionHistory transactions={budgetTransactions} setTransactions={setTransactions} settings={settings} members={members} categories={categories} currentMonth={currentMonth} selectedDate={selectedDate} filterMode={selectedDate ? 'day' : 'month'} onEditTransaction={handleEditTransaction} onLearnRule={() => {}} /></div>
                    </div>
                </motion.div>
            )}
            
            {activeTab === 'plans' && <motion.div key="plans" initial="initial" animate="in" exit="out" variants={pageVariants} className="h-full overflow-y-auto no-scrollbar"><FamilyPlans events={events} setEvents={setEvents} settings={settings} members={members} onSendToTelegram={async () => true} onDeleteEvent={handleDeleteEvent} /></motion.div>}
            {activeTab === 'shopping' && <motion.div key="shopping" initial="initial" animate="in" exit="out" variants={pageVariants} className="h-full overflow-y-auto no-scrollbar"><ShoppingList items={shoppingItems} setItems={setShoppingItems} settings={settings} members={members} onMoveToPantry={handleMoveToPantry} onSendToTelegram={handleSendShoppingToTelegram} /></motion.div>}
            {activeTab === 'services' && <motion.div key="services" initial="initial" animate="in" exit="out" variants={pageVariants} className="h-full overflow-y-auto no-scrollbar"><ServicesHub /></motion.div>}
            </AnimatePresence>
        </div>
      </main>

      <nav className="fixed bottom-6 left-4 right-4 md:left-0 md:right-auto md:top-0 md:bottom-0 md:w-28 md:h-screen md:bg-white dark:md:bg-[#1C1C1E] md:border-r dark:border-white/5 bg-[#1C1C1E]/95 dark:bg-[#2C2C2E]/95 backdrop-blur-xl rounded-[2.5rem] md:rounded-none shadow-2xl p-2 flex md:flex-col justify-between items-center z-50">
         <div className="hidden md:flex flex-col items-center justify-center h-24 shrink-0 text-2xl font-black">FB.</div>
         <div className="flex md:flex-col w-full justify-around md:justify-start md:items-center md:gap-4 md:flex-1 md:pt-4 overflow-y-auto no-scrollbar">
             {TAB_CONFIG.map(tab => {
                 const isActive = activeTab === tab.id;
                 return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="relative flex flex-col items-center justify-center w-12 h-12 md:w-20 md:h-auto md:py-4 group">
                        {isActive && <motion.div layoutId="nav-pill" className="absolute inset-0 bg-white/20 md:bg-blue-50 dark:md:bg-white/5 rounded-full md:rounded-2xl z-0" />}
                        <span className={`relative z-10 ${isActive ? 'text-white md:text-blue-600' : 'text-gray-400'}`}>{React.createElement(tab.icon, { size: 24, strokeWidth: isActive ? 2.5 : 2 })}</span>
                        <span className={`hidden md:block text-[10px] font-black mt-2 relative z-10 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{tab.label}</span>
                    </button>
                 )
             })}
         </div>
         <div className="hidden md:flex flex-col gap-4 mb-8 w-full items-center shrink-0">
             <button onClick={() => setIsAIChatOpen(true)} className="text-gray-400 hover:text-blue-500 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all"><Bot size={24} /></button>
             <button onClick={() => setShowNotifications(true)} className="text-gray-400 hover:text-blue-500 relative p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all"><Bell size={24}/>{unreadNotificationsCount > 0 && <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1C1C1E]"/>}</button>
             <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-blue-500 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all"><SettingsIcon size={24} /></button>
         </div>
      </nav>

      <Suspense fallback={null}>
        <AnimatePresence>
            {isAddModalOpen && <AddTransactionModal onClose={() => { setIsAddModalOpen(false); setSelectedTx(null); }} onSubmit={handleTransactionSubmit} settings={settings} members={members} categories={categories} initialTransaction={selectedTx} onLearnRule={() => {}} transactions={transactions} onDelete={async (id) => { if (familyId) await deleteItem(familyId, 'transactions', id); setIsAddModalOpen(false); }} />}
            {isSettingsOpen && <SettingsModal settings={settings} onClose={() => setIsSettingsOpen(false)} onUpdate={async (s) => await updateSettings(s)} onReset={handleResetSettings} savingsRate={savingsRate} setSavingsRate={setSavingsRate} members={members} onUpdateMembers={async (m) => { if (familyId) await updateItemsBatch(familyId, 'members', m); }} categories={categories} onUpdateCategories={async (c) => { if (familyId) await updateItemsBatch(familyId, 'categories', c); }} onDeleteCategory={async id => { if (familyId) await deleteItem(familyId, 'categories', id); }} learnedRules={[]} onUpdateRules={() => {}} currentFamilyId={familyId} onJoinFamily={async (id) => { if(auth.currentUser) { await joinFamily(auth.currentUser, id); window.location.reload(); } }} onLogout={logout} transactions={transactions} onUpdateTransactions={async (updatedTxs) => { if (familyId) await updateItemsBatch(familyId, 'transactions', updatedTxs); }} onDeleteTransactionsByPeriod={handleDeleteTransactionsByPeriod} onOpenDuplicates={() => { setIsSettingsOpen(false); setIsDuplicatesOpen(true); }} />}
            {isAIChatOpen && <AIChatModal onClose={() => setIsAIChatOpen(false)} />}
            {drillDownState && <DrillDownModal categoryId={drillDownState.categoryId} merchantName={drillDownState.merchantName} onClose={() => setDrillDownState(null)} transactions={filteredTransactions} setTransactions={setTransactions} settings={settings} members={members} categories={categories} onLearnRule={() => {}} onEditTransaction={handleEditTransaction} />}
            {importPreview && <ImportModal preview={importPreview} onCancel={() => setImportPreview(null)} onConfirm={async () => { if (importPreview && familyId) { await addItemsBatch(familyId, 'transactions', importPreview); setImportPreview(null); toast.success(`Импортировано ${importPreview.length} операций`); } }} settings={settings} categories={categories} onUpdateItem={(idx, updates) => { const updated = [...importPreview!]; updated[idx] = { ...updated[idx], ...updates }; setImportPreview(updated); }} onLearnRule={() => {}} onAddCategory={() => {}} />}
            {showNotifications && <NotificationsModal onClose={() => setShowNotifications(false)} />}
            {isMandatoryModalOpen && <MandatoryExpenseModal expense={null} onClose={() => setIsMandatoryModalOpen(false)} settings={settings} members={members} onSave={async (e) => { const updated = [...(settings.mandatoryExpenses || []), e]; await updateSettings({ ...settings, mandatoryExpenses: updated }); setIsMandatoryModalOpen(false); }} />}
            {isDuplicatesOpen && <DuplicatesModal transactions={transactions} onClose={() => setIsDuplicatesOpen(false)} onDelete={handleBatchDelete} onIgnore={async (pairs) => { const ignored = [...(settings.ignoredDuplicatePairs || []), ...pairs]; await updateSettings({ ...settings, ignoredDuplicatePairs: ignored }); }} ignoredPairs={settings.ignoredDuplicatePairs} />}
            {isGoalModalOpen && <GoalModal goal={editingGoal} onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }} onSave={handleGoalSave} onDelete={editingGoal ? () => handleGoalDelete(editingGoal.id) : undefined} settings={settings} />}
        </AnimatePresence>
      </Suspense>
    </div>
  );
}
