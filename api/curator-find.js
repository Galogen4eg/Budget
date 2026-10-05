import { redis } from '../lib/redis.js';

/*
 * ============================================================
 * ИСТОЧНИКИ
 * ============================================================
 */

const FEEDS = {
  it: "https://habr.com/ru/rss/hubs/all/",
  gadgets: "https://3dnews.ru/news/rss/",
  science: "https://naked-science.ru/feed",
  verge: "https://www.theverge.com/rss/index.xml",
  popculture: "https://dtf.ru/rss/all",
  life: "https://lifehacker.ru/feed/",

  // Пикабу
  pikabu_home: "https://pikabu.ru/",
  pikabu_best_week: "https://pikabu.ru/best/week",
  pikabu_new: "https://pikabu.ru/new",

  // Старое имя оставляем для совместимости
  pikabu_hot: "https://pikabu.ru/"
};


/*
 * ============================================================
 * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
 * ============================================================
 */

function cleanHtml(str) {
  if (!str) return "";

  let result = String(str);

  // Переводы строк
  result = result.replace(/<br\s*\/?>/gi, "\n");

  // Удаляем HTML
  result = result.replace(/<[^>]+>/g, " ");

  // Частые HTML entities
  const entities = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&#x27;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "...",
    "&#8230;": "...",
    "&laquo;": "«",
    "&raquo;": "»",
    "&ldquo;": "“",
    "&rdquo;": "”",
    "&lsquo;": "‘",
    "&rsquo;": "’"
  };

  for (const [key, value] of Object.entries(entities)) {
    result = result.split(key).join(value);
  }

  // Десятичные Unicode entities:
  // &#1044; -> Д
  result = result.replace(/&#(\d+);/g, (_, code) => {
    try {
      return String.fromCodePoint(Number(code));
    } catch {
      return _;
    }
  });

  // HEX Unicode entities:
  // &#x414; -> Д
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => {
    try {
      return String.fromCodePoint(parseInt(code, 16));
    } catch {
      return _;
    }
  });

  // Нормализация пробелов
  result = result
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return result;
}


function decodeHtmlEntities(str) {
  if (!str) return "";

  let result = String(str);

  const entities = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&#x27;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "…",
    "&#8230;": "…",
    "&laquo;": "«",
    "&raquo;": "»"
  };

  for (const [key, value] of Object.entries(entities)) {
    result = result.split(key).join(value);
  }

  result = result.replace(/&#(\d+);/g, (_, code) => {
    try {
      return String.fromCodePoint(Number(code));
    } catch {
      return _;
    }
  });

  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => {
    try {
      return String.fromCodePoint(parseInt(code, 16));
    } catch {
      return _;
    }
  });

  return result;
}


function normalizeUrl(url, baseUrl = "https://pikabu.ru/") {
  if (!url) return null;

  let value = decodeHtmlEntities(url).trim();

  value = value.replace(/&amp;/g, "&");

  if (value.startsWith("//")) {
    value = "https:" + value;
  }

  if (value.startsWith("/")) {
    value = new URL(value, baseUrl).href;
  }

  return value;
}


function isImageUrl(url) {
  if (!url) return false;

  const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();

  return (
    cleanUrl.endsWith(".jpg") ||
    cleanUrl.endsWith(".jpeg") ||
    cleanUrl.endsWith(".png") ||
    cleanUrl.endsWith(".webp") ||
    cleanUrl.endsWith(".gif")
  );
}


function detectMimeType(url) {
  if (!url) return "image/jpeg";

  const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();

  if (cleanUrl.endsWith(".png")) return "image/png";
  if (cleanUrl.endsWith(".webp")) return "image/webp";
  if (cleanUrl.endsWith(".gif")) return "image/gif";
  if (cleanUrl.endsWith(".jpg")) return "image/jpeg";
  if (cleanUrl.endsWith(".jpeg")) return "image/jpeg";

  return "image/jpeg";
}


