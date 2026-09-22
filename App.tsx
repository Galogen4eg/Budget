
import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Settings as SettingsIcon, Bell, LayoutGrid, ShoppingBag, PieChart, Calendar, AppWindow, Users, User, Settings2, Loader2, Bot, Plus, Users2, BrainCircuit } from 'lucide-react';
import { 
  Transaction, ShoppingItem, FamilyMember, PantryItem, MandatoryExpense, Category, LearnedRule, WidgetConfig, AppNotification, FamilyEvent
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
import TerraOverview from './components/TerraOverview';
import TerraBudget from './components/TerraBudget';
import AddTransactionModal from './components/AddTransactionModal';
import { MemberMarker } from './constants';

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
    setLearnedRules, learnedRules,
    filteredTransactions,
    totalBalance,
    currentMonthSpent,
    savingsRate, setSavingsRate,
    budgetMode, setBudgetMode,
    notifications
  } = useData();

  const [activeTab, setActiveTab] = useState('overview');
  const [targetService, setTargetService] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isMandatoryModalOpen, setIsMandatoryModalOpen] = useState(false);
  const [selectedMandatoryExpense, setSelectedMandatoryExpense] = useState<MandatoryExpense | null>(null);
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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  
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
      const allExpenses = settings.mandatoryExpenses || [];
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
          if (!myMemberId) return allExpenses; 
          return allExpenses.filter(e => !e.memberId || e.memberId === myMemberId);
      }
  }, [settings.mandatoryExpenses, budgetMode, members, user?.uid, memberFilter]);

  useEffect(() => {
    if (user?.uid && (!settings.widgets || settings.widgets.length === 0)) {
        const updatedSettings = { ...settings, widgets: DEFAULT_WIDGET_CONFIGS };
        updateSettings(updatedSettings);
    }
  }, [user?.uid]);

  useEffect(() => {
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const handleTransactionSubmit = async (txData: Omit<Transaction, 'id'>) => {
    if (selectedTx) {
      // Edit
      const updatedTx = { ...txData, id: selectedTx.id };
      
      // Update Local State Immediately
      setTransactions(prev => prev.map(t => t.id === selectedTx.id ? updatedTx : t));
      
      // Update DB if available
      if (familyId) await updateItem(familyId, 'transactions', selectedTx.id, txData);
      
      setSelectedTx(null);
    } else {
      // Create
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const newTx = { ...txData, id };
      
      // Update Local State Immediately
      setTransactions(prev => [newTx, ...prev]);
      
      // Update DB if available
      if (familyId) await addItem(familyId, 'transactions', newTx);
    }
  };

  const handleLearnRule = async (rule: LearnedRule) => {
      // Optimistic update for UI
      setLearnedRules(prev => [...prev, rule]);
      
      // Save to Firestore if online
      if (familyId) {
          await addItem(familyId, 'rules', rule);
      }

      // Automatically apply the new rule to existing transactions
      const keyword = rule.keyword.toLowerCase();
      let count = 0;
      
      const updatedTransactions = transactions.map(tx => {
          // Skip if already in the target category (unless we want to enforce renaming)
          if (tx.category === rule.categoryId && (!rule.cleanName || tx.note === rule.cleanName)) {
              return tx;
          }

          const raw = (tx.rawNote || tx.note || '').toLowerCase();
          
          if (raw.includes(keyword)) {
              count++;
              return { 
                  ...tx, 
                  category: rule.categoryId,
                  note: rule.cleanName || tx.note // Update clean name if available
              };
          }
          return tx;
      });

      if (count > 0) {
          setTransactions(updatedTransactions);
          if (familyId) {
              const changed = updatedTransactions.filter((tx, i) => tx !== transactions[i]);
              if (changed.length > 0) {
                  await updateItemsBatch(familyId, 'transactions', changed);
              }
          }
          toast.success(`Правило сохранено. Обновлено операций: ${count}`);
      } else {
          toast.success("Правило сохранено");
      }
  };

  const handleEditTransaction = (tx: Transaction) => { setSelectedTx(tx); setIsAddModalOpen(true); };

  const handleToggleMandatoryPaid = (expenseId: string) => {
    const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    const currentManuals = settings.manualPaidExpenses || {};
    const monthIds = currentManuals[currentMonthKey] || [];
    const isManuallyPaid = monthIds.includes(expenseId);

    const newMonthIds = isManuallyPaid
      ? monthIds.filter(id => id !== expenseId)
      : [...monthIds, expenseId];

    updateSettings({
      ...settings,
      manualPaidExpenses: {
        ...currentManuals,
        [currentMonthKey]: newMonthIds
      }
    });
  };

  const handleResetSettings = async () => {
    await updateSettings(DEFAULT_SETTINGS);
    toast.success("Настройки сброшены к значениям по умолчанию");
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
        const currentUserMember = members.find(m => m.userId === user?.uid) || members[0];
        const memberId = currentUserMember ? currentUserMember.id : 'unknown';
        const data = await parseAlfaStatement(file, settings.alfaMapping, memberId, learnedRules, categories, transactions);
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

  // Robust Telegram Sender with Retries
  const sendTelegramMessage = async (text: string, messageIdToEdit?: number) => {
      if (!settings.telegramBotToken || !settings.telegramChatId) {
          toast.error("Telegram не настроен. Проверьте настройки.");
          return { success: false };
      }

      const token = settings.telegramBotToken;
      const chatId = settings.telegramChatId;
      const maxAttempts = 3;

      // Wrap sending logic in a loop for retries
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
              // 1. Try Editing Existing Message (if ID provided)
              if (messageIdToEdit) {
                  try {
                      const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ chat_id: chatId, message_id: messageIdToEdit, text, parse_mode: 'Markdown' })
                      });
                      const data = await res.json();
                      if (data.ok) return { success: true, messageId: messageIdToEdit };
                  } catch (e) {
                      console.warn(`Telegram Edit Failed (Attempt ${attempt}):`, e);
                      // Don't retry just for edit failure, proceed to send new
                  }
              }

              // 2. Try Sending New Message (Standard JSON)
              try {
                  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
                  });
                  const data = await res.json();
                  if (data.ok) return { success: true, messageId: data.result.message_id };
                  else throw new Error(data.description || "API Error");
              } catch (e) {
                  console.warn(`Telegram JSON Send Failed (Attempt ${attempt}):`, e);
                  
                  // 3. Fallback: No-CORS Simple Request (Only if standard failed)
                  // Note: We cannot verify success here, so if this "succeeds" (no network error), we break loop.
                  // Only try this if network is working but CORS is blocking (browsers).
                  try {
                      const params = new URLSearchParams();
                      params.append('chat_id', chatId);
                      params.append('text', text);
                      params.append('parse_mode', 'Markdown');
                      
                      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                          method: 'POST',
                          mode: 'no-cors',
                          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                          body: params
                      });
                      
                      // Assume success since request was sent without network error
                      return { success: true, messageId: null }; 
                  } catch (fallbackErr) {
                      throw fallbackErr; // Throw to trigger outer loop retry logic
                  }
              }

          } catch (e) {
              console.error(`Telegram Send Failed (Attempt ${attempt}/${maxAttempts}):`, e);
              // Wait 2 seconds before retrying if not the last attempt
              if (attempt < maxAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 2000));
              }
          }
      }

      return { success: false };
  };

  const handleSendShoppingToTelegram = async (items: ShoppingItem[]) => {
      const activeItems = items.filter(i => !i.completed);
      const dateStr = new Date().toLocaleDateString('ru-RU');
      let text = settings.shoppingTemplate || `🛒 *Список покупок* ({date})\n\n{items}`;
      
      let itemsList = activeItems.map(i => `• ${i.title}${i.amount ? ` (${i.amount} ${i.unit})` : ''}`).join('\n');
      if (activeItems.length === 0) itemsList = "✅ Все куплено!";
      
      text = text.replace('{date}', dateStr)
                 .replace('{items}', itemsList)
                 .replace('{total}', activeItems.length.toString());

      const loadingToast = toast.loading('Отправка в Telegram...');
      
      // Check if we can edit previous message
      const todayStr = new Date().toDateString();
      const lastState = settings.telegramState;
      const messageIdToEdit = (lastState && lastState.lastShoppingDate === todayStr) ? lastState.lastShoppingMessageId : undefined;

      const result = await sendTelegramMessage(text, messageIdToEdit);
      
      toast.dismiss(loadingToast);
      
      if (result.success) {
          toast.success("Список отправлен!");
          // Save state only if we got a valid ID back (Standard fetch)
          // If we used no-cors fallback, messageId is null, so next time we send a new one.
          if (result.messageId) {
              await updateSettings({
                  ...settings,
                  telegramState: {
                      lastShoppingMessageId: result.messageId,
                      lastShoppingDate: todayStr
                  }
              });
          }
          return true;
      } else {
          toast.error("Не удалось отправить. Проверьте интернет и настройки бота.");
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

      // Comprehensive Data Map
      const dataMap: Record<string, string> = {
          '{title}': event.title,
          '{date}': dateStr,
          '{time}': event.time,
          '{duration}': (event.duration || 1).toString(),
          '{desc}': event.description || '', // Legacy support
          '{description}': event.description || '', // Robust support
          '{members}': memberNames, 
          '{checklist}': checklistStr 
      };

      let text = template;

      // 1. Line Removal Logic for empty optional fields
      // Fields that, if empty, should cause their line to be removed
      const optionalFields = ['{desc}', '{description}', '{members}', '{checklist}'];

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
      const result = await sendTelegramMessage(text);
      toast.dismiss(loadingToast);

      if (result.success) {
          toast.success("Событие отправлено!");
          return true;
      } else {
          toast.error("Ошибка отправки события");
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

      const ids = toDelete.map(t => t.id);
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      if (familyId) await deleteItemsBatch(familyId, 'transactions', ids);
      toast.success(`Удалено ${ids.length} операций`);
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
      setGoals(prev => prev.filter(g => g.id !== id));
      if (familyId) await deleteItem(familyId, 'goals', id);
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
                      <CategoryAnalysisWidget transactions={filteredTransactions} categories={categories} settings={settings} onClick={() => setActiveTab('budget')} />
                  </div>
              );
          default:
              return null;
      }
  };

  const activeShoppingCount = useMemo(() => {
    return (shoppingItems || []).filter(i => !i.completed).length;
  }, [shoppingItems]);

  if (isAuthLoading) return <div className="flex h-screen items-center justify-center bg-[#EBEFF5] dark:bg-black"><Loader2 className="animate-spin text-blue-500" size={32}/></div>;
  if (!user) return <LoginScreen />;
  if (pinMode === 'unlock') return <Suspense fallback={null}><PinScreen mode="unlock" savedPin={settings.pinCode} onSuccess={() => setPinMode(null)} onForgot={() => logout()} /></Suspense>;

  return (
    <div className="h-[100dvh] w-full bg-[#F8F6F2] dark:bg-[#121214] text-graphite dark:text-white flex overflow-hidden font-sans relative selection:bg-primary/20 selection:text-primary-dark">
      <Toaster position="top-center" richColors theme={settings.theme === 'dark' ? 'dark' : 'light'} />
      <FeedbackTool />

      {/* Mobile Top Header (only on non-overview tabs, since overview has its own topbar) */}
      {activeTab !== 'overview' && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#FAF8F5]/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-b border-surface-border dark:border-white/5 px-4 py-3 pt-safe flex justify-between items-center shrink-0">
           <div className="text-xl font-headline font-black tracking-tighter text-graphite dark:text-white flex items-center gap-2">
             <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center font-headline font-bold text-white text-xs shadow-sm shadow-[#4A7C59]/20">
               С+
             </div>
             <span className="text-sm font-headline font-bold">Семья+</span>
           </div>
           <div className="flex gap-2">
               <button onClick={() => setIsAIChatOpen(true)} className="p-2 bg-surface-subtle dark:bg-[#2C2C2E] rounded-xl active:scale-90 transition-transform text-primary"><Bot size={18} /></button>
               <button onClick={() => setShowNotifications(true)} className="relative p-2 bg-surface-subtle dark:bg-[#2C2C2E] rounded-xl active:scale-90 transition-transform text-graphite-muted"><Bell size={18} />{unreadNotificationsCount > 0 && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-black"/>}</button>
               <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-surface-subtle dark:bg-[#2C2C2E] rounded-xl active:scale-90 transition-transform text-graphite-muted"><SettingsIcon size={18} /></button>
           </div>
        </div>
      )}

      {/* BEGIN: LeftSidebar (Desktop Terra - Collapsed by default) */}
      <aside className={`hidden md:flex ${isSidebarExpanded ? 'w-56' : 'w-[72px]'} bg-[#FAF8F5] dark:bg-[#1C1C1E] border-r border-surface-border dark:border-white/5 flex-col justify-between shrink-0 z-30 transition-all duration-300 select-none`}>
        <div className="flex flex-col h-full justify-between items-center w-full py-5">
          <div className="flex flex-col w-full items-center">
            {/* Logo & Expand/Collapse Toggle */}
            <div className={`flex items-center ${isSidebarExpanded ? 'px-4 justify-between w-full pb-4' : 'justify-center pb-4'} border-b border-surface-border dark:border-white/5`}>
              <button 
                onClick={() => setIsSidebarExpanded(prev => !prev)}
                className="flex items-center gap-3 cursor-pointer group text-left"
                title={isSidebarExpanded ? "Свернуть меню" : "Развернуть меню"}
              >
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-headline font-bold text-white text-lg shadow-[0_2px_8px_rgba(74,124,89,0.25)] shrink-0 group-hover:scale-105 transition-transform">
                  С+
                </div>
                {isSidebarExpanded && (
                  <div className="flex flex-col">
                    <span className="text-sm font-headline font-bold tracking-tight text-graphite dark:text-white flex items-center gap-1.5">
                      Семья+
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                    </span>
                    <span className="text-[11px] text-graphite-muted dark:text-gray-400 font-medium">Уютный дом</span>
                  </div>
                )}
              </button>
            </div>

            {/* Navigation Links */}
            <nav aria-label="Основное меню" className={`w-full ${isSidebarExpanded ? 'px-3' : 'px-2'} space-y-2 mt-4`}>
              {TAB_CONFIG.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.label}
                    className={`w-full flex items-center ${isSidebarExpanded ? 'gap-3 px-3.5 py-2.5 rounded-xl justify-start' : 'justify-center w-11 h-11 mx-auto rounded-xl'} transition-all cursor-pointer group ${
                      isActive 
                        ? 'bg-primary text-white font-bold shadow-[0_2px_10px_rgba(74,124,89,0.3)]' 
                        : 'text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white hover:bg-surface-subtle dark:hover:bg-[#2C2C2E] font-medium'
                    }`}
                  >
                    <span className="shrink-0 relative">
                      {React.createElement(tab.icon, { 
                        size: 21, 
                        className: isActive ? 'text-white' : 'group-hover:text-primary transition group-hover:scale-105' 
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
            </nav>
          </div>

          {/* Sidebar Footer: Quick Actions */}
          <div className={`w-full ${isSidebarExpanded ? 'px-3' : 'px-2'} pt-3 border-t border-surface-border dark:border-white/5`}>
            {/* Quick Actions */}
            <div className={`flex items-center ${isSidebarExpanded ? 'justify-around w-full' : 'flex-col gap-1 w-full'}`}>
              <button 
                type="button"
                onClick={() => setIsAIChatOpen(true)} 
                title="AI Помощник" 
                className="p-2 rounded-xl text-graphite-muted dark:text-gray-400 hover:text-primary hover:bg-surface-subtle dark:hover:bg-[#2C2C2E] transition cursor-pointer"
              >
                <Bot size={18} />
              </button>
              <button 
                type="button"
                onClick={() => setShowNotifications(true)} 
                title="Уведомления" 
                className="relative p-2 rounded-xl text-graphite-muted dark:text-gray-400 hover:text-primary hover:bg-surface-subtle dark:hover:bg-[#2C2C2E] transition cursor-pointer"
              >
                <Bell size={18} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#1C1C1E]" />
                )}
              </button>
              <button 
                type="button"
                onClick={() => setIsSettingsOpen(true)} 
                title="Настройки" 
                className="p-2 rounded-xl text-graphite-muted dark:text-gray-400 hover:text-primary hover:bg-surface-subtle dark:hover:bg-[#2C2C2E] transition cursor-pointer"
              >
                <SettingsIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>
      {/* END: LeftSidebar */}

      {/* Main Content Area */}
      <main ref={mainRef} className={`flex-1 flex flex-col min-w-0 bg-[#F8F6F2] dark:bg-[#121214] overflow-hidden ${activeTab === 'overview' ? '' : 'overflow-y-auto no-scrollbar p-4 md:p-8 pt-16 md:pt-8 pb-32 md:pb-8'}`}>
        <div className={`w-full flex-1 flex flex-col ${activeTab === 'overview' ? 'h-full' : 'gap-4 h-auto'}`}>
            <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
                <motion.div key="overview" initial="initial" animate="in" exit="out" variants={pageVariants} className="h-full w-full flex-1 flex flex-col overflow-hidden">
                    <TerraOverview 
                        onOpenAddModal={() => setIsAddModalOpen(true)}
                        onOpenAIChat={() => setIsAIChatOpen(true)}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        onEditTransaction={handleEditTransaction}
                        onNavigateTab={(tabId) => setActiveTab(tabId)}
                        onDrillDown={(catId) => setDrillDownState({ categoryId: catId })}
                    />
                </motion.div>
            )}
            
            {activeTab === 'budget' && (
                <motion.div key="budget" initial="initial" animate="in" exit="out" variants={pageVariants} className="h-full overflow-y-auto no-scrollbar">
                    <TerraBudget
                        transactions={transactions}
                        categories={categories}
                        members={members}
                        mandatoryExpenses={settings.mandatoryExpenses || []}
                        settings={settings}
                        currentMonth={currentMonth}
                        onMonthChange={setCurrentMonth}
                        onEditTransaction={handleEditTransaction}
                        onOpenAddModal={() => setIsAddModalOpen(true)}
                        onOpenTrainModal={() => setDrillDownState({ categoryId: 'other' })}
                        onImportClick={() => document.getElementById('import-input')?.click()}
                        onToggleMandatoryPaid={handleToggleMandatoryPaid}
                        onQuickAddTransaction={(title, amount, date, memberId) => {
                            const dateStr = date.toISOString().split('T')[0];
                            handleTransactionSubmit({
                                amount,
                                type: 'expense',
                                category: 'other',
                                memberId,
                                note: title,
                                date: dateStr
                            });
                            toast.success(`Операция "${title}" добавлена на ${amount.toLocaleString('ru-RU')} ₽`);
                        }}
                    />
                </motion.div>
            )}
            
            {activeTab === 'plans' && <motion.div key="plans" initial="initial" animate="in" exit="out" variants={pageVariants} className="h-full overflow-y-auto no-scrollbar"><FamilyPlans events={events} setEvents={setEvents} settings={settings} members={members} onSendToTelegram={handleSendEventToTelegram} onDeleteEvent={handleDeleteEvent} /></motion.div>}
            {activeTab === 'shopping' && <motion.div key="shopping" initial="initial" animate="in" exit="out" variants={pageVariants} className="h-full overflow-y-auto no-scrollbar"><ShoppingList items={shoppingItems} setItems={setShoppingItems} settings={settings} members={members} onMoveToPantry={handleMoveToPantry} onSendToTelegram={handleSendShoppingToTelegram} /></motion.div>}
            {activeTab === 'services' && <motion.div key="services" initial="initial" animate="in" exit="out" variants={pageVariants} className="h-full overflow-y-auto no-scrollbar"><ServicesHub initialService={targetService} onClearService={() => setTargetService(null)} /></motion.div>}
            </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-[#FAF8F5]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border border-surface-border dark:border-white/10 rounded-2xl shadow-xl p-1.5 flex justify-around items-center z-40">
         {TAB_CONFIG.map(tab => {
             const isActive = activeTab === tab.id;
             return (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`relative flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all ${
                    isActive ? 'text-primary dark:text-green-400 font-bold bg-primary-light dark:bg-primary/20' : 'text-graphite-muted dark:text-gray-400'
                  }`}
                >
                    <span className="relative z-10">{React.createElement(tab.icon, { size: 20, strokeWidth: isActive ? 2.5 : 2 })}</span>
                    <span className="text-[10px] mt-0.5">{tab.label}</span>
                    {tab.id === 'shopping' && activeShoppingCount > 0 && (
                      <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-primary" />
                    )}
                </button>
             );
         })}
      </nav>

      <Suspense fallback={null}>
        <AnimatePresence mode="wait">
            {isAddModalOpen && <AddTransactionModal key={selectedTx ? `edit-tx-${selectedTx.id}` : 'add-tx-modal'} onClose={() => { setIsAddModalOpen(false); setSelectedTx(null); }} onSubmit={handleTransactionSubmit} settings={settings} members={members} categories={categories} initialTransaction={selectedTx} onLearnRule={handleLearnRule} transactions={transactions} onDelete={async (id) => { 
                // Optimistic delete
                setTransactions(prev => prev.filter(t => t.id !== id));
                if (familyId) await deleteItem(familyId, 'transactions', id); 
                setIsAddModalOpen(false); 
                setSelectedTx(null);
                toast.success('Операция удалена');
            }} />}
            {isSettingsOpen && <SettingsModal 
                key="settings-modal"
                settings={settings} 
                onClose={() => setIsSettingsOpen(false)} 
                onUpdate={async (s) => await updateSettings(s)} 
                onReset={handleResetSettings} 
                savingsRate={savingsRate} 
                setSavingsRate={setSavingsRate} 
                members={members} 
                onUpdateMembers={async (m) => { if (familyId) await updateItemsBatch(familyId, 'members', m); }} 
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
            {isAIChatOpen && <AIChatModal key="ai-chat-modal" onClose={() => setIsAIChatOpen(false)} />}
            {drillDownState && <DrillDownModal 
                key={`drilldown-${drillDownState.categoryId || drillDownState.merchantName}`}
                categoryId={drillDownState.categoryId} 
                merchantName={drillDownState.merchantName} 
                onClose={() => setDrillDownState(null)} 
                transactions={filteredTransactions} 
                setTransactions={setTransactions} 
                settings={settings} 
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
                    if (!itemsToImport || itemsToImport.length === 0) return;

                    const prepared = itemsToImport.map(item => {
                      const { tempId, isVerified, rememberRule, mcc, accountMask, ...clean } = item as any;
                      return {
                        ...clean,
                        id: clean.id || (Date.now().toString() + Math.random().toString(36).substring(2, 7))
                      };
                    });
                    
                    // Immediately close preview modal & update local transactions
                    setImportPreview(null); 
                    setTransactions(prev => [...prepared, ...prev]);
                    toast.success(`Импортировано ${prepared.length} операций`); 

                    // Sync to Firestore if in family mode
                    if (familyId) {
                      await addItemsBatch(familyId, 'transactions', prepared);
                    }
                  } catch (err: any) {
                    console.error("Import error:", err);
                    toast.error("Ошибка сохранения: " + (err.message || String(err)));
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
                onAddCategory={() => {}} 
                members={members} 
              />
            )}
            {showNotifications && <NotificationsModal key="notifications-modal" onClose={() => setShowNotifications(false)} />}
            
            {isMandatoryModalOpen && <MandatoryExpenseModal 
                key={selectedMandatoryExpense ? `edit-exp-${selectedMandatoryExpense.id}` : 'mandatory-exp-modal'}
                expense={selectedMandatoryExpense} 
                onClose={() => { setIsMandatoryModalOpen(false); setSelectedMandatoryExpense(null); }} 
                settings={settings} 
                members={members} 
                onSave={async (e) => { 
                    try {
                        let updated;
                        if (selectedMandatoryExpense) {
                            const targetId = selectedMandatoryExpense.id;
                            updated = (settings.mandatoryExpenses || []).map(ex => {
                                if ((targetId && ex.id === targetId) || ex === selectedMandatoryExpense) {
                                    return { ...e, id: targetId || e.id };
                                }
                                return ex;
                            });
                        } else {
                            updated = [...(settings.mandatoryExpenses || []), { ...e, id: e.id || Date.now().toString() }];
                        }
                        await updateSettings({ ...settings, mandatoryExpenses: updated }); 
                        setIsMandatoryModalOpen(false); 
                        setSelectedMandatoryExpense(null);
                    } catch (error: any) {
                        toast.error('Ошибка при сохранении: ' + (error.message || String(error)));
                    }
                }} 
                onDelete={async (id) => {
                    try {
                        const updated = (settings.mandatoryExpenses || []).filter(ex => {
                            if (selectedMandatoryExpense && ex === selectedMandatoryExpense) return false;
                            return ex.id !== id;
                        });
                        await updateSettings({ ...settings, mandatoryExpenses: updated });
                        setIsMandatoryModalOpen(false);
                        setSelectedMandatoryExpense(null);
                    } catch (error: any) {
                        toast.error('Ошбика при удалении: ' + (error.message || String(error)));
                    }
                }}
            />}
            
            {isDuplicatesOpen && <DuplicatesModal key="duplicates-modal" transactions={transactions} onClose={() => setIsDuplicatesOpen(false)} onDelete={handleBatchDelete} onIgnore={async (pairs) => { const ignored = [...(settings.ignoredDuplicatePairs || []), ...pairs]; await updateSettings({ ...settings, ignoredDuplicatePairs: ignored }); }} ignoredPairs={settings.ignoredDuplicatePairs} />}
            {isGoalModalOpen && <GoalModal key={editingGoal ? `edit-goal-${editingGoal.id}` : 'goal-modal'} goal={editingGoal} onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }} onSave={handleGoalSave} onDelete={editingGoal ? () => handleGoalDelete(editingGoal.id) : undefined} settings={settings} />}
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