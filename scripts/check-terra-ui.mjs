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
          const header = page.locator('[data-terra-page-header]');
          await header.waitFor();
          assert.equal(await header.count(), 1);
          assert.equal(await header.getByRole('heading', { name: title, exact: true }).count(), 1);
          assert.equal(await header.evaluate(e => e.scrollWidth <= e.clientWidth), true, `${id}: overflow at ${width}`);
          for (const label of ['Уведомления', 'Настройки и профиль', ...(primary ? [primary] : [])]) {
            const button = header.getByRole('button', { name: label, exact: true });
            const rect = await button.boundingBox();
            assert.ok(rect && rect.width >= 44 && rect.height >= 44, `${id}: target ${label}`);
            await button.click();
            await page.getByTestId('terra-action-result').getByText(label, { exact: true }).waitFor();
          }
          assert.equal(await page.locator('html').evaluate(e => e.classList.contains('dark')), theme === 'dark');
          await header.screenshot({ path: `terra-ui-screenshots/${id}-${theme}-${width}.png`, animations: 'disabled' });
        }
      } finally { await page.close(); }
    }
  }
  console.log('Terra PageHeader: 48 story cases checked.');
} finally { await browser.close(); }
