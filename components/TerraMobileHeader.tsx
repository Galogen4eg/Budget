import React from 'react';
import { Plus, Settings, Upload } from 'lucide-react';
import { PAGE_HEADING } from './filterUiTokens';

interface TerraMobileHeaderProps {
  title: string;
  onAdd?: () => void;
  addTitle?: string;
  onImport?: () => void;
  importTitle?: string;
  onOpenSettings?: () => void;
  rightExtra?: React.ReactNode;
}

export const TerraMobileHeader: React.FC<TerraMobileHeaderProps> = ({
  title,
  onAdd,
  addTitle = 'Добавить',
  onImport,
  importTitle = 'Импорт выписки',
  onOpenSettings,
  rightExtra,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF6F0] dark:bg-[#121214] px-4 pt-[calc(12px+env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between border-b border-[#EAE5DB]/60 dark:border-white/5 shrink-0 transition-colors">
      {/* Section Title without app name with safe wrapping and truncation */}
      <h1 className={`${PAGE_HEADING} truncate mr-3 min-w-0 flex-1`}>
        {title}
      </h1>

      {/* Action Buttons with correct accessibility tap targets (minimum 44x44px) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {rightExtra}

        {onImport && (
          <button
            type="button"
            onClick={onImport}
            aria-label={importTitle}
            title={importTitle}
            className="w-11 h-11 rounded-full bg-[#EAE6DD] dark:bg-[#252528] hover:bg-[#E0DBD0] dark:hover:bg-white/10 active:scale-95 text-[#2E3230] dark:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Upload size={18} strokeWidth={2.2} />
          </button>
        )}

        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={addTitle}
            title={addTitle}
            className="w-11 h-11 rounded-full bg-[#4A7C59] hover:bg-[#3D6849] active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        )}

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Настройки и профиль"
            title="Настройки и профиль"
            className="w-11 h-11 rounded-full bg-[#EAE6DD] dark:bg-[#252528] hover:bg-[#E0DBD0] dark:hover:bg-white/10 active:scale-95 text-[#2E3230] dark:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Settings size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </header>
  );
};

export default TerraMobileHeader;
