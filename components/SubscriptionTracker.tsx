
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Calendar, DollarSign, Repeat, Trash2, Edit2 } from 'lucide-react';
import { Subscription, AppSettings } from '../types';

interface Props {
  subscriptions: Subscription[];
  setSubscriptions: (s: Subscription[]) => void;
  settings: AppSettings;
}

const SubscriptionTracker: React.FC<Props> = ({ subscriptions, setSubscriptions, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSub, setNewSub] = useState<Partial<Subscription>>({ currency: settings.currency, billingCycle: 'monthly' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = () => {
    if (!newSub.name || !newSub.amount || !newSub.nextPaymentDate) return;
    
    if (editingId) {
       const updated = subscriptions.map(s => s.id === editingId ? {
           ...s,
           name: newSub.name!,
           amount: Number(newSub.amount),
           nextPaymentDate: newSub.nextPaymentDate!,
       } : s);
       setSubscriptions(updated);
    } else {
       const sub: Subscription = {
        id: Date.now().toString(),
        name: newSub.name,
        amount: Number(newSub.amount),
        currency: newSub.currency || settings.currency,
        billingCycle: newSub.billingCycle || 'monthly',
        nextPaymentDate: newSub.nextPaymentDate,
        category: 'other',
        icon: 'zap'
       };
       setSubscriptions([...subscriptions, sub]);
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (sub: Subscription) => {
      setEditingId(sub.id);
      setNewSub(sub);
      setIsModalOpen(true);
  };

  const resetForm = () => {
      setNewSub({ currency: settings.currency, billingCycle: 'monthly' });
      setEditingId(null);
  };

  const deleteSub = (id: string) => {
    setSubscriptions(subscriptions.filter(s => s.id !== id));
    setIsModalOpen(false);
  };

  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white">
        <div className="flex justify-between items-center mb-6">
           <h3 className="font-black text-lg">Мои подписки</h3>
           <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><Plus size={20}/></button>
        </div>
        
        {subscriptions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 font-bold text-xs uppercase">Нет подписок</div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map(sub => {
              const days = getDaysUntil(sub.nextPaymentDate);
              return (
                <div key={sub.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-bold text-lg">
                        {sub.name.charAt(0)}
                     </div>
                     <div>
                        <div className="font-bold text-[#1C1C1E]">{sub.name}</div>
                        <div className={`text-[10px] font-black uppercase ${days < 3 ? 'text-red-500' : 'text-gray-400'}`}>
                           {days < 0 ? 'Просрочено' : `Через ${days} дн.`}
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="font-black text-sm">{sub.amount} {sub.currency}</span>
                     <button onClick={() => handleEdit(sub)} className="text-gray-300 hover:text-blue-500"><Edit2 size={16} /></button>
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
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
             <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-4">
                <h3 className="font-black text-xl mb-4">{editingId ? 'Редактировать' : 'Новая подписка'}</h3>
                <input type="text" placeholder="Название (Netflix)" value={newSub.name || ''} onChange={e => setNewSub({...newSub, name: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none" />
                <input type="number" placeholder="Сумма" value={newSub.amount || ''} onChange={e => setNewSub({...newSub, amount: Number(e.target.value)})} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none" />
                <input type="date" value={newSub.nextPaymentDate || ''} onChange={e => setNewSub({...newSub, nextPaymentDate: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none" />
                <div className="flex gap-2 mt-2">
                   {editingId && <button onClick={() => deleteSub(editingId)} className="p-4 bg-red-50 text-red-500 rounded-xl"><Trash2 size={20}/></button>}
                   <button onClick={handleSave} className="flex-1 bg-purple-500 text-white py-4 rounded-xl font-black uppercase text-xs">{editingId ? 'Сохранить' : 'Добавить'}</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubscriptionTracker;
