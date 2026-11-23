import React, { useState, useEffect } from 'react';
import { ShoppingItem, AppSettings, FamilyMember } from '../types';
import ShoppingListDesktop from './ShoppingListDesktop';
import ShoppingListMobile from './ShoppingListMobile';
import ShoppingQuickListsPanel from './ShoppingQuickListsPanel';

export interface ShoppingListProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  settings: AppSettings;
  members: FamilyMember[];
  onCompletePurchase?: () => void;
  onMoveToPantry: (item: ShoppingItem) => Promise<void>;
  onSendToTelegram: (items: ShoppingItem[]) => Promise<boolean>;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
}

export const ShoppingList: React.FC<ShoppingListProps> = (props) => {
  const [isDesktop, setIsDesktop] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return (
    <div className="h-full min-h-0 flex flex-col pt-[calc(64px+env(safe-area-inset-top,0px))] md:pt-0">
      <ShoppingQuickListsPanel items={props.items} members={props.members} />
      <div className="flex-1 min-h-0">
        {isDesktop ? <ShoppingListDesktop {...props}/> : <ShoppingListMobile {...props}/>}
      </div>
    </div>
  );
};

export default ShoppingList;
