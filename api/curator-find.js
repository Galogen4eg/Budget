import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Утилита для запросов с лимитом времени
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export default async function handler(req, res) {
  try {
    // 1. Берем посты напрямую с открытого зеркала Reddit/сообществ без блокировок
    const feedRes = await fetchWithTimeout("https://www.reddit.com/r/photography/hot.json?limit=5", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Bot/1.0)" },
      timeout: 6000
    });

    if (!feedRes.ok) {
      return res.status(502).json({ error: `Ошибка источника: статус ${feedRes.status}` });
    }

    const json = await feedRes.json();
    const posts = json?.data?.children || [];
    
    // Ищем любой содержательный пост с заголовком
    const targetPost = posts.map(p => p.data).find(p => p.title && !p.stickied);

    if (!targetPost) {
      return res.status(200).json({ message: "Свежих постов не найдено" });
    }

    const postTitle = targetPost.title;
    const postUrl = `https://reddit.com${targetPost.permalink}`;

    // 2. Генерация через актуальную Gemini 3.8 Flash
    const prompt = `
Ты — практикующий фотограф с отличным чувством юмора и сарказмом. 
Преврати инфоповод в короткий вирусный пост для Telegram-канала.

Инфоповод: "${postTitle}".

Формат:
1. Ироничный заголовок.
2. 2-3 емких предложения с курьезом или жизой (с упором на практику, съемки, заказчиков или технику).
3. Короткий вопрос аудитории для комментариев.
Без тегов, чистый текст.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });

    const adaptedText = response.text ? response.text.trim() : "Будни фотографа: новый курьез со съемок.";
    const tgUrl = `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Опубликовать в канал", callback_data: "publish_current" },
          { text: "❌ Отклонить", callback_data: "dismiss" }
        ]
      ]
    };

    // 3. Отправка текстового драфта в Telegram
    const tgRes = await fetchWithTimeout(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.MY_TELEGRAM_ID,
        text: `${adaptedText}\n\n🔗 Источник: ${postUrl}`,
        reply_markup: keyboard
      }),
      timeout: 6000
    });

    const tgResult = await tgRes.json();

    if (!tgResult.ok) {
      return res.status(500).json({ error: "Telegram API Error", details: tgResult });
    }

    return res.status(200).json({ success: true, message: "Черновик отправлен!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
