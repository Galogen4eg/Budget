import React from 'react';
import { BrainCircuit, Trash2 } from 'lucide-react';
import { AIKnowledgeItem } from '../types';

export interface AIKnowledgeTabProps {
  aiKnowledge: AIKnowledgeItem[];
  newFact: string;
  onNewFactChange: (val: string) => void;
  onAddFact: () => Promise<void>;
  onDeleteFact: (id: string) => void | Promise<void>;
}

export const AIKnowledgeTab: React.FC<AIKnowledgeTabProps> = ({
  aiKnowledge,
  newFact,
  onNewFactChange,
  onAddFact,
  onDeleteFact,
}) => {
  return (
    <section className="terra-settings-group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
          <BrainCircuit size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Память ассистента</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Сохранённые факты, которые учитывает ассистент.</p>
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
          aria-label="Новый факт для ассистента" placeholder="Например, зарплата 25-го числа" 
          className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
        />
        <button 
          type="button" 
          onClick={onAddFact} disabled={!newFact.trim()} 
          className="px-5 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white font-semibold text-sm transition-colors cursor-pointer shrink-0 animate-press"
        >
          Запомнить
        </button>
      </div>

      <p className="text-xs text-[var(--terra-muted)]">Не сохраняйте пароли, коды доступа и секретные ключи.</p>
      <div className="divide-y divide-[var(--terra-border)]">
        {aiKnowledge.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-white dark:bg-[#18191C] text-xs text-gray-400">
            Память пока пуста. Добавьте факты вручную или скажите ассистенту в чате «Запомни...»
          </div>
        ) : (
          aiKnowledge.map(item => (
            <div key={item.id} className="py-2 flex items-center justify-between gap-3 min-w-0">
              <span className="text-sm min-w-0 [overflow-wrap:anywhere] text-[var(--terra-ink)]">{item.text}</span>
              <button 
                type="button" 
                onClick={() => onDeleteFact(item.id)} 
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[var(--terra-danger-text)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] cursor-pointer"
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
