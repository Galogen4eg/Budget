import type { FamilyMember } from '../types';

type EditableField = 'name' | 'color' | 'email' | 'userId';
const EDITABLE_FIELDS: readonly EditableField[] = ['name', 'color', 'email', 'userId'];
const same = (a: unknown, b: unknown): boolean => (a ?? null) === (b ?? null);

export interface MemberMutation {
  id: string;
  previous: FamilyMember;
  updates: Partial<Pick<FamilyMember, EditableField>>;
}

/** Only changed fields may be sent to Firestore. Never re-save stale entire member lists. */
export function planMemberMutations(previous: readonly FamilyMember[], next: readonly FamilyMember[]): MemberMutation[] {
  const oldIds = new Set(previous.map(member => member.id));
  const newIds = new Set(next.map(member => member.id));
  if (oldIds.size !== previous.length || newIds.size !== next.length ||
    oldIds.size !== newIds.size || [...oldIds].some(id => !newIds.has(id))) {
    throw new Error('Изменился состав семьи. Обновите страницу перед редактированием');
  }
  return next.flatMap(member => {
    const old = previous.find(item => item.id === member.id)!;
    if (!same(old.isAdmin, member.isAdmin) || !same(old.avatar, member.avatar)) {
      throw new Error('Недопустимое изменение прав или аватара участника');
    }
    const updates: MemberMutation['updates'] = {};
    for (const key of EDITABLE_FIELDS) {
      if (!same(old[key], member[key])) {
        (updates as Record<string, unknown>)[key] = member[key] ?? null;
      }
    }
    return Object.keys(updates).length ? [{ id: member.id, previous: old, updates }] : [];
  });
}

/** Recheck the current server document inside a Firestore transaction. */
export function validateMemberMutation(
  change: MemberMutation,
  live: FamilyMember,
  requesterUid: string | null,
  requesterEmail?: string | null
): MemberMutation['updates'] {
  if (live.id !== change.id) throw new Error('Профиль участника изменился');
  if (!same(live.userId, change.previous.userId)) {
    throw new Error('Привязка профиля уже изменилась на другом устройстве');
  }
  for (const key of Object.keys(change.updates) as EditableField[]) {
    if (!same(live[key], change.previous[key])) {
      throw new Error('Данные профиля изменены на другом устройстве. Обновите список участников');
    }
  }
  if ('userId' in change.updates) {
    if (!requesterUid) throw new Error('Войдите в аккаунт для привязки профиля');
    const oldUid = live.userId;
    const newUid = change.updates.userId;
    if ((oldUid && oldUid !== requesterUid) || (newUid && newUid !== requesterUid)) {
      throw new Error('Нельзя изменять привязку чужого профиля');
    }
    if (newUid && live.email && live.email.trim().toLowerCase() !== requesterEmail?.trim().toLowerCase()) {
      throw new Error('Профиль предназначен другому приглашённому пользователю');
    }
  }
  if ('email' in change.updates && !live.userId) {
    throw new Error('Email приглашённого участника нельзя менять без переоформления приглашения');
  }
  return change.updates;
}
