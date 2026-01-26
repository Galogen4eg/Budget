
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { Search, X, History, Globe, Home, Sparkles, RefreshCw, Save, ChevronRight } from 'lucide-react';
import { getIconById } from '../constants';
import { addGlobalRule } from '../utils/db';
import BudgetMobile from './BudgetMobile';
import BudgetDesktop from './BudgetDesktop';

interface TransactionHistoryProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onLearnRule: (rule: LearnedRule) => void;
  onApplyRuleToExisting?: (rule: LearnedRule) => void;
  categories: Category[];
  filterMode?: 'day' | 'month';
  onEditTransaction?: (tx: Transaction) => void;
  initialSearch?: string;
  selectedCategoryId?: string;
  selectedMerchantName?: string;
  onClearFilters?: () => void;
  onViewAll?: () => void;
  hideActiveFilterBadge?: boolean;
  onAddCategory?: (category: Category) => void;
  selectedDate?: Date | null;
  currentMonth?: Date;
  hideTitle?: boolean;
}

const PRESET_COLORS = [ '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', '#FF3B30', '#5856D6', '#00C7BE', '#8E8E93', '#BF5AF2', '#1C1C1E' ];
const PRESET_ICONS = [ 'Utensils', 'Car', 'Home', 'ShoppingBag', 'Heart', 'Zap', 'Plane', 'Briefcase', 'PiggyBank', 'Coffee', 'Tv', 'MoreHorizontal', 'Shirt', 'Music', 'Gamepad2', 'Baby', 'Dog', 'Cat', 'Flower2', 'Hammer', 'Wrench', 'BookOpen', 'GraduationCap', 'Palmtree', 'Gift', 'Smartphone', 'Wifi', 'Scissors', 'Bath', 'Bed', 'Sofa', 'Bike', 'Drumstick', 'Pill', 'Stethoscope', 'Dumbbell', 'Ticket', 'Monitor', 'Footprints', 'Smile', 'HeartHandshake', 'FileText', 'ShieldCheck' ];

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ 
    transactions, setTransactions, settings, members, onLearnRule, onApplyRuleToExisting, 
    categories, filterMode = 'month', onEditTransaction, initialSearch = '', 
    selectedCategoryId, selectedMerchantName, onClearFilters, onViewAll, hideActiveFilterBadge = false, 
    onAddCategory, selectedDate, currentMonth, hideTitle = false 
}) => {
  const [learningTx, setLearningTx] = useState<Transaction | null>(null);
  
  // Learning Modal State
  const [learningCat, setLearningCat] = useState('food');
  const [learningName, setLearningName] = useState('');
  const [learningKeyword, setLearningKeyword] = useState('');
  const [saveScope, setSaveScope] = useState<'local' | 'global'>('local');
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  // Create Category Mode State
  const [catSelectionMode, setCatSelectionMode] = useState<'select' | 'create'>('select');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [newCatIcon, setNewCatIcon] = useState(PRESET_ICONS[0]);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [showAll, setShowAll] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Responsive Check
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
      setSearchQuery(initialSearch);
  }, [initialSearch]);

  const searchedTransactions = useMemo(() => {
    let result = transactions;

    if (selectedDate) {
        const targetStr = selectedDate.toDateString();
        result = result.filter(tx => new Date(tx.date).toDateString() === targetStr);
    } else if (currentMonth && filterMode === 'month') {
        result = result.filter(tx => {
            const d = new Date(tx.date);
            return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
        });
    }

    if (selectedCategoryId && selectedCategoryId !== 'all') {
        result = result.filter(tx => tx.category === selectedCategoryId);
    }
    if (selectedMerchantName) {
        result = result.filter(tx => (tx.note || '').includes(selectedMerchantName));
    }

    if (!searchQuery.trim()) return result;
    
    const query = searchQuery.toLowerCase();
    return result.filter(tx => {
        const category = categories.find(c => c.id === tx.category)?.label || '';
        return (tx.note || '').toLowerCase().includes(query) || 
               (tx.rawNote || '').toLowerCase().includes(query) ||
               category.toLowerCase().includes(query) ||
               tx.amount.toString().includes(query);
    });
  }, [transactions, searchQuery, categories, selectedCategoryId, selectedMerchantName, selectedDate, currentMonth, filterMode]);

  // Limit items for initial view on mobile unless Show All is clicked or filtering is active
  const visibleTransactions = useMemo(() => {
    if (isDesktop || searchQuery.trim() || filterMode === 'day' || showAll || selectedCategoryId || selectedDate) {
      return searchedTransactions;
    }
    // Sort and slice for mobile initial view
    return [...searchedTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);
  }, [searchedTransactions, searchQuery, filterMode, showAll, selectedCategoryId, selectedDate, isDesktop]);

  const handleStartLearning = (tx: Transaction) => {
    setLearningTx(tx);
    setLearningName(''); 
    let keyword = (tx.rawNote || tx.note).trim();
    if (/\d{4,}$/.test(keyword)) {
        keyword = keyword.replace(/\s?\d+$/, '').trim();
    }
    setLearningKeyword(keyword);
    setLearningCat(tx.category === 'other' ? 'food' : tx.category);
    setCatSelectionMode('select');
    setNewCatName('');
    setNewCatColor(PRESET_COLORS[0]);
    setNewCatIcon(PRESET_ICONS[0]);
    setSaveScope('local'); 
    setShowAllCategories(false); 
  };

  const handleFinishLearning = (applyToExisting: boolean = false) => {
    if (!learningTx || !learningKeyword.trim()) {
        alert("Заполните ключевое слово");
        return;
    }
    let targetCategoryId = learningCat;

    if (catSelectionMode === 'create') {
        if (!newCatName.trim()) { alert('Введите название категории'); return; }
        if (onAddCategory) {
            const newId = newCatName.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
            const newCategory: Category = {
                id: newId,
                label: newCatName.trim(),
                color: newCatColor,
                icon: newCatIcon,
                isCustom: true
            };
            onAddCategory(newCategory);
            targetCategoryId = newId;
        }
    }

    const newRule: LearnedRule = {
      id: Date.now().toString(),
      keyword: learningKeyword.trim(),
      cleanName: learningName.trim() || learningTx.note || 'Операция', 
      categoryId: targetCategoryId
    };
    
    onLearnRule(newRule);
    
    if (saveScope === 'global') {
        addGlobalRule(newRule).catch(err => console.error("Could not save global rule", err));
    }

    const updatedTx = { ...learningTx, category: targetCategoryId, note: newRule.cleanName };
    setTransactions(prev => prev.map(t => t.id === learningTx.id ? updatedTx : t));

    if (applyToExisting && onApplyRuleToExisting) onApplyRuleToExisting(newRule);
    setLearningTx(null);
  };

  // Determine if we should force mobile view (e.g. inside DrillDownModal which is narrow)
  const effectiveIsDesktop = isDesktop && !hideTitle; 

  const MainContent = () => (
      <>
          {/* Header Section (Mobile or Embedded) */}
          {!effectiveIsDesktop && !hideTitle && (
              <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                      <div className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-gray-500 dark:text-gray-300">
                          <History size={18} />
                      </div>
                      <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white">История</h3>
                  </div>
              </div>
          )}

          {/* Search Input */}
          {transactions.length > 0 && (
              <div className="relative mb-2">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию или сумме..."
                    className={`w-full p-3 pl-10 rounded-2xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:border-blue-500 transition-colors shadow-sm ${effectiveIsDesktop ? 'bg-gray-50 dark:bg-[#2C2C2E] border-transparent' : 'bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5'}`}
                  />
                  <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3.5 text-gray-400 hover:text-red-500">
                          <X size={16} />
                      </button>
                  )}
              </div>
          )}

          {/* Mobile Stat Header */}
          {!effectiveIsDesktop && filterMode === 'month' && !selectedDate && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-2">
                  <div className="bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl p-4 text-[#1C1C1E] dark:text-white flex-1 min-w-[140px]">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">
                          Расход {currentMonth && `(${currentMonth.toLocaleString('ru', { month: 'short' })})`}
                      </span>
                      <span className="text-xl md:text-3xl font-black">{settings.privacyMode ? '•••' : searchedTransactions.filter(t => t.type === 'expense').reduce((a,b)=>a+b.amount,0).toLocaleString()}</span>
                  </div>
              </div>
          )}

          {/* Main List */}
          <div className="flex-1 min-h-0">
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-gray-300 dark:text-gray-600 font-bold text-xs uppercase tracking-widest">Нет операций</div>
              ) : searchedTransactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-bold text-sm">Ничего не найдено</div>
              ) : (
                effectiveIsDesktop ? (
                    <BudgetDesktop 
                        transactions={searchedTransactions} 
                        categories={categories}
                        members={members}
                        onEdit={(tx) => onEditTransaction && onEditTransaction(tx)}
                        onStartLearning={handleStartLearning}
                        privacyMode={settings.privacyMode}
                    />
                ) : (
                    <BudgetMobile 
                        transactions={visibleTransactions}
                        categories={categories}
                        members={members}
                        onEdit={(tx) => onEditTransaction && onEditTransaction(tx)}
                        onStartLearning={handleStartLearning}
                        privacyMode={settings.privacyMode}
                    />
                )
              )}
              
              {!effectiveIsDesktop && searchedTransactions.length > 15 && !showAll && !selectedCategoryId && !selectedDate && !searchQuery && (
                <button onClick={() => setShowAll(true)} className="w-full mt-4 py-4 text-xs font-black text-gray-400 uppercase tracking-widest bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-100 dark:border-white/5 hover:text-blue-500 transition-colors">
                    Показать все
                </button>
              )}
          </div>
      </>
  );

  return (
    <div className="w-full h-full flex flex-col">
      {effectiveIsDesktop ? (
          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] h-full flex flex-col border border-white dark:border-white/5 shadow-soft dark:shadow-none relative group">
              {/* Desktop Header */}
              <div className="flex justify-between items-center mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                      <div className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-gray-500 dark:text-gray-300">
                          <History size={18} />
                      </div>
                      <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white">История</h3>
                  </div>
                  {/* Arrow for interaction */}
                  <button 
                    onClick={() => {
                        if (onViewAll) {
                            onViewAll();
                        } else if (onClearFilters) {
                            onClearFilters();
                        }
                        setSearchQuery('');
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2C2C2E] text-gray-300 hover:text-blue-500 transition-colors"
                    title="Открыть полный список"
                  >
                      <ChevronRight size={20} />
                  </button>
              </div>
              <MainContent />
          </div>
      ) : (
          <div className="space-y-4 h-full flex flex-col">
              <MainContent />
          </div>
      )}

      {/* Learning Modal */}
      <AnimatePresence>
        {learningTx && (
          <div className="fixed inset-0 z-[2500] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLearningTx(null)} className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-lg rounded-[2.5rem] p-0 shadow-2xl flex flex-col max-h-[90vh]">
                
                <div className="p-6 bg-white dark:bg-[#1C1C1E] border-b border-gray-100 dark:border-white/5 flex justify-between items-center rounded-t-[2.5rem] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <Sparkles size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white">Обучение</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Авто-категоризация</p>
                        </div>
                    </div>
                    <button onClick={() => setLearningTx(null)} className="bg-gray-100 dark:bg-[#2C2C2E] p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3A3A3C]"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    {/* Source Info */}
                    <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border border-white dark:border-white/5 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1 bg-gray-100 dark:bg-[#2C2C2E] rounded-lg"><Search size={12} className="text-gray-500"/></div>
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Данные из выписки</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl border border-gray-100 dark:border-white/5 text-sm font-bold text-[#1C1C1E] dark:text-white break-all leading-relaxed">
                            {learningTx.rawNote || learningTx.note}
                        </div>
                    </div>
                    
                    {/* Rule Configuration */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-[#1C1C1E] dark:text-white uppercase tracking-widest ml-2">Настройка правила</h4>
                        
                        <div className="grid gap-3">
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Если содержит (Ключ)</label>
                                <textarea 
                                    rows={3}
                                    value={learningKeyword} 
                                    onChange={e => setLearningKeyword(e.target.value)} 
                                    className="w-full bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl font-bold text-sm outline-none shadow-sm border border-transparent dark:border-white/5 focus:border-blue-500 transition-colors text-[#1C1C1E] dark:text-white resize-none"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Переименовать в (Опционально)</label>
                                <input 
                                    type="text" 
                                    placeholder="Оставить как есть..."
                                    value={learningName} 
                                    onChange={e => setLearningName(e.target.value)} 
                                    className="w-full bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl font-bold text-sm outline-none shadow-sm border border-transparent dark:border-white/5 focus:border-blue-500 transition-colors text-[#1C1C1E] dark:text-white" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Category Selection / Creation */}
                    <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] border border-white dark:border-white/5 shadow-sm">
                        <div className="flex bg-gray-100 dark:bg-[#2C2C2E] p-1 rounded-xl mb-4">
                            <button 
                                onClick={() => setCatSelectionMode('select')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${catSelectionMode === 'select' ? 'bg-white dark:bg-[#1C1C1E] shadow-sm text-[#1C1C1E] dark:text-white' : 'text-gray-400'}`}
                            >
                                Выбрать
                            </button>
                            <button 
                                onClick={() => setCatSelectionMode('create')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${catSelectionMode === 'create' ? 'bg-white dark:bg-[#1C1C1E] shadow-sm text-blue-600' : 'text-gray-400'}`}
                            >
                                + Создать
                            </button>
                        </div>

                        {catSelectionMode === 'create' ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                <input 
                                    type="text" 
                                    placeholder="Название категории" 
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl text-sm font-bold outline-none text-[#1C1C1E] dark:text-white"
                                    autoFocus
                                />
                                <div className="space-y-2">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase ml-1">Цвет</p>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                        {PRESET_COLORS.map(c => (
                                            <button 
                                                key={c} 
                                                onClick={() => setNewCatColor(c)} 
                                                className={`w-8 h-8 rounded-full shrink-0 transition-transform ${newCatColor === c ? 'scale-110 ring-2 ring-offset-2 ring-gray-300 dark:ring-gray-600' : ''}`} 
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase ml-1">Иконка</p>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                        {PRESET_ICONS.map(icon => (
                                            <button 
                                                key={icon} 
                                                onClick={() => setNewCatIcon(icon)} 
                                                className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-all ${newCatIcon === icon ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-black shadow-lg' : 'bg-gray-50 dark:bg-[#2C2C2E] text-gray-400'}`}
                                            >
                                                {getIconById(icon, 18)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 content-start animate-in fade-in">
                                    {(showAllCategories ? categories : categories.slice(0, 5)).map(cat => (
                                        <button 
                                            key={cat.id} 
                                            onClick={() => setLearningCat(cat.id)}
                                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all border ${learningCat === cat.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-sm ring-1 ring-blue-200 dark:ring-blue-800' : 'bg-gray-50 dark:bg-[#2C2C2E] border-transparent opacity-80 hover:opacity-100 hover:scale-[1.02]'}`}
                                        >
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-sm" style={{ backgroundColor: cat.color }}>
                                                {getIconById(cat.icon, 20)}
                                            </div>
                                            <span className={`text-xs font-bold text-center leading-tight ${learningCat === cat.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                                {!showAllCategories && categories.length > 5 && (
                                    <button 
                                        onClick={() => setShowAllCategories(true)}
                                        className="w-full mt-3 py-2 bg-gray-50 dark:bg-[#2C2C2E] text-gray-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
                                    >
                                        Показать все ({categories.length})
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 flex flex-col gap-3 rounded-b-[2.5rem] shrink-0">
                    
                    {/* Scope Selector */}
                    <div className="flex bg-gray-100 dark:bg-[#2C2C2E] p-1 rounded-xl mb-1">
                        <button 
                            onClick={() => setSaveScope('local')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${saveScope === 'local' ? 'bg-white dark:bg-[#1C1C1E] shadow-sm text-[#1C1C1E] dark:text-white' : 'text-gray-400'}`}
                        >
                            <Home size={12} />
                            Локально
                        </button>
                        <button 
                            onClick={() => setSaveScope('global')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${saveScope === 'global' ? 'bg-white dark:bg-[#1C1C1E] shadow-sm text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}
                        >
                            <Globe size={12} />
                            Глобально
                        </button>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium text-center px-4">
                        {saveScope === 'local' 
                            ? 'Правило сохранится только для вашей семьи' 
                            : 'Правило поможет другим пользователям распознать эту транзакцию'}
                    </p>

                    <button onClick={() => handleFinishLearning(false)} className="w-full py-4 bg-[#1C1C1E] dark:bg-white text-white dark:text-black font-black rounded-2xl uppercase text-xs shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
                        <Save size={16} />
                        {catSelectionMode === 'create' ? 'Создать и Запомнить' : 'Запомнить правило'}
                    </button>
                    {onApplyRuleToExisting && (
                        <button onClick={() => handleFinishLearning(true)} className="w-full py-3 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-bold rounded-2xl uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-gray-50 dark:hover:bg-[#3A3A3C]">
                            <RefreshCw size={14} /> Применить к старым операциям
                        </button>
                    )}
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransactionHistory;
