import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Chip
} from '@mui/material';
import { getUnitLabel } from '../utils/unitUtils';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: 'pcs' | 'liters' | 'grams' | 'kg';
  isBought: boolean;
}

interface ShoppingListProps {
  items: ShoppingItem[];
  onToggleBought: (id: string) => void;
  onRowClick: (item: ShoppingItem) => void;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ items, onToggleBought, onRowClick }) => {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f7fa' }}>
            <TableCell width={50}></TableCell>
            <TableCell>Название</TableCell>
            <TableCell align="right">Количество</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow 
              key={item.id} 
              hover 
              onClick={() => onRowClick(item)}
              sx={{ 
                cursor: 'pointer', 
                '&:hover': { backgroundColor: '#f0f7ff' },
                textDecoration: item.isBought ? 'line-through' : 'none',
                opacity: item.isBought ? 0.6 : 1
              }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={item.isBought}
                  onChange={() => onToggleBought(item.id)}
                  onClick={(e) => e.stopPropagation()} // Prevent row click when checkbox is clicked
                  color="primary"
                />
              </TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell align="right">
                <Chip 
                  label={`${item.quantity} ${getUnitLabel(item.unit, item.quantity)}`} 
                  size="small"
                  sx={{ 
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    fontWeight: 500
                  }} 
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ShoppingList;