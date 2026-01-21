
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ShoppingBag,
  CheckCircle2,
  Circle,
  Search,
  ShoppingCart,
  Check,
  Send,
  X
} from 'lucide-react';
import { ShoppingItem, AppSettings, FamilyMember } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem, deleteItemsBatch } from '../utils/db';
import { detectProductCategory } from '../utils/categorizer';
import { toast } from 'sonner';

interface ShoppingListProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onMoveToPantry: (item: ShoppingItem) => Promise<void>;
  onSendToTelegram: (items: ShoppingItem[]) => Promise<boolean>;
}

const AISLES = [
    { id: 'produce', label: 'Фрукты и овощи', icon: '🥦' },
    { id: 'dairy', label: 'Молочные продукты', icon: '🥛' },
    { id: 'meat', label: 'Мясо', icon: '🥩' },
    { id: 'bakery', label: 'Выпечка', icon: '🍞' },
    { id: 'grocery', label: 'Бакалея', icon: '🍝' },
    { id: 'drinks', label: 'Напитки', icon: '🧃' },
    { id: 'sweets', label: 'Сладости', icon: '🍫' },
    { id: 'frozen', label: 'Заморозка', icon: '🧊' },
    { id: 'household', label: 'Бытовая химия', icon: '🧼' },
    { id: 'beauty', label: 'Красота', icon: '💄' },
    { id: 'pets', label: 'Животные', icon: '🐱' },
    { id: 'pharmacy', label: 'Аптека', icon: '💊' },
    { id: 'electronics', label: 'Электроника', icon: '🔌' },
    { id: 'clothes', label: 'Одежда', icon: '👕' },
    { id: 'other', label: 'Разное', icon: '📦' },
];

const UNITS = ['шт', 'кг', 'г', 'л', 'мл', 'упак.'];

