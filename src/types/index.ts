export interface Room {
  id: string;
  settings: {
    initialBalance: number;
    savingsRate: number;
    roomName: string;
    telegram: {
      botToken: string;
      chatId: string;
    };
  };
  participants: Participant[];
}

export interface Transaction {
  id: string;
  roomId: string;
  date: Date;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  balanceAfter: number;
}

export interface RecurringTransaction {
  id: string;
  roomId: string;
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number;
}

export interface ShoppingItem {
  id: string;
  roomId: string;
  name: string;
  quantity: number;
  unit: 'pcs' | 'liters' | 'grams' | 'kg';
  isBought: boolean;
}

export interface ShoppingHistory {
  roomId: string;
  itemName: string;
  purchaseDate: Date;
}

export interface PlannerEvent {
  id: string;
  roomId: string;
  title: string;
  start: Date;
  end: Date;
  participantIds: string[];
  isTemplate: boolean;
  templateName?: string;
}

export interface Participant {
  id: string;
  roomId: string;
  name: string;
  color: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor?: string;
  textColor?: string;
  extendedProps?: {
    participantIds?: string[];
    isTemplate?: boolean;
  };
}