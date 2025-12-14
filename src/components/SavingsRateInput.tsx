import React from 'react';
import { TextField, FormControl, InputLabel, Box } from '@mui/material';

interface SavingsRateInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}

const SavingsRateInput: React.FC<SavingsRateInputProps> = ({ value, onChange, placeholder }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth variant="outlined">
        <InputLabel>Процент для откладывания</InputLabel>
        <TextField
          label="Процент для откладывания"
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={placeholder}
          InputProps={{
            endAdornment: <span>%</span>,
          }}
          size="small"
          inputProps={{ min: 0, max: 100 }}
        />
      </FormControl>
    </Box>
  );
};

export default SavingsRateInput;