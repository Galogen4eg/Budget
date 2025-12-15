// Коллекция: rooms/{roomId}
export interface Room {
  id: string;
  settings: {
    initialBalance: number; // Начальный остаток (только в настройках)
    savingsRate: number;    // Процент для откладывания (0-100)
    roomName: string;       // Название комнаты
    telegram: {             // Настройки Telegram
      botToken: string;
      chatId: string;
    };
  };
  participants: Participant[]; // Участники планировщика
}

// Коллекция: transactions/{transactionId} (только пользовательские операции)
export interface Transaction {
  id: string;
  roomId: string;
  date: Date;              // Timestamp Firestore
  type: 'income' | 'expense';
  amount: number;
  category: string;        // Категория из предустановленного списка
  description: string;
  balanceAfter: number;    // Баланс после операции (рассчитывается при сохранении)
}

// Коллекция: recurringTransactions/{recurringId} (шаблоны обязательных трат)
export interface RecurringTransaction {
  id: string;
  roomId: string;
  name: string;            // Название траты
  amount: number;
  category: string;
  dayOfMonth: number;      // День месяца для списания (1-31)
}

// Коллекция: shoppingItems/{itemId} (текущий список покупок)
export interface ShoppingItem {
  id: string;
  roomId: string;
  name: string;
  quantity: number;
  unit: 'pcs' | 'liters' | 'grams' | 'kg'; // Единицы измерения
  isBought: boolean;
}

// Коллекция: shoppingHistory/{historyId} (история покупок для анализа)
export interface ShoppingHistory {
  roomId: string;
  itemName: string;
  purchaseDate: Date;
}

// Коллекция: plannerEvents/{eventId} (события планировщика)
export interface PlannerEvent {
  id: string;
  roomId: string;
  title: string;
  start: Date;             // Начало события
  end: Date;               // Окончание события
  participantIds: string[]; // ID участников
  isTemplate: boolean;     // Является ли шаблоном
  templateName?: string;   // Название шаблона (если есть)
}

// Коллекция: participants/{participantId} (участники)
export interface Participant {
  id: string;
  roomId: string;
  name: string;
  color: string;           // HEX-код цвета (#FF5733)
}

// Типы для UI компонентов
export interface BalanceTileProps {
  title: string;
  value: number;
  editable?: boolean;
}

export interface CategorySummary {
  name: string;
  amount: number;
}

export interface UnitOption {
  value: 'pcs' | 'liters' | 'grams' | 'kg';
  label: string;
}