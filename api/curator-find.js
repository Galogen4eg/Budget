import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FEEDS = {
  it: "https://habr.com/ru/rss/hubs/all/",
  gadgets: "https://3dnews.ru/news/rss/",
  science: "https://naked-science.ru/feed",
  verge: "https://www.theverge.com/rss/index.xml",
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
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
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

  for (const modelName of models) {
    try {
      const response = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout ${modelName}`)), 4000);

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

  return "Забавный курьёз из мира технологий: очередное обновление исправило пять старых багов и добавило десять новых.\n\nКоллеги, кто уже успел обновиться?";
}

export default async function handler(req, res) {
  try {
    // Выбор источника: передается ?source=it | gadgets | science или кастомный ?feed=...
    const sourceKey = req.query.source || "it";
    const feedUrl = req.query.feed || FEEDS[sourceKey] || FEEDS.it;

    const feedRes = await fetchWithTimeout(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/atom+xml, text/xml, application/xml;q=0.9, */*;q=0.8"
      }
    }, 6000);

    if (!feedRes.ok) {
      return res.status(502).json({ error: `Ошибка RSS [${feedUrl}]: статус ${feedRes.status}` });
    }

    const xml = await feedRes.text();

    // Универсальный поиск блоков: поддерживает и RSS (<item>), и Atom (<entry>)
    const isAtom = xml.includes("<entry") && !xml.includes("<item");
    const tagOpen = isAtom ? "<entry" : "<item";
    const tagClose = isAtom ? "</entry>" : "</item>";

    const items = [];
    let startIndex = 0;
    while (items.length < 8) {
      const start = xml.indexOf(tagOpen, startIndex);
      if (start === -1) break;
      const end = xml.indexOf(tagClose, start);
      if (end === -1) break;
      items.push(xml.slice(start, end));
      startIndex = end + tagClose.length;
    }

    if (items.length === 0) {
      return res.status(200).json({ message: "Лента пуста или имеет неподдерживаемый формат" });
    }

    // Случайный элемент из свежих
    const itemChunk = items[Math.floor(Math.random() * items.length)];

    let postTitle = "Инфоповод";
    const titleMatch = itemChunk.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      postTitle = titleMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    }

    let postDescription = "";
    // Поиск по тегам описания: summary, content или description
    const descMatch = itemChunk.match(/<(?:summary|content|description)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:summary|content|description)>/i);
    if (descMatch && descMatch[1]) {
      postDescription = descMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .substring(0, 1500)
        .trim();
    }

    // Поиск картинки во всех распространенных форматах RSS/Atom
    let imageUrl = null;
    const mediaMatch = itemChunk.match(/<media:content[^>]+url=(["'])(.*?)\1/i);
    if (mediaMatch && mediaMatch[2]) imageUrl = mediaMatch[2];

    if (!imageUrl) {
      const encMatch = itemChunk.match(/<enclosure[^>]+url=(["'])(.*?)\1[^>]*type=["']image\//i);
      if (encMatch && encMatch[2]) imageUrl = encMatch[2];
    }

    if (!imageUrl) {
      const imgMatch = itemChunk.match(/<img[^>]+src=(["'])(https?:\/\/[^"'\s]+)\1/i);
      if (imgMatch && imgMatch[2]) imageUrl = imgMatch[2];
    }

    const customStyle = process.env.PROMPT_STYLE || "Ты — автор живого личного Telegram-канала. Пиши легко, иронично, без штампов и канцелярита.";

    const prompt = `## Task Context
${customStyle}

## Task
Прочитай новость и напиши короткий, увлекательный пост для канала на русском языке.
Сделай акцент на самом интересном факте или курьёзе. 
Заголовок: "${postTitle}"
Суть новости: "${postDescription}"

## Output Format
Чистый текст без Markdown, без ссылок и без шаблонных вводных фраз. Длина до 600 символов.`;

    const adaptedText = await generateWithFallback(prompt);

    const keyboard = {
      inline_keyboard: [[
        { text: "✅ Опубликовать", callback_data: "publish_current" },
        { text: "❌ Отклонить", callback_data: "dismiss" }
      ]]
    };

    let tgUrl, tgBody;

    if (imageUrl) {
      tgUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN}/sendPhoto`;
      tgBody = {
        chat_id: process.env.MY_TELEGRAM_ID,
        photo: imageUrl,
        caption: adaptedText.substring(0, 1024),
        reply_markup: keyboard
      };
    } else {
      tgUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN}/sendMessage`;
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
    }, 4000);

    const tgData = await tgRes.json();
    if (!tgData.ok) return res.status(500).json({ error: "Telegram API Error", details: tgData });

    return res.status(200).json({ success: true, message: "Черновик отправлен", source: feedUrl });
  } catch (error) {
    console.error("Ошибка curator-find:", error);
    return res.status(500).json({ error: error.message });
  }
}
