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
    // Проверка активности таймера в Redis
    const isTimerActive = await redis.get('settings:timer_enabled');
    if (isTimerActive === '0') {
      return res.status(200).json({ status: 'timer_disabled' });
    }

    const totalAvailable = await redis.scard('photos:available');

    if (totalAvailable === 0) {
      if (ADMIN_CHAT_ID) {
        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: '⏰ Таймер сработал, но пул фото пуст. Загрузи новые фото на склад.',
        });
      }
      return res.status(200).json({ status: 'empty' });
    }

    const randomFileId = await redis.srandmember('photos:available');
    const shortKey = crypto.randomBytes(4).toString('hex');
    await redis.set(`photo:pending:${shortKey}`, randomFileId, { ex: 3600 });

    await tgRequest('sendPhoto', {
      chat_id: ADMIN_CHAT_ID,
      photo: randomFileId,
      caption: `⏰ Фото по расписанию на модерацию (в очереди: ${totalAvailable} шт.)`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Опубликовать', callback_data: `publish:${shortKey}` },
            { text: '❌ Пропустить (оставить в пуле)', callback_data: `reject:${shortKey}` },
          ],
          [
            { text: '🖼 Другое изображение', callback_data: 'action:next' }
          ]
        ],
      },
    });

    return res.status(200).json({ ok: true, sent: randomFileId });
  } catch (error) {
    console.error('Timer Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
