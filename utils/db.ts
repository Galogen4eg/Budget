
import { 
  collection, doc, setDoc, addDoc, updateDoc, deleteDoc, deleteField, getDoc, getDocFromServer,
  onSnapshot, query, orderBy, where, getDocs, getDocsFromServer, writeBatch, runTransaction, arrayUnion 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { nextShoppingAmount } from './shoppingAmount';
import { savingsContributionKopecks, nextSavingsGoalAmount } from './transactionSavingsConsistency';
import { assertCalendarVersion, markOccurrenceSkipped } from './familyPlanEngine';
import { preparePantryMove } from './pantryMove';
import { assertBudgetPolicyOwner } from './familyBudgetPolicy';
import { prepareFamilyMemberInvitation, resolveFamilyJoinProfile, assertUnusedFamilyProfile } from './familyInvitation';
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
    'startTab', 
    'enabledServices', 
    'defaultBudgetMode',
    'personalInitialBalance',
    'personalInitialBalanceDate',
    'personalSavingsRate',
    'personalMonthlyBudget',
    'personalCategoryBudgets',
    'personalIgnoredDuplicatePairs',
    'personalEnableSmartReserve',
    'personalStartOfMonthDay',
    'personalMandatoryExpenses',
    'personalManualPaidExpenses',
    'personalManualReservedAmount', 
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
  let sharedReady=false,userReady=false;
  const selectKeys=(value:Record<string,unknown>,personal:boolean)=>Object.fromEntries(Object.entries(value).filter(([key])=>USER_SPECIFIC_KEYS.includes(key as keyof AppSettings)===personal)) as Partial<AppSettings>;

  const mergeAndCallback = () => {
      if(sharedReady&&userReady)callback({ ...sharedSettings, ...userSettings } as AppSettings);
  };

  const unsubShared = onSnapshot(doc(db, 'families', familyId, 'config', 'settings'), {includeMetadataChanges:true}, (doc) => {
    if(doc.metadata.fromCache&&!sharedReady)return;
    sharedReady=true;
    sharedSettings=selectKeys(doc.data()??{},false);
    mergeAndCallback();
  },()=>{sharedReady=false;});

  const unsubUser = onSnapshot(doc(db, 'families', familyId, 'members', userId, 'config', 'settings'), {includeMetadataChanges:true}, (doc) => {
    if(doc.metadata.fromCache&&!userReady)return;
    userReady=true;
    userSettings=selectKeys(doc.data()??{},true);
    mergeAndCallback();
  },()=>{userReady=false;});

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

/**
 * Commit only changed setting keys. Never resend the entire shared settings
 * document from a potentially stale family member snapshot.
 */
export const saveAppSettingsPatch = async (
  familyId: string, userId: string, changes: Partial<AppSettings>
) => {
  if (!familyId || !userId) throw new Error('Family or user ID is missing');
  const sharedPart: Record<string, unknown> = {};
  const userPart: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    (USER_SPECIFIC_KEYS.includes(key as keyof AppSettings) ? userPart : sharedPart)[key] = value;
  }
  const batch = writeBatch(db);
  if (Object.keys(sharedPart).length) {
    batch.set(doc(db,'families',familyId,'config','settings'),cleanForFirestore(sharedPart),{merge:true});
  }
  if (Object.keys(userPart).length) {
    batch.set(doc(db,'families',familyId,'members',userId,'config','settings'),cleanForFirestore(userPart),{merge:true});
  }
  if (Object.keys(sharedPart).length || Object.keys(userPart).length) await batch.commit();
};

/**
 * Atomically store shared mandatory obligations and their linked debt state.
 * Missing debt documents abort the whole commit. No optimistic UI update.
 */
