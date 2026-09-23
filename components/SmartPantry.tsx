
import React from 'react';
import { Trash2, Snowflake, ShoppingCart, ArrowRight } from 'lucide-react';
import { PantryItem, ShoppingItem } from '../types';
import { BASIC_FRIDGE_ITEMS } from '../constants';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { addItem, deleteItem } from '../utils/db';

const SmartPantry: React.FC = () => {
  const { pantry: items, setPantry, setShoppingItems } = useData();
  const { familyId, user } = useAuth();
  
  const handleLoadBasicItems = async () => {
      const newItems: PantryItem[] = BASIC_FRIDGE_ITEMS.map(item => ({
          ...item,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          addedDate: new Date().toISOString()
      }));
      // setPantry in context handles batch adding to DB if connected
      await setPantry(prev => [...prev, ...newItems]);
  };

  const handleRanOut = async (item: PantryItem) => {
      // 1. Add to shopping list
      const shoppingItem: ShoppingItem = {
          id: Date.now().toString(),
          title: item.title,
          amount: item.amount,
          unit: item.unit as any,
          category: item.category,
          completed: false,
          memberId: user?.uid || 'user',
          priority: 'high'
      };
      
      setShoppingItems(prev => [...prev, shoppingItem]);
      if (familyId) {
          await addItem(familyId, 'shopping', shoppingItem);
      }

      // 2. Remove from pantry
      // setPantry in context handles deletion from DB
      await setPantry(prev => prev.filter(i => i.id !== item.id));
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] shadow-soft dark:shadow-none border border-white dark:border-white/5 min-h-[50vh]">
       <div className="flex justify-between items-center mb-6">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center"><Snowflake size={20}/></div>
              <h3 className="font-black text-lg text-[#1C1C1E] dark:text-white">Холодильник</h3>
           </div>
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{items.length} продуктов</span>
       </div>

       {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
             <Snowflake size={48} className="text-gray-200 dark:text-gray-600" />
             <div className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase leading-relaxed">
                В холодильнике пусто.<br/>Добавьте продукты вручную<br/>или загрузите список.
             </div>
             <button 
                onClick={handleLoadBasicItems}
                className="bg-blue-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
             >
                Загрузить базовый набор
             </button>
          </div>
       ) : (
          <div className="grid grid-cols-2 gap-3">
             {items.map(item => (
                <div key={item.id} className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl border border-gray-100 dark:border-white/5 relative group flex flex-col justify-between min-h-[100px]">
                   <div>
                       <h4 className="font-bold text-sm text-[#1C1C1E] dark:text-white leading-tight mb-1">{item.title}</h4>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.amount} {item.unit}</p>
                   </div>
                   
                   <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => setPantry(prev => prev.filter(i => i.id !== item.id))}
                         className="p-2 bg-white dark:bg-black/20 rounded-xl text-gray-300 hover:text-red-500 shadow-sm transition-colors"
                         title="Просто удалить"
                       >
                         <Trash2 size={14} />
                       </button>
                       <button 
                         onClick={() => handleRanOut(item)}
                         className="p-2 bg-blue-500 rounded-xl text-white shadow-md hover:bg-blue-600 transition-colors flex items-center gap-1"
                         title="Закончилось (В список покупок)"
                       >
                         <ShoppingCart size={14} />
                         <ArrowRight size={10} />
                       </button>
                   </div>
                </div>
             ))}
          </div>
       )}
    </div>
  );
};

export default SmartPantry;
