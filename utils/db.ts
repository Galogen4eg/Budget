import { 
  collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, query, orderBy, where, getDocs, writeBatch, arrayUnion 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, AppSettings, FamilyMember, SavingsGoal, ShoppingItem, FamilyEvent, Subscription, Debt, PantryItem, MeterReading, LoyaltyCard, LearnedRule, Category } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

export const generateUniqueId = () => {
  return uuidv4();
};

export const logDebug = async (user: FirebaseUser | null, action: string, details: any = null, type: 'info' | 'error' = 'info') => {
    try {
        const logRef = collection(db, 'system_logs');
        await addDoc(logRef, {
            timestamp: new Date().toISOString(),
            uid: user?.uid || 'anonymous',
            email: user?.email || 'no-email',
            action,
            details: typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details),
            type,
            userAgent: navigator.userAgent
        });
    } catch (e) {
        console.error("Failed to write debug log to DB:", e);
    }
};

export const subscribeToCollection = (familyId: string, collectionName: string, callback: (data: any[]) => void, onError?: (error: any) => void) => {
  if (!familyId) return () => {};
  const q = query(collection(db, 'families', familyId, collectionName));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => {
    console.error(`Error subscribing to ${collectionName}:`, error);
    if (onError) onError(error);
  });
};

// Подписка на персональные настройки пользователя с обработкой ошибок
export const subscribeToSettings = (userId: string, callback: (settings: AppSettings | null) => void, onError?: (error: any) => void) => {
  if (!userId) return () => {};
  return onSnapshot(doc(db, 'users', userId, 'config', 'settings'), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as AppSettings);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error subscribing to settings:", error);
    if (onError) onError(error);
  });
};

// Функция для получения старых настроек семьи (безопасно)
export const getLegacyFamilySettings = async (familyId: string): Promise<AppSettings | null> => {
    if (!familyId) return null;
    try {
        const docRef = doc(db, 'families', familyId, 'config', 'settings');
        const snap = await getDoc(docRef);
        return snap.exists() ? (snap.data() as AppSettings) : null;
    } catch (e) {
        console.warn("Could not fetch legacy settings (likely permission denied):", e);
        return null;
    }
};

export const subscribeToGlobalRules = (callback: (rules: LearnedRule[]) => void) => {
  const q = query(collection(db, 'global_rules'));
  return onSnapshot(q, (snapshot) => {
    const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearnedRule));
    callback(rules);
  }, (error) => {
    console.warn("Global rules subscription failed:", error);
    callback([]);
  });
};

export const addGlobalRule = async (rule: LearnedRule) => {
  const ruleId = rule.keyword.toLowerCase().trim().replace(/[\/\s\.]/g, '_');
  try {
      await setDoc(doc(db, 'global_rules', ruleId), rule);
  } catch (e) {
      console.warn("Failed to save global rule:", e);
  }
};

export const createInvitation = async (familyId: string, email: string, memberId: string) => {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    await setDoc(doc(db, 'invitations', cleanEmail), {
        familyId,
        placeholderMemberId: memberId,
        email: cleanEmail,
        createdAt: new Date().toISOString()
    });
};

export const checkFamilyExists = async (familyId: string): Promise<boolean> => {
    if (!familyId) return false;
    try {
        const famRef = doc(db, 'families', familyId);
        const snap = await getDoc(famRef);
        return snap.exists();
    } catch (e) {
        return false;
    }
};

export const getOrInitUserFamily = async (user: FirebaseUser): Promise<string> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.familyId) return data.familyId;
  }

  // Проверка приглашений
  if (user.email) {
      const cleanEmail = user.email.toLowerCase().trim();
      try {
          const inviteRef = doc(db, 'invitations', cleanEmail);
          const inviteSnap = await getDoc(inviteRef);
          
          if (inviteSnap.exists()) {
              const inviteData = inviteSnap.data();
              const batch = writeBatch(db);
              batch.set(userRef, { email: user.email, familyId: inviteData.familyId, updatedAt: new Date().toISOString() }, { merge: true });
              if (inviteData.placeholderMemberId) {
                  const memberRef = doc(db, 'families', inviteData.familyId, 'members', inviteData.placeholderMemberId);
                  batch.set(memberRef, { userId: user.uid, avatar: user.photoURL || null }, { merge: true });
              }
              const famRef = doc(db, 'families', inviteData.familyId);
              batch.update(famRef, { members: arrayUnion(user.uid) });
              batch.delete(inviteRef);
              await batch.commit();
              return inviteData.familyId;
          }
      } catch (e: any) {
          console.error("Invite processing failed", e);
      }
  }

  // Создание новой семьи по умолчанию
  const defaultFamilyId = user.uid;
  await setDoc(userRef, {
      email: user.email,
      familyId: defaultFamilyId,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
  }, { merge: true });

  const familyRef = doc(db, 'families', defaultFamilyId);
  const famSnap = await getDoc(familyRef);
  if (!famSnap.exists()) {
      const batch = writeBatch(db);
      batch.set(familyRef, { ownerId: user.uid, name: 'Моя семья', createdAt: new Date().toISOString(), members: [user.uid] });
      const newMember: FamilyMember = { id: user.uid, userId: user.uid, name: user.displayName || 'Пользователь', color: '#007AFF', avatar: user.photoURL || undefined, isAdmin: true };
      batch.set(doc(db, 'families', defaultFamilyId, 'members', user.uid), newMember);
      await batch.commit();
  }

  return defaultFamilyId;
};

