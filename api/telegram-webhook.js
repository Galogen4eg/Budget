import { redis } from '../lib/redis.js';
import crypto from 'crypto';
import { findAndSendNews } from './curator-find.js';
import { PIKABU_CATEGORIES, getPikabuMenuKeyboard } from '../lib/pikabu.js';

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
  const json = await res.json();
  if (!json.ok) console.error(`Telegram API [${method}] Error:`, json);
  return json;
}

function isTimerActive(val) {
  if (val === null || val === undefined) return true;
  const n = String(val).trim().toLowerCase();
  return n === '1' || n === 'true';
}

async function getMainMenuKeyboard() {
  const timerState = await redis.get('settings:timer_enabled');
  const timerButtonText = isTimerActive(timerState) ? '🟢 Авто' : '🔴 Авто';
  const pikabuTotal = await redis.llen('queue:pikabu');

  return {
    inline_keyboard: [
      [
        { text: `📑 Пикабу (${pikabuTotal})`, callback_data: 'menu:pikabu' },
        { text: '📰 Новости', callback_data: 'menu:news' },
      ],
      [
        { text: '🖼 Запросить фото', callback_data: 'action:next' },
        { text: timerButtonText, callback_data: 'timer:toggle' },
      ],
      [
        { text: '🛑 Стоп', callback_data: 'bot:stop' },
        { text: '🗑 Сброс', callback_data: 'reset:ask' },
      ],
    ],
  };
}