export const commitMandatoryPaymentBundle = async (
  familyId: string,
  userId: string,
  changes: Pick<AppSettings, 'mandatoryExpenses' | 'manualPaidExpenses'>,
  debtChanges: ReadonlyArray<{id: string; changes: Partial<Debt>}>
): Promise<void> => {
  if (!familyId || !userId) throw new Error('Family or user ID is missing');
  const uniqueIds = new Set<string>();
  for (const item of debtChanges) {
    if (!item.id || uniqueIds.has(item.id)) throw new Error('Invalid or duplicate debt ID');
    uniqueIds.add(item.id);
  }
  const configRef = doc(db, 'families', familyId, 'config', 'settings');
  await runTransaction(db, async transaction => {
    const debtRefs = debtChanges.map(item => doc(db,'families',familyId,'debts',item.id));
    // Firestore transactions require every read to occur before any write.
    const existingDebts = await Promise.all(debtRefs.map(ref => transaction.get(ref)));
    for (let i=0; i<existingDebts.length; i++) {
      if (!existingDebts[i].exists()) throw new Error('Связанный долг удалён. Обновите данные и повторите.');
    }
    transaction.set(configRef, cleanForFirestore(changes), {merge: true});
    for (let i=0; i<debtChanges.length; i++) {
      transaction.update(debtRefs[i],cleanForFirestore(debtChanges[i].changes));
    }
  });
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
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'families', familyId, 'members', prepared.member.id),
    cleanForFirestore(prepared.member)
  );
  if (prepared.invitation) {
    batch.set(
      doc(db, 'invitations', prepared.invitation.email),
      { ...prepared.invitation, createdAt: new Date().toISOString() }
    );
  }
  await batch.commit();
};

