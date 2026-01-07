
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Trash2, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Transaction, AppSettings } from '../types';

interface DuplicatesModalProps {
  transactions: Transaction[];
  onClose: () => void;
  onDelete: (ids: string[]) => void;
  onIgnore?: (pairIds: string[]) => void; // New prop for ignoring
  ignoredPairs?: string[];
}

const DuplicatesModal: React.FC<DuplicatesModalProps> = ({ transactions, onClose, onDelete, onIgnore, ignoredPairs = [] }) => {
  const [selectedToDelete, setSelectedToDelete] = useState<Set<string>>(new Set());

  // Find duplicates logic with improved smart matching
  const duplicateGroups = useMemo(() => {
    const groups: { key: string, items: Transaction[] }[] = [];
    const processedIds = new Set<string>();

    // Sort by date to compare sequential items
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        if (processedIds.has(current.id)) continue;

        const group = [current];
        
        for (let j = i + 1; j < sorted.length; j++) {
            const next = sorted[j];
            if (processedIds.has(next.id)) continue;

            const timeDiff = Math.abs(new Date(current.date).getTime() - new Date(next.date).getTime());
            // 5 minutes threshold
            if (timeDiff > 5 * 60 * 1000) break; 

            // Strict amount check
            const isSameAmount = Math.abs(current.amount - next.amount) < 0.01;
            const isSameType = current.type === next.type;
            
            // Fuzzy description match
            const noteSim = (current.note || '').toLowerCase().trim() === (next.note || '').toLowerCase().trim();
            const rawSim = (current.rawNote || '').toLowerCase().trim() === (next.rawNote || '').toLowerCase().trim();

            if (isSameAmount && isSameType && (noteSim || rawSim)) {
                // Check if this pair is ignored
                const pairKey = [current.id, next.id].sort().join('_');
                if (!ignoredPairs.includes(pairKey)) {
                    group.push(next);
                    processedIds.add(next.id);
                }
            }
        }

        if (group.length > 1) {
            groups.push({ key: current.id, items: group });
            processedIds.add(current.id);
        }
    }
    return groups;
  }, [transactions, ignoredPairs]);

  // Pre-select duplicates for deletion (keep the first one)
  React.useEffect(() => {
      const initialSelection = new Set<string>();
      duplicateGroups.forEach(group => {
          // Keep the first one (original)
          // Select all others for deletion
          group.items.slice(1).forEach(item => initialSelection.add(item.id));
      });
      setSelectedToDelete(initialSelection);
  }, [duplicateGroups]);

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedToDelete);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedToDelete(newSet);
  };

  const handleExecute = () => {
      onDelete(Array.from(selectedToDelete));
      onClose();
  };

  const handleIgnoreGroup = (groupItems: Transaction[]) => {
      if (!onIgnore) return;
      // Create pairs for all items in group to ignore them against each other
      const pairs: string[] = [];
      for (let i = 0; i < groupItems.length; i++) {
          for (let j = i + 1; j < groupItems.length; j++) {
              pairs.push([groupItems[i].id, groupItems[j].id].sort().join('_'));
          }
      }
      onIgnore(pairs);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" 
      />
      
      <motion.div
        initial={{ y: '100%' }} 
        animate={{ y: 0 }} 
        exit={{ y: '100%' }} 
        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-white dark:bg-[#1C1C1E] p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-full text-orange-500">
                  <Copy size={20} />
              </div>
              <div>
                  <h3 className="text-xl font-black text-[#1C1C1E] dark:text-white">Поиск дублей</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Найдено групп: {duplicateGroups.length}
                  </p>
              </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500 dark:text-white hover:bg-gray-200 transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
            {duplicateGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <CheckCircle2 size={48} className="mb-4 text-green-500 opacity-50" />
                    <p className="font-bold text-xs uppercase tracking-widest">Дублей не найдено</p>
                </div>
            ) : (
                duplicateGroups.map((group, idx) => (
                    <div key={group.key} className="bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase bg-white dark:bg-black/20 px-2 py-1 rounded-lg">Группа {idx + 1}</span>
                                <span className="text-sm font-black text-[#1C1C1E] dark:text-white">{group.items[0].amount.toLocaleString()} ₽</span>
                            </div>
                            <button 
                                onClick={() => handleIgnoreGroup(group.items)}
                                className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors"
                            >
                                <ShieldCheck size={12} /> Не дубль
                            </button>
                        </div>
                        
                        <div className="p-2 space-y-2">
                            {/* Original Item (First one) */}
                            <div className="relative p-3 rounded-2xl border-2 border-green-500/20 bg-green-50/10">
                                <div className="absolute top-2 right-2 text-[9px] font-black text-green-600 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full uppercase">Оригинал</div>
                                <div className="text-xs font-bold text-[#1C1C1E] dark:text-white mb-1 truncate pr-16">{group.items[0].note}</div>
                                <div className="flex gap-3 text-[10px] text-gray-400 font-mono">
                                    <span>{new Date(group.items[0].date).toLocaleTimeString()}</span>
                                    <span>{new Date(group.items[0].date).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex justify-center -my-3 relative z-10">
                                <div className="bg-gray-100 dark:bg-[#3A3A3C] rounded-full p-1 border-4 border-white dark:border-[#1C1C1E]">
                                    <ArrowRight size={14} className="text-gray-400 rotate-90" />
                                </div>
                            </div>

                            {/* Potential Duplicates */}
                            {group.items.slice(1).map(item => {
                                const isSelected = selectedToDelete.has(item.id);
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => toggleSelection(item.id)}
                                        className={`relative p-3 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-red-500 bg-red-50/10' : 'border-gray-100 dark:border-white/10 bg-white dark:bg-[#1C1C1E]'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate pr-2">{item.note || 'Без описания'}</div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-red-500 bg-red-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {isSelected && <Trash2 size={10} />}
                                            </div>
                                        </div>
                                        <div className="flex gap-3 text-[10px] text-gray-400 font-mono">
                                            <span className={item.date !== group.items[0].date ? 'text-orange-500 font-bold' : ''}>
                                                {new Date(item.date).toLocaleTimeString()}
                                            </span>
                                            <span>{new Date(item.date).toLocaleDateString()}</span>
                                        </div>
                                        {item.category !== group.items[0].category && (
                                            <div className="mt-1 text-[9px] text-gray-400 flex items-center gap-1">
                                                <AlertCircle size={10} /> Категория отличается
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
        
        {duplicateGroups.length > 0 && (
            <div className="p-6 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5">
                <button 
                    onClick={handleExecute} 
                    disabled={selectedToDelete.size === 0}
                    className="w-full py-4 bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                >
                    <Trash2 size={16} />
                    Удалить выбранные ({selectedToDelete.size})
                </button>
            </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
};

export default DuplicatesModal;
