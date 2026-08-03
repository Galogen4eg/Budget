import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Search, Trash2, ShoppingCart, Check, BookOpen, Tag, Edit2 } from 'lucide-react';
import { CatalogItem, ShoppingItem } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem } from '../utils/db';

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISLES = [
    { id: 'produce', label: 'Овощи/Фрукты', icon: '🥦' },
    { id: 'dairy', label: 'Молочка', icon: '🥛' },
    { id: 'meat', label: 'Мясо/Рыба', icon: '🥩' },
    { id: 'bakery', label: 'Хлеб', icon: '🍞' },
    { id: 'grocery', label: 'Бакалея', icon: '🍝' },
    { id: 'drinks', label: 'Напитки', icon: '🧃' },
    { id: 'sweets', label: 'Сладости', icon: '🍫' },
    { id: 'frozen', label: 'Заморозка', icon: '🧊' },
    { id: 'household', label: 'Быт. химия', icon: '🧼' },
    { id: 'beauty', label: 'Красота', icon: '💄' },
    { id: 'pets', label: 'Животные', icon: '🐱' },
    { id: 'pharmacy', label: 'Аптека', icon: '💊' },
    { id: 'electronics', label: 'Электроника', icon: '🔌' },
    { id: 'clothes', label: 'Одежда', icon: '👕' },
    { id: 'other', label: 'Разное', icon: '📦' },
];

export const UNITS = ['шт', 'кг', 'уп', 'л'] as const;

interface CatalogCardItemProps {
  item: CatalogItem;
  inShoppingList?: ShoppingItem;
  aisle: typeof AISLES[0];
  onAdd: (item: CatalogItem) => void;
  onUpdateQty: (shoppingItem: ShoppingItem, delta: number) => void;
  onSetAmount: (shoppingItem: ShoppingItem, amount: string) => void;
  onDeleteCatalog: (id: string) => void;
}

