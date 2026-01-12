
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

// --- INVITATIONS SYSTEM ---

export const createInvitation = async (familyId: string, email: string, memberId: string) => {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    // Using email as doc ID for easy lookup
    await setDoc(doc(db, 'invitations', cleanEmail), {
        familyId,
        placeholderMemberId: memberId,
        createdAt: new Date().toISOString()
    });
};

// ---------------------------------------------

export const getOrInitUserFamily = async (user: FirebaseUser): Promise<string> => {
  const userRef = doc(db, 'users', user.uid);
  let familyId: string = user.uid; // Безопасный фоллбэк по умолчанию

  try {
      // 1. Попытка прочитать профиль пользователя
      try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
              const userData = userSnap.data();
              if (userData.familyId) {
                  familyId = userData.familyId;
              }
          }
      } catch (readError: any) {
          console.warn("Could not read user profile (permission or network), using UID as Family ID:", readError);
      }

      // --- CHECK FOR INVITATIONS (BY EMAIL) ---
      // Проверяем приглашения, если familyId == uid (значит, пользователь еще не в семье)
      // ИЛИ мы хотим проверить, нет ли нового приглашения (можно убрать условие familyId === user.uid, если хотим позволить менять семью)
      if (user.email) {
          try {
              const cleanEmail = user.email.toLowerCase().trim();
              // Оборачиваем чтение приглашения, так как прав может не быть
              const inviteSnap = await getDoc(doc(db, 'invitations', cleanEmail));
              
              if (inviteSnap.exists()) {
                  const inviteData = inviteSnap.data();
                  if (inviteData.familyId && inviteData.placeholderMemberId) {
                      console.log("Found invitation for email:", cleanEmail, "Target Family:", inviteData.familyId);
                      
                      // CRITICAL FIX: Не используем один большой batch.
                      // Если прав на удаление invite нет, то вся операция упадет.
                      // Сначала обновляем профиль пользователя - это самое важное.
                      
                      try {
                          // 1. Обновляем профиль пользователя (Join Family)
                          await setDoc(userRef, { 
                              email: user.email, 
                              familyId: inviteData.familyId,
                              lastLogin: new Date().toISOString()
                          }, { merge: true });
                          
                          // Если успешно, обновляем локальную переменную
                          familyId = inviteData.familyId;

                          // 2. Пытаемся привязать участника (Link Member)
                          try {
                              const memberRef = doc(db, 'families', inviteData.familyId, 'members', inviteData.placeholderMemberId);
                              await updateDoc(memberRef, {
                                  userId: user.uid,
                                  avatar: user.photoURL || undefined
                              });
                          } catch (memErr) {
                              console.warn("Could not link member doc (permission denied?):", memErr);
                          }

                          // 3. Пытаемся обновить родительский массив (Update Parent Array)
                          try {
                              const familyRef = doc(db, 'families', inviteData.familyId);
                              await updateDoc(familyRef, {
                                  members: arrayUnion(user.uid)
                              });
                          } catch (parentErr) {
                              console.warn("Could not update parent members array:", parentErr);
                          }

                          // 4. Пытаемся удалить приглашение (Delete Invite)
                          try {
                              await deleteDoc(doc(db, 'invitations', cleanEmail));
                          } catch (delErr) {
                              console.warn("Could not delete invitation (permission denied):", delErr);
                          }

                          // Возвращаем ID семьи сразу после успешного обновления профиля
                          return inviteData.familyId;

                      } catch (profileErr) {
                          console.error("Failed to update user profile with invitation:", profileErr);
                          // Если не удалось обновить профиль, значит мы не вступили.
                          // Продолжаем выполнение (создастся новая семья или вернется uid)
                      }
                  }
              }
          } catch (inviteError) {
              console.warn("Error checking invitations or permissions:", inviteError);
          }
      }

      // 2. Попытка обновить/создать профиль (идемпотентно), если приглашения не сработало
      try {
          await setDoc(userRef, { 
              email: user.email, 
              familyId: familyId,
              lastLogin: new Date().toISOString()
          }, { merge: true });
      } catch (writeError: any) {
          console.warn("Could not update user profile (likely permission denied for merge):", writeError);
      }

      // 3. Инициализация семьи, если это мой личный ID и семьи нет
      const familyRef = doc(db, 'families', familyId);
      
      try {
          // Пытаемся проверить существование семьи
          const familySnap = await getDoc(familyRef);

          if (!familySnap.exists()) {
              // Если семьи нет (первый вход в свою семью), создаем её
              const newMember: FamilyMember = {
                  id: user.uid,
                  userId: user.uid,
                  name: user.displayName || 'Пользователь',
                  color: '#007AFF',
                  avatar: user.photoURL || undefined,
                  isAdmin: true
              };
              if (!newMember.avatar) delete newMember.avatar;

              const batch = writeBatch(db);
              batch.set(familyRef, {
                  ownerId: user.uid,
                  createdAt: new Date().toISOString(),
                  name: 'Моя семья',
                  members: [user.uid]
              });
              batch.set(doc(db, 'families', familyId, 'members', user.uid), newMember);
              await batch.commit();
              
              console.log("Family initialized successfully:", familyId);
          }
      } catch (famError: any) {
          console.warn("Family init check failed (non-critical, maybe joined another family):", famError);
      }

      return familyId;

  } catch (e) {
      console.error("Critical Error in getOrInitUserFamily (Recovered):", e);
      return user.uid; 
  }
};

export const joinFamily = async (user: FirebaseUser, targetFamilyId: string) => {
  if (!targetFamilyId || !user) throw new Error("Invalid params for joinFamily");
  
  const cleanFamilyId = targetFamilyId.trim();
  const userRef = doc(db, 'users', user.uid);
  const memberRef = doc(db, 'families', cleanFamilyId, 'members', user.uid);
  const familyRef = doc(db, 'families', cleanFamilyId);

  const newMember: FamilyMember = {
      id: user.uid,
      userId: user.uid,
      name: user.displayName || 'Новый участник',
      color: '#34C759', 
      isAdmin: false
  };

  if (user.photoURL) {
      newMember.avatar = user.photoURL;
  }

  // При ручном входе (по ссылке) мы всё еще используем batch для атомарности создания профиля и мембера
  // Но если это падает, пробуем по частям
  try {
      const batch = writeBatch(db);
      batch.set(userRef, { 
          familyId: cleanFamilyId,
          email: user.email,
          updatedAt: new Date().toISOString()
      }, { merge: true });
      batch.set(memberRef, newMember);
      await batch.commit();
      console.log("Successfully joined family via batch write");
  } catch (e: any) {
      console.error("Batch join failed, trying fallback:", e);
      // Fallback: Just update profile. Hopefully user can be added later or rules allow reading.
      await setDoc(userRef, { familyId: cleanFamilyId }, { merge: true });
  }

  try {
      await updateDoc(familyRef, {
          members: arrayUnion(user.uid)
      });
  } catch (e) {
      console.warn("Non-critical: Could not update parent members array.", e);
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
