
import * as XLSX from 'xlsx';
import { Transaction, AppSettings, LearnedRule, Category } from '../types';
import { getSmartCategory, cleanMerchantName } from './categorizer';

/**
 * Alfa exports positive amounts for both debits and credits.
 * Determine direction from the explicit "Тип" column, never from amount sign alone.
 * Unknown directions must stop import rather than corrupt the budget.
 */
export const classifyAlfaDirection = (
  rawType: unknown,
  amount: number,
  amountHeader: string,
  hasTypeColumn: boolean
): 'income' | 'expense' => {
  const type = String(rawType ?? '').trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
  const header = amountHeader.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');

  const expense = /(?:^|[\\s,;:/()_-])(расход(?:ы|ная)?|списани[ея]|списано|покупк[аиуы]?|оплат[аы]|сняти[ея]|выдач[аеи]|debit|expense|outgoing)(?=$|[\\s,;:/()_-])/iu;
  const income = /(?:^|[\\s,;:/()_-])(доход(?:ы)?|приход|зачислени[ея]|пополнени[ея]|поступлени[ея]|возврат|кешбек|cashback|credit|income|incoming)(?=$|[\\s,;:/()_-])/iu;

  const isExpense = expense.test(type);
  const isIncome = income.test(type);
  if (isExpense !== isIncome) return isExpense ? 'expense' : 'income';
  if (hasTypeColumn) throw new Error('Неизвестное или неоднозначное значение столбца «Тип». Импорт остановлен.');

  if (amount < 0) return 'expense';
  if (/расход|списан/.test(header)) return 'expense';
  if (/приход|зачислен/.test(header)) return 'income';
  throw new Error('Не удалось определить направление операции: нет столбца «Тип». Импорт остановлен.');
};

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

        const workbook = XLSX.read(data, { 
          type: 'array', 
          cellDates: true, 
          dateNF: 'dd.mm.yyyy',
          cellText: false,
          cellNF: true
        });

        let allParsedTransactions: Omit<Transaction, 'id'>[] = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

          if (!json || json.length < 2) continue;

          let headerRowIndex = -1;
          const keywords = {
            date: ['дата', 'date', 'операци', 'день', 'время'],
            time: ['время', 'time'],
            amount: ['сумма', 'amount', 'sum', 'приход', 'расход', 'rub', 'руб', 'платёж'],
            note: ['описание', 'note', 'назначение', 'детали', 'комментарий', 'место', 'merchant', 'получатель', 'основание'],
          };

          // Find header row by checking for presence of date and amount keywords
          for (let i = 0; i < Math.min(json.length, 30); i++) {
            const row = json[i].map(c => String(c).toLowerCase());
            const hasDate = row.some(c => keywords.date.some(k => c.includes(k)));
            const hasAmount = row.some(c => keywords.amount.some(k => c.includes(k)));
            
            if (hasDate && hasAmount) {
              headerRowIndex = i;
              break;
            }
          }

          // Fallback heuristic: look for data pattern if header not found
          if (headerRowIndex === -1) {
            for (let i = 0; i < Math.min(json.length, 20); i++) {
                const row = json[i];
                const hasSomethingLikeDate = row.some(c => /\d{2}[./-]\d{2}[./-]\d{2,4}/.test(String(c)));
                const hasSomethingLikeAmount = row.some(c => /^-?\d+([.,]\d{1,2})?$/.test(String(c).replace(/\s/g, '')));
                if (hasSomethingLikeDate && hasSomethingLikeAmount) {
                    headerRowIndex = i > 0 ? i - 1 : 0;
                    break;
                }
            }
          }

          if (headerRowIndex === -1) continue;

          const headers = json[headerRowIndex].map((h: any) => String(h).toLowerCase().trim());
          
          const findCol = (pref: string, keys: string[]) => {
            if (pref) {
              const idx = headers.findIndex(h => h === pref.toLowerCase());
              if (idx !== -1) return idx;
            }
            return headers.findIndex(h => keys.some(k => h.includes(k)));
          };

          const colDate = findCol(mapping.date, keywords.date);
          const colTime = findCol(mapping.time, keywords.time);
          const colAmount = findCol(mapping.amount, keywords.amount);
          const colNote = findCol(mapping.note, keywords.note);
          const colType = headers.findIndex(h => h === 'тип' || h === 'тип операции' || h === 'направление операции');

          // If note column not found, find the widest text column as fallback
          let effectiveColNote = colNote;
          if (effectiveColNote === -1 && json.length > headerRowIndex + 5) {
             let maxLen = 0;
             let bestCol = -1;
             for(let c = 0; c < headers.length; c++) {
                 if (c === colDate || c === colAmount) continue;
                 const avgLen = json.slice(headerRowIndex+1, headerRowIndex+6).reduce((sum, row) => sum + String(row[c]||'').length, 0);
                 if (avgLen > maxLen) {
                     maxLen = avgLen;
                     bestCol = c;
                 }
             }
             if (maxLen > 5) effectiveColNote = bestCol;
          }

          if (colDate === -1 || colAmount === -1) continue;

          for (let i = headerRowIndex + 1; i < json.length; i++) {
            const row = json[i];
            if (!row || row.length <= Math.max(colDate, colAmount)) continue;

            let dateObj: Date | null = null;
            const rawDateValue = row[colDate];
            
            // Comprehensive regex for dates and times
            const dateRegex = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/;

            if (rawDateValue instanceof Date && !isNaN(rawDateValue.getTime())) {
              dateObj = new Date(rawDateValue);
            } else {
              const s = String(rawDateValue).trim();
              const parts = s.match(dateRegex);
              if (parts) {
                const d = parseInt(parts[1]);
                const m = parseInt(parts[2]) - 1;
                let y = parseInt(parts[3]);
                if (y < 100) y += 2000;
                
                const h = parts[4] ? parseInt(parts[4]) : 0;
                const min = parts[5] ? parseInt(parts[5]) : 0;
                const sec = parts[6] ? parseInt(parts[6]) : 0;
                
                dateObj = new Date(y, m, d, h, min, sec);
              }
            }

            if (!dateObj || isNaN(dateObj.getTime())) continue;

            if (colTime !== -1 && row[colTime]) {
              const rawTime = String(row[colTime]).trim();
              const tParts = rawTime.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
              if (tParts) {
                dateObj.setHours(parseInt(tParts[1]));
                dateObj.setMinutes(parseInt(tParts[2]));
                dateObj.setSeconds(tParts[3] ? parseInt(tParts[3]) : 0);
              }
            }
            
            const dateStr = dateObj.toISOString();

            let amount = 0;
            const rawAmount = row[colAmount];
            
            if (typeof rawAmount === 'number') {
              amount = rawAmount;
            } else {
              // Robust string cleaning: remove ALL unicode spaces (including \u00A0 & \u202F)
              // This is critical for banks that use thin spaces for thousands
              let clean = String(rawAmount)
                .replace(/[\s\u00A0\u202F\u1680\u180E\u2000-\u200A\u2028\u2029\u205F\u3000]/g, '') 
                .replace(/[^\d.,-]/g, ''); // Keep only digits, dots, commas, minus

              // Handle comma vs dot intelligently
              // If both exist, dot likely thousands separator if RU locale implied or reversed
              // Standard logic: replace comma with dot for float parsing
              if (clean.includes(',') && clean.includes('.')) {
                  // Assuming 1.200,50 -> 1200.50 (EU/RU style)
                  if (clean.indexOf('.') < clean.indexOf(',')) {
                      clean = clean.replace('.', '').replace(',', '.');
                  } else {
                      // 1,200.50 -> 1200.50 (US style)
                      clean = clean.replace(',', '');
                  }
              } else {
                  clean = clean.replace(',', '.');
              }
              
              amount = parseFloat(clean);
            }

            if (isNaN(amount) || amount === 0) continue;

            const rawNote = effectiveColNote !== -1 ? String(row[effectiveColNote] || '').trim() : "Операция";
            
            const type = classifyAlfaDirection(
              colType >= 0 ? row[colType] : '',
              amount,
              headers[colAmount],
              colType >= 0
            );

            const absAmount = Math.abs(amount);
            const note = cleanMerchantName(rawNote, learnedRules);
            const categoryId = getSmartCategory(rawNote, learnedRules, categories);

            const isDuplicate = existingTransactions.some(ex => {
              const d1 = new Date(ex.date).getTime();
              const d2 = new Date(dateStr).getTime();
              return Math.abs(d1 - d2) < 2000 && 
                     Math.abs(ex.amount - absAmount) < 0.01 && 
                     ex.type === type &&
                     (ex.rawNote === rawNote || ex.note === note);
            });

            if (!isDuplicate) {
              allParsedTransactions.push({
                amount: absAmount,
                type,
                category: categoryId,
                memberId: defaultMemberId,
                note,
                date: dateStr,
                rawNote: rawNote
              });
            }
          }
        }

        if (allParsedTransactions.length === 0) {
          throw new Error("Новых уникальных операций не найдено.");
        }

        resolve(allParsedTransactions);

      } catch (err) {
        reject(err instanceof Error ? err : new Error("Ошибка при чтении файла"));
      }
    };

    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsArrayBuffer(file);
  });
};
