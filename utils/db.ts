
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
  }, (error) => {
    console.error(`Error subscribing to ${collectionName}:`, error);
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
    const data = userSnap.data();
    const familyId = data.familyId;
    
    // Self-healing: Ensure family document actually exists
    if (familyId) {
       const familyRef = doc(db, 'families', familyId);
       const familySnap = await getDoc(familyRef);
       if (!familySnap.exists()) {
           // Create missing family doc to satisfy security rules
           await setDoc(familyRef, {
               ownerId: user.uid,
               createdAt: new Date().toISOString(),
               name: 'Моя семья',
               members: [user.uid]
           });
       }
    }
    return familyId;
  } else {
    const defaultFamilyId = user.uid;
    
    // 1. Create User Link
    await setDoc(userRef, { 
      email: user.email, 
      familyId: defaultFamilyId 
    });

    // 2. Create Family Document (Critical for Security Rules)
    const familyRef = doc(db, 'families', defaultFamilyId);
    await setDoc(familyRef, {
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        name: 'Моя семья',
        members: [user.uid] // Initial member list
    });

    return defaultFamilyId;
  }
};

export const joinFamily = async (user: FirebaseUser, targetFamilyId: string) => {
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, { familyId: targetFamilyId });
  
  // Also add user to the family members list (if permissions allow, otherwise Cloud Function needed)
  // For this app, we assume security rules allow joining if you have the ID, 
  // or we might need to handle this via invite logic later.
  // Ideally: updateDoc(doc(db, 'families', targetFamilyId), { members: arrayUnion(user.uid) });
};

export const addItem = async (familyId: string, collectionName: string, item: any) => {
  const id = item.id || generateUniqueId();
  // Sanitize undefined values which Firestore hates
  const cleanItem = JSON.parse(JSON.stringify(item));
  await setDoc(doc(db, 'families', familyId, collectionName, id), { ...cleanItem, id });
};

export const addItemsBatch = async (familyId: string, collectionName: string, items: any[]) => {
  const batch = writeBatch(db);
  items.forEach(item => {
    const id = item.id || generateUniqueId();
    const docRef = doc(db, 'families', familyId, collectionName, id);
    const cleanItem = JSON.parse(JSON.stringify(item));
    batch.set(docRef, { ...cleanItem, id });
  });
  await batch.commit();
};

export const updateItem = async (familyId: string, collectionName: string, id: string, updates: any) => {
  const docRef = doc(db, 'families', familyId, collectionName, id);
  // Sanitize undefined values
  const cleanUpdates = JSON.parse(JSON.stringify(updates));
  await updateDoc(docRef, cleanUpdates);
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
  const cleanSettings = JSON.parse(JSON.stringify(settings));
  await setDoc(doc(db, 'families', familyId, 'config', 'settings'), cleanSettings, { merge: true });
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
