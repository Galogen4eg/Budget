
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
  className?: string;
}

const GoalsSection: React.FC<GoalsSectionProps> = ({ goals, settings, onEditGoal, onAddGoal, className = '' }) => {
  return (
    <div className={`bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-soft transition-all h-full flex flex-col ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">Наши цели</h3>
        <button 
          onClick={onAddGoal}
          className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center hover:bg-blue-100 transition-colors ios-btn-active"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3">
        {goals.length === 0 ? (
          <div className="h-full border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-300 min-h-[100px]">
            <Target size={20} className="mb-2 opacity-50"/>
            <p className="text-[9px] font-black uppercase tracking-widest">Нет целей</p>
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
                className="bg-gray-50/50 p-4 rounded-[1.5rem] border border-gray-100 cursor-pointer group hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110"
                    style={{ 
                      backgroundColor: goal.color,
                      backgroundImage: `linear-gradient(135deg, ${goal.color}aa, ${goal.color})`
                    }}
                  >
                    {getIconById(goal.icon, 18)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-xs text-[#1C1C1E] leading-none mb-1 truncate">{goal.title}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      {goal.targetAmount.toLocaleString()} {settings.currency}
                    </p>
                  </div>
                  <span className="text-[9px] font-black text-blue-600 bg-white px-2 py-1 rounded-lg shadow-sm">
                    {Math.round(progress)}%
                  </span>
                </div>
                
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: goal.color }}
                  />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GoalsSection;