const ShoppingListDesktop: React.FC<ShoppingListProps> = ({
    items, setItems, settings, members, onMoveToPantry, onSendToTelegram
}) => {
  const [inputValue, setInputValue] = useState('');
  const [amountValue, setAmountValue] = useState(1);
  const [unitValue, setUnitValue] = useState('шт');
  const [selectedCategoryId, setSelectedCategoryId] = useState('other');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editing State
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

  const { familyId, user } = useAuth();
  const isDarkMode = settings.theme === 'dark';

  // Smart Category Detection
  useEffect(() => {
      if (inputValue.trim() && !editingItem) {
          const detected = detectProductCategory(inputValue);
          if (detected !== 'other') {
              setSelectedCategoryId(detected);
          }
      }
  }, [inputValue, editingItem]);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    if (editingItem) {
        // Update
        const updatedItem = {
            ...editingItem,
            title: inputValue,
            amount: String(amountValue),
            unit: unitValue as any,
            category: selectedCategoryId
        };
        setItems(prev => prev.map(i => i.id === editingItem.id ? updatedItem : i));
        if (familyId) await updateItem(familyId, 'shopping', editingItem.id, updatedItem);
        setEditingItem(null);
    } else {
        // Create
        const newItem: ShoppingItem = {
          id: Date.now().toString(),
          title: inputValue,
          category: selectedCategoryId,
          amount: String(amountValue),
          unit: unitValue as any,
          completed: false,
          memberId: user?.uid || 'user',
          priority: 'medium'
        };
        setItems(prev => [newItem, ...prev]);
        if (familyId) await addItem(familyId, 'shopping', newItem);
    }
    
    setInputValue('');
    setAmountValue(1);
    setUnitValue('шт');
    setSelectedCategoryId('other');
  };

  const handleEditClick = (item: ShoppingItem) => {
      setEditingItem(item);
      setInputValue(item.title);
      setAmountValue(parseFloat(item.amount || '1'));
      setUnitValue(item.unit);
      setSelectedCategoryId(item.category);
  };

  const cancelEdit = () => {
      setEditingItem(null);
      setInputValue('');
      setAmountValue(1);
      setUnitValue('шт');
      setSelectedCategoryId('other');
  };

  const toggleComplete = async (item: ShoppingItem) => {
    const updated = { ...item, completed: !item.completed };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    if (familyId) await updateItem(familyId, 'shopping', item.id, { completed: updated.completed });
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent edit click
    setItems(prev => prev.filter(item => item.id !== id));
    if (familyId) await deleteItem(familyId, 'shopping', id);
    if (editingItem?.id === id) cancelEdit();
  };

  const clearCompleted = async () => {
    const completedIds = items.filter(i => i.completed).map(i => i.id);
    
    if (completedIds.length === 0) {
        toast.info("Нет купленных товаров для удаления");
        return;
    }
    
    if (window.confirm(`Вы точно хотите удалить ${completedIds.length} купленных товаров?`)) {
        // Optimistic update
        setItems(prev => prev.filter(item => !item.completed));
        
        if (familyId) {
            try {
                await deleteItemsBatch(familyId, 'shopping', completedIds);
                toast.success("Список очищен");
            } catch (e) {
                console.error(e);
                toast.error("Ошибка при удалении из базы");
            }
        } else {
            toast.success("Список очищен");
        }
    }
  };

  const handleTelegramClick = () => {
      if (!settings.telegramBotToken || !settings.telegramChatId) {
          toast.error("Пожалуйста, настройте Telegram-бота в настройках", {
              description: "Нужен токен бота и ID чата"
          });
          return;
      }
      // Send active items (not completed)
      onSendToTelegram(items.filter(i => !i.completed));
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeItems = filteredItems.filter(i => !i.completed);
  const completedItems = filteredItems.filter(i => i.completed);

  const groupedActiveItems = useMemo(() => {
    return activeItems.reduce((groups, item) => {
      // Map ID to Label for grouping display
      const cat = AISLES.find(a => a.id === item.category);
      const catLabel = cat ? cat.label : 'Разное';
      
      if (!groups[catLabel]) groups[catLabel] = [];
      groups[catLabel].push(item);
      return groups;
    }, {} as Record<string, ShoppingItem[]>);
  }, [activeItems]);

  const progress = items.length ? Math.round((completedItems.length / items.length) * 100) : 0;

  return (
    <div className={`flex h-full w-full transition-colors duration-500 font-sans ${isDarkMode ? 'bg-[#0A0A0C] text-white' : 'bg-[#F4F7FB] text-[#1C1C1E]'} overflow-hidden`}>
      
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-80 bg-[#FFFFFF] dark:bg-[#161618] border-r border-black/5 dark:border-white/5 p-8 h-full overflow-y-auto custom-scrollbar shrink-0">
        
        <div className="space-y-8 mt-4">
          <div className="space-y-3">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Поиск</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Найти продукт..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8F9FB] dark:bg-white/5 border-none rounded-2xl py-3 pl-11 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/50 outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                    {editingItem ? 'Редактирование' : 'Новый товар'}
                </p>
                {editingItem && (
                    <button onClick={cancelEdit} className="text-gray-400 hover:text-blue-500"><X size={14}/></button>
                )}
            </div>
            
            <form onSubmit={handleSaveItem} className="space-y-4">
              <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Название продукта..."
                className="w-full bg-[#F8F9FB] dark:bg-white/5 border border-transparent focus:border-blue-500/20 rounded-2xl py-3.5 px-4 text-sm font-bold outline-none transition-all dark:text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={amountValue}
                  onChange={(e) => setAmountValue(parseFloat(e.target.value) || 0)}
                  placeholder="Кол-во"
                  className="w-full bg-[#F8F9FB] dark:bg-white/5 border border-transparent focus:border-blue-500/20 rounded-xl py-3 px-4 text-sm font-bold outline-none transition-all dark:text-white"
                />
                <select 
                  value={unitValue}
                  onChange={(e) => setUnitValue(e.target.value)}
                  className="bg-[#F8F9FB] dark:bg-white/5 border-none rounded-xl py-3 px-3 text-xs font-black uppercase outline-none cursor-pointer dark:text-white"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <select 
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full bg-[#F8F9FB] dark:bg-white/5 border-none rounded-2xl py-3.5 px-4 text-xs font-black uppercase tracking-wider outline-none cursor-pointer dark:text-white"
              >
                {AISLES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>

              <button 
                type="submit"
                disabled={!inputValue.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus size={18} strokeWidth={3} />
                {editingItem ? 'СОХРАНИТЬ' : 'ДОБАВИТЬ'}
              </button>
            </form>
          </div>

          <div className="space-y-2 pt-4 border-t border-black/5 dark:border-white/5">
            <button 
              onClick={clearCompleted}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-bold text-sm"
            >
              <Trash2 size={18} />
              Очистить купленное
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 lg:p-16 overflow-y-auto no-scrollbar">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Header Stats & Share */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-4xl font-black tracking-tight leading-none">Прогресс {progress}%</h2>
                <button 
                  onClick={handleTelegramClick}
                  disabled={items.length === 0}
                  className="flex items-center gap-2 bg-[#229ED9] hover:bg-[#229ED9]/90 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-[#229ED9]/20 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                >
                  <Send size={14} fill="currentColor" />
                  В TELEGRAM
                </button>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-bold flex items-center gap-2">
                <Check size={18} className="text-green-500" />
                Осталось купить: {activeItems.length}
              </p>
            </div>
            
            <div className="flex bg-white dark:bg-[#161618] p-2 rounded-2xl shadow-sm border border-black/5 dark:border-white/5">
              <div className="px-6 py-2 border-r border-black/5 dark:border-white/5 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Всего</p>
                <p className="text-xl font-black">{items.length}</p>
              </div>
              <div className="px-6 py-2 text-center">
                <p className="text-[10px] font-black text-blue-500 uppercase mb-1">Куплено</p>
                <p className="text-xl font-black text-blue-500">{completedItems.length}</p>
              </div>
            </div>
          </div>

          {/* Grid Layout - Active Items */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-10 items-start">
            {Object.keys(groupedActiveItems).length > 0 ? (
              Object.entries(groupedActiveItems).map(([category, catItems]) => (
                <div key={category} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 break-inside-avoid">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                      <h3 className="text-xs font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest">
                        {category}
                      </h3>
                    </div>
                    <span className="text-[10px] font-black bg-white dark:bg-white/5 px-2 py-0.5 rounded-lg border border-black/5 dark:border-white/5">{catItems.length} поз.</span>
                  </div>
                  
                  <div className="bg-white dark:bg-[#161618] rounded-[36px] shadow-[0_10px_50px_-15px_rgba(0,0,0,0.04)] dark:shadow-none border border-black/5 dark:border-white/5 overflow-hidden">
                    {catItems.map((item, idx) => (
                        <div 
                        key={item.id}
                        onClick={() => handleEditClick(item)}
                        className={`flex items-center gap-5 p-6 transition-all group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] cursor-pointer ${idx !== catItems.length - 1 ? 'border-b border-black/[0.03] dark:border-white/[0.03]' : ''}`}
                        >
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleComplete(item); }}
                            className={`transition-all active:scale-75 text-gray-200 dark:text-gray-700 hover:text-blue-500`}
                        >
                            <Circle size={36} strokeWidth={1} />
                        </button>
                        
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold transition-all text-gray-800 dark:text-gray-200`}>
                                    {item.title}
                                </span>
                            </div>
                            
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black self-start sm:self-auto transition-colors bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400`}>
                                <span>{item.amount}</span>
                                <span>{item.unit}</span>
                            </div>
                        </div>

                        <button 
                            onClick={(e) => handleDeleteItem(e, item.id)}
                            className="opacity-0 group-hover:opacity-100 p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                        >
                            <Trash2 size={20} />
                        </button>
                        </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
                items.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-24 h-24 bg-white dark:bg-[#161618] rounded-[40px] flex items-center justify-center shadow-2xl mb-8 border border-black/5 dark:border-white/5">
                        <ShoppingBag size={48} strokeWidth={1} className="text-blue-500 opacity-50" />
                        </div>
                        <p className="text-2xl font-black italic opacity-20">Список покупок пуст</p>
                        <p className="text-sm font-bold text-gray-400 mt-2">Добавьте нужные продукты слева</p>
                    </div>
                )
            )}
          </div>

          {/* Completed Items Section */}
          {completedItems.length > 0 && (
              <div className="pt-10 border-t border-black/5 dark:border-white/5">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Куплено ({completedItems.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                      {completedItems.map(item => (
                          <div key={item.id} className="bg-white dark:bg-[#161618] p-4 rounded-2xl flex items-center gap-3 border border-black/5 dark:border-white/5">
                              <button onClick={() => toggleComplete(item)} className="text-green-500">
                                  <CheckCircle2 size={24} />
                              </button>
                              <span className="text-sm font-bold text-gray-400 line-through flex-1">{item.title}</span>
                              <button onClick={(e) => handleDeleteItem(e, item.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default ShoppingListDesktop;
