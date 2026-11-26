// Show a safe actionable error; never expose tokens, IDs or arbitrary server text.
export type TransactionSavePhase = 'prepare' | 'submit' | 'after-submit';
export function transactionSaveError(error:unknown,phase:TransactionSavePhase='submit'):string {
 if(phase==='after-submit')return 'Операция сохранена, но не удалось завершить обработку формы. Код: TX-AFTER-SAVE.';
 const suffix=error instanceof RangeError?'-RANGE':error instanceof TypeError?'-TYPE':'';
 if(phase==='prepare')return 'Не удалось подготовить операцию к сохранению. Код: TX-PREPARE'+suffix+'.';
 const e=error as {code?:unknown;message?:unknown}|null;
 const code=typeof e?.code==='string'?e.code.replace(/^firestore\//,''):'';
 switch(code){
  case 'permission-denied':return 'Операция не сохранена: нет прав на запись (permission-denied).';
  case 'unauthenticated':return 'Операция не сохранена: требуется повторный вход (unauthenticated).';
  case 'unavailable':case 'deadline-exceeded':case 'internal':case 'unknown':case 'cancelled':case 'data-loss':
   return 'Сохранение не подтверждено ('+code+'). Перед повторной попыткой проверьте историю операций.';
  case 'resource-exhausted':return 'Сервер ограничил запись: превышен лимит Firestore (resource-exhausted). Проверьте историю операций и не повторяйте сохранение многократно.';
  case 'invalid-argument':case 'out-of-range':return 'Сервер отклонил параметры операции ('+code+').';
  case 'already-exists':return 'Запись уже существует (already-exists). Проверьте историю операций.';
  case 'unimplemented':return 'Сервер не поддерживает эту операцию (unimplemented).';
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
 return 'Сохранение не подтверждено. Перед повторной попыткой проверьте историю операций. Код: TX-SAVE'+suffix+'.';
}
