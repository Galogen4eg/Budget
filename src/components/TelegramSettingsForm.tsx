import React, { useState } from 'react';
import { 
  TextField, 
  Button, 
  Box, 
  Alert, 
  FormControl, 
  InputLabel 
} from '@mui/material';

interface TelegramSettings {
  botToken: string;
  chatId: string;
}

interface TelegramSettingsFormProps {
  botToken: string;
  chatId: string;
  onSave: (settings: TelegramSettings) => void;
}

const TelegramSettingsForm: React.FC<TelegramSettingsFormProps> = ({ 
  botToken, 
  chatId, 
  onSave 
}) => {
  const [settings, setSettings] = useState<TelegramSettings>({ botToken, chatId });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Токен бота будет храниться в облаке. Не используйте продакшен-бота!
      </Alert>
      
      <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
        <TextField
          label="Токен Telegram бота"
          name="botToken"
          value={settings.botToken}
          onChange={handleChange}
          size="small"
          placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
        />
      </FormControl>
      
      <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
        <TextField
          label="ID чата Telegram"
          name="chatId"
          value={settings.chatId}
          onChange={handleChange}
          size="small"
          placeholder="-1001234567890"
        />
      </FormControl>
      
      <Button 
        type="submit" 
        variant="contained" 
        color="primary"
        sx={{ textTransform: 'none' }}
      >
        Сохранить
      </Button>
    </Box>
  );
};

export default TelegramSettingsForm;