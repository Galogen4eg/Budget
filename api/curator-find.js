import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function generateWithFallback(prompt) {
  const models = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite"];
  
  for (const modelName of models) {
    try {
      const modelPromise = ai.models.generateContent({
        model: modelName,
        contents: prompt
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout ${modelName}`)), 3500)
      );

      const response = await Promise.race([modelPromise, timeoutPromise]);
      if (response?.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn(`Сбой вызова модели ${modelName}:`, err.message);
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  }
  return "Будни фотографа: новый курьез со съемок.";
}

export default async function handler(req, res) {
  try {
    // 1. Быстро забираем фид
    const feedUrl = "https://petapixel.com/feed/";
    const feedRes = await fetchWithTimeout(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
      }
    }, 4000);

    if (!feedRes.ok) {
      return res.status(502).json({ error: `Ошибка загрузки RSS: ${feedRes.status}` });
    }

    const xml = await feedRes.text();

    const itemStart = xml.indexOf("<item>");
    const itemEnd = xml.indexOf("</item>", itemStart);
    
    if (itemStart === -1 || itemEnd === -1) {
      return res.status(200).json({ message: "Записи в ленте не найдены" });
    }

    const itemChunk = xml.slice(itemStart, itemEnd);

    let postTitle = "Инфоповод из мира фотографии";
    const titleMatch = itemChunk.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      postTitle = titleMatch[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
    }

    let postLink = "https://petapixel.com";
    const linkMatch = itemChunk.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i);
    if (linkMatch && linkMatch[1]) {
      postLink = linkMatch[1].trim();
    }

    // 2. Адаптация через Gemini с авто-фоллбеком при 503
    const prompt = `Ты — коммерческий фотограф с саркастичным чувством юмора.
Преврати инфоповод в короткий ироничный пост для Telegram-канала: "${postTitle}".

Формат:
1. Хлёсткий заголовок.
2. 2-3 коротких предложения с курьёзом из практики фотографа (про оптику, свет, исходники или заказчиков).
3. Короткий вопрос к коллегам в конце.
Чистый текст без тегов и разметки.`;

    const adaptedText = await generateWithFallback(prompt);

    // 3. Отправка черновика в Telegram
    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Опубликовать в канал", callback_data: "publish_current" },
          { text: "❌ Отклонить", callback_data: "dismiss" }
        ]
      ]
    };

    const tgRes = await fetchWithTimeout(
      `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.MY_TELEGRAM_ID,
          text: `${adaptedText}\n\n🔗 ${postLink}`,
          reply_markup: keyboard,
          disable_web_page_preview: false
        })
      },
      3000
    );

    const tgData = await tgRes.json();
    if (!tgData.ok) {
      return res.status(500).json({ error: "Telegram API Error", details: tgData });
    }

    return res.status(200).json({ success: true, message: "Черновик отправлен в Telegram" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
