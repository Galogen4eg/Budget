import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface BalanceTileProps {
  title: string;
  value: number;
  editable?: boolean;
}

const BalanceTile: React.FC<BalanceTileProps> = ({ title, value, editable = false }) => {
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 2,
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        border: '1px solid #eaeaea'
      }}
    >
      <CardContent>
        <Typography 
          variant="subtitle2" 
          color="textSecondary" 
          gutterBottom
          sx={{ fontWeight: 500 }}
        >
          {title}
        </Typography>
        <Typography 
          variant="h5" 
          component="div"
          sx={{ 
            fontWeight: 600,
            color: '#333'
          }}
        >
          {value.toLocaleString('ru-RU')} ₽
        </Typography>
      </CardContent>
    </Card>
  );
};

export default BalanceTile;