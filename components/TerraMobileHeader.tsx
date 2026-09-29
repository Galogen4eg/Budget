import React from 'react';
import { Plus, Settings, Upload } from 'lucide-react';

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
    <header className="sticky top-0 z-30 bg-[#FAF6F0]/95 dark:bg-[#121214]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-[#EAE5DB]/60 dark:border-white/5 shrink-0 transition-colors">
      {/* Section Title without app name */}
      <h1 className="text-xl font-extrabold font-headline text-[#1E2420] dark:text-white tracking-tight leading-tight">
        {title}
      </h1>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {rightExtra}

        {onImport && (
          <button
            type="button"
            onClick={onImport}
            aria-label={importTitle}
            title={importTitle}
            className="w-9 h-9 rounded-full bg-[#EAE6DD] dark:bg-[#252528] hover:bg-[#E0DBD0] dark:hover:bg-white/10 active:scale-95 text-[#2E3230] dark:text-white flex items-center justify-center shadow-xs transition-all cursor-pointer"
          >
            <Upload size={17} strokeWidth={2.2} />
          </button>
        )}

        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={addTitle}
            title={addTitle}
            className="w-9 h-9 rounded-full bg-[#4A7C59] hover:bg-[#3D6849] active:scale-95 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer"
          >
            <Plus size={19} strokeWidth={2.5} />
          </button>
        )}

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Настройки и профиль"
            title="Настройки и профиль"
            className="w-9 h-9 rounded-full bg-[#EAE6DD] dark:bg-[#252528] hover:bg-[#E0DBD0] dark:hover:bg-white/10 active:scale-95 text-[#2E3230] dark:text-white flex items-center justify-center shadow-xs transition-all cursor-pointer"
          >
            <Settings size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </header>
  );
};

export default TerraMobileHeader;

