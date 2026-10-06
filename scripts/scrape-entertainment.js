import { chromium } from 'playwright';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const SOURCES = [
  { url: 'https://pikabu.ru/community/mem/hot', name: 'community/mem/hot' },
  { url: 'https://pikabu.ru/community/Dankmemes/hot', name: 'community/Dankmemes/hot' },
  { url: 'https://pikabu.ru/community/truedankmemes/hot', name: 'community/truedankmemes/hot' },
  { url: 'https://pikabu.ru/community/humorandmems/hot', name: 'community/humorandmems/hot' },
  { url: 'https://pikabu.ru/tag/Мемы/hot', name: 'tag/Мемы/hot' },
  { url: 'https://pikabu.ru/tag/Картинка%20с%20текстом/hot', name: 'tag/Картинка с текстом/hot' },
  { url: 'https://pikabu.ru/tag/Юмор/hot', name: 'tag/Юмор/hot' },
  { url: 'https://pikabu.ru/tag/Ирония/hot', name: 'tag/Ирония/hot' },
  { url: 'https://pikabu.ru/tag/Сарказм/hot', name: 'tag/Сарказм/hot' },
  { url: 'https://pikabu.ru/tag/Абсурдный%20юмор%2CМемы/hot', name: 'tag/Абсурдный юмор,Мемы/hot' },
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
  console.log(`Открываю источник: ${source.url}`);
  try {
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForSelector('article.story', { timeout: 12000 });
  } catch (err) {
    console.warn(`Не удалось загрузить ${source.url}: ${err.message}`);
    return [];
  }

  // Прокручиваем страницу 12 раз для подгрузки глубины ленты
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => window.scrollBy(0, 2500));
    await page.waitForTimeout(1000);
  }

  const rawStories = await page.$$eval('article.story', articles => {
    return articles.map(art => {
      const linkEl = art.querySelector('a.story__title-link');
      const authorEl = art.querySelector('a.user__nick, a[href*="/@"]');
      const communityEl = art.querySelector('a[href*="/community/"]');
      const textEl = art.querySelector('.story__text');
      const hasParent = Boolean(art.querySelector('.story__parent-link, .story__header-parent'));
      const hasVideo = Boolean(art.querySelector('video, .player, [data-type="video"], .story__video-wrap'));

      // Поиск всех картинок внутри контента поста (исключая аватары)
      const contentImages = Array.from(
        art.querySelectorAll('.story-image__image, .story__content img:not(.user__avatar)')
      );

      // Извлечение тегов по ссылке
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
  // Базовая проверка структуры
  if (!story.url || !story.url.includes('/story/')) return false;
  if (!story.title || !story.imgUrl) return false;
  if (story.imgUrl.startsWith('data:')) return false;

  // Строго 1 картинка в посте
  if (story.imgCount !== 1) return false;

  // Исключение видео и ответов на посты
  if (story.hasVideo || story.hasParent) return false;

  // Нормализация тегов
  const normalizedTags = story.tags.map(t => t.toLowerCase());

  // Проверка на стоп-теги
  for (const tag of normalizedTags) {
    if (STOP_TAGS.has(tag)) return false;
  }

  // Проверка на наличие минимум 2 мемных тегов
  let memeTagCount = 0;
  for (const tag of normalizedTags) {
    if (MEME_TAGS.has(tag)) {
      memeTagCount++;
    }
  }

  return memeTagCount >= 2;
}

async function run() {
  console.log('Запуск Chromium для сбора мемов...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const collectedPosts = new Map();

  for (const source of SOURCES) {
    const stories = await scrapeSource(page, source);
    console.log(`На источнике [${source.name}] найдено карточек: ${stories.length}`);

    for (const story of stories) {
      if (!isValidMeme(story)) continue;

      const storyIdMatch = story.url.match(/_(\d+)$/);
      if (!storyIdMatch) continue;
      const storyId = storyIdMatch[1];

      // Устраняем дубликаты между разными источниками за текущий запуск
      if (!collectedPosts.has(storyId)) {
        collectedPosts.set(storyId, {
          source: 'pikabu',
          sourcePage: story.sourcePage,
          id: storyId,
          title: story.title,
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
  console.log(`Всего уникальных валидных мемов собрано: ${collectedPosts.size}`);

  let addedCount = 0;
  for (const [storyId, postData] of collectedPosts.entries()) {
    const redisKey = `pikabu:processed:${storyId}`;
    const isProcessed = await redis.get(redisKey);

    if (!isProcessed) {
      await redis.lpush('queue:entertainment_posts', JSON.stringify(postData));
      // Храним признак обработки 30 дней
      await redis.set(redisKey, 'in_queue', { ex: 60 * 60 * 24 * 30 });
      addedCount++;
    }
  }

  console.log(`Добавлено новых мемов в очередь Redis: ${addedCount}`);
}

run().catch(err => {
  console.error('Ошибка в парсере мемов:', err);
  process.exit(1);
});
