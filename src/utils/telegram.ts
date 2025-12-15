// Утилиты для работы с Telegram API
import { ShoppingItem } from '../types';

interface TelegramSettings {
  botToken: string;
  chatId: string;
}

// Отправка сообщения в Telegram
export const sendTelegramMessage = async (settings: TelegramSettings, message: string): Promise<boolean> => {
  if (!settings.botToken || !settings.chatId) {
    throw new Error('Не настроен Telegram бот');
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: settings.chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error('Ошибка отправки сообщения в Telegram:', error);
    return false;
  }
};

// Формирование сообщения со списком покупок
export const formatShoppingListMessage = (items: ShoppingItem[]): string => {
  if (items.length === 0) {
    return 'Список покупок пуст.';
  }

  const uncheckedItems = items.filter(item => !item.isBought);
  if (uncheckedItems.length === 0) {
    return 'Все покупки отмечены как купленные!';
  }

  let message = '<b>Список покупок:</b>\n\n';
  uncheckedItems.forEach((item, index) => {
    message += `${index + 1}. <b>${item.name}</b> - ${item.quantity} ${item.unit}\n`;
  });

  return message;
};

// Отправка списка покупок в Telegram
export const sendShoppingListToTelegram = async (
  settings: TelegramSettings, 
  items: ShoppingItem[]
): Promise<boolean> => {
  const message = formatShoppingListMessage(items);
  return await sendTelegramMessage(settings, message);
};