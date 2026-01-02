
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
    <div className={`bg-white p-5 rounded-[2.5rem] border border-white shadow-soft h-full flex flex-col relative overflow-hidden group ${className}`}>
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-[60px] opacity-60 pointer-events-none -mr-10 -mt-10" />

        {/* Header */}
        <div className="flex justify-between items-center mb-4 relative z-10 shrink-0">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 rounded-xl">
                    <Target size={14} className="text-purple-500" />
                </div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Копилка
                </h3>
            </div>
            <button 
                onClick={onAddGoal}
                className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95 ios-btn-active"
            >
                <Plus size={16} strokeWidth={3} />
            </button>
        </div>

        {/* Goals List */}
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto no-scrollbar relative z-10 pb-1">
            {goals.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 rounded-3xl p-4 opacity-60 min-h-[120px]">
                    <PiggyBank size={32} className="text-gray-300 mb-2" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                        Создайте цель<br/>и начните копить
                    </p>
                </div>
            ) : (
                displayedGoals.map((goal, i) => {
                    const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                    const isCompleted = percent >= 100;

                    return (
                        <motion.div
                            key={goal.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => onEditGoal(goal)}
                            className="bg-[#F8F9FB] p-3.5 rounded-[1.8rem] border border-transparent hover:border-purple-100 hover:bg-purple-50/30 transition-all cursor-pointer group/card relative overflow-hidden"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                {/* Icon */}
                                <div 
                                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md shadow-black/5 shrink-0 transition-transform group-hover/card:scale-105"
                                    style={{ 
                                        backgroundColor: goal.color,
                                        background: `linear-gradient(135deg, ${goal.color}, ${goal.color}dd)` 
                                    }}
                                >
                                    {isCompleted ? <CheckCircle2 size={20} /> : getIconById(goal.icon, 20)}
                                </div>
                                
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="font-bold text-xs text-[#1C1C1E] truncate pr-2 leading-tight">{goal.title}</h4>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md tabular-nums ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-white text-gray-400 shadow-sm'}`}>
                                            {percent}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[11px] font-black text-[#1C1C1E] tabular-nums">
                                            {settings.privacyMode ? '•••' : goal.currentAmount.toLocaleString()} 
                                            <span className="text-[9px] text-gray-400 font-bold ml-0.5">{settings.currency}</span>
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-300 tabular-nums">
                                            / {settings.privacyMode ? '•••' : (goal.targetAmount >= 1000000 ? `${(goal.targetAmount/1000000).toFixed(1)}m` : `${(goal.targetAmount/1000).toFixed(0)}k`)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2.5 w-full bg-white rounded-full overflow-hidden shadow-inner ring-1 ring-black/5">
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
                            
                            {/* Remaining Hint (Visible on Hover/Touch) */}
                            {!isCompleted && !settings.privacyMode && (
                                <div className="h-0 overflow-hidden group-hover/card:h-auto transition-all duration-300">
                                    <div className="pt-2 flex items-center gap-1.5">
                                        <TrendingUp size={10} className="text-purple-400" />
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                                            Ещё {remaining.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })
            )}
            
            {goals.length > 3 && (
                <div className="text-center pt-1">
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest hover:text-purple-500 transition-colors">
                        +{goals.length - 3} скрыто
                    </span>
                </div>
            )}
        </div>
    </div>
  );
};

export default GoalsSection;
