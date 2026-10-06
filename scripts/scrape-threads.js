const { chromium } = require('playwright');
const { Redis } = require('@upstash/redis');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_TOPICS = 8;
const MAX_POSTS_PER_TOPIC = 20;
const MAX_TOTAL_MEMES = 50;
const TTL_14_DAYS = 14 * 24 * 60 * 60; // 1209600 секунд

const FALLBACK_TOPICS = ['мемы', 'юмор', 'мем дня', 'смешные картинки'];

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function saveDebugArtifacts(page, prefix) {
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  const timestamp = Date.now();
  const screenPath = path.join(artifactsDir, `${prefix}-${timestamp}.png`);
  const htmlPath = path.join(artifactsDir, `${prefix}-${timestamp}.html`);

  try {
    await page.screenshot({ path: screenPath, fullPage: true });
    const html = await page.content();
    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log(`[DIAGNOSTIC] Сохранены артефакты: ${screenPath}, ${htmlPath}`);
  } catch (err) {
    console.error(`[DIAGNOSTIC] Ошибка сохранения артефактов: ${err.message}`);
  }
}

async function dismissModals(page) {
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Попытка кликнуть по кнопкам закрытия диалогов или иконкам "Close"
    const closeButtons = page.locator('div[role="dialog"] svg[aria-label="Close"], div[role="dialog"] svg[aria-label="Закрыть"], div[role="dialog"] button');
    const count = await closeButtons.count();
    if (count > 0) {
      await closeButtons.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
  } catch {
    // Игнорируем отсутствие модалок
  }
}

async function extractTrendingTopics(page) {
  console.log('[STEP 1] Переход на https://www.threads.net/search...');
  await page.goto('https://www.threads.net/search', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(3000);
  await dismissModals(page);

  // Проверка на жесткий редирект на логин
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    console.warn('[AUTH_REQUIRED] Threads принудительно перенаправил на страницу входа.');
    await saveDebugArtifacts(page, 'threads-login-redirect');
    return [];
  }

  // Поиск трендовых элементов по тексту заголовков и ссылкам поиска
  const topics = await page.evaluate(() => {
    const found = new Set();
    const keywords = ['trending', 'trending now', 'в тренде', 'актуальные', 'тренды', 'популярное'];

    // Поиск по ссылкам с поисковым запросом
    const searchLinks = Array.from(document.querySelectorAll('a[href*="/search?q="], a[href*="/search/"]'));
    for (const a of searchLinks) {
      const text = a.textContent?.trim();
      if (text && text.length > 1 && text.length < 60 && !text.includes('Search') && !text.includes('Поиск')) {
        found.add(text);
      }
    }

    // Если ссылок мало, ищем блоки с текстовыми метками трендов
    if (found.size === 0) {
      const allElements = Array.from(document.querySelectorAll('div, span, p, h2, h3'));
      for (const el of allElements) {
        const text = el.textContent?.toLowerCase().trim() || '';
        if (keywords.some(k => text === k || text.startsWith(k))) {
          const parent = el.closest('div[style*="flex"], div');
          if (parent) {
            const items = parent.querySelectorAll('a, button, div[dir="auto"]');
            items.forEach(item => {
              const itemText = item.textContent?.trim();
              if (itemText && itemText.length > 2 && itemText.length < 50 && !keywords.includes(itemText.toLowerCase())) {
                found.add(itemText);
              }
            });
          }
        }
      }
    }

    return Array.from(found);
  });

  return topics.slice(0, MAX_TOPICS);
}

async function scrapePostsForTopic(page, topic) {
  console.log(`[STEP 2] Сбор постов по теме: "${topic}"`);
  const searchUrl = `https://www.threads.net/search?q=${encodeURIComponent(topic)}&serp_type=default`;

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await dismissModals(page);

    // Скроллинг для подгрузки динамического контента
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(1500);
      await dismissModals(page);
    }

    const rawPosts = await page.evaluate((topicName) => {
      const results = [];
      const postLinks = Array.from(document.querySelectorAll('a[href*="/post/"]'));
      const seenIds = new Set();

      for (const link of postLinks) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/@([^\/]+)\/post\/([A-Za-z0-9_-]+)/);
        if (!match) continue;

        const postId = match[2];
        if (seenIds.has(postId)) continue;
        seenIds.add(postId);

        // Находим контейнер поста
        let container = link;
        for (let i = 0; i < 7; i++) {
          if (!container.parentElement) break;
          container = container.parentElement;
          if (container.tagName.toLowerCase() === 'article' || container.querySelector('a[href*="/post/"]') === link) {
            if (container.querySelectorAll('a[href*="/post/"]').length === 1) break;
          }
        }

        // 1. Пропускаем посты с видео
        if (container.querySelector('video')) continue;

        // 2. Пропускаем рекламу
        const containerText = container.innerText || '';
        if (containerText.includes('Sponsored') || containerText.includes('Реклама')) continue;

        // 3. Извлекаем картинки (исключая аватары)
        const images = Array.from(container.querySelectorAll('img'));
        let postImgUrl = null;

        for (const img of images) {
          const src = img.getAttribute('src');
          if (!src || !src.startsWith('http')) continue;

          // Исключаем аватары
          const alt = (img.getAttribute('alt') || '').toLowerCase();
          const isAvatar = alt.includes('profile') || alt.includes('аватар') || alt.includes('фото профиля');
          const isSmall = (img.naturalWidth > 0 && img.naturalWidth < 150) || (img.clientWidth > 0 && img.clientWidth < 150);

          if (!isAvatar && !isSmall) {
            postImgUrl = src;
            break;
          }
        }

        if (!postImgUrl) continue;

        // 4. Текст поста
        const textElements = Array.from(container.querySelectorAll('div[dir="auto"], span[dir="auto"]'));
        let longestText = '';
        for (const te of textElements) {
          const t = te.innerText?.trim() || '';
          if (t.length > longestText.length && !t.includes('http')) {
            longestText = t;
          }
        }

        // Отбрасываем простыни текста (не мемный формат)
        if (longestText.length > 500) continue;

        results.push({
          source: 'threads',
          id: postId,
          url: href.startsWith('http') ? href : `https://www.threads.net${href}`,
          title: longestText.slice(0, 80).replace(/\n/g, ' ') || topicName,
          text: longestText,
          imgUrl: postImgUrl,
          topic: topicName,
          scrapedAt: new Date().toISOString()
        });
      }

      return results;
    }, topic);

    return rawPosts.slice(0, MAX_POSTS_PER_TOPIC);
  } catch (err) {
    console.error(`[ERROR] Ошибка сбора темы "${topic}": ${err.message}`);
    return [];
  }
}

async function run() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('[FATAL] Отсутствуют переменные окружения UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--lang=ru-RU,ru,en-US,en'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ru-RU',
    extraHTTPHeaders: {
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });

  const page = await context.newPage();

  // Удаление признаков автоматизации
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    let topics = await extractTrendingTopics(page);

    if (topics.length === 0) {
      console.warn('[WARN] Раздел Trending Now недоступен без авторизации на текущем IP. Включение резервных мем-тем.');
      await saveDebugArtifacts(page, 'threads-trends-unavailable');
      topics = FALLBACK_TOPICS;
    } else {
      console.log(`[INFO] Найдено трендовых тем: ${topics.length} (${topics.join(', ')})`);
    }

    let addedMemesCount = 0;

    for (const topic of topics) {
      if (addedMemesCount >= MAX_TOTAL_MEMES) {
        console.log(`[LIMIT] Достигнут общий лимит в ${MAX_TOTAL_MEMES} постов.`);
        break;
      }

      const posts = await scrapePostsForTopic(page, topic);
      console.log(`[PARSED] Найдено подходящих постов по теме "${topic}": ${posts.length}`);

      for (const post of posts) {
        if (addedMemesCount >= MAX_TOTAL_MEMES) break;

        // 1. Дедупликация по ID поста
        const postKey = `threads:processed:${post.id}`;
        const isNewPost = await redis.set(postKey, '1', { nx: true, ex: TTL_14_DAYS });
        if (!isNewPost) {
          continue;
        }

        // 2. Дедупликация по хешу картинки
        const imgHash = crypto.createHash('md5').update(post.imgUrl).digest('hex');
        const imgKey = `threads:processed_img:${imgHash}`;
        const isNewImg = await redis.set(imgKey, '1', { nx: true, ex: TTL_14_DAYS });
        if (!isNewImg) {
          continue;
        }

        // 3. Отправка в очередь
        await redis.lpush('queue:memes', JSON.stringify(post));
        addedMemesCount++;
        console.log(`[QUEUED] (${addedMemesCount}/${MAX_TOTAL_MEMES}) [${post.id}] ${post.title}`);
      }
    }

    console.log(`[FINISH] Успешно добавлено новых мемов в queue:memes: ${addedMemesCount}`);
  } catch (error) {
    console.error(`[FATAL] Сбой выполнения: ${error.message}`);
    await saveDebugArtifacts(page, 'threads-runtime-error');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
