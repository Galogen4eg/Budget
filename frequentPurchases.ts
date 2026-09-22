/**
 * Family Frequent Purchases Engine
 * 
 * Tracks and calculates frequent shopping items based on:
 * 1. Number of times an item was checked as completed ('completed')
 * 2. Number of times an item was added via text/voice/quick add ('added')
 * 3. Number of times an item was restored from completed back to active list ('restored')
 */

export interface FrequentItemStat {
  title: string;
  normalizedTitle: string;
  category: string;
  amount: string;
  unit: 'шт' | 'кг' | 'уп' | 'л' | 'г';
  price: number;
  completedCount: number;
  addedCount: number;
  restoredCount: number;
  lastUsedAt: number;
}

const STORAGE_KEY = 'family_frequent_purchases_stats_v1';

/** Base staples to populate initial empty state gracefully */
const INITIAL_STAPLES: FrequentItemStat[] = [
  { title: 'Яйца СО (1 дес.)', normalizedTitle: 'яйца со', category: 'dairy', amount: '1', unit: 'уп', price: 129, completedCount: 5, addedCount: 3, restoredCount: 2, lastUsedAt: Date.now() - 86400000 },
  { title: 'Масло сливочное 82.5%', normalizedTitle: 'масло сливочное', category: 'dairy', amount: '1', unit: 'уп', price: 189, completedCount: 4, addedCount: 2, restoredCount: 1, lastUsedAt: Date.now() - 172800000 },
  { title: 'Молоко 3.2%', normalizedTitle: 'молоко', category: 'dairy', amount: '1', unit: 'л', price: 95, completedCount: 6, addedCount: 4, restoredCount: 3, lastUsedAt: Date.now() - 43200000 },
  { title: 'Хлеб цельнозерновой', normalizedTitle: 'хлеб цельнозерновой', category: 'bakery', amount: '1', unit: 'шт', price: 68, completedCount: 5, addedCount: 3, restoredCount: 2, lastUsedAt: Date.now() - 3600000 },
  { title: 'Бананы', normalizedTitle: 'бананы', category: 'produce', amount: '1', unit: 'кг', price: 140, completedCount: 4, addedCount: 2, restoredCount: 1, lastUsedAt: Date.now() - 259200000 },
  { title: 'Вода негаз. 5л', normalizedTitle: 'вода', category: 'drinks', amount: '1', unit: 'шт', price: 99, completedCount: 3, addedCount: 2, restoredCount: 1, lastUsedAt: Date.now() - 345600000 },
  { title: 'Сыр твёрдый', normalizedTitle: 'сыр', category: 'dairy', amount: '300', unit: 'г', price: 240, completedCount: 4, addedCount: 2, restoredCount: 2, lastUsedAt: Date.now() - 86400000 },
  { title: 'Кофе в зёрнах', normalizedTitle: 'кофе', category: 'drinks', amount: '1', unit: 'уп', price: 1150, completedCount: 2, addedCount: 1, restoredCount: 1, lastUsedAt: Date.now() - 518400000 }
];

export function loadFrequentStats(): Record<string, FrequentItemStat> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initialMap: Record<string, FrequentItemStat> = {};
      INITIAL_STAPLES.forEach(item => {
        initialMap[item.normalizedTitle] = item;
      });
      return initialMap;
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveFrequentStats(stats: Record<string, FrequentItemStat>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (err) {
    console.warn('Failed to save frequent purchases stats:', err);
  }
}

/**
 * Record a purchase lifecycle event for an item title
 */
export function recordPurchaseEvent(
  title: string,
  event: 'completed' | 'added' | 'restored',
  options?: { category?: string; amount?: string; unit?: string; price?: number }
): void {
  if (!title || !title.trim()) return;
  const cleanTitle = title.trim();
  const normalized = cleanTitle.toLowerCase();

  const stats = loadFrequentStats();
  const existing = stats[normalized] || {
    title: cleanTitle,
    normalizedTitle: normalized,
    category: options?.category || 'other',
    amount: options?.amount || '1',
    unit: (options?.unit as any) || 'шт',
    price: options?.price || 100,
    completedCount: 0,
    addedCount: 0,
    restoredCount: 0,
    lastUsedAt: Date.now()
  };

  if (event === 'completed') {
    existing.completedCount += 1;
  } else if (event === 'added') {
    existing.addedCount += 1;
  } else if (event === 'restored') {
    existing.restoredCount += 1;
  }

  existing.lastUsedAt = Date.now();
  if (options?.category) existing.category = options.category;
  if (options?.unit) existing.unit = options.unit as any;
  if (options?.amount) existing.amount = options.amount;
  if (options?.price) existing.price = options.price;

  stats[normalized] = existing;
  saveFrequentStats(stats);
}

/**
 * Get sorted list of frequent items for family shopping list quick-add
 */
export function getTopFrequentPurchases(limit = 8): (FrequentItemStat & { totalScore: number; frequencyLabel: string })[] {
  const stats = loadFrequentStats();
  const list = Object.values(stats);

  const scored = list.map(item => {
    // Score weights:
    // completed * 3 (actual purchase confirmed)
    // restored * 2.5 (item is needed regularly)
    // added * 1.5 (intent to buy)
    const score = (item.completedCount * 3) + (item.restoredCount * 2.5) + (item.addedCount * 1.5);
    const totalActions = item.completedCount + item.addedCount + item.restoredCount;
    
    let frequencyLabel = `${totalActions} раз`;
    if (totalActions === 1) frequencyLabel = '1 раз';
    else if (totalActions >= 2 && totalActions <= 4) frequencyLabel = `${totalActions} раза`;

    return {
      ...item,
      totalScore: score,
      frequencyLabel
    };
  });

  return scored
    .filter(i => i.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);
}
