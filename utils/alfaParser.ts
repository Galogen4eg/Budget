
import * as XLSX from 'xlsx';
import { Transaction, AppSettings } from '../types';
import { CATEGORIES } from '../constants';

export const parseAlfaStatement = (
  file: File, 
  mapping: AppSettings['alfaMapping'],
  defaultMemberId: string
): Promise<Omit<Transaction, 'id'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const transactions: Omit<Transaction, 'id'>[] = [];
        
        let headerIndex = -1;
        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          if (row.some((cell: any) => String(cell).toLowerCase().includes('дата'))) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1) throw new Error("Не удалось найти заголовки в выписке");

        const headers = json[headerIndex].map((h: any) => String(h).toLowerCase());
        const colDate = headers.findIndex((h: string) => h.includes(mapping.date));
        const colAmount = headers.findIndex((h: string) => h.includes(mapping.amount));
        const colCategory = headers.findIndex((h: string) => h.includes(mapping.category));
        const colNote = headers.findIndex((h: string) => h.includes(mapping.note));

        for (let i = headerIndex + 1; i < json.length; i++) {
          const row = json[i];
          if (!row[colDate]) continue;

          const dateStr = String(row[colDate]);
          const [day, month, year] = dateStr.split('.').map(Number);
          const date = new Date(year, month - 1, day).toISOString();

          const rawAmountStr = String(row[colAmount]).replace(',', '.').replace(/\s/g, '');
          const rawAmount = parseFloat(rawAmountStr);
          const amount = Math.abs(rawAmount);
          const type = rawAmount < 0 ? 'expense' : 'income';

          const alfaCategory = String(row[colCategory]).toLowerCase();
          const categoryObj = CATEGORIES.find(c => 
            alfaCategory.includes(c.label.toLowerCase())
          );

          transactions.push({
            amount,
            type,
            category: categoryObj?.id || 'other',
            memberId: defaultMemberId,
            note: String(row[colNote] || ''),
            date
          });
        }
        resolve(transactions);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};
