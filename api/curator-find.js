const FEEDS = {
  it: "https://habr.com/ru/rss/hubs/all/",
  gadgets: "https://3dnews.ru/news/rss/",
  science: "https://naked-science.ru/feed",
  verge: "https://www.theverge.com/rss/index.xml",
};

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 }
    })
  }, 8000);

  const data = await res.json();
  if (data.error) throw new Error(`Gemini API: ${data.error.message}`);
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
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
  while (items.length < 8) {
    const start = xml.indexOf(tagOpen, startIndex);
    if (start === -1) break;
    const end = xml.indexOf(tagClose, start);
    if (end === -1) break;
    items.push(xml.slice(start, end));
    startIndex = end + tagClose.length;
  }

  if (items.length === 0) throw new Error(`Лента [${feedUrl}] пуста или имеет неподдерживаемый формат`);

  const itemChunk = items[Math.floor(Math.random() * items.length)];

  let postTitle = "Инфоповод";
  const titleMatch = itemChunk.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    postTitle = titleMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
  }

  let postDescription = "";
  const descMatch = itemChunk.match(/<(?:summary|content|description)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:summary|content|description)>/i);
  if (descMatch && descMatch[1]) {
    postDescription = descMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").substring(0, 1500).trim();
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

  const prompt = `Ты — автор живого личного Telegram-канала. Пиши легко, иронично, без штампов.
Напиши короткий пост для канала на русском языке (до 600 символов).
Заголовок: "${postTitle}"
Суть новости: "${postDescription}"
Чистый текст без Markdown, без ссылок и без шаблонных вводных фраз.`;

  let adaptedText;
  try {
    adaptedText = await callGeminiDirect(prompt);
  } catch (err) {
    console.warn("Сбой генерации Gemini, отправка выжимки:", err.message);
    adaptedText = `${postTitle}\n\n${postDescription.substring(0, 350)}...`;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.MY_TELEGRAM_ID;

  if (!botToken || !adminId) {
    throw new Error("Не заданы TELEGRAM_BOT_TOKEN или MY_TELEGRAM_ID в настройках проекта");
  }

  const keyboard = {
    inline_keyboard: [[
      { text: "✅ Опубликовать", callback_data: "publish_current" },
      { text: "❌ Отклонить", callback_data: "dismiss" }
    ]]
  };

  const endpoint = imageUrl ? "sendPhoto" : "sendMessage";
  const payload = imageUrl
    ? { chat_id: adminId, photo: imageUrl, caption: adaptedText.substring(0, 1024), reply_markup: keyboard }
    : { chat_id: adminId, text: adaptedText, reply_markup: keyboard, disable_web_page_preview: true };

  const tgRes = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }, 5000);

  const tgData = await tgRes.json();
  if (!tgData.ok) throw new Error(`Telegram API Error: ${tgData.description}`);

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
