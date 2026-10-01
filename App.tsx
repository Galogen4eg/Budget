
import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Settings as SettingsIcon, Bell, LayoutGrid, ShoppingBag, PieChart, Calendar, AppWindow, Users, User, Settings2, Loader2, Bot, Plus, Users2, BrainCircuit, WifiOff, Wifi, RefreshCw, LayoutDashboard, Leaf, Wallet, Sparkles, MessageSquare } from 'lucide-react';
import { triggerHaptic } from './utils/haptics';
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
import ServicesHub from './components/ServicesHub';
import TerraOverview from './components/TerraOverview';
import TerraBudget from './components/TerraBudget';
import AddTransactionModal from './components/AddTransactionModal';
import EventModal from './components/EventModal';
import DrillDownModal from './components/DrillDownModal';
import ImportModal from './components/ImportModal';
import SettingsModal from './components/SettingsModal';
import DuplicatesModal from './components/DuplicatesModal';
import AIChatModal from './components/AIChatModal';
import GoalModal from './components/GoalModal';
import MandatoryExpenseModal from './components/MandatoryExpenseModal';
import FamilyChat from './components/FamilyChat';
import { MemberMarker } from './constants';
import { sendTelegramMessage as dispatchTelegramMessage } from './utils/telegram';
import { enqueueTelegramMessage, initTelegramQueueSync } from './utils/telegramQueue';

const OnboardingModal = React.lazy(() => import('./components/OnboardingModal'));
const PinScreen = React.lazy(() => import('./components/PinScreen'));
const NotificationsModal = React.lazy(() => import('./components/NotificationsModal'));

import { parseAlfaStatement } from './utils/alfaParser';
import { useTelegramSync } from './hooks/useTelegramSync';
import { auth } from './firebase';
import { isSavingsTransfer, applySavingsTransferToGoals } from './utils/savingsSync';
import { 
  addItem, updateItem, deleteItem, 
  addItemsBatch, updateItemsBatch, deleteItemsBatch, joinFamily 
} from './utils/db';

import { useAuth } from './contexts/AuthContext';
import { useData, DEFAULT_SETTINGS } from './contexts/DataContext';

const TAB_CONFIG = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { id: 'budget', label: 'Бюджет', icon: Wallet },
  { id: 'plans', label: 'Планы', icon: Calendar },
  { id: 'shopping', label: 'Покупки', icon: ShoppingBag },
  { id: 'chat', label: 'Чат', icon: MessageSquare },
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
  initial: { opacity: 0 },
  in: { opacity: 1, transition: { duration: 0.12, ease: 'easeOut' } },
  out: { opacity: 0, transition: { duration: 0.08, ease: 'easeIn' } }
};

export default function App() {
  const { user, familyId, loading: isAuthLoading, logout, enterDemoMode } = useAuth();
  const [showSlowLoadFallback, setShowSlowLoadFallback] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSlowLoadFallback(true), 2500);
    return () => clearTimeout(timer);
  }, []);
  const { 
    transactions, setTransactions,
    shoppingItems, setShoppingItems,
    loyaltyCards,
    setPantry,
    events, setEvents,
    goals, setGoals,
    members, setMembers,
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
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [pinMode, setPinMode] = useState<'unlock' | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drillDownState, setDrillDownState] = useState<{categoryId: string, merchantName?: string} | null>(null);
  const [memberFilter, setMemberFilter] = useState<string | 'all'>('all');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  
  // Offline / Network Status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showOnlineRestored, setShowOnlineRestored] = useState(false);

  // Mobile Pull-To-Refresh State
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);

  // Двусторонняя синхронизация с Telegram-ботом в реальном времени
  useTelegramSync({
    settings,
    familyId,
    setShoppingItems,
    setTransactions,
    setEvents,
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineRestored(true);
      triggerHaptic('success');
      setTimeout(() => setShowOnlineRestored(false), 3000);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (mainRef.current && mainRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0 && mainRef.current && mainRef.current.scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;
      if (diff > 0) {
        setPullY(Math.min(diff * 0.4, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullY > 55 && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('medium');
      setTimeout(() => {
        setIsRefreshing(false);
        setPullY(0);
        toast.success("Данные успешно обновлены");
      }, 700);
    } else {
      setPullY(0);
    }
    touchStartY.current = 0;
  };

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
    setCategories(prev => {
      if (prev.some(c => c.id === newCategory.id)) return prev;
      return [...prev, newCategory];
    });
    if (familyId) {
      await addItem(familyId, 'categories', newCategory);
    }
  };

  const handleTransactionSubmit = async (txData: Omit<Transaction, 'id'>) => {
    if (selectedTx) {
      // Edit
      const updatedTx = { ...txData, id: selectedTx.id };
      
      // Check if savings transfer changed
      const wasSavings = isSavingsTransfer(selectedTx);
      const isSavingsNow = isSavingsTransfer(updatedTx);
      if (wasSavings !== isSavingsNow || (isSavingsNow && selectedTx.amount !== updatedTx.amount)) {
        const delta = isSavingsNow ? (wasSavings ? updatedTx.amount - selectedTx.amount : updatedTx.amount) : -selectedTx.amount;
        if (delta !== 0) {
          const { updatedGoals, affectedGoal } = applySavingsTransferToGoals(goals, Math.abs(delta), delta > 0);
          setGoals(updatedGoals);
          if (familyId) await updateItem(familyId, 'goals', affectedGoal.id, affectedGoal);
        }
      }

      // Update Local State Immediately
      setTransactions(prev => prev.map(t => t.id === selectedTx.id ? updatedTx : t));
      
      // Update DB if available
      if (familyId) await updateItem(familyId, 'transactions', selectedTx.id, txData);
      
      setSelectedTx(null);
    } else {
      // Create
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const newTx = { ...txData, id };
      
      // If it's a transfer to savings account, automatically credit the savings goal!
      if (isSavingsTransfer(newTx)) {
        const isAddition = newTx.type === 'expense';
        const { updatedGoals, affectedGoal } = applySavingsTransferToGoals(goals, newTx.amount, isAddition);
        setGoals(updatedGoals);
        if (familyId) {
          if (goals.some(g => g.id === affectedGoal.id)) {
            await updateItem(familyId, 'goals', affectedGoal.id, affectedGoal);
          } else {
            await addItem(familyId, 'goals', affectedGoal);
          }
        }
        toast.success(`Переведено на накопительный счет: +${newTx.amount.toLocaleString('ru-RU')} ₽`);
      }

      // Update Local State Immediately
      setTransactions(prev => [newTx, ...prev]);
      
      // Update DB if available
      if (familyId) await addItem(familyId, 'transactions', newTx);
    }
  };

  const handleLearnRule = async (rule: LearnedRule) => {
    try {
      // Optimistic update for UI
      setLearnedRules(prev => [...prev, rule]);
      
      // Save to Firestore if online
      if (familyId) {
        try {
          await addItem(familyId, 'rules', rule);
        } catch (e) {
          console.warn("Could not save rule to Firestore:", e);
        }
      }

      // Automatically apply the new rule to existing transactions
      const keyword = rule.keyword.toLowerCase();
      let count = 0;
      let totalSavingsDelta = 0;
      
      const updatedTransactions = transactions.map(tx => {
        // Skip if already in the target category (unless we want to enforce renaming)
        if (tx.category === rule.categoryId && (!rule.cleanName || tx.note === rule.cleanName)) {
          return tx;
        }

        const raw = (tx.rawNote || tx.note || '').toLowerCase();
        
        if (raw.includes(keyword)) {
          count++;
          if (rule.categoryId === 'savings' || isSavingsTransfer({ category: rule.categoryId, note: rule.cleanName, rawNote: raw })) {
            totalSavingsDelta += tx.amount;
          }
          return { 
            ...tx, 
            category: rule.categoryId,
            note: rule.cleanName || tx.note // Update clean name if available
          };
        }
        return tx;
      });

      if (totalSavingsDelta > 0) {
        const { updatedGoals, affectedGoal } = applySavingsTransferToGoals(goals, totalSavingsDelta, true);
        setGoals(updatedGoals);
        if (familyId) {
          if (goals.some(g => g.id === affectedGoal.id)) {
            await updateItem(familyId, 'goals', affectedGoal.id, affectedGoal);
          } else {
            await addItem(familyId, 'goals', affectedGoal);
          }
        }
      }

      if (count > 0) {
        setTransactions(updatedTransactions);
        if (familyId) {
          try {
            const changed = updatedTransactions.filter((tx, i) => tx !== transactions[i]);
            if (changed.length > 0) {
              await updateItemsBatch(familyId, 'transactions', changed);
            }
          } catch (e) {
            console.warn("Could not sync updated transactions:", e);
          }
        }
        toast.success(`Правило сохранено. Обновлено операций: ${count}${totalSavingsDelta > 0 ? ` (в копилку: +${totalSavingsDelta.toLocaleString('ru-RU')} ₽)` : ''}`);
      } else {
        toast.success("Правило сохранено");
      }
    } catch (err) {
      console.error("Error in handleLearnRule:", err);
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

    if (!result.success && (result.code === 'NETWORK_TIMEOUT' || result.code === 'NETWORK_BLOCKED')) {
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
          const finalMessageId = result.messageId || messageIdToEdit;
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
              ...settings,
              telegramState: newState
            });
          }
          return true;
      } else {
          toast.error(result.error || "Не удалось отправить список в Telegram.");
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
          toast.error(result.error || "Не удалось отправить событие в Telegram.");
          return false;
      }
  };

  const handleSaveEvent = async (e: FamilyEvent) => {
      setEvents(prev => {
          const updated = [...prev];
          const existingIndex = updated.findIndex(ev => ev.id === e.id);
          if (existingIndex > -1) updated[existingIndex] = e;
          else updated.push(e);
          return updated;
      });
      setIsAddEventModalOpen(false);

      if (familyId) {
          const exists = events.some(ev => ev.id === e.id);
          if (exists) await updateItem(familyId, 'events', e.id, e);
          else await addItem(familyId, 'events', e);
      }
      if (settings.autoSendEventsToTelegram) handleSendEventToTelegram(e);
      toast.success('Событие сохранено');
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

  if (isAuthLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#EBEFF5] dark:bg-black gap-4 px-4 text-center select-none">
        <Loader2 className="animate-spin text-[#4A7C59] dark:text-emerald-500" size={36}/>
        {showSlowLoadFallback && (
          <div className="flex flex-col items-center gap-2 max-w-xs animate-in fade-in duration-300">
            <p className="text-xs text-gray-500 dark:text-gray-400">Синхронизация аккаунта занимает чуть дольше обычного...</p>
            <button 
              onClick={() => enterDemoMode()} 
              className="mt-2 px-4 py-2 bg-[#4A7C59] hover:bg-[#3B6547] text-white text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-95"
            >
              Открыть в автономном режиме
            </button>
          </div>
        )}
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  if (pinMode === 'unlock') return <Suspense fallback={null}><PinScreen mode="unlock" savedPin={settings.pinCode} onSuccess={() => setPinMode(null)} onForgot={() => logout()} /></Suspense>;

  return (
    <div className="h-[100dvh] w-full bg-[#F8F6F2] dark:bg-[#121214] text-graphite dark:text-white flex overflow-hidden font-sans relative selection:bg-primary/20 selection:text-primary-dark">
      <Toaster position="top-center" richColors theme={settings.theme === 'dark' ? 'dark' : 'light'} />

      {/* Mobile Top Header (only on non-overview tabs, since overview has its own topbar) */}
      {activeTab !== 'overview' && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#FAF8F5]/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-b border-surface-border dark:border-white/5 px-4 py-3 pt-safe flex justify-between items-center shrink-0">
           <div className="text-xl font-headline font-black tracking-tighter text-graphite dark:text-white flex items-center gap-2">
             <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center font-headline font-bold text-white shadow-sm shadow-[#4A7C59]/20">
               <Leaf className="w-4.5 h-4.5 text-white stroke-[2.2]" />
             </div>
             <span className="text-base font-headline font-extrabold tracking-tight">Terra</span>
           </div>
           <div className="flex gap-2">
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
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-headline font-bold text-white shadow-[0_2px_8px_rgba(74,124,89,0.25)] shrink-0 group-hover:scale-105 transition-transform">
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
            <nav aria-label="Основное меню" className={`w-full ${isSidebarExpanded ? 'px-3' : 'px-2'} space-y-2 mt-4`}>
              {TAB_CONFIG.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsSidebarExpanded(false);
                    }}
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
                title="AI Ассистент (Gemini)" 
                className="p-2 rounded-xl text-[#4A7C59] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
              >
                <Sparkles size={18} />
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
      <main 
        ref={mainRef} 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 flex flex-col min-w-0 bg-[#FAF6F0] dark:bg-[#121214] overflow-hidden relative"
      >
        {/* Offline Alert Banner */}
        {!isOnline && (
          <div className="bg-amber-500 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 shadow-sm shrink-0 transition-all z-30">
            <WifiOff size={15} className="animate-pulse" />
            <span>Офлайн-режим. Изменения сохраняются локально на вашем устройстве</span>
          </div>
        )}

        {/* Network Restored Banner */}
        {showOnlineRestored && isOnline && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 shadow-sm shrink-0 transition-all z-30">
            <Wifi size={15} />
            <span>Соединение восстановлено. Данные синхронизируются...</span>
          </div>
        )}

        {/* Pull-To-Refresh Mobile Indicator */}
        {(pullY > 0 || isRefreshing) && (
          <div 
            style={{ height: isRefreshing ? 50 : pullY }} 
            className="flex items-center justify-center overflow-hidden transition-all duration-150 shrink-0 bg-transparent text-primary dark:text-green-400"
          >
            <div className="flex items-center gap-2 text-xs font-bold bg-white dark:bg-[#1C1C1E] px-3 py-1.5 rounded-full shadow-sm border border-surface-border dark:border-white/10">
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} style={{ transform: `rotate(${pullY * 3}deg)` }} />
              <span>{isRefreshing ? "Обновление..." : pullY > 55 ? "Отпустите для обновления" : "Потяните для обновления"}</span>
            </div>
          </div>
        )}

        <div className="w-full flex-1 flex flex-col h-full overflow-hidden">
            <div className={`h-full w-full flex-1 flex-col overflow-hidden ${activeTab === 'overview' ? 'flex' : 'hidden'}`}>
                <TerraOverview 
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
                />
            </div>
            
            <div className={`h-full w-full flex-1 flex-col overflow-hidden ${activeTab === 'budget' ? 'flex' : 'hidden'}`}>
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
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenTrainModal={() => setDrillDownState({ categoryId: 'other' })}
                    onImportClick={() => document.getElementById('import-input')?.click()}
                    onToggleMandatoryPaid={handleToggleMandatoryPaid}
                    onSelectCategory={(catId) => setDrillDownState({ categoryId: catId })}
                    onEditMandatoryExpense={(expense) => {
                        setSelectedMandatoryExpense(expense);
                        setIsMandatoryModalOpen(true);
                    }}
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
            </div>
            
            <div className={`h-full w-full flex-1 flex-col overflow-hidden ${activeTab === 'plans' ? 'flex' : 'hidden'}`}>
              <FamilyPlans 
                events={events} 
                setEvents={setEvents} 
                settings={settings} 
                members={members} 
                onSendToTelegram={handleSendEventToTelegram} 
                onDeleteEvent={handleDeleteEvent}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenNotifications={() => setShowNotifications(true)}
              />
            </div>

            <div className={`h-full w-full flex-1 flex-col overflow-hidden ${activeTab === 'shopping' ? 'flex' : 'hidden'}`}>
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
            </div>

            <div className={`h-full w-full flex-1 flex-col overflow-hidden ${activeTab === 'chat' ? 'flex' : 'hidden'}`}>
              <FamilyChat />
            </div>

            <div className={`h-full w-full flex-1 flex-col overflow-hidden ${activeTab === 'services' ? 'flex' : 'hidden'}`}>
              <ServicesHub 
                initialService={targetService} 
                onClearService={() => setTargetService(null)} 
                onNavigateHome={() => setActiveTab('overview')}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar matching screenshot */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FAF7F2]/98 dark:bg-[#1C1C1E]/98 backdrop-blur-xl border-t border-[#E5E0D5] dark:border-white/10 px-2 py-2 flex justify-around items-center z-40 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
         {TAB_CONFIG.map(tab => {
             const isActive = activeTab === tab.id;
             return (
                <button 
                  key={tab.id} 
                  onClick={() => {
                    triggerHaptic('light');
                    if (tab.id === 'services') {
                      setTargetService('menu');
                    }
                    setActiveTab(tab.id);
                  }} 
                  className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                    isActive ? 'text-[#4A7C59] dark:text-green-400 font-bold' : 'text-graphite-muted dark:text-gray-400 hover:text-graphite'
                  }`}
                >
                    <span className="relative z-10 flex items-center justify-center">
                      {React.createElement(tab.icon, { size: 21, strokeWidth: isActive ? 2.3 : 1.8 })}
                    </span>
                    <span className="text-[11px] mt-0.5 font-medium">{tab.label}</span>
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
                settings={settings} 
                members={members} 
                categories={categories} 
                learnedRules={learnedRules}
                initialTransaction={selectedTx} 
                onLearnRule={handleLearnRule} 
                onAddCategory={handleAddCategory} 
                transactions={transactions} 
                onDelete={async (id) => { 
                  // Optimistic delete
                  setTransactions(prev => prev.filter(t => t.id !== id));
                  if (familyId) await deleteItem(familyId, 'transactions', id); 
                  setIsAddModalOpen(false); 
                  setSelectedTx(null);
                  toast.success('Операция удалена');
                }} 
            />}
            {isSettingsOpen && <SettingsModal 
                key="settings-modal"
                settings={settings} 
                onClose={() => setIsSettingsOpen(false)} 
                onUpdate={async (s) => await updateSettings(s)} 
                onReset={handleResetSettings} 
                savingsRate={savingsRate} 
                setSavingsRate={setSavingsRate} 
                members={members} 
                onUpdateMembers={async (m) => { 
                  setMembers(m);
                  try {
                    localStorage.setItem('local_members', JSON.stringify(m));
                  } catch (storageErr) {
                    console.warn('Failed to save members to localStorage:', storageErr);
                  }
                  if (familyId) {
                    try {
                      await updateItemsBatch(familyId, 'members', m);
                    } catch (cloudErr) {
                      console.error('Failed to sync members to cloud:', cloudErr);
                    }
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
                key="ai-chat-modal" 
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
                    if (!itemsToImport || itemsToImport.length === 0) {
                      setImportPreview(null);
                      toast.info("Импорт отменен (нет операций)");
                      return;
                    }

                    const prepared = itemsToImport.map(item => {
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
                    
                    // Immediately close preview modal & update local transactions
                    setImportPreview(null); 
                    setTransactions(prev => [...prepared, ...prev]);

                    // Check for savings transfers in imported items
                    const savingsTransfers = prepared.filter(t => isSavingsTransfer(t));
                    let totalImportedSavings = 0;
                    savingsTransfers.forEach(t => {
                      totalImportedSavings += (t.type === 'expense' ? t.amount : -t.amount);
                    });

                    if (totalImportedSavings > 0) {
                      const { updatedGoals, affectedGoal } = applySavingsTransferToGoals(goals, totalImportedSavings, true);
                      setGoals(updatedGoals);
                      if (familyId) {
                        if (goals.some(g => g.id === affectedGoal.id)) {
                          await updateItem(familyId, 'goals', affectedGoal.id, affectedGoal);
                        } else {
                          await addItem(familyId, 'goals', affectedGoal);
                        }
                      }
                      toast.success(`Импортировано ${prepared.length} операций (в копилку: +${totalImportedSavings.toLocaleString('ru-RU')} ₽)`);
                    } else {
                      toast.success(`Импортировано ${prepared.length} операций`); 
                    }

                    // Sync to Firestore if in family mode
                    if (familyId) {
                      await addItemsBatch(familyId, 'transactions', prepared);
                    }
                  } catch (err: any) {
                    console.error("Import error:", err);
                    setImportPreview(null);
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
                learnedRules={learnedRules}
                onAddCategory={handleAddCategory} 
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
                    onSave={(e) => {
                        handleSaveEvent(e);
                        setIsAddEventModalOpen(false);
                        setSelectedEvent(null);
                    }}
                    onDelete={(id) => {
                        handleDeleteEvent(id);
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