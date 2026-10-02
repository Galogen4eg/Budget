import { redis } from '../lib/redis.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.MY_TELEGRAM_ID;
const TARGET_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID;
const WAREHOUSE_CHANNEL_ID = process.env.WAREHOUSE_CHANNEL_ID;

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
    const post = update.channel_post;
    if (post && post.photo) {
      if (WAREHOUSE_CHANNEL_ID && String(post.chat.id) !== String(WAREHOUSE_CHANNEL_ID)) {
        return res.status(200).json({ ok: true });
      }

      const photo = post.photo[post.photo.length - 1];
      const fileId = photo.file_id;

      await redis.sadd('photos:available', fileId);
      const totalAvailable = await redis.scard('photos:available');

      if (ADMIN_CHAT_ID) {
        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: `📥 Фото добавлено в пул.\nВсего в наличии: ${totalAvailable} шт.`,
        });
      }

      return res.status(200).json({ ok: true, added: fileId });
    }

    const callbackQuery = update.callback_query;
    if (callbackQuery) {
      const { id: callbackId, data, message, from } = callbackQuery;

      if (ADMIN_CHAT_ID && String(from.id) !== String(ADMIN_CHAT_ID)) {
        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Доступ запрещён.',
          show_alert: true,
        });
        return res.status(200).json({ ok: true });
      }

      const [action, shortKey] = data.split(':');
      const fileId = await redis.get(`photo:pending:${shortKey}`);

      if (!fileId) {
        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Срок действия сессии истек или фото уже обработано.',
          show_alert: true,
        });
        return res.status(200).json({ ok: true });
      }

      if (action === 'publish') {
        // Публикуем фото в публичный канал
        await tgRequest('sendPhoto', {
          chat_id: TARGET_CHANNEL_ID,
          photo: fileId,
        });

        await redis.srem('photos:available', fileId);
        await redis.sadd('photos:used', fileId);
        await redis.del(`photo:pending:${shortKey}`);

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Опубликовано в канал!',
        });

        await tgRequest('editMessageCaption', {
          chat_id: message.chat.id,
          message_id: message.message_id,
          caption: '✅ Опубликовано в публичный канал.',
          reply_markup: { inline_keyboard: [] },
        });

        const remaining = await redis.scard('photos:available');
        if (remaining <= 3) {
          await tgRequest('sendMessage', {
            chat_id: ADMIN_CHAT_ID,
            text: `⚠️ Внимание! На складе осталось всего ${remaining} фото. Пора загрузить новые.`,
          });
        }
      } else if (action === 'reject') {
        await redis.srem('photos:available', fileId);
        await redis.sadd('photos:rejected', fileId);
        await redis.del(`photo:pending:${shortKey}`);

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Отклонено.',
        });

        await tgRequest('editMessageCaption', {
          chat_id: message.chat.id,
          message_id: message.message_id,
          caption: '❌ Отклонено модератором.',
          reply_markup: { inline_keyboard: [] },
        });

        const remaining = await redis.scard('photos:available');
        if (remaining <= 3) {
          await tgRequest('sendMessage', {
            chat_id: ADMIN_CHAT_ID,
            text: `⚠️️ Внимание! На складе осталось всего ${remaining} фото. Пора загрузить новые.`,
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
