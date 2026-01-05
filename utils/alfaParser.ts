
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
                    // Assuming the row ABOVE data is header, or if it's index 0, we treat it as data without header but we need column indices.
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

            // Merge time from a separate column if it exists
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
              let clean = String(rawAmount)
                .replace(/\s/g, '')
                .replace(/\u00A0/g, '')
                .replace(/[^\d.,-]/g, '')
                .replace(',', '.');
              amount = parseFloat(clean);
            }

            if (isNaN(amount) || amount === 0) continue;

            const rawNote = effectiveColNote !== -1 ? String(row[effectiveColNote] || '').trim() : "Операция";
            
            let type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense';
            const headerName = headers[colAmount];
            
            // Heuristic for Sber/Tinkoff statements where expenses might be positive in a "Debit" column
            // or explicitly marked. 
            // Standard: negative is expense.
            if (amount < 0) type = 'expense';
            else if (headerName.includes('расход') || headerName.includes('списан')) type = 'expense';
            else if (headerName.includes('приход') || headerName.includes('зачислен')) type = 'income';

            const absAmount = Math.abs(amount);
            const note = cleanMerchantName(rawNote, learnedRules);
            const categoryId = getSmartCategory(rawNote, learnedRules, categories);

            // Precision duplicate detection (within 1 second)
            const isDuplicate = existingTransactions.some(ex => {
              const d1 = new Date(ex.date).getTime();
              const d2 = new Date(dateStr).getTime();
              return Math.abs(d1 - d2) < 2000 && // widened tolerance to 2s
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
                rawNote: rawNote // Keep original for learning rules
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
