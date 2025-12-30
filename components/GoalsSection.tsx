
import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Target } from 'lucide-react';
import { SavingsGoal, AppSettings } from '../types';
import { getIconById } from '../constants';

interface GoalsSectionProps {
  goals: SavingsGoal[];
  settings: AppSettings;
  onEditGoal: (goal: SavingsGoal) => void;
  onAddGoal: () => void;
}

const GoalsSection: React.FC<GoalsSectionProps> = ({ goals, settings, onEditGoal, onAddGoal }) => {
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-black">Наши цели</h2>
        <button 
          onClick={onAddGoal}
          className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-colors ios-btn-active"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {goals.length === 0 ? (
          <div className="col-span-full py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300">
            <p className="text-xs font-black uppercase tracking-widest">Нет активных целей</p>
          </div>
        ) : (
          goals.map((goal, index) => {
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            return (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onEditGoal(goal)}
                key={goal.id} 
                className="bg-white p-6 rounded-[2.2rem] border border-white shadow-soft cursor-pointer group"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110"
                    style={{ 
                      backgroundColor: goal.color,
                      backgroundImage: `linear-gradient(135deg, ${goal.color}aa, ${goal.color})`
                    }}
                  >
                    {getIconById(goal.icon, 24)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm text-[#1C1C1E] leading-none mb-1 truncate">{goal.title}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      {goal.targetAmount.toLocaleString()} {settings.currency}
                    </p>
                  </div>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                    {Math.round(progress)}%
                  </span>
                </div>
                
                <div className="h-2.5 w-full bg-gray-50 rounded-full overflow-hidden mb-3 p-0.5 border border-gray-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full rounded-full shadow-sm"
                    style={{ backgroundColor: goal.color }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Накоплено</span>
                  <span className="text-[11px] text-[#1C1C1E] font-black">
                    {goal.currentAmount.toLocaleString()} {settings.currency}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default GoalsSection;
