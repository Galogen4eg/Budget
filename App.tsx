
import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Settings as SettingsIcon, Bell, LayoutGrid, ShoppingBag, PieChart, Calendar, AppWindow, Users, User, Settings2, Loader2, WifiOff, LogIn, Bot, Plus } from 'lucide-react';
import { 
  Transaction, ShoppingItem, FamilyMember, PantryItem, MandatoryExpense, Category, LearnedRule, WidgetConfig, FamilyEvent, AppNotification 
} from './types';
import { Toaster, toast } from 'sonner';

import SmartHeader from './components/SmartHeader';
import MonthlyAnalyticsWidget from './components/MonthlyAnalyticsWidget';
import RecentTransactionsWidget from './components/RecentTransactionsWidget';
import ShoppingList from './components/ShoppingList';
import FamilyPlans from './components/FamilyPlans';
import TransactionHistory from './components/TransactionHistory';
import GoalsSection from './components/GoalsSection';
import SpendingCalendar from './components/SpendingCalendar';
import MandatoryExpensesList from './components/MandatoryExpensesList';
import CategoryProgress from './components/CategoryProgress';
import CategoryAnalysisWidget from './components/CategoryAnalysisWidget';
import LoginScreen from './components/LoginScreen';
import ImportModal from './components/ImportModal';
import FeedbackTool from './components/FeedbackTool';
import ServicesHub from './components/ServicesHub';

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
  addItem, updateItem, deleteItem, saveSettings, 
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
    { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } }, 
    { id: 'category_analysis', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'shopping', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'goals', isVisible: false, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
];

const pageVariants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: -10, scale: 0.98 }
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.5 
};