export const joinFamily = async (user: FirebaseUser, targetFamilyId: string) => {
  if (!targetFamilyId || !user) throw new Error("ID семьи или пользователь не определены");
  
  const cleanFamilyId = targetFamilyId.trim();
  const userRef = doc(db, 'users', user.uid);
  const familyRef = doc(db, 'families', cleanFamilyId);
  const memberRef = doc(db, 'families', cleanFamilyId, 'members', user.uid);

  try {
    await setDoc(userRef, { familyId: cleanFamilyId, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e: any) {
    console.error("Failed to update user profile familyId:", e);
    throw new Error("Не удалось обновить ваш профиль.");
  }

  try {
    const familySnap = await getDoc(familyRef);
    const batch = writeBatch(db);

    if (!familySnap.exists()) {
        batch.set(familyRef, { 
            ownerId: user.uid, 
            name: 'Семья ' + cleanFamilyId, 
            createdAt: new Date().toISOString(), 
            members: [user.uid] 
        });
    } else {
        batch.update(familyRef, { members: arrayUnion(user.uid) });
    }

    const newMember: FamilyMember = {
        id: user.uid,
        userId: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Участник',
        color: '#34C759', 
        isAdmin: !familySnap.exists()
    };
    if (user.photoURL) newMember.avatar = user.photoURL;
    
    batch.set(memberRef, newMember, { merge: true });

    await batch.commit();
  } catch (e: any) {
    if (e.code === 'permission-denied') {
        throw new Error("Доступ к этой семье запрещен. Попросите администратора добавить ваш Email.");
    }
    throw e;
  }
};

export const migrateFamilyData = async (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const collectionsToMigrate = [
        'transactions', 'shopping', 'pantry', 'events', 
        'goals', 'members', 'categories', 'rules', 
        'knowledge', 'debts', 'projects', 'loyalty', 'wishlist'
    ];

    for (const collName of collectionsToMigrate) {
        try {
            const sourceColl = collection(db, 'families', sourceId, collName);
            const snapshot = await getDocs(sourceColl);
            
            if (snapshot.empty) continue;

            const docs = snapshot.docs;
            for (let i = 0; i < docs.length; i += 450) {
                const batch = writeBatch(db);
                const chunk = docs.slice(i, i + 450);
                
                chunk.forEach(d => {
                    const targetRef = doc(db, 'families', targetId, collName, d.id);
                    batch.set(targetRef, d.data());
                });
                
                await batch.commit();
            }
        } catch (e) {
            console.warn(`Migration failed for collection ${collName}:`, e);
        }
    }
};

export const addItem = async (familyId: string, collectionName: string, item: any) => {
  if (!familyId) throw new Error("No family ID");
  const id = item.id || generateUniqueId();
  const cleanItem = JSON.parse(JSON.stringify(item));
  await setDoc(doc(db, 'families', familyId, collectionName, id), { ...cleanItem, id });
};

export const addItemsBatch = async (familyId: string, collectionName: string, items: any[]) => {
  if (!familyId || items.length === 0) return;
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
  if (!familyId) return;
  const docRef = doc(db, 'families', familyId, collectionName, id);
  const cleanUpdates = JSON.parse(JSON.stringify(updates));
  await updateDoc(docRef, cleanUpdates);
};

export const updateItemsBatch = async (familyId: string, collectionName: string, items: any[]) => {
    if (!familyId || items.length === 0) return;
    const chunkSize = 450;
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
            const docRef = doc(db, 'families', familyId, collectionName, item.id);
            const cleanItem = JSON.parse(JSON.stringify(item));
            batch.set(docRef, cleanItem, { merge: true });
        });
        await batch.commit();
    }
};

export const deleteItem = async (familyId: string, collectionName: string, id: string) => {
  if (!familyId) return;
  await deleteDoc(doc(db, 'families', familyId, collectionName, id));
};

export const deleteItemsBatch = async (familyId: string, collectionName: string, ids: string[]) => {
  if (!familyId || ids.length === 0) return;
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

// Сохранение в документ пользователя
export const saveSettings = async (userId: string, settings: AppSettings) => {
  if (!userId) return;
  const cleanSettings = JSON.parse(JSON.stringify(settings));
  await setDoc(doc(db, 'users', userId, 'config', 'settings'), cleanSettings, { merge: true });
};