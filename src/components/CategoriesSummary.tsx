import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText } from '@mui/material';
import { CategorySummary } from '../types';

interface CategoriesSummaryProps {
  categories: CategorySummary[];
}

const CategoriesSummary: React.FC<CategoriesSummaryProps> = ({ categories }) => {
  return (
    <Card sx={{ boxShadow: 'var(--shadow)', borderRadius: '8px' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Категории
        </Typography>
        <List dense>
          {categories.map((category, index) => (
            <ListItem key={index} disableGutters>
              <ListItemText 
                primary={`${category.name}`} 
                sx={{ flex: '0 0 auto', marginRight: '16px' }}
              />
              <ListItemText 
                primary={`${category.amount.toLocaleString('ru-RU')} ₽`} 
                sx={{ textAlign: 'right', flex: '0 0 auto' }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default CategoriesSummary;