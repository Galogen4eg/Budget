
import { ShoppingItem } from '../types';

export interface ProductData {
  title: string;
  amount: string;
  unit: 'шт' | 'кг' | 'уп' | 'л';
  category: string;
}

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
