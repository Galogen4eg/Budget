import { chromium } from 'playwright';
import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TTL_30_DAYS = 30 * 24 * 60 * 60;
const MAX_POSTS_PER_SOURCE = 30;

// Минимальный рейтинг поста
const MIN_RATING = 300;

// Максимальная длина текста (чтобы отсекать простыни, не помещающиеся в Telegram)
const MAX_TEXT_LENGTH = 1200;

// Запрещенные теги
const STOP_TAGS = new Set([
  'ответ на пост',
  'длиннопост',
  'видео',
  'короткие видео',
  'вертикальное видео',
  'подборка',
  'повтор',
  'реклама',
  'политика',
  '18+',
  'nsfw',
  'жесть',
]);

const SOURCES = [
  // Общие разделы
  { url: 'https://pikabu.ru/best/day', category: 'best', name: 'Лучшее за день' },
  { url: 'https://pikabu.ru/best/week', category: 'best', name: 'Лучшее за неделю' },

  // Мемы
  { url: 'https://pikabu.ru/community/mem/hot', category: 'memes', name: 'Мемы' },
  { url: 'https://pikabu.ru/community/Dankmemes/hot', category: 'memes', name: 'Dank Memes' },

  // Технологии и гаджеты
  { url: 'https://pikabu.ru/community/infotech/hot', category: 'technology', name: 'IT' },
  { url: 'https://pikabu.ru/tag/IT/hot', category: 'technology', name: 'Тег IT' },
  { url: 'https://pikabu.ru/tag/Гаджеты/hot', category: 'gadgets', name: 'Гаджеты' },

  // Новости и наука
  { url: 'https://pikabu.ru/community/news/hot', category: 'news', name: 'Новости' },
  { url: 'https://pikabu.ru/community/science/hot', category: 'science', name: 'Наука' },

  // Игры
  { url: 'https://pikabu.ru/community/gamers/hot', category: 'games', name: 'Лига Геймеров' },
  { url: 'https://pikabu.ru/tag/Игры/hot', category: 'games', name: 'Тег Игры' },

  // Ремонт и DIY
  { url: 'https://pikabu.ru/community/remont/hot', category: 'diy', name: 'Ремонт' },
  { url: 'https://pikabu.ru/community/diy/hot', category: 'diy', name: 'Своими руками' },

  // Путешествия, животные, кино, фото, лайфхаки
  { url: 'https://pikabu.ru/community/travel/hot', category: 'travel', name: 'Путешествия' },
  { url: 'https://pikabu.ru/community/kotiki_obormotiki/hot', category: 'animals', name: 'Котомафия' },
  { url: 'https://pikabu.ru/tag/Животные/hot', category: 'animals', name: 'Тег Животные' },
  { url: 'https://pikabu.ru/tag/Фильмы/hot', category: 'cinema', name: 'Тег Фильмы' },
  { url: 'https://pikabu.ru/community/music/hot', category: 'music', name: 'Музыка' },
  { url: 'https://pikabu.ru/community/photo/hot', category: 'photo', name: 'Фотография' },
  { url: 'https://pikabu.ru/tag/Лайфхак/hot', category: 'lifehacks', name: 'Тег Лайфхаки' },
];

async function saveDebugArtifact(page, sourceName) {
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  const cleanName = sourceName.replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');
  const screenPath = path.join(artifactsDir, `fail-${cleanName}-${Date.now()}.png`);
  try {
    await page.screenshot({ path: screenPath, fullPage: false });
    console.log(`[DIAGNOSTIC] Сохранен скриншот: ${screenPath}`);
  } catch (err) {
    console.error(`[DIAGNOSTIC] Ошибка скриншота: ${err.message}`);
  }
}

