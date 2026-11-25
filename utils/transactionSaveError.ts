// Show a safe actionable error; never expose tokens, IDs or arbitrary server text.
export function transactionSaveError(error:unknown):string {
 const e=error as {code?:unknown;message?:unknown}|null;
 const code=typeof e?.code==='string'?e.code.replace(/^firestore\//,''):'';
 switch(code){
  case 'permission-denied':return 'Операция не сохранена: нет прав на запись (permission-denied).';
  case 'unauthenticated':return 'Операция не сохранена: требуется повторный вход (unauthenticated).';
  case 'unavailable':case 'deadline-exceeded':return 'Операция не сохранена: сервер недоступен ('+code+').';
  case 'failed-precondition':return 'Операция не сохранена: условие записи не выполнено (failed-precondition).';
  case 'aborted':return 'Операция не сохранена: конфликт записи (aborted). Повторите попытку.';
  case 'not-found':return 'Операция не сохранена: связанная запись не найдена (not-found).';
 }
 const known=[
  'В личном режиме доступны только собственные операции',
  'Старый перевод не привязан к личной цели',
  'Накопительная цель недоступна',
  'Накопительная цель предыдущего перевода не найдена',
  'Цель принадлежит другому участнику',
  'Операция была удалена другим пользователем',
  'Операция уже существует',
  'Подтвердите внешний перевод в настройках семьи.',
  'Не удалось определить накопительную цель предыдущей операции',
  'Для перевода в накопления необходимо выбрать цель',
  'Накопительная цель удалена другим пользователем',
  'Семейное пространство не загружено. Операция не сохранена.'
 ];
 if(typeof e?.message==='string'&&known.includes(e.message))return e.message;
 return 'Не удалось сохранить транзакцию. Пожалуйста, попробуйте снова. Код: TX-SAVE.';
}
