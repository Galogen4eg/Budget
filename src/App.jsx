import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  DollarSign, ShoppingBag, Calendar as CalendarIcon, Settings, 
  User, Plus, Trash2, Search, Upload, X, ChevronLeft, ChevronRight, 
  Edit3, Send, AlertCircle, LogIn, LogOut 
} from 'lucide-react';

// Firebase
import { db, initAuth } from './firebase';
import { 
  ref, onValue, push, set, remove, update, get 
} from "firebase/database";

// Mock data for UI
const GROCERY_ITEMS = ["Молоко", "Хлеб", "Яйца", "Сыр", "Масло", "Курица", "Говядина"];
const CATEGORIES = ["Продукты", "Транспорт", "ЖКХ", "Развлечения", "Одежда", "Здоровье"];
const UNITS = ["шт", "л", "г", "кг"];

const App = () => {
  // === СОСТОЯНИЯ ===
  const [roomId, setRoomId] = useState(() => localStorage.getItem('budget_roomId') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Данные
  const [transactions, setTransactions] = useState([]);
  const [mandatoryExpenses, setMandatoryExpenses] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState({
    initialBalance: '50000',
    savingsRate: '10',
    roomName: 'Семейный бюджет',
    telegramBotToken: '',
    telegramChatId: '',
    weekStartHour: 8,
    weekEndHour: 22,
    showShoppingTab: true,
    showPlannerTab: true
  });

  // UI
  const [activeTab, setActiveTab] = useState('budget');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(null);
  const [budgetCalendarDate, setBudgetCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [historyPeriod, setHistoryPeriod] = useState('month');
  const [errorMessage, setErrorMessage] = useState('');

  // Формы
  const [newTransaction, setNewTransaction] = useState({ 
    type: 'expense', amount: '', description: '', category: 'Продукты',
    date: new Date().toISOString().split('T')[0]
  });
  const [newEvent, setNewEvent] = useState({ 
    title: '', date: '', startTime: '', endTime: '', participants: [] 
  });

  // Ref для отписки
  const listenersRef = useRef([]);

  // === ИНИЦИАЛИЗАЦИЯ ===
  useEffect(() => {
    const init = async () => {
      try {
        await initAuth();
        setLoading(false);
      } catch (err) {
        setError(`Ошибка входа: ${err.message}`);
        setLoading(false);
      }
    };
    init();

    return () => {
      listenersRef.current.forEach(unsub => unsub());
    };
  }, []);

  // === ПОДКЛЮЧЕНИЕ К КОМНАТЕ ===
  const joinRoom = async (id) => {
    if (!id.trim()) {
      setError('Введите ID комнаты');
      return;
    }

    try {
      setError('');
      // Отписка от старой комнаты
      listenersRef.current.forEach(unsub => unsub());
      listenersRef.current = [];

      const roomPath = `rooms/${id}`;
      
      // Settings
      const settingsRef = ref(db, `${roomPath}/settings`);
      const un1 = onValue(settingsRef, (snapshot) => {
        const data = snapshot.val() || {};
        setSettings(prev => ({
          ...prev,
          ...data,
          initialBalance: data.initialBalance || '50000',
          savingsRate: data.savingsRate || '10',
          roomName: data.roomName || 'Семейный бюджет',
          showShoppingTab: data.showShoppingTab !== false,
          showPlannerTab: data.showPlannerTab !== false
        }));
      });
      listenersRef.current.push(un1);

      // Transactions
      const transRef = ref(db, `${roomPath}/transactions`);
      const un2 = onValue(transRef, (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
        setTransactions(list);
        setIsConnected(true);
        localStorage.setItem('budget_roomId', id);
        setRoomId(id);
      });
      listenersRef.current.push(un2);

      // Mandatory
      const mandRef = ref(db, `${roomPath}/mandatory`);
      const un3 = onValue(mandRef, (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
        setMandatoryExpenses(list);
      });
      listenersRef.current.push(un3);

      // Shopping
      const shopRef = ref(db, `${roomPath}/shopping`);
      const un4 = onValue(shopRef, (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
        setShoppingList(list);
      });
      listenersRef.current.push(un4);

      // Events
      const eventsRef = ref(db, `${roomPath}/events`);
      const un5 = onValue(eventsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
        setEvents(list);
      });
      listenersRef.current.push(un5);

      // Participants
      const partsRef = ref(db, `${roomPath}/participants`);
      const un6 = onValue(partsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
        if (list.length === 0) {
          // Создаём первого участника
          const defaultPart = { name: 'Вы', color: '#3b82f6' };
          const newRef = push(partsRef);
          set(newRef, defaultPart);
          setParticipants([{ id: newRef.key, ...defaultPart }]);
        } else {
          setParticipants(list);
        }
      });
      listenersRef.current.push(un6);

      // Templates
      const templRef = ref(db, `${roomPath}/templates`);
      const un7 = onValue(templRef, (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data).map(([id, item]) => ({ id, ...item }));
        setTemplates(list);
      });
      listenersRef.current.push(un7);

    } catch (err) {
      setError(`Ошибка подключения: ${err.message}`);
    }
  };

  // === ЗАПИСЬ В БАЗУ ===
  const saveData = async (path, data, id = null) => {
    try {
      const refPath = id ? `${path}/${id}` : path;
      const targetRef = ref(db, `rooms/${roomId}/${refPath}`);
      const result = id ? await update(targetRef, data) : await push(targetRef, data);
      return id || result.key;
    } catch (err) {
      setErrorMessage(`Ошибка: ${err.message}`);
      throw err;
    }
  };

  const deleteData = async (path, id) => {
    try {
      await remove(ref(db, `rooms/${roomId}/${path}/${id}`));
    } catch (err) {
      setErrorMessage(`Ошибка удаления: ${err.message}`);
    }
  };

  // === ВАЛИДАЦИЯ ===
  const validateEvent = (event) => {
    const errors = [];
    if (!event.title?.trim()) errors.push('Название');
    if (!event.date) errors.push('Дата');
    if (!event.startTime) errors.push('Время начала');
    return errors;
  };

  const validateTransaction = (t) => {
    const errors = [];
    if (!t.amount || t.amount <= 0) errors.push('Сумма > 0');
    if (!t.description?.trim()) errors.push('Описание');
    if (!t.category?.trim()) errors.push('Категория');
    return errors;
  };

  // === ОБРАБОТЧИКИ ===
  const handleJoin = (e) => {
    e.preventDefault();
    joinRoom(roomId);
  };

  const handleLogout = () => {
    listenersRef.current.forEach(unsub => unsub());
    listenersRef.current = [];
    localStorage.removeItem('budget_roomId');
    setIsConnected(false);
    setRoomId('');
  };

  const handleAddTransaction = async () => {
    const errors = validateTransaction(newTransaction);
    if (errors.length) return setErrorMessage(errors.join(', '));

    try {
      await saveData('transactions', {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      });
      setNewTransaction({ 
        type: 'expense', amount: '', description: '', category: 'Продукты',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddTransaction(false);
      setErrorMessage('');
    } catch (err) { /* уже обработано */ }
  };

  const handleAddEvent = async () => {
    const errors = validateEvent(newEvent);
    if (errors.length) return setErrorMessage(errors.join(', '));

    try {
      await saveData('events', newEvent);
      setNewEvent({ title: '', date: '', startTime: '', endTime: '', participants: [] });
      setShowAddEvent(false);
      setErrorMessage('');
    } catch (err) { /* уже обработано */ }
  };

  const handleEditEvent = async (event) => {
    const errors = validateEvent(event);
    if (errors.length) return setErrorMessage(errors.join(', '));

    try {
      await saveData('events', {
        title: event.title,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        participants: event.participants
      }, event.id);
      setShowEditEvent(null);
      setErrorMessage('');
    } catch (err) { /* уже обработано */ }
  };

  // === ВСПОМОГАТЕЛЬНЫЕ ===
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) days.push({ date: new Date(year, month - 1, prevMonthDays - i), day: prevMonthDays - i, currentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) days.push({ date: new Date(year, month, i), day: i, currentMonth: true });
    for (let i = 1; i <= 42 - days.length; i++) days.push({ date: new Date(year, month + 1, i), day: i, currentMonth: false });
    return days;
  };

  const handleDateClick = (date) => {
    setSelectedDate(sel => sel && sel.toDateString() === date.toDateString() ? null : date);
  };

  const handleEventRowClick = (event) => setShowEditEvent(event);

  // === ВЫЧИСЛЯЕМЫЕ ===
  const currentBalance = useMemo(() => {
    const initial = parseFloat(settings.initialBalance) || 0;
    return transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), initial);
  }, [transactions, settings.initialBalance]);

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];
    if (historyPeriod === 'month') {
      const y = budgetCalendarDate.getFullYear();
      const m = budgetCalendarDate.getMonth() + 1;
      list = list.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
    }
    if (selectedDate) {
      const ds = selectedDate.toISOString().split('T')[0];
      list = list.filter(t => t.date === ds);
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, historyPeriod, budgetCalendarDate, selectedDate]);

  const dailyExpenses = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        if (!map[t.date]) map[t.date] = 0;
        map[t.date] += parseFloat(t.amount);
      }
    });
    return map;
  }, [transactions]);

  // === СТРАНИЦА ВХОДА ===
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Семейный бюджет</h1>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID комнаты</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Например: семья-ивановых"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700"
              >
                <span className="flex items-center justify-center">
                  <LogIn className="w-4 h-4 mr-2" />
                  Подключиться
                </span>
              </button>
              <p className="text-gray-500 text-sm text-center">
                ID можно придумать любой. Поделитесь им с семьёй — все увидят одни данные.
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // === ОСНОВНОЙ ИНТЕРФЕЙС ===
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-800">{settings.roomName}</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg ${showSettings ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <nav className="flex space-x-1">
                {['budget', ...(settings.showShoppingTab ? ['shopping'] : []), ...(settings.showPlannerTab ? ['planner'] : [])].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg font-medium ${activeTab === tab ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center space-x-2">
                      {tab === 'budget' && <DollarSign className="w-4 h-4" />}
                      {tab === 'shopping' && <ShoppingBag className="w-4 h-4" />}
                      {tab === 'planner' && <CalendarIcon className="w-4 h-4" />}
                      <span>{tab === 'budget' ? 'Бюджет' : tab === 'shopping' ? 'Покупки' : 'Планировщик'}</span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {errorMessage && (
          <div className="mb-4 bg-red-50 text-red-700 p-3 rounded flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {errorMessage}
          </div>
        )}

        {/* BUDGET TAB */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Текущий баланс</h3>
                <p className="text-2xl font-bold text-gray-800">{currentBalance.toLocaleString('ru-RU')} ₽</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">На откладывание</h3>
                <p className="text-2xl font-bold text-green-600">
                  {(currentBalance * (parseFloat(settings.savingsRate) / 100) || 0).toLocaleString('ru-RU')} ₽
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Лимит на день</h3>
                <p className="text-2xl font-bold text-indigo-600">
                  {Math.round((currentBalance * (1 - parseFloat(settings.savingsRate) / 100) || 0) / 30).toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>

            {/* Budget Calendar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Календарь трат</h2>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setBudgetCalendarDate(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })} className="p-1 hover:bg-gray-100 rounded">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span>{budgetCalendarDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                  <button onClick={() => setBudgetCalendarDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })} className="p-1 hover:bg-gray-100 rounded">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(budgetCalendarDate).map((day, i) => {
                    const ds = day.date.toISOString().split('T')[0];
                    const sum = dailyExpenses[ds] || 0;
                    const sel = selectedDate && selectedDate.toDateString() === day.date.toDateString();
                    return (
                      <div
                        key={i}
                        onClick={() => handleDateClick(day.date)}
                        className={`min-h-16 p-1 text-xs border cursor-pointer ${
                          day.currentMonth ? 'bg-white border-gray-100' : 'bg-gray-50 text-gray-400'
                        } ${sel ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                      >
                        <div className="text-right font-medium">{day.day}</div>
                        {sum > 0 && <div className="mt-1 text-red-600 font-medium text-center">{sum.toLocaleString()} ₽</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">История операций</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => { setHistoryPeriod('month'); setSelectedDate(null); }}
                    className={`px-3 py-1 text-sm rounded ${historyPeriod === 'month' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    За месяц
                  </button>
                  <button
                    onClick={() => { setHistoryPeriod('all'); setSelectedDate(null); }}
                    className={`px-3 py-1 text-sm rounded ${historyPeriod === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    За всё время
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Описание</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Категория</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Сумма</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Баланс</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTransactions.map((t, idx) => {
                      const bal = transactions.slice(0, idx + 1).reduce((s, tx) => s + (tx.type === 'income' ? tx.amount : -tx.amount), parseFloat(settings.initialBalance));
                      return (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{t.description}</td>
                          <td className="px-4 py-3 text-gray-500">{t.category}</td>
                          <td className={`px-4 py-3 text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === 'income' ? '+' : '–'}{t.amount} ₽
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {bal.toLocaleString()} ₽
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODALS */}
        {showAddTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Новая операция</h3>
                  <button onClick={() => { setShowAddTransaction(false); setErrorMessage(''); }}><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <select value={newTransaction.type} onChange={e => setNewTransaction({...newTransaction, type: e.target.value})} className="w-full px-3 py-2 border rounded">
                    <option value="income">Доход</option>
                    <option value="expense">Расход</option>
                  </select>
                  <input type="number" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})} placeholder="Сумма" className="w-full px-3 py-2 border rounded" />
                  <input type="text" value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} placeholder="Описание" className="w-full px-3 py-2 border rounded" />
                  <select value={newTransaction.category} onChange={e => setNewTransaction({...newTransaction, category: e.target.value})} className="w-full px-3 py-2 border rounded">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="date" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})} className="w-full px-3 py-2 border rounded" />
                  <button onClick={handleAddTransaction} className="w-full bg-indigo-600 text-white py-2 px-4 rounded font-medium">Добавить</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Новое событие</h3>
                  <button onClick={() => { setShowAddEvent(false); setErrorMessage(''); }}><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <input type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Название" className="w-full px-3 py-2 border rounded" />
                  <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full px-3 py-2 border rounded" />
                  <input type="time" value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} placeholder="Начало" className="w-full px-3 py-2 border rounded" />
                  <input type="time" value={newEvent.endTime} onChange={e => setNewEvent({...newEvent, endTime: e.target.value})} placeholder="Окончание" className="w-full px-3 py-2 border rounded" />
                  <button onClick={handleAddEvent} className="w-full bg-indigo-600 text-white py-2 px-4 rounded font-medium">Добавить</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEditEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Редактировать событие</h3>
                  <button onClick={() => { setShowEditEvent(null); setErrorMessage(''); }}><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <input type="text" value={showEditEvent.title} onChange={e => setShowEditEvent({...showEditEvent, title: e.target.value})} className="w-full px-3 py-2 border rounded" />
                  <input type="date" value={showEditEvent.date} onChange={e => setShowEditEvent({...showEditEvent, date: e.target.value})} className="w-full px-3 py-2 border rounded" />
                  <input type="time" value={showEditEvent.startTime} onChange={e => setShowEditEvent({...showEditEvent, startTime: e.target.value})} className="w-full px-3 py-2 border rounded" />
                  <input type="time" value={showEditEvent.endTime} onChange={e => setShowEditEvent({...showEditEvent, endTime: e.target.value})} className="w-full px-3 py-2 border rounded" />
                  <button onClick={() => handleEditEvent(showEditEvent)} className="w-full bg-indigo-600 text-white py-2 px-4 rounded font-medium">Сохранить</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;