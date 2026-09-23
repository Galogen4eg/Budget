
import { ShoppingItem } from '../types';

export interface ProductData {
  title: string;
  amount: string;
  unit: 'шт' | 'кг' | 'уп' | 'л';
  category: string;
}

// Локальная база популярных товаров для офлайн-режима
const BARCODE_DB: Record<string, ProductData> = {
  // Напитки
  '5449000000996': { title: 'Coca-Cola', amount: '0.5', unit: 'л', category: 'drinks' },
  '5449000000439': { title: 'Coca-Cola', amount: '1.5', unit: 'л', category: 'drinks' },
  '4600682402131': { title: 'Вода Святой Источник', amount: '1.5', unit: 'л', category: 'drinks' },
  '4600682000047': { title: 'Вода Святой Источник', amount: '0.5', unit: 'л', category: 'drinks' },
  '4600752701720': { title: 'Напиток Добрый Кола', amount: '1', unit: 'л', category: 'drinks' },
  
  // Молочка
  '4607092875083': { title: 'Молоко Простоквашино 2.5%', amount: '1', unit: 'л', category: 'dairy' },
  '4607092875151': { title: 'Молоко Простоквашино 3.2%', amount: '1', unit: 'л', category: 'dairy' },
  '4810268032738': { title: 'Сыр Брест-Литовск', amount: '1', unit: 'уп', category: 'dairy' },
  
  // Бакалея
  '4600452000676': { title: 'Кофе Jacobs Monarch', amount: '1', unit: 'уп', category: 'grocery' },
  '4605246002936': { title: 'Макароны Makfa', amount: '1', unit: 'уп', category: 'grocery' },
  '4600392152015': { title: 'Гречка', amount: '1', unit: 'уп', category: 'grocery' },
  
  // Снеки и сладости
  '4600010111116': { title: 'Шоколад Алёнка', amount: '1', unit: 'шт', category: 'grocery' },
  '7622210738670': { title: 'Печенье Oreo', amount: '1', unit: 'уп', category: 'bakery' },
  '4000539127607': { title: 'Ritter Sport', amount: '1', unit: 'шт', category: 'grocery' },
  
  // Бытовая химия
  '4600702083548': { title: 'Fairy', amount: '1', unit: 'шт', category: 'household' },
  '4600702083982': { title: 'Domestos', amount: '1', unit: 'шт', category: 'household' },
  
  // Хлеб
  '4601683000632': { title: 'Хлеб нарезной', amount: '1', unit: 'шт', category: 'bakery' },
};

/**
 * Ищет товар по штрихкоду в локальной базе.
 * Работает офлайн.
 */
export const lookupBarcodeOffline = (code: string): ProductData | null => {
  if (BARCODE_DB[code]) {
    return BARCODE_DB[code];
  }
  return null;
};

/**
 * Пытается найти товар в Open Food Facts (онлайн).
 */
export const searchOnlineDatabase = async (code: string): Promise<ProductData | null> => {
  try {
    // Используем fetch с таймаутом, чтобы не зависать
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут

    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
        return null;
    }

    const data = await response.json();

    // Проверяем статус ответа API (1 = найден, 0 = не найден)
    if (data.status === 1 && data.product) {
      const p = data.product;
      
      // Определяем категорию
      let category = 'other';
      const cats = (p.categories_tags || []).join(' ').toLowerCase();
      const pn = (p.product_name_ru || p.product_name || '').toLowerCase();
      
      if (cats.includes('beverage') || cats.includes('water') || cats.includes('juice') || pn.includes('вода') || pn.includes('напиток')) category = 'drinks';
      else if (cats.includes('dairy') || cats.includes('milk') || cats.includes('cheese') || pn.includes('молоко') || pn.includes('сыр')) category = 'dairy';
      else if (cats.includes('meat') || cats.includes('fish') || cats.includes('seafood')) category = 'meat';
      else if (cats.includes('plant-based') || cats.includes('fruit') || cats.includes('vegetable')) category = 'produce';
      else if (cats.includes('bread') || cats.includes('biscuit') || cats.includes('cake')) category = 'bakery';
      else if (cats.includes('snack') || cats.includes('breakfast') || cats.includes('cereal') || cats.includes('chocolate')) category = 'grocery';
      else if (cats.includes('cleaning') || cats.includes('hygiene')) category = 'household';

      // Пытаемся распарсить количество
      let amount = '1';
      let unit: 'шт' | 'кг' | 'уп' | 'л' = 'шт';
      
      if (p.product_quantity) {
          amount = String(p.product_quantity);
      }
      
      // Простая эвристика единиц
      if (p.quantity) {
          const q = p.quantity.toLowerCase();
          if (q.includes('ml') || q.includes('l') || q.includes('л')) unit = 'л';
          else if (q.includes('kg') || q.includes('g') || q.includes('кг') || q.includes('г')) unit = 'кг';
      }

      // Нормализация количества (если там 1000г -> 1кг)
      if (unit === 'кг' && Number(amount) > 50) {
          amount = (Number(amount) / 1000).toString();
      }
      if (unit === 'л' && Number(amount) > 50) {
          amount = (Number(amount) / 1000).toString();
      }

      return {
        title: p.product_name_ru || p.product_name || 'Товар',
        amount: amount || '1',
        unit,
        category
      };
    }
  } catch (e) {
    console.warn("OpenFoodFacts lookup skipped/failed:", e);
  }
  return null;
};
