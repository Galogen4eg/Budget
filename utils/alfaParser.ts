
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

        const dateKeywords = ['дата', 'date', 'transaction date', 'время'];
        const amountKeywords = ['сумма', 'amount', 'сумма операции', 'sum', 'приход', 'расход', 'дебет', 'кредит', 'списано', 'зачислено', 'value'];
        const noteKeywords = ['описание', 'note', 'назначение', 'реквизиты', 'контрагент', 'details'];
        const mccKeywords = ['mcc', 'мсс', 'код категории'];
        const catKeywords = ['категория', 'category', 'тип', 'группа'];

        for (let i = 0; i < Math.min(json.length, 50); i++) {
          const row = json[i];
          if (!row || !Array.isArray(row)) continue;

          let currentScore = 0;
          const rowStrings = row.map(cell => String(cell || '').toLowerCase());

          if (rowStrings.some(s => dateKeywords.some(k => s.includes(k)))) currentScore += 2;
          if (rowStrings.some(s => amountKeywords.some(k => s.includes(k)))) currentScore += 2;
          if (rowStrings.some(s => noteKeywords.some(k => s.includes(k)))) currentScore += 1.5;

          if (currentScore > maxScore) {
            maxScore = currentScore;
            bestHeaderRowIndex = i;
          }
        }

        if (bestHeaderRowIndex === -1 || maxScore < 3) {
          throw new Error("Не удалось надежно определить заголовки столбцов.");
        }

        const rawHeaders = json[bestHeaderRowIndex];
        const headers = rawHeaders.map(h => (h !== null && h !== undefined) ? String(h).toLowerCase().trim() : "");
        
        const findCol = (userTerm: string, defaultTerms: string[]) => {
          const terms = [userTerm.toLowerCase(), ...defaultTerms.map(t => t.toLowerCase())];
          return headers.findIndex(h => {
            if (!h) return false;
            return terms.some(t => h === t || h.includes(t));
          });
        };

        const colDate = findCol(mapping.date, dateKeywords);
        const colAmount = findCol(mapping.amount, amountKeywords);
        const colCategory = findCol(mapping.category, catKeywords);
        const colNote = findCol(mapping.note, noteKeywords);
        const colMCC = findCol('', mccKeywords);

        if (colDate === -1 || colAmount === -1) {
          throw new Error(`Не найдены обязательные столбцы.`);
        }

        const transactions: Omit<Transaction, 'id'>[] = [];

        for (let i = bestHeaderRowIndex + 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row[colDate] === null || row[colDate] === undefined) continue;

          // 1. Дата
          let date: string;
          const rawDate = row[colDate];
          try {
            if (typeof rawDate === 'number') {
              date = new Date((rawDate - 25569) * 86400 * 1000).toISOString();
            } else {
              const s = String(rawDate).trim();
              if (!s) continue;
              const parts = s.split(/[./-]/);
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).toISOString();
                } else {
                  const d = parseInt(parts[0], 10);
                  const m = parseInt(parts[1], 10);
                  const y = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
                  date = new Date(y, m - 1, d).toISOString();
                }
              } else {
                date = new Date(s).toISOString();
              }
            }
          } catch (e) { continue; }

          // 2. Сумма
          let amountValue = 0;
          const rawAmount = row[colAmount];
          if (typeof rawAmount === 'number') {
            amountValue = rawAmount;
          } else {
            const clean = String(rawAmount || '0').replace(/[^\d,.+-]/g, '').replace(',', '.');
            amountValue = parseFloat(clean);
          }

          if (isNaN(amountValue) || amountValue === 0) continue;

          const amount = Math.abs(amountValue);
          const type = amountValue < 0 ? 'expense' : 'income';

          // 3. Данные для категоризации и очистки
          const rawNoteStr = colNote !== -1 && row[colNote] !== undefined ? String(row[colNote]).trim() : '';
          const rawCatStr = colCategory !== -1 && row[colCategory] !== undefined ? String(row[colCategory]).trim() : '';
          const rawMCC = colMCC !== -1 && row[colMCC] !== undefined ? String(row[colMCC]).trim() : undefined;

          // Ключевое сырое название для обучения
          const rawMerchantRef = rawNoteStr || rawCatStr || 'Банковская операция';

          // Интеллектуальная очистка названия с учетом обученных правил
          const finalNote = cleanMerchantName(rawMerchantRef, learnedRules);

          // Проверка на дубликат (Улучшенная)
          const isDuplicate = existingTransactions.some(tx => {
             // Сравниваем даты (только YYYY-MM-DD)
             const txDate = new Date(tx.date).toISOString().split('T')[0];
             const importDate = new Date(date).toISOString().split('T')[0];
             
             if (txDate !== importDate) return false;
             if (Math.abs(tx.amount - amount) > 0.01) return false;
             if (tx.type !== type) return false;

             // Если есть исходный сырой текст (rawNote) в существующей транзакции, сравниваем с ним
             // Это самый надежный способ отсечь повторный импорт того же файла
             if (tx.rawNote && rawMerchantRef) {
                // Удаляем лишние пробелы для надежности
                return tx.rawNote.replace(/\s+/g, '').toLowerCase() === rawMerchantRef.replace(/\s+/g, '').toLowerCase();
             }

             // Иначе сравниваем очищенные имена
             return tx.note.toLowerCase() === finalNote.toLowerCase();
          });

          if (isDuplicate) continue;

          // Умная категория с учетом обученных правил
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
        reject(err instanceof Error ? err : new Error("Ошибка при парсинге"));
      }
    };

    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsArrayBuffer(file);
  });
};
