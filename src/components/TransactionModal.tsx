import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Box
} from '@mui/material';
import { Transaction } from '../types';

interface TransactionModalProps {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  open, 
  transaction, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState<Omit<Transaction, 'id' | 'balanceAfter'>>({
    roomId: 'room1',
    date: new Date(),
    type: 'expense',
    amount: 0,
    category: '',
    description: ''
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        roomId: transaction.roomId,
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description
      });
    } else {
      setFormData({
        roomId: 'room1',
        date: new Date(),
        type: 'expense',
        amount: 0,
        category: '',
        description: ''
      });
    }
  }, [transaction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? Number(value) : value
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      date: new Date(e.target.value)
    }));
  };

  const handleTypeChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setFormData(prev => ({
      ...prev,
      type: e.target.value as 'income' | 'expense'
    }));
  };

  const handleSubmit = () => {
    if (!transaction) {
      // Новая транзакция
      const newTransaction: Transaction = {
        ...formData,
        id: Date.now().toString(),
        balanceAfter: 0 // будет рассчитано при сохранении
      };
      onSave(newTransaction);
    } else {
      // Обновление существующей транзакции
      const updatedTransaction: Transaction = {
        ...transaction,
        ...formData
      };
      onSave(updatedTransaction);
    }
    onClose();
  };

  // Предопределенные категории
  const categories = [
    'Продукты', 'Транспорт', 'ЖКХ', 'Развлечения', 'Здоровье', 
    'Образование', 'Одежда', 'Подарки', 'Другое'
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {transaction ? 'Редактировать транзакцию' : 'Добавить транзакцию'}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Тип</InputLabel>
            <Select
              value={formData.type}
              label="Тип"
              onChange={handleTypeChange}
            >
              <MenuItem value="income">Доход</MenuItem>
              <MenuItem value="expense">Расход</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Дата"
            type="date"
            value={formData.date.toISOString().split('T')[0]}
            onChange={handleDateChange}
            InputLabelProps={{
              shrink: true,
            }}
          />
          
          <TextField
            label="Сумма"
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            InputProps={{ inputProps: { min: 0 } }}
          />
          
          <FormControl fullWidth>
            <InputLabel>Категория</InputLabel>
            <Select
              name="category"
              value={formData.category}
              label="Категория"
              onChange={handleChange}
            >
              {categories.map((category, index) => (
                <MenuItem key={index} value={category}>{category}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Описание"
            name="description"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={2}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={formData.amount <= 0 || !formData.category}
        >
          {transaction ? 'Сохранить' : 'Добавить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionModal;