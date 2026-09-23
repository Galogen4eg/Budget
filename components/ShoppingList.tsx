import React, { useState, useEffect } from 'react';
import { ShoppingItem, AppSettings, FamilyMember } from '../types';
import ShoppingListDesktop from './ShoppingListDesktop';
import ShoppingListMobile from './ShoppingListMobile';

export interface ShoppingListProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onCompletePurchase?: () => void;
  onMoveToPantry: (item: ShoppingItem) => Promise<void>;
  onSendToTelegram: (items: ShoppingItem[]) => Promise<boolean>;
}

export const ShoppingList: React.FC<ShoppingListProps> = (props) => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  if (isDesktop) {
    return <ShoppingListDesktop {...props} />;
  }

  return <ShoppingListMobile {...props} />;
};

export default ShoppingList;
