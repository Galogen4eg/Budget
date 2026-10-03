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

  return {
    inline_keyboard: [
      [
        { text: '📰 Новости', callback_data: 'menu:news' },
        { text: '🖼 Запросить фото', callback_data: 'action:next' },
      ],
      [
        { text: timerButtonText, callback_data: 'timer:toggle' },
        { text: '🛑 Стоп', callback_data: 'bot:stop' },
        { text: '🗑 Сброс', callback_data: 'reset:ask' },
      ],
    ],
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Curator Webhook is running');
  }

  const update = req.body;

  try {
    // 1. Приём новых фото из канала-склада
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
          text: `Фото добавлено в пул.\nВсего в наличии: ${totalAvailable} шт.`,
          reply_markup: await getMainMenuKeyboard(),
        });
      }

      return res.status(200).json({ ok: true, added: fileId });
    }

    // 2. Обработка входящих сообщений
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
                { text: '✅ Готово (ввести текст)', callback_data: 'album:done' },
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
            text: '🎛 Панель управления:\nВыберите действие:',
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
              inline_keyboard: [
                [{ text: '▶️ Запустить бота снова', callback_data: 'bot:start' }],
              ],
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

        // Публикация альбома с текстом
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
            console.error('Failed to publish album:', publishResponse);
            await tgRequest('sendMessage', {
              chat_id: ADMIN_CHAT_ID,
              text: `Ошибка публикации: ${publishResponse.description}`,
              reply_markup: await getMainMenuKeyboard(),
            });
            return res.status(200).json({ ok: false, error: publishResponse.description });
          }

          // Переносим в used только если фото изначально принадлежало складу
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
            text: `✅ Пост (${fileIds.length} фото) успешно опубликован в канал!`,
            reply_markup: await getMainMenuKeyboard(),
          });

          const remaining = await redis.scard('photos:available');
          if (remaining <= 3) {
            await tgRequest('sendMessage', {
              chat_id: ADMIN_CHAT_ID,
              text: `Осталось неопубликованных всего ${remaining} фото.`,
            });
          }

          return res.status(200).json({ ok: true });
        }

        // Одиночная публикация с текстом
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
            console.error('Failed to publish photo:', publishResponse);
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
            text: '✅ Фото с описанием успешно опубликовано в канал!',
            reply_markup: await getMainMenuKeyboard(),
          });

          const remaining = await redis.scard('photos:available');
          if (remaining <= 3) {
            await tgRequest('sendMessage', {
              chat_id: ADMIN_CHAT_ID,
              text: `Осталось неопубликованных всего ${remaining} фото.`,
            });
          }

          return res.status(200).json({ ok: true });
        }
      }
    }

    // 3. Обработка callback-кнопок
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

        if (message && message.chat && message.message_id) {
          await tgRequest('editMessageReplyMarkup', {
            chat_id: message.chat.id,
            message_id: message.message_id,
            reply_markup: newKeyboard,
          });
        }

        return res.status(200).json({ ok: true, state: nextState });
      }

      if (data === 'bot:stop') {
        await redis.set('settings:timer_enabled', '0');
        await redis.del(`admin:batch:${ADMIN_CHAT_ID}`);
        await redis.del(`admin:waiting_album_text:${ADMIN_CHAT_ID}`);
        await redis.del(`admin:waiting_text:${ADMIN_CHAT_ID}`);

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Бот остановлен',
        });

        await tgRequest('editMessageText', {
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: '🛑 Работа бота приостановлена. Автопостинг выключен, буферы очищены.',
          reply_markup: {
            inline_keyboard: [
              [{ text: '▶️ Запустить бота снова', callback_data: 'bot:start' }],
            ],
          },
        });

        return res.status(200).json({ ok: true });
      }

      if (data === 'bot:start') {
        await redis.set('settings:timer_enabled', '1');

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Бот запущен',
        });

        await tgRequest('editMessageText', {
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: '🎛 Панель управления:\nВыберите действие:',
          reply_markup: await getMainMenuKeyboard(),
        });

        return res.status(200).json({ ok: true });
      }

      if (data === 'reset:ask') {
        const usedCount = await redis.scard('photos:used');
        const availCount = await redis.scard('photos:available');

        await tgRequest('answerCallbackQuery', { callback_query_id: callbackId });
        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: `⚙️ Управление базой фотографий:\n• В наличии в пуле: ${availCount} шт.\n• Опубликовано ранее: ${usedCount} шт.`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '♻️ Вернуть отправленные в пул', callback_data: 'reset:confirm' }],
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

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'История сброшена!',
        });

        await tgRequest('editMessageText', {
          chat_id: message.chat.id,
          message_id: message.message_id,
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

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Пул очищен!',
        });

        await tgRequest('editMessageText', {
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: '🧹 Пул доступных фото очищен до 0. Загрузите новые фотографии в канал-склад.',
          reply_markup: await getMainMenuKeyboard(),
        });

        return res.status(200).json({ ok: true });
      }

      if (data === 'reset:cancel') {
        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Отменено.',
        });

        await tgRequest('editMessageText', {
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: 'Очистка отменена.',
          reply_markup: await getMainMenuKeyboard(),
        });

        return res.status(200).json({ ok: true });
      }

      // Запрос случайного фото
      if (data === 'action:next') {
        // Сбрасываем ожидание текста, если админ передумал и запросил новое фото
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
            caption: `📸 Фото на модерацию (в пуле: ${totalAvailable} шт.)`,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Опубликовать', callback_data: `publish:${shortKey}` },
                  { text: '❌ Пропустить', callback_data: `reject:${shortKey}` },
                ],
                [
                  { text: '🖼 Другое изображение', callback_data: 'action:next' },
                ],
              ],
            },
          });

          if (!sendRes.ok) {
            // Удаляем из пула ТОЛЬКО если Telegram вернул ошибку 400 (несуществующий/удаленный file_id)
            if (sendRes.error_code === 400) {
              console.warn(`Фото ${randomFileId} невалидно, удаляем из базы:`, sendRes.description);
              await redis.srem('photos:available', randomFileId);
              continue;
            } else {
              // При сетевом сбое Telegram (5xx, 429) прерываем цикл, чтобы не стереть базу
              console.error('Сбой Telegram API, прерываем выборку:', sendRes.description);
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

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Изображение отправлено',
        });

        return res.status(200).json({ ok: true });
      }

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
          text: `✍️ Выбрано ${count} фото. Отправьте текст для поста следующим сообщением в этот чат:`,
        });

        return res.status(200).json({ ok: true });
      }

      if (data === 'album:clear') {
        await redis.del(`admin:batch:${ADMIN_CHAT_ID}`);
        await redis.del(`admin:waiting_album_text:${ADMIN_CHAT_ID}`);

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Корзина очищена.',
        });

        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: '🗑 Выбор сброшен. Можете переслать новые фото.',
          reply_markup: await getMainMenuKeyboard(),
        });

        return res.status(200).json({ ok: true });
      }

      if (data === 'menu:news') {
        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Выбор источника новостей',
        });

        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: '📰 Выберите источник новостей:',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'PetaPixel', callback_data: 'news:petapixel' },
              ],
              [
                { text: '◀ Назад в меню', callback_data: 'menu:back' },
              ],
            ],
          },
        });
        return res.status(200).json({ ok: true });
      }

      if (data === 'news:petapixel') {
        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Генерация новости запущена...',
        });

        // Запуск генерации черновика новостей
        const curatorUrl = `https://${process.env.VERCEL_PROJECT_URL || req.headers.host}/api/curator-find`;
        fetch(curatorUrl).catch(e => console.error('Ошибка вызова curator-find:', e));

        return res.status(200).json({ ok: true });
      }

      if (data === 'menu:back') {
        await tgRequest('answerCallbackQuery', { callback_query_id: callbackId });
        await tgRequest('sendMessage', {
          chat_id: ADMIN_CHAT_ID,
          text: '🎛 Главное меню:',
          reply_markup: await getMainMenuKeyboard(),
        });
        return res.status(200).json({ ok: true });
      }

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

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Введите текст поста.',
        });

        await tgRequest('editMessageCaption', {
          chat_id: message.chat.id,
          message_id: message.message_id,
          caption: '✍️️ Отправьте текст для этого фото следующим сообщением.',
          reply_markup: { inline_keyboard: [] },
        });
      } else if (action === 'reject') {
        await redis.del(`photo:pending:${shortKey}`);
        await redis.del(`admin:waiting_text:${ADMIN_CHAT_ID}`);

        await tgRequest('answerCallbackQuery', {
          callback_query_id: callbackId,
          text: 'Пропущено. Фото сохранено в пуле.',
        });

        await tgRequest('editMessageCaption', {
          chat_id: message.chat.id,
          message_id: message.message_id,
          caption: '⏸ Отложено (осталось в доступном пуле).',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🖼 Запросить изображение', callback_data: 'action:next' }],
            ],
          },
        });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Curator Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
