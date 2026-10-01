import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
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
        const timer = setTimeout(() => reject(new Error(`Timeout ${modelName}`)), 2500);

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
      console.warn(`Сбой генерации ${modelName}:`, err.message);
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
    }, 2500);

    if (!feedRes.ok) return res.status(502).json({ error: `Ошибка RSS: статус ${feedRes.status}` });

    const xml = await feedRes.text();
    
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

    const itemChunk = items[Math.floor(Math.random() * items.length)];
    
    let postTitle = "Инфоповод";
    const titleMatch = itemChunk.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    if (titleMatch && titleMatch[1]) postTitle = titleMatch[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();

    let postDescription = "";
    const descMatch = itemChunk.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    if (descMatch && descMatch[1]) {
      postDescription = descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 1500).trim();
    }

    let imageUrl = null;
    const mediaMatch = itemChunk.match(/<media:content[^>]+url=(["'])(.*?)\1/i);
    if (mediaMatch && mediaMatch[2]) imageUrl = mediaMatch[2];
    
    if (!imageUrl) {
      const encMatch = itemChunk.match(/<enclosure[^>]+url=(["'])(.*?)\1[^>]*type=["']image\//i);
      if (encMatch && encMatch[2]) imageUrl = encMatch[2];
    }
    
    if (!imageUrl) {
      const imgMatch = itemChunk.match(/<img[^>]+src=(["'])(.*?)\1/i);
      if (imgMatch && imgMatch[2]) imageUrl = imgMatch[2];
    }

    const customStyle = process.env.PROMPT_STYLE || "Ты — автор развлекательного Telegram-канала о фотографии. Пиши иронично и легко.";

    const prompt = `## Task Context
${customStyle}

## Task
Прочитай новость и напиши фановый пост СТРОГО на русском языке.
Заголовок: "${postTitle}"
Суть: "${postDescription}"

## Output Format
Чистый текст без тегов, markdown-разметки и ссылок.`;

    const adaptedText = await generateWithFallback(prompt);

    const keyboard = {
      inline_keyboard: [[
        { text: "✅ Опубликовать", callback_data: "publish_current" },
        { text: "❌ Отклонить", callback_data: "dismiss" }
      ]]
    };

    let tgUrl, tgBody;

    if (imageUrl) {
      tgUrl = `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendPhoto`;
      tgBody = {
        chat_id: process.env.MY_TELEGRAM_ID,
        photo: imageUrl,
        caption: adaptedText.substring(0, 1024),
        reply_markup: keyboard
      };
    } else {
      tgUrl = `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`;
      tgBody = {
        chat_id: process.env.MY_TELEGRAM_ID,
        text: adaptedText,
        reply_markup: keyboard,
        disable_web_page_preview: true
      };
    }

    const tgRes = await fetchWithTimeout(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tgBody)
    }, 2000);

    const tgData = await tgRes.json();
    if (!tgData.ok) return res.status(500).json({ error: "Telegram API Error", details: tgData });

    return res.status(200).json({ success: true, message: "Черновик отправлен" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
