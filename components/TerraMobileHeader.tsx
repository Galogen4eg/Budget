import React from 'react';
import { Plus, Settings, Upload, Bell } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { PAGE_HEADING, TOOLBAR_ACTION_IDLE, TOOLBAR_ACTION_PRIMARY } from './filterUiTokens';

interface TerraMobileHeaderProps {
  title: string;
  onAdd?: () => void;
  addTitle?: string;
  onImport?: () => void;
  importTitle?: string;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  rightExtra?: React.ReactNode;
}

export const TerraMobileHeader: React.FC<TerraMobileHeaderProps> = ({
  title,
  onAdd,
  addTitle = 'Добавить',
  onImport,
  importTitle = 'Импорт выписки',
  onOpenSettings,
  onOpenNotifications,
  rightExtra,
}) => {
  const {notifications=[]}=useData();
  const unread=notifications.filter(n=>!n.isRead).length;
  return (
    <header data-terra-mobile-header className="sticky top-0 z-30 bg-[var(--terra-canvas)] px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--terra-border)] shrink-0 transition-colors">
      {/* Section Title without app name with safe wrapping and truncation */}
      <h1 className={`${PAGE_HEADING} break-words min-w-[76px] flex-1`}>
        {title}
      </h1>

      {/* Action Buttons with correct accessibility tap targets (minimum 44x44px) */}
      <div className="flex flex-wrap items-center justify-end gap-1.5 max-w-full">
        {rightExtra}

        {onImport && (
          <button
            type="button"
            onClick={onImport}
            aria-label={importTitle}
            title={importTitle}
            className={`w-11 h-11 rounded-xl ${TOOLBAR_ACTION_IDLE} flex items-center justify-center transition-colors cursor-pointer terra-press focus-visible:ring-2 focus-visible:ring-primary`}
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
            className={`w-11 h-11 rounded-xl ${TOOLBAR_ACTION_PRIMARY} flex items-center justify-center transition-colors cursor-pointer terra-press focus-visible:ring-2 focus-visible:ring-primary`}
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        )}

        {onOpenNotifications&&<button type="button" onClick={onOpenNotifications} aria-label="Уведомления" className={`relative w-11 h-11 rounded-xl ${TOOLBAR_ACTION_IDLE} flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]`}><Bell size={18} aria-hidden="true"/>{unread>0&&<span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--terra-danger-text)]" aria-hidden="true"/>}</button>}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Настройки и профиль"
            title="Настройки и профиль"
            className={`w-11 h-11 rounded-xl ${TOOLBAR_ACTION_IDLE} flex items-center justify-center transition-colors cursor-pointer terra-press focus-visible:ring-2 focus-visible:ring-primary`}
          >
            <Settings size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </header>
  );
};

export default TerraMobileHeader;
