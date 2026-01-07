
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, AppSettings, FamilyMember, LearnedRule, Category } from '../types';
import { getIconById } from '../constants';
import { Sparkles, Check, ArrowDownRight, ArrowUpRight, Wallet, ChevronDown, ChevronUp, Clock, AlertTriangle, Search, X, CalendarDays, RefreshCw, Filter, Plus, Save, Globe, Lock, Home, History } from 'lucide-react';
import { getMerchantBrandKey } from '../utils/categorizer';
import BrandIcon from './BrandIcon';
import { addGlobalRule } from '../utils/db';

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
  hideActiveFilterBadge?: boolean;
  onAddCategory?: (category: Category) => void;
  selectedDate?: Date | null;
}

// Simple constants for creating categories inline
const PRESET_COLORS = [ '#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', '#FF3B30', '#5856D6', '#00C7BE', '#8E8E93', '#BF5AF2', '#1C1C1E' ];
const PRESET_ICONS = [ 'Utensils', 'Car', 'Home', 'ShoppingBag', 'Heart', 'Zap', 'Plane', 'Briefcase', 'PiggyBank', 'Coffee', 'Tv', 'MoreHorizontal', 'Shirt', 'Music', 'Gamepad2', 'Baby', 'Dog', 'Cat', 'Flower2', 'Hammer', 'Wrench', 'BookOpen', 'GraduationCap', 'Palmtree', 'Gift', 'Smartphone', 'Wifi', 'Scissors', 'Bath', 'Bed', 'Sofa', 'Bike', 'Drumstick', 'Pill', 'Stethoscope', 'Dumbbell', 'Ticket', 'Monitor', 'Footprints', 'Smile', 'HeartHandshake', 'FileText', 'ShieldCheck' ];

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

