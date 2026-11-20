
import { 
  collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDoc, getDocFromServer,
  onSnapshot, query, orderBy, where, getDocs, writeBatch, runTransaction, arrayUnion 
} from 'firebase/firestore';
import { db } from '../firebase';
import { nextShoppingAmount } from './shoppingAmount';
import { prepareFamilyMemberInvitation, validateUnclaimedMemberRemoval, resolveFamilyJoin, mayReadInvitation } from './familyInvitation';
import { planMemberMutations, validateMemberMutation } from './memberMutations';
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
        console.log(`[DB-LOG] ${action}`, details);
    } catch (e) {
        console.error("Failed to write debug log to DB:", e);
    }
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

// Keys that are specific to the user and should not be shared across the family
const USER_SPECIFIC_KEYS: (keyof AppSettings)[] = [
    'theme', 
    'privacyMode', 
    'widgets', 
    'isPinEnabled', 
    'pinCode', 
    'enabledTabs', 
    'enabledServices', 
    'defaultBudgetMode', 
    'pushEnabled', 
    'fcmToken', 
    'showFeedbackTool', 
    'eventTemplate', 
    'shoppingTemplate', 
    'dayStartHour', 
    'dayEndHour', 
    'salaryDates', // Personal salary dates
    'telegramBotToken', // Personal bot settings
    'telegramChatId',
    'telegramApiUrl',
    'telegramState'
];

// Subscribe to both Shared Settings (Family) and User Settings (Member)
export const subscribeToAppSettings = (familyId: string, userId: string, callback: (settings: AppSettings) => void) => {
  if (!familyId || !userId) return () => {};

  let sharedSettings: Partial<AppSettings> = {};
  let userSettings: Partial<AppSettings> = {};

  const mergeAndCallback = () => {
      callback({ ...sharedSettings, ...userSettings } as AppSettings);
  };

  const unsubShared = onSnapshot(doc(db, 'families', familyId, 'config', 'settings'), (doc) => {
    if (doc.exists()) {
      sharedSettings = doc.data() as AppSettings;
      mergeAndCallback();
    }
  });

  const unsubUser = onSnapshot(doc(db, 'families', familyId, 'members', userId, 'config', 'settings'), (doc) => {
    if (doc.exists()) {
      userSettings = doc.data() as Partial<AppSettings>;
      mergeAndCallback();
    }
  });

  return () => {
      unsubShared();
      unsubUser();
  };
};

// Save settings splitting them into Shared and User buckets
export const saveAppSettings = async (familyId: string, userId: string, settings: AppSettings) => {
  if (!familyId || !userId) return;

  const sharedPart: any = {};
  const userPart: any = {};

  Object.keys(settings).forEach((key) => {
      const k = key as keyof AppSettings;
      if (USER_SPECIFIC_KEYS.includes(k)) {
          userPart[k] = settings[k];
      } else {
          sharedPart[k] = settings[k];
      }
  });

  const batch = writeBatch(db);
  
  // Update Shared
  const sharedRef = doc(db, 'families', familyId, 'config', 'settings');
  batch.set(sharedRef, sharedPart, { merge: true });

  // Update User
  const userRef = doc(db, 'families', familyId, 'members', userId, 'config', 'settings');
  batch.set(userRef, userPart, { merge: true });

  await batch.commit();
};

// Legacy support wrapper (deprecated for direct use in components)
export const saveSettings = async (familyId: string, settings: AppSettings) => {
    // This function assumes it receives the FULL settings object but doesn't know the USER ID context for splitting properly if called directly without userId.
    // However, for backward compatibility or when userId is unknown (rare), we might dump to shared. 
    // Ideally, avoid using this export and use saveAppSettings with userId.
    const sharedRef = doc(db, 'families', familyId, 'config', 'settings');
    await setDoc(sharedRef, settings, { merge: true });
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

/**
 * Create the member profile and its email invitation atomically.
 * No local success state should be shown until the batch is acknowledged.
 */
export const createFamilyMemberWithInvitation = async (
  familyId: string,
  member: FamilyMember,
  existingMembers: readonly FamilyMember[]
): Promise<void> => {
  const prepared = prepareFamilyMemberInvitation(familyId, member, existingMembers);
  // Use a batch, not a read-before-write transaction. The inviting owner
  // cannot read an invitation that does not exist under the restricted rules.
  // Invitation updates are denied in rules: if the email is already invited,
  // this entire batch is rejected and the placeholder is not created.
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'families', familyId, 'members', prepared.member.id),
    cleanForFirestore(prepared.member)
  );
  if (prepared.invitation) {
    batch.set(doc(db, 'invitations', prepared.invitation.email), {
      ...prepared.invitation, createdAt: new Date().toISOString()
    });
  }
  await batch.commit();
};

