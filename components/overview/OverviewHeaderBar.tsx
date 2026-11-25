import React from 'react';
import { 
  Users, User, Eye, EyeOff, Sparkles, Plus, ChevronDown, Calendar 
} from 'lucide-react';
import { AppSettings, FamilyMember } from '../../types';
import { TOOLBAR_ACTION, TOOLBAR_ACTION_IDLE, TOOLBAR_ACTION_PRIMARY, FILTER_CHIP_ACTIVE } from '../filterUiTokens';

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
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 pb-2 w-full min-w-0">
      {/* Mode Selector (Family / Personal) */}
      <div className={`w-full sm:w-auto grid ${householdPersonal?'grid-cols-1':'grid-cols-2'} sm:grid-flow-col sm:auto-cols-max items-center gap-1.5 bg-[var(--terra-soft)] p-1 rounded-xl justify-self-start`}>
        {!householdPersonal&&<button
          type="button"
          onClick={() => setBudgetMode('family')}
          aria-pressed={budgetMode === 'family'}
          className={`min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] cursor-pointer ${
            budgetMode === 'family'
              ? FILTER_CHIP_ACTIVE
              : 'text-[var(--terra-ink)] hover:bg-[var(--terra-surface)]'
          }`}
        >
          <Users size={15} />
          <span>Семейный</span>
        </button>}
        <button
          type="button"
          onClick={() => setBudgetMode('personal')}
          aria-pressed={budgetMode === 'personal'}
          className={`min-h-[44px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] cursor-pointer ${
            budgetMode === 'personal'
              ? FILTER_CHIP_ACTIVE
              : 'text-[var(--terra-ink)] hover:bg-[var(--terra-surface)]'
          }`}
        >
          <User size={15} />
          <span>Личный</span>
          <span className="w-5 h-5 rounded-full bg-[var(--terra-soft)] dark:bg-[var(--terra-soft)] text-graphite dark:text-white flex items-center justify-center text-xs font-semibold ml-0.5">
            {memberInitial}
          </span>
        </button>
      </div>

      {/* Toolbar Controls Subgrid: Auto-flowing columns pinned to the right edge */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full xl:w-auto min-w-0">
        {/* Month Picker Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMonthPickerOpen(prev => !prev)}
            aria-expanded={isMonthPickerOpen}
            aria-label={`Выбрать месяц. Сейчас: ${currentMonthName}`}
            className={`${TOOLBAR_ACTION} ${TOOLBAR_ACTION_IDLE} cursor-pointer`}
          >
            <Calendar size={14} className="text-[var(--terra-primary-text)]" />
            <span className="capitalize">{currentMonthName}</span>
            <ChevronDown size={14} className={`text-graphite-muted transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMonthPickerOpen && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setIsMonthPickerOpen(false)} 
              />
              <div className="absolute left-0 xl:left-auto xl:right-0 top-full mt-2 w-48 max-h-[min(50dvh,22rem)] bg-[var(--terra-surface)] dark:bg-[var(--terra-surface)] border border-[#EAE6DD] dark:border-white/10 rounded-2xl shadow-lg z-30 py-1.5 overflow-y-auto overscroll-y-contain font-sans terra-menu">
                {monthOptions.map(m => {
                  const isSelected = 
                    m.date.getMonth() === activeMonth.getMonth() && 
                    m.date.getFullYear() === activeMonth.getFullYear();
                  return (
                    <button
                      key={m.key}
                      type="button" aria-pressed={isSelected}
                      onClick={() => {
                        onMonthChange(m.date);
                        setIsMonthPickerOpen(false);
                      }}
                      className={`min-h-[44px] w-full text-left px-4 py-2 text-sm font-semibold flex items-center justify-between hover:bg-[#F2ECE1] dark:hover:bg-white/10 transition cursor-pointer ${
                        isSelected ? 'text-[var(--terra-primary-text)] font-semibold bg-[var(--terra-primary-soft)]' : 'text-graphite dark:text-gray-300'
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
          <Sparkles size={16} className="text-[var(--terra-primary-text)]" />
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
