import { redis } from '../lib/redis.js';
import crypto from 'crypto';

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
          reply_markup: {
            inline_keyboard: [
              [{ text: '⏭ Запросить фото на модерацию', callback_data: 'action:next' }]
            ]
          }
        });
      }

      return res.status(200).json({ ok: true, added: fileId });
    }

    const message = update.message;
    if (message && message.text) {
      if (ADMIN_CHAT_ID && String(message.chat.id) === String(ADMIN_CHAT_ID)) {
        const text = message.text.trim();

        if (text === '/clear' || text === '/clean') {
          await redis.del('photos:available');
          await redis.del('photos:used');
          await redis.del('photos:rejected');

          const keys = await redis.keys('photo:pending:*');
          if (keys && keys.length > 0) {
            await redis.del(...keys);
          }

          await tgRequest('sendMessage', {
            chat_id: ADMIN_CHAT_ID,
            text: '🗑 Пул фотографий и история полностью очищены.',
            reply_markup: {
              inline_keyboard: [
                [{ text: '⏭ Запросить фото на модерацию', callback_data: 'action:next' }]
              ]
            }
          });

          return res.status(200).json({ ok: true, cleared: true });
        }
      }
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

      if (data === 'action:next') {
        const totalAvailable = await redis.scard('photos:available');

        if (totalAvailable === 0) {
          await tgRequest('answerCallbackQuery', {
            callback_query_id: callbackId,
            text: 'Пул фотографий пуст!',
            show_alert: true,
          });
          return res.status(200).json({ ok: true });
        }

        const randomFileId = await redis.srandmember('photos:available');
        const shortKey = crypto.randomBytes(4).toString('hex');
        await redis.set(`photo:pending:${shortKey}`, randomFileId, { ex: 3600 });

        await tgRequest('sendPhoto', {
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

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Загружаю фото...',
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
        const publishResponse = await tgRequest('sendPhoto', {
          chat_id: TARGET_CHANNEL_ID,
          photo: fileId,
        });

        if (!publishResponse.ok) {
          console.error('Failed to publish to public channel:', publishResponse);
          await tgRequest('answerCallbackQuery', {
            callback_query_id: callbackId,
            text: `Ошибка публикации: ${publishResponse.description}`,
            show_alert: true,
          });
          return res.status(200).json({ ok: false, error: publishResponse.description });
        }

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
          reply_markup: {
            inline_keyboard: [
              [{ text: '⏭ Запросить следующее фото', callback_data: 'action:next' }]
            ]
          },
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
          reply_markup: {
            inline_keyboard: [
              [{ text: '⏭ Запросить следующее фото', callback_data: 'action:next' }]
            ]
          },
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
