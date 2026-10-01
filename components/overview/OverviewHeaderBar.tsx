import React from 'react';
import { 
  Users, User, Eye, EyeOff, Sparkles, Plus, ChevronDown, Calendar 
} from 'lucide-react';
import { AppSettings, FamilyMember } from '../../types';

interface OverviewHeaderBarProps {
  budgetMode: 'family' | 'personal';
  setBudgetMode: (mode: 'family' | 'personal') => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  currentMemberName: string;
  memberInitial: string;
  currentMonthName: string;
  isMonthPickerOpen: boolean;
  setIsMonthPickerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  monthOptions: { key: string; label: string; date: Date }[];
  activeMonth: Date;
  onMonthChange: (date: Date) => void;
  onStepMonth: (step: number) => void;
  onOpenAddModal: () => void;
  onOpenAIChat: () => void;
}

export const OverviewHeaderBar: React.FC<OverviewHeaderBarProps> = ({
  budgetMode,
  setBudgetMode,
  settings,
  updateSettings,
  currentMemberName,
  memberInitial,
  currentMonthName,
  isMonthPickerOpen,
  setIsMonthPickerOpen,
  monthOptions,
  activeMonth,
  onMonthChange,
  onStepMonth,
  onOpenAddModal,
  onOpenAIChat
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] items-center gap-3 md:gap-4 pb-2 select-none w-full">
      {/* Mode Selector (Family / Personal) */}
      <div className="w-full md:w-auto grid grid-cols-2 md:grid-flow-col md:auto-cols-max items-center gap-1.5 bg-[#FAF8F5] dark:bg-[#1C1C1E] p-1.5 rounded-2xl border border-[#EAE6DD] dark:border-white/10 shadow-xs justify-self-start">
        <button
          type="button"
          onClick={() => setBudgetMode('family')}
          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            budgetMode === 'family'
              ? 'bg-[#4A7C59] text-white shadow-xs'
              : 'text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white'
          }`}
        >
          <Users size={15} />
          <span>Семейный</span>
        </button>
        <button
          type="button"
          onClick={() => setBudgetMode('personal')}
          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            budgetMode === 'personal'
              ? 'bg-[#4A7C59] text-white shadow-xs'
              : 'text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white'
          }`}
        >
          <User size={15} />
          <span>Личный</span>
          <span className="w-5 h-5 rounded-full bg-[#EAE6DD] dark:bg-[#2C2C2E] text-graphite dark:text-white flex items-center justify-center text-[10px] font-mono ml-0.5">
            {memberInitial}
          </span>
        </button>
      </div>

      {/* Toolbar Controls Subgrid: Auto-flowing columns pinned to the right edge */}
      <div className="grid grid-flow-col auto-cols-max items-center justify-end gap-2 sm:gap-2.5 w-full md:w-auto md:justify-self-end">
        {/* Month Picker Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMonthPickerOpen(prev => !prev)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1C1E] border border-[#EAE6DD] dark:border-white/10 text-xs font-bold text-graphite dark:text-white hover:bg-[#F2ECE1] dark:hover:bg-white/5 transition cursor-pointer"
          >
            <Calendar size={14} className="text-[#4A7C59]" />
            <span className="capitalize">{currentMonthName}</span>
            <ChevronDown size={14} className={`text-graphite-muted transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMonthPickerOpen && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setIsMonthPickerOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#FAF8F5] dark:bg-[#1C1C1E] border border-[#EAE6DD] dark:border-white/10 rounded-2xl shadow-xl z-30 py-1.5 overflow-hidden font-sans">
                {monthOptions.map(m => {
                  const isSelected = 
                    m.date.getMonth() === activeMonth.getMonth() && 
                    m.date.getFullYear() === activeMonth.getFullYear();
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        onMonthChange(m.date);
                        setIsMonthPickerOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between hover:bg-[#F2ECE1] dark:hover:bg-white/10 transition cursor-pointer ${
                        isSelected ? 'text-[#4A7C59] font-bold bg-[#EAE6DD]/40 dark:bg-white/5' : 'text-graphite dark:text-gray-300'
                      }`}
                    >
                      <span className="capitalize">{m.label}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Privacy Toggle */}
        <button
          type="button"
          onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
          className="p-2.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1C1E] border border-[#EAE6DD] dark:border-white/10 text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white hover:bg-[#F2ECE1] dark:hover:bg-white/5 transition cursor-pointer"
          title={settings.privacyMode ? 'Показать суммы' : 'Скрыть суммы'}
        >
          {settings.privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        {/* AI Assistant Quick Trigger */}
        <button
          type="button"
          onClick={onOpenAIChat}
          className="p-2.5 rounded-2xl bg-[#EAE6DD] dark:bg-[#2C2C2E] text-graphite dark:text-white hover:bg-[#DFD9CB] dark:hover:bg-[#3A3A3C] transition cursor-pointer"
          title="Спросить ИИ-помощника"
        >
          <Sparkles size={16} className="text-[#4A7C59]" />
        </button>

        {/* New Record Button */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#4A7C59] hover:bg-[#3D6649] text-white text-xs font-bold shadow-sm active:scale-95 transition cursor-pointer"
        >
          <Plus size={16} />
          <span>Запись</span>
        </button>
      </div>
    </div>
  );
};

export default OverviewHeaderBar;
