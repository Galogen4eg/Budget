
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
        let errors: string[] = [];

        // Проходим по всем листам, так как данные могут быть не на первом
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

          if (!json || json.length < 2) continue;

          // --- 1. Поиск заголовков ---
          let headerRowIndex = -1;
          const keywords = {
            date: ['дата', 'date', 'время', 'time', 'операци', 'день'],
            amount: ['сумма', 'amount', 'sum', 'приход', 'расход', 'списано', 'зачислено', 'rub', 'руб'],
            note: ['описание', 'note', 'назначение', 'детали', 'комментарий', 'место', 'merchant'],
          };

          // Ищем строку заголовков (обычно в первых 30 строках)
          for (let i = 0; i < Math.min(json.length, 30); i++) {
            const row = json[i].map(c => String(c).toLowerCase());
            const hasDate = row.some(c => keywords.date.some(k => c.includes(k)));
            const hasAmount = row.some(c => keywords.amount.some(k => c.includes(k)));
            
            if (hasDate && hasAmount) {
              headerRowIndex = i;
              break;
            }
          }

          // Если заголовки не найдены методом ключевых слов, попробуем найти первую строку, 
          // где есть дата и число в разных колонках (эвристика)
          if (headerRowIndex === -1) {
            for (let i = 0; i < Math.min(json.length, 20); i++) {
                const row = json[i];
                const hasSomethingLikeDate = row.some(c => /\d{2}[./-]\d{2}[./-]\d{2,4}/.test(String(c)));
                const hasSomethingLikeAmount = row.some(c => /^-?\d+([.,]\d{1,2})?$/.test(String(c).replace(/\s/g, '')));
                if (hasSomethingLikeDate && hasSomethingLikeAmount) {
                    headerRowIndex = i - 1; // Предполагаем, что заголовки строкой выше
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
          const colAmount = findCol(mapping.amount, keywords.amount);
          const colNote = findCol(mapping.note, keywords.note);

          if (colDate === -1 || colAmount === -1) continue;

          // --- 2. Парсинг строк ---
          for (let i = headerRowIndex + 1; i < json.length; i++) {
            const row = json[i];
            if (!row || row.length <= Math.max(colDate, colAmount)) continue;

            // Дата
            let dateStr = "";
            const rawDate = row[colDate];
            if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
              dateStr = rawDate.toISOString();
            } else {
              const s = String(rawDate).trim();
              if (!s) continue;
              // Попытка распарсить DD.MM.YYYY
              const parts = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
              if (parts) {
                const d = parseInt(parts[1]);
                const m = parseInt(parts[2]) - 1;
                let y = parseInt(parts[3]);
                if (y < 100) y += 2000;
                const dateObj = new Date(y, m, d, 12, 0, 0);
                if (!isNaN(dateObj.getTime())) dateStr = dateObj.toISOString();
              }
            }

            if (!dateStr) continue;

            // Сумма
            let amount = 0;
            const rawAmount = row[colAmount];
            if (typeof rawAmount === 'number') {
              amount = rawAmount;
            } else {
              // Очистка строки: удаляем пробелы, nbsp, валюты. Заменяем запятую на точку.
              let clean = String(rawAmount)
                .replace(/\s/g, '')
                .replace(/\u00A0/g, '')
                .replace(/[^\d.,-]/g, '')
                .replace(',', '.');
              amount = parseFloat(clean);
            }

            if (isNaN(amount) || amount === 0) continue;

            // Описание
            const rawNote = colNote !== -1 ? String(row[colNote]).trim() : "";
            if (!rawNote && amount === 0) continue;

            let type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense';
            
            // Некоторые банки пишут расходы как положительные числа в колонке "Расход"
            const headerName = headers[colAmount];
            if (headerName.includes('расход') || headerName.includes('списан') || headerName.includes('оплата')) {
               type = 'expense';
            }

            const absAmount = Math.abs(amount);
            const note = cleanMerchantName(rawNote, learnedRules);
            const categoryId = getSmartCategory(rawNote, learnedRules, categories);

            // Проверка на дубликат
            const isDuplicate = existingTransactions.some(ex => {
              const d1 = new Date(ex.date).setHours(0,0,0,0);
              const d2 = new Date(dateStr).setHours(0,0,0,0);
              return d1 === d2 && 
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
          throw new Error("Новых уникальных операций не найдено. Проверьте формат файла или выберите другой период.");
        }

        resolve(allParsedTransactions);

      } catch (err) {
        console.error("Parse Error:", err);
        reject(err instanceof Error ? err : new Error("Ошибка при чтении файла"));
      }
    };

    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsArrayBuffer(file);
  });
};