export const getPendingFamilyInvitation = async (user: FirebaseUser): Promise<{ familyId: string } | null> => {
  if (!mayReadInvitation(user)) return null;
  const email = user.email!.trim().toLowerCase();
  const invitation = await getDoc(doc(db, 'invitations', email));
  if (!invitation.exists()) return null;
  const familyId = invitation.data().familyId;
  if (typeof familyId !== 'string' || !familyId.trim()) {
    throw new Error('Некорректное приглашение в семейное пространство');
  }
  return { familyId: familyId.trim() };
};

export const checkFamilyExists = async (familyId: string): Promise<boolean> => {
    if (!familyId) return false;
    const famRef = doc(db, 'families', familyId);
    const snap = await getDoc(famRef);
    return snap.exists();
};

export const getOrInitUserFamily = async (user: FirebaseUser): Promise<string> => {
  await logDebug(user, 'getOrInitUserFamily_START', { email: user.email });

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const existingFamilyId = userSnap.exists() ? userSnap.data().familyId as string | undefined : undefined;

  // Do not switch families merely because someone created an invitation.
  // AuthContext asks the signed-in user for explicit consent before joining.

  if (existingFamilyId) return existingFamilyId;

  const defaultFamilyId = user.uid;
  const familyRef = doc(db, 'families', defaultFamilyId);
  const famSnap = await getDoc(familyRef);
  const batch = writeBatch(db);
  batch.set(userRef, {
    email: user.email,
    familyId: defaultFamilyId,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  }, { merge: true });
  if (!famSnap.exists()) {
    batch.set(familyRef, { ownerId: user.uid, name: 'Моя семья', createdAt: new Date().toISOString(), members: [user.uid] });
    const newMember: FamilyMember = { id: user.uid, userId: user.uid, name: user.displayName || 'Пользователь', color: '#007AFF', avatar: user.photoURL || undefined, isAdmin: true };
    batch.set(doc(db, 'families', defaultFamilyId, 'members', user.uid), newMember);
    batch.set(doc(db, 'families', defaultFamilyId, 'config', 'settings'), { currency: '₽', familyName: 'Моя семья' });
  }
  await batch.commit();
  return defaultFamilyId;
};