const CatalogCardItem: React.FC<CatalogCardItemProps> = ({
  item,
  inShoppingList,
  aisle,
  onAdd,
  onUpdateQty,
  onSetAmount,
  onDeleteCatalog,
}) => {
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState(inShoppingList?.amount || '1');

  React.useEffect(() => {
    if (inShoppingList) {
      setAmountInput(inShoppingList.amount || '1');
    }
  }, [inShoppingList?.amount]);

  const handleSaveAmount = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inShoppingList) return;
    onSetAmount(inShoppingList, amountInput);
    setIsEditingAmount(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`p-3.5 rounded-3xl border transition-all flex flex-col justify-between gap-2.5 relative ${
        inShoppingList
          ? 'bg-green-50/50 border-green-300 shadow-sm'
          : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          onClick={() => {
            if (!inShoppingList) {
              onAdd(item);
            } else {
              setIsEditingAmount(true);
            }
          }}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 group"
          title={inShoppingList ? 'Кликните для изменения количества' : 'Кликните для добавления в список'}
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-105 ${
              inShoppingList ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-50 border border-gray-100'
            }`}
          >
            {aisle.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-extrabold text-[#1C1C1E] truncate leading-tight group-hover:text-blue-600 transition-colors">
              {item.title}
            </h4>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg uppercase">
                {aisle.label}
              </span>
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg uppercase">
                {item.unit || 'шт'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={e => {
            e.stopPropagation();
            onDeleteCatalog(item.id);
          }}
          title="Удалить из справочника"
          className="w-7 h-7 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Stepper / Add Row */}
      <div className="pt-2 border-t border-gray-100/80 flex items-center justify-between gap-2">
        {!inShoppingList ? (
          <button
            onClick={() => onAdd(item)}
            className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <ShoppingCart size={13} />
            <span>+ В список</span>
          </button>
        ) : isEditingAmount ? (
          <form onSubmit={handleSaveAmount} className="flex items-center gap-1.5 w-full">
            <input
              type="text"
              autoFocus
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              className="flex-1 bg-white border border-green-400 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#1C1C1E] outline-none text-center shadow-inner"
              placeholder="Кол-во"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-green-500 text-white rounded-xl text-xs font-black uppercase hover:bg-green-600 shadow-sm"
            >
              ОК
            </button>
            <button
              type="button"
              onClick={() => setIsEditingAmount(false)}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-xs"
            >
              <X size={14} />
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between w-full bg-green-100/70 rounded-2xl p-1 border border-green-200">
            <button
              onClick={() => onUpdateQty(inShoppingList, -1)}
              className="w-7 h-7 bg-white hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 shrink-0"
              title="Уменьшить количество (-1)"
            >
              <Minus size={13} strokeWidth={2.5} />
            </button>

            <button
              onClick={() => {
                setAmountInput(inShoppingList.amount || '1');
                setIsEditingAmount(true);
              }}
              className="flex-1 px-2 py-0.5 text-center text-xs font-black text-green-900 hover:text-blue-600 transition-colors flex items-center justify-center gap-1"
              title="Нажмите для точного ввода количества"
            >
              <span>
                {inShoppingList.amount || 1} {inShoppingList.unit || item.unit || 'шт'}
              </span>
              <Edit2 size={11} className="text-green-600/70" />
            </button>

            <button
              onClick={() => onUpdateQty(inShoppingList, 1)}
              className="w-7 h-7 bg-white hover:bg-green-200 text-green-700 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 shrink-0"
              title="Увеличить количество (+1)"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({ isOpen, onClose }) => {
  const { productCatalog, addProductToCatalog, deleteProductFromCatalog, shoppingItems, setShoppingItems } = useData();
  const { familyId, user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // New Item Form State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('grocery');
  const [newUnit, setNewUnit] = useState<'шт' | 'кг' | 'уп' | 'л'>('шт');

  // Feedback toast for adding item to shopping list
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  const filteredCatalog = useMemo(() => {
    return productCatalog.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [productCatalog, searchQuery, selectedCategory]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await addProductToCatalog({
      title: newTitle.trim(),
      category: newCategory,
      unit: newUnit,
    });

    setNewTitle('');
    setIsAddingNew(false);
    showToast(`Товар "${newTitle.trim()}" добавлен в справочник`);
  };

  const handleAddToList = async (catalogItem: CatalogItem) => {
    const existingItem = shoppingItems.find(
      i => i.title.trim().toLowerCase() === catalogItem.title.trim().toLowerCase() && !i.completed
    );

    if (existingItem) {
      // Increment existing quantity
      const prevAmount = parseFloat(existingItem.amount || '0') || 0;
      const newAmount = (prevAmount + 1).toString();
      const updatedItem = { ...existingItem, amount: newAmount };

      setShoppingItems(prev => prev.map(i => (i.id === existingItem.id ? updatedItem : i)));
      if (familyId) {
        await updateItem(familyId, 'shopping', existingItem.id, { amount: newAmount });
      }
      showToast(`Увеличено количество: ${catalogItem.title} (${newAmount} ${existingItem.unit})`);
    } else {
      // Add new item
      const newItem: ShoppingItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
        title: catalogItem.title,
        category: catalogItem.category || 'other',
        amount: '1',
        unit: (catalogItem.unit as any) || 'шт',
        completed: false,
        memberId: user?.uid || 'user',
        priority: 'medium',
      };

      setShoppingItems(prev => [newItem, ...prev]);
      if (familyId) {
        await addItem(familyId, 'shopping', newItem);
      }
      showToast(`"${catalogItem.title}" добавлен в список покупок`);
    }
  };

  const handleUpdateQuantity = async (shoppingItem: ShoppingItem, delta: number) => {
    const currentAmt = parseFloat(shoppingItem.amount || '1') || 1;
    const newAmt = Math.max(0, currentAmt + delta);

    if (newAmt === 0) {
      setShoppingItems(prev => prev.filter(i => i.id !== shoppingItem.id));
      if (familyId) {
        await deleteItem(familyId, 'shopping', shoppingItem.id);
      }
      showToast(`"${shoppingItem.title}" удален из списка`);
    } else {
      const formatted = Number.isInteger(newAmt) ? newAmt.toString() : newAmt.toFixed(1);
      const updatedItem = { ...shoppingItem, amount: formatted };
      setShoppingItems(prev => prev.map(i => (i.id === shoppingItem.id ? updatedItem : i)));
      if (familyId) {
        await updateItem(familyId, 'shopping', shoppingItem.id, { amount: formatted });
      }
    }
  };

  const handleSetAmount = async (shoppingItem: ShoppingItem, amountStr: string) => {
    const parsed = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      setShoppingItems(prev => prev.filter(i => i.id !== shoppingItem.id));
      if (familyId) {
        await deleteItem(familyId, 'shopping', shoppingItem.id);
      }
      showToast(`"${shoppingItem.title}" удален из списка`);
    } else {
      const formatted = amountStr.trim();
      const updatedItem = { ...shoppingItem, amount: formatted };
      setShoppingItems(prev => prev.map(i => (i.id === shoppingItem.id ? updatedItem : i)));
      if (familyId) {
        await updateItem(familyId, 'shopping', shoppingItem.id, { amount: formatted });
      }
      showToast(`Количество "${shoppingItem.title}": ${formatted} ${shoppingItem.unit}`);
    }
  };

  const showToast = (msg: string) => {
    setAddedMessage(msg);
    setTimeout(() => {
      setAddedMessage(null);
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 md:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-[#F2F2F7] w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[88vh] border border-white/50"
      >
        {/* Toast Notification */}
        <AnimatePresence>
          {addedMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1E] text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2"
            >
              <Check size={14} className="text-green-400" />
              <span>{addedMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Header */}
        <div className="bg-white p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1C1C1E] leading-tight">Справочник товаров</h2>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Каталог для быстрого добавления ({productCatalog.length} поз.)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 bg-white/70 backdrop-blur-sm border-b border-gray-100 flex flex-col gap-3 shrink-0">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по справочнику..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 pl-9 pr-8 py-2.5 rounded-2xl text-xs font-bold text-[#1C1C1E] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsAddingNew(!isAddingNew)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm ${
                isAddingNew
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20'
              }`}
            >
              {isAddingNew ? <X size={14} /> : <Plus size={14} strokeWidth={3} />}
              <span>{isAddingNew ? 'Отмена' : 'Добавить'}</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider shrink-0 transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#1C1C1E] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Все
            </button>
            {AISLES.map(aisle => (
              <button
                key={aisle.id}
                onClick={() => setSelectedCategory(aisle.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all flex items-center gap-1.5 ${
                  selectedCategory === aisle.id
                    ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{aisle.icon}</span>
                <span>{aisle.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Form to Add New Catalog Product */}
          <AnimatePresence>
            {isAddingNew && (
              <motion.form
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                onSubmit={handleCreateProduct}
                className="bg-white p-5 rounded-3xl shadow-sm border border-blue-100 space-y-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest">
                  <Tag size={14} />
                  <span>Новый товар в справочник</span>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">
                    Наименование товара
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Мотовихинское молоко 3.2%"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-[#1C1C1E] outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">
                      Категория
                    </label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-2xl text-xs font-bold text-[#1C1C1E] outline-none focus:border-blue-500 focus:bg-white transition-all"
                    >
                      {AISLES.map(aisle => (
                        <option key={aisle.id} value={aisle.id}>
                          {aisle.icon} {aisle.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">
                      Единица измерения
                    </label>
                    <div className="flex bg-gray-50 border border-gray-200 rounded-2xl p-1 gap-1">
                      {UNITS.map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setNewUnit(u)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                            newUnit === u ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all"
                >
                  Сохранить в справочник
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Catalog Items List */}
          {filteredCatalog.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center flex flex-col items-center justify-center border border-gray-100 space-y-3">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                <BookOpen size={24} />
              </div>
              <p className="text-xs font-bold text-gray-500">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Товары не найдены по запросу'
                  : 'Справочник пуст. Нажмите "Добавить" выше или создайте товар в списке покупок!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCatalog.map(item => {
                const aisle = AISLES.find(a => a.id === item.category) || AISLES[AISLES.length - 1];
                const inShoppingList = shoppingItems.find(
                  i => i.title.trim().toLowerCase() === item.title.trim().toLowerCase() && !i.completed
                );

                return (
                  <CatalogCardItem
                    key={item.id}
                    item={item}
                    inShoppingList={inShoppingList}
                    aisle={aisle}
                    onAdd={handleAddToList}
                    onUpdateQty={handleUpdateQuantity}
                    onSetAmount={handleSetAmount}
                    onDeleteCatalog={deleteProductFromCatalog}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-bold shrink-0">
          <span>Всего в справочнике: {productCatalog.length}</span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-2xl transition-all uppercase text-[10px] tracking-widest"
          >
            Закрыть
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductCatalogModal;
