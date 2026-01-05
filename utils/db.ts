
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

// --- GLOBAL RULES (SHARED KNOWLEDGE BASE) ---

export const subscribeToGlobalRules = (callback: (rules: LearnedRule[]) => void) => {
  // Subscribe to a root-level collection 'global_rules'
  // Note: Firestore Security Rules must allow read for authenticated users
  const q = query(collection(db, 'global_rules'));
  return onSnapshot(q, (snapshot) => {
    const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearnedRule));
    callback(rules);
  }, (error) => {
    console.warn("Global rules subscription failed (likely permission or offline):", error);
    callback([]); // Return empty on error to not break app
  });
};

export const addGlobalRule = async (rule: LearnedRule) => {
  // Use a sanitized keyword as ID to prevent duplicates and allow easy overwrites/merges
  const ruleId = rule.keyword.toLowerCase().trim().replace(/[\/\s\.]/g, '_');
  try {
      await setDoc(doc(db, 'global_rules', ruleId), rule);
  } catch (e) {
      console.warn("Failed to save global rule (likely permission):", e);
  }
};

// ---------------------------------------------

export const getOrInitUserFamily = async (user: FirebaseUser): Promise<string> => {
  const userRef = doc(db, 'users', user.uid);
  
  let userSnap;
  try {
      userSnap = await getDoc(userRef);
  } catch (e) {
      // Squelch permission error if user doesn't exist yet (common in strict security rules)
      console.warn("Could not read user doc, attempting creation flow...", e);
  }

  if (userSnap && userSnap.exists()) {
    const data = userSnap.data();
    const familyId = data.familyId;
    
    // Self-healing: Ensure family document actually exists
    if (familyId) {
       const familyRef = doc(db, 'families', familyId);
       // We try/catch here too just in case
       try {
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
       } catch (e) {
           console.warn("Error checking family existence:", e);
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

export const updateItemsBatch = async (familyId: string, collectionName: string, items: any[]) => {
    // Firestore batch limit is 500
    const chunkSize = 450;
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
            const docRef = doc(db, 'families', familyId, collectionName, item.id);
            const cleanItem = JSON.parse(JSON.stringify(item));
            // Using set with merge: true acts as an "Upsert". 
            // It updates if exists, creates if not. Essential for shared lists synchronization.
            batch.set(docRef, cleanItem, { merge: true });
        });
        await batch.commit();
    }
};

export const deleteItem = async (familyId: string, collectionName: string, id: string) => {
  await deleteDoc(doc(db, 'families', familyId, collectionName, id));
};

export const deleteItemsBatch = async (familyId: string, collectionName: string, ids: string[]) => {
  // Firestore batch limit is 500
  const chunkSize = 450; 
  for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(id => {
          const ref = doc(db, 'families', familyId, collectionName, id);
          batch.delete(ref);
      });
      await batch.commit();
  }
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