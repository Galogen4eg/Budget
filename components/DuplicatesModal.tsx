
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Trash2, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Transaction } from '../types';
import { isPotentialDuplicate } from '../utils/duplicateReview';

interface DuplicatesModalProps {
  transactions: Transaction[];
  onClose: () => void;
  onDelete: (ids: string[]) => void | boolean | Promise<void | boolean>;
  onIgnore?: (pairIds: string[]) => void | Promise<void>; // New prop for ignoring
  ignoredPairs?: string[];
}

const DuplicatesModal: React.FC<DuplicatesModalProps> = ({ transactions, onClose, onDelete, onIgnore, ignoredPairs = [] }) => {
  const [selectedToDelete, setSelectedToDelete] = useState<Set<string>>(new Set());
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isIgnoring, setIsIgnoring] = useState(false);

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
            
            // Allow up to 24 hours difference to catch timezone shifted duplicates
            // but strict check on other fields
            if (timeDiff > 24 * 60 * 60 * 1000) break; 

            if (isPotentialDuplicate(current, next)) {
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

  // Similar payments are review candidates, never pre-approved for deletion.
  React.useEffect(() => {
      setSelectedToDelete(new Set());
      setIsConfirmingDelete(false);
  }, [duplicateGroups]);

  const toggleSelection = (id: string) => {
      setIsConfirmingDelete(false);
      const newSet = new Set(selectedToDelete);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedToDelete(newSet);
  };

  const [deleting,setDeleting] = useState(false);
  const handleExecute = async () => {
      if (!selectedToDelete.size || deleting || isIgnoring) return;
      if (!isConfirmingDelete) { setIsConfirmingDelete(true); return; }
      setDeleting(true);
      try {
        const result = await onDelete(Array.from(selectedToDelete));
        if (result !== false) onClose();
        else { setIsConfirmingDelete(false); toast.error('Удаление не выполнено. Проверьте сообщение об ошибке.'); }
      } catch (error) {
        console.error('Не удалось удалить предполагаемые дубли', error);
        setIsConfirmingDelete(false);
        toast.error('Не удалось удалить выбранные операции');
      } finally {
        setDeleting(false);
      }
  };

  const handleIgnoreGroup = async (groupItems: Transaction[]) => {
      if (!onIgnore || isIgnoring) return;
      // Create pairs for all items in group to ignore them against each other
      const pairs: string[] = [];
      for (let i = 0; i < groupItems.length; i++) {
          for (let j = i + 1; j < groupItems.length; j++) {
              pairs.push([groupItems[i].id, groupItems[j].id].sort().join('_'));
          }
      }
      setIsIgnoring(true);
      try {
        await onIgnore(pairs);
        toast.success('Эти операции исключены из предложений дублей');
      } catch (error) {
        console.error('Не удалось сохранить исключения дублей', error);
        toast.error('Не удалось сохранить исключения. Повторите попытку.');
      } finally {
        setIsIgnoring(false);
      }
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={() => { if (!deleting && !isIgnoring) onClose(); }}
        className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" 
      />
      
      <motion.div
        initial={{ y: '100%' }} 
        animate={{ y: 0 }} 
        exit={{ y: '100%' }} 
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-review-heading"
        className="relative bg-[#FAF6F0] dark:bg-[#121214] w-full max-w-xl md:rounded-[24px] rounded-t-[24px] shadow-2xl overflow-hidden flex flex-col h-[100dvh] md:h-auto max-h-[100dvh] md:max-h-[90vh] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="bg-white dark:bg-[#1C1C1E] px-4 sm:px-6 py-4 flex justify-between items-center gap-3 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 shrink-0 bg-orange-50 dark:bg-orange-900/30 rounded-full text-orange-500">
                  <Copy size={20} />
              </div>
              <div className="min-w-0">
                  <h3 id="duplicate-review-heading" className="text-xl font-bold font-headline text-[#1C1C1E] dark:text-white">Проверка возможных дублей</h3>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Найдено групп: {duplicateGroups.length}
                  </p>
              </div>
          </div>
          <button type="button" aria-label="Закрыть проверку дублей" disabled={deleting || isIgnoring} onClick={onClose} className="w-11 h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500 dark:text-white hover:bg-gray-200 transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-4 overscroll-contain">
            {duplicateGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <CheckCircle2 size={48} className="mb-4 text-green-500 opacity-50" />
                    <p className="font-semibold text-sm">Похожих операций не найдено</p>
                </div>
            ) : (
                duplicateGroups.map((group, idx) => (
                    <div key={group.key} className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-[#2C2C2E] p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2 border-b border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase bg-white dark:bg-black/20 px-2 py-1 rounded-lg">Группа {idx + 1}</span>
                                <span className="text-sm font-black text-[#1C1C1E] dark:text-white">{group.items[0].amount.toLocaleString('ru-RU')} ₽</span>
                            </div>
                            <button type="button"
                                disabled={isIgnoring || !onIgnore}
                                onClick={() => void handleIgnoreGroup(group.items)}
                                className="min-h-[44px] text-xs font-semibold text-[#2D5A43] dark:text-emerald-300 flex items-center gap-1 bg-[#EAF2EC] dark:bg-emerald-950/30 px-3 py-2 rounded-xl disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59]"
                            >
                                <ShieldCheck size={12} /> Не дубль
                            </button>
                        </div>
                        
                        <div className="p-2 space-y-2">
                            {/* First comparison item is retained, but is not a verified original */}
                            <div className="relative p-3 rounded-2xl border-2 border-green-500/20 bg-green-50/10">
                                <div className="text-xs font-medium text-[#2D5A43] dark:text-emerald-300 mb-1">Запись для сравнения · останется без изменений</div>
                                <div className="text-sm font-semibold text-[#1C1C1E] dark:text-white mb-1 break-words">{group.items[0].note || 'Без описания'}</div>
                                <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
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
                                    <button type="button"
                                        key={item.id}
                                        onClick={() => toggleSelection(item.id)}
                                        aria-pressed={isSelected}
                                        aria-label={`Выбрать для удаления: ${item.note || 'Без описания'}, ${item.amount.toLocaleString('ru-RU')} ₽`}
                                        disabled={deleting || isIgnoring}
                                        className={`relative w-full min-h-[56px] text-left p-3 rounded-xl border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] transition-colors ${isSelected ? 'border-red-500 bg-red-50/10' : 'border-gray-100 dark:border-white/10 bg-white dark:bg-[#1C1C1E]'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="text-sm font-semibold text-[#1C1C1E] dark:text-white break-words pr-2 min-w-0">{item.note || 'Без описания'}</div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-red-500 bg-red-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {isSelected && <Trash2 size={10} />}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
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
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
        
        {duplicateGroups.length > 0 && (
            <div className="p-3 sm:p-5 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5">
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 mb-3" role="status">
                    {isConfirmingDelete
                      ? `Будут окончательно удалены ${selectedToDelete.size} выбранных записей из общего бюджета. Это действие нельзя отменить.`
                      : 'Это только возможные дубли. Ничего не выбрано заранее: отметьте операции после сверки.'}
                </p>
                {isConfirmingDelete && (
                  <button type="button" onClick={() => setIsConfirmingDelete(false)}
                    className="mb-2 min-h-[44px] w-full rounded-xl border border-stone-300 dark:border-white/20 font-semibold text-sm text-stone-700 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59]">
                    Отмена удаления
                  </button>
                )}
                <button type="button"
                    onClick={() => void handleExecute()} 
                    disabled={selectedToDelete.size === 0 || deleting || isIgnoring}
                    className="w-full min-h-[48px] py-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Trash2 size={16} />
                    {deleting ? 'Удаление…' : isConfirmingDelete ? `Подтвердить удаление (${selectedToDelete.size})` : `Удалить выбранные (${selectedToDelete.size})`}
                </button>
            </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
};

export default DuplicatesModal;
