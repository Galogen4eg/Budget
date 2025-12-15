import React, { useState } from 'react';
import { 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Box
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { RecurringTransaction } from '../types';

interface RecurringTransactionsListProps {
  items: RecurringTransaction[];
  onAdd: (item: RecurringTransaction) => void;
  onEdit: (item: RecurringTransaction) => void;
  onDelete: (id: string) => void;
}

const RecurringTransactionsList: React.FC<RecurringTransactionsListProps> = ({ 
  items, 
  onAdd, 
  onEdit, 
  onDelete 
}) => {
  const [openModal, setOpenModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<RecurringTransaction | null>(null);
  const [formData, setFormData] = useState<Omit<RecurringTransaction, 'id'>>({
    roomId: 'room1',
    name: '',
    amount: 0,
    category: '',
    dayOfMonth: 1
  });

  const handleOpenAdd = () => {
    setCurrentItem(null);
    setFormData({
      roomId: 'room1',
      name: '',
      amount: 0,
      category: '',
      dayOfMonth: 1
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (item: RecurringTransaction) => {
    setCurrentItem(item);
    setFormData({
      roomId: item.roomId,
      name: item.name,
      amount: item.amount,
      category: item.category,
      dayOfMonth: item.dayOfMonth
    });
    setOpenModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' || name === 'dayOfMonth' ? Number(value) : value
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || formData.amount <= 0 || !formData.category) {
      return;
    }

    if (currentItem) {
      // Обновление существующей траты
      onEdit({ ...currentItem, ...formData });
    } else {
      // Добавление новой траты
      onAdd({ ...formData, id: Date.now().toString() } as RecurringTransaction);
    }
    setOpenModal(false);
  };

  // Предопределенные категории
  const categories = [
    'Продукты', 'Транспорт', 'ЖКХ', 'Развлечения', 'Здоровье', 
    'Образование', 'Одежда', 'Подарки', 'Другое'
  ];

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
        >
          Добавить обязательную трату
        </Button>
      </Box>
      
      <List>
        {items.map((item) => (
          <ListItem key={item.id} disableGutters>
            <ListItemText 
              primary={`${item.name}: ${item.amount} ₽`} 
              secondary={`Категория: ${item.category}, День: ${item.dayOfMonth}`} 
            />
            <ListItemSecondaryAction>
              <IconButton 
                edge="end" 
                aria-label="edit" 
                onClick={() => handleOpenEdit(item)}
              >
                <EditIcon />
              </IconButton>
              <IconButton 
                edge="end" 
                aria-label="delete" 
                color="error"
                onClick={() => onDelete(item.id)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
      
      {/* Модальное окно для добавления/редактирования */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentItem ? 'Редактировать трату' : 'Добавить обязательную трату'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
            <TextField
              label="Название траты"
              name="name"
              value={formData.name}
              onChange={handleChange}
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
              label="День месяца"
              type="number"
              name="dayOfMonth"
              value={formData.dayOfMonth}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 1, max: 31 } }}
              helperText="Число от 1 до 31"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Отмена</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!formData.name || formData.amount <= 0 || !formData.category}
          >
            {currentItem ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RecurringTransactionsList;