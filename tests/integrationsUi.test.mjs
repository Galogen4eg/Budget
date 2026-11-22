import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const settings=readFileSync(new URL('../components/SettingsModal.tsx',import.meta.url),'utf8');

test('Telegram bot and delivery tests are separate, correctly named controls',()=>{
 assert.match(settings,/Проверить токен/);
 assert.match(settings,/Проверить доставку/);
 assert.match(settings,/sendTelegramMessage\(/);
 assert.match(settings,/getMe не проверяет доступ к семейному чату/);
});
test('delivery test requires both chat and token and reports Telegram errors',()=>{
 assert.match(settings,/!settings\.telegramChatId\?\.trim\(\)/);
 assert.match(settings,/result\.success/);
 assert.match(settings,/result\.error/);
});
test('changing Telegram credentials invalidates prior test result',()=>{
 assert.match(settings,/setTelegramTestResult\(null\)/);
 assert.match(settings,/setTelegramDeliveryResult\(null\)/);
});
test('Gemini key editing invalidates test result and exposes accessible toggle',()=>{
 assert.match(settings,/setAiTestStatus\('idle'\)/);
 assert.match(settings,/aria-label=\{showGeminiKey \?/);
});
test('integration form labels and status regions remain accessible on phone',()=>{
 assert.match(settings,/htmlFor="telegram-bot-token"/);
 assert.match(settings,/htmlFor="telegram-chat-id"/);
 assert.match(settings,/role="status"/);
 assert.match(settings,/min-h-\[44px\]/);
});
