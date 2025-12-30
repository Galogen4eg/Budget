
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
        const dateKeywords = ['дата', 'date', 'transaction date', 'время', 'data', 'проводка'];
        const amountKeywords = ['сумма', 'amount', 'сумма операции', 'sum', 'приход', 'расход', 'дебет', 'кредит', 'списано', 'зачислено', 'value', 'summa'];
        const noteKeywords = ['описание', 'note', 'назначение', 'реквизиты', 'контрагент', 'details', 'комментарий', 'место'];
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
          const terms = [userTerm.toLowerCase(), ...defaultTerms.map(t => t.toLowerCase())];
          let idx = headers.findIndex(h => terms.some(t => h === t));
          if (idx === -1) {
             idx = headers.findIndex(h => terms.some(t => h.includes(t)));
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
        
        // Set to track used existing transaction IDs to avoid double-matching duplicates
        const matchedExistingIds = new Set<string>();

        for (let i = bestHeaderRowIndex + 1; i < json.length; i++) {
          const row = json[i];
          if (!row) continue;

          // 1. Дата
          let date: string;
          const rawDate = row[colDate];
          
          if (!rawDate) continue; 

          try {
            if (typeof rawDate === 'number') {
              date = new Date((rawDate - 25569) * 86400 * 1000).toISOString();
            } else {
              const s = String(rawDate).trim().replace(/['"]/g, '');
              if (!s) continue;
              
              let parsedDate = new Date(s);
              
              if (isNaN(parsedDate.getTime())) {
                 const parts = s.split(/[.\s/-]/); 
                 if (parts.length >= 3) {
                     const part1 = parseInt(parts[0]);
                     const part2 = parseInt(parts[1]);
                     const part3 = parseInt(parts[2]);

                     if (part1 > 1900) {
                         parsedDate = new Date(part1, part2 - 1, part3);
                     } else {
                         const year = parts[2].length === 2 ? 2000 + part3 : part3;
                         parsedDate = new Date(year, part2 - 1, part1);
                     }
                 }
              }
              
              if (!isNaN(parsedDate.getTime())) {
                  const offset = parsedDate.getTimezoneOffset() * 60000;
                  date = new Date(parsedDate.getTime() - offset).toISOString();
              } else {
                  continue; 
              }
            }
          } catch (e) { continue; }

          // 2. Сумма
          let amountValue = 0;
          const rawAmount = row[colAmount];
          if (typeof rawAmount === 'number') {
            amountValue = rawAmount;
          } else {
            let clean = String(rawAmount || '0')
                .replace(/\s/g, '')
                .replace(/\u00A0/g, '')
                .replace(/[^\d,.+-]/g, '')
                .replace(',', '.');
            
            if ((clean.match(/\./g) || []).length > 1) {
                const parts = clean.split('.');
                clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
            }
            
            amountValue = parseFloat(clean);
          }

          if (isNaN(amountValue) || amountValue === 0) continue;

          const amount = Math.abs(amountValue);
          const type = amountValue < 0 ? 'expense' : 'income';

          // 3. Данные для категоризации
          const rawNoteStr = colNote !== -1 && row[colNote] !== undefined ? String(row[colNote]).trim() : '';
          const rawCatStr = colCategory !== -1 && row[colCategory] !== undefined ? String(row[colCategory]).trim() : '';
          const rawMCC = colMCC !== -1 && row[colMCC] !== undefined ? String(row[colMCC]).trim() : undefined;

          const rawMerchantRef = rawNoteStr || rawCatStr || 'Банковская операция';
          const finalNote = cleanMerchantName(rawMerchantRef, learnedRules);

          // 4. Проверка на дубликат (УЛУЧШЕННАЯ)
          const importDateStr = date.split('T')[0];
          const importRawLower = rawMerchantRef.toLowerCase().replace(/\s/g, '');

          // Ищем совпадение в базе, которое еще НЕ было использовано для матчинга в этом проходе
          const duplicateMatch = existingTransactions.find(tx => {
             if (matchedExistingIds.has(tx.id)) return false; // Уже сматчили с другой строкой

             const txDateStr = new Date(tx.date).toISOString().split('T')[0];
             if (txDateStr !== importDateStr) return false;
             
             if (Math.abs(tx.amount - amount) > 0.01) return false;
             if (tx.type !== type) return false;

             const txRawLower = (tx.rawNote || tx.note || '').toLowerCase().replace(/\s/g, '');
             return txRawLower === importRawLower;
          });

          if (duplicateMatch) {
            // Помечаем транзакцию как "найденную", чтобы следующая такая же строка в файле не сматчилась с ней же
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