function extractAttribute(tag, attribute) {
  if (!tag) return null;

  const regex = new RegExp(
    `${attribute}\\s*=\\s*["']([^"']+)["']`,
    "i"
  );

  const match = tag.match(regex);

  return match ? decodeHtmlEntities(match[1]) : null;
}


function extractFirstImage(block) {
  if (!block) return null;

  /*
   * 1. og:image / data-original / data-src / src
   */

  const patterns = [
    /data-original\s*=\s*["']([^"']+)["']/i,
    /data-src\s*=\s*["']([^"']+)["']/i,
    /data-lazy-src\s*=\s*["']([^"']+)["']/i,
    /src\s*=\s*["']([^"']+)["']/i
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);

    if (match && match[1]) {
      const url = normalizeUrl(match[1]);

      if (url && /^https?:\/\//i.test(url)) {
        return url;
      }
    }
  }

  /*
   * 2. srcset
   */

  const srcsetMatch = block.match(
    /(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/i
  );

  if (srcsetMatch && srcsetMatch[1]) {
    const entries = srcsetMatch[1]
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);

    // Берём последнее/самое большое изображение
    for (let i = entries.length - 1; i >= 0; i--) {
      const parts = entries[i].split(/\s+/);
      const url = normalizeUrl(parts[0]);

      if (url && /^https?:\/\//i.test(url)) {
        return url;
      }
    }
  }

  return null;
}


function extractTitle(block) {
  if (!block) return "";

  const patterns = [
    /class=["'][^"']*story__title-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
    /<h2[^>]*>([\s\S]*?)<\/h2>/i,
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    /<a[^>]+href=["'][^"']*\/story\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);

    if (match && match[1]) {
      const title = cleanHtml(match[1]);

      if (title.length > 0) {
        return title;
      }
    }
  }

  return "";
}


function extractDescription(block) {
  if (!block) return "";

  const patterns = [
    /class=["'][^"']*story__text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*story__content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);

    if (match && match[1]) {
      const text = cleanHtml(match[1]);

      if (text.length > 0) {
        return text.substring(0, 3000);
      }
    }
  }

  return "";
}


function extractPostUrl(block) {
  if (!block) return null;

  /*
   * Ищем ссылку на /story/...
   */

  const match = block.match(
    /href\s*=\s*["']([^"']*\/story\/[^"']+)["']/i
  );

  if (!match || !match[1]) return null;

  return normalizeUrl(match[1]);
}


function extractPostId(url) {
  if (!url) return null;

  const match = url.match(/\/story\/(\d+)/i);

  if (match && match[1]) {
    return match[1];
  }

  /*
   * Если структура URL изменится,
   * используем hash-подобный ключ из URL.
   */

  return Buffer.from(url)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 80);
}


/*
 * ============================================================
 * FETCH
 * ============================================================
 */

async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timer);

    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}


/*
 * ============================================================
 * ЗАГРУЗКА КАРТИНКИ
 * ============================================================
 */

async function downloadImageAsBase64(imageUrl) {
  if (!imageUrl) {
    return {
      base64: null,
      mimeType: "image/jpeg"
    };
  }

  try {
    const imgRes = await fetchWithTimeout(
      imageUrl,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          "Accept":
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Referer": "https://pikabu.ru/"
        }
      },
      8000
    );

    if (!imgRes.ok) {
      throw new Error(`HTTP ${imgRes.status}`);
    }

    const contentType =
      imgRes.headers.get("content-type") || "";

    if (!contentType.startsWith("image/")) {
      throw new Error(
        `URL вернул не изображение: ${contentType}`
      );
    }

    const arrayBuffer = await imgRes.arrayBuffer();

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error("Пустой файл изображения");
    }

    const mimeType =
      contentType.split(";")[0].trim() ||
      detectMimeType(imageUrl);

    return {
      base64: Buffer.from(arrayBuffer).toString("base64"),
      mimeType
    };

  } catch (err) {
    console.warn(
      "Сбой загрузки изображения:",
      imageUrl,
      err.message
    );

    return {
      base64: null,
      mimeType: detectMimeType(imageUrl)
    };
  }
}


