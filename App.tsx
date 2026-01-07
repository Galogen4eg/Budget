
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Settings as SettingsIcon, Bell, LayoutGrid, ShoppingBag, PieChart, Calendar, AppWindow, Users, User, Settings2, Loader2, WifiOff } from 'lucide-react';
import { 
  Transaction, ShoppingItem, FamilyMember, PantryItem, MandatoryExpense, Category, LearnedRule, WidgetConfig 
} from './types';

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

// Lazy Load Modals & Heavy Components
const AddTransactionModal = React.lazy(() => import('./components/AddTransactionModal'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const OnboardingModal = React.lazy(() => import('./components/OnboardingModal'));
const PinScreen = React.lazy(() => import('./components/PinScreen'));
const NotificationsModal = React.lazy(() => import('./components/NotificationsModal'));
const GoalModal = React.lazy(() => import('./components/GoalModal'));
const MandatoryExpenseModal = React.lazy(() => import('./components/MandatoryExpenseModal'));
const DrillDownModal = React.lazy(() => import('./components/DrillDownModal'));
const ServicesHub = React.lazy(() => import('./components/ServicesHub'));
const DuplicatesModal = React.lazy(() => import('./components/DuplicatesModal'));

import { parseAlfaStatement } from './utils/alfaParser';
import { auth } from './firebase';
import { 
  addItem, updateItem, deleteItem, saveSettings, 
  addItemsBatch, updateItemsBatch, deleteItemsBatch, joinFamily 
} from './utils/db';

import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';

const TAB_CONFIG = [
  { id: 'overview', label: 'Обзор', icon: LayoutGrid },
  { id: 'budget', label: 'Бюджет', icon: PieChart },
  { id: 'plans', label: 'Планы', icon: Calendar },
  { id: 'shopping', label: 'Покупки', icon: ShoppingBag },
  { id: 'services', label: 'Сервисы', icon: AppWindow },
];

// Фиксированная конфигурация для создания идеального прямоугольника на ПК (Схема 1-2-1)
const DEFAULT_WIDGET_CONFIGS: WidgetConfig[] = [
    { id: 'category_analysis', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
    { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 2, rowSpan: 1 } },
    { id: 'shopping', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'goals', isVisible: true, mobile: { colSpan: 1, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 1 } },
    { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 1 }, desktop: { colSpan: 1, rowSpan: 2 } },
];

const pageVariants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: -10, scale: 0.98 }
};

const pageTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.5 
};

