import { redis } from '../lib/redis.js';
import crypto from 'crypto';
import { findAndSendNews } from './curator-find.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.MY_TELEGRAM_ID;
const TARGET_CHANNEL_ID = process.env.PUBLIC_CHANNEL_ID;
const WAREHOUSE_CHANNEL_ID = process.env.WAREHOUSE_CHANNEL_ID;

// 14 актуальных категорий Пикабу (без авто, финансов и еды)
const PIKABU_CATEGORIES = [
  { id: 'memes', title: '😂 Мемы' },
  { id: 'technology', title: '💻 Технологии' },
  { id: 'news', title: '📰 Новости' },
  { id: 'science', title: '🔬 Наука' },
  { id: 'games', title: '🎮 Игры' },
  { id: 'gadgets', title: '📱 Гаджеты' },
  { id: 'diy', title: '🏠 Ремонт' },
  { id: 'travel', title: '🌍 Путешествия' },
  { id: 'animals', title: '🐱 Животные' },
  { id: 'cinema', title: '🎬 Кино' },
  { id: 'music', title: '🎵 Музыка' },
  { id: 'photo', title: '📸 Фото' },
  { id: 'lifehacks', title: '💡 Лайфхаки' },
  { id: 'best', title: '🔥 Лучшее' },
];

async function tgRequest(method, data) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.ok) {
    console.error(`Telegram API [${method}] Error:`, json);
  }
  return json;
}

function isTimerActive(val) {
  if (val === null || val === undefined) return true;
  const normalized = String(val).trim().toLowerCase();
  return normalized === '1' || normalized === 'true';
}

async function setupBotCommands() {
  await tgRequest('setMyCommands', {
    commands: [
      { command: 'start', description: 'Запустить / Главное меню' },
      { command: 'stop', description: 'Остановить работу бота' },
      { command: 'clear', description: 'Полная очистка базы' },
    ],
  });
}

