
import * as XLSX from 'xlsx';
import { Transaction, AppSettings, LearnedRule, Category } from '../types';
import { getSmartCategory, cleanMerchantName } from './categorizer';

export const parseAlfaStatement = (
  file: File, 
  mapping: AppSettings['alfaMapping'],
  defaultMemberId: string,
  learnedRules: LearnedRule[] = [],
  categories: Category[],
  existingTransactions: Transaction[] = []
): Promise<Omit<Transaction, 'id'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Не удалось прочитать файл");

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

        if (!json || json.length === 0) throw new Error("Файл пуст или имеет неверный формат");

        let bestHeaderRowIndex = -1;
        let maxScore = 0;

        // Расширенные ключевые слова
        const dateKeywords = ['дата', 'date', 'transaction date', 'время', 'data', 'проводка', 'дата операции', 'time'];
        const amountKeywords = ['сумма', 'amount', 'сумма операции', 'sum', 'приход', 'расход', 'дебет', 'кредит', 'списано', 'зачислено', 'value', 'summa', 'сумма платежа'];
        const noteKeywords = ['описание', 'note', 'назначение', 'реквизиты', 'контрагент', 'details', 'комментарий', 'место', 'основание', 'description'];
        const mccKeywords = ['mcc', 'мсс', 'код категории'];
        const catKeywords = ['категория', 'category', 'тип', 'группа'];

        // Ищем строку заголовка более тщательно
        for (let i = 0; i < Math.min(json.length, 30); i++) {
          const row = json[i];
          if (!row || !Array.isArray(row)) continue;

          let currentScore = 0;
          const rowStrings = row.map(cell => String(cell || '').toLowerCase().trim());

          if (rowStrings.some(s => dateKeywords.some(k => s.includes(k)))) currentScore += 2;
          if (rowStrings.some(s => amountKeywords.some(k => s.includes(k)))) currentScore += 2;
          if (rowStrings.some(s => noteKeywords.some(k => s.includes(k)))) currentScore += 1;

          if (currentScore > maxScore) {
            maxScore = currentScore;
            bestHeaderRowIndex = i;
          }
        }

        if (bestHeaderRowIndex === -1 || maxScore < 2) {
          console.warn("Заголовки не найдены с высокой точностью. Используем 0 строку.");
          bestHeaderRowIndex = 0;
        }

        const rawHeaders = json[bestHeaderRowIndex];
        const headers = rawHeaders.map(h => (h !== null && h !== undefined) ? String(h).toLowerCase().trim() : "");
        
        const findCol = (userTerm: string, defaultTerms: string[]) => {
          // Если пользователь задал явный маппинг, ищем сначала его
          if (userTerm) {
             const exactIdx = headers.findIndex(h => h === userTerm.toLowerCase().trim());
             if (exactIdx !== -1) return exactIdx;
          }

          const terms = [userTerm?.toLowerCase(), ...defaultTerms.map(t => t.toLowerCase())].filter(Boolean);
          let idx = headers.findIndex(h => terms.some(t => h === t)); // Точное совпадение
          if (idx === -1) {
             idx = headers.findIndex(h => terms.some(t => h.includes(t))); // Частичное
          }
          return idx;
        };

        const colDate = findCol(mapping.date, dateKeywords);
        const colAmount = findCol(mapping.amount, amountKeywords);
        const colCategory = findCol(mapping.category, catKeywords);
        const colNote = findCol(mapping.note, noteKeywords);
        const colMCC = findCol('', mccKeywords);

        if (colDate === -1 || colAmount === -1) {
          throw new Error(`Не найдены обязательные столбцы (Дата и Сумма). Проверьте файл.`);
        }

        const transactions: Omit<Transaction, 'id'>[] = [];
        const matchedExistingIds = new Set<string>();

        for (let i = bestHeaderRowIndex + 1; i < json.length; i++) {
          const row = json[i];
          if (!row) continue;

          // 1. Дата и Время
          let date: string | null = null;
          const rawDate = row[colDate];
          
          if (!rawDate) continue; 

          try {
            if (typeof rawDate === 'number') {
              // Excel Serial Date (включает время как дробную часть)
              // Вычитаем поправку на часовой пояс, чтобы получить UTC корректно, или используем локальное время
              const jsDate = new Date((rawDate - 25569) * 86400 * 1000);
              // Корректируем, так как Excel считает в UTC/Local специфично
              // Обычно достаточно просто toISOString, но иногда бывает сдвиг на минуты
              const offset = jsDate.getTimezoneOffset() * 60000;
              date = new Date(jsDate.getTime() + offset).toISOString(); // Сохраняем "как есть" визуально
            } else {
              let s = String(rawDate).trim().replace(/['"]/g, '');
              if (!s) continue;
              
              // Пробуем распознать формат DD.MM.YYYY HH:MM:SS
              // Regex для "DD.MM.YYYY" или "DD/MM/YYYY" с опциональным временем
              const dmyMatch = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?/);
              
              if (dmyMatch) {
                  const day = parseInt(dmyMatch[1]);
                  const month = parseInt(dmyMatch[2]) - 1; // JS months are 0-based
                  let year = parseInt(dmyMatch[3]);
                  if (year < 100) year += 2000; // Handle 2-digit years

                  const hour = dmyMatch[4] ? parseInt(dmyMatch[4]) : 0;
                  const minute = dmyMatch[5] ? parseInt(dmyMatch[5]) : 0;
                  const second = dmyMatch[6] ? parseInt(dmyMatch[6]) : 0;

                  const parsedDate = new Date(year, month, day, hour, minute, second);
                  // Приводим к ISO, корректируя смещение, чтобы дата осталась той же, что в файле (локальной)
                  const offset = parsedDate.getTimezoneOffset() * 60000;
                  date = new Date(parsedDate.getTime() - offset).toISOString();
              } else {
                  // Fallback для ISO форматов или US форматов
                  const fallbackDate = new Date(s);
                  if (!isNaN(fallbackDate.getTime())) {
                      date = fallbackDate.toISOString();
                  }
              }
            }
          } catch (e) {
              console.warn("Date parse error for row", i, rawDate);
              continue; 
          }

          if (!date) continue;

          // 2. Сумма
          let amountValue = 0;
          const rawAmount = row[colAmount];
          if (typeof rawAmount === 'number') {
            amountValue = rawAmount;
          } else {
            let clean = String(rawAmount || '0')
                .replace(/\s/g, '')
                .replace(/\u00A0/g, '') // Non-breaking space
                .replace(/[^\d,.+-]/g, '')
                .replace(',', '.');
            
            // Handle cases like "1.200,00" vs "1,200.00" vs "1200.00"
            // Simple heuristic: if multiple dots, remove all but last.
            if ((clean.match(/\./g) || []).length > 1) {
                const parts = clean.split('.');
                clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
            }
            
            amountValue = parseFloat(clean);
          }

          if (isNaN(amountValue) || amountValue === 0) continue;

          const amount = Math.abs(amountValue);
          const type = amountValue < 0 ? 'expense' : 'income';

          // 3. Категоризация
          const rawNoteStr = colNote !== -1 && row[colNote] !== undefined ? String(row[colNote]).trim() : '';
          const rawCatStr = colCategory !== -1 && row[colCategory] !== undefined ? String(row[colCategory]).trim() : '';
          const rawMCC = colMCC !== -1 && row[colMCC] !== undefined ? String(row[colMCC]).trim() : undefined;

          const rawMerchantRef = rawNoteStr || rawCatStr || 'Банковская операция';
          const finalNote = cleanMerchantName(rawMerchantRef, learnedRules);

          // 4. Проверка на дубликат (УЛУЧШЕННАЯ)
          const importDatePart = date.split('T')[0]; // YYYY-MM-DD
          
          // Ищем дубликат в базе
          const duplicateMatch = existingTransactions.find(tx => {
             if (matchedExistingIds.has(tx.id)) return false;

             const txDatePart = new Date(tx.date).toISOString().split('T')[0];
             
             // 1. Совпадение даты (день)
             if (txDatePart !== importDatePart) return false;
             
             // 2. Совпадение суммы (с точностью до копеек)
             if (Math.abs(tx.amount - amount) > 0.01) return false;
             
             // 3. Совпадение типа
             if (tx.type !== type) return false;

             // 4. Мягкое сравнение описания (если оно есть)
             // Если описания очень похожи, считаем дублем
             const txRawLower = (tx.rawNote || tx.note || '').toLowerCase().replace(/[^a-zа-я0-9]/g, '');
             const importRawLower = rawMerchantRef.toLowerCase().replace(/[^a-zа-я0-9]/g, '');
             
             return txRawLower === importRawLower || importRawLower.includes(txRawLower) || txRawLower.includes(importRawLower);
          });

          if (duplicateMatch) {
            matchedExistingIds.add(duplicateMatch.id);
            continue;
          }

          const categoryId = getSmartCategory(rawMerchantRef, learnedRules, categories, rawMCC, rawCatStr);

          transactions.push({
            amount,
            type,
            category: categoryId,
            memberId: defaultMemberId,
            note: finalNote,
            date,
            rawNote: rawMerchantRef
          });
        }

        resolve(transactions);
      } catch (err) {
        console.error("Parse Error:", err);
        reject(err instanceof Error ? err : new Error("Ошибка при парсинге"));
      }
    };

    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsArrayBuffer(file);
  });
};
