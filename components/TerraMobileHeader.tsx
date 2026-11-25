import React from 'react';
import { Plus, Settings, Upload, Bell } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { TerraPageHeader, TerraHeaderAction } from './TerraPageHeader';

interface TerraMobileHeaderProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  headingLevel?: 1 | 2;
  globalMobileOnly?: boolean;
  onAdd?: () => void;
  addTitle?: string;
  onImport?: () => void;
  importTitle?: string;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  rightExtra?: React.ReactNode;
  children?: React.ReactNode;
}

export const TerraMobileHeader: React.FC<TerraMobileHeaderProps> = ({
  title, subtitle, leading, headingLevel, globalMobileOnly,
  onAdd, addTitle = 'Добавить', onImport, importTitle = 'Импорт выписки',
  onOpenSettings, onOpenNotifications, rightExtra, children,
}) => {
  const { notifications = [] } = useData();
  const unread = notifications.filter(n => !n.isRead).length;
  return <TerraPageHeader title={title} subtitle={subtitle} leading={leading} headingLevel={headingLevel}
    globalActions={onOpenNotifications || onOpenSettings ? <div className={`flex items-center gap-2 ${globalMobileOnly ? 'md:hidden' : ''}`}>
      {onOpenNotifications && <TerraHeaderAction label="Уведомления" onClick={onOpenNotifications} icon={
        <span className="relative inline-flex"><Bell size={18}/>{unread > 0 && <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[var(--terra-danger-text)]"/>}</span>
      }/>}
      {onOpenSettings && <TerraHeaderAction label="Настройки и профиль" onClick={onOpenSettings} icon={<Settings size={18}/>}/>}
    </div> : undefined}
    actions={onAdd || onImport || rightExtra ? <>
      {onAdd && <TerraHeaderAction label={addTitle} onClick={onAdd} icon={<Plus size={20}/>} variant="primary" showLabel/>}
      {onImport && <TerraHeaderAction label={importTitle} onClick={onImport} icon={<Upload size={18}/>}/>}
      {rightExtra}
    </> : undefined}>
    {children}
  </TerraPageHeader>;
};

export default TerraMobileHeader;