async function getMainMenuKeyboard() {
  const timerState = await redis.get('settings:timer_enabled');
  const isEnabled = isTimerActive(timerState);
  const timerButtonText = isEnabled ? '🟢 Авто' : '🔴 Авто';
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

async function getPikabuMenuKeyboard() {
  const keyboard = [];
  let row = [];

  for (let i = 0; i < PIKABU_CATEGORIES.length; i++) {
    const cat = PIKABU_CATEGORIES[i];
    const count = await redis.llen(`queue:pikabu:${cat.id}`);
    row.push({ text: `${cat.title} (${count})`, callback_data: `pk:cat:${cat.id}` });

    if (row.length === 2 || i === PIKABU_CATEGORIES.length - 1) {
      keyboard.push(row);
      row = [];
    }
  }

  const totalCount = await redis.llen('queue:pikabu');
  keyboard.push([{ text: `🌐 Все подряд (${totalCount})`, callback_data: 'pk:cat:all' }]);
  keyboard.push([{ text: '◀️ В главное меню', callback_data: 'menu:back' }]);

  return { inline_keyboard: keyboard };
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
      text: `📭 В категории [${category}] постов пока нет. Выберите другую тему:`,
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
    const snippet = post.text.length > 550 ? `${post.text.slice(0, 550)}...` : post.text;
    messageText += `${snippet}\n\n`;
  }
  messageText += `🏷 <i>${catTitle}${commInfo}</i> | ⭐️ +${post.rating || 0} | 💬 ${post.comments || 0}`;

  const markup = {
    inline_keyboard: [
      [
        { text: '🚀 Опубликовать в канал', callback_data: `pk:pub:${qKey}` },
        { text: '❌ Пропустить', callback_data: `pk:skip:${qKey}:${category}` },
      ],
      [
        { text: `▶️ Следующий (${countLeft})`, callback_data: `pk:next:${category}:${qKey}` },
        { text: '◀️ К категориям', callback_data: 'menu:pikabu' },
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
    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url, `https://${host}`);
    const sourceParam = parsedUrl.searchParams.get('source') || req.query?.source;

    if (sourceParam) {
      try {
        const result = await findAndSendNews(sourceParam);
        return res.status(200).json({ status: 'ok', topic: sourceParam, result });
      } catch (err) {
        return res.status(500).json({ status: 'error', topic: sourceParam, message: err.message });
      }
    }
    return res.status(200).send('Curator Webhook Running');
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
        const lastMsgId = await redis.get(`admin:last_storage_msg:${ADMIN_CHAT_ID}`);
        const notificationText = `📸 Фото добавлено в пул.\nВсего в наличии: ${totalAvailable} шт.`;
        const keyboard = await getMainMenuKeyboard();

        let updated = false;
        if (lastMsgId) {
          const editRes = await tgRequest('editMessageText', {
            chat_id: ADMIN_CHAT_ID,
            message_id: Number(lastMsgId),
            text: notificationText,
            reply_markup: keyboard,
          });
          if (editRes.ok) updated = true;
        }

        if (!updated) {
          const sendRes = await tgRequest('sendMessage', {
            chat_id: ADMIN_CHAT_ID,
            text: notificationText,
            reply_markup: keyboard,
          });
          if (sendRes.ok && sendRes.result?.message_id) {
            await redis.set(`admin:last_storage_msg:${ADMIN_CHAT_ID}`, sendRes.result.message_id, { ex: 86400 });
          }
        }
      }

      return res.status(200).json({ ok: true, added: fileId });
    }

    const message = update.message;
    if (message && ADMIN_CHAT_ID && String(message.chat.id) === String(ADMIN_CHAT_ID)) {
      if (message.photo) {
        const photo = message.photo[message.photo.length - 1];
        const fileId = photo.file_id;

        const batchKey = `admin:batch:${ADMIN_CHAT_ID}`;
        await redis.rpush(batchKey, fileId);
        await redis.expire(batchKey, 3600);
        const count = await redis.llen(batchKey);

        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: `📥 Фото добавлено в подборку. Выбрано: ${count} шт. (макс. 10)`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Готово (к публикации)', callback_data: 'album:done' },
                { text: '🗑 Очистить выбор', callback_data: 'album:clear' },
              ],
            ],
          },
        });

        return res.status(200).json({ ok: true, batch_count: count });
      }

      if (message.text) {
        const text = message.text.trim();

        if (text === '/start' || text === '/menu') {
          await setupBotCommands();
          await tgRequest('sendMessage', {
            chat_id: ADMIN_CHAT_ID,
            text: '🎛 Главное меню управления:',
            reply_markup: await getMainMenuKeyboard(),
          });
          return res.status(200).json({ ok: true });
        }

        if (text === '/stop') {
          await redis.set('settings:timer_enabled', '0');
          await redis.del(`admin:batch:${ADMIN_CHAT_ID}`);
          await redis.del(`admin:waiting_album_text:${ADMIN_CHAT_ID}`);
          await redis.del(`admin:waiting_text:${ADMIN_CHAT_ID}`);

          await tgRequest('sendMessage', {
            chat_id: ADMIN_CHAT_ID,
            text: '🛑 Работа бота приостановлена. Автопостинг выключен, буферы очищены.',
            reply_markup: {
              inline_keyboard: [[{ text: '▶ Запустить бота снова', callback_data: 'bot:start' }]],
            },
          });
          return res.status(200).json({ ok: true });
        }

        if (text === '/clear' || text === '/clean') {
          await redis.del('photos:available');
          await redis.del('photos:used');
          await redis.del('photos:rejected');
          await redis.del(`admin:batch:${ADMIN_CHAT_ID}`);
          await redis.del(`admin:waiting_album_text:${ADMIN_CHAT_ID}`);
          await redis.del(`admin:waiting_text:${ADMIN_CHAT_ID}`);
          await redis.del(`admin:last_storage_msg:${ADMIN_CHAT_ID}`);

          const keys = await redis.keys('photo:*');
          if (keys && keys.length > 0) {
            await redis.del(...keys);
          }

          await tgRequest('sendMessage', {
            chat_id: ADMIN_CHAT_ID,
            text: '🗑 Пул доступных фото, история публикаций и сессии полностью очищены.',
            reply_markup: await getMainMenuKeyboard(),
          });

          return res.status(200).json({ ok: true, cleared: true });
        }

        const isWaitingAlbumText = await redis.get(`admin:waiting_album_text:${ADMIN_CHAT_ID}`);
        if (isWaitingAlbumText) {
          const batchKey = `admin:batch:${ADMIN_CHAT_ID}`;
          const fileIds = await redis.lrange(batchKey, 0, -1);

          if (!fileIds || fileIds.length === 0) {
            await redis.del(`admin:waiting_album_text:${ADMIN_CHAT_ID}`);
            await tgRequest('sendMessage', {
              chat_id: ADMIN_CHAT_ID,
              text: '❌ Корзина пуста. Перешлите фотографии заново.',
              reply_markup: await getMainMenuKeyboard(),
            });
            return res.status(200).json({ ok: true });
          }

          const safeCaption = text ? text.substring(0, 1024) : undefined;
          let publishResponse;

          if (fileIds.length === 1) {
            publishResponse = await tgRequest('sendPhoto', {
              chat_id: TARGET_CHANNEL_ID,
              photo: fileIds[0],
              caption: safeCaption,
            });
          } else {
            const mediaGroup = fileIds.slice(0, 10).map((id, index) => {
              const item = { type: 'photo', media: id };
              if (index === 0 && safeCaption) item.caption = safeCaption;
              return item;
            });

            publishResponse = await tgRequest('sendMediaGroup', {
              chat_id: TARGET_CHANNEL_ID,
              media: mediaGroup,
            });
          }

          if (!publishResponse.ok) {
            await tgRequest('sendMessage', {
              chat_id: ADMIN_CHAT_ID,
              text: `Ошибка публикации: ${publishResponse.description}`,
              reply_markup: await getMainMenuKeyboard(),
            });
            return res.status(200).json({ ok: false, error: publishResponse.description });
          }

          for (const fid of fileIds) {
            const isFromPool = await redis.sismember('photos:available', fid);
            if (isFromPool) {
              await redis.srem('photos:available', fid);
              await redis.sadd('photos:used', fid);
            }
          }

          await redis.del(batchKey);
          await redis.del(`admin:waiting_album_text:${ADMIN_CHAT_ID}`);

          await tgRequest('sendMessage', {
            chat_id: ADMIN_CHAT_ID,
            text: `✅ Пост (${fileIds.length} фото) опубликован в канал!`,
            reply_markup: await getMainMenuKeyboard(),
          });

          return res.status(200).json({ ok: true });
        }

        const waitingShortKey = await redis.get(`admin:waiting_text:${ADMIN_CHAT_ID}`);
        if (waitingShortKey) {
          const fileId = await redis.get(`photo:pending:${waitingShortKey}`);

          if (!fileId) {
            await redis.del(`admin:waiting_text:${ADMIN_CHAT_ID}`);
            await tgRequest('sendMessage', {
              chat_id: ADMIN_CHAT_ID,
              text: 'Срок действия сессии истёк. Запросите фото заново.',
              reply_markup: await getMainMenuKeyboard(),
            });
            return res.status(200).json({ ok: true });
          }

          const safeCaption = text ? text.substring(0, 1024) : undefined;
          const publishResponse = await tgRequest('sendPhoto', {
            chat_id: TARGET_CHANNEL_ID,
            photo: fileId,
            caption: safeCaption,
          });

          if (!publishResponse.ok) {
            await tgRequest('sendMessage', {
              chat_id: ADMIN_CHAT_ID,
              text: `Ошибка публикации: ${publishResponse.description}`,
              reply_markup: await getMainMenuKeyboard(),
            });
            return res.status(200).json({ ok: false, error: publishResponse.description });
          }

          await redis.srem('photos:available', fileId);
          await redis.sadd('photos:used', fileId);
          await redis.del(`photo:pending:${waitingShortKey}`);
          await redis.del(`admin:waiting_text:${ADMIN_CHAT_ID}`);

          await tgRequest('sendMessage', {
            chat_id: ADMIN_CHAT_ID,
            text: '✅ Фото с описанием опубликовано в канал!',
            reply_markup: await getMainMenuKeyboard(),
          });

          return res.status(200).json({ ok: true });
        }
      }
    }

    const cb = update.callback_query;
    if (!cb) return res.status(200).json({ ok: true });

    const { id: callbackId, data, message: cbMsg, from } = cb;

    if (ADMIN_CHAT_ID && String(from.id) !== String(ADMIN_CHAT_ID)) {
      await tgRequest('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: 'Доступ запрещён.',
        show_alert: true,
      });
      return res.status(200).json({ ok: true });
    }

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

    // Выбор категории
    if (data.startsWith('pk:cat:')) {
      const category = data.split(':')[2];
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId });
      await showNextPikabuPost(ADMIN_CHAT_ID, category, cbMsg?.message_id);
      return res.status(200).json({ ok: true });
    }

    // Следующий пост в категории (затирает старый)
    if (data.startsWith('pk:next:')) {
      const [, , category, oldKey] = data.split(':');
      if (oldKey) await redis.del(`pk:pending:${oldKey}`);
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId });
      await showNextPikabuPost(ADMIN_CHAT_ID, category, cbMsg?.message_id);
      return res.status(200).json({ ok: true });
    }

    // Пропуск поста (оставляет его в чате)
    if (data.startsWith('pk:skip:')) {
      const [, , qKey, category] = data.split(':');
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Отложено' });
      await tgRequest('editMessageReplyMarkup', {
        chat_id: ADMIN_CHAT_ID,
        message_id: cbMsg.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Опубликовать в канал', callback_data: `pk:pub:${qKey}` },
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
      const postData = typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

      let channelText = `<b>${postData.title}</b>`;
      if (postData.text) {
        channelText += `\n\n${postData.text}`;
      }
      channelText = channelText.slice(0, 1024);

      let pubRes;
      if (postData.imgUrl) {
        pubRes = await tgRequest('sendPhoto', {
          chat_id: TARGET_CHANNEL_ID,
          photo: postData.imgUrl,
          caption: channelText,
          parse_mode: 'HTML',
        });
      } else {
        pubRes = await tgRequest('sendMessage', {
          chat_id: TARGET_CHANNEL_ID,
          text: channelText,
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

    // Публикация фото со склада без текста
    if (data.startsWith('pub_raw:')) {
      const shortKey = data.split(':')[1];
      const fileId = await redis.get(`photo:pending:${shortKey}`);

      if (!fileId) {
        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Сессия устарела. Запросите фото заново.',
          show_alert: true,
        });
        return res.status(200).json({ ok: true });
      }

      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Публикую без текста...' });

      const pubRes = await tgRequest('sendPhoto', {
        chat_id: TARGET_CHANNEL_ID,
        photo: fileId,
      });

      if (pubRes && pubRes.ok) {
        await redis.srem('photos:available', fileId);
        await redis.sadd('photos:used', fileId);
        await redis.del(`photo:pending:${shortKey}`);
        await redis.del(`admin:waiting_text:${ADMIN_CHAT_ID}`);

        await tgRequest('editMessageReplyMarkup', {
          chat_id: cbMsg.chat.id,
          message_id: cbMsg.message_id,
          reply_markup: { inline_keyboard: [] },
        });

        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: '✅ Фото без текста опубликовано в канал!',
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

    // Публикация альбома без текста
    if (data === 'album:pub_empty') {
      const batchKey = `admin:batch:${ADMIN_CHAT_ID}`;
      const fileIds = await redis.lrange(batchKey, 0, -1);

      if (!fileIds || fileIds.length === 0) {
        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Корзина пуста. Перешлите фото заново.',
          show_alert: true,
        });
        return res.status(200).json({ ok: true });
      }

      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Публикую альбом...' });

      let publishResponse;
      if (fileIds.length === 1) {
        publishResponse = await tgRequest('sendPhoto', {
          chat_id: TARGET_CHANNEL_ID,
          photo: fileIds[0],
        });
      } else {
        const mediaGroup = fileIds.slice(0, 10).map((id) => ({ type: 'photo', media: id }));
        publishResponse = await tgRequest('sendMediaGroup', {
          chat_id: TARGET_CHANNEL_ID,
          media: mediaGroup,
        });
      }

      if (publishResponse.ok) {
        for (const fid of fileIds) {
          const isFromPool = await redis.sismember('photos:available', fid);
          if (isFromPool) {
            await redis.srem('photos:available', fid);
            await redis.sadd('photos:used', fid);
          }
        }

        await redis.del(batchKey);
        await redis.del(`admin:waiting_album_text:${ADMIN_CHAT_ID}`);

        await tgRequest('editMessageReplyMarkup', {
          chat_id: cbMsg.chat.id,
          message_id: cbMsg.message_id,
          reply_markup: { inline_keyboard: [] },
        });

        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: `✅ Пост (${fileIds.length} фото) без текста опубликован в канал!`,
          reply_markup: await getMainMenuKeyboard(),
        });
      } else {
        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: `Ошибка публикации альбома: ${publishResponse.description}`,
        });
      }
      return res.status(200).json({ ok: true });
    }

    // Запрос фото из хранилища
    if (data === 'action:next') {
      await redis.del(`admin:waiting_text:${ADMIN_CHAT_ID}`);

      let sent = false;
      let attempts = 0;

      while (!sent && attempts < 10) {
        attempts++;
        const totalAvailable = await redis.scard('photos:available');

        if (totalAvailable === 0) {
          await tgRequest('answerCallbackQuery', {
            callback_query_id: callbackId,
            text: 'В хранилище не осталось доступных фото!',
            show_alert: true,
          });
          return res.status(200).json({ ok: true });
        }

        const randomFileId = await redis.srandmember('photos:available');
        const shortKey = crypto.randomBytes(4).toString('hex');

        const sendRes = await tgRequest('sendPhoto', {
          chat_id: ADMIN_CHAT_ID,
          photo: randomFileId,
          caption: `📸 Фото из хранилища (в пуле: ${totalAvailable} шт.)`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🚀 Без текста', callback_data: `pub_raw:${shortKey}` },
                { text: '✍ С текстом', callback_data: `publish:${shortKey}` },
              ],
              [
                { text: '❌ Пропустить', callback_data: `reject:${shortKey}` },
                { text: '🖼 Другое фото', callback_data: 'action:next' },
              ],
            ],
          },
        });

        if (!sendRes.ok) {
          if (sendRes.error_code === 400) {
            await redis.srem('photos:available', randomFileId);
            continue;
          } else {
            await tgRequest('answerCallbackQuery', {
              callback_query_id: callbackId,
              text: 'Сбой сети Telegram. Попробуйте позже.',
              show_alert: true,
            });
            return res.status(200).json({ ok: false });
          }
        }

        await redis.set(`photo:pending:${shortKey}`, randomFileId, { ex: 3600 });
        sent = true;
      }

      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Фото загружено' });
      return res.status(200).json({ ok: true });
    }

    // Подготовка альбома
    if (data === 'album:done') {
      const batchKey = `admin:batch:${ADMIN_CHAT_ID}`;
      const count = await redis.llen(batchKey);

      if (count === 0) {
        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Корзина пуста. Сначала перешлите фото.',
          show_alert: true,
        });
        return res.status(200).json({ ok: true });
      }

      await redis.set(`admin:waiting_album_text:${ADMIN_CHAT_ID}`, '1', { ex: 3600 });
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId });
      await tgRequest('sendMessage', {
        chat_id: ADMIN_CHAT_ID,
        text: `✍ Выбрано ${count} фото.\nОтправьте текст постом или опубликуйте сразу без текста:`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Опубликовать без текста', callback_data: 'album:pub_empty' }],
            [{ text: '🗑 Сбросить альбом', callback_data: 'album:clear' }],
          ],
        },
      });
      return res.status(200).json({ ok: true });
    }

    if (data === 'album:clear') {
      await redis.del(`admin:batch:${ADMIN_CHAT_ID}`);
      await redis.del(`admin:waiting_album_text:${ADMIN_CHAT_ID}`);

      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Корзина очищена.' });
      await tgRequest('sendMessage', {
        chat_id: ADMIN_CHAT_ID,
        text: '🗑 Выбор сброшен. Можете переслать новые фото.',
        reply_markup: await getMainMenuKeyboard(),
      });
      return res.status(200).json({ ok: true });
    }

    // Меню новостей
    if (data === 'menu:news') {
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Выбор темы' });

      const newsKeyboard = {
        inline_keyboard: [
          [
            { text: '💻 IT (Хабр)', callback_data: 'news:it' },
            { text: '📱 Гаджеты', callback_data: 'news:gadgets' },
          ],
          [
            { text: '🤡 Reddit Мемы', callback_data: 'news:memes' },
            { text: '◀ Назад в меню', callback_data: 'menu:back' },
          ],
        ],
      };

      if (cbMsg?.message_id) {
        await tgRequest('deleteMessage', { chat_id: ADMIN_CHAT_ID, message_id: cbMsg.message_id });
      }
      await tgRequest('sendMessage', {
        chat_id: ADMIN_CHAT_ID,
        text: '📰 Выберите тематику новости для генерации:',
        reply_markup: newsKeyboard,
      });
      return res.status(200).json({ ok: true });
    }

    if (data.startsWith('news:')) {
      const topic = data.split(':')[1];
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: `Ищу контент [${topic}]...` });

      try {
        await findAndSendNews(topic);
      } catch (err) {
        console.error('Ошибка генерации новости:', err.message);
        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: `⚠️ Сбой при получении контента (${topic}):\n${err.message}`,
        });
      }
      return res.status(200).json({ ok: true });
    }

    // Таймер автопостинга
    if (data === 'timer:toggle') {
      const rawState = await redis.get('settings:timer_enabled');
      const currentlyActive = isTimerActive(rawState);
      const nextState = currentlyActive ? '0' : '1';

      await redis.set('settings:timer_enabled', nextState);
      await tgRequest('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: nextState === '1' ? 'Автопостинг включен 🟢' : 'Автопостинг выключен 🔴',
      });

      const newKeyboard = await getMainMenuKeyboard();
      if (cbMsg?.chat && cbMsg?.message_id) {
        await tgRequest('editMessageReplyMarkup', {
          chat_id: cbMsg.chat.id,
          message_id: cbMsg.message_id,
          reply_markup: newKeyboard,
        });
      }
      return res.status(200).json({ ok: true, state: nextState });
    }

    // Остановка и запуск бота
    if (data === 'bot:stop') {
      await redis.set('settings:timer_enabled', '0');
      await redis.del(`admin:batch:${ADMIN_CHAT_ID}`);
      await redis.del(`admin:waiting_album_text:${ADMIN_CHAT_ID}`);
      await redis.del(`admin:waiting_text:${ADMIN_CHAT_ID}`);

      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Бот остановлен' });
      await tgRequest('editMessageText', {
        chat_id: cbMsg.chat.id,
        message_id: cbMsg.message_id,
        text: '🛑 Работа бота приостановлена. Автопостинг выключен, буферы очищены.',
        reply_markup: {
          inline_keyboard: [[{ text: '▶ Запустить бота снова', callback_data: 'bot:start' }]],
        },
      });
      return res.status(200).json({ ok: true });
    }

    if (data === 'bot:start') {
      await redis.set('settings:timer_enabled', '1');
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Бот запущен' });
      await tgRequest('editMessageText', {
        chat_id: cbMsg.chat.id,
        message_id: cbMsg.message_id,
        text: '🎛 Главное меню управления:',
        reply_markup: await getMainMenuKeyboard(),
      });
      return res.status(200).json({ ok: true });
    }

    // Сброс и управление базой фото
    if (data === 'reset:ask') {
      const usedCount = await redis.scard('photos:used');
      const availCount = await redis.scard('photos:available');

      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId });
      await tgRequest('sendMessage', {
        chat_id: ADMIN_CHAT_ID,
        text: `⚙️ Управление базы фотографий:\n• В наличии в пуле: ${availCount} шт.\n• Опубликовано ранее: ${usedCount} шт.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '♻ Вернуть отправленные в пул', callback_data: 'reset:confirm' }],
            [{ text: '🧹 Очистить весь пул (склад пуст)', callback_data: 'reset:pool_confirm' }],
            [{ text: 'Отмена', callback_data: 'reset:cancel' }],
          ],
        },
      });
      return res.status(200).json({ ok: true });
    }

    if (data === 'reset:confirm') {
      const usedPhotos = await redis.smembers('photos:used');
      if (usedPhotos && usedPhotos.length > 0) {
        await redis.sadd('photos:available', ...usedPhotos);
        await redis.del('photos:used');
      }
      const totalAvailable = await redis.scard('photos:available');
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'История сброшена!' });
      await tgRequest('editMessageText', {
        chat_id: cbMsg.chat.id,
        message_id: cbMsg.message_id,
        text: `✅ История очищена. Все фото возвращены.\nВсего доступно к публикации: ${totalAvailable} шт.`,
        reply_markup: await getMainMenuKeyboard(),
      });
      return res.status(200).json({ ok: true });
    }

    if (data === 'reset:pool_confirm') {
      await redis.del('photos:available');
      await redis.del(`admin:batch:${ADMIN_CHAT_ID}`);
      await redis.del(`admin:waiting_album_text:${ADMIN_CHAT_ID}`);
      await redis.del(`admin:waiting_text:${ADMIN_CHAT_ID}`);
      await redis.del(`admin:last_storage_msg:${ADMIN_CHAT_ID}`);

      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Пул очищен!' });
      await tgRequest('editMessageText', {
        chat_id: cbMsg.chat.id,
        message_id: cbMsg.message_id,
        text: '🧹 Пул доступных фото очищен до 0. Загрузите новые фотографии в канал-склад.',
        reply_markup: await getMainMenuKeyboard(),
      });
      return res.status(200).json({ ok: true });
    }

    if (data === 'reset:cancel') {
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Отменено.' });
      await tgRequest('editMessageText', {
        chat_id: cbMsg.chat.id,
        message_id: cbMsg.message_id,
        text: 'Очистка отменена.',
        reply_markup: await getMainMenuKeyboard(),
      });
      return res.status(200).json({ ok: true });
    }

    // Возврат в меню
    if (data === 'menu:back') {
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId });
      const mainKeyboard = await getMainMenuKeyboard();

      if (cbMsg?.message_id) {
        await tgRequest('deleteMessage', { chat_id: ADMIN_CHAT_ID, message_id: cbMsg.message_id });
      }
      await tgRequest('sendMessage', {
        chat_id: ADMIN_CHAT_ID,
        text: '🎛 Главное меню управления:',
        reply_markup: mainKeyboard,
      });
      return res.status(200).json({ ok: true });
    }

    // Обработка одиночного фото с ручным вводом текста
    const [action, shortKey] = data.split(':');
    const fileId = await redis.get(`photo:pending:${shortKey}`);

    if (!fileId && (action === 'publish' || action === 'reject')) {
      await tgRequest('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: 'Сессия устарела или фото уже обработано.',
        show_alert: true,
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'publish') {
      await redis.set(`admin:waiting_text:${ADMIN_CHAT_ID}`, shortKey, { ex: 3600 });
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Ожидаю текст' });
      await tgRequest('editMessageCaption', {
        chat_id: cbMsg.chat.id,
        message_id: cbMsg.message_id,
        caption: '✍️ Отправьте текст для фото сообщением или нажмите кнопку ниже:',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Опубликовать без текста', callback_data: `pub_raw:${shortKey}` }],
            [{ text: '❌ Отмена', callback_data: `reject:${shortKey}` }],
          ],
        },
      });
    } else if (action === 'reject') {
      await redis.del(`photo:pending:${shortKey}`);
      await redis.del(`admin:waiting_text:${ADMIN_CHAT_ID}`);
      await tgRequest('answerCallbackQuery', { callback_query_id: callbackId, text: 'Пропущено.' });
      await tgRequest('editMessageCaption', {
        chat_id: cbMsg.chat.id,
        message_id: cbMsg.message_id,
        caption: '⏸ Отложено (осталось в пуле).',
        reply_markup: {
          inline_keyboard: [[{ text: '🖼 Запросить изображение', callback_data: 'action:next' }]],
        },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Curator Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