async function showNextPikabuPost(chatId, category = 'all', oldMessageId = null) {
  if (oldMessageId) {
    await tgRequest('deleteMessage', { chat_id: chatId, message_id: oldMessageId });
  }

  const queueKey = category === 'all' ? 'queue:pikabu' : `queue:pikabu:${category}`;
  const rawPost = await redis.rpop(queueKey);
  const countLeft = await redis.llen(queueKey);

  if (!rawPost) {
    await tgRequest('sendMessage', {
      chat_id: chatId,
      text: `📭 В категории [${category}] постов пока нет!`,
      reply_markup: await getPikabuMenuKeyboard(),
    });
    return;
  }

  const post = typeof rawPost === 'string' ? JSON.parse(rawPost) : rawPost;
  const qKey = crypto.randomBytes(4).toString('hex');
  await redis.set(`pk:pending:${qKey}`, JSON.stringify(post), { ex: 30 * 86400 });

  const catMeta = PIKABU_CATEGORIES.find((c) => c.id === post.category);
  const catTitle = catMeta ? catMeta.title : post.category;
  const commInfo = post.community ? ` [${post.community}]` : '';

  let messageText = `<b>${post.title}</b>\n\n`;
  if (post.text) {
    const textSnippet = post.text.length > 550 ? post.text.slice(0, 550) + '...' : post.text;
    messageText += `${textSnippet}\n\n`;
  }
  messageText += `🏷 <i>${catTitle}${commInfo}</i> | ⭐️ +${post.rating} | 💬 ${post.comments}`;

  const markup = {
    inline_keyboard: [
      [
        { text: '🚀 Опубликовать', callback_data: `pk:pub:${qKey}` },
        { text: '❌ Пропустить', callback_data: `pk:skip:${qKey}:${category}` },
      ],
      [
        { text: `▶ Следующий (${countLeft})`, callback_data: `pk:next:${category}:${qKey}` },
        { text: '◀ К категориям', callback_data: 'menu:pikabu' },
      ],
    ],
  };

  if (post.imgUrl) {
    const imgRes = await tgRequest('sendPhoto', {
      chat_id: chatId,
      photo: post.imgUrl,
      caption: messageText,
      parse_mode: 'HTML',
      reply_markup: markup,
    });
    if (!imgRes.ok) {
      await tgRequest('sendMessage', {
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: markup,
      });
    }
  } else {
    await tgRequest('sendMessage', {
      chat_id: chatId,
      text: messageText,
      parse_mode: 'HTML',
      reply_markup: markup,
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Curator Webhook Running');
  }

  const update = req.body;

  try {
    const message = update.message;
    if (message && ADMIN_CHAT_ID && String(message.chat.id) === String(ADMIN_CHAT_ID)) {
      if (message.text === '/start' || message.text === '/menu') {
        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: '🎛 Главное меню управления:',
          reply_markup: await getMainMenuKeyboard(),
        });
        return res.status(200).json({ ok: true });
      }
    }

    const cb = update.callback_query;
    if (!cb) return res.status(200).json({ ok: true });

    const { id: callbackId, data, message: cbMsg } = cb;

    // Меню категорий Пикабу
    if (data === 'menu:pikabu') {
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId });
      const kbd = await getPikabuMenuKeyboard();
      if (cbMsg?.message_id) {
        await tgRequest('deleteMessage', { chat_id: ADMIN_CHAT_ID, message_id: cbMsg.message_id });
      }
      await tgRequest('sendMessage', {
        chat_id: ADMIN_CHAT_ID,
        text: '📑 Выберите категорию Пикабу:',
        reply_markup: kbd,
      });
      return res.status(200).json({ ok: true });
    }

    // Выбор конкретной категории
    if (data.startsWith('pk:cat:')) {
      const category = data.split(':')[2];
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId });
      await showNextPikabuPost(ADMIN_CHAT_ID, category, cbMsg?.message_id);
      return res.status(200).json({ ok: true });
    }

    // Следующий пост категории (затирает предыдущий)
    if (data.startsWith('pk:next:')) {
      const [, , category, oldKey] = data.split(':');
      if (oldKey) await redis.del(`pk:pending:${oldKey}`);
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId });
      await showNextPikabuPost(ADMIN_CHAT_ID, category, cbMsg?.message_id);
      return res.status(200).json({ ok: true });
    }

    // Пропуск поста (оставляет карточку в чате, открывает следующий)
    if (data.startsWith('pk:skip:')) {
      const [, , qKey, category] = data.split(':');
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Отложено' });
      await tgRequest('editMessageReplyMarkup', {
        chat_id: ADMIN_CHAT_ID,
        message_id: cbMsg.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Опубликовать', callback_data: `pk:pub:${qKey}` },
              { text: '🗑 Удалить', callback_data: `pk:del:${qKey}` },
            ],
          ],
        },
      });
      await showNextPikabuPost(ADMIN_CHAT_ID, category, null);
      return res.status(200).json({ ok: true });
    }

    // Удаление отложенного поста
    if (data.startsWith('pk:del:')) {
      const qKey = data.split(':')[2];
      await redis.del(`pk:pending:${qKey}`);
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Удалено' });
      await tgRequest('deleteMessage', { chat_id: ADMIN_CHAT_ID, message_id: cbMsg.message_id });
      return res.status(200).json({ ok: true });
    }

    // Публикация в канал
    if (data.startsWith('pk:pub:')) {
      const qKey = data.split(':')[2];
      const rawCached = await redis.get(`pk:pending:${qKey}`);

      if (!rawCached) {
        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Срок действия поста истёк.',
          show_alert: true,
        });
        return res.status(200).json({ ok: true });
      }

      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Публикую...' });
      const post = typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

      let postContent = `<b>${post.title}</b>`;
      if (post.text) {
        postContent += `\n\n${post.text}`;
      }
      postContent = postContent.slice(0, 1024);

      let pubRes;
      if (post.imgUrl) {
        pubRes = await tgRequest('sendPhoto', {
          chat_id: TARGET_CHANNEL_ID,
          photo: post.imgUrl,
          caption: postContent,
          parse_mode: 'HTML',
        });
      } else {
        pubRes = await tgRequest('sendMessage', {
          chat_id: TARGET_CHANNEL_ID,
          text: postContent,
          parse_mode: 'HTML',
        });
      }

      if (pubRes?.ok) {
        await redis.del(`pk:pending:${qKey}`);
        await tgRequest('deleteMessage', { chat_id: ADMIN_CHAT_ID, message_id: cbMsg.message_id });
        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: '✅ Успешно опубликовано в канал!',
          reply_markup: await getMainMenuKeyboard(),
        });
      } else {
        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: `Ошибка публикации: ${pubRes?.description || 'неизвестно'}`,
        });
      }
      return res.status(200).json({ ok: true });
    }

    // Возврат в меню
    if (data === 'menu:back') {
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId });
      if (cbMsg?.message_id) {
        await tgRequest('deleteMessage', { chat_id: ADMIN_CHAT_ID, message_id: cbMsg.message_id });
      }
      await tgRequest('sendMessage', {
        chat_id: ADMIN_CHAT_ID,
        text: '🎛 Главное меню:',
        reply_markup: await getMainMenuKeyboard(),
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Curator Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