export const getPendingFamilyInvitation = async (user: FirebaseUser): Promise<{ familyId: string } | null> => {
  if (!user.email||!user.emailVerified) return null;
  const email = user.email.trim().toLowerCase();
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
  if (!targetFamilyId || !user) throw new Error('ID семьи или пользователь не определены');

  const cleanFamilyId = targetFamilyId.trim();
  await user.reload();
  await user.getIdToken(true);
  const familyRef = doc(db, 'families', cleanFamilyId);
  const userRef = doc(db, 'users', user.uid);

  // Do not silently create a new empty family when a join code is mistyped.
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) throw new Error('Семейное пространство не найдено. Проверьте ID.');

  const cleanEmail = user.email?.toLowerCase().trim();
  const inviteRef = cleanEmail&&user.emailVerified ? doc(db, 'invitations', cleanEmail) : null;
  const inviteSnap = inviteRef ? await getDoc(inviteRef) : null;
  const invitation = inviteSnap?.exists() && inviteSnap.data().familyId === cleanFamilyId
    ? inviteSnap.data() : null;

  // An arbitrary family ID is not an invitation. Existing members may rejoin;
  // new members must have an invitation addressed to their signed-in email.
  const isExistingMember = Array.isArray(familySnap.data().members) &&
    familySnap.data().members.includes(user.uid);
  if (!invitation && !isExistingMember) {
    if(!user.emailVerified)throw new Error('Подтвердите email перед присоединением к семье');
    throw new Error('Для присоединения требуется приглашение на email этого аккаунта.');
  }

  // Reuse the placeholder created when the invitation was issued.
  const memberCandidates:FamilyMember[]=[];
  if(isExistingMember){
    const linked=await getDocs(query(collection(db,'families',cleanFamilyId,'members'),where('userId','==',user.uid)));
    memberCandidates.push(...linked.docs.map(s=>({...s.data(),id:s.id} as FamilyMember)));
  }
  if(invitation){
    if(typeof invitation.placeholderMemberId!=='string'||!invitation.placeholderMemberId)throw new Error('Некорректное приглашение');
    const invited=await getDoc(doc(db,'families',cleanFamilyId,'members',invitation.placeholderMemberId));
    if(invited.exists()&&!memberCandidates.some(m=>m.id===invited.id))memberCandidates.push({...invited.data(),id:invited.id} as FamilyMember);
  }
  const selected=resolveFamilyJoinProfile(memberCandidates,user.uid,invitation?.placeholderMemberId||null);
  const memberId=selected.id;
  const memberRef=doc(db,'families',cleanFamilyId,'members',memberId);
  const batch = writeBatch(db);

  batch.update(familyRef, { members: arrayUnion(user.uid) });
  batch.set(userRef, {
    email: user.email,
    familyId: cleanFamilyId,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  const member: FamilyMember = {
    id: memberId,
    userId: user.uid,
    name: selected.name || user.displayName || 'Участник',
    color: selected.color || '#34C759',
    isAdmin: Boolean(selected.isAdmin || familySnap.data().ownerId===user.uid)
  };
  if (user.photoURL) member.avatar = user.photoURL;
  batch.set(memberRef, member, { merge: true });
  if (invitation && inviteRef) batch.delete(inviteRef);

  try {
    // All membership writes succeed together, or none is applied.
    await batch.commit();
  } catch (e: any) {
    console.error('Family join failed:', e);
    if (e.code === 'permission-denied') {
      throw new Error('Доступ к семье запрещён правилами Firestore. Проверьте приглашение и права доступа.');
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
 * Saving a transaction and its savings-account contribution must use the latest
 * Firestore documents. runTransaction retries if another family member edits
 * the same transaction or savings goal concurrently.
 */
export const saveTransactionWithGoal = async (
  familyId: string, transaction: Transaction, isEdit: boolean, goal?: SavingsGoal
) => {
  if (!familyId) throw new Error('No family ID');
  const txRef=doc(db,'families',familyId,'transactions',transaction.id);
  await runTransaction(db,async tx=>{
    const saved=await tx.get(txRef);
    if(isEdit && !saved.exists())throw new Error('Операция была удалена другим пользователем');
    if(!isEdit && saved.exists())throw new Error('Операция уже существует');
    const previous=saved.exists()?saved.data() as Transaction:null;
    const before=savingsContributionKopecks(previous);
    const after=savingsContributionKopecks(transaction);
    const previousGoalId=previous?.linkedGoalId || (before!==0?goal?.id:undefined);
    const nextGoalId=transaction.linkedGoalId || (after!==0?goal?.id:undefined);
    if(before!==0&&!previousGoalId)throw new Error('Не удалось определить накопительную цель предыдущей операции');
    if(after!==0&&!nextGoalId)throw new Error('Для перевода в накопления необходимо выбрать цель');
    const adjustments=new Map<string,number>();
    if(previousGoalId&&before)adjustments.set(previousGoalId,-before);
    if(nextGoalId&&after)adjustments.set(nextGoalId,(adjustments.get(nextGoalId)||0)+after);
    const goalSnapshots=await Promise.all([...adjustments.keys()].map(async goalId=>{
      const ref=doc(db,'families',familyId,'goals',goalId);
      return {goalId,ref,snapshot:await tx.get(ref)};
    }));
    for(const {goalId,ref,snapshot} of goalSnapshots){
      const delta=adjustments.get(goalId)!;
      if(delta===0)continue;
      if(!snapshot.exists()){
        if(!goal||goal.id!==goalId||delta<0)throw new Error('Накопительная цель удалена другим пользователем');
        tx.set(ref,cleanForFirestore({...goal,currentAmount:nextSavingsGoalAmount(0,0,delta)}));
      }else{
        const current=snapshot.data() as SavingsGoal;
        tx.update(ref,{currentAmount:nextSavingsGoalAmount(current.currentAmount,0,delta)});
      }
    }
    if(isEdit){
      const {id:_id,...updates}=transaction;
      tx.update(txRef,{...cleanForFirestore(updates),...(!transaction.linkedGoalId&&previous?.linkedGoalId?{linkedGoalId:deleteField()}:{})});
    }else tx.set(txRef,cleanForFirestore(transaction));
  });
};

/**
 * Remove a transaction and reverse its saved contribution atomically,
 * preventing another family member's recent savings deposit from being lost.
 */
export const deleteTransactionWithGoal = async (
  familyId: string,transactionId: string,goal?: SavingsGoal
) => {
  if(!familyId)throw new Error('No family ID');
  const txRef=doc(db,'families',familyId,'transactions',transactionId);
  await runTransaction(db,async tx=>{
    const saved=await tx.get(txRef);
    if(!saved.exists())throw new Error('Операция уже удалена');
    const previous=saved.data() as Transaction;
    const before=savingsContributionKopecks(previous);
    const goalId=previous.linkedGoalId||goal?.id;
    if(before!==0&&!goalId)throw new Error('Нельзя удалить перевод без привязанной накопительной цели');
    const goalRef=before&&goalId?doc(db,'families',familyId,'goals',goalId):null;
    const goalSnap=goalRef?await tx.get(goalRef):null;
    if(before!==0){
      if(!goalSnap?.exists()||!goalRef)throw new Error('Накопительная цель не найдена: удаление отменено');
      const serverGoal=goalSnap.data() as SavingsGoal;
      tx.update(goalRef,{currentAmount:nextSavingsGoalAmount(serverGoal.currentAmount,before,0)});
    }
    tx.delete(txRef);
  });
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
  if (!familyId || !shoppingId) throw new Error('Семья или товар не найдены');
  const shoppingRef = doc(db, 'families', familyId, 'shopping', shoppingId);
  const pantryRef = doc(db, 'families', familyId, 'pantry', pantryItem.id);
  await runTransaction(db, async tx => {
    const [shoppingSnap, pantrySnap] = await Promise.all([
      tx.get(shoppingRef), tx.get(pantryRef)
    ]);
    if (pantrySnap.exists()) throw new Error('Запись кладовой уже существует');
    const actual = preparePantryMove(
      shoppingSnap.exists() ? { ...shoppingSnap.data(), id: shoppingSnap.id } as ShoppingItem : null,
      pantryItem
    );
    tx.set(pantryRef, cleanForFirestore(actual));
    tx.delete(shoppingRef);
  });
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

/**
 * Import one savings transaction and apply its effect to the latest savings
 * account in the SAME Firestore transaction. Import retries are idempotent.
 * The caller must explicitly resolve/choose a goal, never infer a goal from
 * a stale local balance at commit time.
 */
export const addImportedSavingsItemIdempotent = async (
  familyId: string, item: Transaction, goal: SavingsGoal
): Promise<boolean> => {
  if(!familyId || !item.id || !goal?.id)throw new Error('Не указана семья, операция или накопительная цель');
  if(item.linkedGoalId && item.linkedGoalId!==goal.id)throw new Error('Накопительная цель операции не совпадает с выбранной');
  const txRef=doc(db,'families',familyId,'transactions',item.id);
  const goalRef=doc(db,'families',familyId,'goals',goal.id);
  return runTransaction(db,async transaction=>{
    const [existing,savedGoal]=await Promise.all([transaction.get(txRef),transaction.get(goalRef)]);
    if(existing.exists())return false;
    const completeItem={...item,linkedGoalId:goal.id};
    const contribution=savingsContributionKopecks(completeItem);
    if(!contribution)throw new Error('Операция не является переводом в накопления');
    if(!savedGoal.exists() && contribution<0)
      throw new Error('Нельзя списать накопления: цель ещё не создана');
    if(savedGoal.exists()){
      const current=savedGoal.data() as SavingsGoal;
      transaction.update(goalRef,{
        currentAmount:nextSavingsGoalAmount(current.currentAmount,0,contribution)
      });
    }else{
      transaction.set(goalRef,cleanForFirestore({
        ...goal,currentAmount:nextSavingsGoalAmount(0,0,contribution)
      }));
    }
    transaction.set(txRef,cleanForFirestore(completeItem));
    return true;
  });
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

/** Serialized event writes prevent one device overwriting another device's edits. */
export async function saveFamilyPlanEvent(
  familyId: string, next: FamilyEvent, expected: FamilyEvent | null
): Promise<void> {
  if(!familyId) throw new Error('Семейный аккаунт недоступен');
  const ref=doc(db,'families',familyId,'events',next.id);
  await runTransaction(db,async tx=>{
    const current=await tx.get(ref);
    const existing=current.exists()?{...current.data(),id:current.id} as FamilyEvent:null;
    assertCalendarVersion(expected,existing);
    tx.set(ref,cleanForFirestore(next));
  });
}

export async function deleteFamilyPlanEvent(
  familyId:string,id:string,expected:FamilyEvent|null
):Promise<void>{
  if(!familyId)throw new Error('Семейный аккаунт недоступен');
  const ref=doc(db,'families',familyId,'events',id);
  await runTransaction(db,async tx=>{
    const snap=await tx.get(ref);
    const current=snap.exists()?{...snap.data(),id:snap.id} as FamilyEvent:null;
    assertCalendarVersion(expected,current);
    if(!current)throw new Error('Событие уже удалено');
    tx.delete(ref);
  });
}

/** Detach just one occurrence while keeping the rest of the series intact. */
export async function saveFamilyPlanOccurrence(
  familyId:string,parent:FamilyEvent,sourceDate:string,replacement:FamilyEvent|null
):Promise<void>{
  const parentRef=doc(db,'families',familyId,'events',parent.id);
  const overrideRef=replacement?doc(db,'families',familyId,'events',`${parent.id}::${sourceDate}`):null;
  await runTransaction(db,async tx=>{
    const parentSnap=await tx.get(parentRef);
    const stored=parentSnap.exists()?{...parentSnap.data(),id:parentSnap.id} as FamilyEvent:null;
    assertCalendarVersion(parent,stored);
    if(!stored)throw new Error('Серия событий удалена');
    const existingOverride=overrideRef?await tx.get(overrideRef):null;
    if(existingOverride?.exists())throw new Error('Этот экземпляр уже изменён на другом устройстве');
    tx.update(parentRef,{recurrenceExceptions:markOccurrenceSkipped(stored,sourceDate).recurrenceExceptions});
    if(replacement&&overrideRef)tx.set(overrideRef,cleanForFirestore({
      ...replacement,id:overrideRef.id,seriesId:undefined,occurrenceDate:undefined,recurrence:'none'
    }));
  });
}


/** Hard deletion is limited to unused, unbound profiles without an invitation. */
export async function deleteUnusedFamilyProfile(familyId:string,memberId:string):Promise<void>{
  if(!familyId||!memberId)throw new Error('Семейное пространство недоступно');
  const ref=doc(db,'families',familyId,'members',memberId);
  const snap=await getDocFromServer(ref);
  if(!snap.exists())throw new Error('Профиль не найден');
  assertUnusedFamilyProfile({...snap.data(),id:snap.id} as FamilyMember,false);
  const containsReference=(value:unknown):boolean=>{
    if(value===memberId)return true;
    if(Array.isArray(value))return value.some(containsReference);
    if(value&&typeof value==='object')return Object.values(value).some(containsReference);
    return false;
  };
  const collections=['transactions','shopping','pantry','events','goals','debts','projects','loyalty','wishlist','rules'];
  for(const name of collections){
    const records=await getDocs(collection(db,'families',familyId,name));
    if(records.docs.some(record=>containsReference(record.data())))throw new Error('У профиля есть связанные записи. Удаление недоступно.');
  }
  const settings=await getDocFromServer(doc(db,'families',familyId,'config','settings'));
  if(settings.exists()&&containsReference(settings.data()))throw new Error('У профиля есть связанные настройки.');
  await runTransaction(db,async tx=>{
    const current=await tx.get(ref);
    if(!current.exists())throw new Error('Профиль не найден');
    assertUnusedFamilyProfile({...current.data(),id:current.id} as FamilyMember,false);
    tx.delete(ref);
  });
}


/** Household budget policy is independent of editable member preferences.
 * This client transaction must also be enforced by deployed Firestore rules.
 */
export function subscribeToHouseholdBudgetPolicy(
  familyId:string,
  onValue:(value:{ownerUid:string;policy:'family'|'personal'})=>void,
  onError:(error:Error)=>void
):()=>void {
  return onSnapshot(doc(db,'families',familyId),{includeMetadataChanges:true},snapshot=>{
    if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;
    const data=snapshot.data();
    if(!data||typeof data.ownerId!=='string'||!data.ownerId){
      onError(new Error('Владелец семьи не определён'));
      return;
    }
    if(data.budgetPolicy!==undefined&&data.budgetPolicy!=='family'&&data.budgetPolicy!=='personal'){
      onError(new Error('Неизвестный режим семейного бюджета'));
      return;
    }
    onValue({ownerUid:data.ownerId,policy:data.budgetPolicy==='personal'?'personal':'family'});
  },onError);
}

type HouseholdBudgetChangeResult={policy:'family'|'personal';enabled:boolean;issues:string[]};
const requestHouseholdBudgetPolicy=async(familyId:string,actorUid:string,target:'family'|'personal',preview:boolean):Promise<HouseholdBudgetChangeResult>=>{
  if(!familyId||!actorUid||auth.currentUser?.uid!==actorUid)throw new Error('Семейный аккаунт недоступен');
  const callable=httpsCallable<{familyId:string;target:'family'|'personal';preview:boolean},HouseholdBudgetChangeResult>(getFunctions(undefined,'europe-west1'),'changeHouseholdBudgetPolicy');
  const result=await callable({familyId,target,preview});
  return result.data;
};
export async function saveHouseholdBudgetPolicy(familyId:string,actorUid:string,policy:'family'|'personal'):Promise<void>{
  const result=await requestHouseholdBudgetPolicy(familyId,actorUid,policy,false);
  if(result.policy!==policy||result.issues.length)throw new Error('Сервер не подтвердил изменение режима');
}
export function previewHouseholdBudgetPolicy(familyId:string,actorUid:string,target:'family'|'personal'){
  return requestHouseholdBudgetPolicy(familyId,actorUid,target,true);
}


/** Scoped listener: no unfiltered fallback for a missing personal identity. */
export function subscribeToScopedFinancialCollection(
  familyId:string,collectionName:'transactions'|'goals'|'debts',
  policy:'family'|'personal',memberId:string|undefined,
  onValue:(records:any[])=>void,onError:(error:Error)=>void
):()=>void{
  if(!familyId||(policy==='personal'&&!memberId)){onValue([]);return ()=>{};}
  const ref=collection(db,'families',familyId,collectionName);
  const scoped=policy==='personal'?query(ref,where('memberId','==',memberId)):query(ref);
  return onSnapshot(scoped,snapshot=>{
    onValue(snapshot.docs.map(record=>({...record.data(),id:record.id})));
  },error=>{onValue([]);onError(error);});
}


/** Explicitly attribute an old shared record without moving it or changing amounts.
 * Only the household owner may do this, and only in shared mode.
 * Deployed Firestore rules must enforce the same conditions.
 */
export async function assignLegacyFinancialOwner(
  familyId:string, actorUid:string, kind:'goals'|'debts', recordId:string, memberId:string
):Promise<void>{
  if(!familyId||!recordId||!memberId||!actorUid)throw new Error('Не указаны данные назначения владельца');
  if(kind!=='goals'&&kind!=='debts')throw new Error('Недопустимый тип записи');
  const familyRef=doc(db,'families',familyId);
  const recordRef=doc(db,'families',familyId,kind,recordId);
  const memberRef=doc(db,'families',familyId,'members',memberId);
  await runTransaction(db,async tx=>{
    const family=await tx.get(familyRef);
    const record=await tx.get(recordRef);
    const member=await tx.get(memberRef);
    assertBudgetPolicyOwner(family.data()?.ownerId,actorUid);
    if(family.data()?.budgetPolicy==='personal')throw new Error('Назначение доступно только в совместном режиме');
    if(!record.exists()||record.data().memberId)throw new Error('Запись уже назначена или недоступна');
    const uid=member.data()?.userId;
    if(typeof uid!=='string'||!uid||!family.data()?.members?.includes(uid))throw new Error('Участник не привязан к семейному аккаунту');
    tx.update(recordRef,{memberId});
  });
}


/** Server-read preflight, not a security boundary and not permission to activate.
 * No financial values or member identities are returned to the UI.
 */
export async function inspectPersonalBudgetReadiness(familyId:string,actorUid:string):Promise<HouseholdBudgetChangeResult>{
  return previewHouseholdBudgetPolicy(familyId,actorUid,'personal');
}


/** Diagnostic listener for the family document only; metadata never contains financial values. */
export function subscribeToFamilySyncStatus(familyId:string,onValue:(status:{fromCache:boolean;pending:boolean;confirmedAt?:number;error?:string})=>void):()=>void{
  return onSnapshot(doc(db,'families',familyId),{includeMetadataChanges:true},snapshot=>{
    const {fromCache,hasPendingWrites:pending}=snapshot.metadata;
    if(!snapshot.exists()){
      onValue({fromCache,pending,error:'Семейное пространство не подтверждено'});
      return;
    }
    onValue({fromCache,pending,...(!fromCache&&!pending?{confirmedAt:Date.now()}:{})});
  },error=>onValue({fromCache:false,pending:false,error:error.code==='permission-denied'?'Нет доступа к семейному пространству':'Не удалось подтвердить соединение с Firebase'}));
}


/** Personal payment writes never touch the family settings document. */
export async function commitPersonalMandatoryPaymentBundle(
  familyId:string,userId:string,memberId:string,
  changes:Pick<AppSettings,'mandatoryExpenses'|'manualPaidExpenses'>,
  debtChanges:ReadonlyArray<{id:string;changes:Partial<Debt>}>
):Promise<void>{
  if(!familyId||!memberId||!userId||auth.currentUser?.uid!==userId)throw new Error('Личный профиль недоступен');
  const ids=new Set<string>();
  for(const expense of changes.mandatoryExpenses){
    if(!expense.id||ids.has(expense.id)||expense.memberId!==memberId)throw new Error('Некорректный владелец или ID обязательного платежа');
    ids.add(expense.id);
  }
  const paid=changes.manualPaidExpenses??{};
  for(const [month,entries] of Object.entries(paid)){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||entries.some(id=>!ids.has(id)))throw new Error('Некорректная история оплаты');
  }
  if(new Set(debtChanges.map(d=>d.id)).size!==debtChanges.length||debtChanges.some(d=>!d.id||('memberId' in d.changes&&d.changes.memberId!==memberId)))throw new Error('Некорректное изменение долга');
  const familyRef=doc(db,'families',familyId);
  const memberRef=doc(db,'families',familyId,'members',memberId);
  const configRef=doc(db,'families',familyId,'members',userId,'config','settings');
  const debtRefs=debtChanges.map(d=>doc(db,'families',familyId,'debts',d.id));
  await runTransaction(db,async tx=>{
    const family=await tx.get(familyRef);
    const profile=await tx.get(memberRef);
    const config=await tx.get(configRef);
    const debts=await Promise.all(debtRefs.map(ref=>tx.get(ref)));
    if(family.data()?.budgetPolicy!=='personal'||!family.data()?.members?.includes(userId)||profile.data()?.userId!==userId)throw new Error('Личный режим или профиль не подтверждён');
    if(!Array.isArray(config.data()?.personalMandatoryExpenses))throw new Error('Личные платежи ещё не перенесены');
    for(const debt of debts){
      if(!debt.exists()||debt.data().memberId!==memberId)throw new Error('Связанный долг недоступен');
    }
    const mergedPaid={...(config.data()?.personalManualPaidExpenses??{}),...paid} as Record<string,string[]>;
    for(const entries of Object.values(mergedPaid)){
      if(!Array.isArray(entries)||entries.some(id=>!ids.has(id)))throw new Error('Сначала устраните связанные отметки оплаты');
    }
    tx.set(configRef,cleanForFirestore({personalMandatoryExpenses:changes.mandatoryExpenses,personalManualPaidExpenses:mergedPaid}),{merge:true});
    for(let i=0;i<debtChanges.length;i++)tx.update(debtRefs[i],cleanForFirestore(debtChanges[i].changes));
  });
}


export function subscribeToPersonalCollection(familyId:string,uid:string,kind:'rules'|'knowledge',callback:(data:any[])=>void){
 if(!familyId||auth.currentUser?.uid!==uid){callback([]);return ()=>{};}
 return onSnapshot(collection(db,'families',familyId,'members',uid,kind),snap=>callback(snap.docs.map(d=>({...d.data(),id:d.id}))),()=>callback([]));
}
export async function savePersonalItems(familyId:string,uid:string,kind:'rules'|'knowledge',items:ReadonlyArray<{id:string}>){
 if(!familyId||auth.currentUser?.uid!==uid)throw new Error('Личный профиль недоступен');
 for(let i=0;i<items.length;i+=450){
   const batch=writeBatch(db);
   for(const item of items.slice(i,i+450))batch.set(doc(db,'families',familyId,'members',uid,kind,item.id),cleanForFirestore(item));
   await batch.commit();
 }
}
export async function deletePersonalItem(familyId:string,uid:string,kind:'rules'|'knowledge',id:string){
 if(!familyId||auth.currentUser?.uid!==uid)throw new Error('Личный профиль недоступен');
 await deleteDoc(doc(db,'families',familyId,'members',uid,kind,id));
}