export const joinFamily = async (user: FirebaseUser, targetFamilyId: string) => {
  if (!targetFamilyId?.trim() || !user) throw new Error('ID семьи или пользователь не определены');

  const cleanFamilyId = targetFamilyId.trim();
  const familyRef = doc(db, 'families', cleanFamilyId);
  const userRef = doc(db, 'users', user.uid);
  const cleanEmail = user.email?.trim().toLowerCase();
  const inviteRef = cleanEmail ? doc(db, 'invitations', cleanEmail) : null;

  try {
    // Read the invitation, member profile and family document in the same
    // transaction that consumes the invitation and grants membership.
    // Cancelling the invitation concurrently forces a retry and cannot grant
    // access based on a stale invitation snapshot.
    await runTransaction(db, async transaction => {
      const familySnap = await transaction.get(familyRef);
      if (!familySnap.exists()) throw new Error('Семейное пространство не найдено. Проверьте ID.');

      const alreadyMember = Array.isArray(familySnap.data().members) &&
        familySnap.data().members.includes(user.uid);
      if (!alreadyMember && !mayReadInvitation(user)) {
        throw new Error('Для принятия приглашения нужен подтверждённый email. Проверьте почту и повторите вход.');
      }
      const inviteSnap = inviteRef && mayReadInvitation(user) ? await transaction.get(inviteRef) : null;
      const invitation = inviteSnap?.exists() && inviteSnap.data().familyId === cleanFamilyId
        ? inviteSnap.data() : null;
      const joinPlan = resolveFamilyJoin(familySnap.data().members, user.uid, invitation);
      const userSnap = await transaction.get(userRef);

      const memberRef = joinPlan.placeholderMemberId
        ? doc(db, 'families', cleanFamilyId, 'members', joinPlan.placeholderMemberId)
        : null;
      const memberSnap = memberRef ? await transaction.get(memberRef) : null;
      if (memberRef && !memberSnap?.exists()) {
        throw new Error('Приглашённый профиль удалён. Попросите повторное приглашение');
      }
      if (memberSnap?.exists() && memberSnap.data().userId &&
          memberSnap.data().userId !== user.uid) {
        throw new Error('Приглашённый профиль уже занят другим аккаунтом');
      }

      // No new profile is created when the UID is already a family member.
      if (joinPlan.existingMember && userSnap.exists() &&
          userSnap.data().familyId === cleanFamilyId && !invitation) return;

      transaction.update(familyRef, { members: arrayUnion(user.uid) });
      transaction.set(userRef, {
        email: user.email,
        familyId: cleanFamilyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (memberRef && memberSnap?.exists()) {
        const existing = memberSnap.data();
        const member: FamilyMember = {
          id: memberRef.id,
          userId: user.uid,
          name: existing.name || user.displayName || user.email?.split('@')[0] || 'Участник',
          color: existing.color || '#34C759',
          isAdmin: false
        };
        if (user.photoURL) member.avatar = user.photoURL;
        transaction.set(memberRef, member, { merge: true });
      }
      if (invitation && inviteRef) transaction.delete(inviteRef);
    });
  } catch (error: any) {
    console.error('Family join failed:', error);
    if (error?.code === 'permission-denied') {
      throw new Error('Доступ к семье запрещён правилами Firestore. Проверьте приглашение и права доступа.');
    }
    throw error;
  }
};

export const migrateFamilyData = async (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const collectionsToMigrate = [
        'transactions', 'shopping', 'pantry', 'events', 
        'goals', 'members', 'categories', 'rules', 
        'knowledge', 'debts', 'projects', 'loyalty', 'wishlist'
    ];

    const settingsRef = doc(db, 'families', sourceId, 'config', 'settings');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
        await setDoc(doc(db, 'families', targetId, 'config', 'settings'), settingsSnap.data());
    }

    for (const collName of collectionsToMigrate) {
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
    }
};

/**
 * Recursively cleans an object for Firestore storage:
 * - Replaces NaN or infinite numbers with 0
 * - Strips undefined fields
 * - Converts plain objects and arrays recursively
 */
export const cleanForFirestore = <T = any>(obj: T): T => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'number') {
    return (Number.isFinite(obj) ? obj : 0) as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      cleaned[key] = cleanForFirestore(value);
    }
    return cleaned;
  }
  return obj;
};

/**
 * Persist a transaction and its savings-goal adjustment in one Firestore batch.
 * Both documents commit together; the caller updates local UI only on success.
 */
export const saveTransactionWithGoal = async (
  familyId: string,
  transaction: Transaction,
  isEdit: boolean,
  goal?: SavingsGoal
) => {
  if (!familyId) throw new Error('No family ID');
  const batch = writeBatch(db);
  const txRef = doc(db, 'families', familyId, 'transactions', transaction.id);
  if (isEdit) {
    const { id: _id, ...updates } = transaction;
    batch.update(txRef, cleanForFirestore(updates));
  } else {
    batch.set(txRef, cleanForFirestore(transaction));
  }
  if (goal) {
    const goalRef = doc(db, 'families', familyId, 'goals', goal.id);
    batch.set(goalRef, cleanForFirestore(goal), { merge: true });
  }
  await batch.commit();
};

/** Delete a transaction and reverse its savings adjustment in one batch. */
export const deleteTransactionWithGoal = async (
  familyId: string,
  transactionId: string,
  goal?: SavingsGoal
) => {
  if (!familyId) throw new Error('No family ID');
  const batch = writeBatch(db);
  batch.delete(doc(db, 'families', familyId, 'transactions', transactionId));
  if (goal) {
    batch.set(doc(db, 'families', familyId, 'goals', goal.id), cleanForFirestore(goal), { merge: true });
  }
  await batch.commit();
};

/**
 * Apply a relative shopping amount change against the latest server document.
 * Firestore retries the transaction if another family member changed it meanwhile.
 */
