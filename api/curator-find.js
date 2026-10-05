import { redis } from '../lib/redis.js';

const FEEDS = {
  it: "https://habr.com/ru/rss/hubs/all/",
  gadgets: "https://3dnews.ru/news/rss/",
  science: "https://naked-science.ru/feed",
  verge: "https://www.theverge.com/rss/index.xml",
  popculture: "https://dtf.ru/rss/all",
  life: "https://lifehacker.ru/feed/"
};

const TG_CHANNELS = {
  bred: "bred_cobachiy",
  cats: "weird_cats_ru",
  kolbasa: "kolbasa_cheese_shitpost"
};

function cleanHtml(str) {
  if (!str) return "";
  return str
    .replace(/<br\s*[\/]?>/gi, "\n")
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

async function parseTelegramChannel(channelUser) {
  const url = `https://t.me/s/${channelUser}`;
  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
    }
  }, 7000);

  if (!res.ok) throw new Error(`Ошибка загрузки t.me/s/${channelUser}: HTTP ${res.status}`);
  const html = await res.text();

  const rawPosts = html.split(/data-post=["'][^"']+["']/i);
  if (rawPosts.length < 2) {
    if (html.includes("tgme_page_icon") && html.includes("View in Telegram")) {
      throw new Error(`Канал @${channelUser} ограничил веб-предпросмотр для серверов`);
    }
    throw new Error(`Посты в канале @${channelUser} не найдены`);
  }

  const candidates = [];
  for (let i = 1; i < rawPosts.length; i++) {
    const block = rawPosts[i];

    let imgUrl = null;
    const bgMatch = block.match(/background-image:\s*url\(\s*['"]?(https:\/\/[^'"\)]+)['"]?\s*\)/i);
    if (bgMatch && bgMatch[1]) {
      imgUrl = bgMatch[1];
    }

    let text = "";
    const textMatch = block.match(/class=["'][^"']*tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (textMatch && textMatch[1]) {
      text = cleanHtml(textMatch[1]);
    }

    if (imgUrl || text) {
      candidates.push({ imgUrl, text });
    }
  }

  if (candidates.length === 0) {
    throw new Error(`В канале @${channelUser} нет подходящих постов с медиа или текстом`);
  }

  const recentSlice = candidates.slice(-6);
  return recentSlice[Math.floor(Math.random() * recentSlice.length)];
}

async function fetchGeminiModel(modelName, prompt, timeoutMs, base64Image = null, mimeType = "image/jpeg") {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const parts = [{ text: prompt }];
  
  if (base64Image) {
    parts.push({
      inline_data: { mime_type: mimeType, data: base64Image }
    });
  }

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: parts }],
      generationConfig: { temperature: 0.7 }
    })
  }, timeoutMs);

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Пустой ответ от API");
  
  return text.trim();
}

async function callGeminiDirect(prompt, base64Image = null, mimeType = "image/jpeg") {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY не задан в переменных окружения Vercel");
  }

  let lastError = "";
  const delays = [2000, 4000];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetchGeminiModel("gemini-3.8-flash", prompt, 13000, base64Image, mimeType);
    } catch (err) {
      lastError = err.message;
      console.warn(`Попытка ${attempt + 1} отклонена: ${lastError}`);
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
  }
  throw new Error(`Модель перегружена (3 попытки). Последний сбой: ${lastError}`);
}

