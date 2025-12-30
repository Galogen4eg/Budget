
import { 
  collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, query, orderBy, where, getDocs, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, AppSettings, FamilyMember, SavingsGoal, ShoppingItem, FamilyEvent, Subscription, Debt, PantryItem, MeterReading, LoyaltyCard, LearnedRule, Category } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

// Collections structure:
// families/{familyId}
//    - settings (doc)
//    - members (collection)
//    - transactions (collection)
//    - ... other collections
// users/{userId}
//    - familyId: string

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

// --- USER & FAMILY LINKING LOGIC ---

// Get the family ID for a user, or create a default one if new
export const getOrInitUserFamily = async (user: FirebaseUser): Promise<string> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Return existing family link
    return userSnap.data().familyId;
  } else {
    // New user: Initialize with their own UID as familyId
    const defaultFamilyId = user.uid;
    await setDoc(userRef, { 
      email: user.email, 
      familyId: defaultFamilyId 
    });
    return defaultFamilyId;
  }
};

// Switch user to another family
export const joinFamily = async (user: FirebaseUser, targetFamilyId: string) => {
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, { familyId: targetFamilyId });
};

// --- GENERIC CRUD ---

// Generic Add
export const addItem = async (familyId: string, collectionName: string, item: any) => {
  // If item has an ID, use setDoc to keep it, otherwise addDoc
  if (item.id) {
    const { id, ...rest } = item;
    await setDoc(doc(db, 'families', familyId, collectionName, id), item);
  } else {
    await addDoc(collection(db, 'families', familyId, collectionName), item);
  }
};

// Generic Update
export const updateItem = async (familyId: string, collectionName: string, id: string, updates: any) => {
  const docRef = doc(db, 'families', familyId, collectionName, id);
  await updateDoc(docRef, updates);
};

// Generic Delete
export const deleteItem = async (familyId: string, collectionName: string, id: string) => {
  await deleteDoc(doc(db, 'families', familyId, collectionName, id));
};

// Batch Delete
export const deleteItemsBatch = async (familyId: string, collectionName: string, ids: string[]) => {
  const batch = writeBatch(db);
  ids.forEach(id => {
    const ref = doc(db, 'families', familyId, collectionName, id);
    batch.delete(ref);
  });
  await batch.commit();
};

// Special: Save Settings
export const saveSettings = async (familyId: string, settings: AppSettings) => {
  await setDoc(doc(db, 'families', familyId, 'config', 'settings'), settings, { merge: true });
};

// Initial Sync (LocalStorage -> Firestore) - Run once per family creation
export const syncInitialData = async (familyId: string, data: any) => {
  const batch = writeBatch(db);
  
  // Helper to batch add
  const addToBatch = (col: string, items: any[]) => {
    items.forEach(item => {
      const ref = doc(db, 'families', familyId, col, item.id || doc(collection(db, 'temp')).id);
      batch.set(ref, item);
    });
  };

  if (data.transactions) addToBatch('transactions', data.transactions);
  if (data.members) addToBatch('members', data.members);
  if (data.goals) addToBatch('goals', data.goals);
  if (data.shopping) addToBatch('shopping', data.shopping);
  if (data.categories) addToBatch('categories', data.categories);
  
  // Settings
  if (data.settings) {
    const settingsRef = doc(db, 'families', familyId, 'config', 'settings');
    batch.set(settingsRef, data.settings);
  }

  await batch.commit();
};