/*
 * ============================================================
 * ПАРСЕР ПИКАБУ
 * ============================================================
 */

async function parsePikabuWeb(sectionUrl) {
  const res = await fetchWithTimeout(
    sectionUrl,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",

        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

        "Accept-Language":
          "ru-RU,ru;q=0.9,en;q=0.8",

        "Cache-Control": "no-cache"
      }
    },
    10000
  );

  if (!res.ok) {
    throw new Error(
      `Ошибка загрузки Пикабу [${sectionUrl}]: HTTP ${res.status}`
    );
  }

  /*
   * Response.text() в Node.js декодирует UTF-8.
   * Пикабу работает с UTF-8, поэтому здесь специально
   * не используем iconv/Windows-1251.
   */

  const html = await res.text();

  if (!html || html.length < 1000) {
    throw new Error(
      "Пикабу вернул слишком короткую страницу"
    );
  }

  /*
   * Находим article.
   */

  const articleRegex =
    /<article\b[^>]*>[\s\S]*?<\/article>/gi;

  const rawPosts = html.match(articleRegex) || [];

  if (rawPosts.length === 0) {
    throw new Error(
      "Посты на странице Пикабу не найдены. Возможно, изменилась HTML-структура сайта."
    );
  }

  const candidates = [];

  for (const block of rawPosts) {
    const postUrl = extractPostUrl(block);

    /*
     * Нас интересуют именно реальные посты.
     * Если article не содержит /story/, пропускаем.
     */

    if (!postUrl) continue;

    const postId = extractPostId(postUrl);

    if (!postId) continue;

    const title = extractTitle(block);
    const desc = extractDescription(block);
    const imgUrl = extractFirstImage(block);

    /*
     * Считаем пост интересным, если есть:
     * - заголовок/текст
     * - или картинка
     */

    if (!title && !desc && !imgUrl) {
      continue;
    }

    candidates.push({
      id: postId,
      url: postUrl,
      title: title || "Пост с Пикабу",
      desc,
      imgUrl
    });
  }

  if (candidates.length === 0) {
    throw new Error(
      "Пикабу загрузился, но реальные посты извлечь не удалось."
    );
  }

  /*
   * Убираем дубли внутри самой страницы.
   */

  const unique = [];
  const localIds = new Set();

  for (const post of candidates) {
    if (localIds.has(post.id)) continue;

    localIds.add(post.id);
    unique.push(post);
  }

  /*
   * Теперь ищем первый пост, которого ещё не было.
   */

  for (const post of unique) {
    const redisKey = `pikabu:processed:${post.id}`;

    try {
      const alreadyProcessed = await redis.get(redisKey);

      if (!alreadyProcessed) {
        return post;
      }
    } catch (err) {
      console.warn(
        "Ошибка проверки Redis:",
        err.message
      );

      /*
       * Если Redis временно недоступен,
       * всё равно можем продолжить работу.
       */
      return post;
    }
  }

  /*
   * Все посты уже обработаны.
   */

  throw new Error(
    `Новых постов Пикабу не найдено (${unique.length} проверено)`
  );
}


/*
 * ============================================================
 * GEMINI
 * ============================================================
 */

async function fetchGeminiModel(
  modelName,
  prompt,
  timeoutMs,
  base64Image = null,
  mimeType = "image/jpeg"
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY не задан в переменных окружения Vercel"
    );
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const parts = [
    {
      text: prompt
    }
  ];

  if (base64Image) {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64Image
      }
    });
  }

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts
          }
        ],

        generationConfig: {
          temperature: 0.7
        }
      })
    },
    timeoutMs
  );

  const data = await res.json();

  if (!res.ok) {
    const message =
      data?.error?.message ||
      `Gemini HTTP ${res.status}`;

    const error = new Error(message);

    error.status = res.status;

    throw error;
  }

  if (data?.error) {
    const error = new Error(data.error.message);

    error.status =
      data.error.code ||
      data.error.status;

    throw error;
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error(
      "Пустой ответ от Gemini API"
    );
  }

  return text.trim();
}


