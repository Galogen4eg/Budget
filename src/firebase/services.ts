import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './init';
import { Room, Transaction, RecurringTransaction, ShoppingItem, PlannerEvent, Participant } from '../types';

// Преобразование Timestamp в Date
const timestampToDate = (timestamp: Timestamp): Date => {
  return new Date(timestamp.toDate());
};

// Преобразование Date в Timestamp
const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Аутентификация и работа с комнатами
export const getOrCreateRoom = async (roomId: string, userId: string): Promise<Room> => {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);

  if (roomSnap.exists()) {
    const data = roomSnap.data();
    return {
      id: roomSnap.id,
      settings: data.settings,
      participants: data.participants || []
    } as Room;
  } else {
    // Создаем новую комнату
    const newRoom: Room = {
      id: roomId,
      settings: {
        initialBalance: 0,
        savingsRate: 10,
        roomName: 'Моя семья',
        telegram: {
          botToken: '',
          chatId: ''
        }
      },
      participants: []
    };
    
    await setDoc(roomRef, newRoom);
    return newRoom;
  }
};

// Работа с транзакциями
export const getTransactions = async (roomId: string): Promise<Transaction[]> => {
  const q = query(collection(db, 'transactions'), where('roomId', '==', roomId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      roomId: data.roomId,
      date: data.date instanceof Timestamp ? timestampToDate(data.date) : data.date,
      type: data.type,
      amount: data.amount,
      category: data.category,
      description: data.description,
      balanceAfter: data.balanceAfter
    } as Transaction;
  });
};

export const addTransaction = async (transaction: Transaction): Promise<string> => {
  const transactionRef = doc(collection(db, 'transactions'));
  const newTransaction = {
    ...transaction,
    date: dateToTimestamp(transaction.date),
    createdAt: serverTimestamp()
  };
  await setDoc(transactionRef, newTransaction);
  return transactionRef.id;
};

export const updateTransaction = async (id: string, transaction: Transaction): Promise<void> => {
  const transactionRef = doc(db, 'transactions', id);
  await updateDoc(transactionRef, {
    ...transaction,
    date: dateToTimestamp(transaction.date)
  });
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const transactionRef = doc(db, 'transactions', id);
  await deleteDoc(transactionRef);
};

// Работа с обязательными тратами
export const getRecurringTransactions = async (roomId: string): Promise<RecurringTransaction[]> => {
  const q = query(collection(db, 'recurringTransactions'), where('roomId', '==', roomId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      roomId: data.roomId,
      name: data.name,
      amount: data.amount,
      category: data.category,
      dayOfMonth: data.dayOfMonth
    } as RecurringTransaction;
  });
};

export const addRecurringTransaction = async (recurring: RecurringTransaction): Promise<string> => {
  const recurringRef = doc(collection(db, 'recurringTransactions'));
  await setDoc(recurringRef, recurring);
  return recurringRef.id;
};

export const updateRecurringTransaction = async (id: string, recurring: RecurringTransaction): Promise<void> => {
  const recurringRef = doc(db, 'recurringTransactions', id);
  await updateDoc(recurringRef, recurring);
};

export const deleteRecurringTransaction = async (id: string): Promise<void> => {
  const recurringRef = doc(db, 'recurringTransactions', id);
  await deleteDoc(recurringRef);
};

// Работа со списком покупок
export const getShoppingItems = async (roomId: string): Promise<ShoppingItem[]> => {
  const q = query(collection(db, 'shoppingItems'), where('roomId', '==', roomId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      roomId: data.roomId,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      isBought: data.isBought
    } as ShoppingItem;
  });
};

export const addShoppingItem = async (item: ShoppingItem): Promise<string> => {
  const itemRef = doc(collection(db, 'shoppingItems'));
  await setDoc(itemRef, item);
  return itemRef.id;
};

export const updateShoppingItem = async (id: string, item: ShoppingItem): Promise<void> => {
  const itemRef = doc(db, 'shoppingItems', id);
  await updateDoc(itemRef, item);
};

export const deleteShoppingItem = async (id: string): Promise<void> => {
  const itemRef = doc(db, 'shoppingItems', id);
  await deleteDoc(itemRef);
};

// Работа с событиями планировщика
export const getPlannerEvents = async (roomId: string): Promise<PlannerEvent[]> => {
  const q = query(collection(db, 'plannerEvents'), where('roomId', '==', roomId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      roomId: data.roomId,
      title: data.title,
      start: data.start instanceof Timestamp ? timestampToDate(data.start) : data.start,
      end: data.end instanceof Timestamp ? timestampToDate(data.end) : data.end,
      participantIds: data.participantIds,
      isTemplate: data.isTemplate,
      templateName: data.templateName
    } as PlannerEvent;
  });
};

export const addPlannerEvent = async (event: PlannerEvent): Promise<string> => {
  const eventRef = doc(collection(db, 'plannerEvents'));
  const newEvent = {
    ...event,
    start: dateToTimestamp(event.start),
    end: dateToTimestamp(event.end),
    createdAt: serverTimestamp()
  };
  await setDoc(eventRef, newEvent);
  return eventRef.id;
};

export const updatePlannerEvent = async (id: string, event: PlannerEvent): Promise<void> => {
  const eventRef = doc(db, 'plannerEvents', id);
  await updateDoc(eventRef, {
    ...event,
    start: dateToTimestamp(event.start),
    end: dateToTimestamp(event.end)
  });
};

export const deletePlannerEvent = async (id: string): Promise<void> => {
  const eventRef = doc(db, 'plannerEvents', id);
  await deleteDoc(eventRef);
};

// Работа с участниками
export const getParticipants = async (roomId: string): Promise<Participant[]> => {
  const q = query(collection(db, 'participants'), where('roomId', '==', roomId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      roomId: data.roomId,
      name: data.name,
      color: data.color
    } as Participant;
  });
};

export const addParticipant = async (participant: Participant): Promise<string> => {
  const participantRef = doc(collection(db, 'participants'));
  await setDoc(participantRef, participant);
  return participantRef.id;
};

export const updateParticipant = async (id: string, participant: Participant): Promise<void> => {
  const participantRef = doc(db, 'participants', id);
  await updateDoc(participantRef, participant);
};

export const deleteParticipant = async (id: string): Promise<void> => {
  const participantRef = doc(db, 'participants', id);
  await deleteDoc(participantRef);
};

// Обновление настроек комнаты
export const updateRoomSettings = async (roomId: string, settings: Partial<Room['settings']>): Promise<void> => {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, { settings });
};

// Очистка всех транзакций комнаты
export const clearAllTransactions = async (roomId: string): Promise<void> => {
  const transactions = await getTransactions(roomId);
  const transactionPromises = transactions.map(tx => deleteTransaction(tx.id));
  await Promise.all(transactionPromises);
};