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
    <header data-overview-toolbar className="terra-overview-toolbar w-full min-w-0">
      <h1 className="font-headline text-2xl font-bold text-[var(--terra-ink)]">Обзор</h1>
      {/* Mode Selector (Family / Personal) */}
      {!householdPersonal&&<div data-testid="overview-scope-desktop" role="group" aria-label="Область бюджета" className="terra-overview-scope grid grid-cols-2 items-center gap-0.5 bg-[var(--terra-soft)] rounded-xl min-w-0">
        <button
          type="button"
          onClick={() => setBudgetMode('family')}
          aria-pressed={budgetMode === 'family'}
          className={`h-11 min-w-0 flex items-center justify-center gap-1.5 px-3 rounded-xl text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] cursor-pointer ${
            budgetMode === 'family'
              ? 'bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)]'
              : 'text-[var(--terra-ink)] hover:bg-[var(--terra-surface)]'
          }`}
        >
          <Users size={15} />
          <span>Семейный</span>
        </button>
        <button
          type="button"
          onClick={() => setBudgetMode('personal')}
          aria-pressed={budgetMode === 'personal'}
          className={`h-11 min-w-0 flex items-center justify-center gap-1.5 px-3 rounded-xl text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] cursor-pointer ${
            budgetMode === 'personal'
              ? 'bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)]'
              : 'text-[var(--terra-ink)] hover:bg-[var(--terra-surface)]'
          }`}
        >
          <User size={15} />
          <span>Личный</span>

        </button>
      </div>}

      {/* Toolbar Controls Subgrid: Auto-flowing columns pinned to the right edge */}
      <div data-overview-toolbar-actions className="terra-overview-toolbar-actions flex flex-wrap items-center justify-end gap-2 min-w-0">
        {/* Month Picker Dropdown */}
        <div className="relative" onKeyDown={e=>{if(e.key==="Escape"&&isMonthPickerOpen){e.stopPropagation();setIsMonthPickerOpen(false);e.currentTarget.querySelector("button")?.focus();}}}>
          <button
            type="button"
            onClick={() => setIsMonthPickerOpen(prev => !prev)}
            aria-expanded={isMonthPickerOpen} aria-controls="overview-month-options"
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
              <div id="overview-month-options" role="group" aria-label="Доступные месяцы" className="absolute left-0 xl:left-auto xl:right-0 top-full mt-2 w-48 max-h-[min(50dvh,22rem)] bg-[var(--terra-surface)] dark:bg-[var(--terra-surface)] border border-[var(--terra-border)] rounded-2xl shadow-lg z-30 py-1.5 overflow-y-auto overscroll-y-contain font-sans terra-menu">
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
                        const trigger=document.querySelector<HTMLButtonElement>('[aria-controls="overview-month-options"]');trigger?.focus({preventScroll:true});
                      }}
                      className={`min-h-[44px] w-full text-left px-4 py-2 text-sm font-semibold flex items-center justify-between hover:bg-[var(--terra-soft)] transition cursor-pointer ${
                        isSelected ? 'text-[var(--terra-primary-text)] font-semibold bg-[var(--terra-primary-soft)]' : 'text-[var(--terra-ink)]'
                      }`}
                    >
                      <span className="capitalize">{m.label}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--terra-primary-text)]" />}
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
          className={`${TOOLBAR_ACTION} ${TOOLBAR_ACTION_IDLE} !w-11 !px-0 cursor-pointer`}
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
          className={`${TOOLBAR_ACTION} ${TOOLBAR_ACTION_IDLE} !w-11 !px-0 cursor-pointer`}
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
          <span>Операция</span>
        </button>
      </div>
    </header>
  );
};

export default OverviewHeaderBar;
