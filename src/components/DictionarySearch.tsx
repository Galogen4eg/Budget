import React, { useState } from 'react';
import { TextField, List, ListItem, ListItemButton, ListItemText, Paper } from '@mui/material';

interface DictionarySearchProps {
  items: string[];
  onSelect: (itemName: string) => void;
}

const DictionarySearch: React.FC<DictionarySearchProps> = ({ items, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Поиск товара..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        size="small"
        margin="normal"
      />
      <Paper 
        elevation={0} 
        sx={{ 
          maxHeight: 200, 
          overflow: 'auto', 
          mt: 1, 
          border: '1px solid #e0e0e0',
          borderRadius: 1
        }}
      >
        <List dense>
          {filteredItems.map((item, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton 
                onClick={() => onSelect(item)}
                sx={{ 
                  '&:hover': { backgroundColor: '#f0f7ff' },
                  py: 0.5
                }}
              >
                <ListItemText 
                  primary={item} 
                  primaryTypographyProps={{ fontSize: '0.875rem' }} 
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>
    </div>
  );
};

export default DictionarySearch;