
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, TrendingDown, Edit2 } from 'lucide-react';
import { Debt, AppSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addItem, updateItem, deleteItem } from '../utils/db';

interface Props {
  debts: Debt[];
  setDebts: (d: Debt[]) => void;
  settings: AppSettings;
}

const DebtSnowball: React.FC<Props> = ({ debts, setDebts, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const { familyId } = useAuth();

  const handleSave = async () => {
    if (!newDebt.name || !newDebt.totalAmount) return;
    
    if (editingId) {
        const updated = { ...newDebt, name: newDebt.name!, totalAmount: Number(newDebt.totalAmount), currentBalance: Number(newDebt.currentBalance) };
        setDebts(debts.map(d => d.id === editingId ? { ...d, ...updated } : d));
        if (familyId) await updateItem(familyId, 'debts', editingId, updated);
    } else {
        const debt: Debt = {
          id: Date.now().toString(),
          name: newDebt.name,
          totalAmount: Number(newDebt.totalAmount),
          currentBalance: Number(newDebt.currentBalance) || Number(newDebt.totalAmount),
          color: '#FF3B30'
        };
        setDebts([...debts, debt]);
        if (familyId) await addItem(familyId, 'debts', debt);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (debt: Debt) => {
      setEditingId(debt.id);
      setNewDebt(debt);
      setIsModalOpen(true);
  };

  const resetForm = () => {
      setNewDebt({});
      setEditingId(null);
  };

  const updateBalance = async (id: string, amount: number) => {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;
    const newBalance = Math.max(0, debt.currentBalance - amount);
    setDebts(debts.map(d => d.id === id ? { ...d, currentBalance: newBalance } : d));
    if (familyId) await updateItem(familyId, 'debts', id, { currentBalance: newBalance });
  };

  const handleDelete = async (id: string) => {
      setDebts(debts.filter(d => d.id !== id));
      if (familyId) await deleteItem(familyId, 'debts', id);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] shadow-soft dark:shadow-none border border-white dark:border-white/5">
        <div className="flex justify-between items-center mb-6">
           <h3 className="font-black text-lg text-[#1C1C1E] dark:text-white">Мои долги</h3>
           <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-10 h-10 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-xl flex items-center justify-center"><Plus size={20}/></button>
        </div>
        
        {debts.length === 0 ? (
           <div className="text-center py-8 text-gray-400 font-bold text-xs uppercase">Долгов нет! 🎉</div>
        ) : (
           <div className="space-y-6">
             {debts.map(debt => {
                const progress = ((debt.totalAmount - debt.currentBalance) / debt.totalAmount) * 100;
                return (
                  <div key={debt.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="font-bold text-[#1C1C1E] dark:text-white">{debt.name}</span>
                       <div className="flex items-center gap-2">
                           <span className="font-black text-sm text-red-500">{debt.currentBalance} {settings.currency}</span>
                           <button onClick={() => handleEdit(debt)} className="text-gray-300 hover:text-blue-500"><Edit2 size={14} /></button>
                       </div>
                    </div>
                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                       <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between items-center pt-1">
                       <button onClick={() => updateBalance(debt.id, 1000)} className="text-[10px] font-bold bg-red-50 dark:bg-red-900/30 text-red-500 px-3 py-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">Внести 1000</button>
                       <button onClick={() => handleDelete(debt.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                );
             })}
           </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
             <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="relative bg-white dark:bg-[#1C1C1E] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-4">
                <h3 className="font-black text-xl mb-4 text-[#1C1C1E] dark:text-white">{editingId ? 'Редактировать' : 'Новый долг'}</h3>
                <input type="text" placeholder="Название (Ипотека)" value={newDebt.name || ''} onChange={e => setNewDebt({...newDebt, name: e.target.value})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                <div className="flex gap-2">
                    <div className="flex-1">
                        <span className="text-[10px] font-black uppercase text-gray-400 pl-2">Всего</span>
                        <input type="number" placeholder="Всего" value={newDebt.totalAmount || ''} onChange={e => setNewDebt({...newDebt, totalAmount: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                    </div>
                    <div className="flex-1">
                        <span className="text-[10px] font-black uppercase text-gray-400 pl-2">Осталось</span>
                        <input type="number" placeholder="Остаток" value={newDebt.currentBalance || ''} onChange={e => setNewDebt({...newDebt, currentBalance: Number(e.target.value)})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                    </div>
                </div>
                <button onClick={handleSave} className="w-full bg-red-500 text-white py-4 rounded-xl font-black uppercase text-xs mt-2">{editingId ? 'Сохранить' : 'Добавить'}</button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebtSnowball;
