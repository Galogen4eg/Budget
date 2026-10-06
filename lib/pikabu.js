import { redis } from './redis.js';

export const PIKABU_CATEGORIES = [
  { id: 'memes', title: '😂 Мемы' },
  { id: 'technology', title: '💻 Технологии' },
  { id: 'news', title: '📰 Новости' },
  { id: 'science', title: '🔬 Наука' },
  { id: 'games', title: '🎮 Игры' },
  { id: 'gadgets', title: '📱 Гаджеты' },
  { id: 'diy', title: '🏠 Ремонт' },
  { id: 'travel', title: '🌍 Путешествия' },
  { id: 'animals', title: '🐱 Животные' },
  { id: 'cinema', title: '🎬 Кино' },
  { id: 'music', title: '🎵 Музыка' },
  { id: 'photo', title: '📸 Фото' },
  { id: 'lifehacks', title: '💡 Лайфхаки' },
  { id: 'best', title: '🔥 Лучшее' },
];

export async function getPikabuMenuKeyboard() {
  const keyboard = [];
  let row = [];

  for (let i = 0; i < PIKABU_CATEGORIES.length; i++) {
    const cat = PIKABU_CATEGORIES[i];
    const count = await redis.llen(`queue:pikabu:${cat.id}`);
    row.push({ text: `${cat.title} (${count})`, callback_data: `pk:cat:${cat.id}` });

    if (row.length === 2 || i === PIKABU_CATEGORIES.length - 1) {
      keyboard.push(row);
      row = [];
    }
  }

  const totalCount = await redis.llen('queue:pikabu');
  keyboard.push([{ text: `🌐 Все подряд (${totalCount})`, callback_data: 'pk:cat:all' }]);
  keyboard.push([{ text: '◀️ В главное меню', callback_data: 'menu:back' }]);

  return { inline_keyboard: keyboard };
}
