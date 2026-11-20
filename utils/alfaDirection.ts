/** Classify Alfa XLSX transactions by the explicit "Тип" field, not unsigned "Сумма". */
export const classifyAlfaDirection = (
  rawType: unknown,
  amount: number,
  amountHeader: string,
  hasTypeColumn: boolean
): 'income' | 'expense' => {
  const type = String(rawType ?? '').trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
  const header = amountHeader.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
  const expense = /(?:^|[\s,;:/()_-])(расход(?:ы|ная)?|списани[ея]|списано|покупк[аиуы]?|оплат[аы]|сняти[ея]|выдач[аеи]|debit|expense|outgoing)(?=$|[\s,;:/()_-])/iu;
  const income = /(?:^|[\s,;:/()_-])(доход(?:ы)?|приход|зачислени[ея]|пополнени[ея]|поступлени[ея]|возврат|кешбек|кэшбэк|cashback|credit|income|incoming)(?=$|[\s,;:/()_-])/iu;
  const isExpense = expense.test(type);
  const isIncome = income.test(type);
  if (isExpense !== isIncome) return isExpense ? 'expense' : 'income';
  if (hasTypeColumn) throw new Error('Неизвестное или неоднозначное значение столбца «Тип». Импорт остановлен.');
  if (amount < 0) return 'expense';
  if (/расход|списан/.test(header)) return 'expense';
  if (/приход|зачислен/.test(header)) return 'income';
  throw new Error('Не удалось определить направление операции: нет столбца «Тип». Импорт остановлен.');
};