export async function findAndSendNews(topic = "it", retryData = null) {
  let postTitle = "Инфоповод";
  let postDescription = "";
  let imageUrl = null;
  let base64ForGemini = null;
  let imageMimeType = "image/jpeg";
  let finalPrompt = "";

  if (retryData) {
    postTitle = retryData.title;
    postDescription = retryData.desc;
    imageUrl = retryData.img;
    topic = retryData.topic;

    if (imageUrl) {
      try {
        const imgRes = await fetchWithTimeout(imageUrl, {}, 5000);
        const arrayBuffer = await imgRes.arrayBuffer();
        base64ForGemini = Buffer.from(arrayBuffer).toString('base64');
        if (imageUrl.toLowerCase().endsWith("png")) imageMimeType = "image/png";
        if (imageUrl.toLowerCase().endsWith("webp")) imageMimeType = "image/webp";
      } catch (e) {
        console.warn("Сбой загрузки картинки при повторе:", e.message);
      }
    }
  } 
  else if (TG_CHANNELS[topic]) {
    const channelName = TG_CHANNELS[topic];
    const tgPost = await parseTelegramChannel(channelName);
    
    postTitle = `Пост из канала @${channelName}`;
    postDescription = tgPost.text;
    imageUrl = tgPost.imgUrl;

    if (imageUrl) {
      try {
        const imgRes = await fetchWithTimeout(imageUrl, {}, 5000);
        const arrayBuffer = await imgRes.arrayBuffer();
        base64ForGemini = Buffer.from(arrayBuffer).toString('base64');
        if (imageUrl.toLowerCase().endsWith("png")) imageMimeType = "image/png";
        if (imageUrl.toLowerCase().endsWith("webp")) imageMimeType = "image/webp";
      } catch (e) {
        console.warn("Сбой скачивания картинки TG для нейросети:", e.message);
      }
    }
  }
  else if (topic === "memes") {
    const memeRes = await fetchWithTimeout("https://meme-api.com/gimme/memes", {}, 7000);
    if (!memeRes.ok) throw new Error(`Ошибка Meme API: HTTP ${memeRes.status}`);
    
    const post = await memeRes.json();
    postTitle = post.title;
    imageUrl = post.url;

    const imgRes = await fetchWithTimeout(imageUrl, {}, 5000);
    const arrayBuffer = await imgRes.arrayBuffer();
    base64ForGemini = Buffer.from(arrayBuffer).toString('base64');
    
    if (imageUrl.toLowerCase().endsWith("png")) imageMimeType = "image/png";
    if (imageUrl.toLowerCase().endsWith("webp")) imageMimeType = "image/webp";
  } 
  else {
    const feedUrl = FEEDS[topic] || FEEDS.it;
    const feedRes = await fetchWithTimeout(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/rss+xml, text/xml"
      }
    }, 7000);

    if (!feedRes.ok) throw new Error(`Ошибка RSS [${feedUrl}]: HTTP ${feedRes.status}`);
    const xml = await feedRes.text();

    const items = [];
    const regex = /<(item|entry)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = regex.exec(xml)) !== null && items.length < 15) {
      items.push(match[0]);
    }

    if (items.length === 0) throw new Error(`Лента [${feedUrl}] пуста.`);
    const itemChunk = items[Math.floor(Math.random() * items.length)];

    const titleMatch = itemChunk.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    if (titleMatch && titleMatch[1]) postTitle = cleanHtml(titleMatch[1]);

    const descMatch = itemChunk.match(/<(?:summary|content|description)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:summary|content|description)>/i);
    if (descMatch && descMatch[1]) postDescription = cleanHtml(descMatch[1]).substring(0, 1500);

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
  }

  const secretPrompt = process.env.PROMPT_STYLE || "Переведи и перескажи на русском языке. Без Markdown.";
  
  if (topic === "memes") {
    finalPrompt = `${secretPrompt}\n\nЗаголовок автора: "${postTitle}"`;
  } else {
    finalPrompt = `${secretPrompt}\n\nЗаголовок: "${postTitle}"\nСуть: "${postDescription}"`;
  }

  let adaptedText;
  let isError = false;
  try {
    adaptedText = await callGeminiDirect(finalPrompt, base64ForGemini, imageMimeType);
  } catch (err) {
    console.warn("Сбой Gemini:", err.message);
    adaptedText = `🤖 Ошибка API: ${err.message}\n\nОригинал: ${postTitle}\n\n${postDescription.substring(0, 200)}...`;
    isError = true;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.MY_TELEGRAM_ID;
  if (!botToken || !adminId) throw new Error("Не указаны токены Telegram");

  const keyboard = { inline_keyboard: [] };

  if (isError) {
    const retryKey = Math.random().toString(36).substring(2, 10);
    await redis.set(`retry_news:${retryKey}`, JSON.stringify({
      topic, title: postTitle, desc: postDescription, img: imageUrl
    }), { ex: 3600 * 24 });

    keyboard.inline_keyboard.push([
      { text: "🔄 Повторить генерацию", callback_data: `retry_news:${retryKey}` }
    ]);
    keyboard.inline_keyboard.push([
      { text: "❌ Отклонить", callback_data: "dismiss" }
    ]);
  } else {
    keyboard.inline_keyboard.push([
      { text: "✅ Опубликовать", callback_data: "publish_current" },
      { text: "❌ Отклонить", callback_data: "dismiss" }
    ]);
  }

  let tgData = null;

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
      if (resJson.ok) tgData = resJson;
    } catch (e) {
      console.warn("Фолбэк на текст из-за картинки:", e.message);
    }
  }

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
