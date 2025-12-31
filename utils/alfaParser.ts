
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
            date: ['дата', 'date', 'операци', 'день'],
            time: ['время', 'time'],
            amount: ['сумма', 'amount', 'sum', 'приход', 'расход', 'rub', 'руб'],
            note: ['описание', 'note', 'назначение', 'детали', 'комментарий', 'место', 'merchant'],
          };

          for (let i = 0; i < Math.min(json.length, 30); i++) {
            const row = json[i].map(c => String(c).toLowerCase());
            const hasDate = row.some(c => keywords.date.some(k => c.includes(k)));
            const hasAmount = row.some(c => keywords.amount.some(k => c.includes(k)));
            
            if (hasDate && hasAmount) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex === -1) {
            for (let i = 0; i < Math.min(json.length, 20); i++) {
                const row = json[i];
                const hasSomethingLikeDate = row.some(c => /\d{2}[./-]\d{2}[./-]\d{2,4}/.test(String(c)));
                const hasSomethingLikeAmount = row.some(c => /^-?\d+([.,]\d{1,2})?$/.test(String(c).replace(/\s/g, '')));
                if (hasSomethingLikeDate && hasSomethingLikeAmount) {
                    headerRowIndex = i - 1; 
                    if (headerRowIndex < 0) headerRowIndex = 0;
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
              // If it's an Excel date, it often already contains the time
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
            
            // If the dateObj still has 00:00:00 after check, and it's from a statement, 
            // we keep it, but we use the timestamp for duplicate detection.
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

            const rawNote = colNote !== -1 ? String(row[colNote]).trim() : "";
            if (!rawNote && amount === 0) continue;

            let type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense';
            const headerName = headers[colAmount];
            if (headerName.includes('расход') || headerName.includes('списан') || headerName.includes('оплата')) {
               type = 'expense';
            }

            const absAmount = Math.abs(amount);
            const note = cleanMerchantName(rawNote, learnedRules);
            const categoryId = getSmartCategory(rawNote, learnedRules, categories);

            // Precision duplicate detection (within 1 second)
            const isDuplicate = existingTransactions.some(ex => {
              const d1 = new Date(ex.date).getTime();
              const d2 = new Date(dateStr).getTime();
              return Math.abs(d1 - d2) < 1000 && 
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
