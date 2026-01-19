
import React, { useState, useMemo } from 'react';
import { 
  Plus, BrainCircuit, Zap, ShoppingBag, Car, HeartPulse, Utensils, 
  Home, Briefcase, GraduationCap, Filter, X, ChevronLeft, Palette, 
  Coffee, Save, Layers, Sparkles, Gamepad2, Camera, Music, Plane, 
  Gift, Smartphone, CreditCard, Settings2, Search, Trash2, Edit3, RefreshCw, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { Category, LearnedRule, AppSettings, Transaction } from '../types';

interface CategoriesSettingsProps {
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
  onDeleteCategory?: (id: string) => void;
  learnedRules: LearnedRule[];
  onUpdateRules: (rules: LearnedRule[]) => void;
  settings: AppSettings;
  transactions?: Transaction[];
  onUpdateTransactions?: (transactions: Transaction[]) => void;
}

const AVAILABLE_ICONS = [
  'ShoppingBag', 'Car', 'HeartPulse', 'Utensils', 'Home', 'Briefcase', 
  'Gamepad2', 'GraduationCap', 'Coffee', 'Camera', 'Music', 'Plane', 
  'Gift', 'Smartphone', 'CreditCard', 'Palette'
];

const PRESET_COLORS = [
  'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 
  'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-600', 
  'bg-zinc-600', 'bg-cyan-500', 'bg-amber-700'
];

// Helper to convert hex/tailwind colors from app to the specific tailwind classes used in the design
const getColorStyle = (colorStr: string) => {
    if (colorStr.startsWith('#')) return { backgroundColor: colorStr };
    return {}; // It's a tailwind class, applied via className
};

const getColorClass = (colorStr: string) => {
    if (colorStr.startsWith('#')) return ''; // Using style prop
    return colorStr;
};

const IconRenderer = ({ name, size = 18, className = "" }: { name: string, size?: number, className?: string }) => {
    const icons: any = {
      ShoppingBag, Car, HeartPulse, Utensils, Home, Briefcase, 
      Gamepad2, GraduationCap, Coffee, Camera, Music, Plane, 
      Gift, Smartphone, CreditCard, Palette, Settings2
    };
    const IconComponent = icons[name] || Settings2;
    return <IconComponent size={size} className={className} />;
};

const CategoriesSettings: React.FC<CategoriesSettingsProps> = ({ 
    categories, onUpdateCategories, onDeleteCategory, learnedRules, onUpdateRules, settings,
    transactions, onUpdateTransactions
}) => {
  const isDarkMode = settings.theme === 'dark';
  const [view, setView] = useState<'main' | 'category_form' | 'manage_categories' | 'edit_rule'>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Collapse state for manage categories
  const [showAll, setShowAll] = useState(false);

  // Category Form State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('bg-blue-500');
  const [catIcon, setCatIcon] = useState('ShoppingBag');
  const [catKeywords, setCatKeywords] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Rule Form State
  const [editingRule, setEditingRule] = useState<LearnedRule | null>(null);
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleCategoryId, setRuleCategoryId] = useState<string | null>(null);

  // Calculate usage frequency from transactions
  const categoryUsage = useMemo(() => {
      const counts: Record<string, number> = {};
      if (transactions) {
          transactions.forEach(t => {
              counts[t.category] = (counts[t.category] || 0) + 1;
          });
      }
      return counts;
  }, [transactions]);

  const sortedCategories = useMemo(() => {
      return [...categories].sort((a, b) => {
          // Sort by usage count descending
          const countA = categoryUsage[a.id] || 0;
          const countB = categoryUsage[b.id] || 0;
          if (countB !== countA) return countB - countA;
          
          // Then alphabetically
          return a.label.localeCompare(b.label);
      });
  }, [categories, categoryUsage]);

  // Determine which categories to show based on "Show All" toggle
  const visibleCategories = useMemo(() => {
      if (showAll) return sortedCategories;
      // Show first 5 items (popular ones)
      return sortedCategories.slice(0, 5);
  }, [sortedCategories, showAll]);

  const theme = {
    bg: 'bg-transparent', 
    card: isDarkMode ? 'bg-[#2C2C2E]' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-[#1C1C1E]',
    subtext: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    border: isDarkMode ? 'border-white/10' : 'border-gray-100',
    header: isDarkMode ? 'bg-[#1C1C1E]/90' : 'bg-white/90',
    input: isDarkMode ? 'bg-[#1C1C1E]' : 'bg-white',
    inputBg: isDarkMode ? 'bg-black/20' : 'bg-gray-50',
  };

  const openCategoryForm = (category: Category | null = null) => {
    if (category) {
      setEditingCategory(category);
      setCatName(category.label);
      setCatColor(category.color);
      setCatIcon(category.icon);
      setCatKeywords('');
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatColor('bg-blue-500');
      setCatIcon('ShoppingBag');
      setCatKeywords('');
    }
    setConfirmDeleteId(null);
    setView('category_form');
  };

  const handleSaveCategory = () => {
    if (!catName.trim()) return;
    let currentCatId = editingCategory?.id;

    if (editingCategory) {
      onUpdateCategories(categories.map(c => c.id === editingCategory.id ? {
        ...c, label: catName, color: catColor, icon: catIcon
      } : c));
    } else {
      currentCatId = Date.now().toString();
      const newCategory: Category = { 
          id: currentCatId, 
          label: catName, 
          icon: catIcon, 
          color: catColor,
          isCustom: true 
      };
      onUpdateCategories([...categories, newCategory]);
    }

    if (catKeywords.trim() && currentCatId) {
      const keywords = catKeywords.split(';').map(k => k.trim()).filter(k => k.length > 0);
      const newRulesList: LearnedRule[] = keywords.map((word, index) => ({
        id: (Date.now() + 100 + index).toString(),
        keyword: word,
        cleanName: catName,
        categoryId: currentCatId!
      }));
      onUpdateRules([...newRulesList, ...learnedRules]);
    }
    setView('main');
  };

  const executeDeleteCategory = (id: string) => {
      if (onDeleteCategory) {
          onDeleteCategory(id);
      } else {
          // Fallback for local update if prop missing
          const updated = categories.filter(c => c.id !== id);
          onUpdateCategories(updated);
      }
      setConfirmDeleteId(null);
      if (view === 'category_form') setView('manage_categories');
  };

  const openEditRule = (rule: LearnedRule | null = null) => {
    if (rule) {
      setEditingRule(rule);
      setRuleKeyword(rule.keyword);
      setRuleCategoryId(rule.categoryId);
    } else {
      setEditingRule(null);
      setRuleKeyword('');
      setRuleCategoryId(sortedCategories[0]?.id || null);
    }
    setView('edit_rule');
  };

  const handleApplyRuleToHistory = () => {
      if (!transactions || !onUpdateTransactions || !ruleKeyword.trim() || !ruleCategoryId) return;

      const keywords = ruleKeyword.split(';').map(k => k.trim().toLowerCase()).filter(k => k);
      const targetCat = categories.find(c => c.id === ruleCategoryId);
      if (!targetCat || keywords.length === 0) return;

      let count = 0;
      const updatedTransactions = transactions.map(tx => {
          const raw = (tx.rawNote || tx.note || '').toLowerCase();
          const match = keywords.some(k => raw.includes(k));
          
          if (match && tx.category !== ruleCategoryId) {
              count++;
              return { ...tx, category: ruleCategoryId, note: targetCat.label };
          }
          return tx;
      });

      if (count > 0) {
          onUpdateTransactions(updatedTransactions);
          alert('Операции обновлены');
      } else {
          alert('Подходящих операций для обновления не найдено');
      }
  };

  const handleSaveRule = () => {
    if (!ruleKeyword.trim() || !ruleCategoryId) return;
    const selectedCat = categories.find(c => c.id === ruleCategoryId);
    if (!selectedCat) return;
    
    if (editingRule) {
      onUpdateRules(learnedRules.map(r => r.id === editingRule.id ? {
        ...r, keyword: ruleKeyword, categoryId: ruleCategoryId, cleanName: selectedCat.label
      } : r));
    } else {
      const keywords = ruleKeyword.split(';').map(k => k.trim()).filter(k => k.length > 0);
      const newEntries: LearnedRule[] = keywords.map((word, index) => ({
        id: (Date.now() + index).toString(), 
        keyword: word, 
        categoryId: ruleCategoryId, 
        cleanName: selectedCat.label
      }));
      onUpdateRules([...newEntries, ...learnedRules]);
    }
    setView('main');
  };

  const handleDeleteRule = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Replacing confirm with simple toggle or assumption for now to avoid sandbox issues
    // For rules, deletion is less critical, but we can make it safer later if needed
    onUpdateRules(learnedRules.filter(r => r.id !== id));
  };

  const filteredRules = learnedRules.filter(r => {
    const matchesSearch = r.keyword.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryId ? r.categoryId === selectedCategoryId : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`h-full flex flex-col ${theme.bg}`}>
      
      {/* Header */}
      {view !== 'main' && (
        <div className="flex items-center gap-3 mb-4 px-4 pt-4 shrink-0">
            <button 
                onClick={() => setView(view === 'category_form' && editingCategory ? 'manage_categories' : 'main')} 
                className={`p-2.5 rounded-full ${isDarkMode ? 'bg-[#3A3A3C] text-white' : 'bg-gray-100 text-black'}`}
            >
                <ChevronLeft size={20} />
            </button>
            <h2 className={`text-lg font-black ${theme.text}`}>
                {view === 'category_form' ? (editingCategory ? 'Изменить' : 'Новая категория') : 
                 view === 'manage_categories' ? 'Управление' : 'Правило'}
            </h2>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6">
        
        {view === 'main' && (
          <div className="space-y-8">
            {/* Categories Grid */}
            <section>
              <div className="flex justify-between items-center mb-4 px-1">
                <h2 className={`text-[11px] font-black uppercase tracking-[0.15em] ${theme.subtext}`}>Категории</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => openCategoryForm()} className="text-blue-500 text-[10px] font-black flex items-center gap-1 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                    <Plus size={12} strokeWidth={3} /> Создать
                  </button>
                  <button onClick={() => setView('manage_categories')} className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 rounded-lg ${theme.subtext} hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors`}>
                      Изм.
                  </button>
                </div>
              </div>
              
              {/* Responsive Grid */}
              <div className="grid grid-cols-3 min-[400px]:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
                {/* 'All' Filter Button */}
                <button 
                  onClick={() => setSelectedCategoryId(null)}
                  className={`aspect-square rounded-[24px] border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${
                    selectedCategoryId === null 
                        ? 'bg-blue-500 border-blue-500 text-white shadow-xl shadow-blue-500/20' 
                        : `${theme.card} ${theme.border} ${theme.text} opacity-60 hover:opacity-100`
                  }`}
                >
                  <Filter size={20} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Все</span>
                </button>

                {visibleCategories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`aspect-square rounded-[24px] border-2 transition-all flex flex-col items-center justify-center gap-1.5 p-1 ${
                      selectedCategoryId === cat.id 
                        ? `border-transparent text-white shadow-xl scale-105 z-10` 
                        : `${theme.card} ${theme.border} ${theme.text} opacity-80 hover:opacity-100 hover:scale-[1.02]`
                    }`}
                    style={selectedCategoryId === cat.id ? getColorStyle(cat.color) : {}}
                  >
                    <div className={selectedCategoryId === cat.id ? getColorClass(cat.color) : ''}>
                         <span style={{ color: selectedCategoryId !== cat.id && cat.color.startsWith('#') ? cat.color : undefined }} className={selectedCategoryId !== cat.id && !cat.color.startsWith('#') ? cat.color.replace('bg-', 'text-') : ''}>
                            <IconRenderer name={cat.icon} size={22} />
                         </span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wide truncate w-full text-center px-0.5">{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Show All Toggle for Main View */}
              {!showAll && sortedCategories.length > 5 && (
                  <button 
                    onClick={() => setShowAll(true)}
                    className={`w-full mt-3 py-3 rounded-[24px] bg-gray-50 dark:bg-[#3A3A3C] text-gray-500 dark:text-gray-300 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-[#48484A] transition-colors`}
                  >
                      Показать еще {sortedCategories.length - 5} <ChevronDown size={14} />
                  </button>
              )}
              
              {showAll && (
                  <button 
                    onClick={() => setShowAll(false)}
                    className={`w-full mt-3 py-3 rounded-[24px] bg-gray-50 dark:bg-[#3A3A3C] text-gray-500 dark:text-gray-300 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-[#48484A] transition-colors`}
                  >
                      Свернуть <ChevronUp size={14} />
                  </button>
              )}
            </section>

            {/* Rules Section */}
            <section className="pb-10">
              <div className="flex justify-between items-center mb-4 px-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg"><BrainCircuit size={16} className="text-purple-500" /></div>
                  <h2 className={`text-[11px] font-black uppercase tracking-[0.15em] ${theme.subtext}`}>Правила ИИ</h2>
                </div>
                <button 
                  onClick={() => openEditRule()}
                  className="bg-[#1C1C1E] dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-lg active:scale-95 transition-all uppercase tracking-wider"
                >
                  <Plus size={12} strokeWidth={3} /> Добавить
                </button>
              </div>

              <div className={`flex items-center px-4 py-3 rounded-[20px] mb-4 shadow-sm border ${theme.border} ${theme.card}`}>
                <Search size={18} className="text-gray-400 mr-3" />
                <input 
                  type="text" 
                  placeholder="Поиск по фразам..."
                  className={`bg-transparent outline-none w-full text-sm font-bold ${theme.text} placeholder:font-medium`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                {filteredRules.length > 0 ? filteredRules.map((rule) => {
                  const catConfig = categories.find(c => c.id === rule.categoryId);
                  return (
                    <button 
                      key={rule.id} 
                      onClick={() => openEditRule(rule)}
                      className={`w-full text-left ${theme.card} p-4 rounded-[24px] border ${theme.border} flex items-center justify-between group shadow-sm hover:border-blue-200 dark:hover:border-blue-800 transition-colors`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div 
                          className={`w-1.5 h-10 rounded-full shrink-0`} 
                          style={getColorStyle(catConfig?.color || '#ccc')}
                        >
                            <div className={`w-full h-full ${getColorClass(catConfig?.color || 'bg-gray-400')}`} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-sm font-bold ${theme.text} truncate`}>{rule.keyword}</span>
                            <Zap size={12} className="text-orange-400 fill-orange-400 shrink-0" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: catConfig?.color }}></span>
                             {catConfig?.label || '???'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-2">
                         <div 
                           onClick={(e) => handleDeleteRule(e, rule.id)}
                           className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all rounded-full"
                         >
                           <Trash2 size={16} />
                         </div>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="text-center py-12 opacity-30">
                    <Search size={48} className="mx-auto mb-4" />
                    <p className="text-sm font-bold">Правил не найдено</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {view === 'category_form' && (
           <div className="space-y-6 max-w-md mx-auto animate-in fade-in slide-in-from-right-4">
              <div className="flex flex-col items-center gap-4">
                <div 
                    className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-all ${getColorClass(catColor)}`}
                    style={getColorStyle(catColor)}
                >
                  <IconRenderer name={catIcon} size={48} />
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase ml-2 ${theme.subtext}`}>Название</label>
                    <input 
                      type="text" 
                      value={catName} 
                      onChange={(e) => setCatName(e.target.value)} 
                      placeholder="Напр: Супермаркеты" 
                      className={`w-full px-5 py-4 rounded-[1.5rem] outline-none border-2 focus:border-blue-500 transition-all ${theme.border} ${theme.card} ${theme.text} text-lg font-bold`} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase ml-2 ${theme.subtext}`}>Иконка</label>
                    <div className={`grid grid-cols-6 gap-2 p-4 rounded-[2rem] border ${theme.border} ${theme.card}`}>
                      {AVAILABLE_ICONS.map(icon => (
                        <button 
                          key={icon}
                          onClick={() => setCatIcon(icon)}
                          className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${
                            catIcon === icon 
                            ? 'bg-blue-500 text-white shadow-lg scale-110' 
                            : `hover:bg-gray-100 dark:hover:bg-white/10 ${theme.text} opacity-60`
                          }`}
                        >
                          <IconRenderer name={icon} size={20} />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase ml-2 ${theme.subtext}`}>Цвет оформления</label>
                    <div className={`flex flex-wrap gap-3 justify-center ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} p-4 rounded-[2rem]`}>
                      {PRESET_COLORS.map(c => (
                        <button 
                            key={c} 
                            onClick={() => setCatColor(c)} 
                            className={`w-10 h-10 rounded-full border-4 transition-all ${catColor === c ? 'border-white dark:border-gray-600 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`} 
                            style={getColorStyle(c)} 
                        >
                            <div className={`w-full h-full rounded-full ${getColorClass(c)}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-5 rounded-[2rem] border-2 border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={16} className="text-blue-500" />
                    <label className={`text-[10px] font-black uppercase text-blue-500`}>
                      {editingCategory ? 'Добавить новые правила' : 'Сразу добавить правила'}
                    </label>
                  </div>
                  <textarea 
                    rows={3}
                    value={catKeywords}
                    onChange={(e) => setCatKeywords(e.target.value)}
                    placeholder="Пятерочка; Магнит; Ашан..."
                    className={`w-full px-4 py-3 rounded-2xl outline-none border focus:border-blue-500 transition-all ${theme.border} ${theme.card} ${theme.text} text-sm font-medium resize-none`}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button onClick={handleSaveCategory} className="w-full bg-blue-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Save size={18} /> {editingCategory ? 'СОХРАНИТЬ' : 'СОЗДАТЬ'}
                </button>
                {editingCategory && (
                    <div className="mt-3">
                        {confirmDeleteId === editingCategory.id ? (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="flex-1 py-4 text-gray-500 font-bold text-xs uppercase bg-gray-100 dark:bg-white/10 rounded-[2rem]"
                                >
                                    Отмена
                                </button>
                                <button 
                                    onClick={() => executeDeleteCategory(editingCategory.id)}
                                    className="flex-1 py-4 text-white font-bold text-xs uppercase bg-red-500 rounded-[2rem]"
                                >
                                    Удалить
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setConfirmDeleteId(editingCategory.id)} 
                                className="w-full py-4 text-red-500 font-black text-xs uppercase tracking-widest bg-red-50 dark:bg-red-900/10 rounded-[2rem] active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/20"
                            >
                                <Trash2 size={18} /> Удалить категорию
                            </button>
                        )}
                    </div>
                )}
              </div>
           </div>
        )}

        {view === 'manage_categories' && (
           <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 pb-20">
              <div className="grid grid-cols-2 min-[400px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Create New Button */}
                  <button 
                    onClick={() => openCategoryForm()}
                    className={`w-full aspect-auto min-h-[100px] rounded-[24px] border-2 border-dashed ${theme.border} flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 hover:border-blue-500/50 transition-all`}
                  >
                    <Plus size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Новая</span>
                  </button>

                  {visibleCategories.map(cat => (
                    <div key={cat.id} className="relative group">
                      <button 
                        onClick={() => openCategoryForm(cat)}
                        className={`w-full h-full ${theme.card} p-4 rounded-[24px] border ${theme.border} flex flex-col items-center gap-2 relative shadow-sm hover:border-blue-500/50 transition-colors active:scale-95 min-h-[100px] justify-center`}
                      >
                        <div 
                            className={`w-12 h-12 rounded-[18px] flex items-center justify-center text-white shadow-lg ${getColorClass(cat.color)}`}
                            style={getColorStyle(cat.color)}
                        >
                          <IconRenderer name={cat.icon} size={24} />
                        </div>
                        <span className={`text-xs font-bold ${theme.text} truncate w-full text-center px-1`}>{cat.label}</span>
                      </button>
                      
                      {/* Integrated Delete Button with Confirmation Logic for Grid Items */}
                      {confirmDeleteId === cat.id ? (
                          <div className="absolute inset-0 bg-red-500 rounded-[24px] z-20 flex flex-col items-center justify-center text-white p-2">
                              <span className="text-[9px] font-black uppercase mb-1">Удалить?</span>
                              <div className="flex gap-2">
                                  <button onClick={() => setConfirmDeleteId(null)} className="p-1 bg-white/20 rounded-full"><X size={14}/></button>
                                  <button onClick={() => executeDeleteCategory(cat.id)} className="p-1 bg-white text-red-500 rounded-full"><Trash2 size={14}/></button>
                              </div>
                          </div>
                      ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(cat.id); }} 
                            className="absolute -top-1 -right-1 bg-red-500 text-white p-1.5 rounded-full shadow-lg z-10 active:scale-90 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                      )}
                    </div>
                  ))}
              </div>
              
              {!showAll && sortedCategories.length > 5 && (
                  <button 
                    onClick={() => setShowAll(true)}
                    className={`w-full py-4 rounded-[24px] bg-gray-50 dark:bg-[#3A3A3C] text-gray-500 dark:text-gray-300 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-[#48484A] transition-colors`}
                  >
                      Показать еще {sortedCategories.length - 5} <ChevronDown size={14} />
                  </button>
              )}
              
              {showAll && (
                  <button 
                    onClick={() => setShowAll(false)}
                    className={`w-full py-4 rounded-[24px] bg-gray-50 dark:bg-[#3A3A3C] text-gray-500 dark:text-gray-300 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-[#48484A] transition-colors`}
                  >
                      Свернуть <ChevronUp size={14} />
                  </button>
              )}
           </div>
        )}

        {view === 'edit_rule' && (
          <div className="space-y-8 max-w-md mx-auto animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                {editingRule ? <Zap size={40} fill="currentColor" /> : <Layers size={40} />}
              </div>
              <h3 className={`text-xl font-bold ${theme.text}`}>
                {editingRule ? 'Редактировать фразу' : 'Массовый ввод правил'}
              </h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase ml-2 ${theme.subtext}`}>Ключевое слово (или список через ";")</label>
                <textarea 
                  rows={4}
                  value={ruleKeyword}
                  onChange={(e) => setRuleKeyword(e.target.value)}
                  placeholder="Напр: Яндекс; Uber; Такси"
                  className={`w-full px-5 py-4 rounded-[2rem] outline-none border-2 focus:border-blue-500 transition-all ${theme.border} ${theme.card} ${theme.text} text-lg font-medium resize-none`}
                />
              </div>
              <div className="space-y-3">
                <label className={`text-[10px] font-black uppercase ml-2 ${theme.subtext}`}>Целевая категория</label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {sortedCategories.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setRuleCategoryId(cat.id)}
                      className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-2 text-left ${
                        ruleCategoryId === cat.id 
                        ? `border-blue-500 bg-blue-50 dark:bg-blue-900/20` 
                        : `${theme.card} ${theme.border} opacity-70 hover:opacity-100`
                      }`}
                    >
                      <div 
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs shrink-0 ${getColorClass(cat.color)}`}
                        style={getColorStyle(cat.color)}
                      >
                         <IconRenderer name={cat.icon} size={14} />
                      </div>
                      <span className={`text-[11px] font-bold truncate ${theme.text}`}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="pt-4 space-y-3">
              <button onClick={handleSaveRule} className="w-full bg-blue-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Save size={18} /> {editingRule ? 'Обновить' : 'Применить правила'}
              </button>
              {transactions && onUpdateTransactions && (
                  <button 
                    onClick={handleApplyRuleToHistory} 
                    className="w-full bg-gray-100 dark:bg-[#3A3A3C] text-gray-600 dark:text-gray-300 py-4 rounded-[2rem] font-bold text-xs uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-[#48484A]"
                  >
                    <RefreshCw size={16} /> Применить к старым операциям
                  </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesSettings;