export default function App() {
  const { user, familyId, loading: isAuthLoading, logout } = useAuth();
  const { 
    transactions, setTransactions,
    shoppingItems, setShoppingItems,
    pantry, setPantry,
    events, setEvents,
    goals, setGoals,
    members, setMembers,
    categories, setCategories,
    settings, setSettings,
    learnedRules, setLearnedRules,
    filteredTransactions,
    totalBalance,
    currentMonthSpent,
    savingsRate, setSavingsRate,
    budgetMode, setBudgetMode,
    notifications
  } = useData();

  const [activeTab, setActiveTab] = useState('overview');
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<Transaction, 'id'>[] | null>(null);
  const [isImporting, setIsImporting] = useState(false); 
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [pinMode, setPinMode] = useState<'unlock' | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [drillDownState, setDrillDownState] = useState<{categoryId: string, merchantName?: string} | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDrillDown = (categoryId: string, merchantName?: string) => {
    setDrillDownState({ categoryId, merchantName });
  };

  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingMandatoryExpense, setEditingMandatoryExpense] = useState<MandatoryExpense | null>(null);
  const [isMandatoryModalOpen, setIsMandatoryModalOpen] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  
  const dashboardTransactions = useMemo(() => filteredTransactions, [filteredTransactions]);

  useEffect(() => {
    if (window.innerWidth < 768 || activeTab !== 'overview') {
        window.scrollTo(0, 0);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user?.uid && (!settings.widgets || settings.widgets.length === 0)) {
        const updatedSettings = { ...settings, widgets: DEFAULT_WIDGET_CONFIGS };
        setSettings(updatedSettings);
        saveSettings(user.uid, updatedSettings);
    }
  }, [user?.uid, settings.widgets]);

  useEffect(() => {
      if (settings.theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [settings.theme]);

  const handleTransactionSubmit = async (tx: Omit<Transaction, 'id'>) => {
    if (selectedTx) {
      if (familyId) await updateItem(familyId, 'transactions', selectedTx.id, tx);
      setSelectedTx(null);
    } else {
      if (familyId) await addItem(familyId, 'transactions', tx);
    }
  };

  const handleEditTransaction = (tx: Transaction) => {
      setSelectedTx(tx);
      setIsAddModalOpen(true);
  };

  const handleClearFilters = () => { setCalendarSelectedDate(null); };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
        const data = await parseAlfaStatement(file, settings.alfaMapping, members[0].id, learnedRules, categories, transactions);
        setImportPreview(data);
    } catch (err: any) { alert(err.message || "Ошибка при чтении файла"); }
    finally { setIsImporting(false); }
  };

  const handleMoveToPantry = async (item: ShoppingItem) => {
      const pantryItem: PantryItem = { id: Date.now().toString(), title: item.title, amount: item.amount || '1', unit: item.unit, category: item.category, addedDate: new Date().toISOString() };
      setShoppingItems(prev => prev.filter(i => i.id !== item.id));
      await setPantry(prev => [...prev, pantryItem]);
      if (familyId) await deleteItem(familyId, 'shopping', item.id);
  };

  const handleAddCategory = async (cat: Category) => {
      if (familyId) await addItem(familyId, 'categories', cat);
  };

  const handleDeleteCategory = async (id: string) => {
      if (familyId) await deleteItem(familyId, 'categories', id);
  };

  const handleInvite = async () => {
      if (!familyId) return;
      const link = `${window.location.origin}/?join=${familyId}`;
      const text = `Присоединяйся к бюджету "${settings.familyName}": ${link}`;
      if (navigator.share) navigator.share({ title: 'Бюджет', text, url: link });
      else { navigator.clipboard.writeText(text); toast.success('Ссылка скопирована!'); }
  };

  const handleOpenDuplicates = () => { setShowDuplicatesModal(true); setIsSettingsOpen(false); };

  const handleIgnoreDuplicates = async (pairs: string[]) => {
      const currentIgnored = settings.ignoredDuplicatePairs || [];
      const updatedIgnored = [...currentIgnored, ...pairs];
      const newSettings = { ...settings, ignoredDuplicatePairs: updatedIgnored };
      setSettings(newSettings);
      if (user?.uid) await saveSettings(user.uid, newSettings);
  };

  const handleDeleteTransactions = async (ids: string[]) => {
      if (familyId && ids.length > 0) await deleteItemsBatch(familyId, 'transactions', ids);
      toast.success(`Удалено ${ids.length} операций`);
  };

  const handleDeleteTransactionsByPeriod = async (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const ids = transactions
        .filter(t => {
            const d = new Date(t.date);
            return d >= s && d <= e;
        })
        .map(t => t.id);
    
    if (ids.length > 0) {
        await handleDeleteTransactions(ids);
    } else {
        toast.error('Операций за этот период не найдено');
    }
  };

  const handleResetSettings = async () => {
    if (confirm("Сбросить все личные настройки и обязательные платежи? Это действие нельзя отменить.") && user?.uid) {
        setSettings(DEFAULT_SETTINGS);
        await saveSettings(user.uid, DEFAULT_SETTINGS);
        toast.success("Настройки сброшены");
    }
  };

  const isWidgetVisible = (id: string) => {
      const widget = settings.widgets?.find(w => w.id === id);
      return widget ? widget.isVisible : true;
  };

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  if (isAuthLoading || isJoining) {
      return (
          <div className="flex flex-col h-[100dvh] items-center justify-center bg-[#EBEFF5] dark:bg-[#000000] gap-4 p-6 text-center">
              <div className="animate-spin text-blue-500"><Settings2 size={32}/></div>
              {isJoining && <p className="text-sm font-bold text-blue-500 animate-pulse">Присоединяемся к семье...</p>}
          </div>
      );
  }

  if (!user) return <LoginScreen />;
  if (pinMode === 'unlock') return <Suspense fallback={null}><PinScreen mode="unlock" savedPin={settings.pinCode} onSuccess={() => { setPinMode(null); }} onForgot={() => logout()} /></Suspense>;

  return (
    <div className="h-[100dvh] w-full bg-[#EBEFF5] dark:bg-[#000000] text-[#1C1C1E] dark:text-white transition-colors duration-300 flex flex-col md:flex-row overflow-hidden">
      <Toaster position="top-center" richColors theme={settings.theme === 'dark' ? 'dark' : 'light'} />
      <FeedbackTool />

      <div className="md:hidden sticky top-0 z-30 bg-[#EBEFF5]/90 dark:bg-black/90 backdrop-blur-xl border-b border-white/20 dark:border-white/5 px-4 py-3 pt-safe flex justify-between items-center shrink-0">
         <div className="flex items-center gap-3">
             <div className="text-xl font-black">FB.</div>
             {(activeTab === 'overview' || activeTab === 'budget') && (
                 <button onClick={() => setBudgetMode(prev => prev === 'family' ? 'personal' : 'family')} className="flex items-center gap-2 bg-white dark:bg-[#1C1C1E] p-1.5 pr-3 rounded-full border dark:border-white/10 shadow-sm ml-2 active:scale-95 transition-transform">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${budgetMode === 'family' ? 'bg-purple-50' : 'bg-blue-50'}`}>{budgetMode === 'family' ? <Users size={14} className="text-purple-500" /> : <User size={14} className="text-blue-500" />}</div>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{budgetMode === 'family' ? 'Семья' : 'Мой'}</span>
                 </button>
             )}
         </div>
         <div className="flex gap-3">
             <button onClick={() => setIsAIChatOpen(true)} className="p-2 bg-white dark:bg-[#1C1C1E] rounded-full shadow-sm active:scale-90 transition-transform"><Bot size={20} /></button>
             <button onClick={() => setShowNotifications(true)} className="relative p-2 bg-white dark:bg-[#1C1C1E] rounded-full shadow-sm active:scale-90 transition-transform">
                 <Bell size={20} />
                 {unreadNotificationsCount > 0 && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-black"/>}
             </button>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white dark:bg-[#1C1C1E] rounded-full shadow-sm active:scale-90 transition-transform"><SettingsIcon size={20} /></button>
         </div>
      </div>

      <main className={`flex-1 h-full p-4 md:p-8 pb-40 md:pb-8 relative md:ml-28 ${activeTab === 'overview' ? 'md:overflow-hidden overflow-y-auto no-scrollbar' : 'overflow-y-auto overflow-x-hidden no-scrollbar'}`}>
        <div className={`max-w-[1920px] w-[95%] mx-auto flex flex-col gap-6 ${activeTab === 'overview' ? 'h-auto md:h-full min-h-0' : 'min-h-full'}`}>
            <Suspense fallback={null}>
                {showOnboarding && <OnboardingModal onSave={async (name, color) => {
                    if (familyId) {
                        const newMember: FamilyMember = { id: user?.uid || 'user', name, color, isAdmin: true, userId: user?.uid };
                        await updateItemsBatch(familyId, 'members', [newMember]);
                    }
                    setShowOnboarding(false);
                }} />}
            </Suspense>

            <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
                <motion.div key="overview" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col gap-6 md:overflow-hidden md:h-full">
                    <SmartHeader balance={totalBalance} spent={currentMonthSpent} savingsRate={savingsRate} settings={settings} budgetMode={budgetMode} transactions={dashboardTransactions} onToggleBudgetMode={() => setBudgetMode(prev => prev === 'family' ? 'personal' : 'family')} onTogglePrivacy={() => setSettings(s => ({...s, privacyMode: !s.privacyMode}))} onInvite={handleInvite} className="shrink-0" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full md:h-full md:min-h-0 md:overflow-hidden overflow-y-auto no-scrollbar pb-20 md:pb-0">
                        {isWidgetVisible('month_chart') && (
                            <div className="md:col-span-1 h-80 md:h-full flex flex-col">
                                <MonthlyAnalyticsWidget transactions={dashboardTransactions} currentMonth={currentMonth} settings={settings} />
                            </div>
                        )}

                        {isWidgetVisible('recent_transactions') && (
                            <div className="md:col-span-1 h-full min-h-[300px] md:min-h-0 flex flex-col">
                                <RecentTransactionsWidget 
                                    transactions={dashboardTransactions} 
                                    categories={categories} 
                                    members={members} 
                                    settings={settings} 
                                    onTransactionClick={handleEditTransaction} 
                                    onViewAllClick={() => {
                                        setActiveTab('budget');
                                        setScrollToId('section-history');
                                    }} 
                                />
                            </div>
                        )}

                        <div className="md:col-span-1 flex flex-col gap-6 h-full min-h-[400px] md:min-h-0">
                            {isWidgetVisible('category_analysis') && (
                                <div className="flex-1 min-h-[200px]">
                                    <CategoryAnalysisWidget 
                                        transactions={dashboardTransactions} 
                                        categories={categories} 
                                        settings={settings} 
                                        onClick={() => {
                                            setActiveTab('budget');
                                            setScrollToId('section-categories');
                                        }} 
                                    />
                                </div>
                            )}
                            
                            {isWidgetVisible('shopping') && (
                                <div className="flex-1 min-h-[150px]">
                                    <motion.div whileHover={{ scale: 1.01 }} className="flex-1 bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.2rem] border dark:border-white/5 shadow-soft cursor-pointer relative overflow-hidden group h-full" onClick={() => setActiveTab('shopping')}>
                                        <div className="flex justify-between items-center mb-4 h-8 shrink-0">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-xl"><ShoppingBag size={16} className="text-green-600"/></div>
                                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Покупки</h3>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-white/10 px-2.5 py-1 rounded-lg">{shoppingItems.filter(i=>!i.completed).length}</span>
                                        </div>
                                        <div className="space-y-2 overflow-hidden h-full pb-8">
                                            {shoppingItems.filter(i=>!i.completed).slice(0,5).map(item => (
                                                <div key={item.id} className="flex items-center gap-2.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" /><span className="text-xs font-bold text-[#1C1C1E] dark:text-gray-200 truncate">{item.title}</span></div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
            {activeTab === 'budget' && (
                <motion.div key="budget" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col h-full gap-6 overflow-hidden">
                    <div className="shrink-0 space-y-4">
                        <h1 className="text-3xl font-black tracking-tight">Бюджет</h1>
                        <div className="flex gap-3">
                            <button className="flex-1 bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2" onClick={() => setIsAddModalOpen(true)}><Plus size={20} strokeWidth={3} /> Добавить</button>
                            <button className="flex-1 bg-gray-100 dark:bg-[#1C1C1E]/50 text-gray-500 p-5 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2" onClick={() => document.getElementById('import-input')?.click()} disabled={isImporting}>{isImporting ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18} />} Импорт</button>
                            <input id="import-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); e.target.value = ''; }} />
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-24 xl:pb-0">
                        <div className="flex flex-col xl:grid xl:grid-cols-3 gap-6 h-full items-start">
                            <div className="flex flex-col gap-6 xl:col-span-1 w-full">
                                <SpendingCalendar transactions={filteredTransactions} selectedDate={calendarSelectedDate} onSelectDate={setCalendarSelectedDate} currentMonth={currentMonth} onMonthChange={setCurrentMonth} settings={settings} />
                                <div id="section-categories" className="flex-1 min-h-[300px]">
                                    <CategoryProgress transactions={filteredTransactions} categories={categories} settings={settings} onCategoryClick={(catId) => handleDrillDown(catId)} onSubCategoryClick={(catId, merchant) => handleDrillDown(catId, merchant)} currentMonth={currentMonth} selectedDate={calendarSelectedDate} />
                                </div>
                            </div>
                            <div className="xl:col-span-1 h-full w-full">
                                <MandatoryExpensesList expenses={settings.mandatoryExpenses || []} transactions={filteredTransactions} settings={settings} currentMonth={currentMonth} onEdit={(e) => { setEditingMandatoryExpense(e); setIsMandatoryModalOpen(true); }} onAdd={() => { setEditingMandatoryExpense(null); setIsMandatoryModalOpen(true); }} />
                            </div>
                            <div id="section-history" className="xl:col-span-1 h-full min-h-[500px] w-full">
                                <TransactionHistory transactions={filteredTransactions} setTransactions={setTransactions} settings={settings} members={members} categories={categories} filterMode={calendarSelectedDate ? 'day' : 'month'} selectedDate={calendarSelectedDate} onClearFilters={handleClearFilters} onLearnRule={(rule) => setLearnedRules(prev => [...prev, rule])} onEditTransaction={handleEditTransaction} onAddCategory={handleAddCategory} currentMonth={currentMonth} />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
            {activeTab === 'plans' && <motion.div key="plans" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><FamilyPlans events={events} setEvents={setEvents} settings={settings} members={members} onSendToTelegram={async () => true} /></motion.div>}
            {activeTab === 'shopping' && <motion.div key="shopping" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><ShoppingList items={shoppingItems} setItems={setShoppingItems} settings={settings} members={members} onMoveToPantry={handleMoveToPantry} onSendToTelegram={async () => true} /></motion.div>}
            {activeTab === 'services' && <motion.div key="services" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><ServicesHub /></motion.div>}
            </AnimatePresence>
        </div>
      </main>

      <nav className="fixed bottom-6 left-4 right-4 md:left-0 md:right-auto md:top-0 md:bottom-0 md:w-28 md:h-screen md:bg-white dark:md:bg-[#1C1C1E] md:border-r border-white/10 md:rounded-none bg-[#1C1C1E]/95 dark:bg-[#2C2C2E]/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-2 flex md:flex-col justify-between items-center z-50 transition-all duration-300 border border-white/5">
         <div className="hidden md:flex flex-col items-center justify-center h-24 shrink-0"><div className="text-2xl font-black text-[#1C1C1E] dark:text-white">FB.</div></div>
         <div className="flex md:flex-col w-full justify-around md:justify-start md:items-center md:gap-4 md:flex-1 md:pt-4 overflow-y-auto no-scrollbar">
             {TAB_CONFIG.filter(t => (settings.enabledTabs || []).includes(t.id)).map(tab => {
                 const isActive = activeTab === tab.id;
                 return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="relative flex flex-col items-center justify-center w-12 h-12 md:w-20 md:h-auto md:py-4 group transition-all shrink-0">
                        {isActive && <motion.div layoutId="nav-pill" className="absolute inset-0 bg-white/20 md:bg-blue-50 dark:md:bg-white/5 rounded-full md:rounded-2xl z-0" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                        <span className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-white md:text-blue-600 dark:md:text-blue-400' : 'text-gray-400 group-hover:text-white md:group-hover:text-gray-600'}`}>{React.createElement(tab.icon, { size: 24, strokeWidth: isActive ? 2.5 : 2 })}</span>
                        <span className={`hidden md:block text-[10px] font-black mt-2 relative z-10 transition-colors duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600'}`}>{tab.label}</span>
                    </button>
                 )
             })}
         </div>
         <div className="hidden md:flex flex-col gap-4 mb-8 w-full items-center shrink-0">
             <button onClick={() => setIsAIChatOpen(true)} className="text-gray-400 hover:text-blue-500 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all"><Bot size={24} /></button>
             <button onClick={() => setShowNotifications(true)} className="text-gray-400 hover:text-blue-500 relative p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                <Bell size={24} />
                {unreadNotificationsCount > 0 && <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1C1C1E]"/>}
             </button>
             <button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-blue-500 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all"><SettingsIcon size={24} /></button>
         </div>
      </nav>

      <Suspense fallback={null}>
        <AnimatePresence>
            {isAddModalOpen && <AddTransactionModal onClose={() => { setIsAddModalOpen(false); setSelectedTx(null); }} onSubmit={handleTransactionSubmit} settings={settings} members={members} categories={categories} initialTransaction={selectedTx} onLearnRule={(rule) => setLearnedRules(prev => [...prev, rule])} transactions={transactions} onDelete={async (id) => { if (familyId) await deleteItem(familyId, 'transactions', id); setIsAddModalOpen(false); }} />}
            {isSettingsOpen && <SettingsModal settings={settings} onClose={() => setIsSettingsOpen(false)} onUpdate={async (s) => { if (user?.uid) await saveSettings(user.uid, s); }} onReset={handleResetSettings} savingsRate={savingsRate} setSavingsRate={setSavingsRate} members={members} onUpdateMembers={async (m) => { if (familyId) await updateItemsBatch(familyId, 'members', m); }} categories={categories} onUpdateCategories={async (c) => { if (familyId) await updateItemsBatch(familyId, 'categories', c); }} onDeleteCategory={handleDeleteCategory} learnedRules={learnedRules} onUpdateRules={async (r) => { if(familyId) await updateItemsBatch(familyId, 'rules', r); }} currentFamilyId={familyId} onJoinFamily={async (id) => { if(auth.currentUser) { await joinFamily(auth.currentUser, id); window.location.reload(); } }} onLogout={logout} transactions={transactions} onUpdateTransactions={async (updatedTxs) => { if (familyId) await updateItemsBatch(familyId, 'transactions', updatedTxs); }} installPrompt={installPrompt} onOpenDuplicates={handleOpenDuplicates} onDeleteTransactionsByPeriod={handleDeleteTransactionsByPeriod} />}
            {isAIChatOpen && <AIChatModal onClose={() => setIsAIChatOpen(false)} />}
            {drillDownState && <DrillDownModal categoryId={drillDownState.categoryId} merchantName={drillDownState.merchantName} onClose={() => setDrillDownState(null)} transactions={filteredTransactions} setTransactions={setTransactions} settings={settings} members={members} categories={categories} onLearnRule={(rule) => setLearnedRules(prev => [...prev, rule])} onEditTransaction={handleEditTransaction} />}
            {showDuplicatesModal && <DuplicatesModal transactions={transactions} onClose={() => setShowDuplicatesModal(false)} onDelete={handleDeleteTransactions} onIgnore={handleIgnoreDuplicates} ignoredPairs={settings.ignoredDuplicatePairs} />}
            {importPreview && <ImportModal preview={importPreview} onCancel={() => setImportPreview(null)} onConfirm={async () => { if (importPreview && familyId) { await addItemsBatch(familyId, 'transactions', importPreview); setImportPreview(null); toast.success(`Импортировано ${importPreview.length} операций`); } }} settings={settings} categories={categories} onUpdateItem={(idx, updates) => { const updated = [...importPreview!]; updated[idx] = { ...updated[idx], ...updates }; setImportPreview(updated); }} onLearnRule={(rule) => setLearnedRules(prev => [...prev, rule])} onAddCategory={handleAddCategory} />}
            {showNotifications && <NotificationsModal onClose={() => setShowNotifications(false)} />}
            {isGoalModalOpen && <GoalModal goal={editingGoal} onClose={() => setIsGoalModalOpen(false)} settings={settings} onSave={async (g) => { if (familyId) { if (editingGoal) await updateItem(familyId, 'goals', g.id, g); else await addItem(familyId, 'goals', g); } }} onDelete={async (id) => { if (familyId) await deleteItem(familyId, 'goals', id); }} />}
            {isMandatoryModalOpen && <MandatoryExpenseModal expense={editingMandatoryExpense} onClose={() => setIsMandatoryModalOpen(false)} settings={settings} onSave={async (e) => { const currentExpenses = settings.mandatoryExpenses || []; const updatedExpenses = editingMandatoryExpense ? currentExpenses.map(ex => ex.id === e.id ? e : ex) : [...currentExpenses, e]; setSettings({ ...settings, mandatoryExpenses: updatedExpenses }); if (user?.uid) await saveSettings(user.uid, { ...settings, mandatoryExpenses: updatedExpenses }); setIsMandatoryModalOpen(false); }} onDelete={async (id) => { const updatedExpenses = (settings.mandatoryExpenses || []).filter(e => e.id !== id); setSettings({ ...settings, mandatoryExpenses: updatedExpenses }); if (user?.uid) await saveSettings(user.uid, { ...settings, mandatoryExpenses: updatedExpenses }); setIsMandatoryModalOpen(false); }} />}
        </AnimatePresence>
      </Suspense>
    </div>
  );
}
