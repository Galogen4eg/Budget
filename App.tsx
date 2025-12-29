
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Settings as SettingsIcon, Sparkles, LayoutGrid, Wallet, CalendarDays, ShoppingBag, TrendingUp, Users, Crown, ListChecks, CheckCircle2, Circle, X, CreditCard, Calendar, Target } from 'lucide-react';
import { Transaction, SavingsGoal, AppSettings, ShoppingItem, FamilyEvent, FamilyMember } from './types';
import { FAMILY_MEMBERS as INITIAL_FAMILY_MEMBERS, CATEGORIES } from './constants';
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
import { parseAlfaStatement } from './utils/alfaParser';

const DEFAULT_SETTINGS: AppSettings = {
  familyName: 'Семья',
  currency: '₽',
  startOfMonthDay: 1,
  privacyMode: false,
  enabledWidgets: ['balance', 'daily', 'spent', 'goals', 'charts', 'family', 'plans', 'shopping'],
  telegramBotToken: '',
  telegramChatId: '',
  dayStartHour: 8,
  dayEndHour: 22,
  autoSendEventsToTelegram: false,
  initialBalance: 0,
  alfaMapping: {
    date: 'дата',
    amount: 'сумма',
    category: 'категория',
    note: 'описание'
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'shopping' | 'plans'>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(INITIAL_FAMILY_MEMBERS);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [importPreview, setImportPreview] = useState<Omit<Transaction, 'id'>[]>([]);
  const [savingsRate, setSavingsRate] = useState(20);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalBalance = useMemo(() => {
    const txSum = transactions.reduce((acc, tx) => 
      tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0);
    return settings.initialBalance + txSum;
  }, [transactions, settings.initialBalance]);

  useEffect(() => {
    const savedTransactions = localStorage.getItem('family_budget_tx');
    const savedGoals = localStorage.getItem('family_budget_goals');
    const savedRate = localStorage.getItem('family_budget_rate');
    const savedSettings = localStorage.getItem('family_budget_settings');
    const savedShopping = localStorage.getItem('family_budget_shopping');
    const savedEvents = localStorage.getItem('family_budget_events');
    const savedMembers = localStorage.getItem('family_budget_members');
    
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    if (savedGoals) setGoals(JSON.parse(savedGoals));
    if (savedRate) setSavingsRate(Number(savedRate));
    if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    if (savedShopping) setShoppingItems(JSON.parse(savedShopping));
    if (savedEvents) setEvents(JSON.parse(savedEvents));
    if (savedMembers) setFamilyMembers(JSON.parse(savedMembers));
  }, []);

  useEffect(() => {
    localStorage.setItem('family_budget_tx', JSON.stringify(transactions));
    localStorage.setItem('family_budget_goals', JSON.stringify(goals));
    localStorage.setItem('family_budget_rate', savingsRate.toString());
    localStorage.setItem('family_budget_settings', JSON.stringify(settings));
    localStorage.setItem('family_budget_shopping', JSON.stringify(shoppingItems));
    localStorage.setItem('family_budget_events', JSON.stringify(events));
    localStorage.setItem('family_budget_members', JSON.stringify(familyMembers));
  }, [transactions, goals, savingsRate, settings, shoppingItems, events, familyMembers]);

  const handleAddTransaction = (tx: Omit<Transaction, 'id'>) => {
    setTransactions([{ ...tx, id: Date.now().toString() }, ...transactions]);
  };

  const handleSaveEvent = (event: FamilyEvent) => {
    const isNew = !events.find(e => e.id === event.id);
    if (!isNew) {
      setEvents(events.map(e => e.id === event.id ? event : e));
    } else {
      setEvents([event, ...events]);
    }
    setIsEventModalOpen(false);
  };

  const handleSaveGoal = (goal: SavingsGoal) => {
    const isNew = !goals.find(g => g.id === goal.id);
    if (!isNew) {
      setGoals(goals.map(g => g.id === goal.id ? goal : g));
    } else {
      setGoals([...goals, goal]);
    }
    setIsGoalModalOpen(false);
    setSelectedGoal(null);
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
    setIsGoalModalOpen(false);
    setSelectedGoal(null);
  };

  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === now.getMonth())
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const todayPlans = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return events.filter(e => e.date === todayStr).sort((a,b) => a.time.localeCompare(b.time));
  }, [events]);

  const shoppingPreview = useMemo(() => shoppingItems.filter(i => !i.completed).slice(0, 4), [shoppingItems]);

  const toggleShoppingItem = (id: string) => {
    setShoppingItems(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  return (
    <div className="min-h-screen pb-44 md:pb-24 max-w-2xl mx-auto px-6 pt-12 text-[#1C1C1E]">
      <header className="flex justify-between items-start mb-10 text-[#1C1C1E]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-yellow-600 fill-yellow-600" />
            <span className="text-sm font-bold text-gray-400">Бюджет {settings.familyName}</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[#1C1C1E]">
            {activeTab === 'overview' ? 'Обзор' : activeTab === 'budget' ? 'Бюджет' : activeTab === 'shopping' ? 'Покупки' : 'Планы'}
          </h1>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-white shadow-soft rounded-3xl text-gray-400 border border-white hover:bg-gray-50 transition-colors ios-btn-active">
          <SettingsIcon size={22} />
        </button>
      </header>

      <main>
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              {settings.enabledWidgets.includes('balance') && (
                <SmartHeader balance={totalBalance} savingsRate={savingsRate} settings={settings} />
              )}
              
              <div className="grid grid-cols-2 gap-5">
                {settings.enabledWidgets.includes('daily') && (
                  <Widget label="На сегодня" value={`${(totalBalance * (1 - savingsRate/100) / 30).toLocaleString('ru-RU', {maximumFractionDigits: 0})} ${settings.currency}`} icon={<TrendingUp size={18}/>} />
                )}
                {settings.enabledWidgets.includes('spent') && (
                  <Widget label="Траты (мес)" value={`${currentMonthExpenses.toLocaleString('ru-RU')} ${settings.currency}`} icon={<LayoutGrid size={18}/>} />
                )}
              </div>

              {settings.enabledWidgets.includes('plans') && (
                <section className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h2 className="text-xl font-black text-[#1C1C1E]">Планы на сегодня</h2>
                    <button onClick={() => setActiveTab('plans')} className="text-[11px] font-black text-blue-500 uppercase tracking-widest">Все</button>
                  </div>
                  <div className="space-y-3">
                    {todayPlans.length === 0 ? (
                      <div className="p-6 bg-white rounded-[2rem] border border-white shadow-sm text-center text-gray-300 font-bold text-xs uppercase">Сегодня без планов 🧘‍♂️</div>
                    ) : (
                      todayPlans.map(event => {
                        const participants = familyMembers.filter(m => event.memberIds?.includes(m.id));
                        return (
                          <div key={event.id} className="bg-white p-5 rounded-[2rem] border border-white shadow-sm flex items-center gap-4">
                            <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: participants[0]?.color || '#8E8E93' }} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-sm truncate text-[#1C1C1E]">{event.title}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{event.time} • {participants.map(p => p.name).join(', ')}</p>
                            </div>
                            {event.checklist && event.checklist.length > 0 && (
                              <div className="flex items-center gap-1 text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">
                                <ListChecks size={12} />
                                <span className="text-[10px] font-black">{event.checklist.filter(c => c.completed).length}/{event.checklist.length}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              )}

              {settings.enabledWidgets.includes('shopping') && (
                <section className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h2 className="text-xl font-black text-[#1C1C1E]">Список покупок</h2>
                    <button onClick={() => setActiveTab('shopping')} className="text-[11px] font-black text-blue-500 uppercase tracking-widest">Список</button>
                  </div>
                  <div className="bg-white p-6 rounded-[2.5rem] border border-white shadow-sm space-y-3">
                    {shoppingPreview.length === 0 ? (
                      <div className="py-4 text-center text-gray-300 font-bold text-xs uppercase">Корзина пуста 🛒</div>
                    ) : (
                      shoppingPreview.map(item => (
                        <div key={item.id} className="flex items-center gap-4 group" onClick={() => toggleShoppingItem(item.id)}>
                          <button className={`transition-colors ${item.completed ? 'text-green-500' : 'text-gray-200'}`}>
                            {item.completed ? <CheckCircle2 size={20} fill="currentColor" className="text-white" /> : <Circle size={20} />}
                          </button>
                          <span className={`flex-1 text-sm font-bold ${item.completed ? 'line-through text-gray-400' : 'text-[#1C1C1E]'}`}>{item.title}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              <button
                onClick={() => setIsActionMenuOpen(true)}
                className="fixed bottom-32 right-8 w-16 h-16 bg-blue-500 text-white rounded-[1.8rem] flex items-center justify-center shadow-[0_15px_30px_rgba(59,130,246,0.3)] z-[100] ios-btn-active"
              >
                <Plus size={32} strokeWidth={3} />
              </button>
            </motion.div>
          )}

          {activeTab === 'budget' && (
            <motion.div key="budget" className="space-y-10">
              <section className="flex flex-col gap-6">
                <div className="flex justify-between items-center px-1">
                  <h2 className="text-xl font-black text-[#1C1C1E]">Календарь трат</h2>
                  <div className="flex gap-2">
                    <button onClick={() => { setIsActionMenuOpen(false); setIsModalOpen(true); }} className="p-3 bg-white border border-gray-100 text-blue-500 rounded-2xl shadow-sm ios-btn-active"><Plus size={20} /></button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-blue-500 font-bold text-sm bg-blue-50 px-5 py-2.5 rounded-2xl shadow-sm ios-btn-active"><Upload size={14} /> Импорт</button>
                  </div>
                </div>
                <SpendingCalendar transactions={transactions} selectedDate={selectedDate} onSelectDate={setSelectedDate} settings={settings} />
              </section>

              <section>
                <h2 className="text-xl font-black mb-5 px-1 text-[#1C1C1E]">История операций</h2>
                <TransactionHistory transactions={transactions} settings={settings} members={familyMembers} />
              </section>

              <section>
                <h2 className="text-xl font-black mb-5 px-1 text-[#1C1C1E]">Умная категоризация</h2>
                <CategoryProgress transactions={transactions} settings={settings} />
              </section>

              <GoalsSection 
                goals={goals} 
                settings={settings} 
                onAddGoal={() => { setSelectedGoal(null); setIsGoalModalOpen(true); }}
                onEditGoal={(goal) => { setSelectedGoal(goal); setIsGoalModalOpen(true); }}
              />
            </motion.div>
          )}

          {activeTab === 'shopping' && (
            <motion.div key="shopping">
              <ShoppingList items={shoppingItems} setItems={setShoppingItems} settings={settings} members={familyMembers} onCompletePurchase={handleAddTransaction} />
            </motion.div>
          )}

          {activeTab === 'plans' && (
            <motion.div key="plans">
              <FamilyPlans events={events} setEvents={setEvents} settings={settings} members={familyMembers} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isActionMenuOpen && (
          <div className="fixed inset-0 z-[550] flex items-end justify-center px-4 pb-32">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsActionMenuOpen(false)} className="absolute inset-0 bg-[#1C1C1E]/10 backdrop-blur-sm" />
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-4 space-y-2">
                <button onClick={() => { setIsActionMenuOpen(false); setIsModalOpen(true); }} className="w-full flex items-center gap-4 p-5 rounded-3xl hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center"><CreditCard size={24} /></div>
                  <div className="text-left"><p className="font-black text-sm text-[#1C1C1E]">Новая операция</p><p className="text-[10px] font-bold text-gray-400 uppercase">Расход или доход</p></div>
                </button>
                <button onClick={() => { setIsActionMenuOpen(false); setIsEventModalOpen(true); }} className="w-full flex items-center gap-4 p-5 rounded-3xl hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center"><Calendar size={24} /></div>
                  <div className="text-left"><p className="font-black text-sm text-[#1C1C1E]">Новое событие</p><p className="text-[10px] font-bold text-gray-400 uppercase">План в календаре</p></div>
                </button>
              </div>
              <button onClick={() => setIsActionMenuOpen(false)} className="w-full p-6 bg-gray-50 text-gray-400 font-black text-xs uppercase tracking-widest border-t border-gray-100">Отмена</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-1.5 shadow-soft z-[100] flex justify-between items-center">
        <NavButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutGrid size={22} />} label="Обзор" />
        <NavButton active={activeTab === 'budget'} onClick={() => setActiveTab('budget')} icon={<Wallet size={22} />} label="Бюджет" />
        <NavButton active={activeTab === 'plans'} onClick={() => setActiveTab('plans')} icon={<CalendarDays size={22} />} label="Планы" />
        <NavButton active={activeTab === 'shopping'} onClick={() => setActiveTab('shopping')} icon={<ShoppingBag size={22} />} label="Покупки" />
      </nav>

      <AnimatePresence>
        {isModalOpen && <AddTransactionModal onClose={() => setIsModalOpen(false)} onSubmit={handleAddTransaction} settings={settings} members={familyMembers} />}
        {isEventModalOpen && <EventModal event={null} members={familyMembers} onClose={() => setIsEventModalOpen(false)} onSave={handleSaveEvent} onSendToTelegram={async () => false} templates={events.filter(e => e.isTemplate)} settings={settings} />}
        {isGoalModalOpen && <GoalModal goal={selectedGoal} onClose={() => { setIsGoalModalOpen(false); setSelectedGoal(null); }} onSave={handleSaveGoal} onDelete={handleDeleteGoal} settings={settings} />}
        {isSettingsOpen && <SettingsModal settings={settings} onClose={() => setIsSettingsOpen(false)} onUpdate={setSettings} onReset={() => window.location.reload()} savingsRate={savingsRate} setSavingsRate={setSavingsRate} members={familyMembers} onUpdateMembers={setFamilyMembers} />}
        {isImportModalOpen && <ImportModal preview={importPreview} onConfirm={() => { setTransactions([...importPreview.map(t => ({...t, id: Math.random().toString()})), ...transactions]); setIsImportModalOpen(false); }} onCancel={() => setIsImportModalOpen(false)} settings={settings} />}
      </AnimatePresence>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-[1.8rem] transition-all ${active ? 'text-blue-600 bg-blue-50/50 scale-100 font-black' : 'text-gray-400'}`}>
    {React.cloneElement(icon, { strokeWidth: active ? 3 : 2 })}
    <span className="text-[10px] uppercase tracking-widest font-black leading-none">{label}</span>
  </button>
);

export const MemberMarker = ({ member, size = 'md' }: { member: FamilyMember; size?: 'sm' | 'md' | 'lg' }) => {
  const dimensions = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';
  return <div className={`${dimensions} rounded-full flex items-center justify-center font-black text-white shadow-sm border-2 border-white/30`} style={{ backgroundColor: member.color }}>{member.name.charAt(0).toUpperCase()}</div>;
};

export default App;
