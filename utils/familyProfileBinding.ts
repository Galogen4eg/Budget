/** Never reassign a household member already linked to another signed-in user. */
export function bindFamilyProfile<T extends {id:string;userId?:string|null}>(
  members:readonly T[],
  signedInUserId:string|null|undefined,
  targetMemberId:string
):T[] {
  if (!signedInUserId) throw new Error('Войдите в аккаунт перед привязкой профиля');
  if (targetMemberId === 'guest')
    return members.map(m=>m.userId===signedInUserId?{...m,userId:null}:m);
  const target=members.find(m=>m.id===targetMemberId);
  if (!target) throw new Error('Профиль участника не найден');
  if (target.userId && target.userId!==signedInUserId)
    throw new Error('Этот профиль уже привязан к другому аккаунту');
  return members.map(m=>m.id===targetMemberId
    ?{...m,userId:signedInUserId}
    :m.userId===signedInUserId?{...m,userId:null}:m);
}
