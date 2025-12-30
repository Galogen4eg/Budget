
import React from 'react';
import { Trash2, Box } from 'lucide-react';
import { PantryItem } from '../types';

interface Props {
  items: PantryItem[];
  setItems: (items: PantryItem[]) => void;
}

const SmartPantry: React.FC<Props> = ({ items, setItems }) => {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white min-h-[50vh]">
       <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center"><Box size={20}/></div>
          <h3 className="font-black text-lg">Кладовка</h3>
       </div>

       {items.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-bold text-xs uppercase leading-relaxed">
             Пусто.<br/>Покупайте продукты<br/>и добавляйте их сюда.
          </div>
       ) : (
          <div className="grid grid-cols-2 gap-3">
             {items.map(item => (
                <div key={item.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative group">
                   <h4 className="font-bold text-sm text-[#1C1C1E]">{item.title}</h4>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{item.amount} {item.unit}</p>
                   <button 
                     onClick={() => setItems(items.filter(i => i.id !== item.id))}
                     className="absolute top-2 right-2 p-1.5 bg-white rounded-lg text-gray-300 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
             ))}
          </div>
       )}
    </div>
  );
};

export default SmartPantry;