export const adjustShoppingAmount = async (
  familyId: string,
  itemId: string,
  delta: number,
  minimum = 1
): Promise<string> => {
  if (!familyId || !itemId) throw new Error('No family or shopping item ID');
  return runTransaction(db, async transaction => {
    const ref = doc(db, 'families', familyId, 'shopping', itemId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Shopping item no longer exists');
    const amount = nextShoppingAmount(snapshot.data().amount, delta, minimum);
    transaction.update(ref, { amount });
    return amount;
  });
};

/** Move an item into the pantry atomically, avoiding duplicate or lost items on failure. */
export const moveShoppingToPantry = async (
  familyId: string, shoppingId: string, pantryItem: PantryItem
): Promise<void> => {
  if (!familyId) throw new Error('No family ID');
  const batch = writeBatch(db);
  batch.set(doc(db, 'families', familyId, 'pantry', pantryItem.id), cleanForFirestore(pantryItem));
  batch.delete(doc(db, 'families', familyId, 'shopping', shoppingId));
  await batch.commit();
};

export const addItem = async (familyId: string, collectionName: string, item: any) => {
  if (!familyId) throw new Error("No family ID");
  const id = item.id || generateUniqueId();
  const cleanItem = cleanForFirestore(item);
  const savedItem = { ...cleanItem, id };
  await setDoc(doc(db, 'families', familyId, collectionName, id), savedItem);
  return savedItem;
};

/**
 * Restore missing built-in merchant categories without ever replacing an
 * existing family's customized category document. Safe under concurrent tabs.
 */
export const createCategoriesIfMissing = async (familyId: string, categories: Category[]): Promise<number> => {
  if (!familyId || categories.length === 0) return 0;
  let created = 0;
  // Keep Firestore traffic bounded on initial login.
  for (let i = 0; i < categories.length; i += 5) {
    const batch = categories.slice(i, i + 5);
    const results = await Promise.all(batch.map(category =>
      runTransaction(db, async tx => {
        const ref = doc(db, 'families', familyId, 'categories', category.id);
        const snapshot = await tx.get(ref);
        if (snapshot.exists()) return false;
        tx.set(ref, cleanForFirestore(category));
        return true;
      })
    ));
    created += results.filter(Boolean).length;
  }
  return created;
};

/**
 * Commit the complete shopping merge in one Firestore batch.
 * Reject oversized lists instead of silently committing a partial update.
 * Repeated changes to one item are collapsed to its final value.
 */
export const saveShoppingMerge = async (
  familyId: string,
  updates: ShoppingItem[],
  additions: ShoppingItem[]
): Promise<void> => {
  if (!familyId) throw new Error('No family ID');
  const uniqueUpdates = new Map(updates.map(item => [item.id, item]));
  const uniqueAdditions = new Map(additions.map(item => [item.id, item]));
  for (const id of uniqueAdditions.keys()) uniqueUpdates.delete(id);
  const total = uniqueUpdates.size + uniqueAdditions.size;
  if (total === 0) return;
  // Firestore batch limit is 500 writes. Bound this operation to preserve all-or-nothing.
  if (total > 400) throw new Error('Слишком много товаров для одной операции (максимум 400)');
  const batch = writeBatch(db);
  for (const item of uniqueUpdates.values()) {
    if (!item.id) throw new Error('Shopping item has no ID');
    batch.update(doc(db, 'families', familyId, 'shopping', item.id), { ...cleanForFirestore(item) });
  }
  for (const item of uniqueAdditions.values()) {
    if (!item.id) throw new Error('Shopping item has no ID');
    batch.set(doc(db, 'families', familyId, 'shopping', item.id), cleanForFirestore(item));
  }
  await batch.commit();
};

export const addItemsBatch = async (familyId: string, collectionName: string, items: any[]) => {
  if (!familyId || items.length === 0) return [];
  const chunkSize = 400;
  const savedItems: any[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(item => {
      const id = item.id || generateUniqueId();
      const docRef = doc(db, 'families', familyId, collectionName, id);
      const cleanItem = cleanForFirestore(item);
      const saved = { ...cleanItem, id };
      savedItems.push(saved);
      batch.set(docRef, saved);
    });
    await batch.commit();
  }
  return savedItems;
};

/**
 * Firestore transactions provide atomic create-if-absent semantics for AlfaSync.
 * A retry never overwrites a previously categorized transaction.
 * Each document is committed independently so a partial failure can be retried.
 */
export const addAlfaItemsIdempotent = async (familyId: string, items: Transaction[]): Promise<Transaction[]> => {
  if (!familyId) throw new Error('No family ID');
  const created: Transaction[] = [];
  for (const item of items) {
    if (!/^alfa_[a-f0-9]{40}$/.test(item.id)) throw new Error('Invalid Alfa transaction ID');
    const ref = doc(db, 'families', familyId, 'transactions', item.id);
    const wasCreated = await runTransaction(db, async tx => {
      const existing = await tx.get(ref);
      if (existing.exists()) return false;
      tx.set(ref, cleanForFirestore(item));
      return true;
    });
    if (wasCreated) created.push(item);
  }
  return created;
};

/** Verify an all-duplicate statement against the server before acknowledging cleanup. */
export const areAlfaItemsSavedOnServer = async (familyId: string, ids: string[]): Promise<boolean> => {
  if (!familyId || ids.length === 0) return false;
  for (const id of ids) {
    if (!/^alfa_[a-f0-9]{40}$/.test(id)) return false;
  }
  for (let i = 0; i < ids.length; i += 12) {
    const chunk = ids.slice(i, i + 12);
    const snapshots = await Promise.all(chunk.map(id =>
      getDocFromServer(doc(db, 'families', familyId, 'transactions', id))
    ));
    if (snapshots.some(snapshot => !snapshot.exists())) return false;
  }
  return true;
};

export const updateItem = async (familyId: string, collectionName: string, id: string, updates: any) => {
  if (!familyId) return;
  const docRef = doc(db, 'families', familyId, collectionName, id);
  const cleanUpdates = cleanForFirestore(updates);
  await updateDoc(docRef, cleanUpdates);
};

/**
 * Persist only changed family-member fields against fresh Firestore snapshots.
 * A conflicting same-field edit or concurrent account claim aborts the whole transaction.
 */
/**
 * Remove an unclaimed profile together with its pending email invitation.
 * Rechecks the actual member document to avoid deleting a profile claimed on another device.
 */
export const deleteUnclaimedFamilyMember = async (familyId: string, memberId: string): Promise<void> => {
  if (!familyId || !memberId) throw new Error('Семья или участник не определены');
  await runTransaction(db, async transaction => {
    const memberRef = doc(db, 'families', familyId, 'members', memberId);
    const memberSnap = await transaction.get(memberRef);
    if (!memberSnap.exists()) throw new Error('Профиль участника уже удалён');
    const member = { ...memberSnap.data(), id: memberSnap.id } as FamilyMember;
    const inviteEmail = member.email?.trim().toLowerCase();
    const inviteRef = inviteEmail ? doc(db, 'invitations', inviteEmail) : null;
    const inviteSnap = inviteRef ? await transaction.get(inviteRef) : null;
    const deleteInvite = validateUnclaimedMemberRemoval(
      familyId, member, inviteSnap?.exists() ? inviteSnap.data() : null
    );
    transaction.delete(memberRef);
    if (deleteInvite && inviteRef) transaction.delete(inviteRef);
  });
};

export const updateFamilyMemberProfiles = async (
  familyId: string,
  previous: readonly FamilyMember[],
  updated: readonly FamilyMember[],
  requesterUid: string | null,
  requesterEmail?: string | null
): Promise<void> => {
  if (!familyId || !requesterUid) throw new Error('Семейный аккаунт недоступен');
  const changes = planMemberMutations(previous, updated);
  if (!changes.length) return;
  await runTransaction(db, async transaction => {
    const refs = changes.map(change => doc(db, 'families', familyId, 'members', change.id));
    // Firestore requires all reads to complete before any write.
    const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
    changes.forEach((change, index) => {
      const snapshot = snapshots[index];
      if (!snapshot.exists()) throw new Error('Профиль больше не существует. Обновите список участников');
      const live = { ...snapshot.data(), id: snapshot.id } as FamilyMember;
      const fields = validateMemberMutation(change, live, requesterUid, requesterEmail);
      transaction.update(refs[index], { ...cleanForFirestore(fields) });
    });
  });
};

export const updateItemsBatch = async (familyId: string, collectionName: string, items: any[]) => {
    if (!familyId || items.length === 0) return;
    const chunkSize = 450;
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
            const docRef = doc(db, 'families', familyId, collectionName, item.id);
            const cleanItem = cleanForFirestore(item);
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

/**
 * Атомарный перевод средств между счетами и сохранение транзакции
 */
export const executeAtomicTransfer = async (
  familyId: string,
  transferTransaction: Transaction,
  updatedAccounts?: { sourceId: string; sourceBalance: number; destId: string; destBalance: number }
) => {
  if (!familyId) throw new Error("No family ID");
  const batch = writeBatch(db);
  
  const txId = transferTransaction.id || generateUniqueId();
  const txRef = doc(db, 'families', familyId, 'transactions', txId);
  const cleanTx = cleanForFirestore({ ...transferTransaction, id: txId });
  batch.set(txRef, cleanTx);

  if (updatedAccounts) {
    const sourceRef = doc(db, 'families', familyId, 'accounts', updatedAccounts.sourceId);
    batch.set(sourceRef, { balance: updatedAccounts.sourceBalance }, { merge: true });

    const destRef = doc(db, 'families', familyId, 'accounts', updatedAccounts.destId);
    batch.set(destRef, { balance: updatedAccounts.destBalance }, { merge: true });
  }

  await batch.commit();
  return { ...cleanTx, id: txId };
};
