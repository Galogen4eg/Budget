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
    const userText = message.text;

    if (userText === '/start') {
      await sendTelegram(chatId, 'Привет! Бот на связи и готов отвечать на вопросы.');
      return res.status(200).send('OK');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await sendTelegram(chatId, 'Ошибка: в настройках Vercel не задан GEMINI_API_KEY.');
      return res.status(200).send('OK');
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    
    // Пытаемся сделать запрос с 1 повтором в случае перегрузки
    let geminiData = await callGemini(geminiUrl, userText);

    if (geminiData.error && typeof geminiData.error.message === 'string' && geminiData.error.message.includes('high demand')) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Пауза 1.5 секунды
      geminiData = await callGemini(geminiUrl, userText);
    }

    if (geminiData.error) {
      await sendTelegram(chatId, `Ошибка Gemini: ${geminiData.error.message}`);
      return res.status(200).send('OK');
    }

    const botReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Пустой ответ.';
    await sendTelegram(chatId, botReply);

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Ошибка в webhook:', error);
    return res.status(200).send('OK');
  }
}

async function callGemini(url, text) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text }] }]
    })
  });
  return await res.json();
}

async function sendTelegram(chatId, text) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^bot/i, '');
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN не задан в переменных окружения');
    return;
  }

  // Защита от превышения лимита Telegram в 4096 символов на одно сообщение
  const safeText = text && text.length > 4000 ? text.slice(0, 4000) + '...' : (text || 'Пустой ответ.');

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: safeText
    })
  });
}