async function callGeminiDirect(
  prompt,
  base64Image = null,
  mimeType = "image/jpeg"
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY не задан в переменных окружения Vercel"
    );
  }

  let lastError = "";

  const delays = [
    2000,
    4000
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetchGeminiModel(
        "gemini-3.8-flash",
        prompt,
        13000,
        base64Image,
        mimeType
      );

    } catch (err) {
      lastError = err.message;

      console.warn(
        `Попытка Gemini ${attempt + 1}/3 отклонена: ${lastError}`
      );

      if (attempt < 2) {
        await new Promise(resolve =>
          setTimeout(resolve, delays[attempt])
        );
      }
    }
  }

  throw new Error(
    `Gemini не ответил после 3 попыток: ${lastError}`
  );
}


/*
 * ============================================================
 * GROQ FALLBACK
 * ============================================================
 */

async function callGroqBackup(prompt) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY не задан"
    );
  }

  const res = await fetchWithTimeout(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },

      body: JSON.stringify({
        model: "openai/gpt-oss-20b",

        messages: [
          {
            role: "user",
            content: prompt
          }
        ],

        temperature: 0.7
      })
    },
    10000
  );

  const data = await res.json();

  if (!res.ok) {
    const message =
      data?.error?.message ||
      `Groq HTTP ${res.status}`;

    const error = new Error(message);

    error.status = res.status;

    throw error;
  }

  if (data?.error) {
    throw new Error(
      data.error.message
    );
  }

  const text =
    data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error(
      "Пустой ответ от Groq API"
    );
  }

  return text.trim();
}


/*
 * ============================================================
 * GEMINI -> GROQ
 * ============================================================
 */

async function callAIWithFallback(
  prompt,
  base64Image = null,
  mimeType = "image/jpeg"
) {
  try {
    /*
     * Gemini получает и текст, и изображение.
     */
    return await callGeminiDirect(
      prompt,
      base64Image,
      mimeType
    );

  } catch (err) {
    const status = Number(err.status);

    const errorText =
      String(err.message || "").toLowerCase();

    const shouldFallback =
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      errorText.includes("429") ||
      errorText.includes("quota") ||
      errorText.includes("exhausted") ||
      errorText.includes("resource_exhausted") ||
      errorText.includes("overloaded") ||
      errorText.includes("overload") ||
      errorText.includes("decommissioned") ||
      errorText.includes("no endpoints found");

    if (
      shouldFallback &&
      process.env.GROQ_API_KEY
    ) {
      console.warn(
        "Gemini недоступен. Переключаюсь на Groq GPT-OSS-20B..."
      );

      /*
       * ВАЖНО:
       * GPT-OSS-20B в этой конфигурации получает только текст.
       * Поэтому prompt должен содержать максимум информации
       * из поста.
       */

      return await callGroqBackup(prompt);
    }

    throw err;
  }
}


/*
 * ============================================================
 * RSS
 * ============================================================
 */

