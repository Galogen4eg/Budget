import React, { useState } from 'react';
import { 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Box, 
  Grid 
} from '@mui/material';
import { getUnitLabel, getDefaultUnitValue } from '../utils/unitUtils';

interface QuickAddFormProps {
  onAdd: (item: { name: string; quantity: number; unit: 'pcs' | 'liters' | 'grams' | 'kg' }) => void;
}

const QuickAddForm: React.FC<QuickAddFormProps> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<'pcs' | 'liters' | 'grams' | 'kg'>('pcs');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd({ name: name.trim(), quantity, unit });
      setName('');
      setQuantity(getDefaultUnitValue(unit));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={1} alignItems="flex-end">
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Название товара"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            size="small"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Количество"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            size="small"
            inputProps={{ min: 0.1, step: 0.1 }}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Единица измерения</InputLabel>
            <Select
              value={unit}
              label="Единица измерения"
              onChange={(e) => {
                const newUnit = e.target.value as 'pcs' | 'liters' | 'grams' | 'kg';
                setUnit(newUnit);
                setQuantity(getDefaultUnitValue(newUnit));
              }}
            >
              <MenuItem value="pcs">Штуки</MenuItem>
              <MenuItem value="liters">Литры</MenuItem>
              <MenuItem value="grams">Граммы</MenuItem>
              <MenuItem value="kg">Килограммы</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <Button 
            type="submit" 
            variant="contained" 
            fullWidth
            sx={{ mt: 1 }}
          >
            Добавить {quantity} {getUnitLabel(unit, quantity)}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default QuickAddForm;