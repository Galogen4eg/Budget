import { chromium } from 'playwright';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function run() {
  console.log('Запуск Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log('Открываю Пикабу...');
  await page.goto('https://pikabu.ru/best/week', { 
    waitUntil: 'domcontentloaded', 
    timeout: 30000 
  });

  await page.waitForSelector('article.story', { timeout: 10000 });
  await page.evaluate(() => window.scrollBy(0, 1500));
  await page.waitForTimeout(2000);

  const posts = await page.$$eval('article.story', articles => {
    return articles.map(art => {
      const linkEl = art.querySelector('a.story__title-link');
      const textEl = art.querySelector('.story__text');
      const imgEl = art.querySelector('.story-image__image, .story__content img');

      const title = linkEl ? linkEl.innerText.trim() : '';
      const url = linkEl ? linkEl.href : '';
      const desc = textEl ? textEl.innerText.trim() : '';
      let imgUrl = null;

      if (imgEl) {
        imgUrl = imgEl.getAttribute('data-src') || 
                 imgEl.getAttribute('data-large-image') || 
                 imgEl.src || 
                 null;
      }

      return { title, url, desc, imgUrl };
    }).filter(p => p.url && (p.title || p.desc || p.imgUrl));
  });

  console.log(`Найдено постов на странице: ${posts.length}`);

  let addedCount = 0;
  for (const post of posts) {
    const storyIdMatch = post.url.match(/_(\d+)$/);
    const storyId = storyIdMatch ? storyIdMatch[1] : Buffer.from(post.url).toString('base64').substring(0, 24);
    const redisKey = `pikabu:processed:${storyId}`;

    const exists = await redis.get(redisKey);
    if (!exists) {
      await redis.lpush('queue:entertainment_posts', JSON.stringify({
        source: 'pikabu',
        id: storyId,
        title: post.title,
        desc: post.desc,
        imgUrl: post.imgUrl,
        url: post.url,
        scrapedAt: new Date().toISOString()
      }));

      await redis.set(redisKey, 'in_queue', { ex: 60 * 60 * 24 * 14 });
      addedCount++;
    }
  }

  console.log(`Добавлено новых постов в очередь Redis: ${addedCount}`);
  await browser.close();
}

run().catch(err => {
  console.error('Ошибка в парсере:', err);
  process.exit(1);
});
