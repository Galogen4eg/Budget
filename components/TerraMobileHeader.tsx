import React from 'react';
import { Plus, Settings, Upload, Bell } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { PAGE_HEADING, ICON_ACTION, TOOLBAR_ACTION_IDLE, TOOLBAR_ACTION_PRIMARY } from './filterUiTokens';

interface TerraMobileHeaderProps {
  title: string;
  headingLabel?: string;
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
  headingLabel,
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
    <header data-terra-mobile-header className="sticky top-0 z-30 bg-[var(--terra-canvas)] px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--terra-border)] shrink-0 transition-colors">
      {/* Section Title without app name with safe wrapping and truncation */}
      <h1 aria-label={headingLabel} className={`${PAGE_HEADING} terra-mobile-title`}>
        {title}
      </h1>

      {/* Action Buttons with correct accessibility tap targets (minimum 44x44px) */}
      <div className="terra-mobile-actions flex flex-wrap items-center justify-end gap-1 max-w-full">
        {rightExtra}

        {onImport && (
          <button
            type="button"
            onClick={onImport}
            aria-label={importTitle}
            title={importTitle}
            className={`${ICON_ACTION} ${TOOLBAR_ACTION_IDLE} cursor-pointer terra-press`}
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
            className={`${ICON_ACTION} ${TOOLBAR_ACTION_PRIMARY} cursor-pointer terra-press`}
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        )}

        {onOpenNotifications&&<button type="button" onClick={onOpenNotifications} aria-label="Уведомления" className={`relative ${ICON_ACTION} ${TOOLBAR_ACTION_IDLE} terra-press`}><Bell size={18} aria-hidden="true"/>{unread>0&&<span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--terra-danger-text)]" aria-hidden="true"/>}</button>}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Настройки и профиль"
            title="Настройки и профиль"
            className={`${ICON_ACTION} ${TOOLBAR_ACTION_IDLE} cursor-pointer terra-press`}
          >
            <Settings size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </header>
  );
};

export default TerraMobileHeader;
