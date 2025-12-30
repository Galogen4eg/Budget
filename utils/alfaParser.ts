
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

        // Читаем книгу. cellDates: true помогает автоматически парсить даты в Excel
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'dd.mm.yyyy' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Получаем сырые данные (массив массивов)
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

        if (!json || json.length === 0) throw new Error("Файл пуст");

        // --- 1. Поиск заголовков ---
        let bestHeaderRowIndex = -1;
        let maxScore = 0;

        const keywords = {
            date: ['дата', 'date', 'время', 'time', 'проводка', 'операци', 'транзакц', 'день'],
            amount: ['сумма', 'amount', 'sum', 'приход', 'расход', 'обороты', 'списано', 'зачислено', 'rub', 'руб', 'rur', 'currency', 'value'],
            note: ['описание', 'note', 'назначение', 'основание', 'детали', 'комментарий', 'место', 'merchant', 'details', 'name'],
            category: ['категория', 'category', 'мсс', 'mcc', 'код']
        };

        // Ищем строку с заголовками в первых 20 строках
        for (let i = 0; i < Math.min(json.length, 20); i++) {
          const row = json[i];
          if (!Array.isArray(row)) continue;
          
          let score = 0;
          const rowStr = row.map(c => String(c).toLowerCase());
          
          if (rowStr.some(c => keywords.date.some(k => c.includes(k)))) score += 3;
          if (rowStr.some(c => keywords.amount.some(k => c.includes(k)))) score += 3;
          if (rowStr.some(c => keywords.note.some(k => c.includes(k)))) score += 1;

          if (score > maxScore) {
            maxScore = score;
            bestHeaderRowIndex = i;
          }
        }

        // Если заголовки не найдены явно, предполагаем 0-ю строку или пытаемся угадать по данным
        if (bestHeaderRowIndex === -1 || maxScore < 3) {
            console.warn("Заголовки не найдены явно. Пробуем определить колонки по типам данных.");
            bestHeaderRowIndex = 0; 
        }

        const headers = json[bestHeaderRowIndex].map((h: any) => String(h).toLowerCase().trim());

        // Функция поиска индекса колонки
        const findCol = (userKey: string, keys: string[]) => {
            if (userKey) {
                const idx = headers.findIndex((h: string) => h === userKey.toLowerCase());
                if (idx !== -1) return idx;
            }
            // Точное совпадение
            let idx = headers.findIndex((h: string) => keys.some(k => h === k));
            if (idx !== -1) return idx;
            // Частичное совпадение
            return headers.findIndex((h: string) => keys.some(k => h.includes(k)));
        };

        const colDate = findCol(mapping.date, keywords.date);
        const colAmount = findCol(mapping.amount, keywords.amount);
        const colNote = findCol(mapping.note, keywords.note);
        const colCategory = findCol(mapping.category, keywords.category);

        if (colDate === -1 || colAmount === -1) {
            // Фолбек: если не нашли заголовки, пробуем 1-ю (дата) и 2-ю (сумма) колонки, если это CSV без заголовков
            if (colDate === -1 && json[0] && json[0].length >= 2) {
                 // Опасное предположение, но лучше чем ошибка
            } else {
                 throw new Error("Не удалось определить колонки 'Дата' и 'Сумма'. Проверьте файл.");
            }
        }

        const transactions: Omit<Transaction, 'id'>[] = [];
        
        // --- 2. Парсинг данных ---
        for (let i = bestHeaderRowIndex + 1; i < json.length; i++) {
            const row = json[i];
            if (!row || row.length === 0) continue;

            // -- Парсинг Даты --
            const rawDate = row[colDate];
            let dateStr: string | null = null;

            if (rawDate instanceof Date) {
                // Если XLSX сам распарсил дату
                // Корректируем смещение часового пояса, чтобы дата осталась той же
                const offset = rawDate.getTimezoneOffset() * 60000;
                dateStr = new Date(rawDate.getTime() - offset).toISOString();
            } else if (typeof rawDate === 'string' && rawDate.length > 5) {
                // Пытаемся распарсить строку
                // Форматы: DD.MM.YYYY, DD/MM/YYYY, DD.MM.YY, YYYY-MM-DD
                // Добавляем время если есть
                try {
                    // Очистка от лишних символов
                    let s = rawDate.trim();
                    
                    // Регулярка для DD.MM.YYYY или DD.MM.YY (с временем или без)
                    const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?/);
                    
                    if (dmy) {
                        const day = parseInt(dmy[1]);
                        const month = parseInt(dmy[2]) - 1;
                        let year = parseInt(dmy[3]);
                        if (year < 100) year += 2000; // 24 -> 2024

                        const hr = dmy[4] ? parseInt(dmy[4]) : 12; // Если времени нет, ставим 12:00
                        const min = dmy[5] ? parseInt(dmy[5]) : 0;
                        const sec = dmy[6] ? parseInt(dmy[6]) : 0;

                        const d = new Date(year, month, day, hr, min, sec);
                        const offset = d.getTimezoneOffset() * 60000;
                        dateStr = new Date(d.getTime() - offset).toISOString();
                    } else {
                        // Пробуем нативный парсер
                        const d = new Date(s);
                        if (!isNaN(d.getTime())) {
                            dateStr = d.toISOString();
                        }
                    }
                } catch (e) {
                    console.warn(`Row ${i}: Date parse fail`, rawDate);
                }
            }

            if (!dateStr) continue; // Пропускаем строки без валидной даты

            // -- Парсинг Суммы --
            const rawAmount = row[colAmount];
            let amount = 0;
            let type: 'income' | 'expense' = 'expense';

            if (typeof rawAmount === 'number') {
                amount = rawAmount;
            } else if (typeof rawAmount === 'string') {
                // Очистка: удаляем всё кроме цифр, минуса, точки и запятой
                // Заменяем запятую на точку
                // Удаляем пробелы (включая nbsp)
                let clean = rawAmount.replace(/\s/g, '').replace(/\u00A0/g, '').replace(/[^\d.,-]/g, '');
                clean = clean.replace(',', '.');
                
                // Если несколько точек, оставляем последнюю (для 1.200.00)
                if ((clean.match(/\./g) || []).length > 1) {
                    const parts = clean.split('.');
                    clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
                }
                amount = parseFloat(clean);
            }

            if (isNaN(amount) || amount === 0) continue;

            // Определяем тип по знаку
            if (amount > 0) {
                // Иногда банки пишут списание как положительное число в колонке "Расход"
                // Проверяем имя колонки, если оно явно "Расход" или "Списание", то это трата
                const headerName = headers[colAmount] || '';
                if (headerName.includes('расход') || headerName.includes('списан') || headerName.includes('debit')) {
                    type = 'expense';
                } else {
                    type = 'income'; // По умолчанию положительное - доход
                }
            } else {
                type = 'expense';
                amount = Math.abs(amount);
            }

            // -- Описание и Категория --
            const rawNote = colNote !== -1 ? String(row[colNote]).trim() : '';
            const rawCat = colCategory !== -1 ? String(row[colCategory]).trim() : '';
            
            // Собираем полную строку для анализа
            const fullDesc = [rawNote, rawCat].filter(Boolean).join(' ');
            if (!fullDesc && !rawCat) continue; // Если нет ни описания, ни категории - мусор

            const note = cleanMerchantName(fullDesc, learnedRules);
            const categoryId = getSmartCategory(fullDesc, learnedRules, categories, undefined, rawCat);

            // -- Проверка на дубликат (Soft Check) --
            // Мы не фильтруем тут жестко, так как пользователь мог удалить данные
            // Но если транзакции переданы в функцию, фильтруем
            if (existingTransactions.length > 0) {
                const txDatePart = dateStr.split('T')[0];
                const isDuplicate = existingTransactions.some(ex => {
                    const exDatePart = new Date(ex.date).toISOString().split('T')[0];
                    // Совпадение даты, суммы, типа и (примерно) описания
                    return exDatePart === txDatePart && 
                           Math.abs(ex.amount - amount) < 0.01 && 
                           ex.type === type &&
                           (ex.rawNote?.slice(0, 10) === fullDesc.slice(0, 10));
                });
                if (isDuplicate) continue;
            }

            transactions.push({
                amount,
                type,
                category: categoryId,
                memberId: defaultMemberId,
                note,
                date: dateStr,
                rawNote: fullDesc
            });
        }

        resolve(transactions);

      } catch (err) {
        console.error("Critical Parse Error:", err);
        reject(err instanceof Error ? err : new Error("Неизвестная ошибка парсинга"));
      }
    };

    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsArrayBuffer(file);
  });
};
