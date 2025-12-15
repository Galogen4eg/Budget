import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper 
} from '@mui/material';
import { Transaction } from '../types';

interface TransactionPreviewModalProps {
  open: boolean;
  transactions: Transaction[];
  onClose: () => void;
  onConfirm: () => void;
}

const TransactionPreviewModal: React.FC<TransactionPreviewModalProps> = ({ 
  open, 
  transactions, 
  onClose, 
  onConfirm 
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Предварительный просмотр транзакций</DialogTitle>
      <DialogContent dividers>
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Категория</TableCell>
                <TableCell>Описание</TableCell>
                <TableCell align="right">Сумма</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.slice(0, 10).map((transaction, index) => (
                <TableRow key={transaction.id || index}>
                  <TableCell>{transaction.date.toLocaleDateString('ru-RU')}</TableCell>
                  <TableCell>
                    <span style={{ 
                      color: transaction.type === 'income' ? '#06d6a0' : '#ef476f',
                      fontWeight: 'bold'
                    }}>
                      {transaction.type === 'income' ? 'Доход' : 'Расход'}
                    </span>
                  </TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell align="right" style={{ 
                    color: transaction.type === 'income' ? '#06d6a0' : '#ef476f' 
                  }}>
                    {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString('ru-RU')} ₽
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length > 10 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    И еще {transactions.length - 10} транзакций...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button 
          variant="contained" 
          onClick={onConfirm}
          disabled={transactions.length === 0}
        >
          Импортировать транзакции
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionPreviewModal;