const FEEDS = {
  it: "https://habr.com/ru/rss/hubs/all/",
  gadgets: "https://3dnews.ru/news/rss/",
  science: "https://naked-science.ru/feed",
  verge: "https://www.theverge.com/rss/index.xml",
};

function cleanHtml(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8230;/g, "...")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function callGeminiDirect(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY не задан в переменных окружения Vercel");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 }
    })
  }, 9000);

  const data = await res.json();
  if (data.error) throw new Error(`Gemini API: ${data.error.message}`);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini вернул пустой текст ответа");
  return text.trim();
}

export async function findAndSendNews(topic = "it") {
  const feedUrl = FEEDS[topic] || FEEDS.it;

  const feedRes = await fetchWithTimeout(feedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/rss+xml, application/atom+xml, text/xml, application/xml;q=0.9, */*;q=0.8"
    }
  }, 7000);

  if (!feedRes.ok) throw new Error(`Ошибка RSS [${feedUrl}]: HTTP ${feedRes.status}`);

  const xml = await feedRes.text();
  const isAtom = xml.includes("<entry") && !xml.includes("<item");
  const tagOpen = isAtom ? "<entry" : "<item";
  const tagClose = isAtom ? "</entry>" : "</item>";

  const items = [];
  let startIndex = 0;
  while (items.length < 10) {
    const start = xml.indexOf(tagOpen, startIndex);
    if (start === -1) break;
    const end = xml.indexOf(tagClose, start);
    if (end === -1) break;
    items.push(xml.slice(start, end));
    startIndex = end + tagClose.length;
  }

  if (items.length === 0) throw new Error(`Лента [${feedUrl}] пуста или имеет нестандартный формат XML`);

  const itemChunk = items[Math.floor(Math.random() * items.length)];

  let postTitle = "Инфоповод";
  const titleMatch = itemChunk.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    postTitle = cleanHtml(titleMatch[1]);
  }

  let postDescription = "";
  const descMatch = itemChunk.match(/<(?:summary|content|description)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:summary|content|description)>/i);
  if (descMatch && descMatch[1]) {
    postDescription = cleanHtml(descMatch[1]).substring(0, 1500);
  }

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

  const prompt = `Ты — автор интересного Telegram-канала про технологии, науку и гаджеты.
Перескажи эту новость живо, коротко, без канцелярщины и клише.
Если исходный текст на английском языке — обязательно переведи и адаптируй на русский язык.
Объем поста: 400-600 символов.
Заголовок новости: "${postTitle}"
Суть: "${postDescription}"
Выведи только готовый текст поста без Markdown-разметки (без звездочек и решеток), без ссылок и без шаблонных приветствий.`;

  let adaptedText;
  try {
    adaptedText = await callGeminiDirect(prompt);
  } catch (err) {
    console.warn("Сбой Gemini, отправляем оригинальный текст:", err.message);
    adaptedText = `${postTitle}\n\n${postDescription.substring(0, 400)}...`;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.MY_TELEGRAM_ID;

  if (!botToken || !adminId) {
    throw new Error("Не указаны TELEGRAM_BOT_TOKEN или MY_TELEGRAM_ID");
  }

  const keyboard = {
    inline_keyboard: [[
      { text: "✅ Опубликовать", callback_data: "publish_current" },
      { text: "❌ Отклонить", callback_data: "dismiss" }
    ]]
  };

  let tgData = null;

  // 1. Попытка отправить с фото
  if (imageUrl) {
    try {
      const tgRes = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: adminId,
          photo: imageUrl,
          caption: adaptedText.substring(0, 1024),
          reply_markup: keyboard
        })
      }, 5000);
      const resJson = await tgRes.json();
      if (resJson.ok) {
        tgData = resJson;
      } else {
        console.warn("Telegram отклонил отправку sendPhoto:", resJson.description);
      }
    } catch (e) {
      console.warn("Не удалось отправить фото, делаем фолбэк на текст:", e.message);
    }
  }

  // 2. Фолбэк на текстовое сообщение (если картинки не было или сайт заблокировал ее скачивание)
  if (!tgData) {
    const tgRes = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminId,
        text: adaptedText,
        reply_markup: keyboard,
        disable_web_page_preview: false
      })
    }, 5000);
    tgData = await tgRes.json();
  }

  if (!tgData.ok) {
    throw new Error(`Telegram API Error: ${tgData.description}`);
  }

  return tgData;
}

export default async function handler(req, res) {
  try {
    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url, `https://${host}`);
    const topic = parsedUrl.searchParams.get('source') || req.query?.source || 'it';

    const data = await findAndSendNews(topic);
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error("Ошибка curator-find:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