async function scrapePage(page, source) {
  console.log(`[SCRAPE] Сбор: [${source.category}] ${source.name} (${source.url})`);
  try {
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('article.story, div.story', { timeout: 12000 });
  } catch (err) {
    console.warn(`[WARN] Ошибка загрузки ${source.url}: ${err.message}`);
    await saveDebugArtifact(page, source.name);
    return [];
  }

  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy(0, 2800));
    await page.waitForTimeout(700);
  }

  const rawPosts = await page.evaluate(
    ({ categoryName, minRating, maxTextLen, stopTagsList }) => {
      const stopTags = new Set(stopTagsList);
      const articles = Array.from(document.querySelectorAll('article.story, div.story'));
      const results = [];

      for (const art of articles) {
        // Исключаем спонсорские публикации и рекламу
        if (
          art.classList.contains('story_sponsor') ||
          art.querySelector('.story__sponsor, .story__header-sponsor, a[href*="/sponsor"]')
        ) {
          continue;
        }

        // Исключаем посты с видео
        if (art.querySelector('video, .player, [data-type="video"], .story__video-wrap')) {
          continue;
        }

        // Исключаем ответы на другие посты (по разметке Пикабу)
        const hasParentLink = Boolean(
          art.querySelector('.story__parent-link, .story__header-parent, .story__parent, a[href*="parent_id"]')
        );
        if (hasParentLink) {
          continue;
        }

        const linkEl = art.querySelector('a.story__title-link, .story__header-title a, a[href*="/story/"]');
        if (!linkEl) continue;

        const title = linkEl.innerText?.trim() || '';

        // Проверка заголовка на шаблонные ответы
        if (/^ответ на пост/i.test(title)) {
          continue;
        }

        const href = linkEl.getAttribute('href') || '';
        const fullUrl = href.startsWith('http') ? href : `https://pikabu.ru${href}`;
        const idMatch = fullUrl.match(/_(\d+)$/) || href.match(/\/story\/[^_]+_(\d+)/);
        const dataId = art.getAttribute('data-story-id');
        const storyId = dataId || (idMatch ? idMatch[1] : null);

        if (!storyId) continue;

        // Проверка тегов поста
        const tagEls = Array.from(art.querySelectorAll('a[href*="/tag/"]'));
        const tags = tagEls.map((t) => t.innerText.trim().toLowerCase()).filter(Boolean);

        let hasStopTag = false;
        for (const t of tags) {
          if (stopTags.has(t)) {
            hasStopTag = true;
            break;
          }
        }
        if (hasStopTag) continue;

        // Рейтинг
        let rating = 0;
        const dataRating = art.getAttribute('data-rating');
        if (dataRating !== null && dataRating !== '') {
          rating = parseInt(dataRating, 10) || 0;
        } else {
          const ratingEl = art.querySelector('.story__rating-count, .story__rating-val');
          if (ratingEl) {
            const rawRating = ratingEl.innerText.trim().replace(/\s+/g, '');
            if (/[kKкК]$/.test(rawRating)) {
              rating = Math.round(parseFloat(rawRating.replace(',', '.')) * 1000) || 0;
            } else {
              rating = parseInt(rawRating, 10) || 0;
            }
          }
        }

        if (rating < minRating) {
          continue;
        }

        // Текст
        const textEl = art.querySelector('.story__text, .story-block_type_text');
        const text = textEl ? textEl.innerText.trim() : '';

        // Исключаем простыни текста
        if (text.length > maxTextLen) {
          continue;
        }

        let comments = 0;
        const dataComments = art.getAttribute('data-comments-count');
        if (dataComments !== null && dataComments !== '') {
          comments = parseInt(dataComments, 10) || 0;
        } else {
          const commEl = art.querySelector('a.story__comments-link, .story__comments-count');
          if (commEl) {
            comments = parseInt(commEl.innerText.replace(/\D/g, ''), 10) || 0;
          }
        }

        const authorEl = art.querySelector('a.user__nick, a[href*="/@"]');
        const communityEl = art.querySelector('a[href*="/community/"], .story__community-link');
        const timeEl = art.querySelector('time');

        // Картинки
        const imgElements = Array.from(
          art.querySelectorAll('.story-image__image, .story__content img:not(.user__avatar)')
        );

        const images = [];
        for (const img of imgElements) {
          const src =
            img.getAttribute('data-large-image') ||
            img.getAttribute('data-src') ||
            img.getAttribute('src');

          if (src && src.startsWith('http') && !src.startsWith('data:')) {
            images.push(src);
          }
        }

        if (categoryName === 'memes' && images.length === 0) {
          continue;
        }

        if (images.length === 0 && text.length < 40) {
          continue;
        }

        results.push({
          source: 'pikabu',
          id: storyId,
          url: fullUrl,
          title,
          text,
          imgUrl: images[0] || null,
          images,
          category: categoryName,
          community: communityEl ? communityEl.innerText.trim() : null,
          rating,
          comments,
          author: authorEl ? authorEl.innerText.trim() : null,
          publishedAt: timeEl ? timeEl.getAttribute('datetime') : null,
        });
      }

      return results;
    },
    {
      categoryName: source.category,
      minRating: MIN_RATING,
      maxTextLen: MAX_TEXT_LENGTH,
      stopTagsList: Array.from(STOP_TAGS),
    }
  );

  return rawPosts.slice(0, MAX_POSTS_PER_SOURCE);
}

async function run() {
  console.log(`Старт парсера Пикабу... Рейтинг >= ${MIN_RATING}, длина текста <= ${MAX_TEXT_LENGTH}`);
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ru-RU',
  });

  const page = await context.newPage();
  const collectedMap = new Map();
  const stats = {};

  for (const src of SOURCES) {
    if (!stats[src.category]) stats[src.category] = 0;
    const items = await scrapePage(page, src);

    for (const post of items) {
      if (!collectedMap.has(post.id)) {
        collectedMap.set(post.id, {
          ...post,
          scrapedAt: new Date().toISOString(),
        });
        stats[src.category]++;
      }
    }
  }

  await browser.close();
  console.log(`Всего подходящих постов извлечено: ${collectedMap.size}`);

  let addedCount = 0;
  for (const [storyId, post] of collectedMap.entries()) {
    const postKey = `pikabu:processed:${storyId}`;
    const isNew = await redis.set(postKey, '1', { nx: true, ex: TTL_30_DAYS });
    if (!isNew) continue;

    if (post.imgUrl) {
      const imgHash = crypto.createHash('md5').update(post.imgUrl).digest('hex');
      const imgKey = `pikabu:processed_img:${imgHash}`;
      const isNewImg = await redis.set(imgKey, '1', { nx: true, ex: TTL_30_DAYS });
      if (!isNewImg) continue;
    }

    const payload = JSON.stringify(post);

    await redis.lpush('queue:pikabu', payload);
    await redis.lpush(`queue:pikabu:${post.category}`, payload);

    addedCount++;
  }

  console.log('\n================ СТАТИСТИКА СБОРА ================');
  console.table(stats);
  console.log(`Успешно добавлено качественных записей в Redis: ${addedCount}`);
}

run().catch((err) => {
  console.error('[FATAL] Сбой парсера:', err);
  process.exit(1);
});
