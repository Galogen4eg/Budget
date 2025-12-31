
import { 
  collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, query, orderBy, where, getDocs, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, AppSettings, FamilyMember, SavingsGoal, ShoppingItem, FamilyEvent, Subscription, Debt, PantryItem, MeterReading, LoyaltyCard, LearnedRule, Category } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';

// Helper for generating truly unique IDs
export const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export const subscribeToCollection = (familyId: string, collectionName: string, callback: (data: any[]) => void) => {
  const q = query(collection(db, 'families', familyId, collectionName));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};

export const subscribeToSettings = (familyId: string, callback: (settings: AppSettings) => void) => {
  return onSnapshot(doc(db, 'families', familyId, 'config', 'settings'), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as AppSettings);
    }
  });
};

export const getOrInitUserFamily = async (user: FirebaseUser): Promise<string> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data().familyId;
  } else {
    const defaultFamilyId = user.uid;
    await setDoc(userRef, { 
      email: user.email, 
      familyId: defaultFamilyId 
    });
    return defaultFamilyId;
  }
};

export const joinFamily = async (user: FirebaseUser, targetFamilyId: string) => {
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, { familyId: targetFamilyId });
};

export const addItem = async (familyId: string, collectionName: string, item: any) => {
  const id = item.id || generateUniqueId();
  await setDoc(doc(db, 'families', familyId, collectionName, id), { ...item, id });
};

export const addItemsBatch = async (familyId: string, collectionName: string, items: any[]) => {
  const batch = writeBatch(db);
  items.forEach(item => {
    const id = item.id || generateUniqueId();
    const docRef = doc(db, 'families', familyId, collectionName, id);
    batch.set(docRef, { ...item, id });
  });
  await batch.commit();
};

export const updateItem = async (familyId: string, collectionName: string, id: string, updates: any) => {
  const docRef = doc(db, 'families', familyId, collectionName, id);
  await updateDoc(docRef, updates);
};

export const deleteItem = async (familyId: string, collectionName: string, id: string) => {
  await deleteDoc(doc(db, 'families', familyId, collectionName, id));
};

export const deleteItemsBatch = async (familyId: string, collectionName: string, ids: string[]) => {
  const batch = writeBatch(db);
  ids.forEach(id => {
    const ref = doc(db, 'families', familyId, collectionName, id);
    batch.delete(ref);
  });
  await batch.commit();
};

export const saveSettings = async (familyId: string, settings: AppSettings) => {
  await setDoc(doc(db, 'families', familyId, 'config', 'settings'), settings, { merge: true });
};

export const syncInitialData = async (familyId: string, data: any) => {
  const batch = writeBatch(db);
  const addToBatch = (col: string, items: any[]) => {
    items.forEach(item => {
      const id = item.id || generateUniqueId();
      const ref = doc(db, 'families', familyId, col, id);
      batch.set(ref, { ...item, id });
    });
  };

  if (data.transactions) addToBatch('transactions', data.transactions);
  if (data.members) addToBatch('members', data.members);
  if (data.goals) addToBatch('goals', data.goals);
  if (data.shopping) addToBatch('shopping', data.shopping);
  if (data.categories) addToBatch('categories', data.categories);
  
  if (data.settings) {
    const settingsRef = doc(db, 'families', familyId, 'config', 'settings');
    batch.set(settingsRef, data.settings);
  }
  await batch.commit();
};