import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, TextField, Button, Select, MenuItem, InputLabel, FormControl, Box, List, ListItem, ListItemText, ListItemButton, ListItemIcon, Checkbox, IconButton, Alert } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { ShoppingItem, UnitOption } from '../types';
import { 
  getShoppingItems, 
  addShoppingItem, 
  updateShoppingItem, 
  deleteShoppingItem,
  getOrCreateRoom
} from '../firebase/services';
import { sendShoppingListToTelegram } from '../utils/telegram';
import toast from 'react-hot-toast';

const ShoppingPage: React.FC = () => {
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: 'pcs' as 'pcs' | 'liters' | 'grams' | 'kg' });
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Словарь товаров
  const defaultDictionary = [
    'Молоко', 'Хлеб', 'Яйца', 'Масло', 'Сахар', 'Соль', 'Перец', 'Мука', 'Рис', 'Гречка',
    'Макароны', 'Картофель', 'Лук', 'Чеснок', 'Морковь', 'Яблоки', 'Бананы', 'Апельсины',
    'Мясо', 'Рыба', 'Курица', 'Творог', 'Сметана', 'Кефир', 'Йогурт', 'Сыр', 'Колбаса'
  ];
  
  // Единицы измерения
  const unitOptions: UnitOption[] = [
    { value: 'pcs', label: 'штук' },
    { value: 'liters', label: 'литров' },
    { value: 'grams', label: 'грамм' },
    { value: 'kg', label: 'кг' }
  ];
  
  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      try {
        // В реальном приложении roomId будет получаться из контекста или localStorage
        const roomId = localStorage.getItem('roomId') || 'room1';
        const loadedItems = await getShoppingItems(roomId);
        setShoppingItems(loadedItems);
        
        // Загрузка комнаты для получения настроек Telegram
        const loadedRoom = await getOrCreateRoom(roomId, 'userId');
        setRoom(loadedRoom);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        toast.error('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Функция для склонения единиц измерения
  const getUnitLabel = (unit: string, count: number): string => {
    if (unit === 'pcs') {
      if (count % 10 === 1 && count % 100 !== 11) return 'штука';
      if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'штуки';
      return 'штук';
    }
    return unitOptions.find(u => u.value === unit)?.label || unit;
  };
  
  // Добавление нового товара
  const handleAddItem = async () => {
    if (newItem.name.trim() === '') return;
    
    try {
      const roomId = localStorage.getItem('roomId') || 'room1';
      const item: ShoppingItem = {
        id: '',
        roomId,
        name: newItem.name,
        quantity: newItem.quantity,
        unit: newItem.unit,
        isBought: false
      };
      
      const id = await addShoppingItem(item);
      const itemWithId = { ...item, id };
      setShoppingItems([...shoppingItems, itemWithId]);
      setNewItem({ name: '', quantity: 1, unit: 'pcs' });
      toast.success('Товар добавлен');
    } catch (error) {
      console.error('Ошибка добавления товара:', error);
      toast.error('Ошибка добавления товара');
    }
  };
  
  // Переключение статуса "куплено"
  const handleToggleBought = async (id: string) => {
    try {
      const item = shoppingItems.find(i => i.id === id);
      if (!item) return;
      
      const updatedItem = { ...item, isBought: !item.isBought };
      await updateShoppingItem(id, updatedItem);
      setShoppingItems(shoppingItems.map(i => i.id === id ? updatedItem : i));
      toast.success(`Товар ${updatedItem.isBought ? 'отмечен как купленный' : 'возвращен в список'}`);
    } catch (error) {
      console.error('Ошибка обновления статуса товара:', error);
      toast.error('Ошибка обновления статуса товара');
    }
  };
  
  // Удаление товара
  const handleDeleteItem = async (id: string) => {
    try {
      await deleteShoppingItem(id);
      setShoppingItems(shoppingItems.filter(i => i.id !== id));
      toast.success('Товар удален');
    } catch (error) {
      console.error('Ошибка удаления товара:', error);
      toast.error('Ошибка удаления товара');
    }
  };
  
  // Отправка списка в Telegram
  const handleSendToTelegram = async () => {
    if (!room?.settings?.telegram?.botToken || !room?.settings?.telegram?.chatId) {
      toast.error('Не настроены параметры Telegram бота');
      return;
    }
    
    try {
      const success = await sendShoppingListToTelegram(
        room.settings.telegram, 
        shoppingItems
      );
      
      if (success) {
        toast.success('Список покупок отправлен в Telegram');
      } else {
        toast.error('Ошибка отправки в Telegram');
      }
    } catch (error) {
      console.error('Ошибка отправки списка в Telegram:', error);
      toast.error('Ошибка отправки списка в Telegram');
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }
  
  return (
    <Grid container spacing={2} className="two-column-horizontal-scroll">
      {/* Левая колонка: Добавление товара + Словарь */}
      <Grid item xs={12} sm={6} md={4}>
        <Card sx={{ boxShadow: 'var(--shadow)', borderRadius: '8px', marginBottom: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Добавить товар
            </Typography>
            <TextField
              fullWidth
              label="Название товара"
              variant="outlined"
              value={newItem.name}
              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Количество"
              variant="outlined"
              type="number"
              value={newItem.quantity}
              onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
              margin="normal"
              inputProps={{ min: "1", step: "1" }}
              helperText="Подсказка: 1"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Единица измерения</InputLabel>
              <Select
                value={newItem.unit}
                label="Единица измерения"
                onChange={(e) => setNewItem({...newItem, unit: e.target.value as 'pcs' | 'liters' | 'grams' | 'kg'})}
              >
                {unitOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              sx={{ marginTop: 2 }}
              onClick={handleAddItem}
            >
              Добавить
            </Button>
          </CardContent>
        </Card>
        
        <Card sx={{ boxShadow: 'var(--shadow)', borderRadius: '8px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Словарь товаров
            </Typography>
            <List dense>
              {defaultDictionary.map((item, index) => (
                <ListItem 
                  key={index} 
                  disableGutters
                  onClick={() => setNewItem({...newItem, name: item})}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                >
                  <ListItemText primary={item} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Правая колонка: Список покупок */}
      <Grid item xs={12} sm={6} md={8}>
        <Card sx={{ boxShadow: 'var(--shadow)', borderRadius: '8px' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" gutterBottom>
                Список покупок
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<SendIcon />}
                onClick={handleSendToTelegram}
                disabled={shoppingItems.filter(item => !item.isBought).length === 0}
              >
                Отправить в Telegram
              </Button>
            </Box>
            
            {shoppingItems.length === 0 ? (
              <Alert severity="info">Список покупок пуст. Добавьте товары для начала.</Alert>
            ) : (
              <List>
                {shoppingItems
                  .sort((a, b) => (a.isBought ? 1 : -1) - (b.isBought ? 1 : -1)) // Сначала неотмеченные
                  .map((item) => (
                  <ListItem 
                    key={item.id} 
                    disableGutters
                    secondaryAction={
                      <IconButton edge="end" onClick={() => handleDeleteItem(item.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </IconButton>
                    }
                  >
                    <ListItemButton onClick={() => handleToggleBought(item.id)}>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={item.isBought}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`${item.name}: ${item.quantity} ${getUnitLabel(item.unit, item.quantity)}`} 
                        sx={{ textDecoration: item.isBought ? 'line-through' : 'none', color: item.isBought ? 'text.disabled' : 'text.primary' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ShoppingPage;