// Memoized Card Component
const TransactionCard = React.memo(({ 
    tx, 
    category, 
    member, 
    onEdit, 
    onStartLearning, 
    privacyMode 
}: { 
    tx: Transaction, 
    category?: Category, 
    member?: FamilyMember, 
    onEdit?: (tx: Transaction) => void, 
    onStartLearning: (tx: Transaction) => void,
    privacyMode: boolean
}) => {
    const displayTitle = tx.note || category?.label || 'Операция';
    const brandKey = getMerchantBrandKey(displayTitle);
    const isUnrecognized = tx.category === 'other';
    const timeString = new Date(tx.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    return (
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        animate="show"
        onClick={() => onEdit && onEdit(tx)}
        className={`group flex items-center gap-3 p-3 bg-white dark:bg-[#1C1C1E] hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-2xl transition-all shadow-sm border border-transparent dark:border-white/5 cursor-pointer active:scale-[0.99] ${isUnrecognized ? 'border-yellow-100/50 bg-yellow-50/10 dark:bg-yellow-900/10 dark:border-yellow-900/20' : ''}`}
      >
        <div className="flex-shrink-0">
            <BrandIcon name={displayTitle} brandKey={brandKey} category={category} size="sm" />
        </div>
        
        <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1C1C1E] dark:text-white truncate">{displayTitle}</span>
                    {isUnrecognized && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0"/>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-medium text-gray-400">{timeString}</span>
                    {member && (
                        <>
                            <span className="text-gray-300 dark:text-gray-600 text-[8px]">•</span>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.color }}/>
                                <span className="text-[10px] font-medium text-gray-400 truncate max-w-[60px]">{member.name}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <div className="text-right whitespace-nowrap">
              <span className={`text-sm font-black tabular-nums ${tx.type === 'income' ? 'text-green-500' : 'text-[#1C1C1E] dark:text-white'}`}>
                {privacyMode ? '•••' : `${tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}`}
              </span>
            </div>
        </div>
        <button 
            onClick={(e) => { e.stopPropagation(); onStartLearning(tx); }}
            className={`p-2 rounded-xl transition-all ${
                isUnrecognized 
                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400 opacity-100 shadow-sm' 
                    : 'bg-gray-50 dark:bg-[#3A3A3C] text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 opacity-0 group-hover:opacity-100'
            }`}
            title="Обучить категорию"
        >
            <Sparkles size={16} fill={isUnrecognized ? "currentColor" : "none"} />
        </button>
      </motion.div>
    );
});

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, setTransactions, settings, members, onLearnRule, onApplyRuleToExisting, categories, filterMode = 'month', onEditTransaction, initialSearch = '', selectedCategoryId, selectedMerchantName, onClearFilters, hideActiveFilterBadge = false, onAddCategory, selectedDate }) => {
  const [learningTx, setLearningTx] = useState<Transaction | null>(null);
  
  // Learning Modal State
  const [learningCat, setLearningCat] = useState('food');
  const [learningName, setLearningName] = useState('');
  const [learningKeyword, setLearningKeyword] = useState('');
  const [saveScope, setSaveScope] = useState<'local' | 'global'>('local');
  
  // Create Category Mode State
  const [catSelectionMode, setCatSelectionMode] = useState<'select' | 'create'>('select');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [newCatIcon, setNewCatIcon] = useState(PRESET_ICONS[0]);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [showAll, setShowAll] = useState(false);
  
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  useEffect(() => {
      setSearchQuery(initialSearch);
  }, [initialSearch]);

  const toggleDayCollapse = (dateKey: string) => {
      setCollapsedDays(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };
  
  const searchedTransactions = useMemo(() => {
    let result = transactions;

    // Filter by specific day if selected
    if (selectedDate) {
        const targetStr = selectedDate.toDateString();
        result = result.filter(tx => new Date(tx.date).toDateString() === targetStr);
    }

    // Apply strict category/merchant filters
    if (selectedCategoryId) {
        result = result.filter(tx => tx.category === selectedCategoryId);
    }
    if (selectedMerchantName) {
        // Simple includes check, usually merchant name is stored in note
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
  }, [transactions, searchQuery, categories, selectedCategoryId, selectedMerchantName, selectedDate]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    searchedTransactions.forEach(tx => {
      const dateKey = new Date(tx.date).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    return sortedDates.map(date => {
      const dayTxs = groups[date];
      const dayIncome = dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const dayExpense = dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return {
        date,
        transactions: dayTxs,
        dayIncome,
        dayExpense,
        net: dayIncome - dayExpense,
        count: dayTxs.length
      };
    });
  }, [searchedTransactions]);

  const visibleGroups = useMemo(() => {
    if (searchQuery.trim() || filterMode === 'day' || showAll || selectedCategoryId || selectedDate) {
      return groupedTransactions;
    }
    return groupedTransactions.slice(0, 5); // Increased for better visibility
  }, [groupedTransactions, searchQuery, filterMode, showAll, selectedCategoryId, selectedDate]);

  const handleStartLearning = (tx: Transaction) => {
    setLearningTx(tx);
    setLearningName(''); // Default empty as requested
    
    // Smart keyword suggestion: use raw note, remove common suffixes
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
    setSaveScope('local'); // Reset to local default
  };

  const handleFinishLearning = (applyToExisting: boolean = false) => {
    if (!learningTx || !learningKeyword.trim()) {
        alert("Заполните ключевое слово");
        return;
    }
    
    let targetCategoryId = learningCat;

    // Create Category if needed
    if (catSelectionMode === 'create') {
        if (!newCatName.trim()) {
            alert('Введите название категории');
            return;
        }
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
      cleanName: learningName.trim() || learningTx.note || 'Операция', // Fallback only if empty on save
      categoryId: targetCategoryId
    };
    
    // 1. Save Local Rule (Always do this for immediate UI update)
    onLearnRule(newRule);
    
    // 2. Save Global Rule (Only if selected)
    if (saveScope === 'global') {
        addGlobalRule(newRule).catch(err => console.error("Could not save global rule", err));
    }

    // 3. Apply to current
    const updatedTx = { ...learningTx, category: targetCategoryId, note: newRule.cleanName };
    setTransactions(prev => prev.map(t => t.id === learningTx.id ? updatedTx : t));

    // 4. Apply to others if requested
    if (applyToExisting && onApplyRuleToExisting) {
        onApplyRuleToExisting(newRule);
    }
    
    setLearningTx(null);
  };

  const activeCategory = selectedCategoryId ? categories.find(c => c.id === selectedCategoryId) : null;

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-2 mb-2 px-1">
          <div className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-gray-500 dark:text-gray-300">
              <History size={18} />
          </div>
          <h3 className="text-lg font-black text-[#1C1C1E] dark:text-white">История</h3>
      </div>

      {/* Active Filter UI - Only show if not hidden via props */}
      {(selectedCategoryId || selectedDate) && !hideActiveFilterBadge && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between bg-blue-500 text-white p-3 rounded-2xl shadow-lg">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-md">
                      <Filter size={16} />
                  </div>
                  <div>
                      <span className="text-[10px] font-bold uppercase opacity-80 block leading-tight">Фильтр</span>
                      <span className="font-bold text-sm">
                          {selectedDate ? selectedDate.toLocaleDateString('ru-RU', {day:'numeric', month:'long'}) : activeCategory?.label} 
                          {selectedMerchantName ? ` • ${selectedMerchantName}` : ''}
                      </span>
                  </div>
              </div>
              <button 
                onClick={onClearFilters} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                  <X size={18} />
              </button>
          </motion.div>
      )}

      {/* Header Stat (Simplified) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {filterMode === 'month' && !selectedDate && (
              <div className="bg-[#1C1C1E] dark:bg-white rounded-2xl p-4 text-white dark:text-black flex-1 min-w-[140px]">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Расход</span>
                  <span className="text-xl font-black">{settings.privacyMode ? '•••' : searchedTransactions.filter(t => t.type === 'expense').reduce((a,b)=>a+b.amount,0).toLocaleString()}</span>
              </div>
          )}
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-10 text-gray-300 dark:text-gray-600 font-bold text-xs uppercase tracking-widest">Нет операций</div>
      ) : searchedTransactions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 font-bold text-sm">Ничего не найдено</div>
      ) : (
        <motion.div 
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="space-y-4"
        >
            {visibleGroups.map((group) => {
                const isCollapsed = collapsedDays[group.date];
                const isPositiveDay = group.net > 0;

                return (
                    <motion.div variants={itemVariants} key={group.date} className="space-y-1">
                        <div onClick={() => toggleDayCollapse(group.date)} className="flex items-center justify-between px-3 py-2 cursor-pointer bg-gray-100/70 dark:bg-[#1C1C1E]/70 hover:bg-gray-200/70 dark:hover:bg-[#2C2C2E] rounded-xl transition-colors backdrop-blur-sm">
                            <span className="text-xs font-black text-[#1C1C1E] dark:text-white uppercase tracking-wider">
                                {new Date(group.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                    isPositiveDay 
                                        ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' 
                                        : 'text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-white/10'
                                }`}>
                                    {settings.privacyMode 
                                        ? '•••' 
                                        : `${isPositiveDay ? '+' : ''}${group.net.toLocaleString()}`
                                    }
                                </span>
                                {isCollapsed ? <ChevronDown size={12} className="text-gray-400"/> : <ChevronUp size={12} className="text-gray-400"/>}
                            </div>
                        </div>

                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: 'auto', opacity: 1 }} 
                                    exit={{ height: 0, opacity: 0 }}
                                    className="flex flex-col gap-2 pt-1"
                                >
                                    {group.transactions.map(tx => (
                                        <TransactionCard 
                                            key={tx.id} 
                                            tx={tx} 
                                            category={categories.find(c => c.id === tx.category)}
                                            member={members.find(m => m.id === tx.memberId)}
                                            onEdit={onEditTransaction}
                                            onStartLearning={handleStartLearning}
                                            privacyMode={settings.privacyMode}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                );
            })}
        </motion.div>
      )}

      {groupedTransactions.length > 5 && !showAll && !selectedCategoryId && !selectedDate && (
        <button onClick={() => setShowAll(true)} className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-widest bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-100 dark:border-white/5 hover:text-blue-500 transition-colors">
            Показать все
        </button>
      )}

      <AnimatePresence>
        {learningTx && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
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
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto no-scrollbar content-start animate-in fade-in">
                                {categories.map(cat => (
                                    <button 
                                        key={cat.id} 
                                        onClick={() => setLearningCat(cat.id)}
                                        className={`flex flex-col items-center justify-center gap-2 p-4 h-full rounded-2xl transition-all border ${learningCat === cat.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-sm ring-1 ring-blue-200 dark:ring-blue-800' : 'bg-gray-50 dark:bg-[#2C2C2E] border-transparent opacity-80 hover:opacity-100 hover:scale-[1.02]'}`}
                                    >
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-sm" style={{ backgroundColor: cat.color }}>
                                            {getIconById(cat.icon, 20)}
                                        </div>
                                        <span className={`text-xs font-bold text-center leading-tight ${learningCat === cat.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>{cat.label}</span>
                                    </button>
                                ))}
                            </div>
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
