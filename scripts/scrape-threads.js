import { chromium } from 'playwright';
import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MAX_POSTS_PER_PROFILE = 10;
const MAX_TOTAL_MEMES = 50;
const TTL_14_DAYS = 14 * 24 * 60 * 60;

// Список открытых русскоязычных мем-аккаунтов в Threads
const MEME_PROFILES = [
  'memes',
  'ru.memes',
  'leprum',
  'pikabu.ru',
  'i_mems',
  'dank_memes_ru',
  'smeh_humor_memes',
  'memepedia_ru'
];

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
  try {
    await page.screenshot({ path: screenPath, fullPage: false });
    console.log(`[DIAGNOSTIC] Сохранен скриншот: ${screenPath}`);
  } catch (err) {
    console.error(`[DIAGNOSTIC] Ошибка скриншота: ${err.message}`);
  }
}

async function dismissModals(page) {
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    const closeButtons = page.locator('div[role="dialog"] svg[aria-label="Close"], div[role="dialog"] svg[aria-label="Закрыть"], div[role="dialog"] button');
    if (await closeButtons.count() > 0) {
      await closeButtons.first().click().catch(() => {});
      await page.waitForTimeout(400);
    }
  } catch {
    // Игнорируем отсутствие модалок
  }
}

async function scrapeProfile(page, username) {
  const profileUrl = `https://www.threads.net/@${username}`;
  console.log(`[PROFILE] Парсинг @${username}...`);

  try {
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await dismissModals(page);

    // Скроллим страницу для подгрузки первых постов
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(1000);
      await dismissModals(page);
    }

    const posts = await page.evaluate((authorName) => {
      const results = [];
      const links = Array.from(document.querySelectorAll('a[href*="/post/"]'));
      const seenIds = new Set();

      for (const link of links) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/@([^\/]+)\/post\/([A-Za-z0-9_-]+)/);
        if (!match) continue;

        const postId = match[2];
        if (seenIds.has(postId)) continue;
        seenIds.add(postId);

        // Поиск родительского контейнера публикации
        let container = link;
        for (let i = 0; i < 7; i++) {
          if (!container.parentElement) break;
          container = container.parentElement;
          if (container.querySelectorAll('a[href*="/post/"]').length === 1) break;
        }

        // Пропускаем видео и рекламу
        if (container.querySelector('video')) continue;
        if (container.innerText?.includes('Sponsored')) continue;

        // Ищем картинку поста (отсекая аватарки)
        const images = Array.from(container.querySelectorAll('img'));
        let postImgUrl = null;

        for (const img of images) {
          const src = img.getAttribute('src');
          if (!src || !src.startsWith('http')) continue;

          const alt = (img.getAttribute('alt') || '').toLowerCase();
          const isAvatar = alt.includes('profile') || alt.includes('аватар');
          const isSmall = img.clientWidth > 0 && img.clientWidth < 120;

          if (!isAvatar && !isSmall) {
            postImgUrl = src;
            break;
          }
        }

        if (!postImgUrl) continue;

        // Извлекаем текст
        const textElements = Array.from(container.querySelectorAll('div[dir="auto"], span[dir="auto"]'));
        let longestText = '';
        for (const te of textElements) {
          const t = te.innerText?.trim() || '';
          if (t.length > longestText.length && !t.includes('http')) {
            longestText = t;
          }
        }

        if (longestText.length > 500) continue;

        results.push({
          source: 'threads',
          id: postId,
          url: href.startsWith('http') ? href : `https://www.threads.net${href}`,
          title: longestText.slice(0, 80).replace(/\n/g, ' ') || `Мем от @${authorName}`,
          text: longestText,
          imgUrl: postImgUrl,
          topic: `@${authorName}`,
          scrapedAt: new Date().toISOString()
        });
      }

      return results;
    }, username);

    return posts.slice(0, MAX_POSTS_PER_PROFILE);
  } catch (err) {
    console.error(`[ERROR] Ошибка профиля @${username}: ${err.message}`);
    return [];
  }
}

async function run() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('[FATAL] Отсутствуют переменные окружения Redis');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--lang=ru-RU,ru'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'ru-RU',
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    let addedCount = 0;

    for (const username of MEME_PROFILES) {
      if (addedCount >= MAX_TOTAL_MEMES) break;

      const posts = await scrapeProfile(page, username);
      console.log(`[FOUND] @${username}: найдено подходящих постов: ${posts.length}`);

      for (const post of posts) {
        if (addedCount >= MAX_TOTAL_MEMES) break;

        // Дедупликация по ID поста
        const postKey = `threads:processed:${post.id}`;
        const isNewPost = await redis.set(postKey, '1', { nx: true, ex: TTL_14_DAYS });
        if (!isNewPost) continue;

        // Дедупликация по хешу картинки
        const imgHash = crypto.createHash('md5').update(post.imgUrl).digest('hex');
        const imgKey = `threads:processed_img:${imgHash}`;
        const isNewImg = await redis.set(imgKey, '1', { nx: true, ex: TTL_14_DAYS });
        if (!isNewImg) continue;

        await redis.lpush('queue:memes', JSON.stringify(post));
        addedCount++;
        console.log(`[QUEUED] (${addedCount}) [${post.id}] ${post.title}`);
      }
    }

    if (addedCount === 0) {
      await saveDebugArtifacts(page, 'threads-zero-collected');
    }

    console.log(`[FINISH] Добавлено мемов в queue:memes: ${addedCount}`);
  } catch (error) {
    console.error(`[FATAL] ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
