import type { FamilyMember } from '../types';

/**
 * Prepares one family member and its optional email invitation.
 * This function has no Firestore side effects; both documents are saved in one batch by the caller.
 */
export function prepareFamilyMemberInvitation(
  familyId: string,
  member: FamilyMember,
  existingMembers: readonly FamilyMember[]
): { member: FamilyMember; invitation: { familyId: string; placeholderMemberId: string; email: string } | null } {
  if (!familyId.trim()) throw new Error('Семейное пространство недоступно');
  if (!member.id.trim() || !member.name.trim()) throw new Error('Не указан участник семьи');
  const email = member.email?.trim().toLowerCase() || '';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Некорректный email участника');
  }
  if (existingMembers.some(existing => existing.id === member.id ||
    (email && existing.email?.trim().toLowerCase() === email))) {
    throw new Error('Участник с таким ID или email уже существует');
  }

  return {
    member: { ...member, email: email || undefined },
    invitation: email ? { familyId, placeholderMemberId: member.id, email } : null
  };
}


export function resolveFamilyJoinProfile(members:readonly FamilyMember[],uid:string,invitedId:string|null):FamilyMember {
  const existing=members.filter(m=>m.userId===uid);
  if(existing.length>1)throw new Error('Обнаружено несколько привязанных профилей. Проверьте настройки семьи.');
  if(invitedId){
    const target=members.find(m=>m.id===invitedId);
    if(!target)throw new Error('Профиль приглашения не найден');
    if(target.userId&&target.userId!==uid)throw new Error('Профиль уже привязан к другому аккаунту');
    if(existing.length&&existing[0].id!==target.id)throw new Error('Аккаунт уже привязан к другому профилю семьи');
    return target;
  }
  if(!existing.length)throw new Error('Привязанный профиль не найден. Проверьте приглашение.');
  return existing[0];
}

export function assertUnusedFamilyProfile(member:FamilyMember,hasReferences:boolean):void {
  if(member.userId||member.isAdmin)throw new Error('Нельзя удалять профиль, связанный с аккаунтом или администратором');
  if(member.email)throw new Error('Профиль с email может иметь приглашение. Удаление недоступно до проверки приглашения.');
  if(hasReferences)throw new Error('У профиля есть связанные записи. Сохраните его для истории семьи.');
}
