import React from 'react';
import { BrainCircuit, Trash2 } from 'lucide-react';
import { AIKnowledgeItem } from '../types';

export interface AIKnowledgeTabProps {
  aiKnowledge: AIKnowledgeItem[];
  newFact: string;
  onNewFactChange: (val: string) => void;
  onAddFact: () => Promise<void>;
  onDeleteFact: (id: string) => Promise<void>;
}

export const AIKnowledgeTab: React.FC<AIKnowledgeTabProps> = ({
  aiKnowledge,
  newFact,
  onNewFactChange,
  onAddFact,
  onDeleteFact,
}) => {
  return (
    <section className="p-4 sm:p-6 rounded-2xl bg-gray-50/80 dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
          <BrainCircuit size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">База знаний ассистента Terra</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Факты и постоянное контекстное окружение</p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <input 
          type="text" 
          value={newFact}
          onChange={e => onNewFactChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddFact();
            }
          }}
          placeholder="Добавить факт (напр. код домофона 123, аванс 25-го числа...)" 
          className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
        />
        <button 
          type="button" 
          onClick={onAddFact} 
          className="px-5 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white font-semibold text-sm transition-colors cursor-pointer shrink-0 animate-press"
        >
          Запомнить
        </button>
      </div>

      <div className="space-y-2 pt-2">
        {aiKnowledge.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-white dark:bg-[#18191C] text-xs text-gray-400">
            Память пока пуста. Добавьте факты вручную или скажите ассистенту в чате «Запомни...»
          </div>
        ) : (
          aiKnowledge.map(item => (
            <div key={item.id} className="p-3 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{item.text}</span>
              <button 
                type="button" 
                onClick={() => onDeleteFact(item.id)} 
                className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                aria-label="Удалить факт"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default AIKnowledgeTab;
