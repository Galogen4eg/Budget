
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

// --- DEBUG LOGGING SYSTEM ---
// Writes logs directly to Firestore so we can inspect what's happening on the device
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
  await logDebug(user, 'getOrInitUserFamily_START', { email: user.email });
  
  const userRef = doc(db, 'users', user.uid);
  let currentFamilyId = user.uid; // Default fallback (Demo/Self mode)
  let profileExists = false;

  // 1. CHECK INVITATIONS (PRIORITY OVER EVERYTHING)
  if (user.email) {
      const cleanEmail = user.email.toLowerCase().trim();
      await logDebug(user, 'checking_invitations', { cleanEmail });
      
      try {
          const inviteRef = doc(db, 'invitations', cleanEmail);
          const inviteSnap = await getDoc(inviteRef);

          if (inviteSnap.exists()) {
              const invite = inviteSnap.data();
              await logDebug(user, 'invite_found', invite);

              if (invite.familyId) {
                  try {
                      // A. CRITICAL: Update User Profile first
                      await setDoc(userRef, {
                          email: user.email,
                          familyId: invite.familyId,
                          lastLogin: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                      }, { merge: true });
                      
                      await logDebug(user, 'profile_updated_from_invite', { familyId: invite.familyId });

                      // B. Link Member Card (Best Effort)
                      if (invite.placeholderMemberId) {
                          const memberRef = doc(db, 'families', invite.familyId, 'members', invite.placeholderMemberId);
                          await setDoc(memberRef, { 
                              userId: user.uid, 
                              avatar: user.photoURL || null 
                          }, { merge: true }).catch(e => logDebug(user, 'link_member_failed', e, 'error'));
                      }

                      // C. Add to Family Members List (Best Effort)
                      const famRef = doc(db, 'families', invite.familyId);
                      await updateDoc(famRef, { members: arrayUnion(user.uid) })
                          .catch(e => logDebug(user, 'update_family_list_failed', e, 'error'));

                      // D. Delete Invitation (Best Effort)
                      await deleteDoc(inviteRef).catch(e => logDebug(user, 'delete_invite_failed', e, 'error'));

                      // RETURN IMMEDIATELY on success
                      await logDebug(user, 'SUCCESS_joined_via_invite', { familyId: invite.familyId });
                      return invite.familyId;

                  } catch (criticalErr: any) {
                      await logDebug(user, 'CRITICAL_invite_apply_failed', criticalErr.message, 'error');
                  }
              }
          } else {
              await logDebug(user, 'no_invite_document_found');
          }
      } catch (inviteErr: any) {
          await logDebug(user, 'error_reading_invites', inviteErr.message, 'error');
      }
  }

  // 2. Standard Profile Check (If no invite processed)
  try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.familyId) {
              currentFamilyId = data.familyId;
              profileExists = true;
              await logDebug(user, 'existing_profile_found', { familyId: currentFamilyId });
          } else {
              await logDebug(user, 'profile_exists_but_no_familyId');
          }
      } else {
          await logDebug(user, 'no_user_profile_doc');
      }
  } catch (e: any) {
      await logDebug(user, 'error_reading_profile', e.message, 'error');
  }

  // 3. Initialize Profile if missing
  if (!profileExists) {
      try {
          await setDoc(userRef, {
              email: user.email,
              familyId: currentFamilyId,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
          }, { merge: true });
          await logDebug(user, 'created_new_profile', { familyId: currentFamilyId });
      } catch (e: any) {
          await logDebug(user, 'failed_create_profile', e.message, 'error');
      }
  }

  // 4. Initialize Self-Family if needed
  // Only if the ID matches our UID (meaning we are NOT in someone else's family)
  if (currentFamilyId === user.uid) {
      const familyRef = doc(db, 'families', currentFamilyId);
      try {
          const famSnap = await getDoc(familyRef);
          if (!famSnap.exists()) {
              await logDebug(user, 'initializing_personal_family', { familyId: currentFamilyId });
              
              const newMember: FamilyMember = {
                  id: user.uid,
                  userId: user.uid,
                  name: user.displayName || 'Пользователь',
                  color: '#007AFF',
                  avatar: user.photoURL || undefined,
                  isAdmin: true
              };
              
              const batch = writeBatch(db);
              batch.set(familyRef, {
                  ownerId: user.uid,
                  name: 'Моя семья',
                  createdAt: new Date().toISOString(),
                  members: [user.uid]
              });
              batch.set(doc(db, 'families', currentFamilyId, 'members', user.uid), newMember);
              await batch.commit();
              await logDebug(user, 'personal_family_created');
          }
      } catch (e: any) {
          await logDebug(user, 'family_init_error', e.message, 'error');
      }
  }

  await logDebug(user, 'getOrInitUserFamily_DONE', { returning: currentFamilyId });
  return currentFamilyId;
};

export const joinFamily = async (user: FirebaseUser, targetFamilyId: string) => {
  if (!targetFamilyId || !user) throw new Error("Invalid params for joinFamily");
  await logDebug(user, 'joinFamily_START', { targetFamilyId });
  
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

  try {
      const batch = writeBatch(db);
      batch.set(userRef, { 
          familyId: cleanFamilyId,
          email: user.email,
          updatedAt: new Date().toISOString()
      }, { merge: true });
      batch.set(memberRef, newMember);
      await batch.commit();
      await logDebug(user, 'joinFamily_batch_success');
  } catch (e: any) {
      await logDebug(user, 'joinFamily_batch_failed', e.message, 'error');
      // Fallback
      await setDoc(userRef, { familyId: cleanFamilyId }, { merge: true });
  }

  try {
      await updateDoc(familyRef, {
          members: arrayUnion(user.uid)
      });
  } catch (e: any) {
      await logDebug(user, 'joinFamily_update_parent_failed', e.message, 'error');
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
