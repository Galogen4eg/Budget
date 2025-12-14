import React from 'react';
import { List, ListItem, ListItemText, Divider } from '@mui/material';

interface Category {
  name: string;
  amount: number;
}

interface CategoriesSummaryProps {
  categories: Category[];
}

const CategoriesSummary: React.FC<CategoriesSummaryProps> = ({ categories }) => {
  return (
    <List dense>
      {categories.map((category, index) => (
        <React.Fragment key={category.name}>
          <ListItem disablePadding>
            <ListItemText 
              primary={`${category.name}`} 
              secondary={`${category.amount.toLocaleString('ru-RU')} ₽`} 
              sx={{ 
                margin: 0,
                '& .MuiListItemText-primary': {
                  fontWeight: 500
                },
                '& .MuiListItemText-secondary': {
                  color: '#666',
                  fontWeight: 400
                }
              }}
            />
          </ListItem>
          {index < categories.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </List>
  );
};

export default CategoriesSummary;