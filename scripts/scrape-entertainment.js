import { chromium } from 'playwright';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Минимальный рейтинг поста (плюсы), ниже которого пост отбрасывается
const MIN_RATING = 300;

const SOURCES = [
  { url: 'https://pikabu.ru/community/mem/hot', name: 'community/mem' },
  { url: 'https://pikabu.ru/community/Dankmemes/hot', name: 'community/Dankmemes' },
  { url: 'https://pikabu.ru/community/truedankmemes/hot', name: 'community/truedankmemes' },
  { url: 'https://pikabu.ru/community/humorandmems/hot', name: 'community/humorandmems' },
  { url: 'https://pikabu.ru/tag/Мемы/hot', name: 'tag/Мемы' },
  { url: 'https://pikabu.ru/tag/Картинка%20с%20текстом/hot', name: 'tag/Картинка с текстом' },
  { url: 'https://pikabu.ru/tag/Юмор/hot', name: 'tag/Юмор' },
  { url: 'https://pikabu.ru/tag/Ирония/hot', name: 'tag/Ирония' },
  { url: 'https://pikabu.ru/tag/Сарказм/hot', name: 'tag/Сарказм' },
  { url: 'https://pikabu.ru/tag/Абсурдный%20юмор%2CМемы/hot', name: 'tag/Абсурдный юмор' },
];

const MEME_TAGS = new Set([
  'мемы',
  'картинка с текстом',
  'юмор',
  'картинки',
  'ирония',
  'сарказм',
  'странный юмор',
  'абсурд',
  'каламбур',
  'демотиватор',
  'постирония',
  'игра слов',
  'грустный юмор',
]);

const STOP_TAGS = new Set([
  'видео',
  'короткие видео',
  'вертикальное видео',
  'ответ на пост',
  'длиннопост',
  'подборка',
  'повтор',
  'реклама',
  'политика',
  '18+',
  'nsfw',
  'жесть',
]);

async function scrapeSource(page, source) {
  try {
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('article.story', { timeout: 12000 });
  } catch (err) {
    console.warn(`[WARN] Ошибка загрузки ${source.name}: ${err.message}`);
    return [];
  }

  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, 2500));
    await page.waitForTimeout(800);
  }

  const rawStories = await page.$$eval('article.story', articles => {
    return articles.map(art => {
      const linkEl = art.querySelector('a.story__title-link');
      const authorEl = art.querySelector('a.user__nick, a[href*="/@"]');
      const communityEl = art.querySelector('a[href*="/community/"]');
      const textEl = art.querySelector('.story__text');
      const hasParent = Boolean(art.querySelector('.story__parent-link, .story__header-parent'));
      const hasVideo = Boolean(art.querySelector('video, .player, [data-type="video"], .story__video-wrap'));

      // Извлечение рейтинга поста (из data-rating либо из текста счетчика)
      let rating = 0;
      const dataRating = art.getAttribute('data-rating');
      if (dataRating !== null && dataRating !== '') {
        rating = parseInt(dataRating, 10) || 0;
      } else {
        const ratingEl = art.querySelector('.story__rating-count, .story__rating-val');
        if (ratingEl) {
          const raw = ratingEl.innerText.trim().replace(/\s+/g, '');
          if (raw.endsWith('k') || raw.endsWith('K') || raw.endsWith('к') || raw.endsWith('К')) {
            rating = Math.round(parseFloat(raw.replace(',', '.')) * 1000) || 0;
          } else {
            rating = parseInt(raw, 10) || 0;
          }
        }
      }

      const contentImages = Array.from(
        art.querySelectorAll('.story-image__image, .story__content img:not(.user__avatar)')
      );

      const tagEls = Array.from(art.querySelectorAll('a[href*="/tag/"]'));
      const tags = tagEls.map(t => t.innerText.trim()).filter(Boolean);

      let imgUrl = null;
      if (contentImages.length === 1) {
        const img = contentImages[0];
        imgUrl = img.getAttribute('data-large-image') || 
                 img.getAttribute('data-src') || 
                 img.src || 
                 null;
      }

      return {
        url: linkEl ? linkEl.href : null,
        title: linkEl ? linkEl.innerText.trim() : '',
        rating,
        imgCount: contentImages.length,
        imgUrl,
        hasVideo,
        hasParent,
        tags,
        author: authorEl ? authorEl.innerText.trim() : null,
        community: communityEl ? communityEl.innerText.trim() : null,
        text: textEl ? textEl.innerText.trim() : null,
      };
    });
  });

  return rawStories.map(story => ({ ...story, sourcePage: source.name }));
}

function isValidMeme(story) {
  if (!story.url || !story.url.includes('/story/')) return false;
  if (!story.title || !story.imgUrl) return false;
  if (story.imgUrl.startsWith('data:')) return false;
  if (story.imgCount !== 1) return false;
  if (story.hasVideo || story.hasParent) return false;

  // Фильтр по минимальному рейтингу
  if (story.rating < MIN_RATING) return false;

  const normalizedTags = story.tags.map(t => t.toLowerCase());

  for (const tag of normalizedTags) {
    if (STOP_TAGS.has(tag)) return false;
  }

  let memeTagCount = 0;
  for (const tag of normalizedTags) {
    if (MEME_TAGS.has(tag)) memeTagCount++;
  }

  return memeTagCount >= 2;
}

async function run() {
  console.log(`Запуск Chromium... Фильтр по рейтингу: >= ${MIN_RATING} плюсов`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const collectedPosts = new Map();
  const sourceStats = {};

  for (const source of SOURCES) {
    sourceStats[source.name] = { totalFound: 0, passedFilter: 0, pushedToRedis: 0 };
    const stories = await scrapeSource(page, source);
    sourceStats[source.name].totalFound = stories.length;

    for (const story of stories) {
      if (!isValidMeme(story)) continue;

      const storyIdMatch = story.url.match(/_(\d+)$/);
      if (!storyIdMatch) continue;
      const storyId = storyIdMatch[1];

      if (!collectedPosts.has(storyId)) {
        sourceStats[source.name].passedFilter++;
        collectedPosts.set(storyId, {
          source: 'pikabu',
          sourcePage: story.sourcePage,
          id: storyId,
          title: story.title,
          rating: story.rating,
          url: story.url,
          imgUrl: story.imgUrl,
          tags: story.tags,
          community: story.community,
          author: story.author,
          scrapedAt: new Date().toISOString(),
        });
      }
    }
  }

  await browser.close();

  let addedTotal = 0;
  for (const [storyId, postData] of collectedPosts.entries()) {
    const redisKey = `pikabu:processed:${storyId}`;
    const isProcessed = await redis.get(redisKey);

    if (!isProcessed) {
      await redis.lpush('queue:entertainment_posts', JSON.stringify(postData));
      await redis.set(redisKey, 'in_queue', { ex: 60 * 60 * 24 * 30 });
      if (sourceStats[postData.sourcePage]) {
        sourceStats[postData.sourcePage].pushedToRedis++;
      }
      addedTotal++;
    }
  }

  console.log('\n================ СВОДКА ПО ИСТОЧНИКАМ ================');
  console.table(sourceStats);
  console.log(`Всего новых постов сохранено в Redis: ${addedTotal}`);
}

run().catch(err => {
  console.error('Ошибка в парсере:', err);
  process.exit(1);
});
