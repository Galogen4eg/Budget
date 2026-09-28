export default async function handler(req, res) {
  // Telegram отправляет данные методом POST
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  try {
    const { message } = req.body || {};

    // Если нет текста (например, стикер или сервисный сигнал), пропускаем
    if (!message || !message.text) {
      return res.status(200).send('OK');
    }

    const chatId = message.chat.id;
    const userText = message.text;

    // Реакция на первое включение
    if (userText === '/start') {
      await sendTelegram(chatId, 'Привет! Бот на связи и готов отвечать на вопросы.');
      return res.status(200).send('OK');
    }

    // Запрос к Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: 'Ты — лаконичный ассистент. Отвечай прямо, без воды.' }]
        },
        contents: [{ role: 'user', parts: [{ text: userText }] }]
      })
    });

    const geminiData = await geminiRes.json();
    const botReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Не удалось сформировать ответ.';

    // Отправка ответа пользователю в Telegram
    await sendTelegram(chatId, botReply);

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Ошибка в webhook:', error);
    return res.status(200).send('OK');
  }
}

async function sendTelegram(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });
}
