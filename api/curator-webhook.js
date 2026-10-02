import { redis } from '../lib/redis.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;         // Твой личный chat_id в Telegram
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID; // Публичный канал (@channel или -100...)
const WAREHOUSE_CHANNEL_ID = process.env.WAREHOUSE_CHANNEL_ID; // Канал-склад (-100...)

// Универсальный хелпер запросов к Telegram Bot API
async function tgRequest(method, data) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Curator Webhook is running');
  }

  const update = req.body;

  try {
    // 1. ПЕРЕХВАТ ФОТОГРАФИЙ ИЗ КАНАЛА-СКЛАДА
    // Посты из канала приходят в channel_post
    const post = update.channel_post;
    if (post && post.photo) {
      // Если задан WAREHOUSE_CHANNEL_ID, проверяем, что пост именно из склада
      if (WAREHOUSE_CHANNEL_ID && String(post.chat.id) !== String(WAREHOUSE_CHANNEL_ID)) {
        return res.status(200).json({ ok: true });
      }

      // Берём файл наибольшего разрешения (последний элемент массива photo)
      const photo = post.photo[post.photo.length - 1];
      const fileId = photo.file_id;

      // Кладём в пул доступных
      await redis.sadd('photos:available', fileId);

      // Проверяем актуальное количество на складе
      const totalAvailable = await redis.scard('photos:available');

      // Уведомляем администратора о поступлении
      if (ADMIN_CHAT_ID) {
        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: `📥 Фото добавлено в пул.\nВсего в наличии: ${totalAvailable} шт.`,
        });
      }

      return res.status(200).json({ ok: true, added: fileId });
    }

    // 2. ОБРАБОТКА НАЖАТИЙ НА КНОПКИ ПРЕМОДЕРАЦИИ (CALLBACK QUERY)
    const callbackQuery = update.callback_query;
    if (callbackQuery) {
      const { id: callbackId, data, message, from } = callbackQuery;

      // Проверяем, что кнопку нажал именно администратор
      if (ADMIN_CHAT_ID && String(from.id) !== String(ADMIN_CHAT_ID)) {
        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Доступ запрещён.',
          show_alert: true,
        });
        return res.status(200).json({ ok: true });
      }

      // Формат payload в data: "action:file_id"
      const [action, ...rest] = data.split(':');
      const fileId = rest.join(':');

      if (action === 'publish') {
        // Публикуем фото в основной публичный канал
        await tgRequest('sendPhoto', {
          chat_id: TARGET_CHANNEL_ID,
          photo: fileId,
        });

        // Фиксируем в базе: удаляем из доступных, переносим в использованные
        await redis.srem('photos:available', fileId);
        await redis.sadd('photos:used', fileId);

        // Отвечаем на callback Telegram
        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Опубликовано в канал!',
        });

        // Обновляем сообщение в личке, убирая кнопки
        await tgRequest('editMessageCaption', {
          chat_id: message.chat.id,
          message_id: message.message_id,
          caption: '✅ Опубликовано в публичный канал.',
        });

        // Проверяем остаток картинок
        const remaining = await redis.scard('photos:available');
        if (remaining <= 3) {
          await tgRequest('sendMessage', {
            chat_id: ADMIN_CHAT_ID,
            text: `⚠️ Внимание! На складе осталось всего ${remaining} фото. Пора загрузить новые.`,
          });
        }
      } else if (action === 'reject') {
        // Удаляем из доступных и сохраняем в отклонённые
        await redis.srem('photos:available', fileId);
        await redis.sadd('photos:rejected', fileId);

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Отклонено.',
        });

        await tgRequest('editMessageCaption', {
          chat_id: message.chat.id,
          message_id: message.message_id,
          caption: '❌ Отклонено модератором.',
        });

        const remaining = await redis.scard('photos:available');
        if (remaining <= 3) {
          await tgRequest('sendMessage', {
            chat_id: ADMIN_CHAT_ID,
            text: `⚠️ Внимание! На складе осталось всего ${remaining} фото. Пора загрузить новые.`,
          });
        }
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Curator Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
