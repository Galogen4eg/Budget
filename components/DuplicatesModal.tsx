
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Copy, Trash2, CheckCircle2 } from 'lucide-react';
import { Transaction } from '../types';

interface DuplicatesModalProps {
  transactions: Transaction[];
  onClose: () => void;
  onDelete: (ids: string[]) => void;
}

const DuplicatesModal: React.FC<DuplicatesModalProps> = ({ transactions, onClose, onDelete }) => {
  const [selectedToDelete, setSelectedToDelete] = useState<Set<string>>(new Set());

  // Find duplicates logic
  const duplicateGroups = useMemo(() => {
    const groups: { key: string, items: Transaction[] }[] = [];
    const processedIds = new Set<string>();

    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        if (processedIds.has(current.id)) continue;

        const group = [current];
        
        // Look ahead for duplicates (within small time window)
        for (let j = i + 1; j < sorted.length; j++) {
            const next = sorted[j];
            if (processedIds.has(next.id)) continue;

            const timeDiff = Math.abs(new Date(current.date).getTime() - new Date(next.date).getTime());
            // 5 minutes threshold
            if (timeDiff > 5 * 60 * 1000) break; 

            const isSameAmount = Math.abs(current.amount - next.amount) < 0.01;
            const isSameType = current.type === next.type;
            const noteSim = (current.note || '').toLowerCase() === (next.note || '').toLowerCase();
            const rawSim = (current.rawNote || '').toLowerCase() === (next.rawNote || '').toLowerCase();

            if (isSameAmount && isSameType && (noteSim || rawSim)) {
                group.push(next);
                processedIds.add(next.id);
            }
        }

        if (group.length > 1) {
            groups.push({ key: current.id, items: group });
            // Add current to processed so we don't start a group with it again? 
            // The logic above skips processedIds in outer loop, so we just need to add current.id there?
            // Actually, the outer loop continues. We should skip indices. 
            // Simplified:
            processedIds.add(current.id);
        }
    }
    return groups;
  }, [transactions]);

  // Pre-select duplicates for deletion (keep the first one)
  React.useEffect(() => {
      const initialSelection = new Set<string>();
      duplicateGroups.forEach(group => {
          // Keep the first one (usually oldest due to sort, or just arbitrary)
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {duplicateGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <CheckCircle2 size={48} className="mb-4 text-green-500 opacity-50" />
                    <p className="font-bold text-xs uppercase tracking-widest">Дублей не найдено</p>
                </div>
            ) : (
                duplicateGroups.map((group, idx) => (
                    <div key={group.key} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-50 dark:border-white/5">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Группа {idx + 1}</span>
                            <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">{group.items[0].amount.toLocaleString()}</span>
                        </div>
                        <div className="space-y-2">
                            {group.items.map(item => {
                                const isSelected = selectedToDelete.has(item.id);
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => toggleSelection(item.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${isSelected ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-gray-50 dark:bg-[#2C2C2E] border-transparent'}`}
                                    >
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate">{item.note || 'Без описания'}</div>
                                            <div className="text-[9px] text-gray-400 font-mono mt-0.5">{new Date(item.date).toLocaleString()}</div>
                                            {item.rawNote && <div className="text-[8px] text-gray-300 truncate">{item.rawNote}</div>}
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-red-500 bg-red-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                            {isSelected && <Trash2 size={12} />}
                                        </div>
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
