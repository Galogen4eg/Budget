import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  try {
    const redditRes = await fetch("https://www.reddit.com/r/analogmemes/hot.json?limit=5", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const data = await redditRes.json();
    const posts = data?.data?.children || [];

    const targetPost = posts.map(p => p.data).find(p => 
      !p.is_self && 
      (p.url.endsWith(".jpg") || p.url.endsWith(".png") || p.url.endsWith(".jpeg"))
    );

    if (!targetPost) {
      return res.status(200).json({ message: "Свежих постов с картинками не найдено" });
    }

    const prompt = `
Ты — практикующий фотограф с отличным чувством юмора и легким сарказмом. 
Твоя задача — превратить англоязычный инфоповод или фото-мем в короткий вирусный пост для русскоязычного Telegram-канала.

Контекст мема: "${targetPost.title}".

Правила:
- Пиши от первого лица, живо, используй сленг (исходники, пыхи, софты, модель, ракурс).
- Никакой сухой теории или обучающего тона. Только жиза и курьез ситуации.
- Формат:
1. Короткий ироничный заголовок.
2. 2-3 емких предложения с экспозицией и панчлайном.
3. Короткий вопрос к подписчикам в конце для комментариев.
- Чистый текст без тегов.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const adaptedText = response.text.trim();
    const tgUrl = `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendPhoto`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Опубликовать в канал", callback_data: "publish_current" },
          { text: "❌ Отклонить", callback_data: "dismiss" }
        ]
      ]
    };

    const tgRes = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.MY_TELEGRAM_ID,
        photo: targetPost.url,
        caption: `${adaptedText}\n\n🔗 Источник: ${targetPost.permalink ? 'https://reddit.com' + targetPost.permalink : 'Reddit'}`,
        reply_markup: keyboard
      })
    });

    const tgResult = await tgRes.json();
    return res.status(200).json({ success: true, tg: tgResult });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
