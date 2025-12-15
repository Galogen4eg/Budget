import React, { useState } from 'react';
import { Button, Box, Typography } from '@mui/material';
import * as XLSX from 'xlsx';
import { Transaction } from '../types';

interface ExcelUploadProps {
  onTransactionsParsed: (transactions: Transaction[]) => void;
}

const ExcelUpload: React.FC<ExcelUploadProps> = ({ onTransactionsParsed }) => {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // Строки с 20-й (индекс 19)
      const transactions = rows.slice(19).map((row: any, index: number) => {
        const date = parseDate(row[0]); // Столбец A
        const category = row[3];        // Столбец D
        const description = row[4];     // Столбец E
        const amount = parseFloat(String(row[5]).replace(',', '.').replace(/\s/g, '')); // Столбец F
        
        // Определение типа операции
        const type = /зарплата|поступление/i.test(String(description)) ? 'income' : 'expense';
        
        return {
          id: `excel-${Date.now()}-${index}`,
          roomId: 'room1', // будет обновлено при сохранении
          date: date || new Date(),
          type,
          amount: isNaN(amount) ? 0 : amount,
          category: String(category || ''),
          description: String(description || ''),
          balanceAfter: 0 // будет рассчитано позже
        } as Transaction;
      }).filter((tx: Transaction) => tx.date && !isNaN(tx.amount) && tx.amount > 0);

      onTransactionsParsed(transactions);
    };
    reader.readAsArrayBuffer(file);
  };

  // Вспомогательная функция для парсинга даты из Excel
  const parseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    
    // Если это уже объект даты
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // Если это строка даты
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Если это число (как в Excel)
    if (typeof dateValue === 'number') {
      // Excel даты основаны на 1900-01-01
      const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
      if (!isNaN(excelDate.getTime())) {
        return excelDate;
      }
    }
    
    return null;
  };

  return (
    <Box>
      <input
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
        id="excel-upload"
        type="file"
        onChange={handleFileChange}
      />
      <label htmlFor="excel-upload">
        <Button 
          variant="contained" 
          color="secondary" 
          component="span"
          sx={{ marginBottom: 2 }}
        >
          Загрузить выписку (Excel)
        </Button>
      </label>
      {fileName && (
        <Typography variant="body2" color="textSecondary">
          Выбран файл: {fileName}
        </Typography>
      )}
    </Box>
  );
};

export default ExcelUpload;