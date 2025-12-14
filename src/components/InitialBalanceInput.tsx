import React from 'react';
import { TextField, FormControl, InputLabel, Box } from '@mui/material';

interface InitialBalanceInputProps {
  value: number;
  onChange: (value: number) => void;
}

const InitialBalanceInput: React.FC<InitialBalanceInputProps> = ({ value, onChange }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth variant="outlined">
        <InputLabel>Начальный остаток</InputLabel>
        <TextField
          label="Начальный остаток"
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          InputProps={{
            endAdornment: <span>₽</span>,
          }}
          size="small"
        />
      </FormControl>
    </Box>
  );
};

export default InitialBalanceInput;