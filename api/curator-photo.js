import { redis } from '../lib/redis.js';
import crypto from 'crypto';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.MY_TELEGRAM_ID;
const CRON_SECRET = process.env.CRON_SECRET;

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
  if (CRON_SECRET) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const totalAvailable = await redis.scard('photos:available');

    if (totalAvailable === 0) {
      await tgRequest('sendMessage', {
        chat_id: ADMIN_CHAT_ID,
        text: '❌ Пул фотографий пуст. Загрузи новые изображения в канал-склад.',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Запросить фото (пусто)', callback_data: 'action:next' }]
          ]
        }
      });
      return res.status(200).json({ status: 'empty' });
    }

    if (totalAvailable <= 3) {
      await tgRequest('sendMessage', {
        chat_id: ADMIN_CHAT_ID,
        text: `⚠️ Внимание! На складе осталось всего ${totalAvailable} фото.`,
      });
    }

    const randomFileId = await redis.srandmember('photos:available');

    if (!randomFileId) {
      return res.status(200).json({ status: 'no_photo_found' });
    }

    const shortKey = crypto.randomBytes(4).toString('hex');
    await redis.set(`photo:pending:${shortKey}`, randomFileId, { ex: 3600 });

    const tgResponse = await tgRequest('sendPhoto', {
      chat_id: ADMIN_CHAT_ID,
      photo: randomFileId,
      caption: `📸 Новое фото на модерацию (в очереди: ${totalAvailable} шт.)`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Опубликовать', callback_data: `publish:${shortKey}` },
            { text: '❌ Отклонить', callback_data: `reject:${shortKey}` },
          ],
          [
            { text: '⏭ Запросить следующее', callback_data: 'action:next' }
          ]
        ],
      },
    });

    if (!tgResponse.ok) {
      console.error('Telegram API Error:', tgResponse);
      return res.status(500).json({ error: tgResponse.description || 'Telegram API failed to send photo' });
    }

    return res.status(200).json({ ok: true, sent_for_moderation: randomFileId });
  } catch (error) {
    console.error('Curator Photo Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
