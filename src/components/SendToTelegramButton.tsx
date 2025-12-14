import React from 'react';
import { Button, Alert } from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';

interface SendToTelegramButtonProps {
  isEnabled: boolean;
  onClick: () => void;
}

const SendToTelegramButton: React.FC<SendToTelegramButtonProps> = ({ isEnabled, onClick }) => {
  if (!isEnabled) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Для отправки списка в Telegram необходимо настроить токен бота и ID чата в настройках
      </Alert>
    );
  }

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<TelegramIcon />}
      onClick={onClick}
      fullWidth
      sx={{ mt: 1 }}
    >
      Отправить в Telegram
    </Button>
  );
};

export default SendToTelegramButton;