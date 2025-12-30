
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
  // Show only top goals in widget to avoid overflow and scrolling
  const displayedGoals = goals.slice(0, 3);

  return (
    <div className={`bg-white p-4 md:p-5 rounded-[2.5rem] border border-gray-100 shadow-soft transition-all h-full flex flex-col overflow-hidden ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Наши цели</h3>
        <button 
          onClick={onAddGoal}
          className="w-8 h-8 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors ios-btn-active"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        {goals.length === 0 ? (
          <div className="h-full border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-300 min-h-[80px]">
            <Target size={18} className="mb-1 opacity-50"/>
            <p className="text-[8px] font-black uppercase tracking-widest">Нет целей</p>
          </div>
        ) : (
          displayedGoals.map((goal, index) => {
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            return (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onEditGoal(goal)}
                key={goal.id} 
                className="bg-gray-50/50 p-2.5 rounded-2xl border border-gray-100 cursor-pointer group hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div 
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                    style={{ 
                      backgroundColor: goal.color,
                      backgroundImage: `linear-gradient(135deg, ${goal.color}aa, ${goal.color})`
                    }}
                  >
                    {getIconById(goal.icon, 16)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[11px] text-[#1C1C1E] leading-none mb-0.5 truncate">{goal.title}</h4>
                    <p className="text-[9px] text-gray-400 font-bold tabular-nums">
                      {goal.targetAmount.toLocaleString()} {settings.currency}
                    </p>
                  </div>
                  <span className="text-[8px] font-black text-blue-600 bg-white px-1.5 py-0.5 rounded-lg shadow-sm border border-blue-50">
                    {Math.round(progress)}%
                  </span>
                </div>
                
                <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
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
        {goals.length > 3 && (
            <div className="text-center pt-1">
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">и еще {goals.length - 3}</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default GoalsSection;
