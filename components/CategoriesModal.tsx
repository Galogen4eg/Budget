import React, { useState, useEffect } from 'react';
import { Category, AppSettings, Transaction } from '../types';
import DesktopCategoryPickerModal from './DesktopCategoryPickerModal';
import MobileCategoryPickerModal from './MobileCategoryPickerModal';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

export interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  transactions: Transaction[];
  currentMonth?: Date;
  settings?: AppSettings;
  initialCategoryId?: string | null;
  onSaveCategoryLimit?: (categoryId: string, limit: number) => void;
  onAddCategory?: (category?: any) => void;
  onSelectCategory?: (categoryId: string) => void;
}

/**
 * Adaptive Categories Modal router component:
 * - On desktop screens (>=768px): renders DesktopCategoryPickerModal
 * - On mobile screens (<768px): renders MobileCategoryPickerModal
 */
export const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  transactions = [],
  initialCategoryId,
  onAddCategory,
  onSelectCategory
}) => {
  const [isDesktop, setIsDesktop] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  useBodyScrollLock(isOpen);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  if (isDesktop) {
    return (
      <DesktopCategoryPickerModal
        isOpen={isOpen}
        onClose={onClose}
        categories={categories}
        selectedCategoryId={initialCategoryId}
        onSelectCategory={(categoryId) => {
          if (onSelectCategory) {
            onSelectCategory(categoryId);
          }
          onClose();
        }}
        onAddCategory={onAddCategory}
        transactions={transactions}
      />
    );
  }

  return (
    <MobileCategoryPickerModal
      isOpen={isOpen}
      onClose={onClose}
      categories={categories}
      selectedCategoryId={initialCategoryId}
      onSelectCategory={(categoryId) => {
        if (onSelectCategory) {
          onSelectCategory(categoryId);
        }
        onClose();
      }}
      onAddCategory={onAddCategory}
      transactions={transactions}
    />
  );
};

export default CategoriesModal;
