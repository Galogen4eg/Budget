/**
 * @file api/telegram-sync.js
 * Серверная очередь синхронизации между Telegram-ботом и веб-сайтом Terra на базе Redis.
 */

import { redis } from '../lib/redis.js';

const QUEUE_KEY = 'terra:sync:queue';

async function getQueue() {
  try {
    const rawItems = await redis.lrange(QUEUE_KEY, 0, -1);
    if (!rawItems || rawItems.length === 0) return [];
    return rawItems.map(item => {
      try {
        return typeof item === 'string' ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (e) {
    console.error('Ошибка чтения очереди из Redis:', e);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Получение очереди для сайта
  if (req.method === 'GET') {
    const { chatId } = req.query || {};
    let queue = await getQueue();

    if (chatId) {
      queue = queue.filter(item => !item.chatId || String(item.chatId) === String(chatId));
    }

    return res.status(200).json({ ok: true, queue });
  }

  // POST: Подтверждение обработки (ack) или добавление нового действия
  if (req.method === 'POST') {
    try {
      const body = req.body || {};

      // Подтверждение обработки (удаление подтвержденных id)
      if (Array.isArray(body.ackIds)) {
        const queue = await getQueue();
        const updated = queue.filter(item => !body.ackIds.includes(item.id));
        
        await redis.del(QUEUE_KEY);
        if (updated.length > 0) {
          const stringified = updated.map(x => JSON.stringify(x));
          await redis.rpush(QUEUE_KEY, ...stringified);
        }
        return res.status(200).json({ ok: true, remaining: updated.length });
      }

      // Добавление действия вручную/через webhook
      if (body.action) {
        const newEntry = {
          id: `tg_act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          action: body.action,
          payload: body.payload || {},
          chatId: body.chatId ? String(body.chatId) : null,
          createdAt: Date.now(),
        };

        await redis.lpush(QUEUE_KEY, JSON.stringify(newEntry));
        await redis.ltrim(QUEUE_KEY, 0, 99);
        return res.status(200).json({ ok: true, entry: newEntry });
      }

      return res.status(400).json({ error: 'Неверные параметры' });
    } catch (e) {
      console.error('Ошибка в telegram-sync:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}