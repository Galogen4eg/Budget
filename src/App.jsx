import React, { useState, useRef, useEffect } from 'react';
import {
  Settings, Wallet, ShoppingBag, Calendar as CalendarIcon, Trophy, FileText,
  TrendingUp, TrendingDown, Plus, Edit3, Trash2, Eye as EyeIcon, Bell,
  MessageSquare, Database, Download, Upload, X, List, Clock, Users, Bot
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const modalRef = useRef(null);
  const [planningView, setPlanningView] = useState('month');

  // === Модальные состояния ===
  const [editTransactionModal, setEditTransactionModal] = useState(null);
  const [addTransactionModal, setAddTransactionModal] = useState(false);
  const [editTaskModal, setEditTaskModal] = useState(null);
  const [addTaskModal, setAddTaskModal] = useState(false);
  const [editBudgetCategoryModal, setEditBudgetCategoryModal] = useState(null);
  const [addBudgetCategoryModal, setAddBudgetCategoryModal] = useState(false);
  const [editGoalModal, setEditGoalModal] = useState(null);
  const [addGoalModal, setAddGoalModal] = useState(false);
  const [editBillModal, setEditBillModal] = useState(null);
  const [addBillModal, setAddBillModal] = useState(false);
  const [editShoppingItemModal, setEditShoppingItemModal] = useState(null);
  const [addShoppingItemModal, setAddShoppingItemModal] = useState(false);
  const [editMemberModal, setEditMemberModal] = useState(null);
  const [addMemberModal, setAddMemberModal] = useState(false);

  // === Настройки ===
  const [settings, setSettings] = useState({
    roomName: 'Семейный бюджет',
    initialBalance: 0,
    savingsPercent: 10,
    visibility: {
      overview: true,
      budget: true,
      shopping: true,
      planning: true,
      goals: true,
      bills: true,
    },
    notifications: {
      push: true,
      email: true,
      telegram: true,
      budgets: true,
      goals: true,
      bills: true,
      shopping: true,
    },
    telegram: {
      botToken: '',
      chatId: '',
      groupId: '',
      enabled: false,
    },
    members: [
      { id: 1, name: 'Участник 1', color: '#8366f1' },
      { id: 2, name: 'Участник 2', color: '#10b981' },
    ]
  });

  // === Данные ===
  const [transactions, setTransactions] = useState([
    { id: 1, title: 'Зарплата', date: '5 июня', amount: 50000, type: 'income' },
    { id: 2, title: 'Продукты', date: '15 июня', amount: -1200, type: 'expense' },
    { id: 3, title: 'Фриланс', date: '20 июня', amount: 35000, type: 'income' },
  ]);

  const [dailyTasks, setDailyTasks] = useState([
    { id: 1, text: 'Купить продукты', done: false, assignedTo: 1 },
    { id: 2, text: 'Оплатить интернет', done: true, assignedTo: 2 },
    { id: 3, text: 'Перевести деньги на сбережения', done: false, assignedTo: 1 },
  ]);

  const [shoppingList, setShoppingList] = useState([
    { id: 1, name: 'Молоко', checked: false },
    { id: 2, name: 'Хлеб', checked: true },
    { id: 3, name: 'Яйца', checked: false },
    { id: 4, name: 'Сыр', checked: false },
  ]);

  const [budgetData, setBudgetData] = useState([
    { id: 1, category: 'Продукты', planned: 15000, spent: 12400 },
    { id: 2, category: 'Транспорт', planned: 5000, spent: 4800 },
    { id: 3, category: 'Развлечения', planned: 3000, spent: 1200 },
    { id: 4, category: 'Одежда', planned: 4000, spent: 0 },
    { id: 5, category: 'Подарки', planned: 2000, spent: 0 },
  ]);

  const [goals, setGoals] = useState([
    { id: 1, name: 'Отпуск', target: 100000, saved: 45000 },
    { id: 2, name: 'Ноутбук', target: 80000, saved: 32000 },
  ]);

  const [bills, setBills] = useState([
    { id: 1, name: 'Интернет', amount: 800, due: '15.06', status: 'paid' },
    { id: 2, name: 'Электричество', amount: 1200, due: '25.06', status: 'pending' },
    { id: 3, name: 'Вода', amount: 650, due: '28.06', status: 'pending' },
  ]);

  // === Планирование ===
  const now = new Date(2025, 5, 15); // 15 июня 2025
  const [selectedDate, setSelectedDate] = useState(now);

  // === Вспомогательные функции для работы с датами ===
  const safeGetDate = (date) => {
    if (!date || !(date instanceof Date)) return new Date();
    return date;
  };

  const getEventsForDay = (day) => {
    if (day === 5) return [{ id: 1, title: 'Зарплата', amount: 50000, type: 'income' }];
    if (day === 15) return [{ id: 2, title: 'Продукты', amount: -1200, type: 'expense' }];
    if (day === 20) return [{ id: 3, title: 'Фриланс', amount: 35000, type: 'income' }];
    return [];
  };

  const generateCalendarDays = (year, month) => {
    try {
      const y = year ?? now.getFullYear();
      const m = month ?? now.getMonth();
      
      const firstDay = new Date(y, m, 1).getDay();
      const startOffset = firstDay === 0 ? 6 : firstDay - 1;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const prevMonthDays = new Date(y, m, 0).getDate();

      const days = [];
      // Предыдущий месяц
      for (let i = startOffset; i > 0; i--) {
        days.push({ day: prevMonthDays - i + 1, current: false, events: [] });
      }
      // Текущий месяц
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(y, m, d);
        days.push({ day: d, current: true, events: getEventsForDay(d), date });
      }
      // Следующий месяц
      while (days.length < 42) {
        const nextDay = days.length - daysInMonth - startOffset + 1;
        days.push({ 
          day: nextDay, 
          current: false, 
          events: [], 
          date: new Date(y, m + 1, nextDay) 
        });
      }
      return days;
    } catch (error) {
      console.error('Error generating calendar days:', error);
      return Array(42).fill().map((_, i) => ({
        day: i + 1,
        current: i < 31,
        events: [],
        date: new Date(now.getFullYear(), now.getMonth(), i + 1)
      }));
    }
  };

  // Получаем текущий год и месяц из выбранной даты
  const selectedYear = safeGetDate(selectedDate).getFullYear();
  const selectedMonth = safeGetDate(selectedDate).getMonth();
  const calendarDays = generateCalendarDays(selectedYear, selectedMonth);
  const monthName = new Date(selectedYear, selectedMonth).toLocaleString('ru', { 
    month: 'long', 
    year: 'numeric' 
  });

  // === Функции для недельного режима ===
  const getWeekDates = (date) => {
    try {
      const safeDate = safeGetDate(date);
      const day = safeDate.getDay() || 7;
      const diff = safeDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(safeDate);
      monday.setDate(diff);
      
      return Array.from({ length: 7 }, (_, i) => {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        return dayDate;
      });
    } catch (error) {
      console.error('Error getting week dates:', error);
      const today = new Date();
      const day = today.getDay() || 7;
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today);
      monday.setDate(diff);
      
      return Array.from({ length: 7 }, (_, i) => {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        return dayDate;
      });
    }
  };

  const weekDates = getWeekDates(selectedDate);
  const dayEvents = calendarDays.find(day => 
    day.date?.toDateString() === safeGetDate(selectedDate).toDateString()
  )?.events || [];

  // === Обработчики модальных окон ===
  const closeModal = () => {
    setEditTransactionModal(null);
    setAddTransactionModal(false);
    setEditTaskModal(null);
    setAddTaskModal(false);
    setEditBudgetCategoryModal(null);
    setAddBudgetCategoryModal(false);
    setEditGoalModal(null);
    setAddGoalModal(false);
    setEditBillModal(null);
    setAddBillModal(false);
    setEditShoppingItemModal(null);
    setAddShoppingItemModal(false);
    setEditMemberModal(null);
    setAddMemberModal(false);
  };

  // === Функции редактирования и добавления ===
  const handleEditTransaction = (transaction) => {
    setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
    setEditTransactionModal(null);
  };

  const handleAddTransaction = (transaction) => {
    setTransactions(prev => [...prev, { ...transaction, id: Date.now() }]);
    setAddTransactionModal(false);
  };

  const handleEditTask = (task) => {
    setDailyTasks(prev => prev.map(t => t.id === task.id ? task : t));
    setEditTaskModal(null);
  };

  const handleAddTask = (task) => {
    setDailyTasks(prev => [...prev, { ...task, id: Date.now() }]);
    setAddTaskModal(false);
  };

  const handleEditBudgetCategory = (category) => {
    setBudgetData(prev => prev.map(c => c.id === category.id ? category : c));
    setEditBudgetCategoryModal(null);
  };

  const handleAddBudgetCategory = (category) => {
    setBudgetData(prev => [...prev, { ...category, id: Date.now() }]);
    setAddBudgetCategoryModal(false);
  };

  const handleEditGoal = (goal) => {
    setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
    setEditGoalModal(null);
  };

  const handleAddGoal = (goal) => {
    setGoals(prev => [...prev, { ...goal, id: Date.now() }]);
    setAddGoalModal(false);
  };

  const handleEditBill = (bill) => {
    setBills(prev => prev.map(b => b.id === bill.id ? bill : b));
    setEditBillModal(null);
  };

  const handleAddBill = (bill) => {
    setBills(prev => [...prev, { ...bill, id: Date.now() }]);
    setAddBillModal(false);
  };

  const handleEditShoppingItem = (item) => {
    setShoppingList(prev => prev.map(i => i.id === item.id ? item : i));
    setEditShoppingItemModal(null);
  };

  const handleAddShoppingItem = (item) => {
    setShoppingList(prev => [...prev, { ...item, id: Date.now() }]);
    setAddShoppingItemModal(false);
  };

  const handleEditMember = (member) => {
    setSettings(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === member.id ? member : m)
    }));
    setEditMemberModal(null);
  };

  const handleAddMember = (member) => {
    setSettings(prev => ({
      ...prev,
      members: [...prev.members, { ...member, id: Date.now() }]
    }));
    setAddMemberModal(false);
  };

  // === Остальные обработчики ===
  const toggleSetting = (path, key) => {
    const keys = path.split('.');
    if (keys.length === 1) {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    } else if (keys.length === 2) {
      setSettings(prev => ({
        ...prev,
        [keys[0]]: { 
          ...prev[keys[0]], 
          [key]: !prev[keys[0]][key] 
        }
      }));
    }
  };

  const toggleShoppingItem = (id) => {
    setShoppingList(prev => 
      prev.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const deleteShoppingItem = (id) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const toggleTask = (id) => {
    setDailyTasks(prev => 
      prev.map(task => 
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  const deleteTask = (id) => {
    setDailyTasks(prev => prev.filter(task => task.id !== id));
  };

  const deleteBudgetCategory = (id) => {
    setBudgetData(prev => prev.filter(item => item.id !== id));
  };

  const deleteGoal = (id) => {
    setGoals(prev => prev.filter(item => item.id !== id));
  };

  const deleteBill = (id) => {
    setBills(prev => prev.filter(item => item.id !== id));
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(item => item.id !== id));
  };

  const deleteMember = (id) => {
    setSettings(prev => ({
      ...prev,
      members: prev.members.filter(member => member.id !== id)
    }));
  };

  const exportData = () => {
    const data = JSON.stringify({ 
      settings, 
      shoppingList,
      dailyTasks,
      transactions,
      budgetData,
      goals,
      bills
    }, null, 2);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-budget-data.json';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        
        if (json.settings) setSettings(json.settings);
        if (json.shoppingList) setShoppingList(json.shoppingList);
        if (json.dailyTasks) setDailyTasks(json.dailyTasks);
        if (json.transactions) setTransactions(json.transactions);
        if (json.budgetData) setBudgetData(json.budgetData);
        if (json.goals) setGoals(json.goals);
        if (json.bills) setBills(json.bills);
        
        alert('✅ Данные успешно импортированы');
      } catch (err) {
        console.error('Error parsing JSON:', err);
        alert('❌ Ошибка импорта файла');
      }
    };
    
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileImportClick = () => {
    document.getElementById('import-file').click();
  };

  useEffect(() => {
    if (settingsOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [settingsOpen]);

  // === Форматирование чисел ===
  const formatCurrency = (value) => {
    if (typeof value !== 'number') return value;
    return `${Math.abs(value).toLocaleString('ru-RU')} ₽`;
  };

  // === Функция рендеринга модальных окон ===
  const renderModal = (title, isOpen, onClose, children) => {
    if (!isOpen) return null;
    
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-[#ffffff] dark:bg-[#323046] rounded-2xl shadow-2xl border border-[#e2e8f0] dark:border-[#334155] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-[#e2e8f0] dark:border-[#334155]">
            <h2 className="font-semibold tracking-tight text-xl">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-[#8366f1]/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
          <div className="p-6 border-t border-[#e2e8f0] dark:border-[#334155] bg-[#f1f5f9] dark:bg-[#2a2a38]">
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium border border-[#e2e8f0] dark:border-[#334155] rounded-xl hover:bg-[#8366f1]/10"
              >
                Отмена
              </button>
              <button
                type="submit"
                form="modal-form"
                className="px-4 py-2 text-sm font-medium text-white bg-[#8366f1] rounded-xl hover:bg-[#8366f1]/90"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f5f3] text-[#171717] dark:bg-[#2e2e4b] dark:text-[#ededed] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f7f5f3] dark:bg-[#2a2a38] border-b border-[#e2e8f0] dark:border-[#334155] shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{settings.roomName}</h1>
                <p className="text-sm text-[#64748b] dark:text-[#96a3b7]">Текущий баланс: 0&nbsp;₽</p>
              </div>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-[#dee2e7] dark:hover:bg-[#45455b7c] transition-colors"
              aria-label="Настройки"
            >
              <Settings className="h-4 w-4 text-[#64748b] dark:text-[#96a3b7]" />
            </button>
          </div>

          <nav className="w-full">
            <div className="h-9 flex flex-wrap items-center justify-center gap-1 bg-[#f1f5f9] dark:bg-[#2a2a38] p-1 rounded-xl">
              {[
                { id: 'overview', label: 'Обзор', icon: <TrendingUp className="h-4 w-4" /> },
                { id: 'budget', label: 'Бюджет', icon: <Wallet className="h-4 w-4" /> },
                { id: 'shopping', label: 'Покупки', icon: <ShoppingBag className="h-4 w-4" /> },
                { id: 'planning', label: 'Планирование', icon: <CalendarIcon className="h-4 w-4" /> },
                { id: 'goals', label: 'Цели', icon: <Trophy className="h-4 w-4" /> },
                { id: 'bills', label: 'Счета', icon: <FileText className="h-4 w-4" /> },
              ]
                .filter(tab => settings.visibility[tab.id])
                .map(tab => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                      ${activeTab === tab.id
                        ? 'text-foreground bg-[#ffffff] dark:bg-[#323046] shadow-sm'
                        : 'text-[#64748b] dark:text-[#96a3b7] hover:bg-[#f1f5f9] dark:hover:bg-[#2a2a38]'
                      }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Overview */}
        {activeTab === 'overview' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {[
                { title: 'Баланс', value: '0', key: 'balance', icon: Wallet, color: 'bg-blue-500/20 text-blue-500 dark:text-blue-400' },
                { title: 'Доход за месяц', value: '85000', key: 'income', icon: TrendingUp, color: 'bg-green-500/20 text-green-500 dark:text-green-400' },
                { title: 'Расходы за месяц', value: '1200', key: 'expenses', icon: TrendingDown, color: 'bg-red-500/20 text-red-500 dark:text-red-400' },
                { title: 'Дневной бюджет', value: '2800', key: 'dailyBudget', icon: CalendarIcon, color: 'bg-purple-500/20 text-purple-500 dark:text-purple-400' },
              ].map((card, i) => (
                <div
                  key={i}
                  className="rounded-xl shadow border border-[#e2e8f0] dark:border-[#334155] bg-[#ffffff] dark:bg-[#323046] backdrop-blur-sm"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#64748b] dark:text-[#96a3b7]">{card.title}</p>
                        <p className="text-2xl font-bold">{formatCurrency(parseInt(card.value))}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>
                        <card.icon className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Дела сегодня */}
            <div className="rounded-xl shadow border border-[#e2e8f0] dark:border-[#334155] bg-[#ffffff] dark:bg-[#323046] mb-6">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Дела сегодня</h3>
                  <button
                    onClick={() => setAddTaskModal(true)}
                    className="text-sm font-medium text-[#8366f1] hover:text-[#6b55c9] flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Добавить дело
                  </button>
                </div>
                <div className="space-y-3">
                  {dailyTasks.length === 0 ? (
                    <p className="text-center py-6 text-[#64748b] dark:text-[#96a3b7]">Нет дел на сегодня</p>
                  ) : (
                    dailyTasks.map(task => {
                      const member = settings.members.find(m => m.id === task.assignedTo) || settings.members[0];
                      return (
                        <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f1f5f9] dark:hover:bg-[#2a2a38]">
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => toggleTask(task.id)}
                            className="mt-1 w-4 h-4 rounded text-[#8366f1]"
                          />
                          <div className="flex-1 min-w-0">
                            <p 
                              className={`font-medium cursor-pointer hover:text-[#8366f1] ${task.done ? 'line-through text-[#64748b]' : ''}`}
                              onClick={() => setEditTaskModal(task)}
                            >
                              {task.text}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <span 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: member.color }}
                              ></span>
                              <span className="text-xs text-[#64748b] dark:text-[#96a3b7]">
                                {member.name}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-[#64748b] hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl shadow border border-[#e2e8f0] dark:border-[#334155] bg-[#ffffff] dark:bg-[#323046]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Последние операции</h3>
                  <button 
                    onClick={() => setAddTransactionModal(true)}
                    className="text-sm font-medium text-[#8366f1] hover:text-[#6b55c9] flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Добавить операцию
                  </button>
                </div>
                <div className="space-y-4">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-[#f1f5f9] dark:hover:bg-[#2a2a38]">
                      <div>
                        <p 
                          className="font-medium cursor-pointer hover:text-[#8366f1]"
                          onClick={() => setEditTransactionModal(tx)}
                        >
                          {tx.title}
                        </p>
                        <p className="text-sm text-[#64748b] dark:text-[#96a3b7]">{tx.date}</p>
                      </div>
                      <span className={`font-medium ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Budget */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            {/* Mini-calendar in Budget */}
            <div className="rounded-xl shadow border border-[#e2e8f0] dark:border-[#334155] bg-[#ffffff] dark:bg-[#323046]">
              <div className="p-6">
                <h3 className="font-semibold mb-4">Календарь за месяц</h3>
                <div className="text-sm text-[#64748b] dark:text-[#96a3b7] mb-2">{monthName}</div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                    <div key={day} className="text-center text-xs font-medium py-1">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.slice(0, 35).map((cell, i) => (
                    <div
                      key={i}
                      className={`min-h-10 text-xs p-1 rounded flex flex-col items-center cursor-pointer hover:bg-[#f1f5f9] dark:hover:bg-[#2a2a38]
                        ${!cell.current ? 'text-[#cbd5e1] opacity-70' : ''}
                        ${cell.events.length > 0 ? 'bg-[#8366f1]/10 border-[#8366f1]/30' : ''}
                      `}
                      onClick={() => setSelectedDate(cell.date)}
                    >
                      <span className={cell.current ? 'font-medium' : ''}>{cell.day}</span>
                      {cell.events.map((ev, j) => (
                        <span key={j} className={`text-[10px] px-1 py-0.5 rounded ${ev.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {ev.amount > 0 ? '+' : ''}{ev.amount.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget table */}
            <div className="rounded-xl shadow border border-[#e2e8f0] dark:border-[#334155] bg-[#ffffff] dark:bg-[#323046]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Бюджет на месяц</h3>
                  <button 
                    onClick={() => setAddBudgetCategoryModal(true)}
                    className="text-sm font-medium text-[#8366f1] hover:text-[#6b55c9] flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Добавить категорию
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-[#64748b] dark:text-[#96a3b7] border-b border-[#e2e8f0] dark:border-[#334155]">
                        <th className="pb-3">Категория</th>
                        <th className="pb-3 text-right">План</th>
                        <th className="pb-3 text-right">Потрачено</th>
                        <th className="pb-3 text-right">Осталось</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetData.map(item => (
                        <tr key={item.id} className="border-b border-[#e2e8f0] dark:border-[#334155] last:border-0">
                          <td className="py-3 font-medium cursor-pointer hover:text-[#8366f1]" onClick={() => setEditBudgetCategoryModal(item)}>
                            {item.category}
                          </td>
                          <td className="py-3 text-right">{formatCurrency(item.planned)}</td>
                          <td className="py-3 text-right text-red-500">{formatCurrency(item.spent)}</td>
                          <td className={`py-3 text-right font-medium ${item.planned > item.spent ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(item.planned - item.spent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shopping */}
        {activeTab === 'shopping' && (
          <div className="rounded-xl shadow border border-[#e2e8f0] dark:border-[#334155] bg-[#ffffff] dark:bg-[#323046]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Список покупок</h3>
                <button 
                  onClick={() => setAddShoppingItemModal(true)}
                  className="text-sm font-medium text-[#8366f1] hover:text-[#6b55c9] flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Добавить
                </button>
              </div>
              <div className="space-y-2">
                {shoppingList.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#f1f5f9] dark:hover:bg-[#2a2a38]">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleShoppingItem(item.id)}
                      className="w-4 h-4 rounded text-[#8366f1]"
                    />
                    <span 
                      className={`cursor-pointer hover:text-[#8366f1] ${item.checked ? 'line-through text-[#64748b]' : ''}`}
                      onClick={() => setEditShoppingItemModal(item)}
                    >
                      {item.name}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <button 
                        onClick={() => setEditShoppingItemModal(item)}
                        className="text-[#64748b] hover:text-[#8366f1]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteShoppingItem(item.id)} className="text-[#64748b] hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Планирование */}
        {activeTab === 'planning' && (
          <div className="space-y-4">
            {/* View switcher */}
            <div className="flex gap-1 bg-[#f1f5f9] dark:bg-[#2a2a38] p-1 rounded-xl w-fit">
              {[
                { id: 'month', label: 'Месяц', icon: <CalendarIcon className="h-4 w-4" /> },
                { id: 'week', label: 'Неделя', icon: <List className="h-4 w-4" /> },
                { id: 'day', label: 'Ежедневник', icon: <Clock className="h-4 w-4" /> },
              ].map(view => (
                <button
                  key={view.id}
                  onClick={() => setPlanningView(view.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    ${planningView === view.id
                      ? 'bg-[#ffffff] dark:bg-[#323046] shadow-sm text-foreground'
                      : 'text-[#64748b] dark:text-[#96a3b7] hover:bg-[#f1f5f9] dark:hover:bg-[#2a2a38]'
                    }`}
                >
                  {view.icon}
                  {view.label}
                </button>
              ))}
            </div>

            {/* Месяц */}
            {planningView === 'month' && (
              <div className="rounded-xl shadow border border-[#e2e8f0] dark:border-[#334155] bg-[#ffffff] dark:bg-[#323046]">
                <div className="p-6">
                  <h3 className="font-semibold mb-4">{monthName}</h3>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                      <div key={day} className="text-center text-xs font-medium py-1 text-[#64748b] dark:text-[#96a3b7]">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((cell, i) => (
                      <div
                        key={i}
                        className={`min-h-14 border rounded-lg p-1 text-xs flex flex-col items-center cursor-pointer hover:bg-[#f1f5f9] dark:hover:bg-[#2a2a38]
                          ${!cell.current ? 'text-[#cbd5e1] opacity-70' : ''}
                          ${cell.events.length > 0 ? 'border-[#8366f1]/30 bg-[#8366f1]/5 dark:bg-[#8366f1]/10' : 'border-transparent'}
                        `}
                        onClick={() => setSelectedDate(cell.date)}
                      >
                        <span className={`font-medium mb-1 ${cell.current ? 'text-foreground' : ''}`}>{cell.day}</span>
                        <div className="space-y-0.5 w-full">
                          {cell.events.map((ev, j) => (
                            <span
                              key={j}
                              className={`text-[10px] px-1.5 py-0.5 rounded-full w-full block text-center truncate
                                ${ev.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}
                              `}
                            >
                              {ev.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(ev.amount))}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Неделя */}
            {planningView === 'week' && (
              <div className="rounded-xl shadow border border-[#e2e8f0] dark:border-[#334155] bg-[#ffffff] dark:bg-[#323046]">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold mb-4">
                      Неделя: {weekDates[0].toLocaleDateString('ru', { day: 'numeric', month: 'short' })} - {weekDates[6].toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedDate(d => {
                        const newDate = new Date(d);
                        newDate.setDate(newDate.getDate() - 7);
                        return newDate;
                      })} className="p-1 px-3 rounded bg-[#f1f5f9] dark:bg-[#2a2a38]">← Неделя</button>
                      <button onClick={() => setSelectedDate(new Date())} className="p-1 px-3 rounded bg-[#8366f1] text-white">Сегодня</button>
                      <button onClick={() => setSelectedDate(d => {
                        const newDate = new Date(d);
                        newDate.setDate(newDate.getDate() + 7);
                        return newDate;
                      })} className="p-1 px-3 rounded bg-[#f1f5f9] dark:bg-[#2a2a38]">Неделя →</button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-[#64748b] dark:text-[#96a3b7] border-b border-[#e2e8f0] dark:border-[#334155]">
                          <th className="pb-3"></th>
                          {weekDates.map(day => (
                            <th key={day.toDateString()} className="pb-3 text-center">
                              <div className="text-xs">{day.toLocaleDateString('ru', { weekday: 'short' })}</div>
                              <div className={`font-medium mt-1 ${day.toDateString() === selectedDate.toDateString() ? 'text-[#8366f1]' : ''}`}>
                                {day.getDate()}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 8 }, (_, hourIndex) => {
                          const hour = 8 + hourIndex;
                          return (
                            <tr key={hour} className="border-b border-[#e2e8f0] dark:border-[#334155]">
                              <td className="py-4 text-sm text-[#64748b] dark:text-[#96a3b7]">{hour}:00</td>
                              {weekDates.map(day => {
                                const dayEvents = calendarDays.find(c => c.date?.toDateString() === day.toDateString())?.events || [];
                                const eventForHour = dayEvents[hourIndex % dayEvents.length];
                                
                                return (
                                  <td key={day.toDateString()} className="py-2 px-1">
                                    {eventForHour && (
                                      <div className={`p-2 rounded text-xs ${
                                        eventForHour.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                      }`}>
                                        {eventForHour.title}
                                        <div className="mt-1 text-[10px]">{formatCurrency(Math.abs(eventForHour.amount))}</div>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                        <tr>
                          <td className="py-4 text-sm text-[#64748b] dark:text-[#96a3b7]">Весь день</td>
                          {weekDates.map(day => {
                            const dayEvents = calendarDays.find(c => c.date?.toDateString() === day.toDateString())?.events || [];
                            const allDayEvents = dayEvents.filter((_, i) => i >= 8);
                            
                            return (
                              <td key={day.toDateString()} className="py-2 px-1">
                                {allDayEvents.map((event, i) => (
                                  <div key={i} className={`p-1 mb-1 rounded text-[10px] ${
                                    event.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  }`}>
                                    {event.title}: {formatCurrency(Math.abs(event.amount))}
                                  </div>
                                ))}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Ежедневник */}
            {planningView === 'day' && (
              <div className="rounded-xl shadow border border-[#e2e8f0] dark:border-[#334155] bg-[#ffffff] dark:bg-[#323046]">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">
                      Ежедневник: {selectedDate.toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedDate(d => {
                          const newDate = new Date(d);
                          newDate.setDate(newDate.getDate() - 1);
                          return newDate;
                        })}
                        className="px-3 py-1 rounded bg-[#f1f5f9] dark:bg-[#2a2a38]"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => setSelectedDate(new Date())}
                        className="px-3 py-1 rounded bg-[#8366f1] text-white"
                      >
                        Сегодня
                      </button>
                      <button
                        onClick={() => setSelectedDate(d => {
                          const newDate = new Date(d);
                          newDate.setDate(newDate.getDate() + 1);
                          return newDate;
                        })}
                        className="px-3 py-1 rounded bg-[#f1f5f9] dark:bg-[#2a2a38]"
                      >
                        →
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Планируемые события */}
                    <div>
                      <h4 className="font-medium mb-2">Планируемые события</h4>
                      <div className="space-y-2">
                        {dayEvents.map((event, index) => (
                          <div key={index} className={`p-3 rounded-lg ${
                            event.type === 'income' 
                              ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30' 
                              : 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30'
                          }`}>
                            <div className="flex justify-between">
                              <span className="font-medium">{event.title}</span>
                              <span className={event.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                {event.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(event.amount))}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-[#64748b] dark:text-[#96a3b7]">
                              {new Date(selectedYear, selectedMonth, 15).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}

                        {dayEvents.length === 0 && (
                          <p className="text-center py-4 text-[#64748b] dark:text-[#96a3b7]">Нет запланированных событий</p>
                        )}
                      </div>
                    </div>

                    {/* Задачи на день */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">Задачи на день</h4>
                        <button 
                          onClick={() => setAddTaskModal(true)}
                          className="text-sm font-medium text-[#8366f1] flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" /> Добавить задачу
                        </button>
                      </div>
                      <div className="space-y-2">
                        {dailyTasks.filter(task => 
                          new Date(task.date || selectedDate).toDateString() === selectedDate.toDateString()
                        ).map(task => {
                          const member = settings.members.find(m => m.id === task.assignedTo) || settings.members[0];
                          return (
                            <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg bg-[#f8fafc] dark:bg-[#2a2a38]">
                              <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => toggleTask(task.id)}
                                className="mt-1 w-4 h-4 rounded text-[#8366f1]"
                              />
                              <div className="flex-1 min-w-0">
                                <p 
                                  className={`text-sm cursor-pointer hover:text-[#8366f1] ${task.done ? 'line-through text-[#64748b]' : ''}`}
                                  onClick={() => setEditTaskModal(task)}
                                >
                                  {task.text}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: member.color }}
                                  ></span>
                                  <span className="text-xs text-[#64748b] dark:text-[#96a3b7]">
                                    {member.name}
                                  </span>
                                </div>
                              </div>
                              <button onClick={() => deleteTask(task.id)} className="text-[#64748b] hover:text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Goals */}
        {activeTab === 'goals' && (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="rounded-xl shadow border border-[#e2e8f0] dark:border-[#334155] bg-[#ffffff] dark:bg-[#323046]">
                <div className="p-6">
                  <div className="flex justify-between mb-2">
                    <h4 
                      className="font-medium cursor-pointer hover:text-[#8366f1]"
                      onClick={() => setEditGoalModal(goal)}
                    >
                      {goal.name}
                    </h4>
                    <span className="text-sm text-[#64748b] dark:text-[#96a3b7]">
                      {Math.round((goal.saved / goal.target) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#e2e8f0] dark:bg-[#334155] rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (goal.saved / goal.target) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-[#64748b] dark:text-[#96a3b7]">
                    Собрано: 
                    <span className="text-foreground font-medium">{formatCurrency(goal.saved)}</span> из 
                    <span className="text-foreground font-medium">{formatCurrency(goal.target)}</span>
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => setAddGoalModal(true)}
              className="w-full mt-2 flex items-center justify-center gap-1 py-2 border border-dashed border-[#e2e8f0] dark:border-[#334155] rounded-lg text-sm font-medium text-[#8366f1] hover:bg-[#f1f5f9] dark:hover:bg-[#2a2a38] transition-colors"
            >
              <Plus className="h-4 w-4" /> Добавить цель
            </button>
          </div>
        )}

        {/* Bills */}
        {activeTab === 'bills' && (
          <div className="rounded-xl shadow border border-[#e2e8f0] dark:border-[#334155] bg-[#ffffff] dark:bg-[#323046]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Счета и платежи</h3>
                <button 
                  onClick={() => setAddBillModal(true)}
                  className="text-sm font-medium text-[#8366f1] hover:text-[#6b55c9] flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Добавить счёт
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-[#64748b] dark:text-[#96a3b7] border-b border-[#e2e8f0] dark:border-[#334155]">
                      <th className="pb-3">Счёт</th>
                      <th className="pb-3 text-right">Сумма</th>
                      <th className="pb-3">Срок</th>
                      <th className="pb-3">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map(bill => (
                      <tr key={bill.id} className="border-b border-[#e2e8f0] dark:border-[#334155] last:border-0">
                        <td className="py-3 font-medium cursor-pointer hover:text-[#8366f1]" onClick={() => setEditBillModal(bill)}>
                          {bill.name}
                        </td>
                        <td className="py-3 text-right font-medium">{formatCurrency(bill.amount)}</td>
                        <td className="py-3">{bill.due}</td>
                        <td className="py-3">
                          <select
                            value={bill.status}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: newStatus } : b));
                            }}
                            className="px-2 py-0.5 rounded-full text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
                          >
                            <option value="paid">Оплачен</option>
                            <option value="pending">Ожидает</option>
                            <option value="overdue">Просрочен</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {settingsOpen && (
        <div
          ref={modalRef}
          tabIndex={-1}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]"
          onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-[#ffffff] dark:bg-[#323046] rounded-2xl shadow-2xl border border-[#e2e8f0] dark:border-[#334155] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[#e2e8f0] dark:border-[#334155]">
              <h2 className="font-semibold tracking-tight text-xl">Настройки</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#8366f1]/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-0" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="space-y-8">
                {/* General */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="h-5 w-5" /> Общие настройки
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium block mb-1">Название комнаты</label>
                      <input
                        className="h-9 w-full border border-[#e2e8f0] dark:border-[#334155] bg-transparent px-3 py-1 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
                        value={settings.roomName}
                        onChange={(e) => setSettings({ ...settings, roomName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">Начальный баланс</label>
                      <input
                        type="number"
                        className="h-9 w-full border border-[#e2e8f0] dark:border-[#334155] bg-transparent px-3 py-1 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
                        value={settings.initialBalance || ''}
                        onChange={(e) => setSettings({ ...settings, initialBalance: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">Процент сбережений (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="h-9 w-full border border-[#e2e8f0] dark:border-[#334155] bg-transparent px-3 py-1 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
                        value={settings.savingsPercent || ''}
                        onChange={(e) => setSettings({ ...settings, savingsPercent: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[#e2e8f0] dark:bg-[#334155] w-full my-6" />

                {/* Members */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5" /> Участники
                    </h3>
                    <button
                      onClick={() => setAddMemberModal(true)}
                      className="text-sm font-medium text-[#8366f1] hover:text-[#6b55c9] flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" /> Добавить
                    </button>
                  </div>
                  <div className="space-y-2">
                    {settings.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-[#f1f5f9] dark:bg-[#2a2a38]">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: member.color }}
                          ></div>
                          <span>{member.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditMemberModal(member)}
                            className="text-[#64748b] hover:text-[#8366f1]"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => deleteMember(member.id)}
                            className="text-[#64748b] hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#e2e8f0] dark:bg-[#334155] w-full my-6" />

                {/* Telegram Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Bot className="h-5 w-5" /> Telegram бот
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-1">Токен бота</label>
                      <input
                        type="password"
                        placeholder="Введите токен бота"
                        className="h-9 w-full border border-[#e2e8f0] dark:border-[#334155] bg-transparent px-3 py-1 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
                        value={settings.telegram.botToken}
                        onChange={(e) => setSettings({
                          ...settings,
                          telegram: { ...settings.telegram, botToken: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">Chat ID</label>
                      <input
                        placeholder="Введите ID чата"
                        className="h-9 w-full border border-[#e2e8f0] dark:border-[#334155] bg-transparent px-3 py-1 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
                        value={settings.telegram.chatId}
                        onChange={(e) => setSettings({
                          ...settings,
                          telegram: { ...settings.telegram, chatId: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">ID группы</label>
                      <input
                        placeholder="Введите ID группы"
                        className="h-9 w-full border border-[#e2e8f0] dark:border-[#334155] bg-transparent px-3 py-1 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
                        value={settings.telegram.groupId}
                        onChange={(e) => setSettings({
                          ...settings,
                          telegram: { ...settings.telegram, groupId: e.target.value }
                        })}
                      />
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f1f5f9] dark:bg-[#2a2a38]">
                      <Switch
                        checked={settings.telegram.enabled}
                        onChange={() => toggleSetting('telegram', 'enabled')}
                      />
                      <span className="text-sm font-medium">Включить Telegram интеграцию</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[#e2e8f0] dark:bg-[#334155] w-full my-6" />

                {/* Visibility */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <EyeIcon className="h-5 w-5" /> Видимость разделов
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { key: 'overview', label: '📊 Обзор' },
                      { key: 'budget', label: '💰 Бюджет' },
                      { key: 'shopping', label: '🛒 Покупки' },
                      { key: 'planning', label: '📅 Планирование' },
                      { key: 'goals', label: '🎯 Цели' },
                      { key: 'bills', label: '🧾 Счета' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-[#f1f5f9] dark:bg-[#2a2a38]">
                        <label className="text-sm font-medium cursor-pointer">{label}</label>
                        <Switch
                          checked={settings.visibility[key]}
                          onChange={() => toggleSetting('visibility', key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#e2e8f0] dark:bg-[#334155] w-full my-6" />

                {/* Notifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Bell className="h-5 w-5" /> Уведомления
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { key: 'push', label: '📱 Push-уведомления' },
                      { key: 'email', label: '📧 Email-уведомления' },
                      { key: 'telegram', label: '✈️ Telegram-уведомления' },
                      { key: 'budgets', label: '💸 О бюджетах' },
                      { key: 'goals', label: '🎯 О целях' },
                      { key: 'bills', label: '🧾 О счетах' },
                      { key: 'shopping', label: '🛒 О покупках' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-[#f1f5f9] dark:bg-[#2a2a38]">
                        <label className="text-sm font-medium cursor-pointer">{label}</label>
                        <Switch
                          checked={settings.notifications[key]}
                          onChange={() => toggleSetting('notifications', key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#e2e8f0] dark:bg-[#334155] w-full my-6" />

                {/* Data */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Database className="h-5 w-5" /> Управление данными
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      onClick={exportData}
                      className="flex items-center gap-2 text-sm font-medium border border-[#e2e8f0] dark:border-[#334155] bg-[#f7f5f3] dark:bg-[#2a2a38] px-4 py-2 rounded-xl hover:bg-[#8366f1]/10 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" /> Экспортировать
                    </button>
                    <div>
                      <input
                        type="file"
                        accept=".json"
                        id="import-file"
                        hidden
                        onChange={importData}
                      />
                      <button
                        onClick={handleFileImportClick}
                        className="w-full flex items-center gap-2 text-sm font-medium border border-[#e2e8f0] dark:border-[#334155] bg-[#f7f5f3] dark:bg-[#2a2a38] px-4 py-2 rounded-xl hover:bg-[#8366f1]/10 transition-colors"
                      >
                        <Upload className="h-4 w-4 mr-2" /> Импортировать
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e2e8f0] dark:border-[#334155] bg-[#f1f5f9] dark:bg-[#2a2a38]">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 text-sm font-medium border border-[#e2e8f0] dark:border-[#334155] rounded-xl hover:bg-[#8366f1]/10"
                >
                  Отмена
                </button>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#8366f1] rounded-xl hover:bg-[#8366f1]/90"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal forms */}
      {renderModal(
        editTransactionModal ? 'Редактировать операцию' : 'Добавить операцию',
        editTransactionModal || addTransactionModal,
        closeModal,
        <form 
          id="modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const transaction = {
              id: editTransactionModal?.id || Date.now(),
              title: formData.get('title'),
              amount: parseFloat(formData.get('amount')) || 0,
              date: formData.get('date'),
              type: formData.get('type')
            };
            if (editTransactionModal) {
              handleEditTransaction(transaction);
            } else {
              handleAddTransaction(transaction);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <input
              name="title"
              defaultValue={editTransactionModal?.title || ''}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Сумма</label>
            <input
              name="amount"
              type="number"
              defaultValue={editTransactionModal?.amount || ''}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Дата</label>
            <input
              name="date"
              defaultValue={editTransactionModal?.date || new Date().toLocaleDateString('ru', { day: 'numeric', month: 'long' })}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Тип</label>
            <select
              name="type"
              defaultValue={editTransactionModal?.type || 'income'}
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            >
              <option value="income">Доход</option>
              <option value="expense">Расход</option>
            </select>
          </div>
        </form>
      )}

      {renderModal(
        editTaskModal ? 'Редактировать задачу' : 'Добавить задачу',
        editTaskModal || addTaskModal,
        closeModal,
        <form 
          id="modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const task = {
              id: editTaskModal?.id || Date.now(),
              text: formData.get('text'),
              done: editTaskModal?.done || false,
              assignedTo: parseInt(formData.get('assignedTo'))
            };
            if (editTaskModal) {
              handleEditTask(task);
            } else {
              handleAddTask(task);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Название задачи</label>
            <input
              name="text"
              defaultValue={editTaskModal?.text || ''}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ответственный</label>
            <select
              name="assignedTo"
              defaultValue={editTaskModal?.assignedTo || settings.members[0].id}
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            >
              {settings.members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      )}

      {renderModal(
        editBudgetCategoryModal ? 'Редактировать категорию' : 'Добавить категорию',
        editBudgetCategoryModal || addBudgetCategoryModal,
        closeModal,
        <form 
          id="modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const category = {
              id: editBudgetCategoryModal?.id || Date.now(),
              category: formData.get('category'),
              planned: parseFloat(formData.get('planned')) || 0,
              spent: editBudgetCategoryModal?.spent || 0
            };
            if (editBudgetCategoryModal) {
              handleEditBudgetCategory(category);
            } else {
              handleAddBudgetCategory(category);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Название категории</label>
            <input
              name="category"
              defaultValue={editBudgetCategoryModal?.category || ''}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Планируемая сумма</label>
            <input
              name="planned"
              type="number"
              defaultValue={editBudgetCategoryModal?.planned || ''}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
        </form>
      )}

      {renderModal(
        editGoalModal ? 'Редактировать цель' : 'Добавить цель',
        editGoalModal || addGoalModal,
        closeModal,
        <form 
          id="modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const goal = {
              id: editGoalModal?.id || Date.now(),
              name: formData.get('name'),
              target: parseFloat(formData.get('target')) || 0,
              saved: parseFloat(formData.get('saved')) || 0
            };
            if (editGoalModal) {
              handleEditGoal(goal);
            } else {
              handleAddGoal(goal);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Название цели</label>
            <input
              name="name"
              defaultValue={editGoalModal?.name || ''}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Целевая сумма</label>
            <input
              name="target"
              type="number"
              defaultValue={editGoalModal?.target || ''}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Уже собрано</label>
            <input
              name="saved"
              type="number"
              defaultValue={editGoalModal?.saved || '0'}
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
        </form>
      )}

      {renderModal(
        editBillModal ? 'Редактировать счёт' : 'Добавить счёт',
        editBillModal || addBillModal,
        closeModal,
        <form 
          id="modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const bill = {
              id: editBillModal?.id || Date.now(),
              name: formData.get('name'),
              amount: parseFloat(formData.get('amount')) || 0,
              due: formData.get('due'),
              status: formData.get('status')
            };
            if (editBillModal) {
              handleEditBill(bill);
            } else {
              handleAddBill(bill);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Название счёта</label>
            <input
              name="name"
              defaultValue={editBillModal?.name || ''}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Сумма</label>
            <input
              name="amount"
              type="number"
              defaultValue={editBillModal?.amount || ''}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Срок оплаты</label>
            <input
              name="due"
              defaultValue={editBillModal?.due || new Date().toLocaleDateString('ru', { day: '2-digit', month: '2-digit' }).replace(/\//g, '.')}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Статус</label>
            <select
              name="status"
              defaultValue={editBillModal?.status || 'pending'}
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            >
              <option value="paid">Оплачен</option>
              <option value="pending">Ожидает</option>
              <option value="overdue">Просрочен</option>
            </select>
          </div>
        </form>
      )}

      {renderModal(
        editShoppingItemModal ? 'Редактировать товар' : 'Добавить товар',
        editShoppingItemModal || addShoppingItemModal,
        closeModal,
        <form 
          id="modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const item = {
              id: editShoppingItemModal?.id || Date.now(),
              name: formData.get('name'),
              checked: editShoppingItemModal?.checked || false
            };
            if (editShoppingItemModal) {
              handleEditShoppingItem(item);
            } else {
              handleAddShoppingItem(item);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Название товара</label>
            <input
              name="name"
              defaultValue={editShoppingItemModal?.name || ''}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
        </form>
      )}

      {renderModal(
        editMemberModal ? 'Редактировать участника' : 'Добавить участника',
        editMemberModal || addMemberModal,
        closeModal,
        <form 
          id="modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const colors = ['#8366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
            const member = {
              id: editMemberModal?.id || Date.now(),
              name: formData.get('name'),
              color: editMemberModal?.color || colors[Math.floor(Math.random() * colors.length)]
            };
            if (editMemberModal) {
              handleEditMember(member);
            } else {
              handleAddMember(member);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Имя участника</label>
            <input
              name="name"
              defaultValue={editMemberModal?.name || ''}
              required
              className="w-full h-9 border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#8366f1]"
            />
          </div>
        </form>
      )}
    </div>
  );
};

// Switch Component
const Switch = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#8366f1] focus:ring-offset-2
      ${checked ? 'bg-[#8366f1]' : 'bg-[#e2e8f0] dark:bg-[#334155]'}
    `}
  >
    <span
      className={`pointer-events-none block h-4 w-4 rounded-full bg-white dark:bg-[#2a2a38] shadow-lg ring-0 transition-transform
        ${checked ? 'translate-x-4' : 'translate-x-0'}
      `}
    />
  </button>
);

export default App;
