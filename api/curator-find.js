import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function generateWithFallback(prompt) {
  const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];

  for (const modelName of models) {
    try {
      const response = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout ${modelName}`)), 3500);

        ai.models.generateContent({
          model: modelName,
          contents: prompt
        })
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
      });

      if (response?.text) return response.text.trim();
    } catch (err) {
      console.warn(`Сбой генерации через ${modelName}:`, err.message);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return "Очередной курьёз со съёмок: свет выставили, модель пришла вовремя, а флешку забыли в картридере дома.\n\nКоллеги, у кого случалось подобное?";
}

export default async function handler(req, res) {
  try {
    const feedUrl = req.query.feed || "https://petapixel.com/feed/";

    const feedRes = await fetchWithTimeout(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
      }
    }, 4000);

    if (!feedRes.ok) return res.status(502).json({ error: `Ошибка RSS: статус ${feedRes.status}` });

    const xml = await feedRes.text();
    
    // Собираем до 5 последних новостей
    const items = [];
    let startIndex = 0;
    while (items.length < 5) {
      const start = xml.indexOf("<item>", startIndex);
      if (start === -1) break;
      const end = xml.indexOf("</item>", start);
      if (end === -1) break;
      items.push(xml.slice(start, end));
      startIndex = end + 7;
    }

    if (items.length === 0) return res.status(200).json({ message: "Лента пуста" });

    // Выбираем случайную новость из собранных
    const itemChunk = items[Math.floor(Math.random() * items.length)];
    
    let postTitle = "Инфоповод из мира фотографии";
    const titleMatch = itemChunk.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    if (titleMatch && titleMatch[1]) postTitle = titleMatch[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();

    let postLink = feedUrl;
    const linkMatch = itemChunk.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i);
    if (linkMatch && linkMatch[1]) postLink = linkMatch[1].trim();

    const prompt = `Ты — коммерческий фотограф с саркастичным чувством юмора.
Преврати этот инфоповод в короткий ироничный пост для Telegram-канала: "${postTitle}".

Формат:
1. Хлёсткий заголовок.
2. 2-3 коротких предложения с курьёзом из практики фотографа.
3. Короткий вопрос к коллегам в конце.
Чистый текст без тегов.`;

    const adaptedText = await generateWithFallback(prompt);

    const keyboard = {
      inline_keyboard: [[
        { text: "✅ Опубликовать", callback_data: "publish_current" },
        { text: "❌ Отклонить", callback_data: "dismiss" }
      ]]
    };

    const tgRes = await fetchWithTimeout(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.MY_TELEGRAM_ID,
        text: `${adaptedText}\n\n🔗 ${postLink}`,
        reply_markup: keyboard,
        disable_web_page_preview: false
      })
    }, 3000);

    const tgData = await tgRes.json();
    if (!tgData.ok) return res.status(500).json({ error: "Telegram API Error", details: tgData });

    return res.status(200).json({ success: true, message: "Черновик отправлен" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
