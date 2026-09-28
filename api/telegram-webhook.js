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

    // Запрос к проверенной модели gemini-1.5-flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userText }] }]
      })
    });

    const geminiData = await geminiRes.json();

    // Если Google вернул ошибку, бот пришлет ее текст прямо в чат
    if (geminiData.error) {
      await sendTelegram(chatId, `Ошибка Gemini API: ${geminiData.error.message}`);
      return res.status(200).send('OK');
    }

    const botReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Пустой ответ от модели.';
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
