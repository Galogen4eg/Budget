import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  try {
    // 1. Берем открытый RSS-поток PetaPixel (не блокирует хостинги)
    const feedRes = await fetch("https://petapixel.com/feed/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    if (!feedRes.ok) {
      return res.status(502).json({ error: `Ошибка загрузки RSS: ${feedRes.status}` });
    }

    const xmlText = await feedRes.text();

    // Простое извлечение первого поста и картинки без тяжелых библиотек
    const itemMatch = xmlText.match(/<item>([\s\S]*?)<\/item>/);
    if (!itemMatch) {
      return res.status(200).json({ message: "Посты в ленте не найдены" });
    }

    const itemContent = itemMatch[1];
    const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemContent.match(/<title>(.*?)<\/title>/);
    const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
    const imgMatch = itemContent.match(/<media:content[^>]+url="([^">]+)"/) || itemContent.match(/<enclosure[^>]+url="([^">]+)"/);

    const postTitle = titleMatch ? titleMatch[1].trim() : "Курьез из жизни фотографа";
    const postLink = linkMatch ? linkMatch[1].trim() : "https://petapixel.com";
    const imageUrl = imgMatch ? imgMatch[1] : null;

    // 2. Адаптация через актуальную модель Gemini 3.8 Flash
    const prompt = `
Ты — практикующий коммерческий фотограф с отличным саркастичным чувством юмора. 
Преврати инфоповод или новость в короткий ироничный пост для русскоязычного Telegram-канала.

Инфоповод: "${postTitle}".

Формат:
1. Хлёсткий саркастичный заголовок.
2. 2-3 коротких предложения с жизой: про съемки, клиентов, исходники, оптику или свет.
3. Короткий провокационный вопрос к коллегам в конце.
Без лишних тегов, чистый текст.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });

    const adaptedText = response.text ? response.text.trim() : "Будни фотографа: новый курьез со съемок.";

    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Опубликовать в канал", callback_data: "publish_current" },
          { text: "❌ Отклонить", callback_data: "dismiss" }
        ]
      ]
    };

    // 3. Отправка черновика в Telegram
    const tgEndpoint = imageUrl ? "sendPhoto" : "sendMessage";
    const tgUrl = `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/${tgEndpoint}`;

    const tgPayload = {
      chat_id: process.env.MY_TELEGRAM_ID,
      reply_markup: keyboard,
      ...(imageUrl
        ? { photo: imageUrl, caption: `${adaptedText}\n\n🔗 ${postLink}` }
        : { text: `${adaptedText}\n\n🔗 ${postLink}` })
    };

    const tgRes = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tgPayload)
    });

    const tgResult = await tgRes.json();

    if (!tgResult.ok) {
      return res.status(500).json({ error: "Telegram API Error", details: tgResult });
    }

    return res.status(200).json({ success: true, message: "Черновик отправлен в Telegram!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
