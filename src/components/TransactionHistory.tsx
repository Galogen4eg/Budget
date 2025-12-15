import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  TextField,
  Box
} from '@mui/material';
import { Transaction } from '../types';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onRowClick: (transaction: Transaction) => void;
  defaultPeriod: string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, onRowClick, defaultPeriod }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Фильтрация транзакций по поисковому запросу
  const filteredTransactions = transactions.filter(transaction => 
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card sx={{ boxShadow: 'var(--shadow)', borderRadius: '8px' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          История операций
        </Typography>
        
        <Box mb={2}>
          <TextField
            fullWidth
            label="Поиск операций..."
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>
        
        <TableContainer component={Paper} sx={{ maxHeight: 400, boxShadow: 'none', borderRadius: '8px' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Категория</TableCell>
                <TableCell>Описание</TableCell>
                <TableCell align="right">Сумма</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow 
                  key={transaction.id} 
                  onClick={() => onRowClick(transaction)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <TableCell>{transaction.date.toLocaleDateString('ru-RU')}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell align="right" sx={{ color: transaction.type === 'income' ? '#06d6a0' : '#ef476f' }}>
                    {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString('ru-RU')} ₽
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;