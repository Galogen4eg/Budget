import { Transaction, Category, ShoppingItem, FamilyMember } from '../types';
import { detectProductCategory } from './categorizer';
import { parseSingleQuickShoppingText } from './quickShoppingParser';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
    };
    date: number;
    text?: string;
  };
}

export interface BotLogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'incoming';
  text: string;
}

let pollingActive = false;
let abortController: AbortController | null = null;
let lastUpdateId = 0;

/**
 * Runs a client-side Telegram Bot long-polling loop to listen for commands.
 * Commands processed:
 * - /start, /help - show commands
 * - /add <сумма> <описание> - adds a transaction (e.g. /add 250 Кофе)
 * - /shopping <товар> - adds a shopping list item (e.g. /shopping Молоко 2 шт)
 * - /list - lists active shopping items
 */
export const startTelegramBotListener = (
  botToken: string,
  onLog: (entry: BotLogEntry) => void,
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>,
  onAddShoppingItem: (title: string, amount?: number, unit?: string, category?: string) => Promise<void>,
  getShoppingList: () => ShoppingItem[],
  categories: Category[],
  members: FamilyMember[]
) => {
  if (pollingActive) {
    onLog({
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      text: 'Слушатель Telegram бота уже запущен.'
    });
    return;
  }

  pollingActive = true;
  abortController = new AbortController();

  onLog({
    timestamp: new Date().toLocaleTimeString(),
    type: 'success',
    text: 'Запуск слушателя Telegram Bot API через Long Polling...'
  });

  const poll = async () => {
    while (pollingActive) {
      try {
        const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
        const res = await fetch(url, { signal: abortController?.signal });
        if (!res.ok) {
          if (res.status === 401 || res.status === 404) {
            onLog({
              timestamp: new Date().toLocaleTimeString(),
              type: 'error',
              text: `Ошибка API (HTTP ${res.status}): Проверьте правильность токена бота.`
            });
            pollingActive = false;
            break;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result as TelegramUpdate[]) {
            lastUpdateId = update.update_id;

            if (update.message && update.message.text) {
              const text = update.message.text.trim();
              const chatId = update.message.chat.id;
              const senderName = update.message.from.first_name || 'Пользователь';

              onLog({
                timestamp: new Date().toLocaleTimeString(),
                type: 'incoming',
                text: `Получено от ${senderName} (ID: ${chatId}): "${text}"`
              });

              // Process commands
              if (text.startsWith('/start') || text.startsWith('/help')) {
                const welcomeMsg = encodeURIComponent(
                  `👋 Привет, ${senderName}!\n\n` +
                  `Я бот семейного органайзера *Terra*.\n\n` +
                  `📜 *Команды управления:*\n` +
                  `• \`/add <сумма> <описание>\` — записать расход (например: \`/add 450 Такси на работу\`)\n` +
                  `• \`/shopping <продукт>\` — добавить товар в список (например: \`/shopping Сыр 300г\`)\n` +
                  `• \`/list\` — показать текущий список покупок\n\n` +
                  `Все операции мгновенно синхронизируются в реальном времени!`
                );
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${welcomeMsg}&parse_mode=Markdown`);
              } 
              else if (text.startsWith('/add')) {
                const params = text.replace(/^\/add\s+/i, '').trim();
                const match = params.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
                if (match) {
                  const amountVal = parseFloat(match[1].replace(',', '.'));
                  const noteVal = match[2].trim();

                  // Auto detect category
                  const detectedCat = detectProductCategory(noteVal) || 'other';

                  // Select first member as author
                  const author = members[0]?.id || 'user';

                  await onAddTransaction({
                    amount: amountVal,
                    note: noteVal,
                    type: 'expense',
                    category: detectedCat,
                    date: new Date().toISOString().split('T')[0],
                    memberId: author,
                    rawNote: `Telegram: ${noteVal}`
                  });

                  onLog({
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'success',
                    text: `Успешно добавлен расход: ${amountVal} ₽ на "${noteVal}"`
                  });

                  const successMsg = encodeURIComponent(`✅ *Расход добавлен!*\n\n💰 Сумма: *${amountVal} ₽*\n🏷 Описание: *${noteVal}*\n📂 Категория автоопределена.`);
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${successMsg}&parse_mode=Markdown`);
                } else {
                  const errorMsg = encodeURIComponent(`⚠️ Неверный формат команды.\nИспользуйте: \`/add <сумма> <название>\`\nПример: \`/add 350 Кофе\``);
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${errorMsg}`);
                }
              } 
              else if (text.startsWith('/shopping')) {
                const itemRaw = text.replace(/^\/shopping\s+/i, '').trim();
                if (itemRaw) {
                  const parsed = parseSingleQuickShoppingText(itemRaw);
                  const title = parsed?.title || itemRaw;
                  const amount = parsed?.amount ? parseFloat(parsed.amount) : 1;
                  const unit = parsed?.unit || 'шт';
                  const category = parsed?.category || 'other';

                  await onAddShoppingItem(title, amount, unit, category);

                  onLog({
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'success',
                    text: `Добавлен товар в список покупок: "${title}" (${amount} ${unit})`
                  });

                  const successMsg = encodeURIComponent(`🛒 Товар *«${title}»* (${amount} ${unit}) добавлен в список покупок!`);
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${successMsg}&parse_mode=Markdown`);
                } else {
                  const errorMsg = encodeURIComponent(`⚠️ Укажите товар.\nПример: \`/shopping Сыр маасдам 200г\``);
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${errorMsg}`);
                }
              } 
              else if (text.startsWith('/list')) {
                const activeItems = getShoppingList().filter(i => !i.completed);
                if (activeItems.length === 0) {
                  const emptyMsg = encodeURIComponent('🛒 Ваш список покупок сейчас пуст!');
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${emptyMsg}`);
                } else {
                  const listStr = activeItems.map((item, idx) => `${idx + 1}. *${item.title}* — ${item.amount || 1} ${item.unit || 'шт'}`).join('\n');
                  const listMsg = encodeURIComponent(`🛒 *Текущий список покупок:*\n\n${listStr}`);
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${listMsg}&parse_mode=Markdown`);
                }
              }
              else {
                // Try parsing raw text as a transaction
                const match = text.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
                if (match) {
                  const amountVal = parseFloat(match[1].replace(',', '.'));
                  const noteVal = match[2].trim();
                  const detectedCat = detectProductCategory(noteVal) || 'other';
                  const author = members[0]?.id || 'user';

                  await onAddTransaction({
                    amount: amountVal,
                    note: noteVal,
                    type: 'expense',
                    category: detectedCat,
                    date: new Date().toISOString().split('T')[0],
                    memberId: author,
                    rawNote: `Telegram (авто): ${noteVal}`
                  });

                  const successMsg = encodeURIComponent(`✅ *Расход записан автоматически!*\n\n💰 *${amountVal} ₽* на *${noteVal}*`);
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${successMsg}&parse_mode=Markdown`);
                }
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Normal abort on stop
          break;
        }
        onLog({
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          text: `Ошибка подключения: ${err instanceof Error ? err.message : String(err)}. Повторная попытка через 5 сек...`
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  };

  poll();
};

export const stopTelegramBotListener = () => {
  pollingActive = false;
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
};

export const isBotPollingActive = () => pollingActive;
