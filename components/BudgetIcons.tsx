import React from 'react';
import { 
  Wallet as LucideWallet, 
  Calendar as LucideCalendar, 
  Lock as LucideLock, 
  PiggyBank as LucideSavings, 
  Minus as LucideMinus, 
  Plus as LucidePlus, 
  Wrench as LucideBuild, 
  Copy as LucideCopy, 
  FolderArchive as LucideFolderZip, 
  Trash2 as LucideDeleteSweep, 
  Check as LucideCheck, 
  Banknote as LucidePayments, 
  CalendarCheck as LucideEventAvailable,
  SearchCheck as LucideSearchCheck
} from 'lucide-react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export const Wallet: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideWallet size={size} className={className} {...props} />
);

export const Calendar: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideCalendar size={size} className={className} {...props} />
);

export const Lock: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideLock size={size} className={className} {...props} />
);

export const Savings: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideSavings size={size} className={className} {...props} />
);

export const Remove: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideMinus size={size} className={className} {...props} />
);

export const Add: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucidePlus size={size} className={className} {...props} />
);

export const Build: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideBuild size={size} className={className} {...props} />
);

export const ContentCopy: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideCopy size={size} className={className} {...props} />
);

export const SearchCheck: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideSearchCheck size={size} className={className} {...props} />
);

export const FolderZip: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideFolderZip size={size} className={className} {...props} />
);

export const DeleteSweep: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideDeleteSweep size={size} className={className} {...props} />
);

export const Check: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideCheck size={size} className={className} {...props} />
);

export const Payments: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucidePayments size={size} className={className} {...props} />
);

export const EventAvailable: React.FC<IconProps> = ({ size = 20, className, ...props }) => (
  <LucideEventAvailable size={size} className={className} {...props} />
);
