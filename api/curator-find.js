const FEEDS = {
  it: "https://habr.com/ru/rss/hubs/all/",
  gadgets: "https://3dnews.ru/news/rss/",
  science: "https://naked-science.ru/feed",
  verge: "https://www.theverge.com/rss/index.xml",
  popculture: "https://dtf.ru/rss/all",
  life: "https://lifehacker.ru/feed/"
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

async function fetchGeminiModel(modelName, prompt, timeoutMs, base64Image = null, mimeType = "image/jpeg") {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const parts = [{ text: prompt }];
  
  if (base64Image) {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64Image
      }
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
        console.warn(`Пауза ${delays[attempt] / 1000} сек...`);
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  throw new Error(`Модель перегружена (сделано 3 попытки). Последний сбой: ${lastError}`);
}

export async function findAndSendNews(topic = "it") {
  let postTitle = "Инфоповод";
  let postDescription = "";
  let imageUrl = null;
  
  let base64ForGemini = null;
  let imageMimeType = "image/jpeg";
  let finalPrompt = "";

  if (topic === "memes") {
    const redditRes = await fetchWithTimeout("https://www.reddit.com/r/memes/hot.json?limit=20", {
      headers: { "User-Agent": "TelegramCuratorBot/1.0" }
    }, 7000);
    
    if (!redditRes.ok) throw new Error(`Ошибка Reddit API: HTTP ${redditRes.status}`);
    
    const redditData = await redditRes.json();
    const posts = redditData.data.children.filter(c => c.data.post_hint === 'image' && !c.data.is_video);
    if (posts.length === 0) throw new Error("Не найдено свежих картинок на Reddit");
    
    const post = posts[Math.floor(Math.random() * posts.length)].data;
    postTitle = post.title;
    imageUrl = post.url;

    const imgRes = await fetchWithTimeout(imageUrl, {}, 5000);
    const arrayBuffer = await imgRes.arrayBuffer();
    base64ForGemini = Buffer.from(arrayBuffer).toString('base64');
    
    if (imageUrl.toLowerCase().endsWith("png")) imageMimeType = "image/png";
    if (imageUrl.toLowerCase().endsWith("webp")) imageMimeType = "image/webp";

    finalPrompt = `Ты — автор развлекательного Telegram-канала. Тебе прислали мем с Reddit (заголовок автора: "${postTitle}").
Твоя задача: прочитай текст прямо на картинке, которую я прикрепил. Переведи этот текст на русский язык.
Напиши короткую смешную подпись для русскоязычной аудитории, которая передает суть мема (до 400 символов).
Не пиши Markdown, не пиши приветствия. Просто выдай итоговый текст, который будет висеть под этой картинкой в канале.`;

  } else {
    const feedUrl = FEEDS[topic] || FEEDS.it;
    const feedRes = await fetchWithTimeout(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/rss+xml, text/xml"
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

    const customStyle = process.env.PROMPT_STYLE || "Ты — автор интересного Telegram-канала про технологии, науку и гаджеты. Перескажи эту новость живо, коротко, без канцелярщины и клише.";
    finalPrompt = `${customStyle}\n\nТехнические требования:\n- Если текст на английском — обязательно переведи.\n- Выведи только готовый текст без Markdown.\n\nЗаголовок: "${postTitle}"\nСуть: "${postDescription}"`;
  }

  let adaptedText;
  try {
    adaptedText = await callGeminiDirect(finalPrompt, base64ForGemini, imageMimeType);
  } catch (err) {
    console.warn("Сбой Gemini:", err.message);
    adaptedText = `🤖 Ошибка API: ${err.message}\n\nОригинал: ${postTitle}\n\n${postDescription.substring(0, 300)}...`;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminId = process.env.MY_TELEGRAM_ID;
  if (!botToken || !adminId) throw new Error("Не указаны TELEGRAM_BOT_TOKEN или MY_TELEGRAM_ID");

  const keyboard = {
    inline_keyboard: [[
      { text: "✅ Опубликовать", callback_data: "publish_current" },
      { text: "❌ Отклонить", callback_data: "dismiss" }
    ]]
  };

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
      console.warn("Не удалось отправить фото, фолбэк на текст:", e.message);
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
