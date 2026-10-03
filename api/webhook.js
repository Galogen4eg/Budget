/**
 * @file api/webhook.js
 * Обработчик входящих вебхуков от Telegram бота с интеграцией Google Gemini
 * и синхронизацией данных с веб-приложением Terra через Redis.
 */

import { redis } from '../lib/redis.js';

const QUEUE_KEY = 'terra:sync:queue';

/**
 * Записывает действие в очередь синхронизации с сайтом через Redis.
 */
async function enqueueAction(action, payload, chatId) {
  try {
    const newEntry = {
      id: `tg_act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action,
      payload,
      chatId: String(chatId),
      createdAt: Date.now(),
    };
    await redis.lpush(QUEUE_KEY, JSON.stringify(newEntry));
    await redis.ltrim(QUEUE_KEY, 0, 99);
    return newEntry;
  } catch (err) {
    console.error('Ошибка записи в очередь telegram-sync (Redis):', err);
    return null;
  }
}

/**
 * Резервный парсер на регулярных выражениях, если AI временно недоступен.
 */
function fallbackRuleParser(text) {
  const lower = text.toLowerCase().trim();

  // 1. Список покупок ("купи муку 1 кг", "добавь в покупки молоко 2л")
  if (lower.startsWith('купи ') || lower.includes('покуп') || lower.startsWith('добавь в список')) {
    const rawItems = text
      .replace(/^(купи|добавь в покупки|добавь в список покупок|добавь в список|список покупок:?)/i, '')
      .trim();

    const parts = rawItems.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
    const items = parts.map(part => {
      const match = part.match(/^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(кг|г|л|мл|шт|уп|пач(?:ка|ки)?)?$/i);
      if (match) {
        let unit = match[3] || 'шт';
        if (unit.startsWith('пач')) unit = 'уп';
        return {
          title: match[1].trim(),
          amount: match[2].replace(',', '.'),
          unit,
        };
      }
      return { title: part, amount: '1', unit: 'шт' };
    });

    if (items.length > 0) {
      return {
        action: 'add_shopping',
        items,
        reply: `🛒 Добавлено в список покупок на сайте: ${items.map(i => `${i.title} (${i.amount} ${i.unit})`).join(', ')}`
      };
    }
  }

  // 2. Расход / доход ("трата 500 кофе", "расход 1200 такси", "доход 35000 зарплата")
  const txMatch = lower.match(/^(трата|расход|потратил|купил|доход|зарплата)\s+(\d+(?:[.,]\d+)?)\s*(?:₽|руб(?:лей)?)?\s*(.*)$/i);
  if (txMatch) {
    const isIncome = ['доход', 'зарплата'].includes(txMatch[1]);
    const amount = parseFloat(txMatch[2].replace(',', '.'));
    const note = txMatch[3]?.trim() || (isIncome ? 'Доход' : 'Расход');

    return {
      action: 'add_transaction',
      transaction: {
        amount,
        type: isIncome ? 'income' : 'expense',
        note,
        date: new Date().toISOString().split('T')[0],
      },
      reply: `✅ ${isIncome ? 'Доход' : 'Расход'} на ${amount} ₽ («${note}») записан на сайте!`
    };
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  try {
    const { message } = req.body || {};
    if (!message || !message.text) {
      return res.status(200).send('OK');
    }

    const chatId = message.chat.id;
    const userText = message.text.trim();

    // Команда /start
    if (userText === '/start') {
      const welcome = 
        `👋 Привет! Я семейный AI-ассистент Terra.\n\n` +
        `Я умею мгновенно изменять данные на вашем сайте:\n` +
        `• 🛒 «Добавь в список покупок муку 1 кг и сыр» — добавит товары на сайт\n` +
        `• 💸 «Расход 450 кофе» — запишет трату\n` +
        `• 📅 «Создай событие на завтра в 14:00 встреча» — добавит в планы\n` +
        `• 📊 «Сколько потрачено в этом месяце?» — проанализирует траты\n\n` +
        `Ваш Chat ID: ${chatId}\n(Укажите его в Настройках на сайте в разделе Telegram)`;
      
      await sendTelegram(chatId, welcome);
      return res.status(200).send('OK');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let handled = false;

    // Обработка через Gemini AI
    if (apiKey) {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const systemPrompt = 
          `Ты — семейный финансовый ассистент Terra для Telegram бота.
Сегодня: ${todayStr}.
Пользователь пишет команду. Ты должен вернуть ответ СТРОГО в формате JSON без разметки markdown:
{
  "action": "add_shopping" | "create_event" | "add_transaction" | "general_chat",
  "reply": "Текст подтверждения пользователю на русском",
  "shoppingItems": [ { "title": "Мука", "amount": "1", "unit": "кг" } ],
  "event": { "title": "Встреча", "date": "YYYY-MM-DD", "time": "14:00" },
  "transaction": { "amount": 500, "type": "expense", "note": "Кофе" }
}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
        let geminiData = await callGemini(geminiUrl, userText, systemPrompt);

        if (geminiData.error && typeof geminiData.error.message === 'string' && geminiData.error.message.includes('high demand')) {
          await new Promise(r => setTimeout(r, 1500));
          geminiData = await callGemini(geminiUrl, userText, systemPrompt);
        }

        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          let parsed;
          try {
            parsed = JSON.parse(rawText);
          } catch {
            const first = rawText.indexOf('{');
            const last = rawText.lastIndexOf('}');
            if (first !== -1 && last !== -1) {
              parsed = JSON.parse(rawText.substring(first, last + 1));
            }
          }

          if (parsed && parsed.action && parsed.action !== 'general_chat') {
            await enqueueAction(parsed.action, parsed, chatId);
            await sendTelegram(chatId, `✅ ${parsed.reply || 'Действие синхронизировано с сайтом!'}`);
            handled = true;
          } else if (parsed && parsed.reply) {
            await sendTelegram(chatId, parsed.reply);
            handled = true;
          }
        }
      } catch (aiErr) {
        console.warn('Gemini parsing warning, falling back to rule parser:', aiErr.message);
      }
    }

    // Резервный парсер при недоступности AI
    if (!handled) {
      const fallback = fallbackRuleParser(userText);
      if (fallback) {
        await enqueueAction(fallback.action, fallback, chatId);
        await sendTelegram(chatId, fallback.reply);
        handled = true;
      }
    }

    if (!handled) {
      await sendTelegram(chatId, `Я вас понял! Чтобы добавить что-то на сайт, напишите например: «Купи муку 1 кг» или «Расход 500 кофе».`);
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Ошибка в webhook:', error);
    return res.status(200).send('OK');
  }
}

async function callGemini(url, userText, systemInstruction) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
    })
  });
  return await res.json();
}

async function sendTelegram(chatId, text) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^bot/i, '');
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN не задан');
    return;
  }

  const safeText = text && text.length > 4000 ? text.slice(0, 4000) + '...' : (text || 'Пустой ответ.');

  // Отправка без parse_mode исключает падения из-за спецсимволов _, *, [, ]
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: safeText,
      disable_web_page_preview: true
    })
  });
}