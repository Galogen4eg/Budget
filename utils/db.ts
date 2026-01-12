
import { 
  collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, query, orderBy, where, getDocs, writeBatch, arrayUnion 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, AppSettings, FamilyMember, SavingsGoal, ShoppingItem, FamilyEvent, Subscription, Debt, PantryItem, MeterReading, LoyaltyCard, LearnedRule, Category } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';

// Helper for generating truly unique IDs
export const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export const subscribeToCollection = (familyId: string, collectionName: string, callback: (data: any[]) => void) => {
  if (!familyId) return () => {};
  const q = query(collection(db, 'families', familyId, collectionName));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => {
    console.error(`Error subscribing to ${collectionName}:`, error);
  });
};

export const subscribeToSettings = (familyId: string, callback: (settings: AppSettings) => void) => {
  if (!familyId) return () => {};
  return onSnapshot(doc(db, 'families', familyId, 'config', 'settings'), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as AppSettings);
    }
  });
};

// --- GLOBAL RULES (SHARED KNOWLEDGE BASE) ---

export const subscribeToGlobalRules = (callback: (rules: LearnedRule[]) => void) => {
  const q = query(collection(db, 'global_rules'));
  return onSnapshot(q, (snapshot) => {
    const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearnedRule));
    callback(rules);
  }, (error) => {
    console.warn("Global rules subscription failed (likely permission or offline):", error);
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

// ---------------------------------------------

export const getOrInitUserFamily = async (user: FirebaseUser): Promise<string> => {
  const userRef = doc(db, 'users', user.uid);
  
  try {
      const userSnap = await getDoc(userRef);
      let familyId: string | null = null;

      // 1. Проверяем, есть ли запись о пользователе
      if (userSnap.exists()) {
          const userData = userSnap.data();
          familyId = userData.familyId;
      }

      // Если familyId нет, используем UID как ID новой семьи
      if (!familyId) {
          familyId = user.uid;
          // Создаем/Обновляем запись пользователя
          await setDoc(userRef, { 
              email: user.email, 
              familyId: familyId 
          }, { merge: true });
      }

      // 2. КРИТИЧНО: Проверяем, существует ли сама Семья в базе
      const familyRef = doc(db, 'families', familyId);
      const familySnap = await getDoc(familyRef);

      if (!familySnap.exists()) {
          // Если семьи нет (первый вход или сбой), создаем её структуру
          const newMember: FamilyMember = {
              id: user.uid, // Важно: используем UID как ID участника для связи
              userId: user.uid,
              name: user.displayName || 'Пользователь',
              color: '#007AFF',
              avatar: user.photoURL || undefined,
              isAdmin: true
          };

          await setDoc(familyRef, {
              ownerId: user.uid,
              createdAt: new Date().toISOString(),
              name: 'Моя семья',
              members: [user.uid] // Массив ID для правил безопасности
          });

          // Сразу добавляем участника в коллекцию members
          await setDoc(doc(db, 'families', familyId, 'members', user.uid), newMember);
          
          console.log("Family initialized successfully:", familyId);
      }

      return familyId;

  } catch (e) {
      console.error("Critical Error in getOrInitUserFamily:", e);
      throw e; // Пробрасываем ошибку, чтобы AuthContext знал о проблеме
  }
};

export const joinFamily = async (user: FirebaseUser, targetFamilyId: string) => {
  const userRef = doc(db, 'users', user.uid);
  const familyRef = doc(db, 'families', targetFamilyId);
  const memberRef = doc(db, 'families', targetFamilyId, 'members', user.uid);

  // 1. Сразу записываем пользователя в подколлекцию members
  // Используем setDoc, так как он работает даже если родительский документ недоступен для чтения
  const newMember: FamilyMember = {
      id: user.uid,
      userId: user.uid,
      name: user.displayName || 'Новый участник',
      color: '#34C759', // Default green for new members
      avatar: user.photoURL || undefined,
      isAdmin: false
  };
  
  // Пытаемся записать участника. Это самое важное действие для правил безопасности.
  await setDoc(memberRef, newMember, { merge: true });

  // 2. Обновляем указатель у пользователя
  await updateDoc(userRef, { familyId: targetFamilyId });

  // 3. Пытаемся обновить массив members в документе семьи (для оптимизации правил)
  // Оборачиваем в try/catch, так как правила могут запрещать updateDoc родителя для новых участников,
  // но разрешать setDoc в подколлекцию members/{uid}.
  try {
      await updateDoc(familyRef, {
          members: arrayUnion(user.uid)
      });
  } catch (e) {
      console.warn("Could not update members array (likely permission issue), but member doc created.", e);
      // Игнорируем эту ошибку, так как шаг 1 и 2 прошли успешно, и UI будет работать через подколлекцию.
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

export const saveSettings = async (familyId: string, settings: AppSettings) => {
  if (!familyId) return;
  const cleanSettings = JSON.parse(JSON.stringify(settings));
  await setDoc(doc(db, 'families', familyId, 'config', 'settings'), cleanSettings, { merge: true });
};
