import React from 'react';
import { 
  Users, User, Eye, EyeOff, Sparkles, Plus, ChevronDown, Calendar 
} from 'lucide-react';
import { AppSettings, FamilyMember } from '../../types';
import { TOOLBAR_ACTION, TOOLBAR_ACTION_IDLE, TOOLBAR_ACTION_PRIMARY } from '../filterUiTokens';

interface OverviewHeaderBarProps {
  budgetMode: 'family' | 'personal';
  householdPersonal?:boolean;
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
  householdPersonal=false,
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
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-2 w-full min-w-0">
      {/* Mode Selector (Family / Personal) */}
      <div className={`w-full sm:w-auto grid ${householdPersonal?'grid-cols-1':'grid-cols-2'} sm:grid-flow-col sm:auto-cols-max items-center gap-1.5 bg-[var(--terra-surface)] dark:bg-[var(--terra-surface)] p-1.5 rounded-2xl border border-[#EAE6DD] dark:border-white/10 shadow-xs justify-self-start`}>
        {!householdPersonal&&<button
          type="button"
          onClick={() => setBudgetMode('family')}
          aria-pressed={budgetMode === 'family'}
          className={`min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
            budgetMode === 'family'
              ? 'bg-[#4A7C59] text-white shadow-xs'
              : 'text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white'
          }`}
        >
          <Users size={15} />
          <span>Семейный</span>
        </button>}
        <button
          type="button"
          onClick={() => setBudgetMode('personal')}
          aria-pressed={budgetMode === 'personal'}
          className={`min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
            budgetMode === 'personal'
              ? 'bg-[#4A7C59] text-white shadow-xs'
              : 'text-graphite-muted dark:text-gray-400 hover:text-graphite dark:hover:text-white'
          }`}
        >
          <User size={15} />
          <span>Личный</span>
          <span className="w-5 h-5 rounded-full bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] text-graphite dark:text-white flex items-center justify-center text-[10px] font-mono ml-0.5">
            {memberInitial}
          </span>
        </button>
      </div>

      {/* Toolbar Controls Subgrid: Auto-flowing columns pinned to the right edge */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full lg:w-auto min-w-0">
        {/* Month Picker Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMonthPickerOpen(prev => !prev)}
            aria-expanded={isMonthPickerOpen}
            aria-label={`Выбрать месяц. Сейчас: ${currentMonthName}`}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl min-h-[44px] bg-[var(--terra-surface)] dark:bg-[var(--terra-surface)] border border-[#EAE6DD] dark:border-white/10 text-xs font-bold text-graphite dark:text-white hover:bg-[#F2ECE1] dark:hover:bg-white/5 transition cursor-pointer"
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
              <div className="absolute right-0 top-full mt-2 w-48 max-h-[min(50dvh,22rem)] bg-[var(--terra-surface)] dark:bg-[var(--terra-surface)] border border-[#EAE6DD] dark:border-white/10 rounded-2xl shadow-lg z-30 py-1.5 overflow-y-auto overscroll-y-contain font-sans terra-menu">
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
                      className={`min-h-[44px] w-full text-left px-4 py-2 text-sm font-semibold flex items-center justify-between hover:bg-[#F2ECE1] dark:hover:bg-white/10 transition cursor-pointer ${
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
          className={`${TOOLBAR_ACTION} ${TOOLBAR_ACTION_IDLE} cursor-pointer`}
          title={settings.privacyMode ? 'Показать суммы' : 'Скрыть суммы'}
          aria-label={settings.privacyMode ? 'Показать суммы' : 'Скрыть суммы'}
          aria-pressed={settings.privacyMode}
        >
          {settings.privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        {/* AI Assistant Quick Trigger */}
        <button
          type="button"
          onClick={onOpenAIChat}
          className={`${TOOLBAR_ACTION} ${TOOLBAR_ACTION_IDLE} cursor-pointer`}
          title="Спросить ИИ-помощника"
          aria-label="Спросить ИИ-помощника"
        >
          <Sparkles size={16} className="text-[#4A7C59]" />
        </button>

        {/* New Record Button */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className={`${TOOLBAR_ACTION} ${TOOLBAR_ACTION_PRIMARY} cursor-pointer terra-press`}
        >
          <Plus size={16} />
          <span>Запись</span>
        </button>
      </div>
    </div>
  );
};

export default OverviewHeaderBar;
