import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  try {
    // 1. Забираем свежие посты из надежного источника (PetaPixel RSS в JSON через открытый конвертер rss2json)
    const feedUrl = encodeURIComponent("https://petapixel.com/feed/");
    const rssRes = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`);
    
    if (!rssRes.ok) {
      const errText = await rssRes.text();
      return res.status(502).json({ error: "Ошибка загрузки ленты", details: errText.slice(0, 100) });
    }

    const feedData = await rssRes.json();
    const items = feedData?.items || [];

    // Берем первую новость/статью с картинкой
    const targetPost = items.find(item => item.enclosure?.link || item.thumbnail);

    if (!targetPost) {
      return res.status(200).json({ message: "Свежих записей с картинками не найдено" });
    }

    const imageUrl = targetPost.enclosure?.link || targetPost.thumbnail;
    const postTitle = targetPost.title || "Интересный инфоповод из мира фотографии";

    // 2. Адаптация через Gemini
    const prompt = `
Ты — практикующий фотограф с отличным чувством юмора и легким сарказмом. 
Твоя задача — превратить фото-новость или инфоповод в короткий пост для русскоязычного Telegram-канала фотографа.

Инфоповод: "${postTitle}".

Правила:
- Пиши от первого лица, живо, с юмором, используй профессиональный сленг (исходники, пыхи, софты, модель, ракурс).
- Никакой сухой теории или обучающего тона. Только жиза и курьез ситуации.
- Формат:
1. Короткий ироничный заголовок.
2. 2-3 емких предложения с экспозицией и панчлайном.
3. Короткий вопрос к коллегам в конце для обсуждения в комментариях.
- Чистый текст без XML/HTML тегов.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const adaptedText = response.text ? response.text.trim() : "Новый пост из будней фотографа.";
    const tgUrl = `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendPhoto`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Опубликовать в канал", callback_data: "publish_current" },
          { text: "❌ Отклонить", callback_data: "dismiss" }
        ]
      ]
    };

    // 3. Отправка черновика в Telegram
    const tgRes = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.MY_TELEGRAM_ID,
        photo: imageUrl,
        caption: `${adaptedText}\n\n🔗 Источник: ${targetPost.link}`,
        reply_markup: keyboard
      })
    });

    const tgResult = await tgRes.json();

    if (!tgResult.ok) {
      return res.status(500).json({ error: "Telegram API Error", details: tgResult });
    }

    return res.status(200).json({ success: true, message: "Черновик успешно отправлен в Telegram!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
