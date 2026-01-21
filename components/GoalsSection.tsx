
import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, TrendingUp, CheckCircle2, PiggyBank } from 'lucide-react';
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
  // Show top 3 goals. 
  // You might want to sort them by priority or progress here if desired.
  const displayedGoals = goals.slice(0, 3);

  return (
    <div className={`bg-white dark:bg-[#1C1C1E] p-4 rounded-[2.5rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none h-full flex flex-col relative overflow-hidden group ${className}`}>
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 dark:bg-purple-900/10 rounded-full blur-[60px] opacity-60 pointer-events-none -mr-10 -mt-10" />

        {/* Header */}
        <div className="flex justify-between items-center mb-2 relative z-10 shrink-0">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                    <Target size={14} className="text-purple-500" />
                </div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Копилка
                </h3>
            </div>
        </div>

        {/* Goals List */}
        <div 
            className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto no-scrollbar relative z-10 pb-1"
            style={{ 
                maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)', 
                WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' 
            }}
        >
            {goals.length === 0 ? (
                <div 
                    onClick={onAddGoal}
                    className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 dark:border-white/10 rounded-3xl p-2 opacity-60 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                    <PiggyBank size={24} className="text-gray-300 dark:text-gray-600 mb-1" />
                    <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-tight">
                        Создать<br/>цель
                    </p>
                </div>
            ) : (
                displayedGoals.map((goal, i) => {
                    const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                    const isCompleted = percent >= 100;

                    return (
                        <motion.div
                            key={goal.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => onEditGoal(goal)}
                            className="bg-[#F8F9FB] dark:bg-[#2C2C2E] p-2 rounded-2xl border border-transparent hover:border-purple-100 dark:hover:border-purple-900/30 hover:bg-purple-50/30 dark:hover:bg-[#3A3A3C] transition-all cursor-pointer group/card relative overflow-hidden"
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                {/* Icon */}
                                <div 
                                    className="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                                    style={{ 
                                        backgroundColor: goal.color,
                                        background: `linear-gradient(135deg, ${goal.color}, ${goal.color}dd)` 
                                    }}
                                >
                                    {isCompleted ? <CheckCircle2 size={14} /> : getIconById(goal.icon, 14)}
                                </div>
                                
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-[10px] text-[#1C1C1E] dark:text-white truncate pr-2 leading-tight">{goal.title}</h4>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md tabular-nums ${isCompleted ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-white dark:bg-black/20 text-gray-400 shadow-sm'}`}>
                                            {percent}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-0.5">
                                        <span className="text-[9px] font-black text-[#1C1C1E] dark:text-white tabular-nums leading-none">
                                            {settings.privacyMode ? '•••' : goal.currentAmount.toLocaleString()} 
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1.5 w-full bg-white dark:bg-black/20 rounded-full overflow-hidden shadow-inner ring-1 ring-black/5 dark:ring-white/5">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full rounded-full relative"
                                    style={{ backgroundColor: goal.color }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                                </motion.div>
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