export default function App() {
  const { user, familyId, loading: isAuthLoading, isOfflineMode, logout } = useAuth();
  const { 
    transactions, setTransactions,
    shoppingItems, setShoppingItems,
    pantry, setPantry,
    events, setEvents,
    goals, setGoals,
    members, setMembers,
    categories, setCategories,
    learnedRules, setLearnedRules,
    settings, setSettings,
    filteredTransactions,
    totalBalance,
    currentMonthSpent,
    savingsRate, setSavingsRate,
    budgetMode, setBudgetMode,
  } = useData();

  const [activeTab, setActiveTab] = useState('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<Transaction, 'id'>[] | null>(null);
  const [isImporting, setIsImporting] = useState(false); 
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [pinMode, setPinMode] = useState<'unlock' | null>(null);
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [drillDownState, setDrillDownState] = useState<{categoryId: string, merchantName?: string} | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterMerchant, setFilterMerchant] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingMandatoryExpense, setEditingMandatoryExpense] = useState<MandatoryExpense | null>(null);
  const [isMandatoryModalOpen, setIsMandatoryModalOpen] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (familyId && (!settings.widgets || settings.widgets.length === 0)) {
        const updatedSettings = { ...settings, widgets: DEFAULT_WIDGET_CONFIGS };
        setSettings(updatedSettings);
        saveSettings(familyId, updatedSettings);
    }
  }, [familyId, settings.widgets]);

  useEffect(() => {
      if (settings.theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [settings.theme]);

  const showNotify = (type: 'success' | 'error', message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 3000);
  };

  const handleTransactionSubmit = async (tx: Omit<Transaction, 'id'>) => {
    if (selectedTx) {
      if (familyId) await updateItem(familyId, 'transactions', selectedTx.id, tx);
      else setTransactions(prev => prev.map(t => t.id === selectedTx.id ? { ...t, ...tx } : t));
      setSelectedTx(null);
    } else {
      if (familyId) await addItem(familyId, 'transactions', tx);
      else setTransactions(prev => [{ ...tx, id: Date.now().toString() } as Transaction, ...prev]);
    }
  };

  const handleEditTransaction = (tx: Transaction) => {
      setSelectedTx(tx);
      setIsAddModalOpen(true);
  };

  const handleLearnRule = async (rule: LearnedRule) => {
      setLearnedRules(prev => [...prev, rule]);
      if(familyId) await addItem(familyId, 'rules', rule);
  };

  const handleApplyRuleToExisting = async (rule: LearnedRule) => {
      const changedTxs: Transaction[] = [];
      const updatedTransactions = transactions.map(tx => {
           const rawNote = (tx.rawNote || tx.note).toLowerCase();
           if (rawNote.includes(rule.keyword.toLowerCase())) {
               if (tx.category !== rule.categoryId || tx.note !== rule.cleanName) {
                   const newTx = { ...tx, category: rule.categoryId, note: rule.cleanName };
                   changedTxs.push(newTx);
                   return newTx;
               }
           }
           return tx;
      });

      if (changedTxs.length > 0) {
          setTransactions(updatedTransactions);
          showNotify('success', `Обновлено ${changedTxs.length} операций`);
          if (familyId) await updateItemsBatch(familyId, 'transactions', changedTxs);
      }
  };

  const handleDrillDown = (categoryId: string, merchantName?: string) => setDrillDownState({ categoryId, merchantName });
  const handleClearFilters = () => { setFilterCategory(null); setFilterMerchant(null); };

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
      setCategories(prev => [...prev, cat]);
      if (familyId) await addItem(familyId, 'categories', cat);
  };

  const handleInvite = async () => {
      if (!familyId) return;
      const link = `${window.location.origin}/?join=${familyId}`;
      const text = `Присоединяйся к бюджету "${settings.familyName}": ${link}`;
      if (navigator.share) navigator.share({ title: 'Бюджет', text, url: link });
      else { navigator.clipboard.writeText(text); showNotify('success', 'Ссылка скопирована!'); }
  };

  const handleOpenDuplicates = () => { setShowDuplicatesModal(true); setIsSettingsOpen(false); };

  const handleDeleteTransactions = async (ids: string[]) => {
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      if (familyId && ids.length > 0) await deleteItemsBatch(familyId, 'transactions', ids);
      showNotify('success', `Удалено ${ids.length} операций`);
  };

  const handleDeleteTransactionsByPeriod = async (start: string, end: string) => {
    const toDelete = transactions.filter(t => {
      const d = t.date.split('T')[0];
      return d >= start && d <= end;
    });
    const ids = toDelete.map(t => t.id);
    if (ids.length > 0) {
      if (confirm(`Удалить ${ids.length} операций за период?`)) {
        await handleDeleteTransactions(ids);
      }
    } else { alert("Операций за этот период не найдено"); }
  };

  if (isAuthLoading) return <div className="flex h-screen items-center justify-center bg-[#EBEFF5] dark:bg-[#000000]"><div className="animate-spin text-blue-500"><Settings2 size={32}/></div></div>;
  if (!user) return <LoginScreen />;
  if (pinMode === 'unlock') return <Suspense fallback={null}><PinScreen mode="unlock" savedPin={settings.pinCode} onSuccess={() => { setPinMode(null); setIsAppUnlocked(true); }} onForgot={() => logout()} /></Suspense>;

  // Check if we have data to decide on hiding widgets
  const hasTransactions = filteredTransactions.length > 0;

  return (
    <div className="min-h-[100.1vh] pb-32 md:pb-0 md:pl-24 bg-[#EBEFF5] dark:bg-[#000000] text-[#1C1C1E] dark:text-white transition-colors duration-300">
      <div className="md:hidden sticky top-0 z-30 bg-[#EBEFF5]/90 dark:bg-black/90 backdrop-blur-xl border-b border-white/20 dark:border-white/5 px-4 py-3 flex justify-between items-center">
         <div className="flex items-center gap-3">
             {(activeTab === 'overview' || activeTab === 'budget') && (
                 <button onClick={() => setBudgetMode(prev => prev === 'family' ? 'personal' : 'family')} className="flex items-center gap-2 bg-white dark:bg-[#1C1C1E] p-1.5 pr-3 rounded-full border dark:border-white/10 shadow-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${budgetMode === 'family' ? 'bg-purple-500' : 'bg-blue-500'}`}>{budgetMode === 'family' ? <Users size={14} /> : <User size={14} />}</div>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{budgetMode === 'family' ? 'Семья' : 'Мой'}</span>
                 </button>
             )}
             {isOfflineMode && <WifiOff size={16} className="text-gray-400" />}
         </div>
         <div className="flex gap-3">
             <button onClick={() => setShowNotifications(true)} className="relative p-2 bg-white dark:bg-[#1C1C1E] rounded-full shadow-sm"><Bell size={20} /><div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-black"/></button>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white dark:bg-[#1C1C1E] rounded-full shadow-sm"><SettingsIcon size={20} /></button>
         </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <Suspense fallback={null}>
            {showOnboarding && <OnboardingModal onSave={async (name, color) => {
                if (familyId) {
                    const newMember: FamilyMember = { id: user?.uid || 'user', name, color, isAdmin: true, userId: user?.uid };
                    await updateItemsBatch(familyId, 'members', [newMember]);
                    await saveSettings(familyId, { ...settings, familyName: `${name} Family` });
                }
                setShowOnboarding(false);
            }} />}
        </Suspense>

        {notification && <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} exit={{opacity:0}} className={`fixed top-20 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full shadow-xl border font-bold text-sm ${notification.type === 'success' ? 'bg-black text-white' : 'bg-red-500 text-white'}`}>{notification.message}</motion.div>}

        <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
            <motion.div key="overview" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="space-y-8">
                <SmartHeader balance={totalBalance} spent={currentMonthSpent} savingsRate={savingsRate} settings={settings} budgetMode={budgetMode} onToggleBudgetMode={() => setBudgetMode(prev => prev === 'family' ? 'personal' : 'family')} onTogglePrivacy={() => setSettings(s => ({...s, privacyMode: !s.privacyMode}))} onInvite={handleInvite} />
                
                {/* Исправленная сетка ПК для идеального выравнивания (1-2-1) с h-full и скрытием пустых */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 auto-rows-[200px] grid-flow-row-dense">
                    {DEFAULT_WIDGET_CONFIGS.filter(w => {
                        const s = settings.widgets?.find(sw => sw.id === w.id);
                        return s ? s.isVisible : w.isVisible;
                    }).map(widget => {
                        const m = widget.mobile;
                        const d = widget.desktop;
                        const gridClasses = `col-span-${m.colSpan} row-span-${m.rowSpan} md:col-span-${d.colSpan} md:row-span-${d.rowSpan}`;
                        
                        // Hide empty analytical widgets to keep UI clean
                        if (widget.id === 'recent_transactions' && !hasTransactions) return null;
                        if (widget.id === 'category_analysis' && !hasTransactions) return null;
                        if (widget.id === 'month_chart' && !hasTransactions) return null;

                        switch(widget.id) {
                            case 'category_analysis': return <div key={widget.id} className={gridClasses + " h-full"}><CategoryAnalysisWidget transactions={filteredTransactions} categories={categories} settings={settings} onClick={() => setActiveTab('budget')} /></div>;
                            case 'month_chart': return <div key={widget.id} className={gridClasses + " h-full"}><MonthlyAnalyticsWidget transactions={filteredTransactions} currentMonth={currentMonth} settings={settings} /></div>;
                            case 'shopping': return (
                                <motion.div key={widget.id} whileHover={{ scale: 1.01 }} className={`${gridClasses} h-full bg-white dark:bg-[#1C1C1E] p-5 rounded-[2.2rem] border dark:border-white/5 shadow-soft cursor-pointer relative overflow-hidden group`} onClick={() => setActiveTab('shopping')}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-xl"><ShoppingBag size={14} className="text-green-600"/></div>
                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Покупки</h3>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-white/10 px-2 py-1 rounded-lg">{shoppingItems.filter(i=>!i.completed).length}</span>
                                    </div>
                                    <div className="space-y-1.5 overflow-hidden">
                                        {shoppingItems.filter(i=>!i.completed).slice(0,3).map(item => (
                                            <div key={item.id} className="flex items-center gap-2.5">
                                                <div className="w-1 h-1 rounded-full bg-green-400 shrink-0" />
                                                <span className="text-xs font-bold text-[#1C1C1E] dark:text-gray-200 truncate">{item.title}</span>
                                            </div>
                                        ))}
                                        {shoppingItems.filter(i=>!i.completed).length === 0 && <p className="text-[10px] text-gray-400 italic">Список пуст</p>}
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50/20 dark:bg-green-900/10 rounded-full blur-[50px] -mr-10 -mt-10" />
                                </motion.div>
                            );
                            case 'goals': return <div key={widget.id} className={gridClasses + " h-full"}><GoalsSection goals={goals} settings={settings} onEditGoal={(g) => { setEditingGoal(g); setIsGoalModalOpen(true); }} onAddGoal={() => { setEditingGoal(null); setIsGoalModalOpen(true); }} /></div>;
                            case 'recent_transactions': return <div key={widget.id} className={gridClasses + " h-full"}><RecentTransactionsWidget transactions={filteredTransactions} categories={categories} members={members} settings={settings} onTransactionClick={handleEditTransaction} onViewAllClick={() => setActiveTab('budget')} /></div>;
                            default: return null;
                        }
                    })}
                </div>
            </motion.div>
        )}
        {activeTab === 'budget' && (
            <motion.div key="budget" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="space-y-6">
                <div className="flex gap-2 mb-4"><button className="flex-1 bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl font-bold shadow-sm active:scale-95 transition-all" onClick={() => setIsAddModalOpen(true)}>Добавить операцию</button><button className="flex-1 bg-gray-100 dark:bg-[#1C1C1E]/50 text-gray-400 p-3 rounded-2xl font-bold flex items-center justify-center gap-2" onClick={() => document.getElementById('import-input')?.click()} disabled={isImporting}>{isImporting ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18} />} Импорт<input id="import-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImport(e.target.files[0]); e.target.value = ''; }} /></button></div>
                <SpendingCalendar transactions={filteredTransactions} selectedDate={calendarSelectedDate} onSelectDate={setCalendarSelectedDate} currentMonth={currentMonth} onMonthChange={setCurrentMonth} settings={settings} />
                <CategoryProgress transactions={filteredTransactions} categories={categories} settings={settings} onCategoryClick={(catId) => handleDrillDown(catId)} onSubCategoryClick={(catId, merchant) => handleDrillDown(catId, merchant)} currentMonth={currentMonth} />
                <MandatoryExpensesList expenses={settings.mandatoryExpenses || []} transactions={filteredTransactions} settings={settings} currentMonth={currentMonth} onEdit={(e) => { setEditingMandatoryExpense(e); setIsMandatoryModalOpen(true); }} />
                <TransactionHistory transactions={filteredTransactions} setTransactions={setTransactions} settings={settings} members={members} categories={categories} filterMode={calendarSelectedDate ? 'day' : 'month'} initialSearch={calendarSelectedDate ? calendarSelectedDate.toDateString() : ''} selectedCategoryId={filterCategory || undefined} selectedMerchantName={filterMerchant || undefined} onClearFilters={handleClearFilters} onLearnRule={handleLearnRule} onApplyRuleToExisting={handleApplyRuleToExisting} onEditTransaction={handleEditTransaction} onAddCategory={handleAddCategory} />
            </motion.div>
        )}
        {activeTab === 'plans' && <motion.div key="plans" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><FamilyPlans events={events} setEvents={setEvents} settings={settings} members={members} onSendToTelegram={async () => true} /></motion.div>}
        {activeTab === 'shopping' && <motion.div key="shopping" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><ShoppingList items={shoppingItems} setItems={setShoppingItems} settings={settings} members={members} onCompletePurchase={() => {}} onMoveToPantry={handleMoveToPantry} /></motion.div>}
        {activeTab === 'services' && <motion.div key="services" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Suspense fallback={<div className="p-12 flex justify-center"><Loader2 className="animate-spin text-gray-300"/></div>}><ServicesHub /></Suspense></motion.div>}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-6 left-4 right-4 md:left-0 md:right-auto md:top-0 md:bottom-0 md:w-24 md:h-screen md:bg-white md:border-r dark:md:border-white/5 md:rounded-none bg-[#1C1C1E]/90 dark:bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl p-2 flex md:flex-col justify-around md:justify-start items-center z-50">
         <div className="hidden md:block text-2xl font-black mb-8 pt-10">FB.</div>
         {TAB_CONFIG.filter(t => (settings.enabledTabs || []).includes(t.id)).map(tab => {
             const isActive = activeTab === tab.id;
             return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className="relative flex flex-col items-center justify-center w-12 h-12 md:w-full md:py-4 group">{isActive && (<motion.div layoutId="nav-pill" className="absolute inset-0 bg-white/20 md:bg-blue-50 dark:md:bg-white/20 rounded-full md:rounded-xl" transition={{ type: "spring", stiffness: 300, damping: 30 }} />)}<span className={`relative z-10 ${isActive ? 'text-white md:text-blue-600' : 'text-gray-400 md:text-gray-400 group-hover:text-white'}`}>{React.createElement(tab.icon, { size: 24, strokeWidth: isActive ? 2.5 : 2 })}</span><span className="hidden md:block text-[10px] font-bold mt-1 text-gray-400 group-hover:text-gray-600">{tab.label}</span></button>)
         })}
         <div className="hidden md:flex flex-col gap-6 mt-auto mb-10 w-full items-center"><button onClick={() => setShowNotifications(true)} className="text-gray-400 hover:text-blue-500 relative p-2"><Bell size={24} /></button><button onClick={() => setIsSettingsOpen(true)} className="text-gray-400 hover:text-blue-500 relative p-2"><SettingsIcon size={24} /></button></div>
      </nav>

      <Suspense fallback={null}>
        <AnimatePresence>
            {isAddModalOpen && <AddTransactionModal onClose={() => { setIsAddModalOpen(false); setSelectedTx(null); }} onSubmit={handleTransactionSubmit} settings={settings} members={members} categories={categories} initialTransaction={selectedTx} onLearnRule={handleLearnRule} onApplyRuleToExisting={handleApplyRuleToExisting} onDelete={async (id) => { setTransactions(prev => prev.filter(t => t.id !== id)); if (familyId) await deleteItem(familyId, 'transactions', id); setIsAddModalOpen(false); }} />}
            {isSettingsOpen && <SettingsModal settings={settings} onClose={() => setIsSettingsOpen(false)} onUpdate={async (s) => { setSettings(s); if (familyId) await saveSettings(familyId, s); }} onReset={() => {}} savingsRate={savingsRate} setSavingsRate={setSavingsRate} members={members} onUpdateMembers={async (m) => { setMembers(m); if (familyId) await updateItemsBatch(familyId, 'members', m); }} categories={categories} onUpdateCategories={async (c) => { setCategories(c); if (familyId) await updateItemsBatch(familyId, 'categories', c); }} learnedRules={learnedRules} onUpdateRules={async (r) => { if(familyId) await updateItemsBatch(familyId, 'rules', r); }} currentFamilyId={familyId} onJoinFamily={async (id) => { if(auth.currentUser) { await joinFamily(auth.currentUser, id); window.location.reload(); } }} onLogout={logout} transactions={transactions} onUpdateTransactions={async (updatedTxs) => { setTransactions(updatedTxs); if (familyId) await updateItemsBatch(familyId, 'transactions', updatedTxs.slice(0, 100)); }} installPrompt={installPrompt} onOpenDuplicates={handleOpenDuplicates} onDeleteTransactionsByPeriod={handleDeleteTransactionsByPeriod} />}
            {drillDownState && <DrillDownModal categoryId={drillDownState.categoryId} merchantName={drillDownState.merchantName} onClose={() => setDrillDownState(null)} transactions={filteredTransactions} setTransactions={setTransactions} settings={settings} members={members} categories={categories} onLearnRule={handleLearnRule} onApplyRuleToExisting={handleApplyRuleToExisting} onEditTransaction={handleEditTransaction} />}
            {showDuplicatesModal && <DuplicatesModal transactions={transactions} onClose={() => setShowDuplicatesModal(false)} onDelete={handleDeleteTransactions} />}
            {importPreview && <ImportModal preview={importPreview} onCancel={() => setImportPreview(null)} onConfirm={async () => { if (importPreview) { setTransactions(prev => [...importPreview.map(t => ({...t, id: Date.now().toString()}) as Transaction), ...prev]); if (familyId) await addItemsBatch(familyId, 'transactions', importPreview); setImportPreview(null); showNotify('success', `Импортировано ${importPreview.length} операций`); } }} settings={settings} categories={categories} onUpdateItem={(idx, updates) => { const updated = [...importPreview!]; updated[idx] = { ...updated[idx], ...updates }; setImportPreview(updated); }} onLearnRule={handleLearnRule} onAddCategory={handleAddCategory} />}
            {showNotifications && <NotificationsModal onClose={() => setShowNotifications(false)} />}
            {isGoalModalOpen && <GoalModal goal={editingGoal} onClose={() => setIsGoalModalOpen(false)} settings={settings} onSave={async (g) => { if (editingGoal) setGoals(prev => prev.map(gl => gl.id === g.id ? g : gl)); else setGoals(prev => [...prev, g]); if (familyId) { if (editingGoal) await updateItem(familyId, 'goals', g.id, g); else await addItem(familyId, 'goals', g); } setIsGoalModalOpen(true); }} onDelete={async (id) => { setGoals(prev => prev.filter(g => g.id !== id)); if (familyId) await deleteItem(familyId, 'goals', id); }} />}
            {isMandatoryModalOpen && <MandatoryExpenseModal expense={editingMandatoryExpense} onClose={() => setIsMandatoryModalOpen(false)} settings={settings} onSave={async (e) => { const currentExpenses = settings.mandatoryExpenses || []; const updatedExpenses = editingMandatoryExpense ? currentExpenses.map(ex => ex.id === e.id ? e : ex) : [...currentExpenses, e]; setSettings({ ...settings, mandatoryExpenses: updatedExpenses }); if (familyId) await saveSettings(familyId, { ...settings, mandatoryExpenses: updatedExpenses }); setIsMandatoryModalOpen(false); }} onDelete={async (id) => { const updatedExpenses = (settings.mandatoryExpenses || []).filter(e => e.id !== id); setSettings({ ...settings, mandatoryExpenses: updatedExpenses }); if (familyId) await saveSettings(familyId, { ...settings, mandatoryExpenses: updatedExpenses }); setIsMandatoryModalOpen(false); }} />}
        </AnimatePresence>
      </Suspense>
    </div>
  );
}
