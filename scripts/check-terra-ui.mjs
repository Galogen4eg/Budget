import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.TERRA_STORYBOOK_URL || 'http://127.0.0.1:6006';
const cases = [
  ['overview', 'Обзор', 'Добавить операцию'],
  ['budget', 'Бюджет', 'Добавить операцию'],
  ['plans', 'Планы', 'Добавить событие'],
  ['shopping', 'Покупки', 'Добавить товар'],
  ['chat', 'Чат', null],
  ['services', 'Сервисы', null],
];
await mkdir('terra-ui-screenshots', { recursive: true });
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) {
    for (const width of [360, 390, 768, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 820 }, reducedMotion: 'reduce' });
      try {
        for (const [id, title, primary] of cases) {
          await page.goto(`${base}/iframe.html?id=terra-pageheader--${id}&viewMode=story&globals=theme:${theme}`);
          await page.evaluate(() => document.fonts.ready);
          const header = page.locator('[data-terra-page-header]');
          await header.waitFor();
          await header.getByRole('button', { name: 'Уведомления', exact: true }).waitFor();
          await header.screenshot({ path: `terra-ui-screenshots/${id}-${theme}-${width}.png`, animations: 'disabled' });
          assert.equal(await header.count(), 1);
          assert.equal(await header.getByRole('heading', { name: title, exact: true }).count(), 1);
          assert.equal(await header.evaluate(e => e.scrollWidth <= e.clientWidth), true, `${id}: overflow at ${width}`);
          // Wide headers should not spend a second row on a small action group.
          if (primary) {
            const geometry = await header.evaluate(e => {
              const main = e.querySelector('.terra-page-header-main').getBoundingClientRect();
              const actions = e.querySelector('.terra-page-header-actions').getBoundingClientRect();
              return { mainTop: main.top, mainBottom: main.bottom, actionsTop: actions.top, actionsBottom: actions.bottom, height: e.getBoundingClientRect().height };
            });
            if (width >= 768) {
              assert.ok(geometry.actionsTop >= geometry.mainTop && geometry.actionsBottom <= geometry.mainBottom, `${id}/${theme}/${width}: actions should fit on one row ${JSON.stringify(geometry)}`);
              assert.ok(geometry.height <= 80, `${id}/${theme}/${width}: excessive header height`);
            } else {
              assert.ok(geometry.actionsTop >= geometry.mainBottom - 1, `${id}/${theme}/${width}: mobile actions should stay below title`);
            }
          }
          const secondary = { overview: 'AI Ассистент', budget: 'Импорт выписки', plans: 'Голосовой ввод', shopping: 'Отправить список в Telegram' }[id];
          for (const label of ['Уведомления', 'Настройки и профиль', ...(primary ? [primary] : []), ...(secondary ? [secondary] : [])]) {
            const button = header.getByRole('button', { name: label, exact: true });
            const rect = await button.boundingBox();
            assert.ok(rect && rect.width >= 44 && rect.height >= 44, `${id}/${theme}/${width}: target ${label} ${JSON.stringify(rect)}`);
            await button.click();
            await page.getByTestId('terra-action-result').getByText(label, { exact: true }).waitFor();
          }
          assert.equal(await page.locator('html').evaluate(e => e.classList.contains('dark')), theme === 'dark');
        }
      } finally { await page.close(); }
    }
  }
  console.log('Terra PageHeader: 48 story cases checked.');
} finally { await browser.close(); }
