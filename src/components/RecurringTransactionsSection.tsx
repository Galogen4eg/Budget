import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Button, 
  IconButton,
  Box,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number;
}

interface RecurringTransactionsSectionProps {
  items: RecurringTransaction[];
  onAdd: () => void;
  onEdit: (item: RecurringTransaction) => void;
  onDelete: (id: string) => void;
}

const RecurringTransactionsSection: React.FC<RecurringTransactionsSectionProps> = ({ 
  items, 
  onAdd, 
  onEdit, 
  onDelete 
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          Обязательные траты
        </Typography>
        <Button 
          variant="outlined" 
          onClick={onAdd}
          sx={{ textTransform: 'none' }}
        >
          Добавить
        </Button>
      </Box>
      
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
              <TableCell>Название</TableCell>
              <TableCell>Сумма</TableCell>
              <TableCell>Категория</TableCell>
              <TableCell>День месяца</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow 
                key={item.id} 
                hover 
                onClick={() => onEdit(item)}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f0f7ff' } }}
              >
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.amount.toLocaleString('ru-RU')} ₽</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.dayOfMonth}</TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ fontStyle: 'italic', color: '#999' }}>
                  Нет обязательных трат
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default RecurringTransactionsSection;