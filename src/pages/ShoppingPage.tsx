import React, { useState } from 'react';
import { Container, Grid, Paper, Typography } from '@mui/material';
import QuickAddForm from '../components/QuickAddForm';
import DictionarySearch from '../components/DictionarySearch';
import ShoppingList from '../components/ShoppingList';
import SendToTelegramButton from '../components/SendToTelegramButton';

interface ShoppingPageProps {
  roomId: string;
}

const ShoppingPage: React.FC<ShoppingPageProps> = ({ roomId }) => {
  const [shoppingItems, setShoppingItems] = useState<any[]>([
    { id: '1', name: 'Молоко', quantity: 1, unit: 'pcs', isBought: false },
    { id: '2', name: 'Хлеб', quantity: 2, unit: 'pcs', isBought: false },
    { id: '3', name: 'Яблоки', quantity: 1, unit: 'kg', isBought: true },
  ]);

  const addItem = (item: any) => {
    setShoppingItems([...shoppingItems, { ...item, id: Date.now().toString() }]);
  };

  const markAsBought = (id: string) => {
    setShoppingItems(shoppingItems.map(item => 
      item.id === id ? { ...item, isBought: !item.isBought } : item
    ));
  };

  const openEditItemModal = (item: any) => {
    // Open modal to edit item
    console.log('Editing item:', item);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      <Grid container spacing={2}>
        {/* Left column: Add item form and dictionary */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Быстрое добавление
            </Typography>
            <QuickAddForm onAdd={addItem} />
          </Paper>
          
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Словарь товаров
            </Typography>
            <DictionarySearch 
              items={[
                'Молоко', 'Хлеб', 'Яйца', 'Масло', 'Сахар', 'Соль', 
                'Перец', 'Чай', 'Кофе', 'Рис', 'Макароны', 'Сосиски',
                'Колбаса', 'Сыр', 'Творог', 'Йогурт', 'Кефир', 'Сметана'
              ]} 
              onSelect={(itemName) => console.log('Selected:', itemName)}
            />
          </Paper>
        </Grid>

        {/* Right column: Shopping list */}
        <Grid item xs={12} sm={6} md={8}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Список покупок
            </Typography>
            <ShoppingList 
              items={shoppingItems} 
              onToggleBought={markAsBought}
              onRowClick={openEditItemModal}
            />
            <SendToTelegramButton 
              isEnabled={true}
              onClick={() => console.log('Sending to Telegram')}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ShoppingPage;