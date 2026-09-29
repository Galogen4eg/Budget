/**
 * @file api/telegram-sync.js
 * Серверная очередь синхронизации между Telegram-ботом и веб-сайтом Terra.
 * Хранит запланированные действия (покупки, траты, события) и передаёт их клиенту.
 */

import fs from 'fs';
import path from 'path';

const QUEUE_FILE = path.join('/tmp', 'terra_telegram_queue.json');

// Чтение очереди из временного файла
function readQueue() {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      const data = fs.readFileSync(QUEUE_FILE, 'utf-8');
      return JSON.parse(data) || [];
    }
  } catch (e) {
    console.error('Ошибка чтения очереди telegram-sync:', e);
  }
  return [];
}

// Запись очереди во временный файл
function writeQueue(items) {
  try {
    // Храним не более 100 последних действий
    const trimmed = items.slice(-100);
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(trimmed), 'utf-8');
  } catch (e) {
    console.error('Ошибка записи очереди telegram-sync:', e);
  }
}

export default async function handler(req, res) {
  // Настройка CORS для доступа из браузера
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Получение очереди для сайта
  if (req.method === 'GET') {
    const { chatId } = req.query || {};
    let queue = readQueue();

    // Фильтрация по chatId если передан
    if (chatId) {
      queue = queue.filter(item => !item.chatId || String(item.chatId) === String(chatId));
    }

    return res.status(200).json({ ok: true, queue });
  }

  // POST: Добавление нового действия из webhook или подтверждение (ack)
  if (req.method === 'POST') {
    try {
      const body = req.body || {};

      // 1. Подтверждение обработки (удаление из очереди)
      if (Array.isArray(body.ackIds)) {
        const queue = readQueue();
        const updated = queue.filter(item => !body.ackIds.includes(item.id));
        writeQueue(updated);
        return res.status(200).json({ ok: true, remaining: updated.length });
      }

      // 2. Добавление действия из webhook
      if (body.action) {
        const queue = readQueue();
        const newEntry = {
          id: `tg_act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          action: body.action,
          payload: body.payload || {},
          chatId: body.chatId ? String(body.chatId) : null,
          createdAt: Date.now(),
        };

        queue.push(newEntry);
        writeQueue(queue);
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