async function parseRSS(feedUrl) {
  const feedRes = await fetchWithTimeout(
    feedUrl,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept":
          "application/rss+xml, application/xml, text/xml"
      }
    },
    8000
  );

  if (!feedRes.ok) {
    throw new Error(
      `Ошибка RSS [${feedUrl}]: HTTP ${feedRes.status}`
    );
  }

  const xml = await feedRes.text();

  const items = [];

  const regex =
    /<(item|entry)\b[^>]*>[\s\S]*?<\/\1>/gi;

  let match;

  while (
    (match = regex.exec(xml)) !== null &&
    items.length < 30
  ) {
    items.push(match[0]);
  }

  if (items.length === 0) {
    throw new Error(
      `Лента [${feedUrl}] пуста.`
    );
  }

  /*
   * Ищем первый необработанный item.
   */

  for (const itemChunk of items) {
    let postTitle = "";
    let postDescription = "";
    let imageUrl = null;

    const titleMatch = itemChunk.match(
      /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i
    );

    if (titleMatch?.[1]) {
      postTitle = cleanHtml(titleMatch[1]);
    }

    const descMatch = itemChunk.match(
      /<(?:summary|content|description)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:summary|content|description)>/i
    );

    if (descMatch?.[1]) {
      postDescription =
        cleanHtml(descMatch[1]).substring(0, 2000);
    }

    const mediaMatch = itemChunk.match(
      /<media:content[^>]+url=(["'])(.*?)\1/i
    );

    if (mediaMatch?.[2]) {
      imageUrl = normalizeUrl(mediaMatch[2]);
    }

    if (!imageUrl) {
      const enclosureMatch = itemChunk.match(
        /<enclosure[^>]+url=(["'])(.*?)\1[^>]*>/i
      );

      if (enclosureMatch?.[2]) {
        imageUrl = normalizeUrl(
          enclosureMatch[2]
        );
      }
    }

    if (!imageUrl) {
      const imgMatch = itemChunk.match(
        /<img[^>]+src=(["'])(https?:\/\/[^"'\s]+)\1/i
      );

      if (imgMatch?.[2]) {
        imageUrl = normalizeUrl(
          imgMatch[2]
        );
      }
    }

    if (!postTitle && !postDescription) {
      continue;
    }

    /*
     * Дедупликация RSS по комбинации title + image.
     */

    const uniqueId = Buffer
      .from(
        `${postTitle}|${imageUrl || ""}`
      )
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 100);

    const redisKey =
      `rss:processed:${uniqueId}`;

    const alreadyProcessed =
      await redis.get(redisKey);

    if (alreadyProcessed) {
      continue;
    }

    return {
      id: uniqueId,
      url: null,
      title: postTitle || "Инфоповод",
      desc: postDescription,
      imgUrl: imageUrl
    };
  }

  throw new Error(
    "Все последние записи RSS уже были обработаны."
  );
}


/*
 * ============================================================
 * ОСНОВНАЯ ФУНКЦИЯ
 * ============================================================
 */

export async function findAndSendNews(
  topic = "it",
  retryData = null
) {
  let postTitle = "Инфоповод";
  let postDescription = "";
  let imageUrl = null;
  let base64ForGemini = null;
  let imageMimeType = "image/jpeg";

  let postId = null;
  let postUrl = null;

  /*
   * ==========================================================
   * RETRY
   * ==========================================================
   */

  if (retryData) {
    const parsedRetry =
      typeof retryData === "string"
        ? JSON.parse(retryData)
        : retryData;

    postTitle =
      parsedRetry.title || "Инфоповод";

    postDescription =
      parsedRetry.desc || "";

    imageUrl =
      parsedRetry.img || null;

    topic =
      parsedRetry.topic || topic;

    postId =
      parsedRetry.postId || null;

    postUrl =
      parsedRetry.url || null;

    if (imageUrl) {
      const imageData =
        await downloadImageAsBase64(
          imageUrl
        );

      base64ForGemini =
        imageData.base64;

      imageMimeType =
        imageData.mimeType;
    }
  }

  /*
   * ==========================================================
   * ПИКАБУ
   * ==========================================================
   */

  else if (
    topic.startsWith("pikabu_") ||
    topic === "memes"
  ) {
    let pikabuTopic = topic;

    /*
     * "memes" теперь тоже русскоязычный Пикабу,
     * а не meme-api.com / Reddit.
     */

    if (pikabuTopic === "memes") {
      pikabuTopic = "pikabu_best_week";
    }

    const pikabuUrl =
      FEEDS[pikabuTopic];

    if (!pikabuUrl) {
      throw new Error(
        `Неизвестный источник Пикабу: ${pikabuTopic}`
      );
    }

    const pikabuData =
      await parsePikabuWeb(
        pikabuUrl
      );

    postId =
      pikabuData.id;

    postUrl =
      pikabuData.url;

    postTitle =
      pikabuData.title;

    postDescription =
      pikabuData.desc;

    imageUrl =
      pikabuData.imgUrl;

    /*
     * Скачиваем картинку для Gemini.
     */

    if (imageUrl) {
      const imageData =
        await downloadImageAsBase64(
          imageUrl
        );

      base64ForGemini =
        imageData.base64;

      imageMimeType =
        imageData.mimeType;
    }
  }

  /*
   * ==========================================================
   * ОБЫЧНЫЙ RSS
   * ==========================================================
   */

  else {
    const feedUrl =
      FEEDS[topic] ||
      FEEDS.it;

    const rssData =
      await parseRSS(feedUrl);

    postId =
      rssData.id;

    postTitle =
      rssData.title;

    postDescription =
      rssData.desc;

    imageUrl =
      rssData.imgUrl;

    if (imageUrl) {
      const imageData =
        await downloadImageAsBase64(
          imageUrl
        );

      base64ForGemini =
        imageData.base64;

      imageMimeType =
        imageData.mimeType;
    }
  }


  /*
   * ==========================================================
   * PROMPT
   * ==========================================================
   */

  const secretPrompt =
    process.env.PROMPT_STYLE ||
    `
Ты редактор русскоязычного Telegram-канала.

Проанализируй предоставленный пост.

Если это мем или юмористический контент:
- сохрани смысл;
- напиши естественный русский текст;
- не добавляй выдуманных фактов;
- не используй Markdown;
- не пиши служебных комментариев;
- не объясняй, что ты сделал.

Если текст уже на русском, не переводи его буквально.
Сделай короткую, живую редакторскую версию для Telegram.

Ответ должен содержать только готовый текст публикации.
`.trim();


  let finalPrompt = "";

  if (
    topic.startsWith("pikabu_") ||
    topic === "memes"
  ) {
    finalPrompt = `
${secretPrompt}

Источник: Пикабу.

Заголовок поста:
"${postTitle}"

Текст поста:
"${postDescription}"

Ссылка на оригинал:
${postUrl || "нет"}

Если к сообщению прикреплена картинка, обязательно учитывай её содержание при анализе.
`.trim();
  }

  else {
    finalPrompt = `
${secretPrompt}

Заголовок:
"${postTitle}"

Суть:
"${postDescription}"
`.trim();
  }


  /*
   * ==========================================================
   * AI
   * ==========================================================
   */

  let adaptedText;
  let isError = false;

  try {
    adaptedText =
      await callAIWithFallback(
        finalPrompt,
        base64ForGemini,
        imageMimeType
      );

  } catch (err) {
    console.warn(
      "Сбой AI:",
      err.message
    );

    adaptedText =
      `🤖 Ошибка API: ${err.message}\n\n` +
      `Оригинал: ${postTitle}\n\n` +
      `${postDescription.substring(0, 500)}`;

    isError = true;
  }


  /*
   * ==========================================================
   * TELEGRAM
   * ==========================================================
   */

  const botToken =
    process.env.TELEGRAM_BOT_TOKEN;

  const adminId =
    process.env.MY_TELEGRAM_ID;

  if (!botToken || !adminId) {
    throw new Error(
      "Не указаны TELEGRAM_BOT_TOKEN или MY_TELEGRAM_ID"
    );
  }


  /*
   * ==========================================================
   * KEYBOARD
   * ==========================================================
   */

  const keyboard = {
    inline_keyboard: []
  };


  if (isError) {
    const retryKey =
      Math.random()
        .toString(36)
        .substring(2, 10);

    await redis.set(
      `retry_news:${retryKey}`,
      JSON.stringify({
        topic,
        title: postTitle,
        desc: postDescription,
        img: imageUrl,
        postId,
        url: postUrl
      }),
      {
        ex: 3600 * 24
      }
    );

    keyboard.inline_keyboard.push([
      {
        text: "🔄 Повторить генерацию",
        callback_data:
          `retry_news:${retryKey}`
      }
    ]);

    keyboard.inline_keyboard.push([
      {
        text: "❌ Отклонить",
        callback_data: "dismiss"
      }
    ]);

  } else {
    keyboard.inline_keyboard.push([
      {
        text: "✅ Опубликовать",
        callback_data: "publish_current"
      },
      {
        text: "❌ Отклонить",
        callback_data: "dismiss"
      }
    ]);
  }


  /*
   * ==========================================================
   * ОТПРАВКА В TELEGRAM
   * ==========================================================
   */

  let tgData = null;


  if (imageUrl) {
    try {
      const tgRes =
        await fetchWithTimeout(
          `https://api.telegram.org/bot${botToken}/sendPhoto`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              chat_id: adminId,

              photo: imageUrl,

              caption:
                adaptedText.substring(0, 1024),

              reply_markup:
                keyboard
            })
          },
          8000
        );

      const resJson =
        await tgRes.json();

      if (resJson.ok) {
        tgData = resJson;
      } else {
        console.warn(
          "Telegram sendPhoto:",
          resJson.description
        );
      }

    } catch (e) {
      console.warn(
        "Сбой отправки картинки в Telegram:",
        e.message
      );
    }
  }


  /*
   * Если картинку Telegram принять не смог,
   * отправляем обычный текст.
   */

  if (!tgData) {
    const tgRes =
      await fetchWithTimeout(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            chat_id: adminId,

            text:
              adaptedText.substring(0, 4096),

            reply_markup:
              keyboard,

            disable_web_page_preview:
              false
          })
        },
        8000
      );

    tgData =
      await tgRes.json();
  }


  if (!tgData.ok) {
    throw new Error(
      `Telegram API Error: ${tgData.description}`
    );
  }


  /*
   * ==========================================================
   * ПОМЕЧАЕМ ПОСТ ОБРАБОТАННЫМ
   * ==========================================================
   *
   * ВАЖНО:
   * Только после успешной отправки в Telegram.
   *
   * Если Gemini упал или Telegram не принял сообщение,
   * пост останется доступным для повторной обработки.
   */

  if (
    postId &&
    !isError
  ) {
    try {
      const redisKey =
        topic.startsWith("pikabu_") ||
        topic === "memes"
          ? `pikabu:processed:${postId}`
          : `rss:processed:${postId}`;

      await redis.set(
        redisKey,
        JSON.stringify({
          title: postTitle,
          url: postUrl,
          processedAt:
            new Date().toISOString()
        }),
        {
          ex: 60 * 60 * 24 * 30
        }
      );

    } catch (err) {
      console.warn(
        "Не удалось сохранить пост в Redis:",
        err.message
      );
    }
  }


  return tgData;
}


/*
 * ============================================================
 * VERCEL HANDLER
 * ============================================================
 */

export default async function handler(
  req,
  res
) {
  try {
    const host =
      req.headers.host ||
      "localhost";

    const parsedUrl =
      new URL(
        req.url,
        `https://${host}`
      );

    const topic =
      parsedUrl.searchParams.get("source") ||
      req.query?.source ||
      "it";

    const data =
      await findAndSendNews(
        topic
      );

    return res
      .status(200)
      .json({
        ok: true,
        data
      });

  } catch (err) {
    console.error(
      "Ошибка curator-find:",
      err.message
    );

    return res
      .status(500)
      .json({
        error: err.message
      });
  }
}
