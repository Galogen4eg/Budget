import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';

interface Transaction {
  id: string;
  date: Date;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  onRowClick: (transaction: Transaction) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, onRowClick }) => {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
            <TableCell>Дата</TableCell>
            <TableCell>Категория</TableCell>
            <TableCell>Описание</TableCell>
            <TableCell align="right">Сумма</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow 
              key={transaction.id} 
              hover 
              onClick={() => onRowClick(transaction)}
              sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f0f7ff' } }}
            >
              <TableCell>{transaction.date.toLocaleDateString('ru-RU')}</TableCell>
              <TableCell>
                <Chip 
                  label={transaction.category} 
                  size="small" 
                  sx={{ 
                    backgroundColor: transaction.type === 'income' ? '#e6f7ed' : '#ffebee',
                    color: transaction.type === 'income' ? '#06d6a0' : '#ef476f',
                    fontWeight: 500,
                    border: `1px solid ${transaction.type === 'income' ? '#06d6a0' : '#ef476f'}20`
                  }} 
                />
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 500, color: transaction.type === 'income' ? '#06d6a0' : '#ef476f' }}>
                {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString('ru-RU')} ₽
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TransactionHistory;