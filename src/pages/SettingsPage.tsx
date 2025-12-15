import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Tabs, 
  Tab, 
  TextField, 
  Button, 
  FormControlLabel, 
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { Room, Participant, RecurringTransaction } from '../types';
import RecurringTransactionsList from '../components/RecurringTransactionsList';
import { 
  updateRoomSettings, 
  clearAllTransactions, 
  getParticipants, 
  addParticipant, 
  updateParticipant, 
  deleteParticipant,
  getRecurringTransactions,
  addRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction
} from '../firebase/services';
import toast from 'react-hot-toast';

interface SettingsPageProps {
  room: Room | null;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ room }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [initialBalance, setInitialBalance] = useState(room?.settings.initialBalance || 0);
  const [savingsRate, setSavingsRate] = useState(room?.settings.savingsRate || 10);
  const [telegramBotToken, setTelegramBotToken] = useState(room?.settings.telegram.botToken || '');
  const [telegramChatId, setTelegramChatId] = useState(room?.settings.telegram.chatId || '');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [showTelegramWarning, setShowTelegramWarning] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      if (room?.id) {
        try {
          // Загрузка участников
          const loadedParticipants = await getParticipants(room.id);
          setParticipants(loadedParticipants);
          
          // Загрузка обязательных трат
          const loadedRecurringTransactions = await getRecurringTransactions(room.id);
          setRecurringTransactions(loadedRecurringTransactions);
        } catch (error) {
          console.error('Ошибка загрузки данных:', error);
          toast.error('Ошибка загрузки данных');
        }
      }
    };
    
    loadData();
  }, [room?.id]);
  
  // Обработчики изменения настроек
  const handleSaveBudgetSettings = async () => {
    try {
      if (room?.id) {
        await updateRoomSettings(room.id, {
          initialBalance,
          savingsRate,
          roomName: room.settings.roomName,
          telegram: room.settings.telegram
        });
        toast.success('Настройки бюджета сохранены');
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек бюджета:', error);
      toast.error('Ошибка сохранения настроек бюджета');
    }
  };
  
  const handleSaveTelegramSettings = async () => {
    try {
      // Показываем предупреждение при первом сохранении
      if (!room?.settings.telegram.botToken && telegramBotToken) {
        setShowTelegramWarning(true);
      }
      
      if (room?.id) {
        await updateRoomSettings(room.id, {
          ...room.settings,
          telegram: {
            botToken: telegramBotToken,
            chatId: telegramChatId
          }
        });
        toast.success('Настройки Telegram сохранены');
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек Telegram:', error);
      toast.error('Ошибка сохранения настроек Telegram');
    }
  };
  
  const handleClearTransactions = async () => {
    if (showClearConfirm && room?.id) {
      try {
        await clearAllTransactions(room.id);
        toast.success('Все операции очищены');
        setShowClearConfirm(false);
      } catch (error) {
        console.error('Ошибка очистки операций:', error);
        toast.error('Ошибка очистки операций');
      }
    }
  };
  
  // Обработчики для участников
  const handleAddParticipant = async () => {
    try {
      if (room?.id) {
        const newParticipant: Participant = {
          id: '',
          roomId: room.id,
          name: 'Новый участник',
          color: '#4361ee'
        };
        
        const id = await addParticipant(newParticipant);
        const participantWithId = { ...newParticipant, id };
        setParticipants([...participants, participantWithId]);
        toast.success('Участник добавлен');
      }
    } catch (error) {
      console.error('Ошибка добавления участника:', error);
      toast.error('Ошибка добавления участника');
    }
  };
  
  const handleUpdateParticipant = async (participant: Participant) => {
    try {
      await updateParticipant(participant.id, participant);
      setParticipants(participants.map(p => p.id === participant.id ? participant : p));
      toast.success('Участник обновлен');
    } catch (error) {
      console.error('Ошибка обновления участника:', error);
      toast.error('Ошибка обновления участника');
    }
  };
  
  const handleDeleteParticipant = async (id: string) => {
    try {
      await deleteParticipant(id);
      setParticipants(participants.filter(p => p.id !== id));
      toast.success('Участник удален');
    } catch (error) {
      console.error('Ошибка удаления участника:', error);
      toast.error('Ошибка удаления участника');
    }
  };

  // Обработчики для обязательных трат
  const handleAddRecurringTransaction = async (transaction: RecurringTransaction) => {
    try {
      if (room?.id) {
        const id = await addRecurringTransaction(transaction);
        const transactionWithId = { ...transaction, id };
        setRecurringTransactions([...recurringTransactions, transactionWithId]);
        toast.success('Обязательная трата добавлена');
      }
    } catch (error) {
      console.error('Ошибка добавления обязательной траты:', error);
      toast.error('Ошибка добавления обязательной траты');
    }
  };
  
  const handleUpdateRecurringTransaction = async (transaction: RecurringTransaction) => {
    try {
      await updateRecurringTransaction(transaction.id, transaction);
      setRecurringTransactions(
        recurringTransactions.map(t => t.id === transaction.id ? transaction : t)
      );
      toast.success('Обязательная трата обновлена');
    } catch (error) {
      console.error('Ошибка обновления обязательной траты:', error);
      toast.error('Ошибка обновления обязательной траты');
    }
  };
  
  const handleDeleteRecurringTransaction = async (id: string) => {
    try {
      await deleteRecurringTransaction(id);
      setRecurringTransactions(recurringTransactions.filter(t => t.id !== id));
      toast.success('Обязательная трата удалена');
    } catch (error) {
      console.error('Ошибка удаления обязательной траты:', error);
      toast.error('Ошибка удаления обязательной траты');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Настройки
      </Typography>
      
      <Card sx={{ boxShadow: 'var(--shadow)', borderRadius: '8px' }}>
        <CardContent>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="Бюджет" />
            <Tab label="Покупки" />
            <Tab label="Планировщик" />
          </Tabs>
          
          <Box sx={{ paddingTop: 2 }}>
            {/* Вкладка Бюджет */}
            {activeTab === 0 && (
              <Box>
                <TextField
                  label="Начальный остаток"
                  type="number"
                  fullWidth
                  margin="normal"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(Number(e.target.value))}
                />
                
                <TextField
                  label="Процент для откладывания"
                  type="number"
                  fullWidth
                  margin="normal"
                  helperText="0-100%"
                  value={savingsRate}
                  onChange={(e) => setSavingsRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                />
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  sx={{ marginTop: 2 }}
                  onClick={handleSaveBudgetSettings}
                >
                  Сохранить настройки бюджета
                </Button>
                
                <Box sx={{ marginTop: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Обязательные траты
                  </Typography>
                  <RecurringTransactionsList
                    items={recurringTransactions}
                    onAdd={handleAddRecurringTransaction}
                    onEdit={handleUpdateRecurringTransaction}
                    onDelete={handleDeleteRecurringTransaction}
                  />
                </Box>
                
                <Box sx={{ marginTop: 3 }}>
                  <Typography variant="h6" gutterBottom color="error">
                    Опасная зона
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={() => setShowClearConfirm(true)}
                  >
                    Очистить операции
                  </Button>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', marginTop: 1 }}>
                    Удалить все операции за всё время?
                  </Typography>
                </Box>
              </Box>
            )}
            
            {/* Вкладка Покупки */}
            {activeTab === 1 && (
              <Box>
                <Alert severity="warning" sx={{ marginBottom: 2 }}>
                  Токен бота будет храниться в облаке. Не используйте продакшен-бота!
                </Alert>
                
                <TextField
                  label="Telegram Bot Token"
                  fullWidth
                  margin="normal"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  type="password"
                />
                
                <TextField
                  label="Telegram Chat ID"
                  fullWidth
                  margin="normal"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                />
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  sx={{ marginTop: 2 }}
                  onClick={handleSaveTelegramSettings}
                >
                  Сохранить настройки Telegram
                </Button>
              </Box>
            )}
            
            {/* Вкладка Планировщик */}
            {activeTab === 2 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Участники
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={handleAddParticipant}
                  >
                    Добавить
                  </Button>
                </Box>
                
                <List>
                  {participants.map((participant) => (
                    <ListItem key={participant.id} disableGutters>
                      <ListItemText 
                        primary={participant.name} 
                        secondary={`Цвет: ${participant.color}`} 
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          aria-label="delete" 
                          color="error"
                          onClick={() => handleDeleteParticipant(participant.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
                
                <Box sx={{ marginTop: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Шаблоны событий
                  </Typography>
                  <Alert severity="info" sx={{ marginBottom: 2 }}>
                    В этой версии шаблоны событий будут реализованы позже
                  </Alert>
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
      
      {/* Диалог подтверждения очистки операций */}
      <Dialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
      >
        <DialogTitle>Подтверждение действия</DialogTitle>
        <DialogContent>
          <Typography>Вы уверены, что хотите удалить все операции за всё время?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClearConfirm(false)}>Отмена</Button>
          <Button 
            onClick={handleClearTransactions} 
            color="error"
            variant="contained"
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог предупреждения о безопасности Telegram */}
      <Dialog
        open={showTelegramWarning}
        onClose={() => setShowTelegramWarning(false)}
      >
        <DialogTitle>Важное предупреждение</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Вы впервые сохраняете токен Telegram-бота. 
            Помните, что этот токен будет храниться в облачной базе данных. 
            Не используйте токен от продакшен-бота для обеспечения безопасности.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowTelegramWarning(false)} 
            variant="contained"
          >
            Понятно
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Обновляем экспорт по умолчанию, чтобы не требовать room в пропсах
const SettingsPageWrapper: React.FC = () => {
  // Временно используем заглушку, пока не реализуем полный функционал
  return <SettingsPage room={null} />;
};

export default SettingsPageWrapper;