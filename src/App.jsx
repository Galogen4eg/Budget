import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, Wallet, ShoppingBag, Calendar as CalendarIcon, Trophy, 
  FileText, TrendingUp, TrendingDown, Plus, Edit3, Trash2, Eye as EyeIcon, 
  Bell, MessageSquare, Database, Download, Upload, X, List, Clock 
} from 'lucide-react';

const App = () => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const modalRef = useRef(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    roomName: 'Семейный бюджет',
    monthlyIncome: 0,
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
      enabled: false,
    }
  });

  // Mock data
  const [transactions] = useState([
    { id: 1, title: 'Зарплата', date: '5 июня', amount: 50000, type: 'income' },
    { id: 2, title: 'Продукты', date: '15 июня', amount: -1200, type: 'expense' },
    { id: 3, title: 'Фриланс', date: '20 июня', amount: 35000, type: 'income' },
  ]);

  const [budgetData] = useState([
    { id: 1, category: 'Продукты', planned: 15000, spent: 12400 },
    { id: 2, category: 'Транспорт', planned: 5000, spent: 4800 },
    { id: 3, category: 'Развлечения', planned: 3000, spent: 1200 },
    { id: 4, category: 'Одежда', planned: 4000, spent: 0 },
    { id: 5, category: 'Подарки', planned: 2000, spent: 0 },
  ]);

  const [shoppingList, setShoppingList] = useState([
    { id: 1, name: 'Молоко', checked: false },
    { id: 2, name: 'Хлеб', checked: true },
    { id: 3, name: 'Яйца', checked: false },
    { id: 4, name: 'Сыр', checked: false },
  ]);

  const [goals] = useState([
    { name: 'Отпуск', target: 100000, saved: 45000 },
    { name: 'Ноутбук', target: 80000, saved: 32000 },
  ]);

  const [bills] = useState([
    { name: 'Интернет', amount: 800, due: '15.06', status: 'paid' },
    { name: 'Электричество', amount: 1200, due: '25.06', status: 'pending' },
    { name: 'Вода', amount: 650, due: '28.06', status: 'pending' },
  ]);

  // Planning state
  const now = new Date(2025, 5, 15); // June 15, 2025
  const [planningView, setPlanningView] = useState('month');
  const [selectedDate, setSelectedDate] = useState(now);
  const [dailyNotes, setDailyNotes] = useState({
    [now.toDateString()]: [
      { id: 1, text: 'Купить продукты', done: false },
      { id: 2, text: 'Оплатить интернет', done: true },
    ]
  });
  const [newNote, setNewNote] = useState('');

  // Calendar logic
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const getEventsForDay = (day) => {
    if (day === 5) return [{ id: 1, title: 'Зарплата', amount: 50000, type: 'income' }];
    if (day === 15) return [{ id: 2, title: 'Продукты', amount: -1200, type: 'expense' }];
    if (day === 20) return [{ id: 3, title: 'Фриланс', amount: 35000, type: 'income' }];
    return [];
  };

  const generateCalendarDays = (y, m) => {
    const firstDay = new Date(y, m, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevMonthDays = new Date(y, m, 0).getDate();
    const days = [];

    // Previous month days
    for (let i = startOffset; i > 0; i--) {
      days.push({ 
        day: prevMonthDays - i + 1, 
        current: false, 
        events: [],
        date: new Date(y, m - 1, prevMonthDays - i + 1)
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        current: true,
        events: getEventsForDay(d),
        date: new Date(y, m, d)
      });
    }

    // Next month days
    let nextMonthDay = 1;
    while (days.length < 42) {
      days.push({
        day: nextMonthDay,
        current: false,
        events: [],
        date: new Date(y, m + 1, nextMonthDay)
      });
      nextMonthDay++;
    }

    return days;
  };

  const calendarDays = generateCalendarDays(year, month);
  const monthName = new Date(year, month).toLocaleString('ru', { month: 'long', year: 'numeric' });

  // Event handlers
  const toggleSetting = (path, key) => {
    const keys = path.split('.');
    if (keys.length === 1) {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    } else {
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
    setShoppingList(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const deleteShoppingItem = (id) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const addShoppingItem = () => {
    const name = prompt('Товар:');
    if (name?.trim()) {
      setShoppingList(prev => [...prev, { 
        id: Date.now(), 
        name: name.trim(), 
        checked: false 
      }]);
    }
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const dateStr = selectedDate.toDateString();
    const notes = dailyNotes[dateStr] || [];
    setDailyNotes({ 
      ...dailyNotes, 
      [dateStr]: [...notes, { 
        id: Date.now(), 
        text: newNote.trim(), 
        done: false 
      }] 
    });
    setNewNote('');
  };

  const toggleNote = (id) => {
    const dateStr = selectedDate.toDateString();
    const notes = dailyNotes[dateStr] || [];
    setDailyNotes({ 
      ...dailyNotes, 
      [dateStr]: notes.map(n => 
        n.id === id ? { ...n, done: !n.done } : n
      ) 
    });
  };

  const exportData = () => {
    const data = JSON.stringify({ settings, shoppingList, dailyNotes }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-budget-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        setSettings(json.settings || settings);
        if (json.shoppingList) setShoppingList(json.shoppingList);
        if (json.dailyNotes) setDailyNotes(json.dailyNotes);
        alert('✅ Импорт завершён');
      } catch {
        alert('❌ Ошибка импорта JSON');
      }
    };
    reader.readAsText(file);
  };

  // Modal focus management
  useEffect(() => {
    if (settingsOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [settingsOpen]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-[#1e293b] dark:text-[#e2e8f0] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#1e293b] border-b border-[#e2e8f0] dark:border-[#334155]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#8366f1] text-white p-2 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{settings.roomName}</h1>
              <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">Текущий баланс: 0 ₽</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-[#dee2e7] dark:hover:bg-[#45455b7c] transition-colors"
              aria-label="Настройки"
            >
              <Settings className="w-5 h-5 text-[#4a5568] dark:text-[#cbd5e1]" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white dark:bg-[#1e293b] border-b border-[#e2e8f0] dark:border-[#334155] sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto py-2 gap-2">
            {[
              { id: 'overview', label: 'Обзор', icon: <Wallet className="w-4 h-4" /> },
              { id: 'budget', label: 'Бюджет', icon: <FileText className="w-4 h-4" /> },
              { id: 'shopping', label: 'Покупки', icon: <ShoppingBag className="w-4 h-4" /> },
              { id: 'planning', label: 'Планирование', icon: <CalendarIcon className="w-4 h-4" /> },
              { id: 'goals', label: 'Цели', icon: <Trophy className="w-4 h-4" /> },
              { id: 'bills', label: 'Счета', icon: <FileText className="w-4 h-4" /> },
            ]
            .filter(tab => settings.visibility[tab.id])
            .map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                    ? 'text-[#8366f1] bg-[#f0ebff] dark:bg-[#323046] shadow-sm'
                    : 'text-[#64748b] dark:text-[#96a3b7] hover:bg-[#f1f5f9] dark:hover:bg-[#2a2a38]'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { 
                  title: 'Баланс', 
                  value: '0 ₽', 
                  icon: <Wallet className="w-6 h-6" />, 
                  color: 'bg-blue-500/20 text-blue-500 dark:text-blue-400' 
                },
                { 
                  title: 'Доход за месяц', 
                  value: '85 000 ₽', 
                  icon: <TrendingUp className="w-6 h-6" />, 
                  color: 'bg-green-500/20 text-green-500 dark:text-green-400' 
                },
                { 
                  title: 'Расходы за месяц', 
                  value: '1 200 ₽', 
                  icon: <TrendingDown className="w-6 h-6" />, 
                  color: 'bg-red-500/20 text-red-500 dark:text-red-400' 
                },
                { 
                  title: 'Дневной бюджет', 
                  value: '2 800 ₽', 
                  icon: <CalendarIcon className="w-6 h-6" />, 
                  color: 'bg-purple-500/20 text-purple-500 dark:text-purple-400' 
                },
              ].map((card, i) => (
                <div 
                  key={i} 
                  className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-5 shadow-sm"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color} mb-3`}>
                    {card.icon}
                  </div>
                  <p className="text-sm text-[#64748b] dark:text-[#94a3b8] mb-1">{card.title}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Последние операции</h2>
                <button className="text-sm text-[#8366f1] hover:text-[#7c5cf0] font-medium">Все операции</button>
              </div>
              
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between p-3 hover:bg-[#f8fafc] dark:hover:bg-[#2a2a38] rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        tx.type === 'income' 
                          ? 'bg-green-500/20 text-green-500 dark:text-green-400' 
                          : 'bg-red-500/20 text-red-500 dark:text-red-400'
                      }`}>
                        {tx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium">{tx.title}</p>
                        <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">{tx.date}</p>
                      </div>
                    </div>
                    <p className={`font-medium ${
                      tx.amount > 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} ₽
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Budget Tab */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Бюджет на месяц</h1>
              <button className="px-4 py-2 bg-[#8366f1] text-white rounded-lg flex items-center gap-2 hover:bg-[#7c5cf0] transition-colors">
                <Plus className="w-4 h-4" />
                <span>Добавить категорию</span>
              </button>
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                  <thead className="bg-[#f8fafc] dark:bg-[#2a2a38]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">Категория</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">План</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">Потрачено</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">Осталось</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                    {budgetData.map(item => (
                      <tr key={item.id} className="hover:bg-[#f8fafc] dark:hover:bg-[#2a2a38]">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium">{item.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748b] dark:text-[#94a3b8]">
                          {item.planned.toLocaleString()} ₽
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748b] dark:text-[#94a3b8]">
                          {item.spent.toLocaleString()} ₽
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          item.planned - item.spent > 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                        }`}>
                          {(item.planned - item.spent).toLocaleString()} ₽
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mini-calendar */}
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-5 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Календарь за месяц</h2>
              <div className="text-center mb-4">
                <h3 className="text-lg font-medium">{monthName}</h3>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-[#64748b] dark:text-[#94a3b8] py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.slice(0, 35).map((cell, i) => (
                  <div 
                    key={i} 
                    className={`min-h-[70px] p-1 border rounded-lg flex flex-col ${
                      cell.current 
                        ? 'border-[#e2e8f0] dark:border-[#334155] hover:bg-[#f8fafc] dark:hover:bg-[#2a2a38]'
                        : 'border-transparent text-[#cbd5e1]'
                    } ${cell.day === now.getDate() && cell.current ? 'bg-[#8366f1]/5 border-[#8366f1]/30 dark:bg-[#8366f1]/10' : ''}`}
                  >
                    <span className={`text-sm font-medium ${
                      cell.current ? 'text-[#1e293b] dark:text-[#e2e8f0]' : 'text-[#94a3b8]'
                    }`}>
                      {cell.day}
                    </span>
                    <div className="mt-1 space-y-1 flex-grow">
                      {cell.events.map((ev, j) => (
                        <div 
                          key={j} 
                          className={`text-xs p-1 rounded ${
                            ev.amount > 0 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          <span className="font-medium">{ev.title}</span>
                          <span className="block">{ev.amount > 0 ? '+' : ''}{ev.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Shopping Tab */}
        {activeTab === 'shopping' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Список покупок</h1>
              <button 
                onClick={addShoppingItem}
                className="px-4 py-2 bg-[#8366f1] text-white rounded-lg flex items-center gap-2 hover:bg-[#7c5cf0] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить</span>
              </button>
            </div>
            
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-5 shadow-sm">
              <ul className="space-y-3">
                {shoppingList.map(item => (
                  <li 
                    key={item.id} 
                    className="flex items-center justify-between p-3 border border-[#e2e8f0] dark:border-[#334155] rounded-lg hover:bg-[#f8fafc] dark:hover:bg-[#2a2a38] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleShoppingItem(item.id)}
                        className="w-4 h-4 rounded text-[#8366f1] border-[#cbd5e1] dark:border-[#475569] focus:ring-[#8366f1]"
                      />
                      <span className={item.checked ? 'line-through text-[#94a3b8]' : ''}>{item.name}</span>
                    </div>
                    <button 
                      onClick={() => deleteShoppingItem(item.id)}
                      className="text-[#64748b] hover:text-red-500 p-1"
                      aria-label="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Planning Tab */}
        {activeTab === 'planning' && (
          <div className="space-y-6">
            {/* View Switcher */}
            <div className="flex overflow-x-auto gap-2 pb-2 border-b border-[#e2e8f0] dark:border-[#334155]">
              {[
                { id: 'month', label: 'Месяц', icon: <CalendarIcon className="w-4 h-4" /> },
                { id: 'week', label: 'Неделя', icon: <List className="w-4 h-4" /> },
                { id: 'day', label: 'Ежедневник', icon: <Clock className="w-4 h-4" /> },
              ].map(view => (
                <button
                  key={view.id}
                  onClick={() => setPlanningView(view.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    planningView === view.id
                      ? 'text-[#8366f1] bg-[#f0ebff] dark:bg-[#323046] shadow-sm'
                      : 'text-[#64748b] dark:text-[#96a3b7] hover:bg-[#f1f5f9] dark:hover:bg-[#2a2a38]'
                  }`}
                >
                  {view.icon}
                  <span>{view.label}</span>
                </button>
              ))}
            </div>

            {/* Month View */}
            {planningView === 'month' && (
              <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-5 shadow-sm">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold">{monthName}</h2>
                </div>
                
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-[#64748b] dark:text-[#94a3b8] py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cell, i) => (
                    <div 
                      key={i} 
                      className={`min-h-[80px] p-2 border rounded-lg flex flex-col ${
                        cell.current 
                          ? 'border-[#e2e8f0] dark:border-[#334155] hover:bg-[#f8fafc] dark:hover:bg-[#2a2a38]'
                          : 'border-transparent text-[#cbd5e1]'
                      } ${cell.day === now.getDate() && cell.current ? 'bg-[#8366f1]/5 border-[#8366f1]/30 dark:bg-[#8366f1]/10' : ''}`}
                    >
                      <span className={`text-sm font-medium ${
                        cell.current ? 'text-[#1e293b] dark:text-[#e2e8f0]' : 'text-[#94a3b8]'
                      }`}>
                        {cell.day}
                      </span>
                      <div className="mt-1 space-y-1 flex-grow">
                        {cell.events.map((ev, j) => (
                          <div 
                            key={j} 
                            className={`text-xs p-1 rounded ${
                              ev.amount > 0 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
                            <span className="font-medium">{ev.title}</span>
                            <span className="block">{ev.amount > 0 ? '+' : ''}{ev.amount.toLocaleString()} ₽</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Week View */}
            {planningView === 'week' && (
              <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-5 shadow-sm">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold">Неделя: 9–15 июня 2025</h2>
                </div>
                
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-8 gap-1">
                      <div className="py-2"></div>
                      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                        <div key={day} className="text-center font-medium py-2 border-b border-[#e2e8f0] dark:border-[#334155]">
                          {day}
                        </div>
                      ))}
                      
                      {Array.from({ length: 12 }, (_, i) => {
                        const hour = 9 + i;
                        return (
                          <React.Fragment key={hour}>
                            <div className="text-right pr-2 py-2 text-sm text-[#64748b] dark:text-[#94a3b8] border-b border-[#e2e8f0] dark:border-[#334155]">
                              {hour}:00
                            </div>
                            {Array.from({ length: 7 }).map((_, j) => (
                              <div 
                                key={`${hour}-${j}`} 
                                className="min-h-[60px] border border-[#e2e8f0] dark:border-[#334155] rounded m-1 hover:bg-[#f8fafc] dark:hover:bg-[#2a2a38]"
                              ></div>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Day View */}
            {planningView === 'day' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">
                    Ежедневник: {selectedDate.toLocaleDateString('ru', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1))}
                      className="px-3 py-1 rounded bg-[#f1f5f9] dark:bg-[#2a2a38] hover:bg-[#e2e8f0] dark:hover:bg-[#334155] transition-colors"
                    >
                      ←
                    </button>
                    <button 
                      onClick={() => setSelectedDate(new Date())}
                      className="px-3 py-1 rounded bg-[#8366f1] text-white hover:bg-[#7c5cf0] transition-colors"
                    >
                      Сегодня
                    </button>
                    <button 
                      onClick={() => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))}
                      className="px-3 py-1 rounded bg-[#f1f5f9] dark:bg-[#2a2a38] hover:bg-[#e2e8f0] dark:hover:bg-[#334155] transition-colors"
                    >
                      →
                    </button>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-5 shadow-sm">
                  <div className="flex gap-3 mb-4">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addNote()}
                      placeholder="Новое дело..."
                      className="flex-1 px-4 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1e293b] text-[#1e293b] dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#8366f1] focus:border-transparent"
                    />
                    <button 
                      onClick={addNote}
                      className="px-4 py-2 bg-[#8366f1] text-white rounded-lg hover:bg-[#7c5cf0] transition-colors"
                    >
                      Добавить
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {(dailyNotes[selectedDate.toDateString()] || []).map(note => (
                      <div 
                        key={note.id} 
                        className="flex items-start gap-3 p-3 border border-[#e2e8f0] dark:border-[#334155] rounded-lg hover:bg-[#f8fafc] dark:hover:bg-[#2a2a38] transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={note.done}
                          onChange={() => toggleNote(note.id)}
                          className="mt-1 w-4 h-4 rounded text-[#8366f1] border-[#cbd5e1] dark:border-[#475569] focus:ring-[#8366f1]"
                        />
                        <span className={note.done ? 'line-through text-[#94a3b8]' : ''}>
                          {note.text}
                        </span>
                      </div>
                    ))}
                    
                    {(dailyNotes[selectedDate.toDateString()] || []).length === 0 && (
                      <div className="text-center py-8 text-[#64748b] dark:text-[#94a3b8]">
                        <p className="text-lg font-medium mb-2">Нет дел на этот день</p>
                        <p className="text-sm">Добавьте новое дело с помощью поля выше</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Финансовые цели</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.map((goal, i) => (
                <div 
                  key={i} 
                  className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] p-6 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold">{goal.name}</h3>
                    <div className="text-sm font-medium text-[#64748b] dark:text-[#94a3b8]">
                      {Math.round((goal.saved / goal.target) * 100)}%
                    </div>
                  </div>
                  
                  <div className="w-full bg-[#e2e8f0] dark:bg-[#334155] rounded-full h-2 mb-4">
                    <div 
                      className="bg-[#8366f1] h-2 rounded-full" 
                      style={{ width: `${(goal.saved / goal.target) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Собрано: {goal.saved.toLocaleString()} ₽</span>
                    <span>из {goal.target.toLocaleString()} ₽</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bills Tab */}
        {activeTab === 'bills' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Счета и платежи</h1>
              <button className="px-4 py-2 bg-[#8366f1] text-white rounded-lg flex items-center gap-2 hover:bg-[#7c5cf0] transition-colors">
                <Plus className="w-4 h-4" />
                <span>Добавить счёт</span>
              </button>
            </div>
            
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#e2e8f0] dark:border-[#334155] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                  <thead className="bg-[#f8fafc] dark:bg-[#2a2a38]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">Счёт</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">Сумма</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">Срок</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                    {bills.map((bill, i) => (
                      <tr key={i} className="hover:bg-[#f8fafc] dark:hover:bg-[#2a2a38]">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium">{bill.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748b] dark:text-[#94a3b8]">
                          {bill.amount} ₽
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748b] dark:text-[#94a3b8]">
                          {bill.due}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            bill.status === 'paid' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                              : bill.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {bill.status === 'paid' ? 'Оплачено' : bill.status === 'pending' ? 'Ожидает' : 'Просрочено'}
                          </span>
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}
        >
          <div 
            ref={modalRef}
            tabIndex={-1}
            className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-[#1e293b] z-10 border-b border-[#e2e8f0] dark:border-[#334155] p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Настройки</h2>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#8366f1]/10 flex items-center justify-center"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5 text-[#64748b] dark:text-[#94a3b8]" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* General Settings */}
              <section>
                <h3 className="text-lg font-semibold mb-4">Общие настройки</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Название комнаты</label>
                    <input
                      type="text"
                      value={settings.roomName}
                      onChange={(e) => setSettings({ ...settings, roomName: e.target.value })}
                      className="w-full px-3 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#8366f1] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Ежемесячный доход</label>
                    <input
                      type="number"
                      value={settings.monthlyIncome}
                      onChange={(e) => setSettings({ ...settings, monthlyIncome: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#8366f1] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Начальный баланс</label>
                    <input
                      type="number"
                      value={settings.initialBalance}
                      onChange={(e) => setSettings({ ...settings, initialBalance: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#8366f1] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Процент сбережений (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.savingsPercent}
                      onChange={(e) => setSettings({ ...settings, savingsPercent: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#8366f1] focus:border-transparent"
                    />
                  </div>
                </div>
              </section>
              
              {/* Visibility Settings */}
              <section>
                <h3 className="text-lg font-semibold mb-4">Видимость разделов</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'overview', label: '📊 Обзор' },
                    { key: 'budget', label: '💰 Бюджет' },
                    { key: 'shopping', label: '🛒 Покупки' },
                    { key: 'planning', label: '📅 Планирование' },
                    { key: 'goals', label: '🎯 Цели' },
                    { key: 'bills', label: '🧾 Счета' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#2a2a38] rounded-lg">
                      <span>{label}</span>
                      <Switch 
                        checked={settings.visibility[key]} 
                        onChange={() => toggleSetting('visibility', key)} 
                      />
                    </div>
                  ))}
                </div>
              </section>
              
              {/* Notifications Settings */}
              <section>
                <h3 className="text-lg font-semibold mb-4">Уведомления</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#2a2a38] rounded-lg">
                    <span>Push-уведомления</span>
                    <Switch 
                      checked={settings.notifications.push} 
                      onChange={() => toggleSetting('notifications', 'push')} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#2a2a38] rounded-lg">
                    <span>Email-уведомления</span>
                    <Switch 
                      checked={settings.notifications.email} 
                      onChange={() => toggleSetting('notifications', 'email')} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#2a2a38] rounded-lg">
                    <span>Telegram-уведомления</span>
                    <Switch 
                      checked={settings.notifications.telegram} 
                      onChange={() => toggleSetting('notifications', 'telegram')} 
                    />
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#2a2a38] rounded-lg">
                      <span>О превышении бюджета</span>
                      <Switch 
                        checked={settings.notifications.budgets} 
                        onChange={() => toggleSetting('notifications', 'budgets')} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#2a2a38] rounded-lg">
                      <span>О достижении целей</span>
                      <Switch 
                        checked={settings.notifications.goals} 
                        onChange={() => toggleSetting('notifications', 'goals')} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#2a2a38] rounded-lg">
                      <span>О предстоящих платежах</span>
                      <Switch 
                        checked={settings.notifications.bills} 
                        onChange={() => toggleSetting('notifications', 'bills')} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#2a2a38] rounded-lg">
                      <span>О добавлении в список покупок</span>
                      <Switch 
                        checked={settings.notifications.shopping} 
                        onChange={() => toggleSetting('notifications', 'shopping')} 
                      />
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Telegram Integration */}
              <section>
                <h3 className="text-lg font-semibold mb-4">Telegram интеграция</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#2a2a38] rounded-lg">
                    <span>Включить интеграцию</span>
                    <Switch 
                      checked={settings.telegram.enabled} 
                      onChange={() => toggleSetting('telegram', 'enabled')} 
                    />
                  </div>
                  
                  {settings.telegram.enabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Bot Token</label>
                        <input
                          type="password"
                          value={settings.telegram.botToken}
                          onChange={(e) => setSettings({ ...settings, telegram: { ...settings.telegram, botToken: e.target.value } })}
                          className="w-full px-3 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#8366f1] focus:border-transparent"
                          placeholder="Введите токен бота"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Chat ID</label>
                        <input
                          type="text"
                          value={settings.telegram.chatId}
                          onChange={(e) => setSettings({ ...settings, telegram: { ...settings.telegram, chatId: e.target.value } })}
                          className="w-full px-3 py-2 border border-[#e2e8f0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#8366f1] focus:border-transparent"
                          placeholder="Введите ID чата"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
              
              {/* Data Management */}
              <section>
                <h3 className="text-lg font-semibold mb-4">Управление данными</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={exportData}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[#8366f1] rounded-xl hover:bg-[#8366f1]/5 transition-colors"
                  >
                    <Download className="w-5 h-5 text-[#8366f1]" />
                    <span className="font-medium">Экспорт данных</span>
                  </button>
                  
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[#8366f1] rounded-xl hover:bg-[#8366f1]/5 transition-colors cursor-pointer">
                    <Upload className="w-5 h-5 text-[#8366f1]" />
                    <span className="font-medium">Импорт данных</span>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={importData} 
                      className="hidden"
                    />
                  </label>
                </div>
              </section>
            </div>
            
            <div className="sticky bottom-0 bg-white dark:bg-[#1e293b] border-t border-[#e2e8f0] dark:border-[#334155] p-6 flex gap-3 justify-end">
              <button 
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium border border-[#e2e8f0] dark:border-[#334155] rounded-xl hover:bg-[#8366f1]/10"
              >
                Отмена
              </button>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#8366f1] rounded-xl hover:bg-[#7c5cf0]"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Toggle Switch Component
const Switch = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8366f1] focus:ring-offset-2 ${
      checked ? 'bg-[#8366f1]' : 'bg-[#cbd5e1] dark:bg-[#475569]'
    }`}
    role="switch"
    aria-checked={checked}
  >
    <span
      className={`${
        checked ? 'translate-x-5' : 'translate-x-0'
      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
    />
  </button>
);

export default App;
