/**
 * Maps only explicit Alfa-Bank category labels to Budget canonical categories.
 * Ambiguous labels (e.g. "Прочее", "Финансовые операции") are left unresolved.
 * Never infer income/expense direction here: that comes from the XLSX "Тип" column.
 */
export const alfaBankCategoryToCanonicalId = (raw: string): string | undefined => {
  const value = (raw || '').normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim();
  if (!value) return undefined;
  const groups: Array<[string, RegExp]> = [
    ['savings', /накопительн|копилк|сберегательн|вклад/],
    ['transfer', /перевод|\bсбп\b|\bsbp\b|между счетами/],
    ['salary', /зарплат|оплат[аы] труда|заработн[а-я]* плат/],
    ['food', /супермаркет|продукт|бакале|гипермаркет/],
    ['restaurants', /ресторан|кафе|фастфуд|столов|общепит|закусочн|кофейн|бар[ы ]|паб[ы ]/],
    ['fuel', /азс|бензин|топливо|заправк/],
    ['auto', /автомобил|автосервис|парковк|автозапчаст|автомойк/],
    ['taxi', /такси|каршеринг/],
    ['transport', /транспорт|автобус|метро|проезд|трамвай|троллейбус|железнодорож|поезд/],
    ['pharmacy', /аптек/],
    ['health', /медицин|здоров|стоматолог|больниц|клиник/],
    ['clothes', /одежд|обув/],
    ['electronics', /электроник|бытов[а-я]* техник/],
    ['shopping', /маркетплейс|универмаг|торгов[а-я]* центр/],
    ['entertainment', /развлечен|кинотеатр|театр|концерт/],
    ['sport', /фитнес|спортзал|спортивн/],
    ['subscriptions', /подписк|стриминг/],
    ['alcohol', /алкогол|вин[ао ]|спиртн/],
    ['gifts', /цветочн|цветы|флорист/],
    ['taxes', /налог|госпошлин/],
  ];
  const matches = groups.filter(([, regex]) => regex.test(value)).map(([id]) => id);
  return matches.length === 1 ? matches[0] : undefined;
};
